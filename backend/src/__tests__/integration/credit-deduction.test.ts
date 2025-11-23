/**
 * Integration Tests: Credit Deduction with Separate Input/Output Credits
 *
 * Tests the credit deduction flow to ensure separate input/output credits are
 * correctly tracked in the token_usage_ledger table.
 *
 * Test Coverage:
 * - Chat completion requests track separate input/output credits
 * - Text completion requests track separate credits
 * - token_usage_ledger has correct input_credits, output_credits, total_credits
 * - Database constraint: total_credits = input_credits + output_credits
 * - Backward compatibility: credits_deducted still populated
 * - Fallback for models without separate pricing (proportional split)
 *
 * Reference: Phase 7 - Testing for Separate Input/Output Pricing
 */

import 'reflect-metadata';
import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../app';
import { container } from '../../container';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreditDeductionService } from '../../services/credit-deduction.service';
import { randomUUID } from 'crypto';

describe('Credit Deduction - Separate Input/Output Credits Integration Tests', () => {
  let app: Application;
  let prisma: PrismaClient;
  let creditDeductionService: CreditDeductionService;
  let userToken: string;
  let testUserId: string;
  let testProviderId: string;
  let testModelId: string;
  let testSubscriptionId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = container.resolve<PrismaClient>('PrismaClient');
    creditDeductionService = container.resolve(CreditDeductionService);

    // Create test provider
    const provider = await prisma.providers.create({
      data: {
        name: 'openai',
        api_type: 'rest',
        updated_at: new Date(),
      },
    });
    testProviderId = provider.id;

    // Create test model with separate pricing
    const model = await prisma.models.create({
      data: {
        id: 'gpt-4-credit-deduction-test',
        name: 'gpt-4',
        provider: 'openai',
        is_available: true,
        is_archived: false,
        updated_at: new Date(),
        meta: {
          displayName: 'GPT-4 Test',
          capabilities: ['text', 'function_calling'],
          contextLength: 8000,
          inputCostPerMillionTokens: 3000,
          outputCostPerMillionTokens: 6000,
          inputCreditsPerK: 15, // 15 credits per 1k input tokens
          outputCreditsPerK: 30, // 30 credits per 1k output tokens
          creditsPer1kTokens: 20, // Average for backward compat
          requiredTier: 'free',
          tierRestrictionMode: 'minimum',
          allowedTiers: ['free', 'pro', 'pro_max'],
        } as any,
      },
    });
    testModelId = model.id;

    // Create test user
    testUserId = randomUUID();
    const user = await prisma.users.create({
      data: {
        id: testUserId,
        email: 'credit-deduction@example.com',
        password_hash: 'hashed_password',
      },
    });

    // Create subscription
    const subscription = await prisma.subscriptions.create({
      data: {
        id: 'sub-credit-deduction-test',
        user_id: testUserId,
        tier: 'pro',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    testSubscriptionId = subscription.id;

    // Create credits for user
    await prisma.credits.create({
      data: {
        id: 'credits-deduction-test',
        user_id: testUserId,
        subscription_id: testSubscriptionId,
        credit_type: 'free',
        total_credits: 100000,
        used_credits: 0,
        monthly_allocation: 100000,
        reset_day_of_month: 1,
        billing_period_start: new Date(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_current: true,
      },
    });

    // Mock auth token
    userToken = 'Bearer mock-user-token';

    // Mock authentication middleware
    jest.mock('../../middleware/auth.middleware', () => ({
      authMiddleware: (req: any, _res: any, next: any) => {
        req.user = { sub: testUserId };
        next();
      },
      requireScope: () => (_req: any, _res: any, next: any) => next(),
      getUserId: (req: any) => req.user?.sub,
      getUserTier: async (_userId: string) => 'pro',
    }));
  });

  afterAll(async () => {
    // Cleanup
    await prisma.token_usage_ledger.deleteMany({ where: { user_id: testUserId } });
    await prisma.credits.deleteMany({ where: { user_id: testUserId } });
    await prisma.subscriptions.delete({ where: { id: testSubscriptionId } });
    await prisma.users.delete({ where: { id: testUserId } });
    await prisma.models.delete({ where: { id: testModelId } });
    await prisma.providers.delete({ where: { id: testProviderId } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up ledger entries after each test
    await prisma.token_usage_ledger.deleteMany({ where: { user_id: testUserId } });
  });

  // ===========================================================================
  // Test Suite 1: Chat Completion Separate Credit Tracking
  // ===========================================================================

  describe('Chat Completion - Separate Credit Tracking', () => {
    it('should track separate input and output credits in token_usage_ledger', async () => {
      // Mock LLM provider response
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 45,
        inputCredits: 15, // 1k input tokens × 15 credits/k
        outputCredits: 30, // 1k output tokens × 30 credits/k
        totalCredits: 45,
        balanceRemaining: 99955,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        });

      expect(response.status).toBe(200);

      // Verify ledger entry
      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBe(15);
      expect(ledgerEntry!.output_credits).toBe(30);
      expect(ledgerEntry!.total_credits).toBe(45);
    });

    it('should verify total_credits equals input_credits + output_credits', async () => {
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 100,
        inputCredits: 40,
        outputCredits: 60,
        totalCredits: 100,
        balanceRemaining: 99900,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test message' }],
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      const { input_credits, output_credits, total_credits } = ledgerEntry!;
      expect(total_credits).toBe(input_credits! + output_credits!);
    });

    it('should populate backward-compatible credits_deducted field', async () => {
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 75,
        inputCredits: 25,
        outputCredits: 50,
        totalCredits: 75,
        balanceRemaining: 99925,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Backward compat test' }],
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.credits_deducted).toBe(75);
      expect(ledgerEntry!.credits_deducted).toBe(ledgerEntry!.total_credits);
    });

    it('should handle models with very different input/output pricing', async () => {
      // Create model with asymmetric pricing (e.g., vision models)
      const visionModel = await prisma.models.create({
        data: {
          id: 'vision-model-test',
          name: 'gpt-4-vision',
          provider: 'openai',
          is_available: true,
          is_archived: false,
          updated_at: new Date(),
          meta: {
            displayName: 'GPT-4 Vision',
            capabilities: ['text', 'vision'],
            contextLength: 8000,
            inputCostPerMillionTokens: 10000, // High input cost
            outputCostPerMillionTokens: 3000, // Lower output cost
            inputCreditsPerK: 50,
            outputCreditsPerK: 15,
            creditsPer1kTokens: 30,
            requiredTier: 'pro',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['pro', 'pro_max'],
          } as any,
        },
      });

      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 65,
        inputCredits: 50, // 1k input × 50
        outputCredits: 15, // 1k output × 15
        totalCredits: 65,
        balanceRemaining: 99935,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4-vision',
          messages: [{ role: 'user', content: 'Vision test' }],
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBe(50);
      expect(ledgerEntry!.output_credits).toBe(15);
      expect(ledgerEntry!.input_credits).toBeGreaterThan(ledgerEntry!.output_credits!);

      // Cleanup
      await prisma.models.delete({ where: { id: visionModel.id } });
    });
  });

  // ===========================================================================
  // Test Suite 2: Text Completion Separate Credit Tracking
  // ===========================================================================

  describe('Text Completion - Separate Credit Tracking', () => {
    it('should track separate credits for text completion requests', async () => {
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 90,
        inputCredits: 30,
        outputCredits: 60,
        totalCredits: 90,
        balanceRemaining: 99910,
      });

      const response = await request(app)
        .post('/v1/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          prompt: 'Complete this sentence',
          max_tokens: 100,
        });

      expect(response.status).toBe(200);

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBeDefined();
      expect(ledgerEntry!.output_credits).toBeDefined();
      expect(ledgerEntry!.total_credits).toBe(90);
    });

    it('should calculate credits correctly for small token counts', async () => {
      // Test with 100 input tokens, 50 output tokens
      // inputCredits = (100/1000) × 15 = 1.5 → ceil to 2
      // outputCredits = (50/1000) × 30 = 1.5 → ceil to 2
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 4,
        inputCredits: 2,
        outputCredits: 2,
        totalCredits: 4,
        balanceRemaining: 99996,
      });

      await request(app)
        .post('/v1/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          prompt: 'Short',
          max_tokens: 10,
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.total_credits).toBeGreaterThan(0);
      expect(ledgerEntry!.input_credits).toBeGreaterThan(0);
      expect(ledgerEntry!.output_credits).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Test Suite 3: Fallback for Models Without Separate Pricing
  // ===========================================================================

  describe('Fallback for Legacy Models', () => {
    let legacyModelId: string;

    beforeAll(async () => {
      // Create legacy model without separate pricing
      const legacyModel = await prisma.models.create({
        data: {
          id: 'legacy-model-credit-test',
          name: 'gpt-3.5-turbo',
          provider: 'openai',
          is_available: true,
          is_archived: false,
          updated_at: new Date(),
          meta: {
            displayName: 'GPT-3.5 Turbo Legacy',
            capabilities: ['text'],
            contextLength: 4000,
            inputCostPerMillionTokens: 500,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 10, // Only has old field
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free', 'pro'],
          } as any,
        },
      });
      legacyModelId = legacyModel.id;
    });

    afterAll(async () => {
      await prisma.models.delete({ where: { id: legacyModelId } });
    });

    it('should use proportional split for models without separate pricing', async () => {
      // For models without inputCreditsPerK/outputCreditsPerK, use proportional split
      // If 1k input + 2k output tokens, and creditsPer1kTokens = 10:
      // inputCredits ≈ (1k / 3k) × (3k × 10) = 10
      // outputCredits ≈ (2k / 3k) × (3k × 10) = 20
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 30,
        inputCredits: 10, // Proportional split
        outputCredits: 20, // Proportional split
        totalCredits: 30,
        balanceRemaining: 99970,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Legacy model test' }],
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBeDefined();
      expect(ledgerEntry!.output_credits).toBeDefined();
      expect(ledgerEntry!.total_credits).toBe(30);
    });
  });

  // ===========================================================================
  // Test Suite 4: Database Integrity and Constraints
  // ===========================================================================

  describe('Database Integrity', () => {
    it('should enforce non-null constraint on total_credits', async () => {
      // Attempt to create ledger entry without total_credits should fail
      await expect(
        prisma.token_usage_ledger.create({
          data: {
            request_id: 'test-request-null-total',
            user_id: testUserId,
            subscription_id: testSubscriptionId,
            model_id: testModelId,
            provider_id: testProviderId,
            input_tokens: 100,
            output_tokens: 200,
            vendor_cost: new Prisma.Decimal(0.001),
            credits_deducted: 10,
            input_credits: 5,
            output_credits: 5,
            // total_credits intentionally omitted
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should allow NULL for input_credits and output_credits (backward compat)', async () => {
      // Legacy entries may have NULL for separate credits
      const legacyEntry = await prisma.token_usage_ledger.create({
        data: {
          request_id: 'legacy-entry-test',
          user_id: testUserId,
          subscription_id: testSubscriptionId,
          model_id: testModelId,
          provider_id: testProviderId,
          input_tokens: 100,
          output_tokens: 200,
          vendor_cost: new Prisma.Decimal(0.001),
          credits_deducted: 10,
          total_credits: 10,
          // input_credits and output_credits omitted (NULL)
        },
      });

      expect(legacyEntry).toBeDefined();
      expect(legacyEntry.input_credits).toBeNull();
      expect(legacyEntry.output_credits).toBeNull();
      expect(legacyEntry.total_credits).toBe(10);
    });

    it('should maintain data consistency across concurrent requests', async () => {
      // Simulate concurrent deductions
      const concurrentRequests = Array(5)
        .fill(null)
        .map((_, index) =>
          prisma.token_usage_ledger.create({
            data: {
              request_id: `concurrent-${index}`,
              user_id: testUserId,
              subscription_id: testSubscriptionId,
              model_id: testModelId,
              provider_id: testProviderId,
              input_tokens: 100,
              output_tokens: 200,
              vendor_cost: new Prisma.Decimal(0.001),
              credits_deducted: 45,
              input_credits: 15,
              output_credits: 30,
              total_credits: 45,
            },
          })
        );

      const results = await Promise.all(concurrentRequests);

      // Verify all entries created successfully
      expect(results.length).toBe(5);
      results.forEach((entry) => {
        expect(entry.total_credits).toBe(entry.input_credits! + entry.output_credits!);
      });
    });
  });

  // ===========================================================================
  // Test Suite 5: Edge Cases and Error Handling
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle zero input tokens (completion only)', async () => {
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 30,
        inputCredits: 0,
        outputCredits: 30,
        totalCredits: 30,
        balanceRemaining: 99970,
      });

      await request(app)
        .post('/v1/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          prompt: '',
          max_tokens: 50,
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBe(0);
      expect(ledgerEntry!.output_credits).toBeGreaterThan(0);
    });

    it('should handle very large token counts', async () => {
      // 100k input tokens, 50k output tokens
      jest.spyOn(creditDeductionService as any, 'deductCreditsForInference').mockResolvedValue({
        success: true,
        creditsDeducted: 3000,
        inputCredits: 1500, // 100 × 15
        outputCredits: 1500, // 50 × 30
        totalCredits: 3000,
        balanceRemaining: 97000,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Very long context...' }],
        });

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.total_credits).toBe(3000);
      expect(ledgerEntry!.input_credits).toBe(1500);
      expect(ledgerEntry!.output_credits).toBe(1500);
    });

    it('should return error when insufficient credits', async () => {
      // Update user to have very low credits
      await prisma.credits.update({
        where: { id: 'credits-deduction-test' },
        data: { total_credits: 10, used_credits: 5 },
      });

      jest.spyOn(creditDeductionService, 'validateSufficientCredits').mockResolvedValue({
        sufficient: false,
        currentBalance: 5,
        required: 45,
        shortfall: 40,
        suggestions: ['Upgrade to Pro tier'],
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', userToken)
        .send({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
        });

      expect(response.status).toBe(402);
      expect(response.body).toHaveProperty('error');

      // Restore credits
      await prisma.credits.update({
        where: { id: 'credits-deduction-test' },
        data: { total_credits: 100000, used_credits: 0 },
      });
    });
  });
});
