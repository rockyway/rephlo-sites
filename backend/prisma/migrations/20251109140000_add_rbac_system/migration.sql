-- =============================================================================
-- RBAC SYSTEM MIGRATION (Plan 119)
-- Created: 2025-11-09
-- Purpose: Role-Based Access Control with hierarchical roles, permissions,
--          permission overrides, and comprehensive audit logging
-- =============================================================================

-- CreateEnum for RBAC System
CREATE TYPE "role_name" AS ENUM ('super_admin', 'admin', 'ops', 'support', 'analyst', 'auditor');
CREATE TYPE "permission_category" AS ENUM ('subscriptions', 'licenses', 'coupons', 'campaigns', 'credits', 'users', 'roles', 'analytics');
CREATE TYPE "override_action" AS ENUM ('grant', 'revoke');
CREATE TYPE "role_change_action" AS ENUM (
  'role_assigned',
  'role_changed',
  'role_revoked',
  'permission_override_granted',
  'permission_override_revoked',
  'permission_override_expired'
);

-- CreateTable: role
-- Defines hierarchical roles with default permission sets
CREATE TABLE "role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" "role_name" NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "hierarchy" INTEGER NOT NULL,
    -- Hierarchy level: 1 (super_admin) to 6 (auditor)
    "default_permissions" TEXT NOT NULL DEFAULT '[]',
    -- JSON array of permission strings (e.g., ["subscriptions.view", "licenses.create"])
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "role_hierarchy_check" CHECK ("hierarchy" >= 1 AND "hierarchy" <= 6)
);

-- CreateTable: permission
-- Catalog of all available permissions for documentation and UI
CREATE TABLE "permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    -- Dot notation: "subscriptions.view", "licenses.revoke"
    "display_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "permission_category" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: user_role_assignment
-- Assigns roles to users with optional expiration and permission overrides
CREATE TABLE "user_role_assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    -- Admin user who assigned this role
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    -- NULL = permanent assignment
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    -- Auto-calculated based on expires_at
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: permission_override
-- Grant or revoke specific permissions temporarily or permanently
CREATE TABLE "permission_override" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "permission" VARCHAR(100) NOT NULL,
    -- Permission string: "licenses.revoke", "credits.deduct"
    "action" "override_action" NOT NULL,
    -- grant or revoke
    "granted_by" UUID NOT NULL,
    -- Admin user who granted this override
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    -- NULL = permanent override
    "reason" TEXT,
    -- Justification for the override
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable: role_change_log
-- Immutable audit trail of all role and permission changes
CREATE TABLE "role_change_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_user_id" UUID NOT NULL,
    -- User whose role/permissions changed
    "changed_by" UUID NOT NULL,
    -- Admin who made the change
    "action" "role_change_action" NOT NULL,
    "old_role_id" UUID,
    "new_role_id" UUID,
    "permission_override" JSONB,
    -- Stores the override that was granted/revoked
    "old_permissions" TEXT NOT NULL DEFAULT '[]',
    -- JSON array of permission strings before change
    "new_permissions" TEXT NOT NULL DEFAULT '[]',
    -- JSON array of permission strings after change
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "role_change_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");
CREATE UNIQUE INDEX "permission_name_key" ON "permission"("name");

-- CreateIndex: Performance indexes for role
CREATE INDEX "role_hierarchy_idx" ON "role"("hierarchy");
CREATE INDEX "role_is_active_idx" ON "role"("is_active");

-- CreateIndex: Performance indexes for permission
CREATE INDEX "permission_category_idx" ON "permission"("category");
CREATE INDEX "permission_name_category_idx" ON "permission"("name", "category");

-- CreateIndex: Performance indexes for user_role_assignment
CREATE INDEX "user_role_assignment_user_id_idx" ON "user_role_assignment"("user_id");
CREATE INDEX "user_role_assignment_role_id_idx" ON "user_role_assignment"("role_id");
CREATE INDEX "user_role_assignment_assigned_by_idx" ON "user_role_assignment"("assigned_by");
CREATE INDEX "user_role_assignment_user_id_is_active_idx" ON "user_role_assignment"("user_id", "is_active");
CREATE INDEX "user_role_assignment_expires_at_idx" ON "user_role_assignment"("expires_at");

-- CreateIndex: Performance indexes for permission_override
CREATE INDEX "permission_override_user_id_idx" ON "permission_override"("user_id");
CREATE INDEX "permission_override_granted_by_idx" ON "permission_override"("granted_by");
CREATE INDEX "permission_override_user_id_is_active_idx" ON "permission_override"("user_id", "is_active");
CREATE INDEX "permission_override_expires_at_idx" ON "permission_override"("expires_at");
CREATE INDEX "permission_override_permission_idx" ON "permission_override"("permission");
CREATE INDEX "permission_override_action_idx" ON "permission_override"("action");

-- CreateIndex: Performance indexes for role_change_log
CREATE INDEX "role_change_log_target_user_id_idx" ON "role_change_log"("target_user_id");
CREATE INDEX "role_change_log_changed_by_idx" ON "role_change_log"("changed_by");
CREATE INDEX "role_change_log_action_idx" ON "role_change_log"("action");
CREATE INDEX "role_change_log_timestamp_idx" ON "role_change_log"("timestamp");
CREATE INDEX "role_change_log_target_user_id_timestamp_idx" ON "role_change_log"("target_user_id", "timestamp");

-- AddForeignKey: user_role_assignment -> users
ALTER TABLE "user_role_assignment" ADD CONSTRAINT "user_role_assignment_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: user_role_assignment -> role
ALTER TABLE "user_role_assignment" ADD CONSTRAINT "user_role_assignment_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: user_role_assignment -> users (assigned_by)
ALTER TABLE "user_role_assignment" ADD CONSTRAINT "user_role_assignment_assigned_by_fkey"
  FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: permission_override -> users
ALTER TABLE "permission_override" ADD CONSTRAINT "permission_override_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: permission_override -> users (granted_by)
ALTER TABLE "permission_override" ADD CONSTRAINT "permission_override_granted_by_fkey"
  FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: role_change_log -> users (target_user_id)
ALTER TABLE "role_change_log" ADD CONSTRAINT "role_change_log_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: role_change_log -> users (changed_by)
ALTER TABLE "role_change_log" ADD CONSTRAINT "role_change_log_changed_by_fkey"
  FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: role_change_log -> role (old_role_id)
ALTER TABLE "role_change_log" ADD CONSTRAINT "role_change_log_old_role_id_fkey"
  FOREIGN KEY ("old_role_id") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: role_change_log -> role (new_role_id)
ALTER TABLE "role_change_log" ADD CONSTRAINT "role_change_log_new_role_id_fkey"
  FOREIGN KEY ("new_role_id") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "role" IS 'Defines hierarchical roles (super_admin to auditor) with default permission sets';
COMMENT ON TABLE "permission" IS 'Catalog of all available permissions across 7 categories for UI and documentation';
COMMENT ON TABLE "user_role_assignment" IS 'Assigns roles to users with optional expiration dates';
COMMENT ON TABLE "permission_override" IS 'Temporary or permanent permission grants/revocations with audit trail';
COMMENT ON TABLE "role_change_log" IS 'Immutable audit log of all role and permission changes (7-year retention)';

COMMENT ON COLUMN "role"."hierarchy" IS 'Hierarchy level: 1 (highest - super_admin) to 6 (lowest - auditor)';
COMMENT ON COLUMN "role"."default_permissions" IS 'JSON array of permission strings (e.g., ["subscriptions.view", "licenses.create"])';
COMMENT ON COLUMN "user_role_assignment"."expires_at" IS 'NULL = permanent assignment, otherwise temporary role';
COMMENT ON COLUMN "permission_override"."action" IS 'grant = add permission temporarily, revoke = remove default permission';
COMMENT ON COLUMN "permission_override"."expires_at" IS 'NULL = permanent override, otherwise temporary override';
COMMENT ON COLUMN "role_change_log"."old_permissions" IS 'Snapshot of effective permissions before change';
COMMENT ON COLUMN "role_change_log"."new_permissions" IS 'Snapshot of effective permissions after change';
