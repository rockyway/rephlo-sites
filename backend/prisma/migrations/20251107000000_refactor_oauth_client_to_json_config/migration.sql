-- Refactor OAuthClient to use JSON config field for extensibility
-- This allows adding new client configuration options without schema migrations

-- Add new columns
ALTER TABLE "oauth_clients"
  ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index on updated_at for efficient queries
CREATE INDEX "oauth_clients_updated_at_idx" ON "oauth_clients"("updated_at");
