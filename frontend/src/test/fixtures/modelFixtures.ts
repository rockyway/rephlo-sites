import type { ModelInfo, ModelMeta } from '@/types/model-lifecycle';
import { SubscriptionTier } from '@rephlo/shared-types';

/**
 * Complete model metadata fixture
 */
export const mockModelMeta: ModelMeta = {
  displayName: 'GPT-4 Turbo',
  description: 'Most capable GPT-4 model, optimized for chat',
  version: '0613',
  capabilities: ['text', 'vision', 'function_calling', 'code'],
  contextLength: 128000,
  maxOutputTokens: 4096,
  inputCostPerMillionTokens: 1000, // $10.00 in cents
  outputCostPerMillionTokens: 3000, // $30.00 in cents
  creditsPer1kTokens: 50,
  requiredTier: SubscriptionTier.PRO,
  tierRestrictionMode: 'minimum',
  allowedTiers: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE_PRO],
  providerMetadata: {
    openai: {
      modelFamily: 'gpt-4',
      trainingCutoff: '2023-04',
    },
  },
};

/**
 * Complete model info fixture
 */
export const mockModel: ModelInfo = {
  id: 'gpt-4-turbo',
  name: 'gpt-4-turbo',
  provider: 'openai',
  isAvailable: true,
  isLegacy: false,
  isArchived: false,
  meta: mockModelMeta,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};

/**
 * Model with minimal metadata (edge case)
 */
export const mockModelMinimal: ModelInfo = {
  id: 'test-model',
  name: 'test-model',
  provider: 'custom',
  isAvailable: true,
  isLegacy: false,
  isArchived: false,
  meta: {
    displayName: 'Test Model',
    capabilities: ['text'],
    contextLength: 4096,
    inputCostPerMillionTokens: 100,
    outputCostPerMillionTokens: 200,
    creditsPer1kTokens: 10,
    requiredTier: SubscriptionTier.FREE,
    tierRestrictionMode: 'minimum',
    allowedTiers: [SubscriptionTier.FREE],
  },
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};

/**
 * Anthropic model fixture
 */
export const mockAnthropicModel: ModelInfo = {
  id: 'claude-3-opus',
  name: 'claude-3-opus',
  provider: 'anthropic',
  isAvailable: true,
  isLegacy: false,
  isArchived: false,
  meta: {
    displayName: 'Claude 3 Opus',
    description: 'Most capable Claude model for complex tasks',
    version: '20240229',
    capabilities: ['text', 'vision', 'code', 'long_context'],
    contextLength: 200000,
    maxOutputTokens: 4096,
    inputCostPerMillionTokens: 1500,
    outputCostPerMillionTokens: 7500,
    creditsPer1kTokens: 100,
    requiredTier: SubscriptionTier.ENTERPRISE_PRO,
    tierRestrictionMode: 'exact',
    allowedTiers: [SubscriptionTier.ENTERPRISE_PRO],
    providerMetadata: {
      anthropic: {
        modelSeries: 'claude-3',
        knowledgeCutoff: '2023-08',
      },
    },
  },
  createdAt: '2024-03-01T10:00:00.000Z',
  updatedAt: '2024-03-01T10:00:00.000Z',
};

/**
 * Google model fixture
 */
export const mockGoogleModel: ModelInfo = {
  id: 'gemini-pro',
  name: 'gemini-pro',
  provider: 'google',
  isAvailable: true,
  isLegacy: false,
  isArchived: false,
  meta: {
    displayName: 'Gemini Pro',
    description: 'Google most capable multimodal model',
    version: '1.0',
    capabilities: ['text', 'vision', 'code'],
    contextLength: 32000,
    maxOutputTokens: 8192,
    inputCostPerMillionTokens: 50,
    outputCostPerMillionTokens: 150,
    creditsPer1kTokens: 5,
    requiredTier: SubscriptionTier.FREE,
    tierRestrictionMode: 'whitelist',
    allowedTiers: [SubscriptionTier.FREE, SubscriptionTier.PRO],
    providerMetadata: {
      google: {
        modelType: 'gemini-pro',
        tuningSupport: true,
      },
    },
  },
  createdAt: '2024-02-01T10:00:00.000Z',
  updatedAt: '2024-02-01T10:00:00.000Z',
};

/**
 * Legacy model fixture (for testing legacy state)
 */
export const mockLegacyModel: ModelInfo = {
  id: 'gpt-3.5-turbo',
  name: 'gpt-3.5-turbo',
  provider: 'openai',
  isAvailable: true,
  isLegacy: true,
  isArchived: false,
  meta: {
    displayName: 'GPT-3.5 Turbo (Legacy)',
    description: 'Legacy model, use GPT-4 instead',
    capabilities: ['text', 'function_calling'],
    contextLength: 16385,
    maxOutputTokens: 4096,
    inputCostPerMillionTokens: 50,
    outputCostPerMillionTokens: 150,
    creditsPer1kTokens: 5,
    requiredTier: SubscriptionTier.FREE,
    tierRestrictionMode: 'minimum',
    allowedTiers: [SubscriptionTier.FREE],
    legacyReplacementModelId: 'gpt-4-turbo',
    deprecationNotice: 'This model is deprecated. Please use GPT-4 Turbo.',
    sunsetDate: '2025-06-30',
  },
  createdAt: '2023-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};

/**
 * Model with null metadata fields (edge case)
 */
export const mockModelWithNulls: ModelInfo = {
  id: 'incomplete-model',
  name: 'incomplete-model',
  provider: 'custom',
  isAvailable: true,
  isLegacy: false,
  isArchived: false,
  meta: {
    displayName: 'Incomplete Model',
    description: undefined,
    version: undefined,
    capabilities: ['text'],
    contextLength: 8192,
    maxOutputTokens: undefined,
    inputCostPerMillionTokens: 100,
    outputCostPerMillionTokens: 200,
    creditsPer1kTokens: 10,
    requiredTier: SubscriptionTier.FREE,
    tierRestrictionMode: 'minimum',
    allowedTiers: [],
    providerMetadata: {},
  },
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};
