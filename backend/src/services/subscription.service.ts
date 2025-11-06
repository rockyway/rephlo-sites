/**
 * Subscription Service
 *
 * Handles subscription lifecycle management and business logic.
 * Integrates with Stripe for payment processing and database for persistence.
 *
 * Features:
 * - Get current user subscription
 * - List available subscription plans
 * - Create new subscription with Stripe integration
 * - Update subscription (upgrade/downgrade)
 * - Cancel subscription
 * - Calculate billing periods
 * - Manage subscription status transitions
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Subscription APIs)
 */

import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import {
  createOrGetCustomer,
  createStripeSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  getStripeSubscription,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanId,
  BillingInterval,
  calculatePrice,
} from './stripe.service';
import logger from '../utils/logger';

/**
 * Get current active subscription for a user
 */
export async function getCurrentSubscription(userId: string, prisma: PrismaClient) {
  logger.info('Fetching current subscription', { userId });

  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.active,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      logger.info('No active subscription found', { userId });
      return null;
    }

    logger.info('Found active subscription', {
      userId,
      subscriptionId: subscription.id,
      tier: subscription.tier,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to fetch current subscription', { userId, error });
    throw error;
  }
}

/**
 * List all available subscription plans
 */
export function listSubscriptionPlans() {
  logger.info('Listing subscription plans');

  return Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    description: plan.description,
    credits_per_month: plan.creditsPerMonth,
    price_cents: plan.priceCents,
    billing_intervals: plan.billingIntervals,
    yearly_discount_percent: 'yearlyDiscountPercent' in plan ? plan.yearlyDiscountPercent : undefined,
    features: plan.features,
  }));
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  userId: string,
  planId: SubscriptionPlanId,
  billingInterval: BillingInterval,
  paymentMethodId: string | undefined,
  prisma: PrismaClient
) {
  logger.info('Creating subscription', { userId, planId, billingInterval });

  try {
    // Check if user already has an active subscription
    const existingSubscription = await getCurrentSubscription(userId, prisma);
    if (existingSubscription) {
      throw new Error('User already has an active subscription');
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    const priceCents = calculatePrice(planId, billingInterval);

    // Calculate billing period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingInterval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    let stripeSubscriptionId: string | null = null;
    let stripeCustomerId: string | null = null;

    // For paid plans, create Stripe subscription
    if (plan.priceCents > 0) {
      if (!paymentMethodId) {
        throw new Error('Payment method is required for paid plans');
      }

      // Create or get Stripe customer
      const userName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : undefined;
      const customer = await createOrGetCustomer(userId, user.email, userName);
      stripeCustomerId = customer.id;

      // Create Stripe subscription
      const stripeSubscription = await createStripeSubscription(
        customer.id,
        planId,
        billingInterval,
        paymentMethodId
      );
      stripeSubscriptionId = stripeSubscription.id;

      // Use Stripe's period dates
      now.setTime(stripeSubscription.current_period_start * 1000);
      periodEnd.setTime(stripeSubscription.current_period_end * 1000);
    }

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        tier: planId as SubscriptionTier,
        status: SubscriptionStatus.active,
        creditsPerMonth: plan.creditsPerMonth,
        creditsRollover: false,
        priceCents,
        billingInterval,
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    logger.info('Created subscription', {
      userId,
      subscriptionId: subscription.id,
      planId,
    });

    // TODO: Allocate credits for the billing period
    // This should call the credit service to create a credit record
    logger.info('TODO: Allocate credits for subscription', {
      userId,
      subscriptionId: subscription.id,
      credits: plan.creditsPerMonth,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to create subscription', { userId, planId, error });
    throw error;
  }
}

/**
 * Update an existing subscription (upgrade/downgrade)
 */
export async function updateSubscription(
  userId: string,
  newPlanId: SubscriptionPlanId,
  newBillingInterval: BillingInterval,
  prisma: PrismaClient
) {
  logger.info('Updating subscription', { userId, newPlanId, newBillingInterval });

  try {
    // Get current active subscription
    const currentSubscription = await getCurrentSubscription(userId, prisma);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = SUBSCRIPTION_PLANS[newPlanId];
    const newPriceCents = calculatePrice(newPlanId, newBillingInterval);

    // Update Stripe subscription if exists
    if (currentSubscription.stripeSubscriptionId) {
      await updateStripeSubscription(
        currentSubscription.stripeSubscriptionId,
        newPlanId,
        newBillingInterval
      );

      // Get updated subscription details from Stripe
      const stripeSubscription = await getStripeSubscription(
        currentSubscription.stripeSubscriptionId
      );

      // Update period dates from Stripe
      const periodStart = new Date(stripeSubscription.current_period_start * 1000);
      const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          tier: newPlanId as SubscriptionTier,
          creditsPerMonth: newPlan.creditsPerMonth,
          priceCents: newPriceCents,
          billingInterval: newBillingInterval,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        },
      });

      logger.info('Updated subscription', {
        userId,
        subscriptionId: updatedSubscription.id,
        newPlanId,
      });

      // TODO: Adjust credits for the new plan
      // This should call the credit service to update credit allocation
      logger.info('TODO: Adjust credits for updated subscription', {
        userId,
        subscriptionId: updatedSubscription.id,
        newCredits: newPlan.creditsPerMonth,
      });

      return updatedSubscription;
    } else {
      // For free plan upgrades, create new Stripe subscription
      throw new Error('Cannot update free subscription without payment method');
    }
  } catch (error) {
    logger.error('Failed to update subscription', { userId, newPlanId, error });
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  userId: string,
  cancelAtPeriodEnd: boolean = true,
  reason: string | undefined,
  prisma: PrismaClient
) {
  logger.info('Cancelling subscription', { userId, cancelAtPeriodEnd, reason });

  try {
    // Get current active subscription
    const currentSubscription = await getCurrentSubscription(userId, prisma);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    // Cancel Stripe subscription if exists
    if (currentSubscription.stripeSubscriptionId) {
      await cancelStripeSubscription(
        currentSubscription.stripeSubscriptionId,
        cancelAtPeriodEnd
      );
    }

    // Update subscription in database
    const now = new Date();
    const updatedSubscription = await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        status: cancelAtPeriodEnd ? SubscriptionStatus.active : SubscriptionStatus.cancelled,
        cancelledAt: now,
        updatedAt: now,
      },
    });

    logger.info('Cancelled subscription', {
      userId,
      subscriptionId: updatedSubscription.id,
      cancelAtPeriodEnd,
    });

    return {
      ...updatedSubscription,
      cancel_at_period_end: cancelAtPeriodEnd,
    };
  } catch (error) {
    logger.error('Failed to cancel subscription', { userId, error });
    throw error;
  }
}

/**
 * Sync subscription status from Stripe
 */
export async function syncSubscriptionFromStripe(
  stripeSubscriptionId: string,
  prisma: PrismaClient
) {
  logger.info('Syncing subscription from Stripe', { stripeSubscriptionId });

  try {
    // Get Stripe subscription
    const stripeSubscription = await getStripeSubscription(stripeSubscriptionId);

    // Find subscription in database
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!subscription) {
      logger.warn('Subscription not found in database', { stripeSubscriptionId });
      return null;
    }

    // Map Stripe status to our status
    let status: SubscriptionStatus;
    switch (stripeSubscription.status) {
      case 'active':
        status = SubscriptionStatus.active;
        break;
      case 'canceled':
        status = SubscriptionStatus.cancelled;
        break;
      case 'past_due':
      case 'unpaid':
        status = SubscriptionStatus.suspended;
        break;
      default:
        status = SubscriptionStatus.expired;
    }

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        updatedAt: new Date(),
      },
    });

    logger.info('Synced subscription from Stripe', {
      subscriptionId: subscription.id,
      status,
    });

    return updatedSubscription;
  } catch (error) {
    logger.error('Failed to sync subscription from Stripe', {
      stripeSubscriptionId,
      error,
    });
    throw error;
  }
}

/**
 * Check for expired subscriptions and update their status
 */
export async function checkExpiredSubscriptions(prisma: PrismaClient) {
  logger.info('Checking for expired subscriptions');

  try {
    const now = new Date();

    // Find active subscriptions that have passed their end date
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.active,
        currentPeriodEnd: {
          lt: now,
        },
      },
    });

    logger.info('Found expired subscriptions', { count: expiredSubscriptions.length });

    // Update each expired subscription
    for (const subscription of expiredSubscriptions) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.expired,
          updatedAt: now,
        },
      });

      logger.info('Marked subscription as expired', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
      });
    }

    return expiredSubscriptions.length;
  } catch (error) {
    logger.error('Failed to check expired subscriptions', { error });
    throw error;
  }
}

/**
 * Get subscription statistics for a user
 */
export async function getSubscriptionStats(userId: string, prisma: PrismaClient) {
  logger.info('Fetching subscription statistics', { userId });

  try {
    const stats = await prisma.subscription.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      },
      {} as Record<string, number>
    );
  } catch (error) {
    logger.error('Failed to fetch subscription statistics', { userId, error });
    throw error;
  }
}
