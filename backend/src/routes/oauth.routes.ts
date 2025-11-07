/**
 * OAuth/OIDC Routes
 *
 * OpenID Connect authentication endpoints using node-oidc-provider v9.5.2.
 * These routes are mounted as middleware that handles all OIDC interactions.
 *
 * Endpoints:
 * - GET  /.well-known/openid-configuration  - OIDC Discovery
 * - GET  /oauth/authorize                   - Authorization endpoint
 * - POST /oauth/token                       - Token endpoint
 * - POST /oauth/revoke                      - Token revocation
 * - GET  /oauth/userinfo                    - User info endpoint
 * - GET  /oauth/jwks                        - JSON Web Key Set
 * - GET  /interaction/:uid                  - Interaction entry point
 * - POST /interaction/:uid/login            - Login form submission
 * - POST /interaction/:uid/consent          - Consent form submission
 * - GET  /interaction/:uid/abort            - Abort interaction
 * - GET  /interaction/:uid/data             - Get interaction data (for client-side rendering)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Router, Request, Response } from 'express';
import type Provider from 'oidc-provider';
import { PrismaClient } from '@prisma/client';
import { AuthController } from '../controllers/auth.controller';
import { OAuthController } from '../controllers/oauth.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { container } from '../container';
import express from 'express';

/**
 * Create OAuth router with OIDC provider integration
 */
export function createOAuthRouter(
  provider: Provider,
  prisma: PrismaClient
): Router {
  const router = Router();
  const authController = new AuthController(provider, prisma);

  // Resolve OAuthController from DI container
  const oauthController = container.resolve(OAuthController);

  // =========================================================================
  // OIDC INTERACTION ENDPOINTS
  // =========================================================================

  /**
   * GET /interaction/:uid
   * Entry point for OIDC interaction (login/consent)
   */
  router.get(
    '/interaction/:uid',
    asyncHandler(authController.interaction)
  );

  /**
   * POST /interaction/:uid/login
   * Process login form submission
   */
  router.post(
    '/interaction/:uid/login',
    express.json(),
    asyncHandler(authController.login)
  );

  /**
   * POST /interaction/:uid/consent
   * Process consent form submission
   */
  router.post(
    '/interaction/:uid/consent',
    express.json(),
    asyncHandler(authController.consent)
  );

  /**
   * GET /interaction/:uid/abort
   * Abort the interaction (user cancels)
   */
  router.get(
    '/interaction/:uid/abort',
    asyncHandler(authController.abort)
  );

  /**
   * GET /interaction/:uid/data
   * Get interaction data for client-side rendering
   */
  router.get(
    '/interaction/:uid/data',
    asyncHandler(authController.getInteractionData)
  );

  // =========================================================================
  // OIDC PROVIDER ENDPOINTS
  // =========================================================================

  /**
   * Mount OIDC provider as middleware
   * This handles all standard OIDC endpoints:
   * - /.well-known/openid-configuration (discovery)
   * - /oauth/authorize (authorization)
   * - /oauth/token (token exchange)
   * - /oauth/revoke (token revocation)
   * - /oauth/userinfo (user info)
   * - /oauth/jwks (JSON Web Key Set)
   *
   * Note: Enhanced token response (include_user_data, include_credits) is handled
   * via custom endpoints below to maintain compatibility with OIDC provider.
   */
  router.use('/', provider.callback() as any);

  // =========================================================================
  // ENHANCED TOKEN DATA ENDPOINTS (Post-Token Exchange)
  // =========================================================================

  /**
   * POST /oauth/token/enhance
   * Enhance a token response with user data and credits
   * This is called by the client after receiving a token from /oauth/token
   *
   * Request body:
   * - access_token: The access token received from /oauth/token
   * - include_user_data: 'true' to include user profile and subscription
   * - include_credits: 'true' to include credit information
   *
   * Response:
   * - user: User profile, subscription, and credits (if include_user_data=true)
   * - credits: Credit information (if include_credits=true)
   */
  router.post(
    '/oauth/token/enhance',
    express.json(),
    asyncHandler(async (req: Request, res: Response, next: any) => {
      await oauthController.enhanceTokenResponse(req, res, next);
    })
  );

  return router;
}

/**
 * Default export for backward compatibility
 * Note: This will be replaced when app.ts is updated
 */
const router = Router();

router.all('*', (_req: Request, res: Response) => {
  res.status(503).json({
    error: {
      code: 'service_unavailable',
      message:
        'OIDC provider is being initialized. Please use the provider instance from app.ts',
    },
  });
});

export default router;
