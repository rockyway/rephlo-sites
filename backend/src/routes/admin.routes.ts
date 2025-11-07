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
import { asyncHandler } from '../middleware/error.middleware';
import { container } from '../container';

const router = Router();

// Resolve AdminController from DI container
const adminController = container.resolve(AdminController);

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

export default router;
