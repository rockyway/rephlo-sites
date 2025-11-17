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

import { injectable, inject, container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger';
import { notFoundError, badRequestError } from '../middleware/error.middleware';
import {
  Subscription,
  SubscriptionStats,
} from '@rephlo/shared-types';
import { mapSubscriptionToApiType } from '../utils/typeMappers';

// =============================================================================
// Types and Interfaces
// =============================================================================

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
      const tierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: input.tier },
      });

      if (!tierConfig || !tierConfig.is_active) {
        throw badRequestError(`Invalid or inactive subscription tier: ${input.tier}`);
      }

      // Calculate pricing based on billing cycle
      const basePriceUsd =
        input.billingCycle === 'annual'
          ? Number(tierConfig.annual_price_usd)
          : Number(tierConfig.monthly_price_usd);

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
      const subscription = await this.prisma.subscription_monetization.create({
        data: {
          id: crypto.randomUUID(),
          user_id: input.userId,
          tier: input.tier as any, // Cast to enum type
          billing_cycle: input.billingCycle,
          status: initialStatus,
          base_price_usd: basePriceUsd,
          monthly_credit_allocation: tierConfig.monthly_credit_allocation,
          stripe_customer_id: input.stripeCustomerId || null,
          stripe_subscription_id: input.stripeSubscriptionId || null,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          trial_ends_at: trialEndsAt,
          updated_at: new Date(),
        },
      });

      // Allocate initial credits (except for trial users - they get credits when trial ends)
      if (initialStatus === 'active' && tierConfig.monthly_credit_allocation > 0) {
        await this.allocateMonthlyCredits(input.userId, subscription.id);
      }

      // Fetch subscription with user relation for mapper
      const createdSubscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscription.id },
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

      logger.info('SubscriptionManagementService: Subscription created', {
        subscriptionId: subscription.id,
        tier: input.tier,
        status: initialStatus,
      });

      return mapSubscriptionToApiType(createdSubscription!);
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
      const subscription = await this.prisma.subscription_monetization.findUnique({
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
      const newTierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: newTier },
      });

      if (!newTierConfig || !newTierConfig.is_active) {
        throw badRequestError(`Invalid or inactive subscription tier: ${newTier}`);
      }

      // Calculate new pricing
      const basePriceUsd =
        subscription.billing_cycle === 'annual'
          ? Number(newTierConfig.annual_price_usd)
          : Number(newTierConfig.monthly_price_usd);

      // Update subscription
      const updatedSubscription = await this.prisma.subscription_monetization.update({
        where: { id: subscriptionId },
        data: {
          tier: newTier as any, // Cast to enum type
          base_price_usd: basePriceUsd,
          monthly_credit_allocation: newTierConfig.monthly_credit_allocation,
          updated_at: new Date(),
        },
      });

      // Calculate and record MONETARY proration (payment/invoice)
      // This calculates how much to charge the user for the prorated upgrade
      try {
        const prorationService = container.resolve<import('./proration.service').ProrationService>(
          'ProrationService'
        );

        // Calculate monetary proration (in USD)
        const monetaryProration = await prorationService.calculateProration(subscriptionId, newTier);

        // Create proration event record
        await this.prisma.proration_event.create({
          data: {
            id: crypto.randomUUID(),
            user_id: updatedSubscription.user_id,
            subscription_id: subscriptionId,
            from_tier: monetaryProration.fromTier,
            to_tier: monetaryProration.toTier,
            change_type: 'upgrade',
            days_remaining: monetaryProration.daysRemaining,
            days_in_cycle: monetaryProration.daysInCycle,
            unused_credit_value_usd: monetaryProration.unusedCreditValueUsd,
            new_tier_prorated_cost_usd: monetaryProration.newTierProratedCostUsd,
            net_charge_usd: monetaryProration.netChargeUsd,
            effective_date: new Date(),
            status: 'pending',
            updated_at: new Date(),
          },
        });

        logger.info('Monetary proration calculated and recorded for upgrade', {
          userId: updatedSubscription.user_id,
          subscriptionId,
          fromTier: monetaryProration.fromTier,
          toTier: monetaryProration.toTier,
          netChargeUsd: monetaryProration.netChargeUsd,
          unusedCreditValueUsd: monetaryProration.unusedCreditValueUsd,
          newTierProratedCostUsd: monetaryProration.newTierProratedCostUsd,
        });
      } catch (error) {
        logger.error('Failed to calculate/record monetary proration for upgrade', {
          userId: updatedSubscription.user_id,
          subscriptionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw - continue with credit allocation even if proration fails
        // This ensures credits are allocated even if monetary proration recording fails
      }

      // Allocate PRORATED credits for tier upgrade
      // User gets credits proportional to remaining time in billing cycle
      try {
        const creditService = container.resolve<import('../interfaces').ICreditService>('ICreditService');

        // Get current tier's credit allocation for proration calculation
        const currentTierConfig = await this.prisma.subscription_tier_config.findUnique({
          where: { tier_name: subscription.tier },
        });

        if (!currentTierConfig) {
          throw new Error(`Current tier config not found: ${subscription.tier}`);
        }

        // Calculate prorated credits based on remaining time in billing cycle
        const proration = await creditService.calculateProratedCreditsForTierChange(
          updatedSubscription.user_id,
          currentTierConfig.monthly_credit_allocation,
          newTierConfig.monthly_credit_allocation,
          updatedSubscription.current_period_start,
          updatedSubscription.current_period_end
        );

        logger.info('Upgrade proration calculated', {
          userId: updatedSubscription.user_id,
          currentTier: subscription.tier,
          newTier: newTier,
          currentTierCredits: currentTierConfig.monthly_credit_allocation,
          newTierCredits: newTierConfig.monthly_credit_allocation,
          daysRemaining: proration.daysRemaining,
          daysInCycle: proration.daysInCycle,
          proratedCredits: proration.proratedCredits,
          currentUsedCredits: proration.currentUsedCredits,
        });

        // Allocate prorated credits (not full monthly amount)
        await creditService.allocateCredits({
          userId: updatedSubscription.user_id,
          subscriptionId: updatedSubscription.id,
          totalCredits: proration.proratedCredits,
          billingPeriodStart: updatedSubscription.current_period_start,
          billingPeriodEnd: updatedSubscription.current_period_end,
        });

        logger.info('Prorated credits allocated for upgraded subscription', {
          userId: updatedSubscription.user_id,
          subscriptionId: updatedSubscription.id,
          proratedCredits: proration.proratedCredits,
          daysRemaining: proration.daysRemaining,
        });
      } catch (error) {
        logger.error('Failed to allocate prorated credits for upgraded subscription', {
          userId: updatedSubscription.user_id,
          subscriptionId: updatedSubscription.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error; // Re-throw to fail the upgrade if credit allocation fails
      }

      // Fetch updated subscription with user relation
      const finalSubscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
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

      logger.info('SubscriptionManagementService: Tier upgraded', {
        subscriptionId,
        oldTier: subscription.tier,
        newTier,
      });

      return mapSubscriptionToApiType(finalSubscription!);
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
      const subscription = await this.prisma.subscription_monetization.findUnique({
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
      const newTierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: newTier },
      });

      if (!newTierConfig || !newTierConfig.is_active) {
        throw badRequestError(`Invalid or inactive subscription tier: ${newTier}`);
      }

      // Calculate new pricing
      const basePriceUsd =
        subscription.billing_cycle === 'annual'
          ? Number(newTierConfig.annual_price_usd)
          : Number(newTierConfig.monthly_price_usd);

      // Update subscription (downgrade takes effect immediately)
      const updatedSubscription = await this.prisma.subscription_monetization.update({
        where: { id: subscriptionId },
        data: {
          tier: newTier as any, // Cast to enum type
          base_price_usd: basePriceUsd,
          monthly_credit_allocation: newTierConfig.monthly_credit_allocation,
          updated_at: new Date(),
        },
      });

      // Calculate and record MONETARY proration (payment/invoice)
      // For downgrades, this calculates the credit/refund the user should receive
      try {
        const prorationService = container.resolve<import('./proration.service').ProrationService>(
          'ProrationService'
        );

        // Calculate monetary proration (in USD)
        const monetaryProration = await prorationService.calculateProration(subscriptionId, newTier);

        // Create proration event record
        await this.prisma.proration_event.create({
          data: {
            id: crypto.randomUUID(),
            user_id: updatedSubscription.user_id,
            subscription_id: subscriptionId,
            from_tier: monetaryProration.fromTier,
            to_tier: monetaryProration.toTier,
            change_type: 'downgrade',
            days_remaining: monetaryProration.daysRemaining,
            days_in_cycle: monetaryProration.daysInCycle,
            unused_credit_value_usd: monetaryProration.unusedCreditValueUsd,
            new_tier_prorated_cost_usd: monetaryProration.newTierProratedCostUsd,
            net_charge_usd: monetaryProration.netChargeUsd,
            effective_date: new Date(),
            status: 'pending',
            updated_at: new Date(),
          },
        });

        logger.info('Monetary proration calculated and recorded for downgrade', {
          userId: updatedSubscription.user_id,
          subscriptionId,
          fromTier: monetaryProration.fromTier,
          toTier: monetaryProration.toTier,
          netChargeUsd: monetaryProration.netChargeUsd,
          unusedCreditValueUsd: monetaryProration.unusedCreditValueUsd,
          newTierProratedCostUsd: monetaryProration.newTierProratedCostUsd,
        });
      } catch (error) {
        logger.error('Failed to calculate/record monetary proration for downgrade', {
          userId: updatedSubscription.user_id,
          subscriptionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw - continue with credit allocation even if proration fails
        // This ensures credits are allocated even if monetary proration recording fails
      }

      // Allocate PRORATED credits for tier downgrade
      // User gets reduced credits proportional to remaining time in billing cycle
      // EDGE CASE: User may have already consumed more than the prorated amount
      try {
        const creditService = container.resolve<import('../interfaces').ICreditService>('ICreditService');

        // Get current tier's credit allocation for proration calculation
        const currentTierConfig = await this.prisma.subscription_tier_config.findUnique({
          where: { tier_name: subscription.tier },
        });

        if (!currentTierConfig) {
          throw new Error(`Current tier config not found: ${subscription.tier}`);
        }

        // Calculate prorated credits based on remaining time in billing cycle
        const proration = await creditService.calculateProratedCreditsForTierChange(
          updatedSubscription.user_id,
          currentTierConfig.monthly_credit_allocation,
          newTierConfig.monthly_credit_allocation,
          updatedSubscription.current_period_start,
          updatedSubscription.current_period_end
        );

        logger.info('Downgrade proration calculated', {
          userId: updatedSubscription.user_id,
          currentTier: subscription.tier,
          newTier: newTier,
          currentTierCredits: currentTierConfig.monthly_credit_allocation,
          newTierCredits: newTierConfig.monthly_credit_allocation,
          daysRemaining: proration.daysRemaining,
          daysInCycle: proration.daysInCycle,
          proratedCredits: proration.proratedCredits,
          currentUsedCredits: proration.currentUsedCredits,
          isDowngradeWithOveruse: proration.isDowngradeWithOveruse,
        });

        // Handle edge case: user already used more than prorated amount
        if (proration.isDowngradeWithOveruse) {
          logger.warn('Downgrade with overuse detected', {
            userId: updatedSubscription.user_id,
            proratedCredits: proration.proratedCredits,
            currentUsedCredits: proration.currentUsedCredits,
            deficit: Math.abs(proration.remainingCreditsAfterChange),
          });

          // Allocate 0 credits for remaining period (user has overused)
          // They'll get the new tier's full allocation at next billing cycle
          await creditService.allocateCredits({
            userId: updatedSubscription.user_id,
            subscriptionId: updatedSubscription.id,
            totalCredits: proration.currentUsedCredits, // Set total = used (0 remaining)
            billingPeriodStart: updatedSubscription.current_period_start,
            billingPeriodEnd: updatedSubscription.current_period_end,
          });

          logger.info('Downgrade with overuse: 0 credits remaining for current cycle', {
            userId: updatedSubscription.user_id,
            currentUsedCredits: proration.currentUsedCredits,
          });
        } else {
          // Normal downgrade: allocate prorated credits
          await creditService.allocateCredits({
            userId: updatedSubscription.user_id,
            subscriptionId: updatedSubscription.id,
            totalCredits: proration.proratedCredits,
            billingPeriodStart: updatedSubscription.current_period_start,
            billingPeriodEnd: updatedSubscription.current_period_end,
          });

          logger.info('Prorated credits allocated for downgraded subscription', {
            userId: updatedSubscription.user_id,
            subscriptionId: updatedSubscription.id,
            proratedCredits: proration.proratedCredits,
            daysRemaining: proration.daysRemaining,
            remainingAfterChange: proration.remainingCreditsAfterChange,
          });
        }
      } catch (error) {
        logger.error('Failed to allocate prorated credits for downgraded subscription', {
          userId: updatedSubscription.user_id,
          subscriptionId: updatedSubscription.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error; // Re-throw to fail the downgrade if credit allocation fails
      }

      // Fetch updated subscription with user relation
      const finalSubscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
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

      logger.info('SubscriptionManagementService: Tier downgraded', {
        subscriptionId,
        oldTier: subscription.tier,
        newTier,
      });

      return mapSubscriptionToApiType(finalSubscription!);
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
      const subscription = await this.prisma.subscription_monetization.findUnique({
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

      await this.prisma.subscription_monetization.update({
        where: { id: subscriptionId },
        data: {
          status: newStatus,
          cancelled_at: now,
          updated_at: now,
        },
      });

      // Fetch updated subscription with user relation
      const finalSubscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
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

      logger.info('SubscriptionManagementService: Subscription cancelled', {
        subscriptionId,
        cancelAtPeriodEnd,
        effectiveDate: cancelAtPeriodEnd ? subscription.current_period_end : now,
      });

      return mapSubscriptionToApiType(finalSubscription!);
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
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      if (subscription.status !== 'cancelled' && !subscription.cancelled_at) {
        throw badRequestError('Subscription is not cancelled');
      }

      await this.prisma.subscription_monetization.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          cancelled_at: null,
          updated_at: new Date(),
        },
      });

      // Fetch updated subscription with user relation
      const finalSubscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
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

      logger.info('SubscriptionManagementService: Subscription reactivated', {
        subscriptionId,
      });

      return mapSubscriptionToApiType(finalSubscription!);
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
      // Get subscription (always fetch from Prisma for consistent types)
      let subscription;
      if (subscriptionId) {
        subscription = await this.prisma.subscription_monetization.findUnique({
          where: { id: subscriptionId },
        });
      } else {
        // Fetch active subscription directly from Prisma (not using mapper)
        subscription = await this.prisma.subscription_monetization.findFirst({
          where: {
            user_id: userId,
            status: { in: ['trial', 'active'] },
          },
          orderBy: { created_at: 'desc' },
        });
      }

      if (!subscription) {
        throw notFoundError('Active subscription');
      }

      // Create credit allocation record
      const allocation = await this.prisma.credit_allocation.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userId,
          subscription_id: subscription.id,
          amount: subscription.monthly_credit_allocation,
          allocation_period_start: subscription.current_period_start,
          allocation_period_end: subscription.current_period_end,
          source: 'subscription',
          created_at: new Date(),
        },
      });

      // TODO: Integrate with Plan 112's user_credit_balance table
      // await this.updateUserCreditBalance(userId, allocation.amount);

      logger.info('SubscriptionManagementService: Credits allocated', {
        allocationId: allocation.id,
        amount: allocation.amount,
      });

      return {
        id: allocation.id,
        userId: allocation.user_id,
        subscriptionId: allocation.subscription_id,
        amount: allocation.amount,
        allocationPeriodStart: allocation.allocation_period_start,
        allocationPeriodEnd: allocation.allocation_period_end,
        source: allocation.source as any,
        createdAt: allocation.created_at,
      };
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
      const tierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: subscription.tier },
      });

      if (!tierConfig) {
        throw badRequestError(`Tier configuration not found: ${subscription.tier}`);
      }

      const maxRollover = tierConfig.max_credit_rollover;

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

      const tierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: subscription.tier },
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

      const tierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: tier },
      });

      if (!tierConfig) {
        throw notFoundError(`Tier configuration for ${tier}`);
      }

      return {
        tier: tierConfig.tier_name,
        creditsPerMonth: tierConfig.monthly_credit_allocation,
        maxRollover: tierConfig.max_credit_rollover,
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
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: {
          user_id: userId,
          status: { in: ['trial', 'active'] },
        },
        orderBy: { created_at: 'desc' },
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

      return subscription ? mapSubscriptionToApiType(subscription) : null;
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
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
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

      return subscriptions.map((sub) => mapSubscriptionToApiType(sub));
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
        this.prisma.subscription_monetization.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
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
        }),
        this.prisma.subscription_monetization.count({ where }),
      ]);

      return {
        data: subscriptions.map((sub) => mapSubscriptionToApiType(sub)),
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
   * Uses shared SubscriptionStats type from @rephlo/shared-types
   * @returns Subscription stats matching shared type interface
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    logger.debug('SubscriptionManagementService.getSubscriptionStats');

    try {
      // Calculate date range for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [activeCount, pastDueCount, mrrData, trialConversions] = await Promise.all([
        // Count active subscriptions
        this.prisma.subscription_monetization.count({
          where: { status: 'active' },
        }),

        // Count past due subscriptions
        this.prisma.subscription_monetization.count({
          where: { status: 'past_due' },
        }),

        // Calculate MRR (Monthly Recurring Revenue)
        this.prisma.subscription_monetization.aggregate({
          where: {
            status: 'active',
            billing_cycle: 'monthly',
          },
          _sum: { base_price_usd: true },
        }),

        // Count trial conversions this month (trials that became active)
        this.prisma.subscription_monetization.count({
          where: {
            status: 'active',
            updated_at: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            // Look for subscriptions that were trials before
            // Note: This is an approximation - ideally we'd have a status history table
          },
        }),
      ]);

      // Calculate MRR including annual subscriptions (converted to monthly)
      const annualMrrData = await this.prisma.subscription_monetization.aggregate({
        where: {
          status: 'active',
          billing_cycle: 'annual',
        },
        _sum: { base_price_usd: true },
      });

      const monthlyMrr = Number(mrrData._sum.base_price_usd) || 0;
      const annualMrr = (Number(annualMrrData._sum.base_price_usd) || 0) / 12; // Convert annual to monthly
      const totalMrr = monthlyMrr + annualMrr;

      return {
        totalActive: activeCount,
        mrr: Math.round(totalMrr * 100) / 100, // Round to 2 decimal places
        pastDueCount: pastDueCount,
        trialConversionsThisMonth: trialConversions,
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
