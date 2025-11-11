# Prisma Schema Fix Instructions

## Problem

The Prisma schema was out of sync with the database migration `20251109000000_add_token_credit_conversion_system`. The migration created new tables with different structures than what was defined in `schema.prisma`, causing runtime errors like:

```
The column `token_usage_ledger.timestamp` does not exist in the current database.
```

## Changes Made

### 1. Added Missing Enums

Added 8 new enums from the token-to-credit conversion system:
- `PricingConfigScopeType`
- `PricingConfigReason`
- `PricingConfigApprovalStatus`
- `RequestType`
- `RequestStatus`
- `CreditDeductionReason`
- `CreditDeductionStatus`
- `CreditSourceType`

### 2. Updated Provider Model

Changed from old simple model to match migration:
- Table name: `provider` → `providers` (plural)
- Added `apiType` field
- Added relations to TokenUsageLedger and PricingConfig

### 3. Added PricingConfig Model

Created comprehensive PricingConfig model matching the migration with:
- Scope hierarchy (tier, provider, model, combination)
- Margin multiplier configuration
- Approval workflow fields
- Change history tracking
- Impact prediction

### 4. Completely Rewrote TokenUsageLedger Model

Changed from simple 10-field model to comprehensive 25+ field model:

**Old (INCORRECT):**
- timestamp (doesn't exist in DB)
- model_pricing_id (wrong relation)
- Missing 15+ fields

**New (CORRECT):**
- createdAt (actual column name in DB)
- requestId, userId, subscriptionId, modelId, providerId
- inputTokens, outputTokens, cachedInputTokens
- vendorCost, marginMultiplier, creditValueUsd, creditsDeducted
- requestType, streamingSegments
- requestStartedAt, requestCompletedAt, processingTimeMs
- status, errorMessage, isStreamingComplete
- userTierAtRequest, region
- deductionRecordId

### 5. Updated UserCreditBalance Model

Added missing fields:
- `lastDeductionAt`
- `lastDeductionAmount`

### 6. Completely Rewrote CreditDeductionLedger Model

Changed from simple model to comprehensive ledger:

**Old (INCORRECT):**
- deduction_type (wrong enum)
- timestamp (wrong column name)
- Missing balance tracking

**New (CORRECT):**
- balanceBefore, balanceAfter (balance tracking)
- requestId (link to token usage)
- tokenVendorCost, marginMultiplier, grossMargin
- reason (CreditDeductionReason enum)
- status (CreditDeductionStatus enum)
- reversedAt, reversedBy, reversalReason (reversal tracking)
- processedAt, createdAt (proper timestamps)

### 7. Updated User Model Relations

Added missing relations:
- `credit_deductions_reversed_by` (for reversal tracking)
- `pricing_configs_created` (for pricing config creation)
- `pricing_configs_approved` (for pricing config approval)

### 8. Fixed admin-analytics.service.ts

Changed incorrect query field names:
- `timestamp` → `createdAt`
- `credits_deducted` → `creditsDeducted`

## Next Steps

**Run on your Windows machine (not in container):**

```bash
cd backend

# 1. Generate Prisma client with new schema
npx prisma generate

# 2. Verify schema matches database
npx prisma db pull --print

# 3. Restart backend service
npm run dev
```

## Verification

After running the above, verify:

1. ✅ Prisma generates without errors
2. ✅ Admin analytics dashboard loads (`GET /admin/analytics/dashboard-kpis`)
3. ✅ No more "column does not exist" errors
4. ✅ TokenUsageLedger queries work correctly

## Files Modified

- `backend/prisma/schema.prisma` - Updated models and enums
- `backend/src/services/admin-analytics.service.ts` - Fixed field names

## Root Cause

The migration was manually executed (via SQL) but the Prisma schema was never updated to reflect the changes. This caused Prisma Client to be generated with outdated types that didn't match the actual database structure.

**Lesson:** Always update `schema.prisma` when manually applying migrations, or use `npx prisma migrate dev` instead of manual SQL execution.
