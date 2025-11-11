-- Migration: Add Token-to-Credit Conversion System
-- Plan: docs/plan/112-token-to-credit-conversion-mechanism.md
-- Design: docs/reference/token-credit-schema-design.md
-- Created: 2025-11-09
-- Updated: 2025-11-10 (Added safety checks for idempotency)
-- Author: Database Schema Architect

-- =============================================================================
-- ENUMS (with existence checks for idempotency)
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
-- CORE TABLES
-- =============================================================================

-- Provider Table
-- Registry of AI model vendors (OpenAI, Anthropic, Google, Azure)
CREATE TABLE IF NOT EXISTS "providers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) UNIQUE NOT NULL,
    "api_type" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- Provider Indexes
CREATE INDEX IF NOT EXISTS "providers_is_enabled_idx" ON "providers"("is_enabled");

-- =============================================================================

-- Model Provider Pricing Table
-- Tracks vendor token pricing with historical tracking and change detection
CREATE TABLE IF NOT EXISTS "model_provider_pricing" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    "provider_id" UUID NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,
    "vendor_model_id" VARCHAR(255) UNIQUE,

    -- Pricing (per 1,000 tokens) - DECIMAL(10,8) for micro-dollar precision
    "input_price_per_1k" DECIMAL(10, 8) NOT NULL,
    "output_price_per_1k" DECIMAL(10, 8) NOT NULL,

    -- Optional: Cache pricing
    "cache_input_price_per_1k" DECIMAL(10, 8),
    "cache_hit_price_per_1k" DECIMAL(10, 8),

    -- Effective date tracking (for historical pricing)
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),

    -- Rate change detection
    "previous_price_input" DECIMAL(10, 8),
    "previous_price_output" DECIMAL(10, 8),
    "price_change_percent_input" DECIMAL(5, 2),
    "price_change_percent_output" DECIMAL(5, 2),
    "detected_at" TIMESTAMP(3),

    -- Metadata
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "description" TEXT,
    "last_verified" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "verification_frequency_days" INTEGER DEFAULT 7 NOT NULL,

    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign Keys
    CONSTRAINT "model_provider_pricing_provider_id_fkey"
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Model Provider Pricing Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "model_provider_pricing_provider_id_model_name_effective_from_key"
    ON "model_provider_pricing"("provider_id", "model_name", "effective_from");
CREATE INDEX IF NOT EXISTS "model_provider_pricing_provider_id_model_name_is_active_idx"
    ON "model_provider_pricing"("provider_id", "model_name", "is_active");
CREATE INDEX IF NOT EXISTS "model_provider_pricing_effective_from_effective_until_idx"
    ON "model_provider_pricing"("effective_from", "effective_until");
CREATE INDEX IF NOT EXISTS "model_provider_pricing_is_active_idx"
    ON "model_provider_pricing"("is_active");

-- =============================================================================

-- Pricing Config Table
-- Margin multiplier configuration with scope hierarchy and approval workflow
CREATE TABLE IF NOT EXISTS "pricing_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    "scope_type" "pricing_config_scope_type" NOT NULL,
    "subscription_tier" "subscription_tier",
    "provider_id" UUID,
    "model_id" VARCHAR(255),

    -- Multiplier Value
    "margin_multiplier" DECIMAL(4, 2) NOT NULL,
    "target_gross_margin_percent" DECIMAL(5, 2),

    -- Effective Date Range
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),

    -- Reason for Change
    "reason" "pricing_config_reason" NOT NULL,
    "reason_details" TEXT,

    -- Change History
    "previous_multiplier" DECIMAL(4, 2),
    "change_percent" DECIMAL(5, 2),

    -- Impact Prediction
    "expected_margin_change_dollars" DECIMAL(12, 2),
    "expected_revenue_impact" DECIMAL(12, 2),

    -- Admin Metadata
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "requires_approval" BOOLEAN DEFAULT true NOT NULL,
    "approval_status" "pricing_config_approval_status" DEFAULT 'pending' NOT NULL,

    -- Monitoring
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "monitored" BOOLEAN DEFAULT true NOT NULL,

    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign Keys
    CONSTRAINT "pricing_configs_provider_id_fkey"
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pricing_configs_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pricing_configs_approved_by_fkey"
        FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Pricing Config Indexes
CREATE INDEX IF NOT EXISTS "pricing_configs_scope_type_idx" ON "pricing_configs"("scope_type");
CREATE INDEX IF NOT EXISTS "pricing_configs_subscription_tier_is_active_idx" ON "pricing_configs"("subscription_tier", "is_active");
CREATE INDEX IF NOT EXISTS "pricing_configs_provider_id_is_active_idx" ON "pricing_configs"("provider_id", "is_active");
CREATE INDEX IF NOT EXISTS "pricing_configs_is_active_effective_from_idx" ON "pricing_configs"("is_active", "effective_from");
CREATE INDEX IF NOT EXISTS "pricing_configs_approval_status_idx" ON "pricing_configs"("approval_status");

-- =============================================================================

-- Token Usage Ledger Table
-- Immutable audit trail of every API request with token counts and costs
CREATE TABLE IF NOT EXISTS "token_usage_ledger" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "request_id" UUID UNIQUE NOT NULL,

    -- User & Subscription Context
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,

    -- Model & Provider
    "model_id" VARCHAR(255) NOT NULL,
    "provider_id" UUID NOT NULL,

    -- Token Counts
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER DEFAULT 0 NOT NULL,

    -- GENERATED COLUMN: totalTokens = inputTokens + outputTokens
    "total_tokens" INTEGER GENERATED ALWAYS AS ("input_tokens" + "output_tokens") STORED,

    -- Costing
    "vendor_cost" DECIMAL(10, 8) NOT NULL,
    "margin_multiplier" DECIMAL(4, 2) NOT NULL,
    "credit_value_usd" DECIMAL(10, 8) NOT NULL,
    "credits_deducted" INTEGER NOT NULL,

    -- GENERATED COLUMN: grossMarginUsd = creditValueUsd - vendorCost
    "gross_margin_usd" DECIMAL(10, 8) GENERATED ALWAYS AS ("credit_value_usd" - "vendor_cost") STORED,

    -- Request Type
    "request_type" "request_type" NOT NULL,
    "streaming_segments" INTEGER,

    -- Timing
    "request_started_at" TIMESTAMP(3) NOT NULL,
    "request_completed_at" TIMESTAMP(3) NOT NULL,
    "processing_time_ms" INTEGER,

    -- Status
    "status" "request_status" DEFAULT 'success' NOT NULL,
    "error_message" TEXT,
    "is_streaming_complete" BOOLEAN DEFAULT true NOT NULL,

    -- Metadata
    "user_tier_at_request" VARCHAR(50),
    "region" VARCHAR(50),

    -- Link to deduction
    "deduction_record_id" UUID,

    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT "token_usage_ledger_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "token_usage_ledger_subscription_id_fkey"
        FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "token_usage_ledger_provider_id_fkey"
        FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Token Usage Ledger Indexes
CREATE INDEX IF NOT EXISTS "token_usage_ledger_user_id_created_at_idx" ON "token_usage_ledger"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_model_id_created_at_idx" ON "token_usage_ledger"("model_id", "created_at");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_provider_id_created_at_idx" ON "token_usage_ledger"("provider_id", "created_at");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_user_id_vendor_cost_idx" ON "token_usage_ledger"("user_id", "vendor_cost");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_request_id_idx" ON "token_usage_ledger"("request_id");
CREATE INDEX IF NOT EXISTS "token_usage_ledger_status_idx" ON "token_usage_ledger"("status");

-- =============================================================================

-- User Credit Balance Table
-- Single source of truth for user credit balances
CREATE TABLE IF NOT EXISTS "user_credit_balance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID UNIQUE NOT NULL,

    "amount" INTEGER DEFAULT 0 NOT NULL,
    "last_deduction_at" TIMESTAMP(3),
    "last_deduction_amount" INTEGER,

    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT "user_credit_balance_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- User Credit Balance Indexes
CREATE INDEX IF NOT EXISTS "user_credit_balance_user_id_idx" ON "user_credit_balance"("user_id");

-- =============================================================================

-- Credit Deduction Ledger Table
-- Immutable audit trail of every credit deduction
CREATE TABLE IF NOT EXISTS "credit_deduction_ledger" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,

    -- Deduction details
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,

    -- Link to token usage
    "request_id" UUID UNIQUE,
    "token_vendor_cost" DECIMAL(10, 8),
    "margin_multiplier" DECIMAL(4, 2),
    "gross_margin" DECIMAL(10, 8),

    -- Reason and status
    "reason" "credit_deduction_reason" NOT NULL,
    "status" "credit_deduction_status" DEFAULT 'pending' NOT NULL,

    -- Reversal tracking
    "reversed_at" TIMESTAMP(3),
    "reversed_by" UUID,
    "reversal_reason" TEXT,

    -- Timestamps
    "processed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT "credit_deduction_ledger_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "credit_deduction_ledger_reversed_by_fkey"
        FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "credit_deduction_ledger_request_id_fkey"
        FOREIGN KEY ("request_id") REFERENCES "token_usage_ledger"("request_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Credit Deduction Ledger Indexes
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_user_id_created_at_idx" ON "credit_deduction_ledger"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_request_id_idx" ON "credit_deduction_ledger"("request_id");
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_status_idx" ON "credit_deduction_ledger"("status");
CREATE INDEX IF NOT EXISTS "credit_deduction_ledger_reason_idx" ON "credit_deduction_ledger"("reason");

-- =============================================================================

-- User Credit Source Table
-- Track credit sources and expiration
CREATE TABLE IF NOT EXISTS "user_credit_source" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,

    "source" "credit_source_type" NOT NULL,
    "amount" INTEGER NOT NULL,

    "expires_at" TIMESTAMP(3),

    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT "user_credit_source_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- User Credit Source Indexes
CREATE INDEX IF NOT EXISTS "user_credit_source_user_id_expires_at_idx" ON "user_credit_source"("user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "user_credit_source_source_idx" ON "user_credit_source"("source");

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- Token Usage Daily Summary Table
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

    -- Foreign Keys
    CONSTRAINT "token_usage_daily_summary_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Token Usage Daily Summary Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "token_usage_daily_summary_user_id_summary_date_key" ON "token_usage_daily_summary"("user_id", "summary_date");
CREATE INDEX IF NOT EXISTS "token_usage_daily_summary_user_id_summary_date_idx" ON "token_usage_daily_summary"("user_id", "summary_date");
CREATE INDEX IF NOT EXISTS "token_usage_daily_summary_summary_date_idx" ON "token_usage_daily_summary"("summary_date");

-- =============================================================================

-- Credit Usage Daily Summary Table
CREATE TABLE IF NOT EXISTS "credit_usage_daily_summary" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "summary_date" DATE NOT NULL,

    "total_deductions" INTEGER DEFAULT 0 NOT NULL,
    "total_requests" INTEGER DEFAULT 0 NOT NULL,
    "total_vendor_cost" DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    "total_gross_margin" DECIMAL(12, 2) DEFAULT 0 NOT NULL,

    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,

    -- Foreign Keys
    CONSTRAINT "credit_usage_daily_summary_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Credit Usage Daily Summary Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "credit_usage_daily_summary_user_id_summary_date_key" ON "credit_usage_daily_summary"("user_id", "summary_date");
CREATE INDEX IF NOT EXISTS "credit_usage_daily_summary_user_id_summary_date_idx" ON "credit_usage_daily_summary"("user_id", "summary_date");

-- =============================================================================

-- Add deduction_record_id foreign key to token_usage_ledger (after credit_deduction_ledger exists)
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
-- COMMENTS (for documentation)
-- =============================================================================

COMMENT ON TABLE "providers" IS 'Registry of AI model vendors (OpenAI, Anthropic, Google, Azure)';
COMMENT ON TABLE "model_provider_pricing" IS 'Vendor token pricing with historical tracking and change detection';
COMMENT ON TABLE "pricing_configs" IS 'Margin multiplier configuration with scope hierarchy and approval workflow';
COMMENT ON TABLE "token_usage_ledger" IS 'Immutable audit trail of every API request with token counts and costs';
COMMENT ON TABLE "user_credit_balance" IS 'Single source of truth for user credit balances';
COMMENT ON TABLE "credit_deduction_ledger" IS 'Immutable audit trail of every credit deduction';
COMMENT ON TABLE "user_credit_source" IS 'Track credit sources and expiration (monthly, bonus, referral, coupon)';
COMMENT ON TABLE "token_usage_daily_summary" IS 'Pre-aggregated daily token statistics for performance';
COMMENT ON TABLE "credit_usage_daily_summary" IS 'Pre-aggregated daily credit statistics';

COMMENT ON COLUMN "model_provider_pricing"."input_price_per_1k" IS 'Price per 1,000 input tokens in USD - DECIMAL(10,8) for micro-dollar precision';
COMMENT ON COLUMN "model_provider_pricing"."output_price_per_1k" IS 'Price per 1,000 output tokens in USD';
COMMENT ON COLUMN "token_usage_ledger"."total_tokens" IS 'GENERATED COLUMN: input_tokens + output_tokens';
COMMENT ON COLUMN "token_usage_ledger"."gross_margin_usd" IS 'GENERATED COLUMN: credit_value_usd - vendor_cost';

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (for reference - not executable)
-- =============================================================================

/*
To rollback this migration:

DROP TABLE IF EXISTS "credit_usage_daily_summary" CASCADE;
DROP TABLE IF EXISTS "token_usage_daily_summary" CASCADE;
DROP TABLE IF EXISTS "user_credit_source" CASCADE;
DROP TABLE IF EXISTS "credit_deduction_ledger" CASCADE;
DROP TABLE IF EXISTS "user_credit_balance" CASCADE;
DROP TABLE IF EXISTS "token_usage_ledger" CASCADE;
DROP TABLE IF EXISTS "pricing_configs" CASCADE;
DROP TABLE IF EXISTS "model_provider_pricing" CASCADE;
DROP TABLE IF EXISTS "providers" CASCADE;

DROP TYPE IF EXISTS "credit_source_type";
DROP TYPE IF EXISTS "credit_deduction_status";
DROP TYPE IF EXISTS "credit_deduction_reason";
DROP TYPE IF EXISTS "request_status";
DROP TYPE IF EXISTS "request_type";
DROP TYPE IF EXISTS "pricing_config_approval_status";
DROP TYPE IF EXISTS "pricing_config_reason";
DROP TYPE IF EXISTS "pricing_config_scope_type";
*/
