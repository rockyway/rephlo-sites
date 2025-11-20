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
 *
 * Active Consumer Tiers:
 * - free ($0/month, 200 credits)
 * - pro ($15/month, 1,500 credits)
 * - pro_plus ($45/month, 5,000 credits)
 * - pro_max ($199/month, 25,000 credits)
 *
 * Enterprise Tiers:
 * - enterprise_pro ($30/month, 3,500 credits)
 * - enterprise_pro_plus ($90/month, 11,000 credits)
 * - enterprise_max (custom pricing)
 *
 * Special Tiers:
 * - perpetual (lifetime access)
 */
export const SubscriptionTierSchema = z.enum([
  'free',
  'pro',
  'pro_plus',
  'pro_max',
  'enterprise_pro',
  'enterprise_pro_plus',
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

  // Phase 3: Separate input/output pricing
  inputCreditsPerK: z.number().int().positive().optional(),
  outputCreditsPerK: z.number().int().positive().optional(),

  // DEPRECATED: Will be removed after full migration
  creditsPer1kTokens: z.number().int().positive().optional(),

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

/**
 * Schema for full model update
 * PUT /admin/models/:id
 *
 * Allows updating model core fields, metadata, and pricing in a single atomic operation.
 * All fields are optional except the ones being changed.
 * Model ID and provider cannot be changed after creation.
 */
export const updateModelRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  meta: ModelMetaSchema.partial().optional(),
  reason: z.string().max(1000).optional(), // Admin reason for audit trail
});

export type UpdateModelRequest = z.infer<typeof updateModelRequestSchema>;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Auto-calculate creditsPer1kTokens from vendor pricing
 * Formula: ((input + output) / 2 / 1000) * margin / creditValue
 *
 * @deprecated Use calculateSeparateCreditsPerKTokens instead
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

/**
 * Calculate separate input/output credits per 1K tokens
 *
 * Phase 3: Separate input/output pricing implementation
 *
 * This function calculates separate credit costs for input and output tokens,
 * allowing more accurate pricing that reflects real-world usage patterns.
 *
 * Formula:
 * - Input: (inputCostPerMillion / 1000) * margin / creditCentValue
 * - Output: (outputCostPerMillion / 1000) * margin / creditCentValue
 *
 * @param inputCostPerMillion - Input cost per million tokens (cents)
 * @param outputCostPerMillion - Output cost per million tokens (cents)
 * @param marginMultiplier - Profit margin multiplier (default 2.5x)
 * @param creditUsdValue - USD value per credit (default $0.0005)
 * @returns Object with separate input/output credits and estimated total
 *
 * @example
 * // GPT-5 Chat pricing: Input $1.25, Output $10 per 1M tokens
 * const result = calculateSeparateCreditsPerKTokens(125, 1000);
 * // Result: { inputCreditsPerK: 7, outputCreditsPerK: 50, estimatedTotalPerK: 47 }
 * // Typical usage (1:10 ratio): 1×7 + 10×50 = 507, divided by 11 = ~47 credits
 */
export function calculateSeparateCreditsPerKTokens(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier: number = 2.5,
  creditUsdValue: number = 0.0005
): {
  inputCreditsPerK: number;
  outputCreditsPerK: number;
  estimatedTotalPerK: number;
} {
  // Convert to cost per 1K tokens
  const inputCostPer1K = inputCostPerMillion / 1000;
  const outputCostPer1K = outputCostPerMillion / 1000;

  // Apply margin
  const inputCostWithMargin = inputCostPer1K * marginMultiplier;
  const outputCostWithMargin = outputCostPer1K * marginMultiplier;

  // Convert credit USD value to cents
  const creditCentValue = creditUsdValue * 100;

  // Calculate separate credits (round up to ensure we cover costs)
  const inputCreditsPerK = Math.ceil(inputCostWithMargin / creditCentValue);
  const outputCreditsPerK = Math.ceil(outputCostWithMargin / creditCentValue);

  // Estimate total credits assuming typical 1:10 input:output ratio
  // This gives admins a rough idea of expected cost per request
  const estimatedTotalPerK = Math.ceil((1 * inputCreditsPerK + 10 * outputCreditsPerK) / 11);

  return {
    inputCreditsPerK,
    outputCreditsPerK,
    estimatedTotalPerK,
  };
}
