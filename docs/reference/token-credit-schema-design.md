# Token-to-Credit Conversion Database Schema Design

**Document ID**: token-credit-schema-design.md
**Version**: 1.0
**Created**: 2025-11-09
**Status**: Implementation Ready
**Related Plan**: docs/plan/112-token-to-credit-conversion-mechanism.md

---

## Executive Summary

This document details the complete database schema design for the Token-to-Credit Conversion Mechanism (Plan 112). The schema ensures every API request generates positive margin through precise vendor cost tracking, configurable margin multipliers, and atomic credit deductions.

**Key Design Principles**:
- **Immutability**: Token usage and credit deductions are append-only ledgers
- **Precision**: DECIMAL(10,8) for vendor costs (handles micro-dollar amounts like $0.00000123)
- **Performance**: Strategic indexes for common query patterns (user+date range)
- **Atomicity**: Transaction-safe credit deductions with balance consistency
- **Audit Trail**: Complete historical tracking of pricing changes and deductions

---

## Schema Overview

### New Tables (7 tables total)

1. **Provider** - Vendor registry (OpenAI, Anthropic, Google, Azure)
2. **ModelProviderPricing** - Vendor token pricing with historical tracking
3. **PricingConfig** - Margin multiplier configuration by tier/provider/model
4. **TokenUsageLedger** - Immutable token consumption records
5. **UserCreditBalance** - Single source of truth for credit balances
6. **CreditDeductionLedger** - Immutable credit deduction audit trail
7. **UserCreditSource** - Track credit sources (monthly, bonus, referral, coupon)

### Supporting Tables (2 analytics tables)

8. **TokenUsageDailySummary** - Aggregated token analytics
9. **CreditUsageDailySummary** - Aggregated credit analytics

---

## Detailed Schema Design

### 1. Provider Table

**Purpose**: Registry of AI model providers (vendors)

**Design Decisions**:
- UUID primary keys for flexibility in distributed systems
- `apiType` enum for consistent provider identification
- Soft delete with `isEnabled` flag (preserves historical data)

```prisma
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

**Seed Data**:
```typescript
const providers = [
  { name: "OpenAI", apiType: "openai" },
  { name: "Anthropic", apiType: "anthropic" },
  { name: "Google", apiType: "google" },
  { name: "Azure OpenAI", apiType: "azure" },
];
```

---

### 2. ModelProviderPricing Table

**Purpose**: Vendor token pricing with historical tracking and change detection

**Design Decisions**:
- DECIMAL(10,8) for prices: Handles micro-costs like $0.00000123 per token
- Historical tracking with `effectiveFrom`/`effectiveUntil` range
- Price change detection fields for automatic margin adjustments
- Cache pricing fields for Anthropic/Google cache features
- Weekly verification tracking to detect vendor rate changes

```prisma
model ModelProviderPricing {
  id                         String    @id @default(uuid()) @db.Uuid

  // Identification
  providerId                 String    @map("provider_id") @db.Uuid
  modelName                  String    @map("model_name") @db.VarChar(255)
  vendorModelId              String?   @unique @map("vendor_model_id") @db.VarChar(255)

  // Pricing (per 1,000 tokens) - DECIMAL(10,8) for precision
  inputPricePer1k            Decimal   @map("input_price_per_1k") @db.Decimal(10, 8)
  outputPricePer1k           Decimal   @map("output_price_per_1k") @db.Decimal(10, 8)

  // Optional: Cache pricing (Anthropic/Google features)
  cacheInputPricePer1k       Decimal?  @map("cache_input_price_per_1k") @db.Decimal(10, 8)
  cacheHitPricePer1k         Decimal?  @map("cache_hit_price_per_1k") @db.Decimal(10, 8)

  // Effective date tracking (for historical pricing)
  effectiveFrom              DateTime  @map("effective_from")
  effectiveUntil             DateTime? @map("effective_until")

  // Rate change detection
  previousPriceInput         Decimal?  @map("previous_price_input") @db.Decimal(10, 8)
  previousPriceOutput        Decimal?  @map("previous_price_output") @db.Decimal(10, 8)
  priceChangePercentInput    Decimal?  @map("price_change_percent_input") @db.Decimal(5, 2)
  priceChangePercentOutput   Decimal?  @map("price_change_percent_output") @db.Decimal(5, 2)
  detectedAt                 DateTime? @map("detected_at")

  // Metadata
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

**Why DECIMAL(10,8)?**
- OpenAI Gemini Flash input: $0.0000375 per 1k tokens = 0.00000375 requires 8 decimal places
- Total 10 digits allows prices up to $99.99999999 per 1k tokens (future-proof)

---

### 3. PricingConfig Table

**Purpose**: Margin multiplier configuration with scope hierarchy and approval workflow

**Design Decisions**:
- Scope hierarchy: tier → provider → model → combination (most specific wins)
- Approval workflow for changes >5% impact (safety)
- Impact prediction fields for simulation
- Historical tracking with reason codes

```prisma
model PricingConfig {
  id                           String    @id @default(uuid()) @db.Uuid

  // Scope: What does this multiplier apply to?
  scopeType                    String    @map("scope_type") @db.VarChar(20)
  // Values: "tier", "provider", "model", "combination"

  // Tier Scope (NULL = all tiers)
  subscriptionTier             SubscriptionTier? @map("subscription_tier")

  // Provider Scope (NULL = all providers)
  providerId                   String?   @map("provider_id") @db.Uuid

  // Model Scope (NULL = all models)
  modelId                      String?   @map("model_id") @db.VarChar(255)

  // Multiplier Value
  marginMultiplier             Decimal   @map("margin_multiplier") @db.Decimal(4, 2)
  // e.g., 1.50 = 1.5x = 33% margin
  targetGrossMarginPercent     Decimal?  @map("target_gross_margin_percent") @db.Decimal(5, 2)
  // e.g., 33.33 = 33.33% margin

  // Effective Date Range
  effectiveFrom                DateTime  @map("effective_from")
  effectiveUntil               DateTime? @map("effective_until")

  // Reason for Change
  reason                       String    @map("reason") @db.VarChar(50)
  // Values: "initial_setup", "vendor_price_change", "tier_optimization",
  //         "margin_protection", "manual_adjustment"
  reasonDetails                String?   @map("reason_details") @db.Text

  // Change History
  previousMultiplier           Decimal?  @map("previous_multiplier") @db.Decimal(4, 2)
  changePercent                Decimal?  @map("change_percent") @db.Decimal(5, 2)

  // Impact Prediction (for simulation)
  expectedMarginChangeDollars  Decimal?  @map("expected_margin_change_dollars") @db.Decimal(12, 2)
  expectedRevenueImpact        Decimal?  @map("expected_revenue_impact") @db.Decimal(12, 2)

  // Admin Metadata
  createdBy                    String    @map("created_by") @db.Uuid
  approvedBy                   String?   @map("approved_by") @db.Uuid
  requiresApproval             Boolean   @default(true) @map("requires_approval")
  approvalStatus               String    @default("pending") @map("approval_status") @db.VarChar(20)
  // Values: "pending", "approved", "rejected"

  // Monitoring
  isActive                     Boolean   @default(true) @map("is_active")
  monitored                    Boolean   @default(true) @map("monitored")

  createdAt                    DateTime  @default(now()) @map("created_at")
  updatedAt                    DateTime  @updatedAt @map("updated_at")

  // Relations
  provider    Provider? @relation(fields: [providerId], references: [id], onDelete: Cascade)
  createdByUser User    @relation("PricingConfigCreatedBy", fields: [createdBy], references: [id])
  approvedByUser User? @relation("PricingConfigApprovedBy", fields: [approvedBy], references: [id])

  @@index([scopeType])
  @@index([subscriptionTier, isActive])
  @@index([providerId, isActive])
  @@index([isActive, effectiveFrom])
  @@index([approvalStatus])
  @@map("pricing_configs")
}
```

**Configuration Priority (Cascade Lookup)**:
1. Combination (tier + provider + model) - Most specific
2. Model (provider + model, any tier)
3. Provider (provider, any model/tier)
4. Tier (tier, any provider/model)
5. Default fallback (1.5x)

---

### 4. TokenUsageLedger Table

**Purpose**: Immutable audit trail of every API request with token counts and costs

**Design Decisions**:
- Append-only (no updates after creation)
- GENERATED columns for totalTokens and grossMargin (database-enforced calculations)
- Support for streaming completions with segment tracking
- Stores tier at request time (for auditing if tier changes)
- Links to credit deduction via deductionRecordId

```prisma
model TokenUsageLedger {
  id                    String    @id @default(uuid()) @db.Uuid
  requestId             String    @unique @map("request_id") @db.Uuid

  // User & Subscription Context
  userId                String    @map("user_id") @db.Uuid
  subscriptionId        String?   @map("subscription_id") @db.Uuid

  // Model & Provider
  modelId               String    @map("model_id") @db.VarChar(255)
  providerId            String    @map("provider_id") @db.Uuid

  // Token Counts
  inputTokens           Int       @map("input_tokens")
  outputTokens          Int       @map("output_tokens")
  cachedInputTokens     Int       @default(0) @map("cached_input_tokens")
  // Generated column - database calculates this automatically
  totalTokens           Int       @map("total_tokens")
  // PostgreSQL: GENERATED ALWAYS AS (input_tokens + output_tokens) STORED

  // Costing
  vendorCost            Decimal   @map("vendor_cost") @db.Decimal(10, 8)
  marginMultiplier      Decimal   @map("margin_multiplier") @db.Decimal(4, 2)
  creditValueUsd        Decimal   @map("credit_value_usd") @db.Decimal(10, 8)
  creditsDeducted       Int       @map("credits_deducted")
  // Generated column - database calculates margin automatically
  grossMarginUsd        Decimal   @map("gross_margin_usd") @db.Decimal(10, 8)
  // PostgreSQL: GENERATED ALWAYS AS (credit_value_usd - vendor_cost) STORED

  // Request Type
  requestType           String    @map("request_type") @db.VarChar(20)
  // Values: "completion", "streaming", "batch"
  streamingSegments     Int?      @map("streaming_segments")

  // Timing
  requestStartedAt      DateTime  @map("request_started_at")
  requestCompletedAt    DateTime  @map("request_completed_at")
  processingTimeMs      Int?      @map("processing_time_ms")

  // Status
  status                String    @default("success") @map("status") @db.VarChar(20)
  // Values: "success", "failed", "cancelled", "rate_limited"
  errorMessage          String?   @map("error_message") @db.Text
  isStreamingComplete   Boolean   @default(true) @map("is_streaming_complete")

  // Metadata (for auditing)
  userTierAtRequest     String?   @map("user_tier_at_request") @db.VarChar(50)
  region                String?   @map("region") @db.VarChar(50)

  // Link to deduction record
  deductionRecordId     String?   @map("deduction_record_id") @db.Uuid

  createdAt             DateTime  @default(now()) @map("created_at")

  // Relations
  user         User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription?         @relation(fields: [subscriptionId], references: [id])
  provider     Provider              @relation(fields: [providerId], references: [id])
  deduction    CreditDeductionLedger? @relation(fields: [deductionRecordId], references: [id])

  @@index([userId, createdAt])
  @@index([modelId, createdAt])
  @@index([providerId, createdAt])
  @@index([userId, vendorCost])
  @@index([requestId])
  @@index([status])
  @@map("token_usage_ledger")
}
```

**Index Justification**:
- `userId, createdAt`: Most common query - user token history by date
- `modelId, createdAt`: Model analytics over time
- `providerId, createdAt`: Provider cost analysis
- `userId, vendorCost`: Cost aggregation per user

---

### 5. UserCreditBalance Table

**Purpose**: Single source of truth for user credit balances

**Design Decisions**:
- One row per user (enforced by unique userId)
- Tracks last deduction for debugging
- Updated atomically within transactions
- INT credits (whole numbers only, no fractional credits)

```prisma
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

---

### 6. CreditDeductionLedger Table

**Purpose**: Immutable audit trail of every credit deduction

**Design Decisions**:
- Append-only ledger (no updates)
- Balance snapshots (before/after) for verification
- Links to token usage via requestId
- Reversal tracking for refunds/corrections
- Status tracking for failed deductions

```prisma
model CreditDeductionLedger {
  id                String    @id @default(uuid()) @db.Uuid
  userId            String    @map("user_id") @db.Uuid

  // Deduction details
  amount            Int
  balanceBefore     Int       @map("balance_before")
  balanceAfter      Int       @map("balance_after")

  // Link to token usage
  requestId         String?   @unique @map("request_id") @db.Uuid
  tokenVendorCost   Decimal?  @map("token_vendor_cost") @db.Decimal(10, 8)
  marginMultiplier  Decimal?  @map("margin_multiplier") @db.Decimal(4, 2)
  grossMargin       Decimal?  @map("gross_margin") @db.Decimal(10, 8)

  // Reason and status
  reason            String    @map("reason") @db.VarChar(50)
  // Values: "api_completion", "subscription_allocation", "manual_adjustment",
  //         "refund", "overage", "bonus", "referral", "coupon"
  status            String    @default("pending") @map("status") @db.VarChar(20)
  // Values: "pending", "completed", "reversed"

  // Reversal tracking
  reversedAt        DateTime? @map("reversed_at")
  reversedBy        String?   @map("reversed_by") @db.Uuid
  reversalReason    String?   @map("reversal_reason") @db.Text

  // Timestamps
  processedAt       DateTime  @default(now()) @map("processed_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  // Relations
  user                User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  reversedByUser      User?              @relation("CreditReversedBy", fields: [reversedBy], references: [id])
  tokenUsage          TokenUsageLedger?  @relation()

  @@index([userId, createdAt])
  @@index([requestId])
  @@index([status])
  @@index([reason])
  @@map("credit_deduction_ledger")
}
```

---

### 7. UserCreditSource Table

**Purpose**: Track credit sources and expiration (monthly, bonus, referral, coupon)

**Design Decisions**:
- Supports credit expiration (soonest expiring deducted first)
- Tracks source for analytics and reporting
- Allows multiple credit buckets per user

```prisma
model UserCreditSource {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid

  source     String    @map("source") @db.VarChar(50)
  // Values: "monthly_allocation", "referral_reward", "coupon_promotion",
  //         "bonus", "refund", "admin_grant"
  amount     Int

  expiresAt  DateTime? @map("expires_at")
  // NULL = no expiration

  createdAt  DateTime  @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
  @@index([source])
  @@map("user_credit_source")
}
```

---

### 8. TokenUsageDailySummary Table (Analytics)

**Purpose**: Pre-aggregated daily statistics for performance

**Design Decisions**:
- Prevents slow queries over millions of ledger rows
- Updated via scheduled job or trigger
- Unique constraint on userId + summaryDate

```prisma
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
  // e.g., 98.50 = 98.5% success rate

  createdAt            DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, summaryDate])
  @@index([userId, summaryDate])
  @@index([summaryDate])
  @@map("token_usage_daily_summary")
}
```

---

### 9. CreditUsageDailySummary Table (Analytics)

**Purpose**: Pre-aggregated daily credit statistics

```prisma
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

---

## Schema Relationships Diagram

```
User (existing)
  ├─ 1:1  UserCreditBalance (new)
  ├─ 1:N  UserCreditSource (new)
  ├─ 1:N  TokenUsageLedger (new)
  ├─ 1:N  CreditDeductionLedger (new)
  ├─ 1:N  TokenUsageDailySummary (new)
  └─ 1:N  CreditUsageDailySummary (new)

Provider (new)
  ├─ 1:N  ModelProviderPricing (new)
  ├─ 1:N  PricingConfig (new)
  └─ 1:N  TokenUsageLedger (new)

TokenUsageLedger
  └─ N:1  CreditDeductionLedger (via requestId)

Subscription (existing)
  └─ 1:N  TokenUsageLedger (new)
```

---

## Generated Columns (PostgreSQL)

### Why Use GENERATED Columns?

**Benefits**:
1. **Consistency**: Database enforces calculation logic
2. **Performance**: Pre-calculated, no runtime overhead
3. **Integrity**: Cannot be manually overridden
4. **Simplicity**: Application code doesn't repeat logic

### Generated Column Definitions

```sql
-- In token_usage_ledger table
total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED

gross_margin_usd DECIMAL(10,8) GENERATED ALWAYS AS (credit_value_usd - vendor_cost) STORED
```

**Prisma Limitation**: Prisma doesn't natively support GENERATED columns in schema.
**Workaround**: Define in migration SQL, mark as optional in Prisma schema.

---

## Index Strategy

### Primary Indexes (Automatic)

- All `@id` fields
- All `@unique` fields
- All foreign key fields

### Custom Indexes

| Table | Index | Justification |
|-------|-------|---------------|
| **ModelProviderPricing** | `[providerId, modelName, isActive]` | Fast lookup for active pricing |
| | `[effectiveFrom, effectiveUntil]` | Historical pricing queries |
| **PricingConfig** | `[subscriptionTier, isActive]` | Tier-based multiplier lookup |
| | `[providerId, isActive]` | Provider-specific multipliers |
| **TokenUsageLedger** | `[userId, createdAt]` | User history queries (most common) |
| | `[modelId, createdAt]` | Model analytics |
| | `[providerId, createdAt]` | Provider cost analysis |
| | `[userId, vendorCost]` | Cost aggregation |
| **CreditDeductionLedger** | `[userId, createdAt]` | User deduction history |
| | `[requestId]` | Link to token usage |
| **UserCreditSource** | `[userId, expiresAt]` | Expiration-based deduction order |

**Performance Target**: <50ms for common queries (user history, balance lookup)

---

## Data Integrity Constraints

### Foreign Key Constraints

| Constraint | Action on Delete |
|------------|------------------|
| `TokenUsageLedger.userId → User.id` | CASCADE |
| `TokenUsageLedger.providerId → Provider.id` | RESTRICT (keep historical) |
| `TokenUsageLedger.subscriptionId → Subscription.id` | SET NULL |
| `CreditDeductionLedger.userId → User.id` | CASCADE |
| `UserCreditBalance.userId → User.id` | CASCADE |
| `ModelProviderPricing.providerId → Provider.id` | CASCADE |
| `PricingConfig.providerId → Provider.id` | CASCADE |

### Unique Constraints

- `Provider.name` - No duplicate provider names
- `UserCreditBalance.userId` - One balance per user
- `CreditDeductionLedger.requestId` - One deduction per request
- `TokenUsageLedger.requestId` - One usage record per request
- `ModelProviderPricing.[providerId, modelName, effectiveFrom]` - No duplicate pricing entries

---

## Transaction Isolation

### Critical Atomic Operations

**Credit Deduction Transaction** (Serializable Isolation):

```typescript
await prisma.$transaction(
  async (tx) => {
    // 1. Lock user balance (SELECT FOR UPDATE)
    const balance = await tx.userCreditBalance.findUnique({...});

    // 2. Validate sufficient credits
    if (balance.amount < creditsNeeded) throw Error;

    // 3. Deduct credits
    await tx.userCreditBalance.update({...});

    // 4. Record deduction
    await tx.creditDeductionLedger.create({...});

    // 5. Update token ledger
    await tx.tokenUsageLedger.update({...});
  },
  { isolationLevel: 'Serializable' }
);
```

**Why Serializable?**
- Prevents race conditions (concurrent deductions)
- Ensures balance never goes negative
- Maintains ledger consistency

---

## Migration Strategy

### Migration File Structure

```
backend/prisma/migrations/
└── 20251109_add_token_credit_conversion_system/
    └── migration.sql
```

### Migration Phases

1. **Create Provider table**
2. **Create ModelProviderPricing table**
3. **Create PricingConfig table**
4. **Create TokenUsageLedger table** (with GENERATED columns)
5. **Create UserCreditBalance table**
6. **Create CreditDeductionLedger table**
7. **Create UserCreditSource table**
8. **Create summary tables**
9. **Add foreign key constraints**
10. **Create indexes**

### Rollback Plan

Migration is reversible by:
1. Dropping new tables in reverse order
2. No modifications to existing tables
3. Data preserved in ledgers (can re-import if needed)

---

## Seed Data Requirements

### 1. Provider Seed Data

```typescript
const providers = [
  { name: "OpenAI", apiType: "openai", isEnabled: true },
  { name: "Anthropic", apiType: "anthropic", isEnabled: true },
  { name: "Google", apiType: "google", isEnabled: true },
  { name: "Azure OpenAI", apiType: "azure", isEnabled: true },
];
```

### 2. ModelProviderPricing Seed Data

**Current Pricing (November 2025)**:

| Provider | Model | Input (per 1k) | Output (per 1k) |
|----------|-------|---|---|
| OpenAI | gpt-4-turbo | $0.01000 | $0.03000 |
| OpenAI | gpt-4o | $0.00500 | $0.01500 |
| OpenAI | gpt-3.5-turbo | $0.00050 | $0.00150 |
| Anthropic | claude-3-5-sonnet | $0.00300 | $0.01500 |
| Anthropic | claude-3-opus | $0.01500 | $0.07500 |
| Anthropic | claude-3-haiku | $0.00025 | $0.00125 |
| Google | gemini-2-0-flash | $0.0000375 | $0.000150 |
| Google | gemini-1-5-pro | $0.00125 | $0.00500 |

### 3. PricingConfig Seed Data

**Tier-Based Multipliers**:

| Tier | Multiplier | Target Margin |
|------|------------|---------------|
| free | 2.0x | 50% |
| pro | 1.5x | 33% |
| enterprise | 1.2x | 17% |

---

## Design Decisions Summary

### 1. Why DECIMAL(10,8)?

**Problem**: Vendor prices are micro-dollars (e.g., $0.0000375)
**Solution**: 8 decimal places for precision, 10 total digits for future-proofing

### 2. Why Generated Columns?

**Problem**: Risk of calculation inconsistencies in application code
**Solution**: Database enforces calculations (totalTokens, grossMargin)

### 3. Why Separate Balance Table?

**Problem**: Frequent updates to User table cause lock contention
**Solution**: Dedicated UserCreditBalance table isolates balance updates

### 4. Why Append-Only Ledgers?

**Problem**: Need immutable audit trail for compliance
**Solution**: No UPDATE/DELETE on ledger tables, only INSERT

### 5. Why Daily Summary Tables?

**Problem**: Slow aggregation queries over millions of rows
**Solution**: Pre-aggregate daily stats via scheduled job

### 6. Why Scope Hierarchy in PricingConfig?

**Problem**: Need flexibility (tier-wide vs. model-specific multipliers)
**Solution**: Cascade lookup: combination → model → provider → tier → default

---

## Integration Points

### 1. With Existing Schema

**User Table**: Add relation to new tables
**Subscription Table**: Link to TokenUsageLedger for per-period tracking
**Model Table**: No changes (ModelProviderPricing uses modelName string)

### 2. With Application Code

**Services Required**:
- `CostCalculationService` - Lookup vendor pricing
- `MultiplierService` - Apply margin multiplier
- `CreditDeductionService` - Atomic balance updates
- `TokenTrackingService` - Capture API response tokens

### 3. With Admin Dashboard

**UI Components Needed**:
- Pricing config CRUD
- Multiplier simulation tool
- Vendor rate change alerts
- Margin tracking dashboard

---

## Query Performance Targets

| Query Type | Target Latency | Index Used |
|------------|----------------|------------|
| User balance lookup | <10ms | `UserCreditBalance.userId` |
| User token history (30 days) | <50ms | `TokenUsageLedger.[userId, createdAt]` |
| Cost aggregation per model | <100ms | `TokenUsageLedger.[modelId, createdAt]` |
| Daily summary lookup | <20ms | `TokenUsageDailySummary.[userId, summaryDate]` |
| Pricing config lookup | <30ms | `PricingConfig.[subscriptionTier, isActive]` |

---

## Schema Validation Checklist

- [x] All tables have primary keys (UUID)
- [x] Foreign key relationships defined
- [x] Indexes for common query patterns
- [x] Cascading rules documented
- [x] DECIMAL precision sufficient for micro-costs
- [x] INT credits (no fractional)
- [x] Generated columns for calculated fields
- [x] Unique constraints prevent duplicates
- [x] Soft deletes where needed (isActive flags)
- [x] Timestamps (createdAt, updatedAt) on all tables
- [x] Immutable ledgers (append-only)
- [x] Transaction isolation specified

---

## Next Steps

1. **Implement Prisma Schema** - Add models to schema.prisma
2. **Create Migration** - Generate SQL migration file
3. **Update Seed Data** - Add provider pricing and configs
4. **Build Services** - Cost calculation, deduction logic
5. **Create Admin UI** - Pricing management dashboard
6. **Testing** - Unit tests, integration tests, load tests

---

**Document End**
