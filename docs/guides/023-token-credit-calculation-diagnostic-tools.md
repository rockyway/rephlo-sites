# Token-to-Credit Calculation Diagnostic Tools

**User Guide for Examining and Verifying Token Usage and Credit Deductions**

This guide explains how to use the diagnostic scripts to examine, verify, and troubleshoot the token-to-credit conversion system in the Rephlo backend.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Diagnostic Scripts](#diagnostic-scripts)
4. [Common Use Cases](#common-use-cases)
5. [Understanding the Output](#understanding-the-output)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Rephlo backend uses a sophisticated token-to-credit conversion system that:
- Tracks token usage from LLM API responses
- Calculates vendor costs based on token counts
- Applies margin multipliers
- Converts costs to credit deductions
- Maintains dual-table credit tracking for performance and audit

These diagnostic tools help you verify that calculations are accurate and debug any issues.

---

## Prerequisites

### Environment Setup

```bash
# Navigate to backend directory
cd backend

# Ensure database is accessible
# Check .env file has correct DATABASE_URL

# Ensure Prisma client is generated
npm run prisma:generate
```

### Required Information

To use these tools effectively, you'll need:
- **User ID**: UUID of the user to examine (e.g., `8abab099-47b6-4a24-9c78-b02e7f071548`)
- **Request ID**: (Optional) Specific request UUID to investigate
- **Model ID**: (Optional) Specific model to check (e.g., `gpt-5-mini`)

---

## Diagnostic Scripts

### 1. Credit Balance Sync Tool

**File:** `backend/sync-credit-balance.ts`

**Purpose:** Synchronize the `user_credit_balance` table with the `credits` table to ensure data consistency.

**When to Use:**
- User reports "insufficient credits" despite having credits
- After database migrations or manual data changes
- Regular maintenance checks

**How to Run:**

```bash
cd backend
npx ts-node src/scripts/sync-credit-balance.ts
```

**Expected Output:**

```
🔄 Starting credit balance synchronization...

Found 15 users with current credits
✓ Updated balance for user 8abab099-47b6-4a24-9c78-b02e7f071548: 100 → 1499 credits

✅ Synchronization complete!
📊 Summary:
   - Total processed: 15
   - Created: 2
   - Updated: 3
   - Unchanged: 10
```

**What It Does:**
1. Reads all active credits from `credits` table
2. Calculates available credits (total - used)
3. Creates or updates `user_credit_balance` records
4. Reports any discrepancies

---

### 2. Usage History Checker

**File:** `backend/check-usage.js`

**Purpose:** Display recent token usage history with cost and credit calculations.

**When to Use:**
- View recent API requests and token consumption
- Verify token counts from LLM responses
- Check credit deductions over time

**How to Run:**

```bash
cd backend
node check-usage.js
```

**Expected Output:**

```
📊 Latest Usage History:
================================================================================

1. Request ID: 8e5d0560-6744-487d-b9ae-bd3a66ace268
   Model: gpt-5-mini
   Tokens: Input=121, Output=282, Cached=0, Total=403
   Costs: Input=$0.00001815, Output=$0.00016920
   Total Cost: $0.00018735
   Credits Used: 1
   Timestamp: 2025-11-21 10:17:13
```

**Configuration:**

Edit the `userId` variable in the script to examine different users:

```javascript
const userId = '8abab099-47b6-4a24-9c78-b02e7f071548'; // Change this
```

---

### 3. Token-to-Credit Calculation Verifier

**File:** `backend/check-token-calculation.js`

**Purpose:** Verify that token-to-credit calculations are mathematically correct.

**When to Use:**
- Validate that credit deductions match expected formula
- Debug incorrect credit charges
- Audit credit calculation accuracy

**How to Run:**

```bash
cd backend
node check-token-calculation.js
```

**Expected Output:**

```
📊 Token Usage Records (Latest 3):
====================================================================================================

1. Request ID: 8e5d0560-6744-487d-b9ae-bd3a66ace268
   Model: gpt-5-mini
   Tokens:
     - Input: 121
     - Output: 282
     - Cached: 0
     - Total: 403
   Cost Calculation:
     - Vendor Cost: $0.00018735
     - Margin Multiplier: 1.5x
     - Credit Value (USD): $0.00028103
     - Credits Deducted: 1
   Time: Fri Nov 21 2025 10:17:13 GMT-0600 (CST)
   Processing: 7392ms
   Verification:
     - Customer Cost: $0.000281 (vendor_cost × margin)
     - Calculated Credits: 1 (customer_cost / credit_value)
     - Match: ✅ CORRECT
```

**What It Verifies:**
1. Vendor cost = (input_tokens × input_price + output_tokens × output_price) / 1000
2. Customer cost = vendor_cost × margin_multiplier
3. Credits = CEIL(customer_cost / credit_value_usd)
4. Recorded credits match calculated credits

---

### 4. Vendor Cost Explanation Tool

**File:** `backend/explain-vendor-cost.js`

**Purpose:** Detailed step-by-step breakdown of how vendor cost is calculated from pricing table.

**When to Use:**
- Understand where vendor cost comes from
- Verify pricing table lookups
- Debug pricing-related issues
- Audit cost calculations

**How to Run:**

```bash
cd backend
node explain-vendor-cost.js
```

**Expected Output:**

```
📋 How Vendor Cost Was Calculated
================================================================================

Request ID: 8e5d0560-6744-487d-b9ae-bd3a66ace268
Model: gpt-5-mini
Provider: 6b8a356f-bac5-4f4c-bdd2-e1e5fc0c86be
Timestamp: Fri Nov 21 2025 10:17:13 GMT-0600 (Central Standard Time)

📊 Step 1: Token Counts
--------------------------------------------------------------------------------
  Input Tokens:  121
  Output Tokens: 282
  Cached Tokens: 0
  Total Tokens:  403

💰 Step 2: Vendor Pricing (What Provider Charges Us)
--------------------------------------------------------------------------------
  Input Price:  $0.00015 per 1,000 tokens
  Output Price: $0.0006 per 1,000 tokens
  Effective:    Wed Nov 12 2025 18:00:00 GMT-0600 (CST) to ongoing

🧮 Step 3: Cost Calculation
--------------------------------------------------------------------------------
  Input Cost:  121 tokens × $0.00015 / 1000 = $0.00001815
  Output Cost: 282 tokens × $0.0006 / 1000 = $0.00016920
  ─────────────────────────────────────────────────────────────────
  Total Vendor Cost: $0.00018735
  (Recorded in DB:   $0.00018735)
  Match: ✅

💵 Step 4: Customer Cost (With Our Margin)
--------------------------------------------------------------------------------
  Customer Cost = Vendor Cost × Margin Multiplier
                = $0.00018735 × 1.5x
                = $0.00028103

🎫 Step 5: Credits Deduction
--------------------------------------------------------------------------------
  Credits = CEIL(Customer Cost / Credit Value)
          = CEIL($0.00028103 / $0.00028103)
          = CEIL(1.0000)
          = 1 credit(s)
  (Recorded in DB: 1)
  Match: ✅

================================================================================
✅ Summary: Vendor cost comes from model_provider_pricing table
   based on token counts and pricing effective at request time.
================================================================================
```

**What It Explains:**
1. Where pricing data comes from (`model_provider_pricing` table)
2. How pricing is looked up (by model, provider, and effective date)
3. Step-by-step cost calculation with formulas
4. Verification that database values match calculations

---

### 5. Model Information Checker

**File:** `backend/check-models.js`

**Purpose:** Display available models in the database with their configurations.

**When to Use:**
- Verify model exists in database
- Check model availability status
- View model provider assignments
- Confirm model metadata

**How to Run:**

```bash
cd backend
node check-models.js
```

**Expected Output:**

```
🔍 Checking Models in Database...

Found 5 models:

- cache-test-model (cache-test-model)
  Provider: openai
  Available: false, Archived: true, Legacy: false

- claude-3-5-sonnet (claude-3.5-sonnet)
  Provider: anthropic
  Available: true, Archived: false, Legacy: true

- gpt-5-mini (GPT-5 Mini)
  Provider: openai
  Available: true, Archived: false, Legacy: false

Total models in database: 22
```

---

### 6. Provider and Model Details

**File:** `backend/check-gpt5-provider.js`

**Purpose:** Display detailed information about specific provider and model combination.

**When to Use:**
- Verify provider configuration
- Check model-to-provider mapping
- View pricing information for specific model
- Debug provider-related issues

**How to Run:**

```bash
cd backend
node check-gpt5-provider.js
```

**Configuration:**

Edit the `providerId` variable to check different providers:

```javascript
const providerId = '6b8a356f-bac5-4f4c-bdd2-e1e5fc0c86be'; // Change this
```

**Expected Output:**

```
🔍 Checking Provider and GPT-5-Mini Model...

📡 Provider Information:
  ID: 6b8a356f-bac5-4f4c-bdd2-e1e5fc0c86be
  Name: openai
  API Type: openai-compatible
  Enabled: true

🤖 Model Information:
  Model ID: gpt-5-mini
  Name: gpt-5-mini
  Display Name: GPT-5 Mini
  Description: Cost-efficient GPT-5 with 87.5% cost reduction
  Provider ID: 6b8a356f-bac5-4f4c-bdd2-e1e5fc0c86be
  Vendor Model ID: gpt-5-mini
  Context Window: 272000
  Max Output: 128000
  Available: true
  Archived: false
  Legacy: false

💰 Pricing Information:
  Model: gpt-5-mini
  Vendor ID: gpt-5-mini
  Input: $0.00015 per 1K
  Output: $0.0006 per 1K
  Cache Write: $N/A per 1K
  Cache Read: $N/A per 1K
  Effective: Wed Nov 12 2025 18:00:00 GMT-0600 (CST) to ongoing
  Active: true
```

---

## Common Use Cases

### Use Case 1: User Reports Incorrect Credit Deduction

**Problem:** User says they were charged 5 credits but expected 3 credits.

**Steps:**

1. **Get the request ID from logs or user report**

2. **Check the token usage record:**
   ```bash
   node check-token-calculation.js
   ```
   Find the request ID and verify token counts.

3. **Verify vendor cost calculation:**
   ```bash
   node explain-vendor-cost.js
   ```
   Check that pricing table has correct rates.

4. **Verify the calculation formula:**
   - Customer Cost = Vendor Cost × Margin (1.5x for Pro tier)
   - Credits = CEIL(Customer Cost / Credit Value)
   - Check if the match shows ✅

5. **If calculation is wrong:** Check `model_provider_pricing` table for correct pricing
6. **If calculation is correct:** Explain to user why the charge is accurate

---

### Use Case 2: "Insufficient Credits" Error Despite Having Credits

**Problem:** User has 1500 credits in dashboard but gets "insufficient credits" error.

**Steps:**

1. **Check credit balance consistency:**
   ```bash
   npx ts-node src/scripts/sync-credit-balance.ts
   ```

2. **Look for discrepancies in output:**
   ```
   ✓ Updated balance for user XXX: 0 → 1500 credits
   ```

3. **If sync fixed it:** The `user_credit_balance` table was out of sync

4. **If still failing after sync:** Check logs for transaction errors:
   ```bash
   grep "Insufficient credits" logs/combined.log | tail -20
   ```

5. **Enable debug logging** (if not already):
   - Check `backend/src/services/credit-deduction.service.ts` line 214-252
   - Debug logs show balance fetching and validation

---

### Use Case 3: Verify Pricing Changes Took Effect

**Problem:** You updated pricing in database, want to verify new requests use new pricing.

**Steps:**

1. **Check pricing table:**
   ```bash
   node check-gpt5-provider.js
   ```
   Verify `effective_from` date and pricing values.

2. **Make a test request** (using your API client)

3. **Check the recorded cost:**
   ```bash
   node explain-vendor-cost.js
   ```
   Verify "Step 2: Vendor Pricing" shows the new prices.

4. **Verify effective date logic:**
   - System should pick pricing where:
     - `effective_from <= request_time`
     - `effective_until >= request_time` OR `effective_until IS NULL`
     - `is_active = true`

---

### Use Case 4: Audit Credit Deductions for Period

**Problem:** CFO wants to verify credit deduction accuracy for billing reconciliation.

**Steps:**

1. **Get recent usage records:**
   ```bash
   node check-usage.js
   ```
   Review token counts and costs.

2. **Verify calculation accuracy:**
   ```bash
   node check-token-calculation.js
   ```
   Check that all records show "Match: ✅ CORRECT"

3. **Check for anomalies:**
   - Look for unusually high token counts
   - Check for zero-credit deductions
   - Verify margin multipliers are consistent

4. **Export detailed breakdown:**
   - Use `explain-vendor-cost.js` to get step-by-step calculations
   - Save output for audit records

---

## Understanding the Output

### Token Counts

```
Input Tokens:  121     ← Tokens in the prompt/request
Output Tokens: 282     ← Tokens in the completion/response
Cached Tokens: 0       ← Cached prompt tokens (if supported)
Total Tokens:  403     ← Input + Output
```

**Important Notes:**
- **Input tokens** include: system message, user message, function definitions, context
- **Output tokens** include: assistant response, function calls
- **Cached tokens** reduce cost (Anthropic prompt caching, OpenAI cached prompts)

---

### Cost Breakdown

```
Vendor Cost:         $0.00018735   ← What LLM provider charges us
Margin Multiplier:   1.5x          ← Our markup (50% margin)
Customer Cost:       $0.000281     ← What we charge user
Credit Value (USD):  $0.00028103   ← Value of 1 credit for user's tier
Credits Deducted:    1             ← Final credits charged
```

**Formula Chain:**
```
1. Vendor Cost = (input_tokens × input_price + output_tokens × output_price) / 1000
2. Customer Cost = vendor_cost × margin_multiplier
3. Credits = CEIL(customer_cost / credit_value_usd)
```

**Why CEIL?**
- Prevents fractional credits (user experience)
- Ensures we never lose money on micro-transactions
- Industry standard for usage-based billing

---

### Verification Symbols

| Symbol | Meaning |
|--------|---------|
| ✅ | Values match - calculation correct |
| ❌ | Mismatch detected - investigate |
| ⚠️ | Warning - data missing or unusual |
| ℹ️ | Informational - no action needed |

---

## Troubleshooting

### Issue: Scripts Show "No data found"

**Possible Causes:**
1. Wrong user ID
2. User has no API usage yet
3. Database connection issue

**Solutions:**
```bash
# Verify user exists
cd backend
node -e "const p=require('@prisma/client'); const prisma=new p.PrismaClient(); prisma.users.findUnique({where:{id:'USER_ID_HERE'}}).then(u=>console.log(u)).finally(()=>process.exit())"

# Check database connection
npm run prisma:studio
```

---

### Issue: Calculation Shows ❌ Mismatch

**Possible Causes:**
1. Pricing table has wrong values
2. Margin multiplier changed mid-request
3. Rounding error (very rare)

**Solutions:**
1. Run `node explain-vendor-cost.js` to see detailed breakdown
2. Check `model_provider_pricing` table for correct pricing
3. Verify `effective_from` and `effective_until` dates
4. Check if pricing changed during request time

---

### Issue: Scripts Fail with Prisma Errors

**Error Example:**
```
Unknown field `cache_input_price_per_1k` for select statement
```

**Cause:** Database schema doesn't match script expectations (column renamed)

**Solution:**
1. Check actual column names:
   ```bash
   npm run prisma:studio
   ```
   Navigate to `model_provider_pricing` table

2. Update script to use correct column names:
   - Old: `cache_input_price_per_1k`
   - New: `cache_write_price_per_1k`

---

### Issue: "Insufficient Credits" Despite Sync

**Possible Causes:**
1. Transaction isolation issue
2. Race condition (multiple concurrent requests)
3. Credits expired (billing period ended)

**Solutions:**
1. Check billing period:
   ```sql
   SELECT billing_period_start, billing_period_end
   FROM credits
   WHERE user_id = 'USER_ID' AND is_current = true;
   ```

2. Check for concurrent requests in logs:
   ```bash
   grep "USER_ID" logs/combined.log | grep "2025-11-21" | grep "deduct"
   ```

3. Review transaction logs for rollbacks

---

## Best Practices

### Regular Maintenance

Run these checks regularly:

**Weekly:**
```bash
# Verify credit balance consistency
npx ts-node src/scripts/sync-credit-balance.ts
```

**After Pricing Updates:**
```bash
# Verify pricing took effect
node check-gpt5-provider.js
node explain-vendor-cost.js  # After making test request
```

**Before Billing:**
```bash
# Audit recent calculations
node check-token-calculation.js
```

---

### When Debugging Issues

**Always collect this information:**

1. **User ID** - who reported the issue
2. **Request ID** - specific request with problem
3. **Timestamp** - when it occurred
4. **Expected vs Actual** - what user expected vs what happened

**Run these scripts in order:**

1. `check-usage.js` - Get recent usage overview
2. `explain-vendor-cost.js` - Get detailed calculation breakdown
3. `check-token-calculation.js` - Verify math is correct
4. `sync-credit-balance.ts` - Fix any balance inconsistencies

---

## Advanced Usage

### Customizing Scripts for Specific Users

Edit the `userId` constant in each script:

```javascript
// Before
const userId = '8abab099-47b6-4a24-9c78-b02e7f071548';

// After - your user
const userId = 'YOUR-USER-UUID-HERE';
```

### Filtering by Date Range

Modify the `where` clause to filter by date:

```javascript
const usage = await prisma.token_usage_ledger.findMany({
  where: {
    user_id: userId,
    request_started_at: {
      gte: new Date('2025-11-01'),
      lte: new Date('2025-11-30'),
    },
  },
  // ...
});
```

### Exporting Results to File

Redirect output to a file for analysis:

```bash
node check-token-calculation.js > audit-report-2025-11-21.txt
```

---

## Related Documentation

- **Token Tracking Service:** `backend/src/services/token-tracking.service.ts`
- **Credit Deduction Service:** `backend/src/services/credit-deduction.service.ts`
- **Cost Calculation Service:** `backend/src/services/cost-calculation.service.ts`
- **Plan 112:** `docs/plan/112-token-to-credit-conversion-mechanism.md`
- **API Standards:** `docs/reference/156-api-standards.md`

---

## Support

If you encounter issues not covered in this guide:

1. Check server logs: `backend/logs/combined.log`
2. Enable debug logging: Set `LOG_LEVEL=debug` in `.env`
3. Use Prisma Studio for direct database inspection: `npm run prisma:studio`
4. Review transaction logs for SERIALIZABLE isolation issues

---

**Last Updated:** November 21, 2025
**Version:** 1.0
**Author:** Rephlo Development Team
