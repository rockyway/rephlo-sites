/**
 * Social Authentication Routes
 *
 * Routes for OAuth authentication with external providers (Google, etc.)
 * Implements OAuth 2.0 authorization code flow with PKCE protection.
 *
 * All endpoints are public (no authentication required).
 * Rate limiting is applied to prevent abuse.
 *
 * Endpoints:
 * - GET /oauth/google/authorize  - Initiate Google OAuth login (10 req/min per IP)
 * - GET /oauth/google/callback   - Handle Google OAuth callback (10 req/min per IP)
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 3)
 */

import { Router } from 'express';
import { container } from '../container';
import { asyncHandler } from '../middleware/error.middleware';
import { createIPRateLimiter } from '../middleware/ratelimit.middleware';
import { SocialAuthController } from '../controllers/social-auth.controller';
import logger from '../utils/logger';

/**
 * Create social authentication router
 * Factory pattern for router creation to ensure DI container is resolved
 *
 * @returns Express router configured with social authentication endpoints
 */
export function createSocialAuthRouter(): Router {
  const router = Router();

  // Resolve controller from DI container
  const socialAuthController = container.resolve(SocialAuthController);

  // Rate limiter for OAuth endpoints (10 requests per minute per IP)
  const oauthLimiter = createIPRateLimiter(10);

  logger.debug('Social Auth Router: Initializing OAuth endpoints');

  // ===========================================================================
  // Google OAuth Authorization Endpoint
  // ===========================================================================

  /**
   * GET /oauth/google/authorize
   * Initiate Google OAuth authorization flow
   *
   * Public endpoint - No authentication required
   * Rate limit: 10 requests per minute per IP
   *
   * Query parameters (optional):
   * - redirect_uri: Override default redirect URI after successful auth
   *
   * Flow:
   * 1. Generate random state for CSRF protection
   * 2. Build Google OAuth authorization URL
   * 3. Redirect user to Google's consent screen
   *
   * Redirects to: Google's OAuth consent screen
   *
   * Security: Uses state parameter to prevent CSRF attacks
   */
  router.get(
    '/google/authorize',
    oauthLimiter,
    asyncHandler(socialAuthController.googleAuthorize.bind(socialAuthController))
  );

  // ===========================================================================
  // Google OAuth Callback Endpoint
  // ===========================================================================

  /**
   * GET /oauth/google/callback
   * Handle Google OAuth callback after user authorizes
   *
   * Public endpoint - No authentication required
   * Rate limit: 10 requests per minute per IP
   *
   * Query parameters:
   * - code: Authorization code from Google
   * - state: CSRF protection token
   * - error: Error code if authorization failed
   *
   * Flow:
   * 1. Verify state parameter (CSRF protection)
   * 2. Exchange authorization code for access token
   * 3. Fetch user profile from Google
   * 4. Find or create user in database
   * 5. Link Google account to user (if existing email)
   * 6. Mark email as verified (trust Google's verification)
   * 7. Create OIDC session (TODO: integrate with OIDC provider)
   * 8. Redirect to client app with authorization code
   *
   * Redirects to:
   * - Success: /login?google_success=true&user_id={userId}
   * - Error: /login?error={error_code}
   *
   * Error Codes:
   * - google_oauth_not_configured: Google OAuth credentials not set
   * - google_oauth_failed: User denied access
   * - missing_code: Authorization code missing
   * - invalid_state: State parameter missing or invalid
   * - email_not_verified: Google account email not verified
   * - user_creation_failed: Failed to create/find user
   * - google_oauth_callback_failed: Unexpected error during callback
   */
  router.get(
    '/google/callback',
    oauthLimiter,
    asyncHandler(socialAuthController.googleCallback.bind(socialAuthController))
  );

  logger.debug('Social Auth Router: OAuth endpoints registered');

  return router;
}

// =============================================================================
// Export Default
// =============================================================================

/**
 * Default export for backward compatibility
 */
export default createSocialAuthRouter();
