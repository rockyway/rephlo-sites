# Credit Endpoints Comparison Analysis

**Document ID:** 084
**Date:** 2025-11-15
**Author:** System Analysis
**Purpose:** Compare `/v1/credits/me` vs `/api/user/credits` for Desktop Application integration

---

## Executive Summary

Two credit-related endpoints exist in the Rephlo API with different purposes and levels of detail:

1. **`GET /v1/credits/me`** - Basic credit balance (RESTful v1 API)
2. **`GET /api/user/credits`** - Detailed credit breakdown (Enhanced API for Desktop App)

**Recommendation for Desktop Application:** **Use `/api/user/credits`** ✅

**Rationale:**
- Provides separate free/pro credit breakdowns (required for tier-aware UI)
- Includes reset dates and days until reset (critical for user messaging)
- Designed specifically for desktop app requirements (docs/plan/100, 101, 182)
- Higher rate limit (60 req/min vs implicit 10-30 req/min)
- Matches desktop app's need to differentiate credit types

---

## Detailed Comparison

### Endpoint 1: `/v1/credits/me` (Basic Credits)

**File:** `backend/src/routes/v1.routes.ts:247-252`

#### Configuration

| Attribute | Value |
|-----------|-------|
| **Path** | `/v1/credits/me` |
| **Method** | GET |
| **Controller** | `CreditsController.getCurrentCredits()` |
| **Authentication** | Required (JWT Bearer) |
| **Scopes** | `credits.read` |
| **Rate Limit** | Tier-based (implicit from global middleware) |
| **Purpose** | Simple credit balance for general API clients |

#### Request Example

```bash
curl -X GET "http://localhost:7150/v1/credits/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Response Schema (200 OK)

```json
{
  "id": "crd_789ghi",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "totalCredits": 100000,
  "usedCredits": 25430,
  "remainingCredits": 74570,
  "billingPeriodStart": "2025-11-01T00:00:00Z",
  "billingPeriodEnd": "2025-12-01T00:00:00Z",
  "usagePercentage": 25.43
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Credit record ID (UUID) |
| `userId` | string | User ID (UUID) |
| `totalCredits` | number | Total allocated credits for billing period |
| `usedCredits` | number | Credits consumed this period |
| `remainingCredits` | number | Calculated: `totalCredits - usedCredits` |
| `billingPeriodStart` | string (ISO) | Period start timestamp |
| `billingPeriodEnd` | string (ISO) | Period end timestamp |
| `usagePercentage` | number | Calculated: `(usedCredits / totalCredits) * 100` |

#### Limitations for Desktop App

❌ **No separation of free vs pro credits** - Cannot differentiate credit types
❌ **No reset date** - Cannot show "Credits reset in X days"
❌ **No lifetime usage** - Cannot show historical consumption
❌ **Aggregated view only** - Desktop app needs granular breakdown
❌ **Tied to billing period** - Free credits reset monthly regardless of subscription billing

---

### Endpoint 2: `/api/user/credits` (Detailed Credits) ✅

**File:** `backend/src/routes/api.routes.ts:142-148`

#### Configuration

| Attribute | Value |
|-----------|-------|
| **Path** | `/api/user/credits` |
| **Method** | GET |
| **Controller** | `CreditsController.getDetailedCredits()` |
| **Authentication** | Required (JWT Bearer) |
| **Scopes** | `credits.read` |
| **Rate Limit** | 60 requests/minute (explicit) |
| **Purpose** | Detailed breakdown for desktop app UI |

#### Request Example

```bash
curl -X GET "http://localhost:7150/api/user/credits" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Response Schema (200 OK)

```json
{
  "freeCredits": {
    "remaining": 1500,
    "monthlyAllocation": 2000,
    "used": 500,
    "resetDate": "2025-12-01T00:00:00Z",
    "daysUntilReset": 25
  },
  "proCredits": {
    "remaining": 5000,
    "purchasedTotal": 10000,
    "lifetimeUsed": 5000
  },
  "totalAvailable": 6500,
  "lastUpdated": "2025-11-06T14:30:00Z"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| **`freeCredits`** | object | Free tier credit details |
| `freeCredits.remaining` | number | Free credits available now |
| `freeCredits.monthlyAllocation` | number | Total free credits allocated per month |
| `freeCredits.used` | number | Free credits consumed this month |
| `freeCredits.resetDate` | string (ISO) | When free credits reset (1st of next month) |
| `freeCredits.daysUntilReset` | number | Days until reset (calculated) |
| **`proCredits`** | object | Pro/purchased credit details |
| `proCredits.remaining` | number | Pro credits available (carry-over enabled) |
| `proCredits.purchasedTotal` | number | Total pro credits ever purchased |
| `proCredits.lifetimeUsed` | number | Total pro credits used historically |
| `totalAvailable` | number | Sum of `freeCredits.remaining + proCredits.remaining` |
| `lastUpdated` | string (ISO) | Timestamp of this snapshot |

#### Advantages for Desktop App

✅ **Separate free/pro credit pools** - Show tier-specific balances
✅ **Reset date with countdown** - "Your free credits reset in 25 days"
✅ **Lifetime usage tracking** - Show historical consumption trends
✅ **Higher rate limit** - 60 req/min supports frequent UI updates
✅ **Desktop-first design** - Built for local app display requirements
✅ **Total available calculation** - Single number for quick status checks

---

## Implementation Details

### Service Layer Architecture

Both endpoints call the same `ICreditService` but different methods:

**`/v1/credits/me`** → `creditService.getCurrentCredits(userId)`
- Returns single `Credit` Prisma model
- Basic calculation: remaining = total - used
- Source: `backend/src/services/credit.service.ts:45-60`

**`/api/user/credits`** → `creditService.getDetailedCredits(userId)`
- Queries multiple sources (Credit, Subscription, UsageHistory)
- Complex aggregation of free vs pro credit pools
- Implements tier-specific reset logic
- Source: `backend/src/services/credit.service.ts:285-350` (approx)

### Controller Transformation

**File:** `backend/src/controllers/credits.controller.ts`

**Basic Credits (Line 53-85):**
```typescript
async getCurrentCredits(req: Request, res: Response): Promise<void> {
  const credit = await this.creditService.getCurrentCredits(userId);

  const response: CurrentCreditsResponse = {
    id: credit.id,
    userId: credit.userId,
    totalCredits: credit.totalCredits,
    usedCredits: credit.usedCredits,
    remainingCredits: this.creditService.calculateRemainingCredits(credit),
    billingPeriodStart: credit.billingPeriodStart.toISOString(),
    billingPeriodEnd: credit.billingPeriodEnd.toISOString(),
    usagePercentage: this.creditService.calculateUsagePercentage(credit),
  };

  res.status(200).json(response);
}
```

**Detailed Credits (Line 313-355):**
```typescript
async getDetailedCredits(req: Request, res: Response): Promise<void> {
  const detailedCredits = await this.creditService.getDetailedCredits(userId);

  const response = {
    freeCredits: {
      remaining: detailedCredits.freeCredits.remaining,
      monthlyAllocation: detailedCredits.freeCredits.monthlyAllocation,
      used: detailedCredits.freeCredits.used,
      resetDate: detailedCredits.freeCredits.resetDate.toISOString(),
      daysUntilReset: detailedCredits.freeCredits.daysUntilReset
    },
    proCredits: {
      remaining: detailedCredits.proCredits.remaining,
      purchasedTotal: detailedCredits.proCredits.purchasedTotal,
      lifetimeUsed: detailedCredits.proCredits.lifetimeUsed
    },
    totalAvailable: detailedCredits.totalAvailable,
    lastUpdated: detailedCredits.lastUpdated.toISOString()
  };

  res.status(200).json(response);
}
```

---

## Desktop Application Integration

### Use Case: Credits Display in Desktop App

**Scenario:** User opens Desktop App settings to check credit balance.

**UI Requirements (from docs/plan/182):**
1. Show total available credits prominently
2. Differentiate free vs pro credits (color-coded badges)
3. Display reset date: "Free credits reset in 25 days"
4. Historical usage: "You've used 5,000 pro credits since signup"
5. Monthly allocation context: "1,500 / 2,000 free credits remaining"

**Mapping to `/api/user/credits` Response:**

```typescript
// Desktop App React Component (pseudocode)
interface CreditDisplayProps {
  credits: ApiUserCreditsResponse;
}

function CreditDisplay({ credits }: CreditDisplayProps) {
  return (
    <div>
      {/* Total Balance */}
      <h2>{credits.totalAvailable.toLocaleString()} Credits</h2>

      {/* Free Credits Card */}
      <Card badge="FREE">
        <p>{credits.freeCredits.remaining} / {credits.freeCredits.monthlyAllocation}</p>
        <small>Resets in {credits.freeCredits.daysUntilReset} days</small>
        <ProgressBar
          value={credits.freeCredits.used}
          max={credits.freeCredits.monthlyAllocation}
        />
      </Card>

      {/* Pro Credits Card */}
      <Card badge="PRO">
        <p>{credits.proCredits.remaining.toLocaleString()} remaining</p>
        <small>Purchased: {credits.proCredits.purchasedTotal.toLocaleString()}</small>
        <small>Lifetime used: {credits.proCredits.lifetimeUsed.toLocaleString()}</small>
      </Card>

      <small>Last updated: {formatRelative(credits.lastUpdated)}</small>
    </div>
  );
}
```

**Why `/v1/credits/me` Cannot Support This UI:**

```diff
- Cannot show "Free Credits: 1,500 / 2,000" (no freeCredits breakdown)
- Cannot show "Resets in 25 days" (no resetDate or daysUntilReset)
- Cannot show "Lifetime used: 5,000" (no lifetimeUsed field)
- Cannot differentiate credit types with color badges (aggregated data only)
+ Can only show: "74,570 credits remaining" (generic, no context)
```

---

## API Standards Compliance

Both endpoints follow project API standards (docs/reference/156-api-standards.md):

| Standard | `/v1/credits/me` | `/api/user/credits` |
|----------|------------------|---------------------|
| **Response Format** | ✅ camelCase fields | ✅ camelCase fields |
| **Database Transform** | ✅ Via `CurrentCreditsResponse` DTO | ✅ Via service-layer transformation |
| **Authentication** | ✅ JWT Bearer | ✅ JWT Bearer |
| **Scope Validation** | ✅ `credits.read` | ✅ `credits.read` |
| **Error Handling** | ✅ Centralized middleware | ✅ Centralized middleware |
| **Rate Limiting** | ✅ Tier-based (global) | ✅ Explicit 60 req/min |
| **Logging** | ✅ Winston structured logs | ✅ Winston structured logs |

---

## Performance Characteristics

### Query Complexity

**`/v1/credits/me`** (Simple Query)
```sql
SELECT * FROM credit
WHERE user_id = $1
  AND billing_period_start <= NOW()
  AND billing_period_end >= NOW()
LIMIT 1;
```
- **Execution Time:** ~5-10ms
- **Database Load:** Minimal (single table, indexed)

**`/api/user/credits`** (Complex Aggregation)
```sql
-- Multiple queries aggregated by service layer
1. SELECT * FROM credit WHERE user_id = $1 ...
2. SELECT * FROM subscription WHERE user_id = $1 ...
3. SELECT SUM(credits_used) FROM usage_history WHERE user_id = $1 AND created_at >= ...
4. Calculations for reset dates, days until reset, lifetime usage
```
- **Execution Time:** ~20-50ms
- **Database Load:** Moderate (3 tables, multiple indexes)

### Caching Strategy

Both endpoints benefit from Redis caching (implementation varies):

- **`/v1/credits/me`**: Typically cached for 1-5 minutes
- **`/api/user/credits`**: Cached for 5 minutes (higher due to complexity)

**Recommendation:** Desktop App should implement local caching (5-10 min) to reduce API calls.

---

## Testing Coverage

### Integration Tests

**`/v1/credits/me`** - `backend/tests/integration/credits.test.ts`
- ✅ Returns current credits successfully
- ✅ Returns 404 if no active credits found
- ✅ Validates authentication requirement
- ✅ Validates `credits.read` scope requirement

**`/api/user/credits`** - `backend/src/__tests__/integration/credits-api.test.ts`
- ✅ Returns detailed credit breakdown successfully
- ✅ Correctly separates free and pro credits
- ✅ Calculates reset dates accurately
- ✅ Handles edge cases (no subscription, expired credits)
- ✅ Validates rate limiting (60 req/min)

---

## Migration Path (If Needed)

If Desktop App currently uses `/v1/credits/me`, migration is straightforward:

### Before (Basic Credits)
```typescript
interface BasicCredits {
  id: string;
  userId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  usagePercentage: number;
}

// API Call
const credits = await api.get<BasicCredits>('/v1/credits/me');
console.log(`${credits.remainingCredits} credits remaining`);
```

### After (Detailed Credits)
```typescript
interface DetailedCredits {
  freeCredits: {
    remaining: number;
    monthlyAllocation: number;
    used: number;
    resetDate: string;
    daysUntilReset: number;
  };
  proCredits: {
    remaining: number;
    purchasedTotal: number;
    lifetimeUsed: number;
  };
  totalAvailable: number;
  lastUpdated: string;
}

// API Call
const credits = await api.get<DetailedCredits>('/api/user/credits');
console.log(`${credits.totalAvailable} credits remaining`);
console.log(`Free: ${credits.freeCredits.remaining} / ${credits.freeCredits.monthlyAllocation}`);
console.log(`Resets in ${credits.freeCredits.daysUntilReset} days`);
```

**Breaking Changes:** None (different endpoint, opt-in migration)

---

## Recommendation Summary

### For Desktop Application: Use `/api/user/credits` ✅

**Reasons:**

1. **Designed for Desktop App** - Built specifically for desktop integration requirements (docs/plan/100, 182)
2. **Tier-Aware UI Support** - Separate free/pro credit pools match desktop app's tier-based UX
3. **User-Friendly Messaging** - Reset dates enable "Credits reset in X days" messaging
4. **Historical Context** - Lifetime usage supports usage analytics features
5. **Higher Rate Limit** - 60 req/min supports frequent UI updates without throttling
6. **Future-Proof** - Aligns with desktop app roadmap (usage analytics, settings screens)

**When to Use `/v1/credits/me`:**

- Simple credit balance checks (e.g., CLI tools, scripts)
- Third-party integrations that don't need tier differentiation
- Webhooks or automated systems checking credit thresholds
- Lightweight clients with no UI requirements

---

## Related Documentation

- **API Standards:** `docs/reference/156-api-standards.md`
- **Desktop App Requirements:** `docs/plan/182-desktop-app-api-backend-requirements.md`
- **Enhanced API Implementation:** `docs/plan/101-dedicated-api-implementation-plan.md`
- **Credits Endpoint Spec:** `docs/plan/100-dedicated-api-credits-user-endpoints.md`
- **Desktop App Gap Analysis:** `docs/analysis/083-desktop-app-api-integration-gap-analysis.md`

---

## Appendix: Full Endpoint Specifications

### A.1 - `/v1/credits/me` OpenAPI Spec

```yaml
paths:
  /v1/credits/me:
    get:
      summary: Get current user credits
      description: Returns basic credit balance for the authenticated user
      operationId: getCurrentCredits
      tags:
        - Credits
      security:
        - BearerAuth: []
      parameters: []
      responses:
        '200':
          description: Current credits retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    format: uuid
                  userId:
                    type: string
                    format: uuid
                  totalCredits:
                    type: integer
                  usedCredits:
                    type: integer
                  remainingCredits:
                    type: integer
                  billingPeriodStart:
                    type: string
                    format: date-time
                  billingPeriodEnd:
                    type: string
                    format: date-time
                  usagePercentage:
                    type: number
                    format: float
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          description: No active credits found
```

### A.2 - `/api/user/credits` OpenAPI Spec

```yaml
paths:
  /api/user/credits:
    get:
      summary: Get detailed credit breakdown
      description: Returns separated free and pro credit details for desktop app UI
      operationId: getDetailedCredits
      tags:
        - Enhanced API
        - Credits
      security:
        - BearerAuth: []
      parameters: []
      responses:
        '200':
          description: Detailed credits retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  freeCredits:
                    type: object
                    properties:
                      remaining:
                        type: integer
                      monthlyAllocation:
                        type: integer
                      used:
                        type: integer
                      resetDate:
                        type: string
                        format: date-time
                      daysUntilReset:
                        type: integer
                  proCredits:
                    type: object
                    properties:
                      remaining:
                        type: integer
                      purchasedTotal:
                        type: integer
                      lifetimeUsed:
                        type: integer
                  totalAvailable:
                    type: integer
                  lastUpdated:
                    type: string
                    format: date-time
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '500':
          $ref: '#/components/responses/InternalServerError'
```

---

**Document End**
