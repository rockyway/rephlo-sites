-- AlterTable
ALTER TABLE "token_usage_ledger" ADD COLUMN     "image_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "image_tokens" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "idx_token_usage_image_count" ON "token_usage_ledger"("image_count");
