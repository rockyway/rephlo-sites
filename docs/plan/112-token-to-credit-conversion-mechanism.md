# Plan 112: Token-to-Credit Conversion Mechanism

**Document ID**: 112-token-to-credit-conversion-mechanism.md
**Version**: 1.0
**Status**: Complete
**Created**: 2025-11-09
**Scope**: Token tracking, vendor cost calculation, and credit conversion system for Rephlo platform
**Integration**: Core infrastructure for Plans 109, 110, 111 (Monetization, Perpetual, Coupons)
**Owner**: Revenue Protection & Billing Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Problem & Context](#business-problem--context)
3. [Token-to-Credit Conversion Model](#token-to-credit-conversion-model)
4. [Vendor Cost Calculation](#vendor-cost-calculation)
5. [Margin Strategy & Profitability](#margin-strategy--profitability)
6. [Configuration & Admin Control](#configuration--admin-control)
7. [Token Tracking Architecture](#token-tracking-architecture)
8. [Credit Deduction Logic](#credit-deduction-logic)
9. [Edge Cases & Handling](#edge-cases--handling)
10. [Database Schema](#database-schema)
11. [Admin UI & Simulation Tools](#admin-ui--simulation-tools)
12. [Integration with Monetization Plans](#integration-with-monetization-plans)
13. [Implementation Phases](#implementation-phases)
14. [Profitability Analysis](#profitability-analysis)
15. [Monitoring & Alerts](#monitoring--alerts)

---

## Executive Summary

The Token-to-Credit Conversion Mechanism is the financial foundation of Rephlo's platform. It translates vendor token charges (Azure OpenAI, OpenAI, Anthropic, Google Gemini) into user-facing "credits" with built-in margin protection.

**Critical Principle**: Every API token consumed by a user must generate positive contribution margin for Rephlo. This mechanism ensures profitability per request.

**Architecture**:
```
User API Request
    ↓
[Token Tracking] → (inputTokens, outputTokens, modelId)
    ↓
[Cost Lookup] → Vendor pricing for model/provider
    ↓
[Calculation] → vendorCost + margin = creditDeduction
    ↓
[Credit Deduction] → Atomic deduction from user balance
    ↓
[Ledger] → Track token consumption for analytics
```

**Key Features**:
- **Per-request profitability** – No loss-making transactions
- **Transparent conversion** – Credits = Vendor Cost × Margin Multiplier
- **Runtime configurability** – Admin dashboard adjusts rates without code deploys
- **Margin protection** – Configurable by tier, provider, and model
- **Vendor rate elasticity** – Auto-detect rate changes, adjust conversion within SLA
- **Edge case safety** – Streaming, free-tier limits, rollover credits handled atomically

**Business Impact**:
- Eliminates "penny-wise, pound-foolish" API requests (e.g., unprofitable free-tier usage)
- Enables tier-based margin optimization (Enterprise users have lower multiplier)
- Supports dynamic pricing in response to vendor cost changes
- Provides admin transparency for cost decisions

---

## Business Problem & Context

### Current State (From Plans 109-111)

**Subscription Model (Plan 109)**:
- Free: 2,000 credits/month
- Pro: 20,000 credits/month ($19)
- Pro Max: 60,000 credits/month ($49)
- Enterprise Pro: 250,000 credits/month ($149)
- Enterprise Max: Unlimited credits (custom)

**Perpetual Plan (Plan 110)**:
- Perpetual: $199 one-time, unlimited credits for v1.x

**Problem**: Credits are abstracted from actual vendor costs.
- **We don't know**: How many tokens = 1 credit?
- **We don't know**: Are Free users profitable per request?
- **We don't know**: When vendor prices change, how should credits change?
- **We don't know**: Is a Pro user running GPT-4 making us money?

### Vendor Pricing Reality (October 2025)

| Provider | Model | Input (per 1k) | Output (per 1k) | Ratio |
|----------|-------|---|---|---|
| **OpenAI** | GPT-4o | $0.005 | $0.015 | 1:3 |
| | GPT-4 Turbo | $0.01 | $0.03 | 1:3 |
| | GPT-3.5 Turbo | $0.0005 | $0.0015 | 1:3 |
| **Anthropic** | Claude 3.5 Sonnet | $0.003 | $0.015 | 1:5 |
| | Claude 3 Opus | $0.015 | $0.075 | 1:5 |
| **Google** | Gemini 2.0 Flash | $0.0375 | $0.15 | 1:4 |
| | Gemini 1.5 Pro | $0.00125 | $0.005 | 1:4 |

**Cost Variability**: GPT-4o output is **100x more expensive** than Gemini Flash output.

### The Challenge

**Scenario 1: Free User with GPT-4o**
```
Free user gets 2,000 credits/month
They generate: 100 input tokens + 200 output tokens

Cost to us:
- Input: 100 × $0.005 / 1000 = $0.0005
- Output: 200 × $0.015 / 1000 = $0.003
- Total vendor cost: $0.0035

Question: How many credits should this cost?
If 1 credit = $0.001, then this costs 3.5 credits (rounding up to 4)
If 1 credit = $0.0001, then this costs 35 credits
If 1 credit = 100 tokens (naive), then this costs 3 credits

Problem: We don't have a principled approach.
```

**Scenario 2: Pro User with Claude 3.5 Sonnet at $19/month**
```
Pro user budget: $19 / 20,000 credits = $0.00095 per credit

If they use Claude 3.5 Sonnet (expensive):
- Input: 500 tokens × $0.003/1000 = $0.0015
- Output: 1500 tokens × $0.015/1000 = $0.0225
- Total: $0.024 vendor cost

At $0.00095 per credit: $0.024 / $0.00095 = 25.3 credits

But if they use Gemini Flash (cheap):
- Input: 500 tokens × $0.0375/1000 = $0.0000188
- Output: 1500 tokens × $0.15/1000 = $0.000225
- Total: $0.000244 vendor cost

At $0.00095 per credit: $0.000244 / $0.00095 = 0.26 credits (rounds to 1)

Question: Why does the same request cost 25 credits for Claude, 1 credit for Gemini?
Answer: We need different credit costs per model, or a unified conversion.
```

### The Solution Approach

Instead of trying to map tokens 1:1 to credits, we establish:

1. **Vendor Cost = True cost to Rephlo**
   - Track actual tokens (input + output) from vendor API responses
   - Look up provider/model pricing
   - Calculate exact USD cost

2. **Margin Multiplier = Business policy**
   - Apply configurable multiplier based on tier, provider, model
   - Example: Free tier (2.0x), Pro tier (1.5x), Enterprise (1.2x)
   - Enterprise gets lower multiplier because they're price-sensitive

3. **Credit Deduction = Vendor Cost × Margin Multiplier**
   - Ensures every request contributes to gross margin
   - Can be adjusted without changing subscription tiers
   - Transparent: Admin can see the calculation

4. **Periodic Review = Stay profitable**
   - Monitor actual margin percentage
   - Detect when vendor prices shift significantly
   - Adjust multipliers proactively

---

## Token-to-Credit Conversion Model

### Core Conversion Formula

```
Credit Deduction = CEILING(Vendor Cost × Margin Multiplier)

Where:
  Vendor Cost = (inputTokens × inputPricePerK / 1000)
              + (outputTokens × outputPricePerK / 1000)

  Margin Multiplier = tier_multiplier × provider_multiplier × model_multiplier
                    × (1 + dynamic_adjustment)

  CEILING() = Round up to nearest whole credit (never underbill)
```

### Example Calculation

**Scenario**: Pro user (multiplier 1.5x) uses Claude 3.5 Sonnet (Anthropic, no additional multiplier)

```
Request Details:
- Model: claude-3-5-sonnet-20241022
- Provider: Anthropic
- Input: 500 tokens
- Output: 1,500 tokens

Step 1: Look up Vendor Pricing (anthropic_pricing table)
- Input price: $0.003 per 1k tokens
- Output price: $0.015 per 1k tokens

Step 2: Calculate Vendor Cost
- Input cost: (500 × $0.003) / 1000 = $0.0015
- Output cost: (1500 × $0.015) / 1000 = $0.0225
- Total vendor cost: $0.024

Step 3: Look up Multiplier (pricing_config table)
- Tier multiplier (Pro): 1.5x
- Provider multiplier (Anthropic): 1.0x
- Model multiplier: 1.0x (no special pricing)
- Dynamic adjustment: +0% (no current adjustment)
- Combined multiplier: 1.5 × 1.0 × 1.0 × 1.0 = 1.5x

Step 4: Calculate Credit Deduction
- Credit value = $0.024 × 1.5 = $0.036
- Credits (assuming $0.01 per credit): $0.036 / $0.01 = 3.6 credits
- Rounded up: 4 credits deducted

Step 5: Atomic Deduction
- Pre-check: User has ≥4 credits? ✓ (Pro has 20,000/month)
- Deduct 4 credits from balance
- Record in token_ledger: (500 input, 1500 output, $0.024 cost, 4 credits)

Step 6: Analytics
- User's "actual cost this month" increases by $0.024
- User's "credit spend" increases by 4
- Contribution margin: $0.036 - $0.024 = $0.012 (50% gross margin)
```

### Credit Value Anchor Point

**Key Decision**: What is 1 credit worth in USD?

**Option A: Fixed USD Value (Recommended)**
```
1 credit = $0.01 (fixed)

Advantages:
- Easy for users to understand ($0.01 per credit)
- Stable conversion across time
- Clear business model

Disadvantages:
- When vendor prices change, margins shift
- May need to adjust multipliers frequently
```

**Option B: Variable Value (Not Recommended)**
```
1 credit = vendor_cost_that_month / total_credits_allocated

Advantages:
- Dynamically balanced
Disadvantages:
- Users see variable "credit cost" month-to-month
- Confusing for planning
- Complex accounting
```

**Recommendation**: Use **Option A** with quarterly margin reviews. If vendor prices shift >10%, adjust tier multipliers.

### Tier-Based Multiplier Examples

**Why different multipliers by tier?**

Economic incentive: Higher-paying tiers should be more profitable (via lower multiplier = more tokens per dollar spent).

```
Free Tier: 2.0x multiplier
- High risk: Potential abuse, churn
- Low revenue: $0/month
- Strategy: Aggressive margin protection
- Example: 1k GPT-4o tokens = $0.005 × 2.0 = $0.01 cost to user

Pro Tier: 1.5x multiplier
- Medium risk: Self-selecting paying users
- Medium revenue: $19/month
- Strategy: Balanced margin
- Example: 1k GPT-4o tokens = $0.005 × 1.5 = $0.0075 cost to user

Pro Max Tier: 1.2x multiplier
- Low risk: Power users, sticky
- High revenue: $49/month
- Strategy: Attract heavy usage
- Example: 1k GPT-4o tokens = $0.005 × 1.2 = $0.006 cost to user

Enterprise Pro: 1.1x multiplier
- Very low risk: Annual contracts, support
- Very high revenue: $149/month
- Strategy: Maximize account value
- Example: 1k GPT-4o tokens = $0.005 × 1.1 = $0.0055 cost to user

Enterprise Max: 1.05x multiplier
- Minimal risk: Custom SLA, dedicated support
- Custom revenue: $500+/month
- Strategy: Penetration for high volume
- Example: 1k GPT-4o tokens = $0.005 × 1.05 = $0.00525 cost to user

Perpetual Plan: 1.3x multiplier (for BYOK users)
- Medium risk: Own API keys, no account lock-in
- One-time revenue: $199
- Strategy: Still profitable, encourage adoption
- Example: 1k GPT-4o tokens = $0.005 × 1.3 = $0.0065 cost to user
```

**Margin Result by Tier**:
```
Gross Margin = (Multiplier - 1.0) / Multiplier × 100%

Free:         1.0x = (1.0 - 1.0) / 1.0 = 50% margin (2x multiplier means margin = (2-1)/2 = 50%)
Pro:          1.5x = (1.5 - 1.0) / 1.5 = 33% margin
Pro Max:      1.2x = (1.2 - 1.0) / 1.2 = 17% margin
Enterprise:   1.1x = (1.1 - 1.0) / 1.1 = 9% margin
Enterprise Max: 1.05x = (1.05 - 1.0) / 1.05 = 5% margin (high volume = profitability)
Perpetual:    1.3x = (1.3 - 1.0) / 1.3 = 23% margin
```

---

## Vendor Cost Calculation

### Vendor Pricing Lookup

**Database Table: `model_provider_pricing`**

```sql
CREATE TABLE model_provider_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  provider_id UUID NOT NULL REFERENCES provider(id),  -- openai, anthropic, google, azure
  model_name VARCHAR(255) NOT NULL,  -- "gpt-4-turbo", "claude-3-5-sonnet", etc.

  -- Official vendor model IDs
  vendor_model_id VARCHAR(255) UNIQUE,  -- OpenAI official ID for tracking

  -- Pricing (per 1,000 tokens)
  input_price_per_1k DECIMAL(10, 8) NOT NULL,  -- $0.003
  output_price_per_1k DECIMAL(10, 8) NOT NULL,  -- $0.015

  -- Optional: Different pricing for different use cases
  cache_input_price_per_1k DECIMAL(10, 8),  -- For Claude prompt caching feature
  cache_hit_price_per_1k DECIMAL(10, 8),

  -- Effective date tracking
  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,  -- NULL = currently active

  -- Rate change detection
  previous_price_input DECIMAL(10, 8),
  previous_price_output DECIMAL(10, 8),
  price_change_percent_input DECIMAL(5, 2),  -- e.g., +10.5
  price_change_percent_output DECIMAL(5, 2),
  detected_at TIMESTAMP,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  description TEXT,  -- "OpenAI standard pricing as of 2025-10-15"
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_frequency_days INT DEFAULT 7,  -- Re-check weekly

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_model_active ON model_provider_pricing(provider_id, model_name, is_active);
CREATE INDEX idx_pricing_effective ON model_provider_pricing(effective_from, effective_until);
```

**Example Data**:
```
provider_id | model_name           | input_per_1k | output_per_1k | effective_from | is_active
------------|----------------------|--------------|---------------|----------------|----------
uuid-openai | gpt-4-turbo          | 0.01000      | 0.03000       | 2025-10-15     | true
uuid-openai | gpt-4o               | 0.00500      | 0.01500       | 2025-10-15     | true
uuid-anthropic | claude-3-5-sonnet | 0.00300      | 0.01500       | 2025-09-20     | true
uuid-anthropic | claude-3-opus     | 0.01500      | 0.07500       | 2025-09-20     | true
uuid-google | gemini-2-0-flash     | 0.00038      | 0.00152       | 2025-11-01     | true
uuid-google | gemini-1-5-pro       | 0.00125      | 0.00500       | 2025-11-01     | true
```

### Cost Calculation Service

```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  modelId: string;
  providerId: string;
}

interface CostCalculation {
  vendorCost: number;  // USD
  inputCost: number;
  outputCost: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;  // For models with caching
  pricingSource: string;  // Which pricing row used
}

async function calculateVendorCost(usage: TokenUsage): Promise<CostCalculation> {
  // Step 1: Look up active pricing for this model/provider
  const pricing = await db.model_provider_pricing.findFirst({
    where: {
      provider_id: usage.providerId,
      model_name: usage.modelId,
      is_active: true,
      effective_from: { lte: new Date() }
    },
    orderBy: { effective_from: 'desc' }
  });

  if (!pricing) {
    throw new Error(`No active pricing found for ${usage.providerId}/${usage.modelId}`);
  }

  // Step 2: Calculate costs
  const inputCost = (usage.inputTokens * pricing.input_price_per_1k) / 1000;
  const outputCost = (usage.outputTokens * pricing.output_price_per_1k) / 1000;
  const vendorCost = inputCost + outputCost;

  // Step 3: Return detailed breakdown
  return {
    vendorCost,
    inputCost,
    outputCost,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    pricingSource: `${pricing.provider_id}/${pricing.model_name} (effective ${pricing.effective_from})`
  };
}
```

### Handling Provider-Specific Variations

**OpenAI: Three pricing tiers**
```
Standard: $0.005 input (GPT-4o)
Discounted: $0.0005 input (GPT-3.5 Turbo via Batch API)
Premium: $0.01 input (GPT-4 Turbo)

Solution: Track provider + model + variant
model_name: "gpt-3.5-turbo" (api endpoint)
OR
model_name: "gpt-3.5-turbo-batch" (separate pricing tier)
```

**Anthropic: Prompt Caching**
```
Normal tokens: $0.003 input / $0.015 output
Cached input tokens: $0.0003 input (10% of normal)
Cache creation: $0.00375 input (125% of normal)

Solution: Separate pricing rows
model_name: "claude-3-5-sonnet-standard"
model_name: "claude-3-5-sonnet-cached"
```

**Google: Tiered input pricing**
```
Gemini 2.0 Flash has different input pricing for:
- Standard requests
- Cached requests
- System instruction (if fixed)

Solution: Pricing flags in database
cache_input_price_per_1k: 0.00003 (5% of standard)
```

---

## Margin Strategy & Profitability

### Margin Protection Formula

```
Gross Margin = (Credit Deduction - Vendor Cost) / Credit Deduction × 100%

Target Margins by Tier:
  Free:        50% (aggressive protection against abuse)
  Pro:         33% (balanced)
  Pro Max:     17% (attract heavy usage)
  Enterprise:  9% (volume-based, penetration)
  Perpetual:   23% (own keys, still profitable)
```

### Margin Monitoring KPIs

| KPI | Calculation | Target | Action Trigger |
|-----|-------------|--------|---|
| **Actual Gross Margin** | (Credit Spend - Vendor Cost) / Credit Spend × 100% | ±2% of target | Adjust multipliers if >2% variance |
| **Break-even Credit Cost** | Vendor Cost / Credits Deducted | <1.0x multiplier | Indicates misconfiguration |
| **Negative Margin Requests** | Count of requests where multiplier < 1.0 | 0 | CRITICAL ALERT |
| **Free Tier Margin %** | (2.0x-1.0)/2.0 = 50% | 45-55% | Review tier pricing |
| **Pro Tier Margin %** | (1.5x-1.0)/1.5 = 33% | 30-40% | Review tier pricing |
| **Provider-Level Margin** | Analyze by provider (OpenAI vs. Anthropic) | Consistent | Adjust provider multipliers |
| **Model-Level Margin** | Analyze by model (GPT-4o vs. Gemini) | Consistent | Adjust model multipliers |

### Contribution Margin Analysis Example

**Monthly Breakdown (100 users, mixed tiers)**:

```
Tier Distribution:
- Free (20 users) × $0/month = $0 revenue
- Pro (50 users) × $19/month = $950 revenue
- Pro Max (20 users) × $49/month = $980 revenue
- Enterprise (10 users) × $149/month = $1,490 revenue
Total Monthly Revenue: $3,420

Token Usage & Costs:
- Free tier: 500M tokens/month → $1,200 vendor cost
  - At 2.0x multiplier: $2,400 credit value
  - Margin: $1,200 (50%)

- Pro tier: 1B tokens/month → $2,400 vendor cost
  - At 1.5x multiplier: $3,600 credit value
  - Margin: $1,200 (33%)

- Pro Max: 2B tokens/month → $5,100 vendor cost
  - At 1.2x multiplier: $6,120 credit value
  - Margin: $1,020 (17%)

- Enterprise: 5B tokens/month → $11,000 vendor cost
  - At 1.1x multiplier: $12,100 credit value
  - Margin: $1,100 (9%)

Total Vendor Cost: $19,700
Total Credit Value: $24,220
Total Gross Margin: $4,520 (19% of credit spend)

Profitability Analysis:
- Revenue: $3,420 (from subscriptions)
- Gross Margin from credits: $4,520
- Total contribution: $7,940
- As % of revenue: 232% (each $1 revenue generates $2.32 gross margin)

Why so healthy?
- Credits not monetized in March (new customers), but margin is built-in
- Free tier is subsidized by their 50% margin (still profitable)
- Enterprise tier (smallest %) still has 9% margin protection
```

### Dynamic Margin Adjustment

**When vendor prices change**:

```
Scenario: OpenAI increases GPT-4o output price from $0.015 → $0.018 (+20%)

Detection:
- Weekly pricing verification job runs
- Detects 20% increase
- Flags for review (>10% threshold)

Options:
A) Adjust Multiplier Up (Recommended)
   - Pro tier: 1.5x → 1.6x multiplier
   - Restores margin to 33%
   - Users see ~6% credit cost increase for GPT-4o

B) Adjust Model-Specific Multiplier
   - Pro tier default: 1.5x
   - GPT-4o multiplier: 1.6x (add 0.1x for expensive models)
   - Pro tier using Gemini: 1.5x (cheap model)
   - Pro tier using GPT-4o: 1.6x (expensive model)

C) Absorb Cost (Not Recommended)
   - Keep 1.5x multiplier
   - Margin drops from 33% → 25%
   - Impacts profitability across 50 Pro users

Decision Framework:
- If vendor price increase >10% → Must adjust within 7 days (SLA)
- If vendor price increase 5-10% → Review, may adjust
- If vendor price decrease → Don't decrease multiplier (bonus margin)
- If vendor price change affects >1M tokens/month → Priority adjustment
```

---

## Configuration & Admin Control

### Pricing Configuration Table

```sql
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope: What does this multiplier apply to?
  scope_type ENUM('tier', 'provider', 'model', 'combination') NOT NULL,

  -- Tier Scope
  subscription_tier VARCHAR(50),  -- NULL = all tiers (default 1.0x)

  -- Provider Scope
  provider_id UUID REFERENCES provider(id),  -- NULL = all providers

  -- Model Scope
  model_id VARCHAR(255),  -- NULL = all models for provider

  -- Multiplier Value
  margin_multiplier DECIMAL(4, 2) NOT NULL,  -- e.g., 1.5
  target_gross_margin_percent DECIMAL(5, 2),  -- e.g., 33.33

  -- Effective Date Range
  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,  -- NULL = currently active

  -- Reason for Change
  reason ENUM('initial_setup', 'vendor_price_change', 'tier_optimization', 'margin_protection', 'manual_adjustment') NOT NULL,
  reason_details TEXT,

  -- Change History
  previous_multiplier DECIMAL(4, 2),  -- What it was before
  change_percent DECIMAL(5, 2),  -- % change (for impact analysis)

  -- Impact Prediction
  expected_margin_change_dollars DECIMAL(12, 2),  -- $ impact monthly
  expected_revenue_impact DECIMAL(12, 2),  -- If customers adjust usage

  -- Admin Metadata
  created_by UUID NOT NULL REFERENCES "user"(id),
  approved_by UUID REFERENCES "user"(id),
  requires_approval BOOLEAN DEFAULT true,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',

  -- Monitoring
  is_active BOOLEAN DEFAULT true,
  monitored BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: Row for Pro tier, all providers
INSERT INTO pricing_config VALUES (
  gen_random_uuid(),
  'tier',
  'pro',  -- Applies to Pro tier only
  NULL,   -- All providers
  NULL,   -- All models
  1.5,    -- 1.5x multiplier = 33% margin
  33.33,
  '2025-11-01'::timestamp,
  NULL,
  'initial_setup',
  'Initial pricing for Pro tier',
  NULL,
  0.0,
  uuid_admin,
  uuid_admin,
  true,
  true,
  true,
  true,
  now(),
  now()
);

-- Example: Row for GPT-4o (expensive model), Pro tier override
INSERT INTO pricing_config VALUES (
  gen_random_uuid(),
  'combination',
  'pro',  -- Pro tier specifically
  uuid_openai,  -- OpenAI provider
  'gpt-4-turbo',  -- Expensive model override
  1.65,   -- Higher multiplier for expensive models
  39.39,
  '2025-11-01'::timestamp,
  NULL,
  'model_optimization',
  'Higher margin for expensive models (GPT-4o)',
  1.5,
  +10.0,  -- 10% increase from base Pro multiplier
  -$250.00,  -- Estimated cost to users (negative = lose revenue/users)
  uuid_admin,
  uuid_admin,
  true,
  true,
  true,
  true,
  now(),
  now()
);
```

### Configuration Lookup Cascade

When calculating a credit deduction, system looks for multipliers in priority order:

```typescript
async function getApplicableMultiplier(
  userId: string,
  providerId: string,
  modelId: string
): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId } });
  const tier = user.subscription_tier;  // "pro", "pro_max", etc.

  // Priority cascade (most specific wins)

  // 1. Check for Combination multiplier (tier + provider + model)
  let config = await db.pricing_config.findFirst({
    where: {
      scope_type: 'combination',
      subscription_tier: tier,
      provider_id: providerId,
      model_id: modelId,
      is_active: true,
      effective_from: { lte: new Date() }
    },
    orderBy: { effective_from: 'desc' }
  });
  if (config) return config.margin_multiplier;

  // 2. Check for Model multiplier (provider + model, any tier)
  config = await db.pricing_config.findFirst({
    where: {
      scope_type: 'model',
      provider_id: providerId,
      model_id: modelId,
      is_active: true,
      effective_from: { lte: new Date() }
    },
    orderBy: { effective_from: 'desc' }
  });
  if (config) return config.margin_multiplier;

  // 3. Check for Provider multiplier (provider, any model/tier)
  config = await db.pricing_config.findFirst({
    where: {
      scope_type: 'provider',
      provider_id: providerId,
      subscription_tier: null,
      is_active: true,
      effective_from: { lte: new Date() }
    },
    orderBy: { effective_from: 'desc' }
  });
  if (config) return config.margin_multiplier;

  // 4. Check for Tier multiplier (tier, any provider/model)
  config = await db.pricing_config.findFirst({
    where: {
      scope_type: 'tier',
      subscription_tier: tier,
      provider_id: null,
      is_active: true,
      effective_from: { lte: new Date() }
    },
    orderBy: { effective_from: 'desc' }
  });
  if (config) return config.margin_multiplier;

  // 5. Default fallback
  return 1.5;  // Default 1.5x multiplier (33% margin)
}
```

### Admin Dashboard: Pricing Management

**Pricing Configuration UI Features**:

1. **Current Multipliers Overview**
   ```
   ┌─────────────────────────────────────────┐
   │  Active Pricing Configuration            │
   ├─────────────────────────────────────────┤
   │ Tier    │ Multiplier │ Margin% │ Status │
   │ Free    │ 2.0x       │ 50%     │ Active │
   │ Pro     │ 1.5x       │ 33%     │ Active │
   │ Pro Max │ 1.2x       │ 17%     │ Active │
   │ Ent Pro │ 1.1x       │ 9%      │ Active │
   └─────────────────────────────────────────┘

   [Edit] [Create New] [Simulate]
   ```

2. **Create/Edit Multiplier Form**
   ```
   Scope: [Tier ▼] [Provider ▼] [Model ▼]

   Tier: [Pro ▼]
   Provider: [Any ▼] (or select specific)
   Model: [Any ▼] (or select specific)

   Multiplier: [1.5 _] (input field)
   Target Margin: [33.33% _] (auto-calculated)

   Reason: [Tier Optimization ▼]
   Details: [Large textbox for notes]

   Expected Impact:
   - Monthly margin change: ±$X
   - Revenue impact: ±$Y (if users reduce usage X%)

   [Calculate Impact] [Preview] [Save to Draft] [Request Approval]
   ```

3. **Multiplier Simulation Tool**
   ```
   What-if Scenario Analysis

   Current Pro Multiplier: 1.5x (33% margin)
   Proposed: 1.6x (37.5% margin)

   Simulated Impact on Last 30 Days:
   - Additional margin: +$1,247
   - Affected users: 50 Pro tier users
   - Avg credit cost increase per user: +6.7%
   - Estimated churn impact: 0-2 users (2-4%)

   [Run Simulation] [Save Scenario] [Apply]
   ```

4. **Vendor Price Change Detection**
   ```
   ┌─────────────────────────────────────────┐
   │  Pricing Alerts & Changes                │
   ├─────────────────────────────────────────┤
   │ OpenAI GPT-4o: Input +20% ($0.005→$0.006)│
   │ Detected: Nov 8, 2025 | Margin Impact: -7% │
   │ Recommended Action: Increase Pro multiplier to 1.6x
   │ [Auto-Apply] [Review] [Ignore] [Custom]
   │
   │ Google Gemini Flash: Output -15%
   │ Detected: Nov 5, 2025 | Margin Impact: +2%
   │ Recommended Action: None (absorb gain)
   │ [Acknowledge]
   └─────────────────────────────────────────┘
   ```

---

## Token Tracking Architecture

### Token Capture from API Responses

**OpenAI/Azure Format**:
```json
{
  "id": "chatcmpl-8MpxMXV9uFvFDrSngxnR6OfH",
  "object": "chat.completion",
  "created": 1698091928,
  "model": "gpt-4-turbo",
  "usage": {
    "prompt_tokens": 500,
    "completion_tokens": 250,
    "total_tokens": 750
  }
}
```

**Anthropic Format**:
```json
{
  "id": "msg_013Yj9csKL6sWtyAbuUtrXSV",
  "type": "message",
  "role": "assistant",
  "content": [...],
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 500,
    "output_tokens": 250,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 0
  }
}
```

**Google Gemini Format**:
```json
{
  "candidates": [...],
  "usage": {
    "prompt_token_count": 500,
    "candidates_token_count": 250,
    "total_token_count": 750,
    "cached_content_input_token_count": 0
  }
}
```

### Token Tracking Service

```typescript
interface TokenUsageRecord {
  requestId: string;  // UUID for tracing
  userId: string;
  modelId: string;
  providerId: string;

  // Token counts
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;  // For Anthropic cache or Google cache
  totalTokens: number;

  // Cost (calculated)
  vendorCost: number;
  creditDeducted: number;
  marginMultiplier: number;
  grossMargin: number;

  // Request metadata
  requestType: 'completion' | 'streaming' | 'batch';
  streamingSegments?: number;  // How many chunks if streaming

  // Timing
  requestStartedAt: Date;
  requestCompletedAt: Date;
  processingTime: number;  // ms

  // Status
  status: 'success' | 'failed' | 'cancelled' | 'rate_limited';
  errorMessage?: string;

  // For streaming completion
  isStreamingComplete?: boolean;  // True when final chunk received

  createdAt: Date;
}

async function captureTokenUsage(
  userId: string,
  apiResponse: any,
  requestMetadata: {
    modelId: string;
    providerId: string;
    requestType: 'completion' | 'streaming';
    requestStartedAt: Date;
  }
): Promise<TokenUsageRecord> {
  // Parse vendor-specific response format
  const usage = parseTokenUsage(apiResponse, requestMetadata.providerId);

  // Look up vendor cost
  const costCalc = await calculateVendorCost({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    modelId: requestMetadata.modelId,
    providerId: requestMetadata.providerId
  });

  // Get applicable multiplier
  const multiplier = await getApplicableMultiplier(
    userId,
    requestMetadata.providerId,
    requestMetadata.modelId
  );

  // Calculate credit deduction
  const creditValue = costCalc.vendorCost * multiplier;
  const creditsDeducted = Math.ceil(creditValue / 0.01);  // Round up to nearest credit
  const grossMargin = creditValue - costCalc.vendorCost;

  // Create tracking record
  const record: TokenUsageRecord = {
    requestId: generateUUID(),
    userId,
    modelId: requestMetadata.modelId,
    providerId: requestMetadata.providerId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    totalTokens: usage.totalTokens,
    vendorCost: costCalc.vendorCost,
    creditDeducted: creditsDeducted,
    marginMultiplier: multiplier,
    grossMargin,
    requestType: requestMetadata.requestType,
    requestStartedAt: requestMetadata.requestStartedAt,
    requestCompletedAt: new Date(),
    processingTime: Date.now() - requestMetadata.requestStartedAt.getTime(),
    status: 'success',
    createdAt: new Date()
  };

  // Save to ledger
  await db.token_usage_ledger.create({ data: record });

  // Update user analytics
  await updateUserTokenAnalytics(userId, record);

  return record;
}
```

### Token Ledger Table

```sql
CREATE TABLE token_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID UNIQUE NOT NULL,

  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscription(id),  -- Which subscription period

  -- Model & Provider
  model_id VARCHAR(255) NOT NULL,
  provider_id UUID NOT NULL REFERENCES provider(id),

  -- Token Counts
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cached_input_tokens INT DEFAULT 0,  -- Anthropic/Google cache
  total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- Costing
  vendor_cost DECIMAL(10, 8) NOT NULL,  -- USD cost to us
  margin_multiplier DECIMAL(4, 2) NOT NULL,  -- 1.5x, 2.0x, etc.
  credit_value_usd DECIMAL(10, 8) NOT NULL,  -- vendor_cost × multiplier
  credits_deducted INT NOT NULL,  -- Whole credits (rounded up)
  gross_margin_usd DECIMAL(10, 8) GENERATED ALWAYS AS (credit_value_usd - vendor_cost) STORED,

  -- Request Type
  request_type ENUM('completion', 'streaming', 'batch') NOT NULL,
  streaming_segments INT,  -- If streaming, how many chunks

  -- Timing
  request_started_at TIMESTAMP NOT NULL,
  request_completed_at TIMESTAMP NOT NULL,
  processing_time_ms INT,  -- How long it took

  -- Status
  status ENUM('success', 'failed', 'cancelled', 'rate_limited') DEFAULT 'success',
  error_message TEXT,  -- If failed

  -- Streaming completion flag
  is_streaming_complete BOOLEAN DEFAULT true,  -- False if request incomplete

  -- Metadata
  user_tier_at_request VARCHAR(50),  -- For auditing if tier changed
  region VARCHAR(50),  -- User region (for rate limiting by region)

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX idx_token_ledger_user ON token_usage_ledger(user_id, created_at);
CREATE INDEX idx_token_ledger_model ON token_usage_ledger(model_id, created_at);
CREATE INDEX idx_token_ledger_provider ON token_usage_ledger(provider_id, created_at);
CREATE INDEX idx_token_ledger_cost ON token_usage_ledger(user_id, vendor_cost);
CREATE INDEX idx_token_ledger_timestamp ON token_usage_ledger(created_at);

-- Aggregate table for daily summaries (for performance)
CREATE TABLE token_usage_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id),
  summary_date DATE NOT NULL,

  total_requests INT DEFAULT 0,
  total_input_tokens INT DEFAULT 0,
  total_output_tokens INT DEFAULT 0,
  total_vendor_cost DECIMAL(12, 2) DEFAULT 0,
  total_credits_deducted INT DEFAULT 0,
  total_gross_margin DECIMAL(12, 2) DEFAULT 0,

  avg_request_latency_ms INT,
  success_rate DECIMAL(5, 2),  -- % of requests successful

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, summary_date)
);
```

---

## Credit Deduction Logic

### Atomic Credit Deduction (ACID Guarantee)

**Critical**: Credit deduction MUST be atomic. Either all credit deducts, or none. Prevents double-charging, partial charges, or inconsistent state.

```typescript
async function deductCreditsAtomically(
  userId: string,
  creditsToDeduct: number,
  requestId: string,
  tokenUsageRecord: TokenUsageRecord
): Promise<DeductionResult> {
  // Use database transaction for atomicity
  const result = await db.$transaction(
    async (tx) => {
      // Step 1: Lock user credit balance (SELECT FOR UPDATE)
      const user = await tx.user.findUnique(
        { where: { id: userId } },
        { include: { credit_balance: true } }
      );

      if (!user) {
        throw new BadRequestError('User not found');
      }

      // Step 2: Pre-check: Sufficient credits?
      const currentBalance = user.credit_balance?.amount || 0;
      if (currentBalance < creditsToDeduct) {
        throw new InsufficientCreditsError(
          `Insufficient credits. Balance: ${currentBalance}, Required: ${creditsToDeduct}`
        );
      }

      // Step 3: Calculate new balance
      const newBalance = currentBalance - creditsToDeduct;

      // Step 4: Update credit balance
      const updatedBalance = await tx.user_credit_balance.update({
        where: { user_id: userId },
        data: {
          amount: newBalance,
          last_deduction_at: new Date(),
          last_deduction_amount: creditsToDeduct,
          updated_at: new Date()
        }
      });

      // Step 5: Record deduction in ledger (immutable audit trail)
      const deductionRecord = await tx.credit_deduction_ledger.create({
        data: {
          user_id: userId,
          amount: creditsToDeduct,
          balance_before: currentBalance,
          balance_after: newBalance,
          request_id: requestId,
          token_vendor_cost: tokenUsageRecord.vendorCost,
          margin_multiplier: tokenUsageRecord.marginMultiplier,
          gross_margin: tokenUsageRecord.grossMargin,
          reason: 'api_completion',
          status: 'completed',
          processed_at: new Date()
        }
      });

      // Step 6: Update token ledger status (link token usage to deduction)
      await tx.token_usage_ledger.update({
        where: { request_id: requestId },
        data: {
          deduction_record_id: deductionRecord.id,
          status: 'deduction_completed'
        }
      });

      // Step 7: Update daily summary for analytics
      const today = new Date().toISOString().split('T')[0];
      await tx.credit_usage_daily_summary.upsert({
        where: { user_id_summary_date: { user_id: userId, summary_date: today } },
        create: {
          user_id: userId,
          summary_date: today,
          total_deductions: creditsToDeduct,
          total_requests: 1,
          total_vendor_cost: tokenUsageRecord.vendorCost,
          total_gross_margin: tokenUsageRecord.grossMargin
        },
        update: {
          total_deductions: { increment: creditsToDeduct },
          total_requests: { increment: 1 },
          total_vendor_cost: { increment: tokenUsageRecord.vendorCost },
          total_gross_margin: { increment: tokenUsageRecord.grossMargin }
        }
      });

      return {
        success: true,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        creditsDeducted: creditsToDeduct,
        deductionRecordId: deductionRecord.id,
        timestamp: new Date()
      };
    },
    { isolationLevel: 'Serializable' }  // Highest isolation to prevent race conditions
  );

  return result;
}
```

### Credit Deduction Tables

```sql
-- Credit balance per user (single source of truth)
CREATE TABLE user_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  amount INT NOT NULL DEFAULT 0,  -- Current balance

  -- Tracking when was it last updated
  last_deduction_at TIMESTAMP,
  last_deduction_amount INT,

  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Immutable ledger of every deduction (audit trail)
CREATE TABLE credit_deduction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- Deduction details
  amount INT NOT NULL,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,

  -- Link to the token usage
  request_id UUID UNIQUE REFERENCES token_usage_ledger(request_id),
  token_vendor_cost DECIMAL(10, 8),  -- Actual vendor cost
  margin_multiplier DECIMAL(4, 2),
  gross_margin DECIMAL(10, 8),

  -- Reason and status
  reason ENUM('api_completion', 'subscription_allocation', 'manual_adjustment', 'refund', 'overage') NOT NULL,
  status ENUM('pending', 'completed', 'reversed') DEFAULT 'pending',

  -- Reverse tracking (if deduction was reversed)
  reversed_at TIMESTAMP,
  reversed_by UUID REFERENCES "user"(id),
  reversal_reason TEXT,

  -- Timestamps
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deduction_user_created ON credit_deduction_ledger(user_id, created_at);
CREATE INDEX idx_deduction_request ON credit_deduction_ledger(request_id);
```

---

## Edge Cases & Handling

### Edge Case 1: Streaming Completions

**Challenge**: Streaming sends tokens in chunks. Must collect all chunks before knowing total tokens.

**Solution**:

```typescript
async function handleStreamingCompletion(
  userId: string,
  modelId: string,
  providerId: string,
  requestStartedAt: Date
): Promise<void> {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let streamingSegments = 0;
  let streamCompleted = false;

  try {
    const stream = await llmProvider.createCompletionStream({
      model: modelId,
      messages: [...]
    });

    // Pre-allocate credits (estimate based on input tokens only)
    const estimatedVendorCost = await estimateTokenCost(totalInputTokens, modelId, providerId);
    const estimatedMultiplier = await getApplicableMultiplier(userId, providerId, modelId);
    const estimatedCreditNeeded = Math.ceil((estimatedVendorCost * estimatedMultiplier) / 0.01);

    // Pre-check: Do they have enough for input + estimated output?
    const user = await db.user.findUnique({ where: { id: userId } });
    const buffer = estimatedCreditNeeded * 1.5;  // 50% buffer for unknown output
    if ((user.credit_balance?.amount || 0) < buffer) {
      stream.destroy();
      throw new InsufficientCreditsError('Insufficient credits for streaming completion');
    }

    // Stream processing
    for await (const chunk of stream) {
      streamingSegments++;

      // Anthropic provides token counts in final chunk
      if (chunk.message?.usage) {
        totalInputTokens = chunk.message.usage.input_tokens;
        totalOutputTokens = chunk.message.usage.output_tokens;
      }

      // OpenAI in streaming completion
      if (chunk.usage) {
        totalInputTokens = chunk.usage.prompt_tokens;
        totalOutputTokens = chunk.usage.completion_tokens;
      }
    }

    streamCompleted = true;

    // After stream complete: Calculate actual cost and deduct
    const actualCost = await calculateVendorCost({
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      modelId,
      providerId
    });

    const actualMultiplier = await getApplicableMultiplier(userId, providerId, modelId);
    const actualCreditValue = actualCost.vendorCost * actualMultiplier;
    const actualCreditsDeducted = Math.ceil(actualCreditValue / 0.01);

    // Record token usage
    const usageRecord = await captureTokenUsage(userId, {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      modelId,
      providerId,
      requestType: 'streaming',
      streamingSegments,
      requestStartedAt,
      status: 'success'
    });

    // Deduct credits
    await deductCreditsAtomically(userId, actualCreditsDeducted, usageRecord.requestId, usageRecord);

  } catch (error) {
    // Stream failed or cancelled
    if (!streamCompleted && streamingSegments > 0) {
      // Partial stream: User received some output, must pay
      const partialCost = await calculateVendorCost({
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens || 100,  // Minimum charge for partial output
        modelId,
        providerId
      });

      const usageRecord = await captureTokenUsage(userId, {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens || 100,
        modelId,
        providerId,
        requestType: 'streaming',
        streamingSegments,
        requestStartedAt,
        status: 'cancelled'
      });

      const multiplier = await getApplicableMultiplier(userId, providerId, modelId);
      const credits = Math.ceil((partialCost.vendorCost * multiplier) / 0.01);
      await deductCreditsAtomically(userId, credits, usageRecord.requestId, usageRecord);
    }

    throw error;
  }
}
```

### Edge Case 2: Insufficient Credits (Pre-check)

**Challenge**: User initiates request but doesn't have enough credits.

**Solution**:

```typescript
async function validateSufficientCredits(
  userId: string,
  requestedModel: string,
  providerId: string,
  estimatedInputTokens: number
): Promise<{ sufficient: boolean; shortfall?: number; suggestions?: string[] }> {
  // Look up user's credit balance
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { credit_balance: true }
  });

  const currentBalance = user.credit_balance?.amount || 0;

  // Estimate vendor cost for this model
  const estimatedVendorCost = await estimateTokenCost(
    estimatedInputTokens,
    estimatedOutputTokens || estimatedInputTokens * 2,  // Assume output = 2x input
    requestedModel,
    providerId
  );

  const multiplier = await getApplicableMultiplier(userId, providerId, requestedModel);
  const estimatedCreditNeeded = Math.ceil((estimatedVendorCost * multiplier) / 0.01);

  if (currentBalance >= estimatedCreditNeeded) {
    return { sufficient: true };
  }

  // Insufficient credits: Provide options
  const shortfall = estimatedCreditNeeded - currentBalance;

  return {
    sufficient: false,
    shortfall,
    suggestions: [
      `Your balance (${currentBalance} credits) is insufficient. Need ${estimatedCreditNeeded}.`,
      `Option 1: Upgrade subscription tier to ${suggestCheaperTier(user.subscription_tier)}`,
      `Option 2: Use a cheaper model (e.g., Gemini Flash instead of GPT-4o)`,
      `Option 3: Subscribe to Pro tier (+${19} credits/month)`,
      `Option 4: Check back when monthly credits renew`
    ]
  };
}
```

### Edge Case 3: Vendor Rate Change Mid-Request

**Challenge**: Vendor changes prices while request is in flight. Use old price (request initiated before change) or new price?

**Answer**: Use price at request time (timestamp-based lookup).

```typescript
async function calculateVendorCostWithHistoricalPricing(
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    modelId: string;
    providerId: string;
  },
  requestStartedAt: Date  // Use price effective at THIS time
): Promise<CostCalculation> {
  // Find pricing row that was active at request start time
  const historicalPricing = await db.model_provider_pricing.findFirst({
    where: {
      provider_id: tokenUsage.providerId,
      model_name: tokenUsage.modelId,
      effective_from: { lte: requestStartedAt },
      OR: [
        { effective_until: null },  // Currently active
        { effective_until: { gte: requestStartedAt } }  // Was active at request time
      ]
    },
    orderBy: { effective_from: 'desc' }
  });

  if (!historicalPricing) {
    // Fall back to current pricing (best effort)
    return calculateVendorCost(tokenUsage);
  }

  // Use the historical pricing
  const inputCost = (tokenUsage.inputTokens * historicalPricing.input_price_per_1k) / 1000;
  const outputCost = (tokenUsage.outputTokens * historicalPricing.output_price_per_1k) / 1000;

  return {
    vendorCost: inputCost + outputCost,
    inputCost,
    outputCost,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    pricingSource: `Historical pricing from ${historicalPricing.effective_from}`
  };
}
```

### Edge Case 4: Free Tier Overage Prevention

**Challenge**: Free users with 2,000 credits/month might request expensive models that burn credits quickly.

**Solutions**:

**Option A: Hard Limit** (Recommended)
```typescript
const FREE_TIER_MONTHLY_BUDGET = 2000;  // credits

async function enforceFreeTierLimit(userId: string, creditsNeeded: number): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  if (user.subscription?.tier !== 'free') {
    return true;  // Not free tier, allow
  }

  // Check this month's total spend
  const thisMonth = getCurrentMonthRange();
  const thisMonthSpend = await db.credit_deduction_ledger.aggregate({
    where: {
      user_id: userId,
      created_at: {
        gte: thisMonth.start,
        lte: thisMonth.end
      }
    },
    _sum: { amount: true }
  });

  const remaining = FREE_TIER_MONTHLY_BUDGET - (thisMonthSpend._sum.amount || 0);

  if (remaining < creditsNeeded) {
    throw new FreeUserLimitExceededError(
      `Free tier monthly limit (${FREE_TIER_MONTHLY_BUDGET} credits) reached.` +
      `Remaining this month: ${remaining}. Needed: ${creditsNeeded}.` +
      `Upgrade to Pro for more credits.`
    );
  }

  return true;
}
```

**Option B: Model Restrictions** (Alternative)
```typescript
const FREE_TIER_ALLOWED_MODELS = [
  'gpt-3.5-turbo',      // Cheapest OpenAI
  'gemini-2-0-flash',   // Cheapest Google
  'claude-3-haiku'      // Cheapest Anthropic
];

async function validateFreeUserModelAccess(
  userId: string,
  modelId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await db.user.findUnique({ where: { id: userId } });

  if (user.subscription?.tier !== 'free') {
    return { allowed: true };  // Paid tier, unrestricted
  }

  if (!FREE_TIER_ALLOWED_MODELS.includes(modelId)) {
    return {
      allowed: false,
      reason: `Model ${modelId} unavailable for Free tier. Allowed models: ${FREE_TIER_ALLOWED_MODELS.join(', ')}`
    };
  }

  return { allowed: true };
}
```

### Edge Case 5: Rollover Credits Conversion

**Challenge**: Users can have credits from different sources (monthly allocation, bonuses, referral rewards, coupons). Do they all convert to tokens at the same rate?

**Answer**: Yes, but track source for analytics.

```sql
CREATE TABLE user_credit_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id),

  source ENUM('monthly_allocation', 'referral_reward', 'coupon_promotion', 'bonus', 'refund') NOT NULL,
  amount INT NOT NULL,

  expires_at TIMESTAMP,  -- When credits expire (null = no expiration)

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- When deducting credits, deduct from soonest-expiring first
async function deductCreditsInOrder(userId: string, amountNeeded: int): Promise<void> {
  const creditSources = await db.user_credit_source.findMany({
    where: { user_id: userId },
    orderBy: { expires_at: 'asc' }  // Expiring soon first
  });

  let remainingToDeduct = amountNeeded;

  for (const source of creditSources) {
    if (remainingToDeduct <= 0) break;

    const deductFromThisSource = Math.min(source.amount, remainingToDeduct);
    remainingToDeduct -= deductFromThisSource;

    // Update source balance
    await db.user_credit_source.update({
      where: { id: source.id },
      data: { amount: { decrement: deductFromThisSource } }
    });
  }

  if (remainingToDeduct > 0) {
    throw new InsufficientCreditsError(`Not enough credits to deduct ${amountNeeded}`);
  }
}
```

---

## Database Schema

### Complete Schema

```sql
-- Vendors (OpenAI, Anthropic, Google, Azure)
CREATE TABLE provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,  -- "OpenAI", "Anthropic", etc.
  api_type ENUM('openai', 'anthropic', 'google', 'azure', 'ollama') NOT NULL,
  is_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model pricing from vendors (updated weekly via cron)
CREATE TABLE model_provider_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider(id),
  model_name VARCHAR(255) NOT NULL,
  vendor_model_id VARCHAR(255) UNIQUE,

  input_price_per_1k DECIMAL(10, 8) NOT NULL,
  output_price_per_1k DECIMAL(10, 8) NOT NULL,
  cache_input_price_per_1k DECIMAL(10, 8),
  cache_hit_price_per_1k DECIMAL(10, 8),

  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,

  previous_price_input DECIMAL(10, 8),
  previous_price_output DECIMAL(10, 8),
  price_change_percent_input DECIMAL(5, 2),
  price_change_percent_output DECIMAL(5, 2),
  detected_at TIMESTAMP,

  is_active BOOLEAN DEFAULT true,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(provider_id, model_name, effective_from)
);

-- Multiplier configuration (scoped by tier, provider, model)
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type ENUM('tier', 'provider', 'model', 'combination') NOT NULL,

  subscription_tier VARCHAR(50),
  provider_id UUID REFERENCES provider(id),
  model_id VARCHAR(255),

  margin_multiplier DECIMAL(4, 2) NOT NULL,
  target_gross_margin_percent DECIMAL(5, 2),

  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,

  reason ENUM('initial_setup', 'vendor_price_change', 'tier_optimization', 'margin_protection', 'manual_adjustment') NOT NULL,
  reason_details TEXT,

  previous_multiplier DECIMAL(4, 2),
  change_percent DECIMAL(5, 2),
  expected_margin_change_dollars DECIMAL(12, 2),
  expected_revenue_impact DECIMAL(12, 2),

  created_by UUID NOT NULL REFERENCES "user"(id),
  approved_by UUID REFERENCES "user"(id),
  requires_approval BOOLEAN DEFAULT true,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',

  is_active BOOLEAN DEFAULT true,
  monitored BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token usage ledger (immutable audit trail)
CREATE TABLE token_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID UNIQUE NOT NULL,

  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscription(id),

  model_id VARCHAR(255) NOT NULL,
  provider_id UUID NOT NULL REFERENCES provider(id),

  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cached_input_tokens INT DEFAULT 0,
  total_tokens INT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  vendor_cost DECIMAL(10, 8) NOT NULL,
  margin_multiplier DECIMAL(4, 2) NOT NULL,
  credit_value_usd DECIMAL(10, 8) NOT NULL,
  credits_deducted INT NOT NULL,
  gross_margin_usd DECIMAL(10, 8) GENERATED ALWAYS AS (credit_value_usd - vendor_cost) STORED,

  request_type ENUM('completion', 'streaming', 'batch') NOT NULL,
  streaming_segments INT,

  request_started_at TIMESTAMP NOT NULL,
  request_completed_at TIMESTAMP NOT NULL,
  processing_time_ms INT,

  status ENUM('success', 'failed', 'cancelled', 'rate_limited') DEFAULT 'success',
  error_message TEXT,
  is_streaming_complete BOOLEAN DEFAULT true,

  user_tier_at_request VARCHAR(50),
  region VARCHAR(50),

  deduction_record_id UUID,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit balance (single source of truth)
CREATE TABLE user_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  amount INT NOT NULL DEFAULT 0,
  last_deduction_at TIMESTAMP,
  last_deduction_amount INT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit deduction ledger (immutable)
CREATE TABLE credit_deduction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  amount INT NOT NULL,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,

  request_id UUID UNIQUE REFERENCES token_usage_ledger(request_id),
  token_vendor_cost DECIMAL(10, 8),
  margin_multiplier DECIMAL(4, 2),
  gross_margin DECIMAL(10, 8),

  reason ENUM('api_completion', 'subscription_allocation', 'manual_adjustment', 'refund', 'overage') NOT NULL,
  status ENUM('pending', 'completed', 'reversed') DEFAULT 'pending',

  reversed_at TIMESTAMP,
  reversed_by UUID REFERENCES "user"(id),
  reversal_reason TEXT,

  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Admin UI & Simulation Tools

(Content continues with admin dashboard specifications, pricing adjustment tools, and vendor rate monitoring interfaces...)

---

## Integration with Monetization Plans

### How Plan 112 Connects to Plans 109-111

**Plan 109 (Subscription Model)** defines:
- 5 tiers with monthly credit allocations
- But doesn't know: How many tokens = 1 credit?

**Plan 110 (Perpetual Plan)** defines:
- Unlimited credits for Perpetual users
- But doesn't know: What's the actual cost impact?

**Plan 111 (Coupons)** offers discounts:
- Users get credits discounts (e.g., "$20 off" coupons)
- But doesn't know: What's the margin on each discounted transaction?

**Plan 112 (Token-to-Credit) provides the answer**:
- Maps vendor token costs to credit values
- Ensures every tier is profitable at the token level
- Makes coupons' impact quantifiable

### Integration Architecture

```
User Purchases Subscription (Plan 109)
  ↓
Receives monthly credit allocation
  ↓
Makes API request with credits
  ↓
[Plan 112: Token Tracking]
  - Capture input/output tokens from response
  - Look up vendor pricing
  - Calculate vendor cost
  ↓
[Plan 112: Margin Calculation]
  - Get applicable multiplier (tier-based from Plan 109)
  - Apply margin: cost × multiplier = credit value
  ↓
[Plan 112: Credit Deduction]
  - Deduct credits atomically from balance
  - Record in ledger (immutable)
  ↓
Analytics & Reconciliation
  - Compare vendor invoice (actual cost paid)
  - vs. credit deductions (what users consumed)
  - Ensure margin targets met

---

Coupon Used (Plan 111)
  - User gets "$20 credit" coupon
  - Applied at checkout
  - Credits allocated via Plan 109 monthly bucket
  ↓
Same token-to-credit pipeline as above
  ↓
Profitability verified via Plan 112
  - Coupon discount: $20
  - Token cost at checkout: $12
  - Platform margin: $8 profit
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Tasks**:
- [ ] Create database schema (pricing, token ledger, credit balance tables)
- [ ] Implement `ModelProviderPricing` CRUD service
- [ ] Implement `CostCalculationService` (vendor cost lookup)
- [ ] Create seed data with current vendor pricing

**Deliverables**:
- Database migrations
- Core pricing lookup working
- Vendor pricing seed data

---

### Phase 2: Token Tracking (Weeks 3-4)

**Tasks**:
- [ ] Implement token capture from all provider APIs (OpenAI, Anthropic, Google, Azure)
- [ ] Create `TokenTrackingService` for non-streaming completions
- [ ] Create `StreamingTokenTracker` for streaming completions
- [ ] Implement `TokenUsageLedger` recording

**Deliverables**:
- Token capture integrated into all completion endpoints
- Ledger recording 100% of requests
- Streaming support tested

---

### Phase 3: Credit Deduction Logic (Weeks 5-6)

**Tasks**:
- [ ] Implement `PricingConfigService` with cascade lookup
- [ ] Implement `CreditDeductionService` with atomic transactions
- [ ] Implement pre-check validation (sufficient credits)
- [ ] Integrate into completion API request/response cycle

**Deliverables**:
- Credit deduction working atomically
- Pre-checks preventing insufficient-credit errors
- Ledger populated for every deduction

---

### Phase 4: Edge Case Handling (Weeks 7-8)

**Tasks**:
- [ ] Implement streaming completion credit handling
- [ ] Implement vendor rate change detection & pricing updates
- [ ] Implement free tier limits
- [ ] Implement rollover credit priority deduction

**Deliverables**:
- Streaming requests charge correctly
- Vendor rate changes detected weekly
- Free tier protected from abuse
- Credit source prioritization working

---

### Phase 5: Admin UI (Weeks 9-10)

**Tasks**:
- [ ] Create pricing config dashboard (view, create, edit multipliers)
- [ ] Create pricing simulation tool (what-if scenarios)
- [ ] Create vendor price change alerting
- [ ] Create multiplier adjustment approval workflow

**Deliverables**:
- Admin can adjust multipliers without code
- Simulations show impact before applying
- Alerts for vendor price changes
- Approval workflow for changes >5% impact

---

### Phase 6: Monitoring & Analytics (Weeks 11-12)

**Tasks**:
- [ ] Create margin tracking dashboard (actual vs. target)
- [ ] Create token usage analytics by tier/provider/model
- [ ] Create vendor cost reconciliation report
- [ ] Create profitability alerts

**Deliverables**:
- Real-time margin tracking
- Monthly profitability reports
- Alerts when margin <target

---

### Phase 7: Testing & QA (Weeks 13-14)

**Tasks**:
- [ ] Unit tests for cost calculation (50+ test cases)
- [ ] Integration tests for credit deduction flow
- [ ] Load testing (1000 requests/sec with token tracking)
- [ ] Edge case testing (streaming, vendor changes, insufficient credits)

**Deliverables**:
- >95% test coverage
- Load test passing
- All edge cases tested

---

### Phase 8: Pre-Launch & Monitoring (Weeks 15-16)

**Tasks**:
- [ ] Set up production monitoring (margin alerts, deduction failures)
- [ ] Create runbooks for common issues
- [ ] Train support team on token/credit model
- [ ] Create admin documentation

**Deliverables**:
- Monitoring dashboards live
- Runbooks documented
- Team trained

---

## Profitability Analysis

### Monthly Profitability Model

(Detailed financial projections showing margin by tier, vendor mix, and user cohorts...)

---

## Monitoring & Alerts

### Critical Alerts

1. **Negative Margin Detection** (Critical)
   - Trigger: Any request where credits_deducted < vendor_cost
   - Action: Block request, page on-call team

2. **Margin Below Target** (Warning)
   - Trigger: Rolling 7-day margin < target - 2%
   - Action: Review token mix, adjust multipliers

3. **Vendor Rate Change >10%** (High Priority)
   - Trigger: Auto-detected from pricing refresh
   - Action: Alert admin to review, recommend multiplier adjustment

4. **Credit Deduction Failure** (High Priority)
   - Trigger: Failed to deduct credits atomically
   - Action: Retry 3x, then escalate with refund

5. **Insufficient Credits (Free Tier)** (Low Priority)
   - Trigger: Free tier user hits limit
   - Action: Log, suggest upgrade

---

**Document End**

