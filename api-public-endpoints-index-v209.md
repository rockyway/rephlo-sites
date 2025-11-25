# API Endpoints Analysis Report (Simple Format)

**Generated:** 2025-11-25T06:01:11.864Z
**Format:** Simple
**Include Tests:** No
**Exclude Admin Routes:** Yes

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 79

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/api-docs/` | `backend\src\routes\swagger.routes.ts L:66` | `-` | - | - | `-` | - |
| GET | `/api-docs/swagger.json` | `backend\src\routes\swagger.routes.ts L:69` | `-` | - | - | `-` | - |
| POST | `/api/coupons/redeem` | `backend\src\routes\plan111.routes.ts L:65` | `couponController.redeemCoupon` | `CouponRedemption` | `401: unauthorized`<br>`404: coupon_not_found`<br>`400: redemption_failed` | `authMiddleware` | - |
| POST | `/api/coupons/validate` | `backend\src\routes\plan111.routes.ts L:56` | `couponController.validateCoupon` | `ValidationResult` | `500: validation_error` | `-` | - |
| POST | `/api/diagnostics` | `backend\src\routes\branding.routes.ts L:159` | `brandingController.uploadDiagnostic` | `brandingController_uploadDiagnostic_Response` | `400: VALIDATION_ERROR`<br>`500: INTERNAL_SERVER_ERROR` | `-` | - |
| POST | `/api/feedback` | `backend\src\routes\branding.routes.ts L:100` | `brandingController.submitFeedback` | `brandingController_submitFeedback_Response` | `400: VALIDATION_ERROR`<br>`500: INTERNAL_SERVER_ERROR` | `-` | frontend\src\services\api.ts L:264 |
| GET | `/api/licenses/:licenseKey` | `backend\src\routes\plan110.routes.ts L:107` | `licenseController.getLicenseDetails` | `licenseController_getLicenseDetails_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| GET | `/api/licenses/:licenseKey/available-upgrades` | `backend\src\routes\plan110.routes.ts L:152` | `upgradeController.getAvailableUpgrades` | `upgradeController_getAvailableUpgrades_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| GET | `/api/licenses/:licenseKey/devices` | `backend\src\routes\plan110.routes.ts L:117` | `licenseController.getActiveDevices` | `licenseController_getActiveDevices_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| POST | `/api/licenses/:licenseKey/upgrade` | `backend\src\routes\plan110.routes.ts L:141` | `upgradeController.purchaseUpgrade` | `upgradeController_purchaseUpgrade_Response` | `400: validation_error`<br>`404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/licenses/:licenseKey/upgrade-history` | `backend\src\routes\plan110.routes.ts L:162` | `upgradeController.getUpgradeHistory` | `upgradeController_getUpgradeHistory_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| GET | `/api/licenses/:licenseKey/version-eligibility/:version` | `backend\src\routes\plan110.routes.ts L:131` | `upgradeController.checkVersionEligibility` | `upgradeController_checkVersionEligibility_Response` | `404: license_not_found`<br>`400: invalid_version`<br>`500: internal_server_error` | `-` | - |
| POST | `/api/licenses/activate` | `backend\src\routes\plan110.routes.ts L:64` | `licenseController.activateDevice` | `LicenseActivationResult` | `400: validation_error`<br>`404: license_not_found`<br>`403: activation_limit_reached`<br>`500: internal_server_error` | `-` | - |
| DELETE | `/api/licenses/activations/:id` | `backend\src\routes\plan110.routes.ts L:74` | `licenseController.deactivateDevice` | `{ message: 'Device deactivated successfully', }` | `404: activation_not_found`<br>`400: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| PATCH | `/api/licenses/activations/:id/replace` | `backend\src\routes\plan110.routes.ts L:85` | `licenseController.replaceDevice` | `LicenseActivation` | `400: validation_error`<br>`404: activation_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/licenses/me` | `backend\src\routes\plan110.routes.ts L:96` | `licenseController.getMyLicense` | `{ success: true, data: T }` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/licenses/purchase` | `backend\src\routes\plan110.routes.ts L:53` | `licenseController.purchaseLicense` | `PerpetualLicense` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/migrations/eligibility` | `backend\src\routes\plan110.routes.ts L:257` | `migrationController.checkMigrationEligibility` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/migrations/history` | `backend\src\routes\plan110.routes.ts L:268` | `migrationController.getMigrationHistory` | `GetMigrationHistory_Response` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/migrations/perpetual-to-subscription` | `backend\src\routes\plan110.routes.ts L:224` | `migrationController.migratePerpetualToSubscription` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`400: migration_not_allowed`<br>`404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/migrations/subscription-to-perpetual` | `backend\src\routes\plan110.routes.ts L:235` | `migrationController.migrateSubscriptionToPerpetual` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`400: migration_not_allowed`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/migrations/trade-in-value/:licenseId` | `backend\src\routes\plan110.routes.ts L:246` | `migrationController.getTradeInValue` | `migrationController_getTradeInValue_Response` | `404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/subscriptions/:id/downgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:198` | `prorationController.downgradeWithProration` | `ProrationEvent` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/subscriptions/:id/proration-history` | `backend\src\routes\plan110.routes.ts L:209` | `prorationController.getProrationHistory` | `ProrationEvent[]` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/subscriptions/:id/proration-preview` | `backend\src\routes\plan110.routes.ts L:176` | `prorationController.previewProration` | `ProrationPreview` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/subscriptions/:id/upgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:187` | `prorationController.upgradeWithProration` | `ProrationEvent` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/track-download` | `backend\src\routes\branding.routes.ts L:68` | `brandingController.trackDownload` | `brandingController_trackDownload_Response` | `400: VALIDATION_ERROR`<br>`500: INTERNAL_SERVER_ERROR` | `-` | frontend\src\services\api.ts L:258 |
| GET | `/api/user/credits` | `backend\src\routes\api.routes.ts L:157` | `creditsController.getDetailedCredits` | `any` | - | `authMiddleware` | - |
| GET | `/api/user/invoices` | `backend\src\routes\api.routes.ts L:197` | `billingController.getInvoices` | `GetInvoices_Response` | - | `authMiddleware` | - |
| GET | `/api/user/profile` | `backend\src\routes\api.routes.ts L:106` | `usersController.getUserProfile` | - | - | `authMiddleware` | - |
| GET | `/api/user/usage/summary` | `backend\src\routes\api.routes.ts L:252` | `usageController.getMonthlySummary` | `UsageSummaryResponse` | - | `authMiddleware` | - |
| GET | `/api/users/:userId/coupons` | `backend\src\routes\plan111.routes.ts L:75` | `couponController.getUserCoupons` | `CouponRedemption[]` | `403: forbidden`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/version` | `backend\src\routes\branding.routes.ts L:128` | `brandingController.getLatestVersion` | `brandingController_getLatestVersion_Response` | `404: NOT_FOUND`<br>`500: INTERNAL_SERVER_ERROR` | `-` | frontend\src\services\api.ts L:270 |
| POST | `/auth/forgot-password` | `backend\src\routes\auth.routes.ts L:148` | `authManagementController.forgotPassword` | `authManagementController_forgotPassword_Response` | - | `-` | - |
| POST | `/auth/mfa/backup-code-login` | `backend\src\routes\mfa.routes.ts L:423` | `-` | - | - | `-` | - |
| POST | `/auth/mfa/disable` | `backend\src\routes\mfa.routes.ts L:300` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/auth/mfa/setup` | `backend\src\routes\mfa.routes.ts L:50` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/auth/mfa/status` | `backend\src\routes\mfa.routes.ts L:556` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/auth/mfa/verify-login` | `backend\src\routes\mfa.routes.ts L:209` | `-` | - | - | `-` | - |
| POST | `/auth/mfa/verify-setup` | `backend\src\routes\mfa.routes.ts L:110` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/auth/register` | `backend\src\routes\auth.routes.ts L:81` | `authManagementController.register` | `authManagementController_register_Response` | - | `-` | - |
| POST | `/auth/reset-password` | `backend\src\routes\auth.routes.ts L:182` | `authManagementController.resetPassword` | `authManagementController_resetPassword_Response` | - | `-` | - |
| POST | `/auth/verify-email` | `backend\src\routes\auth.routes.ts L:114` | `authManagementController.verifyEmail` | `authManagementController_verifyEmail_Response` | - | `-` | - |
| GET | `/efficiency-by-model` | `backend\src\routes\admin-cache-analytics.routes.ts L:286` | `-` | - | - | `-` | backend\src\routes\index.ts L:122 |
| GET | `/health` | `backend\src\routes\index.ts L:139` | `-` | - | - | `-` | frontend\src\services\api.ts L:252 |
| GET | `/health/live` | `backend\src\routes\index.ts L:220` | `-` | - | - | `-` | - |
| GET | `/health/ready` | `backend\src\routes\index.ts L:181` | `-` | - | - | `-` | - |
| GET | `/hit-rate-trend` | `backend\src\routes\admin-cache-analytics.routes.ts L:203` | `-` | - | - | `-` | backend\src\routes\index.ts L:109;120 |
| GET | `/hit-rate-trend` | `backend\src\routes\cache-analytics.routes.ts L:197` | `-` | - | - | `-` | backend\src\routes\index.ts L:109;120 |
| GET | `/oauth/google/authorize` | `backend\src\routes\social-auth.routes.ts L:64` | `socialAuthController.googleAuthorize` | `Redirect` | - | `-` | frontend\src\components\auth\GoogleLoginButton.tsx L:56 |
| GET | `/oauth/google/callback` | `backend\src\routes\social-auth.routes.ts L:109` | `socialAuthController.googleCallback` | `Redirect` | - | `-` | - |
| GET | `/performance` | `backend\src\routes\admin-cache-analytics.routes.ts L:165` | `-` | - | - | `-` | frontend\src\api\plan111.ts L:241<br>backend\src\config\feature-flags.ts L:71<br>backend\src\routes\index.ts L:108;119<br>backend\src\routes\plan111.routes.ts L:217 |
| GET | `/performance` | `backend\src\routes\cache-analytics.routes.ts L:160` | `-` | - | - | `-` | frontend\src\api\plan111.ts L:241<br>backend\src\config\feature-flags.ts L:71<br>backend\src\routes\index.ts L:108;119<br>backend\src\routes\plan111.routes.ts L:217 |
| GET | `/savings-by-provider` | `backend\src\routes\admin-cache-analytics.routes.ts L:244` | `-` | - | - | `-` | backend\src\routes\index.ts L:121 |
| GET | `/user/profile` | `backend\src\routes\api.routes.jsdoc-example.ts L:222` | `usersController.getUserProfile` | - | - | `authMiddleware` | backend\coverage\lcov-report\src\routes\index.ts.html L:606<br>backend\coverage\src\routes\index.ts.html L:606<br>backend\src\routes\api.routes.jsdoc-example.ts L:254<br>backend\src\routes\index.ts L:101 |
| POST | `/v1/chat/completions` | `backend\src\routes\v1.routes.ts L:172` | `modelsController.chatCompletion` | `GetModelForInference_Response` | - | `authMiddleware` | - |
| POST | `/v1/completions` | `backend\src\routes\v1.routes.ts L:159` | `modelsController.textCompletion` | `GetModelForInference_Response` | - | `authMiddleware` | - |
| GET | `/v1/credits/me` | `backend\src\routes\v1.routes.ts L:247` | `creditsController.getCurrentCredits` | - | - | `authMiddleware` | - |
| GET | `/v1/models` | `backend\src\routes\v1.routes.ts L:131` | `modelsController.listModels` | `ModelListResponse` | - | `authMiddleware` | - |
| GET | `/v1/models/:modelId` | `backend\src\routes\v1.routes.ts L:143` | `modelsController.getModelDetails` | `ModelDetailsResponse` | - | `authMiddleware` | - |
| GET | `/v1/rate-limit` | `backend\src\routes\v1.routes.ts L:284` | `creditsController.getRateLimitStatus` | - | - | `authMiddleware` | - |
| GET | `/v1/subscription-plans` | `backend\src\routes\v1.routes.ts L:189` | `subscriptionsController.listSubscriptionPlans` | `{ plans }` | `500: internal_server_error` | `-` | - |
| POST | `/v1/subscriptions` | `backend\src\routes\v1.routes.ts L:210` | `subscriptionsController.createSubscription` | `subscriptionsController_createSubscription_Response` | `401: unauthorized`<br>`422: validation_error`<br>`409: conflict`<br>`400: invalid_request`<br>`404: not_found`<br>`402: payment_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/v1/subscriptions/me` | `backend\src\routes\v1.routes.ts L:199` | `subscriptionsController.getCurrentSubscription` | `subscriptionsController_getCurrentSubscription_Response` | `401: unauthorized`<br>`404: no_active_subscription`<br>`500: internal_server_error` | `authMiddleware` | - |
| PATCH | `/v1/subscriptions/me` | `backend\src\routes\v1.routes.ts L:221` | `subscriptionsController.updateSubscription` | `subscriptionsController_updateSubscription_Response` | `401: unauthorized`<br>`422: validation_error`<br>`404: not_found`<br>`400: invalid_request`<br>`402: payment_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/v1/subscriptions/me/cancel` | `backend\src\routes\v1.routes.ts L:232` | `subscriptionsController.cancelSubscription` | `subscriptionsController_cancelSubscription_Response` | `401: unauthorized`<br>`422: validation_error`<br>`404: not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/v1/usage` | `backend\src\routes\v1.routes.ts L:259` | `creditsController.getUsageHistory` | `UsageHistoryResult` | - | `authMiddleware` | - |
| GET | `/v1/usage/stats` | `backend\src\routes\v1.routes.ts L:271` | `creditsController.getUsageStats` | `UsageStatsResult` | - | `authMiddleware` | - |
| GET | `/v1/users/me` | `backend\src\routes\v1.routes.ts L:55` | `usersController.getCurrentUser` | `UserProfileResponse` | - | `authMiddleware` | - |
| PATCH | `/v1/users/me` | `backend\src\routes\v1.routes.ts L:67` | `usersController.updateCurrentUser` | `UserProfileResponse` | - | `authMiddleware` | - |
| GET | `/v1/users/me/preferences` | `backend\src\routes\v1.routes.ts L:79` | `usersController.getUserPreferences` | `UserPreferencesResponse` | - | `authMiddleware` | - |
| PATCH | `/v1/users/me/preferences` | `backend\src\routes\v1.routes.ts L:91` | `usersController.updateUserPreferences` | `UserPreferencesResponse` | - | `authMiddleware` | - |
| GET | `/v1/users/me/preferences/model` | `backend\src\routes\v1.routes.ts L:115` | `usersController.getDefaultModel` | `DefaultModelResponse` | - | `authMiddleware` | - |
| POST | `/v1/users/me/preferences/model` | `backend\src\routes\v1.routes.ts L:103` | `usersController.setDefaultModel` | `DefaultModelResponse` | - | `authMiddleware` | - |
| DELETE | `/v1/webhooks/config` | `backend\src\routes\v1.routes.ts L:321` | `webhooksController.deleteWebhookConfig` | `webhooksController_deleteWebhookConfig_Response` | `404: not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/v1/webhooks/config` | `backend\src\routes\v1.routes.ts L:299` | `webhooksController.getWebhookConfig` | `webhooksController_getWebhookConfig_Response` | `404: not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/v1/webhooks/config` | `backend\src\routes\v1.routes.ts L:310` | `webhooksController.setWebhookConfig` | `WebhookConfig` | `422: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/v1/webhooks/test` | `backend\src\routes\v1.routes.ts L:332` | `webhooksController.testWebhook` | `webhooksController_testWebhook_Response` | `404: not_found`<br>`422: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/webhooks/stripe` | `backend\src\routes\index.ts L:285` | `subscriptionsController.handleStripeWebhook` | `{ received: true }` | `400: invalid_request`<br>`401: unauthorized`<br>`500: internal_server_error` | `-` | - |

---

## Identity Provider (OAuth 2.0/OIDC)

**Base URL:** `http://localhost:7151`

**Total Endpoints:** 14

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/.well-known/openid-configuration` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/health` | `identity-provider\src\app.ts L:45` | `-` | - | - | `-` | frontend\src\services\api.ts L:252 |
| GET | `/interaction/:uid` | `identity-provider\src\app.ts L:57` | `authController.interaction` | - | - | `-` | identity-provider\src\views\consent.html L:294;358;374<br>identity-provider\src\views\login.html L:233;270;277 |
| GET | `/interaction/:uid/abort` | `identity-provider\src\app.ts L:60` | `authController.abort` | - | - | `-` | identity-provider\src\views\consent.html L:374<br>identity-provider\src\views\login.html L:277 |
| POST | `/interaction/:uid/consent` | `identity-provider\src\app.ts L:59` | `-` | - | - | `-` | identity-provider\src\views\consent.html L:358 |
| GET | `/interaction/:uid/data` | `identity-provider\src\app.ts L:61` | `authController.getInteractionData` | `authController_getInteractionData_Response` | - | `-` | identity-provider\src\views\consent.html L:294<br>identity-provider\src\views\login.html L:233 |
| POST | `/interaction/:uid/login` | `identity-provider\src\app.ts L:58` | `-` | - | - | `-` | identity-provider\src\views\login.html L:270 |
| GET | `/logout` | `identity-provider\src\app.ts L:64` | `authController.logout` | `Redirect` | - | `-` | - |
| GET | `/oauth/authorize` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| POST | `/oauth/introspect` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/oauth/jwks` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | backend\src\services\token-introspection.service.ts L:126 |
| POST | `/oauth/revoke` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| POST | `/oauth/token` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | backend\scripts\get-access-token.ts L:25 |
| GET | `/oauth/userinfo` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |

---

## Summary Statistics

### Backend API

- **Total Endpoints:** 80
- **Endpoints with Usages:** 11
- **Total Usage References:** 1404
- **Unused Endpoints:** 69

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 14
- **Endpoints with Usages:** 8
- **Total Usage References:** 15
- **Unused Endpoints:** 6

---

## Schemas

Referenced TypeScript types and interfaces used in API responses:

### authController_getInteractionData_Response

**Source:** `identity-provider\src\app.ts` (Line 61)

```typescript
// Inline response from identity-provider\src\app.ts:61
type authController_getInteractionData_Response = {
        uid,
        prompt: prompt.name,
        client: {
          clientId: client.clientId,
          clientName: (client.metadata() as any).client_name || client.clientId,
        },
        params: {
          scope: params.scope,
          redirectUri: params.redirect_uri,
        },
        session: session
          ? {
              accountId: session.accountId,
            }
          : null,
      }
```

### authManagementController_forgotPassword_Response

**Source:** `backend\src\routes\auth.routes.ts` (Line 148)

```typescript
// Inline response from backend\src\routes\auth.routes.ts:148
type authManagementController_forgotPassword_Response = {
        status: 'success',
        data: {
          success: true,
        },
        meta: {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
      }
```

### authManagementController_register_Response

**Source:** `backend\src\routes\auth.routes.ts` (Line 81)

```typescript
// Inline response from backend\src\routes\auth.routes.ts:81
type authManagementController_register_Response = {
        status: 'success',
        data: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
        },
        meta: {
          message: 'Registration successful. Please check your email to verify your account.',
        },
      }
```

### authManagementController_resetPassword_Response

**Source:** `backend\src\routes\auth.routes.ts` (Line 182)

```typescript
// Inline response from backend\src\routes\auth.routes.ts:182
type authManagementController_resetPassword_Response = {
        status: 'success',
        data: {
          success: true,
        },
        meta: {
          message: 'Password reset successfully. Please log in with your new password.',
        },
      }
```

### authManagementController_verifyEmail_Response

**Source:** `backend\src\routes\auth.routes.ts` (Line 114)

```typescript
// Inline response from backend\src\routes\auth.routes.ts:114
type authManagementController_verifyEmail_Response = {
        status: 'success',
        data: {
          success: true,
        },
        meta: {
          message: 'Email verified successfully. You can now log in.',
        },
      }
```

### brandingController_getLatestVersion_Response

**Source:** `backend\src\routes\branding.routes.ts` (Line 128)

```typescript
// Inline response from backend\src\routes\branding.routes.ts:128
type brandingController_getLatestVersion_Response = {
        status: 'success',
        data: {
          version: version.version,
          releaseDate: version.releaseDate.toISOString(),
          downloadUrl: version.downloadUrl,
          changelog: version.changelog,
        },
        meta: {
          message: 'Version information retrieved successfully',
        },
      }
```

### brandingController_submitFeedback_Response

**Source:** `backend\src\routes\branding.routes.ts` (Line 100)

```typescript
// Inline response from backend\src\routes\branding.routes.ts:100
type brandingController_submitFeedback_Response = {
        status: 'success',
        data: {
          feedbackId: feedback.id,
        },
        meta: {
          message: 'Feedback submitted successfully',
        },
      }
```

### brandingController_trackDownload_Response

**Source:** `backend\src\routes\branding.routes.ts` (Line 68)

```typescript
// Inline response from backend\src\routes\branding.routes.ts:68
type brandingController_trackDownload_Response = {
        status: 'success',
        data: {
          downloadUrl,
          downloadId: download.id,
        },
        meta: {
          message: 'Download tracked successfully',
        },
      }
```

### brandingController_uploadDiagnostic_Response

**Source:** `backend\src\routes\branding.routes.ts` (Line 159)

```typescript
// Inline response from backend\src\routes\branding.routes.ts:159
type brandingController_uploadDiagnostic_Response = {
        status: 'success',
        data: {
          diagnosticId: diagnostic.id,
          fileSize: file.size,
        },
        meta: {
          message: 'Diagnostic file uploaded successfully',
        },
      }
```

### CouponRedemption

**Source:** `shared-types\src\coupon.types.ts` (Line 190)

```typescript
export interface CouponRedemption {
  id: string;
  couponId: string;
  couponCode?: string; // Populated from join
  userId: string;
  userEmail?: string; // Populated from join
  subscriptionId?: string | null;

  // Redemption details
  redemptionDate: string;
  discountApplied: number; // discountAppliedUsd
  originalAmount: number;
  finalAmount: number;
  status: RedemptionStatus;
  failureReason?: string | null;

  // Fraud metadata
  ipAddress?: string | null;
  userAgent?: string | null;

  // Proration (Plan 110 integration)
  isProrationInvolved: boolean;
  prorationAmount?: number | null;
  userTierBefore?: string | null;
  userTierAfter?: string | null;
  billingCycleBefore?: string | null;
  billingCycleAfter?: string | null;

  createdAt: string;
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

### GetInvoices_Response

**Source:** `backend\src\services\billing-payments.service.ts` (Line 950)

```typescript
// Service method return type from billing-payments.service.ts
type GetInvoices_Response = {
    invoices: Array<{
      id: string;
      date: string;
      amount: number;
      currency: string;
      status: string;
      invoiceUrl: string;
      pdfUrl: string;
      description: string;
    }
```

### GetMigrationHistory_Response

**Source:** `backend\src\services\migration.service.ts` (Line 424)

```typescript
// Service method return type from migration.service.ts
type GetMigrationHistory_Response = {
    perpetualLicenses: any[];
    subscriptions: any[];
  }
```

### GetModelForInference_Response

**Source:** `backend\src\services\model.service.ts` (Line 431)

```typescript
// Service method return type from model.service.ts
type GetModelForInference_Response = {
    id: string;
    provider: string;
    creditsPer1kTokens: number;
    isAvailable: boolean;
  } | null> {
    logger.debug('ModelService: Getting model for inference', { modelId });

    const model = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        provider: true,
        is_available: true,
        is_legacy: true,
        is_archived: true,
        meta: true,
      },
    });

    // Reject if model is not available or archived
    if (!model || !model.is_available || model.is_archived) {
      logger.warn('ModelService: Model not available for inference', {
        modelId,
        reason: !model
          ? 'not_found'
          : model.is_archived
          ? 'archived'
          : 'unavailable',
      });
      return null;
    }

    const meta = model.meta as any;

    return {
      id: model.id,
      provider: model.provider,
      creditsPer1kTokens: meta?.creditsPer1kTokens ?? 0,
      isAvailable: model.is_available,
    };
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear model cache
   * Should be called when model data is updated in the database
   */
  clearCache(): void {
    logger.info('ModelService: Clearing model cache');
    modelCache.clear();
  }

  /**
   * Refresh cache by pre-loading commonly accessed models
   * Can be called on server startup or periodically
   */
  async refreshCache(): Promise<void> {
    logger.info('ModelService: Refreshing model cache');

    try {
      // Pre-load all available models
      await this.listModels({ available: true });

      // Pre-load individual model details for available models
      const models = await this.prisma.models.findMany({
        where: { is_available: true },
        select: { id: true },
      });

      for (const model of models) {
        await this.getModelDetails(model.id);
      }

      logger.info('ModelService: Cache refreshed', {
        modelsCount: models.length,
      });
    } catch (error) {
      logger.error('ModelService: Error refreshing cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ===========================================================================
  // Statistics Operations
  // ===========================================================================

  /**
   * Get model usage statistics
   * Returns count of requests per model
   *
   * @param startDate - Start date for statistics
   * @param endDate - End date for statistics
   * @returns Model usage statistics
   */
  async getModelUsageStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ modelId: string; requestCount: number; totalTokens: number }
```

### LicenseActivationResult

**Source:** `backend\src\services\license-management.service.ts` (Line 35)

```typescript
export interface LicenseActivationResult {
  activation: LicenseActivation;
  isNewActivation: boolean;
}
```

### licenseController_getActiveDevices_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 117)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:117
type licenseController_getActiveDevices_Response = {
        license_key: licenseKey,
        max_activations: license.max_activations,
        current_activations: devices.length,
        devices: devices.map((d) => ({
          id: d.id,
          device_name: d.device_name,
          os_type: d.os_type,
          os_version: d.os_version,
          cpu_info: d.cpu_info,
          activated_at: d.activated_at.toISOString(),
          last_seen_at: d.last_seen_at.toISOString(),
        })),
      }
```

### licenseController_getLicenseDetails_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 107)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:107
type licenseController_getLicenseDetails_Response = {
        id: license.id,
        license_key: license.license_key,
        purchased_version: license.purchased_version,
        eligible_until_version: license.eligible_until_version,
        max_activations: license.max_activations,
        current_activations: license.current_activations,
        status: license.status,
        purchased_at: license.purchased_at.toISOString(),
        activated_at: license.activated_at?.toISOString() || null,
        activations: license.license_activation?.map((a: any) => ({
          id: a.id,
          device_name: a.device_name,
          os_type: a.os_type,
          status: a.status,
          activated_at: a.activated_at.toISOString(),
        })),
        version_upgrades: license.version_upgrade?.map((u: any) => ({
          id: u.id,
          from_version: u.fromVersion,
          to_version: u.toVersion,
          upgrade_price_usd: u.upgradePriceUsd,
          status: u.status,
          purchased_at: u.purchased_at.toISOString(),
        })),
      }
```

### migrationController_getTradeInValue_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 246)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:246
type migrationController_getTradeInValue_Response = {
        license_id: licenseId,
        trade_in_value_usd: tradeInValue,
        message: `Your perpetual license has a trade-in value of $${tradeInValue.toFixed(2)}`,
      }
```

### ModelDetailsResponse

**Source:** `backend\src\types\model-validation.ts` (Line 302)

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

  // Phase 3: Separate input/output pricing
  input_credits_per_k?: number;
  output_credits_per_k?: number;

  // DEPRECATED: Kept for backward compatibility
  credits_per_1k_tokens: number;

  is_available: boolean;
  is_deprecated: boolean;
  is_legacy?: boolean; // NEW: Legacy status
  is_archived?: boolean; // NEW: Archived status
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
  legacy_info?: LegacyInfo; // NEW: Legacy deprecation info
}
```

### ModelListResponse

**Source:** `backend\src\types\model-validation.ts` (Line 292)

```typescript
export interface ModelListResponse {
  models: ModelListItem[];
  total: number;
  user_tier?: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'; // Current user's tier (if provided)
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

**Source:** `backend\src\services\proration.service.ts` (Line 32)

```typescript
export interface ProrationPreview {
  calculation: ProrationCalculation;
  chargeToday: number;
  nextBillingAmount: number;
  nextBillingDate: Date;
  message: string;
}
```

### subscriptionsController_cancelSubscription_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 232)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:232
type subscriptionsController_cancelSubscription_Response = {
        id: subscription.id,
        status: subscription.status,
        cancelled_at: subscription.cancelled_at?.toISOString() || null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end.toISOString(),
      }
```

### subscriptionsController_createSubscription_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 210)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:210
type subscriptionsController_createSubscription_Response = {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.credits_per_month,
        stripe_subscription_id: subscription.stripe_subscription_id,
        created_at: subscription.created_at.toISOString(),
      }
```

### subscriptionsController_getCurrentSubscription_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 199)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:199
type subscriptionsController_getCurrentSubscription_Response = {
        id: subscription.id,
        user_id: subscription.user_id,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.credits_per_month,
        credits_rollover: subscription.credits_rollover,
        billing_interval: subscription.billing_interval,
        price_cents: subscription.price_cents,
        current_period_start: subscription.current_period_start.toISOString(),
        current_period_end: subscription.current_period_end.toISOString(),
        trial_end: subscription.trial_end?.toISOString() || null,
        created_at: subscription.created_at.toISOString(),
      }
```

### subscriptionsController_updateSubscription_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 221)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:221
type subscriptionsController_updateSubscription_Response = {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.credits_per_month,
        price_cents: subscription.price_cents,
        billing_interval: subscription.billing_interval,
        updated_at: subscription.updated_at.toISOString(),
      }
```

### upgradeController_checkVersionEligibility_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 131)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:131
type upgradeController_checkVersionEligibility_Response = {
        license_key: licenseKey,
        requested_version: version,
        is_eligible: isFree,
        is_free: isFree,
        requires_payment: !isFree,
        current_eligible_range: {
          min: license.purchased_version,
          max: license.eligible_until_version,
        },
      }
```

### upgradeController_getAvailableUpgrades_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 152)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:152
type upgradeController_getAvailableUpgrades_Response = {
        license_key: licenseKey,
        current_version: license.eligible_until_version,
        available_upgrades: upgrades,
      }
```

### upgradeController_getUpgradeHistory_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 162)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:162
type upgradeController_getUpgradeHistory_Response = {
        license_key: licenseKey,
        upgrade_history: history.map((u) => ({
          id: u.id,
          from_version: u.from_version,
          to_version: u.to_version,
          upgrade_price_usd: u.upgrade_price_usd,
          status: u.status,
          purchased_at: u.purchased_at.toISOString(),
        })),
      }
```

### upgradeController_purchaseUpgrade_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 141)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:141
type upgradeController_purchaseUpgrade_Response = {
        status: 'success',
        data: {
          upgrade_id: upgrade.id,
          license_id: license.id,
          from_version: upgrade.from_version,
          to_version: upgrade.to_version,
          upgrade_price_usd: upgrade.upgrade_price_usd,
          pricing_breakdown: pricing,
          status: upgrade.status,
          purchased_at: upgrade.purchased_at.toISOString(),
        },
      }
```

### UsageHistoryResult

**Source:** `backend\src\services\usage.service.ts` (Line 33)

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

**Source:** `backend\src\services\usage.service.ts` (Line 64)

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

### UsageSummaryResponse

**Source:** `backend\src\services\usage.service.ts` (Line 731)

```typescript
export interface UsageSummaryResponse {
  period: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    creditsUsed: number;
    apiRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
    mostUsedModel: string;
    mostUsedModelPercentage: number;
  };
  creditBreakdown: CreditBreakdown;
  modelBreakdown: ModelBreakdownItem[];
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

**Source:** `shared-types\src\tier-config.types.ts` (Line 109)

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### webhooksController_deleteWebhookConfig_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 321)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:321
type webhooksController_deleteWebhookConfig_Response = {
        success: true,
        message: 'Webhook configuration deleted',
      }
```

### webhooksController_getWebhookConfig_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 299)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:299
type webhooksController_getWebhookConfig_Response = {
        id: configWithoutSecret.id,
        user_id: configWithoutSecret.user_id,
        webhook_url: configWithoutSecret.webhook_url,
        is_active: configWithoutSecret.is_active,
        created_at: configWithoutSecret.created_at.toISOString(),
        updated_at: configWithoutSecret.updated_at.toISOString(),
      }
```

### webhooksController_testWebhook_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 332)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:332
type webhooksController_testWebhook_Response = {
        success: true,
        message: 'Test webhook queued for delivery',
        event_type: validatedData.event_type,
      }
```

