/**
 * Fractional Credit System Integration Tests
 *
 * Tests Plan 208: Fractional Credit System Migration
 * - Configurable minimum credit increment (0.01, 0.1, 1.0)
 * - Decimal precision for credit calculations
 * - Credit deduction with different increments
 * - API response format with decimal values
 * - Data integrity with Decimal fields
 *
 * Reference: docs/plan/208-fractional-credit-system-migration.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient, Prisma } from '@prisma/client';
import type { Application } from 'express';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import { createTestUser } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';
import { container } from 'tsyringe';
import { CreditDeductionService } from '../../src/services/credit-deduction.service';

describe('Fractional Credit System Integration Tests', () => {
  let prisma: PrismaClient;
  let app: Application;
  let creditDeductionService: CreditDeductionService;
  let authToken: string;
  let userId: string;
  let providerId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();

    const { createApp } = await import('../../src/app');
    app = await createApp();

    // Resolve credit deduction service from DI container
    creditDeductionService = container.resolve(CreditDeductionService);

    // Create test user
    const user = await createTestUser(prisma);
    userId = user.id;
    authToken = await generateTestAccessToken(user);

    // Create test provider with unique name
    const providerName = `openai-test-${Date.now()}`;
    const provider = await prisma.providers.create({
      data: {
        name: providerName,
        api_type: 'rest',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    providerId = provider.id;

    // Create subscription
    const subscription = await prisma.subscription_monetization.create({
      data: {
        user_id: userId,
        tier: 'pro',
        status: 'active',
        credits_per_month: 20000,
        monthly_price_usd: new Prisma.Decimal(19.0),
        billing_interval: 'monthly',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
      },
    });
    subscriptionId = subscription.id;

    // Initialize user credit balance (1000 credits = $10.00)
    await prisma.$executeRaw`
      INSERT INTO user_credit_balance (user_id, amount, last_deduction_at)
      VALUES (${userId}::uuid, 1000.0, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET amount = 1000.0, last_deduction_at = NOW()
    `;

    // Create model pricing
    await prisma.model_provider_pricing.create({
      data: {
        provider_id: providerId,
        model_name: 'gpt-4o-mini',
        input_price_per_1k: new Prisma.Decimal(0.00015),
        output_price_per_1k: new Prisma.Decimal(0.0006),
        is_active: true,
        effective_from: new Date(),
        created_at: new Date(),
      },
    });

    // Load credit increment setting (default: 0.1)
    await creditDeductionService.loadCreditIncrementSetting();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // Reset balance before each test
  beforeEach(async () => {
    await prisma.$executeRaw`
      UPDATE user_credit_balance
      SET amount = 1000.0, last_deduction_at = NOW()
      WHERE user_id = ${userId}::uuid
    `;
  });

  // ===========================================================================
  // Unit Tests: Configurable Rounding Logic
  // ===========================================================================

  describe('Configurable Rounding Logic', () => {
    describe('Increment = 0.1 (Default)', () => {
      beforeEach(async () => {
        await creditDeductionService.updateCreditIncrement(0.1);
      });

      it('should round $0.00006 (0.006 credits) to 0.1 credits', () => {
        const vendorCost = 0.00006; // $0.00006
        const marginMultiplier = 1.0; // No markup for testing
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.1);
      });

      it('should round $0.00009 (0.009 credits) to 0.1 credits', () => {
        const vendorCost = 0.00009;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.1);
      });

      it('should round $0.00011 (0.011 credits) to 0.2 credits', () => {
        const vendorCost = 0.00011;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.2);
      });

      it('should round $0.00099 (0.099 credits) to 0.1 credits', () => {
        const vendorCost = 0.00099;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.1);
      });

      it('should round $0.00101 (0.101 credits) to 0.2 credits', () => {
        const vendorCost = 0.00101;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.2);
      });

      it('should handle exact increment boundary ($0.001 = 0.1 credits)', () => {
        const vendorCost = 0.001;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.1);
      });

      it('should apply 1.5x margin multiplier correctly', () => {
        const vendorCost = 0.00004; // Vendor cost
        const marginMultiplier = 1.5;
        const costWithMultiplier = 0.00006; // $0.00004 × 1.5
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.00006 / 0.001) * 0.1 = Math.ceil(0.06) * 0.1 = 1 * 0.1 = 0.1
        expect(result).toBe(0.1);
      });
    });

    describe('Increment = 0.01 (Fine-grained)', () => {
      beforeEach(async () => {
        await creditDeductionService.updateCreditIncrement(0.01);
      });

      it('should round $0.00006 (0.006 credits) to 0.01 credits', () => {
        const vendorCost = 0.00006;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.00006 / 0.0001) * 0.01 = Math.ceil(0.6) * 0.01 = 1 * 0.01 = 0.01
        expect(result).toBe(0.01);
      });

      it('should round $0.00001 (0.001 credits) to 0.01 credits', () => {
        const vendorCost = 0.00001;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(0.01);
      });

      it('should round $0.00011 (0.011 credits) to 0.02 credits', () => {
        const vendorCost = 0.00011;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.00011 / 0.0001) * 0.01 = Math.ceil(1.1) * 0.01 = 2 * 0.01 = 0.02
        expect(result).toBe(0.02);
      });

      it('should round $0.00099 (0.099 credits) to 0.10 credits', () => {
        const vendorCost = 0.00099;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.00099 / 0.0001) * 0.01 = Math.ceil(9.9) * 0.01 = 10 * 0.01 = 0.10
        expect(result).toBe(0.1);
      });

      it('should apply 1.5x margin multiplier correctly', () => {
        const vendorCost = 0.00004;
        const marginMultiplier = 1.5;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.00006 / 0.0001) * 0.01 = Math.ceil(0.6) * 0.01 = 1 * 0.01 = 0.01
        expect(result).toBe(0.01);
      });
    });

    describe('Increment = 1.0 (Legacy whole-credit behavior)', () => {
      beforeEach(async () => {
        await creditDeductionService.updateCreditIncrement(1.0);
      });

      it('should round $0.00006 (0.006 credits) to 1.0 credit', () => {
        const vendorCost = 0.00006;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.00006 / 0.01) * 1.0 = Math.ceil(0.006) * 1.0 = 1 * 1.0 = 1.0
        expect(result).toBe(1.0);
      });

      it('should round $0.00001 (0.001 credits) to 1.0 credit', () => {
        const vendorCost = 0.00001;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(1.0);
      });

      it('should round $0.005 (0.5 credits) to 1.0 credit', () => {
        const vendorCost = 0.005;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(1.0);
      });

      it('should round $0.0099 (0.99 credits) to 1.0 credit', () => {
        const vendorCost = 0.0099;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        expect(result).toBe(1.0);
      });

      it('should round $0.0101 (1.01 credits) to 2.0 credits', () => {
        const vendorCost = 0.0101;
        const marginMultiplier = 1.0;
        const result = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
        // Math.ceil(0.0101 / 0.01) * 1.0 = Math.ceil(1.01) * 1.0 = 2 * 1.0 = 2.0
        expect(result).toBe(2.0);
      });
    });
  });

  // ===========================================================================
  // Integration Tests: Credit Deduction with Different Increments
  // ===========================================================================

  describe('Credit Deduction with Different Increments', () => {
    const requestId = 'test-request-id-12345678';

    it('should deduct 0.1 credits with default increment (0.1)', async () => {
      await creditDeductionService.updateCreditIncrement(0.1);

      const vendorCost = 0.00004;
      const marginMultiplier = 1.5;
      const creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(0.1);

      const tokenUsageRecord = {
        modelId: 'gpt-4o-mini',
        providerId,
        inputTokens: 8,
        outputTokens: 19,
        cachedInputTokens: 0,
        imageCount: 0,
        imageTokens: 0,
        vendorCost,
        marginMultiplier,
        requestType: 'chat_completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'completed' as const,
        grossMargin: creditsToDeduct * 0.01 - vendorCost,
        inputCredits: 0.05,
        outputCredits: 0.05,
      };

      const result = await creditDeductionService.deductCreditsAtomically(
        userId,
        creditsToDeduct,
        requestId,
        tokenUsageRecord
      );

      expect(result.success).toBe(true);
      expect(result.creditsDeducted).toBe(0.1);
      expect(result.balanceBefore).toBe(1000.0);
      expect(result.balanceAfter).toBe(999.9);
      expect(result.creditsDeductedRounded).toBe(0); // Math.round(0.1) = 0
      expect(result.balanceAfterRounded).toBe(1000); // Math.round(999.9) = 1000
    });

    it('should deduct 0.01 credits with fine-grained increment (0.01)', async () => {
      await creditDeductionService.updateCreditIncrement(0.01);

      const vendorCost = 0.00004;
      const marginMultiplier = 1.5;
      const creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(0.01);

      const tokenUsageRecord = {
        modelId: 'gpt-4o-mini',
        providerId,
        inputTokens: 8,
        outputTokens: 19,
        cachedInputTokens: 0,
        imageCount: 0,
        imageTokens: 0,
        vendorCost,
        marginMultiplier,
        requestType: 'chat_completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'completed' as const,
        grossMargin: creditsToDeduct * 0.01 - vendorCost,
        inputCredits: 0.005,
        outputCredits: 0.005,
      };

      const result = await creditDeductionService.deductCreditsAtomically(
        userId,
        creditsToDeduct,
        requestId + '-01',
        tokenUsageRecord
      );

      expect(result.success).toBe(true);
      expect(result.creditsDeducted).toBe(0.01);
      expect(result.balanceBefore).toBe(1000.0);
      expect(result.balanceAfter).toBe(999.99);
    });

    it('should deduct 1.0 credit with legacy increment (1.0)', async () => {
      await creditDeductionService.updateCreditIncrement(1.0);

      const vendorCost = 0.00004;
      const marginMultiplier = 1.5;
      const creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(1.0);

      const tokenUsageRecord = {
        modelId: 'gpt-4o-mini',
        providerId,
        inputTokens: 8,
        outputTokens: 19,
        cachedInputTokens: 0,
        imageCount: 0,
        imageTokens: 0,
        vendorCost,
        marginMultiplier,
        requestType: 'chat_completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'completed' as const,
        grossMargin: creditsToDeduct * 0.01 - vendorCost,
        inputCredits: 0.5,
        outputCredits: 0.5,
      };

      const result = await creditDeductionService.deductCreditsAtomically(
        userId,
        creditsToDeduct,
        requestId + '-10',
        tokenUsageRecord
      );

      expect(result.success).toBe(true);
      expect(result.creditsDeducted).toBe(1.0);
      expect(result.balanceBefore).toBe(1000.0);
      expect(result.balanceAfter).toBe(999.0);
    });
  });

  // ===========================================================================
  // Decimal Precision Tests
  // ===========================================================================

  describe('Decimal Precision Validation', () => {
    beforeEach(async () => {
      await creditDeductionService.updateCreditIncrement(0.1);
    });

    it('should preserve decimal precision in balance calculations', async () => {
      // Deduct 0.1 credits multiple times
      for (let i = 0; i < 5; i++) {
        const tokenUsageRecord = {
          modelId: 'gpt-4o-mini',
          providerId,
          inputTokens: 8,
          outputTokens: 19,
          cachedInputTokens: 0,
          imageCount: 0,
          imageTokens: 0,
          vendorCost: 0.00006,
          marginMultiplier: 1.0,
          requestType: 'chat_completion' as const,
          requestStartedAt: new Date(),
          requestCompletedAt: new Date(),
          processingTime: 500,
          status: 'completed' as const,
          grossMargin: 0.0,
          inputCredits: 0.05,
          outputCredits: 0.05,
        };

        await creditDeductionService.deductCreditsAtomically(
          userId,
          0.1,
          `precision-test-${i}`,
          tokenUsageRecord
        );
      }

      // Check final balance: 1000.0 - (0.1 × 5) = 999.5
      const balance = await creditDeductionService.getCurrentBalance(userId);
      expect(balance).toBe(999.5);
    });

    it('should handle very small credit amounts without floating point drift', async () => {
      await creditDeductionService.updateCreditIncrement(0.01);

      // Deduct 0.01 credits 100 times
      for (let i = 0; i < 100; i++) {
        const tokenUsageRecord = {
          modelId: 'gpt-4o-mini',
          providerId,
          inputTokens: 1,
          outputTokens: 1,
          cachedInputTokens: 0,
          imageCount: 0,
          imageTokens: 0,
          vendorCost: 0.00001,
          marginMultiplier: 1.0,
          requestType: 'chat_completion' as const,
          requestStartedAt: new Date(),
          requestCompletedAt: new Date(),
          processingTime: 100,
          status: 'completed' as const,
          grossMargin: 0.0,
          inputCredits: 0.005,
          outputCredits: 0.005,
        };

        await creditDeductionService.deductCreditsAtomically(
          userId,
          0.01,
          `drift-test-${i}`,
          tokenUsageRecord
        );
      }

      // Check final balance: 1000.0 - (0.01 × 100) = 999.0
      const balance = await creditDeductionService.getCurrentBalance(userId);
      expect(balance).toBe(999.0);
    });

    it('should handle large balances with decimal precision', async () => {
      // Set large balance: 9,999,999.99 credits
      await prisma.$executeRaw`
        UPDATE user_credit_balance
        SET amount = 9999999.99
        WHERE user_id = ${userId}::uuid
      `;

      const tokenUsageRecord = {
        modelId: 'gpt-4o-mini',
        providerId,
        inputTokens: 8,
        outputTokens: 19,
        cachedInputTokens: 0,
        imageCount: 0,
        imageTokens: 0,
        vendorCost: 0.00006,
        marginMultiplier: 1.0,
        requestType: 'chat_completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'completed' as const,
        grossMargin: 0.0,
        inputCredits: 0.05,
        outputCredits: 0.05,
      };

      const result = await creditDeductionService.deductCreditsAtomically(
        userId,
        0.1,
        'large-balance-test',
        tokenUsageRecord
      );

      expect(result.balanceBefore).toBe(9999999.99);
      expect(result.balanceAfter).toBe(9999999.89);
    });
  });

  // ===========================================================================
  // Switching Increments Mid-Operation
  // ===========================================================================

  describe('Switching Increments Mid-Operation', () => {
    it('should use new increment after cache refresh', async () => {
      // Start with 0.1 increment
      await creditDeductionService.updateCreditIncrement(0.1);

      const vendorCost = 0.00006;
      const marginMultiplier = 1.0;

      let creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(0.1);

      // Switch to 0.01 increment
      await creditDeductionService.updateCreditIncrement(0.01);

      creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(0.01);

      // Switch to 1.0 increment
      await creditDeductionService.updateCreditIncrement(1.0);

      creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(1.0);
    });
  });

  // ===========================================================================
  // Aggregation Query Tests
  // ===========================================================================

  describe('Decimal Aggregation Queries', () => {
    beforeEach(async () => {
      await creditDeductionService.updateCreditIncrement(0.1);

      // Create multiple deductions
      const deductions = [0.1, 0.2, 0.3, 0.5, 1.0]; // Total: 2.1 credits
      for (let i = 0; i < deductions.length; i++) {
        const tokenUsageRecord = {
          modelId: 'gpt-4o-mini',
          providerId,
          inputTokens: 10 * (i + 1),
          outputTokens: 20 * (i + 1),
          cachedInputTokens: 0,
          imageCount: 0,
          imageTokens: 0,
          vendorCost: deductions[i] * 0.01,
          marginMultiplier: 1.0,
          requestType: 'chat_completion' as const,
          requestStartedAt: new Date(),
          requestCompletedAt: new Date(),
          processingTime: 500,
          status: 'completed' as const,
          grossMargin: 0.0,
          inputCredits: deductions[i] / 2,
          outputCredits: deductions[i] / 2,
        };

        await creditDeductionService.deductCreditsAtomically(
          userId,
          deductions[i],
          `aggregation-test-${i}`,
          tokenUsageRecord
        );
      }
    });

    it('should aggregate decimal credits correctly', async () => {
      const result = await prisma.token_usage_ledger.aggregate({
        where: { user_id: userId },
        _sum: { credits_deducted: true },
        _count: true,
      });

      const totalCredits = parseFloat(result._sum.credits_deducted?.toString() || '0');
      expect(totalCredits).toBe(2.1);
      expect(result._count).toBe(5);
    });

    it('should return correct decimal sum for date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const result = await prisma.token_usage_ledger.aggregate({
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { credits_deducted: true },
      });

      const totalCredits = parseFloat(result._sum.credits_deducted?.toString() || '0');
      expect(totalCredits).toBe(2.1);
    });
  });

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await creditDeductionService.updateCreditIncrement(0.1);
    });

    it('should handle very small vendor costs ($0.00001)', async () => {
      const vendorCost = 0.00001;
      const marginMultiplier = 1.0;
      const creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(0.1);
    });

    it('should handle zero vendor cost', async () => {
      const vendorCost = 0.0;
      const marginMultiplier = 1.0;
      const creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);
      expect(creditsToDeduct).toBe(0.0);
    });

    it('should reject insufficient credits with decimal balance', async () => {
      // Set balance to 0.05 credits (less than 0.1 increment)
      await prisma.$executeRaw`
        UPDATE user_credit_balance
        SET amount = 0.05
        WHERE user_id = ${userId}::uuid
      `;

      const tokenUsageRecord = {
        modelId: 'gpt-4o-mini',
        providerId,
        inputTokens: 8,
        outputTokens: 19,
        cachedInputTokens: 0,
        imageCount: 0,
        imageTokens: 0,
        vendorCost: 0.00006,
        marginMultiplier: 1.0,
        requestType: 'chat_completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'completed' as const,
        grossMargin: 0.0,
        inputCredits: 0.05,
        outputCredits: 0.05,
      };

      await expect(
        creditDeductionService.deductCreditsAtomically(
          userId,
          0.1,
          'insufficient-credits-test',
          tokenUsageRecord
        )
      ).rejects.toThrow('Insufficient credits');
    });

    it('should handle exact balance deduction', async () => {
      // Set balance to exactly 0.1 credits
      await prisma.$executeRaw`
        UPDATE user_credit_balance
        SET amount = 0.1
        WHERE user_id = ${userId}::uuid
      `;

      const tokenUsageRecord = {
        modelId: 'gpt-4o-mini',
        providerId,
        inputTokens: 8,
        outputTokens: 19,
        cachedInputTokens: 0,
        imageCount: 0,
        imageTokens: 0,
        vendorCost: 0.00006,
        marginMultiplier: 1.0,
        requestType: 'chat_completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'completed' as const,
        grossMargin: 0.0,
        inputCredits: 0.05,
        outputCredits: 0.05,
      };

      const result = await creditDeductionService.deductCreditsAtomically(
        userId,
        0.1,
        'exact-balance-test',
        tokenUsageRecord
      );

      expect(result.balanceAfter).toBe(0.0);
    });
  });

  // ===========================================================================
  // Validation Tests: Original 40x Markup Issue Fixed
  // ===========================================================================

  describe('Validation: Original 40x Markup Issue Fixed', () => {
    it('should charge 0.1 credits instead of 1.0 for small API calls (Plan 208)', async () => {
      await creditDeductionService.updateCreditIncrement(0.1);

      // Original problem scenario from Plan 208
      const vendorCost = 0.00004; // $0.00004 (8 input + 19 output tokens)
      const marginMultiplier = 1.5; // Pro tier multiplier
      const costWithMultiplier = 0.00006; // $0.00006

      const creditsToDeduct = creditDeductionService.calculateCreditsFromCost(vendorCost, marginMultiplier);

      // OLD BEHAVIOR (UNFAIR): 1.0 credit = $0.01 (40x markup)
      // NEW BEHAVIOR (FAIR): 0.1 credit = $0.001 (4x markup)
      expect(creditsToDeduct).toBe(0.1);
      expect(creditsToDeduct).not.toBe(1.0);

      // Verify effective markup
      const creditValueUSD = creditsToDeduct * 0.01;
      const effectiveMarkup = creditValueUSD / vendorCost;

      // 0.1 credits = $0.001
      // $0.001 / $0.00004 = 25x markup (acceptable with 1.5x multiplier)
      expect(creditValueUSD).toBe(0.001);
      expect(effectiveMarkup).toBeCloseTo(25, 0);
    });
  });
});
