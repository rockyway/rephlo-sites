# Credit Conversion Rate Seed Data Audit

**Date**: 2025-11-15
**Issue**: Seed data credit allocations may not align with x100 conversion rate (1 credit = $0.01)

---

## Background

### Conversion Rate Change
- **Previous**: 1 credit = $0.001 (x1000 multiplier)
- **Current**: 1 credit = $0.01 (x100 multiplier)
- **Impact**: 10x reduction in credits needed to represent the same dollar value

### Formula
```
credits = ceil(vendorCost × marginMultiplier × 100)
```
Where 100 is the conversion factor (1 credit = $0.01 USD)

**Source**: `docs/reference/188-inference-flow-architecture.md:1186`

---

## Current Seed Data

### From `backend/prisma/seed.ts` (lines 296-307)

```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 100,
    priceCents: 0,
    billingInterval: 'monthly',
  },
  pro: {
    creditsPerMonth: 10000,
    priceCents: 9999, // $99.99
    billingInterval: 'monthly',
  },
};
```

### From `backend/prisma/seed-additions-token-credit.ts` (line 287)

```typescript
// Determine initial credits based on tier
let initialCredits = 2000; // Default free tier
const activeSubscription = user.subscriptions[0];

if (activeSubscription) {
  initialCredits = activeSubscription.creditsPerMonth;
}
```

---

## Analysis

### Pricing Tier Documentation

From `docs/plan/109-rephlo-desktop-monetization-moderation-plan.md`:

#### Free Tier (Plan 109)
- **Price**: $0/month
- **Credits**: 2,000 credits/month (from old documentation)
- **With x100 conversion**: 2,000 credits = $20 worth of API usage
- **Current seed value**: 100 credits = $1 worth of API usage ❌

#### Pro Tier (Plan 109)
- **Price**: $19/month
- **Credits**: 20,000 credits/month (from old documentation)
- **With x100 conversion**: 20,000 credits = $200 worth of API usage
- **Current seed value**: 10,000 credits = $100 worth of API usage ❌

#### Pro Tier Alternative (from seed data)
- **Price**: $99.99/month
- **Credits**: 10,000 credits/month (current seed)
- **With x100 conversion**: 10,000 credits = $100 worth of API usage
- **This makes sense** if Pro tier is priced at ~$100/month ✅

---

## Issue Identification

There are **two conflicting pricing models**:

### Model A: Plan 109 (Older Documentation)
- Free: 2,000 credits ($0/month)
- Pro: 20,000 credits ($19/month)
- Pro Max: 60,000 credits ($49/month)
- Enterprise Pro: 250,000 credits ($149/month)

### Model B: Current Seed Data
- Free: 100 credits ($0/month)
- Pro: 10,000 credits ($99.99/month)

---

## What Needs to Change?

### Option 1: Align with Plan 109 (Aggressive Free Tier)
If we want to follow Plan 109 pricing ($19/month for Pro):

```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 2000,  // Changed from 100
    priceCents: 0,
    billingInterval: 'monthly',
  },
  pro: {
    creditsPerMonth: 20000, // Changed from 10000
    priceCents: 1900,       // Changed from 9999 ($19/month)
    billingInterval: 'monthly',
  },
};
```

**Impact with x100 conversion**:
- Free: 2,000 credits = $20 worth of API usage (very generous!)
- Pro: 20,000 credits = $200 worth of API usage for $19/month (massive loss leader)

### Option 2: Keep Current Seed Values (Conservative)
If we want reasonable margins:

```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 100,   // Current value = $1 worth
    priceCents: 0,
    billingInterval: 'monthly',
  },
  pro: {
    creditsPerMonth: 10000, // Current value = $100 worth
    priceCents: 9999,       // $99.99/month (1:1 ratio)
    billingInterval: 'monthly',
  },
};
```

**Impact with x100 conversion**:
- Free: 100 credits = $1 worth of API usage (reasonable for abuse prevention)
- Pro: 10,000 credits = $100 worth of API usage for $99.99/month (nearly break-even)

### Option 3: Balanced Approach
Middle ground with positive margins:

```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 200,   // $2 worth (enough for testing)
    priceCents: 0,
    billingInterval: 'monthly',
  },
  pro: {
    creditsPerMonth: 5000,  // $50 worth for $19/month (2.6x margin)
    priceCents: 1900,       // $19/month
    billingInterval: 'monthly',
  },
};
```

---

## Recommendation

**User mentioned**: "last time we reduce the conversion rate between credit and cost that from x1000 to x100. so it is big change, for example new user or new pro user last time have 2000 credit 10000 credit, now it should be 200 and 1000 instead"

This suggests:
- **Old Free tier**: 2,000 credits with x1000 = $2 worth
- **New Free tier**: 200 credits with x100 = $2 worth ✅

- **Old Pro tier**: 10,000 credits with x1000 = $10 worth
- **New Pro tier**: 1,000 credits with x100 = $10 worth ✅

### Correct Values Based on User Input

```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 200,   // Changed from 100 (was 2000 with x1000)
    priceCents: 0,
    billingInterval: 'monthly',
  },
  pro: {
    creditsPerMonth: 1000,  // Changed from 10000 (was 10000 with x1000)
    priceCents: 1900,       // Should be $19/month if following Plan 109
    billingInterval: 'monthly',
  },
};
```

---

## Files to Update

1. **`backend/prisma/seed.ts`** (lines 296-307)
   - Change `creditsPerMonth` values

2. **`backend/prisma/seed-additions-token-credit.ts`** (line 287)
   - Change `initialCredits = 2000` to `initialCredits = 200`

3. **Verify Pro tier pricing**
   - Confirm if Pro should be $19/month or $99.99/month
   - Update `priceCents` accordingly

---

## Next Steps

1. ✅ Identify discrepancy
2. ⏳ Confirm pricing model with stakeholder
3. ⏳ Update seed data files
4. ⏳ Run database reset
5. ⏳ Verify with test queries
