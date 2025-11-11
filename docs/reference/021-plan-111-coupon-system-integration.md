# Plan 111: Coupon & Discount Code System - Database Schema Integration

**Document Version:** 1.0
**Created:** 2025-11-09
**Author:** Database Architecture Team
**Related Plans:** 109 (Subscription Monetization), 110 (Perpetual Licensing), 111 (Coupon System), 112 (Token-to-Credit)

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Architecture](#schema-architecture)
3. [Integration Points](#integration-points)
4. [12-Step Coupon Validation Algorithm](#12-step-coupon-validation-algorithm)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Fraud Detection Strategy](#fraud-detection-strategy)
7. [Performance Optimization](#performance-optimization)
8. [Migration Strategy](#migration-strategy)

---

## 1. Overview

The Plan 111 Coupon & Discount Code System provides a comprehensive promotional code infrastructure that integrates seamlessly with the existing subscription monetization (Plan 109) and perpetual licensing (Plan 110) systems. This document details the database schema design, integration points, and operational workflows.

### 1.1 Key Features

- **Multi-Campaign Management**: Group coupons into campaigns with budget tracking
- **Flexible Discount Types**: Percentage, fixed amount, credits, free months
- **Tier-Based Eligibility**: Restrict coupons by subscription tier
- **Usage Limits**: Global and per-user redemption limits
- **Fraud Detection**: Real-time abuse pattern detection
- **Custom Validation Rules**: Extensible JSONB-based rule engine
- **Analytics Snapshots**: Daily aggregated metrics for dashboards

### 1.2 Database Tables (8 Total)

| Table | Purpose | Record Type |
|-------|---------|-------------|
| `coupon_campaign` | Campaign management | Configuration |
| `coupon` | Core coupon configuration | Configuration |
| `campaign_coupon` | Campaign-coupon junction | Relationship |
| `coupon_redemption` | Redemption audit log | Immutable Ledger |
| `coupon_usage_limit` | Real-time usage counters | Counter/Cache |
| `coupon_fraud_detection` | Fraud event log | Immutable Ledger |
| `coupon_validation_rule` | Custom validation rules | Configuration |
| `coupon_analytics_snapshot` | Daily aggregated metrics | Analytics |

---

## 2. Schema Architecture

### 2.1 Entity-Relationship Diagram

```
┌──────────────────────┐
│  coupon_campaign     │
│  ─────────────────   │
│  id (PK)             │
│  campaign_name       │
│  campaign_type       │ ENUM: seasonal, win_back, referral, promotional, early_bird
│  start_date          │
│  end_date            │
│  budget_limit_usd    │
│  total_spent_usd     │
│  target_tier         │ NULL = all tiers
│  is_active           │
│  created_by          │
└──────────────────────┘
         │ 1
         │
         │ N
┌──────────────────────┐      ┌────────────────────────┐
│  campaign_coupon     │      │  coupon                │
│  ─────────────────   │ N:N  │  ───────────────────   │
│  id (PK)             │◄────►│  id (PK)               │
│  campaign_id (FK)    │      │  code (UNIQUE)         │
│  coupon_id (FK)      │      │  coupon_type           │ ENUM: percentage_discount, fixed_amount_discount, tier_specific_discount, duration_bonus, byok_migration
└──────────────────────┘      │  discount_value        │
                              │  discount_type         │ ENUM: percentage, fixed_amount, credits, months_free
                              │  max_uses              │ NULL = unlimited
                              │  max_uses_per_user     │
                              │  tier_eligibility[]    │ Array of subscription_tier
                              │  billing_cycles[]      │ Array of TEXT
                              │  valid_from            │
                              │  valid_until           │
                              │  is_active             │
                              └────────────────────────┘
                                     │ 1
                                     │
                ┌────────────────────┼────────────────────┬────────────────────┐
                │ 1                  │ N                  │ N                  │ N
                │                    │                    │                    │
   ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
   │ coupon_usage_limit │  │coupon_redemption │  │coupon_validation │  │coupon_fraud_detection│
   │ ────────────────── │  │ ──────────────── │  │      _rule       │  │ ──────────────────── │
   │ id (PK)            │  │ id (PK)          │  │ ────────────     │  │ id (PK)              │
   │ coupon_id (FK,UNQ) │  │ coupon_id (FK)   │  │ id (PK)          │  │ coupon_id (FK)       │
   │ total_uses         │  │ user_id          │  │ coupon_id (FK)   │  │ user_id              │
   │ unique_users       │  │ subscription_id  │  │ rule_type        │  │ detection_type       │
   │ total_discount_usd │  │ discount_applied │  │ rule_value JSONB │  │ severity             │
   │ last_used_at       │  │ redemption_status│  │ is_active        │  │ details JSONB        │
   └────────────────────┘  │ ip_address       │  └──────────────────┘  │ is_flagged           │
                           │ user_agent       │                        │ reviewed_by          │
                           │ redemption_date  │                        └──────────────────────┘
                           └──────────────────┘
                                  │ N
                                  │
                                  │ 1
                           ┌──────────────────┐
                           │ subscription_    │
                           │  monetization    │
                           │ (Plan 109)       │
                           └──────────────────┘
```

### 2.2 Enum Definitions

#### CouponType
```typescript
enum CouponType {
  percentage_discount    // % off subscription price
  fixed_amount_discount  // $ off subscription price
  tier_specific_discount // Discount for specific tier upgrades
  duration_bonus         // Free additional months
  byok_migration         // Perpetual Plan migration discount
}
```

#### DiscountType
```typescript
enum DiscountType {
  percentage   // 25% off
  fixed_amount // $20 off
  credits      // 1000 credits granted
  months_free  // 1 month free
}
```

#### CampaignType
```typescript
enum CampaignType {
  seasonal     // Holiday campaigns (Black Friday, July 4)
  win_back     // Churned user re-engagement
  referral     // Referral program
  promotional  // Marketing campaigns
  early_bird   // New product launch
}
```

#### RedemptionStatus
```typescript
enum RedemptionStatus {
  success  // Coupon successfully redeemed
  failed   // Redemption failed (validation error)
  reversed // Redemption reversed (refund/chargeback)
  pending  // Redemption pending payment
}
```

---

## 3. Integration Points

### 3.1 Plan 109: Subscription Monetization

**Integration Points:**

1. **Checkout Flow Integration**
   - `coupon_redemption.subscription_id` → `subscription_monetization.id`
   - Apply discount **before** Stripe charge creation
   - Store original amount, discount applied, and final amount

2. **Discount Application Logic**
   ```typescript
   // Pseudocode
   async function applyDiscount(
     subscriptionId: UUID,
     couponCode: string,
     userId: UUID
   ): Promise<CouponRedemption> {
     // Step 1: Validate coupon (12-step algorithm - see section 4)
     const coupon = await validateCoupon(couponCode, userId);

     // Step 2: Get subscription details
     const subscription = await getSubscription(subscriptionId);
     const originalAmount = subscription.basePriceUsd;

     // Step 3: Calculate discount
     let discountAmount = 0;
     if (coupon.discountType === 'percentage') {
       discountAmount = originalAmount * (coupon.discountValue / 100);
     } else if (coupon.discountType === 'fixed_amount') {
       discountAmount = coupon.discountValue;
     }

     const finalAmount = Math.max(0, originalAmount - discountAmount);

     // Step 4: Create Stripe charge with discounted amount
     const stripeCharge = await stripe.charges.create({
       amount: Math.round(finalAmount * 100), // Convert to cents
       currency: 'usd',
       customer: subscription.stripeCustomerId,
       metadata: {
         couponCode: coupon.code,
         originalAmount: originalAmount,
         discountAmount: discountAmount,
       }
     });

     // Step 5: Record redemption
     const redemption = await prisma.couponRedemption.create({
       data: {
         couponId: coupon.id,
         userId: userId,
         subscriptionId: subscriptionId,
         discountAppliedUsd: discountAmount,
         originalAmountUsd: originalAmount,
         finalAmountUsd: finalAmount,
         redemptionStatus: 'success',
         ipAddress: req.ip,
         userAgent: req.headers['user-agent'],
       }
     });

     // Step 6: Update usage limits
     await incrementCouponUsage(coupon.id, userId, discountAmount);

     return redemption;
   }
   ```

3. **Budget Tracking**
   - Update `coupon_campaign.total_spent_usd` on each successful redemption
   - Enforce `budget_limit_usd` during validation (Step 7)

### 3.2 Plan 110: Perpetual Licensing

**Integration Points:**

1. **BYOK Migration Coupon (`byok_migration`)**
   - Grants `perpetual_license` on redemption
   - 100% off first month subscription
   - Requires `min_purchase_amount` = $199 (perpetual license cost)

   ```typescript
   async function applyBYOKMigrationCoupon(
     userId: UUID,
     couponCode: 'BYOK2025'
   ): Promise<{ license: PerpetualLicense, subscription: SubscriptionMonetization }> {
     // Step 1: Validate coupon
     const coupon = await validateCoupon(couponCode, userId);

     // Step 2: Create perpetual license
     const license = await prisma.perpetualLicense.create({
       data: {
         userId: userId,
         licenseKey: generateLicenseKey(), // REPHLO-XXXX-XXXX-XXXX-XXXX
         purchasePriceUsd: 0.00, // Free via coupon
         purchasedVersion: '1.0.0',
         eligibleUntilVersion: '1.99.99',
         maxActivations: 3,
         status: 'active',
       }
     });

     // Step 3: Create subscription with 100% discount
     const subscription = await prisma.subscriptionMonetization.create({
       data: {
         userId: userId,
         tier: 'perpetual',
         billingCycle: 'monthly',
         status: 'active',
         basePriceUsd: 199.00,
         monthlyCreditAllocation: 0, // BYOK = no cloud credits
         currentPeriodStart: new Date(),
         currentPeriodEnd: addMonths(new Date(), 1),
       }
     });

     // Step 4: Record redemption
     await prisma.couponRedemption.create({
       data: {
         couponId: coupon.id,
         userId: userId,
         subscriptionId: subscription.id,
         discountAppliedUsd: 199.00,
         originalAmountUsd: 199.00,
         finalAmountUsd: 0.00,
         redemptionStatus: 'success',
       }
     });

     return { license, subscription };
   }
   ```

2. **Version Upgrade Discount (`tier_specific_discount`)**
   - Early bird coupon: `EARLYBIRD79` ($20 off $99 upgrade)
   - Links to `version_upgrade` table
   - Applies to major version upgrades (v1.x → v2.0)

### 3.3 Plan 112: Token-to-Credit Conversion

**Integration Points:**

1. **Credit Grant Coupons (`discount_type: credits`)**
   - Grant credits directly instead of subscription discount
   - Example: `REFER20` grants $20 in credits

   ```typescript
   async function applyCreditGrantCoupon(
     userId: UUID,
     couponCode: 'REFER20'
   ): Promise<CreditAllocation> {
     const coupon = await validateCoupon(couponCode, userId);

     // Create credit allocation
     const allocation = await prisma.creditAllocation.create({
       data: {
         userId: userId,
         subscriptionId: null, // Not tied to subscription
         amount: coupon.discountValue, // $20 = 20 credits
         source: 'coupon',
         allocationPeriodStart: new Date(),
         allocationPeriodEnd: addMonths(new Date(), 12), // Valid for 1 year
       }
     });

     // Record redemption
     await prisma.couponRedemption.create({
       data: {
         couponId: coupon.id,
         userId: userId,
         subscriptionId: null,
         discountAppliedUsd: coupon.discountValue,
         originalAmountUsd: 0,
         finalAmountUsd: -coupon.discountValue, // Negative = credit
         redemptionStatus: 'success',
       }
     });

     return allocation;
   }
   ```

2. **Duration Bonus Coupons (`coupon_type: duration_bonus`)**
   - Extend credit allocation period
   - Example: "Get 1 extra month of Pro credits"
   - Updates `credit_allocation.allocation_period_end`

---

## 4. 12-Step Coupon Validation Algorithm

This algorithm is executed **before** any discount is applied to ensure all eligibility criteria are met.

```typescript
/**
 * 12-Step Coupon Validation Algorithm
 * Returns validated coupon or throws ValidationError with specific reason
 */
async function validateCoupon(
  couponCode: string,
  userId: UUID,
  subscriptionTier: string,
  cartTotal: number,
  ipAddress: string,
  deviceFingerprint: string
): Promise<Coupon> {

  // ============================================================================
  // STEP 1: Check coupon exists
  // ============================================================================
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase() },
    include: {
      campaign: true,
      usageLimits: true,
      validationRules: { where: { isActive: true } },
    }
  });

  if (!coupon) {
    throw new ValidationError('Coupon code not found', 'COUPON_NOT_FOUND');
  }

  // ============================================================================
  // STEP 2: Check coupon is active
  // ============================================================================
  if (!coupon.isActive) {
    throw new ValidationError('Coupon is no longer active', 'COUPON_INACTIVE');
  }

  // ============================================================================
  // STEP 3: Check validity period
  // ============================================================================
  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    throw new ValidationError(
      `Coupon expired. Valid from ${coupon.validFrom} to ${coupon.validUntil}`,
      'COUPON_EXPIRED'
    );
  }

  // ============================================================================
  // STEP 4: Check tier eligibility
  // ============================================================================
  if (!coupon.tierEligibility.includes(subscriptionTier)) {
    throw new ValidationError(
      `Coupon not valid for ${subscriptionTier} tier. Required: ${coupon.tierEligibility.join(', ')}`,
      'TIER_NOT_ELIGIBLE'
    );
  }

  // ============================================================================
  // STEP 5: Check max uses (global limit)
  // ============================================================================
  if (coupon.maxUses !== null && coupon.usageLimits.totalUses >= coupon.maxUses) {
    throw new ValidationError(
      `Coupon has reached maximum redemptions (${coupon.maxUses})`,
      'MAX_USES_REACHED'
    );
  }

  // ============================================================================
  // STEP 6: Check max uses per user
  // ============================================================================
  const userRedemptions = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      userId: userId,
      redemptionStatus: 'success',
    }
  });

  if (userRedemptions >= coupon.maxUsesPerUser) {
    throw new ValidationError(
      `You have already redeemed this coupon ${userRedemptions} time(s). Max: ${coupon.maxUsesPerUser}`,
      'USER_MAX_USES_REACHED'
    );
  }

  // ============================================================================
  // STEP 7: Check campaign budget
  // ============================================================================
  if (coupon.campaign && coupon.campaign.budgetLimitUsd > 0) {
    if (coupon.campaign.totalSpentUsd >= coupon.campaign.budgetLimitUsd) {
      throw new ValidationError(
        'Campaign budget exhausted',
        'CAMPAIGN_BUDGET_EXHAUSTED'
      );
    }
  }

  // ============================================================================
  // STEP 8: Check minimum purchase amount
  // ============================================================================
  if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
    throw new ValidationError(
      `Minimum purchase amount is $${coupon.minPurchaseAmount}. Your cart: $${cartTotal}`,
      'MIN_PURCHASE_NOT_MET'
    );
  }

  // ============================================================================
  // STEP 9: Check custom validation rules
  // ============================================================================
  for (const rule of coupon.validationRules) {
    const isValid = await validateCustomRule(rule, userId);
    if (!isValid) {
      throw new ValidationError(
        `Validation rule failed: ${rule.ruleType}`,
        `RULE_FAILED_${rule.ruleType.toUpperCase()}`
      );
    }
  }

  // ============================================================================
  // STEP 10: Check fraud detection flags
  // ============================================================================
  const criticalFraudFlags = await prisma.couponFraudDetection.count({
    where: {
      couponId: coupon.id,
      userId: userId,
      severity: 'critical',
      isFlagged: true,
      reviewedAt: null, // Not yet reviewed
    }
  });

  if (criticalFraudFlags > 0) {
    throw new ValidationError(
      'This account has been flagged for suspicious activity. Please contact support.',
      'FRAUD_FLAG_CRITICAL'
    );
  }

  // ============================================================================
  // STEP 11: Check redemption velocity (max 3 attempts/hour/user)
  // ============================================================================
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentAttempts = await prisma.couponRedemption.count({
    where: {
      userId: userId,
      redemptionDate: { gte: oneHourAgo },
    }
  });

  if (recentAttempts >= 3) {
    // Log velocity abuse
    await prisma.couponFraudDetection.create({
      data: {
        couponId: coupon.id,
        userId: userId,
        detectionType: 'velocity_abuse',
        severity: 'high',
        details: {
          attempts: recentAttempts,
          timeWindow: '1 hour',
        },
        isFlagged: true,
      }
    });

    throw new ValidationError(
      'Too many redemption attempts. Please try again in 1 hour.',
      'VELOCITY_LIMIT_EXCEEDED'
    );
  }

  // ============================================================================
  // STEP 12: Check device fingerprint consistency
  // ============================================================================
  const userFingerprints = await prisma.couponRedemption.findMany({
    where: {
      userId: userId,
      redemptionStatus: 'success',
    },
    select: { ipAddress: true },
    distinct: ['ipAddress'],
  });

  // If user has > 5 different IPs, flag for review
  if (userFingerprints.length > 5 && !userFingerprints.some(r => r.ipAddress === ipAddress)) {
    await prisma.couponFraudDetection.create({
      data: {
        couponId: coupon.id,
        userId: userId,
        detectionType: 'ip_switching',
        severity: 'medium',
        details: {
          uniqueIPs: userFingerprints.length,
          currentIP: ipAddress,
          previousIPs: userFingerprints.map(r => r.ipAddress),
        },
        isFlagged: false, // Don't block, just log
      }
    });
  }

  // ============================================================================
  // ALL CHECKS PASSED - Return validated coupon
  // ============================================================================
  return coupon;
}

/**
 * Validate custom validation rules
 */
async function validateCustomRule(
  rule: CouponValidationRule,
  userId: UUID
): Promise<boolean> {
  switch (rule.ruleType) {
    case 'first_time_user_only':
      const subscriptions = await prisma.subscriptionMonetization.count({
        where: { userId: userId }
      });
      return subscriptions === 0;

    case 'specific_email_domain':
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const domain = user.email.split('@')[1];
      return rule.ruleValue.domains.includes(domain);

    case 'minimum_credit_balance':
      const balance = await getUserCreditBalance(userId);
      return balance >= rule.ruleValue.min_balance;

    case 'exclude_refunded_users':
      const recentRefunds = await prisma.paymentTransaction.count({
        where: {
          userId: userId,
          status: 'refunded',
          createdAt: { gte: new Date(Date.now() - rule.ruleValue.days * 24 * 60 * 60 * 1000) }
        }
      });
      return recentRefunds === 0;

    case 'require_payment_method':
      const subscription = await prisma.subscriptionMonetization.findFirst({
        where: {
          userId: userId,
          stripeCustomerId: { not: null }
        }
      });
      return subscription !== null;

    default:
      return true; // Unknown rule type = pass
  }
}
```

---

## 5. Data Flow Diagrams

### 5.1 Coupon Redemption Flow

```
┌──────────┐
│   User   │
│ Checkout │
└─────┬────┘
      │
      │ 1. Enter coupon code: "BLACKFRIDAY25"
      ▼
┌─────────────────┐
│ Frontend Form   │
└────────┬────────┘
         │
         │ 2. POST /api/subscriptions/apply-coupon
         ▼
┌────────────────────────────────────────────────┐
│ Backend: CouponValidationService               │
│ ─────────────────────────────────────────────  │
│ • Execute 12-Step Validation Algorithm         │
│ • Check: existence, active, dates, tier,       │
│          limits, budget, fraud flags            │
└────────┬───────────────────────────────────────┘
         │
         │ 3a. Validation PASSED
         ▼
┌────────────────────────────────────────────────┐
│ Backend: SubscriptionService                   │
│ ─────────────────────────────────────────────  │
│ • Calculate discount amount                    │
│ • originalAmount = $19.00                      │
│ • discountValue = 25%                          │
│ • discountAmount = $4.75                       │
│ • finalAmount = $14.25                         │
└────────┬───────────────────────────────────────┘
         │
         │ 4. Create Stripe charge ($14.25)
         ▼
┌────────────────────────────────────────────────┐
│ Stripe API                                     │
│ ─────────────────────────────────────────────  │
│ • charges.create({ amount: 1425 })             │
│ • metadata: { couponCode, discountAmount }     │
└────────┬───────────────────────────────────────┘
         │
         │ 5. Payment SUCCESS
         ▼
┌────────────────────────────────────────────────┐
│ Database: Write Operations (Transaction)       │
│ ─────────────────────────────────────────────  │
│ 1. coupon_redemption (INSERT)                  │
│    • record redemption details                 │
│ 2. coupon_usage_limit (UPDATE)                 │
│    • totalUses += 1                            │
│    • uniqueUsers += 1 (if new user)            │
│    • totalDiscountAppliedUsd += 4.75           │
│ 3. coupon_campaign (UPDATE)                    │
│    • totalSpentUsd += 4.75                     │
│ 4. subscription_monetization (INSERT)          │
│    • Create subscription record                │
└────────┬───────────────────────────────────────┘
         │
         │ 6. Return success response
         ▼
┌─────────────────┐
│   User Dashboard│
│   ✓ Subscribed! │
│   $14.25 charged│
│   (25% off)     │
└─────────────────┘
```

### 5.2 Fraud Detection Flow

```
┌──────────────────┐
│ Redemption       │
│ Attempt          │
└────────┬─────────┘
         │
         │ Step 11: Check velocity
         ▼
┌────────────────────────────────────────┐
│ Query recent attempts                  │
│ WHERE userId = X                       │
│   AND redemptionDate > NOW() - 1 hour  │
└────────┬───────────────────────────────┘
         │
         │ attempts >= 3?
         ├─── NO ───► Continue validation
         │
         │ YES
         ▼
┌────────────────────────────────────────┐
│ Log fraud event                        │
│ ─────────────────────────────────────  │
│ INSERT INTO coupon_fraud_detection     │
│   detection_type: 'velocity_abuse'     │
│   severity: 'high'                     │
│   is_flagged: true                     │
│   details: { attempts: 5 }             │
└────────┬───────────────────────────────┘
         │
         │ Block redemption
         ▼
┌────────────────────────────────────────┐
│ Return error:                          │
│ "Too many attempts. Try in 1 hour."    │
└────────────────────────────────────────┘
```

---

## 6. Fraud Detection Strategy

### 6.1 Fraud Detection Types

| Detection Type | Severity | Trigger Condition | Action |
|----------------|----------|-------------------|--------|
| `velocity_abuse` | High | > 3 redemptions/hour/user | Block + Flag |
| `ip_switching` | Medium | > 5 unique IPs/user | Log only |
| `bot_pattern` | Critical | User-Agent = known bot | Block + Flag |
| `device_fingerprint_mismatch` | Medium | Fingerprint change during session | Log only |
| `stacking_abuse` | High | Multiple coupons in same checkout | Block + Flag |

### 6.2 Fraud Severity Actions

- **Low**: Log event, no action
- **Medium**: Log event, flag for manual review
- **High**: Block redemption, flag for review
- **Critical**: Block redemption, suspend user account, notify admin

### 6.3 Manual Review Process

1. Admin dashboard shows flagged events: `GET /admin/fraud-events?status=pending`
2. Admin reviews event details and user history
3. Admin marks resolution:
   - **False Positive**: Unflag, allow future redemptions
   - **Confirmed Fraud**: Ban user, revoke redemption
   - **Needs Investigation**: Escalate to security team

---

## 7. Performance Optimization

### 7.1 Indexes Strategy

#### Critical Query Patterns

1. **Coupon Lookup by Code** (Step 1)
   ```sql
   -- Query: SELECT * FROM coupon WHERE code = 'BLACKFRIDAY25' AND is_active = true
   CREATE INDEX coupon_code_is_active_idx ON coupon(code, is_active);
   ```

2. **User Redemption Count** (Step 6)
   ```sql
   -- Query: SELECT COUNT(*) FROM coupon_redemption WHERE coupon_id = X AND user_id = Y
   CREATE INDEX coupon_redemption_coupon_id_user_id_redemption_date_idx
     ON coupon_redemption(coupon_id, user_id, redemption_date);
   ```

3. **Velocity Check** (Step 11)
   ```sql
   -- Query: SELECT COUNT(*) FROM coupon_redemption WHERE user_id = X AND redemption_date > NOW() - INTERVAL '1 hour'
   CREATE INDEX coupon_redemption_user_id_redemption_date_idx
     ON coupon_redemption(user_id, redemption_date DESC);
   ```

4. **Fraud Flags** (Step 10)
   ```sql
   -- Query: SELECT COUNT(*) FROM coupon_fraud_detection WHERE coupon_id = X AND severity = 'critical' AND is_flagged = true
   CREATE INDEX coupon_fraud_detection_coupon_id_severity_is_flagged_idx
     ON coupon_fraud_detection(coupon_id, severity, is_flagged);
   ```

### 7.2 Caching Strategy

#### Redis Cache Keys

```typescript
// Coupon details (TTL: 1 hour)
const couponKey = `coupon:${couponCode}`;
await redis.set(couponKey, JSON.stringify(coupon), 'EX', 3600);

// User redemption count (TTL: 5 minutes)
const userRedemptionKey = `coupon:${couponId}:user:${userId}:count`;
await redis.set(userRedemptionKey, redemptionCount, 'EX', 300);

// Campaign budget (TTL: 1 minute)
const campaignBudgetKey = `campaign:${campaignId}:spent`;
await redis.set(campaignBudgetKey, totalSpent, 'EX', 60);
```

### 7.3 Database Connection Pooling

```typescript
// Prisma client configuration
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
  // Connection pool sizing
  // Rule of thumb: (2 * CPU cores) + effective spindle count
  // For 8-core server with SSD: 2*8 + 1 = 17
  // Set max connections: 20 (with buffer)
  // Prisma auto-manages pool size based on DATABASE_URL query params
  // Example: postgresql://user:pass@localhost:5432/db?connection_limit=20
});
```

---

## 8. Migration Strategy

### 8.1 Migration File

Location: `backend/prisma/migrations/20251109000002_add_coupon_discount_system/migration.sql`

**Migration Steps:**

1. Create enums (7 total)
2. Create tables (8 total)
3. Create indexes (20 total)
4. Add foreign keys (9 total)
5. Add table comments

### 8.2 Rollback Strategy

```sql
-- Rollback script (20251109000002_add_coupon_discount_system_rollback.sql)

-- Drop foreign keys
ALTER TABLE coupon_analytics_snapshot DROP CONSTRAINT coupon_analytics_snapshot_top_coupon_code_fkey;
ALTER TABLE coupon_validation_rule DROP CONSTRAINT coupon_validation_rule_coupon_id_fkey;
ALTER TABLE coupon_fraud_detection DROP CONSTRAINT coupon_fraud_detection_coupon_id_fkey;
ALTER TABLE coupon_usage_limit DROP CONSTRAINT coupon_usage_limit_coupon_id_fkey;
ALTER TABLE coupon_redemption DROP CONSTRAINT coupon_redemption_subscription_id_fkey;
ALTER TABLE coupon_redemption DROP CONSTRAINT coupon_redemption_coupon_id_fkey;
ALTER TABLE campaign_coupon DROP CONSTRAINT campaign_coupon_coupon_id_fkey;
ALTER TABLE campaign_coupon DROP CONSTRAINT campaign_coupon_campaign_id_fkey;
ALTER TABLE coupon DROP CONSTRAINT coupon_campaign_id_fkey;

-- Drop tables
DROP TABLE coupon_analytics_snapshot;
DROP TABLE coupon_validation_rule;
DROP TABLE coupon_fraud_detection;
DROP TABLE coupon_usage_limit;
DROP TABLE coupon_redemption;
DROP TABLE campaign_coupon;
DROP TABLE coupon;
DROP TABLE coupon_campaign;

-- Drop enums
DROP TYPE validation_rule_type;
DROP TYPE fraud_severity;
DROP TYPE fraud_detection_type;
DROP TYPE redemption_status;
DROP TYPE campaign_type;
DROP TYPE discount_type;
DROP TYPE coupon_type;
```

### 8.3 Data Migration (from existing coupon table, if any)

```typescript
/**
 * Migrate data from legacy coupon table (if exists)
 * This script runs after schema migration
 */
async function migrateLegacyCoupons() {
  // Check if legacy table exists
  const hasLegacyTable = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'legacy_coupons'
    );
  `;

  if (!hasLegacyTable) {
    console.log('No legacy coupons to migrate');
    return;
  }

  // Migrate campaigns first
  const legacyCampaigns = await prisma.$queryRaw`
    SELECT DISTINCT campaign_name FROM legacy_coupons
  `;

  for (const campaign of legacyCampaigns) {
    await prisma.couponCampaign.create({
      data: {
        campaignName: campaign.campaign_name,
        campaignType: 'promotional',
        startDate: new Date(),
        endDate: addYears(new Date(), 1),
        budgetLimitUsd: 999999,
        isActive: true,
        createdBy: ADMIN_USER_ID,
      }
    });
  }

  // Migrate coupons
  const legacyCoupons = await prisma.$queryRaw`
    SELECT * FROM legacy_coupons
  `;

  for (const legacy of legacyCoupons) {
    await prisma.coupon.create({
      data: {
        code: legacy.code.toUpperCase(),
        couponType: mapLegacyCouponType(legacy.type),
        discountValue: legacy.discount,
        discountType: legacy.type === 'percentage' ? 'percentage' : 'fixed_amount',
        validFrom: legacy.start_date,
        validUntil: legacy.end_date,
        isActive: legacy.active,
        createdBy: ADMIN_USER_ID,
      }
    });
  }

  console.log(`Migrated ${legacyCoupons.length} legacy coupons`);
}
```

---

## 9. Testing & Validation

### 9.1 Unit Tests

```typescript
describe('Coupon Validation Algorithm', () => {
  describe('Step 1: Coupon Exists', () => {
    it('should throw COUPON_NOT_FOUND for invalid code', async () => {
      await expect(validateCoupon('INVALID', userId, 'pro', 100)).rejects.toThrow('COUPON_NOT_FOUND');
    });
  });

  describe('Step 2: Coupon Active', () => {
    it('should throw COUPON_INACTIVE for disabled coupon', async () => {
      const inactiveCoupon = await createCoupon({ isActive: false });
      await expect(validateCoupon(inactiveCoupon.code, userId, 'pro', 100)).rejects.toThrow('COUPON_INACTIVE');
    });
  });

  describe('Step 3: Validity Period', () => {
    it('should throw COUPON_EXPIRED for expired coupon', async () => {
      const expiredCoupon = await createCoupon({
        validUntil: new Date('2020-01-01')
      });
      await expect(validateCoupon(expiredCoupon.code, userId, 'pro', 100)).rejects.toThrow('COUPON_EXPIRED');
    });
  });

  // ... tests for steps 4-12
});
```

### 9.2 Integration Tests

```typescript
describe('Coupon Redemption Flow', () => {
  it('should successfully redeem valid coupon', async () => {
    const coupon = await createCoupon({
      code: 'TEST25',
      discountValue: 25,
      discountType: 'percentage',
    });

    const result = await POST('/api/subscriptions/apply-coupon', {
      couponCode: 'TEST25',
      tier: 'pro',
    });

    expect(result.redemption.discountAppliedUsd).toBe(4.75); // 25% of $19
    expect(result.subscription.finalAmountUsd).toBe(14.25);
  });

  it('should enforce max uses per user', async () => {
    const coupon = await createCoupon({ maxUsesPerUser: 1 });

    // First redemption should succeed
    await POST('/api/subscriptions/apply-coupon', { couponCode: coupon.code });

    // Second redemption should fail
    await expect(
      POST('/api/subscriptions/apply-coupon', { couponCode: coupon.code })
    ).rejects.toThrow('USER_MAX_USES_REACHED');
  });
});
```

---

## 10. Monitoring & Analytics

### 10.1 Key Metrics

| Metric | Query | Update Frequency |
|--------|-------|------------------|
| Total Active Coupons | `SELECT COUNT(*) FROM coupon WHERE is_active = true` | Real-time |
| Total Redemptions (24h) | `SELECT COUNT(*) FROM coupon_redemption WHERE redemption_date > NOW() - INTERVAL '1 day'` | Hourly |
| Total Discount Value (30d) | `SELECT SUM(discount_applied_usd) FROM coupon_redemption WHERE redemption_date > NOW() - INTERVAL '30 days'` | Daily |
| Campaign Budget Utilization | `SELECT total_spent_usd / budget_limit_usd FROM coupon_campaign` | Real-time |
| Fraud Flag Rate | `SELECT COUNT(*) FROM coupon_fraud_detection WHERE is_flagged = true` / total redemptions | Hourly |

### 10.2 Daily Analytics Cron Job

```typescript
/**
 * Generate daily coupon analytics snapshot
 * Runs at 00:05 UTC every day
 */
async function generateDailySnapshot() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Count active coupons
  const activeCoupons = await prisma.coupon.count({
    where: {
      isActive: true,
      validFrom: { lte: today },
      validUntil: { gte: today },
    }
  });

  // Count redemptions
  const redemptions = await prisma.couponRedemption.count({
    where: {
      redemptionDate: {
        gte: yesterday,
        lt: today,
      },
      redemptionStatus: 'success',
    }
  });

  // Sum discount value
  const discountData = await prisma.couponRedemption.aggregate({
    where: {
      redemptionDate: {
        gte: yesterday,
        lt: today,
      },
      redemptionStatus: 'success',
    },
    _sum: { discountAppliedUsd: true },
    _avg: { discountAppliedUsd: true },
  });

  // Find top coupon
  const topCoupon = await prisma.couponRedemption.groupBy({
    by: ['couponId'],
    where: {
      redemptionDate: {
        gte: yesterday,
        lt: today,
      },
      redemptionStatus: 'success',
    },
    _count: true,
    orderBy: { _count: { couponId: 'desc' } },
    take: 1,
  });

  // Create snapshot
  await prisma.couponAnalyticsSnapshot.create({
    data: {
      snapshotDate: yesterday,
      totalCouponsActive: activeCoupons,
      totalRedemptions: redemptions,
      totalDiscountValueUsd: discountData._sum.discountAppliedUsd || 0,
      avgDiscountPerRedemptionUsd: discountData._avg.discountAppliedUsd || 0,
      topCouponCode: topCoupon[0]?.coupon.code || null,
      conversionRate: calculateConversionRate(redemptions),
    }
  });
}
```

---

## Appendix A: Seed Data Summary

The seed script creates the following sample data:

### Campaigns (5)
1. **Black Friday 2025** (Seasonal) - Nov 29 - Dec 2, $50k budget
2. **Summer Sale 2025** (Seasonal) - Jul 1 - Jul 31, $30k budget
3. **Win Back Churned Users** (Win-Back) - Year-round, unlimited budget
4. **Referral Bonus Program** (Referral) - Year-round, $100k budget
5. **Perpetual License Migration** (Early Bird) - Year-round, unlimited budget

### Coupons (6)
1. **BLACKFRIDAY25** - 25% off, max 1000 uses
2. **SUMMER2025** - 20% off annual plans, max 500 uses
3. **COMEBACK50** - 50% off first month, unlimited uses
4. **REFER20** - $20 credit, max 5 uses per user
5. **BYOK2025** - 100% off + perpetual license
6. **EARLYBIRD79** - $20 off v2.0 upgrade

### Validation Rules (4)
1. Win-back: Exclude recent refunds (90 days)
2. Referral: First-time users only
3. BYOK: Requires payment method
4. Enterprise: Specific email domains (disabled by default)

---

**Document Version History:**
- v1.0 (2025-11-09): Initial release with complete schema integration documentation
