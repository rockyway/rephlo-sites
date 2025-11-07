/**
 * OIDC Provider Configuration
 *
 * Configures node-oidc-provider v9.5.2 with:
 * - OpenID Connect Core 1.0 compliance
 * - OAuth 2.0 authorization_code and refresh_token grants
 * - PKCE (S256) for public clients
 * - PostgreSQL adapter for persistent storage
 * - Secure cookie sessions
 * - RS256 JWT signing
 *
 * Reference: https://github.com/panva/node-oidc-provider/tree/main/docs
 */

import Provider from 'oidc-provider';
import type { Configuration, KoaContextWithOIDC } from 'oidc-provider';
import { PrismaClient } from '@prisma/client';
import type { JWK } from 'jose';
import { createOIDCAdapterFactory } from '../adapters/oidc-adapter';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

// Environment variables
const OIDC_ISSUER = process.env.OIDC_ISSUER || 'http://localhost:3001';
const OIDC_COOKIE_KEYS = process.env.OIDC_COOKIE_KEYS
  ? JSON.parse(process.env.OIDC_COOKIE_KEYS)
  : ['default-secret-key-change-in-production'];
const OIDC_JWKS_PRIVATE_KEY = process.env.OIDC_JWKS_PRIVATE_KEY;

if (!OIDC_JWKS_PRIVATE_KEY) {
  logger.error(
    'OIDC_JWKS_PRIVATE_KEY not set. Run: ts-node scripts/generate-jwks.ts'
  );
  throw new Error('OIDC_JWKS_PRIVATE_KEY environment variable is required');
}

// Ensure OIDC_JWKS_PRIVATE_KEY is not undefined for TypeScript
const OIDC_JWKS_KEY: string = OIDC_JWKS_PRIVATE_KEY;

/**
 * Create OIDC Provider instance
 */
export async function createOIDCProvider(
  prisma: PrismaClient
): Promise<Provider> {
  const authService = new AuthService(prisma);

  // Parse JWKS private key
  let privateJwk: JWK;
  try {
    privateJwk = JSON.parse(OIDC_JWKS_KEY);
  } catch (error) {
    logger.error('Failed to parse OIDC_JWKS_PRIVATE_KEY', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Invalid OIDC_JWKS_PRIVATE_KEY format');
  }

  // OIDC Provider configuration
  // Note: issuer is passed as first parameter to Provider constructor, not in configuration
  const configuration: Configuration = {
    // Adapter for persistent storage
    adapter: createOIDCAdapterFactory(prisma) as any,

    // Client configuration
    clients: await loadClients(prisma),

    // PKCE (Proof Key for Code Exchange) for public clients
    pkce: {
      required: () => true, // Require PKCE for all clients
    },

    // Supported features
    features: {
      // Disable default devInteractions (we use custom interaction pages)
      devInteractions: {
        enabled: false,
      },

      // Enable token revocation
      revocation: {
        enabled: true,
      },

      // Enable device flow (optional, for future)
      deviceFlow: {
        enabled: false,
      },

      // Enable resource indicators (optional)
      resourceIndicators: {
        enabled: false,
      },
    },

    // Response types supported
    // 'code' = authorization code flow (used with PKCE)
    responseTypes: ['code'],

    // Supported scopes
    scopes: [
      'openid',
      'email',
      'profile',
      'llm.inference',
      'models.read',
      'user.info',
      'credits.read',
    ],

    // Claims configuration
    claims: {
      openid: ['sub'],
      email: ['email', 'email_verified'],
      profile: [
        'name',
        'given_name',
        'family_name',
        'preferred_username',
        'picture',
        'updated_at',
      ],
      'user.info': ['created_at', 'last_login_at', 'is_active'],
    },

    // Token TTLs (in seconds)
    ttl: {
      AccessToken: 3600, // 1 hour
      AuthorizationCode: 600, // 10 minutes
      IdToken: 3600, // 1 hour
      RefreshToken: 2592000, // 30 days
      Session: 86400, // 24 hours
      Grant: 2592000, // 30 days
      Interaction: 3600, // 1 hour
    },

    // Cookie configuration
    // Note: Cookie TTLs are managed through session/interaction TTL settings above
    cookies: {
      keys: OIDC_COOKIE_KEYS,
      long: {
        signed: true,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
      short: {
        signed: true,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    },

    // JWKS (JSON Web Key Set) for signing tokens
    jwks: {
      keys: [privateJwk],
    },

    // Find user account by ID
    findAccount: async (_ctx: any, sub: string) => {
      return authService.findAccount(sub);
    },

    // Interaction URL for login/consent
    interactions: {
      url: async (_ctx: KoaContextWithOIDC, interaction: any) => {
        return `/interaction/${interaction.uid}`;
      },
    },

    // Routes configuration - use standard OAuth 2.0 paths
    routes: {
      authorization: '/oauth/authorize',
      token: '/oauth/token',
      userinfo: '/oauth/userinfo',
      revocation: '/oauth/revoke',
      jwks: '/oauth/jwks',
    },

    // Subject types (public or pairwise)
    subjectTypes: ['public'],

    // Render error page
    renderError: async (ctx: any, out: any, error: any) => {
      logger.error('OIDC Provider error', {
        error: error.error,
        errorDescription: error.error_description,
      });

      ctx.type = 'html';
      ctx.body = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .error-container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            }
            h1 {
              color: #e53e3e;
              margin-top: 0;
              font-size: 24px;
            }
            p {
              color: #4a5568;
              line-height: 1.6;
            }
            .error-code {
              background: #f7fafc;
              padding: 12px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 14px;
              color: #2d3748;
              margin: 20px 0;
            }
            a {
              color: #667eea;
              text-decoration: none;
              font-weight: 600;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Authentication Error</h1>
            <p>${out.error_description || 'An error occurred during authentication.'}</p>
            <div class="error-code">Error: ${out.error}</div>
            <p><a href="/">Return to homepage</a></p>
          </div>
        </body>
        </html>
      `;
    },

    // Extra params allowed in authorization request
    extraParams: ['code_challenge', 'code_challenge_method'],

    // Extra client metadata
    extraClientMetadata: {
      properties: ['client_name'],
    },
  };

  // Create provider instance
  const provider = new Provider(OIDC_ISSUER, configuration);

  // Event listeners for logging
  provider.on('authorization.success', (_ctx: any) => {
    logger.info('OIDC: authorization success', {
      clientId: _ctx.oidc.client?.clientId,
      userId: _ctx.oidc.session?.accountId,
    });
  });

  provider.on('authorization.error', (_ctx: any, error: any) => {
    logger.error('OIDC: authorization error', {
      error: error.message,
      clientId: _ctx.oidc.client?.clientId,
    });
  });

  provider.on('grant.success', (_ctx: any) => {
    logger.info('OIDC: grant success', {
      clientId: _ctx.oidc.client?.clientId,
      grantId: _ctx.oidc.entities?.Grant?.jti,
    });
  });

  provider.on('grant.error', (_ctx: any, error: any) => {
    logger.error('OIDC: grant error', {
      error: error.message,
      clientId: _ctx.oidc.client?.clientId,
    });
  });

  provider.on('grant.revoked', (_ctx: any, grantId: string) => {
    logger.info('OIDC: grant revoked', { grantId });
  });

  provider.on('access_token.issued', (_ctx: any) => {
    logger.info('OIDC: access token issued', {
      clientId: _ctx.oidc.client?.clientId,
      userId: _ctx.oidc.session?.accountId,
    });
  });

  provider.on('refresh_token.saved', (refreshToken: any) => {
    logger.info('OIDC: refresh token saved', {
      clientId: refreshToken.clientId,
      accountId: refreshToken.accountId,
    });
  });

  provider.on('refresh_token.consumed', (refreshToken: any) => {
    logger.info('OIDC: refresh token consumed', {
      clientId: refreshToken.clientId,
    });
  });

  logger.info('OIDC Provider initialized', {
    issuer: OIDC_ISSUER,
    features: Array.from(Object.keys(configuration.features || {})),
  });

  return provider;
}

/**
 * Load OAuth clients from database
 */
async function loadClients(prisma: PrismaClient): Promise<any[]> {
  try {
    const clients = await prisma.oAuthClient.findMany({
      where: { isActive: true },
    });

    return clients.map((client) => ({
      client_id: client.clientId,
      client_name: client.clientName,
      client_secret: client.clientSecretHash || undefined,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      scope: client.scope || undefined,
      token_endpoint_auth_method: client.clientSecretHash
        ? 'client_secret_basic'
        : 'none',
    }));
  } catch (error) {
    logger.error('Failed to load OAuth clients', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get OIDC interaction details
 */
export async function getInteractionDetails(
  provider: Provider,
  req: any,
  res: any
) {
  return provider.interactionDetails(req, res);
}

/**
 * Finish OIDC interaction
 */
export async function finishInteraction(
  provider: Provider,
  req: any,
  res: any,
  result: any
) {
  return provider.interactionFinished(req, res, result, {
    mergeWithLastSubmission: false,
  });
}
