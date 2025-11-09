# Master Orchestration Plan: Plans 109, 110, 111 Implementation

**Document ID**: 115-master-orchestration-plan-109-110-111.md
**Project Leader**: Master Agent Coordinator
**Date**: 2025-11-09
**Status**: Ready for Agent Delegation
**Scope**: Complete implementation of Monetization, Perpetual Licensing, and Coupon Systems

---

## Executive Summary

This master orchestration plan coordinates the implementation of:
- **Plan 109**: Rephlo Desktop Monetization & Moderation (5-tier subscription model)
- **Plan 110**: Perpetual Plan & Proration Strategy (6th tier + license management)
- **Plan 111**: Coupon & Discount Code System (promotional campaigns)
- **Integration**: Full integration with Plan 112 (Token-to-Credit Conversion)

**Total Scope**: 4 interconnected systems, 52-week implementation timeline
**Agent Teams Required**: 6 specialized teams working in parallel
**Expected Outcome**: Production-ready monetization platform with tier-based access, perpetual licensing, promotional campaigns, and profit-protected token usage

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REPHLO MONETIZATION PLATFORM                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼────────┐ ┌────▼─────┐ ┌────────▼────────┐
        │   Plan 109     │ │ Plan 110 │ │   Plan 111      │
        │ Subscriptions  │ │Perpetual │ │   Coupons       │
        │  (5 Tiers)     │ │ License  │ │  (Campaigns)    │
        └───────┬────────┘ └────┬─────┘ └────────┬────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │    Plan 112      │
                        │  Token-to-Credit │
                        │   (Profitability)│
                        └──────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌──▼────┐ ┌────▼──────┐
            │   OpenAI     │ │Anthrop│ │  Google   │
            │   Vendor     │ │ic     │ │  Vendor   │
            └──────────────┘ └───────┘ └───────────┘
```

**Flow**:
1. User subscribes (Plan 109) → Gets tier + credits
2. User can apply coupon (Plan 111) → Discount applied
3. User can buy Perpetual (Plan 110) → One-time payment + BYOK
4. User makes API request → Plan 112 tracks tokens, deducts credits, ensures profitability
5. Credits refill monthly (Plan 109) or rollover (Plan 110)

---

## Plan 109: Subscription & Monetization Implementation

### Phase 1: Database Schema (Weeks 1-2)

**Agent**: db-schema-architect
**Priority**: HIGH (Foundation for all other plans)

**Tables to Create**:

1. **subscription** (extends existing or creates new)
```sql
CREATE TABLE subscription (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  tier ENUM('free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual'),
  billing_cycle ENUM('monthly', 'annual'),
  status ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),

  -- Pricing
  base_price_usd DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  final_price_usd DECIMAL(10,2),

  -- Credit allocation
  monthly_credit_allocation INT,

  -- Billing periods
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,

  -- Stripe integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT
);
```

2. **subscription_tier_config** (tier definitions)
```sql
CREATE TABLE subscription_tier_config (
  id UUID PRIMARY KEY,
  tier_name VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),

  -- Pricing
  monthly_price_usd DECIMAL(10,2),
  annual_price_usd DECIMAL(10,2),
  annual_discount_percent DECIMAL(5,2),

  -- Credits
  monthly_credit_allocation INT,
  max_credit_rollover INT,
  rollover_expiration_months INT,

  -- Features
  features JSONB,
  model_access_level VARCHAR(50),
  api_rate_limit_per_minute INT,

  -- Status
  is_active BOOLEAN,
  is_visible BOOLEAN,
  sort_order INT,

  effective_from TIMESTAMP,
  effective_until TIMESTAMP
);
```

3. **credit_allocation** (monthly credit grants)
```sql
CREATE TABLE credit_allocation (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  subscription_id UUID REFERENCES subscription(id),

  amount INT,
  source ENUM('subscription', 'bonus', 'referral', 'coupon', 'refund'),

  allocated_at TIMESTAMP,
  expires_at TIMESTAMP,

  created_at TIMESTAMP
);
```

4. **billing_invoice** (Stripe invoice tracking)
```sql
CREATE TABLE billing_invoice (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  subscription_id UUID REFERENCES subscription(id),

  stripe_invoice_id VARCHAR(255) UNIQUE,

  amount_due DECIMAL(10,2),
  amount_paid DECIMAL(10,2),
  amount_remaining DECIMAL(10,2),

  status ENUM('draft', 'open', 'paid', 'uncollectible', 'void'),

  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,

  period_start TIMESTAMP,
  period_end TIMESTAMP,

  due_date TIMESTAMP,
  paid_at TIMESTAMP,

  created_at TIMESTAMP
);
```

5. **payment_transaction** (payment history)
```sql
CREATE TABLE payment_transaction (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  invoice_id UUID REFERENCES billing_invoice(id),

  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),

  amount DECIMAL(10,2),
  currency VARCHAR(3),

  status ENUM('pending', 'succeeded', 'failed', 'refunded'),

  payment_method_type VARCHAR(50),
  last4 VARCHAR(4),

  failure_code VARCHAR(255),
  failure_message TEXT,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

6. **dunning_attempt** (failed payment retries)
```sql
CREATE TABLE dunning_attempt (
  id UUID PRIMARY KEY,
  subscription_id UUID REFERENCES subscription(id),
  invoice_id UUID REFERENCES billing_invoice(id),

  attempt_number INT,
  retry_at TIMESTAMP,
  status ENUM('scheduled', 'attempted', 'succeeded', 'failed', 'exhausted'),

  error_message TEXT,

  created_at TIMESTAMP,
  attempted_at TIMESTAMP
);
```

**Seed Data**:
- 5 tier configurations (Free, Pro, Pro Max, Enterprise Pro, Enterprise Max)
- Pricing: $0, $19, $49, $149, custom
- Credits: 2K, 20K, 60K, 250K, unlimited

**Deliverable**: Migration SQL + Seed data

---

### Phase 2: Subscription Management Service (Weeks 3-4)

**Agent**: api-backend-implementer
**Dependencies**: Phase 1 complete

**Service**: `SubscriptionManagementService`

**Methods**:
```typescript
class SubscriptionManagementService {
  // Subscription lifecycle
  async createSubscription(userId: string, tier: string, billingCycle: string): Promise<Subscription>
  async upgradeTier(subscriptionId: string, newTier: string): Promise<Subscription>
  async downgradeTier(subscriptionId: string, newTier: string): Promise<Subscription>
  async changeBillingCycle(subscriptionId: string, newCycle: string): Promise<Subscription>
  async cancelSubscription(subscriptionId: string, reason: string): Promise<void>
  async reactivateSubscription(subscriptionId: string): Promise<Subscription>

  // Credit management
  async allocateMonthlyCredits(userId: string): Promise<CreditAllocation>
  async adjustCredits(userId: string, amount: number, reason: string): Promise<void>
  async getAvailableCredits(userId: string): Promise<number>

  // Tier queries
  async getUserTier(userId: string): Promise<string>
  async getTierFeatures(tier: string): Promise<TierConfig>
  async canAccessFeature(userId: string, feature: string): Promise<boolean>
}
```

**Key Features**:
- Stripe subscription creation/update/cancel
- Automatic credit allocation on subscription start
- Proration for mid-cycle changes (integration with Plan 110)
- Tier upgrade/downgrade with grace periods
- Trial period management (14-day free trial)

**Integration Points**:
- Plan 112: Credit allocation integrates with `CreditDeductionService`
- Plan 110: Tier changes use `ProrationService`
- Plan 111: Subscription creation applies coupons via `CouponValidationService`

**Deliverable**: Service implementation + unit tests

---

### Phase 3: User Management Service (Weeks 5-6)

**Agent**: api-backend-implementer

**Service**: `UserManagementService`

**Admin Operations**:
```typescript
class UserManagementService {
  // User CRUD
  async listUsers(filters: UserFilters, pagination: Pagination): Promise<UserList>
  async getUserDetails(userId: string): Promise<UserDetails>
  async updateUser(userId: string, updates: UserUpdate): Promise<User>
  async deleteUser(userId: string): Promise<void>

  // User status management
  async suspendUser(userId: string, reason: string, duration?: number): Promise<void>
  async banUser(userId: string, reason: string, permanent: boolean): Promise<void>
  async unsuspendUser(userId: string): Promise<void>

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updates: BulkUserUpdate): Promise<BulkResult>
  async bulkSuspendUsers(userIds: string[], reason: string): Promise<BulkResult>

  // User analytics
  async getUserUsageStats(userId: string, dateRange: DateRange): Promise<UsageStats>
  async getUserCreditHistory(userId: string, pagination: Pagination): Promise<CreditHistory>
  async getUserSubscriptionHistory(userId: string): Promise<SubscriptionHistory>
}
```

**Features**:
- User search/filter (by tier, status, email, signup date)
- Suspend/ban with automatic service termination
- Bulk operations for compliance (GDPR deletion, mass suspensions)
- Audit logging for all admin actions

**Database Tables** (additional):
```sql
CREATE TABLE user_suspension (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),

  reason TEXT,
  suspended_by UUID REFERENCES "user"(id),
  suspended_at TIMESTAMP,
  suspended_until TIMESTAMP,

  is_permanent BOOLEAN,

  unsuspended_by UUID,
  unsuspended_at TIMESTAMP
);

CREATE TABLE admin_action_log (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES "user"(id),
  target_user_id UUID REFERENCES "user"(id),

  action_type ENUM('suspend', 'ban', 'unsuspend', 'delete', 'update', 'refund'),
  reason TEXT,
  metadata JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP
);
```

**Deliverable**: Service + admin audit logging

---

### Phase 4: Billing & Payments Service (Weeks 7-8)

**Agent**: api-backend-implementer

**Service**: `BillingPaymentsService`

**Stripe Integration**:
```typescript
class BillingPaymentsService {
  // Payment methods
  async addPaymentMethod(userId: string, paymentMethodId: string): Promise<void>
  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void>
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void>
  async listPaymentMethods(userId: string): Promise<PaymentMethod[]>

  // Invoices
  async getUpcomingInvoice(userId: string): Promise<Invoice>
  async listInvoices(userId: string, pagination: Pagination): Promise<Invoice[]>
  async downloadInvoice(invoiceId: string): Promise<Buffer>

  // Transactions
  async listTransactions(userId: string, pagination: Pagination): Promise<Transaction[]>
  async refundTransaction(transactionId: string, amount?: number, reason?: string): Promise<Refund>

  // Dunning (failed payment recovery)
  async handleFailedPayment(invoiceId: string): Promise<void>
  async retryPayment(invoiceId: string): Promise<PaymentResult>
  async scheduleDunningAttempts(invoiceId: string): Promise<void>
}
```

**Stripe Webhook Handlers**:
```typescript
async handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'invoice.payment_succeeded':
      await this.handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_failed':
      await this.handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.updated':
      await this.handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await this.handleSubscriptionCancelled(event.data.object);
      break;
    // ... more webhook handlers
  }
}
```

**Dunning Strategy**:
- Day 0: Payment fails → Email notification
- Day 3: Retry #1 → Email reminder
- Day 7: Retry #2 → Email warning
- Day 14: Retry #3 → Email final notice
- Day 21: Subscription suspended
- Day 30: Subscription cancelled

**Deliverable**: Stripe integration + webhook handlers

---

### Phase 5: Platform Analytics Service (Weeks 9-10)

**Agent**: api-backend-implementer

**Service**: `PlatformAnalyticsService`

**Analytics Queries**:
```typescript
class PlatformAnalyticsService {
  // Revenue metrics
  async getMRR(): Promise<number>  // Monthly Recurring Revenue
  async getARR(): Promise<number>  // Annual Recurring Revenue
  async getRevenueByTier(dateRange: DateRange): Promise<RevenueByTier>
  async getRevenueGrowthRate(period: string): Promise<number>

  // User metrics
  async getTotalUsers(): Promise<number>
  async getActiveUsers(dateRange: DateRange): Promise<number>
  async getUsersByTier(): Promise<UserDistribution>
  async getChurnRate(period: string): Promise<number>

  // Conversion metrics
  async getTrialConversionRate(): Promise<number>
  async getFreeToProConversionRate(): Promise<number>
  async getUpgradeRate(fromTier: string, toTier: string): Promise<number>

  // Usage metrics
  async getTotalTokensConsumed(dateRange: DateRange): Promise<number>
  async getTokensByModel(dateRange: DateRange): Promise<TokensByModel>
  async getCreditUtilizationRate(tier: string): Promise<number>

  // Profitability metrics (integration with Plan 112)
  async getGrossMarginByTier(): Promise<MarginByTier>
  async getVendorCostByProvider(): Promise<CostByProvider>
  async getProfitPerUser(tier: string): Promise<number>
}
```

**Aggregation Tables** (for performance):
```sql
CREATE TABLE revenue_daily_summary (
  id UUID PRIMARY KEY,
  summary_date DATE,

  total_revenue DECIMAL(12,2),
  mrr DECIMAL(12,2),
  arr DECIMAL(12,2),

  new_subscriptions INT,
  cancelled_subscriptions INT,
  upgraded_subscriptions INT,
  downgraded_subscriptions INT,

  revenue_by_tier JSONB,

  created_at TIMESTAMP
);

CREATE TABLE user_daily_summary (
  id UUID PRIMARY KEY,
  summary_date DATE,

  total_users INT,
  active_users INT,
  trial_users INT,

  users_by_tier JSONB,

  new_signups INT,
  churned_users INT,

  created_at TIMESTAMP
);
```

**Scheduled Jobs**:
- Daily: Aggregate revenue, users, usage
- Weekly: Calculate churn rate, conversion rate
- Monthly: Generate financial reports

**Deliverable**: Analytics service + aggregation jobs

---

### Phase 6-8: Admin UI for Plan 109 (Weeks 11-16)

**Agent**: general-purpose (Admin UI specialist)

**Pages to Build**:

1. **User Management Dashboard** (`frontend/src/pages/admin/UserManagement.tsx`)
   - User search/filter table
   - Bulk operations (suspend, ban, export)
   - User details modal (subscription, credits, usage)
   - Action buttons (suspend, ban, delete, refund)

2. **Subscription Management Dashboard** (`frontend/src/pages/admin/SubscriptionManagement.tsx`)
   - Subscription list with filters
   - Tier distribution pie chart
   - Churn rate trend line
   - Quick actions (upgrade, downgrade, cancel)

3. **Billing Dashboard** (`frontend/src/pages/admin/BillingDashboard.tsx`)
   - Revenue summary cards (MRR, ARR, growth rate)
   - Revenue by tier chart
   - Failed payments list
   - Dunning queue

4. **Analytics Dashboard** (`frontend/src/pages/admin/PlatformAnalytics.tsx`)
   - Key metrics overview (users, revenue, churn)
   - Conversion funnel visualization
   - Credit utilization by tier
   - Integration with Plan 112 margin tracking

**Deliverable**: 4 admin pages (1,500+ lines) + API client

---

## Plan 110: Perpetual License & Proration Implementation

### Phase 1: Perpetual License Schema (Weeks 17-18)

**Agent**: db-schema-architect

**Tables to Create**:

1. **perpetual_license**
```sql
CREATE TABLE perpetual_license (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),

  license_key VARCHAR(255) UNIQUE,

  -- Purchase details
  purchase_date TIMESTAMP,
  purchase_price_usd DECIMAL(10,2),

  -- Version eligibility
  eligible_major_version INT,  -- e.g., 1 for v1.x.x
  eligible_until_version VARCHAR(50),  -- "1.99.99"

  -- Activation limits
  max_activations INT DEFAULT 3,
  current_activations INT DEFAULT 0,

  -- Status
  status ENUM('active', 'suspended', 'revoked', 'expired'),

  -- Metadata
  created_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoke_reason TEXT
);
```

2. **license_activation**
```sql
CREATE TABLE license_activation (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES perpetual_license(id),

  machine_fingerprint VARCHAR(255),
  machine_name VARCHAR(255),

  activated_at TIMESTAMP,
  last_validation_at TIMESTAMP,

  ip_address INET,

  is_active BOOLEAN,
  deactivated_at TIMESTAMP
);
```

3. **version_upgrade**
```sql
CREATE TABLE version_upgrade (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  license_id UUID REFERENCES perpetual_license(id),

  from_version VARCHAR(50),
  to_version VARCHAR(50),

  upgrade_type ENUM('minor', 'patch', 'major'),

  fee_charged DECIMAL(10,2),

  purchased_at TIMESTAMP
);
```

4. **proration_event**
```sql
CREATE TABLE proration_event (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "user"(id),
  subscription_id UUID REFERENCES subscription(id),

  event_type ENUM('upgrade', 'downgrade', 'cycle_change', 'cancellation'),

  old_tier VARCHAR(50),
  new_tier VARCHAR(50),
  old_billing_cycle VARCHAR(50),
  new_billing_cycle VARCHAR(50),

  -- Proration calculation
  days_remaining INT,
  unused_credit_usd DECIMAL(10,2),
  new_charge_usd DECIMAL(10,2),
  proration_amount_usd DECIMAL(10,2),

  -- Result
  charge_or_refund ENUM('charge', 'refund', 'credit'),
  amount_usd DECIMAL(10,2),

  processed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Deliverable**: Migration + seed data (Perpetual Plan config)

---

### Phase 2: License Management Service (Weeks 19-20)

**Agent**: api-backend-implementer

**Service**: `LicenseManagementService`

```typescript
class LicenseManagementService {
  // License creation
  async createPerpetualLicense(userId: string, purchasePrice: number): Promise<License>
  async generateLicenseKey(): Promise<string>

  // Activation
  async activateLicense(licenseKey: string, machineFingerprint: string, machineName: string): Promise<ActivationResult>
  async deactivateLicense(activationId: string): Promise<void>
  async validateLicense(licenseKey: string, machineFingerprint: string): Promise<ValidationResult>

  // Version upgrades
  async checkUpgradeEligibility(licenseId: string, targetVersion: string): Promise<UpgradeEligibility>
  async purchaseVersionUpgrade(licenseId: string, targetVersion: string): Promise<VersionUpgrade>

  // License management
  async suspendLicense(licenseId: string, reason: string): Promise<void>
  async revokeLicense(licenseId: string, reason: string): Promise<void>
  async transferLicense(licenseId: string, newUserId: string): Promise<void>
}
```

**Machine Fingerprinting Algorithm**:
```typescript
function generateMachineFingerprint(machineData: MachineData): string {
  const { cpuId, macAddress, diskSerial, osVersion } = machineData;
  const combined = `${cpuId}|${macAddress}|${diskSerial}|${osVersion}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}
```

**Deliverable**: License service + desktop client integration

---

### Phase 3: Proration Service (Weeks 21-22)

**Agent**: api-backend-implementer

**Service**: `ProrationService`

```typescript
class ProrationService {
  // Proration calculation
  async calculateProration(
    userId: string,
    currentTier: string,
    newTier: string,
    changeType: 'upgrade' | 'downgrade'
  ): Promise<ProrationResult>

  // Scenario examples from Plan 110
  async handleUpgrade(subscriptionId: string, newTier: string): Promise<ProrationResult>
  async handleDowngrade(subscriptionId: string, newTier: string): Promise<ProrationResult>
  async handleBillingCycleChange(subscriptionId: string, newCycle: string): Promise<ProrationResult>

  // Credit management
  async applyProrationCredit(userId: string, amount: number): Promise<void>
  async chargeProrationAmount(userId: string, amount: number): Promise<void>

  // Audit
  async recordProrationEvent(event: ProrationEvent): Promise<void>
  async getProrationHistory(userId: string): Promise<ProrationEvent[]>
}
```

**Proration Formula (from Plan 110)**:
```typescript
interface ProrationResult {
  unusedCreditFromOld: number;
  proratedChargeForNew: number;
  totalChargeToday: number;
  newRenewalDate: Date;
}

function calculateProration(
  currentSubscription: Subscription,
  newTier: TierConfig,
  changeDate: Date
): ProrationResult {
  const totalDays = daysBetween(currentSubscription.current_period_start, currentSubscription.current_period_end);
  const daysUsed = daysBetween(currentSubscription.current_period_start, changeDate);
  const daysRemaining = totalDays - daysUsed;

  // Unused credit from current tier
  const unusedCreditFromOld = (daysRemaining / totalDays) * currentSubscription.base_price_usd;

  // Prorated charge for new tier
  const proratedChargeForNew = (daysRemaining / totalDays) * newTier.monthly_price_usd;

  // Total charge today
  const totalChargeToday = Math.max(0, proratedChargeForNew - unusedCreditFromOld);

  // New renewal date (end of current period)
  const newRenewalDate = addMonths(currentSubscription.current_period_end, 1);

  return {
    unusedCreditFromOld,
    proratedChargeForNew,
    totalChargeToday,
    newRenewalDate
  };
}
```

**Deliverable**: Proration service + calculation tests

---

### Phase 4: Migration Service (Weeks 23-24)

**Agent**: api-backend-implementer

**Service**: `MigrationService`

```typescript
class MigrationService {
  // Perpetual → Subscription migration
  async migratePerpetualToSubscription(
    userId: string,
    targetTier: string,
    billingCycle: string
  ): Promise<MigrationResult>

  // Apply $50 migration credit (from Plan 110)
  async applyMigrationCredit(userId: string, licenseId: string): Promise<void>

  // Subscription → Perpetual migration
  async migrateSubscriptionToPerpetual(
    userId: string,
    subscriptionId: string
  ): Promise<MigrationResult>

  // Calculate prorated refund or subscriber discount
  async calculateMigrationValue(subscriptionId: string): Promise<MigrationValue>

  // Hybrid mode (BYOK + cloud credits for Pro Max/Enterprise)
  async enableHybridMode(userId: string, licenseId: string, subscriptionId: string): Promise<void>
}
```

**Migration Scenarios** (from Plan 110):
1. Perpetual → Pro: $50 credit = 2.6 months free
2. Pro → Perpetual: Prorated refund OR $139 subscriber discount
3. Hybrid: BYOK for own API + cloud credits for other features

**Deliverable**: Migration service + user migration flow

---

### Phase 5-6: Admin UI for Plan 110 (Weeks 25-28)

**Agent**: general-purpose (Admin UI specialist)

**Pages to Build**:

1. **Perpetual License Management** (`frontend/src/pages/admin/PerpetualLicenseManagement.tsx`)
   - License list with search/filter
   - Activation monitoring (machine fingerprints, IP addresses)
   - Suspicious activity alerts (>5 activations, multi-IP)
   - License actions (suspend, revoke, transfer)

2. **Proration Tracking Dashboard** (`frontend/src/pages/admin/ProrationTracking.tsx`)
   - Proration events timeline
   - Charge/refund summary
   - Tier migration flow chart
   - Anomaly detection (excessive downgrades)

**Deliverable**: 2 admin pages + API client

---

## Plan 111: Coupon & Discount Code Implementation

### Phase 1: Coupon Schema (Weeks 29-30)

**Agent**: db-schema-architect

**Tables** (from Plan 111):

1. **coupon** - 5 coupon types configuration
2. **campaign** - Promotional campaign management
3. **coupon_redemption** - Usage tracking with fraud detection
4. **coupon_validation_rule** - Complex eligibility rules
5. **promotion_tier_eligibility** - Tier-specific coupons

*(See Plan 111 "Database Schema Design" section for complete schema)*

**Deliverable**: Migration + seed data (example campaigns)

---

### Phase 2: Coupon Validation Service (Weeks 31-32)

**Agent**: api-backend-implementer

**Service**: `CouponValidationService`

```typescript
class CouponValidationService {
  // 12-step validation algorithm (from Plan 111)
  async validateCoupon(
    couponCode: string,
    userId: string,
    subscriptionData: SubscriptionData
  ): Promise<CouponValidationResult>

  // Discount calculation (5 coupon types)
  calculateDiscount(coupon: Coupon, subscriptionData: SubscriptionData): number

  // Fraud detection (from Plan 111)
  async checkFraudSignals(
    coupon: Coupon,
    userId: string,
    ipAddress: string,
    deviceFingerprint: string
  ): Promise<FraudSignal>

  // Coupon application
  async applyCoupon(
    userId: string,
    couponCode: string,
    subscriptionId: string
  ): Promise<CouponRedemption>
}
```

**12-Step Validation** (from Plan 111):
1. Coupon exists?
2. Is active?
3. Within validity period?
4. Tier applicable?
5. Tier-specific transitions valid?
6. Billing cycle applicable?
7. User usage limit check
8. Global usage limit check
9. Campaign budget check
10. Custom validation rules
11. Discount calculation
12. Fraud signals

**Deliverable**: Validation service + fraud detection

---

### Phase 3: Campaign Management Service (Weeks 33-34)

**Agent**: api-backend-implementer

**Service**: `CampaignManagementService`

```typescript
class CampaignManagementService {
  // Campaign CRUD
  async createCampaign(data: CampaignInput): Promise<Campaign>
  async updateCampaign(campaignId: string, updates: CampaignUpdate): Promise<Campaign>
  async deleteCampaign(campaignId: string): Promise<void>

  // Campaign lifecycle
  async activateCampaign(campaignId: string): Promise<void>
  async pauseCampaign(campaignId: string): Promise<void>
  async endCampaign(campaignId: string): Promise<void>

  // Budget management
  async trackCampaignSpend(campaignId: string, amount: number): Promise<void>
  async checkBudgetRemaining(campaignId: string): Promise<number>

  // Analytics
  async getCampaignPerformance(campaignId: string): Promise<CampaignAnalytics>
  async getCampaignROI(campaignId: string): Promise<ROIMetrics>
}
```

**Campaign Templates** (from Plan 111):
- July 4 Liberty Deal
- Black Friday/Cyber Monday
- Referral Program
- Win-Back Campaign

**Deliverable**: Campaign service + templates

---

### Phase 4: Checkout Integration (Weeks 35-36)

**Agent**: api-backend-implementer

**Integration Points**:

1. **Checkout Flow Update**:
```typescript
async processCheckoutWithCoupon(
  userId: string,
  checkoutData: CheckoutData,
  couponCode?: string
): Promise<SubscriptionResult> {
  // 1. Validate coupon
  if (couponCode) {
    const validation = await couponValidationService.validateCoupon(couponCode, userId, checkoutData);
    if (!validation.is_valid) {
      throw new BadRequestError('Invalid coupon: ' + validation.errors[0]);
    }
  }

  // 2. Calculate final price (with discount)
  const basePrice = getTierPrice(checkoutData.tier);
  const discount = couponCode ? calculateDiscount(coupon, checkoutData) : 0;
  const finalPrice = Math.max(0, basePrice - discount);

  // 3. Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(finalPrice * 100),
    currency: 'usd',
    customer: stripeCustomerId
  });

  // 4. Create subscription
  const subscription = await subscriptionService.createSubscription(userId, checkoutData);

  // 5. Record coupon redemption
  if (couponCode) {
    await couponService.recordRedemption(couponCode, userId, subscription.id, discount);
  }

  // 6. Allocate credits (monthly allocation - from Plan 109)
  await creditManagementService.allocateMonthlyCredits(userId, subscription.tier);

  return { success: true, subscription };
}
```

2. **Integration with Plan 110 Proration**:
   - Coupons apply to prorated amounts
   - Example: Upgrade Pro → Pro Max on Day 15 with 20% coupon
     - Base proration: $15
     - Discount: 20% × $15 = $3
     - Final charge: $12

**Deliverable**: Checkout integration + coupon application

---

### Phase 5-7: Admin UI for Plan 111 (Weeks 37-42)

**Agent**: general-purpose (Admin UI specialist)

**Pages to Build** (from Plan 111):

1. **Coupon Management** (`frontend/src/pages/admin/CouponManagement.tsx`)
   - Coupon list with filters
   - Create/edit coupon form (5 types)
   - Bulk operations
   - Pause/archive actions

2. **Campaign Calendar** (`frontend/src/pages/admin/CampaignCalendar.tsx`)
   - Calendar view with holiday campaigns
   - Campaign lifecycle tracking
   - Budget monitoring
   - Conflict detection

3. **Coupon Analytics** (`frontend/src/pages/admin/CouponAnalytics.tsx`)
   - Redemption rate charts
   - Conversion rate by coupon
   - ROI analysis
   - Fraud detection alerts

**Deliverable**: 3 admin pages (2,000+ lines) + API client

---

## Cross-Plan Integration

### Integration 1: Plan 109 ↔ Plan 112 (Token-Credit)

**Flow**:
```
User subscribes to Pro tier (Plan 109)
  → Gets 20,000 credits/month
  → Makes API request with GPT-4o
  → Plan 112 tracks tokens (500 input + 1500 output)
  → Plan 112 calculates vendor cost ($0.024)
  → Plan 112 applies Pro multiplier (1.5x)
  → Plan 112 deducts 4 credits atomically
  → User balance: 20,000 → 19,996
```

**Integration Points**:
- `SubscriptionManagementService.allocateMonthlyCredits()` → creates records in Plan 112's `user_credit_source`
- `CreditDeductionService.deductCreditsAtomically()` → respects subscription tier limits
- Monthly credit refresh job checks subscription status from Plan 109

---

### Integration 2: Plan 110 ↔ Plan 112 (Perpetual-Credit)

**Flow**:
```
User buys Perpetual Plan ($199)
  → Gets "unlimited" credits (high monthly allocation)
  → Uses BYOK (own OpenAI API key)
  → Plan 112 still tracks tokens for analytics
  → Plan 112 does NOT deduct credits (BYOK mode)
  → User pays OpenAI directly
```

**Integration Points**:
- `LicenseManagementService.createPerpetualLicense()` → sets special flag in Plan 112
- `TokenTrackingService.captureTokenUsage()` → records usage but skips deduction for BYOK users
- Analytics still show usage patterns

---

### Integration 3: Plan 111 ↔ Plans 109/110 (Coupons-Subscriptions)

**Flow**:
```
User applies coupon "JULY4LIBERTY" (25% off)
  → Subscribes to Pro Max annual ($588)
  → Discount: 25% × $588 = $147
  → Final charge: $441
  → Monthly credits still 60,000 (no reduction)
  → Plan 112 margin still protected (1.2x multiplier)
```

**Integration Points**:
- `CouponValidationService.validateCoupon()` → checks tier eligibility from Plan 109
- Checkout process → applies discount before Stripe charge
- `ProrationService.calculateProration()` → includes coupon discount in calculation

---

## Master Implementation Timeline

### Weeks 1-10: Plan 109 Foundation
- Database schema (subscriptions, billing, invoices)
- Core services (subscription, user, billing, analytics)
- Admin UI (3 pages)

### Weeks 11-16: Plan 109 Admin UI
- User management dashboard
- Subscription management
- Billing dashboard
- Analytics dashboard

### Weeks 17-24: Plan 110 Perpetual Licensing
- Database schema (licenses, activations, upgrades)
- License management service
- Proration service
- Migration service

### Weeks 25-28: Plan 110 Admin UI
- Perpetual license management
- Proration tracking

### Weeks 29-36: Plan 111 Coupon System
- Database schema (coupons, campaigns, redemptions)
- Validation service (12-step algorithm)
- Campaign management
- Checkout integration

### Weeks 37-42: Plan 111 Admin UI
- Coupon management
- Campaign calendar
- Coupon analytics

### Weeks 43-48: Integration & Testing
- Cross-plan integration testing
- Load testing (1000 req/sec)
- Security audit
- Staging deployment

### Weeks 49-52: Production Rollout
- Production deployment
- Monitoring setup
- Team training
- Week 1-4 post-launch support

**Total Timeline**: 52 weeks (1 year)

---

## Agent Delegation Plan

### Team 1: Database Schema Architect
**Weeks 1-2, 17-18, 29-30**
- Plan 109 schema (subscriptions, billing)
- Plan 110 schema (licenses, proration)
- Plan 111 schema (coupons, campaigns)

### Team 2: Backend Services (Subscription & Billing)
**Weeks 3-10**
- SubscriptionManagementService
- UserManagementService
- BillingPaymentsService
- PlatformAnalyticsService

### Team 3: Backend Services (Perpetual & Proration)
**Weeks 19-24**
- LicenseManagementService
- ProrationService
- MigrationService

### Team 4: Backend Services (Coupons)
**Weeks 31-36**
- CouponValidationService
- CampaignManagementService
- Fraud detection
- Checkout integration

### Team 5: Admin UI Developer
**Weeks 11-16, 25-28, 37-42**
- Plan 109 admin UI (4 pages)
- Plan 110 admin UI (2 pages)
- Plan 111 admin UI (3 pages)

### Team 6: QA/Testing Specialist
**Weeks 43-48**
- Integration tests (Plans 109-111-112)
- Load tests
- Security audit

---

## Success Criteria

### Technical Metrics
- All services build successfully (0 TypeScript errors)
- Test coverage >95% for all services
- Database query performance <100ms
- API response time <200ms
- Zero security vulnerabilities

### Business Metrics
- All 6 tiers functional (Free → Enterprise Max + Perpetual)
- Stripe integration working (subscriptions, payments, refunds)
- Credit allocation accurate (20K Pro, 60K Pro Max, etc.)
- Coupon system live (>5 campaigns active)
- Proration calculations exact (0% error rate)
- Perpetual licenses activating (3 devices max)

### Integration Metrics
- Plan 112 deducts credits correctly from Plan 109 allocations
- Coupons apply to subscriptions without breaking margin
- Perpetual BYOK mode works (tokens tracked, no deduction)
- Proration integrates with tier changes
- All admin UIs show unified data

---

**Next Step**: Delegate to specialized agents starting with Team 1 (Database Schema Architect) for Plan 109 foundation.

