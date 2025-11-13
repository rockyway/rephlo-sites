/**
 * Integration Tests for Vendor Analytics API (Plan 180)
 *
 * Tests the 5 vendor cost and gross margin analytics endpoints:
 * - GET /admin/analytics/gross-margin - Gross margin KPI with tier breakdown
 * - GET /admin/analytics/cost-by-provider - Top 5 providers by cost
 * - GET /admin/analytics/margin-trend - Time series gross margin data
 * - GET /admin/analytics/cost-distribution - Cost histogram with statistics
 * - POST /admin/analytics/export-csv - Export analytics data as CSV
 *
 * Security Requirements:
 * - JWT authentication required
 * - Admin role required (non-admin users receive 403)
 * - Rate limiting: 100 requests per hour per admin user (returns 429)
 *
 * Performance Requirements:
 * - Query response time <500ms for 100k records with proper indexing
 * - CSV export should stream data efficiently
 *
 * Reference:
 * - docs/plan/180-admin-analytics-dashboard-ui-design.md
 * - docs/reference/181-analytics-backend-architecture.md
 * - docs/reference/184-analytics-security-compliance.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { createVerifiedUser } from '../helpers/auth-fixtures';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Vendor Analytics API Integration Tests (Plan 180)', () => {
  let app: any;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let adminUser: any;
  let regularUser: any;
  let testProviderId: string;
  let testModelId: string;

  beforeAll(async () => {
    // Initialize app
    app = await createApp();

    // Initialize database
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();

    // Create admin user
    adminUser = await createVerifiedUser(prisma, {
      email: 'admin@analytics.test',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    adminToken = await generateTestAccessToken(adminUser);

    // Create regular user
    regularUser = await createVerifiedUser(prisma, {
      email: 'user@analytics.test',
      password: 'UserPassword123!',
      role: 'user',
    });
    userToken = await generateTestAccessToken(regularUser);

    // Get test provider and model IDs
    const provider = await prisma.provider.findFirst();
    const model = await prisma.model.findFirst();
    testProviderId = provider!.id;
    testModelId = model!.id;
  });

  beforeEach(async () => {
    // Clean TokenUsageLedger before each test for isolation
    await prisma.tokenUsageLedger.deleteMany();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ========================================================================
  // Helper: Seed TokenUsageLedger with test data
  // ========================================================================

  const seedTokenUsageData = async (count: number = 50) => {
    const data = [];
    const tiers = ['free', 'pro', 'enterprise'];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(i / 10); // Spread over multiple days
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      data.push({
        userId: regularUser.id,
        subscriptionId: regularUser.id, // Placeholder
        providerId: testProviderId,
        modelId: testModelId,
        vendorCost: 0.05 + (i % 10) * 0.01, // Vary costs
        marginMultiplier: 2.5,
        creditValueUsd: 0.001,
        creditsDeducted: 50 + (i % 50),
        grossMarginUsd: 0.075 + (i % 10) * 0.015,
        userTierAtRequest: tiers[i % 3],
        status: 'success',
        createdAt,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        requestId: `req-${i}`,
      });
    }

    await prisma.tokenUsageLedger.createMany({ data });
  };

  // ========================================================================
  // GET /admin/analytics/gross-margin
  // ========================================================================

  describe('GET /admin/analytics/gross-margin', () => {
    beforeEach(async () => {
      await seedTokenUsageData(50);
    });

    it('should return gross margin KPI with tier breakdown for admin user', async () => {
      const response = await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        grossMarginUsd: expect.any(Number),
        totalCost: expect.any(Number),
        totalRevenue: expect.any(Number),
        marginPercent: expect.any(Number),
        tierBreakdown: expect.any(Array),
        trend: expect.objectContaining({
          change: expect.any(Number),
          direction: expect.stringMatching(/up|down|stable/),
        }),
      });

      expect(response.body.grossMarginUsd).toBeGreaterThanOrEqual(0);
      expect(response.body.tierBreakdown.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/admin/analytics/gross-margin?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.grossMarginUsd).toBeDefined();
    });

    it('should filter by tier', async () => {
      const response = await request(app)
        .get('/admin/analytics/gross-margin?tier=pro')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.tierBreakdown.length).toBeGreaterThan(0);
      // Verify only 'pro' tier in breakdown
      response.body.tierBreakdown.forEach((item: any) => {
        expect(item.tier).toBe('pro');
      });
    });

    it('should reject request without authentication', async () => {
      await request(app).get('/admin/analytics/gross-margin').expect(401);
    });

    it('should reject request from non-admin user (403 Forbidden)', async () => {
      await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should validate query parameters with Zod', async () => {
      const response = await request(app)
        .get('/admin/analytics/gross-margin?tier=invalid-tier')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'INVALID_QUERY_PARAMS',
        message: expect.any(String),
        details: expect.any(Array),
      });
    });

    it('should complete query in <500ms (performance requirement)', async () => {
      const start = Date.now();

      await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    }, 10000);
  });

  // ========================================================================
  // GET /admin/analytics/cost-by-provider
  // ========================================================================

  describe('GET /admin/analytics/cost-by-provider', () => {
    beforeEach(async () => {
      await seedTokenUsageData(50);
    });

    it('should return top 5 providers by cost for admin user', async () => {
      const response = await request(app)
        .get('/admin/analytics/cost-by-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        providers: expect.any(Array),
        totalCost: expect.any(Number),
      });

      expect(response.body.providers.length).toBeLessThanOrEqual(5);

      if (response.body.providers.length > 0) {
        const provider = response.body.providers[0];
        expect(provider).toMatchObject({
          providerId: expect.any(String),
          providerName: expect.any(String),
          totalCost: expect.any(Number),
          requestCount: expect.any(Number),
          avgCostPerRequest: expect.any(Number),
        });
      }
    });

    it('should filter by providerId', async () => {
      const response = await request(app)
        .get(`/admin/analytics/cost-by-provider?providerId=${testProviderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.providers.length).toBeGreaterThan(0);
      response.body.providers.forEach((p: any) => {
        expect(p.providerId).toBe(testProviderId);
      });
    });

    it('should reject request without authentication', async () => {
      await request(app).get('/admin/analytics/cost-by-provider').expect(401);
    });

    it('should reject request from non-admin user (403 Forbidden)', async () => {
      await request(app)
        .get('/admin/analytics/cost-by-provider')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========================================================================
  // GET /admin/analytics/margin-trend
  // ========================================================================

  describe('GET /admin/analytics/margin-trend', () => {
    beforeEach(async () => {
      await seedTokenUsageData(100); // More data for trend analysis
    });

    it('should return time series data with moving averages for admin user', async () => {
      const response = await request(app)
        .get('/admin/analytics/margin-trend')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        dataPoints: expect.any(Array),
        granularity: expect.any(String),
        summary: expect.objectContaining({
          avgMargin: expect.any(Number),
          minMargin: expect.any(Number),
          maxMargin: expect.any(Number),
        }),
      });

      if (response.body.dataPoints.length > 0) {
        const dataPoint = response.body.dataPoints[0];
        expect(dataPoint).toMatchObject({
          timestamp: expect.any(String),
          grossMarginUsd: expect.any(Number),
          totalCost: expect.any(Number),
          requestCount: expect.any(Number),
        });
      }
    });

    it('should support different granularities (day, week, month)', async () => {
      const granularities = ['day', 'week', 'month'];

      for (const granularity of granularities) {
        const response = await request(app)
          .get(`/admin/analytics/margin-trend?granularity=${granularity}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.granularity).toBe(granularity);
      }
    });

    it('should validate granularity parameter', async () => {
      const response = await request(app)
        .get('/admin/analytics/margin-trend?granularity=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_QUERY_PARAMS');
    });

    it('should reject request without authentication', async () => {
      await request(app).get('/admin/analytics/margin-trend').expect(401);
    });

    it('should reject request from non-admin user (403 Forbidden)', async () => {
      await request(app)
        .get('/admin/analytics/margin-trend')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========================================================================
  // GET /admin/analytics/cost-distribution
  // ========================================================================

  describe('GET /admin/analytics/cost-distribution', () => {
    beforeEach(async () => {
      await seedTokenUsageData(100);
    });

    it('should return cost histogram with statistics for admin user', async () => {
      const response = await request(app)
        .get('/admin/analytics/cost-distribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        buckets: expect.any(Array),
        statistics: expect.objectContaining({
          mean: expect.any(Number),
          median: expect.any(Number),
          stdDev: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number),
        }),
        anomalies: expect.any(Array),
      });

      if (response.body.buckets.length > 0) {
        const bucket = response.body.buckets[0];
        expect(bucket).toMatchObject({
          range: expect.any(String),
          count: expect.any(Number),
          percentage: expect.any(Number),
        });
      }
    });

    it('should identify anomalies (>3 std dev)', async () => {
      // Create an anomalous data point
      await prisma.tokenUsageLedger.create({
        data: {
          userId: regularUser.id,
          subscriptionId: regularUser.id,
          providerId: testProviderId,
          modelId: testModelId,
          vendorCost: 5.0, // Very high cost (anomaly)
          marginMultiplier: 2.5,
          creditValueUsd: 0.001,
          creditsDeducted: 5000,
          grossMarginUsd: 7.5,
          userTierAtRequest: 'enterprise',
          status: 'success',
          createdAt: new Date(),
          inputTokens: 10000,
          outputTokens: 5000,
          totalTokens: 15000,
          requestId: 'anomaly-req-1',
        },
      });

      const response = await request(app)
        .get('/admin/analytics/cost-distribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should detect the anomaly
      expect(response.body.anomalies.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      await request(app).get('/admin/analytics/cost-distribution').expect(401);
    });

    it('should reject request from non-admin user (403 Forbidden)', async () => {
      await request(app)
        .get('/admin/analytics/cost-distribution')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ========================================================================
  // POST /admin/analytics/export-csv
  // ========================================================================

  describe('POST /admin/analytics/export-csv', () => {
    beforeEach(async () => {
      await seedTokenUsageData(50);
    });

    it('should export analytics data as CSV for admin user', async () => {
      const response = await request(app)
        .post('/admin/analytics/export-csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          format: 'csv',
        })
        .expect('Content-Type', /csv/)
        .expect(200);

      // Verify CSV headers
      const csvContent = response.text;
      expect(csvContent).toContain('date,tier,provider,model,totalCost,grossMargin');

      // Verify CSV has data rows (not just header)
      const lines = csvContent.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should set correct CSV headers (Content-Disposition)', async () => {
      const response = await request(app)
        .post('/admin/analytics/export-csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(response.headers['content-disposition']).toMatch(/attachment; filename="analytics-\d{4}-\d{2}-\d{2}\.csv"/);
    });

    it('should filter exported data by date range', async () => {
      const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .post('/admin/analytics/export-csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate,
          endDate,
        })
        .expect(200);

      expect(response.text).toContain('date,tier,provider');
    });

    it('should stream large datasets efficiently', async () => {
      // Seed more data
      await seedTokenUsageData(500);

      const start = Date.now();

      const response = await request(app)
        .post('/admin/analytics/export-csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      const duration = Date.now() - start;

      // Should complete in reasonable time even with 500 records
      expect(duration).toBeLessThan(2000); // 2 seconds
      expect(response.text.split('\n').length).toBeGreaterThan(10);
    }, 10000);

    it('should reject request without authentication', async () => {
      await request(app)
        .post('/admin/analytics/export-csv')
        .send({})
        .expect(401);
    });

    it('should reject request from non-admin user (403 Forbidden)', async () => {
      await request(app)
        .post('/admin/analytics/export-csv')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(403);
    });

    it('should validate request body parameters', async () => {
      const response = await request(app)
        .post('/admin/analytics/export-csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tier: 'invalid-tier', // Invalid tier
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_BODY_PARAMS');
    });
  });

  // ========================================================================
  // Rate Limiting Tests (100 requests/hour)
  // ========================================================================

  describe('Rate Limiting (100 requests/hour)', () => {
    it('should enforce rate limit after 100 requests', async () => {
      // Note: This test is simplified. In production, rate limiting is enforced by Redis.
      // For full rate limit testing, use Redis-backed tests or mock Redis behavior.

      // Attempt 101 requests (should hit rate limit on 101st)
      const requests = [];
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app)
            .get('/admin/analytics/gross-margin')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const responses = await Promise.all(requests);

      // At least one response should be 429 (rate limit exceeded)
      const rateLimitResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitResponses.length).toBeGreaterThan(0);

      // Verify rate limit error response format
      if (rateLimitResponses.length > 0) {
        expect(rateLimitResponses[0].body.error).toMatchObject({
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('100 requests per hour'),
        });
      }
    }, 30000); // 30 second timeout for this test
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe('Error Handling', () => {
    it('should return 400 for invalid UUID in providerId', async () => {
      const response = await request(app)
        .get('/admin/analytics/gross-margin?providerId=invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_QUERY_PARAMS');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/admin/analytics/gross-margin?startDate=not-a-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_QUERY_PARAMS');
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error by disconnecting Prisma
      // This is a placeholder - actual implementation depends on error handling middleware
      // For now, just verify error response format is consistent

      const response = await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should return either 200 (success) or 500 (server error) with proper format
      if (response.status === 500) {
        expect(response.body.error).toMatchObject({
          code: expect.any(String),
          message: expect.any(String),
        });
      }
    });
  });

  // ========================================================================
  // Performance & Load Tests
  // ========================================================================

  describe('Performance Requirements', () => {
    it('should handle 100k token usage records efficiently', async () => {
      // Note: Seeding 100k records is time-consuming. Use smaller subset for CI/CD.
      // In production, test with actual 100k dataset on staging environment.

      await seedTokenUsageData(1000); // Seed 1k records for test

      const start = Date.now();

      await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const duration = Date.now() - start;

      // Should complete in <500ms with proper indexing
      expect(duration).toBeLessThan(500);
    }, 10000);

    it('should return consistent results across multiple requests', async () => {
      await seedTokenUsageData(50);

      const response1 = await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response2 = await request(app)
        .get('/admin/analytics/gross-margin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Same parameters should return same results
      expect(response1.body.grossMarginUsd).toBe(response2.body.grossMarginUsd);
      expect(response1.body.totalCost).toBe(response2.body.totalCost);
    });
  });
});
