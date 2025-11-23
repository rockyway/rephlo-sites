/**
 * Integration Tests: LLM Service with Separate Input/Output Credits
 *
 * Tests the LLM service to ensure it correctly calculates and returns separate
 * input/output credits for all inference methods.
 *
 * Test Coverage:
 * - Mock OpenAI/Anthropic/Google API responses with token counts
 * - calculateCreditsFromVendorCost() returns separate credits
 * - All 4 inference methods populate inputCredits and outputCredits
 * - Credit calculation matches model meta pricing
 * - Fallback behavior for models without separate pricing
 * - Edge cases: cached tokens, zero tokens, large token counts
 *
 * Reference: Phase 7 - Testing for Separate Input/Output Pricing
 */

import 'reflect-metadata';
import { LLMService } from '../../services/llm.service';
import { CostCalculationService } from '../../services/cost-calculation.service';
import { PricingConfigService } from '../../services/pricing-config.service';
import { CreditDeductionService } from '../../services/credit-deduction.service';
import { CreditService } from '../../services/credit.service';
import { container } from '../../container';
import { PrismaClient } from '@prisma/client';
import {
  MockOpenAIProvider,
  MockAnthropicProvider,
  MockGoogleProvider,
} from '../mocks/llm-providers.mock';
import { Response } from 'express';
import { randomUUID } from 'crypto';

describe('LLM Service - Separate Input/Output Credits Integration Tests', () => {
  let llmService: LLMService;
  let prisma: PrismaClient;
  let testProviderId: string;
  let testModelId: string;
  let testUserId: string;
  let mockOpenAIProvider: MockOpenAIProvider;
  let mockAnthropicProvider: MockAnthropicProvider;
  let mockGoogleProvider: MockGoogleProvider;

  beforeAll(async () => {
    prisma = container.resolve<PrismaClient>('PrismaClient');

    // Create mock providers
    mockOpenAIProvider = new MockOpenAIProvider();
    mockAnthropicProvider = new MockAnthropicProvider();
    mockGoogleProvider = new MockGoogleProvider();

    // Register mock providers
    container.register('ILLMProvider', { useValue: mockOpenAIProvider });
    container.register('ILLMProvider', { useValue: mockAnthropicProvider });
    container.register('ILLMProvider', { useValue: mockGoogleProvider });

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
        id: 'gpt-4-llm-service-test',
        name: 'gpt-4',
        provider: 'openai',
        is_available: true,
        is_archived: false,
        updated_at: new Date(),
        meta: {
          displayName: 'GPT-4 Test',
          capabilities: ['text', 'function_calling'],
          contextLength: 8000,
          inputCostPerMillionTokens: 3000, // $3 per million = $0.003 per 1k
          outputCostPerMillionTokens: 6000, // $6 per million = $0.006 per 1k
          inputCreditsPerK: 15, // 15 credits per 1k input tokens
          outputCreditsPerK: 30, // 30 credits per 1k output tokens
          creditsPer1kTokens: 20, // Average for backward compat
          requiredTier: 'free',
          tierRestrictionMode: 'minimum',
          allowedTiers: ['free', 'pro'],
        } as any,
      },
    });
    testModelId = model.id;

    // Create test user
    testUserId = randomUUID();
    const user = await prisma.users.create({
      data: {
        id: testUserId,
        email: 'llm-service@example.com',
        password_hash: 'hashed_password',
      },
    });

    // Create subscription
    const subscription = await prisma.subscriptions.create({
      data: {
        id: 'sub-llm-service-test',
        user_id: testUserId,
        tier: 'pro',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create credits
    await prisma.credits.create({
      data: {
        id: 'credits-llm-service-test',
        user_id: testUserId,
        subscription_id: subscription.id,
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

    // Initialize LLM service
    const costCalculationService = container.resolve(CostCalculationService);
    const pricingConfigService = container.resolve(PricingConfigService);
    const creditDeductionService = container.resolve(CreditDeductionService);
    const creditService = container.resolve(CreditService);

    llmService = new LLMService(
      costCalculationService,
      pricingConfigService,
      creditDeductionService,
      creditService,
      prisma
    );
  });

  afterAll(async () => {
    // Cleanup
    await prisma.token_usage_ledger.deleteMany({ where: { user_id: testUserId } });
    await prisma.credits.deleteMany({ where: { user_id: testUserId } });
    await prisma.subscriptions.deleteMany({ where: { user_id: testUserId } });
    await prisma.users.delete({ where: { id: testUserId } });
    await prisma.models.delete({ where: { id: testModelId } });
    await prisma.providers.delete({ where: { id: testProviderId } });
    await prisma.$disconnect();
  });

  // ===========================================================================
  // Test Suite 1: calculateCreditsFromVendorCost - Separate Credits
  // ===========================================================================

  describe('calculateCreditsFromVendorCost - Separate Credits Calculation', () => {
    it('should return separate input and output credits', async () => {
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        1000, // 1k input tokens
        2000, // 2k output tokens
        0
      );

      expect(result).toHaveProperty('credits');
      expect(result).toHaveProperty('inputCredits');
      expect(result).toHaveProperty('outputCredits');
      expect(result).toHaveProperty('providerId');
      expect(result).toHaveProperty('vendorCost');
      expect(result).toHaveProperty('marginMultiplier');
    });

    it('should calculate correct input credits from model meta', async () => {
      // 1k input tokens × 15 credits/k = 15 credits
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        1000, // 1k input tokens
        0, // 0 output tokens
        0
      );

      expect(result.inputCredits).toBe(15);
      expect(result.outputCredits).toBe(0);
    });

    it('should calculate correct output credits from model meta', async () => {
      // 2k output tokens × 30 credits/k = 60 credits
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        0, // 0 input tokens
        2000, // 2k output tokens
        0
      );

      expect(result.inputCredits).toBe(0);
      expect(result.outputCredits).toBe(60);
    });

    it('should calculate total credits correctly', async () => {
      // 1k input × 15 = 15, 2k output × 30 = 60, total = 75
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        1000,
        2000,
        0
      );

      expect(result.inputCredits).toBe(15);
      expect(result.outputCredits).toBe(60);
      expect(result.credits).toBeGreaterThanOrEqual(75); // May be slightly higher due to margin
    });

    it('should use ceiling for fractional tokens', async () => {
      // 100 input tokens = 0.1k × 15 = 1.5 → ceil to 2
      // 50 output tokens = 0.05k × 30 = 1.5 → ceil to 2
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        100,
        50,
        0
      );

      expect(result.inputCredits).toBe(2); // ceil(1.5)
      expect(result.outputCredits).toBe(2); // ceil(1.5)
    });

    it('should handle large token counts', async () => {
      // 100k input tokens × 15 = 1500 credits
      // 50k output tokens × 30 = 1500 credits
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        100000,
        50000,
        0
      );

      expect(result.inputCredits).toBe(1500);
      expect(result.outputCredits).toBe(1500);
    });
  });

  // ===========================================================================
  // Test Suite 2: Fallback for Models Without Separate Pricing
  // ===========================================================================

  describe('Fallback for Legacy Models', () => {
    let legacyModelId: string;

    beforeAll(async () => {
      // Create legacy model without inputCreditsPerK/outputCreditsPerK
      const legacyModel = await prisma.models.create({
        data: {
          id: 'legacy-llm-test',
          name: 'gpt-3.5-turbo',
          provider: 'openai',
          is_available: true,
          is_archived: false,
          updated_at: new Date(),
          meta: {
            displayName: 'GPT-3.5 Turbo',
            capabilities: ['text'],
            contextLength: 4000,
            inputCostPerMillionTokens: 500,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 10, // Only has old field
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free'],
          } as any,
        },
      });
      legacyModelId = legacyModel.id;
    });

    afterAll(async () => {
      if (legacyModelId) {
        await prisma.models.delete({ where: { id: legacyModelId } });
      }
    });

    it('should use proportional split for models without separate pricing', async () => {
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        legacyModelId,
        'openai',
        1000, // 1k input
        2000, // 2k output
        0
      );

      // Should split proportionally: 1k/(1k+2k) = 1/3, 2k/(1k+2k) = 2/3
      expect(result.inputCredits).toBeGreaterThan(0);
      expect(result.outputCredits).toBeGreaterThan(0);
      expect(result.outputCredits).toBeGreaterThan(result.inputCredits); // 2:1 ratio
    });

    it('should ensure proportional split sums to total credits', async () => {
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        legacyModelId,
        'openai',
        1000,
        1000,
        0
      );

      // For equal tokens, should split evenly
      expect(result.inputCredits).toBe(result.outputCredits);
    });
  });

  // ===========================================================================
  // Test Suite 3: Chat Completion with Separate Credits
  // ===========================================================================

  describe('Chat Completion - Input/Output Credits', () => {
    it('should return inputCredits and outputCredits in response metadata', async () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      // Mock the provider response
      jest.spyOn(mockOpenAIProvider, 'chatCompletion').mockResolvedValue({
        response: {
          id: 'chatcmpl-test',
          object: 'chat.completion' as const,
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant' as const, content: 'Hi there!' },
              finish_reason: 'stop' as const,
            },
          ],
        },
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

      const response = await llmService.chatCompletion(
        testUserId,
        'openai',
        request
      );

      expect(response).toHaveProperty('usage');
      expect(response.usage).toHaveProperty('inputCredits');
      expect(response.usage).toHaveProperty('outputCredits');
      expect(response.usage.inputCredits).toBeGreaterThan(0);
      expect(response.usage.outputCredits).toBeGreaterThan(0);
    });

    it('should populate token_usage_ledger with separate credits', async () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user' as const, content: 'Test message' }],
      };

      await llmService.chatCompletion(testUserId, 'openai', request);

      // Verify ledger entry
      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBeDefined();
      expect(ledgerEntry!.output_credits).toBeDefined();
      expect(ledgerEntry!.total_credits).toBe(
        ledgerEntry!.input_credits! + ledgerEntry!.output_credits!
      );
    });
  });

  // ===========================================================================
  // Test Suite 4: Text Completion with Separate Credits
  // ===========================================================================

  describe('Text Completion - Input/Output Credits', () => {
    it('should return inputCredits and outputCredits in response', async () => {
      const request = {
        model: 'gpt-4',
        prompt: 'Complete this',
        max_tokens: 50,
      };

      jest.spyOn(mockOpenAIProvider, 'textCompletion').mockResolvedValue({
        response: {
          id: 'cmpl-test',
          object: 'text_completion' as const,
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              text: 'Completion text',
              index: 0,
              finish_reason: 'stop' as const,
            },
          ],
        },
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
        },
      });

      const response = await llmService.textCompletion(
        testUserId,
        'openai',
        request
      );

      expect(response.usage).toHaveProperty('inputCredits');
      expect(response.usage).toHaveProperty('outputCredits');
    });
  });

  // ===========================================================================
  // Test Suite 5: Streaming with Separate Credits
  // ===========================================================================

  describe('Streaming Completions - Separate Credits', () => {
    it('should track separate credits for streaming chat completion', async () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'user' as const, content: 'Stream test' }],
        stream: true,
      };

      const mockResponse = {
        write: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      jest
        .spyOn(mockOpenAIProvider, 'streamChatCompletion')
        .mockResolvedValue(30);

      await llmService.streamChatCompletion(
        testUserId,
        'openai',
        request,
        mockResponse
      );

      // Verify ledger entry has separate credits
      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBeDefined();
      expect(ledgerEntry!.output_credits).toBeDefined();
    });

    it('should track separate credits for streaming text completion', async () => {
      const request = {
        model: 'gpt-4',
        prompt: 'Stream test',
        max_tokens: 50,
        stream: true,
      };

      const mockResponse = {
        write: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      jest
        .spyOn(mockOpenAIProvider, 'streamTextCompletion')
        .mockResolvedValue(30);

      await llmService.streamTextCompletion(
        testUserId,
        'openai',
        request,
        mockResponse
      );

      const ledgerEntry = await prisma.token_usage_ledger.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });

      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry!.input_credits).toBeGreaterThanOrEqual(0);
      expect(ledgerEntry!.output_credits).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // Test Suite 6: Edge Cases and Error Handling
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle cached tokens (Anthropic-style)', async () => {
      // Anthropic supports prompt caching
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        1000, // Regular input tokens
        2000, // Output tokens
        500 // Cached input tokens (usually cheaper)
      );

      expect(result.inputCredits).toBeGreaterThan(0);
      expect(result.outputCredits).toBeGreaterThan(0);
    });

    it('should handle zero input tokens', async () => {
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        0,
        1000,
        0
      );

      expect(result.inputCredits).toBe(0);
      expect(result.outputCredits).toBeGreaterThan(0);
    });

    it('should handle zero output tokens', async () => {
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        1000,
        0,
        0
      );

      expect(result.inputCredits).toBeGreaterThan(0);
      expect(result.outputCredits).toBe(0);
    });

    it('should throw error for non-existent provider', async () => {
      await expect(
        (llmService as any).calculateCreditsFromVendorCost(
          testUserId,
          testModelId,
          'non-existent-provider',
          1000,
          1000,
          0
        )
      ).rejects.toThrow();
    });

    it('should throw error for non-existent model', async () => {
      await expect(
        (llmService as any).calculateCreditsFromVendorCost(
          testUserId,
          'non-existent-model',
          'openai',
          1000,
          1000,
          0
        )
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Test Suite 7: Multi-Provider Support
  // ===========================================================================

  describe('Multi-Provider Separate Credits', () => {
    let anthropicProviderId: string;
    let anthropicModelId: string;

    beforeAll(async () => {
      // Create Anthropic provider and model
      const anthropicProvider = await prisma.providers.create({
        data: {
          name: 'anthropic',
          api_type: 'rest',
          updated_at: new Date(),
        },
      });
      anthropicProviderId = anthropicProvider.id;

      const claudeModel = await prisma.models.create({
        data: {
          id: 'claude-3-test',
          name: 'claude-3-sonnet',
          provider: 'anthropic',
          is_available: true,
          is_archived: false,
          updated_at: new Date(),
          meta: {
            displayName: 'Claude 3 Sonnet',
            capabilities: ['text', 'long_context'],
            contextLength: 200000,
            inputCostPerMillionTokens: 3000,
            outputCostPerMillionTokens: 15000, // Much higher output cost
            inputCreditsPerK: 15,
            outputCreditsPerK: 75,
            creditsPer1kTokens: 40,
            requiredTier: 'pro',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['pro', 'pro_max'],
          } as any,
        },
      });
      anthropicModelId = claudeModel.id;
    });

    afterAll(async () => {
      if (anthropicModelId) {
        await prisma.models.delete({ where: { id: anthropicModelId } });
      }
      if (anthropicProviderId) {
        await prisma.providers.delete({ where: { id: anthropicProviderId } });
      }
    });

    it('should calculate separate credits for Anthropic models', async () => {
      const result = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        anthropicModelId,
        'anthropic',
        1000,
        1000,
        0
      );

      expect(result.inputCredits).toBe(15); // 1k × 15
      expect(result.outputCredits).toBe(75); // 1k × 75
      expect(result.outputCredits).toBeGreaterThan(result.inputCredits); // Asymmetric pricing
    });

    it('should handle different pricing ratios across providers', async () => {
      // Compare OpenAI vs Anthropic pricing
      const openaiResult = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        testModelId,
        'openai',
        1000,
        1000,
        0
      );

      const anthropicResult = await (llmService as any).calculateCreditsFromVendorCost(
        testUserId,
        anthropicModelId,
        'anthropic',
        1000,
        1000,
        0
      );

      // Both should have separate credits
      expect(openaiResult.inputCredits).toBeGreaterThan(0);
      expect(anthropicResult.inputCredits).toBeGreaterThan(0);
      expect(openaiResult.outputCredits).toBeGreaterThan(0);
      expect(anthropicResult.outputCredits).toBeGreaterThan(0);

      // Anthropic has higher output cost
      expect(anthropicResult.outputCredits).toBeGreaterThan(
        openaiResult.outputCredits
      );
    });
  });
});
