-- Migration: Update subscription_tier enum to match Plan 129 6-tier model
-- Replaces 3-value enum (free, pro, enterprise) with 6-value enum
-- Maps old 'enterprise' to new 'enterprise_pro'
-- Also fixes unique constraint warnings

-- ============================================================================
-- STEP 1: Create new enum type with all 6 values
-- ============================================================================

-- Create a new enum type with the correct values (avoids using uncommitted enum values)
CREATE TYPE "subscription_tier_new" AS ENUM ('free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual');

-- ============================================================================
-- STEP 2: Migrate all columns to new enum (with data mapping)
-- ============================================================================

-- Update subscription_monetization table to use new enum
-- Maps old 'enterprise' to new 'enterprise_pro'
ALTER TABLE "subscription_monetization"
  ALTER COLUMN "tier" TYPE "subscription_tier_new"
  USING (
    CASE "tier"::text
      WHEN 'enterprise' THEN 'enterprise_pro'
      ELSE "tier"::text
    END
  )::"subscription_tier_new";

-- Update coupon table tier_eligibility array
-- Maps 'enterprise' to 'enterprise_pro' in arrays
-- First drop default constraint to avoid casting error
ALTER TABLE "coupon" ALTER COLUMN "tier_eligibility" DROP DEFAULT;

ALTER TABLE "coupon"
  ALTER COLUMN "tier_eligibility" TYPE "subscription_tier_new"[]
  USING array_replace("tier_eligibility"::text[], 'enterprise', 'enterprise_pro')::"subscription_tier_new"[];

-- Restore default with new enum type
ALTER TABLE "coupon" ALTER COLUMN "tier_eligibility" SET DEFAULT ARRAY['free', 'pro', 'enterprise_pro']::"subscription_tier_new"[];

-- Update models table allowed_tiers array
-- Maps 'enterprise' to 'enterprise_pro' in arrays
-- First drop default constraint to avoid casting error
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" DROP DEFAULT;

ALTER TABLE "models"
  ALTER COLUMN "allowed_tiers" TYPE "subscription_tier_new"[]
  USING array_replace("allowed_tiers"::text[], 'enterprise', 'enterprise_pro')::"subscription_tier_new"[];

-- Restore default with new enum type
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" SET DEFAULT ARRAY['free', 'pro', 'enterprise_pro']::"subscription_tier_new"[];

-- Update models table required_tier column
-- Maps 'enterprise' to 'enterprise_pro'
-- First drop default constraint to avoid casting error
ALTER TABLE "models" ALTER COLUMN "required_tier" DROP DEFAULT;

ALTER TABLE "models"
  ALTER COLUMN "required_tier" TYPE "subscription_tier_new"
  USING (
    CASE "required_tier"::text
      WHEN 'enterprise' THEN 'enterprise_pro'
      ELSE "required_tier"::text
    END
  )::"subscription_tier_new";

-- Restore default with new enum type
ALTER TABLE "models" ALTER COLUMN "required_tier" SET DEFAULT 'free'::"subscription_tier_new";

-- Update subscriptions table tier column (if table exists)
-- Maps 'enterprise' to 'enterprise_pro'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE "subscriptions"
      ALTER COLUMN "tier" TYPE "subscription_tier_new"
      USING (
        CASE "tier"::text
          WHEN 'enterprise' THEN 'enterprise_pro'
          ELSE "tier"::text
        END
      )::"subscription_tier_new";
  END IF;
END $$;

-- Update coupon_campaign table target_tier column (if column exists)
-- Maps 'enterprise' to 'enterprise_pro'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'coupon_campaign'
    AND column_name = 'target_tier'
  ) THEN
    ALTER TABLE "coupon_campaign"
      ALTER COLUMN "target_tier" TYPE "subscription_tier_new"
      USING (
        CASE "target_tier"::text
          WHEN 'enterprise' THEN 'enterprise_pro'
          ELSE "target_tier"::text
        END
      )::"subscription_tier_new";
  END IF;
END $$;

-- Update pricing_configuration table tier column (if table exists)
-- Maps 'enterprise' to 'enterprise_pro'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'pricing_configuration'
  ) THEN
    ALTER TABLE "pricing_configuration"
      ALTER COLUMN "tier" TYPE "subscription_tier_new"
      USING (
        CASE "tier"::text
          WHEN 'enterprise' THEN 'enterprise_pro'
          ELSE "tier"::text
        END
      )::"subscription_tier_new";
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop old enum and rename new one
-- ============================================================================

-- Drop the old enum type (no longer used by any columns)
DROP TYPE "subscription_tier";

-- Rename the new enum to the original name
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

-- Verify no 'enterprise' values remain in data (check all 7 columns)
-- Expected: 0 rows for each query
-- SELECT * FROM subscription_monetization WHERE tier::text = 'enterprise';
-- SELECT * FROM subscriptions WHERE tier::text = 'enterprise';
-- SELECT * FROM models WHERE required_tier::text = 'enterprise';
-- SELECT * FROM coupon_campaign WHERE target_tier::text = 'enterprise';
-- SELECT * FROM pricing_configuration WHERE tier::text = 'enterprise';

-- Verify unique constraints exist
-- Expected: 2 rows (oidc_models_id_key, user_role_assignment_user_id_role_id_key)
-- SELECT conname FROM pg_constraint
-- WHERE conname IN ('oidc_models_id_key', 'user_role_assignment_user_id_role_id_key');

-- ============================================================================
-- COLUMNS CONVERTED (7 total)
-- ============================================================================
-- Scalar columns:
-- 1. subscription_monetization.tier
-- 2. subscriptions.tier (conditional)
-- 3. models.required_tier
-- 4. coupon_campaign.target_tier (conditional)
-- 5. pricing_configuration.tier (conditional)
--
-- Array columns:
-- 6. coupon.tier_eligibility
-- 7. models.allowed_tiers

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
