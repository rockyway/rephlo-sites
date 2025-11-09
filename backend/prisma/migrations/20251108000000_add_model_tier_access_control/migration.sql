-- AlterTable: Add tier access control fields to models table
-- Purpose: Enable tier-based access control for LLM models
-- Date: 2025-11-08
-- Migration: add_model_tier_access_control

-- Add required_tier column with default 'free' for backward compatibility
ALTER TABLE "models" ADD COLUMN "required_tier" "subscription_tier" NOT NULL DEFAULT 'free';

-- Add tier_restriction_mode column with default 'minimum'
ALTER TABLE "models" ADD COLUMN "tier_restriction_mode" VARCHAR(20) NOT NULL DEFAULT 'minimum';

-- Add allowed_tiers array column with default [free, pro, enterprise]
ALTER TABLE "models" ADD COLUMN "allowed_tiers" "subscription_tier"[] NOT NULL DEFAULT ARRAY['free', 'pro', 'enterprise']::"subscription_tier"[];

-- CreateIndex: Add index on required_tier for efficient tier-based queries
CREATE INDEX "models_required_tier_idx" ON "models"("required_tier");

-- CreateIndex: Add composite index on is_available and required_tier for filtered queries
CREATE INDEX "models_is_available_required_tier_idx" ON "models"("is_available", "required_tier");

-- Comment: Migration is backward compatible
-- All existing models will default to free tier with minimum restriction mode
-- No data loss or breaking changes to existing functionality
