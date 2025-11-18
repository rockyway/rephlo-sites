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
import crypto from 'crypto';
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
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;

    // Calculate days
    const totalDays = this.daysBetween(periodStart, periodEnd);
    const daysRemaining = Math.max(0, this.daysBetween(now, periodEnd));

    // Get tier prices based on billing cycle
    // For old tier: use effective price if provided (for active discounts), otherwise calculate based on billing cycle
    const oldTierPrice =
      options?.currentTierEffectivePrice ||
      this.getTierPrice(subscription.tier, subscription.billing_cycle);

    // For new tier: calculate based on current subscription's billing cycle
    // Assumption: tier upgrades/downgrades maintain the same billing cycle
    const newTierPrice = this.getTierPrice(newTier, subscription.billing_cycle);

    logger.debug('ProrationService: Billing cycle pricing', {
      billingCycle: subscription.billing_cycle,
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
      )} today for the upgrade. Your next billing on ${subscription.current_period_end.toISOString().split('T')[0]} will be $${newTierPrice.toFixed(2)}.`;
    } else if (calculation.netChargeUsd < 0) {
      // User will receive credit
      message = `You will receive a $${creditAmount.toFixed(
        2
      )} credit. Your next billing on ${subscription.current_period_end.toISOString().split('T')[0]} will be $${Math.max(0, newTierPrice - creditAmount).toFixed(2)}.`;
    } else {
      // No charge/credit (edge case)
      message = `No charge today. Your next billing on ${subscription.current_period_end.toISOString().split('T')[0]} will be $${newTierPrice.toFixed(2)}.`;
    }

    return {
      calculation,
      chargeToday,
      nextBillingAmount: newTierPrice,
      nextBillingDate: subscription.current_period_end,
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
    const prorationEvent = await this.prisma.proration_event.create({
      data: {
        id: crypto.randomUUID(),
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        from_tier: calculation.fromTier,
        to_tier: calculation.toTier,
        change_type: changeType,
        days_remaining: calculation.daysRemaining,
        days_in_cycle: calculation.daysInCycle,
        unused_credit_value_usd: calculation.unusedCreditValueUsd,
        new_tier_prorated_cost_usd: calculation.newTierProratedCostUsd,
        net_charge_usd: calculation.netChargeUsd,
        effective_date: new Date(),
        status: 'pending',
        updated_at: new Date(),
      },
    });

    // Update subscription tier
    await this.prisma.subscription_monetization.update({
      where: { id: subscriptionId },
      data: {
        tier: newTier as any, // Cast to enum type
        base_price_usd: this.TIER_PRICING[newTier] || 0,
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
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;

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
    await this.prisma.proration_event.update({
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
    return this.prisma.proration_event.findMany({
      where: { user_id: userId },
      include: {
        subscription_monetization: {
          select: {
            tier: true,
            status: true,
          },
        },
      },
      orderBy: { effective_date: 'desc' },
    });
  }

  /**
   * Get pending proration events (for admin review)
   * @returns List of pending prorations
   */
  async getPendingProrations(): Promise<ProrationEvent[]> {
    return this.prisma.proration_event.findMany({
      where: { status: 'pending' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
          },
        },
        subscription_monetization: {
          select: {
            tier: true,
            status: true,
          },
        },
      },
      orderBy: { effective_date: 'desc' },
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
      this.prisma.proration_event.count({ where }),
      this.prisma.proration_event.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          subscription_monetization: {
            select: {
              tier: true,
              status: true,
              base_price_usd: true,
            },
          },
        },
        orderBy: { effective_date: 'desc' },
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
    const event = await this.prisma.proration_event.findUnique({
      where: { id: eventId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
          },
        },
        subscription_monetization: true,
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
      const stats = await this.prisma.proration_event.aggregate({
        _count: true,
        _sum: {
          net_charge_usd: true,
        },
        _avg: {
          net_charge_usd: true,
        },
      });

      // Get pending prorations count
      const pendingCount = await this.prisma.proration_event.count({
        where: { status: 'pending' },
      });

      return {
        totalProrations: stats._count,
        netRevenue: Number(stats._sum.net_charge_usd || 0),
        avgNetCharge: Number(stats._avg.net_charge_usd || 0),
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
    const reverseEvent = await this.prisma.proration_event.create({
      data: {
        id: crypto.randomUUID(),
        user_id: originalEvent.user_id,
        subscription_id: originalEvent.subscription_id,
        from_tier: originalEvent.to_tier, // Swap tiers
        to_tier: originalEvent.from_tier,
        change_type: 'migration', // Use migration type for reversals
        days_remaining: originalEvent.days_remaining,
        days_in_cycle: originalEvent.days_in_cycle,
        unused_credit_value_usd: -originalEvent.unused_credit_value_usd, // Negate amounts
        new_tier_prorated_cost_usd: -originalEvent.new_tier_prorated_cost_usd,
        net_charge_usd: -originalEvent.net_charge_usd,
        effective_date: new Date(),
        status: 'applied',
        stripe_invoice_id: null, // No Stripe invoice for manual reversal
        updated_at: new Date(),
      },
    });

    // Mark original proration as reversed
    await this.prisma.proration_event.update({
      where: { id: prorationId },
      data: { status: 'reversed' },
    });

    // Restore subscription to original tier
    await this.prisma.subscription_monetization.update({
      where: { id: originalEvent.subscription_id },
      data: {
        tier: originalEvent.from_tier as any,
        base_price_usd: this.TIER_PRICING[originalEvent.from_tier || 'free'] || 0,
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

    const originalPrice = this.TIER_PRICING[event.from_tier || 'free'] || 0;
    const newPrice = this.TIER_PRICING[event.to_tier || 'free'] || 0;

    const unusedCreditAmount = Number(event.unused_credit_value_usd);
    const newTierCostAmount = Number(event.new_tier_prorated_cost_usd);
    const netChargeAmount = Number(event.net_charge_usd);

    return {
      originalTier: event.from_tier || 'unknown',
      originalPrice,
      newTier: event.to_tier || 'unknown',
      newPrice,
      billingCycle: event.days_in_cycle,
      changeDate: event.effective_date.toISOString(),
      daysRemaining: event.days_remaining,
      steps: {
        unusedCredit: {
          calculation: `(${event.days_remaining} / ${event.days_in_cycle}) × $${originalPrice.toFixed(2)}`,
          amount: unusedCreditAmount,
        },
        newTierCost: {
          calculation: `(${event.days_remaining} / ${event.days_in_cycle}) × $${newPrice.toFixed(2)}`,
          amount: newTierCostAmount,
        },
        netCharge: {
          calculation: `$${newTierCostAmount.toFixed(2)} - $${unusedCreditAmount.toFixed(2)}`,
          amount: netChargeAmount,
        },
      },
      stripeInvoiceUrl: event.stripe_invoice_id
        ? `https://dashboard.stripe.com/invoices/${event.stripe_invoice_id}`
        : undefined,
      status: event.status,
    };
  }

  // ===========================================================================
  // Plan 192: Stripe Invoice Generation
  // ===========================================================================

  /**
   * Create Stripe invoice for proration charge
   * Called after tier upgrade/downgrade to generate invoice
   * @param prorationEventId - Proration event ID
   * @returns Created Stripe invoice
   */
  async createProrationInvoice(prorationEventId: string): Promise<any> {
    logger.info('ProrationService.createProrationInvoice', { prorationEventId });

    try {
      // 1. Get proration event
      const prorationEvent = await this.getProrationEventById(prorationEventId);

      if (!prorationEvent) {
        throw new NotFoundError('Proration event not found');
      }

      // Check if invoice already exists
      if (prorationEvent.stripe_invoice_id) {
        logger.warn('Proration invoice already created', {
          prorationEventId,
          stripeInvoiceId: prorationEvent.stripe_invoice_id,
        });
        throw new Error('Proration invoice already exists');
      }

      // Only create invoices for charges (net_charge_usd > 0)
      const netChargeUsd = Number(prorationEvent.net_charge_usd);
      if (netChargeUsd <= 0) {
        logger.info('No invoice needed for proration (no charge)', {
          prorationEventId,
          netChargeUsd,
        });
        return null;
      }

      // 2. Get subscription with user details
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: prorationEvent.subscription_id },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      if (!subscription.stripe_customer_id) {
        throw new Error('No Stripe customer ID found for subscription');
      }

      // 3. Create Stripe invoice item
      const { createInvoiceItem, createAndFinalizeInvoice } = await import('./stripe.service');

      const description = `Proration charge: ${prorationEvent.from_tier} → ${prorationEvent.to_tier} (${prorationEvent.days_remaining} days remaining)`;

      await createInvoiceItem(
        subscription.stripe_customer_id,
        netChargeUsd,
        description,
        {
          proration_event_id: prorationEventId,
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          from_tier: prorationEvent.from_tier || '',
          to_tier: prorationEvent.to_tier || '',
        }
      );

      // 4. Create and finalize invoice
      const invoice = await createAndFinalizeInvoice(subscription.stripe_customer_id);

      // 5. Update proration_event with stripe_invoice_id and invoice_created_at
      await this.prisma.proration_event.update({
        where: { id: prorationEventId },
        data: {
          stripe_invoice_id: invoice.id,
          invoice_created_at: new Date(),
          status: 'pending', // Invoice created, waiting for payment
          updated_at: new Date(),
        },
      });

      logger.info('ProrationService: Invoice created for proration', {
        prorationEventId,
        stripeInvoiceId: invoice.id,
        amount: netChargeUsd,
        status: invoice.status,
      });

      return invoice;
    } catch (error) {
      logger.error('ProrationService.createProrationInvoice: Error', {
        prorationEventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Mark proration as paid (called from webhook)
   * @param prorationEventId - Proration event ID
   * @param stripeInvoiceId - Stripe invoice ID
   */
  async markProrationPaid(prorationEventId: string, stripeInvoiceId: string): Promise<void> {
    logger.info('ProrationService.markProrationPaid', {
      prorationEventId,
      stripeInvoiceId,
    });

    try {
      // Update proration_event: status='applied', invoice_paid_at=now()
      await this.prisma.proration_event.update({
        where: { id: prorationEventId },
        data: {
          status: 'applied', // Payment received, proration applied
          invoice_paid_at: new Date(),
          updated_at: new Date(),
        },
      });

      logger.info('ProrationService: Proration marked as applied', {
        prorationEventId,
        stripeInvoiceId,
      });
    } catch (error) {
      logger.error('ProrationService.markProrationPaid: Error', {
        prorationEventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
