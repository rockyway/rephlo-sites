# Coupon System API Issues - Quick Reference

**Generated:** 2025-11-12
**Full Report:** docs/analysis/coupon-system-api-schema-analysis.md

---

## Critical Issues (Must Fix Immediately)

### 1. Missing Pagination Metadata - ALL List Endpoints

**Affected Endpoints:**
- `GET /admin/coupons`
- `GET /admin/campaigns`
- `GET /admin/fraud-detection`
- `GET /admin/coupons/:id/redemptions`

**Issue:**
```typescript
// Backend returns:
{ coupons: [...] }

// Frontend expects:
{ coupons: [...], total: 100, page: 0, page_size: 50 }
```

**Impact:** Frontend pagination controls don't work, always shows "page 1 of 1"

**Fix Priority:** 🔴 Critical - Week 1

---

### 2. Field Name Mismatches

**Coupon Fields:**
| Backend Returns | Frontend Expects |
|-----------------|------------------|
| `coupon_type` | `type` |
| `discount_value` | `discount_percentage` / `discount_amount` / `bonus_duration_months` |
| `total_uses` | `redemption_count` |
| N/A | `total_discount_value` |

**Campaign Fields:**
| Backend Returns | Frontend Expects |
|-----------------|------------------|
| `campaign_name` | `name` |
| `campaign_type` | `type` |
| `start_date` | `starts_at` |
| `end_date` | `ends_at` |
| `total_spent_usd` | `current_spend` |
| N/A | `status` (computed) |

**Impact:** Frontend displays undefined or wrong values

**Fix Priority:** 🔴 Critical - Week 1

---

### 3. Fraud Detection Missing Features

**Endpoint:** `GET /admin/fraud-detection`

**Missing:**
- Pagination (hardcoded limit of 100)
- Filtering by severity/status
- `coupon_code` field (requires join with Coupon table)
- `user_email` field (requires join with User table)
- `status` field (currently returns `is_flagged` boolean instead)
- Parsed `risk_score` and `reasons` from details JSON

**Impact:** Analytics page can't filter fraud events, shows incomplete data

**Fix Priority:** 🔴 Critical - Week 1

---

## High Priority Issues

### 4. Incomplete CRUD Responses

**Affected Operations:**
- `POST /admin/coupons` - Returns 6 fields instead of full Coupon object
- `PATCH /admin/coupons/:id` - Returns 3 fields instead of full Coupon object
- `POST /admin/campaigns` - Returns 3 fields instead of full CouponCampaign object
- `PATCH /admin/campaigns/:id` - Returns 3 fields instead of full CouponCampaign object

**Issue:** Frontend expects full object after create/update to refresh UI state

**Impact:** Frontend must make additional GET request after each create/update

**Fix Priority:** 🟠 High - Week 2

---

### 5. Missing GET Single Item Endpoints

**Missing Endpoints:**
- `GET /admin/coupons/:id` - View single coupon details
- `GET /admin/campaigns/:id` - View single campaign details

**Impact:** Frontend can't implement "View Details" modals without these endpoints

**Fix Priority:** 🟠 High - Week 2

---

## Database Schema Issues

### 6. Missing Computed Fields

**Coupons:**
- `redemption_count` - Must aggregate from `CouponUsageLimit.totalUses`
- `total_discount_value` - Must aggregate from `CouponUsageLimit.totalDiscountAppliedUsd`

**Campaigns:**
- `status` - Must compute from `startDate`, `endDate`, `isActive`
- `actual_revenue` - Must aggregate from redemptions
- `conversion_rate` - Must compute from metrics

**Fix Priority:** 🟠 High - Week 2

---

### 7. FraudDetectionEvent Schema Gaps

**Missing Database Fields:**
- `redemption_id` - Link to redemption that triggered fraud detection
- `risk_score` - Integer 0-100 (currently in details JSON)
- `status` - Enum ('pending', 'reviewed', 'resolved')

**Type Mismatches:**
- `resolution` field is String in DB but should be FraudResolution enum

**Fix Priority:** 🟡 Medium - Week 3

---

## Quick Fix Code Examples

### Fix Pagination Wrapper

```typescript
// backend/src/utils/pagination.ts
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return {
    data,
    total,
    page,
    page_size: pageSize,
  };
}

// Usage in controller:
const [coupons, total] = await Promise.all([
  this.prisma.coupon.findMany({ skip: page * limit, take: limit }),
  this.prisma.coupon.count(),
]);

res.json(createPaginatedResponse(coupons.map(mapCouponToResponse), total, page, limit));
```

---

### Fix Field Name Mapping

```typescript
// backend/src/mappers/coupon.mapper.ts
export function mapCouponToResponse(c: Coupon & { usageLimits?: CouponUsageLimit }) {
  return {
    ...c,
    type: c.couponType,  // ✅ Renamed
    discount_percentage: c.couponType === 'percentage' ? parseFloat(c.discountValue.toString()) : undefined,
    discount_amount: c.couponType === 'fixed_amount' ? parseFloat(c.discountValue.toString()) : undefined,
    bonus_duration_months: c.couponType === 'duration_bonus' ? parseInt(c.discountValue.toString()) : undefined,
    redemption_count: c.usageLimits?.totalUses || 0,
    total_discount_value: parseFloat(c.usageLimits?.totalDiscountAppliedUsd.toString() || '0'),
  };
}
```

---

### Fix Fraud Detection Pagination

```typescript
// backend/src/controllers/fraud-detection.controller.ts
async listFraudEvents(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 0;
  const limit = parseInt(req.query.limit as string) || 50;
  const { severity, status } = req.query;

  const where: any = {};
  if (severity) where.severity = severity;
  if (status) where.resolution = status;

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
      ...e,
      coupon_code: (e as any).coupon.code,
      risk_score: (e.details as any).risk_score || 0,
      reasons: (e.details as any).reasons || [],
      status: e.resolution || 'pending',
    })),
    total,
    page,
    page_size: limit,
  });
}
```

---

## Testing Checklist

### Before Deployment:

- [ ] All list endpoints return `{ items, total, page, page_size }`
- [ ] All coupon responses use `type` field (not `coupon_type`)
- [ ] All campaign responses use `name`, `starts_at`, `ends_at` fields
- [ ] Fraud detection supports pagination and filtering
- [ ] Fraud detection populates `coupon_code` and `user_email`
- [ ] Create/Update operations return full objects
- [ ] Computed fields (redemption_count, status, etc.) are populated

### Frontend Integration Tests:

- [ ] Coupon list pagination works correctly
- [ ] Campaign list pagination works correctly
- [ ] Fraud event list shows all fields
- [ ] Create coupon updates UI without extra fetch
- [ ] Edit coupon updates UI without extra fetch
- [ ] Filter fraud events by severity
- [ ] Filter fraud events by status

---

## Estimated Effort

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Fix pagination, field mappings, fraud detection | Week 1 (5 days) |
| Phase 2 | Add missing endpoints, complete CRUD responses | Week 2 (5 days) |
| Phase 3 | Database schema updates, add indexes | Week 3 (3 days) |
| Phase 4 | QA testing, frontend integration | Week 4 (5 days) |

**Total:** ~18 working days (3.5-4 weeks)

---

## Next Steps

1. **Immediate (This Week):**
   - Create pagination wrapper utility
   - Apply to all list endpoints
   - Create field mapper functions

2. **Week 2:**
   - Implement missing GET single item endpoints
   - Fix CRUD response completeness
   - Add computed field population

3. **Week 3:**
   - Database migration for fraud detection fields
   - Update Prisma schema
   - Add performance indexes

4. **Week 4:**
   - Comprehensive integration testing
   - Frontend verification
   - Document all API endpoints with OpenAPI

---

**Report Author:** Claude Code Analysis
**Last Updated:** 2025-11-12
**Status:** Ready for Implementation
