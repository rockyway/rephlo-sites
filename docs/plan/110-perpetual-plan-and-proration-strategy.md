# Perpetual Plan & Subscription Proration Strategy

**Document ID**: 110
**Created**: 2025-11-08
**Status**: Planning
**Priority**: P0 (High)
**Parent Document**: [109-rephlo-desktop-monetization-moderation-plan.md](./109-rephlo-desktop-monetization-moderation-plan.md)
**Target Version**: v2.0.0

## Executive Summary

This document extends the Rephlo Desktop monetization strategy with a **Perpetual Plan** (one-time payment, bring-your-own-key model) and defines comprehensive proration logic for mid-cycle subscription changes. The Perpetual Plan offers users a privacy-focused, subscription-free alternative while maintaining recurring revenue opportunities through major version upgrades and optional cloud features.

## Table of Contents

1. [Perpetual Plan Overview](#perpetual-plan-overview)
2. [Updated Tier Structure](#updated-tier-structure)
3. [Perpetual Plan Features](#perpetual-plan-features)
4. [Pricing Strategy](#pricing-strategy)
5. [Version Upgrade Policy](#version-upgrade-policy)
6. [Migration Paths](#migration-paths)
7. [Proration Logic](#proration-logic)
8. [Database Schema Updates](#database-schema-updates)
9. [Admin Moderation Features](#admin-moderation-features)
10. [Implementation Details](#implementation-details)

---

## Perpetual Plan Overview

### Concept

**Perpetual Plan** is a one-time payment license that grants:
- ✅ **Perpetual access** to the current major version (v1.x.x, v2.x.x, etc.)
- ✅ **Free minor/patch upgrades** within the same major version
- ✅ **BYOK (Bring Your Own Key)** for all LLM providers
- ✅ **No monthly/annual fees**
- ✅ **Privacy-focused** - direct API calls from desktop, no cloud routing
- ✅ **Offline mode** support with Ollama
- ❌ **No cloud credits** included
- ❌ **No major version upgrades** (v1.x → v2.x requires new purchase or subscription)

### Target Audience

**Primary Users**:
- **Privacy advocates** - Want direct API control, no cloud intermediary
- **Power users** - Heavy usage, prefer BYOK economics
- **Enterprise security teams** - Require data sovereignty
- **One-time payment preference** - Dislike subscriptions
- **Existing API subscribers** - Already paying OpenAI/Anthropic directly

**Secondary Users**:
- **Developers/technical users** - Want full API control
- **Freelancers/agencies** - Resell services to clients
- **Educational institutions** - One-time budget allocation
- **International users** - Avoid recurring foreign transaction fees

### Value Proposition

**For Users**:
- Pay once, use forever (within major version)
- Potentially lower cost vs. subscription for heavy users
- Full API transparency and control
- No vendor lock-in for LLM providers
- Privacy and data sovereignty

**For Rephlo**:
- Upfront cash flow boost
- Attracts user segment that won't subscribe
- Major version upgrades drive recurring revenue
- Reduces cloud infrastructure costs
- Competitive differentiation

---

## Updated Tier Structure

### Complete 6-Tier Model

| Tier | Type | Price | Credits/Month | BYOK | Major Upgrades | Target |
|------|------|-------|---------------|------|----------------|--------|
| **Free** | Subscription | $0/mo | 2,000 | ❌ | Included | Trial users |
| **Perpetual** | One-time | **$199** | None (BYOK) | ✅ | Paid upgrade | Privacy users |
| **Pro** | Subscription | $19/mo | 20,000 | ❌ | Included | Professionals |
| **Pro Max** | Subscription | $49/mo | 60,000 | Optional | Included | Power users |
| **Enterprise Pro** | Subscription | $149/mo | 250,000 | Optional | Included | SMB teams |
| **Enterprise Max** | Subscription | Custom | Unlimited | Optional | Included | Large enterprise |

**Note**: Pro Max and Enterprise tiers can enable BYOK mode as an add-on feature while still using cloud credits.

---

## Perpetual Plan Features

### Feature Comparison

| Feature | Free | Perpetual | Pro | Pro Max | Enterprise Pro |
|---------|------|-----------|-----|---------|----------------|
| **Licensing** | Subscription | One-time | Subscription | Subscription | Subscription |
| **Price** | $0/mo | $199 once | $19/mo | $49/mo | $149/mo |
| **Cloud Credits** | 2,000/mo | None | 20,000/mo | 60,000/mo | 250,000/mo |
| **BYOK Mode** | ❌ | ✅ Always | ❌ | ✅ Add-on | ✅ Add-on |
| **LLM Providers** | Free tier only | All (with own keys) | Pro tier | All | All |
| **Model Access** | GPT-3.5-Turbo | All via BYOK | GPT-4, Claude 3.5 | All | All |
| **Command Templates** | 5 max | Unlimited | Unlimited | Unlimited | Unlimited |
| **Workspaces** | 1 | Unlimited | 5 | Unlimited | Unlimited |
| **Offline Mode (Ollama)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Support** | Community | Email (72hr) | Email (48hr) | Email + Chat (24hr) | Phone + Email (12hr) |
| **Minor Updates** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Major Updates (v2.0)** | ✅ | ❌ (pay $99) | ✅ | ✅ | ✅ |
| **Advanced Features*** | ❌ | Limited | ✅ | ✅ | ✅ |
| **Team Collaboration** | ❌ | ❌ | ❌ | Up to 3 | Unlimited |
| **Usage Analytics** | Basic | Local only | Cloud dashboard | Cloud + Export | Cloud + Custom |
| **API Rate Limits** | 10 req/min | No cloud limits | 30 req/min | 60 req/min | 120 req/min |
| **Priority Processing** | ❌ | N/A (direct) | ✅ | ✅✅ | ✅✅✅ |
| **Custom Integrations** | ❌ | ❌ | ❌ | ✅ | ✅✅ |
| **SSO/SAML** | ❌ | ❌ | ❌ | ❌ | ✅ |

**Advanced Features*** include: Custom LLM endpoints, bulk command execution, advanced keyboard shortcuts, export conversation history, etc.

### Perpetual Plan Limitations

**What's NOT Included**:
- ❌ **Cloud Credits** - User must provide their own API keys and pay LLM providers directly
- ❌ **Major Version Upgrades** - v1.x → v2.0 requires $99 upgrade fee or switch to subscription
- ❌ **Team Collaboration Features** - Single-user license only
- ❌ **Cloud Analytics Dashboard** - No usage tracking in Rephlo cloud (local logs only)
- ❌ **Priority Email/Chat Support** - Standard email support with 72-hour SLA (vs. 48hr for Pro)
- ❌ **Automatic Backups** - No cloud workspace sync
- ❌ **Beta/Early Access** - No access to experimental features

**What IS Included**:
- ✅ **All Core Features** - Text transformation, command templates, workspaces, hotkeys
- ✅ **BYOK for All Providers** - OpenAI, Anthropic, Google, Groq, custom endpoints
- ✅ **Unlimited Local Usage** - No credit limits, rate limits, or usage caps
- ✅ **Offline Mode** - Full Ollama support for local LLMs
- ✅ **Privacy & Data Sovereignty** - No cloud routing, direct API calls
- ✅ **Minor/Patch Updates** - Free v1.0.0 → v1.9.99 upgrades
- ✅ **Standard Support** - Email support with 72-hour response SLA
- ✅ **Local Analytics** - View usage stats locally (not synced to cloud)

---

## Pricing Strategy

### Perpetual Plan Pricing

**Base Price**: **$199 one-time payment**

**Pricing Rationale**:
- Equivalent to ~10 months of Pro subscription ($19 × 10 = $190)
- Break-even for Rephlo after 10 months (no support costs)
- Attractive for users planning 12+ month usage
- Lower than enterprise perpetual software (typically $500-2000)
- Competitive with similar tools (Grammarly Lifetime ~$200-300 when offered)

**Comparison to Subscription ROI**:

```
Perpetual Plan ($199 once):
- Year 1: $199 (upfront)
- Year 2: $0
- Year 3: $0
- 3-Year Total: $199

Pro Subscription ($19/month):
- Year 1: $228 ($19 × 12)
- Year 2: $228
- Year 3: $228
- 3-Year Total: $684

Savings: $684 - $199 = $485 (71% savings over 3 years)
```

**Note**: Subscription includes cloud credits worth ~$20-40/month in LLM API costs, so Perpetual users must factor in their own API costs.

### Major Version Upgrade Pricing

**Major Version Upgrade Fee**: **$99**

When v2.0.0 launches, Perpetual Plan users can:
1. **Pay $99 to upgrade** to Perpetual v2.0 (50% discount from new price)
2. **Stay on v1.x** and continue receiving minor updates (v1.9.x, v1.10.x, etc.)
3. **Switch to subscription** and get v2.0 access immediately (see migration section)

**Upgrade Incentives**:
- Early bird discount: $79 (first 30 days after v2.0 launch)
- Loyalty discount: $69 (users who purchased v1.0 within first year)
- Bundle discount: $149 for v2.0 Perpetual + 3 months Pro trial

### Competitive Positioning

| Product | Perpetual Option | Price | Limitations |
|---------|-----------------|-------|-------------|
| **Rephlo** | ✅ Yes | $199 | BYOK, no major upgrades |
| Grammarly | ❌ Discontinued | Was ~$200 | None (when offered) |
| Copilot | ❌ Subscription only | $10/mo | - |
| ChatGPT | ❌ Subscription only | $20/mo | - |
| Claude | ❌ Subscription only | $20/mo | - |
| Jasper | ❌ Subscription only | $39+/mo | - |
| **Sublime Text** | ✅ Yes | $99 | 3 years upgrades |
| **JetBrains IDEs** | ✅ Fallback license | $149+/yr | Perpetual after 12mo |
| **Sketch** | ✅ Yes (old model) | $99/yr | 1 year upgrades |

**Market Gap**: Most modern SaaS tools don't offer perpetual licenses. This is a **competitive differentiator**.

---

## Version Upgrade Policy

### Semantic Versioning

Rephlo follows **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

**Examples**:
- `v1.0.0` → Initial v1 release
- `v1.0.1` → Bug fix (Patch)
- `v1.1.0` → New feature, backward compatible (Minor)
- `v2.0.0` → Breaking changes, major rewrite (Major)

### Perpetual License Upgrade Rights

**Included in Perpetual License** (Free):
- ✅ **Patch Updates** (v1.0.0 → v1.0.1, v1.0.2, etc.) - Bug fixes, security patches
- ✅ **Minor Updates** (v1.0.0 → v1.1.0, v1.2.0, etc.) - New features, improvements
- ✅ **All v1.x.x updates** - Until v2.0.0 launches

**Requires Paid Upgrade**:
- ❌ **Major Updates** (v1.x.x → v2.0.0) - Requires $99 upgrade fee or subscription

**Version Support Lifecycle**:
- **Active Development**: Latest major version (e.g., v2.x)
- **Maintenance Mode**: Previous major version (e.g., v1.x) - Security patches only for 12 months after v2.0 launch
- **End of Life (EOL)**: After 12 months of maintenance mode, no further updates

**Example Timeline**:
```
v1.0.0 Launch (Jan 2025):
├── v1.1.0 (Mar 2025) - Free for Perpetual
├── v1.2.0 (May 2025) - Free for Perpetual
├── v1.3.0 (Jul 2025) - Free for Perpetual
└── v2.0.0 Launch (Jan 2026):
    ├── v1.x enters Maintenance Mode (security patches only)
    ├── v2.0.0 requires $99 upgrade for Perpetual users
    └── v1.x EOL (Jan 2027) - 12 months after v2.0 launch
```

### Automatic Update Mechanism

**Perpetual License Update Flow**:

1. **Desktop app checks for updates** on startup or manually
2. **Update server validates license**:
   - Check license key validity
   - Check current version vs. available version
   - Check license upgrade rights
3. **If eligible** (patch/minor within same major version):
   - ✅ Download and install update automatically (or prompt user)
4. **If major version** (v1.x → v2.x):
   - ❌ Show upgrade prompt: "v2.0 available - Upgrade for $99 or switch to subscription"
   - Provide upgrade options in UI

**License Validation**:
```json
{
  "license_key": "REPHLO-PERP-XXXX-YYYY-ZZZZ",
  "license_type": "perpetual",
  "purchased_version": "1.0.0",
  "eligible_major_version": "1",
  "upgrade_eligibility": {
    "v1.x.x": true,
    "v2.x.x": false
  },
  "expires_at": null,
  "support_expires_at": "2026-01-15"
}
```

---

## Migration Paths

### Perpetual → Subscription Migration

**Scenario**: Perpetual Plan user wants to switch to Pro/Pro Max/Enterprise subscription.

**Migration Options**:

#### Option 1: Direct Migration (Recommended)
**User Action**: Subscribe to any tier (Pro, Pro Max, Enterprise)

**What Happens**:
1. **Immediate activation** of subscription tier
2. **Perpetual license remains valid** but inactive
   - Can reactivate if subscription cancels
   - Acts as "backup" license
3. **Prorated credit** for first month (optional):
   - If purchased Perpetual within last 12 months: $50 credit towards first year
   - Applied as discount on first invoice
4. **Access to cloud features** immediately
5. **Major version upgrades** now included

**Example**:
```
User: Purchased Perpetual v1.0 for $199 (3 months ago)
Action: Subscribes to Pro ($19/mo)
Benefit: Receives $50 credit → First 2.6 months at $19/mo = $50.14 value
Net Cost Year 1: ($19 × 12) - $50 = $178
```

**Database State**:
```typescript
User {
  perpetualLicense: {
    licenseKey: "REPHLO-PERP-XXXX",
    status: "inactive",  // Inactive but valid
    majorVersion: "1",
    canReactivate: true
  },
  subscription: {
    tier: "pro",
    status: "active",
    hasActiveLicense: false  // Using subscription, not license
  }
}
```

#### Option 2: Temporary Subscription (Trial/Limited)
**User Action**: User wants to try subscription features for 1-3 months

**What Happens**:
1. User can subscribe monthly (no annual commitment required)
2. Perpetual license "paused" during subscription
3. Can cancel subscription anytime and revert to Perpetual
4. No migration credit (shorter commitment)

**Use Case**: Try cloud features/team collaboration before committing

#### Option 3: Hybrid Mode (Pro Max/Enterprise Only)
**User Action**: User subscribes to Pro Max or Enterprise tier

**What Happens**:
1. User gets **both** subscription benefits + BYOK option
2. Can use cloud credits OR own API keys (switch per request)
3. Flexibility to reduce cloud usage costs
4. Perpetual license merged into subscription (not separate)

**Pricing**: No additional charge for BYOK mode in Pro Max/Enterprise

### Subscription → Perpetual Migration

**Scenario**: Pro/Pro Max subscriber wants to switch to Perpetual Plan.

**Why Users Might Downgrade**:
- Realized they prefer BYOK economics
- Want to eliminate recurring billing
- Privacy/security requirements changed
- Moving to heavy self-hosted usage

**Migration Options**:

#### Option 1: Purchase Perpetual License
**User Action**: Buy Perpetual license at full price ($199)

**What Happens**:
1. **Prorated refund** for unused subscription time (optional):
   - If annual subscription: Refund remaining months (minus 20% processing fee)
   - If monthly subscription: Refund current month prorated
2. **Subscription cancelled** at period end
3. **Perpetual license activated** immediately
4. **Cloud credit balance forfeited** (warn user before migration)

**Example**:
```
User: Pro Annual subscriber ($190/year), 6 months remaining
Action: Purchases Perpetual for $199
Refund: ($190 ÷ 12 × 6) × 0.8 = $76 (80% of $95)
Net Cost: $199 - $76 = $123
```

**Alternative**: **Discount Perpetual**
- Offer existing subscribers 30% discount: $199 → $139
- No refund, cleaner transaction
- Subscription ends immediately, license activates

#### Option 2: End-of-Subscription Purchase
**User Action**: User cancels subscription, then buys Perpetual

**What Happens**:
1. Subscription runs until period end
2. User enjoys 30-day grace period with loyalty discount
3. Purchase Perpetual at discounted rate: $179 (10% off)
4. Smooth transition, no refund complexity

---

## Proration Logic

### Mid-Cycle Subscription Changes

**Scenario Types**:
1. **Upgrade** (Pro → Pro Max, Pro Max → Enterprise)
2. **Downgrade** (Pro Max → Pro, Enterprise → Pro Max)
3. **Billing Interval Change** (Monthly → Annual, Annual → Monthly)
4. **Migration** (Perpetual → Subscription, Subscription → Perpetual)

### Proration Calculation Formula

**Stripe-Compatible Proration** (industry standard):

```typescript
function calculateProration(
  currentTier: SubscriptionTier,
  newTier: SubscriptionTier,
  billingInterval: 'monthly' | 'annual',
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  changeDate: Date
): ProrationResult {
  const daysInPeriod = (currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24);
  const daysRemaining = (currentPeriodEnd - changeDate) / (1000 * 60 * 60 * 24);
  const daysUsed = daysInPeriod - daysRemaining;

  // Current tier pricing
  const currentPrice = getTierPrice(currentTier, billingInterval);

  // New tier pricing
  const newPrice = getTierPrice(newTier, billingInterval);

  // Unused credit from current tier
  const unusedCredit = (daysRemaining / daysInPeriod) * currentPrice;

  // Cost for remaining period at new tier
  const newCost = (daysRemaining / daysInPeriod) * newPrice;

  // Proration amount (positive = charge, negative = credit)
  const prorationAmount = newCost - unusedCredit;

  return {
    unusedCredit,      // Refund from old tier
    newCost,           // Cost for new tier
    prorationAmount,   // Net charge/credit
    effectiveDate: changeDate,
    nextBillingDate: currentPeriodEnd
  };
}
```

### Proration Examples

#### Example 1: Upgrade (Pro → Pro Max)

**Scenario**:
- Current: Pro Monthly ($19/mo)
- New: Pro Max Monthly ($49/mo)
- Billing Cycle: Nov 1 - Nov 30 (30 days)
- Change Date: Nov 15 (15 days used, 15 days remaining)

**Calculation**:
```
Days in period: 30
Days remaining: 15
Days used: 15

Unused credit from Pro:
  = (15 days / 30 days) × $19
  = 0.5 × $19
  = $9.50

Cost for Pro Max (remaining 15 days):
  = (15 days / 30 days) × $49
  = 0.5 × $49
  = $24.50

Proration charge:
  = $24.50 - $9.50
  = $15.00

User is charged: $15.00 immediately
Next billing (Dec 1): $49.00 (full Pro Max price)
```

**User Experience**:
1. User clicks "Upgrade to Pro Max" on Nov 15
2. System shows preview: "You'll be charged $15.00 today for the upgrade. Your next billing on Dec 1 will be $49.00."
3. User confirms
4. Stripe charges $15.00 immediately
5. Credits allocated: 30,000 bonus credits (50% of 60,000 prorated for 15 days)
6. Dec 1: Regular $49.00 billing resumes

#### Example 2: Downgrade (Pro Max → Pro)

**Scenario**:
- Current: Pro Max Monthly ($49/mo)
- New: Pro Monthly ($19/mo)
- Billing Cycle: Nov 1 - Nov 30 (30 days)
- Change Date: Nov 10 (20 days remaining)

**Calculation**:
```
Days remaining: 20

Unused credit from Pro Max:
  = (20 days / 30 days) × $49
  = 0.667 × $49
  = $32.67

Cost for Pro (remaining 20 days):
  = (20 days / 30 days) × $19
  = 0.667 × $19
  = $12.67

Proration credit (refund):
  = $12.67 - $32.67
  = -$20.00 (negative = credit to user)

User receives: $20.00 credit applied to next invoice
Next billing (Dec 1): $19.00 - $20.00 = -$1.00 (free) + $1.00 carried to Jan
```

**User Experience**:
1. User clicks "Downgrade to Pro" on Nov 10
2. System shows: "You'll receive a $20.00 credit. Your next billing on Dec 1 will be free, with $1.00 credit remaining."
3. User confirms
4. Credits adjusted: 40,000 credits removed (200,000 → 20,000 base), usage history preserved
5. Dec 1: $19.00 billing - $20.00 credit = Free month + $1.00 carryover
6. Jan 1: $19.00 - $1.00 = $18.00

**Credit Handling on Downgrade**:
- **Unused cloud credits preserved** for 30 days (grace period)
- After 30 days: Credits reduced to new tier allocation
- User warned before downgrade: "You have 45,000 unused credits. Downgrading to Pro will reduce your balance to 20,000 after 30 days."

#### Example 3: Annual → Monthly Switch

**Scenario**:
- Current: Pro Annual ($190/year = $15.83/mo)
- New: Pro Monthly ($19/mo)
- Billing Cycle: Jan 1 - Dec 31 (365 days)
- Change Date: Apr 1 (90 days used, 275 days remaining)

**Calculation**:
```
Days remaining: 275

Unused credit from Annual:
  = (275 days / 365 days) × $190
  = 0.753 × $190
  = $143.07

User receives $143.07 credit
Next billing: Immediate switch to monthly ($19/mo)
Credit applied: $143.07 ÷ $19 = 7.5 months free

April 1: $0 (credit applied)
May 1: $0 (credit applied)
...
Nov 1: $0 (credit applied)
Dec 1: $9.47 charged (half month)
Jan 1: $19.00 (normal monthly billing resumes)
```

**User Experience**:
- User warned: "You have $143.07 credit remaining. Switching to monthly will give you 7.5 months free."
- User confirms
- Monthly billing activated with large credit balance
- Credits used until depleted

#### Example 4: Perpetual → Pro Subscription (Mid-Cycle)

**Scenario**:
- Current: Perpetual License (purchased 2 months ago for $199)
- New: Pro Monthly ($19/mo)
- Migration Credit: $50 (purchased within 12 months)

**Calculation**:
```
Subscription starts: Immediately
First month charge: $19.00 - $50.00 credit = -$31.00

Month 1: Free
Month 2: Free
Month 3: $7.00 charged ($50 - $19 - $19 = $12 remaining, then $19 - $12 = $7)
Month 4: $19.00 (normal billing)
```

**User Experience**:
1. User clicks "Switch to Pro Subscription"
2. System shows: "You'll receive a $50 migration credit. Your first 2 months are free, and month 3 is only $7.00."
3. Perpetual license marked "inactive" (can reactivate if subscription cancels)
4. Subscription activated immediately
5. Cloud credits allocated: 20,000 credits/month

---

## Database Schema Updates

### New Enums

```prisma
enum LicenseType {
  subscription
  perpetual

  @@map("license_type")
}

enum LicenseStatus {
  active
  inactive      // Subscription took over
  expired       // v1.x EOL reached
  suspended     // Payment issues
  revoked       // Fraud/abuse

  @@map("license_status")
}

enum ProrationEventType {
  upgrade
  downgrade
  interval_change
  migration
  cancellation

  @@map("proration_event_type")
}
```

### New Tables

#### PerpetualLicense Table

```prisma
model PerpetualLicense {
  id                  String        @id @default(uuid()) @db.Uuid
  userId              String        @map("user_id") @db.Uuid
  licenseKey          String        @unique @map("license_key") @db.VarChar(50)
  licenseType         LicenseType   @default(perpetual)
  status              LicenseStatus @default(active)

  // Version eligibility
  purchasedVersion    String        @map("purchased_version") @db.VarChar(20)  // e.g., "1.0.0"
  eligibleMajorVersion String       @map("eligible_major_version") @db.VarChar(10) // e.g., "1"

  // Upgrade tracking
  upgradedFromVersion String?       @map("upgraded_from_version") @db.VarChar(20)
  upgradedToVersion   String?       @map("upgraded_to_version") @db.VarChar(20)
  upgradeCount        Int           @default(0) @map("upgrade_count")

  // Payment tracking
  purchasePrice       Int           @map("purchase_price")  // in cents
  stripePaymentId     String?       @map("stripe_payment_id") @db.VarChar(255)

  // Dates
  purchasedAt         DateTime      @default(now()) @map("purchased_at")
  activatedAt         DateTime?     @map("activated_at")
  deactivatedAt       DateTime?     @map("deactivated_at")
  expiresAt           DateTime?     @map("expires_at")  // For v1.x EOL

  // Support
  supportExpiresAt    DateTime?     @map("support_expires_at")  // 1 year from purchase

  // Machine binding (optional, for license validation)
  boundMachineId      String?       @map("bound_machine_id") @db.VarChar(255)
  boundMachineName    String?       @map("bound_machine_name") @db.VarChar(255)
  maxActivations      Int           @default(3) @map("max_activations")
  activationCount     Int           @default(0) @map("activation_count")

  // Relations
  user              User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  upgradeHistory    LicenseUpgrade[]
  activations       LicenseActivation[]

  @@index([userId])
  @@index([status])
  @@index([licenseKey])
  @@index([purchasedAt])
  @@map("perpetual_licenses")
}
```

#### LicenseUpgrade Table

```prisma
model LicenseUpgrade {
  id                String   @id @default(uuid()) @db.Uuid
  licenseId         String   @map("license_id") @db.Uuid
  fromVersion       String   @map("from_version") @db.VarChar(20)
  toVersion         String   @map("to_version") @db.VarChar(20)
  upgradeType       String   @map("upgrade_type") @db.VarChar(20)  // "major" | "minor" | "patch"
  upgradeFee        Int      @default(0) @map("upgrade_fee")  // in cents, $0 for minor/patch
  stripePaymentId   String?  @map("stripe_payment_id") @db.VarChar(255)
  upgradedAt        DateTime @default(now()) @map("upgraded_at")

  // Relations
  license PerpetualLicense @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
  @@index([upgradedAt])
  @@map("license_upgrades")
}
```

#### LicenseActivation Table

```prisma
model LicenseActivation {
  id           String   @id @default(uuid()) @db.Uuid
  licenseId    String   @map("license_id") @db.Uuid
  machineId    String   @map("machine_id") @db.VarChar(255)
  machineName  String?  @map("machine_name") @db.VarChar(255)
  osVersion    String?  @map("os_version") @db.VarChar(100)
  appVersion   String   @map("app_version") @db.VarChar(20)
  activatedAt  DateTime @default(now()) @map("activated_at")
  lastSeenAt   DateTime @updatedAt @map("last_seen_at")
  deactivatedAt DateTime? @map("deactivated_at")

  // Relations
  license PerpetualLicense @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
  @@index([machineId])
  @@index([activatedAt])
  @@map("license_activations")
}
```

#### ProrationEvent Table

```prisma
model ProrationEvent {
  id                 String              @id @default(uuid()) @db.Uuid
  userId             String              @map("user_id") @db.Uuid
  subscriptionId     String              @map("subscription_id") @db.Uuid
  eventType          ProrationEventType

  // Tier change details
  fromTier           SubscriptionTier?   @map("from_tier")
  toTier             SubscriptionTier?   @map("to_tier")
  fromInterval       String?             @map("from_interval") @db.VarChar(20)
  toInterval         String?             @map("to_interval") @db.VarChar(20)

  // Proration calculation
  daysInPeriod       Int                 @map("days_in_period")
  daysUsed           Int                 @map("days_used")
  daysRemaining      Int                 @map("days_remaining")
  unusedCreditCents  Int                 @map("unused_credit_cents")
  newCostCents       Int                 @map("new_cost_cents")
  prorationAmountCents Int               @map("proration_amount_cents")  // Positive = charge, Negative = credit

  // Dates
  periodStart        DateTime            @map("period_start")
  periodEnd          DateTime            @map("period_end")
  changeDate         DateTime            @map("change_date")
  effectiveDate      DateTime            @map("effective_date")
  nextBillingDate    DateTime            @map("next_billing_date")

  // Stripe integration
  stripeInvoiceId    String?             @map("stripe_invoice_id") @db.VarChar(255)
  stripeProrationId  String?             @map("stripe_proration_id") @db.VarChar(255)

  createdAt          DateTime            @default(now()) @map("created_at")

  // Relations
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([subscriptionId])
  @@index([eventType])
  @@index([createdAt])
  @@map("proration_events")
}
```

### Modified Tables

#### User Table Updates

```prisma
model User {
  // ... existing fields ...

  // NEW FIELDS
  hasActivePerpetualLicense Boolean   @default(false) @map("has_active_perpetual_license")
  preferredBillingMode      String?   @default("subscription") @map("preferred_billing_mode")  // "subscription" | "perpetual"

  // NEW RELATIONS
  perpetualLicenses  PerpetualLicense[]
  prorationEvents    ProrationEvent[]
}
```

#### Subscription Table Updates

```prisma
model Subscription {
  // ... existing fields ...

  // NEW FIELDS
  migratedFromPerpetual Boolean   @default(false) @map("migrated_from_perpetual")
  migrationCreditCents  Int       @default(0) @map("migration_credit_cents")
  migrationCreditUsed   Int       @default(0) @map("migration_credit_used")

  // Proration tracking
  lastProrationDate     DateTime? @map("last_proration_date")
  pendingCreditCents    Int       @default(0) @map("pending_credit_cents")  // Credit balance from downgrades

  // NEW RELATIONS
  prorationEvents ProrationEvent[]
}
```

---

## Admin Moderation Features

### Perpetual License Management

#### Admin Dashboard - Perpetual Licenses

**New Admin Section**: `/admin/licenses`

**List View**:
- **Columns**: License Key, User, Version, Status, Purchased Date, Activations, Support Expires, Actions
- **Filters**: Status, Major Version, Purchase Date Range, Support Status
- **Search**: License key, user email, machine ID
- **Metrics Cards**:
  - Total Perpetual Licenses Sold
  - Active Licenses
  - Revenue from Perpetual Sales
  - Average Support Requests per License
  - Upgrade Conversion Rate (v1→v2)

**License Actions**:
- **View Details**: Full license info, activation history, upgrade history
- **Revoke License**: Permanent revocation (fraud/abuse)
- **Suspend License**: Temporary suspension (payment issues, policy violations)
- **Extend Support**: Add support months (customer success)
- **Force Upgrade Eligibility**: Grant v2.0 access (special cases)
- **Reset Activations**: Clear machine bindings (user request)
- **Merge Licenses**: Combine multiple licenses (consolidation)
- **Transfer License**: Transfer to different user (resale/gift)

#### License Validation Logs

**Track**:
- Every license validation attempt (desktop app startup)
- Version check results
- Upgrade eligibility checks
- Activation attempts
- Deactivation events

**Use Cases**:
- Detect piracy/sharing (excessive activations from different IPs)
- Monitor upgrade conversion (users checking v2.0 availability)
- Support troubleshooting (activation failures)

### Proration Management

#### Admin Dashboard - Proration Events

**New Admin Section**: `/admin/proration`

**List View**:
- **Columns**: Date, User, Event Type, From Tier, To Tier, Proration Amount, Status, Actions
- **Filters**: Event Type, Date Range, Tier Changes, Amount Range
- **Search**: User email, subscription ID, Stripe invoice ID

**Proration Actions**:
- **View Details**: Full proration calculation breakdown
- **Adjust Proration**: Manual adjustment (edge cases, customer success)
- **Reverse Proration**: Undo tier change and refund (within 7 days)
- **Apply Manual Credit**: Add extra credit (customer retention)

#### Proration Analytics

**Metrics**:
- Total Upgrade Revenue (proration charges)
- Total Downgrade Credits (refunds)
- Net Proration Revenue
- Average Time Between Tier Changes
- Churn Prevention Rate (downgrades that returned to upgrades)

**Charts**:
- Daily/Weekly proration events (line chart)
- Upgrade vs. Downgrade volume (bar chart)
- Tier migration heatmap (from→to matrix)

### Migration Tracking

**Track Conversions**:
- Perpetual → Subscription migrations
- Subscription → Perpetual migrations
- Upgrade paths (which tiers users move through)

**Success Metrics**:
- Perpetual to Subscription conversion rate
- Average time to convert
- LTV increase after migration
- Migration credit effectiveness (did it drive conversions?)

---

## Implementation Details

### Phase 1: Perpetual License Infrastructure (Week 1-2)

**Deliverables**:
- Database schema updates (PerpetualLicense, LicenseUpgrade, LicenseActivation tables)
- License key generation algorithm
- License validation service (API endpoint)
- Version eligibility logic
- Machine activation/deactivation logic

**Tasks**:
1. Create Prisma migrations for new tables
2. Implement license key generator (format: `REPHLO-PERP-XXXX-YYYY-ZZZZ`)
3. Build LicenseValidationService
4. Create `/api/licenses/validate` endpoint
5. Implement machine fingerprinting
6. Add activation limit enforcement
7. Unit tests for license logic

### Phase 2: Stripe Integration for One-Time Payments (Week 3)

**Deliverables**:
- Stripe Checkout integration for Perpetual Plan
- Payment success webhook handling
- License generation on payment success
- Email delivery of license key

**Tasks**:
1. Create Stripe Product for Perpetual Plan
2. Implement Checkout Session creation
3. Add webhook handler for `checkout.session.completed`
4. Generate license key on successful payment
5. Send license key via email (template)
6. Store payment record in database

### Phase 3: Desktop App License Activation (Week 4-5)

**Deliverables**:
- License activation UI in desktop app
- Machine ID generation
- License validation on app startup
- Offline license validation (grace period)
- Activation/deactivation flows

**Tasks**:
1. Add "Activate License" screen in desktop app
2. Implement machine ID generation (hardware hash)
3. Build license activation API client
4. Add license status indicator in UI
5. Implement offline grace period (7 days)
6. Build deactivation flow (user-initiated)
7. Handle activation limit errors

### Phase 4: Version Upgrade Logic (Week 6)

**Deliverables**:
- Auto-update mechanism with license validation
- Major version upgrade prompt
- Upgrade payment flow
- Version eligibility enforcement

**Tasks**:
1. Modify auto-updater to check license eligibility
2. Build upgrade eligibility API endpoint
3. Create v2.0 upgrade prompt UI
4. Implement upgrade payment flow (Stripe Checkout)
5. Update license eligibility on upgrade payment
6. Test v1.x → v2.0 upgrade path

### Phase 5: Proration Logic Implementation (Week 7-8)

**Deliverables**:
- Proration calculation service
- Stripe proration integration
- Mid-cycle tier change flows
- Proration preview UI
- Event tracking

**Tasks**:
1. Implement ProrationService with calculation logic
2. Integrate with Stripe proration API
3. Build tier change preview endpoint
4. Add proration preview in UI (before confirmation)
5. Create ProrationEvent records on changes
6. Handle credit balance tracking
7. Integration tests for all proration scenarios

### Phase 6: Migration Paths (Week 9)

**Deliverables**:
- Perpetual → Subscription migration flow
- Subscription → Perpetual migration flow
- Migration credit logic
- Hybrid mode (BYOK + subscription)

**Tasks**:
1. Build migration eligibility checker
2. Implement migration credit calculation
3. Create migration confirmation UI
4. Handle license status changes (active→inactive)
5. Add "Reactivate License" option (subscription cancel)
6. Test all migration scenarios

### Phase 7: Admin Moderation UI (Week 10-11)

**Deliverables**:
- Perpetual license management page
- Proration events viewer
- License validation logs
- Migration analytics

**Tasks**:
1. Create /admin/licenses page
2. Build license list/details views
3. Implement license actions (revoke, suspend, etc.)
4. Create /admin/proration page
5. Build proration event viewer
6. Add migration analytics dashboard
7. Integration tests

### Phase 8: Testing & Launch (Week 12)

**Deliverables**:
- End-to-end testing all flows
- Beta testing with 50 users
- Documentation (user guides, FAQs)
- Support training
- Launch marketing

**Tasks**:
1. Comprehensive testing of all license scenarios
2. Beta program (50 early adopters)
3. Create user documentation for Perpetual Plan
4. Update FAQ with license questions
5. Train support team on license issues
6. Prepare launch announcement
7. Launch Perpetual Plan option

**Total Implementation Time**: 12 weeks (~3 months)

---

## Risk Mitigation

### Potential Risks

**Risk 1: Cannibalization of Subscriptions**
- **Concern**: Users prefer one-time payment over subscriptions, reducing MRR
- **Mitigation**:
  - Price Perpetual high enough ($199 = 10 months Pro)
  - Limited features (no cloud credits, team collaboration)
  - Marketing focus on subscription benefits
  - Target different user segments

**Risk 2: License Piracy/Sharing**
- **Concern**: License keys shared or resold
- **Mitigation**:
  - Machine activation limits (3 devices max)
  - Online validation required (7-day grace period)
  - Machine fingerprinting
  - Monitoring for suspicious activation patterns
  - Legal terms prohibit sharing

**Risk 3: Support Burden**
- **Concern**: Perpetual users demand infinite support
- **Mitigation**:
  - 1-year support window from purchase
  - After 1 year: Community support only
  - Clear communication in terms
  - Upgrade to subscription for continued support

**Risk 4: Version 2.0 Upgrade Resistance**
- **Concern**: Users stay on v1.x indefinitely, no upgrade revenue
- **Mitigation**:
  - 12-month EOL for v1.x after v2.0 launch
  - Security patches only during maintenance
  - v2.0 exclusive features heavily marketed
  - Early bird upgrade discounts ($79 vs $99)
  - Bundle offers (v2.0 license + 3mo Pro trial = $149)

**Risk 5: Complex Proration Edge Cases**
- **Concern**: Edge cases in proration logic cause billing issues
- **Mitigation**:
  - Comprehensive unit tests (100+ scenarios)
  - Preview UI shows exact charges before change
  - Manual admin override capability
  - Grace period for reversing changes (7 days)
  - Clear user communication at every step

---

## Success Metrics

### Perpetual Plan KPIs

**Sales Metrics**:
- **Perpetual Sales Volume**: Target 200 licenses in Year 1
- **Perpetual Revenue**: Target $39,800 (200 × $199)
- **Subscription Mix**: Target 80% subscription, 20% perpetual
- **Upgrade Conversion (v1→v2)**: Target 40% of v1 Perpetual users upgrade to v2
- **Perpetual→Subscription Migration**: Target 15% convert to subscription within 12 months

**Support Metrics**:
- **Support Tickets per Perpetual User**: Target < 2 per year (vs. 0.5 for subscription)
- **License Activation Failures**: Target < 5%
- **License Sharing Detection**: Monitor, target 0 detected cases

**Proration Metrics**:
- **Upgrade Rate**: Target 20% of users upgrade tier within 6 months
- **Downgrade Rate**: Target < 10% of users downgrade
- **Net Proration Revenue**: Target +$5k/month (more upgrades than downgrades)
- **Proration Disputes**: Target < 1% require manual intervention

---

## Conclusion

The Perpetual Plan and comprehensive proration strategy provide:

**For Users**:
- ✅ Flexibility in payment models (subscription vs. one-time)
- ✅ Privacy and data sovereignty (BYOK)
- ✅ Transparent pricing with no surprises
- ✅ Easy upgrade/downgrade paths

**For Rephlo**:
- ✅ Upfront cash flow from Perpetual sales
- ✅ Differentiation in crowded AI tools market
- ✅ Recurring revenue from major version upgrades
- ✅ Reduced churn (migration paths keep users in ecosystem)
- ✅ Appeal to broader user segments

**Next Steps**: Proceed with Phase 1 implementation after approval.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Next Review**: 2025-11-15
**Owner**: Product Team
**Contributors**: Engineering, Finance, Legal
