import type { subscription_monetization } from '@prisma/client';

export const ISubscriptionService = Symbol('ISubscriptionService');

export interface ISubscriptionService {
  /**
   * Get active subscription for a user
   */
  getActiveSubscription(userId: string): Promise<subscription_monetization | null>;

  /**
   * Create a new subscription
   */
  createSubscription(data: {
    userId: string;
    tierId: string;
    stripeSubscriptionId: string;
    status: string;
  }): Promise<subscription_monetization>;

  /**
   * Update subscription status
   */
  updateSubscriptionStatus(
    subscriptionId: string,
    status: string
  ): Promise<subscription_monetization>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): Promise<subscription_monetization>;

  /**
   * Get subscription by Stripe subscription ID
   */
  getByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<subscription_monetization | null>;

  /**
   * Get all subscriptions for a user
   */
  getUserSubscriptions(userId: string): Promise<subscription_monetization[]>;
}
