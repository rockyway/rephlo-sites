/**
 * Authentication Routes
 *
 * Routes for user authentication management including:
 * - User registration with email verification
 * - Email verification
 * - Password reset flow (forgot/reset password)
 *
 * All endpoints are public (no authentication required).
 * Rate limiting is applied to prevent abuse.
 *
 * Endpoints:
 * - POST /auth/register         - User registration (5 req/hour per IP)
 * - POST /auth/verify-email     - Email verification (10 req/hour per IP)
 * - POST /auth/forgot-password  - Request password reset (3 req/hour per IP)
 * - POST /auth/reset-password   - Complete password reset (3 req/hour per IP)
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 1)
 */

import { Router } from 'express';
import { container } from '../container';
import { asyncHandler } from '../middleware/error.middleware';
import { createIPRateLimiter } from '../middleware/ratelimit.middleware';
import { AuthManagementController } from '../controllers/auth-management.controller';
import logger from '../utils/logger';

/**
 * Create authentication router
 * Factory pattern for router creation to ensure DI container is resolved
 *
 * @returns Express router configured with authentication endpoints
 */
export function createAuthRouter(): Router {
  const router = Router();

  // Resolve controller from DI container
  const authManagementController = container.resolve(AuthManagementController);

  // Rate limiters for different endpoint types
  const registrationLimiter = createIPRateLimiter(5); // 5 per hour
  const passwordResetLimiter = createIPRateLimiter(3); // 3 per hour
  const emailVerificationLimiter = createIPRateLimiter(10); // 10 per hour

  logger.debug('Auth Router: Initializing authentication endpoints');

  // ===========================================================================
  // User Registration Endpoint
  // ===========================================================================

  /**
   * POST /auth/register
   * Register a new user account with email verification
   *
   * Public endpoint - No authentication required
   * Rate limit: 5 requests per hour per IP
   *
   * Request Body:
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123!",
   *   "username": "john_doe",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "acceptedTerms": true
   * }
   *
   * Response 201:
   * {
   *   "id": "clx...",
   *   "email": "user@example.com",
   *   "emailVerified": false,
   *   "message": "Registration successful. Please check your email to verify your account."
   * }
   *
   * Error Responses:
   * - 400: Validation errors
   * - 409: Email/username already exists
   * - 500: Server error
   */
  router.post(
    '/register',
    registrationLimiter,
    asyncHandler(authManagementController.register.bind(authManagementController))
  );

  // ===========================================================================
  // Email Verification Endpoint
  // ===========================================================================

  /**
   * POST /auth/verify-email
   * Verify user email with token
   *
   * Public endpoint - No authentication required
   * Rate limit: 10 requests per hour per IP
   *
   * Request Body:
   * {
   *   "token": "abc123...",
   *   "email": "user@example.com"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "Email verified successfully. You can now log in."
   * }
   *
   * Error Responses:
   * - 400: Invalid token, token expired, already verified
   * - 500: Server error
   */
  router.post(
    '/verify-email',
    emailVerificationLimiter,
    asyncHandler(authManagementController.verifyEmail.bind(authManagementController))
  );

  // ===========================================================================
  // Forgot Password Endpoint
  // ===========================================================================

  /**
   * POST /auth/forgot-password
   * Request password reset token
   *
   * Public endpoint - No authentication required
   * Rate limit: 3 requests per hour per IP
   *
   * Request Body:
   * {
   *   "email": "user@example.com"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "If an account exists with this email, a password reset link has been sent."
   * }
   *
   * Security Note: Always returns success to prevent email enumeration
   *
   * Error Responses:
   * - 400: Validation errors
   * - 500: Server error
   */
  router.post(
    '/forgot-password',
    passwordResetLimiter,
    asyncHandler(authManagementController.forgotPassword.bind(authManagementController))
  );

  // ===========================================================================
  // Reset Password Endpoint
  // ===========================================================================

  /**
   * POST /auth/reset-password
   * Complete password reset with token
   *
   * Public endpoint - No authentication required
   * Rate limit: 3 requests per hour per IP
   *
   * Request Body:
   * {
   *   "token": "abc123...",
   *   "email": "user@example.com",
   *   "newPassword": "NewSecurePass123!"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "Password reset successfully. Please log in with your new password."
   * }
   *
   * Error Responses:
   * - 400: Invalid token, token expired, weak password
   * - 500: Server error
   */
  router.post(
    '/reset-password',
    passwordResetLimiter,
    asyncHandler(authManagementController.resetPassword.bind(authManagementController))
  );

  logger.debug('Auth Router: Authentication endpoints registered');

  return router;
}

// =============================================================================
// Export Default
// =============================================================================

/**
 * Default export for backward compatibility
 */
export default createAuthRouter();
