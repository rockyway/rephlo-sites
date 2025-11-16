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
import {
  ILLMProvider,
  ICostCalculationService,
  IPricingConfigService,
  ICreditDeductionService
} from '../interfaces';
import {
  TextCompletionRequest,
  ChatCompletionRequest,
  TextCompletionResponse,
  ChatCompletionResponse,
} from '../types/model-validation';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

@injectable()
export class LLMService {
  private providerMap: Map<string, ILLMProvider>;

  constructor(
    @inject('ICostCalculationService') private costCalculationService: ICostCalculationService,
    @inject('IPricingConfigService') private pricingConfigService: IPricingConfigService,
    @inject('ICreditDeductionService') private creditDeductionService: ICreditDeductionService,
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
   * Calculate credit cost and gather all pricing metadata for deduction and tracking
   * Formula: credits = ceil(vendorCost × marginMultiplier × 100)
   * Where 100 is the conversion factor (1 credit = $0.01)
   *
   * @param userId - User ID for tier lookup
   * @param modelId - Model identifier
   * @param providerName - Provider name (e.g., 'openai', 'anthropic')
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cachedInputTokens - Number of cached input tokens (optional, for Anthropic/Google)
   * @returns Object containing credits, providerId, vendorCost, marginMultiplier, and grossMargin
   */
  private async calculateCreditsFromVendorCost(
    userId: string,
    modelId: string,
    providerName: string,
    inputTokens: number,
    outputTokens: number,
    cachedInputTokens?: number
  ): Promise<{
    credits: number;
    providerId: string;
    vendorCost: number;
    marginMultiplier: number;
    grossMargin: number;
  }> {
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
        const fallbackCredits = Math.ceil(((inputTokens + outputTokens) / 1000) * 10);
        return {
          credits: fallbackCredits,
          providerId: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
          vendorCost: fallbackCredits * 0.01, // Estimate
          marginMultiplier: 1.0,
          grossMargin: 0,
        };
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

      // Step 5: Calculate gross margin (revenue - cost)
      const creditValueUsd = credits * 0.01; // Convert credits to USD
      const grossMargin = creditValueUsd - costCalculation.vendorCost;

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
        grossMargin,
      });

      return {
        credits,
        providerId: provider.id,
        vendorCost: costCalculation.vendorCost,
        marginMultiplier,
        grossMargin,
      };
    } catch (error) {
      logger.error('LLMService: Error calculating credits from vendor cost', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        modelId,
        providerName,
      });
      // Fallback: Use simple calculation
      const fallbackCredits = Math.ceil(((inputTokens + outputTokens) / 1000) * 10);
      return {
        credits: fallbackCredits,
        providerId: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        vendorCost: fallbackCredits * 0.01, // Estimate
        marginMultiplier: 1.0,
        grossMargin: 0,
      };
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
    const requestId = randomUUID(); // Generate unique request ID for tracking

    try {
      // 1. Delegate to provider (Strategy Pattern)
      const { response, usage } = await provider.chatCompletion(request);

      // 2. Business logic (credit calculation using Plan 161 provider pricing)
      const duration = Date.now() - startTime;
      const pricingData = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        usage.promptTokens,
        usage.completionTokens,
        usage.cachedTokens
      );

      // 3. Deduct credits atomically with token usage record
      const requestStartedAt = new Date(startTime);
      const requestCompletedAt = new Date();

      const tokenUsageRecord = {
        requestId,
        userId,
        modelId: request.model,
        providerId: pricingData.providerId,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cachedInputTokens: usage.cachedTokens || 0,
        totalTokens: usage.totalTokens,
        vendorCost: pricingData.vendorCost,
        creditDeducted: pricingData.credits,
        marginMultiplier: pricingData.marginMultiplier,
        grossMargin: pricingData.grossMargin,
        requestType: 'completion' as const,
        requestStartedAt,
        requestCompletedAt,
        processingTime: duration,
        status: 'success' as const,
        createdAt: requestCompletedAt,
      };

      await this.creditDeductionService.deductCreditsAtomically(
        userId,
        pricingData.credits,
        requestId,
        tokenUsageRecord
      );

      const finalResponse: ChatCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          creditsUsed: pricingData.credits,
        },
      };

      logger.info('LLMService: Chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.totalTokens,
        credits: pricingData.credits,
        vendorCost: pricingData.vendorCost,
        grossMargin: pricingData.grossMargin,
      });

      // Note: Usage recording now handled by CreditDeductionService → TokenTrackingService
      // The atomic deduction call above already wrote to token_usage_ledger

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
    const requestId = randomUUID(); // Generate unique request ID for tracking

    try {
      // 1. Delegate to provider
      const totalTokens = await provider.streamChatCompletion(request, res);

      // 2. Business logic (credit calculation using Plan 161 provider pricing)
      // Note: Streaming providers only return totalTokens, so we estimate the breakdown
      // Assume 30% are prompt tokens, 70% are completion tokens (typical for chat)
      const duration = Date.now() - startTime;
      const estimatedPromptTokens = Math.ceil(totalTokens * 0.3);
      const estimatedCompletionTokens = Math.ceil(totalTokens * 0.7);

      const pricingData = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        estimatedPromptTokens,
        estimatedCompletionTokens
      );

      // 3. Deduct credits atomically with token usage record
      const requestStartedAt = new Date(startTime);
      const requestCompletedAt = new Date();

      const tokenUsageRecord = {
        requestId,
        userId,
        modelId: request.model,
        providerId: pricingData.providerId,
        inputTokens: estimatedPromptTokens,
        outputTokens: estimatedCompletionTokens,
        cachedInputTokens: 0,
        totalTokens: totalTokens,
        vendorCost: pricingData.vendorCost,
        creditDeducted: pricingData.credits,
        marginMultiplier: pricingData.marginMultiplier,
        grossMargin: pricingData.grossMargin,
        requestType: 'streaming' as const,
        requestStartedAt,
        requestCompletedAt,
        processingTime: duration,
        status: 'success' as const,
        createdAt: requestCompletedAt,
      };

      await this.creditDeductionService.deductCreditsAtomically(
        userId,
        pricingData.credits,
        requestId,
        tokenUsageRecord
      );

      logger.info('LLMService: Streaming chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        credits: pricingData.credits,
        vendorCost: pricingData.vendorCost,
        grossMargin: pricingData.grossMargin,
      });

      // Note: Usage recording now handled by CreditDeductionService → TokenTrackingService
      // The atomic deduction call above already wrote to token_usage_ledger

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      logger.error('LLMService: Streaming chat completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
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
    const requestId = randomUUID(); // Generate unique request ID for tracking

    try {
      const { response, usage } = await provider.textCompletion(request);

      const duration = Date.now() - startTime;
      const pricingData = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        usage.promptTokens,
        usage.completionTokens,
        usage.cachedTokens
      );

      // Deduct credits atomically with token usage record
      const requestStartedAt = new Date(startTime);
      const requestCompletedAt = new Date();

      const tokenUsageRecord = {
        requestId,
        userId,
        modelId: request.model,
        providerId: pricingData.providerId,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cachedInputTokens: usage.cachedTokens || 0,
        totalTokens: usage.totalTokens,
        vendorCost: pricingData.vendorCost,
        creditDeducted: pricingData.credits,
        marginMultiplier: pricingData.marginMultiplier,
        grossMargin: pricingData.grossMargin,
        requestType: 'completion' as const,
        requestStartedAt,
        requestCompletedAt,
        processingTime: duration,
        status: 'success' as const,
        createdAt: requestCompletedAt,
      };

      await this.creditDeductionService.deductCreditsAtomically(
        userId,
        pricingData.credits,
        requestId,
        tokenUsageRecord
      );

      const finalResponse: TextCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          creditsUsed: pricingData.credits,
        },
      };

      logger.info('LLMService: Text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.totalTokens,
        credits: pricingData.credits,
        vendorCost: pricingData.vendorCost,
        grossMargin: pricingData.grossMargin,
      });

      // Note: Usage recording now handled by CreditDeductionService → TokenTrackingService
      // The atomic deduction call above already wrote to token_usage_ledger

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
    const requestId = randomUUID(); // Generate unique request ID for tracking

    try {
      const totalTokens = await provider.streamTextCompletion(request, res);

      // Note: Streaming providers only return totalTokens, so we estimate the breakdown
      // Assume 30% are prompt tokens, 70% are completion tokens
      const duration = Date.now() - startTime;
      const estimatedPromptTokens = Math.ceil(totalTokens * 0.3);
      const estimatedCompletionTokens = Math.ceil(totalTokens * 0.7);

      const pricingData = await this.calculateCreditsFromVendorCost(
        userId,
        request.model,
        modelProvider,
        estimatedPromptTokens,
        estimatedCompletionTokens
      );

      // Deduct credits atomically with token usage record
      const requestStartedAt = new Date(startTime);
      const requestCompletedAt = new Date();

      const tokenUsageRecord = {
        requestId,
        userId,
        modelId: request.model,
        providerId: pricingData.providerId,
        inputTokens: estimatedPromptTokens,
        outputTokens: estimatedCompletionTokens,
        cachedInputTokens: 0,
        totalTokens: totalTokens,
        vendorCost: pricingData.vendorCost,
        creditDeducted: pricingData.credits,
        marginMultiplier: pricingData.marginMultiplier,
        grossMargin: pricingData.grossMargin,
        requestType: 'streaming' as const,
        requestStartedAt,
        requestCompletedAt,
        processingTime: duration,
        status: 'success' as const,
        createdAt: requestCompletedAt,
      };

      await this.creditDeductionService.deductCreditsAtomically(
        userId,
        pricingData.credits,
        requestId,
        tokenUsageRecord
      );

      logger.info('LLMService: Streaming text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        credits: pricingData.credits,
        vendorCost: pricingData.vendorCost,
        grossMargin: pricingData.grossMargin,
      });

      // Note: Usage recording now handled by CreditDeductionService → TokenTrackingService
      // The atomic deduction call above already wrote to token_usage_ledger

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
