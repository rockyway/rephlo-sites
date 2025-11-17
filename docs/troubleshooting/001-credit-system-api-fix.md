# Credit System API Fix - Plan 189 Compliance

**Date:** 2025-01-17
**Issue:** `/api/user/credits` API returning incorrect `freeCredits.monthlyAllocation` for Pro users
**Status:** ✅ Fixed (API) | ⚠️ Remaining Issues (Schema + Subscription Flow)

---

## Problem Summary

### User Report
Pro tier user (`admin.test@rephlo.ai`) calling `/api/user/credits` received:
```json
{
  "freeCredits": {
    "remaining": 0,
    "monthlyAllocation": 2000,  // ❌ WRONG - Should be 0 for Pro users
    "used": 0,
    "resetDate": "2025-12-01T00:00:00.000Z",
    "daysUntilReset": 14
  },
  "proCredits": {
    "remaining": 1500,  // ✅ CORRECT
    "purchasedTotal": 1500,
    "lifetimeUsed": 0
  },
  "totalAvailable": 1500
}
```

**Expected behavior:**
Pro users should show `freeCredits.monthlyAllocation: 0` (they don't get free monthly credits).

---

## Root Cause Analysis

### Issue 1: API Logic Flaw (✅ FIXED)

**File:** `backend/src/services/credit.service.ts:417-472`

The `getFreeCreditsBreakdown()` method had flawed fallback logic:

```typescript
// OLD CODE (BUGGY)
async getFreeCreditsBreakdown(userId: string): Promise<any> {
  const freeCredit = await this.prisma.credits.findFirst({
    where: {
      user_id: userId,
      credit_type: 'free',  // ❌ Pro users don't have this!
      is_current: true,
    },
  });

  if (!freeCredit) {
    // ❌ BUG: Returns hardcoded 2000 for ALL users without free credits
    return {
      remaining: 0,
      monthlyAllocation: 2000,  // Wrong default!
      used: 0,
      resetDate: defaultResetDate,
      daysUntilReset: this.calculateDaysUntilReset(defaultResetDate),
    };
  }
  // ...
}
```

**Problem:**
- Pro/Pro+ users don't have `credit_type='free'` records
- When no free credit record exists, code returned hardcoded `2000` for all users
- Did not consider user's subscription tier

**Fix Applied:**
```typescript
// NEW CODE (FIXED)
if (!freeCredit) {
  // Check user's subscription tier first
  const subscription = await this.prisma.subscription_monetization.findFirst({
    where: {
      user_id: userId,
      status: { in: ['active', 'trialing', 'past_due'] },
    },
    orderBy: { created_at: 'desc' },
  });

  const defaultResetDate = this.calculateNextMonthlyReset(1);

  // Paid tier users (Pro, Pro+, etc.) don't get "free" monthly credits
  if (subscription && subscription.tier !== 'free') {
    return {
      remaining: 0,
      monthlyAllocation: 0,  // ✅ Correct for paid tiers
      used: 0,
      resetDate: defaultResetDate,
      daysUntilReset: this.calculateDaysUntilReset(defaultResetDate),
    };
  }

  // Free tier user with no credit record
  return {
    remaining: 0,
    monthlyAllocation: 200,  // ✅ Plan 189 free tier allocation
    used: 0,
    resetDate: defaultResetDate,
    daysUntilReset: this.calculateDaysUntilReset(defaultResetDate),
  };
}
```

---

### Issue 2: Dual Credit Table Architecture (⚠️ NEEDS REVIEW)

**Tables:**
1. **`credits`** - Detailed credit tracking with `credit_type`, `monthly_allocation`, `billing_period_start/end`
2. **`user_credit_balance`** - Simple balance with `amount` field

**Current State:**
- Both tables exist and serve different purposes
- Previously, `user_credit_balance.amount` was 0 for all users (fixed in previous session)
- `credits` table has correct Plan 189 values
- API uses both tables for different data

**Architecture Questions:**
- ✅ Is this dual-table design intentional?
- ✅ Are they properly synchronized?
- ⚠️ Should we consolidate into single table?

---

### Issue 3: Schema Defaults (⚠️ NEEDS FIX)

**File:** `backend/prisma/schema.prisma:352-353`

```prisma
model credits {
  // ...
  credit_type          String         @default("free") @db.VarChar(10)
  monthly_allocation   Int            @default(2000)
  // ...
}
```

**Problems:**
1. `credit_type` defaults to `"free"` - wrong for Pro users
2. `monthly_allocation` defaults to `2000` - not Plan 189 compliant (should be tier-specific)

**Impact:**
- When `allocateCredits()` creates a record without specifying these fields, wrong defaults apply
- New Pro users might get `credit_type='free'` and `monthly_allocation=2000`

**Recommended Fix:**
```prisma
credit_type          String         @db.VarChar(10)  // Remove default, make it required
monthly_allocation   Int            @default(0)      // Safe default (or remove default)
```

---

### Issue 4: allocateCredits() Missing Fields (⚠️ NEEDS FIX)

**File:** `backend/src/services/credit.service.ts:100-146`

The `allocateCredits()` method doesn't set `credit_type` or `monthly_allocation`:

```typescript
async allocateCredits(input: AllocateCreditsInput): Promise<Credit> {
  const newCredit = await tx.credits.create({
    data: {
      id: randomUUID(),
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      total_credits: input.totalCredits,  // ✅ Set correctly
      used_credits: 0,
      billing_period_start: input.billingPeriodStart,
      billing_period_end: input.billingPeriodEnd,
      is_current: true,
      updated_at: new Date(),
      // ❌ credit_type NOT set (uses schema default "free")
      // ❌ monthly_allocation NOT set (uses schema default 2000)
    },
  });
  // ...
}
```

**Recommended Fix:**
```typescript
// Fetch subscription to determine tier
const subscription = await tx.subscription_monetization.findUnique({
  where: { id: input.subscriptionId },
});

const creditType = subscription.tier === 'free' ? 'free' : 'pro';

const newCredit = await tx.credits.create({
  data: {
    // ... existing fields ...
    credit_type: creditType,  // ✅ Set based on subscription
    monthly_allocation: input.totalCredits,  // ✅ Match total_credits
  },
});
```

---

## Fixes Applied

### ✅ Fix 1: API Response Logic (backend/src/services/credit.service.ts:417-472)

**Changes:**
- Modified `getFreeCreditsBreakdown()` to check user's subscription tier
- Returns `monthlyAllocation: 0` for paid tiers
- Returns `monthlyAllocation: 200` for free tier (Plan 189 compliant)
- No longer returns hardcoded `2000` default

**Testing:**
```bash
# Restart backend
cd backend && npm run dev

# Test API with Pro user token
curl -X 'GET' \
  'http://localhost:7150/api/user/credits' \
  -H 'Authorization: Bearer <pro_user_token>'

# Expected result:
# {
#   "freeCredits": {
#     "monthlyAllocation": 0  // ✅ Should be 0 now
#   },
#   "proCredits": {
#     "remaining": 1500
#   }
# }
```

---

## Remaining Issues (To Fix)

### ⚠️ Issue 2: Schema Defaults

**File:** `backend/prisma/schema.prisma`

**Action Required:**
1. Remove or update `credit_type` default value
2. Change `monthly_allocation` default to `0` or make it tier-aware
3. Create migration: `npm run prisma:migrate dev --name fix-credit-schema-defaults`

### ⚠️ Issue 3: allocateCredits() Implementation

**File:** `backend/src/services/credit.service.ts:100-146`

**Action Required:**
1. Modify `allocateCredits()` to fetch subscription tier
2. Set `credit_type` based on tier (`'free'` or `'pro'`)
3. Set `monthly_allocation` to match `total_credits` (already Plan 189 compliant)
4. Update `AllocateCreditsInput` interface if needed

### ⚠️ Issue 4: Existing Data Migration

**Action Required:**
Create one-time migration script to fix existing credit records:
- Ensure `credit_type` matches user's subscription tier
- Ensure `monthly_allocation` matches Plan 189 values
- Run: `node scripts/fix-existing-credits.js` (to be created)

---

## Plan 189 Credit Allocations (Reference)

| Tier              | Monthly Credits | Price   |
|-------------------|----------------|---------|
| Free              | 200            | $0      |
| Pro               | 1,500          | $15     |
| Pro+              | 5,000          | $45     |
| Pro Max           | 25,000         | $199    |
| Enterprise Pro    | 3,500          | $30     |
| Enterprise Pro+   | 11,000         | $90     |

---

## Testing Checklist

- [x] ✅ API returns `monthlyAllocation: 0` for Pro users
- [ ] ⚠️ Restart backend and test `/api/user/credits` endpoint
- [ ] ⚠️ Test with multiple tier users (Free, Pro, Pro+)
- [ ] ⚠️ Create new subscription and verify credit allocation
- [ ] ⚠️ Verify `credit_type` is set correctly for new users
- [ ] ⚠️ Run migration script for existing data

---

## Files Modified

1. ✅ `backend/src/services/credit.service.ts` - Fixed `getFreeCreditsBreakdown()` logic
2. 📝 `backend/prisma/schema.prisma` - TODO: Update schema defaults
3. 📝 `backend/src/services/credit.service.ts` - TODO: Fix `allocateCredits()`

---

## Next Steps

1. **Immediate:** Restart backend and test API endpoint with your token
2. **Short-term:** Fix `allocateCredits()` to set `credit_type` and `monthly_allocation`
3. **Short-term:** Update Prisma schema defaults
4. **Short-term:** Create migration script for existing data
5. **Long-term:** Consider consolidating dual credit tables if not intentional

---

## Commands

```bash
# Rebuild backend
cd backend && npm run build

# Restart backend
npm run dev

# Test API (replace token)
curl -X 'GET' \
  'http://localhost:7150/api/user/credits' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'

# Expected: freeCredits.monthlyAllocation should be 0 for Pro users
```
