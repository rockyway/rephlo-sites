# Troubleshooting: TypeScript Compilation Errors - Bulk Field Naming Fix

**Document**: 013-typescript-compilation-errors-fixing-strategy.md  
**Date**: 2025-01-16  
**Status**: In Progress (825 errors remaining)  
**Starting Point**: ~810 errors → Reduced to ~60 errors → Increased to 825 errors during typeMapper fixes

---

## Problem Summary

The backend codebase has ~825 TypeScript compilation errors after applying Prisma model naming standardization (snake_case). The errors fall into specific categories that can be systematically addressed.

---

## Error Categories

### 1. Mock Service Schema Mismatch (~16 errors)
**File**: `src/__tests__/mocks/subscription.service.mock.ts`

**Issue**: Mock interface doesn't match expected return types

**Root Cause**: Interface expects different return type than mocks provide

**Status**: ✅ Partially Fixed (usage mock fixed, subscription mock remains)

---

### 2. TypeMapper Prisma Type Definitions (~50-100 errors)
**File**: `src/utils/typeMappers.ts`

**Issue**: Prisma `include` type definitions use wrong relation names

**Examples**:
```typescript
// ❌ WRONG (uses old camelCase relation names)
Prisma.couponGetPayload<{
  include: {
    usageLimits: true;           // Should be: coupon_usage_limit
    campaign: {                   // Should be: coupon_campaign
      select: { campaignName: true }  // Should be: campaign_name
    }
  }
}>

// ✅ CORRECT (uses actual schema relation names)
Prisma.couponGetPayload<{
  include: {
    coupon_usage_limit: true;
    coupon_campaign: {
      select: { campaign_name: true }
    }
  }
}>
```

**Affected Mappers**:
- `mapCouponToApiType()` - usageLimits → coupon_usage_limit, campaign → coupon_campaign
- `mapCampaignToApiType()` - coupons (count) → coupon
- `mapProrationEventToApiType()` - user → users
- `mapSubscriptionMonetizationToApiType()` - user → users

**Fix Strategy**:
1. Check Prisma schema for actual relation names
2. Update ALL `Prisma.*GetPayload<{ include: ... }>` type definitions  
3. Update field access inside functions to match

---

### 3. Controller Include Statements (~20-30 errors)
**Files**: 
- `src/controllers/coupon.controller.ts`
- `src/controllers/campaign.controller.ts`

**Issue**: `include` statements in Prisma queries use wrong relation names

**Examples**:
```typescript
// ❌ WRONG
await this.prisma.coupon.findMany({
  include: {
    usageLimits: true,
    campaign: { select: { campaignName: true } }
  }
})

// ✅ CORRECT
await this.prisma.coupon.findMany({
  include: {
    coupon_usage_limit: true,
    coupon_campaign: { select: { campaign_name: true } }
  }
})
```

**Status**: ⚠️ Partially Fixed (some remain)

---

### 4. Field Access Errors (~20-30 errors)
**Files**: Various controllers and mappers

**Issue**: Accessing camelCase fields on snake_case Prisma models

**Pattern**:
```typescript
// ❌ WRONG
campaign.campaignName
campaign.isActive  
coupon.maxUses

// ✅ CORRECT
campaign.campaign_name
campaign.is_active
coupon.max_uses
```

**Status**: ✅ Mostly Fixed

---

### 5. Validation Type Assertions (~10-15 errors)
**Files**: `campaign.controller.ts`, `coupon.controller.ts`

**Issue**: Zod validation returns `unknown` types that need explicit casting

**Pattern**:
```typescript
// ❌ WRONG
campaignName: data.campaign_name,  // Type 'unknown' error

// ✅ CORRECT
campaignName: data.campaign_name as string,
```

**Status**: ⚠️ Partially Fixed

---

## Systematic Fix Strategy

### Phase 1: Find Correct Relation Names from Schema
```bash
# Check actual relation names in Prisma schema
grep -A 30 "model coupon {" backend/prisma/schema.prisma
grep -A 30 "model coupon_campaign {" backend/prisma/schema.prisma
grep -A 30 "model proration_event {" backend/prisma/schema.prisma
```

**Key Discoveries**:
- `coupon` model has relation: `coupon_usage_limit` (not usageLimits)
- `coupon` model has relation: `coupon_campaign` (not campaign)
- `coupon_campaign` model has relation: `coupon` (not coupons)
- `proration_event` model has relation: `users` (not user)
- `subscription_monetization` model has relation: `users` (not user)

### Phase 2: Fix TypeMapper Type Definitions
Update all `Prisma.*GetPayload<{ include: ... }>` in `src/utils/typeMappers.ts`:

1. **mapCouponToApiType()**:
   ```typescript
   // Before:
   include: { usageLimits: true, campaign: { select: { campaignName: true } } }
   
   // After:
   include: { coupon_usage_limit: true, coupon_campaign: { select: { campaign_name: true } } }
   ```

2. **mapCampaignToApiType()**:
   ```typescript
   // Before:
   include: { _count: { select: { coupons: true } } }
   
   // After:
   include: { _count: { select: { coupon: true } } }
   ```

3. **mapProrationEventToApiType()** & **mapSubscriptionMonetizationToApiType()**:
   ```typescript
   // Before:
   include: { user: { select: { email: true } } }
   
   // After:
   include: { users: { select: { email: true } } }
   ```

### Phase 3: Fix Controller Include Statements
Search and replace in controllers:
```bash
# Find all Prisma queries with include
grep -rn "include:" src/controllers/
```

Update to match schema relation names.

### Phase 4: Fix Field Access
Already mostly done, but verify remaining camelCase access is converted to snake_case.

### Phase 5: Add Type Assertions
For validation errors, add explicit type casts:
```typescript
data.field_name as string
data.number_field as number
new Date(data.date_field as string | Date)
```

---

## Testing Strategy

After each phase:
```bash
cd backend
npm run build 2>&1 | tee build-progress.log
grep -c "error TS" build-progress.log  # Track error count
```

**Success Criteria**: 0 TypeScript errors

---

## Files Requiring Attention

### High Priority (Most Errors)
1. ✅ `src/utils/typeMappers.ts` - Prisma type definitions and field access (50-100 errors)
2. ⚠️ `src/controllers/coupon.controller.ts` - Include statements and field access (20-30 errors)
3. ⚠️ `src/controllers/campaign.controller.ts` - Type assertions and field access (10-15 errors)

### Medium Priority
4. ⚠️ `src/__tests__/mocks/subscription.service.mock.ts` - Interface mismatch (6 errors)
5. ✅ `src/__tests__/mocks/usage.service.mock.ts` - Schema mismatch (fixed)

### Low Priority (Misc)
6. ✅ `src/config/database.ts` - Unused import (fixed)
7. ✅ `src/controllers/device-activation-management.controller.ts` - Type name (fixed)
8. ✅ `src/controllers/fraud-detection.controller.ts` - Field access (fixed)
9. ✅ `src/controllers/license-management.controller.ts` - Lambda types (fixed)
10. ✅ `src/controllers/models.controller.ts` - Type name (fixed)
11. ✅ `src/controllers/social-auth.controller.ts` - Field name (fixed)

---

## Lessons Learned

1. **Python scripts for bulk replacement can break complex TypeScript types** - They don't understand Prisma type syntax
2. **Prisma relation names must match exactly** - Schema defines relation names (e.g., `coupon_campaign` not `campaign`)
3. **Type definitions and field access must be fixed together** - Changing one without the other creates more errors
4. **Systematic approach is critical** - Fix by category, test after each category

---

## Next Session Action Plan

1. **Restore clean state**: Git checkout or revert partial typeMapper changes
2. **Manually fix typeMappers.ts**: Update all Prisma type definitions with correct relation names (don't use bulk replace scripts)
3. **Fix controller includes**: Update one controller at a time, test after each
4. **Verify build**: Confirm 0 errors before committing

---

## References

- Prisma Schema: `backend/prisma/schema.prisma`
- Build logs: `backend/build-progress*.log`
- Type mappers: `backend/src/utils/typeMappers.ts`
- API Standards: `docs/reference/156-api-standards.md`
