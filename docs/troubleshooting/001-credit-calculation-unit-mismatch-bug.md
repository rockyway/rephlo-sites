# Credit Calculation Unit Mismatch Bug

**Status:** 🔴 CRITICAL BUG - 100x Overcharge
**Severity:** P0 - Causes 100x overcharging of users
**Discovered:** 2025-11-19
**Affected Components:** Frontend, Backend

---

## Summary

The auto-calculation formula for `creditsPer1kTokens` has a **unit mismatch bug** that divides cents by dollars without converting units, resulting in credit costs being **100× higher** than they should be.

**Example:**
- User inputs: Input $1.25/1M, Output $10/1M
- Auto-calculated credits: **2,812 per 1K tokens** ❌
- Correct credits: **29 per 1K tokens** ✅
- Overcharge factor: **97× too expensive**

---

## Root Cause

### Location
1. **Frontend:** `frontend/src/data/modelTemplates.ts` lines 189-208
2. **Backend:** `backend/src/types/model-meta.ts` lines 235-246

### Buggy Code

```typescript
// BOTH frontend and backend have this bug
export function calculateSuggestedCredits(
  inputCostPerMillion: number,  // ← In CENTS
  outputCostPerMillion: number, // ← In CENTS
  marginMultiplier = 2.5,
  creditUSDValue = 0.0005       // ← In DOLLARS (NOT CENTS!)
): number {
  const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
  const costPer1K = avgCostPerMillion / 1000;  // Result in CENTS
  const costWithMargin = costPer1K * marginMultiplier;  // Result in CENTS

  // ❌ BUG: Dividing CENTS by DOLLARS without unit conversion!
  const creditsPerK = Math.ceil(costWithMargin / creditUSDValue);

  return creditsPerK;
}
```

### Calculation Trace

Given user's input:
- Input: $1.25 per 1M tokens = **125 cents** per 1M
- Output: $10 per 1M tokens = **1,000 cents** per 1M

**Current (BUGGY) Calculation:**
```
avgCostPerMillion = (125 + 1000) / 2 = 562.5 cents
costPer1K = 562.5 / 1000 = 0.5625 cents
costWithMargin = 0.5625 × 2.5 = 1.40625 cents

// BUG: Dividing cents by dollars!
creditsPerK = ceil(1.40625 cents / 0.0005 dollars)
           = ceil(2812.5)
           = 2,813 credits ❌
```

**Expected (CORRECT) Calculation:**
```
avgCostPerMillion = (125 + 1000) / 2 = 562.5 cents
costPer1K = 562.5 / 1000 = 0.5625 cents
costWithMargin = 0.5625 × 2.5 = 1.40625 cents

// CORRECT: Convert creditUSDValue to cents first
creditCentValue = 0.0005 dollars × 100 = 0.05 cents
creditsPerK = ceil(1.40625 cents / 0.05 cents)
           = ceil(28.125)
           = 29 credits ✅
```

---

## Impact Analysis

### User Impact
- **Overcharge Factor:** 97× (2813 / 29 ≈ 97)
- **Example Scenario:**
  - User makes 10 requests with 1K tokens each
  - Should cost: 290 credits ($2.90)
  - Currently costs: 28,130 credits ($281.30) ❌
  - Overcharge: $278.40

### Business Impact
- Platform becomes **commercially unviable** due to extreme overcharging
- Users will immediately notice they're being charged 100× more than they should
- Pricing tier restructure plan (docs/plan/189) would be completely broken
- All seeded models have incorrect credit costs

### Data Integrity
- All models in database with auto-calculated credits have 100× inflated costs
- Need to re-calculate and update all existing model pricing

---

## Fix

### Code Fix

**File 1:** `frontend/src/data/modelTemplates.ts`

```typescript
export function calculateSuggestedCredits(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier = 2.5,
  creditUSDValue = 0.0005
): number {
  if (!inputCostPerMillion || !outputCostPerMillion) return 0;

  // Convert to cents per 1K tokens
  const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
  const costPer1K = avgCostPerMillion / 1000;

  // Apply margin
  const costWithMargin = costPer1K * marginMultiplier;

  // ✅ FIX: Convert creditUSDValue to cents before division
  const creditCentValue = creditUSDValue * 100; // Convert dollars to cents
  const creditsPerK = Math.ceil(costWithMargin / creditCentValue);

  return creditsPerK;
}
```

**File 2:** `backend/src/types/model-meta.ts`

```typescript
export function calculateCreditsPerKTokens(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  marginMultiplier: number = 2.5,
  creditUsdValue: number = 0.0005
): number {
  const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
  const costPer1K = avgCostPerMillion / 1000;
  const costWithMargin = costPer1K * marginMultiplier;

  // ✅ FIX: Convert creditUsdValue to cents before division
  const creditCentValue = creditUsdValue * 100; // Convert dollars to cents
  const creditsPerK = Math.ceil(costWithMargin / creditCentValue);

  return creditsPerK;
}
```

### Data Migration

After fixing the code, need to re-calculate credits for all existing models:

```sql
-- Step 1: Find all models that likely used auto-calculation
SELECT
  id,
  meta->>'creditsPer1kTokens' as current_credits,
  meta->>'inputCostPerMillionTokens' as input_cost,
  meta->>'outputCostPerMillionTokens' as output_cost
FROM models
WHERE meta->>'creditsPer1kTokens' IS NOT NULL;

-- Step 2: After code fix, run update script to recalculate
-- (Use Node.js script with corrected formula)
```

---

## Additional Issues (Design Flaws)

### Issue 1: Averaging Input + Output Costs

The current formula averages input and output costs:
```typescript
const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
```

**Problem:** This assumes a 50/50 split between input and output tokens, which is unrealistic.

**Real-world usage patterns:**
- Chat applications: ~10× more output tokens than input
- Text generation: ~20× more output tokens than input
- Code generation: ~15× more output tokens than input

**Example with user's pricing:**
- Input: $1.25/1M tokens
- Output: $10/1M tokens
- Ratio: 8:1 (output costs 8× more)

**Current formula (50/50 split):**
```
avgCost = (1.25 + 10) / 2 = 5.625
```

**Better formula (assuming 10:1 output:input ratio):**
```
weightedAvg = (1 × 1.25 + 10 × 10) / 11 = 101.25 / 11 = 9.20
```

### Issue 2: Margin Multiplier Not Tier-Specific

The pricing plan (docs/plan/189) specifies different margin multipliers per tier:
- Free: 2.0× (50% margin)
- Pro: 1.0× (break-even)
- Pro+: 1.1× (10% margin)
- Pro Max: 1.25× (25% margin)

But the calculation uses a **fixed 2.5× margin** for all tiers, which doesn't match the plan.

---

## Recommendations

### Immediate (P0)
1. ✅ Fix unit mismatch bug in both frontend and backend
2. ✅ Add unit conversion comment explaining the fix
3. ✅ Create data migration script to recalculate all existing models
4. ✅ Add unit tests to prevent regression

### Short-term (P1)
1. Replace averaging with weighted calculation based on typical usage patterns
2. Make margin multiplier tier-specific per pricing plan
3. Add configuration for input:output token ratio by model type

### Long-term (P2)
1. Consider separate input/output credit costs (e.g., 2 credits for input, 18 credits for output)
2. Add actual usage tracking to calculate optimal ratios per model
3. Implement dynamic pricing based on real usage patterns

---

## Testing

### Unit Test Coverage

**Frontend:** `frontend/src/data/__tests__/modelTemplates.test.ts`

```typescript
describe('calculateSuggestedCredits', () => {
  it('should calculate credits with correct unit conversion', () => {
    // User's example: Input $1.25, Output $10 per 1M tokens
    const input = 125; // cents
    const output = 1000; // cents

    const result = calculateSuggestedCredits(input, output, 2.5, 0.0005);

    // Expected: 29 credits (not 2812!)
    expect(result).toBe(29);
  });

  it('should handle cents-to-dollars conversion correctly', () => {
    // Test with known values
    const input = 50; // $0.50 per 1M
    const output = 150; // $1.50 per 1M
    // Avg: $1.00 per 1M = $0.001 per 1K
    // With margin: $0.0025 per 1K
    // Credits: 0.0025 / 0.0005 = 5 credits

    const result = calculateSuggestedCredits(input, output, 2.5, 0.0005);
    expect(result).toBe(5);
  });
});
```

**Backend:** `backend/src/__tests__/unit/model-meta.test.ts`

```typescript
import { calculateCreditsPerKTokens } from '@/types/model-meta';

describe('calculateCreditsPerKTokens', () => {
  it('should fix unit mismatch bug', () => {
    const result = calculateCreditsPerKTokens(125, 1000, 2.5, 0.0005);
    expect(result).toBe(29); // Not 2812!
  });

  it('should match frontend calculation', () => {
    // Ensure backend and frontend use same formula
    const cases = [
      { input: 50, output: 150, expected: 5 },
      { input: 125, output: 1000, expected: 29 },
      { input: 300, output: 900, expected: 15 },
    ];

    cases.forEach(({ input, output, expected }) => {
      expect(calculateCreditsPerKTokens(input, output)).toBe(expected);
    });
  });
});
```

---

## Related Documents

- Pricing Plan: `docs/plan/189-pricing-tier-restructure-plan.md`
- Model Lifecycle: `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`
- API Standards: `docs/reference/156-api-standards.md`

---

## Resolution Checklist

- [ ] Fix frontend calculation (`frontend/src/data/modelTemplates.ts`)
- [ ] Fix backend calculation (`backend/src/types/model-meta.ts`)
- [ ] Add unit tests (frontend + backend)
- [ ] Create data migration script
- [ ] Run migration to fix all existing models
- [ ] Verify with user's example (Input $1.25, Output $10)
- [ ] Update documentation with correct formula
- [ ] Add inline comments explaining unit conversion
- [ ] Consider implementing weighted averaging (Issue 1)
- [ ] Consider tier-specific margins (Issue 2)
