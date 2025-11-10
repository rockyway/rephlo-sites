-- Plan 129 Gap Closure - G-006: Role Table Schema Fixes
-- Fixes 3 schema deviations to support custom roles:
-- 1. Add isSystemRole field to distinguish system vs custom roles
-- 2. Convert name from RoleName enum to String for custom role support
-- 3. Convert defaultPermissions from String to Json for proper array storage

-- ============================================================================
-- STEP 1: Add isSystemRole column
-- ============================================================================

-- Add is_system_role column with default false
ALTER TABLE "role" ADD COLUMN "is_system_role" BOOLEAN NOT NULL DEFAULT false;

-- Mark the 6 system roles as system roles
UPDATE "role"
SET "is_system_role" = true
WHERE "name" IN ('super_admin', 'admin', 'ops', 'support', 'analyst', 'auditor');

-- Add index for efficient system role filtering
CREATE INDEX "role_is_system_role_idx" ON "role"("is_system_role");

-- ============================================================================
-- STEP 2: Convert defaultPermissions from TEXT to JSONB
-- ============================================================================

-- Convert default_permissions column from TEXT to JSONB
-- PostgreSQL can automatically cast JSON-formatted strings to JSONB
-- If the column contains valid JSON arrays like '["permission1", "permission2"]'
-- this will work automatically. If not, you may need to fix the data first.

-- First, drop the default constraint if it exists (prevents casting error)
ALTER TABLE "role" ALTER COLUMN "default_permissions" DROP DEFAULT;

-- Now convert the column type with explicit USING clause
ALTER TABLE "role"
ALTER COLUMN "default_permissions" TYPE jsonb
USING CASE
  WHEN "default_permissions"::text = '' THEN '[]'::jsonb
  WHEN "default_permissions"::text IS NULL THEN '[]'::jsonb
  ELSE "default_permissions"::jsonb
END;

-- Optionally set a new default for future inserts
ALTER TABLE "role" ALTER COLUMN "default_permissions" SET DEFAULT '[]'::jsonb;

-- ============================================================================
-- STEP 3: Convert name from RoleName enum to VARCHAR(50)
-- ============================================================================

-- First, alter the column type to remove enum constraint
-- We use USING clause to explicitly cast enum values to text
ALTER TABLE "role"
ALTER COLUMN "name" TYPE VARCHAR(50)
USING "name"::text;

-- ============================================================================
-- STEP 4: Change id default from uuid() to gen_random_uuid()
-- ============================================================================

-- Update the default value for id column to use gen_random_uuid() for consistency
ALTER TABLE "role"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- ============================================================================
-- VERIFICATION QUERIES (Run these manually to verify success)
-- ============================================================================

-- Verify is_system_role was added and set correctly
-- Expected: 6 rows with is_system_role = true
-- SELECT name, is_system_role FROM role ORDER BY hierarchy;

-- Verify defaultPermissions is now JSONB and contains valid JSON arrays
-- Expected: All rows should have valid JSON arrays
-- SELECT name, default_permissions, pg_typeof(default_permissions) as type FROM role;

-- Verify name is now VARCHAR(50) and no longer enum
-- Expected: data_type = 'character varying', character_maximum_length = 50
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'role' AND column_name = 'name';

-- ============================================================================
-- ROLLBACK NOTES (For emergency rollback)
-- ============================================================================

-- To rollback this migration:
-- 1. Revert name back to enum (requires recreating RoleName enum)
-- 2. Revert defaultPermissions to TEXT
-- 3. Drop is_system_role column
-- 4. Revert id default to uuid()
--
-- WARNING: Rollback will fail if custom roles exist (name not in enum values)
-- Ensure no custom roles are created before attempting rollback

-- ============================================================================
-- NOTES ON ROLENAME ENUM
-- ============================================================================

-- The RoleName enum is intentionally NOT dropped in this migration for safety.
-- Reasons:
-- 1. Allows easier rollback if issues are discovered
-- 2. Prevents accidental schema corruption if enum is used elsewhere
-- 3. Can be dropped in a future migration after confirming stability
--
-- To drop the enum manually after confirming no dependencies:
-- DROP TYPE IF EXISTS "RoleName" CASCADE;
--
-- First verify no other tables use it:
-- SELECT DISTINCT
--   t.table_name,
--   c.column_name,
--   c.udt_name
-- FROM information_schema.columns c
-- JOIN information_schema.tables t ON c.table_name = t.table_name
-- WHERE c.udt_name = 'RoleName' AND t.table_schema = 'public';
