/**
 * Model Testing Helper Utilities
 *
 * Factory functions and utilities for creating test models and validating
 * model metadata in tests.
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { ModelMeta, validateModelMeta } from '../../src/types/model-meta';

/**
 * Create a test model with valid JSONB meta
 */
export const createTestModel = async (
  prisma: PrismaClient,
  overrides: Partial<{
    id: string;
    name: string;
    provider: string;
    isAvailable: boolean;
    isLegacy: boolean;
    isArchived: boolean;
    meta: Partial<ModelMeta>;
  }> = {}
) => {
  const modelId = overrides.id || `test-model-${faker.string.alphanumeric(8)}`;
  const provider = overrides.provider || faker.helpers.arrayElement([
    'openai',
    'anthropic',
    'google',
  ]);

  const defaultMeta: ModelMeta = {
    displayName: overrides.meta?.displayName || faker.commerce.productName(),
    description: overrides.meta?.description || faker.commerce.productDescription(),
    version: overrides.meta?.version || '1.0',
    capabilities: overrides.meta?.capabilities || ['text'],
    contextLength: overrides.meta?.contextLength || 8000,
    maxOutputTokens: overrides.meta?.maxOutputTokens || 4096,
    inputCostPerMillionTokens: overrides.meta?.inputCostPerMillionTokens || 500,
    outputCostPerMillionTokens: overrides.meta?.outputCostPerMillionTokens || 1500,
    creditsPer1kTokens: overrides.meta?.creditsPer1kTokens || 2,
    requiredTier: overrides.meta?.requiredTier || 'free',
    tierRestrictionMode: overrides.meta?.tierRestrictionMode || 'minimum',
    allowedTiers: overrides.meta?.allowedTiers || [
      'free',
      'pro',
      'pro_max',
      'enterprise_pro',
      'enterprise_max',
    ],
    ...overrides.meta,
  };

  return prisma.model.create({
    data: {
      id: modelId,
      name: overrides.name || modelId,
      provider,
      isAvailable: overrides.isAvailable ?? true,
      isLegacy: overrides.isLegacy ?? false,
      isArchived: overrides.isArchived ?? false,
      meta: defaultMeta as any,
    },
  });
};

/**
 * Create a legacy model with replacement info
 */
export const createTestLegacyModel = async (
  prisma: PrismaClient,
  replacementModelId?: string
) => {
  const meta: ModelMeta = {
    displayName: 'Legacy Test Model',
    description: 'A deprecated test model',
    capabilities: ['text'],
    contextLength: 8000,
    inputCostPerMillionTokens: 500,
    outputCostPerMillionTokens: 1500,
    creditsPer1kTokens: 2,
    requiredTier: 'free',
    tierRestrictionMode: 'minimum',
    allowedTiers: ['free', 'pro'],
    legacyReplacementModelId: replacementModelId,
    deprecationNotice: 'This model is deprecated. Please use the replacement.',
    sunsetDate: '2025-12-31T23:59:59Z',
  };

  return createTestModel(prisma, {
    isLegacy: true,
    meta,
  });
};

/**
 * Create an archived model
 */
export const createTestArchivedModel = async (prisma: PrismaClient) => {
  return createTestModel(prisma, {
    isAvailable: false,
    isArchived: true,
  });
};

/**
 * Create a model with specific tier requirements
 */
export const createTestTierRestrictedModel = async (
  prisma: PrismaClient,
  requiredTier: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'
) => {
  const meta: Partial<ModelMeta> = {
    requiredTier,
    tierRestrictionMode: 'minimum',
    allowedTiers: getMinimumTiers(requiredTier),
  };

  return createTestModel(prisma, { meta });
};

/**
 * Helper to get all tiers at or above a minimum tier
 */
function getMinimumTiers(
  tier: string
): ('free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual')[] {
  const tierHierarchy = [
    'free',
    'pro',
    'pro_max',
    'enterprise_pro',
    'enterprise_max',
    'perpetual',
  ];

  const tierIndex = tierHierarchy.indexOf(tier);
  return tierHierarchy.slice(tierIndex) as any[];
}

/**
 * Assert model metadata is valid
 */
export function assertModelMeta(meta: unknown): asserts meta is ModelMeta {
  validateModelMeta(meta);
}

/**
 * Create model with provider-specific metadata
 */
export const createTestModelWithProviderMeta = async (
  prisma: PrismaClient,
  provider: 'openai' | 'anthropic' | 'google',
  providerMetadata: any
) => {
  const meta: Partial<ModelMeta> = {
    providerMetadata: {
      [provider]: providerMetadata,
    },
  };

  return createTestModel(prisma, {
    provider,
    meta,
  });
};

/**
 * Batch create multiple test models
 */
export const createMultipleTestModels = async (
  prisma: PrismaClient,
  count: number,
  overrides?: Partial<{
    provider: string;
    isAvailable: boolean;
    isLegacy: boolean;
    isArchived: boolean;
  }>
) => {
  const models = [];

  for (let i = 0; i < count; i++) {
    const model = await createTestModel(prisma, overrides);
    models.push(model);
  }

  return models;
};

/**
 * Create a complete model family (e.g., GPT-4, GPT-4-Turbo, GPT-4-32K)
 */
export const createTestModelFamily = async (
  prisma: PrismaClient,
  familyName: string,
  variants: string[]
) => {
  const models = [];

  for (const variant of variants) {
    const modelId = `${familyName}-${variant}`;
    const model = await createTestModel(prisma, {
      id: modelId,
      name: modelId,
      meta: {
        displayName: `${familyName} ${variant}`,
        version: variant,
      },
    });
    models.push(model);
  }

  return models;
};

/**
 * Mark model as legacy with default deprecation info
 */
export const markModelAsLegacy = async (
  prisma: PrismaClient,
  modelId: string,
  replacementId?: string
) => {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
  });

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const currentMeta = model.meta as any;
  const updatedMeta = {
    ...currentMeta,
    legacyReplacementModelId: replacementId,
    deprecationNotice: `${modelId} is deprecated. ${replacementId ? `Use ${replacementId} instead.` : ''}`,
    sunsetDate: '2025-12-31T23:59:59Z',
  };

  return prisma.model.update({
    where: { id: modelId },
    data: {
      isLegacy: true,
      meta: updatedMeta,
    },
  });
};

/**
 * Archive model
 */
export const archiveModel = async (
  prisma: PrismaClient,
  modelId: string
) => {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      isArchived: true,
      isAvailable: false,
    },
  });
};

/**
 * Get model metadata
 */
export const getModelMeta = async (
  prisma: PrismaClient,
  modelId: string
): Promise<ModelMeta> => {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    select: { meta: true },
  });

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  return validateModelMeta(model.meta);
};

/**
 * Verify model exists and has expected state
 */
export const expectModelState = async (
  prisma: PrismaClient,
  modelId: string,
  expectedState: {
    isAvailable?: boolean;
    isLegacy?: boolean;
    isArchived?: boolean;
  }
) => {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
  });

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  if (expectedState.isAvailable !== undefined) {
    expect(model.isAvailable).toBe(expectedState.isAvailable);
  }

  if (expectedState.isLegacy !== undefined) {
    expect(model.isLegacy).toBe(expectedState.isLegacy);
  }

  if (expectedState.isArchived !== undefined) {
    expect(model.isArchived).toBe(expectedState.isArchived);
  }

  return model;
};

/**
 * Clean up test models (useful in afterEach)
 */
export const cleanupTestModels = async (prisma: PrismaClient) => {
  await prisma.model.deleteMany({
    where: {
      id: {
        startsWith: 'test-model-',
      },
    },
  });
};
