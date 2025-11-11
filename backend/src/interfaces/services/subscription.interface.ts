import { Subscription } from '@prisma/client';

export const ISubscriptionService = Symbol('ISubscriptionService');

export interface ISubscriptionService {
  /**
   * Get active subscription for a user
   */
  getActiveSubscription(userId: string): Promise<Subscription | null>;

  /**
   * Create a new subscription
   */
  createSubscription(data: {
    userId: string;
    tierId: string;
    stripeSubscriptionId: string;
    status: string;
  }): Promise<Subscription>;

  /**
   * Update subscription status
   */
  updateSubscriptionStatus(
    subscriptionId: string,
    status: string
  ): Promise<Subscription>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): Promise<Subscription>;

  /**
   * Get subscription by Stripe subscription ID
   */
  getByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<Subscription | null>;

  /**
   * Get all subscriptions for a user
   */
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
}
