/**
 * Coupon Redemption Service
 *
 * Handles coupon redemption flow with atomic transactions.
 * Integrates with validation service, usage tracking, and subscription/invoice systems.
 *
 * Features:
 * - Atomic redemption transactions
 * - Usage counter updates
 * - Campaign budget tracking
 * - Redemption reversal/refunds
 * - Integration with Plans 109, 110, 112
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md (Section 5: Redemption Flow)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma, coupon_redemption as CouponRedemption, coupon as Coupon } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CouponValidationService } from './coupon-validation.service';
import {
  RedemptionContext,
  RedemptionMetadata,
  DiscountCalculation,
  CouponValidationError,
} from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class CouponRedemptionService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CouponValidationService) private validationService: CouponValidationService
  ) {
    logger.debug('CouponRedemptionService: Initialized');
  }

  /**
   * Redeem a coupon (atomic transaction)
   */
  async redeemCoupon(
    couponId: string,
    userId: string,
    context: RedemptionContext
  ): Promise<CouponRedemption> {
    logger.info('Starting coupon redemption', { couponId, userId, context });

    return await this.prisma.$transaction(
      async (tx) => {
        // Step 1: Validate coupon (12-step algorithm)
        const validation = await this.validationService.validateCoupon(context.code, userId, {
          cartTotal: context.originalAmount,
          subscriptionId: context.subscriptionId,
          subscriptionTier: 'free', // Will be fetched from user's actual tier
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          deviceFingerprint: context.deviceInfo?.fingerprint,
        });

        if (!validation.isValid) {
          throw new CouponValidationError('VALIDATION_ERROR', validation.errors);
        }

        const discount = validation.discount!;

        // Step 2: Record redemption in immutable ledger (GAP FIX #4)
        const redemption = await tx.coupon_redemption.create({
          data: {
            id: randomUUID(),
            coupon_id: couponId,
            user_id: userId,
            subscription_id: context.subscriptionId || null,
            redemption_date: new Date(),
            discount_applied_usd: new Prisma.Decimal(discount.discountAmount),
            original_amount_usd: new Prisma.Decimal(context.originalAmount),
            final_amount_usd: new Prisma.Decimal(discount.finalAmount),
            redemption_status: 'success',
            ip_address: context.ipAddress || null,
            user_agent: context.userAgent || null,
            // Proration fields
            is_proration_involved: context.isProrationInvolved || false,
            proration_amount: context.prorationAmount ? new Prisma.Decimal(context.prorationAmount) : null,
            user_tier_before: context.tierBefore || null,
            user_tier_after: context.tierAfter || null,
            billing_cycle_before: context.billingCycleBefore || null,
            billing_cycle_after: context.billingCycleAfter || null,
            updated_at: new Date(),
          },
        });

        // Step 3: Increment usage counters
        await this.incrementUsageCounters(couponId, userId, discount.discountAmount, tx);

        // Step 4: Update campaign budget
        if (validation.coupon && (validation.coupon as any).campaignId) {
          await this.updateCampaignBudget(
            (validation.coupon as any).campaignId,
            discount.discountAmount,
            tx
          );
        }

        // Step 5: Apply discount based on type
        if (context.subscriptionId) {
          await this.applyCouponToSubscription(
            context.subscriptionId,
            discount,
            tx
          );
        } else if (context.invoiceId) {
          await this.applyCouponToInvoice(context.invoiceId, discount, tx);
        }

        // Step 6: Grant bonus credits or extend subscription
        if (discount.discountType === 'credits') {
          await this.grantBonusCredits(userId, discount.creditAmount!, couponId, tx);
        } else if (discount.couponType === 'perpetual_migration') {
          // Grant perpetual license + 100% off first month
          await this.grantBonusCredits(userId, discount.creditAmount || 0, couponId, tx);
        }

        logger.info('Coupon redemption successful', {
          couponId,
          userId,
          redemptionId: redemption.id,
          discount,
        });

        return redemption;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  /**
   * Record a redemption (called internally or by admin)
   */
  async recordRedemption(
    coupon: Coupon,
    userId: string,
    discount: DiscountCalculation,
    metadata: RedemptionMetadata
  ): Promise<CouponRedemption> {
    logger.info('Recording coupon redemption', { couponId: coupon.id, userId });

    return await this.prisma.coupon_redemption.create({
      data: {
        id: randomUUID(),
        coupon_id: coupon.id,
        user_id: userId,
        subscription_id: null, // Can be updated later
        redemption_date: new Date(),
        discount_applied_usd: new Prisma.Decimal(discount.discountAmount),
        original_amount_usd: new Prisma.Decimal(discount.originalAmount),
        final_amount_usd: new Prisma.Decimal(discount.finalAmount),
        redemption_status: 'success',
        ip_address: metadata.ipAddress || null,
        user_agent: metadata.userAgent || null,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Increment usage counters for a coupon
   */
  async incrementUsageCounters(
    couponId: string,
    userId: string,
    discountAmount: number,
    tx?: any
  ): Promise<void> {
    logger.debug('Incrementing usage counters', { couponId, userId, discountAmount });

    const prismaClient = tx || this.prisma;

    // Get or create usage limits
    let usageLimits = await prismaClient.coupon_usage_limit.findUnique({
      where: { coupon_id: couponId },
    });

    if (!usageLimits) {
      usageLimits = await prismaClient.coupon_usage_limit.create({
        data: {
          coupon_id: couponId,
          total_uses: 0,
          unique_users: 0,
          total_discount_applied_usd: 0,
        },
      });
    }

    // Check if this is a new user
    const existingRedemptions = await prismaClient.coupon_redemption.count({
      where: { coupon_id: couponId, user_id: userId, redemption_status: 'success' },
    });

    const isNewUser = existingRedemptions === 0;

    // Update counters
    await prismaClient.coupon_usage_limit.update({
      where: { coupon_id: couponId },
      data: {
        total_uses: { increment: 1 },
        unique_users: isNewUser ? { increment: 1 } : undefined,
        total_discount_applied_usd: {
          increment: new Prisma.Decimal(discountAmount),
        },
        last_used_at: new Date(),
      },
    });
  }

  /**
   * Update campaign budget spent
   */
  async updateCampaignBudget(
    campaignId: string,
    discountApplied: number,
    tx?: any
  ): Promise<void> {
    logger.debug('Updating campaign budget', { campaignId, discountApplied });

    const prismaClient = tx || this.prisma;

    await prismaClient.coupon_campaign.update({
      where: { id: campaignId },
      data: {
        total_spent_usd: {
          increment: new Prisma.Decimal(discountApplied),
        },
      },
    });
  }

  /**
   * Reverse a redemption (refund/chargeback)
   */
  async reversalRedemption(redemptionId: string, reason: string): Promise<CouponRedemption> {
    logger.info('Reversing coupon redemption', { redemptionId, reason });

    return await this.prisma.$transaction(async (tx) => {
      // Get redemption
      const redemption = await tx.coupon_redemption.findUnique({
        where: { id: redemptionId },
      });

      if (!redemption) {
        throw new Error('Redemption not found');
      }

      if (redemption.redemption_status === 'reversed') {
        throw new Error('Redemption already reversed');
      }

      // Update redemption status
      const updatedRedemption = await tx.coupon_redemption.update({
        where: { id: redemptionId },
        data: {
          redemption_status: 'reversed',
          failure_reason: reason,
        },
      });

      // Decrement usage counters
      await tx.coupon_usage_limit.update({
        where: { coupon_id: redemption.coupon_id },
        data: {
          total_uses: { decrement: 1 },
          total_discount_applied_usd: {
            decrement: redemption.discount_applied_usd,
          },
        },
      });

      // Revert campaign budget
      const coupon = await tx.coupon.findUnique({
        where: { id: redemption.coupon_id },
      });

      if (coupon?.campaign_id) {
        await tx.coupon_campaign.update({
          where: { id: coupon.campaign_id },
          data: {
            total_spent_usd: {
              decrement: redemption.discount_applied_usd,
            },
          },
        });
      }

      logger.info('Redemption reversed successfully', { redemptionId });

      return updatedRedemption;
    });
  }

  /**
   * Refund discount (alias for reversal)
   */
  async refundDiscount(redemptionId: string): Promise<void> {
    await this.reversalRedemption(redemptionId, 'Refund requested');
  }

  /**
   * Apply coupon discount to subscription
   */
  async applyCouponToSubscription(
    subscriptionId: string,
    discount: DiscountCalculation,
    tx?: any
  ): Promise<void> {
    logger.debug('Applying coupon to subscription', { subscriptionId, discount });

    const prismaClient = tx || this.prisma;

    // Update subscription with discount metadata
    // Note: Actual Stripe discount application happens in CheckoutIntegrationService
    await prismaClient.subscription_monetization.update({
      where: { id: subscriptionId },
      data: {
        // Store coupon discount in subscription metadata if needed
        // This is a placeholder - actual implementation may vary
      },
    });
  }

  /**
   * Apply coupon discount to invoice
   */
  async applyCouponToInvoice(
    invoiceId: string,
    discount: DiscountCalculation,
    tx?: any
  ): Promise<void> {
    logger.debug('Applying coupon to invoice', { invoiceId, discount });

    const prismaClient = tx || this.prisma;

    // Update invoice with discount
    await prismaClient.billing_invoice.update({
      where: { id: invoiceId },
      data: {
        amount_due: {
          decrement: new Prisma.Decimal(discount.discountAmount),
        },
      },
    });
  }

  /**
   * Grant bonus credits to user (integration with Plan 112)
   */
  async grantBonusCredits(
    userId: string,
    amount: number,
    couponId: string,
    tx?: any
  ): Promise<void> {
    logger.info('Granting bonus credits', { userId, amount, couponId });

    const prismaClient = tx || this.prisma;

    // Create credit allocation
    await prismaClient.credit_allocation.create({
      data: {
        user_id: userId,
        subscription_id: null, // Not tied to subscription
        amount: amount,
        allocation_period_start: new Date(),
        allocation_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        source: 'coupon',
      },
    });
  }

  /**
   * Get user redemptions
   */
  async getUserRedemptions(userId: string): Promise<CouponRedemption[]> {
    return await this.prisma.coupon_redemption.findMany({
      where: { user_id: userId },
      orderBy: { redemption_date: 'desc' },
      include: {
        coupon: true,
      },
    });
  }

  /**
   * Get coupon redemptions
   */
  async getCouponRedemptions(couponId: string): Promise<CouponRedemption[]> {
    return await this.prisma.coupon_redemption.findMany({
      where: { coupon_id: couponId },
      orderBy: { redemption_date: 'desc' },
    });
  }

  /**
   * Get redemption stats for a coupon
   */
  async getRedemptionStats(couponId: string): Promise<{
    totalRedemptions: number;
    successfulRedemptions: number;
    totalDiscountUsd: number;
    uniqueUsers: number;
    averageDiscountUsd: number;
  }> {
    const stats = await this.prisma.coupon_redemption.groupBy({
      by: ['redemption_status'],
      where: { coupon_id: couponId },
      _count: true,
      _sum: { discount_applied_usd: true },
    });

    const usageLimits = await this.prisma.coupon_usage_limit.findUnique({
      where: { coupon_id: couponId },
    });

    const totalRedemptions = stats.reduce((sum, s) => sum + s._count, 0);
    const successfulRedemptions =
      stats.find((s) => s.redemption_status === 'success')?._count || 0;
    const totalDiscountUsd =
      stats
        .filter((s) => s.redemption_status === 'success')
        .reduce((sum, s) => sum + parseFloat(s._sum.discount_applied_usd?.toString() || '0'), 0) || 0;
    const uniqueUsers = usageLimits?.unique_users || 0;
    const averageDiscountUsd = successfulRedemptions > 0 ? totalDiscountUsd / successfulRedemptions : 0;

    return {
      totalRedemptions,
      successfulRedemptions,
      totalDiscountUsd,
      uniqueUsers,
      averageDiscountUsd,
    };
  }
}
