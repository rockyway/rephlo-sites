-- AlterTable: Add new fields to credits table for enhanced credit tracking
ALTER TABLE "credits" ADD COLUMN "credit_type" VARCHAR(10) NOT NULL DEFAULT 'free';
ALTER TABLE "credits" ADD COLUMN "monthly_allocation" INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE "credits" ADD COLUMN "reset_day_of_month" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex: Add composite index for credit type queries
CREATE INDEX "idx_credits_user_type_current" ON "credits"("user_id", "credit_type", "is_current");

-- AlterTable: Add Stripe integration fields to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_id" VARCHAR(255);
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Add unique indexes for Stripe fields (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_subscription_id_key'
    ) THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_customer_id_key'
    ) THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");
    END IF;
END $$;

-- AlterTable: Add notification preferences to user_preferences table
ALTER TABLE "user_preferences" ADD COLUMN "email_notifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "usage_alerts" BOOLEAN NOT NULL DEFAULT true;
