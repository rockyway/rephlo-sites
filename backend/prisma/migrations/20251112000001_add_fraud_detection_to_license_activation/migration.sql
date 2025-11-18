-- Add fraud detection fields to license_activation table
-- This supports device activation fraud detection in DeviceActivationManagement.tsx

-- Add IP address fields for tracking activation origin
ALTER TABLE "license_activation"
ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(45);

ALTER TABLE "license_activation"
ADD COLUMN IF NOT EXISTS "ip_address_hash" VARCHAR(64);

-- Add fraud detection flags
ALTER TABLE "license_activation"
ADD COLUMN IF NOT EXISTS "is_suspicious" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "license_activation"
ADD COLUMN IF NOT EXISTS "suspicious_flags" JSONB DEFAULT '[]'::jsonb;

-- Add indexes for efficient fraud detection queries
CREATE INDEX IF NOT EXISTS "idx_license_activation_suspicious"
ON "license_activation"("is_suspicious");

CREATE INDEX IF NOT EXISTS "idx_license_activation_ip_hash"
ON "license_activation"("ip_address_hash");

-- Add comments for documentation
COMMENT ON COLUMN "license_activation"."ip_address" IS 'IPv4/IPv6 address used for activation (may be masked in production)';
COMMENT ON COLUMN "license_activation"."ip_address_hash" IS 'SHA-256 hash of IP address for privacy-preserving fraud detection';
COMMENT ON COLUMN "license_activation"."is_suspicious" IS 'Flag indicating potential fraudulent activity detected';
COMMENT ON COLUMN "license_activation"."suspicious_flags" IS 'JSON array of fraud indicators (e.g., ["multiple_activations_same_ip", "unusual_activation_pattern"])';
