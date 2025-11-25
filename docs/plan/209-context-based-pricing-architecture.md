# Plan 209: Context-Size-Based Pricing Architecture

## Overview

This document outlines the architecture changes required to support context-size-based pricing for LLM providers. Google Gemini and Anthropic models have different pricing tiers based on prompt context length (typically ≤200K vs >200K tokens).

## Requirements

### 1. Google Gemini Pricing (from temp_google_price.md)

| Model | Context | Input $/MTok | Output $/MTok | Cache Read $/MTok |
|-------|---------|--------------|---------------|-------------------|
| gemini-3-pro-preview | ≤200K | $2.00 | $12.00 | $0.20 |
| gemini-3-pro-preview | >200K | $4.00 | $18.00 | $0.40 |
| gemini-2.5-pro | ≤200K | $1.25 | $10.00 | $0.125 |
| gemini-2.5-pro | >200K | $2.50 | $15.00 | $0.25 |
| gemini-2.5-flash | All | $0.30 | $2.50 | $0.03 |
| gemini-2.5-flash-lite | All | $0.10 | $0.40 | $0.01 |

**Models to Remove (older than 2.5):**
- gemini-2.0-flash
- gemini-2.0-flash-lite

**Models to Add:**
- gemini-3-pro-preview
- gemini-2.5-flash (keep existing)
- gemini-2.5-flash-preview-09-2025
- gemini-2.5-flash-lite

### 2. Anthropic Pricing (from screenshot)

| Model | Context | Input $/MTok | Output $/MTok | Cache Write $/MTok | Cache Read $/MTok |
|-------|---------|--------------|---------------|--------------------|--------------------|
| claude-opus-4.5 | All | $5.00 | $25.00 | $6.25 | $0.50 |
| claude-sonnet-4.5 | ≤200K | $3.00 | $15.00 | $3.75 | $0.30 |
| claude-sonnet-4.5 | >200K | $6.00 | $22.50 | $7.50 | $0.60 |
| claude-haiku-4.5 | All | $1.00 | $5.00 | $1.25 | $0.10 |

**Models to Remove:**
- claude-opus-4.1 (rename to claude-opus-4.5)
- claude-3-5-sonnet (legacy)
- Any other older Anthropic models

**Models to Keep (only 3):**
- claude-opus-4.5 (renamed from opus-4.1)
- claude-sonnet-4.5
- claude-haiku-4.5

### 3. xAI (Grok) Pricing

| Model | Context | Input $/MTok | Output $/MTok |
|-------|---------|--------------|---------------|
| grok-4-1-fast-reasoning | ≤128K | $0.20 | $0.50 |
| grok-4-1-fast-reasoning | >128K | $0.40 | $1.00 |
| grok-4-1-fast-non-reasoning | ≤128K | $0.20 | $0.50 |
| grok-4-1-fast-non-reasoning | >128K | $0.40 | $1.00 |
| grok-code-fast-1 | ≤128K | $0.20 | $1.50 |
| grok-code-fast-1 | >128K | $0.40 | $3.00 |
| grok-4-0709 | ≤128K | $3.00 | $15.00 |
| grok-4-0709 | >128K | $6.00 | $30.00 |

**Key Notes:**
- **128K token threshold** (vs 200K for Anthropic/Google)
- High context pricing is **exactly 2x** the base price for all models
- No cache pricing (xAI does not support prompt caching)

**Models (4 total):**
- grok-4-1-fast-reasoning (with reasoning)
- grok-4-1-fast-non-reasoning (without reasoning)
- grok-code-fast-1 (specialized for coding)
- grok-4-0709 (premium flagship model)

## Database Schema Changes

### model_provider_pricing Table

Add new columns to support context-threshold pricing:

```sql
ALTER TABLE model_provider_pricing ADD COLUMN context_threshold_tokens INT DEFAULT NULL;
ALTER TABLE model_provider_pricing ADD COLUMN input_price_per_1k_high_context DECIMAL(10,8) DEFAULT NULL;
ALTER TABLE model_provider_pricing ADD COLUMN output_price_per_1k_high_context DECIMAL(10,8) DEFAULT NULL;
ALTER TABLE model_provider_pricing ADD COLUMN cache_write_price_per_1k_high_context DECIMAL(10,8) DEFAULT NULL;
ALTER TABLE model_provider_pricing ADD COLUMN cache_read_price_per_1k_high_context DECIMAL(10,8) DEFAULT NULL;
```

### Schema Explanation

| Field | Type | Description |
|-------|------|-------------|
| `context_threshold_tokens` | INT | Token count threshold (e.g., 200000). NULL = single-tier pricing |
| `input_price_per_1k_high_context` | Decimal | Input price when tokens > threshold |
| `output_price_per_1k_high_context` | Decimal | Output price when tokens > threshold |
| `cache_write_price_per_1k_high_context` | Decimal | Cache write price when tokens > threshold |
| `cache_read_price_per_1k_high_context` | Decimal | Cache read price when tokens > threshold |

### Pricing Logic

```typescript
function getEffectivePrice(pricing: VendorPricing, inputTokens: number): EffectivePricing {
  const isHighContext = pricing.contextThresholdTokens
    && inputTokens > pricing.contextThresholdTokens;

  return {
    inputPricePer1k: isHighContext
      ? pricing.inputPricePer1kHighContext
      : pricing.inputPricePer1k,
    outputPricePer1k: isHighContext
      ? pricing.outputPricePer1kHighContext
      : pricing.outputPricePer1k,
    cacheWritePricePer1k: isHighContext
      ? pricing.cacheWritePricePer1kHighContext
      : pricing.cacheWritePricePer1k,
    cacheReadPricePer1k: isHighContext
      ? pricing.cacheReadPricePer1kHighContext
      : pricing.cacheReadPricePer1k,
  };
}
```

## Interface Changes

### VendorPricing Interface (cost-calculation.interface.ts)

```typescript
export interface VendorPricing {
  id: string;
  providerId: string;
  modelName: string;

  // Base pricing (≤ context threshold or single-tier)
  inputPricePer1k: number;
  outputPricePer1k: number;
  cacheWritePricePer1k?: number;
  cacheReadPricePer1k?: number;

  // Context-based pricing (Plan 209)
  contextThresholdTokens?: number;           // e.g., 200000 for 200K
  inputPricePer1kHighContext?: number;       // Price when > threshold
  outputPricePer1kHighContext?: number;
  cacheWritePricePer1kHighContext?: number;
  cacheReadPricePer1kHighContext?: number;

  // Legacy fields (deprecated)
  cacheInputPricePer1k?: number;
  cacheHitPricePer1k?: number;

  effectiveFrom: Date;
  effectiveUntil?: Date;
  isActive: boolean;
}
```

## Service Layer Changes

### CostCalculationService

Update `getVendorPricing` to return context-threshold pricing:

```typescript
async getVendorPricing(
  modelId: string,
  providerId: string,
  effectiveDate: Date = new Date()
): Promise<VendorPricing | null> {
  // Query now includes high-context pricing fields
  const pricing = await this.prisma.$queryRaw<any[]>`
    SELECT
      id,
      provider_id as "providerId",
      model_name as "modelName",
      input_price_per_1k as "inputPricePer1k",
      output_price_per_1k as "outputPricePer1k",
      cache_input_price_per_1k as "cacheWritePricePer1k",
      cache_hit_price_per_1k as "cacheReadPricePer1k",
      context_threshold_tokens as "contextThresholdTokens",
      input_price_per_1k_high_context as "inputPricePer1kHighContext",
      output_price_per_1k_high_context as "outputPricePer1kHighContext",
      cache_write_price_per_1k_high_context as "cacheWritePricePer1kHighContext",
      cache_read_price_per_1k_high_context as "cacheReadPricePer1kHighContext",
      effective_from as "effectiveFrom",
      effective_until as "effectiveUntil",
      is_active as "isActive"
    FROM model_provider_pricing
    WHERE ...
  `;
  // ... rest of implementation
}
```

Update `calculateVendorCost` to use context-aware pricing:

```typescript
async calculateVendorCost(usage: TokenUsage): Promise<CostCalculation> {
  const pricing = await this.getVendorPricing(usage.modelId, usage.providerId);

  // Determine effective pricing based on input tokens
  const isHighContext = pricing.contextThresholdTokens
    && usage.inputTokens > pricing.contextThresholdTokens;

  const effectiveInputPrice = isHighContext
    ? (pricing.inputPricePer1kHighContext ?? pricing.inputPricePer1k)
    : pricing.inputPricePer1k;

  const effectiveOutputPrice = isHighContext
    ? (pricing.outputPricePer1kHighContext ?? pricing.outputPricePer1k)
    : pricing.outputPricePer1k;

  // Calculate costs using effective prices
  // ... rest of implementation
}
```

## Seed Data Changes

### Models to Create/Update

#### Anthropic Models (3 total)

1. **claude-opus-4.5** (rename from claude-opus-4.1)
   - Input: $5.00/MTok, Output: $25.00/MTok
   - Cache Write: $6.25/MTok, Cache Read: $0.50/MTok
   - No context threshold (single-tier pricing)

2. **claude-sonnet-4.5** (update pricing)
   - Base (≤200K): Input $3.00, Output $15.00
   - High Context (>200K): Input $6.00, Output $22.50
   - Cache Write Base: $3.75, High: $7.50
   - Cache Read Base: $0.30, High: $0.60
   - Context Threshold: 200,000 tokens

3. **claude-haiku-4.5** (update pricing)
   - Input: $1.00/MTok, Output: $5.00/MTok
   - Cache Write: $1.25/MTok, Cache Read: $0.10/MTok
   - No context threshold

#### Google Gemini Models (5 total)

1. **gemini-3-pro-preview** (NEW)
   - Base (≤200K): Input $2.00, Output $12.00
   - High Context (>200K): Input $4.00, Output $18.00
   - Cache Read Base: $0.20, High: $0.40
   - Context Threshold: 200,000 tokens

2. **gemini-2.5-pro** (update)
   - Base (≤200K): Input $1.25, Output $10.00
   - High Context (>200K): Input $2.50, Output $15.00
   - Cache Read Base: $0.125, High: $0.25
   - Context Threshold: 200,000 tokens

3. **gemini-2.5-flash** (update/add)
   - Input: $0.30/MTok, Output: $2.50/MTok
   - Cache Read: $0.03/MTok
   - No context threshold

4. **gemini-2.5-flash-preview** (NEW)
   - Same pricing as gemini-2.5-flash

5. **gemini-2.5-flash-lite** (update)
   - Input: $0.10/MTok, Output: $0.40/MTok
   - Cache Read: $0.01/MTok
   - No context threshold

#### xAI Models (4 total)

1. **grok-4-1-fast-reasoning** (NEW/RENAME from grok-4-fast)
   - Base (≤128K): Input $0.20, Output $0.50
   - High Context (>128K): Input $0.40, Output $1.00
   - Context Threshold: 128,000 tokens

2. **grok-4-1-fast-non-reasoning** (NEW)
   - Base (≤128K): Input $0.20, Output $0.50
   - High Context (>128K): Input $0.40, Output $1.00
   - Context Threshold: 128,000 tokens

3. **grok-code-fast-1** (update pricing)
   - Base (≤128K): Input $0.20, Output $1.50
   - High Context (>128K): Input $0.40, Output $3.00
   - Context Threshold: 128,000 tokens

4. **grok-4-0709** (update pricing)
   - Base (≤128K): Input $3.00, Output $15.00
   - High Context (>128K): Input $6.00, Output $30.00
   - Context Threshold: 128,000 tokens

### Models to Remove

- claude-opus-4.1 (renaming to claude-opus-4.5)
- claude-3-5-sonnet (legacy)
- gemini-2.0-flash
- gemini-2.0-flash-lite

## Migration Plan

1. Create Prisma migration for new columns
2. Update VendorPricing interface
3. Update CostCalculationService
4. Update seed data with new models and pricing
5. Run migration and seed
6. Verify with test queries

## Files to Modify

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add 5 new columns to model_provider_pricing |
| `backend/src/interfaces/services/cost-calculation.interface.ts` | Update VendorPricing interface |
| `backend/src/services/cost-calculation.service.ts` | Add context-aware pricing logic |
| `backend/prisma/seed.ts` | Update models and pricing data |

## Verification

After implementation:
1. Query pricing for claude-sonnet-4.5 with 100K tokens → should get $3.00 input rate
2. Query pricing for claude-sonnet-4.5 with 300K tokens → should get $6.00 input rate
3. Query pricing for gemini-2.5-pro with 150K tokens → should get $1.25 input rate
4. Query pricing for gemini-2.5-pro with 250K tokens → should get $2.50 input rate
5. Query pricing for grok-4-1-fast-reasoning with 100K tokens → should get $0.20 input rate
6. Query pricing for grok-4-1-fast-reasoning with 150K tokens → should get $0.40 input rate (>128K)
7. Query pricing for grok-4-0709 with 100K tokens → should get $3.00 input rate
8. Query pricing for grok-4-0709 with 200K tokens → should get $6.00 input rate (>128K)

## References

- temp_google_price.md - Google Gemini pricing documentation
- Anthropic pricing screenshot - November 2025 pricing
- Plan 207 - Prompt Caching Implementation
- Plan 161 - Provider Pricing System
