import { subscription_monetization } from '@prisma/client';
import { ISubscriptionService } from '../../interfaces';

export class MockSubscriptionService implements ISubscriptionService {
  private subscriptions: Map<string, subscription_monetization> = new Map();
  private stripeIndex: Map<string, string> = new Map(); // stripe_sub_id -> sub_id

  async getActiveSubscription(userId: string): Promise<subscription_monetization | null> {
    return (
      Array.from(this.subscriptions.values()).find(
        (s) => s.user_id === userId && s.status === 'active'
      ) || null
    );
  }

  async createSubscription(data: {
    userId: string;
    tierId: string;
    stripeSubscriptionId: string;
    status: string;
  }): Promise<subscription_monetization> {
    const now = new Date();
    const subscription: subscription_monetization = {
      id: `mock-sub-${Date.now()}-${Math.random()}`,
      user_id: data.userId,
      tier: 'pro' as any,
      billing_cycle: 'monthly',
      status: data.status,
      base_price_usd: 15.00 as any,
      monthly_credit_allocation: 1500,
      stripe_customer_id: null,
      stripe_subscription_id: data.stripeSubscriptionId || null,
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      trial_ends_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    this.subscriptions.set(subscription.id, subscription);
    if (subscription.stripe_subscription_id) {
      this.stripeIndex.set(subscription.stripe_subscription_id, subscription.id);
    }

    return subscription;
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<subscription_monetization> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    subscription.status = status;
    subscription.updated_at = new Date();

    if (status === 'cancelled') {
      subscription.cancelled_at = new Date();
    }

    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<subscription_monetization> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    subscription.status = 'cancelled';
    subscription.cancelled_at = new Date();
    subscription.updated_at = new Date();

    return subscription;
  }

  async getByStripeSubscriptionId(stripeSubscriptionId: string): Promise<subscription_monetization | null> {
    const subscriptionId = this.stripeIndex.get(stripeSubscriptionId);
    if (!subscriptionId) return null;
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getUserSubscriptions(userId: string): Promise<subscription_monetization[]> {
    return Array.from(this.subscriptions.values())
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  // Test helpers
  clear() {
    this.subscriptions.clear();
    this.stripeIndex.clear();
  }

  seed(subscriptions: subscription_monetization[]) {
    subscriptions.forEach((sub) => {
      this.subscriptions.set(sub.id, sub);
      if (sub.stripe_subscription_id) {
        this.stripeIndex.set(sub.stripe_subscription_id, sub.id);
      }
    });
  }

  getAll(): subscription_monetization[] {
    return Array.from(this.subscriptions.values());
  }
}
