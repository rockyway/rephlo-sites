# LLM Completion Credit Info API Reference

**Document ID:** 192
**Category:** API Reference
**Created:** 2025-11-18
**Last Updated:** 2025-11-18
**Status:** Active

---

## Overview

This document provides the complete API reference for the credit balance information feature included in LLM completion responses. This feature eliminates the need for Desktop Client to make a separate `/api/user/credits` call after each completion request.

## Feature Summary

**Endpoints Affected:**
- `POST /v1/chat/completions` (Chat completions)
- `POST /v1/completions` (Text completions)

**Response Enhancement:**
- **Non-streaming:** Credit info included in response body `usage.credits`
- **Streaming:** Credit info included in final chunk (before `[DONE]` marker) `usage.credits`

**Credit Info Fields:**
- `deducted`: Credits deducted for this request
- `remaining`: Total credits remaining after deduction
- `subscriptionRemaining`: Subscription credits remaining
- `purchasedRemaining`: Purchased addon credits remaining

---

## API Endpoints

### 1. Chat Completions

**Endpoint:** `POST /v1/chat/completions`

#### Request

```typescript
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean; // Default: false
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  n?: number;
}
```

**Example Request:**
```json
{
  "model": "gpt-5-mini",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}
```

#### Response (Non-Streaming)

```typescript
interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage: CompletionUsage; // ⭐ Includes credit info
}

interface CompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsUsed: number;
  cachedTokens?: number; // Optional: For Anthropic/Google prompt caching
  credits: CreditInfo;    // ⭐ NEW: Credit balance info
}

interface CreditInfo {
  deducted: number;              // Credits deducted for this request
  remaining: number;             // Total credits remaining after deduction
  subscriptionRemaining: number; // Subscription credits remaining
  purchasedRemaining: number;    // Purchased addon credits remaining
}
```

**Example Response (Non-Streaming):**
```json
{
  "id": "chat-completion-123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-5-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150,
    "creditsUsed": 25,
    "credits": {
      "deducted": 25,
      "remaining": 1450,
      "subscriptionRemaining": 1450,
      "purchasedRemaining": 0
    }
  }
}
```

#### Response (Streaming)

**Stream Format:** Server-Sent Events (SSE)

**Content Chunks:**
```typescript
interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: CompletionUsage; // ⭐ Only in final chunk (includes credit info)
}
```

**Example Stream Response:**

```
data: {"id":"chat-123","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chat-123","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chat-123","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chat-123","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"promptTokens":100,"completionTokens":50,"totalTokens":150,"creditsUsed":25,"credits":{"deducted":25,"remaining":1450,"subscriptionRemaining":1450,"purchasedRemaining":0}}}

data: [DONE]
```

**Important Notes:**
- Credit info is **only in the final chunk** (second to last event, before `[DONE]`)
- The final chunk contains the `usage` object with complete token counts and credit info
- Regular content chunks do **not** contain `usage` or `credits`

---

### 2. Text Completions

**Endpoint:** `POST /v1/completions`

#### Request

```typescript
interface TextCompletionRequest {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean; // Default: false
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  n?: number;
}
```

**Example Request:**
```json
{
  "model": "gpt-5-mini",
  "prompt": "Once upon a time",
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}
```

#### Response (Non-Streaming)

```typescript
interface TextCompletionResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    finish_reason: string | null;
  }>;
  usage: CompletionUsage; // ⭐ Includes credit info
}
```

**Example Response (Non-Streaming):**
```json
{
  "id": "text-completion-123",
  "object": "text_completion",
  "created": 1700000000,
  "model": "gpt-5-mini",
  "choices": [
    {
      "index": 0,
      "text": " in a land far, far away, there lived a brave knight...",
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50,
    "totalTokens": 150,
    "creditsUsed": 25,
    "credits": {
      "deducted": 25,
      "remaining": 1450,
      "subscriptionRemaining": 1450,
      "purchasedRemaining": 0
    }
  }
}
```

#### Response (Streaming)

**Stream Format:** Server-Sent Events (SSE)

**Text Chunks:**
```typescript
interface TextCompletionChunk {
  id: string;
  object: 'text_completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    text: string;
    finish_reason: string | null;
  }>;
  usage?: CompletionUsage; // ⭐ Only in final chunk (includes credit info)
}
```

**Example Stream Response:**
```
data: {"id":"text-123","object":"text_completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"text":" in","finish_reason":null}]}

data: {"id":"text-123","object":"text_completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"text":" a","finish_reason":null}]}

data: {"id":"text-123","object":"text_completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"text":" land","finish_reason":null}]}

data: {"id":"text-123","object":"text_completion.chunk","created":1700000000,"model":"gpt-5-mini","choices":[{"index":0,"text":"","finish_reason":"stop"}],"usage":{"promptTokens":100,"completionTokens":50,"totalTokens":150,"creditsUsed":25,"credits":{"deducted":25,"remaining":1450,"subscriptionRemaining":1450,"purchasedRemaining":0}}}

data: [DONE]
```

---

## Credit Info Data Model

### CreditInfo Interface

```typescript
interface CreditInfo {
  deducted: number;              // Credits deducted for this request
  remaining: number;             // Total credits remaining after deduction
  subscriptionRemaining: number; // Subscription credits remaining
  purchasedRemaining: number;    // Purchased addon credits remaining
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `deducted` | `number` | Credits deducted for this specific completion request | `25` |
| `remaining` | `number` | Total credits available after deduction (subscription + purchased) | `1450` |
| `subscriptionRemaining` | `number` | Subscription-allocated credits remaining (resets monthly) | `1450` |
| `purchasedRemaining` | `number` | One-time purchased addon credits remaining (no reset) | `0` |

### Validation Rules

**Type Validation:**
- All fields **must** be `number` type
- All values **must** be non-negative (`>= 0`)

**Business Logic Validation:**
- `remaining` **must equal** `subscriptionRemaining + purchasedRemaining`

**Example Validation Function:**
```typescript
function validateCreditInfo(credits: CreditInfo): boolean {
  // Type check
  if (typeof credits.deducted !== 'number') return false;
  if (typeof credits.remaining !== 'number') return false;
  if (typeof credits.subscriptionRemaining !== 'number') return false;
  if (typeof credits.purchasedRemaining !== 'number') return false;

  // Non-negative check
  if (credits.deducted < 0) return false;
  if (credits.remaining < 0) return false;
  if (credits.subscriptionRemaining < 0) return false;
  if (credits.purchasedRemaining < 0) return false;

  // Total validation
  const expectedTotal = credits.subscriptionRemaining + credits.purchasedRemaining;
  if (credits.remaining !== expectedTotal) return false;

  return true;
}
```

---

## Implementation Details

### Credit Deduction Flow

1. **Pre-Request Validation:**
   - Check if user has sufficient credits
   - Estimate credit cost based on request parameters

2. **LLM Request Execution:**
   - Execute completion request to LLM provider
   - Track actual token usage

3. **Credit Deduction:**
   - Calculate final credit cost based on actual tokens
   - Deduct credits atomically from user balance
   - Record usage in `usage_history` table

4. **Credit Info Retrieval:**
   - Fetch updated credit balance using `ICreditService.getDetailedCredits()`
   - Returns `DetailedCreditsInfo` with full breakdown

5. **Response Construction:**
   - Non-streaming: Include credit info in `usage.credits` field
   - Streaming: Send credit info in final chunk before `[DONE]`

### Service Layer

**Credit Service Interface:**
```typescript
interface ICreditService {
  /**
   * Get detailed credits combining free and pro
   * Complete view of user's credit status for API response
   */
  getDetailedCredits(userId: string): Promise<DetailedCreditsInfo>;
}

interface DetailedCreditsInfo {
  freeCredits: FreeCreditsInfo;
  proCredits: ProCreditsInfo;
  totalAvailable: number;
  lastUpdated: Date;
}

interface ProCreditsInfo {
  subscriptionCredits: SubscriptionCreditsInfo;
  purchasedCredits: PurchasedCreditsInfo;
  totalRemaining: number;
}
```

**Credit Info Transformation:**
```typescript
// Transform DetailedCreditsInfo → CreditInfo (API format)
const creditInfo: CreditInfo = {
  deducted: pricingData.credits,
  remaining: detailedCredits.totalAvailable,
  subscriptionRemaining: detailedCredits.proCredits.subscriptionCredits.remaining,
  purchasedRemaining: detailedCredits.proCredits.purchasedCredits.remaining,
};
```

---

## Client Integration Guide

### Non-Streaming Implementation

**TypeScript/JavaScript Example:**
```typescript
async function chatCompletion(messages: Message[]): Promise<ChatCompletionResponse> {
  const response = await fetch('http://localhost:7150/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  // ✅ Credit info is available in response
  console.log('Credits deducted:', data.usage.credits.deducted);
  console.log('Credits remaining:', data.usage.credits.remaining);
  console.log('Subscription credits:', data.usage.credits.subscriptionRemaining);
  console.log('Purchased credits:', data.usage.credits.purchasedRemaining);

  return data;
}
```

### Streaming Implementation

**TypeScript/JavaScript Example:**
```typescript
async function streamChatCompletion(
  messages: Message[],
  onChunk: (content: string) => void,
  onComplete: (credits: CreditInfo) => void
): Promise<void> {
  const response = await fetch('http://localhost:7150/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || !line.startsWith('data: ')) continue;

      const data = line.replace('data: ', '').trim();
      if (data === '[DONE]') break;

      try {
        const chunk = JSON.parse(data);

        // ✅ Check for final chunk with usage info
        if (chunk.usage?.credits) {
          console.log('Final chunk - Credit info received:');
          console.log('  Deducted:', chunk.usage.credits.deducted);
          console.log('  Remaining:', chunk.usage.credits.remaining);
          console.log('  Subscription:', chunk.usage.credits.subscriptionRemaining);
          console.log('  Purchased:', chunk.usage.credits.purchasedRemaining);

          onComplete(chunk.usage.credits);
        } else if (chunk.choices?.[0]?.delta?.content) {
          // Regular content chunk
          onChunk(chunk.choices[0].delta.content);
        }
      } catch (err) {
        console.error('Failed to parse chunk:', err);
      }
    }
  }
}
```

---

## Error Handling

### Insufficient Credits

**Response:** `402 Payment Required`

```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credits. Required: 25, Available: 10",
    "details": {
      "required": 25,
      "available": 10,
      "shortfall": 15
    }
  }
}
```

### Invalid Model

**Response:** `400 Bad Request`

```json
{
  "error": {
    "code": "INVALID_MODEL",
    "message": "Model 'invalid-model' not found or unavailable",
    "details": {
      "modelId": "invalid-model"
    }
  }
}
```

### Tier Restriction

**Response:** `403 Forbidden`

```json
{
  "error": {
    "code": "TIER_RESTRICTED",
    "message": "Model 'gpt-6-ultra' requires Pro tier. Current tier: Free",
    "details": {
      "modelId": "gpt-6-ultra",
      "requiredTier": "pro",
      "currentTier": "free",
      "upgradeUrl": "/pricing"
    }
  }
}
```

---

## Testing

### Unit Tests

**Location:** `backend/tests/unit/services/llm-credit-info.test.ts`

**Test Coverage:**
- ✅ Non-streaming chat completion includes credit info
- ✅ Non-streaming text completion includes credit info
- ✅ Streaming chat completion sends credit info in final chunk
- ✅ Streaming text completion sends credit info in final chunk
- ✅ Credit info structure validation
- ✅ Credit info calculation accuracy

### Integration Tests

**Self-Test Script:** `backend/test-credit-info-api.js`

**Usage:**
```bash
node backend/test-credit-info-api.js
```

**Test Scenarios:**
1. Non-streaming chat completion with credit info validation
2. Streaming chat completion with final chunk credit info validation

**Requirements:**
- Backend server running on `http://localhost:7150`
- Valid access token in `temp_token.txt`
- User with sufficient credits

---

## Migration Guide

### Desktop Client Migration

For desktop client developers migrating from separate credit API calls to integrated credit info:

**Before (Old Pattern):**
```typescript
// ❌ Old: Two API calls required
const completion = await chatCompletion(messages);
const credits = await fetchUserCredits(); // Separate API call

updateUI({
  message: completion.choices[0].message.content,
  credits: credits.remaining,
});
```

**After (New Pattern):**
```typescript
// ✅ New: Single API call
const completion = await chatCompletion(messages);

updateUI({
  message: completion.choices[0].message.content,
  credits: completion.usage.credits.remaining, // ⭐ No separate call needed
});
```

**Migration Checklist:**
- [ ] Remove `/api/user/credits` polling after completions
- [ ] Update UI to read `response.usage.credits` instead
- [ ] Update credit display to show subscription vs purchased breakdown
- [ ] Validate credit info structure on every response
- [ ] Handle streaming final chunk credit info extraction
- [ ] Update error handling for `402 Payment Required`

**Detailed Migration Guide:** See `docs/reference/191-desktop-client-credit-api-migration-guide.md`

---

## Performance Considerations

### Impact Analysis

**Additional Database Queries:**
- +1 query to `credits` table (via `ICreditService.getDetailedCredits()`)
- Executed **after** credit deduction (atomic transaction complete)

**Response Size Impact:**
- Non-streaming: +120 bytes (credit info JSON)
- Streaming: +120 bytes in final chunk only

**Latency Impact:**
- Negligible (~5-10ms for credit lookup)
- Credit query runs in parallel with response construction

**Caching Strategy:**
- Credit info is **not cached** (must reflect real-time balance)
- Model pricing data is cached (5 min TTL)

---

## OpenAPI Specification

### Chat Completions

```yaml
/v1/chat/completions:
  post:
    summary: Create chat completion
    operationId: createChatCompletion
    tags:
      - Chat
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ChatCompletionRequest'
    responses:
      '200':
        description: Successful completion
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatCompletionResponse'
          text/event-stream:
            schema:
              type: string
              description: Server-sent events stream
      '400':
        $ref: '#/components/responses/BadRequest'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '402':
        $ref: '#/components/responses/InsufficientCredits'
      '403':
        $ref: '#/components/responses/TierRestricted'
      '500':
        $ref: '#/components/responses/InternalServerError'
```

### Schemas

```yaml
components:
  schemas:
    CompletionUsage:
      type: object
      required:
        - promptTokens
        - completionTokens
        - totalTokens
        - creditsUsed
        - credits
      properties:
        promptTokens:
          type: integer
          description: Number of tokens in the prompt
          example: 100
        completionTokens:
          type: integer
          description: Number of tokens in the completion
          example: 50
        totalTokens:
          type: integer
          description: Total tokens used (prompt + completion)
          example: 150
        creditsUsed:
          type: integer
          description: Credits deducted for this request
          example: 25
        cachedTokens:
          type: integer
          description: Cached tokens (Anthropic/Google only)
          example: 0
        credits:
          $ref: '#/components/schemas/CreditInfo'

    CreditInfo:
      type: object
      required:
        - deducted
        - remaining
        - subscriptionRemaining
        - purchasedRemaining
      properties:
        deducted:
          type: integer
          description: Credits deducted for this request
          example: 25
          minimum: 0
        remaining:
          type: integer
          description: Total credits remaining after deduction
          example: 1450
          minimum: 0
        subscriptionRemaining:
          type: integer
          description: Subscription credits remaining
          example: 1450
          minimum: 0
        purchasedRemaining:
          type: integer
          description: Purchased addon credits remaining
          example: 0
          minimum: 0
```

---

## Related Documentation

- **Migration Guide:** `docs/reference/191-desktop-client-credit-api-migration-guide.md`
- **Credit Deduction Flow:** `docs/reference/190-credit-deduction-flow-documentation.md`
- **API Standards:** `docs/reference/156-api-standards.md`
- **Type Definitions:** `backend/src/types/model-validation.ts`
- **Service Implementation:** `backend/src/services/llm.service.ts`
- **Unit Tests:** `backend/tests/unit/services/llm-credit-info.test.ts`
- **Self-Test Script:** `backend/test-credit-info-api.js`

---

## Changelog

### 2025-11-18 - Initial Release
- Created comprehensive API reference for credit info feature
- Documented both non-streaming and streaming response formats
- Added client integration examples
- Included validation rules and error handling
- Added OpenAPI specification snippets
