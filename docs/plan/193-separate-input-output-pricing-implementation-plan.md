# Separate Input/Output Pricing Implementation Plan

**Status:** 🟢 Implementation Plan - Pre-Launch
**Priority:** P0 - Critical Bug Fix + Architecture Improvement
**Created:** 2025-11-19
**Target Completion:** Pre-Launch (Before March 2026)

---

## Executive Summary

Implement **separate input and output credit pricing** instead of averaged credits per 1K tokens. This is the most accurate pricing model and eliminates the need for ratio estimation.

**Key Decision:** Since the project hasn't launched yet, we can implement Phase 3 directly without data migration concerns.

---

## Current vs New Architecture

### Current (Flawed)

```typescript
interface ModelPricing {
  creditsPer1kTokens: number;  // Single averaged value
}

// Usage calculation
const totalTokens = inputTokens + outputTokens;
const credits = Math.ceil((totalTokens / 1000) * model.creditsPer1kTokens);
```

**Problems:**
1. Unit mismatch bug (cents vs dollars)
2. Averaging doesn't reflect real usage
3. Inaccurate for asymmetric pricing models

### New (Accurate)

```typescript
interface ModelPricing {
  inputCreditsPerK: number;   // Credits per 1K input tokens
  outputCreditsPerK: number;  // Credits per 1K output tokens
}

// Usage calculation
const inputCredits = Math.ceil((inputTokens / 1000) * model.inputCreditsPerK);
const outputCredits = Math.ceil((outputTokens / 1000) * model.outputCreditsPerK);
const totalCredits = inputCredits + outputCredits;
```

**Benefits:**
1. ✅ No unit conversion bugs - direct credit values
2. ✅ No ratio estimation needed - charge exactly what was used
3. ✅ Fair pricing for all usage patterns
4. ✅ Transparent cost breakdown for users

---

## Implementation Phases

### Phase 1: Database Schema Changes
### Phase 2: Type System Updates
### Phase 3: Calculation Logic Updates
### Phase 4: API Response Updates
### Phase 5: Frontend UI Updates
### Phase 6: Seed Data Migration
### Phase 7: Testing & Validation
### Phase 8: Documentation Updates

---

## Phase 1: Database Schema Changes

### 1.1 Update Prisma Schema

**File:** `backend/prisma/schema.prisma`

#### Changes to `models` table

The `meta` JSONB field already supports flexible schema evolution, so we just need to update the TypeScript types. No Prisma migration needed for JSONB changes.

#### Changes to `token_usage_ledger` table

Add credit breakdown fields to track separate charges:

```prisma
model token_usage_ledger {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id           String   @db.Uuid
  model_id          String
  input_tokens      Int
  output_tokens     Int

  // NEW: Separate credit charges
  input_credits     Int      @map("input_credits")
  output_credits    Int      @map("output_credits")
  total_credits     Int      @map("total_credits")  // input_credits + output_credits

  // OLD: Deprecated (keep for backwards compatibility during transition)
  credits_used      Int?     @map("credits_used")  // Will be removed later

  // ... rest of fields

  @@index([user_id, created_at])
  @@index([model_id, created_at])
  @@map("token_usage_ledger")
}
```

#### Migration Script

**File:** `backend/prisma/migrations/YYYYMMDDHHMMSS_add_separate_input_output_credits/migration.sql`

```sql
-- Add new credit breakdown columns
ALTER TABLE token_usage_ledger
ADD COLUMN input_credits INT,
ADD COLUMN output_credits INT,
ADD COLUMN total_credits INT;

-- Add NOT NULL constraints (after backfilling if needed)
-- For new project, can add NOT NULL directly
ALTER TABLE token_usage_ledger
ALTER COLUMN input_credits SET NOT NULL,
ALTER COLUMN output_credits SET NOT NULL,
ALTER COLUMN total_credits SET NOT NULL;

-- Add check constraint
ALTER TABLE token_usage_ledger
ADD CONSTRAINT check_total_credits
CHECK (total_credits = input_credits + output_credits);

-- Make old credits_used nullable (for backwards compatibility)
ALTER TABLE token_usage_ledger
ALTER COLUMN credits_used DROP NOT NULL;

-- Add index for credit queries
CREATE INDEX idx_token_usage_total_credits ON token_usage_ledger(total_credits);
```

### 1.2 Create Migration

```bash
cd backend
npx prisma migrate dev --name add_separate_input_output_credits
```

---

## Phase 2: Type System Updates

### 2.1 Update ModelMeta Type

**File:** `backend/src/types/model-meta.ts`

```typescript
/**
 * Complete JSONB metadata schema for Model table
 * WITH SEPARATE INPUT/OUTPUT PRICING
 */
export const ModelMetaSchema = z.object({
  // Display Information
  displayName: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  version: z.string().max(50).optional(),

  // Capabilities
  capabilities: z.array(ModelCapabilitySchema).min(1),

  // Context & Output Limits
  contextLength: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive().optional(),

  // Vendor Pricing (in cents per million tokens)
  inputCostPerMillionTokens: z.number().int().nonnegative(),
  outputCostPerMillionTokens: z.number().int().nonnegative(),

  // ✅ NEW: Separate Input/Output Credits
  inputCreditsPerK: z.number().int().positive(),
  outputCreditsPerK: z.number().int().positive(),

  // ❌ DEPRECATED: Remove after migration
  // creditsPer1kTokens: z.number().int().positive(),

  // Tier Access Control
  requiredTier: SubscriptionTierSchema,
  tierRestrictionMode: TierRestrictionModeSchema,
  allowedTiers: z.array(SubscriptionTierSchema).min(1),

  // Legacy Management (Optional)
  legacyReplacementModelId: z.string().max(100).optional(),
  deprecationNotice: z.string().max(1000).optional(),
  sunsetDate: z.string().datetime().optional(),

  // Provider-Specific Extensions
  providerMetadata: z.object({
    openai: z.object({
      modelFamily: z.string().optional(),
      trainingCutoff: z.string().optional(),
    }).optional(),
    anthropic: z.object({
      modelSeries: z.string().optional(),
      knowledgeCutoff: z.string().optional(),
    }).optional(),
    google: z.object({
      modelType: z.string().optional(),
      tuningSupport: z.boolean().optional(),
    }).optional(),
  }).optional(),

  // Admin Metadata
  internalNotes: z.string().max(5000).optional(),
  complianceTags: z.array(z.string().max(50)).optional(),
});

export type ModelMeta = z.infer<typeof ModelMetaSchema>;
```

### 2.2 Update Calculation Function

**File:** `backend/src/types/model-meta.ts`

```typescript
/**
 * Calculate separate input and output credits from vendor pricing
 *
 * @param inputCostPerMillion - Input cost per 1M tokens (cents)
 * @param outputCostPerMillion - Output cost per 1M tokens (cents)
 * @param marginMultiplier - Profit margin multiplier (default 2.5)
 * @param creditUsdValue - USD value per credit (default $0.0005 = 0.05 cents)
 * @returns Separate input and output credits per 1K tokens
 */
export function calculateSeparateCreditsPerKTokens(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier: number = 2.5,
  creditUsdValue: number = 0.0005
): {
  inputCreditsPerK: number;
  outputCreditsPerK: number;
  estimatedTotalPerK: number;  // For typical 1:10 usage ratio
} {
  // Convert to cost per 1K tokens
  const inputCostPer1K = inputCostPerMillion / 1000;   // cents
  const outputCostPer1K = outputCostPerMillion / 1000; // cents

  // Apply margin
  const inputCostWithMargin = inputCostPer1K * marginMultiplier;
  const outputCostWithMargin = outputCostPer1K * marginMultiplier;

  // Convert to credits (FIX: Convert USD to cents)
  const creditCentValue = creditUsdValue * 100; // 0.0005 USD = 0.05 cents

  const inputCreditsPerK = Math.ceil(inputCostWithMargin / creditCentValue);
  const outputCreditsPerK = Math.ceil(outputCostWithMargin / creditCentValue);

  // Estimate total for typical usage (1:10 ratio)
  const estimatedTotalPerK = Math.ceil(
    (1 * inputCreditsPerK + 10 * outputCreditsPerK) / 11
  );

  return {
    inputCreditsPerK,
    outputCreditsPerK,
    estimatedTotalPerK,
  };
}

/**
 * Example calculation:
 * Input: $1.25/1M = 125 cents/1M
 * Output: $10/1M = 1000 cents/1M
 * Margin: 2.5×
 *
 * inputCostPer1K = 125/1000 = 0.125 cents
 * outputCostPer1K = 1000/1000 = 1.0 cents
 *
 * inputWithMargin = 0.125 × 2.5 = 0.3125 cents
 * outputWithMargin = 1.0 × 2.5 = 2.5 cents
 *
 * creditCentValue = 0.0005 × 100 = 0.05 cents
 *
 * inputCreditsPerK = ceil(0.3125 / 0.05) = ceil(6.25) = 7 credits
 * outputCreditsPerK = ceil(2.5 / 0.05) = ceil(50) = 50 credits
 *
 * For typical 1:10 usage:
 * estimatedTotalPerK = ceil((1×7 + 10×50) / 11) = ceil(507/11) = 47 credits
 */
```

### 2.3 Update Shared Types

**File:** `shared-types/src/model.types.ts`

```typescript
/**
 * Model pricing information (camelCase for API)
 */
export interface ModelPricing {
  inputCostPerMillionTokens: number;   // Vendor cost in cents
  outputCostPerMillionTokens: number;  // Vendor cost in cents
  inputCreditsPerK: number;            // Our credits per 1K input tokens
  outputCreditsPerK: number;           // Our credits per 1K output tokens

  // Deprecated (keep for backwards compatibility)
  creditsPer1kTokens?: number;
}

/**
 * Token usage with credit breakdown
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  inputCredits: number;
  outputCredits: number;
  totalCredits: number;

  // Cost breakdown
  inputCost: number;   // USD
  outputCost: number;  // USD
  totalCost: number;   // USD
}
```

---

## Phase 3: Calculation Logic Updates

### 3.1 Update Credit Deduction Service

**File:** `backend/src/services/credit-deduction.service.ts`

```typescript
/**
 * Calculate credit cost for inference request with separate input/output pricing
 */
async calculateInferenceCost(
  userId: string,
  modelId: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): Promise<{
  inputCredits: number;
  outputCredits: number;
  totalCredits: number;
  breakdown: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}> {
  logger.debug('CreditDeductionService: Calculating inference cost', {
    userId,
    modelId,
    estimatedInputTokens,
    estimatedOutputTokens,
  });

  // Get model pricing
  const model = await this.prisma.models.findUnique({
    where: { id: modelId },
    select: { meta: true },
  });

  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const meta = model.meta as any;

  // ✅ NEW: Use separate input/output credits
  const inputCreditsPerK = meta.inputCreditsPerK || 0;
  const outputCreditsPerK = meta.outputCreditsPerK || 0;

  if (inputCreditsPerK === 0 || outputCreditsPerK === 0) {
    throw new Error(
      `Model ${modelId} missing input/output credit pricing. ` +
      `Please update model metadata with inputCreditsPerK and outputCreditsPerK.`
    );
  }

  // Calculate credits
  const inputCredits = Math.ceil((estimatedInputTokens / 1000) * inputCreditsPerK);
  const outputCredits = Math.ceil((estimatedOutputTokens / 1000) * outputCreditsPerK);
  const totalCredits = inputCredits + outputCredits;

  // Calculate USD costs (for display)
  const creditUsdValue = 0.0005; // $0.0005 per credit
  const inputCost = inputCredits * creditUsdValue;
  const outputCost = outputCredits * creditUsdValue;
  const totalCost = inputCost + outputCost;

  logger.info('CreditDeductionService: Cost calculated', {
    userId,
    modelId,
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    inputCredits,
    outputCredits,
    totalCredits,
    totalCost,
  });

  return {
    inputCredits,
    outputCredits,
    totalCredits,
    breakdown: {
      inputCost,
      outputCost,
      totalCost,
    },
  };
}

/**
 * Deduct credits with separate tracking
 */
async deductCredits(
  userId: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  inputCredits: number,
  outputCredits: number,
  totalCredits: number,
  requestId: string
): Promise<void> {
  logger.info('CreditDeductionService: Deducting credits', {
    userId,
    modelId,
    inputTokens,
    outputTokens,
    inputCredits,
    outputCredits,
    totalCredits,
    requestId,
  });

  // Atomic transaction
  await this.prisma.$transaction(async (tx) => {
    // 1. Deduct from user's credit balance
    const updatedCredit = await tx.credit.update({
      where: { user_id: userId },
      data: {
        balance: {
          decrement: totalCredits,
        },
        last_usage_at: new Date(),
      },
      select: {
        balance: true,
      },
    });

    logger.debug('CreditDeductionService: Updated credit balance', {
      userId,
      newBalance: updatedCredit.balance,
    });

    // 2. Record usage in token_usage_ledger with separate credits
    await tx.token_usage_ledger.create({
      data: {
        user_id: userId,
        model_id: modelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_credits: inputCredits,
        output_credits: outputCredits,
        total_credits: totalCredits,
        request_id: requestId,
        created_at: new Date(),

        // Deprecated (keep for backwards compatibility)
        credits_used: totalCredits,
      },
    });

    logger.info('CreditDeductionService: Credits deducted successfully', {
      userId,
      totalCredits,
      newBalance: updatedCredit.balance,
    });
  });
}
```

### 3.2 Update LLM Service

**File:** `backend/src/services/llm.service.ts`

Update all inference methods to use separate credit calculation:

```typescript
/**
 * Chat completion with separate input/output credit tracking
 */
async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  // ... validation ...

  // Estimate tokens
  const estimatedInputTokens = this.estimateInputTokens(request.messages);
  const estimatedOutputTokens = request.max_tokens || 1000;

  // ✅ Calculate separate credits
  const costEstimate = await this.creditDeduction.calculateInferenceCost(
    userId,
    request.model,
    estimatedInputTokens,
    estimatedOutputTokens
  );

  logger.info('LLMService: Estimated cost', {
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    inputCredits: costEstimate.inputCredits,
    outputCredits: costEstimate.outputCredits,
    totalCredits: costEstimate.totalCredits,
  });

  // Pre-deduct credits
  await this.creditDeduction.deductCredits(
    userId,
    request.model,
    estimatedInputTokens,
    estimatedOutputTokens,
    costEstimate.inputCredits,
    costEstimate.outputCredits,
    costEstimate.totalCredits,
    requestId
  );

  // ... call provider API ...

  // Get actual token usage from response
  const actualInputTokens = response.usage?.prompt_tokens || estimatedInputTokens;
  const actualOutputTokens = response.usage?.completion_tokens || estimatedOutputTokens;

  // ✅ Calculate actual credits based on real usage
  const actualCost = await this.creditDeduction.calculateInferenceCost(
    userId,
    request.model,
    actualInputTokens,
    actualOutputTokens
  );

  // Adjust credits if different from estimate
  const creditDifference = actualCost.totalCredits - costEstimate.totalCredits;
  if (creditDifference !== 0) {
    await this.creditDeduction.adjustCredits(
      userId,
      creditDifference,
      requestId,
      'Token usage adjustment'
    );
  }

  return {
    ...response,
    usage: {
      promptTokens: actualInputTokens,
      completionTokens: actualOutputTokens,
      totalTokens: actualInputTokens + actualOutputTokens,
      inputCredits: actualCost.inputCredits,
      outputCredits: actualCost.outputCredits,
      totalCredits: actualCost.totalCredits,
      costBreakdown: actualCost.breakdown,
    },
  };
}
```

---

## Phase 4: API Response Updates

### 4.1 Update Model Response

**File:** `backend/src/types/model-validation.ts`

```typescript
/**
 * Model list response item with separate input/output pricing
 */
export const ModelListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  context_length: z.number(),
  max_output_tokens: z.number(),

  // ✅ NEW: Separate pricing
  input_credits_per_1k: z.number(),
  output_credits_per_1k: z.number(),
  estimated_credits_per_1k: z.number(),  // For typical 1:10 usage

  // ❌ DEPRECATED (keep for backwards compatibility)
  credits_per_1k_tokens: z.number().optional(),

  is_available: z.boolean(),
  version: z.string(),

  // Tier access
  required_tier: z.string(),
  tier_restriction_mode: z.enum(['minimum', 'exact', 'whitelist']),
  allowed_tiers: z.array(z.string()),
  access_status: z.enum(['allowed', 'restricted', 'upgrade_required']),
});
```

### 4.2 Update Controllers

**File:** `backend/src/controllers/models.controller.ts`

```typescript
async listModels(req: Request, res: Response): Promise<void> {
  // ... get models ...

  const response: ModelListResponse = {
    models: models.map((model) => {
      const meta = model.meta as any;

      return {
        id: model.id,
        name: meta?.displayName ?? model.id,
        provider: model.provider,
        description: meta?.description ?? '',
        capabilities: meta?.capabilities ?? [],
        context_length: meta?.contextLength ?? 0,
        max_output_tokens: meta?.maxOutputTokens ?? 0,

        // ✅ NEW: Separate pricing
        input_credits_per_1k: meta?.inputCreditsPerK ?? 0,
        output_credits_per_1k: meta?.outputCreditsPerK ?? 0,
        estimated_credits_per_1k: Math.ceil(
          (1 * (meta?.inputCreditsPerK ?? 0) + 10 * (meta?.outputCreditsPerK ?? 0)) / 11
        ),

        // ❌ DEPRECATED (backwards compatibility)
        credits_per_1k_tokens: meta?.creditsPer1kTokens,

        is_available: model.is_available,
        version: meta?.version ?? '',
        required_tier: meta?.requiredTier ?? 'free',
        tier_restriction_mode: meta?.tierRestrictionMode ?? 'minimum',
        allowed_tiers: meta?.allowedTiers ?? ['free'],
        access_status: accessStatus,
      };
    }),
    total: models.length,
    user_tier: userTier,
  };

  res.json(response);
}
```

---

## Phase 5: Frontend UI Updates

### 5.1 Update Model Templates

**File:** `frontend/src/data/modelTemplates.ts`

```typescript
/**
 * Calculate separate input and output credits from vendor pricing
 */
export function calculateSeparateCredits(
  inputCostPerMillion: number,  // cents
  outputCostPerMillion: number, // cents
  marginMultiplier = 2.5,
  creditUSDValue = 0.0005
): {
  inputCreditsPerK: number;
  outputCreditsPerK: number;
  estimatedTotalPerK: number;
} {
  if (!inputCostPerMillion || !outputCostPerMillion) {
    return {
      inputCreditsPerK: 0,
      outputCreditsPerK: 0,
      estimatedTotalPerK: 0,
    };
  }

  // Convert to cost per 1K tokens
  const inputCostPer1K = inputCostPerMillion / 1000;
  const outputCostPer1K = outputCostPerMillion / 1000;

  // Apply margin
  const inputWithMargin = inputCostPer1K * marginMultiplier;
  const outputWithMargin = outputCostPer1K * marginMultiplier;

  // Convert to credits (FIX: Convert USD to cents)
  const creditCentValue = creditUSDValue * 100;

  const inputCreditsPerK = Math.ceil(inputWithMargin / creditCentValue);
  const outputCreditsPerK = Math.ceil(outputWithMargin / creditCentValue);

  // Estimate for typical 1:10 usage
  const estimatedTotalPerK = Math.ceil(
    (1 * inputCreditsPerK + 10 * outputCreditsPerK) / 11
  );

  return {
    inputCreditsPerK,
    outputCreditsPerK,
    estimatedTotalPerK,
  };
}
```

### 5.2 Update Edit Model Dialog

**File:** `frontend/src/components/admin/EditModelDialog.tsx`

```typescript
// Add state for separate credits
const [inputCreditsPerK, setInputCreditsPerK] = useState('');
const [outputCreditsPerK, setOutputCreditsPerK] = useState('');
const [estimatedTotalPerK, setEstimatedTotalPerK] = useState('');

// Auto-calculate when pricing changes
useEffect(() => {
  const inputDollars = parseFloat(inputCost);
  const outputDollars = parseFloat(outputCost);
  const inputCents = Math.round(inputDollars * 100);
  const outputCents = Math.round(outputDollars * 100);

  if (!isNaN(inputCents) && !isNaN(outputCents)) {
    const calculated = calculateSeparateCredits(inputCents, outputCents);
    setInputCreditsPerK(calculated.inputCreditsPerK.toString());
    setOutputCreditsPerK(calculated.outputCreditsPerK.toString());
    setEstimatedTotalPerK(calculated.estimatedTotalPerK.toString());
    setShowAutoCalculation(true);
  } else {
    setShowAutoCalculation(false);
  }
}, [inputCost, outputCost]);

// Render separate credit fields
<div className="grid grid-cols-3 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Input Credits per 1K
      <span className="text-red-500">*</span>
    </label>
    <Input
      type="number"
      value={inputCreditsPerK}
      onChange={(e) => setInputCreditsPerK(e.target.value)}
      placeholder="e.g., 7"
      min="1"
    />
    {showAutoCalculation && (
      <p className="text-xs text-green-600 mt-1">
        ✓ Auto-calculated from pricing
      </p>
    )}
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Output Credits per 1K
      <span className="text-red-500">*</span>
    </label>
    <Input
      type="number"
      value={outputCreditsPerK}
      onChange={(e) => setOutputCreditsPerK(e.target.value)}
      placeholder="e.g., 50"
      min="1"
    />
    {showAutoCalculation && (
      <p className="text-xs text-green-600 mt-1">
        ✓ Auto-calculated from pricing
      </p>
    )}
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Estimated Total (1:10 usage)
    </label>
    <Input
      type="number"
      value={estimatedTotalPerK}
      disabled
      className="bg-gray-50"
    />
    <p className="text-xs text-gray-500 mt-1">
      For typical chat usage
    </p>
  </div>
</div>
```

### 5.3 Update Model List Display

**File:** `frontend/src/components/admin/ModelListTable.tsx`

```typescript
<TableCell>
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <ArrowDownToLine className="h-3 w-3 text-blue-500" />
      <span className="text-sm font-medium">
        {model.inputCreditsPerK} credits/1K input
      </span>
    </div>
    <div className="flex items-center gap-2">
      <ArrowUpFromLine className="h-3 w-3 text-purple-500" />
      <span className="text-sm font-medium">
        {model.outputCreditsPerK} credits/1K output
      </span>
    </div>
    <div className="text-xs text-gray-500">
      ~{model.estimatedCreditsPerK} credits/1K (typical usage)
    </div>
  </div>
</TableCell>
```

---

## Phase 6: Seed Data Migration

### 6.1 Update Seed Script

**File:** `backend/prisma/seed.ts`

```typescript
// Helper function to calculate separate credits
function calculateModelCredits(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier: number = 2.5
): {
  inputCreditsPerK: number;
  outputCreditsPerK: number;
} {
  const creditUsdValue = 0.0005;
  const creditCentValue = creditUsdValue * 100; // 0.05 cents

  const inputCostPer1K = inputCostPerMillion / 1000;
  const outputCostPer1K = outputCostPerMillion / 1000;

  const inputWithMargin = inputCostPer1K * marginMultiplier;
  const outputWithMargin = outputCostPer1K * marginMultiplier;

  const inputCreditsPerK = Math.ceil(inputWithMargin / creditCentValue);
  const outputCreditsPerK = Math.ceil(outputWithMargin / creditCentValue);

  return { inputCreditsPerK, outputCreditsPerK };
}

// Example: GPT-5 Chat
const gpt5InputCost = 125;  // $1.25 per 1M = 125 cents
const gpt5OutputCost = 1000; // $10 per 1M = 1000 cents
const gpt5Credits = calculateModelCredits(gpt5InputCost, gpt5OutputCost, 2.5);

console.log('GPT-5 Credits:', gpt5Credits);
// Output: { inputCreditsPerK: 7, outputCreditsPerK: 50 }

await prisma.models.upsert({
  where: { id: 'gpt-5-chat' },
  update: {},
  create: {
    id: 'gpt-5-chat',
    name: 'GPT-5 Chat',
    provider: 'openai',
    is_available: true,
    is_legacy: false,
    is_archived: false,
    meta: {
      displayName: 'GPT-5 Chat',
      description: 'OpenAI GPT-5 optimized for chat with 272K context',
      version: '2025-08-07',
      capabilities: ['text', 'function_calling'],
      contextLength: 272000,
      maxOutputTokens: 16384,

      // Vendor pricing
      inputCostPerMillionTokens: gpt5InputCost,   // 125 cents = $1.25
      outputCostPerMillionTokens: gpt5OutputCost, // 1000 cents = $10.00

      // ✅ NEW: Separate input/output credits
      inputCreditsPerK: gpt5Credits.inputCreditsPerK,   // 7 credits
      outputCreditsPerK: gpt5Credits.outputCreditsPerK, // 50 credits

      // Tier access
      requiredTier: 'pro',
      tierRestrictionMode: 'minimum',
      allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],

      providerMetadata: {
        openai: {
          modelFamily: 'gpt-5',
          trainingCutoff: '2025-06',
        },
      },
    },
    created_at: new Date(),
    updated_at: new Date(),
  },
});
```

### 6.2 Seed All Models

```typescript
// Model configurations with separate credits
const modelConfigs = [
  {
    id: 'gpt-5-chat',
    name: 'GPT-5 Chat',
    provider: 'openai',
    inputCost: 125,   // $1.25/1M
    outputCost: 1000, // $10/1M
    margin: 2.5,
    // Results: input: 7, output: 50
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    inputCost: 15,    // $0.15/1M
    outputCost: 60,   // $0.60/1M
    margin: 2.5,
    // Results: input: 1, output: 3
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    inputCost: 150,   // $1.50/1M
    outputCost: 750,  // $7.50/1M
    margin: 2.5,
    // Results: input: 8, output: 38
  },
  // ... add all 20 models
];

// Seed all models
for (const config of modelConfigs) {
  const credits = calculateModelCredits(
    config.inputCost,
    config.outputCost,
    config.margin
  );

  console.log(`${config.id}: input ${credits.inputCreditsPerK}, output ${credits.outputCreditsPerK}`);

  await prisma.models.upsert({
    where: { id: config.id },
    update: {},
    create: {
      // ... model creation with separate credits
    },
  });
}
```

---

## Phase 7: Testing & Validation

### 7.1 Unit Tests

**File:** `backend/src/__tests__/unit/separate-pricing.test.ts`

```typescript
import { calculateSeparateCreditsPerKTokens } from '@/types/model-meta';

describe('Separate Input/Output Pricing', () => {
  describe('calculateSeparateCreditsPerKTokens', () => {
    it('should calculate separate credits correctly', () => {
      // User's example: Input $1.25, Output $10
      const result = calculateSeparateCreditsPerKTokens(125, 1000, 2.5, 0.0005);

      expect(result.inputCreditsPerK).toBe(7);   // ceil(0.3125 / 0.05)
      expect(result.outputCreditsPerK).toBe(50); // ceil(2.5 / 0.05)
      expect(result.estimatedTotalPerK).toBe(47); // For 1:10 usage
    });

    it('should match manual calculation', () => {
      // Manual calculation:
      // Input: $1.25/1M = 125 cents/1M
      // Per 1K: 0.125 cents
      // With margin: 0.3125 cents
      // Credits: 0.3125 / 0.05 = 6.25 → 7

      // Output: $10/1M = 1000 cents/1M
      // Per 1K: 1.0 cents
      // With margin: 2.5 cents
      // Credits: 2.5 / 0.05 = 50

      const result = calculateSeparateCreditsPerKTokens(125, 1000);

      expect(result.inputCreditsPerK).toBe(7);
      expect(result.outputCreditsPerK).toBe(50);
    });

    it('should handle different margin multipliers', () => {
      // Pro tier: 1.0× margin (break-even)
      const proResult = calculateSeparateCreditsPerKTokens(125, 1000, 1.0);
      expect(proResult.inputCreditsPerK).toBe(3);  // ceil(0.125 / 0.05)
      expect(proResult.outputCreditsPerK).toBe(20); // ceil(1.0 / 0.05)

      // Pro Max tier: 1.25× margin
      const proMaxResult = calculateSeparateCreditsPerKTokens(125, 1000, 1.25);
      expect(proMaxResult.inputCreditsPerK).toBe(4);  // ceil(0.15625 / 0.05)
      expect(proMaxResult.outputCreditsPerK).toBe(25); // ceil(1.25 / 0.05)
    });

    it('should estimate total for typical usage', () => {
      const result = calculateSeparateCreditsPerKTokens(125, 1000);

      // For 1:10 usage (100 input tokens, 1000 output tokens)
      // inputCredits = (100/1000) × 7 = 0.7 → 1
      // outputCredits = (1000/1000) × 50 = 50
      // total = 51

      // But estimatedTotalPerK uses (1×7 + 10×50)/11 = 47
      expect(result.estimatedTotalPerK).toBe(47);
    });
  });

  describe('Credit Deduction', () => {
    it('should deduct separate credits correctly', async () => {
      // Setup: Create test user and model
      const userId = 'test-user';
      const modelId = 'gpt-5-chat';

      // Simulate: 100 input tokens, 1000 output tokens
      const inputTokens = 100;
      const outputTokens = 1000;

      // Expected credits (based on 7 input, 50 output per 1K)
      const expectedInputCredits = Math.ceil((100 / 1000) * 7); // 1 credit
      const expectedOutputCredits = Math.ceil((1000 / 1000) * 50); // 50 credits
      const expectedTotal = 51; // 1 + 50

      const result = await creditDeductionService.calculateInferenceCost(
        userId,
        modelId,
        inputTokens,
        outputTokens
      );

      expect(result.inputCredits).toBe(expectedInputCredits);
      expect(result.outputCredits).toBe(expectedOutputCredits);
      expect(result.totalCredits).toBe(expectedTotal);
    });

    it('should handle fractional tokens correctly', async () => {
      // 1500 input tokens, 500 output tokens
      const inputTokens = 1500;
      const outputTokens = 500;

      // inputCredits = ceil((1500/1000) × 7) = ceil(10.5) = 11
      // outputCredits = ceil((500/1000) × 50) = ceil(25) = 25
      // total = 36

      const result = await creditDeductionService.calculateInferenceCost(
        'user-id',
        'gpt-5-chat',
        inputTokens,
        outputTokens
      );

      expect(result.inputCredits).toBe(11);
      expect(result.outputCredits).toBe(25);
      expect(result.totalCredits).toBe(36);
    });
  });
});
```

### 7.2 Integration Tests

**File:** `backend/src/__tests__/integration/separate-pricing-api.test.ts`

```typescript
describe('Separate Pricing API Integration', () => {
  it('should return models with separate pricing', async () => {
    const response = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.models).toHaveLength(20);

    const gpt5 = response.body.models.find((m: any) => m.id === 'gpt-5-chat');
    expect(gpt5).toMatchObject({
      id: 'gpt-5-chat',
      name: 'GPT-5 Chat',
      inputCreditsPerK: 7,
      outputCreditsPerK: 50,
      estimatedCreditsPerK: 47,
    });
  });

  it('should charge separate credits for inference', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        model: 'gpt-5-chat',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100,
      })
      .expect(200);

    expect(response.body.usage).toMatchObject({
      promptTokens: expect.any(Number),
      completionTokens: expect.any(Number),
      totalTokens: expect.any(Number),
      inputCredits: expect.any(Number),
      outputCredits: expect.any(Number),
      totalCredits: expect.any(Number),
      costBreakdown: {
        inputCost: expect.any(Number),
        outputCost: expect.any(Number),
        totalCost: expect.any(Number),
      },
    });

    // Verify credit deduction in database
    const usage = await prisma.token_usage_ledger.findFirst({
      where: {
        user_id: userId,
        model_id: 'gpt-5-chat',
      },
      orderBy: { created_at: 'desc' },
    });

    expect(usage).toMatchObject({
      input_tokens: expect.any(Number),
      output_tokens: expect.any(Number),
      input_credits: expect.any(Number),
      output_credits: expect.any(Number),
      total_credits: expect.any(Number),
    });

    // Verify total_credits = input_credits + output_credits
    expect(usage!.total_credits).toBe(
      usage!.input_credits + usage!.output_credits
    );
  });
});
```

### 7.3 E2E Tests

**File:** `backend/tests/e2e/separate-pricing-flow.test.ts`

```typescript
describe('Separate Pricing End-to-End', () => {
  it('should complete full inference flow with separate pricing', async () => {
    // 1. List models - verify pricing
    const modelsResponse = await request(app)
      .get('/v1/models')
      .set('Authorization', `Bearer ${accessToken}`);

    const gpt5 = modelsResponse.body.models.find((m: any) => m.id === 'gpt-5-chat');
    expect(gpt5.inputCreditsPerK).toBe(7);
    expect(gpt5.outputCreditsPerK).toBe(50);

    // 2. Check initial credit balance
    const balanceBefore = await prisma.credit.findUnique({
      where: { user_id: userId },
      select: { balance: true },
    });

    // 3. Make inference request
    const chatResponse = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        model: 'gpt-5-chat',
        messages: [
          { role: 'user', content: 'Write a haiku about coding' }
        ],
        max_tokens: 50,
      });

    // 4. Verify usage breakdown
    const usage = chatResponse.body.usage;
    expect(usage.inputCredits).toBeGreaterThan(0);
    expect(usage.outputCredits).toBeGreaterThan(0);
    expect(usage.totalCredits).toBe(usage.inputCredits + usage.outputCredits);

    // 5. Verify credit deduction
    const balanceAfter = await prisma.credit.findUnique({
      where: { user_id: userId },
      select: { balance: true },
    });

    expect(balanceAfter!.balance).toBe(
      balanceBefore!.balance - usage.totalCredits
    );

    // 6. Verify usage ledger
    const ledgerEntry = await prisma.token_usage_ledger.findFirst({
      where: { user_id: userId, model_id: 'gpt-5-chat' },
      orderBy: { created_at: 'desc' },
    });

    expect(ledgerEntry).toMatchObject({
      input_tokens: usage.promptTokens,
      output_tokens: usage.completionTokens,
      input_credits: usage.inputCredits,
      output_credits: usage.outputCredits,
      total_credits: usage.totalCredits,
    });
  });
});
```

---

## Phase 8: Documentation Updates

### 8.1 API Documentation

**File:** `docs/reference/193-separate-input-output-pricing-api.md`

```markdown
# Separate Input/Output Pricing API

## Overview

Models now charge **separate credits for input and output tokens**, providing transparent and accurate cost breakdown.

## Model Response Format

\`\`\`json
{
  "id": "gpt-5-chat",
  "name": "GPT-5 Chat",
  "provider": "openai",
  "inputCreditsPerK": 7,
  "outputCreditsPerK": 50,
  "estimatedCreditsPerK": 47,
  "inputCostPerMillionTokens": 125,
  "outputCostPerMillionTokens": 1000
}
\`\`\`

## Usage Response Format

\`\`\`json
{
  "usage": {
    "promptTokens": 120,
    "completionTokens": 850,
    "totalTokens": 970,
    "inputCredits": 1,
    "outputCredits": 43,
    "totalCredits": 44,
    "costBreakdown": {
      "inputCost": 0.0005,
      "outputCost": 0.0215,
      "totalCost": 0.022
    }
  }
}
\`\`\`

## Calculation Formula

\`\`\`
inputCredits = ceil((inputTokens / 1000) × inputCreditsPerK)
outputCredits = ceil((outputTokens / 1000) × outputCreditsPerK)
totalCredits = inputCredits + outputCredits
\`\`\`

## Example Calculation

**Request:**
- Model: GPT-5 Chat
- Input tokens: 120
- Output tokens: 850
- Input credits per 1K: 7
- Output credits per 1K: 50

**Calculation:**
\`\`\`
inputCredits = ceil((120 / 1000) × 7) = ceil(0.84) = 1
outputCredits = ceil((850 / 1000) × 50) = ceil(42.5) = 43
totalCredits = 1 + 43 = 44
\`\`\`

**Cost:**
\`\`\`
inputCost = 1 × $0.0005 = $0.0005
outputCost = 43 × $0.0005 = $0.0215
totalCost = $0.022
\`\`\`
\`\`\`

### 8.2 User Guide

**File:** `docs/guides/understanding-separate-pricing.md`

```markdown
# Understanding Separate Input/Output Pricing

## Why Separate Pricing?

Traditional pricing averages input and output costs, which doesn't reflect real-world usage:

- **Chat applications:** Use 10-12× more output tokens than input
- **Code generation:** Uses 15-20× more output tokens
- **Summarization:** Uses mostly input tokens, minimal output

**Separate pricing charges you exactly for what you use.**

## How It Works

### Input Tokens
- Tokens you send to the model (your prompt)
- Charged at **input credits per 1K tokens**
- Example: "Write a haiku about coding" = ~10 tokens

### Output Tokens
- Tokens the model generates (the response)
- Charged at **output credits per 1K tokens**
- Example: A generated haiku = ~50 tokens

### Total Cost
\`\`\`
Total Credits = (Input Tokens / 1000 × Input Credits)
              + (Output Tokens / 1000 × Output Credits)
\`\`\`

## Example: GPT-5 Chat

**Pricing:**
- Input: 7 credits per 1K tokens
- Output: 50 credits per 1K tokens

**Scenario: Short prompt, long response**
- Input: 50 tokens = (50/1000 × 7) = 0.35 → **1 credit**
- Output: 2000 tokens = (2000/1000 × 50) = 100 → **100 credits**
- **Total: 101 credits** ($0.0505)

**Scenario: Long prompt, short response**
- Input: 5000 tokens = (5000/1000 × 7) = 35 → **35 credits**
- Output: 200 tokens = (200/1000 × 50) = 10 → **10 credits**
- **Total: 45 credits** ($0.0225)

## Comparison: Old vs New Pricing

### Old (Averaged)
- Averaged cost: 29 credits per 1K tokens (all tokens treated equally)
- Short prompt + long response: (50 + 2000) / 1000 × 29 = **60 credits** ❌
- Long prompt + short response: (5000 + 200) / 1000 × 29 = **151 credits** ❌

### New (Separate)
- Short prompt + long response: **101 credits** ✅ (pays more for output-heavy)
- Long prompt + short response: **45 credits** ✅ (pays less for input-heavy)

**More fair and accurate!**
\`\`\`

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review pricing tier plan (docs/plan/189)
- [ ] Confirm margin multipliers per tier
- [ ] Design database schema changes
- [ ] Create comprehensive test plan

### Phase 1: Database (Week 1)
- [ ] Update Prisma schema with separate credit fields
- [ ] Create migration script
- [ ] Run migration on development database
- [ ] Verify schema changes with Prisma Studio

### Phase 2: Types (Week 1)
- [ ] Update `ModelMeta` type with separate credits
- [ ] Create `calculateSeparateCreditsPerKTokens()` function
- [ ] Update shared types package
- [ ] Write unit tests for calculation function

### Phase 3: Backend Logic (Week 2)
- [ ] Update `credit-deduction.service.ts`
- [ ] Update `llm.service.ts` (all 4 inference methods)
- [ ] Update `model.service.ts` (addModel, updateModel)
- [ ] Write unit tests for services

### Phase 4: API (Week 2)
- [ ] Update response schemas
- [ ] Update controllers (models, chat, completions, embeddings)
- [ ] Update type mappers
- [ ] Write integration tests

### Phase 5: Frontend (Week 3)
- [ ] Update model templates
- [ ] Update AddModelDialog
- [ ] Update EditModelDialog
- [ ] Update ModelListTable
- [ ] Update ModelCard component
- [ ] Write frontend unit tests

### Phase 6: Seed Data (Week 3)
- [ ] Create `calculateModelCredits()` helper
- [ ] Update all 20 model configurations
- [ ] Calculate separate credits for each model
- [ ] Test seed script
- [ ] Reset database and re-seed

### Phase 7: Testing (Week 4)
- [ ] Run all unit tests (backend + frontend)
- [ ] Run integration tests
- [ ] Run E2E tests
- [ ] Manual testing with Postman
- [ ] Test all 4 inference endpoints
- [ ] Verify credit deductions in database
- [ ] Test admin model management UI

### Phase 8: Documentation (Week 4)
- [ ] Update API reference docs
- [ ] Create user guide for separate pricing
- [ ] Update admin guide
- [ ] Update pricing page content
- [ ] Create migration guide (if needed later)

### Post-Implementation
- [ ] Code review with team
- [ ] Performance testing
- [ ] Security audit (pricing calculation)
- [ ] Deploy to staging environment
- [ ] Final QA testing
- [ ] Deploy to production (pre-launch)

---

## Timeline

**Target Completion:** 4 weeks before launch

- **Week 1:** Database + Types (Phases 1-2)
- **Week 2:** Backend Logic + API (Phases 3-4)
- **Week 3:** Frontend + Seed Data (Phases 5-6)
- **Week 4:** Testing + Documentation (Phases 7-8)

---

## Risk Mitigation

### Risk 1: Calculation Errors
**Mitigation:**
- Comprehensive unit tests
- Manual verification with spreadsheet
- Cross-check with pricing plan document

### Risk 2: Breaking Changes
**Mitigation:**
- Keep deprecated fields for backwards compatibility
- Gradual rollout if needed
- Version API responses

### Risk 3: Performance Impact
**Mitigation:**
- Benchmark credit calculation performance
- Optimize database queries
- Add caching if needed

### Risk 4: User Confusion
**Mitigation:**
- Clear documentation
- UI explanations and tooltips
- Example calculations in user guide

---

## Success Criteria

✅ All unit tests passing (100% coverage on credit calculation)
✅ All integration tests passing
✅ All E2E tests passing
✅ Manual testing completed
✅ Documentation complete and reviewed
✅ No performance regression
✅ Seed data successfully migrated
✅ Admin UI functional with separate pricing
✅ API responses match specification
✅ Credit deductions accurate in database

---

## Follow-Up Tasks (Post-Launch)

1. **Analytics Dashboard:** Show separate input/output credit usage
2. **Cost Optimizer:** Suggest models based on usage patterns
3. **Tier-Specific Margins:** Implement different margins per tier
4. **Historical Ratio Tracking:** Analyze actual usage ratios
5. **Dynamic Pricing:** Adjust credits based on real usage data

---

## References

- Bug Report: `docs/troubleshooting/001-credit-calculation-unit-mismatch-bug.md`
- Smart Calculation Design: `docs/reference/192-smart-credit-calculation-design.md`
- Pricing Plan: `docs/plan/189-pricing-tier-restructure-plan.md`
- API Standards: `docs/reference/156-api-standards.md`
- Model Lifecycle: `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`
