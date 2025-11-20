# Backend Prompt Caching Adaptation Evaluation

## Document Information
- **Analysis Number:** 089
- **Date Created:** 2025-11-20
- **Related Plan:** Desktop Client Plan 207 (Prompt Caching Implementation)
- **Status:** Complete
- **Scope:** Backend API adaptations for Desktop Client prompt caching strategy

---

## Executive Summary

The Desktop Client application is implementing prompt caching with a **Bring-Your-Own-Key (BYOK)** model where caching operations occur client-side with user-configured providers (Anthropic, OpenAI, Gemini). The **Rephlo Dedicated API backend requires minimal adaptations** because:

1. ✅ **Credit calculation already supports cached tokens** (`cachedInputTokens` parameter)
2. ✅ **Request/response schemas are provider-agnostic** (pass-through architecture)
3. ✅ **Backend acts as a transparent proxy** for completion requests
4. ⚠️ **Need to validate cache-related fields pass through correctly**
5. ⚠️ **Need to ensure usage tracking captures cache metrics**

**Recommendation:** Backend adaptations are **minimal and mostly validation-focused**. Primary work is ensuring existing infrastructure correctly handles cache-aware requests.

---

## Table of Contents

1. [Desktop Client Caching Architecture](#desktop-client-caching-architecture)
2. [Backend Current Architecture](#backend-current-architecture)
3. [Impact Analysis](#impact-analysis)
4. [Required Backend Adaptations](#required-backend-adaptations)
5. [Already Supported Features](#already-supported-features)
6. [Testing Requirements](#testing-requirements)
7. [Recommendations](#recommendations)

---

## 1. Desktop Client Caching Architecture

### 1.1 Client-Side Caching Strategy (BYOK Model)

The Desktop Client implements prompt caching **entirely on the client side** using user-provided API keys:

```
┌─────────────────────────────────────────────────────────────┐
│  Desktop Client (BYOK - Bring Your Own Key)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Workflow:                                              │
│  1. User configures Space (knowledge base) with documents    │
│  2. User selects text + executes Command                     │
│  3. PromptComposer assembles prompt with cache breakpoints:  │
│                                                              │
│     ┌─────────────────────────────────────────┐            │
│     │ Segment 1: System Prompt (CACHED)       │            │
│     │ • Static instructions                   │            │
│     │ • Rarely changes                        │            │
│     ├─────────────────────────────────────────┤            │
│     │ Segment 2: Space Context (CACHED)       │            │
│     │ • Knowledge base documents              │            │
│     │ • Changes only when docs updated        │            │
│     ├─────────────────────────────────────────┤            │
│     │ Segment 3: Dynamic Content (NOT CACHED) │            │
│     │ • {{SELECTED_TEXT}}                     │            │
│     │ • {{CUSTOM_INSTRUCTIONS}}               │            │
│     │ • Changes every request                 │            │
│     └─────────────────────────────────────────┘            │
│                                                              │
│  4. Request sent to LLM provider:                           │
│     • Anthropic: Explicit cache_control blocks              │
│     • OpenAI/Gemini: Automatic prefix matching              │
│                                                              │
│  5. Provider response includes cache metrics:                │
│     • cache_creation_input_tokens (Anthropic)               │
│     • cache_read_input_tokens (Anthropic)                   │
│     • cached_prompt_tokens (OpenAI/Gemini)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          │
          │ [OPTIONAL: User may also use Dedicated API]
          ↓
┌─────────────────────────────────────────────────────────────┐
│  Rephlo Dedicated API Backend (Alternative Mode)            │
├─────────────────────────────────────────────────────────────┤
│  If user chooses Dedicated API instead of BYOK:             │
│  • Desktop Client sends same cache-aware request             │
│  • Backend forwards request to LLM provider                  │
│  • Backend calculates credits from usage (including cache)   │
│  • Response returned to Desktop Client                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Desktop Client Components

**From Plan 207 Analysis:**

| Component | Purpose | Cache Involvement |
|-----------|---------|-------------------|
| **PromptComposer** | Assembles prompts with cache breakpoints | Creates segmented prompts for Anthropic |
| **AnthropicLLMService** | Sends requests with `cache_control` blocks | Explicit cache breakpoint markers |
| **OpenAILLMService** | Flattens segments (automatic caching) | Relies on prefix matching |
| **GeminiLLMService** | Flattens segments (automatic caching) | Relies on prefix matching |
| **CacheMetricsCollector** | Tracks cache hits/misses | Client-side analytics only |
| **SpaceCacheManager** | Invalidates cache on Space updates | Client-side state management |

**Important:** All caching logic is **client-side**. Desktop Client manages:
- Cache breakpoint composition
- Cache invalidation triggers
- Cache metrics collection
- Cost savings calculations

---

## 2. Backend Current Architecture

### 2.1 Request Flow

```
Desktop Client (with cache-aware request)
    │
    ↓
POST /v1/chat/completions
    │
    ├─> authMiddleware (JWT validation)
    ├─> requireScope('llm.inference')
    ├─> checkCredits() [estimates credits, checks balance]
    │
    ↓
ModelsController.chatCompletion()
    │
    ├─> Validate request body (Zod schema)
    ├─> Get user tier
    ├─> Check model access (tier restrictions)
    │
    ↓
LLMService.chatCompletion(request, provider, userId)
    │
    ├─> Route to correct provider (OpenAI, Anthropic, Google)
    ├─> Provider forwards request to LLM API
    ├─> Receive response with usage data
    │
    ↓
Calculate credits from usage:
    • input_tokens (regular)
    • output_tokens
    • cached_input_tokens (if present) ← ALREADY SUPPORTED
    │
    ↓
Deduct credits from user balance
Record usage in database
Return response to client
```

### 2.2 Critical Discovery: Cached Tokens Already Supported

**File:** `backend/src/services/llm.service.ts:141-150`

```typescript
private async calculateCreditsFromVendorCost(
  userId: string,
  modelId: string,
  providerName: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens?: number  // ← ALREADY EXISTS!
): Promise<{
  credits: number;
  providerId: string;
  // ... other fields
}>
```

**This means the backend credit calculation already accounts for cached input tokens!**

### 2.3 Backend Provider Architecture

The backend uses a **pass-through proxy pattern** for LLM requests:

```typescript
// Backend does NOT modify request structure
// It forwards the request to the provider's SDK/API as-is

// Example: Anthropic provider
interface ILLMProvider {
  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
}
```

**Key Insight:** The backend **does not need to understand cache_control structures** because:
1. Request validation schemas allow additional fields (not strictly typed)
2. Provider implementations forward requests to official SDKs
3. SDKs handle provider-specific extensions (like Anthropic's `cache_control`)

---

## 3. Impact Analysis

### 3.1 Zero-Impact Areas ✅

| Component | Why No Changes Needed |
|-----------|----------------------|
| **Request routing** | Provider selection unchanged |
| **Authentication** | OAuth/JWT flow unaffected |
| **Rate limiting** | Per-user limits still apply |
| **Model tier access** | Tier restrictions still enforced |
| **API response format** | Standard OpenAI-compatible format |

### 3.2 Low-Impact Areas ⚠️

| Component | Potential Issue | Mitigation |
|-----------|----------------|------------|
| **Request validation schemas** | May reject unknown fields like `cache_control` | **Action:** Verify Zod schemas allow additional fields |
| **Usage tracking** | Need to capture cache metrics in database | **Action:** Add optional cache fields to UsageHistory |
| **Credit calculation** | Already supports `cachedInputTokens` parameter | **Action:** Ensure all providers pass this parameter |
| **Provider implementations** | Must extract cache metrics from API responses | **Action:** Verify each provider parses usage correctly |

### 3.3 Zero-Impact But Good to Have 💡

| Enhancement | Benefit | Priority |
|------------|---------|----------|
| **Cache metrics logging** | Better observability for debugging | Low |
| **Separate cache cost tracking** | Detailed billing breakdown | Medium |
| **Cache hit rate analytics** | Admin dashboard insights | Low |

---

## 4. Required Backend Adaptations

### 4.1 HIGH PRIORITY: Validation Schema Updates

**Problem:** Zod schemas may reject provider-specific fields.

**Example - Anthropic Cache Control:**
```json
{
  "model": "claude-3-opus-20240229",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "System prompt here",
          "cache_control": { "type": "ephemeral" }  // ← May be rejected
        }
      ]
    }
  ]
}
```

**Solution:**

```typescript
// backend/src/types/model-validation.ts

// BEFORE (may reject cache_control):
export const textContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content cannot be empty'),
});

// AFTER (allows additional fields):
export const textContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content cannot be empty'),
  cache_control: z.object({
    type: z.enum(['ephemeral', 'extended'])
  }).optional(),  // ← Explicitly allow Anthropic cache_control
});

// Alternative: Use .passthrough() to allow any additional fields
export const textContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content cannot be empty'),
}).passthrough();  // ← Allows any provider-specific extensions
```

**Recommendation:** Use `.passthrough()` for maximum provider flexibility.

---

### 4.2 MEDIUM PRIORITY: Usage Tracking Enhancements

**Problem:** `UsageHistory` table may not capture cache-specific metrics.

**Current Schema (assumed):**
```sql
CREATE TABLE UsageHistory (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES Users(id),
  model_id TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  credits_charged INTEGER,
  -- Missing cache-specific fields
);
```

**Recommended Schema Enhancement:**
```sql
ALTER TABLE UsageHistory ADD COLUMN cache_creation_tokens INTEGER DEFAULT 0;
ALTER TABLE UsageHistory ADD COLUMN cache_read_tokens INTEGER DEFAULT 0;
ALTER TABLE UsageHistory ADD COLUMN cache_hit_rate DECIMAL(5,2);  -- Percentage
```

**Backend Service Update:**
```typescript
// backend/src/services/llm.service.ts

// When recording usage, include cache metrics:
await this.prisma.usageHistory.create({
  data: {
    userId,
    modelId: request.model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,

    // NEW: Cache metrics (if available)
    cacheCreationTokens: usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    cacheHitRate: calculateCacheHitRate(usage),

    creditsCharged: calculatedCredits,
    executedAt: new Date(),
  }
});
```

---

### 4.3 MEDIUM PRIORITY: Provider Response Parsing

**Problem:** Ensure all provider implementations extract cache metrics from API responses.

**Anthropic Provider Example:**

**File:** `backend/src/providers/anthropic.provider.ts`

```typescript
async chatCompletion(request: ChatCompletionRequest): Promise<{
  response: Omit<ChatCompletionResponse, 'usage'>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cache_creation_input_tokens?: number;  // ← VERIFY THIS EXISTS
    cache_read_input_tokens?: number;      // ← VERIFY THIS EXISTS
  };
}> {
  const response = await this.client.messages.create({
    model: request.model,
    messages: request.messages,
    max_tokens: request.max_tokens,
    // ... other params
  });

  // Anthropic response includes cache metrics in usage object:
  // response.usage = {
  //   input_tokens: 100,
  //   cache_creation_input_tokens: 2000,  ← Written to cache
  //   cache_read_input_tokens: 1800,      ← Read from cache
  //   output_tokens: 50
  // }

  return {
    response: { /* ... */ },
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,

      // NEW: Pass through cache metrics
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens,
    }
  };
}
```

**Action Items:**
1. ✅ Verify `AnthropicProvider` extracts `cache_creation_input_tokens` and `cache_read_input_tokens`
2. ✅ Verify `OpenAIProvider` extracts `cached_prompt_tokens` (if available in SDK)
3. ✅ Verify `GoogleProvider` extracts cached token metrics (if available)

---

### 4.4 LOW PRIORITY: Logging Enhancements

**Current Logging:**
```typescript
logger.debug('ModelsController.chatCompletion', {
  userId,
  model: req.body.model,
  messagesCount: req.body.messages?.length,
});
```

**Enhanced Logging (Cache-Aware):**
```typescript
logger.debug('ModelsController.chatCompletion', {
  userId,
  model: req.body.model,
  messagesCount: req.body.messages?.length,

  // NEW: Log cache-related info
  hasCacheControl: req.body.messages?.some(msg =>
    Array.isArray(msg.content) &&
    msg.content.some(part => part.cache_control)
  ),
  cacheBreakpointCount: countCacheBreakpoints(req.body.messages),
});

// After receiving response:
logger.info('LLM request completed with cache metrics', {
  userId,
  model: request.model,
  promptTokens: usage.prompt_tokens,
  cacheCreationTokens: usage.cache_creation_input_tokens || 0,
  cacheReadTokens: usage.cache_read_input_tokens || 0,
  cacheHitRate: calculateCacheHitRate(usage),
  costSavings: calculateCacheSavings(usage),
});
```

---

## 5. Already Supported Features

### 5.1 Credit Calculation with Cached Tokens ✅

**Evidence:** `backend/src/services/llm.service.ts:141`

```typescript
private async calculateCreditsFromVendorCost(
  userId: string,
  modelId: string,
  providerName: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens?: number  // ← ALREADY SUPPORTED
)
```

**This method already accepts cached input tokens**, which suggests the backend was designed with caching in mind from the start.

**Action Required:** Verify this parameter is actually used in credit calculation logic. Check if cached tokens have different pricing (e.g., Anthropic charges 0.1x for cache reads).

---

### 5.2 Pass-Through Request Architecture ✅

The backend **does not modify request structures** beyond validation. This means:

1. **Anthropic cache_control blocks** will pass through to Anthropic SDK
2. **OpenAI system prompts** will maintain order for automatic caching
3. **Provider-specific extensions** are naturally supported

**No changes needed for request forwarding.**

---

### 5.3 Flexible Response Parsing ✅

Provider interfaces return usage data as:

```typescript
usage: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

**This structure can be extended** to include cache metrics without breaking existing code.

---

## 6. Testing Requirements

### 6.1 Validation Testing

**Test Case 1: Anthropic Cache Control Blocks**

```typescript
// Test: POST /v1/chat/completions with cache_control
describe('Chat Completion with Anthropic Cache Control', () => {
  it('should accept cache_control blocks in content array', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'System prompt here',
                cache_control: { type: 'ephemeral' }  // Should not be rejected
              },
              {
                type: 'text',
                text: 'User query here'
              }
            ]
          }
        ],
        max_tokens: 1000
      });

    expect(response.status).toBe(200);
  });
});
```

**Test Case 2: Cache Metrics in Response**

```typescript
it('should return cache metrics in usage object', async () => {
  // Mock Anthropic response with cache metrics
  const mockAnthropicResponse = {
    id: 'msg_123',
    content: [{ type: 'text', text: 'Response' }],
    usage: {
      input_tokens: 100,
      cache_creation_input_tokens: 2000,
      cache_read_input_tokens: 1800,
      output_tokens: 50
    }
  };

  // ... mock provider to return above response

  const response = await request(app)
    .post('/v1/chat/completions')
    .set('Authorization', `Bearer ${validToken}`)
    .send({ /* request with cache_control */ });

  expect(response.body.usage).toMatchObject({
    prompt_tokens: expect.any(Number),
    completion_tokens: expect.any(Number),
    total_tokens: expect.any(Number),
    cache_creation_input_tokens: 2000,
    cache_read_input_tokens: 1800,
  });
});
```

### 6.2 Credit Calculation Testing

**Test Case 3: Cached Tokens Cost Less**

```typescript
describe('Credit Calculation with Cached Tokens', () => {
  it('should charge less for cached input tokens (Anthropic 0.1x rate)', async () => {
    // Scenario:
    // - 100 regular input tokens @ $3.00/1M = $0.0003
    // - 2000 cache_read_input_tokens @ $0.30/1M = $0.0006
    // - 50 output tokens @ $15.00/1M = $0.00075
    // Total vendor cost: $0.00165
    // With 1.5x margin: $0.002475
    // Credits (× 100): 0.2475 → ceil to 1 credit

    const result = await creditCalculationService.calculateCredits({
      modelId: 'claude-3-opus-20240229',
      inputTokens: 100,
      cachedInputTokens: 2000,
      outputTokens: 50,
      userId: testUserId
    });

    // Should charge significantly less than without caching
    expect(result.credits).toBeLessThan(expectedCreditsWithoutCache);
  });
});
```

### 6.3 Integration Testing

**Test Case 4: End-to-End Cache-Aware Request**

```typescript
describe('End-to-End Prompt Caching', () => {
  it('should handle full cache-aware workflow', async () => {
    // 1. First request (cache miss - writes to cache)
    const firstResponse = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send(cacheAwareRequest);

    expect(firstResponse.body.usage.cache_creation_input_tokens).toBeGreaterThan(0);

    // 2. Second request (cache hit - reads from cache)
    const secondResponse = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send(cacheAwareRequest);

    expect(secondResponse.body.usage.cache_read_input_tokens).toBeGreaterThan(0);

    // 3. Verify credits charged correctly for both
    const usageHistory = await prisma.usageHistory.findMany({
      where: { userId: testUserId },
      orderBy: { executedAt: 'desc' },
      take: 2
    });

    expect(usageHistory[0].creditsCharged).toBeLessThan(usageHistory[1].creditsCharged);
  });
});
```

---

## 7. Recommendations

### 7.1 Immediate Actions (Before Desktop Client Release)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | Verify Zod schemas allow `cache_control` fields | 1 hour | **CRITICAL** - Prevents request rejection |
| **P0** | Test Anthropic provider extracts cache metrics | 2 hours | **HIGH** - Ensures correct credit calculation |
| **P1** | Add cache metrics to UsageHistory schema | 3 hours | **MEDIUM** - Enables analytics |
| **P1** | Update credit calculation to use cached token pricing | 4 hours | **HIGH** - Correct billing for cached tokens |

### 7.2 Short-Term Enhancements (Post-Release)

| Enhancement | Benefit | Effort |
|------------|---------|--------|
| **Admin dashboard cache metrics** | Visibility into cache hit rates | 8 hours |
| **Per-user cache analytics** | Help users optimize costs | 6 hours |
| **Cache cost breakdown in usage API** | Transparent billing | 4 hours |

### 7.3 Long-Term Considerations

1. **Multi-Provider Cache Strategy Comparison**
   - Track cache hit rates by provider (Anthropic vs OpenAI)
   - Recommend best provider for cache-heavy workloads

2. **Cache Warmth Heuristics**
   - Backend could suggest optimal cache TTL based on usage patterns
   - Not critical since Desktop Client handles this

3. **Future: Backend-Side Caching (Optional)**
   - If many users use Dedicated API, backend could implement its own caching layer
   - Would require significant architecture changes
   - Not recommended unless usage patterns justify it

---

## 8. Summary of Backend Changes

### 8.1 Minimal Changes Required ✅

```
Backend adaptations for Desktop Client prompt caching:

1. ✅ Request validation schemas
   - Add `.passthrough()` or explicit cache_control fields
   - Estimated effort: 1-2 hours

2. ✅ Provider response parsing
   - Verify cache metrics extracted from all providers
   - Estimated effort: 2-3 hours

3. ✅ Usage tracking
   - Add cache metric columns to database
   - Update usage recording logic
   - Estimated effort: 3-4 hours

4. ✅ Credit calculation
   - Verify cached token pricing applied correctly
   - Estimated effort: 2-3 hours

5. ✅ Testing
   - Validation tests, credit calculation tests, integration tests
   - Estimated effort: 8-10 hours

Total Estimated Effort: 16-22 hours (2-3 days)
```

### 8.2 Zero Backend Changes Scenarios 🎯

If the Desktop Client **exclusively uses BYOK mode** (user-configured providers):
- ✅ **Backend sees zero traffic with cache-aware requests**
- ✅ **No backend changes needed**
- ✅ **Caching is entirely client-side**

If the Desktop Client **uses Dedicated API** (backend-proxied requests):
- ⚠️ **Backend must support cache-aware request validation**
- ⚠️ **Backend must correctly calculate credits for cached tokens**
- ⚠️ **Backend should track cache metrics for analytics**

---

## 9. Conclusion

### 9.1 Final Assessment

The Rephlo backend is **already well-positioned** to support the Desktop Client's prompt caching strategy:

- ✅ Credit calculation accepts `cachedInputTokens` parameter
- ✅ Pass-through architecture naturally supports provider extensions
- ✅ Provider implementations use official SDKs that handle caching
- ⚠️ Minor validation and tracking enhancements needed

### 9.2 Risk Level: **LOW** 🟢

**Reasons:**
1. Desktop Client handles all caching logic client-side
2. Backend acts as transparent proxy
3. No breaking changes to existing API contracts
4. Changes are additive (new optional fields)

### 9.3 Recommended Approach

**Phase 1: Validation (Before Desktop Client Release)**
- Verify request schemas accept cache_control fields
- Test provider response parsing for cache metrics
- Ensure credit calculation handles cached tokens correctly

**Phase 2: Tracking (Post-Release)**
- Add cache metrics to UsageHistory
- Update usage recording logic
- Add observability logging

**Phase 3: Analytics (Optional)**
- Admin dashboard cache insights
- Per-user cache optimization recommendations

---

## 10. Action Items for Backend Team

### Immediate (This Week)

- [ ] **Review** Zod validation schemas in `backend/src/types/model-validation.ts`
- [ ] **Test** Anthropic provider with cache_control request
- [ ] **Verify** credit calculation uses cachedInputTokens parameter
- [ ] **Document** cache metric fields in API documentation

### Short-Term (Next Sprint)

- [ ] **Add** cache metric columns to UsageHistory table
- [ ] **Update** usage recording to capture cache data
- [ ] **Write** integration tests for cache-aware requests
- [ ] **Deploy** to staging for Desktop Client testing

### Long-Term (Post-Launch)

- [ ] **Build** admin dashboard cache analytics
- [ ] **Monitor** cache usage patterns across users
- [ ] **Optimize** credit pricing for cached tokens if needed

---

**Document Status:** Complete
**Next Review:** After Desktop Client Plan 207 implementation begins
**Contact:** Backend Team Lead

---

**Appendix A: Desktop Client Reference Files**
- `D:\sources\demo\text-assistant\docs\plan\207-prompt-caching-implementation-plan.md`
- `D:\sources\demo\text-assistant\docs\architect\016-prompt-caching-strategy.md`
- `D:\sources\demo\text-assistant\docs\architect\017-prompt-caching-quick-reference.md`

**Appendix B: Backend Reference Files**
- `backend/src/controllers/models.controller.ts` (Lines 331-468)
- `backend/src/services/llm.service.ts` (Lines 141-150)
- `backend/src/types/model-validation.ts` (Validation schemas)
- `backend/src/providers/anthropic.provider.ts` (Anthropic implementation)
