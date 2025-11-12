# Billing & Credits Pages API-Schema Analysis

**Date:** November 12, 2025
**Scope:** Deep API response pattern mismatches and schema alignment analysis
**Pages:** `/admin/billing` (BillingDashboard.tsx), `/admin/credits` (CreditManagement.tsx)

---

## Executive Summary

This analysis examined the API integration between frontend admin pages and backend services for billing and credit management features. The investigation focused on:

1. API calls made by frontend components
2. Backend controller/service response structures
3. Database schema alignment
4. Type definition consistency

### Critical Findings Summary

- **Total APIs Analyzed:** 12
- **Critical Mismatches Found:** 6
- **Type Inconsistencies:** 4
- **Missing Response Fields:** 8
- **Schema Alignment Issues:** 3

---

## /admin/billing (BillingDashboard.tsx)

### Component Overview

**Location:** `D:\sources\work\rephlo-sites\frontend\src\pages\admin\BillingDashboard.tsx`

**APIs Consumed:**
1. `getRevenueMetrics()` - Revenue overview (MRR, ARR, growth)
2. `getRevenueByTier()` - Revenue breakdown by subscription tier
3. `listInvoices()` - Paginated invoice list
4. `listTransactions()` - Paginated transaction list
5. `getDunningAttempts()` - Failed payment recovery attempts
6. `retryPayment()` - Retry failed payment

---

### API Analysis

#### 1. `getRevenueMetrics()` - Revenue Overview

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getRevenueMetrics = async (): Promise<RevenueMetrics> => {
  const response = await api.get<ApiResponse<RevenueMetrics>>('/api/plan109/analytics/revenue-metrics');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch revenue metrics');
};
```

**Frontend Expects (from plan109.types.ts):**
```typescript
interface RevenueMetrics {
  totalMRR: number;
  totalARR: number;
  avgRevenuePerUser: number;
  totalRevenueThisMonth: number;
  mrrGrowth: number; // Month-over-month percentage
}
```

**Backend Returns (from analytics.controller.ts via PlatformAnalyticsService):**
```typescript
// Controller: backend/src/controllers/analytics.controller.ts
// Service: backend/src/services/platform-analytics.service.ts

// The service provides:
- calculateMRR(): Promise<number>
- calculateARR(): Promise<number>
- Other metrics not aggregated into single response

// Actual response structure: NOT IMPLEMENTED AS EXPECTED
```

**Status:** ❌ **CRITICAL MISMATCH**

**Issues:**
1. **Missing aggregated endpoint:** Backend does NOT have a single `/api/plan109/analytics/revenue-metrics` endpoint that returns all fields
2. **Scattered methods:** The service has individual methods (calculateMRR, calculateARR) but no aggregated response
3. **Missing fields:**
   - `avgRevenuePerUser` - Not calculated in backend
   - `totalRevenueThisMonth` - Not calculated in backend
   - `mrrGrowth` - Not calculated in backend
4. **Frontend expects wrapped response:** `ApiResponse<RevenueMetrics>` but backend likely returns raw object

---

#### 2. `getRevenueByTier()` - Revenue Breakdown by Tier

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getRevenueByTier = async (): Promise<RevenueByTier[]> => {
  const response = await api.get<ApiResponse<RevenueByTier[]>>('/api/plan109/analytics/revenue-by-tier');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch revenue by tier');
};
```

**Frontend Expects:**
```typescript
interface RevenueByTier {
  tier: SubscriptionTier;
  revenue: number;
  percentage: number;  // ⚠️ Missing in backend
  subscriberCount: number;
}
```

**Backend Returns:**
```typescript
// From: PlatformAnalyticsService.getRevenueByTier()
interface RevenueSummary {
  tier: string;
  revenue: number;
  subscriptionCount: number;
}
```

**Status:** ❌ **MISMATCH**

**Issues:**
1. **Missing field:** `percentage` - Frontend expects percentage of total revenue, backend does not calculate it
2. **Field name mismatch:** `subscriberCount` (frontend) vs `subscriptionCount` (backend)
3. **Type mismatch:** `tier` is `SubscriptionTier` enum in frontend but `string` in backend

---

#### 3. `listInvoices()` - Paginated Invoice List

**Frontend API Call:**
```typescript
// From: frontend/src/api/admin.ts
export const listInvoices = async (
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<Invoice>> => {
  const response = await api.get<ApiResponse<PaginatedResponse<Invoice>>>(
    `/admin/billing/invoices`,
    { params: { page, limit } }
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch invoices');
};
```

**Frontend Expects:**
```typescript
interface PaginatedResponse<Invoice> {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;  // ⚠️ Missing in backend
  status: InvoiceStatus;
  invoicePdfUrl?: string;  // ⚠️ Field name mismatch
  hostedInvoiceUrl?: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;  // ⚠️ Missing in backend
  paidAt?: string;
  createdAt: string;
  user?: User;
}
```

**Backend Returns:**
```typescript
// From: BillingController.listInvoices()
{
  success: true,
  data: result.data,  // Array of Invoice records from DB
  meta: {
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  }
}

// Invoice fields from BillingPaymentsService:
interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string | null;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  invoicePdf: string | null;  // ⚠️ Field name: invoicePdf vs invoicePdfUrl
  hostedInvoiceUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
}
```

**Status:** ❌ **MISMATCH**

**Issues:**
1. **Response structure mismatch:** Backend returns `{ success, data, meta }` but frontend expects `{ data, total, page, limit, totalPages }` at top level
2. **Missing fields in backend:**
   - `amountRemaining` - Not calculated (should be `amountDue - amountPaid`)
   - `dueDate` - Not stored/returned
3. **Field name mismatch:** `invoicePdf` (backend) vs `invoicePdfUrl` (frontend)
4. **Type mismatch:** Dates are `Date` objects in backend but frontend expects `string` (ISO format)
5. **subscriptionId nullability:** Backend allows `null`, frontend expects non-null `string`

---

#### 4. `listTransactions()` - Paginated Transaction List

**Frontend API Call:**
```typescript
// From: frontend/src/api/admin.ts
export const listTransactions = async (
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<Transaction>> => {
  const response = await api.get<ApiResponse<PaginatedResponse<Transaction>>>(
    `/admin/billing/transactions`,
    { params: { page, limit } }
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch transactions');
};
```

**Frontend Expects:**
```typescript
interface Transaction {
  id: string;
  userId: string;
  invoiceId?: string;
  stripePaymentIntentId: string;
  stripeChargeId?: string;  // ⚠️ Missing in backend
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethodType?: string;
  last4?: string;  // ⚠️ Missing in backend
  failureCode?: string;  // ⚠️ Field name mismatch
  failureMessage?: string;  // ⚠️ Field name mismatch
  createdAt: string;
  updatedAt: string;  // ⚠️ Missing in backend
  user?: User;
}
```

**Backend Returns:**
```typescript
// From: BillingPaymentsService
interface PaymentTransaction {
  id: string;
  userId: string;
  invoiceId: string | null;
  subscriptionId: string | null;  // ⚠️ Extra field
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethodType: string | null;
  failureReason: string | null;  // ⚠️ Field name: failureReason vs failureMessage
  createdAt: Date;
  completedAt: Date | null;  // ⚠️ Different field than updatedAt
}
```

**Status:** ❌ **MISMATCH**

**Issues:**
1. **Same response structure issue:** Backend returns `{ success, data, meta }` but frontend expects flat pagination
2. **Missing fields in backend:**
   - `stripeChargeId` - Not stored
   - `last4` - Card last 4 digits not stored
   - `failureCode` - Only `failureReason` message stored
   - `updatedAt` - Backend has `completedAt` instead
3. **Field name mismatches:**
   - `failureReason` (backend) vs `failureCode` + `failureMessage` (frontend)
4. **Extra field in backend:** `subscriptionId` not expected by frontend
5. **Status type mismatch:** Backend has 'cancelled' status, frontend enum uses 'REFUNDED' without 'cancelled'

---

#### 5. `getDunningAttempts()` - Failed Payment Recovery

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getDunningAttempts = async (): Promise<DunningAttempt[]> => {
  const response = await api.get<ApiResponse<DunningAttempt[]>>('/admin/billing/dunning');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch dunning attempts');
};
```

**Frontend Expects:**
```typescript
interface DunningAttempt {
  id: string;
  subscriptionId: string;
  invoiceId: string;
  attemptNumber: number;
  retryAt: string;  // ⚠️ Field name mismatch
  status: 'scheduled' | 'attempted' | 'succeeded' | 'failed' | 'exhausted';
  errorMessage?: string;
  createdAt: string;
  attemptedAt?: string;
  subscription?: Subscription;
  invoice?: Invoice;
}
```

**Backend Returns:**
```typescript
// From: BillingController.listDunningAttempts()
{
  success: true,
  attempts: [...],  // ⚠️ Field name: attempts vs data
}

// DunningAttempt interface from BillingPaymentsService:
interface DunningAttempt {
  id: string;
  userId: string;  // ⚠️ Extra field
  invoiceId: string;
  attemptNumber: number;
  scheduledAt: Date;  // ⚠️ Field name: scheduledAt vs retryAt
  attemptedAt: Date | null;
  result: 'success' | 'failed' | 'pending' | 'skipped' | null;  // ⚠️ Field name: result vs status
  failureReason: string | null;  // ⚠️ Field name: failureReason vs errorMessage
  nextRetryAt: Date | null;  // ⚠️ Extra field
}
```

**Status:** ❌ **CRITICAL MISMATCH**

**Issues:**
1. **Response wrapper mismatch:** Backend uses `{ success, attempts }` but frontend expects `{ success, data }`
2. **Missing field:** `subscriptionId` - Backend stores `userId` instead
3. **Field name mismatches:**
   - `scheduledAt` (backend) vs `retryAt` (frontend)
   - `result` (backend) vs `status` (frontend)
   - `failureReason` (backend) vs `errorMessage` (frontend)
4. **Status values mismatch:** Backend has 'success'/'pending'/'skipped', frontend expects 'scheduled'/'attempted'/'succeeded'/'failed'/'exhausted'
5. **Extra fields in backend:** `userId`, `nextRetryAt`
6. **Type mismatch:** Dates are `Date` objects, frontend expects ISO strings

---

#### 6. `retryPayment()` - Retry Failed Payment

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const retryPayment = async (attemptId: string): Promise<void> => {
  const response = await api.post<ApiResponse<void>>(
    `/admin/billing/dunning/${attemptId}/retry`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to retry payment');
  }
};
```

**Backend Returns:**
```typescript
// From: BillingController.retryFailedPayment()
{
  success: true,
  data: transaction,  // PaymentTransaction object
  message: 'Payment retry initiated',
}
```

**Status:** ✅ **MATCH** (Minor issue)

**Issues:**
1. **Minor:** Frontend expects `void` return but backend returns transaction data (this is actually better for UX)

---

### CRUD Operations Analysis

#### Payment Methods
- **Add Payment Method:** `POST /admin/billing/payment-methods` ✅ Implemented
- **Remove Payment Method:** `DELETE /admin/billing/payment-methods/:id` ✅ Implemented
- **List Payment Methods:** `GET /admin/billing/payment-methods/:userId` ❌ **NOT IMPLEMENTED** (returns 501)

#### Invoices
- **Create Invoice:** `POST /admin/billing/invoices/:subscriptionId` ✅ Implemented
- **List Invoices:** `GET /admin/billing/invoices` ✅ Implemented (but response format mismatch)
- **Get Upcoming Invoice:** `GET /admin/billing/invoices/upcoming/:userId` ❌ **NOT IMPLEMENTED** (returns 501)

#### Transactions
- **List Transactions:** `GET /admin/billing/transactions` ✅ Implemented (but response format mismatch)
- **Refund Transaction:** `POST /admin/billing/transactions/:id/refund` ❌ **NOT IMPLEMENTED** (returns 501)

---

### Database Schema Alignment

**Relevant Prisma Models:**
```prisma
model BillingInvoice {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String   @db.Uuid
  subscriptionId    String?  @db.Uuid
  stripeInvoiceId   String   @unique
  amountDue         Decimal  @db.Decimal(10, 2)
  amountPaid        Decimal  @db.Decimal(10, 2)
  currency          String   @db.VarChar(3)
  status            String   @db.VarChar(20)
  periodStart       DateTime @db.Timestamptz
  periodEnd         DateTime @db.Timestamptz
  invoicePdf        String?
  hostedInvoiceUrl  String?
  createdAt         DateTime @default(now()) @db.Timestamptz
  paidAt            DateTime? @db.Timestamptz

  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription      SubscriptionMonetization? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([subscriptionId])
}

model PaymentTransaction {
  id                      String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                  String   @db.Uuid
  invoiceId               String?  @db.Uuid
  subscriptionId          String?  @db.Uuid
  stripePaymentIntentId   String   @unique
  amount                  Decimal  @db.Decimal(10, 2)
  currency                String   @db.VarChar(3)
  status                  String   @db.VarChar(20)
  paymentMethodType       String?  @db.VarChar(50)
  failureReason           String?
  createdAt               DateTime @default(now()) @db.Timestamptz
  completedAt             DateTime? @db.Timestamptz

  user                    User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}

model DunningAttemptMonetization {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String    @db.Uuid
  invoiceId       String    @db.Uuid
  attemptNumber   Int
  scheduledAt     DateTime  @db.Timestamptz
  attemptedAt     DateTime? @db.Timestamptz
  result          String?   @db.VarChar(20)
  failureReason   String?
  nextRetryAt     DateTime? @db.Timestamptz
  createdAt       DateTime  @default(now()) @db.Timestamptz

  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([invoiceId])
}
```

**Schema Issues:**
1. **Missing fields in DB:**
   - `BillingInvoice.amountRemaining` - Not stored (calculated field)
   - `BillingInvoice.dueDate` - Not stored
   - `PaymentTransaction.stripeChargeId` - Not stored
   - `PaymentTransaction.last4` - Not stored
   - `PaymentTransaction.failureCode` - Only `failureReason` text stored
   - `PaymentTransaction.updatedAt` - Uses `completedAt` instead
   - `DunningAttemptMonetization.subscriptionId` - Not stored (only userId)

2. **Field naming misalignment:**
   - Database field names don't match frontend expectations
   - Requires mapping layer in services

3. **Type mismatches:**
   - `Decimal` types in DB need conversion to `number` for JSON
   - `DateTime` needs ISO string conversion

---

### Summary: /admin/billing

**APIs Analyzed:** 6
**Critical Mismatches:** 5
**Not Implemented:** 3 endpoints return 501

**Critical Issues:**
1. ❌ `getRevenueMetrics()` - Endpoint not implemented, missing aggregated metrics
2. ❌ `getRevenueByTier()` - Missing `percentage` field, field name mismatches
3. ❌ `listInvoices()` - Response structure mismatch, missing fields
4. ❌ `listTransactions()` - Response structure mismatch, field name mismatches
5. ❌ `getDunningAttempts()` - Field name mismatches, status values mismatch, wrong response wrapper
6. ✅ `retryPayment()` - Works (minor enhancement opportunity)

**Not Implemented (501 responses):**
- `GET /admin/billing/payment-methods/:userId`
- `GET /admin/billing/invoices/upcoming/:userId`
- `POST /admin/billing/transactions/:id/refund`

---

## /admin/credits (CreditManagement.tsx)

### Component Overview

**Location:** `D:\sources\work\rephlo-sites\frontend\src\pages\admin\CreditManagement.tsx`

**APIs Consumed:**
1. `getCreditAllocations()` - Credit allocation history
2. `getCreditBalance()` - User credit balance
3. `getCreditUtilization()` - Credit usage by tier
4. `getTopCreditConsumers()` - Top credit consumers
5. `allocateCredits()` - Allocate subscription credits (POST)
6. `grantBonusCredits()` - Grant bonus credits (POST)
7. `deductCredits()` - Manually deduct credits (POST)

---

### API Analysis

#### 1. `getCreditAllocations()` - Credit Allocation History

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getCreditAllocations = async (
  userId?: string
): Promise<CreditAllocation[]> => {
  const url = userId
    ? `/admin/credits/history/${userId}`
    : '/admin/credits/allocations';
  const response = await api.get<ApiResponse<CreditAllocation[]>>(url);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch credit allocations');
};
```

**Frontend Expects:**
```typescript
interface CreditAllocation {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  source: CreditAdjustmentType;  // enum: subscription, bonus, referral, etc.
  allocatedAt: string;  // ⚠️ Field name mismatch
  expiresAt?: string;  // ⚠️ Field name mismatch
  createdAt: string;
  user?: User;
}
```

**Backend Returns:**
```typescript
// From: CreditManagementController.getCreditAllocationHistory()
{
  success: true,
  data: history,  // Array of CreditAllocation from service
}

// CreditAllocation interface from CreditManagementService:
interface CreditAllocation {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  allocationPeriodStart: Date;  // ⚠️ Different field
  allocationPeriodEnd: Date;    // ⚠️ Maps to expiresAt?
  source: 'subscription' | 'bonus' | 'admin_grant' | 'referral' | 'coupon';
  createdAt: Date;
}
```

**Status:** ❌ **MISMATCH**

**Issues:**
1. **Missing field:** `allocatedAt` - Frontend expects this but backend doesn't have it (uses `createdAt`?)
2. **Field semantic mismatch:**
   - Backend has `allocationPeriodStart` and `allocationPeriodEnd` (period range)
   - Frontend expects `allocatedAt` (single timestamp) and `expiresAt` (expiration)
3. **Source enum mismatch:** Backend uses 'admin_grant', frontend enum uses 'admin_add' / 'admin_remove'
4. **Type mismatch:** Dates are `Date` objects, frontend expects ISO strings

---

#### 2. `getCreditBalance()` - User Credit Balance

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getCreditBalance = async (userId: string): Promise<CreditBalance> => {
  const response = await api.get<ApiResponse<CreditBalance>>(
    `/admin/credits/balance/${userId}`
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch credit balance');
};
```

**Frontend Expects:**
```typescript
interface CreditBalance {
  userId: string;
  totalCredits: number;
  subscriptionCredits: number;  // ⚠️ Missing in backend
  bonusCredits: number;         // ⚠️ Missing in backend
  rolloverCredits: number;
  expiringCredits: number;      // ⚠️ Missing in backend
  expiringAt?: string;          // ⚠️ Missing in backend
}
```

**Backend Returns:**
```typescript
// From: CreditManagementService.getCreditBalance()
interface CreditBalance {
  userId: string;
  totalCredits: number;
  usedCredits: number;     // ⚠️ Extra field, not in frontend type
  remainingCredits: number; // ⚠️ Extra field, not in frontend type
  rolloverCredits: number;
}
```

**Status:** ❌ **CRITICAL MISMATCH**

**Issues:**
1. **Missing fields in backend:**
   - `subscriptionCredits` - Credits from subscription allocation
   - `bonusCredits` - Bonus/referral credits
   - `expiringCredits` - Credits about to expire
   - `expiringAt` - When credits will expire
2. **Extra fields in backend:**
   - `usedCredits` - Not expected by frontend
   - `remainingCredits` - Not expected by frontend
3. **Structural difference:** Backend focuses on usage tracking, frontend expects credit source breakdown

---

#### 3. `getCreditUtilization()` - Credit Usage by Tier

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getCreditUtilization = async (): Promise<CreditUtilization[]> => {
  const response = await api.get<ApiResponse<CreditUtilization[]>>(
    '/admin/credits/utilization'
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch credit utilization');
};
```

**Frontend Expects:**
```typescript
interface CreditUtilization {
  tier: SubscriptionTier;
  allocated: number;
  used: number;
  utilizationPercent: number;
  userCount: number;
}
```

**Backend Status:** ❌ **ENDPOINT NOT FOUND**

**Issues:**
1. **Endpoint does not exist:** `/admin/credits/utilization` is not defined in backend routes
2. **No corresponding service method:** `CreditManagementService` does not have a method to calculate utilization by tier
3. **Data would need to be computed from:**
   - `CreditAllocation` table (allocated amounts by tier)
   - `UsageHistory` table (used amounts by tier)
   - `SubscriptionMonetization` table (user tier mapping)

---

#### 4. `getTopCreditConsumers()` - Top Credit Consumers

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const getTopCreditConsumers = async (
  limit: number = 10
): Promise<TopCreditConsumer[]> => {
  const response = await api.get<ApiResponse<TopCreditConsumer[]>>(
    '/admin/credits/top-consumers',
    { params: { limit } }
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to fetch top consumers');
};
```

**Frontend Expects:**
```typescript
interface TopCreditConsumer {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
  creditsUsed: number;
  percentOfAllocation: number;
}
```

**Backend Status:** ❌ **ENDPOINT NOT FOUND**

**Issues:**
1. **Endpoint does not exist:** `/admin/credits/top-consumers` is not defined in backend routes
2. **No corresponding service method:** Would need to aggregate data from multiple tables
3. **Complex query needed:**
   - Join `UsageHistory` with `User` and `SubscriptionMonetization`
   - Group by userId
   - Calculate usage percentage
   - Order by usage descending

---

#### 5. `allocateCredits()` - Allocate Subscription Credits (POST)

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const allocateCredits = async (
  userId: string,
  subscriptionId: string
): Promise<CreditAllocation> => {
  const response = await api.post<ApiResponse<CreditAllocation>>(
    '/admin/credits/allocate',
    { userId, subscriptionId }
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to allocate credits');
};
```

**Backend Implementation:**
```typescript
// From: CreditManagementController.allocateSubscriptionCredits()
{
  success: true,
  data: allocation,
  message: 'Credits allocated successfully',
}
```

**Status:** ✅ **MATCH** (with field mapping issues)

**Issues:**
1. **Same field mapping issues as #1:** `allocationPeriodStart/End` vs `allocatedAt/expiresAt`
2. **Otherwise functional**

---

#### 6. `grantBonusCredits()` - Grant Bonus Credits (POST)

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const grantBonusCredits = async (
  request: CreditAdjustmentRequest
): Promise<CreditAllocation> => {
  const response = await api.post<ApiResponse<CreditAllocation>>(
    '/admin/credits/grant-bonus',
    request
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'Failed to grant bonus credits');
};

// Request type:
interface CreditAdjustmentRequest {
  userId: string;
  amount: number;
  reason: string;
  expiresAt?: string;
}
```

**Backend Implementation:**
```typescript
// From: CreditManagementController.grantBonusCredits()
// Request body validated with:
{
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
  expiresAt: z.coerce.date().optional(),
}

// Response:
{
  success: true,
  data: allocation,
  message: `${amount} bonus credits granted`,
}
```

**Status:** ✅ **MATCH** (with field mapping issues)

**Issues:**
1. **Same field mapping issues as #1**
2. **Date handling:** Frontend sends ISO string, backend coerces to Date (works)

---

#### 7. `deductCredits()` - Manually Deduct Credits (POST)

**Frontend API Call:**
```typescript
// From: frontend/src/api/plan109.ts
export const deductCredits = async (
  userId: string,
  amount: number,
  reason: string
): Promise<void> => {
  const response = await api.post<ApiResponse<void>>(
    '/admin/credits/deduct',
    { userId, amount, reason }
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to deduct credits');
  }
};
```

**Backend Implementation:**
```typescript
// From: CreditManagementController.deductCreditsManually()
{
  success: true,
  message: `${amount} credits deducted`,
}
```

**Status:** ✅ **MATCH**

---

### CRUD Operations Analysis

#### Credit Allocation
- **Allocate Subscription Credits:** `POST /admin/credits/allocate` ✅ Implemented
- **Process Monthly Allocations:** `POST /admin/credits/process-monthly` ✅ Implemented (cron job)
- **Get Allocation History:** `GET /admin/credits/history/:userId` ✅ Implemented

#### Manual Adjustments
- **Grant Bonus Credits:** `POST /admin/credits/grant-bonus` ✅ Implemented
- **Deduct Credits:** `POST /admin/credits/deduct` ✅ Implemented

#### Queries
- **Get Credit Balance:** `GET /admin/credits/balance/:userId` ✅ Implemented (but field mismatches)
- **Get Credit Utilization:** `GET /admin/credits/utilization` ❌ **NOT IMPLEMENTED**
- **Get Top Consumers:** `GET /admin/credits/top-consumers` ❌ **NOT IMPLEMENTED**

#### Rollover
- **Calculate Rollover:** `GET /admin/credits/rollover/:userId` ✅ Implemented
- **Apply Rollover:** `POST /admin/credits/rollover/:userId/apply` ✅ Implemented

#### Integration
- **Sync with Token-Credit System:** `POST /admin/credits/sync/:userId` ✅ Implemented
- **Reconcile Balance:** `GET /admin/credits/reconcile/:userId` ✅ Implemented

---

### Database Schema Alignment

**Relevant Prisma Models:**
```prisma
model CreditAllocation {
  id                      String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                  String    @db.Uuid
  subscriptionId          String?   @db.Uuid
  amount                  Int
  allocationPeriodStart   DateTime  @db.Timestamptz
  allocationPeriodEnd     DateTime  @db.Timestamptz
  source                  String    @db.VarChar(50)
  createdAt               DateTime  @default(now()) @db.Timestamptz

  user                    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription            SubscriptionMonetization? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([subscriptionId])
}

model UserCreditBalance {
  id                      String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                  String    @unique @db.Uuid
  amount                  Int
  createdAt               DateTime  @default(now()) @db.Timestamptz
  updatedAt               DateTime  @db.Timestamptz

  user                    User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UsageHistory {
  id                      String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                  String    @db.Uuid
  modelId                 String?   @db.Uuid
  endpoint                String    @db.VarChar(100)
  tokensUsed              Int
  creditsCost             Decimal   @db.Decimal(10, 4)
  timestamp               DateTime  @default(now()) @db.Timestamptz
  requestMetadata         Json?

  user                    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  model                   Model? @relation(fields: [modelId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([timestamp])
  @@index([modelId])
}
```

**Schema Issues:**
1. **Field naming inconsistency:**
   - `allocationPeriodStart/End` (DB) vs `allocatedAt/expiresAt` (frontend)
   - No single "allocatedAt" timestamp field

2. **Missing computed fields:**
   - `CreditBalance` fields like `subscriptionCredits`, `bonusCredits`, `expiringCredits` need to be computed from `CreditAllocation` by filtering on `source`
   - No direct storage of credit breakdown by source

3. **Utilization data scattered:**
   - Credit allocation in `CreditAllocation` table
   - Credit usage in `UsageHistory` table
   - Tier mapping in `SubscriptionMonetization` table
   - No pre-aggregated view

---

### Summary: /admin/credits

**APIs Analyzed:** 7
**Critical Mismatches:** 3
**Not Implemented:** 2 endpoints

**Critical Issues:**
1. ❌ `getCreditAllocations()` - Field naming mismatch (allocationPeriodStart/End vs allocatedAt/expiresAt)
2. ❌ `getCreditBalance()` - Missing breakdown fields (subscriptionCredits, bonusCredits, expiringCredits)
3. ❌ `getCreditUtilization()` - Endpoint does not exist
4. ❌ `getTopCreditConsumers()` - Endpoint does not exist
5. ✅ `allocateCredits()` - Works (with field mapping issues)
6. ✅ `grantBonusCredits()` - Works (with field mapping issues)
7. ✅ `deductCredits()` - Works

**Not Implemented:**
- `GET /admin/credits/utilization`
- `GET /admin/credits/top-consumers`

---

## Critical Issues Summary

### Response Structure Inconsistencies

**Issue:** Backend returns `{ success, data, meta }` but frontend expects `{ data, total, page, limit, totalPages }` at top level for paginated responses.

**Affected Endpoints:**
- `GET /admin/billing/invoices`
- `GET /admin/billing/transactions`

**Impact:** HIGH - Frontend cannot correctly parse paginated data

**Recommendation:** Standardize on one response format:
```typescript
// Option 1: Flat pagination (matches frontend)
{
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}

// Option 2: Nested with meta (current backend)
{
  success: boolean,
  data: T[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

---

### Field Naming Mismatches

**Critical Field Naming Issues:**

| Frontend Field | Backend Field | Affected Endpoints |
|----------------|---------------|-------------------|
| `invoicePdfUrl` | `invoicePdf` | listInvoices |
| `failureCode` + `failureMessage` | `failureReason` | listTransactions |
| `updatedAt` | `completedAt` | listTransactions |
| `retryAt` | `scheduledAt` | getDunningAttempts |
| `status` | `result` | getDunningAttempts |
| `errorMessage` | `failureReason` | getDunningAttempts |
| `allocatedAt` | N/A (uses `createdAt`?) | getCreditAllocations |
| `expiresAt` | `allocationPeriodEnd` | getCreditAllocations |
| `attempts` | `data` | getDunningAttempts response wrapper |

**Impact:** HIGH - Frontend cannot access data with expected field names

**Recommendation:** Add mapping layer in backend services or update frontend types

---

### Missing API Endpoints

**Not Implemented (return 501):**
1. `GET /admin/billing/payment-methods/:userId` - List payment methods
2. `GET /admin/billing/invoices/upcoming/:userId` - Get upcoming invoice
3. `POST /admin/billing/transactions/:id/refund` - Refund transaction

**Not Implemented (no route exists):**
4. `GET /api/plan109/analytics/revenue-metrics` - Aggregated revenue metrics
5. `GET /admin/credits/utilization` - Credit utilization by tier
6. `GET /admin/credits/top-consumers` - Top credit consumers

**Impact:** HIGH - Frontend features will fail or show errors

**Recommendation:** Implement missing endpoints or remove UI elements

---

### Missing Response Fields

**Critical Missing Fields:**

| Endpoint | Missing Fields | Impact |
|----------|---------------|--------|
| `getRevenueMetrics()` | `avgRevenuePerUser`, `totalRevenueThisMonth`, `mrrGrowth` | Dashboard metrics incomplete |
| `getRevenueByTier()` | `percentage` | Cannot show revenue distribution |
| `listInvoices()` | `amountRemaining`, `dueDate` | Cannot show payment status |
| `listTransactions()` | `stripeChargeId`, `last4`, `failureCode`, `updatedAt` | Limited transaction details |
| `getCreditBalance()` | `subscriptionCredits`, `bonusCredits`, `expiringCredits`, `expiringAt` | Cannot show credit breakdown |

**Impact:** MEDIUM-HIGH - UI shows incomplete data

**Recommendation:** Add computed fields in services or update frontend to work with available data

---

### Type Mismatches

**Date Handling:**
- Backend returns `Date` objects
- Frontend expects ISO date strings
- **Solution:** Serialize dates to ISO strings in controllers

**Decimal Handling:**
- Backend uses `Decimal` type from Prisma
- Frontend expects `number`
- **Solution:** Convert Decimal to number in services

**Enum Mismatches:**
- Transaction status: Backend has 'cancelled', frontend doesn't
- Dunning status: Backend uses 'success'/'pending'/'skipped', frontend expects 'scheduled'/'attempted'/'succeeded'/'failed'/'exhausted'
- Credit source: Backend uses 'admin_grant', frontend uses 'admin_add'/'admin_remove'
- **Solution:** Align enums or add mapping layer

---

### Schema Alignment Issues

**CreditAllocation Semantic Mismatch:**
- Database stores `allocationPeriodStart` and `allocationPeriodEnd` (period range)
- Frontend expects `allocatedAt` (allocation timestamp) and `expiresAt` (expiration)
- **Recommendation:** Align schema with business logic:
  - If credits are "allocated" at a point in time, use `allocatedAt`
  - If credits have validity period, keep period fields but map correctly

**CreditBalance Breakdown Missing:**
- Frontend expects breakdown by source (subscription, bonus, rollover, expiring)
- Backend only stores total in `UserCreditBalance`
- **Recommendation:** Compute breakdown from `CreditAllocation` records by source, or add fields to `UserCreditBalance`

**Utilization Data Scattered:**
- No single source for credit utilization metrics
- Requires joins across `CreditAllocation`, `UsageHistory`, and `SubscriptionMonetization`
- **Recommendation:** Create database view or service method to aggregate utilization

---

## Recommendations

### Immediate Actions (Priority 1)

1. **Standardize Response Formats**
   - Choose one pagination response format
   - Update either frontend or backend to match
   - Document the standard in API guidelines

2. **Implement Missing Critical Endpoints**
   - `GET /api/plan109/analytics/revenue-metrics` - Aggregated dashboard metrics
   - `GET /admin/credits/utilization` - Credit utilization by tier
   - `GET /admin/credits/top-consumers` - Top credit consumers

3. **Fix Field Naming Mismatches**
   - Add mapping layer in backend controllers to transform field names
   - OR update frontend types to match backend fields
   - Ensure date serialization (Date → ISO string)

### Medium Priority (Priority 2)

4. **Add Missing Response Fields**
   - Implement computed fields:
     - `amountRemaining = amountDue - amountPaid`
     - `percentage` in revenue by tier
     - Credit balance breakdown by source
   - Add fields to services and DTOs

5. **Align Enums and Types**
   - Create shared type definitions
   - Ensure backend and frontend use same enum values
   - Document enum mappings if they must differ

6. **Implement Remaining Endpoints (501s)**
   - `GET /admin/billing/payment-methods/:userId`
   - `GET /admin/billing/invoices/upcoming/:userId`
   - `POST /admin/billing/transactions/:id/refund`

### Long-term Improvements (Priority 3)

7. **Create Shared Type Library**
   - Extract types to shared package
   - Generate TypeScript types from Prisma schema
   - Use code generation to keep types in sync

8. **Add Response Transformation Layer**
   - Implement DTOs (Data Transfer Objects)
   - Map database models to API responses consistently
   - Handle date serialization, decimal conversion, nullability

9. **Create Database Views for Analytics**
   - Credit utilization by tier view
   - Revenue metrics view
   - Top consumers view
   - Improve query performance

10. **Comprehensive API Testing**
    - Integration tests for all endpoints
    - Validate response schemas match frontend expectations
    - Contract testing between frontend and backend

---

## Appendix: Quick Reference

### Billing Dashboard API Status

| API | Status | Issues |
|-----|--------|--------|
| `getRevenueMetrics()` | ❌ Not Implemented | Endpoint missing |
| `getRevenueByTier()` | ❌ Mismatch | Missing `percentage` field |
| `listInvoices()` | ❌ Mismatch | Response format, missing fields |
| `listTransactions()` | ❌ Mismatch | Response format, field names |
| `getDunningAttempts()` | ❌ Mismatch | Field names, status values, wrapper |
| `retryPayment()` | ✅ Works | Minor enhancement |

### Credit Management API Status

| API | Status | Issues |
|-----|--------|--------|
| `getCreditAllocations()` | ❌ Mismatch | Field naming |
| `getCreditBalance()` | ❌ Mismatch | Missing breakdown fields |
| `getCreditUtilization()` | ❌ Not Implemented | Endpoint missing |
| `getTopCreditConsumers()` | ❌ Not Implemented | Endpoint missing |
| `allocateCredits()` | ✅ Works | Field mapping issues |
| `grantBonusCredits()` | ✅ Works | Field mapping issues |
| `deductCredits()` | ✅ Works | - |

### Response Format Patterns

**Current Backend Pattern:**
```typescript
// Single resource
{ success: true, data: T, message?: string }

// List (non-paginated)
{ success: true, data: T[] }

// Paginated (inconsistent wrapper)
{ success: true, data: T[], meta: { total, page, limit, totalPages } }
// OR
{ success: true, attempts: T[] }  // Different field name
```

**Frontend Expects:**
```typescript
// Wrapped in ApiResponse
{ success: true, data: T, error?: string, message?: string }

// Paginated (flat)
{ data: T[], total: number, page: number, limit: number, totalPages: number }
```

---

**End of Analysis**

**Generated:** November 12, 2025
**Analyst:** Claude Code
**Next Steps:** Review with team, prioritize fixes, create implementation tickets
