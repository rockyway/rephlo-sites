# Separate Input/Output Pricing API Reference

**Document Number:** 194
**Date:** 2025-11-19
**Status:** Active
**Related Documents:**
- [205 Implementation Report](../progress/205-separate-input-output-pricing-implementation-complete.md)
- [193 Admin Model Management API](./193-admin-model-management-api.md)
- [189 Pricing Tier Restructure Plan](../plan/189-pricing-tier-restructure-plan.md)

---

## Overview

The Rephlo platform now supports **separate input and output token pricing** for all LLM models. This enhancement provides more accurate credit calculations that reflect the real-world asymmetry between input and output token costs (typically 1:5 to 1:10 ratio).

**Key Benefits:**
- **Accurate Pricing:** Credits calculated based on actual token usage patterns
- **Granular Tracking:** Separate input/output credit deductions in usage ledger
- **Better Transparency:** Users see detailed breakdown of costs
- **Backward Compatible:** Legacy APIs continue to work seamlessly

**Migration Note:** This system replaces the simplified averaging approach (`creditsPer1kTokens`) with precise per-token-type pricing (`inputCreditsPerK` + `outputCreditsPerK`).

---

## API Endpoints

### 1. Get Model Details with Separate Pricing

Retrieve model information including separate input/output pricing.

**Endpoint:** `GET /v1/models/:modelId`

**Authentication:** Required (Bearer Token)

**Request:**
```http
GET /v1/models/gpt-5-chat HTTP/1.1
Host: localhost:7150
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "model": {
      "id": "gpt-5-chat",
      "name": "gpt-5-chat",
      "provider": "openai",
      "isAvailable": true,
      "isLegacy": false,
      "isArchived": false,
      "createdAt": "2025-11-15T10:30:00.000Z",
      "updatedAt": "2025-11-19T14:25:00.000Z",
      "meta": {
        "displayName": "GPT-5 Chat",
        "description": "Next-generation conversational AI model",
        "contextLength": 128000,
        "maxOutputTokens": 32768,

        // Provider costs (in cents per million tokens)
        "inputCostPerMillionTokens": 125000,   // $1.25/1M
        "outputCostPerMillionTokens": 1000000, // $10.00/1M

        // Separate pricing (NEW)
        "inputCreditsPerK": 7,    // 7 credits per 1K input tokens
        "outputCreditsPerK": 50,  // 50 credits per 1K output tokens

        // DEPRECATED (for backward compatibility)
        "creditsPer1kTokens": 29,

        "capabilities": ["text", "vision", "function_calling"],
        "requiredTier": "pro",
        "tierRestrictionMode": "minimum",
        "allowedTiers": ["pro", "pro_max", "enterprise_pro", "enterprise_max"]
      }
    }
  }
}
```

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `inputCreditsPerK` | number | Credits charged per 1,000 **input** tokens |
| `outputCreditsPerK` | number | Credits charged per 1,000 **output** tokens |
| `creditsPer1kTokens` | number | **DEPRECATED** - Estimated average (for backward compatibility) |
| `inputCostPerMillionTokens` | number | Provider's input cost in cents per 1M tokens |
| `outputCostPerMillionTokens` | number | Provider's output cost in cents per 1M tokens |

---

### 2. List All Models with Pricing

Retrieve all available models with separate pricing information.

**Endpoint:** `GET /v1/models`

**Authentication:** Required (Bearer Token)

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `includeArchived` | boolean | Include archived models | `false` |
| `includeDeprecated` | boolean | Include deprecated models | `true` |
| `tier` | string | Filter by required tier | (none) |

**Request:**
```http
GET /v1/models?includeArchived=false&tier=pro HTTP/1.1
Host: localhost:7150
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "models": [
      {
        "id": "gpt-5-chat",
        "meta": {
          "displayName": "GPT-5 Chat",
          "inputCreditsPerK": 7,
          "outputCreditsPerK": 50
        }
      },
      {
        "id": "claude-sonnet-4.5",
        "meta": {
          "displayName": "Claude Sonnet 4.5",
          "inputCreditsPerK": 60,
          "outputCreditsPerK": 300
        }
      }
    ],
    "total": 19
  }
}
```

---

### 3. Admin: Create Model with Separate Pricing

Create a new model with automatic separate pricing calculation.

**Endpoint:** `POST /admin/models`

**Authentication:** Required (Admin Role)

**Request Body:**
```json
{
  "id": "gpt-5-turbo",
  "name": "gpt-5-turbo",
  "provider": "openai",
  "meta": {
    "displayName": "GPT-5 Turbo",
    "description": "High-speed GPT-5 variant",
    "contextLength": 128000,
    "maxOutputTokens": 16384,

    // Provider costs (required)
    "inputCostPerMillionTokens": 100000,   // $1.00/1M
    "outputCostPerMillionTokens": 400000,  // $4.00/1M

    // Separate credits (OPTIONAL - auto-calculated if omitted)
    // "inputCreditsPerK": 5,
    // "outputCreditsPerK": 20,

    "capabilities": ["text", "function_calling"],
    "requiredTier": "pro",
    "tierRestrictionMode": "minimum",
    "allowedTiers": ["pro", "pro_max", "enterprise_pro", "enterprise_max"]
  }
}
```

**Auto-Calculation Behavior:**

If `inputCreditsPerK` or `outputCreditsPerK` are omitted, they are automatically calculated based on:
1. Provider's cost per million tokens
2. Platform margin multiplier (default 2.5×)
3. Credit value (0.0005 USD = 0.05 cents per credit)

**Formula:**
```typescript
const creditCentValue = 0.05; // 0.0005 USD * 100
const marginMultiplier = 2.5; // Default margin

inputCreditsPerK = Math.ceil(
  (inputCostPerMillionTokens / 1_000_000 * 1000) * marginMultiplier / creditCentValue
);

outputCreditsPerK = Math.ceil(
  (outputCostPerMillionTokens / 1_000_000 * 1000) * marginMultiplier / creditCentValue
);
```

**Example Calculation:**
```
Input: $1.00 per 1M tokens = 100,000 cents
  → (100000 / 1000000 * 1000) * 2.5 / 0.05
  → (0.1 * 1000) * 2.5 / 0.05
  → 100 * 2.5 / 0.05
  → 250 / 0.05
  → 5000 / 100 = 5 credits/1K ✓

Output: $4.00 per 1M tokens = 400,000 cents
  → (400000 / 1000000 * 1000) * 2.5 / 0.05
  → (0.4 * 1000) * 2.5 / 0.05
  → 400 * 2.5 / 0.05
  → 1000 / 0.05
  → 20000 / 100 = 20 credits/1K ✓
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Model 'gpt-5-turbo' created successfully",
  "data": {
    "model": {
      "id": "gpt-5-turbo",
      "meta": {
        "inputCreditsPerK": 5,    // Auto-calculated
        "outputCreditsPerK": 20,  // Auto-calculated
        "creditsPer1kTokens": 9   // Auto-calculated (estimated average)
      }
    }
  }
}
```

---

### 4. Admin: Update Model Pricing

Update model pricing with automatic recalculation of separate credits.

**Endpoint:** `PATCH /admin/models/:id`

**Authentication:** Required (Admin Role)

**Request:**
```http
PATCH /admin/models/gpt-5-chat HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "meta": {
    "inputCostPerMillionTokens": 150000,   // Update to $1.50/1M
    "outputCostPerMillionTokens": 1200000  // Update to $12.00/1M
  },
  "reason": "Price adjustment Q4 2025"
}
```

**Auto-Recalculation:**
- When `inputCostPerMillionTokens` or `outputCostPerMillionTokens` changes, the system automatically recalculates:
  - `inputCreditsPerK`
  - `outputCreditsPerK`
  - `creditsPer1kTokens` (deprecated field)

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Model 'gpt-5-chat' updated successfully",
  "data": {
    "model": {
      "meta": {
        "inputCostPerMillionTokens": 150000,
        "outputCostPerMillionTokens": 1200000,
        "inputCreditsPerK": 8,    // Recalculated
        "outputCreditsPerK": 60,  // Recalculated
        "creditsPer1kTokens": 34  // Recalculated (deprecated)
      }
    }
  }
}
```

**Manual Override:**

If you want to set custom credit values (bypassing auto-calculation):

```json
{
  "meta": {
    "inputCreditsPerK": 10,   // Manual override
    "outputCreditsPerK": 70,  // Manual override
    "creditsPer1kTokens": 40  // Manual override
  }
}
```

---

### 5. Token Usage with Separate Credit Tracking

All LLM inference endpoints (`/v1/chat/completions`, `/v1/completions`) now return separate credit breakdowns.

**Endpoint:** `POST /v1/chat/completions`

**Request:**
```json
{
  "model": "gpt-5-chat",
  "messages": [
    { "role": "user", "content": "Explain quantum computing in simple terms." }
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "chatcmpl-123456",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-5-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Quantum computing uses quantum mechanics..."
      },
      "finishReason": "stop"
    }
  ],

  // Token usage with separate credit breakdown (NEW)
  "usage": {
    "inputTokens": 12,
    "outputTokens": 150,
    "totalTokens": 162,

    // Separate credit breakdown
    "inputCredits": 1,    // 12 tokens / 1000 * 7 credits = 0.084 → ceil(1)
    "outputCredits": 8,   // 150 tokens / 1000 * 50 credits = 7.5 → ceil(8)
    "totalCredits": 9,    // inputCredits + outputCredits

    // DEPRECATED (for backward compatibility)
    "creditsDeducted": 9
  }
}
```

**Credit Calculation Logic:**

```typescript
// Example: GPT-5 Chat (7 credits/1K input, 50 credits/1K output)
const inputTokens = 12;
const outputTokens = 150;

const inputCredits = Math.ceil((inputTokens / 1000) * 7);   // ceil(0.084) = 1
const outputCredits = Math.ceil((outputTokens / 1000) * 50); // ceil(7.5) = 8
const totalCredits = inputCredits + outputCredits;           // 9
```

**Key Points:**
- Credits are always **rounded up** (Math.ceil) to avoid fractional deductions
- `totalCredits` is always the sum of `inputCredits` + `outputCredits`
- Legacy `creditsDeducted` field mirrors `totalCredits` for backward compatibility

---

### 6. Usage History with Separate Credits

Retrieve detailed usage history with separate credit breakdowns.

**Endpoint:** `GET /v1/usage`

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `startDate` | ISO 8601 | Start date filter | 30 days ago |
| `endDate` | ISO 8601 | End date filter | Now |
| `modelId` | string | Filter by model | (none) |
| `limit` | number | Max records | 100 |

**Request:**
```http
GET /v1/usage?startDate=2025-11-01T00:00:00Z&limit=50 HTTP/1.1
Host: localhost:7150
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "usage": [
      {
        "id": "usage-abc123",
        "modelId": "gpt-5-chat",
        "timestamp": "2025-11-19T15:30:00.000Z",
        "inputTokens": 120,
        "outputTokens": 800,
        "totalTokens": 920,

        // Separate credit breakdown
        "inputCredits": 1,      // 120/1000 * 7 = 0.84 → 1
        "outputCredits": 40,    // 800/1000 * 50 = 40
        "totalCredits": 41,     // 1 + 40

        // DEPRECATED
        "creditsDeducted": 41,

        "status": "success",
        "requestType": "streaming"
      }
    ],
    "total": 156,
    "summary": {
      "totalInputTokens": 15420,
      "totalOutputTokens": 89600,
      "totalInputCredits": 108,    // Aggregated input credits
      "totalOutputCredits": 4480,  // Aggregated output credits
      "totalCredits": 4588,
      "averageCreditsPerRequest": 29
    }
  }
}
```

---

## Database Schema

### Token Usage Ledger (Updated)

The `token_usage_ledger` table now tracks separate input/output credits:

```sql
CREATE TABLE token_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  model_id VARCHAR(100) NOT NULL,
  provider_id VARCHAR(50) NOT NULL,

  -- Token counts
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cached_input_tokens INTEGER,
  total_tokens INTEGER NOT NULL,

  -- Legacy credit field (REQUIRED for backward compatibility)
  credits_deducted INTEGER NOT NULL,

  -- NEW: Separate input/output credits (nullable for gradual migration)
  input_credits INTEGER,
  output_credits INTEGER,
  total_credits INTEGER,

  -- Integrity constraint
  CONSTRAINT check_total_credits CHECK (
    (total_credits IS NULL AND input_credits IS NULL AND output_credits IS NULL)
    OR
    (total_credits = input_credits + output_credits)
  ),

  -- Additional fields...
  vendor_cost NUMERIC(10, 6),
  margin_multiplier NUMERIC(5, 2),
  gross_margin NUMERIC(10, 6),
  request_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Migration Strategy:**
- **Backward Compatibility:** Existing `credits_deducted` field remains **required**
- **New Requests:** Populate both old (`credits_deducted`) and new (`input_credits`, `output_credits`, `total_credits`) fields
- **Legacy Queries:** Continue to work without modification using `credits_deducted`
- **Gradual Migration:** Nullable new fields allow gradual backfill of historical data

---

## Calculation Examples

### Example 1: GPT-5 Chat (Expensive Output)

**Model Pricing:**
- Input: $1.25/1M tokens → 7 credits/1K
- Output: $10.00/1M tokens → 50 credits/1K

**Request:**
- Input: 50 tokens
- Output: 200 tokens

**Credit Calculation:**
```
inputCredits = ceil(50 / 1000 * 7) = ceil(0.35) = 1
outputCredits = ceil(200 / 1000 * 50) = ceil(10) = 10
totalCredits = 1 + 10 = 11 credits
```

**Comparison to Legacy (Simple Average):**
```
Legacy: ceil(250 / 1000 * 29) = ceil(7.25) = 8 credits ❌ (undercharge)
Separate: 11 credits ✓ (accurate)
```

---

### Example 2: Claude Opus 4.1 (Very Expensive)

**Model Pricing:**
- Input: $15.00/1M tokens → 75 credits/1K
- Output: $75.00/1M tokens → 375 credits/1K

**Request:**
- Input: 1000 tokens
- Output: 5000 tokens

**Credit Calculation:**
```
inputCredits = ceil(1000 / 1000 * 75) = 75
outputCredits = ceil(5000 / 1000 * 375) = 1875
totalCredits = 75 + 1875 = 1950 credits
```

---

### Example 3: Gemini 2.0 Flash (Very Cheap)

**Model Pricing:**
- Input: $0.10/1M tokens → 1 credit/1K
- Output: $0.40/1M tokens → 2 credits/1K

**Request:**
- Input: 500 tokens
- Output: 100 tokens

**Credit Calculation:**
```
inputCredits = ceil(500 / 1000 * 1) = ceil(0.5) = 1
outputCredits = ceil(100 / 1000 * 2) = ceil(0.2) = 1
totalCredits = 1 + 1 = 2 credits
```

---

## Error Handling

### Error: Missing Separate Pricing Data

If a legacy model doesn't have `inputCreditsPerK` or `outputCreditsPerK`:

**Fallback Behavior:**
```typescript
// Graceful degradation to legacy field
if (!inputCreditsPerK || !outputCreditsPerK) {
  // Use legacy creditsPer1kTokens and split proportionally
  const totalTokens = inputTokens + outputTokens;
  const totalCredits = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

  // Split proportionally by token count
  inputCredits = Math.ceil((inputTokens / totalTokens) * totalCredits);
  outputCredits = totalCredits - inputCredits;
}
```

**Error Response:**
```json
{
  "error": {
    "code": "pricing_unavailable",
    "message": "Model does not have separate input/output pricing configured. Using legacy pricing."
  }
}
```

---

## Backward Compatibility

### Legacy API Support

All existing API integrations continue to work without modification:

1. **Model API:** Still returns `creditsPer1kTokens` field
2. **Usage API:** Still returns `creditsDeducted` field
3. **Database:** `credits_deducted` column remains required

**Migration Path:**
- **Phase 1:** Add new fields alongside legacy fields (CURRENT)
- **Phase 2:** Update documentation to recommend new fields (Q1 2026)
- **Phase 3:** Deprecate legacy fields with 6-month notice (Q3 2026)
- **Phase 4:** Remove legacy fields (Q1 2027)

---

## Rate Limiting

API endpoints follow standard tier-based rate limits:

| Tier | Requests/Minute |
|------|-----------------|
| Free | 10 |
| Pro | 60 |
| Enterprise | 300 |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1700000000
```

---

## Related Endpoints

- `GET /v1/models` - List all models
- `GET /v1/models/:modelId` - Get model details
- `POST /v1/chat/completions` - Chat completions with usage
- `POST /v1/completions` - Text completions with usage
- `GET /v1/usage` - Usage history
- `GET /v1/usage/stats` - Usage statistics
- `POST /admin/models` - Create model (admin)
- `PATCH /admin/models/:id` - Update model (admin)

---

## Best Practices

### For API Consumers

1. **Use Separate Fields:** Prefer `inputCreditsPerK`/`outputCreditsPerK` over deprecated `creditsPer1kTokens`
2. **Check Field Existence:** Always check if new fields exist before using (for legacy model compatibility)
3. **Display Breakdown:** Show users separate input/output costs for transparency
4. **Cache Model Pricing:** Cache model pricing data to reduce API calls (TTL: 5 minutes)

### For Administrators

1. **Set Provider Costs:** Always set accurate `inputCostPerMillionTokens` and `outputCostPerMillionTokens`
2. **Let Auto-Calculation Work:** Don't manually override separate credits unless necessary
3. **Monitor Margins:** Use admin dashboard to track gross margins per model
4. **Update Pricing Regularly:** Review and update provider costs quarterly

---

## Testing

### cURL Examples

#### Get Model with Separate Pricing
```bash
curl -X GET http://localhost:7150/v1/models/gpt-5-chat \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Create Model with Auto-Calculation
```bash
curl -X POST http://localhost:7150/admin/models \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-model",
    "name": "test-model",
    "provider": "openai",
    "meta": {
      "displayName": "Test Model",
      "contextLength": 8192,
      "inputCostPerMillionTokens": 50000,
      "outputCostPerMillionTokens": 150000,
      "capabilities": ["text"],
      "requiredTier": "free",
      "tierRestrictionMode": "minimum",
      "allowedTiers": ["free", "pro"]
    }
  }'
```

#### Chat Completion with Usage Tracking
```bash
curl -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

**API Version:** v1
**Last Updated:** 2025-11-19
**Maintained By:** Rephlo Backend Team

---

**End of API Reference**
