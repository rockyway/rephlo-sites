/**
 * Model Metadata Types and Validation
 *
 * JSONB-based model metadata schema with Zod validation.
 * Consolidates 15+ individual columns into a flexible JSON structure
 * for improved maintainability and schema evolution.
 *
 * Reference: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md
 */

import { z } from 'zod';

// =============================================================================
// Enum Schemas
// =============================================================================

/**
 * Model capability types
 * Defines what the model can do (text generation, vision, function calling, etc.)
 */
export const ModelCapabilitySchema = z.enum([
  'text',
  'vision',
  'function_calling',
  'code',
  'long_context',
]);

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

/**
 * Subscription tier types
 * Defines access levels for model usage
 */
export const SubscriptionTierSchema = z.enum([
  'free',
  'pro',
  'pro_max',
  'enterprise_pro',
  'enterprise_max',
  'perpetual',
]);

export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

/**
 * Tier restriction modes
 * Defines how tier access is enforced
 */
export const TierRestrictionModeSchema = z.enum(['minimum', 'exact', 'whitelist']);

export type TierRestrictionMode = z.infer<typeof TierRestrictionModeSchema>;

// =============================================================================
// Model Meta Schema
// =============================================================================

/**
 * Complete JSONB metadata schema for Model table
 * All variable/descriptive properties stored in this structure
 */
export const ModelMetaSchema = z.object({
  // Display Information
  displayName: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  version: z.string().max(50).optional(),

  // Capabilities
  capabilities: z.array(ModelCapabilitySchema).min(1),

  // Context & Output Limits
  contextLength: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive().optional(),

  // Pricing (in smallest currency unit - cents for USD)
  inputCostPerMillionTokens: z.number().int().nonnegative(),
  outputCostPerMillionTokens: z.number().int().nonnegative(),
  creditsPer1kTokens: z.number().int().positive(),

  // Tier Access Control
  requiredTier: SubscriptionTierSchema,
  tierRestrictionMode: TierRestrictionModeSchema,
  allowedTiers: z.array(SubscriptionTierSchema).min(1),

  // Legacy Management (Optional)
  legacyReplacementModelId: z.string().max(100).optional(),
  deprecationNotice: z.string().max(1000).optional(),
  sunsetDate: z.string().datetime().optional(),

  // Provider-Specific Extensions (Flexible)
  providerMetadata: z
    .object({
      openai: z
        .object({
          modelFamily: z.string().optional(),
          trainingCutoff: z.string().optional(),
        })
        .optional(),
      anthropic: z
        .object({
          modelSeries: z.string().optional(),
          knowledgeCutoff: z.string().optional(),
        })
        .optional(),
      google: z
        .object({
          modelType: z.string().optional(),
          tuningSupport: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),

  // Admin Metadata
  internalNotes: z.string().max(5000).optional(),
  complianceTags: z.array(z.string().max(50)).optional(),
});

export type ModelMeta = z.infer<typeof ModelMetaSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate model metadata against schema
 * Throws ZodError if validation fails
 *
 * @param meta - Unknown input to validate
 * @returns Validated ModelMeta object
 * @throws ZodError if validation fails
 */
export function validateModelMeta(meta: unknown): ModelMeta {
  return ModelMetaSchema.parse(meta);
}

/**
 * Check if data is valid ModelMeta (type guard)
 *
 * @param meta - Unknown input to check
 * @returns true if meta is valid ModelMeta, false otherwise
 */
export function isValidModelMeta(meta: unknown): meta is ModelMeta {
  return ModelMetaSchema.safeParse(meta).success;
}

/**
 * Type assertion for ModelMeta
 * Throws if meta is not valid
 *
 * @param meta - Unknown input to assert
 * @throws Error if meta is not valid ModelMeta
 */
export function assertModelMeta(meta: unknown): asserts meta is ModelMeta {
  validateModelMeta(meta);
}

// =============================================================================
// Request Validation Schemas (for Admin API)
// =============================================================================

/**
 * Schema for creating a new model
 * POST /admin/models
 */
export const createModelRequestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  provider: z.string().min(1).max(100),
  meta: ModelMetaSchema,
});

export type CreateModelRequest = z.infer<typeof createModelRequestSchema>;

/**
 * Schema for marking a model as legacy
 * POST /admin/models/:id/mark-legacy
 */
export const markLegacyRequestSchema = z.object({
  replacementModelId: z.string().max(100).optional(),
  deprecationNotice: z.string().max(1000).optional(),
  sunsetDate: z.string().datetime().optional(),
});

export type MarkLegacyRequest = z.infer<typeof markLegacyRequestSchema>;

/**
 * Schema for archiving a model
 * POST /admin/models/:id/archive
 */
export const archiveModelRequestSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export type ArchiveModelRequest = z.infer<typeof archiveModelRequestSchema>;

/**
 * Schema for updating model metadata
 * PATCH /admin/models/:id/meta
 */
export const updateModelMetaRequestSchema = ModelMetaSchema.partial();

export type UpdateModelMetaRequest = z.infer<typeof updateModelMetaRequestSchema>;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Auto-calculate creditsPer1kTokens from vendor pricing
 * Formula: ((input + output) / 2 / 1000) * margin / creditValue
 *
 * @param inputCostPerMillion - Input cost per million tokens (cents)
 * @param outputCostPerMillion - Output cost per million tokens (cents)
 * @param marginMultiplier - Profit margin multiplier (default 2.5x)
 * @param creditUsdValue - USD value per credit (default $0.0005)
 * @returns Calculated credits per 1K tokens
 */
export function calculateCreditsPerKTokens(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier: number = 2.5,
  creditUsdValue: number = 0.0005
): number {
  const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
  const costPer1K = avgCostPerMillion / 1000;
  const costWithMargin = costPer1K * marginMultiplier;
  const creditsPerK = Math.ceil(costWithMargin / (creditUsdValue * 100)); // Convert to cents
  return creditsPerK;
}
