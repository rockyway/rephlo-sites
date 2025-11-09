/**
 * Model Management Service (Refactored with DI)
 *
 * Handles model listing, filtering, and metadata operations.
 * Provides business logic for retrieving available LLM models and their details.
 *
 * Features:
 * - List available models with filtering (availability, capability, provider)
 * - Get detailed model information by ID
 * - In-memory caching for model metadata (performance optimization)
 * - Validate model availability before inference requests
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Model APIs - endpoints 1-2)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, ModelCapability, SubscriptionTier } from '@prisma/client';
import logger from '../utils/logger';
import {
  ModelListResponse,
  ModelDetailsResponse,
} from '../types/model-validation';
import { IModelService } from '../interfaces';
import {
  checkTierAccess,
  TierAccessResult,
} from '../utils/tier-access';

// =============================================================================
// In-Memory Cache
// =============================================================================

/**
 * Simple in-memory cache for model metadata
 * Reduces database queries for frequently accessed model data
 */
class ModelCache {
  private cache: Map<string, any> = new Map();
  private lastRefresh: number = 0;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any): void {
    this.cache.set(key, value);
    this.lastRefresh = Date.now();
  }

  get(key: string): any | null {
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.cache.get(key) || null;
  }

  clear(): void {
    this.cache.clear();
    this.lastRefresh = 0;
  }

  isExpired(): boolean {
    return Date.now() - this.lastRefresh > this.TTL;
  }
}

const modelCache = new ModelCache();

// =============================================================================
// Model Service Class
// =============================================================================

@injectable()
export class ModelService implements IModelService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('ModelService: Initialized');
  }

  // ===========================================================================
  // Model Listing Operations
  // ===========================================================================

  /**
   * List all available models with optional filters
   *
   * @param filters - Optional filters for models
   * @param filters.available - Filter by availability (true/false)
   * @param filters.capability - Filter by capabilities (array of capability names)
   * @param filters.provider - Filter by provider (openai, anthropic, google)
   * @param userTier - Optional user subscription tier for access status
   * @returns List of models matching filters
   */
  async listModels(
    filters?: {
      available?: boolean;
      capability?: string[];
      provider?: string;
    },
    userTier?: SubscriptionTier
  ): Promise<ModelListResponse> {
    logger.debug('ModelService: Listing models', { filters, userTier });

    // Check cache first (include userTier in cache key)
    const cacheKey = `models_${JSON.stringify(filters || {})}_${userTier || 'public'}`;
    const cached = modelCache.get(cacheKey);
    if (cached) {
      logger.debug('ModelService: Returning cached model list');
      return cached;
    }

    // Build where clause
    const where: any = {};

    if (filters?.available !== undefined) {
      where.isAvailable = filters.available;
    }

    if (filters?.capability && filters.capability.length > 0) {
      // Filter models that have ANY of the specified capabilities
      where.capabilities = {
        hasSome: filters.capability as ModelCapability[],
      };
    }

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    // Query database
    const models = await this.prisma.model.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        provider: true,
        description: true,
        capabilities: true,
        contextLength: true,
        maxOutputTokens: true,
        creditsPer1kTokens: true,
        isAvailable: true,
        version: true,
        // Tier access fields
        requiredTier: true,
        tierRestrictionMode: true,
        allowedTiers: true,
      },
      orderBy: [{ isAvailable: 'desc' }, { displayName: 'asc' }],
    });

    const response: ModelListResponse = {
      models: models.map((model) => {
        // Calculate tier access status if userTier provided
        let accessStatus: 'allowed' | 'restricted' | 'upgrade_required' = 'allowed';
        if (userTier) {
          const accessCheck = checkTierAccess(userTier, {
            requiredTier: model.requiredTier,
            tierRestrictionMode: model.tierRestrictionMode,
            allowedTiers: model.allowedTiers,
          });
          accessStatus = accessCheck.allowed ? 'allowed' : 'upgrade_required';
        }

        return {
          id: model.id,
          name: model.displayName,
          provider: model.provider,
          description: model.description,
          capabilities: model.capabilities,
          context_length: model.contextLength,
          max_output_tokens: model.maxOutputTokens,
          credits_per_1k_tokens: model.creditsPer1kTokens,
          is_available: model.isAvailable,
          version: model.version,
          // Tier access fields
          required_tier: model.requiredTier,
          tier_restriction_mode: model.tierRestrictionMode as 'minimum' | 'exact' | 'whitelist',
          allowed_tiers: model.allowedTiers,
          access_status: accessStatus,
        };
      }),
      total: models.length,
      user_tier: userTier,
    };

    // Cache result
    modelCache.set(cacheKey, response);

    logger.info('ModelService: Models listed', {
      total: models.length,
      filters,
    });

    return response;
  }

  /**
   * Get detailed information about a specific model
   *
   * @param modelId - Model ID (e.g., 'gpt-5', 'claude-3.5-sonnet')
   * @param userTier - Optional user subscription tier for access status
   * @returns Detailed model information
   * @throws Error if model not found
   */
  async getModelDetails(
    modelId: string,
    userTier?: SubscriptionTier
  ): Promise<ModelDetailsResponse> {
    logger.debug('ModelService: Getting model details', { modelId, userTier });

    // Check cache first (include userTier in cache key)
    const cacheKey = `model_${modelId}_${userTier || 'public'}`;
    const cached = modelCache.get(cacheKey);
    if (cached) {
      logger.debug('ModelService: Returning cached model details');
      return cached;
    }

    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        displayName: true,
        provider: true,
        description: true,
        capabilities: true,
        contextLength: true,
        maxOutputTokens: true,
        inputCostPerMillionTokens: true,
        outputCostPerMillionTokens: true,
        creditsPer1kTokens: true,
        isAvailable: true,
        isDeprecated: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        // Tier access fields
        requiredTier: true,
        tierRestrictionMode: true,
        allowedTiers: true,
      },
    });

    if (!model) {
      logger.warn('ModelService: Model not found', { modelId });
      throw new Error(`Model '${modelId}' not found`);
    }

    // Calculate tier access status if userTier provided
    let accessStatus: 'allowed' | 'restricted' | 'upgrade_required' = 'allowed';
    let upgradeInfo: { required_tier: string; upgrade_url: string } | undefined;

    if (userTier) {
      const accessCheck = checkTierAccess(userTier, {
        requiredTier: model.requiredTier,
        tierRestrictionMode: model.tierRestrictionMode,
        allowedTiers: model.allowedTiers,
      });

      accessStatus = accessCheck.allowed ? 'allowed' : 'upgrade_required';

      if (!accessCheck.allowed && accessCheck.requiredTier) {
        upgradeInfo = {
          required_tier: accessCheck.requiredTier,
          upgrade_url: '/subscriptions/upgrade',
        };
      }
    }

    const response: ModelDetailsResponse = {
      id: model.id,
      name: model.name,
      display_name: model.displayName,
      provider: model.provider,
      description: model.description,
      capabilities: model.capabilities,
      context_length: model.contextLength,
      max_output_tokens: model.maxOutputTokens,
      input_cost_per_million_tokens: model.inputCostPerMillionTokens,
      output_cost_per_million_tokens: model.outputCostPerMillionTokens,
      credits_per_1k_tokens: model.creditsPer1kTokens,
      is_available: model.isAvailable,
      is_deprecated: model.isDeprecated,
      version: model.version,
      created_at: model.createdAt.toISOString(),
      updated_at: model.updatedAt.toISOString(),
      // Tier access fields
      required_tier: model.requiredTier,
      tier_restriction_mode: model.tierRestrictionMode as 'minimum' | 'exact' | 'whitelist',
      allowed_tiers: model.allowedTiers,
      access_status: accessStatus,
      upgrade_info: upgradeInfo,
    };

    // Cache result
    modelCache.set(cacheKey, response);

    logger.info('ModelService: Model details retrieved', { modelId });

    return response;
  }

  // ===========================================================================
  // Model Validation Operations
  // ===========================================================================

  /**
   * Check if user's tier can access a specific model
   *
   * @param modelId - Model ID to check
   * @param userTier - User's subscription tier
   * @returns Access check result with allowed status, reason, and required tier
   */
  async canUserAccessModel(
    modelId: string,
    userTier: SubscriptionTier
  ): Promise<TierAccessResult> {
    logger.debug('ModelService: Checking tier access for model', {
      modelId,
      userTier,
    });

    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        requiredTier: true,
        tierRestrictionMode: true,
        allowedTiers: true,
      },
    });

    if (!model) {
      logger.warn('ModelService: Model not found for tier check', { modelId });
      return {
        allowed: false,
        reason: 'Model not found',
      };
    }

    const accessCheck = checkTierAccess(userTier, {
      requiredTier: model.requiredTier,
      tierRestrictionMode: model.tierRestrictionMode,
      allowedTiers: model.allowedTiers,
    });

    logger.debug('ModelService: Tier access check completed', {
      modelId,
      userTier,
      allowed: accessCheck.allowed,
    });

    return accessCheck;
  }

  /**
   * Check if a model exists and is available for use
   *
   * @param modelId - Model ID to validate
   * @returns true if model exists and is available, false otherwise
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    logger.debug('ModelService: Checking model availability', { modelId });

    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        isAvailable: true,
        isDeprecated: true,
      },
    });

    const isAvailable = model !== null && model.isAvailable && !model.isDeprecated;

    logger.debug('ModelService: Model availability check', {
      modelId,
      isAvailable,
    });

    return isAvailable;
  }

  /**
   * Get model by ID with minimal data (for internal use)
   * Used by LLM service to get provider and cost information
   *
   * @param modelId - Model ID
   * @returns Model data or null if not found
   */
  async getModelForInference(modelId: string): Promise<{
    id: string;
    provider: string;
    creditsPer1kTokens: number;
    isAvailable: boolean;
  } | null> {
    logger.debug('ModelService: Getting model for inference', { modelId });

    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        provider: true,
        creditsPer1kTokens: true,
        isAvailable: true,
        isDeprecated: true,
      },
    });

    if (!model || !model.isAvailable || model.isDeprecated) {
      logger.warn('ModelService: Model not available for inference', {
        modelId,
      });
      return null;
    }

    return {
      id: model.id,
      provider: model.provider,
      creditsPer1kTokens: model.creditsPer1kTokens,
      isAvailable: model.isAvailable,
    };
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear model cache
   * Should be called when model data is updated in the database
   */
  clearCache(): void {
    logger.info('ModelService: Clearing model cache');
    modelCache.clear();
  }

  /**
   * Refresh cache by pre-loading commonly accessed models
   * Can be called on server startup or periodically
   */
  async refreshCache(): Promise<void> {
    logger.info('ModelService: Refreshing model cache');

    try {
      // Pre-load all available models
      await this.listModels({ available: true });

      // Pre-load individual model details for available models
      const models = await this.prisma.model.findMany({
        where: { isAvailable: true },
        select: { id: true },
      });

      for (const model of models) {
        await this.getModelDetails(model.id);
      }

      logger.info('ModelService: Cache refreshed', {
        modelsCount: models.length,
      });
    } catch (error) {
      logger.error('ModelService: Error refreshing cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ===========================================================================
  // Statistics Operations
  // ===========================================================================

  /**
   * Get model usage statistics
   * Returns count of requests per model
   *
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @returns Model usage statistics
   */
  async getModelUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ modelId: string; requestCount: number; totalTokens: number }>> {
    logger.debug('ModelService: Getting model usage statistics', {
      startDate,
      endDate,
    });

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const stats = await this.prisma.usageHistory.groupBy({
      by: ['modelId'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        totalTokens: true,
      },
    });

    return stats.map((stat) => ({
      modelId: stat.modelId,
      requestCount: stat._count.id,
      totalTokens: stat._sum.totalTokens || 0,
    }));
  }
}

// =============================================================================
// Export Factory Function
// =============================================================================

/**
 * Create model service instance
 * Factory function to create service with Prisma client
 */
export function createModelService(prisma: PrismaClient): ModelService {
  return new ModelService(prisma);
}
