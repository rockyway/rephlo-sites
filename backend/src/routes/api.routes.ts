/**
 * API Routes for Enhanced Endpoints
 *
 * Provides enhanced versions of user and credit endpoints
 * with additional detail and functionality required by the desktop application.
 *
 * Endpoints:
 * - GET /api/user/profile  - Enhanced user profile with subscription and preferences
 * - GET /api/user/credits  - Detailed credit breakdown (free + pro)
 *
 * Reference: docs/plan/100-dedicated-api-credits-user-endpoints.md
 * Implementation: docs/plan/101-dedicated-api-implementation-plan.md (Phase 3)
 */

import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireScope } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import rateLimit from 'express-rate-limit';
import { UsersController } from '../controllers/users.controller';
import { CreditsController } from '../controllers/credits.controller';
import logger from '../utils/logger';

/**
 * Create rate limiter for enhanced endpoints
 * Uses tier-specific limits based on user subscription
 */
function createEnhancedEndpointRateLimiter(maxRequests: number) {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'rate_limit_exceeded',
        message: `Too many requests, please try again later. Limit: ${maxRequests} requests per minute.`
      }
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded for enhanced endpoint', {
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.sub
      });
      res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: `Too many requests, please try again later. Limit: ${maxRequests} requests per minute.`
        }
      });
    }
  });
}

/**
 * Create API router for enhanced endpoints
 * @returns Express router configured with enhanced endpoints
 */
export function createAPIRouter(): Router {
  const router = Router();

  // Resolve controllers from DI container
  const usersController = container.resolve(UsersController);
  const creditsController = container.resolve(CreditsController);

  logger.debug('API Router: Initializing enhanced endpoints');

  // =============================================================================
  // Enhanced User Profile Endpoint
  // =============================================================================

  /**
   * GET /api/user/profile
   * Get detailed user profile with subscription and preferences
   *
   * Requires: Authentication, user.info scope
   * Rate Limit: 30 requests per minute
   *
   * Response 200:
   * {
   *   "userId": "usr_abc123xyz",
   *   "email": "user@example.com",
   *   "displayName": "John Doe",
   *   "subscription": {
   *     "tier": "pro",
   *     "status": "active",
   *     "currentPeriodStart": "2025-11-01T00:00:00Z",
   *     "currentPeriodEnd": "2025-12-01T00:00:00Z",
   *     "cancelAtPeriodEnd": false
   *   },
   *   "preferences": {
   *     "defaultModel": "gpt-5",
   *     "emailNotifications": true,
   *     "usageAlerts": true
   *   },
   *   "accountCreatedAt": "2024-01-15T10:30:00Z",
   *   "lastLoginAt": "2025-11-06T08:00:00Z"
   * }
   */
  router.get(
    '/user/profile',
    authMiddleware,
    createEnhancedEndpointRateLimiter(30), // 30 req/min
    requireScope('user.info'),
    asyncHandler(usersController.getUserProfile.bind(usersController))
  );

  // =============================================================================
  // Enhanced Credits Endpoint
  // =============================================================================

  /**
   * GET /api/user/credits
   * Get detailed credit breakdown (free + pro)
   *
   * Requires: Authentication, credits.read scope
   * Rate Limit: 60 requests per minute
   *
   * Response 200:
   * {
   *   "freeCredits": {
   *     "remaining": 1500,
   *     "monthlyAllocation": 2000,
   *     "used": 500,
   *     "resetDate": "2025-12-01T00:00:00Z",
   *     "daysUntilReset": 25
   *   },
   *   "proCredits": {
   *     "remaining": 5000,
   *     "purchasedTotal": 10000,
   *     "lifetimeUsed": 5000
   *   },
   *   "totalAvailable": 6500,
   *   "lastUpdated": "2025-11-06T14:30:00Z"
   * }
   */
  router.get(
    '/user/credits',
    authMiddleware,
    createEnhancedEndpointRateLimiter(60), // 60 req/min
    requireScope('credits.read'),
    asyncHandler(creditsController.getDetailedCredits.bind(creditsController))
  );

  logger.debug('API Router: Enhanced endpoints registered');

  return router;
}

// =============================================================================
// Export Default
// =============================================================================

/**
 * Default export for backward compatibility
 */
export default createAPIRouter();
