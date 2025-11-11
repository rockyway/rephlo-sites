/**
 * Integration Tests: Enhanced Credits API Endpoint
 *
 * Tests the /api/user/credits endpoint that returns detailed credit breakdown
 * including free credits (monthly allocation) and pro credits (purchased).
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

describe('GET /api/user/credits', () => {
  let app: Application;
  let prisma: PrismaClient;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = container.resolve<PrismaClient>('PrismaClient');

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-credits-api',
        email: 'credits-api-test@example.com',
        passwordHash: 'hashed_password',
      },
    });
    testUserId = testUser.id;

    // Create free credits for test user
    await prisma.credit.create({
      data: {
        id: 'free-credit-test-api',
        userId: testUserId,
        creditType: 'free',
        totalCredits: 2000,
        usedCredits: 500,
        monthlyAllocation: 2000,
        resetDayOfMonth: 1,
        billingPeriodStart: new Date('2025-11-01'),
        billingPeriodEnd: new Date('2025-12-01'),
        isCurrent: true,
      },
    });

    // Create pro credits for test user
    await prisma.credit.create({
      data: {
        id: 'pro-credit-test-api-1',
        userId: testUserId,
        creditType: 'pro',
        totalCredits: 10000,
        usedCredits: 5000,
        monthlyAllocation: 0,
        resetDayOfMonth: 0,
        billingPeriodStart: new Date('2025-01-01'),
        billingPeriodEnd: new Date('2099-12-31'),
        isCurrent: true,
      },
    });

    // Mock auth token (in real tests, this would be a valid JWT)
    authToken = 'Bearer mock-token-for-testing';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.credit.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Success Cases', () => {
    it('should return detailed credits breakdown with correct structure', async () => {
      // Mock authentication middleware for test
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: testUserId };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('freeCredits');
      expect(response.body).toHaveProperty('proCredits');
      expect(response.body).toHaveProperty('totalAvailable');
      expect(response.body).toHaveProperty('lastUpdated');
    });

    it('should return correct free credits breakdown', async () => {
      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.freeCredits).toHaveProperty('remaining');
      expect(response.body.freeCredits).toHaveProperty('monthlyAllocation');
      expect(response.body.freeCredits).toHaveProperty('used');
      expect(response.body.freeCredits).toHaveProperty('resetDate');
      expect(response.body.freeCredits).toHaveProperty('daysUntilReset');

      expect(response.body.freeCredits.remaining).toBe(1500); // 2000 - 500
      expect(response.body.freeCredits.monthlyAllocation).toBe(2000);
      expect(response.body.freeCredits.used).toBe(500);
      expect(typeof response.body.freeCredits.daysUntilReset).toBe('number');
    });

    it('should return correct pro credits breakdown', async () => {
      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.proCredits).toHaveProperty('remaining');
      expect(response.body.proCredits).toHaveProperty('purchasedTotal');
      expect(response.body.proCredits).toHaveProperty('lifetimeUsed');

      expect(response.body.proCredits.remaining).toBe(5000); // 10000 - 5000
      expect(response.body.proCredits.purchasedTotal).toBe(10000);
      expect(response.body.proCredits.lifetimeUsed).toBe(5000);
    });

    it('should calculate correct totalAvailable', async () => {
      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.totalAvailable).toBe(6500); // 1500 free + 5000 pro
    });

    it('should return ISO 8601 formatted dates', async () => {
      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.freeCredits.resetDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(response.body.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('Error Cases', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/user/credits');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error.code).toBe('unauthorized');
    });

    it('should return 403 without required scope', async () => {
      // Mock authentication without credits.read scope
      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', 'Bearer token-without-scope');

      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after 60 requests', async () => {
      // Make 61 requests rapidly to trigger rate limit
      const requests = Array(61).fill(null).map(() =>
        request(app)
          .get('/api/user/credits')
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
    }, 30000); // Extended timeout for rate limit test
  });

  describe('Edge Cases', () => {
    it('should handle user with no pro credits', async () => {
      // Create user with only free credits
      const userNoProCredits = await prisma.user.create({
        data: {
          id: 'user-no-pro-credits',
          email: 'no-pro@example.com',
          passwordHash: 'hashed_password',
        },
      });

      await prisma.credit.create({
        data: {
          id: 'free-credit-only',
          userId: userNoProCredits.id,
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 0,
          monthlyAllocation: 2000,
          resetDayOfMonth: 1,
          billingPeriodStart: new Date('2025-11-01'),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
        },
      });

      // Mock auth for this user
      jest.mock('../../middleware/auth.middleware', () => ({
        authMiddleware: (req: any, _res: any, next: any) => {
          req.user = { sub: userNoProCredits.id };
          next();
        },
        requireScope: () => (_req: any, _res: any, next: any) => next(),
      }));

      const response = await request(app)
        .get('/api/user/credits')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.proCredits.remaining).toBe(0);
      expect(response.body.proCredits.purchasedTotal).toBe(0);
      expect(response.body.proCredits.lifetimeUsed).toBe(0);
      expect(response.body.totalAvailable).toBe(2000); // Only free credits

      // Cleanup
      await prisma.credit.deleteMany({ where: { userId: userNoProCredits.id } });
      await prisma.user.delete({ where: { id: userNoProCredits.id } });
    });
  });
});
