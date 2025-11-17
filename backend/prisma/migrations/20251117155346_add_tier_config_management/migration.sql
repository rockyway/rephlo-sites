-- AlterTable
ALTER TABLE "subscription_tier_config" ADD COLUMN     "apply_to_existing_users" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "config_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "last_modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "last_modified_by" UUID,
ADD COLUMN     "rollout_start_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tier_config_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tier_config_id" UUID NOT NULL,
    "tier_name" VARCHAR(50) NOT NULL,
    "previous_credits" INTEGER NOT NULL,
    "new_credits" INTEGER NOT NULL,
    "previous_price_usd" DECIMAL(10,2) NOT NULL,
    "new_price_usd" DECIMAL(10,2) NOT NULL,
    "change_reason" TEXT NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "affected_users_count" INTEGER NOT NULL DEFAULT 0,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "tier_config_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tier_config_history_tier_name_changed_at_idx" ON "tier_config_history"("tier_name", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "tier_config_history_changed_by_idx" ON "tier_config_history"("changed_by");

-- CreateIndex
CREATE INDEX "subscription_tier_config_tier_name_idx" ON "subscription_tier_config"("tier_name");
