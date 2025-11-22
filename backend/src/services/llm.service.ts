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
  ICreditDeductionService,
  ICreditService
} from '../interfaces';
import {
  TextCompletionRequest,
  ChatCompletionRequest,
  TextCompletionResponse,
  ChatCompletionResponse,
  ChatCompletionChunk,
  TextCompletionChunk,
  ImageUrl,
} from '../types/model-validation';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';
import { InsufficientCreditsError } from './credit-deduction.service';
import { ImageValidationService } from './image-validation.service';
import { VisionTokenCalculatorService } from './vision-token-calculator.service';
import { ParameterValidationService } from './parameter-validation.service';
import { validationError } from '../middleware/error.middleware';

@injectable()
export class LLMService {
  private providerMap: Map<string, ILLMProvider>;

  constructor(
    @inject('ICostCalculationService') private costCalculationService: ICostCalculationService,
    @inject('IPricingConfigService') private pricingConfigService: IPricingConfigService,
    @inject('ICreditDeductionService') private creditDeductionService: ICreditDeductionService,
    @inject('ICreditService') private creditService: ICreditService,
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(ImageValidationService) private imageValidationService: ImageValidationService,
    @inject(VisionTokenCalculatorService) private visionTokenCalculatorService: VisionTokenCalculatorService,
    @inject(ParameterValidationService) private parameterValidationService: ParameterValidationService
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
   * Estimate input tokens from messages (rough approximation)
   * GPT tokenization: ~4 characters per token on average
   * Using conservative estimate: 3 chars per token (slightly higher than average)
   * Note: For messages with images, this only estimates text tokens.
   *       Use visionInfo.imageTokens for image token count.
   */
  private estimateInputTokens(messages: any[]): number {
    const totalChars = messages.reduce((sum, msg) => {
      if (typeof msg.content === 'string') {
        return sum + msg.content.length;
      } else if (Array.isArray(msg.content)) {
        // For content arrays, only count text parts
        const textParts = msg.content.filter((part: any) => part.type === 'text');
        const textChars = textParts.reduce((chars: number, part: any) => chars + (part.text?.length || 0), 0);
        return sum + textChars;
      }
      return sum;
    }, 0);

    // Conservative estimate: 3 chars per token (slightly higher than average)
    return Math.ceil(totalChars / 3);
  }

  /**
   * Estimate input tokens from text prompt (rough approximation)
   * Using conservative estimate: 3 chars per token (slightly higher than average)
   */
  private estimateInputTokensFromText(prompt: string): number {
    // Conservative estimate: 3 chars per token (slightly higher than average)
    return Math.ceil((prompt?.length || 0) / 3);
  }

  /**
   * Calculate credit cost and gather all pricing metadata for deduction and tracking
   * Formula: credits = ceil(vendorCost × marginMultiplier × 100)
   * Where 100 is the conversion factor (1 credit = $0.01)
   *
   * Phase 3: Now also calculates separate input/output credits
   *
   * @param userId - User ID for tier lookup
   * @param modelId - Model identifier
   * @param providerName - Provider name (e.g., 'openai', 'anthropic')
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cachedInputTokens - Number of cached input tokens (optional, for Anthropic/Google)
   * @returns Object containing credits, providerId, vendorCost, marginMultiplier, grossMargin, inputCredits, outputCredits
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
    inputCredits: number;
    outputCredits: number;
  }> {
    try {
      // Step 1: Look up provider UUID from provider name
      const provider = await this.prisma.providers.findUnique({
        where: { name: providerName },
        select: { id: true },
      });

      if (!provider) {
        const error = `Provider '${providerName}' not found in database. Available providers: ${await this.getAvailableProviders()}`;
        logger.error('LLMService: Provider not found', {
          providerName,
          modelId,
          userId,
        });
        throw new Error(error);
      }

      // Step 1.5: Fetch model meta to get inputCreditsPerK and outputCreditsPerK
      const model = await this.prisma.models.findUnique({
        where: { id: modelId },
        select: { meta: true },
      });

      if (!model) {
        throw new Error(`Model '${modelId}' not found in database`);
      }

      const meta = model.meta as any;
      const inputCreditsPerK = meta?.inputCreditsPerK;
      const outputCreditsPerK = meta?.outputCreditsPerK;

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

      // Step 4.5: Calculate separate input/output credits (Phase 3)
      let inputCredits = 0;
      let outputCredits = 0;

      if (inputCreditsPerK && outputCreditsPerK) {
        // Use pre-calculated credits from model meta
        inputCredits = Math.ceil((inputTokens / 1000) * inputCreditsPerK);
        outputCredits = Math.ceil((outputTokens / 1000) * outputCreditsPerK);
      } else {
        // Fallback: Split total credits proportionally by tokens
        const totalTokens = inputTokens + outputTokens;
        if (totalTokens > 0) {
          inputCredits = Math.ceil((inputTokens / totalTokens) * credits);
          outputCredits = Math.ceil((outputTokens / totalTokens) * credits);
        }
      }

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
        inputCredits,
        outputCredits,
        grossMargin,
      });

      return {
        credits,
        providerId: provider.id,
        vendorCost: costCalculation.vendorCost,
        marginMultiplier,
        grossMargin,
        inputCredits,
        outputCredits,
      };
    } catch (error) {
      logger.error('LLMService: Error calculating credits from vendor cost', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        modelId,
        providerName,
      });
      // Re-throw error - do NOT use fallback with placeholder UUID
      // This prevents FK constraint violations in token_usage_ledger
      throw new Error(
        `Failed to calculate credits for model '${modelId}' from provider '${providerName}'. ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ============================================================================
  // Vision Support (Plan 204 - Phase 1)
  // ============================================================================

  /**
   * Validates vision request and calculates image tokens
   * Called before chat completion to validate images and estimate vision tokens
   *
   * @param request - Chat completion request
   * @param modelMeta - Model metadata (with vision configuration)
   * @returns Object with imageCount, imageTokens, and validation errors
   */
  private async processVisionRequest(
    request: ChatCompletionRequest,
    modelMeta: any
  ): Promise<{
    imageCount: number;
    imageTokens: number;
    validationErrors: string[];
  }> {
    const images: ImageUrl[] = [];
    const validationErrors: string[] = [];

    // Check if model supports vision
    const visionSupport = modelMeta?.vision?.supported;
    const maxImages = modelMeta?.vision?.maxImages || 10;
    const maxImageSize = modelMeta?.vision?.maxImageSize || 20971520; // 20MB default

    // Check if request contains images
    const hasImages = request.messages.some(msg =>
      Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url')
    );

    if (hasImages && !visionSupport) {
      throw new Error(`Model '${request.model}' does not support vision/image processing`);
    }

    if (!hasImages) {
      return { imageCount: 0, imageTokens: 0, validationErrors: [] };
    }

    // Extract and validate all images
    for (const message of request.messages) {
      if (!Array.isArray(message.content)) continue;

      for (const part of message.content) {
        if (part.type !== 'image_url') continue;

        const imageUrl = part.image_url.url;
        const detail = part.image_url.detail || 'auto';

        // Validate image
        const validation = await this.imageValidationService.validateImage(
          imageUrl,
          maxImageSize
        );

        if (!validation.valid) {
          validationErrors.push(`Image validation failed: ${validation.error}`);
          continue;
        }

        images.push({
          url: imageUrl,
          detail,
        });
      }
    }

    // Check image count limit
    if (images.length > maxImages) {
      throw new Error(
        `Too many images: ${images.length} exceeds maximum ${maxImages}`
      );
    }

    // Calculate image tokens
    const imageTokens = this.visionTokenCalculatorService.calculateTotalImageTokens(images);

    logger.debug('LLMService: Vision request processed', {
      model: request.model,
      imageCount: images.length,
      imageTokens,
      validationErrors,
    });

    return {
      imageCount: images.length,
      imageTokens,
      validationErrors,
    };
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
      // ============================================================================
      // VISION PROCESSING (Plan 204 - Phase 1)
      // ============================================================================

      // Fetch model metadata for vision support check
      const model = await this.prisma.models.findUnique({
        where: { id: request.model },
        select: { meta: true },
      });

      if (!model) {
        throw new Error(`Model '${request.model}' not found in database`);
      }

      const modelMeta = model.meta as any;

      // Process vision request (validation + token calculation)
      const visionInfo = await this.processVisionRequest(request, modelMeta);

      if (visionInfo.validationErrors.length > 0) {
        logger.warn('LLMService: Vision validation warnings', {
          model: request.model,
          errors: visionInfo.validationErrors,
        });
      }

      // ============================================================================
      // PRE-FLIGHT CREDIT VALIDATION (Bug #3 Fix)
      // ============================================================================

      // Step 1: Estimate tokens from messages (including vision tokens)
      const estimatedTextTokens = this.estimateInputTokens(request.messages);
      const estimatedInputTokens = estimatedTextTokens + visionInfo.imageTokens;
      const estimatedOutputTokens = request.max_tokens || 1000; // Use max_tokens or default

      // Step 2: Estimate credit cost
      const estimatedCredits = await this.creditDeductionService.estimateCreditsForRequest(
        userId,
        request.model,
        modelProvider,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      // Step 3: Validate sufficient balance BEFORE calling LLM
      const validation = await this.creditDeductionService.validateSufficientCredits(
        userId,
        estimatedCredits
      );

      if (!validation.sufficient) {
        logger.warn('LLMService: Insufficient credits for request', {
          userId,
          model: request.model,
          estimatedCredits,
          currentBalance: validation.currentBalance,
          shortfall: validation.shortfall,
        });

        throw new InsufficientCreditsError(
          `Insufficient credits. Balance: ${validation.currentBalance}, ` +
          `Estimated cost: ${estimatedCredits}, ` +
          `Shortfall: ${validation.shortfall}. ` +
          `Suggestions: ${validation.suggestions?.join(', ') || 'Upgrade your plan for more credits'}`
        );
      }

      logger.debug('LLMService: Pre-flight validation passed', {
        userId,
        estimatedCredits,
        currentBalance: validation.currentBalance,
      });

      // ============================================================================
      // PARAMETER VALIDATION (Plan 203 - Validate request parameters)
      // ============================================================================

      const paramValidation = await this.parameterValidationService.validateParameters(
        request.model,
        {
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          presence_penalty: request.presence_penalty,
          frequency_penalty: request.frequency_penalty,
          stop: request.stop,
          n: request.n,
        }
      );

      if (!paramValidation.valid) {
        logger.error('LLMService: Parameter validation failed', {
          model: request.model,
          errors: paramValidation.errors,
        });
        throw validationError(
          `Invalid parameters for model '${request.model}': ${paramValidation.errors.join('; ')}`
        );
      }

      if (paramValidation.warnings.length > 0) {
        logger.warn('LLMService: Parameter validation warnings', {
          model: request.model,
          warnings: paramValidation.warnings,
        });
      }

      // Apply parameter transformations (e.g., max_tokens → max_completion_tokens)
      const transformedRequest = {
        ...request,
        ...paramValidation.transformedParams,
      };

      logger.debug('LLMService: Parameters validated and transformed', {
        model: request.model,
        originalParams: Object.keys(request).filter(k => !['messages', 'model', 'stream'].includes(k)),
        transformedParams: Object.keys(paramValidation.transformedParams),
      });

      // ============================================================================
      // LLM API CALL (only executes if credits sufficient and parameters valid)
      // ============================================================================

      // 1. Delegate to provider (Strategy Pattern) with transformed request
      const { response, usage } = await provider.chatCompletion(transformedRequest);

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
        inputCredits: pricingData.inputCredits,
        outputCredits: pricingData.outputCredits,
        // Plan 204: Vision metrics
        imageCount: visionInfo.imageCount,
        imageTokens: visionInfo.imageTokens,
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

      // Fetch updated credit balance for response
      const creditInfo = await this.creditService.getDetailedCredits(userId);

      const finalResponse: ChatCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          creditsUsed: pricingData.credits,
          credits: {
            deducted: pricingData.credits,
            remaining: creditInfo.totalAvailable,
            subscriptionRemaining: creditInfo.proCredits.subscriptionCredits.remaining,
            purchasedRemaining: creditInfo.proCredits.purchasedCredits.remaining,
          },
        },
      };

      logger.info('LLMService: Chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.totalTokens,
        estimatedCredits,
        actualCredits: pricingData.credits,
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
    // ENHANCED: Log complete request data before processing
    logger.debug('LLMService: Streaming chat completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
      messagesCount: request.messages.length,
      messages: request.messages.map((msg, idx) => ({
        index: idx,
        role: msg.role,
        contentLength: typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length,
        contentPreview: typeof msg.content === 'string' ? msg.content.substring(0, 100) : JSON.stringify(msg.content).substring(0, 100)
      })),
      maxTokens: request.max_tokens,
      temperature: request.temperature,
      stream: request.stream,
      fullRequest: JSON.stringify(request).substring(0, 1000)
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const provider = this.getProvider(modelProvider);
    const startTime = Date.now();
    const requestId = randomUUID(); // Generate unique request ID for tracking

    try {
      // ============================================================================
      // VISION PROCESSING (Plan 204 - Phase 1)
      // ============================================================================

      // Fetch model metadata for vision support check
      const model = await this.prisma.models.findUnique({
        where: { id: request.model },
        select: { meta: true },
      });

      if (!model) {
        throw new Error(`Model '${request.model}' not found in database`);
      }

      const modelMeta = model.meta as any;

      // Process vision request (validation + token calculation)
      const visionInfo = await this.processVisionRequest(request, modelMeta);

      if (visionInfo.validationErrors.length > 0) {
        logger.warn('LLMService: Vision validation warnings (streaming)', {
          model: request.model,
          errors: visionInfo.validationErrors,
        });
      }

      // ============================================================================
      // PRE-FLIGHT CREDIT VALIDATION (Bug #3 Fix)
      // ============================================================================

      // Step 1: Estimate tokens from messages (including vision tokens)
      const estimatedTextTokens = this.estimateInputTokens(request.messages);
      const estimatedInputTokens = estimatedTextTokens + visionInfo.imageTokens;
      const estimatedOutputTokens = request.max_tokens || 1000; // Use max_tokens or default

      // Step 2: Estimate credit cost
      const estimatedCredits = await this.creditDeductionService.estimateCreditsForRequest(
        userId,
        request.model,
        modelProvider,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      // Step 3: Validate sufficient balance BEFORE calling LLM
      const validation = await this.creditDeductionService.validateSufficientCredits(
        userId,
        estimatedCredits
      );

      if (!validation.sufficient) {
        logger.warn('LLMService: Insufficient credits for streaming request', {
          userId,
          model: request.model,
          estimatedCredits,
          currentBalance: validation.currentBalance,
          shortfall: validation.shortfall,
        });

        throw new InsufficientCreditsError(
          `Insufficient credits. Balance: ${validation.currentBalance}, ` +
          `Estimated cost: ${estimatedCredits}, ` +
          `Shortfall: ${validation.shortfall}. ` +
          `Suggestions: ${validation.suggestions?.join(', ') || 'Upgrade your plan for more credits'}`
        );
      }

      logger.debug('LLMService: Pre-flight validation passed for streaming', {
        userId,
        estimatedCredits,
        currentBalance: validation.currentBalance,
      });

      // ============================================================================
      // PARAMETER VALIDATION (Plan 203 - Validate request parameters)
      // ============================================================================

      const paramValidation = await this.parameterValidationService.validateParameters(
        request.model,
        {
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          presence_penalty: request.presence_penalty,
          frequency_penalty: request.frequency_penalty,
          stop: request.stop,
          n: request.n,
        }
      );

      if (!paramValidation.valid) {
        logger.error('LLMService: Parameter validation failed (streaming)', {
          model: request.model,
          errors: paramValidation.errors,
        });
        throw validationError(
          `Invalid parameters for model '${request.model}': ${paramValidation.errors.join('; ')}`
        );
      }

      if (paramValidation.warnings.length > 0) {
        logger.warn('LLMService: Parameter validation warnings (streaming)', {
          model: request.model,
          warnings: paramValidation.warnings,
        });
      }

      // Apply parameter transformations (e.g., max_tokens → max_completion_tokens)
      const transformedRequest = {
        ...request,
        ...paramValidation.transformedParams,
      };

      logger.debug('LLMService: Parameters validated and transformed (streaming)', {
        model: request.model,
        originalParams: Object.keys(request).filter(k => !['messages', 'model', 'stream'].includes(k)),
        transformedParams: Object.keys(paramValidation.transformedParams),
      });

      // ============================================================================
      // LLM API CALL (only executes if credits sufficient and parameters valid)
      // ============================================================================

      // ENHANCED: Log before delegating to provider
      logger.debug('LLMService: Delegating to provider for streaming', {
        provider: modelProvider,
        model: request.model,
        userId,
        messagesCount: request.messages.length
      });

      // 1. Delegate to provider with transformed request
      const totalTokens = await provider.streamChatCompletion(transformedRequest, res);

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
        inputCredits: pricingData.inputCredits,
        outputCredits: pricingData.outputCredits,
        // Plan 204: Vision metrics
        imageCount: visionInfo.imageCount,
        imageTokens: visionInfo.imageTokens,
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

      // Fetch updated credit balance for final chunk
      const creditInfo = await this.creditService.getDetailedCredits(userId);

      logger.info('LLMService: Streaming chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        estimatedCredits,
        actualCredits: pricingData.credits,
        vendorCost: pricingData.vendorCost,
        grossMargin: pricingData.grossMargin,
      });

      // Note: Usage recording now handled by CreditDeductionService → TokenTrackingService
      // The atomic deduction call above already wrote to token_usage_ledger

      // Send final chunk with usage information (including credit info)
      const finalChunk: ChatCompletionChunk = {
        id: requestId,
        object: 'chat.completion.chunk',
        created: Math.floor(startTime / 1000),
        model: request.model,
        choices: [],
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: totalTokens,
          creditsUsed: pricingData.credits,
          credits: {
            deducted: pricingData.credits,
            remaining: creditInfo.totalAvailable,
            subscriptionRemaining: creditInfo.proCredits.subscriptionCredits.remaining,
            purchasedRemaining: creditInfo.proCredits.purchasedCredits.remaining,
          },
        },
      };

      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      // ENHANCED: Log complete error with full context
      logger.error('LLMService: Streaming chat completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : typeof error,
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined,
        requestContext: {
          messagesCount: request.messages.length,
          maxTokens: request.max_tokens,
          estimatedInputTokens: this.estimateInputTokens(request.messages),
          stream: request.stream
        }
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
      // ============================================================================
      // PRE-FLIGHT CREDIT VALIDATION (Bug #3 Fix)
      // ============================================================================

      // Step 1: Estimate tokens from prompt
      const estimatedInputTokens = this.estimateInputTokensFromText(request.prompt);
      const estimatedOutputTokens = request.max_tokens || 1000; // Use max_tokens or default

      // Step 2: Estimate credit cost
      const estimatedCredits = await this.creditDeductionService.estimateCreditsForRequest(
        userId,
        request.model,
        modelProvider,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      // Step 3: Validate sufficient balance BEFORE calling LLM
      const validation = await this.creditDeductionService.validateSufficientCredits(
        userId,
        estimatedCredits
      );

      if (!validation.sufficient) {
        logger.warn('LLMService: Insufficient credits for text completion', {
          userId,
          model: request.model,
          estimatedCredits,
          currentBalance: validation.currentBalance,
          shortfall: validation.shortfall,
        });

        throw new InsufficientCreditsError(
          `Insufficient credits. Balance: ${validation.currentBalance}, ` +
          `Estimated cost: ${estimatedCredits}, ` +
          `Shortfall: ${validation.shortfall}. ` +
          `Suggestions: ${validation.suggestions?.join(', ') || 'Upgrade your plan for more credits'}`
        );
      }

      logger.debug('LLMService: Pre-flight validation passed for text completion', {
        userId,
        estimatedCredits,
        currentBalance: validation.currentBalance,
      });

      // ============================================================================
      // LLM API CALL (only executes if credits sufficient)
      // ============================================================================

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
        inputCredits: pricingData.inputCredits,
        outputCredits: pricingData.outputCredits,
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

      // Fetch updated credit balance for response
      const creditInfo = await this.creditService.getDetailedCredits(userId);

      const finalResponse: TextCompletionResponse = {
        ...response,
        usage: {
          ...usage,
          creditsUsed: pricingData.credits,
          credits: {
            deducted: pricingData.credits,
            remaining: creditInfo.totalAvailable,
            subscriptionRemaining: creditInfo.proCredits.subscriptionCredits.remaining,
            purchasedRemaining: creditInfo.proCredits.purchasedCredits.remaining,
          },
        },
      };

      logger.info('LLMService: Text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: usage.totalTokens,
        estimatedCredits,
        actualCredits: pricingData.credits,
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
      // ============================================================================
      // PRE-FLIGHT CREDIT VALIDATION (Bug #3 Fix)
      // ============================================================================

      // Step 1: Estimate tokens from prompt
      const estimatedInputTokens = this.estimateInputTokensFromText(request.prompt);
      const estimatedOutputTokens = request.max_tokens || 1000; // Use max_tokens or default

      // Step 2: Estimate credit cost
      const estimatedCredits = await this.creditDeductionService.estimateCreditsForRequest(
        userId,
        request.model,
        modelProvider,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      // Step 3: Validate sufficient balance BEFORE calling LLM
      const validation = await this.creditDeductionService.validateSufficientCredits(
        userId,
        estimatedCredits
      );

      if (!validation.sufficient) {
        logger.warn('LLMService: Insufficient credits for streaming text completion', {
          userId,
          model: request.model,
          estimatedCredits,
          currentBalance: validation.currentBalance,
          shortfall: validation.shortfall,
        });

        throw new InsufficientCreditsError(
          `Insufficient credits. Balance: ${validation.currentBalance}, ` +
          `Estimated cost: ${estimatedCredits}, ` +
          `Shortfall: ${validation.shortfall}. ` +
          `Suggestions: ${validation.suggestions?.join(', ') || 'Upgrade your plan for more credits'}`
        );
      }

      logger.debug('LLMService: Pre-flight validation passed for streaming text completion', {
        userId,
        estimatedCredits,
        currentBalance: validation.currentBalance,
      });

      // ============================================================================
      // LLM API CALL (only executes if credits sufficient)
      // ============================================================================

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
        inputCredits: pricingData.inputCredits,
        outputCredits: pricingData.outputCredits,
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

      // Fetch updated credit balance for final chunk
      const creditInfo = await this.creditService.getDetailedCredits(userId);

      logger.info('LLMService: Streaming text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        estimatedCredits,
        actualCredits: pricingData.credits,
        vendorCost: pricingData.vendorCost,
        grossMargin: pricingData.grossMargin,
      });

      // Note: Usage recording now handled by CreditDeductionService → TokenTrackingService
      // The atomic deduction call above already wrote to token_usage_ledger

      // Send final chunk with usage information (including credit info)
      const finalChunk: TextCompletionChunk = {
        id: requestId,
        object: 'text_completion.chunk',
        created: Math.floor(startTime / 1000),
        model: request.model,
        choices: [],
      };

      // Add usage property with credit info
      const finalChunkWithUsage = {
        ...finalChunk,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: totalTokens,
          creditsUsed: pricingData.credits,
          credits: {
            deducted: pricingData.credits,
            remaining: creditInfo.totalAvailable,
            subscriptionRemaining: creditInfo.proCredits.subscriptionCredits.remaining,
            purchasedRemaining: creditInfo.proCredits.purchasedCredits.remaining,
          },
        },
      };

      res.write(`data: ${JSON.stringify(finalChunkWithUsage)}\n\n`);

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

  /**
   * Get available providers from database
   */
  private async getAvailableProviders(): Promise<string> {
    try {
      const providers = await this.prisma.providers.findMany({
        select: { name: true },
      });
      return providers.map((p) => p.name).join(', ');
    } catch {
      return 'Unable to fetch providers';
    }
  }
}
