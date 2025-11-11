-- AlterTable: Add authentication-related fields to users table

-- Email Verification Fields
ALTER TABLE "users" ADD COLUMN "email_verification_token" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "email_verification_token_expiry" TIMESTAMP(3);

-- Password Reset Fields
ALTER TABLE "users" ADD COLUMN "password_reset_token" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "password_reset_token_expiry" TIMESTAMP(3);

-- Account Management Fields
ALTER TABLE "users" ADD COLUMN "deactivated_at" TIMESTAMP(3);

-- Social Auth Fields
ALTER TABLE "users" ADD COLUMN "google_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "google_profile_url" TEXT;
ALTER TABLE "users" ADD COLUMN "auth_provider" VARCHAR(50) NOT NULL DEFAULT 'local';

-- Security/Audit Fields
ALTER TABLE "users" ADD COLUMN "last_password_change" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "password_reset_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: Add unique constraint for google_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_google_id_key" UNIQUE ("google_id");
    END IF;
END $$;

-- CreateIndex: Add index for google_id for faster lookups
CREATE INDEX IF NOT EXISTS "users_google_id_idx" ON "users"("google_id");
