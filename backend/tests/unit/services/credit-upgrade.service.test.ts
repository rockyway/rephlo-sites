/**
 * Unit Tests for CreditUpgradeService (Plan 190)
 *
 * Test Coverage:
 * - processTierCreditUpgrade() - Batch upgrade with eligibility checks
 * - isEligibleForUpgrade() - Eligibility logic
 * - applyUpgradeToUser() - Individual user upgrade with transaction
 * - processPendingUpgrades() - Scheduled rollout processing
 * - getUpgradeEligibilitySummary() - Impact summary calculation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { CreditUpgradeService } from '../../../src/services/credit-upgrade.service';

// Create mock Prisma client
const createMockPrisma = (): any => ({
  subscription_monetization: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  subscription_tier_config: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  tier_config_history: {
    update: jest.fn(),
  },
  credit_allocation: {
    create: jest.fn(),
  },
  user_credit_balance: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('CreditUpgradeService - Unit Tests', () => {
  let creditUpgradeService: CreditUpgradeService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    creditUpgradeService = new CreditUpgradeService(mockPrisma as unknown as PrismaClient);
  });

  // ===========================================================================
  // processTierCreditUpgrade()
  // ===========================================================================

  describe('processTierCreditUpgrade', () => {
    it('should process tier credit upgrade for eligible users (credit increase)', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const oldCredits = 1500;
      const newCredits = 2000;

      const activeSubscriptions = [
        { user_id: 'user-1', id: 'sub-1', monthly_credit_allocation: 1500 },
        { user_id: 'user-2', id: 'sub-2', monthly_credit_allocation: 1500 },
        { user_id: 'user-3', id: 'sub-3', monthly_credit_allocation: 2000 }, // Already upgraded
      ];

      (mockPrisma.subscription_monetization.findMany as jest.Mock).mockResolvedValue(activeSubscriptions);

      // Mock transaction for each user upgrade
      let upgradeCount = 0;
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any, options: any) => {
        expect(options.isolationLevel).toBe('Serializable');

        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue(activeSubscriptions[upgradeCount]),
            update: jest.fn().mockResolvedValue({ ...activeSubscriptions[upgradeCount], monthly_credit_allocation: newCredits }),
          },
          credit_allocation: {
            create: jest.fn().mockResolvedValue({}),
          },
          user_credit_balance: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };

        upgradeCount++;
        return callback(txMock);
      });

      const result = await creditUpgradeService.processTierCreditUpgrade(
        tierConfigId,
        tierName,
        oldCredits,
        newCredits
      );

      expect(result.totalEligible).toBe(2); // user-1 and user-2
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockPrisma.subscription_monetization.findMany).toHaveBeenCalledWith({
        where: { tier: tierName, status: 'active' },
        select: { user_id: true, id: true, monthly_credit_allocation: true },
      });
    });

    it('should return zero results for credit decrease (no downgrades)', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const oldCredits = 2000;
      const newCredits = 1500; // Decrease

      const result = await creditUpgradeService.processTierCreditUpgrade(
        tierConfigId,
        tierName,
        oldCredits,
        newCredits
      );

      expect(result.totalEligible).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(mockPrisma.subscription_monetization.findMany).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const oldCredits = 1500;
      const newCredits = 2000;

      const activeSubscriptions = [
        { user_id: 'user-1', id: 'sub-1', monthly_credit_allocation: 1500 },
        { user_id: 'user-2', id: 'sub-2', monthly_credit_allocation: 1500 },
      ];

      (mockPrisma.subscription_monetization.findMany as jest.Mock).mockResolvedValue(activeSubscriptions);

      let callCount = 0;
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any, options: any) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Transaction failed for user-2');
        }

        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue(activeSubscriptions[0]),
            update: jest.fn().mockResolvedValue({}),
          },
          credit_allocation: {
            create: jest.fn().mockResolvedValue({}),
          },
          user_credit_balance: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      const result = await creditUpgradeService.processTierCreditUpgrade(
        tierConfigId,
        tierName,
        oldCredits,
        newCredits
      );

      expect(result.totalEligible).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Transaction failed for user-2');
    });

    it('should skip users who are not eligible (already have higher allocation)', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const oldCredits = 1500;
      const newCredits = 2000;

      const activeSubscriptions = [
        { user_id: 'user-1', id: 'sub-1', monthly_credit_allocation: 2500 }, // Already higher
        { user_id: 'user-2', id: 'sub-2', monthly_credit_allocation: 2000 }, // Already at new level
      ];

      (mockPrisma.subscription_monetization.findMany as jest.Mock).mockResolvedValue(activeSubscriptions);

      const result = await creditUpgradeService.processTierCreditUpgrade(
        tierConfigId,
        tierName,
        oldCredits,
        newCredits
      );

      expect(result.totalEligible).toBe(0);
      expect(result.successCount).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // isEligibleForUpgrade()
  // ===========================================================================

  describe('isEligibleForUpgrade', () => {
    it('should return true when user has lower allocation than new credits', async () => {
      const userId = 'user-1';
      const tierName = 'pro';
      const newCredits = 2000;

      (mockPrisma.subscription_monetization.findFirst as jest.Mock).mockResolvedValue({
        monthly_credit_allocation: 1500,
      });

      const result = await creditUpgradeService.isEligibleForUpgrade(userId, tierName, newCredits);

      expect(result).toBe(true);
    });

    it('should return false when user has equal allocation', async () => {
      const userId = 'user-1';
      const tierName = 'pro';
      const newCredits = 2000;

      (mockPrisma.subscription_monetization.findFirst as jest.Mock).mockResolvedValue({
        monthly_credit_allocation: 2000,
      });

      const result = await creditUpgradeService.isEligibleForUpgrade(userId, tierName, newCredits);

      expect(result).toBe(false);
    });

    it('should return false when user has higher allocation', async () => {
      const userId = 'user-1';
      const tierName = 'pro';
      const newCredits = 2000;

      (mockPrisma.subscription_monetization.findFirst as jest.Mock).mockResolvedValue({
        monthly_credit_allocation: 2500,
      });

      const result = await creditUpgradeService.isEligibleForUpgrade(userId, tierName, newCredits);

      expect(result).toBe(false);
    });

    it('should return false when user has no active subscription', async () => {
      const userId = 'user-1';
      const tierName = 'pro';
      const newCredits = 2000;

      (mockPrisma.subscription_monetization.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await creditUpgradeService.isEligibleForUpgrade(userId, tierName, newCredits);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // applyUpgradeToUser()
  // ===========================================================================

  describe('applyUpgradeToUser', () => {
    it('should apply credit upgrade to user within Serializable transaction', async () => {
      const userId = 'user-1';
      const subscriptionId = 'sub-1';
      const newCredits = 2000;
      const oldCredits = 1500;
      const creditDifference = 500;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any, options: any) => {
        expect(options.isolationLevel).toBe('Serializable');

        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue({
              id: subscriptionId,
              monthly_credit_allocation: oldCredits,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          credit_allocation: {
            create: jest.fn().mockResolvedValue({}),
          },
          user_credit_balance: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      await creditUpgradeService.applyUpgradeToUser(userId, subscriptionId, newCredits);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should create credit_allocation record with source=admin_grant', async () => {
      const userId = 'user-1';
      const subscriptionId = 'sub-1';
      const newCredits = 2000;

      let creditAllocationCreated = false;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any, options: any) => {
        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue({
              id: subscriptionId,
              monthly_credit_allocation: 1500,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          credit_allocation: {
            create: jest.fn().mockImplementation((data: any) => {
              expect(data.data.source).toBe('admin_grant');
              creditAllocationCreated = true;
              return {};
            }),
          },
          user_credit_balance: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      await creditUpgradeService.applyUpgradeToUser(userId, subscriptionId, newCredits);

      expect(creditAllocationCreated).toBe(true);
    });

    it('should update user_credit_balance via upsert', async () => {
      const userId = 'user-1';
      const subscriptionId = 'sub-1';
      const newCredits = 2000;

      let balanceUpserted = false;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any, options: any) => {
        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue({
              id: subscriptionId,
              monthly_credit_allocation: 1500,
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          credit_allocation: {
            create: jest.fn().mockResolvedValue({}),
          },
          user_credit_balance: {
            upsert: jest.fn().mockImplementation((data: any) => {
              expect(data.where.user_id).toBe(userId);
              balanceUpserted = true;
              return {};
            }),
          },
        };

        return callback(txMock);
      });

      await creditUpgradeService.applyUpgradeToUser(userId, subscriptionId, newCredits);

      expect(balanceUpserted).toBe(true);
    });

    it('should update subscription monthly_credit_allocation', async () => {
      const userId = 'user-1';
      const subscriptionId = 'sub-1';
      const newCredits = 2000;

      let subscriptionUpdated = false;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any, options: any) => {
        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue({
              id: subscriptionId,
              monthly_credit_allocation: 1500,
            }),
            update: jest.fn().mockImplementation((data: any) => {
              expect(data.data.monthly_credit_allocation).toBe(newCredits);
              subscriptionUpdated = true;
              return {};
            }),
          },
          credit_allocation: {
            create: jest.fn().mockResolvedValue({}),
          },
          user_credit_balance: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(txMock);
      });

      await creditUpgradeService.applyUpgradeToUser(userId, subscriptionId, newCredits);

      expect(subscriptionUpdated).toBe(true);
    });

    it('should throw error if subscription not found', async () => {
      const userId = 'user-1';
      const subscriptionId = 'sub-1';
      const newCredits = 2000;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txMock = {
          subscription_monetization: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };

        return callback(txMock);
      });

      await expect(
        creditUpgradeService.applyUpgradeToUser(userId, subscriptionId, newCredits)
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // processPendingUpgrades()
  // ===========================================================================

  describe('processPendingUpgrades', () => {
    it('should find tiers with due rollout_start_date and process them', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const tiersWithPendingRollout = [
        {
          id: 'tier-1',
          tier_name: 'pro',
          monthly_credit_allocation: 2000,
          rollout_start_date: pastDate,
        },
      ];

      const history = [
        {
          id: 'hist-1',
          previous_credits: 1500,
          new_credits: 2000,
        },
      ];

      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockResolvedValue(tiersWithPendingRollout);
      (mockPrisma.tier_config_history.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.subscription_tier_config.update as jest.Mock).mockResolvedValue({});

      // Mock transaction for finding history
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txMock = {
          tier_config_history: {
            findFirst: jest.fn().mockResolvedValue(history[0]),
          },
        };
        return callback(txMock);
      });

      // Mock processTierCreditUpgrade
      const processSpy = jest.spyOn(creditUpgradeService, 'processTierCreditUpgrade')
        .mockResolvedValue({
          totalEligible: 10,
          successCount: 10,
          failureCount: 0,
          results: [],
        });

      await creditUpgradeService.processPendingUpgrades();

      expect(mockPrisma.subscription_tier_config.findMany).toHaveBeenCalledWith({
        where: {
          apply_to_existing_users: true,
          rollout_start_date: { lte: expect.any(Date) },
        },
      });

      expect(processSpy).toHaveBeenCalledWith('tier-1', 'pro', 1500, 2000);
    });

    it('should mark history as applied after successful processing', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const tiersWithPendingRollout = [
        {
          id: 'tier-1',
          tier_name: 'pro',
          monthly_credit_allocation: 2000,
          rollout_start_date: pastDate,
        },
      ];

      const history = [
        {
          id: 'hist-1',
          previous_credits: 1500,
          new_credits: 2000,
        },
      ];

      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockResolvedValue(tiersWithPendingRollout);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txMock = {
          tier_config_history: {
            findFirst: jest.fn().mockResolvedValue(history[0]),
          },
        };
        return callback(txMock);
      });

      jest.spyOn(creditUpgradeService, 'processTierCreditUpgrade').mockResolvedValue({
        totalEligible: 10,
        successCount: 10,
        failureCount: 0,
        results: [],
      });

      await creditUpgradeService.processPendingUpgrades();

      expect(mockPrisma.tier_config_history.update).toHaveBeenCalledWith({
        where: { id: 'hist-1' },
        data: { applied_at: expect.any(Date) },
      });
    });

    it('should clear rollout flags after processing', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const tiersWithPendingRollout = [
        {
          id: 'tier-1',
          tier_name: 'pro',
          monthly_credit_allocation: 2000,
          rollout_start_date: pastDate,
        },
      ];

      const history = [
        {
          id: 'hist-1',
          previous_credits: 1500,
          new_credits: 2000,
        },
      ];

      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockResolvedValue(tiersWithPendingRollout);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txMock = {
          tier_config_history: {
            findFirst: jest.fn().mockResolvedValue(history[0]),
          },
        };
        return callback(txMock);
      });

      jest.spyOn(creditUpgradeService, 'processTierCreditUpgrade').mockResolvedValue({
        totalEligible: 10,
        successCount: 10,
        failureCount: 0,
        results: [],
      });

      await creditUpgradeService.processPendingUpgrades();

      expect(mockPrisma.subscription_tier_config.update).toHaveBeenCalledWith({
        where: { id: 'tier-1' },
        data: {
          apply_to_existing_users: false,
          rollout_start_date: null,
        },
      });
    });

    it('should do nothing when no tiers have due rollouts', async () => {
      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockResolvedValue([]);

      const processSpy = jest.spyOn(creditUpgradeService, 'processTierCreditUpgrade');

      await creditUpgradeService.processPendingUpgrades();

      expect(processSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getUpgradeEligibilitySummary()
  // ===========================================================================

  describe('getUpgradeEligibilitySummary', () => {
    it('should calculate summary for eligible users', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const newCredits = 2000;

      const activeSubscriptions = [
        { monthly_credit_allocation: 1500 }, // Eligible
        { monthly_credit_allocation: 1500 }, // Eligible
        { monthly_credit_allocation: 2000 }, // Not eligible (equal)
        { monthly_credit_allocation: 2500 }, // Not eligible (higher)
      ];

      (mockPrisma.subscription_monetization.findMany as jest.Mock).mockResolvedValue(activeSubscriptions);

      const result = await creditUpgradeService.getUpgradeEligibilitySummary(
        tierConfigId,
        tierName,
        newCredits
      );

      expect(result.totalActiveUsers).toBe(4);
      expect(result.eligibleForUpgrade).toBe(2);
      expect(result.alreadyAtOrAbove).toBe(2);
    });

    it('should return zero summary when no active users', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const newCredits = 2000;

      (mockPrisma.subscription_monetization.findMany as jest.Mock).mockResolvedValue([]);

      const result = await creditUpgradeService.getUpgradeEligibilitySummary(
        tierConfigId,
        tierName,
        newCredits
      );

      expect(result.totalActiveUsers).toBe(0);
      expect(result.eligibleForUpgrade).toBe(0);
      expect(result.alreadyAtOrAbove).toBe(0);
    });

    it('should handle all users already upgraded scenario', async () => {
      const tierConfigId = 'tier-1';
      const tierName = 'pro';
      const newCredits = 2000;

      const activeSubscriptions = [
        { monthly_credit_allocation: 2000 },
        { monthly_credit_allocation: 2500 },
        { monthly_credit_allocation: 3000 },
      ];

      (mockPrisma.subscription_monetization.findMany as jest.Mock).mockResolvedValue(activeSubscriptions);

      const result = await creditUpgradeService.getUpgradeEligibilitySummary(
        tierConfigId,
        tierName,
        newCredits
      );

      expect(result.totalActiveUsers).toBe(3);
      expect(result.eligibleForUpgrade).toBe(0);
      expect(result.alreadyAtOrAbove).toBe(3);
    });
  });
});
