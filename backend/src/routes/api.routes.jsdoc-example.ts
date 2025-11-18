/**
 * PROOF OF CONCEPT: swagger-jsdoc Migration Example
 *
 * This file demonstrates how to migrate from manual OpenAPI YAML
 * to code-generated documentation using JSDoc annotations.
 *
 * DO NOT USE IN PRODUCTION - This is a reference example only.
 *
 * Benefits:
 * - Single source of truth (code)
 * - Impossible to have documentation drift
 * - Type safety with TypeScript interfaces
 * - IDE autocomplete for JSDoc tags
 *
 * Drawbacks:
 * - Verbose JSDoc comments in route files
 * - Learning curve for OpenAPI YAML in JSDoc format
 * - Schema definitions must be duplicated or referenced
 */

import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireScope } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { UsersController } from '../controllers/users.controller';

/**
 * @openapi
 * components:
 *   schemas:
 *     UserProfileResponse:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID
 *           example: "usr_abc123xyz"
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *           example: "user@example.com"
 *         displayName:
 *           type: string
 *           description: User display name
 *           example: "John Doe"
 *         subscription:
 *           type: object
 *           properties:
 *             tier:
 *               type: string
 *               enum: [free, pro, enterprise]
 *               description: Subscription tier
 *               example: "pro"
 *             status:
 *               type: string
 *               enum: [active, inactive, canceled, past_due]
 *               description: Subscription status
 *               example: "active"
 *             currentPeriodStart:
 *               type: string
 *               format: date-time
 *               description: Start of current billing period
 *               example: "2025-11-01T00:00:00Z"
 *             currentPeriodEnd:
 *               type: string
 *               format: date-time
 *               description: End of current billing period
 *               example: "2025-12-01T00:00:00Z"
 *             cancelAtPeriodEnd:
 *               type: boolean
 *               description: Whether subscription will cancel at period end
 *               example: false
 *         preferences:
 *           type: object
 *           properties:
 *             defaultModel:
 *               type: string
 *               description: Default AI model preference
 *               example: "gpt-5"
 *             emailNotifications:
 *               type: boolean
 *               description: Email notification preference
 *               example: true
 *             usageAlerts:
 *               type: boolean
 *               description: Usage alert preference
 *               example: true
 *         accountCreatedAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *           example: "2025-11-06T08:00:00Z"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

export function createAPIRouterPOC(): Router {
  const router = Router();
  const usersController = container.resolve(UsersController);

  /**
   * @openapi
   * /api/user/profile:
   *   get:
   *     tags:
   *       - Users
   *     summary: Get detailed user profile
   *     description: |
   *       Retrieve authenticated user's complete profile including:
   *       - Email and display name
   *       - Subscription tier and status
   *       - User preferences (default model, notification settings)
   *       - Account timestamps
   *
   *       **Caching Recommendation**: Cache this response for 1 hour on the client side.
   *       Re-fetch only when profile data is explicitly needed (e.g., settings page).
   *
   *       **Rate Limit**: 30 requests per minute
   *     operationId: getUserProfile
   *     security:
   *       - bearerAuth: [user.info]
   *     responses:
   *       200:
   *         description: Successful response with user profile
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserProfileResponse'
   *             examples:
   *               proUser:
   *                 summary: Pro tier user profile
   *                 value:
   *                   userId: "usr_abc123xyz"
   *                   email: "user@example.com"
   *                   displayName: "John Doe"
   *                   subscription:
   *                     tier: "pro"
   *                     status: "active"
   *                     currentPeriodStart: "2025-11-01T00:00:00Z"
   *                     currentPeriodEnd: "2025-12-01T00:00:00Z"
   *                     cancelAtPeriodEnd: false
   *                   preferences:
   *                     defaultModel: "gpt-5"
   *                     emailNotifications: true
   *                     usageAlerts: true
   *                   accountCreatedAt: "2024-01-15T10:30:00Z"
   *                   lastLoginAt: "2025-11-06T08:00:00Z"
   *       401:
   *         description: Unauthorized - Missing or invalid JWT token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       example: "UNAUTHORIZED"
   *                     message:
   *                       type: string
   *                       example: "Authentication required"
   *       403:
   *         description: Forbidden - Insufficient scope
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       example: "FORBIDDEN"
   *                     message:
   *                       type: string
   *                       example: "Insufficient permissions. Required scope: user.info"
   *       429:
   *         description: Rate limit exceeded
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       example: "RATE_LIMIT_EXCEEDED"
   *                     message:
   *                       type: string
   *                       example: "Too many requests. Limit: 30 requests per minute"
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                       example: "INTERNAL_SERVER_ERROR"
   *                     message:
   *                       type: string
   *                       example: "An unexpected error occurred"
   */
  router.get(
    '/user/profile',
    authMiddleware,
    requireScope('user.info'),
    asyncHandler(usersController.getUserProfile.bind(usersController))
  );

  return router;
}

/**
 * ALTERNATIVE APPROACH: Using TypeScript interfaces with ts-to-zod
 *
 * Instead of duplicating schema definitions in JSDoc, you can:
 * 1. Define TypeScript interfaces in shared-types package
 * 2. Use ts-to-zod to generate Zod schemas for runtime validation
 * 3. Use @tspec/generator to auto-generate OpenAPI from TypeScript types
 *
 * Example with @tspec/generator:
 *
 * ```typescript
 * import { Tspec } from '@tspec/generator';
 *
 * interface UserProfileResponse {
 *   userId: string;
 *   email: string;
 *   displayName: string;
 *   // ... other fields
 * }
 *
 * export const UserProfileSpec = Tspec.defineRoute({
 *   method: 'GET',
 *   path: '/api/user/profile',
 *   summary: 'Get detailed user profile',
 *   tags: ['Users'],
 *   security: [{ bearerAuth: ['user.info'] }],
 *   responses: {
 *     200: Tspec.response({
 *       description: 'Successful response',
 *       schema: UserProfileResponse,
 *     }),
 *     401: Tspec.response({
 *       description: 'Unauthorized',
 *       schema: ApiError,
 *     }),
 *   },
 * });
 * ```
 *
 * This approach is MORE maintainable than swagger-jsdoc because:
 * - No schema duplication (TypeScript interfaces are the source of truth)
 * - Type safety guaranteed at compile time
 * - Less verbose than JSDoc
 * - Better IDE support
 */
