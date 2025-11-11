# Rephlo Desktop Application - Monetization & Admin Moderation Plan

**Document ID**: 109
**Created**: 2025-11-08
**Status**: Planning
**Priority**: P0 (High)
**Target Version**: v2.0.0
**Application**: Rephlo Desktop (formerly Text Assistant)

## Executive Summary

This document outlines a comprehensive monetization strategy and admin moderation system for the Rephlo Desktop Application - a Windows-based AI-powered text transformation tool. Based on 2025 SaaS best practices and competitive LLM pricing analysis, this plan introduces a 5-tier subscription model with credit-based usage tracking and a full-featured admin moderation dashboard for managing subscriptions, users, billing, and platform health.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Market Research Summary](#market-research-summary)
3. [5-Tier Subscription Model](#5-tier-subscription-model)
4. [Credit System & Usage Metering](#credit-system--usage-metering)
5. [Pricing Strategy](#pricing-strategy)
6. [Admin Moderation System](#admin-moderation-system)
7. [Database Schema Enhancements](#database-schema-enhancements)
8. [Implementation Phases](#implementation-phases)
9. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Existing Infrastructure

**Backend (Rephlo API)**:
- Node.js/TypeScript backend with Prisma ORM
- PostgreSQL database
- OAuth 2.0/OIDC authentication via node-oidc-provider
- Existing 3-tier system: `free`, `pro`, `enterprise`
- Credit-based usage tracking with monthly allocations
- Model tier access control (just implemented)
- Stripe integration fields (subscription, customer, price IDs)

**Desktop Application (Rephlo Desktop)**:
- Windows 10/11 WPF application (.NET 8.0)
- Multi-LLM provider support:
  - Azure OpenAI (GPT-4, GPT-5)
  - Anthropic Claude
  - Groq
  - Ollama (local/private)
- Global text selection monitoring
- Customizable command templates
- Organizational workspaces (Spaces)
- Keyboard shortcuts and hotkeys

**Current Subscription Fields**:
```prisma
model Subscription {
  tier                 SubscriptionTier    // free | pro | enterprise
  status               SubscriptionStatus  // active | cancelled | expired | suspended
  creditsPerMonth      Int
  creditsRollover      Boolean
  priceCents           Int
  billingInterval      String              // monthly | annual
  stripeSubscriptionId String?
  stripeCustomerId     String?
  stripePriceId        String?
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  trialEnd             DateTime?
  cancelAtPeriodEnd    Boolean
  cancelledAt          DateTime?
}
```

---

## Market Research Summary

### 2025 SaaS Monetization Trends

Based on web research of 100+ SaaS companies in 2025:

**Value-Based Pricing Dominance**:
- 78% of companies now use value-based pricing (up from 62% in 2023)
- Focus on outcomes delivered rather than cost-plus margins
- Price anchored to customer success metrics

**Hybrid Subscription + Usage Models**:
- 56% of SaaS companies incorporate usage-based components
- Pure subscription-only decreased from 65% to 43%
- Most effective: baseline commitment + consumption charges
- Particularly prevalent in AI/LLM sectors (74% adoption)

**Tiered Pricing Best Practices**:
- 3-5 tiers optimal (prevents decision paralysis)
- Each tier should have clear value differentiation
- Good/Better/Best psychology effective
- Decoy pricing (middle tier) drives upsells

**Enterprise Market Opportunity**:
- 92% of Fortune 500 use consumer AI tools
- Only 5% have adopted enterprise-grade solutions
- Enterprise spending surged from $3.5B to $8.4B (mid-2025)
- Massive whitespace for B2B desktop AI tools

### LLM Pricing Benchmarks (2025)

**Credit-Based Pricing Models**:
- Anthropic: Tiers from $5-$400 monthly, usage limits $10-$5k
- OpenAI: Pay-as-you-go + prepaid credits + enterprise contracts
- Common approach: Monthly plans with generous token/credit allowances
- Overage charges for exceeding plan limits

**Enterprise Pricing Features**:
- Custom pricing negotiations
- Very high or unlimited usage quotas
- Premium support with SLAs
- Dedicated account managers
- Advanced security/compliance features
- Volume discounts (30-50% off list pricing)

### Admin Moderation Best Practices

**Subscription Lifecycle Management**:
- Trial → Onboarding → Active → Upgrade/Downgrade → Renewal/Cancellation
- Automated dunning management for failed payments
- Self-service subscription management (pause, resume, cancel)
- Prorated billing for mid-cycle changes
- Grace periods before hard suspensions

**User Management Features**:
- Role-based access control (RBAC)
- Bulk user import/export
- Activity monitoring and usage analytics
- Suspension/reactivation workflows
- Email notifications for lifecycle events

---

## 5-Tier Subscription Model

### Tier Structure Overview

| Tier | Target Audience | Monthly Price | Annual Price | Credits/Month | Use Case |
|------|----------------|---------------|--------------|---------------|----------|
| **Free** | Individual users, students, evaluation | $0 | $0 | 2,000 | Trial, basic personal use |
| **Pro** | Professionals, freelancers, power users | $19 | $190 (17% off) | 20,000 | Daily professional work |
| **Pro Max** | Heavy users, small teams, content creators | $49 | $490 (17% off) | 60,000 | High-volume daily usage |
| **Enterprise Pro** | Small-medium businesses, departments | $149 | $1,490 (17% off) | 250,000 | Team collaboration, shared workspaces |
| **Enterprise Max** | Large enterprises, unlimited teams | Custom | Custom | Unlimited | Enterprise features, SLA, dedicated support |

### Tier Feature Matrix

#### Free Tier
**Credits & Models**:
- 2,000 credits/month (no rollover)
- Access to free-tier models only (GPT-3.5-Turbo, basic Gemini)
- Standard processing speed
- Public LLM providers only

**Features**:
- Global text selection monitoring
- 5 custom command templates (max)
- 1 workspace (Space)
- Community support only
- Standard keyboard shortcuts
- Local Ollama models support

**Limits**:
- Max 50 API calls/day
- Max 1 concurrent request
- Standard rate limiting (10 req/min)
- No priority queue
- 30-day usage history retention

#### Pro Tier ($19/month)
**Credits & Models**:
- 20,000 credits/month (+18,000 from Free)
- Rollover up to 10,000 credits (1 month)
- Access to pro-tier models (GPT-4, Claude 3.5 Sonnet, Gemini Pro)
- Priority processing speed (1.5x faster)
- All public LLM providers

**Features**:
- ✅ All Free tier features
- Unlimited custom command templates
- 5 workspaces (Spaces)
- Email support (48-hour SLA)
- Advanced keyboard shortcuts
- Custom hotkey combinations
- Usage analytics dashboard
- Export conversation history

**Limits**:
- Max 200 API calls/day
- Max 3 concurrent requests
- Elevated rate limiting (30 req/min)
- Standard priority queue
- 90-day usage history retention

#### Pro Max Tier ($49/month)
**Credits & Models**:
- 60,000 credits/month (+40,000 from Pro)
- Rollover up to 30,000 credits (3 months)
- Access to all pro models + premium tier (GPT-5 preview, Claude Opus)
- High-priority processing (2x faster)
- Early access to new model releases

**Features**:
- ✅ All Pro tier features
- Unlimited workspaces
- Priority email support (24-hour SLA)
- Live chat support (business hours)
- Advanced usage analytics with exports
- Custom LLM endpoint integration (bring your own API keys)
- Bulk command execution
- Team sharing (up to 3 users)

**Limits**:
- Max 1,000 API calls/day
- Max 10 concurrent requests
- Premium rate limiting (60 req/min)
- High priority queue
- 180-day usage history retention
- 10 GB workspace storage

#### Enterprise Pro Tier ($149/month)
**Credits & Models**:
- 250,000 credits/month (+190,000 from Pro Max)
- Rollover up to 100,000 credits (6 months)
- Access to all models including enterprise-grade
- Enterprise priority processing (3x faster)
- Dedicated model instances (optional add-on)

**Features**:
- ✅ All Pro Max features
- Unlimited team members
- Unlimited workspaces with collaboration
- Priority phone + email support (12-hour SLA)
- Dedicated account manager (optional)
- Advanced RBAC and permissions
- SSO integration (SAML, OAuth)
- Audit logging and compliance reports
- Custom branding/white-labeling
- On-premise deployment option (add-on)

**Limits**:
- Max 10,000 API calls/day
- Max 50 concurrent requests
- Enterprise rate limiting (120 req/min)
- Highest priority queue
- Unlimited usage history retention
- 100 GB workspace storage
- 99.5% uptime SLA

#### Enterprise Max Tier (Custom Pricing)
**Credits & Models**:
- Unlimited credits
- Access to all models + beta/experimental features
- Dedicated infrastructure (isolated instances)
- Custom model fine-tuning (add-on)

**Features**:
- ✅ All Enterprise Pro features
- Unlimited everything (API calls, storage, users)
- 24/7 phone + email support (4-hour SLA)
- Dedicated success team
- Custom integration development
- Priority feature requests
- Quarterly business reviews
- Training and onboarding programs
- Advanced security features (VPN, custom encryption)
- Air-gapped deployment options

**Limits**:
- No limits
- 99.95% uptime SLA
- Custom SLA negotiations available

---

## Credit System & Usage Metering

### Credit Allocation Formula

**Base Credits by Tier**:
```
Free:           2,000 credits/month
Pro:           20,000 credits/month (10x Free)
Pro Max:       60,000 credits/month (3x Pro)
Enterprise Pro: 250,000 credits/month (4.17x Pro Max)
Enterprise Max: Unlimited
```

**Credit Consumption Rates** (aligned with model tier access):

| Model | Input (per 1k tokens) | Output (per 1k tokens) | Typical Use Case |
|-------|----------------------|------------------------|------------------|
| GPT-3.5-Turbo | 1 | 2 | Quick transformations, basic tasks |
| Gemini 2.0 Flash | 1 | 2 | Fast, cost-effective tasks |
| Claude 3.5 Haiku | 2 | 3 | Balanced performance |
| GPT-4o | 5 | 10 | Complex reasoning |
| Claude 3.5 Sonnet | 6 | 12 | Coding, technical writing |
| Gemini 2.0 Pro | 7 | 14 | Long-context tasks |
| GPT-4 Turbo | 10 | 20 | High-quality output |
| Claude 3 Opus | 15 | 30 | Mission-critical tasks |
| GPT-5 | 20 | 40 | Latest flagship model |

**Example Usage Calculations**:

```
Pro Tier User (20,000 credits/month):
- Using GPT-4o (5 credits/1k input, 10 credits/1k output)
- Average request: 500 input tokens + 500 output tokens
- Credit cost: (0.5 × 5) + (0.5 × 10) = 2.5 + 5 = 7.5 credits
- Requests/month: 20,000 ÷ 7.5 = ~2,666 requests

Pro Max User (60,000 credits/month):
- Using Claude 3.5 Sonnet (6/12 credits)
- Average request: 800 input + 1200 output tokens
- Credit cost: (0.8 × 6) + (1.2 × 12) = 4.8 + 14.4 = 19.2 credits
- Requests/month: 60,000 ÷ 19.2 = ~3,125 requests
```

### Rollover & Expiration Rules

**Credit Rollover Policies**:
- **Free**: No rollover (use it or lose it)
- **Pro**: Rollover up to 10,000 credits (50% of monthly allocation), expires after 1 month
- **Pro Max**: Rollover up to 30,000 credits (50%), expires after 3 months
- **Enterprise Pro**: Rollover up to 100,000 credits (40%), expires after 6 months
- **Enterprise Max**: No expiration (unlimited)

**Rollover Logic**:
```typescript
function calculateRollover(
  tier: SubscriptionTier,
  unusedCredits: number,
  previousRollover: number
): number {
  const rolloverLimits = {
    free: 0,
    pro: 10000,
    pro_max: 30000,
    enterprise_pro: 100000,
    enterprise_max: Infinity
  };

  const rolloverExpiry = {
    free: 0,
    pro: 1,          // months
    pro_max: 3,
    enterprise_pro: 6,
    enterprise_max: Infinity
  };

  const maxRollover = rolloverLimits[tier];
  const totalRollover = unusedCredits + previousRollover;

  return Math.min(totalRollover, maxRollover);
}
```

### Overage Handling

**Overage Charges** (when credits depleted mid-cycle):

| Tier | Overage Rate | Auto-Purchase | Hard Cap |
|------|-------------|---------------|----------|
| Free | Not allowed | No | 2,000 credits |
| Pro | $0.001/credit | Optional | 30,000 add-on |
| Pro Max | $0.0008/credit | Optional | 100,000 add-on |
| Enterprise Pro | $0.0006/credit | Yes | 500,000 add-on |
| Enterprise Max | Negotiated | Yes | None |

**Overage Notification Thresholds**:
- 75% usage: Warning notification
- 90% usage: Critical alert
- 100% usage: Depleted notification + upgrade prompt
- Overage enabled: Purchase confirmation

---

## Pricing Strategy

### Pricing Philosophy

**Value-Based Positioning**:
- Price anchored to **time saved** and **productivity gains**, not cost
- Target ROI: 10x for Pro ($190/year saves 20+ hours valued at $50/hr = $1000+)
- Target ROI: 5x for Enterprise Pro (saves $750+/month in employee time)

**Competitive Positioning**:
- **ChatGPT Plus**: $20/month (similar to our Pro)
- **Claude Pro**: $20/month (similar to our Pro)
- **Copilot Pro**: $10/month (lighter usage, single-purpose)
- **Jasper AI**: $39-125/month (content creation focus)
- **Grammarly Business**: $15/user/month (writing assistant)

**Our Differentiation**:
- System-wide text transformation (not just chatbot)
- Multi-LLM provider (user choice, no lock-in)
- Offline mode with Ollama
- Privacy-focused (local processing option)
- Customizable command templates
- Workspace collaboration

### Pricing Tiers Rationale

**Why 5 Tiers?**:
- Research shows 3-5 tiers is optimal (we're at upper bound)
- Each tier serves distinct user persona:
  1. **Free**: Trial/hobbyist (lead generation)
  2. **Pro**: Individual professional (mass market)
  3. **Pro Max**: Power user (premium individual)
  4. **Enterprise Pro**: SMB teams (growth market)
  5. **Enterprise Max**: Large enterprise (high-touch sales)

**Tier Pricing Jumps**:
- Free → Pro: $19 (affordable entry point)
- Pro → Pro Max: +$30 (2.6x value, 3x credits) - **decoy tier** to make Pro Max attractive
- Pro Max → Enterprise Pro: +$100 (4.2x credits + team features) - **value gap** justifies price
- Enterprise Pro → Enterprise Max: Custom (unlimited value)

**Annual Discount Strategy**:
- 17% discount (~2 months free) incentivizes annual commitments
- Improves cash flow and reduces churn
- Industry standard: 15-20% annual discount

### Revenue Projections (Year 1)

**Assumptions**:
- 10,000 total users by end of Year 1
- Conversion rate from Free: 8% (industry average: 5-10%)
- Tier distribution:
  - Free: 70% (7,000 users)
  - Pro: 20% (2,000 users)
  - Pro Max: 7% (700 users)
  - Enterprise Pro: 2.5% (250 users)
  - Enterprise Max: 0.5% (50 users)

**Monthly Recurring Revenue (MRR)**:
```
Pro:           2,000 × $19  = $38,000
Pro Max:         700 × $49  = $34,300
Enterprise Pro:  250 × $149 = $37,250
Enterprise Max:   50 × $500 = $25,000 (avg custom pricing)
───────────────────────────────────────
Total MRR:                    $134,550

Annual Recurring Revenue (ARR): $1,614,600
```

**With 50% Annual Subscribers** (higher LTV):
```
Annual subscribers: 1,500 users × avg $400/yr = $600,000/yr
Monthly subscribers: 1,500 users × avg $45/mo = $67,500/mo × 12 = $810,000/yr
───────────────────────────────────────
Total ARR:                                $1,410,000
```

**Additional Revenue Streams**:
- Overage charges: ~$5k-10k/month
- Add-on services (custom models, dedicated instances): ~$20k/month
- Professional services (training, integration): ~$30k/month

**Total Year 1 Revenue Target**: $1.5M - $1.8M ARR

---

## Admin Moderation System

### Overview

A comprehensive admin dashboard for managing all aspects of the Rephlo platform, including subscriptions, users, billing, credits, models, and system health.

### Admin Dashboard Structure

```
/admin
├── /dashboard             # Overview with key metrics
├── /users                 # User management
│   ├── /list             # Searchable user list
│   ├── /details/:id      # Individual user profile
│   └── /bulk-actions     # Bulk operations
├── /subscriptions         # Subscription management
│   ├── /list             # All subscriptions
│   ├── /details/:id      # Individual subscription
│   ├── /plans            # Plan configuration
│   └── /lifecycle        # Lifecycle automation
├── /billing               # Billing & payments
│   ├── /transactions     # Payment history
│   ├── /invoices         # Invoice management
│   ├── /failed-payments  # Dunning management
│   └── /refunds          # Refund requests
├── /credits               # Credit management
│   ├── /allocations      # Monthly allocations
│   ├── /usage            # Usage analytics
│   ├── /adjustments      # Manual adjustments
│   └── /rollover         # Rollover tracking
├── /models                # Model tier management (already implemented)
├── /analytics             # Platform analytics
│   ├── /revenue          # Revenue metrics
│   ├── /usage            # Usage patterns
│   ├── /conversion       # Funnel analysis
│   └── /churn            # Churn analysis
└── /system                # System health
    ├── /health           # Service status
    ├── /alerts           # System alerts
    └── /audit-logs       # Admin action logs
```

### Core Moderation Features

#### 1. User Management

**User List View**:
- **Columns**: Email, Name, Tier, Status, Credits Remaining, Last Active, Actions
- **Filters**: Tier, Status (active/suspended/banned), Registration date, Last active
- **Search**: Email, name, user ID
- **Sort**: All columns sortable
- **Pagination**: 25/50/100 per page

**User Actions**:
- **View Details**: Full user profile with all data
- **Edit Profile**: Update user information
- **Change Tier**: Upgrade/downgrade subscription
- **Adjust Credits**: Add/remove credits manually
- **Suspend Account**: Temporary suspension with reason
- **Ban Account**: Permanent ban with reason
- **Delete Account**: GDPR-compliant deletion
- **Send Email**: Direct communication
- **View Activity**: Usage history, API calls, login history
- **Impersonate** (with audit log): View platform as user (debugging)

**Bulk Operations**:
- **Import Users**: CSV upload with mapping
- **Export Users**: CSV/Excel export with filters
- **Bulk Email**: Send announcements/notifications
- **Bulk Tier Change**: Migrate users between tiers
- **Bulk Credit Adjustment**: Add bonus credits for promotions

**User Status Workflow**:
```
Active → Suspended (reversible, grace period)
       → Banned (permanent, requires review)
       → Deleted (GDPR compliance, 30-day soft delete)
```

#### 2. Subscription Management

**Subscription List View**:
- **Columns**: User, Tier, Status, Billing Interval, MRR, Next Billing Date, Actions
- **Filters**: Tier, Status, Billing interval, Stripe status, Renewal date
- **Search**: User email, Stripe subscription ID
- **Metrics Cards**:
  - Total MRR
  - Active subscriptions
  - Trials ending soon
  - Failed payments
  - Churn rate (30-day)

**Subscription Actions**:
- **View Details**: Full subscription info + Stripe data
- **Change Tier**: Upgrade/downgrade with proration
- **Change Billing Cycle**: Monthly ↔ Annual
- **Apply Coupon**: Add discount code
- **Extend Trial**: Add days to trial period
- **Pause Subscription**: Temporary pause (retain credits)
- **Cancel Subscription**: Immediate or end-of-period
- **Reactivate**: Restore cancelled subscription
- **Refund**: Issue full/partial refund
- **Sync with Stripe**: Force sync billing data

**Subscription Lifecycle Automation**:
- **Trial Expiration**:
  - 3 days before: Send upgrade email
  - 1 day before: Final reminder
  - On expiration: Downgrade to Free tier
- **Failed Payment**:
  - Day 0: Retry payment immediately
  - Day 3: Send payment failed email
  - Day 7: Retry payment again
  - Day 14: Suspend subscription
  - Day 21: Cancel subscription
- **Renewal Reminder**:
  - 7 days before: Send renewal reminder (annual subs)
  - 3 days before: Final reminder
- **Cancellation at Period End**:
  - 14 days before: Win-back email campaign
  - 7 days before: Offer discount/retention
  - On cancellation: Exit survey

#### 3. Billing & Payments

**Transaction List**:
- **Columns**: Date, User, Type, Amount, Status, Stripe ID, Actions
- **Filters**: Type (charge/refund), Status (success/failed), Date range, Amount range
- **Search**: User, Stripe transaction ID, invoice number

**Transaction Types**:
- Subscription payment
- Overage charge
- Add-on purchase
- Refund
- Credit adjustment

**Failed Payment Management** (Dunning):
- **Dashboard**: Failed payments requiring attention
- **Retry Queue**: Scheduled retry attempts
- **Email Campaign**: Automated dunning emails
- **Manual Retry**: Force retry payment method
- **Update Payment Method**: Send update link to user
- **Write-off**: Mark as uncollectible

**Invoice Management**:
- **Generate Invoice**: Create manual invoice
- **Send Invoice**: Email invoice to customer
- **Download PDF**: Export invoice as PDF
- **Mark Paid**: Manually mark as paid (offline payment)
- **Void Invoice**: Cancel invoice

**Refund Workflow**:
- **Request Review**: List of pending refund requests
- **Approve/Deny**: Admin decision with reason
- **Partial Refund**: Specify amount
- **Credit Note**: Issue credit instead of refund
- **Audit Trail**: Track all refund decisions

#### 4. Credit Management

**Credit Allocation Dashboard**:
- **Metrics**:
  - Total credits allocated this month
  - Total credits consumed
  - Average credits per user by tier
  - Rollover credits by tier
- **Charts**:
  - Daily credit usage (line chart)
  - Credit distribution by tier (pie chart)
  - Top 10 credit consumers (bar chart)

**Manual Credit Adjustments**:
- **Add Credits**:
  - User selection
  - Amount
  - Reason (required)
  - Expiration date (optional)
  - Notification email (optional)
- **Remove Credits**:
  - User selection
  - Amount (cannot go negative)
  - Reason (required)
  - Notification email
- **Bonus Credits**:
  - Promotional credits (separate from monthly allocation)
  - Expiration tracking
  - Usage tracking

**Credit Usage Analytics**:
- **Per-User Analysis**:
  - Monthly usage trend
  - Model preference
  - Peak usage times
  - Overage likelihood prediction
- **Platform-Wide Analytics**:
  - Credits used by model
  - Credits used by tier
  - Credit efficiency metrics
  - Waste/unused credits

**Rollover Management**:
- **Rollover Queue**: Users with pending rollover
- **Expiration Alerts**: Rollovers expiring soon
- **Manual Rollover Adjustment**: Fix rollover calculation errors

#### 5. Model Tier Management

**(Already Implemented - Reference Only)**

- List models with tier assignments
- Update single/bulk model tiers
- Tier restriction modes (minimum/exact/whitelist)
- Audit log of tier changes
- Revert tier changes

#### 6. Platform Analytics

**Revenue Analytics**:
- **MRR Tracking**:
  - Current MRR
  - MRR growth rate (MoM)
  - MRR by tier
  - New MRR vs. Churned MRR
  - Expansion MRR (upgrades)
  - Contraction MRR (downgrades)
- **ARR Projections**:
  - Current ARR
  - Projected ARR (12-month forecast)
  - ARR by tier
- **Cohort Analysis**:
  - Monthly cohorts
  - Retention by cohort
  - LTV by cohort

**Usage Analytics**:
- **API Calls**:
  - Total API calls/day
  - Calls by tier
  - Calls by model
  - Peak usage times
- **Credit Consumption**:
  - Daily credit burn rate
  - Credits by model
  - Credits by tier
  - Overage frequency
- **Feature Usage**:
  - Command templates used
  - Workspaces created
  - Hotkey usage
  - Provider preference

**Conversion Funnel**:
- **Stages**:
  1. Registration
  2. First API call
  3. 7-day activation
  4. Subscription purchase
  5. Renewal
- **Metrics**:
  - Conversion rate by stage
  - Drop-off analysis
  - Time to convert
  - Conversion by channel

**Churn Analysis**:
- **Metrics**:
  - Monthly churn rate
  - Churn by tier
  - Voluntary vs. involuntary churn
  - Churn reasons (exit survey)
- **Predictive Churn**:
  - At-risk users (ML model)
  - Engagement score
  - Usage decline alerts

#### 7. System Health & Monitoring

**Service Status Dashboard**:
- **Services**:
  - Backend API (health endpoint)
  - Identity Provider (OIDC)
  - Database (Prisma)
  - Stripe API
  - LLM Providers (OpenAI, Anthropic, Google, etc.)
- **Metrics**:
  - Uptime percentage
  - Response time (p50, p95, p99)
  - Error rate
  - Request volume

**Alert Management**:
- **Alert Types**:
  - Service down
  - High error rate
  - Slow response time
  - Failed payment spike
  - Credit depletion anomaly
  - Suspicious activity
- **Alert Configuration**:
  - Threshold settings
  - Notification channels (email, Slack, SMS)
  - Escalation rules
- **Alert History**:
  - Past alerts
  - Resolution time
  - Root cause analysis

**Audit Logs**:
- **Admin Actions Logged**:
  - User modifications
  - Subscription changes
  - Credit adjustments
  - Model tier changes
  - Refund approvals
  - System configuration changes
- **Log Fields**:
  - Timestamp
  - Admin user
  - Action type
  - Resource (user/subscription/etc.)
  - Before/after values
  - IP address
  - Reason (if provided)
- **Log Retention**: 2 years (compliance)

### Admin Roles & Permissions

**Role-Based Access Control (RBAC)**:

| Permission | Super Admin | Admin | Support | Analyst | Auditor |
|------------|------------|-------|---------|---------|---------|
| View Users | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Users | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Subscriptions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Subscriptions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancel Subscriptions | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Billing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Issue Refunds | ✅ | ✅ | ❌ | ❌ | ❌ |
| Adjust Credits | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Models | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ | ✅ | ✅ |
| System Configuration | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Admins | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ✅ |

**Admin User Management**:
- Create/edit/delete admin users
- Assign roles
- 2FA enforcement for admins
- Session management
- Login history

---

## Database Schema Enhancements

### New Enum Values

**Update SubscriptionTier Enum**:
```prisma
enum SubscriptionTier {
  free
  pro
  pro_max          // NEW
  enterprise_pro   // NEW (rename from enterprise)
  enterprise_max   // NEW

  @@map("subscription_tier")
}
```

**Add New Enums**:
```prisma
enum UserStatus {
  active
  suspended        // Temporary suspension
  banned          // Permanent ban
  deleted         // Soft delete (GDPR)

  @@map("user_status")
}

enum RefundStatus {
  pending
  approved
  denied
  processed

  @@map("refund_status")
}

enum CreditAdjustmentType {
  bonus           // Promotional credits
  manual_add      // Admin added
  manual_remove   // Admin removed
  refund          // Credits from refund
  rollover        // Monthly rollover

  @@map("credit_adjustment_type")
}
```

### New Tables

#### SubscriptionPlan Table
```prisma
model SubscriptionPlan {
  id               String           @id @default(uuid()) @db.Uuid
  tier             SubscriptionTier
  billingInterval  String           @db.VarChar(20) // monthly | annual
  priceCents       Int              @map("price_cents")
  creditsPerMonth  Int              @map("credits_per_month")
  creditsRollover  Boolean          @default(false) @map("credits_rollover")
  maxRollover      Int?             @map("max_rollover")
  rolloverMonths   Int?             @map("rollover_months")
  maxApiCalls      Int?             @map("max_api_calls_per_day")
  maxConcurrent    Int?             @map("max_concurrent_requests")
  rateLimit        Int?             @map("rate_limit_per_minute")
  features         Json             @map("features") // JSON array of features
  stripePriceId    String           @map("stripe_price_id") @db.VarChar(255)
  isActive         Boolean          @default(true) @map("is_active")
  sortOrder        Int              @map("sort_order")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  @@unique([tier, billingInterval])
  @@index([isActive])
  @@map("subscription_plans")
}
```

#### CreditAdjustment Table
```prisma
model CreditAdjustment {
  id          String                @id @default(uuid()) @db.Uuid
  userId      String                @map("user_id") @db.Uuid
  adminUserId String?               @map("admin_user_id") @db.Uuid
  type        CreditAdjustmentType
  amount      Int                   // Positive = added, Negative = removed
  reason      String                @db.Text
  expiresAt   DateTime?             @map("expires_at")
  createdAt   DateTime              @default(now()) @map("created_at")

  // Relations
  user  User  @relation("UserCreditAdjustments", fields: [userId], references: [id], onDelete: Cascade)
  admin User? @relation("AdminCreditAdjustments", fields: [adminUserId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([adminUserId])
  @@index([createdAt])
  @@map("credit_adjustments")
}
```

#### RefundRequest Table
```prisma
model RefundRequest {
  id               String        @id @default(uuid()) @db.Uuid
  userId           String        @map("user_id") @db.Uuid
  subscriptionId   String        @map("subscription_id") @db.Uuid
  amountCents      Int           @map("amount_cents")
  reason           String        @db.Text
  status           RefundStatus  @default(pending)
  reviewedBy       String?       @map("reviewed_by") @db.Uuid
  reviewNotes      String?       @map("review_notes") @db.Text
  stripeRefundId   String?       @map("stripe_refund_id") @db.VarChar(255)
  requestedAt      DateTime      @default(now()) @map("requested_at")
  reviewedAt       DateTime?     @map("reviewed_at")
  processedAt      DateTime?     @map("processed_at")

  // Relations
  user         User         @relation("UserRefunds", fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription @relation(fields: [subscriptionId], references: [id])
  reviewer     User?        @relation("ReviewerRefunds", fields: [reviewedBy], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([status])
  @@index([requestedAt])
  @@map("refund_requests")
}
```

#### UserSuspension Table
```prisma
model UserSuspension {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  suspendedBy String    @map("suspended_by") @db.Uuid
  reason      String    @db.Text
  suspendedAt DateTime  @default(now()) @map("suspended_at")
  expiresAt   DateTime? @map("expires_at") // null = indefinite
  liftedAt    DateTime? @map("lifted_at")
  liftedBy    String?   @map("lifted_by") @db.Uuid

  // Relations
  user       User  @relation("UserSuspensions", fields: [userId], references: [id], onDelete: Cascade)
  suspender  User  @relation("SuspenderActions", fields: [suspendedBy], references: [id])
  lifter     User? @relation("LifterActions", fields: [liftedBy], references: [id])

  @@index([userId])
  @@index([suspendedAt])
  @@map("user_suspensions")
}
```

#### AdminAuditLog Table
```prisma
model AdminAuditLog {
  id            String   @id @default(uuid()) @db.Uuid
  adminUserId   String   @map("admin_user_id") @db.Uuid
  action        String   @db.VarChar(100)
  resourceType  String   @map("resource_type") @db.VarChar(50)
  resourceId    String?  @map("resource_id") @db.Uuid
  previousValue Json?    @map("previous_value")
  newValue      Json?    @map("new_value")
  reason        String?  @db.Text
  ipAddress     String?  @map("ip_address") @db.VarChar(45)
  userAgent     String?  @map("user_agent") @db.Text
  createdAt     DateTime @default(now()) @map("created_at")

  // Relations
  admin User @relation("AdminActions", fields: [adminUserId], references: [id])

  @@index([adminUserId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("admin_audit_logs")
}
```

### Modified Tables

**User Table Updates**:
```prisma
model User {
  // ... existing fields ...

  // NEW FIELDS
  status              UserStatus  @default(active)
  suspendedUntil      DateTime?   @map("suspended_until")
  bannedAt            DateTime?   @map("banned_at")
  banReason           String?     @map("ban_reason") @db.Text
  deletedAt           DateTime?   @map("deleted_at") // Soft delete
  lifetimeValue       Int         @default(0) @map("lifetime_value") // Total revenue in cents
  churnRiskScore      Decimal?    @map("churn_risk_score") @db.Decimal(5, 4) // 0.0000 - 1.0000

  // NEW RELATIONS
  creditAdjustments      CreditAdjustment[]  @relation("UserCreditAdjustments")
  adminCreditAdjustments CreditAdjustment[]  @relation("AdminCreditAdjustments")
  refundRequests         RefundRequest[]     @relation("UserRefunds")
  refundReviews          RefundRequest[]     @relation("ReviewerRefunds")
  suspensions            UserSuspension[]    @relation("UserSuspensions")
  suspendedUsers         UserSuspension[]    @relation("SuspenderActions")
  liftedSuspensions      UserSuspension[]    @relation("LifterActions")
  adminActions           AdminAuditLog[]     @relation("AdminActions")

  @@index([status])
  @@index([churnRiskScore])
}
```

**Subscription Table Updates**:
```prisma
model Subscription {
  // ... existing fields ...

  // NEW FIELDS
  planId                String?   @map("plan_id") @db.Uuid
  overageAllowed        Boolean   @default(false) @map("overage_allowed")
  overageCharged        Int       @default(0) @map("overage_charged") // Credits purchased
  autoRenew             Boolean   @default(true) @map("auto_renew")
  pausedAt              DateTime? @map("paused_at")
  pausedUntil           DateTime? @map("paused_until")
  couponCode            String?   @map("coupon_code") @db.VarChar(50)
  discountPercent       Int?      @map("discount_percent")
  lifetimeRevenue       Int       @default(0) @map("lifetime_revenue") // Total paid in cents
  failedPaymentCount    Int       @default(0) @map("failed_payment_count")
  lastFailedPaymentAt   DateTime? @map("last_failed_payment_at")

  // NEW RELATIONS
  plan           SubscriptionPlan? @relation(fields: [planId], references: [id])
  refundRequests RefundRequest[]

  @@index([planId])
  @@index([pausedAt])
  @@index([autoRenew])
}
```

**Credit Table Updates**:
```prisma
model Credit {
  // ... existing fields ...

  // NEW FIELDS
  bonusCredits        Int      @default(0) @map("bonus_credits")
  bonusCreditsUsed    Int      @default(0) @map("bonus_credits_used")
  bonusExpiresAt      DateTime? @map("bonus_expires_at")
  rolloverSource      String?  @map("rollover_source") @db.Uuid // Previous credit record ID
  rolloverAmount      Int      @default(0) @map("rollover_amount")
  rolloverExpiresAt   DateTime? @map("rollover_expires_at")

  @@index([bonusExpiresAt])
  @@index([rolloverExpiresAt])
}
```

---

## Implementation Phases

### Phase 1: Database Schema & Tier Expansion (Week 1-2)

**Deliverables**:
- Update SubscriptionTier enum with 5 tiers
- Create new tables (SubscriptionPlan, CreditAdjustment, RefundRequest, etc.)
- Add new fields to existing tables
- Create Prisma migrations
- Update seed data with 5-tier plans
- Update TypeScript types across codebase

**Tasks**:
1. Create Prisma migration for new enums
2. Create migration for new tables
3. Create migration for table modifications
4. Update seed.ts with 5 subscription plans
5. Generate Prisma client
6. Update all TypeScript interfaces/types
7. Test migrations in development

**Dependencies**: None

**Estimated Time**: 1 week

### Phase 2: Subscription Plan Management (Week 3-4)

**Deliverables**:
- Backend API for subscription plans (CRUD)
- Plan comparison logic
- Tier upgrade/downgrade logic with proration
- Credit allocation by tier
- Rollover calculation logic

**Tasks**:
1. Create SubscriptionPlanService
2. Create SubscriptionPlanController
3. Add /admin/subscription-plans endpoints
4. Implement tier change logic with Stripe proration
5. Update credit allocation service for new tiers
6. Implement rollover calculation for each tier
7. Add unit tests for tier logic
8. Integration tests for subscription changes

**Dependencies**: Phase 1

**Estimated Time**: 2 weeks

### Phase 3: Admin User Management UI (Week 5-6)

**Deliverables**:
- User list page with search/filter
- User details page
- User actions (edit, suspend, ban, delete)
- Bulk operations (import, export, email)
- User suspension workflow
- Activity logs

**Tasks**:
1. Create UserListPage component
2. Create UserDetailsPage component
3. Create UserActionDialog components
4. Implement search/filter logic
5. Implement bulk operations
6. Add pagination
7. Create suspension workflow UI
8. Integrate with backend APIs

**Dependencies**: Phase 2

**Estimated Time**: 2 weeks

### Phase 4: Admin Subscription Management UI (Week 7-8)

**Deliverables**:
- Subscription list page
- Subscription details page
- Tier change workflow
- Pause/resume subscription
- Cancellation workflow
- Refund management

**Tasks**:
1. Create SubscriptionListPage component
2. Create SubscriptionDetailsPage component
3. Create TierChangeDialog component
4. Implement pause/resume logic
5. Create cancellation workflow
6. Build refund request review UI
7. Add metrics cards (MRR, churn, etc.)
8. Integration tests

**Dependencies**: Phase 3

**Estimated Time**: 2 weeks

### Phase 5: Credit Management & Analytics (Week 9-10)

**Deliverables**:
- Credit allocation dashboard
- Manual credit adjustment UI
- Credit usage analytics
- Rollover management
- Overage tracking

**Tasks**:
1. Create CreditDashboardPage component
2. Create CreditAdjustmentDialog component
3. Implement usage analytics charts
4. Build rollover management UI
5. Create overage alerts
6. Add bonus credit UI
7. Integration tests

**Dependencies**: Phase 4

**Estimated Time**: 2 weeks

### Phase 6: Billing & Payments (Week 11-12)

**Deliverables**:
- Transaction list
- Failed payment (dunning) management
- Invoice management
- Refund workflow
- Payment method updates

**Tasks**:
1. Create TransactionListPage component
2. Create DunningManagement component
3. Implement invoice generation
4. Build refund approval workflow
5. Add payment retry logic
6. Create email templates for billing
7. Integration with Stripe webhooks
8. End-to-end testing

**Dependencies**: Phase 5

**Estimated Time**: 2 weeks

### Phase 7: Platform Analytics (Week 13-14)

**Deliverables**:
- Revenue analytics dashboard
- Usage analytics
- Conversion funnel
- Churn analysis
- Cohort analysis

**Tasks**:
1. Create AnalyticsDashboard component
2. Implement revenue charts (MRR, ARR, growth)
3. Build usage analytics (API calls, credits)
4. Create conversion funnel visualization
5. Implement churn analysis
6. Add cohort analysis
7. Export functionality
8. Caching for performance

**Dependencies**: Phase 6

**Estimated Time**: 2 weeks

### Phase 8: System Health & Audit Logs (Week 15)

**Deliverables**:
- System health dashboard
- Alert management
- Admin audit logs
- Service status monitoring

**Tasks**:
1. Create SystemHealthPage component
2. Implement health check endpoints
3. Build alert configuration UI
4. Create audit log viewer
5. Add service status monitors
6. Implement alert notifications
7. Integration tests

**Dependencies**: Phase 7

**Estimated Time**: 1 week

### Phase 9: Desktop App Integration (Week 16-18)

**Deliverables**:
- Desktop app authentication with new API
- Subscription tier display
- Credit usage tracking
- Model access based on tier
- Upgrade prompts
- Offline mode handling

**Tasks**:
1. Update desktop app OAuth client
2. Implement tier-aware UI
3. Show credit balance in status bar
4. Disable models based on tier
5. Add upgrade prompts
6. Handle subscription expiration
7. Local caching for offline mode
8. End-to-end testing

**Dependencies**: Phases 1-8

**Estimated Time**: 3 weeks

### Phase 10: Testing & Launch Preparation (Week 19-20)

**Deliverables**:
- Comprehensive test suite
- Beta testing with select users
- Documentation
- Launch marketing materials
- Support resources

**Tasks**:
1. End-to-end testing all features
2. Load testing (1000+ concurrent users)
3. Security audit
4. Beta program with 50-100 users
5. Create user documentation
6. Prepare FAQ and support articles
7. Create pricing page
8. Train support team
9. Launch checklist

**Dependencies**: Phase 9

**Estimated Time**: 2 weeks

**Total Implementation Time**: 20 weeks (~5 months)

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Revenue Metrics**:
- **MRR Growth**: Target 20% MoM
- **ARR**: Target $1.5M by end of Year 1
- **ARPU (Average Revenue Per User)**: Target $45/month
- **LTV (Lifetime Value)**: Target $540 (12-month average)
- **CAC (Customer Acquisition Cost)**: Target < $100
- **LTV:CAC Ratio**: Target > 5:1

**Conversion Metrics**:
- **Free → Paid Conversion**: Target 8-10%
- **Trial → Paid Conversion**: Target 25% (if offering trials)
- **Upgrade Rate** (Pro → Pro Max): Target 15%
- **Upgrade Rate** (Pro Max → Enterprise Pro): Target 10%
- **Time to First Paid**: Target < 14 days

**Retention Metrics**:
- **Monthly Churn Rate**: Target < 5%
- **Annual Churn Rate**: Target < 20%
- **Net Revenue Retention**: Target > 100%
- **90-Day Retention**: Target 70%
- **Logo Retention**: Target 85%

**Usage Metrics**:
- **Daily Active Users (DAU)**: Track growth
- **Monthly Active Users (MAU)**: Track growth
- **DAU/MAU Ratio**: Target > 30% (stickiness)
- **Average API Calls/User/Day**: Track by tier
- **Credits Used vs. Allocated**: Target 60-70% utilization

**Satisfaction Metrics**:
- **NPS (Net Promoter Score)**: Target > 40
- **CSAT (Customer Satisfaction)**: Target > 80%
- **Support Ticket Volume**: Track trend
- **First Response Time**: Target < 2 hours
- **Resolution Time**: Target < 24 hours

### Launch Success Criteria

**Month 1**:
- 1,000+ registered users
- 50+ paid subscribers
- $2,500+ MRR
- < 10% churn rate
- NPS > 30

**Month 3**:
- 3,000+ registered users
- 200+ paid subscribers
- $10,000+ MRR
- < 7% churn rate
- NPS > 35

**Month 6**:
- 6,000+ registered users
- 500+ paid subscribers
- $30,000+ MRR
- < 5% churn rate
- NPS > 40

**Month 12**:
- 10,000+ registered users
- 1,500+ paid subscribers
- $67,500+ MRR ($810k ARR)
- < 5% churn rate
- NPS > 45

---

## Appendix

### A. Competitive Pricing Comparison (2025)

| Product | Pricing | Credits/Month | Model Access | Target |
|---------|---------|---------------|--------------|--------|
| **Rephlo Pro** | $19/mo | 20,000 | GPT-4, Claude 3.5 | Professionals |
| ChatGPT Plus | $20/mo | Unlimited | GPT-4o | General users |
| Claude Pro | $20/mo | Unlimited | Claude 3.5 Sonnet | General users |
| Copilot Pro | $10/mo | Unlimited | GPT-4 Turbo | Developers |
| Jasper AI | $39/mo | Unlimited | GPT-4, Claude | Content writers |
| Grammarly Business | $15/user | N/A | Proprietary | Writing assistant |

**Our Advantage**:
- System-wide integration (not just chat)
- Multi-LLM provider choice
- Offline mode (Ollama)
- Command templates & automation
- Privacy-focused

### B. Credit Calculation Examples

**Example 1: Daily Content Writer (Pro Tier)**
```
User: Pro tier (20,000 credits/month, $19/mo)
Usage: 50 text transformations/day using GPT-4o
Average: 300 input + 500 output tokens per request

Daily credits:
- 50 requests × [(0.3 × 5) + (0.5 × 10)] = 50 × 6.5 = 325 credits/day

Monthly credits:
- 325 × 30 days = 9,750 credits
- Remaining: 20,000 - 9,750 = 10,250 credits (51% utilization)

Verdict: Pro tier is sufficient with rollover buffer
```

**Example 2: Heavy Coding User (Pro Max Tier)**
```
User: Pro Max tier (60,000 credits/month, $49/mo)
Usage: 100 code transformations/day using Claude 3.5 Sonnet
Average: 500 input + 800 output tokens per request

Daily credits:
- 100 requests × [(0.5 × 6) + (0.8 × 12)] = 100 × 12.6 = 1,260 credits/day

Monthly credits:
- 1,260 × 30 days = 37,800 credits
- Remaining: 60,000 - 37,800 = 22,200 credits (63% utilization)

Verdict: Pro Max tier fits well, can scale to 150 requests/day before hitting limit
```

**Example 3: Enterprise Team (Enterprise Pro)**
```
Team: 10 users, Enterprise Pro tier (250,000 credits/month, $149/mo)
Usage: 50 requests/user/day using mixed models (avg 8 credits/request)

Daily credits:
- 10 users × 50 requests × 8 credits = 4,000 credits/day

Monthly credits:
- 4,000 × 30 days = 120,000 credits
- Remaining: 250,000 - 120,000 = 130,000 credits (48% utilization)

Cost per user: $149 ÷ 10 = $14.90/user/month

Verdict: Good value, can add 5 more users or scale usage 2x before limits
```

### C. Glossary

**MRR (Monthly Recurring Revenue)**: Predictable monthly revenue from subscriptions
**ARR (Annual Recurring Revenue)**: MRR × 12, or annual subscription revenue
**ARPU (Average Revenue Per User)**: Total revenue ÷ number of users
**LTV (Lifetime Value)**: Total revenue from a customer over their lifetime
**CAC (Customer Acquisition Cost)**: Total marketing/sales cost ÷ new customers acquired
**Churn Rate**: Percentage of customers who cancel per month
**NRR (Net Revenue Retention)**: (Starting MRR + Expansion - Churn) ÷ Starting MRR
**NPS (Net Promoter Score)**: Metric of customer satisfaction (-100 to 100)
**SLA (Service Level Agreement)**: Guaranteed uptime and support response times
**RBAC (Role-Based Access Control)**: Permission system based on user roles
**Dunning**: Automated process to recover failed payments

---

## Approval & Next Steps

**Required Approvals**:
- [ ] Product Owner: Tier structure and pricing
- [ ] Engineering Lead: Database schema and implementation plan
- [ ] Marketing: Pricing strategy and positioning
- [ ] Finance: Revenue projections and pricing
- [ ] Legal: Terms of service updates, refund policy

**Next Steps After Approval**:
1. Create detailed technical specification for Phase 1
2. Set up project tracking (Jira/Linear)
3. Assign development team
4. Create design mockups for admin UI
5. Begin Phase 1 implementation

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Next Review**: 2025-11-15
**Owner**: Product Team
**Contributors**: Engineering, Marketing, Finance
