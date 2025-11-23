-- AlterTable: Add separate input/output credit tracking columns
-- Phase 3: Separate input/output pricing implementation
ALTER TABLE "token_usage_ledger"
ADD COLUMN "input_credits" INTEGER,
ADD COLUMN "output_credits" INTEGER,
ADD COLUMN "total_credits" INTEGER;

-- Add check constraint to ensure total_credits = input_credits + output_credits
-- This ensures data integrity for the separate pricing model
ALTER TABLE "token_usage_ledger"
ADD CONSTRAINT "check_total_credits"
CHECK (
  (total_credits IS NULL AND input_credits IS NULL AND output_credits IS NULL)
  OR
  (total_credits = input_credits + output_credits)
);
