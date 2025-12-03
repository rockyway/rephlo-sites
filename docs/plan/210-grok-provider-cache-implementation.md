# 210 - Grok xAI Provider & Cache Implementation Plan

## Overview
Implement Grok xAI provider class and add cache pricing support. The xAI provider and base models already exist from Plan 209, but the actual provider implementation and cache pricing are missing.

**Reference Document:** `D:\sources\demo\text-assistant\docs\reference\013-rephlo-api-cache-implementation-guide.md`

---

## Current State Analysis (Plan 209 Already Implemented)

| Component | Status | Notes |
|-----------|--------|-------|
| `xai` Provider (DB) | ✅ Done | Registered with api_type='openai-compatible' |
| Grok Models (DB) | ✅ Partial | 4 models exist (need 4 more from desktop doc) |
| Context Pricing (DB) | ✅ Done | 128K threshold with 2x high-context pricing |
| **Cache Pricing (DB)** | ❌ Missing | Plan 209 stated "no cache support" - now available |
| **GrokProvider class** | ❌ Missing | No `src/providers/grok.provider.ts` |
| **Container registration** | ❌ Missing | No Grok provider in DI container |
| **LLM Service routing** | ❌ Missing | No routing for grok-* models |
| **Provider Spec** | ❌ Missing | No `config/providers/grok/` folder |

### Existing Models (seed.ts)
- ✅ grok-4-0709 (256K context, pro_max tier)
- ✅ grok-4-1-fast-reasoning (2M context, pro tier)
- ✅ grok-4-1-fast-non-reasoning (2M context, pro tier)
- ✅ grok-code-fast-1 (256K context, pro tier)

### Models to Add (from desktop doc)
- ❌ grok-3 (131K context)
- ❌ grok-3-fast (131K context)
- ❌ grok-4-fast-reasoning (if different from grok-4-1)
- ❌ grok-4-l-fast-non-reasoning (large variant)

---

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Testing Approach | Unit tests with mocks | No GROK_API_KEY available for integration testing |
| Data Method | Seed.ts (upsert) | Consistent with existing pattern for model/pricing data |
| Provider Spec | Full spec with model families | Complete implementation matching existing providers |
| Cache Support | Add cache pricing | Desktop team confirms xAI now supports prompt caching |

---

## Phase 1: Create Grok Provider (Day 1)

### Task 1.1: Create Provider Interface Implementation
**File:** `backend/src/providers/grok.provider.ts` (NEW)

- Implement `ILLMProvider` interface
- xAI uses OpenAI-compatible API format (already noted in seed: api_type='openai-compatible')
- Support both non-streaming and streaming completions
- Extract cache metrics from responses:
  - `cache_creation_input_tokens` (write) - Anthropic-style
  - `cache_read_input_tokens` (read) - Anthropic-style
  - Fallback: `prompt_tokens_details.cached_tokens`
- Base URL: `https://api.x.ai/v1`
- Enable `stream_options: { include_usage: true }` for streaming

**Key Methods:**
- `chatCompletion()` - Non-streaming chat
- `streamChatCompletion()` - SSE streaming chat
- `textCompletion()` - Non-streaming text
- `streamTextCompletion()` - SSE streaming text
- `extractUsageWithCacheMetrics()` - Private helper for cache extraction

### Task 1.2: Register in DI Container
**File:** `backend/src/container.ts` (MODIFY)

Add conditional registration:
```typescript
if (process.env.GROK_API_KEY) {
  container.register('GrokProvider', { useClass: GrokProvider });
  container.register('ILLMProvider', { useToken: 'GrokProvider' });
}
```

### Task 1.3: Add Provider Routing
**File:** `backend/src/services/llm.service.ts` (MODIFY)

Add Grok model detection - match pattern: `grok-*` or `grok`

---

## Phase 2: Provider Specification (Day 1)

### Task 2.1: Create Grok Provider Spec
**File:** `backend/src/config/providers/grok/grok-spec.ts` (NEW)

Define provider specification with:
- Provider name: `xai` (matching DB provider name)
- Display name: `xAI Grok`
- Base parameters (temperature, top_p, max_tokens, etc.)
- Model families reference

### Task 2.2: Create Grok 3 Family Spec
**File:** `backend/src/config/providers/grok/grok3-family.ts` (NEW)

Model family for Grok 3 series:
- `grok-3` - Standard model (131K context)
- `grok-3-fast` - Fast variant (131K context)

### Task 2.3: Create Grok 4 Family Spec
**File:** `backend/src/config/providers/grok/grok4-family.ts` (NEW)

Model family for Grok 4 series (existing + new):
- `grok-4-0709` - Flagship (256K context) ✅ exists
- `grok-4-1-fast-reasoning` - Reasoning v2 (2M context) ✅ exists
- `grok-4-1-fast-non-reasoning` - Fast (2M context) ✅ exists
- `grok-4-l-fast-non-reasoning` - Large fast (2M context) ❌ add
- `grok-code-fast-1` - Code optimized (256K context) ✅ exists

### Task 2.4: Create Transformers
**File:** `backend/src/config/providers/grok/transformers.ts` (NEW)

Request/response transformers for Grok API format.

### Task 2.5: Update Provider Index
**File:** `backend/src/config/providers/index.ts` (MODIFY)

Export Grok spec alongside other providers.

---

## Phase 3: Update Seed Data (Day 2)

### Task 3.1: Add Missing Models to Seed
**File:** `backend/prisma/seed.ts` (MODIFY)

Add missing Grok models:
- grok-3 (131K context)
- grok-3-fast (131K context)
- grok-4-l-fast-non-reasoning (2M context)

### Task 3.2: Add Cache Pricing to Existing Models
**File:** `backend/prisma/seed.ts` (MODIFY)

Update existing 4 models with cache pricing columns:
```typescript
cache_input_price_per_1k: X,    // Cache write price
cache_hit_price_per_1k: Y,      // Cache read price (75-90% discount)
```

### Task 3.3: Pricing Table (All Models)

| Model | Input $/1M | Output $/1M | Cache Write | Cache Read | Context | Discount |
|-------|-----------|-------------|-------------|------------|---------|----------|
| grok-4-0709 | $3.00 | $15.00 | $3.00 | $0.75 | 256K | 75% |
| grok-4-1-fast-reasoning | $0.20* | $0.50* | $0.20 | $0.02 | 2M | 90% |
| grok-4-1-fast-non-reasoning | $0.20* | $0.50* | $0.20 | $0.02 | 2M | 90% |
| grok-4-l-fast-non-reasoning | $0.50 | $1.00 | $0.50 | $0.05 | 2M | 90% |
| grok-code-fast-1 | $0.20* | $1.50* | $0.20 | $0.02 | 2M | 90% |
| grok-3 | $2.00 | $10.00 | $2.00 | $0.50 | 131K | 75% |
| grok-3-fast | $0.30 | $0.75 | $0.30 | $0.03 | 131K | 90% |

*Note: These models already have context-threshold pricing (2x above 128K)

---

## Phase 4: Cost Calculation Integration (Day 2)

### Task 4.1: Verify Cost Calculation Service
**File:** `backend/src/services/cost-calculation.service.ts` (VERIFY)

Grok uses Anthropic-style cache metrics, so the existing logic should work. Verify:
- `cacheCreationInputTokens` → cache write cost (same as input, no 1.25x premium unlike Anthropic)
- `cacheReadInputTokens` → cache read cost (75-90% discount)

If needed, add explicit Grok case in `calculateVendorCost()`.

---

## Phase 5: Environment Configuration (Day 2)

### Task 5.1: Add Environment Variable
**File:** `backend/.env.example` (MODIFY)

```env
GROK_API_KEY=xai-xxxxxxxxxxxxx
```

---

## Phase 6: Testing (Day 2-3)

### Task 6.1: Unit Tests with Mocks
**File:** `backend/tests/unit/providers/grok.provider.test.ts` (NEW)

Test with mocked fetch responses:
- `extractUsageWithCacheMetrics()` - Verify cache field extraction from both locations
- Non-streaming chat completion - Mock API response with cache metrics
- Streaming chat completion - Mock SSE stream with usage stats in final chunk
- Error handling - API errors, rate limits, invalid responses
- Response transformation - Ensure correct LLMUsageData mapping

### Task 6.2: Cost Calculation Tests
**File:** `backend/tests/unit/services/cost-calculation.service.test.ts` (ADD TESTS)

- Grok cache pricing calculation
- Verify 75% discount for grok-4-0709
- Verify 90% discount for fast models

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| **Provider Core** | | |
| `backend/src/providers/grok.provider.ts` | CREATE | Grok xAI provider implementation |
| `backend/src/container.ts` | MODIFY | Register Grok provider |
| `backend/src/services/llm.service.ts` | MODIFY | Add Grok routing |
| **Provider Spec** | | |
| `backend/src/config/providers/grok/grok-spec.ts` | CREATE | Provider specification |
| `backend/src/config/providers/grok/grok3-family.ts` | CREATE | Grok 3 model family |
| `backend/src/config/providers/grok/grok4-family.ts` | CREATE | Grok 4 model family |
| `backend/src/config/providers/grok/transformers.ts` | CREATE | Request/response transformers |
| `backend/src/config/providers/index.ts` | MODIFY | Export Grok spec |
| **Database (Partial - some exists)** | | |
| `backend/prisma/seed.ts` | MODIFY | Add missing models + cache pricing |
| **Cost Calculation** | | |
| `backend/src/services/cost-calculation.service.ts` | VERIFY | Ensure Grok cache pricing works |
| **Environment** | | |
| `backend/.env.example` | MODIFY | Add GROK_API_KEY |
| **Tests** | | |
| `backend/tests/unit/providers/grok.provider.test.ts` | CREATE | Unit tests with mocks |

---

## Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Create Grok Provider + DI + Routing | 3 hours |
| 2 | Provider Specification (spec, families, transformers) | 2 hours |
| 3 | Update Seed Data (add missing models + cache pricing) | 1 hour |
| 4 | Cost Calculation Verification | 30 min |
| 5 | Environment Config | 15 min |
| 6 | Unit Tests with Mocks | 2 hours |
| **Total** | | **~8.75 hours (1.5 days)** |

---

## Dependencies & Risks

1. **No Integration Testing** - Without GROK_API_KEY, we rely on mocked tests; real API behavior may differ
2. **Grok API Response Format** - Verify actual response structure matches documentation when API key becomes available
3. **Cache Metrics Location** - Grok may return cache tokens in `usage` or `prompt_tokens_details`; handle both
4. **Model Name Consistency** - Desktop doc uses slightly different model names; verify with xAI API docs

---

## Success Criteria

- [ ] Grok provider registered and routing works
- [ ] Non-streaming and streaming completions work (mocked)
- [ ] Cache metrics extracted correctly from both field locations
- [ ] Cost calculation applies Grok cache pricing (new feature)
- [ ] Missing models added to seed (grok-3, grok-3-fast, grok-4-l-fast-non-reasoning)
- [ ] Cache pricing columns added to existing models
- [ ] All unit tests pass
- [ ] Build succeeds with no TypeScript errors

---

## Critical Files to Read Before Implementation

These files should be examined closely before starting:
1. `backend/src/providers/openai.provider.ts` - Reference for OpenAI-compatible API pattern
2. `backend/src/providers/anthropic.provider.ts` - Reference for cache metrics extraction
3. `backend/src/interfaces/providers/llm-provider.interface.ts` - Interface to implement
4. `backend/src/container.ts` - DI registration patterns
5. `backend/prisma/seed.ts` - Existing Grok model definitions (lines 1326-1424, 2301-2408)
