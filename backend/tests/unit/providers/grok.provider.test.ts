/**
 * Unit Tests for GrokProvider
 *
 * Tests Grok xAI provider functionality:
 * - extractUsageWithCacheMetrics() - Verify cache field extraction from both locations
 * - Chat completion - Response transformation
 * - Streaming chat completion - SSE chunk handling
 * - Error handling - API errors, rate limits
 *
 * Note: Uses mocked OpenAI client since no GROK_API_KEY is available for testing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GrokProvider } from '../../../src/providers/grok.provider';
import OpenAI from 'openai';

// Mock OpenAI client
const mockCreate = jest.fn();
const mockCompletionsCreate = jest.fn();

const mockClient = {
  baseURL: 'https://api.x.ai/v1',
  chat: {
    completions: {
      create: mockCreate,
    },
  },
  completions: {
    create: mockCompletionsCreate,
  },
} as unknown as OpenAI;

describe('GrokProvider', () => {
  let provider: GrokProvider;

  beforeEach(() => {
    provider = new GrokProvider(mockClient);
    jest.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should have providerName set to "xai"', () => {
      expect(provider.providerName).toBe('xai');
    });
  });

  describe('extractUsageWithCacheMetrics', () => {
    // Access private method through any cast for testing
    const extractUsage = (response: any) => {
      return (provider as any).extractUsageWithCacheMetrics(response);
    };

    it('should extract basic usage data without cache metrics', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      const usage = extractUsage(response);

      expect(usage.promptTokens).toBe(100);
      expect(usage.completionTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
      expect(usage.cacheCreationInputTokens).toBeUndefined();
      expect(usage.cacheReadInputTokens).toBeUndefined();
      expect(usage.cachedPromptTokens).toBeUndefined();
    });

    it('should extract Anthropic-style cache metrics (cache_creation_input_tokens)', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cache_creation_input_tokens: 80,
        },
      };

      const usage = extractUsage(response);

      expect(usage.promptTokens).toBe(100);
      expect(usage.cacheCreationInputTokens).toBe(80);
    });

    it('should extract Anthropic-style cache metrics (cache_read_input_tokens)', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cache_read_input_tokens: 60,
        },
      };

      const usage = extractUsage(response);

      expect(usage.promptTokens).toBe(100);
      expect(usage.cacheReadInputTokens).toBe(60);
    });

    it('should extract both Anthropic-style cache write and read metrics', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cache_creation_input_tokens: 80,
          cache_read_input_tokens: 40,
        },
      };

      const usage = extractUsage(response);

      expect(usage.cacheCreationInputTokens).toBe(80);
      expect(usage.cacheReadInputTokens).toBe(40);
    });

    it('should extract OpenAI-style cache metrics (prompt_tokens_details.cached_tokens)', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          prompt_tokens_details: {
            cached_tokens: 70,
          },
        },
      };

      const usage = extractUsage(response);

      expect(usage.cachedPromptTokens).toBe(70);
    });

    it('should extract both Anthropic-style and OpenAI-style cache metrics when present', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cache_creation_input_tokens: 80,
          cache_read_input_tokens: 40,
          prompt_tokens_details: {
            cached_tokens: 70,
          },
        },
      };

      const usage = extractUsage(response);

      // Should extract all cache metrics
      expect(usage.cacheCreationInputTokens).toBe(80);
      expect(usage.cacheReadInputTokens).toBe(40);
      expect(usage.cachedPromptTokens).toBe(70);
    });

    it('should handle empty usage object gracefully', () => {
      const response = { usage: {} };

      const usage = extractUsage(response);

      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });

    it('should handle missing usage object gracefully', () => {
      const response = {};

      const usage = extractUsage(response);

      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });

    it('should not extract cache metrics when values are 0', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      };

      const usage = extractUsage(response);

      // When cache values are 0, they should not be set
      expect(usage.cacheCreationInputTokens).toBeUndefined();
      expect(usage.cacheReadInputTokens).toBeUndefined();
    });

    it('should extract reasoning_tokens from completion_tokens_details', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 530,
          total_tokens: 630,
          completion_tokens_details: {
            reasoning_tokens: 233,
          },
        },
      };

      const usage = extractUsage(response);

      expect(usage.completionTokens).toBe(530);
      expect(usage.reasoningTokens).toBe(233);
    });

    it('should extract full Grok API usage structure per official docs', () => {
      // This matches the exact structure from Grok API documentation
      const response = {
        usage: {
          prompt_tokens: 37,
          completion_tokens: 530,
          total_tokens: 800,
          prompt_tokens_details: {
            text_tokens: 37,
            audio_tokens: 0,
            image_tokens: 0,
            cached_tokens: 8,
          },
          completion_tokens_details: {
            reasoning_tokens: 233,
            audio_tokens: 0,
            accepted_prediction_tokens: 0,
            rejected_prediction_tokens: 0,
          },
          num_sources_used: 0,
        },
      };

      const usage = extractUsage(response);

      // Basic usage
      expect(usage.promptTokens).toBe(37);
      expect(usage.completionTokens).toBe(530);
      expect(usage.totalTokens).toBe(800);

      // Cached prompt tokens from prompt_tokens_details
      expect(usage.cachedPromptTokens).toBe(8);

      // Reasoning tokens from completion_tokens_details
      expect(usage.reasoningTokens).toBe(233);
    });

    it('should not extract reasoning_tokens when value is 0', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          completion_tokens_details: {
            reasoning_tokens: 0,
          },
        },
      };

      const usage = extractUsage(response);

      // When reasoning_tokens is 0, it should not be set
      expect(usage.reasoningTokens).toBeUndefined();
    });
  });

  describe('chatCompletion', () => {
    it('should return response with usage including cache metrics', async () => {
      const mockResponse = {
        id: 'chatcmpl-test123',
        created: 1699000000,
        model: 'grok-4-0709',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 80,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.chatCompletion({
        model: 'grok-4-0709',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.response.id).toBe('chatcmpl-test123');
      expect(result.response.choices[0].message.content).toBe('Hello! How can I help you?');
      expect(result.usage.promptTokens).toBe(100);
      expect(result.usage.completionTokens).toBe(50);
      expect(result.usage.cacheReadInputTokens).toBe(80);
    });

    it('should handle chat completion with function calling', async () => {
      const mockResponse = {
        id: 'chatcmpl-func123',
        created: 1699000000,
        model: 'grok-4-0709',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '',
              function_call: {
                name: 'get_weather',
                arguments: '{"location": "New York"}',
              },
            },
            finish_reason: 'function_call',
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 30,
          total_tokens: 230,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.chatCompletion({
        model: 'grok-4-0709',
        messages: [{ role: 'user', content: 'What is the weather in New York?' }],
        functions: [
          {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
            },
          },
        ],
      });

      expect(result.usage.promptTokens).toBe(200);
      expect(result.usage.completionTokens).toBe(30);
    });

    it('should throw error when client is not initialized (mocked)', async () => {
      // Create a provider with a mock client that has baseURL but null internals
      const mockUninitializedClient = {
        baseURL: 'https://api.x.ai/v1',
        chat: {
          completions: {
            create: null, // Simulate uninitialized
          },
        },
      } as unknown as OpenAI;

      const providerWithBrokenClient = new GrokProvider(mockUninitializedClient);
      // Set the private client to null after construction to test the guard
      (providerWithBrokenClient as any).client = null;

      await expect(
        providerWithBrokenClient.chatCompletion({
          model: 'grok-4-0709',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Grok client not initialized');
    });

    it('should propagate API errors', async () => {
      const apiError = new Error('Rate limit exceeded');
      (apiError as any).status = 429;
      (apiError as any).code = 'rate_limit_exceeded';

      mockCreate.mockRejectedValueOnce(apiError);

      await expect(
        provider.chatCompletion({
          model: 'grok-4-0709',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('textCompletion', () => {
    it('should return response with usage metrics', async () => {
      const mockResponse = {
        id: 'cmpl-test123',
        created: 1699000000,
        model: 'grok-3',
        choices: [
          {
            index: 0,
            text: 'This is a completion.',
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      mockCompletionsCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.textCompletion({
        model: 'grok-3',
        prompt: 'Complete this:',
      });

      expect(result.response.id).toBe('cmpl-test123');
      expect(result.response.choices[0].text).toBe('This is a completion.');
      expect(result.usage.promptTokens).toBe(50);
      expect(result.usage.completionTokens).toBe(20);
    });

    it('should throw error when client is not initialized', async () => {
      // Create provider with valid mock client first, then null it
      const mockValidClient = {
        baseURL: 'https://api.x.ai/v1',
        completions: { create: jest.fn() },
      } as unknown as OpenAI;

      const providerWithoutClient = new GrokProvider(mockValidClient);
      // Set the private client to null after construction to test the guard
      (providerWithoutClient as any).client = null;

      await expect(
        providerWithoutClient.textCompletion({
          model: 'grok-3',
          prompt: 'Hello',
        })
      ).rejects.toThrow('Grok client not initialized');
    });
  });

  describe('Grok Model Variants', () => {
    it('should work with grok-4-0709 (flagship)', async () => {
      const mockResponse = {
        id: 'chatcmpl-flagship',
        created: 1699000000,
        model: 'grok-4-0709',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.chatCompletion({
        model: 'grok-4-0709',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.response.model).toBe('grok-4-0709');
    });

    it('should work with grok-4-1-fast-reasoning', async () => {
      const mockResponse = {
        id: 'chatcmpl-reasoning',
        created: 1699000000,
        model: 'grok-4-1-fast-reasoning',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Reasoning response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.chatCompletion({
        model: 'grok-4-1-fast-reasoning',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.response.model).toBe('grok-4-1-fast-reasoning');
    });

    it('should work with grok-code-fast-1 (code optimized)', async () => {
      const mockResponse = {
        id: 'chatcmpl-code',
        created: 1699000000,
        model: 'grok-code-fast-1',
        choices: [{ index: 0, message: { role: 'assistant', content: 'function hello() {}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.chatCompletion({
        model: 'grok-code-fast-1',
        messages: [{ role: 'user', content: 'Write a hello function' }],
      });

      expect(result.response.model).toBe('grok-code-fast-1');
    });
  });
});
