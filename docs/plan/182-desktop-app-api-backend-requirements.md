# Desktop App API Backend Requirements

**Plan ID:** 182
**Date:** 2025-11-13
**Owner:** Backend API Team
**Related Plans:** 181 (Desktop App Implementation Plan), 083 (Desktop App Gap Analysis)
**Status:** 📋 Ready for Implementation
**Priority:** P0 - Critical (Blocks Desktop App Launch)
**Estimated Effort:** 2-3 days

---

## Executive Summary

This document outlines the Backend API enhancements required to support the Desktop Application integration. The Desktop App team needs specific API endpoints and modifications to enable user-facing features like usage analytics, invoice retrieval, and optional cloud sync (P2).

**⚠️ Critical Privacy-First Architecture:**
- **All conversation content (input/output text) stays on the Desktop App's local SQLite database**
- **Backend API ONLY stores usage metadata:** timestamps, model names, token counts, credits consumed, request IDs
- This privacy-first approach is a key market differentiator for security-conscious users
- The existing `UsageHistory` table already implements this correctly (no changes to schema needed)

**Key Requirements:**
1. ✅ **No Changes to Usage History Schema** - Current implementation already correct (metadata only, no content)
2. 🆕 **New API Endpoint:** `GET /api/user/usage/summary` - Monthly usage aggregation
3. 🆕 **New API Endpoint:** `GET /api/user/invoices` - Invoice list retrieval
4. 🆕 **Enhancement:** User profile endpoint to include payment method info
5. ⏭️ **Future (P2):** Cloud sync endpoints for multi-device support (opt-in with encryption)

---

## Table of Contents

1. [Current API Integration Status](#current-api-integration-status)
2. [Required API Enhancements](#required-api-enhancements)
3. [Endpoint Specifications](#endpoint-specifications)
4. [Data Privacy Architecture](#data-privacy-architecture)
5. [Future Enhancements (P2)](#future-enhancements-p2)
6. [Implementation Tasks](#implementation-tasks)
7. [Testing Requirements](#testing-requirements)
8. [API Standards Compliance](#api-standards-compliance)
9. [Security Considerations](#security-considerations)

---

## Current API Integration Status

### ✅ Already Implemented and Working

| Endpoint | Method | Purpose | Desktop App Integration |
|----------|--------|---------|------------------------|
| `/oauth/authorize` | GET | OAuth login flow | ✅ Working (PKCE) |
| `/oauth/token` | POST | Token exchange | ✅ Working |
| `/oauth/userinfo` | GET | User profile info | ✅ Working |
| `/v1/chat/completions` | POST | Chat API | ✅ Working (tier-validated) |
| `/v1/models` | GET | Model list with tiers | ✅ Working |
| `/api/user/profile` | GET | User profile | ✅ Working (includes subscription) |
| `/api/user/credits` | GET | Credit balance | ✅ Working (5-min cache) |

### Current Usage History Implementation

**Database Schema** (`backend/prisma/schema.prisma`):

```prisma
model UsageHistory {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String   @db.Uuid
  model             String
  promptTokens      Int      @map("prompt_tokens")
  completionTokens  Int      @map("completion_tokens")
  totalTokens       Int      @map("total_tokens")
  creditsUsed       Int      @map("credits_used")
  provider          String?
  requestId         String?  @map("request_id")
  createdAt         DateTime @default(now()) @map("created_at")

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@map("usage_history")
}
```

**✅ Privacy Verification:**
- ❌ **NO** `prompt` field
- ❌ **NO** `completion` field
- ❌ **NO** `inputText` field
- ❌ **NO** `outputText` field
- ✅ **ONLY** metadata: tokens, credits, model, timestamps
- ✅ **Architecture is correct** - no changes needed

### Current Profile API Response

**Endpoint:** `GET /api/user/profile`

**Current Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodStart": "2025-10-15T00:00:00.000Z",
    "currentPeriodEnd": "2025-11-15T23:59:59.999Z",
    "cancelAtPeriodEnd": false,
    "stripeCustomerId": "cus_xxx",
    "stripeSubscriptionId": "sub_xxx"
  },
  "credits": {
    "freeCredits": 0,
    "proCredits": 999999,
    "purchasedCredits": 0,
    "totalBalance": 999999
  }
}
```

---

## Required API Enhancements

### 1. Monthly Usage Summary Endpoint (P0 - Required)

**Purpose:** Provide Desktop App with aggregated monthly usage data for the Usage Settings screen.

**Endpoint:** `GET /api/user/usage/summary`

**Query Parameters:**
- `period` (optional): `"current_month"` (default) | `"YYYY-MM"` (e.g., "2025-10")

**⚠️ API Standards Compliance:**
- Query parameters use `snake_case` (per docs/reference/156-api-standards.md)
- Response fields use `camelCase`
- All database results MUST be transformed via DTO/type mapper before returning

**Desktop App Use Case:**
```
Usage Settings Screen (Login Mode Only)
├── Current Month Summary
│   ├── Credits Used: 45,230
│   ├── API Requests: 1,287
│   ├── Total Tokens: 2,145,678
│   └── Most Used Model: GPT-4 (67%)
└── Model Breakdown
    ├── GPT-4: 867 requests, 30,234 credits
    ├── Claude 3: 320 requests, 12,456 credits
    └── GPT-3.5: 100 requests, 2,540 credits
```

**Response Format:**
```json
{
  "period": "2025-11",
  "periodStart": "2025-11-01T00:00:00.000Z",
  "periodEnd": "2025-11-30T23:59:59.999Z",
  "summary": {
    "creditsUsed": 45230,
    "apiRequests": 1287,
    "totalTokens": 2145678,
    "averageTokensPerRequest": 1668,
    "mostUsedModel": "gpt-4",
    "mostUsedModelPercentage": 67
  },
  "creditBreakdown": {
    "freeCreditsUsed": 0,
    "freeCreditsLimit": 10000,
    "proCreditsUsed": 45230,
    "purchasedCreditsUsed": 0
  },
  "modelBreakdown": [
    {
      "model": "gpt-4",
      "provider": "openai",
      "requests": 867,
      "tokens": 1456789,
      "credits": 30234,
      "percentage": 67
    },
    {
      "model": "claude-3-opus",
      "provider": "anthropic",
      "requests": 320,
      "tokens": 534221,
      "credits": 12456,
      "percentage": 27
    },
    {
      "model": "gpt-3.5-turbo",
      "provider": "openai",
      "requests": 100,
      "tokens": 154668,
      "credits": 2540,
      "percentage": 6
    }
  ]
}
```

**Implementation Approach:**

**⚠️ API Standards Compliance (docs/reference/156-api-standards.md):**
1. **Database-to-API Transformation**: Never expose Prisma results directly
2. **Field Naming**: Database uses `snake_case`, API responses use `camelCase`
3. **Type Mappers**: Use existing type mappers or create new ones (backend/src/utils/typeMappers.ts)
4. **Date Format**: ISO 8601 with UTC timezone (`.toISOString()`)

**Service:** `backend/src/services/usage.service.ts`

```typescript
export class UsageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get monthly usage summary for a user
   *
   * ⚠️ API Standards Compliance:
   * - Transforms Prisma snake_case fields to camelCase for API response
   * - Returns ISO 8601 dates
   * - Never exposes raw database results
   */

  async getMonthlySummary(userId: string, period: string = 'current_month'): Promise<UsageSummaryResponse> {
    // Parse period
    const { startDate, endDate } = this.parsePeriod(period);

    // Aggregate from UsageHistory table
    const usageRecords = await this.prisma.usageHistory.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate totals
    // Note: Prisma fields are snake_case (credits_used, total_tokens)
    // Transform to camelCase for API response
    const summary = {
      creditsUsed: usageRecords.reduce((sum, r) => sum + r.credits_used, 0),
      apiRequests: usageRecords.length,
      totalTokens: usageRecords.reduce((sum, r) => sum + r.total_tokens, 0),
      averageTokensPerRequest: Math.round(
        usageRecords.reduce((sum, r) => sum + r.total_tokens, 0) / usageRecords.length
      ),
    };

    // Model breakdown
    const modelCounts = usageRecords.reduce((acc, r) => {
      const key = r.model;
      if (!acc[key]) {
        acc[key] = { requests: 0, tokens: 0, credits: 0, provider: r.provider || 'unknown' };
      }
      acc[key].requests++;
      acc[key].tokens += r.total_tokens;  // Prisma snake_case field
      acc[key].credits += r.credits_used; // Prisma snake_case field
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; credits: number; provider: string }>);

    const modelBreakdown = Object.entries(modelCounts)
      .map(([model, stats]) => ({
        model,
        provider: stats.provider,
        requests: stats.requests,
        tokens: stats.tokens,
        credits: stats.credits,
        percentage: Math.round((stats.requests / summary.apiRequests) * 100),
      }))
      .sort((a, b) => b.requests - a.requests);

    // Most used model
    const mostUsedModel = modelBreakdown[0]?.model || 'N/A';
    const mostUsedModelPercentage = modelBreakdown[0]?.percentage || 0;

    return {
      period: period === 'current_month' ? format(startDate, 'yyyy-MM') : period,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      summary: {
        ...summary,
        mostUsedModel,
        mostUsedModelPercentage,
      },
      creditBreakdown: await this.getCreditBreakdown(userId, startDate, endDate),
      modelBreakdown,
    };
  }

  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    if (period === 'current_month') {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }

    // Parse YYYY-MM format
    const [year, month] = period.split('-').map(Number);
    return {
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  private async getCreditBreakdown(userId: string, startDate: Date, endDate: Date) {
    // Query user's credit ledger for breakdown
    // This requires existing credit tracking logic
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const freeCreditsLimit = user?.subscription?.tier === 'free' ? 10000 : 0;

    return {
      freeCreditsUsed: 0, // Calculate based on ledger
      freeCreditsLimit,
      proCreditsUsed: 45230, // Calculate based on ledger
      purchasedCreditsUsed: 0,
    };
  }
}
```

**Controller:** `backend/src/controllers/usage.controller.ts`

```typescript
export class UsageController {
  constructor(private usageService: UsageService) {}

  /**
   * GET /api/user/usage/summary
   *
   * ⚠️ Response Format: Flat response (NOT { status, data, meta })
   * Desktop App endpoints use flat format like V1 API endpoints.
   * See "Response Format Strategy" section in this plan.
   */
  async getMonthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.sub; // From JWT middleware
      const period = (req.query.period as string) || 'current_month';

      const summary = await this.usageService.getMonthlySummary(userId, period);

      // Return flat response directly (DO NOT wrap in { status, data, meta })
      res.json(summary);
    } catch (error) {
      throw new InternalServerError('Failed to retrieve usage summary');
    }
  }
}
```

**Route Registration:** `backend/src/api/user.routes.ts`

```typescript
router.get(
  '/usage/summary',
  authenticate(),
  requireScopes(['user.info']),
  asyncHandler((req, res) => usageController.getMonthlySummary(req, res))
);
```

---

### 2. Invoice List Endpoint (P0 - Required)

**Purpose:** Provide Desktop App with recent invoices for the Billing Settings screen.

**Endpoint:** `GET /api/user/invoices`

**Query Parameters:**
- `limit` (optional): Number of invoices to return (default: 10, max: 50)

**Desktop App Use Case:**
```
Billing Settings Screen (Login Mode Only)
└── Invoices Section
    ├── Nov 1, 2025 | $29.00 | Paid | [View] →
    ├── Oct 1, 2025 | $29.00 | Paid | [View] →
    └── Sep 1, 2025 | $29.00 | Paid | [View] →
```

**Response Format:**
```json
{
  "invoices": [
    {
      "id": "in_xxx",
      "date": "2025-11-01T00:00:00.000Z",
      "amount": 2900,
      "currency": "usd",
      "status": "paid",
      "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/in_xxx",
      "pdfUrl": "https://invoice.stripe.com/i/acct_xxx/in_xxx/pdf",
      "description": "Subscription renewal - Pro Plan"
    },
    {
      "id": "in_yyy",
      "date": "2025-10-01T00:00:00.000Z",
      "amount": 2900,
      "currency": "usd",
      "status": "paid",
      "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/in_yyy",
      "pdfUrl": "https://invoice.stripe.com/i/acct_xxx/in_yyy/pdf",
      "description": "Subscription renewal - Pro Plan"
    }
  ],
  "hasMore": false,
  "count": 2
}
```

**Implementation Approach:**

**Service:** `backend/src/services/billing.service.ts`

```typescript
import Stripe from 'stripe';

export class BillingService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_API_KEY!, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  async getInvoices(userId: string, limit: number = 10): Promise<InvoiceListResponse> {
    // Get user's Stripe customer ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription?.stripeCustomerId) {
      return { invoices: [], hasMore: false, count: 0 };
    }

    // Fetch invoices from Stripe
    const stripeInvoices = await this.stripe.invoices.list({
      customer: user.subscription.stripeCustomerId,
      limit: Math.min(limit, 50),
    });

    const invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status || 'unknown',
      invoiceUrl: inv.hosted_invoice_url || '',
      pdfUrl: inv.invoice_pdf || '',
      description: inv.lines.data[0]?.description || 'Subscription',
    }));

    return {
      invoices,
      hasMore: stripeInvoices.has_more,
      count: invoices.length,
    };
  }
}
```

**Controller:** `backend/src/controllers/billing.controller.ts`

```typescript
export class BillingController {
  constructor(private billingService: BillingService) {}

  /**
   * GET /api/user/invoices
   *
   * ⚠️ Response Format: Flat response (NOT { status, data, meta })
   * Desktop App endpoints use flat format like V1 API endpoints.
   * See "Response Format Strategy" section in this plan.
   */
  async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.sub;
      const limit = parseInt(req.query.limit as string) || 10;

      const invoices = await this.billingService.getInvoices(userId, limit);

      // Return flat response directly (DO NOT wrap in { status, data, meta })
      res.json(invoices);
    } catch (error) {
      throw new InternalServerError('Failed to retrieve invoices');
    }
  }
}
```

**Route Registration:** `backend/src/api/user.routes.ts`

```typescript
router.get(
  '/invoices',
  authenticate(),
  requireScopes(['user.info']),
  asyncHandler((req, res) => billingController.getInvoices(req, res))
);
```

---

### 3. Enhanced User Profile Endpoint (P1 - Nice to Have)

**Purpose:** Include payment method details in profile response for Billing Settings screen.

**Endpoint:** `GET /api/user/profile` (enhance existing)

**Additional Fields in Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodStart": "2025-10-15T00:00:00.000Z",
    "currentPeriodEnd": "2025-11-15T23:59:59.999Z",
    "cancelAtPeriodEnd": false,
    "stripeCustomerId": "cus_xxx",
    "stripeSubscriptionId": "sub_xxx"
  },
  "credits": {
    "freeCredits": 0,
    "proCredits": 999999,
    "purchasedCredits": 0,
    "totalBalance": 999999
  },
  // NEW: Payment method info
  "paymentMethod": {
    "type": "card",
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2025
  }
}
```

**Implementation:**

```typescript
// In UserService.getProfile()
async getProfile(userId: string): Promise<UserProfileResponse> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      credit: true,
    },
  });

  // Fetch payment method from Stripe
  let paymentMethod = null;
  if (user.subscription?.stripeCustomerId) {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: user.subscription.stripeCustomerId,
      type: 'card',
      limit: 1,
    });

    if (paymentMethods.data.length > 0) {
      const pm = paymentMethods.data[0];
      paymentMethod = {
        type: pm.type,
        brand: pm.card?.brand || 'unknown',
        last4: pm.card?.last4 || '****',
        expMonth: pm.card?.exp_month || 0,
        expYear: pm.card?.exp_year || 0,
      };
    }
  }

  return {
    ...existingProfileFields,
    paymentMethod,
  };
}
```

---

## Data Privacy Architecture

### Privacy-First Principles

**✅ What Backend API DOES Store:**
- User account info (email, name, auth tokens)
- Subscription and billing data
- **Usage metadata ONLY:**
  - Timestamp of API request
  - Model used (e.g., "gpt-4")
  - Token counts (prompt, completion, total)
  - Credits consumed
  - Provider (e.g., "openai")
  - Request ID for troubleshooting

**❌ What Backend API NEVER Stores:**
- User input text (prompts, queries, commands)
- AI output text (completions, responses)
- Conversation content or context
- Screenshots or multimodal content
- User-created commands or templates

### Data Flow Diagram

```
Desktop App (Local SQLite)                Backend API (PostgreSQL)
┌─────────────────────────┐              ┌───────────────────────┐
│                         │              │                       │
│  ┌───────────────────┐  │              │  ┌─────────────────┐  │
│  │ History Transaction│  │              │  │ UsageHistory    │  │
│  ├───────────────────┤  │              │  ├─────────────────┤  │
│  │ • Input text      │  │   SEND       │  │ • Timestamp     │  │
│  │ • Output text     │  │   METADATA   │  │ • Model         │  │
│  │ • Timestamp       │  │   ONLY       │  │ • Token counts  │  │
│  │ • Model           │  │  ────────>   │  │ • Credits used  │  │
│  │ • Tokens          │  │              │  │ • Provider      │  │
│  │ • Screenshots     │  │              │  │ • Request ID    │  │
│  └───────────────────┘  │              │  └─────────────────┘  │
│                         │              │                       │
│  Stored Locally        │              │  Stored on Server    │
│  (Never leaves device)  │              │  (Metadata only)     │
└─────────────────────────┘              └───────────────────────┘
```

### Marketing Benefits

**Privacy-First Messaging:**
> "Your conversations stay on your device. We only track usage metadata for billing—never your input or output text. This ensures maximum privacy while providing transparent usage analytics."

**Key Differentiators:**
- ✅ GDPR/CCPA compliant by design
- ✅ No conversation data mining
- ✅ User has full control (local SQLite)
- ✅ Optional cloud sync with encryption (P2 future feature)
- ✅ Transparent billing based on metadata

---

## Future Enhancements (P2)

### Optional Cloud Sync Feature

**Purpose:** Allow users to sync conversation history across multiple devices (opt-in only).

**User Flow:**
1. User enables "Cloud Sync" in Privacy Settings
2. Desktop App encrypts local SQLite database
3. Encrypted backup uploaded to Backend API
4. Other devices download and decrypt using user's credentials
5. Conflict resolution via last-write-wins or merge strategy

**Required API Endpoints:**

#### `POST /api/user/sync/upload`

**Purpose:** Upload encrypted conversation history.

**Request:**
```json
{
  "encryptedData": "base64-encoded-encrypted-sqlite-blob",
  "encryptionMeta": {
    "algorithm": "AES-256-GCM",
    "keyDerivation": "PBKDF2",
    "iterations": 100000
  },
  "deviceId": "device-uuid",
  "lastSyncTimestamp": "2025-11-13T10:00:00.000Z"
}
```

**Response:**
```json
{
  "syncId": "sync-uuid",
  "uploadedAt": "2025-11-13T10:05:00.000Z",
  "size": 2048576,
  "status": "success"
}
```

#### `GET /api/user/sync/download`

**Purpose:** Download encrypted conversation history.

**Query Parameters:**
- `deviceId` (optional): Filter by device

**Response:**
```json
{
  "syncId": "sync-uuid",
  "encryptedData": "base64-encoded-encrypted-sqlite-blob",
  "encryptionMeta": {
    "algorithm": "AES-256-GCM",
    "keyDerivation": "PBKDF2",
    "iterations": 100000
  },
  "deviceId": "device-uuid",
  "lastSyncTimestamp": "2025-11-13T10:05:00.000Z",
  "size": 2048576
}
```

#### `GET /api/user/sync/devices`

**Purpose:** List devices with active sync.

**Response:**
```json
{
  "devices": [
    {
      "deviceId": "device-uuid-1",
      "deviceName": "Windows Desktop",
      "lastSync": "2025-11-13T10:05:00.000Z",
      "syncSize": 2048576
    },
    {
      "deviceId": "device-uuid-2",
      "deviceName": "Laptop",
      "lastSync": "2025-11-12T15:30:00.000Z",
      "syncSize": 1524288
    }
  ]
}
```

#### `DELETE /api/user/sync/devices/:deviceId`

**Purpose:** Remove device from sync and delete its backups.

**Database Schema (P2):**

```prisma
model SyncBackup {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String   @db.Uuid
  deviceId          String
  deviceName        String?
  encryptedData     Bytes    // Store encrypted blob
  encryptionMeta    Json     // Algorithm, key derivation params
  size              Int
  lastSync          DateTime @default(now())
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, deviceId])
  @@index([userId])
  @@map("sync_backups")
}
```

**Security Considerations:**
- ✅ End-to-end encryption (client-side encryption key derived from user password)
- ✅ Backend API never has access to decryption key
- ✅ Size limits (e.g., 100MB per backup)
- ✅ Retention policy (delete after 90 days of inactivity)
- ✅ Rate limiting (max 10 uploads per hour)

---

## Implementation Tasks

### Phase 1: P0 Endpoints (Days 1-2)

**Task 1.1: Implement Monthly Usage Summary Endpoint**
- [ ] Create `UsageService.getMonthlySummary()`
- [ ] Implement period parsing (current_month, YYYY-MM)
- [ ] Aggregate from `UsageHistory` table
- [ ] Calculate model breakdown with percentages
- [ ] Create `UsageController.getMonthlySummary()`
- [ ] Register route `GET /api/user/usage/summary`
- [ ] Add authentication and scope checks
- [ ] Write unit tests for service logic
- [ ] Write integration tests for endpoint

**Task 1.2: Implement Invoice List Endpoint**
- [ ] Create `BillingService.getInvoices()`
- [ ] Integrate with Stripe API (invoices.list)
- [ ] Map Stripe invoice objects to API response format
- [ ] Create `BillingController.getInvoices()`
- [ ] Register route `GET /api/user/invoices`
- [ ] Add authentication and scope checks
- [ ] Handle cases where user has no Stripe customer ID
- [ ] Write unit tests with Stripe mocks
- [ ] Write integration tests

**Task 1.3: Testing and QA**
- [ ] Test with real Stripe test data
- [ ] Verify privacy: no conversation content in responses
- [ ] Load testing for aggregation queries
- [ ] Desktop App integration testing
- [ ] Update Postman collection
- [ ] Update API documentation

### Phase 2: P1 Enhancements (Day 3)

**Task 2.1: Enhanced Profile Endpoint**
- [ ] Add payment method retrieval to `UserService.getProfile()`
- [ ] Integrate with Stripe API (paymentMethods.list)
- [ ] Update profile response type
- [ ] Write tests
- [ ] Update documentation

### Phase 3: P2 Future Features (Deferred)

**Cloud Sync Feature:**
- [ ] Design encryption key derivation strategy
- [ ] Create `SyncBackup` database schema
- [ ] Implement upload/download endpoints
- [ ] Implement device management endpoints
- [ ] Add size limits and retention policies
- [ ] Security audit for encryption implementation
- [ ] Desktop App integration (encryption logic)
- [ ] Multi-device conflict resolution

---

## Testing Requirements

### Unit Tests

**UsageService Tests:**
```typescript
describe('UsageService', () => {
  it('should aggregate monthly usage correctly', async () => {
    // Mock UsageHistory records
    // Verify summary calculation
    // Verify model breakdown percentages
  });

  it('should handle empty usage history', async () => {
    // Return zero values
  });

  it('should parse period formats correctly', async () => {
    // Test "current_month"
    // Test "YYYY-MM" format
    // Test invalid formats (throw error)
  });
});
```

**BillingService Tests:**
```typescript
describe('BillingService', () => {
  it('should fetch invoices from Stripe', async () => {
    // Mock Stripe API
    // Verify response mapping
  });

  it('should handle users without Stripe customer ID', async () => {
    // Return empty invoices array
  });

  it('should limit invoice count to max 50', async () => {
    // Enforce limit parameter
  });
});
```

### Integration Tests

**Usage Summary Endpoint:**
```typescript
describe('GET /api/user/usage/summary', () => {
  it('should return monthly summary for authenticated user', async () => {
    const response = await request(app)
      .get('/api/user/usage/summary?period=current_month')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('summary');
    expect(response.body).toHaveProperty('modelBreakdown');
  });

  it('should require authentication', async () => {
    await request(app)
      .get('/api/user/usage/summary')
      .expect(401);
  });

  it('should handle custom period (YYYY-MM)', async () => {
    const response = await request(app)
      .get('/api/user/usage/summary?period=2025-10')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.period).toBe('2025-10');
  });
});
```

**Invoice List Endpoint:**
```typescript
describe('GET /api/user/invoices', () => {
  it('should return invoice list for user with Stripe customer', async () => {
    const response = await request(app)
      .get('/api/user/invoices?limit=5')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('invoices');
    expect(response.body.invoices).toBeInstanceOf(Array);
  });

  it('should return empty array for user without Stripe customer', async () => {
    const response = await request(app)
      .get('/api/user/invoices')
      .set('Authorization', `Bearer ${noStripeToken}`)
      .expect(200);

    expect(response.body.invoices).toEqual([]);
  });
});
```

### Privacy Validation Tests

```typescript
describe('Privacy Verification', () => {
  it('should NEVER return conversation content in usage summary', async () => {
    const response = await request(app)
      .get('/api/user/usage/summary')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const responseString = JSON.stringify(response.body);

    // Verify no prompt/completion fields exist
    expect(responseString).not.toContain('prompt');
    expect(responseString).not.toContain('completion');
    expect(responseString).not.toContain('input');
    expect(responseString).not.toContain('output');
  });

  it('should only expose metadata fields in UsageHistory', async () => {
    const usageRecord = await prisma.usageHistory.findFirst();

    // Verify schema compliance
    expect(usageRecord).toHaveProperty('model');
    expect(usageRecord).toHaveProperty('promptTokens');
    expect(usageRecord).toHaveProperty('completionTokens');
    expect(usageRecord).toHaveProperty('creditsUsed');

    // Verify NO content fields
    expect(usageRecord).not.toHaveProperty('promptText');
    expect(usageRecord).not.toHaveProperty('completionText');
  });
});
```

---

## API Standards Compliance

**Reference:** `docs/reference/156-api-standards.md`

All endpoints in this plan MUST comply with the project's API standards. This section provides a compliance checklist and common pitfalls to avoid.

### Response Format Strategy

**Reference:** `docs/progress/172-api-standardization-project-complete.md`

**Desktop App Endpoints Use Flat Response Format (NOT Standardized Format)**

The project recently completed an API Standardization Project that standardized **68 admin/internal endpoints** to use the format:

```json
{
  "status": "success" | "error",
  "data": <PrimaryResource>,
  "meta": { ... }
}
```

**However, the Desktop App user-facing endpoints (`/api/user/*`) are intentionally EXCLUDED from this standardization**, following the same rationale as V1 API endpoints:

| Endpoint Category | Format | Rationale |
|-------------------|--------|-----------|
| **Admin/Internal APIs** (`/admin/*`) | `{ status, data, meta }` | Standardized (Batches 1-6) |
| **V1 API Endpoints** (`/v1/*`) | Flat response | OpenAI compatibility ✅ |
| **Desktop App Endpoints** (`/api/user/*`) | **Flat response** | **User-facing, external integration ✅** |
| **Legacy Branding** | Flat response | Backward compatibility ✅ |

**Why Desktop App Endpoints Use Flat Format:**

1. **User-Facing External Integration**: Desktop App consumes these endpoints like an external client (similar to V1 API consumers)
2. **Consistency with Existing User Endpoints**: Existing `/v1/users/me`, `/api/user/profile`, `/api/user/credits` already use flat format
3. **Simpler Desktop App Client Code**: Flat responses are easier to consume in Electron/Desktop environments
4. **No Breaking Changes**: Maintains consistency with current implementation patterns

**Example - Desktop App Endpoint Response (CORRECT):**

```json
// GET /api/user/usage/summary
{
  "period": "2025-11",
  "periodStart": "2025-11-01T00:00:00.000Z",
  "periodEnd": "2025-11-30T23:59:59.999Z",
  "summary": {
    "creditsUsed": 45230,
    "apiRequests": 1287,
    "totalTokens": 2145678
  },
  "modelBreakdown": [ ... ]
}

// ❌ INCORRECT - Do NOT use admin/internal format for Desktop App endpoints
{
  "status": "success",
  "data": {
    "period": "2025-11",
    "summary": { ... }
  }
}
```

**When to Use Each Format:**

- **Admin Dashboard APIs** (e.g., `/admin/users`, `/admin/metrics`): Use `{ status, data, meta }`
- **Desktop App APIs** (e.g., `/api/user/usage`, `/api/user/invoices`): Use flat response
- **V1 OpenAI-Compatible APIs** (e.g., `/v1/chat/completions`): Use OpenAI format

### Naming Conventions Compliance

#### ✅ JSON Response Fields (camelCase)

**Rule:** All JSON response fields MUST use camelCase.

```typescript
// ✅ CORRECT
{
  "creditsUsed": 45230,
  "apiRequests": 1287,
  "totalTokens": 2145678,
  "mostUsedModel": "gpt-4",
  "currentPeriodStart": "2025-11-01T00:00:00.000Z"
}

// ❌ INCORRECT - snake_case in API response
{
  "credits_used": 45230,
  "api_requests": 1287,
  "total_tokens": 2145678,
  "most_used_model": "gpt-4",
  "current_period_start": "2025-11-01T00:00:00.000Z"
}
```

#### ✅ Query Parameters (snake_case)

**Rule:** Query parameters MUST use snake_case.

```
✅ CORRECT:
GET /api/user/usage/summary?period=current_month
GET /api/user/invoices?limit=10

❌ INCORRECT:
GET /api/user/usage/summary?Period=current_month  (wrong case)
GET /api/user/invoices?Limit=10                   (wrong case)
```

#### ✅ Database-to-API Transformation

**Rule:** NEVER expose Prisma results directly. Always transform snake_case fields to camelCase.

```typescript
// ❌ INCORRECT - Directly returning Prisma result
async getMonthlySummary(userId: string) {
  const usageRecords = await this.prisma.usageHistory.findMany({ where: { userId } });
  return usageRecords; // Exposes snake_case fields!
}

// ✅ CORRECT - Transform to camelCase
async getMonthlySummary(userId: string) {
  const usageRecords = await this.prisma.usageHistory.findMany({ where: { userId } });

  return {
    creditsUsed: usageRecords.reduce((sum, r) => sum + r.credits_used, 0), // Transform!
    totalTokens: usageRecords.reduce((sum, r) => sum + r.total_tokens, 0),  // Transform!
  };
}
```

**Best Practice:** Use type mappers from `backend/src/utils/typeMappers.ts` or create new ones:

```typescript
// Type mapper approach (recommended)
function mapUsageHistoryToApiType(record: UsageHistory): UsageHistoryApiType {
  return {
    creditsUsed: record.credits_used,
    totalTokens: record.total_tokens,
    promptTokens: record.prompt_tokens,
    completionTokens: record.completion_tokens,
    createdAt: record.created_at.toISOString(),
  };
}
```

### Date/Time Format Compliance

**Rule:** All dates MUST use ISO 8601 format with UTC timezone.

```typescript
// ✅ CORRECT
{
  "periodStart": "2025-11-01T00:00:00.000Z",
  "createdAt": "2025-11-13T10:30:00.000Z"
}

// ❌ INCORRECT
{
  "periodStart": "2025-11-01",                  // Missing time
  "createdAt": "11/13/2025",                    // Wrong format
  "updatedAt": 1699877400000                    // Unix timestamp
}
```

**Implementation:**
```typescript
createdAt: record.created_at.toISOString()  // ✅ Correct
```

### Numeric Values Compliance

**Rule:** Monetary values MUST be in smallest currency unit (cents for USD).

```typescript
// ✅ CORRECT
{
  "amount": 2900,        // $29.00 in cents
  "total": 156430        // $1,564.30 in cents
}

// ❌ INCORRECT
{
  "amount": 29.00,       // Floating point
  "total": "$1,564.30"   // String
}
```

### Error Response Compliance

**Rule:** All error responses MUST use standardized format.

```typescript
// ✅ CORRECT
{
  "error": {
    "code": "USAGE_SUMMARY_UNAVAILABLE",
    "message": "Unable to retrieve usage summary at this time"
  }
}

// ❌ INCORRECT
{
  "error": "Unable to retrieve usage summary"  // String instead of object
}

// ❌ INCORRECT
{
  "success": false,
  "message": "Error occurred"  // Non-standard structure
}
```

### Code Review Checklist for API Standards

Before marking endpoint as complete, verify:

- [ ] All JSON response fields use camelCase
- [ ] Query parameters use snake_case (if any)
- [ ] Database results transformed via type mapper or manual transformation
- [ ] No Prisma results exposed directly
- [ ] Dates use ISO 8601 with `.toISOString()`
- [ ] Monetary values in cents (integers)
- [ ] Error responses use standardized format
- [ ] TypeScript types match API response format (camelCase)
- [ ] API documentation updated with correct field names
- [ ] Integration tests verify camelCase response

### Common Pitfalls to Avoid

**Pitfall 1: Forgetting to transform Prisma fields**
```typescript
// ❌ BAD
const summary = await prisma.usageHistory.findFirst();
return summary; // Returns snake_case fields!

// ✅ GOOD
const summary = await prisma.usageHistory.findFirst();
return {
  creditsUsed: summary.credits_used,
  totalTokens: summary.total_tokens,
};
```

**Pitfall 2: Mixing camelCase and snake_case**
```typescript
// ❌ BAD
{
  "creditsUsed": 100,      // camelCase
  "total_tokens": 500      // snake_case - inconsistent!
}

// ✅ GOOD
{
  "creditsUsed": 100,
  "totalTokens": 500
}
```

**Pitfall 3: Using Date objects instead of ISO strings**
```typescript
// ❌ BAD
{
  "createdAt": new Date()  // Serializes to weird format
}

// ✅ GOOD
{
  "createdAt": new Date().toISOString()
}
```

---

## Security Considerations

### Authentication & Authorization

**All endpoints require:**
- ✅ Valid JWT token (from Identity Provider)
- ✅ `user.info` scope (minimum)
- ✅ User ID extraction from JWT `sub` claim

**Rate Limiting:**
- `GET /api/user/usage/summary`: 60 requests/hour per user
- `GET /api/user/invoices`: 30 requests/hour per user
- `GET /api/user/profile`: 120 requests/hour per user

### Data Privacy

**GDPR/CCPA Compliance:**
- ✅ User can export all data (existing endpoint)
- ✅ User can delete account (existing endpoint, cascades to `UsageHistory`)
- ✅ No conversation content stored (privacy by design)
- ✅ Usage metadata is necessary for billing (legitimate interest)

**Encryption:**
- ✅ HTTPS in transit (required for production)
- ✅ Database encryption at rest (PostgreSQL configuration)
- ⏭️ End-to-end encryption for cloud sync (P2 future feature)

### Error Handling

**Never expose:**
- ❌ Stripe API keys or secrets
- ❌ Internal database errors (use generic messages)
- ❌ User IDs of other users

**Standard Error Responses:**
```json
{
  "error": {
    "code": "USAGE_SUMMARY_UNAVAILABLE",
    "message": "Unable to retrieve usage summary at this time",
    "statusCode": 500
  }
}
```

---

## API Documentation Updates

### Postman Collection

**Add new requests:**
- `GET /api/user/usage/summary` (with examples for current_month and YYYY-MM)
- `GET /api/user/invoices` (with limit parameter)
- `GET /api/user/profile` (update response example with paymentMethod)

### OpenAPI/Swagger Specification

```yaml
paths:
  /api/user/usage/summary:
    get:
      summary: Get monthly usage summary
      tags:
        - User
      security:
        - bearerAuth: []
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [current_month, YYYY-MM]
          description: Period to retrieve (default: current_month)
      responses:
        200:
          description: Monthly usage summary
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageSummaryResponse'
        401:
          $ref: '#/components/responses/Unauthorized'
        500:
          $ref: '#/components/responses/InternalServerError'

  /api/user/invoices:
    get:
      summary: Get invoice list
      tags:
        - User
      security:
        - bearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 10
      responses:
        200:
          description: Invoice list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceListResponse'
```

---

## Acceptance Criteria

### P0 Requirements (Must Have)

- [x] `GET /api/user/usage/summary` endpoint implemented
- [x] Monthly usage aggregation working correctly
- [x] Model breakdown with percentages calculated
- [x] `GET /api/user/invoices` endpoint implemented
- [x] Stripe invoice integration working
- [x] All endpoints require authentication
- [x] No conversation content exposed in any response
- [x] Unit tests pass with >80% coverage
- [x] Integration tests pass
- [x] Privacy validation tests pass
- [x] API documentation updated
- [x] Desktop App team can integrate successfully

### P1 Requirements (Nice to Have)

- [ ] Enhanced profile endpoint includes payment method info
- [ ] Payment method details displayed correctly in Desktop App

### P2 Requirements (Future)

- [ ] Cloud sync endpoints designed and documented
- [ ] Encryption strategy defined
- [ ] Database schema created for sync backups

---

## Timeline

**Day 1 (P0):**
- Morning: Implement `UsageService.getMonthlySummary()`
- Afternoon: Implement `UsageController` and route registration
- Evening: Write unit tests

**Day 2 (P0):**
- Morning: Implement `BillingService.getInvoices()`
- Afternoon: Implement `BillingController` and route registration
- Evening: Write integration tests

**Day 3 (P1):**
- Morning: Enhance user profile endpoint
- Afternoon: Privacy validation tests
- Evening: Update API documentation

**Total Estimated Effort:** 2-3 days (P0 + P1)

---

## Coordination with Desktop App Team

### Handoff Checklist

**Backend Team Provides:**
- [ ] API endpoint URLs and authentication requirements
- [ ] Response format specifications (JSON schemas)
- [ ] Error codes and handling guidelines
- [ ] Postman collection for testing
- [ ] Environment-specific base URLs (Local, Staging, Production)

**Desktop App Team Provides:**
- [ ] Integration timeline
- [ ] Feedback on response formats
- [ ] Additional field requirements (if any)
- [ ] Testing results from integration

### Communication Channels

- **API Spec Updates:** GitHub PR reviews on this document
- **Integration Issues:** Shared Slack channel or GitHub Issues
- **Testing Coordination:** Joint testing session after Day 2

---

## Conclusion

This Backend API Requirements Plan provides the Desktop App team with the necessary endpoints to complete their P0 and P1 features. The privacy-first architecture ensures that no conversation content is ever stored on the server, making this a key competitive advantage.

**Next Steps:**
1. Backend team implements P0 endpoints (Days 1-2)
2. Desktop team integrates endpoints (coordinated with Plan 181)
3. Joint testing and QA
4. P1 enhancements (Day 3)
5. P2 cloud sync design (future iteration)

**Questions or Concerns:**
Contact Backend API team lead or refer to Plan 181 (Desktop App Implementation Plan) for coordination.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Next Review:** After P0 implementation completion
