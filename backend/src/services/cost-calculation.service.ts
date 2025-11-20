/**
 * Cost Calculation Service
 *
 * Handles vendor pricing lookups and cost calculations for token usage.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 *
 * Responsibilities:
 * - Look up vendor pricing for models
 * - Calculate actual vendor costs from token usage
 * - Estimate costs before API requests
 * - Support historical pricing lookups
 *
 * Reference: docs/plan/112-token-to-credit-conversion-mechanism.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  ICostCalculationService,
  TokenUsage,
  CostCalculation,
  VendorPricing,
} from '../interfaces';

@injectable()
export class CostCalculationService implements ICostCalculationService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('CostCalculationService: Initialized');
  }

  /**
   * Look up vendor pricing for a specific model/provider
   * Uses current date by default, but supports historical lookups
   *
   * @param modelId - Model identifier
   * @param providerId - Provider identifier
   * @param effectiveDate - Optional date for historical pricing
   * @returns Vendor pricing record or null if not found
   */
  async getVendorPricing(
    modelId: string,
    providerId: string,
    effectiveDate: Date = new Date()
  ): Promise<VendorPricing | null> {
    logger.debug('CostCalculationService: Getting vendor pricing', {
      modelId,
      providerId,
      effectiveDate,
    });

    try {
      // Find pricing that was effective at the given date
      const pricing = await this.prisma.$queryRaw<any[]>`
        SELECT
          id,
          provider_id as "providerId",
          model_name as "modelName",
          input_price_per_1k as "inputPricePer1k",
          output_price_per_1k as "outputPricePer1k",
          cache_input_price_per_1k as "cacheInputPricePer1k",
          cache_hit_price_per_1k as "cacheHitPricePer1k",
          cache_write_price_per_1k as "cacheWritePricePer1k",
          cache_read_price_per_1k as "cacheReadPricePer1k",
          effective_from as "effectiveFrom",
          effective_until as "effectiveUntil",
          is_active as "isActive"
        FROM model_provider_pricing
        WHERE provider_id = ${providerId}::uuid
          AND model_name = ${modelId}
          AND effective_from <= ${effectiveDate}
          AND (effective_until IS NULL OR effective_until >= ${effectiveDate})
          AND is_active = true
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (!pricing || pricing.length === 0) {
        logger.warn('CostCalculationService: No pricing found', {
          modelId,
          providerId,
          effectiveDate,
        });
        return null;
      }

      const record = pricing[0];
      logger.debug('CostCalculationService: Vendor pricing retrieved', {
        modelId,
        providerId,
        inputPricePer1k: record.inputPricePer1k,
        outputPricePer1k: record.outputPricePer1k,
      });

      return {
        id: record.id,
        providerId: record.providerId,
        modelName: record.modelName,
        inputPricePer1k: parseFloat(record.inputPricePer1k),
        outputPricePer1k: parseFloat(record.outputPricePer1k),
        cacheInputPricePer1k: record.cacheInputPricePer1k
          ? parseFloat(record.cacheInputPricePer1k)
          : undefined,
        cacheHitPricePer1k: record.cacheHitPricePer1k
          ? parseFloat(record.cacheHitPricePer1k)
          : undefined,
        cacheWritePricePer1k: record.cacheWritePricePer1k
          ? parseFloat(record.cacheWritePricePer1k)
          : undefined,
        cacheReadPricePer1k: record.cacheReadPricePer1k
          ? parseFloat(record.cacheReadPricePer1k)
          : undefined,
        effectiveFrom: new Date(record.effectiveFrom),
        effectiveUntil: record.effectiveUntil ? new Date(record.effectiveUntil) : undefined,
        isActive: record.isActive,
      };
    } catch (error) {
      logger.error('CostCalculationService: Error getting vendor pricing', {
        error: error instanceof Error ? error.message : String(error),
        modelId,
        providerId,
      });
      throw new Error('Failed to retrieve vendor pricing');
    }
  }

  /**
   * Calculate vendor cost from token usage
   * Handles regular tokens and cached tokens with differential pricing
   * Anthropic: Cache write (1.25x), Cache read (0.1x)
   * OpenAI: Cached prompt tokens (0.5x)
   *
   * @param usage - Token usage details
   * @returns Detailed cost calculation with cache breakdown
   * @throws Error if pricing not found
   */
  async calculateVendorCost(usage: TokenUsage): Promise<CostCalculation> {
    logger.debug('CostCalculationService: Calculating vendor cost', {
      modelId: usage.modelId,
      providerId: usage.providerId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      cachedPromptTokens: usage.cachedPromptTokens,
    });

    // Step 1: Look up active pricing for this model/provider
    const pricing = await this.getVendorPricing(usage.modelId, usage.providerId);

    if (!pricing) {
      const errorMsg = `No active pricing found for ${usage.providerId}/${usage.modelId}`;
      logger.error('CostCalculationService: ' + errorMsg);
      throw new Error(errorMsg);
    }

    // Step 2: Calculate regular input/output costs
    const inputCost = (usage.inputTokens * pricing.inputPricePer1k) / 1000;
    const outputCost = (usage.outputTokens * pricing.outputPricePer1k) / 1000;

    // Step 3: Calculate cache costs with differential pricing
    let cacheWriteCost = 0;
    let cacheReadCost = 0;

    // Anthropic cache metrics (separate write/read)
    if (usage.cacheCreationInputTokens) {
      const cacheWritePrice = pricing.cacheWritePricePer1k || pricing.cacheInputPricePer1k || pricing.inputPricePer1k;
      cacheWriteCost = (usage.cacheCreationInputTokens * cacheWritePrice) / 1000;
    }

    if (usage.cacheReadInputTokens) {
      const cacheReadPrice = pricing.cacheReadPricePer1k || pricing.cacheHitPricePer1k || (pricing.inputPricePer1k * 0.1);
      cacheReadCost = (usage.cacheReadInputTokens * cacheReadPrice) / 1000;
    }

    // OpenAI/Google cache metrics (single cached token count)
    if (usage.cachedPromptTokens && !usage.cacheReadInputTokens) {
      const cachedPrice = pricing.cacheReadPricePer1k || pricing.cacheHitPricePer1k || (pricing.inputPricePer1k * 0.5);
      cacheReadCost = (usage.cachedPromptTokens * cachedPrice) / 1000;
    }

    if (usage.cachedContentTokenCount && !usage.cacheReadInputTokens && !usage.cachedPromptTokens) {
      const cachedPrice = pricing.cacheReadPricePer1k || (pricing.inputPricePer1k * 0.1);
      cacheReadCost = (usage.cachedContentTokenCount * cachedPrice) / 1000;
    }

    const totalVendorCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

    // Step 4: Calculate cost savings (what it would have cost without caching)
    let costWithoutCaching: number | undefined;
    let costSavingsPercent: number | undefined;

    const totalCachedTokens = (usage.cacheCreationInputTokens || 0) + (usage.cacheReadInputTokens || 0) +
                              (usage.cachedPromptTokens || 0) + (usage.cachedContentTokenCount || 0);

    if (totalCachedTokens > 0) {
      // Calculate what it would cost if all cached tokens were regular input tokens
      const hypotheticalInputTokens = usage.inputTokens + totalCachedTokens;
      costWithoutCaching = (hypotheticalInputTokens * pricing.inputPricePer1k) / 1000 + outputCost;

      if (costWithoutCaching > 0) {
        costSavingsPercent = ((costWithoutCaching - totalVendorCost) / costWithoutCaching) * 100;
      }
    }

    // Step 5: Return detailed breakdown
    const result: CostCalculation = {
      vendorCost: totalVendorCost,
      inputCost,
      outputCost,
      cacheWriteCost: cacheWriteCost > 0 ? cacheWriteCost : undefined,
      cacheReadCost: cacheReadCost > 0 ? cacheReadCost : undefined,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedInputTokens, // Legacy field
      cacheCreationTokens: usage.cacheCreationInputTokens,
      cacheReadTokens: usage.cacheReadInputTokens,
      cachedPromptTokens: usage.cachedPromptTokens || usage.cachedContentTokenCount,
      costWithoutCaching,
      costSavingsPercent,
      pricingSource: `${pricing.providerId}/${pricing.modelName} (effective ${pricing.effectiveFrom.toISOString()})`,
    };

    logger.info('CostCalculationService: Vendor cost calculated', {
      modelId: usage.modelId,
      providerId: usage.providerId,
      vendorCost: totalVendorCost,
      inputCost,
      outputCost,
      cacheWriteCost,
      cacheReadCost,
      costSavingsPercent,
    });

    return result;
  }

  /**
   * Estimate cost before request (for pre-checks)
   * Uses current pricing and estimated token counts
   *
   * @param inputTokens - Estimated input tokens
   * @param estimatedOutputTokens - Estimated output tokens
   * @param modelId - Model identifier
   * @param providerId - Provider identifier
   * @returns Estimated vendor cost in USD
   * @throws Error if pricing not found
   */
  async estimateTokenCost(
    inputTokens: number,
    estimatedOutputTokens: number,
    modelId: string,
    providerId: string
  ): Promise<number> {
    logger.debug('CostCalculationService: Estimating token cost', {
      modelId,
      providerId,
      inputTokens,
      estimatedOutputTokens,
    });

    const pricing = await this.getVendorPricing(modelId, providerId);

    if (!pricing) {
      const errorMsg = `No active pricing found for ${providerId}/${modelId}`;
      logger.error('CostCalculationService: ' + errorMsg);
      throw new Error(errorMsg);
    }

    const estimatedInputCost = (inputTokens * pricing.inputPricePer1k) / 1000;
    const estimatedOutputCost = (estimatedOutputTokens * pricing.outputPricePer1k) / 1000;
    const totalEstimatedCost = estimatedInputCost + estimatedOutputCost;

    logger.debug('CostCalculationService: Token cost estimated', {
      modelId,
      providerId,
      estimatedCost: totalEstimatedCost,
    });

    return totalEstimatedCost;
  }

  /**
   * Calculate cost using historical pricing
   * Used when calculating costs for past requests
   *
   * @param usage - Token usage details
   * @param requestStartedAt - When the request was initiated
   * @returns Cost calculation using historical pricing
   */
  async calculateVendorCostWithHistoricalPricing(
    usage: TokenUsage,
    requestStartedAt: Date
  ): Promise<CostCalculation> {
    logger.debug('CostCalculationService: Calculating cost with historical pricing', {
      modelId: usage.modelId,
      providerId: usage.providerId,
      requestStartedAt,
    });

    // Find pricing that was active at request start time
    const historicalPricing = await this.getVendorPricing(
      usage.modelId,
      usage.providerId,
      requestStartedAt
    );

    if (!historicalPricing) {
      logger.warn(
        'CostCalculationService: No historical pricing found, falling back to current pricing'
      );
      // Fall back to current pricing (best effort)
      return this.calculateVendorCost(usage);
    }

    // Use the historical pricing - apply same cache calculation logic
    const inputCost = (usage.inputTokens * historicalPricing.inputPricePer1k) / 1000;
    const outputCost = (usage.outputTokens * historicalPricing.outputPricePer1k) / 1000;

    let cacheWriteCost = 0;
    let cacheReadCost = 0;

    // Anthropic cache metrics
    if (usage.cacheCreationInputTokens) {
      const cacheWritePrice = historicalPricing.cacheWritePricePer1k || historicalPricing.cacheInputPricePer1k || historicalPricing.inputPricePer1k;
      cacheWriteCost = (usage.cacheCreationInputTokens * cacheWritePrice) / 1000;
    }

    if (usage.cacheReadInputTokens) {
      const cacheReadPrice = historicalPricing.cacheReadPricePer1k || historicalPricing.cacheHitPricePer1k || (historicalPricing.inputPricePer1k * 0.1);
      cacheReadCost = (usage.cacheReadInputTokens * cacheReadPrice) / 1000;
    }

    // OpenAI/Google cache metrics
    if (usage.cachedPromptTokens && !usage.cacheReadInputTokens) {
      const cachedPrice = historicalPricing.cacheReadPricePer1k || historicalPricing.cacheHitPricePer1k || (historicalPricing.inputPricePer1k * 0.5);
      cacheReadCost = (usage.cachedPromptTokens * cachedPrice) / 1000;
    }

    const totalVendorCost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

    logger.info('CostCalculationService: Historical cost calculated', {
      modelId: usage.modelId,
      providerId: usage.providerId,
      requestStartedAt,
      vendorCost: totalVendorCost,
      cacheWriteCost,
      cacheReadCost,
    });

    return {
      vendorCost: totalVendorCost,
      inputCost,
      outputCost,
      cacheWriteCost: cacheWriteCost > 0 ? cacheWriteCost : undefined,
      cacheReadCost: cacheReadCost > 0 ? cacheReadCost : undefined,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedInputTokens,
      cacheCreationTokens: usage.cacheCreationInputTokens,
      cacheReadTokens: usage.cacheReadInputTokens,
      cachedPromptTokens: usage.cachedPromptTokens,
      pricingSource: `Historical pricing from ${historicalPricing.effectiveFrom.toISOString()}`,
    };
  }

  /**
   * Get current pricing for all models
   * Useful for admin dashboards showing pricing overview
   *
   * @returns List of active pricing records
   */
  async getAllActivePricing(): Promise<VendorPricing[]> {
    logger.debug('CostCalculationService: Getting all active pricing');

    try {
      const pricingRecords = await this.prisma.$queryRaw<any[]>`
        SELECT
          id,
          provider_id as "providerId",
          model_name as "modelName",
          input_price_per_1k as "inputPricePer1k",
          output_price_per_1k as "outputPricePer1k",
          cache_input_price_per_1k as "cacheInputPricePer1k",
          cache_hit_price_per_1k as "cacheHitPricePer1k",
          cache_write_price_per_1k as "cacheWritePricePer1k",
          cache_read_price_per_1k as "cacheReadPricePer1k",
          effective_from as "effectiveFrom",
          effective_until as "effectiveUntil",
          is_active as "isActive"
        FROM model_provider_pricing
        WHERE is_active = true
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until >= NOW())
        ORDER BY provider_id, model_name
      `;

      return pricingRecords.map((record) => ({
        id: record.id,
        providerId: record.providerId,
        modelName: record.modelName,
        inputPricePer1k: parseFloat(record.inputPricePer1k),
        outputPricePer1k: parseFloat(record.outputPricePer1k),
        cacheInputPricePer1k: record.cacheInputPricePer1k
          ? parseFloat(record.cacheInputPricePer1k)
          : undefined,
        cacheHitPricePer1k: record.cacheHitPricePer1k
          ? parseFloat(record.cacheHitPricePer1k)
          : undefined,
        cacheWritePricePer1k: record.cacheWritePricePer1k
          ? parseFloat(record.cacheWritePricePer1k)
          : undefined,
        cacheReadPricePer1k: record.cacheReadPricePer1k
          ? parseFloat(record.cacheReadPricePer1k)
          : undefined,
        effectiveFrom: new Date(record.effectiveFrom),
        effectiveUntil: record.effectiveUntil ? new Date(record.effectiveUntil) : undefined,
        isActive: record.isActive,
      }));
    } catch (error) {
      logger.error('CostCalculationService: Error getting all active pricing', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to retrieve active pricing');
    }
  }
}
