# Inference Flow Architecture

**Document Type**: Technical Reference
**Created**: 2025-11-15
**Status**: Current
**Related Documents**:
- [073-dedicated-api-backend-specification.md](../plan/073-dedicated-api-backend-specification.md) - API specification
- [156-api-standards.md](156-api-standards.md) - API development standards

---

## Executive Summary

This document provides a comprehensive walkthrough of the LLM inference request flow in the Rephlo platform, from client request to final response. It covers all components, middleware, services, and provider integrations involved in processing a chat or text completion request.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Complete Request Flow](#complete-request-flow)
3. [Component Details](#component-details)
4. [Middleware Pipeline](#middleware-pipeline)
5. [Provider Routing Strategy](#provider-routing-strategy)
6. [Credit Calculation & Deduction](#credit-calculation--deduction)
7. [Error Handling](#error-handling)
8. [Sequence Diagrams](#sequence-diagrams)
9. [Code References](#code-references)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────┐
│   Client    │ (Frontend App / API Consumer)
└─────┬───────┘
      │ HTTP POST /v1/chat/completions
      │ Authorization: Bearer <JWT>
      │ Body: { model, messages, ... }
      ▼
┌─────────────────────────────────────────────────┐
│         Express.js Backend (Port 7150)          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │      Middleware Pipeline (Sequential)     │ │
│  │  1. Helmet (Security Headers)             │ │
│  │  2. CORS (Cross-Origin)                   │ │
│  │  3. Body Parser (JSON)                    │ │
│  │  4. Morgan (HTTP Logging)                 │ │
│  │  5. Request ID (Tracing)                  │ │
│  │  6. Redis Init                            │ │
│  │  7. Rate Limit Headers                    │ │
│  │  8. Rate Limiter (Tier-based)             │ │
│  │  9. authMiddleware (JWT Validation)       │ │
│  │ 10. requireScope('llm.inference')         │ │
│  │ 11. checkCredits() (Pre-flight check)     │ │
│  └───────────────────────────────────────────┘ │
│                     ▼                           │
│  ┌───────────────────────────────────────────┐ │
│  │      ModelsController.chatCompletion      │ │
│  │  - Validate request (Zod schema)          │ │
│  │  - Get user tier                          │ │
│  │  - Get model info from ModelService       │ │
│  │  - Check tier access control              │ │
│  │  - Delegate to LLMService                 │ │
│  └───────────────────────────────────────────┘ │
│                     ▼                           │
│  ┌───────────────────────────────────────────┐ │
│  │         LLMService (Orchestrator)         │ │
│  │  - Route to correct provider              │ │
│  │  - Execute provider.chatCompletion()      │ │
│  │  - Calculate vendor cost & credits        │ │
│  │  - Deduct credits atomically              │ │
│  │  - Record token usage                     │ │
│  └───────────────────────────────────────────┘ │
│                     ▼                           │
│  ┌───────────────────────────────────────────┐ │
│  │   Provider (Strategy Pattern)             │ │
│  │  - OpenAIProvider                         │ │
│  │  - AnthropicProvider                      │ │
│  │  - GoogleProvider                         │ │
│  │  - AzureOpenAIProvider                    │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   External LLM Provider API │
        │  - OpenAI API               │
        │  - Anthropic API            │
        │  - Google AI API            │
        │  - Azure OpenAI API         │
        └─────────────────────────────┘
```

### Key Design Patterns

- **Strategy Pattern**: Provider abstraction (ILLMProvider interface)
- **Dependency Injection**: TSyringe container for service management
- **Middleware Chain**: Express middleware for cross-cutting concerns
- **3-Layer Architecture**: Controller → Service → Database/Provider
- **Atomic Operations**: Credit deduction + usage recording in single transaction

---

## Complete Request Flow

### Step-by-Step Flow (Chat Completion Example)

#### 1. Client Request

**HTTP Request**:
```http
POST http://localhost:7150/v1/chat/completions
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "What is the capital of France?" }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

**Client Code** (Frontend):
```typescript
const response = await fetch('http://localhost:7150/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
    max_tokens: 100,
    temperature: 0.7
  })
});

const result = await response.json();
console.log(result.choices[0].message.content); // "Paris is the capital of France."
```

---

#### 2. Middleware Pipeline Execution

**File**: `backend/src/server.ts`

The request passes through the following middleware in order:

##### 2.1. Security & Infrastructure Middleware

```typescript
// 1. Helmet - Security headers
app.use(helmet());

// 2. CORS - Cross-origin resource sharing
app.use(cors({ origin: process.env.CORS_ORIGIN }));

// 3. Body Parser - Parse JSON
app.use(express.json());

// 4. Morgan - HTTP request logging
app.use(morgan('combined'));

// 5. Request ID - Generate unique ID for tracing
app.use(requestIdMiddleware);

// 6. Redis Init - Ensure Redis connection
app.use(redisInitMiddleware);

// 7. Rate Limit Headers - Add rate limit info to response
app.use(rateLimitHeadersMiddleware);

// 8. Rate Limiter - Tier-based rate limiting (10-300 req/min)
app.use(rateLimiterMiddleware);
```

**Rate Limiting Logic** (Tier-based):
- **Free Tier**: 10 requests/minute
- **Pro Tier**: 60 requests/minute
- **Enterprise Tier**: 300 requests/minute

##### 2.2. Route-Specific Middleware

**File**: `backend/src/routes/v1.routes.ts:172-178`

```typescript
router.post(
  '/chat/completions',
  authMiddleware,              // JWT validation
  requireScope('llm.inference'), // Scope check
  checkCredits(),              // Credit pre-flight check
  asyncHandler(modelsController.chatCompletion.bind(modelsController))
);
```

**a. Authentication Middleware** (`authMiddleware`)

**File**: `backend/src/middleware/auth.middleware.ts`

```typescript
// Validates JWT token
// 1. Extract Bearer token from Authorization header
const token = req.headers.authorization?.replace('Bearer ', '');

// 2. Fetch JWKS from Identity Provider (cached 5 min)
const jwksUri = process.env.OIDC_JWKS_URL;

// 3. Verify JWT signature (RS256) using JWKS
const decoded = await verifyJwt(token, jwksUri);

// 4. Fallback to token introspection if JWT fails
const introspectionResult = await introspectToken(token);

// 5. Inject user claims into req.user
req.user = {
  sub: decoded.sub,           // User ID
  email: decoded.email,
  scope: decoded.scope,       // e.g., "openid email llm.inference models.read"
  role: decoded.role,         // e.g., "user" or "admin"
  permissions: decoded.permissions
};
```

**b. Scope Check Middleware** (`requireScope('llm.inference')`)

**File**: `backend/src/middleware/auth.middleware.ts`

```typescript
export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const scopes = req.user?.scope?.split(' ') || [];

    if (!scopes.includes(requiredScope)) {
      throw unauthorizedError(`Missing required scope: ${requiredScope}`);
    }

    next();
  };
}
```

**c. Credit Check Middleware** (`checkCredits()`)

**File**: `backend/src/middleware/credit.middleware.ts:38-100`

```typescript
export function checkCredits() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.sub;

    // 1. Get user's current credit record
    const creditService = container.resolve<CreditService>('ICreditService');
    const credit = await creditService.getCurrentCredits(userId);

    // 2. Calculate remaining credits
    const remainingCredits = creditService.calculateRemainingCredits(credit);

    // 3. Estimate credits required for this request
    const estimatedCredits = estimateCreditsRequired(req);

    // 4. Check if sufficient credits available
    if (remainingCredits < estimatedCredits) {
      throw forbiddenError('Insufficient credits', {
        required_credits: estimatedCredits,
        available_credits: remainingCredits
      });
    }

    // 5. Attach credit info to request (for downstream handlers)
    req.creditInfo = {
      creditId: credit.id,
      remainingCredits,
      estimatedCredits
    };

    next();
  };
}
```

**Credit Estimation Logic**:
```typescript
function estimateCreditsRequired(req: Request): number {
  const { model, max_tokens = 1000 } = req.body;

  // Rough estimation: 10 credits per 1000 tokens
  // Actual credits calculated after API call based on vendor cost
  return Math.ceil((max_tokens / 1000) * 10);
}
```

---

#### 3. Controller Layer Processing

**File**: `backend/src/controllers/models.controller.ts:331-431`

```typescript
async chatCompletion(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req); // Extract from req.user.sub

  // 1. Validate request body using Zod schema
  const parseResult = chatCompletionSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw validationError('Request validation failed', errors);
  }

  const request: ChatCompletionRequest = parseResult.data;

  // 2. Get user tier for access control
  const userTier = await getUserTier(userId); // "free", "pro", "enterprise_pro", etc.

  // 3. Get model information from database
  const modelInfo = await this.modelService.getModelForInference(request.model);

  if (!modelInfo) {
    throw notFoundError(`Model '${request.model}' not found or unavailable`);
  }

  // 4. Tier access validation (NEW in model tier management)
  const accessCheck = await this.modelService.canUserAccessModel(
    request.model,
    userTier
  );

  if (!accessCheck.allowed) {
    throw createApiError(
      `Model access restricted: ${accessCheck.reason}`,
      403,
      'model_access_restricted',
      {
        model_id: request.model,
        user_tier: userTier,
        required_tier: accessCheck.requiredTier,
        upgrade_url: '/subscriptions/upgrade'
      }
    );
  }

  // 5. Execute completion request (delegate to LLMService)
  if (request.stream) {
    // Streaming response
    await this.llmService.streamChatCompletion(
      request,
      modelInfo.provider, // "openai", "anthropic", "google"
      userId,
      res
    );
  } else {
    // Non-streaming response
    const result = await this.llmService.chatCompletion(
      request,
      modelInfo.provider,
      userId
    );

    res.status(200).json(result);
  }
}
```

**Model Info Structure**:
```typescript
interface ModelInfo {
  id: string;                // "gpt-4"
  provider: string;          // "openai"
  isAvailable: boolean;
  requiredTier: SubscriptionTier;
  tierRestrictionMode: 'minimum' | 'exact' | 'whitelist';
}
```

---

#### 4. LLM Service Orchestration

**File**: `backend/src/services/llm.service.ts:197-292`

```typescript
async chatCompletion(
  request: ChatCompletionRequest,
  modelProvider: string,      // "openai"
  userId: string
): Promise<ChatCompletionResponse> {

  // 1. Get provider instance from provider map (O(1) lookup)
  const provider = this.getProvider(modelProvider);

  const startTime = Date.now();
  const requestId = randomUUID(); // Generate unique request ID

  // 2. Delegate to provider (Strategy Pattern)
  const { response, usage } = await provider.chatCompletion(request);

  // response: { id, object, created, model, choices }
  // usage: { promptTokens, completionTokens, totalTokens, cachedTokens? }

  const duration = Date.now() - startTime;

  // 3. Calculate credits from vendor cost (Plan 161 provider pricing)
  const pricingData = await this.calculateCreditsFromVendorCost(
    userId,
    request.model,
    modelProvider,
    usage.promptTokens,
    usage.completionTokens,
    usage.cachedTokens
  );

  // pricingData: {
  //   credits: 15,
  //   providerId: "uuid-of-openai",
  //   vendorCost: 0.00150,
  //   marginMultiplier: 1.0,
  //   grossMargin: 0.00135
  // }

  // 4. Deduct credits atomically with token usage record
  const requestStartedAt = new Date(startTime);
  const requestCompletedAt = new Date();

  const tokenUsageRecord = {
    requestId,
    userId,
    modelId: request.model,
    providerId: pricingData.providerId,
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    cachedInputTokens: usage.cachedTokens || 0,
    totalTokens: usage.totalTokens,
    vendorCost: pricingData.vendorCost,
    creditDeducted: pricingData.credits,
    marginMultiplier: pricingData.marginMultiplier,
    grossMargin: pricingData.grossMargin,
    requestType: 'completion',
    requestStartedAt,
    requestCompletedAt,
    processingTime: duration,
    status: 'success',
    createdAt: requestCompletedAt
  };

  await this.creditDeductionService.deductCreditsAtomically(
    userId,
    pricingData.credits,
    requestId,
    tokenUsageRecord
  );

  // 5. Build final response with credit usage
  const finalResponse: ChatCompletionResponse = {
    ...response,
    usage: {
      ...usage,
      creditsUsed: pricingData.credits  // Add credit info
    }
  };

  return finalResponse;
}
```

**Credit Calculation Deep Dive**:

**File**: `backend/src/services/llm.service.ts:93-191`

```typescript
private async calculateCreditsFromVendorCost(
  userId: string,
  modelId: string,
  providerName: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens?: number
): Promise<{
  credits: number;
  providerId: string;
  vendorCost: number;
  marginMultiplier: number;
  grossMargin: number;
}> {

  // Step 1: Look up provider UUID from provider name
  const provider = await this.prisma.provider.findUnique({
    where: { name: providerName },
    select: { id: true }
  });

  // Step 2: Calculate vendor cost (from ProviderPricing table)
  const costCalculation = await this.costCalculationService.calculateVendorCost({
    inputTokens,
    outputTokens,
    modelId,
    providerId: provider.id,
    cachedInputTokens
  });

  // Example:
  // GPT-4: $0.03/1K input, $0.06/1K output
  // Input: 100 tokens = $0.003
  // Output: 50 tokens = $0.003
  // Total vendor cost = $0.006

  // Step 3: Get margin multiplier for user's tier
  const marginMultiplier = await this.pricingConfigService.getApplicableMultiplier(
    userId,
    provider.id,
    modelId
  );

  // Free tier: 1.0x, Pro tier: 1.0x, Enterprise: 0.9x

  // Step 4: Apply formula: credits = ceil(vendorCost × marginMultiplier × 100)
  // Where × 100 converts USD to credits (1 credit = $0.01)
  const credits = Math.ceil(costCalculation.vendorCost * marginMultiplier * 100);

  // Example: ceil(0.006 × 1.0 × 100) = ceil(0.6) = 1 credit

  // Step 5: Calculate gross margin (revenue - cost)
  const creditValueUsd = credits * 0.01; // 1 credit = $0.01
  const grossMargin = creditValueUsd - costCalculation.vendorCost;

  // Example: $0.01 - $0.006 = $0.004 margin

  return {
    credits,
    providerId: provider.id,
    vendorCost: costCalculation.vendorCost,
    marginMultiplier,
    grossMargin
  };
}
```

---

#### 5. Provider Execution (Strategy Pattern)

**File**: `backend/src/providers/openai.provider.ts:34-86`

```typescript
async chatCompletion(request: ChatCompletionRequest): Promise<{
  response: Omit<ChatCompletionResponse, 'usage'>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {

  // 1. Call OpenAI API using SDK
  const completion = await this.client.chat.completions.create({
    model: request.model,              // "gpt-4"
    messages: request.messages,        // [{ role: "user", content: "..." }]
    max_tokens: request.max_tokens,    // 100
    temperature: request.temperature,  // 0.7
    top_p: request.top_p,
    stop: request.stop,
    presence_penalty: request.presence_penalty,
    frequency_penalty: request.frequency_penalty,
    n: request.n,
    functions: request.functions,
    function_call: request.function_call
  });

  // 2. Transform OpenAI response to common format
  return {
    response: {
      id: completion.id,                    // "chatcmpl-abc123"
      object: 'chat.completion',
      created: completion.created,           // Unix timestamp
      model: completion.model,               // "gpt-4-0613"
      choices: completion.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role,        // "assistant"
          content: choice.message.content   // "Paris is the capital of France."
        },
        finish_reason: choice.finish_reason // "stop"
      }))
    },
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,       // 20
      completionTokens: completion.usage?.completion_tokens || 0, // 8
      totalTokens: completion.usage?.total_tokens || 0           // 28
    }
  };
}
```

**Other Providers**:

- **AnthropicProvider** (`backend/src/providers/anthropic.provider.ts`):
  - Uses `@anthropic-ai/sdk`
  - Supports prompt caching (cached_tokens)
  - Different message format (system message separate)

- **GoogleProvider** (`backend/src/providers/google.provider.ts`):
  - Uses `@google/generative-ai`
  - Supports Gemini models
  - Different API structure

- **AzureOpenAIProvider** (`backend/src/providers/azure-openai.provider.ts`):
  - Uses OpenAI SDK with Azure endpoint
  - Requires deployment name mapping

---

#### 6. External LLM API Call

**External API Request** (OpenAI Example):

```http
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer sk-...
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "What is the capital of France?" }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

**External API Response**:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4-0613",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Paris is the capital of France."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 8,
    "total_tokens": 28
  }
}
```

---

#### 7. Credit Deduction & Usage Recording

**File**: `backend/src/services/credit-deduction.service.ts`

```typescript
async deductCreditsAtomically(
  userId: string,
  creditsToDeduct: number,
  requestId: string,
  tokenUsageRecord: TokenUsageRecord
): Promise<void> {

  // Atomic transaction: Credit deduction + Token usage recording
  await this.prisma.$transaction(async (tx) => {

    // 1. Get current credit record with row lock
    const credit = await tx.credit.findFirst({
      where: {
        userId,
        status: 'active',
        expiresAt: { gte: new Date() }
      },
      orderBy: { expiresAt: 'asc' }
    });

    // 2. Calculate new usage
    const newUsage = credit.used + creditsToDeduct;

    // 3. Update credit usage (atomic increment)
    await tx.credit.update({
      where: { id: credit.id },
      data: { used: newUsage }
    });

    // 4. Record token usage in ledger
    await tx.tokenUsageLedger.create({
      data: {
        ...tokenUsageRecord,
        creditId: credit.id
      }
    });

    // 5. Log the deduction
    logger.info('Credits deducted atomically', {
      userId,
      requestId,
      creditsDeducted: creditsToDeduct,
      newUsage
    });
  });
}
```

**Database Tables Updated**:

1. **`Credit` Table**:
```sql
UPDATE "Credit"
SET used = used + 1
WHERE id = 'credit-uuid'
  AND status = 'active'
  AND expires_at >= NOW();
```

2. **`TokenUsageLedger` Table**:
```sql
INSERT INTO "TokenUsageLedger" (
  id, request_id, user_id, model_id, provider_id, credit_id,
  input_tokens, output_tokens, cached_input_tokens, total_tokens,
  vendor_cost, credit_deducted, margin_multiplier, gross_margin,
  request_type, request_started_at, request_completed_at,
  processing_time, status, created_at
) VALUES (
  'uuid', 'request-uuid', 'user-uuid', 'gpt-4', 'provider-uuid', 'credit-uuid',
  20, 8, 0, 28,
  0.006, 1, 1.0, 0.004,
  'completion', '2025-11-15 10:30:00', '2025-11-15 10:30:01',
  1000, 'success', NOW()
);
```

---

#### 8. Response to Client

**Final Response** (from backend to client):

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4-0613",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Paris is the capital of France."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 20,
    "completionTokens": 8,
    "totalTokens": 28,
    "creditsUsed": 1
  }
}
```

**Frontend Handling**:

```typescript
const result = await response.json();

// Display response to user
console.log(result.choices[0].message.content); // "Paris is the capital of France."

// Update UI with credit usage
updateCreditBalance(result.usage.creditsUsed); // Deduct 1 credit
```

---

## Component Details

### 1. ModelsController

**Responsibilities**:
- HTTP request/response handling
- Request validation (Zod schemas)
- User tier retrieval
- Model access control validation
- Delegation to LLMService

**Key Methods**:
- `chatCompletion(req, res)` - POST /v1/chat/completions
- `textCompletion(req, res)` - POST /v1/completions
- `listModels(req, res)` - GET /v1/models
- `getModelDetails(req, res)` - GET /v1/models/:modelId

**File**: `backend/src/controllers/models.controller.ts`

---

### 2. LLMService

**Responsibilities**:
- Provider routing (Strategy Pattern)
- Credit calculation from vendor cost
- Atomic credit deduction + usage recording
- Error handling and logging

**Key Methods**:
- `chatCompletion(request, provider, userId)` - Orchestrate chat completion
- `textCompletion(request, provider, userId)` - Orchestrate text completion
- `streamChatCompletion(...)` - Handle streaming responses
- `calculateCreditsFromVendorCost(...)` - Calculate credits using provider pricing

**File**: `backend/src/services/llm.service.ts`

**Dependencies** (Injected via TSyringe):
- `ICostCalculationService` - Calculate vendor cost from token usage
- `IPricingConfigService` - Get margin multiplier by tier
- `ICreditDeductionService` - Deduct credits atomically
- `PrismaClient` - Database access

---

### 3. Provider Implementations

**Interface**: `ILLMProvider`

```typescript
interface ILLMProvider {
  providerName: string; // "openai", "anthropic", "google", "azure-openai"

  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cachedTokens?: number;
    };
  }>;

  streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number>;

  textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;

  streamTextCompletion(request: TextCompletionRequest, res: Response): Promise<number>;
}
```

**Implementations**:

1. **OpenAIProvider** (`backend/src/providers/openai.provider.ts`)
   - SDK: `openai` npm package
   - Models: GPT-4, GPT-3.5-Turbo, etc.
   - Supports function calling

2. **AnthropicProvider** (`backend/src/providers/anthropic.provider.ts`)
   - SDK: `@anthropic-ai/sdk`
   - Models: Claude 3 Opus, Sonnet, Haiku
   - Supports prompt caching (cachedTokens)

3. **GoogleProvider** (`backend/src/providers/google.provider.ts`)
   - SDK: `@google/generative-ai`
   - Models: Gemini Pro, Gemini Pro Vision
   - Different message format

4. **AzureOpenAIProvider** (`backend/src/providers/azure-openai.provider.ts`)
   - SDK: `openai` with Azure endpoint
   - Requires deployment name mapping

---

### 4. ModelService

**Responsibilities**:
- Model database queries
- Tier access control validation
- Model availability checks
- Capability filtering

**Key Methods**:
- `listModels(filters, userTier)` - Get models with tier metadata
- `getModelDetails(modelId, userTier)` - Get single model with access status
- `getModelForInference(modelId)` - Get model info for inference (provider, availability)
- `canUserAccessModel(modelId, userTier)` - Check tier access control

**File**: `backend/src/services/model.service.ts`

---

### 5. CreditService

**Responsibilities**:
- Credit balance queries
- Credit lifecycle management
- Remaining credit calculation

**Key Methods**:
- `getCurrentCredits(userId)` - Get active credit record
- `calculateRemainingCredits(credit)` - allocated - used
- `createMonthlyCredits(subscription)` - Monthly credit allocation
- `expireCredits()` - Expire old credits (cron job)

**File**: `backend/src/services/credit.service.ts`

---

### 6. CreditDeductionService

**Responsibilities**:
- Atomic credit deduction
- Token usage recording
- Transaction management

**Key Methods**:
- `deductCreditsAtomically(userId, credits, requestId, tokenUsageRecord)` - Main deduction method

**File**: `backend/src/services/credit-deduction.service.ts`

---

### 7. CostCalculationService

**Responsibilities**:
- Calculate vendor cost from token usage
- Look up provider pricing from database
- Handle cached tokens (Anthropic/Google)

**Key Methods**:
- `calculateVendorCost({ inputTokens, outputTokens, modelId, providerId, cachedInputTokens? })` - Calculate cost in USD

**File**: `backend/src/services/cost-calculation.service.ts`

**Pricing Lookup**:
```sql
SELECT
  input_cost_per_million_tokens,
  output_cost_per_million_tokens,
  cached_input_cost_per_million_tokens
FROM "ProviderPricing"
WHERE model_id = 'gpt-4'
  AND provider_id = 'openai-uuid'
  AND is_active = true;
```

**Calculation**:
```typescript
const inputCost = (inputTokens / 1_000_000) * pricing.input_cost_per_million_tokens;
const outputCost = (outputTokens / 1_000_000) * pricing.output_cost_per_million_tokens;
const cachedCost = (cachedInputTokens / 1_000_000) * pricing.cached_input_cost_per_million_tokens;

const vendorCost = inputCost + outputCost + cachedCost;
```

---

### 8. PricingConfigService

**Responsibilities**:
- Margin multiplier lookup by tier
- Tier-specific pricing configuration

**Key Methods**:
- `getApplicableMultiplier(userId, providerId, modelId)` - Get margin multiplier for user's tier

**File**: `backend/src/services/pricing-config.service.ts`

**Database Lookup**:
```sql
SELECT margin_multiplier
FROM "PricingConfiguration"
WHERE tier = 'pro'
  AND provider_id = 'openai-uuid'
  AND (model_id = 'gpt-4' OR model_id IS NULL)
  AND is_active = true;
```

---

## Middleware Pipeline

### Middleware Execution Order

```
Request
  ↓
1. Helmet (Security Headers)
  ↓
2. CORS (Cross-Origin)
  ↓
3. Body Parser (JSON)
  ↓
4. Morgan (HTTP Logging)
  ↓
5. Request ID (Tracing)
  ↓
6. Redis Init (Connection Check)
  ↓
7. Rate Limit Headers (Add X-RateLimit-* headers)
  ↓
8. Rate Limiter (Tier-based throttling)
  ↓
9. authMiddleware (JWT Validation) ← Route-specific
  ↓
10. requireScope('llm.inference') ← Route-specific
  ↓
11. checkCredits() ← Route-specific
  ↓
Controller Handler
```

### Middleware Details

#### 1. Authentication Middleware

**Purpose**: Validate JWT token and inject user claims

**Steps**:
1. Extract `Authorization: Bearer <token>` header
2. Fetch JWKS from `http://localhost:7151/oauth/jwks` (cached 5 min)
3. Verify JWT signature (RS256) using public key
4. Fallback to token introspection if JWT fails
5. Inject `req.user` with claims

**Claims Structure**:
```typescript
req.user = {
  sub: "ccc789d4-3965-4a2a-a76d-70aef4de0244", // User ID
  email: "user@example.com",
  scope: "openid email profile llm.inference models.read user.info credits.read",
  role: "user",
  permissions: ["read:own_profile", "create:inference"],
  iat: 1763131242,  // Issued at (Unix timestamp)
  exp: 1763134842   // Expires at (Unix timestamp)
};
```

**File**: `backend/src/middleware/auth.middleware.ts`

---

#### 2. Scope Validation Middleware

**Purpose**: Ensure user has required OAuth scope

**Example**:
```typescript
requireScope('llm.inference')
```

**Validation**:
```typescript
const scopes = req.user?.scope?.split(' ') || [];
if (!scopes.includes('llm.inference')) {
  throw unauthorizedError('Missing required scope: llm.inference');
}
```

---

#### 3. Credit Check Middleware

**Purpose**: Pre-flight check for sufficient credits

**Steps**:
1. Get user's current credit record
2. Calculate remaining credits (allocated - used)
3. Estimate credits required for request
4. Return 403 if insufficient
5. Attach `req.creditInfo` for downstream handlers

**Estimation Algorithm**:
```typescript
function estimateCreditsRequired(req: Request): number {
  const { model, max_tokens = 1000 } = req.body;

  // Simple estimation: 10 credits per 1000 tokens
  // Actual cost calculated after API call
  return Math.ceil((max_tokens / 1000) * 10);
}
```

**File**: `backend/src/middleware/credit.middleware.ts`

---

## Provider Routing Strategy

### Provider Map (O(1) Lookup)

**Initialization** (`backend/src/services/llm.service.ts:38-62`):

```typescript
constructor() {
  // Resolve all registered providers from DI container
  const allProviders = diContainer.resolveAll<ILLMProvider>('ILLMProvider');

  // Build provider map for O(1) lookup
  this.providerMap = new Map(
    allProviders.map((p) => [p.providerName, p])
  );

  // providerMap:
  // {
  //   "openai" => OpenAIProvider,
  //   "anthropic" => AnthropicProvider,
  //   "google" => GoogleProvider,
  //   "azure-openai" => AzureOpenAIProvider
  // }
}
```

### Provider Selection

**Step 1: Model Lookup** (`ModelService.getModelForInference`)

```typescript
const model = await prisma.model.findUnique({
  where: { id: 'gpt-4' },
  select: {
    id: true,
    provider: true,    // "openai"
    isAvailable: true
  }
});
```

**Step 2: Provider Routing** (`LLMService.getProvider`)

```typescript
private getProvider(providerName: string): ILLMProvider {
  const provider = this.providerMap.get(providerName);

  if (!provider) {
    throw new Error(
      `Unsupported provider: ${providerName}. Available: ${Array.from(
        this.providerMap.keys()
      ).join(', ')}`
    );
  }

  return provider;
}
```

**Step 3: Provider Execution**

```typescript
const provider = this.getProvider('openai'); // OpenAIProvider instance
const { response, usage } = await provider.chatCompletion(request);
```

---

## Credit Calculation & Deduction

### Formula

```
credits = ceil(vendorCost × marginMultiplier × 100)
```

Where:
- **vendorCost**: Actual cost from LLM provider (USD)
- **marginMultiplier**: Tier-based multiplier (0.9-1.0x)
- **100**: Conversion factor (1 credit = $0.01)

### Example Calculation

**Scenario**: GPT-4 request with 100 input tokens, 50 output tokens

**Step 1: Look up provider pricing**
```sql
SELECT
  input_cost_per_million_tokens,   -- $30.00
  output_cost_per_million_tokens    -- $60.00
FROM "ProviderPricing"
WHERE model_id = 'gpt-4'
  AND provider_id = 'openai-uuid';
```

**Step 2: Calculate vendor cost**
```typescript
inputCost = (100 / 1_000_000) × 30.00 = $0.003
outputCost = (50 / 1_000_000) × 60.00 = $0.003
vendorCost = $0.003 + $0.003 = $0.006
```

**Step 3: Get margin multiplier**
```sql
SELECT margin_multiplier  -- 1.0 for Pro tier
FROM "PricingConfiguration"
WHERE tier = 'pro'
  AND provider_id = 'openai-uuid';
```

**Step 4: Calculate credits**
```typescript
credits = ceil($0.006 × 1.0 × 100)
credits = ceil(0.6)
credits = 1
```

**Step 5: Calculate gross margin**
```typescript
creditValueUsd = 1 × $0.01 = $0.01
grossMargin = $0.01 - $0.006 = $0.004
```

### Atomic Deduction

**Transaction** (`CreditDeductionService.deductCreditsAtomically`):

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update credit usage
  await tx.credit.update({
    where: { id: creditId },
    data: { used: { increment: 1 } }  // Atomic increment
  });

  // 2. Record token usage
  await tx.tokenUsageLedger.create({
    data: {
      requestId,
      userId,
      modelId: 'gpt-4',
      providerId: 'openai-uuid',
      creditId,
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      vendorCost: 0.006,
      creditDeducted: 1,
      marginMultiplier: 1.0,
      grossMargin: 0.004,
      requestType: 'completion',
      status: 'success',
      processingTime: 1234,
      createdAt: new Date()
    }
  });
});
```

**Why Atomic?**
- Prevents race conditions (concurrent requests)
- Ensures data consistency
- Rollback on failure (all-or-nothing)

---

## Error Handling

### Error Types

1. **Authentication Errors** (401 Unauthorized)
   - Invalid JWT token
   - Expired token
   - Missing Authorization header

2. **Authorization Errors** (403 Forbidden)
   - Insufficient credits
   - Missing OAuth scope
   - Tier access restriction

3. **Validation Errors** (400 Bad Request)
   - Invalid request body (Zod validation)
   - Missing required fields
   - Invalid model ID

4. **Not Found Errors** (404 Not Found)
   - Model not found
   - User not found

5. **Provider Errors** (503 Service Unavailable)
   - Provider API key not configured
   - Provider API down
   - Rate limit exceeded (provider-side)

6. **Rate Limit Errors** (429 Too Many Requests)
   - Tier-based rate limit exceeded

### Error Response Format

```json
{
  "error": {
    "code": "insufficient_credits",
    "message": "Insufficient credits",
    "details": {
      "required_credits": 10,
      "available_credits": 5,
      "message": "You do not have enough credits to complete this request. Please upgrade your subscription or wait for the next billing period."
    }
  }
}
```

### Centralized Error Handler

**File**: `backend/src/middleware/error.middleware.ts`

```typescript
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error handler', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestId: req.id,
    userId: req.user?.sub
  });

  // Return standardized error response
  res.status(err.statusCode || 500).json({
    error: {
      code: err.code || 'internal_error',
      message: err.message,
      details: err.details
    }
  });
}
```

---

## Sequence Diagrams

### Non-Streaming Chat Completion Flow

```
┌────────┐      ┌──────────┐      ┌────────────┐      ┌────────────┐      ┌──────────┐      ┌─────────────┐
│ Client │      │ Express  │      │  Models    │      │    LLM     │      │ Provider │      │  OpenAI API │
│        │      │ Middleware│      │ Controller │      │  Service   │      │ (OpenAI) │      │             │
└───┬────┘      └─────┬────┘      └─────┬──────┘      └─────┬──────┘      └────┬─────┘      └──────┬──────┘
    │                 │                  │                   │                   │                   │
    │ POST /v1/chat/  │                  │                   │                   │                   │
    │ completions     │                  │                   │                   │                   │
    ├────────────────>│                  │                   │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │ 1. authMiddleware│                   │                   │                   │
    │                 │ (JWT validation) │                   │                   │                   │
    │                 ├─────────────────>│                   │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │ 2. requireScope  │                   │                   │                   │
    │                 ├─────────────────>│                   │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │ 3. checkCredits()│                   │                   │                   │
    │                 ├─────────────────>│                   │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │ 4. Route to      │                   │                   │                   │
    │                 │    controller    │                   │                   │                   │
    │                 ├─────────────────>│                   │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │ 5. Validate       │                   │                   │
    │                 │                  │    request (Zod)  │                   │                   │
    │                 │                  ├──────────┐        │                   │                   │
    │                 │                  │          │        │                   │                   │
    │                 │                  │<─────────┘        │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │ 6. Get model info │                   │                   │
    │                 │                  │    & check tier   │                   │                   │
    │                 │                  ├──────────┐        │                   │                   │
    │                 │                  │          │        │                   │                   │
    │                 │                  │<─────────┘        │                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │ 7. chatCompletion │                   │                   │
    │                 │                  ├──────────────────>│                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │ 8. Get provider   │                   │
    │                 │                  │                   │    (openai)       │                   │
    │                 │                  │                   ├──────────┐        │                   │
    │                 │                  │                   │          │        │                   │
    │                 │                  │                   │<─────────┘        │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │ 9. provider.chat  │                   │
    │                 │                  │                   │    Completion()   │                   │
    │                 │                  │                   ├──────────────────>│                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │                   │ 10. OpenAI API    │
    │                 │                  │                   │                   │     call          │
    │                 │                  │                   │                   ├──────────────────>│
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │                   │ 11. Response      │
    │                 │                  │                   │                   │<──────────────────┤
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │ 12. Return        │                   │
    │                 │                  │                   │     response +    │                   │
    │                 │                  │                   │     usage         │                   │
    │                 │                  │                   │<──────────────────┤                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │ 13. Calculate     │                   │
    │                 │                  │                   │     credits       │                   │
    │                 │                  │                   ├──────────┐        │                   │
    │                 │                  │                   │          │        │                   │
    │                 │                  │                   │<─────────┘        │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │                   │ 14. Deduct        │                   │
    │                 │                  │                   │     credits       │                   │
    │                 │                  │                   │     atomically    │                   │
    │                 │                  │                   ├──────────┐        │                   │
    │                 │                  │                   │          │        │                   │
    │                 │                  │                   │<─────────┘        │                   │
    │                 │                  │                   │                   │                   │
    │                 │                  │ 15. Return final  │                   │                   │
    │                 │                  │     response      │                   │                   │
    │                 │                  │<──────────────────┤                   │                   │
    │                 │                  │                   │                   │                   │
    │                 │ 16. JSON response│                   │                   │                   │
    │                 │<─────────────────┤                   │                   │                   │
    │                 │                  │                   │                   │                   │
    │ 17. Response    │                  │                   │                   │                   │
    │<────────────────┤                  │                   │                   │                   │
    │                 │                  │                   │                   │                   │
```

---

## Code References

### Key Files

1. **Routes**: `backend/src/routes/v1.routes.ts:172-178`
2. **Controller**: `backend/src/controllers/models.controller.ts:331-431`
3. **LLM Service**: `backend/src/services/llm.service.ts:197-292`
4. **Provider Interface**: `backend/src/interfaces/providers/llm-provider.interface.ts`
5. **OpenAI Provider**: `backend/src/providers/openai.provider.ts:34-86`
6. **Anthropic Provider**: `backend/src/providers/anthropic.provider.ts`
7. **Google Provider**: `backend/src/providers/google.provider.ts`
8. **Azure OpenAI Provider**: `backend/src/providers/azure-openai.provider.ts`
9. **Credit Middleware**: `backend/src/middleware/credit.middleware.ts:38-100`
10. **Auth Middleware**: `backend/src/middleware/auth.middleware.ts`
11. **Credit Deduction**: `backend/src/services/credit-deduction.service.ts`
12. **Cost Calculation**: `backend/src/services/cost-calculation.service.ts`
13. **Pricing Config**: `backend/src/services/pricing-config.service.ts`
14. **Model Service**: `backend/src/services/model.service.ts`
15. **DI Container**: `backend/src/container.ts:150-165` (Provider registration)

---

## Summary

### Key Takeaways

1. **Middleware Chain**: 11-layer pipeline for security, auth, rate limiting, and credit checks
2. **3-Layer Architecture**: Controller → Service → Provider/Database
3. **Strategy Pattern**: Provider abstraction for multi-LLM support
4. **Dependency Injection**: TSyringe container for loose coupling
5. **Atomic Operations**: Credit deduction + usage recording in single transaction
6. **Provider Pricing**: Accurate vendor cost calculation with tier-based margins
7. **Tier Access Control**: Model restrictions based on subscription tier
8. **Comprehensive Logging**: Winston structured logging for debugging and analytics

### Performance Notes

- **Provider Map Lookup**: O(1) time complexity
- **JWT Validation**: JWKS cached for 5 minutes (reduced network calls)
- **Database Queries**: Optimized with indexes on foreign keys
- **Atomic Transactions**: Prevents race conditions in concurrent requests
- **Credit Check**: Pre-flight estimation prevents wasted API calls

### Security Measures

- **JWT Validation**: RS256 signature verification with JWKS
- **Scope Enforcement**: OAuth 2.0 scopes for fine-grained permissions
- **Rate Limiting**: Tier-based throttling (10-300 req/min)
- **Input Validation**: Zod schemas for all request bodies
- **Error Handling**: Sanitized error messages (no sensitive data)
- **Audit Logging**: All inference requests logged with user ID and request ID

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Maintained By**: Backend Team
