# Credit Deduction Flow Documentation

**Document ID**: 190
**Created**: 2025-01-17
**Status**: Active
**Related Documents**:
- `docs/plan/112-token-to-credit-conversion-mechanism.md`
- `docs/reference/189-tier-config-api-documentation.md`
- `docs/reference/156-api-standards.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Credit Deduction Flow](#credit-deduction-flow)
4. [Database Schema](#database-schema)
5. [Service Methods](#service-methods)
6. [Query Examples](#query-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Monitoring & Analytics](#monitoring--analytics)

---

## Overview

The credit deduction system is a **dual-ledger architecture** that provides atomic credit deductions with comprehensive audit trails. It ensures transaction safety, prevents race conditions, and maintains detailed records of all token usage and credit consumption.

### Key Features

- **Atomic Transactions**: All deductions use Serializable isolation level
- **Dual Ledger System**: Separate tables for token usage and credit deductions
- **Immutable Audit Trail**: Records never deleted, only marked as reversed
- **Balance Snapshots**: Before/after balance recording for verification
- **Financial Tracking**: Vendor costs, margins, and gross profit calculation
- **Refund Support**: Reversible deductions with admin audit trail

### Design Principles

1. **Safety First**: Prevent double-charging through transaction locks
2. **Transparency**: Every credit deduction is fully traceable
3. **Accuracy**: Token counts from actual LLM provider responses
4. **Accountability**: Admin actions for reversals are logged

---

## Architecture Components

### 1. Service Layer

**`CreditDeductionService`** (`backend/src/services/credit-deduction.service.ts`)
- Atomic credit deduction operations
- Balance validation and management
- Deduction history retrieval
- Refund/reversal operations

**`TokenTrackingService`** (`backend/src/services/token-tracking.service.ts`)
- Token usage parsing (OpenAI, Anthropic, Google formats)
- Token usage recording to ledger
- Daily summary aggregation
- Streaming completion tracking

**`CostCalculationService`** (injected dependency)
- Vendor cost calculation from token counts
- Pricing lookup from `model_provider_pricing` table

**`PricingConfigService`** (injected dependency)
- Margin multiplier retrieval
- Tier-based pricing configuration

### 2. Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `token_usage_ledger` | Token-level tracking | `request_id`, `input_tokens`, `output_tokens`, `credits_deducted` |
| `credit_deduction_ledger` | Credit deduction audit | `balance_before`, `balance_after`, `status`, `reversed_at` |
| `user_credit_balance` | Current balance snapshot | `amount`, `last_deduction_at`, `last_deduction_amount` |
| `token_usage_daily_summary` | Pre-aggregated analytics | `total_credits`, `total_requests`, `avg_request_latency_ms` |

### 3. Foreign Key Relationships

```
token_usage_ledger.request_id ←→ credit_deduction_ledger.request_id (1:1)
token_usage_ledger.deduction_record_id → credit_deduction_ledger.id (1:1)
token_usage_ledger.user_id → users.id
credit_deduction_ledger.user_id → users.id
credit_deduction_ledger.reversed_by → users.id (admin who reversed)
```

---

## Credit Deduction Flow

### Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER REQUEST: POST /v1/chat/completions                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PRE-FLIGHT ESTIMATION                                       │
│    - estimateCreditsForRequest(userId, modelId, ...)          │
│    - Formula: credits = ceil(vendorCost × margin × 100 × 1.1) │
│    - Returns: estimatedCredits (conservative)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. BALANCE VALIDATION                                          │
│    - validateSufficientCredits(userId, creditsNeeded)         │
│    - Check: currentBalance >= creditsNeeded                    │
│    - If insufficient: return suggestions (upgrade tier, etc.)  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. LLM API CALL                                                │
│    - Call OpenAI/Anthropic/Google API                         │
│    - Receive response with actual token counts                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PARSE TOKEN USAGE                                           │
│    - TokenTrackingService.parseTokenUsage(apiResponse)        │
│    - Extract: inputTokens, outputTokens, cachedInputTokens    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. CALCULATE ACTUAL COST                                       │
│    - CostCalculationService.calculateVendorCost(...)          │
│    - PricingConfigService.getApplicableMultiplier(...)        │
│    - creditsDeducted = ceil(vendorCost × multiplier / 0.01)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. ATOMIC DEDUCTION TRANSACTION (Serializable)                │
│    ┌───────────────────────────────────────────────────────┐  │
│    │ 7a. Lock user balance (SELECT FOR UPDATE)           │  │
│    │ 7b. Pre-check: balance >= creditsToDeduct           │  │
│    │ 7c. Calculate newBalance = current - deducted       │  │
│    │ 7d. UPDATE user_credit_balance                      │  │
│    │ 7e. INSERT token_usage_ledger                       │  │
│    │ 7f. INSERT credit_deduction_ledger                  │  │
│    │ 7g. Link: UPDATE token_usage_ledger.deduction_id    │  │
│    │ 7h. UPSERT token_usage_daily_summary                │  │
│    └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RETURN RESPONSE                                             │
│    - LLM completion text                                       │
│    - Updated credit balance                                    │
│    - Request metadata                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Breakdown

#### Step 1-3: Pre-Flight Checks

**Purpose**: Ensure user has sufficient credits before making expensive LLM API call.

**File**: `backend/src/services/credit-deduction.service.ts`

```typescript
// Step 1: Estimate credits needed (conservative estimation)
const estimatedCredits = await creditDeductionService.estimateCreditsForRequest(
  userId,
  modelId,
  providerName,
  estimatedInputTokens,   // Based on prompt length
  estimatedOutputTokens   // Based on max_tokens parameter
);

// Step 2: Validate user has sufficient balance
const validation = await creditDeductionService.validateSufficientCredits(
  userId,
  estimatedCredits
);

if (!validation.sufficient) {
  throw new InsufficientCreditsError(
    `Need ${validation.required} credits, have ${validation.currentBalance}. ` +
    `Suggestions: ${validation.suggestions.join(', ')}`
  );
}
```

**Estimation Formula** (lines 43-126):
```typescript
// Get pricing from model_provider_pricing table
const inputCost = (estimatedInputTokens / 1000) * inputPricePer1k;
const outputCost = (estimatedOutputTokens / 1000) * outputPricePer1k;
const vendorCost = inputCost + outputCost;

// Apply margin multiplier (default: 1.5) with 10% safety margin
const estimatedCredits = Math.ceil(vendorCost * marginMultiplier * 100 * 1.1);
```

**Why Conservative?**
- Prevents failed API calls due to insufficient credits
- 10% safety margin accounts for estimation variance
- Falls back to high cost if pricing data unavailable

#### Step 4-6: LLM API Call & Token Parsing

**File**: `backend/src/services/token-tracking.service.ts`

```typescript
// Step 4: Call LLM provider API (OpenAI, Anthropic, Google)
const apiResponse = await llmProvider.createChatCompletion(request);

// Step 5: Parse vendor-specific token counts
const usage = tokenTrackingService.parseTokenUsage(apiResponse, providerId);
// Returns: { inputTokens, outputTokens, cachedInputTokens?, totalTokens }

// Step 6: Calculate actual cost
const costCalc = await costCalculationService.calculateVendorCost({
  inputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  modelId,
  providerId,
  cachedInputTokens: usage.cachedInputTokens,
});

const multiplier = await pricingConfigService.getApplicableMultiplier(
  userId,
  providerId,
  modelId
);

const creditValue = costCalc.vendorCost * multiplier;
const creditsDeducted = Math.ceil(creditValue / 0.01); // Round up to nearest credit
const grossMargin = creditValue - costCalc.vendorCost;
```

**Token Format Support** (lines 34-74):

| Provider | Format | Fields |
|----------|--------|--------|
| OpenAI/Azure | `usage.prompt_tokens` | `prompt_tokens`, `completion_tokens`, `total_tokens` |
| Anthropic | `usage.input_tokens` | `input_tokens`, `output_tokens`, `cache_read_input_tokens` |
| Google Gemini | `usage.promptTokenCount` | `promptTokenCount`, `candidatesTokenCount`, `cachedContentInputTokenCount` |

#### Step 7: Atomic Deduction Transaction

**File**: `backend/src/services/credit-deduction.service.ts` (lines 197-376)

**Critical Section**: Serializable transaction with 10-second timeout

```typescript
await prisma.$transaction(
  async (tx) => {
    // 7a. Lock user balance row (prevents concurrent modifications)
    const balanceRecords = await tx.$queryRaw`
      SELECT amount
      FROM user_credit_balance
      WHERE user_id = ${userId}::uuid
      FOR UPDATE  -- <-- This is the lock!
    `;

    const currentBalance = balanceRecords[0]?.amount || 0;

    // 7b. Pre-check: Sufficient credits?
    if (currentBalance < creditsToDeduct) {
      throw new InsufficientCreditsError(
        `Insufficient credits. Balance: ${currentBalance}, Required: ${creditsToDeduct}`
      );
    }

    // 7c. Calculate new balance
    const newBalance = currentBalance - creditsToDeduct;

    // 7d. Update credit balance (atomic)
    await tx.$executeRaw`
      UPDATE user_credit_balance
      SET amount = ${newBalance},
          last_deduction_at = NOW(),
          last_deduction_amount = ${creditsToDeduct},
          updated_at = NOW()
      WHERE user_id = ${userId}::uuid
    `;

    // 7e. Create token usage ledger record
    await tx.$executeRaw`
      INSERT INTO token_usage_ledger (
        request_id, user_id, subscription_id, model_id, provider_id,
        input_tokens, output_tokens, cached_input_tokens,
        vendor_cost, margin_multiplier, credit_value_usd, credits_deducted,
        request_type, request_started_at, request_completed_at,
        processing_time_ms, status, gross_margin_usd, created_at
      ) VALUES (
        ${requestId}::uuid, ${userId}::uuid, NULL, ${modelId},
        ${providerId}::uuid, ${inputTokens}, ${outputTokens},
        ${cachedInputTokens || 0}, ${vendorCost}, ${marginMultiplier},
        ${vendorCost * marginMultiplier}, ${creditsToDeduct},
        ${requestType}::request_type, ${requestStartedAt},
        ${requestCompletedAt}, ${processingTime},
        ${status}::request_status, ${grossMargin}, NOW()
      )
    `;

    // 7f. Record deduction in ledger (immutable audit trail)
    const deductionRecords = await tx.$queryRaw`
      INSERT INTO credit_deduction_ledger (
        user_id, amount, balance_before, balance_after,
        request_id, token_vendor_cost, margin_multiplier, gross_margin,
        reason, status, processed_at
      ) VALUES (
        ${userId}::uuid, ${creditsToDeduct}, ${currentBalance}, ${newBalance},
        ${requestId}::uuid, ${vendorCost}, ${marginMultiplier}, ${grossMargin},
        'api_completion', 'completed', NOW()
      )
      RETURNING id
    `;

    const deductionRecordId = deductionRecords[0].id;

    // 7g. Link token usage to deduction record
    await tx.$executeRaw`
      UPDATE token_usage_ledger
      SET deduction_record_id = ${deductionRecordId}::uuid
      WHERE request_id = ${requestId}::uuid
    `;

    // 7h. Update daily summary for analytics (upsert)
    const today = new Date().toISOString().split('T')[0];
    await tx.$executeRaw`
      INSERT INTO token_usage_daily_summary (
        id, user_id, date, model_name,
        total_input_tokens, total_output_tokens,
        total_cost_usd, total_credits, created_at
      ) VALUES (
        gen_random_uuid(), ${userId}::uuid, ${today}::date, ${modelId},
        ${inputTokens}, ${outputTokens}, ${vendorCost},
        ${creditsToDeduct}, NOW()
      )
      ON CONFLICT (user_id, date, model_name)
      DO UPDATE SET
        total_input_tokens = token_usage_daily_summary.total_input_tokens + ${inputTokens},
        total_output_tokens = token_usage_daily_summary.total_output_tokens + ${outputTokens},
        total_cost_usd = token_usage_daily_summary.total_cost_usd + ${vendorCost},
        total_credits = token_usage_daily_summary.total_credits + ${creditsToDeduct}
    `;

    return {
      success: true,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      creditsDeducted,
      deductionRecordId,
      timestamp: new Date(),
    };
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,   // 5 seconds max wait for lock
    timeout: 10000,  // 10 seconds total timeout
  }
);
```

**Why Serializable Isolation?**
- Prevents phantom reads and non-repeatable reads
- Ensures consistent view of balance throughout transaction
- Protects against race conditions from concurrent requests

**Lock Acquisition Flow**:
```
Request A: SELECT amount FROM user_credit_balance WHERE user_id = X FOR UPDATE
  ↓ (Lock acquired)
Request B: SELECT amount FROM user_credit_balance WHERE user_id = X FOR UPDATE
  ↓ (Waits for Request A to release lock)
Request A: UPDATE user_credit_balance SET amount = newBalance WHERE user_id = X
  ↓ (Lock released after COMMIT)
Request B: (Lock acquired, sees updated balance from Request A)
```

---

## Database Schema

### `token_usage_ledger`

**Purpose**: Detailed record of every LLM API request with token counts and costs.

```sql
CREATE TABLE token_usage_ledger (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID UNIQUE NOT NULL,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id      UUID REFERENCES subscriptions(id),
  model_id             VARCHAR(255) NOT NULL,
  provider_id          UUID NOT NULL REFERENCES providers(id),

  -- Token counts (from LLM provider response)
  input_tokens         INTEGER NOT NULL,
  output_tokens        INTEGER NOT NULL,
  cached_input_tokens  INTEGER DEFAULT 0,

  -- Financial tracking
  vendor_cost          DECIMAL(10, 8) NOT NULL,      -- Cost from LLM provider
  margin_multiplier    DECIMAL(4, 2) NOT NULL,        -- Pricing multiplier
  credit_value_usd     DECIMAL(10, 8) NOT NULL,      -- vendorCost × multiplier
  credits_deducted     INTEGER NOT NULL,              -- Rounded credit amount
  gross_margin_usd     DECIMAL(10, 8) DEFAULT 0,     -- Profit

  -- Request metadata
  request_type         request_type NOT NULL,         -- 'completion', 'chat', 'streaming'
  streaming_segments   INTEGER,                       -- For streaming requests
  request_started_at   TIMESTAMP NOT NULL,
  request_completed_at TIMESTAMP NOT NULL,
  processing_time_ms   INTEGER,
  status               request_status DEFAULT 'success', -- 'success', 'error'
  error_message        TEXT,
  is_streaming_complete BOOLEAN DEFAULT true,

  -- Analytics fields
  user_tier_at_request VARCHAR(50),
  region               VARCHAR(50),

  -- Link to deduction record
  deduction_record_id  UUID REFERENCES credit_deduction_ledger(id),

  created_at           TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_token_usage_user_date ON token_usage_ledger(user_id, created_at);
CREATE INDEX idx_token_usage_request ON token_usage_ledger(request_id);
CREATE INDEX idx_token_usage_status ON token_usage_ledger(status);
CREATE INDEX idx_token_usage_analytics ON token_usage_ledger(
  created_at DESC, status, provider_id, user_id,
  gross_margin_usd, vendor_cost, credits_deducted,
  input_tokens, output_tokens
);
```

**Key Fields Explained**:

| Field | Description | Example |
|-------|-------------|---------|
| `request_id` | Unique identifier for API request | `550e8400-e29b-41d4-a716-446655440000` |
| `input_tokens` | Tokens in prompt (from LLM API) | `1523` |
| `output_tokens` | Tokens in completion (from LLM API) | `487` |
| `cached_input_tokens` | Cached tokens (Anthropic, Google) | `0` |
| `vendor_cost` | Cost from LLM provider ($) | `0.00305000` |
| `margin_multiplier` | Rephlo pricing multiplier | `1.50` |
| `credit_value_usd` | User pays ($) | `0.00457500` |
| `credits_deducted` | Rounded credits charged | `458` (ceil) |
| `gross_margin_usd` | Profit ($) | `0.00152500` |
| `request_type` | Type of request | `chat`, `completion`, `streaming` |
| `processing_time_ms` | Request duration | `2847` |
| `deduction_record_id` | Link to credit ledger | `660f9511-f39c-52e5-b827-557766551111` |

### `credit_deduction_ledger`

**Purpose**: Immutable audit trail of all credit deductions with balance snapshots.

```sql
CREATE TABLE credit_deduction_ledger (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Deduction details
  amount               INTEGER NOT NULL,              -- Credits deducted
  balance_before       INTEGER NOT NULL,              -- Balance snapshot before
  balance_after        INTEGER NOT NULL,              -- Balance snapshot after

  -- Link to request
  request_id           UUID UNIQUE REFERENCES token_usage_ledger(request_id),

  -- Financial metadata (denormalized for audit)
  token_vendor_cost    DECIMAL(10, 8),
  margin_multiplier    DECIMAL(4, 2),
  gross_margin         DECIMAL(10, 8),

  -- Deduction metadata
  reason               credit_deduction_reason NOT NULL, -- 'api_completion', 'admin_adjustment'
  status               credit_deduction_status DEFAULT 'pending', -- 'completed', 'reversed'

  -- Reversal tracking (for refunds)
  reversed_at          TIMESTAMP,
  reversed_by          UUID REFERENCES users(id),     -- Admin who reversed
  reversal_reason      TEXT,

  processed_at         TIMESTAMP DEFAULT NOW(),
  created_at           TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deduction_user_date ON credit_deduction_ledger(user_id, created_at);
CREATE INDEX idx_deduction_request ON credit_deduction_ledger(request_id);
CREATE INDEX idx_deduction_status ON credit_deduction_ledger(status);
CREATE INDEX idx_deduction_reason ON credit_deduction_ledger(reason);
```

**Enum Types**:

```sql
CREATE TYPE credit_deduction_reason AS ENUM (
  'api_completion',       -- Credit used for LLM API call
  'admin_adjustment',     -- Manual adjustment by admin
  'subscription_downgrade', -- Adjustment for tier change
  'chargeback',           -- Payment chargeback
  'system_correction'     -- Bug fix or correction
);

CREATE TYPE credit_deduction_status AS ENUM (
  'pending',    -- Deduction initiated but not completed
  'completed',  -- Successfully deducted
  'reversed',   -- Refunded/reversed by admin
  'failed'      -- Deduction failed (should never happen with atomic transactions)
);
```

**Audit Trail Features**:
- **Immutability**: Records never deleted, only `status` changed to 'reversed'
- **Balance Snapshots**: `balance_before` and `balance_after` for verification
- **Admin Accountability**: `reversed_by` tracks who performed refund
- **Timestamp Trail**: `processed_at`, `created_at`, `reversed_at` for timeline

### `user_credit_balance`

**Purpose**: Current credit balance snapshot (fast lookup).

```sql
CREATE TABLE user_credit_balance (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  amount               INTEGER NOT NULL,              -- Current balance
  last_deduction_at    TIMESTAMP,                    -- Last deduction timestamp
  last_deduction_amount INTEGER,                      -- Last deduction amount
  updated_at           TIMESTAMP DEFAULT NOW()
);
```

**Design Decision**: Why separate table?
- **Performance**: Single row per user, indexed by PK for O(1) lookup
- **Concurrency**: Row-level locking (`SELECT FOR UPDATE`) per user
- **Simplicity**: Don't need to SUM ledger entries for current balance

### `token_usage_daily_summary`

**Purpose**: Pre-aggregated analytics for dashboards.

```sql
CREATE TABLE token_usage_daily_summary (
  id                  UUID PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  model_name          VARCHAR(200) NOT NULL,

  -- Aggregated token counts
  total_input_tokens  INTEGER NOT NULL,
  total_output_tokens INTEGER NOT NULL,

  -- Aggregated financials
  total_cost_usd      DECIMAL(10, 2) NOT NULL,
  total_credits       INTEGER NOT NULL,

  created_at          TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date, model_name)
);

-- Indexes
CREATE INDEX idx_daily_summary_user_date ON token_usage_daily_summary(user_id, date);
CREATE INDEX idx_daily_summary_date ON token_usage_daily_summary(date);
```

**Upsert Logic** (lines 310-334 in `credit-deduction.service.ts`):
```sql
INSERT INTO token_usage_daily_summary (...)
VALUES (...)
ON CONFLICT (user_id, date, model_name)
DO UPDATE SET
  total_input_tokens = token_usage_daily_summary.total_input_tokens + NEW.input_tokens,
  total_output_tokens = token_usage_daily_summary.total_output_tokens + NEW.output_tokens,
  total_cost_usd = token_usage_daily_summary.total_cost_usd + NEW.vendor_cost,
  total_credits = token_usage_daily_summary.total_credits + NEW.credits_deducted
```

**Benefits**:
- **Fast Dashboard Queries**: No need to aggregate millions of ledger rows
- **Incremental Updates**: Each deduction updates daily summary in same transaction
- **Model-Level Granularity**: Track usage per model per day

---

## Service Methods

### CreditDeductionService

**File**: `backend/src/services/credit-deduction.service.ts`

#### 1. `estimateCreditsForRequest()`

**Purpose**: Pre-flight estimation before LLM API call.

**Signature**:
```typescript
async estimateCreditsForRequest(
  userId: string,
  modelId: string,
  providerName: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): Promise<number>
```

**Returns**: Conservative credit estimate (with 10% safety margin)

**Usage**:
```typescript
const estimatedCredits = await creditDeductionService.estimateCreditsForRequest(
  '550e8400-e29b-41d4-a716-446655440000',
  'gpt-4-turbo-preview',
  'openai',
  1500,  // Estimated from prompt length
  500    // Based on max_tokens parameter
);
// Returns: 458 credits (example)
```

**Fallback Behavior**:
- If provider not found: `ceil((inputTokens + outputTokens) / 1000 × 20)`
- If pricing not found: `ceil((inputTokens + outputTokens) / 1000 × 20)`
- Conservative default prevents undercharging

#### 2. `validateSufficientCredits()`

**Purpose**: Check if user has enough credits.

**Signature**:
```typescript
async validateSufficientCredits(
  userId: string,
  creditsNeeded: number
): Promise<ValidationResult>

interface ValidationResult {
  sufficient: boolean;
  currentBalance: number;
  required: number;
  shortfall?: number;
  suggestions?: string[];
}
```

**Usage**:
```typescript
const validation = await creditDeductionService.validateSufficientCredits(
  userId,
  458
);

if (!validation.sufficient) {
  // Example response:
  // {
  //   sufficient: false,
  //   currentBalance: 150,
  //   required: 458,
  //   shortfall: 308,
  //   suggestions: [
  //     'Your balance (150 credits) is insufficient. Need 458 credits.',
  //     'Shortfall: 308 credits',
  //     'Upgrade to Pro tier for 20,000 credits/month ($19/month)'
  //   ]
  // }
  throw new InsufficientCreditsError(validation.suggestions.join(' '));
}
```

**Tier-Specific Suggestions**:
- **Free tier**: "Upgrade to Pro tier for 20,000 credits/month ($19/month)"
- **Pro tier**: "Upgrade to Pro Max for 60,000 credits/month ($49/month)"
- **Pro Max tier**: No upgrade suggestion (already at highest tier)

#### 3. `deductCreditsAtomically()`

**Purpose**: Atomic credit deduction with full audit trail.

**Signature**:
```typescript
async deductCreditsAtomically(
  userId: string,
  creditsToDeduct: number,
  requestId: string,
  tokenUsageRecord: TokenUsageRecord
): Promise<DeductionResult>

interface TokenUsageRecord {
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  vendorCost: number;
  marginMultiplier: number;
  grossMargin: number;
  requestType: 'completion' | 'chat' | 'streaming';
  requestStartedAt: Date;
  requestCompletedAt: Date;
  processingTime: number;
  status: 'success' | 'error';
}

interface DeductionResult {
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  creditsDeducted: number;
  deductionRecordId: string;
  timestamp: Date;
}
```

**Usage**:
```typescript
const result = await creditDeductionService.deductCreditsAtomically(
  userId,
  458,
  'abc-123-request-id',
  {
    modelId: 'gpt-4-turbo-preview',
    providerId: '550e8400-e29b-41d4-a716-446655440000',
    inputTokens: 1523,
    outputTokens: 487,
    cachedInputTokens: 0,
    vendorCost: 0.00305000,
    marginMultiplier: 1.50,
    grossMargin: 0.00152500,
    requestType: 'chat',
    requestStartedAt: new Date('2025-01-17T10:00:00Z'),
    requestCompletedAt: new Date('2025-01-17T10:00:02Z'),
    processingTime: 2847,
    status: 'success'
  }
);

// Returns:
// {
//   success: true,
//   balanceBefore: 1500,
//   balanceAfter: 1042,
//   creditsDeducted: 458,
//   deductionRecordId: '660f9511-f39c-52e5-b827-557766551111',
//   timestamp: 2025-01-17T10:00:02.123Z
// }
```

**Error Handling**:
```typescript
try {
  const result = await creditDeductionService.deductCreditsAtomically(...);
} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    // User balance insufficient
    return res.status(402).json({
      error: { code: 'INSUFFICIENT_CREDITS', message: error.message }
    });
  }
  // Transaction failed (database error, timeout)
  logger.error('Deduction failed', { error });
  throw error;
}
```

#### 4. `reverseDeduction()`

**Purpose**: Refund credits (admin operation).

**Signature**:
```typescript
async reverseDeduction(
  deductionId: string,
  reason: string,
  adminUserId: string
): Promise<void>
```

**Usage**:
```typescript
await creditDeductionService.reverseDeduction(
  '660f9511-f39c-52e5-b827-557766551111',
  'API error - LLM provider returned 500 error',
  'admin-user-id-123'
);
```

**What It Does**:
1. Locks deduction record with `SELECT FOR UPDATE`
2. Verifies `status !== 'reversed'` (prevent double-refund)
3. Adds credits back: `UPDATE user_credit_balance SET amount = amount + deduction.amount`
4. Marks deduction as reversed: `UPDATE credit_deduction_ledger SET status = 'reversed', reversed_at = NOW(), reversed_by = adminUserId, reversal_reason = reason`

**Audit Trail**:
```sql
SELECT
  cdl.id,
  cdl.amount,
  cdl.status,
  cdl.reversed_at,
  cdl.reversal_reason,
  u.email as reversed_by_email
FROM credit_deduction_ledger cdl
LEFT JOIN users u ON cdl.reversed_by = u.id
WHERE cdl.id = '660f9511-f39c-52e5-b827-557766551111';

-- Returns:
-- id: 660f9511-f39c-52e5-b827-557766551111
-- amount: 458
-- status: reversed
-- reversed_at: 2025-01-17T11:30:00Z
-- reversal_reason: API error - LLM provider returned 500 error
-- reversed_by_email: admin@rephlo.ai
```

#### 5. `getCurrentBalance()`

**Purpose**: Get user's current credit balance (fast lookup).

**Signature**:
```typescript
async getCurrentBalance(userId: string): Promise<number>
```

**Usage**:
```typescript
const balance = await creditDeductionService.getCurrentBalance(userId);
// Returns: 1042
```

**SQL**:
```sql
SELECT amount FROM user_credit_balance WHERE user_id = ?
```

**Fallback**: Returns `0` if no balance record exists (new user).

#### 6. `getDeductionHistory()`

**Purpose**: Retrieve deduction history for user.

**Signature**:
```typescript
async getDeductionHistory(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<CreditDeductionRecord[]>

interface CreditDeductionRecord {
  id: string;
  userId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  requestId?: string;
  tokenVendorCost?: number;
  marginMultiplier?: number;
  grossMargin?: number;
  reason: string;
  status: string;
  reversedAt?: Date;
  reversedBy?: string;
  reversalReason?: string;
  processedAt: Date;
  createdAt: Date;
}
```

**Usage**:
```typescript
const history = await creditDeductionService.getDeductionHistory(
  userId,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  50  // Last 50 deductions in January
);

// Returns array:
// [
//   {
//     id: '660f9511-f39c-52e5-b827-557766551111',
//     userId: '550e8400-e29b-41d4-a716-446655440000',
//     amount: 458,
//     balanceBefore: 1500,
//     balanceAfter: 1042,
//     requestId: 'abc-123-request-id',
//     tokenVendorCost: 0.00305000,
//     marginMultiplier: 1.50,
//     grossMargin: 0.00152500,
//     reason: 'api_completion',
//     status: 'completed',
//     processedAt: 2025-01-17T10:00:02Z,
//     createdAt: 2025-01-17T10:00:02Z
//   },
//   ...
// ]
```

**Default Behavior**:
- `startDate`: Defaults to 30 days ago
- `endDate`: Defaults to now
- `limit`: Defaults to 100 records

### TokenTrackingService

**File**: `backend/src/services/token-tracking.service.ts`

#### 1. `parseTokenUsage()`

**Purpose**: Extract token counts from LLM provider responses.

**Signature**:
```typescript
parseTokenUsage(
  apiResponse: any,
  providerId: string
): {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  totalTokens: number;
}
```

**OpenAI/Azure Format**:
```typescript
// API Response:
{
  "usage": {
    "prompt_tokens": 1523,
    "completion_tokens": 487,
    "total_tokens": 2010
  }
}

// Parsed:
{
  inputTokens: 1523,
  outputTokens: 487,
  totalTokens: 2010
}
```

**Anthropic Format**:
```typescript
// API Response:
{
  "usage": {
    "input_tokens": 1523,
    "output_tokens": 487,
    "cache_read_input_tokens": 250
  }
}

// Parsed:
{
  inputTokens: 1523,
  outputTokens: 487,
  cachedInputTokens: 250,
  totalTokens: 2010
}
```

**Google Gemini Format**:
```typescript
// API Response:
{
  "usage": {
    "promptTokenCount": 1523,
    "candidatesTokenCount": 487,
    "cachedContentInputTokenCount": 250,
    "totalTokenCount": 2010
  }
}

// Parsed:
{
  inputTokens: 1523,
  outputTokens: 487,
  cachedInputTokens: 250,
  totalTokens: 2010
}
```

**Fallback**: Returns all zeros if format unrecognized.

#### 2. `captureTokenUsage()`

**Purpose**: Capture and record token usage from completion.

**Signature**:
```typescript
async captureTokenUsage(
  userId: string,
  apiResponse: any,
  requestMetadata: RequestMetadata
): Promise<TokenUsageRecord>

interface RequestMetadata {
  requestId: string;
  modelId: string;
  providerId: string;
  requestType: 'completion' | 'chat' | 'streaming';
  requestStartedAt: Date;
}
```

**Usage**:
```typescript
const tokenRecord = await tokenTrackingService.captureTokenUsage(
  userId,
  apiResponse,  // Raw response from OpenAI/Anthropic/Google
  {
    requestId: crypto.randomUUID(),
    modelId: 'gpt-4-turbo-preview',
    providerId: '550e8400-e29b-41d4-a716-446655440000',
    requestType: 'chat',
    requestStartedAt: new Date()
  }
);

// Returns TokenUsageRecord (already recorded to database)
```

**What It Does**:
1. Parse token counts with `parseTokenUsage()`
2. Calculate vendor cost with `CostCalculationService`
3. Get margin multiplier with `PricingConfigService`
4. Calculate credit deduction: `ceil(vendorCost × multiplier / 0.01)`
5. Calculate gross margin: `creditValue - vendorCost`
6. Record to `token_usage_ledger` table

**Note**: This method is called INSIDE the `deductCreditsAtomically()` transaction.

#### 3. `getUserTokenUsage()`

**Purpose**: Retrieve token usage history for user.

**Signature**:
```typescript
async getUserTokenUsage(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<TokenUsageRecord[]>
```

**Usage**:
```typescript
const usage = await tokenTrackingService.getUserTokenUsage(
  userId,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  50
);

// Returns array of TokenUsageRecord:
// [
//   {
//     requestId: 'abc-123',
//     userId: '550e8400...',
//     modelId: 'gpt-4-turbo-preview',
//     providerId: '660f9511...',
//     inputTokens: 1523,
//     outputTokens: 487,
//     cachedInputTokens: 0,
//     totalTokens: 2010,
//     vendorCost: 0.00305000,
//     creditDeducted: 458,
//     marginMultiplier: 1.50,
//     grossMargin: 0.00152500,
//     requestType: 'chat',
//     requestStartedAt: 2025-01-17T10:00:00Z,
//     requestCompletedAt: 2025-01-17T10:00:02Z,
//     processingTime: 2847,
//     status: 'success',
//     createdAt: 2025-01-17T10:00:02Z
//   },
//   ...
// ]
```

#### 4. `getDailyTokenSummary()`

**Purpose**: Get aggregated daily summary for user.

**Signature**:
```typescript
async getDailyTokenSummary(userId: string, date: Date): Promise<DailySummary | null>

interface DailySummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalVendorCost: number;
  totalCreditsDeducted: number;
  totalGrossMargin: number;
  avgRequestLatencyMs: number;
  successRate: number;
}
```

**Usage**:
```typescript
const summary = await tokenTrackingService.getDailyTokenSummary(
  userId,
  new Date('2025-01-17')
);

// Returns:
// {
//   totalRequests: 24,
//   totalInputTokens: 35280,
//   totalOutputTokens: 12450,
//   totalVendorCost: 0.08920000,
//   totalCreditsDeducted: 10962,
//   totalGrossMargin: 0.04460000,
//   avgRequestLatencyMs: 2145,
//   successRate: 0.958
// }
```

**Note**: Returns `null` if no data for that date.

---

## Query Examples

### Example 1: Get Last 10 Completions with Credit Consumption

```sql
SELECT
  tul.request_id,
  tul.model_id,
  tul.input_tokens,
  tul.output_tokens,
  tul.credits_deducted,
  cdl.balance_before,
  cdl.balance_after,
  tul.processing_time_ms,
  tul.created_at
FROM token_usage_ledger tul
LEFT JOIN credit_deduction_ledger cdl ON tul.request_id = cdl.request_id
WHERE tul.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY tul.created_at DESC
LIMIT 10;
```

**Expected Output**:
```
request_id                           | model_id              | input_tokens | output_tokens | credits_deducted | balance_before | balance_after | processing_time_ms | created_at
-------------------------------------|-----------------------|--------------|---------------|------------------|----------------|---------------|--------------------|-----------
abc-123-request-id                   | gpt-4-turbo-preview   | 1523         | 487           | 458              | 1500           | 1042          | 2847               | 2025-01-17 10:00:02
def-456-request-id                   | claude-3-opus-20240229| 2105         | 623           | 612              | 1042           | 430           | 3124               | 2025-01-17 09:45:18
...
```

### Example 2: Get Total Credits Consumed Today

```sql
SELECT
  COUNT(*) as total_requests,
  SUM(credits_deducted) as total_credits_consumed,
  AVG(credits_deducted) as avg_credits_per_request,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM token_usage_ledger
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND DATE(created_at) = CURRENT_DATE;
```

**Expected Output**:
```
total_requests | total_credits_consumed | avg_credits_per_request | total_input_tokens | total_output_tokens
---------------|------------------------|-------------------------|--------------------|---------------------
24             | 10962                  | 457                     | 35280              | 12450
```

### Example 3: Get Credit Consumption by Model (Last 30 Days)

```sql
SELECT
  model_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(credits_deducted) as total_credits,
  AVG(credits_deducted) as avg_credits_per_request,
  SUM(vendor_cost) as total_vendor_cost,
  SUM(gross_margin_usd) as total_gross_margin
FROM token_usage_ledger
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY model_id
ORDER BY total_credits DESC;
```

**Expected Output**:
```
model_id                | request_count | total_input_tokens | total_output_tokens | total_credits | avg_credits_per_request | total_vendor_cost | total_gross_margin
------------------------|---------------|--------------------|--------------------|---------------|-------------------------|-------------------|-------------------
gpt-4-turbo-preview     | 145           | 212340             | 68920              | 65482         | 451                     | 4.36548000        | 2.18274000
claude-3-opus-20240229  | 87            | 178920             | 52140              | 48923         | 562                     | 3.26153333        | 1.63076667
gemini-pro-1.5          | 52            | 95620              | 28450              | 21847         | 420                     | 1.45646667        | 0.72823333
```

### Example 4: Check for Reversed Deductions (Refunds)

```sql
SELECT
  cdl.id,
  cdl.amount,
  cdl.balance_before,
  cdl.balance_after,
  cdl.reversed_at,
  cdl.reversal_reason,
  u.email as reversed_by_email
FROM credit_deduction_ledger cdl
LEFT JOIN users u ON cdl.reversed_by = u.id
WHERE cdl.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND cdl.status = 'reversed'
ORDER BY cdl.reversed_at DESC
LIMIT 20;
```

**Expected Output**:
```
id                                   | amount | balance_before | balance_after | reversed_at          | reversal_reason                        | reversed_by_email
-------------------------------------|--------|----------------|---------------|----------------------|----------------------------------------|------------------
660f9511-f39c-52e5-b827-557766551111 | 458    | 1500           | 1042          | 2025-01-17 11:30:00  | API error - LLM provider returned 500  | admin@rephlo.ai
```

### Example 5: Get Credit Consumption Timeline (Daily Aggregation)

```sql
SELECT
  DATE(created_at) as usage_date,
  COUNT(*) as total_requests,
  SUM(credits_deducted) as total_credits,
  SUM(vendor_cost) as total_cost,
  SUM(gross_margin_usd) as total_margin
FROM token_usage_ledger
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY usage_date DESC;
```

**Expected Output**:
```
usage_date | total_requests | total_credits | total_cost | total_margin
-----------|----------------|---------------|------------|-------------
2025-01-17 | 24             | 10962         | 0.73080000 | 0.36540000
2025-01-16 | 31             | 14235         | 0.94900000 | 0.47450000
2025-01-15 | 18             | 8124          | 0.54160000 | 0.27080000
...
```

### Example 6: Get Most Expensive Requests (Top 10)

```sql
SELECT
  tul.request_id,
  tul.model_id,
  tul.input_tokens,
  tul.output_tokens,
  tul.credits_deducted,
  tul.vendor_cost,
  tul.gross_margin_usd,
  tul.created_at
FROM token_usage_ledger tul
WHERE tul.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND tul.created_at >= NOW() - INTERVAL '30 days'
ORDER BY tul.credits_deducted DESC
LIMIT 10;
```

**Expected Output**:
```
request_id       | model_id              | input_tokens | output_tokens | credits_deducted | vendor_cost | gross_margin_usd | created_at
-----------------|-----------------------|--------------|---------------|------------------|-------------|------------------|------------
xyz-789          | gpt-4-turbo-preview   | 8523         | 3487          | 1842             | 0.12280000  | 0.06140000       | 2025-01-15 14:23:11
mno-234          | claude-3-opus-20240229| 7105         | 2923          | 1523             | 0.10153333  | 0.05076667       | 2025-01-14 09:12:45
...
```

### Example 7: Balance Verification Query (Data Integrity Check)

```sql
-- Verify that user_credit_balance matches sum of all allocations minus deductions
WITH credit_allocations AS (
  SELECT SUM(total_credits) as total_allocated
  FROM credits
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
    AND is_current = true
),
credit_deductions AS (
  SELECT COALESCE(SUM(amount), 0) as total_deducted
  FROM credit_deduction_ledger
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
    AND status = 'completed'
),
credit_refunds AS (
  SELECT COALESCE(SUM(amount), 0) as total_refunded
  FROM credit_deduction_ledger
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
    AND status = 'reversed'
),
current_balance AS (
  SELECT amount as current_amount
  FROM user_credit_balance
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
)
SELECT
  ca.total_allocated,
  cd.total_deducted,
  cr.total_refunded,
  cb.current_amount,
  (ca.total_allocated - cd.total_deducted + cr.total_refunded) as calculated_balance,
  cb.current_amount - (ca.total_allocated - cd.total_deducted + cr.total_refunded) as discrepancy
FROM credit_allocations ca
CROSS JOIN credit_deductions cd
CROSS JOIN credit_refunds cr
CROSS JOIN current_balance cb;
```

**Expected Output** (healthy state):
```
total_allocated | total_deducted | total_refunded | current_amount | calculated_balance | discrepancy
----------------|----------------|----------------|----------------|--------------------|-----------
1500            | 458            | 0              | 1042           | 1042               | 0
```

**If discrepancy ≠ 0**: Data integrity issue! Investigate ledger records.

---

## Error Handling

### Error Types

#### 1. `InsufficientCreditsError`

**When**: User doesn't have enough credits for request.

**Throw Location**: `credit-deduction.service.ts` lines 229-232

**HTTP Response**:
```typescript
{
  error: {
    code: 'INSUFFICIENT_CREDITS',
    message: 'Insufficient credits. Balance: 150, Required: 458',
    details: {
      currentBalance: 150,
      required: 458,
      shortfall: 308,
      suggestions: [
        'Upgrade to Pro tier for 20,000 credits/month ($19/month)'
      ]
    }
  }
}
```

**Status Code**: `402 Payment Required`

**Client Action**: Show upgrade modal or credit purchase option.

#### 2. Transaction Timeout

**When**: Transaction takes longer than 10 seconds (deadlock or heavy load).

**Prisma Error**:
```
PrismaClientKnownRequestError: Transaction failed: timeout exceeded
```

**HTTP Response**:
```typescript
{
  error: {
    code: 'TRANSACTION_TIMEOUT',
    message: 'Credit deduction timed out. Please retry.',
    details: {
      retryable: true,
      maxWait: 5000,
      timeout: 10000
    }
  }
}
```

**Status Code**: `503 Service Unavailable`

**Client Action**: Retry after exponential backoff.

#### 3. Transaction Lock Wait Timeout

**When**: Cannot acquire lock within 5 seconds (many concurrent requests).

**Prisma Error**:
```
PrismaClientKnownRequestError: Transaction failed: max wait time exceeded
```

**HTTP Response**:
```typescript
{
  error: {
    code: 'TRANSACTION_LOCK_TIMEOUT',
    message: 'System is busy. Please retry shortly.',
    details: {
      retryable: true,
      retryAfterMs: 1000
    }
  }
}
```

**Status Code**: `429 Too Many Requests`

**Client Action**: Retry after 1 second.

#### 4. Database Connection Error

**When**: Prisma cannot connect to PostgreSQL.

**Prisma Error**:
```
PrismaClientInitializationError: Can't reach database server
```

**HTTP Response**:
```typescript
{
  error: {
    code: 'DATABASE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    details: {
      retryable: true
    }
  }
}
```

**Status Code**: `503 Service Unavailable`

**Client Action**: Show user-friendly error, retry after delay.

### Error Handling Pattern

```typescript
try {
  // Step 1: Estimate credits
  const estimatedCredits = await creditDeductionService.estimateCreditsForRequest(...);

  // Step 2: Validate balance
  const validation = await creditDeductionService.validateSufficientCredits(userId, estimatedCredits);
  if (!validation.sufficient) {
    return res.status(402).json({
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: validation.suggestions.join(' '),
        details: {
          currentBalance: validation.currentBalance,
          required: validation.required,
          shortfall: validation.shortfall,
          suggestions: validation.suggestions
        }
      }
    });
  }

  // Step 3: Call LLM API
  const apiResponse = await llmProvider.createChatCompletion(request);

  // Step 4: Deduct credits atomically
  const result = await creditDeductionService.deductCreditsAtomically(
    userId,
    creditsToDeduct,
    requestId,
    tokenUsageRecord
  );

  // Step 5: Return response
  return res.status(200).json({
    completion: apiResponse.choices[0].message.content,
    usage: {
      inputTokens: tokenUsageRecord.inputTokens,
      outputTokens: tokenUsageRecord.outputTokens,
      creditsDeducted: result.creditsDeducted,
      balanceAfter: result.balanceAfter
    }
  });

} catch (error) {
  // Handle specific errors
  if (error instanceof InsufficientCreditsError) {
    logger.warn('User insufficient credits', { userId, error: error.message });
    return res.status(402).json({
      error: { code: 'INSUFFICIENT_CREDITS', message: error.message }
    });
  }

  if (error.code === 'P2024') {  // Prisma timeout
    logger.error('Transaction timeout', { userId, error });
    return res.status(503).json({
      error: {
        code: 'TRANSACTION_TIMEOUT',
        message: 'Credit deduction timed out. Please retry.',
        details: { retryable: true }
      }
    });
  }

  if (error.code === 'P2034') {  // Prisma lock timeout
    logger.error('Lock acquisition timeout', { userId, error });
    return res.status(429).json({
      error: {
        code: 'TRANSACTION_LOCK_TIMEOUT',
        message: 'System is busy. Please retry shortly.',
        details: { retryable: true, retryAfterMs: 1000 }
      }
    });
  }

  // Generic database error
  logger.error('Credit deduction failed', { userId, error: error.message, stack: error.stack });
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Failed to process request'
    }
  });
}
```

### Retry Strategy (Client-Side)

```typescript
async function makeCompletionRequest(prompt: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        return await response.json();
      }

      const error = await response.json();

      // Don't retry insufficient credits
      if (error.error.code === 'INSUFFICIENT_CREDITS') {
        throw new Error(error.error.message);
      }

      // Retry on timeout or lock errors
      if (error.error.details?.retryable && attempt < maxRetries - 1) {
        const delay = error.error.details.retryAfterMs || (1000 * Math.pow(2, attempt));
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(error.error.message);

    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }
  }
}
```

---

## Best Practices

### 1. **Always Use Atomic Transactions**

❌ **WRONG** - Race condition possible:
```typescript
// Step 1: Get balance (not locked)
const balance = await prisma.user_credit_balance.findUnique({ where: { user_id: userId } });

// Step 2: Check balance
if (balance.amount < creditsNeeded) throw new Error('Insufficient');

// Step 3: Update balance (another request could have modified it!)
await prisma.user_credit_balance.update({
  where: { user_id: userId },
  data: { amount: balance.amount - creditsNeeded }
});
```

**Problem**: Between Step 2 and Step 3, another request could deduct credits, causing negative balance.

✅ **CORRECT** - Atomic transaction with lock:
```typescript
await prisma.$transaction(
  async (tx) => {
    // Lock balance row
    const [balance] = await tx.$queryRaw`
      SELECT amount FROM user_credit_balance WHERE user_id = ${userId}::uuid FOR UPDATE
    `;

    if (balance.amount < creditsNeeded) throw new InsufficientCreditsError();

    // Update atomically (lock held until transaction commits)
    await tx.$executeRaw`
      UPDATE user_credit_balance SET amount = ${balance.amount - creditsNeeded} WHERE user_id = ${userId}::uuid
    `;
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
);
```

### 2. **Record Token Usage Before Returning Response**

❌ **WRONG** - Response returned before ledger recording:
```typescript
const apiResponse = await llmProvider.createChatCompletion(request);

// Return immediately
res.json({ completion: apiResponse.choices[0].message.content });

// Record asynchronously (might fail silently!)
tokenTrackingService.captureTokenUsage(userId, apiResponse, metadata).catch(err => {
  logger.error('Failed to record usage', { err });
});
```

**Problem**: If ledger recording fails, user gets free credits (revenue loss).

✅ **CORRECT** - Record synchronously before response:
```typescript
const apiResponse = await llmProvider.createChatCompletion(request);

// Record token usage (blocks until successful)
await tokenTrackingService.captureTokenUsage(userId, apiResponse, metadata);

// Only return after ledger is recorded
res.json({ completion: apiResponse.choices[0].message.content });
```

### 3. **Use Pre-Flight Estimation**

✅ **CORRECT** - Fail fast before expensive LLM call:
```typescript
// Step 1: Estimate credits
const estimatedCredits = await creditDeductionService.estimateCreditsForRequest(...);

// Step 2: Validate balance BEFORE LLM call
const validation = await creditDeductionService.validateSufficientCredits(userId, estimatedCredits);
if (!validation.sufficient) {
  return res.status(402).json({ error: { code: 'INSUFFICIENT_CREDITS', ... } });
}

// Step 3: Only call LLM if user has credits
const apiResponse = await llmProvider.createChatCompletion(request);
```

**Benefit**: Prevents wasted LLM API calls for users without credits.

### 4. **Never Delete Ledger Records**

❌ **WRONG** - Deleting deduction records:
```typescript
// Admin wants to "undo" a deduction
await prisma.credit_deduction_ledger.delete({
  where: { id: deductionId }
});
```

**Problem**: Destroys audit trail, violates compliance requirements.

✅ **CORRECT** - Mark as reversed:
```typescript
await creditDeductionService.reverseDeduction(
  deductionId,
  'Admin correction for API error',
  adminUserId
);
// Sets status = 'reversed', records who reversed it and why
```

### 5. **Use Daily Summary for Analytics**

❌ **WRONG** - Aggregating millions of ledger rows:
```typescript
// Slow query for dashboard (scans entire ledger)
const stats = await prisma.token_usage_ledger.aggregate({
  where: { user_id: userId, created_at: { gte: thirtyDaysAgo } },
  _sum: { credits_deducted: true, input_tokens: true, output_tokens: true },
  _count: true
});
```

**Problem**: Full table scan, slow for large datasets.

✅ **CORRECT** - Use pre-aggregated daily summary:
```typescript
// Fast query (single row per day)
const stats = await prisma.token_usage_daily_summary.aggregate({
  where: { user_id: userId, date: { gte: thirtyDaysAgo } },
  _sum: { total_credits: true, total_input_tokens: true, total_output_tokens: true }
});
```

### 6. **Include Balance Snapshots in Deduction Records**

✅ **CORRECT** - Record `balance_before` and `balance_after`:
```typescript
await tx.$executeRaw`
  INSERT INTO credit_deduction_ledger (
    user_id, amount, balance_before, balance_after, ...
  ) VALUES (
    ${userId}::uuid, ${creditsToDeduct}, ${currentBalance}, ${newBalance}, ...
  )
`;
```

**Benefit**: Enables data integrity verification queries (Example 7 above).

### 7. **Log All Deduction Operations**

✅ **CORRECT** - Structured logging with context:
```typescript
logger.info('CreditDeductionService: Deducting credits atomically', {
  userId,
  creditsToDeduct,
  requestId,
  modelId: tokenUsageRecord.modelId,
  providerId: tokenUsageRecord.providerId
});

// ... perform deduction ...

logger.info('CreditDeductionService: Credits deducted successfully', {
  userId,
  creditsDeducted,
  balanceBefore: result.balanceBefore,
  balanceAfter: result.balanceAfter,
  deductionRecordId: result.deductionRecordId
});
```

**Benefit**: Easier debugging, compliance audits.

### 8. **Set Transaction Timeouts**

✅ **CORRECT** - Set maxWait and timeout:
```typescript
await prisma.$transaction(
  async (tx) => { /* ... */ },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,   // Max 5 seconds to acquire lock
    timeout: 10000,  // Max 10 seconds total transaction time
  }
);
```

**Benefit**: Prevents hung transactions, fails fast under heavy load.

---

## Monitoring & Analytics

### Key Metrics to Track

#### 1. **Credit Deduction Success Rate**

```sql
SELECT
  COUNT(*) as total_deductions,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'reversed' THEN 1 ELSE 0 END) as reversed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::float / COUNT(*)) as success_rate
FROM credit_deduction_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Alert**: If `success_rate < 0.99`, investigate transaction failures.

#### 2. **Average Deduction Latency**

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000) as avg_latency_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at)) * 1000) as p99_ms
FROM credit_deduction_ledger
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Alert**: If `p95_ms > 500`, investigate slow transactions.

#### 3. **Reversal Rate**

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_deductions,
  SUM(CASE WHEN status = 'reversed' THEN 1 ELSE 0 END) as reversals,
  (SUM(CASE WHEN status = 'reversed' THEN 1 ELSE 0 END)::float / COUNT(*)) as reversal_rate
FROM credit_deduction_ledger
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Alert**: If `reversal_rate > 0.01` (1%), investigate quality issues with LLM providers.

#### 4. **Gross Margin by Model**

```sql
SELECT
  model_id,
  COUNT(*) as request_count,
  SUM(vendor_cost) as total_vendor_cost,
  SUM(gross_margin_usd) as total_gross_margin,
  (SUM(gross_margin_usd) / SUM(vendor_cost)) as margin_percentage
FROM token_usage_ledger
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND status = 'success'
GROUP BY model_id
ORDER BY total_gross_margin DESC;
```

**Insight**: Identify most profitable models.

#### 5. **Users with Low Balances**

```sql
SELECT
  u.id,
  u.email,
  ucb.amount as current_balance,
  s.tier as subscription_tier,
  c.monthly_allocation
FROM user_credit_balance ucb
JOIN users u ON ucb.user_id = u.id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN credits c ON u.id = c.user_id AND c.is_current = true
WHERE ucb.amount < (c.monthly_allocation * 0.1)  -- Less than 10% of monthly allocation
ORDER BY ucb.amount ASC
LIMIT 100;
```

**Use Case**: Proactive outreach for upgrade campaigns.

#### 6. **Data Integrity Check**

```sql
-- Run daily to ensure balance integrity
SELECT
  user_id,
  (SELECT SUM(total_credits) FROM credits WHERE user_id = ucb.user_id AND is_current = true) as allocated,
  (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'completed') as deducted,
  (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'reversed') as refunded,
  ucb.amount as current_balance,
  (SELECT SUM(total_credits) FROM credits WHERE user_id = ucb.user_id AND is_current = true) -
  (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'completed') +
  (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'reversed') as calculated_balance,
  ucb.amount -
  ((SELECT SUM(total_credits) FROM credits WHERE user_id = ucb.user_id AND is_current = true) -
   (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'completed') +
   (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'reversed')) as discrepancy
FROM user_credit_balance ucb
WHERE ABS(ucb.amount -
  ((SELECT SUM(total_credits) FROM credits WHERE user_id = ucb.user_id AND is_current = true) -
   (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'completed') +
   (SELECT COALESCE(SUM(amount), 0) FROM credit_deduction_ledger WHERE user_id = ucb.user_id AND status = 'reversed'))) > 0;
```

**Alert**: If any rows returned, balance discrepancies exist (critical bug).

### Dashboard Recommendations

#### Admin Dashboard Widgets

1. **Real-Time Metrics** (refresh every 30 seconds)
   - Total credits deducted today
   - Credits deducted last hour
   - Average deduction latency (p95)
   - Deduction success rate

2. **Financial Metrics** (refresh every 5 minutes)
   - Total vendor cost today
   - Total gross margin today
   - Margin percentage by model
   - Revenue per user tier

3. **User Metrics** (refresh every 15 minutes)
   - Users with low balances (<10%)
   - Users with zero balances
   - Top 10 credit consumers
   - New users needing balance initialization

4. **Health Metrics** (refresh every 1 minute)
   - Transaction success rate
   - Average transaction latency
   - Reversal rate
   - Database connection pool status

#### Alerting Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Deduction success rate | < 99% | Page on-call engineer |
| P95 deduction latency | > 500ms | Investigate slow queries |
| Reversal rate | > 1% | Check LLM provider status |
| Data integrity discrepancies | > 0 | Critical bug, halt credit deductions |
| Transaction timeout errors | > 10/min | Scale database or investigate lock contention |

---

## Summary

This credit deduction flow provides:

✅ **Transaction Safety**: Serializable isolation prevents race conditions
✅ **Audit Trail**: Immutable ledger records every deduction
✅ **Financial Accuracy**: Actual token counts from LLM providers
✅ **Refund Support**: Reversible deductions with admin accountability
✅ **Performance**: Pre-aggregated daily summaries for analytics
✅ **Monitoring**: Comprehensive metrics for health and integrity checks

**Related Services**:
- `CreditDeductionService`: Atomic deduction operations
- `TokenTrackingService`: Token usage recording
- `CostCalculationService`: Vendor cost calculation
- `PricingConfigService`: Margin multiplier configuration

**Database Tables**:
- `token_usage_ledger`: Detailed token tracking
- `credit_deduction_ledger`: Audit trail with balance snapshots
- `user_credit_balance`: Current balance (fast lookup)
- `token_usage_daily_summary`: Pre-aggregated analytics

**Key Design Principles**:
1. Atomic transactions with row-level locking
2. Immutable audit records (mark as reversed, never delete)
3. Balance snapshots for integrity verification
4. Pre-flight validation to fail fast
5. Comprehensive logging for debugging and compliance

---

**Document Version**: 1.0
**Last Updated**: 2025-01-17
**Maintained By**: Backend Team
**Review Cycle**: Quarterly
