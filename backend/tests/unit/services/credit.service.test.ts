import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { CreditService } from '../../../src/services/credit.service';
import { getTestDatabase, cleanDatabase } from '../../setup/database';
import { createTestUser, createTestSubscription, createTestCredits } from '../../helpers/factories';
import { AppError } from '../../../src/utils/errors';

describe('CreditService', () => {
  let prisma: PrismaClient;
  let creditService: CreditService;

  beforeEach(async () => {
    prisma = getTestDatabase();
    creditService = new CreditService();
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('getCurrentCredits', () => {
    it('should return current credits for user', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 25000,
      });

      const result = await creditService.getCurrentCredits(user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(credits.id);
      expect(result.totalCredits).toBe(100000);
      expect(result.usedCredits).toBe(25000);
      expect(result.remainingCredits).toBe(75000);
    });

    it('should throw error if user has no credits', async () => {
      const user = await createTestUser(prisma);

      await expect(creditService.getCurrentCredits(user.id)).rejects.toThrow(AppError);
      await expect(creditService.getCurrentCredits(user.id)).rejects.toThrow('No active credits');
    });

    it('should return only current period credits', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);

      // Create old credits (not current)
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 50000,
        usedCredits: 50000,
        isCurrent: false,
      });

      // Create current credits
      const currentCredits = await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 10000,
        isCurrent: true,
      });

      const result = await creditService.getCurrentCredits(user.id);

      expect(result.id).toBe(currentCredits.id);
      expect(result.totalCredits).toBe(100000);
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits successfully', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 10000,
      });

      await creditService.deductCredits(user.id, 5000);

      const updated = await prisma.credits.findUnique({ where: { id: credits.id } });

      expect(updated?.usedCredits).toBe(15000);
    });

    it('should throw error if insufficient credits', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 98000,
      });

      await expect(creditService.deductCredits(user.id, 5000)).rejects.toThrow(AppError);
      await expect(creditService.deductCredits(user.id, 5000)).rejects.toThrow('Insufficient credits');
    });

    it('should be atomic (no partial deductions)', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 99000,
      });

      const initialUsed = credits.usedCredits;

      try {
        await creditService.deductCredits(user.id, 2000);
      } catch (error) {
        // Expected to fail
      }

      const updated = await prisma.credits.findUnique({ where: { id: credits.id } });

      // Credits should not be partially deducted
      expect(updated?.usedCredits).toBe(initialUsed);
    });

    it('should handle concurrent deductions correctly', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 10000,
        usedCredits: 0,
      });

      // Simulate concurrent deductions
      const deductions = [
        creditService.deductCredits(user.id, 3000),
        creditService.deductCredits(user.id, 3000),
        creditService.deductCredits(user.id, 3000),
      ];

      await Promise.all(deductions);

      const updated = await prisma.credits.findUnique({ where: { id: credits.id } });

      expect(updated?.usedCredits).toBe(9000);
    });
  });

  describe('checkSufficientCredits', () => {
    it('should return true when credits are sufficient', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 10000,
      });

      const result = await creditService.checkSufficientCredits(user.id, 5000);

      expect(result).toBe(true);
    });

    it('should return false when credits are insufficient', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 98000,
      });

      const result = await creditService.checkSufficientCredits(user.id, 5000);

      expect(result).toBe(false);
    });

    it('should return false if user has no credits', async () => {
      const user = await createTestUser(prisma);

      const result = await creditService.checkSufficientCredits(user.id, 1000);

      expect(result).toBe(false);
    });
  });

  describe('allocateCredits', () => {
    it('should allocate new credits for subscription', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);

      const credits = await creditService.allocateCredits(user.id, subscription.id, 100000);

      expect(credits).toBeDefined();
      expect(credits.userId).toBe(user.id);
      expect(credits.subscriptionId).toBe(subscription.id);
      expect(credits.totalCredits).toBe(100000);
      expect(credits.usedCredits).toBe(0);
      expect(credits.isCurrent).toBe(true);
    });

    it('should mark old credits as not current', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);

      const oldCredits = await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 50000,
        isCurrent: true,
      });

      await creditService.allocateCredits(user.id, subscription.id, 100000);

      const updated = await prisma.credits.findUnique({ where: { id: oldCredits.id } });

      expect(updated?.isCurrent).toBe(false);
    });
  });

  describe('getCreditUsagePercentage', () => {
    it('should calculate usage percentage correctly', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 25000,
      });

      const percentage = await creditService.getCreditUsagePercentage(user.id);

      expect(percentage).toBe(25);
    });

    it('should return 0 for no usage', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 0,
      });

      const percentage = await creditService.getCreditUsagePercentage(user.id);

      expect(percentage).toBe(0);
    });

    it('should return 100 for fully used credits', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      await createTestCredits(prisma, user.id, subscription.id, {
        totalCredits: 100000,
        usedCredits: 100000,
      });

      const percentage = await creditService.getCreditUsagePercentage(user.id);

      expect(percentage).toBe(100);
    });
  });
});
