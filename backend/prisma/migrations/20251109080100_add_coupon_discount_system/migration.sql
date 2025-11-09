-- CreateEnum for Coupon System
CREATE TYPE "coupon_type" AS ENUM ('percentage_discount', 'fixed_amount_discount', 'tier_specific_discount', 'duration_bonus', 'byok_migration');
CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed_amount', 'credits', 'months_free');
CREATE TYPE "campaign_type" AS ENUM ('seasonal', 'win_back', 'referral', 'promotional', 'early_bird');
CREATE TYPE "redemption_status" AS ENUM ('success', 'failed', 'reversed', 'pending');
CREATE TYPE "fraud_detection_type" AS ENUM ('velocity_abuse', 'ip_switching', 'bot_pattern', 'device_fingerprint_mismatch', 'stacking_abuse');
CREATE TYPE "fraud_severity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "validation_rule_type" AS ENUM ('first_time_user_only', 'specific_email_domain', 'minimum_credit_balance', 'exclude_refunded_users', 'require_payment_method');

-- CreateTable: coupon_campaign
-- Manages promotional campaigns that group related coupons
CREATE TABLE "coupon_campaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- CreateTable: coupon
-- Core coupon configuration with pricing, limits, and tier eligibility
CREATE TABLE "coupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "coupon_type" "coupon_type" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "discount_type" "discount_type" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "max_uses" INTEGER,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "min_purchase_amount" DECIMAL(10,2),
    "tier_eligibility" "subscription_tier"[] DEFAULT ARRAY['free', 'pro', 'enterprise']::"subscription_tier"[],
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

-- CreateTable: campaign_coupon
-- Junction table linking campaigns to coupons (many-to-many)
CREATE TABLE "campaign_coupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable: coupon_redemption
-- Immutable ledger of all coupon usage with fraud detection metadata
CREATE TABLE "coupon_redemption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- CreateTable: coupon_usage_limit
-- Tracks real-time usage counts per coupon for limit enforcement
CREATE TABLE "coupon_usage_limit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "total_uses" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "total_discount_applied_usd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_usage_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: coupon_fraud_detection
-- Logs fraud detection events for security monitoring
CREATE TABLE "coupon_fraud_detection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "detection_type" "fraud_detection_type" NOT NULL,
    "severity" "fraud_severity" NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_fraud_detection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: coupon_validation_rule
-- Custom validation rules per coupon for fine-grained eligibility control
CREATE TABLE "coupon_validation_rule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "rule_type" "validation_rule_type" NOT NULL,
    "rule_value" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_validation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: coupon_analytics_snapshot
-- Daily aggregated metrics for campaign performance tracking
CREATE TABLE "coupon_analytics_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");
CREATE UNIQUE INDEX "coupon_usage_limit_coupon_id_key" ON "coupon_usage_limit"("coupon_id");
CREATE UNIQUE INDEX "unique_campaign_coupon" ON "campaign_coupon"("campaign_id", "coupon_id");
CREATE UNIQUE INDEX "coupon_analytics_snapshot_snapshot_date_key" ON "coupon_analytics_snapshot"("snapshot_date");

-- CreateIndex: Performance indexes for coupon_campaign
CREATE INDEX "coupon_campaign_campaign_type_is_active_idx" ON "coupon_campaign"("campaign_type", "is_active");
CREATE INDEX "coupon_campaign_start_date_end_date_idx" ON "coupon_campaign"("start_date", "end_date");
CREATE INDEX "coupon_campaign_target_tier_idx" ON "coupon_campaign"("target_tier");

-- CreateIndex: Performance indexes for coupon
CREATE INDEX "coupon_code_is_active_idx" ON "coupon"("code", "is_active");
CREATE INDEX "coupon_valid_from_valid_until_is_active_idx" ON "coupon"("valid_from", "valid_until", "is_active");
CREATE INDEX "coupon_campaign_id_idx" ON "coupon"("campaign_id");
CREATE INDEX "coupon_coupon_type_idx" ON "coupon"("coupon_type");

-- CreateIndex: Performance indexes for campaign_coupon
CREATE INDEX "campaign_coupon_campaign_id_idx" ON "campaign_coupon"("campaign_id");
CREATE INDEX "campaign_coupon_coupon_id_idx" ON "campaign_coupon"("coupon_id");

-- CreateIndex: Performance indexes for coupon_redemption
CREATE INDEX "coupon_redemption_coupon_id_user_id_redemption_date_idx" ON "coupon_redemption"("coupon_id", "user_id", "redemption_date");
CREATE INDEX "coupon_redemption_user_id_idx" ON "coupon_redemption"("user_id");
CREATE INDEX "coupon_redemption_subscription_id_idx" ON "coupon_redemption"("subscription_id");
CREATE INDEX "coupon_redemption_redemption_status_idx" ON "coupon_redemption"("redemption_status");
CREATE INDEX "coupon_redemption_redemption_date_idx" ON "coupon_redemption"("redemption_date");

-- CreateIndex: Performance indexes for coupon_usage_limit
CREATE INDEX "coupon_usage_limit_total_uses_idx" ON "coupon_usage_limit"("total_uses");
CREATE INDEX "coupon_usage_limit_last_used_at_idx" ON "coupon_usage_limit"("last_used_at");

-- CreateIndex: Performance indexes for coupon_fraud_detection
CREATE INDEX "coupon_fraud_detection_coupon_id_severity_is_flagged_idx" ON "coupon_fraud_detection"("coupon_id", "severity", "is_flagged");
CREATE INDEX "coupon_fraud_detection_user_id_idx" ON "coupon_fraud_detection"("user_id");
CREATE INDEX "coupon_fraud_detection_detection_type_idx" ON "coupon_fraud_detection"("detection_type");
CREATE INDEX "coupon_fraud_detection_detected_at_idx" ON "coupon_fraud_detection"("detected_at");

-- CreateIndex: Performance indexes for coupon_validation_rule
CREATE INDEX "coupon_validation_rule_coupon_id_rule_type_is_active_idx" ON "coupon_validation_rule"("coupon_id", "rule_type", "is_active");

-- CreateIndex: Performance indexes for coupon_analytics_snapshot
CREATE INDEX "coupon_analytics_snapshot_snapshot_date_idx" ON "coupon_analytics_snapshot"("snapshot_date");

-- AddForeignKey: coupon -> coupon_campaign
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "coupon_campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: campaign_coupon -> coupon_campaign
ALTER TABLE "campaign_coupon" ADD CONSTRAINT "campaign_coupon_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "coupon_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: campaign_coupon -> coupon
ALTER TABLE "campaign_coupon" ADD CONSTRAINT "campaign_coupon_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: coupon_redemption -> coupon
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: coupon_redemption -> subscription_monetization
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: coupon_usage_limit -> coupon
ALTER TABLE "coupon_usage_limit" ADD CONSTRAINT "coupon_usage_limit_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: coupon_fraud_detection -> coupon
ALTER TABLE "coupon_fraud_detection" ADD CONSTRAINT "coupon_fraud_detection_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: coupon_validation_rule -> coupon
ALTER TABLE "coupon_validation_rule" ADD CONSTRAINT "coupon_validation_rule_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: coupon_analytics_snapshot -> coupon
ALTER TABLE "coupon_analytics_snapshot" ADD CONSTRAINT "coupon_analytics_snapshot_top_coupon_code_fkey" FOREIGN KEY ("top_coupon_code") REFERENCES "coupon"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "coupon_campaign" IS 'Manages promotional campaigns (Black Friday, referral programs, etc.) with budget tracking';
COMMENT ON TABLE "coupon" IS 'Core coupon configuration: codes, discounts, eligibility rules, and validity periods';
COMMENT ON TABLE "campaign_coupon" IS 'Junction table for many-to-many relationship between campaigns and coupons';
COMMENT ON TABLE "coupon_redemption" IS 'Immutable audit log of all coupon usage with fraud detection metadata';
COMMENT ON TABLE "coupon_usage_limit" IS 'Real-time counters for enforcing max_uses and max_uses_per_user limits';
COMMENT ON TABLE "coupon_fraud_detection" IS 'Fraud detection event log for velocity abuse, IP switching, and bot patterns';
COMMENT ON TABLE "coupon_validation_rule" IS 'Extensible validation rules (first-time users, email domains, credit balance, etc.)';
COMMENT ON TABLE "coupon_analytics_snapshot" IS 'Daily aggregated metrics for dashboard performance (generated via cron job)';
