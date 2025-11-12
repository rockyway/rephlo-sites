/*
  Warnings:

  - You are about to alter the column `display_name` on the `permission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(150)`.
  - You are about to alter the column `hierarchy` on the `role` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - Made the column `coupon_type` on table `coupon` required. This step will fail if there are existing NULL values in that column.
  - Made the column `change_type` on table `proration_event` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "vendor_name" AS ENUM ('openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere');

-- CreateEnum
CREATE TYPE "margin_strategy" AS ENUM ('fixed_percentage', 'tiered', 'dynamic');

-- CreateEnum
CREATE TYPE "deduction_type" AS ENUM ('inference', 'embedding', 'fine_tuning', 'custom');

-- CreateEnum
CREATE TYPE "pricing_config_scope_type" AS ENUM ('tier', 'provider', 'model', 'combination');

-- CreateEnum
CREATE TYPE "pricing_config_reason" AS ENUM ('initial_setup', 'vendor_price_change', 'tier_optimization', 'margin_protection', 'manual_adjustment');

-- CreateEnum
CREATE TYPE "pricing_config_approval_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "request_type" AS ENUM ('completion', 'streaming', 'batch');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('success', 'failed', 'cancelled', 'rate_limited');

-- CreateEnum
CREATE TYPE "credit_deduction_reason" AS ENUM ('api_completion', 'subscription_allocation', 'manual_adjustment', 'refund', 'overage', 'bonus', 'referral', 'coupon');

-- CreateEnum
CREATE TYPE "credit_deduction_status" AS ENUM ('pending', 'completed', 'reversed');

-- CreateEnum
CREATE TYPE "credit_source_type" AS ENUM ('monthly_allocation', 'referral_reward', 'coupon_promotion', 'bonus', 'refund', 'admin_grant');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "subscription_status" ADD VALUE 'trial';
ALTER TYPE "subscription_status" ADD VALUE 'past_due';
ALTER TYPE "subscription_status" ADD VALUE 'grace_period';

-- DropIndex
DROP INDEX "idx_oidc_models_uid";

-- DropIndex
DROP INDEX "permission_name_category_idx";

-- DropIndex
DROP INDEX "permission_override_granted_by_idx";

-- DropIndex
DROP INDEX "permission_override_permission_idx";

-- DropIndex
DROP INDEX "permission_override_user_id_is_active_idx";

-- DropIndex
DROP INDEX "role_change_log_target_user_id_idx";

-- DropIndex
DROP INDEX "user_role_assignment_assigned_by_idx";

-- DropIndex
DROP INDEX "user_role_assignment_user_id_is_active_idx";

-- AlterTable
ALTER TABLE "admin_audit_log" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "campaign_coupon" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "coupon" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "tier_eligibility" SET DEFAULT ARRAY['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max']::"subscription_tier"[],
ALTER COLUMN "coupon_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "coupon_analytics_snapshot" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "coupon_campaign" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "coupon_fraud_detection" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "details" SET DATA TYPE JSON;

-- AlterTable
ALTER TABLE "coupon_redemption" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "coupon_usage_limit" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "coupon_validation_rule" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "rule_value" SET DATA TYPE JSON;

-- AlterTable
ALTER TABLE "models" ALTER COLUMN "allowed_tiers" SET DEFAULT ARRAY['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max']::"subscription_tier"[];

-- AlterTable
ALTER TABLE "permission" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "display_name" SET DATA TYPE VARCHAR(150);

-- AlterTable
ALTER TABLE "permission_override" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "granted_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "proration_event" ALTER COLUMN "change_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "role" ALTER COLUMN "hierarchy" SET DATA TYPE SMALLINT,
ALTER COLUMN "default_permissions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "role_change_log" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "permission_override" SET DATA TYPE TEXT,
ALTER COLUMN "old_permissions" DROP DEFAULT,
ALTER COLUMN "new_permissions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_role_assignment" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "assigned_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "mfa_method" DROP NOT NULL,
ALTER COLUMN "mfa_method" DROP DEFAULT;

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "api_type" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope_type" "pricing_config_scope_type" NOT NULL,
    "subscription_tier" "subscription_tier",
    "provider_id" UUID,
    "model_id" VARCHAR(255),
    "margin_multiplier" DECIMAL(4,2) NOT NULL,
    "target_gross_margin_percent" DECIMAL(5,2),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "reason" "pricing_config_reason" NOT NULL,
    "reason_details" TEXT,
    "previous_multiplier" DECIMAL(4,2),
    "change_percent" DECIMAL(5,2),
    "expected_margin_change_dollars" DECIMAL(12,2),
    "expected_revenue_impact" DECIMAL(12,2),
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "approval_status" "pricing_config_approval_status" NOT NULL DEFAULT 'pending',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "monitored" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_provider_pricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,
    "vendor_model_id" VARCHAR(255),
    "input_price_per_1k" DECIMAL(10,8) NOT NULL,
    "output_price_per_1k" DECIMAL(10,8) NOT NULL,
    "cache_input_price_per_1k" DECIMAL(10,8),
    "cache_hit_price_per_1k" DECIMAL(10,8),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "previous_price_input" DECIMAL(10,8),
    "previous_price_output" DECIMAL(10,8),
    "price_change_percent_input" DECIMAL(5,2),
    "price_change_percent_output" DECIMAL(5,2),
    "detected_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "last_verified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verification_frequency_days" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_provider_pricing_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "token_usage_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "model_id" VARCHAR(255) NOT NULL,
    "provider_id" UUID NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "vendor_cost" DECIMAL(10,8) NOT NULL,
    "margin_multiplier" DECIMAL(4,2) NOT NULL,
    "credit_value_usd" DECIMAL(10,8) NOT NULL,
    "credits_deducted" INTEGER NOT NULL,
    "request_type" "request_type" NOT NULL,
    "streaming_segments" INTEGER,
    "request_started_at" TIMESTAMP(3) NOT NULL,
    "request_completed_at" TIMESTAMP(3) NOT NULL,
    "processing_time_ms" INTEGER,
    "status" "request_status" NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "is_streaming_complete" BOOLEAN NOT NULL DEFAULT true,
    "user_tier_at_request" VARCHAR(50),
    "region" VARCHAR(50),
    "deduction_record_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credit_balance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "last_deduction_at" TIMESTAMP(3),
    "last_deduction_amount" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_credit_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_deduction_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "request_id" UUID,
    "token_vendor_cost" DECIMAL(10,8),
    "margin_multiplier" DECIMAL(4,2),
    "gross_margin" DECIMAL(10,8),
    "reason" "credit_deduction_reason" NOT NULL,
    "status" "credit_deduction_status" NOT NULL DEFAULT 'pending',
    "reversed_at" TIMESTAMP(3),
    "reversed_by" UUID,
    "reversal_reason" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_deduction_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_usage_daily_summary" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "model_name" VARCHAR(200) NOT NULL,
    "total_input_tokens" INTEGER NOT NULL,
    "total_output_tokens" INTEGER NOT NULL,
    "total_cost_usd" DECIMAL(10,2) NOT NULL,
    "total_credits" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_daily_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_usage_daily_summary" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "credits_allocated" INTEGER NOT NULL DEFAULT 0,
    "credits_deducted" INTEGER NOT NULL DEFAULT 0,
    "credits_balance_eod" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_usage_daily_summary_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "providers_name_key" ON "providers"("name");

-- CreateIndex
CREATE INDEX "providers_is_enabled_idx" ON "providers"("is_enabled");

-- CreateIndex
CREATE INDEX "pricing_configs_scope_type_idx" ON "pricing_configs"("scope_type");

-- CreateIndex
CREATE INDEX "pricing_configs_subscription_tier_is_active_idx" ON "pricing_configs"("subscription_tier", "is_active");

-- CreateIndex
CREATE INDEX "pricing_configs_provider_id_is_active_idx" ON "pricing_configs"("provider_id", "is_active");

-- CreateIndex
CREATE INDEX "pricing_configs_is_active_effective_from_idx" ON "pricing_configs"("is_active", "effective_from");

-- CreateIndex
CREATE INDEX "pricing_configs_approval_status_idx" ON "pricing_configs"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "model_provider_pricing_vendor_model_id_key" ON "model_provider_pricing"("vendor_model_id");

-- CreateIndex
CREATE INDEX "model_provider_pricing_provider_id_model_name_is_active_idx" ON "model_provider_pricing"("provider_id", "model_name", "is_active");

-- CreateIndex
CREATE INDEX "model_provider_pricing_effective_from_effective_until_idx" ON "model_provider_pricing"("effective_from", "effective_until");

-- CreateIndex
CREATE INDEX "model_provider_pricing_is_active_idx" ON "model_provider_pricing"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "model_provider_pricing_provider_id_model_name_effective_fro_key" ON "model_provider_pricing"("provider_id", "model_name", "effective_from");

-- CreateIndex
CREATE INDEX "pricing_configuration_tier_is_active_idx" ON "pricing_configuration"("tier", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "token_usage_ledger_request_id_key" ON "token_usage_ledger"("request_id");

-- CreateIndex
CREATE INDEX "token_usage_ledger_user_id_created_at_idx" ON "token_usage_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "token_usage_ledger_model_id_created_at_idx" ON "token_usage_ledger"("model_id", "created_at");

-- CreateIndex
CREATE INDEX "token_usage_ledger_provider_id_created_at_idx" ON "token_usage_ledger"("provider_id", "created_at");

-- CreateIndex
CREATE INDEX "token_usage_ledger_user_id_vendor_cost_idx" ON "token_usage_ledger"("user_id", "vendor_cost");

-- CreateIndex
CREATE INDEX "token_usage_ledger_request_id_idx" ON "token_usage_ledger"("request_id");

-- CreateIndex
CREATE INDEX "token_usage_ledger_status_idx" ON "token_usage_ledger"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_credit_balance_user_id_key" ON "user_credit_balance"("user_id");

-- CreateIndex
CREATE INDEX "user_credit_balance_user_id_idx" ON "user_credit_balance"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_deduction_ledger_request_id_key" ON "credit_deduction_ledger"("request_id");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_user_id_created_at_idx" ON "credit_deduction_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_request_id_idx" ON "credit_deduction_ledger"("request_id");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_status_idx" ON "credit_deduction_ledger"("status");

-- CreateIndex
CREATE INDEX "credit_deduction_ledger_reason_idx" ON "credit_deduction_ledger"("reason");

-- CreateIndex
CREATE INDEX "token_usage_daily_summary_user_id_date_idx" ON "token_usage_daily_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "token_usage_daily_summary_date_idx" ON "token_usage_daily_summary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "token_usage_daily_summary_user_id_date_model_name_key" ON "token_usage_daily_summary"("user_id", "date", "model_name");

-- CreateIndex
CREATE INDEX "credit_usage_daily_summary_user_id_date_idx" ON "credit_usage_daily_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "credit_usage_daily_summary_date_idx" ON "credit_usage_daily_summary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "credit_usage_daily_summary_user_id_date_key" ON "credit_usage_daily_summary"("user_id", "date");

-- CreateIndex
CREATE INDEX "margin_audit_log_config_id_timestamp_idx" ON "margin_audit_log"("config_id", "timestamp");

-- CreateIndex
CREATE INDEX "margin_audit_log_timestamp_idx" ON "margin_audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "coupon_coupon_type_idx" ON "coupon"("coupon_type");

-- CreateIndex
CREATE INDEX "permission_override_is_active_idx" ON "permission_override"("is_active");

-- CreateIndex
CREATE INDEX "proration_event_change_type_idx" ON "proration_event"("change_type");

-- CreateIndex
CREATE INDEX "user_role_assignment_is_active_idx" ON "user_role_assignment"("is_active");

-- AddForeignKey
ALTER TABLE "pricing_configs" ADD CONSTRAINT "pricing_configs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_configs" ADD CONSTRAINT "pricing_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_configs" ADD CONSTRAINT "pricing_configs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_provider_pricing" ADD CONSTRAINT "model_provider_pricing_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_ledger" ADD CONSTRAINT "token_usage_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_ledger" ADD CONSTRAINT "token_usage_ledger_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_ledger" ADD CONSTRAINT "token_usage_ledger_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_ledger" ADD CONSTRAINT "token_usage_ledger_deduction_record_id_fkey" FOREIGN KEY ("deduction_record_id") REFERENCES "credit_deduction_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credit_balance" ADD CONSTRAINT "user_credit_balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_deduction_ledger" ADD CONSTRAINT "credit_deduction_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_deduction_ledger" ADD CONSTRAINT "credit_deduction_ledger_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_deduction_ledger" ADD CONSTRAINT "credit_deduction_ledger_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "token_usage_ledger"("request_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usage_daily_summary" ADD CONSTRAINT "token_usage_daily_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_usage_daily_summary" ADD CONSTRAINT "credit_usage_daily_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "margin_audit_log" ADD CONSTRAINT "margin_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_campaign_coupon" RENAME TO "campaign_coupon_campaign_id_coupon_id_key";

-- RenameIndex
ALTER INDEX "unique_license_machine" RENAME TO "license_activation_license_id_machine_fingerprint_key";

-- RenameIndex
ALTER INDEX "idx_oidc_models_expires_at" RENAME TO "oidc_models_expires_at_idx";

-- RenameIndex
ALTER INDEX "idx_oidc_models_grant_id" RENAME TO "oidc_models_grant_id_idx";

-- RenameIndex
ALTER INDEX "idx_oidc_models_kind" RENAME TO "oidc_models_kind_idx";

-- RenameIndex
ALTER INDEX "idx_oidc_models_user_code" RENAME TO "oidc_models_user_code_idx";
