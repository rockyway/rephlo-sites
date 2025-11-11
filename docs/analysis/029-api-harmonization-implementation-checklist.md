# API Harmonization Implementation Checklist

**Document ID**: 029-api-harmonization-implementation-checklist.md
**Created**: 2025-11-09
**Status**: Ready for Execution
**Priority**: P1 (High)
**Dependencies**: Documents 027 (Analysis), 028 (Specification)
**Estimated Duration**: 4 weeks (22 working days)

---

## Overview

This checklist provides a step-by-step implementation guide for harmonizing API endpoints across Plans 109, 110, and 111. Each phase includes specific tasks, files to modify, testing requirements, and rollout procedures.

**Team**: 2 Backend Engineers + 1 QA Engineer

**Timeline**:
- Week 1: Preparation + Critical Bug Fix
- Week 2: Audit Logging + Rate Limiting
- Week 3: Route Consolidation
- Week 4: Response Standardization + Security Headers

---

## Phase 0: Preparation (Week 1, Days 1-3)

### Day 1: Environment Setup

- [ ] **Set up development branch**
  - Create branch: `feature/api-harmonization`
  - Base from: `master` or current development branch
  - Push to remote

- [ ] **Install dependencies**
  ```bash
  npm install express-rate-limit
  npm install rate-limit-redis
  npm install ioredis
  npm install helmet
  npm install @types/express-rate-limit --save-dev
  npm install @types/ioredis --save-dev
  ```

- [ ] **Set up Redis (optional for rate limiting)**
  - [ ] Install Redis locally or use Docker
  - [ ] Add `REDIS_URL` to `.env`
  - [ ] Test Redis connection
  - **Alternative**: Use in-memory rate limiting initially

- [ ] **Review existing codebase**
  - [ ] Read Document 027 (Analysis)
  - [ ] Read Document 028 (Specification)
  - [ ] Understand middleware architecture
  - [ ] Review route files

### Day 2: Create Base Middleware Files

- [ ] **Create `backend/src/middleware/request-id.middleware.ts`**
  - [ ] Implement request ID generation
  - [ ] Add TypeScript declaration for `req.id`
  - [ ] Write unit tests
  - File: `backend/src/middleware/__tests__/request-id.middleware.test.ts`

- [ ] **Create `backend/src/middleware/audit.middleware.ts`**
  - [ ] Implement `auditLog()` middleware factory
  - [ ] Capture request/response for audit trail
  - [ ] Write unit tests
  - File: `backend/src/middleware/__tests__/audit.middleware.test.ts`

- [ ] **Create `backend/src/middleware/cors.middleware.ts`**
  - [ ] Define `adminCorsOptions`
  - [ ] Define `publicCorsOptions`
  - [ ] Export configured CORS middleware

- [ ] **Update `backend/src/middleware/ratelimit.middleware.ts`**
  - [ ] Implement `publicRateLimit`
  - [ ] Implement `userRateLimit`
  - [ ] Implement `adminRateLimit`
  - [ ] Implement `criticalRateLimit`
  - [ ] Write unit tests

### Day 3: Database Migration & Services

- [ ] **Create Prisma migration for audit logs**
  ```bash
  npx prisma migrate dev --name add_admin_audit_logs
  ```
  - [ ] Add `AdminAuditLog` model to `schema.prisma`
  - [ ] Fields: id, adminUserId, action, resourceType, resourceId, previousValue, newValue, reason, ipAddress, userAgent, requestId, createdAt
  - [ ] Add indexes
  - [ ] Run migration
  - [ ] Verify table created

- [ ] **Create `backend/src/services/audit-log.service.ts`**
  - [ ] Implement `createLog()`
  - [ ] Implement `getLogsByAdmin()`
  - [ ] Implement `getLogsByResource()`
  - [ ] Register in DI container
  - [ ] Write unit tests
  - File: `backend/src/services/__tests__/audit-log.service.test.ts`

- [ ] **Update DI container**
  - File: `backend/src/container.ts`
  - [ ] Register `AuditLogService` as singleton
  - [ ] Verify injection works

- [ ] **Run all tests**
  ```bash
  npm test
  ```
  - [ ] All new tests pass
  - [ ] No regressions in existing tests

---

## Phase 1: Fix Critical Authentication Bug (Week 1, Day 4)

### Plan 111 Route Fixes

**File**: `backend/src/routes/plan111.routes.ts`

- [ ] **Line 84-88: POST /admin/coupons**
  ```typescript
  // BEFORE
  router.post('/admin/coupons', requireAdmin, asyncHandler(...))

  // AFTER
  router.post('/admin/coupons', authMiddleware, requireAdmin, asyncHandler(...))
  ```

- [ ] **Line 94-98: PATCH /admin/coupons/:id**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 104-108: DELETE /admin/coupons/:id**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 114-118: GET /admin/coupons**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 124-128: GET /admin/coupons/:id/redemptions**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 136-140: POST /admin/campaigns**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 146-150: PATCH /admin/campaigns/:id**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 156-160: DELETE /admin/campaigns/:id**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 166-170: GET /admin/campaigns**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 176-180: GET /admin/campaigns/:id/performance**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 186-190: POST /admin/campaigns/:id/assign-coupon**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 196-200: DELETE /admin/campaigns/:id/remove-coupon/:couponId**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 208-212: GET /admin/fraud-detection**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 218-222: PATCH /admin/fraud-detection/:id/review**
  - [ ] Add `authMiddleware` before `requireAdmin`

- [ ] **Line 228-232: GET /admin/fraud-detection/pending**
  - [ ] Add `authMiddleware` before `requireAdmin`

### Testing

- [ ] **Manual testing all 15 endpoints**
  - [ ] Test with valid admin token → Success
  - [ ] Test with missing token → 401 Unauthorized
  - [ ] Test with non-admin token → 403 Forbidden
  - [ ] Test with invalid token → 401 Unauthorized

- [ ] **Integration tests**
  - File: `backend/src/__tests__/integration/plan111-auth.test.ts` (create)
  - [ ] Test all 15 endpoints with different auth scenarios

- [ ] **Code review**
  - [ ] Submit PR for Phase 1
  - [ ] Address review comments
  - [ ] Merge to main branch

- [ ] **Deploy hotfix (if critical)**
  - [ ] Tag release: `v2.0.1-hotfix`
  - [ ] Deploy to staging
  - [ ] Smoke test
  - [ ] Deploy to production
  - [ ] Monitor logs

---

## Phase 2: Implement Audit Logging (Week 2, Days 5-8)

### Plan 109 Routes (49 endpoints)

**File**: `backend/src/routes/plan109.routes.ts`

**Subscription Management** (10 routes):
- [ ] **POST /subscriptions** → `auditLog('subscription_created', 'subscription')`
- [ ] **POST /subscriptions/:id/upgrade** → `auditLog('subscription_upgraded', 'subscription')`
- [ ] **POST /subscriptions/:id/downgrade** → `auditLog('subscription_downgraded', 'subscription')`
- [ ] **POST /subscriptions/:id/cancel** → `auditLog('subscription_cancelled', 'subscription')`
- [ ] **POST /subscriptions/:id/reactivate** → `auditLog('subscription_reactivated', 'subscription')`
- [ ] **POST /subscriptions/:id/allocate-credits** → `auditLog('credits_allocated', 'subscription')`
- [ ] **POST /subscriptions/:id/rollover** → `auditLog('credits_rolled_over', 'subscription')`
- [ ] GET endpoints: No audit logging (read-only)

**User Management** (10 routes):
- [ ] **GET /users** → No audit (read-only)
- [ ] **GET /users/search** → No audit (read-only)
- [ ] **GET /users/:id** → No audit (read-only)
- [ ] **PATCH /users/:id** → `auditLog('user_updated', 'user')`
- [ ] **POST /users/:id/suspend** → `auditLog('user_suspended', 'user')`
- [ ] **POST /users/:id/unsuspend** → `auditLog('user_unsuspended', 'user')`
- [ ] **POST /users/:id/ban** → `auditLog('user_banned', 'user')`
- [ ] **POST /users/:id/unban** → `auditLog('user_unbanned', 'user')`
- [ ] **POST /users/bulk-update** → `auditLog('users_bulk_updated', 'user')`
- [ ] **POST /users/:id/adjust-credits** → `auditLog('user_credits_adjusted', 'user')`

**Billing** (9 routes):
- [ ] **POST /billing/payment-methods** → `auditLog('payment_method_added', 'billing')`
- [ ] **DELETE /billing/payment-methods/:id** → `auditLog('payment_method_removed', 'billing')`
- [ ] **GET /billing/payment-methods/:userId** → No audit (read-only)
- [ ] **POST /billing/invoices/:subscriptionId** → `auditLog('invoice_created', 'billing')`
- [ ] **GET /billing/invoices/upcoming/:userId** → No audit (read-only)
- [ ] **GET /billing/invoices/:userId** → No audit (read-only)
- [ ] **GET /billing/transactions/:userId** → No audit (read-only)
- [ ] **POST /billing/transactions/:id/refund** → `auditLog('transaction_refunded', 'billing')`
- [ ] **POST /billing/dunning/:attemptId/retry** → `auditLog('payment_retried', 'billing')`

**Credits** (11 routes):
- [ ] **POST /credits/allocate** → `auditLog('credits_allocated', 'credit')`
- [ ] **POST /credits/process-monthly** → `auditLog('credits_monthly_processed', 'credit')`
- [ ] **POST /credits/grant-bonus** → `auditLog('credits_bonus_granted', 'credit')`
- [ ] **POST /credits/deduct** → `auditLog('credits_deducted', 'credit')`
- [ ] **GET /credits/rollover/:userId** → No audit (read-only)
- [ ] **POST /credits/rollover/:userId/apply** → `auditLog('credits_rollover_applied', 'credit')`
- [ ] **POST /credits/sync/:userId** → `auditLog('credits_synced', 'credit')`
- [ ] **GET /credits/reconcile/:userId** → No audit (read-only)
- [ ] **GET /credits/balance/:userId** → No audit (read-only)
- [ ] **GET /credits/history/:userId** → No audit (read-only)
- [ ] **GET /credits/usage/:userId** → No audit (read-only)

**Analytics** (9 routes):
- [ ] All GET endpoints → No audit logging (read-only)

### Plan 110 Routes (3 admin endpoints)

**File**: `backend/src/routes/plan110.routes.ts`

**Licenses**:
- [ ] **POST /admin/licenses/:id/suspend** → `auditLog('license_suspended', 'license')`
- [ ] **POST /admin/licenses/:id/revoke** → `auditLog('license_revoked', 'license')`
- [ ] **GET /admin/licenses** → No audit (read-only)

**Prorations**:
- [ ] **GET /admin/prorations** → No audit (read-only)
- [ ] **POST /admin/prorations/:id/reverse** → `auditLog('proration_reversed', 'proration')`

**Analytics**:
- [ ] **GET /admin/analytics/upgrade-conversion** → No audit (read-only)

### Plan 111 Routes (15 admin endpoints)

**File**: `backend/src/routes/plan111.routes.ts`

**Coupons**:
- [ ] **POST /admin/coupons** → `auditLog('coupon_created', 'coupon')`
- [ ] **PATCH /admin/coupons/:id** → `auditLog('coupon_updated', 'coupon')`
- [ ] **DELETE /admin/coupons/:id** → `auditLog('coupon_deleted', 'coupon')`
- [ ] **GET /admin/coupons** → No audit (read-only)
- [ ] **GET /admin/coupons/:id/redemptions** → No audit (read-only)

**Campaigns**:
- [ ] **POST /admin/campaigns** → `auditLog('campaign_created', 'campaign')`
- [ ] **PATCH /admin/campaigns/:id** → `auditLog('campaign_updated', 'campaign')`
- [ ] **DELETE /admin/campaigns/:id** → `auditLog('campaign_deleted', 'campaign')`
- [ ] **GET /admin/campaigns** → No audit (read-only)
- [ ] **GET /admin/campaigns/:id/performance** → No audit (read-only)
- [ ] **POST /admin/campaigns/:id/assign-coupon** → `auditLog('campaign_coupon_assigned', 'campaign')`
- [ ] **DELETE /admin/campaigns/:id/remove-coupon/:couponId** → `auditLog('campaign_coupon_removed', 'campaign')`

**Fraud Detection**:
- [ ] **GET /admin/fraud-detection** → No audit (read-only)
- [ ] **PATCH /admin/fraud-detection/:id/review** → `auditLog('fraud_event_reviewed', 'fraud_detection')`
- [ ] **GET /admin/fraud-detection/pending** → No audit (read-only)

### Controller Updates for `previousValue`

Update controllers to set `req.previousValue` before making changes:

**Example**: `backend/src/controllers/user-management.controller.ts`

- [ ] **suspendUser**
  ```typescript
  const user = await this.userService.getUserById(userId);
  (req as any).previousValue = { status: user.status };
  // ... perform suspension
  ```

- [ ] **banUser**
  ```typescript
  const user = await this.userService.getUserById(userId);
  (req as any).previousValue = { status: user.status, bannedAt: user.bannedAt };
  // ... perform ban
  ```

- [ ] **adjustUserCredits**
  ```typescript
  const credits = await this.creditService.getBalance(userId);
  (req as any).previousValue = { balance: credits.balance };
  // ... adjust credits
  ```

**Controllers to Update**:
- [ ] `subscription-management.controller.ts` (7 methods)
- [ ] `user-management.controller.ts` (6 methods)
- [ ] `billing.controller.ts` (3 methods)
- [ ] `credit-management.controller.ts` (5 methods)
- [ ] `license-management.controller.ts` (2 methods)
- [ ] `proration.controller.ts` (1 method)
- [ ] `coupon.controller.ts` (3 methods)
- [ ] `campaign.controller.ts` (4 methods)
- [ ] `fraud-detection.controller.ts` (1 method)

### Testing

- [ ] **Unit tests for audit logging**
  - [ ] Verify `auditLog()` middleware captures data
  - [ ] Verify AuditLogService creates records
  - [ ] Test previousValue capture

- [ ] **Integration tests**
  - [ ] Create audit log for each action type
  - [ ] Verify all required fields populated
  - [ ] Query audit logs by admin, resource

- [ ] **Manual verification**
  - [ ] Perform admin action
  - [ ] Query database: `SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 10;`
  - [ ] Verify all fields present

---

## Phase 3: Add Rate Limiting (Week 2, Days 9-11)

### Apply Global Rate Limiters

**File**: `backend/src/routes/index.ts`

- [ ] **Import rate limiters**
  ```typescript
  import {
    publicRateLimit,
    userRateLimit,
    adminRateLimit,
  } from '../middleware/ratelimit.middleware';
  ```

- [ ] **Apply to route groups**
  ```typescript
  // Public routes
  router.use('/api/v1/public', publicRateLimit);

  // User routes (authenticated)
  router.use('/api/v1/user', userRateLimit);

  // Admin routes
  router.use('/admin', adminRateLimit);
  ```

### Apply Critical Rate Limiters

**Critical Operations** (high-risk endpoints):

**File**: `backend/src/routes/plan109.routes.ts`

- [ ] **POST /users/:id/ban** → Add `criticalRateLimit`
- [ ] **POST /users/:id/delete** → Add `criticalRateLimit`
- [ ] **POST /billing/transactions/:id/refund** → Add `criticalRateLimit`
- [ ] **POST /credits/deduct** → Add `criticalRateLimit`

**File**: `backend/src/routes/plan110.routes.ts`

- [ ] **POST /admin/licenses/:id/revoke** → Add `criticalRateLimit`

**File**: `backend/src/routes/plan111.routes.ts`

- [ ] **DELETE /admin/coupons/:id** → Add `criticalRateLimit`
- [ ] **DELETE /admin/campaigns/:id** → Add `criticalRateLimit`

**Pattern**:
```typescript
router.post(
  '/users/:id/ban',
  authMiddleware,
  requireAdmin,
  criticalRateLimit,  // Add this
  auditLog('user_banned', 'user'),
  asyncHandler(...)
);
```

### Update Error Middleware

**File**: `backend/src/middleware/error.middleware.ts`

- [ ] **Add rate limit error creator**
  ```typescript
  export const rateLimitError = (
    message: string = 'Rate limit exceeded. Please try again later.'
  ): ApiError => {
    return createApiError(message, 429, 'rate_limit_exceeded');
  };
  ```

### Testing

- [ ] **Load testing**
  - Tool: k6 or Apache Bench
  - [ ] Public endpoints: Exceed 20 req/min → 429 response
  - [ ] User endpoints: Exceed 60 req/min → 429 response
  - [ ] Admin endpoints: Exceed 120 req/min → 429 response
  - [ ] Critical endpoints: Exceed 10 req/hour → 429 response

- [ ] **Verify headers**
  - [ ] `X-RateLimit-Limit` present
  - [ ] `X-RateLimit-Remaining` present
  - [ ] `X-RateLimit-Reset` present

- [ ] **Test error response format**
  ```json
  {
    "success": false,
    "error": {
      "code": "rate_limit_exceeded",
      "message": "Too many requests...",
      "request_id": "req_abc123",
      "timestamp": "2025-11-09T10:30:00Z"
    }
  }
  ```

---

## Phase 4: Route Consolidation (Week 3, Days 12-16)

### Create New Route Files

- [ ] **Create `backend/src/routes/public.routes.ts`**
  - [ ] Import controllers
  - [ ] Define router
  - [ ] Add coupon validation endpoint
  - [ ] Add license activation endpoint
  - [ ] Add tier info endpoint
  - [ ] Export `createPublicRouter()`

- [ ] **Create `backend/src/routes/user.routes.ts`**
  - [ ] Import controllers
  - [ ] Define router with `authMiddleware`
  - [ ] Add user subscription endpoints
  - [ ] Add user license endpoints
  - [ ] Add user credit endpoints
  - [ ] Add user coupon endpoints
  - [ ] Export `createUserRouter()`

- [ ] **Create `backend/src/routes/admin/` directory**
  ```bash
  mkdir backend/src/routes/admin
  ```

- [ ] **Create admin route files**:
  - [ ] `admin/subscriptions.routes.ts` (from Plan 109)
  - [ ] `admin/users.routes.ts` (from Plan 109)
  - [ ] `admin/billing.routes.ts` (from Plan 109)
  - [ ] `admin/credits.routes.ts` (from Plan 109)
  - [ ] `admin/analytics.routes.ts` (from Plan 109)
  - [ ] `admin/licenses.routes.ts` (from Plan 110)
  - [ ] `admin/prorations.routes.ts` (from Plan 110)
  - [ ] `admin/coupons.routes.ts` (from Plan 111)
  - [ ] `admin/campaigns.routes.ts` (from Plan 111)
  - [ ] `admin/fraud-detection.routes.ts` (from Plan 111)

- [ ] **Create `backend/src/routes/admin/index.ts`**
  - [ ] Import all admin routers
  - [ ] Combine into single admin router
  - [ ] Export `createAdminRouter()`

### Update Main Routes File

**File**: `backend/src/routes/index.ts`

- [ ] **Import new routers**
  ```typescript
  import { createPublicRouter } from './public.routes';
  import { createUserRouter } from './user.routes';
  import { createAdminRouter } from './admin';
  ```

- [ ] **Mount new routes**
  ```typescript
  // New unified routes
  router.use('/api/v1/public', cors(publicCorsOptions), createPublicRouter());
  router.use('/api/v1/user', cors(publicCorsOptions), createUserRouter());
  router.use('/api/v1/admin', cors(adminCorsOptions), createAdminRouter());
  ```

- [ ] **Add deprecation warnings for old routes**
  ```typescript
  // Deprecated routes (remove after 3 months)
  router.use('/admin', (req, res, next) => {
    logger.warn('Deprecated route accessed', {
      path: req.path,
      newPath: req.path.replace('/admin', '/api/v1/admin'),
    });
    next();
  }, createPlan109Router());
  ```

### Update API Documentation

**File**: `backend/src/routes/index.ts` (GET / endpoint)

- [ ] **Update endpoint structure**
  ```typescript
  res.json({
    name: 'Rephlo Backend API',
    version: '2.1.0',  // Update version
    endpoints: {
      v1: {
        public: '/api/v1/public',
        user: '/api/v1/user',
        admin: '/api/v1/admin',
      },
      deprecated: {
        plan109: '/admin (use /api/v1/admin instead)',
        plan110: '/api (use /api/v1/user or /api/v1/admin instead)',
        plan111: '/api (use /api/v1/public, /api/v1/user, or /api/v1/admin instead)',
      }
    }
  });
  ```

### Testing

- [ ] **Verify new routes work**
  - [ ] Test all public endpoints at `/api/v1/public/*`
  - [ ] Test all user endpoints at `/api/v1/user/*`
  - [ ] Test all admin endpoints at `/api/v1/admin/*`

- [ ] **Verify old routes still work (deprecated)**
  - [ ] Test Plan 109 routes at `/admin/*`
  - [ ] Test Plan 110 routes at `/api/*`
  - [ ] Test Plan 111 routes at `/api/*` and `/admin/*`

- [ ] **Verify deprecation warnings in logs**
  - [ ] Access old route
  - [ ] Check logs for warning message

---

## Phase 5: Response Standardization (Week 3-4, Days 17-20)

### Update Error Middleware

**File**: `backend/src/middleware/error.middleware.ts`

- [ ] **Add `successResponse()` helper**
  ```typescript
  export function successResponse<T>(
    req: Request,
    data: T,
    meta?: { pagination?: PaginationMeta; [key: string]: any }
  ): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      meta: {
        request_id: req.id,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }
  ```

- [ ] **Export TypeScript interfaces**
  ```typescript
  export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    meta?: {
      request_id: string;
      timestamp: string;
      pagination?: PaginationMeta;
    };
  }
  ```

- [ ] **Update error handler to include request_id and timestamp**
  - [ ] Add `request_id: req.id`
  - [ ] Add `timestamp: new Date().toISOString()`

### Update Controllers (21 files)

**Pattern**:
```typescript
// BEFORE
res.status(200).json({ success: true, data: result });

// AFTER
res.status(200).json(successResponse(req, result));
```

**Controllers to Update**:
- [ ] `subscription-management.controller.ts`
- [ ] `user-management.controller.ts`
- [ ] `billing.controller.ts`
- [ ] `credit-management.controller.ts`
- [ ] `analytics.controller.ts`
- [ ] `license-management.controller.ts`
- [ ] `version-upgrade.controller.ts`
- [ ] `proration.controller.ts`
- [ ] `migration.controller.ts`
- [ ] `coupon.controller.ts`
- [ ] `campaign.controller.ts`
- [ ] `fraud-detection.controller.ts`
- [ ] `subscriptions.controller.ts`
- [ ] `credits.controller.ts`
- [ ] `users.controller.ts`
- [ ] `models.controller.ts`
- [ ] `admin.controller.ts`
- [ ] `auth-management.controller.ts`
- [ ] `social-auth.controller.ts`
- [ ] `branding.controller.ts`
- [ ] `oauth.controller.ts`

### Testing

- [ ] **Verify success response format**
  - [ ] `success: true` present
  - [ ] `data` contains response payload
  - [ ] `meta.request_id` present
  - [ ] `meta.timestamp` present (ISO 8601)
  - [ ] `meta.pagination` present if applicable

- [ ] **Verify error response format**
  - [ ] `success: false` present
  - [ ] `error.code` present
  - [ ] `error.message` present
  - [ ] `error.request_id` present
  - [ ] `error.timestamp` present
  - [ ] `error.details` present if validation error

- [ ] **Integration tests**
  - [ ] Update all integration tests to expect new format
  - [ ] Verify request ID propagation
  - [ ] Verify timestamp format

---

## Phase 6: Security Headers & CORS (Week 4, Days 21-22)

### Update Main App File

**File**: `backend/src/app.ts`

- [ ] **Install Helmet**
  ```bash
  npm install helmet
  npm install @types/helmet --save-dev
  ```

- [ ] **Configure Helmet**
  ```typescript
  import helmet from 'helmet';

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  ```

- [ ] **Update CORS configuration**
  ```typescript
  import cors from 'cors';
  import { adminCorsOptions, publicCorsOptions } from './middleware/cors.middleware';

  // Remove global CORS
  // app.use(cors()); // DELETE THIS

  // Apply per-route in index.ts
  ```

### Update Routes Index

**File**: `backend/src/routes/index.ts`

- [ ] **Apply CORS per route group**
  ```typescript
  router.use('/api/v1/public', cors(publicCorsOptions), createPublicRouter());
  router.use('/api/v1/user', cors(publicCorsOptions), createUserRouter());
  router.use('/api/v1/admin', cors(adminCorsOptions), createAdminRouter());
  ```

### Update Environment Variables

**File**: `.env`

- [ ] **Add allowed origins**
  ```
  ADMIN_ALLOWED_ORIGINS=https://admin.rephlo.com,http://localhost:3000,http://localhost:5173
  ```

**File**: `backend/src/middleware/cors.middleware.ts`

- [ ] **Update to read from env**
  ```typescript
  const allowedOrigins = (process.env.ADMIN_ALLOWED_ORIGINS || '').split(',');
  ```

### Testing

- [ ] **Verify security headers**
  - Tool: Browser DevTools or `curl -I`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `X-XSS-Protection: 0`
  - [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - [ ] `Content-Security-Policy: default-src 'self'`

- [ ] **Verify CORS**
  - [ ] Preflight request from allowed origin → 200 OK
  - [ ] Preflight request from disallowed origin → CORS error
  - [ ] `Access-Control-Allow-Origin` header present
  - [ ] `Access-Control-Allow-Credentials: true` (admin routes)

- [ ] **Security scan**
  - Tool: OWASP ZAP or Burp Suite
  - [ ] No high/critical vulnerabilities
  - [ ] Security headers properly configured

---

## Final Testing & Deployment

### Comprehensive Testing

- [ ] **Run full test suite**
  ```bash
  npm run test:unit
  npm run test:integration
  npm run test:e2e
  ```
  - [ ] All tests pass
  - [ ] Coverage > 90%

- [ ] **Load testing**
  - Tool: k6
  - [ ] 100 req/sec for 5 minutes (public)
  - [ ] 500 req/sec for 10 minutes (user)
  - [ ] 50 req/sec for 10 minutes (admin)
  - [ ] p95 latency < 200ms
  - [ ] Error rate < 0.1%

- [ ] **Security testing**
  - [ ] OWASP ZAP scan
  - [ ] Authentication bypass attempts
  - [ ] Authorization escalation attempts
  - [ ] Rate limit evasion attempts

- [ ] **Manual QA**
  - [ ] Test each admin action
  - [ ] Verify audit logs created
  - [ ] Test rate limiting
  - [ ] Test CORS from frontend
  - [ ] Verify error responses

### Code Review

- [ ] **Create PR for full harmonization**
  - [ ] Title: "API Harmonization: Plans 109, 110, 111"
  - [ ] Link to Documents 027, 028, 029
  - [ ] List all changes
  - [ ] Include testing evidence

- [ ] **Review checklist**
  - [ ] Code follows specification (Document 028)
  - [ ] All endpoints have proper middleware chain
  - [ ] Audit logging on all admin endpoints
  - [ ] Rate limiting applied
  - [ ] Response format consistent
  - [ ] Security headers configured
  - [ ] Tests pass

- [ ] **Address review comments**
  - [ ] Make requested changes
  - [ ] Re-test affected areas
  - [ ] Get approval

### Deployment

- [ ] **Merge to main branch**
  - [ ] Squash commits or keep detailed history
  - [ ] Tag release: `v2.1.0`

- [ ] **Deploy to staging**
  - [ ] Run migrations
  - [ ] Deploy application
  - [ ] Smoke test all endpoints
  - [ ] Verify audit logs
  - [ ] Verify rate limiting
  - [ ] Test from frontend

- [ ] **Deploy to production**
  - [ ] Schedule maintenance window (if needed)
  - [ ] Run database migrations
  - [ ] Deploy application
  - [ ] Smoke test critical endpoints
  - [ ] Monitor error logs
  - [ ] Monitor performance metrics
  - [ ] Monitor audit log creation

### Post-Deployment

- [ ] **Monitor for 24 hours**
  - [ ] Error rate
  - [ ] Response times
  - [ ] Rate limit hits
  - [ ] Audit log volume
  - [ ] User complaints

- [ ] **Update documentation**
  - [ ] API documentation
  - [ ] Client migration guide
  - [ ] Internal wiki

- [ ] **Notify stakeholders**
  - [ ] Engineering team
  - [ ] Frontend team
  - [ ] Product owner
  - [ ] Security team

---

## Rollback Plan

### If Issues Arise

- [ ] **Identify issue severity**
  - Critical (data loss, security) → Immediate rollback
  - High (many users affected) → Rollback after investigation
  - Medium (some users affected) → Fix forward
  - Low (minor issues) → Fix in next release

- [ ] **Rollback procedure**
  1. [ ] Revert database migration
     ```bash
     npx prisma migrate rollback --name add_admin_audit_logs
     ```
  2. [ ] Deploy previous application version
  3. [ ] Verify old routes work
  4. [ ] Clear rate limit cache (Redis)
  5. [ ] Notify users

- [ ] **Post-rollback**
  - [ ] Document what went wrong
  - [ ] Create fix plan
  - [ ] Update this checklist
  - [ ] Re-test in staging
  - [ ] Retry deployment

---

## Success Metrics

### Technical Metrics

- [ ] Zero authentication bugs (all routes have proper middleware)
- [ ] 100% audit logging on write operations
- [ ] Rate limiting enforced on all routes
- [ ] Request ID in 100% of logs and responses
- [ ] Standard format on 100% of responses
- [ ] Security headers on 100% of responses
- [ ] CORS properly configured

### Quality Metrics

- [ ] Unit test coverage > 90%
- [ ] Integration test coverage for all flows
- [ ] Zero high/critical security issues
- [ ] Load test p95 < 200ms
- [ ] Zero production incidents

### Business Metrics

- [ ] SOC 2 requirements met
- [ ] GDPR compliance achieved
- [ ] API documentation updated
- [ ] Zero breaking changes for clients

---

## Completion Checklist

- [ ] All 6 phases completed
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Deployed to production
- [ ] Monitoring dashboards updated
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Success metrics verified

---

**Implementation Status**: Ready to Begin
**Last Updated**: 2025-11-09
**Next Review**: After Phase 0 completion
**Owner**: Backend Engineering Team
