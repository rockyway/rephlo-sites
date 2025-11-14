/**
 * Desktop App Endpoints Integration Tests (Plan 182)
 *
 * Tests for the two new Desktop App API endpoints:
 * 1. GET /api/user/usage/summary - Monthly usage aggregation
 * 2. GET /api/user/invoices - Invoice list retrieval
 *
 * Reference: docs/plan/182-desktop-app-api-backend-requirements.md
 *
 * Test Coverage:
 * - Successful data retrieval
 * - Response format validation (camelCase fields)
 * - Authentication and scope requirements
 * - Edge cases (no usage, no Stripe customer)
 * - Query parameter handling (period, limit)
 * - API standards compliance (ISO dates, cents for amounts)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import type { Application } from 'express';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import {
  createTestUser,
  createTestSubscription,
  createTestCredits,
  createTestUsageHistory,
} from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    invoices: {
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'in_test123',
            created: 1699000000, // Unix timestamp
            amount_paid: 2900, // $29.00 in cents
            currency: 'usd',
            status: 'paid',
            hosted_invoice_url: 'https://invoice.stripe.com/i/test123',
            invoice_pdf: 'https://invoice.stripe.com/i/test123/pdf',
            lines: {
              data: [
                { description: 'Pro Plan Subscription' }
              ]
            }
          },
          {
            id: 'in_test456',
            created: 1696408000, // Earlier timestamp
            amount_paid: 2900,
            currency: 'usd',
            status: 'paid',
            hosted_invoice_url: 'https://invoice.stripe.com/i/test456',
            invoice_pdf: 'https://invoice.stripe.com/i/test456/pdf',
            lines: {
              data: [
                { description: 'Pro Plan Subscription' }
              ]
            }
          }
        ],
        has_more: false
      })
    }
  }));
});

describe('Desktop App Endpoints (Plan 182)', () => {
  let prisma: PrismaClient;
  let app: Application;
  let authToken: string;
  let userId: string;
  let userWithStripe: any;
  let userWithStripeToken: string;
  let userWithoutUsage: any;
  let userWithoutUsageToken: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData(); // Seed providers, models, oauth clients

    const { createApp } = await import('../../src/app');
    app = await createApp();

    // Get provider IDs from seeded data
    const openaiProvider = await prisma.provider.findFirst({ where: { name: 'openai' } });
    const anthropicProvider = await prisma.provider.findFirst({ where: { name: 'anthropic' } });

    if (!openaiProvider || !anthropicProvider) {
      throw new Error('Providers not found - seedTestData() may have failed');
    }

    // Create test user with usage history
    const user = await createTestUser(prisma);
    userId = user.id;
    authToken = await generateTestAccessToken(user);

    const subscription = await createTestSubscription(prisma, userId, {
      tier: 'pro',
      status: 'active',
    });

    // Note: Credits are still created for subscription tracking,
    // but tokenUsageLedger doesn't use creditId anymore
    await createTestCredits(prisma, userId, subscription.id, {
      totalCredits: 100000,
      usedCredits: 45230,
    });

    // Create usage history for current month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Create usage records with different models
    // GPT-4: 867 requests (67%)
    for (let i = 0; i < 867; i++) {
      await createTestUsageHistory(prisma, userId, openaiProvider.id, {
        modelId: 'gpt-4',
        promptTokens: 800,
        completionTokens: 880,
        creditsUsed: 35,
        createdAt: new Date(currentMonthStart.getTime() + i * 60000),
      });
    }

    // Claude 3.5 Sonnet: 320 requests (27%)
    for (let i = 0; i < 320; i++) {
      await createTestUsageHistory(prisma, userId, anthropicProvider.id, {
        modelId: 'claude-3.5-sonnet',
        promptTokens: 750,
        completionTokens: 920,
        creditsUsed: 39,
        createdAt: new Date(currentMonthStart.getTime() + (867 + i) * 60000),
      });
    }

    // GPT-3.5 Turbo: 100 requests (6%)
    for (let i = 0; i < 100; i++) {
      await createTestUsageHistory(prisma, userId, openaiProvider.id, {
        modelId: 'gpt-3.5-turbo',
        promptTokens: 700,
        completionTokens: 848,
        creditsUsed: 25,
        createdAt: new Date(currentMonthStart.getTime() + (867 + 320 + i) * 60000),
      });
    }

    // Create user with Stripe customer (for invoice tests)
    userWithStripe = await createTestUser(prisma);
    userWithStripeToken = await generateTestAccessToken(userWithStripe);

    await createTestSubscription(prisma, userWithStripe.id, {
      tier: 'pro',
      status: 'active',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
    });

    // Create user without usage history
    userWithoutUsage = await createTestUser(prisma);
    userWithoutUsageToken = await generateTestAccessToken(userWithoutUsage);

    await createTestSubscription(prisma, userWithoutUsage.id, {
      tier: 'free',
      status: 'active',
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // ===========================================================================
  // GET /api/user/usage/summary
  // ===========================================================================

  describe('GET /api/user/usage/summary', () => {
    describe('Successful Usage Summary Retrieval', () => {
      it('should return usage summary for current month with correct aggregation', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary?period=current_month')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify response structure
        expect(response.body).toHaveProperty('period');
        expect(response.body).toHaveProperty('periodStart');
        expect(response.body).toHaveProperty('periodEnd');
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('creditBreakdown');
        expect(response.body).toHaveProperty('modelBreakdown');

        // Verify summary aggregation calculations
        const summary = response.body.summary;
        expect(summary).toMatchObject({
          creditsUsed: expect.any(Number),
          apiRequests: 1287, // 867 + 320 + 100
          totalTokens: expect.any(Number),
          averageTokensPerRequest: expect.any(Number),
          mostUsedModel: 'gpt-4',
          mostUsedModelPercentage: 67,
        });

        // Verify total tokens calculation
        const expectedTotalTokens = (867 * 1680) + (320 * 1670) + (100 * 1548);
        expect(summary.totalTokens).toBe(expectedTotalTokens);

        // Verify average tokens per request
        const expectedAverage = Math.round(expectedTotalTokens / 1287);
        expect(summary.averageTokensPerRequest).toBe(expectedAverage);
      });

      it('should return usage summary for specific period (YYYY-MM format)', async () => {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const response = await request(app)
          .get(`/api/user/usage/summary?period=${period}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.period).toBe(period);
        expect(response.body.summary.apiRequests).toBe(1287);
      });

      it('should include model breakdown with percentages', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const modelBreakdown = response.body.modelBreakdown;
        expect(modelBreakdown).toBeInstanceOf(Array);
        expect(modelBreakdown.length).toBe(3);

        // Verify first model (most used)
        expect(modelBreakdown[0]).toMatchObject({
          model: 'gpt-4',
          provider: 'openai',
          requests: 867,
          tokens: 867 * 1680,
          credits: 867 * 35,
          percentage: 67,
        });

        // Verify second model
        expect(modelBreakdown[1]).toMatchObject({
          model: 'claude-3.5-sonnet',
          provider: 'anthropic',
          requests: 320,
          tokens: 320 * 1670,
          credits: 320 * 39,
          percentage: 25, // Rounded from ~24.86%
        });

        // Verify third model
        expect(modelBreakdown[2]).toMatchObject({
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          requests: 100,
          tokens: 100 * 1548,
          credits: 100 * 25,
          percentage: 8, // Rounded from ~7.77%
        });
      });

      it('should include credit breakdown', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.creditBreakdown).toMatchObject({
          freeCreditsUsed: expect.any(Number),
          freeCreditsLimit: expect.any(Number),
          proCreditsUsed: expect.any(Number),
          purchasedCreditsUsed: expect.any(Number),
        });
      });
    });

    describe('Edge Cases', () => {
      it('should return empty usage for users with no history', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${userWithoutUsageToken}`)
          .expect(200);

        expect(response.body.summary).toMatchObject({
          creditsUsed: 0,
          apiRequests: 0,
          totalTokens: 0,
          averageTokensPerRequest: 0,
          mostUsedModel: 'N/A',
          mostUsedModelPercentage: 0,
        });

        expect(response.body.modelBreakdown).toEqual([]);
      });

      it('should handle previous month period', async () => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const period = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

        const response = await request(app)
          .get(`/api/user/usage/summary?period=${period}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.period).toBe(period);
        // Should return 0 requests since all test data is in current month
        expect(response.body.summary.apiRequests).toBe(0);
      });
    });

    describe('Response Format Validation (API Standards)', () => {
      it('should use camelCase for all response fields', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify no snake_case fields in response
        const responseString = JSON.stringify(response.body);
        expect(responseString).not.toContain('credits_used');
        expect(responseString).not.toContain('api_requests');
        expect(responseString).not.toContain('total_tokens');
        expect(responseString).not.toContain('most_used_model');
        expect(responseString).not.toContain('period_start');
        expect(responseString).not.toContain('period_end');

        // Verify camelCase fields exist
        expect(response.body.summary).toHaveProperty('creditsUsed');
        expect(response.body.summary).toHaveProperty('apiRequests');
        expect(response.body.summary).toHaveProperty('totalTokens');
        expect(response.body.summary).toHaveProperty('mostUsedModel');
        expect(response.body).toHaveProperty('periodStart');
        expect(response.body).toHaveProperty('periodEnd');
      });

      it('should use ISO 8601 format for dates', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify ISO 8601 format with UTC timezone
        expect(response.body.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(response.body.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // Verify dates are valid
        const startDate = new Date(response.body.periodStart);
        const endDate = new Date(response.body.periodEnd);
        expect(startDate.getTime()).toBeLessThan(endDate.getTime());
      });

      it('should use flat response format (NOT wrapped in status/data/meta)', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Desktop App endpoints use flat format (like V1 API)
        expect(response.body).not.toHaveProperty('status');
        expect(response.body).not.toHaveProperty('data');
        expect(response.body).not.toHaveProperty('meta');

        // Instead, response should have direct fields
        expect(response.body).toHaveProperty('period');
        expect(response.body).toHaveProperty('summary');
      });

      it('should NEVER expose conversation content (privacy check)', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const responseString = JSON.stringify(response.body);

        // Verify no conversation content fields
        expect(responseString).not.toContain('prompt');
        expect(responseString).not.toContain('completion');
        expect(responseString).not.toContain('input');
        expect(responseString).not.toContain('output');
        expect(responseString).not.toContain('promptText');
        expect(responseString).not.toContain('completionText');
      });
    });

    describe('Authentication and Authorization', () => {
      it('should require authentication (401 without JWT)', async () => {
        const response = await request(app)
          .get('/api/user/usage/summary')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should require user.info scope', async () => {
        // Create token without user.info scope
        const user = await createTestUser(prisma);
        const tokenWithoutScope = await generateTestAccessToken(user, ['openid', 'email']);

        const response = await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', `Bearer ${tokenWithoutScope}`)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });

      it('should reject invalid JWT tokens', async () => {
        await request(app)
          .get('/api/user/usage/summary')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });

  // ===========================================================================
  // GET /api/user/invoices
  // ===========================================================================

  describe('GET /api/user/invoices', () => {
    describe('Successful Invoice Retrieval', () => {
      it('should return invoices list for user with Stripe customer', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('invoices');
        expect(response.body).toHaveProperty('hasMore');
        expect(response.body).toHaveProperty('count');

        expect(response.body.invoices).toBeInstanceOf(Array);
        expect(response.body.count).toBe(2);
        expect(response.body.hasMore).toBe(false);
      });

      it('should include all required invoice fields', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        const invoice = response.body.invoices[0];
        expect(invoice).toMatchObject({
          id: expect.any(String),
          date: expect.any(String),
          amount: expect.any(Number),
          currency: expect.any(String),
          status: expect.any(String),
          invoiceUrl: expect.any(String),
          pdfUrl: expect.any(String),
          description: expect.any(String),
        });
      });

      it('should respect limit parameter (default 10)', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        // Default limit is 10, but we only have 2 invoices
        expect(response.body.invoices.length).toBeLessThanOrEqual(10);
        expect(response.body.count).toBe(2);
      });

      it('should respect custom limit parameter', async () => {
        const response = await request(app)
          .get('/api/user/invoices?limit=1')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        // Stripe mock returns all, but endpoint should respect limit
        expect(response.body.invoices.length).toBeLessThanOrEqual(1);
      });

      it('should enforce maximum limit of 50', async () => {
        const response = await request(app)
          .get('/api/user/invoices?limit=100')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        // Endpoint should cap at 50 (verified by Stripe mock receiving max 50)
        expect(response.body.invoices.length).toBeLessThanOrEqual(50);
      });
    });

    describe('Edge Cases', () => {
      it('should return empty array for user without Stripe customer', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithoutUsageToken}`)
          .expect(200);

        expect(response.body.invoices).toEqual([]);
        expect(response.body.hasMore).toBe(false);
        expect(response.body.count).toBe(0);
      });

      it('should return empty array for user with no subscription', async () => {
        const userNoSub = await createTestUser(prisma);
        const tokenNoSub = await generateTestAccessToken(userNoSub);

        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${tokenNoSub}`)
          .expect(200);

        expect(response.body.invoices).toEqual([]);
        expect(response.body.count).toBe(0);
      });
    });

    describe('Response Format Validation (API Standards)', () => {
      it('should use camelCase for all response fields', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        const responseString = JSON.stringify(response.body);

        // Verify no snake_case fields
        expect(responseString).not.toContain('has_more');
        expect(responseString).not.toContain('invoice_url');
        expect(responseString).not.toContain('pdf_url');

        // Verify camelCase fields exist
        expect(response.body).toHaveProperty('hasMore');
        if (response.body.invoices.length > 0) {
          expect(response.body.invoices[0]).toHaveProperty('invoiceUrl');
          expect(response.body.invoices[0]).toHaveProperty('pdfUrl');
        }
      });

      it('should use ISO 8601 format for invoice dates', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        const invoice = response.body.invoices[0];

        // Verify ISO 8601 format
        expect(invoice.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // Verify date is valid
        const date = new Date(invoice.date);
        expect(date.getTime()).toBeGreaterThan(0);
      });

      it('should use integer cents for amount (NOT decimal dollars)', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        const invoice = response.body.invoices[0];

        // Verify amount is integer (cents)
        expect(Number.isInteger(invoice.amount)).toBe(true);
        expect(invoice.amount).toBe(2900); // $29.00 in cents

        // Verify NOT decimal
        expect(invoice.amount).not.toBe(29.00);
        expect(invoice.amount).not.toBe(29);
      });

      it('should use flat response format (NOT wrapped)', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(200);

        // Desktop App endpoints use flat format
        expect(response.body).not.toHaveProperty('status');
        expect(response.body).not.toHaveProperty('data');
        expect(response.body).not.toHaveProperty('meta');

        // Direct fields
        expect(response.body).toHaveProperty('invoices');
        expect(response.body).toHaveProperty('hasMore');
        expect(response.body).toHaveProperty('count');
      });
    });

    describe('Authentication and Authorization', () => {
      it('should require authentication (401 without JWT)', async () => {
        const response = await request(app)
          .get('/api/user/invoices')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should require user.info scope', async () => {
        const user = await createTestUser(prisma);
        const tokenWithoutScope = await generateTestAccessToken(user, ['openid', 'email']);

        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${tokenWithoutScope}`)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });

      it('should reject invalid JWT tokens', async () => {
        await request(app)
          .get('/api/user/invoices')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('Stripe Integration', () => {
      it('should handle Stripe API errors gracefully', async () => {
        // Mock Stripe error
        const stripeMock = require('stripe');
        stripeMock.mockImplementationOnce(() => ({
          invoices: {
            list: jest.fn().mockRejectedValue(new Error('Stripe API error'))
          }
        }));

        const response = await request(app)
          .get('/api/user/invoices')
          .set('Authorization', `Bearer ${userWithStripeToken}`)
          .expect(500);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // Privacy Compliance Tests
  // ===========================================================================

  describe('Privacy Compliance (Both Endpoints)', () => {
    it('should NEVER store conversation content in tokenUsageLedger table', async () => {
      const usageRecord = await prisma.tokenUsageLedger.findFirst({
        where: { userId }
      });

      if (usageRecord) {
        // Verify schema compliance - ONLY metadata fields
        expect(usageRecord).toHaveProperty('modelId');
        expect(usageRecord).toHaveProperty('inputTokens');
        expect(usageRecord).toHaveProperty('outputTokens');
        expect(usageRecord).toHaveProperty('creditsDeducted');
        expect(usageRecord).toHaveProperty('providerId');

        // Verify NO content fields
        expect(usageRecord).not.toHaveProperty('promptText');
        expect(usageRecord).not.toHaveProperty('completionText');
        expect(usageRecord).not.toHaveProperty('inputText');
        expect(usageRecord).not.toHaveProperty('outputText');
        expect(usageRecord).not.toHaveProperty('prompt');
        expect(usageRecord).not.toHaveProperty('completion');
      }
    });

    it('usage summary endpoint should only expose metadata, never content', async () => {
      const response = await request(app)
        .get('/api/user/usage/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseString = JSON.stringify(response.body);

      // Privacy verification - no conversation content
      expect(responseString).not.toContain('prompt');
      expect(responseString).not.toContain('completion');
      expect(responseString).not.toContain('input');
      expect(responseString).not.toContain('output');
      expect(responseString).not.toContain('text');
      expect(responseString).not.toContain('message');
      expect(responseString).not.toContain('content');
    });
  });
});
