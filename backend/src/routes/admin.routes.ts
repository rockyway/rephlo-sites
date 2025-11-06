/**
 * Admin Routes
 *
 * Administrative endpoints for monitoring and management.
 * These routes will be protected with admin-level authentication.
 *
 * Planned endpoints:
 * - GET  /admin/metrics      - System metrics and analytics
 * - GET  /admin/users        - User management
 * - POST /admin/users/:id/suspend - Suspend user
 * - GET  /admin/subscriptions - Subscription overview
 * - GET  /admin/usage        - System-wide usage statistics
 * - POST /admin/webhooks/test - Test webhook delivery
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Router } from 'express';
import { getAdminMetrics } from '../api/admin';

const router = Router();

/**
 * GET /admin/metrics
 * Get system metrics and analytics
 *
 * NOTE: This endpoint is currently implemented for the branding website.
 * It will be enhanced by future agents to include API-specific metrics.
 */
router.get('/metrics', getAdminMetrics);

/**
 * GET /admin/users
 * List and manage users
 */
router.get('/users', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'User management not yet implemented. This endpoint will be implemented by the User Management Agent.',
    },
  });
});

/**
 * POST /admin/users/:id/suspend
 * Suspend a user account
 */
router.post('/users/:id/suspend', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'User suspension not yet implemented. This endpoint will be implemented by the User Management Agent.',
    },
  });
});

/**
 * GET /admin/subscriptions
 * Subscription overview and management
 */
router.get('/subscriptions', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Admin subscription management not yet implemented. This endpoint will be implemented by the Subscription Management Agent.',
    },
  });
});

/**
 * GET /admin/usage
 * System-wide usage statistics
 */
router.get('/usage', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Admin usage statistics not yet implemented. This endpoint will be implemented by the Credit & Usage Tracking Agent.',
    },
  });
});

/**
 * POST /admin/webhooks/test
 * Test webhook delivery
 */
router.post('/webhooks/test', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Webhook testing not yet implemented. This endpoint will be implemented by the Webhook System Agent.',
    },
  });
});

export default router;
