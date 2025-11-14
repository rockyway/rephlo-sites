# API Endpoints Analysis Report (Simple Format)

**Generated:** 2025-11-14T02:50:41.486Z
**Format:** Simple
**Include Tests:** No

**Projects Analyzed:**
- Backend API (http://localhost:7150)
- Identity Provider (OAuth 2.0/OIDC) (http://localhost:7151)

---

## Backend API

**Base URL:** `http://localhost:7150`

**Total Endpoints:** 220

| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |
|--------|----------|------|---------|-----------------|---------------|------------|--------|
| GET | `/admin/analytics/churn-rate` | `backend\src\routes\plan109.routes.ts L:529` | `analyticsController.getChurnRate` | `{ status: "success", data: analyticsController_getChurnRate_Data }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/conversion-rate` | `backend\src\routes\plan109.routes.ts L:547` | `analyticsController.getFreeToProConversionRate` | `{ status: "success", data: analyticsController_getFreeToProConversionRate_Data }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/cost-by-provider` | `backend\src\routes\vendor-analytics.routes.ts L:175` | `vendorAnalyticsController.getCostByProvider` | - | - | `-` | - |
| GET | `/admin/analytics/cost-distribution` | `backend\src\routes\vendor-analytics.routes.ts L:219` | `vendorAnalyticsController.getCostDistribution` | - | - | `-` | - |
| GET | `/admin/analytics/coupons` | `backend\src\routes\plan111.routes.ts L:293` | `analyticsController.getAnalyticsMetrics` | `CouponAnalyticsMetrics` | `500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/coupons/by-type` | `backend\src\routes\plan111.routes.ts L:336` | `analyticsController.getRedemptionsByType` | `RedemptionByType[]` | `500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/coupons/top` | `backend\src\routes\plan111.routes.ts L:324` | `analyticsController.getTopPerformingCoupons` | `TopPerformingCoupon[]` | `500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/coupons/trend` | `backend\src\routes\plan111.routes.ts L:309` | `analyticsController.getRedemptionTrend` | `RedemptionTrend[]` | `400: validation_error`<br>`500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/credit-utilization` | `backend\src\routes\plan109.routes.ts L:538` | `analyticsController.getCreditUtilizationRate` | `{ status: "success", data: analyticsController_getCreditUtilizationRate_Data }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/dashboard` | `backend\src\routes\plan109.routes.ts L:556` | `analyticsController.getDashboardSummary` | `{ status: "success", data: T }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/dashboard-kpis` | `backend\src\routes\admin.routes.ts L:146` | `adminAnalyticsController.getDashboardKPIs` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/analytics/export-csv` | `backend\src\routes\vendor-analytics.routes.ts L:242` | `vendorAnalyticsController.exportCSV` | - | - | `-` | - |
| GET | `/admin/analytics/gross-margin` | `backend\src\routes\vendor-analytics.routes.ts L:152` | `vendorAnalyticsController.getGrossMargin` | - | - | `-` | - |
| GET | `/admin/analytics/margin-trend` | `backend\src\routes\vendor-analytics.routes.ts L:197` | `vendorAnalyticsController.getMarginTrend` | - | - | `-` | - |
| GET | `/admin/analytics/recent-activity` | `backend\src\routes\admin.routes.ts L:166` | `adminAnalyticsController.getRecentActivity` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue` | `backend\src\routes\plan109.routes.ts L:475` | `analyticsController.getRevenueMetrics` | `analyticsController_getRevenueMetrics_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/revenue/arr` | `backend\src\routes\plan109.routes.ts L:493` | `analyticsController.getARR` | `{ status: "success", data: analyticsController_getARR_Data }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/revenue/by-tier` | `backend\src\routes\plan109.routes.ts L:502` | `analyticsController.getRevenueByTier` | `{ status: "success", data: T }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/revenue/conversion-funnel` | `backend\src\routes\admin.routes.ts L:556` | `revenueAnalyticsController.getRevenueFunnel` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue/coupon-roi` | `backend\src\routes\admin.routes.ts L:601` | `revenueAnalyticsController.getCouponROI` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue/credit-usage` | `backend\src\routes\admin.routes.ts L:584` | `revenueAnalyticsController.getCreditUsage` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue/funnel` | `backend\src\routes\admin.routes.ts L:567` | `revenueAnalyticsController.getRevenueFunnel` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue/kpis` | `backend\src\routes\admin.routes.ts L:499` | `revenueAnalyticsController.getRevenueKPIs` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue/mix` | `backend\src\routes\admin.routes.ts L:517` | `revenueAnalyticsController.getRevenueMix` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/revenue/mrr` | `backend\src\routes\plan109.routes.ts L:484` | `analyticsController.getMRR` | `{ status: "success", data: analyticsController_getMRR_Data }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/revenue/trend` | `backend\src\routes\admin.routes.ts L:538` | `revenueAnalyticsController.getRevenueTrend` | - | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/analytics/users/by-tier` | `backend\src\routes\plan109.routes.ts L:520` | `analyticsController.getUsersByTier` | `{ status: "success", data: T }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/analytics/users/total` | `backend\src\routes\plan109.routes.ts L:511` | `analyticsController.getTotalActiveUsers` | `{ status: "success", data: analyticsController_getTotalActiveUsers_Data }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/audit-logs` | `backend\src\routes\admin.routes.ts L:279` | `auditLogController.getAuditLogs` | `{ status: "success", data: auditLogController_getAuditLogs_Data }` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/audit-logs/admin/:adminUserId` | `backend\src\routes\admin.routes.ts L:310` | `auditLogController.getLogsForAdmin` | `AdminAuditLog[]` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/audit-logs/resource/:resourceType/:resourceId` | `backend\src\routes\admin.routes.ts L:295` | `auditLogController.getLogsForResource` | `AdminAuditLog[]` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/billing/dunning` | `backend\src\routes\admin.routes.ts L:825` | `billingController.listDunningAttempts` | `DunningAttempt[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/billing/dunning/:attemptId/retry` | `backend\src\routes\plan109.routes.ts L:352` | `billingController.retryFailedPayment` | `PaymentTransaction` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/billing/invoices` | `backend\src\routes\admin.routes.ts L:794` | `billingController.listInvoices` | `ListAllInvoices_Response` | `501: error_response` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/billing/invoices/:subscriptionId` | `backend\src\routes\plan109.routes.ts L:305` | `billingController.createInvoice` | `Invoice` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/billing/invoices/:userId` | `backend\src\routes\plan109.routes.ts L:324` | `billingController.listInvoices` | `ListAllInvoices_Response` | `501: error_response` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/billing/invoices/upcoming/:userId` | `backend\src\routes\plan109.routes.ts L:315` | `billingController.getUpcomingInvoice` | - | `501: error_response` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/billing/payment-methods` | `backend\src\routes\plan109.routes.ts L:276` | `billingController.addPaymentMethod` | `billingController_addPaymentMethod_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| DELETE | `/admin/billing/payment-methods/:id` | `backend\src\routes\plan109.routes.ts L:286` | `billingController.removePaymentMethod` | `billingController_removePaymentMethod_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/billing/payment-methods/:userId` | `backend\src\routes\plan109.routes.ts L:296` | `billingController.listPaymentMethods` | - | `501: error_response` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/billing/transactions` | `backend\src\routes\admin.routes.ts L:812` | `billingController.listTransactions` | `ListAllTransactions_Response` | `501: error_response` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/billing/transactions/:id/refund` | `backend\src\routes\plan109.routes.ts L:342` | `billingController.refundTransaction` | - | `501: error_response` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/billing/transactions/:userId` | `backend\src\routes\plan109.routes.ts L:333` | `billingController.listTransactions` | `ListAllTransactions_Response` | `501: error_response` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/campaigns` | `backend\src\routes\plan111.routes.ts L:194` | `campaignController.listCampaigns` | `PaginatedResponse<T>` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/campaigns` | `backend\src\routes\plan111.routes.ts L:158` | `campaignController.createCampaign` | `CouponCampaign` | `400: creation_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:255 |
| DELETE | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:182` | `campaignController.deleteCampaign` | - | `400: deletion_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:207 |
| GET | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:205` | `campaignController.getSingleCampaign` | `campaignController_getSingleCampaign_Response` | `404: campaign_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/campaigns/:id` | `backend\src\routes\plan111.routes.ts L:170` | `campaignController.updateCampaign` | `CouponCampaign` | `404: campaign_not_found`<br>`400: update_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/campaigns/:id/assign-coupon` | `backend\src\routes\plan111.routes.ts L:227` | `campaignController.assignCoupon` | - | `400: assignment_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:255 |
| GET | `/admin/campaigns/:id/performance` | `backend\src\routes\plan111.routes.ts L:216` | `campaignController.getCampaignPerformance` | `GetCampaignPerformance_Response` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| DELETE | `/admin/campaigns/:id/remove-coupon/:couponId` | `backend\src\routes\plan111.routes.ts L:239` | `campaignController.removeCoupon` | - | `400: removal_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/coupons` | `backend\src\routes\plan111.routes.ts L:123` | `couponController.listCoupons` | `PaginatedResponse<T>` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/coupons` | `backend\src\routes\plan111.routes.ts L:87` | `couponController.createCoupon` | `Coupon` | `400: creation_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:100 |
| DELETE | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:111` | `couponController.deleteCoupon` | - | `400: deletion_failed` | `authMiddleware, requireAdmin, auditLog` | frontend\src\api\plan111.ts L:125 |
| GET | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:134` | `couponController.getSingleCoupon` | - | `404: coupon_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/coupons/:id` | `backend\src\routes\plan111.routes.ts L:99` | `couponController.updateCoupon` | - | `400: update_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/coupons/:id/redemptions` | `backend\src\routes\plan111.routes.ts L:145` | `couponController.getCouponRedemptions` | `{ status: "success", data: couponController_getCouponRedemptions_Data }` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/credits/allocate` | `backend\src\routes\plan109.routes.ts L:366` | `creditController.allocateSubscriptionCredits` | `creditController_allocateSubscriptionCredits_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/credits/balance/:userId` | `backend\src\routes\plan109.routes.ts L:444` | `creditController.getCreditBalance` | `creditController_getCreditBalance_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/credits/deduct` | `backend\src\routes\plan109.routes.ts L:396` | `creditController.deductCreditsManually` | `creditController_deductCreditsManually_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/credits/grant-bonus` | `backend\src\routes\plan109.routes.ts L:386` | `creditController.grantBonusCredits` | `creditController_grantBonusCredits_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/credits/history/:userId` | `backend\src\routes\plan109.routes.ts L:453` | `creditController.getCreditAllocationHistory` | `creditController_getCreditAllocationHistory_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/credits/process-monthly` | `backend\src\routes\plan109.routes.ts L:376` | `creditController.processMonthlyAllocations` | `creditController_processMonthlyAllocations_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/credits/reconcile/:userId` | `backend\src\routes\plan109.routes.ts L:435` | `creditController.reconcileCreditBalance` | `creditController_reconcileCreditBalance_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/credits/rollover/:userId` | `backend\src\routes\plan109.routes.ts L:406` | `creditController.calculateRollover` | `creditController_calculateRollover_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/credits/rollover/:userId/apply` | `backend\src\routes\plan109.routes.ts L:415` | `creditController.applyRollover` | `creditController_applyRollover_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/credits/sync/:userId` | `backend\src\routes\plan109.routes.ts L:425` | `creditController.syncWithTokenCreditSystem` | `creditController_syncWithTokenCreditSystem_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/credits/usage/:userId` | `backend\src\routes\plan109.routes.ts L:462` | `creditController.getCreditUsageByPeriod` | `creditController_getCreditUsageByPeriod_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/fraud-detection` | `backend\src\routes\plan111.routes.ts L:253` | `fraudController.listFraudEvents` | `PaginatedResponse<T>` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/fraud-detection/:id/review` | `backend\src\routes\plan111.routes.ts L:264` | `fraudController.reviewFraudEvent` | `CouponFraudDetection` | `400: review_failed` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/fraud-detection/pending` | `backend\src\routes\plan111.routes.ts L:276` | `fraudController.getPendingReviews` | `CouponFraudDetection[]` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/metrics` | `backend\src\routes\admin.routes.ts L:64` | `adminController.getMetrics` | `{ status: "success", data: adminController_getMetrics_Data }` | `403: forbidden`<br>`500: error_response` | `authMiddleware, requireAdmin` | frontend\src\services\api.ts L:260 |
| POST | `/admin/models/` | `backend\src\routes\admin-models.routes.ts L:48` | `adminModelsController.createModel` | `ModelDetailsResponse` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:266;278;293;305 |
| POST | `/admin/models/:id/archive` | `backend\src\routes\admin-models.routes.ts L:91` | `adminModelsController.archiveModel` | `adminModelsController_archiveModel_Response` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:293 |
| POST | `/admin/models/:id/mark-legacy` | `backend\src\routes\admin-models.routes.ts L:66` | `adminModelsController.markModelAsLegacy` | `adminModelsController_markModelAsLegacy_Response` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:266 |
| PATCH | `/admin/models/:id/meta` | `backend\src\routes\admin-models.routes.ts L:115` | `adminModelsController.updateModelMetadata` | `adminModelsController_updateModelMetadata_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/models/:id/unarchive` | `backend\src\routes\admin-models.routes.ts L:100` | `adminModelsController.unarchiveModel` | `adminModelsController_unarchiveModel_Response` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:305 |
| POST | `/admin/models/:id/unmark-legacy` | `backend\src\routes\admin-models.routes.ts L:77` | `adminModelsController.unmarkModelLegacy` | `adminModelsController_unmarkModelLegacy_Response` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:278 |
| PATCH | `/admin/models/:modelId/tier` | `backend\src\routes\admin.routes.ts L:220` | `modelTierAdminController.updateModelTier` | `modelTierAdminController_updateModelTier_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/models/archived` | `backend\src\routes\admin-models.routes.ts L:141` | `adminModelsController.listArchivedModels` | `ModelListResponse` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/models/legacy` | `backend\src\routes\admin-models.routes.ts L:130` | `adminModelsController.listLegacyModels` | `ModelListResponse` | - | `authMiddleware, requireAdmin` | frontend\src\api\admin.ts L:386 |
| GET | `/admin/models/providers` | `backend\src\routes\admin.routes.ts L:257` | `modelTierAdminController.getProviders` | `{ providers, }` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/models/tiers` | `backend\src\routes\admin.routes.ts L:185` | `modelTierAdminController.listModelsWithTiers` | `modelTierAdminController_listModelsWithTiers_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/models/tiers/audit-logs` | `backend\src\routes\admin.routes.ts L:202` | `modelTierAdminController.getAuditLogs` | `modelTierAdminController_getAuditLogs_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/models/tiers/bulk` | `backend\src\routes\admin.routes.ts L:233` | `modelTierAdminController.bulkUpdateModelTiers` | `modelTierAdminController_bulkUpdateModelTiers_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/models/tiers/revert/:auditLogId` | `backend\src\routes\admin.routes.ts L:245` | `modelTierAdminController.revertTierChange` | `modelTierAdminController_revertTierChange_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/pricing/alerts` | `backend\src\routes\admin.routes.ts L:931` | `profitabilityController.getPricingAlerts` | `PricingAlert[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/pricing/configs` | `backend\src\routes\admin.routes.ts L:918` | `profitabilityController.getPricingConfigs` | `PricingConfigData[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/pricing/margin-by-provider` | `backend\src\routes\admin.routes.ts L:884` | `profitabilityController.getMarginByProvider` | `MarginByProvider[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/pricing/margin-by-tier` | `backend\src\routes\admin.routes.ts L:867` | `profitabilityController.getMarginByTier` | `MarginByTier[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/pricing/margin-metrics` | `backend\src\routes\admin.routes.ts L:850` | `profitabilityController.getMarginMetrics` | `MarginMetrics` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/pricing/simulate` | `backend\src\routes\admin.routes.ts L:974` | `profitabilityController.simulatePricing` | `SimulationResult` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/pricing/top-models` | `backend\src\routes\admin.routes.ts L:902` | `profitabilityController.getTopModels` | `TopModel[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/pricing/vendor-prices` | `backend\src\routes\admin.routes.ts L:947` | `profitabilityController.getVendorPrices` | `VendorPrice[]` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/settings` | `backend\src\routes\admin.routes.ts L:685` | `settingsController.getAllSettings` | `Record<SettingCategory, CategorySettings` | `500: SETTINGS_FETCH_ERROR` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/settings/:category` | `backend\src\routes\admin.routes.ts L:701` | `settingsController.getCategorySettings` | `CategorySettings` | `400: INVALID_CATEGORY`<br>`500: SETTINGS_FETCH_ERROR` | `authMiddleware, requireAdmin, auditLog` | - |
| PUT | `/admin/settings/:category` | `backend\src\routes\admin.routes.ts L:720` | `settingsController.updateCategorySettings` | `CategorySettings` | `400: INVALID_CATEGORY`<br>`400: VALIDATION_ERROR`<br>`500: SETTINGS_UPDATE_ERROR` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/settings/clear-cache` | `backend\src\routes\admin.routes.ts L:757` | `settingsController.clearCache` | `ClearCache_Response` | `500: CACHE_CLEAR_ERROR` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/settings/run-backup` | `backend\src\routes\admin.routes.ts L:772` | `settingsController.runBackup` | `CreateBackup_Response` | `500: BACKUP_ERROR` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/settings/test-email` | `backend\src\routes\admin.routes.ts L:743` | `settingsController.testEmailConfig` | `TestEmailConfig_Response` | `500: EMAIL_TEST_ERROR` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/subscriptions` | `backend\src\routes\admin.routes.ts L:99` | `adminController.getSubscriptionOverview` | `{ status: "success", data: adminController_getSubscriptionOverview_Data }` | `500: internal_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/subscriptions` | `backend\src\routes\plan109.routes.ts L:56` | `subscriptionController.createSubscription` | `subscriptionController_createSubscription_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/subscriptions/:id/allocate-credits` | `backend\src\routes\plan109.routes.ts L:106` | `subscriptionController.allocateMonthlyCredits` | `subscriptionController_allocateMonthlyCredits_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/subscriptions/:id/cancel` | `backend\src\routes\plan109.routes.ts L:86` | `subscriptionController.cancelSubscription` | `subscriptionController_cancelSubscription_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/subscriptions/:id/downgrade` | `backend\src\routes\plan109.routes.ts L:76` | `subscriptionController.downgradeTier` | `subscriptionController_downgradeTier_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/subscriptions/:id/reactivate` | `backend\src\routes\plan109.routes.ts L:96` | `subscriptionController.reactivateSubscription` | `subscriptionController_reactivateSubscription_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/subscriptions/:id/rollover` | `backend\src\routes\plan109.routes.ts L:116` | `subscriptionController.handleRollover` | `subscriptionController_handleRollover_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/subscriptions/:id/upgrade` | `backend\src\routes\plan109.routes.ts L:66` | `subscriptionController.upgradeTier` | `subscriptionController_upgradeTier_Response` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/subscriptions/:userId/features` | `backend\src\routes\plan109.routes.ts L:126` | `subscriptionController.checkFeatureAccess` | `subscriptionController_checkFeatureAccess_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/subscriptions/:userId/limits` | `backend\src\routes\plan109.routes.ts L:135` | `subscriptionController.getTierLimits` | `subscriptionController_getTierLimits_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/subscriptions/all` | `backend\src\routes\plan109.routes.ts L:153` | `subscriptionController.listAllSubscriptions` | `subscriptionController_listAllSubscriptions_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/subscriptions/stats` | `backend\src\routes\plan109.routes.ts L:162` | `subscriptionController.getSubscriptionStats` | `subscriptionController_getSubscriptionStats_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/subscriptions/user/:userId` | `backend\src\routes\plan109.routes.ts L:144` | `subscriptionController.getActiveSubscription` | `subscriptionController_getActiveSubscription_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/usage` | `backend\src\routes\admin.routes.ts L:114` | `adminController.getSystemUsage` | `{ status: "success", data: adminController_getSystemUsage_Data }` | `400: invalid_date`<br>`400: invalid_range`<br>`500: internal_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/users` | `backend\src\routes\admin.routes.ts L:76` | `adminController.listUsers` | `{ status: "success", data: adminController_listUsers_Data }` | `500: internal_error` | `authMiddleware, requireAdmin` | - |
| GET | `/admin/users` | `backend\src\routes\plan109.routes.ts L:175` | `userManagementController.listUsers` | `PaginatedUsers` | - | `authMiddleware, requireAdmin` | - |
| GET | `/admin/users/:id` | `backend\src\routes\plan109.routes.ts L:193` | `userManagementController.viewUserDetails` | `UserDetails` | - | `authMiddleware, requireAdmin` | - |
| PATCH | `/admin/users/:id` | `backend\src\routes\plan109.routes.ts L:202` | `userManagementController.editUserProfile` | `User` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/activity` | `backend\src\routes\admin.routes.ts L:475` | `adminUserDetailController.getUserActivity` | `UserActivityResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/users/:id/adjust-credits` | `backend\src\routes\plan109.routes.ts L:262` | `userManagementController.adjustUserCredits` | `CreditAdjustment` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/users/:id/ban` | `backend\src\routes\plan109.routes.ts L:232` | `userManagementController.banUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/coupons` | `backend\src\routes\admin.routes.ts L:426` | `adminUserDetailController.getUserCoupons` | `UserCouponsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/credits` | `backend\src\routes\admin.routes.ts L:403` | `adminUserDetailController.getUserCredits` | `UserCreditsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/licenses` | `backend\src\routes\admin.routes.ts L:378` | `adminUserDetailController.getUserLicenses` | `UserLicensesResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/overview` | `backend\src\routes\admin.routes.ts L:333` | `adminUserDetailController.getUserOverview` | `UserOverviewResponse` | `400: invalid_parameter`<br>`404: not_found`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/payments` | `backend\src\routes\admin.routes.ts L:452` | `adminUserDetailController.getUserPayments` | `UserPaymentsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| PATCH | `/admin/users/:id/role` | `backend\src\routes\admin.routes.ts L:623` | `-` | - | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/:id/subscriptions` | `backend\src\routes\admin.routes.ts L:355` | `adminUserDetailController.getUserSubscriptions` | `UserSubscriptionsResponse` | `400: invalid_parameter`<br>`500: internal_error` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/users/:id/suspend` | `backend\src\routes\admin.routes.ts L:88` | `adminController.suspendUser` | `{ status: "success", data: adminController_suspendUser_Data }` | `404: not_found`<br>`500: internal_error` | `authMiddleware, requireAdmin` | - |
| POST | `/admin/users/:id/suspend` | `backend\src\routes\plan109.routes.ts L:212` | `userManagementController.suspendUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/users/:id/unban` | `backend\src\routes\plan109.routes.ts L:242` | `userManagementController.unbanUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/users/:id/unsuspend` | `backend\src\routes\plan109.routes.ts L:222` | `userManagementController.unsuspendUser` | `User` | - | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/admin/users/bulk-update` | `backend\src\routes\plan109.routes.ts L:252` | `userManagementController.bulkUpdateUsers` | `BulkOperationResult` | - | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/admin/users/search` | `backend\src\routes\plan109.routes.ts L:184` | `userManagementController.searchUsers` | `User[]` | - | `authMiddleware, requireAdmin` | - |
| POST | `/admin/webhooks/test` | `backend\src\routes\admin.routes.ts L:124` | `adminController.testWebhook` | `{ status: "success", data: adminController_testWebhook_Data }` | `400: invalid_input`<br>`400: invalid_url`<br>`500: internal_error` | `authMiddleware, requireAdmin` | - |
| GET | `/api-docs/` | `backend\src\routes\swagger.routes.ts L:62` | `-` | - | - | `-` | - |
| GET | `/api-docs/swagger.json` | `backend\src\routes\swagger.routes.ts L:65` | `-` | - | - | `-` | - |
| GET | `/api/admin/analytics/upgrade-conversion` | `backend\src\routes\plan110.routes.ts L:442` | `upgradeController.getUpgradeConversion` | `upgradeController_getUpgradeConversion_Response` | `400: validation_error`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/api/admin/licenses` | `backend\src\routes\plan110.routes.ts L:298` | `licenseController.listAllLicenses` | `ListAllLicenses_Response` | - | `authMiddleware, requireAdmin` | - |
| POST | `/api/admin/licenses/:id/revoke` | `backend\src\routes\plan110.routes.ts L:285` | `licenseController.revokeLicense` | `PerpetualLicense` | `500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/api/admin/licenses/:id/suspend` | `backend\src\routes\plan110.routes.ts L:272` | `licenseController.suspendLicense` | `PerpetualLicense` | `500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/api/admin/licenses/devices` | `backend\src\routes\plan110.routes.ts L:326` | `deviceActivationController.getAllDeviceActivations` | `PaginatedDeviceActivationResponse` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/api/admin/licenses/devices/:id/deactivate` | `backend\src\routes\plan110.routes.ts L:348` | `deviceActivationController.deactivateDevice` | `deviceActivationController_deactivateDevice_Response` | `404: device_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/api/admin/licenses/devices/:id/revoke` | `backend\src\routes\plan110.routes.ts L:360` | `deviceActivationController.revokeDevice` | `deviceActivationController_revokeDevice_Response` | `400: validation_error`<br>`404: device_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| POST | `/api/admin/licenses/devices/bulk-action` | `backend\src\routes\plan110.routes.ts L:372` | `deviceActivationController.bulkAction` | `BulkAction_Response` | `400: validation_error`<br>`500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/api/admin/licenses/devices/stats` | `backend\src\routes\plan110.routes.ts L:337` | `deviceActivationController.getDeviceStats` | `DeviceStats` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/api/admin/licenses/stats` | `backend\src\routes\plan110.routes.ts L:310` | `licenseController.getLicenseStats` | `GetLicenseStats_Response` | - | `authMiddleware, requireAdmin` | - |
| GET | `/api/admin/prorations` | `backend\src\routes\plan110.routes.ts L:389` | `prorationController.listAllProrations` | `GetAllProrations_Response` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| GET | `/api/admin/prorations/:id/calculation` | `backend\src\routes\plan110.routes.ts L:426` | `prorationController.getCalculationBreakdown` | `GetCalculationBreakdown_Response` | `404: proration_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/api/admin/prorations/:id/reverse` | `backend\src\routes\plan110.routes.ts L:413` | `prorationController.reverseProration` | `ProrationEvent` | `400: validation_error`<br>`404: proration_not_found`<br>`500: internal_server_error` | `authMiddleware, requireAdmin, auditLog` | - |
| GET | `/api/admin/prorations/stats` | `backend\src\routes\plan110.routes.ts L:401` | `prorationController.getProrationStats` | `GetProrationStats_Response` | `500: internal_server_error` | `authMiddleware, requireAdmin` | - |
| POST | `/api/coupons/redeem` | `backend\src\routes\plan111.routes.ts L:65` | `couponController.redeemCoupon` | `CouponRedemption` | `401: unauthorized`<br>`404: coupon_not_found`<br>`400: redemption_failed` | `authMiddleware` | - |
| POST | `/api/coupons/validate` | `backend\src\routes\plan111.routes.ts L:56` | `couponController.validateCoupon` | `ValidationResult` | `500: validation_error` | `-` | - |
| POST | `/api/diagnostics` | `backend\src\routes\branding.routes.ts L:159` | `brandingController.uploadDiagnostic` | `brandingController_uploadDiagnostic_Response` | `400: VALIDATION_ERROR`<br>`500: INTERNAL_SERVER_ERROR` | `-` | - |
| POST | `/api/feedback` | `backend\src\routes\branding.routes.ts L:100` | `brandingController.submitFeedback` | `brandingController_submitFeedback_Response` | `400: VALIDATION_ERROR`<br>`500: INTERNAL_SERVER_ERROR` | `-` | frontend\src\services\api.ts L:248 |
| GET | `/api/licenses/:licenseKey` | `backend\src\routes\plan110.routes.ts L:96` | `licenseController.getLicenseDetails` | `licenseController_getLicenseDetails_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| GET | `/api/licenses/:licenseKey/available-upgrades` | `backend\src\routes\plan110.routes.ts L:141` | `upgradeController.getAvailableUpgrades` | `upgradeController_getAvailableUpgrades_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| GET | `/api/licenses/:licenseKey/devices` | `backend\src\routes\plan110.routes.ts L:106` | `licenseController.getActiveDevices` | `licenseController_getActiveDevices_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| POST | `/api/licenses/:licenseKey/upgrade` | `backend\src\routes\plan110.routes.ts L:130` | `upgradeController.purchaseUpgrade` | `upgradeController_purchaseUpgrade_Response` | `400: validation_error`<br>`404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/licenses/:licenseKey/upgrade-history` | `backend\src\routes\plan110.routes.ts L:151` | `upgradeController.getUpgradeHistory` | `upgradeController_getUpgradeHistory_Response` | `404: license_not_found`<br>`500: internal_server_error` | `-` | - |
| GET | `/api/licenses/:licenseKey/version-eligibility/:version` | `backend\src\routes\plan110.routes.ts L:120` | `upgradeController.checkVersionEligibility` | `upgradeController_checkVersionEligibility_Response` | `404: license_not_found`<br>`400: invalid_version`<br>`500: internal_server_error` | `-` | - |
| POST | `/api/licenses/activate` | `backend\src\routes\plan110.routes.ts L:64` | `licenseController.activateDevice` | `LicenseActivationResult` | `400: validation_error`<br>`404: license_not_found`<br>`403: activation_limit_reached`<br>`500: internal_server_error` | `-` | - |
| DELETE | `/api/licenses/activations/:id` | `backend\src\routes\plan110.routes.ts L:74` | `licenseController.deactivateDevice` | `{ message: 'Device deactivated successfully', }` | `404: activation_not_found`<br>`400: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| PATCH | `/api/licenses/activations/:id/replace` | `backend\src\routes\plan110.routes.ts L:85` | `licenseController.replaceDevice` | `LicenseActivation` | `400: validation_error`<br>`404: activation_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/licenses/purchase` | `backend\src\routes\plan110.routes.ts L:53` | `licenseController.purchaseLicense` | `PerpetualLicense` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/migrations/eligibility` | `backend\src\routes\plan110.routes.ts L:246` | `migrationController.checkMigrationEligibility` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/migrations/history` | `backend\src\routes\plan110.routes.ts L:257` | `migrationController.getMigrationHistory` | `GetMigrationHistory_Response` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/migrations/perpetual-to-subscription` | `backend\src\routes\plan110.routes.ts L:213` | `migrationController.migratePerpetualToSubscription` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`400: migration_not_allowed`<br>`404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/migrations/subscription-to-perpetual` | `backend\src\routes\plan110.routes.ts L:224` | `migrationController.migrateSubscriptionToPerpetual` | `ValidationResult` | `401: unauthorized`<br>`400: validation_error`<br>`400: migration_not_allowed`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/migrations/trade-in-value/:licenseId` | `backend\src\routes\plan110.routes.ts L:235` | `migrationController.getTradeInValue` | `migrationController_getTradeInValue_Response` | `404: license_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/subscriptions/:id/downgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:187` | `prorationController.downgradeWithProration` | `ProrationEvent` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/subscriptions/:id/proration-history` | `backend\src\routes\plan110.routes.ts L:198` | `prorationController.getProrationHistory` | `ProrationEvent[]` | `401: unauthorized`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/subscriptions/:id/proration-preview` | `backend\src\routes\plan110.routes.ts L:165` | `prorationController.previewProration` | `ProrationPreview` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/subscriptions/:id/upgrade-with-proration` | `backend\src\routes\plan110.routes.ts L:176` | `prorationController.upgradeWithProration` | `ProrationEvent` | `400: validation_error`<br>`404: subscription_not_found`<br>`500: internal_server_error` | `authMiddleware` | - |
| POST | `/api/track-download` | `backend\src\routes\branding.routes.ts L:68` | `brandingController.trackDownload` | `brandingController_trackDownload_Response` | `400: VALIDATION_ERROR`<br>`500: INTERNAL_SERVER_ERROR` | `-` | frontend\src\services\api.ts L:242 |
| GET | `/api/user/credits` | `backend\src\routes\api.routes.ts L:142` | `creditsController.getDetailedCredits` | `any` | - | `authMiddleware` | - |
| GET | `/api/user/invoices` | `backend\src\routes\api.routes.ts L:182` | `billingController.getInvoices` | `GetInvoices_Response` | - | `authMiddleware` | - |
| GET | `/api/user/profile` | `backend\src\routes\api.routes.ts L:105` | `usersController.getUserProfile` | - | - | `authMiddleware` | - |
| GET | `/api/user/usage/summary` | `backend\src\routes\api.routes.ts L:237` | `usageController.getMonthlySummary` | `UsageSummaryResponse` | - | `authMiddleware` | - |
| GET | `/api/users/:userId/coupons` | `backend\src\routes\plan111.routes.ts L:75` | `couponController.getUserCoupons` | `CouponRedemption[]` | `403: forbidden`<br>`500: internal_server_error` | `authMiddleware` | - |
| GET | `/api/version` | `backend\src\routes\branding.routes.ts L:128` | `brandingController.getLatestVersion` | `brandingController_getLatestVersion_Response` | `404: NOT_FOUND`<br>`500: INTERNAL_SERVER_ERROR` | `-` | frontend\src\services\api.ts L:254 |
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
| GET | `/health` | `backend\src\routes\index.ts L:132` | `-` | - | - | `-` | frontend\src\services\api.ts L:236 |
| GET | `/health/live` | `backend\src\routes\index.ts L:213` | `-` | - | - | `-` | - |
| GET | `/health/ready` | `backend\src\routes\index.ts L:174` | `-` | - | - | `-` | - |
| GET | `/oauth/google/authorize` | `backend\src\routes\social-auth.routes.ts L:64` | `socialAuthController.googleAuthorize` | `Redirect` | - | `-` | frontend\src\components\auth\GoogleLoginButton.tsx L:56 |
| GET | `/oauth/google/callback` | `backend\src\routes\social-auth.routes.ts L:109` | `socialAuthController.googleCallback` | `Redirect` | - | `-` | - |
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
| POST | `/webhooks/stripe` | `backend\src\routes\index.ts L:273` | `subscriptionsController.handleStripeWebhook` | `{ received: true }` | `400: invalid_request`<br>`401: unauthorized`<br>`500: internal_server_error` | `-` | - |

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
| GET | `/interaction/:uid/data` | `identity-provider\src\app.ts L:61` | `authController.getInteractionData` | `authController_getInteractionData_Response` | - | `-` | identity-provider\src\views\consent.html L:294<br>identity-provider\src\views\login.html L:233 |
| POST | `/interaction/:uid/login` | `identity-provider\src\app.ts L:58` | `authController.login` | - | - | `-` | identity-provider\src\views\login.html L:270 |
| GET | `/logout` | `identity-provider\src\app.ts L:64` | `authController.logout` | `Redirect` | - | `-` | - |
| GET | `/oauth/authorize` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| POST | `/oauth/introspect` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/oauth/jwks` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | backend\src\services\token-introspection.service.ts L:126 |
| POST | `/oauth/revoke` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| POST | `/oauth/token` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |
| GET | `/oauth/userinfo` | `identity-provider (OIDC Provider) L:0` | `-` | - | - | `-` | - |

---

## Summary Statistics

### Backend API

- **Total Endpoints:** 221
- **Endpoints with Usages:** 18
- **Total Usage References:** 1358
- **Unused Endpoints:** 203

### Identity Provider (OAuth 2.0/OIDC)

- **Total Endpoints:** 14
- **Endpoints with Usages:** 7
- **Total Usage References:** 14
- **Unused Endpoints:** 7

---

## Schemas

Referenced TypeScript types and interfaces used in API responses:

### adminController_getMetrics_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 64)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:64
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

**Source:** `backend\src\routes\admin.routes.ts` (Line 99)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:99
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

**Source:** `backend\src\routes\admin.routes.ts` (Line 114)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:114
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

**Source:** `backend\src\routes\admin.routes.ts` (Line 76)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:76
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
            creditsBalance: user.credit_balance?.amount || 0,
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

**Source:** `backend\src\routes\admin.routes.ts` (Line 88)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:88
type adminController_suspendUser_Data = {
        message: `User ${id} suspended`,
        note: 'Suspension functionality requires User model update (add suspended field)',
      }
```

### adminController_testWebhook_Data

**Source:** `backend\src\routes\admin.routes.ts` (Line 124)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:124
type adminController_testWebhook_Data = {
        message: 'Test webhook functionality pending',
        note: 'Requires WebhookService.sendTestWebhook implementation',
        payload: testPayload,
      }
```

### adminModelsController_archiveModel_Response

**Source:** `backend\src\routes\admin-models.routes.ts` (Line 91)

```typescript
// Inline response from backend\src\routes\admin-models.routes.ts:91
type adminModelsController_archiveModel_Response = {
        status: 'success',
        message: `Model '${modelId}' archived`,
      }
```

### adminModelsController_markModelAsLegacy_Response

**Source:** `backend\src\routes\admin-models.routes.ts` (Line 66)

```typescript
// Inline response from backend\src\routes\admin-models.routes.ts:66
type adminModelsController_markModelAsLegacy_Response = {
        status: 'success',
        message: `Model '${modelId}' marked as legacy`,
      }
```

### adminModelsController_unarchiveModel_Response

**Source:** `backend\src\routes\admin-models.routes.ts` (Line 100)

```typescript
// Inline response from backend\src\routes\admin-models.routes.ts:100
type adminModelsController_unarchiveModel_Response = {
        status: 'success',
        message: `Model '${modelId}' unarchived`,
      }
```

### adminModelsController_unmarkModelLegacy_Response

**Source:** `backend\src\routes\admin-models.routes.ts` (Line 77)

```typescript
// Inline response from backend\src\routes\admin-models.routes.ts:77
type adminModelsController_unmarkModelLegacy_Response = {
        status: 'success',
        message: `Model '${modelId}' unmarked as legacy`,
      }
```

### adminModelsController_updateModelMetadata_Response

**Source:** `backend\src\routes\admin-models.routes.ts` (Line 115)

```typescript
// Inline response from backend\src\routes\admin-models.routes.ts:115
type adminModelsController_updateModelMetadata_Response = {
        status: 'success',
        message: `Model '${modelId}' metadata updated`,
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

**Source:** `backend\src\routes\admin.routes.ts` (Line 279)

```typescript
// Controller response data from backend\src\routes\admin.routes.ts:279
type auditLogController_getAuditLogs_Data = {
        total,
        page: Math.floor(filters.offset / filters.limit),
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
        hasMore: filters.offset + logs.length < total
      }
```

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
          emailVerified: user.emailVerified,
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

### billingController_addPaymentMethod_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 276)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:276
type billingController_addPaymentMethod_Response = {
        status: 'success',
        data: { message: 'Payment method added successfully' },
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

### BulkAction_Response

**Source:** `backend\src\services\device-activation-management.service.ts` (Line 329)

```typescript
// Service method return type from device-activation-management.service.ts
type BulkAction_Response = { affectedCount: number }
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

### CategorySettings

**Source:** `backend\src\services\settings.service.ts` (Line 48)

```typescript
export interface CategorySettings {
  [key: string]: any;
}
```

### ClearCache_Response

**Source:** `backend\src\services\settings.service.ts` (Line 393)

```typescript
// Service method return type from settings.service.ts
type ClearCache_Response = { success: boolean; message: string }
```

### CouponAnalyticsMetrics

**Source:** `shared-types\src\coupon.types.ts` (Line 270)

```typescript
export interface CouponAnalyticsMetrics {
  totalRedemptions: number;
  totalDiscountValue: number;
  averageDiscountPerRedemption: number;
  conversionRate: number; // Percentage
  fraudDetectionRate: number; // Percentage
  monthOverMonthChange: {
    redemptions: number; // Percentage change
    discountValue: number; // Percentage change
  };
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

### CreateBackup_Response

**Source:** `backend\src\services\settings.service.ts` (Line 404)

```typescript
// Service method return type from settings.service.ts
type CreateBackup_Response = { success: boolean; message: string; timestamp?: string }
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

### creditController_allocateSubscriptionCredits_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 366)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:366
type creditController_allocateSubscriptionCredits_Response = {
        status: 'success',
        data: allocation,
        meta: {
          message: 'Credits allocated successfully',
        },
      }
```

### creditController_applyRollover_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 415)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:415
type creditController_applyRollover_Response = {
        status: 'success',
        data: { message: `Rollover of ${rolloverAmount} credits applied` },
      }
```

### creditController_calculateRollover_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 406)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:406
type creditController_calculateRollover_Response = {
        success: true,
        data: rolloverCalculation,
      }
```

### creditController_deductCreditsManually_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 396)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:396
type creditController_deductCreditsManually_Response = {
        status: 'success',
        data: { message: `${amount} credits deducted` },
      }
```

### creditController_getCreditAllocationHistory_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 453)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:453
type creditController_getCreditAllocationHistory_Response = {
        success: true,
        data: history,
      }
```

### creditController_getCreditBalance_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 444)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:444
type creditController_getCreditBalance_Response = {
        success: true,
        data: balance,
      }
```

### creditController_getCreditUsageByPeriod_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 462)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:462
type creditController_getCreditUsageByPeriod_Response = {
        success: true,
        data: usage,
      }
```

### creditController_grantBonusCredits_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 386)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:386
type creditController_grantBonusCredits_Response = {
        status: 'success',
        data: allocation,
        meta: {
          message: `${amount} bonus credits granted`,
        },
      }
```

### creditController_processMonthlyAllocations_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 376)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:376
type creditController_processMonthlyAllocations_Response = {
        status: 'success',
        data: summary,
        meta: {
          message: `Monthly allocations processed: ${summary.totalUsers} users, ${summary.totalAllocated} credits`,
        },
      }
```

### creditController_reconcileCreditBalance_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 435)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:435
type creditController_reconcileCreditBalance_Response = {
        success: true,
        data: reconciliation,
        message: reconciliation.reconciled
          ? 'Balances are reconciled'
          : `Difference found: ${reconciliation.difference} credits`,
      }
```

### creditController_syncWithTokenCreditSystem_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 425)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:425
type creditController_syncWithTokenCreditSystem_Response = {
        status: 'success',
        data: { message: 'Credits synced with token-credit system' },
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

### deviceActivationController_deactivateDevice_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 348)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:348
type deviceActivationController_deactivateDevice_Response = {
        status: 'success',
        data: {
          message: 'Device deactivated successfully',
        },
      }
```

### deviceActivationController_revokeDevice_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 360)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:360
type deviceActivationController_revokeDevice_Response = {
        status: 'success',
        data: {
          message: 'Device revoked successfully',
        },
      }
```

### DeviceStats

**Source:** `backend\src\services\device-activation-management.service.ts` (Line 37)

```typescript
export interface DeviceStats {
  totalActive: number;
  licensesAtMaxCapacity: number;
  recentlyActivated24h: number;
  suspiciousActivations: number;
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

### GetInvoices_Response

**Source:** `backend\src\services\billing-payments.service.ts` (Line 832)

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

### GetLicenseStats_Response

**Source:** `backend\src\services\license-management.service.ts` (Line 677)

```typescript
// Service method return type from license-management.service.ts
type GetLicenseStats_Response = {
    total: number;
    active: number;
    suspended: number;
    revoked: number;
    byTier: Record<string, number>;
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

**Source:** `backend\src\services\model.service.ts` (Line 387)

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
        isAvailable: true,
        isLegacy: true,
        isArchived: true,
        meta: true,
      },
    });

    // Reject if model is not available or archived
    if (!model || !model.isAvailable || model.isArchived) {
      logger.warn('ModelService: Model not available for inference', {
        modelId,
        reason: !model
          ? 'not_found'
          : model.isArchived
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

### LicenseActivationResult

**Source:** `backend\src\services\license-management.service.ts` (Line 34)

```typescript
export interface LicenseActivationResult {
  activation: LicenseActivation;
  isNewActivation: boolean;
}
```

### licenseController_getActiveDevices_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 106)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:106
type licenseController_getActiveDevices_Response = {
        license_key: licenseKey,
        max_activations: license.maxActivations,
        current_activations: devices.length,
        devices: devices.map((d) => ({
          id: d.id,
          device_name: d.deviceName,
          os_type: d.osType,
          os_version: d.osVersion,
          cpu_info: d.cpuInfo,
          activated_at: d.activatedAt.toISOString(),
          last_seen_at: d.lastSeenAt.toISOString(),
        })),
      }
```

### licenseController_getLicenseDetails_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 96)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:96
type licenseController_getLicenseDetails_Response = {
        id: license.id,
        license_key: license.licenseKey,
        purchased_version: license.purchasedVersion,
        eligible_until_version: license.eligibleUntilVersion,
        max_activations: license.maxActivations,
        current_activations: license.currentActivations,
        status: license.status,
        purchased_at: license.purchasedAt.toISOString(),
        activated_at: license.activatedAt?.toISOString() || null,
        activations: license.activations?.map((a) => ({
          id: a.id,
          device_name: a.deviceName,
          os_type: a.osType,
          status: a.status,
          activated_at: a.activatedAt.toISOString(),
        })),
        version_upgrades: license.versionUpgrades?.map((u) => ({
          id: u.id,
          from_version: u.fromVersion,
          to_version: u.toVersion,
          upgrade_price_usd: u.upgradePriceUsd,
          status: u.status,
          purchased_at: u.purchasedAt.toISOString(),
        })),
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

### ListAllLicenses_Response

**Source:** `backend\src\services\license-management.service.ts` (Line 618)

```typescript
// Service method return type from license-management.service.ts
type ListAllLicenses_Response = { data: PerpetualLicense[]; total: number; page: number; limit: number }
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

### MarginMetrics

**Source:** `backend\src\services\admin-profitability.service.ts` (Line 25)

```typescript
export interface MarginMetrics {
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  marginPercentage: number;
  period: string;
  change?: {
    revenue: number;
    cost: number;
    margin: number;
  };
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

### modelTierAdminController_bulkUpdateModelTiers_Response

**Source:** `backend\src\routes\admin.routes.ts` (Line 233)

```typescript
// Inline response from backend\src\routes\admin.routes.ts:233
type modelTierAdminController_bulkUpdateModelTiers_Response = {
        status: 'success',
        data: result,
      }
```

### modelTierAdminController_getAuditLogs_Response

**Source:** `backend\src\routes\admin.routes.ts` (Line 202)

```typescript
// Inline response from backend\src\routes\admin.routes.ts:202
type modelTierAdminController_getAuditLogs_Response = {
        status: 'success',
        data: result,
      }
```

### modelTierAdminController_listModelsWithTiers_Response

**Source:** `backend\src\routes\admin.routes.ts` (Line 185)

```typescript
// Inline response from backend\src\routes\admin.routes.ts:185
type modelTierAdminController_listModelsWithTiers_Response = {
        status: 'success',
        data: result,
      }
```

### modelTierAdminController_revertTierChange_Response

**Source:** `backend\src\routes\admin.routes.ts` (Line 245)

```typescript
// Inline response from backend\src\routes\admin.routes.ts:245
type modelTierAdminController_revertTierChange_Response = {
        status: 'success',
        data: result.model,
        meta: {
          auditLog: result.auditLog,
        },
      }
```

### modelTierAdminController_updateModelTier_Response

**Source:** `backend\src\routes\admin.routes.ts` (Line 220)

```typescript
// Inline response from backend\src\routes\admin.routes.ts:220
type modelTierAdminController_updateModelTier_Response = {
        status: 'success',
        data: result.model,
        meta: {
          auditLog: result.auditLog,
        },
      }
```

### PaginatedDeviceActivationResponse

**Source:** `backend\src\services\device-activation-management.service.ts` (Line 53)

```typescript
export interface PaginatedDeviceActivationResponse {
  devices: DeviceActivationData[];
  stats: DeviceStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

### SimulationResult

**Source:** `backend\src\services\admin-profitability.service.ts` (Line 112)

```typescript
export interface SimulationResult {
  currentMarginDollars: number;
  projectedMarginDollars: number;
  marginChange: number;
  marginChangePercent: number;
  currentMarginPercent: number;
  projectedMarginPercent: number;
  affectedRequests: number;
  revenueImpact: number;
}
```

### subscriptionController_allocateMonthlyCredits_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 106)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:106
type subscriptionController_allocateMonthlyCredits_Response = {
        status: 'success',
        data: allocation,
        meta: {
          message: 'Monthly credits allocated successfully',
        },
      }
```

### subscriptionController_cancelSubscription_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 86)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:86
type subscriptionController_cancelSubscription_Response = {
        status: 'success',
        data: subscription,
        meta: {
          message: cancelAtPeriodEnd
            ? 'Subscription will be cancelled at period end'
            : 'Subscription cancelled immediately',
        },
      }
```

### subscriptionController_checkFeatureAccess_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 126)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:126
type subscriptionController_checkFeatureAccess_Response = {
        success: true,
        data: {
          userId,
          feature: parseResult.data.feature,
          canAccess,
        },
      }
```

### subscriptionController_createSubscription_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 56)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:56
type subscriptionController_createSubscription_Response = {
        success: true,
        data: subscription,
      }
```

### subscriptionController_downgradeTier_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 76)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:76
type subscriptionController_downgradeTier_Response = {
        status: 'success',
        data: subscription,
        meta: {
          message: `Subscription downgraded to ${newTier}`,
        },
      }
```

### subscriptionController_getActiveSubscription_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 144)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:144
type subscriptionController_getActiveSubscription_Response = {
        success: true,
        data: subscription,
      }
```

### subscriptionController_getSubscriptionStats_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 162)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:162
type subscriptionController_getSubscriptionStats_Response = {
        success: true,
        data: stats,
      }
```

### subscriptionController_getTierLimits_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 135)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:135
type subscriptionController_getTierLimits_Response = {
        success: true,
        data: limits,
      }
```

### subscriptionController_handleRollover_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 116)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:116
type subscriptionController_handleRollover_Response = {
        status: 'success',
        data: { message: 'Credit rollover processed successfully' },
      }
```

### subscriptionController_listAllSubscriptions_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 153)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:153
type subscriptionController_listAllSubscriptions_Response = {
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      }
```

### subscriptionController_reactivateSubscription_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 96)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:96
type subscriptionController_reactivateSubscription_Response = {
        status: 'success',
        data: subscription,
        meta: {
          message: 'Subscription reactivated successfully',
        },
      }
```

### subscriptionController_upgradeTier_Response

**Source:** `backend\src\routes\plan109.routes.ts` (Line 66)

```typescript
// Inline response from backend\src\routes\plan109.routes.ts:66
type subscriptionController_upgradeTier_Response = {
        status: 'success',
        data: subscription,
        meta: {
          message: `Subscription upgraded to ${newTier}`,
        },
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

### TestEmailConfig_Response

**Source:** `backend\src\services\settings.service.ts` (Line 373)

```typescript
// Service method return type from settings.service.ts
type TestEmailConfig_Response = { success: boolean; message: string }
```

### upgradeController_checkVersionEligibility_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 120)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:120
type upgradeController_checkVersionEligibility_Response = {
        license_key: licenseKey,
        requested_version: version,
        is_eligible: isFree,
        is_free: isFree,
        requires_payment: !isFree,
        current_eligible_range: {
          min: license.purchasedVersion,
          max: license.eligibleUntilVersion,
        },
      }
```

### upgradeController_getAvailableUpgrades_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 141)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:141
type upgradeController_getAvailableUpgrades_Response = {
        license_key: licenseKey,
        current_version: license.eligibleUntilVersion,
        available_upgrades: upgrades,
      }
```

### upgradeController_getUpgradeConversion_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 442)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:442
type upgradeController_getUpgradeConversion_Response = {
        major_version: majorVersion,
        conversion_rate: conversionRate,
        conversion_percentage: `${(conversionRate * 100).toFixed(2)}%`,
      }
```

### upgradeController_getUpgradeHistory_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 151)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:151
type upgradeController_getUpgradeHistory_Response = {
        license_key: licenseKey,
        upgrade_history: history.map((u) => ({
          id: u.id,
          from_version: u.fromVersion,
          to_version: u.toVersion,
          upgrade_price_usd: u.upgradePriceUsd,
          status: u.status,
          purchased_at: u.purchasedAt.toISOString(),
        })),
      }
```

### upgradeController_purchaseUpgrade_Response

**Source:** `backend\src\routes\plan110.routes.ts` (Line 130)

```typescript
// Inline response from backend\src\routes\plan110.routes.ts:130
type upgradeController_purchaseUpgrade_Response = {
        status: 'success',
        data: {
          upgrade_id: upgrade.id,
          license_id: license.id,
          from_version: upgrade.fromVersion,
          to_version: upgrade.toVersion,
          upgrade_price_usd: upgrade.upgradePriceUsd,
          pricing_breakdown: pricing,
          status: upgrade.status,
          purchased_at: upgrade.purchasedAt.toISOString(),
        },
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

### UsageSummaryResponse

**Source:** `backend\src\services\usage.service.ts` (Line 717)

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

