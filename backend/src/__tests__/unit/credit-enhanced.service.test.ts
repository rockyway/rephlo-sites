/**
 * Unit Tests for Enhanced CreditService (Phase 2)
 *
 * Tests for new methods:
 * - getFreeCreditsBreakdown
 * - getProCreditsBreakdown
 * - getDetailedCredits
 * - calculateDaysUntilReset
 */

import 'reflect-metadata';
import { Credit } from '@prisma/client';
import { createTestContainer, resetTestContainer, getMockServices } from '../test-container';
import { MockCreditService } from '../mocks/credit.service.mock';
import { DependencyContainer } from 'tsyringe';

describe('CreditService - Enhanced Methods (Phase 2)', () => {
  let testContainer: DependencyContainer;
  let creditService: MockCreditService;

  beforeEach(() => {
    testContainer = createTestContainer();
    const mocks = getMockServices(testContainer);
    creditService = mocks.creditService;
  });

  afterEach(() => {
    creditService.clear();
    resetTestContainer(testContainer);
  });

  // Free Credits Tests
  describe('getFreeCreditsBreakdown', () => {
    it('should return free credits breakdown for existing user', async () => {
      const mockCredit: Partial<Credit> = {
        id: 'credit-1',
        userId: 'user-1',
        creditType: 'free',
        totalCredits: 2000,
        usedCredits: 500,
        monthlyAllocation: 2000,
        billingPeriodStart: new Date('2025-11-01'),
        billingPeriodEnd: new Date('2025-12-01'),
        isCurrent: true,
        resetDayOfMonth: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      creditService.seed([mockCredit as Credit]);
      const result = await creditService.getFreeCreditsBreakdown('user-1');

      expect(result.remaining).toBe(1500);
      expect(result.monthlyAllocation).toBe(2000);
      expect(result.used).toBe(500);
    });

    it('should return defaults when no free credits exist', async () => {
      const result = await creditService.getFreeCreditsBreakdown('user-1');

      expect(result.remaining).toBe(0);
      expect(result.monthlyAllocation).toBe(2000);
      expect(result.used).toBe(0);
    });
  });

  // Pro Credits Tests
  describe('getProCreditsBreakdown', () => {
    it('should aggregate multiple pro credit records', async () => {
      const mockProCredits: Partial<Credit>[] = [
        {
          id: 'pro-1',
          userId: 'user-1',
          creditType: 'pro',
          totalCredits: 5000,
          usedCredits: 2000,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          isCurrent: true,
          monthlyAllocation: 0,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pro-2',
          userId: 'user-1',
          creditType: 'pro',
          totalCredits: 5000,
          usedCredits: 3000,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          isCurrent: true,
          monthlyAllocation: 0,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(mockProCredits as Credit[]);
      const result = await creditService.getProCreditsBreakdown('user-1');

      expect(result.purchasedTotal).toBe(10000);
      expect(result.lifetimeUsed).toBe(5000);
      expect(result.remaining).toBe(5000);
    });

    it('should return zeros when no pro credits exist', async () => {
      const result = await creditService.getProCreditsBreakdown('user-1');

      expect(result.remaining).toBe(0);
      expect(result.purchasedTotal).toBe(0);
      expect(result.lifetimeUsed).toBe(0);
    });
  });

  // Detailed Credits Tests
  describe('getDetailedCredits', () => {
    it('should combine free and pro credits', async () => {
      const credits: Partial<Credit>[] = [
        {
          id: 'free-1',
          userId: 'user-1',
          creditType: 'free',
          totalCredits: 2000,
          usedCredits: 500,
          monthlyAllocation: 2000,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date('2025-12-01'),
          isCurrent: true,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pro-1',
          userId: 'user-1',
          creditType: 'pro',
          totalCredits: 10000,
          usedCredits: 5000,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          isCurrent: true,
          monthlyAllocation: 0,
          resetDayOfMonth: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      creditService.seed(credits as Credit[]);
      const result = await creditService.getDetailedCredits('user-1');

      expect(result.totalAvailable).toBe(6500); // 1500 free + 5000 pro
      expect(result.freeCredits.remaining).toBe(1500);
      expect(result.proCredits.remaining).toBe(5000);
    });

    it('should handle user with no credits', async () => {
      const result = await creditService.getDetailedCredits('user-1');

      expect(result.totalAvailable).toBe(0);
      expect(result.freeCredits.remaining).toBe(0);
      expect(result.proCredits.remaining).toBe(0);
    });
  });

  // calculateDaysUntilReset Tests
  describe('calculateDaysUntilReset', () => {
    it('should calculate correct days until reset', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const days = creditService.calculateDaysUntilReset(futureDate);

      expect(days).toBeGreaterThanOrEqual(9);
      expect(days).toBeLessThanOrEqual(11);
    });

    it('should return 0 for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const days = creditService.calculateDaysUntilReset(pastDate);

      expect(days).toBe(0);
    });
  });
});
