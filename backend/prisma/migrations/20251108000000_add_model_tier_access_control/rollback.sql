-- Rollback Migration: add_model_tier_access_control
-- Purpose: Remove tier access control fields from models table
-- WARNING: This will delete tier access control data. Use only for rollback.
-- Date: 2025-11-08

-- Drop indexes first (reverse order of creation)
DROP INDEX IF EXISTS "models_is_available_required_tier_idx";
DROP INDEX IF EXISTS "models_required_tier_idx";

-- Drop columns (reverse order of addition)
ALTER TABLE "models" DROP COLUMN IF EXISTS "allowed_tiers";
ALTER TABLE "models" DROP COLUMN IF EXISTS "tier_restriction_mode";
ALTER TABLE "models" DROP COLUMN IF EXISTS "required_tier";

-- Note: This rollback will remove all tier access control configurations
-- Ensure you have a backup if you need to restore this data
