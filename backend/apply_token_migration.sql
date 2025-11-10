-- Manual application of missing migration: 20251109000000_add_token_credit_conversion_system
-- This migration was skipped, so we need to apply it manually with safety checks

BEGIN;

-- =============================================================================
-- ENUMS (with existence checks)
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE "pricing_config_scope_type" AS ENUM ('tier', 'provider', 'model', 'combination');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "pricing_config_reason" AS ENUM ('initial_setup', 'vendor_price_change', 'tier_optimization', 'margin_protection', 'manual_adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "pricing_config_approval_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "request_type" AS ENUM ('completion', 'streaming', 'batch');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "request_status" AS ENUM ('success', 'failed', 'cancelled', 'rate_limited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "credit_deduction_reason" AS ENUM ('api_completion', 'subscription_allocation', 'manual_adjustment', 'refund', 'overage', 'bonus', 'referral', 'coupon');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "credit_deduction_status" AS ENUM ('pending', 'completed', 'reversed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "credit_source_type" AS ENUM ('monthly_allocation', 'referral_reward', 'coupon_promotion', 'bonus', 'refund', 'admin_grant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- PROVIDERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "providers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) UNIQUE NOT NULL,
    "api_type" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "providers_is_enabled_idx" ON "providers"("is_enabled");

-- =============================================================================
-- MODEL PROVIDER PRICING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "model_provider_pricing" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,
    "vendor_model_id" VARCHAR(255) UNIQUE,
    "input_price_per_1k" DECIMAL(10, 8) NOT NULL,
    "output_price_per_1k" DECIMAL(10, 8) NOT NULL,
    "cache_input_price_per_1k" DECIMAL(10, 8),
    "cache_hit_price_per_1k" DECIMAL(10, 8),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "previous_price_input" DECIMAL(10, 8),
    "previous_price_output" DECIMAL(10, 8),
    "price_change_percent_input" DECIMAL(5, 2),
    "price_change_percent_output" DECIMAL(5, 2),
    "detected_at" TIMESTAMP(3),
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "description" TEXT,
    "last_verified" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "verification_frequency_days" INTEGER DEFAULT 7 NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "model_provider_pricing_provider_id_fkey"
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "model_provider_pricing_provider_id_model_name_effective_from_key"
    ON "model_provider_pricing"("provider_id", "model_name", "effective_from");
CREATE INDEX IF NOT EXISTS "model_provider_pricing_provider_id_model_name_is_active_idx"
    ON "model_provider_pricing"("provider_id", "model_name", "is_active");
CREATE INDEX IF NOT EXISTS "model_provider_pricing_effective_from_effective_until_idx"
    ON "model_provider_pricing"("effective_from", "effective_until");
CREATE INDEX IF NOT EXISTS "model_provider_pricing_is_active_idx"
    ON "model_provider_pricing"("is_active");

-- =============================================================================
-- PRICING CONFIGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "pricing_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "scope_type" "pricing_config_scope_type" NOT NULL,
    "subscription_tier" "subscription_tier",
    "provider_id" UUID,
    "model_id" VARCHAR(255),
    "margin_multiplier" DECIMAL(4, 2) NOT NULL,
    "target_gross_margin_percent" DECIMAL(5, 2),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "reason" "pricing_config_reason" NOT NULL,
    "reason_details" TEXT,
    "previous_multiplier" DECIMAL(4, 2),
    "change_percent" DECIMAL(5, 2),
    "expected_margin_change_dollars" DECIMAL(12, 2),
    "expected_revenue_impact" DECIMAL(12, 2),
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "requires_approval" BOOLEAN DEFAULT true NOT NULL,
    "approval_status" "pricing_config_approval_status" DEFAULT 'pending' NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "monitored" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_configs_provider_id_fkey"
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pricing_configs_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pricing_configs_approved_by_fkey"
        FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pricing_configs_scope_type_idx" ON "pricing_configs"("scope_type");
CREATE INDEX IF NOT EXISTS "pricing_configs_subscription_tier_is_active_idx" ON "pricing_configs"("subscription_tier", "is_active");
CREATE INDEX IF NOT EXISTS "pricing_configs_provider_id_is_active_idx" ON "pricing_configs"("provider_id", "is_active");
CREATE INDEX IF NOT EXISTS "pricing_configs_is_active_effective_from_idx" ON "pricing_configs"("is_active", "effective_from");
CREATE INDEX IF NOT EXISTS "pricing_configs_approval_status_idx" ON "pricing_configs"("approval_status");

-- =============================================================================
-- TOKEN USAGE LEDGER TABLE (THE MISSING TABLE!)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "token_usage_ledger" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "request_id" UUID UNIQUE NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "model_id" VARCHAR(255) NOT NULL,
    "provider_id" UUID NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER DEFAULT 0 NOT NULL,
    "total_tokens" INTEGER GENERATED ALWAYS AS ("input_tokens" + "output_tokens") STORED,
    "vendor_cost" DECIMAL(10, 8) NOT NULL,
    "margin_multiplier" DECIMAL(4, 2) NOT NULL,
    "credit_value_usd" DECIMAL(10, 8) NOT NULL,
    "credits_deducted" INTEGER NOT NULL,
    "gross_margin_usd" DECIMAL(10, 8) GENERATED ALWAYS AS ("credit_value_usd" - "vendor_cost") STORED,
    "request_type" "request_type" NOT NULL,
    "streaming_segments" INTEGER,
    "request_started_at" TIMESTAMP(3) NOT NULL,
    "request_completed_at" TIMESTAMP(3) NOT NULL,
    "processing_time_ms" INTEGER,
    "status" "request_status" DEFAULT 'success' NOT NULL,
    "error_message" TEXT,
    "is_streaming_complete" BOOLEAN DEFAULT true NOT NULL,
    "user_tier_at_request" VARCHAR(50),
    "region" VARCHAR(50),
    "deduction_record_id" UUID,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "token_usage_ledger_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "token_usage_ledger_subscription_id_fkey"
        FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "token_usage_ledger_provider_id_fkey"
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "token_usage_ledger_user_id_created_at_idx" ON "token_usage_ledger"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_model_id_created_at_idx" ON "token_usage_ledger"("model_id", "created_at");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_provider_id_created_at_idx" ON "token_usage_ledger"("provider_id", "created_at");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_user_id_vendor_cost_idx" ON "token_usage_ledger"("user_id", "vendor_cost");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_request_id_idx" ON "token_usage_ledger"("request_id");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_status_idx" ON "token_usage_ledger"("status");

-- =============================================================================
-- USER CREDIT BALANCE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "user_credit_balance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID UNIQUE NOT NULL,
    "amount" INTEGER DEFAULT 0 NOT NULL,
    "last_deduction_at" TIMESTAMP(3),
    "last_deduction_amount" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "user_credit_balance_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_credit_balance_user_id_idx" ON "user_credit_balance"("user_id");

-- =============================================================================
-- CREDIT DEDUCTION LEDGER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "credit_deduction_ledger" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "request_id" UUID UNIQUE,
    "token_vendor_cost" DECIMAL(10, 8),
    "margin_multiplier" DECIMAL(4, 2),
    "gross_margin" DECIMAL(10, 8),
    "reason" "credit_deduction_reason" NOT NULL,
    "status" "credit_deduction_status" DEFAULT 'pending' NOT NULL,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" UUID,
    "reversal_reason" TEXT,
    "processed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "credit_deduction_ledger_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "credit_deduction_ledger_reversed_by_fkey"
        FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "credit_deduction_ledger_request_id_fkey"
        FOREIGN KEY ("request_id") REFERENCES "token_usage_ledger"("request_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_user_id_created_at_idx" ON "credit_deduction_ledger"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_request_id_idx" ON "credit_deduction_ledger"("request_id");
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_status_idx" ON "credit_deduction_ledger"("status");
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_reason_idx" ON "credit_deduction_ledger"("reason");

-- =============================================================================
-- USER CREDIT SOURCE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "user_credit_source" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" "credit_source_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "user_credit_source_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_credit_source_user_id_expires_at_idx" ON "user_credit_source"("user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "user_credit_source_source_idx" ON "user_credit_source"("source");

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS "token_usage_daily_summary" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "summary_date" DATE NOT NULL,
    "total_requests" INTEGER DEFAULT 0 NOT NULL,
    "total_input_tokens" INTEGER DEFAULT 0 NOT NULL,
    "total_output_tokens" INTEGER DEFAULT 0 NOT NULL,
    "total_vendor_cost" DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    "total_credits_deducted" INTEGER DEFAULT 0 NOT NULL,
    "total_gross_margin" DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    "avg_request_latency_ms" INTEGER,
    "success_rate" DECIMAL(5, 2),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "token_usage_daily_summary_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "token_usage_daily_summary_user_id_summary_date_key" ON "token_usage_daily_summary"("user_id", "summary_date");
CREATE INDEX IF NOT EXISTS "token_usage_daily_summary_user_id_summary_date_idx" ON "token_usage_daily_summary"("user_id", "summary_date");
CREATE INDEX IF NOT EXISTS "token_usage_daily_summary_summary_date_idx" ON "token_usage_daily_summary"("summary_date");

CREATE TABLE IF NOT EXISTS "credit_usage_daily_summary" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "summary_date" DATE NOT NULL,
    "total_deductions" INTEGER DEFAULT 0 NOT NULL,
    "total_requests" INTEGER DEFAULT 0 NOT NULL,
    "total_vendor_cost" DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    "total_gross_margin" DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "credit_usage_daily_summary_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "credit_usage_daily_summary_user_id_summary_date_key" ON "credit_usage_daily_summary"("user_id", "summary_date");
CREATE INDEX IF NOT EXISTS "credit_usage_daily_summary_user_id_summary_date_idx" ON "credit_usage_daily_summary"("user_id", "summary_date");

-- =============================================================================
-- ADD FOREIGN KEY (after credit_deduction_ledger exists)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'token_usage_ledger_deduction_record_id_fkey'
        AND table_name = 'token_usage_ledger'
    ) THEN
        ALTER TABLE "token_usage_ledger"
            ADD CONSTRAINT "token_usage_ledger_deduction_record_id_fkey"
            FOREIGN KEY ("deduction_record_id") REFERENCES "credit_deduction_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- =============================================================================
-- UPDATE MIGRATION TRACKING
-- =============================================================================

-- Mark this migration as applied in Prisma's tracking table (only if not already recorded)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = '20251109000000_add_token_credit_conversion_system'
    ) THEN
        INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES (
            gen_random_uuid()::text,
            '8e8f4e4c5d6b7a8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
            NOW(),
            '20251109000000_add_token_credit_conversion_system',
            NULL,
            NULL,
            NOW(),
            1
        );
        RAISE NOTICE 'Migration 20251109000000_add_token_credit_conversion_system marked as applied';
    ELSE
        RAISE NOTICE 'Migration 20251109000000_add_token_credit_conversion_system already recorded';
    END IF;
END $$;

COMMIT;

-- Verification query
SELECT 'Migration applied successfully! Verifying tables...' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('token_usage_ledger', 'providers', 'user_credit_balance', 'credit_deduction_ledger')
ORDER BY table_name;
