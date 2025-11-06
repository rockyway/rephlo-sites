export const IModelService = Symbol('IModelService');

export interface IModelService {
  /**
   * List all available models with optional filters
   */
  listModels(filters?: {
    available?: boolean;
    capability?: string[];
    provider?: string;
  }): Promise<any>;

  /**
   * Get detailed model information by ID
   */
  getModelDetails(modelId: string): Promise<any>;

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
