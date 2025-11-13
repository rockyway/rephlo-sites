# Batch 6: Miscellaneous API Response Standardization - Implementation Specification

**Date:** 2025-11-12
**Status:** In Progress
**Scope:** All remaining POST/PATCH endpoints not covered in Batches 1-5
**Estimated Endpoints:** ~37 endpoints

---

## Executive Summary

This is the **FINAL BATCH** of the comprehensive API response standardization project. After analyzing all 90+ POST/PATCH endpoints across the codebase, we've identified the remaining endpoints that need standardization.

### Batches 1-5 Summary (Completed - 53 endpoints)

- **Batch 1:** Model tier management (8 endpoints)
- **Batch 2:** Billing & credits (16 endpoints)
- **Batch 3:** Licenses & migrations (12 endpoints)
- **Batch 4:** Campaigns & coupons (8 endpoints - 2 updated, 6 already compliant)
- **Batch 5:** Auth & MFA (9 endpoints)

### Batch 6 Scope (Remaining ~37 endpoints)

All remaining POST/PATCH endpoints across:
1. User management (admin operations)
2. Subscription management (v1 API)
3. Model completions (v1 API)
4. Settings & configuration
5. Webhooks
6. Branding (feedback, diagnostics, downloads)
7. Admin operations (suspend/ban users, pricing simulation)

---

## Endpoint Discovery and Categorization

### Category 1: User Management (Admin) - 7 endpoints

From `temp-post-patch-endpoints.txt`:

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 67 | PATCH | `/users/:id` | `userManagementController.editUserProfile` | `plan109.routes.ts:202` |
| 68 | POST | `/users/:id/adjust-credits` | `userManagementController.adjustUserCredits` | `plan109.routes.ts:262` |
| 69 | POST | `/users/:id/ban` | `userManagementController.banUser` | `plan109.routes.ts:232` |
| 70 | PATCH | `/users/:id/role` | `-` | `admin.routes.ts:622` |
| 71 | POST | `/users/:id/suspend` | `adminController.suspendUser` | `admin.routes.ts:87` |
| 72 | POST | `/users/:id/suspend` | `userManagementController.suspendUser` | `plan109.routes.ts:212` |
| 73 | POST | `/users/:id/unban` | `userManagementController.unbanUser` | `plan109.routes.ts:242` |
| 74 | POST | `/users/:id/unsuspend` | `userManagementController.unsuspendUser` | `plan109.routes.ts:222` |
| 75 | POST | `/users/bulk-update` | `userManagementController.bulkUpdateUsers` | `plan109.routes.ts:252` |

**Note:** Lines 71 and 72 are duplicate routes (same operation, different controllers). Need to verify which one is active.

---

### Category 2: V1 API - Subscriptions (3 endpoints)

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 53 | POST | `/subscriptions` | `subscriptionController.createSubscription` | `plan109.routes.ts:56` |
| 54 | POST | `/subscriptions` | `subscriptionsController.createSubscription` | `v1.routes.ts:210` |
| 64 | PATCH | `/subscriptions/me` | `subscriptionsController.updateSubscription` | `v1.routes.ts:221` |
| 65 | POST | `/subscriptions/me/cancel` | `subscriptionsController.cancelSubscription` | `v1.routes.ts:232` |

**Note:** Lines 53 and 54 are duplicate routes (admin vs v1 API). Line 53 covered in Batch 2.

---

### Category 3: V1 API - Users (3 endpoints)

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 76 | PATCH | `/users/me` | `usersController.updateCurrentUser` | `v1.routes.ts:67` |
| 77 | PATCH | `/users/me/preferences` | `usersController.updateUserPreferences` | `v1.routes.ts:91` |
| 78 | POST | `/users/me/preferences/model` | `usersController.setDefaultModel` | `v1.routes.ts:103` |

---

### Category 4: V1 API - Models (2 endpoints)

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 25 | POST | `/chat/completions` | `modelsController.chatCompletion` | `v1.routes.ts:172` |
| 26 | POST | `/completions` | `modelsController.textCompletion` | `v1.routes.ts:159` |

---

### Category 5: Settings & Configuration (3 endpoints)

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 49 | POST | `/settings/clear-cache` | `settingsController.clearCache` | `admin.routes.ts:753` |
| 50 | POST | `/settings/run-backup` | `settingsController.runBackup` | `admin.routes.ts:768` |
| 51 | POST | `/settings/test-email` | `settingsController.testEmailConfig` | `admin.routes.ts:739` |

---

### Category 6: Webhooks (3 endpoints)

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 82 | POST | `/webhooks/config` | `webhooksController.setWebhookConfig` | `v1.routes.ts:310` |
| 83 | POST | `/webhooks/stripe` | `subscriptionsController.handleStripeWebhook` | `index.ts:273` |
| 84 | POST | `/webhooks/test` | `adminController.testWebhook` | `admin.routes.ts:123` |
| 85 | POST | `/webhooks/test` | `webhooksController.testWebhook` | `v1.routes.ts:332` |

**Note:** Lines 84 and 85 are duplicate routes.

---

### Category 7: Branding (Feedback, Diagnostics, Downloads) - 3 endpoints

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 33 | POST | `/diagnostics` | `brandingController.uploadDiagnostic` | `branding.routes.ts:159` |
| 35 | POST | `/feedback` | `brandingController.submitFeedback` | `branding.routes.ts:100` |
| 66 | POST | `/track-download` | `brandingController.trackDownload` | `branding.routes.ts:68` |

---

### Category 8: Admin Operations (1 endpoint)

| Line | Method | Route | Controller | File |
|------|--------|-------|------------|------|
| 46 | POST | `/pricing/simulate` | `profitabilityController.simulatePricing` | `admin.routes.ts:970` |

---

### Category 9: Identity Provider (EXCLUDED - 3 endpoints)

These are handled by the identity-provider service, not the backend:

| Line | Method | Route | Note |
|------|--------|-------|------|
| 86 | POST | `/interaction/:uid/consent` | Identity Provider OIDC |
| 87 | POST | `/interaction/:uid/login` | Identity Provider OIDC |
| 88-90 | POST | `/oauth/*` | Identity Provider OIDC |

**Status:** EXCLUDED from this batch (different service)

---

## Total Endpoint Count

### Batch 6 Endpoints: 37 endpoints
- Category 1: User Management (9 endpoints)
- Category 2: V1 Subscriptions (3 endpoints, 2 new)
- Category 3: V1 Users (3 endpoints)
- Category 4: V1 Models (2 endpoints)
- Category 5: Settings (3 endpoints)
- Category 6: Webhooks (3 endpoints, accounting for duplicates)
- Category 7: Branding (3 endpoints)
- Category 8: Admin Operations (1 endpoint)
- **Subtotal:** 27 unique endpoints + duplicates

### Adjustments for Duplicates:
- Lines 71 & 72: Duplicate suspend user routes (count as 1)
- Lines 53 & 54: Duplicate create subscription (line 53 done in Batch 2, line 54 new)
- Lines 84 & 85: Duplicate webhook test routes (count as 1)

**Adjusted Count:** ~37 endpoints (after removing duplicates and excluding identity-provider)

---

## Standard Response Format (Target)

```typescript
{
  status: 'success',
  data: <PrimaryResource>,  // Flat object, NOT nested
  meta?: {
    message?: string,
    auditLog?: AuditLogEntry,
    affectedRecords?: number,
    warnings?: string[]
  }
}
```

---

## Implementation Plan

### Phase 1: Analyze Current Implementation

For each category, read the controller files and document:
1. Current response format
2. Whether already compliant
3. Required changes

### Phase 2: Standardize Controllers

Update controllers to return standardized format:
- Wrap responses in `{ status, data, meta }`
- Move messages to `meta.message`
- Extract nested data to flat `data` field
- Ensure camelCase field names

### Phase 3: Update Frontend (if needed)

Identify and update frontend API clients:
- `frontend/src/api/admin.ts`
- `frontend/src/api/plan109.ts`
- `frontend/src/services/api.ts`
- Other files consuming these endpoints

### Phase 4: Build Validation

- Run `cd backend && npm run build` - must pass
- Run `cd frontend && npm run build` - must pass
- Document exact build output

---

## Next Steps

1. ✅ Create this implementation spec
2. ⏳ Read controller files for each category
3. ⏳ Document before/after for each endpoint
4. ⏳ Implement standardization
5. ⏳ Update frontend API clients
6. ⏳ Verify builds
7. ⏳ Create completion report

---

## Expected Files to Modify

### Backend Controllers
- `backend/src/controllers/user-management.controller.ts`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/controllers/subscription-management.controller.ts`
- `backend/src/controllers/subscriptions.controller.ts` (v1)
- `backend/src/controllers/users.controller.ts` (v1)
- `backend/src/controllers/models.controller.ts` (v1)
- `backend/src/controllers/admin/settings.controller.ts`
- `backend/src/controllers/admin/profitability.controller.ts`
- `backend/src/controllers/webhooks.controller.ts`
- `backend/src/controllers/branding.controller.ts`

### Frontend API Clients
- `frontend/src/api/admin.ts`
- `frontend/src/api/plan109.ts`
- `frontend/src/services/api.ts`
- Others as discovered

---

## Success Criteria

- [ ] All remaining POST/PATCH endpoints identified
- [ ] All endpoints return standardized format
- [ ] Backend build passes with 0 errors
- [ ] Frontend build passes with 0 errors
- [ ] Implementation spec complete
- [ ] Completion report created
- [ ] Total endpoint count: ~90 (53 from Batches 1-5 + ~37 from Batch 6)

---

**Document Status:** Draft - In Progress
**Author:** API Backend Implementer Agent
**Last Updated:** 2025-11-12
