/**
 * Unit Tests for TierConfigService (Plan 190)
 *
 * Test Coverage:
 * - getAllTierConfigs() - Returns all active tier configs
 * - getTierConfigByName() - Returns specific tier config or null
 * - getTierConfigHistory() - Returns audit trail with limit
 * - updateTierCredits() - Updates credits with validation, history, upgrade processing
 * - updateTierPrice() - Updates pricing with audit trail
 * - previewCreditUpdate() - Calculates impact without applying changes
 * - validateTierUpdate() - Validates business rules and constraints
 * - countActiveUsersOnTier() - Counts active subscriptions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient, Prisma } from '@prisma/client';
import { TierConfigService } from '../../../src/services/tier-config.service';
import { ICreditUpgradeService } from '../../../src/interfaces/services/credit-upgrade.interface';
import {
  TierChangeType,
  UpdateTierCreditsRequest,
  UpdateTierPriceRequest,
  PreviewUpdateRequest,
} from '@rephlo/shared-types';

// Create mock Prisma client
const createMockPrisma = (): any => ({
  subscription_tier_config: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  tier_config_history: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  subscription_monetization: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

// Create mock credit upgrade service
const createMockCreditUpgradeService = (): any => ({
  processTierCreditUpgrade: jest.fn(),
  isEligibleForUpgrade: jest.fn(),
  applyUpgradeToUser: jest.fn(),
  processPendingUpgrades: jest.fn(),
  getUpgradeEligibilitySummary: jest.fn(),
});

describe('TierConfigService - Unit Tests', () => {
  let tierConfigService: TierConfigService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockCreditUpgradeService: ReturnType<typeof createMockCreditUpgradeService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create fresh mocks
    mockPrisma = createMockPrisma();
    mockCreditUpgradeService = createMockCreditUpgradeService();

    // Instantiate service with mocks
    tierConfigService = new TierConfigService(
      mockPrisma as unknown as PrismaClient,
      mockCreditUpgradeService as ICreditUpgradeService
    );
  });

  // ===========================================================================
  // getAllTierConfigs()
  // ===========================================================================

  describe('getAllTierConfigs', () => {
    it('should return all active tier configurations', async () => {
      const mockConfigs = [
        {
          id: 'tier-1',
          tier_name: 'free',
          monthly_credit_allocation: 1000,
          monthly_price_usd: new Prisma.Decimal(0),
          annual_price_usd: new Prisma.Decimal(0),
          max_credit_rollover: 0,
          features: {},
          is_active: true,
          config_version: 1,
          last_modified_by: null,
          last_modified_at: new Date(),
          apply_to_existing_users: false,
          rollout_start_date: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'tier-2',
          tier_name: 'pro',
          monthly_credit_allocation: 1500,
          monthly_price_usd: new Prisma.Decimal(15),
          annual_price_usd: new Prisma.Decimal(150),
          max_credit_rollover: 1500,
          features: {},
          is_active: true,
          config_version: 1,
          last_modified_by: null,
          last_modified_at: new Date(),
          apply_to_existing_users: false,
          rollout_start_date: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockResolvedValue(mockConfigs);

      const result = await tierConfigService.getAllTierConfigs();

      expect(result).toHaveLength(2);
      expect(result[0].tierName).toBe('free');
      expect(result[1].tierName).toBe('pro');
      expect(mockPrisma.subscription_tier_config.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        orderBy: { tier_name: 'asc' },
      });
    });

    it('should return empty array when no tier configs exist', async () => {
      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tierConfigService.getAllTierConfigs();

      expect(result).toEqual([]);
    });

    it('should throw error if database query fails', async () => {
      (mockPrisma.subscription_tier_config.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(tierConfigService.getAllTierConfigs()).rejects.toThrow('Failed to fetch tier configurations');
    });
  });

  // ===========================================================================
  // getTierConfigByName()
  // ===========================================================================

  describe('getTierConfigByName', () => {
    it('should return tier config when it exists', async () => {
      const mockConfig = {
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
        monthly_price_usd: new Prisma.Decimal(15),
        annual_price_usd: new Prisma.Decimal(150),
        max_credit_rollover: 1500,
        features: {},
        is_active: true,
        config_version: 2,
        last_modified_by: 'admin-123',
        last_modified_at: new Date(),
        apply_to_existing_users: false,
        rollout_start_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      const result = await tierConfigService.getTierConfigByName('pro');

      expect(result).not.toBeNull();
      expect(result?.tierName).toBe('pro');
      expect(result?.monthlyCreditAllocation).toBe(1500);
      expect(result?.configVersion).toBe(2);
      expect(mockPrisma.subscription_tier_config.findUnique).toHaveBeenCalledWith({
        where: { tier_name: 'pro' },
      });
    });

    it('should return null when tier does not exist', async () => {
      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tierConfigService.getTierConfigByName('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error if database query fails', async () => {
      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(tierConfigService.getTierConfigByName('pro')).rejects.toThrow('Failed to fetch tier config');
    });
  });

  // ===========================================================================
  // getTierConfigHistory()
  // ===========================================================================

  describe('getTierConfigHistory', () => {
    it('should return tier configuration history with default limit', async () => {
      const mockHistory = [
        {
          id: 'hist-1',
          tier_config_id: 'tier-1',
          tier_name: 'pro',
          previous_credits: 1000,
          new_credits: 1500,
          previous_price_usd: new Prisma.Decimal(10),
          new_price_usd: new Prisma.Decimal(15),
          change_reason: 'Price increase Q1',
          change_type: 'credit_increase' as TierChangeType,
          affected_users_count: 100,
          changed_by: 'admin-123',
          changed_at: new Date('2025-01-15T10:00:00Z'),
          applied_at: new Date('2025-01-15T10:05:00Z'),
        },
      ];

      (mockPrisma.tier_config_history.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await tierConfigService.getTierConfigHistory('pro');

      expect(result).toHaveLength(1);
      expect(result[0].tierName).toBe('pro');
      expect(result[0].changeType).toBe('credit_increase');
      expect(mockPrisma.tier_config_history.findMany).toHaveBeenCalledWith({
        where: { tier_name: 'pro' },
        orderBy: { changed_at: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      (mockPrisma.tier_config_history.findMany as jest.Mock).mockResolvedValue([]);

      await tierConfigService.getTierConfigHistory('pro', 10);

      expect(mockPrisma.tier_config_history.findMany).toHaveBeenCalledWith({
        where: { tier_name: 'pro' },
        orderBy: { changed_at: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when no history exists', async () => {
      (mockPrisma.tier_config_history.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tierConfigService.getTierConfigHistory('free');

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // updateTierCredits() - Immediate Rollout
  // ===========================================================================

  describe('updateTierCredits - Immediate Rollout', () => {
    it('should update credits with immediate rollout and process upgrades', async () => {
      const updateRequest: UpdateTierCreditsRequest = {
        newCredits: 2000,
        reason: 'Q1 2025 Promotion',
        applyToExistingUsers: true,
        scheduledRolloutDate: undefined,
      };

      const mockCurrentConfig = {
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
        monthly_price_usd: new Prisma.Decimal(15),
        config_version: 1,
      };

      const mockUpdatedConfig = {
        ...mockCurrentConfig,
        monthly_credit_allocation: 2000,
        config_version: 2,
        last_modified_by: 'admin-123',
        last_modified_at: new Date(),
      };

      const mockUpgradeResult = {
        totalEligible: 10,
        successCount: 10,
        failureCount: 0,
        results: [],
      };

      // Mock transaction to execute callback immediately
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        // Simulate transaction context
        const txMock = {
          subscription_tier_config: {
            findUnique: jest.fn().mockResolvedValue(mockCurrentConfig),
            update: jest.fn().mockResolvedValue(mockUpdatedConfig),
          },
          tier_config_history: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txMock);
      });

      (mockCreditUpgradeService.processTierCreditUpgrade as jest.Mock).mockResolvedValue(mockUpgradeResult);

      const result = await tierConfigService.updateTierCredits('pro', updateRequest, 'admin-123');

      expect(result.tierName).toBe('pro');
      expect(result.monthlyCreditAllocation).toBe(2000);
      expect(result.configVersion).toBe(2);
      expect(mockCreditUpgradeService.processTierCreditUpgrade).toHaveBeenCalledWith(
        'tier-1',
        'pro',
        1500,
        2000
      );
    });

    it('should throw error if validation fails (credits below minimum)', async () => {
      const updateRequest: UpdateTierCreditsRequest = {
        newCredits: 50, // Below minimum of 100
        reason: 'Invalid update',
        applyToExistingUsers: false,
      };

      await expect(
        tierConfigService.updateTierCredits('pro', updateRequest, 'admin-123')
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // updateTierCredits() - Scheduled Rollout
  // ===========================================================================

  describe('updateTierCredits - Scheduled Rollout', () => {
    it('should update credits with scheduled rollout (no immediate upgrade)', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const updateRequest: UpdateTierCreditsRequest = {
        newCredits: 2000,
        reason: 'Scheduled Q2 Rollout',
        applyToExistingUsers: true,
        scheduledRolloutDate: futureDate.toISOString(),
      };

      const mockCurrentConfig = {
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
        config_version: 1,
      };

      const mockUpdatedConfig = {
        ...mockCurrentConfig,
        monthly_credit_allocation: 2000,
        config_version: 2,
        apply_to_existing_users: true,
        rollout_start_date: futureDate,
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txMock = {
          subscription_tier_config: {
            findUnique: jest.fn().mockResolvedValue(mockCurrentConfig),
            update: jest.fn().mockResolvedValue(mockUpdatedConfig),
          },
          tier_config_history: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txMock);
      });

      const result = await tierConfigService.updateTierCredits('pro', updateRequest, 'admin-123');

      expect(result.monthlyCreditAllocation).toBe(2000);
      expect(result.rolloutStartDate).toEqual(futureDate);
      // Credit upgrade service should NOT be called for scheduled rollout
      expect(mockCreditUpgradeService.processTierCreditUpgrade).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // updateTierPrice()
  // ===========================================================================

  describe('updateTierPrice', () => {
    it('should update tier pricing and create audit log', async () => {
      const priceUpdate: UpdateTierPriceRequest = {
        newMonthlyPrice: 20.0,
        newAnnualPrice: 200.0,
        reason: 'Price adjustment for 2025',
      };

      const mockCurrentConfig = {
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
        monthly_price_usd: new Prisma.Decimal(15),
        annual_price_usd: new Prisma.Decimal(150),
        config_version: 1,
      };

      const mockUpdatedConfig = {
        ...mockCurrentConfig,
        monthly_price_usd: new Prisma.Decimal(20),
        annual_price_usd: new Prisma.Decimal(200),
        config_version: 2,
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const txMock = {
          subscription_tier_config: {
            findUnique: jest.fn().mockResolvedValue(mockCurrentConfig),
            update: jest.fn().mockResolvedValue(mockUpdatedConfig),
          },
          tier_config_history: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txMock);
      });

      const result = await tierConfigService.updateTierPrice('pro', priceUpdate, 'admin-123');

      expect(result.monthlyPriceUsd).toBe(20);
      expect(result.annualPriceUsd).toBe(200);
      expect(result.configVersion).toBe(2);
    });

    it('should throw error for negative monthly price', async () => {
      const priceUpdate: UpdateTierPriceRequest = {
        newMonthlyPrice: -10.0,
        newAnnualPrice: 200.0,
        reason: 'Invalid price',
      };

      await expect(
        tierConfigService.updateTierPrice('pro', priceUpdate, 'admin-123')
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // previewCreditUpdate()
  // ===========================================================================

  describe('previewCreditUpdate', () => {
    it('should calculate impact summary for credit increase', async () => {
      const previewRequest: PreviewUpdateRequest = {
        newCredits: 2000,
        applyToExistingUsers: true,
      };

      const mockConfig = {
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      };

      const mockSummary = {
        totalActiveUsers: 100,
        eligibleForUpgrade: 80,
        alreadyAtOrAbove: 20,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue(mockConfig);
      (mockCreditUpgradeService.getUpgradeEligibilitySummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await tierConfigService.previewCreditUpdate('pro', previewRequest);

      expect(result.tierName).toBe('pro');
      expect(result.currentCredits).toBe(1500);
      expect(result.newCredits).toBe(2000);
      expect(result.changeType).toBe('increase');
      expect(result.affectedUsers.total).toBe(100);
      expect(result.affectedUsers.willUpgrade).toBe(80);
    });

    it('should identify credit decrease (no upgrades)', async () => {
      const previewRequest: PreviewUpdateRequest = {
        newCredits: 1000,
        applyToExistingUsers: true,
      };

      const mockConfig = {
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      const result = await tierConfigService.previewCreditUpdate('pro', previewRequest);

      expect(result.changeType).toBe('decrease');
      expect(result.affectedUsers.willUpgrade).toBe(0);
      expect(result.affectedUsers.willRemainSame).toBe(0);
    });

    it('should throw error if tier not found', async () => {
      const previewRequest: PreviewUpdateRequest = {
        newCredits: 2000,
        applyToExistingUsers: true,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        tierConfigService.previewCreditUpdate('nonexistent', previewRequest)
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // validateTierUpdate()
  // ===========================================================================

  describe('validateTierUpdate', () => {
    it('should pass validation for valid credit update', async () => {
      const validUpdate: UpdateTierCreditsRequest = {
        newCredits: 2000,
        reason: 'This is a valid reason with enough characters',
        applyToExistingUsers: true,
      };

      // Mock tier config exists
      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      });

      const result = await tierConfigService.validateTierUpdate('pro', validUpdate);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject credits below minimum (100)', async () => {
      const invalidUpdate: UpdateTierCreditsRequest = {
        newCredits: 50,
        reason: 'Valid reason',
        applyToExistingUsers: false,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      });

      const result = await tierConfigService.validateTierUpdate('pro', invalidUpdate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credits must be at least 100');
    });

    it('should reject credits above maximum (1,000,000)', async () => {
      const invalidUpdate: UpdateTierCreditsRequest = {
        newCredits: 2000000,
        reason: 'Valid reason',
        applyToExistingUsers: false,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      });

      const result = await tierConfigService.validateTierUpdate('pro', invalidUpdate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credits must not exceed 1,000,000');
    });

    it('should reject credits not in increments of 100', async () => {
      const invalidUpdate: UpdateTierCreditsRequest = {
        newCredits: 1550, // Not divisible by 100
        reason: 'Valid reason',
        applyToExistingUsers: false,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      });

      const result = await tierConfigService.validateTierUpdate('pro', invalidUpdate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credits must be in increments of 100');
    });

    it('should reject reason shorter than 10 characters', async () => {
      const invalidUpdate: UpdateTierCreditsRequest = {
        newCredits: 2000,
        reason: 'Short',
        applyToExistingUsers: false,
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      });

      const result = await tierConfigService.validateTierUpdate('pro', invalidUpdate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reason must be at least 10 characters');
    });

    it('should reject scheduled rollout date in the past', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const invalidUpdate: UpdateTierCreditsRequest = {
        newCredits: 2000,
        reason: 'Valid reason',
        applyToExistingUsers: true,
        scheduledRolloutDate: pastDate.toISOString(),
      };

      (mockPrisma.subscription_tier_config.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-1',
        tier_name: 'pro',
        monthly_credit_allocation: 1500,
      });

      const result = await tierConfigService.validateTierUpdate('pro', invalidUpdate);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('must be in the future'))).toBe(true);
    });
  });

  // ===========================================================================
  // countActiveUsersOnTier()
  // ===========================================================================

  describe('countActiveUsersOnTier', () => {
    it('should count active users on specific tier', async () => {
      (mockPrisma.subscription_monetization.count as jest.Mock).mockResolvedValue(50);

      const result = await tierConfigService.countActiveUsersOnTier('pro');

      expect(result).toBe(50);
      expect(mockPrisma.subscription_monetization.count).toHaveBeenCalledWith({
        where: {
          tier: 'pro',
          status: 'active',
        },
      });
    });

    it('should return 0 when no active users on tier', async () => {
      (mockPrisma.subscription_monetization.count as jest.Mock).mockResolvedValue(0);

      const result = await tierConfigService.countActiveUsersOnTier('enterprise');

      expect(result).toBe(0);
    });

    it('should throw error if database query fails', async () => {
      (mockPrisma.subscription_monetization.count as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(tierConfigService.countActiveUsersOnTier('pro')).rejects.toThrow('Failed to count users');
    });
  });
});
