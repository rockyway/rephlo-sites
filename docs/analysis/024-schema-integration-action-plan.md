# Cross-Plan Schema Integration: Action Plan & Recommendations

**Document ID**: 024-schema-integration-action-plan.md
**Version**: 1.0
**Created**: 2025-11-09
**Related**:
- docs/analysis/022-cross-plan-schema-validation-report.md
- docs/analysis/023-cross-plan-entity-relationship-diagram.md

---

## Executive Summary

This document provides a prioritized action plan to complete the database schema integration across Plans 109, 110, 111, and 112. The current integration is **67% complete** with Plan 112 (Token-Credit System) entirely missing from the Prisma schema.

**Critical Issues**:
- 0/9 Plan 112 tables implemented (blocking credit system)
- Enum inconsistencies (missing tier values)
- Missing foreign keys between plans
- Suboptimal indexes for cross-plan queries

**Estimated Timeline**: 4-5 weeks
**Priority**: 🔴 **CRITICAL** (blocks monetization features)

---

## Phase 1: Critical Fixes (Week 1)

**Priority**: 🔴 **CRITICAL** - Must complete before any production deployment

### Task 1.1: Add Plan 112 Tables to Prisma Schema

**File**: `backend/prisma/schema.prisma`

**Actions**:

1. Add Provider model:
```prisma
// Provider Registry (OpenAI, Anthropic, Google, Azure)
model Provider {
  id         String   @id @default(uuid()) @db.Uuid
  name       String   @unique @db.VarChar(100)
  apiType    String   @db.VarChar(50)
  // Values: "openai", "anthropic", "google", "azure", "ollama"
  isEnabled  Boolean  @default(true) @map("is_enabled")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  modelPricing    ModelProviderPricing[]
  pricingConfigs  PricingConfig[]
  tokenUsages     TokenUsageLedger[]

  @@index([isEnabled])
  @@map("providers")
}
```

2. Add ModelProviderPricing model:
```prisma
// Vendor token pricing with historical tracking
model ModelProviderPricing {
  id                         String    @id @default(uuid()) @db.Uuid
  providerId                 String    @map("provider_id") @db.Uuid
  modelName                  String    @map("model_name") @db.VarChar(255)
  vendorModelId              String?   @unique @map("vendor_model_id") @db.VarChar(255)

  // Pricing (per 1,000 tokens) - DECIMAL(10,8) for micro-cost precision
  inputPricePer1k            Decimal   @map("input_price_per_1k") @db.Decimal(10, 8)
  outputPricePer1k           Decimal   @map("output_price_per_1k") @db.Decimal(10, 8)
  cacheInputPricePer1k       Decimal?  @map("cache_input_price_per_1k") @db.Decimal(10, 8)
  cacheHitPricePer1k         Decimal?  @map("cache_hit_price_per_1k") @db.Decimal(10, 8)

  // Historical tracking
  effectiveFrom              DateTime  @map("effective_from")
  effectiveUntil             DateTime? @map("effective_until")

  // Rate change detection
  previousPriceInput         Decimal?  @map("previous_price_input") @db.Decimal(10, 8)
  previousPriceOutput        Decimal?  @map("previous_price_output") @db.Decimal(10, 8)
  priceChangePercentInput    Decimal?  @map("price_change_percent_input") @db.Decimal(5, 2)
  priceChangePercentOutput   Decimal?  @map("price_change_percent_output") @db.Decimal(5, 2)
  detectedAt                 DateTime? @map("detected_at")

  isActive                   Boolean   @default(true) @map("is_active")
  description                String?   @db.Text
  lastVerified               DateTime  @default(now()) @map("last_verified")
  verificationFrequencyDays  Int       @default(7) @map("verification_frequency_days")

  createdAt                  DateTime  @default(now()) @map("created_at")
  updatedAt                  DateTime  @updatedAt @map("updated_at")

  // Relations
  provider Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@unique([providerId, modelName, effectiveFrom])
  @@index([providerId, modelName, isActive])
  @@index([effectiveFrom, effectiveUntil])
  @@index([isActive])
  @@map("model_provider_pricing")
}
```

3. Add PricingConfig model:
```prisma
// Margin multiplier configuration with approval workflow
model PricingConfig {
  id                           String             @id @default(uuid()) @db.Uuid
  scopeType                    String             @map("scope_type") @db.VarChar(20)
  // Values: "tier", "provider", "model", "combination"

  subscriptionTier             SubscriptionTier?  @map("subscription_tier")
  providerId                   String?            @map("provider_id") @db.Uuid
  modelId                      String?            @map("model_id") @db.VarChar(255)

  marginMultiplier             Decimal            @map("margin_multiplier") @db.Decimal(4, 2)
  targetGrossMarginPercent     Decimal?           @map("target_gross_margin_percent") @db.Decimal(5, 2)

  effectiveFrom                DateTime           @map("effective_from")
  effectiveUntil               DateTime?          @map("effective_until")

  reason                       String             @map("reason") @db.VarChar(50)
  reasonDetails                String?            @map("reason_details") @db.Text

  previousMultiplier           Decimal?           @map("previous_multiplier") @db.Decimal(4, 2)
  changePercent                Decimal?           @map("change_percent") @db.Decimal(5, 2)

  expectedMarginChangeDollars  Decimal?           @map("expected_margin_change_dollars") @db.Decimal(12, 2)
  expectedRevenueImpact        Decimal?           @map("expected_revenue_impact") @db.Decimal(12, 2)

  createdBy                    String             @map("created_by") @db.Uuid
  approvedBy                   String?            @map("approved_by") @db.Uuid
  requiresApproval             Boolean            @default(true) @map("requires_approval")
  approvalStatus               String             @default("pending") @map("approval_status") @db.VarChar(20)

  isActive                     Boolean            @default(true) @map("is_active")
  monitored                    Boolean            @default(true) @map("monitored")

  createdAt                    DateTime           @default(now()) @map("created_at")
  updatedAt                    DateTime           @updatedAt @map("updated_at")

  // Relations
  provider       Provider? @relation(fields: [providerId], references: [id], onDelete: Cascade)
  createdByUser  User      @relation("PricingConfigCreatedBy", fields: [createdBy], references: [id])
  approvedByUser User?     @relation("PricingConfigApprovedBy", fields: [approvedBy], references: [id])

  @@index([scopeType])
  @@index([subscriptionTier, isActive])
  @@index([providerId, isActive])
  @@index([isActive, effectiveFrom])
  @@index([approvalStatus])
  @@map("pricing_configs")
}
```

4. Add UserCreditBalance model:
```prisma
// Single source of truth for user credit balances
model UserCreditBalance {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @unique @map("user_id") @db.Uuid

  amount              Int       @default(0)
  lastDeductionAt     DateTime? @map("last_deduction_at")
  lastDeductionAmount Int?      @map("last_deduction_amount")

  updatedAt           DateTime  @updatedAt @map("updated_at")
  createdAt           DateTime  @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_credit_balance")
}
```

5. Add TokenUsageLedger model:
```prisma
// Immutable audit trail of every API request
model TokenUsageLedger {
  id                    String    @id @default(uuid()) @db.Uuid
  requestId             String    @unique @map("request_id") @db.Uuid

  userId                String    @map("user_id") @db.Uuid
  subscriptionId        String?   @map("subscription_id") @db.Uuid

  modelId               String    @map("model_id") @db.VarChar(255)
  providerId            String    @map("provider_id") @db.Uuid

  inputTokens           Int       @map("input_tokens")
  outputTokens          Int       @map("output_tokens")
  cachedInputTokens     Int       @default(0) @map("cached_input_tokens")
  totalTokens           Int       @map("total_tokens")

  vendorCost            Decimal   @map("vendor_cost") @db.Decimal(10, 8)
  marginMultiplier      Decimal   @map("margin_multiplier") @db.Decimal(4, 2)
  creditValueUsd        Decimal   @map("credit_value_usd") @db.Decimal(10, 8)
  creditsDeducted       Int       @map("credits_deducted")
  grossMarginUsd        Decimal   @map("gross_margin_usd") @db.Decimal(10, 8)

  requestType           String    @map("request_type") @db.VarChar(20)
  streamingSegments     Int?      @map("streaming_segments")

  requestStartedAt      DateTime  @map("request_started_at")
  requestCompletedAt    DateTime  @map("request_completed_at")
  processingTimeMs      Int?      @map("processing_time_ms")

  status                String    @default("success") @map("status") @db.VarChar(20)
  errorMessage          String?   @map("error_message") @db.Text
  isStreamingComplete   Boolean   @default(true) @map("is_streaming_complete")

  userTierAtRequest     String?   @map("user_tier_at_request") @db.VarChar(50)
  region                String?   @map("region") @db.VarChar(50)

  deductionRecordId     String?   @map("deduction_record_id") @db.Uuid

  createdAt             DateTime  @default(now()) @map("created_at")

  // Relations
  user         User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription?           @relation(fields: [subscriptionId], references: [id])
  provider     Provider                @relation(fields: [providerId], references: [id])
  deduction    CreditDeductionLedger?  @relation(fields: [deductionRecordId], references: [id])

  @@index([userId, createdAt])
  @@index([modelId, createdAt])
  @@index([providerId, createdAt])
  @@index([userId, vendorCost])
  @@index([requestId])
  @@index([status])
  @@map("token_usage_ledger")
}
```

6. Add CreditDeductionLedger model:
```prisma
// Immutable audit trail of every credit deduction
model CreditDeductionLedger {
  id                String    @id @default(uuid()) @db.Uuid
  userId            String    @map("user_id") @db.Uuid

  amount            Int
  balanceBefore     Int       @map("balance_before")
  balanceAfter      Int       @map("balance_after")

  requestId         String?   @unique @map("request_id") @db.Uuid
  tokenVendorCost   Decimal?  @map("token_vendor_cost") @db.Decimal(10, 8)
  marginMultiplier  Decimal?  @map("margin_multiplier") @db.Decimal(4, 2)
  grossMargin       Decimal?  @map("gross_margin") @db.Decimal(10, 8)

  reason            String    @map("reason") @db.VarChar(50)
  status            String    @default("pending") @map("status") @db.VarChar(20)

  reversedAt        DateTime? @map("reversed_at")
  reversedBy        String?   @map("reversed_by") @db.Uuid
  reversalReason    String?   @map("reversal_reason") @db.Text

  processedAt       DateTime  @default(now()) @map("processed_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  // Relations
  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  reversedByUser User?               @relation("CreditReversedBy", fields: [reversedBy], references: [id])
  tokenUsage     TokenUsageLedger?

  @@index([userId, createdAt])
  @@index([requestId])
  @@index([status])
  @@index([reason])
  @@map("credit_deduction_ledger")
}
```

7. Add UserCreditSource model:
```prisma
// Track credit sources and expiration
model UserCreditSource {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid

  source     String    @map("source") @db.VarChar(50)
  amount     Int

  expiresAt  DateTime? @map("expires_at")

  createdAt  DateTime  @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
  @@index([source])
  @@map("user_credit_source")
}
```

8. Add summary tables:
```prisma
// Daily token usage aggregation
model TokenUsageDailySummary {
  id                   String   @id @default(uuid()) @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  summaryDate          DateTime @map("summary_date") @db.Date

  totalRequests        Int      @default(0) @map("total_requests")
  totalInputTokens     Int      @default(0) @map("total_input_tokens")
  totalOutputTokens    Int      @default(0) @map("total_output_tokens")
  totalVendorCost      Decimal  @default(0) @map("total_vendor_cost") @db.Decimal(12, 2)
  totalCreditsDeducted Int      @default(0) @map("total_credits_deducted")
  totalGrossMargin     Decimal  @default(0) @map("total_gross_margin") @db.Decimal(12, 2)

  avgRequestLatencyMs  Int?     @map("avg_request_latency_ms")
  successRate          Decimal? @map("success_rate") @db.Decimal(5, 2)

  createdAt            DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, summaryDate])
  @@index([userId, summaryDate])
  @@index([summaryDate])
  @@map("token_usage_daily_summary")
}

// Daily credit usage aggregation
model CreditUsageDailySummary {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @map("user_id") @db.Uuid
  summaryDate         DateTime @map("summary_date") @db.Date

  totalDeductions     Int      @default(0) @map("total_deductions")
  totalRequests       Int      @default(0) @map("total_requests")
  totalVendorCost     Decimal  @default(0) @map("total_vendor_cost") @db.Decimal(12, 2)
  totalGrossMargin    Decimal  @default(0) @map("total_gross_margin") @db.Decimal(12, 2)

  createdAt           DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, summaryDate])
  @@index([userId, summaryDate])
  @@map("credit_usage_daily_summary")
}
```

9. Update User model relations:
```prisma
model User {
  // ... existing fields ...

  // Plan 112 Relations (ADD THESE)
  creditBalance          UserCreditBalance?
  creditSources          UserCreditSource[]
  tokenUsages            TokenUsageLedger[]
  creditDeductions       CreditDeductionLedger[]       @relation("CreditDeductionLedger")
  creditReversals        CreditDeductionLedger[]       @relation("CreditReversedBy")
  tokenUsageSummary      TokenUsageDailySummary[]
  creditUsageSummary     CreditUsageDailySummary[]
  pricingConfigsCreated  PricingConfig[]               @relation("PricingConfigCreatedBy")
  pricingConfigsApproved PricingConfig[]               @relation("PricingConfigApprovedBy")
}
```

**Estimated Time**: 4-6 hours

---

### Task 1.2: Fix Enum Definitions

**File**: `backend/prisma/schema.prisma`

**Actions**:

1. Update SubscriptionTier enum:
```prisma
enum SubscriptionTier {
  free
  pro
  pro_max              // ADD THIS
  enterprise_pro       // ADD THIS
  enterprise_max       // ADD THIS
  perpetual            // ADD THIS

  @@map("subscription_tier")
}
```

2. Update SubscriptionStatus enum:
```prisma
enum SubscriptionStatus {
  trial                // ADD THIS
  active
  past_due             // ADD THIS
  cancelled
  expired
  suspended

  @@map("subscription_status")
}
```

3. Change SubscriptionMonetization.tier from String to enum:
```prisma
model SubscriptionMonetization {
  // CHANGE FROM:
  // tier String @db.VarChar(50)

  // TO:
  tier SubscriptionTier @map("tier")

  // ... rest of fields ...
}
```

4. Change SubscriptionMonetization.status from String to enum:
```prisma
model SubscriptionMonetization {
  // CHANGE FROM:
  // status String @db.VarChar(20)

  // TO:
  status SubscriptionStatus @map("status")

  // ... rest of fields ...
}
```

**Estimated Time**: 1 hour

---

### Task 1.3: Generate Migration

**Actions**:

1. Run Prisma migration generation:
```bash
cd backend
npx prisma migrate dev --name add_token_credit_conversion_system_plan_112
```

2. Review generated migration SQL file:
   - Check CREATE TABLE statements
   - Verify foreign key constraints
   - Ensure indexes are created
   - Validate enum types

3. Add generated columns to migration SQL (Prisma doesn't support these natively):
```sql
-- Add to migration SQL manually
ALTER TABLE token_usage_ledger
  ADD COLUMN total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED;

ALTER TABLE token_usage_ledger
  ADD COLUMN gross_margin_usd DECIMAL(10,8) GENERATED ALWAYS AS (credit_value_usd - vendor_cost) STORED;
```

4. Test migration on local database:
```bash
# Backup first
pg_dump rephlo_dev > backup_before_plan_112.sql

# Run migration
npx prisma migrate dev

# Verify tables created
npx prisma studio
# Check: providers, model_provider_pricing, user_credit_balance, etc.
```

5. If migration fails, rollback:
```bash
psql -d rephlo_dev -f backup_before_plan_112.sql
```

**Estimated Time**: 2-3 hours

---

### Task 1.4: Seed Plan 112 Data

**File**: `backend/prisma/seed.ts`

**Actions**:

1. Add provider seed data:
```typescript
// Seed Providers
const providers = await Promise.all([
  prisma.provider.upsert({
    where: { name: 'OpenAI' },
    update: {},
    create: {
      name: 'OpenAI',
      apiType: 'openai',
      isEnabled: true,
    },
  }),
  prisma.provider.upsert({
    where: { name: 'Anthropic' },
    update: {},
    create: {
      name: 'Anthropic',
      apiType: 'anthropic',
      isEnabled: true,
    },
  }),
  prisma.provider.upsert({
    where: { name: 'Google' },
    update: {},
    create: {
      name: 'Google',
      apiType: 'google',
      isEnabled: true,
    },
  }),
  prisma.provider.upsert({
    where: { name: 'Azure OpenAI' },
    update: {},
    create: {
      name: 'Azure OpenAI',
      apiType: 'azure',
      isEnabled: true,
    },
  }),
]);
```

2. Add model pricing seed data:
```typescript
// Seed Model Provider Pricing (November 2025 rates)
await prisma.modelProviderPricing.createMany({
  data: [
    // OpenAI models
    {
      providerId: providers[0].id, // OpenAI
      modelName: 'gpt-4-turbo',
      vendorModelId: 'gpt-4-turbo-2024-04-09',
      inputPricePer1k: 0.01000,
      outputPricePer1k: 0.03000,
      effectiveFrom: new Date('2024-01-01'),
      isActive: true,
    },
    {
      providerId: providers[0].id, // OpenAI
      modelName: 'gpt-4o',
      vendorModelId: 'gpt-4o-2024-08-06',
      inputPricePer1k: 0.00500,
      outputPricePer1k: 0.01500,
      effectiveFrom: new Date('2024-05-01'),
      isActive: true,
    },
    // Anthropic models
    {
      providerId: providers[1].id, // Anthropic
      modelName: 'claude-3-5-sonnet',
      vendorModelId: 'claude-3-5-sonnet-20241022',
      inputPricePer1k: 0.00300,
      outputPricePer1k: 0.01500,
      cacheInputPricePer1k: 0.00075,
      cacheHitPricePer1k: 0.00030,
      effectiveFrom: new Date('2024-10-01'),
      isActive: true,
    },
    // Google models
    {
      providerId: providers[2].id, // Google
      modelName: 'gemini-2-0-flash',
      vendorModelId: 'gemini-2.0-flash-exp',
      inputPricePer1k: 0.0000375,
      outputPricePer1k: 0.000150,
      effectiveFrom: new Date('2024-12-01'),
      isActive: true,
    },
  ],
  skipDuplicates: true,
});
```

3. Add pricing config seed data:
```typescript
// Seed Pricing Configs (margin multipliers)
await prisma.pricingConfig.createMany({
  data: [
    // Tier-based multipliers
    {
      scopeType: 'tier',
      subscriptionTier: 'free',
      marginMultiplier: 2.0,
      targetGrossMarginPercent: 50.0,
      effectiveFrom: new Date('2025-01-01'),
      reason: 'initial_setup',
      createdBy: adminUser.id,
      approvalStatus: 'approved',
      approvedBy: adminUser.id,
      isActive: true,
    },
    {
      scopeType: 'tier',
      subscriptionTier: 'pro',
      marginMultiplier: 1.5,
      targetGrossMarginPercent: 33.33,
      effectiveFrom: new Date('2025-01-01'),
      reason: 'initial_setup',
      createdBy: adminUser.id,
      approvalStatus: 'approved',
      approvedBy: adminUser.id,
      isActive: true,
    },
    {
      scopeType: 'tier',
      subscriptionTier: 'enterprise',
      marginMultiplier: 1.2,
      targetGrossMarginPercent: 16.67,
      effectiveFrom: new Date('2025-01-01'),
      reason: 'initial_setup',
      createdBy: adminUser.id,
      approvalStatus: 'approved',
      approvedBy: adminUser.id,
      isActive: true,
    },
  ],
  skipDuplicates: true,
});
```

4. Run seed script:
```bash
cd backend
npx prisma db seed
```

**Estimated Time**: 2 hours

---

### Task 1.5: Verify Integration

**Actions**:

1. Check database tables exist:
```bash
npx prisma studio
# Verify: providers, model_provider_pricing, pricing_configs,
#         user_credit_balance, token_usage_ledger, credit_deduction_ledger
```

2. Test foreign key constraints:
```sql
-- Test: Create user credit balance
INSERT INTO user_credit_balance (id, user_id, amount)
VALUES (gen_random_uuid(), (SELECT id FROM users LIMIT 1), 2000);

-- Test: Delete user → cascade to credit balance
BEGIN TRANSACTION;
DELETE FROM users WHERE email = 'test@example.com';
-- Verify: user_credit_balance row deleted
ROLLBACK;
```

3. Test enum constraints:
```sql
-- Test: Insert valid subscription tier
UPDATE subscription_monetization
SET tier = 'pro_max'
WHERE id = (SELECT id FROM subscription_monetization LIMIT 1);

-- Test: Insert invalid subscription tier (should fail)
UPDATE subscription_monetization
SET tier = 'invalid_tier'
WHERE id = (SELECT id FROM subscription_monetization LIMIT 1);
-- Expected: CHECK constraint violation or type error
```

4. Verify seed data:
```sql
SELECT COUNT(*) FROM providers;          -- Expected: 4
SELECT COUNT(*) FROM model_provider_pricing; -- Expected: 4+
SELECT COUNT(*) FROM pricing_configs;    -- Expected: 3+
```

**Estimated Time**: 1-2 hours

---

**Phase 1 Total Time**: 10-14 hours (1.5-2 days)

---

## Phase 2: High Priority Fixes (Week 2)

**Priority**: 🟠 **HIGH** - Required for optimal performance and data integrity

### Task 2.1: Add Missing Indexes

**File**: `backend/prisma/schema.prisma`

**Actions**:

1. Add composite index to SubscriptionMonetization:
```prisma
model SubscriptionMonetization {
  // ... existing fields ...

  @@index([userId, currentPeriodEnd, status], name: "idx_subscription_user_period_status")
}
```

2. Add composite index to CouponRedemption:
```prisma
model CouponRedemption {
  // ... existing fields ...

  @@index([userId, redemptionStatus, redemptionDate], name: "idx_coupon_redemption_user_status_date")
}
```

3. Add composite index to ProrationEvent:
```prisma
model ProrationEvent {
  // ... existing fields ...

  @@index([subscriptionId, effectiveDate, status], name: "idx_proration_subscription_effective_status")
}
```

4. Add composite index to BillingInvoice:
```prisma
model BillingInvoice {
  // ... existing fields ...

  @@index([userId, status, periodEnd], name: "idx_billing_invoice_user_status_period_end")
}
```

5. Generate migration for indexes:
```bash
npx prisma migrate dev --name add_composite_indexes_for_cross_plan_queries
```

**Estimated Time**: 2 hours

---

### Task 2.2: Fix Coupon Cascade Rules

**File**: `backend/prisma/schema.prisma`

**Problem**: Deleting a coupon CASCADE deletes all redemption history (data loss)

**Actions**:

1. Change CouponRedemption cascade rule:
```prisma
model CouponRedemption {
  // CHANGE FROM:
  // coupon Coupon @relation(fields: [couponId], references: [id], onDelete: Cascade)

  // TO:
  coupon Coupon? @relation(fields: [couponId], references: [id], onDelete: SetNull)

  // Make couponId nullable
  couponId String? @map("coupon_id") @db.Uuid
}
```

2. Add soft delete to Coupon table:
```prisma
model Coupon {
  // ... existing fields ...

  deletedAt DateTime? @map("deleted_at")
  deletedBy String?   @map("deleted_by") @db.Uuid

  @@index([isActive, deletedAt])
}
```

3. Update application logic to check `deletedAt` instead of hard delete:
```typescript
// Instead of: await prisma.coupon.delete({ where: { id } })
await prisma.coupon.update({
  where: { id },
  data: {
    isActive: false,
    deletedAt: new Date(),
    deletedBy: adminUserId,
  },
});
```

4. Generate migration:
```bash
npx prisma migrate dev --name change_coupon_cascade_to_set_null_and_add_soft_delete
```

**Estimated Time**: 2 hours

---

### Task 2.3: Add BYOK Tracking Field

**File**: `backend/prisma/schema.prisma`

**Actions**:

1. Add byokEnabled field to PerpetualLicense:
```prisma
model PerpetualLicense {
  // ... existing fields ...

  byokEnabled Boolean @default(true) @map("byok_enabled")
  // If true, user uses own API keys (no credit deduction)
  // If false, user uses cloud credits (hybrid mode)

  @@index([byokEnabled, status])
}
```

2. Generate migration:
```bash
npx prisma migrate dev --name add_byok_enabled_field_to_perpetual_license
```

3. Update application logic to check byokEnabled before deducting credits:
```typescript
// In TokenUsageService.deductCredits()
const license = await prisma.perpetualLicense.findFirst({
  where: {
    userId: userId,
    status: 'active',
  },
});

if (license && license.byokEnabled) {
  // BYOK mode: Do NOT deduct credits
  return {
    creditsDeducted: 0,
    byokMode: true,
  };
}

// Otherwise: Deduct credits normally
return await deductCreditsFromBalance(userId, creditsNeeded);
```

**Estimated Time**: 2 hours

---

### Task 2.4: Performance Benchmarking

**Actions**:

1. Create benchmark script `backend/scripts/benchmark-queries.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

async function benchmark(name: string, queryFn: () => Promise<any>) {
  const start = performance.now();
  const result = await queryFn();
  const end = performance.now();
  const duration = end - start;

  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return { name, duration, result };
}

async function main() {
  console.log('Running database query benchmarks...\n');

  // Benchmark 1: User balance lookup
  await benchmark('User balance lookup', async () => {
    return await prisma.userCreditBalance.findUnique({
      where: { userId: 'test-user-id' },
    });
  });

  // Benchmark 2: User token history (30 days)
  await benchmark('User token history (30 days)', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await prisma.tokenUsageLedger.findMany({
      where: {
        userId: 'test-user-id',
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // Benchmark 3: Coupon validation
  await benchmark('Coupon validation', async () => {
    return await prisma.coupon.findUnique({
      where: { code: 'BLACKFRIDAY25' },
      include: {
        usageLimits: true,
        validationRules: { where: { isActive: true } },
      },
    });
  });

  // Benchmark 4: Cross-plan query (subscription + credit usage)
  await benchmark('Subscription + credit usage', async () => {
    return await prisma.subscriptionMonetization.findFirst({
      where: { userId: 'test-user-id' },
      include: {
        creditAllocations: true,
        user: {
          include: {
            creditBalance: true,
          },
        },
      },
    });
  });

  console.log('\n✅ Benchmarks complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

2. Run benchmarks:
```bash
npx ts-node backend/scripts/benchmark-queries.ts
```

3. Document results and identify slow queries (>100ms)

4. Add indexes for slow queries

**Estimated Time**: 3 hours

---

**Phase 2 Total Time**: 9 hours (1.5 days)

---

## Phase 3: Medium Priority Fixes (Week 3)

**Priority**: 🟡 **MEDIUM** - Important for feature completeness

### Task 3.1: Add Credit Expiration Tracking

**File**: `backend/prisma/schema.prisma`

**Actions**:

1. Add expiration fields to CreditAllocation:
```prisma
model CreditAllocation {
  // ... existing fields ...

  expiresAt          DateTime? @map("expires_at")
  // NULL for perpetual credits, set for promotional credits

  appliedToBalanceAt DateTime? @map("applied_to_balance_at")
  // Timestamp when applied to user_credit_balance (Plan 112)

  creditType String @default("subscription") @map("credit_type") @db.VarChar(50)
  // Values: "subscription", "bonus", "referral", "coupon", "admin_grant"
}
```

2. Generate migration:
```bash
npx prisma migrate dev --name add_credit_expiration_tracking
```

3. Implement expiration logic in CreditService:
```typescript
// Deduct credits from soonest-expiring sources first
async function deductCredits(userId: string, amount: number) {
  const sources = await prisma.userCreditSource.findMany({
    where: {
      userId: userId,
      expiresAt: { gte: new Date() }, // Not expired
    },
    orderBy: { expiresAt: 'asc' }, // Soonest expiring first
  });

  let remaining = amount;
  for (const source of sources) {
    const deductAmount = Math.min(remaining, source.amount);

    await prisma.userCreditSource.update({
      where: { id: source.id },
      data: { amount: source.amount - deductAmount },
    });

    remaining -= deductAmount;
    if (remaining === 0) break;
  }

  if (remaining > 0) {
    throw new Error('Insufficient credits');
  }
}
```

**Estimated Time**: 3 hours

---

### Task 3.2: Add Coupon Acquisition Tracking

**File**: `backend/prisma/schema.prisma`

**Actions**:

1. Add acquisitionCouponCode field to PerpetualLicense:
```prisma
model PerpetualLicense {
  // ... existing fields ...

  acquisitionCouponCode String? @map("acquisition_coupon_code") @db.VarChar(50)
  // Tracks if license was granted via coupon (e.g., "BYOK2025")

  @@index([acquisitionCouponCode])
}
```

2. Update BYOK coupon application logic:
```typescript
// When applying BYOK coupon
const license = await prisma.perpetualLicense.create({
  data: {
    userId: userId,
    licenseKey: generateLicenseKey(),
    purchasePriceUsd: 0.00,
    purchasedVersion: '1.0.0',
    eligibleUntilVersion: '1.99.99',
    maxActivations: 3,
    status: 'active',
    byokEnabled: true,
    acquisitionCouponCode: 'BYOK2025', // Track coupon
  },
});
```

3. Generate migration:
```bash
npx prisma migrate dev --name add_coupon_acquisition_tracking_to_perpetual_license
```

**Estimated Time**: 2 hours

---

### Task 3.3: Optimize Connection Pooling

**File**: `backend/prisma/schema.prisma` (datasource config)

**Actions**:

1. Update DATABASE_URL environment variable:
```env
# In .env file
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20&pool_timeout=10"
```

2. Calculate optimal connection limit:
```
connection_limit = (2 × CPU_cores) + effective_spindle_count

For 8-core server with SSD:
connection_limit = (2 × 8) + 4 = 20 connections
```

3. Configure Prisma client with connection management:
```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

4. Test connection pooling under load:
```bash
# Use k6 or Apache Bench
k6 run backend/tests/load/api-requests.js
```

**Estimated Time**: 2 hours

---

**Phase 3 Total Time**: 7 hours (1 day)

---

## Phase 4: Integration Testing (Week 4)

**Priority**: 🟢 **TESTING** - Validate all integrations work correctly

### Test 1: New User Subscription Flow

**Test Case**:
```typescript
// backend/tests/integration/subscription-flow.test.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test('New user subscription creates credit balance', async () => {
  // 1. Create user
  const user = await prisma.user.create({
    data: {
      email: 'newuser@example.com',
      role: 'user',
    },
  });

  // 2. Create subscription
  const subscription = await prisma.subscriptionMonetization.create({
    data: {
      userId: user.id,
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'active',
      basePriceUsd: 19.00,
      monthlyCreditAllocation: 20000,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // 3. Create credit allocation
  const allocation = await prisma.creditAllocation.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      amount: 20000,
      source: 'subscription',
      allocationPeriodStart: new Date(),
      allocationPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // 4. Update user credit balance
  const balance = await prisma.userCreditBalance.upsert({
    where: { userId: user.id },
    update: {
      amount: { increment: 20000 },
    },
    create: {
      userId: user.id,
      amount: 20000,
    },
  });

  // Assertions
  expect(subscription.tier).toBe('pro');
  expect(allocation.amount).toBe(20000);
  expect(balance.amount).toBe(20000);

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
```

**Estimated Time**: 2 hours

---

### Test 2: Pro → Pro Max Proration

**Test Case**:
```typescript
test('Tier upgrade creates proration event and allocates credits', async () => {
  // Setup: User on Pro tier with 15 days remaining
  const user = await createTestUser();
  const subscription = await createProSubscription(user.id, 15); // 15 days left

  // Action: Upgrade to Pro Max
  const prorationEvent = await prisma.prorationEvent.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      fromTier: 'pro',
      toTier: 'pro_max',
      changeType: 'upgrade',
      daysRemaining: 15,
      daysInCycle: 30,
      unusedCreditValueUsd: 9.50, // $19 * 15/30
      newTierProratedCostUsd: 19.50, // $39 * 15/30
      netChargeUsd: 10.00, // $19.50 - $9.50
      effectiveDate: new Date(),
      status: 'pending',
    },
  });

  // Update subscription tier
  await prisma.subscriptionMonetization.update({
    where: { id: subscription.id },
    data: { tier: 'pro_max', monthlyCreditAllocation: 50000 },
  });

  // Allocate prorated credits (50000 * 15/30 = 25000)
  await prisma.creditAllocation.create({
    data: {
      userId: user.id,
      subscriptionId: subscription.id,
      amount: 25000,
      source: 'subscription',
      allocationPeriodStart: new Date(),
      allocationPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });

  // Update credit balance
  await prisma.userCreditBalance.update({
    where: { userId: user.id },
    data: { amount: { increment: 25000 } },
  });

  // Assertions
  const updatedSubscription = await prisma.subscriptionMonetization.findUnique({
    where: { id: subscription.id },
  });
  expect(updatedSubscription.tier).toBe('pro_max');

  const balance = await prisma.userCreditBalance.findUnique({
    where: { userId: user.id },
  });
  expect(balance.amount).toBeGreaterThanOrEqual(25000);

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
```

**Estimated Time**: 2 hours

---

### Test 3: Coupon Redemption + Credit Allocation

**Test Case**:
```typescript
test('Credit grant coupon updates user balance', async () => {
  // Setup
  const user = await createTestUser();
  const coupon = await prisma.coupon.create({
    data: {
      code: 'REFER20',
      couponType: 'fixed_amount_discount',
      discountValue: 20.00,
      discountType: 'credits',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  // Action: Redeem coupon
  const redemption = await prisma.couponRedemption.create({
    data: {
      couponId: coupon.id,
      userId: user.id,
      subscriptionId: null,
      redemptionDate: new Date(),
      discountAppliedUsd: 20.00,
      originalAmountUsd: 0,
      finalAmountUsd: -20.00, // Negative = credit
      redemptionStatus: 'success',
    },
  });

  // Allocate credits
  await prisma.creditAllocation.create({
    data: {
      userId: user.id,
      subscriptionId: null,
      amount: 20, // $20 = 20 credits ($1 = 1 credit)
      source: 'coupon',
      allocationPeriodStart: new Date(),
      allocationPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Update balance
  await prisma.userCreditBalance.upsert({
    where: { userId: user.id },
    update: { amount: { increment: 20 } },
    create: { userId: user.id, amount: 20 },
  });

  // Assertions
  const balance = await prisma.userCreditBalance.findUnique({
    where: { userId: user.id },
  });
  expect(balance.amount).toBe(20);

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
```

**Estimated Time**: 2 hours

---

### Test 4: Token Usage + Credit Deduction

**Test Case**:
```typescript
test('API request deducts credits from balance', async () => {
  // Setup: User with 1000 credits
  const user = await createTestUser();
  await prisma.userCreditBalance.create({
    data: { userId: user.id, amount: 1000 },
  });

  const provider = await prisma.provider.findFirst({
    where: { apiType: 'openai' },
  });

  // Action: Simulate API request
  const requestId = crypto.randomUUID();

  // 1. Record token usage
  const tokenUsage = await prisma.tokenUsageLedger.create({
    data: {
      requestId: requestId,
      userId: user.id,
      modelId: 'gpt-4o',
      providerId: provider.id,
      inputTokens: 1000,
      outputTokens: 2000,
      totalTokens: 3000,
      vendorCost: 0.015, // $0.005 * 1 + $0.015 * 2 = $0.035
      marginMultiplier: 1.5,
      creditValueUsd: 0.0225, // $0.015 * 1.5
      creditsDeducted: 23, // Round up from 22.5
      grossMarginUsd: 0.0075,
      requestType: 'completion',
      requestStartedAt: new Date(),
      requestCompletedAt: new Date(),
      status: 'success',
    },
  });

  // 2. Deduct credits
  const balanceBefore = await prisma.userCreditBalance.findUnique({
    where: { userId: user.id },
  });

  const deduction = await prisma.creditDeductionLedger.create({
    data: {
      userId: user.id,
      amount: -23,
      balanceBefore: balanceBefore.amount,
      balanceAfter: balanceBefore.amount - 23,
      requestId: requestId,
      tokenVendorCost: 0.015,
      marginMultiplier: 1.5,
      grossMargin: 0.0075,
      reason: 'api_completion',
      status: 'completed',
    },
  });

  await prisma.userCreditBalance.update({
    where: { userId: user.id },
    data: {
      amount: { decrement: 23 },
      lastDeductionAt: new Date(),
      lastDeductionAmount: 23,
    },
  });

  // 3. Link deduction to token usage
  await prisma.tokenUsageLedger.update({
    where: { id: tokenUsage.id },
    data: { deductionRecordId: deduction.id },
  });

  // Assertions
  const balance = await prisma.userCreditBalance.findUnique({
    where: { userId: user.id },
  });
  expect(balance.amount).toBe(977); // 1000 - 23

  const ledger = await prisma.creditDeductionLedger.findUnique({
    where: { requestId: requestId },
  });
  expect(ledger.balanceAfter).toBe(977);

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
```

**Estimated Time**: 3 hours

---

### Test 5: BYOK User (No Credit Deduction)

**Test Case**:
```typescript
test('BYOK user API request does not deduct credits', async () => {
  // Setup: User with perpetual license (BYOK enabled)
  const user = await createTestUser();
  const license = await prisma.perpetualLicense.create({
    data: {
      userId: user.id,
      licenseKey: 'REPHLO-TEST-1234-5678-9ABC',
      purchasePriceUsd: 199.00,
      purchasedVersion: '1.0.0',
      eligibleUntilVersion: '1.99.99',
      maxActivations: 3,
      status: 'active',
      byokEnabled: true, // ← BYOK mode
    },
  });

  await prisma.userCreditBalance.create({
    data: { userId: user.id, amount: 1000 },
  });

  const provider = await prisma.provider.findFirst({
    where: { apiType: 'openai' },
  });

  // Action: Simulate API request
  const requestId = crypto.randomUUID();

  // Check if user has BYOK enabled
  const activeLicense = await prisma.perpetualLicense.findFirst({
    where: {
      userId: user.id,
      status: 'active',
      byokEnabled: true,
    },
  });

  if (activeLicense) {
    // BYOK mode: Record usage but do NOT deduct credits
    await prisma.tokenUsageLedger.create({
      data: {
        requestId: requestId,
        userId: user.id,
        modelId: 'gpt-4o',
        providerId: provider.id,
        inputTokens: 1000,
        outputTokens: 2000,
        totalTokens: 3000,
        vendorCost: 0, // No vendor cost (user's own key)
        marginMultiplier: 0,
        creditValueUsd: 0,
        creditsDeducted: 0, // ← No deduction
        grossMarginUsd: 0,
        requestType: 'completion',
        requestStartedAt: new Date(),
        requestCompletedAt: new Date(),
        status: 'success',
        userTierAtRequest: 'perpetual',
      },
    });
  }

  // Assertions
  const balance = await prisma.userCreditBalance.findUnique({
    where: { userId: user.id },
  });
  expect(balance.amount).toBe(1000); // No deduction

  const tokenUsage = await prisma.tokenUsageLedger.findUnique({
    where: { requestId: requestId },
  });
  expect(tokenUsage.creditsDeducted).toBe(0);

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
```

**Estimated Time**: 2 hours

---

### Test 6: GDPR Deletion Cascade

**Test Case**:
```typescript
test('User deletion cascades to all related tables', async () => {
  // Setup: User with full data across all plans
  const user = await createTestUser();

  // Plan 109: Subscription
  const subscription = await createProSubscription(user.id);
  const allocation = await createCreditAllocation(user.id, subscription.id);
  const invoice = await createBillingInvoice(user.id, subscription.id);

  // Plan 110: Perpetual license
  const license = await createPerpetualLicense(user.id);

  // Plan 111: Coupon redemption
  const coupon = await createTestCoupon();
  const redemption = await createCouponRedemption(user.id, coupon.id, subscription.id);

  // Plan 112: Credit balance + token usage
  const balance = await prisma.userCreditBalance.create({
    data: { userId: user.id, amount: 1000 },
  });
  const tokenUsage = await createTokenUsage(user.id);

  // Action: Delete user (GDPR)
  await prisma.user.delete({ where: { id: user.id } });

  // Assertions: All related records should be deleted (CASCADE)
  const deletedSubscription = await prisma.subscriptionMonetization.findUnique({
    where: { id: subscription.id },
  });
  expect(deletedSubscription).toBeNull();

  const deletedAllocation = await prisma.creditAllocation.findUnique({
    where: { id: allocation.id },
  });
  expect(deletedAllocation).toBeNull();

  const deletedLicense = await prisma.perpetualLicense.findUnique({
    where: { id: license.id },
  });
  expect(deletedLicense).toBeNull();

  // Coupon redemption: Should keep redemption but set userId = NULL (SET NULL)
  const deletedRedemption = await prisma.couponRedemption.findUnique({
    where: { id: redemption.id },
  });
  expect(deletedRedemption).toBeNull(); // Or userId should be NULL if we change cascade

  const deletedBalance = await prisma.userCreditBalance.findUnique({
    where: { id: balance.id },
  });
  expect(deletedBalance).toBeNull();

  const deletedTokenUsage = await prisma.tokenUsageLedger.findUnique({
    where: { id: tokenUsage.id },
  });
  expect(deletedTokenUsage).toBeNull();

  console.log('✅ GDPR deletion cascade successful');
});
```

**Estimated Time**: 2 hours

---

**Phase 4 Total Time**: 13 hours (2 days)

---

## Summary & Timeline

### Timeline Overview

| Phase | Duration | Status | Tasks |
|-------|----------|--------|-------|
| **Phase 1: Critical Fixes** | Week 1 (2 days) | 🔴 **CRITICAL** | Add Plan 112 tables, fix enums, generate migration |
| **Phase 2: High Priority** | Week 2 (1.5 days) | 🟠 **HIGH** | Add indexes, fix cascade rules, add BYOK field |
| **Phase 3: Medium Priority** | Week 3 (1 day) | 🟡 **MEDIUM** | Add expiration tracking, optimize pooling |
| **Phase 4: Testing** | Week 4 (2 days) | 🟢 **TESTING** | Integration tests, benchmarks, load tests |

**Total Time**: 4-5 weeks

---

### Deliverables Checklist

- [ ] Plan 112 tables added to Prisma schema
- [ ] Enum definitions fixed (SubscriptionTier, SubscriptionStatus)
- [ ] Migration generated and tested
- [ ] Seed data for Plan 112 providers and pricing
- [ ] User model relations updated
- [ ] Composite indexes added for cross-plan queries
- [ ] Coupon cascade rules changed to SET NULL
- [ ] Soft delete added to Coupon table
- [ ] byokEnabled field added to PerpetualLicense
- [ ] Credit expiration tracking implemented
- [ ] Coupon acquisition tracking added
- [ ] Connection pooling optimized
- [ ] 6 integration tests passing
- [ ] Query benchmarks documented
- [ ] Load tests completed

---

### Risk Mitigation

**Risk 1**: Migration fails due to existing data
- **Mitigation**: Backup database before migration, test on staging first

**Risk 2**: Performance degradation after adding indexes
- **Mitigation**: Benchmark before and after, use EXPLAIN ANALYZE

**Risk 3**: Cascade rule changes break existing code
- **Mitigation**: Update application logic before migration, add tests

**Risk 4**: Generated columns not supported in Prisma
- **Mitigation**: Add generated columns manually in migration SQL

**Risk 5**: BYOK field breaks existing perpetual licenses
- **Mitigation**: Set default value to `true`, backfill existing records

---

### Success Criteria

**Phase 1**:
- ✅ Plan 112 migration applies without errors
- ✅ All seed data inserts successfully
- ✅ Foreign keys enforce referential integrity
- ✅ Enum constraints validate tier values

**Phase 2**:
- ✅ All cross-plan queries execute in <100ms
- ✅ Coupon deletion preserves redemption history
- ✅ BYOK users identified correctly

**Phase 3**:
- ✅ Promotional credits expire correctly
- ✅ BYOK coupons tracked on licenses
- ✅ Connection pool handles 1000 concurrent requests

**Phase 4**:
- ✅ All 6 integration tests pass
- ✅ GDPR deletion cascades correctly
- ✅ Load test: 1000 requests/sec with <500ms p99 latency

---

**Document End**
