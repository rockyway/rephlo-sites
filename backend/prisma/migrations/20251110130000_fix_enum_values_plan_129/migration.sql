-- ===================================
-- Migration: Fix Enum Values (Plan 129 Gap Closure)
-- Fixes: G-004 (CouponType) and G-005 (ProrationEventType)
-- Date: 2025-11-10
-- ===================================

-- =============================================================================
-- PART 1: Update CouponType Enum Values
-- =============================================================================

-- Step 1.1: Create new CouponType enum with updated values
CREATE TYPE "coupon_type_new" AS ENUM (
  'percentage',
  'fixed_amount',
  'tier_specific',
  'duration_bonus',
  'perpetual_migration'
);

-- Step 1.2: Add temporary column with new enum type
ALTER TABLE "coupon" ADD COLUMN "coupon_type_new" "coupon_type_new";

-- Step 1.3: Migrate data from old column to new column with value mapping
UPDATE "coupon" SET "coupon_type_new" =
  CASE "coupon_type"::text
    WHEN 'percentage_discount' THEN 'percentage'
    WHEN 'fixed_amount_discount' THEN 'fixed_amount'
    WHEN 'tier_specific_discount' THEN 'tier_specific'
    WHEN 'duration_bonus' THEN 'duration_bonus'
    WHEN 'byok_migration' THEN 'perpetual_migration'
  END::"coupon_type_new";

-- Step 1.4: Drop old column
ALTER TABLE "coupon" DROP COLUMN "coupon_type";

-- Step 1.5: Rename new column to original name
ALTER TABLE "coupon" RENAME COLUMN "coupon_type_new" TO "coupon_type";

-- Step 1.6: Drop old enum type
DROP TYPE "coupon_type";

-- Step 1.7: Rename new enum to original name
ALTER TYPE "coupon_type_new" RENAME TO "coupon_type";

-- =============================================================================
-- PART 2: Rename and Update ProrationChangeType Enum to ProrationEventType
-- =============================================================================

-- Step 2.1: Create new ProrationEventType enum with updated values
CREATE TYPE "proration_event_type_new" AS ENUM (
  'upgrade',
  'downgrade',
  'interval_change',
  'migration',
  'cancellation'
);

-- Step 2.2: Add temporary column with new enum type
ALTER TABLE "proration_event" ADD COLUMN "change_type_new" "proration_event_type_new";

-- Step 2.3: Migrate data from old column to new column with value mapping
-- Note: 'reactivation' is mapped to 'upgrade' as per Plan 129 specification
UPDATE "proration_event" SET "change_type_new" =
  CASE "change_type"::text
    WHEN 'upgrade' THEN 'upgrade'
    WHEN 'downgrade' THEN 'downgrade'
    WHEN 'cancellation' THEN 'cancellation'
    WHEN 'reactivation' THEN 'upgrade'
  END::"proration_event_type_new";

-- Step 2.4: Drop old column
ALTER TABLE "proration_event" DROP COLUMN "change_type";

-- Step 2.5: Rename new column to original name
ALTER TABLE "proration_event" RENAME COLUMN "change_type_new" TO "change_type";

-- Step 2.6: Drop old enum type
DROP TYPE "proration_change_type";

-- Step 2.7: Rename new enum to correct name
ALTER TYPE "proration_event_type_new" RENAME TO "proration_event_type";

-- =============================================================================
-- VERIFICATION QUERIES (Commented out - for manual verification)
-- =============================================================================

-- Verify CouponType enum values were updated correctly
-- SELECT "code", "coupon_type", COUNT(*) FROM "coupon" GROUP BY "code", "coupon_type";

-- Verify ProrationEventType enum values were updated correctly
-- SELECT "change_type", COUNT(*) FROM "proration_event" GROUP BY "change_type";

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
-- This migration:
-- 1. Updated CouponType enum values:
--    - percentage_discount → percentage
--    - fixed_amount_discount → fixed_amount
--    - tier_specific_discount → tier_specific
--    - duration_bonus → duration_bonus (unchanged)
--    - byok_migration → perpetual_migration
--
-- 2. Renamed ProrationChangeType enum to ProrationEventType
-- 3. Updated ProrationEventType enum values:
--    - upgrade → upgrade (unchanged)
--    - downgrade → downgrade (unchanged)
--    - cancellation → cancellation (unchanged)
--    - reactivation → upgrade (mapped)
--    - NEW: interval_change (for monthly/annual changes)
--    - NEW: migration (for perpetual/subscription changes)
--
-- 4. Updated all existing records in:
--    - coupon table (coupon_type column)
--    - proration_event table (change_type column)
--
-- 5. No data loss - all existing records are preserved with updated enum values
-- =============================================================================
