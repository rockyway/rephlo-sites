-- CreateTable
CREATE TABLE IF NOT EXISTS "oidc_models" (
    "id" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3),
    "grant_id" VARCHAR(255),
    "user_code" VARCHAR(100),
    "uid" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oidc_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_oidc_models_kind" ON "oidc_models"("kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_oidc_models_expires_at" ON "oidc_models"("expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_oidc_models_grant_id" ON "oidc_models"("grant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_oidc_models_user_code" ON "oidc_models"("user_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_oidc_models_uid" ON "oidc_models"("uid");
