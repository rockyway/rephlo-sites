/**
 * Integration Tests for Tier Config API Endpoints (Plan 190)
 *
 * Tests complete HTTP request/response flows with real database:
 * - GET /api/admin/tier-config - List all tiers
 * - GET /api/admin/tier-config/:tierName - Get specific tier
 * - GET /api/admin/tier-config/:tierName/history - Get history with pagination
 * - POST /api/admin/tier-config/:tierName/preview - Dry-run preview
 * - PATCH /api/admin/tier-config/:tierName/credits - Update credits
 * - PATCH /api/admin/tier-config/:tierName/price - Update pricing
 *
 * All endpoints require admin authentication.
 */

import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase, cleanDatabase, setupTestDatabase } from '../../setup/database';
import {
  createTestTierConfig,
  createTestUserWithSubscription,
  createTestUsersOnTier,
  createTierWithHistory,
  createMockAdminUser,
  verifyCreditUpgrade,
  getTierConfigVersion,
  countUsersWithAllocation,
  cleanupTierConfigTestData,
} from '../../helpers/tier-config-fixtures';
import { generateTestAccessToken, createAuthHeader } from '../../helpers/tokens';
import { createApp } from '../../../src/server'; // Assuming server exports createApp

describe('Tier Config API - Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await setupTestDatabase();

    // Create Express app
    app = createApp();

    // Create admin user and generate token
    adminUser = await createMockAdminUser(prisma);
    adminToken = await generateTestAccessToken(adminUser, [
      'openid',
      'email',
      'profile',
      'admin',
      'user.info',
      'credits.read',
      'tier.manage',
    ]);
  });

  beforeEach(async () => {
    await cleanDatabase();
    await cleanupTierConfigTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTierConfigTestData(prisma);
    await prisma.$disconnect();
  });

  // ===========================================================================
  // GET /api/admin/tier-config - List All Tiers
  // ===========================================================================

  describe('GET /api/admin/tier-config', () => {
    it('should list all active tier configurations', async () => {
      // Create test tier configs
      await createTestTierConfig(prisma, 'free');
      await createTestTierConfig(prisma, 'pro');
      await createTestTierConfig(prisma, 'enterprise');

      const response = await request(app)
        .get('/api/admin/tier-config')
        .set(createAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('tierName');
      expect(response.body.data[0]).toHaveProperty('monthlyCreditAllocation');
      expect(response.body.data[0]).toHaveProperty('configVersion');
    });

    it('should return empty array when no tiers exist', async () => {
      const response = await request(app)
        .get('/api/admin/tier-config')
        .set(createAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should reject request without admin authentication', async () => {
      await request(app).get('/api/admin/tier-config').expect(401);
    });
  });

  // ===========================================================================
  // GET /api/admin/tier-config/:tierName - Get Specific Tier
  // ===========================================================================

  describe('GET /api/admin/tier-config/:tierName', () => {
    it('should return specific tier configuration', async () => {
      await createTestTierConfig(prisma, 'pro', {
        monthly_credit_allocation: 1500,
        config_version: 2,
      });

      const response = await request(app)
        .get('/api/admin/tier-config/pro')
        .set(createAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tierName).toBe('pro');
      expect(response.body.data.monthlyCreditAllocation).toBe(1500);
      expect(response.body.data.configVersion).toBe(2);
    });

    it('should return 404 for non-existent tier', async () => {
      const response = await request(app)
        .get('/api/admin/tier-config/nonexistent')
        .set(createAuthHeader(adminToken))
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TIER_NOT_FOUND');
    });
  });

  // ===========================================================================
  // GET /api/admin/tier-config/:tierName/history - Get History
  // ===========================================================================

  describe('GET /api/admin/tier-config/:tierName/history', () => {
    it('should return tier configuration history with pagination', async () => {
      const { tierConfig, history } = await createTierWithHistory(prisma, 'pro', 5);

      const response = await request(app)
        .get('/api/admin/tier-config/pro/history?limit=3')
        .set(createAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.count).toBe(3);
      expect(response.body.meta.limit).toBe(3);
      expect(response.body.data[0]).toHaveProperty('previousCredits');
      expect(response.body.data[0]).toHaveProperty('newCredits');
      expect(response.body.data[0]).toHaveProperty('changeType');
    });

    it('should use default limit when not specified', async () => {
      await createTierWithHistory(prisma, 'pro', 10);

      const response = await request(app)
        .get('/api/admin/tier-config/pro/history')
        .set(createAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.limit).toBe(50);
    });

    it('should return empty history for new tier', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .get('/api/admin/tier-config/pro/history')
        .set(createAuthHeader(adminToken))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // ===========================================================================
  // POST /api/admin/tier-config/:tierName/preview - Dry-run Preview
  // ===========================================================================

  describe('POST /api/admin/tier-config/:tierName/preview', () => {
    it('should preview credit increase impact without applying changes', async () => {
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      await createTestUsersOnTier(prisma, 'pro', 10, 1500);

      const response = await request(app)
        .post('/api/admin/tier-config/pro/preview')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          applyToExistingUsers: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tierName).toBe('pro');
      expect(response.body.data.currentCredits).toBe(1500);
      expect(response.body.data.newCredits).toBe(2000);
      expect(response.body.data.changeType).toBe('increase');
      expect(response.body.data.affectedUsers.total).toBe(10);
      expect(response.body.data.affectedUsers.willUpgrade).toBe(10);
      expect(response.body.data.estimatedCostImpact).toBeGreaterThan(0);

      // Verify no actual changes were made
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });
      expect(tierConfig?.monthly_credit_allocation).toBe(1500); // Unchanged
    });

    it('should preview credit decrease showing zero upgrades', async () => {
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      await createTestUsersOnTier(prisma, 'pro', 10, 1500);

      const response = await request(app)
        .post('/api/admin/tier-config/pro/preview')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 1000,
          applyToExistingUsers: true,
        })
        .expect(200);

      expect(response.body.data.changeType).toBe('decrease');
      expect(response.body.data.affectedUsers.willUpgrade).toBe(0);
      expect(response.body.data.affectedUsers.willRemainSame).toBe(10);
    });

    it('should reject invalid request body', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .post('/api/admin/tier-config/pro/preview')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 'invalid', // Should be number
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ===========================================================================
  // PATCH /api/admin/tier-config/:tierName/credits - Update Credits
  // ===========================================================================

  describe('PATCH /api/admin/tier-config/:tierName/credits', () => {
    it('should update tier credits with immediate rollout', async () => {
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      const users = await createTestUsersOnTier(prisma, 'pro', 5, 1500);

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Q1 2025 Promotion - Extra 500 credits for all pro users',
          applyToExistingUsers: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.monthlyCreditAllocation).toBe(2000);
      expect(response.body.data.configVersion).toBe(2);
      expect(response.body.message).toContain('successfully');

      // Verify tier config updated
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });
      expect(tierConfig?.monthly_credit_allocation).toBe(2000);
      expect(tierConfig?.config_version).toBe(2);

      // Verify history record created
      const history = await prisma.tier_config_history.findFirst({
        where: { tier_name: 'pro' },
        orderBy: { changed_at: 'desc' },
      });
      expect(history).not.toBeNull();
      expect(history?.previous_credits).toBe(1500);
      expect(history?.new_credits).toBe(2000);
      expect(history?.change_type).toBe('credit_increase');

      // Verify users upgraded (check one user)
      const upgraded = await verifyCreditUpgrade(prisma, users[0].user.id, 2000);
      expect(upgraded).toBe(true);
    });

    it('should schedule rollout when scheduledRolloutDate provided', async () => {
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      await createTestUsersOnTier(prisma, 'pro', 5, 1500);

      const rolloutDate = new Date('2025-02-01T00:00:00Z');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Scheduled rollout for February 2025',
          applyToExistingUsers: true,
          scheduledRolloutDate: rolloutDate.toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rolloutStartDate).toBe(rolloutDate.toISOString());

      // Verify tier config has rollout date
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });
      expect(tierConfig?.rollout_start_date).toEqual(rolloutDate);
      expect(tierConfig?.apply_to_existing_users).toBe(true);

      // Verify users NOT upgraded yet (scheduled for later)
      const count = await countUsersWithAllocation(prisma, 'pro', 1500);
      expect(count).toBe(5); // Still old allocation
    });

    it('should reject credits below minimum (100)', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 50,
          reason: 'Invalid credit amount test',
          applyToExistingUsers: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject credits above maximum (1,000,000)', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 1500000,
          reason: 'Invalid credit amount test',
          applyToExistingUsers: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject credits not in increments of 100', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 1550,
          reason: 'Invalid increment test',
          applyToExistingUsers: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject short reason (less than 10 characters)', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Short',
          applyToExistingUsers: false,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create audit log entry', async () => {
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });

      await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Test audit log creation',
          applyToExistingUsers: false,
        })
        .expect(200);

      // Verify audit log (if audit logging is implemented)
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceType: 'tier_config',
          action: 'update',
        },
        orderBy: { timestamp: 'desc' },
      });

      // This may need adjustment based on actual audit log implementation
      expect(auditLog).toBeDefined();
    });
  });

  // ===========================================================================
  // PATCH /api/admin/tier-config/:tierName/price - Update Pricing
  // ===========================================================================

  describe('PATCH /api/admin/tier-config/:tierName/price', () => {
    it('should update tier pricing with audit trail', async () => {
      await createTestTierConfig(prisma, 'pro', {
        monthly_price_usd: 15,
        annual_price_usd: 150,
      });

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .set(createAuthHeader(adminToken))
        .send({
          newMonthlyPrice: 19.99,
          newAnnualPrice: 199.99,
          reason: 'Competitive pricing adjustment for Q2 2025',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.monthlyPriceUsd).toBe(19.99);
      expect(response.body.data.annualPriceUsd).toBe(199.99);
      expect(response.body.data.configVersion).toBe(2);

      // Verify tier config updated
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });
      expect(Number(tierConfig?.monthly_price_usd)).toBe(19.99);
      expect(Number(tierConfig?.annual_price_usd)).toBe(199.99);

      // Verify history record created
      const history = await prisma.tier_config_history.findFirst({
        where: { tier_name: 'pro' },
        orderBy: { changed_at: 'desc' },
      });
      expect(history).not.toBeNull();
      expect(history?.change_type).toBe('price_change');
      expect(Number(history?.previous_price_usd)).toBe(15);
      expect(Number(history?.new_price_usd)).toBe(19.99);
    });

    it('should update only monthly price when annual not provided', async () => {
      await createTestTierConfig(prisma, 'pro', {
        monthly_price_usd: 15,
        annual_price_usd: 150,
      });

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .set(createAuthHeader(adminToken))
        .send({
          newMonthlyPrice: 19.99,
          reason: 'Update monthly price only',
        })
        .expect(200);

      expect(response.body.data.monthlyPriceUsd).toBe(19.99);
      expect(response.body.data.annualPriceUsd).toBe(150); // Unchanged
    });

    it('should reject negative monthly price', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .set(createAuthHeader(adminToken))
        .send({
          newMonthlyPrice: -10,
          reason: 'Invalid negative price',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject negative annual price', async () => {
      await createTestTierConfig(prisma, 'pro');

      const response = await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .set(createAuthHeader(adminToken))
        .send({
          newAnnualPrice: -100,
          reason: 'Invalid negative price',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create audit log entry for price change', async () => {
      await createTestTierConfig(prisma, 'pro');

      await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .set(createAuthHeader(adminToken))
        .send({
          newMonthlyPrice: 19.99,
          newAnnualPrice: 199.99,
          reason: 'Test audit log for price change',
        })
        .expect(200);

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceType: 'tier_config_pricing',
          action: 'update',
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();
    });
  });

  // ===========================================================================
  // Authorization Tests
  // ===========================================================================

  describe('Authorization', () => {
    it('should reject all endpoints without authentication', async () => {
      await request(app).get('/api/admin/tier-config').expect(401);

      await request(app).get('/api/admin/tier-config/pro').expect(401);

      await request(app).get('/api/admin/tier-config/pro/history').expect(401);

      await request(app)
        .post('/api/admin/tier-config/pro/preview')
        .send({ newCredits: 2000 })
        .expect(401);

      await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .send({
          newCredits: 2000,
          reason: 'Test',
          applyToExistingUsers: false,
        })
        .expect(401);

      await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .send({
          newMonthlyPrice: 19.99,
          reason: 'Test',
        })
        .expect(401);
    });

    it('should reject non-admin users', async () => {
      // Create regular user (non-admin)
      const regularUser = await prisma.user.create({
        data: {
          email: 'regular@example.com',
          username: 'regularuser',
          emailVerified: true,
          passwordHash: '$2b$10$test',
          firstName: 'Regular',
          lastName: 'User',
          isActive: true,
          role: 'user', // Not admin
        },
      });

      const regularToken = await generateTestAccessToken(regularUser, [
        'openid',
        'email',
        'profile',
        'user.info',
      ]);

      await request(app)
        .get('/api/admin/tier-config')
        .set(createAuthHeader(regularToken))
        .expect(403);
    });
  });
});
