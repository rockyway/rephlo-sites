/**
 * Cost Calculation Service Interface
 *
 * Handles vendor pricing lookups and cost calculations for token usage.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  providerId: string;
  cachedInputTokens?: number;
}

export interface CostCalculation {
  vendorCost: number;  // USD
  inputCost: number;
  outputCost: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  pricingSource: string;  // Which pricing row used
}

export interface VendorPricing {
  id: string;
  providerId: string;
  modelName: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  cacheInputPricePer1k?: number;
  cacheHitPricePer1k?: number;
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
