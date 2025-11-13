# Plan 161: Provider Pricing System Activation

**Document ID**: 161-provider-pricing-system-activation.md
**Version**: 1.1
**Status**: Approved
**Created**: 2025-11-13
**Revised**: 2025-11-13 (Updated credit conversion factor from × 1000 to × 100)
**Target Completion**: 2025-11-15
**Scope**: Activate dormant provider pricing infrastructure with seed data, LLM integration, and admin endpoints
**Dependencies**:
- Plan 112: Token-to-Credit Conversion Mechanism (schema exists)
- Analysis 081: Providers Table Architecture Analysis
**Owner**: Platform Revenue & Profitability Team

**Revision History**:
- v1.1 (2025-11-13): Changed credit conversion from × 1000 to × 100 (1 credit = $0.01 instead of $0.001) based on user feedback to reduce large credit numbers for small requests
- v1.0 (2025-11-13): Initial plan creation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Current State Analysis](#current-state-analysis)
4. [Implementation Objectives](#implementation-objectives)
5. [Architecture Overview](#architecture-overview)
6. [Implementation Phases](#implementation-phases)
7. [Vendor Pricing Research](#vendor-pricing-research)
8. [Database Seeding Strategy](#database-seeding-strategy)
9. [LLM Service Integration](#llm-service-integration)
10. [Admin API Endpoints](#admin-api-endpoints)
11. [Testing Strategy](#testing-strategy)
12. [Success Criteria](#success-criteria)
13. [Rollout Plan](#rollout-plan)
14. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

The Provider Pricing System was architected in Plan 112 (Token-to-Credit Conversion Mechanism) but never activated. The database schema exists, service classes are implemented, but the system lacks seed data and integration with production LLM flows.

**This plan activates the dormant system** by:
1. ✅ Researching latest vendor pricing (November 2025)
2. ✅ Seeding provider registry and model pricing data
3. ✅ Configuring margin multipliers per subscription tier
4. ✅ Integrating cost calculation into LLM service
5. ✅ Building admin endpoints for profitability monitoring

**Business Impact**:
- **Revenue Protection**: Ensure every API request generates positive margin
- **Transparency**: Visibility into vendor costs and platform profitability
- **Dynamic Pricing**: Ability to adjust margins when vendor prices change
- **Analytics**: Track gross margin per tier/provider/model

**Timeline**: 3-5 days (includes research, implementation, testing)

**Credit Conversion Factor**: × 100 (1 credit = $0.01)
- User-friendly small numbers (3 credits vs 30 credits per request)
- Easy mental math (100 credits = $1.00)
- Aligned with subscription tiers (200 credits/month Free = $2.00 value)

---

## Business Context

### Problem Statement

Currently, the Rephlo platform operates **blind to actual vendor costs**:
- ❌ No tracking of OpenAI/Anthropic/Google token pricing
- ❌ No calculation of vendor cost per API request
- ❌ No visibility into gross margin per user/tier
- ❌ Risk of unprofitable requests (e.g., Free tier using expensive models)

**Example Scenario**:
```
User (Free tier) makes request to GPT-4o:
- Input: 10,000 tokens
- Output: 2,000 tokens
- Vendor Cost: (10k × $0.0025) + (2k × $0.01) = $0.045
- Credits Deducted: 50 credits (fixed, not cost-based)
- Platform Margin: Unknown! Could be negative.
```

### Strategic Goals

1. **Profitability Per Request**: Every API call must generate positive contribution margin
2. **Tier-Based Pricing**: Different margins for Free (50%), Pro (30%), Enterprise (15%)
3. **Vendor Cost Tracking**: Historical pricing with change detection
4. **Admin Visibility**: Dashboard showing gross margin analytics
5. **Future-Proofing**: System ready for dynamic pricing adjustments

---

## Current State Analysis

### What Exists (Infrastructure)

**Database Schema** ✅:
- `providers` table (empty, 0 rows)
- `model_provider_pricing` table (empty, 0 rows)
- `pricing_configs` table (empty, 0 rows)
- `token_usage_ledger` table (empty, 0 rows)

**Service Classes** ✅:
- `CostCalculationService` (`backend/src/services/cost-calculation.service.ts`)
- `PricingConfigService` (`backend/src/services/pricing-config.service.ts`)
- `AdminProfitabilityService` (`backend/src/services/admin-profitability.service.ts`)

**Migration** ✅:
- `20251109000000_add_token_credit_conversion_system` (applied successfully)

### What's Missing (Activation)

**Seed Data** ❌:
- No provider registry (should have: openai, anthropic, google, azure, mistral)
- No vendor pricing data (need latest November 2025 pricing)
- No margin configurations (need tier-based multipliers)

**Integration** ❌:
- LLM service doesn't call cost calculation
- No credit deduction based on actual vendor costs
- No token usage logging to ledger

**Admin UI** ❌:
- No endpoints for provider management
- No profitability analytics endpoints
- No pricing configuration endpoints

---

## Implementation Objectives

### Primary Objectives (P0 - Must Have)

1. **Vendor Pricing Research**
   - Gather latest pricing from OpenAI, Anthropic, Google, Azure, Mistral
   - Verify pricing for all seeded models (10 models total)
   - Document pricing effective dates (November 2025)

2. **Database Seeding**
   - Seed 5 providers (openai, anthropic, google, azure, mistral)
   - Seed pricing for 10+ models with current vendor costs
   - Configure tier-based margin multipliers (Free 50%, Pro 30%, Enterprise 15%)

3. **LLM Service Integration**
   - Integrate `CostCalculationService` into LLM service
   - Calculate vendor cost after each API request
   - Apply margin multiplier based on user tier
   - Deduct credits atomically
   - Log to token usage ledger

4. **Admin Endpoints**
   - `GET /admin/providers` - List all providers with stats
   - `GET /admin/profitability` - Gross margin analytics

### Secondary Objectives (P1 - Should Have)

5. **Testing**
   - Integration tests for cost calculation flow
   - Unit tests for provider seeding
   - End-to-end test for LLM request → cost calculation → credit deduction

6. **Documentation**
   - Update CLAUDE.md with provider system overview
   - Create implementation completion report
   - Document pricing configuration guide for admins

### Stretch Goals (P2 - Nice to Have)

7. **Advanced Features** (Future phases)
   - Automatic vendor price change detection
   - Dynamic margin adjustment recommendations
   - Credit simulation tool for admins
   - Profitability alerts (negative margin warnings)

---

## Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User API Request                                                │
│ POST /v1/chat/completions                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ LLMService.generateCompletion()                                 │
│ 1. Call vendor API (OpenAI/Anthropic/Google)                    │
│ 2. Extract token usage from response                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ CostCalculationService.calculateCost()                          │
│ 1. Lookup provider from models.provider (string → UUID)         │
│ 2. Query model_provider_pricing for vendor rates                │
│ 3. Calculate: vendorCost = (inputTokens × inputRate) +          │
│              (outputTokens × outputRate)                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ PricingConfigService.getMarginMultiplier()                      │
│ 1. Get user's subscription tier                                 │
│ 2. Apply scope hierarchy (tier > provider > model)              │
│ 3. Return margin multiplier (e.g., 1.30 for Pro tier)           │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Credit Deduction Calculation                                    │
│ creditsToDeduct = ceil(vendorCost × marginMultiplier × 100)     │
│ grossMargin = vendorCost × (marginMultiplier - 1)               │
│ Note: × 100 conversion (1 credit = $0.01)                       │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ CreditService.deductCredits()                                   │
│ 1. Atomic deduction from user's credit balance                  │
│ 2. Throw error if insufficient credits                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ TokenUsageLedger.create()                                       │
│ 1. Log: userId, modelId, providerId, tokens, vendorCost         │
│ 2. Log: marginMultiplier, creditsDeducted, grossMargin          │
│ 3. Immutable audit trail for analytics                          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Example

**Scenario**: Pro user requests GPT-4o completion
```
Input:
- User: john@example.com (Pro tier)
- Model: gpt-4o
- Input tokens: 5,000
- Output tokens: 1,000

Step 1: Lookup Provider
- models.provider = 'openai' → providers.name = 'openai' → providerId = <UUID>

Step 2: Get Vendor Pricing
- Query: model_provider_pricing WHERE providerId = <UUID> AND modelName = 'gpt-4o'
- Result: inputPricePer1k = $0.0025, outputPricePer1k = $0.01

Step 3: Calculate Vendor Cost
- inputCost = (5,000 / 1,000) × $0.0025 = $0.0125
- outputCost = (1,000 / 1,000) × $0.01 = $0.01
- vendorCost = $0.0225

Step 4: Get Margin Multiplier
- User tier: Pro
- Lookup: pricing_configs WHERE tier = 'pro'
- Result: marginMultiplier = 1.30 (30% margin)

Step 5: Calculate Credits
- creditsToDeduct = ceil($0.0225 × 1.30 × 100) = 3 credits
- grossMargin = $0.0225 × 0.30 = $0.00675

Step 6: Deduct Credits
- User balance: 2,000 credits → 1,997 credits

Step 7: Log to Ledger
{
  userId: <UUID>,
  modelId: 'gpt-4o',
  providerId: <UUID>,
  inputTokens: 5000,
  outputTokens: 1000,
  vendorCostUsd: 0.0225,
  marginMultiplier: 1.30,
  creditsDeducted: 3,
  grossMarginUsd: 0.00675,
  grossMarginPercent: 30.0
}
```

---

## Implementation Phases

### Phase 1: Vendor Pricing Research (Day 1, 2-3 hours)

**Objective**: Gather latest vendor pricing as of November 2025

**Tasks**:
1. Research OpenAI pricing page for GPT-4o, GPT-4o-mini, o1, o3 models
2. Research Anthropic pricing for Claude Opus 4, Sonnet 4.5, Haiku 4.5
3. Research Google AI pricing for Gemini 2.5 Pro, Gemini 2.0 Flash
4. Research Azure OpenAI pricing (verify if same as OpenAI)
5. Research Mistral AI pricing for Mistral Medium
6. Document pricing in structured format (CSV or JSON)

**Deliverable**: `docs/research/082-vendor-pricing-november-2025.md`

**Agent**: General-purpose research agent with web search

### Phase 2: Database Seeding (Day 1-2, 4-6 hours)

**Objective**: Populate providers, pricing, and configuration tables

**Tasks**:
1. Create `seedProviders()` function in `backend/prisma/seed.ts`
2. Create `seedModelPricing()` function with vendor pricing data
3. Create `seedPricingConfigs()` function with tier-based margins
4. Add calls to main seed function
5. Run seed script: `npm run seed`
6. Verify data with Prisma Studio

**Deliverable**: Updated `backend/prisma/seed.ts` with 3 new seeding functions

**Agent**: Database Schema Architect agent

### Phase 3: LLM Service Integration (Day 2-3, 8-10 hours)

**Objective**: Integrate cost calculation into production LLM flow

**Tasks**:
1. Modify `LLMService.generateCompletion()` to call cost calculation
2. Add helper method `getProviderIdForModel(modelId)` to lookup provider UUID
3. Integrate with `CostCalculationService.calculateCost()`
4. Integrate with `PricingConfigService.getMarginMultiplier()`
5. Calculate credit deduction and call `CreditService.deductCredits()`
6. Log to `TokenUsageLedger` for analytics
7. Handle edge cases (no pricing found, insufficient credits)

**Deliverable**: Updated `backend/src/services/llm.service.ts`

**Agent**: API Backend Implementer agent

### Phase 4: Admin Endpoints (Day 3, 4-6 hours)

**Objective**: Build admin endpoints for provider and profitability management

**Tasks**:
1. Create `ProvidersController` with `GET /admin/providers`
2. Create `ProfitabilityController` with `GET /admin/profitability`
3. Return provider stats (total requests, total vendor cost, gross margin)
4. Return tier-level profitability metrics
5. Add authentication middleware (admin-only)
6. Register routes in server.ts

**Deliverable**:
- `backend/src/controllers/admin/providers.controller.ts`
- `backend/src/controllers/admin/profitability.controller.ts`

**Agent**: API Backend Implementer agent

### Phase 5: Testing (Day 4, 6-8 hours)

**Objective**: Comprehensive testing of entire flow

**Tasks**:
1. Write unit tests for provider seeding
2. Write unit tests for cost calculation
3. Write integration test for LLM request → cost → credits → ledger
4. Write E2E test with real vendor pricing data
5. Test edge cases (no pricing, insufficient credits, negative margin)
6. Run full test suite: `npm run test`

**Deliverable**: Test files in `backend/tests/`

**Agent**: Testing QA Specialist agent

### Phase 6: Documentation & Completion (Day 5, 2-4 hours)

**Objective**: Document implementation and verify production readiness

**Tasks**:
1. Update CLAUDE.md with provider system overview
2. Create completion report in `docs/progress/`
3. Verify backend builds: `npm run build`
4. Run production preview and smoke test
5. Create admin guide for pricing configuration

**Deliverable**:
- Updated `CLAUDE.md`
- `docs/progress/179-provider-pricing-activation-completion.md`

**Agent**: Documentation writer (self)

---

## Vendor Pricing Research

### Research Methodology

**Sources** (as of November 2025):
1. **OpenAI**: https://openai.com/pricing
2. **Anthropic**: https://www.anthropic.com/pricing
3. **Google AI**: https://ai.google.dev/pricing
4. **Azure OpenAI**: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/
5. **Mistral AI**: https://mistral.ai/technology/#pricing

**Data to Collect**:
- Input price per 1M tokens (convert to per 1k for storage)
- Output price per 1M tokens (convert to per 1k for storage)
- Cache pricing (if available, e.g., Anthropic prompt caching)
- Effective date (November 2025)
- Model availability (verify models still offered)

**Format**:
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "inputPricePer1M": 2.50,
  "outputPricePer1M": 10.00,
  "inputPricePer1k": 0.0025,
  "outputPricePer1k": 0.01,
  "effectiveDate": "2025-11-01",
  "source": "https://openai.com/pricing",
  "verified": "2025-11-13"
}
```

### Pricing Validation

**Sanity Checks**:
1. Input price should be lower than output price (typically 2-5x)
2. Premium models (GPT-4o, Claude Opus) should be 5-10x more expensive than efficient models (GPT-4o-mini, Claude Haiku)
3. Prices should be in micro-dollar range ($0.0001 to $0.10 per 1k tokens)
4. Compare to Plan 112 baseline pricing (October 2025) - should be within ±20%

---

## Database Seeding Strategy

### Seed Function Structure

```typescript
// backend/prisma/seed.ts

/**
 * Seed Providers Table
 * Registry of AI model vendors
 */
async function seedProviders() {
  console.log('🏢 Seeding providers...');

  const providers = [
    { name: 'openai', apiType: 'openai' },
    { name: 'anthropic', apiType: 'anthropic' },
    { name: 'google', apiType: 'google-ai' },
    { name: 'azure', apiType: 'azure-openai' },
    { name: 'mistral', apiType: 'mistral' },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { name: provider.name },
      update: { apiType: provider.apiType, isEnabled: true },
      create: {
        name: provider.name,
        apiType: provider.apiType,
        isEnabled: true,
      },
    });
    console.log(`  ✓ Provider: ${provider.name}`);
  }
}

/**
 * Seed Model Provider Pricing
 * Vendor token pricing with historical tracking
 */
async function seedModelPricing() {
  console.log('💰 Seeding model pricing...');

  // Get provider UUIDs
  const openai = await prisma.provider.findUnique({ where: { name: 'openai' } });
  const anthropic = await prisma.provider.findUnique({ where: { name: 'anthropic' } });
  const google = await prisma.provider.findUnique({ where: { name: 'google' } });
  const mistral = await prisma.provider.findUnique({ where: { name: 'mistral' } });

  const effectiveFrom = new Date('2025-11-01');

  const pricing = [
    // OpenAI Models
    {
      providerId: openai!.id,
      modelName: 'gpt-4o',
      vendorModelId: 'gpt-4o-2024-08-06',
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      effectiveFrom,
      description: 'GPT-4o current pricing (Nov 2025)',
    },
    {
      providerId: openai!.id,
      modelName: 'gpt-4o-mini',
      vendorModelId: 'gpt-4o-mini-2024-07-18',
      inputPricePer1k: 0.00015,
      outputPricePer1k: 0.0006,
      effectiveFrom,
      description: 'GPT-4o-mini current pricing (Nov 2025)',
    },
    // Anthropic Models
    {
      providerId: anthropic!.id,
      modelName: 'claude-opus-4',
      vendorModelId: 'claude-opus-4-20250514',
      inputPricePer1k: 0.015,
      outputPricePer1k: 0.075,
      cacheInputPricePer1k: 0.00375,  // 75% discount for cached
      cacheHitPricePer1k: 0.0015,     // 90% discount for cache hits
      effectiveFrom,
      description: 'Claude Opus 4 pricing with prompt caching (Nov 2025)',
    },
    // ... more models
  ];

  for (const price of pricing) {
    await prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: price.providerId,
          modelName: price.modelName,
          effectiveFrom: price.effectiveFrom,
        },
      },
      update: {},
      create: price,
    });
    console.log(`  ✓ Pricing: ${price.modelName}`);
  }
}

/**
 * Seed Pricing Configurations
 * Tier-based margin multipliers with approval workflow
 */
async function seedPricingConfigs() {
  console.log('⚙️  Seeding pricing configurations...');

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) {
    console.warn('  ⚠️  No admin user found, skipping pricing configs');
    return;
  }

  const effectiveFrom = new Date('2025-11-01');

  const configs = [
    // Global default (fallback if no tier-specific config)
    {
      scopeType: 'tier' as const,
      subscriptionTier: null,
      marginMultiplier: 1.50, // 50% margin
      targetGrossMarginPercent: 33.33,
      reason: 'initial_setup' as const,
      reasonDetails: 'Default margin for all tiers if no specific config exists',
      createdBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      effectiveFrom,
      isActive: true,
    },
    // Free tier (highest margin to offset risk)
    {
      scopeType: 'tier' as const,
      subscriptionTier: 'free' as const,
      marginMultiplier: 1.50, // 50% margin
      targetGrossMarginPercent: 33.33,
      reason: 'tier_optimization' as const,
      reasonDetails: 'Higher margin for free tier to protect against abuse',
      createdBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      effectiveFrom,
      isActive: true,
    },
    // Pro tier (moderate margin)
    {
      scopeType: 'tier' as const,
      subscriptionTier: 'pro' as const,
      marginMultiplier: 1.30, // 30% margin
      targetGrossMarginPercent: 23.08,
      reason: 'tier_optimization' as const,
      reasonDetails: 'Competitive margin for Pro tier subscribers',
      createdBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      effectiveFrom,
      isActive: true,
    },
    // Pro Max tier
    {
      scopeType: 'tier' as const,
      subscriptionTier: 'pro_max' as const,
      marginMultiplier: 1.25, // 25% margin
      targetGrossMarginPercent: 20.0,
      reason: 'tier_optimization' as const,
      reasonDetails: 'Better value for Pro Max tier',
      createdBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      effectiveFrom,
      isActive: true,
    },
    // Enterprise Pro tier (lowest margin, highest value)
    {
      scopeType: 'tier' as const,
      subscriptionTier: 'enterprise_pro' as const,
      marginMultiplier: 1.15, // 15% margin
      targetGrossMarginPercent: 13.04,
      reason: 'tier_optimization' as const,
      reasonDetails: 'Competitive enterprise pricing',
      createdBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      effectiveFrom,
      isActive: true,
    },
    // Enterprise Max tier
    {
      scopeType: 'tier' as const,
      subscriptionTier: 'enterprise_max' as const,
      marginMultiplier: 1.10, // 10% margin
      targetGrossMarginPercent: 9.09,
      reason: 'tier_optimization' as const,
      reasonDetails: 'Premium enterprise tier with near-cost pricing',
      createdBy: admin.id,
      approvalStatus: 'approved' as const,
      approvedBy: admin.id,
      effectiveFrom,
      isActive: true,
    },
  ];

  for (const config of configs) {
    await prisma.pricingConfig.create({ data: config });
    const tierName = config.subscriptionTier || 'global';
    console.log(`  ✓ Config: ${tierName} (${config.marginMultiplier}x margin)`);
  }
}

// Update main seed function
async function main() {
  // ... existing seeds

  // Provider Pricing System
  await seedProviders();
  await seedModelPricing();
  await seedPricingConfigs();
}
```

### Seed Data Validation

**Post-Seed Checks**:
```sql
-- Verify providers
SELECT COUNT(*) FROM providers; -- Should be 5

-- Verify pricing
SELECT COUNT(*) FROM model_provider_pricing; -- Should be 10+

-- Verify configs
SELECT
  subscription_tier,
  margin_multiplier,
  target_gross_margin_percent
FROM pricing_configs
WHERE is_active = true
ORDER BY margin_multiplier DESC;

-- Verify provider-model relationship
SELECT DISTINCT
  m.provider,
  p.name
FROM models m
LEFT JOIN providers p ON m.provider = p.name
ORDER BY m.provider;
```

---

## LLM Service Integration

### Integration Points

**File**: `backend/src/services/llm.service.ts`

**Modifications Required**:

1. **Constructor Dependency Injection**:
```typescript
@injectable()
export class LLMService {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    @inject('CostCalculationService') private readonly costCalc: CostCalculationService,
    @inject('PricingConfigService') private readonly pricingConfig: PricingConfigService,
    @inject('CreditService') private readonly creditService: CreditService,
    // ... existing dependencies
  ) {}
}
```

2. **Provider Lookup Helper**:
```typescript
private async getProviderIdForModel(modelId: string): Promise<string> {
  const model = await this.prisma.model.findUnique({
    where: { id: modelId },
    select: { provider: true },
  });

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const provider = await this.prisma.provider.findUnique({
    where: { name: model.provider },
    select: { id: true },
  });

  if (!provider) {
    throw new Error(`Provider ${model.provider} not found for model ${modelId}`);
  }

  return provider.id;
}
```

3. **Post-Request Cost Calculation**:
```typescript
async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
  // 1. Make API request to vendor
  const response = await this.callVendorAPI(request);

  // 2. Extract token usage
  const { inputTokens, outputTokens } = response.usage || {
    inputTokens: 0,
    outputTokens: 0
  };

  try {
    // 3. Get provider ID
    const providerId = await this.getProviderIdForModel(request.model);

    // 4. Calculate vendor cost
    const cost = await this.costCalc.calculateCost(
      request.model,
      providerId,
      inputTokens,
      outputTokens
    );

    // 5. Get margin multiplier for user's tier
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { subscriptionTier: true },
    });

    const marginMultiplier = await this.pricingConfig.getMarginMultiplier(
      user!.subscriptionTier,
      providerId,
      request.model
    );

    // 6. Calculate credit deduction (× 100 conversion: 1 credit = $0.01)
    const CREDITS_PER_DOLLAR = 100; // 1 credit = $0.01 (one cent)
    const creditsToDeduct = Math.ceil(cost.vendorCost * marginMultiplier * CREDITS_PER_DOLLAR);
    const grossMargin = cost.vendorCost * (marginMultiplier - 1);
    const grossMarginPercent = ((marginMultiplier - 1) / marginMultiplier) * 100;

    // 7. Deduct credits atomically
    await this.creditService.deductCredits(
      request.userId,
      creditsToDeduct,
      'api_completion',
      {
        modelId: request.model,
        requestId: response.id,
        inputTokens,
        outputTokens,
        vendorCost: cost.vendorCost,
      }
    );

    // 8. Log to token usage ledger
    await this.prisma.tokenUsageLedger.create({
      data: {
        userId: request.userId,
        subscriptionId: user!.subscriptionId, // if exists
        providerId,
        modelId: request.model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        vendorCostUsd: cost.vendorCost,
        marginMultiplier,
        creditsDeducted: creditsToDeduct,
        grossMarginUsd: grossMargin,
        grossMarginPercent: grossMarginPercent,
        requestType: request.stream ? 'streaming' : 'completion',
        requestStatus: 'success',
        requestId: response.id,
      },
    });

    logger.info('LLMService: Token usage logged', {
      userId: request.userId,
      model: request.model,
      tokens: inputTokens + outputTokens,
      vendorCost: cost.vendorCost,
      creditsDeducted,
      grossMargin,
    });

  } catch (error) {
    logger.error('LLMService: Failed to track cost/credits', {
      error: error.message,
      userId: request.userId,
      model: request.model,
    });
    // Don't fail the entire request if cost tracking fails
    // But consider alerting admins about this
  }

  return response;
}
```

### Edge Case Handling

**1. No Pricing Found**:
```typescript
// In CostCalculationService
if (!pricing) {
  logger.warn('No pricing found for model, using fallback', {
    modelId,
    providerId,
  });
  // Option 1: Use conservative fallback pricing
  // Option 2: Throw error and block request
  // Option 3: Proceed without cost tracking (log warning)
}
```

**2. Insufficient Credits**:
```typescript
// CreditService will throw error
// Handled by error middleware → return 402 Payment Required
```

**3. Provider Mismatch**:
```typescript
// If models.provider string doesn't match any providers.name
// Throw error and alert admins
```

---

## Admin API Endpoints

### Providers Endpoint

**Route**: `GET /admin/providers`

**Response**:
```json
{
  "providers": [
    {
      "id": "uuid",
      "name": "openai",
      "apiType": "openai",
      "isEnabled": true,
      "stats": {
        "totalRequests": 15420,
        "totalTokens": 52430000,
        "totalVendorCostUsd": 1247.89,
        "totalCreditsDeducted": 1622260,
        "totalGrossMarginUsd": 374.41,
        "avgMarginPercent": 30.0
      },
      "models": [
        {
          "modelName": "gpt-4o",
          "requests": 8520,
          "vendorCostUsd": 897.23
        }
      ]
    }
  ]
}
```

**Controller**:
```typescript
// backend/src/controllers/admin/providers.controller.ts
@injectable()
export class ProvidersController {
  async listProviders(req: Request, res: Response) {
    const providers = await this.prisma.provider.findMany({
      include: {
        _count: {
          select: { tokenUsageLedgers: true }
        }
      }
    });

    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const stats = await this.prisma.tokenUsageLedger.aggregate({
          where: { providerId: provider.id },
          _sum: {
            totalTokens: true,
            vendorCostUsd: true,
            creditsDeducted: true,
            grossMarginUsd: true,
          },
          _avg: {
            grossMarginPercent: true,
          },
          _count: true,
        });

        return {
          ...provider,
          stats: {
            totalRequests: stats._count,
            totalTokens: stats._sum.totalTokens || 0,
            totalVendorCostUsd: stats._sum.vendorCostUsd || 0,
            totalCreditsDeducted: stats._sum.creditsDeducted || 0,
            totalGrossMarginUsd: stats._sum.grossMarginUsd || 0,
            avgMarginPercent: stats._avg.grossMarginPercent || 0,
          },
        };
      })
    );

    res.json({ providers: providersWithStats });
  }
}
```

### Profitability Endpoint

**Route**: `GET /admin/profitability`

**Query Parameters**:
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `groupBy` (optional): 'tier' | 'provider' | 'model' | 'user'

**Response**:
```json
{
  "summary": {
    "totalRequests": 45230,
    "totalVendorCostUsd": 3425.67,
    "totalCreditsDeducted": 4453371,
    "totalGrossMarginUsd": 1027.70,
    "avgMarginPercent": 30.0,
    "unprofitableRequests": 12
  },
  "byTier": [
    {
      "tier": "free",
      "requests": 8520,
      "vendorCostUsd": 234.56,
      "grossMarginUsd": 117.28,
      "marginPercent": 50.0
    },
    {
      "tier": "pro",
      "requests": 24300,
      "vendorCostUsd": 2145.89,
      "grossMarginUsd": 643.77,
      "marginPercent": 30.0
    }
  ],
  "unprofitableModels": [
    {
      "modelId": "gpt-4o",
      "tier": "free",
      "avgMarginPercent": -5.2,
      "lossUsd": 23.45
    }
  ]
}
```

---

## Testing Strategy

### Unit Tests

**File**: `backend/tests/unit/services/cost-calculation.service.test.ts`

```typescript
describe('CostCalculationService', () => {
  it('should calculate vendor cost correctly', async () => {
    const cost = await costCalc.calculateCost(
      'gpt-4o',
      openaiProviderId,
      5000,  // input tokens
      1000   // output tokens
    );

    expect(cost.vendorCost).toBe(0.0225);
    expect(cost.inputCost).toBe(0.0125);
    expect(cost.outputCost).toBe(0.01);
  });

  it('should handle no pricing found gracefully', async () => {
    await expect(
      costCalc.calculateCost('unknown-model', 'unknown-provider', 1000, 1000)
    ).rejects.toThrow('No pricing found');
  });
});
```

### Integration Tests

**File**: `backend/tests/integration/llm-cost-flow.test.ts`

```typescript
describe('LLM Cost Calculation Flow', () => {
  it('should deduct credits based on vendor cost + margin', async () => {
    // 1. Create Pro user with 10,000 credits
    const user = await createTestUser({ tier: 'pro', credits: 10000 });

    // 2. Make completion request
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      });

    // 3. Verify credits deducted
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { creditBalance: true },
    });

    expect(updatedUser.creditBalance).toBeLessThan(10000);

    // 4. Verify token usage ledger
    const ledger = await prisma.tokenUsageLedger.findFirst({
      where: { userId: user.id },
    });

    expect(ledger).toBeDefined();
    expect(ledger.vendorCostUsd).toBeGreaterThan(0);
    expect(ledger.marginMultiplier).toBe(1.30); // Pro tier
    expect(ledger.grossMarginPercent).toBeCloseTo(30.0);
  });
});
```

### E2E Tests

**File**: `backend/tests/e2e/admin-profitability.test.ts`

```typescript
describe('Admin Profitability Dashboard', () => {
  it('should return profitability stats for admin', async () => {
    const admin = await createAdminUser();

    const response = await request(app)
      .get('/admin/profitability')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toBeDefined();
    expect(response.body.byTier).toBeInstanceOf(Array);
  });
});
```

---

## Success Criteria

### Phase 1: Research ✅
- [ ] Latest pricing documented for 10+ models from 5 providers
- [ ] Pricing verified against official vendor pricing pages
- [ ] Research document created with sources and verification dates

### Phase 2: Seeding ✅
- [ ] 5 providers seeded in database
- [ ] 10+ model pricing records seeded
- [ ] 6 pricing configs seeded (1 global + 5 tier-specific)
- [ ] Seed script runs without errors
- [ ] All data visible in Prisma Studio

### Phase 3: Integration ✅
- [ ] LLMService calls CostCalculationService after API requests
- [ ] Credits deducted based on vendor cost × margin
- [ ] Token usage logged to ledger with all required fields
- [ ] Edge cases handled (no pricing, insufficient credits)
- [ ] No TypeScript compilation errors

### Phase 4: Admin Endpoints ✅
- [ ] GET /admin/providers returns provider stats
- [ ] GET /admin/profitability returns tier-level margins
- [ ] Endpoints protected with admin authentication
- [ ] Response format matches spec

### Phase 5: Testing ✅
- [ ] Unit tests pass (cost calculation, pricing config)
- [ ] Integration tests pass (LLM flow → credits → ledger)
- [ ] E2E tests pass (admin endpoints)
- [ ] Test coverage >80% for new code
- [ ] All existing tests still pass

### Phase 6: Documentation ✅
- [ ] CLAUDE.md updated with provider system overview
- [ ] Implementation completion report created
- [ ] Admin pricing configuration guide documented
- [ ] Code committed to feature branch

---

## Rollout Plan

### Pre-Production Checklist

1. **Data Verification**:
   - Run seed script on development database
   - Verify 5 providers, 10+ pricing records, 6 configs
   - Test provider lookup for all seeded models

2. **Integration Testing**:
   - Make test API request with each tier (Free, Pro, Enterprise)
   - Verify credit deduction matches vendor cost × margin
   - Check token usage ledger for correct data

3. **Admin Dashboard**:
   - Test /admin/providers endpoint with real data
   - Test /admin/profitability endpoint with date ranges
   - Verify stats are accurate

4. **Performance**:
   - Benchmark cost calculation overhead (<10ms)
   - Verify database indexes are used (EXPLAIN ANALYZE)
   - Test with 1000 concurrent requests

### Production Rollout

**Phase 1: Shadow Mode** (Day 1-3)
- Deploy with feature flag `ENABLE_COST_TRACKING=false`
- Log cost calculations but don't deduct credits
- Monitor logs for errors or pricing mismatches

**Phase 2: Beta Testing** (Day 4-7)
- Enable for admin users only (`ENABLE_COST_TRACKING=admin`)
- Verify credit deductions match expectations
- Collect feedback on profitability metrics

**Phase 3: Full Rollout** (Day 8+)
- Enable for all users (`ENABLE_COST_TRACKING=true`)
- Monitor gross margin dashboard
- Set up alerts for negative margins

---

## Risk Mitigation

### Risk 1: Pricing Data Staleness

**Risk**: Vendor pricing changes after seeding, leading to incorrect cost calculations

**Mitigation**:
- Document pricing effective dates (November 2025)
- Build price change detection system (future phase)
- Monthly manual verification of vendor pricing
- Admin alert if margin drops below threshold

### Risk 2: Credit Deduction Failures

**Risk**: Cost calculation succeeds but credit deduction fails, user gets free API usage

**Mitigation**:
- Wrap in database transaction (atomic)
- Log all errors to monitoring system
- Alert admins if credit deduction failure rate >1%
- Consider pre-deduction (reserve credits before API call)

### Risk 3: Performance Overhead

**Risk**: Cost calculation adds latency to API requests

**Mitigation**:
- Optimize pricing lookup with database indexes
- Cache provider ID lookups (30-minute TTL)
- Async logging to token usage ledger (non-blocking)
- Benchmark: cost calculation should add <10ms

### Risk 4: Provider Mismatch

**Risk**: Models reference providers that don't exist in providers table

**Mitigation**:
- Seed all providers referenced in models table
- Add database constraint check (future: FK constraint)
- Alert admins if provider lookup fails
- Fallback to default provider if mismatch

### Risk 5: Negative Margins

**Risk**: Free tier users on expensive models generate negative margins

**Mitigation**:
- Set higher margins for Free tier (50%)
- Model-level tier restrictions (GPT-4o requires Pro+)
- Admin dashboard shows unprofitable models
- Consider blocking Free tier from premium models

---

## Next Steps After Completion

### Immediate Follow-Ups (1-2 weeks)

1. **Price Change Detection**:
   - Build scheduled job to fetch vendor pricing
   - Compare with current database pricing
   - Alert admins on ±10% changes

2. **Profitability Alerts**:
   - Alert when tier gross margin drops below target
   - Alert on negative margin requests
   - Daily profitability email to admins

3. **Admin UI Dashboard**:
   - Build React components for profitability charts
   - Provider comparison (OpenAI vs Anthropic costs)
   - Tier profitability trends over time

### Future Enhancements (1-3 months)

4. **Dynamic Pricing**:
   - Auto-adjust margins when vendor prices change
   - Predictive analytics for pricing impact
   - A/B testing different margin strategies

5. **Cost Optimization**:
   - Model routing (suggest cheaper models for simple tasks)
   - Prompt caching integration (Anthropic)
   - Batch request optimization

6. **User-Facing Features**:
   - Show estimated cost before request (in credits)
   - Cost breakdown in API response headers
   - Monthly cost report for users

---

## Appendix

### Key Files Modified

**Backend Services**:
- `backend/prisma/seed.ts` (add 3 seeding functions)
- `backend/src/services/llm.service.ts` (integrate cost calculation)
- `backend/src/controllers/admin/providers.controller.ts` (new)
- `backend/src/controllers/admin/profitability.controller.ts` (new)

**Backend Routes**:
- `backend/src/api/admin/providers.routes.ts` (new)
- `backend/src/api/admin/profitability.routes.ts` (new)
- `backend/src/server.ts` (register new routes)

**Tests**:
- `backend/tests/unit/services/cost-calculation.service.test.ts` (new)
- `backend/tests/integration/llm-cost-flow.test.ts` (new)
- `backend/tests/e2e/admin-profitability.test.ts` (new)

**Documentation**:
- `docs/research/082-vendor-pricing-november-2025.md` (new)
- `docs/progress/179-provider-pricing-activation-completion.md` (new)
- `CLAUDE.md` (updated)

### Database Schema Reference

**providers**:
- id (UUID, PK)
- name (VARCHAR(100), UNIQUE)
- api_type (VARCHAR(50))
- is_enabled (BOOLEAN)
- created_at, updated_at (TIMESTAMP)

**model_provider_pricing**:
- id (UUID, PK)
- provider_id (UUID, FK → providers)
- model_name (VARCHAR(255))
- input_price_per_1k (DECIMAL(10,8))
- output_price_per_1k (DECIMAL(10,8))
- cache_input_price_per_1k (DECIMAL(10,8), nullable)
- cache_hit_price_per_1k (DECIMAL(10,8), nullable)
- effective_from (TIMESTAMP)
- effective_until (TIMESTAMP, nullable)
- is_active (BOOLEAN)
- Unique: (provider_id, model_name, effective_from)

**pricing_configs**:
- id (UUID, PK)
- scope_type (ENUM: tier/provider/model/combination)
- subscription_tier (ENUM, nullable)
- provider_id (UUID, FK → providers, nullable)
- model_id (VARCHAR(255), nullable)
- margin_multiplier (DECIMAL(4,2))
- target_gross_margin_percent (DECIMAL(5,2))
- effective_from (TIMESTAMP)
- effective_until (TIMESTAMP, nullable)
- approval_status (ENUM: pending/approved/rejected)
- is_active (BOOLEAN)

**token_usage_ledger**:
- id (UUID, PK)
- user_id (UUID, FK → users)
- provider_id (UUID, FK → providers)
- model_id (VARCHAR(255))
- input_tokens (INT)
- output_tokens (INT)
- total_tokens (INT)
- vendor_cost_usd (DECIMAL(12,8))
- margin_multiplier (DECIMAL(4,2))
- credits_deducted (INT)
- gross_margin_usd (DECIMAL(12,8))
- gross_margin_percent (DECIMAL(5,2))
- request_type (ENUM)
- request_status (ENUM)
- created_at (TIMESTAMP)

---

## Approval & Sign-Off

**Plan Status**: ✅ Approved for Implementation

**Approved By**: User (2025-11-13)

**Target Start Date**: 2025-11-13

**Target Completion Date**: 2025-11-15 (3 days)

**Review Checkpoints**:
- [ ] Phase 1 Complete: Vendor pricing research (Day 1)
- [ ] Phase 2 Complete: Database seeding (Day 1-2)
- [ ] Phase 3 Complete: LLM integration (Day 2-3)
- [ ] Phase 4 Complete: Admin endpoints (Day 3)
- [ ] Phase 5 Complete: Testing (Day 4)
- [ ] Phase 6 Complete: Documentation & deployment (Day 5)

---

**End of Plan Document**
