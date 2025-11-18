/**
 * Admin Routes
 *
 * Administrative endpoints for monitoring and management.
 * All endpoints use the AdminController with dependency injection.
 *
 * Endpoints:
 * - GET  /admin/metrics           - System metrics and analytics
 * - GET  /admin/users             - User management with pagination
 * - POST /admin/users/:id/suspend - Suspend user account
 * - GET  /admin/subscriptions     - Subscription overview
 * - GET  /admin/usage             - System-wide usage statistics
 * - POST /admin/webhooks/test     - Test webhook delivery
 *
 * Authentication: Bearer token (ADMIN_TOKEN env var)
 * Note: Admin endpoints use modern response format
 *
 * Reference: docs/progress/023-api-consolidation-phase-2.md
 */

import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AdminAnalyticsController } from '../controllers/admin-analytics.controller';
import { AdminUserDetailController } from '../controllers/admin-user-detail.controller';
import { ModelTierAdminController } from '../controllers/admin/model-tier-admin.controller';
import { AuditLogController } from '../controllers/audit-log.controller';
import { RevenueAnalyticsController } from '../controllers/revenue-analytics.controller';
import { SettingsController } from '../controllers/admin/settings.controller';
import { BillingController } from '../controllers/billing.controller';
import { ProfitabilityController } from '../controllers/admin/profitability.controller';
import vendorAnalyticsRoutes from './vendor-analytics.routes';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { container } from '../container';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware, requireAdmin);

// Resolve controllers from DI container
const adminController = container.resolve(AdminController);
const adminAnalyticsController = container.resolve(AdminAnalyticsController);
const adminUserDetailController = container.resolve(AdminUserDetailController);
const modelTierAdminController = container.resolve(ModelTierAdminController);
const auditLogController = container.resolve(AuditLogController);
const revenueAnalyticsController = container.resolve(RevenueAnalyticsController);
const settingsController = container.resolve(SettingsController);
const billingController = container.resolve(BillingController);
const profitabilityController = container.resolve(ProfitabilityController);

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * GET /admin/metrics
 * Get system metrics and analytics
 *
 * Returns aggregated metrics for downloads, feedback, diagnostics, and timestamps.
 * Migrated from legacy admin.ts with backward-compatible response format.
 */
router.get('/metrics', asyncHandler(adminController.getMetrics.bind(adminController)));

/**
 * GET /admin/users
 * List and manage users with pagination
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - search: string (optional - search by email or username)
 * - tier: string (optional - filter by subscription tier)
 */
router.get('/users', asyncHandler(adminController.listUsers.bind(adminController)));

/**
 * POST /admin/users/:id/suspend
 * Suspend a user account
 *
 * Path parameters:
 * - id: string (user ID)
 *
 * Request body:
 * - reason: string (optional)
 */
router.post(
  '/users/:id/suspend',
  asyncHandler(adminController.suspendUser.bind(adminController))
);

/**
 * GET /admin/subscriptions
 * Get subscription overview and statistics
 *
 * Returns aggregated subscription counts by tier and status.
 */
router.get(
  '/subscriptions',
  asyncHandler(adminController.getSubscriptionOverview.bind(adminController))
);

/**
 * GET /admin/usage
 * Get system-wide usage statistics
 *
 * Query parameters:
 * - startDate: ISO-8601 date string (optional)
 * - endDate: ISO-8601 date string (optional)
 *
 * Returns aggregated usage data by model and operation type.
 */
router.get('/usage', asyncHandler(adminController.getSystemUsage.bind(adminController)));

/**
 * POST /admin/webhooks/test
 * Test webhook delivery
 *
 * Request body:
 * - url: string (webhook URL)
 * - event: string (event type)
 */
router.post(
  '/webhooks/test',
  asyncHandler(adminController.testWebhook.bind(adminController))
);

// =============================================================================
// Admin Analytics Endpoints (Phase 2 - Unified Dashboard)
// =============================================================================

/**
 * GET /admin/analytics/dashboard-kpis
 * Get cross-plan dashboard KPIs
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
 *
 * Returns:
 * - totalRevenue: { value, change, breakdown: { mrr, perpetual, upgrades } }
 * - activeUsers: { value, change }
 * - creditsConsumed: { value, change }
 * - couponRedemptions: { value, change, totalDiscount }
 */
router.get(
  '/analytics/dashboard-kpis',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(adminAnalyticsController.getDashboardKPIs.bind(adminAnalyticsController))
);

/**
 * GET /admin/analytics/recent-activity
 * Get recent activity feed from multiple sources
 *
 * Query parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 *
 * Returns:
 * - events: ActivityEvent[] (subscription, license, coupon, credit, device events)
 * - total: number
 * - limit: number
 * - offset: number
 */
router.get(
  '/analytics/recent-activity',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(adminAnalyticsController.getRecentActivity.bind(adminAnalyticsController))
);

// =============================================================================
// Model Tier Management Endpoints
// =============================================================================

/**
 * GET /admin/models/tiers
 * List all models with tier configurations
 *
 * Query parameters:
 * - provider: string (optional) - Filter by provider
 * - tier: string (optional) - Filter by required tier
 * - restrictionMode: string (optional) - Filter by restriction mode
 */
router.get(
  '/models/tiers',
  asyncHandler(modelTierAdminController.listModelsWithTiers.bind(modelTierAdminController))
);

/**
 * GET /admin/models/tiers/audit-logs
 * Get audit logs with filtering and pagination
 *
 * Query parameters:
 * - modelId: string (optional)
 * - adminUserId: string (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 */
router.get(
  '/models/tiers/audit-logs',
  asyncHandler(modelTierAdminController.getAuditLogs.bind(modelTierAdminController))
);

/**
 * PATCH /admin/models/:modelId/tier
 * Update a single model's tier configuration
 *
 * Path parameters:
 * - modelId: string
 *
 * Request body:
 * - requiredTier: "free" | "pro" | "enterprise" (optional)
 * - tierRestrictionMode: "minimum" | "exact" | "whitelist" (optional)
 * - allowedTiers: array of tiers (optional)
 * - reason: string (optional)
 */
router.patch(
  '/models/:modelId/tier',
  asyncHandler(modelTierAdminController.updateModelTier.bind(modelTierAdminController))
);

/**
 * POST /admin/models/tiers/bulk
 * Bulk update multiple models' tier configurations
 *
 * Request body:
 * - updates: array of { modelId, requiredTier?, tierRestrictionMode?, allowedTiers? }
 * - reason: string (optional)
 */
router.post(
  '/models/tiers/bulk',
  asyncHandler(modelTierAdminController.bulkUpdateModelTiers.bind(modelTierAdminController))
);

/**
 * POST /admin/models/tiers/revert/:auditLogId
 * Revert a tier change to its previous values
 *
 * Path parameters:
 * - auditLogId: string (audit log entry ID)
 */
router.post(
  '/models/tiers/revert/:auditLogId',
  asyncHandler(modelTierAdminController.revertTierChange.bind(modelTierAdminController))
);

/**
 * GET /admin/models/providers
 * Get list of unique providers for filtering
 *
 * Returns:
 * - providers: string[] (list of provider names)
 */
router.get(
  '/models/providers',
  asyncHandler(modelTierAdminController.getProviders.bind(modelTierAdminController))
);

// =============================================================================
// Audit Log Viewer Endpoints (Phase 4 P0 Fixes)
// =============================================================================

/**
 * GET /admin/audit-logs
 * Get audit logs with pagination and filtering
 *
 * Query parameters:
 * - adminUserId: string (optional) - Filter by admin user ID
 * - resourceType: string (optional) - Filter by resource type
 * - action: string (optional) - Filter by action (create/update/delete/read)
 * - startDate: ISO date string (optional) - Filter by start date
 * - endDate: ISO date string (optional) - Filter by end date
 * - limit: number (optional, default 100)
 * - offset: number (optional, default 0)
 */
router.get(
  '/audit-logs',
  asyncHandler(auditLogController.getAuditLogs.bind(auditLogController))
);

/**
 * GET /admin/audit-logs/resource/:resourceType/:resourceId
 * Get audit logs for a specific resource
 *
 * Path parameters:
 * - resourceType: string - Type of resource (subscription, license, coupon, etc.)
 * - resourceId: string - ID of the resource
 *
 * Query parameters:
 * - limit: number (optional, default 50)
 */
router.get(
  '/audit-logs/resource/:resourceType/:resourceId',
  asyncHandler(auditLogController.getLogsForResource.bind(auditLogController))
);

/**
 * GET /admin/audit-logs/admin/:adminUserId
 * Get audit logs for a specific admin user
 *
 * Path parameters:
 * - adminUserId: string - ID of the admin user
 *
 * Query parameters:
 * - limit: number (optional, default 100)
 */
router.get(
  '/audit-logs/admin/:adminUserId',
  asyncHandler(auditLogController.getLogsForAdmin.bind(auditLogController))
);

// =============================================================================
// Unified User Detail Endpoints (Phase 4 - Backend)
// =============================================================================

/**
 * GET /admin/users/:id/overview
 * Get user profile and current status
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Returns:
 * - User basic info
 * - Current subscription
 * - Current license
 * - Credit balance
 * - Quick stats (total subscriptions, licenses, credits, coupons)
 */
router.get(
  '/users/:id/overview',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserOverview.bind(adminUserDetailController))
);

/**
 * GET /admin/users/:id/subscriptions
 * Get user subscription history and proration events
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Query parameters:
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 *
 * Returns:
 * - Subscription history
 * - Proration events (tier changes)
 * - Pagination info
 */
router.get(
  '/users/:id/subscriptions',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserSubscriptions.bind(adminUserDetailController))
);

/**
 * GET /admin/users/:id/licenses
 * Get user perpetual licenses with device activations
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Query parameters:
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 *
 * Returns:
 * - Perpetual licenses
 * - Device activations per license
 * - Version upgrade history
 * - Pagination info
 */
router.get(
  '/users/:id/licenses',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserLicenses.bind(adminUserDetailController))
);

/**
 * GET /admin/users/:id/credits
 * Get user credit balance, allocations, and usage
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 * - limit: number (optional, default 100, max 200)
 * - offset: number (optional, default 0)
 *
 * Returns:
 * - Current credit balance
 * - Credit allocations (by source)
 * - Credit usage by model (aggregated)
 * - Credit deduction ledger
 * - Total allocations and usage
 */
router.get(
  '/users/:id/credits',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserCredits.bind(adminUserDetailController))
);

/**
 * GET /admin/users/:id/coupons
 * Get user coupon redemptions and fraud flags
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Query parameters:
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 *
 * Returns:
 * - Coupon redemptions
 * - Fraud detection flags
 * - Total discount value
 * - Pagination info
 */
router.get(
  '/users/:id/coupons',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserCoupons.bind(adminUserDetailController))
);

/**
 * GET /admin/users/:id/payments
 * Get user payment history (PLACEHOLDER - Not implemented)
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Query parameters:
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 *
 * Returns:
 * - Empty invoices array (placeholder)
 * - Payment method info (null)
 * - Stripe customer ID (if exists)
 * - Pagination info
 *
 * NOTE: This endpoint is a placeholder for future implementation
 * when Invoice and PaymentMethod tables are added to the schema.
 */
router.get(
  '/users/:id/payments',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserPayments.bind(adminUserDetailController))
);

/**
 * GET /admin/users/:id/activity
 * Get combined timeline of all user activities
 *
 * Path parameters:
 * - id: string - User ID
 *
 * Query parameters:
 * - type: 'subscription' | 'license' | 'coupon' | 'credit' | 'device' | 'all' (optional, default 'all')
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 *
 * Returns:
 * - Combined activity timeline from all sources
 * - Filtered by type if specified
 * - Pagination info
 */
router.get(
  '/users/:id/activity',
  auditLog({ action: 'read', resourceType: 'user' }),
  asyncHandler(adminUserDetailController.getUserActivity.bind(adminUserDetailController))
);

// =============================================================================
// Revenue Analytics Endpoints (Phase 4 - Backend)
// =============================================================================

/**
 * GET /admin/analytics/revenue/kpis
 * Get revenue KPIs: total revenue, MRR, perpetual, ARPU, coupon discount
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 *
 * Returns:
 * - totalRevenue: { value, change }
 * - mrr: { value, change }
 * - perpetualRevenue: { value, change }
 * - arpu: { value, change }
 * - couponDiscount: { value, period }
 */
router.get(
  '/analytics/revenue/kpis',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getRevenueKPIs.bind(revenueAnalyticsController))
);

/**
 * GET /admin/analytics/revenue/mix
 * Get revenue breakdown by type (subscription, perpetual, upgrade)
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 *
 * Returns:
 * - subscriptionRevenue: number (USD cents)
 * - perpetualRevenue: number (USD cents)
 * - upgradeRevenue: number (USD cents)
 */
router.get(
  '/analytics/revenue/mix',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getRevenueMix.bind(revenueAnalyticsController))
);

/**
 * GET /admin/analytics/revenue/trend
 * Get revenue trend data with automatic aggregation
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 *
 * Aggregation:
 * - '7d', '30d': Daily
 * - '90d': Weekly
 * - '1y': Monthly
 *
 * Returns:
 * - data: Array of { date, totalRevenue, subscriptionRevenue, perpetualRevenue }
 */
router.get(
  '/analytics/revenue/trend',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getRevenueTrend.bind(revenueAnalyticsController))
);

/**
 * GET /admin/analytics/revenue/conversion-funnel
 * Get user conversion funnel: free -> paid -> perpetual
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 *
 * Returns:
 * - freeTier: { count, percentage }
 * - paidSubscription: { count, percentage, conversionRate }
 * - perpetualLicense: { count, percentage, conversionRate }
 */
router.get(
  '/analytics/revenue/conversion-funnel',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getRevenueFunnel.bind(revenueAnalyticsController))
);

/**
 * GET /admin/analytics/revenue/funnel
 * Alias for /admin/analytics/revenue/conversion-funnel
 * Get user conversion funnel: free -> paid -> perpetual
 */
router.get(
  '/analytics/revenue/funnel',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getRevenueFunnel.bind(revenueAnalyticsController))
);

/**
 * GET /admin/analytics/revenue/credit-usage
 * Get credit usage by model with revenue contribution estimates
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 * - limit: number (optional, default 10, max 100)
 *
 * Returns:
 * - data: Array of { model, credits, requests, revenue_contribution }
 */
router.get(
  '/analytics/revenue/credit-usage',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getCreditUsage.bind(revenueAnalyticsController))
);

/**
 * GET /admin/analytics/revenue/coupon-roi
 * Get coupon ROI analysis by campaign
 *
 * Query parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (optional, default '30d')
 * - limit: number (optional, default 10, max 100)
 *
 * Returns:
 * - data: Array of { campaign_name, coupons_issued, coupons_redeemed, discount_value, revenue_generated, roi_percentage }
 */
router.get(
  '/analytics/revenue/coupon-roi',
  auditLog({ action: 'read', resourceType: 'analytics' }),
  asyncHandler(revenueAnalyticsController.getCouponROI.bind(revenueAnalyticsController))
);


// =============================================================================
// Phase 5: Admin Session Management - Role Change Endpoint
// =============================================================================

/**
 * PATCH /admin/users/:id/role
 * Change user role and invalidate all sessions
 *
 * Body:
 * - role: 'user' | 'admin'
 *
 * Returns:
 * - Updated user details
 * - Number of sessions invalidated
 */
router.patch(
  '/users/:id/role',
  auditLog({ action: 'update', resourceType: 'user' }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ROLE',
          message: 'Role must be either "user" or "admin"',
        },
      });
    }

    // Get UserManagementService
    const { UserManagementService } = await import('../services/user-management.service');
    const userManagementService = container.resolve(UserManagementService);

    // Update user role (this will automatically invalidate caches and sessions)
    const result = await userManagementService.bulkUpdateUsers([id], { role });

    if (result.failed > 0) {
      return res.status(400).json({
        error: {
          code: 'ROLE_UPDATE_FAILED',
          message: result.errors[0]?.error || 'Failed to update user role',
        },
      });
    }

    // Get updated user details
    const user = await userManagementService.viewUserDetails(id);

    return res.json({
      status: 'success',
      data: {
        message: 'User role updated successfully. All sessions have been terminated.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  })
);

// =============================================================================
// Admin Settings Endpoints (Plan 131 Phase 2)
// =============================================================================

/**
 * GET /admin/settings
 * Get all settings from all categories
 *
 * Returns:
 * - All settings organized by category
 */
router.get(
  '/settings',
  auditLog({ action: 'read', resourceType: 'settings' }),
  asyncHandler(settingsController.getAllSettings.bind(settingsController))
);

/**
 * GET /admin/settings/:category
 * Get settings for a specific category
 *
 * Path parameters:
 * - category: 'general' | 'email' | 'security' | 'integrations' | 'feature_flags' | 'system'
 *
 * Returns:
 * - Settings for the specified category
 */
router.get(
  '/settings/:category',
  auditLog({ action: 'read', resourceType: 'settings' }),
  asyncHandler(settingsController.getCategorySettings.bind(settingsController))
);

/**
 * PUT /admin/settings/:category
 * Update settings for a specific category
 *
 * Path parameters:
 * - category: 'general' | 'email' | 'security' | 'integrations' | 'feature_flags' | 'system'
 *
 * Request body:
 * - Key-value pairs of settings to update
 *
 * Returns:
 * - Updated settings for the category
 */
router.put(
  '/settings/:category',
  auditLog({ action: 'update', resourceType: 'settings' }),
  asyncHandler(settingsController.updateCategorySettings.bind(settingsController))
);

/**
 * POST /admin/settings/test-email
 * Test email configuration
 *
 * Request body:
 * - smtp_host: string
 * - smtp_port: number
 * - smtp_username: string
 * - smtp_password: string
 * - smtp_secure: boolean
 * - from_email: string
 * - from_name: string
 *
 * Returns:
 * - success: boolean
 * - message: string
 */
router.post(
  '/settings/test-email',
  auditLog({ action: 'update', resourceType: 'settings' }),
  asyncHandler(settingsController.testEmailConfig.bind(settingsController))
);

/**
 * POST /admin/settings/clear-cache
 * Clear application cache
 *
 * Returns:
 * - success: boolean
 * - message: string
 */
router.post(
  '/settings/clear-cache',
  auditLog({ action: 'update', resourceType: 'settings' }),
  asyncHandler(settingsController.clearCache.bind(settingsController))
);

/**
 * POST /admin/settings/run-backup
 * Create database backup
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - timestamp: string (ISO 8601)
 */
router.post(
  '/settings/run-backup',
  auditLog({ action: 'update', resourceType: 'settings' }),
  asyncHandler(settingsController.runBackup.bind(settingsController))
);

// =============================================================================
// Billing Endpoints (Plan 131 Phase 6: Missing Backend Endpoints)
// =============================================================================

/**
 * GET /admin/billing/invoices
 * List all billing invoices (admin view)
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 *
 * Returns:
 * - data: Invoice[]
 * - meta: { total, page, limit, totalPages }
 */
router.get(
  '/billing/invoices',
  auditLog({ action: 'read', resourceType: 'billing' }),
  asyncHandler(billingController.listInvoices.bind(billingController))
);

/**
 * GET /admin/billing/transactions
 * List all payment transactions (admin view)
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 *
 * Returns:
 * - data: Transaction[]
 * - meta: { total, page, limit, totalPages }
 */
router.get(
  '/billing/transactions',
  auditLog({ action: 'read', resourceType: 'billing' }),
  asyncHandler(billingController.listTransactions.bind(billingController))
);

/**
 * GET /admin/billing/dunning
 * List all dunning attempts (failed payment recovery)
 *
 * Returns:
 * - attempts: DunningAttempt[]
 */
router.get(
  '/billing/dunning',
  auditLog({ action: 'read', resourceType: 'billing' }),
  asyncHandler(billingController.listDunningAttempts.bind(billingController))
);

// =============================================================================
// Profitability & Pricing Endpoints (Plan 131 Phase 6: Missing Backend Endpoints)
// =============================================================================

/**
 * GET /admin/pricing/margin-metrics
 * Get margin metrics with optional date range
 *
 * Query parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns:
 * - totalRevenue: number
 * - totalCost: number
 * - grossMargin: number
 * - marginPercentage: number
 * - period: string
 */
router.get(
  '/pricing/margin-metrics',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getMarginMetrics.bind(profitabilityController))
);

/**
 * GET /admin/pricing/margin-by-tier
 * Get margin breakdown by subscription tier
 *
 * Query parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns:
 * - data: Array of { tier, revenue, cost, margin, marginPercentage, requests }
 */
router.get(
  '/pricing/margin-by-tier',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getMarginByTier.bind(profitabilityController))
);

/**
 * GET /admin/pricing/margin-by-provider
 * Get margin breakdown by LLM provider
 *
 * Query parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns:
 * - data: Array of { provider, revenue, cost, margin, marginPercentage, requests }
 */
router.get(
  '/pricing/margin-by-provider',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getMarginByProvider.bind(profitabilityController))
);

/**
 * GET /admin/pricing/top-models
 * Get top performing models by profitability
 *
 * Query parameters:
 * - limit: number (default 10, max 100)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns:
 * - data: Array of { modelId, modelName, provider, revenue, cost, margin, marginPercentage, requests }
 */
router.get(
  '/pricing/top-models',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getTopModels.bind(profitabilityController))
);

/**
 * GET /admin/pricing/configs
 * Get pricing configuration rules
 *
 * Query parameters:
 * - onlyActive: boolean (default true)
 *
 * Returns:
 * - data: Array of pricing configurations
 */
router.get(
  '/pricing/configs',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getPricingConfigs.bind(profitabilityController))
);

/**
 * GET /admin/pricing/alerts
 * Get pricing alerts for margin thresholds
 *
 * Returns:
 * - data: Array of { id, type, severity, message, affectedEntity, currentValue, threshold, createdAt }
 */
router.get(
  '/pricing/alerts',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getPricingAlerts.bind(profitabilityController))
);

/**
 * GET /admin/pricing/vendor-prices
 * Get vendor price monitoring data
 *
 * Query parameters:
 * - includeHistorical: boolean (default false)
 *
 * Returns:
 * - data: Array of vendor prices with change tracking
 */
router.get(
  '/pricing/vendor-prices',
  auditLog({ action: 'read', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.getVendorPrices.bind(profitabilityController))
);

/**
 * POST /admin/pricing/simulate
 * Simulate pricing changes
 *
 * Request body:
 * - modelId?: string (UUID)
 * - providerId?: string (UUID)
 * - tier?: string
 * - newMultiplier: number (required)
 * - simulationPeriodDays?: number (default 30)
 *
 * Returns:
 * - currentMarginDollars: number
 * - projectedMarginDollars: number
 * - marginChange: number
 * - marginChangePercent: number
 * - currentMarginPercent: number
 * - projectedMarginPercent: number
 * - affectedRequests: number
 * - revenueImpact: number
 */
router.post(
  '/pricing/simulate',
  auditLog({ action: 'update', resourceType: 'profitability' }),
  asyncHandler(profitabilityController.simulatePricing.bind(profitabilityController))
);

// =============================================================================
// Vendor Analytics Routes (Plan 180)
// =============================================================================

/**
 * Vendor cost and gross margin analytics for Admin Analytics Dashboard
 *
 * Endpoints:
 * - GET  /admin/analytics/gross-margin - Gross margin KPI with tier breakdown
 * - GET  /admin/analytics/cost-by-provider - Top 5 providers by cost
 * - GET  /admin/analytics/margin-trend - Time series gross margin data
 * - GET  /admin/analytics/cost-distribution - Cost histogram with statistics
 * - POST /admin/analytics/export-csv - Export analytics data as CSV
 *
 * Security:
 * - JWT authentication (handled by parent router)
 * - Admin role required (handled by parent router)
 * - Rate limiting: 100 requests per hour (handled by vendor-analytics.routes)
 *
 * Reference: docs/plan/180-admin-analytics-dashboard-ui-design.md
 */
router.use('/analytics', vendorAnalyticsRoutes);

// =============================================================================
// Refund Management Endpoints (Plan 192 Section 7)
// =============================================================================

/**
 * GET /admin/refunds
 * List all refund requests with pagination and filtering
 *
 * Query parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled' (optional)
 * - refundType: 'manual_admin' | 'proration_credit' | 'chargeback' (optional)
 *
 * Returns:
 * - refunds: Array of refund records with user and subscription details
 * - pagination: { total, page, limit, totalPages }
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md Section 7.1
 */
router.get(
  '/refunds',
  auditLog({ action: 'read', resourceType: 'refund' }),
  asyncHandler(adminController.listRefunds.bind(adminController))
);

/**
 * POST /admin/refunds/:id/approve
 * Approve a pending refund request and process with Stripe
 *
 * Path parameters:
 * - id: string (refund ID)
 *
 * Returns:
 * - Updated refund record with 'processing' status
 * - Stripe refund ID
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md Section 7.1
 */
router.post(
  '/refunds/:id/approve',
  auditLog({ action: 'update', resourceType: 'refund', captureRequestBody: true }),
  asyncHandler(adminController.approveRefund.bind(adminController))
);

/**
 * POST /admin/refunds/:id/cancel
 * Cancel a pending refund request
 *
 * Path parameters:
 * - id: string (refund ID)
 *
 * Request body:
 * - reason: string (cancellation reason)
 *
 * Returns:
 * - Updated refund record with 'cancelled' status
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md Section 7.1
 */
router.post(
  '/refunds/:id/cancel',
  auditLog({ action: 'update', resourceType: 'refund', captureRequestBody: true }),
  asyncHandler(adminController.cancelRefund.bind(adminController))
);

/**
 * POST /admin/subscriptions/:id/cancel-with-refund
 * Manual cancel subscription with full refund
 * (For users who forgot to cancel before billing)
 *
 * Path parameters:
 * - id: string (subscription ID)
 *
 * Request body:
 * - refundReason: string (required)
 * - adminNotes: string (optional)
 *
 * Returns:
 * - subscription: Cancelled subscription record
 * - refund: Created refund record
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md Section 7.1
 */
router.post(
  '/subscriptions/:id/cancel-with-refund',
  auditLog({ action: 'update', resourceType: 'subscription', captureRequestBody: true }),
  asyncHandler(adminController.cancelSubscriptionWithRefund.bind(adminController))
);

/**
 * GET /admin/subscriptions/:id/credit-usage
 * Get credit usage for current billing period
 *
 * Returns credit usage statistics for the subscription's current billing period.
 * Used to calculate prorated refund amounts.
 *
 * Response:
 * - subscriptionId
 * - currentPeriodStart
 * - currentPeriodEnd
 * - creditsUsed (number of credits consumed in current period)
 *
 * Reference: Refund proration calculation
 */
router.get(
  '/subscriptions/:id/credit-usage',
  auditLog({ action: 'read', resourceType: 'subscription' }),
  asyncHandler(adminController.getSubscriptionCreditUsage.bind(adminController))
);

export default router;
