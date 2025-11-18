import { IModelService } from '../../interfaces';
import { subscription_tier } from '@prisma/client';
import { TierAccessResult } from '../../utils/tier-access';

export class MockModelService implements IModelService {
  private models: Map<string, any> = new Map();
  private usageStats: Map<string, any> = new Map();

  constructor() {
    // Seed with some default models
    this.seedDefaultModels();
  }

  private seedDefaultModels() {
    const defaultModels = [
      {
        id: 'gpt-4',
        provider: 'openai',
        name: 'GPT-4',
        available: true,
        capabilities: ['chat', 'completion'],
        maxTokens: 8192,
        creditCost: 2,
      },
      {
        id: 'gpt-3.5-turbo',
        provider: 'openai',
        name: 'GPT-3.5 Turbo',
        available: true,
        capabilities: ['chat', 'completion'],
        maxTokens: 4096,
        creditCost: 1,
      },
      {
        id: 'claude-3-opus',
        provider: 'anthropic',
        name: 'Claude 3 Opus',
        available: true,
        capabilities: ['chat'],
        maxTokens: 200000,
        creditCost: 3,
      },
      {
        id: 'gemini-pro',
        provider: 'google',
        name: 'Gemini Pro',
        available: true,
        capabilities: ['chat', 'completion'],
        maxTokens: 30720,
        creditCost: 2,
      },
    ];

    defaultModels.forEach((model) => this.models.set(model.id, model));
  }

  async listModels(
    filters?: {
      available?: boolean;
      capability?: string[];
      provider?: string;
    },
    userTier?: subscription_tier
  ): Promise<any> {
    let models = Array.from(this.models.values());

    if (filters?.available !== undefined) {
      models = models.filter((m) => m.available === filters.available);
    }

    if (filters?.capability && filters.capability.length > 0) {
      models = models.filter((m) =>
        filters.capability!.some((cap) => m.capabilities.includes(cap))
      );
    }

    if (filters?.provider) {
      models = models.filter((m) => m.provider === filters.provider);
    }

    return { models, count: models.length, user_tier: userTier };
  }

  async getModelDetails(modelId: string, _userTier?: subscription_tier): Promise<any> {
    return this.models.get(modelId) || null;
  }

  async canUserAccessModel(
    _modelId: string,
    _userTier: subscription_tier
  ): Promise<TierAccessResult> {
    // Mock implementation - always allow access in tests
    return {
      allowed: true,
    };
  }

  async isModelAvailable(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    return model ? model.available === true : false;
  }

  async getModelForInference(modelId: string): Promise<any> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    if (!model.available) {
      throw new Error(`Model ${modelId} is not available`);
    }
    return model;
  }

  async refreshCache(): Promise<void> {
    // Mock cache refresh - do nothing
  }

  async getModelUsageStats(startDate?: Date, endDate?: Date): Promise<any> {
    const stats = Array.from(this.usageStats.values());
    let filtered = stats;

    if (startDate) {
      filtered = filtered.filter((s) => new Date(s.date) >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((s) => new Date(s.date) <= endDate);
    }

    return { stats: filtered };
  }

  // Test helpers
  clear() {
    this.models.clear();
    this.usageStats.clear();
    this.seedDefaultModels();
  }

  seed(models: any[]) {
    models.forEach((model) => this.models.set(model.id, model));
  }

  async addModel(data: any, _adminUserId: string): Promise<any> {
    const model = { ...data, ...data.meta };
    this.models.set(model.id, model);
    return this.getModelDetails(model.id);
  }

  async markAsLegacy(modelId: string, options: any, _adminUserId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      model.isLegacy = true;
      model.legacyReplacementModelId = options.replacementModelId;
      model.deprecationNotice = options.deprecationNotice;
      model.sunsetDate = options.sunsetDate;
    }
  }

  async unmarkLegacy(modelId: string, _adminUserId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      model.isLegacy = false;
      delete model.legacyReplacementModelId;
      delete model.deprecationNotice;
      delete model.sunsetDate;
    }
  }

  async archive(modelId: string, _adminUserId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      model.isArchived = true;
      model.isAvailable = false;
    }
  }

  async unarchive(modelId: string, _adminUserId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      model.isArchived = false;
      model.isAvailable = true;
    }
  }

  async updateModelMeta(modelId: string, metaUpdates: any, _adminUserId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      Object.assign(model, metaUpdates);
    }
  }

  async getLegacyModels(): Promise<any> {
    const legacy = Array.from(this.models.values()).filter(m => m.isLegacy);
    return { models: legacy, total: legacy.length };
  }

  async getArchivedModels(): Promise<any> {
    const archived = Array.from(this.models.values()).filter(m => m.isArchived);
    return { models: archived, total: archived.length };
  }

  removeModel(modelId: string) {
    this.models.delete(modelId);
  }
}
