/**
 * Unit Tests for LLM Service - Credit Info in API Responses
 *
 * Tests the new feature that includes credit balance information in completion responses:
 * - Non-streaming completions: credit info in response body
 * - Streaming completions: credit info in final chunk
 *
 * Feature Reference: docs/reference/191-desktop-client-credit-api-migration-guide.md
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LLMService } from '../../../src/services/llm.service';
import { PrismaClient } from '@prisma/client';
import type {
  ICostCalculationService,
  IPricingConfigService,
  ICreditDeductionService,
  ICreditService,
  DetailedCreditsInfo,
  FreeCreditsInfo,
  ProCreditsInfo
} from '../../../src/interfaces';
import type { Response } from 'express';
import { Readable } from 'stream';

// =============================================================================
// Mock Data
// =============================================================================

const mockUserId = 'test-user-123';
const mockModelId = 'gpt-5-mini';
const mockProviderId = 'azure-openai';

const mockCreditInfo: DetailedCreditsInfo = {
  freeCredits: {
    remaining: 0,
    monthlyAllocation: 200,
    used: 200,
    resetDate: new Date('2025-12-01'),
    daysUntilReset: 13,
  },
  proCredits: {
    subscriptionCredits: {
      remaining: 1450,
      monthlyAllocation: 1500,
      used: 50,
      resetDate: new Date('2025-12-01'),
      daysUntilReset: 13,
    },
    purchasedCredits: {
      remaining: 0,
      totalPurchased: 0,
      lifetimeUsed: 0,
    },
    totalRemaining: 1450,
  },
  totalAvailable: 1450,
  lastUpdated: new Date(),
};

const mockPricingData = {
  providerId: mockProviderId,
  credits: 25,
  vendorCost: 0.00125,
  marginMultiplier: 1.5,
  grossMargin: 0.000625,
};

// =============================================================================
// Mock Services
// =============================================================================

const mockCostCalculationService: jest.Mocked<ICostCalculationService> = {
  calculateCreditsFromVendorCost: jest.fn().mockResolvedValue(mockPricingData),
  estimateCreditsForRequest: jest.fn().mockResolvedValue(25),
} as any;

const mockPricingConfigService: jest.Mocked<IPricingConfigService> = {
  getProviderIdByModelId: jest.fn().mockResolvedValue(mockProviderId),
  getProviderPricing: jest.fn().mockResolvedValue({
    inputCostPerMillionTokens: 1.0,
    outputCostPerMillionTokens: 2.0,
  }),
} as any;

const mockCreditDeductionService: jest.Mocked<ICreditDeductionService> = {
  deductCreditsAtomically: jest.fn().mockResolvedValue({
    id: 'credit-record-123',
    userId: mockUserId,
    amount: 1450,
  }),
  estimateCreditsForRequest: jest.fn().mockResolvedValue(25),
  validateSufficientCredits: jest.fn().mockResolvedValue({
    sufficient: true,
    currentBalance: 1450,
    shortfall: 0,
  }),
} as any;

const mockCreditService: jest.Mocked<ICreditService> = {
  getDetailedCredits: jest.fn().mockResolvedValue(mockCreditInfo),
} as any;

const mockPrismaClient = {
  $transaction: jest.fn(),
} as any;

// Mock LLM provider
const mockProvider = {
  chatCompletion: jest.fn().mockResolvedValue({
    response: {
      id: 'chat-completion-123',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: mockModelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a test response',
          },
          finish_reason: 'stop',
        },
      ],
    },
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
  }),
  textCompletion: jest.fn().mockResolvedValue({
    response: {
      id: 'text-completion-123',
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: mockModelId,
      choices: [
        {
          index: 0,
          text: 'This is a test response',
          finish_reason: 'stop',
        },
      ],
    },
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
  }),
  streamChatCompletion: jest.fn().mockResolvedValue(150), // Return total tokens
  streamTextCompletion: jest.fn().mockResolvedValue(150), // Return total tokens
};

// =============================================================================
// Test Suite
// =============================================================================

describe('LLMService - Credit Info in Responses', () => {
  let llmService: LLMService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create LLMService instance with mocked dependencies
    llmService = new LLMService(
      mockCostCalculationService,
      mockPricingConfigService,
      mockCreditDeductionService,
      mockCreditService,
      mockPrismaClient
    );

    // Inject mock provider
    (llmService as any).providerMap = new Map([[mockProviderId, mockProvider]]);
  });

  // ===========================================================================
  // Non-Streaming Chat Completion
  // ===========================================================================

  describe('chatCompletion - Non-Streaming', () => {
    it('should include credit info in response', async () => {
      const request = {
        model: mockModelId,
        messages: [{ role: 'user' as const, content: 'Hello' }],
        max_tokens: 100,
        temperature: 0.7,
        stream: false,
      };

      const response = await llmService.chatCompletion(
        request,
        mockProviderId,
        mockUserId
      );

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.usage).toBeDefined();
      expect(response.usage.credits).toBeDefined();

      // Verify credit info fields
      expect(response.usage.credits).toEqual({
        deducted: mockPricingData.credits,
        remaining: mockCreditInfo.totalAvailable,
        subscriptionRemaining: mockCreditInfo.proCredits.subscriptionCredits.remaining,
        purchasedRemaining: mockCreditInfo.proCredits.purchasedCredits.remaining,
      });

      // Verify CreditService was called
      expect(mockCreditService.getDetailedCredits).toHaveBeenCalledWith(mockUserId);
    });

    it('should include usage information', async () => {
      const request = {
        model: mockModelId,
        messages: [{ role: 'user' as const, content: 'Test' }],
        stream: false,
      };

      const response = await llmService.chatCompletion(
        request,
        mockProviderId,
        mockUserId
      );

      expect(response.usage.promptTokens).toBe(100);
      expect(response.usage.completionTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
      expect(response.usage.creditsUsed).toBe(mockPricingData.credits);
    });
  });

  // ===========================================================================
  // Non-Streaming Text Completion
  // ===========================================================================

  describe('textCompletion - Non-Streaming', () => {
    it('should include credit info in response', async () => {
      const request = {
        model: mockModelId,
        prompt: 'Hello, world!',
        max_tokens: 100,
        temperature: 0.7,
        stream: false,
      };

      const response = await llmService.textCompletion(
        request,
        mockProviderId,
        mockUserId
      );

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.usage).toBeDefined();
      expect(response.usage.credits).toBeDefined();

      // Verify credit info fields
      expect(response.usage.credits).toEqual({
        deducted: mockPricingData.credits,
        remaining: mockCreditInfo.totalAvailable,
        subscriptionRemaining: mockCreditInfo.proCredits.subscriptionCredits.remaining,
        purchasedRemaining: mockCreditInfo.proCredits.purchasedCredits.remaining,
      });

      // Verify CreditService was called
      expect(mockCreditService.getDetailedCredits).toHaveBeenCalledWith(mockUserId);
    });
  });

  // ===========================================================================
  // Streaming Chat Completion
  // ===========================================================================

  describe('streamChatCompletion - Streaming', () => {
    it('should send final chunk with credit info', async () => {
      const request = {
        model: mockModelId,
        messages: [{ role: 'user' as const, content: 'Hello' }],
        stream: true,
      };

      // Mock response object
      const writtenChunks: string[] = [];
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn((chunk: string) => {
          writtenChunks.push(chunk);
        }),
        end: jest.fn(),
      } as unknown as Response;

      await llmService.streamChatCompletion(
        request,
        mockProviderId,
        mockUserId,
        mockResponse
      );

      // Verify headers were set
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

      // Find final chunk (second to last, before [DONE])
      const finalChunkLine = writtenChunks[writtenChunks.length - 2];
      expect(finalChunkLine).toMatch(/^data: /);

      // Parse final chunk
      const finalChunkJson = finalChunkLine.replace('data: ', '').trim();
      const finalChunk = JSON.parse(finalChunkJson);

      // Verify final chunk structure
      expect(finalChunk.object).toBe('chat.completion.chunk');
      expect(finalChunk.usage).toBeDefined();
      expect(finalChunk.usage.credits).toBeDefined();

      // Verify credit info in final chunk
      expect(finalChunk.usage.credits).toEqual({
        deducted: mockPricingData.credits,
        remaining: mockCreditInfo.totalAvailable,
        subscriptionRemaining: mockCreditInfo.proCredits.subscriptionCredits.remaining,
        purchasedRemaining: mockCreditInfo.proCredits.purchasedCredits.remaining,
      });

      // Verify [DONE] marker was sent
      const doneMarker = writtenChunks[writtenChunks.length - 1];
      expect(doneMarker).toBe('data: [DONE]\n\n');

      // Verify CreditService was called
      expect(mockCreditService.getDetailedCredits).toHaveBeenCalledWith(mockUserId);
    });
  });

  // ===========================================================================
  // Streaming Text Completion
  // ===========================================================================

  describe('streamTextCompletion - Streaming', () => {
    it('should send final chunk with credit info', async () => {
      const request = {
        model: mockModelId,
        prompt: 'Hello, world!',
        stream: true,
      };

      // Mock response object
      const writtenChunks: string[] = [];
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn((chunk: string) => {
          writtenChunks.push(chunk);
        }),
        end: jest.fn(),
      } as unknown as Response;

      await llmService.streamTextCompletion(
        request,
        mockProviderId,
        mockUserId,
        mockResponse
      );

      // Find final chunk (second to last, before [DONE])
      const finalChunkLine = writtenChunks[writtenChunks.length - 2];
      const finalChunkJson = finalChunkLine.replace('data: ', '').trim();
      const finalChunk = JSON.parse(finalChunkJson);

      // Verify final chunk structure
      expect(finalChunk.object).toBe('text_completion.chunk');
      expect(finalChunk.usage).toBeDefined();
      expect(finalChunk.usage.credits).toBeDefined();

      // Verify credit info in final chunk
      expect(finalChunk.usage.credits).toEqual({
        deducted: mockPricingData.credits,
        remaining: mockCreditInfo.totalAvailable,
        subscriptionRemaining: mockCreditInfo.proCredits.subscriptionCredits.remaining,
        purchasedRemaining: mockCreditInfo.proCredits.purchasedCredits.remaining,
      });

      // Verify CreditService was called
      expect(mockCreditService.getDetailedCredits).toHaveBeenCalledWith(mockUserId);
    });
  });

  // ===========================================================================
  // Credit Info Structure Validation
  // ===========================================================================

  describe('Credit Info Structure', () => {
    it('should have correct credit info types', async () => {
      const request = {
        model: mockModelId,
        messages: [{ role: 'user' as const, content: 'Test' }],
        stream: false,
      };

      const response = await llmService.chatCompletion(
        request,
        mockProviderId,
        mockUserId
      );

      const credits = response.usage.credits!;

      // Verify all fields are numbers
      expect(typeof credits.deducted).toBe('number');
      expect(typeof credits.remaining).toBe('number');
      expect(typeof credits.subscriptionRemaining).toBe('number');
      expect(typeof credits.purchasedRemaining).toBe('number');

      // Verify values are non-negative
      expect(credits.deducted).toBeGreaterThanOrEqual(0);
      expect(credits.remaining).toBeGreaterThanOrEqual(0);
      expect(credits.subscriptionRemaining).toBeGreaterThanOrEqual(0);
      expect(credits.purchasedRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total remaining correctly', async () => {
      const request = {
        model: mockModelId,
        messages: [{ role: 'user' as const, content: 'Test' }],
        stream: false,
      };

      const response = await llmService.chatCompletion(
        request,
        mockProviderId,
        mockUserId
      );

      const credits = response.usage.credits!;

      // Verify remaining = subscriptionRemaining + purchasedRemaining
      expect(credits.remaining).toBe(
        credits.subscriptionRemaining + credits.purchasedRemaining
      );
    });
  });
});
