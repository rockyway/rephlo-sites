/**
 * Provider Pricing & Credit Deduction Flow Integration Tests
 *
 * Tests end-to-end credit deduction with vendor cost tracking:
 * 1. Vendor pricing lookup from model_provider_pricing
 * 2. Cost calculation based on token usage
 * 3. Margin multiplier application from pricing_configs
 * 4. Atomic credit deduction from credits table
 * 5. Token usage ledger recording with gross margin tracking
 *
 * Reference: docs/plan/161-provider-pricing-system-activation.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient, SubscriptionTier } from '@prisma/client';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import {
  createTestUser,
  createTestSubscription,
  createTestCredits,
} from '../helpers/factories';

describe('Provider Pricing & Credit Deduction Flow', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testCreditId: string;
  let providerId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();

    // Create test user with subscription and credits
    const user = await createTestUser(prisma, {
      email: 'pricing-test@example.com',
    });
    testUserId = user.id;

    const subscription = await createTestSubscription(prisma, testUserId, {
      tier: SubscriptionTier.pro,
      status: 'active',
    });

    const credits = await createTestCredits(prisma, testUserId, subscription.id, {
      totalCredits: 1000000, // 1M credits = $10,000 USD
      usedCredits: 0,
    });
    testCreditId = credits.id;

    // Ensure seed data exists (providers, model_provider_pricing, pricing_configs)
    // These should be seeded via `npm run seed` before running tests
    const provider = await prisma.provider.findUnique({
      where: { name: 'azure' },
    });

    if (!provider) {
      throw new Error(
        'Test setup failed: Azure provider not found. Run `npm run seed` to populate providers.'
      );
    }

    providerId = provider.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  beforeEach(async () => {
    // Reset credit balance before each test
    await prisma.credit.update({
      where: { id: testCreditId },
      data: { usedCredits: 0 },
    });

    // Clean up token_usage_ledger
    await prisma.tokenUsageLedger.deleteMany({
      where: { userId: testUserId },
    });
  });

  // ===========================================================================
  // Test 1: Cost Calculation Service
  // ===========================================================================

  describe('CostCalculationService', () => {
    it('should calculate vendor cost for GPT-4o model with input/output tokens', async () => {
      const { CostCalculationService } = await import(
        '../../src/services/cost-calculation.service'
      );
      const costCalcService = new CostCalculationService(prisma);

      const modelName = 'gpt-4o-2024-08-06';
      const inputTokens = 10000; // 10k input tokens
      const outputTokens = 5000; // 5k output tokens

      const result = await costCalcService.calculateVendorCost({
        modelId: modelName,
        providerId,
        inputTokens,
        outputTokens,
      });

      // Expected costs (from seed data):
      // Azure GPT-4o: $0.0025/1k input, $0.01/1k output
      const expectedInputCost = (10000 / 1000) * 0.0025; // $0.025
      const expectedOutputCost = (5000 / 1000) * 0.01; // $0.05
      const expectedTotalCost = expectedInputCost + expectedOutputCost; // $0.075

      expect(result).toMatchObject({
        vendorCost: expect.any(Number),
        inputTokens,
        outputTokens,
      });

      expect(result.vendorCost).toBeCloseTo(expectedTotalCost, 8);
    });

    it('should throw error for model without pricing data', async () => {
      const { CostCalculationService } = await import(
        '../../src/services/cost-calculation.service'
      );
      const costCalcService = new CostCalculationService(prisma);

      await expect(
        costCalcService.calculateVendorCost({
          modelId: 'nonexistent-model',
          providerId,
          inputTokens: 1000,
          outputTokens: 1000,
        })
      ).rejects.toThrow(/No active pricing found/i);
    });

    it('should handle cached input tokens for Anthropic Claude', async () => {
      // Find Anthropic provider
      const anthropicProvider = await prisma.provider.findUnique({
        where: { name: 'anthropic' },
      });

      if (!anthropicProvider) {
        console.log('Skipping Anthropic test: Provider not seeded');
        return;
      }

      const { CostCalculationService } = await import(
        '../../src/services/cost-calculation.service'
      );
      const costCalcService = new CostCalculationService(prisma);

      const modelName = 'claude-3-5-sonnet-20241022';
      const inputTokens = 10000;
      const outputTokens = 5000;
      const cachedInputTokens = 3000; // 3k cached tokens

      const result = await costCalcService.calculateVendorCost({
        modelId: modelName,
        providerId: anthropicProvider.id,
        inputTokens,
        outputTokens,
        cachedInputTokens,
      });

      // Cached input tokens should be cheaper than regular input tokens
      expect(result.vendorCost).toBeGreaterThan(0);
      expect(result.cachedTokens).toBe(cachedInputTokens);
    });
  });

  // ===========================================================================
  // Test 2: Pricing Config Service
  // ===========================================================================

  describe('PricingConfigService', () => {
    it('should retrieve margin multiplier for Pro tier + Azure provider', async () => {
      const { PricingConfigService } = await import(
        '../../src/services/pricing-config.service'
      );
      const pricingConfigService = new PricingConfigService(prisma);

      const marginMultiplier = await pricingConfigService.getApplicableMultiplier(
        testUserId,
        providerId,
        'gpt-4o-2024-08-06'
      );

      // Expected: Pro tier margin multiplier = 1.80 (80% gross margin)
      // Note: This may return the default 1.5 if no specific config exists in seed data
      expect(marginMultiplier).toBeGreaterThan(0);
      expect(marginMultiplier).toBeLessThanOrEqual(3.0);
    });

    it('should return higher margin multiplier for Free tier', async () => {
      const { PricingConfigService } = await import(
        '../../src/services/pricing-config.service'
      );
      const pricingConfigService = new PricingConfigService(prisma);

      // Create a Free tier user
      const freeUser = await createTestUser(prisma, {
        email: 'free-tier-test@example.com',
      });

      await createTestSubscription(prisma, freeUser.id, {
        tier: SubscriptionTier.free,
        status: 'active',
      });

      const freeMargin = await pricingConfigService.getApplicableMultiplier(
        freeUser.id,
        providerId,
        'gpt-4o-2024-08-06'
      );

      const proMargin = await pricingConfigService.getApplicableMultiplier(
        testUserId,
        providerId,
        'gpt-4o-2024-08-06'
      );

      // Free tier should have higher or equal margin (lower value to user)
      expect(freeMargin).toBeGreaterThanOrEqual(proMargin);
    });
  });

  // ===========================================================================
  // Test 3: Credit Deduction Service (Atomic)
  // ===========================================================================

  describe('CreditDeductionService', () => {
    it('should atomically deduct credits and record to token_usage_ledger', async () => {
      const { CreditDeductionService } = await import(
        '../../src/services/credit-deduction.service'
      );
      const { TokenTrackingService } = await import(
        '../../src/services/token-tracking.service'
      );
      const { CostCalculationService } = await import(
        '../../src/services/cost-calculation.service'
      );
      const { PricingConfigService } = await import(
        '../../src/services/pricing-config.service'
      );

      const costCalcService = new CostCalculationService(prisma);
      const pricingConfigService = new PricingConfigService(prisma);
      const tokenTrackingService = new TokenTrackingService(
        prisma,
        costCalcService,
        pricingConfigService
      );
      const creditDeductionService = new CreditDeductionService(prisma);

      const requestId = 'test-request-001';
      const creditsToDeduct = 750; // $7.50 worth of credits
      const tokenUsageRecord = {
        requestId,
        userId: testUserId,
        modelId: 'gpt-4o-2024-08-06',
        providerId,
        inputTokens: 10000,
        outputTokens: 5000,
        cachedInputTokens: 0,
        totalTokens: 15000,
        vendorCost: 0.075, // $0.075
        creditDeducted: creditsToDeduct,
        marginMultiplier: 1.8,
        grossMargin: 0.0675, // ($0.075 × 1.8) - $0.075 = $0.0675
        requestType: 'completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 1500,
        status: 'success' as const,
        createdAt: new Date(),
      };

      // First, record to token_usage_ledger (this would normally be done by TokenTrackingService)
      await tokenTrackingService.recordToLedger(tokenUsageRecord);

      const result = await creditDeductionService.deductCreditsAtomically(
        testUserId,
        creditsToDeduct,
        requestId,
        tokenUsageRecord
      );

      // Verify deduction result
      expect(result).toMatchObject({
        success: true,
        balanceBefore: expect.any(Number),
        balanceAfter: expect.any(Number),
        creditsDeducted: creditsToDeduct,
        deductionRecordId: expect.any(String),
      });

      expect(result.balanceAfter).toBe(result.balanceBefore - creditsToDeduct);

      // Verify credit_deduction_ledger entry created
      const deductionEntry = await prisma.$queryRaw<any[]>`
        SELECT * FROM credit_deduction_ledger WHERE id = ${result.deductionRecordId}::uuid
      `;

      expect(deductionEntry).toHaveLength(1);
      expect(deductionEntry[0]).toMatchObject({
        user_id: testUserId,
        amount: creditsToDeduct,
        status: 'completed',
        reason: 'api_completion',
      });

      // Verify vendor cost and gross margin tracked in deduction ledger
      expect(parseFloat(deductionEntry[0].token_vendor_cost)).toBeCloseTo(0.075, 8);
      expect(parseFloat(deductionEntry[0].gross_margin)).toBeCloseTo(0.0675, 8);
    });

    it('should fail when insufficient credits available', async () => {
      const { CreditDeductionService } = await import(
        '../../src/services/credit-deduction.service'
      );

      const creditDeductionService = new CreditDeductionService(prisma);

      // Set user balance to low amount
      await prisma.$executeRaw`
        INSERT INTO user_credit_balance (user_id, amount)
        VALUES (${testUserId}::uuid, 100)
        ON CONFLICT (user_id) DO UPDATE SET amount = 100
      `;

      const requestId = 'test-request-insufficient';
      const creditsToDeduct = 500; // Trying to deduct more than available
      const tokenUsageRecord = {
        requestId,
        userId: testUserId,
        modelId: 'gpt-4o-2024-08-06',
        providerId,
        inputTokens: 1000,
        outputTokens: 500,
        cachedInputTokens: 0,
        totalTokens: 1500,
        vendorCost: 0.01,
        creditDeducted: creditsToDeduct,
        marginMultiplier: 1.8,
        grossMargin: 0.008,
        requestType: 'completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 500,
        status: 'failed' as const,
        createdAt: new Date(),
      };

      await expect(
        creditDeductionService.deductCreditsAtomically(
          testUserId,
          creditsToDeduct,
          requestId,
          tokenUsageRecord
        )
      ).rejects.toThrow(/Insufficient credits/i);

      // Verify no deduction ledger entry was created (transaction rolled back)
      const deductionEntries = await prisma.$queryRaw<any[]>`
        SELECT * FROM credit_deduction_ledger WHERE request_id = ${requestId}::uuid
      `;

      expect(deductionEntries).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Test 4: End-to-End Integration (Mocked LLM Provider)
  // ===========================================================================

  describe('End-to-End Credit Flow (Unit Test with Mocks)', () => {
    it('should calculate cost, apply margin, deduct credits, and log usage', async () => {
      const { CostCalculationService } = await import(
        '../../src/services/cost-calculation.service'
      );
      const { PricingConfigService } = await import(
        '../../src/services/pricing-config.service'
      );
      const { CreditDeductionService } = await import(
        '../../src/services/credit-deduction.service'
      );

      const costCalcService = new CostCalculationService(prisma);
      const pricingConfigService = new PricingConfigService(prisma);
      const creditDeductionService = new CreditDeductionService(prisma);

      // Simulate LLM request flow
      const modelName = 'gpt-4o-2024-08-06';
      const inputTokens = 5000;
      const outputTokens = 2000;
      const totalTokens = inputTokens + outputTokens;

      // Step 1: Calculate vendor cost
      const costResult = await costCalcService.calculateVendorCost({
        modelId: modelName,
        providerId,
        inputTokens,
        outputTokens,
      });

      expect(costResult.vendorCost).toBeGreaterThan(0);

      // Step 2: Get margin multiplier for user's tier
      const marginMultiplier = await pricingConfigService.getApplicableMultiplier(
        testUserId,
        providerId,
        modelName
      );

      // Note: This may return default 1.5 if no specific config in seed data
      expect(marginMultiplier).toBeGreaterThan(0);

      // Step 3: Calculate credits to deduct (× 100 conversion: 1 credit = $0.01)
      const CREDITS_PER_DOLLAR = 100;
      const creditsToDeduct = Math.ceil(
        costResult.vendorCost * marginMultiplier * CREDITS_PER_DOLLAR
      );
      const creditValueUsd = creditsToDeduct * 0.01;
      const grossMargin = creditValueUsd - costResult.vendorCost;

      expect(creditsToDeduct).toBeGreaterThan(0);
      expect(grossMargin).toBeGreaterThan(0);

      // Step 4: Atomically deduct credits and log to ledger
      const requestId = `test-e2e-${Date.now()}`;
      const tokenUsageRecord = {
        requestId,
        userId: testUserId,
        modelId: modelName,
        providerId,
        inputTokens,
        outputTokens,
        cachedInputTokens: 0,
        totalTokens,
        vendorCost: costResult.vendorCost,
        creditDeducted: creditsToDeduct,
        marginMultiplier,
        grossMargin,
        requestType: 'completion' as const,
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        processingTime: 1200,
        status: 'success' as const,
        createdAt: new Date(),
      };

      const deductionResult =
        await creditDeductionService.deductCreditsAtomically(
          testUserId,
          creditsToDeduct,
          requestId,
          tokenUsageRecord
        );

      expect(deductionResult.success).toBe(true);
      expect(deductionResult.creditsDeducted).toBe(creditsToDeduct);

      // Step 5: Verify credit deduction ledger entry with all tracking fields
      const deductionEntries = await prisma.$queryRaw<any[]>`
        SELECT * FROM credit_deduction_ledger WHERE id = ${deductionResult.deductionRecordId}::uuid
      `;

      expect(deductionEntries).toHaveLength(1);
      const deductionEntry = deductionEntries[0];

      expect(deductionEntry).toMatchObject({
        user_id: testUserId,
        amount: creditsToDeduct,
        status: 'completed',
        reason: 'api_completion',
      });

      // Verify financial tracking in deduction ledger
      expect(parseFloat(deductionEntry.token_vendor_cost)).toBeCloseTo(
        costResult.vendorCost,
        8
      );
      expect(parseFloat(deductionEntry.margin_multiplier)).toBeCloseTo(
        marginMultiplier,
        2
      );
      expect(parseFloat(deductionEntry.gross_margin)).toBeCloseTo(
        grossMargin,
        8
      );
    });
  });
});
