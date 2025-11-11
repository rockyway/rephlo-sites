-- CreateEnum: UserStatus
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'banned', 'deleted');

-- AlterTable: Add new fields to users table
ALTER TABLE "users"
  ADD COLUMN "status" "user_status" NOT NULL DEFAULT 'active',
  ADD COLUMN "suspended_until" TIMESTAMP(3),
  ADD COLUMN "banned_at" TIMESTAMP(3),
  ADD COLUMN "lifetime_value" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "has_active_perpetual_license" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: approval_requests
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_user_id" UUID,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ip_whitelists
CREATE TABLE "ip_whitelists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ip_address" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_suspensions
CREATE TABLE "user_suspensions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "suspended_by" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "suspended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "lifted_at" TIMESTAMP(3),
    "lifted_by" UUID,

    CONSTRAINT "user_suspensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX "approval_requests_requested_by_idx" ON "approval_requests"("requested_by");
CREATE INDEX "approval_requests_expires_at_idx" ON "approval_requests"("expires_at");

CREATE INDEX "ip_whitelists_user_id_is_active_idx" ON "ip_whitelists"("user_id", "is_active");
CREATE INDEX "ip_whitelists_ip_address_idx" ON "ip_whitelists"("ip_address");

CREATE INDEX "user_suspensions_user_id_idx" ON "user_suspensions"("user_id");
CREATE INDEX "user_suspensions_suspended_by_idx" ON "user_suspensions"("suspended_by");
CREATE INDEX "user_suspensions_expires_at_idx" ON "user_suspensions"("expires_at");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ip_whitelists" ADD CONSTRAINT "ip_whitelists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_suspensions" ADD CONSTRAINT "user_suspensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_suspensions" ADD CONSTRAINT "user_suspensions_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_suspensions" ADD CONSTRAINT "user_suspensions_lifted_by_fkey" FOREIGN KEY ("lifted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- DATA BACKFILL: Set initial user status based on existing flags
-- =============================================================================

-- Set status based on existing deleted_at and is_active fields
UPDATE "users"
SET "status" = CASE
  WHEN "deleted_at" IS NOT NULL THEN 'deleted'::"user_status"
  WHEN "is_active" = false THEN 'suspended'::"user_status"
  ELSE 'active'::"user_status"
END;

-- Set suspended_until from deactivated_at (if applicable)
-- This is a best-effort migration; users can manually adjust as needed
UPDATE "users"
SET "suspended_until" = "deactivated_at"
WHERE "deactivated_at" IS NOT NULL AND "status" = 'suspended'::"user_status";

-- Comment for future work: lifetime_value will be calculated by background job
-- Initial value is 0 for all users as per schema default
