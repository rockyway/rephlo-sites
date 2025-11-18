# 191 - Prisma Model Naming Fix Analysis & Implementation Guide

**Created**: 2025-11-16
**Status**: Analysis Complete - Implementation Guide Ready
**Task**: Fix ~800+ TypeScript compilation errors from incorrect Prisma model naming

---

## Executive Summary

Previous agents made systematic errors by **incorrectly assuming ALL Prisma models should be pluralized**. The actual Prisma schema uses **MIXED naming conventions** (some plural, some singular), resulting in ~800+ compilation errors across 214 TypeScript files.

**Root Cause**: Overly broad pluralization without consulting `prisma/schema.prisma` model names.

**Impact**: Build completely broken with ~800 errors preventing compilation.

**Solution**: Comprehensive mapping document + automated fixing script + manual corrections for edge cases.

---

## Error Breakdown by Category

### Category 1: Prisma Model Access Errors (~400 errors)
**Pattern**: `prisma.{wrong_name}` → `prisma.{correct_name}`

**Examples**:
- `prisma.coupons` → `prisma.coupon` (singular)
- `prisma.user.findUnique` → `prisma.users.findUnique` (plural)
- `prisma.coupon_redemptions` → `prisma.coupon_redemption` (singular)
- `prisma.perpetual_licenses` → `prisma.perpetual_license` (singular)

**Affected Files**:
- `src/controllers/*.ts` (15 files)
- `src/services/*.ts` (38 files)
- `src/routes/*.ts` (27 files)
- `src/db/seed.ts` (~60 errors alone)

---

### Category 2: Type Import Errors (~100 errors)
**Pattern**: Enum/model type imports using wrong case or non-existent types

**Examples**:
```typescript
// ❌ WRONG
import { ActivationStatus } from '@prisma/client';
import { SubscriptionTier } from '@prisma/client';
import { Download, Feedback } from '@prisma/client';

// ✅ CORRECT
import { activation_status } from '@prisma/client';
import { subscription_tier } from '@prisma/client';
import { downloads, feedbacks } from '@prisma/client';
```

**Affected Files**:
- `src/controllers/device-activation-management.controller.ts`
- `src/controllers/models.controller.ts`
- `src/controllers/fraud-detection.controller.ts`
- `src/interfaces/services/*.ts` (5 files)
- `src/interfaces/types.ts`

---

### Category 3: Field Access Errors (~150 errors)
**Pattern**: Using camelCase for database fields (should be snake_case)

**Examples**:
```typescript
// ❌ WRONG
campaign.campaignName, campaign.startDate, campaign.budgetLimitUsd

// ✅ CORRECT
campaign.campaign_name, campaign.start_date, campaign.budget_limit_usd
```

**Affected Files**:
- `src/controllers/campaign.controller.ts` (~10 errors)
- `src/controllers/subscriptions.controller.ts`

---

### Category 4: Mock File Schema Mismatches (~50 errors)
**Pattern**: Mock data using outdated schema structure

**Primary Issues**:

#### subscription.service.mock.ts
- **Interface Changed**: `subscriptions` → `subscription_monetization`
- **Removed Fields**: `credits_per_month`, `price_cents`, `billing_interval`, `trial_end`
- **New Fields**: `billing_cycle`, `base_price_usd`, `monthly_credit_allocation`, `trial_ends_at`

#### usage.service.mock.ts
- **Model Changed**: `UsageHistory` → `token_usage_ledger`
- **Removed Fields**: `credit_id`, `operation`, `credits_used`, `total_tokens`, `request_duration_ms`
- **New Fields**: `request_id`, `provider_id`, `credits_deducted`, `processing_time_ms`, etc.

---

### Category 5: Missing Required Fields (~50 errors)
**Pattern**: Create operations missing mandatory fields (`id`, `updated_at`)

**Affected Controllers**:
- `branding.controller.ts` - downloads, feedbacks, diagnostics missing `id`
- `auth-management.controller.ts` - users missing `id`, `updated_at`

---

### Category 6: Seed File Errors (~60 errors)
**Pattern**: Multiple model name and field name errors in seed.ts

**Issues**:
- `prisma.user` → `prisma.users` (multiple occurrences)
- `prisma.subscription` → `prisma.subscriptions`
- `prisma.download` → `prisma.downloads`
- `displayName` → `display_name` (role creation)

---

## Critical Files Requiring Immediate Attention

### Tier 1: Highest Error Density (60+ errors combined)

1. **src/db/seed.ts** (~60 errors)
   - Model name errors: user, subscription, credit, download, feedback, diagnostic
   - Field errors: displayName → display_name

2. **src/services/admin-analytics.service.ts** (~30 errors)
   - perpetual_licenses → perpetual_license
   - version_upgrades → version_upgrade
   - coupon_redemptions → coupon_redemption

3. **src/controllers/coupon.controller.ts** (~15 errors)
   - coupons → coupon (ALL occurrences)
   - coupon_redemptions → coupon_redemption

### Tier 2: Medium Error Density (10-20 errors each)

4. **src/__tests__/mocks/subscription.service.mock.ts** (~15 errors)
   - Complete schema mismatch - needs full rewrite

5. **src/__tests__/mocks/usage.service.mock.ts** (~15 errors)
   - Complete schema mismatch - needs full rewrite

6. **src/routes/mfa.routes.ts** (~10 errors)
   - prisma.user → prisma.users (ALL occurrences)

7. **src/controllers/campaign.controller.ts** (~10 errors)
   - Field access: camelCase → snake_case

### Tier 3: Low Error Density (<10 errors each)

8. **src/controllers/social-auth.controller.ts**
9. **src/controllers/branding.controller.ts**
10. **src/controllers/auth-management.controller.ts**
11. **src/db/index.ts**
12. **src/interfaces/services/*.ts** (5 files)

---

## Solution Approach

### Phase 1: Automated Batch Fixes (Covers ~600 errors)

**Tool**: PowerShell script (Windows) or bash script (Unix/Linux)

**Script Location**: `backend/COMPREHENSIVE_PRISMA_FIXES.md` (includes PowerShell script)

**What It Fixes**:
- All `prisma.{model_name}` access patterns
- Systematic find-and-replace across all .ts files
- ~75% of total errors

**Estimated Time**: 2-5 minutes

---

### Phase 2: Manual Mock File Corrections (Covers ~30 errors)

**Files**:
1. `src/__tests__/mocks/subscription.service.mock.ts`
2. `src/__tests__/mocks/usage.service.mock.ts`

**Action**: Replace entire mock data structures to match current schema

**Estimated Time**: 10-15 minutes

---

### Phase 3: Type Import Corrections (Covers ~100 errors)

**Method**: IDE "Find & Replace" with exact match

**Patterns**:
```
ActivationStatus → activation_status
SubscriptionTier → subscription_tier
Download → downloads
Feedback → feedbacks
Diagnostic → diagnostics
AppVersion → app_versions
credit_balance → user_credit_balance
token_usage → token_usage_ledger
webhook_config → webhook_configs
webhook_log → webhook_logs
```

**Estimated Time**: 5-10 minutes

---

### Phase 4: Field Access Corrections (Covers ~70 errors)

**Method**: Manual review and fix in affected files

**Target Files**:
- `campaign.controller.ts`
- `coupon.controller.ts`
- Any file with camelCase field access errors

**Estimated Time**: 10-15 minutes

---

### Phase 5: Missing Required Fields (Covers ~50 errors)

**Method**: Add missing fields to create operations

**Files**:
- `branding.controller.ts`
- `auth-management.controller.ts`

**Pattern**:
```typescript
data: {
  id: crypto.randomUUID(),
  // ... other fields
  updated_at: new Date() // if required
}
```

**Estimated Time**: 5-10 minutes

---

## Implementation Steps

### Step 1: Pre-Implementation Verification
```bash
cd backend
npm run build 2>&1 | tee build-before.log
grep "^src/" build-before.log | wc -l  # Should show ~800 errors
```

### Step 2: Run Automated Script
```powershell
# From backend directory
.\fix-prisma-names.ps1
```

**OR** manually run find-and-replace with patterns from `COMPREHENSIVE_PRISMA_FIXES.md`

### Step 3: Fix Mock Files
- Replace `subscription.service.mock.ts` with template from comprehensive guide
- Replace `usage.service.mock.ts` with template from comprehensive guide

### Step 4: Fix Type Imports
- Use IDE find-and-replace for enum/model type imports
- Check `interfaces/` directory files

### Step 5: Fix Field Access
- Review `campaign.controller.ts` for camelCase fields
- Fix any remaining field access errors

### Step 6: Add Missing Required Fields
- Update `branding.controller.ts` create operations
- Update `auth-management.controller.ts` create operations

### Step 7: Verify Build
```bash
npm run build 2>&1 | tee build-after.log
grep "^src/" build-after.log | wc -l  # Should show <50 errors
```

---

## Expected Outcomes

### Success Criteria
- ✅ Build error count reduced from ~800 to <50
- ✅ All Prisma model access uses correct schema names
- ✅ All type imports use correct case and model names
- ✅ Mock files match current schema structure
- ✅ Build completes successfully (0 errors ideal, <20 acceptable for edge cases)

### Time Estimate
- **Automated fixes**: 5 minutes
- **Manual corrections**: 30-40 minutes
- **Testing & verification**: 10 minutes
- **Total**: ~45-60 minutes

---

## Reference Documents

1. **PRISMA_MODEL_MAPPING.md** - Authoritative 52-model reference table
2. **COMPREHENSIVE_PRISMA_FIXES.md** - Complete fix patterns + PowerShell script
3. **prisma/schema.prisma** - Source of truth for all model names

---

## Lessons Learned

### ❌ What Went Wrong
1. **Assumption-based changes**: Previous agent assumed all models should be plural without consulting schema
2. **No verification step**: Changes were applied without running build to verify
3. **Batch changes without mapping**: Broad find-and-replace without creating correct model mapping first

### ✅ Correct Approach
1. **Always consult schema first**: Use `grep "^model " prisma/schema.prisma` to get exact names
2. **Create mapping document**: Build comprehensive reference before making changes
3. **Incremental verification**: Fix high-impact files first, verify, then proceed
4. **Automated + Manual**: Use scripts for systematic fixes, manual review for edge cases

---

## Post-Implementation Validation

### Checklist
- [ ] Build completes with <50 errors
- [ ] All Prisma client access uses correct model names
- [ ] All enum/type imports use correct case
- [ ] Mock files match current schema
- [ ] Required fields present in create operations
- [ ] No regression in existing functionality

### Test Commands
```bash
# Build check
npm run build

# Type check only
npx tsc --noEmit

# Verify specific models in code
grep -r "prisma\.coupons" src/  # Should return 0 matches
grep -r "prisma\.user\." src/   # Should return 0 matches
grep -r "prisma\.coupon\." src/ # Should have matches (correct)
grep -r "prisma\.users\." src/  # Should have matches (correct)
```

---

## Next Steps

1. **Immediate**: Apply fixes using comprehensive guide
2. **Short-term**: Run full test suite after build succeeds
3. **Long-term**: Add pre-commit hook to prevent similar issues:
   ```bash
   # Check for common Prisma model name mistakes
   grep -r "prisma\.coupons\|prisma\.user\.\|prisma\.subscription\." src/
   ```

---

**Status**: ✅ Analysis Complete - Ready for Implementation
**Deliverables**:
- ✅ PRISMA_MODEL_MAPPING.md (authoritative reference)
- ✅ COMPREHENSIVE_PRISMA_FIXES.md (implementation guide + script)
- ✅ This analysis document (191-prisma-model-naming-fix-analysis.md)

**Assigned To**: Next implementing agent or developer

---

**Last Updated**: 2025-11-16
**Document Version**: 1.0
