# Plan 111: Coupon & Discount Code System

**Document ID**: 111-coupon-discount-code-system.md
**Version**: 1.0
**Status**: Complete
**Created**: 2025-11-08
**Last Updated**: 2025-11-08
**Scope**: Coupon and promotional discount code system for Rephlo platform (web + desktop)
**Integration**: Extends Plans 109 & 110 (Monetization & Perpetual Plan)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Coupon Types & Strategy](#coupon-types--strategy)
4. [Campaign Management System](#campaign-management-system)
5. [Database Schema Design](#database-schema-design)
6. [Validation Logic & Rules](#validation-logic--rules)
7. [Checkout Integration](#checkout-integration)
8. [Admin UI Features](#admin-ui-features)
9. [Marketing Campaign Templates](#marketing-campaign-templates)
10. [Proration Handling for Coupons](#proration-handling-for-coupons)
11. [Analytics & Reporting](#analytics--reporting)
12. [Implementation Phases](#implementation-phases)
13. [Risk Management](#risk-management)
14. [Success Metrics](#success-metrics)

---

## Executive Summary

The Coupon & Discount Code System enables Rephlo to run strategic promotional campaigns for both web and desktop platforms. This system allows marketing teams to create time-limited or seasonal offers (July 4, Thanksgiving, Black Friday, etc.) while maintaining pricing integrity and preventing fraud.

**Key Features:**
- **5 Coupon Types**: Percentage-based, fixed-amount, tier-specific, subscription-duration, and BYOK migration coupons
- **Campaign Management**: Holiday calendars, bulk code generation, performance tracking
- **Validation Engine**: Expiration, usage limits, tier eligibility, budget caps
- **Admin Dashboard**: Real-time redemption tracking, ROI analytics, campaign performance
- **Checkout Integration**: Seamless coupon application with automatic proration
- **Fraud Prevention**: Usage limits, IP tracking, bot detection, duplicate prevention

**Business Impact:**
- Estimated 15-25% increase in conversion during campaigns
- 8-12% higher LTV through promotional tier upgrades
- 20-30% improvement in win-back campaign effectiveness
- Seasonal revenue smoothing through targeted holiday campaigns

---

## Business Context

### Current Monetization Model (from Plan 109)

The 5-tier subscription model provides the foundation:
- **Free**: $0/mo, 2,000 credits
- **Pro**: $19/mo, 20,000 credits
- **Pro Max**: $49/mo, 60,000 credits
- **Enterprise Pro**: $149/mo, 250,000 credits
- **Enterprise Max**: Custom pricing, unlimited credits

With the addition of Perpetual Plan (from Plan 110):
- **Perpetual**: $199 one-time (BYOK)

### Strategic Objectives

1. **Customer Acquisition**: Reduce friction for trial-to-paid conversion
2. **Tier Upgrades**: Drive users from Free/Pro to Pro Max/Enterprise
3. **Win-Back**: Re-engage lapsed subscribers
4. **Seasonal Revenue**: Maximize revenue during peak shopping periods
5. **Perpetual Migration**: Encourage Free→Perpetual upgrades for BYOK users
6. **Affiliate/Referral**: Enable partner programs and referral campaigns

### Campaign Triggers

- **Time-based**: Holidays, seasonal events, end-of-quarter/year
- **Behavior-based**: Trial expiration, churn risk, high usage
- **Event-based**: Product launches, major releases, anniversaries
- **Performance-based**: Low conversion rates, high CAC cohorts
- **Competitor-based**: Market response campaigns

---

## Coupon Types & Strategy

### Type 1: Percentage-Based Discounts

**Definition**: Discount applied as a percentage of the subscription price for a specific duration.

**Use Cases:**
- July 4 Independence Day: "25% off annual Pro"
- Black Friday: "50% off first year Pro Max"
- New Year: "20% off any tier for 3 months"
- Product Launch: "15% off first month Pro tier"

**Configuration:**
```json
{
  "type": "percentage",
  "discount_percentage": 25,
  "applicable_tiers": ["pro", "pro_max", "enterprise_pro"],
  "applicable_billing_cycles": ["monthly", "annual"],
  "max_discount_months": 12,
  "description": "25% off annual subscription"
}
```

**Calculation Example:**
- Base price (Pro annual): $19 × 12 = $228/year
- Discount: 25% × $228 = $57
- Final price: $171 (equivalent to $14.25/month)
- Savings messaging: "Save $57 per year"

**Strategic Value:**
- Preserves perceived value of original price
- Easier to market ("Save up to $X")
- Psychologically stronger (% off = better deal perception)
- Tier flexibility allows custom targeting

---

### Type 2: Fixed-Amount Discounts

**Definition**: Flat dollar amount deducted from subscription price.

**Use Cases:**
- Referral bonus: "Get $20 credit when friend subscribes"
- Welcome campaign: "New users get $15 off first month"
- Retention: "We miss you – $30 credit code, valid 7 days"
- Cross-sell: "Pro Max upgrade – get $25 off annual"

**Configuration:**
```json
{
  "type": "fixed_amount",
  "discount_amount": 20,
  "applicable_tiers": null,
  "max_discount_applications": 1,
  "description": "$20 credit toward any subscription"
}
```

**Calculation Example:**
- Referral discount: $20 credit
- User subscribes to Pro ($19/month)
- Final charge: $19 - $20 = Free first month (credit applies to next month)
- Or: Credit spreads: $20 ÷ $19 = 1.05 months free

**Strategic Value:**
- Simple for customers to understand
- Exact ROI predictability ("costs us $20 per redemption")
- Ideal for referral programs (consistent incentive)
- Works with all subscription levels

---

### Type 3: Tier-Specific Upgrade Coupons

**Definition**: Discount limited to specific tier upgrades or tier levels.

**Use Cases:**
- Pro to Pro Max upgrade: "Upgrade to Pro Max, get 50% off first 3 months"
- Enterprise promotion: "Enterprise customers get 30% off annual commitment"
- Free to Pro: "First Pro subscription – 40% off first 3 months"
- Cross-tier bonus: "Purchase Pro Max, get $100 Perpetual discount"

**Configuration:**
```json
{
  "type": "tier_specific",
  "applicable_from_tiers": ["free", "pro"],
  "applicable_to_tiers": ["pro_max", "enterprise_pro"],
  "discount_type": "percentage",
  "discount_value": 50,
  "duration_months": 3,
  "minimum_commitment": "annual",
  "description": "50% off Pro Max upgrade for first 3 months"
}
```

**Calculation Example:**
- User upgrades Free → Pro Max
- Base price: $49/month × 3 = $147
- Discount: 50% × $147 = $73.50
- Final charge: $73.50 for 3 months (then $49/month)
- Then automatically renews at full price

**Strategic Value:**
- Directly targets upgrade funnel
- Minimal impact on existing paid tier users (can't use on current tier)
- Creates urgency for specific tier transitions
- Drives higher-tier adoption

---

### Type 4: Subscription Duration Coupons

**Definition**: Free subscription period or extended trial following paid subscription.

**Use Cases:**
- Thanksgiving: "Buy 12-month Pro, get 1 month free" (13 months for $228)
- Cyber Monday: "Pro Max annual – get 3 months free" (15 months for $588)
- Onboarding: "First Pro subscription – 14-day free trial"
- Win-back: "Come back – 30-day free trial, then $19/month"

**Configuration:**
```json
{
  "type": "duration_bonus",
  "bonus_duration_months": 1,
  "applicable_billing_cycles": ["annual"],
  "applicable_tiers": ["pro", "pro_max"],
  "minimum_commitment": "annual",
  "description": "Buy 12-month Pro, get 1 free month"
}
```

**Calculation Example:**
- Annual Pro: 12 months × $19 = $228
- Bonus: 1 free month (typically worth $19)
- Total months delivered: 13
- Marketing message: "Save $19! Get 13 months for 12-month price"
- Effective rate: $17.54/month

**Strategic Value:**
- Perception of "getting more" vs. price reduction
- Extends customer lifetime before first renewal decision
- High viral potential ("get extra month free")
- Works well with annual billing cycles

---

### Type 5: BYOK Migration Coupons (Perpetual Plan Specific)

**Definition**: Special discount for Free/Pro users to migrate to Perpetual Plan (one-time payment).

**Use Cases:**
- Perpetual launch: "Launch price – Perpetual Plan only $79 (regular $199)"
- Free user conversion: "Free users – upgrade to Perpetual Plan, get 60% off"
- Subscriber buyout: "Pro users – switch to Perpetual, pay difference ($150)"
- Enterprise BYOK: "Enterprise Plan users – get free Perpetual Plan upgrade"

**Configuration:**
```json
{
  "type": "perpetual_migration",
  "perpetual_discount_type": "percentage",
  "perpetual_discount_value": 60,
  "source_tiers": ["free", "pro"],
  "credit_subscription_months": 3,
  "description": "Perpetual Plan 60% off for Free users – use your own API keys"
}
```

**Calculation Example – Free User:**
- Perpetual Plan regular price: $199
- Discount: 60% × $199 = $119.40
- Final price: $79.60
- Messaging: "Launch price – Perpetual Plan only $79.60"

**Calculation Example – Pro User Migration:**
- User on Pro ($19/month subscription)
- Migration credit: Remaining 7 months × $19 = $133
- Perpetual Plan: $199
- Coupon: $133 credit toward purchase
- Final price: $199 - $133 = $66
- Messaging: "Switch to Perpetual – only pay the difference ($66)"

**Strategic Value:**
- Drives BYOK adoption (customer owned, higher margin)
- Reduces cloud API spend
- Creates one-time revenue spike from subscription users
- Targets users dissatisfied with subscription pricing

---

## Campaign Management System

### Campaign Lifecycle

```
Planning → Creation → Validation → Launch → Monitoring → Analysis → Optimization
```

### Campaign Types

#### 1. Holiday Campaigns (Recurring, Annually)

**Thanksgiving Campaign Example:**
```
Campaign: "Grateful Giveaway"
Period: November 15-27 (2 weeks, before Black Friday)
Primary Goal: Trial-to-paid conversion
Secondary Goal: Pro→Pro Max upgrade

Coupons:
- Code: GRATEFUL15 (Pro tier, 15% off annual)
- Code: GRATEFUL25 (Pro Max tier, 25% off annual)
- Code: GRATEFUL1MO (All tiers, 1 free month on annual)

Target Audience:
- Free tier users (30+ days active, not yet converted)
- Trial users (within 7 days of expiration)
- Pro users (high usage, upgrade ready)

Expected Performance:
- Conversion rate: +35% vs. baseline (10% → 13.5%)
- Average order value: +20% (more Pro Max uptake)
- Total revenue impact: $45K-$60K
```

**Annual Holiday Calendar:**

| Campaign | Period | Discount | Target | Est. Revenue |
|----------|--------|----------|--------|--------------|
| July 4 Liberty Deal | Jul 1-5 | 25% off annual | Free/Pro users | $30K-$40K |
| Back to School | Aug 15-Sep 5 | 20% off Pro, 30% off Pro Max | Students, teachers | $25K-$35K |
| Thanksgiving | Nov 15-27 | 15-25% + 1mo bonus | Conversion, upgrade | $45K-$60K |
| Black Friday/Cyber Monday | Nov 28-Dec 2 | 50% first 3mo (Pro Max), 40% annual | All tiers | $80K-$120K |
| New Year's Resolution | Dec 28-Jan 15 | 20% annual + 3mo free | Self-improvement focus | $35K-$50K |
| Valentine's Day | Feb 8-14 | Couple discount ($29/mo for 2) | New + existing | $15K-$20K |
| Summer Sale | May 15-31 | 30% off, extended trial | Conversion focus | $40K-$55K |

**Total Annual Holiday Revenue**: ~$270K-$380K (15-20% of annual revenue)

#### 2. Marketing Campaigns (Strategic, Tactical)

**Product Launch Campaign:**
```
Campaign: "New Claude 4 Model Launch"
Duration: 2 weeks post-announcement
Goal: Drive feature discovery and Pro Max tier adoption

Coupons:
- CLAUDE4LAUNCH: "40% off Pro Max annual subscription"
- CLAUDE4TRIAL: "14-day free trial for new Free tier users"

Mechanics:
- Blog post announcement: "New Claude 4 - Pro Max only"
- Email to Pro Max subscribers: "You have access!"
- Email to Free/Pro users: "Upgrade to Pro Max and save 40%"
- In-app banner: "Experience Claude 4 with 40% off"

Target Metrics:
- Free-to-Pro conversion: +45% during campaign
- Pro-to-Pro Max upgrade: +60% during campaign
- New paid users: 500+
- Revenue impact: $35K-$50K
```

**Win-Back Campaign:**
```
Campaign: "We Miss You – Come Back!"
Trigger: Subscription expired >30 days AND user was Pro/Pro Max
Duration: 30-day window after expiration detection
Goal: Recover churned revenue

Coupons:
- COMEBACK30: "$30 credit toward any subscription"
- COMEBACK50: "50% off first month reactivation"
- COMEBACK3MO: "3 months at 50% discount"

Personalization:
- Email subject: "John, we miss your insights – here's $30 off"
- Content: Show usage stats "You used 450 models last quarter"
- Deadline messaging: "Offer valid 7 days only"

Expected Performance:
- Win-back rate: 15-25% (vs. 5% without coupon)
- Average reactivation value: $35-$50
- ROI: 200-300%
```

**Referral Campaign:**
```
Campaign: "Refer a Friend – Get $20 Credit"
Duration: Ongoing, no expiration
Goal: Viral growth, low-cost acquisition

Mechanics:
- Referrer gets: $20 credit when referred friend subscribes
- Referred friend gets: $15 off first month (new customer discount)
- Both get: Monthly referral tracking dashboard
- Bonus: Refer 5 friends, get free month Pro Max

Tracking:
- Unique referral link per user: rephlo.com/ref/username123
- Attribution: First-click for referred, subscribed for referrer reward
- Duplicate prevention: Max 5 referrals per account per month

Expected Performance:
- Viral coefficient: 0.15 (each customer brings 0.15 new customers)
- CAC via referral: $15 (vs. $40+ via ads)
- LTV impact: +8% (referred users stay 15% longer)
```

#### 3. Behavioral Campaigns (Automated, Triggered)

**Trial Expiration Campaign:**
```
Trigger: Free trial expires in 3 days
Action: Send email with upgrade coupon
Coupon: CONVERT25 (25% off first month any paid tier)
Expected Conversion: +40% vs. no coupon

Timeline:
- Day 1 (trial started): Welcome email, setup guide
- Day 11 (3 days before expiration): "Your trial ends in 3 days – save 25%"
- Day 14 (expiration): "Your trial has ended. Upgrade now for 25% off"
- Day 15+ (post-trial): Win-back campaign with $30 credit
```

**High Usage Campaign:**
```
Trigger: Free user consuming 80%+ of monthly quota
Action: Encourage upgrade before overages
Coupon: UPGRADE20 (20% off Pro tier annual, personal discount)

Mechanics:
- In-app notification: "You're almost out of credits. Upgrade and save 20%"
- Email: "Your usage shows you're ready for Pro. We've reserved a 20% discount."
- Valid: 7 days from generation
- Auto-applied: Can show coupon code in checkout flow
```

**Inactive User Campaign:**
```
Trigger: No API usage for 14+ days AND paid subscriber
Action: Engagement campaign to prevent churn
Coupon: WELCOME10 (10% credit back as bonus credits)

Example Flow:
- Day 14: In-app prompt "Haven't seen you in 2 weeks. Here's 10% credits."
- Day 21: Email with 10% bonus credits applied
- Day 30: "We applied 10% extra credits. Here's what you can do now..."
```

---

## Database Schema Design

### Core Tables

#### 1. Coupon Table

Represents individual coupon code configurations.

```sql
CREATE TABLE coupon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,  -- "JULY4LIBERTY", "BLACKFRIDAY50"

  -- Coupon Type & Value
  type ENUM('percentage', 'fixed_amount', 'tier_specific', 'duration_bonus', 'perpetual_migration') NOT NULL,

  -- For Percentage & Fixed Amount
  discount_percentage DECIMAL(5,2),  -- e.g., 25.50 for 25.5%
  discount_amount DECIMAL(10,2),     -- e.g., 20.00 for $20

  -- For Duration Bonus
  bonus_duration_months INT,  -- e.g., 1 for free month

  -- Tier Restrictions
  applicable_tiers JSONB,  -- ["pro", "pro_max"] or null for all
  applicable_from_tiers JSONB,  -- For tier_specific: source tiers
  applicable_to_tiers JSONB,    -- For tier_specific: target tiers

  -- Billing Cycle Restrictions
  applicable_billing_cycles JSONB,  -- ["monthly", "annual"] or null

  -- Duration & Limits
  max_discount_months INT,  -- How many months discount applies (null = 1 month)
  minimum_commitment VARCHAR(50),  -- "monthly", "annual", or null
  max_discount_applications INT,  -- Total uses allowed (null = unlimited)
  max_per_customer INT,  -- Uses per customer (default: 1)
  max_per_month INT,  -- Preventive abuse limit

  -- Validity
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Perpetual Plan Specific
  perpetual_discount_type VARCHAR(50),  -- "percentage" or "fixed_amount"
  perpetual_discount_value DECIMAL(10,2),
  credit_subscription_months INT,  -- Months of subscription as credit

  -- Metadata
  campaign_id UUID REFERENCES campaign(id),
  description TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_coupon_code ON coupon(code);
CREATE INDEX idx_coupon_campaign ON coupon(campaign_id);
CREATE INDEX idx_coupon_valid ON coupon(valid_from, valid_until);
CREATE INDEX idx_coupon_active ON coupon(is_active);
```

#### 2. Campaign Table

Manages promotional campaigns that group related coupons.

```sql
CREATE TABLE campaign (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,  -- "July 4 Liberty Deal"
  type ENUM('holiday', 'marketing', 'behavioral', 'referral') NOT NULL,

  description TEXT,
  marketing_copy TEXT,  -- HTML/Markdown for email/website
  terms_conditions TEXT,  -- Legal terms

  -- Timing
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,

  -- Goals & Targeting
  target_audience JSONB,  -- {"user_tiers": ["free", "pro"], "min_days_active": 30}
  primary_goal VARCHAR(100),  -- "conversion", "upgrade", "retention"
  expected_revenue DECIMAL(12,2),

  -- Budget Cap (optional)
  budget_cap DECIMAL(12,2),  -- Max budget for discounts
  current_spend DECIMAL(12,2) DEFAULT 0,

  -- Status
  status ENUM('planning', 'active', 'paused', 'ended') DEFAULT 'planning',

  -- Configuration
  is_recurring BOOLEAN DEFAULT false,  -- Repeats annually
  next_occurrence_date DATE,  -- For recurring campaigns

  -- Metadata
  created_by UUID REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_dates ON campaign(starts_at, ends_at);
CREATE INDEX idx_campaign_status ON campaign(status);
CREATE INDEX idx_campaign_budget ON campaign(budget_cap, current_spend);
```

#### 3. CouponRedemption Table

Tracks every coupon usage for analytics and fraud prevention.

```sql
CREATE TABLE coupon_redemption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupon(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id),
  subscription_id UUID REFERENCES subscription(id),

  -- Redemption Details
  redemption_type ENUM('trial_start', 'new_subscription', 'upgrade', 'downgrade', 'renewal') NOT NULL,
  discount_applied_amount DECIMAL(10,2),  -- Actual discount given
  order_value_before_discount DECIMAL(10,2),
  order_value_after_discount DECIMAL(10,2),

  -- Proration (if applicable)
  is_proration_involved BOOLEAN DEFAULT false,
  proration_amount DECIMAL(10,2),

  -- Usage Context
  user_tier_before VARCHAR(50),
  user_tier_after VARCHAR(50),
  billing_cycle_before VARCHAR(50),
  billing_cycle_after VARCHAR(50),

  -- Fraud Prevention Flags
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  is_flagged BOOLEAN DEFAULT false,
  flag_reason VARCHAR(255),  -- "duplicate_user", "high_velocity", "suspicious_ip"

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,

  -- Metadata
  notes TEXT
);

CREATE INDEX idx_redemption_coupon ON coupon_redemption(coupon_id);
CREATE INDEX idx_redemption_user ON coupon_redemption(user_id);
CREATE INDEX idx_redemption_subscription ON coupon_redemption(subscription_id);
CREATE INDEX idx_redemption_created ON coupon_redemption(created_at);
CREATE INDEX idx_redemption_flagged ON coupon_redemption(is_flagged);
```

#### 4. CouponValidationRule Table

Complex validation rules for coupon eligibility (extensible).

```sql
CREATE TABLE coupon_validation_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupon(id) ON DELETE CASCADE,

  -- Rule Types
  rule_type ENUM(
    'min_account_age_days',
    'min_usage_credits',
    'excluded_user_ids',
    'excluded_domains',
    'geo_location_allowed',
    'requires_previous_subscription',
    'excludes_recent_coupon_user',
    'min_subscription_total'
  ) NOT NULL,

  -- Rule Configuration (flexible JSON)
  rule_config JSONB NOT NULL,  -- {"min_days": 30, "regions": ["US", "CA"]}

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example rule configs:
-- {"min_days": 30} - Account must be 30+ days old
-- {"regions": ["US", "CA", "MX"]} - Only US, Canada, Mexico
-- {"min_credits": 1000} - Must have used 1000+ credits
-- {"excluded_ids": ["user1", "user2"]} - Specific user exclusion
-- {"exclude_domains": ["corporate.com"]} - Exclude business domains
```

#### 5. PromotionTierEligibility Table (for Type 3: Tier-Specific Coupons)

Maps which subscription tiers can use which coupons.

```sql
CREATE TABLE promotion_tier_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupon(id) ON DELETE CASCADE,

  current_tier VARCHAR(50) NOT NULL,  -- "free", "pro", "enterprise_pro", "perpetual"
  target_tier VARCHAR(50) NOT NULL,  -- Can upgrade FROM current TO target

  -- Eligibility
  is_eligible BOOLEAN DEFAULT true,
  reason_ineligible VARCHAR(255),

  -- Tier Transition Specifics
  max_discount_months INT,
  discount_percentage DECIMAL(5,2),
  discount_fixed_amount DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Examples:
-- free → pro_max (50% off 3mo) - Type 3 coupon
-- free → perpetual ($79 price) - Type 5 coupon
-- pro → enterprise_pro (30% off annual) - Type 3 coupon
```

### Summary Statistics Table (for Analytics)

```sql
CREATE TABLE coupon_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupon(id),
  date DATE NOT NULL,

  -- Metrics
  redemption_count INT DEFAULT 0,
  total_discount_amount DECIMAL(12,2) DEFAULT 0,
  unique_users INT DEFAULT 0,

  -- Conversion metrics
  trial_conversions INT DEFAULT 0,
  upgrade_conversions INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(coupon_id, date)
);
```

---

## Validation Logic & Rules

### Coupon Validity Check Algorithm

```typescript
interface CouponValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  discount_amount: number;
  applicable_duration_months: number;
}

async function validateCoupon(
  couponCode: string,
  userId: string,
  subscriptionData: {
    currentTier: string;
    targetTier: string;
    billingCycle: 'monthly' | 'annual';
    monthlyPrice: number;
  }
): Promise<CouponValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isValid = true;

  // Step 1: Check if coupon exists
  const coupon = await db.coupon.findUnique({ where: { code: couponCode } });
  if (!coupon) {
    return { is_valid: false, errors: ["Coupon code not found"], warnings: [], discount_amount: 0, applicable_duration_months: 0 };
  }

  // Step 2: Check if coupon is active
  if (!coupon.is_active) {
    errors.push("Coupon has been deactivated");
    isValid = false;
  }

  // Step 3: Check validity period
  const now = new Date();
  if (now < coupon.valid_from) {
    errors.push(`Coupon is not yet valid. Valid from ${coupon.valid_from.toLocaleDateString()}`);
    isValid = false;
  }
  if (now > coupon.valid_until) {
    errors.push(`Coupon has expired. Valid until ${coupon.valid_until.toLocaleDateString()}`);
    isValid = false;
  }

  // Step 4: Check tier applicability
  if (coupon.applicable_tiers && !coupon.applicable_tiers.includes(subscriptionData.targetTier)) {
    errors.push(`Coupon is not valid for ${subscriptionData.targetTier} tier`);
    isValid = false;
  }

  // Step 5: Check tier-specific transitions (Type 3)
  if (coupon.type === 'tier_specific') {
    const eligibility = await db.promotion_tier_eligibility.findFirst({
      where: {
        coupon_id: coupon.id,
        current_tier: subscriptionData.currentTier,
        target_tier: subscriptionData.targetTier
      }
    });
    if (!eligibility || !eligibility.is_eligible) {
      errors.push(`Cannot use this coupon for ${subscriptionData.currentTier} → ${subscriptionData.targetTier} upgrade`);
      isValid = false;
    }
  }

  // Step 6: Check billing cycle applicability
  if (coupon.applicable_billing_cycles && !coupon.applicable_billing_cycles.includes(subscriptionData.billingCycle)) {
    errors.push(`Coupon is only valid for ${coupon.applicable_billing_cycles.join('/')} billing`);
    isValid = false;
  }

  // Step 7: Check user usage limits
  const userRedemptionCount = await db.coupon_redemption.count({
    where: { coupon_id: coupon.id, user_id: userId }
  });

  if (coupon.max_per_customer && userRedemptionCount >= coupon.max_per_customer) {
    errors.push(`You have already used this coupon (limit: ${coupon.max_per_customer})`);
    isValid = false;
  }

  // Step 8: Check global usage limit
  if (coupon.max_discount_applications) {
    const totalRedemptions = await db.coupon_redemption.count({
      where: { coupon_id: coupon.id }
    });
    if (totalRedemptions >= coupon.max_discount_applications) {
      errors.push("Coupon has reached maximum redemptions");
      isValid = false;
    }
  }

  // Step 9: Check campaign budget
  if (coupon.campaign_id) {
    const campaign = await db.campaign.findUnique({ where: { id: coupon.campaign_id } });
    if (campaign && campaign.budget_cap) {
      const discountAmount = calculateDiscount(coupon, subscriptionData);
      const newSpend = campaign.current_spend + discountAmount;
      if (newSpend > campaign.budget_cap) {
        warnings.push("Campaign budget is nearly exhausted. Coupon may become unavailable soon.");
      }
    }
  }

  // Step 10: Check custom validation rules
  const rules = await db.coupon_validation_rule.findMany({
    where: { coupon_id: coupon.id, is_active: true }
  });

  for (const rule of rules) {
    const ruleValid = await checkValidationRule(rule, userId, subscriptionData);
    if (!ruleValid.is_valid) {
      errors.push(ruleValid.error);
      isValid = false;
    }
  }

  // Step 11: Calculate discount amount
  const discountAmount = calculateDiscount(coupon, subscriptionData);
  const applicableDuration = coupon.max_discount_months || 1;

  // Step 12: Check for fraud signals
  const fraudCheck = await checkFraudSignals(coupon, userId);
  if (fraudCheck.isSuspicious) {
    warnings.push(`Coupon usage flagged for review: ${fraudCheck.reasons.join(', ')}`);
    // Note: Don't block, but flag for later review
  }

  return {
    is_valid: isValid && errors.length === 0,
    errors,
    warnings,
    discount_amount: discountAmount,
    applicable_duration_months: applicableDuration
  };
}
```

### Discount Calculation Logic

```typescript
function calculateDiscount(
  coupon: Coupon,
  subscriptionData: { targetTier: string; monthlyPrice: number; billingCycle: 'monthly' | 'annual' }
): number {
  const basePrice = subscriptionData.billingCycle === 'annual'
    ? subscriptionData.monthlyPrice * 12
    : subscriptionData.monthlyPrice;

  switch (coupon.type) {
    case 'percentage': {
      const monthsToDiscount = coupon.max_discount_months || 1;
      const monthlyDiscount = (basePrice * coupon.discount_percentage) / 100;
      return monthlyDiscount * monthsToDiscount;
    }

    case 'fixed_amount': {
      // Fixed amount applies to total purchase (annual or monthly)
      return Math.min(coupon.discount_amount, basePrice);
    }

    case 'tier_specific': {
      // Find the specific rule for this tier transition
      const percentage = coupon.discount_percentage || 0;
      const monthsToDiscount = coupon.max_discount_months || 1;
      const monthlyDiscount = (basePrice * percentage) / 100;
      return monthlyDiscount * monthsToDiscount;
    }

    case 'duration_bonus': {
      // No immediate discount, but add free months (valued at base price)
      return basePrice * coupon.bonus_duration_months;
    }

    case 'perpetual_migration': {
      // Return the discount on perpetual plan price
      const perpetualPrice = 199; // Standard perpetual plan price
      if (coupon.perpetual_discount_type === 'percentage') {
        return (perpetualPrice * coupon.perpetual_discount_value) / 100;
      } else {
        return coupon.perpetual_discount_value;
      }
    }

    default:
      return 0;
  }
}
```

### Fraud Detection Rules

```typescript
interface FraudSignal {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-100
}

async function checkFraudSignals(
  coupon: Coupon,
  userId: string,
  ipAddress?: string,
  deviceFingerprint?: string
): Promise<FraudSignal> {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check 1: Velocity abuse (multiple redemptions in short time)
  const recentRedemptions = await db.coupon_redemption.findMany({
    where: {
      user_id: userId,
      created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }
  });
  if (recentRedemptions.length >= 3) {
    reasons.push("Multiple coupon redemptions in 24 hours");
    riskScore += 30;
  }

  // Check 2: High-value coupon stacking
  const highValueRedemptions = recentRedemptions.filter(r => r.discount_applied_amount > 50);
  if (highValueRedemptions.length >= 2) {
    reasons.push("Stacking high-value coupons");
    riskScore += 25;
  }

  // Check 3: IP switching (same user, multiple IPs in short period)
  if (ipAddress) {
    const ips = await db.coupon_redemption.findMany({
      where: { user_id: userId },
      select: { ip_address: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    const uniqueIps = new Set(ips.map(r => r.ip_address).filter(Boolean));
    if (uniqueIps.size >= 3) {
      reasons.push("Multiple IP addresses for same user");
      riskScore += 20;
    }
  }

  // Check 4: Known bad patterns
  const isBotPattern = await checkBotPatternDetection(userId);
  if (isBotPattern) {
    reasons.push("Bot-like usage pattern detected");
    riskScore += 35;
  }

  // Check 5: Duplicate device fingerprints
  if (deviceFingerprint) {
    const duplicateDevices = await db.coupon_redemption.count({
      where: {
        device_fingerprint: deviceFingerprint,
        user_id: { not: userId }
      }
    });
    if (duplicateDevices > 5) {
      reasons.push("Device used by many users");
      riskScore += 20;
    }
  }

  return {
    isSuspicious: riskScore > 40,
    reasons,
    riskScore
  };
}
```

---

## Checkout Integration

### Coupon Application Flow

```
1. User selects subscription tier + billing cycle
2. System displays base price
3. User enters coupon code
4. System validates coupon (checks all rules)
5. If valid:
   - Display discount amount
   - Show final price
   - Apply coupon ID to checkout session
6. If invalid:
   - Show error message with reason
   - Allow user to retry or proceed without coupon
7. User confirms payment
8. System processes payment with discount
9. Create CouponRedemption record
10. Update campaign spending
11. Update coupon usage count
12. Log audit trail
```

### Checkout UI Components

**Coupon Input Field:**
```jsx
<div className="coupon-input-container">
  <label>Coupon Code (Optional)</label>
  <input
    type="text"
    placeholder="Enter coupon code"
    onChange={(e) => handleCouponInput(e.target.value)}
    disabled={isProcessing}
  />
  <button onClick={validateCoupon} className="apply-btn">
    Apply Coupon
  </button>

  {/* Validation states */}
  {validationState === 'valid' && (
    <div className="success-banner">
      <CheckIcon />
      <span>Coupon applied! You save ${discountAmount.toFixed(2)}</span>
    </div>
  )}

  {validationState === 'invalid' && (
    <div className="error-banner">
      <ErrorIcon />
      <span>{validationError}</span>
    </div>
  )}
</div>
```

**Price Summary (with coupon):**
```jsx
<div className="price-summary">
  <div className="line-item">
    <span>Pro Max Annual</span>
    <span>$588.00</span>
  </div>

  {appliedCoupon && (
    <div className="line-item discount">
      <span>
        Discount ({appliedCoupon.code})
        <button onClick={removeCoupon} className="remove-btn">×</button>
      </span>
      <span>-${discountAmount.toFixed(2)}</span>
    </div>
  )}

  <div className="divider" />

  <div className="line-item total">
    <span>Total Due</span>
    <span className="amount">${finalPrice.toFixed(2)}</span>
  </div>

  {appliedCoupon && (
    <div className="savings-message">
      You're saving ${discountAmount.toFixed(2)}! (Offer expires {coupon.valid_until.toLocaleDateString()})
    </div>
  )}
</div>
```

### Server-Side Checkout Logic

```typescript
async function processCheckoutWithCoupon(
  userId: string,
  checkoutData: {
    tier: string;
    billingCycle: 'monthly' | 'annual';
    couponCode?: string;
  },
  paymentInfo: StripePaymentDetails
): Promise<SubscriptionResult> {
  // Validate coupon if provided
  let appliedDiscount = 0;
  let couponId: string | null = null;

  if (checkoutData.couponCode) {
    const validation = await validateCoupon(
      checkoutData.couponCode,
      userId,
      {
        currentTier: (await getUserCurrentTier(userId)) || 'free',
        targetTier: checkoutData.tier,
        billingCycle: checkoutData.billingCycle,
        monthlyPrice: getTierPrice(checkoutData.tier)
      }
    );

    if (!validation.is_valid) {
      throw new BadRequestError('Invalid coupon: ' + validation.errors[0]);
    }

    appliedDiscount = validation.discount_amount;
    couponId = (await db.coupon.findUnique({ where: { code: checkoutData.couponCode } }))?.id;
  }

  // Calculate final price
  const basePrice = getTierPrice(checkoutData.tier) *
    (checkoutData.billingCycle === 'annual' ? 12 : 1);
  const finalPrice = Math.max(0, basePrice - appliedDiscount);

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(finalPrice * 100), // Convert to cents
    currency: 'usd',
    customer: paymentInfo.stripeCustomerId,
    description: `Subscription: ${checkoutData.tier} (${checkoutData.billingCycle})`
  });

  // Process payment
  const paymentResult = await processStripePayment(paymentIntent, paymentInfo);

  if (paymentResult.status !== 'succeeded') {
    throw new PaymentFailedError('Payment processing failed');
  }

  // Create subscription in database (within transaction)
  const subscription = await db.$transaction(async (tx) => {
    // Create new subscription
    const newSubscription = await tx.subscription.create({
      data: {
        user_id: userId,
        tier: checkoutData.tier,
        billing_cycle: checkoutData.billingCycle,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: addMonths(new Date(), checkoutData.billingCycle === 'annual' ? 12 : 1),
        stripe_subscription_id: paymentResult.subscriptionId
      }
    });

    // Record coupon redemption
    if (couponId) {
      await tx.coupon_redemption.create({
        data: {
          coupon_id: couponId,
          user_id: userId,
          subscription_id: newSubscription.id,
          redemption_type: 'new_subscription',
          discount_applied_amount: appliedDiscount,
          order_value_before_discount: basePrice,
          order_value_after_discount: finalPrice,
          ip_address: getClientIp(),
          user_agent: getUserAgent(),
          device_fingerprint: getDeviceFingerprint(),
          processed_at: new Date()
        }
      });

      // Update coupon campaign spending
      const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
      if (coupon?.campaign_id) {
        await tx.campaign.update({
          where: { id: coupon.campaign_id },
          data: { current_spend: { increment: appliedDiscount } }
        });
      }
    }

    // Allocate credits based on tier
    const creditsAllocation = getCreditAllocationForTier(checkoutData.tier);
    await tx.user_credit.create({
      data: {
        user_id: userId,
        amount: creditsAllocation,
        expires_at: addMonths(new Date(), checkoutData.billingCycle === 'annual' ? 12 : 1),
        source: 'subscription'
      }
    });

    return newSubscription;
  });

  // Send confirmation email
  await sendConfirmationEmail(userId, {
    subscription,
    discount: appliedDiscount,
    couponCode: checkoutData.couponCode
  });

  return { success: true, subscription };
}
```

---

## Admin UI Features

### 1. Coupon Management Dashboard

**Main Coupon List View:**
```
[Search] [Filter] [Create New Coupon]

| Code | Type | Discount | Tiers | Redemptions | Spend | Status | Actions |
|------|------|----------|-------|-------------|-------|--------|---------|
| JULY4LIBERTY | % | 25% off | Pro, Pro Max | 342/500 | $4,275 | Active | Edit / Pause / Analytics |
| BLACKFRIDAY50 | % | 50% 3mo | Pro Max | 158/1000 | $3,864 | Active | Edit / Pause / Analytics |
| COMEBACK30 | Fixed | $30 credit | All | 89/∞ | $2,670 | Active | Edit / Pause / Analytics |
| NEWUSER40 | Tier | 40% off | Free→Pro Max | 0/∞ | $0 | Planning | Edit / Activate |
```

**Coupon Creation Form:**
- Code: "JULY4LIBERTY"
- Type: Dropdown (Percentage / Fixed / Tier-Specific / Duration / Perpetual)
- Discount: 25% or $20 (dynamic based on type)
- Applicable Tiers: Multi-select checkboxes
- Applicable Billing Cycles: Monthly / Annual / Both
- Valid Period: Date range picker
- Max Applications: Number input (unlimited by default)
- Max Per Customer: Number input (default: 1)
- Max Per Month: Abuse prevention limit
- Campaign: Dropdown to select campaign
- Description: Text area for customer-facing messaging
- Internal Notes: Text area for admin notes

### 2. Campaign Management Dashboard

**Campaign Calendar View:**
```
November 2025

[S] [M] [T] [W] [T] [F] [S]
                        1    LAUNCH DAY
2  3  4  5  6  7  8
9  10 11 12 13 14 15   ←Thanksgiving (15-27)
16 17 18 19 20 21 22
23 24 25 26 27 28 29   ←Black Friday (27-29)
30
```

**Active Campaigns List:**
```
| Campaign | Period | Budget | Spend | % Used | Status | Coupons | Revenue | Actions |
|----------|--------|--------|-------|--------|--------|---------|---------|---------|
| Thanksgiving | Nov 15-27 | $50K | $34.2K | 68% | Active | 3 | $48.5K | Pause / Edit / Analytics |
| July 4 | Jul 1-5 | $30K | $28.9K | 96% | Ended | 2 | $42.1K | View |
| Back to School | Aug 15-Sep 5 | $25K | $24.8K | 99% | Ended | 2 | $38.3K | View |
```

**Campaign Details:**
- Name, Type (Holiday/Marketing/Behavioral/Referral)
- Start/End dates with time selectors
- Target audience filters
- Primary goal selector
- Expected vs. actual revenue comparison
- Budget cap with spending progress bar
- Campaign status (Planning / Active / Paused / Ended)
- Linked coupons list with individual metrics
- Performance charts (revenue over time, redemption trend)

### 3. Analytics Dashboard

**Real-Time Metrics:**
```
[24 Hours] [This Week] [This Month] [Custom Range]

┌─────────────────────────────────────────────────────┐
│  Total Redemptions: 4,352                           │
│  Average Discount: $12.40 per user                  │
│  Total Discount Spend: $53,984                      │
│  Revenue Impact: +$287,450 (5.2% of MRR)            │
│  Conversion Lift: +28% vs. non-coupon baseline      │
└─────────────────────────────────────────────────────┘
```

**Coupon Performance Table:**
```
| Coupon | Redemptions | Conv.Rate | Avg.Discount | Total Spend | ROI |
|--------|-------------|-----------|--------------|-------------|-----|
| JULY4LIBERTY | 342 | 23% | $12.50 | $4,275 | 8.9x |
| BLACKFRIDAY50 | 158 | 31% | $24.45 | $3,864 | 5.2x |
| COMEBACK30 | 89 | 18% | $30.00 | $2,670 | 3.1x |
```

**Campaign ROI Analysis:**
- Budget Spent vs. Revenue Generated chart
- Cost per Acquisition (CPA) by campaign
- Customer Lifetime Value (LTV) impact by campaign
- Tier distribution of conversions (Free→Pro, Pro→Pro Max, etc.)
- Cohort analysis (customers acquired via campaign perform X% better)

### 4. Fraud Detection & Monitoring

**Flagged Redemptions:**
```
| User | Coupon | Amount | Flags | Risk | Status | Actions |
|------|--------|--------|-------|------|--------|---------|
| user_123 | JULY4LIBERTY | $12.50 | Velocity abuse | High | Auto-Blocked | Review / Approve / Block |
| user_456 | COMEBACK30 | $30.00 | IP switching | Medium | Flagged | Review / Approve |
| user_789 | BLACKFRIDAY50 | $24.45 | Bot-like pattern | Low | Flagged | Review / Approve |
```

**Bulk Actions for Flagged Redemptions:**
- Approve selected redemptions (remove flag)
- Block selected redemptions (reverse discount)
- Export fraudulent users to block list

### 5. Coupon Lifecycle Management

**Pause Active Coupon:**
- Toggle button: Active ↔ Paused
- Reason dropdown (budget cap reached, manual pause, fraud spike)
- Notification to active users (email: "Coupon expired")

**Archive Expired Coupon:**
- Auto-archive when valid_until < now
- View archived coupons separately
- Export historical data (CSV/JSON)

**Clone Campaign:**
- Button to clone previous successful campaign
- Pre-fill with same coupons/dates but next year
- Adjust discount/budget as needed

---

## Marketing Campaign Templates

### Template 1: July 4 Independence Day Campaign

**Campaign Overview:**
```
Name: July 4 Liberty Deal
Period: July 1-5 (5 days)
Goal: Drive summer conversion wave
Budget: $30,000
Expected Revenue: $42,000-$55,000
```

**Coupons:**
1. **LIBERTY15** - Pro tier, 15% off annual
2. **LIBERTY25** - Pro Max tier, 25% off annual
3. **LIBERTYBYOK** - Perpetual Plan, 20% off ($159)

**Email Sequence:**
- **Day 0 (June 30)**: Teaser email "Something big is coming..."
- **Day 1 (July 1)**: Launch email with all 3 coupon codes
- **Day 3 (July 3)**: Reminder "Only 2 days left to save"
- **Day 5 (July 5)**: Last chance email "Ends tonight at midnight"
- **Day 6 (July 6)**: Post-campaign "Missed out? Here's $10 credit"

**Landing Page Copy:**
```
Headline: "Celebrate Freedom with 25% Off"
Subheadline: "This July 4th, claim your independence from limited AI access.
Use code LIBERTY25 and save 25% on Pro Max annual subscription."

Callout: "Valid July 1-5 only. Don't miss out on summer productivity."

Tier Benefits:
- Pro: $15.20/mo (was $19) - LIBERTY15
- Pro Max: $36.75/mo (was $49) - LIBERTY25
- Perpetual: $159 (was $199) - LIBERTYBYOK
```

**Targeting:**
- Free tier users (30+ days, not converted)
- Trial users expiring July 1-31
- Lapsed subscribers (churned 30-180 days ago)

**Success Metrics:**
- Free→Pro conversion: 500+ new subs
- Pro→Pro Max upgrade: 200+ users
- Free→Perpetual BYOK: 50+ licenses
- Total revenue: $42K-$55K

---

### Template 2: Black Friday / Cyber Monday Campaign

**Campaign Overview:**
```
Name: Black Friday & Cyber Monday Blowout
Period: Nov 27 - Dec 2 (6 days)
Goal: Maximize holiday quarter revenue
Budget: $80,000
Expected Revenue: $120,000-$180,000
```

**Phased Approach:**

**Phase 1: Early Access (Nov 24-26, Sunday-Tuesday)**
- Email subscribers: "Early access starts Nov 27"
- Coupon: BFEARLY (30% off any tier, 3 months)
- Goal: Reward loyal customers early

**Phase 2: Black Friday (Nov 27, Wednesday)**
- Teaser: Countdown email
- Launch: 50% off Pro Max first 3 months (BFMAX50)
- Flash sale: Every hour, different tier featured
- Goal: Drive urgency

**Phase 3: Cyber Monday (Nov 30, Saturday)**
- Coupon: CYBERMON40 (40% off any tier, annual)
- Bundle: Pro Max + 3 months free (BUNDLE2025)
- Goal: Capture last-minute decision-makers

**Phase 4: Cleanup (Dec 1-2, Sunday-Monday)**
- Final reminder: "Deals end tonight"
- Coupon: LASTCHANCE25 (25% off, while supplies last)
- Goal: Maximize any remaining budget

**Coupons:**
1. **BFEARLY**: 30% off 3 months (early access, Nov 24-26)
2. **BFMAX50**: 50% off Pro Max 3 months (Black Friday)
3. **CYBERMON40**: 40% off annual any tier (Cyber Monday)
4. **BUNDLE2025**: Pro Max annual + 3mo free (both phases)
5. **LASTCHANCE25**: 25% off (cleanup, Dec 1-2)

**Targeting Segments:**
- **Segment A** (Urgent buyers): Free tier, high usage (80%+ quota), not converted
- **Segment B** (Upgraders): Pro tier, heavy usage, ready for Pro Max
- **Segment C** (Perpetual): Free/Pro users interested in BYOK (separate email)
- **Segment D** (Win-back): Churned subscribers, last purchase > 6 months

**Email Frequency:**
- Day -1: Teaser
- Day 0: Launch (50% off alert)
- Day +2: Cyber Monday kickoff
- Day +4: Final reminder
- Day +6: Post-campaign, offer $10 credit to non-converters

**Landing Page Strategy:**
- Dynamic pricing based on coupon applied
- Countdown timer (psychological urgency)
- Social proof ("1,234 users already saved 50%")
- FAQ section addressing top objections
- Mobile-optimized for shopping on phone

**Expected Results:**
- 2,000-3,000 new paid subscriptions
- 500+ Pro→Pro Max upgrades
- 300+ Free→Perpetual conversions
- Average order value: $60-$80
- Total revenue: $120K-$180K

---

### Template 3: Referral Campaign (Ongoing)

**Campaign Overview:**
```
Name: Refer a Friend - Earn Credits
Duration: Ongoing (no end date)
Goal: Viral growth through word-of-mouth
CAC Target: $15 (vs. $40+ paid acquisition)
```

**Mechanics:**

**For Referrer (Existing Customer):**
- Unique referral link: `rephlo.com/ref/username123`
- Reward: $20 credit when friend subscribes
- Bonus: Refer 5 friends → 1 free month Pro Max
- Tracking dashboard: See referral history and earnings

**For Referred Friend (New Customer):**
- Promo code: Auto-generated, applied to checkout
- Discount: $15 off first month (tier-agnostic)
- Messaging: "Your friend [Name] thinks you'll love this"
- Email: "Join [Name]'s network and get $15 off"

**Technology Implementation:**
```
Referral Links:
- Base: rephlo.com/ref/{userId}
- With tier targeting: rephlo.com/ref/{userId}?tier=pro_max
- Campaign source: rephlo.com/ref/{userId}?source=email

Attribution:
- First-click: Referrer earns reward when referred friend creates account
- Subscribed: Referrer reward applies when friend completes payment
- Revocation: If referred user churns within 30 days, reward voided

Fraud Prevention:
- Max 1 referral per friend email
- Max 20 referrals per month per user
- Flagged if same IP as referrer
- Manual review if reward requests spike
```

**Marketing Assets:**
- Email template: Referral link with personalized message
- In-app referral widget: Copy link, share via email/social
- Landing page: Referral program details, leaderboard
- Share buttons: Twitter, LinkedIn, Facebook, Slack

**Leaderboard (Social Proof):**
```
Top Referrers This Month
1. Sarah Chen - 8 referrals - $160 credit
2. Alex Martinez - 6 referrals - $120 credit
3. Jordan Lee - 5 referrals - $100 credit (+ 1 free month bonus)
4. Casey Wilson - 4 referrals - $80 credit
5. Taylor Brown - 3 referrals - $60 credit
```

**Expected Results:**
- Viral coefficient: 0.15 (each customer brings 0.15 new customers)
- Monthly referral-sourced customers: 400-600
- CAC via referral: $15 (excellent compared to $40+ paid)
- Referred customers LTV: +15% (stay longer due to social connection)

---

### Template 4: Win-Back Campaign

**Campaign Overview:**
```
Name: We Miss You – Come Back!
Trigger: Subscription churned 30+ days ago
Duration: 30-day window per user
Goal: Recover 15-25% of churned revenue
Repeat: Quarterly win-back cycles
```

**Segmentation:**

**Segment A: Recently Churned (30-90 days ago)**
- Offer: 50% off first month to reactivate
- Urgency: 7-day validity
- Expected recovery rate: 20-30%

**Segment B: Medium-Term Churn (90-180 days ago)**
- Offer: $30 credit toward any tier
- Urgency: 14-day validity
- Expected recovery rate: 10-15%

**Segment C: Long-Term Lapsed (180+ days ago)**
- Offer: 25% off annual subscription
- Messaging: "We've improved so much since you left..."
- Urgency: 21-day validity
- Expected recovery rate: 5-10%

**Email Sequence:**

**Email 1 (Day 0): Emotional Re-engagement**
```
Subject: "We've missed you, [Name]"

Hello [Name],

It's been [X] days since your [Tier] subscription ended, and we have to admit –
we miss you. You were doing amazing things with Rephlo, and the platform just
isn't the same without your [usage pattern].

Here's what's new since you left:
- [Feature 1]: [Benefit]
- [Feature 2]: [Benefit]
- [Feature 3]: [Benefit]

We'd love to have you back. As a welcome-back gift, we're offering you
**50% off your first month**. Just use code COMEBACK50 at checkout.

This offer is valid for 7 days only.

Miss you,
The Rephlo Team

P.S. Questions? Reply to this email – we're here to help.
```

**Email 2 (Day 4): Urgency + Social Proof**
```
Subject: "Your 50% discount expires in 3 days"

[Show statistics of what they've missed]
"Since you left, community members have used Rephlo to:"
- 450,000+ API calls
- Average 28% time savings on creative tasks
- 95% satisfaction rating on Claude 3.5 Sonnet model

Ready to rejoin?
Code COMEBACK50 – 50% off for 7 days. Don't miss out.

[Testimonials from active users similar to them]
```

**Email 3 (Day 7): Final Chance**
```
Subject: "Last chance – your 50% discount expires today"

Last reminder, [Name].

This is your final day to use code COMEBACK50 for 50% off.

If you're hesitating, let me ask: what would it take to bring you back?
- Missing a feature? Let us know.
- Price concern? We can discuss options.
- Better timing? Set a reminder to come back next month.

Reply to this email – I'm here to help.

Best,
[Customer Success Manager]
```

**Post-Campaign (Day 8): Alternative Offer**
```
Subject: "Offer expired – but here's something else"

I see you didn't use the 50% discount code. No worries!

Here's another option:
- $30 credit toward any subscription (code COMEBACK30)
- Valid for 14 days
- No strings attached – use it for 1 month or longer

Sometimes the timing just isn't right, and that's okay. We'll be here whenever
you're ready to come back.

[Include referral offer: "Know someone who could benefit? Refer them and earn $20."]
```

**Landing Page for Win-Back Campaign:**
```
Headline: "Welcome Back, [Name]! We've Grown"

Subheadline: "50% off your first month with code COMEBACK50"

Key Updates Since You Left:
- New Models: [List 5 most popular new models]
- Feature Upgrades: [List 3 major features added]
- Community Growth: [X users, X daily active users]
- Performance Improvements: [Speed, reliability improvements]

Your Previous Usage:
"Last month you were on [Tier] and used [X] credits with these models: [List]"

Ready to Get Back?
[Big CTA Button: "Reactivate Now – 50% Off"]

Alternative:
"Rather just keep in touch?"
[Subscribe to newsletter]
```

**Expected Results:**
- Win-back recovery rate: 15-25% of churned users
- Average reactivation value: $35-$50
- Repeat win-back revenue: $10K-$15K per quarterly cycle
- Annual win-back revenue: $40K-$60K

---

## Proration Handling for Coupons

### Scenario 1: Coupon Applied at New Subscription (Standard)

**No proration needed** – coupon applies to base price before payment.

```
Example:
- User subscribes to Pro ($19/month) on Nov 15
- Applies coupon: CONVERT25 (25% off first month)
- Base price: $19
- Discount: 25% × $19 = -$4.75
- Final charge: $14.25
- Next billing: Dec 15 at full price ($19)
```

### Scenario 2: Coupon Applied During Mid-Cycle Subscription

**Proration required** – pro-rate the discount across remaining billing period.

```
Example:
- User on Pro ($19/month), subscribed Oct 1, billing Nov 1
- On Oct 20 (Day 20 of 31-day cycle), applies coupon: UPGRADE20 (20% off Pro Max)
- Wishes to upgrade: Pro → Pro Max ($49/month)
- Current period: Oct 1 - Oct 31 (31 days)
- Days remaining after upgrade: Oct 20-31 (11 days)
- Days already used: Oct 1-19 (19 days)

Proration Calculation:
1. Unused credit from Pro: (11 / 31) × $19 = $6.74
2. Pro Max prorated cost: (11 / 31) × $49 = $17.32
3. Coupon discount on new tier: 20% × $49 = $9.80
4. Discount applied to remaining period: (11 / 31) × $9.80 = $3.47
5. Net amount due: $17.32 - $6.74 - $3.47 = $7.11

Action: Charge $7.11 today, renew Pro Max on Nov 1 at full $49
```

### Scenario 3: Coupon with Multi-Month Duration

**Example: Type 1 coupon – "50% off for 3 months"**

```
User on Free tier, applies: UPGRADE50 (50% off Pro Max, 3 months)
Upgrade on: Nov 15 (mid-month)

Billing Schedule:
- Month 1 (Nov 15-Dec 14): 30 days at 50% off
- Month 2 (Dec 15-Jan 14): 30 days at 50% off
- Month 3 (Jan 15-Feb 14): 30 days at 50% off
- Month 4+ (Feb 15+): Full price ($49)

Pricing:
- Month 1: (30 / 30) × $49 × 50% = $24.50
- Month 2: $24.50
- Month 3: $24.50
- Month 4: $49.00

Charge Timeline:
- Day 0 (Nov 15): Charge $24.50 (Month 1)
- Day 30 (Dec 15): Charge $24.50 (Month 2) - Auto-renew
- Day 60 (Jan 15): Charge $24.50 (Month 3) - Auto-renew
- Day 90 (Feb 15): Charge $49.00 (Month 4) - Full price
```

### Scenario 4: Downgrade During Coupon Period

**Coupon discount partially voids** – refund unused portion.

```
Scenario:
- Nov 1: User upgrades Free → Pro Max with PROMO50 (50% off, 3 months)
- Charges: $24.50 (50% of $49)
- Nov 15: User downgrade to Pro (midway through month)
- Days used: 15 days
- Days remaining: 15 days

Proration:
- Already charged for 30 days Pro Max: $24.50
- Used 15 days: (15 / 30) × $24.50 = $12.25
- Unused: $24.50 - $12.25 = $12.25
- Pro monthly: $19/month
- Pro prorated for 15 days: (15 / 30) × $19 = $9.50
- Amount owed for Pro: $9.50
- Credit to customer: $12.25 - $9.50 = $2.75

Action:
- Refund $2.75 to payment method OR
- Apply $2.75 as credit to next billing cycle
- Next renewal: Dec 1 at Pro full price ($19)
```

### Scenario 5: Upgrade + Duration Bonus Coupon

**Example: "Upgrade Pro Max, get 3 months free (13 months for annual price)"**

```
User on Pro ($19/month, yearly), wants to upgrade to Pro Max
Applies: UPGRADE3MO (3 months free with upgrade)
Upgrade date: Nov 15 (mid-cycle of annual renewal)

Original subscription:
- Pro annual: $228 (12 × $19)
- Renewal date: Jan 1 (next year)
- Days remaining: 47 days (Nov 15 - Dec 31)

Proration & Upgrade:
- Unused Pro credit: (47 / 365) × $228 = $29.36
- Pro Max annual: $588 (12 × $49)
- Bonus months: 3 months = (3 / 12) × $588 = $147
- Total value: $588 + $147 = $735 (13 months)

Charge calculation:
- Pro Max annual cost: $588
- Less unused Pro credit: -$29.36
- Plus bonus benefit (already included): $0 (no additional charge)
- Amount due: $588 - $29.36 = $558.64

New billing schedule:
- Current through: Dec 31 (existing commitment)
- New annual cycle: Jan 1 - Dec 31 (13 months of service)
- Next renewal: Jan 1 at $588/year

Messaging to user:
"Your upgrade is confirmed! You've been credited $29.36 for your remaining Pro time,
and you'll receive 3 bonus months. You're now getting 13 months of Pro Max service
for the annual price."
```

### Proration Algorithm (General)

```typescript
interface ProrationResult {
  unused_credit_from_old_tier: number;
  prorated_charge_new_tier: number;
  coupon_discount_amount: number;
  total_charge_today: number;
  new_renewal_date: Date;
}

function calculateMidCycleProration(
  currentSubscription: {
    tier: string;
    monthlyPrice: number;
    current_period_start: Date;
    current_period_end: Date;
  },
  upgradeData: {
    new_tier: string;
    new_monthly_price: number;
    coupon_id?: string;
    coupon_discount_type?: 'percentage' | 'fixed_amount';
    coupon_discount_value?: number;
    coupon_duration_months?: number;
  }
): ProrationResult {
  const now = new Date();
  const totalDays = daysBetween(currentSubscription.current_period_start, currentSubscription.current_period_end);
  const daysUsed = daysBetween(currentSubscription.current_period_start, now);
  const daysRemaining = totalDays - daysUsed;

  // Calculate unused credit from current tier
  const unusedCreditFromOld =
    (daysRemaining / totalDays) * currentSubscription.monthlyPrice;

  // Calculate prorated charge for new tier
  const proratedChargeForNew =
    (daysRemaining / totalDays) * upgradeData.new_monthly_price;

  // Apply coupon discount (if provided)
  let couponDiscountAmount = 0;
  if (upgradeData.coupon_id) {
    if (upgradeData.coupon_discount_type === 'percentage') {
      couponDiscountAmount =
        (daysRemaining / totalDays) * upgradeData.new_monthly_price *
        (upgradeData.coupon_discount_value / 100);
    } else {
      couponDiscountAmount =
        Math.min(upgradeData.coupon_discount_value, proratedChargeForNew);
    }
  }

  // Calculate total charge
  const totalChargeToday = Math.max(0, proratedChargeForNew - unusedCreditFromOld - couponDiscountAmount);

  // New renewal date (next billing cycle)
  const newRenewalDate = addMonths(currentSubscription.current_period_end, 1);

  return {
    unused_credit_from_old_tier: unusedCreditFromOld,
    prorated_charge_new_tier: proratedChargeForNew,
    coupon_discount_amount: couponDiscountAmount,
    total_charge_today: totalChargeToday,
    new_renewal_date: newRenewalDate
  };
}
```

---

## Analytics & Reporting

### Key Performance Indicators (KPIs)

#### Coupon-Level KPIs

| Metric | Definition | Target | Calculation |
|--------|-----------|--------|-------------|
| Redemption Rate | % of generated codes used | 30-50% | Redemptions / Generated |
| Conversion Rate | % of redeemed coupons → paid subscriptions | 25-40% | Paid Subscriptions / Redemptions |
| Discount per Redemption | Average discount amount per use | $12-20 | Total Discount / Redemptions |
| Customer Acquisition Cost (CAC) | Cost to acquire customer via coupon | <$30 | (Campaign Budget) / New Customers |
| Return on Ad Spend (ROAS) | Revenue per $1 spent on campaign | 3-5x | Revenue / Campaign Spend |
| Tier Upgrade Rate | % of conversions that upgrade tiers | 15-25% | Free→Pro+ / Total Conversions |

#### Campaign-Level KPIs

| Metric | Definition | Target | Formula |
|--------|-----------|--------|---------|
| Campaign Revenue | Total revenue from campaign | $30K-$100K+ | Sum of all conversions |
| Campaign ROI | Return on marketing investment | 200-400% | (Revenue - Budget) / Budget |
| Budget Utilization | % of campaign budget spent | 85-95% | Actual Spend / Budget Cap |
| New Customer Volume | Number of new paid customers | Varies | Count of new subscriptions |
| Avg Order Value (AOV) | Average subscription value | $60-$100 | Campaign Revenue / New Customers |
| Churn Rate (Cohort) | Churn of customers from campaign | <3%/mo | Cancelled / New Customers |

#### Fraud-Related KPIs

| Metric | Target | Action |
|--------|--------|--------|
| Flagged Redemptions | <2% | Review risky patterns |
| False Positive Rate | <15% | Adjust fraud thresholds |
| Actual Fraud Loss | <0.5% of redemptions | Implement stronger controls |
| Bot Detection Accuracy | >95% | Improve ML model |

### Analytics Dashboard Visualization

**Real-Time Campaign Metrics:**
```
[Today] [This Week] [This Month] [All Time]

┌────────────────────────────────────────────────────────────┐
│ Campaign Performance                                         │
├────────────────────────────────────────────────────────────┤
│ Revenue:        $48,500        (Target: $50,000) [97%]     │
│ Redemptions:    4,352          (Target: 5,000) [87%]       │
│ New Customers:  612            (Target: 700) [87%]         │
│ Avg Order Value: $79.20        (Target: $80) [99%]         │
│ ROI:            285%            (Target: 250%) [✓]          │
│ CAC:            $13.10          (Target: <$30) [✓]          │
└────────────────────────────────────────────────────────────┘
```

**Coupon Comparison Chart:**
```
Revenue by Coupon (This Month)

JULY4LIBERTY     |████████░░░ $42,100 (35%)
BLACKFRIDAY50    |███████░░░░ $35,200 (29%)
COMEBACK30       |████░░░░░░░ $19,800 (16%)
NEWUSER40        |███░░░░░░░░ $14,900 (12%)
REFERRAL20       |██░░░░░░░░░ $8,000 (7%)
                 └──────────────────────
                 Total: $120,000
```

**Campaign Timeline:**
```
2025 Campaign Calendar with Revenue Impact

Jan       |        |        |        |        |        | $8.2K
Feb       |  💘    |        |        |        |        | $12.1K
Mar       |        |        |        |        |        | $6.5K
Apr       |        |        |        |        |        | $5.9K
May       | 🌞     |        |        |        |        | $14.3K
Jun       |        |        |        |        |        | $7.1K
Jul       | 🎆     |        |        |        |        | $42.1K
Aug       | 🎓     |        |        |        |        | $28.4K
Sep       |        |        |        |        |        | $8.7K
Oct       |        |        |        |        |        | $6.2K
Nov       |        | 🦃     | 🛍️     |        |        | $85.3K
Dec       |  ❄️    |        |        |        |        | $48.9K
                                            YTD: $273.7K
```

**Tier Distribution:**
```
Conversions by Tier (This Campaign)

Free → Pro Max:      ███████░░░ 45%  (275 users)
Free → Pro:          ██████░░░░ 32%  (195 users)
Pro → Pro Max:       ███░░░░░░░ 16%  (98 users)
Free → Perpetual:    ██░░░░░░░░ 7%   (44 users)
                     └────────────
                     Total: 612 users
```

---

## Implementation Phases

### Phase 1: Database Schema & Core Infrastructure (Weeks 1-2)

**Tasks:**
- [ ] Create all 5 main tables (coupon, campaign, redemption, validation_rule, eligibility)
- [ ] Create indexes for performance
- [ ] Create migration scripts
- [ ] Set up analytics tables (coupon_stats_daily)
- [ ] Create audit logging table

**Deliverables:**
- Database migrations in `backend/prisma/migrations/`
- Updated `schema.prisma` with all coupon entities
- Seed data with example coupons & campaigns

**Acceptance Criteria:**
- All tables created and indexed
- Migrations reversible
- Test data loads successfully
- <50ms query performance on large datasets

---

### Phase 2: Validation Logic & Backend Services (Weeks 3-4)

**Tasks:**
- [ ] Implement `CouponService` with validation algorithm
- [ ] Implement fraud detection service
- [ ] Implement `CampaignService` for CRUD operations
- [ ] Implement redemption tracking service
- [ ] Add caching layer for coupon lookups

**Deliverables:**
- `backend/src/services/coupon.service.ts` (500+ lines)
- `backend/src/services/campaign.service.ts`
- `backend/src/services/fraud-detection.service.ts`
- Unit tests (95%+ coverage)

**Acceptance Criteria:**
- All validation rules working
- Fraud detection accuracy >95%
- 99%+ test coverage on services
- Performance: <100ms per validation

---

### Phase 3: API Endpoints (Weeks 5-6)

**Tasks:**
- [ ] Create `/v1/coupons/validate` endpoint
- [ ] Create `/v1/coupons/redeem` endpoint
- [ ] Create `/admin/coupons/*` endpoints (CRUD)
- [ ] Create `/admin/campaigns/*` endpoints (CRUD)
- [ ] Update checkout flow to integrate coupons

**Deliverables:**
- `backend/src/routes/coupons.routes.ts`
- `backend/src/routes/admin-coupons.routes.ts`
- `backend/src/controllers/coupons.controller.ts`
- API documentation (OpenAPI spec)

**Acceptance Criteria:**
- All endpoints tested with Supertest
- Error handling complete
- Rate limiting applied
- <200ms response time per endpoint

---

### Phase 4: Admin UI (Weeks 7-8)

**Tasks:**
- [ ] Create coupon management page
- [ ] Create campaign management dashboard
- [ ] Create analytics dashboard
- [ ] Create fraud detection monitoring UI
- [ ] Create coupon creation wizard

**Deliverables:**
- `frontend/src/pages/admin/CouponManagement.tsx`
- `frontend/src/pages/admin/CampaignManagement.tsx`
- `frontend/src/pages/admin/CouponAnalytics.tsx`
- Reusable components (CouponTable, CampaignForm, etc.)

**Acceptance Criteria:**
- All CRUD operations working
- Real-time analytics updating
- Mobile responsive
- <3s load time on dashboards

---

### Phase 5: Checkout Integration (Weeks 9-10)

**Tasks:**
- [ ] Implement coupon input field in checkout
- [ ] Implement real-time coupon validation (as user types)
- [ ] Integrate with Stripe proration logic
- [ ] Update order summary to show discount
- [ ] Add confirmation emails with coupon details

**Deliverables:**
- Updated checkout flow
- New `/v1/checkout/apply-coupon` endpoint
- Email templates with discount details
- Proration calculation service

**Acceptance Criteria:**
- Coupon applies correctly at checkout
- Proration calculates accurately
- Confirmation emails sent
- All tiers work with coupons

---

### Phase 6: Campaign Templates & Marketing Tools (Weeks 11-12)

**Tasks:**
- [ ] Create campaign templates (holiday, behavioral, referral)
- [ ] Implement campaign scheduling
- [ ] Create email campaign integration
- [ ] Create landing page templates for campaigns
- [ ] Implement A/B testing framework

**Deliverables:**
- Campaign template library
- Scheduling service
- Email integration with SendGrid/Mailgun
- Landing page builder
- A/B testing analytics

**Acceptance Criteria:**
- 5+ campaign templates ready to use
- Scheduling works accurately
- Emails send at right times
- A/B test results trackable

---

### Phase 7: Analytics & Reporting (Weeks 13-14)

**Tasks:**
- [ ] Build analytics dashboard (real-time metrics)
- [ ] Implement cohort analysis (LTV by source)
- [ ] Create reporting exports (CSV, PDF)
- [ ] Implement fraud detection dashboard
- [ ] Create KPI tracking system

**Deliverables:**
- Advanced analytics dashboard
- Automated report generation
- Fraud monitoring alerts
- KPI tracking system

**Acceptance Criteria:**
- <1s dashboard load time
- Reports accurate and exportable
- Fraud alerts working
- KPI tracking real-time

---

### Phase 8: Testing & QA (Weeks 15-16)

**Tasks:**
- [ ] Write end-to-end tests for full coupon flow
- [ ] Load testing (1000+ concurrent coupon validations)
- [ ] Security testing (SQL injection, fraud attempts)
- [ ] Accessibility testing (admin UI)
- [ ] Documentation & training materials

**Deliverables:**
- E2E test suite (200+ tests)
- Load test report
- Security audit report
- Admin training videos

**Acceptance Criteria:**
- All tests passing
- Load test: >1000 req/s
- Zero critical security issues
- 100+ tests passing

---

### Phase 9: Pre-Launch & Monitoring Setup (Weeks 17-18)

**Tasks:**
- [ ] Set up monitoring & alerting
- [ ] Create rollback procedures
- [ ] Set up fraud monitoring alerts
- [ ] Train support team on coupon system
- [ ] Create runbooks for common issues

**Deliverables:**
- Monitoring dashboards (Datadog/New Relic)
- Alert rules (high fraud rate, failed validations, etc.)
- Support documentation
- Runbooks for on-call team

**Acceptance Criteria:**
- All metrics monitored
- Alerts configured
- Support team trained
- Runbooks documented

---

### Phase 10: Soft Launch & Optimization (Weeks 19-20)

**Tasks:**
- [ ] Soft launch with limited campaigns
- [ ] Monitor for issues
- [ ] Gather customer feedback
- [ ] Optimize based on real data
- [ ] Full feature launch

**Deliverables:**
- First campaigns live
- Performance metrics collected
- Optimization recommendations
- Full system ready

**Acceptance Criteria:**
- System stable under load
- No critical bugs
- Users can use coupons end-to-end
- Ready for full marketing push

**Total Timeline**: 20 weeks (5 months)

---

## Risk Management

### Risk 1: Coupon Code Abuse / Fraud

**Risk**: Users exploit coupons by sharing codes, creating fake accounts, or circumventing restrictions.

**Impact**: High (could cost $50K+ in lost revenue per campaign)

**Mitigation:**
- Rate limiting on validation requests (max 10 validations per user per hour)
- Device fingerprinting to detect multi-account abuse
- IP reputation checking
- Velocity scoring (multiple redemptions from same IP = suspicious)
- Manual fraud review queue for high-risk redemptions
- Require email verification before coupon use

**Monitoring:**
- Dashboard showing redemption patterns
- Alerts for unusual velocity (>5 per IP in 1 hour)
- Weekly fraud review meeting
- Automated bot detection

---

### Risk 2: Revenue Leakage from Over-Discounting

**Risk**: Campaign budgets depleted faster than expected, or campaigns running too long driving excessive discounts.

**Impact**: Medium ($20K-$100K revenue impact per campaign)

**Mitigation:**
- Strict budget caps per campaign
- Redemption rate limits (max X redemptions per day)
- Budget tracking dashboard (color-coded: green <70%, yellow 70-85%, red >85%)
- Admin alerts when 70% of budget spent
- Auto-pause campaigns when budget exhausted
- Weekly budget review meetings with marketing

**Monitoring:**
- Real-time budget tracking
- Spend vs. revenue ROI calculations
- Campaign performance vs. forecasts
- Automated budget alerts

---

### Risk 3: Proration Calculation Errors

**Risk**: Incorrect discount calculations leading to customer disputes, refunds, or under-charging.

**Impact**: Medium (reputational + operational cost)

**Mitigation:**
- Comprehensive proration test suite (50+ test cases)
- Manual spot-check of proration calculations (audit 5% of transactions)
- Customer-facing breakdown of proration (show math in confirmation)
- Grace period for disputes (easy refund within 48 hours)
- Clear documentation of proration rules
- Training for support team

**Monitoring:**
- Proration error rate tracking
- Customer dispute tracking
- Monthly manual audit of sample transactions
- Test coverage >95% for proration logic

---

### Risk 4: System Performance Degradation

**Risk**: High coupon validation traffic causing slow checkout or API responses.

**Impact**: High (abandoned checkouts, lost conversions)

**Mitigation:**
- Cache coupon lookups (Redis, 5-min TTL)
- Batch coupon validation during off-peak
- Database query optimization (indexes on code, campaign, valid dates)
- CDN for static coupon lists
- Load testing before each campaign launch
- Auto-scaling for API servers during peak traffic

**Monitoring:**
- API response time tracking
- Validation latency dashboard
- Database query performance
- Cache hit rate tracking
- Load test results archived

---

### Risk 5: Campaign Timing Conflicts

**Risk**: Multiple campaigns running simultaneously with conflicting discounts, or scheduling mistakes.

**Impact**: Low (customer confusion, reduced trust)

**Mitigation:**
- Campaign calendar view showing conflicts
- Validation rules preventing overlapping campaigns (except approved)
- Clear hierarchy of discounts (best offer wins)
- Campaign status workflow (Planning → Review → Approved → Active)
- Scheduling dry-run before activation
- Marketing sign-off required before launch

**Monitoring:**
- Campaign overlap detection
- Scheduling accuracy logs
- Customer complaint tracking

---

### Risk 6: Database Scaling Issues

**Risk**: Coupon and redemption tables grow too large (millions of rows), impacting query performance.

**Impact**: High (system slowdown, potential outages)

**Mitigation:**
- Partition redemption tables by date (monthly partitions)
- Archive old redemptions (>1 year) to separate database
- Create selective indexes (avoid full table scans)
- Implement data retention policy (purge old analytics after 2 years)
- Regular database optimization (VACUUM, ANALYZE)
- Load testing with realistic data volumes

**Monitoring:**
- Database size tracking
- Query execution time trends
- Index fragmentation monitoring
- Regular capacity planning reviews

---

## Success Metrics

### Business Metrics

| Metric | Target | Year 1 Projection |
|--------|--------|------------------|
| Campaign Revenue | $250K-$400K | 15-20% of annual MRR |
| New Customer Volume | 3,000-5,000 | 25-35% of new paid customers |
| Conversion Improvement | +30% vs. baseline | From 10% → 13%+ |
| Avg Campaign ROI | 250-350% | $1 spent = $3-4 revenue |
| Referral Program CAC | <$20 | 50% cheaper than paid ads |
| Win-Back Recovery Rate | 15-25% | Recover $30K-$50K/cycle |

### Customer Experience Metrics

| Metric | Target |
|--------|--------|
| Coupon Discovery Rate | >30% of users aware of current offers |
| Coupon Redemption Rate | 35-50% of generated codes used |
| Customer Satisfaction | >4.5/5 on checkout experience |
| Support Tickets (coupon-related) | <2% of total tickets |
| Fraud Detection Accuracy | >95% (minimize false positives) |

### Operational Metrics

| Metric | Target |
|--------|--------|
| Campaign Setup Time | <2 hours from concept to live |
| Coupon Validation Latency | <100ms per validation |
| System Uptime | >99.95% (especially checkout) |
| False Positive Rate | <15% (fraud detection) |
| Admin Dashboard Load Time | <3 seconds |

---

## Conclusion

The Coupon & Discount Code System provides Rephlo with flexible, powerful promotional capabilities integrated seamlessly into both web and desktop platforms. With proper implementation, configuration, and monitoring, this system will drive 15-20% annual revenue growth through strategic promotions while maintaining pricing integrity and fraud prevention.

**Key Implementation Success Factors:**
1. **Robust validation** – Prevent fraud and errors before they happen
2. **Real-time analytics** – Make data-driven campaign decisions
3. **Admin flexibility** – Enable marketing to launch campaigns quickly
4. **Customer clarity** – Show discounts transparently to avoid disputes
5. **Operational monitoring** – Catch issues before they impact customers

**Next Steps:**
1. Review and approve this plan with stakeholders
2. Create implementation task tickets for each phase
3. Assign engineering team leads to each phase
4. Schedule weekly status reviews during implementation
5. Begin Phase 1 database schema design

---

**Document End**

