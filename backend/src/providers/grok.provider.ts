/**
 * Grok (xAI) Provider Implementation
 *
 * Handles all xAI Grok-specific API interactions.
 * Uses OpenAI-compatible API format with xAI-specific base URL.
 * Supports both Anthropic-style and OpenAI-style cache metrics extraction.
 */

import { injectable, inject } from 'tsyringe';
import OpenAI from 'openai';
import { Response } from 'express';
import { ILLMProvider, LLMUsageData } from '../interfaces';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
  ChatCompletionResponse,
  TextCompletionResponse,
  ChatCompletionChunk,
  TextCompletionChunk,
} from '../types/model-validation';
import logger from '../utils/logger';
import { countChatTokens, countTokens } from '../utils/tokenCounter';

@injectable()
export class GrokProvider implements ILLMProvider {
  public readonly providerName = 'xai';

  constructor(@inject('GrokClient') private client: OpenAI) {
    logger.debug('GrokProvider: Initialized - ' + this.client.baseURL);
  }

  /**
   * Extracts usage data with cache metrics from Grok API response
   * Handles BOTH Anthropic-style and OpenAI-style cache metric formats
   *
   * Location 1 - Anthropic-style (in usage object directly):
   * {
   *   "usage": {
   *     "prompt_tokens": 100,
   *     "completion_tokens": 50,
   *     "cache_creation_input_tokens": 0,
   *     "cache_read_input_tokens": 80
   *   }
   * }
   *
   * Location 2 - OpenAI-style (in prompt_tokens_details):
   * {
   *   "usage": {
   *     "prompt_tokens": 100,
   *     "prompt_tokens_details": {
   *       "cached_tokens": 80
   *     }
   *   }
   * }
   */
  private extractUsageWithCacheMetrics(response: any): LLMUsageData {
    const usage: LLMUsageData = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    // Check for Anthropic-style cache metrics (direct in usage object)
    if (response.usage) {
      // Cache creation tokens (writes to cache, billed at higher rate)
      if ('cache_creation_input_tokens' in response.usage && response.usage.cache_creation_input_tokens) {
        usage.cacheCreationInputTokens = response.usage.cache_creation_input_tokens;
        logger.debug('GrokProvider: Anthropic-style cache write tokens detected', {
          cacheCreationInputTokens: usage.cacheCreationInputTokens,
        });
      }

      // Cache read tokens (reads from cache, billed at lower rate)
      if ('cache_read_input_tokens' in response.usage && response.usage.cache_read_input_tokens) {
        usage.cacheReadInputTokens = response.usage.cache_read_input_tokens;
        logger.debug('GrokProvider: Anthropic-style cache read tokens detected', {
          cacheReadInputTokens: usage.cacheReadInputTokens,
        });
      }

      // Check for OpenAI-style cache metrics (in prompt_tokens_details)
      // Grok API: prompt_tokens_details.cached_tokens
      if ('prompt_tokens_details' in response.usage) {
        const details = response.usage.prompt_tokens_details;
        if (details && details.cached_tokens) {
          usage.cachedPromptTokens = details.cached_tokens;
          logger.debug('GrokProvider: OpenAI-style cached prompt tokens detected', {
            cachedPromptTokens: usage.cachedPromptTokens,
          });
        }
      }

      // Check for reasoning tokens (in completion_tokens_details)
      // Grok API: completion_tokens_details.reasoning_tokens
      // Note: reasoning_tokens is a breakdown of completionTokens for reasoning models
      if ('completion_tokens_details' in response.usage) {
        const details = response.usage.completion_tokens_details;
        if (details && details.reasoning_tokens) {
          usage.reasoningTokens = details.reasoning_tokens;
          logger.debug('GrokProvider: Reasoning tokens detected', {
            reasoningTokens: usage.reasoningTokens,
          });
        }
      }
    }

    return usage;
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Grok client not initialized. Set GROK_API_KEY environment variable.');
    }

    logger.debug('GrokProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    try {
      const completion = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages as any,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stop: request.stop,
        presence_penalty: request.presence_penalty,
        frequency_penalty: request.frequency_penalty,
        n: request.n,
        functions: request.functions,
        function_call: request.function_call,
      });

      // Extract cache metrics using hybrid approach
      const usage = this.extractUsageWithCacheMetrics(completion);

      return {
        response: {
          id: completion.id,
          object: 'chat.completion',
          created: completion.created,
          model: completion.model,
          choices: completion.choices.map((choice) => ({
            index: choice.index,
            message: {
              role: choice.message.role,
              content: choice.message.content || '',
            },
            finish_reason: choice.finish_reason,
          })),
        },
        usage,
      };
    } catch (error) {
      logger.error('GrokProvider: Chat completion error', {
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<LLMUsageData> {
    if (!this.client) {
      throw new Error('Grok client not initialized');
    }

    logger.debug('GrokProvider: Streaming chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    try {
      // Enable stream_options to get usage data in streaming mode
      const stream = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages as any,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stop: request.stop,
        presence_penalty: request.presence_penalty,
        frequency_penalty: request.frequency_penalty,
        n: request.n,
        stream: true,
        stream_options: { include_usage: true }, // Critical: enables usage data in final chunk
      }) as any;

      let completionText = '';
      let chunkCount = 0;
      let usageData: LLMUsageData | null = null;

      for await (const chunk of stream) {
        chunkCount++;

        // Check if this chunk contains usage information (final chunk with stream_options)
        if (chunk.usage) {
          // Extract cache metrics from final streaming chunk
          usageData = this.extractUsageWithCacheMetrics(chunk);
          logger.debug('GrokProvider: Received usage data in streaming chunk', usageData);
        }

        const chunkData: ChatCompletionChunk = {
          id: chunk.id,
          object: 'chat.completion.chunk',
          created: chunk.created,
          model: chunk.model,
          choices: chunk.choices.map((choice: any) => ({
            index: choice.index,
            delta: {
              role: choice.delta.role,
              content: choice.delta.content || undefined,
            },
            finish_reason: choice.finish_reason,
          })),
        };

        res.write(`data: ${JSON.stringify(chunkData)}\n\n`);

        if (chunk.choices[0]?.delta?.content) {
          completionText += chunk.choices[0].delta.content;
        }
      }

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');

      // Return accurate usage data from API or fallback to estimation
      if (usageData) {
        logger.debug('GrokProvider: Streaming completed (using API usage data)', {
          model: request.model,
          chunkCount,
          completionLength: completionText.length,
          ...usageData,
        });
        return usageData;
      } else {
        // Fallback to token estimation if no usage data provided
        const { promptTokens } = countChatTokens(request.messages, request.model);
        const completionTokens = countTokens(completionText, request.model);
        const totalTokens = promptTokens + completionTokens;

        const estimatedUsage: LLMUsageData = {
          promptTokens,
          completionTokens,
          totalTokens,
        };

        logger.warn('GrokProvider: No usage data in streaming response, using estimation', {
          model: request.model,
          chunkCount,
          completionLength: completionText.length,
          ...estimatedUsage,
        });

        return estimatedUsage;
      }
    } catch (error) {
      logger.error('GrokProvider: Streaming chat completion error', {
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // ============================================================================
  // Text Completion
  // ============================================================================

  async textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Grok client not initialized');
    }

    logger.debug('GrokProvider: Text completion request', {
      model: request.model,
      promptLength: request.prompt.length,
    });

    try {
      const completion = await this.client.completions.create({
        model: request.model,
        prompt: request.prompt,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stop: request.stop,
        presence_penalty: request.presence_penalty,
        frequency_penalty: request.frequency_penalty,
        n: request.n,
      });

      // Extract cache metrics using hybrid approach
      const usage = this.extractUsageWithCacheMetrics(completion);

      return {
        response: {
          id: completion.id,
          object: 'text_completion',
          created: completion.created,
          model: completion.model,
          choices: completion.choices.map((choice) => ({
            text: choice.text,
            index: choice.index,
            finish_reason: choice.finish_reason,
          })),
        },
        usage,
      };
    } catch (error) {
      logger.error('GrokProvider: Text completion error', {
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<LLMUsageData> {
    if (!this.client) {
      throw new Error('Grok client not initialized');
    }

    logger.debug('GrokProvider: Streaming text completion request', {
      model: request.model,
      promptLength: request.prompt.length,
    });

    try {
      const stream = await this.client.completions.create({
        model: request.model,
        prompt: request.prompt,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stop: request.stop,
        stream: true,
      });

      let completionText = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        chunkCount++;

        const chunkData: TextCompletionChunk = {
          id: chunk.id,
          object: 'text_completion.chunk',
          created: chunk.created,
          model: chunk.model,
          choices: chunk.choices.map((choice) => ({
            index: choice.index,
            text: choice.text,
            finish_reason: choice.finish_reason,
          })),
        };

        res.write(`data: ${JSON.stringify(chunkData)}\n\n`);

        if (chunk.choices[0]?.text) {
          completionText += chunk.choices[0].text;
        }
      }

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');

      // Estimate token counts for text completion (no stream_options support in completions endpoint)
      const promptTokens = countTokens(request.prompt, request.model);
      const completionTokens = countTokens(completionText, request.model);
      const totalTokens = promptTokens + completionTokens;

      const usage: LLMUsageData = {
        promptTokens,
        completionTokens,
        totalTokens,
      };

      logger.debug('GrokProvider: Streaming text completion completed (estimated tokens)', {
        model: request.model,
        chunkCount,
        completionLength: completionText.length,
        ...usage,
      });

      return usage;
    } catch (error) {
      logger.error('GrokProvider: Streaming text completion error', {
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
