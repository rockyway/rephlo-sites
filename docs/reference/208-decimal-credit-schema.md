# Plan 208: Decimal Credit Schema Documentation

**Document Type:** Schema Reference
**Created:** 2025-01-21
**Related Plan:** [Plan 208: Fractional Credit System Migration](../plan/208-fractional-credit-system-migration.md)
**Migration:** `20251121000000_fractional_credits`

---

## Executive Summary

This document describes the database schema changes for Plan 208, which migrates the credit system from whole-number increments (Int) to fractional increments (Decimal(12, 2)) to support configurable credit precision (0.01, 0.1, or 1.0 credit increments).

**Key Changes:**
- Migrated 4 tables from Int → Decimal(12, 2)
- Added `system_settings` table for configuration
- Default credit increment: **0.1 credits** (= $0.001)
- Maximum precision: **0.01 credits** (= $0.0001)

---

## Schema Changes Summary

### Tables Migrated (Int → Decimal)

| Table | Fields Migrated | Rows Affected | Purpose |
|-------|----------------|---------------|---------|
| `user_credit_balance` | `amount`, `last_deduction_amount` | ~All users | User credit balances |
| `token_usage_ledger` | `credits_deducted`, `input_credits`, `output_credits`, `total_credits`, `cache_write_credits`, `cache_read_credits` | ~All API requests | Usage tracking |
| `credit_deduction_ledger` | `amount`, `balance_before`, `balance_after` | ~All deductions | Audit trail |
| `credit_usage_daily_summary` | `credits_deducted`, `credits_balance_eod` | ~All daily summaries | Analytics |

### New Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `system_settings` | System-wide configuration | `key`, `value`, `value_type`, `category` |

### Fields Unchanged (Kept as Int)

| Table | Field | Reason |
|-------|-------|--------|
| `subscriptions` | `credits_per_month` | Monthly allocations are whole numbers (200, 1500, etc.) |
| `credit_allocation` | `credits_allocated` | Same as above |
| `credit_usage_daily_summary` | `credits_allocated` | Same as above |

---

## Detailed Schema Definitions

### 1. user_credit_balance

**Before:**
```prisma
model user_credit_balance {
  amount                Int       @default(0)
  last_deduction_amount Int?
}
```

**After:**
```prisma
model user_credit_balance {
  amount                Decimal   @default(0) @db.Decimal(12, 2)
  last_deduction_amount Decimal?  @db.Decimal(12, 2)
}
```

**Field Details:**
- `amount`: User's current credit balance (e.g., 1499.9)
- `last_deduction_amount`: Last credit deduction (e.g., 0.1)
- **Range:** 0.00 to 9,999,999,999.99 credits
- **Precision:** 0.01 credits (= $0.0001)

**Example Data:**
```sql
-- Before: 1500 credits
amount: 1500

-- After: 1499.9 credits (0.1 deducted)
amount: 1499.90
last_deduction_amount: 0.10
```

---

### 2. token_usage_ledger

**Before:**
```prisma
model token_usage_ledger {
  credits_deducted    Int
  input_credits       Int?
  output_credits      Int?
  total_credits       Int?
  cache_write_credits Int?
  cache_read_credits  Int?
}
```

**After:**
```prisma
model token_usage_ledger {
  credits_deducted    Decimal  @db.Decimal(12, 2)
  input_credits       Decimal? @db.Decimal(12, 2)
  output_credits      Decimal? @db.Decimal(12, 2)
  total_credits       Decimal? @db.Decimal(12, 2)
  cache_write_credits Decimal? @db.Decimal(12, 2)
  cache_read_credits  Decimal? @db.Decimal(12, 2)
}
```

**Field Details:**
- `credits_deducted`: Total credits charged for this request (e.g., 0.1)
- `input_credits`: Credits for input tokens (Phase 3 separate pricing)
- `output_credits`: Credits for output tokens
- `total_credits`: Sum of input + output + cache credits
- `cache_write_credits`: Credits for cache write operations (Plan 207)
- `cache_read_credits`: Credits for cache read operations (Plan 207)

**Comment Removed:**
- ~~`// DEPRECATED: Will be removed in future version after migration`~~ (credits_deducted)
- **New comment:** `// Plan 208: Fractional credits - Primary credit deduction field`

**Example Data:**
```sql
-- Small API call: 8 input + 19 output tokens
-- Vendor cost: $0.000246, Multiplier: 1.5x
-- Cost with multiplier: $0.00006

-- Before (UNFAIR):
credits_deducted: 1  -- Rounded up to whole credit ($0.01)

-- After (FAIR):
credits_deducted: 0.10  -- Rounded to 0.1 increment ($0.001)
```

---

### 3. credit_deduction_ledger

**Before:**
```prisma
model credit_deduction_ledger {
  amount         Int
  balance_before Int
  balance_after  Int
}
```

**After:**
```prisma
model credit_deduction_ledger {
  amount         Decimal @db.Decimal(12, 2)
  balance_before Decimal @db.Decimal(12, 2)
  balance_after  Decimal @db.Decimal(12, 2)
}
```

**Field Details:**
- `amount`: Credits deducted in this transaction
- `balance_before`: User's balance before deduction
- `balance_after`: User's balance after deduction

**Example Audit Trail:**
```sql
-- Deduction 1:
amount: 0.10
balance_before: 1500.00
balance_after: 1499.90

-- Deduction 2:
amount: 0.30
balance_before: 1499.90
balance_after: 1499.60
```

---

### 4. credit_usage_daily_summary

**Before:**
```prisma
model credit_usage_daily_summary {
  credits_allocated   Int      @default(0)
  credits_deducted    Int      @default(0)
  credits_balance_eod Int
}
```

**After:**
```prisma
model credit_usage_daily_summary {
  credits_allocated   Int      @default(0)  // KEPT as Int
  credits_deducted    Decimal  @default(0) @db.Decimal(12, 2)
  credits_balance_eod Decimal  @db.Decimal(12, 2)
}
```

**Field Details:**
- `credits_allocated`: Monthly allocation (whole number, unchanged)
- `credits_deducted`: Total credits deducted today (e.g., 12.7)
- `credits_balance_eod`: End-of-day balance (e.g., 1487.3)

**Example Data:**
```sql
-- Day 1:
credits_allocated: 1500
credits_deducted: 12.70
credits_balance_eod: 1487.30

-- Day 2:
credits_allocated: 0
credits_deducted: 25.40
credits_balance_eod: 1461.90
```

---

### 5. system_settings (NEW)

**Schema:**
```prisma
model system_settings {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key          String   @unique @db.VarChar(100)
  value        String   @db.Text
  value_type   String   @default("string") @db.VarChar(20)
  description  String?  @db.Text
  category     String   @default("general") @db.VarChar(50)
  is_public    Boolean  @default(false)
  is_encrypted Boolean  @default(false)
  created_at   DateTime @default(now())
  updated_at   DateTime @default(now())

  @@index([category])
  @@index([key])
}
```

**Field Details:**
- `key`: Unique setting identifier (e.g., `credit_minimum_increment`)
- `value`: String representation of the value (e.g., `"0.1"`)
- `value_type`: Type hint for parsing (`string`, `number`, `decimal`, `boolean`, `json`)
- `category`: Setting category (`billing`, `security`, `feature_flags`, etc.)
- `is_public`: Whether to expose via public API (default: false)
- `is_encrypted`: For sensitive values like API keys (default: false)

**Predefined Settings:**

| Key | Value | Type | Description | Category |
|-----|-------|------|-------------|----------|
| `credit_minimum_increment` | `"0.1"` | `decimal` | Minimum credit increment for rounding (0.01, 0.1, or 1.0) | `billing` |

**Example Query:**
```sql
SELECT * FROM system_settings WHERE key = 'credit_minimum_increment';

-- Result:
-- key: 'credit_minimum_increment'
-- value: '0.1'
-- value_type: 'decimal'
-- description: 'Minimum credit increment for rounding...'
-- category: 'billing'
-- is_public: false
```

---

## Precision and Rounding

### Decimal(12, 2) Specification

- **Total Digits:** 12 (including decimal places)
- **Decimal Places:** 2
- **Maximum Value:** 9,999,999,999.99
- **Minimum Value:** 0.00
- **Storage Size:** 8 bytes (PostgreSQL)

### Credit Increment Configuration

| Increment | Cost per Increment | Example Rounding |
|-----------|-------------------|------------------|
| **1.0** (legacy) | $0.01 | $0.000246 → 1.0 credits |
| **0.1** (default) | $0.001 | $0.000246 → 0.1 credits |
| **0.01** (maximum precision) | $0.0001 | $0.000246 → 0.03 credits |

### Rounding Formula

```typescript
// Get cached increment setting (e.g., 0.1)
const increment = getCreditIncrement();

// Calculate divisor: increment × $0.01 per credit
const divisor = increment * 0.01;

// Round up to nearest increment
const creditsToDeduct = Math.ceil(costWithMultiplier / divisor) * increment;
```

**Examples:**

```typescript
// increment = 0.1 (default)
costWithMultiplier = $0.000246
divisor = 0.1 × 0.01 = 0.001
creditsToDeduct = Math.ceil(0.246) × 0.1 = 1 × 0.1 = 0.1 credits

// increment = 0.01 (maximum precision)
costWithMultiplier = $0.000246
divisor = 0.01 × 0.01 = 0.0001
creditsToDeduct = Math.ceil(2.46) × 0.01 = 3 × 0.01 = 0.03 credits

// increment = 1.0 (legacy)
costWithMultiplier = $0.000246
divisor = 1.0 × 0.01 = 0.01
creditsToDeduct = Math.ceil(0.0246) × 1.0 = 1 × 1.0 = 1.0 credits
```

---

## Migration Strategy

### Phase 1: Add Decimal Columns (Non-Breaking)

```sql
ALTER TABLE user_credit_balance
  ADD COLUMN amount_decimal DECIMAL(12, 2),
  ADD COLUMN last_deduction_amount_decimal DECIMAL(12, 2);
```

**Safety:** No data loss, old Int columns remain intact.

---

### Phase 2: Migrate Data (Transactional)

```sql
UPDATE user_credit_balance
  SET
    amount_decimal = amount::decimal,
    last_deduction_amount_decimal = CASE
      WHEN last_deduction_amount IS NULL THEN NULL
      ELSE last_deduction_amount::decimal
    END;
```

**Safety:** Transaction-based, automatic rollback on error.

---

### Phase 3: Verify Integrity (Critical)

```sql
SELECT COUNT(*) FROM user_credit_balance
  WHERE amount::decimal != amount_decimal
     OR (
       last_deduction_amount IS NOT NULL
       AND last_deduction_amount::decimal != last_deduction_amount_decimal
     );
```

**Expected Result:** 0 rows (all data verified).

---

### Phase 4: Finalize (Drop Old Columns)

```sql
ALTER TABLE user_credit_balance
  DROP COLUMN amount,
  DROP COLUMN last_deduction_amount,
  ALTER COLUMN amount_decimal SET NOT NULL,
  ALTER COLUMN amount_decimal SET DEFAULT 0;

ALTER TABLE user_credit_balance
  RENAME COLUMN amount_decimal TO amount;
ALTER TABLE user_credit_balance
  RENAME COLUMN last_deduction_amount_decimal TO last_deduction_amount;
```

**Safety:** All verification passed, safe to drop old columns.

---

## Rollback Plan

If critical issues occur, revert using the rollback script:

```bash
npm run ts-node prisma/migrations/rollback-decimal-credits.ts --confirm
```

**Warning:** This will **truncate decimal values to integers**.

**Example Data Loss:**
```sql
-- Before rollback:
amount: 1499.90

-- After rollback:
amount: 1499  -- Lost 0.90 credits
```

**Safety Measures:**
- Requires `--confirm` flag
- Calculates estimated data loss before rollback
- 5-second delay before execution
- Transaction-based (all-or-nothing)

---

## Testing Checklist

### Pre-Migration Tests

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify Prisma client generation works
- [ ] Test service code with Decimal types
- [ ] Verify API responses match new schema

### Post-Migration Tests

- [ ] Verify all credit balances migrated correctly
- [ ] Test credit deduction with 0.1 increment
- [ ] Test aggregation queries (SUM, AVG)
- [ ] Test admin analytics endpoints
- [ ] Verify Prisma Decimal type conversions
- [ ] Test edge cases (NULL values, zero balances, large numbers)

### Rollback Tests

- [ ] Test rollback script on copy of production data
- [ ] Verify rollback script calculates data loss correctly
- [ ] Test rollback reverses all changes

---

## Performance Considerations

### Query Performance

- **Decimal vs Int:** Minimal performance difference (<5%)
- **Aggregations:** Use Prisma's built-in Decimal handling
- **Indexes:** All existing indexes preserved

### Storage Impact

- **Int:** 4 bytes per field
- **Decimal(12, 2):** 8 bytes per field
- **Estimated Increase:** ~4 bytes × 6 fields × row count

**Example:**
- 1M token_usage_ledger rows: ~24 MB additional storage
- Negligible impact on modern databases

---

## API Response Format

### Before Migration

```json
{
  "credits": {
    "deducted": 1,
    "remaining": 1499
  }
}
```

### After Migration

```json
{
  "credits": {
    "deducted": 0.1,
    "deductedRounded": 0,
    "remaining": 1499.9,
    "remainingRounded": 1500
  }
}
```

**Notes:**
- Precise values: 0.1, 1499.9 (backend uses these)
- Rounded values: 0, 1500 (desktop client displays these)

---

## Troubleshooting

### Issue: Migration Fails with Data Mismatch

**Cause:** Data corruption or concurrent writes during migration.

**Solution:**
1. Stop all credit deduction operations
2. Roll back transaction (automatic)
3. Verify database integrity
4. Retry migration

---

### Issue: Prisma Client Generation Fails

**Cause:** Schema.prisma not updated with Decimal types.

**Solution:**
1. Update schema.prisma with Decimal definitions
2. Run `npx prisma generate`
3. Verify types in generated client

---

### Issue: API Returns Wrong Decimal Values

**Cause:** Missing parseFloat() conversions.

**Solution:**
1. Update type mappers in `utils/typeMappers.ts`
2. Convert Prisma Decimal → number in services
3. Test API responses

---

## References

- **Plan Document:** [Plan 208: Fractional Credit System Migration](../plan/208-fractional-credit-system-migration.md)
- **Migration File:** `backend/prisma/migrations/20251121000000_fractional_credits/migration.sql`
- **Migration Script:** `backend/prisma/migrations/migrate-to-decimal-credits.ts`
- **Rollback Script:** `backend/prisma/migrations/rollback-decimal-credits.ts`
- **Prisma Decimal Docs:** https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal
- **PostgreSQL Decimal Types:** https://www.postgresql.org/docs/current/datatype-numeric.html

---

## Approval & Sign-off

- [ ] Database Schema: Reviewed by _______________
- [ ] Migration Script: Tested by _______________
- [ ] Rollback Plan: Approved by _______________
- [ ] Production Deployment: Authorized by _______________

---

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Next Review:** After production deployment
