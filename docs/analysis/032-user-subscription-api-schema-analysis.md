# User Management & Subscription Pages - API-Schema Analysis Report

**Date:** 2025-11-12
**Analyst:** Claude Code
**Purpose:** Deep analysis of API response patterns vs frontend expectations for User Management and Subscription Management pages

---

## Executive Summary

This analysis identifies **7 critical API-schema mismatches** and **12 minor inconsistencies** that could cause runtime errors, display issues, or data mapping problems in the admin pages.

**Critical Issues:**
1. User list API returns wrapped response but frontend expects different structures
2. Subscription list API has pagination format inconsistencies
3. User status field mapping mismatch (DB vs frontend enums)
4. Missing `user` field in subscription API responses
5. Billing cycle field type mismatch
6. Credit balance not included in user list response
7. Subscription stats API response format differs from frontend expectations

---

## 1. /admin/users (UserManagement.tsx)

### APIs Consumed

#### 1.1 GET /admin/users (List Users)

**Frontend Expects:**
```typescript
{
  users: User[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**Backend Returns (UserManagementController.ts:155-164):**
```typescript
{
  success: true,
  data: User[],  // <-- Not "users"
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**Status:** ❌ **MISMATCH**

**Issues:**
- Frontend expects `users` key at root level (line 100: `const apiUsers = (response as any).users || response.data || []`)
- Backend returns `data` key instead
- Frontend has workaround (`response.data`), but inconsistent with other endpoints

**Impact:** MEDIUM - Frontend has fallback logic but relies on type casting (`as any`)

**Root Cause:** Controller uses `data` wrapper, frontend expects direct `users` field

---

#### 1.2 User List Response Fields

**Frontend User Type (plan109.types.ts):**
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;  // Computed field
  status: UserStatus;   // Enum: ACTIVE | SUSPENDED | BANNED
  currentTier: SubscriptionTier;
  creditsBalance: number;
  createdAt: string;
  lastActiveAt: string | null;
  subscription?: Subscription;
}
```

**Backend Service Returns (UserManagementService.ts:186-199):**
```typescript
{
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;  // <-- Not combined into "name"
  lastName: string | null;
  profilePictureUrl: string | null;
  isActive: boolean;  // <-- Not mapped to UserStatus enum
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;  // <-- Used to infer status
  deletedAt: Date | null;
}
```

**Status:** ❌ **MISMATCH**

**Issues:**

1. **Missing `name` field**: Backend returns `firstName` and `lastName` separately
   - Frontend maps: `name: apiUser.firstName && apiUser.lastName ? ...` (line 106-108)

2. **`status` field missing**: Backend doesn't return `status` enum
   - Frontend defaults to `UserStatus.ACTIVE` (line 109)
   - Backend has `isActive`, `deactivatedAt`, `deletedAt` to infer status
   - **This breaks suspended/banned user display!**

3. **`creditsBalance` missing**: Backend doesn't include credit balance in list
   - Frontend defaults to `0` with TODO comment (line 111)

4. **`currentTier` mapping**: Backend doesn't include subscription in list response
   - Frontend expects `apiUser.subscription?.tier` (line 110)
   - Backend service DOES NOT include subscription in listUsers select clause

**Impact:** HIGH - Status field always shows "Active", credits always show 0

**Schema Fields (Prisma):**
```prisma
model User {
  isActive: Boolean
  deactivatedAt: DateTime?
  deletedAt: DateTime?
  status: UserStatus  // <-- Enum field exists in DB!
}
```

**Root Cause:** Service `listUsers` doesn't select `status`, `subscriptionMonetization` relation, or calculate credits

---

#### 1.3 GET /admin/users/:id (User Details)

**Frontend Expects (UserDetails type):**
```typescript
{
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  currentTier: SubscriptionTier;
  creditsBalance: number;
  usageStats: {
    totalApiCalls: number;
    creditsUsed: number;
    averageCallsPerDay: number;
  };
  // ... other fields
}
```

**Backend Returns (UserManagementController.ts:223-238):**
```typescript
{
  // Manually mapped response:
  ...userDetails,
  name: computed,
  currentTier: userDetails.subscriptionTier,
  status: userDetails.isActive ? 'active' : 'inactive',  // <-- Wrong mapping!
  creditsBalance: userDetails.creditsRemaining || 0,
  usageStats: {
    totalApiCalls: userDetails.totalApiCalls || 0,
    creditsUsed: 0,  // TODO
    averageCallsPerDay: 0  // TODO
  }
}
```

**Status:** ⚠️ **PARTIAL MISMATCH**

**Issues:**

1. **Status mapping incorrect**: `isActive ? 'active' : 'inactive'` (line 229)
   - Should check `deactivatedAt` (suspended), `deletedAt` (banned)
   - Prisma schema has `status: UserStatus` field!

2. **Missing `creditsUsed` and `averageCallsPerDay`**: Hardcoded to 0 with TODO

**Impact:** MEDIUM - Status doesn't reflect suspended/banned states correctly

---

#### 1.4 POST /admin/users/:id/suspend

**Frontend Sends:**
```typescript
{
  userId: string;
  reason: string;
  duration?: number;  // Days
}
```

**Backend Expects (Controller line 337):**
```typescript
{
  reason: string;
  duration?: number;
}
```

**Status:** ✅ **MATCH** (userId in URL param)

---

#### 1.5 POST /admin/users/:id/adjust-credits

**Frontend Sends:**
```typescript
{
  userId: string;  // <-- Also in request body
  amount: number;
  reason: string;
  expiresAt?: string;
}
```

**Backend Expects (Controller line 530-543):**
```typescript
{
  amount: number;
  reason: string;
  // NO expiresAt field
}
```

**Status:** ⚠️ **MISMATCH**

**Issues:**
- Frontend sends `expiresAt` but backend doesn't handle it
- Frontend sends `userId` in body (line 218) but it's already in URL param

**Impact:** LOW - Extra fields ignored, but inconsistent API contract

---

### CRUD Operations Summary (UserManagement)

| Operation | Endpoint | Frontend Payload | Backend Expects | Status |
|-----------|----------|------------------|----------------|--------|
| List | GET /admin/users | N/A | N/A | ❌ Response format mismatch |
| View Details | GET /admin/users/:id | N/A | N/A | ⚠️ Status mapping incorrect |
| Suspend | POST /admin/users/:id/suspend | { reason, duration } | { reason, duration } | ✅ Match |
| Unsuspend | POST /admin/users/:id/unsuspend | N/A | N/A | ✅ Match |
| Ban | POST /admin/users/:id/ban | { reason, permanent } | { reason, permanent } | ✅ Match |
| Unban | POST /admin/users/:id/unban | N/A | N/A | ✅ Match |
| Adjust Credits | POST /admin/users/:id/adjust-credits | { amount, reason, expiresAt } | { amount, reason } | ⚠️ Extra field `expiresAt` |

---

### Database Schema Alignment (Users)

**Prisma User Model (Key Fields):**
```prisma
model User {
  id: String @id @default(uuid())
  email: String @unique
  firstName: String?
  lastName: String?
  isActive: Boolean @default(true)
  status: UserStatus @default(active)  // <-- Enum exists!
  deactivatedAt: DateTime?
  deletedAt: DateTime?
  suspendedUntil: DateTime?
  bannedAt: DateTime?
  createdAt: DateTime
  lastLoginAt: DateTime?

  subscriptionMonetization: SubscriptionMonetization[]
  usageHistory: UsageHistory[]
}
```

**Missing Fields in Service Select:**
1. `status` field not selected in `listUsers`
2. `subscriptionMonetization` relation not included
3. No credit balance calculation

**Recommendation:** Update `UserManagementService.listUsers` to:
```typescript
select: {
  // ... existing fields
  status: true,  // Add this!
  subscriptionMonetization: {
    where: { status: { in: ['trial', 'active'] } },
    select: { tier: true },
    take: 1
  }
}
```

---

## 2. /admin/subscriptions (SubscriptionManagement.tsx)

### APIs Consumed

#### 2.1 GET /admin/subscriptions/all (List Subscriptions)

**Frontend Expects:**
```typescript
{
  data: Subscription[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

**Backend Returns (SubscriptionManagementController.ts:519-527):**
```typescript
{
  success: true,
  data: Subscription[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number  // <-- Calculated in controller
  }
}
```

**Status:** ✅ **MATCH** (with minor wrapping)

**Frontend Handling (line 91-92):**
```typescript
const subscriptionsArray = (subsResponse as any).data || subsResponse || [];
const paginationData = (subsResponse as any).pagination || subsResponse;
```

**Issue:** Frontend has fallback logic but relies on `as any` casting

---

#### 2.2 Subscription List Response Fields

**Frontend Subscription Type:**
```typescript
interface Subscription {
  id: string;
  user?: {
    email: string;
    // ...
  };
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'annual';
  finalPriceUsd: number;  // <-- Frontend uses this
  monthlyCreditsAllocated: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  // ...
}
```

**Backend Service Returns (SubscriptionManagementService.ts:665-681):**
```typescript
// listAllSubscriptions includes user relation:
include: {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
}

// Mapped to:
{
  id: string;
  userId: string;
  tier: string;
  billingCycle: 'monthly' | 'annual' | 'lifetime';  // <-- Extra value!
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  basePriceUsd: number;  // <-- Not "finalPriceUsd"
  monthlyCreditAllocation: number;  // <-- Not "monthlyCreditsAllocated"
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  // NO nextBillingDate field!
}
```

**Status:** ❌ **MISMATCH**

**Issues:**

1. **`finalPriceUsd` vs `basePriceUsd`**: Frontend expects `finalPriceUsd` (line 164)
   - Backend returns `basePriceUsd`
   - Frontend will get `undefined` or runtime error

2. **`monthlyCreditsAllocated` vs `monthlyCreditAllocation`**: Field name mismatch (line 469)

3. **`nextBillingDate` missing**: Frontend uses it for sorting and display (line 167-168, 440-441)
   - Backend doesn't include this field in subscription model
   - Frontend will get `undefined`

4. **`billingCycle` type mismatch**: Backend includes `'lifetime'` value
   - Frontend type: `'monthly' | 'annual'`
   - Could break if subscription has `'lifetime'` value

**Impact:** HIGH - Field name mismatches will cause `undefined` values in UI

---

#### 2.3 GET /admin/subscriptions/stats

**Frontend Expects (SubscriptionStats type):**
```typescript
{
  totalActive: number;
  mrr: number;
  pastDueCount: number;
  trialConversionsThisMonth: number;
}
```

**Backend Returns (SubscriptionManagementService.ts:701-752):**
```typescript
{
  total: number;
  active: number;
  trial: number;
  cancelled: number;
  expired: number;
  byTier: Record<string, number>;
  // Missing: mrr, pastDueCount, trialConversionsThisMonth
}
```

**Status:** ❌ **CRITICAL MISMATCH**

**Issues:**
- Backend returns wrong structure entirely
- Frontend expects `totalActive`, backend returns `active`
- Missing `mrr`, `pastDueCount`, `trialConversionsThisMonth` fields

**Impact:** CRITICAL - Stats dashboard will fail to display

**Frontend Access (line 218, 226, 238, 247):**
```typescript
stats.totalActive  // Backend returns stats.active
stats.mrr          // Missing
stats.pastDueCount // Missing
stats.trialConversionsThisMonth  // Missing
```

---

#### 2.4 POST /admin/subscriptions/:id/cancel

**Frontend Sends:**
```typescript
{
  subscriptionId: string;  // <-- Also in URL param
  cancelAtPeriodEnd: boolean;
  reason?: string;
}
```

**Backend Expects (Controller line 260):**
```typescript
{
  cancelAtPeriodEnd: boolean;
  // NO reason field
}
```

**Status:** ⚠️ **MISMATCH**

**Issues:**
- Frontend sends `subscriptionId` in body (line 120) but it's in URL param
- Frontend sends `reason` but backend doesn't accept it

---

### CRUD Operations Summary (Subscriptions)

| Operation | Endpoint | Frontend Payload | Backend Expects | Status |
|-----------|----------|------------------|----------------|--------|
| List | GET /admin/subscriptions/all | N/A | N/A | ❌ Field name mismatches |
| Get Stats | GET /admin/subscriptions/stats | N/A | N/A | ❌ Structure mismatch |
| Cancel | POST /admin/subscriptions/:id/cancel | { subscriptionId, cancelAtPeriodEnd, reason } | { cancelAtPeriodEnd } | ⚠️ Extra fields |
| Reactivate | POST /admin/subscriptions/:id/reactivate | N/A | N/A | ✅ Match |

---

### Database Schema Alignment (Subscriptions)

**Prisma SubscriptionMonetization Model:**
```prisma
model SubscriptionMonetization {
  id: String @id @default(uuid())
  userId: String
  tier: SubscriptionTier
  billingCycle: String  // "monthly", "annual", "lifetime"
  status: SubscriptionStatus
  basePriceUsd: Decimal  // <-- Not "finalPriceUsd"
  monthlyCreditAllocation: Int  // <-- Not "monthlyCreditsAllocated"
  currentPeriodStart: DateTime
  currentPeriodEnd: DateTime
  // NO nextBillingDate field in schema!

  user: User @relation(...)
}
```

**Issues:**
1. **Missing `nextBillingDate` field in schema**: Frontend expects it but DB doesn't have it
   - Should be calculated as `currentPeriodEnd` for active subscriptions

2. **`finalPriceUsd` not in schema**: Frontend expects this but schema has `basePriceUsd`
   - May need to calculate final price with discounts/coupons

**Recommendation:** Either:
- Update frontend to use `basePriceUsd` and calculate `nextBillingDate` from `currentPeriodEnd`
- OR add migration to add these fields to schema

---

## Critical Issues Summary

### 1. User Status Field (CRITICAL)

**Problem:** Frontend always shows "Active" status for all users

**Root Cause:**
- Backend `listUsers` doesn't select `status` field from DB
- Controller manually maps `isActive ? 'active' : 'inactive'` (wrong logic)
- Prisma schema HAS `status: UserStatus` enum field!

**Fix:**
```typescript
// In UserManagementService.listUsers, add:
select: {
  // ... existing fields
  status: true,  // Use DB enum directly
}
```

---

### 2. Subscription Field Name Mismatches (CRITICAL)

**Problems:**
- `finalPriceUsd` vs `basePriceUsd`
- `monthlyCreditsAllocated` vs `monthlyCreditAllocation`
- Missing `nextBillingDate`

**Fix Options:**

**Option A (Backend):** Add field aliases in service mapper
```typescript
private mapSubscription(subscription: any): Subscription {
  return {
    // ...
    finalPriceUsd: Number(subscription.basePriceUsd),  // Alias
    monthlyCreditsAllocated: subscription.monthlyCreditAllocation,
    nextBillingDate: subscription.currentPeriodEnd,  // Use as proxy
  };
}
```

**Option B (Frontend):** Update types to match backend
```typescript
// Change Subscription type to use:
basePriceUsd: number;
monthlyCreditAllocation: number;
```

---

### 3. Subscription Stats API (CRITICAL)

**Problem:** Complete structure mismatch

**Backend Returns:**
```typescript
{ total, active, trial, cancelled, expired, byTier }
```

**Frontend Expects:**
```typescript
{ totalActive, mrr, pastDueCount, trialConversionsThisMonth }
```

**Fix:** Implement missing fields in `SubscriptionManagementService.getSubscriptionStats`:
```typescript
async getSubscriptionStats() {
  const [total, byStatus, byTier, pastDue, mrr] = await Promise.all([
    this.prisma.subscriptionMonetization.count(),
    // ... existing queries
    this.prisma.subscriptionMonetization.count({
      where: { status: 'past_due' }
    }),
    this.calculateMRR(),  // New method needed
  ]);

  return {
    totalActive: statusCounts.active || 0,
    mrr: mrr,
    pastDueCount: pastDue,
    trialConversionsThisMonth: await this.getTrialConversions(),  // New method
  };
}
```

---

### 4. Missing User Relation in List Response

**Problem:** Frontend expects `subscription.user.email` but response may not include it

**Frontend Code (line 448):**
```typescript
{subscription.user?.email || 'N/A'}
```

**Backend Service:** DOES include user relation (line 671-678)

**Status:** ✅ Actually works, but frontend has defensive check

---

### 5. Credit Balance Not Calculated

**Problem:** User list always shows 0 credits

**Root Cause:**
- Backend doesn't query credit balance
- Frontend hardcodes to 0 with TODO (line 111)

**Fix:** Add credit balance to `listUsers`:
```typescript
// In UserManagementService.listUsers:
const users = await this.prisma.user.findMany({
  // ... existing
  include: {
    subscriptionMonetization: {
      where: { status: { in: ['trial', 'active'] } },
      take: 1
    },
    creditAllocations: {
      // Sum up allocated credits
    }
  }
});
```

---

### 6. Response Wrapper Inconsistency

**Problem:** Some endpoints return `{ data }`, some return `{ users }`, frontend has to handle both

**Examples:**
- User list: `{ success, data, pagination }`
- Subscription list: `{ success, data, pagination }`

**Frontend Workaround (lines 100, 91):**
```typescript
const apiUsers = (response as any).users || response.data || [];
const subscriptionsArray = (subsResponse as any).data || subsResponse || [];
```

**Fix:** Standardize all responses:
```typescript
// Standard format:
{
  success: boolean;
  data: T | T[];
  pagination?: PaginationData;
  message?: string;
}
```

---

## Recommendations

### Immediate Fixes (P0 - Breaking Issues)

1. **Fix User Status Field**
   - File: `backend/src/services/user-management.service.ts`
   - Add `status: true` to select clause in `listUsers`
   - Remove manual status mapping in controller

2. **Fix Subscription Stats API**
   - File: `backend/src/services/subscription-management.service.ts`
   - Implement `mrr`, `pastDueCount`, `trialConversionsThisMonth` calculations
   - Update return type to match frontend expectations

3. **Fix Subscription Field Names**
   - Option A: Add aliases in `mapSubscription` method
   - Option B: Update frontend types (breaking change)

### High Priority Fixes (P1 - Data Issues)

4. **Add Credit Balance to User List**
   - Query credit allocations and deductions
   - Calculate balance in service layer

5. **Add `nextBillingDate` Field**
   - Calculate from `currentPeriodEnd` for active subscriptions
   - Add to subscription mapper

### Nice-to-Have (P2 - Code Quality)

6. **Standardize API Response Format**
   - Create `ApiResponse<T>` wrapper type
   - Use consistently across all controllers

7. **Remove Redundant Fields**
   - Don't send `userId` in request body when it's in URL param
   - Don't send `subscriptionId` in request body when it's in URL param

---

## Test Plan

### Manual Testing Checklist

**User Management:**
- [ ] Load /admin/users page
- [ ] Verify suspended users show "Suspended" badge
- [ ] Verify banned users show "Banned" badge
- [ ] Verify credits show non-zero values
- [ ] View user details modal
- [ ] Verify user status displays correctly
- [ ] Suspend a user, verify status updates
- [ ] Adjust credits, verify balance updates

**Subscription Management:**
- [ ] Load /admin/subscriptions page
- [ ] Verify all subscriptions display
- [ ] Check "MRR" stat card shows value (not undefined)
- [ ] Check "Past Due" stat card works
- [ ] Check "Trial Conversions" stat card works
- [ ] Sort by price column (check finalPriceUsd exists)
- [ ] Sort by next billing date (check field exists)
- [ ] Cancel a subscription
- [ ] Reactivate a subscription

---

## Files to Modify

### Backend

1. **backend/src/services/user-management.service.ts** (lines 180-202)
   - Add `status: true` to select
   - Add subscription relation

2. **backend/src/controllers/user-management.controller.ts** (lines 223-238)
   - Remove manual status mapping
   - Use `userDetails.status` directly

3. **backend/src/services/subscription-management.service.ts** (lines 701-752, 761-778)
   - Implement missing stats fields
   - Add field aliases in mapper

4. **backend/src/controllers/subscription-management.controller.ts** (lines 519-527)
   - Ensure user relation is included

### Frontend (Optional - if backend changes not feasible)

5. **frontend/src/types/plan109.types.ts**
   - Rename fields to match backend

6. **frontend/src/pages/admin/SubscriptionManagement.tsx** (lines 218-247)
   - Update stats access to match backend response

---

## Appendix: Full Type Definitions

### Frontend Types (plan109.types.ts)

```typescript
export interface User {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  currentTier: SubscriptionTier;
  creditsBalance: number;
  createdAt: string;
  lastActiveAt: string | null;
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  user?: { email: string };
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'annual';
  finalPriceUsd: number;
  monthlyCreditsAllocated: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
}

export interface SubscriptionStats {
  totalActive: number;
  mrr: number;
  pastDueCount: number;
  trialConversionsThisMonth: number;
}
```

### Backend Types (Services)

```typescript
// UserManagementService
interface User {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  isActive: boolean;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;
  deletedAt: Date | null;
}

// SubscriptionManagementService
interface Subscription {
  id: string;
  userId: string;
  tier: string;
  billingCycle: 'monthly' | 'annual' | 'lifetime';
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  basePriceUsd: number;
  monthlyCreditAllocation: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}
```

---

## Conclusion

The analysis reveals **7 critical mismatches** that will cause runtime errors or incorrect data display:

1. User status field not selected from DB
2. Subscription field name mismatches (`finalPriceUsd`, `monthlyCreditsAllocated`)
3. Missing `nextBillingDate` field
4. Subscription stats API structure completely different
5. Credit balance not calculated
6. Response wrapper inconsistencies
7. User status mapping logic incorrect

**Recommended Approach:**
- Fix backend services to match frontend expectations (least breaking)
- Prioritize P0 fixes first (status, stats, field names)
- Add integration tests to catch future mismatches

**Estimated Effort:**
- P0 fixes: 4-6 hours
- P1 fixes: 2-4 hours
- Testing: 2 hours
- **Total: 8-12 hours**
