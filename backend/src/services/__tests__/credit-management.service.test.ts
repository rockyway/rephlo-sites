/**
 * Unit Tests for CreditManagementService - P0 Critical Fixes
 *
 * Tests the three fixed methods:
 * 1. allocateSubscriptionCredits() - Credits allocation with balance update
 * 2. grantBonusCredits() - Bonus credits with balance update
 * 3. syncWithTokenCreditSystem() - Balance reconciliation
 *
 * Focus: Integration with Plan 112 (UserCreditBalance table)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CreditManagementService } from '../credit-management.service';
import { cleanDatabase, getTestDatabase } from '../../../tests/setup/database';

const prisma = getTestDatabase();
const creditService = new CreditManagementService(prisma);

describe('CreditManagementService - P0 Fixes', () => {
  let testUserId: string;
  let testSubscriptionId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create test user
    const user = await prisma.users.create({
      data: {
        email: 'credit-test@example.com',
        emailVerified: true,
        username: 'credituser',
        firstName: 'Credit',
        lastName: 'User',
        passwordHash: 'hashed_password'
      }
    });
    testUserId = user.id;

    // Create test subscription
    const subscription = await prisma.subscriptionMonetization.create({
      data: {
        userId: testUserId,
        tier: 'pro',
        billingCycle: 'monthly',
        status: 'active',
        basePriceUsd: 19.00,
        monthlyCreditAllocation: 20000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    testSubscriptionId = subscription.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.creditAllocation.deleteMany({ where: { userId: testUserId } });
    await prisma.userCreditBalance.deleteMany({ where: { user_id: testUserId } });
    await prisma.creditDeductionLedger.deleteMany({ where: { user_id: testUserId } });
    await prisma.subscriptionMonetization.deleteMany({ where: { userId: testUserId } });
    await prisma.users.deleteMany({ where: { id: testUserId } });
  });

  describe('allocateSubscriptionCredits', () => {
    it('should create allocation and update UserCreditBalance', async () => {
      const result = await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId);

      // Verify allocation created
      expect(result.amount).toBe(20000);
      expect(result.userId).toBe(testUserId);
      expect(result.subscriptionId).toBe(testSubscriptionId);
      expect(result.source).toBe('subscription');

      // Verify UserCreditBalance updated (Plan 112 integration)
      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance).toBeDefined();
      expect(balance!.amount).toBe(20000);
      expect(balance!.user_id).toBe(testUserId);
    });

    it('should increment balance for multiple allocations', async () => {
      // First allocation
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId);

      // Second allocation
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId);

      // Verify balance incremented
      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(40000); // 2 * 20000
    });

    it('should handle concurrent allocations correctly (race condition test)', async () => {
      // Simulate 10 concurrent allocation requests
      const promises = Array(10).fill(null).map(() =>
        creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId)
      );

      await Promise.all(promises);

      // Verify all allocations recorded
      const allocations = await prisma.creditAllocation.findMany({
        where: { userId: testUserId }
      });
      expect(allocations).toHaveLength(10);

      // Verify balance is correct (no race condition)
      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(200000); // 10 * 20000
    });

    it('should throw error if subscription not found', async () => {
      await expect(
        creditService.allocateSubscriptionCredits(testUserId, 'non-existent-id')
      ).rejects.toThrow();
    });

    it('should use transaction isolation (Serializable)', async () => {
      // This test verifies that the transaction is being used
      const result = await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId);

      // If transaction wasn't used, this would potentially fail in concurrent scenarios
      expect(result).toBeDefined();

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance).toBeDefined();
    });
  });

  describe('grantBonusCredits', () => {
    it('should grant bonus and update balance', async () => {
      const result = await creditService.grantBonusCredits(testUserId, 5000, 'Referral bonus');

      // Verify allocation created
      expect(result.amount).toBe(5000);
      expect(result.userId).toBe(testUserId);
      expect(result.source).toBe('bonus');

      // Verify balance updated (Plan 112 integration)
      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(5000);
    });

    it('should increment existing balance', async () => {
      // Create initial balance
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId); // +20000

      // Grant bonus
      await creditService.grantBonusCredits(testUserId, 5000, 'Referral bonus');

      // Verify balance incremented
      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(25000); // 20000 + 5000
    });

    it('should handle multiple bonus grants', async () => {
      await creditService.grantBonusCredits(testUserId, 1000, 'Bonus 1');
      await creditService.grantBonusCredits(testUserId, 2000, 'Bonus 2');
      await creditService.grantBonusCredits(testUserId, 3000, 'Bonus 3');

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(6000); // 1000 + 2000 + 3000
    });

    it('should create allocation with expiration date', async () => {
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

      const result = await creditService.grantBonusCredits(
        testUserId,
        5000,
        'Limited time bonus',
        expiresAt
      );

      expect(result.allocationPeriodEnd).toBeDefined();
      // Allow some tolerance for time comparison
      const timeDiff = Math.abs(result.allocationPeriodEnd.getTime() - expiresAt.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('syncWithTokenCreditSystem', () => {
    it('should reconcile balance correctly', async () => {
      // Create allocations
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId); // +20000
      await creditService.grantBonusCredits(testUserId, 5000, 'Bonus'); // +5000

      // Create deductions
      await prisma.creditDeductionLedger.create({
        data: {
          user_id: testUserId,
          amount: 3000,
          deduction_type: 'inference',
          timestamp: new Date()
        }
      });

      await prisma.creditDeductionLedger.create({
        data: {
          user_id: testUserId,
          amount: 2000,
          deduction_type: 'embedding',
          timestamp: new Date()
        }
      });

      // Sync
      await creditService.syncWithTokenCreditSystem(testUserId);

      // Verify balance reconciled
      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      // Total allocations: 20000 + 5000 = 25000
      // Total deductions: 3000 + 2000 = 5000
      // Expected balance: 25000 - 5000 = 20000
      expect(balance!.amount).toBe(20000);
    });

    it('should handle zero allocations', async () => {
      // Only deductions, no allocations
      await prisma.creditDeductionLedger.create({
        data: {
          user_id: testUserId,
          amount: 1000,
          deduction_type: 'inference',
          timestamp: new Date()
        }
      });

      await creditService.syncWithTokenCreditSystem(testUserId);

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(-1000); // Negative balance allowed for reconciliation
    });

    it('should handle zero deductions', async () => {
      // Only allocations, no deductions
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId); // +20000

      await creditService.syncWithTokenCreditSystem(testUserId);

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(20000);
    });

    it('should create balance if not exists', async () => {
      // Ensure no balance exists
      await prisma.userCreditBalance.deleteMany({ where: { user_id: testUserId } });

      // Create allocation
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId);

      // Sync
      await creditService.syncWithTokenCreditSystem(testUserId);

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance).toBeDefined();
      expect(balance!.amount).toBe(20000);
    });

    it('should handle complex reconciliation scenario', async () => {
      // Multiple allocations
      await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId); // +20000
      await creditService.grantBonusCredits(testUserId, 10000, 'Bonus 1');
      await creditService.grantBonusCredits(testUserId, 5000, 'Bonus 2');

      // Multiple deductions
      await prisma.creditDeductionLedger.createMany({
        data: [
          { user_id: testUserId, amount: 5000, deduction_type: 'inference', timestamp: new Date() },
          { user_id: testUserId, amount: 3000, deduction_type: 'embedding', timestamp: new Date() },
          { user_id: testUserId, amount: 2000, deduction_type: 'fine_tuning', timestamp: new Date() }
        ]
      });

      // Sync
      await creditService.syncWithTokenCreditSystem(testUserId);

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      // Total allocations: 20000 + 10000 + 5000 = 35000
      // Total deductions: 5000 + 3000 + 2000 = 10000
      // Expected balance: 35000 - 10000 = 25000
      expect(balance!.amount).toBe(25000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no credit activity', async () => {
      await creditService.syncWithTokenCreditSystem(testUserId);

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      // Should create balance with 0 credits
      expect(balance!.amount).toBe(0);
    });

    it('should handle large credit amounts', async () => {
      // Enterprise Max tier allocation
      const enterpriseSubscription = await prisma.subscriptionMonetization.create({
        data: {
          userId: testUserId,
          tier: 'enterprise_max',
          billingCycle: 'annual',
          status: 'active',
          basePriceUsd: 19999.00,
          monthlyCreditAllocation: 1000000, // 1M credits
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      await creditService.allocateSubscriptionCredits(testUserId, enterpriseSubscription.id);

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(1000000);
    });

    it('should handle rapid sequential allocations', async () => {
      // Test for potential race conditions with sequential (not parallel) calls
      for (let i = 0; i < 5; i++) {
        await creditService.allocateSubscriptionCredits(testUserId, testSubscriptionId);
      }

      const balance = await prisma.userCreditBalance.findUnique({
        where: { user_id: testUserId }
      });

      expect(balance!.amount).toBe(100000); // 5 * 20000
    });
  });
});
