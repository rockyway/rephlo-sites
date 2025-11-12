-- AlterTable: Add proration fields to coupon_redemption table
-- Gap Fix: Plan 111 (Coupon System) + Plan 110 (Proration) Integration
-- Reference: docs/troubleshooting/008-coupon-proration-integration-gaps.md

ALTER TABLE "coupon_redemption"
ADD COLUMN "is_proration_involved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "proration_amount" DECIMAL(10,2),
ADD COLUMN "user_tier_before" VARCHAR(50),
ADD COLUMN "user_tier_after" VARCHAR(50),
ADD COLUMN "billing_cycle_before" VARCHAR(50),
ADD COLUMN "billing_cycle_after" VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN "coupon_redemption"."is_proration_involved" IS 'Indicates if this redemption involved mid-cycle proration';
COMMENT ON COLUMN "coupon_redemption"."proration_amount" IS 'Coupon discount amount applied to prorated charge';
COMMENT ON COLUMN "coupon_redemption"."user_tier_before" IS 'User subscription tier before upgrade/downgrade';
COMMENT ON COLUMN "coupon_redemption"."user_tier_after" IS 'User subscription tier after upgrade/downgrade';
COMMENT ON COLUMN "coupon_redemption"."billing_cycle_before" IS 'Billing cycle before upgrade/downgrade';
COMMENT ON COLUMN "coupon_redemption"."billing_cycle_after" IS 'Billing cycle after upgrade/downgrade';
