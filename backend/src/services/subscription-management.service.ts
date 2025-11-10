/**
 * Subscription Management Service (Plan 109)
 *
 * Handles subscription lifecycle, tier management, and credit allocation.
 * Integrates with Stripe for payment processing and Plan 112 for credit tracking.
 *
 * Core Responsibilities:
 * - Subscription creation, upgrade, downgrade, cancellation
 * - Monthly credit allocation and rollover
 * - Feature access control based on tier
 * - Trial period management
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { notFoundError, badRequestError } from '../middleware/error.middleware';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface Subscription {
  id: string;
  userId: string;
  tier: string;
  billingCycle: 'monthly' | 'annual' | 'lifetime';
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  basePriceUsd: number;
  monthlyCreditAllocation: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditAllocation {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  allocationPeriodStart: Date;
  allocationPeriodEnd: Date;
  source: 'subscription' | 'bonus' | 'admin_grant' | 'referral' | 'coupon';
  createdAt: Date;
}

export interface TierLimits {
  tier: string;
  creditsPerMonth: number;
  maxRollover: number;
  features: Record<string, any>;
}

export interface CreateSubscriptionInput {
  userId: string;
  tier: string;
  billingCycle: 'monthly' | 'annual';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  startTrial?: boolean;
  trialDays?: number;
}

// =============================================================================
// Subscription Management Service
// =============================================================================

@injectable()
export class SubscriptionManagementService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('SubscriptionManagementService: Initialized');
  }

  // ===========================================================================
  // Subscription Lifecycle
  // ===========================================================================

  /**
   * Create a new subscription for a user
   * @param input - Subscription creation data
   * @returns Created subscription
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
    logger.info('SubscriptionManagementService.createSubscription', {
      userId: input.userId,
      tier: input.tier,
      billingCycle: input.billingCycle,
    });

    try {
      // Get tier configuration
      const tierConfig = await this.prisma.subscriptionTierConfig.findUnique({
        where: { tierName: input.tier },
      });

      if (!tierConfig || !tierConfig.isActive) {
        throw badRequestError(`Invalid or inactive subscription tier: ${input.tier}`);
      }

      // Calculate pricing based on billing cycle
      const basePriceUsd =
        input.billingCycle === 'annual'
          ? Number(tierConfig.annualPriceUsd)
          : Number(tierConfig.monthlyPriceUsd);

      // Calculate billing period
      const now = new Date();
      const currentPeriodStart = now;
      const currentPeriodEnd = new Date(now);

      if (input.billingCycle === 'annual') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      // Calculate trial end date if trial is enabled
      let trialEndsAt: Date | null = null;
      let initialStatus: 'trial' | 'active' = 'active';

      if (input.startTrial && input.tier !== 'free') {
        const trialDays = input.trialDays || this.getTrialDaysForTier(input.tier);
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        initialStatus = 'trial';
      }

      // Create subscription record
      const subscription = await this.prisma.subscriptionMonetization.create({
        data: {
          userId: input.userId,
          tier: input.tier,
          billingCycle: input.billingCycle,
          status: initialStatus,
          basePriceUsd,
          monthlyCreditAllocation: tierConfig.monthlyCreditAllocation,
          stripeCustomerId: input.stripeCustomerId || null,
          stripeSubscriptionId: input.stripeSubscriptionId || null,
          currentPeriodStart,
          currentPeriodEnd,
          trialEndsAt,
        },
      });

      // Allocate initial credits (except for trial users - they get credits when trial ends)
      if (initialStatus === 'active' && tierConfig.monthlyCreditAllocation > 0) {
        await this.allocateMonthlyCredits(input.userId, subscription.id);
      }

      logger.info('SubscriptionManagementService: Subscription created', {
        subscriptionId: subscription.id,
        tier: input.tier,
        status: initialStatus,
      });

      return this.mapSubscription(subscription);
    } catch (error) {
      logger.error('SubscriptionManagementService.createSubscription: Error', { error });
      throw error;
    }
  }

  /**
   * Upgrade subscription to a higher tier
   * @param subscriptionId - Subscription ID to upgrade
   * @param newTier - Target tier
   * @returns Updated subscription
   */
  async upgradeTier(subscriptionId: string, newTier: string): Promise<Subscription> {
    logger.info('SubscriptionManagementService.upgradeTier', {
      subscriptionId,
      newTier,
    });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      // Validate tier upgrade eligibility
      const currentTierLevel = this.getTierLevel(subscription.tier);
      const newTierLevel = this.getTierLevel(newTier);

      if (newTierLevel <= currentTierLevel) {
        throw badRequestError(
          `Cannot upgrade from ${subscription.tier} to ${newTier}. Use downgradeTier instead.`
        );
      }

      // Get new tier configuration
      const newTierConfig = await this.prisma.subscriptionTierConfig.findUnique({
        where: { tierName: newTier },
      });

      if (!newTierConfig || !newTierConfig.isActive) {
        throw badRequestError(`Invalid or inactive subscription tier: ${newTier}`);
      }

      // Calculate new pricing
      const basePriceUsd =
        subscription.billingCycle === 'annual'
          ? Number(newTierConfig.annualPriceUsd)
          : Number(newTierConfig.monthlyPriceUsd);

      // Update subscription
      const updatedSubscription = await this.prisma.subscriptionMonetization.update({
        where: { id: subscriptionId },
        data: {
          tier: newTier,
          basePriceUsd,
          monthlyCreditAllocation: newTierConfig.monthlyCreditAllocation,
          updatedAt: new Date(),
        },
      });

      // TODO: Implement proration logic (integration with Plan 110)
      // For now, upgrade takes effect immediately at renewal

      logger.info('SubscriptionManagementService: Tier upgraded', {
        subscriptionId,
        oldTier: subscription.tier,
        newTier,
      });

      return this.mapSubscription(updatedSubscription);
    } catch (error) {
      logger.error('SubscriptionManagementService.upgradeTier: Error', { error });
      throw error;
    }
  }

  /**
   * Downgrade subscription to a lower tier
   * @param subscriptionId - Subscription ID to downgrade
   * @param newTier - Target tier
   * @returns Updated subscription
   */
  async downgradeTier(subscriptionId: string, newTier: string): Promise<Subscription> {
    logger.info('SubscriptionManagementService.downgradeTier', {
      subscriptionId,
      newTier,
    });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      // Validate tier downgrade eligibility
      const currentTierLevel = this.getTierLevel(subscription.tier);
      const newTierLevel = this.getTierLevel(newTier);

      if (newTierLevel >= currentTierLevel) {
        throw badRequestError(
          `Cannot downgrade from ${subscription.tier} to ${newTier}. Use upgradeTier instead.`
        );
      }

      // Get new tier configuration
      const newTierConfig = await this.prisma.subscriptionTierConfig.findUnique({
        where: { tierName: newTier },
      });

      if (!newTierConfig || !newTierConfig.isActive) {
        throw badRequestError(`Invalid or inactive subscription tier: ${newTier}`);
      }

      // Calculate new pricing
      const basePriceUsd =
        subscription.billingCycle === 'annual'
          ? Number(newTierConfig.annualPriceUsd)
          : Number(newTierConfig.monthlyPriceUsd);

      // Update subscription (downgrade takes effect at period end)
      const updatedSubscription = await this.prisma.subscriptionMonetization.update({
        where: { id: subscriptionId },
        data: {
          tier: newTier,
          basePriceUsd,
          monthlyCreditAllocation: newTierConfig.monthlyCreditAllocation,
          updatedAt: new Date(),
        },
      });

      logger.info('SubscriptionManagementService: Tier downgraded', {
        subscriptionId,
        oldTier: subscription.tier,
        newTier,
      });

      return this.mapSubscription(updatedSubscription);
    } catch (error) {
      logger.error('SubscriptionManagementService.downgradeTier: Error', { error });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - Subscription ID to cancel
   * @param cancelAtPeriodEnd - If true, subscription remains active until period end
   * @returns Updated subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    logger.info('SubscriptionManagementService.cancelSubscription', {
      subscriptionId,
      cancelAtPeriodEnd,
    });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      if (subscription.status === 'cancelled') {
        throw badRequestError('Subscription is already cancelled');
      }

      const now = new Date();
      const newStatus = cancelAtPeriodEnd ? subscription.status : 'cancelled';

      const updatedSubscription = await this.prisma.subscriptionMonetization.update({
        where: { id: subscriptionId },
        data: {
          status: newStatus,
          cancelledAt: now,
          updatedAt: now,
        },
      });

      logger.info('SubscriptionManagementService: Subscription cancelled', {
        subscriptionId,
        cancelAtPeriodEnd,
        effectiveDate: cancelAtPeriodEnd ? subscription.currentPeriodEnd : now,
      });

      return this.mapSubscription(updatedSubscription);
    } catch (error) {
      logger.error('SubscriptionManagementService.cancelSubscription: Error', { error });
      throw error;
    }
  }

  /**
   * Reactivate a cancelled subscription
   * @param subscriptionId - Subscription ID to reactivate
   * @returns Updated subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    logger.info('SubscriptionManagementService.reactivateSubscription', {
      subscriptionId,
    });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      if (subscription.status !== 'cancelled' && !subscription.cancelledAt) {
        throw badRequestError('Subscription is not cancelled');
      }

      const updatedSubscription = await this.prisma.subscriptionMonetization.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          cancelledAt: null,
          updatedAt: new Date(),
        },
      });

      logger.info('SubscriptionManagementService: Subscription reactivated', {
        subscriptionId,
      });

      return this.mapSubscription(updatedSubscription);
    } catch (error) {
      logger.error('SubscriptionManagementService.reactivateSubscription: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Credit Management
  // ===========================================================================

  /**
   * Allocate monthly credits to a user based on their subscription
   * @param userId - User ID
   * @param subscriptionId - Optional subscription ID (if not provided, uses active subscription)
   * @returns Credit allocation record
   */
  async allocateMonthlyCredits(
    userId: string,
    subscriptionId?: string
  ): Promise<CreditAllocation> {
    logger.info('SubscriptionManagementService.allocateMonthlyCredits', {
      userId,
      subscriptionId,
    });

    try {
      // Get subscription
      let subscription;
      if (subscriptionId) {
        subscription = await this.prisma.subscriptionMonetization.findUnique({
          where: { id: subscriptionId },
        });
      } else {
        subscription = await this.getActiveSubscription(userId);
      }

      if (!subscription) {
        throw notFoundError('Active subscription');
      }

      // Create credit allocation record
      const allocation = await this.prisma.creditAllocation.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amount: subscription.monthlyCreditAllocation,
          allocationPeriodStart: subscription.currentPeriodStart,
          allocationPeriodEnd: subscription.currentPeriodEnd,
          source: 'subscription',
        },
      });

      // TODO: Integrate with Plan 112's user_credit_balance table
      // await this.updateUserCreditBalance(userId, allocation.amount);

      logger.info('SubscriptionManagementService: Credits allocated', {
        allocationId: allocation.id,
        amount: allocation.amount,
      });

      return allocation as CreditAllocation;
    } catch (error) {
      logger.error('SubscriptionManagementService.allocateMonthlyCredits: Error', { error });
      throw error;
    }
  }

  /**
   * Handle credit rollover logic
   * @param userId - User ID
   */
  async handleRollover(userId: string): Promise<void> {
    logger.info('SubscriptionManagementService.handleRollover', { userId });

    try {
      const subscription = await this.getActiveSubscription(userId);

      if (!subscription) {
        logger.warn('No active subscription for rollover', { userId });
        return;
      }

      // Get tier configuration for rollover limits
      const tierConfig = await this.prisma.subscriptionTierConfig.findUnique({
        where: { tierName: subscription.tier },
      });

      if (!tierConfig) {
        throw badRequestError(`Tier configuration not found: ${subscription.tier}`);
      }

      const maxRollover = tierConfig.maxCreditRollover;

      if (maxRollover === 0) {
        logger.debug('No rollover allowed for tier', { tier: subscription.tier });
        return;
      }

      // TODO: Implement actual rollover logic
      // 1. Calculate unused credits from previous period
      // 2. Apply rollover cap
      // 3. Create bonus credit allocation for rollover amount
      // 4. Update user_credit_balance (Plan 112 integration)

      logger.info('SubscriptionManagementService: Rollover handled', {
        userId,
        maxRollover,
      });
    } catch (error) {
      logger.error('SubscriptionManagementService.handleRollover: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Feature Access Control
  // ===========================================================================

  /**
   * Check if user can access a specific feature based on their subscription tier
   * @param userId - User ID
   * @param feature - Feature name
   * @returns True if user has access, false otherwise
   */
  async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    logger.debug('SubscriptionManagementService.canAccessFeature', { userId, feature });

    try {
      const subscription = await this.getActiveSubscription(userId);

      if (!subscription) {
        // Free tier has limited access
        return this.freeUserCanAccessFeature(feature);
      }

      const tierConfig = await this.prisma.subscriptionTierConfig.findUnique({
        where: { tierName: subscription.tier },
      });

      if (!tierConfig) {
        return false;
      }

      const features = tierConfig.features as Record<string, any>;
      return features[feature] === true;
    } catch (error) {
      logger.error('SubscriptionManagementService.canAccessFeature: Error', { error });
      return false;
    }
  }

  /**
   * Get tier limits for a user's subscription
   * @param userId - User ID
   * @returns Tier limits including credits and features
   */
  async getTierLimits(userId: string): Promise<TierLimits> {
    logger.debug('SubscriptionManagementService.getTierLimits', { userId });

    try {
      const subscription = await this.getActiveSubscription(userId);

      const tier = subscription?.tier || 'free';

      const tierConfig = await this.prisma.subscriptionTierConfig.findUnique({
        where: { tierName: tier },
      });

      if (!tierConfig) {
        throw notFoundError(`Tier configuration for ${tier}`);
      }

      return {
        tier: tierConfig.tierName,
        creditsPerMonth: tierConfig.monthlyCreditAllocation,
        maxRollover: tierConfig.maxCreditRollover,
        features: tierConfig.features as Record<string, any>,
      };
    } catch (error) {
      logger.error('SubscriptionManagementService.getTierLimits: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Subscription Queries
  // ===========================================================================

  /**
   * Get user's active subscription
   * @param userId - User ID
   * @returns Active subscription or null
   */
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    logger.debug('SubscriptionManagementService.getActiveSubscription', { userId });

    try {
      const subscription = await this.prisma.subscriptionMonetization.findFirst({
        where: {
          userId,
          status: { in: ['trial', 'active'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscription ? this.mapSubscription(subscription) : null;
    } catch (error) {
      logger.error('SubscriptionManagementService.getActiveSubscription: Error', { error });
      return null;
    }
  }

  /**
   * Get subscription history for a user
   * @param userId - User ID
   * @returns Array of subscriptions
   */
  async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    logger.debug('SubscriptionManagementService.getSubscriptionHistory', { userId });

    try {
      const subscriptions = await this.prisma.subscriptionMonetization.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return subscriptions.map((sub) => this.mapSubscription(sub));
    } catch (error) {
      logger.error('SubscriptionManagementService.getSubscriptionHistory: Error', { error });
      throw error;
    }
  }

  /**
   * List all subscriptions with pagination and filters
   * @param filters - Optional filters (page, limit, status, tier)
   * @returns Paginated subscriptions
   */
  async listAllSubscriptions(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
  }): Promise<{ data: Subscription[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    logger.debug('SubscriptionManagementService.listAllSubscriptions', { filters });

    try {
      const where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.tier) {
        where.tier = filters.tier;
      }

      const [subscriptions, total] = await Promise.all([
        this.prisma.subscriptionMonetization.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        }),
        this.prisma.subscriptionMonetization.count({ where }),
      ]);

      return {
        data: subscriptions.map((sub) => this.mapSubscription(sub)),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('SubscriptionManagementService.listAllSubscriptions: Error', { error });
      throw error;
    }
  }

  /**
   * Get subscription statistics for dashboard
   * @returns Subscription stats (total, by status, by tier)
   */
  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    cancelled: number;
    expired: number;
    byTier: Record<string, number>;
  }> {
    logger.debug('SubscriptionManagementService.getSubscriptionStats');

    try {
      const [total, byStatus, byTier] = await Promise.all([
        this.prisma.subscriptionMonetization.count(),
        this.prisma.subscriptionMonetization.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.subscriptionMonetization.groupBy({
          by: ['tier'],
          _count: { id: true },
        }),
      ]);

      const statusCounts = byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      const tierCounts = byTier.reduce(
        (acc, item) => {
          acc[item.tier] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        total,
        active: statusCounts.active || 0,
        trial: statusCounts.trial || 0,
        cancelled: statusCounts.cancelled || 0,
        expired: statusCounts.expired || 0,
        byTier: tierCounts,
      };
    } catch (error) {
      logger.error('SubscriptionManagementService.getSubscriptionStats: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Map Prisma subscription to service interface
   */
  private mapSubscription(subscription: any): Subscription {
    return {
      id: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier,
      billingCycle: subscription.billingCycle as 'monthly' | 'annual' | 'lifetime',
      status: subscription.status as 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired',
      basePriceUsd: Number(subscription.basePriceUsd),
      monthlyCreditAllocation: subscription.monthlyCreditAllocation,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      cancelledAt: subscription.cancelledAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Get tier level for comparison (higher number = higher tier)
   */
  private getTierLevel(tier: string): number {
    const tierLevels: Record<string, number> = {
      free: 0,
      pro: 1,
      pro_max: 2,
      enterprise_pro: 3,
      enterprise_max: 4,
      perpetual: 5,
    };

    return tierLevels[tier] || 0;
  }

  /**
   * Get trial days for a specific tier
   */
  private getTrialDaysForTier(tier: string): number {
    const trialDays: Record<string, number> = {
      free: 0,
      pro: 14,
      pro_max: 14,
      enterprise_pro: 30,
      enterprise_max: 30,
    };

    return trialDays[tier] || 0;
  }

  /**
   * Check if free user can access a feature
   */
  private freeUserCanAccessFeature(feature: string): boolean {
    const freeFeatures = ['apiAccess', 'basicSupport'];
    return freeFeatures.includes(feature);
  }
}
