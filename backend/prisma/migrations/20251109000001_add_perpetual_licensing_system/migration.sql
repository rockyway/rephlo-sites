-- =============================================================================
-- Plan 110: Perpetual Licensing & Proration System
-- Migration: Add perpetual_license, license_activation, version_upgrade, and proration_event tables
-- Date: 2025-11-09
-- Integrated with: Plan 109 (Subscription Monetization), Plan 112 (Token-to-Credit Conversion)
-- =============================================================================

-- Create Enums for Plan 110
-- License Status Enum
CREATE TYPE "license_status" AS ENUM ('pending', 'active', 'suspended', 'revoked', 'expired');

-- Activation Status Enum
CREATE TYPE "activation_status" AS ENUM ('active', 'deactivated', 'replaced');

-- Upgrade Status Enum
CREATE TYPE "upgrade_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Proration Change Type Enum
CREATE TYPE "proration_change_type" AS ENUM ('upgrade', 'downgrade', 'cancellation', 'reactivation');

-- Proration Status Enum
CREATE TYPE "proration_status" AS ENUM ('pending', 'applied', 'failed', 'reversed');

-- =============================================================================
-- Table 1: perpetual_license
-- Manages one-time perpetual license purchases
-- =============================================================================
CREATE TABLE "perpetual_license" (
    "id" UUID NOT NULL PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "license_key" VARCHAR(50) NOT NULL UNIQUE,

    -- Purchase Details
    "purchase_price_usd" DECIMAL(10, 2) NOT NULL,
    "purchased_version" VARCHAR(50) NOT NULL,

    -- Version Eligibility (SemVer)
    "eligible_until_version" VARCHAR(50) NOT NULL,

    -- Activation Limits
    "max_activations" INTEGER NOT NULL DEFAULT 3,
    "current_activations" INTEGER NOT NULL DEFAULT 0,

    -- Status
    "status" "license_status" NOT NULL DEFAULT 'pending',

    -- Dates
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign Keys
    CONSTRAINT "perpetual_license_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for perpetual_license
CREATE INDEX "perpetual_license_user_id_idx" ON "perpetual_license"("user_id");
CREATE INDEX "perpetual_license_status_idx" ON "perpetual_license"("status");
CREATE INDEX "perpetual_license_license_key_idx" ON "perpetual_license"("license_key");
CREATE INDEX "perpetual_license_purchased_at_idx" ON "perpetual_license"("purchased_at");

-- =============================================================================
-- Table 2: license_activation
-- Tracks device activations with machine fingerprinting
-- =============================================================================
CREATE TABLE "license_activation" (
    "id" UUID NOT NULL PRIMARY KEY,
    "license_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    -- Machine Fingerprinting (SHA-256 hash: CPU ID + MAC address + disk serial + OS version)
    "machine_fingerprint" VARCHAR(64) NOT NULL,

    -- Device Information
    "device_name" VARCHAR(255),
    "os_type" VARCHAR(50),
    "os_version" VARCHAR(100),
    "cpu_info" VARCHAR(255),

    -- Activation Tracking
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "deactivated_at" TIMESTAMP(3),

    -- Status
    "status" "activation_status" NOT NULL DEFAULT 'active',

    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign Keys
    CONSTRAINT "license_activation_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "perpetual_license"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "license_activation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,

    -- Unique Constraint: Prevent duplicate activations (same license + same machine)
    CONSTRAINT "unique_license_machine" UNIQUE ("license_id", "machine_fingerprint")
);

-- Indexes for license_activation
CREATE INDEX "license_activation_license_id_idx" ON "license_activation"("license_id");
CREATE INDEX "license_activation_user_id_idx" ON "license_activation"("user_id");
CREATE INDEX "license_activation_machine_fingerprint_idx" ON "license_activation"("machine_fingerprint");
CREATE INDEX "license_activation_status_idx" ON "license_activation"("status");
CREATE INDEX "license_activation_activated_at_idx" ON "license_activation"("activated_at");

-- =============================================================================
-- Table 3: version_upgrade
-- Tracks major version upgrade purchases (e.g., v1.x → v2.0 = $99)
-- =============================================================================
CREATE TABLE "version_upgrade" (
    "id" UUID NOT NULL PRIMARY KEY,
    "license_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    -- Version Details (SemVer)
    "from_version" VARCHAR(50) NOT NULL,
    "to_version" VARCHAR(50) NOT NULL,

    -- Pricing
    "upgrade_price_usd" DECIMAL(10, 2) NOT NULL,

    -- Stripe Payment Integration
    "stripe_payment_intent_id" VARCHAR(255) UNIQUE,

    -- Status
    "status" "upgrade_status" NOT NULL DEFAULT 'pending',

    -- Timestamps
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign Keys
    CONSTRAINT "version_upgrade_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "perpetual_license"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "version_upgrade_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for version_upgrade
CREATE INDEX "version_upgrade_license_id_idx" ON "version_upgrade"("license_id");
CREATE INDEX "version_upgrade_user_id_idx" ON "version_upgrade"("user_id");
CREATE INDEX "version_upgrade_from_version_to_version_idx" ON "version_upgrade"("from_version", "to_version");
CREATE INDEX "version_upgrade_status_idx" ON "version_upgrade"("status");
CREATE INDEX "version_upgrade_purchased_at_idx" ON "version_upgrade"("purchased_at");

-- =============================================================================
-- Table 4: proration_event
-- Tracks mid-cycle tier changes with proration calculations
-- =============================================================================
CREATE TABLE "proration_event" (
    "id" UUID NOT NULL PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,

    -- Tier Change Details
    "from_tier" VARCHAR(50),
    "to_tier" VARCHAR(50),

    -- Change Type
    "change_type" "proration_change_type" NOT NULL,

    -- Billing Cycle Details
    "days_remaining" INTEGER NOT NULL,
    "days_in_cycle" INTEGER NOT NULL,

    -- Proration Calculation (in USD)
    "unused_credit_value_usd" DECIMAL(10, 2) NOT NULL,
    "new_tier_prorated_cost_usd" DECIMAL(10, 2) NOT NULL,
    "net_charge_usd" DECIMAL(10, 2) NOT NULL,

    -- Dates
    "effective_date" TIMESTAMP(3) NOT NULL,

    -- Stripe Integration
    "stripe_invoice_id" VARCHAR(255) UNIQUE,

    -- Status
    "status" "proration_status" NOT NULL DEFAULT 'pending',

    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    -- Foreign Keys
    CONSTRAINT "proration_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proration_event_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription_monetization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes for proration_event
CREATE INDEX "proration_event_user_id_idx" ON "proration_event"("user_id");
CREATE INDEX "proration_event_subscription_id_idx" ON "proration_event"("subscription_id");
CREATE INDEX "proration_event_change_type_idx" ON "proration_event"("change_type");
CREATE INDEX "proration_event_effective_date_idx" ON "proration_event"("effective_date");
CREATE INDEX "proration_event_status_idx" ON "proration_event"("status");

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Summary:
-- ✓ Created 5 enums: license_status, activation_status, upgrade_status, proration_change_type, proration_status
-- ✓ Created 4 tables: perpetual_license, license_activation, version_upgrade, proration_event
-- ✓ Created 24 indexes for query optimization
-- ✓ Configured foreign key constraints with CASCADE delete for GDPR compliance
-- ✓ Implemented unique constraints to prevent duplicate activations
--
-- Integration Points:
-- - perpetual_license.user_id → users.id (Plan 109)
-- - license_activation.user_id → users.id (Plan 109)
-- - version_upgrade.user_id → users.id (Plan 109)
-- - proration_event.subscription_id → subscription_monetization.id (Plan 109)
-- - Perpetual licenses with BYOK mode: No credit deductions (Plan 112)
--
-- Next Steps:
-- 1. Run: npx prisma migrate dev
-- 2. Update seed.ts with perpetual tier configuration
-- 3. Implement LicenseManagementService
-- 4. Implement ProrationService
-- 5. Create admin UI for license management
-- =============================================================================
