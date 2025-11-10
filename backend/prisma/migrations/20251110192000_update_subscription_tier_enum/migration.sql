-- Migration: Update subscription_tier enum to match Plan 129 6-tier model
-- Adds: pro_max, enterprise_pro, enterprise_max, perpetual
-- Removes: enterprise (migrates data to enterprise_pro)
-- Also fixes unique constraint warnings

-- ============================================================================
-- STEP 1: Add new enum values to subscription_tier
-- ============================================================================

-- Add the new tier values that are missing
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'pro_max';
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'enterprise_pro';
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'enterprise_max';
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'perpetual';

-- ============================================================================
-- STEP 2: Migrate existing data from 'enterprise' to 'enterprise_pro'
-- ============================================================================

-- Update subscription_monetization table
UPDATE "subscription_monetization"
SET "tier" = 'enterprise_pro'
WHERE "tier" = 'enterprise';

-- Update any tier_eligibility arrays in coupon table
UPDATE "coupon"
SET "tier_eligibility" = array_replace("tier_eligibility", 'enterprise'::subscription_tier, 'enterprise_pro'::subscription_tier)
WHERE 'enterprise'::subscription_tier = ANY("tier_eligibility");

-- Update allowed_tiers arrays in models table
UPDATE "models"
SET "allowed_tiers" = array_replace("allowed_tiers", 'enterprise'::subscription_tier, 'enterprise_pro'::subscription_tier)
WHERE 'enterprise'::subscription_tier = ANY("allowed_tiers");

-- ============================================================================
-- STEP 3: Remove the old 'enterprise' enum value
-- ============================================================================

-- Create a new enum type with the correct values
CREATE TYPE "subscription_tier_new" AS ENUM ('free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual');

-- Update subscription_monetization table to use new enum
ALTER TABLE "subscription_monetization"
  ALTER COLUMN "tier" TYPE "subscription_tier_new"
  USING "tier"::text::"subscription_tier_new";

-- Update coupon table tier_eligibility array
ALTER TABLE "coupon"
  ALTER COLUMN "tier_eligibility" TYPE "subscription_tier_new"[]
  USING "tier_eligibility"::text[]::"subscription_tier_new"[];

-- Update models table allowed_tiers array
ALTER TABLE "models"
  ALTER COLUMN "allowed_tiers" TYPE "subscription_tier_new"[]
  USING "allowed_tiers"::text[]::"subscription_tier_new"[];

-- Update subscription_tier_config table tier_name if it exists and uses the enum
-- (In current schema it's VARCHAR, but check if there are enum references)
-- No action needed - tier_name is VARCHAR(50)

-- Drop the old enum and rename the new one
DROP TYPE "subscription_tier";
ALTER TYPE "subscription_tier_new" RENAME TO "subscription_tier";

-- ============================================================================
-- STEP 4: Fix oidc_models unique constraint (if not already exists)
-- ============================================================================

-- Add unique constraint on id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'oidc_models_id_key'
    AND conrelid = 'oidc_models'::regclass
  ) THEN
    ALTER TABLE "oidc_models" ADD CONSTRAINT "oidc_models_id_key" UNIQUE ("id");
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Fix user_role_assignment unique constraint (if not already exists)
-- ============================================================================

-- Add unique constraint on (user_id, role_id) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_role_assignment_user_id_role_id_key'
    AND conrelid = 'user_role_assignment'::regclass
  ) THEN
    -- First, remove any duplicate rows if they exist
    DELETE FROM "user_role_assignment" a USING "user_role_assignment" b
    WHERE a.ctid < b.ctid
      AND a.user_id = b.user_id
      AND a.role_id = b.role_id;

    -- Then add the unique constraint
    ALTER TABLE "user_role_assignment"
    ADD CONSTRAINT "user_role_assignment_user_id_role_id_key"
    UNIQUE ("user_id", "role_id");
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify success)
-- ============================================================================

-- Verify all 6 tier values exist in the enum
-- Expected: free, pro, pro_max, enterprise_pro, enterprise_max, perpetual
-- SELECT enumlabel FROM pg_enum
-- WHERE enumtypid = 'subscription_tier'::regtype
-- ORDER BY enumsortorder;

-- Verify no 'enterprise' values remain in data
-- Expected: 0 rows
-- SELECT * FROM subscription_monetization WHERE tier = 'enterprise';

-- Verify unique constraints exist
-- Expected: 2 rows (oidc_models_id_key, user_role_assignment_user_id_role_id_key)
-- SELECT conname FROM pg_constraint
-- WHERE conname IN ('oidc_models_id_key', 'user_role_assignment_user_id_role_id_key');

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration aligns the database with Plan 129's 6-tier monetization model:
-- 1. Free ($0/mo, 2,000 credits)
-- 2. Pro ($19/mo, 20,000 credits)
-- 3. Pro Max ($49/mo, 60,000 credits)
-- 4. Enterprise Pro ($149/mo, 250,000 credits)
-- 5. Enterprise Max (Custom pricing, unlimited credits)
-- 6. Perpetual (One-time purchase, BYOK)

-- The old 'enterprise' tier is mapped to 'enterprise_pro' as it's the closest match.
-- If you need to differentiate between enterprise_pro and enterprise_max users,
-- you'll need to manually update the tier assignments after this migration.
