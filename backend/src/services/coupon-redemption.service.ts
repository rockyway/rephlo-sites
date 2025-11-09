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
import { PrismaClient, Coupon, CouponRedemption, Prisma } from '@prisma/client';
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

        // Step 2: Record redemption in immutable ledger
        const redemption = await tx.couponRedemption.create({
          data: {
            couponId: couponId,
            userId: userId,
            subscriptionId: context.subscriptionId || null,
            redemptionDate: new Date(),
            discountAppliedUsd: new Prisma.Decimal(discount.discountAmount),
            originalAmountUsd: new Prisma.Decimal(context.originalAmount),
            finalAmountUsd: new Prisma.Decimal(discount.finalAmount),
            redemptionStatus: 'success',
            ipAddress: context.ipAddress || null,
            userAgent: context.userAgent || null,
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
        } else if (discount.couponType === 'byok_migration') {
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

    return await this.prisma.couponRedemption.create({
      data: {
        couponId: coupon.id,
        userId: userId,
        subscriptionId: null, // Can be updated later
        redemptionDate: new Date(),
        discountAppliedUsd: new Prisma.Decimal(discount.discountAmount),
        originalAmountUsd: new Prisma.Decimal(discount.originalAmount),
        finalAmountUsd: new Prisma.Decimal(discount.finalAmount),
        redemptionStatus: 'success',
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
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
    let usageLimits = await prismaClient.couponUsageLimit.findUnique({
      where: { couponId },
    });

    if (!usageLimits) {
      usageLimits = await prismaClient.couponUsageLimit.create({
        data: {
          couponId,
          totalUses: 0,
          uniqueUsers: 0,
          totalDiscountAppliedUsd: 0,
        },
      });
    }

    // Check if this is a new user
    const existingRedemptions = await prismaClient.couponRedemption.count({
      where: { couponId, userId, redemptionStatus: 'success' },
    });

    const isNewUser = existingRedemptions === 0;

    // Update counters
    await prismaClient.couponUsageLimit.update({
      where: { couponId },
      data: {
        totalUses: { increment: 1 },
        uniqueUsers: isNewUser ? { increment: 1 } : undefined,
        totalDiscountAppliedUsd: {
          increment: new Prisma.Decimal(discountAmount),
        },
        lastUsedAt: new Date(),
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

    await prismaClient.couponCampaign.update({
      where: { id: campaignId },
      data: {
        totalSpentUsd: {
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
      const redemption = await tx.couponRedemption.findUnique({
        where: { id: redemptionId },
      });

      if (!redemption) {
        throw new Error('Redemption not found');
      }

      if (redemption.redemptionStatus === 'reversed') {
        throw new Error('Redemption already reversed');
      }

      // Update redemption status
      const updatedRedemption = await tx.couponRedemption.update({
        where: { id: redemptionId },
        data: {
          redemptionStatus: 'reversed',
          failureReason: reason,
        },
      });

      // Decrement usage counters
      await tx.couponUsageLimit.update({
        where: { couponId: redemption.couponId },
        data: {
          totalUses: { decrement: 1 },
          totalDiscountAppliedUsd: {
            decrement: redemption.discountAppliedUsd,
          },
        },
      });

      // Revert campaign budget
      const coupon = await tx.coupon.findUnique({
        where: { id: redemption.couponId },
      });

      if (coupon?.campaignId) {
        await tx.couponCampaign.update({
          where: { id: coupon.campaignId },
          data: {
            totalSpentUsd: {
              decrement: redemption.discountAppliedUsd,
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
    await prismaClient.subscriptionMonetization.update({
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
    await prismaClient.billingInvoice.update({
      where: { id: invoiceId },
      data: {
        amountDue: {
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
    await prismaClient.creditAllocation.create({
      data: {
        userId: userId,
        subscriptionId: null, // Not tied to subscription
        amount: amount,
        allocationPeriodStart: new Date(),
        allocationPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        source: 'coupon',
      },
    });
  }

  /**
   * Get user redemptions
   */
  async getUserRedemptions(userId: string): Promise<CouponRedemption[]> {
    return await this.prisma.couponRedemption.findMany({
      where: { userId },
      orderBy: { redemptionDate: 'desc' },
      include: {
        coupon: true,
      },
    });
  }

  /**
   * Get coupon redemptions
   */
  async getCouponRedemptions(couponId: string): Promise<CouponRedemption[]> {
    return await this.prisma.couponRedemption.findMany({
      where: { couponId },
      orderBy: { redemptionDate: 'desc' },
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
    const stats = await this.prisma.couponRedemption.groupBy({
      by: ['redemptionStatus'],
      where: { couponId },
      _count: true,
      _sum: { discountAppliedUsd: true },
    });

    const usageLimits = await this.prisma.couponUsageLimit.findUnique({
      where: { couponId },
    });

    const totalRedemptions = stats.reduce((sum, s) => sum + s._count, 0);
    const successfulRedemptions =
      stats.find((s) => s.redemptionStatus === 'success')?._count || 0;
    const totalDiscountUsd =
      stats
        .filter((s) => s.redemptionStatus === 'success')
        .reduce((sum, s) => sum + parseFloat(s._sum.discountAppliedUsd?.toString() || '0'), 0) || 0;
    const uniqueUsers = usageLimits?.uniqueUsers || 0;
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
