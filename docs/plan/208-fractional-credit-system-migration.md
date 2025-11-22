# Plan 208: Fractional Credit System Migration (0.1 Credit Increments)

**Status:** Draft
**Created:** 2025-01-21
**Priority:** High
**Related Plans:** [Plan 189](./189-pricing-tier-restructure-plan.md), [Plan 112](./112-token-to-credit-conversion-mechanism.md)

---

## Executive Summary

Migrate the credit system from whole-number increments (1.0 credit minimum) to fractional increments (0.1 credit minimum) to provide fairer pricing for users, especially for small API calls. This addresses the current issue where small calls with vendor cost of $0.000246 are rounded up to 1 full credit ($0.01), resulting in an unfair 40x markup.

**Current State:**
- Vendor cost + multiplier: $0.000246 (0.0246 credits)
- Rounded to: **1.0 credit = $0.01**
- Effective markup: **40x over cost** (UNFAIR)

**Target State:**
- Vendor cost + multiplier: $0.000246 (0.0246 credits)
- Rounded to: **0.1 credit = $0.001**
- Effective markup: **4x over cost** (FAIR)

---

## Problem Statement

### Current Pain Points

1. **Excessive Markup:** Small API calls (8 input + 19 output tokens) cost $0.000246 but charge 1 full credit ($0.01) = 40x markup
2. **User Perception:** Users feel they're wasting credits on exploratory/small calls
3. **Competitive Disadvantage:** Industry standard (OpenAI, Anthropic) uses sub-cent precision
4. **Accumulated Waste:** Users making many small calls lose credits unnecessarily

### Example Scenario

```typescript
// Small API call: "Say hi"
Input tokens: 8
Output tokens: 19
Vendor cost: $0.00004
Multiplier: 1.5x (Pro tier)
Cost with multiplier: $0.00006

// Current system (UNFAIR):
Credits deducted: Math.ceil(0.006) = 1 credit = $0.01
User pays: 166x more than vendor cost

// Proposed system (FAIR):
Credits deducted: Math.ceil(0.06) * 0.1 = 0.1 credit = $0.001
User pays: 16.6x more than vendor cost (acceptable margin)
```

---

## Solution Overview

### Strategy

Implement 0.1 credit increment system with:
1. **Backend:** Precise decimal storage (Decimal(12, 1))
2. **API:** Return both precise and rounded values for flexibility
3. **Desktop Client:** Display rounded values to users (1499.9 → 1500)
4. **Database:** Migrate all Int credit fields to Decimal

### Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Minimum increment | **Configurable** (default: 0.1 credits) | Administrator can adjust without code changes |
| Storage precision | Decimal(12, 2) | Supports up to 999B credits with 0.01 precision |
| Configuration storage | Database `system_settings` table | Persistent, auditable, admin-configurable |
| Configuration cache | Global static variable | Avoid database reads on every calculation |
| API response | Precise + rounded | Flexibility for different UI needs |
| User display | Rounded integers | Familiar UX, backend handles precision |
| Credit value formula | `credits × $0.01` | Maintains Plan 189 standard |

---

## Technical Specification

### 1. Configuration System

#### System Settings Table

Add new configuration setting for minimum credit increment:

```sql
-- Add to system_settings table (or create if doesn't exist)
INSERT INTO system_settings (key, value, value_type, description, category, is_public, updated_at)
VALUES (
  'credit_minimum_increment',
  '0.1',
  'decimal',
  'Minimum credit increment for credit deduction rounding (e.g., 0.1 = $0.001 per increment)',
  'billing',
  false,
  NOW()
);
```

#### Global Static Cache Implementation

**Location:** `backend/src/services/credit-deduction.service.ts`

```typescript
export class CreditDeductionService {
  // Global static cache for minimum credit increment
  private static creditMinimumIncrement: number = 0.1;  // Default value
  private static lastSettingsUpdate: Date = new Date(0);  // Epoch time

  /**
   * Load credit minimum increment from database
   * Called on service initialization and when settings change
   */
  private async loadCreditIncrementSetting(): Promise<void> {
    const setting = await this.prisma.system_settings.findUnique({
      where: { key: 'credit_minimum_increment' }
    });

    if (setting) {
      CreditDeductionService.creditMinimumIncrement = parseFloat(setting.value);
      CreditDeductionService.lastSettingsUpdate = new Date();
      logger.info('Credit minimum increment loaded', {
        increment: CreditDeductionService.creditMinimumIncrement
      });
    }
  }

  /**
   * Get current credit minimum increment (cached)
   */
  private getCreditIncrement(): number {
    return CreditDeductionService.creditMinimumIncrement;
  }

  /**
   * Admin endpoint to update credit increment
   * Triggers cache refresh across all service instances
   */
  async updateCreditIncrement(newIncrement: number): Promise<void> {
    // Validate increment (must be 0.1, 0.01, or 1.0)
    const validIncrements = [0.01, 0.1, 1.0];
    if (!validIncrements.includes(newIncrement)) {
      throw new Error('Invalid credit increment. Allowed: 0.01, 0.1, 1.0');
    }

    await this.prisma.system_settings.upsert({
      where: { key: 'credit_minimum_increment' },
      update: { value: newIncrement.toString(), updated_at: new Date() },
      create: {
        key: 'credit_minimum_increment',
        value: newIncrement.toString(),
        value_type: 'decimal',
        description: 'Minimum credit increment for rounding',
        category: 'billing',
        is_public: false
      }
    });

    // Refresh cache
    await this.loadCreditIncrementSetting();

    logger.info('Credit minimum increment updated', {
      oldIncrement: CreditDeductionService.creditMinimumIncrement,
      newIncrement
    });
  }
}
```

#### Service Initialization

**Location:** `backend/src/server.ts` or DI container setup

```typescript
// Load settings cache on startup
const creditService = container.resolve(CreditDeductionService);
await creditService['loadCreditIncrementSetting']();
```

#### Admin API Endpoint

**New endpoint:** `PUT /admin/settings/credit-increment`

```typescript
// Controller: admin-settings.controller.ts
async updateCreditIncrement(req: Request, res: Response) {
  const { increment } = req.body;  // 0.01, 0.1, or 1.0

  await this.creditDeductionService.updateCreditIncrement(increment);

  res.json({
    success: true,
    message: 'Credit increment updated successfully',
    data: { creditMinimumIncrement: increment }
  });
}
```

### 2. Database Schema Changes

#### Fields to Migrate (Int → Decimal)

**user_credit_balance table:**
```sql
-- Current
amount                Int
last_deduction_amount Int

-- After migration
amount                Decimal(12, 2)  -- 9,999,999,999.99
last_deduction_amount Decimal(12, 2)
```

**token_usage_ledger table:**
```sql
-- Current
credits_deducted   Int
input_credits      Int (nullable)
output_credits     Int (nullable)
total_credits      Int (nullable)
cache_write_credits Int (nullable)
cache_read_credits  Int (nullable)

-- After migration
credits_deducted    Decimal(12, 2)
input_credits       Decimal(12, 2) (nullable)
output_credits      Decimal(12, 2) (nullable)
total_credits       Decimal(12, 2) (nullable)
cache_write_credits Decimal(12, 2) (nullable)
cache_read_credits  Decimal(12, 2) (nullable)
```

**credit_deduction_ledger table:**
```sql
-- Current
amount         Int
balance_before Int
balance_after  Int

-- After migration
amount         Decimal(12, 2)
balance_before Decimal(12, 2)
balance_after  Decimal(12, 2)
```

**subscriptions table:**
```sql
-- Keep as Int (tier allocations are whole numbers)
credits_per_month  Int  -- No change (200, 1500, etc.)
```

**credit_allocations table:**
```sql
-- Current
credits_allocated  Int
credits_deducted   Int
credits_balance_eod Int

-- After migration
credits_allocated  Int  -- Keep as Int (monthly allocation)
credits_deducted   Decimal(12, 2)
credits_balance_eod Decimal(12, 2)
```

#### Data Migration Strategy

```sql
-- Step 1: Add new decimal columns alongside Int columns
ALTER TABLE user_credit_balance
  ADD COLUMN amount_decimal DECIMAL(12, 2);

-- Step 2: Migrate data (Int → Decimal)
UPDATE user_credit_balance
  SET amount_decimal = amount::decimal;

-- Step 3: Verify data integrity
SELECT COUNT(*) FROM user_credit_balance
  WHERE amount::decimal != amount_decimal;
-- Should return 0

-- Step 4: Drop old Int column, rename decimal column
ALTER TABLE user_credit_balance
  DROP COLUMN amount,
  RENAME COLUMN amount_decimal TO amount;
```

### 3. Credit Calculation Logic (Configurable)

**Current Rounding (Unfair):**
```typescript
const creditsToDeduct = Math.ceil(costWithMultiplier / 0.01);
// Result: 1, 2, 3, ... (whole credits only)
```

**New Rounding (Configurable increment):**
```typescript
// Get cached increment setting (no database read)
const increment = this.getCreditIncrement();  // e.g., 0.1 (default)

// Calculate the divisor based on increment
// increment = 0.1 → divisor = 0.001 ($0.001 per 0.1 credit)
// increment = 0.01 → divisor = 0.0001 ($0.0001 per 0.01 credit)
// increment = 1.0 → divisor = 0.01 ($0.01 per 1.0 credit)
const divisor = increment * 0.01;

// Apply rounding with configurable increment
const creditsToDeduct = Math.ceil(costWithMultiplier / divisor) * increment;

// Examples:
// If increment = 0.1:
//   costWithMultiplier = $0.000246
//   creditsToDeduct = Math.ceil(0.246) * 0.1 = 1 * 0.1 = 0.1 credits
//
// If increment = 0.01:
//   costWithMultiplier = $0.000246
//   creditsToDeduct = Math.ceil(2.46) * 0.01 = 3 * 0.01 = 0.03 credits
//
// If increment = 1.0:
//   costWithMultiplier = $0.000246
//   creditsToDeduct = Math.ceil(0.0246) * 1.0 = 1 * 1.0 = 1.0 credits (old behavior)
```

**Implementation in credit-deduction.service.ts:**
```typescript
/**
 * Helper method: Calculate credits to deduct with configurable increment
 */
private calculateCreditsToDeduct(costWithMultiplier: number): number {
  const increment = this.getCreditIncrement();  // Cached, no DB read
  const divisor = increment * 0.01;
  return Math.ceil(costWithMultiplier / divisor) * increment;
}

// Line ~100: Update estimation formula
const creditValue = vendorCost * marginMultiplier;
const creditsToDeduct = this.calculateCreditsToDeduct(creditValue);

// Line ~250: Update deduction formula
const costWithMultiplier = tokenUsageRecord.vendorCost * tokenUsageRecord.marginMultiplier;
const creditsToDeduct = this.calculateCreditsToDeduct(costWithMultiplier);
```

### 4. API Response Format

**Updated Response Structure:**
```typescript
interface CreditUsageResponse {
  creditsUsed: number;  // Precise decimal (e.g., 0.1, 1.3)
  credits: {
    deducted: number;  // Precise decimal
    deductedRounded: number;  // Rounded for display (NEW)
    remaining: number;  // Precise decimal (e.g., 1499.9)
    remainingRounded: number;  // Rounded for display (e.g., 1500) (NEW)
    subscriptionRemaining: number;  // Precise decimal
    subscriptionRemainingRounded: number;  // Rounded (NEW)
    purchasedRemaining: number;  // Precise decimal
    purchasedRemainingRounded: number;  // Rounded (NEW)
  };
}
```

**Example API Response:**
```json
{
  "usage": {
    "promptTokens": 8,
    "completionTokens": 81,
    "totalTokens": 89,
    "creditsUsed": 0.1,
    "credits": {
      "deducted": 0.1,
      "deductedRounded": 0,
      "remaining": 1499.9,
      "remainingRounded": 1500,
      "subscriptionRemaining": 1499.9,
      "subscriptionRemainingRounded": 1500,
      "purchasedRemaining": 0.0,
      "purchasedRemainingRounded": 0
    }
  }
}
```

### 5. TypeScript Type Updates

**shared-types/src/credit.types.ts:**
```typescript
// Current
export interface CreditDeductionRecord {
  amount: number;  // Int
  balanceBefore: number;  // Int
  balanceAfter: number;  // Int
}

// After migration
export interface CreditDeductionRecord {
  amount: number;  // Decimal (0.1, 1.5, etc.)
  balanceBefore: number;  // Decimal
  balanceAfter: number;  // Decimal
  balanceAfterRounded?: number;  // NEW: For UI convenience
  amountRounded?: number;  // NEW: For UI convenience
}

export interface CreditUsageResponse {
  creditsUsed: number;  // Decimal
  creditsUsedRounded?: number;  // NEW
  // ... rest of fields
}
```

### 6. Service Layer Updates

**Files requiring changes:**

1. **credit-deduction.service.ts** (PRIMARY)
   - Add static cache variables: `creditMinimumIncrement`, `lastSettingsUpdate`
   - Add `loadCreditIncrementSetting()` method (loads from DB into cache)
   - Add `getCreditIncrement()` method (returns cached value)
   - Add `calculateCreditsToDeduct()` helper method (uses cached increment)
   - Add `updateCreditIncrement()` method (admin API to change setting)
   - Line 100: Update `estimateCreditsForRequest()` to use `calculateCreditsToDeduct()`
   - Line 250: Update `deductCreditsWithUsageTracking()` to use `calculateCreditsToDeduct()`
   - Line 377: Update return object to include rounded values
   - Line 545: Change `parseInt()` → `parseFloat()` in mapper

2. **credit.service.ts**
   - Update balance calculations to use Decimal
   - Change all `parseInt()` → `parseFloat()`

3. **admin-analytics.service.ts**
   - Update aggregation queries (`_sum.credits_deducted`)
   - Handle Decimal types in calculations

4. **platform-analytics.service.ts**
   - Update total calculations
   - Convert Decimal to number for JSON responses

5. **llm.service.ts**
   - Update credit usage response building
   - Add rounded values to API responses

### 7. Database Query Updates

**Prisma Aggregations:**
```typescript
// Current
const totalCredits = await prisma.token_usage_ledger.aggregate({
  _sum: { credits_deducted: true }
});
const total = totalCredits._sum.credits_deducted || 0;  // Int

// After migration
const totalCredits = await prisma.token_usage_ledger.aggregate({
  _sum: { credits_deducted: true }
});
// Prisma returns Decimal type
const total = parseFloat(totalCredits._sum.credits_deducted?.toString() || '0');
```

**Raw SQL Queries:**
```sql
-- Current
SELECT SUM(credits_deducted) as total_credits
FROM token_usage_ledger;
-- Returns: 1500 (Int)

-- After migration
SELECT SUM(credits_deducted) as total_credits
FROM token_usage_ledger;
-- Returns: 1499.9 (Decimal)
-- Convert in TypeScript: parseFloat(result.total_credits)
```

---

## Migration Plan

### Phase 1: Preparation & Analysis
**Duration:** 1 day
**Responsibility:** db-schema-architect agent

**Tasks:**
1. ✅ Analyze current schema and identify all Int credit fields
2. ✅ Design Decimal migration strategy with data preservation
3. ✅ Create Prisma migration files (Int → Decimal)
4. ✅ Add `credit_minimum_increment` setting to system_settings table
5. ✅ Write data migration scripts (Int → Decimal)
6. ✅ Create rollback plan in case of issues
7. ✅ Document schema changes

**Deliverables:**
- Prisma migration file: `backend/prisma/migrations/YYYYMMDDHHMMSS_fractional_credits/migration.sql`
- Data migration script: `backend/prisma/migrations/migrate-to-decimal-credits.ts`
- Rollback script: `backend/prisma/migrations/rollback-decimal-credits.ts`
- Documentation: `docs/reference/208-decimal-credit-schema.md`

### Phase 2: Service Layer Updates
**Duration:** 2 days
**Responsibility:** api-backend-implementer agent

**Tasks:**
1. ✅ Update credit-deduction.service.ts
   - Add static cache variables (creditMinimumIncrement, lastSettingsUpdate)
   - Add loadCreditIncrementSetting() method
   - Add getCreditIncrement() method (returns cached value)
   - Add calculateCreditsToDeduct() helper (uses dynamic increment)
   - Add updateCreditIncrement() admin method
   - Update rounding formula to use configurable increment
   - Update return types to include rounded values
   - Change parseInt() → parseFloat()
2. ✅ Create admin-settings.controller.ts
   - Add PUT /admin/settings/credit-increment endpoint
   - Validation for allowed increments (0.01, 0.1, 1.0)
3. ✅ Update server.ts initialization
   - Load credit increment setting on startup
4. ✅ Update credit.service.ts
   - Decimal balance calculations
   - parseFloat() conversions
5. ✅ Update admin-analytics.service.ts
   - Decimal aggregations
   - Type conversions
6. ✅ Update platform-analytics.service.ts
7. ✅ Update llm.service.ts
   - Add rounded values to API responses
8. ✅ Update all TypeScript interfaces in shared-types
9. ✅ Update type mappers in utils/typeMappers.ts

**Deliverables:**
- Updated service files with Decimal support
- Updated TypeScript type definitions
- Migration guide: `docs/reference/208-service-decimal-migration-guide.md`

### Phase 3: Testing & Verification
**Duration:** 1 day
**Responsibility:** testing-qa-specialist agent

**Tasks:**
1. ✅ Unit tests for configurable rounding logic
   - Test with increment = 0.1 (default)
   - Test with increment = 0.01
   - Test with increment = 1.0
2. ✅ Integration tests for credit deduction
3. ✅ Test configuration system
   - Test loadCreditIncrementSetting() on startup
   - Test updateCreditIncrement() admin endpoint
   - Test cache refresh when setting changes
   - Test validation of allowed increments
4. ✅ Test data migration script on copy of production DB
5. ✅ Verify API responses match new schema
6. ✅ Test edge cases:
   - Very small credit amounts (0.1, 0.2, 0.03)
   - Large balance calculations
   - Decimal precision edge cases
   - Aggregation queries return correct Decimals
   - Switching between different increment settings
7. ✅ Performance testing (Decimal vs Int operations)

**Deliverables:**
- Test suite: `backend/tests/integration/fractional-credits.test.ts`
- Test report: `docs/analysis/208-fractional-credit-test-report.md`

### Phase 4: Desktop Client Updates
**Duration:** 1 day
**Responsibility:** Desktop client team (external)

**Tasks:**
1. ✅ Update API response type definitions
2. ✅ Handle decimal credit values
3. ✅ Display rounded values to users
4. ✅ Update UI to show "1500" for 1499.9 balance
5. ✅ Test credit display in various scenarios

**Deliverables:**
- Updated desktop client with Decimal support
- UI screenshots showing rounded credit display

### Phase 5: Deployment & Monitoring
**Duration:** 1 day
**Responsibility:** DevOps + Backend team

**Tasks:**
1. ✅ Backup production database
2. ✅ Run Prisma migration in production
3. ✅ Run data migration script
4. ✅ Verify data integrity post-migration
5. ✅ Monitor API responses for correct decimal values
6. ✅ Monitor credit deduction behavior
7. ✅ Roll back if critical issues found

**Deliverables:**
- Production deployment checklist
- Post-migration verification report
- Monitoring dashboard updates

---

## Deprecated Field Cleanup

### Fields to Remove

**None identified** - Analysis shows all credit fields are actively used:

- ✅ `credits_deducted` - **KEEP** (heavily used, not deprecated)
- ✅ `input_credits`, `output_credits`, `total_credits` - **KEEP** (Phase 3 separate pricing)
- ✅ Remove misleading "DEPRECATED" comment from schema

### Schema Comment Updates

**token_usage_ledger model (schema.prisma:1153):**
```prisma
// Current (misleading):
// DEPRECATED: Will be removed in future version after migration
credits_deducted Int

// After cleanup:
credits_deducted Decimal @db.Decimal(12, 1)
```

---

## Agent Delegation Plan

### 1. db-schema-architect Agent
**Task:** Database schema migration and data migration scripts

**Prompt:**
```
Implement fractional credit system migration for Plan 208.

CONTEXT:
- Current system uses Int for all credit fields (1, 2, 3...)
- Need to migrate to Decimal(12, 2) for 0.01 precision (supports 0.01, 0.1, 1.0 increments)
- Must preserve all existing data during migration
- Add configuration system for minimum credit increment setting

REQUIREMENTS:
1. Create Prisma migration to change Int → Decimal(12, 2) for:
   - user_credit_balance: amount, last_deduction_amount
   - token_usage_ledger: credits_deducted, input_credits, output_credits, total_credits, cache_write_credits, cache_read_credits
   - credit_deduction_ledger: amount, balance_before, balance_after
   - credit_allocations: credits_deducted, credits_balance_eod

2. KEEP as Int (no migration needed):
   - subscriptions.credits_per_month
   - credit_allocations.credits_allocated

3. Add configuration setting to system_settings table:
   - key: 'credit_minimum_increment'
   - value: '0.1' (default)
   - value_type: 'decimal'
   - description: 'Minimum credit increment for rounding (e.g., 0.1 = $0.001 per increment)'
   - category: 'billing'
   - is_public: false

4. Create data migration strategy:
   - Add new Decimal columns
   - Copy Int → Decimal
   - Verify integrity
   - Drop Int columns
   - Rename Decimal columns
   - Insert credit_minimum_increment setting

5. Create rollback script

6. Update schema comments (remove misleading "DEPRECATED" from credits_deducted)

DELIVERABLES:
- backend/prisma/migrations/YYYYMMDDHHMMSS_fractional_credits/migration.sql
- backend/prisma/migrations/migrate-to-decimal-credits.ts
- backend/prisma/migrations/rollback-decimal-credits.ts
- docs/reference/208-decimal-credit-schema.md

REFERENCE DOCUMENTS TO READ FIRST:
- docs/plan/208-fractional-credit-system-migration.md (complete migration plan)
- backend/prisma/schema.prisma (current schema)
```

### 2. api-backend-implementer Agent
**Task:** Service layer updates for Decimal support with configurable increment

**Prompt:**
```
Update backend services to support fractional credit system with configurable minimum increment (Plan 208).

CONTEXT:
- Database schema migrated Int → Decimal(12, 2)
- Need to update all services to handle decimal credits with 0.01 precision
- Minimum credit increment is configurable via system_settings (default: 0.1)
- Use global static cache to avoid database reads on every credit calculation

REQUIREMENTS:
1. Update credit-deduction.service.ts:
   - Add static cache variables:
     - private static creditMinimumIncrement: number = 0.1
     - private static lastSettingsUpdate: Date = new Date(0)
   - Add loadCreditIncrementSetting() method (loads from system_settings)
   - Add getCreditIncrement() method (returns cached value, no DB read)
   - Add calculateCreditsToDeduct(costWithMultiplier) helper method:
     - Uses dynamic increment from cache
     - Formula: Math.ceil(costWithMultiplier / (increment * 0.01)) * increment
   - Add updateCreditIncrement(newIncrement) admin method:
     - Validates increment (0.01, 0.1, or 1.0 only)
     - Updates system_settings table
     - Refreshes cache
   - Line ~100: Update estimateCreditsForRequest() to use calculateCreditsToDeduct()
   - Line ~250: Update deductCreditsWithUsageTracking() to use calculateCreditsToDeduct()
   - Line ~377: Add rounded values to return object
   - Line ~545: Change parseInt() → parseFloat() in mapper

2. Create admin-settings.controller.ts:
   - Add PUT /admin/settings/credit-increment endpoint
   - Validate allowed increments (0.01, 0.1, 1.0)
   - Call creditDeductionService.updateCreditIncrement()

3. Update server.ts initialization:
   - After service initialization, load credit increment setting
   - Example: await creditService.loadCreditIncrementSetting()

4. Update credit.service.ts:
   - Change all parseInt() → parseFloat()
   - Update balance calculations for Decimal

5. Update analytics services:
   - admin-analytics.service.ts: Handle Decimal aggregations
   - platform-analytics.service.ts: Convert Decimal to number
   - Handle Prisma Decimal type conversions

6. Update llm.service.ts:
   - Add rounded values to API credit responses
   - Update usage response builder

7. Update shared-types/src/credit.types.ts:
   - Add *Rounded fields to interfaces

8. Update utils/typeMappers.ts for Decimal handling

FORMULA (Configurable):
```typescript
// Get cached increment (no DB read)
const increment = this.getCreditIncrement();  // e.g., 0.1

// Calculate divisor: increment * $0.01 per credit
const divisor = increment * 0.01;

// Round up to nearest increment
const creditsToDeduct = Math.ceil(costWithMultiplier / divisor) * increment;

// Examples:
// increment=0.1: Math.ceil(0.000246 / 0.001) * 0.1 = 1 * 0.1 = 0.1 credits
// increment=0.01: Math.ceil(0.000246 / 0.0001) * 0.01 = 3 * 0.01 = 0.03 credits
// increment=1.0: Math.ceil(0.000246 / 0.01) * 1.0 = 1 * 1.0 = 1.0 credits
```

DELIVERABLES:
- Updated service files with configurable increment
- New admin-settings.controller.ts
- Updated server.ts initialization
- Updated type definitions
- docs/reference/208-service-decimal-migration-guide.md

REFERENCE DOCUMENTS TO READ FIRST:
- docs/plan/208-fractional-credit-system-migration.md (complete migration plan with configuration system)
- backend/src/services/credit-deduction.service.ts (current implementation)
```

### 3. testing-qa-specialist Agent
**Task:** Comprehensive testing for configurable fractional credit system

**Prompt:**
```
Create comprehensive test suite for fractional credit system with configurable minimum increment (Plan 208).

CONTEXT:
- Migrated from Int credits to Decimal(12, 2) for 0.01 precision
- Minimum increment is configurable via system_settings (default: 0.1)
- Supported increments: 0.01, 0.1, 1.0
- Global static cache avoids database reads on every calculation
- Must verify all credit calculations, API responses, configuration system, and data integrity

REQUIREMENTS:
1. Unit tests for configurable rounding logic:
   - Test with increment = 0.1 (default):
     - Edge cases: 0.01, 0.09, 0.11, 0.99, 1.01
     - Verify Math.ceil((cost / 0.001)) * 0.1 formula
   - Test with increment = 0.01:
     - Edge cases: 0.001, 0.009, 0.011, 0.099, 0.101
     - Verify Math.ceil((cost / 0.0001)) * 0.01 formula
   - Test with increment = 1.0 (legacy behavior):
     - Edge cases: 0.001, 0.5, 0.99, 1.01
     - Verify Math.ceil((cost / 0.01)) * 1.0 formula

2. Configuration system tests:
   - Test loadCreditIncrementSetting() on service initialization
   - Test getCreditIncrement() returns cached value (no DB query)
   - Test updateCreditIncrement() admin endpoint:
     - Valid increments (0.01, 0.1, 1.0) accepted
     - Invalid increments (0.05, 2.0) rejected
     - Cache refreshes after update
   - Test PUT /admin/settings/credit-increment endpoint

3. Integration tests:
   - Credit deduction with different increments:
     - 0.1 increment: $0.000246 → 0.1 credits
     - 0.01 increment: $0.000246 → 0.03 credits
     - 1.0 increment: $0.000246 → 1.0 credits
   - Balance updates preserve Decimal precision
   - Aggregation queries return correct Decimal sums
   - Test switching increment mid-operation

4. API response tests:
   - Verify decimal values in responses
   - Check rounded values are included (*Rounded fields)
   - Test usage endpoint returns fractional credits
   - Test with different increment settings

5. Data migration tests:
   - Mock migration on test database
   - Verify Int → Decimal conversion accuracy
   - Test rollback script
   - Verify credit_minimum_increment setting created

6. Edge case testing:
   - Very small costs ($0.0001, $0.00001)
   - Large balances (millions of credits)
   - Decimal precision (no floating point drift)
   - Concurrent credit deductions with same increment
   - Changing increment while deductions in progress

7. Performance tests:
   - Compare Decimal vs Int query performance
   - Aggregation performance with Decimal fields
   - Cache hit rate for getCreditIncrement()

TEST SCENARIOS:
```typescript
// Scenario 1: Default increment (0.1)
vendorCost = $0.00004, multiplier = 1.5x
costWithMultiplier = $0.00006
expected = 0.1 credits (not 1.0)

// Scenario 2: Fine-grained increment (0.01)
vendorCost = $0.00004, multiplier = 1.5x, increment = 0.01
costWithMultiplier = $0.00006
expected = 0.01 credits

// Scenario 3: Legacy increment (1.0)
vendorCost = $0.00004, multiplier = 1.5x, increment = 1.0
costWithMultiplier = $0.00006
expected = 1.0 credits (old behavior)

// Scenario 4: Switching increments
1. Set increment to 0.1
2. Deduct credits → expect 0.1
3. Set increment to 0.01
4. Deduct credits → expect 0.01 or 0.03
```

DELIVERABLES:
- backend/tests/integration/fractional-credits.test.ts
- backend/tests/integration/credit-increment-config.test.ts (NEW)
- docs/analysis/208-fractional-credit-test-report.md

REFERENCE DOCUMENTS TO READ FIRST:
- docs/plan/208-fractional-credit-system-migration.md (complete migration plan with configuration system)
```

---

## Rollback Plan

In case of critical issues during deployment:

1. **Immediate Actions:**
   - Stop all credit deduction operations
   - Switch API to maintenance mode
   - Notify users of temporary service interruption

2. **Data Rollback:**
   ```sql
   -- Restore from backup
   pg_restore -d rephlo-production backup_pre_decimal_migration.dump

   -- Or run rollback script
   node backend/prisma/migrations/rollback-decimal-credits.ts
   ```

3. **Code Rollback:**
   - Revert Prisma migration: `npx prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_fractional_credits`
   - Deploy previous backend version
   - Restart services

4. **Verification:**
   - Test credit deduction works with Int fields
   - Verify user balances match pre-migration state
   - Check API responses return Int values

---

## Success Criteria

1. ✅ All database credit fields migrated to Decimal(12, 2)
2. ✅ Configuration system implemented with system_settings table
3. ✅ Global static cache for credit_minimum_increment (no DB reads per calculation)
4. ✅ Credit deduction uses configurable increment rounding (default: 0.1)
5. ✅ Admin endpoint PUT /admin/settings/credit-increment functional
6. ✅ Validation ensures only allowed increments (0.01, 0.1, 1.0)
7. ✅ API responses return decimal values with rounded alternatives
8. ✅ Small API calls (< $0.001) deduct 0.1 credits instead of 1.0 (with default setting)
9. ✅ User balances show fractional credits (e.g., 1499.9)
10. ✅ Desktop client displays rounded values (1499.9 → 1500)
11. ✅ All tests pass (unit, integration, E2E, configuration tests)
12. ✅ No data loss during migration
13. ✅ Performance impact < 5% for credit operations
14. ✅ Cache refresh works correctly when increment setting changes
15. ✅ Rollback plan tested and ready

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | Comprehensive backups + tested rollback |
| Floating point precision errors | Medium | Medium | Use Decimal type, not Float |
| API breaking changes | High | Low | Include both precise & rounded values |
| Performance degradation | Medium | Low | Benchmark Decimal operations |
| User confusion with decimals | Low | Medium | Desktop client rounds for display |

---

## Post-Launch Monitoring

**Metrics to Track:**

1. **Credit Accuracy:**
   - Monitor credits_deducted values (should see 0.1, 0.2, etc.)
   - Verify credit_value_usd = credits_deducted × 0.01

2. **User Behavior:**
   - Track small API calls (< 0.5 credits)
   - Monitor user feedback on credit fairness

3. **System Performance:**
   - Query performance with Decimal fields
   - Aggregation query timing

4. **Data Integrity:**
   - Daily balance reconciliation
   - Detect any floating point drift

---

## Timeline

| Phase | Duration | Start Date | End Date |
|-------|----------|-----------|----------|
| Phase 1: Schema Migration | 1 day | TBD | TBD |
| Phase 2: Service Updates | 2 days | TBD | TBD |
| Phase 3: Testing | 1 day | TBD | TBD |
| Phase 4: Desktop Client | 1 day | TBD | TBD |
| Phase 5: Deployment | 1 day | TBD | TBD |
| **Total** | **6 days** | TBD | TBD |

---

## Approval & Sign-off

- [ ] Product Owner: Approved by _______________
- [ ] Technical Lead: Reviewed by _______________
- [ ] Database Admin: Schema reviewed by _______________
- [ ] QA Lead: Test plan approved by _______________
- [ ] DevOps: Deployment plan approved by _______________

---

## References

- [Plan 189: Pricing Tier Restructure](./189-pricing-tier-restructure-plan.md)
- [Plan 112: Token-to-Credit Conversion Mechanism](./112-token-to-credit-conversion-mechanism.md)
- Prisma Decimal Documentation: https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal
- PostgreSQL Decimal Types: https://www.postgresql.org/docs/current/datatype-numeric.html

---

**End of Plan 208**
