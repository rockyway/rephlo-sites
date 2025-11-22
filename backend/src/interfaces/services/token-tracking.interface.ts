/**
 * Token Tracking Service Interface
 *
 * Captures and records token usage from LLM API responses.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 */

export interface TokenUsageRecord {
  requestId: string;
  userId: string;
  modelId: string;
  providerId: string;

  // Token counts
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  totalTokens: number;

  // Cost (calculated)
  vendorCost: number;
  creditDeducted: number;
  marginMultiplier: number;
  grossMargin: number;

  // Phase 3: Separate input/output credits
  inputCredits?: number;
  outputCredits?: number;

  // Plan 204: Vision/Image Support
  imageCount?: number;     // Number of images in the request
  imageTokens?: number;    // Tokens consumed by image processing

  // Plan 207: Prompt Caching Support
  cacheCreationTokens?: number;    // Tokens written to cache (billed at 1.25x for Anthropic)
  cacheReadTokens?: number;        // Tokens read from cache (billed at 0.1x for Anthropic)
  cachedPromptTokens?: number;     // Cached tokens in prompt (billed at 0.5x for OpenAI)
  cacheHitRate?: number | null;    // Cache hit rate percentage (0-100)
  costSavingsPercent?: number | null;  // Cost savings percentage from caching
  cacheWriteCredits?: number | null;   // Credits for cache write operations
  cacheReadCredits?: number | null;    // Credits for cache read operations

  // Request metadata
  requestType: 'completion' | 'streaming' | 'batch';
  streamingSegments?: number;

  // Timing
  requestStartedAt: Date;
  requestCompletedAt: Date;
  processingTime: number;  // ms

  // Status
  status: 'success' | 'failed' | 'cancelled' | 'rate_limited';
  errorMessage?: string;

  // For streaming completion
  isStreamingComplete?: boolean;

  createdAt: Date;
}

export interface RequestMetadata {
  modelId: string;
  providerId: string;
  requestType: 'completion' | 'streaming' | 'batch';
  requestStartedAt: Date;
}

export interface ITokenTrackingService {
  /**
   * Parse vendor-specific token counts from API responses
   * @param apiResponse - Raw API response
   * @param providerId - Provider identifier
   * @returns Parsed token usage
   */
  parseTokenUsage(
    apiResponse: any,
    providerId: string
  ): {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
    totalTokens: number;
  };

  /**
   * Capture and record token usage from completion
   * @param userId - User ID
   * @param apiResponse - API response with token usage
   * @param requestMetadata - Request metadata
   * @returns Token usage record
   */
  captureTokenUsage(
    userId: string,
    apiResponse: any,
    requestMetadata: RequestMetadata
  ): Promise<TokenUsageRecord>;

  /**
   * Capture streaming completion token usage
   * Collects all chunks and records final token count
   * @param userId - User ID
   * @param streamChunks - Async iterable of stream chunks
   * @param requestMetadata - Request metadata
   * @returns Token usage record
   */
  captureStreamingTokenUsage(
    userId: string,
    streamChunks: AsyncIterable<any>,
    requestMetadata: RequestMetadata
  ): Promise<TokenUsageRecord>;

  /**
   * Record token usage to ledger
   * @param record - Token usage record
   */
  recordToLedger(record: TokenUsageRecord): Promise<void>;

  /**
   * Get token usage records for a user
   * @param userId - User ID
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @param limit - Max records to return
   * @returns List of token usage records
   */
  getUserTokenUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<TokenUsageRecord[]>;

  /**
   * Get daily token usage summary
   * @param userId - User ID
   * @param date - Summary date
   * @returns Daily summary or null
   */
  getDailyTokenSummary(
    userId: string,
    date: Date
  ): Promise<{
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalVendorCost: number;
    totalCreditsDeducted: number;
    totalGrossMargin: number;
    avgRequestLatencyMs: number;
    successRate: number;
  } | null>;
}
