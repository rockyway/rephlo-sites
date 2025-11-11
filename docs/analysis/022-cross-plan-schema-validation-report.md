# Cross-Plan Database Schema Integration Validation Report

**Document ID**: 022-cross-plan-schema-validation-report.md
**Version**: 1.0
**Created**: 2025-11-09
**Validator**: Database Schema QA Agent
**Scope**: Plans 109, 110, 111, 112 Integration Analysis

---

## Executive Summary

This report validates the database schema integration across four monetization plans:
- **Plan 109**: Subscription Monetization System (5-tier subscriptions)
- **Plan 110**: Perpetual Licensing & Proration System
- **Plan 111**: Coupon & Discount Code System
- **Plan 112**: Token-to-Credit Conversion Mechanism

**Overall Status**: ⚠️ **INTEGRATION INCOMPLETE**

**Key Findings**:
- ✅ Plan 109 schema is fully implemented in Prisma
- ✅ Plan 110 schema is fully implemented in Prisma
- ✅ Plan 111 schema is fully implemented in Prisma
- ❌ **Plan 112 schema is NOT in Prisma** (Critical Issue)
- ⚠️ Missing foreign keys between Plan 109 and Plan 112
- ⚠️ Enum inconsistencies detected (subscription tier naming)
- ⚠️ Missing indexes for critical cross-plan queries

---

## Section 1: Cross-Plan Foreign Key Verification

### 1.1 Plan 109 → Plan 112 Integration

**Expected Integration** (from Plan 109 reference doc):
```
credit_allocation (Plan 109)
  └─ Creates/updates → user_credit_balance (Plan 112)
```

**Status**: ❌ **MISSING**

**Problem**:
- Plan 112 tables (`Provider`, `ModelProviderPricing`, `PricingConfig`, `TokenUsageLedger`, `UserCreditBalance`, `CreditDeductionLedger`, etc.) are **NOT defined** in `backend/prisma/schema.prisma`
- The Prisma schema only contains Plans 109, 110, 111

**Impact**:
- `CreditAllocation` table exists but has no FK to Plan 112's `UserCreditBalance`
- Credit allocation workflow is incomplete
- No database-level enforcement of credit balance integrity

**Required Fix**:
```prisma
// In Plan 112 schema (MISSING FROM PRISMA)
model UserCreditBalance {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @unique @map("user_id") @db.Uuid
  amount              Int       @default(0)
  lastDeductionAt     DateTime? @map("last_deduction_at")
  lastDeductionAmount Int?      @map("last_deduction_amount")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  createdAt           DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_credit_balance")
}

// Then add to User model:
model User {
  // ... existing fields
  creditBalance UserCreditBalance?
  creditSources UserCreditSource[]
  tokenUsages   TokenUsageLedger[]
  creditDeductions CreditDeductionLedger[]
}
```

### 1.2 Plan 110 → Plan 109 Integration

**Expected Integration**:
```
proration_event.subscription_id → subscription_monetization.id
perpetual_license.user_id → User.id
```

**Status**: ✅ **VERIFIED**

**Evidence**:
```prisma
// File: backend/prisma/schema.prisma, Lines 894-941
model ProrationEvent {
  id             String @id @default(uuid()) @db.Uuid
  userId         String @map("user_id") @db.Uuid
  subscriptionId String @map("subscription_id") @db.Uuid
  // ...
  subscription SubscriptionMonetization @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  // ✅ Correct FK to Plan 109
}

model PerpetualLicense {
  id     String @id @default(uuid()) @db.Uuid
  userId String @map("user_id") @db.Uuid
  // ...
  user User @relation("UserPerpetualLicense", fields: [userId], references: [id], onDelete: Cascade)
  // ✅ Correct FK to User
}
```

### 1.3 Plan 111 → Plan 109 Integration

**Expected Integration**:
```
coupon_redemption.subscription_id → subscription_monetization.id
coupon_redemption.user_id → User.id
```

**Status**: ✅ **VERIFIED**

**Evidence**:
```prisma
// File: backend/prisma/schema.prisma, Lines 1140-1175
model CouponRedemption {
  id             String  @id @default(uuid()) @db.Uuid
  couponId       String  @map("coupon_id") @db.Uuid
  userId         String  @map("user_id") @db.Uuid
  subscriptionId String? @map("subscription_id") @db.Uuid
  // ...
  coupon       Coupon                    @relation(fields: [couponId], references: [id], onDelete: Cascade)
  subscription SubscriptionMonetization? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  // ✅ Correct FKs
}
```

### 1.4 Plan 111 → Plan 110 Integration

**Expected Integration**:
- BYOK migration coupons create `perpetual_license` records
- This is application-level logic, no direct FK needed

**Status**: ⚠️ **APPLICATION LOGIC** (Not enforced at DB level)

**Recommendation**: Add tracking field to `PerpetualLicense`:
```prisma
model PerpetualLicense {
  // ... existing fields
  acquisitionCouponCode String? @map("acquisition_coupon_code") @db.VarChar(50)
  // Tracks if license was granted via coupon (e.g., "BYOK2025")
}
```

---

## Section 2: Enum Consistency Check

### 2.1 Subscription Tier Enums

**Problem**: Inconsistent tier naming across plans

#### Plan 109 Tiers (from docs):
```
'free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual'
```

#### Prisma Schema Enum:
```prisma
enum SubscriptionTier {
  free
  pro
  enterprise  // ❌ Missing: pro_max, enterprise_pro, enterprise_max, perpetual
}
```

**Status**: ❌ **INCONSISTENT**

**Impact**:
- `SubscriptionMonetization` table uses `String` instead of enum
- `Coupon` table uses the incomplete enum
- No database-level validation of tier values

**Required Fix**:
```prisma
enum SubscriptionTier {
  free
  pro
  pro_max
  enterprise_pro
  enterprise_max
  perpetual

  @@map("subscription_tier")
}

// Update all usages
model SubscriptionMonetization {
  tier SubscriptionTier @map("tier")  // Change from String to enum
  // ...
}
```

### 2.2 Status Enums Consistency

#### Subscription Status
```prisma
// Current enum (lines 90-97)
enum SubscriptionStatus {
  active
  cancelled
  expired
  suspended
}

// Plan 109 docs expect:
// 'trial', 'active', 'past_due', 'cancelled', 'expired'
```

**Status**: ❌ **MISSING VALUES**

**Required Fix**:
```prisma
enum SubscriptionStatus {
  trial
  active
  past_due
  cancelled
  expired
  suspended

  @@map("subscription_status")
}
```

#### Coupon/Plan 111 Enums

**Status**: ✅ **COMPLETE** (all 5 coupon enums defined correctly)

---

## Section 3: Index Performance Analysis

### 3.1 Cross-Plan Query Patterns

#### Query 1: User Subscription + Credit Usage
```sql
-- Common query: Get user subscription + token usage + credit balance
SELECT
  sm.tier,
  sm.monthly_credit_allocation,
  ucb.amount AS current_balance,
  SUM(tul.credits_deducted) AS total_used
FROM subscription_monetization sm
INNER JOIN user_credit_balance ucb ON sm.user_id = ucb.user_id
INNER JOIN token_usage_ledger tul ON sm.user_id = tul.user_id
WHERE sm.user_id = ?
  AND tul.created_at BETWEEN sm.current_period_start AND sm.current_period_end;
```

**Required Indexes**:
```sql
-- ✅ Exists: subscription_monetization.user_id
-- ❌ MISSING: user_credit_balance.user_id (table doesn't exist in Prisma)
-- ❌ MISSING: token_usage_ledger (table doesn't exist in Prisma)
```

**Status**: ❌ **CANNOT EXECUTE** (Plan 112 tables missing)

#### Query 2: Coupon Redemption + Subscription
```sql
-- Query: Get all coupon redemptions with subscription details
SELECT
  cr.coupon_id,
  c.code,
  cr.discount_applied_usd,
  sm.tier,
  sm.base_price_usd
FROM coupon_redemption cr
INNER JOIN coupon c ON cr.coupon_id = c.id
INNER JOIN subscription_monetization sm ON cr.subscription_id = sm.id
WHERE cr.user_id = ?
  AND cr.redemption_status = 'success';
```

**Required Indexes**:
```sql
-- ✅ Exists: coupon_redemption.user_id
-- ✅ Exists: coupon_redemption.redemption_status
-- ✅ Exists: coupon_redemption.subscription_id
```

**Status**: ✅ **OPTIMAL** (composite index recommended)

**Recommendation**:
```prisma
@@index([userId, redemptionStatus, redemptionDate])  // Add this
```

#### Query 3: Perpetual License + Credit Usage
```sql
-- Query: Get perpetual license users + BYOK usage (no deduction)
SELECT
  pl.license_key,
  pl.status,
  COUNT(tul.id) AS request_count,
  SUM(tul.vendor_cost) AS total_vendor_cost
FROM perpetual_license pl
LEFT JOIN token_usage_ledger tul ON pl.user_id = tul.user_id
WHERE pl.status = 'active'
  AND tul.credits_deducted = 0  -- BYOK mode
GROUP BY pl.license_key, pl.status;
```

**Required Indexes**:
```sql
-- ✅ Exists: perpetual_license.user_id
-- ✅ Exists: perpetual_license.status
-- ❌ MISSING: token_usage_ledger.user_id (table doesn't exist)
-- ❌ MISSING: token_usage_ledger.credits_deducted (field doesn't exist)
```

**Status**: ❌ **CANNOT EXECUTE** (Plan 112 tables missing)

### 3.2 Missing Indexes

**Recommended Additions**:

```prisma
// In SubscriptionMonetization
@@index([userId, currentPeriodEnd, status])  // For active subscriptions in period

// In CouponRedemption
@@index([userId, redemptionStatus, redemptionDate])  // For user redemption history

// In ProrationEvent
@@index([subscriptionId, effectiveDate, status])  // For proration timeline queries

// In BillingInvoice
@@index([userId, status, periodEnd])  // For unpaid invoice queries
```

---

## Section 4: Migration Dependency Validation

### 4.1 Migration Order Requirements

**Correct Order** (based on foreign key dependencies):

1. **Base Tables** (no dependencies):
   - ✅ `User` (existing)
   - ✅ `OAuthClient` (existing)

2. **Plan 109 - Subscription Foundation**:
   - ✅ `subscription_tier_config`
   - ✅ `subscription_monetization`
   - ✅ `credit_allocation`
   - ✅ `billing_invoice`
   - ✅ `payment_transaction`
   - ✅ `dunning_attempt`

3. **Plan 112 - Token/Credit System** (❌ MISSING):
   - ❌ `providers`
   - ❌ `model_provider_pricing`
   - ❌ `pricing_configs`
   - ❌ `user_credit_balance`
   - ❌ `token_usage_ledger`
   - ❌ `credit_deduction_ledger`
   - ❌ `user_credit_source`

4. **Plan 110 - Perpetual Licensing**:
   - ✅ `perpetual_license`
   - ✅ `license_activation`
   - ✅ `version_upgrade`
   - ✅ `proration_event`

5. **Plan 111 - Coupon System**:
   - ✅ `coupon_campaign`
   - ✅ `coupon`
   - ✅ `campaign_coupon`
   - ✅ `coupon_redemption`
   - ✅ `coupon_usage_limit`
   - ✅ `coupon_fraud_detection`
   - ✅ `coupon_validation_rule`
   - ✅ `coupon_analytics_snapshot`

**Problem**: Plan 112 tables don't exist, violating dependency order:
- `credit_allocation` (Plan 109) expects `user_credit_balance` (Plan 112)
- `token_usage_ledger` (Plan 112) links to `credit_deduction_ledger` (Plan 112)

### 4.2 Migration Status in Prisma

**Existing Migrations**:
```
backend/prisma/migrations/
├── 20251109071433_add_subscription_monetization_system/  ✅ Plan 109
├── (Plan 110 migrations merged into schema)              ✅ Plan 110
├── (Plan 111 migrations merged into schema)              ✅ Plan 111
└── (Plan 112 migration MISSING)                          ❌ Plan 112
```

**Required Action**:
- Generate new migration for Plan 112 tables
- Ensure migration order: 109 → 112 → 110 → 111

---

## Section 5: Data Integrity Rules Validation

### 5.1 Cascade Rules Analysis

#### Plan 109 Cascades

**User Deletion** (GDPR compliance):
```prisma
subscription_monetization.user_id → User.id (onDelete: CASCADE)  ✅ CORRECT
credit_allocation.user_id → User.id (onDelete: CASCADE)          ✅ CORRECT
billing_invoice.user_id → User.id (onDelete: CASCADE)            ✅ CORRECT
payment_transaction.user_id → User.id (onDelete: CASCADE)        ✅ CORRECT
dunning_attempt.user_id → User.id (onDelete: CASCADE)            ✅ CORRECT
```

**Subscription Deletion** (preserve financial records):
```prisma
credit_allocation.subscription_id → subscription_monetization.id (onDelete: SET NULL)  ✅ CORRECT
billing_invoice.subscription_id → subscription_monetization.id (onDelete: SET NULL)    ✅ CORRECT
payment_transaction.subscription_id → subscription_monetization.id (onDelete: SET NULL) ✅ CORRECT
```

**Rationale**: ✅ Correct - financial audit trail preserved even if subscription deleted

#### Plan 110 Cascades

**License Deletion**:
```prisma
license_activation.license_id → perpetual_license.id (onDelete: CASCADE)  ✅ CORRECT
version_upgrade.license_id → perpetual_license.id (onDelete: CASCADE)     ✅ CORRECT
```

**Proration Events**:
```prisma
proration_event.subscription_id → subscription_monetization.id (onDelete: CASCADE)  ✅ CORRECT
```

#### Plan 111 Cascades

**Coupon Deletion**:
```prisma
coupon_redemption.coupon_id → coupon.id (onDelete: CASCADE)              ⚠️ RISKY
coupon_usage_limit.coupon_id → coupon.id (onDelete: CASCADE)             ⚠️ RISKY
coupon_fraud_detection.coupon_id → coupon.id (onDelete: CASCADE)         ⚠️ RISKY
```

**Problem**: Deleting a coupon destroys redemption history
**Recommendation**: Change to `onDelete: SET NULL` or add soft delete:
```prisma
model Coupon {
  deletedAt DateTime? @map("deleted_at")  // Add soft delete
}
```

#### Plan 112 Cascades (MISSING)

**Expected Cascades**:
```prisma
// ❌ NOT IN PRISMA
user_credit_balance.user_id → User.id (onDelete: CASCADE)
token_usage_ledger.user_id → User.id (onDelete: CASCADE)
credit_deduction_ledger.user_id → User.id (onDelete: CASCADE)
```

### 5.2 Unique Constraints

**Verified**:
```prisma
✅ User.email                                    UNIQUE
✅ SubscriptionMonetization.stripeCustomerId     UNIQUE
✅ SubscriptionMonetization.stripeSubscriptionId UNIQUE
✅ BillingInvoice.stripeInvoiceId                UNIQUE
✅ PaymentTransaction.stripePaymentIntentId      UNIQUE
✅ PerpetualLicense.licenseKey                   UNIQUE
✅ Coupon.code                                   UNIQUE
```

**Missing** (Plan 112):
```prisma
❌ UserCreditBalance.userId                      UNIQUE (table doesn't exist)
❌ CreditDeductionLedger.requestId               UNIQUE (table doesn't exist)
```

---

## Section 6: Missing Integration Points

### 6.1 Plan 109 ↔ Plan 112 Integration

**Missing Fields in `CreditAllocation`**:
```prisma
// Current (Plan 109):
model CreditAllocation {
  id             String  @id
  userId         String
  subscriptionId String?
  amount         Int
  source         String  // ✅ Has source tracking
  // ...
}

// Needs (for Plan 112 integration):
// ❌ No FK to user_credit_balance
// ❌ No tracking of credit type (free vs pro)
// ❌ No expiration tracking (perpetual credits should expire)
```

**Recommended Addition**:
```prisma
model CreditAllocation {
  // ... existing fields
  creditType String @default("subscription") @map("credit_type") @db.VarChar(50)
  // Values: "subscription", "bonus", "referral", "coupon", "admin_grant"

  expiresAt DateTime? @map("expires_at")
  // NULL for perpetual credits, set for promotional credits

  appliedToBalanceAt DateTime? @map("applied_to_balance_at")
  // Timestamp when applied to user_credit_balance (Plan 112)
}
```

### 6.2 Plan 110 ↔ Plan 112 Integration

**BYOK Mode Tracking**:

**Current State**:
- `PerpetualLicense` exists ✅
- No field to indicate BYOK vs cloud mode

**Expected Integration** (from Plan 110 docs):
```typescript
// Desktop app bypasses cloud API when license is active
// Plan 112 should NOT deduct credits for BYOK users
```

**Missing Field**:
```prisma
model PerpetualLicense {
  // ... existing fields
  byokEnabled Boolean @default(true) @map("byok_enabled")
  // If true, user uses own API keys (no credit deduction)
  // If false, user uses cloud credits (hybrid mode)
}
```

### 6.3 Plan 111 ↔ Plan 112 Integration

**Credit Grant Coupons**:

**Current State**:
- `Coupon.discountType` includes `credits` ✅
- No link to `user_credit_balance` (table doesn't exist)

**Expected Integration** (from Plan 111 docs):
```typescript
// Coupon type: credits
// Example: "REFER20" grants $20 in credits
// Should create credit_allocation with source='coupon'
```

**Required Application Logic**:
```typescript
// When coupon.discountType === 'credits':
// 1. Create CreditAllocation (Plan 109)
// 2. Update UserCreditBalance (Plan 112) ← MISSING TABLE
```

---

## Section 7: Integration Issues Summary

### 7.1 Critical Issues (Must Fix Before Production)

| Issue | Severity | Plans Affected | Impact |
|-------|----------|----------------|--------|
| Plan 112 tables missing from Prisma | 🔴 **CRITICAL** | 109, 112 | Credit system non-functional |
| Missing FK: credit_allocation → user_credit_balance | 🔴 **CRITICAL** | 109, 112 | No credit balance enforcement |
| Enum inconsistency: SubscriptionTier | 🔴 **CRITICAL** | 109, 110, 111 | Invalid tier values allowed |
| Missing User relations for Plan 112 | 🔴 **CRITICAL** | 112 | Cannot query user credit data |

### 7.2 High Priority Issues (Fix Before Launch)

| Issue | Severity | Plans Affected | Impact |
|-------|----------|----------------|--------|
| Missing indexes for cross-plan queries | 🟠 **HIGH** | All | Poor query performance |
| Coupon CASCADE on deletion | 🟠 **HIGH** | 111 | Loss of redemption history |
| Missing byokEnabled field | 🟠 **HIGH** | 110, 112 | Cannot distinguish BYOK users |
| Incomplete SubscriptionStatus enum | 🟠 **HIGH** | 109 | 'trial' and 'past_due' not allowed |

### 7.3 Medium Priority Issues (Can Fix Post-Launch)

| Issue | Severity | Plans Affected | Impact |
|-------|----------|----------------|--------|
| Missing credit expiration tracking | 🟡 **MEDIUM** | 109, 112 | Cannot expire promotional credits |
| No coupon acquisition tracking | 🟡 **MEDIUM** | 110, 111 | Cannot track BYOK via coupon |
| Missing composite indexes | 🟡 **MEDIUM** | All | Suboptimal query performance |

---

## Section 8: Recommendations

### 8.1 Immediate Actions (Week 1)

1. **Add Plan 112 Tables to Prisma Schema**
   - File: `backend/prisma/schema.prisma`
   - Add: `Provider`, `ModelProviderPricing`, `PricingConfig`, `TokenUsageLedger`, `UserCreditBalance`, `CreditDeductionLedger`, `UserCreditSource`
   - Add: Daily summary tables

2. **Fix Enum Definitions**
   ```prisma
   enum SubscriptionTier {
     free
     pro
     pro_max
     enterprise_pro
     enterprise_max
     perpetual
   }

   enum SubscriptionStatus {
     trial
     active
     past_due
     cancelled
     expired
     suspended
   }
   ```

3. **Update User Model Relations**
   ```prisma
   model User {
     // ... existing relations

     // Plan 112 Relations (ADD THESE)
     creditBalance        UserCreditBalance?
     creditSources        UserCreditSource[]
     tokenUsages          TokenUsageLedger[]
     creditDeductions     CreditDeductionLedger[]
     tokenUsageSummary    TokenUsageDailySummary[]
     creditUsageSummary   CreditUsageDailySummary[]
   }
   ```

4. **Generate Migration for Plan 112**
   ```bash
   npx prisma migrate dev --name add_token_credit_conversion_system
   ```

### 8.2 High Priority Actions (Week 2)

1. **Add Missing Indexes**
   ```prisma
   // In SubscriptionMonetization
   @@index([userId, currentPeriodEnd, status])

   // In CouponRedemption
   @@index([userId, redemptionStatus, redemptionDate])

   // In TokenUsageLedger
   @@index([userId, createdAt])
   @@index([modelId, providerId, createdAt])
   ```

2. **Change Coupon Cascade Rules**
   ```prisma
   model CouponRedemption {
     coupon Coupon @relation(fields: [couponId], references: [id], onDelete: SetNull)
     // Change from CASCADE to SET NULL (preserve history)
   }
   ```

3. **Add BYOK Tracking Field**
   ```prisma
   model PerpetualLicense {
     byokEnabled Boolean @default(true) @map("byok_enabled")
   }
   ```

### 8.3 Medium Priority Actions (Week 3-4)

1. **Add Credit Expiration Tracking**
   ```prisma
   model CreditAllocation {
     expiresAt DateTime? @map("expires_at")
     appliedToBalanceAt DateTime? @map("applied_to_balance_at")
   }
   ```

2. **Add Coupon Acquisition Tracking**
   ```prisma
   model PerpetualLicense {
     acquisitionCouponCode String? @map("acquisition_coupon_code")
   }
   ```

3. **Optimize Composite Indexes**
   - Analyze slow queries from logs
   - Add composite indexes for common JOIN patterns

### 8.4 Query Optimization Strategy

**Caching Strategy**:
```typescript
// Redis cache for frequently accessed data
- User credit balance: TTL 5 minutes
- Subscription tier: TTL 1 hour
- Pricing config: TTL 24 hours
- Model provider pricing: TTL 24 hours
```

**Connection Pool Sizing**:
```typescript
// DATABASE_URL format
postgresql://user:pass@localhost:5432/db?connection_limit=20&pool_timeout=10

// Recommended sizing (8-core server)
connection_limit = (2 * CPU_cores) + effective_spindle_count
                 = (2 * 8) + 4
                 = 20 connections
```

---

## Section 9: Integration Testing Requirements

### 9.1 End-to-End User Journeys

**Test 1: New User → Pro Subscription → Credit Usage**
```typescript
// Journey:
1. User signs up (creates User record)
2. User subscribes to Pro tier (creates subscription_monetization)
3. System allocates 20,000 credits (creates credit_allocation)
4. ❌ FAILS: No user_credit_balance table to update
5. User makes API request (should create token_usage_ledger)
6. ❌ FAILS: No token_usage_ledger table
7. System deducts credits (should update user_credit_balance)
8. ❌ FAILS: No credit_deduction_ledger table

// Expected result: FAILURE (Plan 112 missing)
```

**Test 2: Pro User → Pro Max Upgrade (Proration)**
```typescript
// Journey:
1. User on Pro tier (subscription_monetization)
2. User upgrades to Pro Max mid-cycle
3. System calculates proration (creates proration_event) ✅
4. System charges prorated amount (creates payment_transaction) ✅
5. System updates subscription tier (updates subscription_monetization) ✅
6. System allocates new credit amount (creates credit_allocation) ✅
7. ❌ FAILS: No user_credit_balance to update

// Expected result: PARTIAL SUCCESS (proration works, credit update fails)
```

**Test 3: User Redeems Coupon → Discounted Subscription**
```typescript
// Journey:
1. User applies coupon "BLACKFRIDAY25" (validates via 12-step algorithm) ✅
2. System calculates 25% discount ✅
3. System creates subscription with discount (subscription_monetization) ✅
4. System records redemption (coupon_redemption) ✅
5. System allocates credits (credit_allocation) ✅
6. ❌ FAILS: No user_credit_balance to update

// Expected result: PARTIAL SUCCESS (coupon works, credit allocation fails)
```

### 9.2 Database Integrity Tests

**Test 1: Foreign Key Constraint Validation**
```sql
-- Test: Delete user → cascade to all related tables
BEGIN TRANSACTION;
DELETE FROM users WHERE id = 'test-user-uuid';
-- Expected: All subscription_monetization, credit_allocation, coupon_redemption deleted
-- Expected: All perpetual_license, license_activation deleted
-- ❌ Expected: All user_credit_balance deleted (TABLE MISSING)
ROLLBACK;
```

**Test 2: Unique Constraint Validation**
```sql
-- Test: Duplicate Stripe subscription ID
INSERT INTO subscription_monetization (stripe_subscription_id, ...)
VALUES ('sub_12345', ...);
-- Expected: UNIQUE constraint violation
```

**Test 3: Enum Constraint Validation**
```sql
-- Test: Invalid subscription tier
INSERT INTO subscription_monetization (tier, ...)
VALUES ('invalid_tier', ...);
-- ❌ Expected: CHECK constraint violation (BUT tier is String, not enum!)
-- Actual: Insertion succeeds with invalid value
```

### 9.3 Performance Benchmarks

**Benchmark 1: User Balance Lookup**
```sql
SELECT amount FROM user_credit_balance WHERE user_id = ?;
-- Target: <10ms
-- ❌ Cannot test: Table doesn't exist
```

**Benchmark 2: User Token History (30 days)**
```sql
SELECT * FROM token_usage_ledger
WHERE user_id = ? AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
-- Target: <50ms
-- ❌ Cannot test: Table doesn't exist
```

**Benchmark 3: Coupon Validation**
```sql
SELECT c.*, cu.total_uses, cu.unique_users
FROM coupon c
LEFT JOIN coupon_usage_limit cu ON c.id = cu.coupon_id
WHERE c.code = ? AND c.is_active = true;
-- Target: <30ms
-- ✅ Can test (tables exist)
```

---

## Section 10: Migration Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Add Plan 112 tables to Prisma schema
- [ ] Fix SubscriptionTier enum (add 6 tiers)
- [ ] Fix SubscriptionStatus enum (add trial, past_due)
- [ ] Add User relations for Plan 112
- [ ] Generate migration for Plan 112
- [ ] Run migration on staging database
- [ ] Verify all foreign keys work

### Phase 2: Index Optimization (Week 2)
- [ ] Add composite indexes for cross-plan queries
- [ ] Add index: [userId, currentPeriodEnd, status]
- [ ] Add index: [userId, redemptionStatus, redemptionDate]
- [ ] Add index: [subscriptionId, effectiveDate, status]
- [ ] Benchmark query performance
- [ ] Adjust indexes based on slow query logs

### Phase 3: Data Integrity (Week 3)
- [ ] Change coupon cascade rules (CASCADE → SET NULL)
- [ ] Add soft delete to Coupon table
- [ ] Add byokEnabled field to PerpetualLicense
- [ ] Add credit expiration tracking
- [ ] Add coupon acquisition tracking
- [ ] Test GDPR deletion cascades

### Phase 4: Integration Testing (Week 4)
- [ ] Test: New user subscription flow
- [ ] Test: Pro → Pro Max proration
- [ ] Test: Coupon redemption + credit allocation
- [ ] Test: Perpetual license + BYOK mode
- [ ] Test: Token usage + credit deduction
- [ ] Load test: 1000 concurrent requests

---

## Section 11: Appendix

### A. Complete Schema Dependency Graph

```
User (base table)
├─ Plan 109: Subscription Monetization
│  ├─ subscription_monetization
│  │  ├─ credit_allocation
│  │  ├─ billing_invoice
│  │  │  ├─ payment_transaction
│  │  │  └─ dunning_attempt
│  │  └─ proration_event (Plan 110 link)
│  └─ subscription_tier_config
│
├─ Plan 112: Token-Credit System (❌ MISSING FROM PRISMA)
│  ├─ providers
│  │  ├─ model_provider_pricing
│  │  └─ pricing_configs
│  ├─ user_credit_balance (linked to credit_allocation)
│  ├─ user_credit_source
│  ├─ token_usage_ledger
│  │  └─ credit_deduction_ledger
│  ├─ token_usage_daily_summary
│  └─ credit_usage_daily_summary
│
├─ Plan 110: Perpetual Licensing
│  ├─ perpetual_license
│  │  ├─ license_activation
│  │  └─ version_upgrade
│  └─ proration_event (links to subscription_monetization)
│
└─ Plan 111: Coupon System
   ├─ coupon_campaign
   │  └─ campaign_coupon
   │     └─ coupon
   │        ├─ coupon_redemption (links to subscription_monetization)
   │        ├─ coupon_usage_limit
   │        ├─ coupon_fraud_detection
   │        ├─ coupon_validation_rule
   │        └─ coupon_analytics_snapshot
```

### B. Foreign Key Matrix

| Source Table | Target Table | FK Column | On Delete | Status |
|--------------|--------------|-----------|-----------|--------|
| subscription_monetization | User | user_id | CASCADE | ✅ |
| credit_allocation | User | user_id | CASCADE | ✅ |
| credit_allocation | subscription_monetization | subscription_id | SET NULL | ✅ |
| billing_invoice | subscription_monetization | subscription_id | SET NULL | ✅ |
| payment_transaction | billing_invoice | invoice_id | SET NULL | ✅ |
| dunning_attempt | billing_invoice | invoice_id | CASCADE | ✅ |
| proration_event | subscription_monetization | subscription_id | CASCADE | ✅ |
| perpetual_license | User | user_id | CASCADE | ✅ |
| license_activation | perpetual_license | license_id | CASCADE | ✅ |
| version_upgrade | perpetual_license | license_id | CASCADE | ✅ |
| coupon_redemption | subscription_monetization | subscription_id | SET NULL | ✅ |
| coupon_redemption | coupon | coupon_id | CASCADE | ⚠️ Should be SET NULL |
| user_credit_balance | User | user_id | CASCADE | ❌ Missing |
| token_usage_ledger | User | user_id | CASCADE | ❌ Missing |
| credit_deduction_ledger | User | user_id | CASCADE | ❌ Missing |

### C. Enum Values Reference

```prisma
// Complete enum definitions (with missing values added)

enum SubscriptionTier {
  free
  pro
  pro_max              // ❌ MISSING
  enterprise_pro       // ❌ MISSING
  enterprise_max       // ❌ MISSING
  perpetual            // ❌ MISSING
}

enum SubscriptionStatus {
  trial                // ❌ MISSING
  active
  past_due             // ❌ MISSING
  cancelled
  expired
  suspended
}

enum UsageOperation {
  completion
  chat
  embedding
  function_call
}

enum CouponType {
  percentage_discount
  fixed_amount_discount
  tier_specific_discount
  duration_bonus
  byok_migration
}

enum DiscountType {
  percentage
  fixed_amount
  credits
  months_free
}

enum RedemptionStatus {
  success
  failed
  reversed
  pending
}

enum LicenseStatus {
  pending
  active
  suspended
  revoked
  expired
}

enum ProrationStatus {
  pending
  applied
  failed
  reversed
}
```

---

## Conclusion

**Overall Integration Status**: ⚠️ **INCOMPLETE**

**Blocking Issues**:
1. ❌ Plan 112 tables completely missing from Prisma schema
2. ❌ Enum inconsistencies (missing tier values)
3. ❌ User model missing Plan 112 relations

**Recommended Next Steps**:
1. Add Plan 112 tables to `backend/prisma/schema.prisma` (CRITICAL)
2. Fix enum definitions (CRITICAL)
3. Generate and test migration (HIGH)
4. Add missing indexes (HIGH)
5. Run integration tests (MEDIUM)

**Estimated Completion Time**:
- Critical fixes: 2-3 days
- High priority fixes: 1 week
- Medium priority fixes: 2 weeks
- Full integration testing: 1 week

**Total**: 4-5 weeks for complete integration

---

**Report Generated**: 2025-11-09
**Validator**: Database Schema QA Agent
**Next Review**: After Plan 112 schema added to Prisma
