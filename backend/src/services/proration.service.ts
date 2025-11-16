/**
 * Proration Service (Plan 110)
 *
 * Handles mid-cycle subscription tier changes with prorated credit calculations.
 * Implements Stripe-compatible proration formulas for upgrades and downgrades.
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 * Reference: docs/reference/020-plan-110-integration-architecture.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, proration_event as ProrationEvent, subscription_monetization as SubscriptionMonetization } from '@prisma/client';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ProrationCalculation {
  fromTier: string;
  toTier: string;
  daysRemaining: number;
  daysInCycle: number;
  unusedCreditValueUsd: number;
  newTierProratedCostUsd: number;
  couponDiscountAmount: number;
  netChargeUsd: number;
}

export interface ProrationPreview {
  calculation: ProrationCalculation;
  chargeToday: number;
  nextBillingAmount: number;
  nextBillingDate: Date;
  message: string;
}

// =============================================================================
// Proration Service Class
// =============================================================================

@injectable()
export class ProrationService {
  // Tier pricing (monthly rates in USD)
  private readonly TIER_PRICING: Record<string, number> = {
    free: 0,
    pro: 19.0,
    pro_max: 49.0,
    enterprise_pro: 149.0,
    enterprise_max: 499.0,
    perpetual: 0, // One-time payment, not monthly
  };

  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('ProrationService: Initialized');
  }

  /**
   * Get tier price based on billing cycle
   * @param tier - Subscription tier
   * @param billingCycle - Billing cycle (monthly, annual, or lifetime)
   * @returns Price in USD for the billing cycle
   */
  private getTierPrice(tier: string, billingCycle: string): number {
    const monthlyPrice = this.TIER_PRICING[tier] || 0;

    // Handle annual billing cycle
    if (billingCycle === 'annual') {
      // Annual price is monthly price × 12
      return monthlyPrice * 12;
    }

    // For monthly, lifetime, or any other value, return monthly price
    // Note: lifetime (perpetual) plans have a $0 monthly equivalent
    return monthlyPrice;
  }

  // ===========================================================================
  // Proration Calculations
  // ===========================================================================

  /**
   * Calculate proration for a tier change
   * @param subscriptionId - Subscription ID
   * @param newTier - Target tier
   * @param options - Optional coupon and pricing parameters
   * @returns Proration calculation result
   */
  async calculateProration(
    subscriptionId: string,
    newTier: string,
    options?: {
      newTierCoupon?: {
        code: string;
        discountType: 'percentage' | 'fixed_amount';
        discountValue: number;
      };
      currentTierEffectivePrice?: number;
    }
  ): Promise<ProrationCalculation> {
    logger.debug('ProrationService: Calculating proration', { subscriptionId, newTier });

    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    // Calculate days
    const totalDays = this.daysBetween(periodStart, periodEnd);
    const daysRemaining = Math.max(0, this.daysBetween(now, periodEnd));

    // Get tier prices based on billing cycle
    // For old tier: use effective price if provided (for active discounts), otherwise calculate based on billing cycle
    const oldTierPrice =
      options?.currentTierEffectivePrice ||
      this.getTierPrice(subscription.tier, subscription.billingCycle);

    // For new tier: calculate based on current subscription's billing cycle
    // Assumption: tier upgrades/downgrades maintain the same billing cycle
    const newTierPrice = this.getTierPrice(newTier, subscription.billingCycle);

    logger.debug('ProrationService: Billing cycle pricing', {
      billingCycle: subscription.billingCycle,
      oldTier: subscription.tier,
      oldTierPrice,
      newTier,
      newTierPrice,
      currentTierEffectivePrice: options?.currentTierEffectivePrice,
    });

    // Calculate unused credit from current tier
    const unusedCreditValueUsd = (daysRemaining / totalDays) * oldTierPrice;

    // Calculate prorated cost for new tier
    const newTierProratedCostUsd = (daysRemaining / totalDays) * newTierPrice;

    // Apply coupon discount if provided
    let couponDiscountAmount = 0;
    if (options?.newTierCoupon) {
      if (options.newTierCoupon.discountType === 'percentage') {
        // Percentage discount on prorated amount
        couponDiscountAmount = newTierProratedCostUsd * (options.newTierCoupon.discountValue / 100);
      } else {
        // Fixed amount discount, capped at prorated amount
        couponDiscountAmount = Math.min(
          options.newTierCoupon.discountValue,
          newTierProratedCostUsd
        );
      }
    }

    // Net charge (positive = charge user, negative = credit user)
    // Formula: new_tier_cost - unused_credit - coupon_discount
    const netChargeUsd = Math.max(0, newTierProratedCostUsd - unusedCreditValueUsd - couponDiscountAmount);

    const result: ProrationCalculation = {
      fromTier: subscription.tier,
      toTier: newTier,
      daysRemaining,
      daysInCycle: totalDays,
      unusedCreditValueUsd: this.roundToTwoDecimals(unusedCreditValueUsd),
      newTierProratedCostUsd: this.roundToTwoDecimals(newTierProratedCostUsd),
      couponDiscountAmount: this.roundToTwoDecimals(couponDiscountAmount),
      netChargeUsd: this.roundToTwoDecimals(netChargeUsd),
    };

    logger.info('ProrationService: Proration calculated', result);

    return result;
  }

  /**
   * Preview a tier change with proration
   * @param subscriptionId - Subscription ID
   * @param newTier - Target tier
   * @returns Proration preview with user-friendly message
   */
  async previewTierChange(subscriptionId: string, newTier: string): Promise<ProrationPreview> {
    const calculation = await this.calculateProration(subscriptionId, newTier);
    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const chargeToday = Math.max(0, calculation.netChargeUsd);
    const creditAmount = Math.abs(Math.min(0, calculation.netChargeUsd));
    const newTierPrice = this.TIER_PRICING[newTier] || 0;

    let message = '';
    if (calculation.netChargeUsd > 0) {
      // User will be charged
      message = `You will be charged $${chargeToday.toFixed(
        2
      )} today for the upgrade. Your next billing on ${subscription.currentPeriodEnd.toISOString().split('T')[0]} will be $${newTierPrice.toFixed(2)}.`;
    } else if (calculation.netChargeUsd < 0) {
      // User will receive credit
      message = `You will receive a $${creditAmount.toFixed(
        2
      )} credit. Your next billing on ${subscription.currentPeriodEnd.toISOString().split('T')[0]} will be $${Math.max(0, newTierPrice - creditAmount).toFixed(2)}.`;
    } else {
      // No charge/credit (edge case)
      message = `No charge today. Your next billing on ${subscription.currentPeriodEnd.toISOString().split('T')[0]} will be $${newTierPrice.toFixed(2)}.`;
    }

    return {
      calculation,
      chargeToday,
      nextBillingAmount: newTierPrice,
      nextBillingDate: subscription.currentPeriodEnd,
      message,
    };
  }

  // ===========================================================================
  // Tier Changes
  // ===========================================================================

  /**
   * Apply a tier upgrade with proration
   * @param subscriptionId - Subscription ID
   * @param newTier - Target tier (higher)
   * @returns Proration event record
   */
  async applyTierUpgrade(subscriptionId: string, newTier: string): Promise<ProrationEvent> {
    logger.info('ProrationService: Applying tier upgrade', { subscriptionId, newTier });

    return this.applyTierChange(subscriptionId, newTier, 'upgrade');
  }

  /**
   * Apply a tier downgrade with proration
   * @param subscriptionId - Subscription ID
   * @param newTier - Target tier (lower)
   * @returns Proration event record
   */
  async applyTierDowngrade(subscriptionId: string, newTier: string): Promise<ProrationEvent> {
    logger.info('ProrationService: Applying tier downgrade', { subscriptionId, newTier });

    return this.applyTierChange(subscriptionId, newTier, 'downgrade');
  }

  /**
   * Apply a tier change (upgrade or downgrade)
   * @param subscriptionId - Subscription ID
   * @param newTier - Target tier
   * @param changeType - Type of change (upgrade/downgrade)
   * @returns Proration event record
   */
  async applyTierChange(
    subscriptionId: string,
    newTier: string,
    changeType: 'upgrade' | 'downgrade'
  ): Promise<ProrationEvent> {
    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    // Calculate proration
    const calculation = await this.calculateProration(subscriptionId, newTier);

    // Create proration event
    const prorationEvent = await this.prisma.proration_events.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        fromTier: calculation.fromTier,
        toTier: calculation.toTier,
        changeType,
        daysRemaining: calculation.daysRemaining,
        daysInCycle: calculation.daysInCycle,
        unusedCreditValueUsd: calculation.unusedCreditValueUsd,
        newTierProratedCostUsd: calculation.newTierProratedCostUsd,
        netChargeUsd: calculation.netChargeUsd,
        effectiveDate: new Date(),
        status: 'pending',
      },
    });

    // Update subscription tier
    await this.prisma.subscription_monetization.update({
      where: { id: subscriptionId },
      data: {
        tier: newTier as any, // Cast to enum type
        basePriceUsd: this.TIER_PRICING[newTier] || 0,
      },
    });

    logger.info('ProrationService: Tier change applied', {
      prorationEventId: prorationEvent.id,
      fromTier: calculation.fromTier,
      toTier: calculation.toTier,
      netChargeUsd: calculation.netChargeUsd,
    });

    return prorationEvent;
  }

  // ===========================================================================
  // Proration Formulas
  // ===========================================================================

  /**
   * Calculate unused credit from current subscription
   * @param subscription - Current subscription
   * @returns Unused credit amount in USD
   */
  async calculateUnusedCredit(subscription: SubscriptionMonetization): Promise<number> {
    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    const totalDays = this.daysBetween(periodStart, periodEnd);
    const daysRemaining = this.daysBetween(now, periodEnd);

    const tierPrice = this.TIER_PRICING[subscription.tier] || 0;
    const unusedCredit = (daysRemaining / totalDays) * tierPrice;

    return this.roundToTwoDecimals(unusedCredit);
  }

  /**
   * Calculate prorated cost for new tier
   * @param newTier - Target tier
   * @param daysRemaining - Days remaining in billing cycle
   * @param daysInCycle - Total days in billing cycle
   * @returns Prorated cost in USD
   */
  async calculateNewTierProration(
    newTier: string,
    daysRemaining: number,
    daysInCycle: number
  ): Promise<number> {
    const tierPrice = this.TIER_PRICING[newTier] || 0;
    const proratedCost = (daysRemaining / daysInCycle) * tierPrice;

    return this.roundToTwoDecimals(proratedCost);
  }

  /**
   * Calculate net charge (charge or credit)
   * @param unusedCredit - Unused credit from old tier
   * @param newTierCost - Prorated cost for new tier
   * @returns Net charge (positive = charge, negative = credit)
   */
  async calculateNetCharge(unusedCredit: number, newTierCost: number): Promise<number> {
    const netCharge = newTierCost - unusedCredit;
    return this.roundToTwoDecimals(netCharge);
  }

  // ===========================================================================
  // Credit Adjustments
  // ===========================================================================

  /**
   * Grant proration credit to user (for downgrades)
   * @param userId - User ID
   * @param amount - Credit amount in USD
   * @param prorationEventId - Associated proration event ID
   */
  async grantProrationCredit(
    userId: string,
    amount: number,
    prorationEventId: string
  ): Promise<void> {
    logger.info('ProrationService: Granting proration credit', {
      userId,
      amount,
      prorationEventId,
    });

    // In a real implementation, this would update user's credit balance or Stripe customer balance
    // For now, we'll just log it

    // Update proration event status
    await this.prisma.proration_events.update({
      where: { id: prorationEventId },
      data: { status: 'applied' },
    });
  }

  /**
   * Refund proration overcharge (for errors or adjustments)
   * @param userId - User ID
   * @param amount - Refund amount in USD
   * @param reason - Reason for refund
   */
  async refundProrationOvercharge(userId: string, amount: number, reason: string): Promise<void> {
    logger.warn('ProrationService: Refunding proration overcharge', { userId, amount, reason });

    // In a real implementation, this would process a Stripe refund
    // For now, we'll just log it
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /**
   * Get proration history for a user
   * @param userId - User ID
   * @returns List of proration events
   */
  async getProrationHistory(userId: string): Promise<ProrationEvent[]> {
    return this.prisma.proration_events.findMany({
      where: { userId },
      include: {
        subscription: {
          select: {
            tier: true,
            status: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * Get pending proration events (for admin review)
   * @returns List of pending prorations
   */
  async getPendingProrations(): Promise<ProrationEvent[]> {
    return this.prisma.proration_events.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        subscription: {
          select: {
            tier: true,
            status: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * Get all proration events with filters (admin only)
   * @param filters - Filter criteria
   * @returns Paginated list of proration events
   */
  async getAllProrations(filters: {
    changeType?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProrationEvent[]; total: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filters.changeType) {
      where.changeType = filters.changeType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      // Search in user email or stripe invoice ID
      where.OR = [
        {
          user: {
            email: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          stripeInvoiceId: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count and data
    const [total, data] = await Promise.all([
      this.prisma.proration_events.count({ where }),
      this.prisma.proration_events.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          subscription: {
            select: {
              tier: true,
              status: true,
              basePriceUsd: true,
            },
          },
        },
        orderBy: { effectiveDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { data, total, totalPages };
  }

  /**
   * Get proration event by ID
   * @param eventId - Proration event ID
   * @returns Proration event
   */
  async getProrationEventById(eventId: string): Promise<ProrationEvent> {
    const event = await this.prisma.proration_events.findUnique({
      where: { id: eventId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        subscription: true,
      },
    });

    if (!event) {
      throw new NotFoundError('Proration event not found');
    }

    return event;
  }

  /**
   * Get proration statistics (admin only)
   * @returns Proration stats including total, net revenue, avg charge, and pending count
   */
  async getProrationStats(): Promise<{
    totalProrations: number;
    netRevenue: number;
    avgNetCharge: number;
    pendingProrations: number;
  }> {
    logger.info('ProrationService.getProrationStats');

    try {
      // Get aggregate stats
      const stats = await this.prisma.proration_events.aggregate({
        _count: true,
        _sum: {
          netChargeUsd: true,
        },
        _avg: {
          netChargeUsd: true,
        },
      });

      // Get pending prorations count
      const pendingCount = await this.prisma.proration_events.count({
        where: { status: 'pending' },
      });

      return {
        totalProrations: stats._count,
        netRevenue: Number(stats._sum.netChargeUsd || 0),
        avgNetCharge: Number(stats._avg.netChargeUsd || 0),
        pendingProrations: pendingCount,
      };
    } catch (error) {
      logger.error('ProrationService.getProrationStats: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Calculate days between two dates
   * @param start - Start date
   * @param end - End date
   * @returns Number of days
   */
  private daysBetween(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / msPerDay);
  }

  /**
   * Round to two decimal places
   * @param value - Value to round
   * @returns Rounded value
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ===========================================================================
  // Proration Reversal
  // ===========================================================================

  /**
   * Reverse a proration event
   * Creates a reverse proration event and restores subscription to original tier
   * @param prorationId - Proration event ID to reverse
   * @param reason - Reason for reversal
   * @param adminUserId - Admin user ID performing the reversal
   * @returns New reverse proration event
   */
  async reverseProration(
    prorationId: string,
    reason: string,
    adminUserId: string
  ): Promise<ProrationEvent> {
    // Get original proration event
    const originalEvent = await this.getProrationEventById(prorationId);

    // Check if already reversed
    if (originalEvent.status === 'reversed') {
      throw new Error('Proration event has already been reversed');
    }

    // Create reverse proration event (swap tiers, negate amounts)
    const reverseEvent = await this.prisma.proration_events.create({
      data: {
        userId: originalEvent.userId,
        subscriptionId: originalEvent.subscriptionId,
        fromTier: originalEvent.toTier, // Swap tiers
        toTier: originalEvent.fromTier,
        changeType: 'migration', // Use migration type for reversals
        daysRemaining: originalEvent.daysRemaining,
        daysInCycle: originalEvent.daysInCycle,
        unusedCreditValueUsd: -originalEvent.unusedCreditValueUsd, // Negate amounts
        newTierProratedCostUsd: -originalEvent.newTierProratedCostUsd,
        netChargeUsd: -originalEvent.netChargeUsd,
        effectiveDate: new Date(),
        status: 'applied',
        stripeInvoiceId: null, // No Stripe invoice for manual reversal
      },
    });

    // Mark original proration as reversed
    await this.prisma.proration_events.update({
      where: { id: prorationId },
      data: { status: 'reversed' },
    });

    // Restore subscription to original tier
    await this.prisma.subscription_monetization.update({
      where: { id: originalEvent.subscriptionId },
      data: {
        tier: originalEvent.fromTier as any,
        basePriceUsd: this.TIER_PRICING[originalEvent.fromTier || 'free'] || 0,
      },
    });

    logger.warn('ProrationService: Proration reversed', {
      originalProrationId: prorationId,
      reverseProrationId: reverseEvent.id,
      adminUserId,
      reason,
    });

    return reverseEvent;
  }

  /**
   * Get calculation breakdown for a proration event
   * @param prorationId - Proration event ID
   * @returns Detailed calculation breakdown
   */
  async getCalculationBreakdown(prorationId: string): Promise<{
    originalTier: string;
    originalPrice: number;
    newTier: string;
    newPrice: number;
    billingCycle: number;
    changeDate: string;
    daysRemaining: number;
    steps: {
      unusedCredit: { calculation: string; amount: number };
      newTierCost: { calculation: string; amount: number };
      netCharge: { calculation: string; amount: number };
    };
    stripeInvoiceUrl?: string;
    status: string;
  }> {
    const event = await this.getProrationEventById(prorationId);

    const originalPrice = this.TIER_PRICING[event.fromTier || 'free'] || 0;
    const newPrice = this.TIER_PRICING[event.toTier || 'free'] || 0;

    const unusedCreditAmount = Number(event.unusedCreditValueUsd);
    const newTierCostAmount = Number(event.newTierProratedCostUsd);
    const netChargeAmount = Number(event.netChargeUsd);

    return {
      originalTier: event.fromTier || 'unknown',
      originalPrice,
      newTier: event.toTier || 'unknown',
      newPrice,
      billingCycle: event.daysInCycle,
      changeDate: event.effectiveDate.toISOString(),
      daysRemaining: event.daysRemaining,
      steps: {
        unusedCredit: {
          calculation: `(${event.daysRemaining} / ${event.daysInCycle}) × $${originalPrice.toFixed(2)}`,
          amount: unusedCreditAmount,
        },
        newTierCost: {
          calculation: `(${event.daysRemaining} / ${event.daysInCycle}) × $${newPrice.toFixed(2)}`,
          amount: newTierCostAmount,
        },
        netCharge: {
          calculation: `$${newTierCostAmount.toFixed(2)} - $${unusedCreditAmount.toFixed(2)}`,
          amount: netChargeAmount,
        },
      },
      stripeInvoiceUrl: event.stripeInvoiceId
        ? `https://dashboard.stripe.com/invoices/${event.stripeInvoiceId}`
        : undefined,
      status: event.status,
    };
  }
}
