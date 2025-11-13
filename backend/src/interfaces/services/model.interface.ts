import { SubscriptionTier } from '@prisma/client';
import { TierAccessResult } from '../../utils/tier-access';
import {
  CreateModelRequest,
  MarkLegacyRequest,
  UpdateModelMetaRequest,
} from '../../types/model-meta';
import {
  ModelListResponse,
  ModelDetailsResponse,
} from '../../types/model-validation';

export const IModelService = Symbol('IModelService');

export interface IModelService {
  /**
   * List all available models with optional filters
   */
  listModels(
    filters?: {
      available?: boolean;
      capability?: string[];
      provider?: string;
      includeArchived?: boolean;
    },
    userTier?: SubscriptionTier
  ): Promise<ModelListResponse>;

  /**
   * Get detailed model information by ID
   */
  getModelDetails(
    modelId: string,
    userTier?: SubscriptionTier
  ): Promise<ModelDetailsResponse>;

  /**
   * Check if user's tier can access a specific model
   */
  canUserAccessModel(
    modelId: string,
    userTier: SubscriptionTier
  ): Promise<TierAccessResult>;

  /**
   * Check if model is available for inference
   */
  isModelAvailable(modelId: string): Promise<boolean>;

  /**
   * Get model for inference (validates availability and returns full details)
   */
  getModelForInference(modelId: string): Promise<any>;

  /**
   * Refresh model cache
   */
  refreshCache(): Promise<void>;

  /**
   * Get model usage statistics
   */
  getModelUsageStats(startDate?: Date, endDate?: Date): Promise<any>;

  // ===========================================================================
  // Lifecycle Management Methods (NEW)
  // ===========================================================================

  /**
   * Create a new model
   * Validates meta JSONB, auto-calculates credits if needed, creates model, clears cache
   */
  addModel(
    data: CreateModelRequest,
    adminUserId: string
  ): Promise<ModelDetailsResponse>;

  /**
   * Mark model as legacy (deprecated)
   * Sets isLegacy flag, updates meta with legacy info
   */
  markAsLegacy(
    modelId: string,
    options: MarkLegacyRequest,
    adminUserId: string
  ): Promise<void>;

  /**
   * Remove legacy status from model
   * Sets isLegacy to false, removes legacy fields from meta
   */
  unmarkLegacy(modelId: string, adminUserId: string): Promise<void>;

  /**
   * Archive a model
   * Sets isArchived and isAvailable to false, preventing inference
   */
  archive(modelId: string, adminUserId: string): Promise<void>;

  /**
   * Unarchive a model
   * Restores isArchived to false and isAvailable to true
   */
  unarchive(modelId: string, adminUserId: string): Promise<void>;

  /**
   * Update model metadata (partial update)
   * Merges partial updates with existing meta, validates combined result
   */
  updateModelMeta(
    modelId: string,
    metaUpdates: UpdateModelMetaRequest,
    adminUserId: string
  ): Promise<void>;

  /**
   * Get all legacy models
   * Returns models where isLegacy = true
   */
  getLegacyModels(): Promise<ModelListResponse>;

  /**
   * Get all archived models
   * Returns models where isArchived = true
   */
  getArchivedModels(): Promise<ModelListResponse>;
}
