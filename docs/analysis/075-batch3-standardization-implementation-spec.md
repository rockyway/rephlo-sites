# Batch 3 API Response Standardization Implementation Specification

**Date:** 2025-11-12
**Status:** Implementation Ready
**Scope:** Licenses & Migrations endpoints (12 endpoints)
**Related Docs:**
- `docs/plan/158-api-response-standardization-plan.md`
- `docs/analysis/073-batch1-standardization-implementation-spec.md`
- `docs/progress/165-batch1-api-standardization-complete.md`
- `docs/analysis/074-batch2-standardization-implementation-spec.md`
- `docs/progress/166-batch2-api-standardization-complete.md`
- `docs/reference/156-api-standards.md`

---

## Executive Summary

This document provides exact implementation instructions for standardizing all POST/PATCH endpoints in the Licenses & Migrations category to use consistent response format:

```typescript
{
  status: 'success',
  data: <PrimaryResource>,  // Flat object, NOT nested
  meta?: {
    message?: string,
    auditLog?: AuditLogEntry,
    affectedRecords?: number
  }
}
```

**Goal:** Align license management, device activation, proration, migration, and version upgrade endpoints with the standardized API response format established in Batch 1 and Batch 2.

---

## Endpoints in Scope

### Admin License Management (5 endpoints)
1. `POST /admin/licenses/:id/suspend` - `licenseController.suspendLicense`
2. `POST /admin/licenses/:id/revoke` - `licenseController.revokeLicense`
3. `POST /admin/licenses/devices/:id/deactivate` - `deviceActivationController.deactivateDevice`
4. `POST /admin/licenses/devices/:id/revoke` - `deviceActivationController.revokeDevice`
5. `POST /admin/licenses/devices/bulk-action` - `deviceActivationController.bulkAction`

### Admin Proration (1 endpoint)
6. `POST /admin/prorations/:id/reverse` - `prorationController.reverseProration`

### Public License Operations (4 endpoints)
7. `POST /licenses/purchase` - `licenseController.purchaseLicense`
8. `POST /licenses/activate` - `licenseController.activateDevice`
9. `PATCH /licenses/activations/:id/replace` - `licenseController.replaceDevice`
10. `POST /licenses/:licenseKey/upgrade` - `upgradeController.purchaseUpgrade`

### License Migrations (2 endpoints)
11. `POST /migrations/perpetual-to-subscription` - `migrationController.migratePerpetualToSubscription`
12. `POST /migrations/subscription-to-perpetual` - `migrationController.migrateSubscriptionToPerpetual`

**Total:** 12 endpoints

---

## Current State Analysis

### Mixed Response Formats

**Pattern 1: Direct resource return (no wrapper)**
```typescript
res.status(201).json({
  id: license.id,
  license_key: license.licenseKey,
  status: license.status,
  // ... other fields
});
```

**Pattern 2: With message field**
```typescript
res.status(200).json({
  id: license.id,
  license_key: license.licenseKey,
  status: license.status,
  message: 'License suspended successfully',
});
```

**Pattern 3: Using success field**
```typescript
res.status(200).json({
  success: true,
  message: 'Device deactivated successfully',
});
```

**Pattern 4: Nested structure (proration reversal)**
```typescript
res.status(200).json({
  status: 'success',
  data: {
    id: reversedEvent.id,
    // ... fields
    message: 'Proration reversed successfully',
  },
});
```

### Target Standard Format

```typescript
res.status(200).json({
  status: 'success',
  data: <PrimaryResource>,  // Flat object
  meta?: {
    message?: string,
  }
});
```

---

## Implementation Plan

### Phase 1: Backend Controller Updates

#### File: `backend/src/controllers/license-management.controller.ts`

**Endpoint 1: POST /api/licenses/purchase (Lines 40-79)**

Current (Lines 61-69):
```typescript
res.status(201).json({
  id: license.id,
  license_key: license.licenseKey,
  purchased_version: license.purchasedVersion,
  eligible_until_version: license.eligibleUntilVersion,
  max_activations: license.maxActivations,
  status: license.status,
  purchased_at: license.purchasedAt.toISOString(),
});
```

Updated:
```typescript
// Standard response format
res.status(201).json({
  status: 'success',
  data: {
    id: license.id,
    license_key: license.licenseKey,
    purchased_version: license.purchasedVersion,
    eligible_until_version: license.eligibleUntilVersion,
    max_activations: license.maxActivations,
    status: license.status,
    purchased_at: license.purchasedAt.toISOString(),
  },
});
```

---

**Endpoint 2: POST /api/licenses/activate (Lines 85-135)**

Current (Lines 101-109):
```typescript
res.status(result.isNewActivation ? 201 : 200).json({
  activation_id: result.activation.id,
  license_id: result.activation.licenseId,
  machine_fingerprint: result.activation.machineFingerprint,
  device_name: result.activation.deviceName,
  status: result.activation.status,
  activated_at: result.activation.activatedAt.toISOString(),
  is_new_activation: result.isNewActivation,
});
```

Updated:
```typescript
// Standard response format
res.status(result.isNewActivation ? 201 : 200).json({
  status: 'success',
  data: {
    activation_id: result.activation.id,
    license_id: result.activation.licenseId,
    machine_fingerprint: result.activation.machineFingerprint,
    device_name: result.activation.deviceName,
    status: result.activation.status,
    activated_at: result.activation.activatedAt.toISOString(),
    is_new_activation: result.isNewActivation,
  },
});
```

---

**Endpoint 3: PATCH /api/licenses/activations/:id/replace (Lines 181-224)**

Current (Lines 198-205):
```typescript
res.status(200).json({
  activation_id: activation.id,
  license_id: activation.licenseId,
  machine_fingerprint: activation.machineFingerprint,
  device_name: activation.deviceName,
  status: activation.status,
  activated_at: activation.activatedAt.toISOString(),
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    activation_id: activation.id,
    license_id: activation.licenseId,
    machine_fingerprint: activation.machineFingerprint,
    device_name: activation.deviceName,
    status: activation.status,
    activated_at: activation.activatedAt.toISOString(),
  },
});
```

---

**Endpoint 4: POST /api/admin/licenses/:id/suspend (Lines 334-356)**

Current (Lines 341-346):
```typescript
res.status(200).json({
  id: license.id,
  license_key: license.licenseKey,
  status: license.status,
  message: 'License suspended successfully',
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    id: license.id,
    license_key: license.licenseKey,
    status: license.status,
  },
  meta: {
    message: 'License suspended successfully',
  },
});
```

---

**Endpoint 5: POST /api/admin/licenses/:id/revoke (Lines 362-384)**

Current (Lines 369-374):
```typescript
res.status(200).json({
  id: license.id,
  license_key: license.licenseKey,
  status: license.status,
  message: 'License revoked successfully',
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    id: license.id,
    license_key: license.licenseKey,
    status: license.status,
  },
  meta: {
    message: 'License revoked successfully',
  },
});
```

---

#### File: `backend/src/controllers/device-activation-management.controller.ts`

**Endpoint 6: POST /admin/licenses/devices/:id/deactivate (Lines 94-122)**

Current (Lines 100-103):
```typescript
res.status(200).json({
  success: true,
  message: 'Device deactivated successfully',
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    message: 'Device deactivated successfully',
  },
});
```

---

**Endpoint 7: POST /admin/licenses/devices/:id/revoke (Lines 128-167)**

Current (Lines 145-148):
```typescript
res.status(200).json({
  success: true,
  message: 'Device revoked successfully',
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    message: 'Device revoked successfully',
  },
});
```

---

**Endpoint 8: POST /admin/licenses/devices/bulk-action (Lines 173-224)**

Current (Lines 210-214):
```typescript
res.status(200).json({
  success: true,
  affectedCount: result.affectedCount,
  message: `Bulk ${action} completed successfully`,
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    affectedCount: result.affectedCount,
  },
  meta: {
    message: `Bulk ${action} completed successfully`,
  },
});
```

---

#### File: `backend/src/controllers/proration.controller.ts`

**Endpoint 9: POST /admin/prorations/:id/reverse (Lines 305-357)**

Current (Lines 323-338):
```typescript
res.status(200).json({
  status: 'success',
  data: {
    id: reversedEvent.id,
    originalProrationId: id,
    userId: reversedEvent.userId,
    subscriptionId: reversedEvent.subscriptionId,
    fromTier: reversedEvent.fromTier,
    toTier: reversedEvent.toTier,
    netCharge: Number(reversedEvent.netChargeUsd),
    status: reversedEvent.status,
    effectiveDate: reversedEvent.effectiveDate.toISOString(),
    reason,
    message: 'Proration reversed successfully',
  },
});
```

Updated:
```typescript
// Standard response format: move message to meta
res.status(200).json({
  status: 'success',
  data: {
    id: reversedEvent.id,
    originalProrationId: id,
    userId: reversedEvent.userId,
    subscriptionId: reversedEvent.subscriptionId,
    fromTier: reversedEvent.fromTier,
    toTier: reversedEvent.toTier,
    netCharge: Number(reversedEvent.netChargeUsd),
    status: reversedEvent.status,
    effectiveDate: reversedEvent.effectiveDate.toISOString(),
    reason,
  },
  meta: {
    message: 'Proration reversed successfully',
  },
});
```

---

#### File: `backend/src/controllers/migration.controller.ts`

**Endpoint 10: POST /api/migrations/perpetual-to-subscription (Lines 36-118)**

Current (Lines 84-92):
```typescript
res.status(200).json({
  success: result.success,
  license_id: result.perpetualLicense?.id,
  license_key: result.perpetualLicense?.licenseKey,
  trade_in_credit_usd: result.tradeInCredit,
  target_tier: targetTier,
  billing_cycle: billingCycle || 'monthly',
  message: result.message,
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    license_id: result.perpetualLicense?.id,
    license_key: result.perpetualLicense?.licenseKey,
    trade_in_credit_usd: result.tradeInCredit,
    target_tier: targetTier,
    billing_cycle: billingCycle || 'monthly',
  },
  meta: {
    message: result.message,
  },
});
```

---

**Endpoint 11: POST /api/migrations/subscription-to-perpetual (Lines 124-211)**

Current (Lines 172-181):
```typescript
res.status(200).json({
  success: true,
  subscription_id: subscriptionId,
  refund_amount_usd: refundAmount,
  message: `Successfully migrated to perpetual license. ${
    refundAmount > 0
      ? `$${refundAmount.toFixed(2)} refund will be processed.`
      : 'No refund available (outside 30-day window).'
  }`,
});
```

Updated:
```typescript
// Standard response format
res.status(200).json({
  status: 'success',
  data: {
    subscription_id: subscriptionId,
    refund_amount_usd: refundAmount,
  },
  meta: {
    message: `Successfully migrated to perpetual license. ${
      refundAmount > 0
        ? `$${refundAmount.toFixed(2)} refund will be processed.`
        : 'No refund available (outside 30-day window).'
    }`,
  },
});
```

---

#### File: `backend/src/controllers/version-upgrade.controller.ts`

**Endpoint 12: POST /api/licenses/:licenseKey/upgrade (Lines 92-164)**

Current (Lines 129-138):
```typescript
res.status(201).json({
  upgrade_id: upgrade.id,
  license_id: license.id,
  from_version: upgrade.fromVersion,
  to_version: upgrade.toVersion,
  upgrade_price_usd: upgrade.upgradePriceUsd,
  pricing_breakdown: pricing,
  status: upgrade.status,
  purchased_at: upgrade.purchasedAt.toISOString(),
});
```

Updated:
```typescript
// Standard response format
res.status(201).json({
  status: 'success',
  data: {
    upgrade_id: upgrade.id,
    license_id: license.id,
    from_version: upgrade.fromVersion,
    to_version: upgrade.toVersion,
    upgrade_price_usd: upgrade.upgradePriceUsd,
    pricing_breakdown: pricing,
    status: upgrade.status,
    purchased_at: upgrade.purchasedAt.toISOString(),
  },
});
```

---

### Phase 2: Frontend API Client Updates

#### File: `frontend/src/api/plan110.ts`

**Update 1: purchaseLicense (Lines 87-93)**

Current:
```typescript
purchaseLicense: async (data: PurchaseLicenseRequest) => {
  const response = await apiClient.post<PerpetualLicense>(
    '/api/licenses/purchase',
    data
  );
  return response.data;
},
```

Updated:
```typescript
purchaseLicense: async (data: PurchaseLicenseRequest) => {
  const response = await apiClient.post<{ status: string; data: PerpetualLicense }>(
    '/api/licenses/purchase',
    data
  );
  return response.data.data;
},
```

---

**Update 2: suspendLicense (Lines 98-104)**

Current:
```typescript
suspendLicense: async (licenseId: string, data: SuspendLicenseRequest) => {
  const response = await apiClient.post<PerpetualLicense>(
    `/admin/licenses/${licenseId}/suspend`,
    data
  );
  return response.data;
},
```

Updated:
```typescript
suspendLicense: async (licenseId: string, data: SuspendLicenseRequest) => {
  const response = await apiClient.post<{ status: string; data: PerpetualLicense; meta?: any }>(
    `/admin/licenses/${licenseId}/suspend`,
    data
  );
  return response.data.data;
},
```

---

**Update 3: revokeLicense (Lines 109-115)**

Current:
```typescript
revokeLicense: async (licenseId: string, data: RevokeLicenseRequest) => {
  const response = await apiClient.post<PerpetualLicense>(
    `/admin/licenses/${licenseId}/revoke`,
    data
  );
  return response.data;
},
```

Updated:
```typescript
revokeLicense: async (licenseId: string, data: RevokeLicenseRequest) => {
  const response = await apiClient.post<{ status: string; data: PerpetualLicense; meta?: any }>(
    `/admin/licenses/${licenseId}/revoke`,
    data
  );
  return response.data.data;
},
```

---

**Update 4: activateDevice (Lines 146-152)**

Current:
```typescript
activateDevice: async (data: ActivateDeviceRequest) => {
  const response = await apiClient.post<LicenseActivation>(
    '/api/licenses/activate',
    data
  );
  return response.data;
},
```

Updated:
```typescript
activateDevice: async (data: ActivateDeviceRequest) => {
  const response = await apiClient.post<{ status: string; data: LicenseActivation }>(
    '/api/licenses/activate',
    data
  );
  return response.data.data;
},
```

---

**Update 5: replaceDevice (Lines 167-173)**

Current:
```typescript
replaceDevice: async (activationId: string, data: ReplaceDeviceRequest) => {
  const response = await apiClient.patch<LicenseActivation>(
    `/api/licenses/activations/${activationId}/replace`,
    data
  );
  return response.data;
},
```

Updated:
```typescript
replaceDevice: async (activationId: string, data: ReplaceDeviceRequest) => {
  const response = await apiClient.patch<{ status: string; data: LicenseActivation }>(
    `/api/licenses/activations/${activationId}/replace`,
    data
  );
  return response.data.data;
},
```

---

**Update 6: purchaseUpgrade (Lines 214-220)**

Current:
```typescript
purchaseUpgrade: async (licenseKey: string, targetVersion: string) => {
  const response = await apiClient.post<VersionUpgrade>(
    `/api/licenses/${licenseKey}/upgrade`,
    { targetVersion }
  );
  return response.data;
},
```

Updated:
```typescript
purchaseUpgrade: async (licenseKey: string, targetVersion: string) => {
  const response = await apiClient.post<{ status: string; data: VersionUpgrade }>(
    `/api/licenses/${licenseKey}/upgrade`,
    { targetVersion }
  );
  return response.data.data;
},
```

---

**Update 7: reverseProration (Lines 305-311)**

Current:
```typescript
reverseProration: async (prorationId: string, data: ReverseProrationRequest) => {
  const response = await apiClient.post<ProrationEvent>(
    `/admin/prorations/${prorationId}/reverse`,
    data
  );
  return response.data;
},
```

Updated:
```typescript
reverseProration: async (prorationId: string, data: ReverseProrationRequest) => {
  const response = await apiClient.post<{ status: string; data: ProrationEvent; meta?: any }>(
    `/admin/prorations/${prorationId}/reverse`,
    data
  );
  return response.data.data;
},
```

---

**Update 8: migratePerpetualToSubscription (Lines 362-368)**

Current:
```typescript
migratePerpetualToSubscription: async (licenseId: string, targetTier: string) => {
  const response = await apiClient.post<MigrationHistory>(
    '/api/migrations/perpetual-to-subscription',
    { licenseId, targetTier }
  );
  return response.data;
},
```

Updated:
```typescript
migratePerpetualToSubscription: async (licenseId: string, targetTier: string) => {
  const response = await apiClient.post<{ status: string; data: MigrationHistory; meta?: any }>(
    '/api/migrations/perpetual-to-subscription',
    { licenseId, targetTier }
  );
  return response.data.data;
},
```

---

**Update 9: migrateSubscriptionToPerpetual (Lines 373-379)**

Current:
```typescript
migrateSubscriptionToPerpetual: async (subscriptionId: string) => {
  const response = await apiClient.post<MigrationHistory>(
    '/api/migrations/subscription-to-perpetual',
    { subscriptionId }
  );
  return response.data;
},
```

Updated:
```typescript
migrateSubscriptionToPerpetual: async (subscriptionId: string) => {
  const response = await apiClient.post<{ status: string; data: MigrationHistory; meta?: any }>(
    '/api/migrations/subscription-to-perpetual',
    { subscriptionId }
  );
  return response.data.data;
},
```

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
2. **Backend Controllers:** Update all 12 endpoints to use standard format
3. **Frontend API Client:** Update plan110.ts methods
4. **Build Verification:** Run backend and frontend builds
5. **Documentation:** Create completion report

---

## Success Criteria

- [ ] All 12 endpoints return standardized `{ status, data, meta? }` format
- [ ] Backend build passes with 0 TypeScript errors
- [ ] Frontend build passes with 0 TypeScript errors
- [ ] No breaking changes to existing functionality
- [ ] Documentation complete (spec + report)

---

## Risk Assessment

**Low Risk Changes:**
- ✅ Backend controller modifications (response wrapping only)
- ✅ Frontend type updates
- ✅ No database schema changes
- ✅ No service layer changes

**Potential Issues:**
- ⚠️ Frontend may have other components directly accessing these responses
- ⚠️ Integration tests may expect old response format

**Mitigation:**
- Test builds after each change
- Search for API client usage across frontend codebase
- Update integration tests if needed

---

**Document Status:** Ready for Implementation
**Estimated Effort:** 2-3 hours (105 controller lines + 9 frontend methods + testing)
**Priority:** Medium
