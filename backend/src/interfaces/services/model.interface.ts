import { SubscriptionTier } from '@prisma/client';
import { TierAccessResult } from '../../utils/tier-access';

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
    },
    userTier?: SubscriptionTier
  ): Promise<any>;

  /**
   * Get detailed model information by ID
   */
  getModelDetails(modelId: string, userTier?: SubscriptionTier): Promise<any>;

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
}
