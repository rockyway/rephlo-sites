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
import { asyncHandler } from '../middleware/error.middleware';
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
   */
  router.use('/', provider.callback() as any);

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
