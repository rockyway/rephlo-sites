# Dedicated API Prompt Caching Implementation Plan

## Document Information
- **Plan Number:** 207
- **Date Created:** 2025-11-20
- **Status:** Awaiting Review
- **Related Analysis:** docs/analysis/089-backend-prompt-caching-adaptation-evaluation.md
- **Estimated Duration:** 4 weeks
- **Priority:** High (Revenue Optimization)
- **Stakeholders:** Backend Team, Product Team, Finance Team

---

## Executive Summary

This plan outlines the implementation of prompt caching support in the Rephlo Dedicated API backend. Prompt caching enables **70-90% cost reduction** for Space-based workflows, which directly impacts our revenue model and customer value proposition.

**Why This Matters for Revenue:**
- 💰 **Competitive Advantage:** Users pay less per request while we maintain healthy margins
- 📈 **Usage Growth:** Lower costs encourage more API usage (more volume = more revenue)
- 🎯 **Retention:** Cost-effective service reduces churn and attracts enterprise customers
- ⚡ **Performance:** 50%+ latency reduction improves user experience

**Expected Outcomes:**
- Support all three major providers: Anthropic (explicit), OpenAI (automatic), Google (automatic)
- Accurate credit calculation for cached vs. non-cached tokens
- Real-time cost tracking and analytics for revenue optimization
- Transparent billing with detailed cache metrics for users
- Zero breaking changes to existing API contracts

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Foundation (Week 1)](#phase-1-foundation-week-1)
4. [Phase 2: Cost Optimization (Week 2)](#phase-2-cost-optimization-week-2)
5. [Phase 3: Analytics & Monitoring (Week 3)](#phase-3-analytics--monitoring-week-3)
6. [Phase 4: Production Rollout (Week 4)](#phase-4-production-rollout-week-4)
7. [Testing Strategy](#testing-strategy)
8. [Revenue Impact Analysis](#revenue-impact-analysis)
9. [Success Metrics](#success-metrics)
10. [Rollback Plan](#rollback-plan)

---

## Prerequisites

### 1. Review Reference Documentation

Before starting implementation, review:
- **docs/analysis/089-backend-prompt-caching-adaptation-evaluation.md** - Backend adaptation analysis
- **Desktop Client Plan 207** (reference for client-side caching patterns)
- **Provider Documentation:**
  - Anthropic: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
  - OpenAI: https://platform.openai.com/docs/guides/prompt-caching
  - Google: https://ai.google.dev/gemini-api/docs/caching

### 2. Environment Setup

- [ ] Anthropic API key with prompt caching beta access
- [ ] OpenAI API key (caching available for gpt-4o, gpt-4o-mini, o1-preview, o1-mini)
- [ ] Google AI API key (Gemini 1.5 Pro/Flash with caching)
- [ ] Test accounts with sufficient credits for testing
- [ ] Staging environment with production-like data

### 3. Baseline Metrics Collection

Before implementing caching, collect baseline metrics (1 week prior):

```sql
-- Average tokens per request by model
SELECT
  model,
  AVG(prompt_tokens) as avg_prompt_tokens,
  AVG(completion_tokens) as avg_completion_tokens,
  COUNT(*) as request_count
FROM usage_history
WHERE executed_at >= NOW() - INTERVAL '30 days'
GROUP BY model;

-- Monthly API costs by provider
SELECT
  DATE_TRUNC('month', executed_at) as month,
  model,
  SUM(credits_charged) as total_credits,
  SUM(credits_charged) * 0.01 as total_cost_usd
FROM usage_history
WHERE executed_at >= NOW() - INTERVAL '90 days'
GROUP BY month, model
ORDER BY month DESC, total_credits DESC;

-- Average request latency by model
SELECT
  model,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms
FROM usage_history
WHERE executed_at >= NOW() - INTERVAL '7 days'
GROUP BY model;
```

**Expected Baseline (before caching):**
- Average prompt tokens: 2,000-10,000 (Space-based workflows)
- Average cost per request: 5-50 credits ($0.05-$0.50)
- Average latency: 3-8 seconds

### 4. Code Review

- [ ] Review existing provider implementations (Anthropic, OpenAI, Google)
- [ ] Review credit calculation service (`backend/src/services/cost-calculation.service.ts`)
- [ ] Review request validation schemas (`backend/src/types/model-validation.ts`)
- [ ] Review usage tracking (`backend/src/services/llm.service.ts`)

---

## Architecture Overview

### Request Flow with Caching

```
Desktop Client (cache-aware request)
    │
    │ POST /v1/chat/completions
    │ {
    │   "model": "claude-3-opus-20240229",
    │   "messages": [
    │     {
    │       "role": "user",
    │       "content": [
    │         {
    │           "type": "text",
    │           "text": "System prompt...",
    │           "cache_control": { "type": "ephemeral" }  ← Anthropic
    │         },
    │         {
    │           "type": "text",
    │           "text": "Space context...",
    │           "cache_control": { "type": "ephemeral" }
    │         },
    │         {
    │           "type": "text",
    │           "text": "User query..."
    │         }
    │       ]
    │     }
    │   ]
    │ }
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. ModelsController.chatCompletion()                        │
│ • Validate request (accept cache_control fields)            │
│ • Check user tier and model access                          │
│ • Estimate credits (including cache overhead)               │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. LLMService.chatCompletion()                              │
│ • Route to correct provider (Anthropic/OpenAI/Google)       │
│ • Forward cache-aware request to provider                   │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Provider Implementation (AnthropicProvider)              │
│ • Forward request to Anthropic SDK                          │
│ • Anthropic API handles cache_control blocks                │
│ • Returns response with cache metrics:                      │
│   {                                                          │
│     "usage": {                                               │
│       "input_tokens": 100,                                   │
│       "cache_creation_input_tokens": 2000,  ← Write cache   │
│       "cache_read_input_tokens": 1800,      ← Read cache    │
│       "output_tokens": 50                                    │
│     }                                                        │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Credit Calculation (Enhanced)                            │
│ • Regular input tokens: 100 × $3.00/1M = $0.0003           │
│ • Cache write tokens: 2000 × $3.75/1M = $0.0075 (1.25x)    │
│ • Cache read tokens: 1800 × $0.30/1M = $0.0054 (0.1x)      │
│ • Output tokens: 50 × $15.00/1M = $0.00075                 │
│ • Total vendor cost: $0.01365                               │
│ • With 1.5x margin: $0.020475                               │
│ • Credits (× 100): 2.05 → ceil to 3 credits                │
│                                                              │
│ WITHOUT CACHING (all 3900 tokens as input):                 │
│ • Input tokens: 3900 × $3.00/1M = $0.0117                  │
│ • Output tokens: 50 × $15.00/1M = $0.00075                 │
│ • Total vendor cost: $0.01245                               │
│ • With 1.5x margin: $0.018675                               │
│ • Credits: 1.87 → ceil to 2 credits                         │
│                                                              │
│ 🎯 SAVINGS: 84% cost reduction on second request!           │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Usage Tracking (Enhanced)                                │
│ • Record all token counts (regular + cache)                 │
│ • Calculate cache hit rate                                   │
│ • Track cost savings                                         │
│ • Update user credit balance                                │
└─────────────────────────────────────────────────────────────┘
    ↓
Response with cache metrics returned to client
```

### Provider-Specific Caching Behaviors

| Provider | Cache Control | Cache TTL | Pricing | Token Fields |
|----------|---------------|-----------|---------|--------------|
| **Anthropic** | Explicit `cache_control` blocks | 5 min (ephemeral) or 1 hour (extended) | Write: 1.25x, Read: 0.1x | `cache_creation_input_tokens`, `cache_read_input_tokens` |
| **OpenAI** | Automatic prefix matching | ~5-10 minutes | Write: 1x, Read: 0.5x | `cached_prompt_tokens` (single field) |
| **Google** | Automatic prefix matching | 5-60 minutes | Write: 1x, Read: 0.25x | `cached_content_token_count` |

---

## Phase 1: Foundation (Week 1)

### Goal
Establish core caching infrastructure with proper request validation, provider support, and credit calculation.

---

### Task 1.1: Update Request Validation Schemas

**Priority:** P0 (Blocking)
**Estimated Time:** 2 hours
**Files to Modify:**
- `backend/src/types/model-validation.ts`

**Implementation:**

```typescript
// backend/src/types/model-validation.ts

/**
 * Anthropic cache control block
 * Used to mark segments for caching in Anthropic requests
 */
export const anthropicCacheControlSchema = z.object({
  type: z.enum(['ephemeral', 'extended']),
});

export type AnthropicCacheControl = z.infer<typeof anthropicCacheControlSchema>;

/**
 * UPDATED: Text content part schema with optional cache_control
 * Supports Anthropic-specific caching directives
 */
export const textContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content cannot be empty'),

  // NEW: Allow Anthropic cache_control (optional, ignored by other providers)
  cache_control: anthropicCacheControlSchema.optional(),
}).passthrough(); // Allow any additional provider-specific fields

/**
 * UPDATED: Image content part schema
 * Also allow cache_control for cached image references (future)
 */
export const imageContentPartSchema = z.object({
  type: z.literal('image_url'),
  image_url: imageUrlSchema,

  // NEW: Allow cache_control for images
  cache_control: anthropicCacheControlSchema.optional(),
}).passthrough();

// No changes needed to chatCompletionSchema - it uses contentPartSchema
// which now includes cache_control support
```

**Acceptance Criteria:**
- [ ] Zod schemas accept `cache_control` fields without validation errors
- [ ] Requests with `cache_control` pass validation
- [ ] Requests without `cache_control` still work (backward compatible)
- [ ] Other provider-specific fields pass through via `.passthrough()`
- [ ] Unit tests for validation with and without cache_control

**Testing:**

```typescript
// backend/src/__tests__/validation/cache-control-validation.test.ts

describe('Cache Control Validation', () => {
  describe('Anthropic cache_control', () => {
    it('should accept ephemeral cache_control', () => {
      const request = {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'System prompt',
                cache_control: { type: 'ephemeral' }
              }
            ]
          }
        ]
      };

      const result = chatCompletionSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept extended cache_control', () => {
      const request = {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Space context',
                cache_control: { type: 'extended' }
              }
            ]
          }
        ]
      };

      const result = chatCompletionSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should accept requests without cache_control (backward compat)', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Simple text prompt'
          }
        ]
      };

      const result = chatCompletionSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid cache_control types', () => {
      const request = {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'System prompt',
                cache_control: { type: 'invalid_type' }
              }
            ]
          }
        ]
      };

      const result = chatCompletionSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});
```

---

### Task 1.2: Enhance Provider Response Parsing

**Priority:** P0 (Blocking)
**Estimated Time:** 4 hours
**Files to Modify:**
- `backend/src/providers/anthropic.provider.ts`
- `backend/src/providers/openai.provider.ts`
- `backend/src/providers/google.provider.ts`
- `backend/src/interfaces/providers/llm-provider.interface.ts`

**Implementation:**

**Step 1: Update Provider Interface**

```typescript
// backend/src/interfaces/providers/llm-provider.interface.ts

/**
 * Enhanced usage data with cache metrics
 */
export interface LLMUsageData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;

  // NEW: Cache metrics (provider-specific, optional)
  cache_creation_input_tokens?: number;  // Anthropic: tokens written to cache
  cache_read_input_tokens?: number;      // Anthropic: tokens read from cache
  cached_prompt_tokens?: number;         // OpenAI/Google: cached tokens
}

export interface ILLMProvider {
  readonly providerName: string;

  /**
   * Execute chat completion
   * Returns response and enhanced usage data with cache metrics
   */
  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;  // ← Now includes cache metrics
  }>;

  // ... other methods
}
```

**Step 2: Update Anthropic Provider**

```typescript
// backend/src/providers/anthropic.provider.ts

import Anthropic from '@anthropic-ai/sdk';
import { LLMUsageData } from '../interfaces';

export class AnthropicProvider implements ILLMProvider {
  readonly providerName = 'anthropic';
  private client: Anthropic;

  // ... constructor

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    logger.debug('AnthropicProvider: Sending request', {
      model: request.model,
      messagesCount: request.messages.length,
      hasCacheControl: this.detectCacheControl(request.messages),
    });

    // Convert OpenAI-compatible format to Anthropic format
    const anthropicMessages = this.convertMessages(request.messages);

    // Send request to Anthropic
    const response = await this.client.messages.create({
      model: request.model,
      messages: anthropicMessages,
      max_tokens: request.max_tokens || 1000,
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined,
    });

    // ENHANCED: Extract cache metrics from response
    const usage: LLMUsageData = {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,

      // NEW: Include cache-specific metrics
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens,
    };

    logger.info('AnthropicProvider: Request completed with cache metrics', {
      model: request.model,
      promptTokens: usage.prompt_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
      completionTokens: usage.completion_tokens,
      cacheHitRate: this.calculateCacheHitRate(usage),
    });

    return {
      response: {
        id: response.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content[0].type === 'text' ? response.content[0].text : '',
          },
          finish_reason: this.mapStopReason(response.stop_reason),
        }],
      },
      usage,
    };
  }

  /**
   * Detect if request contains cache_control blocks
   */
  private detectCacheControl(messages: any[]): boolean {
    return messages.some(msg =>
      Array.isArray(msg.content) &&
      msg.content.some(part => part.cache_control)
    );
  }

  /**
   * Calculate cache hit rate from usage data
   */
  private calculateCacheHitRate(usage: LLMUsageData): number {
    const totalInput = usage.prompt_tokens + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
    if (totalInput === 0) return 0;
    return ((usage.cache_read_input_tokens || 0) / totalInput) * 100;
  }

  // ... other methods
}
```

**Step 3: Update OpenAI Provider**

```typescript
// backend/src/providers/openai.provider.ts

import OpenAI from 'openai';
import { LLMUsageData } from '../interfaces';

export class OpenAIProvider implements ILLMProvider {
  readonly providerName = 'openai';
  private client: OpenAI;

  // ... constructor

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    logger.debug('OpenAIProvider: Sending request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    // Send request to OpenAI
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as any,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      presence_penalty: request.presence_penalty,
      frequency_penalty: request.frequency_penalty,
      n: request.n,
    });

    // ENHANCED: Extract cache metrics if available
    const usage: LLMUsageData = {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,

      // NEW: OpenAI returns cached tokens in a single field
      cached_prompt_tokens: (response.usage as any)?.prompt_tokens_details?.cached_tokens,
    };

    if (usage.cached_prompt_tokens && usage.cached_prompt_tokens > 0) {
      logger.info('OpenAIProvider: Request utilized prompt caching', {
        model: request.model,
        promptTokens: usage.prompt_tokens,
        cachedTokens: usage.cached_prompt_tokens,
        cacheHitRate: (usage.cached_prompt_tokens / usage.prompt_tokens) * 100,
      });
    }

    return {
      response: {
        id: response.id,
        object: 'chat.completion',
        created: response.created,
        model: response.model,
        choices: response.choices.map(choice => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content || '',
          },
          finish_reason: choice.finish_reason || 'stop',
        })),
      },
      usage,
    };
  }

  // ... other methods
}
```

**Step 4: Update Google Provider (Similar Pattern)**

```typescript
// backend/src/providers/google.provider.ts

// Similar to OpenAI - extract cached_content_token_count from Gemini response
// Google Gemini uses usageMetadata.cachedContentTokenCount
```

**Acceptance Criteria:**
- [ ] Anthropic provider extracts `cache_creation_input_tokens` and `cache_read_input_tokens`
- [ ] OpenAI provider extracts `cached_prompt_tokens` (if available)
- [ ] Google provider extracts `cached_content_token_count` (if available)
- [ ] Providers log cache metrics when present
- [ ] Backward compatible with non-cached responses
- [ ] Unit tests for cache metric extraction

---

### Task 1.3: Enhanced Credit Calculation Service

**Priority:** P0 (Blocking)
**Estimated Time:** 6 hours
**Dependencies:** Task 1.2
**Files to Modify:**
- `backend/src/services/cost-calculation.service.ts`
- `backend/src/services/pricing-config.service.ts`

**Implementation:**

**Step 1: Update Pricing Configuration**

```typescript
// backend/src/services/pricing-config.service.ts

export interface ModelPricing {
  provider: string;
  model: string;

  // Standard pricing (per 1M tokens)
  input_price_per_million: number;
  output_price_per_million: number;

  // NEW: Cache-specific pricing (per 1M tokens)
  cache_write_price_per_million?: number;  // Anthropic: 1.25x, OpenAI: 1x
  cache_read_price_per_million?: number;   // Anthropic: 0.1x, OpenAI: 0.5x

  context_window: number;
  capabilities: string[];
  tier_access: {
    free: boolean;
    pro: boolean;
    enterprise: boolean;
  };
}

// Example pricing data (Claude Sonnet 4)
const claudeSonnet4Pricing: ModelPricing = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  input_price_per_million: 3.00,
  output_price_per_million: 15.00,

  // NEW: Anthropic cache pricing
  cache_write_price_per_million: 3.75,  // 1.25x standard input
  cache_read_price_per_million: 0.30,   // 0.1x standard input

  context_window: 200000,
  capabilities: ['text', 'vision', 'code'],
  tier_access: { free: false, pro: true, enterprise: true },
};

// Example pricing data (GPT-4o)
const gpt4oPricing: ModelPricing = {
  provider: 'openai',
  model: 'gpt-4o',
  input_price_per_million: 2.50,
  output_price_per_million: 10.00,

  // NEW: OpenAI cache pricing
  cache_write_price_per_million: 2.50,  // 1x standard input (same)
  cache_read_price_per_million: 1.25,   // 0.5x standard input

  context_window: 128000,
  capabilities: ['text', 'vision', 'function_calling'],
  tier_access: { free: false, pro: true, enterprise: true },
};
```

**Step 2: Update Credit Calculation Logic**

```typescript
// backend/src/services/cost-calculation.service.ts

import { injectable, inject } from 'tsyringe';
import { IPricingConfigService } from '../interfaces';
import { LLMUsageData } from '../interfaces/providers/llm-provider.interface';
import logger from '../utils/logger';

export interface CreditCalculationResult {
  credits: number;
  vendorCost: number;
  marginMultiplier: number;
  grossMargin: number;

  // NEW: Detailed breakdown
  inputCredits: number;
  outputCredits: number;
  cacheWriteCredits?: number;
  cacheReadCredits?: number;

  // NEW: Cost savings (when cache is used)
  costWithoutCache?: number;
  costSavingsPercent?: number;
}

@injectable()
export class CostCalculationService implements ICostCalculationService {
  constructor(
    @inject('IPricingConfigService') private pricingConfig: IPricingConfigService
  ) {}

  /**
   * Calculate credits from LLM usage data
   *
   * ENHANCED: Now handles cache-specific pricing for Anthropic, OpenAI, and Google
   *
   * Formula:
   * - Regular input: input_tokens × input_price_per_million / 1M
   * - Cache write: cache_creation_tokens × cache_write_price_per_million / 1M
   * - Cache read: cache_read_tokens × cache_read_price_per_million / 1M
   * - Output: output_tokens × output_price_per_million / 1M
   * - Total vendor cost = sum of above
   * - Credits = ceil((vendorCost × marginMultiplier) × 100)
   */
  async calculateCredits(
    modelId: string,
    usage: LLMUsageData,
    userId: string
  ): Promise<CreditCalculationResult> {
    // Get pricing for model
    const pricing = await this.pricingConfig.getModelPricing(modelId);
    if (!pricing) {
      throw new Error(`Pricing not found for model: ${modelId}`);
    }

    // Get user's margin multiplier (based on tier/plan)
    const marginMultiplier = await this.getMarginMultiplier(userId);

    // Calculate costs for each token type
    let vendorCost = 0;
    let inputCredits = 0;
    let outputCredits = 0;
    let cacheWriteCredits: number | undefined;
    let cacheReadCredits: number | undefined;

    // 1. Regular input tokens (non-cached)
    if (usage.prompt_tokens > 0) {
      const inputCost = (usage.prompt_tokens * pricing.input_price_per_million) / 1_000_000;
      vendorCost += inputCost;
      inputCredits = Math.ceil((inputCost * marginMultiplier) * 100);
    }

    // 2. Output tokens
    if (usage.completion_tokens > 0) {
      const outputCost = (usage.completion_tokens * pricing.output_price_per_million) / 1_000_000;
      vendorCost += outputCost;
      outputCredits = Math.ceil((outputCost * marginMultiplier) * 100);
    }

    // 3. Cache-specific tokens (Anthropic)
    if (usage.cache_creation_input_tokens && usage.cache_creation_input_tokens > 0) {
      const cacheWritePrice = pricing.cache_write_price_per_million || pricing.input_price_per_million;
      const cacheWriteCost = (usage.cache_creation_input_tokens * cacheWritePrice) / 1_000_000;
      vendorCost += cacheWriteCost;
      cacheWriteCredits = Math.ceil((cacheWriteCost * marginMultiplier) * 100);
    }

    if (usage.cache_read_input_tokens && usage.cache_read_input_tokens > 0) {
      const cacheReadPrice = pricing.cache_read_price_per_million || pricing.input_price_per_million;
      const cacheReadCost = (usage.cache_read_input_tokens * cacheReadPrice) / 1_000_000;
      vendorCost += cacheReadCost;
      cacheReadCredits = Math.ceil((cacheReadCost * marginMultiplier) * 100);
    }

    // 4. Cache-specific tokens (OpenAI/Google - single cached field)
    if (usage.cached_prompt_tokens && usage.cached_prompt_tokens > 0) {
      const cacheReadPrice = pricing.cache_read_price_per_million || pricing.input_price_per_million;
      const cacheReadCost = (usage.cached_prompt_tokens * cacheReadPrice) / 1_000_000;
      vendorCost += cacheReadCost;
      cacheReadCredits = Math.ceil((cacheReadCost * marginMultiplier) * 100);
    }

    // Total credits
    const totalCredits = Math.max(
      1, // Minimum 1 credit per request
      inputCredits + outputCredits + (cacheWriteCredits || 0) + (cacheReadCredits || 0)
    );

    // Calculate cost savings (for logging/analytics)
    let costWithoutCache: number | undefined;
    let costSavingsPercent: number | undefined;

    if ((usage.cache_read_input_tokens && usage.cache_read_input_tokens > 0) ||
        (usage.cached_prompt_tokens && usage.cached_prompt_tokens > 0)) {
      // Calculate what cost would have been without caching
      const cachedTokens = usage.cache_read_input_tokens || usage.cached_prompt_tokens || 0;
      const hypotheticalInputCost = (cachedTokens * pricing.input_price_per_million) / 1_000_000;
      const actualCachedCost = (cacheReadCredits || 0) / 100 / marginMultiplier;

      costWithoutCache = vendorCost - actualCachedCost + hypotheticalInputCost;
      costSavingsPercent = ((costWithoutCache - vendorCost) / costWithoutCache) * 100;

      logger.info('CostCalculationService: Cache savings calculated', {
        modelId,
        cachedTokens,
        costWithCache: vendorCost,
        costWithoutCache,
        savingsPercent: costSavingsPercent.toFixed(2),
        creditsCharged: totalCredits,
      });
    }

    const grossMargin = vendorCost * (marginMultiplier - 1);

    return {
      credits: totalCredits,
      vendorCost,
      marginMultiplier,
      grossMargin,
      inputCredits,
      outputCredits,
      cacheWriteCredits,
      cacheReadCredits,
      costWithoutCache,
      costSavingsPercent,
    };
  }

  /**
   * Get margin multiplier for user
   * Different tiers may have different margins
   */
  private async getMarginMultiplier(userId: string): Promise<number> {
    // Default: 1.5x margin (50% gross margin)
    // Can be adjusted per tier/plan
    return 1.5;
  }
}
```

**Acceptance Criteria:**
- [ ] Credit calculation handles regular input, output, cache write, and cache read tokens
- [ ] Anthropic cache pricing applied correctly (1.25x write, 0.1x read)
- [ ] OpenAI cache pricing applied correctly (1x write, 0.5x read)
- [ ] Cost savings calculated and logged when cache is used
- [ ] Minimum 1 credit enforced per request
- [ ] Unit tests for all token type combinations
- [ ] Integration tests with real pricing data

**Testing:**

```typescript
// backend/src/__tests__/services/cost-calculation-cache.test.ts

describe('CostCalculationService - Cache Support', () => {
  let service: CostCalculationService;

  beforeEach(() => {
    // Setup service with mock pricing config
  });

  describe('Anthropic cache pricing', () => {
    it('should calculate credits for cache write (first request)', async () => {
      const usage: LLMUsageData = {
        prompt_tokens: 100,
        cache_creation_input_tokens: 2000, // Writing to cache
        cache_read_input_tokens: 0,
        completion_tokens: 50,
        total_tokens: 2150,
      };

      const result = await service.calculateCredits(
        'claude-3-5-sonnet-20241022',
        usage,
        'test-user-id'
      );

      // Regular input: 100 × $3.00/1M = $0.0003
      // Cache write: 2000 × $3.75/1M = $0.0075
      // Output: 50 × $15.00/1M = $0.00075
      // Total: $0.00855
      // With 1.5x margin: $0.012825
      // Credits: 1.28 → ceil to 2 credits

      expect(result.credits).toBe(2);
      expect(result.cacheWriteCredits).toBeGreaterThan(0);
      expect(result.costSavingsPercent).toBeUndefined(); // No savings on first request
    });

    it('should calculate credits for cache read (subsequent request)', async () => {
      const usage: LLMUsageData = {
        prompt_tokens: 100,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 2000, // Reading from cache
        completion_tokens: 50,
        total_tokens: 2150,
      };

      const result = await service.calculateCredits(
        'claude-3-5-sonnet-20241022',
        usage,
        'test-user-id'
      );

      // Regular input: 100 × $3.00/1M = $0.0003
      // Cache read: 2000 × $0.30/1M = $0.0006
      // Output: 50 × $15.00/1M = $0.00075
      // Total: $0.00165
      // With 1.5x margin: $0.002475
      // Credits: 0.25 → ceil to 1 credit

      expect(result.credits).toBe(1);
      expect(result.cacheReadCredits).toBeGreaterThan(0);
      expect(result.costSavingsPercent).toBeGreaterThan(70); // ~85% savings
    });
  });

  describe('OpenAI cache pricing', () => {
    it('should calculate credits with cached prompt tokens', async () => {
      const usage: LLMUsageData = {
        prompt_tokens: 3000,
        cached_prompt_tokens: 2000, // 2000 tokens from cache
        completion_tokens: 50,
        total_tokens: 3050,
      };

      const result = await service.calculateCredits(
        'gpt-4o',
        usage,
        'test-user-id'
      );

      // Regular input: 1000 × $2.50/1M = $0.0025 (only uncached portion)
      // Cached input: 2000 × $1.25/1M = $0.0025 (0.5x rate)
      // Output: 50 × $10.00/1M = $0.0005
      // Total: $0.0055
      // With 1.5x margin: $0.00825
      // Credits: 0.83 → ceil to 1 credit

      expect(result.credits).toBe(1);
      expect(result.cacheReadCredits).toBeGreaterThan(0);
      expect(result.costSavingsPercent).toBeGreaterThan(40); // ~50% savings
    });
  });

  describe('Without caching (baseline)', () => {
    it('should calculate standard credits without cache fields', async () => {
      const usage: LLMUsageData = {
        prompt_tokens: 2100,
        completion_tokens: 50,
        total_tokens: 2150,
      };

      const result = await service.calculateCredits(
        'claude-3-5-sonnet-20241022',
        usage,
        'test-user-id'
      );

      // Standard calculation without cache benefits
      expect(result.cacheWriteCredits).toBeUndefined();
      expect(result.cacheReadCredits).toBeUndefined();
      expect(result.costSavingsPercent).toBeUndefined();
    });
  });
});
```

---

### Task 1.4: Update LLMService to Use Enhanced Credit Calculation

**Priority:** P0 (Blocking)
**Estimated Time:** 3 hours
**Dependencies:** Task 1.2, Task 1.3
**Files to Modify:**
- `backend/src/services/llm.service.ts`

**Implementation:**

```typescript
// backend/src/services/llm.service.ts

@injectable()
export class LLMService {
  // ... existing fields

  constructor(
    @inject('ICostCalculationService') private costCalculationService: ICostCalculationService,
    // ... other dependencies
  ) {
    // ... initialization
  }

  /**
   * Execute chat completion
   * ENHANCED: Now properly handles cache metrics in credit calculation
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    providerName: string,
    userId: string
  ): Promise<ChatCompletionResponse> {
    const provider = this.getProvider(providerName);

    logger.info('LLMService.chatCompletion: Starting request', {
      userId,
      model: request.model,
      provider: providerName,
      messagesCount: request.messages.length,
    });

    try {
      // Execute LLM request
      const { response, usage } = await provider.chatCompletion(request);

      // ENHANCED: Calculate credits using cache-aware calculation
      const creditCalculation = await this.costCalculationService.calculateCredits(
        request.model,
        usage, // Now includes cache_creation_input_tokens, cache_read_input_tokens, etc.
        userId
      );

      logger.info('LLMService.chatCompletion: Credits calculated', {
        userId,
        model: request.model,
        credits: creditCalculation.credits,
        vendorCost: creditCalculation.vendorCost,

        // NEW: Log cache-specific info
        inputCredits: creditCalculation.inputCredits,
        outputCredits: creditCalculation.outputCredits,
        cacheWriteCredits: creditCalculation.cacheWriteCredits,
        cacheReadCredits: creditCalculation.cacheReadCredits,
        costSavingsPercent: creditCalculation.costSavingsPercent,
      });

      // Deduct credits from user balance
      await this.creditDeductionService.deductCredits(
        userId,
        creditCalculation.credits,
        {
          modelId: request.model,
          provider: providerName,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          cacheCreationTokens: usage.cache_creation_input_tokens,
          cacheReadTokens: usage.cache_read_input_tokens,
          cachedPromptTokens: usage.cached_prompt_tokens,
        }
      );

      // Record usage (enhanced with cache metrics - see Task 2.1)
      await this.recordUsage(userId, request.model, usage, creditCalculation);

      // Return response with usage
      return {
        ...response,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,

          // NEW: Include cache metrics in API response (for client visibility)
          cache_creation_input_tokens: usage.cache_creation_input_tokens,
          cache_read_input_tokens: usage.cache_read_input_tokens,
          cached_prompt_tokens: usage.cached_prompt_tokens,
        },
      };
    } catch (error) {
      logger.error('LLMService.chatCompletion: Error', {
        userId,
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleProviderError(error, providerName);
    }
  }

  /**
   * Record usage in database
   * ENHANCED: Now includes cache metrics
   */
  private async recordUsage(
    userId: string,
    modelId: string,
    usage: LLMUsageData,
    creditCalculation: CreditCalculationResult
  ): Promise<void> {
    // Implementation in Task 2.1
  }

  // ... other methods (textCompletion, streaming, etc.)
}
```

**Acceptance Criteria:**
- [ ] LLMService uses enhanced credit calculation with cache support
- [ ] Cache metrics passed to credit deduction service
- [ ] Cache metrics included in API response
- [ ] Detailed logging for cache-related cost savings
- [ ] Error handling unchanged (backward compatible)

---

### Phase 1 Deliverables

- [ ] Request validation accepts `cache_control` fields
- [ ] All providers extract cache metrics from responses
- [ ] Credit calculation handles cache-specific pricing
- [ ] LLMService orchestrates cache-aware flow
- [ ] Unit tests (>80% coverage) for all new code
- [ ] Integration tests with mock providers
- [ ] Documentation: Implementation notes inline

**Phase 1 Review Checklist:**
- [ ] All acceptance criteria met for Tasks 1.1-1.4
- [ ] Tests passing (unit + integration)
- [ ] Code review completed
- [ ] No regressions in existing functionality
- [ ] Performance benchmarks collected

**Expected Phase 1 Outcomes:**
- Backend accepts cache-aware requests without errors
- Credit calculation correctly prices cached vs. non-cached tokens
- Logs show cache metrics when present
- Ready for Phase 2 (usage tracking and analytics)

---

## Phase 2: Cost Optimization (Week 2)

### Goal
Implement comprehensive usage tracking, database schema enhancements, and cost analytics for revenue optimization.

---

### Task 2.1: Database Schema Enhancements

**Priority:** P0 (Blocking)
**Estimated Time:** 4 hours
**Files to Create/Modify:**
- `backend/prisma/migrations/XXX_add_cache_metrics_to_usage_history.sql`
- `backend/prisma/schema.prisma`

**Implementation:**

**Step 1: Update Prisma Schema**

```prisma
// backend/prisma/schema.prisma

model UsageHistory {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  modelId   String   @map("model_id")
  provider  String

  // Token counts
  promptTokens      Int    @map("prompt_tokens")
  completionTokens  Int    @map("completion_tokens")
  totalTokens       Int    @map("total_tokens")

  // NEW: Cache-specific token counts
  cacheCreationTokens Int?  @default(0) @map("cache_creation_tokens")
  cacheReadTokens     Int?  @default(0) @map("cache_read_tokens")
  cachedPromptTokens  Int?  @default(0) @map("cached_prompt_tokens")

  // NEW: Cache performance metrics
  cacheHitRate        Decimal? @map("cache_hit_rate") @db.Decimal(5,2) // Percentage (0-100)
  costSavingsPercent  Decimal? @map("cost_savings_percent") @db.Decimal(5,2) // Percentage

  // Credits and costs
  creditsCharged      Int      @map("credits_charged")
  vendorCost          Decimal  @map("vendor_cost") @db.Decimal(10,6) // USD
  marginMultiplier    Decimal  @map("margin_multiplier") @db.Decimal(4,2)
  grossMargin         Decimal  @map("gross_margin") @db.Decimal(10,6) // USD

  // NEW: Detailed credit breakdown
  inputCredits        Int?     @map("input_credits")
  outputCredits       Int?     @map("output_credits")
  cacheWriteCredits   Int?     @map("cache_write_credits")
  cacheReadCredits    Int?     @map("cache_read_credits")

  // Metadata
  executedAt          DateTime @default(now()) @map("executed_at")
  durationMs          Int?     @map("duration_ms")

  // Relations
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, executedAt])
  @@index([modelId])
  @@index([executedAt])
  @@map("usage_history")
}
```

**Step 2: Create Migration**

```sql
-- backend/prisma/migrations/XXX_add_cache_metrics_to_usage_history.sql

-- Add cache-specific token counts
ALTER TABLE usage_history ADD COLUMN cache_creation_tokens INTEGER DEFAULT 0;
ALTER TABLE usage_history ADD COLUMN cache_read_tokens INTEGER DEFAULT 0;
ALTER TABLE usage_history ADD COLUMN cached_prompt_tokens INTEGER DEFAULT 0;

-- Add cache performance metrics
ALTER TABLE usage_history ADD COLUMN cache_hit_rate DECIMAL(5,2);
ALTER TABLE usage_history ADD COLUMN cost_savings_percent DECIMAL(5,2);

-- Add detailed credit breakdown
ALTER TABLE usage_history ADD COLUMN input_credits INTEGER;
ALTER TABLE usage_history ADD COLUMN output_credits INTEGER;
ALTER TABLE usage_history ADD COLUMN cache_write_credits INTEGER;
ALTER TABLE usage_history ADD COLUMN cache_read_credits INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN usage_history.cache_creation_tokens IS 'Anthropic: Tokens written to cache (charged at 1.25x)';
COMMENT ON COLUMN usage_history.cache_read_tokens IS 'Anthropic: Tokens read from cache (charged at 0.1x)';
COMMENT ON COLUMN usage_history.cached_prompt_tokens IS 'OpenAI/Google: Cached tokens from previous requests';
COMMENT ON COLUMN usage_history.cache_hit_rate IS 'Percentage of tokens served from cache (0-100)';
COMMENT ON COLUMN usage_history.cost_savings_percent IS 'Cost reduction vs non-cached request (0-100)';
```

**Step 3: Run Migration**

```bash
cd backend
npx prisma migrate dev --name add_cache_metrics_to_usage_history
npx prisma generate
```

**Acceptance Criteria:**
- [ ] Migration runs successfully without errors
- [ ] New columns added to usage_history table
- [ ] Existing data unaffected (default values applied)
- [ ] Prisma client regenerated with new fields
- [ ] Backward compatible with existing queries

---

### Task 2.2: Enhanced Usage Recording

**Priority:** P0 (Blocking)
**Estimated Time:** 3 hours
**Dependencies:** Task 2.1
**Files to Modify:**
- `backend/src/services/llm.service.ts`

**Implementation:**

```typescript
// backend/src/services/llm.service.ts

/**
 * Record usage in database with enhanced cache metrics
 */
private async recordUsage(
  userId: string,
  modelId: string,
  usage: LLMUsageData,
  creditCalculation: CreditCalculationResult
): Promise<void> {
  try {
    // Calculate cache hit rate
    const cacheHitRate = this.calculateCacheHitRate(usage);

    await this.prisma.usageHistory.create({
      data: {
        userId,
        modelId,
        provider: this.getProviderForModel(modelId),

        // Standard token counts
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,

        // NEW: Cache-specific token counts
        cacheCreationTokens: usage.cache_creation_input_tokens || 0,
        cacheReadTokens: usage.cache_read_input_tokens || 0,
        cachedPromptTokens: usage.cached_prompt_tokens || 0,

        // NEW: Cache performance metrics
        cacheHitRate: cacheHitRate,
        costSavingsPercent: creditCalculation.costSavingsPercent,

        // Credits and costs
        creditsCharged: creditCalculation.credits,
        vendorCost: creditCalculation.vendorCost,
        marginMultiplier: creditCalculation.marginMultiplier,
        grossMargin: creditCalculation.grossMargin,

        // NEW: Detailed credit breakdown
        inputCredits: creditCalculation.inputCredits,
        outputCredits: creditCalculation.outputCredits,
        cacheWriteCredits: creditCalculation.cacheWriteCredits,
        cacheReadCredits: creditCalculation.cacheReadCredits,

        executedAt: new Date(),
      },
    });

    logger.debug('LLMService: Usage recorded with cache metrics', {
      userId,
      modelId,
      cacheHitRate: cacheHitRate?.toFixed(2),
      costSavingsPercent: creditCalculation.costSavingsPercent?.toFixed(2),
    });
  } catch (error) {
    logger.error('LLMService: Failed to record usage', {
      userId,
      modelId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - usage recording failure shouldn't block the request
  }
}

/**
 * Calculate cache hit rate from usage data
 */
private calculateCacheHitRate(usage: LLMUsageData): Decimal | null {
  const cachedTokens = (usage.cache_read_input_tokens || 0) + (usage.cached_prompt_tokens || 0);
  if (cachedTokens === 0) return null;

  const totalInput = usage.prompt_tokens + (usage.cache_creation_input_tokens || 0) + cachedTokens;
  if (totalInput === 0) return null;

  const hitRate = (cachedTokens / totalInput) * 100;
  return new Decimal(hitRate.toFixed(2));
}
```

**Acceptance Criteria:**
- [ ] Usage history records include all cache metrics
- [ ] Cache hit rate calculated correctly
- [ ] Cost savings percentage stored
- [ ] Backward compatible with non-cached requests
- [ ] Usage recording failures don't block requests (logged only)

---

### Task 2.3: Cost Analytics API Endpoints

**Priority:** P1 (Important)
**Estimated Time:** 6 hours
**Files to Create:**
- `backend/src/controllers/analytics.controller.ts`
- `backend/src/services/analytics.service.ts`
- `backend/src/routes/analytics.routes.ts`

**Implementation:**

```typescript
// backend/src/services/analytics.service.ts

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export interface CacheAnalytics {
  timePeriod: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  cachedRequests: number;
  cacheUtilizationRate: number; // Percentage of requests using cache

  averageCacheHitRate: number;
  averageCostSavings: number;

  totalCreditsCharged: number;
  totalCreditsSaved: number; // Estimated savings from caching

  byModel: ModelCacheStats[];
}

export interface ModelCacheStats {
  modelId: string;
  provider: string;
  requestCount: number;
  averageCacheHitRate: number;
  totalCreditsCharged: number;
  estimatedSavings: number;
}

@injectable()
export class AnalyticsService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  /**
   * Get cache performance analytics for a user
   */
  async getCacheAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CacheAnalytics> {
    logger.debug('AnalyticsService.getCacheAnalytics', {
      userId,
      startDate,
      endDate,
    });

    // Get all usage records in time range
    const usageRecords = await this.prisma.usageHistory.findMany({
      where: {
        userId,
        executedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        modelId: true,
        provider: true,
        creditsCharged: true,
        cacheHitRate: true,
        costSavingsPercent: true,
        cacheReadTokens: true,
        cachedPromptTokens: true,
      },
    });

    const totalRequests = usageRecords.length;
    const cachedRequests = usageRecords.filter(r =>
      (r.cacheReadTokens && r.cacheReadTokens > 0) ||
      (r.cachedPromptTokens && r.cachedPromptTokens > 0)
    ).length;

    // Calculate average cache hit rate (only for cached requests)
    const cachedRecords = usageRecords.filter(r => r.cacheHitRate !== null);
    const averageCacheHitRate = cachedRecords.length > 0
      ? cachedRecords.reduce((sum, r) => sum + Number(r.cacheHitRate), 0) / cachedRecords.length
      : 0;

    // Calculate average cost savings
    const recordsWithSavings = usageRecords.filter(r => r.costSavingsPercent !== null);
    const averageCostSavings = recordsWithSavings.length > 0
      ? recordsWithSavings.reduce((sum, r) => sum + Number(r.costSavingsPercent), 0) / recordsWithSavings.length
      : 0;

    // Total credits charged
    const totalCreditsCharged = usageRecords.reduce((sum, r) => sum + r.creditsCharged, 0);

    // Estimate total credits saved (based on cost savings percentage)
    const totalCreditsSaved = recordsWithSavings.reduce((sum, r) => {
      const savingsPercent = Number(r.costSavingsPercent) / 100;
      const estimatedOriginalCost = r.creditsCharged / (1 - savingsPercent);
      const savedCredits = estimatedOriginalCost - r.creditsCharged;
      return sum + savedCredits;
    }, 0);

    // Group by model
    const byModelMap = new Map<string, ModelCacheStats>();
    usageRecords.forEach(record => {
      if (!byModelMap.has(record.modelId)) {
        byModelMap.set(record.modelId, {
          modelId: record.modelId,
          provider: record.provider,
          requestCount: 0,
          averageCacheHitRate: 0,
          totalCreditsCharged: 0,
          estimatedSavings: 0,
        });
      }

      const stats = byModelMap.get(record.modelId)!;
      stats.requestCount++;
      stats.totalCreditsCharged += record.creditsCharged;

      if (record.cacheHitRate) {
        stats.averageCacheHitRate += Number(record.cacheHitRate);
      }

      if (record.costSavingsPercent) {
        const savingsPercent = Number(record.costSavingsPercent) / 100;
        const estimatedOriginalCost = record.creditsCharged / (1 - savingsPercent);
        stats.estimatedSavings += estimatedOriginalCost - record.creditsCharged;
      }
    });

    // Finalize averages
    const byModel = Array.from(byModelMap.values()).map(stats => ({
      ...stats,
      averageCacheHitRate: stats.requestCount > 0
        ? stats.averageCacheHitRate / stats.requestCount
        : 0,
    }));

    return {
      timePeriod: { start: startDate, end: endDate },
      totalRequests,
      cachedRequests,
      cacheUtilizationRate: totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0,
      averageCacheHitRate,
      averageCostSavings,
      totalCreditsCharged,
      totalCreditsSaved: Math.round(totalCreditsSaved),
      byModel,
    };
  }
}
```

```typescript
// backend/src/controllers/analytics.controller.ts

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { getUserId } from '../middleware/auth.middleware';
import logger from '../utils/logger';

@injectable()
export class AnalyticsController {
  constructor(
    @inject(AnalyticsService) private analyticsService: AnalyticsService
  ) {}

  /**
   * GET /v1/analytics/cache
   * Get cache performance analytics
   *
   * Query params:
   * - start_date: ISO 8601 date (optional, default: 30 days ago)
   * - end_date: ISO 8601 date (optional, default: now)
   */
  async getCacheAnalytics(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }

    const startDate = req.query.start_date
      ? new Date(req.query.start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const endDate = req.query.end_date
      ? new Date(req.query.end_date as string)
      : new Date();

    logger.debug('AnalyticsController.getCacheAnalytics', {
      userId,
      startDate,
      endDate,
    });

    try {
      const analytics = await this.analyticsService.getCacheAnalytics(
        userId,
        startDate,
        endDate
      );

      res.status(200).json(analytics);
    } catch (error) {
      logger.error('AnalyticsController.getCacheAnalytics: Error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        error: {
          message: 'Failed to retrieve cache analytics',
          code: 'analytics_error',
        },
      });
    }
  }
}
```

```typescript
// backend/src/routes/analytics.routes.ts

import { Router } from 'express';
import { container } from 'tsyringe';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();
const analyticsController = container.resolve(AnalyticsController);

/**
 * GET /v1/analytics/cache
 * Get cache performance analytics
 * Requires: Authentication
 */
router.get(
  '/cache',
  authMiddleware,
  asyncHandler(analyticsController.getCacheAnalytics.bind(analyticsController))
);

export default router;
```

**Register in main routes:**

```typescript
// backend/src/routes/index.ts

import analyticsRoutes from './analytics.routes';

// ...

app.use('/v1/analytics', analyticsRoutes);
```

**Acceptance Criteria:**
- [ ] GET /v1/analytics/cache endpoint returns cache performance data
- [ ] Analytics calculated correctly from usage history
- [ ] Cost savings estimated accurately
- [ ] Supports date range filtering
- [ ] Returns breakdown by model
- [ ] Proper authentication required

---

### Task 2.4: Admin Dashboard Cache Metrics

**Priority:** P2 (Nice to have)
**Estimated Time:** 8 hours
**Files to Create:**
- `backend/src/controllers/admin/cache-analytics-admin.controller.ts`
- `backend/src/services/admin/cache-analytics-admin.service.ts`

**Implementation:**

```typescript
// backend/src/services/admin/cache-analytics-admin.service.ts

/**
 * Admin-level cache analytics (all users)
 */
export interface AdminCacheAnalytics {
  timePeriod: {
    start: Date;
    end: Date;
  };
  totalUsers: number;
  totalRequests: number;
  cachedRequests: number;

  overallCacheHitRate: number;
  overallCostSavings: number;

  totalCreditsCharged: number;
  totalCreditsSaved: number;
  totalRevenueUSD: number;
  estimatedRevenueWithoutCaching: number;

  topCachedModels: Array<{
    modelId: string;
    provider: string;
    requestCount: number;
    averageCacheHitRate: number;
    totalCreditsCharged: number;
  }>;

  topCachingUsers: Array<{
    userId: string;
    email: string;
    requestCount: number;
    averageCacheHitRate: number;
    creditsSaved: number;
  }>;
}

@injectable()
export class CacheAnalyticsAdminService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  /**
   * Get admin-level cache analytics
   * Requires admin role
   */
  async getAdminCacheAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<AdminCacheAnalytics> {
    // Similar implementation to AnalyticsService but aggregated across all users
    // Include revenue calculations (credits × $0.01)
    // Identify top caching models and users

    // ... implementation
  }
}
```

**API Endpoint:**

```
GET /admin/analytics/cache
Authorization: Bearer <admin_token>
Requires: admin role

Response:
{
  "timePeriod": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-20T23:59:59Z"
  },
  "totalUsers": 250,
  "totalRequests": 15000,
  "cachedRequests": 9000,
  "overallCacheHitRate": 72.5,
  "overallCostSavings": 68.3,
  "totalCreditsCharged": 45000,
  "totalCreditsSaved": 97500,
  "totalRevenueUSD": 450.00,
  "estimatedRevenueWithoutCaching": 1425.00,
  "topCachedModels": [
    {
      "modelId": "claude-3-5-sonnet-20241022",
      "provider": "anthropic",
      "requestCount": 5500,
      "averageCacheHitRate": 85.2,
      "totalCreditsCharged": 18000
    }
  ],
  "topCachingUsers": [
    {
      "userId": "user-123",
      "email": "power-user@example.com",
      "requestCount": 800,
      "averageCacheHitRate": 92.1,
      "creditsSaved": 6400
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] Admin endpoint returns aggregated cache analytics
- [ ] Revenue impact calculations included
- [ ] Top models and users identified
- [ ] Requires admin role
- [ ] Performance optimized for large datasets

---

### Phase 2 Deliverables

- [ ] Database schema updated with cache metrics
- [ ] Usage tracking includes all cache data
- [ ] User-level cache analytics API
- [ ] Admin-level cache analytics (optional)
- [ ] Integration tests for analytics endpoints
- [ ] Documentation: API reference for analytics

**Phase 2 Review Checklist:**
- [ ] Database migration successful in staging
- [ ] Analytics calculations verified against test data
- [ ] API responses match documentation
- [ ] Performance acceptable for large datasets

---

## Phase 3: Analytics & Monitoring (Week 3)

### Goal
Add comprehensive logging, monitoring, and user-facing cost transparency features.

---

### Task 3.1: Enhanced Logging for Cache Performance

**Priority:** P1 (Important)
**Estimated Time:** 4 hours
**Files to Modify:**
- `backend/src/services/llm.service.ts`
- `backend/src/middleware/logging.middleware.ts`

**Implementation:**

```typescript
// backend/src/middleware/logging.middleware.ts

/**
 * Cache performance logging middleware
 * Logs aggregate cache metrics periodically
 */
export class CachePerformanceLogger {
  private metricsBuffer: Array<{
    timestamp: Date;
    userId: string;
    modelId: string;
    cacheHitRate: number;
    costSavings: number;
  }> = [];

  /**
   * Add cache metrics to buffer
   */
  recordCacheMetrics(
    userId: string,
    modelId: string,
    cacheHitRate: number | null,
    costSavings: number | null
  ): void {
    if (cacheHitRate !== null && costSavings !== null) {
      this.metricsBuffer.push({
        timestamp: new Date(),
        userId,
        modelId,
        cacheHitRate,
        costSavings,
      });
    }

    // Flush buffer every 100 records
    if (this.metricsBuffer.length >= 100) {
      this.flushMetrics();
    }
  }

  /**
   * Flush metrics buffer (log aggregate statistics)
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;

    const avgCacheHitRate = this.metricsBuffer.reduce((sum, m) => sum + m.cacheHitRate, 0) / this.metricsBuffer.length;
    const avgCostSavings = this.metricsBuffer.reduce((sum, m) => sum + m.costSavings, 0) / this.metricsBuffer.length;

    logger.info('Cache Performance Summary', {
      recordCount: this.metricsBuffer.length,
      averageCacheHitRate: avgCacheHitRate.toFixed(2),
      averageCostSavings: avgCostSavings.toFixed(2),
      timeRange: {
        start: this.metricsBuffer[0].timestamp,
        end: this.metricsBuffer[this.metricsBuffer.length - 1].timestamp,
      },
    });

    this.metricsBuffer = [];
  }
}
```

---

### Task 3.2: User-Facing Cost Transparency

**Priority:** P1 (Important)
**Estimated Time:** 6 hours
**Files to Modify:**
- `backend/src/controllers/credits.controller.ts`
- `backend/src/services/credit.service.ts`

**Implementation:**

```typescript
// Add to GET /v1/credits/usage endpoint

/**
 * Enhanced usage history response with cache cost breakdown
 */
export interface UsageHistoryItem {
  id: string;
  executedAt: Date;
  modelId: string;
  provider: string;

  // Token counts
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  // NEW: Cache breakdown
  caching: {
    cacheWriteTokens: number;
    cacheReadTokens: number;
    cacheHitRate: number | null; // Percentage
    costSavings: number | null; // Percentage
  } | null;

  // Credits breakdown
  creditsCharged: number;
  breakdown: {
    inputCredits: number;
    outputCredits: number;
    cacheWriteCredits: number | null;
    cacheReadCredits: number | null;
  };
}
```

**API Response Example:**

```json
{
  "usageHistory": [
    {
      "id": "usage-123",
      "executedAt": "2025-11-20T10:30:00Z",
      "modelId": "claude-3-5-sonnet-20241022",
      "provider": "anthropic",
      "promptTokens": 100,
      "completionTokens": 50,
      "totalTokens": 2150,
      "caching": {
        "cacheWriteTokens": 0,
        "cacheReadTokens": 2000,
        "cacheHitRate": 95.2,
        "costSavings": 84.5
      },
      "creditsCharged": 1,
      "breakdown": {
        "inputCredits": 0,
        "outputCredits": 1,
        "cacheWriteCredits": null,
        "cacheReadCredits": 0
      }
    }
  ]
}
```

---

### Task 3.3: Documentation Updates

**Priority:** P2 (Nice to have)
**Estimated Time:** 8 hours
**Files to Create/Update:**
- `docs/reference/157-prompt-caching-api-guide.md`
- `docs/guides/018-prompt-caching-cost-optimization.md`
- Update API reference documentation

**Contents:**

1. **API Guide (docs/reference/157-prompt-caching-api-guide.md)**
   - How to structure cache-aware requests
   - Provider-specific caching behaviors
   - Credit calculation with caching
   - Analytics API reference

2. **Cost Optimization Guide (docs/guides/018-prompt-caching-cost-optimization.md)**
   - Best practices for maximizing cache hit rates
   - When to use ephemeral vs extended cache (Anthropic)
   - Cost comparison scenarios
   - Troubleshooting cache issues

---

### Phase 3 Deliverables

- [ ] Enhanced logging for cache performance
- [ ] User-facing cost breakdown with cache transparency
- [ ] Comprehensive documentation
- [ ] Admin dashboard with cache insights (optional)
- [ ] Performance monitoring setup

---

## Phase 4: Production Rollout (Week 4)

### Goal
Gradual rollout with feature flags, monitoring, and validation.

---

### Task 4.1: Feature Flag Implementation

**Priority:** P0 (Blocking)
**Estimated Time:** 3 hours

**Implementation:**

```typescript
// backend/src/config/feature-flags.ts

export interface FeatureFlags {
  promptCaching: {
    enabled: boolean;
    rolloutPercentage: number; // 0-100
    enabledProviders: string[]; // ['anthropic', 'openai', 'google']
  };
}

export const featureFlags: FeatureFlags = {
  promptCaching: {
    enabled: process.env.ENABLE_PROMPT_CACHING === 'true',
    rolloutPercentage: parseInt(process.env.PROMPT_CACHING_ROLLOUT_PERCENT || '10'),
    enabledProviders: (process.env.PROMPT_CACHING_PROVIDERS || 'anthropic').split(','),
  },
};
```

**Rollout Schedule:**
- **Day 1:** 10% of users, Anthropic only
- **Day 2:** Monitor metrics, increase to 25% if stable
- **Day 3:** 50% of users, add OpenAI
- **Day 5:** 75% of users, add Google
- **Day 7:** 100% rollout if all metrics healthy

---

### Task 4.2: Production Monitoring Setup

**Priority:** P0 (Blocking)
**Estimated Time:** 6 hours

**Metrics to Monitor:**

1. **Error Rate**
   - Validation errors with cache_control
   - Provider API errors
   - Credit calculation errors
   - Target: <1% increase

2. **Cost Metrics**
   - Average credits per request (before/after)
   - Total revenue (should remain stable or increase)
   - Gross margin percentage
   - Target: Maintain >40% gross margin

3. **Performance Metrics**
   - Average response latency
   - Cache hit rate across providers
   - Cost savings percentage
   - Target: >70% cache hit rate for Space-based workflows

4. **Business Metrics**
   - User adoption rate (% using Dedicated API)
   - Credit consumption rate (should decrease per user)
   - User retention (should improve)

---

### Task 4.3: Rollback Plan

**Immediate Rollback (<1 hour):**
1. Set `ENABLE_PROMPT_CACHING=false`
2. Restart backend services
3. Verify requests work without caching
4. Notify users of temporary service disruption

**Partial Rollback (<4 hours):**
1. Disable caching for specific provider
2. Reduce rollout percentage
3. Keep telemetry running
4. Investigate issues

**Data Rollback (if needed):**
- Cache metrics in database are additive (no data loss)
- Can re-calculate credits if pricing was incorrect
- Migration rollback script available

---

### Phase 4 Deliverables

- [ ] Feature flags implemented
- [ ] Gradual rollout completed
- [ ] Production monitoring active
- [ ] Rollback plan tested
- [ ] Success metrics validated

---

## Testing Strategy

### Unit Tests

```typescript
// backend/src/__tests__/services/

describe('Cache Support - Unit Tests', () => {
  describe('Request Validation', () => {
    it('should accept Anthropic cache_control blocks');
    it('should accept requests without cache_control');
    it('should reject invalid cache_control types');
  });

  describe('Provider Response Parsing', () => {
    it('should extract Anthropic cache metrics');
    it('should extract OpenAI cached_prompt_tokens');
    it('should handle missing cache metrics gracefully');
  });

  describe('Credit Calculation', () => {
    it('should calculate credits for cache write (Anthropic 1.25x)');
    it('should calculate credits for cache read (Anthropic 0.1x)');
    it('should calculate credits for OpenAI cached tokens (0.5x)');
    it('should calculate cost savings percentage');
  });

  describe('Analytics', () => {
    it('should calculate cache hit rate correctly');
    it('should aggregate metrics across multiple requests');
    it('should handle empty date ranges');
  });
});
```

### Integration Tests

```typescript
// backend/src/__tests__/integration/

describe('Cache Support - Integration Tests', () => {
  describe('End-to-End Chat Completion with Caching', () => {
    it('should accept cache-aware request and return cache metrics', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${testToken}`)
        .send(cacheAwareRequest);

      expect(response.status).toBe(200);
      expect(response.body.usage).toHaveProperty('cache_creation_input_tokens');
    });

    it('should charge correct credits for cached request', async () => {
      const initialBalance = await getCreditBalance(testUserId);

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${testToken}`)
        .send(cacheAwareRequest);

      const newBalance = await getCreditBalance(testUserId);
      const charged = initialBalance - newBalance;

      // Should charge less than non-cached equivalent
      expect(charged).toBeLessThan(expectedNonCachedCredits);
    });
  });

  describe('Analytics API', () => {
    it('should return cache analytics for user', async () => {
      const response = await request(app)
        .get('/v1/analytics/cache')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ start_date: '2025-11-01', end_date: '2025-11-20' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('averageCacheHitRate');
      expect(response.body).toHaveProperty('totalCreditsSaved');
    });
  });
});
```

### Load Testing

```bash
# Test with 100 concurrent users making cache-aware requests
k6 run --vus 100 --duration 5m backend/tests/load/cache-performance.js

# Expected results:
# - 95% of requests complete in <3s
# - Error rate <1%
# - Cache hit rate >70% after warm-up
```

---

## Revenue Impact Analysis

### Cost Reduction Scenarios

**Scenario 1: Space-Based Workflow (Desktop Client)**
```
User has Space with 10K tokens of context
Makes 100 requests per month

WITHOUT CACHING:
- Input tokens per request: 10,000 + 100 (query) = 10,100
- Credits per request: ~13 credits (Anthropic Claude Sonnet)
- Monthly credits: 100 × 13 = 1,300 credits
- Monthly cost to user: $13.00
- Monthly revenue to Rephlo: $13.00

WITH CACHING (after first request):
- First request: 10,100 tokens → 13 credits (cache write)
- Subsequent 99 requests:
  - Regular input: 100 tokens
  - Cache read: 10,000 tokens @ 0.1x
  - Credits per request: ~2 credits (85% reduction)
- Monthly credits: 13 + (99 × 2) = 211 credits
- Monthly cost to user: $2.11 (84% savings!)
- Monthly revenue to Rephlo: $2.11

IMPACT:
✅ User Cost: $13.00 → $2.11 (84% reduction)
⚠️ Revenue: $13.00 → $2.11 (84% reduction)
```

**But wait! Volume growth compensates:**

### Revenue Growth Model

**Assumption:** Lower costs drive higher usage

```
Month 1 (No Caching):
- 1,000 active users
- Average 50 requests/user/month
- Average 10 credits/request
- Total credits: 1,000 × 50 × 10 = 500,000 credits
- Revenue: $5,000/month

Month 3 (With Caching, 3x usage growth):
- 1,000 active users
- Average 150 requests/user/month (3x increase due to lower costs)
- Average 3 credits/request (70% reduction)
- Total credits: 1,000 × 150 × 3 = 450,000 credits
- Revenue: $4,500/month

Month 6 (5x usage growth, user base growth):
- 1,500 active users (50% growth - lower barrier to entry)
- Average 250 requests/user/month (5x increase)
- Average 3 credits/request
- Total credits: 1,500 × 250 × 3 = 1,125,000 credits
- Revenue: $11,250/month (2.25x original!)
```

### Competitive Advantage

**vs. Direct Provider (Anthropic):**
- Anthropic charges $3.00/1M input tokens
- With caching: $0.30/1M (90% reduction)
- Rephlo with 1.5x margin: $0.45/1M (still 85% cheaper than direct!)
- **Value Proposition:** "Get Anthropic caching + Desktop Client features + 85% savings"

**vs. BYOK (Bring Your Own Key):**
- BYOK requires user to manage API keys, billing, rate limits
- Dedicated API: One subscription, no API key management, unified billing
- Lower friction → higher conversion rate

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cache Hit Rate** | >80% for Space-based workflows | Usage analytics |
| **Cost Reduction** | >70% for cached requests | Credit calculation logs |
| **Latency Improvement** | >50% for cached requests | Response time tracking |
| **Error Rate Increase** | <1% | Error monitoring |
| **API Availability** | >99.9% | Uptime monitoring |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **User Adoption (Dedicated API)** | >40% of Desktop Client users | User analytics |
| **Usage Growth** | >2x within 3 months | Request volume tracking |
| **Revenue Impact** | Neutral to positive | Financial reports |
| **User Satisfaction** | >4.5/5 stars for cost transparency | User surveys |
| **Churn Reduction** | <5% churn rate | Retention analytics |

### Revenue Metrics (6-month targets)

- **Total Monthly Revenue:** $10,000+ (from $5,000 baseline)
- **Average Revenue Per User (ARPU):** $10-15/month
- **Gross Margin:** >40% (maintained or improved)
- **Credit Consumption Growth:** >3x volume

---

## Rollback Plan

### Rollback Triggers

Immediately rollback if:
1. Error rate increases >5%
2. Cost per request increases significantly
3. User complaints >10 in 24 hours
4. Gross margin drops below 30%
5. Provider API rate limits exceeded

### Rollback Procedure

**Phase 1: Immediate Disable (5 minutes)**
```bash
# 1. Set feature flag to disabled
export ENABLE_PROMPT_CACHING=false

# 2. Restart backend services
pm2 restart backend-api

# 3. Verify requests work without caching
curl -X POST https://api.rephlo.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "test"}]}'
```

**Phase 2: Investigate (1 hour)**
- Check error logs for specific failures
- Review cache metric data
- Identify affected users/models
- Determine root cause

**Phase 3: Partial Re-enable (if safe)**
- Enable for single provider (most stable)
- Reduce rollout percentage to 10%
- Monitor closely for 24 hours

**Phase 4: Data Correction (if needed)**
- If credit calculation was incorrect:
  ```sql
  -- Identify affected usage records
  SELECT * FROM usage_history
  WHERE executed_at >= '2025-11-20'
    AND (cache_read_tokens > 0 OR cache_creation_tokens > 0);

  -- Recalculate credits (if pricing was wrong)
  -- Apply credit adjustments to user balances
  -- Notify affected users
  ```

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Incorrect credit calculation** | Medium | High | Extensive testing, gradual rollout, monitoring |
| **Provider API changes** | Low | Medium | Version pinning, provider SDK updates, fallback logic |
| **Database performance issues** | Low | Medium | Indexes on cache fields, query optimization |
| **Revenue decrease** | Medium | High | Usage growth tracking, pricing adjustments |
| **User confusion about billing** | Medium | Low | Clear documentation, detailed breakdowns |

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Task 1.1: Update request validation schemas (2h)
- [ ] Task 1.2: Enhance provider response parsing (4h)
- [ ] Task 1.3: Enhanced credit calculation service (6h)
- [ ] Task 1.4: Update LLMService orchestration (3h)
- [ ] Unit tests for Phase 1 (6h)
- [ ] Code review and merge

### Week 2: Cost Optimization
- [ ] Task 2.1: Database schema enhancements (4h)
- [ ] Task 2.2: Enhanced usage recording (3h)
- [ ] Task 2.3: Cost analytics API endpoints (6h)
- [ ] Task 2.4: Admin dashboard (optional, 8h)
- [ ] Integration tests for Phase 2 (6h)
- [ ] Deploy to staging

### Week 3: Analytics & Monitoring
- [ ] Task 3.1: Enhanced logging (4h)
- [ ] Task 3.2: User-facing cost transparency (6h)
- [ ] Task 3.3: Documentation updates (8h)
- [ ] Performance testing (4h)
- [ ] Staging validation

### Week 4: Production Rollout
- [ ] Task 4.1: Feature flags (3h)
- [ ] Task 4.2: Production monitoring setup (6h)
- [ ] Task 4.3: Rollback plan testing (3h)
- [ ] Day 1-7: Gradual rollout (10%, 25%, 50%, 75%, 100%)
- [ ] Success metrics validation
- [ ] Post-launch retrospective

---

## Appendices

### Appendix A: Provider Pricing Reference

**Anthropic Claude 3.5 Sonnet:**
- Input: $3.00 / 1M tokens
- Cache Write: $3.75 / 1M tokens (1.25x)
- Cache Read: $0.30 / 1M tokens (0.1x)
- Output: $15.00 / 1M tokens
- Cache TTL: 5 min (ephemeral) or 1 hour (extended)

**OpenAI GPT-4o:**
- Input: $2.50 / 1M tokens
- Cache Write: $2.50 / 1M tokens (1x)
- Cache Read: $1.25 / 1M tokens (0.5x)
- Output: $10.00 / 1M tokens
- Cache TTL: ~5-10 minutes

**Google Gemini 1.5 Pro:**
- Input: $1.25 / 1M tokens
- Cache Write: $1.25 / 1M tokens (1x)
- Cache Read: $0.31 / 1M tokens (0.25x)
- Output: $5.00 / 1M tokens
- Cache TTL: 5-60 minutes

### Appendix B: Database Schema DDL

```sql
-- Complete schema for cache-enhanced usage_history table
-- (See Task 2.1 for details)
```

### Appendix C: API Request/Response Examples

```json
// Anthropic cache-aware request
{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "You are a helpful assistant...",
          "cache_control": { "type": "ephemeral" }
        },
        {
          "type": "text",
          "text": "Space context: [large document]...",
          "cache_control": { "type": "ephemeral" }
        },
        {
          "type": "text",
          "text": "User query: What is X?"
        }
      ]
    }
  ],
  "max_tokens": 1000
}

// Response with cache metrics
{
  "id": "msg_123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "claude-3-5-sonnet-20241022",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "X is..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 2150,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 2000
  }
}
```

---

**Document Status:** Awaiting Review
**Next Review Date:** 2025-11-21
**Implementation Start Date:** TBD (after approval)

---

**Related Documents:**
- docs/analysis/089-backend-prompt-caching-adaptation-evaluation.md
- Desktop Client Plan 207 (D:\sources\demo\text-assistant\docs\plan\207-prompt-caching-implementation-plan.md)
