/*
  Warnings:

  - You are about to drop the column `filePath` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `diagnostics` table. All the data in the column will be lost.
  - You are about to drop the column `ipHash` on the `downloads` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `downloads` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `feedbacks` table. All the data in the column will be lost.
  - You are about to drop the `usage_history` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `file_path` to the `diagnostics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_size` to the `diagnostics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "subscription_tier" ADD VALUE 'pro_plus';
ALTER TYPE "subscription_tier" ADD VALUE 'enterprise_pro_plus';

-- DropForeignKey
ALTER TABLE "usage_history" DROP CONSTRAINT "usage_history_credit_id_fkey";

-- DropForeignKey
ALTER TABLE "usage_history" DROP CONSTRAINT "usage_history_model_id_fkey";

-- DropForeignKey
ALTER TABLE "usage_history" DROP CONSTRAINT "usage_history_user_id_fkey";

-- DropIndex
DROP INDEX "diagnostics_userId_idx";

-- AlterTable
ALTER TABLE "diagnostics" DROP COLUMN "filePath",
DROP COLUMN "fileSize",
DROP COLUMN "userId",
ADD COLUMN     "file_path" TEXT NOT NULL,
ADD COLUMN     "file_size" INTEGER NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "downloads" DROP COLUMN "ipHash",
DROP COLUMN "userAgent",
ADD COLUMN     "ip_hash" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "feedbacks" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT;

-- DropTable
DROP TABLE "usage_history";

-- CreateIndex
CREATE INDEX "diagnostics_user_id_idx" ON "diagnostics"("user_id");

-- CreateIndex
CREATE INDEX "idx_token_usage_analytics" ON "token_usage_ledger"("created_at" DESC, "status", "provider_id", "user_id", "gross_margin_usd", "vendor_cost", "credits_deducted", "input_tokens", "output_tokens");
