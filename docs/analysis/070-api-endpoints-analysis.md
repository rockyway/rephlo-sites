# API Endpoints Analysis Report (Simple Format)

**Generated:** 2025-11-13T02:04:56.533Z
**Format:** Simple
**Include Tests:** No

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 214

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| POST | `/:id/archive` | `backend\src\routes\admin-models.routes.ts L:91` | `adminModelsController.archiveModel` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/:id/mark-legacy` | `backend\src\routes\admin-models.routes.ts L:66` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| PATCH | `/:id/meta` | `backend\src\routes\admin-models.routes.ts L:115` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/:id/unarchive` | `backend\src\routes\admin-models.routes.ts L:100` | `adminModelsController.unarchiveModel` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/:id/unmark-legacy` | `backend\src\routes\admin-models.routes.ts L:77` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/coupons` | `backend\src\routes\plan111.routes.ts L:293` | `analyticsController.getAnalyticsMetrics` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/coupons/by-type` | `backend\src\routes\plan111.routes.ts L:336` | `analyticsController.getRedemptionsByType` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/coupons/top` | `backend\src\routes\plan111.routes.ts L:324` | `analyticsController.getTopPerformingCoupons` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/coupons/trend` | `backend\src\routes\plan111.routes.ts L:309` | `analyticsController.getRedemptionTrend` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/upgrade-conversion` | `backend\src\routes\plan110.routes.ts L:442` | `upgradeController.getUpgradeConversion` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/campaigns` | `backend\src\routes\plan111.routes.ts L:194` | `campaignController.listCampaigns` | - | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/campaigns` | `backend\src\routes\plan111.routes.ts L:158` | `campaignController.createCampaign` | `CouponCampaign` | `400: creation_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:255 |
| DELETE | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:182` | `campaignController.deleteCampaign` | - | `400: deletion_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:207 |
| GET | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:205` | `campaignController.getSingleCampaign` | `campaignController_getSingleCampaign_Response` | `404: campaign_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:170` | `campaignController.updateCampaign` | `CouponCampaign` | `404: campaign_not_found`<br>`400: update_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/campaigns/:id/assign-coupon` | `backend\src\routes\plan111.routes.ts L:227` | `campaignController.assignCoupon` | - | `400: assignment_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:255 |
| GET | `/admin/campaigns/:id/performance` | `backend\src\routes\plan111.routes.ts L:216` | `campaignController.getCampaignPerformance` | `GetCampaignPerformance_Response` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| DELETE | `/admin/campaigns/:id/remove-coupon/:couponId` | `backend\src\routes\plan111.routes.ts L:239` | `campaignController.removeCoupon` | - | `400: removal_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/coupons` | `backend\src\routes\plan111.routes.ts L:123` | `couponController.listCoupons` | - | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/coupons` | `backend\src\routes\plan111.routes.ts L:87` | `couponController.createCoupon` | - | `400: creation_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:100 |
| DELETE | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:111` | `couponController.deleteCoupon` | - | `400: deletion_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:125 |
| GET | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:134` | `couponController.getSingleCoupon` | - | `404: coupon_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:99` | `couponController.updateCoupon` | - | `400: update_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/coupons/:id/redemptions` | `backend\src\routes\plan111.routes.ts L:145` | `couponController.getCouponRedemptions` | `{ status: "success", data: couponController_getCouponRedemptions_Data }` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/fraud-detection` | `backend\src\routes\plan111.routes.ts L:253` | `fraudController.listFraudEvents` | - | - | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/fraud-detection/:id/review` | `backend\src\routes\plan111.routes.ts L:264` | `fraudController.reviewFraudEvent` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/fraud-detection/pending` | `backend\src\routes\plan111.routes.ts L:276` | `fraudController.getPendingReviews` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/licenses` | `backend\src\routes\plan110.routes.ts L:298` | `licenseController.listAllLicenses` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/licenses/:id/revoke` | `backend\src\routes\plan110.routes.ts L:285` | `licenseController.revokeLicense` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/licenses/:id/suspend` | `backend\src\routes\plan110.routes.ts L:272` | `licenseController.suspendLicense` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/licenses/devices` | `backend\src\routes\plan110.routes.ts L:326` | `deviceActivationController.getAllDeviceActivations` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/licenses/devices/:id/deactivate` | `backend\src\routes\plan110.routes.ts L:348` | `deviceActivationController.deactivateDevice` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/licenses/devices/:id/revoke` | `backend\src\routes\plan110.routes.ts L:360` | `deviceActivationController.revokeDevice` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/licenses/devices/bulk-action` | `backend\src\routes\plan110.routes.ts L:372` | `deviceActivationController.bulkAction` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/licenses/devices/stats` | `backend\src\routes\plan110.routes.ts L:337` | `deviceActivationController.getDeviceStats` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/licenses/stats` | `backend\src\routes\plan110.routes.ts L:310` | `licenseController.getLicenseStats` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/prorations` | `backend\src\routes\plan110.routes.ts L:389` | `prorationController.listAllProrations` | `GetAllProrations_Response` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/prorations/:id/calculation` | `backend\src\routes\plan110.routes.ts L:426` | `prorationController.getCalculationBreakdown` | `GetCalculationBreakdown_Response` | `404: proration_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/prorations/:id/reverse` | `backend\src\routes\plan110.routes.ts L:413` | `prorationController.reverseProration` | `ProrationEvent` | `400: validation_error`<br>`404: proration_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/prorations/stats` | `backend\src\routes\plan110.routes.ts L:401` | `prorationController.getProrationStats` | `GetProrationStats_Response` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/analytics/churn-rate` | `backend\src\routes\plan109.routes.ts L:529` | `analyticsController.getChurnRate` | `{ status: "success", data: analyticsController_getChurnRate_Data }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:499 |
| GET | `/analytics/conversion-rate` | `backend\src\routes\plan109.routes.ts L:547` | `analyticsController.getFreeToProConversionRate` | `{ status: "success", data: analyticsController_getFreeToProConversionRate_Data }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:510 |
| GET | `/analytics/credit-utilization` | `backend\src\routes\plan109.routes.ts L:538` | `analyticsController.getCreditUtilizationRate` | `{ status: "success", data: analyticsController_getCreditUtilizationRate_Data }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:421 |
| GET | `/analytics/dashboard` | `backend\src\routes\plan109.routes.ts L:556` | `analyticsController.getDashboardSummary` | `{ status: "success", data: T }` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:242<br>frontend\src\api\plan109.ts L:449 |
| GET | `/analytics/dashboard-kpis` | `backend\src\routes\admin.routes.ts L:145` | `adminAnalyticsController.getDashboardKPIs` | `DashboardKPIsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:242 |
| GET | `/analytics/recent-activity` | `backend\src\routes\admin.routes.ts L:165` | `adminAnalyticsController.getRecentActivity` | `RecentActivityResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:257 |
| GET | `/analytics/revenue` | `backend\src\routes\plan109.routes.ts L:475` | `analyticsController.getRevenueMetrics` | `analyticsController_getRevenueMetrics_Response` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:637;651;665;679;695;711<br>frontend\src\api\plan109.ts L:340;351;459;469;524;568;624<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:125<br>frontend\src\utils\breadcrumbs.ts L:83 |
| GET | `/analytics/revenue/arr` | `backend\src\routes\plan109.routes.ts L:493` | `analyticsController.getARR` | `{ status: "success", data: analyticsController_getARR_Data }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:469 |
| GET | `/analytics/revenue/by-tier` | `backend\src\routes\plan109.routes.ts L:502` | `analyticsController.getRevenueByTier` | `{ status: "success", data: T }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:351 |
| GET | `/analytics/revenue/conversion-funnel` | `backend\src\routes\admin.routes.ts L:555` | `revenueAnalyticsController.getRevenueFunnel` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:679 |
| GET | `/analytics/revenue/coupon-roi` | `backend\src\routes\admin.routes.ts L:600` | `revenueAnalyticsController.getCouponROI` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:711 |
| GET | `/analytics/revenue/credit-usage` | `backend\src\routes\admin.routes.ts L:583` | `revenueAnalyticsController.getCreditUsage` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:695<br>frontend\src\api\plan109.ts L:624 |
| GET | `/analytics/revenue/funnel` | `backend\src\routes\admin.routes.ts L:566` | `revenueAnalyticsController.getRevenueFunnel` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:524 |
| GET | `/analytics/revenue/kpis` | `backend\src\routes\admin.routes.ts L:498` | `revenueAnalyticsController.getRevenueKPIs` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:637 |
| GET | `/analytics/revenue/mix` | `backend\src\routes\admin.routes.ts L:516` | `revenueAnalyticsController.getRevenueMix` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:651 |
| GET | `/analytics/revenue/mrr` | `backend\src\routes\plan109.routes.ts L:484` | `analyticsController.getMRR` | `{ status: "success", data: analyticsController_getMRR_Data }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:459 |
| GET | `/analytics/revenue/trend` | `backend\src\routes\admin.routes.ts L:537` | `revenueAnalyticsController.getRevenueTrend` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:665<br>frontend\src\api\plan109.ts L:568 |
| GET | `/analytics/users/by-tier` | `backend\src\routes\plan109.routes.ts L:520` | `analyticsController.getUsersByTier` | `{ status: "success", data: T }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:489 |
| GET | `/analytics/users/total` | `backend\src\routes\plan109.routes.ts L:511` | `analyticsController.getTotalActiveUsers` | `{ status: "success", data: analyticsController_getTotalActiveUsers_Data }` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:479 |
| POST | `/api/coupons/redeem` | `backend\src\routes\plan111.routes.ts L:65` | `couponController.redeemCoupon` | `CouponRedemption` | `401: unauthorized`<br>`404: coupon_not_found`<br>`400: redemption_failed` | `authMiddleware` | - |
| POST | `/api/coupons/validate` | `backend\src\routes\plan111.routes.ts L:56` | `couponController.validateCoupon` | `ValidationResult` | `500: validation_error` | `-` | - |
| GET | `/api/users/:userId/coupons` | `backend\src\routes\plan111.routes.ts L:75` | `couponController.getUserCoupons` | `CouponRedemption[]` | `403: forbidden`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/archived` | `backend\src\routes\admin-models.routes.ts L:141` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/audit-logs` | `backend\src\routes\admin.routes.ts L:278` | `auditLogController.getAuditLogs` | `{ status: "success", data: auditLogController_getAuditLogs_Data }` | `500: internal_server_error` | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:181<br>backend\src\routes\admin.routes.ts L:202 |
| GET | `/audit-logs/admin/:adminUserId` | `backend\src\routes\admin.routes.ts L:309` | `auditLogController.getLogsForAdmin` | `AdminAuditLog[]` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/audit-logs/resource/:resourceType/:resourceId` | `backend\src\routes\admin.routes.ts L:294` | `auditLogController.getLogsForResource` | `AdminAuditLog[]` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/backup-code-login` | `backend\src\routes\mfa.routes.ts L:399` | `-` | - | - | `-` | backend\src\routes\index.ts L:77 |
| GET | `/billing/dunning` | `backend\src\routes\admin.routes.ts L:821` | `billingController.listDunningAttempts` | `DunningAttempt[]` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:320;330 |
| POST | `/billing/dunning/:attemptId/retry` | `backend\src\routes\plan109.routes.ts L:352` | `billingController.retryFailedPayment` | `PaymentTransaction` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:330 |
| GET | `/billing/invoices` | `backend\src\routes\admin.routes.ts L:790` | `billingController.listInvoices` | `ListAllInvoices_Response` | `501: error_response` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:271;281;282 |
| POST | `/billing/invoices/:subscriptionId` | `backend\src\routes\plan109.routes.ts L:305` | `billingController.createInvoice` | `Invoice` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:271;281 |
| GET | `/billing/invoices/:userId` | `backend\src\routes\plan109.routes.ts L:324` | `billingController.listInvoices` | `ListAllInvoices_Response` | `501: error_response` | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:271;281 |
| GET | `/billing/invoices/upcoming/:userId` | `backend\src\routes\plan109.routes.ts L:315` | `billingController.getUpcomingInvoice` | - | `501: error_response` | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:271 |
| POST | `/billing/payment-methods` | `backend\src\routes\plan109.routes.ts L:276` | `billingController.addPaymentMethod` | `billingController_addPaymentMethod_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| DELETE | `/billing/payment-methods/:id` | `backend\src\routes\plan109.routes.ts L:286` | `billingController.removePaymentMethod` | `billingController_removePaymentMethod_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/billing/payment-methods/:userId` | `backend\src\routes\plan109.routes.ts L:296` | `billingController.listPaymentMethods` | - | `501: error_response` | `authMiddleware, requireAdmin` | - |
| GET | `/billing/transactions` | `backend\src\routes\admin.routes.ts L:808` | `billingController.listTransactions` | `ListAllTransactions_Response` | `501: error_response` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:295;296;309 |
| POST | `/billing/transactions/:id/refund` | `backend\src\routes\plan109.routes.ts L:342` | `billingController.refundTransaction` | - | `501: error_response` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:309 |
| GET | `/billing/transactions/:userId` | `backend\src\routes\plan109.routes.ts L:333` | `billingController.listTransactions` | `ListAllTransactions_Response` | `501: error_response` | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:295;309 |
| POST | `/chat/completions` | `backend\src\routes\v1.routes.ts L:172` | `modelsController.chatCompletion` | `GetModelForInference_Response` | - | `authMiddleware` | backend\coverage\lcov-report\src\routes\index.ts.html L:599<br>backend\coverage\src\routes\index.ts.html L:599<br>backend\src\routes\index.ts L:93 |
| POST | `/completions` | `backend\src\routes\v1.routes.ts L:159` | `modelsController.textCompletion` | `GetModelForInference_Response` | - | `authMiddleware` | backend\coverage\lcov-report\src\middleware\credit.middleware.ts.html L:675<br>backend\coverage\lcov-report\src\routes\index.ts.html L:598;599<br>backend\coverage\lcov-report\src\routes\v1.routes.ts.html L:936<br>backend\coverage\src\middleware\credit.middleware.ts.html L:675<br>backend\coverage\src\routes\index.ts.html L:598;599<br>backend\coverage\src\routes\v1.routes.ts.html L:936<br>backend\src\middleware\credit.middleware.ts L:8<br>backend\src\routes\index.ts L:92;93<br>backend\src\routes\v1.routes.ts L:173 |
| POST | `/credits/allocate` | `backend\src\routes\plan109.routes.ts L:366` | `creditController.allocateSubscriptionCredits` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/credits/balance/:userId` | `backend\src\routes\plan109.routes.ts L:444` | `creditController.getCreditBalance` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:368 |
| POST | `/credits/deduct` | `backend\src\routes\plan109.routes.ts L:396` | `creditController.deductCreditsManually` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/credits/grant-bonus` | `backend\src\routes\plan109.routes.ts L:386` | `creditController.grantBonusCredits` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:400 |
| GET | `/credits/history/:userId` | `backend\src\routes\plan109.routes.ts L:453` | `creditController.getCreditAllocationHistory` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:378 |
| GET | `/credits/me` | `backend\src\routes\v1.routes.ts L:247` | `creditsController.getCurrentCredits` | - | - | `authMiddleware` | - |
| POST | `/credits/process-monthly` | `backend\src\routes\plan109.routes.ts L:376` | `creditController.processMonthlyAllocations` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:411 |
| GET | `/credits/reconcile/:userId` | `backend\src\routes\plan109.routes.ts L:435` | `creditController.reconcileCreditBalance` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/credits/rollover/:userId` | `backend\src\routes\plan109.routes.ts L:406` | `creditController.calculateRollover` | - | - | `authMiddleware, requireAdmin` | - |
| POST | `/credits/rollover/:userId/apply` | `backend\src\routes\plan109.routes.ts L:415` | `creditController.applyRollover` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/credits/sync/:userId` | `backend\src\routes\plan109.routes.ts L:425` | `creditController.syncWithTokenCreditSystem` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/credits/usage/:userId` | `backend\src\routes\plan109.routes.ts L:462` | `creditController.getCreditUsageByPeriod` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:389 |
| POST | `/diagnostics` | `backend\src\routes\branding.routes.ts L:159` | `brandingController.uploadDiagnostic` | - | - | `-` | backend\coverage\lcov-report\src\routes\index.ts.html L:618;742<br>backend\coverage\src\routes\index.ts.html L:618;742<br>backend\src\routes\index.ts L:120 |
| POST | `/disable` | `backend\src\routes\mfa.routes.ts L:282` | `-` | - | - | `authMiddleware, requireAdmin` | backend\src\routes\index.ts L:76 |
| POST | `/feedback` | `backend\src\routes\branding.routes.ts L:100` | `brandingController.submitFeedback` | - | - | `-` | frontend\src\services\api.ts L:248<br>backend\coverage\lcov-report\src\routes\index.ts.html L:617;736<br>backend\coverage\src\routes\index.ts.html L:617;736<br>backend\src\routes\index.ts L:119 |
| POST | `/forgot-password` | `backend\src\routes\auth.routes.ts L:148` | `authManagementController.forgotPassword` | - | - | `-` | backend\src\routes\index.ts L:71 |
| GET | `/health` | `backend\src\routes\index.ts L:132` | `-` | - | - | `-` | frontend\src\services\api.ts L:236 |
| GET | `/health/live` | `backend\src\routes\index.ts L:213` | `-` | - | - | `-` | - |
| GET | `/health/ready` | `backend\src\routes\index.ts L:174` | `-` | - | - | `-` | - |
| GET | `/legacy` | `backend\src\routes\admin-models.routes.ts L:130` | `-` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/licenses/:licenseKey` | `backend\src\routes\plan110.routes.ts L:96` | `licenseController.getLicenseDetails` | - | - | `-` | frontend\src\api\plan110.ts L:69;79;89;100;111;122;138;148;159;169;186;196;206;216<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:76;77<br>frontend\src\utils\breadcrumbs.ts L:68;69<br>backend\src\routes\index.ts L:104<br>backend\src\routes\plan110.routes.ts L:273;286;311;327;338;349;361;373 |
| GET | `/licenses/:licenseKey/available-upgrades` | `backend\src\routes\plan110.routes.ts L:141` | `upgradeController.getAvailableUpgrades` | - | - | `-` | frontend\src\api\plan110.ts L:186 |
| GET | `/licenses/:licenseKey/devices` | `backend\src\routes\plan110.routes.ts L:106` | `licenseController.getActiveDevices` | - | - | `-` | frontend\src\api\plan110.ts L:138 |
| POST | `/licenses/:licenseKey/upgrade` | `backend\src\routes\plan110.routes.ts L:130` | `upgradeController.purchaseUpgrade` | - | - | `authMiddleware` | frontend\src\api\plan110.ts L:196;216<br>backend\src\routes\index.ts L:104 |
| GET | `/licenses/:licenseKey/upgrade-history` | `backend\src\routes\plan110.routes.ts L:151` | `upgradeController.getUpgradeHistory` | - | - | `-` | frontend\src\api\plan110.ts L:196 |
| GET | `/licenses/:licenseKey/version-eligibility/:version` | `backend\src\routes\plan110.routes.ts L:120` | `upgradeController.checkVersionEligibility` | - | - | `-` | frontend\src\api\plan110.ts L:206 |
| POST | `/licenses/activate` | `backend\src\routes\plan110.routes.ts L:64` | `licenseController.activateDevice` | - | - | `-` | frontend\src\api\plan110.ts L:148 |
| DELETE | `/licenses/activations/:id` | `backend\src\routes\plan110.routes.ts L:74` | `licenseController.deactivateDevice` | - | - | `authMiddleware` | frontend\src\api\plan110.ts L:159;169 |
| PATCH | `/licenses/activations/:id/replace` | `backend\src\routes\plan110.routes.ts L:85` | `licenseController.replaceDevice` | - | - | `authMiddleware` | frontend\src\api\plan110.ts L:169 |
| POST | `/licenses/purchase` | `backend\src\routes\plan110.routes.ts L:53` | `licenseController.purchaseLicense` | - | - | `authMiddleware` | frontend\src\api\plan110.ts L:89 |
| GET | `/metrics` | `backend\src\routes\admin.routes.ts L:63` | `adminController.getMetrics` | `{ status: "success", data: adminController_getMetrics_Data }` | `403: forbidden`<br>`500: error_response` | `authMiddleware, requireAdmin` | frontend\src\services\api.ts L:260<br>backend\coverage\lcov-report\src\routes\index.ts.html L:610<br>backend\coverage\src\routes\index.ts.html L:610<br>backend\src\routes\index.ts L:109 |
| GET | `/migrations/eligibility` | `backend\src\routes\plan110.routes.ts L:246` | `migrationController.checkMigrationEligibility` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:334 |
| GET | `/migrations/history` | `backend\src\routes\plan110.routes.ts L:257` | `migrationController.getMigrationHistory` | `GetMigrationHistory_Response` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:344 |
| POST | `/migrations/perpetual-to-subscription` | `backend\src\routes\plan110.routes.ts L:213` | `migrationController.migratePerpetualToSubscription` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`400: migration_not_allowed`<br>`404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:364 |
| POST | `/migrations/subscription-to-perpetual` | `backend\src\routes\plan110.routes.ts L:224` | `migrationController.migrateSubscriptionToPerpetual` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`400: migration_not_allowed`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:375 |
| GET | `/migrations/trade-in-value/:licenseId` | `backend\src\routes\plan110.routes.ts L:235` | `migrationController.getTradeInValue` | `migrationController_getTradeInValue_Response` | `404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:354 |
| GET | `/models` | `backend\src\routes\v1.routes.ts L:131` | `modelsController.listModels` | `ModelListResponse` | - | `authMiddleware` | frontend\src\api\admin.ts L:96;108;123;142;181;216;225<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:114<br>backend\coverage\lcov-report\src\routes\index.ts.html L:597<br>backend\coverage\src\routes\index.ts.html L:597<br>backend\src\middleware\auth.middleware.ts L:439<br>backend\src\routes\index.ts L:91;236 |
| GET | `/models/:modelId` | `backend\src\routes\v1.routes.ts L:143` | `modelsController.getModelDetails` | `ModelDetailsResponse` | - | `authMiddleware` | frontend\src\api\admin.ts L:96;108;123;142;181;216;225 |
| PATCH | `/models/:modelId/tier` | `backend\src\routes\admin.routes.ts L:219` | `modelTierAdminController.updateModelTier` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:108;123 |
| GET | `/models/providers` | `backend\src\routes\admin.routes.ts L:256` | `modelTierAdminController.getProviders` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:225 |
| GET | `/models/tiers` | `backend\src\routes\admin.routes.ts L:184` | `modelTierAdminController.listModelsWithTiers` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:96;142;181;216 |
| GET | `/models/tiers/audit-logs` | `backend\src\routes\admin.routes.ts L:201` | `modelTierAdminController.getAuditLogs` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:181 |
| POST | `/models/tiers/bulk` | `backend\src\routes\admin.routes.ts L:232` | `modelTierAdminController.bulkUpdateModelTiers` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:142 |
| POST | `/models/tiers/revert/:auditLogId` | `backend\src\routes\admin.routes.ts L:244` | `modelTierAdminController.revertTierChange` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:216 |
| GET | `/oauth/google/authorize` | `backend\src\routes\social-auth.routes.ts L:64` | `socialAuthController.googleAuthorize` | - | - | `-` | frontend\src\components\auth\GoogleLoginButton.tsx L:56 |
| GET | `/oauth/google/callback` | `backend\src\routes\social-auth.routes.ts L:109` | `socialAuthController.googleCallback` | - | - | `-` | - |
| GET | `/pricing/alerts` | `backend\src\routes\admin.routes.ts L:927` | `profitabilityController.getPricingAlerts` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:264;273;281;289 |
| GET | `/pricing/configs` | `backend\src\routes\admin.routes.ts L:914` | `profitabilityController.getPricingConfigs` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:168;177;185;194;203;212 |
| GET | `/pricing/margin-by-provider` | `backend\src\routes\admin.routes.ts L:880` | `profitabilityController.getMarginByProvider` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:320 |
| GET | `/pricing/margin-by-tier` | `backend\src\routes\admin.routes.ts L:863` | `profitabilityController.getMarginByTier` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:311 |
| GET | `/pricing/margin-metrics` | `backend\src\routes\admin.routes.ts L:846` | `profitabilityController.getMarginMetrics` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:302 |
| POST | `/pricing/simulate` | `backend\src\routes\admin.routes.ts L:970` | `profitabilityController.simulatePricing` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:225 |
| GET | `/pricing/top-models` | `backend\src\routes\admin.routes.ts L:898` | `profitabilityController.getTopModels` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:329 |
| GET | `/pricing/vendor-prices` | `backend\src\routes\admin.routes.ts L:943` | `profitabilityController.getVendorPrices` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\pricing.ts L:255 |
| GET | `/rate-limit` | `backend\src\routes\v1.routes.ts L:284` | `creditsController.getRateLimitStatus` | - | - | `authMiddleware` | - |
| POST | `/register` | `backend\src\routes\auth.routes.ts L:81` | `authManagementController.register` | - | - | `-` | backend\src\routes\index.ts L:69 |
| POST | `/reset-password` | `backend\src\routes\auth.routes.ts L:182` | `authManagementController.resetPassword` | - | - | `-` | backend\src\routes\index.ts L:72 |
| GET | `/settings` | `backend\src\routes\admin.routes.ts L:681` | `settingsController.getAllSettings` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\settings.api.ts L:54;64;77;88;99;109<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:135;136;137;138;139;140<br>frontend\src\pages\admin\AdminDashboard.tsx L:448<br>frontend\src\pages\admin\AdminSettings.tsx L:293 |
| GET | `/settings/:category` | `backend\src\routes\admin.routes.ts L:697` | `settingsController.getCategorySettings` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\settings.api.ts L:64;77;88;99;109 |
| PUT | `/settings/:category` | `backend\src\routes\admin.routes.ts L:716` | `settingsController.updateCategorySettings` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\settings.api.ts L:64;77;88;99;109 |
| POST | `/settings/clear-cache` | `backend\src\routes\admin.routes.ts L:753` | `settingsController.clearCache` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\settings.api.ts L:99 |
| POST | `/settings/run-backup` | `backend\src\routes\admin.routes.ts L:768` | `settingsController.runBackup` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\settings.api.ts L:109 |
| POST | `/settings/test-email` | `backend\src\routes\admin.routes.ts L:739` | `settingsController.testEmailConfig` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\settings.api.ts L:88 |
| POST | `/setup` | `backend\src\routes\mfa.routes.ts L:50` | `-` | - | - | `authMiddleware, requireAdmin` | backend\src\routes\index.ts L:73 |
| GET | `/status` | `backend\src\routes\mfa.routes.ts L:526` | `-` | - | - | `authMiddleware, requireAdmin` | backend\src\routes\index.ts L:78 |
| GET | `/subscription-plans` | `backend\src\routes\v1.routes.ts L:189` | `subscriptionsController.listSubscriptionPlans` | `{ plans }` | `500: internal_server_error` | `-` | - |
| GET | `/subscriptions` | `backend\src\routes\admin.routes.ts L:98` | `adminController.getSubscriptionOverview` | `{ status: "success", data: adminController_getSubscriptionOverview_Data }` | `500: internal_error` | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:288<br>frontend\src\api\plan109.ts L:68;79;89;99;110;121;132;142<br>frontend\src\api\plan110.ts L:264;274;285;296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\coverage\lcov-report\src\routes\index.ts.html L:600;612<br>backend\coverage\src\routes\index.ts.html L:600;612<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:94;105;111 |
| POST | `/subscriptions` | `backend\src\routes\plan109.routes.ts L:56` | `subscriptionController.createSubscription` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:288<br>frontend\src\api\plan109.ts L:68;79;89;99;110;121;132;142<br>frontend\src\api\plan110.ts L:264;274;285;296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\coverage\lcov-report\src\routes\index.ts.html L:600;612<br>backend\coverage\src\routes\index.ts.html L:600;612<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:94;105;111 |
| POST | `/subscriptions` | `backend\src\routes\v1.routes.ts L:210` | `subscriptionsController.createSubscription` | `subscriptionsController_createSubscription_Response` | `401: unauthorized`<br>`422: validation_error`<br>`409: conflict`<br>`400: invalid_request`<br>`404: not_found`<br>`402: payment_error`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\admin.ts L:288<br>frontend\src\api\plan109.ts L:68;79;89;99;110;121;132;142<br>frontend\src\api\plan110.ts L:264;274;285;296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\coverage\lcov-report\src\routes\index.ts.html L:600;612<br>backend\coverage\src\routes\index.ts.html L:600;612<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:94;105;111 |
| POST | `/subscriptions/:id/allocate-credits` | `backend\src\routes\plan109.routes.ts L:106` | `subscriptionController.allocateMonthlyCredits` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:142 |
| POST | `/subscriptions/:id/cancel` | `backend\src\routes\plan109.routes.ts L:86` | `subscriptionController.cancelSubscription` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:121 |
| POST | `/subscriptions/:id/downgrade` | `backend\src\routes\plan109.routes.ts L:76` | `subscriptionController.downgradeTier` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:110<br>frontend\src\api\plan110.ts L:296 |
| POST | `/subscriptions/:id/downgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:187` | `prorationController.downgradeWithProration` | `ProrationEvent` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:296 |
| GET | `/subscriptions/:id/proration-history` | `backend\src\routes\plan110.routes.ts L:198` | `prorationController.getProrationHistory` | `ProrationEvent[]` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:264 |
| POST | `/subscriptions/:id/proration-preview` | `backend\src\routes\plan110.routes.ts L:165` | `prorationController.previewProration` | `ProrationPreview` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:274<br>backend\src\routes\index.ts L:105 |
| POST | `/subscriptions/:id/reactivate` | `backend\src\routes\plan109.routes.ts L:96` | `subscriptionController.reactivateSubscription` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:132 |
| POST | `/subscriptions/:id/rollover` | `backend\src\routes\plan109.routes.ts L:116` | `subscriptionController.handleRollover` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/subscriptions/:id/upgrade` | `backend\src\routes\plan109.routes.ts L:66` | `subscriptionController.upgradeTier` | - | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:99<br>frontend\src\api\plan110.ts L:285 |
| POST | `/subscriptions/:id/upgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:176` | `prorationController.upgradeWithProration` | `ProrationEvent` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | frontend\src\api\plan110.ts L:285 |
| GET | `/subscriptions/:userId/features` | `backend\src\routes\plan109.routes.ts L:126` | `subscriptionController.checkFeatureAccess` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/subscriptions/:userId/limits` | `backend\src\routes\plan109.routes.ts L:135` | `subscriptionController.getTierLimits` | - | - | `authMiddleware, requireAdmin` | - |
| GET | `/subscriptions/all` | `backend\src\routes\plan109.routes.ts L:153` | `subscriptionController.listAllSubscriptions` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:68 |
| GET | `/subscriptions/me` | `backend\src\routes\v1.routes.ts L:199` | `subscriptionsController.getCurrentSubscription` | `subscriptionsController_getCurrentSubscription_Response` | `401: unauthorized`<br>`404: no_active_subscription`<br>`500: internal_server_error` | `authMiddleware` | - |
| PATCH | `/subscriptions/me` | `backend\src\routes\v1.routes.ts L:221` | `subscriptionsController.updateSubscription` | `subscriptionsController_updateSubscription_Response` | `401: unauthorized`<br>`422: validation_error`<br>`404: not_found`<br>`400: invalid_request`<br>`402: payment_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/subscriptions/me/cancel` | `backend\src\routes\v1.routes.ts L:232` | `subscriptionsController.cancelSubscription` | `subscriptionsController_cancelSubscription_Response` | `401: unauthorized`<br>`422: validation_error`<br>`404: not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/subscriptions/stats` | `backend\src\routes\plan109.routes.ts L:162` | `subscriptionController.getSubscriptionStats` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:79 |
| GET | `/subscriptions/user/:userId` | `backend\src\routes\plan109.routes.ts L:144` | `subscriptionController.getActiveSubscription` | - | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:89 |
| GET | `/swagger.json` | `backend\src\routes\swagger.routes.ts L:65` | `-` | - | - | `-` | backend\src\routes\index.ts L:61 |
| POST | `/track-download` | `backend\src\routes\branding.routes.ts L:68` | `brandingController.trackDownload` | - | - | `-` | frontend\src\services\api.ts L:242<br>backend\coverage\lcov-report\src\routes\index.ts.html L:616;730<br>backend\coverage\src\routes\index.ts.html L:616;730<br>backend\src\routes\index.ts L:118 |
| GET | `/usage` | `backend\src\routes\admin.routes.ts L:113` | `adminController.getSystemUsage` | `{ status: "success", data: adminController_getSystemUsage_Data }` | `400: invalid_date`<br>`400: invalid_range`<br>`500: internal_error` | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:389<br>backend\coverage\lcov-report\src\routes\index.ts.html L:602;613<br>backend\coverage\src\routes\index.ts.html L:602;613<br>backend\src\routes\index.ts L:96;112<br>backend\src\routes\plan109.routes.ts L:463 |
| GET | `/usage` | `backend\src\routes\v1.routes.ts L:259` | `creditsController.getUsageHistory` | `UsageHistoryResult` | - | `authMiddleware` | frontend\src\api\plan109.ts L:389<br>backend\coverage\lcov-report\src\routes\index.ts.html L:602;613<br>backend\coverage\src\routes\index.ts.html L:602;613<br>backend\src\routes\index.ts L:96;112<br>backend\src\routes\plan109.routes.ts L:463 |
| GET | `/usage/stats` | `backend\src\routes\v1.routes.ts L:271` | `creditsController.getUsageStats` | `UsageStatsResult` | - | `authMiddleware` | - |
| GET | `/user/credits` | `backend\src\routes\api.routes.ts L:138` | `creditsController.getDetailedCredits` | `any` | - | `authMiddleware` | backend\coverage\lcov-report\src\routes\index.ts.html L:607<br>backend\coverage\src\routes\index.ts.html L:607<br>backend\src\routes\index.ts L:101 |
| GET | `/user/profile` | `backend\src\routes\api.routes.ts L:101` | `usersController.getUserProfile` | - | - | `authMiddleware` | backend\coverage\lcov-report\src\routes\index.ts.html L:606<br>backend\coverage\src\routes\index.ts.html L:606<br>backend\src\routes\index.ts L:100 |
| GET | `/users` | `backend\src\routes\admin.routes.ts L:75` | `adminController.listUsers` | `{ status: "success", data: adminController_listUsers_Data }` | `500: internal_error` | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:273;288;304;320;336;352;368<br>frontend\src\api\plan109.ts L:158;169;180;190;201;212;222;233;243;254;479;489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:53<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:76;103;112<br>backend\coverage\lcov-report\src\routes\index.ts.html L:603;611<br>backend\coverage\src\routes\index.ts.html L:603;611<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:22;28;55;275<br>backend\src\routes\index.ts L:97;110<br>backend\src\routes\plan109.routes.ts L:512;521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users` | `backend\src\routes\plan109.routes.ts L:175` | `userManagementController.listUsers` | `PaginatedUsers` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:273;288;304;320;336;352;368<br>frontend\src\api\plan109.ts L:158;169;180;190;201;212;222;233;243;254;479;489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:53<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:76;103;112<br>backend\coverage\lcov-report\src\routes\index.ts.html L:603;611<br>backend\coverage\src\routes\index.ts.html L:603;611<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:22;28;55;275<br>backend\src\routes\index.ts L:97;110<br>backend\src\routes\plan109.routes.ts L:512;521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id` | `backend\src\routes\plan109.routes.ts L:193` | `userManagementController.viewUserDetails` | `UserDetails` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:273;288;304;320;336;352;368<br>frontend\src\api\plan109.ts L:169;180;190;201;212;222;233;243;254;479;489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:28;275<br>backend\src\routes\plan109.routes.ts L:512;521<br>backend\src\routes\plan111.routes.ts L:76 |
| PATCH | `/users/:id` | `backend\src\routes\plan109.routes.ts L:202` | `userManagementController.editUserProfile` | `User` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:273;288;304;320;336;352;368<br>frontend\src\api\plan109.ts L:169;180;190;201;212;222;233;243;254;479;489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:28;275<br>backend\src\routes\plan109.routes.ts L:512;521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id/activity` | `backend\src\routes\admin.routes.ts L:474` | `adminUserDetailController.getUserActivity` | `UserActivityResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:368 |
| POST | `/users/:id/adjust-credits` | `backend\src\routes\plan109.routes.ts L:262` | `userManagementController.adjustUserCredits` | `CreditAdjustment` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:254 |
| POST | `/users/:id/ban` | `backend\src\routes\plan109.routes.ts L:232` | `userManagementController.banUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:222<br>backend\src\middleware\audit.middleware.ts L:8 |
| GET | `/users/:id/coupons` | `backend\src\routes\admin.routes.ts L:425` | `adminUserDetailController.getUserCoupons` | `UserCouponsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:336<br>frontend\src\api\plan111.ts L:88<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id/credits` | `backend\src\routes\admin.routes.ts L:402` | `adminUserDetailController.getUserCredits` | `UserCreditsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:320 |
| GET | `/users/:id/licenses` | `backend\src\routes\admin.routes.ts L:377` | `adminUserDetailController.getUserLicenses` | `UserLicensesResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:304 |
| GET | `/users/:id/overview` | `backend\src\routes\admin.routes.ts L:332` | `adminUserDetailController.getUserOverview` | `UserOverviewResponse` | `400: invalid_parameter`<br>`404: not_found`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:273 |
| GET | `/users/:id/payments` | `backend\src\routes\admin.routes.ts L:451` | `adminUserDetailController.getUserPayments` | `UserPaymentsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:352 |
| PATCH | `/users/:id/role` | `backend\src\routes\admin.routes.ts L:622` | `-` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/users/:id/subscriptions` | `backend\src\routes\admin.routes.ts L:354` | `adminUserDetailController.getUserSubscriptions` | `UserSubscriptionsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\admin.ts L:288 |
| POST | `/users/:id/suspend` | `backend\src\routes\admin.routes.ts L:87` | `adminController.suspendUser` | `{ status: "success", data: adminController_suspendUser_Data }` | `404: not_found`<br>`500: internal_error` | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:201 |
| POST | `/users/:id/suspend` | `backend\src\routes\plan109.routes.ts L:212` | `userManagementController.suspendUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:201 |
| POST | `/users/:id/unban` | `backend\src\routes\plan109.routes.ts L:242` | `userManagementController.unbanUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:233 |
| POST | `/users/:id/unsuspend` | `backend\src\routes\plan109.routes.ts L:222` | `userManagementController.unsuspendUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:212 |
| POST | `/users/bulk-update` | `backend\src\routes\plan109.routes.ts L:252` | `userManagementController.bulkUpdateUsers` | `BulkOperationResult` | - | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan109.ts L:243 |
| GET | `/users/me` | `backend\src\routes\v1.routes.ts L:55` | `usersController.getCurrentUser` | `UserProfileResponse` | - | `authMiddleware` | - |
| PATCH | `/users/me` | `backend\src\routes\v1.routes.ts L:67` | `usersController.updateCurrentUser` | `UserProfileResponse` | - | `authMiddleware` | - |
| GET | `/users/me/preferences` | `backend\src\routes\v1.routes.ts L:79` | `usersController.getUserPreferences` | `UserPreferencesResponse` | - | `authMiddleware` | - |
| PATCH | `/users/me/preferences` | `backend\src\routes\v1.routes.ts L:91` | `usersController.updateUserPreferences` | `UserPreferencesResponse` | - | `authMiddleware` | - |
| GET | `/users/me/preferences/model` | `backend\src\routes\v1.routes.ts L:115` | `usersController.getDefaultModel` | `DefaultModelResponse` | - | `authMiddleware` | - |
| POST | `/users/me/preferences/model` | `backend\src\routes\v1.routes.ts L:103` | `usersController.setDefaultModel` | `DefaultModelResponse` | - | `authMiddleware` | - |
| GET | `/users/search` | `backend\src\routes\plan109.routes.ts L:184` | `userManagementController.searchUsers` | `User[]` | - | `authMiddleware, requireAdmin` | frontend\src\api\plan109.ts L:169 |
| POST | `/verify-email` | `backend\src\routes\auth.routes.ts L:114` | `authManagementController.verifyEmail` | - | - | `-` | backend\src\routes\index.ts L:70 |
| POST | `/verify-login` | `backend\src\routes\mfa.routes.ts L:197` | `-` | - | - | `-` | backend\src\routes\index.ts L:75 |
| POST | `/verify-setup` | `backend\src\routes\mfa.routes.ts L:104` | `-` | - | - | `authMiddleware, requireAdmin` | backend\src\routes\index.ts L:74 |
| GET | `/version` | `backend\src\routes\branding.routes.ts L:128` | `brandingController.getLatestVersion` | - | - | `-` | frontend\src\api\plan110.ts L:206<br>frontend\src\services\api.ts L:254<br>backend\coverage\lcov-report\src\routes\index.ts.html L:619;748<br>backend\coverage\src\routes\index.ts.html L:619;748<br>backend\src\routes\index.ts L:121<br>backend\src\routes\plan110.routes.ts L:121 |
| DELETE | `/webhooks/config` | `backend\src\routes\v1.routes.ts L:321` | `webhooksController.deleteWebhookConfig` | `webhooksController_deleteWebhookConfig_Response` | `404: not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/webhooks/config` | `backend\src\routes\v1.routes.ts L:299` | `webhooksController.getWebhookConfig` | `webhooksController_getWebhookConfig_Response` | `404: not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/webhooks/config` | `backend\src\routes\v1.routes.ts L:310` | `webhooksController.setWebhookConfig` | `WebhookConfig` | `422: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/webhooks/stripe` | `backend\src\routes\index.ts L:273` | `subscriptionsController.handleStripeWebhook` | `{ received: true }` | `400: invalid_request`<br>`401: unauthorized`<br>`500: internal_server_error` | `-` | - |
| POST | `/webhooks/test` | `backend\src\routes\admin.routes.ts L:123` | `adminController.testWebhook` | `{ status: "success", data: adminController_testWebhook_Data }` | `400: invalid_input`<br>`400: invalid_url`<br>`500: internal_error` | `authMiddleware, requireAdmin` | - |
| POST | `/webhooks/test` | `backend\src\routes\v1.routes.ts L:332` | `webhooksController.testWebhook` | `webhooksController_testWebhook_Response` | `404: not_found`<br>`422: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |

---

## Identity Provider (OAuth 2.0/OIDC)

**Base URL:** `http://localhost:7151`

**Total Endpoints:** 14

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/.well-known/openid-configuration` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/health` | `identity-provider\src\app.ts L:48` | `-` | - | - | `-` | frontend\src\services\api.ts L:236 |
| GET | `/interaction/:uid` | `identity-provider\src\app.ts L:57` | `authController.interaction` | - | - | `-` | identity-provider\src\views\consent.html L:294;358;374<br>identity-provider\src\views\login.html L:233;270;277 |
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

- **Total Endpoints:** 214
- **Endpoints with Usages:** 132
- **Total Usage References:** 3067
- **Unused Endpoints:** 82

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 14
- **Endpoints with Usages:** 7
- **Total Usage References:** 14
- **Unused Endpoints:** 7

---

## Schemas

Referenced TypeScript types and interfaces used in API responses:

### adminController_getMetrics_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 63)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:63
type adminController_getMetrics_Data = {
        downloads,
        feedback: {
          total: totalFeedback,
          recentCount: recentFeedbackCount,
        },
        diagnostics: {
          total: diagnosticStats._count.id || 0,
          totalSize: diagnosticStats._sum.fileSize || 0,
        },
        timestamps: {
          firstDownload: firstDownload?.timestamp.toISOString() || null,
          lastDownload: lastDownload?.timestamp.toISOString() || null,
        },
      }
```

### adminController_getSubscriptionOverview_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 98)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:98
type adminController_getSubscriptionOverview_Data = {
        subscriptionStats: stats.map((s) => ({
          tier: s.tier,
          status: s.status,
          count: s._count.id,
        })),
        totalActive,
        byTier,
        byStatus,
      }
```

### adminController_getSystemUsage_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 113)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:113
type adminController_getSystemUsage_Data = {
        totalOperations: aggregates._count.id || 0,
        totalCreditsUsed: aggregates._sum.creditsUsed || 0,
        byModel: byModel.map((m: any) => ({
          modelId: m.modelId,
          operations: m._count.id,
          creditsUsed: m._sum.creditsUsed || 0,
        })),
        byOperation: byOperation.map((o: any) => ({
          operationType: o.operation,
          operations: o._count.id,
          creditsUsed: o._sum.creditsUsed || 0,
        })),
        dateRange: {
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
        },
      }
```

### adminController_listUsers_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 75)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:75
type adminController_listUsers_Data = {
          const activeSubscription = user.subscriptions[0] || null;
          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt.toISOString(),
            lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
            subscription: activeSubscription
              ? {
                  tier: activeSubscription.tier,
                  status: activeSubscription.status,
                  currentPeriodStart: activeSubscription.currentPeriodStart.toISOString(),
                  currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
                }
              : null,
          };
        }
```

### adminController_suspendUser_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 87)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:87
type adminController_suspendUser_Data = {
        message: `User ${id} suspended`,
        note: 'Suspension functionality requires User model update (add suspended field)',
      }
```

### adminController_testWebhook_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 123)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:123
type adminController_testWebhook_Data = {
        message: 'Test webhook functionality pending',
        note: 'Requires WebhookService.sendTestWebhook implementation',
        payload: testPayload,
      }
```

### analyticsController_getARR_Data

**Source:** `backend\src\routes\plan109.routes.ts` (Line 493)

```typescript
// Controller response data from backend\src\routes\plan109.routes.ts:493
type analyticsController_getARR_Data = {
        arr,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      }
```

### analyticsController_getChurnRate_Data

**Source:** `backend\src\routes\plan109.routes.ts` (Line 529)

```typescript
// Controller response data from backend\src\routes\plan109.routes.ts:529
type analyticsController_getChurnRate_Data = {
        churnRate,
        period,
        timestamp: new Date().toISOString(),
      }
```

### analyticsController_getCreditUtilizationRate_Data

**Source:** `backend\src\routes\plan109.routes.ts` (Line 538)

```typescript
// Controller response data from backend\src\routes\plan109.routes.ts:538
type analyticsController_getCreditUtilizationRate_Data = {
        creditUtilizationRate: utilizationRate,
        timestamp: new Date().toISOString(),
      }
```

### analyticsController_getFreeToProConversionRate_Data

**Source:** `backend\src\routes\plan109.routes.ts` (Line 547)

```typescript
// Controller response data from backend\src\routes\plan109.routes.ts:547
type analyticsController_getFreeToProConversionRate_Data = {
        freeToProConversionRate: conversionRate,
        timestamp: new Date().toISOString(),
      }
```

### analyticsController_getMRR_Data

**Source:** `backend\src\routes\plan109.routes.ts` (Line 484)

```typescript
// Controller response data from backend\src\routes\plan109.routes.ts:484
type analyticsController_getMRR_Data = {
        mrr,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      }
```

### analyticsController_getRevenueMetrics_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 475)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:475
type analyticsController_getRevenueMetrics_Response = {
        totalMRR: mrr,
        totalARR: arr,
        avgRevenuePerUser: arpu,
        totalRevenueThisMonth: totalRevenueThisMonth,
        mrrGrowth: mrrGrowth,
      }
```

### analyticsController_getTotalActiveUsers_Data

**Source:** `backend\src\routes\plan109.routes.ts` (Line 511)

```typescript
// Controller response data from backend\src\routes\plan109.routes.ts:511
type analyticsController_getTotalActiveUsers_Data = {
        totalActiveUsers: totalUsers,
        timestamp: new Date().toISOString(),
      }
```

### auditLogController_getAuditLogs_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 278)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:278
type auditLogController_getAuditLogs_Data = {
        total,
        page: Math.floor(filters.offset / filters.limit),
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
        hasMore: filters.offset + logs.length < total
      }
```

### billingController_addPaymentMethod_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 276)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:276
type billingController_addPaymentMethod_Response = {
        success: true,
        message: 'Payment method added successfully',
      }
```

### billingController_removePaymentMethod_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 286)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:286
type billingController_removePaymentMethod_Response = {
        success: true,
        message: 'Payment method removed successfully',
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

### campaignController_getSingleCampaign_Response

**Source:** `backend\src\routes\plan111.routes.ts` (Line 205)

```typescript
// Inline response from backend\src\routes\plan111.routes.ts:205
type campaignController_getSingleCampaign_Response = {
        id: campaign.id,
        name: campaign.campaignName, // Renamed from campaign_name
        type: campaign.campaignType, // Renamed from campaign_type
        starts_at: campaign.startDate.toISOString(), // Renamed from start_date
        ends_at: campaign.endDate.toISOString(), // Renamed from end_date
        status, // Computed field
        budget_cap: parseFloat(campaign.budgetLimitUsd.toString()),
        current_spend: parseFloat(campaign.totalSpentUsd.toString()),
        // Note: description field doesn't exist in schema
        target_audience: campaign.targetTier ? { user_tiers: [campaign.targetTier] } : undefined,
        is_active: campaign.isActive,
        coupon_count: (campaign as any).coupons?.length || 0,
        created_at: campaign.createdAt.toISOString(),
        updated_at: campaign.updatedAt.toISOString(),
      }
```

### CouponCampaign

**Source:** `shared-types\src\coupon.types.ts` (Line 132)

```typescript
export interface CouponCampaign {
  id: string;
  name: string; // Renamed from campaignName
  type: CampaignType; // Renamed from campaignType

  // Timing
  startsAt: string; // Renamed from startDate
  endsAt: string; // Renamed from endDate

  // Computed status field (not in DB)
  status: CampaignStatus; // planning | active | paused | ended

  // Budget
  budgetCap: number; // Renamed from budgetLimitUsd
  currentSpend: number; // Renamed from totalSpentUsd

  // Computed analytics fields (not in DB)
  actualRevenue?: number; // Aggregate from redemptions
  redemptionsCount?: number; // Count from coupons
  conversionRate?: number; // Percentage

  // Targeting
  targetAudience?: {
    userTiers?: SubscriptionTier[];
  };

  // Status
  isActive: boolean;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### couponController_getCouponRedemptions_Data

**Source:** `backend\src\routes\plan111.routes.ts` (Line 145)

```typescript
// Controller response data from backend\src\routes\plan111.routes.ts:145
type couponController_getCouponRedemptions_Data = {
        redemptions: mappedRedemptions,
        stats
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

### DashboardKPIsResponse

**Source:** `backend\src\types\admin-analytics.types.ts` (Line 76)

```typescript
export interface DashboardKPIsResponse {
  totalRevenue: TotalRevenueKPI;
  activeUsers: ActiveUsersKPI;
  creditsConsumed: CreditsConsumedKPI;
  couponRedemptions: CouponRedemptionsKPI;
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

### GetAllProrations_Response

**Source:** `backend\src\services\proration.service.ts` (Line 463)

```typescript
// Service method return type from proration.service.ts
type GetAllProrations_Response = { data: ProrationEvent[]; total: number; totalPages: number }
```

### GetCalculationBreakdown_Response

**Source:** `backend\src\services\proration.service.ts` (Line 704)

```typescript
// Service method return type from proration.service.ts
type GetCalculationBreakdown_Response = {
    originalTier: string;
    originalPrice: number;
    newTier: string;
    newPrice: number;
    billingCycle: number;
    changeDate: string;
    daysRemaining: number;
    steps: {
      unusedCredit: { calculation: string; amount: number };
      newTierCost: { calculation: string; amount: number };
      netCharge: { calculation: string; amount: number };
    };
    stripeInvoiceUrl?: string;
    status: string;
  }
```

### GetCampaignPerformance_Response

**Source:** `backend\src\services\campaign-management.service.ts` (Line 116)

```typescript
// Service method return type from campaign-management.service.ts
type GetCampaignPerformance_Response = {
    campaignName: string;
    totalRedemptions: number;
    totalDiscountUsd: number;
    budgetUtilization: number;
    conversionRate: number;
    topCouponCode: string | null;
  }
```

### GetMigrationHistory_Response

**Source:** `backend\src\services\migration.service.ts` (Line 422)

```typescript
// Service method return type from migration.service.ts
type GetMigrationHistory_Response = {
    perpetualLicenses: any[];
    subscriptions: any[];
  }
```

### GetModelForInference_Response

**Source:** `backend\src\services\model.service.ts` (Line 403)

```typescript
// Service method return type from model.service.ts
type GetModelForInference_Response = {
    id: string;
    provider: string;
    creditsPer1kTokens: number;
    isAvailable: boolean;
  } | null> {
    logger.debug('ModelService: Getting model for inference', { modelId });

    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        provider: true,
        creditsPer1kTokens: true,
        isAvailable: true,
        isDeprecated: true,
        isArchived: true,
      },
    });

    // Reject if model is not available, deprecated, or archived
    if (!model || !model.isAvailable || model.isDeprecated || model.isArchived) {
      logger.warn('ModelService: Model not available for inference', {
        modelId,
        reason: !model
          ? 'not_found'
          : model.isArchived
          ? 'archived'
          : model.isDeprecated
          ? 'deprecated'
          : 'unavailable',
      });
      return null;
    }

    return {
      id: model.id,
      provider: model.provider,
      creditsPer1kTokens: model.creditsPer1kTokens ?? 0,
      isAvailable: model.isAvailable,
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
      const models = await this.prisma.model.findMany({
        where: { isAvailable: true },
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

### GetProrationStats_Response

**Source:** `backend\src\services\proration.service.ts` (Line 568)

```typescript
// Service method return type from proration.service.ts
type GetProrationStats_Response = {
    totalProrations: number;
    netRevenue: number;
    avgNetCharge: number;
    pendingProrations: number;
  }
```

### Invoice

**Source:** `backend\src\services\billing-payments.service.ts` (Line 28)

```typescript
export interface Invoice {
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
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
}
```

### ListAllInvoices_Response

**Source:** `backend\src\services\billing-payments.service.ts` (Line 724)

```typescript
// Service method return type from billing-payments.service.ts
type ListAllInvoices_Response = {
    data: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
```

### ListAllTransactions_Response

**Source:** `backend\src\services\billing-payments.service.ts` (Line 766)

```typescript
// Service method return type from billing-payments.service.ts
type ListAllTransactions_Response = {
    data: PaymentTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
```

### migrationController_getTradeInValue_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 235)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:235
type migrationController_getTradeInValue_Response = {
        license_id: licenseId,
        trade_in_value_usd: tradeInValue,
        message: `Your perpetual license has a trade-in value of $${tradeInValue.toFixed(2)}`,
      }
```

### ModelDetailsResponse

**Source:** `backend\src\types\model-validation.ts` (Line 230)

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

**Source:** `backend\src\types\model-validation.ts` (Line 221)

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

### PaymentTransaction

**Source:** `shared-types\src\billing.types.ts` (Line 43)

```typescript
export interface PaymentTransaction {
  id: string;
  userId: string;
  invoiceId: string | null;
  subscriptionId: string | null;
  stripePaymentIntentId: string;
  amount: number; // USD
  currency: string;
  status: PaymentStatus;
  paymentMethodType: string | null; // 'card' | 'bank_account' | 'paypal'
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
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

### RecentActivityResponse

**Source:** `backend\src\types\admin-analytics.types.ts` (Line 136)

```typescript
export interface RecentActivityResponse {
  events: ActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}
```

### subscriptionsController_cancelSubscription_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 232)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:232
type subscriptionsController_cancelSubscription_Response = {
        id: subscription.id,
        status: subscription.status,
        cancelled_at: subscription.cancelledAt?.toISOString() || null,
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        current_period_end: subscription.currentPeriodEnd.toISOString(),
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
        credits_per_month: subscription.creditsPerMonth,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        created_at: subscription.createdAt.toISOString(),
      }
```

### subscriptionsController_getCurrentSubscription_Response

**Source:** `backend\src\routes\v1.routes.ts` (Line 199)

```typescript
// Inline response from backend\src\routes\v1.routes.ts:199
type subscriptionsController_getCurrentSubscription_Response = {
        id: subscription.id,
        user_id: subscription.userId,
        tier: subscription.tier,
        status: subscription.status,
        credits_per_month: subscription.creditsPerMonth,
        credits_rollover: subscription.creditsRollover,
        billing_interval: subscription.billingInterval,
        price_cents: subscription.priceCents,
        current_period_start: subscription.currentPeriodStart.toISOString(),
        current_period_end: subscription.currentPeriodEnd.toISOString(),
        trial_end: subscription.trialEnd?.toISOString() || null,
        created_at: subscription.createdAt.toISOString(),
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
        credits_per_month: subscription.creditsPerMonth,
        price_cents: subscription.priceCents,
        billing_interval: subscription.billingInterval,
        updated_at: subscription.updatedAt.toISOString(),
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

### UserActivityResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 284)

```typescript
export interface UserActivityResponse {
  activities: UserActivityItem[];
  total: number;
  limit: number;
  offset: number;
}
```

### UserCouponsResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 220)

```typescript
export interface UserCouponsResponse {
  redemptions: CouponRedemptionItem[];
  fraudFlags: FraudFlagItem[];
  totalDiscountValue: number;
  total: number;
  limit: number;
  offset: number;
}
```

### UserCreditsResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 174)

```typescript
export interface UserCreditsResponse {
  balance: {
    amount: number;
    lastUpdated: Date;
  };
  allocations: CreditAllocationItem[];
  usage: CreditUsageByModel[];
  deductions: CreditDeductionItem[];
  totalAllocations: number;
  totalUsage: number;
  totalDeductions: number;
}
```

### UserLicensesResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 135)

```typescript
export interface UserLicensesResponse {
  licenses: LicenseItem[];
  upgrades: UpgradeItem[];
  total: number;
  limit: number;
  offset: number;
}
```

### UserOverviewResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 46)

```typescript
export interface UserOverviewResponse {
  user: UserOverviewUser;
  currentSubscription: CurrentSubscription | null;
  currentLicense: CurrentLicense | null;
  creditBalance: number;
  stats: {
    totalSubscriptions: number;
    totalLicenses: number;
    creditsConsumed: number;
    couponsRedeemed: number;
  };
}
```

### UserPaymentsResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 254)

```typescript
export interface UserPaymentsResponse {
  invoices: InvoiceItem[];
  paymentMethod: PaymentMethod | null;
  stripeCustomerId: string | null;
  total: number;
  limit: number;
  offset: number;
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

### UserSubscriptionsResponse

**Source:** `backend\src\types\admin-user-detail.types.ts` (Line 90)

```typescript
export interface UserSubscriptionsResponse {
  subscriptions: SubscriptionItem[];
  prorations: ProrationItem[];
  total: number;
  limit: number;
  offset: number;
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
        user_id: configWithoutSecret.userId,
        webhook_url: configWithoutSecret.webhookUrl,
        is_active: configWithoutSecret.isActive,
        created_at: configWithoutSecret.createdAt.toISOString(),
        updated_at: configWithoutSecret.updatedAt.toISOString(),
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

