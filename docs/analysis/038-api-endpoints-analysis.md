# API Endpoints Analysis Report

**Generated:** 2025-11-12T20:32:35.515Z

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 206

### DELETE Endpoints (6)

#### `DELETE /billing/payment-methods/:id`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.addPaymentMethod`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `DELETE /licenses/activations/:id`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.activateDevice`
- **Middleware:** `authenticate`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 159 | ``/api/licenses/activations/${activationId}`...` |
| `frontend\src\api\plan110.ts` | 169 | ``/api/licenses/activations/${activationId}/replace`,...` |

---

#### `DELETE /admin/coupons/:id`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `DELETE /admin/campaigns/:id`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `DELETE /admin/campaigns/:id/remove-coupon/:couponId`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `DELETE /webhooks/config`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `webhooksController.setWebhookConfig`
- **Middleware:** `authenticate`

**Usages:** None found

---

### GET Endpoints (119)

#### `GET /metrics`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 63
- **Handler:** `adminController.getMetrics`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\services\api.ts` | 260 | `const response = await apiClient.get('/admin/metrics');...` |
| `backend\src\routes\index.ts` | 108 | `metrics: '/admin/metrics',...` |

---

#### `GET /users`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 75
- **Handler:** `adminController.listUsers`

**Usages (92):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\plan109.ts` | 158 | `'/admin/users',...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 53 | `{ name: 'User List', href: '/admin/users' },...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 76 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 103 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 112 | `onClick={() => navigate('/admin/users')}...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\permission.middleware.ts` | 22 | `*   router.get('/admin/users', authMiddleware, requirePermission('users.view'), ...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 55 | `* router.get('/admin/users', authMiddleware, requirePermission('users.view'), ha...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\routes\index.ts` | 96 | `users: '/v1/users',...` |
| `backend\src\routes\index.ts` | 109 | `users: '/admin/users',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 633 | `endpoint: '/admin/users',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 209 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 220 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 240 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 266 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 377 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 474 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 484 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 510 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 517 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 578 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 596 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 610 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 100 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 127 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 155 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 245 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 255 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 304 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 328 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 593 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 169 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 187 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 196 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 277 | `request(app).get('/admin/users').set('Authorization', `Bearer ${adminToken}`)...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `GET /subscriptions`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminController.getSubscriptionOverview`

**Usages (69):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 63 | `{ name: 'Subscription Management', href: '/admin/subscriptions' },...` |
| `frontend\src\pages\admin\SubscriptionManagement.tsx` | 517 | `<Link to={`/admin/subscriptions/${subscription.id}`}>...` |
| `frontend\src\utils\breadcrumbs.ts` | 63 | `'/admin/subscriptions': 'Subscriptions',...` |
| `backend\src\routes\admin.routes.ts` | 355 | `'/users/:id/subscriptions',...` |
| `backend\src\routes\index.ts` | 93 | `subscriptions: '/v1/subscriptions',...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\index.ts` | 110 | `subscriptions: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 74 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 88 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 104 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 126 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 146 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 167 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 191 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 206 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 227 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 237 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 247 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 257 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 282 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 291 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 433 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 443 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 453 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 463 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 512 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 111 | `.post('/v1/subscriptions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\helpers\mocks.ts` | 133 | `.post('/v1/subscriptions')...` |
| `backend\tests\helpers\mocks.ts` | 159 | `.delete(`/v1/subscriptions/${subscriptionId}`)...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 388 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 408 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 425 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 478 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 505 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 516 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 527 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 605 | `endpoint: `/admin/subscriptions/${subscription.id}`,...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 147 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 172 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 194 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 208 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 222 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 236 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

#### `GET /usage`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 113
- **Handler:** `adminController.getSystemUsage`

**Usages (26):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 389 | ``/admin/credits/usage/${userId}`,...` |
| `backend\src\routes\index.ts` | 95 | `usage: '/v1/usage',...` |
| `backend\src\routes\index.ts` | 111 | `usage: '/admin/usage',...` |
| `backend\src\routes\plan109.routes.ts` | 463 | `'/credits/usage/:userId',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 179 | `.get('/v1/usage')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 192 | `.get('/v1/usage/stats')...` |
| `backend\tests\integration\credits.test.ts` | 101 | `.get('/v1/usage?limit=5&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 120 | `.get('/v1/usage?model_id=gpt-5')...` |
| `backend\tests\integration\credits.test.ts` | 132 | `.get('/v1/usage?operation=chat')...` |
| `backend\tests\integration\credits.test.ts` | 146 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\credits.test.ts` | 158 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 168 | `.get('/v1/usage?limit=101')...` |
| `backend\tests\integration\credits.test.ts` | 175 | `.get('/v1/usage?offset=-1')...` |
| `backend\tests\integration\credits.test.ts` | 182 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 194 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 209 | `.get('/v1/usage/stats?group_by=hour')...` |
| `backend\tests\integration\credits.test.ts` | 222 | `.get('/v1/usage/stats?group_by=model')...` |
| `backend\tests\integration\credits.test.ts` | 241 | `.get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_dat...` |
| `backend\tests\integration\credits.test.ts` | 250 | `.get('/v1/usage/stats?group_by=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 257 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 326 | `.get('/v1/usage?limit=10&offset=1000')...` |
| `backend\tests\integration\credits.test.ts` | 336 | `.get('/v1/usage?limit=1&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 346 | `.get('/v1/usage?limit=100')...` |
| `backend\tests\integration\credits.test.ts` | 361 | `.get('/v1/usage?start_date=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 368 | `.get('/v1/usage?end_date=not-a-date')...` |
| `backend\tests\integration\credits.test.ts` | 378 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |

---

#### `GET /analytics/dashboard-kpis`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminAnalyticsController.getDashboardKPIs`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 205 | `'/admin/analytics/dashboard-kpis',...` |

---

#### `GET /analytics/recent-activity`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminAnalyticsController.getRecentActivity`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 220 | `'/admin/analytics/recent-activity',...` |

---

#### `GET /models/tiers`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `modelTierAdminController.listModelsWithTiers`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 96 | `'/admin/models/tiers',...` |
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |

---

#### `GET /models/tiers/audit-logs`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `modelTierAdminController.getAuditLogs`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |

---

#### `GET /models/providers`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `modelTierAdminController.getProviders`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 188 | `'/admin/models/providers'...` |

---

#### `GET /audit-logs`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `auditLogController.getAuditLogs`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `backend\src\routes\admin.routes.ts` | 202 | `'/models/tiers/audit-logs',...` |

---

#### `GET /audit-logs/resource/:resourceType/:resourceId`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `auditLogController.getLogsForResource`

**Usages:** None found

---

#### `GET /audit-logs/admin/:adminUserId`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `auditLogController.getLogsForAdmin`

**Usages:** None found

---

#### `GET /users/:id/overview`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserOverview`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |

---

#### `GET /users/:id/subscriptions`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserSubscriptions`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |

---

#### `GET /users/:id/licenses`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserLicenses`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |

---

#### `GET /users/:id/credits`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserCredits`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |

---

#### `GET /users/:id/coupons`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserCoupons`
- **Middleware:** `auditLog`

**Usages (3):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |

---

#### `GET /users/:id/payments`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserPayments`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |

---

#### `GET /users/:id/activity`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminUserDetailController.getUserActivity`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |

---

#### `GET /analytics/revenue/kpis`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getRevenueKPIs`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 600 | `'/admin/analytics/revenue/kpis',...` |

---

#### `GET /analytics/revenue/mix`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getRevenueMix`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 614 | `'/admin/analytics/revenue/mix',...` |

---

#### `GET /analytics/revenue/trend`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getRevenueTrend`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 628 | `'/admin/analytics/revenue/trend',...` |
| `frontend\src\api\plan109.ts` | 568 | `}>('/admin/analytics/revenue/trend', { params: { period } });...` |

---

#### `GET /analytics/revenue/conversion-funnel`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getRevenueFunnel`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 642 | `'/admin/analytics/revenue/conversion-funnel',...` |

---

#### `GET /analytics/revenue/funnel`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getRevenueFunnel`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 524 | `}>('/admin/analytics/revenue/funnel', { params: { period } });...` |

---

#### `GET /analytics/revenue/credit-usage`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getCreditUsage`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 658 | `'/admin/analytics/revenue/credit-usage',...` |
| `frontend\src\api\plan109.ts` | 624 | `}>('/admin/analytics/revenue/credit-usage', { params: { period, limit } });...` |

---

#### `GET /analytics/revenue/coupon-roi`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `revenueAnalyticsController.getCouponROI`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 674 | `'/admin/analytics/revenue/coupon-roi',...` |

---

#### `GET /settings`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `settingsController.getAllSettings`
- **Middleware:** `auditLog`

**Usages (49):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\settings.api.ts` | 54 | `'/admin/settings'...` |
| `frontend\src\api\settings.api.ts` | 64 | ``/admin/settings/${category}`...` |
| `frontend\src\api\settings.api.ts` | 77 | ``/admin/settings/${category}`,...` |
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 135 | `{ name: 'General', href: '/admin/settings#general' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 136 | `{ name: 'Email & Notifications', href: '/admin/settings#email' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 137 | `{ name: 'Security', href: '/admin/settings#security' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 138 | `{ name: 'Integrations', href: '/admin/settings#integrations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 139 | `{ name: 'Feature Flags', href: '/admin/settings#features' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 140 | `{ name: 'System', href: '/admin/settings#system' },...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 448 | `to: '/admin/settings',...` |
| `frontend\src\pages\admin\AdminSettings.tsx` | 293 | `navigate(`/admin/settings#${tab.id}`, { replace: true });...` |
| `backend\tests\integration\settings-api.test.ts` | 70 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 86 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 92 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 99 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 113 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 125 | `.get('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 135 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 141 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 156 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 176 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 208 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 227 | `.put('/admin/settings/integrations')...` |
| `backend\tests\integration\settings-api.test.ts` | 259 | `.put('/admin/settings/feature_flags')...` |
| `backend\tests\integration\settings-api.test.ts` | 277 | `.put('/admin/settings/system')...` |
| `backend\tests\integration\settings-api.test.ts` | 289 | `.put('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 300 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 312 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 323 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 334 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 341 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 467 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 474 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 484 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 491 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 498 | `.get('/admin/settings/general')...` |

---

#### `GET /settings/:category`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `settingsController.getCategorySettings`
- **Middleware:** `auditLog`

**Usages (36):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\settings.api.ts` | 64 | ``/admin/settings/${category}`...` |
| `frontend\src\api\settings.api.ts` | 77 | ``/admin/settings/${category}`,...` |
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `backend\tests\integration\settings-api.test.ts` | 113 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 125 | `.get('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 135 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 141 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 156 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 176 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 208 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 227 | `.put('/admin/settings/integrations')...` |
| `backend\tests\integration\settings-api.test.ts` | 259 | `.put('/admin/settings/feature_flags')...` |
| `backend\tests\integration\settings-api.test.ts` | 277 | `.put('/admin/settings/system')...` |
| `backend\tests\integration\settings-api.test.ts` | 289 | `.put('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 300 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 312 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 323 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 334 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 341 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 467 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 474 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 484 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 491 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 498 | `.get('/admin/settings/general')...` |

---

#### `GET /billing/invoices`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `billingController.listInvoices`
- **Middleware:** `auditLog`

**Usages (3):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |
| `frontend\src\api\plan109.ts` | 281 | `? `/admin/billing/invoices/${userId}`...` |
| `frontend\src\api\plan109.ts` | 282 | `: '/admin/billing/invoices';...` |

---

#### `GET /billing/transactions`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `billingController.listTransactions`
- **Middleware:** `auditLog`

**Usages (3):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 295 | `? `/admin/billing/transactions/${userId}`...` |
| `frontend\src\api\plan109.ts` | 296 | `: '/admin/billing/transactions';...` |
| `frontend\src\api\plan109.ts` | 309 | ``/admin/billing/transactions/${transactionId}/refund`,...` |

---

#### `GET /billing/dunning`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `billingController.listDunningAttempts`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 320 | `'/admin/billing/dunning'...` |
| `frontend\src\api\plan109.ts` | 330 | ``/admin/billing/dunning/${attemptId}/retry`...` |

---

#### `GET /pricing/margin-metrics`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getMarginMetrics`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 302 | `'/admin/pricing/margin-metrics',...` |

---

#### `GET /pricing/margin-by-tier`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getMarginByTier`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 311 | `'/admin/pricing/margin-by-tier',...` |

---

#### `GET /pricing/margin-by-provider`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getMarginByProvider`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 320 | `'/admin/pricing/margin-by-provider',...` |

---

#### `GET /pricing/top-models`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getTopModels`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 329 | `'/admin/pricing/top-models',...` |

---

#### `GET /pricing/configs`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getPricingConfigs`
- **Middleware:** `auditLog`

**Usages (6):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 168 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 177 | ``/admin/pricing/configs/${id}`...` |
| `frontend\src\api\pricing.ts` | 185 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 194 | ``/admin/pricing/configs/${id}`,...` |
| `frontend\src\api\pricing.ts` | 203 | ``/admin/pricing/configs/${id}/approve`,...` |
| `frontend\src\api\pricing.ts` | 212 | ``/admin/pricing/configs/${id}/reject`,...` |

---

#### `GET /pricing/alerts`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getPricingAlerts`
- **Middleware:** `auditLog`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 264 | `'/admin/pricing/alerts',...` |
| `frontend\src\api\pricing.ts` | 273 | ``/admin/pricing/alerts/${alertId}/acknowledge`...` |
| `frontend\src\api\pricing.ts` | 281 | ``/admin/pricing/alerts/${alertId}/apply`...` |
| `frontend\src\api\pricing.ts` | 289 | ``/admin/pricing/alerts/${alertId}/ignore`,...` |

---

#### `GET /pricing/vendor-prices`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.getVendorPrices`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 255 | `'/admin/pricing/vendor-prices',...` |

---

#### `GET /user/profile`

**Definition:**
- **File:** `backend\src\routes\api.routes.ts`
- **Line:** 1
- **Handler:** `usersController.getUserProfile`
- **Middleware:** `authenticate`

**Usages (13):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 99 | `user_profile: '/api/user/profile',...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 93 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 108 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 119 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 136 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 151 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 202 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 218 | `.get('/api/user/profile');...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 228 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 245 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 259 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 318 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 373 | `.get('/api/user/profile')...` |

---

#### `GET /user/credits`

**Definition:**
- **File:** `backend\src\routes\api.routes.ts`
- **Line:** 1
- **Handler:** `creditsController.getDetailedCredits`
- **Middleware:** `authenticate`

**Usages (10):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 100 | `detailed_credits: '/api/user/credits',...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 93 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 105 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 123 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 138 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 147 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 159 | `.get('/api/user/credits');...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 170 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 182 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 235 | `.get('/api/user/credits')...` |

---

#### `GET /version`

**Definition:**
- **File:** `backend\src\routes\branding.routes.ts`
- **Line:** 1
- **Handler:** `brandingController.getLatestVersion`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 206 | ``/api/licenses/${licenseKey}/version-eligibility/${version}`...` |
| `frontend\src\services\api.ts` | 254 | `const response = await apiClient.get('/api/version');...` |
| `backend\src\routes\index.ts` | 120 | `version: '/api/version',...` |
| `backend\src\routes\plan110.routes.ts` | 121 | `'/licenses/:licenseKey/version-eligibility/:version',...` |

---

#### `GET /`

**Definition:**
- **File:** `backend\src\routes\index.ts`
- **Line:** 50

**Usages (856):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 96 | `'/admin/models/tiers',...` |
| `frontend\src\api\admin.ts` | 108 | ``/admin/models/${modelId}/tier`...` |
| `frontend\src\api\admin.ts` | 123 | ``/admin/models/${modelId}/tier`,...` |
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |
| `frontend\src\api\admin.ts` | 188 | `'/admin/models/providers'...` |
| `frontend\src\api\admin.ts` | 205 | `'/admin/analytics/dashboard-kpis',...` |
| `frontend\src\api\admin.ts` | 220 | `'/admin/analytics/recent-activity',...` |
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\admin.ts` | 600 | `'/admin/analytics/revenue/kpis',...` |
| `frontend\src\api\admin.ts` | 614 | `'/admin/analytics/revenue/mix',...` |
| `frontend\src\api\admin.ts` | 628 | `'/admin/analytics/revenue/trend',...` |
| `frontend\src\api\admin.ts` | 642 | `'/admin/analytics/revenue/conversion-funnel',...` |
| `frontend\src\api\admin.ts` | 658 | `'/admin/analytics/revenue/credit-usage',...` |
| `frontend\src\api\admin.ts` | 674 | `'/admin/analytics/revenue/coupon-roi',...` |
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |
| `frontend\src\api\plan109.ts` | 158 | `'/admin/users',...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |
| `frontend\src\api\plan109.ts` | 281 | `? `/admin/billing/invoices/${userId}`...` |
| `frontend\src\api\plan109.ts` | 282 | `: '/admin/billing/invoices';...` |
| `frontend\src\api\plan109.ts` | 295 | `? `/admin/billing/transactions/${userId}`...` |
| `frontend\src\api\plan109.ts` | 296 | `: '/admin/billing/transactions';...` |
| `frontend\src\api\plan109.ts` | 309 | ``/admin/billing/transactions/${transactionId}/refund`,...` |
| `frontend\src\api\plan109.ts` | 320 | `'/admin/billing/dunning'...` |
| `frontend\src\api\plan109.ts` | 330 | ``/admin/billing/dunning/${attemptId}/retry`...` |
| `frontend\src\api\plan109.ts` | 340 | `'/admin/analytics/revenue',...` |
| `frontend\src\api\plan109.ts` | 351 | `'/admin/analytics/revenue/by-tier',...` |
| `frontend\src\api\plan109.ts` | 368 | ``/admin/credits/balance/${userId}`...` |
| `frontend\src\api\plan109.ts` | 378 | ``/admin/credits/history/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 389 | ``/admin/credits/usage/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 400 | `'/admin/credits/grant-bonus',...` |
| `frontend\src\api\plan109.ts` | 411 | `'/admin/credits/process-monthly'...` |
| `frontend\src\api\plan109.ts` | 421 | `'/admin/analytics/credit-utilization',...` |
| `frontend\src\api\plan109.ts` | 432 | `'/admin/analytics/top-credit-consumers',...` |
| `frontend\src\api\plan109.ts` | 449 | `'/admin/analytics/dashboard'...` |
| `frontend\src\api\plan109.ts` | 459 | `'/admin/analytics/revenue/mrr'...` |
| `frontend\src\api\plan109.ts` | 469 | `'/admin/analytics/revenue/arr'...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan109.ts` | 499 | `'/admin/analytics/churn-rate',...` |
| `frontend\src\api\plan109.ts` | 510 | `'/admin/analytics/conversion-rate'...` |
| `frontend\src\api\plan109.ts` | 524 | `}>('/admin/analytics/revenue/funnel', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 568 | `}>('/admin/analytics/revenue/trend', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 624 | `}>('/admin/analytics/revenue/credit-usage', { params: { period, limit } });...` |
| `frontend\src\api\plan110.ts` | 58 | `'/admin/licenses',...` |
| `frontend\src\api\plan110.ts` | 69 | `'/admin/licenses/stats'...` |
| `frontend\src\api\plan110.ts` | 79 | ``/api/licenses/${licenseKey}`...` |
| `frontend\src\api\plan110.ts` | 89 | `'/api/licenses/purchase',...` |
| `frontend\src\api\plan110.ts` | 100 | ``/admin/licenses/${licenseId}/suspend`,...` |
| `frontend\src\api\plan110.ts` | 111 | ``/admin/licenses/${licenseId}/revoke`,...` |
| `frontend\src\api\plan110.ts` | 122 | ``/admin/licenses/${licenseId}/reactivate`...` |
| `frontend\src\api\plan110.ts` | 138 | ``/api/licenses/${licenseKey}/devices`...` |
| `frontend\src\api\plan110.ts` | 148 | `'/api/licenses/activate',...` |
| `frontend\src\api\plan110.ts` | 159 | ``/api/licenses/activations/${activationId}`...` |
| `frontend\src\api\plan110.ts` | 169 | ``/api/licenses/activations/${activationId}/replace`,...` |
| `frontend\src\api\plan110.ts` | 186 | ``/api/licenses/${licenseKey}/available-upgrades`...` |
| `frontend\src\api\plan110.ts` | 196 | ``/api/licenses/${licenseKey}/upgrade-history`...` |
| `frontend\src\api\plan110.ts` | 206 | ``/api/licenses/${licenseKey}/version-eligibility/${version}`...` |
| `frontend\src\api\plan110.ts` | 216 | ``/api/licenses/${licenseKey}/upgrade`,...` |
| `frontend\src\api\plan110.ts` | 227 | `'/admin/analytics/upgrade-conversion'...` |
| `frontend\src\api\plan110.ts` | 243 | `'/admin/prorations',...` |
| `frontend\src\api\plan110.ts` | 254 | `'/admin/prorations/stats'...` |
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 307 | ``/admin/prorations/${prorationId}/reverse`,...` |
| `frontend\src\api\plan110.ts` | 318 | ``/admin/prorations/${prorationId}/calculation`...` |
| `frontend\src\api\plan110.ts` | 334 | `'/api/migrations/eligibility'...` |
| `frontend\src\api\plan110.ts` | 344 | `'/api/migrations/history'...` |
| `frontend\src\api\plan110.ts` | 354 | ``/api/migrations/trade-in-value/${licenseId}`...` |
| `frontend\src\api\plan110.ts` | 364 | `'/api/migrations/perpetual-to-subscription',...` |
| `frontend\src\api\plan110.ts` | 375 | `'/api/migrations/subscription-to-perpetual',...` |
| `frontend\src\api\plan110.ts` | 392 | `'/admin/analytics/proration-revenue',...` |
| `frontend\src\api\plan110.ts` | 403 | `'/admin/analytics/proration-time-series',...` |
| `frontend\src\api\plan110.ts` | 414 | `'/admin/analytics/upgrade-distribution'...` |
| `frontend\src\api\plan110.ts` | 424 | `'/admin/analytics/tier-change-paths',...` |
| `frontend\src\api\plan111.ts` | 62 | `'/api/coupons/validate',...` |
| `frontend\src\api\plan111.ts` | 76 | `'/api/coupons/redeem',...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\api\plan111.ts` | 100 | `const response = await apiClient.post<Coupon>('/admin/coupons', data);...` |
| `frontend\src\api\plan111.ts` | 114 | ``/admin/coupons/${id}`,...` |
| `frontend\src\api\plan111.ts` | 125 | `await apiClient.delete(`/admin/coupons/${id}`);...` |
| `frontend\src\api\plan111.ts` | 145 | `'/admin/coupons',...` |
| `frontend\src\api\plan111.ts` | 164 | ``/admin/coupons/${id}/redemptions`,...` |
| `frontend\src\api\plan111.ts` | 180 | `'/admin/campaigns',...` |
| `frontend\src\api\plan111.ts` | 196 | ``/admin/campaigns/${id}`,...` |
| `frontend\src\api\plan111.ts` | 207 | `await apiClient.delete(`/admin/campaigns/${id}`);...` |
| `frontend\src\api\plan111.ts` | 227 | `'/admin/campaigns',...` |
| `frontend\src\api\plan111.ts` | 241 | ``/admin/campaigns/${id}/performance`...` |
| `frontend\src\api\plan111.ts` | 255 | `await apiClient.post(`/admin/campaigns/${campaignId}/assign-coupon`, {...` |
| `frontend\src\api\plan111.ts` | 270 | ``/admin/campaigns/${campaignId}/remove-coupon/${couponId}`...` |
| `frontend\src\api\plan111.ts` | 293 | `'/admin/fraud-detection',...` |
| `frontend\src\api\plan111.ts` | 311 | ``/admin/fraud-detection/${id}/review`,...` |
| `frontend\src\api\plan111.ts` | 322 | `'/admin/fraud-detection/pending'...` |
| `frontend\src\api\plan111.ts` | 343 | `'/admin/analytics/coupons',...` |
| `frontend\src\api\plan111.ts` | 360 | `'/admin/analytics/coupons/trend',...` |
| `frontend\src\api\plan111.ts` | 375 | `'/admin/analytics/coupons/top',...` |
| `frontend\src\api\plan111.ts` | 386 | `'/admin/analytics/coupons/by-type'...` |
| `frontend\src\api\pricing.ts` | 168 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 177 | ``/admin/pricing/configs/${id}`...` |
| `frontend\src\api\pricing.ts` | 185 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 194 | ``/admin/pricing/configs/${id}`,...` |
| `frontend\src\api\pricing.ts` | 203 | ``/admin/pricing/configs/${id}/approve`,...` |
| `frontend\src\api\pricing.ts` | 212 | ``/admin/pricing/configs/${id}/reject`,...` |
| `frontend\src\api\pricing.ts` | 225 | `'/admin/pricing/simulate',...` |
| `frontend\src\api\pricing.ts` | 234 | `'/admin/pricing/scenarios',...` |
| `frontend\src\api\pricing.ts` | 243 | `'/admin/pricing/scenarios'...` |
| `frontend\src\api\pricing.ts` | 255 | `'/admin/pricing/vendor-prices',...` |
| `frontend\src\api\pricing.ts` | 264 | `'/admin/pricing/alerts',...` |
| `frontend\src\api\pricing.ts` | 273 | ``/admin/pricing/alerts/${alertId}/acknowledge`...` |
| `frontend\src\api\pricing.ts` | 281 | ``/admin/pricing/alerts/${alertId}/apply`...` |
| `frontend\src\api\pricing.ts` | 289 | ``/admin/pricing/alerts/${alertId}/ignore`,...` |
| `frontend\src\api\pricing.ts` | 302 | `'/admin/pricing/margin-metrics',...` |
| `frontend\src\api\pricing.ts` | 311 | `'/admin/pricing/margin-by-tier',...` |
| `frontend\src\api\pricing.ts` | 320 | `'/admin/pricing/margin-by-provider',...` |
| `frontend\src\api\pricing.ts` | 329 | `'/admin/pricing/top-models',...` |
| `frontend\src\api\pricing.ts` | 345 | `}>('/admin/pricing/margin-history', {...` |
| `frontend\src\api\settings.api.ts` | 54 | `'/admin/settings'...` |
| `frontend\src\api\settings.api.ts` | 64 | ``/admin/settings/${category}`...` |
| `frontend\src\api\settings.api.ts` | 77 | ``/admin/settings/${category}`,...` |
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `frontend\src\App.tsx` | 27 | `{ path: '/oauth/callback', element: <OAuthCallback /> },...` |
| `frontend\src\App.tsx` | 31 | `{ path: '/admin/model-tiers', element: <ProtectedRoute><ModelTierManagement /></...` |
| `frontend\src\App.tsx` | 32 | `{ path: '/admin/pricing-configuration', element: <ProtectedRoute><PricingConfigu...` |
| `frontend\src\App.tsx` | 33 | `{ path: '/admin/pricing-simulation', element: <ProtectedRoute><PricingSimulation...` |
| `frontend\src\App.tsx` | 34 | `{ path: '/admin/vendor-price-monitoring', element: <ProtectedRoute><VendorPriceM...` |
| `frontend\src\App.tsx` | 35 | `{ path: '/admin/margin-tracking', element: <ProtectedRoute><MarginTracking /></P...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 53 | `{ name: 'User List', href: '/admin/users' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 63 | `{ name: 'Subscription Management', href: '/admin/subscriptions' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 64 | `{ name: 'Billing Dashboard', href: '/admin/billing' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 65 | `{ name: 'Credit Management', href: '/admin/credits' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 75 | `{ name: 'License Management', href: '/admin/licenses' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 76 | `{ name: 'Device Activations', href: '/admin/licenses/devices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 77 | `{ name: 'Proration Tracking', href: '/admin/licenses/prorations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 87 | `{ name: 'Coupon Management', href: '/admin/coupons' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 88 | `{ name: 'Campaign Management', href: '/admin/coupons/campaigns' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 89 | `{ name: 'Campaign Calendar', href: '/admin/coupons/calendar' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 90 | `{ name: 'Coupon Analytics', href: '/admin/coupons/analytics' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 91 | `{ name: 'Fraud Detection', href: '/admin/coupons/fraud' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 101 | `{ name: 'Margin Tracking', href: '/admin/profitability/margins' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 102 | `{ name: 'Pricing Configuration', href: '/admin/profitability/pricing' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 103 | `{ name: 'Pricing Simulator', href: '/admin/profitability/simulator' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 104 | `{ name: 'Vendor Price Monitoring', href: '/admin/profitability/vendor-prices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 114 | `{ name: 'Model Tier Management', href: '/admin/models' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 124 | `{ name: 'Platform Analytics', href: '/admin/analytics' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 125 | `{ name: 'Revenue Analytics', href: '/admin/analytics/revenue' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 135 | `{ name: 'General', href: '/admin/settings#general' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 136 | `{ name: 'Email & Notifications', href: '/admin/settings#email' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 137 | `{ name: 'Security', href: '/admin/settings#security' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 138 | `{ name: 'Integrations', href: '/admin/settings#integrations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 139 | `{ name: 'Feature Flags', href: '/admin/settings#features' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 140 | `{ name: 'System', href: '/admin/settings#system' },...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 434 | `to: '/admin/coupons/new',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 441 | `to: '/admin/analytics',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 448 | `to: '/admin/settings',...` |
| `frontend\src\pages\admin\AdminSettings.tsx` | 293 | `navigate(`/admin/settings#${tab.id}`, { replace: true });...` |
| `frontend\src\pages\admin\CampaignManagement.tsx` | 205 | `{ label: 'Campaign Management', href: '/admin/campaigns' },...` |
| `frontend\src\pages\admin\SubscriptionManagement.tsx` | 517 | `<Link to={`/admin/subscriptions/${subscription.id}`}>...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 76 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 103 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 112 | `onClick={() => navigate('/admin/users')}...` |
| `frontend\src\pages\Admin.tsx` | 96 | `<Link to="/admin/model-tiers">...` |
| `frontend\src\pages\Admin.tsx` | 114 | `<Link to="/admin/pricing-configuration">...` |
| `frontend\src\pages\Admin.tsx` | 132 | `<Link to="/admin/pricing-simulation">...` |
| `frontend\src\pages\Admin.tsx` | 150 | `<Link to="/admin/vendor-price-monitoring">...` |
| `frontend\src\pages\Admin.tsx` | 168 | `<Link to="/admin/margin-tracking">...` |
| `frontend\src\services\api.ts` | 132 | `const isOAuthCallback = window.location.pathname.includes('/oauth/callback');...` |
| `frontend\src\services\api.ts` | 195 | `if (!window.location.pathname.includes('/oauth/callback') &&...` |
| `frontend\src\services\api.ts` | 208 | `if (!window.location.pathname.includes('/oauth/callback') &&...` |
| `frontend\src\services\api.ts` | 242 | `const response = await apiClient.post('/api/track-download', { os });...` |
| `frontend\src\services\api.ts` | 248 | `const response = await apiClient.post('/api/feedback', data);...` |
| `frontend\src\services\api.ts` | 254 | `const response = await apiClient.get('/api/version');...` |
| `frontend\src\services\api.ts` | 260 | `const response = await apiClient.get('/admin/metrics');...` |
| `frontend\src\utils\breadcrumbs.ts` | 63 | `'/admin/subscriptions': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 64 | `'/admin/billing': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 65 | `'/admin/credits': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 67 | `'/admin/licenses': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 68 | `'/admin/licenses/devices': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 69 | `'/admin/licenses/prorations': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 71 | `'/admin/coupons': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 72 | `'/admin/coupons/campaigns': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 73 | `'/admin/coupons/calendar': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 74 | `'/admin/coupons/analytics': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 75 | `'/admin/coupons/fraud': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 77 | `'/admin/profitability/margins': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 78 | `'/admin/profitability/pricing': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 79 | `'/admin/profitability/simulator': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 80 | `'/admin/profitability/vendor-prices': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 82 | `'/admin/analytics': 'Analytics',...` |
| `frontend\src\utils\breadcrumbs.ts` | 83 | `'/admin/analytics/revenue': 'Analytics',...` |
| `frontend\src\utils\breadcrumbs.ts` | 88 | `* @param pathname - Current pathname (e.g., '/admin/coupons/analytics')...` |
| `backend\coverage\lcov-report\prettify.js` | 2 | `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,els...` |
| `backend\coverage\prettify.js` | 2 | `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,els...` |
| `backend\src\controllers\models.controller.ts` | 254 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\controllers\models.controller.ts` | 407 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\auth.middleware.ts` | 439 | `*   app.get('/admin/models', authMiddleware, requireAdmin, handler);...` |
| `backend\src\middleware\credit.middleware.ts` | 8 | `*   app.post('/v1/completions', authMiddleware, checkCredits(), handler);...` |
| `backend\src\middleware\ip-whitelist.middleware.ts` | 29 | `* router.post('/admin/sensitive-action',...` |
| `backend\src\middleware\permission.middleware.ts` | 22 | `*   router.get('/admin/users', authMiddleware, requirePermission('users.view'), ...` |
| `backend\src\middleware\permission.middleware.ts` | 25 | `*   router.get('/admin/analytics', authMiddleware, requireAnyPermission(['analyt...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 55 | `* router.get('/admin/users', authMiddleware, requirePermission('users.view'), ha...` |
| `backend\src\middleware\permission.middleware.ts` | 159 | `* router.get('/admin/analytics',...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\middleware\require-mfa.middleware.ts` | 10 | `*   router.post('/admin/sensitive-operation',...` |
| `backend\src\middleware\typeValidation.middleware.ts` | 139 | `*   router.get('/users/:id',...` |
| `backend\src\middleware\typeValidation.middleware.ts` | 242 | `* router.patch('/users/:id',...` |
| `backend\src\routes\admin.routes.ts` | 88 | `'/users/:id/suspend',...` |
| `backend\src\routes\admin.routes.ts` | 124 | `'/webhooks/test',...` |
| `backend\src\routes\admin.routes.ts` | 146 | `'/analytics/dashboard-kpis',...` |
| `backend\src\routes\admin.routes.ts` | 166 | `'/analytics/recent-activity',...` |
| `backend\src\routes\admin.routes.ts` | 185 | `'/models/tiers',...` |
| `backend\src\routes\admin.routes.ts` | 202 | `'/models/tiers/audit-logs',...` |
| `backend\src\routes\admin.routes.ts` | 220 | `'/models/:modelId/tier',...` |
| `backend\src\routes\admin.routes.ts` | 233 | `'/models/tiers/bulk',...` |
| `backend\src\routes\admin.routes.ts` | 245 | `'/models/tiers/revert/:auditLogId',...` |
| `backend\src\routes\admin.routes.ts` | 257 | `'/models/providers',...` |
| `backend\src\routes\admin.routes.ts` | 295 | `'/audit-logs/resource/:resourceType/:resourceId',...` |
| `backend\src\routes\admin.routes.ts` | 310 | `'/audit-logs/admin/:adminUserId',...` |
| `backend\src\routes\admin.routes.ts` | 333 | `'/users/:id/overview',...` |
| `backend\src\routes\admin.routes.ts` | 355 | `'/users/:id/subscriptions',...` |
| `backend\src\routes\admin.routes.ts` | 378 | `'/users/:id/licenses',...` |
| `backend\src\routes\admin.routes.ts` | 403 | `'/users/:id/credits',...` |
| `backend\src\routes\admin.routes.ts` | 426 | `'/users/:id/coupons',...` |
| `backend\src\routes\admin.routes.ts` | 452 | `'/users/:id/payments',...` |
| `backend\src\routes\admin.routes.ts` | 475 | `'/users/:id/activity',...` |
| `backend\src\routes\admin.routes.ts` | 499 | `'/analytics/revenue/kpis',...` |
| `backend\src\routes\admin.routes.ts` | 517 | `'/analytics/revenue/mix',...` |
| `backend\src\routes\admin.routes.ts` | 538 | `'/analytics/revenue/trend',...` |
| `backend\src\routes\admin.routes.ts` | 556 | `'/analytics/revenue/conversion-funnel',...` |
| `backend\src\routes\admin.routes.ts` | 567 | `'/analytics/revenue/funnel',...` |
| `backend\src\routes\admin.routes.ts` | 584 | `'/analytics/revenue/credit-usage',...` |
| `backend\src\routes\admin.routes.ts` | 601 | `'/analytics/revenue/coupon-roi',...` |
| `backend\src\routes\admin.routes.ts` | 623 | `'/users/:id/role',...` |
| `backend\src\routes\admin.routes.ts` | 698 | `'/settings/:category',...` |
| `backend\src\routes\admin.routes.ts` | 717 | `'/settings/:category',...` |
| `backend\src\routes\admin.routes.ts` | 740 | `'/settings/test-email',...` |
| `backend\src\routes\admin.routes.ts` | 754 | `'/settings/clear-cache',...` |
| `backend\src\routes\admin.routes.ts` | 769 | `'/settings/run-backup',...` |
| `backend\src\routes\admin.routes.ts` | 791 | `'/billing/invoices',...` |
| `backend\src\routes\admin.routes.ts` | 809 | `'/billing/transactions',...` |
| `backend\src\routes\admin.routes.ts` | 822 | `'/billing/dunning',...` |
| `backend\src\routes\admin.routes.ts` | 847 | `'/pricing/margin-metrics',...` |
| `backend\src\routes\admin.routes.ts` | 864 | `'/pricing/margin-by-tier',...` |
| `backend\src\routes\admin.routes.ts` | 881 | `'/pricing/margin-by-provider',...` |
| `backend\src\routes\admin.routes.ts` | 899 | `'/pricing/top-models',...` |
| `backend\src\routes\admin.routes.ts` | 915 | `'/pricing/configs',...` |
| `backend\src\routes\admin.routes.ts` | 928 | `'/pricing/alerts',...` |
| `backend\src\routes\admin.routes.ts` | 944 | `'/pricing/vendor-prices',...` |
| `backend\src\routes\admin.routes.ts` | 971 | `'/pricing/simulate',...` |
| `backend\src\routes\api.routes.ts` | 102 | `'/user/profile',...` |
| `backend\src\routes\api.routes.ts` | 139 | `'/user/credits',...` |
| `backend\src\routes\index.ts` | 60 | `openapi_spec: '/api-docs/swagger.json',...` |
| `backend\src\routes\index.ts` | 64 | `ready: '/health/ready',...` |
| `backend\src\routes\index.ts` | 65 | `live: '/health/live',...` |
| `backend\src\routes\index.ts` | 68 | `register: '/auth/register',...` |
| `backend\src\routes\index.ts` | 69 | `verify_email: '/auth/verify-email',...` |
| `backend\src\routes\index.ts` | 70 | `forgot_password: '/auth/forgot-password',...` |
| `backend\src\routes\index.ts` | 71 | `reset_password: '/auth/reset-password',...` |
| `backend\src\routes\index.ts` | 72 | `mfa_setup: '/auth/mfa/setup',...` |
| `backend\src\routes\index.ts` | 73 | `mfa_verify_setup: '/auth/mfa/verify-setup',...` |
| `backend\src\routes\index.ts` | 74 | `mfa_verify_login: '/auth/mfa/verify-login',...` |
| `backend\src\routes\index.ts` | 75 | `mfa_disable: '/auth/mfa/disable',...` |
| `backend\src\routes\index.ts` | 76 | `mfa_backup_code_login: '/auth/mfa/backup-code-login',...` |
| `backend\src\routes\index.ts` | 77 | `mfa_status: '/auth/mfa/status',...` |
| `backend\src\routes\index.ts` | 80 | `discovery: '/.well-known/openid-configuration',...` |
| `backend\src\routes\index.ts` | 81 | `authorize: '/oauth/authorize',...` |
| `backend\src\routes\index.ts` | 82 | `token: '/oauth/token',...` |
| `backend\src\routes\index.ts` | 83 | `revoke: '/oauth/revoke',...` |
| `backend\src\routes\index.ts` | 84 | `userinfo: '/oauth/userinfo',...` |
| `backend\src\routes\index.ts` | 85 | `jwks: '/oauth/jwks',...` |
| `backend\src\routes\index.ts` | 86 | `google_authorize: '/oauth/google/authorize',...` |
| `backend\src\routes\index.ts` | 87 | `google_callback: '/oauth/google/callback',...` |
| `backend\src\routes\index.ts` | 90 | `models: '/v1/models',...` |
| `backend\src\routes\index.ts` | 91 | `completions: '/v1/completions',...` |
| `backend\src\routes\index.ts` | 92 | `chat: '/v1/chat/completions',...` |
| `backend\src\routes\index.ts` | 93 | `subscriptions: '/v1/subscriptions',...` |
| `backend\src\routes\index.ts` | 94 | `credits: '/v1/credits',...` |
| `backend\src\routes\index.ts` | 95 | `usage: '/v1/usage',...` |
| `backend\src\routes\index.ts` | 96 | `users: '/v1/users',...` |
| `backend\src\routes\index.ts` | 99 | `user_profile: '/api/user/profile',...` |
| `backend\src\routes\index.ts` | 100 | `detailed_credits: '/api/user/credits',...` |
| `backend\src\routes\index.ts` | 101 | `oauth_token_enhance: '/oauth/token/enhance',...` |
| `backend\src\routes\index.ts` | 102 | `licenses: '/api/licenses',...` |
| `backend\src\routes\index.ts` | 103 | `version_upgrades: '/api/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\index.ts` | 105 | `migrations: '/api/migrations',...` |
| `backend\src\routes\index.ts` | 108 | `metrics: '/admin/metrics',...` |
| `backend\src\routes\index.ts` | 109 | `users: '/admin/users',...` |
| `backend\src\routes\index.ts` | 110 | `subscriptions: '/admin/subscriptions',...` |
| `backend\src\routes\index.ts` | 111 | `usage: '/admin/usage',...` |
| `backend\src\routes\index.ts` | 112 | `licenses: '/admin/licenses',...` |
| `backend\src\routes\index.ts` | 113 | `prorations: '/admin/prorations',...` |
| `backend\src\routes\index.ts` | 114 | `upgrade_analytics: '/admin/analytics/upgrade-conversion',...` |
| `backend\src\routes\index.ts` | 117 | `downloads: '/api/track-download',...` |
| `backend\src\routes\index.ts` | 118 | `feedback: '/api/feedback',...` |
| `backend\src\routes\index.ts` | 119 | `diagnostics: '/api/diagnostics',...` |
| `backend\src\routes\index.ts` | 120 | `version: '/api/version',...` |
| `backend\src\routes\index.ts` | 173 | `router.get('/health/ready', async (_req: Request, res: Response) => {...` |
| `backend\src\routes\index.ts` | 212 | `router.get('/health/live', (_req: Request, res: Response) => {...` |
| `backend\src\routes\index.ts` | 252 | `router.use('/auth/mfa', createMFARouter());...` |
| `backend\src\routes\index.ts` | 269 | `'/webhooks/stripe',...` |
| `backend\src\routes\plan109.routes.ts` | 67 | `'/subscriptions/:id/upgrade',...` |
| `backend\src\routes\plan109.routes.ts` | 77 | `'/subscriptions/:id/downgrade',...` |
| `backend\src\routes\plan109.routes.ts` | 87 | `'/subscriptions/:id/cancel',...` |
| `backend\src\routes\plan109.routes.ts` | 97 | `'/subscriptions/:id/reactivate',...` |
| `backend\src\routes\plan109.routes.ts` | 107 | `'/subscriptions/:id/allocate-credits',...` |
| `backend\src\routes\plan109.routes.ts` | 117 | `'/subscriptions/:id/rollover',...` |
| `backend\src\routes\plan109.routes.ts` | 127 | `'/subscriptions/:userId/features',...` |
| `backend\src\routes\plan109.routes.ts` | 136 | `'/subscriptions/:userId/limits',...` |
| `backend\src\routes\plan109.routes.ts` | 145 | `'/subscriptions/user/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 154 | `'/subscriptions/all',...` |
| `backend\src\routes\plan109.routes.ts` | 163 | `'/subscriptions/stats',...` |
| `backend\src\routes\plan109.routes.ts` | 185 | `'/users/search',...` |
| `backend\src\routes\plan109.routes.ts` | 194 | `'/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 203 | `'/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 213 | `'/users/:id/suspend',...` |
| `backend\src\routes\plan109.routes.ts` | 223 | `'/users/:id/unsuspend',...` |
| `backend\src\routes\plan109.routes.ts` | 233 | `'/users/:id/ban',...` |
| `backend\src\routes\plan109.routes.ts` | 243 | `'/users/:id/unban',...` |
| `backend\src\routes\plan109.routes.ts` | 253 | `'/users/bulk-update',...` |
| `backend\src\routes\plan109.routes.ts` | 263 | `'/users/:id/adjust-credits',...` |
| `backend\src\routes\plan109.routes.ts` | 277 | `'/billing/payment-methods',...` |
| `backend\src\routes\plan109.routes.ts` | 287 | `'/billing/payment-methods/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 297 | `'/billing/payment-methods/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 306 | `'/billing/invoices/:subscriptionId',...` |
| `backend\src\routes\plan109.routes.ts` | 316 | `'/billing/invoices/upcoming/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 325 | `'/billing/invoices/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 334 | `'/billing/transactions/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 343 | `'/billing/transactions/:id/refund',...` |
| `backend\src\routes\plan109.routes.ts` | 353 | `'/billing/dunning/:attemptId/retry',...` |
| `backend\src\routes\plan109.routes.ts` | 367 | `'/credits/allocate',...` |
| `backend\src\routes\plan109.routes.ts` | 377 | `'/credits/process-monthly',...` |
| `backend\src\routes\plan109.routes.ts` | 387 | `'/credits/grant-bonus',...` |
| `backend\src\routes\plan109.routes.ts` | 397 | `'/credits/deduct',...` |
| `backend\src\routes\plan109.routes.ts` | 407 | `'/credits/rollover/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 416 | `'/credits/rollover/:userId/apply',...` |
| `backend\src\routes\plan109.routes.ts` | 426 | `'/credits/sync/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 436 | `'/credits/reconcile/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 445 | `'/credits/balance/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 454 | `'/credits/history/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 463 | `'/credits/usage/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 476 | `'/analytics/revenue',...` |
| `backend\src\routes\plan109.routes.ts` | 485 | `'/analytics/revenue/mrr',...` |
| `backend\src\routes\plan109.routes.ts` | 494 | `'/analytics/revenue/arr',...` |
| `backend\src\routes\plan109.routes.ts` | 503 | `'/analytics/revenue/by-tier',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan109.routes.ts` | 530 | `'/analytics/churn-rate',...` |
| `backend\src\routes\plan109.routes.ts` | 539 | `'/analytics/credit-utilization',...` |
| `backend\src\routes\plan109.routes.ts` | 548 | `'/analytics/conversion-rate',...` |
| `backend\src\routes\plan109.routes.ts` | 557 | `'/analytics/dashboard',...` |
| `backend\src\routes\plan110.routes.ts` | 54 | `'/licenses/purchase',...` |
| `backend\src\routes\plan110.routes.ts` | 65 | `'/licenses/activate',...` |
| `backend\src\routes\plan110.routes.ts` | 75 | `'/licenses/activations/:id',...` |
| `backend\src\routes\plan110.routes.ts` | 86 | `'/licenses/activations/:id/replace',...` |
| `backend\src\routes\plan110.routes.ts` | 97 | `'/licenses/:licenseKey',...` |
| `backend\src\routes\plan110.routes.ts` | 107 | `'/licenses/:licenseKey/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 121 | `'/licenses/:licenseKey/version-eligibility/:version',...` |
| `backend\src\routes\plan110.routes.ts` | 131 | `'/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\plan110.routes.ts` | 142 | `'/licenses/:licenseKey/available-upgrades',...` |
| `backend\src\routes\plan110.routes.ts` | 152 | `'/licenses/:licenseKey/upgrade-history',...` |
| `backend\src\routes\plan110.routes.ts` | 166 | `'/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\plan110.routes.ts` | 177 | `'/subscriptions/:id/upgrade-with-proration',...` |
| `backend\src\routes\plan110.routes.ts` | 188 | `'/subscriptions/:id/downgrade-with-proration',...` |
| `backend\src\routes\plan110.routes.ts` | 199 | `'/subscriptions/:id/proration-history',...` |
| `backend\src\routes\plan110.routes.ts` | 214 | `'/migrations/perpetual-to-subscription',...` |
| `backend\src\routes\plan110.routes.ts` | 225 | `'/migrations/subscription-to-perpetual',...` |
| `backend\src\routes\plan110.routes.ts` | 236 | `'/migrations/trade-in-value/:licenseId',...` |
| `backend\src\routes\plan110.routes.ts` | 247 | `'/migrations/eligibility',...` |
| `backend\src\routes\plan110.routes.ts` | 258 | `'/migrations/history',...` |
| `backend\src\routes\plan110.routes.ts` | 273 | `'/admin/licenses/:id/suspend',...` |
| `backend\src\routes\plan110.routes.ts` | 286 | `'/admin/licenses/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 299 | `'/admin/licenses',...` |
| `backend\src\routes\plan110.routes.ts` | 311 | `'/admin/licenses/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 327 | `'/admin/licenses/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 338 | `'/admin/licenses/devices/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 349 | `'/admin/licenses/devices/:id/deactivate',...` |
| `backend\src\routes\plan110.routes.ts` | 361 | `'/admin/licenses/devices/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 373 | `'/admin/licenses/devices/bulk-action',...` |
| `backend\src\routes\plan110.routes.ts` | 390 | `'/admin/prorations',...` |
| `backend\src\routes\plan110.routes.ts` | 402 | `'/admin/prorations/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 414 | `'/admin/prorations/:id/reverse',...` |
| `backend\src\routes\plan110.routes.ts` | 427 | `'/admin/prorations/:id/calculation',...` |
| `backend\src\routes\plan110.routes.ts` | 443 | `'/admin/analytics/upgrade-conversion',...` |
| `backend\src\routes\plan111.routes.ts` | 57 | `'/api/coupons/validate',...` |
| `backend\src\routes\plan111.routes.ts` | 66 | `'/api/coupons/redeem',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 88 | `'/admin/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 100 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 112 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 124 | `'/admin/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 135 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 146 | `'/admin/coupons/:id/redemptions',...` |
| `backend\src\routes\plan111.routes.ts` | 159 | `'/admin/campaigns',...` |
| `backend\src\routes\plan111.routes.ts` | 171 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 183 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 195 | `'/admin/campaigns',...` |
| `backend\src\routes\plan111.routes.ts` | 206 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 217 | `'/admin/campaigns/:id/performance',...` |
| `backend\src\routes\plan111.routes.ts` | 228 | `'/admin/campaigns/:id/assign-coupon',...` |
| `backend\src\routes\plan111.routes.ts` | 240 | `'/admin/campaigns/:id/remove-coupon/:couponId',...` |
| `backend\src\routes\plan111.routes.ts` | 254 | `'/admin/fraud-detection',...` |
| `backend\src\routes\plan111.routes.ts` | 265 | `'/admin/fraud-detection/:id/review',...` |
| `backend\src\routes\plan111.routes.ts` | 277 | `'/admin/fraud-detection/pending',...` |
| `backend\src\routes\plan111.routes.ts` | 294 | `'/admin/analytics/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 310 | `'/admin/analytics/coupons/trend',...` |
| `backend\src\routes\plan111.routes.ts` | 325 | `'/admin/analytics/coupons/top',...` |
| `backend\src\routes\plan111.routes.ts` | 337 | `'/admin/analytics/coupons/by-type',...` |
| `backend\src\routes\social-auth.routes.ts` | 65 | `'/oauth/google/authorize',...` |
| `backend\src\routes\social-auth.routes.ts` | 110 | `'/oauth/google/callback',...` |
| `backend\src\routes\v1.routes.ts` | 56 | `'/users/me',...` |
| `backend\src\routes\v1.routes.ts` | 68 | `'/users/me',...` |
| `backend\src\routes\v1.routes.ts` | 80 | `'/users/me/preferences',...` |
| `backend\src\routes\v1.routes.ts` | 92 | `'/users/me/preferences',...` |
| `backend\src\routes\v1.routes.ts` | 104 | `'/users/me/preferences/model',...` |
| `backend\src\routes\v1.routes.ts` | 116 | `'/users/me/preferences/model',...` |
| `backend\src\routes\v1.routes.ts` | 144 | `'/models/:modelId',...` |
| `backend\src\routes\v1.routes.ts` | 173 | `'/chat/completions',...` |
| `backend\src\routes\v1.routes.ts` | 200 | `'/subscriptions/me',...` |
| `backend\src\routes\v1.routes.ts` | 222 | `'/subscriptions/me',...` |
| `backend\src\routes\v1.routes.ts` | 233 | `'/subscriptions/me/cancel',...` |
| `backend\src\routes\v1.routes.ts` | 248 | `'/credits/me',...` |
| `backend\src\routes\v1.routes.ts` | 272 | `'/usage/stats',...` |
| `backend\src\routes\v1.routes.ts` | 300 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 311 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 322 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 333 | `'/webhooks/test',...` |
| `backend\src\services\model.service.ts` | 264 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\services\token-introspection.service.ts` | 126 | `const response = await fetch(`${this.identityProviderUrl}/oauth/jwks`);...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 74 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 88 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 104 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 126 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 146 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 167 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 191 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 206 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 227 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 237 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 247 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 257 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 282 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 291 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 300 | `endpoint: '/admin/coupons/456',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 309 | `endpoint: '/admin/licenses',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 392 | `endpoint: '/admin/test',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 433 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 443 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 453 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 463 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 512 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 524 | `endpoint: '/admin/coupons/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 583 | `endpoint: '/admin/coupons/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 633 | `endpoint: '/admin/users',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 112 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 131 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 164 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 209 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 220 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 240 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 266 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 285 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 377 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 391 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 403 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 474 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 484 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 510 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 517 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 578 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 596 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 610 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 641 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 93 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 105 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 123 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 138 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 147 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 159 | `.get('/api/user/credits');...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 170 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 182 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 235 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 100 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 127 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 155 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 245 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 255 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 304 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 328 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 352 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 370 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 383 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 395 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 409 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 425 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 453 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 485 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 593 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 146 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 169 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 187 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 196 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 277 | `request(app).get('/admin/users').set('Authorization', `Bearer ${adminToken}`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 346 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 358 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 373 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 393 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 407 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 424 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 447 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 476 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 652 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 76 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 109 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 124 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 133 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 150 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 166 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 188 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 214 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 231 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 274 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 287 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 308 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 337 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 384 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 405 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 418 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 427 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 467 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 495 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 514 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 552 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 572 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 582 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 196 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 228 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 244 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 262 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 276 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 290 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 300 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 311 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 93 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 108 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 119 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 136 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 151 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 202 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 218 | `.get('/api/user/profile');...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 228 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 245 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 259 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 318 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 373 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\unit\model.service.tier.test.ts` | 435 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\test-oauth-flow.js` | 35 | `path: '/oauth/jwks',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 30 | `.post('/oauth/register')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 46 | `.post('/oauth/token')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 78 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 89 | `.get('/v1/models')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 111 | `.post('/v1/subscriptions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 127 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 146 | `.post('/v1/chat/completions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 167 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 179 | `.get('/v1/usage')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 192 | `.get('/v1/usage/stats')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 216 | `.post('/oauth/token')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\helpers\mocks.ts` | 38 | `.post('/v1/chat/completions')...` |
| `backend\tests\helpers\mocks.ts` | 73 | `.post('/v1/messages')...` |
| `backend\tests\helpers\mocks.ts` | 119 | `.post('/v1/customers')...` |
| `backend\tests\helpers\mocks.ts` | 133 | `.post('/v1/subscriptions')...` |
| `backend\tests\helpers\mocks.ts` | 159 | `.delete(`/v1/subscriptions/${subscriptionId}`)...` |
| `backend\tests\integration\auth.integration.test.ts` | 49 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 77 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 95 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 107 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 116 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 125 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 134 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 148 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 167 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 193 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 207 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 221 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 233 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 249 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 272 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 288 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 305 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 321 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 340 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 368 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 383 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 398 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 414 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 435 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 456 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 472 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 491 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 503 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\credits.test.ts` | 52 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 70 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 77 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 101 | `.get('/v1/usage?limit=5&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 120 | `.get('/v1/usage?model_id=gpt-5')...` |
| `backend\tests\integration\credits.test.ts` | 132 | `.get('/v1/usage?operation=chat')...` |
| `backend\tests\integration\credits.test.ts` | 146 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\credits.test.ts` | 158 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 168 | `.get('/v1/usage?limit=101')...` |
| `backend\tests\integration\credits.test.ts` | 175 | `.get('/v1/usage?offset=-1')...` |
| `backend\tests\integration\credits.test.ts` | 182 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 194 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 209 | `.get('/v1/usage/stats?group_by=hour')...` |
| `backend\tests\integration\credits.test.ts` | 222 | `.get('/v1/usage/stats?group_by=model')...` |
| `backend\tests\integration\credits.test.ts` | 241 | `.get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_dat...` |
| `backend\tests\integration\credits.test.ts` | 250 | `.get('/v1/usage/stats?group_by=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 257 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 269 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 289 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 304 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 314 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 326 | `.get('/v1/usage?limit=10&offset=1000')...` |
| `backend\tests\integration\credits.test.ts` | 336 | `.get('/v1/usage?limit=1&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 346 | `.get('/v1/usage?limit=100')...` |
| `backend\tests\integration\credits.test.ts` | 361 | `.get('/v1/usage?start_date=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 368 | `.get('/v1/usage?end_date=not-a-date')...` |
| `backend\tests\integration\credits.test.ts` | 378 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\model-tier-access.test.ts` | 96 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 130 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 153 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 169 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 178 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 190 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 201 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\tests\integration\model-tier-access.test.ts` | 207 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 218 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 225 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 246 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 267 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 284 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 298 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 317 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 333 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 347 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 357 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 380 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 398 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 411 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 424 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 437 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 453 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 484 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 505 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 522 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 64 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 90 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 125 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 151 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 181 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 199 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 211 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 248 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 280 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 306 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 337 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 372 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 401 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 443 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 466 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 496 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 519 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 550 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 37 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 62 | `.get('/v1/models?provider=openai')...` |
| `backend\tests\integration\models.test.ts` | 74 | `.get('/v1/models?capability=vision')...` |
| `backend\tests\integration\models.test.ts` | 85 | `await request(app).get('/v1/models').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 90 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 99 | `.get('/v1/models/gpt-5')...` |
| `backend\tests\integration\models.test.ts` | 120 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\models.test.ts` | 126 | `await request(app).get('/v1/models/gpt-5').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 139 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 170 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 180 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 191 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 210 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 247 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 257 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 268 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 288 | `request(app).get('/v1/models').set('Authorization', `Bearer ${authToken}`)...` |
| `backend\tests\integration\models.test.ts` | 300 | `.get('/v1/models')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 313 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 329 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 342 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 388 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 408 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 425 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 453 | `endpoint: '/admin/coupons/coupon-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 478 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 505 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 516 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 527 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 605 | `endpoint: `/admin/subscriptions/${subscription.id}`,...` |
| `backend\tests\integration\settings-api.test.ts` | 70 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 86 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 92 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 99 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 113 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 125 | `.get('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 135 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 141 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 156 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 176 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 208 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 227 | `.put('/admin/settings/integrations')...` |
| `backend\tests\integration\settings-api.test.ts` | 259 | `.put('/admin/settings/feature_flags')...` |
| `backend\tests\integration\settings-api.test.ts` | 277 | `.put('/admin/settings/system')...` |
| `backend\tests\integration\settings-api.test.ts` | 289 | `.put('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 300 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 312 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 323 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 334 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 341 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 467 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 474 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 484 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 491 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 498 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\subscriptions.test.ts` | 63 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 75 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 91 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 147 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 172 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 194 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 208 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 222 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 236 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 120 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 135 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 149 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 169 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 186 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 201 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 215 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 230 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 243 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 261 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 276 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 288 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 303 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 315 | `.post('/v1/messages')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 326 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 341 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 360 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 375 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 389 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 405 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 421 | `.post('/v1/messages')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 432 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 447 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 476 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 492 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 502 | `.post('/v1/completions')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 182 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 228 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 279 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 320 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 399 | `.post('/v1/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 418 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 452 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 540 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 651 | `.post('/v1/completions')...` |

---

#### `GET /health`

**Definition:**
- **File:** `backend\src\routes\index.ts`
- **Line:** 131

**Usages:** None found

---

#### `GET /health/ready`

**Definition:**
- **File:** `backend\src\routes\index.ts`
- **Line:** 173

**Usages:** None found

---

#### `GET /health/live`

**Definition:**
- **File:** `backend\src\routes\index.ts`
- **Line:** 212

**Usages:** None found

---

#### `GET /status`

**Definition:**
- **File:** `backend\src\routes\mfa.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 77 | `mfa_status: '/auth/mfa/status',...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 552 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 572 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 582 | `.get('/auth/mfa/status')...` |

---

#### `GET /subscriptions/:userId/features`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.handleRollover`

**Usages:** None found

---

#### `GET /subscriptions/:userId/limits`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.checkFeatureAccess`

**Usages:** None found

---

#### `GET /subscriptions/user/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.getTierLimits`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |

---

#### `GET /subscriptions/all`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.getActiveSubscription`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |

---

#### `GET /subscriptions/stats`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.listAllSubscriptions`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |

---

#### `GET /users`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.listUsers`

**Usages (92):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\plan109.ts` | 158 | `'/admin/users',...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 53 | `{ name: 'User List', href: '/admin/users' },...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 76 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 103 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 112 | `onClick={() => navigate('/admin/users')}...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\permission.middleware.ts` | 22 | `*   router.get('/admin/users', authMiddleware, requirePermission('users.view'), ...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 55 | `* router.get('/admin/users', authMiddleware, requirePermission('users.view'), ha...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\routes\index.ts` | 96 | `users: '/v1/users',...` |
| `backend\src\routes\index.ts` | 109 | `users: '/admin/users',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 633 | `endpoint: '/admin/users',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 209 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 220 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 240 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 266 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 377 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 474 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 484 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 510 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 517 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 578 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 596 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 610 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 100 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 127 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 155 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 245 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 255 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 304 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 328 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 593 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 169 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 187 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 196 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 277 | `request(app).get('/admin/users').set('Authorization', `Bearer ${adminToken}`)...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `GET /users/search`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.listUsers`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |

---

#### `GET /users/:id`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.searchUsers`

**Usages (58):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `GET /billing/payment-methods/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.removePaymentMethod`

**Usages:** None found

---

#### `GET /billing/invoices/upcoming/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.createInvoice`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |

---

#### `GET /billing/invoices/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.getUpcomingInvoice`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |
| `frontend\src\api\plan109.ts` | 281 | `? `/admin/billing/invoices/${userId}`...` |

---

#### `GET /billing/transactions/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.listInvoices`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 295 | `? `/admin/billing/transactions/${userId}`...` |
| `frontend\src\api\plan109.ts` | 309 | ``/admin/billing/transactions/${transactionId}/refund`,...` |

---

#### `GET /credits/rollover/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.deductCreditsManually`

**Usages:** None found

---

#### `GET /credits/reconcile/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.syncWithTokenCreditSystem`

**Usages:** None found

---

#### `GET /credits/balance/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.reconcileCreditBalance`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 368 | ``/admin/credits/balance/${userId}`...` |

---

#### `GET /credits/history/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.getCreditBalance`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 378 | ``/admin/credits/history/${userId}`,...` |

---

#### `GET /credits/usage/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.getCreditAllocationHistory`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 389 | ``/admin/credits/usage/${userId}`,...` |

---

#### `GET /analytics/revenue`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getRevenueMetrics`

**Usages (15):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 600 | `'/admin/analytics/revenue/kpis',...` |
| `frontend\src\api\admin.ts` | 614 | `'/admin/analytics/revenue/mix',...` |
| `frontend\src\api\admin.ts` | 628 | `'/admin/analytics/revenue/trend',...` |
| `frontend\src\api\admin.ts` | 642 | `'/admin/analytics/revenue/conversion-funnel',...` |
| `frontend\src\api\admin.ts` | 658 | `'/admin/analytics/revenue/credit-usage',...` |
| `frontend\src\api\admin.ts` | 674 | `'/admin/analytics/revenue/coupon-roi',...` |
| `frontend\src\api\plan109.ts` | 340 | `'/admin/analytics/revenue',...` |
| `frontend\src\api\plan109.ts` | 351 | `'/admin/analytics/revenue/by-tier',...` |
| `frontend\src\api\plan109.ts` | 459 | `'/admin/analytics/revenue/mrr'...` |
| `frontend\src\api\plan109.ts` | 469 | `'/admin/analytics/revenue/arr'...` |
| `frontend\src\api\plan109.ts` | 524 | `}>('/admin/analytics/revenue/funnel', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 568 | `}>('/admin/analytics/revenue/trend', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 624 | `}>('/admin/analytics/revenue/credit-usage', { params: { period, limit } });...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 125 | `{ name: 'Revenue Analytics', href: '/admin/analytics/revenue' },...` |
| `frontend\src\utils\breadcrumbs.ts` | 83 | `'/admin/analytics/revenue': 'Analytics',...` |

---

#### `GET /analytics/revenue/mrr`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getRevenueMetrics`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 459 | `'/admin/analytics/revenue/mrr'...` |

---

#### `GET /analytics/revenue/arr`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getMRR`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 469 | `'/admin/analytics/revenue/arr'...` |

---

#### `GET /analytics/revenue/by-tier`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getARR`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 351 | `'/admin/analytics/revenue/by-tier',...` |

---

#### `GET /analytics/users/total`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getRevenueByTier`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |

---

#### `GET /analytics/users/by-tier`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getTotalActiveUsers`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |

---

#### `GET /analytics/churn-rate`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getUsersByTier`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 499 | `'/admin/analytics/churn-rate',...` |

---

#### `GET /analytics/credit-utilization`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getChurnRate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 421 | `'/admin/analytics/credit-utilization',...` |

---

#### `GET /analytics/conversion-rate`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getCreditUtilizationRate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 510 | `'/admin/analytics/conversion-rate'...` |

---

#### `GET /analytics/dashboard`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `analyticsController.getFreeToProConversionRate`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 205 | `'/admin/analytics/dashboard-kpis',...` |
| `frontend\src\api\plan109.ts` | 449 | `'/admin/analytics/dashboard'...` |

---

#### `GET /licenses/:licenseKey`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.replaceDevice`

**Usages (27):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 69 | `'/admin/licenses/stats'...` |
| `frontend\src\api\plan110.ts` | 79 | ``/api/licenses/${licenseKey}`...` |
| `frontend\src\api\plan110.ts` | 89 | `'/api/licenses/purchase',...` |
| `frontend\src\api\plan110.ts` | 100 | ``/admin/licenses/${licenseId}/suspend`,...` |
| `frontend\src\api\plan110.ts` | 111 | ``/admin/licenses/${licenseId}/revoke`,...` |
| `frontend\src\api\plan110.ts` | 122 | ``/admin/licenses/${licenseId}/reactivate`...` |
| `frontend\src\api\plan110.ts` | 138 | ``/api/licenses/${licenseKey}/devices`...` |
| `frontend\src\api\plan110.ts` | 148 | `'/api/licenses/activate',...` |
| `frontend\src\api\plan110.ts` | 159 | ``/api/licenses/activations/${activationId}`...` |
| `frontend\src\api\plan110.ts` | 169 | ``/api/licenses/activations/${activationId}/replace`,...` |
| `frontend\src\api\plan110.ts` | 186 | ``/api/licenses/${licenseKey}/available-upgrades`...` |
| `frontend\src\api\plan110.ts` | 196 | ``/api/licenses/${licenseKey}/upgrade-history`...` |
| `frontend\src\api\plan110.ts` | 206 | ``/api/licenses/${licenseKey}/version-eligibility/${version}`...` |
| `frontend\src\api\plan110.ts` | 216 | ``/api/licenses/${licenseKey}/upgrade`,...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 76 | `{ name: 'Device Activations', href: '/admin/licenses/devices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 77 | `{ name: 'Proration Tracking', href: '/admin/licenses/prorations' },...` |
| `frontend\src\utils\breadcrumbs.ts` | 68 | `'/admin/licenses/devices': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 69 | `'/admin/licenses/prorations': 'Licenses',...` |
| `backend\src\routes\index.ts` | 103 | `version_upgrades: '/api/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\plan110.routes.ts` | 273 | `'/admin/licenses/:id/suspend',...` |
| `backend\src\routes\plan110.routes.ts` | 286 | `'/admin/licenses/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 311 | `'/admin/licenses/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 327 | `'/admin/licenses/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 338 | `'/admin/licenses/devices/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 349 | `'/admin/licenses/devices/:id/deactivate',...` |
| `backend\src\routes\plan110.routes.ts` | 361 | `'/admin/licenses/devices/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 373 | `'/admin/licenses/devices/bulk-action',...` |

---

#### `GET /licenses/:licenseKey/devices`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.getActiveDevices`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 138 | ``/api/licenses/${licenseKey}/devices`...` |

---

#### `GET /licenses/:licenseKey/version-eligibility/:version`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `upgradeController.checkVersionEligibility`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 206 | ``/api/licenses/${licenseKey}/version-eligibility/${version}`...` |

---

#### `GET /licenses/:licenseKey/available-upgrades`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `upgradeController.getAvailableUpgrades`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 186 | ``/api/licenses/${licenseKey}/available-upgrades`...` |

---

#### `GET /licenses/:licenseKey/upgrade-history`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `upgradeController.getUpgradeHistory`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 196 | ``/api/licenses/${licenseKey}/upgrade-history`...` |

---

#### `GET /subscriptions/:id/proration-history`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.getProrationHistory`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |

---

#### `GET /migrations/trade-in-value/:licenseId`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `migrationController.getTradeInValue`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 354 | ``/api/migrations/trade-in-value/${licenseId}`...` |

---

#### `GET /migrations/eligibility`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `migrationController.getTradeInValue`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 334 | `'/api/migrations/eligibility'...` |

---

#### `GET /migrations/history`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `migrationController.checkMigrationEligibility`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 344 | `'/api/migrations/history'...` |

---

#### `GET /admin/licenses`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.revokeLicense`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/licenses/stats`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.listAllLicenses`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/licenses/devices`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `deviceActivationController.getAllDeviceActivations`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/licenses/devices/stats`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `deviceActivationController.getAllDeviceActivations`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/prorations`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.listAllProrations`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/prorations/stats`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.listAllProrations`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/prorations/:id/calculation`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.getCalculationBreakdown`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/analytics/upgrade-conversion`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `upgradeController.getUpgradeConversion`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /api/users/:userId/coupons`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/coupons`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/coupons/:id`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/coupons/:id/redemptions`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/campaigns`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/campaigns/:id`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/campaigns/:id/performance`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/fraud-detection`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/fraud-detection/pending`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `GET /admin/analytics/coupons`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `GET /admin/analytics/coupons/trend`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `GET /admin/analytics/coupons/top`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `GET /admin/analytics/coupons/by-type`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `GET /oauth/google/authorize`

**Definition:**
- **File:** `backend\src\routes\social-auth.routes.ts`
- **Line:** 1
- **Handler:** `socialAuthController.googleAuthorize`

**Usages:** None found

---

#### `GET /oauth/google/callback`

**Definition:**
- **File:** `backend\src\routes\social-auth.routes.ts`
- **Line:** 1
- **Handler:** `socialAuthController.googleCallback`

**Usages:** None found

---

#### `GET /`

**Definition:**
- **File:** `backend\src\routes\swagger.routes.ts`
- **Line:** 62

**Usages (856):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 96 | `'/admin/models/tiers',...` |
| `frontend\src\api\admin.ts` | 108 | ``/admin/models/${modelId}/tier`...` |
| `frontend\src\api\admin.ts` | 123 | ``/admin/models/${modelId}/tier`,...` |
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |
| `frontend\src\api\admin.ts` | 188 | `'/admin/models/providers'...` |
| `frontend\src\api\admin.ts` | 205 | `'/admin/analytics/dashboard-kpis',...` |
| `frontend\src\api\admin.ts` | 220 | `'/admin/analytics/recent-activity',...` |
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\admin.ts` | 600 | `'/admin/analytics/revenue/kpis',...` |
| `frontend\src\api\admin.ts` | 614 | `'/admin/analytics/revenue/mix',...` |
| `frontend\src\api\admin.ts` | 628 | `'/admin/analytics/revenue/trend',...` |
| `frontend\src\api\admin.ts` | 642 | `'/admin/analytics/revenue/conversion-funnel',...` |
| `frontend\src\api\admin.ts` | 658 | `'/admin/analytics/revenue/credit-usage',...` |
| `frontend\src\api\admin.ts` | 674 | `'/admin/analytics/revenue/coupon-roi',...` |
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |
| `frontend\src\api\plan109.ts` | 158 | `'/admin/users',...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |
| `frontend\src\api\plan109.ts` | 281 | `? `/admin/billing/invoices/${userId}`...` |
| `frontend\src\api\plan109.ts` | 282 | `: '/admin/billing/invoices';...` |
| `frontend\src\api\plan109.ts` | 295 | `? `/admin/billing/transactions/${userId}`...` |
| `frontend\src\api\plan109.ts` | 296 | `: '/admin/billing/transactions';...` |
| `frontend\src\api\plan109.ts` | 309 | ``/admin/billing/transactions/${transactionId}/refund`,...` |
| `frontend\src\api\plan109.ts` | 320 | `'/admin/billing/dunning'...` |
| `frontend\src\api\plan109.ts` | 330 | ``/admin/billing/dunning/${attemptId}/retry`...` |
| `frontend\src\api\plan109.ts` | 340 | `'/admin/analytics/revenue',...` |
| `frontend\src\api\plan109.ts` | 351 | `'/admin/analytics/revenue/by-tier',...` |
| `frontend\src\api\plan109.ts` | 368 | ``/admin/credits/balance/${userId}`...` |
| `frontend\src\api\plan109.ts` | 378 | ``/admin/credits/history/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 389 | ``/admin/credits/usage/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 400 | `'/admin/credits/grant-bonus',...` |
| `frontend\src\api\plan109.ts` | 411 | `'/admin/credits/process-monthly'...` |
| `frontend\src\api\plan109.ts` | 421 | `'/admin/analytics/credit-utilization',...` |
| `frontend\src\api\plan109.ts` | 432 | `'/admin/analytics/top-credit-consumers',...` |
| `frontend\src\api\plan109.ts` | 449 | `'/admin/analytics/dashboard'...` |
| `frontend\src\api\plan109.ts` | 459 | `'/admin/analytics/revenue/mrr'...` |
| `frontend\src\api\plan109.ts` | 469 | `'/admin/analytics/revenue/arr'...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan109.ts` | 499 | `'/admin/analytics/churn-rate',...` |
| `frontend\src\api\plan109.ts` | 510 | `'/admin/analytics/conversion-rate'...` |
| `frontend\src\api\plan109.ts` | 524 | `}>('/admin/analytics/revenue/funnel', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 568 | `}>('/admin/analytics/revenue/trend', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 624 | `}>('/admin/analytics/revenue/credit-usage', { params: { period, limit } });...` |
| `frontend\src\api\plan110.ts` | 58 | `'/admin/licenses',...` |
| `frontend\src\api\plan110.ts` | 69 | `'/admin/licenses/stats'...` |
| `frontend\src\api\plan110.ts` | 79 | ``/api/licenses/${licenseKey}`...` |
| `frontend\src\api\plan110.ts` | 89 | `'/api/licenses/purchase',...` |
| `frontend\src\api\plan110.ts` | 100 | ``/admin/licenses/${licenseId}/suspend`,...` |
| `frontend\src\api\plan110.ts` | 111 | ``/admin/licenses/${licenseId}/revoke`,...` |
| `frontend\src\api\plan110.ts` | 122 | ``/admin/licenses/${licenseId}/reactivate`...` |
| `frontend\src\api\plan110.ts` | 138 | ``/api/licenses/${licenseKey}/devices`...` |
| `frontend\src\api\plan110.ts` | 148 | `'/api/licenses/activate',...` |
| `frontend\src\api\plan110.ts` | 159 | ``/api/licenses/activations/${activationId}`...` |
| `frontend\src\api\plan110.ts` | 169 | ``/api/licenses/activations/${activationId}/replace`,...` |
| `frontend\src\api\plan110.ts` | 186 | ``/api/licenses/${licenseKey}/available-upgrades`...` |
| `frontend\src\api\plan110.ts` | 196 | ``/api/licenses/${licenseKey}/upgrade-history`...` |
| `frontend\src\api\plan110.ts` | 206 | ``/api/licenses/${licenseKey}/version-eligibility/${version}`...` |
| `frontend\src\api\plan110.ts` | 216 | ``/api/licenses/${licenseKey}/upgrade`,...` |
| `frontend\src\api\plan110.ts` | 227 | `'/admin/analytics/upgrade-conversion'...` |
| `frontend\src\api\plan110.ts` | 243 | `'/admin/prorations',...` |
| `frontend\src\api\plan110.ts` | 254 | `'/admin/prorations/stats'...` |
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 307 | ``/admin/prorations/${prorationId}/reverse`,...` |
| `frontend\src\api\plan110.ts` | 318 | ``/admin/prorations/${prorationId}/calculation`...` |
| `frontend\src\api\plan110.ts` | 334 | `'/api/migrations/eligibility'...` |
| `frontend\src\api\plan110.ts` | 344 | `'/api/migrations/history'...` |
| `frontend\src\api\plan110.ts` | 354 | ``/api/migrations/trade-in-value/${licenseId}`...` |
| `frontend\src\api\plan110.ts` | 364 | `'/api/migrations/perpetual-to-subscription',...` |
| `frontend\src\api\plan110.ts` | 375 | `'/api/migrations/subscription-to-perpetual',...` |
| `frontend\src\api\plan110.ts` | 392 | `'/admin/analytics/proration-revenue',...` |
| `frontend\src\api\plan110.ts` | 403 | `'/admin/analytics/proration-time-series',...` |
| `frontend\src\api\plan110.ts` | 414 | `'/admin/analytics/upgrade-distribution'...` |
| `frontend\src\api\plan110.ts` | 424 | `'/admin/analytics/tier-change-paths',...` |
| `frontend\src\api\plan111.ts` | 62 | `'/api/coupons/validate',...` |
| `frontend\src\api\plan111.ts` | 76 | `'/api/coupons/redeem',...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\api\plan111.ts` | 100 | `const response = await apiClient.post<Coupon>('/admin/coupons', data);...` |
| `frontend\src\api\plan111.ts` | 114 | ``/admin/coupons/${id}`,...` |
| `frontend\src\api\plan111.ts` | 125 | `await apiClient.delete(`/admin/coupons/${id}`);...` |
| `frontend\src\api\plan111.ts` | 145 | `'/admin/coupons',...` |
| `frontend\src\api\plan111.ts` | 164 | ``/admin/coupons/${id}/redemptions`,...` |
| `frontend\src\api\plan111.ts` | 180 | `'/admin/campaigns',...` |
| `frontend\src\api\plan111.ts` | 196 | ``/admin/campaigns/${id}`,...` |
| `frontend\src\api\plan111.ts` | 207 | `await apiClient.delete(`/admin/campaigns/${id}`);...` |
| `frontend\src\api\plan111.ts` | 227 | `'/admin/campaigns',...` |
| `frontend\src\api\plan111.ts` | 241 | ``/admin/campaigns/${id}/performance`...` |
| `frontend\src\api\plan111.ts` | 255 | `await apiClient.post(`/admin/campaigns/${campaignId}/assign-coupon`, {...` |
| `frontend\src\api\plan111.ts` | 270 | ``/admin/campaigns/${campaignId}/remove-coupon/${couponId}`...` |
| `frontend\src\api\plan111.ts` | 293 | `'/admin/fraud-detection',...` |
| `frontend\src\api\plan111.ts` | 311 | ``/admin/fraud-detection/${id}/review`,...` |
| `frontend\src\api\plan111.ts` | 322 | `'/admin/fraud-detection/pending'...` |
| `frontend\src\api\plan111.ts` | 343 | `'/admin/analytics/coupons',...` |
| `frontend\src\api\plan111.ts` | 360 | `'/admin/analytics/coupons/trend',...` |
| `frontend\src\api\plan111.ts` | 375 | `'/admin/analytics/coupons/top',...` |
| `frontend\src\api\plan111.ts` | 386 | `'/admin/analytics/coupons/by-type'...` |
| `frontend\src\api\pricing.ts` | 168 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 177 | ``/admin/pricing/configs/${id}`...` |
| `frontend\src\api\pricing.ts` | 185 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 194 | ``/admin/pricing/configs/${id}`,...` |
| `frontend\src\api\pricing.ts` | 203 | ``/admin/pricing/configs/${id}/approve`,...` |
| `frontend\src\api\pricing.ts` | 212 | ``/admin/pricing/configs/${id}/reject`,...` |
| `frontend\src\api\pricing.ts` | 225 | `'/admin/pricing/simulate',...` |
| `frontend\src\api\pricing.ts` | 234 | `'/admin/pricing/scenarios',...` |
| `frontend\src\api\pricing.ts` | 243 | `'/admin/pricing/scenarios'...` |
| `frontend\src\api\pricing.ts` | 255 | `'/admin/pricing/vendor-prices',...` |
| `frontend\src\api\pricing.ts` | 264 | `'/admin/pricing/alerts',...` |
| `frontend\src\api\pricing.ts` | 273 | ``/admin/pricing/alerts/${alertId}/acknowledge`...` |
| `frontend\src\api\pricing.ts` | 281 | ``/admin/pricing/alerts/${alertId}/apply`...` |
| `frontend\src\api\pricing.ts` | 289 | ``/admin/pricing/alerts/${alertId}/ignore`,...` |
| `frontend\src\api\pricing.ts` | 302 | `'/admin/pricing/margin-metrics',...` |
| `frontend\src\api\pricing.ts` | 311 | `'/admin/pricing/margin-by-tier',...` |
| `frontend\src\api\pricing.ts` | 320 | `'/admin/pricing/margin-by-provider',...` |
| `frontend\src\api\pricing.ts` | 329 | `'/admin/pricing/top-models',...` |
| `frontend\src\api\pricing.ts` | 345 | `}>('/admin/pricing/margin-history', {...` |
| `frontend\src\api\settings.api.ts` | 54 | `'/admin/settings'...` |
| `frontend\src\api\settings.api.ts` | 64 | ``/admin/settings/${category}`...` |
| `frontend\src\api\settings.api.ts` | 77 | ``/admin/settings/${category}`,...` |
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `frontend\src\App.tsx` | 27 | `{ path: '/oauth/callback', element: <OAuthCallback /> },...` |
| `frontend\src\App.tsx` | 31 | `{ path: '/admin/model-tiers', element: <ProtectedRoute><ModelTierManagement /></...` |
| `frontend\src\App.tsx` | 32 | `{ path: '/admin/pricing-configuration', element: <ProtectedRoute><PricingConfigu...` |
| `frontend\src\App.tsx` | 33 | `{ path: '/admin/pricing-simulation', element: <ProtectedRoute><PricingSimulation...` |
| `frontend\src\App.tsx` | 34 | `{ path: '/admin/vendor-price-monitoring', element: <ProtectedRoute><VendorPriceM...` |
| `frontend\src\App.tsx` | 35 | `{ path: '/admin/margin-tracking', element: <ProtectedRoute><MarginTracking /></P...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 53 | `{ name: 'User List', href: '/admin/users' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 63 | `{ name: 'Subscription Management', href: '/admin/subscriptions' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 64 | `{ name: 'Billing Dashboard', href: '/admin/billing' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 65 | `{ name: 'Credit Management', href: '/admin/credits' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 75 | `{ name: 'License Management', href: '/admin/licenses' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 76 | `{ name: 'Device Activations', href: '/admin/licenses/devices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 77 | `{ name: 'Proration Tracking', href: '/admin/licenses/prorations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 87 | `{ name: 'Coupon Management', href: '/admin/coupons' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 88 | `{ name: 'Campaign Management', href: '/admin/coupons/campaigns' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 89 | `{ name: 'Campaign Calendar', href: '/admin/coupons/calendar' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 90 | `{ name: 'Coupon Analytics', href: '/admin/coupons/analytics' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 91 | `{ name: 'Fraud Detection', href: '/admin/coupons/fraud' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 101 | `{ name: 'Margin Tracking', href: '/admin/profitability/margins' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 102 | `{ name: 'Pricing Configuration', href: '/admin/profitability/pricing' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 103 | `{ name: 'Pricing Simulator', href: '/admin/profitability/simulator' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 104 | `{ name: 'Vendor Price Monitoring', href: '/admin/profitability/vendor-prices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 114 | `{ name: 'Model Tier Management', href: '/admin/models' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 124 | `{ name: 'Platform Analytics', href: '/admin/analytics' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 125 | `{ name: 'Revenue Analytics', href: '/admin/analytics/revenue' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 135 | `{ name: 'General', href: '/admin/settings#general' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 136 | `{ name: 'Email & Notifications', href: '/admin/settings#email' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 137 | `{ name: 'Security', href: '/admin/settings#security' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 138 | `{ name: 'Integrations', href: '/admin/settings#integrations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 139 | `{ name: 'Feature Flags', href: '/admin/settings#features' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 140 | `{ name: 'System', href: '/admin/settings#system' },...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 434 | `to: '/admin/coupons/new',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 441 | `to: '/admin/analytics',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 448 | `to: '/admin/settings',...` |
| `frontend\src\pages\admin\AdminSettings.tsx` | 293 | `navigate(`/admin/settings#${tab.id}`, { replace: true });...` |
| `frontend\src\pages\admin\CampaignManagement.tsx` | 205 | `{ label: 'Campaign Management', href: '/admin/campaigns' },...` |
| `frontend\src\pages\admin\SubscriptionManagement.tsx` | 517 | `<Link to={`/admin/subscriptions/${subscription.id}`}>...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 76 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 103 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 112 | `onClick={() => navigate('/admin/users')}...` |
| `frontend\src\pages\Admin.tsx` | 96 | `<Link to="/admin/model-tiers">...` |
| `frontend\src\pages\Admin.tsx` | 114 | `<Link to="/admin/pricing-configuration">...` |
| `frontend\src\pages\Admin.tsx` | 132 | `<Link to="/admin/pricing-simulation">...` |
| `frontend\src\pages\Admin.tsx` | 150 | `<Link to="/admin/vendor-price-monitoring">...` |
| `frontend\src\pages\Admin.tsx` | 168 | `<Link to="/admin/margin-tracking">...` |
| `frontend\src\services\api.ts` | 132 | `const isOAuthCallback = window.location.pathname.includes('/oauth/callback');...` |
| `frontend\src\services\api.ts` | 195 | `if (!window.location.pathname.includes('/oauth/callback') &&...` |
| `frontend\src\services\api.ts` | 208 | `if (!window.location.pathname.includes('/oauth/callback') &&...` |
| `frontend\src\services\api.ts` | 242 | `const response = await apiClient.post('/api/track-download', { os });...` |
| `frontend\src\services\api.ts` | 248 | `const response = await apiClient.post('/api/feedback', data);...` |
| `frontend\src\services\api.ts` | 254 | `const response = await apiClient.get('/api/version');...` |
| `frontend\src\services\api.ts` | 260 | `const response = await apiClient.get('/admin/metrics');...` |
| `frontend\src\utils\breadcrumbs.ts` | 63 | `'/admin/subscriptions': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 64 | `'/admin/billing': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 65 | `'/admin/credits': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 67 | `'/admin/licenses': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 68 | `'/admin/licenses/devices': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 69 | `'/admin/licenses/prorations': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 71 | `'/admin/coupons': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 72 | `'/admin/coupons/campaigns': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 73 | `'/admin/coupons/calendar': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 74 | `'/admin/coupons/analytics': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 75 | `'/admin/coupons/fraud': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 77 | `'/admin/profitability/margins': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 78 | `'/admin/profitability/pricing': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 79 | `'/admin/profitability/simulator': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 80 | `'/admin/profitability/vendor-prices': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 82 | `'/admin/analytics': 'Analytics',...` |
| `frontend\src\utils\breadcrumbs.ts` | 83 | `'/admin/analytics/revenue': 'Analytics',...` |
| `frontend\src\utils\breadcrumbs.ts` | 88 | `* @param pathname - Current pathname (e.g., '/admin/coupons/analytics')...` |
| `backend\coverage\lcov-report\prettify.js` | 2 | `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,els...` |
| `backend\coverage\prettify.js` | 2 | `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,els...` |
| `backend\src\controllers\models.controller.ts` | 254 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\controllers\models.controller.ts` | 407 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\auth.middleware.ts` | 439 | `*   app.get('/admin/models', authMiddleware, requireAdmin, handler);...` |
| `backend\src\middleware\credit.middleware.ts` | 8 | `*   app.post('/v1/completions', authMiddleware, checkCredits(), handler);...` |
| `backend\src\middleware\ip-whitelist.middleware.ts` | 29 | `* router.post('/admin/sensitive-action',...` |
| `backend\src\middleware\permission.middleware.ts` | 22 | `*   router.get('/admin/users', authMiddleware, requirePermission('users.view'), ...` |
| `backend\src\middleware\permission.middleware.ts` | 25 | `*   router.get('/admin/analytics', authMiddleware, requireAnyPermission(['analyt...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 55 | `* router.get('/admin/users', authMiddleware, requirePermission('users.view'), ha...` |
| `backend\src\middleware\permission.middleware.ts` | 159 | `* router.get('/admin/analytics',...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\middleware\require-mfa.middleware.ts` | 10 | `*   router.post('/admin/sensitive-operation',...` |
| `backend\src\middleware\typeValidation.middleware.ts` | 139 | `*   router.get('/users/:id',...` |
| `backend\src\middleware\typeValidation.middleware.ts` | 242 | `* router.patch('/users/:id',...` |
| `backend\src\routes\admin.routes.ts` | 88 | `'/users/:id/suspend',...` |
| `backend\src\routes\admin.routes.ts` | 124 | `'/webhooks/test',...` |
| `backend\src\routes\admin.routes.ts` | 146 | `'/analytics/dashboard-kpis',...` |
| `backend\src\routes\admin.routes.ts` | 166 | `'/analytics/recent-activity',...` |
| `backend\src\routes\admin.routes.ts` | 185 | `'/models/tiers',...` |
| `backend\src\routes\admin.routes.ts` | 202 | `'/models/tiers/audit-logs',...` |
| `backend\src\routes\admin.routes.ts` | 220 | `'/models/:modelId/tier',...` |
| `backend\src\routes\admin.routes.ts` | 233 | `'/models/tiers/bulk',...` |
| `backend\src\routes\admin.routes.ts` | 245 | `'/models/tiers/revert/:auditLogId',...` |
| `backend\src\routes\admin.routes.ts` | 257 | `'/models/providers',...` |
| `backend\src\routes\admin.routes.ts` | 295 | `'/audit-logs/resource/:resourceType/:resourceId',...` |
| `backend\src\routes\admin.routes.ts` | 310 | `'/audit-logs/admin/:adminUserId',...` |
| `backend\src\routes\admin.routes.ts` | 333 | `'/users/:id/overview',...` |
| `backend\src\routes\admin.routes.ts` | 355 | `'/users/:id/subscriptions',...` |
| `backend\src\routes\admin.routes.ts` | 378 | `'/users/:id/licenses',...` |
| `backend\src\routes\admin.routes.ts` | 403 | `'/users/:id/credits',...` |
| `backend\src\routes\admin.routes.ts` | 426 | `'/users/:id/coupons',...` |
| `backend\src\routes\admin.routes.ts` | 452 | `'/users/:id/payments',...` |
| `backend\src\routes\admin.routes.ts` | 475 | `'/users/:id/activity',...` |
| `backend\src\routes\admin.routes.ts` | 499 | `'/analytics/revenue/kpis',...` |
| `backend\src\routes\admin.routes.ts` | 517 | `'/analytics/revenue/mix',...` |
| `backend\src\routes\admin.routes.ts` | 538 | `'/analytics/revenue/trend',...` |
| `backend\src\routes\admin.routes.ts` | 556 | `'/analytics/revenue/conversion-funnel',...` |
| `backend\src\routes\admin.routes.ts` | 567 | `'/analytics/revenue/funnel',...` |
| `backend\src\routes\admin.routes.ts` | 584 | `'/analytics/revenue/credit-usage',...` |
| `backend\src\routes\admin.routes.ts` | 601 | `'/analytics/revenue/coupon-roi',...` |
| `backend\src\routes\admin.routes.ts` | 623 | `'/users/:id/role',...` |
| `backend\src\routes\admin.routes.ts` | 698 | `'/settings/:category',...` |
| `backend\src\routes\admin.routes.ts` | 717 | `'/settings/:category',...` |
| `backend\src\routes\admin.routes.ts` | 740 | `'/settings/test-email',...` |
| `backend\src\routes\admin.routes.ts` | 754 | `'/settings/clear-cache',...` |
| `backend\src\routes\admin.routes.ts` | 769 | `'/settings/run-backup',...` |
| `backend\src\routes\admin.routes.ts` | 791 | `'/billing/invoices',...` |
| `backend\src\routes\admin.routes.ts` | 809 | `'/billing/transactions',...` |
| `backend\src\routes\admin.routes.ts` | 822 | `'/billing/dunning',...` |
| `backend\src\routes\admin.routes.ts` | 847 | `'/pricing/margin-metrics',...` |
| `backend\src\routes\admin.routes.ts` | 864 | `'/pricing/margin-by-tier',...` |
| `backend\src\routes\admin.routes.ts` | 881 | `'/pricing/margin-by-provider',...` |
| `backend\src\routes\admin.routes.ts` | 899 | `'/pricing/top-models',...` |
| `backend\src\routes\admin.routes.ts` | 915 | `'/pricing/configs',...` |
| `backend\src\routes\admin.routes.ts` | 928 | `'/pricing/alerts',...` |
| `backend\src\routes\admin.routes.ts` | 944 | `'/pricing/vendor-prices',...` |
| `backend\src\routes\admin.routes.ts` | 971 | `'/pricing/simulate',...` |
| `backend\src\routes\api.routes.ts` | 102 | `'/user/profile',...` |
| `backend\src\routes\api.routes.ts` | 139 | `'/user/credits',...` |
| `backend\src\routes\index.ts` | 60 | `openapi_spec: '/api-docs/swagger.json',...` |
| `backend\src\routes\index.ts` | 64 | `ready: '/health/ready',...` |
| `backend\src\routes\index.ts` | 65 | `live: '/health/live',...` |
| `backend\src\routes\index.ts` | 68 | `register: '/auth/register',...` |
| `backend\src\routes\index.ts` | 69 | `verify_email: '/auth/verify-email',...` |
| `backend\src\routes\index.ts` | 70 | `forgot_password: '/auth/forgot-password',...` |
| `backend\src\routes\index.ts` | 71 | `reset_password: '/auth/reset-password',...` |
| `backend\src\routes\index.ts` | 72 | `mfa_setup: '/auth/mfa/setup',...` |
| `backend\src\routes\index.ts` | 73 | `mfa_verify_setup: '/auth/mfa/verify-setup',...` |
| `backend\src\routes\index.ts` | 74 | `mfa_verify_login: '/auth/mfa/verify-login',...` |
| `backend\src\routes\index.ts` | 75 | `mfa_disable: '/auth/mfa/disable',...` |
| `backend\src\routes\index.ts` | 76 | `mfa_backup_code_login: '/auth/mfa/backup-code-login',...` |
| `backend\src\routes\index.ts` | 77 | `mfa_status: '/auth/mfa/status',...` |
| `backend\src\routes\index.ts` | 80 | `discovery: '/.well-known/openid-configuration',...` |
| `backend\src\routes\index.ts` | 81 | `authorize: '/oauth/authorize',...` |
| `backend\src\routes\index.ts` | 82 | `token: '/oauth/token',...` |
| `backend\src\routes\index.ts` | 83 | `revoke: '/oauth/revoke',...` |
| `backend\src\routes\index.ts` | 84 | `userinfo: '/oauth/userinfo',...` |
| `backend\src\routes\index.ts` | 85 | `jwks: '/oauth/jwks',...` |
| `backend\src\routes\index.ts` | 86 | `google_authorize: '/oauth/google/authorize',...` |
| `backend\src\routes\index.ts` | 87 | `google_callback: '/oauth/google/callback',...` |
| `backend\src\routes\index.ts` | 90 | `models: '/v1/models',...` |
| `backend\src\routes\index.ts` | 91 | `completions: '/v1/completions',...` |
| `backend\src\routes\index.ts` | 92 | `chat: '/v1/chat/completions',...` |
| `backend\src\routes\index.ts` | 93 | `subscriptions: '/v1/subscriptions',...` |
| `backend\src\routes\index.ts` | 94 | `credits: '/v1/credits',...` |
| `backend\src\routes\index.ts` | 95 | `usage: '/v1/usage',...` |
| `backend\src\routes\index.ts` | 96 | `users: '/v1/users',...` |
| `backend\src\routes\index.ts` | 99 | `user_profile: '/api/user/profile',...` |
| `backend\src\routes\index.ts` | 100 | `detailed_credits: '/api/user/credits',...` |
| `backend\src\routes\index.ts` | 101 | `oauth_token_enhance: '/oauth/token/enhance',...` |
| `backend\src\routes\index.ts` | 102 | `licenses: '/api/licenses',...` |
| `backend\src\routes\index.ts` | 103 | `version_upgrades: '/api/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\index.ts` | 105 | `migrations: '/api/migrations',...` |
| `backend\src\routes\index.ts` | 108 | `metrics: '/admin/metrics',...` |
| `backend\src\routes\index.ts` | 109 | `users: '/admin/users',...` |
| `backend\src\routes\index.ts` | 110 | `subscriptions: '/admin/subscriptions',...` |
| `backend\src\routes\index.ts` | 111 | `usage: '/admin/usage',...` |
| `backend\src\routes\index.ts` | 112 | `licenses: '/admin/licenses',...` |
| `backend\src\routes\index.ts` | 113 | `prorations: '/admin/prorations',...` |
| `backend\src\routes\index.ts` | 114 | `upgrade_analytics: '/admin/analytics/upgrade-conversion',...` |
| `backend\src\routes\index.ts` | 117 | `downloads: '/api/track-download',...` |
| `backend\src\routes\index.ts` | 118 | `feedback: '/api/feedback',...` |
| `backend\src\routes\index.ts` | 119 | `diagnostics: '/api/diagnostics',...` |
| `backend\src\routes\index.ts` | 120 | `version: '/api/version',...` |
| `backend\src\routes\index.ts` | 173 | `router.get('/health/ready', async (_req: Request, res: Response) => {...` |
| `backend\src\routes\index.ts` | 212 | `router.get('/health/live', (_req: Request, res: Response) => {...` |
| `backend\src\routes\index.ts` | 252 | `router.use('/auth/mfa', createMFARouter());...` |
| `backend\src\routes\index.ts` | 269 | `'/webhooks/stripe',...` |
| `backend\src\routes\plan109.routes.ts` | 67 | `'/subscriptions/:id/upgrade',...` |
| `backend\src\routes\plan109.routes.ts` | 77 | `'/subscriptions/:id/downgrade',...` |
| `backend\src\routes\plan109.routes.ts` | 87 | `'/subscriptions/:id/cancel',...` |
| `backend\src\routes\plan109.routes.ts` | 97 | `'/subscriptions/:id/reactivate',...` |
| `backend\src\routes\plan109.routes.ts` | 107 | `'/subscriptions/:id/allocate-credits',...` |
| `backend\src\routes\plan109.routes.ts` | 117 | `'/subscriptions/:id/rollover',...` |
| `backend\src\routes\plan109.routes.ts` | 127 | `'/subscriptions/:userId/features',...` |
| `backend\src\routes\plan109.routes.ts` | 136 | `'/subscriptions/:userId/limits',...` |
| `backend\src\routes\plan109.routes.ts` | 145 | `'/subscriptions/user/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 154 | `'/subscriptions/all',...` |
| `backend\src\routes\plan109.routes.ts` | 163 | `'/subscriptions/stats',...` |
| `backend\src\routes\plan109.routes.ts` | 185 | `'/users/search',...` |
| `backend\src\routes\plan109.routes.ts` | 194 | `'/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 203 | `'/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 213 | `'/users/:id/suspend',...` |
| `backend\src\routes\plan109.routes.ts` | 223 | `'/users/:id/unsuspend',...` |
| `backend\src\routes\plan109.routes.ts` | 233 | `'/users/:id/ban',...` |
| `backend\src\routes\plan109.routes.ts` | 243 | `'/users/:id/unban',...` |
| `backend\src\routes\plan109.routes.ts` | 253 | `'/users/bulk-update',...` |
| `backend\src\routes\plan109.routes.ts` | 263 | `'/users/:id/adjust-credits',...` |
| `backend\src\routes\plan109.routes.ts` | 277 | `'/billing/payment-methods',...` |
| `backend\src\routes\plan109.routes.ts` | 287 | `'/billing/payment-methods/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 297 | `'/billing/payment-methods/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 306 | `'/billing/invoices/:subscriptionId',...` |
| `backend\src\routes\plan109.routes.ts` | 316 | `'/billing/invoices/upcoming/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 325 | `'/billing/invoices/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 334 | `'/billing/transactions/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 343 | `'/billing/transactions/:id/refund',...` |
| `backend\src\routes\plan109.routes.ts` | 353 | `'/billing/dunning/:attemptId/retry',...` |
| `backend\src\routes\plan109.routes.ts` | 367 | `'/credits/allocate',...` |
| `backend\src\routes\plan109.routes.ts` | 377 | `'/credits/process-monthly',...` |
| `backend\src\routes\plan109.routes.ts` | 387 | `'/credits/grant-bonus',...` |
| `backend\src\routes\plan109.routes.ts` | 397 | `'/credits/deduct',...` |
| `backend\src\routes\plan109.routes.ts` | 407 | `'/credits/rollover/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 416 | `'/credits/rollover/:userId/apply',...` |
| `backend\src\routes\plan109.routes.ts` | 426 | `'/credits/sync/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 436 | `'/credits/reconcile/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 445 | `'/credits/balance/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 454 | `'/credits/history/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 463 | `'/credits/usage/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 476 | `'/analytics/revenue',...` |
| `backend\src\routes\plan109.routes.ts` | 485 | `'/analytics/revenue/mrr',...` |
| `backend\src\routes\plan109.routes.ts` | 494 | `'/analytics/revenue/arr',...` |
| `backend\src\routes\plan109.routes.ts` | 503 | `'/analytics/revenue/by-tier',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan109.routes.ts` | 530 | `'/analytics/churn-rate',...` |
| `backend\src\routes\plan109.routes.ts` | 539 | `'/analytics/credit-utilization',...` |
| `backend\src\routes\plan109.routes.ts` | 548 | `'/analytics/conversion-rate',...` |
| `backend\src\routes\plan109.routes.ts` | 557 | `'/analytics/dashboard',...` |
| `backend\src\routes\plan110.routes.ts` | 54 | `'/licenses/purchase',...` |
| `backend\src\routes\plan110.routes.ts` | 65 | `'/licenses/activate',...` |
| `backend\src\routes\plan110.routes.ts` | 75 | `'/licenses/activations/:id',...` |
| `backend\src\routes\plan110.routes.ts` | 86 | `'/licenses/activations/:id/replace',...` |
| `backend\src\routes\plan110.routes.ts` | 97 | `'/licenses/:licenseKey',...` |
| `backend\src\routes\plan110.routes.ts` | 107 | `'/licenses/:licenseKey/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 121 | `'/licenses/:licenseKey/version-eligibility/:version',...` |
| `backend\src\routes\plan110.routes.ts` | 131 | `'/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\plan110.routes.ts` | 142 | `'/licenses/:licenseKey/available-upgrades',...` |
| `backend\src\routes\plan110.routes.ts` | 152 | `'/licenses/:licenseKey/upgrade-history',...` |
| `backend\src\routes\plan110.routes.ts` | 166 | `'/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\plan110.routes.ts` | 177 | `'/subscriptions/:id/upgrade-with-proration',...` |
| `backend\src\routes\plan110.routes.ts` | 188 | `'/subscriptions/:id/downgrade-with-proration',...` |
| `backend\src\routes\plan110.routes.ts` | 199 | `'/subscriptions/:id/proration-history',...` |
| `backend\src\routes\plan110.routes.ts` | 214 | `'/migrations/perpetual-to-subscription',...` |
| `backend\src\routes\plan110.routes.ts` | 225 | `'/migrations/subscription-to-perpetual',...` |
| `backend\src\routes\plan110.routes.ts` | 236 | `'/migrations/trade-in-value/:licenseId',...` |
| `backend\src\routes\plan110.routes.ts` | 247 | `'/migrations/eligibility',...` |
| `backend\src\routes\plan110.routes.ts` | 258 | `'/migrations/history',...` |
| `backend\src\routes\plan110.routes.ts` | 273 | `'/admin/licenses/:id/suspend',...` |
| `backend\src\routes\plan110.routes.ts` | 286 | `'/admin/licenses/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 299 | `'/admin/licenses',...` |
| `backend\src\routes\plan110.routes.ts` | 311 | `'/admin/licenses/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 327 | `'/admin/licenses/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 338 | `'/admin/licenses/devices/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 349 | `'/admin/licenses/devices/:id/deactivate',...` |
| `backend\src\routes\plan110.routes.ts` | 361 | `'/admin/licenses/devices/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 373 | `'/admin/licenses/devices/bulk-action',...` |
| `backend\src\routes\plan110.routes.ts` | 390 | `'/admin/prorations',...` |
| `backend\src\routes\plan110.routes.ts` | 402 | `'/admin/prorations/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 414 | `'/admin/prorations/:id/reverse',...` |
| `backend\src\routes\plan110.routes.ts` | 427 | `'/admin/prorations/:id/calculation',...` |
| `backend\src\routes\plan110.routes.ts` | 443 | `'/admin/analytics/upgrade-conversion',...` |
| `backend\src\routes\plan111.routes.ts` | 57 | `'/api/coupons/validate',...` |
| `backend\src\routes\plan111.routes.ts` | 66 | `'/api/coupons/redeem',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 88 | `'/admin/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 100 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 112 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 124 | `'/admin/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 135 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 146 | `'/admin/coupons/:id/redemptions',...` |
| `backend\src\routes\plan111.routes.ts` | 159 | `'/admin/campaigns',...` |
| `backend\src\routes\plan111.routes.ts` | 171 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 183 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 195 | `'/admin/campaigns',...` |
| `backend\src\routes\plan111.routes.ts` | 206 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 217 | `'/admin/campaigns/:id/performance',...` |
| `backend\src\routes\plan111.routes.ts` | 228 | `'/admin/campaigns/:id/assign-coupon',...` |
| `backend\src\routes\plan111.routes.ts` | 240 | `'/admin/campaigns/:id/remove-coupon/:couponId',...` |
| `backend\src\routes\plan111.routes.ts` | 254 | `'/admin/fraud-detection',...` |
| `backend\src\routes\plan111.routes.ts` | 265 | `'/admin/fraud-detection/:id/review',...` |
| `backend\src\routes\plan111.routes.ts` | 277 | `'/admin/fraud-detection/pending',...` |
| `backend\src\routes\plan111.routes.ts` | 294 | `'/admin/analytics/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 310 | `'/admin/analytics/coupons/trend',...` |
| `backend\src\routes\plan111.routes.ts` | 325 | `'/admin/analytics/coupons/top',...` |
| `backend\src\routes\plan111.routes.ts` | 337 | `'/admin/analytics/coupons/by-type',...` |
| `backend\src\routes\social-auth.routes.ts` | 65 | `'/oauth/google/authorize',...` |
| `backend\src\routes\social-auth.routes.ts` | 110 | `'/oauth/google/callback',...` |
| `backend\src\routes\v1.routes.ts` | 56 | `'/users/me',...` |
| `backend\src\routes\v1.routes.ts` | 68 | `'/users/me',...` |
| `backend\src\routes\v1.routes.ts` | 80 | `'/users/me/preferences',...` |
| `backend\src\routes\v1.routes.ts` | 92 | `'/users/me/preferences',...` |
| `backend\src\routes\v1.routes.ts` | 104 | `'/users/me/preferences/model',...` |
| `backend\src\routes\v1.routes.ts` | 116 | `'/users/me/preferences/model',...` |
| `backend\src\routes\v1.routes.ts` | 144 | `'/models/:modelId',...` |
| `backend\src\routes\v1.routes.ts` | 173 | `'/chat/completions',...` |
| `backend\src\routes\v1.routes.ts` | 200 | `'/subscriptions/me',...` |
| `backend\src\routes\v1.routes.ts` | 222 | `'/subscriptions/me',...` |
| `backend\src\routes\v1.routes.ts` | 233 | `'/subscriptions/me/cancel',...` |
| `backend\src\routes\v1.routes.ts` | 248 | `'/credits/me',...` |
| `backend\src\routes\v1.routes.ts` | 272 | `'/usage/stats',...` |
| `backend\src\routes\v1.routes.ts` | 300 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 311 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 322 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 333 | `'/webhooks/test',...` |
| `backend\src\services\model.service.ts` | 264 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\services\token-introspection.service.ts` | 126 | `const response = await fetch(`${this.identityProviderUrl}/oauth/jwks`);...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 74 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 88 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 104 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 126 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 146 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 167 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 191 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 206 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 227 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 237 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 247 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 257 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 282 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 291 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 300 | `endpoint: '/admin/coupons/456',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 309 | `endpoint: '/admin/licenses',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 392 | `endpoint: '/admin/test',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 433 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 443 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 453 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 463 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 512 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 524 | `endpoint: '/admin/coupons/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 583 | `endpoint: '/admin/coupons/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 633 | `endpoint: '/admin/users',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 112 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 131 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 164 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 209 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 220 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 240 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 266 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 285 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 377 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 391 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 403 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 474 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 484 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 510 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 517 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 578 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 596 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 610 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 641 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 93 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 105 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 123 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 138 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 147 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 159 | `.get('/api/user/credits');...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 170 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 182 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 235 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 100 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 127 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 155 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 245 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 255 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 304 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 328 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 352 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 370 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 383 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 395 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 409 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 425 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 453 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 485 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 593 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 146 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 169 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 187 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 196 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 277 | `request(app).get('/admin/users').set('Authorization', `Bearer ${adminToken}`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 346 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 358 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 373 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 393 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 407 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 424 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 447 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 476 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 652 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 76 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 109 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 124 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 133 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 150 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 166 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 188 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 214 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 231 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 274 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 287 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 308 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 337 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 384 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 405 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 418 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 427 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 467 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 495 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 514 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 552 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 572 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 582 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 196 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 228 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 244 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 262 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 276 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 290 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 300 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 311 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 93 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 108 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 119 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 136 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 151 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 202 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 218 | `.get('/api/user/profile');...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 228 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 245 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 259 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 318 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 373 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\unit\model.service.tier.test.ts` | 435 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\test-oauth-flow.js` | 35 | `path: '/oauth/jwks',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 30 | `.post('/oauth/register')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 46 | `.post('/oauth/token')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 78 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 89 | `.get('/v1/models')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 111 | `.post('/v1/subscriptions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 127 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 146 | `.post('/v1/chat/completions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 167 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 179 | `.get('/v1/usage')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 192 | `.get('/v1/usage/stats')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 216 | `.post('/oauth/token')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\helpers\mocks.ts` | 38 | `.post('/v1/chat/completions')...` |
| `backend\tests\helpers\mocks.ts` | 73 | `.post('/v1/messages')...` |
| `backend\tests\helpers\mocks.ts` | 119 | `.post('/v1/customers')...` |
| `backend\tests\helpers\mocks.ts` | 133 | `.post('/v1/subscriptions')...` |
| `backend\tests\helpers\mocks.ts` | 159 | `.delete(`/v1/subscriptions/${subscriptionId}`)...` |
| `backend\tests\integration\auth.integration.test.ts` | 49 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 77 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 95 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 107 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 116 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 125 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 134 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 148 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 167 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 193 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 207 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 221 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 233 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 249 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 272 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 288 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 305 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 321 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 340 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 368 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 383 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 398 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 414 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 435 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 456 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 472 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 491 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 503 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\credits.test.ts` | 52 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 70 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 77 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 101 | `.get('/v1/usage?limit=5&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 120 | `.get('/v1/usage?model_id=gpt-5')...` |
| `backend\tests\integration\credits.test.ts` | 132 | `.get('/v1/usage?operation=chat')...` |
| `backend\tests\integration\credits.test.ts` | 146 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\credits.test.ts` | 158 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 168 | `.get('/v1/usage?limit=101')...` |
| `backend\tests\integration\credits.test.ts` | 175 | `.get('/v1/usage?offset=-1')...` |
| `backend\tests\integration\credits.test.ts` | 182 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 194 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 209 | `.get('/v1/usage/stats?group_by=hour')...` |
| `backend\tests\integration\credits.test.ts` | 222 | `.get('/v1/usage/stats?group_by=model')...` |
| `backend\tests\integration\credits.test.ts` | 241 | `.get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_dat...` |
| `backend\tests\integration\credits.test.ts` | 250 | `.get('/v1/usage/stats?group_by=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 257 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 269 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 289 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 304 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 314 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 326 | `.get('/v1/usage?limit=10&offset=1000')...` |
| `backend\tests\integration\credits.test.ts` | 336 | `.get('/v1/usage?limit=1&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 346 | `.get('/v1/usage?limit=100')...` |
| `backend\tests\integration\credits.test.ts` | 361 | `.get('/v1/usage?start_date=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 368 | `.get('/v1/usage?end_date=not-a-date')...` |
| `backend\tests\integration\credits.test.ts` | 378 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\model-tier-access.test.ts` | 96 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 130 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 153 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 169 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 178 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 190 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 201 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\tests\integration\model-tier-access.test.ts` | 207 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 218 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 225 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 246 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 267 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 284 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 298 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 317 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 333 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 347 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 357 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 380 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 398 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 411 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 424 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 437 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 453 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 484 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 505 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 522 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 64 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 90 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 125 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 151 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 181 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 199 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 211 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 248 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 280 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 306 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 337 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 372 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 401 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 443 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 466 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 496 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 519 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 550 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 37 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 62 | `.get('/v1/models?provider=openai')...` |
| `backend\tests\integration\models.test.ts` | 74 | `.get('/v1/models?capability=vision')...` |
| `backend\tests\integration\models.test.ts` | 85 | `await request(app).get('/v1/models').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 90 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 99 | `.get('/v1/models/gpt-5')...` |
| `backend\tests\integration\models.test.ts` | 120 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\models.test.ts` | 126 | `await request(app).get('/v1/models/gpt-5').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 139 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 170 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 180 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 191 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 210 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 247 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 257 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 268 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 288 | `request(app).get('/v1/models').set('Authorization', `Bearer ${authToken}`)...` |
| `backend\tests\integration\models.test.ts` | 300 | `.get('/v1/models')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 313 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 329 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 342 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 388 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 408 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 425 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 453 | `endpoint: '/admin/coupons/coupon-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 478 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 505 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 516 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 527 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 605 | `endpoint: `/admin/subscriptions/${subscription.id}`,...` |
| `backend\tests\integration\settings-api.test.ts` | 70 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 86 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 92 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 99 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 113 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 125 | `.get('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 135 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 141 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 156 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 176 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 208 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 227 | `.put('/admin/settings/integrations')...` |
| `backend\tests\integration\settings-api.test.ts` | 259 | `.put('/admin/settings/feature_flags')...` |
| `backend\tests\integration\settings-api.test.ts` | 277 | `.put('/admin/settings/system')...` |
| `backend\tests\integration\settings-api.test.ts` | 289 | `.put('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 300 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 312 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 323 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 334 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 341 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 467 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 474 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 484 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 491 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 498 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\subscriptions.test.ts` | 63 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 75 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 91 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 147 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 172 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 194 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 208 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 222 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 236 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 120 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 135 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 149 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 169 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 186 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 201 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 215 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 230 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 243 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 261 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 276 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 288 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 303 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 315 | `.post('/v1/messages')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 326 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 341 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 360 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 375 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 389 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 405 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 421 | `.post('/v1/messages')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 432 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 447 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 476 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 492 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 502 | `.post('/v1/completions')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 182 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 228 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 279 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 320 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 399 | `.post('/v1/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 418 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 452 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 540 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 651 | `.post('/v1/completions')...` |

---

#### `GET /swagger.json`

**Definition:**
- **File:** `backend\src\routes\swagger.routes.ts`
- **Line:** 65

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 60 | `openapi_spec: '/api-docs/swagger.json',...` |

---

#### `GET /users/me`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `usersController.getCurrentUser`
- **Middleware:** `authenticate`

**Usages (27):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `GET /users/me/preferences`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `usersController.updateCurrentUser`
- **Middleware:** `authenticate`

**Usages (16):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `GET /users/me/preferences/model`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `usersController.setDefaultModel`
- **Middleware:** `authenticate`

**Usages (8):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `GET /models`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `modelsController.listModels`
- **Middleware:** `authenticate`

**Usages (40):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 96 | `'/admin/models/tiers',...` |
| `frontend\src\api\admin.ts` | 108 | ``/admin/models/${modelId}/tier`...` |
| `frontend\src\api\admin.ts` | 123 | ``/admin/models/${modelId}/tier`,...` |
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |
| `frontend\src\api\admin.ts` | 188 | `'/admin/models/providers'...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 114 | `{ name: 'Model Tier Management', href: '/admin/models' },...` |
| `backend\src\middleware\auth.middleware.ts` | 439 | `*   app.get('/admin/models', authMiddleware, requireAdmin, handler);...` |
| `backend\src\routes\index.ts` | 90 | `models: '/v1/models',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 89 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 96 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 130 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 153 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 169 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 178 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 190 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 207 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 218 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 225 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 505 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 522 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 64 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 125 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 181 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 199 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 248 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 337 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 372 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 550 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 37 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 62 | `.get('/v1/models?provider=openai')...` |
| `backend\tests\integration\models.test.ts` | 74 | `.get('/v1/models?capability=vision')...` |
| `backend\tests\integration\models.test.ts` | 85 | `await request(app).get('/v1/models').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 90 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 99 | `.get('/v1/models/gpt-5')...` |
| `backend\tests\integration\models.test.ts` | 120 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\models.test.ts` | 126 | `await request(app).get('/v1/models/gpt-5').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 288 | `request(app).get('/v1/models').set('Authorization', `Bearer ${authToken}`)...` |
| `backend\tests\integration\models.test.ts` | 300 | `.get('/v1/models')...` |

---

#### `GET /models/:modelId`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `modelsController.listModels`
- **Middleware:** `authenticate`

**Usages (14):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 96 | `'/admin/models/tiers',...` |
| `frontend\src\api\admin.ts` | 108 | ``/admin/models/${modelId}/tier`...` |
| `frontend\src\api\admin.ts` | 123 | ``/admin/models/${modelId}/tier`,...` |
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |
| `frontend\src\api\admin.ts` | 188 | `'/admin/models/providers'...` |
| `backend\tests\integration\model-tier-access.test.ts` | 190 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 207 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 218 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 225 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\models.test.ts` | 99 | `.get('/v1/models/gpt-5')...` |
| `backend\tests\integration\models.test.ts` | 120 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\models.test.ts` | 126 | `await request(app).get('/v1/models/gpt-5').expect(401);...` |

---

#### `GET /subscription-plans`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionsController.listSubscriptionPlans`

**Usages (3):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\integration\subscriptions.test.ts` | 63 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 75 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 91 | `.get('/v1/subscription-plans')...` |

---

#### `GET /subscriptions/me`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionsController.listSubscriptionPlans`
- **Middleware:** `authenticate`

**Usages (11):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

#### `GET /credits/me`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `creditsController.getCurrentCredits`
- **Middleware:** `authenticate`

**Usages (6):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 78 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 127 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 167 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 52 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 70 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 77 | `.get('/v1/credits/me')...` |

---

#### `GET /usage`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `creditsController.getCurrentCredits`
- **Middleware:** `authenticate`

**Usages (26):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 389 | ``/admin/credits/usage/${userId}`,...` |
| `backend\src\routes\index.ts` | 95 | `usage: '/v1/usage',...` |
| `backend\src\routes\index.ts` | 111 | `usage: '/admin/usage',...` |
| `backend\src\routes\plan109.routes.ts` | 463 | `'/credits/usage/:userId',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 179 | `.get('/v1/usage')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 192 | `.get('/v1/usage/stats')...` |
| `backend\tests\integration\credits.test.ts` | 101 | `.get('/v1/usage?limit=5&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 120 | `.get('/v1/usage?model_id=gpt-5')...` |
| `backend\tests\integration\credits.test.ts` | 132 | `.get('/v1/usage?operation=chat')...` |
| `backend\tests\integration\credits.test.ts` | 146 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\credits.test.ts` | 158 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 168 | `.get('/v1/usage?limit=101')...` |
| `backend\tests\integration\credits.test.ts` | 175 | `.get('/v1/usage?offset=-1')...` |
| `backend\tests\integration\credits.test.ts` | 182 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 194 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 209 | `.get('/v1/usage/stats?group_by=hour')...` |
| `backend\tests\integration\credits.test.ts` | 222 | `.get('/v1/usage/stats?group_by=model')...` |
| `backend\tests\integration\credits.test.ts` | 241 | `.get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_dat...` |
| `backend\tests\integration\credits.test.ts` | 250 | `.get('/v1/usage/stats?group_by=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 257 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 326 | `.get('/v1/usage?limit=10&offset=1000')...` |
| `backend\tests\integration\credits.test.ts` | 336 | `.get('/v1/usage?limit=1&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 346 | `.get('/v1/usage?limit=100')...` |
| `backend\tests\integration\credits.test.ts` | 361 | `.get('/v1/usage?start_date=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 368 | `.get('/v1/usage?end_date=not-a-date')...` |
| `backend\tests\integration\credits.test.ts` | 378 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |

---

#### `GET /usage/stats`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `creditsController.getUsageHistory`
- **Middleware:** `authenticate`

**Usages (7):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 192 | `.get('/v1/usage/stats')...` |
| `backend\tests\integration\credits.test.ts` | 194 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 209 | `.get('/v1/usage/stats?group_by=hour')...` |
| `backend\tests\integration\credits.test.ts` | 222 | `.get('/v1/usage/stats?group_by=model')...` |
| `backend\tests\integration\credits.test.ts` | 241 | `.get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_dat...` |
| `backend\tests\integration\credits.test.ts` | 250 | `.get('/v1/usage/stats?group_by=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 257 | `.get('/v1/usage/stats?group_by=day')...` |

---

#### `GET /rate-limit`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `creditsController.getRateLimitStatus`
- **Middleware:** `authenticate`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\integration\credits.test.ts` | 269 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 289 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 304 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 314 | `.get('/v1/rate-limit')...` |

---

#### `GET /webhooks/config`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `webhooksController.getWebhookConfig`
- **Middleware:** `authenticate`

**Usages:** None found

---

### PATCH Endpoints (10)

#### `PATCH /models/:modelId/tier`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `modelTierAdminController.updateModelTier`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 108 | ``/admin/models/${modelId}/tier`...` |
| `frontend\src\api\admin.ts` | 123 | ``/admin/models/${modelId}/tier`,...` |

---

#### `PATCH /users/:id/role`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |

---

#### `PATCH /users/:id`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.viewUserDetails`
- **Middleware:** `auditLog`

**Usages (58):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `PATCH /licenses/activations/:id/replace`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.deactivateDevice`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 169 | ``/api/licenses/activations/${activationId}/replace`,...` |

---

#### `PATCH /admin/coupons/:id`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `PATCH /admin/campaigns/:id`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `PATCH /admin/fraud-detection/:id/review`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `PATCH /users/me`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `usersController.getCurrentUser`
- **Middleware:** `authenticate`

**Usages (27):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `PATCH /users/me/preferences`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `usersController.getUserPreferences`
- **Middleware:** `authenticate`

**Usages (16):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `PATCH /subscriptions/me`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionsController.createSubscription`
- **Middleware:** `authenticate`

**Usages (11):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

### POST Endpoints (70)

#### `POST /users/:id/suspend`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminController.suspendUser`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |

---

#### `POST /webhooks/test`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `adminController.testWebhook`

**Usages:** None found

---

#### `POST /models/tiers/bulk`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `modelTierAdminController.bulkUpdateModelTiers`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |

---

#### `POST /models/tiers/revert/:auditLogId`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `modelTierAdminController.revertTierChange`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |

---

#### `POST /settings/test-email`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `settingsController.testEmailConfig`
- **Middleware:** `auditLog`

**Usages (5):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |

---

#### `POST /settings/clear-cache`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `settingsController.testEmailConfig`
- **Middleware:** `auditLog`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |

---

#### `POST /settings/run-backup`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `settingsController.runBackup`
- **Middleware:** `auditLog`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |

---

#### `POST /pricing/simulate`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `profitabilityController.simulatePricing`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\pricing.ts` | 225 | `'/admin/pricing/simulate',...` |

---

#### `POST /register`

**Definition:**
- **File:** `backend\src\routes\auth.routes.ts`
- **Line:** 1
- **Handler:** `authManagementController.register`

**Usages (11):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 68 | `register: '/auth/register',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 30 | `.post('/oauth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 49 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 77 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 95 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 107 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 116 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 125 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 134 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 148 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 456 | `.post('/auth/register')...` |

---

#### `POST /verify-email`

**Definition:**
- **File:** `backend\src\routes\auth.routes.ts`
- **Line:** 1
- **Handler:** `authManagementController.verifyEmail`

**Usages (7):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 69 | `verify_email: '/auth/verify-email',...` |
| `backend\tests\integration\auth.integration.test.ts` | 167 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 193 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 207 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 221 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 233 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 472 | `.post('/auth/verify-email')...` |

---

#### `POST /forgot-password`

**Definition:**
- **File:** `backend\src\routes\auth.routes.ts`
- **Line:** 1
- **Handler:** `authManagementController.forgotPassword`

**Usages (7):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 70 | `forgot_password: '/auth/forgot-password',...` |
| `backend\tests\integration\auth.integration.test.ts` | 249 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 272 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 288 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 305 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 321 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 491 | `.post('/auth/forgot-password')...` |

---

#### `POST /reset-password`

**Definition:**
- **File:** `backend\src\routes\auth.routes.ts`
- **Line:** 1
- **Handler:** `authManagementController.resetPassword`

**Usages (8):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 71 | `reset_password: '/auth/reset-password',...` |
| `backend\tests\integration\auth.integration.test.ts` | 340 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 368 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 383 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 398 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 414 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 435 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 503 | `.post('/auth/reset-password')...` |

---

#### `POST /track-download`

**Definition:**
- **File:** `backend\src\routes\branding.routes.ts`
- **Line:** 1
- **Handler:** `brandingController.trackDownload`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\services\api.ts` | 242 | `const response = await apiClient.post('/api/track-download', { os });...` |
| `backend\src\routes\index.ts` | 117 | `downloads: '/api/track-download',...` |

---

#### `POST /feedback`

**Definition:**
- **File:** `backend\src\routes\branding.routes.ts`
- **Line:** 1
- **Handler:** `brandingController.submitFeedback`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\services\api.ts` | 248 | `const response = await apiClient.post('/api/feedback', data);...` |
| `backend\src\routes\index.ts` | 118 | `feedback: '/api/feedback',...` |

---

#### `POST /diagnostics`

**Definition:**
- **File:** `backend\src\routes\branding.routes.ts`
- **Line:** 1

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 119 | `diagnostics: '/api/diagnostics',...` |

---

#### `POST /webhooks/stripe`

**Definition:**
- **File:** `backend\src\routes\index.ts`
- **Line:** 1
- **Handler:** `subscriptionsController.handleStripeWebhook`

**Usages:** None found

---

#### `POST /setup`

**Definition:**
- **File:** `backend\src\routes\mfa.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages (10):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 72 | `mfa_setup: '/auth/mfa/setup',...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 112 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 352 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 485 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 346 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 76 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 109 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 124 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 133 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 150 | `.post('/auth/mfa/setup')...` |

---

#### `POST /verify-setup`

**Definition:**
- **File:** `backend\src\routes\mfa.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages (8):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 73 | `mfa_verify_setup: '/auth/mfa/verify-setup',...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 131 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 370 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 358 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 166 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 188 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 214 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 231 | `.post('/auth/mfa/verify-setup')...` |

---

#### `POST /verify-login`

**Definition:**
- **File:** `backend\src\routes\mfa.routes.ts`
- **Line:** 1

**Usages (16):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 74 | `mfa_verify_login: '/auth/mfa/verify-login',...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 164 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 285 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 641 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 383 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 395 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 146 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 373 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 393 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 447 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 476 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 652 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 274 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 287 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 308 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 337 | `.post('/auth/mfa/verify-login')...` |

---

#### `POST /disable`

**Definition:**
- **File:** `backend\src\routes\mfa.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages (5):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 75 | `mfa_disable: '/auth/mfa/disable',...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 453 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 467 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 495 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 514 | `.post('/auth/mfa/disable')...` |

---

#### `POST /backup-code-login`

**Definition:**
- **File:** `backend\src\routes\mfa.routes.ts`
- **Line:** 1

**Usages (11):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 76 | `mfa_backup_code_login: '/auth/mfa/backup-code-login',...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 391 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 403 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 409 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 425 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 407 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 424 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 384 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 405 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 418 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 427 | `.post('/auth/mfa/backup-code-login')...` |

---

#### `POST /subscriptions`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.createSubscription`
- **Middleware:** `auditLog`

**Usages (69):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 63 | `{ name: 'Subscription Management', href: '/admin/subscriptions' },...` |
| `frontend\src\pages\admin\SubscriptionManagement.tsx` | 517 | `<Link to={`/admin/subscriptions/${subscription.id}`}>...` |
| `frontend\src\utils\breadcrumbs.ts` | 63 | `'/admin/subscriptions': 'Subscriptions',...` |
| `backend\src\routes\admin.routes.ts` | 355 | `'/users/:id/subscriptions',...` |
| `backend\src\routes\index.ts` | 93 | `subscriptions: '/v1/subscriptions',...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\index.ts` | 110 | `subscriptions: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 74 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 88 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 104 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 126 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 146 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 167 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 191 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 206 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 227 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 237 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 247 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 257 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 282 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 291 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 433 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 443 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 453 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 463 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 512 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 111 | `.post('/v1/subscriptions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\helpers\mocks.ts` | 133 | `.post('/v1/subscriptions')...` |
| `backend\tests\helpers\mocks.ts` | 159 | `.delete(`/v1/subscriptions/${subscriptionId}`)...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 388 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 408 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 425 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 478 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 505 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 516 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 527 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 605 | `endpoint: `/admin/subscriptions/${subscription.id}`,...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 147 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 172 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 194 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 208 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 222 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 236 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

#### `POST /subscriptions/:id/upgrade`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.createSubscription`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |

---

#### `POST /subscriptions/:id/downgrade`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.upgradeTier`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |

---

#### `POST /subscriptions/:id/cancel`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.downgradeTier`
- **Middleware:** `auditLog`

**Usages (5):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

#### `POST /subscriptions/:id/reactivate`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.cancelSubscription`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |

---

#### `POST /subscriptions/:id/allocate-credits`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.reactivateSubscription`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |

---

#### `POST /subscriptions/:id/rollover`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionController.allocateMonthlyCredits`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `POST /users/:id/suspend`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.editUserProfile`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |

---

#### `POST /users/:id/unsuspend`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.suspendUser`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |

---

#### `POST /users/:id/ban`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.unsuspendUser`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |

---

#### `POST /users/:id/unban`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.banUser`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |

---

#### `POST /users/bulk-update`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.unbanUser`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |

---

#### `POST /users/:id/adjust-credits`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `userManagementController.bulkUpdateUsers`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |

---

#### `POST /billing/payment-methods`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.addPaymentMethod`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `POST /billing/invoices/:subscriptionId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.listPaymentMethods`
- **Middleware:** `auditLog`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |
| `frontend\src\api\plan109.ts` | 281 | `? `/admin/billing/invoices/${userId}`...` |

---

#### `POST /billing/transactions/:id/refund`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.listTransactions`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 309 | ``/admin/billing/transactions/${transactionId}/refund`,...` |

---

#### `POST /billing/dunning/:attemptId/retry`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `billingController.refundTransaction`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 330 | ``/admin/billing/dunning/${attemptId}/retry`...` |

---

#### `POST /credits/allocate`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.allocateSubscriptionCredits`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `POST /credits/process-monthly`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.allocateSubscriptionCredits`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 411 | `'/admin/credits/process-monthly'...` |

---

#### `POST /credits/grant-bonus`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.processMonthlyAllocations`
- **Middleware:** `auditLog`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan109.ts` | 400 | `'/admin/credits/grant-bonus',...` |

---

#### `POST /credits/deduct`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.grantBonusCredits`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `POST /credits/rollover/:userId/apply`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.calculateRollover`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `POST /credits/sync/:userId`

**Definition:**
- **File:** `backend\src\routes\plan109.routes.ts`
- **Line:** 1
- **Handler:** `creditController.applyRollover`
- **Middleware:** `auditLog`

**Usages:** None found

---

#### `POST /licenses/purchase`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.purchaseLicense`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 89 | `'/api/licenses/purchase',...` |

---

#### `POST /licenses/activate`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.purchaseLicense`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 148 | `'/api/licenses/activate',...` |

---

#### `POST /licenses/:licenseKey/upgrade`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `upgradeController.checkVersionEligibility`
- **Middleware:** `authenticate`

**Usages (3):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 196 | ``/api/licenses/${licenseKey}/upgrade-history`...` |
| `frontend\src\api\plan110.ts` | 216 | ``/api/licenses/${licenseKey}/upgrade`,...` |
| `backend\src\routes\index.ts` | 103 | `version_upgrades: '/api/licenses/:licenseKey/upgrade',...` |

---

#### `POST /subscriptions/:id/proration-preview`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.previewProration`
- **Middleware:** `authenticate`

**Usages (2):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |

---

#### `POST /subscriptions/:id/upgrade-with-proration`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.upgradeWithProration`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |

---

#### `POST /subscriptions/:id/downgrade-with-proration`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.downgradeWithProration`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |

---

#### `POST /migrations/perpetual-to-subscription`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `migrationController.migratePerpetualToSubscription`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 364 | `'/api/migrations/perpetual-to-subscription',...` |

---

#### `POST /migrations/subscription-to-perpetual`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `migrationController.migrateSubscriptionToPerpetual`
- **Middleware:** `authenticate`

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\plan110.ts` | 375 | `'/api/migrations/subscription-to-perpetual',...` |

---

#### `POST /admin/licenses/:id/suspend`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/licenses/:id/revoke`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `licenseController.suspendLicense`
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/licenses/devices/:id/deactivate`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `deviceActivationController.getDeviceStats`
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/licenses/devices/:id/revoke`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `deviceActivationController.deactivateDevice`
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/licenses/devices/bulk-action`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `deviceActivationController.revokeDevice`
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/prorations/:id/reverse`

**Definition:**
- **File:** `backend\src\routes\plan110.routes.ts`
- **Line:** 1
- **Handler:** `prorationController.getProrationStats`
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /api/coupons/validate`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1

**Usages:** None found

---

#### `POST /api/coupons/redeem`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `POST /admin/coupons`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/campaigns`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /admin/campaigns/:id/assign-coupon`

**Definition:**
- **File:** `backend\src\routes\plan111.routes.ts`
- **Line:** 1
- **Middleware:** `authenticate`, `auditLog`

**Usages:** None found

---

#### `POST /users/me/preferences/model`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `usersController.updateUserPreferences`
- **Middleware:** `authenticate`

**Usages (8):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |

---

#### `POST /completions`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `modelsController.textCompletion`
- **Middleware:** `authenticate`

**Usages (69):**

| File | Line | Context |
|------|------|----------|
| `backend\src\middleware\credit.middleware.ts` | 8 | `*   app.post('/v1/completions', authMiddleware, checkCredits(), handler);...` |
| `backend\src\routes\index.ts` | 91 | `completions: '/v1/completions',...` |
| `backend\src\routes\index.ts` | 92 | `chat: '/v1/chat/completions',...` |
| `backend\src\routes\v1.routes.ts` | 173 | `'/chat/completions',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 146 | `.post('/v1/chat/completions')...` |
| `backend\tests\helpers\mocks.ts` | 38 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 246 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 267 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 284 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 298 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 317 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 333 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 347 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 357 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 380 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 398 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 411 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 424 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 437 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 453 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 484 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 90 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 151 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 211 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 280 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 306 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 401 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 443 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 466 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 496 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 519 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 139 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 170 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 180 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 191 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 210 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 247 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 257 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 268 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 120 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 135 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 149 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 169 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 186 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 201 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 215 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 230 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 243 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 261 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 276 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 288 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 303 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 326 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 341 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 360 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 375 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 389 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 405 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 432 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 447 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 476 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 492 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 502 | `.post('/v1/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 182 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 228 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 399 | `.post('/v1/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 452 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 540 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 651 | `.post('/v1/completions')...` |

---

#### `POST /chat/completions`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `modelsController.chatCompletion`
- **Middleware:** `authenticate`

**Usages (49):**

| File | Line | Context |
|------|------|----------|
| `backend\src\routes\index.ts` | 92 | `chat: '/v1/chat/completions',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 146 | `.post('/v1/chat/completions')...` |
| `backend\tests\helpers\mocks.ts` | 38 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 246 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 267 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 284 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 298 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 317 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 333 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 347 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 357 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 453 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 484 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 90 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 151 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 211 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 280 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 306 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 401 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 443 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 466 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 496 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 519 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 210 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 247 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 257 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 268 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 120 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 135 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 149 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 169 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 186 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 201 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 215 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 230 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 243 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 261 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 276 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 288 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 303 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 326 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 341 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 447 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 476 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 492 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 182 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 228 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 452 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 540 | `.post('/v1/chat/completions')...` |

---

#### `POST /subscriptions`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionsController.getCurrentSubscription`
- **Middleware:** `authenticate`

**Usages (69):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 63 | `{ name: 'Subscription Management', href: '/admin/subscriptions' },...` |
| `frontend\src\pages\admin\SubscriptionManagement.tsx` | 517 | `<Link to={`/admin/subscriptions/${subscription.id}`}>...` |
| `frontend\src\utils\breadcrumbs.ts` | 63 | `'/admin/subscriptions': 'Subscriptions',...` |
| `backend\src\routes\admin.routes.ts` | 355 | `'/users/:id/subscriptions',...` |
| `backend\src\routes\index.ts` | 93 | `subscriptions: '/v1/subscriptions',...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\index.ts` | 110 | `subscriptions: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 74 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 88 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 104 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 126 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 146 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 167 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 191 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 206 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 227 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 237 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 247 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 257 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 282 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 291 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 433 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 443 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 453 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 463 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 512 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 111 | `.post('/v1/subscriptions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\helpers\mocks.ts` | 133 | `.post('/v1/subscriptions')...` |
| `backend\tests\helpers\mocks.ts` | 159 | `.delete(`/v1/subscriptions/${subscriptionId}`)...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 388 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 408 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 425 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 478 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 505 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 516 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 527 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 605 | `endpoint: `/admin/subscriptions/${subscription.id}`,...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 147 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 172 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 194 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 208 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 222 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 236 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

#### `POST /subscriptions/me/cancel`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `subscriptionsController.updateSubscription`
- **Middleware:** `authenticate`

**Usages (4):**

| File | Line | Context |
|------|------|----------|
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |

---

#### `POST /webhooks/config`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `webhooksController.getWebhookConfig`
- **Middleware:** `authenticate`

**Usages:** None found

---

#### `POST /webhooks/test`

**Definition:**
- **File:** `backend\src\routes\v1.routes.ts`
- **Line:** 1
- **Handler:** `webhooksController.deleteWebhookConfig`
- **Middleware:** `authenticate`

**Usages:** None found

---

### PUT Endpoints (1)

#### `PUT /settings/:category`

**Definition:**
- **File:** `backend\src\routes\admin.routes.ts`
- **Line:** 1
- **Handler:** `settingsController.updateCategorySettings`
- **Middleware:** `auditLog`

**Usages (36):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\settings.api.ts` | 64 | ``/admin/settings/${category}`...` |
| `frontend\src\api\settings.api.ts` | 77 | ``/admin/settings/${category}`,...` |
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `backend\tests\integration\settings-api.test.ts` | 113 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 125 | `.get('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 135 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 141 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 156 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 176 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 208 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 227 | `.put('/admin/settings/integrations')...` |
| `backend\tests\integration\settings-api.test.ts` | 259 | `.put('/admin/settings/feature_flags')...` |
| `backend\tests\integration\settings-api.test.ts` | 277 | `.put('/admin/settings/system')...` |
| `backend\tests\integration\settings-api.test.ts` | 289 | `.put('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 300 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 312 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 323 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 334 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 341 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 467 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 474 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 484 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 491 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 498 | `.get('/admin/settings/general')...` |

---

## Identity Provider (OAuth 2.0/OIDC)

**Base URL:** `http://localhost:7151`

**Total Endpoints:** 22

### ALL Endpoints (1)

#### `ALL /`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 67

**Usages (867):**

| File | Line | Context |
|------|------|----------|
| `frontend\src\api\admin.ts` | 96 | `'/admin/models/tiers',...` |
| `frontend\src\api\admin.ts` | 108 | ``/admin/models/${modelId}/tier`...` |
| `frontend\src\api\admin.ts` | 123 | ``/admin/models/${modelId}/tier`,...` |
| `frontend\src\api\admin.ts` | 142 | `}>('/admin/models/tiers/bulk', {...` |
| `frontend\src\api\admin.ts` | 163 | `'/admin/models/tiers/audit-logs',...` |
| `frontend\src\api\admin.ts` | 179 | `}>(`/admin/models/tiers/revert/${auditLogId}`);...` |
| `frontend\src\api\admin.ts` | 188 | `'/admin/models/providers'...` |
| `frontend\src\api\admin.ts` | 205 | `'/admin/analytics/dashboard-kpis',...` |
| `frontend\src\api\admin.ts` | 220 | `'/admin/analytics/recent-activity',...` |
| `frontend\src\api\admin.ts` | 236 | ``/admin/users/${userId}/overview`...` |
| `frontend\src\api\admin.ts` | 251 | ``/admin/users/${userId}/subscriptions`,...` |
| `frontend\src\api\admin.ts` | 267 | ``/admin/users/${userId}/licenses`,...` |
| `frontend\src\api\admin.ts` | 283 | ``/admin/users/${userId}/credits`,...` |
| `frontend\src\api\admin.ts` | 299 | ``/admin/users/${userId}/coupons`,...` |
| `frontend\src\api\admin.ts` | 315 | ``/admin/users/${userId}/payments`,...` |
| `frontend\src\api\admin.ts` | 331 | ``/admin/users/${userId}/activity`,...` |
| `frontend\src\api\admin.ts` | 600 | `'/admin/analytics/revenue/kpis',...` |
| `frontend\src\api\admin.ts` | 614 | `'/admin/analytics/revenue/mix',...` |
| `frontend\src\api\admin.ts` | 628 | `'/admin/analytics/revenue/trend',...` |
| `frontend\src\api\admin.ts` | 642 | `'/admin/analytics/revenue/conversion-funnel',...` |
| `frontend\src\api\admin.ts` | 658 | `'/admin/analytics/revenue/credit-usage',...` |
| `frontend\src\api\admin.ts` | 674 | `'/admin/analytics/revenue/coupon-roi',...` |
| `frontend\src\api\plan109.ts` | 68 | `'/admin/subscriptions/all',...` |
| `frontend\src\api\plan109.ts` | 79 | `'/admin/subscriptions/stats'...` |
| `frontend\src\api\plan109.ts` | 89 | ``/admin/subscriptions/user/${userId}`...` |
| `frontend\src\api\plan109.ts` | 99 | ``/admin/subscriptions/${subscriptionId}/upgrade`,...` |
| `frontend\src\api\plan109.ts` | 110 | ``/admin/subscriptions/${subscriptionId}/downgrade`,...` |
| `frontend\src\api\plan109.ts` | 121 | ``/admin/subscriptions/${subscriptionId}/cancel`,...` |
| `frontend\src\api\plan109.ts` | 132 | ``/admin/subscriptions/${subscriptionId}/reactivate`...` |
| `frontend\src\api\plan109.ts` | 142 | ``/admin/subscriptions/${subscriptionId}/allocate-credits`...` |
| `frontend\src\api\plan109.ts` | 158 | `'/admin/users',...` |
| `frontend\src\api\plan109.ts` | 169 | `'/admin/users/search',...` |
| `frontend\src\api\plan109.ts` | 180 | ``/admin/users/${userId}`...` |
| `frontend\src\api\plan109.ts` | 190 | ``/admin/users/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 201 | ``/admin/users/${data.userId}/suspend`,...` |
| `frontend\src\api\plan109.ts` | 212 | ``/admin/users/${userId}/unsuspend`...` |
| `frontend\src\api\plan109.ts` | 222 | ``/admin/users/${data.userId}/ban`,...` |
| `frontend\src\api\plan109.ts` | 233 | ``/admin/users/${userId}/unban`...` |
| `frontend\src\api\plan109.ts` | 243 | `'/admin/users/bulk-update',...` |
| `frontend\src\api\plan109.ts` | 254 | ``/admin/users/${userId}/adjust-credits`,...` |
| `frontend\src\api\plan109.ts` | 271 | ``/admin/billing/invoices/upcoming/${userId}`...` |
| `frontend\src\api\plan109.ts` | 281 | `? `/admin/billing/invoices/${userId}`...` |
| `frontend\src\api\plan109.ts` | 282 | `: '/admin/billing/invoices';...` |
| `frontend\src\api\plan109.ts` | 295 | `? `/admin/billing/transactions/${userId}`...` |
| `frontend\src\api\plan109.ts` | 296 | `: '/admin/billing/transactions';...` |
| `frontend\src\api\plan109.ts` | 309 | ``/admin/billing/transactions/${transactionId}/refund`,...` |
| `frontend\src\api\plan109.ts` | 320 | `'/admin/billing/dunning'...` |
| `frontend\src\api\plan109.ts` | 330 | ``/admin/billing/dunning/${attemptId}/retry`...` |
| `frontend\src\api\plan109.ts` | 340 | `'/admin/analytics/revenue',...` |
| `frontend\src\api\plan109.ts` | 351 | `'/admin/analytics/revenue/by-tier',...` |
| `frontend\src\api\plan109.ts` | 368 | ``/admin/credits/balance/${userId}`...` |
| `frontend\src\api\plan109.ts` | 378 | ``/admin/credits/history/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 389 | ``/admin/credits/usage/${userId}`,...` |
| `frontend\src\api\plan109.ts` | 400 | `'/admin/credits/grant-bonus',...` |
| `frontend\src\api\plan109.ts` | 411 | `'/admin/credits/process-monthly'...` |
| `frontend\src\api\plan109.ts` | 421 | `'/admin/analytics/credit-utilization',...` |
| `frontend\src\api\plan109.ts` | 432 | `'/admin/analytics/top-credit-consumers',...` |
| `frontend\src\api\plan109.ts` | 449 | `'/admin/analytics/dashboard'...` |
| `frontend\src\api\plan109.ts` | 459 | `'/admin/analytics/revenue/mrr'...` |
| `frontend\src\api\plan109.ts` | 469 | `'/admin/analytics/revenue/arr'...` |
| `frontend\src\api\plan109.ts` | 479 | `'/admin/analytics/users/total'...` |
| `frontend\src\api\plan109.ts` | 489 | `'/admin/analytics/users/by-tier'...` |
| `frontend\src\api\plan109.ts` | 499 | `'/admin/analytics/churn-rate',...` |
| `frontend\src\api\plan109.ts` | 510 | `'/admin/analytics/conversion-rate'...` |
| `frontend\src\api\plan109.ts` | 524 | `}>('/admin/analytics/revenue/funnel', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 568 | `}>('/admin/analytics/revenue/trend', { params: { period } });...` |
| `frontend\src\api\plan109.ts` | 624 | `}>('/admin/analytics/revenue/credit-usage', { params: { period, limit } });...` |
| `frontend\src\api\plan110.ts` | 58 | `'/admin/licenses',...` |
| `frontend\src\api\plan110.ts` | 69 | `'/admin/licenses/stats'...` |
| `frontend\src\api\plan110.ts` | 79 | ``/api/licenses/${licenseKey}`...` |
| `frontend\src\api\plan110.ts` | 89 | `'/api/licenses/purchase',...` |
| `frontend\src\api\plan110.ts` | 100 | ``/admin/licenses/${licenseId}/suspend`,...` |
| `frontend\src\api\plan110.ts` | 111 | ``/admin/licenses/${licenseId}/revoke`,...` |
| `frontend\src\api\plan110.ts` | 122 | ``/admin/licenses/${licenseId}/reactivate`...` |
| `frontend\src\api\plan110.ts` | 138 | ``/api/licenses/${licenseKey}/devices`...` |
| `frontend\src\api\plan110.ts` | 148 | `'/api/licenses/activate',...` |
| `frontend\src\api\plan110.ts` | 159 | ``/api/licenses/activations/${activationId}`...` |
| `frontend\src\api\plan110.ts` | 169 | ``/api/licenses/activations/${activationId}/replace`,...` |
| `frontend\src\api\plan110.ts` | 186 | ``/api/licenses/${licenseKey}/available-upgrades`...` |
| `frontend\src\api\plan110.ts` | 196 | ``/api/licenses/${licenseKey}/upgrade-history`...` |
| `frontend\src\api\plan110.ts` | 206 | ``/api/licenses/${licenseKey}/version-eligibility/${version}`...` |
| `frontend\src\api\plan110.ts` | 216 | ``/api/licenses/${licenseKey}/upgrade`,...` |
| `frontend\src\api\plan110.ts` | 227 | `'/admin/analytics/upgrade-conversion'...` |
| `frontend\src\api\plan110.ts` | 243 | `'/admin/prorations',...` |
| `frontend\src\api\plan110.ts` | 254 | `'/admin/prorations/stats'...` |
| `frontend\src\api\plan110.ts` | 264 | ``/api/subscriptions/${subscriptionId}/proration-history`...` |
| `frontend\src\api\plan110.ts` | 274 | ``/api/subscriptions/${subscriptionId}/proration-preview`,...` |
| `frontend\src\api\plan110.ts` | 285 | ``/api/subscriptions/${subscriptionId}/upgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 296 | ``/api/subscriptions/${subscriptionId}/downgrade-with-proration`,...` |
| `frontend\src\api\plan110.ts` | 307 | ``/admin/prorations/${prorationId}/reverse`,...` |
| `frontend\src\api\plan110.ts` | 318 | ``/admin/prorations/${prorationId}/calculation`...` |
| `frontend\src\api\plan110.ts` | 334 | `'/api/migrations/eligibility'...` |
| `frontend\src\api\plan110.ts` | 344 | `'/api/migrations/history'...` |
| `frontend\src\api\plan110.ts` | 354 | ``/api/migrations/trade-in-value/${licenseId}`...` |
| `frontend\src\api\plan110.ts` | 364 | `'/api/migrations/perpetual-to-subscription',...` |
| `frontend\src\api\plan110.ts` | 375 | `'/api/migrations/subscription-to-perpetual',...` |
| `frontend\src\api\plan110.ts` | 392 | `'/admin/analytics/proration-revenue',...` |
| `frontend\src\api\plan110.ts` | 403 | `'/admin/analytics/proration-time-series',...` |
| `frontend\src\api\plan110.ts` | 414 | `'/admin/analytics/upgrade-distribution'...` |
| `frontend\src\api\plan110.ts` | 424 | `'/admin/analytics/tier-change-paths',...` |
| `frontend\src\api\plan111.ts` | 62 | `'/api/coupons/validate',...` |
| `frontend\src\api\plan111.ts` | 76 | `'/api/coupons/redeem',...` |
| `frontend\src\api\plan111.ts` | 88 | ``/api/users/${userId}/coupons`...` |
| `frontend\src\api\plan111.ts` | 100 | `const response = await apiClient.post<Coupon>('/admin/coupons', data);...` |
| `frontend\src\api\plan111.ts` | 114 | ``/admin/coupons/${id}`,...` |
| `frontend\src\api\plan111.ts` | 125 | `await apiClient.delete(`/admin/coupons/${id}`);...` |
| `frontend\src\api\plan111.ts` | 145 | `'/admin/coupons',...` |
| `frontend\src\api\plan111.ts` | 164 | ``/admin/coupons/${id}/redemptions`,...` |
| `frontend\src\api\plan111.ts` | 180 | `'/admin/campaigns',...` |
| `frontend\src\api\plan111.ts` | 196 | ``/admin/campaigns/${id}`,...` |
| `frontend\src\api\plan111.ts` | 207 | `await apiClient.delete(`/admin/campaigns/${id}`);...` |
| `frontend\src\api\plan111.ts` | 227 | `'/admin/campaigns',...` |
| `frontend\src\api\plan111.ts` | 241 | ``/admin/campaigns/${id}/performance`...` |
| `frontend\src\api\plan111.ts` | 255 | `await apiClient.post(`/admin/campaigns/${campaignId}/assign-coupon`, {...` |
| `frontend\src\api\plan111.ts` | 270 | ``/admin/campaigns/${campaignId}/remove-coupon/${couponId}`...` |
| `frontend\src\api\plan111.ts` | 293 | `'/admin/fraud-detection',...` |
| `frontend\src\api\plan111.ts` | 311 | ``/admin/fraud-detection/${id}/review`,...` |
| `frontend\src\api\plan111.ts` | 322 | `'/admin/fraud-detection/pending'...` |
| `frontend\src\api\plan111.ts` | 343 | `'/admin/analytics/coupons',...` |
| `frontend\src\api\plan111.ts` | 360 | `'/admin/analytics/coupons/trend',...` |
| `frontend\src\api\plan111.ts` | 375 | `'/admin/analytics/coupons/top',...` |
| `frontend\src\api\plan111.ts` | 386 | `'/admin/analytics/coupons/by-type'...` |
| `frontend\src\api\pricing.ts` | 168 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 177 | ``/admin/pricing/configs/${id}`...` |
| `frontend\src\api\pricing.ts` | 185 | `'/admin/pricing/configs',...` |
| `frontend\src\api\pricing.ts` | 194 | ``/admin/pricing/configs/${id}`,...` |
| `frontend\src\api\pricing.ts` | 203 | ``/admin/pricing/configs/${id}/approve`,...` |
| `frontend\src\api\pricing.ts` | 212 | ``/admin/pricing/configs/${id}/reject`,...` |
| `frontend\src\api\pricing.ts` | 225 | `'/admin/pricing/simulate',...` |
| `frontend\src\api\pricing.ts` | 234 | `'/admin/pricing/scenarios',...` |
| `frontend\src\api\pricing.ts` | 243 | `'/admin/pricing/scenarios'...` |
| `frontend\src\api\pricing.ts` | 255 | `'/admin/pricing/vendor-prices',...` |
| `frontend\src\api\pricing.ts` | 264 | `'/admin/pricing/alerts',...` |
| `frontend\src\api\pricing.ts` | 273 | ``/admin/pricing/alerts/${alertId}/acknowledge`...` |
| `frontend\src\api\pricing.ts` | 281 | ``/admin/pricing/alerts/${alertId}/apply`...` |
| `frontend\src\api\pricing.ts` | 289 | ``/admin/pricing/alerts/${alertId}/ignore`,...` |
| `frontend\src\api\pricing.ts` | 302 | `'/admin/pricing/margin-metrics',...` |
| `frontend\src\api\pricing.ts` | 311 | `'/admin/pricing/margin-by-tier',...` |
| `frontend\src\api\pricing.ts` | 320 | `'/admin/pricing/margin-by-provider',...` |
| `frontend\src\api\pricing.ts` | 329 | `'/admin/pricing/top-models',...` |
| `frontend\src\api\pricing.ts` | 345 | `}>('/admin/pricing/margin-history', {...` |
| `frontend\src\api\settings.api.ts` | 54 | `'/admin/settings'...` |
| `frontend\src\api\settings.api.ts` | 64 | ``/admin/settings/${category}`...` |
| `frontend\src\api\settings.api.ts` | 77 | ``/admin/settings/${category}`,...` |
| `frontend\src\api\settings.api.ts` | 88 | `'/admin/settings/test-email',...` |
| `frontend\src\api\settings.api.ts` | 99 | `'/admin/settings/clear-cache'...` |
| `frontend\src\api\settings.api.ts` | 109 | `'/admin/settings/run-backup'...` |
| `frontend\src\App.tsx` | 27 | `{ path: '/oauth/callback', element: <OAuthCallback /> },...` |
| `frontend\src\App.tsx` | 31 | `{ path: '/admin/model-tiers', element: <ProtectedRoute><ModelTierManagement /></...` |
| `frontend\src\App.tsx` | 32 | `{ path: '/admin/pricing-configuration', element: <ProtectedRoute><PricingConfigu...` |
| `frontend\src\App.tsx` | 33 | `{ path: '/admin/pricing-simulation', element: <ProtectedRoute><PricingSimulation...` |
| `frontend\src\App.tsx` | 34 | `{ path: '/admin/vendor-price-monitoring', element: <ProtectedRoute><VendorPriceM...` |
| `frontend\src\App.tsx` | 35 | `{ path: '/admin/margin-tracking', element: <ProtectedRoute><MarginTracking /></P...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 53 | `{ name: 'User List', href: '/admin/users' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 63 | `{ name: 'Subscription Management', href: '/admin/subscriptions' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 64 | `{ name: 'Billing Dashboard', href: '/admin/billing' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 65 | `{ name: 'Credit Management', href: '/admin/credits' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 75 | `{ name: 'License Management', href: '/admin/licenses' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 76 | `{ name: 'Device Activations', href: '/admin/licenses/devices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 77 | `{ name: 'Proration Tracking', href: '/admin/licenses/prorations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 87 | `{ name: 'Coupon Management', href: '/admin/coupons' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 88 | `{ name: 'Campaign Management', href: '/admin/coupons/campaigns' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 89 | `{ name: 'Campaign Calendar', href: '/admin/coupons/calendar' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 90 | `{ name: 'Coupon Analytics', href: '/admin/coupons/analytics' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 91 | `{ name: 'Fraud Detection', href: '/admin/coupons/fraud' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 101 | `{ name: 'Margin Tracking', href: '/admin/profitability/margins' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 102 | `{ name: 'Pricing Configuration', href: '/admin/profitability/pricing' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 103 | `{ name: 'Pricing Simulator', href: '/admin/profitability/simulator' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 104 | `{ name: 'Vendor Price Monitoring', href: '/admin/profitability/vendor-prices' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 114 | `{ name: 'Model Tier Management', href: '/admin/models' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 124 | `{ name: 'Platform Analytics', href: '/admin/analytics' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 125 | `{ name: 'Revenue Analytics', href: '/admin/analytics/revenue' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 135 | `{ name: 'General', href: '/admin/settings#general' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 136 | `{ name: 'Email & Notifications', href: '/admin/settings#email' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 137 | `{ name: 'Security', href: '/admin/settings#security' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 138 | `{ name: 'Integrations', href: '/admin/settings#integrations' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 139 | `{ name: 'Feature Flags', href: '/admin/settings#features' },...` |
| `frontend\src\components\admin\layout\AdminSidebar.tsx` | 140 | `{ name: 'System', href: '/admin/settings#system' },...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 427 | `to: '/admin/users/new',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 434 | `to: '/admin/coupons/new',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 441 | `to: '/admin/analytics',...` |
| `frontend\src\pages\admin\AdminDashboard.tsx` | 448 | `to: '/admin/settings',...` |
| `frontend\src\pages\admin\AdminSettings.tsx` | 293 | `navigate(`/admin/settings#${tab.id}`, { replace: true });...` |
| `frontend\src\pages\admin\CampaignManagement.tsx` | 205 | `{ label: 'Campaign Management', href: '/admin/campaigns' },...` |
| `frontend\src\pages\admin\SubscriptionManagement.tsx` | 517 | `<Link to={`/admin/subscriptions/${subscription.id}`}>...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 76 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 103 | `action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}...` |
| `frontend\src\pages\admin\users\UserDetailUnified.tsx` | 112 | `onClick={() => navigate('/admin/users')}...` |
| `frontend\src\pages\Admin.tsx` | 96 | `<Link to="/admin/model-tiers">...` |
| `frontend\src\pages\Admin.tsx` | 114 | `<Link to="/admin/pricing-configuration">...` |
| `frontend\src\pages\Admin.tsx` | 132 | `<Link to="/admin/pricing-simulation">...` |
| `frontend\src\pages\Admin.tsx` | 150 | `<Link to="/admin/vendor-price-monitoring">...` |
| `frontend\src\pages\Admin.tsx` | 168 | `<Link to="/admin/margin-tracking">...` |
| `frontend\src\services\api.ts` | 132 | `const isOAuthCallback = window.location.pathname.includes('/oauth/callback');...` |
| `frontend\src\services\api.ts` | 195 | `if (!window.location.pathname.includes('/oauth/callback') &&...` |
| `frontend\src\services\api.ts` | 208 | `if (!window.location.pathname.includes('/oauth/callback') &&...` |
| `frontend\src\services\api.ts` | 242 | `const response = await apiClient.post('/api/track-download', { os });...` |
| `frontend\src\services\api.ts` | 248 | `const response = await apiClient.post('/api/feedback', data);...` |
| `frontend\src\services\api.ts` | 254 | `const response = await apiClient.get('/api/version');...` |
| `frontend\src\services\api.ts` | 260 | `const response = await apiClient.get('/admin/metrics');...` |
| `frontend\src\utils\breadcrumbs.ts` | 63 | `'/admin/subscriptions': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 64 | `'/admin/billing': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 65 | `'/admin/credits': 'Subscriptions',...` |
| `frontend\src\utils\breadcrumbs.ts` | 67 | `'/admin/licenses': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 68 | `'/admin/licenses/devices': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 69 | `'/admin/licenses/prorations': 'Licenses',...` |
| `frontend\src\utils\breadcrumbs.ts` | 71 | `'/admin/coupons': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 72 | `'/admin/coupons/campaigns': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 73 | `'/admin/coupons/calendar': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 74 | `'/admin/coupons/analytics': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 75 | `'/admin/coupons/fraud': 'Coupons & Campaigns',...` |
| `frontend\src\utils\breadcrumbs.ts` | 77 | `'/admin/profitability/margins': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 78 | `'/admin/profitability/pricing': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 79 | `'/admin/profitability/simulator': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 80 | `'/admin/profitability/vendor-prices': 'Profitability',...` |
| `frontend\src\utils\breadcrumbs.ts` | 82 | `'/admin/analytics': 'Analytics',...` |
| `frontend\src\utils\breadcrumbs.ts` | 83 | `'/admin/analytics/revenue': 'Analytics',...` |
| `frontend\src\utils\breadcrumbs.ts` | 88 | `* @param pathname - Current pathname (e.g., '/admin/coupons/analytics')...` |
| `backend\coverage\lcov-report\prettify.js` | 2 | `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,els...` |
| `backend\coverage\prettify.js` | 2 | `window.PR_SHOULD_USE_CONTINUATION=true;(function(){var h=["break,continue,do,els...` |
| `backend\src\controllers\models.controller.ts` | 254 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\controllers\models.controller.ts` | 407 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\middleware\audit.middleware.ts` | 8 | `*   router.post('/admin/users/:id/ban',...` |
| `backend\src\middleware\auth.middleware.ts` | 439 | `*   app.get('/admin/models', authMiddleware, requireAdmin, handler);...` |
| `backend\src\middleware\credit.middleware.ts` | 8 | `*   app.post('/v1/completions', authMiddleware, checkCredits(), handler);...` |
| `backend\src\middleware\ip-whitelist.middleware.ts` | 29 | `* router.post('/admin/sensitive-action',...` |
| `backend\src\middleware\permission.middleware.ts` | 22 | `*   router.get('/admin/users', authMiddleware, requirePermission('users.view'), ...` |
| `backend\src\middleware\permission.middleware.ts` | 25 | `*   router.get('/admin/analytics', authMiddleware, requireAnyPermission(['analyt...` |
| `backend\src\middleware\permission.middleware.ts` | 28 | `*   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['us...` |
| `backend\src\middleware\permission.middleware.ts` | 55 | `* router.get('/admin/users', authMiddleware, requirePermission('users.view'), ha...` |
| `backend\src\middleware\permission.middleware.ts` | 159 | `* router.get('/admin/analytics',...` |
| `backend\src\middleware\permission.middleware.ts` | 275 | `* router.delete('/admin/users/:id',...` |
| `backend\src\middleware\require-mfa.middleware.ts` | 10 | `*   router.post('/admin/sensitive-operation',...` |
| `backend\src\middleware\typeValidation.middleware.ts` | 139 | `*   router.get('/users/:id',...` |
| `backend\src\middleware\typeValidation.middleware.ts` | 242 | `* router.patch('/users/:id',...` |
| `backend\src\routes\admin.routes.ts` | 88 | `'/users/:id/suspend',...` |
| `backend\src\routes\admin.routes.ts` | 124 | `'/webhooks/test',...` |
| `backend\src\routes\admin.routes.ts` | 146 | `'/analytics/dashboard-kpis',...` |
| `backend\src\routes\admin.routes.ts` | 166 | `'/analytics/recent-activity',...` |
| `backend\src\routes\admin.routes.ts` | 185 | `'/models/tiers',...` |
| `backend\src\routes\admin.routes.ts` | 202 | `'/models/tiers/audit-logs',...` |
| `backend\src\routes\admin.routes.ts` | 220 | `'/models/:modelId/tier',...` |
| `backend\src\routes\admin.routes.ts` | 233 | `'/models/tiers/bulk',...` |
| `backend\src\routes\admin.routes.ts` | 245 | `'/models/tiers/revert/:auditLogId',...` |
| `backend\src\routes\admin.routes.ts` | 257 | `'/models/providers',...` |
| `backend\src\routes\admin.routes.ts` | 295 | `'/audit-logs/resource/:resourceType/:resourceId',...` |
| `backend\src\routes\admin.routes.ts` | 310 | `'/audit-logs/admin/:adminUserId',...` |
| `backend\src\routes\admin.routes.ts` | 333 | `'/users/:id/overview',...` |
| `backend\src\routes\admin.routes.ts` | 355 | `'/users/:id/subscriptions',...` |
| `backend\src\routes\admin.routes.ts` | 378 | `'/users/:id/licenses',...` |
| `backend\src\routes\admin.routes.ts` | 403 | `'/users/:id/credits',...` |
| `backend\src\routes\admin.routes.ts` | 426 | `'/users/:id/coupons',...` |
| `backend\src\routes\admin.routes.ts` | 452 | `'/users/:id/payments',...` |
| `backend\src\routes\admin.routes.ts` | 475 | `'/users/:id/activity',...` |
| `backend\src\routes\admin.routes.ts` | 499 | `'/analytics/revenue/kpis',...` |
| `backend\src\routes\admin.routes.ts` | 517 | `'/analytics/revenue/mix',...` |
| `backend\src\routes\admin.routes.ts` | 538 | `'/analytics/revenue/trend',...` |
| `backend\src\routes\admin.routes.ts` | 556 | `'/analytics/revenue/conversion-funnel',...` |
| `backend\src\routes\admin.routes.ts` | 567 | `'/analytics/revenue/funnel',...` |
| `backend\src\routes\admin.routes.ts` | 584 | `'/analytics/revenue/credit-usage',...` |
| `backend\src\routes\admin.routes.ts` | 601 | `'/analytics/revenue/coupon-roi',...` |
| `backend\src\routes\admin.routes.ts` | 623 | `'/users/:id/role',...` |
| `backend\src\routes\admin.routes.ts` | 698 | `'/settings/:category',...` |
| `backend\src\routes\admin.routes.ts` | 717 | `'/settings/:category',...` |
| `backend\src\routes\admin.routes.ts` | 740 | `'/settings/test-email',...` |
| `backend\src\routes\admin.routes.ts` | 754 | `'/settings/clear-cache',...` |
| `backend\src\routes\admin.routes.ts` | 769 | `'/settings/run-backup',...` |
| `backend\src\routes\admin.routes.ts` | 791 | `'/billing/invoices',...` |
| `backend\src\routes\admin.routes.ts` | 809 | `'/billing/transactions',...` |
| `backend\src\routes\admin.routes.ts` | 822 | `'/billing/dunning',...` |
| `backend\src\routes\admin.routes.ts` | 847 | `'/pricing/margin-metrics',...` |
| `backend\src\routes\admin.routes.ts` | 864 | `'/pricing/margin-by-tier',...` |
| `backend\src\routes\admin.routes.ts` | 881 | `'/pricing/margin-by-provider',...` |
| `backend\src\routes\admin.routes.ts` | 899 | `'/pricing/top-models',...` |
| `backend\src\routes\admin.routes.ts` | 915 | `'/pricing/configs',...` |
| `backend\src\routes\admin.routes.ts` | 928 | `'/pricing/alerts',...` |
| `backend\src\routes\admin.routes.ts` | 944 | `'/pricing/vendor-prices',...` |
| `backend\src\routes\admin.routes.ts` | 971 | `'/pricing/simulate',...` |
| `backend\src\routes\api.routes.ts` | 102 | `'/user/profile',...` |
| `backend\src\routes\api.routes.ts` | 139 | `'/user/credits',...` |
| `backend\src\routes\index.ts` | 60 | `openapi_spec: '/api-docs/swagger.json',...` |
| `backend\src\routes\index.ts` | 64 | `ready: '/health/ready',...` |
| `backend\src\routes\index.ts` | 65 | `live: '/health/live',...` |
| `backend\src\routes\index.ts` | 68 | `register: '/auth/register',...` |
| `backend\src\routes\index.ts` | 69 | `verify_email: '/auth/verify-email',...` |
| `backend\src\routes\index.ts` | 70 | `forgot_password: '/auth/forgot-password',...` |
| `backend\src\routes\index.ts` | 71 | `reset_password: '/auth/reset-password',...` |
| `backend\src\routes\index.ts` | 72 | `mfa_setup: '/auth/mfa/setup',...` |
| `backend\src\routes\index.ts` | 73 | `mfa_verify_setup: '/auth/mfa/verify-setup',...` |
| `backend\src\routes\index.ts` | 74 | `mfa_verify_login: '/auth/mfa/verify-login',...` |
| `backend\src\routes\index.ts` | 75 | `mfa_disable: '/auth/mfa/disable',...` |
| `backend\src\routes\index.ts` | 76 | `mfa_backup_code_login: '/auth/mfa/backup-code-login',...` |
| `backend\src\routes\index.ts` | 77 | `mfa_status: '/auth/mfa/status',...` |
| `backend\src\routes\index.ts` | 80 | `discovery: '/.well-known/openid-configuration',...` |
| `backend\src\routes\index.ts` | 81 | `authorize: '/oauth/authorize',...` |
| `backend\src\routes\index.ts` | 82 | `token: '/oauth/token',...` |
| `backend\src\routes\index.ts` | 83 | `revoke: '/oauth/revoke',...` |
| `backend\src\routes\index.ts` | 84 | `userinfo: '/oauth/userinfo',...` |
| `backend\src\routes\index.ts` | 85 | `jwks: '/oauth/jwks',...` |
| `backend\src\routes\index.ts` | 86 | `google_authorize: '/oauth/google/authorize',...` |
| `backend\src\routes\index.ts` | 87 | `google_callback: '/oauth/google/callback',...` |
| `backend\src\routes\index.ts` | 90 | `models: '/v1/models',...` |
| `backend\src\routes\index.ts` | 91 | `completions: '/v1/completions',...` |
| `backend\src\routes\index.ts` | 92 | `chat: '/v1/chat/completions',...` |
| `backend\src\routes\index.ts` | 93 | `subscriptions: '/v1/subscriptions',...` |
| `backend\src\routes\index.ts` | 94 | `credits: '/v1/credits',...` |
| `backend\src\routes\index.ts` | 95 | `usage: '/v1/usage',...` |
| `backend\src\routes\index.ts` | 96 | `users: '/v1/users',...` |
| `backend\src\routes\index.ts` | 99 | `user_profile: '/api/user/profile',...` |
| `backend\src\routes\index.ts` | 100 | `detailed_credits: '/api/user/credits',...` |
| `backend\src\routes\index.ts` | 101 | `oauth_token_enhance: '/oauth/token/enhance',...` |
| `backend\src\routes\index.ts` | 102 | `licenses: '/api/licenses',...` |
| `backend\src\routes\index.ts` | 103 | `version_upgrades: '/api/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\index.ts` | 104 | `proration: '/api/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\index.ts` | 105 | `migrations: '/api/migrations',...` |
| `backend\src\routes\index.ts` | 108 | `metrics: '/admin/metrics',...` |
| `backend\src\routes\index.ts` | 109 | `users: '/admin/users',...` |
| `backend\src\routes\index.ts` | 110 | `subscriptions: '/admin/subscriptions',...` |
| `backend\src\routes\index.ts` | 111 | `usage: '/admin/usage',...` |
| `backend\src\routes\index.ts` | 112 | `licenses: '/admin/licenses',...` |
| `backend\src\routes\index.ts` | 113 | `prorations: '/admin/prorations',...` |
| `backend\src\routes\index.ts` | 114 | `upgrade_analytics: '/admin/analytics/upgrade-conversion',...` |
| `backend\src\routes\index.ts` | 117 | `downloads: '/api/track-download',...` |
| `backend\src\routes\index.ts` | 118 | `feedback: '/api/feedback',...` |
| `backend\src\routes\index.ts` | 119 | `diagnostics: '/api/diagnostics',...` |
| `backend\src\routes\index.ts` | 120 | `version: '/api/version',...` |
| `backend\src\routes\index.ts` | 173 | `router.get('/health/ready', async (_req: Request, res: Response) => {...` |
| `backend\src\routes\index.ts` | 212 | `router.get('/health/live', (_req: Request, res: Response) => {...` |
| `backend\src\routes\index.ts` | 252 | `router.use('/auth/mfa', createMFARouter());...` |
| `backend\src\routes\index.ts` | 269 | `'/webhooks/stripe',...` |
| `backend\src\routes\plan109.routes.ts` | 67 | `'/subscriptions/:id/upgrade',...` |
| `backend\src\routes\plan109.routes.ts` | 77 | `'/subscriptions/:id/downgrade',...` |
| `backend\src\routes\plan109.routes.ts` | 87 | `'/subscriptions/:id/cancel',...` |
| `backend\src\routes\plan109.routes.ts` | 97 | `'/subscriptions/:id/reactivate',...` |
| `backend\src\routes\plan109.routes.ts` | 107 | `'/subscriptions/:id/allocate-credits',...` |
| `backend\src\routes\plan109.routes.ts` | 117 | `'/subscriptions/:id/rollover',...` |
| `backend\src\routes\plan109.routes.ts` | 127 | `'/subscriptions/:userId/features',...` |
| `backend\src\routes\plan109.routes.ts` | 136 | `'/subscriptions/:userId/limits',...` |
| `backend\src\routes\plan109.routes.ts` | 145 | `'/subscriptions/user/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 154 | `'/subscriptions/all',...` |
| `backend\src\routes\plan109.routes.ts` | 163 | `'/subscriptions/stats',...` |
| `backend\src\routes\plan109.routes.ts` | 185 | `'/users/search',...` |
| `backend\src\routes\plan109.routes.ts` | 194 | `'/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 203 | `'/users/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 213 | `'/users/:id/suspend',...` |
| `backend\src\routes\plan109.routes.ts` | 223 | `'/users/:id/unsuspend',...` |
| `backend\src\routes\plan109.routes.ts` | 233 | `'/users/:id/ban',...` |
| `backend\src\routes\plan109.routes.ts` | 243 | `'/users/:id/unban',...` |
| `backend\src\routes\plan109.routes.ts` | 253 | `'/users/bulk-update',...` |
| `backend\src\routes\plan109.routes.ts` | 263 | `'/users/:id/adjust-credits',...` |
| `backend\src\routes\plan109.routes.ts` | 277 | `'/billing/payment-methods',...` |
| `backend\src\routes\plan109.routes.ts` | 287 | `'/billing/payment-methods/:id',...` |
| `backend\src\routes\plan109.routes.ts` | 297 | `'/billing/payment-methods/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 306 | `'/billing/invoices/:subscriptionId',...` |
| `backend\src\routes\plan109.routes.ts` | 316 | `'/billing/invoices/upcoming/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 325 | `'/billing/invoices/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 334 | `'/billing/transactions/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 343 | `'/billing/transactions/:id/refund',...` |
| `backend\src\routes\plan109.routes.ts` | 353 | `'/billing/dunning/:attemptId/retry',...` |
| `backend\src\routes\plan109.routes.ts` | 367 | `'/credits/allocate',...` |
| `backend\src\routes\plan109.routes.ts` | 377 | `'/credits/process-monthly',...` |
| `backend\src\routes\plan109.routes.ts` | 387 | `'/credits/grant-bonus',...` |
| `backend\src\routes\plan109.routes.ts` | 397 | `'/credits/deduct',...` |
| `backend\src\routes\plan109.routes.ts` | 407 | `'/credits/rollover/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 416 | `'/credits/rollover/:userId/apply',...` |
| `backend\src\routes\plan109.routes.ts` | 426 | `'/credits/sync/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 436 | `'/credits/reconcile/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 445 | `'/credits/balance/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 454 | `'/credits/history/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 463 | `'/credits/usage/:userId',...` |
| `backend\src\routes\plan109.routes.ts` | 476 | `'/analytics/revenue',...` |
| `backend\src\routes\plan109.routes.ts` | 485 | `'/analytics/revenue/mrr',...` |
| `backend\src\routes\plan109.routes.ts` | 494 | `'/analytics/revenue/arr',...` |
| `backend\src\routes\plan109.routes.ts` | 503 | `'/analytics/revenue/by-tier',...` |
| `backend\src\routes\plan109.routes.ts` | 512 | `'/analytics/users/total',...` |
| `backend\src\routes\plan109.routes.ts` | 521 | `'/analytics/users/by-tier',...` |
| `backend\src\routes\plan109.routes.ts` | 530 | `'/analytics/churn-rate',...` |
| `backend\src\routes\plan109.routes.ts` | 539 | `'/analytics/credit-utilization',...` |
| `backend\src\routes\plan109.routes.ts` | 548 | `'/analytics/conversion-rate',...` |
| `backend\src\routes\plan109.routes.ts` | 557 | `'/analytics/dashboard',...` |
| `backend\src\routes\plan110.routes.ts` | 54 | `'/licenses/purchase',...` |
| `backend\src\routes\plan110.routes.ts` | 65 | `'/licenses/activate',...` |
| `backend\src\routes\plan110.routes.ts` | 75 | `'/licenses/activations/:id',...` |
| `backend\src\routes\plan110.routes.ts` | 86 | `'/licenses/activations/:id/replace',...` |
| `backend\src\routes\plan110.routes.ts` | 97 | `'/licenses/:licenseKey',...` |
| `backend\src\routes\plan110.routes.ts` | 107 | `'/licenses/:licenseKey/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 121 | `'/licenses/:licenseKey/version-eligibility/:version',...` |
| `backend\src\routes\plan110.routes.ts` | 131 | `'/licenses/:licenseKey/upgrade',...` |
| `backend\src\routes\plan110.routes.ts` | 142 | `'/licenses/:licenseKey/available-upgrades',...` |
| `backend\src\routes\plan110.routes.ts` | 152 | `'/licenses/:licenseKey/upgrade-history',...` |
| `backend\src\routes\plan110.routes.ts` | 166 | `'/subscriptions/:id/proration-preview',...` |
| `backend\src\routes\plan110.routes.ts` | 177 | `'/subscriptions/:id/upgrade-with-proration',...` |
| `backend\src\routes\plan110.routes.ts` | 188 | `'/subscriptions/:id/downgrade-with-proration',...` |
| `backend\src\routes\plan110.routes.ts` | 199 | `'/subscriptions/:id/proration-history',...` |
| `backend\src\routes\plan110.routes.ts` | 214 | `'/migrations/perpetual-to-subscription',...` |
| `backend\src\routes\plan110.routes.ts` | 225 | `'/migrations/subscription-to-perpetual',...` |
| `backend\src\routes\plan110.routes.ts` | 236 | `'/migrations/trade-in-value/:licenseId',...` |
| `backend\src\routes\plan110.routes.ts` | 247 | `'/migrations/eligibility',...` |
| `backend\src\routes\plan110.routes.ts` | 258 | `'/migrations/history',...` |
| `backend\src\routes\plan110.routes.ts` | 273 | `'/admin/licenses/:id/suspend',...` |
| `backend\src\routes\plan110.routes.ts` | 286 | `'/admin/licenses/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 299 | `'/admin/licenses',...` |
| `backend\src\routes\plan110.routes.ts` | 311 | `'/admin/licenses/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 327 | `'/admin/licenses/devices',...` |
| `backend\src\routes\plan110.routes.ts` | 338 | `'/admin/licenses/devices/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 349 | `'/admin/licenses/devices/:id/deactivate',...` |
| `backend\src\routes\plan110.routes.ts` | 361 | `'/admin/licenses/devices/:id/revoke',...` |
| `backend\src\routes\plan110.routes.ts` | 373 | `'/admin/licenses/devices/bulk-action',...` |
| `backend\src\routes\plan110.routes.ts` | 390 | `'/admin/prorations',...` |
| `backend\src\routes\plan110.routes.ts` | 402 | `'/admin/prorations/stats',...` |
| `backend\src\routes\plan110.routes.ts` | 414 | `'/admin/prorations/:id/reverse',...` |
| `backend\src\routes\plan110.routes.ts` | 427 | `'/admin/prorations/:id/calculation',...` |
| `backend\src\routes\plan110.routes.ts` | 443 | `'/admin/analytics/upgrade-conversion',...` |
| `backend\src\routes\plan111.routes.ts` | 57 | `'/api/coupons/validate',...` |
| `backend\src\routes\plan111.routes.ts` | 66 | `'/api/coupons/redeem',...` |
| `backend\src\routes\plan111.routes.ts` | 76 | `'/api/users/:userId/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 88 | `'/admin/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 100 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 112 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 124 | `'/admin/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 135 | `'/admin/coupons/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 146 | `'/admin/coupons/:id/redemptions',...` |
| `backend\src\routes\plan111.routes.ts` | 159 | `'/admin/campaigns',...` |
| `backend\src\routes\plan111.routes.ts` | 171 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 183 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 195 | `'/admin/campaigns',...` |
| `backend\src\routes\plan111.routes.ts` | 206 | `'/admin/campaigns/:id',...` |
| `backend\src\routes\plan111.routes.ts` | 217 | `'/admin/campaigns/:id/performance',...` |
| `backend\src\routes\plan111.routes.ts` | 228 | `'/admin/campaigns/:id/assign-coupon',...` |
| `backend\src\routes\plan111.routes.ts` | 240 | `'/admin/campaigns/:id/remove-coupon/:couponId',...` |
| `backend\src\routes\plan111.routes.ts` | 254 | `'/admin/fraud-detection',...` |
| `backend\src\routes\plan111.routes.ts` | 265 | `'/admin/fraud-detection/:id/review',...` |
| `backend\src\routes\plan111.routes.ts` | 277 | `'/admin/fraud-detection/pending',...` |
| `backend\src\routes\plan111.routes.ts` | 294 | `'/admin/analytics/coupons',...` |
| `backend\src\routes\plan111.routes.ts` | 310 | `'/admin/analytics/coupons/trend',...` |
| `backend\src\routes\plan111.routes.ts` | 325 | `'/admin/analytics/coupons/top',...` |
| `backend\src\routes\plan111.routes.ts` | 337 | `'/admin/analytics/coupons/by-type',...` |
| `backend\src\routes\social-auth.routes.ts` | 65 | `'/oauth/google/authorize',...` |
| `backend\src\routes\social-auth.routes.ts` | 110 | `'/oauth/google/callback',...` |
| `backend\src\routes\v1.routes.ts` | 56 | `'/users/me',...` |
| `backend\src\routes\v1.routes.ts` | 68 | `'/users/me',...` |
| `backend\src\routes\v1.routes.ts` | 80 | `'/users/me/preferences',...` |
| `backend\src\routes\v1.routes.ts` | 92 | `'/users/me/preferences',...` |
| `backend\src\routes\v1.routes.ts` | 104 | `'/users/me/preferences/model',...` |
| `backend\src\routes\v1.routes.ts` | 116 | `'/users/me/preferences/model',...` |
| `backend\src\routes\v1.routes.ts` | 144 | `'/models/:modelId',...` |
| `backend\src\routes\v1.routes.ts` | 173 | `'/chat/completions',...` |
| `backend\src\routes\v1.routes.ts` | 200 | `'/subscriptions/me',...` |
| `backend\src\routes\v1.routes.ts` | 222 | `'/subscriptions/me',...` |
| `backend\src\routes\v1.routes.ts` | 233 | `'/subscriptions/me/cancel',...` |
| `backend\src\routes\v1.routes.ts` | 248 | `'/credits/me',...` |
| `backend\src\routes\v1.routes.ts` | 272 | `'/usage/stats',...` |
| `backend\src\routes\v1.routes.ts` | 300 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 311 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 322 | `'/webhooks/config',...` |
| `backend\src\routes\v1.routes.ts` | 333 | `'/webhooks/test',...` |
| `backend\src\services\model.service.ts` | 264 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\src\services\token-introspection.service.ts` | 126 | `const response = await fetch(`${this.identityProviderUrl}/oauth/jwks`);...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 74 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 88 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 104 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 126 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 146 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 167 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 191 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 206 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 227 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 237 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 247 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 257 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 282 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 291 | `endpoint: '/admin/subscriptions/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 300 | `endpoint: '/admin/coupons/456',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 309 | `endpoint: '/admin/licenses',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 392 | `endpoint: '/admin/test',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 433 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 443 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 453 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 463 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 512 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 524 | `endpoint: '/admin/coupons/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 583 | `endpoint: '/admin/coupons/123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 633 | `endpoint: '/admin/users',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 644 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 656 | `endpoint: '/admin/users/user-123',...` |
| `backend\src\services\__tests__\audit-log.service.test.ts` | 682 | `endpoint: '/admin/users/user-123', // WHERE (endpoint)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 112 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 131 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 164 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 209 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 220 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 240 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 266 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 285 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 355 | `.patch(`/admin/users/${adminUser.id}/role`)...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 377 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 391 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 403 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 474 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 484 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 510 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 517 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 578 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 596 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 610 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\complete-flow.test.ts` | 641 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 93 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 105 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 123 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 138 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 147 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 159 | `.get('/api/user/credits');...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 170 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 182 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\credits-api.test.ts` | 235 | `.get('/api/user/credits')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 100 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 127 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 155 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 245 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 255 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 304 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 328 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 352 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 370 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 383 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 395 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 409 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 425 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 453 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 485 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 593 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\cross-phase-integration.test.ts` | 667 | `.patch(`/admin/users/${testAdmin.id}/role`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 146 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 169 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 187 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 196 | `.get('/admin/users')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 277 | `request(app).get('/admin/users').set('Authorization', `Bearer ${adminToken}`)...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 346 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 358 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 373 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 393 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 407 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 424 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 447 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 476 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\error-scenarios.test.ts` | 652 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 76 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 109 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 124 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 133 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 150 | `.post('/auth/mfa/setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 166 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 188 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 214 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 231 | `.post('/auth/mfa/verify-setup')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 274 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 287 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 308 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 337 | `.post('/auth/mfa/verify-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 384 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 405 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 418 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 427 | `.post('/auth/mfa/backup-code-login')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 467 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 495 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 514 | `.post('/auth/mfa/disable')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 552 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 572 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\mfa-flow.test.ts` | 582 | `.get('/auth/mfa/status')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 196 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 228 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 244 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 262 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 276 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 290 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 300 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\oauth-enhanced.test.ts` | 311 | `.post('/oauth/token')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 93 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 108 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 119 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 136 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 151 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 202 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 218 | `.get('/api/user/profile');...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 228 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 245 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 259 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 318 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\integration\user-profile-api.test.ts` | 373 | `.get('/api/user/profile')...` |
| `backend\src\__tests__\unit\model.service.tier.test.ts` | 435 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\test-oauth-flow.js` | 35 | `path: '/oauth/jwks',...` |
| `backend\tests\e2e\complete-flow.test.ts` | 30 | `.post('/oauth/register')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 46 | `.post('/oauth/token')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 67 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 78 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 89 | `.get('/v1/models')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 100 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 111 | `.post('/v1/subscriptions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 127 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 146 | `.post('/v1/chat/completions')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 167 | `.get('/v1/credits/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 179 | `.get('/v1/usage')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 192 | `.get('/v1/usage/stats')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 202 | `.patch('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 216 | `.post('/oauth/token')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 232 | `.get('/v1/users/me')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 239 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\e2e\complete-flow.test.ts` | 253 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\helpers\mocks.ts` | 38 | `.post('/v1/chat/completions')...` |
| `backend\tests\helpers\mocks.ts` | 73 | `.post('/v1/messages')...` |
| `backend\tests\helpers\mocks.ts` | 119 | `.post('/v1/customers')...` |
| `backend\tests\helpers\mocks.ts` | 133 | `.post('/v1/subscriptions')...` |
| `backend\tests\helpers\mocks.ts` | 159 | `.delete(`/v1/subscriptions/${subscriptionId}`)...` |
| `backend\tests\integration\auth.integration.test.ts` | 49 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 77 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 95 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 107 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 116 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 125 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 134 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 148 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 167 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 193 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 207 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 221 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 233 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 249 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 272 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 288 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 305 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 321 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 340 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 368 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 383 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 398 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 414 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 435 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 456 | `.post('/auth/register')...` |
| `backend\tests\integration\auth.integration.test.ts` | 472 | `.post('/auth/verify-email')...` |
| `backend\tests\integration\auth.integration.test.ts` | 491 | `.post('/auth/forgot-password')...` |
| `backend\tests\integration\auth.integration.test.ts` | 503 | `.post('/auth/reset-password')...` |
| `backend\tests\integration\credits.test.ts` | 52 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 70 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 77 | `.get('/v1/credits/me')...` |
| `backend\tests\integration\credits.test.ts` | 101 | `.get('/v1/usage?limit=5&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 120 | `.get('/v1/usage?model_id=gpt-5')...` |
| `backend\tests\integration\credits.test.ts` | 132 | `.get('/v1/usage?operation=chat')...` |
| `backend\tests\integration\credits.test.ts` | 146 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\credits.test.ts` | 158 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 168 | `.get('/v1/usage?limit=101')...` |
| `backend\tests\integration\credits.test.ts` | 175 | `.get('/v1/usage?offset=-1')...` |
| `backend\tests\integration\credits.test.ts` | 182 | `.get('/v1/usage')...` |
| `backend\tests\integration\credits.test.ts` | 194 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 209 | `.get('/v1/usage/stats?group_by=hour')...` |
| `backend\tests\integration\credits.test.ts` | 222 | `.get('/v1/usage/stats?group_by=model')...` |
| `backend\tests\integration\credits.test.ts` | 241 | `.get(`/v1/usage/stats?group_by=day&start_date=${startDate.toISOString()}&end_dat...` |
| `backend\tests\integration\credits.test.ts` | 250 | `.get('/v1/usage/stats?group_by=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 257 | `.get('/v1/usage/stats?group_by=day')...` |
| `backend\tests\integration\credits.test.ts` | 269 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 289 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 304 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 314 | `.get('/v1/rate-limit')...` |
| `backend\tests\integration\credits.test.ts` | 326 | `.get('/v1/usage?limit=10&offset=1000')...` |
| `backend\tests\integration\credits.test.ts` | 336 | `.get('/v1/usage?limit=1&offset=0')...` |
| `backend\tests\integration\credits.test.ts` | 346 | `.get('/v1/usage?limit=100')...` |
| `backend\tests\integration\credits.test.ts` | 361 | `.get('/v1/usage?start_date=invalid')...` |
| `backend\tests\integration\credits.test.ts` | 368 | `.get('/v1/usage?end_date=not-a-date')...` |
| `backend\tests\integration\credits.test.ts` | 378 | `.get(`/v1/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOSt...` |
| `backend\tests\integration\model-tier-access.test.ts` | 96 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 130 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 153 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 169 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 178 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 190 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 201 | `upgrade_url: '/subscriptions/upgrade',...` |
| `backend\tests\integration\model-tier-access.test.ts` | 207 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 218 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 225 | `.get('/v1/models/gemini-2.0-pro')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 246 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 267 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 284 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 298 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 317 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 333 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 347 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 357 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 380 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 398 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 411 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 424 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 437 | `.post('/v1/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 453 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 484 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 505 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-access.test.ts` | 522 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 64 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 90 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 125 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 151 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 181 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 199 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 211 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 248 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 280 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 306 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 337 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 372 | `.get('/v1/models')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 401 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 443 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 466 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 496 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 519 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\model-tier-edge-cases.test.ts` | 550 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 37 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 62 | `.get('/v1/models?provider=openai')...` |
| `backend\tests\integration\models.test.ts` | 74 | `.get('/v1/models?capability=vision')...` |
| `backend\tests\integration\models.test.ts` | 85 | `await request(app).get('/v1/models').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 90 | `.get('/v1/models')...` |
| `backend\tests\integration\models.test.ts` | 99 | `.get('/v1/models/gpt-5')...` |
| `backend\tests\integration\models.test.ts` | 120 | `.get('/v1/models/non-existent-model')...` |
| `backend\tests\integration\models.test.ts` | 126 | `await request(app).get('/v1/models/gpt-5').expect(401);...` |
| `backend\tests\integration\models.test.ts` | 139 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 170 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 180 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 191 | `.post('/v1/completions')...` |
| `backend\tests\integration\models.test.ts` | 210 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 247 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 257 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 268 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\models.test.ts` | 288 | `request(app).get('/v1/models').set('Authorization', `Bearer ${authToken}`)...` |
| `backend\tests\integration\models.test.ts` | 300 | `.get('/v1/models')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 313 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 329 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 342 | `//   .post('/admin/coupons')...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 388 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 408 | `expect(logs[0].endpoint).toBe('/admin/subscriptions');...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 425 | `endpoint: '/admin/subscriptions/sub-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 453 | `endpoint: '/admin/coupons/coupon-123',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 478 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 505 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 516 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 527 | `endpoint: `/admin/subscriptions/${resourceId}`,...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 572 | `endpoint: '/admin/subscriptions',...` |
| `backend\tests\integration\p0-critical-fixes.integration.test.ts` | 605 | `endpoint: `/admin/subscriptions/${subscription.id}`,...` |
| `backend\tests\integration\settings-api.test.ts` | 70 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 86 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 92 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 99 | `.get('/admin/settings')...` |
| `backend\tests\integration\settings-api.test.ts` | 113 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 125 | `.get('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 135 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 141 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 156 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 176 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 208 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 227 | `.put('/admin/settings/integrations')...` |
| `backend\tests\integration\settings-api.test.ts` | 259 | `.put('/admin/settings/feature_flags')...` |
| `backend\tests\integration\settings-api.test.ts` | 277 | `.put('/admin/settings/system')...` |
| `backend\tests\integration\settings-api.test.ts` | 289 | `.put('/admin/settings/invalid_category')...` |
| `backend\tests\integration\settings-api.test.ts` | 300 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 312 | `.put('/admin/settings/email')...` |
| `backend\tests\integration\settings-api.test.ts` | 323 | `.put('/admin/settings/security')...` |
| `backend\tests\integration\settings-api.test.ts` | 334 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 341 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 359 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 374 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 385 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 392 | `.post('/admin/settings/test-email')...` |
| `backend\tests\integration\settings-api.test.ts` | 402 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 412 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 418 | `.post('/admin/settings/clear-cache')...` |
| `backend\tests\integration\settings-api.test.ts` | 427 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 451 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 457 | `.post('/admin/settings/run-backup')...` |
| `backend\tests\integration\settings-api.test.ts` | 467 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 474 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 484 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 491 | `.put('/admin/settings/general')...` |
| `backend\tests\integration\settings-api.test.ts` | 498 | `.get('/admin/settings/general')...` |
| `backend\tests\integration\subscriptions.test.ts` | 63 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 75 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 91 | `.get('/v1/subscription-plans')...` |
| `backend\tests\integration\subscriptions.test.ts` | 108 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 125 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 132 | `.get('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 147 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 172 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 194 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 208 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 222 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 236 | `.post('/v1/subscriptions')...` |
| `backend\tests\integration\subscriptions.test.ts` | 259 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 279 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 295 | `.patch('/v1/subscriptions/me')...` |
| `backend\tests\integration\subscriptions.test.ts` | 317 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 340 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\subscriptions.test.ts` | 355 | `.post('/v1/subscriptions/me/cancel')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 120 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 135 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 149 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 169 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 186 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 201 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 215 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 230 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 243 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 261 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 276 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 288 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 303 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 315 | `.post('/v1/messages')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 326 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 341 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 360 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 375 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 389 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 405 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 421 | `.post('/v1/messages')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 432 | `.post('/v1/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 447 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 476 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 492 | `.post('/v1/chat/completions')...` |
| `backend\tests\integration\tier-enforcement-inference.test.ts` | 502 | `.post('/v1/completions')...` |
| `backend\tests\integration\users.test.ts` | 45 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 63 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 69 | `.get('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 82 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 97 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 114 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 124 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 134 | `.patch('/v1/users/me')...` |
| `backend\tests\integration\users.test.ts` | 153 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 169 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 182 | `.get('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 194 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 208 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 220 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 230 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 240 | `.patch('/v1/users/me/preferences')...` |
| `backend\tests\integration\users.test.ts` | 268 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 281 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 303 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 313 | `.post('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 333 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 346 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\integration\users.test.ts` | 356 | `.get('/v1/users/me/preferences/model')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 182 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 228 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 279 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 320 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 399 | `.post('/v1/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 418 | `.post('/v1/messages')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 452 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 540 | `.post('/v1/chat/completions')...` |
| `backend\tests\unit\services\llm.service.test.ts` | 651 | `.post('/v1/completions')...` |
| `identity-provider\src\app.ts` | 57 | `app.get('/interaction/:uid', authController.interaction);...` |
| `identity-provider\src\app.ts` | 58 | `app.post('/interaction/:uid/login', authController.login);...` |
| `identity-provider\src\app.ts` | 59 | `app.post('/interaction/:uid/consent', authController.consent);...` |
| `identity-provider\src\app.ts` | 60 | `app.get('/interaction/:uid/abort', authController.abort);...` |
| `identity-provider\src\app.ts` | 61 | `app.get('/interaction/:uid/data', authController.getInteractionData);...` |
| `identity-provider\src\config\oidc.ts` | 388 | `authorization: '/oauth/authorize',...` |
| `identity-provider\src\config\oidc.ts` | 389 | `token: '/oauth/token',...` |
| `identity-provider\src\config\oidc.ts` | 390 | `userinfo: '/oauth/userinfo',...` |
| `identity-provider\src\config\oidc.ts` | 391 | `introspection: '/oauth/introspect',...` |
| `identity-provider\src\config\oidc.ts` | 392 | `revocation: '/oauth/revoke',...` |
| `identity-provider\src\config\oidc.ts` | 393 | `jwks: '/oauth/jwks',...` |

---

### GET Endpoints (14)

#### `GET /health`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 48

**Usages:** None found

---

#### `GET /interaction/:uid`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 57

**Usages:** None found

---

#### `GET /interaction/:uid/abort`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 60

**Usages:** None found

---

#### `GET /interaction/:uid/data`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 61

**Usages:** None found

---

#### `GET /logout`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 64

**Usages:** None found

---

#### `GET /health`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 48

**Usages:** None found

---

#### `GET /interaction/:uid`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 57

**Usages:** None found

---

#### `GET /interaction/:uid/abort`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 60

**Usages:** None found

---

#### `GET /interaction/:uid/data`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 61

**Usages:** None found

---

#### `GET /logout`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 64

**Usages:** None found

---

#### `GET /.well-known/openid-configuration`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages:** None found

---

#### `GET /oauth/authorize`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages:** None found

---

#### `GET /oauth/userinfo`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages:** None found

---

#### `GET /oauth/jwks`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages (1):**

| File | Line | Context |
|------|------|----------|
| `backend\src\services\token-introspection.service.ts` | 126 | `const response = await fetch(`${this.identityProviderUrl}/oauth/jwks`);...` |

---

### POST Endpoints (7)

#### `POST /interaction/:uid/login`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 58

**Usages:** None found

---

#### `POST /interaction/:uid/consent`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 59

**Usages:** None found

---

#### `POST /interaction/:uid/login`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 58

**Usages:** None found

---

#### `POST /interaction/:uid/consent`

**Definition:**
- **File:** `identity-provider\src\app.ts`
- **Line:** 59

**Usages:** None found

---

#### `POST /oauth/token`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages:** None found

---

#### `POST /oauth/introspect`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages:** None found

---

#### `POST /oauth/revoke`

**Definition:**
- **File:** `identity-provider (OIDC Provider)`
- **Line:** 0

**Usages:** None found

---

## Summary Statistics

### Backend API

- **Total Endpoints:** 206
- **Endpoints with Usages:** 138
- **Total Usage References:** 1972
- **Unused Endpoints:** 68

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 22
- **Endpoints with Usages:** 2
- **Total Usage References:** 868
- **Unused Endpoints:** 20

