# Cross-Plan Entity-Relationship Diagram

**Document ID**: 023-cross-plan-entity-relationship-diagram.md
**Version**: 1.0
**Created**: 2025-11-09
**Related**: docs/analysis/022-cross-plan-schema-validation-report.md

---

## Complete Integration Architecture

This diagram shows the complete database schema across Plans 109, 110, 111, and 112.

### Legend
- `[E]` = Existing in Prisma schema
- `[M]` = Missing from Prisma schema (Plan 112 only)
- `→` = Foreign Key relationship
- `⇄` = Bidirectional relationship

---

## Master Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             CORE TABLES                                 │
└─────────────────────────────────────────────────────────────────────────┘

[E] User (users)
  id: UUID (PK)
  email: VARCHAR(255) UNIQUE
  role: VARCHAR(20) (user, admin)
  createdAt: TIMESTAMP
  ├─ Relations:
  │  ├─ 1:N subscription_monetization (Plan 109)
  │  ├─ 1:N credit_allocation (Plan 109)
  │  ├─ 1:N billing_invoice (Plan 109)
  │  ├─ 1:N payment_transaction (Plan 109)
  │  ├─ 1:N perpetual_license (Plan 110)
  │  ├─ 1:N license_activation (Plan 110)
  │  ├─ 1:N version_upgrade (Plan 110)
  │  ├─ 1:N proration_event (Plan 110)
  │  ├─ 1:N coupon_redemption (Plan 111)
  │  ├─ 1:1 user_credit_balance [M] (Plan 112)
  │  ├─ 1:N user_credit_source [M] (Plan 112)
  │  ├─ 1:N token_usage_ledger [M] (Plan 112)
  │  └─ 1:N credit_deduction_ledger [M] (Plan 112)


┌─────────────────────────────────────────────────────────────────────────┐
│                   PLAN 109: SUBSCRIPTION MONETIZATION                   │
└─────────────────────────────────────────────────────────────────────────┘

[E] subscription_monetization
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  tier: VARCHAR(50) (free, pro, pro_max, enterprise_pro, enterprise_max, perpetual)
  billingCycle: VARCHAR(20) (monthly, annual, lifetime)
  status: VARCHAR(20) (trial, active, past_due, cancelled, expired)
  basePriceUsd: DECIMAL(10,2)
  monthlyCreditAllocation: INT
  stripeCustomerId: VARCHAR(255) UNIQUE
  stripeSubscriptionId: VARCHAR(255) UNIQUE
  currentPeriodStart: TIMESTAMP
  currentPeriodEnd: TIMESTAMP
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ 1:N credit_allocation
  │  ├─ 1:N billing_invoice
  │  ├─ 1:N payment_transaction
  │  ├─ 1:N dunning_attempt
  │  ├─ 1:N proration_event (Plan 110)
  │  └─ 1:N coupon_redemption (Plan 111)
  └─ Indexes:
     ├─ userId
     ├─ status
     ├─ tier
     ├─ currentPeriodEnd
     ├─ stripeCustomerId
     └─ stripeSubscriptionId

     ↓ 1:N

[E] credit_allocation
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  subscriptionId: UUID (FK → subscription_monetization.id) ON DELETE SET NULL
  amount: INT
  source: VARCHAR(50) (subscription, bonus, admin_grant, referral, coupon)
  allocationPeriodStart: TIMESTAMP
  allocationPeriodEnd: TIMESTAMP
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ N:1 subscription_monetization (subscriptionId, nullable)
  │  └─ ⚠️ MISSING: Should update user_credit_balance [M] (Plan 112)
  └─ Indexes:
     ├─ userId
     ├─ subscriptionId
     ├─ [allocationPeriodStart, allocationPeriodEnd]
     └─ source

     ↓ 1:N

[E] billing_invoice
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  subscriptionId: UUID (FK → subscription_monetization.id) ON DELETE SET NULL
  stripeInvoiceId: VARCHAR(255) UNIQUE
  amountDue: DECIMAL(10,2)
  amountPaid: DECIMAL(10,2)
  status: VARCHAR(20) (draft, open, paid, void, uncollectible)
  periodStart: TIMESTAMP
  periodEnd: TIMESTAMP
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ N:1 subscription_monetization (subscriptionId, nullable)
  │  ├─ 1:N payment_transaction
  │  └─ 1:N dunning_attempt
  └─ Indexes:
     ├─ userId
     ├─ subscriptionId
     ├─ stripeInvoiceId
     ├─ status
     └─ [periodStart, periodEnd]

     ↓ 1:N

[E] payment_transaction
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  invoiceId: UUID (FK → billing_invoice.id) ON DELETE SET NULL
  subscriptionId: UUID (FK → subscription_monetization.id) ON DELETE SET NULL
  stripePaymentIntentId: VARCHAR(255) UNIQUE
  amount: DECIMAL(10,2)
  status: VARCHAR(20) (pending, succeeded, failed, cancelled, refunded)
  paymentMethodType: VARCHAR(50) (card, bank_account, paypal)
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ N:1 billing_invoice (invoiceId, nullable)
  │  └─ N:1 subscription_monetization (subscriptionId, nullable)
  └─ Indexes:
     ├─ userId
     ├─ invoiceId
     ├─ subscriptionId
     ├─ stripePaymentIntentId
     ├─ status
     └─ createdAt

[E] dunning_attempt
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  invoiceId: UUID (FK → billing_invoice.id) ON DELETE CASCADE
  subscriptionId: UUID (FK → subscription_monetization.id) ON DELETE SET NULL
  attemptNumber: INT
  scheduledAt: TIMESTAMP
  result: VARCHAR(20) (success, failed, pending, skipped)
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ N:1 billing_invoice (invoiceId)
  │  └─ N:1 subscription_monetization (subscriptionId, nullable)
  └─ Indexes:
     ├─ userId
     ├─ invoiceId
     ├─ subscriptionId
     ├─ scheduledAt
     └─ result

[E] subscription_tier_config
  id: UUID (PK)
  tierName: VARCHAR(50) UNIQUE (free, pro, pro_max, enterprise_pro, enterprise_max)
  monthlyPriceUsd: DECIMAL(10,2)
  annualPriceUsd: DECIMAL(10,2)
  monthlyCreditAllocation: INT
  maxCreditRollover: INT
  features: JSONB
  isActive: BOOLEAN


┌─────────────────────────────────────────────────────────────────────────┐
│                   PLAN 112: TOKEN-CREDIT CONVERSION                     │
│                           ⚠️ MISSING FROM PRISMA                        │
└─────────────────────────────────────────────────────────────────────────┘

[M] providers
  id: UUID (PK)
  name: VARCHAR(100) UNIQUE (OpenAI, Anthropic, Google, Azure OpenAI)
  apiType: VARCHAR(50) (openai, anthropic, google, azure)
  isEnabled: BOOLEAN
  ├─ Relations:
  │  ├─ 1:N model_provider_pricing
  │  ├─ 1:N pricing_configs
  │  └─ 1:N token_usage_ledger
  └─ Indexes:
     └─ isEnabled

     ↓ 1:N

[M] model_provider_pricing
  id: UUID (PK)
  providerId: UUID (FK → providers.id) ON DELETE CASCADE
  modelName: VARCHAR(255)
  vendorModelId: VARCHAR(255) UNIQUE
  inputPricePer1k: DECIMAL(10,8)
  outputPricePer1k: DECIMAL(10,8)
  cacheInputPricePer1k: DECIMAL(10,8) (nullable)
  cacheHitPricePer1k: DECIMAL(10,8) (nullable)
  effectiveFrom: TIMESTAMP
  effectiveUntil: TIMESTAMP (nullable)
  isActive: BOOLEAN
  ├─ Relations:
  │  └─ N:1 providers (providerId)
  └─ Indexes:
     ├─ [providerId, modelName, isActive]
     ├─ [effectiveFrom, effectiveUntil]
     └─ isActive

[M] pricing_configs
  id: UUID (PK)
  scopeType: VARCHAR(20) (tier, provider, model, combination)
  subscriptionTier: ENUM (nullable)
  providerId: UUID (FK → providers.id) ON DELETE CASCADE (nullable)
  modelId: VARCHAR(255) (nullable)
  marginMultiplier: DECIMAL(4,2) (e.g., 1.50 = 50% markup)
  targetGrossMarginPercent: DECIMAL(5,2)
  effectiveFrom: TIMESTAMP
  effectiveUntil: TIMESTAMP (nullable)
  approvalStatus: VARCHAR(20) (pending, approved, rejected)
  ├─ Relations:
  │  ├─ N:1 providers (providerId, nullable)
  │  ├─ N:1 User (createdBy)
  │  └─ N:1 User (approvedBy, nullable)
  └─ Indexes:
     ├─ scopeType
     ├─ [subscriptionTier, isActive]
     ├─ [providerId, isActive]
     └─ [isActive, effectiveFrom]

[M] user_credit_balance
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE UNIQUE
  amount: INT (current balance)
  lastDeductionAt: TIMESTAMP (nullable)
  lastDeductionAmount: INT (nullable)
  ├─ Relations:
  │  ├─ 1:1 User (userId)
  │  └─ ⚠️ MISSING LINK: Should be updated by credit_allocation (Plan 109)
  └─ Indexes:
     └─ userId

[M] user_credit_source
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  source: VARCHAR(50) (monthly_allocation, referral_reward, coupon_promotion)
  amount: INT
  expiresAt: TIMESTAMP (nullable)
  ├─ Relations:
  │  └─ N:1 User (userId)
  └─ Indexes:
     ├─ [userId, expiresAt]
     └─ source

[M] token_usage_ledger
  id: UUID (PK)
  requestId: UUID UNIQUE
  userId: UUID (FK → users.id) ON DELETE CASCADE
  subscriptionId: UUID (FK → subscription.id) (nullable)
  modelId: VARCHAR(255)
  providerId: UUID (FK → providers.id)
  inputTokens: INT
  outputTokens: INT
  cachedInputTokens: INT
  totalTokens: INT (GENERATED: input_tokens + output_tokens)
  vendorCost: DECIMAL(10,8)
  marginMultiplier: DECIMAL(4,2)
  creditValueUsd: DECIMAL(10,8)
  creditsDeducted: INT
  grossMarginUsd: DECIMAL(10,8) (GENERATED: credit_value_usd - vendor_cost)
  requestType: VARCHAR(20) (completion, streaming, batch)
  requestStartedAt: TIMESTAMP
  requestCompletedAt: TIMESTAMP
  status: VARCHAR(20) (success, failed, cancelled, rate_limited)
  deductionRecordId: UUID (FK → credit_deduction_ledger.id) (nullable)
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ N:1 Subscription (subscriptionId, nullable)
  │  ├─ N:1 providers (providerId)
  │  └─ N:1 credit_deduction_ledger (deductionRecordId, nullable)
  └─ Indexes:
     ├─ [userId, createdAt]
     ├─ [modelId, createdAt]
     ├─ [providerId, createdAt]
     ├─ [userId, vendorCost]
     ├─ requestId
     └─ status

[M] credit_deduction_ledger
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  amount: INT
  balanceBefore: INT
  balanceAfter: INT
  requestId: UUID UNIQUE (FK → token_usage_ledger.requestId) (nullable)
  tokenVendorCost: DECIMAL(10,8) (nullable)
  marginMultiplier: DECIMAL(4,2) (nullable)
  grossMargin: DECIMAL(10,8) (nullable)
  reason: VARCHAR(50) (api_completion, subscription_allocation, manual_adjustment)
  status: VARCHAR(20) (pending, completed, reversed)
  reversedAt: TIMESTAMP (nullable)
  reversedBy: UUID (FK → users.id) (nullable)
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ N:1 User (reversedBy, nullable)
  │  └─ 1:1 token_usage_ledger (via requestId)
  └─ Indexes:
     ├─ [userId, createdAt]
     ├─ requestId
     ├─ status
     └─ reason


┌─────────────────────────────────────────────────────────────────────────┐
│                   PLAN 110: PERPETUAL LICENSING                         │
└─────────────────────────────────────────────────────────────────────────┘

[E] perpetual_license
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  licenseKey: VARCHAR(50) UNIQUE (REPHLO-XXXX-XXXX-XXXX-XXXX)
  purchasePriceUsd: DECIMAL(10,2)
  purchasedVersion: VARCHAR(50) (SemVer: 1.0.0)
  eligibleUntilVersion: VARCHAR(50) (SemVer: 1.99.99)
  maxActivations: INT (default: 3)
  currentActivations: INT (default: 0)
  status: ENUM LicenseStatus (pending, active, suspended, revoked, expired)
  purchasedAt: TIMESTAMP
  activatedAt: TIMESTAMP (nullable)
  expiresAt: TIMESTAMP (nullable)
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  ├─ 1:N license_activation
  │  └─ 1:N version_upgrade
  ├─ ⚠️ MISSING FIELD: byokEnabled BOOLEAN (to track BYOK vs cloud mode)
  └─ Indexes:
     ├─ userId
     ├─ status
     ├─ licenseKey
     └─ purchasedAt

     ↓ 1:N

[E] license_activation
  id: UUID (PK)
  licenseId: UUID (FK → perpetual_license.id) ON DELETE CASCADE
  userId: UUID (FK → users.id) ON DELETE CASCADE
  machineFingerprint: VARCHAR(64) (SHA-256 hash)
  deviceName: VARCHAR(255) (nullable)
  osType: VARCHAR(50) (nullable) (Windows, macOS, Linux)
  osVersion: VARCHAR(100) (nullable)
  activatedAt: TIMESTAMP
  lastSeenAt: TIMESTAMP
  deactivatedAt: TIMESTAMP (nullable)
  status: ENUM ActivationStatus (active, deactivated, replaced)
  ├─ Relations:
  │  ├─ N:1 perpetual_license (licenseId)
  │  └─ N:1 User (userId)
  ├─ Unique:
  │  └─ [licenseId, machineFingerprint]
  └─ Indexes:
     ├─ licenseId
     ├─ userId
     ├─ machineFingerprint
     ├─ status
     └─ activatedAt

[E] version_upgrade
  id: UUID (PK)
  licenseId: UUID (FK → perpetual_license.id) ON DELETE CASCADE
  userId: UUID (FK → users.id) ON DELETE CASCADE
  fromVersion: VARCHAR(50) (SemVer: 1.9.5)
  toVersion: VARCHAR(50) (SemVer: 2.0.0)
  upgradePriceUsd: DECIMAL(10,2) ($99, $79, $69)
  stripePaymentIntentId: VARCHAR(255) UNIQUE (nullable)
  status: ENUM UpgradeStatus (pending, completed, failed, refunded)
  purchasedAt: TIMESTAMP
  ├─ Relations:
  │  ├─ N:1 perpetual_license (licenseId)
  │  └─ N:1 User (userId)
  └─ Indexes:
     ├─ licenseId
     ├─ userId
     ├─ [fromVersion, toVersion]
     ├─ status
     └─ purchasedAt

[E] proration_event
  id: UUID (PK)
  userId: UUID (FK → users.id) ON DELETE CASCADE
  subscriptionId: UUID (FK → subscription_monetization.id) ON DELETE CASCADE
  fromTier: VARCHAR(50) (nullable)
  toTier: VARCHAR(50) (nullable)
  changeType: ENUM ProrationChangeType (upgrade, downgrade, cancellation, reactivation)
  daysRemaining: INT
  daysInCycle: INT
  unusedCreditValueUsd: DECIMAL(10,2)
  newTierProratedCostUsd: DECIMAL(10,2)
  netChargeUsd: DECIMAL(10,2) (positive = charge, negative = credit)
  effectiveDate: TIMESTAMP
  stripeInvoiceId: VARCHAR(255) UNIQUE (nullable)
  status: ENUM ProrationStatus (pending, applied, failed, reversed)
  ├─ Relations:
  │  ├─ N:1 User (userId)
  │  └─ N:1 subscription_monetization (subscriptionId)
  └─ Indexes:
     ├─ userId
     ├─ subscriptionId
     ├─ changeType
     ├─ effectiveDate
     └─ status


┌─────────────────────────────────────────────────────────────────────────┐
│                   PLAN 111: COUPON & DISCOUNT SYSTEM                    │
└─────────────────────────────────────────────────────────────────────────┘

[E] coupon_campaign
  id: UUID (PK)
  campaignName: VARCHAR(255)
  campaignType: ENUM CampaignType (seasonal, win_back, referral, promotional, early_bird)
  startDate: TIMESTAMP
  endDate: TIMESTAMP
  budgetLimitUsd: DECIMAL(12,2)
  totalSpentUsd: DECIMAL(12,2) (default: 0)
  targetTier: ENUM SubscriptionTier (nullable)
  isActive: BOOLEAN
  createdBy: UUID (FK → users.id)
  ├─ Relations:
  │  ├─ 1:N coupon
  │  └─ 1:N campaign_coupon
  └─ Indexes:
     ├─ [campaignType, isActive]
     ├─ [startDate, endDate]
     └─ targetTier

     ↓ 1:N

[E] coupon
  id: UUID (PK)
  code: VARCHAR(50) UNIQUE (uppercase: BLACKFRIDAY25)
  couponType: ENUM CouponType (percentage_discount, fixed_amount_discount, tier_specific_discount, duration_bonus, byok_migration)
  discountValue: DECIMAL(10,2) (25.00 = 25% or $25)
  discountType: ENUM DiscountType (percentage, fixed_amount, credits, months_free)
  currency: VARCHAR(3) (default: usd)
  maxUses: INT (nullable, NULL = unlimited)
  maxUsesPerUser: INT (default: 1)
  minPurchaseAmount: DECIMAL(10,2) (nullable)
  tierEligibility: ENUM[] (default: [free, pro, enterprise])
  billingCycles: VARCHAR[] (default: [monthly, annual])
  validFrom: TIMESTAMP
  validUntil: TIMESTAMP
  isActive: BOOLEAN
  campaignId: UUID (FK → coupon_campaign.id) ON DELETE SET NULL (nullable)
  description: TEXT (nullable)
  createdBy: UUID (FK → users.id)
  ├─ Relations:
  │  ├─ N:1 coupon_campaign (campaignId, nullable)
  │  ├─ 1:N coupon_redemption
  │  ├─ 1:1 coupon_usage_limit
  │  ├─ 1:N coupon_validation_rule
  │  ├─ 1:N coupon_fraud_detection
  │  ├─ 1:N coupon_analytics_snapshot
  │  └─ 1:N campaign_coupon
  └─ Indexes:
     ├─ [code, isActive]
     ├─ [validFrom, validUntil, isActive]
     ├─ campaignId
     └─ couponType

     ↓ 1:N

[E] coupon_redemption
  id: UUID (PK)
  couponId: UUID (FK → coupon.id) ON DELETE CASCADE ⚠️ Should be SET NULL
  userId: UUID (FK → users.id) (no explicit FK in Prisma)
  subscriptionId: UUID (FK → subscription_monetization.id) ON DELETE SET NULL (nullable)
  redemptionDate: TIMESTAMP
  discountAppliedUsd: DECIMAL(10,2)
  originalAmountUsd: DECIMAL(10,2)
  finalAmountUsd: DECIMAL(10,2)
  redemptionStatus: ENUM RedemptionStatus (success, failed, reversed, pending)
  failureReason: TEXT (nullable)
  ipAddress: VARCHAR(45) (nullable)
  userAgent: TEXT (nullable)
  ├─ Relations:
  │  ├─ N:1 coupon (couponId)
  │  └─ N:1 subscription_monetization (subscriptionId, nullable)
  └─ Indexes:
     ├─ [couponId, userId, redemptionDate]
     ├─ userId
     ├─ subscriptionId
     ├─ redemptionStatus
     └─ redemptionDate

[E] campaign_coupon (Junction Table)
  id: UUID (PK)
  campaignId: UUID (FK → coupon_campaign.id) ON DELETE CASCADE
  couponId: UUID (FK → coupon.id) ON DELETE CASCADE
  ├─ Relations:
  │  ├─ N:1 coupon_campaign (campaignId)
  │  └─ N:1 coupon (couponId)
  ├─ Unique:
  │  └─ [campaignId, couponId]
  └─ Indexes:
     ├─ campaignId
     └─ couponId

[E] coupon_usage_limit
  id: UUID (PK)
  couponId: UUID (FK → coupon.id) ON DELETE CASCADE UNIQUE
  totalUses: INT (default: 0)
  uniqueUsers: INT (default: 0)
  totalDiscountAppliedUsd: DECIMAL(12,2) (default: 0)
  lastUsedAt: TIMESTAMP (nullable)
  ├─ Relations:
  │  └─ 1:1 coupon (couponId)
  └─ Indexes:
     ├─ totalUses
     └─ lastUsedAt

[E] coupon_fraud_detection
  id: UUID (PK)
  couponId: UUID (FK → coupon.id) ON DELETE CASCADE
  userId: UUID (no explicit FK in Prisma)
  detectionType: ENUM FraudDetectionType (velocity_abuse, ip_switching, bot_pattern, device_fingerprint_mismatch, stacking_abuse)
  severity: ENUM FraudSeverity (low, medium, high, critical)
  detectedAt: TIMESTAMP
  details: JSONB
  isFlagged: BOOLEAN (default: false)
  reviewedBy: UUID (FK → users.id) (nullable)
  reviewedAt: TIMESTAMP (nullable)
  resolution: TEXT (nullable)
  ├─ Relations:
  │  └─ N:1 coupon (couponId)
  └─ Indexes:
     ├─ [couponId, severity, isFlagged]
     ├─ userId
     ├─ detectionType
     └─ detectedAt

[E] coupon_validation_rule
  id: UUID (PK)
  couponId: UUID (FK → coupon.id) ON DELETE CASCADE
  ruleType: ENUM ValidationRuleType (first_time_user_only, specific_email_domain, minimum_credit_balance, exclude_refunded_users, require_payment_method)
  ruleValue: JSONB (configuration)
  isActive: BOOLEAN
  ├─ Relations:
  │  └─ N:1 coupon (couponId)
  └─ Indexes:
     └─ [couponId, ruleType, isActive]

[E] coupon_analytics_snapshot
  id: UUID (PK)
  snapshotDate: DATE UNIQUE
  totalCouponsActive: INT
  totalRedemptions: INT
  totalDiscountValueUsd: DECIMAL(12,2)
  avgDiscountPerRedemptionUsd: DECIMAL(10,2)
  topCouponCode: VARCHAR(50) (FK → coupon.code) (nullable)
  conversionRate: DECIMAL(5,2)
  ├─ Relations:
  │  └─ N:1 coupon (topCouponCode, nullable)
  └─ Indexes:
     └─ snapshotDate


┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAMS                              │
└─────────────────────────────────────────────────────────────────────────┘

### Flow 1: New Subscription → Credit Allocation (Plan 109 → Plan 112)

User signs up
    │
    ├─> [E] User (created)
    │
    ├─> [E] subscription_monetization (created)
    │      tier: "pro"
    │      monthlyCreditAllocation: 20000
    │
    ├─> [E] credit_allocation (created)
    │      amount: 20000
    │      source: "subscription"
    │
    └─> [M] user_credit_balance ❌ MISSING (should be created/updated)
           amount: 20000


### Flow 2: API Request → Token Usage → Credit Deduction (Plan 112)

User makes API request
    │
    ├─> [M] token_usage_ledger (created) ❌ MISSING
    │      inputTokens: 1000
    │      outputTokens: 2000
    │      vendorCost: $0.015
    │      creditsDeducted: 23 (with 1.5x multiplier)
    │
    ├─> [M] credit_deduction_ledger (created) ❌ MISSING
    │      amount: -23
    │      balanceBefore: 20000
    │      balanceAfter: 19977
    │
    └─> [M] user_credit_balance (updated) ❌ MISSING
           amount: 19977 (decreased by 23)


### Flow 3: Coupon Redemption → Subscription Discount (Plan 111 → Plan 109)

User applies coupon "BLACKFRIDAY25"
    │
    ├─> [E] coupon (validated)
    │      discountValue: 25.00
    │      discountType: "percentage"
    │
    ├─> [E] subscription_monetization (created with discount)
    │      basePriceUsd: $19.00
    │      finalAmount: $14.25 (25% off)
    │
    ├─> [E] coupon_redemption (created)
    │      discountAppliedUsd: $4.75
    │      originalAmountUsd: $19.00
    │      finalAmountUsd: $14.25
    │
    └─> [E] coupon_usage_limit (updated)
           totalUses: totalUses + 1
           totalDiscountAppliedUsd: totalDiscountAppliedUsd + 4.75


### Flow 4: Proration Event → Tier Upgrade (Plan 110 → Plan 109)

User upgrades Pro → Pro Max (mid-cycle)
    │
    ├─> [E] proration_event (created)
    │      fromTier: "pro"
    │      toTier: "pro_max"
    │      daysRemaining: 15
    │      daysInCycle: 30
    │      unusedCreditValueUsd: $9.50
    │      newTierProratedCostUsd: $19.50
    │      netChargeUsd: $10.00
    │
    ├─> [E] billing_invoice (created)
    │      amountDue: $10.00
    │
    ├─> [E] subscription_monetization (updated)
    │      tier: "pro_max"
    │      basePriceUsd: $39.00
    │      monthlyCreditAllocation: 50000
    │
    ├─> [E] credit_allocation (created for new allocation)
    │      amount: 25000 (prorated: 50000 * 15/30)
    │
    └─> [M] user_credit_balance (updated) ❌ MISSING
           amount: currentAmount + 25000


### Flow 5: BYOK Coupon → Perpetual License (Plan 111 → Plan 110)

User redeems "BYOK2025" coupon
    │
    ├─> [E] coupon (validated)
    │      couponType: "byok_migration"
    │      discountValue: 100.00 (100% off)
    │
    ├─> [E] perpetual_license (created)
    │      purchasePriceUsd: $0.00 (free via coupon)
    │      purchasedVersion: "1.0.0"
    │      eligibleUntilVersion: "1.99.99"
    │      ⚠️ MISSING FIELD: byokEnabled = true
    │
    ├─> [E] subscription_monetization (created for tracking)
    │      tier: "perpetual"
    │      basePriceUsd: $0.00
    │      monthlyCreditAllocation: 0 (BYOK = no cloud credits)
    │
    └─> [E] coupon_redemption (created)
           discountAppliedUsd: $199.00
           finalAmountUsd: $0.00


┌─────────────────────────────────────────────────────────────────────────┐
│                      CRITICAL INTEGRATION GAPS                          │
└─────────────────────────────────────────────────────────────────────────┘

1. ❌ Plan 112 tables completely missing from Prisma schema
   - user_credit_balance
   - token_usage_ledger
   - credit_deduction_ledger
   - providers
   - model_provider_pricing
   - pricing_configs
   - user_credit_source

2. ⚠️ credit_allocation has no FK to user_credit_balance
   - Cannot enforce referential integrity
   - Application must manually sync data

3. ⚠️ perpetual_license missing byokEnabled field
   - Cannot distinguish BYOK users from cloud users
   - token_usage_ledger should check this before deducting credits

4. ⚠️ coupon_redemption CASCADE on delete
   - Should be SET NULL to preserve redemption history
   - Current: DELETE coupon → DELETE all redemptions (data loss)

5. ⚠️ SubscriptionTier enum incomplete
   - Missing: pro_max, enterprise_pro, enterprise_max, perpetual
   - subscription_monetization uses VARCHAR instead of enum

6. ⚠️ SubscriptionStatus enum incomplete
   - Missing: trial, past_due
   - subscription_monetization uses VARCHAR instead of enum


┌─────────────────────────────────────────────────────────────────────────┐
│                         INDEX RECOMMENDATIONS                           │
└─────────────────────────────────────────────────────────────────────────┘

-- High Priority Indexes (Add immediately)

-- 1. Cross-plan query: User subscription + credit usage
CREATE INDEX idx_subscription_user_period_status
  ON subscription_monetization(user_id, current_period_end, status);

-- 2. Cross-plan query: Coupon redemptions by user
CREATE INDEX idx_coupon_redemption_user_status_date
  ON coupon_redemption(user_id, redemption_status, redemption_date);

-- 3. Cross-plan query: Proration events timeline
CREATE INDEX idx_proration_subscription_effective_status
  ON proration_event(subscription_id, effective_date, status);

-- 4. Cross-plan query: Unpaid invoices per user
CREATE INDEX idx_billing_invoice_user_status_period_end
  ON billing_invoice(user_id, status, period_end);

-- Plan 112 indexes (once tables added)

-- 5. Token usage by user and date
CREATE INDEX idx_token_usage_user_created
  ON token_usage_ledger(user_id, created_at DESC);

-- 6. Credit deduction history by user
CREATE INDEX idx_credit_deduction_user_created
  ON credit_deduction_ledger(user_id, created_at DESC);

-- 7. Active pricing configs
CREATE INDEX idx_pricing_config_tier_provider_active
  ON pricing_configs(subscription_tier, provider_id, is_active);


┌─────────────────────────────────────────────────────────────────────────┐
│                              SUMMARY                                    │
└─────────────────────────────────────────────────────────────────────────┘

Tables Implemented:
  ✅ Plan 109: 6/6 tables (100%)
  ✅ Plan 110: 4/4 tables (100%)
  ✅ Plan 111: 8/8 tables (100%)
  ❌ Plan 112: 0/9 tables (0%)

Total: 18/27 tables implemented (67%)

Foreign Keys:
  ✅ Plan 109 internal: 100%
  ✅ Plan 110 → Plan 109: 100%
  ✅ Plan 111 → Plan 109: 100%
  ❌ Plan 109 → Plan 112: 0% (tables missing)
  ❌ Plan 110 → Plan 112: 0% (tables missing)

Enums:
  ⚠️ SubscriptionTier: Incomplete (missing 4 values)
  ⚠️ SubscriptionStatus: Incomplete (missing 2 values)
  ✅ All Plan 111 enums: Complete

Integration Status: ⚠️ INCOMPLETE

Next Steps:
1. Add Plan 112 tables to Prisma schema (CRITICAL)
2. Fix enum definitions (CRITICAL)
3. Add User relations for Plan 112 (CRITICAL)
4. Generate and test migration (HIGH)
5. Add recommended indexes (HIGH)
6. Fix coupon cascade rules (MEDIUM)
