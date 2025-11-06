/**
 * OAuth/OIDC Routes
 *
 * Placeholder for OAuth 2.0 and OpenID Connect authentication endpoints.
 * These routes will be implemented by the OIDC Authentication Agent.
 *
 * Planned endpoints:
 * - GET  /.well-known/openid-configuration  - OIDC Discovery
 * - GET  /oauth/authorize                   - Authorization endpoint
 * - POST /oauth/token                       - Token endpoint
 * - POST /oauth/revoke                      - Token revocation
 * - GET  /oauth/userinfo                    - User info endpoint
 * - GET  /oauth/jwks                        - JSON Web Key Set
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Router } from 'express';

const router = Router();

/**
 * OIDC Discovery endpoint
 * Returns OpenID Connect configuration
 */
router.get('/.well-known/openid-configuration', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'OIDC provider not yet implemented. This endpoint will be implemented by the OIDC Authentication Agent.',
    },
  });
});

/**
 * Authorization endpoint
 * Initiates OAuth 2.0 authorization flow
 */
router.get('/oauth/authorize', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'OAuth authorization not yet implemented. This endpoint will be implemented by the OIDC Authentication Agent.',
    },
  });
});

/**
 * Token endpoint
 * Exchanges authorization code for access token
 * Also handles refresh token grants
 */
router.post('/oauth/token', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'OAuth token endpoint not yet implemented. This endpoint will be implemented by the OIDC Authentication Agent.',
    },
  });
});

/**
 * Token revocation endpoint
 * Revokes access or refresh tokens
 */
router.post('/oauth/revoke', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'OAuth token revocation not yet implemented. This endpoint will be implemented by the OIDC Authentication Agent.',
    },
  });
});

/**
 * User info endpoint
 * Returns user profile information
 */
router.get('/oauth/userinfo', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'OAuth userinfo endpoint not yet implemented. This endpoint will be implemented by the OIDC Authentication Agent.',
    },
  });
});

/**
 * JWKS endpoint
 * Returns JSON Web Key Set for token verification
 */
router.get('/oauth/jwks', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'JWKS endpoint not yet implemented. This endpoint will be implemented by the OIDC Authentication Agent.',
    },
  });
});

export default router;
