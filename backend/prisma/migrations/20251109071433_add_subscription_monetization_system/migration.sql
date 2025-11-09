/*
  Warnings:

  - You are about to drop the `credit_deduction_ledger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `credit_usage_daily_summary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_provider_pricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pricing_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `providers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `token_usage_daily_summary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `token_usage_ledger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_credit_balance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_credit_source` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "credit_deduction_ledger" DROP CONSTRAINT "credit_deduction_ledger_request_id_fkey";

-- DropForeignKey
ALTER TABLE "credit_deduction_ledger" DROP CONSTRAINT "credit_deduction_ledger_reversed_by_fkey";

-- DropForeignKey
ALTER TABLE "credit_deduction_ledger" DROP CONSTRAINT "credit_deduction_ledger_user_id_fkey";

-- DropForeignKey
ALTER TABLE "credit_usage_daily_summary" DROP CONSTRAINT "credit_usage_daily_summary_user_id_fkey";

-- DropForeignKey
ALTER TABLE "model_provider_pricing" DROP CONSTRAINT "model_provider_pricing_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_configs" DROP CONSTRAINT "pricing_configs_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "pricing_configs" DROP CONSTRAINT "pricing_configs_created_by_fkey";

-- DropForeignKey
ALTER TABLE "pricing_configs" DROP CONSTRAINT "pricing_configs_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_daily_summary" DROP CONSTRAINT "token_usage_daily_summary_user_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_deduction_record_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "token_usage_ledger" DROP CONSTRAINT "token_usage_ledger_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_credit_balance" DROP CONSTRAINT "user_credit_balance_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_credit_source" DROP CONSTRAINT "user_credit_source_user_id_fkey";

-- DropIndex
DROP INDEX "oauth_clients_updated_at_idx";

-- AlterTable
ALTER TABLE "model_tier_audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "oauth_clients" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "credit_deduction_ledger";

-- DropTable
DROP TABLE "credit_usage_daily_summary";

-- DropTable
DROP TABLE "model_provider_pricing";

-- DropTable
DROP TABLE "pricing_configs";

-- DropTable
DROP TABLE "providers";

-- DropTable
DROP TABLE "token_usage_daily_summary";

-- DropTable
DROP TABLE "token_usage_ledger";

-- DropTable
DROP TABLE "user_credit_balance";

-- DropTable
DROP TABLE "user_credit_source";

-- DropEnum
DROP TYPE "credit_deduction_reason";

-- DropEnum
DROP TYPE "credit_deduction_status";

-- DropEnum
DROP TYPE "credit_source_type";

-- DropEnum
DROP TYPE "pricing_config_approval_status";

-- DropEnum
DROP TYPE "pricing_config_reason";

-- DropEnum
DROP TYPE "pricing_config_scope_type";

-- DropEnum
DROP TYPE "request_status";

-- DropEnum
DROP TYPE "request_type";

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "webhook_url" VARCHAR(2048) NOT NULL,
    "webhook_secret" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" UUID NOT NULL,
    "webhook_config_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_monetization" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" VARCHAR(50) NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "base_price_usd" DECIMAL(10,2) NOT NULL,
    "monthly_credit_allocation" INTEGER NOT NULL,
    "stripe_customer_id" VARCHAR(255),
    "stripe_subscription_id" VARCHAR(255),
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_monetization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tier_config" (
    "id" UUID NOT NULL,
    "tier_name" VARCHAR(50) NOT NULL,
    "monthly_price_usd" DECIMAL(10,2) NOT NULL,
    "annual_price_usd" DECIMAL(10,2) NOT NULL,
    "monthly_credit_allocation" INTEGER NOT NULL,
    "max_credit_rollover" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tier_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_allocation" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount" INTEGER NOT NULL,
    "allocation_period_start" TIMESTAMP(3) NOT NULL,
    "allocation_period_end" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoice" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "stripe_invoice_id" VARCHAR(255) NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(20) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "invoice_pdf" TEXT,
    "hosted_invoice_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "billing_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transaction" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invoice_id" UUID,
    "subscription_id" UUID,
    "stripe_payment_intent_id" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(20) NOT NULL,
    "payment_method_type" VARCHAR(50),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payment_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunning_attempt" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "subscription_id" UUID,
    "attempt_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "attempted_at" TIMESTAMP(3),
    "result" VARCHAR(20),
    "failure_reason" TEXT,
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_configs_user_id_idx" ON "webhook_configs"("user_id");

-- CreateIndex
CREATE INDEX "webhook_configs_is_active_idx" ON "webhook_configs"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_configs_user_id_key" ON "webhook_configs"("user_id");

-- CreateIndex
CREATE INDEX "webhook_logs_webhook_config_id_idx" ON "webhook_logs"("webhook_config_id");

-- CreateIndex
CREATE INDEX "webhook_logs_event_type_idx" ON "webhook_logs"("event_type");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_monetization_stripe_customer_id_key" ON "subscription_monetization"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_monetization_stripe_subscription_id_key" ON "subscription_monetization"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_monetization_user_id_idx" ON "subscription_monetization"("user_id");

-- CreateIndex
CREATE INDEX "subscription_monetization_status_idx" ON "subscription_monetization"("status");

-- CreateIndex
CREATE INDEX "subscription_monetization_tier_idx" ON "subscription_monetization"("tier");

-- CreateIndex
CREATE INDEX "subscription_monetization_current_period_end_idx" ON "subscription_monetization"("current_period_end");

-- CreateIndex
CREATE INDEX "subscription_monetization_stripe_customer_id_idx" ON "subscription_monetization"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "subscription_monetization_stripe_subscription_id_idx" ON "subscription_monetization"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tier_config_tier_name_key" ON "subscription_tier_config"("tier_name");

-- CreateIndex
CREATE INDEX "credit_allocation_user_id_idx" ON "credit_allocation"("user_id");

-- CreateIndex
CREATE INDEX "credit_allocation_subscription_id_idx" ON "credit_allocation"("subscription_id");

-- CreateIndex
CREATE INDEX "credit_allocation_allocation_period_start_allocation_period_idx" ON "credit_allocation"("allocation_period_start", "allocation_period_end");

-- CreateIndex
CREATE INDEX "credit_allocation_source_idx" ON "credit_allocation"("source");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_stripe_invoice_id_key" ON "billing_invoice"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "billing_invoice_user_id_idx" ON "billing_invoice"("user_id");

-- CreateIndex
CREATE INDEX "billing_invoice_subscription_id_idx" ON "billing_invoice"("subscription_id");

-- CreateIndex
CREATE INDEX "billing_invoice_stripe_invoice_id_idx" ON "billing_invoice"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "billing_invoice_status_idx" ON "billing_invoice"("status");

-- CreateIndex
CREATE INDEX "billing_invoice_period_start_period_end_idx" ON "billing_invoice"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transaction_stripe_payment_intent_id_key" ON "payment_transaction"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_transaction_user_id_idx" ON "payment_transaction"("user_id");

-- CreateIndex
CREATE INDEX "payment_transaction_invoice_id_idx" ON "payment_transaction"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_transaction_subscription_id_idx" ON "payment_transaction"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_transaction_stripe_payment_intent_id_idx" ON "payment_transaction"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_transaction_status_idx" ON "payment_transaction"("status");

-- CreateIndex
CREATE INDEX "payment_transaction_created_at_idx" ON "payment_transaction"("created_at");

-- CreateIndex
CREATE INDEX "dunning_attempt_user_id_idx" ON "dunning_attempt"("user_id");

-- CreateIndex
CREATE INDEX "dunning_attempt_invoice_id_idx" ON "dunning_attempt"("invoice_id");

-- CreateIndex
CREATE INDEX "dunning_attempt_subscription_id_idx" ON "dunning_attempt"("subscription_id");

-- CreateIndex
CREATE INDEX "dunning_attempt_scheduled_at_idx" ON "dunning_attempt"("scheduled_at");

-- CreateIndex
CREATE INDEX "dunning_attempt_result_idx" ON "dunning_attempt"("result");

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_config_id_fkey" FOREIGN KEY ("webhook_config_id") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_monetization" ADD CONSTRAINT "subscription_monetization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_allocation" ADD CONSTRAINT "credit_allocation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_allocation" ADD CONSTRAINT "credit_allocation_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempt" ADD CONSTRAINT "dunning_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempt" ADD CONSTRAINT "dunning_attempt_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_attempt" ADD CONSTRAINT "dunning_attempt_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
