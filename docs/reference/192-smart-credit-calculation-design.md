# Smart Credit Calculation Design

**Status:** 🟢 Design Proposal
**Created:** 2025-11-19
**Replaces:** Simple averaging (`/2`) in credit calculation

---

## Problem Statement

Current formula uses simple averaging:
```typescript
const avgCost = (inputCost + outputCost) / 2; // ❌ Assumes 50/50 split
```

**Issues:**
1. Real-world usage has 10-20× more output tokens than input tokens
2. Models with asymmetric pricing (e.g., Input $1.25, Output $10) are severely underpriced
3. No differentiation between use cases (chat vs code generation vs summarization)

---

## Design: Ratio-Based Weighted Average

### Core Formula

```typescript
/**
 * Calculate weighted cost based on expected input:output token ratio
 *
 * @param inputCostPerMillion - Input cost per 1M tokens (cents)
 * @param outputCostPerMillion - Output cost per 1M tokens (cents)
 * @param inputOutputRatio - Expected input:output tokens ratio (e.g., "1:10")
 * @returns Weighted average cost per 1M tokens
 */
function calculateWeightedCost(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  inputOutputRatio: { input: number; output: number }
): number {
  const { input, output } = inputOutputRatio;

  // Weighted average: (inputTokens × inputCost + outputTokens × outputCost) / totalTokens
  const weightedCost =
    (input * inputCostPerMillion + output * outputCostPerMillion) / (input + output);

  return weightedCost;
}
```

### Example Calculation

**Given:**
- Input: $1.25 per 1M tokens = 125 cents
- Output: $10 per 1M tokens = 1,000 cents
- Ratio: 1:10 (typical chat application)

**Current (WRONG):**
```
avgCost = (125 + 1000) / 2 = 562.5 cents per 1M tokens
```

**Weighted (CORRECT):**
```
weightedCost = (1 × 125 + 10 × 1000) / (1 + 10)
             = (125 + 10,000) / 11
             = 10,125 / 11
             = 920.45 cents per 1M tokens
```

**Impact:** Weighted cost is **1.64× higher** (920 vs 562), reflecting the real-world cost structure.

---

## Implementation Options

### Option 1: Model Type-Based Ratios (Recommended)

Different model capabilities have different typical usage patterns.

#### Ratio Configuration

```typescript
/**
 * Expected input:output token ratios by model capability
 * Based on empirical data and typical use cases
 */
export const TOKEN_RATIOS = {
  // Chat models: Users send short prompts, receive longer responses
  chat: { input: 1, output: 12 },

  // Code generation: Short prompts, long code outputs
  code: { input: 1, output: 20 },

  // Text generation: Medium prompts, long outputs
  text: { input: 1, output: 15 },

  // Vision: Large input (image tokens), medium output
  vision: { input: 8, output: 5 },

  // Function calling: Balanced input/output
  function_calling: { input: 1, output: 3 },

  // Long context: Large inputs, short summaries
  long_context: { input: 20, output: 1 },

  // Default fallback
  default: { input: 1, output: 10 },
} as const;

/**
 * Determine ratio based on model capabilities
 */
function getTokenRatioForModel(capabilities: string[]): { input: number; output: number } {
  // Prioritize based on capability order
  if (capabilities.includes('code')) return TOKEN_RATIOS.code;
  if (capabilities.includes('vision')) return TOKEN_RATIOS.vision;
  if (capabilities.includes('long_context')) return TOKEN_RATIOS.long_context;
  if (capabilities.includes('function_calling')) return TOKEN_RATIOS.function_calling;
  if (capabilities.includes('text')) return TOKEN_RATIOS.text;

  return TOKEN_RATIOS.default;
}
```

#### Updated Calculation Function

```typescript
/**
 * Calculate credits per 1K tokens with smart weighting
 *
 * @param inputCostPerMillion - Input cost per 1M tokens (cents)
 * @param outputCostPerMillion - Output cost per 1M tokens (cents)
 * @param capabilities - Model capabilities array (e.g., ['text', 'code'])
 * @param marginMultiplier - Profit margin multiplier (default 2.5)
 * @param creditUsdValue - USD value per credit (default $0.0005)
 * @returns Calculated credits per 1K tokens
 */
export function calculateCreditsPerKTokens(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  capabilities: string[] = ['text'],
  marginMultiplier: number = 2.5,
  creditUsdValue: number = 0.0005
): number {
  // Determine appropriate input:output ratio based on capabilities
  const ratio = getTokenRatioForModel(capabilities);

  // Calculate weighted cost per 1M tokens
  const weightedCostPerMillion =
    (ratio.input * inputCostPerMillion + ratio.output * outputCostPerMillion) /
    (ratio.input + ratio.output);

  // Convert to cost per 1K tokens
  const costPer1K = weightedCostPerMillion / 1000;

  // Apply margin
  const costWithMargin = costPer1K * marginMultiplier;

  // Convert to credits (FIX: Convert USD to cents)
  const creditCentValue = creditUsdValue * 100;
  const creditsPerK = Math.ceil(costWithMargin / creditCentValue);

  return creditsPerK;
}
```

#### Example Comparison

**Model:** GPT-5 Chat with capabilities `['text', 'function_calling']`
- Input: $1.25 per 1M = 125 cents
- Output: $10 per 1M = 1,000 cents
- Ratio: 1:12 (chat model)
- Margin: 2.5×

**Old Formula (Simple Average):**
```
avgCost = (125 + 1000) / 2 = 562.5 cents/1M
costPer1K = 562.5 / 1000 = 0.5625 cents
costWithMargin = 0.5625 × 2.5 = 1.40625 cents
credits = ceil(1.40625 / 0.05) = 29 credits/1K ❌
```

**New Formula (Weighted):**
```
weightedCost = (1 × 125 + 12 × 1000) / 13 = 12,125 / 13 = 932.69 cents/1M
costPer1K = 932.69 / 1000 = 0.93269 cents
costWithMargin = 0.93269 × 2.5 = 2.3317 cents
credits = ceil(2.3317 / 0.05) = 47 credits/1K ✅
```

**Impact:** 47 credits vs 29 credits (62% increase) - more accurately reflects chat usage

---

### Option 2: Configurable Ratio per Model (Advanced)

Allow admins to specify custom ratio per model in metadata.

#### Schema Addition

```typescript
export const ModelMetaSchema = z.object({
  // ... existing fields ...

  // Optional: Override default ratio for this specific model
  tokenRatio: z.object({
    input: z.number().int().positive(),
    output: z.number().int().positive(),
  }).optional(),

  // Optional: Historical usage data (calculated from actual usage)
  historicalRatio: z.object({
    input: z.number().int().positive(),
    output: z.number().int().positive(),
    sampleSize: z.number().int().positive(), // Number of requests analyzed
    lastUpdated: z.string().datetime(),
  }).optional(),
});
```

#### Usage

```typescript
function calculateCreditsPerKTokens(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  meta: ModelMeta,
  marginMultiplier: number = 2.5,
  creditUsdValue: number = 0.0005
): number {
  // Priority: Historical > Custom > Capability-based > Default
  let ratio: { input: number; output: number };

  if (meta.historicalRatio && meta.historicalRatio.sampleSize >= 100) {
    // Use actual usage data if we have enough samples
    ratio = {
      input: meta.historicalRatio.input,
      output: meta.historicalRatio.output,
    };
  } else if (meta.tokenRatio) {
    // Use admin-specified custom ratio
    ratio = meta.tokenRatio;
  } else {
    // Fall back to capability-based ratio
    ratio = getTokenRatioForModel(meta.capabilities);
  }

  // ... rest of calculation ...
}
```

---

### Option 3: Separate Input/Output Credits (Future)

Instead of averaging, charge separately for input and output.

#### Concept

```typescript
interface ModelPricing {
  creditsPerK_input: number;   // e.g., 2 credits per 1K input tokens
  creditsPerK_output: number;  // e.g., 18 credits per 1K output tokens
}
```

#### Usage Calculation

```typescript
// During inference
const inputTokens = 500;
const outputTokens = 5000;

const inputCredits = Math.ceil(inputTokens / 1000 * model.creditsPerK_input);   // 1 credit
const outputCredits = Math.ceil(outputTokens / 1000 * model.creditsPerK_output); // 90 credits
const totalCredits = inputCredits + outputCredits; // 91 credits
```

**Pros:**
- Most accurate - charges exactly what was used
- No need for ratio estimation
- Fair pricing for all usage patterns

**Cons:**
- Breaking change - requires schema migration
- More complex for users to understand
- Harder to estimate costs upfront

---

## Recommended Implementation Plan

### Phase 1: Fix Unit Bug + Add Weighted Calculation (Immediate)

1. ✅ Fix unit mismatch bug (cents vs dollars)
2. ✅ Add `getTokenRatioForModel()` function
3. ✅ Update `calculateCreditsPerKTokens()` to use weighted average
4. ✅ Add `capabilities` parameter to calculation
5. ✅ Update frontend/backend functions
6. ✅ Recalculate all existing models

### Phase 2: Historical Ratio Tracking (Short-term)

1. Add `historicalRatio` field to model metadata
2. Create background job to analyze token usage
3. Update ratios monthly based on actual usage
4. Gradually migrate from capability-based to historical ratios

### Phase 3: Separate Input/Output Credits (Long-term)

1. Add `creditsPerK_input` and `creditsPerK_output` fields
2. Migrate existing `creditsPer1kTokens` to separate values
3. Update inference logic to charge separately
4. Update frontend to show split pricing

---

## Examples with Different Ratios

### Model: GPT-5 Chat
- Input: $1.25/1M, Output: $10/1M
- Capabilities: `['text', 'function_calling']`
- Ratio: **1:12** (chat)

```
weighted = (1×125 + 12×1000) / 13 = 932.69 cents/1M
credits = ceil((932.69/1000) × 2.5 / 0.05) = 47 credits/1K
```

### Model: Codex Pro
- Input: $1.25/1M, Output: $10/1M
- Capabilities: `['code']`
- Ratio: **1:20** (code generation)

```
weighted = (1×125 + 20×1000) / 21 = 957.14 cents/1M
credits = ceil((957.14/1000) × 2.5 / 0.05) = 48 credits/1K
```

### Model: Vision Analyzer
- Input: $1.25/1M, Output: $10/1M
- Capabilities: `['vision']`
- Ratio: **8:5** (image analysis)

```
weighted = (8×125 + 5×1000) / 13 = 461.54 cents/1M
credits = ceil((461.54/1000) × 2.5 / 0.05) = 24 credits/1K
```

### Model: Document Summarizer
- Input: $1.25/1M, Output: $10/1M
- Capabilities: `['long_context']`
- Ratio: **20:1** (large input, short summary)

```
weighted = (20×125 + 1×1000) / 21 = 166.67 cents/1M
credits = ceil((166.67/1000) × 2.5 / 0.05) = 9 credits/1K
```

---

## Data Sources for Ratio Tuning

### Industry Benchmarks

1. **OpenAI Usage Patterns** (from public docs):
   - Chat completion: ~1:8 ratio
   - Code completion: ~1:15 ratio
   - Summarization: ~10:1 ratio

2. **Anthropic Claude Patterns**:
   - Chat: ~1:12 ratio
   - Long document Q&A: ~15:1 ratio

3. **Our Historical Data** (to be collected):
   - Analyze `token_usage_ledger` table
   - Calculate median input:output ratio per model
   - Update ratios quarterly

### Collection Query

```sql
-- Analyze actual token usage patterns
SELECT
  model_id,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY input_tokens::float / NULLIF(output_tokens, 0)) as median_ratio,
  AVG(input_tokens::float / NULLIF(output_tokens, 0)) as avg_ratio,
  COUNT(*) as sample_size
FROM token_usage_ledger
WHERE
  input_tokens > 0
  AND output_tokens > 0
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY model_id
HAVING COUNT(*) >= 100;
```

---

## Configuration File

Create `backend/src/config/token-ratios.ts`:

```typescript
/**
 * Token Ratio Configuration
 *
 * Defines expected input:output token ratios for different model types.
 * These ratios are used to calculate weighted costs that reflect real-world usage.
 */

export interface TokenRatio {
  input: number;
  output: number;
  description: string;
  sources: string[];
}

export const TOKEN_RATIOS: Record<string, TokenRatio> = {
  chat: {
    input: 1,
    output: 12,
    description: 'Chat applications - short prompts, long responses',
    sources: ['OpenAI usage patterns', 'Anthropic benchmarks'],
  },
  code: {
    input: 1,
    output: 20,
    description: 'Code generation - short prompts, long code outputs',
    sources: ['GitHub Copilot patterns', 'Internal data'],
  },
  text: {
    input: 1,
    output: 15,
    description: 'General text generation',
    sources: ['Industry average'],
  },
  vision: {
    input: 8,
    output: 5,
    description: 'Image analysis - large image tokens, medium text output',
    sources: ['GPT-4V usage patterns'],
  },
  function_calling: {
    input: 1,
    output: 3,
    description: 'API/function calls - balanced input/output',
    sources: ['OpenAI function calling data'],
  },
  long_context: {
    input: 20,
    output: 1,
    description: 'Document summarization - large input, short summary',
    sources: ['Claude long context usage'],
  },
  default: {
    input: 1,
    output: 10,
    description: 'Conservative default for unknown use cases',
    sources: ['Industry standard'],
  },
};
```

---

## Testing

### Unit Tests

```typescript
describe('calculateCreditsPerKTokens - Weighted', () => {
  it('should use chat ratio for text models', () => {
    const credits = calculateCreditsPerKTokens(
      125,      // $1.25 input
      1000,     // $10 output
      ['text'], // capabilities
      2.5,      // margin
      0.0005    // credit value
    );

    // Ratio 1:12: weighted = (1×125 + 12×1000)/13 = 932.69
    // Per 1K: 0.93269, With margin: 2.3317, Credits: ceil(2.3317/0.05) = 47
    expect(credits).toBe(47);
  });

  it('should use code ratio for code models', () => {
    const credits = calculateCreditsPerKTokens(
      125,
      1000,
      ['code'],
      2.5,
      0.0005
    );

    // Ratio 1:20: weighted = (1×125 + 20×1000)/21 = 957.14
    // Credits: 48
    expect(credits).toBe(48);
  });

  it('should use vision ratio for vision models', () => {
    const credits = calculateCreditsPerKTokens(
      125,
      1000,
      ['vision'],
      2.5,
      0.0005
    );

    // Ratio 8:5: weighted = (8×125 + 5×1000)/13 = 461.54
    // Credits: 24
    expect(credits).toBe(24);
  });
});
```

---

## Migration Impact

### Before (Simple Average)
```
GPT-5 Chat: 29 credits/1K
```

### After (Weighted)
```
GPT-5 Chat: 47 credits/1K (+62%)
GPT-5 Code: 48 credits/1K (+66%)
Vision Model: 24 credits/1K (-17%)
Summarizer: 9 credits/1K (-69%)
```

**Key Insight:** Chat and code models become more expensive (reflecting reality), while vision and summarization models become cheaper (large input tokens are cheap).

---

## Rollout Strategy

1. **Silent Deploy** - Update calculation but don't recalculate existing models yet
2. **A/B Testing** - Compare old vs new credits on 10% of new models
3. **Analysis** - Verify new costs match actual usage patterns
4. **Full Migration** - Recalculate all existing models
5. **Communication** - Notify users of pricing updates (some models cheaper, some more expensive)

---

## References

- Bug Report: `docs/troubleshooting/001-credit-calculation-unit-mismatch-bug.md`
- Pricing Plan: `docs/plan/189-pricing-tier-restructure-plan.md`
- Model Lifecycle: `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`
