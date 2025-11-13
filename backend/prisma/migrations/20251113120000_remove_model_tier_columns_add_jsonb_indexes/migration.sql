-- Migration: Remove legacy tier columns and add JSONB indexes
-- Purpose: Phase 4 cleanup after JSONB migration is complete
-- Architecture: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md (lines 674-693, 596-606)

-- =============================================================================
-- Step 1: Create GIN and BTree indexes for JSONB meta column
-- =============================================================================

-- GIN index for general JSONB queries (supports @>, ?, ?&, ?| operators)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_models_meta_gin ON models USING gin(meta);

-- BTree index for specific requiredTier queries (fastest for equality checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_models_meta_required_tier
  ON models USING btree((meta->>'requiredTier'));

-- GIN index for capabilities array queries (supports @>, ?, ?&, ?| operators)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_models_meta_capabilities
  ON models USING gin((meta->'capabilities'));

-- =============================================================================
-- Step 2: Drop legacy tier columns (replaced by meta JSONB)
-- =============================================================================

-- Drop old tier-related columns (now stored in meta JSONB)
ALTER TABLE models DROP COLUMN IF EXISTS required_tier;
ALTER TABLE models DROP COLUMN IF EXISTS tier_restriction_mode;
ALTER TABLE models DROP COLUMN IF EXISTS allowed_tiers;

-- =============================================================================
-- Verification Query (Run after migration):
-- =============================================================================
-- SELECT
--   id,
--   name,
--   meta->>'requiredTier' AS required_tier,
--   meta->>'tierRestrictionMode' AS tier_restriction_mode,
--   meta->'allowedTiers' AS allowed_tiers
-- FROM models
-- LIMIT 5;
