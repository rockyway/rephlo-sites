# Plan 109: Subscription Monetization Database Schema Integration

**Document ID**: 018-plan-109-subscription-schema-integration.md
**Version**: 1.0
**Created**: 2025-11-09
**Status**: Implemented
**Related Plans**:
- Plan 109: Rephlo Desktop Monetization & Moderation Plan
- Plan 112: Token-to-Credit Conversion Mechanism
- Plan 115: Master Orchestration Plan

---

## Overview

This document describes the complete database schema implementation for Plan 109 (Subscription Monetization System) and its integration with Plan 112 (Token-to-Credit Conversion). It includes schema design decisions, table relationships, and integration points.

---

## Database Schema Architecture

### Core Tables (6 Tables)

#### 1. **subscription_monetization**
Manages complete user subscription lifecycle with Stripe integration.

```sql
CREATE TABLE subscription_monetization (
  id                      UUID PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Subscription Details
  tier                    VARCHAR(50) NOT NULL,  -- 'free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual'
  billing_cycle           VARCHAR(20) NOT NULL,  -- 'monthly', 'annual', 'lifetime'
  status                  VARCHAR(20) NOT NULL,  -- 'trial', 'active', 'past_due', 'cancelled', 'expired'

  -- Pricing
  base_price_usd          DECIMAL(10,2) NOT NULL,
  monthly_credit_allocation INT NOT NULL,

  -- Stripe Integration
  stripe_customer_id      VARCHAR(255) UNIQUE,
  stripe_subscription_id  VARCHAR(255) UNIQUE,

  -- Billing Period
  current_period_start    TIMESTAMP NOT NULL,
  current_period_end      TIMESTAMP NOT NULL,
  trial_ends_at           TIMESTAMP,

  -- Cancellation Tracking
  cancelled_at            TIMESTAMP,

  -- Timestamps
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_subscription_monetization_user_id ON subscription_monetization(user_id);
CREATE INDEX idx_subscription_monetization_status ON subscription_monetization(status);
CREATE INDEX idx_subscription_monetization_tier ON subscription_monetization(tier);
CREATE INDEX idx_subscription_monetization_current_period_end ON subscription_monetization(current_period_end);
CREATE INDEX idx_subscription_monetization_stripe_customer_id ON subscription_monetization(stripe_customer_id);
CREATE INDEX idx_subscription_monetization_stripe_subscription_id ON subscription_monetization(stripe_subscription_id);
```

**Design Decisions**:
- UUID primary keys for distributed system compatibility
- Denormalized `monthly_credit_allocation` for quick access (also in tier_config)
- Separate `stripe_customer_id` and `stripe_subscription_id` for Stripe reconciliation
- `cancelled_at` tracks when cancellation was requested (subscription ends at `current_period_end`)

---

#### 2. **subscription_tier_config**
Configuration table for subscription tier pricing and features.

```sql
CREATE TABLE subscription_tier_config (
  id                      UUID PRIMARY KEY,

  -- Tier Identification
  tier_name               VARCHAR(50) UNIQUE NOT NULL,  -- 'free', 'pro', 'pro_max', etc.

  -- Pricing
  monthly_price_usd       DECIMAL(10,2) NOT NULL,
  annual_price_usd        DECIMAL(10,2) NOT NULL,

  -- Credit Allocation
  monthly_credit_allocation INT NOT NULL,
  max_credit_rollover     INT NOT NULL,

  -- Features (JSONB for flexibility)
  features                JSONB DEFAULT '{}',

  -- Status
  is_active               BOOLEAN DEFAULT true,

  -- Timestamps
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX idx_subscription_tier_config_tier_name ON subscription_tier_config(tier_name);
```

**Features JSONB Structure**:
```json
{
  "apiAccess": true,
  "prioritySupport": true,
  "maxProjects": 50,
  "customModels": true,
  "analyticsAccess": "advanced",
  "rateLimit": "5000 requests/day",
  "dedicatedSupport": true,
  "sla": "99.9% uptime"
}
```

**Design Decisions**:
- JSONB `features` field for extensibility without schema migrations
- Separate monthly and annual pricing for billing flexibility
- `is_active` allows disabling tiers without deleting historical data

---

#### 3. **credit_allocation**
Tracks monthly credit grants to users from various sources.

```sql
CREATE TABLE credit_allocation (
  id                      UUID PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id         UUID REFERENCES subscription_monetization(id) ON DELETE SET NULL,

  -- Allocation Details
  amount                  INT NOT NULL,
  allocation_period_start TIMESTAMP NOT NULL,
  allocation_period_end   TIMESTAMP NOT NULL,

  -- Source Tracking
  source                  VARCHAR(50) NOT NULL,  -- 'subscription', 'bonus', 'admin_grant', 'referral', 'coupon'

  -- Timestamps
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_allocation_user_id ON credit_allocation(user_id);
CREATE INDEX idx_credit_allocation_subscription_id ON credit_allocation(subscription_id);
CREATE INDEX idx_credit_allocation_period ON credit_allocation(allocation_period_start, allocation_period_end);
CREATE INDEX idx_credit_allocation_source ON credit_allocation(source);
```

**Design Decisions**:
- Immutable ledger (no updates after creation)
- `source` tracking for analytics and debugging
- `subscription_id` nullable for non-subscription allocations (bonuses, coupons)
- Foreign key ON DELETE SET NULL preserves allocation history when subscription is deleted

**Integration with Plan 112**:
- This table feeds into `user_credit_balance` from Plan 112
- Each allocation creates/updates balance in the credit system
- `source` field allows tracking credit origin for margin analysis

---

#### 4. **billing_invoice**
Stripe invoice records for subscription billing.

```sql
CREATE TABLE billing_invoice (
  id                   UUID PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id      UUID REFERENCES subscription_monetization(id) ON DELETE SET NULL,

  -- Stripe Integration
  stripe_invoice_id    VARCHAR(255) UNIQUE NOT NULL,

  -- Invoice Details
  amount_due           DECIMAL(10,2) NOT NULL,
  amount_paid          DECIMAL(10,2) NOT NULL,
  currency             VARCHAR(3) DEFAULT 'usd',
  status               VARCHAR(20) NOT NULL,  -- 'draft', 'open', 'paid', 'void', 'uncollectible'

  -- Billing Period
  period_start         TIMESTAMP NOT NULL,
  period_end           TIMESTAMP NOT NULL,

  -- Stripe URLs
  invoice_pdf          TEXT,
  hosted_invoice_url   TEXT,

  -- Timestamps
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at              TIMESTAMP
);

CREATE UNIQUE INDEX idx_billing_invoice_stripe_invoice_id ON billing_invoice(stripe_invoice_id);
CREATE INDEX idx_billing_invoice_user_id ON billing_invoice(user_id);
CREATE INDEX idx_billing_invoice_subscription_id ON billing_invoice(subscription_id);
CREATE INDEX idx_billing_invoice_status ON billing_invoice(status);
CREATE INDEX idx_billing_invoice_period ON billing_invoice(period_start, period_end);
```

**Design Decisions**:
- Separate `amount_due` and `amount_paid` for partial payment tracking
- `stripe_invoice_id` for reconciliation with Stripe webhooks
- `hosted_invoice_url` and `invoice_pdf` for customer self-service
- `paid_at` timestamp for payment analytics

---

#### 5. **payment_transaction**
Payment history ledger for all transactions.

```sql
CREATE TABLE payment_transaction (
  id                       UUID PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id               UUID REFERENCES billing_invoice(id) ON DELETE SET NULL,
  subscription_id          UUID REFERENCES subscription_monetization(id) ON DELETE SET NULL,

  -- Stripe Integration
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,

  -- Transaction Details
  amount                   DECIMAL(10,2) NOT NULL,
  currency                 VARCHAR(3) DEFAULT 'usd',
  status                   VARCHAR(20) NOT NULL,  -- 'pending', 'succeeded', 'failed', 'cancelled', 'refunded'

  -- Payment Method
  payment_method_type      VARCHAR(50),  -- 'card', 'bank_account', 'paypal', etc.

  -- Failure Tracking
  failure_reason           TEXT,

  -- Timestamps
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at             TIMESTAMP
);

CREATE UNIQUE INDEX idx_payment_transaction_stripe_payment_intent_id ON payment_transaction(stripe_payment_intent_id);
CREATE INDEX idx_payment_transaction_user_id ON payment_transaction(user_id);
CREATE INDEX idx_payment_transaction_invoice_id ON payment_transaction(invoice_id);
CREATE INDEX idx_payment_transaction_subscription_id ON payment_transaction(subscription_id);
CREATE INDEX idx_payment_transaction_status ON payment_transaction(status);
CREATE INDEX idx_payment_transaction_created_at ON payment_transaction(created_at);
```

**Design Decisions**:
- Immutable ledger for audit compliance
- `stripe_payment_intent_id` for Stripe webhook event matching
- `failure_reason` for debugging and customer support
- `completed_at` for calculating processing time

---

#### 6. **dunning_attempt**
Failed payment retry tracking (dunning management).

```sql
CREATE TABLE dunning_attempt (
  id               UUID PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES billing_invoice(id) ON DELETE CASCADE,
  subscription_id  UUID REFERENCES subscription_monetization(id) ON DELETE SET NULL,

  -- Retry Details
  attempt_number   INT NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,
  attempted_at     TIMESTAMP,

  -- Result Tracking
  result           VARCHAR(20),  -- 'success', 'failed', 'pending', 'skipped'
  failure_reason   TEXT,

  -- Next Retry
  next_retry_at    TIMESTAMP,

  -- Timestamps
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dunning_attempt_user_id ON dunning_attempt(user_id);
CREATE INDEX idx_dunning_attempt_invoice_id ON dunning_attempt(invoice_id);
CREATE INDEX idx_dunning_attempt_subscription_id ON dunning_attempt(subscription_id);
CREATE INDEX idx_dunning_attempt_scheduled_at ON dunning_attempt(scheduled_at);
CREATE INDEX idx_dunning_attempt_result ON dunning_attempt(result);
```

**Design Decisions**:
- `attempt_number` for tracking retry sequence (1, 2, 3...)
- `scheduled_at` vs `attempted_at` for detecting missed retries
- `next_retry_at` for job scheduler integration
- Cascade delete when invoice is deleted (cleanup)

---

## Integration with Plan 112 (Token-to-Credit Conversion)

### Connection Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    Plan 109: Subscription System                 │
│                                                                   │
│  ┌────────────────────────┐                                      │
│  │ subscription_tier_      │  Defines tier pricing and           │
│  │ config                  │  credit allocations                 │
│  └────────────┬────────────┘                                     │
│               │                                                   │
│               ▼                                                   │
│  ┌────────────────────────┐                                      │
│  │ subscription_          │  User's active subscription          │
│  │ monetization           │                                      │
│  └────────────┬────────────┘                                     │
│               │                                                   │
│               ▼                                                   │
│  ┌────────────────────────┐                                      │
│  │ credit_allocation      │  Monthly credit grants               │
│  │                        │  (by period, by source)              │
│  └────────────┬────────────┘                                     │
│               │                                                   │
│               │ INTEGRATION POINT                                │
│               ▼                                                   │
└───────────────┼──────────────────────────────────────────────────┘
                │
                │ Creates/updates balance
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Plan 112: Token-Credit System                     │
│                                                                   │
│  ┌────────────────────────┐                                      │
│  │ user_credit_balance    │  Current credit balance              │
│  │ (Plan 112)             │  (single source of truth)            │
│  └────────────┬────────────┘                                     │
│               │                                                   │
│               ▼                                                   │
│  ┌────────────────────────┐                                      │
│  │ credit_deduction_      │  Deductions for API usage            │
│  │ ledger (Plan 112)      │  (links to token_usage_ledger)       │
│  └────────────┬────────────┘                                     │
│               │                                                   │
│               ▼                                                   │
│  ┌────────────────────────┐                                      │
│  │ token_usage_ledger     │  Token consumption tracking          │
│  │ (Plan 112)             │  (vendor cost, margin)               │
│  └─────────────────────────┘                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Example

**Monthly Subscription Renewal**:
1. Stripe webhook → Create `billing_invoice` (status: 'open')
2. Stripe payment → Create `payment_transaction` (status: 'succeeded')
3. Update `billing_invoice` (status: 'paid', paid_at: now())
4. Create `credit_allocation` (amount: 20000, source: 'subscription')
5. **Plan 112**: Update `user_credit_balance` (+20000 credits)

**API Request Consumption**:
1. User makes API request
2. **Plan 112**: Record `token_usage_ledger` (inputTokens, outputTokens, vendorCost)
3. **Plan 112**: Calculate credit deduction (vendorCost × marginMultiplier)
4. **Plan 112**: Atomic deduction from `user_credit_balance`
5. **Plan 112**: Record `credit_deduction_ledger` (links to token_usage_ledger)

---

## Tier Configuration (Seed Data)

Based on Plan 109 specifications:

| Tier | Monthly Price | Annual Price | Monthly Credits | Max Rollover | Key Features |
|------|--------------|--------------|-----------------|--------------|--------------|
| **Free** | $0 | $0 | 2,000 | 0 | Basic API access, 1 project, 100 req/day |
| **Pro** | $19 | $190 | 20,000 | 5,000 | Standard access, 10 projects, 1000 req/day |
| **Pro Max** | $49 | $490 | 60,000 | 15,000 | Priority support, 50 projects, 5000 req/day |
| **Enterprise Pro** | $149 | $1,490 | 250,000 | 50,000 | SLA 99.9%, dedicated support, 25k req/day |
| **Enterprise Max** | $499 | $4,990 | 1,000,000 | Unlimited | SLA 99.99%, custom contract, on-premise option |

All tiers include ~17% discount for annual billing (10 months price for 12 months).

---

## Foreign Key Relationships

### CASCADE Rules
- `subscription_monetization.user_id` → `users.id` **ON DELETE CASCADE**
  - Delete all subscriptions when user is deleted
- `credit_allocation.user_id` → `users.id` **ON DELETE CASCADE**
  - Delete credit history when user is deleted
- All child tables cascade from parent subscription/invoice

### SET NULL Rules
- `credit_allocation.subscription_id` → **ON DELETE SET NULL**
  - Preserve allocation history even if subscription is deleted
- `billing_invoice.subscription_id` → **ON DELETE SET NULL**
  - Preserve billing history independently
- `payment_transaction.invoice_id` → **ON DELETE SET NULL**
  - Preserve transaction history independently

**Rationale**: Audit trail preservation. Financial records remain intact even when parent entities are soft-deleted.

---

## Indexes Strategy

### Performance Indexes
1. **User lookups**: `user_id` indexed on all tables
2. **Status queries**: `status` indexed for filtering active/cancelled subscriptions
3. **Stripe reconciliation**: `stripe_*_id` indexed for webhook processing
4. **Time-based queries**: `created_at`, `current_period_end` for billing cycles
5. **Compound indexes**: `(allocation_period_start, allocation_period_end)` for period queries

### Index Sizing
- UUID indexes: ~16 bytes per entry
- VARCHAR indexes: Variable, typically 50-255 bytes
- Timestamp indexes: 8 bytes per entry
- Composite indexes: Sum of column sizes

**Estimated index overhead**: ~2-5% of table size (acceptable for query performance gains)

---

## Schema Design Decisions

### 1. Why Separate `subscription_monetization` from Existing `subscriptions` Table?

The existing `subscriptions` table was designed for the initial MVP and lacks:
- Stripe integration fields
- Dunning management support
- Granular billing period tracking
- Tier-based pricing configuration

**Decision**: Create new `subscription_monetization` table for Plan 109, deprecate old `subscriptions` table in future migration.

### 2. Why JSONB for `features` Field?

**Advantages**:
- Add new features without schema migrations
- Query nested JSON with PostgreSQL JSON operators
- Store tier-specific feature flags flexibly

**Example Query**:
```sql
SELECT * FROM subscription_tier_config
WHERE features->>'prioritySupport' = 'true';
```

### 3. Why Separate `credit_allocation` from `user_credit_balance`?

**Plan 109 Tables** (this implementation):
- `credit_allocation`: Historical ledger of credit grants (immutable)

**Plan 112 Tables** (token-credit system):
- `user_credit_balance`: Current balance snapshot (mutable)
- `credit_deduction_ledger`: Historical ledger of deductions (immutable)

**Rationale**: Separation of concerns. Allocations track "credits in", deductions track "credits out", balance is the sum.

### 4. Why `DECIMAL(10,2)` for Prices?

- **10 digits total, 2 decimal places**: Supports up to $99,999,999.99
- Avoids floating-point precision errors
- Standard for financial applications

### 5. Why Unique Constraints on Stripe IDs?

- Prevents duplicate webhook processing
- Ensures 1:1 mapping between Stripe and internal records
- Enables fast reconciliation queries

---

## Migration Strategy

### Generated Migration File
Location: `backend/prisma/migrations/20251109071433_add_subscription_monetization_system/migration.sql`

**Key Operations**:
1. Create 6 new tables
2. Add foreign key constraints
3. Create 25+ indexes for performance
4. Preserve user data (no cascading deletes to existing tables)

### Rollback Strategy
If migration fails:
```bash
npx prisma migrate resolve --rolled-back 20251109071433_add_subscription_monetization_system
```

Then fix schema and re-run:
```bash
npx prisma migrate dev --name add_subscription_monetization_system_v2
```

---

## Testing Verification

### Seed Data Tests
Run: `npx prisma db seed`

**Verifies**:
- 5 subscription tiers created
- Pricing configurations inserted
- JSONB features field populated correctly
- No constraint violations

### Query Performance Tests
```sql
-- Test user subscription lookup (should use index)
EXPLAIN ANALYZE
SELECT * FROM subscription_monetization WHERE user_id = 'uuid-here';

-- Test tier config lookup (should use unique index)
EXPLAIN ANALYZE
SELECT * FROM subscription_tier_config WHERE tier_name = 'pro';

-- Test allocation period query (should use composite index)
EXPLAIN ANALYZE
SELECT * FROM credit_allocation
WHERE allocation_period_start <= NOW()
  AND allocation_period_end >= NOW();
```

**Expected**: All queries use indexes, execution time <1ms for single-row lookups.

---

## Integration Notes for Future Development

### Stripe Webhook Handlers
Required webhook events:
- `customer.subscription.created` → Create `subscription_monetization`
- `customer.subscription.updated` → Update status, period dates
- `customer.subscription.deleted` → Mark as cancelled
- `invoice.payment_succeeded` → Create `payment_transaction`, allocate credits
- `invoice.payment_failed` → Create `dunning_attempt`, schedule retry

### Credit Allocation Job
Cron job (monthly):
```typescript
async function allocateMonthlyCredits() {
  const activeSubscriptions = await db.subscription_monetization.findMany({
    where: { status: 'active' }
  });

  for (const sub of activeSubscriptions) {
    const tierConfig = await db.subscription_tier_config.findUnique({
      where: { tierName: sub.tier }
    });

    // Create allocation
    await db.credit_allocation.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: tierConfig.monthlyCreditAllocation,
        allocationPeriodStart: sub.currentPeriodStart,
        allocationPeriodEnd: sub.currentPeriodEnd,
        source: 'subscription'
      }
    });

    // Update user balance (Plan 112 integration)
    await updateUserCreditBalance(sub.userId, tierConfig.monthlyCreditAllocation);
  }
}
```

---

## Schema Completeness Checklist

- [x] All 6 tables defined with proper types
- [x] Foreign key relationships with appropriate CASCADE/SET NULL rules
- [x] Indexes on all query-critical columns
- [x] Unique constraints on Stripe IDs
- [x] DECIMAL types for all monetary values
- [x] Timestamp fields for audit trail
- [x] JSONB fields for extensibility
- [x] Seed data for 5 subscription tiers
- [x] Migration file generated and tested
- [x] Integration points with Plan 112 documented

---

## Document Status

**Implementation Status**: ✅ Complete

**Migration Status**: ✅ Applied (20251109071433)

**Seed Data Status**: ✅ Tested and working

**Integration Status**: 🟡 Pending (requires Plan 112 tables to be added to Prisma schema)

---

## Next Steps

1. **Add Plan 112 tables to Prisma schema** to prevent migration conflicts
2. **Implement Stripe webhook handlers** for subscription lifecycle
3. **Create credit allocation cron job** for monthly grants
4. **Build admin UI** for tier configuration management
5. **Add usage analytics queries** for tier performance monitoring

---

## Related Documentation

- **Plan 109**: `docs/plan/109-rephlo-desktop-monetization-moderation-plan.md`
- **Plan 112**: `docs/plan/112-token-to-credit-conversion-mechanism.md`
- **Plan 115**: `docs/plan/115-master-orchestration-plan-109-110-111.md`
- **Token-Credit Schema Design**: `docs/reference/token-credit-schema-design.md` (if exists)

---

**Document End**
