-- Plan 208: Fractional Credit System Migration (Int → Decimal(12, 2))
-- This migration converts credit fields from Int to Decimal(12, 2) to support 0.01 precision
-- Supports configurable credit increments (0.01, 0.1, 1.0) via system_settings

-- ========================================
-- STEP 1: Create system_settings table
-- ========================================
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "value_type" VARCHAR(20) NOT NULL DEFAULT 'string', -- 'string', 'number', 'decimal', 'boolean', 'json'
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL DEFAULT 'general', -- 'billing', 'security', 'feature_flags', etc.
  "is_public" BOOLEAN NOT NULL DEFAULT false, -- Whether to expose via public API
  "is_encrypted" BOOLEAN NOT NULL DEFAULT false, -- For sensitive values
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_system_settings_category" ON "system_settings"("category");
CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");

-- Insert credit_minimum_increment setting
INSERT INTO "system_settings" ("key", "value", "value_type", "description", "category", "is_public", "updated_at")
VALUES (
  'credit_minimum_increment',
  '0.1',
  'decimal',
  'Minimum credit increment for credit deduction rounding (e.g., 0.1 = $0.001 per increment). Allowed values: 0.01, 0.1, 1.0',
  'billing',
  false,
  NOW()
)
ON CONFLICT ("key") DO NOTHING; -- Don't override if already exists

-- ========================================
-- STEP 2: user_credit_balance - Add Decimal columns
-- ========================================
ALTER TABLE "user_credit_balance"
  ADD COLUMN IF NOT EXISTS "amount_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "last_deduction_amount_decimal" DECIMAL(12, 2);

-- Migrate data: Int → Decimal
UPDATE "user_credit_balance"
  SET
    "amount_decimal" = "amount"::decimal,
    "last_deduction_amount_decimal" = CASE
      WHEN "last_deduction_amount" IS NULL THEN NULL
      ELSE "last_deduction_amount"::decimal
    END;

-- Verify data integrity
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM "user_credit_balance"
  WHERE "amount"::decimal != "amount_decimal"
     OR (
       "last_deduction_amount" IS NOT NULL
       AND "last_deduction_amount"::decimal != "last_deduction_amount_decimal"
     );

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % rows have mismatched values in user_credit_balance', mismatch_count;
  END IF;
END $$;

-- Drop old Int columns with CASCADE (handles dependent views)
ALTER TABLE "user_credit_balance"
  DROP COLUMN "amount" CASCADE,
  DROP COLUMN "last_deduction_amount" CASCADE,
  ALTER COLUMN "amount_decimal" SET NOT NULL,
  ALTER COLUMN "amount_decimal" SET DEFAULT 0;

-- Rename columns to original names
ALTER TABLE "user_credit_balance"
  RENAME COLUMN "amount_decimal" TO "amount";
ALTER TABLE "user_credit_balance"
  RENAME COLUMN "last_deduction_amount_decimal" TO "last_deduction_amount";

-- ========================================
-- STEP 3: token_usage_ledger - Add Decimal columns
-- ========================================
ALTER TABLE "token_usage_ledger"
  ADD COLUMN IF NOT EXISTS "credits_deducted_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "input_credits_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "output_credits_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "total_credits_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "cache_write_credits_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "cache_read_credits_decimal" DECIMAL(12, 2);

-- Migrate data: Int → Decimal
UPDATE "token_usage_ledger"
  SET
    "credits_deducted_decimal" = "credits_deducted"::decimal,
    "input_credits_decimal" = CASE
      WHEN "input_credits" IS NULL THEN NULL
      ELSE "input_credits"::decimal
    END,
    "output_credits_decimal" = CASE
      WHEN "output_credits" IS NULL THEN NULL
      ELSE "output_credits"::decimal
    END,
    "total_credits_decimal" = CASE
      WHEN "total_credits" IS NULL THEN NULL
      ELSE "total_credits"::decimal
    END,
    "cache_write_credits_decimal" = CASE
      WHEN "cache_write_credits" IS NULL THEN NULL
      ELSE "cache_write_credits"::decimal
    END,
    "cache_read_credits_decimal" = CASE
      WHEN "cache_read_credits" IS NULL THEN NULL
      ELSE "cache_read_credits"::decimal
    END;

-- Verify data integrity
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM "token_usage_ledger"
  WHERE "credits_deducted"::decimal != "credits_deducted_decimal"
     OR ("input_credits" IS NOT NULL AND "input_credits"::decimal != "input_credits_decimal")
     OR ("output_credits" IS NOT NULL AND "output_credits"::decimal != "output_credits_decimal")
     OR ("total_credits" IS NOT NULL AND "total_credits"::decimal != "total_credits_decimal")
     OR ("cache_write_credits" IS NOT NULL AND "cache_write_credits"::decimal != "cache_write_credits_decimal")
     OR ("cache_read_credits" IS NOT NULL AND "cache_read_credits"::decimal != "cache_read_credits_decimal");

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % rows have mismatched values in token_usage_ledger', mismatch_count;
  END IF;
END $$;

-- Drop old Int columns with CASCADE (handles dependent views)
ALTER TABLE "token_usage_ledger"
  DROP COLUMN "credits_deducted" CASCADE,
  DROP COLUMN "input_credits" CASCADE,
  DROP COLUMN "output_credits" CASCADE,
  DROP COLUMN "total_credits" CASCADE,
  DROP COLUMN "cache_write_credits" CASCADE,
  DROP COLUMN "cache_read_credits" CASCADE,
  ALTER COLUMN "credits_deducted_decimal" SET NOT NULL;

-- Rename columns to original names
ALTER TABLE "token_usage_ledger"
  RENAME COLUMN "credits_deducted_decimal" TO "credits_deducted";
ALTER TABLE "token_usage_ledger"
  RENAME COLUMN "input_credits_decimal" TO "input_credits";
ALTER TABLE "token_usage_ledger"
  RENAME COLUMN "output_credits_decimal" TO "output_credits";
ALTER TABLE "token_usage_ledger"
  RENAME COLUMN "total_credits_decimal" TO "total_credits";
ALTER TABLE "token_usage_ledger"
  RENAME COLUMN "cache_write_credits_decimal" TO "cache_write_credits";
ALTER TABLE "token_usage_ledger"
  RENAME COLUMN "cache_read_credits_decimal" TO "cache_read_credits";

-- ========================================
-- STEP 4: credit_deduction_ledger - Add Decimal columns
-- ========================================
ALTER TABLE "credit_deduction_ledger"
  ADD COLUMN IF NOT EXISTS "amount_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "balance_before_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "balance_after_decimal" DECIMAL(12, 2);

-- Migrate data: Int → Decimal
UPDATE "credit_deduction_ledger"
  SET
    "amount_decimal" = "amount"::decimal,
    "balance_before_decimal" = "balance_before"::decimal,
    "balance_after_decimal" = "balance_after"::decimal;

-- Verify data integrity
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM "credit_deduction_ledger"
  WHERE "amount"::decimal != "amount_decimal"
     OR "balance_before"::decimal != "balance_before_decimal"
     OR "balance_after"::decimal != "balance_after_decimal";

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % rows have mismatched values in credit_deduction_ledger', mismatch_count;
  END IF;
END $$;

-- Drop old Int columns with CASCADE (handles dependent views)
ALTER TABLE "credit_deduction_ledger"
  DROP COLUMN "amount" CASCADE,
  DROP COLUMN "balance_before" CASCADE,
  DROP COLUMN "balance_after" CASCADE,
  ALTER COLUMN "amount_decimal" SET NOT NULL,
  ALTER COLUMN "balance_before_decimal" SET NOT NULL,
  ALTER COLUMN "balance_after_decimal" SET NOT NULL;

-- Rename columns to original names
ALTER TABLE "credit_deduction_ledger"
  RENAME COLUMN "amount_decimal" TO "amount";
ALTER TABLE "credit_deduction_ledger"
  RENAME COLUMN "balance_before_decimal" TO "balance_before";
ALTER TABLE "credit_deduction_ledger"
  RENAME COLUMN "balance_after_decimal" TO "balance_after";

-- ========================================
-- STEP 5: credit_usage_daily_summary - Add Decimal columns
-- ========================================
ALTER TABLE "credit_usage_daily_summary"
  ADD COLUMN IF NOT EXISTS "credits_deducted_decimal" DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS "credits_balance_eod_decimal" DECIMAL(12, 2);

-- Migrate data: Int → Decimal
UPDATE "credit_usage_daily_summary"
  SET
    "credits_deducted_decimal" = "credits_deducted"::decimal,
    "credits_balance_eod_decimal" = "credits_balance_eod"::decimal;

-- Verify data integrity
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM "credit_usage_daily_summary"
  WHERE "credits_deducted"::decimal != "credits_deducted_decimal"
     OR "credits_balance_eod"::decimal != "credits_balance_eod_decimal";

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % rows have mismatched values in credit_usage_daily_summary', mismatch_count;
  END IF;
END $$;

-- Drop old Int columns with CASCADE (handles dependent views)
ALTER TABLE "credit_usage_daily_summary"
  DROP COLUMN "credits_deducted" CASCADE,
  DROP COLUMN "credits_balance_eod" CASCADE,
  ALTER COLUMN "credits_deducted_decimal" SET NOT NULL,
  ALTER COLUMN "credits_deducted_decimal" SET DEFAULT 0,
  ALTER COLUMN "credits_balance_eod_decimal" SET NOT NULL;

-- Rename columns to original names
ALTER TABLE "credit_usage_daily_summary"
  RENAME COLUMN "credits_deducted_decimal" TO "credits_deducted";
ALTER TABLE "credit_usage_daily_summary"
  RENAME COLUMN "credits_balance_eod_decimal" TO "credits_balance_eod";

-- ========================================
-- STEP 6: Migration Summary
-- ========================================
-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Plan 208: Fractional Credits Migration completed successfully';
  RAISE NOTICE 'Tables migrated: user_credit_balance, token_usage_ledger, credit_deduction_ledger, credit_usage_daily_summary';
  RAISE NOTICE 'Configuration: credit_minimum_increment = 0.1 (default)';
  RAISE NOTICE 'Precision: Decimal(12, 2) supports up to 9,999,999,999.99 credits';
END $$;
