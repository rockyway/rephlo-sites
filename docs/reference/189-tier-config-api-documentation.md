# Tier Configuration Management API Documentation (Plan 190)

**API Version:** v1
**Base URL:** `/api/admin/tier-config`
**Authentication:** Required (Admin role + `admin` scope)
**Rate Limiting:** Tier-based (300 req/min for admins)

---

## Overview

The Tier Configuration Management API provides endpoints for managing subscription tier credit allocations, pricing, and rollout schedules. All endpoints require admin authentication and follow the upgrade-only policy for existing users.

### Key Features

- **Configuration Versioning**: Each tier maintains an incremental `configVersion` for rollback capability
- **Audit Trail**: All changes recorded in immutable `tier_config_history` table
- **Preview Mode**: Dry-run impact analysis before applying changes
- **Rollout Flexibility**: Immediate or scheduled credit upgrades
- **Upgrade-Only Policy**: Users never lose credits, only gain them

---

## Endpoints

### 1. Get All Tier Configurations

**Endpoint:** `GET /api/admin/tier-config`

**Description:** Retrieves all tier configurations with current allocations and pricing.

**Authentication:** Required (Admin)

**Request:**
```http
GET /api/admin/tier-config HTTP/1.1
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tierName": "free",
      "monthlyCreditAllocation": 1000,
      "monthlyPriceUsd": 0.00,
      "annualPriceUsd": 0.00,
      "configVersion": 1,
      "isActive": true,
      "createdAt": "2025-01-10T10:00:00.000Z",
      "lastModifiedAt": "2025-01-10T10:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "tierName": "pro",
      "monthlyCreditAllocation": 50000,
      "monthlyPriceUsd": 29.99,
      "annualPriceUsd": 299.99,
      "configVersion": 3,
      "isActive": true,
      "createdAt": "2025-01-10T10:00:00.000Z",
      "lastModifiedAt": "2025-01-15T14:30:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "tierName": "enterprise",
      "monthlyCreditAllocation": 200000,
      "monthlyPriceUsd": 99.99,
      "annualPriceUsd": 999.99,
      "configVersion": 2,
      "isActive": true,
      "createdAt": "2025-01-10T10:00:00.000Z",
      "lastModifiedAt": "2025-01-12T09:15:00.000Z"
    }
  ],
  "error": null
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions (non-admin user)
- `500 Internal Server Error`: Database or server error

---

### 2. Get Tier Configuration by Name

**Endpoint:** `GET /api/admin/tier-config/:tierName`

**Description:** Retrieves detailed configuration for a specific tier.

**Authentication:** Required (Admin)

**Path Parameters:**

| Parameter | Type   | Required | Description                            |
|-----------|--------|----------|----------------------------------------|
| tierName  | string | Yes      | Tier name: `free`, `pro`, `enterprise` |

**Request:**
```http
GET /api/admin/tier-config/pro HTTP/1.1
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "tierName": "pro",
    "monthlyCreditAllocation": 50000,
    "monthlyPriceUsd": 29.99,
    "annualPriceUsd": 299.99,
    "configVersion": 3,
    "isActive": true,
    "createdAt": "2025-01-10T10:00:00.000Z",
    "lastModifiedAt": "2025-01-15T14:30:00.000Z"
  },
  "error": null
}
```

**Error Responses:**

- `400 Bad Request`: Invalid tier name
- `404 Not Found`: Tier configuration not found
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Database or server error

---

### 3. Get Tier Modification History

**Endpoint:** `GET /api/admin/tier-config/:tierName/history`

**Description:** Retrieves audit trail of all configuration changes for a tier, sorted by most recent first.

**Authentication:** Required (Admin)

**Path Parameters:**

| Parameter | Type   | Required | Description                            |
|-----------|--------|----------|----------------------------------------|
| tierName  | string | Yes      | Tier name: `free`, `pro`, `enterprise` |

**Query Parameters:**

| Parameter | Type   | Required | Default | Description                        |
|-----------|--------|----------|---------|------------------------------------|
| limit     | number | No       | 50      | Maximum number of records (1-100)  |

**Request:**
```http
GET /api/admin/tier-config/pro/history?limit=20 HTTP/1.1
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440003",
      "tierName": "pro",
      "changeType": "credit_increase",
      "previousCredits": 30000,
      "newCredits": 50000,
      "previousPriceUsd": null,
      "newPriceUsd": null,
      "changeReason": "Increased credits for competitive positioning against market rivals",
      "affectedUsersCount": 1250,
      "changedBy": "admin@rephlo.com",
      "changedAt": "2025-01-15T14:30:00.000Z",
      "appliedAt": "2025-01-15T14:35:00.000Z",
      "scheduledRolloutDate": null
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440002",
      "tierName": "pro",
      "changeType": "price_change",
      "previousCredits": null,
      "newCredits": null,
      "previousPriceUsd": 24.99,
      "newPriceUsd": 29.99,
      "changeReason": "Adjusted pricing to reflect improved service tier value proposition",
      "affectedUsersCount": 0,
      "changedBy": "admin@rephlo.com",
      "changedAt": "2025-01-12T10:00:00.000Z",
      "appliedAt": "2025-01-12T10:00:00.000Z",
      "scheduledRolloutDate": null
    }
  ],
  "error": null
}
```

**Response Fields:**

- **changeType**: `credit_increase` | `credit_decrease` | `price_change` | `feature_update`
- **appliedAt**: `null` if pending, ISO 8601 timestamp if applied
- **scheduledRolloutDate**: Future rollout date if scheduled, `null` otherwise

**Error Responses:**

- `400 Bad Request`: Invalid tier name or limit parameter
- `404 Not Found`: Tier configuration not found
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Database or server error

---

### 4. Preview Tier Update Impact

**Endpoint:** `POST /api/admin/tier-config/:tierName/preview-update`

**Description:** Dry-run analysis of tier credit update impact. Does NOT modify any data.

**Authentication:** Required (Admin)

**Path Parameters:**

| Parameter | Type   | Required | Description                            |
|-----------|--------|----------|----------------------------------------|
| tierName  | string | Yes      | Tier name: `free`, `pro`, `enterprise` |

**Request Body:**
```json
{
  "newCredits": 75000,
  "applyToExistingUsers": true
}
```

**Request Fields:**

| Field                 | Type    | Required | Description                                      |
|-----------------------|---------|----------|--------------------------------------------------|
| newCredits            | number  | Yes      | New monthly credit allocation (100-1,000,000)    |
| applyToExistingUsers  | boolean | No       | Whether to upgrade existing users (default: false) |

**Validation Rules:**
- `newCredits`: Must be in increments of 100
- `newCredits`: Minimum 100, maximum 1,000,000

**Request:**
```http
POST /api/admin/tier-config/pro/preview-update HTTP/1.1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newCredits": 75000,
  "applyToExistingUsers": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentCredits": 50000,
    "newCredits": 75000,
    "changeType": "increase",
    "affectedUsers": {
      "total": 1250,
      "willUpgrade": 1250,
      "willRemainSame": 0
    },
    "estimatedCostImpact": 31250.00
  },
  "error": null
}
```

**Response Fields:**

- **changeType**: `increase` | `decrease` | `no_change`
- **affectedUsers.total**: Total active users in tier
- **affectedUsers.willUpgrade**: Users whose credits will increase
- **affectedUsers.willRemainSame**: Users whose credits won't change
- **estimatedCostImpact**: Approximate cost increase in USD (25000 credits × $0.05/1000 credits = $1.25 per user)

**Error Responses:**

- `400 Bad Request`: Invalid tier name or validation errors
- `404 Not Found`: Tier configuration not found
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `422 Unprocessable Entity`: Business logic validation failed
- `500 Internal Server Error`: Database or server error

**Example Error (400 Bad Request):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "newCredits",
        "message": "Credits must be in increments of 100"
      }
    ]
  }
}
```

---

### 5. Update Tier Credits

**Endpoint:** `PATCH /api/admin/tier-config/:tierName/credits`

**Description:** Updates tier monthly credit allocation with optional immediate or scheduled rollout to existing users.

**Authentication:** Required (Admin)

**Path Parameters:**

| Parameter | Type   | Required | Description                            |
|-----------|--------|----------|----------------------------------------|
| tierName  | string | Yes      | Tier name: `free`, `pro`, `enterprise` |

**Request Body:**
```json
{
  "newCredits": 75000,
  "reason": "Increased credits for competitive positioning against market rivals based on Q1 2025 market analysis",
  "applyToExistingUsers": true,
  "scheduledRolloutDate": "2025-01-20T00:00:00.000Z"
}
```

**Request Fields:**

| Field                  | Type    | Required | Description                                          |
|------------------------|---------|----------|------------------------------------------------------|
| newCredits             | number  | Yes      | New monthly credit allocation (100-1,000,000)        |
| reason                 | string  | Yes      | Change justification (10-500 characters)             |
| applyToExistingUsers   | boolean | No       | Apply to existing users (default: false)             |
| scheduledRolloutDate   | string  | No       | ISO 8601 future date for scheduled rollout           |

**Validation Rules:**
- `newCredits`: Must be in increments of 100
- `newCredits`: Minimum 100, maximum 1,000,000
- `reason`: 10-500 characters
- `scheduledRolloutDate`: Must be future date if provided
- If `applyToExistingUsers: false`, `scheduledRolloutDate` is ignored

**Request:**
```http
PATCH /api/admin/tier-config/pro/credits HTTP/1.1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newCredits": 75000,
  "reason": "Increased credits for competitive positioning against market rivals based on Q1 2025 market analysis",
  "applyToExistingUsers": true,
  "scheduledRolloutDate": null
}
```

**Response (200 OK - Immediate Rollout):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "tierName": "pro",
    "monthlyCreditAllocation": 75000,
    "monthlyPriceUsd": 29.99,
    "annualPriceUsd": 299.99,
    "configVersion": 4,
    "isActive": true,
    "createdAt": "2025-01-10T10:00:00.000Z",
    "lastModifiedAt": "2025-01-15T16:45:00.000Z"
  },
  "error": null
}
```

**Response (200 OK - Scheduled Rollout):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "tierName": "pro",
    "monthlyCreditAllocation": 75000,
    "monthlyPriceUsd": 29.99,
    "annualPriceUsd": 299.99,
    "configVersion": 4,
    "isActive": true,
    "createdAt": "2025-01-10T10:00:00.000Z",
    "lastModifiedAt": "2025-01-15T16:45:00.000Z",
    "scheduledRollout": {
      "scheduledDate": "2025-01-20T00:00:00.000Z",
      "status": "pending",
      "affectedUsers": 1250
    }
  },
  "error": null
}
```

**Side Effects:**

1. **Immediate Rollout (`scheduledRolloutDate: null`):**
   - Updates `tier_config` record with new credits and increments `config_version`
   - Creates `tier_config_history` record with `applied_at` timestamp
   - If `applyToExistingUsers: true`, processes credit upgrades immediately via `CreditUpgradeService`
   - For each affected user:
     - Creates `credit_allocation` record with upgrade amount
     - Updates `user_credit_balance` (atomic increment)
     - Updates `subscription_monetization.monthly_credit_allocation`

2. **Scheduled Rollout (`scheduledRolloutDate: <future_date>`):**
   - Updates `tier_config` record with new credits
   - Creates `tier_config_history` record with `scheduled_rollout_date` and `applied_at: null`
   - Background worker (`tier-credit-upgrade.worker.ts`) processes pending upgrades at scheduled time
   - Marks history record `applied_at` when complete

**Error Responses:**

- `400 Bad Request`: Invalid tier name or validation errors
- `404 Not Found`: Tier configuration not found
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `422 Unprocessable Entity`: Business logic validation failed
- `500 Internal Server Error`: Database or server error

**Example Error (422 Unprocessable Entity):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UPGRADE_POLICY_VIOLATION",
    "message": "Credit decreases are not allowed for existing users",
    "details": {
      "currentCredits": 75000,
      "requestedCredits": 50000,
      "policy": "upgrade_only"
    }
  }
}
```

---

### 6. Update Tier Pricing

**Endpoint:** `PATCH /api/admin/tier-config/:tierName/price`

**Description:** Updates tier monthly and annual pricing. Does NOT affect existing subscriptions (grandfathering policy).

**Authentication:** Required (Admin)

**Path Parameters:**

| Parameter | Type   | Required | Description                            |
|-----------|--------|----------|----------------------------------------|
| tierName  | string | Yes      | Tier name: `free`, `pro`, `enterprise` |

**Request Body:**
```json
{
  "newMonthlyPrice": 34.99,
  "newAnnualPrice": 349.99,
  "reason": "Adjusted pricing to reflect improved service tier value proposition and market positioning"
}
```

**Request Fields:**

| Field            | Type   | Required | Description                            |
|------------------|--------|----------|----------------------------------------|
| newMonthlyPrice  | number | Yes      | New monthly price in USD (≥ 0.00)      |
| newAnnualPrice   | number | Yes      | New annual price in USD (≥ 0.00)       |
| reason           | string | Yes      | Change justification (10-500 characters) |

**Validation Rules:**
- `newMonthlyPrice`: Minimum 0.00 (2 decimal places)
- `newAnnualPrice`: Minimum 0.00 (2 decimal places)
- `reason`: 10-500 characters

**Request:**
```http
PATCH /api/admin/tier-config/pro/price HTTP/1.1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "newMonthlyPrice": 34.99,
  "newAnnualPrice": 349.99,
  "reason": "Adjusted pricing to reflect improved service tier value proposition and market positioning"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "tierName": "pro",
    "monthlyCreditAllocation": 75000,
    "monthlyPriceUsd": 34.99,
    "annualPriceUsd": 349.99,
    "configVersion": 5,
    "isActive": true,
    "createdAt": "2025-01-10T10:00:00.000Z",
    "lastModifiedAt": "2025-01-15T17:00:00.000Z"
  },
  "error": null
}
```

**Side Effects:**

1. Updates `tier_config` record with new pricing and increments `config_version`
2. Creates `tier_config_history` record with `applied_at` timestamp
3. **Does NOT affect existing subscriptions** - they maintain their original pricing (grandfathering)
4. New subscriptions created after this change use the new pricing

**Error Responses:**

- `400 Bad Request`: Invalid tier name or validation errors
- `404 Not Found`: Tier configuration not found
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Database or server error

---

## Common Error Codes

| Code                          | HTTP Status | Description                                    |
|-------------------------------|-------------|------------------------------------------------|
| `VALIDATION_ERROR`            | 400         | Request validation failed (Zod schema)         |
| `TIER_NOT_FOUND`              | 404         | Tier configuration not found                   |
| `INVALID_TIER_NAME`           | 400         | Invalid tier name (must be free/pro/enterprise)|
| `UPGRADE_POLICY_VIOLATION`    | 422         | Credit decrease attempted for existing users   |
| `INVALID_SCHEDULE_DATE`       | 400         | Scheduled date must be in the future           |
| `CREDIT_INCREMENT_INVALID`    | 400         | Credits must be in increments of 100           |
| `REASON_TOO_SHORT`            | 400         | Reason must be at least 10 characters          |
| `REASON_TOO_LONG`             | 400         | Reason must be less than 500 characters        |
| `UNAUTHORIZED`                | 401         | Missing or invalid authentication token        |
| `FORBIDDEN`                   | 403         | Insufficient permissions (non-admin user)      |
| `INTERNAL_SERVER_ERROR`       | 500         | Database or server error                       |

---

## Background Worker

**Worker:** `backend/src/workers/tier-credit-upgrade.worker.ts`

**Execution Modes:**

1. **Continuous Mode (Production):**
   ```bash
   npm run worker:tier-upgrade
   ```
   - Runs every 5 minutes (300,000 ms)
   - Processes all pending scheduled upgrades
   - Runs until manually stopped

2. **One-Time Mode (Cron):**
   ```bash
   npm run worker:tier-upgrade:once
   # OR
   TIER_UPGRADE_WORKER_MODE=once npm run worker:tier-upgrade
   ```
   - Runs once and exits (exit code 0)
   - Suitable for cron scheduling
   - Example cron: `*/5 * * * * cd /app && npm run worker:tier-upgrade:once`

**Worker Logic:**

1. Queries `tier_config_history` for pending scheduled upgrades (`applied_at: null` AND `scheduled_rollout_date ≤ now`)
2. For each pending upgrade:
   - Calls `CreditUpgradeService.processTierCreditUpgrade()`
   - Marks history record with `applied_at` timestamp
   - Logs success/failure
3. Returns summary: `{ processedTiers, totalUpgrades, errors }`

---

## Rate Limiting

All endpoints are subject to tier-based rate limiting:

- **Admin Users**: 300 requests/minute
- **Rate Limit Headers**:
  - `X-RateLimit-Limit`: Total requests allowed per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when window resets

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## Audit Trail Schema

All tier configuration changes are recorded in the `tier_config_history` table:

| Column                 | Type      | Description                                      |
|------------------------|-----------|--------------------------------------------------|
| id                     | UUID      | Primary key                                      |
| tier_name              | VARCHAR   | Tier identifier (free/pro/enterprise)            |
| change_type            | ENUM      | credit_increase, credit_decrease, price_change   |
| previous_credits       | INTEGER   | Credits before change (null for price changes)   |
| new_credits            | INTEGER   | Credits after change (null for price changes)    |
| previous_price_usd     | DECIMAL   | Price before change (null for credit changes)    |
| new_price_usd          | DECIMAL   | Price after change (null for credit changes)     |
| change_reason          | TEXT      | Admin-provided justification                     |
| affected_users_count   | INTEGER   | Number of users affected by change               |
| changed_by             | VARCHAR   | Admin user email                                 |
| changed_at             | TIMESTAMP | When configuration change was made               |
| applied_at             | TIMESTAMP | When change was applied (null if pending)        |
| scheduled_rollout_date | TIMESTAMP | Future rollout date (null if immediate)          |

**Immutability:** Records are never updated after creation, except for setting `applied_at` timestamp.

---

## Usage Examples

### Example 1: Increase Credits with Immediate Rollout

**Scenario:** Increase Pro tier credits from 50,000 to 75,000 and immediately upgrade all existing users.

```bash
# Step 1: Preview impact
curl -X POST https://api.rephlo.com/api/admin/tier-config/pro/preview-update \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newCredits": 75000,
    "applyToExistingUsers": true
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "currentCredits": 50000,
#     "newCredits": 75000,
#     "changeType": "increase",
#     "affectedUsers": { "total": 1250, "willUpgrade": 1250, "willRemainSame": 0 },
#     "estimatedCostImpact": 31250.00
#   }
# }

# Step 2: Apply change
curl -X PATCH https://api.rephlo.com/api/admin/tier-config/pro/credits \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newCredits": 75000,
    "reason": "Increased credits for competitive positioning against market rivals based on Q1 2025 market analysis",
    "applyToExistingUsers": true
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "550e8400-e29b-41d4-a716-446655440001",
#     "tierName": "pro",
#     "monthlyCreditAllocation": 75000,
#     "configVersion": 4,
#     ...
#   }
# }
```

### Example 2: Schedule Credit Upgrade for Future Date

**Scenario:** Increase Enterprise tier credits to 250,000 on Jan 20, 2025 at midnight UTC.

```bash
curl -X PATCH https://api.rephlo.com/api/admin/tier-config/enterprise/credits \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newCredits": 250000,
    "reason": "Q1 2025 enterprise tier expansion campaign to attract larger organizations",
    "applyToExistingUsers": true,
    "scheduledRolloutDate": "2025-01-20T00:00:00.000Z"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "tierName": "enterprise",
#     "monthlyCreditAllocation": 250000,
#     "scheduledRollout": {
#       "scheduledDate": "2025-01-20T00:00:00.000Z",
#       "status": "pending",
#       "affectedUsers": 85
#     },
#     ...
#   }
# }
```

**Background Worker Processing:**
```bash
# Worker runs at scheduled time (or via cron)
npm run worker:tier-upgrade:once

# Worker output:
# [2025-01-20T00:00:05.123Z] INFO: Processing pending tier upgrades
# [2025-01-20T00:00:05.456Z] INFO: Found 1 pending upgrade: enterprise tier
# [2025-01-20T00:00:12.789Z] INFO: Upgraded 85 users successfully
# [2025-01-20T00:00:12.800Z] INFO: Marked history record as applied
# [2025-01-20T00:00:12.850Z] INFO: Worker complete: { processedTiers: 1, totalUpgrades: 85, errors: [] }
```

### Example 3: Update Pricing Without Affecting Existing Subscriptions

**Scenario:** Increase Pro tier monthly price to $34.99 (existing users keep $29.99).

```bash
curl -X PATCH https://api.rephlo.com/api/admin/tier-config/pro/price \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newMonthlyPrice": 34.99,
    "newAnnualPrice": 349.99,
    "reason": "Adjusted pricing to reflect improved service tier value proposition and market positioning"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "tierName": "pro",
#     "monthlyPriceUsd": 34.99,
#     "annualPriceUsd": 349.99,
#     "configVersion": 5,
#     ...
#   }
# }
```

---

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token with admin role
2. **RBAC Enforcement**: `requireScopes(['admin'])` middleware validates permissions
3. **Input Validation**: Zod schemas prevent injection attacks
4. **Audit Logging**: All changes tracked with admin email and timestamp
5. **Transaction Atomicity**: Credit upgrades use Serializable isolation level
6. **Idempotency**: Duplicate requests detected via unique constraints
7. **Rate Limiting**: Prevents abuse via Redis-backed rate limiter

---

## Related Documentation

- **Plan 190 Specification**: `docs/plan/190-tier-credit-allocation-management.md`
- **API Standards**: `docs/reference/156-api-standards.md`
- **Database Schema**: `backend/prisma/schema.prisma`
- **CreditUpgradeService**: `backend/src/services/credit-upgrade.service.ts`
- **TierConfigService**: `backend/src/services/tier-config.service.ts`
- **Background Worker**: `backend/src/workers/tier-credit-upgrade.worker.ts`

---

**Last Updated:** 2025-01-15
**Author:** Plan 190 Implementation Team
**Status:** Complete
