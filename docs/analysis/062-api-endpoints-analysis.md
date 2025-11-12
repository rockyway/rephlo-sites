# API Endpoints Analysis Report (Simple Format)

**Generated:** 2025-11-12T22:42:53.924Z
**Format:** Simple
**Include Tests:** No

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 20

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/analytics/dashboard-kpis` | `backend\src\routes\admin.routes.ts L:145` | `adminAnalyticsController.getDashboardKPIs` | - | `400: invalid_parameter`<br>`500: internal_error` | `auditLog` | frontend\src\api\admin.ts L:205 |
| GET | `/analytics/recent-activity` | `backend\src\routes\admin.routes.ts L:165` | `adminAnalyticsController.getRecentActivity` | - | `400: invalid_parameter`<br>`500: internal_error` | `auditLog` | frontend\src\api\admin.ts L:220 |
| GET | `/audit-logs` | `backend\src\routes\admin.routes.ts L:278` | `auditLogController.getAuditLogs` | `{ status: "success", data: T, meta: PaginationMeta }` | `500: internal_server_error` | `-` | frontend\src\api\admin.ts L:163<br>backend\src\routes\admin.routes.ts L:202 |
| GET | `/audit-logs/admin/:adminUserId` | `backend\src\routes\admin.routes.ts L:309` | `auditLogController.getLogsForAdmin` | `AdminAuditLog[]` | `500: internal_server_error` | `-` | - |
| GET | `/audit-logs/resource/:resourceType/:resourceId` | `backend\src\routes\admin.routes.ts L:294` | `auditLogController.getLogsForResource` | `AdminAuditLog[]` | `500: internal_server_error` | `-` | - |
| GET | `/metrics` | `backend\src\routes\admin.routes.ts L:63` | `adminController.getMetrics` | `{ status: "success", data: T }` | `403: forbidden`<br>`500: error_response` | `-` | frontend\src\services\api.ts L:260<br>backend\coverage\lcov-report\src\routes\index.ts.html L:610<br>backend\coverage\src\routes\index.ts.html L:610<br>backend\src\routes\index.ts L:108 |
| PATCH | `/models/:modelId/tier` | `backend\src\routes\admin.routes.ts L:219` | `modelTierAdminController.updateModelTier` | - | - | `-` | frontend\src\api\admin.ts L:108<br>frontend\src\api\admin.ts L:123 |
| GET | `/models/providers` | `backend\src\routes\admin.routes.ts L:256` | `modelTierAdminController.getProviders` | - | - | `-` | frontend\src\api\admin.ts L:188 |
| GET | `/models/tiers` | `backend\src\routes\admin.routes.ts L:184` | `modelTierAdminController.listModelsWithTiers` | - | - | `-` | frontend\src\api\admin.ts L:96<br>frontend\src\api\admin.ts L:142<br>frontend\src\api\admin.ts L:163<br>frontend\src\api\admin.ts L:179 |
| GET | `/models/tiers/audit-logs` | `backend\src\routes\admin.routes.ts L:201` | `modelTierAdminController.getAuditLogs` | - | - | `-` | frontend\src\api\admin.ts L:163 |
| POST | `/models/tiers/bulk` | `backend\src\routes\admin.routes.ts L:232` | `modelTierAdminController.bulkUpdateModelTiers` | - | - | `-` | frontend\src\api\admin.ts L:142 |
| POST | `/models/tiers/revert/:auditLogId` | `backend\src\routes\admin.routes.ts L:244` | `modelTierAdminController.revertTierChange` | - | - | `-` | frontend\src\api\admin.ts L:179 |
| GET | `/subscriptions` | `backend\src\routes\admin.routes.ts L:98` | `adminController.getSubscriptionOverview` | `{ status: "success", data: T }` | `500: internal_error` | `-` | frontend\src\api\admin.ts L:251<br>frontend\src\api\plan109.ts L:68<br>frontend\src\api\plan109.ts L:79<br>frontend\src\api\plan109.ts L:89<br>frontend\src\api\plan109.ts L:99<br>frontend\src\api\plan109.ts L:110<br>frontend\src\api\plan109.ts L:121<br>frontend\src\api\plan109.ts L:132<br>frontend\src\api\plan109.ts L:142<br>frontend\src\api\plan110.ts L:264<br>frontend\src\api\plan110.ts L:274<br>frontend\src\api\plan110.ts L:285<br>frontend\src\api\plan110.ts L:296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\coverage\lcov-report\src\routes\index.ts.html L:600<br>backend\coverage\lcov-report\src\routes\index.ts.html L:612<br>backend\coverage\src\routes\index.ts.html L:600<br>backend\coverage\src\routes\index.ts.html L:612<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:93<br>backend\src\routes\index.ts L:104<br>backend\src\routes\index.ts L:110 |
| GET | `/usage` | `backend\src\routes\admin.routes.ts L:113` | `adminController.getSystemUsage` | `{ status: "success", data: T }` | `400: invalid_date`<br>`400: invalid_range`<br>`500: internal_error` | `-` | frontend\src\api\plan109.ts L:389<br>backend\coverage\lcov-report\src\routes\index.ts.html L:602<br>backend\coverage\lcov-report\src\routes\index.ts.html L:613<br>backend\coverage\src\routes\index.ts.html L:602<br>backend\coverage\src\routes\index.ts.html L:613<br>backend\src\routes\index.ts L:95<br>backend\src\routes\index.ts L:111<br>backend\src\routes\plan109.routes.ts L:463 |
| GET | `/users` | `backend\src\routes\admin.routes.ts L:75` | `adminController.listUsers` | `{ status: "success", data: T, meta: PaginationMeta }` | `500: internal_error` | `-` | frontend\src\api\admin.ts L:236<br>frontend\src\api\admin.ts L:251<br>frontend\src\api\admin.ts L:267<br>frontend\src\api\admin.ts L:283<br>frontend\src\api\admin.ts L:299<br>frontend\src\api\admin.ts L:315<br>frontend\src\api\admin.ts L:331<br>frontend\src\api\plan109.ts L:158<br>frontend\src\api\plan109.ts L:169<br>frontend\src\api\plan109.ts L:180<br>frontend\src\api\plan109.ts L:190<br>frontend\src\api\plan109.ts L:201<br>frontend\src\api\plan109.ts L:212<br>frontend\src\api\plan109.ts L:222<br>frontend\src\api\plan109.ts L:233<br>frontend\src\api\plan109.ts L:243<br>frontend\src\api\plan109.ts L:254<br>frontend\src\api\plan109.ts L:479<br>frontend\src\api\plan109.ts L:489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:53<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:76<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:103<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:112<br>backend\coverage\lcov-report\src\routes\index.ts.html L:603<br>backend\coverage\lcov-report\src\routes\index.ts.html L:611<br>backend\coverage\src\routes\index.ts.html L:603<br>backend\coverage\src\routes\index.ts.html L:611<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:22<br>backend\src\middleware\permission.middleware.ts L:28<br>backend\src\middleware\permission.middleware.ts L:55<br>backend\src\middleware\permission.middleware.ts L:275<br>backend\src\routes\index.ts L:96<br>backend\src\routes\index.ts L:109<br>backend\src\routes\plan109.routes.ts L:512<br>backend\src\routes\plan109.routes.ts L:521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id/licenses` | `backend\src\routes\admin.routes.ts L:377` | `adminUserDetailController.getUserLicenses` | - | `400: invalid_parameter`<br>`500: internal_error` | `auditLog` | frontend\src\api\admin.ts L:267 |
| GET | `/users/:id/overview` | `backend\src\routes\admin.routes.ts L:332` | `adminUserDetailController.getUserOverview` | - | `400: invalid_parameter`<br>`404: not_found`<br>`500: internal_error` | `auditLog` | frontend\src\api\admin.ts L:236 |
| GET | `/users/:id/subscriptions` | `backend\src\routes\admin.routes.ts L:354` | `adminUserDetailController.getUserSubscriptions` | - | `400: invalid_parameter`<br>`500: internal_error` | `auditLog` | frontend\src\api\admin.ts L:251 |
| POST | `/users/:id/suspend` | `backend\src\routes\admin.routes.ts L:87` | `adminController.suspendUser` | `{ status: "success", data: T }` | `404: not_found`<br>`500: internal_error` | `-` | frontend\src\api\plan109.ts L:201 |
| POST | `/webhooks/test` | `backend\src\routes\admin.routes.ts L:123` | `adminController.testWebhook` | `{ status: "success", data: T }` | `400: invalid_input`<br>`400: invalid_url`<br>`500: internal_error` | `-` | - |

---

## Identity Provider (OAuth 2.0/OIDC)

**Base URL:** `http://localhost:7151`

**Total Endpoints:** 14

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/.well-known/openid-configuration` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/health` | `identity-provider\src\app.ts L:48` | `-` | - | - | `-` | - |
| GET | `/interaction/:uid` | `identity-provider\src\app.ts L:57` | `authController.interaction` | - | - | `-` | identity-provider\src\views\consent.html L:294<br>identity-provider\src\views\consent.html L:358<br>identity-provider\src\views\consent.html L:374<br>identity-provider\src\views\login.html L:233<br>identity-provider\src\views\login.html L:270<br>identity-provider\src\views\login.html L:277 |
| GET | `/interaction/:uid/abort` | `identity-provider\src\app.ts L:60` | `authController.abort` | - | - | `-` | identity-provider\src\views\consent.html L:374<br>identity-provider\src\views\login.html L:277 |
| POST | `/interaction/:uid/consent` | `identity-provider\src\app.ts L:59` | `authController.consent` | - | - | `-` | identity-provider\src\views\consent.html L:358 |
| GET | `/interaction/:uid/data` | `identity-provider\src\app.ts L:61` | `authController.getInteractionData` | - | - | `-` | identity-provider\src\views\consent.html L:294<br>identity-provider\src\views\login.html L:233 |
| POST | `/interaction/:uid/login` | `identity-provider\src\app.ts L:58` | `authController.login` | - | - | `-` | identity-provider\src\views\login.html L:270 |
| GET | `/logout` | `identity-provider\src\app.ts L:64` | `authController.logout` | - | - | `-` | - |
| GET | `/oauth/authorize` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| POST | `/oauth/introspect` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/oauth/jwks` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | backend\src\services\token-introspection.service.ts L:126 |
| POST | `/oauth/revoke` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| POST | `/oauth/token` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/oauth/userinfo` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |

---

## Summary Statistics

### Backend API

- **Total Endpoints:** 20
- **Endpoints with Usages:** 17
- **Total Usage References:** 93
- **Unused Endpoints:** 3

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 14
- **Endpoints with Usages:** 6
- **Total Usage References:** 13
- **Unused Endpoints:** 8

---

## Schemas

Referenced TypeScript types and interfaces used in API responses:

### {
    id: string;
    provider: string;
    creditsPer1kTokens: number;
    isAvailable: boolean;
  } | null

**Source:** `backend\src\services\model.service.ts` (Line 47)

```typescript
get(key: string): any | null {
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.cache.get(key) || null;
  }
```

### any | null

**Source:** `backend\src\services\model.service.ts` (Line 47)

```typescript
get(key: string): any | null {
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.cache.get(key) || null;
  }
```

### BulkOperationResult

**Source:** `backend\src\services\user-management.service.ts` (Line 72)

```typescript
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}
```

### Credit | null

**Source:** `backend\src\services\model.service.ts` (Line 47)

```typescript
get(key: string): any | null {
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.cache.get(key) || null;
  }
```

### CreditAdjustment

**Source:** `backend\src\services\user-management.service.ts` (Line 78)

```typescript
export interface CreditAdjustment {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  source: string;
  createdAt: Date;
}
```

### DefaultModelResponse

**Source:** `backend\src\types\user-validation.ts` (Line 131)

```typescript
export interface DefaultModelResponse {
  defaultModelId: string | null;
  model: {
    id: string;
    name: string;
    capabilities: string[];
  } | null;
}
```

### ModelDetailsResponse

**Source:** `backend\src\types\model-validation.ts` (Line 217)

```typescript
export interface ModelDetailsResponse {
  id: string;
  name: string;
  display_name: string;
  provider: string;
  description: string | null;
  capabilities: string[];
  context_length: number;
  max_output_tokens: number | null;
  input_cost_per_million_tokens: number;
  output_cost_per_million_tokens: number;
  credits_per_1k_tokens: number;
  is_available: boolean;
  is_deprecated: boolean;
  version: string | null;
  created_at: string;
  updated_at: string;
  // Tier access control fields
  required_tier: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual';
  tier_restriction_mode: 'minimum' | 'exact' | 'whitelist';
  allowed_tiers: Array<'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'>;
  access_status: 'allowed' | 'restricted' | 'upgrade_required';
  upgrade_info?: {
    required_tier: string;
    upgrade_url: string;
  };
}
```

### ModelListResponse

**Source:** `backend\src\types\model-validation.ts` (Line 208)

```typescript
export interface ModelListResponse {
  models: ModelListItem[];
  total: number;
  user_tier?: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'; // Current user's tier (if provided)
}
```

### PaginatedUsers

**Source:** `backend\src\services\user-management.service.ts` (Line 52)

```typescript
export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### ProrationEvent

**Source:** `shared-types\src\billing.types.ts` (Line 98)

```typescript
export interface ProrationEvent {
  id: string;
  userId: string;
  subscriptionId: string;
  fromTier: string | null;
  toTier: string | null;
  changeType: ProrationEventType;
  daysRemaining: number;
  daysInCycle: number;
  unusedCreditValueUsd: number;
  newTierProratedCostUsd: number;
  netChargeUsd: number; // Positive = charge, negative = credit
  effectiveDate: string;
  stripeInvoiceId: string | null;
  status: ProrationStatus;
  createdAt: string;
  updatedAt: string;

  // Optional populated fields from joins
  user?: {
    email: string;
  };
}
```

### ProrationPreview

**Source:** `backend\src\services\proration.service.ts` (Line 31)

```typescript
export interface ProrationPreview {
  calculation: ProrationCalculation;
  chargeToday: number;
  nextBillingAmount: number;
  nextBillingDate: Date;
  message: string;
}
```

### UsageHistoryResult

**Source:** `backend\src\services\usage.service.ts` (Line 32)

```typescript
export interface UsageHistoryResult {
  usage: UsageHistory[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  summary: {
    totalCreditsUsed: number;
    totalRequests: number;
    totalTokens: number;
  };
}
```

### UsageStatsResult

**Source:** `backend\src\services\usage.service.ts` (Line 63)

```typescript
export interface UsageStatsResult {
  stats: UsageStatsItem[];
  total: {
    creditsUsed: number;
    requestsCount: number;
    tokensTotal: number;
    averageDurationMs: number;
  };
}
```

### User

**Source:** `shared-types\src\user.types.ts` (Line 30)

```typescript
export interface User {
  id: string;
  email: string;
  name: string | null; // Computed from firstName + lastName
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  profilePictureUrl: string | null;

  // Status fields
  status: UserStatus; // DB enum field
  isActive: boolean;

  // Tier and credits (computed)
  currentTier: SubscriptionTier;
  creditsBalance: number; // Computed from credit_allocation

  // Timestamps
  createdAt: string; // ISO 8601
  lastActiveAt: string | null; // Maps to lastLoginAt
  deactivatedAt: string | null;
  deletedAt: string | null;

  // Suspension/ban fields
  suspendedUntil: string | null;
  bannedAt: string | null;

  // Optional nested subscription data
  subscription?: Subscription;

  // Role
  role: string; // 'user' | 'admin'

  // LTV for analytics
  lifetimeValue: number; // In cents
}
```

### UserPreferencesResponse

**Source:** `backend\src\types\user-validation.ts` (Line 119)

```typescript
export interface UserPreferencesResponse {
  defaultModelId: string | null;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
  preferencesMetadata: Record<string, any> | null;
}
```

### UserProfileResponse

**Source:** `backend\src\types\user-validation.ts` (Line 103)

```typescript
export interface UserProfileResponse {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}
```

### ValidationResult

**Source:** `backend\src\types\coupon-validation.ts` (Line 128)

```typescript
export type ValidationResult = z.infer<typeof validationResultSchema>;

// ===== Coupon Redemption Schemas =====

/**
 * Redeem Coupon Request Schema
 * POST /api/coupons/redeem
 */
export const redeemCouponRequestSchema = z.object({
  code: couponCodeSchema,
  subscription_id: uuidSchema.optional(),
  original_amount: amountSchema.optional().default(0),
});
```

### WebhookConfig | null

**Source:** `backend\src\services\model.service.ts` (Line 47)

```typescript
get(key: string): any | null {
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.cache.get(key) || null;
  }
```

