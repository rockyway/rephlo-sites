# Separate Input/Output Pricing User Guide

**Document Number:** 020
**Date:** 2025-11-19
**Audience:** End Users, Administrators, API Developers
**Related Documents:**
- [194 API Reference](../reference/194-separate-pricing-api-reference.md)
- [205 Implementation Report](../progress/205-separate-input-output-pricing-implementation-complete.md)

---

## Table of Contents

1. [Introduction](#introduction)
2. [For End Users](#for-end-users)
3. [For Administrators](#for-administrators)
4. [For API Developers](#for-api-developers)
5. [Migration Guide](#migration-guide)
6. [FAQ](#faq)
7. [Examples & Comparisons](#examples--comparisons)

---

## Introduction

### What is Separate Input/Output Pricing?

Rephlo now calculates credit costs based on **separate pricing for input and output tokens**, rather than using a simple average. This change reflects the real-world pricing structure of LLM providers, where output tokens typically cost **5-10 times more** than input tokens.

### Why Does This Matter?

**Before (Simple Averaging):**
- All tokens charged at the same rate
- Inaccurate cost estimates for users
- Potential 100× overcharge bug (now fixed)

**After (Separate Pricing):**
- Input tokens charged at lower rate
- Output tokens charged at higher rate
- Accurate reflection of actual costs
- Transparent breakdown for users

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Accuracy** | Credits reflect actual token usage patterns (typical 1:10 input:output ratio) |
| **Transparency** | See exactly how much input vs output tokens cost |
| **Fairness** | Pay for what you use - shorter responses cost less |
| **Predictability** | Better cost estimates for different use cases |

---

## For End Users

### Understanding Your Credits

Every LLM request you make uses two types of tokens:

1. **Input Tokens:** Your prompt/messages sent to the model
2. **Output Tokens:** The model's generated response

**Example Chat Request:**
```
Input:  "Explain quantum computing in simple terms." (8 tokens)
Output: "Quantum computing uses quantum mechanics principles..." (150 tokens)
```

### How Credits Are Calculated

Each model has two credit rates:

- **Input Credits per 1K:** Credits charged per 1,000 input tokens
- **Output Credits per 1K:** Credits charged per 1,000 output tokens

**Example: GPT-5 Chat**
- Input: 7 credits per 1,000 tokens
- Output: 50 credits per 1,000 tokens

**Your Request:**
```
Input:  8 tokens  → (8/1000) × 7  = 0.056 → rounds to 1 credit
Output: 150 tokens → (150/1000) × 50 = 7.5 → rounds to 8 credits
Total:  9 credits charged
```

**Note:** Credits are always rounded **up** to the nearest whole number.

### Typical Usage Patterns

Different use cases have different input:output ratios:

| Use Case | Input:Output Ratio | Example |
|----------|-------------------|---------|
| **Chat Conversations** | 1:12 | Short questions, long explanations |
| **Code Generation** | 1:20 | Brief spec, lots of code |
| **Summarization** | 10:1 | Long document, short summary |
| **Translation** | 1:1 | Equal input/output length |
| **Vision Analysis** | 8:5 | Image tokens + brief description |

**Cost Implication:** Use cases with longer outputs (chat, code) will cost more than those with shorter outputs (summarization).

### Viewing Your Usage Breakdown

#### In the Dashboard

Navigate to **Usage History** to see detailed breakdowns:

```
┌─────────────────────────────────────────────────────────────┐
│ Request: GPT-5 Chat - 2025-11-19 15:30                     │
├─────────────────────────────────────────────────────────────┤
│ Input Tokens:    120 → 1 credit                            │
│ Output Tokens:   800 → 40 credits                          │
│ ───────────────────────────────────────────────────────────│
│ Total Credits:   41 credits                                 │
└─────────────────────────────────────────────────────────────┘
```

#### Via API

Make a `GET /v1/usage` request to retrieve detailed usage:

```json
{
  "usage": [{
    "inputTokens": 120,
    "outputTokens": 800,
    "inputCredits": 1,
    "outputCredits": 40,
    "totalCredits": 41
  }]
}
```

### Estimating Request Costs

Use the **Model Pricing Calculator** in the dashboard:

1. Select your model (e.g., GPT-5 Chat)
2. Enter estimated token counts:
   - Input: 100 tokens
   - Output: 500 tokens
3. See instant cost breakdown:
   - Input: 1 credit
   - Output: 25 credits
   - **Total: 26 credits**

### Tips to Save Credits

1. **Be Concise:** Shorter prompts = fewer input tokens
2. **Limit Output:** Use `max_tokens` parameter to cap response length
3. **Choose Efficient Models:** Gemini 2.0 Flash is 10× cheaper than Claude Opus
4. **Reuse Context:** Don't repeat context in every message
5. **Use Caching:** Some models cache repeated inputs (free after first use)

---

## For Administrators

### Adding New Models

When creating a new model in the admin dashboard, you only need to provide **provider costs**:

**Required Fields:**
- Input Cost per 1M Tokens (in USD)
- Output Cost per 1M Tokens (in USD)

**Auto-Calculated Fields:**
- Input Credits per 1K
- Output Credits per 1K
- Estimated Total Credits per 1K (based on typical 1:10 ratio)

**Example:**

```
Provider Pricing:
  Input:  $1.50 per 1M tokens
  Output: $12.00 per 1M tokens

Auto-Calculated (with 2.5× margin):
  Input Credits per 1K:  8 credits
  Output Credits per 1K: 60 credits
  Est. Total per 1K:     56 credits (assumes 1:10 ratio)
```

### Updating Model Pricing

When provider pricing changes, simply update the cost fields:

1. Navigate to **Admin → Model Management**
2. Click **Edit** on the model
3. Update **Input Cost** or **Output Cost**
4. Click **Save**

**The system automatically:**
- Recalculates separate credits per 1K
- Updates estimated total
- Applies new pricing to future requests immediately

**Note:** Existing usage history remains unchanged (historical data integrity).

### Monitoring Credit Usage

Use the **Admin Analytics Dashboard** to track:

- **Total Credits Consumed:** Aggregate input + output credits
- **Input vs Output Breakdown:** Pie chart showing credit distribution
- **Model Efficiency:** Which models have best margins
- **User Patterns:** Average input:output ratios per user

**Key Metrics:**

| Metric | Description | Target |
|--------|-------------|--------|
| Gross Margin % | (Credits charged - vendor cost) / Credits charged | >60% |
| Input:Output Ratio | Average tokens ratio across all requests | 1:10 |
| Credit Efficiency | Credits per request / expected credits | 0.9-1.1 |

### Setting Custom Pricing

In rare cases, you may want to override auto-calculated credits:

**When to Override:**
- Promotional pricing for specific models
- Volume discounts for enterprise customers
- Beta pricing for new models

**How to Override:**
1. Edit model in admin dashboard
2. Manually enter **Input Credits per 1K** and **Output Credits per 1K**
3. System will use your values instead of auto-calculation

**Warning:** Manual overrides bypass margin controls. Ensure profitability before saving.

### Audit Trail

All pricing changes are logged in the **Audit Log**:

```
[2025-11-19 15:30:00] Admin user@example.com updated model 'gpt-5-chat'
  Reason: "Q4 2025 price adjustment"
  Changes:
    - inputCostPerMillionTokens: 125000 → 150000
    - outputCostPerMillionTokens: 1000000 → 1200000
    - inputCreditsPerK: 7 → 8 (auto-calculated)
    - outputCreditsPerK: 50 → 60 (auto-calculated)
```

---

## For API Developers

### Consuming the API

#### Get Model Pricing

```javascript
const response = await fetch('http://localhost:7150/v1/models/gpt-5-chat', {
  headers: { Authorization: `Bearer ${token}` }
});

const { data } = await response.json();
console.log(data.model.meta.inputCreditsPerK);  // 7
console.log(data.model.meta.outputCreditsPerK); // 50
```

#### Track Usage with Breakdown

```javascript
const completion = await fetch('http://localhost:7150/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5-chat',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const result = await completion.json();
console.log('Input Credits:', result.usage.inputCredits);   // 1
console.log('Output Credits:', result.usage.outputCredits); // 2
console.log('Total Credits:', result.usage.totalCredits);   // 3
```

#### Calculate Cost Before Request

```javascript
function estimateCredits(modelPricing, inputTokens, outputTokens) {
  const inputCredits = Math.ceil(
    (inputTokens / 1000) * modelPricing.inputCreditsPerK
  );
  const outputCredits = Math.ceil(
    (outputTokens / 1000) * modelPricing.outputCreditsPerK
  );
  return inputCredits + outputCredits;
}

// Example
const pricing = {
  inputCreditsPerK: 7,
  outputCreditsPerK: 50
};

const cost = estimateCredits(pricing, 100, 500);
console.log('Estimated cost:', cost, 'credits'); // 26 credits
```

### Backward Compatibility

**Legacy Field Support:**

Old integrations using `creditsPer1kTokens` will continue to work:

```javascript
// Legacy code (still works)
const avgCredits = data.model.meta.creditsPer1kTokens; // 29

// Modern code (recommended)
const inputCredits = data.model.meta.inputCreditsPerK;  // 7
const outputCredits = data.model.meta.outputCreditsPerK; // 50
```

**Migration Timeline:**
- **2025 Q4:** New fields available, legacy fields maintained
- **2026 Q1:** Documentation updated to recommend new fields
- **2026 Q3:** Legacy fields marked as deprecated (6-month notice)
- **2027 Q1:** Legacy fields removed

### Handling Missing Pricing Data

For legacy models without separate pricing:

```javascript
function getCreditsPerK(modelMeta) {
  // Prefer new fields
  if (modelMeta.inputCreditsPerK && modelMeta.outputCreditsPerK) {
    return {
      input: modelMeta.inputCreditsPerK,
      output: modelMeta.outputCreditsPerK
    };
  }

  // Fallback to legacy field
  if (modelMeta.creditsPer1kTokens) {
    // Estimate split (assumes 1:5 input:output ratio)
    const total = modelMeta.creditsPer1kTokens;
    return {
      input: Math.ceil(total * 0.167),  // ~1/6 of total
      output: Math.ceil(total * 0.833)  // ~5/6 of total
    };
  }

  throw new Error('No pricing data available for model');
}
```

---

## Migration Guide

### Impact on Existing Users

**No Action Required:**
- Existing subscriptions continue as-is
- Credit balances remain unchanged
- Historical usage data preserved
- Legacy API endpoints work identically

**What Changes:**
- Future requests use separate pricing
- Dashboard displays separate breakdowns
- More accurate cost estimates

### Data Migration

**Historical Usage Records:**

The platform maintains backward compatibility:

| Field | Status | Description |
|-------|--------|-------------|
| `credits_deducted` | **Required** | Legacy total credits (maintained forever) |
| `input_credits` | **Nullable** | New separate input credits (populated for new requests) |
| `output_credits` | **Nullable** | New separate output credits (populated for new requests) |
| `total_credits` | **Nullable** | Sum of input + output (populated for new requests) |

**Database Constraint:**
```sql
CHECK (
  (total_credits IS NULL AND input_credits IS NULL AND output_credits IS NULL)
  OR
  (total_credits = input_credits + output_credits)
)
```

This ensures data integrity while allowing gradual migration.

### For Billing/Accounting

**Credit Calculations:**
- All new requests populate both old and new fields
- Reports can use either field (values are identical for new requests)
- Historical reports use `credits_deducted`
- New reports use `input_credits` + `output_credits` for breakdown

**No Financial Impact:**
- Total credits charged remain the same
- Only the internal calculation method changed
- User billing/invoices unaffected

### Migration Checklist

**For Platform Administrators:**
- [ ] Review all model pricing in admin dashboard
- [ ] Verify auto-calculated credits match expectations
- [ ] Update internal documentation/training materials
- [ ] Communicate changes to support team
- [ ] Monitor gross margins for first 30 days

**For API Developers:**
- [ ] Review API integration code
- [ ] Update to use new `inputCreditsPerK`/`outputCreditsPerK` fields
- [ ] Test with production models
- [ ] Update frontend UI to display separate breakdowns
- [ ] Schedule legacy field deprecation (2026 Q3)

**For End Users:**
- [ ] Review pricing page for updated model costs
- [ ] Check usage dashboard for new breakdown display
- [ ] Adjust budget/limits if needed (typically no change)

---

## FAQ

### General Questions

**Q: Will my credits cost more now?**

A: No. The total credits charged for your requests should be approximately the same (or more accurate). We fixed a 100× overcharge bug, so costs are actually **much lower** than the old buggy calculation.

**Q: Why are output tokens more expensive?**

A: LLM providers (OpenAI, Anthropic, Google) charge more for output tokens because generating text requires more computational resources than processing input. Our pricing reflects this real-world asymmetry.

**Q: Can I see the old simple average pricing?**

A: Yes, the legacy `creditsPer1kTokens` field is still available in API responses for backward compatibility. However, we recommend using the new separate pricing for accuracy.

**Q: What happens to my historical usage data?**

A: All historical usage remains unchanged. New requests will populate the new separate credit fields while maintaining the legacy field for continuity.

---

### Cost Questions

**Q: How do I know which models are most cost-effective?**

A: Use the **Model Comparison** tool in the dashboard. Sort by "Credits per 1K Output" to see the most economical models for your use case.

**Example Ranking (Output Credits per 1K):**
1. Gemini 2.0 Flash: 2 credits
2. GPT-4o Mini: 3 credits
3. GPT-5 Chat: 50 credits
4. Claude Opus 4.1: 375 credits

**Q: Why did my estimated cost change?**

A: The new calculation is more accurate. If your use case has:
- **Long outputs:** Estimated cost may increase (reflects true cost)
- **Short outputs:** Estimated cost may decrease (you pay less)
- **Balanced input/output:** Estimated cost should be similar

**Q: Can I set a budget for separate input/output?**

A: Not currently. Budget limits apply to total credits. This feature may be added in a future update.

---

### Technical Questions

**Q: How are fractional credits handled?**

A: All credit calculations use `Math.ceil()` (round up). Example:
- 0.1 credits → 1 credit
- 0.9 credits → 1 credit
- 1.0 credits → 1 credit

This ensures users are never charged fractional credits.

**Q: What if a model doesn't have separate pricing?**

A: The system falls back to the legacy `creditsPer1kTokens` field and splits credits proportionally based on token counts:

```
inputCredits = (inputTokens / totalTokens) × totalCredits
outputCredits = totalCredits - inputCredits
```

**Q: Can I override the auto-calculated pricing?**

A: Yes, administrators can manually set `inputCreditsPerK` and `outputCreditsPerK` in the model edit dialog. This bypasses auto-calculation.

**Q: How often should pricing be updated?**

A: Review provider pricing quarterly. Update immediately if providers announce price changes. Enable email notifications in **Admin Settings → Pricing Alerts**.

---

### Billing Questions

**Q: Will my invoice show separate input/output costs?**

A: Not in the current version. Invoices show total credits consumed. The usage dashboard provides the breakdown.

**Q: How are credits allocated in my subscription?**

A: Monthly credit allocations remain unchanged. The allocation is for **total credits** (input + output combined).

**Q: What happens if I run out of credits mid-request?**

A: The request is rejected before processing. We never partially charge for incomplete requests.

---

## Examples & Comparisons

### Example 1: Simple Chat (Short Output)

**Use Case:** Quick question with brief answer

**Request:**
- Input: "What is 2+2?" (5 tokens)
- Output: "4" (1 token)

**GPT-5 Chat Pricing:**
- Input: 7 credits/1K
- Output: 50 credits/1K

**Cost Calculation:**
```
inputCredits = ceil(5/1000 × 7) = ceil(0.035) = 1
outputCredits = ceil(1/1000 × 50) = ceil(0.05) = 1
totalCredits = 1 + 1 = 2 credits
```

**Legacy Calculation (Simple Average):**
```
totalTokens = 6
totalCredits = ceil(6/1000 × 29) = ceil(0.174) = 1 credit ❌
```

**Difference:** Separate pricing charges 1 more credit (more accurate).

---

### Example 2: Code Generation (Long Output)

**Use Case:** Generate a React component

**Request:**
- Input: "Create a React button component with hover effect" (10 tokens)
- Output: 500 tokens of code

**GPT-5 Chat Pricing:**
- Input: 7 credits/1K
- Output: 50 credits/1K

**Cost Calculation:**
```
inputCredits = ceil(10/1000 × 7) = ceil(0.07) = 1
outputCredits = ceil(500/1000 × 50) = ceil(25) = 25
totalCredits = 1 + 25 = 26 credits
```

**Legacy Calculation:**
```
totalTokens = 510
totalCredits = ceil(510/1000 × 29) = ceil(14.79) = 15 credits ❌
```

**Difference:** Separate pricing charges 11 more credits (reflects expensive output).

---

### Example 3: Document Summarization (Long Input, Short Output)

**Use Case:** Summarize a 5000-token article

**Request:**
- Input: 5000 tokens (long article)
- Output: 200 tokens (summary)

**GPT-5 Chat Pricing:**
- Input: 7 credits/1K
- Output: 50 credits/1K

**Cost Calculation:**
```
inputCredits = ceil(5000/1000 × 7) = ceil(35) = 35
outputCredits = ceil(200/1000 × 50) = ceil(10) = 10
totalCredits = 35 + 10 = 45 credits
```

**Legacy Calculation:**
```
totalTokens = 5200
totalCredits = ceil(5200/1000 × 29) = ceil(150.8) = 151 credits ❌
```

**Difference:** Separate pricing saves 106 credits! (Legacy overcharged for short outputs).

---

### Example 4: Multi-Model Comparison

**Same Request Across Different Models:**
- Input: 100 tokens
- Output: 500 tokens

| Model | Input/1K | Output/1K | Input Cost | Output Cost | Total Cost |
|-------|----------|-----------|------------|-------------|------------|
| Gemini 2.0 Flash | 1 | 2 | 1 | 1 | **2 credits** |
| GPT-4o Mini | 1 | 3 | 1 | 2 | **3 credits** |
| GPT-5 Chat | 7 | 50 | 1 | 25 | **26 credits** |
| Claude Sonnet 4.5 | 60 | 300 | 6 | 150 | **156 credits** |
| Claude Opus 4.1 | 75 | 375 | 8 | 188 | **196 credits** |

**Insight:** For this use case (1:5 input:output ratio), Gemini 2.0 Flash is **98× cheaper** than Claude Opus 4.1!

---

### Example 5: Before/After Bug Fix

**Context:** The original pricing had a 100× overcharge bug (fixed in Phase 3).

**Model:** GPT-5 Chat
- Input: $1.25/1M tokens
- Output: $10.00/1M tokens

**Request:**
- 1000 input tokens
- 5000 output tokens

**Buggy Calculation (Before):**
```
inputCostPerK = (125000 / 1000000 × 1000) × 2.5 = 312.5 cents
outputCostPerK = (1000000 / 1000000 × 1000) × 2.5 = 2500 cents

// BUG: Dividing cents by dollars without conversion
inputCredits = ceil(312.5 / 0.0005) = 625000 ❌ (100× overcharge!)
outputCredits = ceil(2500 / 0.0005) = 5000000 ❌
```

**Fixed Calculation (After):**
```
creditCentValue = 0.0005 × 100 = 0.05 cents

inputCredits = ceil(312.5 / 0.05) = ceil(6250) = 6250 ✓
outputCredits = ceil(2500 / 0.05) = ceil(50000) = 50000 ✓

// Per 1K:
inputCreditsPerK = 6250 / 1000 = 7 credits/1K ✓
outputCreditsPerK = 50000 / 1000 = 50 credits/1K ✓

// Actual request cost:
inputCredits = ceil(1000/1000 × 7) = 7
outputCredits = ceil(5000/1000 × 50) = 250
totalCredits = 257 ✓
```

**Impact:** The bug fix reduced this request cost from **5,625,000 credits** to **257 credits** (21,828× reduction!).

---

## Summary

**Key Takeaways:**

1. **Separate pricing is more accurate** - reflects real-world LLM cost asymmetry
2. **Output tokens cost more** - typically 5-10× more than input tokens
3. **Total credits stay similar** - more accurate, not necessarily more expensive
4. **Backward compatible** - legacy API fields still work
5. **Transparent breakdown** - see exactly where your credits go

**Next Steps:**

- **Users:** Review your usage dashboard to see the new breakdown
- **Admins:** Verify model pricing in admin panel
- **Developers:** Update integrations to use new API fields

**Need Help?**
- Documentation: `/docs/reference/194-separate-pricing-api-reference.md`
- Support: support@rephlo.com
- Community: community.rephlo.com

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Maintained By:** Rephlo Product Team

---

**End of User Guide**
