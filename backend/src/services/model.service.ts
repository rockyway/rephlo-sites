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
import {
  ModelMeta,
  validateModelMeta,
  CreateModelRequest,
  MarkLegacyRequest,
  UpdateModelMetaRequest,
  calculateCreditsPerKTokens,
} from '../types/model-meta';

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
   * @param filters.includeArchived - Include archived models (admin only, default false)
   * @param userTier - Optional user subscription tier for access status
   * @returns List of models matching filters
   */
  async listModels(
    filters?: {
      available?: boolean;
      capability?: string[];
      provider?: string;
      includeArchived?: boolean;
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

    // Exclude archived models by default (unless admin explicitly includes them)
    if (!filters?.includeArchived) {
      where.isArchived = false;
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

    // Query database - only select meta JSONB (not deprecated root columns)
    const models = await this.prisma.model.findMany({
      where,
      select: {
        id: true,
        provider: true,
        isAvailable: true,
        meta: true,
      },
      orderBy: [{ isAvailable: 'desc' }, { name: 'asc' }],
    });

    const response: ModelListResponse = {
      models: models.map((model) => {
        const meta = model.meta as any;

        // Calculate tier access status if userTier provided
        let accessStatus: 'allowed' | 'restricted' | 'upgrade_required' = 'allowed';
        if (userTier) {
          const accessCheck = checkTierAccess(userTier, {
            requiredTier: meta?.requiredTier ?? 'free',
            tierRestrictionMode: meta?.tierRestrictionMode ?? 'minimum',
            allowedTiers: meta?.allowedTiers ?? ['free'],
          });
          accessStatus = accessCheck.allowed ? 'allowed' : 'upgrade_required';
        }

        return {
          id: model.id,
          name: meta?.displayName ?? model.id,
          provider: model.provider,
          description: meta?.description ?? '',
          capabilities: meta?.capabilities ?? [],
          context_length: meta?.contextLength ?? 0,
          max_output_tokens: meta?.maxOutputTokens ?? 0,
          credits_per_1k_tokens: meta?.creditsPer1kTokens ?? 0,
          is_available: model.isAvailable,
          version: meta?.version ?? '',
          // Tier access fields from meta JSONB
          required_tier: meta?.requiredTier ?? 'free',
          tier_restriction_mode: (meta?.tierRestrictionMode ?? 'minimum') as 'minimum' | 'exact' | 'whitelist',
          allowed_tiers: meta?.allowedTiers ?? ['free'],
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
        provider: true,
        isAvailable: true,
        isLegacy: true,
        meta: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!model) {
      logger.warn('ModelService: Model not found', { modelId });
      throw new Error(`Model '${modelId}' not found`);
    }

    const meta = model.meta as any;

    // Calculate tier access status if userTier provided
    let accessStatus: 'allowed' | 'restricted' | 'upgrade_required' = 'allowed';
    let upgradeInfo: { required_tier: string; upgrade_url: string } | undefined;

    if (userTier) {
      const accessCheck = checkTierAccess(userTier, {
        requiredTier: meta?.requiredTier ?? 'free',
        tierRestrictionMode: meta?.tierRestrictionMode ?? 'minimum',
        allowedTiers: meta?.allowedTiers ?? ['free'],
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
      display_name: meta?.displayName ?? model.name,
      provider: model.provider,
      description: meta?.description ?? '',
      capabilities: meta?.capabilities ?? [],
      context_length: meta?.contextLength ?? 0,
      max_output_tokens: meta?.maxOutputTokens ?? 0,
      input_cost_per_million_tokens: meta?.inputCostPerMillionTokens ?? 0,
      output_cost_per_million_tokens: meta?.outputCostPerMillionTokens ?? 0,
      credits_per_1k_tokens: meta?.creditsPer1kTokens ?? 0,
      is_available: model.isAvailable,
      is_deprecated: model.isLegacy, // Use isLegacy instead of deprecated isDeprecated
      version: meta?.version ?? '',
      created_at: model.createdAt.toISOString(),
      updated_at: model.updatedAt.toISOString(),
      // Tier access fields from meta JSONB
      required_tier: meta?.requiredTier ?? 'free',
      tier_restriction_mode: (meta?.tierRestrictionMode ?? 'minimum') as 'minimum' | 'exact' | 'whitelist',
      allowed_tiers: meta?.allowedTiers ?? ['free'],
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
        meta: true,
      },
    });

    if (!model) {
      logger.warn('ModelService: Model not found for tier check', { modelId });
      return {
        allowed: false,
        reason: 'Model not found',
      };
    }

    const meta = model.meta as any;

    const accessCheck = checkTierAccess(userTier, {
      requiredTier: meta?.requiredTier ?? 'free',
      tierRestrictionMode: meta?.tierRestrictionMode ?? 'minimum',
      allowedTiers: meta?.allowedTiers ?? ['free'],
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
        isLegacy: true,
        isArchived: true,
      },
    });

    // Available if exists, isAvailable is true, and not archived
    const isAvailable = model !== null && model.isAvailable && !model.isArchived;

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
        isAvailable: true,
        isLegacy: true,
        isArchived: true,
        meta: true,
      },
    });

    // Reject if model is not available or archived
    if (!model || !model.isAvailable || model.isArchived) {
      logger.warn('ModelService: Model not available for inference', {
        modelId,
        reason: !model
          ? 'not_found'
          : model.isArchived
          ? 'archived'
          : 'unavailable',
      });
      return null;
    }

    const meta = model.meta as any;

    return {
      id: model.id,
      provider: model.provider,
      creditsPer1kTokens: meta?.creditsPer1kTokens ?? 0,
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

  // ===========================================================================
  // Lifecycle Management Operations (NEW)
  // ===========================================================================

  /**
   * Create a new model
   * Validates meta JSONB, auto-calculates credits if needed, creates model, clears cache
   *
   * @param data - Model creation data (id, name, provider, meta)
   * @param adminUserId - Admin user ID for audit logging
   * @returns Created model details
   * @throws Error if model ID already exists or validation fails
   */
  async addModel(
    data: CreateModelRequest,
    adminUserId: string
  ): Promise<ModelDetailsResponse> {
    logger.info('ModelService: Creating new model', {
      modelId: data.id,
      adminUserId,
    });

    // Validate meta JSONB
    const validatedMeta = validateModelMeta(data.meta);

    // Auto-calculate creditsPer1kTokens if not reasonable
    if (
      !validatedMeta.creditsPer1kTokens ||
      validatedMeta.creditsPer1kTokens <= 0
    ) {
      validatedMeta.creditsPer1kTokens = calculateCreditsPerKTokens(
        validatedMeta.inputCostPerMillionTokens,
        validatedMeta.outputCostPerMillionTokens
      );
      logger.info('ModelService: Auto-calculated creditsPer1kTokens', {
        modelId: data.id,
        credits: validatedMeta.creditsPer1kTokens,
      });
    }

    // Check if model already exists
    const existing = await this.prisma.model.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      throw new Error(`Model with ID '${data.id}' already exists`);
    }

    // Create model in database
    // Tier fields stored ONLY in meta JSONB (not in root columns)
    const model = await this.prisma.model.create({
      data: {
        id: data.id,
        name: data.name,
        provider: data.provider,
        isAvailable: true,
        isLegacy: false,
        isArchived: false,
        meta: validatedMeta as any, // Prisma JsonValue - contains all tier fields
      },
    });

    // Clear cache
    modelCache.clear();

    // Log audit trail (future: use dedicated audit log table)
    logger.info('ModelService: Model created successfully', {
      modelId: model.id,
      adminUserId,
    });

    // Return model details
    return this.getModelDetails(model.id);
  }

  /**
   * Mark a model as legacy (deprecated)
   * Sets isLegacy flag, updates meta with legacy info, clears cache
   *
   * @param modelId - Model ID to mark as legacy
   * @param options - Legacy options (replacement model, deprecation notice, sunset date)
   * @param adminUserId - Admin user ID for audit logging
   * @throws Error if model not found or replacement model invalid
   */
  async markAsLegacy(
    modelId: string,
    options: MarkLegacyRequest,
    adminUserId: string
  ): Promise<void> {
    logger.info('ModelService: Marking model as legacy', {
      modelId,
      adminUserId,
      options,
    });

    // Validate model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: { meta: true },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Validate replacement model if provided
    if (options.replacementModelId) {
      const replacement = await this.prisma.model.findUnique({
        where: { id: options.replacementModelId },
      });
      if (!replacement) {
        throw new Error(
          `Replacement model '${options.replacementModelId}' not found`
        );
      }
    }

    // Update model meta with legacy fields
    const currentMeta = validateModelMeta(model.meta);
    const updatedMeta: ModelMeta = {
      ...currentMeta,
      legacyReplacementModelId: options.replacementModelId,
      deprecationNotice: options.deprecationNotice,
      sunsetDate: options.sunsetDate,
    };

    // Persist to database
    await this.prisma.model.update({
      where: { id: modelId },
      data: {
        isLegacy: true,
        meta: updatedMeta as any,
      },
    });

    // Clear cache
    modelCache.clear();

    logger.info('ModelService: Model marked as legacy', { modelId });
  }

  /**
   * Remove legacy status from a model
   * Sets isLegacy to false, removes legacy fields from meta
   *
   * @param modelId - Model ID to unmark
   * @param adminUserId - Admin user ID for audit logging
   * @throws Error if model not found
   */
  async unmarkLegacy(modelId: string, adminUserId: string): Promise<void> {
    logger.info('ModelService: Unmarking model as legacy', {
      modelId,
      adminUserId,
    });

    // Validate model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: { meta: true },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Remove legacy fields from meta
    const currentMeta = validateModelMeta(model.meta);
    const updatedMeta: ModelMeta = {
      ...currentMeta,
      legacyReplacementModelId: undefined,
      deprecationNotice: undefined,
      sunsetDate: undefined,
    };

    // Clean undefined fields
    Object.keys(updatedMeta).forEach((key) => {
      if (updatedMeta[key as keyof ModelMeta] === undefined) {
        delete updatedMeta[key as keyof ModelMeta];
      }
    });

    // Persist to database
    await this.prisma.model.update({
      where: { id: modelId },
      data: {
        isLegacy: false,
        meta: updatedMeta as any,
      },
    });

    // Clear cache
    modelCache.clear();

    logger.info('ModelService: Model unmarked as legacy', { modelId });
  }

  /**
   * Archive a model
   * Sets isArchived and isAvailable to false, preventing inference
   *
   * @param modelId - Model ID to archive
   * @param adminUserId - Admin user ID for audit logging
   * @throws Error if model not found
   */
  async archive(modelId: string, adminUserId: string): Promise<void> {
    logger.info('ModelService: Archiving model', { modelId, adminUserId });

    // Validate model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Archive model
    await this.prisma.model.update({
      where: { id: modelId },
      data: {
        isArchived: true,
        isAvailable: false,
      },
    });

    // Clear cache
    modelCache.clear();

    logger.info('ModelService: Model archived', { modelId });
  }

  /**
   * Unarchive a model
   * Restores isArchived to false and isAvailable to true
   *
   * @param modelId - Model ID to unarchive
   * @param adminUserId - Admin user ID for audit logging
   * @throws Error if model not found
   */
  async unarchive(modelId: string, adminUserId: string): Promise<void> {
    logger.info('ModelService: Unarchiving model', { modelId, adminUserId });

    // Validate model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Unarchive model
    await this.prisma.model.update({
      where: { id: modelId },
      data: {
        isArchived: false,
        isAvailable: true,
      },
    });

    // Clear cache
    modelCache.clear();

    logger.info('ModelService: Model unarchived', { modelId });
  }

  /**
   * Update model metadata (partial update)
   * Merges partial updates with existing meta, validates combined result
   *
   * @param modelId - Model ID to update
   * @param metaUpdates - Partial metadata updates
   * @param adminUserId - Admin user ID for audit logging
   * @throws Error if model not found or validation fails
   */
  async updateModelMeta(
    modelId: string,
    metaUpdates: UpdateModelMetaRequest,
    adminUserId: string
  ): Promise<void> {
    logger.info('ModelService: Updating model metadata', {
      modelId,
      adminUserId,
      updates: Object.keys(metaUpdates),
    });

    // Validate model exists
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: { meta: true },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Merge with existing meta
    const currentMeta = validateModelMeta(model.meta);
    const mergedMeta: ModelMeta = {
      ...currentMeta,
      ...metaUpdates,
    };

    // Validate merged result
    const validatedMeta = validateModelMeta(mergedMeta);

    // Update database
    // Tier fields stored ONLY in meta JSONB (not synced to root columns)
    await this.prisma.model.update({
      where: { id: modelId },
      data: {
        meta: validatedMeta as any,
      },
    });

    // Clear cache
    modelCache.clear();

    logger.info('ModelService: Model metadata updated', { modelId });
  }

  /**
   * Get all legacy models
   * Returns models where isLegacy = true
   *
   * @returns List of legacy models with replacement info
   */
  async getLegacyModels(): Promise<ModelListResponse> {
    logger.debug('ModelService: Getting legacy models');

    const models = await this.prisma.model.findMany({
      where: { isLegacy: true },
      select: {
        id: true,
        name: true,
        provider: true,
        isAvailable: true,
        isLegacy: true,
        isArchived: true,
        meta: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      models: models.map((model) => {
        const meta = model.meta as any;
        return {
          id: model.id,
          name: meta?.displayName ?? model.name,
          provider: model.provider,
          description: meta?.description ?? '',
          capabilities: meta?.capabilities ?? [],
          context_length: meta?.contextLength ?? 0,
          max_output_tokens: meta?.maxOutputTokens ?? 0,
          credits_per_1k_tokens: meta?.creditsPer1kTokens ?? 0,
          is_available: model.isAvailable,
          is_legacy: model.isLegacy,
          is_archived: model.isArchived,
          version: meta?.version ?? '',
          required_tier: meta?.requiredTier ?? 'free',
          tier_restriction_mode: (meta?.tierRestrictionMode ?? 'minimum') as
            | 'minimum'
            | 'exact'
            | 'whitelist',
          allowed_tiers: meta?.allowedTiers ?? ['free'],
          access_status: 'allowed',
        };
      }),
      total: models.length,
    };
  }

  /**
   * Get all archived models
   * Returns models where isArchived = true
   *
   * @returns List of archived models
   */
  async getArchivedModels(): Promise<ModelListResponse> {
    logger.debug('ModelService: Getting archived models');

    const models = await this.prisma.model.findMany({
      where: { isArchived: true },
      select: {
        id: true,
        name: true,
        provider: true,
        isAvailable: true,
        isLegacy: true,
        isArchived: true,
        meta: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      models: models.map((model) => {
        const meta = model.meta as any;
        return {
          id: model.id,
          name: meta?.displayName ?? model.name,
          provider: model.provider,
          description: meta?.description ?? '',
          capabilities: meta?.capabilities ?? [],
          context_length: meta?.contextLength ?? 0,
          max_output_tokens: meta?.maxOutputTokens ?? 0,
          credits_per_1k_tokens: meta?.creditsPer1kTokens ?? 0,
          is_available: model.isAvailable,
          is_legacy: model.isLegacy,
          is_archived: model.isArchived,
          version: meta?.version ?? '',
          required_tier: meta?.requiredTier ?? 'free',
          tier_restriction_mode: (meta?.tierRestrictionMode ?? 'minimum') as
            | 'minimum'
            | 'exact'
            | 'whitelist',
          allowed_tiers: meta?.allowedTiers ?? ['free'],
          access_status: 'allowed',
        };
      }),
      total: models.length,
    };
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
