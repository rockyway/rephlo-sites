# Production Readiness - TODO Implementation Plan

**Document ID:** 159
**Created:** 2025-11-13
**Status:** 📋 Planning
**Priority:** 🔴 Critical (Pre-Launch Requirement)

---

## Executive Summary

This document provides a comprehensive analysis of all TODO comments across the Rephlo codebase and categorizes them by **criticality for production launch**. Out of **68 total TODOs identified**, this plan recommends completing **23 critical items** before production launch, deferring **33 items** to post-launch, and documenting **12 items** as intentional decisions.

### Quick Statistics
- **Total TODOs Found:** 68
- **Backend TODOs:** 42
- **Frontend TODOs:** 26
- **Identity Provider TODOs:** 0 ✅
- **Critical for Launch:** 23 items
- **Post-Launch:** 33 items
- **Documentation Only:** 12 items

---

## 1. CRITICAL FOR PRODUCTION LAUNCH (23 items)

These TODOs represent security vulnerabilities, incomplete core functionality, or user-facing issues that MUST be resolved before going live.

### 1.1 Security & Authentication (Priority: 🔴 Critical)

#### Backend: Social Auth State Management
**Files:**
- `backend/src/controllers/social-auth.controller.ts:93`
- `backend/src/controllers/social-auth.controller.ts:158`

**Issue:** OAuth state stored in memory (vulnerable to CSRF attacks in production)

**TODO Comment:**
```typescript
// TODO: Store state in Redis or session store for production
// TODO: Implement proper state verification with session/Redis store
```

**Implementation:**
```typescript
// Before (vulnerable):
const state = crypto.randomBytes(16).toString('hex');
this.stateCache.set(state, { userId, timestamp: Date.now() });

// After (production-ready):
await redis.setex(`oauth:state:${state}`, 600, JSON.stringify({
  userId,
  timestamp: Date.now(),
  expiresAt: Date.now() + 600000
}));
```

**Estimated Effort:** 4 hours
**Dependencies:** Redis already configured
**Risk if Not Fixed:** High - CSRF vulnerability in OAuth flow

---

#### Backend: OIDC Session Integration
**Files:**
- `backend/src/routes/social-auth.routes.ts:93`
- `backend/src/controllers/social-auth.controller.ts:131`
- `backend/src/controllers/social-auth.controller.ts:198`

**Issue:** Social auth doesn't create proper OIDC sessions

**TODO Comment:**
```typescript
// TODO: integrate with OIDC provider
// TODO: Integrate with OIDC provider to create proper session
```

**Implementation:** Connect social auth callback to identity-provider's session creation

**Estimated Effort:** 8 hours
**Dependencies:** Identity provider integration
**Risk if Not Fixed:** Medium - Users can't use social login properly

---

### 1.2 Rate Limiting & Production Safety (Priority: 🔴 Critical)

#### Backend: Remove Debug Bypass
**File:** `backend/src/middleware/ratelimit.middleware.ts:209`

**Issue:** Rate limiting bypass enabled in code

**TODO Comment:**
```typescript
// TODO: Remove in production or restrict to admin users
if (req.headers['x-bypass-rate-limit'] === 'true') {
  return next();
}
```

**Implementation:** Remove completely or restrict to admin role validation

**Estimated Effort:** 1 hour
**Risk if Not Fixed:** Critical - Anyone can bypass rate limits

---

#### Backend: Actual Redis Usage Tracking
**File:** `backend/src/middleware/ratelimit.middleware.ts:397`

**TODO Comment:**
```typescript
// TODO: Fetch actual usage from Redis
```

**Implementation:** Query Redis for real-time usage instead of mock data

**Estimated Effort:** 2 hours
**Risk if Not Fixed:** Medium - Inaccurate rate limit reporting

---

### 1.3 User Management Core Features (Priority: 🔴 Critical)

#### Backend: User Suspension Logic
**File:** `backend/src/controllers/admin.controller.ts:387`

**TODO Comment:**
```typescript
// TODO: Implement user suspension logic
```

**Current State:** Endpoint exists but returns mock response

**Implementation:**
```typescript
// Add to user-management.service.ts:
async suspendUser(userId: string, reason: string, suspendedUntil: Date) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Update user.suspendedUntil
    // 2. Create suspension record with reason
    // 3. Revoke all active tokens (call OIDC provider)
    // 4. Create audit log entry
    // 5. Send suspension email notification
  });
}
```

**Estimated Effort:** 6 hours
**Dependencies:** Email service, OIDC token revocation
**Risk if Not Fixed:** High - Admin can't moderate users

---

#### Frontend: User Suspend/Ban Actions
**Files:**
- `frontend/src/pages/admin/users/UserDetailUnified.tsx:258`
- `frontend/src/pages/admin/users/UserDetailUnified.tsx:270`

**TODO Comment:**
```typescript
// TODO: Implement suspend logic
// TODO: Implement ban logic
```

**Implementation:** Wire up existing UI buttons to backend APIs

**Estimated Effort:** 3 hours
**Risk if Not Fixed:** High - UI buttons don't work

---

#### Backend: Add 'admin_deduction' Source
**File:** `backend/src/services/user-management.service.ts:673`

**TODO Comment:**
```typescript
source: amount > 0 ? 'admin_grant' : 'admin_grant', // TODO: Add 'admin_deduction' source
```

**Implementation:**
```prisma
// Update Prisma enum:
enum CreditSource {
  admin_grant
  admin_deduction  // ADD THIS
  subscription_allocation
  bonus
  refund
}
```

**Estimated Effort:** 2 hours (migration + update)
**Risk if Not Fixed:** Medium - Credit audit trail is unclear

---

### 1.4 Billing & Stripe Integration (Priority: 🔴 Critical)

#### Backend: Payment Method Type Detection
**File:** `backend/src/services/billing-payments.service.ts:306`

**TODO Comment:**
```typescript
paymentMethodType: 'card', // TODO: Get actual payment method type
```

**Implementation:** Query Stripe API for payment method details

**Estimated Effort:** 2 hours
**Risk if Not Fixed:** Low - Cosmetic issue in reports

---

#### Backend: User ID from Stripe Customer
**File:** `backend/src/services/billing-payments.service.ts:412`

**TODO Comment:**
```typescript
userId: invoice.customer_email || '', // TODO: Get userId from customer metadata
```

**Implementation:**
```typescript
const customer = await stripe.customers.retrieve(invoice.customer);
const userId = customer.metadata.userId;
```

**Estimated Effort:** 2 hours
**Risk if Not Fixed:** Medium - Invoice tracking broken

---

#### Backend: Credit Allocation on Invoice Payment
**File:** `backend/src/services/billing-payments.service.ts:426`

**TODO Comment:**
```typescript
// TODO: Allocate credits for the billing period
```

**Implementation:** Call CreditService to allocate monthly credits when invoice is paid

**Estimated Effort:** 4 hours
**Risk if Not Fixed:** Critical - Users don't get credits after paying!

---

#### Backend: Stripe Integration in Checkout
**Files:**
- `backend/src/services/checkout-integration.service.ts:121`
- `backend/src/services/checkout-integration.service.ts:132`

**TODO Comment:**
```typescript
// TODO: Integrate with Stripe service
```

**Implementation:** Wire checkout flow to Stripe API

**Estimated Effort:** 8 hours
**Risk if Not Fixed:** Critical - Can't process payments

---

### 1.5 Frontend UI Blockers (Priority: 🔴 Critical)

#### Frontend: Logout Implementation
**File:** `frontend/src/components/admin/layout/AdminHeader.tsx:131`

**TODO Comment:**
```typescript
// TODO: Implement logout
```

**Implementation:** Call auth service logout + redirect to login

**Estimated Effort:** 2 hours
**Risk if Not Fixed:** High - Admins can't log out!

---

#### Frontend: Profile Navigation
**File:** `frontend/src/components/admin/layout/AdminHeader.tsx:114`

**TODO Comment:**
```typescript
// TODO: Navigate to profile
```

**Implementation:** Add route to admin profile page

**Estimated Effort:** 1 hour
**Risk if Not Fixed:** Low - Cosmetic

---

### 1.6 Schema Additions (Priority: 🔴 Critical)

#### Backend: User Suspension Table
**File:** `backend/src/services/user-management.service.ts:389`

**TODO Comment:**
```typescript
// TODO: Create user_suspension record (need to add this table to schema)
```

**Implementation:**
```prisma
model UserSuspension {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @db.Uuid
  reason         String
  suspendedBy    String   @db.Uuid // Admin user ID
  suspendedAt    DateTime @default(now())
  suspendedUntil DateTime?
  liftedAt       DateTime?
  liftedBy       String?  @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_suspensions")
}
```

**Estimated Effort:** 3 hours (migration + service integration)
**Risk if Not Fixed:** Critical - Can't track suspension history

---

#### Backend: Ban Reason Metadata
**File:** `backend/src/services/user-management.service.ts:476`

**TODO Comment:**
```typescript
// TODO: Store ban reason in separate table or use metadata field
```

**Implementation:** Add `UserBan` model similar to `UserSuspension`

**Estimated Effort:** 2 hours
**Risk if Not Fixed:** Medium - No ban audit trail

---

#### Backend: cancelAtPeriodEnd Field
**File:** `backend/src/utils/typeMappers.ts:148`

**TODO Comment:**
```typescript
cancelAtPeriodEnd: false, // TODO: Add this field to schema if needed
```

**Implementation:** Add field to `Subscription` model

**Estimated Effort:** 1 hour
**Risk if Not Fixed:** Low - Feature doesn't exist yet

---

### 1.7 Error Reporting (Priority: 🔴 Critical)

#### Frontend: Sentry Integration
**File:** `frontend/src/components/admin/utility/ErrorBoundary.tsx:51`

**TODO Comment:**
```typescript
// TODO: Send error to error reporting service (e.g., Sentry)
```

**Implementation:**
```typescript
import * as Sentry from '@sentry/react';

logErrorDetails(error: Error, errorInfo: React.ErrorInfo) {
  console.error('Error caught by ErrorBoundary:', error, errorInfo);

  // Send to Sentry
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

**Estimated Effort:** 4 hours (setup + config)
**Risk if Not Fixed:** High - No visibility into production errors

---

### 1.8 Test Webhook Functionality (Priority: 🟡 Medium)

#### Backend: Send Test Webhook
**File:** `backend/src/controllers/admin.controller.ts:726`

**TODO Comment:**
```typescript
// TODO: Implement WebhookService.sendTestWebhook method
```

**Implementation:** Add method to webhook service to send test payload

**Estimated Effort:** 3 hours
**Risk if Not Fixed:** Low - Admin testing feature

---

### 1.9 Settings Service Features (Priority: 🟡 Medium)

#### Backend: Email Test
**File:** `backend/src/services/settings.service.ts:374`

**TODO Comment:**
```typescript
// TODO: Implement actual email sending test with nodemailer
```

**Estimated Effort:** 2 hours
**Risk if Not Fixed:** Low - Admin testing feature

---

#### Backend: Cache Clearing
**File:** `backend/src/services/settings.service.ts:394`

**TODO Comment:**
```typescript
// TODO: Implement cache clearing (Redis, in-memory cache, etc.)
```

**Estimated Effort:** 3 hours
**Risk if Not Fixed:** Low - Manual Redis flush works

---

#### Backend: Database Backup
**File:** `backend/src/services/settings.service.ts:405`

**TODO Comment:**
```typescript
// TODO: Implement database backup
```

**Estimated Effort:** 6 hours
**Risk if Not Fixed:** Medium - Should use external backup solution (AWS RDS automated backups)

---

**CRITICAL SECTION SUMMARY:**
- **Total Items:** 23
- **Estimated Total Effort:** ~77 hours (~10 days)
- **Must Complete Before Launch:** Yes

---

## 2. POST-LAUNCH FEATURES (33 items)

These TODOs represent enhancements, analytics, and non-critical features that can be implemented after initial launch.

### 2.1 Analytics & Reporting (10 items)

#### Conversion Rate Tracking
**Files:**
- `backend/src/services/campaign-management.service.ts:160`
- `backend/src/services/campaign-management.service.ts:183`
- `frontend/src/api/plan109.ts:580`
- `frontend/src/pages/admin/CouponManagement.tsx:137`

**Rationale:** Analytics are important but not blocking for launch

**Estimated Effort:** 12 hours total
**Priority:** Post-launch Week 1

---

#### MRR Growth Calculation
**File:** `backend/src/controllers/analytics.controller.ts:309`

**TODO:**
```typescript
const mrrGrowth = 0; // TODO: Calculate month-over-month growth
```

**Priority:** Post-launch Month 1

---

#### Historical Data Comparison
**File:** `backend/src/services/platform-analytics.service.ts:635`

**Priority:** Post-launch Month 1

---

#### Tier Change Tracking
**File:** `backend/src/services/platform-analytics.service.ts:559`

**Priority:** Post-launch Month 1

---

### 2.2 Advanced Credit Management (8 items)

#### Rollover/Bonus Credits
**File:** `backend/src/services/credit-deduction.service.ts:255`

**TODO:**
```typescript
// TODO: Implement when rollover/bonus credits are added
```

**Priority:** Post-launch Quarter 1 (feature not yet designed)

---

#### Credit Balance Integration (Plan 112)
**Files:**
- `backend/src/services/credit-management.service.ts:277`
- `backend/src/services/credit-management.service.ts:326`
- `backend/src/services/credit-management.service.ts:456`
- `backend/src/services/credit-management.service.ts:496`
- `backend/src/services/coupon-validation.service.ts:580`
- `backend/src/services/subscription-management.service.ts:525`
- `backend/src/services/user-management.service.ts:736`

**Rationale:** Plan 112 integration is a separate project (already partially complete)

**Priority:** Post-launch Month 2

---

#### Subscription Rollover Logic
**File:** `backend/src/services/subscription-management.service.ts:571`

**Priority:** Post-launch Quarter 1

---

### 2.3 Proration & Discounts (3 items)

#### Proration Integration (Plan 110)
**File:** `backend/src/services/subscription-management.service.ts:230`

**TODO:**
```typescript
// TODO: Implement proration logic (integration with Plan 110)
```

**Priority:** Post-launch Month 1

---

#### Discount Duration Storage
**File:** `backend/src/services/checkout-integration.service.ts:177`

**TODO:**
```typescript
// TODO: Store discount duration and revert after N months
```

**Priority:** Post-launch Quarter 1 (advanced feature)

---

### 2.4 Frontend Feature Enhancements (12 items)

#### Mock API Replacements
**Files:**
- `frontend/src/pages/admin/CreditManagement.tsx:133, 243, 276, 298`
- `frontend/src/pages/admin/DeviceActivationManagement.tsx:119, 245, 269, 299`
- `frontend/src/pages/admin/coupons/CampaignManagement.tsx:107, 227, 255`
- `frontend/src/pages/admin/coupons/FraudDetection.tsx:128, 269, 294, 314`

**Rationale:** These pages use mock data but backend APIs exist or will be completed in critical section

**Priority:** Post-launch Week 2 (wire up real APIs)

---

#### CSV Export
**File:** `frontend/src/components/admin/coupons/ViewRedemptionsModal.tsx:118`

**TODO:**
```typescript
// TODO: Implement CSV export
```

**Priority:** Post-launch Month 1

---

#### Pagination UI
**File:** `frontend/src/pages/admin/CampaignCalendar.tsx:55`

**Priority:** Post-launch Month 1

---

#### Adjust Credits Modal
**File:** `frontend/src/pages/admin/users/UserDetailUnified.tsx:279`

**TODO:**
```typescript
// TODO: Implement adjust credits logic
```

**Rationale:** Basic credit adjustment works (fixed earlier), this is enhanced modal

**Priority:** Post-launch Week 2

---

### 2.5 Admin Tools (Remaining)

#### Fraud Event Tracking
**File:** `frontend/src/pages/admin/CouponManagement.tsx:137`

**TODO:**
```typescript
fraudEventsFlagged: 0, // TODO: Add fraud events API
```

**Priority:** Post-launch Month 2 (fraud detection system not fully designed)

---

**POST-LAUNCH SECTION SUMMARY:**
- **Total Items:** 33
- **Estimated Total Effort:** ~80 hours
- **Recommended Timeline:**
  - Week 1-2: Wire mock APIs, basic analytics
  - Month 1: MRR tracking, proration
  - Quarter 1: Advanced features (rollover, discounts)

---

## 3. DOCUMENTATION ONLY (12 items)

These TODOs are either informational, intentional design decisions, or non-actionable comments that should be documented but not changed.

### 3.1 License Key Format Documentation

**Files:**
- `backend/src/services/license-management.service.ts:107`
- `frontend/src/lib/plan110.utils.ts:15`
- `frontend/src/pages/admin/DeviceActivationManagement.tsx:128`
- `frontend/src/pages/admin/users/UserDetailUnified.tsx:1281`
- `backend/src/services/__tests__/checkout-integration.service.test.ts:79, 94, 275`

**Comment:**
```typescript
// Format: REPHLO-XXXX-XXXX-XXXX-XXXX (16 chars excluding dashes)
```

**Action:** These are documentation comments explaining the license key format. No code changes needed.

---

### 3.2 Schema Field Notes (Intentional Design)

#### redemptionId Field
**File:** `backend/src/utils/typeMappers.ts:375`

**TODO:**
```typescript
redemptionId: null, // TODO: Add this field to schema
```

**Decision:** This field was considered but decided against. Remove TODO comment and document decision.

---

### 3.3 Legacy Admin Routes
**File:** `frontend/src/App.tsx:29`

**TODO:**
```typescript
// Legacy admin routes (TODO: migrate to AdminLayout)
```

**Decision:** Routes are already in AdminLayout. Remove TODO comment.

---

### 3.4 Session/Token Invalidation (Optional Enhancement)
**File:** `backend/src/controllers/auth-management.controller.ts:616`

**TODO:**
```typescript
// TODO: Optionally invalidate all existing sessions/tokens for this user
```

**Decision:** Password change already forces logout. Additional token revocation is enhancement.

---

### 3.5 S3 Upload (Future Enhancement)
**File:** `backend/src/controllers/branding.controller.ts:416`

**TODO:**
```typescript
// TODO: In Phase 3 stretch goal, upload to S3 here
```

**Decision:** Local storage is sufficient for MVP. Document as future enhancement.

---

### 3.6 Billing Endpoint Implementations (Partial APIs)

**Files:**
- `backend/src/controllers/billing.controller.ts:157` (listPaymentMethods)
- `backend/src/controllers/billing.controller.ts:213` (getUpcomingInvoice)
- `backend/src/controllers/billing.controller.ts:268` (user-specific invoice filtering)
- `backend/src/controllers/billing.controller.ts:335` (user-specific transaction filtering)
- `backend/src/controllers/billing.controller.ts:393` (refundTransaction)

**Decision:** These are admin-only endpoints. Basic functionality exists; enhancements can be post-launch.

**Action:** Move to Post-Launch section if admin needs them, otherwise document as "Admin enhancement features".

---

**DOCUMENTATION SECTION SUMMARY:**
- **Total Items:** 12
- **Effort:** 4 hours (cleanup + documentation)
- **Action:** Update code comments to reflect decisions

---

## 4. IMPLEMENTATION ROADMAP

### Phase 1: Pre-Launch Critical (10 business days)

**Week 1 (Days 1-5):**
1. ✅ Remove rate limit bypass (1 hour) - **DAY 1**
2. ✅ Implement user suspension logic (6 hours) - **DAY 1-2**
3. ✅ Add user suspension schema (3 hours) - **DAY 2**
4. ✅ Wire frontend suspend/ban buttons (3 hours) - **DAY 2**
5. ✅ OAuth state to Redis (4 hours) - **DAY 3**
6. ✅ OIDC session integration (8 hours) - **DAY 3-4**
7. ✅ Add admin_deduction source (2 hours) - **DAY 4**
8. ✅ Stripe credit allocation (4 hours) - **DAY 5**
9. ✅ Stripe checkout integration (8 hours) - **DAY 5**

**Week 2 (Days 6-10):**
10. ✅ Payment method type detection (2 hours) - **DAY 6**
11. ✅ User ID from Stripe (2 hours) - **DAY 6**
12. ✅ Redis usage tracking (2 hours) - **DAY 6**
13. ✅ Frontend logout (2 hours) - **DAY 7**
14. ✅ Frontend profile navigation (1 hour) - **DAY 7**
15. ✅ Sentry error reporting (4 hours) - **DAY 7**
16. ✅ Ban reason schema (2 hours) - **DAY 8**
17. ✅ Test webhook method (3 hours) - **DAY 8**
18. ✅ Email test (2 hours) - **DAY 9**
19. ✅ Cache clearing (3 hours) - **DAY 9**
20. ✅ Database backup (6 hours) - **DAY 10**
21. ✅ cancelAtPeriodEnd field (1 hour) - **DAY 10**
22. ✅ QA Testing (8 hours) - **DAY 10**
23. ✅ Documentation cleanup (4 hours) - **DAY 10**

**Total:** 77 hours (~10 business days with 8-hour days)

---

### Phase 2: Post-Launch Week 1-2

1. Wire mock APIs to real backends (12 hours)
2. Basic analytics (conversion rates, MRR growth) (8 hours)
3. CSV export (4 hours)
4. Adjust credits modal enhancement (2 hours)

**Total:** 26 hours

---

### Phase 3: Post-Launch Month 1

1. Historical data comparison (6 hours)
2. Tier change tracking (4 hours)
3. Pagination UI (4 hours)
4. Proration integration (8 hours)

**Total:** 22 hours

---

### Phase 4: Post-Launch Quarter 1

1. Rollover/bonus credits (16 hours)
2. Discount duration storage (6 hours)
3. Fraud event tracking (12 hours)

**Total:** 34 hours

---

## 5. RISK ANALYSIS

### High-Risk Items (Must Complete)

| Item | Risk Level | Impact if Skipped |
|------|-----------|-------------------|
| Remove rate limit bypass | 🔴 Critical | Security breach - anyone can spam API |
| OAuth state in Redis | 🔴 Critical | CSRF attacks on social login |
| User suspension logic | 🔴 Critical | Can't moderate users |
| Stripe credit allocation | 🔴 Critical | Paying customers don't get credits |
| Stripe checkout | 🔴 Critical | Can't process payments |
| Sentry error reporting | 🔴 Critical | Blind to production errors |
| Frontend logout | 🔴 Critical | Security issue - can't log out |

### Medium-Risk Items (Strongly Recommended)

| Item | Risk Level | Impact if Skipped |
|------|-----------|-------------------|
| OIDC session integration | 🟡 Medium | Social login partially broken |
| Ban reason tracking | 🟡 Medium | No audit trail for bans |
| Suspension schema | 🟡 Medium | No suspension history |
| Redis usage tracking | 🟡 Medium | Inaccurate rate limit reporting |

### Low-Risk Items (Can Defer)

- Analytics features (conversion rates, growth metrics)
- CSV exports
- Admin testing tools (webhook test, email test)
- Pagination UI improvements

---

## 6. TESTING REQUIREMENTS

### Critical Items Testing Checklist

#### Security Testing
- [ ] Verify rate limit bypass is completely removed
- [ ] Test OAuth CSRF protection with Redis state
- [ ] Verify OIDC sessions created correctly after social login
- [ ] Test logout flow (token invalidation + redirect)

#### User Management Testing
- [ ] Suspend user → verify can't access API
- [ ] Unsuspend user → verify can access API
- [ ] Ban user → verify permanent access denial
- [ ] View suspension/ban history in admin UI

#### Billing Testing
- [ ] Complete Stripe checkout → verify credits allocated
- [ ] Check payment method type displayed correctly
- [ ] Verify user ID linked to Stripe customer
- [ ] Test invoice payment → credits allocation

#### Error Reporting Testing
- [ ] Trigger frontend error → verify Sentry receives it
- [ ] Trigger backend error → verify logged correctly
- [ ] Test error boundary UI displays properly

---

## 7. DEPLOYMENT CHECKLIST

### Environment Variables Required

#### Production Additions
```bash
# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# Stripe (ensure production keys)
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth (ensure production URLs)
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Redis (ensure production connection)
REDIS_URL=redis://production-redis:6379
```

### Pre-Launch Verification

- [ ] All 23 critical TODOs completed
- [ ] Backend build passes (0 TypeScript errors)
- [ ] Frontend build passes (0 TypeScript errors)
- [ ] All critical tests pass
- [ ] Sentry configured and tested
- [ ] Stripe production keys configured
- [ ] Rate limit bypass removed
- [ ] OAuth state using Redis
- [ ] Database migrations applied
- [ ] Suspension/ban tables created

---

## 8. SUCCESS CRITERIA

### Phase 1 (Pre-Launch) Complete When:
- ✅ All 23 critical TODOs implemented
- ✅ All security vulnerabilities closed
- ✅ Payment processing fully functional
- ✅ User moderation tools working
- ✅ Error reporting active
- ✅ QA testing passed
- ✅ Production deployment checklist completed

### Phase 2 (Post-Launch Week 1-2) Complete When:
- ✅ Mock APIs replaced with real backends
- ✅ Basic analytics functional
- ✅ CSV export working

### Phase 3 (Post-Launch Month 1) Complete When:
- ✅ Advanced analytics features live
- ✅ Proration fully integrated

### Phase 4 (Post-Launch Quarter 1) Complete When:
- ✅ Rollover credits implemented
- ✅ Advanced discount features live
- ✅ Fraud detection enhanced

---

## 9. RESOURCE ALLOCATION

### Team Requirements

**Pre-Launch Phase (10 days):**
- 1 Backend Developer (full-time)
- 1 Frontend Developer (half-time)
- 1 QA Engineer (2 days at end)

**Post-Launch Phases:**
- 1 Full-Stack Developer (half-time for 3 months)

### Budget Estimate

**Pre-Launch Critical Work:**
- Development: 77 hours × $100/hr = $7,700
- QA Testing: 16 hours × $75/hr = $1,200
- **Total:** $8,900

**Post-Launch Enhancements:**
- Phases 2-4: 82 hours × $100/hr = $8,200

**Grand Total:** $17,100

---

## 10. SIGN-OFF & APPROVAL

### Stakeholder Review

- [ ] **Engineering Lead:** Reviews technical feasibility
- [ ] **Product Manager:** Approves feature prioritization
- [ ] **Security Lead:** Approves security fixes
- [ ] **QA Lead:** Approves testing plan

### Launch Gate

**CANNOT LAUNCH WITHOUT:**
- ✅ All Phase 1 critical items complete
- ✅ Security audit passed
- ✅ Stripe production tested
- ✅ Error reporting active

**CAN LAUNCH WITH POST-LAUNCH ITEMS DEFERRED** (acceptable technical debt)

---

## 11. APPENDIX

### A. Full TODO List by File

See grep output above for complete list.

### B. Related Documents

- `docs/reference/156-api-standards.md` - API development standards
- `docs/plan/158-api-response-standardization-plan.md` - API standardization
- `work-log.md` - Recent bug fixes and changes

### C. Monitoring & Alerts

Post-launch monitoring requirements:
- Sentry alert for error rate > 1%
- Stripe webhook failure alerts
- Rate limit breach alerts
- Suspension/ban action logs

---

**Document Owner:** Engineering Team
**Last Updated:** 2025-11-13
**Next Review:** After Phase 1 completion
**Status:** 📋 Awaiting Approval
