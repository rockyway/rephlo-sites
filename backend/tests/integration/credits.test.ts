import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import type { Application } from 'express';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import {
  createTestUser,
  createTestSubscription,
  createTestCredits,
  createTestUsageHistory,
} from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Credits & Usage API Integration Tests', () => {
  let prisma: PrismaClient;
  let app: Application;
  let authToken: string;
  let userId: string;
  let creditId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();

    const { createApp } = await import('../../src/app');
    app = await createApp();

    const user = await createTestUser(prisma);
    userId = user.id;
    authToken = await generateTestAccessToken(user);

    // Create subscription and credits
    const subscription = await createTestSubscription(prisma, userId);
    const credits = await createTestCredits(prisma, userId, subscription.id, {
      totalCredits: 100000,
      usedCredits: 10000,
    });
    creditId = credits.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // ===========================================================================
  // GET /v1/credits/me
  // ===========================================================================

  describe('GET /v1/credits/me', () => {
    it('should return current credit balance', async () => {
      const response = await request(app)
        .get('/v1/credits/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCredits: 100000,
        usedCredits: 10000,
        remainingCredits: 90000,
        billingPeriodStart: expect.any(String),
        billingPeriodEnd: expect.any(String),
      });
    });

    it('should return 404 for user without credits', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      await request(app)
        .get('/v1/credits/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/credits/me')
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /v1/usage
  // ===========================================================================

  describe('GET /v1/usage', () => {
    beforeAll(async () => {
      // Create test usage history
      for (let i = 0; i < 10; i++) {
        await createTestUsageHistory(prisma, userId, creditId, {
          modelId: i % 2 === 0 ? 'gpt-5' : 'claude-3.5-sonnet',
          operation: 'chat',
          creditsUsed: 5 * (i + 1),
          totalTokens: 100 * (i + 1),
        });
      }
    });

    it('should return usage history with pagination', async () => {
      const response = await request(app)
        .get('/v1/usage?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage).toHaveLength(5);
      expect(response.body.pagination).toMatchObject({
        limit: 5,
        offset: 0,
        total: 10,
        has_more: true,
      });
      expect(response.body.summary).toMatchObject({
        total_requests: 10,
        total_credits_used: expect.any(Number),
      });
    });

    it('should filter by model_id', async () => {
      const response = await request(app)
        .get('/v1/usage?model_id=gpt-5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage.length).toBe(5);
      response.body.usage.forEach((item: any) => {
        expect(item.modelId).toBe('gpt-5');
      });
    });

    it('should filter by operation', async () => {
      const response = await request(app)
        .get('/v1/usage?operation=chat')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.usage.forEach((item: any) => {
        expect(item.operation).toBe('chat');
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage).toBeDefined();
    });

    it('should return empty result for user with no usage', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      const response = await request(app)
        .get('/v1/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.usage).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should validate limit parameter', async () => {
      await request(app)
        .get('/v1/usage?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should validate offset parameter', async () => {
      await request(app)
        .get('/v1/usage?offset=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/usage')
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /v1/usage/stats
  // ===========================================================================

  describe('GET /v1/usage/stats', () => {
    it('should return usage stats grouped by day', async () => {
      const response = await request(app)
        .get('/v1/usage/stats?group_by=day')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      expect(response.body.total).toMatchObject({
        credits_used: expect.any(Number),
        requests_count: expect.any(Number),
        tokens_total: expect.any(Number),
        average_duration_ms: expect.any(Number),
      });
    });

    it('should return usage stats grouped by hour', async () => {
      const response = await request(app)
        .get('/v1/usage/stats?group_by=hour')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      response.body.stats.forEach((stat: any) => {
        expect(stat.hour).toBeDefined();
        expect(stat.credits_used).toBeDefined();
      });
    });

    it('should return usage stats grouped by model', async () => {
      const response = await request(app)
        .get('/v1/usage/stats?group_by=model')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      response.body.stats.forEach((stat: any) => {
        expect(stat.model_id).toBeDefined();
        expect(stat.credits_used).toBeDefined();
      });

      // Should have 2 models (gpt-5 and claude-3.5-sonnet)
      expect(response.body.stats.length).toBe(2);
    });

    it('should filter stats by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
    });

    it('should validate group_by parameter', async () => {
      await request(app)
        .get('/v1/usage/stats?group_by=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/usage/stats?group_by=day')
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /v1/rate-limit
  // ===========================================================================

  describe('GET /v1/rate-limit', () => {
    it('should return rate limit information', async () => {
      const response = await request(app)
        .get('/v1/rate-limit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        limit: expect.any(Number),
        remaining: expect.any(Number),
        reset: expect.any(Number),
      });
    });

    it('should reflect subscription tier limits', async () => {
      // Free tier user
      const freeUser = await createTestUser(prisma);
      const freeToken = await generateTestAccessToken(freeUser);
      await createTestSubscription(prisma, freeUser.id, {
        tier: 'free',
      });

      const freeResponse = await request(app)
        .get('/v1/rate-limit')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      // Free tier should have 10 RPM
      expect(freeResponse.body.limit).toBe(10);

      // Pro tier user
      const proUser = await createTestUser(prisma);
      const proToken = await generateTestAccessToken(proUser);
      await createTestSubscription(prisma, proUser.id, {
        tier: 'pro',
      });

      const proResponse = await request(app)
        .get('/v1/rate-limit')
        .set('Authorization', `Bearer ${proToken}`)
        .expect(200);

      // Pro tier should have 60 RPM
      expect(proResponse.body.limit).toBe(60);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/rate-limit')
        .expect(401);
    });
  });

  // ===========================================================================
  // Pagination Edge Cases
  // ===========================================================================

  describe('Pagination Edge Cases', () => {
    it('should handle offset beyond total results', async () => {
      const response = await request(app)
        .get('/v1/usage?limit=10&offset=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage).toHaveLength(0);
      expect(response.body.pagination.has_more).toBe(false);
    });

    it('should handle limit of 1', async () => {
      const response = await request(app)
        .get('/v1/usage?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage).toHaveLength(1);
      expect(response.body.pagination.has_more).toBe(true);
    });

    it('should handle max limit', async () => {
      const response = await request(app)
        .get('/v1/usage?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage.length).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================================================
  // Date Range Validation
  // ===========================================================================

  describe('Date Range Validation', () => {
    it('should reject invalid start_date format', async () => {
      await request(app)
        .get('/v1/usage?start_date=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should reject invalid end_date format', async () => {
      await request(app)
        .get('/v1/usage?end_date=not-a-date')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should handle start_date after end_date', async () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      const response = await request(app)
        .get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return empty results
      expect(response.body.usage).toHaveLength(0);
    });
  });
});
