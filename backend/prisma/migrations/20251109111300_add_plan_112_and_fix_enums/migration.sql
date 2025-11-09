-- CreateEnum
CREATE TYPE "vendor_name" AS ENUM ('openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere');

-- CreateEnum
CREATE TYPE "margin_strategy" AS ENUM ('fixed_percentage', 'tiered', 'dynamic');

-- CreateEnum
CREATE TYPE "deduction_type" AS ENUM ('inference', 'embedding', 'fine_tuning', 'custom');

-- CreateEnum
CREATE TYPE "license_status" AS ENUM ('pending', 'active', 'suspended', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "activation_status" AS ENUM ('active', 'deactivated', 'replaced');

-- CreateEnum
CREATE TYPE "upgrade_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "proration_change_type" AS ENUM ('upgrade', 'downgrade', 'cancellation', 'reactivation');

-- CreateEnum
CREATE TYPE "proration_status" AS ENUM ('pending', 'applied', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "coupon_type" AS ENUM ('percentage_discount', 'fixed_amount_discount', 'tier_specific_discount', 'duration_bonus', 'byok_migration');

-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed_amount', 'credits', 'months_free');

-- CreateEnum
CREATE TYPE "campaign_type" AS ENUM ('seasonal', 'win_back', 'referral', 'promotional', 'early_bird');

-- CreateEnum
CREATE TYPE "redemption_status" AS ENUM ('success', 'failed', 'reversed', 'pending');

-- CreateEnum
CREATE TYPE "fraud_detection_type" AS ENUM ('velocity_abuse', 'ip_switching', 'bot_pattern', 'device_fingerprint_mismatch', 'stacking_abuse');

-- CreateEnum
CREATE TYPE "fraud_severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "validation_rule_type" AS ENUM ('first_time_user_only', 'specific_email_domain', 'minimum_credit_balance', 'exclude_refunded_users', 'require_payment_method');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "subscription_status" ADD VALUE 'trial';
ALTER TYPE "subscription_status" ADD VALUE 'past_due';
ALTER TYPE "subscription_status" ADD VALUE 'grace_period';

-- AlterEnum
BEGIN;
CREATE TYPE "subscription_tier_new" AS ENUM ('free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual');
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" DROP DEFAULT;
ALTER TABLE "models" ALTER COLUMN "required_tier" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "tier" TYPE "subscription_tier_new" USING ("tier"::text::"subscription_tier_new");
ALTER TABLE "models" ALTER COLUMN "required_tier" TYPE "subscription_tier_new" USING ("required_tier"::text::"subscription_tier_new");
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" TYPE "subscription_tier_new"[] USING ("allowed_tiers"::text::"subscription_tier_new"[]);
ALTER TABLE "coupon" ALTER COLUMN "tier_eligibility" TYPE "subscription_tier_new"[] USING ("tier_eligibility"::text::"subscription_tier_new"[]);
ALTER TABLE "coupon_campaign" ALTER COLUMN "target_tier" TYPE "subscription_tier_new" USING ("target_tier"::text::"subscription_tier_new");
ALTER TABLE "pricing_configuration" ALTER COLUMN "tier" TYPE "subscription_tier_new" USING ("tier"::text::"subscription_tier_new");
ALTER TYPE "subscription_tier" RENAME TO "subscription_tier_old";
ALTER TYPE "subscription_tier_new" RENAME TO "subscription_tier";
DROP TYPE "subscription_tier_old";
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" SET DEFAULT ARRAY['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max']::"subscription_tier"[];
ALTER TABLE "models" ALTER COLUMN "required_tier" SET DEFAULT 'free';
COMMIT;

-- DropForeignKey
ALTER TABLE "credit_deduction_ledger" DROP CONSTRAINT "credit_deduction_ledger_request_id_fkey";

-- DropForeignKey
ALTER TABLE "credit_deduction_ledger" DROP CONSTRAINT "credit_deduction_ledger_reversed_by_fkey";

-- DropForeignKey
ALTER TABLE "model_provider_pricing" DROP CONSTRAINT "model_provider_pricing_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_configs" DROP CONSTRAINT "pricing_configs_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "pricing_configs" DROP CONSTRAINT "pricing_configs_created_by_fkey";

-- DropForeignKey
ALTER TABLE "pricing_configs" DROP CONSTRAINT "pricing_configs_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_deduction_record_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "user_credit_source" DROP CONSTRAINT "user_credit_source_user_id_fkey";

-- DropIndex
DROP INDEX "credit_deduction_ledger_reason_idx";

-- DropIndex
DROP INDEX "credit_deduction_ledger_request_id_idx";

-- DropIndex
DROP INDEX "credit_deduction_ledger_request_id_key";

-- DropIndex
DROP INDEX "credit_deduction_ledger_status_idx";

-- DropIndex
DROP INDEX "credit_deduction_ledger_user_id_created_at_idx";

-- DropIndex
DROP INDEX "credit_usage_daily_summary_user_id_summary_date_idx";

-- DropIndex
DROP INDEX "credit_usage_daily_summary_user_id_summary_date_key";

-- DropIndex
DROP INDEX "model_provider_pricing_effective_from_effective_until_idx";

-- DropIndex
DROP INDEX "model_provider_pricing_is_active_idx";

-- DropIndex
DROP INDEX "model_provider_pricing_provider_id_model_name_effective_from_ke";

-- DropIndex
DROP INDEX "model_provider_pricing_provider_id_model_name_is_active_idx";

-- DropIndex
DROP INDEX "model_provider_pricing_vendor_model_id_key";

-- DropIndex
DROP INDEX "oauth_clients_updated_at_idx";

-- DropIndex
DROP INDEX "token_usage_daily_summary_summary_date_idx";

-- DropIndex
DROP INDEX "token_usage_daily_summary_user_id_summary_date_idx";

-- DropIndex
DROP INDEX "token_usage_daily_summary_user_id_summary_date_key";

-- DropIndex
DROP INDEX "token_usage_ledger_model_id_created_at_idx";

-- DropIndex
DROP INDEX "token_usage_ledger_provider_id_created_at_idx";

-- DropIndex
DROP INDEX "token_usage_ledger_request_id_idx";

-- DropIndex
DROP INDEX "token_usage_ledger_request_id_key";

-- DropIndex
DROP INDEX "token_usage_ledger_status_idx";

-- DropIndex
DROP INDEX "token_usage_ledger_user_id_created_at_idx";

-- DropIndex
DROP INDEX "token_usage_ledger_user_id_vendor_cost_idx";

-- AlterTable
ALTER TABLE "credit_deduction_ledger" DROP COLUMN "balance_after",
DROP COLUMN "balance_before",
DROP COLUMN "created_at",
DROP COLUMN "gross_margin",
DROP COLUMN "margin_multiplier",
DROP COLUMN "processed_at",
DROP COLUMN "reason",
DROP COLUMN "request_id",
DROP COLUMN "reversal_reason",
DROP COLUMN "reversed_at",
DROP COLUMN "reversed_by",
DROP COLUMN "status",
DROP COLUMN "token_vendor_cost",
ADD COLUMN     "deduction_type" "deduction_type" NOT NULL,
ADD COLUMN     "related_usage_id" UUID,
ADD COLUMN     "subscription_id" UUID,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "credit_usage_daily_summary" DROP COLUMN "summary_date",
DROP COLUMN "total_deductions",
DROP COLUMN "total_gross_margin",
DROP COLUMN "total_requests",
DROP COLUMN "total_vendor_cost",
ADD COLUMN     "credits_allocated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "credits_balance_eod" INTEGER NOT NULL,
ADD COLUMN     "credits_deducted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "date" DATE NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "model_provider_pricing" DROP COLUMN "cache_hit_price_per_1k",
DROP COLUMN "cache_input_price_per_1k",
DROP COLUMN "description",
DROP COLUMN "detected_at",
DROP COLUMN "effective_from",
DROP COLUMN "effective_until",
DROP COLUMN "input_price_per_1k",
DROP COLUMN "is_active",
DROP COLUMN "last_verified",
DROP COLUMN "output_price_per_1k",
DROP COLUMN "previous_price_input",
DROP COLUMN "previous_price_output",
DROP COLUMN "price_change_percent_input",
DROP COLUMN "price_change_percent_output",
DROP COLUMN "vendor_model_id",
DROP COLUMN "verification_frequency_days",
ADD COLUMN     "effective_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "input_token_price_per_million" DECIMAL(10,6) NOT NULL,
ADD COLUMN     "is_current" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "output_token_price_per_million" DECIMAL(10,6) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "model_name" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "model_tier_audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" SET DEFAULT ARRAY['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max']::"subscription_tier"[];

-- AlterTable
ALTER TABLE "oauth_clients" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "token_usage_daily_summary" DROP COLUMN "avg_request_latency_ms",
DROP COLUMN "success_rate",
DROP COLUMN "summary_date",
DROP COLUMN "total_credits_deducted",
DROP COLUMN "total_gross_margin",
DROP COLUMN "total_requests",
DROP COLUMN "total_vendor_cost",
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "model_name" VARCHAR(200) NOT NULL,
ADD COLUMN     "total_cost_usd" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "total_credits" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "total_input_tokens" DROP DEFAULT,
ALTER COLUMN "total_output_tokens" DROP DEFAULT;

-- AlterTable
ALTER TABLE "token_usage_ledger" DROP COLUMN "cached_input_tokens",
DROP COLUMN "created_at",
DROP COLUMN "credit_value_usd",
DROP COLUMN "deduction_record_id",
DROP COLUMN "error_message",
DROP COLUMN "gross_margin_usd",
DROP COLUMN "is_streaming_complete",
DROP COLUMN "margin_multiplier",
DROP COLUMN "model_id",
DROP COLUMN "processing_time_ms",
DROP COLUMN "provider_id",
DROP COLUMN "region",
DROP COLUMN "request_completed_at",
DROP COLUMN "request_started_at",
DROP COLUMN "request_type",
DROP COLUMN "status",
DROP COLUMN "streaming_segments",
DROP COLUMN "total_tokens",
DROP COLUMN "user_tier_at_request",
DROP COLUMN "vendor_cost",
ADD COLUMN     "model_pricing_id" UUID NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "total_cost_usd" DECIMAL(10,6) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "request_id" DROP NOT NULL,
ALTER COLUMN "request_id" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "user_credit_balance" DROP COLUMN "last_deduction_amount",
DROP COLUMN "last_deduction_at",
ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "pricing_configs";

-- DropTable
DROP TABLE "providers";

-- DropTable
DROP TABLE "user_credit_source";

-- DropEnum
DROP TYPE "credit_deduction_reason";

-- DropEnum
DROP TYPE "credit_deduction_status";

-- DropEnum
DROP TYPE "credit_source_type";

-- DropEnum
DROP TYPE "pricing_config_approval_status";

-- DropEnum
DROP TYPE "pricing_config_reason";

-- DropEnum
DROP TYPE "pricing_config_scope_type";

-- DropEnum
DROP TYPE "request_status";

-- DropEnum
DROP TYPE "request_type";

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "webhook_url" VARCHAR(2048) NOT NULL,
    "webhook_secret" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" UUID NOT NULL,
    "webhook_config_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_monetization" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" VARCHAR(50) NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "base_price_usd" DECIMAL(10,2) NOT NULL,
    "monthly_credit_allocation" INTEGER NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_monetization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tier_config" (
    "id" UUID NOT NULL,
    "tier_name" VARCHAR(50) NOT NULL,
    "monthly_price_usd" DECIMAL(10,2) NOT NULL,
    "annual_price_usd" DECIMAL(10,2) NOT NULL,
    "monthly_credit_allocation" INTEGER NOT NULL,
    "max_credit_rollover" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tier_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_allocation" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount" INTEGER NOT NULL,
    "allocation_period_start" TIMESTAMP(3) NOT NULL,
    "allocation_period_end" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoice" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "stripe_invoice_id" VARCHAR(255) NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(20) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "invoice_pdf" TEXT,
    "hosted_invoice_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "billing_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transaction" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invoice_id" UUID,
    "subscription_id" UUID,
    "stripe_payment_intent_id" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(20) NOT NULL,
    "payment_method_type" VARCHAR(50),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunning_attempt" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "subscription_id" UUID,
    "attempt_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "attempted_at" TIMESTAMP(3),
    "result" VARCHAR(20),
    "failure_reason" TEXT,
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perpetual_license" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "license_key" VARCHAR(50) NOT NULL,
    "purchase_price_usd" DECIMAL(10,2) NOT NULL,
    "purchased_version" VARCHAR(50) NOT NULL,
    "eligible_until_version" VARCHAR(50) NOT NULL,
    "max_activations" INTEGER NOT NULL DEFAULT 3,
    "current_activations" INTEGER NOT NULL DEFAULT 0,
    "status" "license_status" NOT NULL DEFAULT 'pending',
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perpetual_license_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_activation" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "machine_fingerprint" VARCHAR(64) NOT NULL,
    "device_name" VARCHAR(255),
    "os_type" VARCHAR(50),
    "os_version" VARCHAR(100),
    "cpu_info" VARCHAR(255),
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "deactivated_at" TIMESTAMP(3),
    "status" "activation_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_upgrade" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "from_version" VARCHAR(50) NOT NULL,
    "to_version" VARCHAR(50) NOT NULL,
    "upgrade_price_usd" DECIMAL(10,2) NOT NULL,
    "stripe_payment_intent_id" VARCHAR(255),
    "status" "upgrade_status" NOT NULL DEFAULT 'pending',
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "version_upgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proration_event" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "from_tier" VARCHAR(50),
    "to_tier" VARCHAR(50),
    "changeType" "proration_change_type" NOT NULL,
    "days_remaining" INTEGER NOT NULL,
    "days_in_cycle" INTEGER NOT NULL,
    "unused_credit_value_usd" DECIMAL(10,2) NOT NULL,
    "new_tier_prorated_cost_usd" DECIMAL(10,2) NOT NULL,
    "net_charge_usd" DECIMAL(10,2) NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "stripe_invoice_id" VARCHAR(255),
    "status" "proration_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proration_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "coupon_type" "coupon_type" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "discount_type" "discount_type" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "min_purchase_amount" DECIMAL(10,2),
    "tier_eligibility" "subscription_tier"[] DEFAULT ARRAY['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max']::"subscription_tier"[],
    "billing_cycles" TEXT[] DEFAULT ARRAY['monthly', 'annual']::TEXT[],
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "campaign_id" UUID,
    "description" TEXT,
    "internal_notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_campaign" (
    "id" UUID NOT NULL,
    "campaign_name" VARCHAR(255) NOT NULL,
    "campaign_type" "campaign_type" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "budget_limit_usd" DECIMAL(12,2) NOT NULL,
    "total_spent_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_tier" "subscription_tier",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_coupon" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemption" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "redemption_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount_applied_usd" DECIMAL(10,2) NOT NULL,
    "original_amount_usd" DECIMAL(10,2) NOT NULL,
    "final_amount_usd" DECIMAL(10,2) NOT NULL,
    "redemption_status" "redemption_status" NOT NULL,
    "failure_reason" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usage_limit" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "total_uses" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "total_discount_applied_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_usage_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_fraud_detection" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "detection_type" "fraud_detection_type" NOT NULL,
    "severity" "fraud_severity" NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSON NOT NULL,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_fraud_detection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_validation_rule" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "rule_type" "validation_rule_type" NOT NULL,
    "rule_value" JSON NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_validation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_analytics_snapshot" (
    "id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "total_coupons_active" INTEGER NOT NULL,
    "total_redemptions" INTEGER NOT NULL,
    "total_discount_value_usd" DECIMAL(12,2) NOT NULL,
    "avg_discount_per_redemption_usd" DECIMAL(10,2) NOT NULL,
    "top_coupon_code" VARCHAR(50),
    "conversion_rate" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_analytics_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider" (
    "id" UUID NOT NULL,
    "vendor_name" "vendor_name" NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "api_endpoint" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_configuration" (
    "id" UUID NOT NULL,
    "tier" "subscription_tier" NOT NULL,
    "margin_strategy" "margin_strategy" NOT NULL,
    "margin_percentage" DECIMAL(5,2) NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "margin_audit_log" (
    "id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "old_margin" DECIMAL(5,2),
    "new_margin" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "margin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_configs_user_id_idx" ON "webhook_configs"("user_id");

-- CreateIndex
CREATE INDEX "webhook_configs_is_active_idx" ON "webhook_configs"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_configs_user_id_key" ON "webhook_configs"("user_id");

-- CreateIndex
CREATE INDEX "webhook_logs_webhook_config_id_idx" ON "webhook_logs"("webhook_config_id");

-- CreateIndex
CREATE INDEX "webhook_logs_event_type_idx" ON "webhook_logs"("event_type");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_monetization_stripe_customer_id_key" ON "subscription_monetization"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_monetization_stripe_subscription_id_key" ON "subscription_monetization"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_monetization_user_id_idx" ON "subscription_monetization"("user_id");

-- CreateIndex
CREATE INDEX "subscription_monetization_status_idx" ON "subscription_monetization"("status");

-- CreateIndex
CREATE INDEX "subscription_monetization_tier_idx" ON "subscription_monetization"("tier");

-- CreateIndex
CREATE INDEX "subscription_monetization_current_period_end_idx" ON "subscription_monetization"("current_period_end");

-- CreateIndex
CREATE INDEX "subscription_monetization_stripe_customer_id_idx" ON "subscription_monetization"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "subscription_monetization_stripe_subscription_id_idx" ON "subscription_monetization"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tier_config_tier_name_key" ON "subscription_tier_config"("tier_name");

-- CreateIndex
CREATE INDEX "credit_allocation_user_id_idx" ON "credit_allocation"("user_id");

-- CreateIndex
CREATE INDEX "credit_allocation_subscription_id_idx" ON "credit_allocation"("subscription_id");

-- CreateIndex
CREATE INDEX "credit_allocation_allocation_period_start_allocation_period_idx" ON "credit_allocation"("allocation_period_start", "allocation_period_end");

-- CreateIndex
CREATE INDEX "credit_allocation_source_idx" ON "credit_allocation"("source");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_stripe_invoice_id_key" ON "billing_invoice"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "billing_invoice_user_id_idx" ON "billing_invoice"("user_id");

-- CreateIndex
CREATE INDEX "billing_invoice_subscription_id_idx" ON "billing_invoice"("subscription_id");

-- CreateIndex
CREATE INDEX "billing_invoice_stripe_invoice_id_idx" ON "billing_invoice"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "billing_invoice_status_idx" ON "billing_invoice"("status");

-- CreateIndex
CREATE INDEX "billing_invoice_period_start_period_end_idx" ON "billing_invoice"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transaction_stripe_payment_intent_id_key" ON "payment_transaction"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_transaction_user_id_idx" ON "payment_transaction"("user_id");

-- CreateIndex
CREATE INDEX "payment_transaction_invoice_id_idx" ON "payment_transaction"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_transaction_subscription_id_idx" ON "payment_transaction"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_transaction_stripe_payment_intent_id_idx" ON "payment_transaction"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_transaction_status_idx" ON "payment_transaction"("status");

-- CreateIndex
CREATE INDEX "payment_transaction_created_at_idx" ON "payment_transaction"("created_at");

-- CreateIndex
CREATE INDEX "dunning_attempt_user_id_idx" ON "dunning_attempt"("user_id");

-- CreateIndex
CREATE INDEX "dunning_attempt_invoice_id_idx" ON "dunning_attempt"("invoice_id");

-- CreateIndex
CREATE INDEX "dunning_attempt_subscription_id_idx" ON "dunning_attempt"("subscription_id");

-- CreateIndex
CREATE INDEX "dunning_attempt_scheduled_at_idx" ON "dunning_attempt"("scheduled_at");

-- CreateIndex
CREATE INDEX "dunning_attempt_result_idx" ON "dunning_attempt"("result");

-- CreateIndex
CREATE UNIQUE INDEX "perpetual_license_license_key_key" ON "perpetual_license"("license_key");

-- CreateIndex
CREATE INDEX "perpetual_license_user_id_idx" ON "perpetual_license"("user_id");

-- CreateIndex
CREATE INDEX "perpetual_license_status_idx" ON "perpetual_license"("status");

-- CreateIndex
CREATE INDEX "perpetual_license_license_key_idx" ON "perpetual_license"("license_key");

-- CreateIndex
CREATE INDEX "perpetual_license_purchased_at_idx" ON "perpetual_license"("purchased_at");

-- CreateIndex
CREATE INDEX "license_activation_license_id_idx" ON "license_activation"("license_id");

-- CreateIndex
CREATE INDEX "license_activation_user_id_idx" ON "license_activation"("user_id");

-- CreateIndex
CREATE INDEX "license_activation_machine_fingerprint_idx" ON "license_activation"("machine_fingerprint");

-- CreateIndex
CREATE INDEX "license_activation_status_idx" ON "license_activation"("status");

-- CreateIndex
CREATE INDEX "license_activation_activated_at_idx" ON "license_activation"("activated_at");

-- CreateIndex
CREATE UNIQUE INDEX "license_activation_license_id_machine_fingerprint_key" ON "license_activation"("license_id", "machine_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "version_upgrade_stripe_payment_intent_id_key" ON "version_upgrade"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "version_upgrade_license_id_idx" ON "version_upgrade"("license_id");

-- CreateIndex
CREATE INDEX "version_upgrade_user_id_idx" ON "version_upgrade"("user_id");

-- CreateIndex
CREATE INDEX "version_upgrade_from_version_to_version_idx" ON "version_upgrade"("from_version", "to_version");

-- CreateIndex
CREATE INDEX "version_upgrade_status_idx" ON "version_upgrade"("status");

-- CreateIndex
CREATE INDEX "version_upgrade_purchased_at_idx" ON "version_upgrade"("purchased_at");

-- CreateIndex
CREATE UNIQUE INDEX "proration_event_stripe_invoice_id_key" ON "proration_event"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "proration_event_user_id_idx" ON "proration_event"("user_id");

-- CreateIndex
CREATE INDEX "proration_event_subscription_id_idx" ON "proration_event"("subscription_id");

-- CreateIndex
CREATE INDEX "proration_event_changeType_idx" ON "proration_event"("changeType");

-- CreateIndex
CREATE INDEX "proration_event_effective_date_idx" ON "proration_event"("effective_date");

-- CreateIndex
CREATE INDEX "proration_event_status_idx" ON "proration_event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

-- CreateIndex
CREATE INDEX "coupon_code_is_active_idx" ON "coupon"("code", "is_active");

-- CreateIndex
CREATE INDEX "coupon_valid_from_valid_until_is_active_idx" ON "coupon"("valid_from", "valid_until", "is_active");

-- CreateIndex
CREATE INDEX "coupon_campaign_id_idx" ON "coupon"("campaign_id");

-- CreateIndex
CREATE INDEX "coupon_coupon_type_idx" ON "coupon"("coupon_type");

-- CreateIndex
CREATE INDEX "coupon_campaign_campaign_type_is_active_idx" ON "coupon_campaign"("campaign_type", "is_active");

-- CreateIndex
CREATE INDEX "coupon_campaign_start_date_end_date_idx" ON "coupon_campaign"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "coupon_campaign_target_tier_idx" ON "coupon_campaign"("target_tier");

-- CreateIndex
CREATE INDEX "campaign_coupon_campaign_id_idx" ON "campaign_coupon"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_coupon_coupon_id_idx" ON "campaign_coupon"("coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_coupon_campaign_id_coupon_id_key" ON "campaign_coupon"("campaign_id", "coupon_id");

-- CreateIndex
CREATE INDEX "coupon_redemption_coupon_id_user_id_redemption_date_idx" ON "coupon_redemption"("coupon_id", "user_id", "redemption_date");

-- CreateIndex
CREATE INDEX "coupon_redemption_user_id_idx" ON "coupon_redemption"("user_id");

-- CreateIndex
CREATE INDEX "coupon_redemption_subscription_id_idx" ON "coupon_redemption"("subscription_id");

-- CreateIndex
CREATE INDEX "coupon_redemption_redemption_status_idx" ON "coupon_redemption"("redemption_status");

-- CreateIndex
CREATE INDEX "coupon_redemption_redemption_date_idx" ON "coupon_redemption"("redemption_date");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usage_limit_coupon_id_key" ON "coupon_usage_limit"("coupon_id");

-- CreateIndex
CREATE INDEX "coupon_usage_limit_total_uses_idx" ON "coupon_usage_limit"("total_uses");

-- CreateIndex
CREATE INDEX "coupon_usage_limit_last_used_at_idx" ON "coupon_usage_limit"("last_used_at");

-- CreateIndex
CREATE INDEX "coupon_fraud_detection_coupon_id_severity_is_flagged_idx" ON "coupon_fraud_detection"("coupon_id", "severity", "is_flagged");

-- CreateIndex
CREATE INDEX "coupon_fraud_detection_user_id_idx" ON "coupon_fraud_detection"("user_id");

-- CreateIndex
CREATE INDEX "coupon_fraud_detection_detection_type_idx" ON "coupon_fraud_detection"("detection_type");

-- CreateIndex
CREATE INDEX "coupon_fraud_detection_detected_at_idx" ON "coupon_fraud_detection"("detected_at");

-- CreateIndex
CREATE INDEX "coupon_validation_rule_coupon_id_rule_type_is_active_idx" ON "coupon_validation_rule"("coupon_id", "rule_type", "is_active");

-- CreateIndex
CREATE INDEX "coupon_analytics_snapshot_snapshot_date_idx" ON "coupon_analytics_snapshot"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_analytics_snapshot_snapshot_date_key" ON "coupon_analytics_snapshot"("snapshot_date");

-- CreateIndex
CREATE INDEX "provider_vendor_name_is_active_idx" ON "provider"("vendor_name", "is_active");

-- CreateIndex
CREATE INDEX "pricing_configuration_tier_is_active_idx" ON "pricing_configuration"("tier", "is_active");

-- CreateIndex
CREATE INDEX "margin_audit_log_config_id_timestamp_idx" ON "margin_audit_log"("config_id", "timestamp");

-- CreateIndex
CREATE INDEX "margin_audit_log_timestamp_idx" ON "margin_audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_user_id_timestamp_idx" ON "credit_deduction_ledger"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_subscription_id_timestamp_idx" ON "credit_deduction_ledger"("subscription_id", "timestamp");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_timestamp_idx" ON "credit_deduction_ledger"("timestamp");

-- CreateIndex
CREATE INDEX "credit_usage_daily_summary_user_id_date_idx" ON "credit_usage_daily_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "credit_usage_daily_summary_date_idx" ON "credit_usage_daily_summary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "credit_usage_daily_summary_user_id_date_key" ON "credit_usage_daily_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "model_provider_pricing_provider_id_model_name_is_current_idx" ON "model_provider_pricing"("provider_id", "model_name", "is_current");

-- CreateIndex
CREATE INDEX "model_provider_pricing_model_name_is_current_idx" ON "model_provider_pricing"("model_name", "is_current");

-- CreateIndex
CREATE INDEX "token_usage_daily_summary_user_id_date_idx" ON "token_usage_daily_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "token_usage_daily_summary_date_idx" ON "token_usage_daily_summary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "token_usage_daily_summary_user_id_date_model_name_key" ON "token_usage_daily_summary"("user_id", "date", "model_name");

-- CreateIndex
CREATE INDEX "token_usage_ledger_user_id_timestamp_idx" ON "token_usage_ledger"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "token_usage_ledger_subscription_id_timestamp_idx" ON "token_usage_ledger"("subscription_id", "timestamp");

-- CreateIndex
CREATE INDEX "token_usage_ledger_model_pricing_id_timestamp_idx" ON "token_usage_ledger"("model_pricing_id", "timestamp");

-- CreateIndex
CREATE INDEX "token_usage_ledger_timestamp_idx" ON "token_usage_ledger"("timestamp");

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_config_id_fkey" FOREIGN KEY ("webhook_config_id") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_monetization" ADD CONSTRAINT "subscription_monetization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_allocation" ADD CONSTRAINT "credit_allocation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_allocation" ADD CONSTRAINT "credit_allocation_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempt" ADD CONSTRAINT "dunning_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempt" ADD CONSTRAINT "dunning_attempt_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempt" ADD CONSTRAINT "dunning_attempt_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perpetual_license" ADD CONSTRAINT "perpetual_license_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_activation" ADD CONSTRAINT "license_activation_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "perpetual_license"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_activation" ADD CONSTRAINT "license_activation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_upgrade" ADD CONSTRAINT "version_upgrade_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "perpetual_license"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_upgrade" ADD CONSTRAINT "version_upgrade_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proration_event" ADD CONSTRAINT "proration_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proration_event" ADD CONSTRAINT "proration_event_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "coupon_campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_coupon" ADD CONSTRAINT "campaign_coupon_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "coupon_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_coupon" ADD CONSTRAINT "campaign_coupon_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usage_limit" ADD CONSTRAINT "coupon_usage_limit_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_fraud_detection" ADD CONSTRAINT "coupon_fraud_detection_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_validation_rule" ADD CONSTRAINT "coupon_validation_rule_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_analytics_snapshot" ADD CONSTRAINT "coupon_analytics_snapshot_top_coupon_code_fkey" FOREIGN KEY ("top_coupon_code") REFERENCES "coupon"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_provider_pricing" ADD CONSTRAINT "model_provider_pricing_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_ledger" ADD CONSTRAINT "token_usage_ledger_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_ledger" ADD CONSTRAINT "token_usage_ledger_model_pricing_id_fkey" FOREIGN KEY ("model_pricing_id") REFERENCES "model_provider_pricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_deduction_ledger" ADD CONSTRAINT "credit_deduction_ledger_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "margin_audit_log" ADD CONSTRAINT "margin_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

