-- CreateTable
CREATE TABLE "model_version_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_id" VARCHAR(100) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "changed_by" UUID NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "change_reason" VARCHAR(1000),
    "previous_state" JSONB NOT NULL,
    "new_state" JSONB NOT NULL,
    "changes_summary" JSONB NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_version_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "model_version_history_model_id_created_at_idx" ON "model_version_history"("model_id", "created_at");

-- CreateIndex
CREATE INDEX "model_version_history_changed_by_idx" ON "model_version_history"("changed_by");

-- CreateIndex
CREATE INDEX "model_version_history_change_type_idx" ON "model_version_history"("change_type");

-- CreateIndex
CREATE INDEX "model_version_history_created_at_idx" ON "model_version_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "model_version_history_model_id_version_number_key" ON "model_version_history"("model_id", "version_number");

-- AddForeignKey
ALTER TABLE "model_version_history" ADD CONSTRAINT "model_version_history_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_version_history" ADD CONSTRAINT "model_version_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
