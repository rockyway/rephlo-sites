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

import { injectable, inject, container as diContainer } from 'tsyringe';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ILLMProvider, ICostCalculationService, IPricingConfigService } from '../interfaces';
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
    @inject('ICostCalculationService') private costCalculationService: ICostCalculationService,
    @inject('IPricingConfigService') private pricingConfigService: IPricingConfigService,
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    // Manually resolve providers to handle the case when none are registered
    let allProviders: ILLMProvider[] = [];
    try {
      allProviders = diContainer.resolveAll<ILLMProvider>('ILLMProvider');
    } catch (error) {
      logger.warn('LLMService: No providers registered, service will not function until API keys are configured');
    }

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

  /**
   * Calculate credit cost using provider pricing system (Plan 161)
   * Formula: credits = ceil(vendorCost × marginMultiplier × 100)
   * Where 100 is the conversion factor (1 credit = $0.01)
   *
   * @param userId - User ID for tier lookup
   * @param modelId - Model identifier
   * @param providerName - Provider name (e.g., 'openai', 'anthropic')
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cachedInputTokens - Number of cached input tokens (optional, for Anthropic/Google)
   * @returns Calculated credits to deduct
   */
  private async calculateCreditsFromVendorCost(
    userId: string,
    modelId: string,
    providerName: string,
    inputTokens: number,
    outputTokens: number,
    cachedInputTokens?: number
  ): Promise<number> {
    try {
      // Step 1: Look up provider UUID from provider name
      const provider = await this.prisma.provider.findUnique({
        where: { name: providerName },
        select: { id: true },
      });

      if (!provider) {
        logger.warn('LLMService: Provider not found in database, using fallback calculation', {
          providerName,
          modelId,
        });
        // Fallback: Use simple calculation (this should not happen in production)
        return Math.ceil(((inputTokens + outputTokens) / 1000) * 10); // Assume $0.01 per 1k tokens
      }

      // Step 2: Calculate vendor cost
      const costCalculation = await this.costCalculationService.calculateVendorCost({
        inputTokens,
        outputTokens,
        modelId,
        providerId: provider.id,
        cachedInputTokens,
      });

      // Step 3: Get margin multiplier for this user's tier
      const marginMultiplier = await this.pricingConfigService.getApplicableMultiplier(
        userId,
        provider.id,
        modelId
      );

      // Step 4: Apply formula: credits = ceil(vendorCost × marginMultiplier × 100)
      // Where × 100 converts USD to credits (1 credit = $0.01)
      const credits = Math.ceil(costCalculation.vendorCost * marginMultiplier * 100);

      logger.debug('LLMService: Credits calculated from vendor cost', {
        userId,
        modelId,
        providerName,
        inputTokens,
        outputTokens,
        cachedInputTokens,
        vendorCost: costCalculation.vendorCost,
        marginMultiplier,
        credits,
      });

      return credits;
    } catch (error) {
      logger.error('LLMService: Error calculating credits from vendor cost', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        modelId,
        providerName,
      });
      // Fallback: Use simple calculation
      return Math.ceil(((inputTokens + outputTokens) / 1000) * 10);
    }
  }

  // ============================================================================
  // Chat Completion Operations
  // ============================================================================

  async chatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
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

      // 2. Business logic (credit calculation using Plan 161 provider pricing)
      const duration = Date.now() - startTime;
      const creditsUsed = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        usage.promptTokens,
        usage.completionTokens,
        usage.cachedTokens
      );

      const finalResponse: ChatCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          creditsUsed: creditsUsed,
        },
      };

      logger.info('LLMService: Chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.totalTokens,
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
          maxTokens: request.max_tokens,
          messagesCount: request.messages.length,
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

      // 2. Business logic (credit calculation using Plan 161 provider pricing)
      // Note: Streaming providers only return totalTokens, so we estimate the breakdown
      // Assume 30% are prompt tokens, 70% are completion tokens (typical for chat)
      const duration = Date.now() - startTime;
      const estimatedPromptTokens = Math.ceil(totalTokens * 0.3);
      const estimatedCompletionTokens = Math.ceil(totalTokens * 0.7);

      const creditsUsed = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        estimatedPromptTokens,
        estimatedCompletionTokens
      );

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
          promptTokens: Math.ceil(totalTokens * 0.3),
          completionTokens: Math.ceil(totalTokens * 0.7),
          totalTokens: totalTokens,
          creditsUsed: creditsUsed,
        },
        durationMs: duration,
        requestMetadata: {
          provider: modelProvider,
          temperature: request.temperature,
          maxTokens: request.max_tokens,
          messagesCount: request.messages.length,
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
      const creditsUsed = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        usage.promptTokens,
        usage.completionTokens,
        usage.cachedTokens
      );

      const finalResponse: TextCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          creditsUsed: creditsUsed,
        },
      };

      logger.info('LLMService: Text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.totalTokens,
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
          maxTokens: request.max_tokens,
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

      // Note: Streaming providers only return totalTokens, so we estimate the breakdown
      // Assume 30% are prompt tokens, 70% are completion tokens
      const duration = Date.now() - startTime;
      const estimatedPromptTokens = Math.ceil(totalTokens * 0.3);
      const estimatedCompletionTokens = Math.ceil(totalTokens * 0.7);

      const creditsUsed = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        estimatedPromptTokens,
        estimatedCompletionTokens
      );

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
          promptTokens: Math.ceil(totalTokens * 0.3),
          completionTokens: Math.ceil(totalTokens * 0.7),
          totalTokens: totalTokens,
          creditsUsed: creditsUsed,
        },
        durationMs: duration,
        requestMetadata: {
          provider: modelProvider,
          temperature: request.temperature,
          maxTokens: request.max_tokens,
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
