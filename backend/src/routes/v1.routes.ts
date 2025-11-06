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
import { createModelsController } from '../controllers/models.controller';
import { createSubscriptionsController } from '../controllers/subscriptions.controller';
import { createCreditsController } from '../controllers/credits.controller';

/**
 * Create v1 router with Prisma client
 * @param prisma - Prisma client instance
 * @returns Express router
 */
export function createV1Router(prisma: PrismaClient): Router {
  const router = Router();

  // Initialize controllers
  const usersController = createUsersController(prisma);
  const modelsController = createModelsController(prisma);
  const subscriptionsController = createSubscriptionsController(prisma);
  const creditsController = createCreditsController(prisma);

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
  // Model Management Routes (Implemented)
  // =============================================================================

  /**
   * GET /v1/models
   * List available models with optional filters
   * Requires: Authentication, models.read scope
   */
  router.get(
    '/models',
    authMiddleware,
    requireScope('models.read'),
    asyncHandler(modelsController.listModels.bind(modelsController))
  );

  /**
   * GET /v1/models/:modelId
   * Get detailed information about a specific model
   * Requires: Authentication, models.read scope
   */
  router.get(
    '/models/:modelId',
    authMiddleware,
    requireScope('models.read'),
    asyncHandler(modelsController.getModelDetails.bind(modelsController))
  );

  // =============================================================================
  // Inference Routes (Implemented)
  // =============================================================================

  /**
   * POST /v1/completions
   * Execute text completion request
   * Requires: Authentication, llm.inference scope
   */
  router.post(
    '/completions',
    authMiddleware,
    requireScope('llm.inference'),
    asyncHandler(modelsController.textCompletion.bind(modelsController))
  );

  /**
   * POST /v1/chat/completions
   * Execute chat completion request
   * Requires: Authentication, llm.inference scope
   */
  router.post(
    '/chat/completions',
    authMiddleware,
    requireScope('llm.inference'),
    asyncHandler(modelsController.chatCompletion.bind(modelsController))
  );

  // =============================================================================
  // Subscription Routes (Implemented)
  // =============================================================================

  /**
   * GET /v1/subscription-plans
   * List subscription plans
   * No authentication required - public endpoint
   */
  router.get(
    '/subscription-plans',
    asyncHandler(subscriptionsController.listSubscriptionPlans.bind(subscriptionsController))
  );

  /**
   * GET /v1/subscriptions/me
   * Get current subscription
   * Requires: Authentication
   */
  router.get(
    '/subscriptions/me',
    authMiddleware,
    asyncHandler(subscriptionsController.getCurrentSubscription.bind(subscriptionsController))
  );

  /**
   * POST /v1/subscriptions
   * Create subscription
   * Requires: Authentication
   */
  router.post(
    '/subscriptions',
    authMiddleware,
    asyncHandler(subscriptionsController.createSubscription.bind(subscriptionsController))
  );

  /**
   * PATCH /v1/subscriptions/me
   * Update subscription (upgrade/downgrade)
   * Requires: Authentication
   */
  router.patch(
    '/subscriptions/me',
    authMiddleware,
    asyncHandler(subscriptionsController.updateSubscription.bind(subscriptionsController))
  );

  /**
   * POST /v1/subscriptions/me/cancel
   * Cancel subscription
   * Requires: Authentication
   */
  router.post(
    '/subscriptions/me/cancel',
    authMiddleware,
    asyncHandler(subscriptionsController.cancelSubscription.bind(subscriptionsController))
  );

  // =============================================================================
  // Credit & Usage Routes (Implemented)
  // =============================================================================

  /**
   * GET /v1/credits/me
   * Get current user credits
   * Requires: Authentication, credits.read scope
   */
  router.get(
    '/credits/me',
    authMiddleware,
    requireScope('credits.read'),
    asyncHandler(creditsController.getCurrentCredits.bind(creditsController))
  );

  /**
   * GET /v1/usage
   * Get usage history with filtering and pagination
   * Requires: Authentication, credits.read scope
   */
  router.get(
    '/usage',
    authMiddleware,
    requireScope('credits.read'),
    asyncHandler(creditsController.getUsageHistory.bind(creditsController))
  );

  /**
   * GET /v1/usage/stats
   * Get usage statistics with aggregation
   * Requires: Authentication, credits.read scope
   */
  router.get(
    '/usage/stats',
    authMiddleware,
    requireScope('credits.read'),
    asyncHandler(creditsController.getUsageStats.bind(creditsController))
  );

  /**
   * GET /v1/rate-limit
   * Get rate limit status (placeholder)
   * Requires: Authentication
   * Note: Full implementation pending Rate Limiting & Security Agent
   */
  router.get(
    '/rate-limit',
    authMiddleware,
    asyncHandler(creditsController.getRateLimitStatus.bind(creditsController))
  );

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
