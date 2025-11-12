# API Endpoints Analysis Report (Simple Format)

**Generated:** 2025-11-12T21:43:52.672Z
**Format:** Simple
**Include Tests:** No

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 3

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/metrics` | `backend\src\routes\admin.routes.ts L:63` | `adminController.getMetrics` | - | - | `-` | frontend\src\services\api.ts L:260<br>backend\coverage\lcov-report\src\routes\index.ts.html L:610<br>backend\coverage\src\routes\index.ts.html L:610<br>backend\src\routes\index.ts L:108 |
| GET | `/users` | `backend\src\routes\admin.routes.ts L:75` | `adminController.listUsers` | - | - | `-` | frontend\src\api\admin.ts L:236<br>frontend\src\api\admin.ts L:251<br>frontend\src\api\admin.ts L:267<br>frontend\src\api\admin.ts L:283<br>frontend\src\api\admin.ts L:299<br>frontend\src\api\admin.ts L:315<br>frontend\src\api\admin.ts L:331<br>frontend\src\api\plan109.ts L:158<br>frontend\src\api\plan109.ts L:169<br>frontend\src\api\plan109.ts L:180<br>frontend\src\api\plan109.ts L:190<br>frontend\src\api\plan109.ts L:201<br>frontend\src\api\plan109.ts L:212<br>frontend\src\api\plan109.ts L:222<br>frontend\src\api\plan109.ts L:233<br>frontend\src\api\plan109.ts L:243<br>frontend\src\api\plan109.ts L:254<br>frontend\src\api\plan109.ts L:479<br>frontend\src\api\plan109.ts L:489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:53<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:76<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:103<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:112<br>backend\coverage\lcov-report\src\routes\index.ts.html L:603<br>backend\coverage\lcov-report\src\routes\index.ts.html L:611<br>backend\coverage\src\routes\index.ts.html L:603<br>backend\coverage\src\routes\index.ts.html L:611<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:22<br>backend\src\middleware\permission.middleware.ts L:28<br>backend\src\middleware\permission.middleware.ts L:55<br>backend\src\middleware\permission.middleware.ts L:275<br>backend\src\routes\index.ts L:96<br>backend\src\routes\index.ts L:109<br>backend\src\routes\plan109.routes.ts L:512<br>backend\src\routes\plan109.routes.ts L:521<br>backend\src\routes\plan111.routes.ts L:76 |
| POST | `/users/:id/suspend` | `backend\src\routes\admin.routes.ts L:87` | `adminController.suspendUser` | - | - | `-` | frontend\src\api\plan109.ts L:201 |

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

- **Total Endpoints:** 3
- **Endpoints with Usages:** 3
- **Total Usage References:** 44
- **Unused Endpoints:** 0

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 14
- **Endpoints with Usages:** 6
- **Total Usage References:** 13
- **Unused Endpoints:** 8

