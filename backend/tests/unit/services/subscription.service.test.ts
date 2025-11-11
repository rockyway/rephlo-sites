import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import {
  getCurrentSubscription,
  listSubscriptionPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  syncSubscriptionFromStripe,
  checkExpiredSubscriptions,
} from '../../../src/services/subscription.service';
import { getTestDatabase, cleanDatabase } from '../../setup/database';
import { createTestUser, createTestSubscription } from '../../helpers/factories';
import { mockStripeCustomerCreate, mockStripeSubscriptionCreate, cleanMocks } from '../../helpers/mocks';
import nock from 'nock';

// Mock webhook service
jest.mock('../../../src/services/webhook.service', () => ({
  queueWebhook: jest.fn().mockResolvedValue(undefined),
}));

// Mock Stripe service functions
jest.mock('../../../src/services/stripe.service', () => {
  const actual = jest.requireActual('../../../src/services/stripe.service');
  return {
    ...actual,
    createOrGetCustomer: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      email: 'test@example.com',
    }),
    createStripeSubscription: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
    updateStripeSubscription: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
    }),
    getStripeSubscription: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
    cancelStripeSubscription: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000),
    }),
  };
});

describe('SubscriptionService', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanDatabase();
    cleanMocks();
  });

  // ===========================================================================
  // Get Current Subscription
  // ===========================================================================

  describe('getCurrentSubscription', () => {
    it('should get active subscription for user', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id, {
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
      });

      const current = await getCurrentSubscription(user.id, prisma);

      expect(current).toBeDefined();
      expect(current?.id).toBe(subscription.id);
      expect(current?.tier).toBe(SubscriptionTier.pro);
      expect(current?.status).toBe(SubscriptionStatus.active);
    });

    it('should return null when no active subscription exists', async () => {
      const user = await createTestUser(prisma);

      const current = await getCurrentSubscription(user.id, prisma);

      expect(current).toBeNull();
    });

    it('should ignore cancelled subscriptions', async () => {
      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.cancelled,
      });

      const current = await getCurrentSubscription(user.id, prisma);

      expect(current).toBeNull();
    });

    it('should return most recent active subscription', async () => {
      const user = await createTestUser(prisma);
      const old = await createTestSubscription(prisma, user.id, {
        tier: SubscriptionTier.free,
        status: SubscriptionStatus.active,
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const recent = await createTestSubscription(prisma, user.id, {
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
      });

      const current = await getCurrentSubscription(user.id, prisma);

      expect(current?.id).toBe(recent.id);
      expect(current?.tier).toBe(SubscriptionTier.pro);
    });
  });

  // ===========================================================================
  // List Subscription Plans
  // ===========================================================================

  describe('listSubscriptionPlans', () => {
    it('should return all subscription plans', () => {
      const plans = listSubscriptionPlans();

      expect(plans).toHaveLength(3);
      expect(plans.map(p => p.id)).toContain('free');
      expect(plans.map(p => p.id)).toContain('pro');
      expect(plans.map(p => p.id)).toContain('enterprise');
    });

    it('should include plan details', () => {
      const plans = listSubscriptionPlans();
      const proPlan = plans.find(p => p.id === 'pro');

      expect(proPlan).toBeDefined();
      expect(proPlan?.name).toBe('Pro');
      expect(proPlan?.credits_per_month).toBe(100000);
      expect(proPlan?.price_cents).toBe(2999);
      expect(proPlan?.billing_intervals).toContain('monthly');
      expect(proPlan?.billing_intervals).toContain('yearly');
      expect(proPlan?.features).toBeDefined();
      expect(proPlan?.yearly_discount_percent).toBe(20);
    });

    it('should include free plan with 0 cost', () => {
      const plans = listSubscriptionPlans();
      const freePlan = plans.find(p => p.id === 'free');

      expect(freePlan).toBeDefined();
      expect(freePlan?.price_cents).toBe(0);
      expect(freePlan?.credits_per_month).toBe(5000);
    });
  });

  // ===========================================================================
  // Create Subscription
  // ===========================================================================

  describe('createSubscription', () => {
    it('should create free subscription without Stripe', async () => {
      const user = await createTestUser(prisma);

      const subscription = await createSubscription(
        user.id,
        'free',
        'monthly',
        undefined,
        prisma
      );

      expect(subscription).toBeDefined();
      expect(subscription.tier).toBe(SubscriptionTier.free);
      expect(subscription.status).toBe(SubscriptionStatus.active);
      expect(subscription.creditsPerMonth).toBe(5000);
      expect(subscription.priceCents).toBe(0);
      expect(subscription.stripeSubscriptionId).toBeNull();
      expect(subscription.stripeCustomerId).toBeNull();
    });

    it('should create pro subscription with Stripe', async () => {
      const user = await createTestUser(prisma, {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      const subscription = await createSubscription(
        user.id,
        'pro',
        'monthly',
        'pm_test_123',
        prisma
      );

      expect(subscription).toBeDefined();
      expect(subscription.tier).toBe(SubscriptionTier.pro);
      expect(subscription.status).toBe(SubscriptionStatus.active);
      expect(subscription.creditsPerMonth).toBe(100000);
      expect(subscription.priceCents).toBe(2999);
      expect(subscription.stripeSubscriptionId).toBeTruthy();
      expect(subscription.stripeCustomerId).toBeTruthy();
    });

    it('should throw error if user already has active subscription', async () => {
      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
      });

      await expect(
        createSubscription(user.id, 'pro', 'monthly', 'pm_test_123', prisma)
      ).rejects.toThrow('User already has an active subscription');
    });

    it('should throw error if user not found', async () => {
      await expect(
        createSubscription('non-existent-id', 'pro', 'monthly', 'pm_test_123', prisma)
      ).rejects.toThrow('User not found');
    });

    it('should require payment method for paid plans', async () => {
      const user = await createTestUser(prisma);

      await expect(
        createSubscription(user.id, 'pro', 'monthly', undefined, prisma)
      ).rejects.toThrow('Payment method is required for paid plans');
    });

    it('should create subscription with yearly billing', async () => {
      const user = await createTestUser(prisma, {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      const subscription = await createSubscription(
        user.id,
        'pro',
        'yearly',
        'pm_test_123',
        prisma
      );

      expect(subscription.billingInterval).toBe('yearly');
      // Yearly Pro = 2999 * 12 * 0.8 = 28,790 cents
      expect(subscription.priceCents).toBe(28790);
    });
  });

  // ===========================================================================
  // Update Subscription
  // ===========================================================================

  describe('updateSubscription', () => {
    it('should update subscription to new plan', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id, {
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
        stripeSubscriptionId: 'sub_test_123',
      });

      const updated = await updateSubscription(
        user.id,
        'enterprise',
        'monthly',
        prisma
      );

      expect(updated).toBeDefined();
      expect(updated.tier).toBe(SubscriptionTier.enterprise);
      expect(updated.creditsPerMonth).toBe(1000000);
      expect(updated.priceCents).toBe(19900);
    });

    it('should update billing interval', async () => {
      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        tier: SubscriptionTier.pro,
        billingInterval: 'monthly',
        stripeSubscriptionId: 'sub_test_123',
      });

      const updated = await updateSubscription(
        user.id,
        'pro',
        'yearly',
        prisma
      );

      expect(updated.billingInterval).toBe('yearly');
      expect(updated.priceCents).toBe(28790); // Yearly with discount
    });

    it('should throw error if no active subscription found', async () => {
      const user = await createTestUser(prisma);

      await expect(
        updateSubscription(user.id, 'pro', 'monthly', prisma)
      ).rejects.toThrow('No active subscription found');
    });

    it('should throw error for free subscription without payment method', async () => {
      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        tier: SubscriptionTier.free,
        stripeSubscriptionId: null,
      });

      await expect(
        updateSubscription(user.id, 'pro', 'monthly', prisma)
      ).rejects.toThrow('Cannot update free subscription without payment method');
    });
  });

  // ===========================================================================
  // Cancel Subscription
  // ===========================================================================

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
        stripeSubscriptionId: 'sub_test_123',
      });

      const cancelled = await cancelSubscription(
        user.id,
        true,
        'User requested cancellation',
        prisma
      );

      expect(cancelled.status).toBe(SubscriptionStatus.active);
      expect(cancelled.cancelledAt).toBeTruthy();
      expect(cancelled.cancel_at_period_end).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
        stripeSubscriptionId: 'sub_test_123',
      });

      const cancelled = await cancelSubscription(
        user.id,
        false,
        undefined,
        prisma
      );

      expect(cancelled.status).toBe(SubscriptionStatus.cancelled);
      expect(cancelled.cancelledAt).toBeTruthy();
      expect(cancelled.cancel_at_period_end).toBe(false);
    });

    it('should throw error if no active subscription found', async () => {
      const user = await createTestUser(prisma);

      await expect(
        cancelSubscription(user.id, true, undefined, prisma)
      ).rejects.toThrow('No active subscription found');
    });

    it('should cancel subscription without Stripe', async () => {
      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
        stripeSubscriptionId: null,
      });

      const cancelled = await cancelSubscription(user.id, false, undefined, prisma);

      expect(cancelled.status).toBe(SubscriptionStatus.cancelled);
    });
  });

  // ===========================================================================
  // Sync Subscription from Stripe
  // ===========================================================================

  describe('syncSubscriptionFromStripe', () => {
    it('should sync subscription status from Stripe', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id, {
        stripeSubscriptionId: 'sub_test_123',
        status: SubscriptionStatus.suspended,
      });

      const synced = await syncSubscriptionFromStripe('sub_test_123', prisma);

      expect(synced).toBeDefined();
      expect(synced?.status).toBe(SubscriptionStatus.active);
    });

    it('should map canceled status', async () => {
      const stripeService = await import('../../../src/services/stripe.service');
      (stripeService.getStripeSubscription as jest.Mock).mockResolvedValueOnce({
        id: 'sub_test_123',
        status: 'canceled',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id, {
        stripeSubscriptionId: 'sub_test_123',
      });

      const synced = await syncSubscriptionFromStripe('sub_test_123', prisma);

      expect(synced?.status).toBe(SubscriptionStatus.cancelled);
    });

    it('should map past_due status to suspended', async () => {
      const stripeService = await import('../../../src/services/stripe.service');
      (stripeService.getStripeSubscription as jest.Mock).mockResolvedValueOnce({
        id: 'sub_test_123',
        status: 'past_due',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const user = await createTestUser(prisma);
      await createTestSubscription(prisma, user.id, {
        stripeSubscriptionId: 'sub_test_123',
      });

      const synced = await syncSubscriptionFromStripe('sub_test_123', prisma);

      expect(synced?.status).toBe(SubscriptionStatus.suspended);
    });

    it('should return null if subscription not found in database', async () => {
      const synced = await syncSubscriptionFromStripe('non_existent_sub', prisma);

      expect(synced).toBeNull();
    });
  });

  // ===========================================================================
  // Check Expired Subscriptions
  // ===========================================================================

  describe('checkExpiredSubscriptions', () => {
    it('should mark expired subscriptions', async () => {
      const user = await createTestUser(prisma);
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const subscription = await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
        currentPeriodEnd: pastDate,
      });

      const count = await checkExpiredSubscriptions(prisma);

      expect(count).toBe(1);

      const updated = await prisma.subscription.findUnique({
        where: { id: subscription.id },
      });
      expect(updated?.status).toBe(SubscriptionStatus.expired);
    });

    it('should not mark future subscriptions', async () => {
      const user = await createTestUser(prisma);
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
        currentPeriodEnd: futureDate,
      });

      const count = await checkExpiredSubscriptions(prisma);

      expect(count).toBe(0);
    });

    it('should handle multiple expired subscriptions', async () => {
      const user1 = await createTestUser(prisma);
      const user2 = await createTestUser(prisma);
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      await createTestSubscription(prisma, user1.id, {
        status: SubscriptionStatus.active,
        currentPeriodEnd: pastDate,
      });

      await createTestSubscription(prisma, user2.id, {
        status: SubscriptionStatus.active,
        currentPeriodEnd: pastDate,
      });

      const count = await checkExpiredSubscriptions(prisma);

      expect(count).toBe(2);
    });

    it('should return 0 when no expired subscriptions exist', async () => {
      const count = await checkExpiredSubscriptions(prisma);

      expect(count).toBe(0);
    });
  });
});
