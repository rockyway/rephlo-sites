# API Endpoints Analysis Report (Simple Format)

**Generated:** 2025-11-12T21:24:40.390Z
**Format:** Simple
**Include Tests:** No

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 206

| Method | Endpoint | File | Handler | Middleware | Usages |
|--------|----------|------|---------|------------|--------|
| GET | `/admin/analytics/coupons` | `backend\src\routes\plan111.routes.ts L:276` | `-` | `-` | - |
| GET | `/admin/analytics/coupons/by-type` | `backend\src\routes\plan111.routes.ts L:324` | `analyticsController.getTopPerformingCoupons` | `authenticate, auditLog` | - |
| GET | `/admin/analytics/coupons/top` | `backend\src\routes\plan111.routes.ts L:309` | `analyticsController.getRedemptionTrend` | `authenticate, auditLog` | - |
| GET | `/admin/analytics/coupons/trend` | `backend\src\routes\plan111.routes.ts L:293` | `analyticsController.getAnalyticsMetrics` | `authenticate, auditLog` | - |
| GET | `/admin/analytics/upgrade-conversion` | `backend\src\routes\plan110.routes.ts L:442` | `upgradeController.getUpgradeConversion` | `authenticate` | - |
| GET | `/admin/campaigns` | `backend\src\routes\plan111.routes.ts L:145` | `couponController.getCouponRedemptions` | `authenticate, auditLog` | - |
| POST | `/admin/campaigns` | `backend\src\routes\plan111.routes.ts L:158` | `campaignController.createCampaign` | `authenticate, auditLog` | - |
| DELETE | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:182` | `campaignController.deleteCampaign` | `authenticate, auditLog` | - |
| GET | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:194` | `campaignController.listCampaigns` | `authenticate` | - |
| PATCH | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:170` | `campaignController.updateCampaign` | `authenticate, auditLog` | - |
| POST | `/admin/campaigns/:id/assign-coupon` | `backend\src\routes\plan111.routes.ts L:227` | `campaignController.assignCoupon` | `authenticate, auditLog` | - |
| GET | `/admin/campaigns/:id/performance` | `backend\src\routes\plan111.routes.ts L:205` | `campaignController.getSingleCampaign` | `authenticate` | - |
| DELETE | `/admin/campaigns/:id/remove-coupon/:couponId` | `backend\src\routes\plan111.routes.ts L:239` | `campaignController.removeCoupon` | `authenticate, auditLog` | - |
| GET | `/admin/coupons` | `backend\src\routes\plan111.routes.ts L:75` | `couponController.getUserCoupons` | `authenticate, auditLog` | - |
| POST | `/admin/coupons` | `backend\src\routes\plan111.routes.ts L:87` | `couponController.createCoupon` | `authenticate, auditLog` | - |
| DELETE | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:111` | `couponController.deleteCoupon` | `authenticate, auditLog` | - |
| GET | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:123` | `couponController.listCoupons` | `authenticate` | - |
| PATCH | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:99` | `couponController.updateCoupon` | `authenticate, auditLog` | - |
| GET | `/admin/coupons/:id/redemptions` | `backend\src\routes\plan111.routes.ts L:134` | `couponController.getSingleCoupon` | `authenticate` | - |
| GET | `/admin/fraud-detection` | `backend\src\routes\plan111.routes.ts L:253` | `fraudController.listFraudEvents` | `authenticate` | - |
| PATCH | `/admin/fraud-detection/:id/review` | `backend\src\routes\plan111.routes.ts L:264` | `fraudController.reviewFraudEvent` | `authenticate, auditLog` | - |
| GET | `/admin/fraud-detection/pending` | `backend\src\routes\plan111.routes.ts L:276` | `fraudController.getPendingReviews` | `authenticate` | - |
| GET | `/admin/licenses` | `backend\src\routes\plan110.routes.ts L:298` | `licenseController.listAllLicenses` | `authenticate` | - |
| POST | `/admin/licenses/:id/revoke` | `backend\src\routes\plan110.routes.ts L:272` | `licenseController.suspendLicense` | `authenticate, auditLog` | - |
| POST | `/admin/licenses/:id/suspend` | `backend\src\routes\plan110.routes.ts L:272` | `licenseController.suspendLicense` | `authenticate, auditLog` | - |
| GET | `/admin/licenses/devices` | `backend\src\routes\plan110.routes.ts L:326` | `deviceActivationController.getAllDeviceActivations` | `authenticate` | - |
| POST | `/admin/licenses/devices/:id/deactivate` | `backend\src\routes\plan110.routes.ts L:348` | `deviceActivationController.deactivateDevice` | `authenticate, auditLog` | - |
| POST | `/admin/licenses/devices/:id/revoke` | `backend\src\routes\plan110.routes.ts L:348` | `deviceActivationController.deactivateDevice` | `authenticate, auditLog` | - |
| POST | `/admin/licenses/devices/bulk-action` | `backend\src\routes\plan110.routes.ts L:360` | `deviceActivationController.revokeDevice` | `authenticate, auditLog` | - |
| GET | `/admin/licenses/devices/stats` | `backend\src\routes\plan110.routes.ts L:326` | `deviceActivationController.getAllDeviceActivations` | `authenticate` | - |
| GET | `/admin/licenses/stats` | `backend\src\routes\plan110.routes.ts L:298` | `licenseController.listAllLicenses` | `authenticate` | - |
| GET | `/admin/prorations` | `backend\src\routes\plan110.routes.ts L:389` | `prorationController.listAllProrations` | `authenticate` | - |
| GET | `/admin/prorations/:id/calculation` | `backend\src\routes\plan110.routes.ts L:426` | `prorationController.getCalculationBreakdown` | `authenticate` | - |
| POST | `/admin/prorations/:id/reverse` | `backend\src\routes\plan110.routes.ts L:413` | `prorationController.reverseProration` | `authenticate, auditLog` | - |
| GET | `/admin/prorations/stats` | `backend\src\routes\plan110.routes.ts L:389` | `prorationController.listAllProrations` | `authenticate` | - |
| GET | `/analytics/churn-rate` | `backend\src\routes\plan109.routes.ts L:520` | `analyticsController.getUsersByTier` | `-` | frontend\src\api\plan109.ts L:499 |
| GET | `/analytics/conversion-rate` | `backend\src\routes\plan109.routes.ts L:538` | `analyticsController.getCreditUtilizationRate` | `-` | frontend\src\api\plan109.ts L:510 |
| GET | `/analytics/credit-utilization` | `backend\src\routes\plan109.routes.ts L:529` | `analyticsController.getChurnRate` | `-` | frontend\src\api\plan109.ts L:421 |
| GET | `/analytics/dashboard` | `backend\src\routes\plan109.routes.ts L:547` | `analyticsController.getFreeToProConversionRate` | `-` | frontend\src\api\admin.ts L:205<br>frontend\src\api\plan109.ts L:449 |
| GET | `/analytics/dashboard-kpis` | `backend\src\routes\admin.routes.ts L:145` | `adminAnalyticsController.getDashboardKPIs` | `auditLog` | frontend\src\api\admin.ts L:205 |
| GET | `/analytics/recent-activity` | `backend\src\routes\admin.routes.ts L:145` | `-` | `-` | frontend\src\api\admin.ts L:220 |
| GET | `/analytics/revenue` | `backend\src\routes\plan109.routes.ts L:475` | `analyticsController.getRevenueMetrics` | `-` | frontend\src\api\admin.ts L:600<br>frontend\src\api\admin.ts L:614<br>frontend\src\api\admin.ts L:628<br>frontend\src\api\admin.ts L:642<br>frontend\src\api\admin.ts L:658<br>frontend\src\api\admin.ts L:674<br>frontend\src\api\plan109.ts L:340<br>frontend\src\api\plan109.ts L:351<br>frontend\src\api\plan109.ts L:459<br>frontend\src\api\plan109.ts L:469<br>frontend\src\api\plan109.ts L:524<br>frontend\src\api\plan109.ts L:568<br>frontend\src\api\plan109.ts L:624<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:125<br>frontend\src\utils\breadcrumbs.ts L:83 |
| GET | `/analytics/revenue/arr` | `backend\src\routes\plan109.routes.ts L:484` | `analyticsController.getMRR` | `-` | frontend\src\api\plan109.ts L:469 |
| GET | `/analytics/revenue/by-tier` | `backend\src\routes\plan109.routes.ts L:493` | `analyticsController.getARR` | `-` | frontend\src\api\plan109.ts L:351 |
| GET | `/analytics/revenue/conversion-funnel` | `backend\src\routes\admin.routes.ts L:537` | `-` | `-` | frontend\src\api\admin.ts L:642 |
| GET | `/analytics/revenue/coupon-roi` | `backend\src\routes\admin.routes.ts L:583` | `revenueAnalyticsController.getCreditUsage` | `auditLog` | frontend\src\api\admin.ts L:674 |
| GET | `/analytics/revenue/credit-usage` | `backend\src\routes\admin.routes.ts L:566` | `revenueAnalyticsController.getRevenueFunnel` | `auditLog` | frontend\src\api\admin.ts L:658<br>frontend\src\api\plan109.ts L:624 |
| GET | `/analytics/revenue/funnel` | `backend\src\routes\admin.routes.ts L:555` | `revenueAnalyticsController.getRevenueFunnel` | `auditLog` | frontend\src\api\plan109.ts L:524 |
| GET | `/analytics/revenue/kpis` | `backend\src\routes\admin.routes.ts L:498` | `revenueAnalyticsController.getRevenueKPIs` | `auditLog` | frontend\src\api\admin.ts L:600 |
| GET | `/analytics/revenue/mix` | `backend\src\routes\admin.routes.ts L:498` | `-` | `-` | frontend\src\api\admin.ts L:614 |
| GET | `/analytics/revenue/mrr` | `backend\src\routes\plan109.routes.ts L:475` | `analyticsController.getRevenueMetrics` | `-` | frontend\src\api\plan109.ts L:459 |
| GET | `/analytics/revenue/trend` | `backend\src\routes\admin.routes.ts L:516` | `-` | `-` | frontend\src\api\admin.ts L:628<br>frontend\src\api\plan109.ts L:568 |
| GET | `/analytics/users/by-tier` | `backend\src\routes\plan109.routes.ts L:511` | `analyticsController.getTotalActiveUsers` | `-` | frontend\src\api\plan109.ts L:489 |
| GET | `/analytics/users/total` | `backend\src\routes\plan109.routes.ts L:502` | `analyticsController.getRevenueByTier` | `-` | frontend\src\api\plan109.ts L:479 |
| POST | `/api/coupons/redeem` | `backend\src\routes\plan111.routes.ts L:56` | `couponController.validateCoupon` | `authenticate` | - |
| POST | `/api/coupons/validate` | `backend\src\routes\plan111.routes.ts L:56` | `couponController.validateCoupon` | `-` | - |
| GET | `/api/users/:userId/coupons` | `backend\src\routes\plan111.routes.ts L:75` | `couponController.getUserCoupons` | `authenticate` | - |
| GET | `/audit-logs` | `backend\src\routes\admin.routes.ts L:184` | `modelTierAdminController.listModelsWithTiers` | `-` | frontend\src\api\admin.ts L:163<br>backend\src\routes\admin.routes.ts L:202 |
| GET | `/audit-logs/admin/:adminUserId` | `backend\src\routes\admin.routes.ts L:294` | `auditLogController.getLogsForResource` | `-` | - |
| GET | `/audit-logs/resource/:resourceType/:resourceId` | `backend\src\routes\admin.routes.ts L:278` | `auditLogController.getAuditLogs` | `-` | - |
| POST | `/backup-code-login` | `backend\src\routes\mfa.routes.ts L:399` | `-` | `-` | backend\src\routes\index.ts L:76 |
| GET | `/billing/dunning` | `backend\src\routes\admin.routes.ts L:808` | `billingController.listTransactions` | `auditLog` | frontend\src\api\plan109.ts L:320<br>frontend\src\api\plan109.ts L:330 |
| POST | `/billing/dunning/:attemptId/retry` | `backend\src\routes\plan109.routes.ts L:342` | `billingController.refundTransaction` | `auditLog` | frontend\src\api\plan109.ts L:330 |
| GET | `/billing/invoices` | `backend\src\routes\admin.routes.ts L:790` | `billingController.listInvoices` | `auditLog` | frontend\src\api\plan109.ts L:271<br>frontend\src\api\plan109.ts L:281<br>frontend\src\api\plan109.ts L:282 |
| POST | `/billing/invoices/:subscriptionId` | `backend\src\routes\plan109.routes.ts L:305` | `billingController.createInvoice` | `auditLog` | frontend\src\api\plan109.ts L:271<br>frontend\src\api\plan109.ts L:281 |
| GET | `/billing/invoices/:userId` | `backend\src\routes\plan109.routes.ts L:315` | `billingController.getUpcomingInvoice` | `-` | frontend\src\api\plan109.ts L:271<br>frontend\src\api\plan109.ts L:281 |
| GET | `/billing/invoices/upcoming/:userId` | `backend\src\routes\plan109.routes.ts L:315` | `billingController.getUpcomingInvoice` | `-` | frontend\src\api\plan109.ts L:271 |
| POST | `/billing/payment-methods` | `backend\src\routes\plan109.routes.ts L:276` | `billingController.addPaymentMethod` | `auditLog` | - |
| DELETE | `/billing/payment-methods/:id` | `backend\src\routes\plan109.routes.ts L:286` | `billingController.removePaymentMethod` | `auditLog` | - |
| GET | `/billing/payment-methods/:userId` | `backend\src\routes\plan109.routes.ts L:296` | `billingController.listPaymentMethods` | `-` | - |
| GET | `/billing/transactions` | `backend\src\routes\admin.routes.ts L:790` | `-` | `-` | frontend\src\api\plan109.ts L:295<br>frontend\src\api\plan109.ts L:296<br>frontend\src\api\plan109.ts L:309 |
| POST | `/billing/transactions/:id/refund` | `backend\src\routes\plan109.routes.ts L:342` | `billingController.refundTransaction` | `auditLog` | frontend\src\api\plan109.ts L:309 |
| GET | `/billing/transactions/:userId` | `backend\src\routes\plan109.routes.ts L:324` | `billingController.listInvoices` | `-` | frontend\src\api\plan109.ts L:295<br>frontend\src\api\plan109.ts L:309 |
| POST | `/chat/completions` | `backend\src\routes\v1.routes.ts L:159` | `modelsController.textCompletion` | `authenticate` | backend\src\routes\index.ts L:92 |
| POST | `/completions` | `backend\src\routes\v1.routes.ts L:159` | `modelsController.textCompletion` | `authenticate` | backend\src\middleware\credit.middleware.ts L:8<br>backend\src\routes\index.ts L:91<br>backend\src\routes\index.ts L:92<br>backend\src\routes\v1.routes.ts L:173 |
| POST | `/credits/allocate` | `backend\src\routes\plan109.routes.ts L:366` | `creditController.allocateSubscriptionCredits` | `auditLog` | - |
| GET | `/credits/balance/:userId` | `backend\src\routes\plan109.routes.ts L:435` | `creditController.reconcileCreditBalance` | `-` | frontend\src\api\plan109.ts L:368 |
| POST | `/credits/deduct` | `backend\src\routes\plan109.routes.ts L:386` | `creditController.grantBonusCredits` | `auditLog` | - |
| POST | `/credits/grant-bonus` | `backend\src\routes\plan109.routes.ts L:376` | `creditController.processMonthlyAllocations` | `auditLog` | frontend\src\api\plan109.ts L:400 |
| GET | `/credits/history/:userId` | `backend\src\routes\plan109.routes.ts L:444` | `creditController.getCreditBalance` | `-` | frontend\src\api\plan109.ts L:378 |
| GET | `/credits/me` | `backend\src\routes\v1.routes.ts L:247` | `creditsController.getCurrentCredits` | `authenticate` | - |
| POST | `/credits/process-monthly` | `backend\src\routes\plan109.routes.ts L:366` | `creditController.allocateSubscriptionCredits` | `auditLog` | frontend\src\api\plan109.ts L:411 |
| GET | `/credits/reconcile/:userId` | `backend\src\routes\plan109.routes.ts L:435` | `creditController.reconcileCreditBalance` | `-` | - |
| GET | `/credits/rollover/:userId` | `backend\src\routes\plan109.routes.ts L:406` | `creditController.calculateRollover` | `-` | - |
| POST | `/credits/rollover/:userId/apply` | `backend\src\routes\plan109.routes.ts L:415` | `creditController.applyRollover` | `auditLog` | - |
| POST | `/credits/sync/:userId` | `backend\src\routes\plan109.routes.ts L:415` | `creditController.applyRollover` | `auditLog` | - |
| GET | `/credits/usage/:userId` | `backend\src\routes\plan109.routes.ts L:453` | `creditController.getCreditAllocationHistory` | `-` | frontend\src\api\plan109.ts L:389 |
| POST | `/diagnostics` | `backend\src\routes\branding.routes.ts L:159` | `brandingController.uploadDiagnostic` | `-` | backend\src\routes\index.ts L:119 |
| POST | `/disable` | `backend\src\routes\mfa.routes.ts L:282` | `-` | `authenticate` | backend\src\routes\index.ts L:75 |
| POST | `/feedback` | `backend\src\routes\branding.routes.ts L:100` | `brandingController.submitFeedback` | `-` | frontend\src\services\api.ts L:248<br>backend\src\routes\index.ts L:118 |
| POST | `/forgot-password` | `backend\src\routes\auth.routes.ts L:148` | `authManagementController.forgotPassword` | `-` | backend\src\routes\index.ts L:70 |
| GET | `/health` | `backend\src\routes\index.ts L:50` | `-` | `-` | - |
| GET | `/health/live` | `backend\src\routes\index.ts L:212` | `-` | `-` | - |
| GET | `/health/ready` | `backend\src\routes\index.ts L:173` | `-` | `-` | - |
| GET | `/licenses/:licenseKey` | `backend\src\routes\plan110.routes.ts L:96` | `licenseController.getLicenseDetails` | `-` | frontend\src\api\plan110.ts L:69<br>frontend\src\api\plan110.ts L:79<br>frontend\src\api\plan110.ts L:89<br>frontend\src\api\plan110.ts L:100<br>frontend\src\api\plan110.ts L:111<br>frontend\src\api\plan110.ts L:122<br>frontend\src\api\plan110.ts L:138<br>frontend\src\api\plan110.ts L:148<br>frontend\src\api\plan110.ts L:159<br>frontend\src\api\plan110.ts L:169<br>frontend\src\api\plan110.ts L:186<br>frontend\src\api\plan110.ts L:196<br>frontend\src\api\plan110.ts L:206<br>frontend\src\api\plan110.ts L:216<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:76<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:77<br>frontend\src\utils\breadcrumbs.ts L:68<br>frontend\src\utils\breadcrumbs.ts L:69<br>backend\src\routes\index.ts L:103<br>backend\src\routes\plan110.routes.ts L:273<br>backend\src\routes\plan110.routes.ts L:286<br>backend\src\routes\plan110.routes.ts L:311<br>backend\src\routes\plan110.routes.ts L:327<br>backend\src\routes\plan110.routes.ts L:338<br>backend\src\routes\plan110.routes.ts L:349<br>backend\src\routes\plan110.routes.ts L:361<br>backend\src\routes\plan110.routes.ts L:373 |
| GET | `/licenses/:licenseKey/available-upgrades` | `backend\src\routes\plan110.routes.ts L:141` | `upgradeController.getAvailableUpgrades` | `-` | frontend\src\api\plan110.ts L:186 |
| GET | `/licenses/:licenseKey/devices` | `backend\src\routes\plan110.routes.ts L:96` | `licenseController.getLicenseDetails` | `-` | frontend\src\api\plan110.ts L:138 |
| POST | `/licenses/:licenseKey/upgrade` | `backend\src\routes\plan110.routes.ts L:130` | `upgradeController.purchaseUpgrade` | `authenticate` | frontend\src\api\plan110.ts L:196<br>frontend\src\api\plan110.ts L:216<br>backend\src\routes\index.ts L:103 |
| GET | `/licenses/:licenseKey/upgrade-history` | `backend\src\routes\plan110.routes.ts L:141` | `upgradeController.getAvailableUpgrades` | `-` | frontend\src\api\plan110.ts L:196 |
| GET | `/licenses/:licenseKey/version-eligibility/:version` | `backend\src\routes\plan110.routes.ts L:120` | `upgradeController.checkVersionEligibility` | `-` | frontend\src\api\plan110.ts L:206 |
| POST | `/licenses/activate` | `backend\src\routes\plan110.routes.ts L:53` | `licenseController.purchaseLicense` | `authenticate` | frontend\src\api\plan110.ts L:148 |
| DELETE | `/licenses/activations/:id` | `backend\src\routes\plan110.routes.ts L:74` | `licenseController.deactivateDevice` | `authenticate` | frontend\src\api\plan110.ts L:159<br>frontend\src\api\plan110.ts L:169 |
| PATCH | `/licenses/activations/:id/replace` | `backend\src\routes\plan110.routes.ts L:85` | `licenseController.replaceDevice` | `authenticate` | frontend\src\api\plan110.ts L:169 |
| POST | `/licenses/purchase` | `backend\src\routes\plan110.routes.ts L:53` | `licenseController.purchaseLicense` | `authenticate` | frontend\src\api\plan110.ts L:89 |
| GET | `/metrics` | `backend\src\routes\admin.routes.ts L:63` | `adminController.getMetrics` | `-` | frontend\src\services\api.ts L:260<br>backend\src\routes\index.ts L:108 |
| GET | `/migrations/eligibility` | `backend\src\routes\plan110.routes.ts L:235` | `migrationController.getTradeInValue` | `authenticate` | frontend\src\api\plan110.ts L:334 |
| GET | `/migrations/history` | `backend\src\routes\plan110.routes.ts L:246` | `migrationController.checkMigrationEligibility` | `authenticate` | frontend\src\api\plan110.ts L:344 |
| POST | `/migrations/perpetual-to-subscription` | `backend\src\routes\plan110.routes.ts L:213` | `migrationController.migratePerpetualToSubscription` | `authenticate` | frontend\src\api\plan110.ts L:364 |
| POST | `/migrations/subscription-to-perpetual` | `backend\src\routes\plan110.routes.ts L:213` | `migrationController.migratePerpetualToSubscription` | `authenticate` | frontend\src\api\plan110.ts L:375 |
| GET | `/migrations/trade-in-value/:licenseId` | `backend\src\routes\plan110.routes.ts L:235` | `migrationController.getTradeInValue` | `authenticate` | frontend\src\api\plan110.ts L:354 |
| GET | `/models` | `backend\src\routes\v1.routes.ts L:131` | `modelsController.listModels` | `authenticate` | frontend\src\api\admin.ts L:96<br>frontend\src\api\admin.ts L:108<br>frontend\src\api\admin.ts L:123<br>frontend\src\api\admin.ts L:142<br>frontend\src\api\admin.ts L:163<br>frontend\src\api\admin.ts L:179<br>frontend\src\api\admin.ts L:188<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:114<br>backend\src\middleware\auth.middleware.ts L:439<br>backend\src\routes\index.ts L:90 |
| GET | `/models/:modelId` | `backend\src\routes\v1.routes.ts L:131` | `modelsController.listModels` | `authenticate` | frontend\src\api\admin.ts L:96<br>frontend\src\api\admin.ts L:108<br>frontend\src\api\admin.ts L:123<br>frontend\src\api\admin.ts L:142<br>frontend\src\api\admin.ts L:163<br>frontend\src\api\admin.ts L:179<br>frontend\src\api\admin.ts L:188 |
| PATCH | `/models/:modelId/tier` | `backend\src\routes\admin.routes.ts L:219` | `modelTierAdminController.updateModelTier` | `-` | frontend\src\api\admin.ts L:108<br>frontend\src\api\admin.ts L:123 |
| GET | `/models/providers` | `backend\src\routes\admin.routes.ts L:256` | `modelTierAdminController.getProviders` | `-` | frontend\src\api\admin.ts L:188 |
| GET | `/models/tiers` | `backend\src\routes\admin.routes.ts L:184` | `modelTierAdminController.listModelsWithTiers` | `-` | frontend\src\api\admin.ts L:96<br>frontend\src\api\admin.ts L:142<br>frontend\src\api\admin.ts L:163<br>frontend\src\api\admin.ts L:179 |
| GET | `/models/tiers/audit-logs` | `backend\src\routes\admin.routes.ts L:184` | `modelTierAdminController.listModelsWithTiers` | `-` | frontend\src\api\admin.ts L:163 |
| POST | `/models/tiers/bulk` | `backend\src\routes\admin.routes.ts L:232` | `modelTierAdminController.bulkUpdateModelTiers` | `-` | frontend\src\api\admin.ts L:142 |
| POST | `/models/tiers/revert/:auditLogId` | `backend\src\routes\admin.routes.ts L:232` | `modelTierAdminController.bulkUpdateModelTiers` | `-` | frontend\src\api\admin.ts L:179 |
| GET | `/oauth/google/authorize` | `backend\src\routes\social-auth.routes.ts L:64` | `socialAuthController.googleAuthorize` | `-` | - |
| GET | `/oauth/google/callback` | `backend\src\routes\social-auth.routes.ts L:109` | `socialAuthController.googleCallback` | `-` | - |
| GET | `/pricing/alerts` | `backend\src\routes\admin.routes.ts L:914` | `profitabilityController.getPricingConfigs` | `auditLog` | frontend\src\api\pricing.ts L:264<br>frontend\src\api\pricing.ts L:273<br>frontend\src\api\pricing.ts L:281<br>frontend\src\api\pricing.ts L:289 |
| GET | `/pricing/configs` | `backend\src\routes\admin.routes.ts L:898` | `profitabilityController.getTopModels` | `auditLog` | frontend\src\api\pricing.ts L:168<br>frontend\src\api\pricing.ts L:177<br>frontend\src\api\pricing.ts L:185<br>frontend\src\api\pricing.ts L:194<br>frontend\src\api\pricing.ts L:203<br>frontend\src\api\pricing.ts L:212 |
| GET | `/pricing/margin-by-provider` | `backend\src\routes\admin.routes.ts L:863` | `profitabilityController.getMarginByTier` | `auditLog` | frontend\src\api\pricing.ts L:320 |
| GET | `/pricing/margin-by-tier` | `backend\src\routes\admin.routes.ts L:846` | `profitabilityController.getMarginMetrics` | `auditLog` | frontend\src\api\pricing.ts L:311 |
| GET | `/pricing/margin-metrics` | `backend\src\routes\admin.routes.ts L:846` | `profitabilityController.getMarginMetrics` | `auditLog` | frontend\src\api\pricing.ts L:302 |
| POST | `/pricing/simulate` | `backend\src\routes\admin.routes.ts L:970` | `profitabilityController.simulatePricing` | `auditLog` | frontend\src\api\pricing.ts L:225 |
| GET | `/pricing/top-models` | `backend\src\routes\admin.routes.ts L:880` | `-` | `-` | frontend\src\api\pricing.ts L:329 |
| GET | `/pricing/vendor-prices` | `backend\src\routes\admin.routes.ts L:927` | `profitabilityController.getPricingAlerts` | `auditLog` | frontend\src\api\pricing.ts L:255 |
| GET | `/rate-limit` | `backend\src\routes\v1.routes.ts L:271` | `creditsController.getUsageStats` | `authenticate` | - |
| POST | `/register` | `backend\src\routes\auth.routes.ts L:81` | `authManagementController.register` | `-` | backend\src\routes\index.ts L:68 |
| POST | `/reset-password` | `backend\src\routes\auth.routes.ts L:182` | `authManagementController.resetPassword` | `-` | backend\src\routes\index.ts L:71 |
| GET | `/settings` | `backend\src\routes\admin.routes.ts L:681` | `settingsController.getAllSettings` | `auditLog` | frontend\src\api\settings.api.ts L:54<br>frontend\src\api\settings.api.ts L:64<br>frontend\src\api\settings.api.ts L:77<br>frontend\src\api\settings.api.ts L:88<br>frontend\src\api\settings.api.ts L:99<br>frontend\src\api\settings.api.ts L:109<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:135<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:136<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:137<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:138<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:139<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:140<br>frontend\src\pages\admin\AdminDashboard.tsx L:448<br>frontend\src\pages\admin\AdminSettings.tsx L:293 |
| GET | `/settings/:category` | `backend\src\routes\admin.routes.ts L:681` | `settingsController.getAllSettings` | `auditLog` | frontend\src\api\settings.api.ts L:64<br>frontend\src\api\settings.api.ts L:77<br>frontend\src\api\settings.api.ts L:88<br>frontend\src\api\settings.api.ts L:99<br>frontend\src\api\settings.api.ts L:109 |
| PUT | `/settings/:category` | `backend\src\routes\admin.routes.ts L:716` | `settingsController.updateCategorySettings` | `auditLog` | frontend\src\api\settings.api.ts L:64<br>frontend\src\api\settings.api.ts L:77<br>frontend\src\api\settings.api.ts L:88<br>frontend\src\api\settings.api.ts L:99<br>frontend\src\api\settings.api.ts L:109 |
| POST | `/settings/clear-cache` | `backend\src\routes\admin.routes.ts L:739` | `settingsController.testEmailConfig` | `auditLog` | frontend\src\api\settings.api.ts L:99 |
| POST | `/settings/run-backup` | `backend\src\routes\admin.routes.ts L:753` | `settingsController.clearCache` | `auditLog` | frontend\src\api\settings.api.ts L:109 |
| POST | `/settings/test-email` | `backend\src\routes\admin.routes.ts L:739` | `settingsController.testEmailConfig` | `auditLog` | frontend\src\api\settings.api.ts L:88 |
| POST | `/setup` | `backend\src\routes\mfa.routes.ts L:50` | `-` | `authenticate` | backend\src\routes\index.ts L:72 |
| GET | `/status` | `backend\src\routes\mfa.routes.ts L:526` | `-` | `authenticate` | backend\src\routes\index.ts L:77 |
| GET | `/subscription-plans` | `backend\src\routes\v1.routes.ts L:189` | `subscriptionsController.listSubscriptionPlans` | `-` | - |
| GET | `/subscriptions` | `backend\src\routes\admin.routes.ts L:98` | `adminController.getSubscriptionOverview` | `-` | frontend\src\api\admin.ts L:251<br>frontend\src\api\plan109.ts L:68<br>frontend\src\api\plan109.ts L:79<br>frontend\src\api\plan109.ts L:89<br>frontend\src\api\plan109.ts L:99<br>frontend\src\api\plan109.ts L:110<br>frontend\src\api\plan109.ts L:121<br>frontend\src\api\plan109.ts L:132<br>frontend\src\api\plan109.ts L:142<br>frontend\src\api\plan110.ts L:264<br>frontend\src\api\plan110.ts L:274<br>frontend\src\api\plan110.ts L:285<br>frontend\src\api\plan110.ts L:296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:93<br>backend\src\routes\index.ts L:104<br>backend\src\routes\index.ts L:110 |
| POST | `/subscriptions` | `backend\src\routes\plan109.routes.ts L:56` | `subscriptionController.createSubscription` | `auditLog` | frontend\src\api\admin.ts L:251<br>frontend\src\api\plan109.ts L:68<br>frontend\src\api\plan109.ts L:79<br>frontend\src\api\plan109.ts L:89<br>frontend\src\api\plan109.ts L:99<br>frontend\src\api\plan109.ts L:110<br>frontend\src\api\plan109.ts L:121<br>frontend\src\api\plan109.ts L:132<br>frontend\src\api\plan109.ts L:142<br>frontend\src\api\plan110.ts L:264<br>frontend\src\api\plan110.ts L:274<br>frontend\src\api\plan110.ts L:285<br>frontend\src\api\plan110.ts L:296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:93<br>backend\src\routes\index.ts L:104<br>backend\src\routes\index.ts L:110 |
| POST | `/subscriptions` | `backend\src\routes\v1.routes.ts L:210` | `subscriptionsController.createSubscription` | `authenticate` | frontend\src\api\admin.ts L:251<br>frontend\src\api\plan109.ts L:68<br>frontend\src\api\plan109.ts L:79<br>frontend\src\api\plan109.ts L:89<br>frontend\src\api\plan109.ts L:99<br>frontend\src\api\plan109.ts L:110<br>frontend\src\api\plan109.ts L:121<br>frontend\src\api\plan109.ts L:132<br>frontend\src\api\plan109.ts L:142<br>frontend\src\api\plan110.ts L:264<br>frontend\src\api\plan110.ts L:274<br>frontend\src\api\plan110.ts L:285<br>frontend\src\api\plan110.ts L:296<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:63<br>frontend\src\pages\admin\SubscriptionManagement.tsx L:517<br>frontend\src\utils\breadcrumbs.ts L:63<br>backend\src\routes\admin.routes.ts L:355<br>backend\src\routes\index.ts L:93<br>backend\src\routes\index.ts L:104<br>backend\src\routes\index.ts L:110 |
| POST | `/subscriptions/:id/allocate-credits` | `backend\src\routes\plan109.routes.ts L:96` | `subscriptionController.reactivateSubscription` | `auditLog` | frontend\src\api\plan109.ts L:142 |
| POST | `/subscriptions/:id/cancel` | `backend\src\routes\plan109.routes.ts L:76` | `subscriptionController.downgradeTier` | `auditLog` | frontend\src\api\plan109.ts L:121 |
| POST | `/subscriptions/:id/downgrade` | `backend\src\routes\plan109.routes.ts L:66` | `subscriptionController.upgradeTier` | `auditLog` | frontend\src\api\plan109.ts L:110<br>frontend\src\api\plan110.ts L:296 |
| POST | `/subscriptions/:id/downgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:176` | `prorationController.upgradeWithProration` | `authenticate` | frontend\src\api\plan110.ts L:296 |
| GET | `/subscriptions/:id/proration-history` | `backend\src\routes\plan110.routes.ts L:198` | `prorationController.getProrationHistory` | `authenticate` | frontend\src\api\plan110.ts L:264 |
| POST | `/subscriptions/:id/proration-preview` | `backend\src\routes\plan110.routes.ts L:165` | `prorationController.previewProration` | `authenticate` | frontend\src\api\plan110.ts L:274<br>backend\src\routes\index.ts L:104 |
| POST | `/subscriptions/:id/reactivate` | `backend\src\routes\plan109.routes.ts L:86` | `subscriptionController.cancelSubscription` | `auditLog` | frontend\src\api\plan109.ts L:132 |
| POST | `/subscriptions/:id/rollover` | `backend\src\routes\plan109.routes.ts L:106` | `subscriptionController.allocateMonthlyCredits` | `auditLog` | - |
| POST | `/subscriptions/:id/upgrade` | `backend\src\routes\plan109.routes.ts L:56` | `subscriptionController.createSubscription` | `auditLog` | frontend\src\api\plan109.ts L:99<br>frontend\src\api\plan110.ts L:285 |
| POST | `/subscriptions/:id/upgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:165` | `prorationController.previewProration` | `authenticate` | frontend\src\api\plan110.ts L:285 |
| GET | `/subscriptions/:userId/features` | `backend\src\routes\plan109.routes.ts L:126` | `subscriptionController.checkFeatureAccess` | `-` | - |
| GET | `/subscriptions/:userId/limits` | `backend\src\routes\plan109.routes.ts L:126` | `subscriptionController.checkFeatureAccess` | `-` | - |
| GET | `/subscriptions/all` | `backend\src\routes\plan109.routes.ts L:144` | `subscriptionController.getActiveSubscription` | `-` | frontend\src\api\plan109.ts L:68 |
| GET | `/subscriptions/me` | `backend\src\routes\v1.routes.ts L:189` | `subscriptionsController.listSubscriptionPlans` | `authenticate` | - |
| PATCH | `/subscriptions/me` | `backend\src\routes\v1.routes.ts L:221` | `subscriptionsController.updateSubscription` | `authenticate` | - |
| POST | `/subscriptions/me/cancel` | `backend\src\routes\v1.routes.ts L:232` | `subscriptionsController.cancelSubscription` | `authenticate` | - |
| GET | `/subscriptions/stats` | `backend\src\routes\plan109.routes.ts L:153` | `subscriptionController.listAllSubscriptions` | `-` | frontend\src\api\plan109.ts L:79 |
| GET | `/subscriptions/user/:userId` | `backend\src\routes\plan109.routes.ts L:135` | `subscriptionController.getTierLimits` | `-` | frontend\src\api\plan109.ts L:89 |
| GET | `/swagger.json` | `backend\src\routes\swagger.routes.ts L:62` | `-` | `-` | backend\src\routes\index.ts L:60 |
| POST | `/track-download` | `backend\src\routes\branding.routes.ts L:68` | `brandingController.trackDownload` | `-` | frontend\src\services\api.ts L:242<br>backend\src\routes\index.ts L:117 |
| GET | `/usage` | `backend\src\routes\admin.routes.ts L:98` | `adminController.getSubscriptionOverview` | `-` | frontend\src\api\plan109.ts L:389<br>backend\src\routes\index.ts L:95<br>backend\src\routes\index.ts L:111<br>backend\src\routes\plan109.routes.ts L:463 |
| GET | `/usage` | `backend\src\routes\v1.routes.ts L:247` | `creditsController.getCurrentCredits` | `authenticate` | frontend\src\api\plan109.ts L:389<br>backend\src\routes\index.ts L:95<br>backend\src\routes\index.ts L:111<br>backend\src\routes\plan109.routes.ts L:463 |
| GET | `/usage/stats` | `backend\src\routes\v1.routes.ts L:259` | `creditsController.getUsageHistory` | `authenticate` | - |
| GET | `/user/credits` | `backend\src\routes\api.routes.ts L:138` | `creditsController.getDetailedCredits` | `authenticate` | backend\src\routes\index.ts L:100 |
| GET | `/user/profile` | `backend\src\routes\api.routes.ts L:101` | `usersController.getUserProfile` | `authenticate` | backend\src\routes\index.ts L:99 |
| GET | `/users` | `backend\src\routes\admin.routes.ts L:63` | `adminController.getMetrics` | `-` | frontend\src\api\admin.ts L:236<br>frontend\src\api\admin.ts L:251<br>frontend\src\api\admin.ts L:267<br>frontend\src\api\admin.ts L:283<br>frontend\src\api\admin.ts L:299<br>frontend\src\api\admin.ts L:315<br>frontend\src\api\admin.ts L:331<br>frontend\src\api\plan109.ts L:158<br>frontend\src\api\plan109.ts L:169<br>frontend\src\api\plan109.ts L:180<br>frontend\src\api\plan109.ts L:190<br>frontend\src\api\plan109.ts L:201<br>frontend\src\api\plan109.ts L:212<br>frontend\src\api\plan109.ts L:222<br>frontend\src\api\plan109.ts L:233<br>frontend\src\api\plan109.ts L:243<br>frontend\src\api\plan109.ts L:254<br>frontend\src\api\plan109.ts L:479<br>frontend\src\api\plan109.ts L:489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:53<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:76<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:103<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:112<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:22<br>backend\src\middleware\permission.middleware.ts L:28<br>backend\src\middleware\permission.middleware.ts L:55<br>backend\src\middleware\permission.middleware.ts L:275<br>backend\src\routes\index.ts L:96<br>backend\src\routes\index.ts L:109<br>backend\src\routes\plan109.routes.ts L:512<br>backend\src\routes\plan109.routes.ts L:521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users` | `backend\src\routes\plan109.routes.ts L:175` | `userManagementController.listUsers` | `-` | frontend\src\api\admin.ts L:236<br>frontend\src\api\admin.ts L:251<br>frontend\src\api\admin.ts L:267<br>frontend\src\api\admin.ts L:283<br>frontend\src\api\admin.ts L:299<br>frontend\src\api\admin.ts L:315<br>frontend\src\api\admin.ts L:331<br>frontend\src\api\plan109.ts L:158<br>frontend\src\api\plan109.ts L:169<br>frontend\src\api\plan109.ts L:180<br>frontend\src\api\plan109.ts L:190<br>frontend\src\api\plan109.ts L:201<br>frontend\src\api\plan109.ts L:212<br>frontend\src\api\plan109.ts L:222<br>frontend\src\api\plan109.ts L:233<br>frontend\src\api\plan109.ts L:243<br>frontend\src\api\plan109.ts L:254<br>frontend\src\api\plan109.ts L:479<br>frontend\src\api\plan109.ts L:489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\components\admin\layout\AdminSidebar.tsx L:53<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:76<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:103<br>frontend\src\pages\admin\users\UserDetailUnified.tsx L:112<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:22<br>backend\src\middleware\permission.middleware.ts L:28<br>backend\src\middleware\permission.middleware.ts L:55<br>backend\src\middleware\permission.middleware.ts L:275<br>backend\src\routes\index.ts L:96<br>backend\src\routes\index.ts L:109<br>backend\src\routes\plan109.routes.ts L:512<br>backend\src\routes\plan109.routes.ts L:521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id` | `backend\src\routes\plan109.routes.ts L:184` | `userManagementController.searchUsers` | `-` | frontend\src\api\admin.ts L:236<br>frontend\src\api\admin.ts L:251<br>frontend\src\api\admin.ts L:267<br>frontend\src\api\admin.ts L:283<br>frontend\src\api\admin.ts L:299<br>frontend\src\api\admin.ts L:315<br>frontend\src\api\admin.ts L:331<br>frontend\src\api\plan109.ts L:169<br>frontend\src\api\plan109.ts L:180<br>frontend\src\api\plan109.ts L:190<br>frontend\src\api\plan109.ts L:201<br>frontend\src\api\plan109.ts L:212<br>frontend\src\api\plan109.ts L:222<br>frontend\src\api\plan109.ts L:233<br>frontend\src\api\plan109.ts L:243<br>frontend\src\api\plan109.ts L:254<br>frontend\src\api\plan109.ts L:479<br>frontend\src\api\plan109.ts L:489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:28<br>backend\src\middleware\permission.middleware.ts L:275<br>backend\src\routes\plan109.routes.ts L:512<br>backend\src\routes\plan109.routes.ts L:521<br>backend\src\routes\plan111.routes.ts L:76 |
| PATCH | `/users/:id` | `backend\src\routes\plan109.routes.ts L:202` | `userManagementController.editUserProfile` | `auditLog` | frontend\src\api\admin.ts L:236<br>frontend\src\api\admin.ts L:251<br>frontend\src\api\admin.ts L:267<br>frontend\src\api\admin.ts L:283<br>frontend\src\api\admin.ts L:299<br>frontend\src\api\admin.ts L:315<br>frontend\src\api\admin.ts L:331<br>frontend\src\api\plan109.ts L:169<br>frontend\src\api\plan109.ts L:180<br>frontend\src\api\plan109.ts L:190<br>frontend\src\api\plan109.ts L:201<br>frontend\src\api\plan109.ts L:212<br>frontend\src\api\plan109.ts L:222<br>frontend\src\api\plan109.ts L:233<br>frontend\src\api\plan109.ts L:243<br>frontend\src\api\plan109.ts L:254<br>frontend\src\api\plan109.ts L:479<br>frontend\src\api\plan109.ts L:489<br>frontend\src\api\plan111.ts L:88<br>frontend\src\pages\admin\AdminDashboard.tsx L:427<br>backend\src\middleware\audit.middleware.ts L:8<br>backend\src\middleware\permission.middleware.ts L:28<br>backend\src\middleware\permission.middleware.ts L:275<br>backend\src\routes\plan109.routes.ts L:512<br>backend\src\routes\plan109.routes.ts L:521<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id/activity` | `backend\src\routes\admin.routes.ts L:451` | `-` | `-` | frontend\src\api\admin.ts L:331 |
| POST | `/users/:id/adjust-credits` | `backend\src\routes\plan109.routes.ts L:252` | `userManagementController.bulkUpdateUsers` | `auditLog` | frontend\src\api\plan109.ts L:254 |
| POST | `/users/:id/ban` | `backend\src\routes\plan109.routes.ts L:222` | `userManagementController.unsuspendUser` | `auditLog` | frontend\src\api\plan109.ts L:222<br>backend\src\middleware\audit.middleware.ts L:8 |
| GET | `/users/:id/coupons` | `backend\src\routes\admin.routes.ts L:402` | `-` | `-` | frontend\src\api\admin.ts L:299<br>frontend\src\api\plan111.ts L:88<br>backend\src\routes\plan111.routes.ts L:76 |
| GET | `/users/:id/credits` | `backend\src\routes\admin.routes.ts L:377` | `-` | `-` | frontend\src\api\admin.ts L:283 |
| GET | `/users/:id/licenses` | `backend\src\routes\admin.routes.ts L:354` | `-` | `-` | frontend\src\api\admin.ts L:267 |
| GET | `/users/:id/overview` | `backend\src\routes\admin.routes.ts L:332` | `adminUserDetailController.getUserOverview` | `auditLog` | frontend\src\api\admin.ts L:236 |
| GET | `/users/:id/payments` | `backend\src\routes\admin.routes.ts L:425` | `-` | `-` | frontend\src\api\admin.ts L:315 |
| PATCH | `/users/:id/role` | `backend\src\routes\admin.routes.ts L:622` | `-` | `auditLog` | - |
| GET | `/users/:id/subscriptions` | `backend\src\routes\admin.routes.ts L:332` | `-` | `-` | frontend\src\api\admin.ts L:251 |
| POST | `/users/:id/suspend` | `backend\src\routes\admin.routes.ts L:87` | `adminController.suspendUser` | `-` | frontend\src\api\plan109.ts L:201 |
| POST | `/users/:id/suspend` | `backend\src\routes\plan109.routes.ts L:212` | `userManagementController.suspendUser` | `auditLog` | frontend\src\api\plan109.ts L:201 |
| POST | `/users/:id/unban` | `backend\src\routes\plan109.routes.ts L:232` | `userManagementController.banUser` | `auditLog` | frontend\src\api\plan109.ts L:233 |
| POST | `/users/:id/unsuspend` | `backend\src\routes\plan109.routes.ts L:212` | `userManagementController.suspendUser` | `auditLog` | frontend\src\api\plan109.ts L:212 |
| POST | `/users/bulk-update` | `backend\src\routes\plan109.routes.ts L:242` | `userManagementController.unbanUser` | `auditLog` | frontend\src\api\plan109.ts L:243 |
| GET | `/users/me` | `backend\src\routes\v1.routes.ts L:55` | `usersController.getCurrentUser` | `authenticate` | - |
| PATCH | `/users/me` | `backend\src\routes\v1.routes.ts L:67` | `usersController.updateCurrentUser` | `authenticate` | - |
| GET | `/users/me/preferences` | `backend\src\routes\v1.routes.ts L:79` | `usersController.getUserPreferences` | `authenticate` | - |
| PATCH | `/users/me/preferences` | `backend\src\routes\v1.routes.ts L:67` | `usersController.updateCurrentUser` | `authenticate` | - |
| GET | `/users/me/preferences/model` | `backend\src\routes\v1.routes.ts L:115` | `usersController.getDefaultModel` | `authenticate` | - |
| POST | `/users/me/preferences/model` | `backend\src\routes\v1.routes.ts L:103` | `usersController.setDefaultModel` | `authenticate` | - |
| GET | `/users/search` | `backend\src\routes\plan109.routes.ts L:175` | `userManagementController.listUsers` | `-` | frontend\src\api\plan109.ts L:169 |
| POST | `/verify-email` | `backend\src\routes\auth.routes.ts L:114` | `authManagementController.verifyEmail` | `-` | backend\src\routes\index.ts L:69 |
| POST | `/verify-login` | `backend\src\routes\mfa.routes.ts L:197` | `-` | `-` | backend\src\routes\index.ts L:74 |
| POST | `/verify-setup` | `backend\src\routes\mfa.routes.ts L:104` | `-` | `authenticate` | backend\src\routes\index.ts L:73 |
| GET | `/version` | `backend\src\routes\branding.routes.ts L:128` | `brandingController.getLatestVersion` | `-` | frontend\src\api\plan110.ts L:206<br>frontend\src\services\api.ts L:254<br>backend\src\routes\index.ts L:120<br>backend\src\routes\plan110.routes.ts L:121 |
| DELETE | `/webhooks/config` | `backend\src\routes\v1.routes.ts L:321` | `webhooksController.deleteWebhookConfig` | `authenticate` | - |
| GET | `/webhooks/config` | `backend\src\routes\v1.routes.ts L:299` | `webhooksController.getWebhookConfig` | `authenticate` | - |
| POST | `/webhooks/config` | `backend\src\routes\v1.routes.ts L:310` | `webhooksController.setWebhookConfig` | `authenticate` | - |
| POST | `/webhooks/stripe` | `backend\src\routes\index.ts L:268` | `subscriptionsController.handleStripeWebhook` | `-` | - |
| POST | `/webhooks/test` | `backend\src\routes\admin.routes.ts L:123` | `adminController.testWebhook` | `-` | - |
| POST | `/webhooks/test` | `backend\src\routes\v1.routes.ts L:332` | `webhooksController.testWebhook` | `authenticate` | - |

---

## Identity Provider (OAuth 2.0/OIDC)

**Base URL:** `http://localhost:7151`

**Total Endpoints:** 22

| Method | Endpoint | File | Handler | Middleware | Usages |
|--------|----------|------|---------|------------|--------|
| GET | `/.well-known/openid-configuration` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | - |
| GET | `/health` | `identity-provider\src\app.ts L:48` | `-` | `-` | - |
| GET | `/health` | `identity-provider\src\app.ts L:48` | `-` | `-` | - |
| GET | `/interaction/:uid` | `identity-provider\src\app.ts L:48` | `-` | `-` | - |
| GET | `/interaction/:uid` | `identity-provider\src\app.ts L:57` | `-` | `-` | - |
| GET | `/interaction/:uid/abort` | `identity-provider\src\app.ts L:57` | `-` | `-` | - |
| GET | `/interaction/:uid/abort` | `identity-provider\src\app.ts L:60` | `-` | `-` | - |
| POST | `/interaction/:uid/consent` | `identity-provider\src\app.ts L:58` | `-` | `-` | - |
| POST | `/interaction/:uid/consent` | `identity-provider\src\app.ts L:59` | `-` | `-` | - |
| GET | `/interaction/:uid/data` | `identity-provider\src\app.ts L:57` | `-` | `-` | - |
| GET | `/interaction/:uid/data` | `identity-provider\src\app.ts L:61` | `-` | `-` | - |
| POST | `/interaction/:uid/login` | `identity-provider\src\app.ts L:58` | `-` | `-` | - |
| POST | `/interaction/:uid/login` | `identity-provider\src\app.ts L:58` | `-` | `-` | - |
| GET | `/logout` | `identity-provider\src\app.ts L:57` | `-` | `-` | - |
| GET | `/logout` | `identity-provider\src\app.ts L:64` | `-` | `-` | - |
| GET | `/oauth/authorize` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | - |
| POST | `/oauth/introspect` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | - |
| GET | `/oauth/jwks` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | backend\src\services\token-introspection.service.ts L:126 |
| POST | `/oauth/revoke` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | - |
| POST | `/oauth/token` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | - |
| GET | `/oauth/userinfo` | `identity-provider (OIDC Provider) L:0` | `-` | `-` | - |

---

## Summary Statistics

### Backend API

- **Total Endpoints:** 206
- **Endpoints with Usages:** 124
- **Total Usage References:** 824
- **Unused Endpoints:** 82

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 22
- **Endpoints with Usages:** 2
- **Total Usage References:** 470
- **Unused Endpoints:** 20

