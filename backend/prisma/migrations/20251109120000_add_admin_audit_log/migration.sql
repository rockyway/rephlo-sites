-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_body" JSONB,
    "previous_value" JSONB,
    "new_value" JSONB,
    "status_code" INTEGER NOT NULL,
    "error_message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_log_admin_user_id_timestamp_idx" ON "admin_audit_log"("admin_user_id", "timestamp");

-- CreateIndex
CREATE INDEX "admin_audit_log_resource_type_resource_id_idx" ON "admin_audit_log"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_timestamp_idx" ON "admin_audit_log"("timestamp");

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
