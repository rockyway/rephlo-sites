import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import type { Application } from 'express';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import { createTestUser, createTestSubscription } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

// Mock Stripe service
jest.mock('../../src/services/stripe.service', () => ({
  ...jest.requireActual('../../src/services/stripe.service'),
  createOrGetCustomer: jest.fn().mockResolvedValue({ id: 'cus_test_123' }),
  createStripeSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test_123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }),
  updateStripeSubscription: jest.fn().mockResolvedValue({ id: 'sub_test_123' }),
  getStripeSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test_123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }),
  cancelStripeSubscription: jest.fn().mockResolvedValue({ id: 'sub_test_123' }),
}));

// Mock webhook service
jest.mock('../../src/services/webhook.service', () => ({
  queueWebhook: jest.fn().mockResolvedValue(undefined),
}));

describe('Subscriptions API Integration Tests', () => {
  let prisma: PrismaClient;
  let app: Application;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();

    const { createApp } = await import('../../src/app');
    app = await createApp(prisma);

    const user = await createTestUser(prisma);
    userId = user.id;
    authToken = await generateTestAccessToken(user);
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // ===========================================================================
  // GET /v1/subscription-plans
  // ===========================================================================

  describe('GET /v1/subscription-plans', () => {
    it('should return all subscription plans', async () => {
      const response = await request(app)
        .get('/v1/subscription-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plans).toHaveLength(3);
      expect(response.body.plans.map((p: any) => p.id)).toContain('free');
      expect(response.body.plans.map((p: any) => p.id)).toContain('pro');
      expect(response.body.plans.map((p: any) => p.id)).toContain('enterprise');
    });

    it('should include plan details', async () => {
      const response = await request(app)
        .get('/v1/subscription-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const proPlan = response.body.plans.find((p: any) => p.id === 'pro');
      expect(proPlan).toMatchObject({
        name: 'Pro',
        credits_per_month: 100000,
        price_cents: 2999,
      });
      expect(proPlan.billing_intervals).toContain('monthly');
      expect(proPlan.features).toBeDefined();
    });

    it('should not require authentication', async () => {
      await request(app)
        .get('/v1/subscription-plans')
        .expect(200);
    });
  });

  // ===========================================================================
  // GET /v1/subscriptions/me
  // ===========================================================================

  describe('GET /v1/subscriptions/me', () => {
    it('should return current subscription', async () => {
      const subscription = await createTestSubscription(prisma, userId, {
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
      });

      const response = await request(app)
        .get('/v1/subscriptions/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: subscription.id,
        tier: 'pro',
        status: 'active',
        creditsPerMonth: 100000,
      });
    });

    it('should return 404 when no subscription exists', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .get('/v1/subscriptions/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/subscriptions/me')
        .expect(401);
    });
  });

  // ===========================================================================
  // POST /v1/subscriptions
  // ===========================================================================

  describe('POST /v1/subscriptions', () => {
    it('should create free subscription', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      const response = await request(app)
        .post('/v1/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'free',
          billingInterval: 'monthly',
        })
        .expect(201);

      expect(response.body.subscription).toMatchObject({
        tier: 'free',
        status: 'active',
        creditsPerMonth: 5000,
        priceCents: 0,
      });
    });

    it('should create pro subscription with payment method', async () => {
      const newUser = await createTestUser(prisma, {
        email: 'pro@example.com',
        firstName: 'Pro',
        lastName: 'User',
      });
      const token = await generateTestAccessToken(newUser);

      const response = await request(app)
        .post('/v1/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'pro',
          billingInterval: 'monthly',
          paymentMethodId: 'pm_test_123',
        })
        .expect(201);

      expect(response.body.subscription).toMatchObject({
        tier: 'pro',
        status: 'active',
        creditsPerMonth: 100000,
      });
    });

    it('should reject duplicate subscription', async () => {
      await createTestSubscription(prisma, userId, {
        status: SubscriptionStatus.active,
      });

      await request(app)
        .post('/v1/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'pro',
          billingInterval: 'monthly',
        })
        .expect(400);
    });

    it('should require payment method for paid plans', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .post('/v1/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'pro',
          billingInterval: 'monthly',
        })
        .expect(400);
    });

    it('should validate planId', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .post('/v1/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'invalid',
          billingInterval: 'monthly',
        })
        .expect(400);
    });

    it('should validate billingInterval', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .post('/v1/subscriptions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'free',
          billingInterval: 'invalid',
        })
        .expect(400);
    });
  });

  // ===========================================================================
  // PATCH /v1/subscriptions/me
  // ===========================================================================

  describe('PATCH /v1/subscriptions/me', () => {
    it('should update subscription plan', async () => {
      await createTestSubscription(prisma, userId, {
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
        stripeSubscriptionId: 'sub_test_123',
      });

      const response = await request(app)
        .patch('/v1/subscriptions/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'enterprise',
          billingInterval: 'monthly',
        })
        .expect(200);

      expect(response.body.subscription.tier).toBe('enterprise');
      expect(response.body.subscription.creditsPerMonth).toBe(1000000);
    });

    it('should update billing interval', async () => {
      await createTestSubscription(prisma, userId, {
        tier: SubscriptionTier.pro,
        billingInterval: 'monthly',
        stripeSubscriptionId: 'sub_test_123',
      });

      const response = await request(app)
        .patch('/v1/subscriptions/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'pro',
          billingInterval: 'yearly',
        })
        .expect(200);

      expect(response.body.subscription.billingInterval).toBe('yearly');
    });

    it('should return 404 when no active subscription', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .patch('/v1/subscriptions/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          planId: 'pro',
          billingInterval: 'monthly',
        })
        .expect(404);
    });
  });

  // ===========================================================================
  // POST /v1/subscriptions/me/cancel
  // ===========================================================================

  describe('POST /v1/subscriptions/me/cancel', () => {
    it('should cancel subscription at period end', async () => {
      await createTestSubscription(prisma, userId, {
        status: SubscriptionStatus.active,
        stripeSubscriptionId: 'sub_test_123',
      });

      const response = await request(app)
        .post('/v1/subscriptions/me/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cancelAtPeriodEnd: true,
          reason: 'Testing cancellation',
        })
        .expect(200);

      expect(response.body.subscription.cancelledAt).toBeDefined();
      expect(response.body.subscription.cancel_at_period_end).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      await cleanDatabase();
      const user = await createTestUser(prisma);
      const token = await generateTestAccessToken(user);

      await createTestSubscription(prisma, user.id, {
        status: SubscriptionStatus.active,
        stripeSubscriptionId: 'sub_test_123',
      });

      const response = await request(app)
        .post('/v1/subscriptions/me/cancel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cancelAtPeriodEnd: false,
        })
        .expect(200);

      expect(response.body.subscription.status).toBe('cancelled');
    });

    it('should return 404 when no active subscription', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .post('/v1/subscriptions/me/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
