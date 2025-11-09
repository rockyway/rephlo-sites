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
import { ModelTierAdminController } from '../controllers/admin/model-tier-admin.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { container } from '../container';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware, requireAdmin);

// Resolve controllers from DI container
const adminController = container.resolve(AdminController);
const modelTierAdminController = container.resolve(ModelTierAdminController);

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

export default router;
