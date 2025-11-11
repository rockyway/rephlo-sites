# Plan 110 Integration Architecture

**Document**: 020-plan-110-integration-architecture.md
**Plan**: Plan 110 - Perpetual Licensing & Proration System
**Date**: 2025-11-09
**Integration**: Plans 109 (Subscription Monetization) + Plan 112 (Token-to-Credit Conversion)

---

## Overview

This document details how Plan 110 (Perpetual Licensing & Proration System) integrates with existing Plans 109 and 112 to create a unified monetization ecosystem.

## Database Schema Integration

### Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLAN 109: SUBSCRIPTION MONETIZATION             │
├─────────────────────────────────────────────────────────────────────────┤
│  users                                                                  │
│  ├─ subscription_monetization (user subscriptions)                     │
│  │  ├─ credit_allocation (monthly credit grants)                       │
│  │  ├─ billing_invoice (Stripe invoices)                               │
│  │  ├─ payment_transaction (Stripe payments)                           │
│  │  ├─ dunning_attempt (payment retries)                               │
│  │  └─ proration_event ← NEW (Plan 110)                                │
│  │                                                                       │
│  └─ perpetual_license ← NEW (Plan 110)                                  │
│     ├─ license_activation (device tracking)                            │
│     └─ version_upgrade (major version upgrades)                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   PLAN 112: TOKEN-TO-CREDIT CONVERSION                  │
├─────────────────────────────────────────────────────────────────────────┤
│  user_credit_balance                                                    │
│  ├─ token_usage_ledger (tracks API usage)                              │
│  └─ credit_transaction_log (audit trail)                               │
│                                                                           │
│  BYOK Mode: Perpetual licenses bypass credit deduction                  │
│  (Plan 110 + Plan 112 integration)                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Foreign Key Relationships

| Table | Foreign Key | References | On Delete | Notes |
|-------|-------------|------------|-----------|-------|
| `perpetual_license` | `user_id` | `users.id` | CASCADE | GDPR compliance |
| `license_activation` | `license_id` | `perpetual_license.id` | CASCADE | Device activation |
| `license_activation` | `user_id` | `users.id` | CASCADE | User tracking |
| `version_upgrade` | `license_id` | `perpetual_license.id` | CASCADE | Upgrade tracking |
| `version_upgrade` | `user_id` | `users.id` | CASCADE | User tracking |
| `proration_event` | `user_id` | `users.id` | CASCADE | User tracking |
| `proration_event` | `subscription_id` | `subscription_monetization.id` | CASCADE | Tier change tracking |

## User Subscription Lifecycle

### Scenario 1: New User → Free Tier → Perpetual License

```
1. User signs up (Plan 109)
   └─ Create User record
   └─ Create SubscriptionMonetization (tier: 'free')
   └─ Create CreditAllocation (2000 free credits/month)

2. User purchases perpetual license (Plan 110)
   └─ Create PerpetualLicense (purchasePrice: $199, version: '1.0.0')
   └─ User activates desktop app
      └─ Create LicenseActivation (device fingerprint)

3. User switches to BYOK mode (Plan 112)
   └─ Desktop app bypasses cloud API
   └─ No credit deductions
   └─ Analytics still tracked in token_usage_ledger (Plan 112)
```

### Scenario 2: Pro User → Pro Max (Mid-Cycle Upgrade with Proration)

```
1. User starts Pro subscription (Plan 109)
   └─ SubscriptionMonetization (tier: 'pro', basePriceUsd: $19/month)
   └─ CreditAllocation (20000 credits/month)
   └─ BillingInvoice ($19, period: Nov 1 - Dec 1)

2. User upgrades to Pro Max on Nov 15 (Plan 110 Proration)
   └─ Calculate proration:
      - Days remaining: 15 (Nov 15 - Dec 1)
      - Days in cycle: 30
      - Unused credit value: (15/30) × $19 = $9.50
      - New tier cost: (15/30) × $49 = $24.50
      - Net charge: $24.50 - $9.50 = $15.00

   └─ Create ProrationEvent:
      - fromTier: 'pro'
      - toTier: 'pro_max'
      - netChargeUsd: $15.00
      - status: 'pending'

   └─ Update SubscriptionMonetization:
      - tier: 'pro_max'
      - basePriceUsd: $49
      - monthlyCreditAllocation: 60000

   └─ Create Stripe invoice for $15 prorated charge
   └─ Update ProrationEvent status: 'applied'

   └─ Create CreditAllocation (60000 credits for new tier)
```

### Scenario 3: Perpetual User → Major Version Upgrade

```
1. User owns perpetual license for v1.x (Plan 110)
   └─ PerpetualLicense (purchasedVersion: '1.0.0', eligibleUntilVersion: '1.99.99')
   └─ Free updates to all v1.x releases (1.1.0, 1.2.0, ..., 1.9.5)

2. v2.0.0 released, user wants to upgrade
   └─ Desktop app detects new major version
   └─ Prompt user: "Upgrade to v2.0.0 for $99"

   └─ User pays for upgrade:
      - Create VersionUpgrade:
         - fromVersion: '1.9.5'
         - toVersion: '2.0.0'
         - upgradePriceUsd: $99
         - stripePaymentIntentId: 'pi_xxx'
         - status: 'pending'

      - Stripe payment succeeds:
         - Update VersionUpgrade status: 'completed'

      - Update PerpetualLicense:
         - eligibleUntilVersion: '2.99.99' (now eligible for all v2.x)
```

## Proration Calculation Logic

### Formula

```typescript
interface ProrationCalculation {
  fromTier: string;
  toTier: string;
  daysRemaining: number;
  daysInCycle: number;
  oldTierPrice: number;
  newTierPrice: number;
}

function calculateProration(input: ProrationCalculation) {
  const { daysRemaining, daysInCycle, oldTierPrice, newTierPrice } = input;

  const unusedCreditValue = (daysRemaining / daysInCycle) * oldTierPrice;
  const newTierProratedCost = (daysRemaining / daysInCycle) * newTierPrice;
  const netCharge = newTierProratedCost - unusedCreditValue;

  return {
    unusedCreditValueUsd: parseFloat(unusedCreditValue.toFixed(2)),
    newTierProratedCostUsd: parseFloat(newTierProratedCost.toFixed(2)),
    netChargeUsd: parseFloat(netCharge.toFixed(2)),
  };
}
```

### Example: Pro → Pro Max (Mid-Cycle)

```typescript
const proration = calculateProration({
  fromTier: 'pro',
  toTier: 'pro_max',
  daysRemaining: 15,
  daysInCycle: 30,
  oldTierPrice: 19.00,
  newTierPrice: 49.00,
});

// Result:
// {
//   unusedCreditValueUsd: 9.50,   // (15/30) × $19
//   newTierProratedCostUsd: 24.50, // (15/30) × $49
//   netChargeUsd: 15.00            // $24.50 - $9.50
// }
```

### Stripe Integration

```typescript
async function applyProrationToStripe(proration: ProrationEvent, subscription: SubscriptionMonetization) {
  // 1. Create Stripe invoice item for proration
  const invoiceItem = await stripe.invoiceItems.create({
    customer: subscription.stripeCustomerId,
    amount: Math.round(proration.netChargeUsd * 100), // Convert to cents
    currency: 'usd',
    description: `Proration: ${proration.fromTier} → ${proration.toTier}`,
  });

  // 2. Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: subscription.stripeCustomerId,
    auto_advance: true, // Auto-charge
  });

  await stripe.invoices.finalizeInvoice(invoice.id);

  // 3. Update proration event
  await prisma.prorationEvent.update({
    where: { id: proration.id },
    data: {
      stripeInvoiceId: invoice.id,
      status: 'applied',
    },
  });

  return invoice;
}
```

## BYOK Mode Integration (Plan 110 + Plan 112)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUD MODE (Plans 109 + 112)                │
├─────────────────────────────────────────────────────────────────────┤
│  Desktop App                                                        │
│    ↓ LLM Request                                                    │
│  Rephlo API (Cloud)                                                │
│    ↓ Forward to OpenAI/Anthropic                                   │
│  LLM Provider                                                       │
│    ↓ Response                                                       │
│  Rephlo API                                                        │
│    ├─ Deduct credits (Plan 112: token_usage_ledger)               │
│    └─ Return response to Desktop App                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   BYOK MODE (Perpetual License - Plan 110)         │
├─────────────────────────────────────────────────────────────────────┤
│  Desktop App                                                        │
│    ├─ User configures own API key (OpenAI/Anthropic)              │
│    └─ LLM Request                                                   │
│       ↓ Direct to LLM Provider (bypass Rephlo API)                │
│  OpenAI/Anthropic API                                              │
│    ↓ Response                                                       │
│  Desktop App                                                        │
│    ├─ No credit deduction (uses user's own key)                   │
│    └─ Analytics tracked locally                                    │
│       └─ Optional: Send anonymized metrics to Rephlo              │
└─────────────────────────────────────────────────────────────────────┘
```

### Credit Deduction Logic

```typescript
async function deductCreditsForLLMRequest(userId: string, tokens: number, modelId: string) {
  // 1. Check if user has perpetual license in BYOK mode
  const perpetualLicense = await prisma.perpetualLicense.findFirst({
    where: {
      userId,
      status: 'active',
    },
  });

  if (perpetualLicense) {
    // BYOK mode: No credit deduction
    // Log usage for analytics only
    await prisma.tokenUsageLedger.create({
      data: {
        userId,
        modelId,
        tokensUsed: tokens,
        creditDeducted: 0, // No deduction
        byokMode: true,
        createdAt: new Date(),
      },
    });

    return { deducted: false, creditsRemaining: Infinity };
  }

  // Cloud mode: Deduct credits (Plan 112 logic)
  const creditBalance = await prisma.userCreditBalance.findUnique({
    where: { userId },
  });

  if (!creditBalance || creditBalance.balance < tokens) {
    throw new Error('Insufficient credits');
  }

  await prisma.userCreditBalance.update({
    where: { userId },
    data: { balance: { decrement: tokens } },
  });

  await prisma.tokenUsageLedger.create({
    data: {
      userId,
      modelId,
      tokensUsed: tokens,
      creditDeducted: tokens,
      byokMode: false,
      createdAt: new Date(),
    },
  });

  return { deducted: true, creditsRemaining: creditBalance.balance - tokens };
}
```

## Version Eligibility Logic (SemVer)

### SemVer Comparison

```typescript
import semver from 'semver';

function isVersionEligible(purchasedVersion: string, eligibleUntilVersion: string, requestedVersion: string): boolean {
  // Example:
  // purchasedVersion: "1.0.0"
  // eligibleUntilVersion: "1.99.99"
  // requestedVersion: "1.5.2" → TRUE (within v1.x)
  // requestedVersion: "2.0.0" → FALSE (requires upgrade)

  const isPurchasedValid = semver.valid(purchasedVersion);
  const isEligibleValid = semver.valid(eligibleUntilVersion);
  const isRequestedValid = semver.valid(requestedVersion);

  if (!isPurchasedValid || !isEligibleValid || !isRequestedValid) {
    throw new Error('Invalid version format. Use SemVer (e.g., "1.0.0")');
  }

  // Check if requested version is within eligible range
  return semver.lte(requestedVersion, eligibleUntilVersion);
}

// Usage
const eligible = isVersionEligible('1.0.0', '1.99.99', '1.5.2'); // true
const needsUpgrade = isVersionEligible('1.0.0', '1.99.99', '2.0.0'); // false
```

### Desktop App Update Flow

```typescript
async function checkForUpdates(licenseKey: string, currentVersion: string) {
  // 1. Fetch latest release from backend
  const latestRelease = await fetch('/api/releases/latest').then(r => r.json());
  const latestVersion = latestRelease.version; // e.g., "2.0.0"

  // 2. Fetch license info
  const license = await fetch(`/api/licenses/${licenseKey}`).then(r => r.json());

  // 3. Check eligibility
  if (isVersionEligible(license.purchasedVersion, license.eligibleUntilVersion, latestVersion)) {
    // Free update available
    return {
      updateAvailable: true,
      isFree: true,
      version: latestVersion,
      downloadUrl: latestRelease.downloadUrl,
    };
  } else {
    // Major version upgrade required
    const majorVersionDiff = semver.major(latestVersion) - semver.major(license.eligibleUntilVersion);
    const upgradePriceUsd = majorVersionDiff * 99; // $99 per major version

    return {
      updateAvailable: true,
      isFree: false,
      version: latestVersion,
      upgradePriceUsd,
      upgradeUrl: `/upgrade?from=${currentVersion}&to=${latestVersion}`,
    };
  }
}
```

## Tier Configuration Comparison

| Feature | Free | Pro | Pro Max | Enterprise Pro | Enterprise Max | Perpetual |
|---------|------|-----|---------|----------------|----------------|-----------|
| **Price** | $0 | $19/mo | $49/mo | $149/mo | $499/mo | $199 one-time |
| **Credits/Month** | 2,000 | 20,000 | 60,000 | 250,000 | 1,000,000 | 0 (BYOK) |
| **Cloud API** | Yes | Yes | Yes | Yes | Yes | No |
| **BYOK Mode** | No | No | No | No | No | Yes |
| **Offline Mode (Ollama)** | No | No | No | No | No | Yes |
| **Major Version Upgrades** | N/A | N/A | N/A | N/A | N/A | $99/upgrade |
| **Minor Version Upgrades** | N/A | N/A | N/A | N/A | N/A | Free |
| **Support Duration** | Community | Email | Priority | Dedicated | 24/7 | 12 months |

## Migration Paths

### Cloud → Perpetual

```typescript
async function migrateToPerpetual(userId: string, licenseKey: string) {
  // 1. User purchases perpetual license
  const perpetualLicense = await prisma.perpetualLicense.create({
    data: {
      userId,
      licenseKey,
      purchasePriceUsd: 199.00,
      purchasedVersion: '1.0.0',
      eligibleUntilVersion: '1.99.99',
      status: 'active',
    },
  });

  // 2. Cancel cloud subscription (optional)
  const subscription = await prisma.subscriptionMonetization.findFirst({
    where: { userId },
  });

  if (subscription) {
    // Option A: Keep subscription active (hybrid mode: cloud + BYOK)
    // Option B: Cancel subscription (full BYOK mode)
    await prisma.subscriptionMonetization.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Cancel Stripe subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  return perpetualLicense;
}
```

### Perpetual → Cloud (Upgrade)

```typescript
async function migrateToCloud(userId: string, targetTier: string) {
  // User with perpetual license wants cloud credits (hybrid mode)

  // 1. Find tier configuration
  const tierConfig = await prisma.subscriptionTierConfig.findUnique({
    where: { tierName: targetTier },
  });

  // 2. Create cloud subscription
  const subscription = await prisma.subscriptionMonetization.create({
    data: {
      userId,
      tier: targetTier,
      billingCycle: 'monthly',
      status: 'active',
      basePriceUsd: tierConfig.monthlyPriceUsd,
      monthlyCreditAllocation: tierConfig.monthlyCreditAllocation,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    },
  });

  // 3. Create Stripe subscription
  const stripeSubscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: stripePriceId }],
  });

  await prisma.subscriptionMonetization.update({
    where: { id: subscription.id },
    data: {
      stripeSubscriptionId: stripeSubscription.id,
    },
  });

  // 4. Allocate cloud credits
  await prisma.creditAllocation.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      amount: tierConfig.monthlyCreditAllocation,
      allocationPeriodStart: new Date(),
      allocationPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      source: 'subscription',
    },
  });

  return subscription;
}
```

## API Endpoints Summary

### Perpetual Licensing (Plan 110)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/licenses/activate` | POST | Activate license on a device |
| `/api/licenses/deactivate` | POST | Deactivate license from a device |
| `/api/licenses/:licenseKey` | GET | Get license details |
| `/api/licenses/:licenseKey/activations` | GET | List all device activations |
| `/api/licenses/:licenseKey/upgrade` | POST | Purchase major version upgrade |
| `/api/licenses/verify` | POST | Verify license validity |

### Proration (Plan 110)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscriptions/:id/upgrade` | POST | Upgrade tier (with proration) |
| `/api/subscriptions/:id/downgrade` | POST | Downgrade tier (with proration) |
| `/api/subscriptions/:id/proration-preview` | GET | Preview proration calculation |
| `/api/subscriptions/:id/proration-history` | GET | Get proration event history |

## Testing Strategy

### Unit Tests

- Proration calculation logic
- Version eligibility (SemVer)
- Machine fingerprinting (see `019-machine-fingerprinting-implementation.md`)

### Integration Tests

- License activation flow (3-device limit)
- Version upgrade payment flow
- Proration with Stripe invoice creation
- BYOK mode credit bypass

### End-to-End Tests

- User journey: Sign up → Buy perpetual → Activate 3 devices → Upgrade to v2.0
- User journey: Pro user → Upgrade to Pro Max mid-cycle → Verify proration charge
- User journey: Perpetual user → Configure BYOK → Verify no credit deduction

## Monitoring and Alerts

### Metrics to Track

```sql
-- Perpetual license adoption rate
SELECT
  COUNT(*) AS total_licenses,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_licenses,
  AVG(current_activations) AS avg_devices_per_license
FROM perpetual_license;

-- Version upgrade conversion rate
SELECT
  COUNT(DISTINCT license_id) AS licenses_eligible_for_v2,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS v2_upgrades_purchased,
  (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::FLOAT / COUNT(DISTINCT license_id)) AS conversion_rate
FROM version_upgrade
WHERE to_version LIKE '2.%';

-- Proration revenue
SELECT
  DATE_TRUNC('month', effective_date) AS month,
  SUM(net_charge_usd) AS total_proration_revenue
FROM proration_event
WHERE status = 'applied' AND net_charge_usd > 0
GROUP BY month
ORDER BY month DESC;
```

## Next Steps

1. Implement license activation endpoints
2. Build proration calculation service
3. Create admin dashboard for license management
4. Integrate Stripe webhooks for payment tracking
5. Add fraud detection for activation abuse
6. Implement version update checker in desktop app

---

**Related Documents**:
- `docs/plan/109-rephlo-desktop-monetization-moderation-plan.md`
- `docs/plan/110-perpetual-plan-and-proration-strategy.md`
- `docs/plan/115-master-orchestration-plan-109-110-111.md`
- `docs/reference/018-plan-109-subscription-schema-integration.md`
- `docs/reference/019-machine-fingerprinting-implementation.md`
- `backend/prisma/schema.prisma`
