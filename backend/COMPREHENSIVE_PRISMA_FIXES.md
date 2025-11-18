# Comprehensive Prisma Model Naming Fix Guide

**Created**: 2025-11-16
**Task**: Fix ~800+ TypeScript compilation errors from incorrect Prisma model naming

---

## Summary of Issues

The previous agent made INCORRECT assumptions by pluralizing ALL Prisma models. The actual schema uses MIXED naming (some plural, some singular). This document provides the complete fix mapping.

---

## Category 1: Prisma Model Access Corrections

### Fix Pattern: Find & Replace Across All Files

Use your IDE's "Find in Files" feature with these exact replacements:

#### User Management Models
```
❌ prisma.user.          → ✅ prisma.users.
❌ prisma.userRoleAssignment → ✅ prisma.user_role_assignment
❌ prisma.permissionOverride → ✅ prisma.permission_override
```

#### Subscription Models
```
❌ prisma.subscription.  → ✅ prisma.subscriptions.
```

#### Credit Models
```
❌ prisma.credit.        → ✅ prisma.credits.
```

#### Coupon Models (ALL SINGULAR!)
```
❌ prisma.coupons        → ✅ prisma.coupon
❌ prisma.coupon_redemptions → ✅ prisma.coupon_redemption
❌ prisma.coupon_usage_limits → ✅ prisma.coupon_usage_limit
❌ prisma.couponFraudDetection → ✅ prisma.coupon_fraud_detection
```

#### Branding/Tracking Models
```
❌ prisma.download.      → ✅ prisma.downloads.
❌ prisma.feedback.      → ✅ prisma.feedbacks.
❌ prisma.diagnostic.    → ✅ prisma.diagnostics.
❌ prisma.appVersion     → ✅ prisma.app_versions
❌ prisma.oAuthClient    → ✅ prisma.oauth_clients
```

#### License Models (SINGULAR!)
```
❌ prisma.perpetual_licenses → ✅ prisma.perpetual_license
❌ prisma.license_activations → ✅ prisma.license_activation
❌ prisma.version_upgrades → ✅ prisma.version_upgrade
```

#### Analytics Models (SINGULAR!)
```
❌ prisma.credit_allocations → ✅ prisma.credit_allocation
```

#### Pricing Models
```
❌ prisma.modelProviderPricing → ✅ prisma.model_provider_pricing
```

---

## Category 2: Type Import Corrections

### Fix Pattern: Update Import Statements

#### Enum Type Imports (ALL snake_case)
```typescript
// ❌ WRONG
import { ActivationStatus } from '@prisma/client';
import { SubscriptionTier } from '@prisma/client';

// ✅ CORRECT
import { activation_status } from '@prisma/client';
import { subscription_tier } from '@prisma/client';
```

#### Model Type Imports
```typescript
// ❌ WRONG
import { Download, Feedback, Diagnostic, AppVersion } from '@prisma/client';
import { credit_balance, token_usage, model } from '@prisma/client';
import { webhook_config, webhook_log } from '@prisma/client';

// ✅ CORRECT
import { downloads, feedbacks, diagnostics, app_versions } from '@prisma/client';
import { user_credit_balance, token_usage_ledger, models } from '@prisma/client';
import { webhook_configs, webhook_logs } from '@prisma/client';
```

---

## Category 3: Schema Field Access (snake_case)

### Database Fields Are ALWAYS snake_case

#### Campaign Controller Field Fixes
```typescript
// ❌ WRONG
campaign.campaignName
campaign.campaignType
campaign.startDate
campaign.endDate
campaign.budgetLimitUsd
campaign.totalSpentUsd
campaign.isActive

// ✅ CORRECT
campaign.campaign_name
campaign.campaign_type
campaign.start_date
campaign.end_date
campaign.budget_limit_usd
campaign.total_spent_usd
campaign.is_active
```

#### Subscription Controller Field Fixes
```typescript
// ❌ WRONG
subscription.userId
subscription.stripeCustomerId
subscription.billingCycle

// ✅ CORRECT
subscription.user_id
subscription.stripe_customer_id
subscription.billing_cycle
```

---

## Category 4: Mock File Schema Updates

### subscription.service.mock.ts

**Interface Changed**: `subscriptions` → `subscription_monetization`

**Old Fields (REMOVED)**:
- `credits_per_month`, `credits_rollover`, `price_cents`, `billing_interval`
- `stripe_price_id`, `cancel_at_period_end`, `trial_end`

**New Fields (REQUIRED)**:
- `billing_cycle`, `base_price_usd`, `monthly_credit_allocation`
- `trial_ends_at`, `cancelled_at`

**Fix**: Replace entire file with:
```typescript
import { subscription_monetization } from '@prisma/client';
import { ISubscriptionService } from '../../interfaces';
import { Decimal } from '@prisma/client/runtime/library';

export class MockSubscriptionService implements ISubscriptionService {
  private subscriptions: Map<string, subscription_monetization> = new Map();

  async createSubscription(data: any): Promise<subscription_monetization> {
    const subscription: subscription_monetization = {
      id: `mock-sub-${Date.now()}`,
      user_id: data.userId,
      tier: 'pro' as any,
      status: data.status,
      billing_cycle: 'monthly',
      base_price_usd: new Decimal(20.00),
      monthly_credit_allocation: 1000,
      stripe_subscription_id: data.stripeSubscriptionId || null,
      stripe_customer_id: null,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trial_ends_at: null,
      cancelled_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    // ... rest of implementation
  }
}
```

### usage.service.mock.ts

**Model Changed**: `UsageHistory` → `token_usage_ledger`

**Old Fields (REMOVED)**:
- `credit_id`, `operation`, `credits_used`, `total_tokens`, `request_duration_ms`

**New Fields (REQUIRED)**:
- `request_id`, `provider_id`, `model_id`, `subscription_id`
- `input_tokens`, `output_tokens`, `cached_input_tokens`
- `vendor_cost`, `margin_multiplier`, `credit_value_usd`, `credits_deducted`
- `request_type`, `processing_time_ms`, `status`, `request_started_at`, `request_completed_at`

**Fix**: Replace mock data structure to match `token_usage_ledger` schema (see schema lines 895-936)

---

## Category 5: Missing Required Fields

### branding.controller.ts

**downloads.create** - Missing: `id`
```typescript
// ❌ WRONG
await this.prisma.downloads.create({
  data: { os: 'windows', userAgent: '...', ipHash: '...' }
});

// ✅ CORRECT
await this.prisma.downloads.create({
  data: {
    id: crypto.randomUUID(),
    os: 'windows',
    userAgent: '...',
    ipHash: '...'
  }
});
```

**feedbacks.create** - Missing: `id`
```typescript
// ✅ CORRECT
await this.prisma.feedbacks.create({
  data: {
    id: crypto.randomUUID(),
    message: '...',
    email: '...',
    userId: '...'
  }
});
```

**diagnostics.create** - Missing: `id`
```typescript
// ✅ CORRECT
await this.prisma.diagnostics.create({
  data: {
    id: crypto.randomUUID(),
    userId: '...',
    filePath: '...',
    fileSize: 1234
  }
});
```

### auth-management.controller.ts

**users.create** - Missing: `id`, `updated_at`
```typescript
// ✅ CORRECT
await this.prisma.users.create({
  data: {
    id: crypto.randomUUID(),
    email: '...',
    password_hash: '...',
    username: '...',
    first_name: '...',
    last_name: '...',
    email_verified: false,
    email_verification_token: '...',
    email_verification_token_expiry: new Date(),
    is_active: true,
    auth_provider: 'local',
    updated_at: new Date()
  }
});
```

---

## Category 6: Seed File Corrections

### seed.ts - Multiple Model Name Errors

```typescript
// ❌ WRONG → ✅ CORRECT
prisma.user.          → prisma.users.
prisma.subscription.  → prisma.subscriptions.
prisma.credit.        → prisma.credits.
prisma.download.      → prisma.downloads.
prisma.feedback.      → prisma.feedbacks.
prisma.diagnostic.    → prisma.diagnostics.
prisma.appVersion.    → prisma.app_versions.
prisma.oAuthClient    → prisma.oauth_clients
prisma.userRoleAssignment → prisma.user_role_assignment
prisma.permissionOverride → prisma.permission_override
```

**Field Name Fixes**:
```typescript
// In role creation
displayName → display_name
```

---

## Category 7: db/index.ts Corrections

```typescript
// ❌ WRONG
await prisma.download.count()
await prisma.feedback.count()
await prisma.diagnostic.count()
await prisma.appVersion.count()

// Export types
export type { Download, Feedback, Diagnostic, AppVersion }

// ✅ CORRECT
await prisma.downloads.count()
await prisma.feedbacks.count()
await prisma.diagnostics.count()
await prisma.app_versions.count()

// Export types
export type { downloads, feedbacks, diagnostics, app_versions }
```

---

## Category 8: Interface Files

### credit.interface.ts
```typescript
// ❌ WRONG
import { credit_balance } from '@prisma/client';

// ✅ CORRECT
import { user_credit_balance } from '@prisma/client';
```

### model.interface.ts
```typescript
// ❌ WRONG
import { SubscriptionTier } from '@prisma/client';

// ✅ CORRECT
import { subscription_tier } from '@prisma/client';
```

### usage.interface.ts
```typescript
// ❌ WRONG
import { token_usage } from '@prisma/client';

// ✅ CORRECT
import { token_usage_ledger } from '@prisma/client';
```

### webhook.interface.ts
```typescript
// ❌ WRONG
import { webhook_config, webhook_log } from '@prisma/client';

// ✅ CORRECT
import { webhook_configs, webhook_logs } from '@prisma/client';
```

### types.ts
```typescript
// ❌ WRONG
import { credit_balance, token_usage, model } from '@prisma/client';

// ✅ CORRECT
import { user_credit_balance, token_usage_ledger, models } from '@prisma/client';
```

---

## Files Requiring Manual Attention

### High Priority (Most Errors)

1. **src/services/admin-analytics.service.ts** - ~30 errors
   - Fix: `perpetual_licenses` → `perpetual_license`
   - Fix: `version_upgrades` → `version_upgrade`
   - Fix: `coupon_redemptions` → `coupon_redemption`
   - Fix: `credit_allocations` → `credit_allocation`
   - Fix: `license_activations` → `license_activation`

2. **src/routes/mfa.routes.ts** - ~10 errors
   - Fix ALL: `prisma.user.` → `prisma.users.`

3. **src/controllers/coupon.controller.ts** - ~15 errors
   - Fix ALL: `prisma.coupons` → `prisma.coupon`
   - Fix ALL: `prisma.coupon_redemptions` → `prisma.coupon_redemption`
   - Fix ALL: `prisma.coupon_usage_limits` → `prisma.coupon_usage_limit`

4. **src/controllers/campaign.controller.ts** - ~10 errors
   - Fix ALL camelCase field access to snake_case

5. **src/controllers/fraud-detection.controller.ts**
   - Fix: `prisma.couponFraudDetection` → `prisma.coupon_fraud_detection`

6. **src/controllers/social-auth.controller.ts**
   - Fix ALL: `prisma.user.` → `prisma.users.`

7. **src/db/seed.ts** - ~60 errors
   - Fix ALL model names per mapping above
   - Fix ALL `displayName` → `display_name`

---

## Automated Fix Script (PowerShell)

Save this as `fix-prisma-names.ps1` and run from backend directory:

```powershell
# PowerShell script to fix Prisma model names
$fixes = @{
    'prisma\.user\.findUnique' = 'prisma.users.findUnique'
    'prisma\.user\.findMany' = 'prisma.users.findMany'
    'prisma\.user\.update' = 'prisma.users.update'
    'prisma\.user\.create' = 'prisma.users.create'
    'prisma\.user\.delete' = 'prisma.users.delete'
    'prisma\.user\.count' = 'prisma.users.count'

    'prisma\.coupons' = 'prisma.coupon'
    'prisma\.coupon_redemptions' = 'prisma.coupon_redemption'
    'prisma\.coupon_usage_limits' = 'prisma.coupon_usage_limit'
    'prisma\.couponFraudDetection' = 'prisma.coupon_fraud_detection'

    'prisma\.subscription\.findUnique' = 'prisma.subscriptions.findUnique'
    'prisma\.subscription\.findMany' = 'prisma.subscriptions.findMany'
    'prisma\.subscription\.create' = 'prisma.subscriptions.create'
    'prisma\.subscription\.update' = 'prisma.subscriptions.update'

    'prisma\.credit\.findUnique' = 'prisma.credits.findUnique'
    'prisma\.credit\.findMany' = 'prisma.credits.findMany'
    'prisma\.credit\.create' = 'prisma.credits.create'

    'prisma\.download\.create' = 'prisma.downloads.create'
    'prisma\.download\.findMany' = 'prisma.downloads.findMany'
    'prisma\.feedback\.create' = 'prisma.feedbacks.create'
    'prisma\.feedback\.findMany' = 'prisma.feedbacks.findMany'
    'prisma\.diagnostic\.create' = 'prisma.diagnostics.create'
    'prisma\.diagnostic\.findMany' = 'prisma.diagnostics.findMany'
    'prisma\.appVersion' = 'prisma.app_versions'
    'prisma\.oAuthClient' = 'prisma.oauth_clients'

    'prisma\.perpetual_licenses' = 'prisma.perpetual_license'
    'prisma\.license_activations' = 'prisma.license_activation'
    'prisma\.version_upgrades' = 'prisma.version_upgrade'
    'prisma\.credit_allocations' = 'prisma.credit_allocation'

    'prisma\.userRoleAssignment' = 'prisma.user_role_assignment'
    'prisma\.permissionOverride' = 'prisma.permission_override'
    'prisma\.modelProviderPricing' = 'prisma.model_provider_pricing'
}

Get-ChildItem -Path "src" -Recurse -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $modified = $false

    foreach ($find in $fixes.Keys) {
        $replace = $fixes[$find]
        if ($content -match $find) {
            $content = $content -replace $find, $replace
            $modified = $true
        }
    }

    if ($modified) {
        Set-Content -Path $_.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($_.FullName)"
    }
}

Write-Host "Done! Run 'npm run build' to verify."
```

---

## Verification Steps

After applying fixes:

1. **Run Build**
```bash
npm run build 2>&1 | tee build-verify.log
```

2. **Check Error Count**
```bash
grep "^src/" build-verify.log | wc -l
```

3. **Expected Result**: 0 errors (or <50 if minor issues remain)

---

## Quick Reference: Complete Model Mapping

**See**: `PRISMA_MODEL_MAPPING.md` for the authoritative 52-model reference table.

**Key Takeaway**:
- ✅ PLURAL models: users, subscriptions, models, credits, downloads, feedbacks, diagnostics
- ✅ SINGULAR models: coupon, coupon_redemption, coupon_usage_limit, permission, role, token_usage_ledger, perpetual_license

---

**Last Updated**: 2025-11-16
**Status**: Ready for implementation
