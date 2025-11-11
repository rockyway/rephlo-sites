-- Add role field to users table
ALTER TABLE "users" ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'user';

-- Create index on role field
CREATE INDEX "users_role_idx" ON "users"("role");

-- Create model_tier_audit_logs table
CREATE TABLE "model_tier_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_id" VARCHAR(100) NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB NOT NULL,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_tier_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes on model_tier_audit_logs
CREATE INDEX "model_tier_audit_logs_model_id_idx" ON "model_tier_audit_logs"("model_id");
CREATE INDEX "model_tier_audit_logs_admin_user_id_idx" ON "model_tier_audit_logs"("admin_user_id");
CREATE INDEX "model_tier_audit_logs_created_at_idx" ON "model_tier_audit_logs"("created_at");

-- Add foreign key constraints
ALTER TABLE "model_tier_audit_logs" ADD CONSTRAINT "model_tier_audit_logs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "model_tier_audit_logs" ADD CONSTRAINT "model_tier_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
