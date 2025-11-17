-- CreateEnum
CREATE TYPE "refund_type" AS ENUM ('manual_admin', 'proration_credit', 'chargeback');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "proration_event" ADD COLUMN "invoice_created_at" TIMESTAMP(3),
ADD COLUMN "invoice_paid_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscription_monetization" ADD COLUMN "cancellation_reason" TEXT,
ADD COLUMN "cancellation_requested_by" UUID,
ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "refund_amount_usd" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "subscription_refund" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "refund_type" "refund_type" NOT NULL,
    "refund_reason" TEXT,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_charge_amount_usd" DECIMAL(10,2) NOT NULL,
    "refund_amount_usd" DECIMAL(10,2) NOT NULL,
    "stripe_charge_id" VARCHAR(255),
    "stripe_refund_id" VARCHAR(255),
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "stripe_processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "admin_notes" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_refund_stripe_refund_id_key" ON "subscription_refund"("stripe_refund_id");

-- CreateIndex
CREATE INDEX "subscription_refund_user_id_idx" ON "subscription_refund"("user_id");

-- CreateIndex
CREATE INDEX "subscription_refund_subscription_id_idx" ON "subscription_refund"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_refund_status_idx" ON "subscription_refund"("status");

-- CreateIndex
CREATE INDEX "subscription_refund_requested_at_idx" ON "subscription_refund"("requested_at");

-- CreateIndex
CREATE INDEX "subscription_refund_refund_type_idx" ON "subscription_refund"("refund_type");

-- AddForeignKey
ALTER TABLE "subscription_refund" ADD CONSTRAINT "subscription_refund_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_refund" ADD CONSTRAINT "subscription_refund_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_refund" ADD CONSTRAINT "subscription_refund_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
