-- Phase 4 Task 4.1: Add MFA (Multi-Factor Authentication) fields to User table
-- Plan: 126 (Identity Provider Enhancement - MFA for Admin Accounts)
-- Task: 127 Phase 4 Task 4.1
-- Date: 2025-11-09
-- Description: Adds TOTP-based MFA support for admin users with backup codes

-- ============================================================================
-- Add MFA Fields to users table
-- ============================================================================

-- Add mfa_enabled column (default false for backward compatibility)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Add mfa_secret column (nullable - only set when MFA is enrolled)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" VARCHAR(255);

-- Add mfa_backup_codes column (nullable - comma-separated hashed backup codes)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_backup_codes" TEXT;

-- Add mfa_verified_at column (nullable - timestamp of last successful MFA verification)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_verified_at" TIMESTAMP(3);

-- Add mfa_method column (default 'totp' for TOTP-based authentication)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_method" VARCHAR(20) NOT NULL DEFAULT 'totp';

-- ============================================================================
-- Add Indexes for Performance Optimization
-- ============================================================================

-- Index on mfa_enabled for fast filtering of MFA-enabled users
CREATE INDEX IF NOT EXISTS "users_mfa_enabled_idx" ON "users"("mfa_enabled");

-- ============================================================================
-- Data Migration (Ensure existing users have MFA disabled)
-- ============================================================================

-- Update any NULL values to false (should not be needed due to DEFAULT, but safety measure)
UPDATE "users" SET "mfa_enabled" = false WHERE "mfa_enabled" IS NULL;

-- ============================================================================
-- Verification Queries (Comments - Not Executed)
-- ============================================================================

-- Verify schema changes:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name LIKE 'mfa_%'
-- ORDER BY ordinal_position;

-- Verify all users have mfa_enabled = false:
-- SELECT COUNT(*) as total_users,
--        COUNT(*) FILTER (WHERE mfa_enabled = false) as users_with_mfa_disabled,
--        COUNT(*) FILTER (WHERE mfa_enabled = true) as users_with_mfa_enabled
-- FROM users;

-- Verify index exists:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_mfa_enabled_idx';

-- ============================================================================
-- Rollback Instructions (Manual)
-- ============================================================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS "users_mfa_enabled_idx";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_method";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_verified_at";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_backup_codes";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_secret";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "mfa_enabled";

-- ============================================================================
-- Notes
-- ============================================================================

-- 1. Zero-Downtime Migration: This migration uses IF NOT EXISTS and DEFAULT values
--    to ensure no downtime or data loss.
--
-- 2. Backward Compatibility: Existing users will have mfa_enabled = false by default,
--    allowing gradual MFA enrollment without breaking existing functionality.
--
-- 3. Security: mfa_backup_codes should be stored as bcrypt-hashed values in the
--    application layer. The TEXT column is sufficient for storing 10 backup codes
--    in comma-separated format.
--
-- 4. Idempotency: This migration can be run multiple times safely due to
--    IF NOT EXISTS clauses.
--
-- 5. Future Extensibility: mfa_method field allows for future SMS/email MFA
--    methods without schema changes.
