# Pricing Tier Restructure Plan

**Date**: 2025-11-15
**Status**: Planning
**Priority**: High
**Related**: Credit conversion rate change (x1000 → x100)

---

## Executive Summary

Comprehensive plan to restructure Rephlo's pricing tiers with new pricing points, introduce Pro+ tier, and align credit allocations with the x100 conversion rate (1 credit = $0.01 USD).

### Key Changes
- ✅ Update credit conversion rate impact (x1000 → x100)
- ✅ New pricing structure with 5 consumer tiers + 2 enterprise tiers (coming soon)
- ✅ Introduction of Pro+ tier ($45/month)
- ✅ Adjusted pricing for Pro, Pro Max, and Enterprise tiers
- ✅ Enterprise tiers marked as "Coming Soon"

---

## New Pricing Structure

### Consumer Tiers (Available Now)

| Tier | Price/Month | Credits/Month | Dollar Value | Margin Model | Status |
|------|-------------|---------------|--------------|--------------|--------|
| **Free** | $0 | 200 | $2 | Loss leader | ✅ Active |
| **Pro** | $15 | 1,500 | $15 | Break-even | ✅ Active |
| **Pro+** | $45 | 5,000 | $50 | 1.11x margin | 🆕 New |
| **Pro Max** | $199 | 25,000 | $250 | 1.26x margin | ✅ Active |

### Enterprise Tiers (Coming Soon)

| Tier | Price/Month | Credits/Month | Dollar Value | Margin Model | Status |
|------|-------------|---------------|--------------|--------------|--------|
| **Enterprise Pro** | $30 | 3,500 | $35 | 1.17x margin | 🔜 Coming Soon |
| **Enterprise Pro+** | $90 | 11,000 | $110 | 1.22x margin | 🔜 Coming Soon |

### Credit Calculation with x100 Conversion

**Formula**: `credits = ceil(vendorCost × marginMultiplier × 100)`

**Example for Pro tier**:
- User request: GPT-4o (1000 input + 2000 output tokens)
- Vendor cost: (1000 × $0.005/1k) + (2000 × $0.015/1k) = $0.035
- Margin multiplier: 1.5x (Pro tier)
- Credits deducted: ceil($0.035 × 1.5 × 100) = ceil(5.25) = **6 credits**

---

## Tier Features Comparison

### Free Tier
**Pricing**: $0/month
**Credits**: 200 credits/month ($2 worth of API usage)

**Features**:
- ✅ Access to basic models (GPT-3.5 Turbo, Claude 3 Haiku, Gemini Flash)
- ✅ Standard rate limiting (10 req/min)
- ✅ 1 concurrent request
- ✅ 30-day usage history
- ❌ No rollover credits
- ❌ No priority processing
- ❌ Community support only

**Use Case**: Testing, casual users, 5-10 transformations/month

---

### Pro Tier
**Pricing**: $15/month (was $19)
**Credits**: 1,500 credits/month ($15 worth of API usage)

**Features**:
- ✅ Access to pro-tier models (GPT-4, GPT-4o, Claude 3.5 Sonnet, Gemini Pro)
- ✅ Elevated rate limiting (30 req/min)
- ✅ 3 concurrent requests
- ✅ Rollover up to 750 credits (1 month)
- ✅ Priority processing (1.5x faster)
- ✅ 90-day usage history
- ✅ Email support (24-48h response)
- ✅ Desktop app priority updates

**Use Case**: Regular users, content creators, 100-150 transformations/month

**Margin Analysis**:
- Revenue: $15/month
- Credit value: $15 (break-even model)
- Margin multiplier: 1.0x (after-costs)
- Strategy: Volume play, upsell to Pro+

---

### Pro+ Tier 🆕 NEW
**Pricing**: $45/month
**Credits**: 5,000 credits/month ($50 worth of API usage)

**Features**:
- ✅ All Pro features
- ✅ Access to premium models (GPT-4 Turbo, Claude 3 Opus)
- ✅ High rate limiting (60 req/min)
- ✅ 5 concurrent requests
- ✅ Rollover up to 2,500 credits (3 months)
- ✅ High-priority processing (2x faster)
- ✅ 180-day usage history
- ✅ Priority email support (12-24h response)
- ✅ Advanced analytics dashboard
- ✅ API access (beta)

**Use Case**: Power users, developers, small teams, 400-500 transformations/month

**Margin Analysis**:
- Revenue: $45/month
- Credit value: $50
- Gross margin: $5 profit (11% margin)
- Strategy: Sweet spot for most power users

---

### Pro Max Tier
**Pricing**: $199/month (was $49)
**Credits**: 25,000 credits/month ($250 worth of API usage)

**Features**:
- ✅ All Pro+ features
- ✅ Access to ALL models including enterprise-grade
- ✅ Premium rate limiting (120 req/min)
- ✅ 10 concurrent requests
- ✅ Rollover up to 12,500 credits (6 months)
- ✅ Ultra-priority processing (3x faster)
- ✅ Unlimited usage history
- ✅ Priority support (4-8h response)
- ✅ Full API access
- ✅ Dedicated account manager
- ✅ Custom model fine-tuning (coming soon)

**Use Case**: Heavy users, agencies, medium teams, 2,000-2,500 transformations/month

**Margin Analysis**:
- Revenue: $199/month
- Credit value: $250
- Gross margin: $51 profit (26% margin)
- Strategy: Premium positioning for serious users

---

### Enterprise Pro Tier 🔜 COMING SOON
**Pricing**: $30/month
**Credits**: 3,500 credits/month ($35 worth of API usage)

**Features**:
- ✅ All Pro+ features
- ✅ Team management (up to 5 users)
- ✅ Centralized billing
- ✅ Usage analytics per user
- ✅ SSO integration
- ✅ Priority enterprise support (8h response)
- ✅ SLA guarantee (99.5% uptime)
- ✅ SAML/OAuth integration

**Use Case**: Small teams (3-5 people), startups

**Availability**: Q2 2026

---

### Enterprise Pro+ Tier 🔜 COMING SOON
**Pricing**: $90/month
**Credits**: 11,000 credits/month ($110 worth of API usage)

**Features**:
- ✅ All Enterprise Pro features
- ✅ Team management (up to 15 users)
- ✅ Advanced security controls
- ✅ Custom rate limits
- ✅ Dedicated infrastructure
- ✅ Priority enterprise support (4h response)
- ✅ SLA guarantee (99.9% uptime)
- ✅ Custom contracts available

**Use Case**: Medium teams (10-15 people), agencies

**Availability**: Q2 2026

---

## Credit Allocation Rationale

### Conversion Rate Impact

**Old System (x1000)**:
- 1 credit = $0.001
- Free tier: 2,000 credits = $2 value
- Pro tier: 10,000 credits = $10 value

**New System (x100)**:
- 1 credit = $0.01
- Free tier: 200 credits = $2 value ✅
- Pro tier: 1,500 credits = $15 value ✅

### Why These Specific Credit Amounts?

#### Free Tier: 200 Credits
- **Dollar value**: $2
- **Rationale**:
  - Enough for 15-20 basic transformations
  - Low enough to prevent abuse
  - Entices upgrade to Pro
- **Typical usage**: ~10 GPT-3.5 Turbo requests (200 input + 300 output tokens each)

#### Pro Tier: 1,500 Credits
- **Dollar value**: $15
- **Rationale**:
  - Break-even pricing (builds customer base)
  - Competitive entry point
  - Clear upsell path to Pro+
- **Typical usage**: ~100 GPT-4o requests (500 input + 800 output tokens each)

#### Pro+ Tier: 5,000 Credits 🆕
- **Dollar value**: $50
- **Rationale**:
  - 11% gross margin ($5 profit)
  - Balances value and profitability
  - Ideal for power users who don't need Pro Max
- **Typical usage**: ~350 GPT-4o requests or ~150 Claude 3 Opus requests

#### Pro Max Tier: 25,000 Credits
- **Dollar value**: $250
- **Rationale**:
  - 26% gross margin ($51 profit)
  - Premium positioning
  - High value for heavy users
- **Typical usage**: ~1,750 GPT-4o requests or ~750 Claude 3 Opus requests

#### Enterprise Pro: 3,500 Credits
- **Dollar value**: $35
- **Rationale**:
  - Team-oriented pricing
  - 17% gross margin ($5 profit)
  - Competitive for small teams
- **Typical usage**: 5-person team, ~70 requests/person/month

#### Enterprise Pro+: 11,000 Credits
- **Dollar value**: $110
- **Rationale**:
  - Medium team pricing
  - 22% gross margin ($20 profit)
  - Scales to larger teams
- **Typical usage**: 15-person team, ~70 requests/person/month

---

## Implementation Plan

### Phase 1: Database & Schema Updates (Week 1)

#### 1.1 Update Prisma Schema
**File**: `backend/prisma/schema.prisma`

```prisma
enum SubscriptionTier {
  free
  pro
  pro_plus      // NEW
  pro_max
  enterprise_pro       // NEW (coming soon)
  enterprise_pro_plus  // NEW (coming soon)
}
```

**Migration**: Add new enum values to `SubscriptionTier`

#### 1.2 Update Seed Data
**File**: `backend/prisma/seed.ts`

```typescript
const tierConfig = {
  free: {
    creditsPerMonth: 200,        // Updated from 100
    priceCents: 0,
    billingInterval: 'monthly',
    status: 'active',
  },
  pro: {
    creditsPerMonth: 1500,       // Updated from 10000
    priceCents: 1500,            // Updated from 9999 ($15)
    billingInterval: 'monthly',
    status: 'active',
  },
  pro_plus: {                    // NEW
    creditsPerMonth: 5000,
    priceCents: 4500,            // $45
    billingInterval: 'monthly',
    status: 'active',
  },
  pro_max: {
    creditsPerMonth: 25000,      // NEW value
    priceCents: 19900,           // Updated from 4900 ($199)
    billingInterval: 'monthly',
    status: 'active',
  },
  enterprise_pro: {              // NEW (coming soon)
    creditsPerMonth: 3500,
    priceCents: 3000,            // $30
    billingInterval: 'monthly',
    status: 'coming_soon',       // NEW status
  },
  enterprise_pro_plus: {         // NEW (coming soon)
    creditsPerMonth: 11000,
    priceCents: 9000,            // $90
    billingInterval: 'monthly',
    status: 'coming_soon',       // NEW status
  },
};
```

#### 1.3 Update Seed Additions
**File**: `backend/prisma/seed-additions-token-credit.ts` (line 287)

```typescript
// Determine initial credits based on tier
let initialCredits = 200;  // Changed from 2000 (Free tier default)
const activeSubscription = user.subscriptions[0];

if (activeSubscription) {
  initialCredits = activeSubscription.creditsPerMonth;
}
```

---

### Phase 2: Backend API Updates (Week 1-2)

#### 2.1 Update TypeScript Types
**File**: `backend/src/types/subscription.types.ts`

```typescript
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PRO_PLUS = 'pro_plus',        // NEW
  PRO_MAX = 'pro_max',
  ENTERPRISE_PRO = 'enterprise_pro',         // NEW
  ENTERPRISE_PRO_PLUS = 'enterprise_pro_plus', // NEW
}

export interface TierFeatures {
  tier: SubscriptionTier;
  displayName: string;
  price: number;
  creditsPerMonth: number;
  rateLimit: number;            // requests per minute
  concurrentRequests: number;
  rolloverMonths: number;
  processingSpeed: number;      // multiplier (1x, 1.5x, 2x, 3x)
  historyRetentionDays: number;
  supportSLA: string;
  features: string[];
  status: 'active' | 'coming_soon';  // NEW
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    displayName: 'Free',
    price: 0,
    creditsPerMonth: 200,
    rateLimit: 10,
    concurrentRequests: 1,
    rolloverMonths: 0,
    processingSpeed: 1.0,
    historyRetentionDays: 30,
    supportSLA: 'Community',
    features: ['Basic models', 'Standard rate limiting', '1 concurrent request'],
    status: 'active',
  },
  [SubscriptionTier.PRO]: {
    tier: SubscriptionTier.PRO,
    displayName: 'Pro',
    price: 15,
    creditsPerMonth: 1500,
    rateLimit: 30,
    concurrentRequests: 3,
    rolloverMonths: 1,
    processingSpeed: 1.5,
    historyRetentionDays: 90,
    supportSLA: '24-48h',
    features: ['Pro models', 'Priority processing', 'Email support'],
    status: 'active',
  },
  [SubscriptionTier.PRO_PLUS]: {  // NEW
    tier: SubscriptionTier.PRO_PLUS,
    displayName: 'Pro+',
    price: 45,
    creditsPerMonth: 5000,
    rateLimit: 60,
    concurrentRequests: 5,
    rolloverMonths: 3,
    processingSpeed: 2.0,
    historyRetentionDays: 180,
    supportSLA: '12-24h',
    features: ['Premium models', 'High-priority processing', 'API access (beta)', 'Advanced analytics'],
    status: 'active',
  },
  [SubscriptionTier.PRO_MAX]: {
    tier: SubscriptionTier.PRO_MAX,
    displayName: 'Pro Max',
    price: 199,
    creditsPerMonth: 25000,
    rateLimit: 120,
    concurrentRequests: 10,
    rolloverMonths: 6,
    processingSpeed: 3.0,
    historyRetentionDays: 365,
    supportSLA: '4-8h',
    features: ['All models', 'Ultra-priority processing', 'Full API access', 'Dedicated account manager'],
    status: 'active',
  },
  [SubscriptionTier.ENTERPRISE_PRO]: {  // NEW
    tier: SubscriptionTier.ENTERPRISE_PRO,
    displayName: 'Enterprise Pro',
    price: 30,
    creditsPerMonth: 3500,
    rateLimit: 60,
    concurrentRequests: 5,
    rolloverMonths: 3,
    processingSpeed: 2.0,
    historyRetentionDays: 180,
    supportSLA: '8h',
    features: ['Team management (5 users)', 'SSO', 'Centralized billing', '99.5% SLA'],
    status: 'coming_soon',
  },
  [SubscriptionTier.ENTERPRISE_PRO_PLUS]: {  // NEW
    tier: SubscriptionTier.ENTERPRISE_PRO_PLUS,
    displayName: 'Enterprise Pro+',
    price: 90,
    creditsPerMonth: 11000,
    rateLimit: 120,
    concurrentRequests: 10,
    rolloverMonths: 6,
    processingSpeed: 3.0,
    historyRetentionDays: 365,
    supportSLA: '4h',
    features: ['Team management (15 users)', 'Advanced security', 'Custom rate limits', '99.9% SLA'],
    status: 'coming_soon',
  },
};
```

#### 2.2 Update Rate Limiting Configuration
**File**: `backend/src/middleware/rate-limit.middleware.ts`

```typescript
export const TIER_RATE_LIMITS: Record<SubscriptionTier, RateLimitConfig> = {
  [SubscriptionTier.FREE]: {
    windowMs: 60000,      // 1 minute
    maxRequests: 10,
    message: 'Free tier: 10 requests per minute. Upgrade to Pro for 30 req/min.',
  },
  [SubscriptionTier.PRO]: {
    windowMs: 60000,
    maxRequests: 30,
    message: 'Pro tier: 30 requests per minute. Upgrade to Pro+ for 60 req/min.',
  },
  [SubscriptionTier.PRO_PLUS]: {  // NEW
    windowMs: 60000,
    maxRequests: 60,
    message: 'Pro+ tier: 60 requests per minute. Upgrade to Pro Max for 120 req/min.',
  },
  [SubscriptionTier.PRO_MAX]: {
    windowMs: 60000,
    maxRequests: 120,
    message: 'Pro Max tier: 120 requests per minute limit.',
  },
  [SubscriptionTier.ENTERPRISE_PRO]: {  // NEW
    windowMs: 60000,
    maxRequests: 60,
    message: 'Enterprise Pro: 60 requests per minute.',
  },
  [SubscriptionTier.ENTERPRISE_PRO_PLUS]: {  // NEW
    windowMs: 60000,
    maxRequests: 120,
    message: 'Enterprise Pro+: 120 requests per minute.',
  },
};
```

#### 2.3 Update Subscription Service
**File**: `backend/src/services/subscription.service.ts`

Add logic to filter out "coming soon" tiers from user-facing APIs:

```typescript
async getAvailableTiers(): Promise<TierFeatures[]> {
  const allTiers = Object.values(TIER_FEATURES);

  // Filter out coming soon tiers for regular users
  const availableTiers = allTiers.filter(tier => tier.status === 'active');

  return availableTiers;
}

async getAllTiersIncludingComingSoon(): Promise<TierFeatures[]> {
  // For admin panel or pricing page display
  return Object.values(TIER_FEATURES);
}
```

#### 2.4 Update Pricing Config (Margin Multipliers)
**File**: `backend/prisma/seed-additions-token-credit.ts`

```typescript
const pricingConfigs = [
  {
    scopeType: 'tier',
    subscriptionTier: SubscriptionTier.free,
    marginMultiplier: 2.0,        // 50% margin (abuse prevention)
    targetGrossMarginPercent: 50.0,
  },
  {
    scopeType: 'tier',
    subscriptionTier: SubscriptionTier.pro,
    marginMultiplier: 1.0,        // Break-even (volume play)
    targetGrossMarginPercent: 0.0,
  },
  {
    scopeType: 'tier',
    subscriptionTier: SubscriptionTier.pro_plus,  // NEW
    marginMultiplier: 1.1,        // 10% margin
    targetGrossMarginPercent: 10.0,
  },
  {
    scopeType: 'tier',
    subscriptionTier: SubscriptionTier.pro_max,
    marginMultiplier: 1.25,       // 25% margin (premium)
    targetGrossMarginPercent: 25.0,
  },
  {
    scopeType: 'tier',
    subscriptionTier: SubscriptionTier.enterprise_pro,  // NEW
    marginMultiplier: 1.15,       // 15% margin
    targetGrossMarginPercent: 15.0,
  },
  {
    scopeType: 'tier',
    subscriptionTier: SubscriptionTier.enterprise_pro_plus,  // NEW
    marginMultiplier: 1.20,       // 20% margin
    targetGrossMarginPercent: 20.0,
  },
];
```

---

### Phase 3: Frontend Updates (Week 2)

#### 3.1 Update Pricing Page
**File**: `frontend/src/pages/Pricing.tsx`

```typescript
import { TIER_FEATURES, SubscriptionTier } from '@/types/subscription.types';

const PricingPage = () => {
  const tiers = Object.values(TIER_FEATURES);

  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>

      {/* Active Tiers */}
      <div className="tier-grid">
        {tiers.filter(t => t.status === 'active').map(tier => (
          <PricingCard key={tier.tier} tier={tier} />
        ))}
      </div>

      {/* Coming Soon Section */}
      <div className="coming-soon-section">
        <h2>Enterprise Plans - Coming Q2 2026</h2>
        <div className="tier-grid-disabled">
          {tiers.filter(t => t.status === 'coming_soon').map(tier => (
            <PricingCard key={tier.tier} tier={tier} disabled />
          ))}
        </div>
      </div>
    </div>
  );
};

const PricingCard = ({ tier, disabled = false }) => {
  return (
    <div className={`pricing-card ${disabled ? 'coming-soon' : ''}`}>
      <div className="tier-header">
        <h3>{tier.displayName}</h3>
        {disabled && <span className="badge">Coming Soon</span>}
        {tier.tier === SubscriptionTier.PRO_PLUS && (
          <span className="badge badge-new">New!</span>
        )}
      </div>

      <div className="tier-price">
        <span className="price">${tier.price}</span>
        <span className="period">/month</span>
      </div>

      <div className="tier-credits">
        <strong>{tier.creditsPerMonth.toLocaleString()} credits</strong>
        <span className="value">(${tier.creditsPerMonth / 100} worth)</span>
      </div>

      <ul className="features">
        {tier.features.map(feature => (
          <li key={feature}>✓ {feature}</li>
        ))}
      </ul>

      <button
        className="cta-button"
        disabled={disabled}
      >
        {disabled ? 'Notify Me' : 'Choose Plan'}
      </button>
    </div>
  );
};
```

#### 3.2 Update Shared Types
**File**: `shared-types/src/subscription.types.ts`

Sync the TypeScript types with backend definitions.

---

### Phase 4: Testing & Validation (Week 2-3)

#### 4.1 Database Migration Testing
```bash
# Backup current database
cd backend
npm run db:backup

# Run migration
npm run prisma:migrate

# Verify schema
npm run prisma:studio

# Run seed
npm run db:reset

# Verify tier data
psql -d rephlo-dev -c "SELECT tier, credits_per_month, price_cents FROM subscription;"
```

#### 4.2 API Testing
```bash
# Test tier retrieval
curl http://localhost:7150/api/tiers

# Test subscription creation
curl -X POST http://localhost:7150/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro_plus"}'

# Verify coming soon tiers are filtered
curl http://localhost:7150/api/tiers/available
```

#### 4.3 Credit Deduction Testing
**Test cases**:
1. Free user with 200 credits → Make API call → Verify correct deduction
2. Pro user with 1,500 credits → Make API call → Verify 1.0x multiplier
3. Pro+ user with 5,000 credits → Make API call → Verify 1.1x multiplier
4. Pro Max user with 25,000 credits → Verify 1.25x multiplier
5. Verify enterprise tiers cannot be subscribed to (coming soon status)

#### 4.4 Rate Limiting Testing
**Test cases**:
1. Free: 11 requests in 1 minute → Should be rate limited
2. Pro: 31 requests in 1 minute → Should be rate limited
3. Pro+: 61 requests in 1 minute → Should be rate limited
4. Pro Max: 121 requests in 1 minute → Should be rate limited

---

### Phase 5: Documentation Updates (Week 3)

#### 5.1 Update Plan 109
**File**: `docs/plan/109-rephlo-desktop-monetization-moderation-plan.md`

Replace old pricing structure with new tiers, mark enterprise as coming soon.

#### 5.2 Create Migration Guide
**File**: `docs/guides/019-pricing-migration-guide.md`

Document how existing users will be migrated:
- Current Free users → Stay on Free (200 credits)
- Current Pro users → Migrate to new Pro ($15, 1,500 credits)
- Current Pro Max users → TBD (communicate via email)

#### 5.3 Update API Documentation
**File**: `docs/reference/api-documentation.md`

Update subscription endpoints, tier enums, response examples.

---

## Migration Strategy for Existing Users

### Scenario 1: Current Free Users
- **Current**: 100 credits/month
- **New**: 200 credits/month
- **Action**: Automatic upgrade (2x credits)
- **Communication**: In-app notification "We've doubled your monthly credits!"

### Scenario 2: Current Pro Users ($99.99/month, 10,000 credits)
- **Option A**: Downgrade to Pro Max ($199/month, 25,000 credits)
  - 2.5x credits for 2x price
  - Better value overall
- **Option B**: Grandfather clause (keep $99.99 for 10,000 credits for 6 months)
  - Phase out gradually
  - Offer upgrade discount to Pro Max
- **Recommendation**: Option B with 6-month grace period

### Scenario 3: New Users (After Launch)
- Start with new pricing structure
- Clear tier differentiation
- Pro+ positioned as "most popular"

---

## Rollout Timeline

### Week 1: Backend Preparation
- ✅ Update Prisma schema
- ✅ Create migration
- ✅ Update seed data
- ✅ Test database changes locally

### Week 2: API & Frontend Updates
- ✅ Update backend types and services
- ✅ Update rate limiting
- ✅ Update frontend pricing page
- ✅ Create "Coming Soon" UI components
- ✅ Integration testing

### Week 3: Testing & Documentation
- ✅ Comprehensive API testing
- ✅ Frontend E2E testing
- ✅ Update documentation
- ✅ Create migration guides

### Week 4: Soft Launch (Beta)
- ✅ Deploy to staging
- ✅ Test with beta users (10-20 users)
- ✅ Monitor credit deductions
- ✅ Gather feedback

### Week 5: Production Deployment
- ✅ Deploy to production
- ✅ Migrate existing users
- ✅ Send announcement emails
- ✅ Monitor metrics

---

## Success Metrics

### Revenue Metrics (90 days post-launch)
- **Target Average Revenue Per User (ARPU)**: $35/month (up from current $25)
- **Pro+ Adoption Rate**: 20% of new paid subscribers
- **Pro Max Upgrade Rate**: 5% of Pro+ users
- **Churn Rate**: <5% (monitor for pricing shock)

### Usage Metrics
- **Credit Utilization Rate**: 70-85% (healthy usage without waste)
- **Pro+ Feature Usage**: API access >40%, Analytics >60%
- **Support Ticket Volume**: <10% increase (ensure smooth migration)

### Customer Satisfaction
- **Net Promoter Score (NPS)**: >40
- **Pricing Satisfaction**: >4.0/5.0
- **Perceived Value**: "Good value" >70% of Pro+ users

---

## Risk Mitigation

### Risk 1: Existing User Backlash
- **Mitigation**: 6-month grandfather clause for current Pro users
- **Communication**: Transparent email explaining changes and added value
- **Offer**: 20% lifetime discount for loyal users who upgrade to Pro Max

### Risk 2: Pro+ Cannibalization of Pro Max
- **Mitigation**: Clear feature differentiation
- **Strategy**: Position Pro Max as "serious users" tier with dedicated support
- **Monitor**: Upgrade paths from Pro+ to Pro Max

### Risk 3: Enterprise Tier Delays
- **Mitigation**: Mark as "Coming Soon" instead of hiding
- **Collect Interest**: Email signup for early access
- **Timeline**: Commit to Q2 2026 launch publicly

### Risk 4: Credit Calculation Errors
- **Mitigation**: Comprehensive testing with real LLM API calls
- **Monitoring**: Alert if credit deductions >2x expected vendor cost
- **Rollback Plan**: Can revert to old multipliers within 24 hours

---

## Next Steps (Immediate Actions)

### Day 1-2:
1. ✅ Review and approve this plan
2. ✅ Update Prisma schema enum
3. ✅ Create database migration
4. ✅ Update seed data files

### Day 3-5:
5. ✅ Update backend TypeScript types
6. ✅ Update rate limiting configs
7. ✅ Update subscription service logic
8. ✅ Write migration tests

### Day 6-10:
9. ✅ Update frontend pricing page
10. ✅ Create "Coming Soon" components
11. ✅ Update Plan 109 documentation
12. ✅ Run full test suite

### Day 11-14:
13. ✅ Deploy to staging
14. ✅ Beta user testing
15. ✅ Final QA verification
16. ✅ Production deployment

---

## Appendix A: Pricing Comparison Table

| Tier | Old Price | Old Credits | New Price | New Credits | Value Change |
|------|-----------|-------------|-----------|-------------|--------------|
| Free | $0 | 100 | $0 | 200 | +100% 🎉 |
| Pro | $99.99 | 10,000 | $15 | 1,500 | -85% price, better entry point |
| Pro+ | N/A | N/A | $45 | 5,000 | NEW tier |
| Pro Max | N/A | N/A | $199 | 25,000 | Premium repositioning |
| Enterprise Pro | N/A | N/A | $30 | 3,500 | Coming Soon |
| Enterprise Pro+ | N/A | N/A | $90 | 11,000 | Coming Soon |

---

## Appendix B: Credit Calculation Examples

### Example 1: Free User with Claude 3 Haiku
```
Model: Claude 3 Haiku
Input: 200 tokens
Output: 300 tokens
Vendor pricing: $0.00025/1k input, $0.00125/1k output

Vendor cost:
  = (200 / 1000 × $0.00025) + (300 / 1000 × $0.00125)
  = $0.00005 + $0.000375
  = $0.000425

Margin multiplier (Free tier): 2.0x
Credits deducted:
  = ceil($0.000425 × 2.0 × 100)
  = ceil(0.085)
  = 1 credit

User balance: 200 → 199 credits
```

### Example 2: Pro+ User with GPT-4o
```
Model: GPT-4o
Input: 1000 tokens
Output: 2000 tokens
Vendor pricing: $0.005/1k input, $0.015/1k output

Vendor cost:
  = (1000 / 1000 × $0.005) + (2000 / 1000 × $0.015)
  = $0.005 + $0.030
  = $0.035

Margin multiplier (Pro+ tier): 1.1x
Credits deducted:
  = ceil($0.035 × 1.1 × 100)
  = ceil(3.85)
  = 4 credits

User balance: 5000 → 4996 credits
```

### Example 3: Pro Max User with Claude 3.5 Sonnet (Streaming)
```
Model: Claude 3.5 Sonnet
Input: 2000 tokens
Output: 3000 tokens
Vendor pricing: $0.003/1k input, $0.015/1k output

Vendor cost:
  = (2000 / 1000 × $0.003) + (3000 / 1000 × $0.015)
  = $0.006 + $0.045
  = $0.051

Margin multiplier (Pro Max tier): 1.25x
Credits deducted:
  = ceil($0.051 × 1.25 × 100)
  = ceil(6.375)
  = 7 credits

User balance: 25000 → 24993 credits
```

---

## Appendix C: Implementation Checklist

### Database Layer
- [ ] Update `SubscriptionTier` enum in Prisma schema
- [ ] Create migration for new enum values
- [ ] Update seed data with new tier configs
- [ ] Update `seed-additions-token-credit.ts` initial credits
- [ ] Add `status` field to subscription table (active/coming_soon)

### Backend Services
- [ ] Update TypeScript subscription types
- [ ] Update `TIER_FEATURES` constant
- [ ] Update rate limiting configurations
- [ ] Update credit deduction margin multipliers
- [ ] Add tier filtering logic (hide coming soon from regular users)
- [ ] Update subscription creation validation
- [ ] Update tier upgrade/downgrade logic

### API Endpoints
- [ ] `GET /api/tiers` - Return all tiers with status
- [ ] `GET /api/tiers/available` - Return only active tiers
- [ ] `POST /api/subscriptions` - Validate tier is active before creation
- [ ] `GET /api/pricing` - Include coming soon section
- [ ] Admin endpoints to view all tiers including coming soon

### Frontend Components
- [ ] Update pricing page layout
- [ ] Create "Coming Soon" badge component
- [ ] Create "New!" badge for Pro+ tier
- [ ] Update tier comparison table
- [ ] Add "Notify Me" button for enterprise tiers
- [ ] Update subscription flow to filter coming soon tiers
- [ ] Update user dashboard to show tier features

### Testing
- [ ] Unit tests for tier validation
- [ ] Integration tests for credit deduction (all tiers)
- [ ] E2E tests for subscription creation
- [ ] Rate limiting tests (all tiers)
- [ ] Migration tests (existing user data)
- [ ] Frontend pricing page snapshot tests

### Documentation
- [ ] Update Plan 109 with new pricing
- [ ] Create pricing migration guide
- [ ] Update API documentation
- [ ] Update README with new pricing structure
- [ ] Create user-facing announcement
- [ ] Create internal runbook for support team

### Monitoring & Alerts
- [ ] Set up revenue tracking per tier
- [ ] Monitor Pro+ adoption rate
- [ ] Track credit utilization by tier
- [ ] Alert on unusual credit deduction patterns
- [ ] Monitor support tickets related to pricing

---

**Estimated Total Implementation Time**: 3-4 weeks
**Required Team Members**: 1 Backend Dev, 1 Frontend Dev, 1 QA Engineer
**Deployment Risk**: Medium (pricing changes always carry user perception risk)
**Rollback Complexity**: Low (can revert migrations and deployments within 2 hours)
