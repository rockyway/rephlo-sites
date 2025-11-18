-- Migration: Drop ALL legacy model columns (Phase 4 complete)
-- Purpose: Complete JSONB migration by removing all columns now stored in meta
-- Architecture: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md (lines 674-693)

-- =============================================================================
-- Phase 4: Drop Old Columns (After Full Migration)
-- =============================================================================

-- Drop display and descriptive fields (now in meta JSONB)
ALTER TABLE models DROP COLUMN IF EXISTS display_name;
ALTER TABLE models DROP COLUMN IF EXISTS description;
ALTER TABLE models DROP COLUMN IF EXISTS version;

-- Drop capability and context fields (now in meta JSONB)
ALTER TABLE models DROP COLUMN IF EXISTS capabilities;
ALTER TABLE models DROP COLUMN IF EXISTS context_length;
ALTER TABLE models DROP COLUMN IF EXISTS max_output_tokens;

-- Drop pricing fields (now in meta JSONB)
ALTER TABLE models DROP COLUMN IF EXISTS input_cost_per_million_tokens;
ALTER TABLE models DROP COLUMN IF EXISTS output_cost_per_million_tokens;
ALTER TABLE models DROP COLUMN IF EXISTS credits_per_1k_tokens;

-- Drop deprecated lifecycle field (replaced by is_legacy)
ALTER TABLE models DROP COLUMN IF EXISTS is_deprecated;

-- =============================================================================
-- Final schema should only have:
-- - id, name, provider (Core Identity)
-- - is_available, is_legacy, is_archived (Lifecycle State)
-- - meta (JSONB - All variable properties)
-- - created_at, updated_at (Timestamps)
-- =============================================================================
