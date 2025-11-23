# Plan 208: Service Layer Decimal Migration Guide

**Status:** In Progress
**Created:** 2025-01-21
**Related Plan:** [Plan 208: Fractional Credit System Migration](../plan/208-fractional-credit-system-migration.md)

---

## Executive Summary

This document provides a comprehensive guide for updating backend services to support the fractional credit system with configurable minimum increment (Plan 208). The database schema has been migrated from `Int` to `Decimal(12, 2)` for credit fields, requiring all services to handle decimal values properly.

---

## What Has Been Completed

### 1. Core Credit Deduction Service ✅
**File:** `backend/src/services/credit-deduction.service.ts`

**Changes:**
- Added static cache for minimum credit increment:
  ```typescript
  private static creditMinimumIncrement: number = 0.1;  // Default
  private static lastSettingsUpdate: Date = new Date(0);
  ```

- Added configuration loading method:
  ```typescript
  async loadCreditIncrementSetting(): Promise<void>
  ```

- Added public getter for increment:
  ```typescript
  getCreditIncrement(): number  // Returns cached value, no DB read
  ```

- Added configurable credit calculation:
  ```typescript
  calculateCreditsFromCost(vendorCost: number, marginMultiplier: number): number
  ```

- Added admin update method:
  ```typescript
  async updateCreditIncrement(newIncrement: number): Promise<void>
  ```

- Updated all `parseInt()` → `parseFloat()` for Decimal handling
- Added rounded values to `DeductionResult` interface

###  2. Admin Settings Controller ✅
**File:** `backend/src/controllers/admin-settings.controller.ts` (NEW)

**Endpoints:**
- `GET /admin/settings/credit-increment` - Get current setting
- `PUT /admin/settings/credit-increment` - Update setting (validates: 0.01, 0.1, 1.0)

### 3. Admin Routes ✅
**File:** `backend/src/routes/admin.routes.ts`

**Changes:**
- Imported `AdminSettingsController`
- Resolved controller from DI container
- Added routes for credit increment management

### 4. Server Initialization ✅
**File:** `backend/src/server.ts`

**Changes:**
- Loads credit increment setting on startup (after DB connection)
- Graceful fallback to default (0.1) if setting not found
- Non-critical error (server continues even if load fails)

### 5. Interface Updates ✅
**File:** `backend/src/interfaces/services/credit-deduction.interface.ts`

**Changes:**
- Added `calculateCreditsFromCost()` to interface
- Added optional rounded fields to `DeductionResult`:
  - `balanceBeforeRounded?: number`
  - `balanceAfterRounded?: number`
  - `creditsDeductedRounded?: number`

### 6. LLM Service (Partial) ✅
**File:** `backend/src/services/llm.service.ts`

**Changes:**
- Updated `calculateCreditsFromVendorCost()` to use `calculateCreditsFromCost()`
- Formula now uses configurable increment instead of fixed `Math.ceil(...  * 100)`

### 7. Type Mappers (Partial) ✅
**File:** `backend/src/utils/typeMappers.ts`

**Changes:**
- Updated `mapUserToApiType()` to handle Decimal `creditsBalance`
- Updated `mapTokenUsageToApiType()` to convert Decimal fields

---

## What Needs To Be Fixed

### 1. Remaining Type Mapper Decimal Conversions ⚠️

**Pattern to apply:**
```typescript
// OLD (causes TypeScript error)
someField: dbRecord.decimal_field

// NEW (handles Decimal → number conversion)
someField: dbRecord.decimal_field ? parseFloat(dbRecord.decimal_field.toString()) : 0
```

**Files needing updates:**
- `backend/src/utils/typeMappers.ts` (additional fields)
- Any custom mappers in service files

### 2. Service Layer Decimal Aggregations ⚠️

**Problem:** Prisma aggregations return `Decimal` type, but interfaces expect `number`.

**Pattern to apply:**
```typescript
// OLD
const total = aggregation._sum.credits_deducted || 0;

// NEW
const total = parseFloat(aggregation._sum.credits_deducted?.toString() || '0');
```

**Files needing updates:**
- `backend/src/services/admin-analytics.service.ts`
- `backend/src/services/platform-analytics.service.ts`
- `backend/src/services/revenue-analytics.service.ts`
- `backend/src/services/admin-user-detail.service.ts`
- `backend/src/services/usage.service.ts`

### 3. Credit Service Decimal Support ⚠️

**File:** `backend/src/services/credit.service.ts`

**Changes needed:**
- Replace all `parseInt()` → `parseFloat()` for credit calculations
- Update balance calculations to handle Decimal type
- Ensure no loss of precision

### 4. Test Mocks Decimal Handling ⚠️

**File:** `backend/src/__tests__/mocks/usage.service.mock.ts`

**Problem:** Mock data uses `number` but should use `Decimal` for consistency.

**Solution:**
```typescript
import { Prisma } from '@prisma/client';

// Create Decimal values
const creditValue = new Prisma.Decimal(10.5);
```

### 5. Controllers Decimal Return Types ⚠️

**File:** `backend/src/controllers/credits.controller.ts`

**Problem:** Returning raw Prisma records with Decimal fields.

**Solution:** Use type mappers to convert all Decimal fields before returning:
```typescript
const usageHistory = await prisma.token_usage_ledger.findMany(...);
return usageHistory.map(item => ({
  ...item,
  creditsUsed: parseFloat(item.credits_deducted.toString()),
  // ... other Decimal fields
}));
```

### 6. Shared Types Update ⚠️

**File:** `shared-types/src/credit.types.ts`

**Add rounded fields to all credit-related interfaces:**
```typescript
export interface CreditDeduction {
  // ... existing fields

  // Plan 208: Rounded values for UI display
  amountRounded?: number;
  balanceBeforeRounded?: number;
  balanceAfterRounded?: number;
}

export interface TokenUsage {
  // ... existing fields

  // Plan 208: Rounded values
  creditsDeductedRounded?: number;
}

export interface UsageStats {
  // ... existing fields

  // Plan 208: Rounded values
  creditsUsedRounded?: number;
}
```

---

## Standard Conversion Patterns

### Pattern 1: Direct Decimal Field Access
```typescript
// Reading from database
const record = await prisma.table.findUnique(...);

// Convert to number for API response
const apiValue = parseFloat(record.decimal_field.toString());
```

### Pattern 2: Aggregation Results
```typescript
// Prisma aggregation
const result = await prisma.table.aggregate({
  _sum: { credits_deducted: true }
});

// Convert aggregation result
const total = parseFloat(result._sum.credits_deducted?.toString() || '0');
```

### Pattern 3: Creating Decimal Values
```typescript
import { Prisma } from '@prisma/client';

// For inserts/updates
await prisma.table.create({
  data: {
    decimal_field: new Prisma.Decimal(10.5)
  }
});
```

### Pattern 4: Arithmetic Operations
```typescript
// DON'T: Prisma Decimal doesn't support operators
const total = decimal1 + decimal2;  // ❌ TypeScript error

// DO: Convert to number first
const total = parseFloat(decimal1.toString()) + parseFloat(decimal2.toString());
```

### Pattern 5: Conditional Decimal Handling
```typescript
// Nullable Decimal field
someField: dbRecord.nullable_decimal
  ? parseFloat(dbRecord.nullable_decimal.toString())
  : null
```

---

## Testing Checklist

After applying fixes, verify:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All API endpoints return correct Decimal → number conversions
- [ ] Credit deduction still works correctly
- [ ] Admin settings endpoints return proper data
- [ ] Analytics dashboards show correct credit totals
- [ ] Test configurable increment with all three values:
  - [ ] `0.1` (default)
  - [ ] `0.01` (fine-grained)
  - [ ] `1.0` (legacy whole-credit behavior)

---

## Configuration System Testing

### Test Case 1: Default Increment (0.1)
```bash
# Vendor cost: $0.00004, Multiplier: 1.5x
# Cost with multiplier: $0.00006
# Expected: 0.1 credits (not 1.0)

curl -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hi"}]
  }'

# Verify response shows creditsUsed: 0.1
```

### Test Case 2: Admin Update Increment
```bash
# Update to 0.01
curl -X PUT http://localhost:7150/admin/settings/credit-increment \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"increment": 0.01}'

# Verify same API call now deducts 0.01 or 0.03 credits
```

### Test Case 3: Get Current Setting
```bash
curl -X GET http://localhost:7150/admin/settings/credit-increment \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "creditMinimumIncrement": 0.1,
#     "allowedValues": [0.01, 0.1, 1.0],
#     "description": "Minimum credit increment for rounding..."
#   }
# }
```

---

## Rollback Plan

If critical issues are found:

1. **Revert Database Migration:**
   ```bash
   cd backend
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

2. **Revert Code Changes:**
   ```bash
   git revert <commit_hash>
   git push origin develop
   ```

3. **Restart Services:**
   ```bash
   npm run dev:backend
   ```

---

## Performance Considerations

### Decimal vs Int Performance
- **Prisma Decimal** operations are slightly slower than Int (~5-10% overhead)
- **Caching credit increment** eliminates DB reads on every calculation
- **Type conversions** (Decimal → number) are negligible overhead

### Monitoring Recommendations
- Track query performance for aggregations (should remain < 100ms)
- Monitor cache hit rate for `getCreditIncrement()` (should be ~100%)
- Alert on failed credit increment loads (indicates DB issue)

---

## Future Enhancements

### Phase 2: Dynamic Increment Refresh
- **Current:** Increment loaded once on server startup
- **Future:** Implement cache TTL or event-based refresh
- **Benefit:** Update increment without server restart

### Phase 3: Per-Tier Increments
- **Current:** Global increment for all users
- **Future:** Free = 1.0, Pro = 0.1, Enterprise = 0.01
- **Benefit:** Tier-specific precision

### Phase 4: UI Display Options
- **Current:** API returns both precise and rounded values
- **Future:** Client can choose display format (precise vs rounded)
- **Benefit:** User preference-based display

---

## References

- [Plan 208: Fractional Credit System Migration](../plan/208-fractional-credit-system-migration.md)
- [Database Schema Changes](../reference/208-decimal-credit-schema.md)
- [API Development Standards](../reference/156-api-standards.md)
- [Prisma Decimal Documentation](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#decimal)

---

**End of Migration Guide**
