# Pricing Configuration Guide for Billing Department

**Version:** 1.0
**Last Updated:** November 12, 2025
**Target Audience:** Billing Department, Finance Team, Revenue Operations

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing Pricing Configuration](#accessing-pricing-configuration)
3. [Understanding the Dashboard](#understanding-the-dashboard)
4. [Key Concepts](#key-concepts)
5. [Managing Tier Multipliers](#managing-tier-multipliers)
6. [Model-Specific Overrides](#model-specific-overrides)
7. [Approval Workflow](#approval-workflow)
8. [When to Use Different Configuration Types](#when-to-use-different-configuration-types)
9. [Best Practices](#best-practices)
10. [Common Scenarios](#common-scenarios)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Pricing Configuration?

The Pricing Configuration system allows you to control the **margin multipliers** applied to AI model costs across different subscription tiers, providers, and specific models. This ensures Rephlo maintains target profit margins while remaining competitive in the market.

### Why is it Important?

- **Protect Profit Margins**: Automatically adjust pricing when vendor costs change
- **Tier-Based Pricing**: Different multipliers for Free, Pro, and Enterprise customers
- **Flexibility**: Override pricing for specific providers or models
- **Transparency**: Track all pricing changes with reasons and approval status
- **Revenue Optimization**: Balance between competitive pricing and profitability

### Key Metrics Managed

- **Margin Multiplier**: How much we mark up vendor costs (e.g., 1.5× = 50% margin)
- **Target Gross Margin %**: Desired profit percentage on each API call
- **Actual Margin %**: Real-time margin based on usage patterns

---

## Accessing Pricing Configuration

### Navigation Path

1. Log in to Rephlo Admin Dashboard
2. Navigate to **Profitability** section in the left sidebar
3. Click **Pricing Configuration**

### Direct URL

```
https://admin.rephlo.com/admin/profitability/pricing
```

### Required Permissions

- **Role**: Admin or Finance Manager
- **Scope**: `admin` or `pricing.manage`

---

## Understanding the Dashboard

The Pricing Configuration page consists of three main sections:

### 1. Current Tier Multipliers Table

**Location**: Top of the page

**What It Shows**:
- All subscription tiers (Free, Pro, Pro Max, Enterprise Pro, Enterprise Max)
- Current multiplier for each tier
- Target margin percentage
- Actual margin percentage (with variance indicators)
- Configuration status (Active or Not Set)

**Color Coding**:
- 🟢 **Green Badge**: Margin is on target or above
- 🟡 **Amber Badge**: Margin is slightly below target (2-5% variance)
- 🔴 **Red Badge**: Margin is significantly below target (>5% variance)

**Example Row**:
```
Tier: Pro
Multiplier: 1.50×
Target Margin: 33.3%
Actual Margin: 31.8% 🟡 -1.5%
Status: Active
```

### 2. Model-Specific Overrides Table

**Location**: Middle of the page

**What It Shows**:
- Custom multipliers for specific providers (OpenAI, Anthropic, Google)
- Custom multipliers for specific models (GPT-4, Claude 3.5 Sonnet)
- Overrides that combine tier + provider + model

**Example Row**:
```
Provider: OpenAI
Model: GPT-4 Turbo
Base Multiplier: 1.50×
Override: 1.65×
Margin %: 39.4%
Active: ✓
```

### 3. Pending Approvals Section

**Location**: Bottom of the page (only visible when approvals exist)

**What It Shows**:
- Configurations waiting for approval
- Reason for the change
- Proposed multiplier
- Action buttons (Approve/Reject)

---

## Key Concepts

### Margin Multiplier

**Definition**: The factor by which we multiply vendor costs to determine customer pricing.

**Formula**:
```
Customer Price = Vendor Cost × Margin Multiplier
```

**Examples**:
- Multiplier of **1.5×** = 50% gross margin
  - Vendor charges $0.10 → We charge $0.15 → $0.05 profit
- Multiplier of **2.0×** = 50% gross margin
  - Vendor charges $0.10 → We charge $0.20 → $0.10 profit
- Multiplier of **1.3×** = 23% gross margin
  - Vendor charges $0.10 → We charge $0.13 → $0.03 profit

### Gross Margin Percentage

**Formula**:
```
Gross Margin % = ((Multiplier - 1) / Multiplier) × 100
```

**Quick Reference Table**:

| Multiplier | Gross Margin % | Example (Vendor = $1.00) | Profit |
|------------|----------------|--------------------------|--------|
| 1.20×      | 16.7%          | $1.20                    | $0.20  |
| 1.30×      | 23.1%          | $1.30                    | $0.30  |
| 1.40×      | 28.6%          | $1.40                    | $0.40  |
| 1.50×      | 33.3%          | $1.50                    | $0.50  |
| 1.75×      | 42.9%          | $1.75                    | $0.75  |
| 2.00×      | 50.0%          | $2.00                    | $1.00  |
| 2.50×      | 60.0%          | $2.50                    | $1.50  |

### Scope Types

Configurations can target different levels of granularity:

1. **Tier** (Most Common)
   - Applies to all models/providers for a specific subscription tier
   - Example: "All Pro users pay 1.5× vendor costs"

2. **Provider**
   - Applies to all models from a specific AI provider
   - Example: "All OpenAI models have 1.6× multiplier"

3. **Model**
   - Applies to a specific AI model across all tiers
   - Example: "GPT-4 Turbo has 1.7× multiplier for everyone"

4. **Combination** (Advanced)
   - Combines tier + provider + model for maximum precision
   - Example: "Enterprise Pro users using Claude 3.5 Sonnet pay 1.4×"

### Priority/Precedence

When multiple configurations could apply, the system uses this order:

1. **Combination** (tier + provider + model) - Highest Priority
2. **Model** (specific model)
3. **Provider** (specific provider)
4. **Tier** (subscription tier) - Lowest Priority (fallback)

**Example**:
```
User: Pro tier, using OpenAI GPT-4 Turbo

Active Configurations:
- Tier: Pro → 1.50×
- Provider: OpenAI → 1.60×
- Model: GPT-4 Turbo → 1.70×
- Combination: Pro + OpenAI + GPT-4 Turbo → 1.45×

Result: 1.45× is used (combination has highest priority)
```

---

## Managing Tier Multipliers

### Viewing Current Multipliers

1. Navigate to **Pricing Configuration** page
2. Review the **Current Tier Multipliers** table
3. Check the "Actual Margin %" column for performance

### Creating a New Tier Multiplier

**When to Use**: Setting up pricing for a tier that shows "Not Set" status

**Steps**:
1. Click the **Edit** button (pencil icon) in the Actions column for the desired tier
2. The "Create Pricing Configuration" dialog opens
3. Fill in the form:
   - **Scope**: Automatically set to "Tier"
   - **Subscription Tier**: Pre-filled with selected tier
   - **Margin Multiplier**: Enter desired multiplier (e.g., 1.5)
   - **Reason**: Select from dropdown
     - `Initial Setup` - First time configuring this tier
     - `Vendor Price Change` - Vendor increased/decreased costs
     - `Tier Optimization` - Adjusting for competitive positioning
     - `Margin Protection` - Ensuring minimum margins are met
     - `Manual Adjustment` - Other business reasons
   - **Details (Optional)**: Provide context (e.g., "Vendor increased GPT-4 prices by 15%")
4. Click **Save Configuration**

**Result**: Configuration enters "Pending" status and awaits approval

### Editing an Existing Tier Multiplier

**When to Use**: Adjusting pricing for a tier that already has an active configuration

**Steps**:
1. Click the **Edit** button for the tier
2. The "Edit Configuration" dialog opens with current values
3. Modify the multiplier or reason as needed
4. Click **Save Configuration**

**Result**: Creates a new configuration in "Pending" status (original remains active until approved)

### Understanding the Multiplier Slider

The form includes both:
- **Numeric Input**: Type exact value (e.g., 1.65)
- **Range Slider**: Visual adjustment (1.0 to 3.0)
- **Live Margin Preview**: Shows calculated margin % as you adjust

**Tips**:
- Use slider for quick exploration
- Use numeric input for precise values
- Watch the margin badge update in real-time

---

## Model-Specific Overrides

### Why Use Overrides?

Model-specific overrides are useful when:

- **High-Cost Models**: Premium models (GPT-4o, Claude 3.5 Sonnet) need higher margins
- **Promotional Pricing**: Discounted multipliers to encourage usage of specific models
- **Vendor Negotiations**: Special pricing agreements with specific providers
- **Market Competition**: Matching or beating competitor pricing for specific models

### Creating a Model Override

**Steps**:
1. Click **Create Configuration** button (top right)
2. Select **Scope**:
   - **Provider**: Override all models from one provider
   - **Model**: Override one specific model across all tiers
   - **Combination**: Override for specific tier + provider + model
3. Fill in applicable fields based on scope
4. Set the multiplier
5. Provide reason and details
6. Click **Save Configuration**

### Example Scenarios

#### Scenario 1: OpenAI Price Increase

**Situation**: OpenAI increased GPT-4 Turbo pricing by 20%

**Action**:
```
Scope: Model
Model: GPT-4 Turbo
Current Multiplier: 1.50×
New Multiplier: 1.65×
Reason: Vendor Price Change
Details: "OpenAI increased GPT-4 Turbo input pricing from $10/1M tokens to $12/1M tokens effective Nov 1, 2025. Adjusting multiplier to maintain 35% margin."
```

#### Scenario 2: Enterprise Discount for Claude

**Situation**: Offering better rates to Enterprise customers using Anthropic

**Action**:
```
Scope: Combination
Subscription Tier: Enterprise Pro
Provider: Anthropic
Multiplier: 1.35×
Reason: Tier Optimization
Details: "Strategic discount for Enterprise customers to increase Anthropic adoption"
```

#### Scenario 3: Promote New Model

**Situation**: Encouraging users to try Google's new Gemini 2.0 model

**Action**:
```
Scope: Model
Model: Gemini 2.0 Pro
Multiplier: 1.25×
Reason: Manual Adjustment
Details: "Promotional pricing for Gemini 2.0 launch - Q4 2025 campaign"
```

---

## Approval Workflow

### Why Approvals Are Required

All pricing changes require approval to:
- Prevent accidental price changes
- Ensure business review of margin impacts
- Maintain audit trail for compliance
- Enable multi-person verification

### Approval Thresholds

**Requires Approval**:
- ✅ Any multiplier change > ±5%
- ✅ Any new tier multiplier
- ✅ Changes affecting > 100 users
- ✅ Changes affecting > $1000/month revenue

**Auto-Approved** (Future Feature):
- Minor adjustments < ±2%
- Model-specific overrides affecting < 10 users

### Approving a Configuration

**Who Can Approve**:
- Finance Manager
- CFO
- Admin with `pricing.approve` scope

**Steps**:
1. Scroll to **Pending Approvals** section
2. Review the configuration:
   - Check the proposed multiplier
   - Review the reason and details
   - Consider impact on margins and revenue
3. Click **Approve** to activate
   - OR -
4. Click **Reject** and provide rejection reason

**What Happens on Approval**:
- Configuration becomes active immediately
- Previous configuration (if any) is deactivated
- Customers see new pricing on next API call
- Email notification sent to finance team

**What Happens on Rejection**:
- Configuration is marked as rejected
- Original pricing remains active
- Submitter receives notification with rejection reason

### Tracking Changes

All pricing changes are logged in:
- **Audit Log**: Full history of who approved/rejected what
- **Pricing Configuration History**: View past multipliers
- **Revenue Impact Reports**: Track actual impact vs. projected

---

## When to Use Different Configuration Types

### Use Case Decision Tree

```
┌─────────────────────────────────────────┐
│ What are you trying to accomplish?     │
└─────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐          ┌─────▼─────┐
   │ Set base│          │ Override  │
   │ pricing │          │ specific  │
   │ for ALL │          │ model or  │
   │ users   │          │ provider  │
   └────┬────┘          └─────┬─────┘
        │                     │
   ┌────▼────┐          ┌─────▼─────┐
   │ Use     │          │ Which?    │
   │ TIER    │          └─────┬─────┘
   │ scope   │           ┌────┴────┐
   └─────────┘           │         │
                    ┌────▼───┐ ┌───▼────┐
                    │Provider│ │ Model  │
                    └────┬───┘ └───┬────┘
                         │         │
                    ┌────▼─────────▼────┐
                    │ Apply to specific │
                    │ tier? Use         │
                    │ COMBINATION       │
                    └───────────────────┘
```

### Tier Scope - Use When:

✅ Setting default pricing for a subscription level
✅ Initial setup of a new tier
✅ Across-the-board margin adjustments
✅ Simplest option - affects all models equally

**Example**: "All Pro users should have 1.5× multiplier on all AI models"

### Provider Scope - Use When:

✅ One AI vendor changed pricing for all their models
✅ Strategic partnership with specific provider
✅ Vendor passed on infrastructure cost savings

**Example**: "OpenAI reduced all model prices by 10%, adjust our multipliers to maintain margin"

### Model Scope - Use When:

✅ High-cost premium model needs higher margin
✅ Promotional pricing for new model launch
✅ Model has unique cost structure
✅ Competitive pressure on specific model

**Example**: "GPT-4 Turbo is expensive - increase multiplier to 1.7× for all tiers"

### Combination Scope - Use When:

✅ VIP pricing for Enterprise customers on specific models
✅ Free tier restrictions on premium models
✅ Complex pricing strategies
✅ Maximum control and precision needed

**Example**: "Enterprise Pro users get 1.35× on Claude 3.5 Sonnet (vs. standard 1.5×)"

---

## Best Practices

### 1. Regular Margin Reviews

**Frequency**: Weekly for active monitoring, Monthly for detailed analysis

**Process**:
1. Check **Actual Margin %** in Current Tier Multipliers table
2. Identify tiers with variance > ±2%
3. Investigate root causes:
   - User behavior shifts (using more expensive models)
   - Vendor cost changes not yet reflected
   - Seasonal patterns
4. Create configurations to course-correct if needed

### 2. Vendor Cost Monitoring

**Set Up Alerts**:
- Subscribe to vendor pricing announcement lists
- Monitor `/admin/profitability/vendor-prices` page for alerts
- Enable email notifications for price change detections

**When Vendor Increases Costs**:
1. Calculate impact on margins
2. Create new configurations to maintain targets
3. Provide detailed reasoning in "Details" field
4. Link to vendor announcement in details

**When Vendor Decreases Costs**:
1. Decide: pass savings to customers or increase margins?
2. Consider competitive landscape
3. Update configurations accordingly

### 3. Documentation Standards

**Always Include in "Details" Field**:
- ✅ Date of vendor announcement (if applicable)
- ✅ Percentage change from current multiplier
- ✅ Expected revenue/margin impact
- ✅ Link to Slack discussion or Jira ticket
- ✅ Effective date and duration (if temporary)

**Good Example**:
```
"OpenAI increased GPT-4 Turbo pricing by 20% effective Nov 1, 2025.
Adjusting from 1.50× to 1.65× (+10%) to maintain 35% target margin.
Expected impact: +$2,400/month revenue, margin from 31% to 35%.
Slack: #pricing-nov-2025. Approved by CFO via email 10/28/25."
```

**Bad Example**:
```
"Price increase"
```

### 4. Testing Before Approval

**For Major Changes** (>10% multiplier change):
1. Use **Pricing Simulator** (`/admin/profitability/simulator`)
2. Run scenarios with historical data
3. Estimate churn impact
4. Calculate net financial benefit
5. Share results with finance team before approval

### 5. Communication

**Internal Communication**:
- Notify customer success team before large changes
- Update FAQ documentation
- Brief support team on expected customer questions

**External Communication** (if significant):
- Email customers 2 weeks before effective date
- Explain value proposition and cost factors
- Provide migration path or grandfathering options

### 6. Rollback Planning

**Before Approving Large Changes**:
- Document current multipliers
- Plan rollback procedure if metrics worsen
- Define success/failure criteria
- Set review date (e.g., 30 days post-implementation)

---

## Common Scenarios

### Scenario 1: Initial Tier Setup

**Situation**: Launching new "Pro Max" tier

**Goal**: Set competitive pricing with 35% target margin

**Steps**:
1. Research competitor pricing for similar tier
2. Review vendor costs for typical model usage
3. Calculate required multiplier: Target 35% → 1.54× multiplier
4. Round to 1.55× for simplicity
5. Create tier configuration:
   ```
   Scope: Tier
   Tier: Pro Max
   Multiplier: 1.55×
   Reason: Initial Setup
   Details: "New tier launch - researched competitor pricing,
            targeting 35% margin based on expected GPT-4/Claude mix"
   ```
6. Submit for approval

### Scenario 2: Quarterly Margin Optimization

**Situation**: Q4 review shows Free tier margin at 28% (target 30%)

**Analysis**:
- Free users shifted to more expensive models
- Current multiplier: 1.40×
- Need to increase to 1.43× to reach 30% target

**Decision Point**:
- Option A: Increase multiplier (higher prices, maintain margin)
- Option B: Accept lower margin (customer retention focus)

**If Choosing Option A**:
1. Create new configuration
2. Use Pricing Simulator to model impact
3. Coordinate with customer success on messaging
4. Submit configuration:
   ```
   Scope: Tier
   Tier: Free
   Multiplier: 1.43× (was 1.40×)
   Reason: Margin Protection
   Details: "Q4 margin review: Free tier at 28% vs 30% target.
            Model mix shifted 15% toward GPT-4. Modest 2.1% price
            increase to restore margin. Expected churn: <1%.
            Simulator results: +$800/mo margin improvement."
   ```

### Scenario 3: Competitive Response

**Situation**: Competitor announced 20% price cut on Claude models

**Market Research**:
- Competitor now: $0.012 per 1k tokens
- Rephlo current: $0.015 per 1k tokens
- Risk: Lose Claude-focused customers

**Action Plan**:
1. Create model-specific override for Claude models
2. Reduce multiplier temporarily for Claude
3. Set expiration date for promotional pricing
4. Configuration:
   ```
   Scope: Model
   Model: Claude 3.5 Sonnet
   Multiplier: 1.30× (was 1.50×)
   Reason: Manual Adjustment
   Details: "Competitive response to [Competitor] pricing. Temporary
            13% reduction to match market. Promotional period: Nov-Dec
            2025. Will reassess in Jan 2026. Accept 23% margin
            (vs 33% target) to retain market share."
   ```

### Scenario 4: Volume-Based Enterprise Deal

**Situation**: Large enterprise customer commits to $50k/month spend

**Negotiation**: Customer wants preferential rates on GPT-4 models

**Solution**: Create combination override
```
Scope: Combination
Tier: Enterprise Max
Provider: OpenAI
Model: GPT-4 Turbo
Multiplier: 1.25× (vs standard 1.50×)
Reason: Manual Adjustment
Details: "VIP pricing for [Customer Name] - $50k/month commit.
         Contract signed 11/1/25, 12-month term. Reduced from 33%
         to 20% margin for this customer segment. Net positive:
         +$40k/mo vs losing deal. Approved by CFO."
```

### Scenario 5: Vendor Emergency Price Hike

**Situation**: OpenAI announces emergency 25% price increase due to compute shortage

**Timeline**: Effective in 48 hours

**Emergency Response**:
1. Calculate impact: All OpenAI models affected
2. Current multiplier: 1.50×
3. New required multiplier: 1.60× to maintain margin
4. Fast-track approval process:
   ```
   Scope: Provider
   Provider: OpenAI
   Multiplier: 1.60× (was 1.50×)
   Reason: Vendor Price Change
   Details: "URGENT: OpenAI emergency 25% price hike effective 11/10
            due to GPU shortage. Link: [announcement]. Increasing
            multiplier 6.7% to maintain 37% margin. Customer email
            drafted in #customer-comms. CFO verbal approval, formal
            approval ASAP."
   ```

---

## Troubleshooting

### Issue 1: Configuration Not Taking Effect

**Symptoms**: Created configuration but customers still seeing old prices

**Checklist**:
- ☑ Is configuration in "Approved" status? (Check Pending Approvals section)
- ☑ Is configuration marked "Active"? (Check isActive flag)
- ☑ Are there conflicting higher-priority configurations? (Check Model-Specific Overrides)
- ☑ Is there a more specific configuration overriding? (Combination > Model > Provider > Tier)

**Solution**: Review configuration priority and ensure approval

### Issue 2: Wrong Multiplier Being Applied

**Symptoms**: Expected 1.5× but logs show 1.7×

**Diagnosis**:
1. Check all active configurations for the tier/model/provider
2. Review priority order (Combination → Model → Provider → Tier)
3. Use backend logs to trace which configuration was selected

**Common Cause**: Model-specific override exists that takes precedence

**Solution**: Update or deactivate the overriding configuration

### Issue 3: Margins Still Below Target After Adjustment

**Symptoms**: Increased multiplier but margin % not improving

**Possible Causes**:
1. **User Mix Shift**: Users switched to more expensive models
2. **Calculation Error**: Multiplier increase was too small
3. **Vendor Cost Increase**: Vendor raised costs again
4. **Free Credits Usage**: Users burning through free credits on expensive models

**Investigation Steps**:
1. Review usage analytics: `/admin/analytics`
2. Check margin by model: `/admin/profitability/margins`
3. Compare vendor costs vs. expected
4. Analyze user behavior patterns

**Solution**: May need second multiplier adjustment or model access restrictions

### Issue 4: Cannot Create Configuration

**Symptoms**: Save button disabled or error on submit

**Common Reasons**:
- Missing required fields (tier, multiplier, reason)
- Multiplier out of allowed range (1.0 - 3.0)
- Duplicate configuration already exists
- Insufficient permissions

**Solution**:
1. Ensure all required fields filled
2. Check multiplier is between 1.0 and 3.0
3. Verify no duplicate active configuration exists
4. Confirm user has `pricing.manage` permission

### Issue 5: Approval Process Stuck

**Symptoms**: Configuration pending for >24 hours

**Escalation Steps**:
1. Check with approvers (Finance Manager, CFO)
2. Verify email notifications were sent
3. Review in `/admin/audit-logs` for rejection reason
4. If urgent, contact system admin to approve manually

---

## Appendix

### A. Recommended Tier Multipliers

Based on market research and target margins:

| Tier            | Recommended Multiplier | Target Margin | Rationale                           |
|-----------------|------------------------|---------------|-------------------------------------|
| Free            | 1.40×                  | 28.6%         | Lower margin acceptable for acquisition |
| Pro             | 1.50×                  | 33.3%         | Standard margin for paying customers |
| Pro Max         | 1.55×                  | 35.5%         | Premium tier, higher value perception |
| Enterprise Pro  | 1.45×                  | 31.0%         | Volume discount for large contracts |
| Enterprise Max  | 1.40×                  | 28.6%         | Strategic pricing for largest accounts |

### B. Margin Target Guidelines

**Minimum Acceptable Margins**:
- Free Tier: 25%
- Paid Tiers: 30%
- Enterprise: 25% (volume compensates)

**Warning Thresholds**:
- Below target by >5%: Immediate review required
- Below target by >10%: Emergency adjustment needed

**Ideal Ranges**:
- Free: 28-32%
- Pro: 33-37%
- Enterprise: 28-35%

### C. Approval Authority Matrix

| Change Type                          | Requires Approval From     | SLA    |
|--------------------------------------|----------------------------|--------|
| Tier multiplier change <5%           | Finance Manager            | 1 day  |
| Tier multiplier change 5-15%         | CFO                        | 2 days |
| Tier multiplier change >15%          | CFO + CEO                  | 3 days |
| Model override affecting <100 users  | Finance Manager            | 1 day  |
| Model override affecting >100 users  | CFO                        | 2 days |
| Emergency vendor response (<48 hrs)  | Finance Manager (with retroactive CFO approval) | 4 hours |
| Promotional pricing                  | CMO + CFO                  | 2 days |

### D. Change Reasons Reference

| Reason Code           | When to Use                                      | Example                                    |
|-----------------------|--------------------------------------------------|--------------------------------------------|
| `initial_setup`       | First time configuring a tier or model           | "Launching new Pro Max tier"               |
| `vendor_price_change` | Vendor announced price increase/decrease         | "OpenAI increased GPT-4 by 20%"            |
| `tier_optimization`   | Adjusting for competitive positioning            | "Reducing Pro pricing to match competitors" |
| `margin_protection`   | Margin fell below acceptable threshold           | "Free tier margin dropped to 25%"          |
| `manual_adjustment`   | Special circumstances, promotions, partnerships  | "Q4 holiday promotion on Claude models"    |

### E. Contacts

**Finance Team**:
- CFO: finance-cfo@rephlo.com
- Finance Manager: finance-manager@rephlo.com

**Support**:
- Slack: #pricing-and-billing
- Jira: PRICING project
- Emergency: pricing-escalation@rephlo.com

**System Access Issues**:
- IT Support: it-support@rephlo.com
- Admin Reset: admin-access@rephlo.com

---

## Glossary

**Approved Configuration**: Configuration that has passed approval process and is active

**Base Cost**: The amount the vendor (OpenAI, Anthropic, etc.) charges Rephlo

**Customer Price**: The amount Rephlo charges the end user (Base Cost × Multiplier)

**Effective Date**: When a new configuration becomes active and starts affecting pricing

**Gross Margin**: Revenue minus cost of goods sold, expressed as percentage

**Margin Multiplier**: The factor by which vendor costs are multiplied to set customer prices

**Override**: A configuration that takes precedence over default tier pricing

**Pending Configuration**: Configuration awaiting approval

**Scope**: The level at which a pricing configuration applies (tier, provider, model, combination)

**Target Margin**: The desired gross margin percentage for a tier or model

**Variance**: The difference between actual margin and target margin

**Vendor**: The AI model provider (OpenAI, Anthropic, Google, etc.)

---

## Revision History

| Version | Date       | Author          | Changes                                      |
|---------|------------|-----------------|----------------------------------------------|
| 1.0     | 2025-11-12 | Finance Team    | Initial comprehensive guide                  |

---

**Document Owner**: Finance Department
**Review Cycle**: Quarterly
**Next Review**: February 2026

For questions or suggestions, contact: finance-team@rephlo.com
