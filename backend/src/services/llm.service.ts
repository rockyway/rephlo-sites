/**
 * LLM Service (Refactored with DI)
 *
 * Orchestrates LLM inference across multiple providers.
 * Uses Strategy Pattern to delegate provider-specific work.
 *
 * Responsibilities:
 * - Route requests to correct provider
 * - Calculate credit costs
 * - Record usage
 * - Handle errors
 *
 * Does NOT handle:
 * - Provider-specific API calls (delegated to providers)
 * - Direct SDK interactions (providers handle this)
 */

import { injectable, inject, injectAll } from 'tsyringe';
import { Response } from 'express';
import { ILLMProvider } from '../interfaces';
import {
  TextCompletionRequest,
  ChatCompletionRequest,
  TextCompletionResponse,
  ChatCompletionResponse,
} from '../types/model-validation';
import { UsageRecorder } from './llm/usage-recorder';
import logger from '../utils/logger';

@injectable()
export class LLMService {
  private providerMap: Map<string, ILLMProvider>;

  constructor(
    @inject(UsageRecorder) private usageRecorder: UsageRecorder,
    @injectAll('ILLMProvider') allProviders: ILLMProvider[]
  ) {
    // Build provider map for O(1) lookup
    this.providerMap = new Map(
      allProviders.map((p) => [p.providerName, p])
    );

    logger.info('LLMService: Initialized with providers', {
      providers: Array.from(this.providerMap.keys()),
    });
  }

  /**
   * Get provider by name
   * @throws Error if provider not found
   */
  private getProvider(providerName: string): ILLMProvider {
    const provider = this.providerMap.get(providerName);
    if (!provider) {
      throw new Error(
        `Unsupported provider: ${providerName}. Available: ${Array.from(
          this.providerMap.keys()
        ).join(', ')}`
      );
    }
    return provider;
  }

  // ============================================================================
  // Chat Completion Operations
  // ============================================================================

  async chatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string
  ): Promise<ChatCompletionResponse> {
    logger.debug('LLMService: Chat completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
      messagesCount: request.messages.length,
    });

    const provider = this.getProvider(modelProvider);
    const startTime = Date.now();

    try {
      // 1. Delegate to provider (Strategy Pattern)
      const { response, usage } = await provider.chatCompletion(request);

      // 2. Business logic (credit calculation)
      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil(
        (usage.total_tokens / 1000) * creditsPer1kTokens
      );

      const finalResponse: ChatCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          credits_used: creditsUsed,
        },
      };

      logger.info('LLMService: Chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.total_tokens,
        credits: creditsUsed,
      });

      // 3. Cross-cutting concerns (usage recording)
      await this.usageRecorder.recordUsage({
        userId,
        modelId: request.model,
        operation: 'chat',
        usage: finalResponse.usage,
        durationMs: duration,
        requestMetadata: {
          provider: modelProvider,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          messages_count: request.messages.length,
        },
      });

      return finalResponse;
    } catch (error) {
      logger.error('LLMService: Chat completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleProviderError(error, modelProvider);
    }
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string,
    res: Response
  ): Promise<void> {
    logger.debug('LLMService: Streaming chat completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const provider = this.getProvider(modelProvider);
    const startTime = Date.now();

    try {
      // 1. Delegate to provider
      const totalTokens = await provider.streamChatCompletion(request, res);

      // 2. Business logic
      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

      logger.info('LLMService: Streaming chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        credits: creditsUsed,
      });

      // 3. Cross-cutting concerns
      await this.usageRecorder.recordUsage({
        userId,
        modelId: request.model,
        operation: 'chat',
        usage: {
          prompt_tokens: Math.ceil(totalTokens * 0.3),
          completion_tokens: Math.ceil(totalTokens * 0.7),
          total_tokens: totalTokens,
          credits_used: creditsUsed,
        },
        durationMs: duration,
        requestMetadata: {
          provider: modelProvider,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          messages_count: request.messages.length,
          streaming: true,
        },
      });

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      logger.error('LLMService: Streaming chat completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const errorMessage = this.getErrorMessage(error, modelProvider);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  // ============================================================================
  // Text Completion Operations
  // ============================================================================

  async textCompletion(
    request: TextCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string
  ): Promise<TextCompletionResponse> {
    logger.debug('LLMService: Text completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
    });

    const provider = this.getProvider(modelProvider);
    const startTime = Date.now();

    try {
      const { response, usage } = await provider.textCompletion(request);

      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil(
        (usage.total_tokens / 1000) * creditsPer1kTokens
      );

      const finalResponse: TextCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          credits_used: creditsUsed,
        },
      };

      logger.info('LLMService: Text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.total_tokens,
        credits: creditsUsed,
      });

      await this.usageRecorder.recordUsage({
        userId,
        modelId: request.model,
        operation: 'completion',
        usage: finalResponse.usage,
        durationMs: duration,
        requestMetadata: {
          provider: modelProvider,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
        },
      });

      return finalResponse;
    } catch (error) {
      logger.error('LLMService: Text completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleProviderError(error, modelProvider);
    }
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string,
    res: Response
  ): Promise<void> {
    logger.debug('LLMService: Streaming text completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const provider = this.getProvider(modelProvider);
    const startTime = Date.now();

    try {
      const totalTokens = await provider.streamTextCompletion(request, res);

      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

      logger.info('LLMService: Streaming text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        credits: creditsUsed,
      });

      await this.usageRecorder.recordUsage({
        userId,
        modelId: request.model,
        operation: 'completion',
        usage: {
          prompt_tokens: Math.ceil(totalTokens * 0.3),
          completion_tokens: Math.ceil(totalTokens * 0.7),
          total_tokens: totalTokens,
          credits_used: creditsUsed,
        },
        durationMs: duration,
        requestMetadata: {
          provider: modelProvider,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          streaming: true,
        },
      });

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      logger.error('LLMService: Streaming text completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const errorMessage = this.getErrorMessage(error, modelProvider);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleProviderError(error: any, provider: string): Error {
    let message = 'LLM inference request failed';

    if (error instanceof Error) {
      message = error.message;
    }

    if (provider === 'openai' && error.status) {
      message = `OpenAI API error (${error.status}): ${message}`;
    } else if (provider === 'azure-openai' && error.status) {
      message = `Azure OpenAI API error (${error.status}): ${message}`;
    } else if (provider === 'anthropic' && error.status) {
      message = `Anthropic API error (${error.status}): ${message}`;
    } else if (provider === 'google') {
      message = `Google AI API error: ${message}`;
    }

    return new Error(message);
  }

  private getErrorMessage(error: any, provider: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    return `${provider} API error`;
  }
}

// ============================================================================
// Factory Function (Backward Compatibility)
// ============================================================================

import { container } from '../container';

/**
 * @deprecated Use container.resolve(LLMService) instead
 * This factory function is kept for backward compatibility during migration
 */
export function createLLMService(): LLMService {
  return container.resolve(LLMService);
}
