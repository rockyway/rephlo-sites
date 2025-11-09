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

export default router;
