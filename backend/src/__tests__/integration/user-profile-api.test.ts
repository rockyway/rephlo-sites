/**
 * Integration Tests: Enhanced User Profile API Endpoint
 *
 * Tests the /api/user/profile endpoint that returns complete user profile
 * including subscription tier, status, preferences, and account timestamps.
 *
 * Reference: docs/plan/100-dedicated-api-credits-user-endpoints.md
 * Implementation: docs/plan/101-dedicated-api-implementation-plan.md (Phase 3)
 */

import 'reflect-metadata';
import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../app';
import { container } from '../../container';
import { PrismaClient } from '@prisma/client';

describe('GET /api/user/profile', () => {
  let app: Application;
  let prisma: PrismaClient;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = container.resolve<PrismaClient>('PrismaClient');

    // Create test user with complete profile
    const testUser = await prisma.users.create({
      data: {
        id: 'test-user-profile-api',
        email: 'profile-api-test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        lastLoginAt: new Date('2025-11-06T08:00:00Z'),
      },
    });
    testUserId = testUser.id;

    // Create subscription for test user
    await prisma.subscriptions.create({
      data: {
        id: 'test-subscription-profile',
        userId: testUserId,
        tier: 'pro',
        status: 'active',
        creditsPerMonth: 10000,
        priceCents: 1999,
        billingInterval: 'monthly',
        currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
        currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
        stripePriceId: 'price_test_123',
      },
    });

    // Create user preferences
    await prisma.userPreference.create({
      data: {
        userId: testUserId,
        defaultModelId: 'gpt-5',
        emailNotifications: true,
        usageAlerts: true,
      },
    });

    // Mock auth token
    authToken = 'Bearer mock-token-for-testing';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.userPreference.deleteMany({ where: { userId: testUserId } });
    await prisma.subscriptions.deleteMany({ where: { userId: testUserId } });
    await prisma.users.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Success Cases', () => {
    it('should return user profile with correct structure', async () => {
      // Mock authentication middleware
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: testUserId };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('displayName');
      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('preferences');
      expect(response.body).toHaveProperty('accountCreatedAt');
      expect(response.body).toHaveProperty('lastLoginAt');
    });

    it('should return correct user information', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.email).toBe('profile-api-test@example.com');
      expect(response.body.displayName).toBe('John Doe');
    });

    it('should return correct subscription information', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toHaveProperty('tier');
      expect(response.body.subscription).toHaveProperty('status');
      expect(response.body.subscription).toHaveProperty('currentPeriodStart');
      expect(response.body.subscription).toHaveProperty('currentPeriodEnd');
      expect(response.body.subscription).toHaveProperty('cancelAtPeriodEnd');

      expect(response.body.subscription.tier).toBe('pro');
      expect(response.body.subscription.status).toBe('active');
      expect(response.body.subscription.cancelAtPeriodEnd).toBe(false);
    });

    it('should return correct preferences', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.preferences).toHaveProperty('defaultModel');
      expect(response.body.preferences).toHaveProperty('emailNotifications');
      expect(response.body.preferences).toHaveProperty('usageAlerts');

      expect(response.body.preferences.defaultModel).toBe('gpt-5');
      expect(response.body.preferences.emailNotifications).toBe(true);
      expect(response.body.preferences.usageAlerts).toBe(true);
    });

    it('should return ISO 8601 formatted dates', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.subscription.currentPeriodStart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(response.body.subscription.currentPeriodEnd).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(response.body.accountCreatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(response.body.lastLoginAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should provide displayName fallback when no firstName/lastName', async () => {
      // Create user without names
      const userNoNames = await prisma.users.create({
        data: {
          id: 'user-no-names',
          email: 'nonames@example.com',
          passwordHash: 'hashed_password',
        },
      });

      await prisma.subscriptions.create({
        data: {
          id: 'sub-no-names',
          userId: userNoNames.id,
          tier: 'free',
          status: 'active',
          creditsPerMonth: 2000,
          priceCents: 0,
          billingInterval: 'monthly',
          currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
          currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
          stripePriceId: 'price_free',
        },
      });

      await prisma.userPreference.create({
        data: {
          userId: userNoNames.id,
        },
      });

      // Mock auth for this user
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: userNoNames.id };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.displayName).toBe('nonames'); // Fallback to email username

      // Cleanup
      await prisma.userPreference.deleteMany({ where: { userId: userNoNames.id } });
      await prisma.subscriptions.deleteMany({ where: { userId: userNoNames.id } });
      await prisma.users.delete({ where: { id: userNoNames.id } });
    });
  });

  describe('Error Cases', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('unauthorized');
    });

    it('should return 403 without required scope', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token-without-scope');

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      // Mock auth for non-existent user
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: 'non-existent-user-id' };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('not_found');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after 30 requests', async () => {
      // Make 31 requests rapidly to trigger rate limit
      const requests = Array(31).fill(null).map(() =>
        request(app)
          .get('/api/user/profile')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error.code).toBe('rate_limit_exceeded');
      }
    }, 30000); // Extended timeout
  });

  describe('Edge Cases', () => {
    it('should handle user with default subscription', async () => {
      // Create user with free tier
      const userFreeTier = await prisma.users.create({
        data: {
          id: 'user-free-tier',
          email: 'freetier@example.com',
          passwordHash: 'hashed_password',
        },
      });

      await prisma.subscriptions.create({
        data: {
          id: 'sub-free-tier',
          userId: userFreeTier.id,
          tier: 'free',
          status: 'active',
          creditsPerMonth: 2000,
          priceCents: 0,
          billingInterval: 'monthly',
          currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
          currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
          stripePriceId: 'price_free',
        },
      });

      await prisma.userPreference.create({
        data: {
          userId: userFreeTier.id,
        },
      });

      // Mock auth
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: userFreeTier.id };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.subscription.tier).toBe('free');
      expect(response.body.subscription.status).toBe('active');

      // Cleanup
      await prisma.userPreference.deleteMany({ where: { userId: userFreeTier.id } });
      await prisma.subscriptions.deleteMany({ where: { userId: userFreeTier.id } });
      await prisma.users.delete({ where: { id: userFreeTier.id } });
    });

    it('should handle null lastLoginAt', async () => {
      // Create user with no lastLoginAt
      const userNoLogin = await prisma.users.create({
        data: {
          id: 'user-no-login',
          email: 'nologin@example.com',
          passwordHash: 'hashed_password',
          lastLoginAt: null,
        },
      });

      await prisma.subscriptions.create({
        data: {
          id: 'sub-no-login',
          userId: userNoLogin.id,
          tier: 'free',
          status: 'active',
          creditsPerMonth: 2000,
          priceCents: 0,
          billingInterval: 'monthly',
          currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
          currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
          stripePriceId: 'price_free',
        },
      });

      await prisma.userPreference.create({
        data: {
          userId: userNoLogin.id,
        },
      });

      // Mock auth
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: userNoLogin.id };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.lastLoginAt).toBeNull();

      // Cleanup
      await prisma.userPreference.deleteMany({ where: { userId: userNoLogin.id } });
      await prisma.subscriptions.deleteMany({ where: { userId: userNoLogin.id } });
      await prisma.users.delete({ where: { id: userNoLogin.id } });
    });
  });
});
