/**
 * REST API v1 Routes
 *
 * Main router for REST API v1 endpoints.
 * Routes are organized by domain and protected by authentication middleware.
 *
 * Endpoint categories:
 * - /v1/users               - User management (implemented)
 * - /v1/models              - Model management (pending)
 * - /v1/completions         - Text completion (pending)
 * - /v1/chat/completions    - Chat completion (pending)
 * - /v1/subscriptions       - Subscription management (pending)
 * - /v1/credits             - Credit management (pending)
 * - /v1/usage               - Usage analytics (pending)
 * - /v1/rate-limit          - Rate limit status (pending)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireScope } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { createUsersController } from '../controllers/users.controller';

/**
 * Create v1 router with Prisma client
 * @param prisma - Prisma client instance
 * @returns Express router
 */
export function createV1Router(prisma: PrismaClient): Router {
  const router = Router();

  // Initialize controllers
  const usersController = createUsersController(prisma);

  // =============================================================================
  // User Management Routes (Implemented)
  // =============================================================================

  /**
   * GET /v1/users/me
   * Get current user profile
   * Requires: Authentication, user.info scope
   */
  router.get(
    '/users/me',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getCurrentUser.bind(usersController))
  );

  /**
   * PATCH /v1/users/me
   * Update user profile
   * Requires: Authentication, user.info scope
   */
  router.patch(
    '/users/me',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.updateCurrentUser.bind(usersController))
  );

  /**
   * GET /v1/users/me/preferences
   * Get user preferences
   * Requires: Authentication, user.info scope
   */
  router.get(
    '/users/me/preferences',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getUserPreferences.bind(usersController))
  );

  /**
   * PATCH /v1/users/me/preferences
   * Update user preferences
   * Requires: Authentication, user.info scope
   */
  router.patch(
    '/users/me/preferences',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.updateUserPreferences.bind(usersController))
  );

  /**
   * POST /v1/users/me/preferences/model
   * Set default model
   * Requires: Authentication, user.info scope
   */
  router.post(
    '/users/me/preferences/model',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.setDefaultModel.bind(usersController))
  );

  /**
   * GET /v1/users/me/preferences/model
   * Get default model
   * Requires: Authentication, user.info scope
   */
  router.get(
    '/users/me/preferences/model',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getDefaultModel.bind(usersController))
  );

  // =============================================================================
  // Model Management Routes (Placeholder)
  // =============================================================================

  /**
   * GET /v1/models
   * List available models
   */
  router.get('/models', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Model listing not yet implemented. This endpoint will be implemented by the Model Service Agent.',
      },
    });
  });

  /**
   * GET /v1/models/:modelId
   * Get model details
   */
  router.get('/models/:modelId', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Model details not yet implemented. This endpoint will be implemented by the Model Service Agent.',
      },
    });
  });

  // =============================================================================
  // Inference Routes (Placeholder)
  // =============================================================================

  /**
   * POST /v1/completions
   * Text completion
   */
  router.post('/completions', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Text completion not yet implemented. This endpoint will be implemented by the Model Service Agent.',
      },
    });
  });

  /**
   * POST /v1/chat/completions
   * Chat completion
   */
  router.post('/chat/completions', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Chat completion not yet implemented. This endpoint will be implemented by the Model Service Agent.',
      },
    });
  });

  // =============================================================================
  // Subscription Routes (Placeholder)
  // =============================================================================

  /**
   * GET /v1/subscriptions/me
   * Get current subscription
   */
  router.get('/subscriptions/me', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Subscription retrieval not yet implemented. This endpoint will be implemented by the Subscription Management Agent.',
      },
    });
  });

  /**
   * GET /v1/subscription-plans
   * List subscription plans
   */
  router.get('/subscription-plans', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Subscription plans not yet implemented. This endpoint will be implemented by the Subscription Management Agent.',
      },
    });
  });

  /**
   * POST /v1/subscriptions
   * Create subscription
   */
  router.post('/subscriptions', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Subscription creation not yet implemented. This endpoint will be implemented by the Subscription Management Agent.',
      },
    });
  });

  /**
   * POST /v1/subscriptions/me/cancel
   * Cancel subscription
   */
  router.post('/subscriptions/me/cancel', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Subscription cancellation not yet implemented. This endpoint will be implemented by the Subscription Management Agent.',
      },
    });
  });

  /**
   * PATCH /v1/subscriptions/me
   * Update subscription
   */
  router.patch('/subscriptions/me', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Subscription update not yet implemented. This endpoint will be implemented by the Subscription Management Agent.',
      },
    });
  });

  // =============================================================================
  // Credit & Usage Routes (Placeholder)
  // =============================================================================

  /**
   * GET /v1/credits/me
   * Get current credits
   */
  router.get('/credits/me', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Credit retrieval not yet implemented. This endpoint will be implemented by the Credit & Usage Tracking Agent.',
      },
    });
  });

  /**
   * GET /v1/usage
   * Get usage history
   */
  router.get('/usage', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Usage history not yet implemented. This endpoint will be implemented by the Credit & Usage Tracking Agent.',
      },
    });
  });

  /**
   * GET /v1/usage/stats
   * Get usage statistics
   */
  router.get('/usage/stats', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Usage statistics not yet implemented. This endpoint will be implemented by the Credit & Usage Tracking Agent.',
      },
    });
  });

  /**
   * GET /v1/rate-limit
   * Check rate limit status
   */
  router.get('/rate-limit', (_req, res) => {
    res.status(501).json({
      error: {
        code: 'not_implemented',
        message:
          'Rate limit status not yet implemented. This endpoint will be implemented by the Rate Limiting & Security Agent.',
      },
    });
  });

  return router;
}

// =============================================================================
// Export Default (for backward compatibility)
// =============================================================================

/**
 * Default export for compatibility with existing imports
 * Note: This creates a router without Prisma client, so user routes won't work
 * Use createV1Router(prisma) instead for full functionality
 */
import { prisma } from '../config/database';
export default createV1Router(prisma);
