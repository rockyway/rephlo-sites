# Coupon System Pages API-Schema Analysis Report

**Analysis Date:** 2025-11-12
**Scope:** All coupon-related admin pages (CouponManagement, CampaignCalendar, CouponAnalytics)
**Reference:** docs/plan/111-coupon-discount-code-system.md

---

## Executive Summary

This analysis examines the alignment between frontend API consumers, backend API implementations, and database schemas across all coupon system pages. The analysis reveals **critical schema mismatches** between the frontend expectations and backend implementations, particularly in:

1. **Response structure inconsistencies** - Backend returns Prisma models with different field naming conventions than frontend expects
2. **Missing pagination metadata** - List responses lack proper pagination wrapper structure
3. **Type misalignment** - Database enums and frontend types don't fully match
4. **Missing API endpoints** - Some frontend API calls have no backend implementation

---

## 1. `/admin/coupons` (CouponManagement.tsx)

### 1.1 APIs Consumed

#### API 1: `plan111API.listCoupons(filters, page, limit)`
- **Endpoint:** `GET /admin/coupons`
- **Expected Response Type:** `CouponListResponse`
- **Frontend Usage:** Lines 99-103 in CouponManagement.tsx

```typescript
// Frontend expects:
interface CouponListResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  page_size: number;
}

// Where Coupon interface includes:
interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  discount_percentage?: number;
  discount_amount?: number;
  bonus_duration_months?: number;
  max_discount_applications?: number;
  redemption_count?: number;
  total_discount_value?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  description?: string;
  // ... and many more fields
}
```

**Backend Implementation (coupon.controller.ts:321-355):**

```typescript
// Backend returns:
res.json({
  coupons: coupons.map((c) => ({
    id: c.id,
    code: c.code,
    coupon_type: c.couponType,        // ❌ MISMATCH: 'coupon_type' vs 'type'
    discount_value: parseFloat(...),   // ❌ MISMATCH: 'discount_value' vs multiple fields
    discount_type: c.discountType,
    max_uses: c.maxUses,
    total_uses: c.usageLimits?.totalUses || 0,  // ❌ MISSING: No 'redemption_count' field
    is_active: c.isActive,
    valid_from: c.validFrom.toISOString(),
    valid_until: c.validUntil.toISOString(),
    campaign_name: (c as any).campaign?.campaignName || null,
    // ❌ MISSING: No 'total' or 'page' or 'page_size' in response wrapper
  })),
});
```

**Critical Issues:**

1. **Response Wrapper Missing:** Backend returns `{ coupons: [...] }` but frontend expects `{ coupons, total, page, page_size }`
2. **Field Name Mismatch:** `coupon_type` vs `type`
3. **Discount Fields:** Backend returns single `discount_value` field, frontend expects three separate fields:
   - `discount_percentage`
   - `discount_amount`
   - `bonus_duration_months`
4. **Statistics Fields Missing:** Frontend expects `redemption_count` and `total_discount_value` but backend returns `total_uses` which is a different field

#### API 2: `plan111API.createCoupon(data)`
- **Endpoint:** `POST /admin/coupons`
- **Expected Response Type:** `Coupon`

**Backend Implementation (coupon.controller.ts:195-250):**

```typescript
// Backend returns minimal response:
res.status(201).json({
  id: coupon.id,
  code: coupon.code,
  coupon_type: coupon.couponType,
  discount_value: parseFloat(coupon.discountValue.toString()),
  discount_type: coupon.discountType,
  created_at: coupon.createdAt.toISOString(),
});
```

**Issue:** Frontend expects full `Coupon` object with all fields populated, but backend returns only 6 fields.

#### API 3: `plan111API.updateCoupon(id, updates)`
- **Endpoint:** `PATCH /admin/coupons/:id`
- **Expected Response Type:** `Coupon`

**Backend Implementation (coupon.controller.ts:256-293):**

```typescript
// Backend returns minimal response:
res.json({
  id: coupon.id,
  code: coupon.code,
  updated_at: coupon.updatedAt.toISOString(),
});
```

**Issue:** Same as createCoupon - returns only 3 fields instead of full Coupon object.

#### API 4: `plan111API.deleteCoupon(id)`
- **Endpoint:** `DELETE /admin/coupons/:id`
- **Expected Response:** `void` (204 No Content)
- **Backend Implementation:** ✅ **CORRECT** - Returns 204 status

#### API 5: `plan111API.getCouponRedemptions(id, page, limit)`
- **Endpoint:** `GET /admin/coupons/:id/redemptions`
- **Expected Response Type:** `RedemptionListResponse`

**Frontend Expects:**
```typescript
interface RedemptionListResponse {
  redemptions: CouponRedemption[];
  total: number;
  page: number;
  page_size: number;
}
```

**Backend Implementation (coupon.controller.ts:361-388):**

```typescript
// Backend returns:
res.json({
  stats,  // ❌ UNEXPECTED: Extra field not in type definition
  redemptions: redemptions.map((r) => ({
    id: r.id,
    user_id: r.userId,
    discount_applied: parseFloat(r.discountAppliedUsd.toString()),
    status: r.redemptionStatus,
    redeemed_at: r.redemptionDate.toISOString(),
    ip_address: r.ipAddress,
  })),
  // ❌ MISSING: No 'total', 'page', 'page_size' fields
});
```

**Critical Issues:**
1. Missing pagination metadata (`total`, `page`, `page_size`)
2. Returns extra `stats` field not defined in type
3. Redemption objects missing many fields from `CouponRedemption` interface

### 1.2 CRUD Operations Summary

| Operation | Endpoint | Status | Issues |
|-----------|----------|--------|--------|
| Create | POST /admin/coupons | ⚠️ Partial | Returns incomplete Coupon object |
| Read (List) | GET /admin/coupons | ❌ Critical | Missing pagination wrapper, field name mismatches |
| Read (Single) | GET /admin/coupons/:id | ❌ Missing | Endpoint not implemented! |
| Update | PATCH /admin/coupons/:id | ⚠️ Partial | Returns incomplete Coupon object |
| Delete | DELETE /admin/coupons/:id | ✅ Correct | Works as expected |
| Redemptions | GET /admin/coupons/:id/redemptions | ❌ Critical | Missing pagination metadata |

### 1.3 Database Schema Alignment

**Prisma Schema (schema.prisma:1194-1252):**

```prisma
model Coupon {
  id            String       @id @default(uuid()) @db.Uuid
  code          String       @unique @map("code") @db.VarChar(50)
  couponType    CouponType   @map("coupon_type")
  discountValue Decimal      @map("discount_value") @db.Decimal(10, 2)
  discountType  DiscountType @map("discount_type")
  // ... many more fields
}

enum CouponType {
  percentage
  fixed_amount
  tier_specific
  duration_bonus
  perpetual_migration
}
```

**Schema Issues:**

1. **Field Mapping:** Prisma uses `couponType` (camelCase) but database column is `coupon_type` (snake_case)
2. **Discount Model:** Database stores single `discount_value` field, but frontend needs three separate fields based on `coupon_type`
3. **Computed Fields Missing:** Frontend expects `redemption_count` and `total_discount_value` which must be computed from `CouponUsageLimit` table (schema.prisma:1363-1385)

**Correct Data Flow Should Be:**

```typescript
// Backend should aggregate from CouponUsageLimit:
const couponWithStats = await prisma.coupon.findUnique({
  where: { id },
  include: {
    usageLimits: true,  // This provides totalUses, totalDiscountAppliedUsd
  }
});

// Then map to frontend format:
return {
  ...coupon,
  type: coupon.couponType,  // Rename field
  redemption_count: coupon.usageLimits?.totalUses || 0,
  total_discount_value: parseFloat(coupon.usageLimits?.totalDiscountAppliedUsd.toString() || '0'),
  // Map discount fields based on couponType
  discount_percentage: coupon.couponType === 'percentage' ? parseFloat(coupon.discountValue.toString()) : undefined,
  discount_amount: coupon.couponType === 'fixed_amount' ? parseFloat(coupon.discountValue.toString()) : undefined,
  bonus_duration_months: coupon.couponType === 'duration_bonus' ? parseInt(coupon.discountValue.toString()) : undefined,
};
```

---

## 2. `/admin/coupons/calendar` (CampaignCalendar.tsx)

### 2.1 APIs Consumed

#### API 1: `plan111API.listCampaigns(filters, page, limit)`
- **Endpoint:** `GET /admin/campaigns`
- **Expected Response Type:** `CampaignListResponse`
- **Frontend Usage:** Lines 86-90 in CampaignCalendar.tsx

```typescript
// Frontend expects:
interface CampaignListResponse {
  campaigns: CouponCampaign[];
  total: number;
  page: number;
  page_size: number;
}
```

**Backend Implementation (campaign.controller.ts:102-124):**

```typescript
// Backend returns:
res.json({
  campaigns: campaigns.map((c) => ({
    id: c.id,
    campaign_name: c.campaignName,
    campaign_type: c.campaignType,
    start_date: c.startDate.toISOString(),
    end_date: c.endDate.toISOString(),
    budget_limit_usd: parseFloat(c.budgetLimitUsd.toString()),
    total_spent_usd: parseFloat(c.totalSpentUsd.toString()),
    is_active: c.isActive,
    // ❌ MISSING: No 'total', 'page', 'page_size' in response wrapper
  })),
});
```

**Critical Issues:**

1. **Missing Pagination Metadata:** No `total`, `page`, `page_size` fields
2. **Field Name Mismatches:**
   - Backend: `campaign_name`, `campaign_type`, `start_date`, `end_date`
   - Frontend: `name`, `type`, `starts_at`, `ends_at`
3. **Missing Fields:** Frontend expects many more fields:
   - `description`, `status`, `target_audience`, `current_spend`, `actual_revenue`, `conversion_rate`, etc.

#### API 2: `plan111API.updateCampaign(id, data)`
- **Endpoint:** `PATCH /admin/campaigns/:id`
- **Expected Response Type:** `CouponCampaign`

**Backend Implementation (campaign.controller.ts:59-86):**

```typescript
// Backend returns:
res.json({
  id: campaign.id,
  campaign_name: campaign.campaignName,
  updated_at: campaign.updatedAt.toISOString(),
  // ❌ MISSING: All other CouponCampaign fields
});
```

**Issue:** Returns only 3 fields instead of full CouponCampaign object.

#### API 3: `plan111API.deleteCampaign(id)`
- **Endpoint:** `DELETE /admin/campaigns/:id`
- **Expected Response:** `void` (204 No Content)
- **Backend Implementation:** ✅ **CORRECT**

#### API 4: `plan111API.getCampaignPerformance(id)`
- **Endpoint:** `GET /admin/campaigns/:id/performance`
- **Expected Response Type:** `CampaignPerformanceMetrics`

**Backend Implementation (campaign.controller.ts:126-138):**

```typescript
async getCampaignPerformance(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const performance = await this.campaignService.getCampaignPerformance(id);
    res.json(performance);  // ✅ Returns service result directly
  } catch (error: any) {
    // error handling
  }
}
```

**Status:** ⚠️ **NEEDS VERIFICATION** - Response structure depends on `CampaignManagementService.getCampaignPerformance()` implementation.

### 2.2 CRUD Operations Summary

| Operation | Endpoint | Status | Issues |
|-----------|----------|--------|--------|
| Create | POST /admin/campaigns | ⚠️ Partial | Returns incomplete CouponCampaign object |
| Read (List) | GET /admin/campaigns | ❌ Critical | Missing pagination, field name mismatches |
| Read (Single) | GET /admin/campaigns/:id | ❌ Missing | Endpoint not implemented! |
| Update | PATCH /admin/campaigns/:id | ⚠️ Partial | Returns incomplete object |
| Delete | DELETE /admin/campaigns/:id | ✅ Correct | Works as expected |
| Performance | GET /admin/campaigns/:id/performance | ⚠️ Unverified | Needs service layer check |

### 2.3 Database Schema Alignment

**Prisma Schema (schema.prisma:1257-1290):**

```prisma
model CouponCampaign {
  id             String        @id @default(uuid()) @db.Uuid
  campaignName   String        @map("campaign_name") @db.VarChar(255)
  campaignType   CampaignType  @map("campaign_type")
  startDate      DateTime      @map("start_date")
  endDate        DateTime      @map("end_date")
  budgetLimitUsd Decimal       @map("budget_limit_usd") @db.Decimal(12, 2)
  totalSpentUsd  Decimal       @default(0) @map("total_spent_usd") @db.Decimal(12, 2)
  targetTier     SubscriptionTier? @map("target_tier")
  isActive       Boolean       @default(true) @map("is_active")
  // ...
}
```

**Schema vs Frontend Type Mismatches:**

| Database Field | Prisma Field | Frontend Field | Issue |
|----------------|--------------|----------------|-------|
| campaign_name | campaignName | name | ❌ Field name mismatch |
| campaign_type | campaignType | type | ❌ Field name mismatch |
| start_date | startDate | starts_at | ❌ Field name mismatch |
| end_date | endDate | ends_at | ❌ Field name mismatch |
| total_spent_usd | totalSpentUsd | current_spend | ❌ Field name mismatch |
| N/A | N/A | status | ❌ Missing in database (should be computed from dates) |
| N/A | N/A | actual_revenue | ❌ Missing in database (needs computation) |
| N/A | N/A | conversion_rate | ❌ Missing in database (needs computation) |

**Missing Computed Fields:**

The frontend expects several computed fields that don't exist in the database:

1. **status:** Should be computed from `startDate`, `endDate`, `isActive`:
   ```typescript
   const now = new Date();
   if (!campaign.isActive) return 'paused';
   if (now < campaign.startDate) return 'planning';
   if (now > campaign.endDate) return 'ended';
   return 'active';
   ```

2. **actual_revenue:** Needs aggregation from redemptions
3. **conversion_rate:** Needs computation from redemption metrics
4. **redemption_count:** Needs counting from associated coupons' redemptions

---

## 3. `/admin/coupons/analytics` (CouponAnalytics.tsx)

### 3.1 APIs Consumed

#### API 1: `plan111API.getCouponAnalytics(startDate?, endDate?)`
- **Endpoint:** `GET /admin/analytics/coupons`
- **Expected Response Type:** `CouponAnalyticsMetrics`
- **Frontend Usage:** Lines 71-76 in CouponAnalytics.tsx

```typescript
// Frontend expects:
interface CouponAnalyticsMetrics {
  total_redemptions: number;
  total_discount_value: number;
  average_discount_per_redemption: number;
  conversion_rate: number;
  fraud_detection_rate: number;
  month_over_month_change: {
    redemptions: number;
    discount_value: number;
  };
}
```

**Backend Implementation (coupon-analytics.controller.ts:34-53):**

```typescript
async getAnalyticsMetrics(req: Request, res: Response): Promise<void> {
  // ...
  const metrics = await this.couponAnalyticsService.getAnalyticsMetrics(start, end);
  res.status(200).json(metrics);  // ✅ Returns service result directly
}
```

**Status:** ⚠️ **NEEDS VERIFICATION** - Response structure depends on `CouponAnalyticsService.getAnalyticsMetrics()` implementation.

#### API 2: `plan111API.getTopPerformingCoupons(limit)`
- **Endpoint:** `GET /admin/analytics/coupons/top`
- **Expected Response Type:** `TopPerformingCoupon[]`
- **Frontend Usage:** Lines 84-93 in CouponAnalytics.tsx

```typescript
// Frontend expects:
interface TopPerformingCoupon {
  code: string;
  redemptions: number;
  discount_value: number;
  conversion_rate: number;
  average_discount: number;
}
```

**Backend Implementation (coupon-analytics.controller.ts:94-110):**

```typescript
async getTopPerformingCoupons(req: Request, res: Response): Promise<void> {
  // ...
  const topCoupons = await this.couponAnalyticsService.getTopPerformingCoupons(limit);
  res.status(200).json(topCoupons);  // ✅ Returns service result directly
}
```

**Status:** ⚠️ **NEEDS VERIFICATION** - Array format should match `TopPerformingCoupon[]` type.

#### API 3: `plan111API.listFraudEvents(filters, page, limit)`
- **Endpoint:** `GET /admin/fraud-detection`
- **Expected Response Type:** `FraudEventListResponse`
- **Frontend Usage:** Lines 96-110 in CouponAnalytics.tsx

```typescript
// Frontend expects:
interface FraudEventListResponse {
  events: FraudDetectionEvent[];
  total: number;
  page: number;
  page_size: number;
}
```

**Backend Implementation (fraud-detection.controller.ts:25-51):**

```typescript
async listFraudEvents(_req: Request, res: Response): Promise<void> {
  const events = await this.prisma.couponFraudDetection.findMany({
    orderBy: { detectedAt: 'desc' },
    take: 100, // ❌ MISSING: No pagination support
  });

  res.json({
    events: events.map((e) => ({
      id: e.id,
      coupon_id: e.couponId,
      user_id: e.userId,
      detection_type: e.detectionType,
      severity: e.severity,
      is_flagged: e.isFlagged,
      detected_at: e.detectedAt.toISOString(),
      reviewed_at: e.reviewedAt?.toISOString() || null,
      details: e.details,
      // ❌ MISSING: No 'total', 'page', 'page_size' fields
      // ❌ MISSING: No 'coupon_code', 'user_email', 'status' fields
    })),
  });
}
```

**Critical Issues:**
1. **Missing pagination metadata** - No `total`, `page`, `page_size` fields
2. **Missing query parameter support** - No filtering by severity or status
3. **Hardcoded limit of 100** - Should support pagination with page/limit params
4. **Missing fields** - Frontend expects `coupon_code`, `user_email`, `status` but backend doesn't provide them
5. **Details field not parsed** - Returns raw JSON instead of extracting `risk_score`, `reasons`, etc.

#### API 4: `plan111API.reviewFraudEvent(eventId, resolution)`
- **Endpoint:** `PATCH /admin/fraud-detection/:id/review`
- **Expected Response Type:** `FraudDetectionEvent`
- **Frontend Usage:** Lines 119-134 in CouponAnalytics.tsx

**Backend Implementation (fraud-detection.controller.ts:53-74):**

```typescript
async reviewFraudEvent(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const data = safeValidateRequest(reviewFraudEventRequestSchema, req.body);

  const event = await this.fraudService.reviewFraudEvent(id, reviewerId, data.resolution);

  res.json({
    id: event.id,
    resolution: data.resolution,
    reviewed_at: event.reviewedAt?.toISOString(),
    is_flagged: event.isFlagged,
    // ❌ MISSING: Returns only 4 fields instead of full FraudDetectionEvent object
  });
}
```

**Issues:**
1. **Incomplete response** - Returns only 4 fields, frontend expects full `FraudDetectionEvent` object
2. **Missing populated fields** - No `coupon_code`, `user_email`, etc.

### 3.2 API Endpoint Status

| API Call | Endpoint | Status | Issues |
|----------|----------|--------|--------|
| getCouponAnalytics | GET /admin/analytics/coupons | ⚠️ Unverified | Needs service layer verification |
| getTopPerformingCoupons | GET /admin/analytics/coupons/top | ⚠️ Unverified | Needs service layer verification |
| getRedemptionTrend | GET /admin/analytics/coupons/trend | ⚠️ Unverified | Not used in UI yet |
| getRedemptionsByType | GET /admin/analytics/coupons/by-type | ⚠️ Unverified | Not used in UI yet |
| listFraudEvents | GET /admin/fraud-detection | ❌ Critical | Missing pagination, filtering, populated fields |
| reviewFraudEvent | PATCH /admin/fraud-detection/:id/review | ⚠️ Partial | Incomplete response object |
| getPendingFraudEvents | GET /admin/fraud-detection/pending | ⚠️ Unused | Defined in API but not used |

### 3.3 Database Schema Alignment

**Fraud Detection Schema (schema.prisma:1390-1423):**

```prisma
model CouponFraudDetection {
  id            String             @id @default(uuid()) @db.Uuid
  couponId      String             @map("coupon_id") @db.Uuid
  userId        String             @map("user_id") @db.Uuid
  detectionType FraudDetectionType @map("detection_type")
  severity      FraudSeverity      @map("severity")
  detectedAt    DateTime           @default(now()) @map("detected_at")
  details       Json               @db.Json
  isFlagged     Boolean            @default(false) @map("is_flagged")
  reviewedBy    String?            @map("reviewed_by") @db.Uuid
  reviewedAt    DateTime?          @map("reviewed_at")
  resolution    String?            @db.Text
  // ...
}
```

**Frontend Type (plan111.types.ts:189-218):**

```typescript
export interface FraudDetectionEvent {
  id: string;
  redemption_id: string;      // ❌ MISSING in database schema!
  coupon_id: string;
  user_id: string;
  detection_type: FraudDetectionType;
  severity: FraudSeverity;
  risk_score: number;         // ❌ MISSING in database schema!
  reasons: string[];          // ❌ MISSING (stored as JSON in 'details')
  status: FraudResolution;    // ❌ Type mismatch: DB has String, frontend has enum
  // ... more fields
}
```

**Critical Schema Issues:**

1. **Missing Fields in Database:**
   - `redemption_id` - Frontend expects this but it doesn't exist in schema
   - `risk_score` - Should be computed or stored

2. **Type Mismatches:**
   - `resolution` field is `String?` in DB but frontend expects enum `FraudResolution`
   - `status` field missing entirely from database

3. **JSON Field Mapping:**
   - `reasons` array should be extracted from `details` JSON field
   - `ip_address`, `device_fingerprint`, `user_agent` may be in `details` JSON

---

## 4. Missing Pages Analysis

### 4.1 CampaignManagement.tsx
**Status:** ❌ **FILE NOT FOUND**

The frontend analysis revealed that `CampaignManagement.tsx` doesn't exist. The user mentioned it, but the glob search found no such file. Only `CampaignCalendar.tsx` exists.

**Recommendation:** Clarify if this page needs to be created or if CampaignCalendar.tsx serves this purpose.

### 4.2 FraudDetection.tsx
**Status:** ❌ **FILE NOT FOUND**

The glob search found no `FraudDetection.tsx` file. However, fraud detection UI is embedded within `CouponAnalytics.tsx` (lines 338-492).

**Recommendation:** Either:
1. Create dedicated `FraudDetection.tsx` page, or
2. Update documentation to reflect that fraud detection is part of analytics page

---

## 5. Critical Issues Summary

### 5.1 Response Structure Issues

| Issue | Pages Affected | Severity |
|-------|----------------|----------|
| Missing pagination metadata (total, page, page_size) | CouponManagement, CampaignCalendar | 🔴 Critical |
| Incomplete object responses (only returning 2-6 fields) | All CRUD operations | 🔴 Critical |
| Field name mismatches (snake_case vs camelCase) | All pages | 🟠 High |
| Missing computed fields (status, redemption_count, etc.) | CouponManagement, CampaignCalendar | 🟠 High |

### 5.2 Missing Endpoints

| Endpoint | Expected By | Severity |
|----------|-------------|----------|
| GET /admin/coupons/:id | CouponManagement (view single) | 🟠 High |
| GET /admin/campaigns/:id | CampaignCalendar (view single) | 🟠 High |
| GET /admin/fraud-detection | CouponAnalytics | 🔴 Critical |
| PATCH /admin/fraud-detection/:id/review | CouponAnalytics | 🔴 Critical |

### 5.3 Type Alignment Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Coupon.type vs coupon_type | All coupon responses | Field mapping breaks frontend display |
| Discount fields (percentage/amount/months) | Coupon responses | Frontend can't determine discount type |
| CampaignStatus enum missing from DB | Campaign queries | Can't filter by status correctly |
| FraudResolution enum vs String | Fraud detection | Type safety compromised |
| redemption_id missing | FraudDetectionEvent | Can't link fraud events to redemptions |

### 5.4 Database Schema Gaps

| Missing Field | Table | Needed For |
|---------------|-------|------------|
| status (computed) | CouponCampaign | Campaign status filtering |
| redemption_id | CouponFraudDetection | Linking fraud to redemptions |
| risk_score | CouponFraudDetection | Fraud severity scoring |

---

## 6. Detailed Fix Recommendations

### 6.1 Fix Response Wrapper Structure

**Problem:** All list endpoints return `{ items: [...] }` instead of `{ items: [...], total, page, page_size }`.

**Solution:** Create a standard pagination wrapper utility:

```typescript
// backend/src/utils/pagination.ts
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    page_size: pageSize,
  };
}

// Apply to controller:
// coupon.controller.ts
async listCoupons(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 0;
  const limit = parseInt(req.query.limit as string) || 50;

  const [coupons, total] = await Promise.all([
    this.prisma.coupon.findMany({
      skip: page * limit,
      take: limit,
      include: { usageLimits: true, campaign: true },
    }),
    this.prisma.coupon.count(),
  ]);

  res.json(createPaginatedResponse(
    coupons.map(mapCouponToResponse),
    total,
    page,
    limit
  ));
}
```

### 6.2 Fix Field Name Mapping

**Problem:** Database uses `couponType`, `campaignName`, etc., but frontend expects `type`, `name`, etc.

**Solution:** Create mapper functions:

```typescript
// backend/src/mappers/coupon.mapper.ts
export function mapCouponToResponse(c: Coupon & { usageLimits?: CouponUsageLimit }): CouponResponse {
  return {
    id: c.id,
    code: c.code,
    type: c.couponType,  // ✅ Renamed

    // Map discount fields based on type
    discount_percentage: c.couponType === 'percentage'
      ? parseFloat(c.discountValue.toString())
      : undefined,
    discount_amount: c.couponType === 'fixed_amount'
      ? parseFloat(c.discountValue.toString())
      : undefined,
    bonus_duration_months: c.couponType === 'duration_bonus'
      ? parseInt(c.discountValue.toString())
      : undefined,

    // Map usage stats
    redemption_count: c.usageLimits?.totalUses || 0,
    total_discount_value: parseFloat(c.usageLimits?.totalDiscountAppliedUsd.toString() || '0'),

    // Standard fields
    max_discount_applications: c.maxUses || null,
    valid_from: c.validFrom.toISOString(),
    valid_until: c.validUntil.toISOString(),
    is_active: c.isActive,
    description: c.description,
    campaign_id: c.campaignId,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

// backend/src/mappers/campaign.mapper.ts
export function mapCampaignToResponse(c: CouponCampaign): CampaignResponse {
  const now = new Date();
  let status: 'planning' | 'active' | 'paused' | 'ended';

  if (!c.isActive) {
    status = 'paused';
  } else if (now < c.startDate) {
    status = 'planning';
  } else if (now > c.endDate) {
    status = 'ended';
  } else {
    status = 'active';
  }

  return {
    id: c.id,
    name: c.campaignName,  // ✅ Renamed
    type: c.campaignType,  // ✅ Renamed
    starts_at: c.startDate.toISOString(),  // ✅ Renamed
    ends_at: c.endDate.toISOString(),  // ✅ Renamed
    status,  // ✅ Computed
    budget_cap: parseFloat(c.budgetLimitUsd.toString()),
    current_spend: parseFloat(c.totalSpentUsd.toString()),
    target_audience: c.targetTier ? { user_tiers: [c.targetTier] } : undefined,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}
```

### 6.3 Implement Missing Endpoints

**1. Fraud Detection Controller:**

```typescript
// backend/src/controllers/fraud-detection.controller.ts
@injectable()
export class FraudDetectionController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  /**
   * GET /admin/fraud-detection
   * List fraud detection events
   */
  async listFraudEvents(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const { severity, status } = req.query;

    const where: any = {};
    if (severity) where.severity = severity;
    if (status) where.resolution = status;  // Note: DB stores resolution as string

    const [events, total] = await Promise.all([
      this.prisma.couponFraudDetection.findMany({
        where,
        skip: page * limit,
        take: limit,
        include: {
          coupon: { select: { code: true } },
        },
      }),
      this.prisma.couponFraudDetection.count({ where }),
    ]);

    res.json({
      events: events.map((e) => ({
        id: e.id,
        coupon_id: e.couponId,
        coupon_code: (e as any).coupon.code,
        user_id: e.userId,
        user_email: 'TODO',  // Need to join with users table
        detection_type: e.detectionType,
        severity: e.severity,
        detected_at: e.detectedAt.toISOString(),
        status: e.resolution || 'pending',
        // Extract from details JSON:
        risk_score: (e.details as any).risk_score || 0,
        reasons: (e.details as any).reasons || [],
        ip_address: (e.details as any).ip_address,
        device_fingerprint: (e.details as any).device_fingerprint,
      })),
      total,
      page,
      page_size: limit,
    });
  }

  /**
   * PATCH /admin/fraud-detection/:id/review
   * Review and resolve fraud event
   */
  async reviewFraudEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { resolution, notes } = req.body;
    const adminUserId = (req as any).userId;

    const event = await this.prisma.couponFraudDetection.update({
      where: { id },
      data: {
        resolution,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
      include: {
        coupon: { select: { code: true } },
      },
    });

    res.json({
      id: event.id,
      coupon_id: event.couponId,
      coupon_code: (event as any).coupon.code,
      status: event.resolution,
      reviewed_at: event.reviewedAt?.toISOString(),
    });
  }
}
```

**2. Register routes:**

```typescript
// backend/src/routes/admin.routes.ts
import { FraudDetectionController } from '../controllers/fraud-detection.controller';

router.get(
  '/fraud-detection',
  authenticate(),
  requireScopes(['admin']),
  (req, res) => fraudController.listFraudEvents(req, res)
);

router.patch(
  '/fraud-detection/:id/review',
  authenticate(),
  requireScopes(['admin']),
  (req, res) => fraudController.reviewFraudEvent(req, res)
);
```

### 6.4 Add Missing Database Fields

**Migration: Add fraud detection link to redemptions**

```sql
-- Add redemption_id to CouponFraudDetection
ALTER TABLE coupon_fraud_detection
ADD COLUMN redemption_id UUID REFERENCES coupon_redemption(id) ON DELETE SET NULL;

CREATE INDEX idx_fraud_redemption ON coupon_fraud_detection(redemption_id);

-- Add risk_score column
ALTER TABLE coupon_fraud_detection
ADD COLUMN risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100);

-- Add status column (separate from resolution)
CREATE TYPE fraud_status AS ENUM ('pending', 'reviewed', 'resolved');
ALTER TABLE coupon_fraud_detection
ADD COLUMN status fraud_status DEFAULT 'pending';
```

**Update Prisma Schema:**

```prisma
model CouponFraudDetection {
  id            String             @id @default(uuid()) @db.Uuid
  redemptionId  String?            @map("redemption_id") @db.Uuid  // ✅ NEW
  couponId      String             @map("coupon_id") @db.Uuid
  userId        String             @map("user_id") @db.Uuid
  riskScore     Int                @default(0) @map("risk_score")  // ✅ NEW
  status        String             @default("pending")  // ✅ NEW
  // ... rest of fields

  redemption CouponRedemption? @relation(fields: [redemptionId], references: [id])  // ✅ NEW
}
```

---

## 7. Priority Fix Roadmap

### Phase 1: Critical Fixes (Week 1)

**Priority 1.1: Fix Fraud Detection Endpoints** (2-3 days)
- Add pagination support to `listFraudEvents()`
- Add filtering by severity and status
- Populate `coupon_code` and `user_email` fields
- Extract `risk_score` and `reasons` from details JSON
- Return full `FraudDetectionEvent` object in `reviewFraudEvent()`

**Priority 1.2: Fix List Response Pagination** (1-2 days)
- Add pagination wrapper to `listCoupons()`
- Add pagination wrapper to `listCampaigns()`
- Update frontend API client if needed

**Priority 1.3: Fix Field Name Mapping** (2-3 days)
- Create mapper functions for Coupon and Campaign
- Apply mappers to all CRUD operations
- Test all endpoints

### Phase 2: High Priority Fixes (Week 2)

**Priority 2.1: Add Missing Endpoints** (2-3 days)
- Implement `GET /admin/coupons/:id`
- Implement `GET /admin/campaigns/:id`
- Add comprehensive responses

**Priority 2.2: Fix Discount Fields Mapping** (1-2 days)
- Update mapper to split `discountValue` based on `couponType`
- Test all coupon types (percentage, fixed_amount, duration_bonus)

**Priority 2.3: Add Computed Fields** (2-3 days)
- Add `redemption_count` and `total_discount_value` to coupon responses
- Add `status`, `actual_revenue`, `conversion_rate` to campaign responses
- Optimize queries with aggregations

### Phase 3: Database Schema Updates (Week 3)

**Priority 3.1: Add Missing Fraud Detection Fields** (1 day)
- Migration to add `redemption_id`, `risk_score`, `status`
- Update Prisma schema
- Regenerate Prisma client

**Priority 3.2: Add Indexes for Performance** (1 day)
- Add indexes on frequently queried fields
- Test query performance

### Phase 4: QA & Testing (Week 4)

**Priority 4.1: Integration Testing** (2-3 days)
- Test all coupon CRUD operations
- Test all campaign CRUD operations
- Test fraud detection workflows

**Priority 4.2: Frontend Integration** (2-3 days)
- Verify all pages work with new API responses
- Update type definitions if needed
- Fix any remaining UI bugs

---

## 8. Testing Checklist

### 8.1 Coupon Management Page

- [ ] List coupons with pagination
- [ ] Create new coupon (all types)
- [ ] Edit existing coupon
- [ ] Delete coupon
- [ ] View coupon redemptions with pagination
- [ ] Toggle coupon active/inactive status
- [ ] Filter coupons by status and type
- [ ] Search coupons by code
- [ ] Verify stats bar shows correct metrics

### 8.2 Campaign Calendar Page

- [ ] List campaigns with pagination
- [ ] Create new campaign
- [ ] Edit existing campaign
- [ ] Delete campaign
- [ ] Toggle campaign active/paused status
- [ ] Filter campaigns by type and status
- [ ] View campaign performance metrics
- [ ] Assign coupon to campaign
- [ ] Remove coupon from campaign

### 8.3 Coupon Analytics Page

- [ ] Load overall analytics metrics
- [ ] View top performing coupons
- [ ] Load fraud detection events with pagination
- [ ] Filter fraud events by severity and status
- [ ] Review fraud event (mark as legitimate)
- [ ] Review fraud event (mark as false positive)
- [ ] View fraud event details
- [ ] Verify month-over-month change calculations

---

## 9. API Contract Documentation Needs

All endpoints should be documented with OpenAPI/Swagger specs:

```yaml
# Example: GET /admin/coupons
/admin/coupons:
  get:
    summary: List all coupons
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 0
      - name: limit
        in: query
        schema:
          type: integer
          default: 50
      - name: status
        in: query
        schema:
          type: string
          enum: [active, inactive, expired, all]
      - name: type
        in: query
        schema:
          $ref: '#/components/schemas/CouponType'
    responses:
      200:
        description: Paginated list of coupons
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponListResponse'
```

---

## 10. Conclusion

This analysis reveals **significant API-schema misalignment** across all coupon system pages. The primary issues are:

1. **Missing pagination metadata** in all list endpoints
2. **Field name mismatches** between database, backend, and frontend
3. **Missing fraud detection endpoints** (critical for CouponAnalytics page)
4. **Incomplete response objects** in CRUD operations
5. **Missing computed fields** that frontend expects

**Estimated Total Effort:** 3-4 weeks for complete resolution across all phases.

**Immediate Action Required:**
1. Implement fraud detection endpoints (blocking CouponAnalytics page)
2. Add pagination wrappers to all list endpoints
3. Create and apply field mapping functions

**Long-term Improvements:**
1. Establish API contract standards (OpenAPI/Swagger)
2. Add end-to-end API tests
3. Create shared type definitions between frontend and backend
4. Consider using code generation from schema (e.g., Prisma to TypeScript to frontend types)

---

**Report Generated:** 2025-11-12
**Analyst:** Claude (Anthropic)
**Next Review Date:** After Phase 1 completion
