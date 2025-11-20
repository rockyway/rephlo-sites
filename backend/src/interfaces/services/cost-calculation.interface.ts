/**
 * Cost Calculation Service Interface
 *
 * Handles vendor pricing lookups and cost calculations for token usage.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 * Enhanced for Prompt Caching (Plan 207)
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  providerId: string;

  // DEPRECATED: Legacy cache field (for backward compatibility)
  cachedInputTokens?: number;

  // Anthropic Prompt Caching Metrics
  cacheCreationInputTokens?: number; // Tokens written to cache (billed at 1.25x)
  cacheReadInputTokens?: number;     // Tokens read from cache (billed at 0.1x)

  // OpenAI/Google Prompt Caching Metrics
  cachedPromptTokens?: number;       // Tokens served from cache (billed at 0.5x)
  cachedContentTokenCount?: number;  // Google's cache metric name
}

export interface CostCalculation {
  vendorCost: number;  // Total USD cost
  inputCost: number;   // Regular input tokens cost
  outputCost: number;  // Output tokens cost

  // Cache-specific costs (Plan 207)
  cacheWriteCost?: number;  // Cache creation cost (Anthropic 1.25x)
  cacheReadCost?: number;   // Cache read cost (Anthropic 0.1x, OpenAI 0.5x)

  // Token counts
  inputTokens: number;
  outputTokens: number;

  // Cache token counts
  cachedTokens?: number;              // DEPRECATED: Use specific fields below
  cacheCreationTokens?: number;       // Anthropic cache write tokens
  cacheReadTokens?: number;           // Anthropic cache read tokens
  cachedPromptTokens?: number;        // OpenAI/Google cached tokens

  // Cost transparency (Plan 207)
  costWithoutCaching?: number;        // Hypothetical cost if no caching used
  costSavingsPercent?: number;        // Savings percentage due to caching

  pricingSource: string;              // Which pricing row used
}

export interface VendorPricing {
  id: string;
  providerId: string;
  modelName: string;
  inputPricePer1k: number;
  outputPricePer1k: number;

  // Prompt Caching Pricing (Plan 207)
  // DEPRECATED: Legacy fields
  cacheInputPricePer1k?: number;      // Legacy: Cache write price
  cacheHitPricePer1k?: number;        // Legacy: Cache read price

  // NEW: Detailed cache pricing
  cacheWritePricePer1k?: number;      // Cache creation price (Anthropic: 1.25x base)
  cacheReadPricePer1k?: number;       // Cache read price (Anthropic: 0.1x, OpenAI: 0.5x)

  effectiveFrom: Date;
  effectiveUntil?: Date;
  isActive: boolean;
}

export interface ICostCalculationService {
  /**
   * Look up vendor pricing for a specific model/provider
   * @param modelId - Model identifier
   * @param providerId - Provider identifier
   * @param effectiveDate - Optional date for historical pricing lookup
   * @returns Vendor pricing record
   */
  getVendorPricing(
    modelId: string,
    providerId: string,
    effectiveDate?: Date
  ): Promise<VendorPricing | null>;

  /**
   * Calculate vendor cost from token usage
   * @param usage - Token usage details
   * @returns Detailed cost calculation
   */
  calculateVendorCost(usage: TokenUsage): Promise<CostCalculation>;

  /**
   * Estimate cost before request (for pre-checks)
   * @param inputTokens - Estimated input tokens
   * @param estimatedOutputTokens - Estimated output tokens
   * @param modelId - Model identifier
   * @param providerId - Provider identifier
   * @returns Estimated vendor cost
   */
  estimateTokenCost(
    inputTokens: number,
    estimatedOutputTokens: number,
    modelId: string,
    providerId: string
  ): Promise<number>;
}
