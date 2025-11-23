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
import { PrismaClient, subscription_tier as SubscriptionTier } from '@prisma/client';
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
  UpdateModelRequest,
  calculateCreditsPerKTokens,
  calculateSeparateCreditsPerKTokens,
} from '../types/model-meta';
import { ModelVersionHistoryService } from './model-version-history.service';

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
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(ModelVersionHistoryService) private versionHistory: ModelVersionHistoryService
  ) {
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
      where.is_available = filters.available;
    }

    // Exclude archived models by default (unless admin explicitly includes them)
    if (!filters?.includeArchived) {
      where.is_archived = false;
    }

    // TODO: Capability filtering requires querying meta JSONB field
    // For now, capability filtering is done in-memory after fetching
    // This can be optimized later with Prisma JSON filtering or raw SQL

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    // Query database - only select meta JSONB (not deprecated root columns)
    logger.debug('ModelService.listModels: Executing Prisma query', {
      where: JSON.stringify(where),
      filters,
      userTier,
    });

    const models = await this.prisma.models.findMany({
      where,
      select: {
        id: true,
        provider: true,
        is_available: true,
        meta: true,
      },
      orderBy: { is_available: 'desc' },
    });

    logger.debug('ModelService.listModels: Query returned', {
      count: models.length,
      ids: models.map(m => m.id),
    });

    // Apply in-memory capability filtering if specified
    let filteredModels = models;
    if (filters?.capability && filters.capability.length > 0) {
      filteredModels = models.filter((model) => {
        const meta = model.meta as any;
        const modelCapabilities = meta?.capabilities ?? [];
        // Check if model has ANY of the requested capabilities
        return filters.capability!.some(cap => modelCapabilities.includes(cap));
      });
      logger.debug('ModelService.listModels: Applied capability filter', {
        requestedCapabilities: filters.capability,
        beforeCount: models.length,
        afterCount: filteredModels.length,
      });
    }

    const response: ModelListResponse = {
      models: filteredModels.map((model) => {
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

          // Phase 3: Separate input/output pricing
          input_credits_per_k: meta?.inputCreditsPerK,
          output_credits_per_k: meta?.outputCreditsPerK,

          // DEPRECATED: Kept for backward compatibility
          credits_per_1k_tokens: meta?.creditsPer1kTokens ?? 0,

          is_available: model.is_available,
          version: meta?.version ?? '',
          // Tier access fields from meta JSONB
          required_tier: meta?.requiredTier ?? 'free',
          tier_restriction_mode: (meta?.tierRestrictionMode ?? 'minimum') as 'minimum' | 'exact' | 'whitelist',
          allowed_tiers: meta?.allowedTiers ?? ['free'],
          access_status: accessStatus,
        };
      }),
      total: filteredModels.length,
      user_tier: userTier as 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual' | undefined,
    };

    // Cache result
    modelCache.set(cacheKey, response);

    logger.info('ModelService: Models listed', {
      total: filteredModels.length,
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

    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        provider: true,
        is_available: true,
        is_legacy: true,
        meta: true,
        created_at: true,
        updated_at: true,
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

      // Phase 3: Separate input/output pricing
      input_credits_per_k: meta?.inputCreditsPerK,
      output_credits_per_k: meta?.outputCreditsPerK,

      // DEPRECATED: Kept for backward compatibility
      credits_per_1k_tokens: meta?.creditsPer1kTokens ?? 0,

      is_available: model.is_available,
      is_deprecated: model.is_legacy, // Use is_legacy instead of deprecated isDeprecated
      version: meta?.version ?? '',
      created_at: model.created_at.toISOString(),
      updated_at: model.updated_at.toISOString(),
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

    const model = await this.prisma.models.findUnique({
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

    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: {
        is_available: true,
        is_legacy: true,
        is_archived: true,
      },
    });

    // Available if exists, isAvailable is true, and not archived
    const isAvailable = model !== null && model.is_available && !model.is_archived;

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

    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        provider: true,
        is_available: true,
        is_legacy: true,
        is_archived: true,
        meta: true,
      },
    });

    // Reject if model is not available or archived
    if (!model || !model.is_available || model.is_archived) {
      logger.warn('ModelService: Model not available for inference', {
        modelId,
        reason: !model
          ? 'not_found'
          : model.is_archived
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
      isAvailable: model.is_available,
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
      const models = await this.prisma.models.findMany({
        where: { is_available: true },
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
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const stats = await this.prisma.token_usage_ledger.groupBy({
      by: ['model_id'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        input_tokens: true,
        output_tokens: true,
      },
    });

    return stats.map((stat) => ({
      modelId: stat.model_id,
      requestCount: stat._count.id,
      totalTokens: (stat._sum.input_tokens || 0) + (stat._sum.output_tokens || 0),
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

    // Phase 3: Auto-calculate separate input/output credits
    if (
      !validatedMeta.inputCreditsPerK ||
      !validatedMeta.outputCreditsPerK ||
      validatedMeta.inputCreditsPerK <= 0 ||
      validatedMeta.outputCreditsPerK <= 0
    ) {
      const separateCredits = calculateSeparateCreditsPerKTokens(
        validatedMeta.inputCostPerMillionTokens,
        validatedMeta.outputCostPerMillionTokens
      );
      validatedMeta.inputCreditsPerK = separateCredits.inputCreditsPerK;
      validatedMeta.outputCreditsPerK = separateCredits.outputCreditsPerK;

      logger.info('ModelService: Auto-calculated separate input/output credits', {
        modelId: data.id,
        inputCreditsPerK: separateCredits.inputCreditsPerK,
        outputCreditsPerK: separateCredits.outputCreditsPerK,
      });
    }

    // Auto-calculate creditsPer1kTokens for backward compatibility (DEPRECATED)
    if (
      !validatedMeta.creditsPer1kTokens ||
      validatedMeta.creditsPer1kTokens <= 0
    ) {
      validatedMeta.creditsPer1kTokens = calculateCreditsPerKTokens(
        validatedMeta.inputCostPerMillionTokens,
        validatedMeta.outputCostPerMillionTokens
      );
      logger.info('ModelService: Auto-calculated creditsPer1kTokens (deprecated)', {
        modelId: data.id,
        credits: validatedMeta.creditsPer1kTokens,
      });
    }

    // Check if model already exists
    const existing = await this.prisma.models.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      throw new Error(`Model with ID '${data.id}' already exists`);
    }

    // Step 1: Look up provider UUID
    const provider = await this.prisma.providers.findUnique({
      where: { name: data.provider },
      select: { id: true },
    });

    if (!provider) {
      throw new Error(
        `Provider '${data.provider}' not found in providers table. ` +
        `Please ensure the provider exists before creating models.`
      );
    }

    // Step 2: Create model in database
    // Tier fields stored ONLY in meta JSONB (not in root columns)
    const model = await this.prisma.models.create({
      data: {
        id: data.id,
        name: data.name,
        provider: data.provider,
        is_available: true,
        is_legacy: false,
        is_archived: false,
        meta: validatedMeta as any, // Prisma JsonValue - contains all tier fields
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Step 3: Create pricing record in model_provider_pricing table
    // Convert per-million pricing (in cents) to per-1k pricing (in dollars)
    // Formula: (cents per 1M tokens) / 100 (cents→dollars) / 1000 (1M→1K) = dollars per 1K tokens
    const inputPricePer1k = validatedMeta.inputCostPerMillionTokens / 100 / 1000;
    const outputPricePer1k = validatedMeta.outputCostPerMillionTokens / 100 / 1000;

    logger.info('ModelService: Creating pricing record', {
      modelId: model.id,
      providerId: provider.id,
      inputPricePer1k,
      outputPricePer1k,
    });

    await this.prisma.model_provider_pricing.create({
      data: {
        provider_id: provider.id,
        model_name: model.id,
        input_price_per_1k: inputPricePer1k,
        output_price_per_1k: outputPricePer1k,
        cache_write_price_per_1k: null, // Plan 207: Cache write pricing (1.25x for Anthropic)
        cache_read_price_per_1k: null, // Plan 207: Cache read pricing (0.1x for Anthropic)
        effective_from: new Date(),
        effective_until: null, // Active indefinitely
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Clear cache
    modelCache.clear();

    // Log audit trail (future: use dedicated audit log table)
    logger.info('ModelService: Model and pricing created successfully', {
      modelId: model.id,
      adminUserId,
      pricingCreated: true,
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
    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: { meta: true },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Validate replacement model if provided
    if (options.replacementModelId) {
      const replacement = await this.prisma.models.findUnique({
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
    await this.prisma.models.update({
      where: { id: modelId },
      data: {
        is_legacy: true,
        meta: updatedMeta as any,
        updated_at: new Date(),
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
    const model = await this.prisma.models.findUnique({
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
    await this.prisma.models.update({
      where: { id: modelId },
      data: {
        is_legacy: false,
        meta: updatedMeta as any,
        updated_at: new Date(),
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
    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Archive model
    await this.prisma.models.update({
      where: { id: modelId },
      data: {
        is_archived: true,
        is_available: false,
        updated_at: new Date(),
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
    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Unarchive model
    await this.prisma.models.update({
      where: { id: modelId },
      data: {
        is_archived: false,
        is_available: true,
        updated_at: new Date(),
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
    const model = await this.prisma.models.findUnique({
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
    await this.prisma.models.update({
      where: { id: modelId },
      data: {
        meta: validatedMeta as any,
        updated_at: new Date(),
      },
    });

    // Clear cache
    modelCache.clear();

    logger.info('ModelService: Model metadata updated', { modelId });
  }

  /**
   * Full model update with atomic pricing record update
   * Updates model record AND pricing record in a single transaction
   *
   * @param modelId - Model ID to update
   * @param updates - Partial model updates (name, meta)
   * @param adminUserId - Admin user ID for audit logging
   * @returns Updated model details
   * @throws Error if model not found, validation fails, or transaction fails
   */
  async updateModel(
    modelId: string,
    updates: UpdateModelRequest,
    adminUserId: string
  ): Promise<ModelDetailsResponse> {
    logger.info('ModelService: Updating model with full edit', {
      modelId,
      adminUserId,
      hasNameUpdate: !!updates.name,
      hasMetaUpdate: !!updates.meta,
      reason: updates.reason,
    });

    // Step 1: Validate model exists and fetch current data
    const existingModel = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        provider: true,
        meta: true,
      },
    });

    if (!existingModel) {
      throw new Error(`Model '${modelId}' not found`);
    }

    const currentMeta = validateModelMeta(existingModel.meta);

    // Step 2: Merge meta updates
    let newMeta = currentMeta;
    if (updates.meta) {
      newMeta = {
        ...currentMeta,
        ...updates.meta,
      };

      // Phase 3: Auto-calculate separate input/output credits if pricing changed
      if (
        (updates.meta.inputCostPerMillionTokens !== undefined ||
          updates.meta.outputCostPerMillionTokens !== undefined) &&
        (updates.meta.inputCreditsPerK === undefined ||
          updates.meta.outputCreditsPerK === undefined)
      ) {
        const separateCredits = calculateSeparateCreditsPerKTokens(
          newMeta.inputCostPerMillionTokens,
          newMeta.outputCostPerMillionTokens
        );
        newMeta.inputCreditsPerK = separateCredits.inputCreditsPerK;
        newMeta.outputCreditsPerK = separateCredits.outputCreditsPerK;

        logger.info('ModelService: Auto-calculated separate input/output credits', {
          modelId,
          inputCreditsPerK: separateCredits.inputCreditsPerK,
          outputCreditsPerK: separateCredits.outputCreditsPerK,
        });
      }

      // Auto-calculate creditsPer1kTokens for backward compatibility (DEPRECATED)
      if (
        (updates.meta.inputCostPerMillionTokens !== undefined ||
          updates.meta.outputCostPerMillionTokens !== undefined) &&
        updates.meta.creditsPer1kTokens === undefined
      ) {
        newMeta.creditsPer1kTokens = calculateCreditsPerKTokens(
          newMeta.inputCostPerMillionTokens,
          newMeta.outputCostPerMillionTokens
        );
        logger.info('ModelService: Auto-calculated creditsPer1kTokens (deprecated)', {
          modelId,
          credits: newMeta.creditsPer1kTokens,
        });
      }

      // Validate merged meta
      newMeta = validateModelMeta(newMeta);
    }

    // Step 3: Detect pricing changes
    const pricingChanged =
      updates.meta?.inputCostPerMillionTokens !== undefined ||
      updates.meta?.outputCostPerMillionTokens !== undefined;

    // Step 4: Atomic transaction - Update model + pricing
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update model record
        await tx.models.update({
          where: { id: modelId },
          data: {
            name: updates.name ?? existingModel.name,
            meta: newMeta as any,
            updated_at: new Date(),
          },
        });

        // Update pricing if pricing fields changed
        if (pricingChanged) {
          // Look up provider UUID
          const provider = await tx.providers.findUnique({
            where: { name: existingModel.provider },
            select: { id: true },
          });

          if (!provider) {
            throw new Error(
              `Provider '${existingModel.provider}' not found in providers table`
            );
          }

          // Convert per-million pricing (in cents) to per-1k pricing (in dollars)
          // Formula: (cents per 1M tokens) / 100 (cents→dollars) / 1000 (1M→1K) = dollars per 1K tokens
          const inputPricePer1k = newMeta.inputCostPerMillionTokens / 100 / 1000;
          const outputPricePer1k = newMeta.outputCostPerMillionTokens / 100 / 1000;

          logger.info('ModelService: Updating pricing record', {
            modelId,
            providerId: provider.id,
            inputPricePer1k,
            outputPricePer1k,
          });

          // Update existing pricing record
          await tx.model_provider_pricing.updateMany({
            where: {
              provider_id: provider.id,
              model_name: modelId,
              is_active: true,
            },
            data: {
              input_price_per_1k: inputPricePer1k,
              output_price_per_1k: outputPricePer1k,
              updated_at: new Date(),
            },
          });
        }

        logger.info('ModelService: Model updated successfully in transaction', {
          modelId,
          pricingUpdated: pricingChanged,
        });
      });
    } catch (error) {
      logger.error('ModelService: Failed to update model', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to update model '${modelId}': ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Step 5: Create version history entry
    const previousState = {
      id: existingModel.id,
      name: existingModel.name,
      provider: existingModel.provider,
      meta: currentMeta,
    };

    const newState = {
      id: modelId,
      name: updates.name ?? existingModel.name,
      provider: existingModel.provider,
      meta: newMeta,
    };

    try {
      await this.versionHistory.createVersionEntry({
        model_id: modelId,
        changed_by: adminUserId,
        change_type: 'update',
        change_reason: updates.reason,
        previous_state: previousState,
        new_state: newState,
      });

      logger.info('ModelService: Version history entry created', {
        modelId,
        adminUserId,
      });
    } catch (error) {
      // Log error but don't fail the update
      logger.error('ModelService: Failed to create version history entry', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Step 6: Clear cache
    modelCache.clear();

    // Step 7: Audit log
    logger.info('ModelService: Model fully updated', {
      modelId,
      adminUserId,
      reason: updates.reason,
      pricingUpdated: pricingChanged,
    });

    // Return updated model details
    return this.getModelDetails(modelId);
  }

  /**
   * Get all legacy models
   * Returns models where isLegacy = true
   *
   * @returns List of legacy models with replacement info
   */
  async getLegacyModels(): Promise<ModelListResponse> {
    logger.debug('ModelService: Getting legacy models');

    const models = await this.prisma.models.findMany({
      where: { is_legacy: true },
      select: {
        id: true,
        name: true,
        provider: true,
        is_available: true,
        is_legacy: true,
        is_archived: true,
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
          is_available: model.is_available,
          is_legacy: model.is_legacy,
          is_archived: model.is_archived,
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

    const models = await this.prisma.models.findMany({
      where: { is_archived: true },
      select: {
        id: true,
        name: true,
        provider: true,
        is_available: true,
        is_legacy: true,
        is_archived: true,
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
          is_available: model.is_available,
          is_legacy: model.is_legacy,
          is_archived: model.is_archived,
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
export function createModelService(
  prisma: PrismaClient,
  versionHistory: ModelVersionHistoryService
): ModelService {
  return new ModelService(prisma, versionHistory);
}
