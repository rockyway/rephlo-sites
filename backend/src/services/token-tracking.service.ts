/**
 * Token Tracking Service
 *
 * Captures and records token usage from LLM API responses.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 *
 * Reference: docs/plan/112-token-to-credit-conversion-mechanism.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  ITokenTrackingService,
  TokenUsageRecord,
  RequestMetadata,
  ICostCalculationService,
  IPricingConfigService,
} from '../interfaces';

@injectable()
export class TokenTrackingService implements ITokenTrackingService {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    @inject('ICostCalculationService') private readonly costCalc: ICostCalculationService,
    @inject('IPricingConfigService') private readonly pricingConfig: IPricingConfigService
  ) {
    logger.debug('TokenTrackingService: Initialized');
  }

  /**
   * Parse vendor-specific token counts from API responses
   */
  parseTokenUsage(
    apiResponse: any,
    providerId: string
  ): {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
    totalTokens: number;
  } {
    // OpenAI/Azure format
    if (apiResponse.usage?.prompt_tokens !== undefined) {
      return {
        inputTokens: apiResponse.usage.prompt_tokens || 0,
        outputTokens: apiResponse.usage.completion_tokens || 0,
        totalTokens: apiResponse.usage.total_tokens || 0,
      };
    }

    // Anthropic format
    if (apiResponse.usage?.input_tokens !== undefined) {
      return {
        inputTokens: apiResponse.usage.input_tokens || 0,
        outputTokens: apiResponse.usage.output_tokens || 0,
        cachedInputTokens: apiResponse.usage.cache_read_input_tokens || 0,
        totalTokens: (apiResponse.usage.input_tokens || 0) + (apiResponse.usage.output_tokens || 0),
      };
    }

    // Google Gemini format
    if (apiResponse.usage?.promptTokenCount !== undefined) {
      return {
        inputTokens: apiResponse.usage.promptTokenCount || 0,
        outputTokens: apiResponse.usage.candidatesTokenCount || 0,
        cachedInputTokens: apiResponse.usage.cachedContentInputTokenCount || 0,
        totalTokens: apiResponse.usage.totalTokenCount || 0,
      };
    }

    logger.warn('TokenTrackingService: Unknown response format, returning zeros', { providerId });
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  /**
   * Capture and record token usage from completion
   */
  async captureTokenUsage(
    userId: string,
    apiResponse: any,
    requestMetadata: RequestMetadata
  ): Promise<TokenUsageRecord> {
    const usage = this.parseTokenUsage(apiResponse, requestMetadata.providerId);

    // Calculate vendor cost
    const costCalc = await this.costCalc.calculateVendorCost({
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      modelId: requestMetadata.modelId,
      providerId: requestMetadata.providerId,
      cachedInputTokens: usage.cachedInputTokens,
    });

    // Get applicable multiplier
    const multiplier = await this.pricingConfig.getApplicableMultiplier(
      userId,
      requestMetadata.providerId,
      requestMetadata.modelId
    );

    // Calculate credit deduction
    const creditValue = costCalc.vendorCost * multiplier;
    const creditsDeducted = Math.ceil(creditValue / 0.01); // Round up to nearest credit
    const grossMargin = creditValue - costCalc.vendorCost;

    const record: TokenUsageRecord = {
      requestId: crypto.randomUUID(),
      userId,
      modelId: requestMetadata.modelId,
      providerId: requestMetadata.providerId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      totalTokens: usage.totalTokens,
      vendorCost: costCalc.vendorCost,
      creditDeducted: creditsDeducted,
      marginMultiplier: multiplier,
      grossMargin,
      requestType: requestMetadata.requestType,
      requestStartedAt: requestMetadata.requestStartedAt,
      requestCompletedAt: new Date(),
      processingTime: Date.now() - requestMetadata.requestStartedAt.getTime(),
      status: 'success',
      createdAt: new Date(),
    };

    await this.recordToLedger(record);

    return record;
  }

  /**
   * Capture streaming completion token usage
   */
  async captureStreamingTokenUsage(
    userId: string,
    streamChunks: AsyncIterable<any>,
    requestMetadata: RequestMetadata
  ): Promise<TokenUsageRecord> {
    let streamingSegments = 0;
    let finalChunk: any = null;

    for await (const chunk of streamChunks) {
      streamingSegments++;
      finalChunk = chunk;
    }

    // Create record using final chunk (which contains cumulative token counts)
    const metadata = { ...requestMetadata, requestType: 'streaming' as const };
    const record = await this.captureTokenUsage(userId, finalChunk || {}, metadata);
    record.streamingSegments = streamingSegments;

    return record;
  }

  /**
   * Record token usage to ledger
   */
  async recordToLedger(record: TokenUsageRecord): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO token_usage_ledger (
          request_id, user_id, model_id, provider_id,
          input_tokens, output_tokens, cached_input_tokens, total_tokens,
          vendor_cost, margin_multiplier, credit_value_usd, credits_deducted, gross_margin_usd,
          request_type, streaming_segments,
          request_started_at, request_completed_at, processing_time_ms,
          status, error_message, is_streaming_complete,
          created_at
        ) VALUES (
          ${record.requestId}::uuid, ${record.userId}::uuid, ${record.modelId}, ${record.providerId}::uuid,
          ${record.inputTokens}, ${record.outputTokens}, ${record.cachedInputTokens || 0}, ${record.totalTokens},
          ${record.vendorCost}, ${record.marginMultiplier}, ${record.vendorCost * record.marginMultiplier}, ${record.creditDeducted}, ${record.grossMargin},
          ${record.requestType}, ${record.streamingSegments},
          ${record.requestStartedAt}, ${record.requestCompletedAt}, ${record.processingTime},
          ${record.status}, ${record.errorMessage}, ${record.isStreamingComplete ?? true},
          ${record.createdAt}
        )
      `;

      logger.info('TokenTrackingService: Token usage recorded', {
        requestId: record.requestId,
        userId: record.userId,
        creditsDeducted: record.creditDeducted,
      });
    } catch (error) {
      logger.error('TokenTrackingService: Error recording to ledger', {
        error: error instanceof Error ? error.message : String(error),
        requestId: record.requestId,
      });
      throw new Error('Failed to record token usage');
    }
  }

  /**
   * Get token usage records for a user
   */
  async getUserTokenUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<TokenUsageRecord[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default
    const end = endDate || new Date();

    const records = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM token_usage_ledger
      WHERE user_id = ${userId}::uuid
        AND created_at BETWEEN ${start} AND ${end}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return records.map(this.mapToTokenUsageRecord);
  }

  /**
   * Get daily token usage summary
   */
  async getDailyTokenSummary(userId: string, date: Date) {
    const summaries = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM token_usage_daily_summary
      WHERE user_id = ${userId}::uuid AND summary_date = ${date}::date
      LIMIT 1
    `;

    if (!summaries || summaries.length === 0) return null;

    const s = summaries[0];
    return {
      totalRequests: parseInt(s.total_requests),
      totalInputTokens: parseInt(s.total_input_tokens),
      totalOutputTokens: parseInt(s.total_output_tokens),
      totalVendorCost: parseFloat(s.total_vendor_cost),
      totalCreditsDeducted: parseInt(s.total_credits_deducted),
      totalGrossMargin: parseFloat(s.total_gross_margin),
      avgRequestLatencyMs: parseInt(s.avg_request_latency_ms),
      successRate: parseFloat(s.success_rate),
    };
  }

  private mapToTokenUsageRecord(record: any): TokenUsageRecord {
    return {
      requestId: record.request_id,
      userId: record.user_id,
      modelId: record.model_id,
      providerId: record.provider_id,
      inputTokens: record.input_tokens,
      outputTokens: record.output_tokens,
      cachedInputTokens: record.cached_input_tokens,
      totalTokens: record.total_tokens,
      vendorCost: parseFloat(record.vendor_cost),
      creditDeducted: record.credits_deducted,
      marginMultiplier: parseFloat(record.margin_multiplier),
      grossMargin: parseFloat(record.gross_margin_usd),
      requestType: record.request_type,
      streamingSegments: record.streaming_segments,
      requestStartedAt: new Date(record.request_started_at),
      requestCompletedAt: new Date(record.request_completed_at),
      processingTime: record.processing_time_ms,
      status: record.status,
      errorMessage: record.error_message,
      isStreamingComplete: record.is_streaming_complete,
      createdAt: new Date(record.created_at),
    };
  }
}
