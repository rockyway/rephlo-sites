import { Subscription } from '@prisma/client';
import { ISubscriptionService } from '../../interfaces';

export class MockSubscriptionService implements ISubscriptionService {
  private subscriptions: Map<string, Subscription> = new Map();
  private stripeIndex: Map<string, string> = new Map(); // stripe_sub_id -> sub_id

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    return (
      Array.from(this.subscriptions.values()).find(
        (s) => s.userId === userId && s.status === 'active'
      ) || null
    );
  }

  async createSubscription(data: {
    userId: string;
    tierId: string;
    stripeSubscriptionId: string;
    status: string;
  }): Promise<Subscription> {
    const subscription: Subscription = {
      id: `mock-sub-${Date.now()}-${Math.random()}`,
      userId: data.userId,
      tier: 'pro' as any,
      status: data.status as any,
      creditsPerMonth: 1000,
      creditsRollover: false,
      priceCents: 2000,
      billingInterval: 'monthly',
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      stripeCustomerId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEnd: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscription.id, subscription);
    if (subscription.stripeSubscriptionId) {
      this.stripeIndex.set(subscription.stripeSubscriptionId, subscription.id);
    }

    return subscription;
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    subscription.status = status as any;
    subscription.updatedAt = new Date();

    if (status === 'cancelled') {
      subscription.cancelledAt = new Date();
    }

    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    subscription.status = 'cancelled' as any;
    subscription.cancelledAt = new Date();
    subscription.updatedAt = new Date();

    return subscription;
  }

  async getByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const subscriptionId = this.stripeIndex.get(stripeSubscriptionId);
    if (!subscriptionId) return null;
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Test helpers
  clear() {
    this.subscriptions.clear();
    this.stripeIndex.clear();
  }

  seed(subscriptions: Subscription[]) {
    subscriptions.forEach((sub) => {
      this.subscriptions.set(sub.id, sub);
      if (sub.stripeSubscriptionId) {
        this.stripeIndex.set(sub.stripeSubscriptionId, sub.id);
      }
    });
  }

  getAll(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }
}
