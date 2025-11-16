# Streaming Inference Error Investigation

**Date**: 2025-11-15
**Issue**: LLMService streaming chat completion failure after custom OpenAI endpoint configuration
**Status**: Diagnostics enhanced, awaiting error details

---

## Problem Description

### Reported Error
User reported inference error with the following log output:

```
2025-11-15 01:20:24 [debug]: ModelsController.chatCompletion
2025-11-15 01:20:24 [debug]: OpenAIProvider: Streaming chat completion request
2025-11-15 01:20:25 [error]: LLMService: Streaming chat completion failed
POST /v1/chat/completions 200 372.810 ms - -
```

### Context
- User modified `openai.provider.ts` to support custom OpenAI endpoint via `OPENAI_BASE_URL` environment variable
- HTTP response shows `200 OK` status despite error being logged
- Error occurs during streaming chat completion

---

## Technical Analysis

### Why HTTP 200 Despite Error?

**Root Cause**: SSE (Server-Sent Events) headers sent before provider execution completes

**Code Flow** (`backend/src/services/llm.service.ts:306-309`):
```typescript
// Set SSE headers BEFORE calling provider
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

**Implication**: Once headers are sent, the HTTP status (200) is locked in. Any subsequent errors must be communicated via SSE data stream.

### Error Location Analysis

Based on code flow, the error occurs AFTER:
1. ✅ Middleware pipeline (auth, credit check, tier validation)
2. ✅ ModelsController.chatCompletion (line ~165)
3. ✅ OpenAI provider streaming execution (line 317 in llm.service.ts)

The error happens DURING:
- **Credit calculation** (`calculateCreditsFromVendorCost` - lines 326-332)
- **Atomic credit deduction** (`deductCreditsAtomically` - lines 359-364)
- **Token usage tracking** (part of atomic deduction)

### Potential Causes

#### 1. Custom Endpoint Returns Invalid Token Data
The custom OpenAI endpoint might not return proper token usage information in the streaming response format.

**Current Estimation Logic** (`openai.provider.ts:145-147`):
```typescript
const promptText = request.messages.map((m) => m.content).join(' ');
const totalTokens = Math.ceil((promptText.length + completionText.length) / 4);
```

**Assumption**: 4 characters ≈ 1 token (rough estimate)

**Problem**: If custom endpoint behaves differently, this could return `0` or `NaN`, breaking credit calculations.

#### 2. Provider Name Mismatch
The credit calculation looks up the provider in the database by name:

```typescript
const provider = await this.prisma.provider.findUnique({
  where: { name: providerName },  // Must match database record exactly
  select: { id: true },
});
```

If the provider name doesn't match (e.g., expecting "openai" but custom endpoint is identified differently), the fallback calculation is used.

#### 3. Model Not Found in ProviderPricing Table
Credit calculation requires:
- Provider record in `provider` table
- Pricing data in `provider_pricing` table for the specific model

If custom endpoint uses different model IDs, pricing lookup could fail.

---

## Custom Endpoint Implementation Review

### User's Modification (`openai.provider.ts:27-34`)
```typescript
constructor(@inject('OpenAIClient') private client: OpenAI) {
  // overwrite the OpenAI baseUrl if there is configuration from .env OPENAI_BASE_URL
  if (process.env.OPENAI_BASE_URL) {
    this.client.baseURL = process.env.OPENAI_BASE_URL;
  }

  logger.debug('OpenAIProvider: Initialized - ' + this.client.baseURL);
}
```

**Analysis**:
- ✅ Correct approach - modifies baseURL after client injection
- ✅ Preserves existing OpenAI SDK functionality
- ⚠️ Assumes custom endpoint is 100% OpenAI API-compatible

**Compatibility Requirements**:
Custom endpoint MUST:
1. Accept identical request format as OpenAI `/v1/chat/completions` (streaming)
2. Return streaming chunks in exact OpenAI format
3. Include same response structure (id, created, model, choices, etc.)
4. Support all requested parameters (temperature, max_tokens, stop, etc.)

---

## Diagnostic Improvements Implemented

### 1. Enhanced Error Logging (`llm.service.ts:384-390`)
**Added**:
```typescript
logger.error('LLMService: Streaming chat completion failed', {
  model: request.model,
  provider: modelProvider,
  userId,
  error: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,  // NEW
});
```

**Benefit**: Full stack trace will pinpoint exact failure location (provider lookup, cost calculation, credit deduction, or token tracking).

### 2. Custom Endpoint Visibility (`openai.provider.ts:102-105`)
**Added**:
```typescript
logger.debug('OpenAIProvider: Streaming chat completion request', {
  model: request.model,
  baseURL: this.client.baseURL,  // NEW - shows which endpoint
});
```

**Benefit**: Confirms which endpoint is being called (standard OpenAI vs. custom).

### 3. Streaming Metrics Logging (`openai.provider.ts:149-155`)
**Added**:
```typescript
logger.debug('OpenAIProvider: Streaming completed', {
  model: request.model,
  baseURL: this.client.baseURL,
  chunkCount,              // NEW - number of chunks received
  completionLength,        // NEW - total text length
  estimatedTokens,         // NEW - calculated token count
});
```

**Benefit**: Verifies custom endpoint returns expected data structure and token estimation produces valid results.

### 4. Provider-Level Error Handling (`openai.provider.ts:158-166`)
**Added try-catch around streaming**:
```typescript
try {
  // streaming logic
} catch (error) {
  logger.error('OpenAI Provider: Streaming chat completion error', {
    model: request.model,
    baseURL: this.client.baseURL,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

**Benefit**: Captures provider-specific errors separately from service-level errors.

---

## Next Steps for User

### 1. Reproduce the Error
Run another streaming chat completion request through the API with the custom `OPENAI_BASE_URL` configured.

### 2. Collect Enhanced Logs
The improved logging will now show:
- **Stack trace** indicating exact failure point
- **baseURL** confirming custom endpoint usage
- **Streaming metrics** (chunkCount, completionLength, estimatedTokens)
- **Provider-level errors** if failure occurs during streaming

### 3. Share Complete Error Output
Provide the full error message including:
```
LLMService: Streaming chat completion failed
  error: [error message]
  stack: [stack trace]
```

and

```
OpenAIProvider: Streaming completed
  baseURL: [custom endpoint URL]
  chunkCount: [number]
  completionLength: [number]
  estimatedTokens: [number]
```

---

## Potential Solutions (Based on Root Cause)

### If Custom Endpoint Returns Invalid Token Count
**Option 1**: Implement fallback estimation
```typescript
const totalTokens = Math.max(
  Math.ceil((promptText.length + completionText.length) / 4),
  1  // Minimum 1 token to avoid division by zero
);
```

**Option 2**: Add configuration for custom endpoint token estimation strategy
```typescript
const tokenEstimationStrategy = process.env.OPENAI_CUSTOM_TOKEN_ESTIMATION || 'character_count';
```

### If Provider Lookup Fails
**Option**: Add provider name validation when custom endpoint is used
```typescript
const effectiveProvider = process.env.OPENAI_BASE_URL
  ? (process.env.OPENAI_CUSTOM_PROVIDER_NAME || 'openai')
  : 'openai';
```

### If Pricing Data Missing
**Option**: Use fallback pricing for custom endpoints
```typescript
if (!providerPricing && process.env.OPENAI_BASE_URL) {
  // Use configured fallback pricing for custom endpoints
  const fallbackCreditMultiplier = parseFloat(
    process.env.OPENAI_CUSTOM_CREDIT_MULTIPLIER || '10'
  );
  const fallbackCredits = Math.ceil((totalTokens / 1000) * fallbackCreditMultiplier);
  return { credits: fallbackCredits, ... };
}
```

---

## Files Modified

1. **`backend/src/services/llm.service.ts`**
   - Line 389: Added stack trace logging to streaming chat completion error handler

2. **`backend/src/providers/openai.provider.ts`**
   - Lines 102-105: Added baseURL logging to streaming request
   - Lines 149-155: Added streaming metrics logging
   - Lines 158-166: Added try-catch with error logging around streaming logic

---

## References

- Inference Flow Architecture: `docs/reference/188-inference-flow-architecture.md`
- LLM Service: `backend/src/services/llm.service.ts:294-395`
- OpenAI Provider: `backend/src/providers/openai.provider.ts:94-167`
- Credit Calculation: `backend/src/services/llm.service.ts:93-191`
