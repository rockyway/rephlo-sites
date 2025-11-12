-- Migration: Add Model Lifecycle & JSONB Meta Refactor
-- Date: 2025-11-12
-- Description: Consolidates 15+ individual model columns into single JSONB 'meta' field
--              and adds lifecycle state management (isLegacy, isArchived)
--
-- Strategy: 4-Phase Migration
--   Phase 1: Add new columns (is_legacy, is_archived, meta)
--   Phase 2: Backfill meta JSONB from existing columns
--   Phase 3: Add NOT NULL constraint to meta
--   Phase 4: Create Gin and B-tree indexes for JSONB queries
--
-- Backwards Compatibility: Old columns remain nullable during transition
--                          Code will read from meta JSONB first, fall back to old columns
--                          Old columns will be removed in future migration after verification

-- ==============================================================================
-- PHASE 1: Add New Columns
-- ==============================================================================

-- Add lifecycle state columns
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- Add JSONB meta column (initially nullable)
ALTER TABLE models ADD COLUMN IF NOT EXISTS meta JSONB;

-- Make existing columns nullable (for backwards compatibility during transition)
ALTER TABLE models ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE models ALTER COLUMN context_length DROP NOT NULL;
ALTER TABLE models ALTER COLUMN input_cost_per_million_tokens DROP NOT NULL;
ALTER TABLE models ALTER COLUMN output_cost_per_million_tokens DROP NOT NULL;
ALTER TABLE models ALTER COLUMN credits_per_1k_tokens DROP NOT NULL;

-- ==============================================================================
-- PHASE 2: Backfill meta JSONB from existing columns
-- ==============================================================================

UPDATE models SET meta = jsonb_build_object(
  -- Display & Description
  'displayName', display_name,
  'description', COALESCE(description, ''),
  'version', COALESCE(version, ''),

  -- Capabilities (convert array to JSONB array)
  'capabilities', (
    SELECT jsonb_agg(capability_enum::text)
    FROM unnest(capabilities) AS capability_enum
  ),

  -- Context & Tokens
  'contextLength', context_length,
  'maxOutputTokens', COALESCE(max_output_tokens, 0),

  -- Pricing
  'inputCostPerMillionTokens', input_cost_per_million_tokens,
  'outputCostPerMillionTokens', output_cost_per_million_tokens,
  'creditsPer1kTokens', credits_per_1k_tokens,

  -- Tier Access Control
  'requiredTier', required_tier::text,
  'tierRestrictionMode', tier_restriction_mode,
  'allowedTiers', (
    SELECT jsonb_agg(tier_enum::text)
    FROM unnest(allowed_tiers) AS tier_enum
  ),

  -- Lifecycle Fields (initially null, will be set when marked as legacy)
  'legacyReplacementModelId', NULL,
  'deprecationNotice', NULL,
  'sunsetDate', NULL,

  -- Provider Metadata (extensible object for provider-specific fields)
  'providerMetadata', jsonb_build_object(),

  -- Internal Notes (for admin use)
  'internalNotes', '',

  -- Compliance Tags (empty array initially)
  'complianceTags', jsonb_build_array()
)
WHERE meta IS NULL; -- Only update rows that don't have meta yet

-- ==============================================================================
-- PHASE 3: Add NOT NULL constraint to meta
-- ==============================================================================

ALTER TABLE models ALTER COLUMN meta SET NOT NULL;

-- ==============================================================================
-- PHASE 4: Create Indexes for JSONB and Lifecycle Queries
-- ==============================================================================

-- Lifecycle state indexes (for fast filtering)
CREATE INDEX IF NOT EXISTS idx_models_is_legacy ON models(is_legacy);
CREATE INDEX IF NOT EXISTS idx_models_is_archived ON models(is_archived);
CREATE INDEX IF NOT EXISTS idx_models_is_available_is_archived ON models(is_available, is_archived);

-- Gin index on entire meta JSONB (for containment queries)
-- Syntax: SELECT * FROM models WHERE meta @> '{"requiredTier": "pro"}'::jsonb
CREATE INDEX IF NOT EXISTS idx_models_meta_gin ON models USING gin(meta);

-- B-tree indexes on frequently queried JSONB fields (for exact match and sorting)
CREATE INDEX IF NOT EXISTS idx_models_meta_required_tier ON models USING btree((meta->>'requiredTier'));
CREATE INDEX IF NOT EXISTS idx_models_meta_credits_per_1k ON models USING btree(((meta->>'creditsPer1kTokens')::int));

-- Gin index on capabilities array inside meta (for array containment queries)
-- Syntax: SELECT * FROM models WHERE meta->'capabilities' ? 'vision'
CREATE INDEX IF NOT EXISTS idx_models_meta_capabilities ON models USING gin((meta->'capabilities'));

-- ==============================================================================
-- PHASE 5: Update isDeprecated to isLegacy for existing deprecated models
-- ==============================================================================

-- Mark existing deprecated models as legacy
UPDATE models
SET is_legacy = true,
    meta = jsonb_set(
      meta,
      '{deprecationNotice}',
      '"This model has been deprecated. Please migrate to a newer version."'::jsonb
    )
WHERE is_deprecated = true AND is_legacy = false;

-- ==============================================================================
-- DATA VALIDATION: Verify migration success
-- ==============================================================================

-- Check that all models have non-null meta
DO $$
DECLARE
  null_meta_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_meta_count FROM models WHERE meta IS NULL;

  IF null_meta_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % models have null meta', null_meta_count;
  END IF;

  RAISE NOTICE 'Migration validation passed: All models have meta JSONB';
END $$;

-- Check that meta JSONB contains required fields
DO $$
DECLARE
  invalid_meta_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_meta_count
  FROM models
  WHERE NOT (
    meta ? 'displayName' AND
    meta ? 'capabilities' AND
    meta ? 'contextLength' AND
    meta ? 'creditsPer1kTokens' AND
    meta ? 'requiredTier' AND
    meta ? 'tierRestrictionMode' AND
    meta ? 'allowedTiers'
  );

  IF invalid_meta_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % models have incomplete meta fields', invalid_meta_count;
  END IF;

  RAISE NOTICE 'Migration validation passed: All models have complete meta fields';
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

-- Summary of changes:
--   ✅ Added is_legacy, is_archived columns
--   ✅ Added meta JSONB column with all model metadata
--   ✅ Backfilled meta from existing columns
--   ✅ Created Gin and B-tree indexes for optimal query performance
--   ✅ Marked deprecated models as legacy
--   ✅ Validated migration success
--
-- Next steps:
--   1. Update TypeScript types to use ModelMeta interface
--   2. Update ModelService to read from meta JSONB
--   3. Test all model queries with new schema
--   4. (Future) Remove old columns after verification period
