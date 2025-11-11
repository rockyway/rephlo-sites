/**
 * REST API v1 Routes
 *
 * Main router for REST API v1 endpoints.
 * Routes are organized by domain and protected by authentication middleware.
 *
 * Endpoint categories:
 * - /v1/users               - User management (implemented)
 * - /v1/models              - Model management (implemented)
 * - /v1/completions         - Text completion (implemented)
 * - /v1/chat/completions    - Chat completion (implemented)
 * - /v1/subscriptions       - Subscription management (implemented)
 * - /v1/credits             - Credit management (implemented)
 * - /v1/usage               - Usage analytics (implemented)
 * - /v1/webhooks            - Webhook configuration (implemented)
 * - /v1/rate-limit          - Rate limit status (pending)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireScope } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { checkCredits } from '../middleware/credit.middleware';
import { UsersController } from '../controllers/users.controller';
import { ModelsController } from '../controllers/models.controller';
import { SubscriptionsController } from '../controllers/subscriptions.controller';
import { CreditsController } from '../controllers/credits.controller';
import { WebhooksController } from '../controllers/webhooks.controller';

/**
 * Create v1 router (No parameters needed - uses DI container)
 * @returns Express router
 */
export function createV1Router(): Router {
  const router = Router();

  // Resolve controllers from DI container
  const usersController = container.resolve(UsersController);
  const modelsController = container.resolve(ModelsController);
  const subscriptionsController = container.resolve(SubscriptionsController);
  const creditsController = container.resolve(CreditsController);
  const webhooksController = container.resolve(WebhooksController);

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
   * Requires: Authentication, llm.inference scope, sufficient credits
   */
  router.post(
    '/completions',
    authMiddleware,
    requireScope('llm.inference'),
    checkCredits(),
    asyncHandler(modelsController.textCompletion.bind(modelsController))
  );

  /**
   * POST /v1/chat/completions
   * Execute chat completion request
   * Requires: Authentication, llm.inference scope, sufficient credits
   */
  router.post(
    '/chat/completions',
    authMiddleware,
    requireScope('llm.inference'),
    checkCredits(),
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

  // =============================================================================
  // Webhook Configuration Routes (Implemented)
  // =============================================================================

  /**
   * GET /v1/webhooks/config
   * Get user's webhook configuration
   * Requires: Authentication
   */
  router.get(
    '/webhooks/config',
    authMiddleware,
    asyncHandler(webhooksController.getWebhookConfig.bind(webhooksController))
  );

  /**
   * POST /v1/webhooks/config
   * Create or update webhook configuration
   * Requires: Authentication
   */
  router.post(
    '/webhooks/config',
    authMiddleware,
    asyncHandler(webhooksController.setWebhookConfig.bind(webhooksController))
  );

  /**
   * DELETE /v1/webhooks/config
   * Delete webhook configuration
   * Requires: Authentication
   */
  router.delete(
    '/webhooks/config',
    authMiddleware,
    asyncHandler(webhooksController.deleteWebhookConfig.bind(webhooksController))
  );

  /**
   * POST /v1/webhooks/test
   * Send a test webhook
   * Requires: Authentication
   */
  router.post(
    '/webhooks/test',
    authMiddleware,
    asyncHandler(webhooksController.testWebhook.bind(webhooksController))
  );

  return router;
}

// =============================================================================
// Export Default (for backward compatibility)
// =============================================================================

/**
 * Default export for compatibility with existing imports
 * Note: This creates a router using DI container
 */
export default createV1Router();
