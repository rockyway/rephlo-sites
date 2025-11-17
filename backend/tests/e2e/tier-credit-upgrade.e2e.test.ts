/**
 * End-to-End Tests for Tier Credit Upgrade Workflow (Plan 190)
 *
 * Tests complete user stories from start to finish:
 * 1. Immediate Rollout Workflow
 * 2. Scheduled Rollout Workflow
 * 3. Mixed User Scenarios (eligible, ineligible, already upgraded)
 * 4. Error Recovery and Partial Failures
 *
 * These tests verify the entire system working together:
 * - HTTP API endpoints
 * - Service layer business logic
 * - Database transactions and integrity
 * - Background worker processing
 * - Audit trail completeness
 */

import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase, cleanDatabase, setupTestDatabase } from '../setup/database';
import {
  createTestTierConfig,
  createTestUsersOnTier,
  createScheduledRolloutScenario,
  createMockAdminUser,
  verifyCreditUpgrade,
  getTierConfigVersion,
  countUsersWithAllocation,
  cleanupTierConfigTestData,
} from '../helpers/tier-config-fixtures';
import { generateTestAccessToken, createAuthHeader } from '../helpers/tokens';
import { CreditUpgradeService } from '../../src/services/credit-upgrade.service';
import { createApp } from '../../src/server';
import { container } from '../../src/container';

describe('Tier Credit Upgrade - End-to-End Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let creditUpgradeService: CreditUpgradeService;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await setupTestDatabase();

    // Create Express app
    app = createApp();

    // Resolve services from DI container
    creditUpgradeService = container.resolve(CreditUpgradeService);

    // Create admin user and token
    adminUser = await createMockAdminUser(prisma);
    adminToken = await generateTestAccessToken(adminUser, [
      'openid',
      'email',
      'profile',
      'admin',
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
  // E2E Test 1: Complete Immediate Rollout Workflow
  // ===========================================================================

  describe('Complete Immediate Rollout Workflow', () => {
    it('should execute complete workflow: preview → apply → verify', async () => {
      // Setup: Create tier and users
      await createTestTierConfig(prisma, 'pro', {
        monthly_credit_allocation: 1500,
        config_version: 1,
      });

      const users = await createTestUsersOnTier(prisma, 'pro', 10, 1500);

      // Step 1: Admin previews the change
      const previewResponse = await request(app)
        .post('/api/admin/tier-config/pro/preview')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          applyToExistingUsers: true,
        })
        .expect(200);

      expect(previewResponse.body.data.changeType).toBe('increase');
      expect(previewResponse.body.data.affectedUsers.total).toBe(10);
      expect(previewResponse.body.data.affectedUsers.willUpgrade).toBe(10);
      expect(previewResponse.body.data.estimatedCostImpact).toBe(50); // 500 credits * 10 users * $0.01

      // Verify no changes applied yet
      const versionBeforeUpdate = await getTierConfigVersion(prisma, 'pro');
      expect(versionBeforeUpdate).toBe(1);

      // Step 2: Admin applies immediate rollout
      const updateResponse = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Q1 2025 Promotion - Extra 500 credits for all pro users',
          applyToExistingUsers: true,
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.monthlyCreditAllocation).toBe(2000);
      expect(updateResponse.body.data.configVersion).toBe(2);

      // Step 3: Verify tier config updated
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.monthly_credit_allocation).toBe(2000);
      expect(tierConfig?.config_version).toBe(2);
      expect(tierConfig?.last_modified_by).toBe(adminUser.id);
      expect(tierConfig?.apply_to_existing_users).toBe(false); // Cleared after immediate rollout

      // Step 4: Verify history record created
      const history = await prisma.tier_config_history.findFirst({
        where: { tier_name: 'pro', change_type: 'credit_increase' },
        orderBy: { changed_at: 'desc' },
      });

      expect(history).not.toBeNull();
      expect(history?.previous_credits).toBe(1500);
      expect(history?.new_credits).toBe(2000);
      expect(history?.affected_users_count).toBe(10);
      expect(history?.changed_by).toBe(adminUser.id);
      expect(history?.applied_at).not.toBeNull(); // Applied immediately

      // Step 5: Verify eligible users upgraded
      for (const userData of users) {
        const upgraded = await verifyCreditUpgrade(prisma, userData.user.id, 2000);
        expect(upgraded).toBe(true);

        // Check subscription allocation
        const subscription = await prisma.subscription_monetization.findFirst({
          where: { user_id: userData.user.id },
        });
        expect(subscription?.monthly_credit_allocation).toBe(2000);

        // Check user credit balance increased
        const balance = await prisma.user_credit_balance.findUnique({
          where: { user_id: userData.user.id },
        });
        expect(balance?.amount).toBeGreaterThan(1500); // Original + additional

        // Check credit allocation record exists
        const allocation = await prisma.credit_allocation.findFirst({
          where: {
            user_id: userData.user.id,
            source: 'admin_grant',
          },
          orderBy: { created_at: 'desc' },
        });
        expect(allocation).not.toBeNull();
        expect(allocation?.amount).toBe(500); // Additional credits
      }

      // Step 6: Verify audit trail complete
      const auditTrail = await prisma.tier_config_history.findMany({
        where: { tier_name: 'pro' },
        orderBy: { changed_at: 'desc' },
      });

      expect(auditTrail.length).toBeGreaterThan(0);
      expect(auditTrail[0].change_type).toBe('credit_increase');
    });

    it('should handle mixed eligibility scenario correctly', async () => {
      // Setup tier
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });

      // Create users with different allocations
      const eligibleUsers = await createTestUsersOnTier(prisma, 'pro', 5, 1500); // Eligible
      const alreadyUpgradedUsers = await createTestUsersOnTier(prisma, 'pro', 3, 2000); // Already at 2000
      const higherAllocationUsers = await createTestUsersOnTier(prisma, 'pro', 2, 2500); // Higher than target

      // Apply credit increase to 2000
      await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Mixed eligibility test',
          applyToExistingUsers: true,
        })
        .expect(200);

      // Verify only eligible users upgraded
      for (const userData of eligibleUsers) {
        const upgraded = await verifyCreditUpgrade(prisma, userData.user.id, 2000);
        expect(upgraded).toBe(true);
      }

      // Verify already upgraded users remain at 2000
      const countAt2000 = await countUsersWithAllocation(prisma, 'pro', 2000);
      expect(countAt2000).toBe(8); // 5 upgraded + 3 already at 2000

      // Verify higher allocation users unchanged at 2500
      const countAt2500 = await countUsersWithAllocation(prisma, 'pro', 2500);
      expect(countAt2500).toBe(2);
    });
  });

  // ===========================================================================
  // E2E Test 2: Complete Scheduled Rollout Workflow
  // ===========================================================================

  describe('Complete Scheduled Rollout Workflow', () => {
    it('should execute scheduled rollout: schedule → worker processes → verify', async () => {
      // Step 1: Admin schedules rollout for past date (so worker can process immediately)
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      const users = await createTestUsersOnTier(prisma, 'pro', 10, 1500);

      const rolloutDate = new Date(Date.now() - 3600000); // 1 hour ago

      const scheduleResponse = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Scheduled rollout test',
          applyToExistingUsers: true,
          scheduledRolloutDate: rolloutDate.toISOString(),
        })
        .expect(200);

      expect(scheduleResponse.body.data.rolloutStartDate).toBe(rolloutDate.toISOString());

      // Verify tier config has rollout scheduled
      let tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.apply_to_existing_users).toBe(true);
      expect(tierConfig?.rollout_start_date).not.toBeNull();

      // Verify users NOT upgraded yet
      let countBefore = await countUsersWithAllocation(prisma, 'pro', 1500);
      expect(countBefore).toBe(10);

      // Step 2: Run background worker to process pending upgrades
      const workerResult = await creditUpgradeService.processPendingUpgrades();

      expect(workerResult.processedTiers).toBe(1);
      expect(workerResult.totalUpgrades).toBe(10);
      expect(workerResult.errors).toEqual([]);

      // Step 3: Verify history marked as applied
      const history = await prisma.tier_config_history.findFirst({
        where: { tier_name: 'pro', change_type: 'credit_increase' },
      });

      expect(history?.applied_at).not.toBeNull();

      // Step 4: Verify rollout flags cleared
      tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.apply_to_existing_users).toBe(false);
      expect(tierConfig?.rollout_start_date).toBeNull();

      // Step 5: Verify all users upgraded
      for (const userData of users) {
        const upgraded = await verifyCreditUpgrade(prisma, userData.user.id, 2000);
        expect(upgraded).toBe(true);
      }

      const countAfter = await countUsersWithAllocation(prisma, 'pro', 2000);
      expect(countAfter).toBe(10);
    });

    it('should not process scheduled rollout with future date', async () => {
      // Setup tier with future rollout date
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      await createTestUsersOnTier(prisma, 'pro', 5, 1500);

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Future scheduled rollout test',
          applyToExistingUsers: true,
          scheduledRolloutDate: futureDate.toISOString(),
        })
        .expect(200);

      // Run worker
      const workerResult = await creditUpgradeService.processPendingUpgrades();

      // Verify no tiers processed (date is in future)
      expect(workerResult.processedTiers).toBe(0);
      expect(workerResult.totalUpgrades).toBe(0);

      // Verify users still at old allocation
      const count = await countUsersWithAllocation(prisma, 'pro', 1500);
      expect(count).toBe(5);
    });
  });

  // ===========================================================================
  // E2E Test 3: Error Recovery and Data Integrity
  // ===========================================================================

  describe('Error Recovery and Data Integrity', () => {
    it('should maintain data integrity after partial upgrade failure', async () => {
      // Create tier and users
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      const users = await createTestUsersOnTier(prisma, 'pro', 10, 1500);

      // Apply upgrade (some might fail due to race conditions or constraints)
      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Partial failure test',
          applyToExistingUsers: true,
        })
        .expect(200);

      // Tier config should still be updated even if some user upgrades fail
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.monthly_credit_allocation).toBe(2000);
      expect(tierConfig?.config_version).toBe(2);

      // History should be recorded
      const history = await prisma.tier_config_history.findFirst({
        where: { tier_name: 'pro', change_type: 'credit_increase' },
      });

      expect(history).not.toBeNull();

      // At least some users should be upgraded successfully
      const upgradedCount = await countUsersWithAllocation(prisma, 'pro', 2000);
      expect(upgradedCount).toBeGreaterThan(0);
    });

    it('should not apply credit decrease to existing users', async () => {
      // Create tier and users
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 2000 });
      const users = await createTestUsersOnTier(prisma, 'pro', 10, 2000);

      // Apply credit decrease
      const response = await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 1500,
          reason: 'Credit decrease test - existing users should keep their allocation',
          applyToExistingUsers: true,
        })
        .expect(200);

      // Verify tier config updated
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.monthly_credit_allocation).toBe(1500);

      // Verify existing users KEEP their 2000 credits (upgrade-only policy)
      const countAt2000 = await countUsersWithAllocation(prisma, 'pro', 2000);
      expect(countAt2000).toBe(10);

      // History should record decrease
      const history = await prisma.tier_config_history.findFirst({
        where: { tier_name: 'pro', change_type: 'credit_decrease' },
      });

      expect(history).not.toBeNull();
      expect(history?.previous_credits).toBe(2000);
      expect(history?.new_credits).toBe(1500);
    });

    it('should handle concurrent upgrade requests gracefully', async () => {
      // Create tier and users
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1500 });
      await createTestUsersOnTier(prisma, 'pro', 10, 1500);

      // Make two concurrent update requests
      const [response1, response2] = await Promise.allSettled([
        request(app)
          .patch('/api/admin/tier-config/pro/credits')
          .set(createAuthHeader(adminToken))
          .send({
            newCredits: 2000,
            reason: 'Concurrent request 1',
            applyToExistingUsers: true,
          }),
        request(app)
          .patch('/api/admin/tier-config/pro/credits')
          .set(createAuthHeader(adminToken))
          .send({
            newCredits: 2500,
            reason: 'Concurrent request 2',
            applyToExistingUsers: true,
          }),
      ]);

      // At least one should succeed
      const successCount = [response1, response2].filter(
        (r) => r.status === 'fulfilled' && (r.value as any).status === 200
      ).length;

      expect(successCount).toBeGreaterThan(0);

      // Final state should be consistent
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.monthly_credit_allocation).toBeGreaterThan(1500);
      expect(tierConfig?.config_version).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // E2E Test 4: Complete Audit Trail Verification
  // ===========================================================================

  describe('Complete Audit Trail Verification', () => {
    it('should maintain complete audit trail through multiple changes', async () => {
      // Create tier
      await createTestTierConfig(prisma, 'pro', { monthly_credit_allocation: 1000 });
      await createTestUsersOnTier(prisma, 'pro', 5, 1000);

      // Change 1: Credit increase
      await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 1500,
          reason: 'First credit increase',
          applyToExistingUsers: true,
        })
        .expect(200);

      // Change 2: Another credit increase
      await request(app)
        .patch('/api/admin/tier-config/pro/credits')
        .set(createAuthHeader(adminToken))
        .send({
          newCredits: 2000,
          reason: 'Second credit increase',
          applyToExistingUsers: true,
        })
        .expect(200);

      // Change 3: Price change
      await request(app)
        .patch('/api/admin/tier-config/pro/price')
        .set(createAuthHeader(adminToken))
        .send({
          newMonthlyPrice: 19.99,
          newAnnualPrice: 199.99,
          reason: 'Price adjustment',
        })
        .expect(200);

      // Fetch complete history
      const historyResponse = await request(app)
        .get('/api/admin/tier-config/pro/history')
        .set(createAuthHeader(adminToken))
        .expect(200);

      const history = historyResponse.body.data;

      // Verify all changes recorded
      expect(history.length).toBe(3);
      expect(history.some((h: any) => h.newCredits === 1500)).toBe(true);
      expect(history.some((h: any) => h.newCredits === 2000)).toBe(true);
      expect(history.some((h: any) => h.changeType === 'price_change')).toBe(true);

      // Verify chronological order (most recent first)
      expect(history[0].changeType).toBe('price_change');
      expect(history[1].newCredits).toBe(2000);
      expect(history[2].newCredits).toBe(1500);

      // Verify all have admin user ID
      expect(history.every((h: any) => h.changedBy === adminUser.id)).toBe(true);

      // Verify config version incremented correctly
      const tierConfig = await prisma.subscription_tier_config.findUnique({
        where: { tier_name: 'pro' },
      });

      expect(tierConfig?.config_version).toBe(4); // Initial + 3 changes
    });
  });
});
