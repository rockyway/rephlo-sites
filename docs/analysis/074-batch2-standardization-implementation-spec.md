# Batch 2 API Response Standardization Implementation Specification

**Date:** 2025-11-12
**Status:** Implementation Ready
**Scope:** Billing & Credits endpoints (16 endpoints)
**Related Docs:**
- `docs/plan/158-api-response-standardization-plan.md`
- `docs/analysis/073-batch1-standardization-implementation-spec.md`
- `docs/progress/165-batch1-api-standardization-complete.md`
- `docs/reference/156-api-standards.md`

---

## Executive Summary

This document provides exact implementation instructions for standardizing all POST/PATCH endpoints in the Billing & Credits category to use consistent response format:

```typescript
{
  status: 'success',
  data: <PrimaryResource>,  // Flat object, NOT nested
  meta?: {
    auditLog?: AuditLogEntry,
    affectedRecords?: number,
    warnings?: string[]
  }
}
```

**Goal:** Eliminate inconsistent response structures where some endpoints return `{ success: true, data: {...} }` and others need standardization to `{ status: 'success', data: {...}, meta?: {...} }`.

---

## Endpoints in Scope

### Billing Controller Endpoints (4 endpoints)
1. `POST /billing/payment-methods` - `billingController.addPaymentMethod`
2. `POST /billing/invoices/:subscriptionId` - `billingController.createInvoice`
3. `POST /billing/transactions/:id/refund` - `billingController.refundTransaction`
4. `POST /billing/dunning/:attemptId/retry` - `billingController.retryFailedPayment`

### Credit Management Controller Endpoints (6 endpoints)
5. `POST /credits/allocate` - `creditController.allocateSubscriptionCredits`
6. `POST /credits/process-monthly` - `creditController.processMonthlyAllocations`
7. `POST /credits/grant-bonus` - `creditController.grantBonusCredits`
8. `POST /credits/deduct` - `creditController.deductCreditsManually`
9. `POST /credits/rollover/:userId/apply` - `creditController.applyRollover`
10. `POST /credits/sync/:userId` - `creditController.syncWithTokenCreditSystem`

### Subscription Management Controller Endpoints (6 endpoints)
11. `POST /subscriptions/:id/allocate-credits` - `subscriptionController.allocateMonthlyCredits`
12. `POST /subscriptions/:id/upgrade` - `subscriptionController.upgradeTier`
13. `POST /subscriptions/:id/downgrade` - `subscriptionController.downgradeTier`
14. `POST /subscriptions/:id/cancel` - `subscriptionController.cancelSubscription`
15. `POST /subscriptions/:id/reactivate` - `subscriptionController.reactivateSubscription`
16. `POST /subscriptions/:id/rollover` - `subscriptionController.handleRollover`

**Total:** 16 endpoints

---

## Current State Analysis

### Current Response Formats (Mixed)

**Pattern 1: Using `success` field**
```typescript
res.status(201).json({
  success: true,
  data: allocation,
  message: 'Credits allocated successfully',
});
```

**Pattern 2: No status field**
```typescript
res.status(200).json({
  success: true,
  message: 'Payment retry initiated',
});
```

**Pattern 3: Already using standard format**
```typescript
res.status(200).json(successResponse(result.data, {
  total: result.total,
  page: result.page,
  // ...
}));
```

### Target Standard Format

```typescript
res.status(200).json({
  status: 'success',
  data: <PrimaryResource>,
  meta?: {
    auditLog?: AuditLogEntry,
    affectedRecords?: number,
    warnings?: string[]
  }
});
```

---

## Implementation Plan

### Phase 1: Backend Controller Updates

#### File: `backend/src/controllers/billing.controller.ts`

**Endpoint 1: POST /billing/payment-methods (Line 82-116)**

Current:
```typescript
res.status(200).json({
  success: true,
  message: 'Payment method added successfully',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: { message: 'Payment method added successfully' },
});
```

**Endpoint 2: POST /billing/invoices/:subscriptionId (Line 182-201)**

Current:
```typescript
res.status(201).json({
  success: true,
  data: invoice,
  message: 'Invoice created successfully',
});
```

Updated:
```typescript
res.status(201).json({
  status: 'success',
  data: invoice,
  meta: {
    message: 'Invoice created successfully',
  },
});
```

**Endpoint 3: POST /billing/transactions/:id/refund (Line 365-394)**

Current (Not implemented):
```typescript
res.status(501).json({
  success: false,
  message: 'Method not yet implemented',
});
```

Updated:
```typescript
// Will implement when service method is ready
res.status(200).json({
  status: 'success',
  data: refund,
});
```

**Endpoint 4: POST /billing/dunning/:attemptId/retry (Line 428-447)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: transaction,
  message: 'Payment retry initiated',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: transaction,
  meta: {
    message: 'Payment retry initiated',
  },
});
```

---

#### File: `backend/src/controllers/credit-management.controller.ts`

**Endpoint 5: POST /admin/credits/allocate (Line 89-129)**

Current:
```typescript
res.status(201).json({
  success: true,
  data: allocation,
  message: 'Credits allocated successfully',
});
```

Updated:
```typescript
res.status(201).json({
  status: 'success',
  data: allocation,
  meta: {
    message: 'Credits allocated successfully',
  },
});
```

**Endpoint 6: POST /admin/credits/process-monthly (Line 139-156)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: summary,
  message: `Monthly allocations processed: ${summary.totalUsers} users, ${summary.totalAllocated} credits`,
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: summary,
  meta: {
    message: `Monthly allocations processed: ${summary.totalUsers} users, ${summary.totalAllocated} credits`,
  },
});
```

**Endpoint 7: POST /admin/credits/grant-bonus (Line 175-215)**

Current:
```typescript
res.status(201).json({
  success: true,
  data: allocation,
  message: `${amount} bonus credits granted`,
});
```

Updated:
```typescript
res.status(201).json({
  status: 'success',
  data: allocation,
  meta: {
    message: `${amount} bonus credits granted`,
  },
});
```

**Endpoint 8: POST /admin/credits/deduct (Line 229-263)**

Current:
```typescript
res.status(200).json({
  success: true,
  message: `${amount} credits deducted`,
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: { message: `${amount} credits deducted` },
});
```

**Endpoint 9: POST /admin/credits/rollover/:userId/apply (Line 303-327)**

Current:
```typescript
res.status(200).json({
  success: true,
  message: `Rollover of ${rolloverAmount} credits applied`,
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: { message: `Rollover of ${rolloverAmount} credits applied` },
});
```

**Endpoint 10: POST /admin/credits/sync/:userId (Line 339-359)**

Current:
```typescript
res.status(200).json({
  success: true,
  message: 'Credits synced with token-credit system',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: { message: 'Credits synced with token-credit system' },
});
```

---

#### File: `backend/src/controllers/subscription-management.controller.ts`

**Endpoint 11: POST /admin/subscriptions/:id/allocate-credits (Line 322-352)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: allocation,
  message: 'Monthly credits allocated successfully',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: allocation,
  meta: {
    message: 'Monthly credits allocated successfully',
  },
});
```

**Endpoint 12: POST /admin/subscriptions/:id/upgrade (Line 137-175)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: subscription,
  message: `Subscription upgraded to ${newTier}`,
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: subscription,
  meta: {
    message: `Subscription upgraded to ${newTier}`,
  },
});
```

**Endpoint 13: POST /admin/subscriptions/:id/downgrade (Line 185-226)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: subscription,
  message: `Subscription downgraded to ${newTier}`,
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: subscription,
  meta: {
    message: `Subscription downgraded to ${newTier}`,
  },
});
```

**Endpoint 14: POST /admin/subscriptions/:id/cancel (Line 236-279)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: subscription,
  message: cancelAtPeriodEnd
    ? 'Subscription will be cancelled at period end'
    : 'Subscription cancelled immediately',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: subscription,
  meta: {
    message: cancelAtPeriodEnd
      ? 'Subscription will be cancelled at period end'
      : 'Subscription cancelled immediately',
  },
});
```

**Endpoint 15: POST /admin/subscriptions/:id/reactivate (Line 287-310)**

Current:
```typescript
res.status(200).json({
  success: true,
  data: subscription,
  message: 'Subscription reactivated successfully',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: subscription,
  meta: {
    message: 'Subscription reactivated successfully',
  },
});
```

**Endpoint 16: POST /admin/subscriptions/:id/rollover (Line 360-382)**

Current:
```typescript
res.status(200).json({
  success: true,
  message: 'Credit rollover processed successfully',
});
```

Updated:
```typescript
res.status(200).json({
  status: 'success',
  data: { message: 'Credit rollover processed successfully' },
});
```

---

### Phase 2: Frontend API Client Updates

#### File: `frontend/src/api/plan109.ts`

All frontend API client methods currently expect the response in the format returned by the backend. Since we're changing the backend response format, we need to update the frontend to handle the new structure.

**Current Pattern:**
```typescript
const response = await apiClient.post<Subscription>(
  `/admin/subscriptions/${subscriptionId}/upgrade`,
  data
);
return response.data;
```

**After Backend Standardization:**

The frontend clients should continue to work without changes because:
1. `apiClient.post()` returns `AxiosResponse<T>`
2. `response.data` contains the entire backend response: `{ status: 'success', data: {...}, meta?: {...} }`
3. Frontend expects the resource type `T` directly

**Issue:** Frontend currently expects `response.data` to be the resource type, but backend returns `{ status, data, meta }`.

**Solution:** Frontend needs to extract `response.data.data` (the actual resource).

**Updated Pattern:**
```typescript
const response = await apiClient.post<{ status: string; data: Subscription; meta?: any }>(
  `/admin/subscriptions/${subscriptionId}/upgrade`,
  data
);
return response.data.data;  // Extract data field
```

**Endpoints to Update (in plan109.ts):**

1. `subscriptionApi.upgradeTier` (line ~98)
2. `subscriptionApi.downgradeTier` (line ~108)
3. `subscriptionApi.cancelSubscription` (line ~119)
4. `subscriptionApi.reactivateSubscription` (line ~130)
5. `subscriptionApi.allocateMonthlyCredits` (line ~140)
6. `billingApi.refundTransaction` (line ~307)
7. `billingApi.retryPayment` (line ~328)
8. `creditApi.grantBonusCredits` (line ~398)
9. `creditApi.processMonthlyAllocations` (line ~409)

---

## Testing Checklist

### Backend Testing

- [ ] **Build Test:** `cd backend && npm run build` (0 errors expected)
- [ ] **Manual API Test:** Use curl/Postman to verify response structure for each endpoint

### Frontend Testing

- [ ] **Build Test:** `cd frontend && npm run build` (0 errors expected)
- [ ] **Type Checking:** Verify TypeScript types align with new response structure

---

## Implementation Order

1. ✅ **Create Implementation Spec** (this document)
2. **Backend Controllers:** Update all 16 endpoints to use standard format
3. **Frontend API Client:** Update plan109.ts methods
4. **Build Verification:** Run backend and frontend builds
5. **Documentation:** Create completion report

---

## Success Criteria

- [ ] All 16 endpoints return standardized `{ status, data, meta? }` format
- [ ] Backend build passes with 0 TypeScript errors
- [ ] Frontend build passes with 0 TypeScript errors
- [ ] No breaking changes to existing functionality
- [ ] Documentation complete

---

## Risk Assessment

**Low Risk Changes:**
- ✅ Backend controller modifications (response wrapping only)
- ✅ Frontend type updates
- ✅ No database schema changes
- ✅ No service layer changes (services return same data)

**Potential Issues:**
- ⚠️ Frontend may have other components directly accessing these responses
- ⚠️ Integration tests may expect old response format

**Mitigation:**
- Test builds after each change
- Search for API client usage across frontend codebase
- Update integration tests if needed

---

**Document Status:** Ready for Implementation
**Estimated Effort:** 1-2 hours (32 controller lines + 9 frontend methods + testing)
**Priority:** Medium
