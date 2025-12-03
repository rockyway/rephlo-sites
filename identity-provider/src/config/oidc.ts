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

import Provider, { interactionPolicy } from 'oidc-provider';
import type { Configuration, KoaContextWithOIDC } from 'oidc-provider';
import { PrismaClient } from '@prisma/client';
import type { JWK } from 'jose';
import { createOIDCAdapterFactory } from '../adapters/oidc-adapter';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

// Import interaction policy components for customization
const { Prompt, Check, base: basePolicy } = interactionPolicy;

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
 * Create custom interaction policy that skips consent for clients with skipConsentScreen: true
 *
 * The default interaction policy has a consent prompt with checks that fail when grant is undefined.
 * For clients configured with skipConsentScreen: true, we need to skip the consent prompt entirely.
 *
 * This prevents the error: "Cannot read properties of undefined (reading 'getOIDCScopeEncountered')"
 */
async function createCustomInteractionPolicy(prisma: PrismaClient) {
  const policy = basePolicy();

  // Get the consent prompt from the base policy
  const consentPrompt = policy.get('consent');

  if (consentPrompt) {
    // Remove the default consent prompt
    policy.remove('consent');

    // Create a new consent prompt with a single custom check
    // This check handles BOTH skipConsentScreen clients AND regular clients
    const customConsentPrompt = new Prompt(
      { name: 'consent', requestable: true },

      // Single check that safely handles all consent scenarios
      new Check(
        'consent_check',
        'consent check with skipConsentScreen support',
        async (ctx: KoaContextWithOIDC) => {
          const { client, session } = ctx.oidc;

          if (!client) {
            return Check.REQUEST_PROMPT;
          }

          // Check if client has skipConsentScreen configured
          const dbClient = await prisma.oAuthClient.findUnique({
            where: { clientId: client.clientId },
          });

          if (dbClient?.config && typeof dbClient.config === 'object') {
            const config = dbClient.config as any;
            if (config.skipConsentScreen === true) {
              // Skip consent for this client - no need to check grant
              return Check.NO_NEED_TO_PROMPT;
            }
          }

          // For regular clients, check if user has already granted consent
          // This mirrors the default OIDC behavior but with safe grant checking
          if (!session || !session.accountId) {
            // Not logged in yet, can't check consent
            return Check.NO_NEED_TO_PROMPT;
          }

          // If there's a grant, user has already consented - no need to prompt again
          const grant = ctx.oidc.entities?.Grant;
          if (grant) {
            return Check.NO_NEED_TO_PROMPT;
          }

          // No grant exists and client doesn't skip consent - need to show consent screen
          return Check.REQUEST_PROMPT;
        }
      )
    );

    // Add the custom consent prompt back to the policy
    policy.add(customConsentPrompt);
  }

  return policy;
}

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

    // Client configuration - loaded at startup
    // Note: To update redirect URIs after startup, restart the server
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

      // Enable token introspection (RFC 7662) for opaque token validation
      // Introspection endpoint requires client authentication by default (RFC 7662)
      // For public clients, we'll handle this in a custom endpoint
      introspection: {
        enabled: true,
      },

      // Enable token revocation
      revocation: {
        enabled: true,
      },

      // Enable device flow (optional, for future)
      deviceFlow: {
        enabled: false,
      },

      // Enable resource indicators to support JWT access tokens
      // Resources are identified by a string (e.g., 'api', 'resource-server')
      // When a resource parameter is included in the authorization request,
      // this function will be called and should return JWT token configuration
      resourceIndicators: {
        enabled: true,
        // Validate that the resource is allowed
        async validate(ctx: any, client: any, resourceIndicator: string) {
          logger.info(`OIDC: Validating resource indicator: ${resourceIndicator}`);

          // Allow these resources for JWT token generation
          const allowedResources = [
            'https://api.textassistant.local',
            'api',
            'api.textassistant.local',
            '*', // Allow any resource
          ];

          const isValid = allowedResources.includes(resourceIndicator);
          logger.info(`OIDC: Resource validation result for ${resourceIndicator}: ${isValid}`);

          return isValid;
        },
        // Return resource server configuration for the requested resource
        async getResourceServerInfo(ctx: any, resourceIndicator: string, client: any) {
          logger.info(`OIDC: Resource indicator requested: ${resourceIndicator}`);

          // Always return JWT token configuration for valid resources
          // This ensures access tokens are JWT format instead of opaque reference tokens
          return {
            // Scopes available for this resource
            // IMPORTANT: offline_access must be included here for refresh token issuance when using resource indicators
            scope: 'openid email profile offline_access llm.inference models.read user.info credits.read admin',
            // CRITICAL: Force JWT format instead of default opaque tokens
            accessTokenFormat: 'jwt',
            // JWT audience claim - identifies the intended recipient
            audience: 'https://api.textassistant.local',
            // JWT signing configuration
            jwt: {
              sign: { alg: 'RS256' }, // RS256 is configured in jwks above
            },
          };
        },
      },
    },

    // Custom issueRefreshToken function
    // IMPORTANT: Override default behavior to work with resource indicators
    // Default implementation checks: client.grantTypeAllowed('refresh_token') && code.scopes.has('offline_access')
    // Problem: When using resource indicators, offline_access gets filtered out from code.scopes
    // Solution: Only check if client has refresh_token grant type, ignore offline_access scope requirement
    async issueRefreshToken(ctx: any, client: any, code: any) {
      logger.info(`OIDC: Checking refresh token issuance for client ${client.clientId}`);

      const canIssue = client.grantTypeAllowed('refresh_token');
      logger.info(`OIDC: Client ${client.clientId} refresh token permission: ${canIssue}`);

      return canIssue;
    },

    // Response types supported
    // 'code' = authorization code flow (used with PKCE)
    responseTypes: ['code'],

    // Supported scopes
    scopes: [
      'openid',
      'email',
      'profile',
      'offline_access', // Enables refresh token issuance
      'llm.inference',
      'models.read',
      'user.info',
      'credits.read',
      'admin', // NEW: Admin access scope
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
      'admin': ['role', 'permissions'], // NEW: Admin claims
    },

    // Extra claims to include in access tokens
    // This adds custom claims to the JWT access token (not just ID token)
    extraAccessTokenClaims: async (_ctx: any, token: any) => {
      try {
        const claims: Record<string, any> = {};

        // Check if email scope is requested
        if (token.scope && token.scope.includes('email')) {
          // Fetch user account to get email
          const account = await authService.findAccount(token.accountId);
          if (account) {
            const userClaims = await account.claims('access_token', token.scope);
            if (userClaims.email) {
              claims.email = userClaims.email;
              logger.debug('OIDC: Added email to access token', {
                sub: token.accountId,
                email: userClaims.email,
              });
            }
          }
        }

        return claims;
      } catch (error) {
        logger.error('OIDC: extraAccessTokenClaims error', {
          error: error instanceof Error ? error.message : String(error),
          accountId: token.accountId,
        });
        return {};
      }
    },

    // Token TTLs (in seconds)
    // NOTE: oidc-provider v9.5.2 requires TTLs to be:
    // - positive integers, OR
    // - synchronous functions returning a positive integer
    // Async functions are not supported in this version.
    // Session duration differentiation by role can be implemented via
    // session management hooks or through frontend client behavior.
    // All TTLs are configurable via environment variables (see .env.example)
    ttl: {
      AccessToken: parseInt(process.env.OIDC_TTL_ACCESS_TOKEN || '3600', 10), // Default: 1 hour
      AuthorizationCode: parseInt(process.env.OIDC_TTL_AUTHORIZATION_CODE || '600', 10), // Default: 10 minutes
      IdToken: parseInt(process.env.OIDC_TTL_ID_TOKEN || '3600', 10), // Default: 1 hour
      RefreshToken: parseInt(process.env.OIDC_TTL_REFRESH_TOKEN || '5184000', 10), // Default: 60 days
      Grant: parseInt(process.env.OIDC_TTL_GRANT || '5184000', 10), // Default: 60 days (must match or exceed RefreshToken)
      Interaction: parseInt(process.env.OIDC_TTL_INTERACTION || '3600', 10), // Default: 1 hour
      Session: parseInt(process.env.OIDC_TTL_SESSION || '86400', 10), // Default: 24 hours
    },

    // Cookie configuration
    // Note: Cookie TTLs are managed through session/interaction TTL settings above
    // In development, use 'lax' SameSite to support Desktop App browser launches
    // In production, use 'lax' or 'strict' depending on security requirements
    cookies: {
      keys: OIDC_COOKIE_KEYS,
      long: {
        signed: true,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        path: '/', // Critical: Ensure cookies are sent to all routes including /interaction and /oauth
        // Note: Cannot use 'none' in development because it requires Secure flag with HTTPS
        // Desktop Apps should ensure system browser preserves cookies between requests
      },
      short: {
        signed: true,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        path: '/', // Critical: Ensure cookies are sent to all routes
      },
    },

    // JWKS (JSON Web Key Set) for signing tokens
    jwks: {
      keys: [privateJwk],
    },

    // Find user account by ID
    // CRITICAL: This function is called by oidc-provider during authorization flow
    // If it returns undefined, the provider may fail when trying to call methods
    // on the undefined account (e.g., getOIDCScopeFiltered)
    findAccount: async (_ctx: any, sub: string) => {
      logger.debug('OIDC: findAccount called', { sub });

      const account = await authService.findAccount(sub);

      if (!account) {
        logger.warn('OIDC: findAccount returned undefined - user not found', {
          sub,
          contextPath: _ctx?.path,
          contextMethod: _ctx?.method,
        });
      } else {
        logger.debug('OIDC: findAccount found user', { sub });
      }

      return account;
    },

    // Load existing grant to check if consent can be skipped
    // For clients with skipConsentScreen: true, we auto-grant consent after login
    loadExistingGrant: async (ctx: KoaContextWithOIDC) => {
      try {
        // Only check for existing grants if there's an active session
        if (!ctx.oidc.session?.accountId) {
          logger.debug('OIDC: loadExistingGrant - no session or accountId');
          return undefined;
        }

        const { client } = ctx.oidc;
        if (!client) {
          logger.debug('OIDC: loadExistingGrant - no client');
          return undefined;
        }

        const accountId = ctx.oidc.session.accountId;

        // DEFENSIVE: Verify that the account exists before creating a grant
        // This prevents errors when the session references a deleted user
        const account = await authService.findAccount(accountId);
        if (!account) {
          logger.warn('OIDC: loadExistingGrant - account not found, clearing session', {
            accountId,
            clientId: client.clientId,
          });
          // Clear the session to force re-authentication
          await ctx.oidc.session.destroy();
          return undefined;
        }

        // Check if client has skipConsentScreen configured
        const dbClient = await prisma.oAuthClient.findUnique({
          where: { clientId: client.clientId },
        });

        if (dbClient?.config && typeof dbClient.config === 'object') {
          const config = dbClient.config as any;
          if (config.skipConsentScreen === true) {
            logger.debug('OIDC: Auto-granting consent for skipConsentScreen client', {
              clientId: client.clientId,
              accountId,
            });

            // For clients with skipConsentScreen, automatically create and save a grant
            // This will skip the consent prompt entirely
            const grant = new ctx.oidc.provider.Grant({
              clientId: client.clientId,
              accountId: accountId,
            });

            // Add all requested scopes and resources to the grant
            if (ctx.oidc.params?.scope) {
              grant.addOIDCScope(ctx.oidc.params.scope as string);
            }
            if (ctx.oidc.params?.resource) {
              grant.addResourceScope(
                ctx.oidc.params.resource as string,
                ctx.oidc.params.scope as string
              );
            }

            // CRITICAL FIX: Ensure offline_access is in OIDC scope for refresh tokens
            // When using resource indicators, offline_access can be filtered from params.scope
            // but it MUST be in the grant's OIDC scope for refresh tokens to work correctly
            // Without this, refreshTokens get expiresWithSession: true (session-bound)
            if (client.grantTypeAllowed('refresh_token')) {
              const scopeString = ctx.oidc.params?.scope as string || '';
              if (scopeString.includes('offline_access')) {
                grant.addOIDCScope('offline_access');
                logger.debug('OIDC: Added offline_access to OIDC scope for refresh token support', {
                  clientId: client.clientId,
                });
              }
            }

            // Save the grant to the database
            await grant.save();

            logger.info('OIDC: Auto-grant created for skipConsentScreen client', {
              clientId: client.clientId,
              accountId,
              grantId: grant.jti,
            });

            return grant;
          }
        }

        // For other clients, check if there's an existing grant in the database
        // This allows users who have previously consented to skip re-consenting
        const grantId = ctx.oidc.session?.grantIdFor(client.clientId);
        if (grantId) {
          logger.debug('OIDC: Found existing grant', {
            grantId,
            clientId: client.clientId,
            accountId,
          });
          return ctx.oidc.provider.Grant.find(grantId);
        }

        logger.debug('OIDC: No existing grant found', {
          clientId: client.clientId,
          accountId,
        });
        return undefined;
      } catch (error) {
        logger.error('OIDC: loadExistingGrant error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          clientId: ctx.oidc.client?.clientId,
          accountId: ctx.oidc.session?.accountId,
        });
        // Return undefined to force consent/login flow
        return undefined;
      }
    },

    // Interaction URL for login/consent
    // IMPORTANT: Must be absolute URL (including protocol and host) so browsers redirect correctly
    // without getting confused about which domain the interaction endpoint is on
    interactions: {
      url: async (_ctx: KoaContextWithOIDC, interaction: any) => {
        const issuer = process.env.OIDC_ISSUER || 'http://localhost:7151';
        return `${issuer}/interaction/${interaction.uid}`;
      },
      // Use custom interaction policy to handle skipConsentScreen clients
      policy: await createCustomInteractionPolicy(prisma),
    },

    // Routes configuration - use standard OAuth 2.0 paths
    routes: {
      authorization: '/oauth/authorize',
      token: '/oauth/token',
      userinfo: '/oauth/userinfo',
      introspection: '/oauth/introspect',
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
    extraParams: ['code_challenge', 'code_challenge_method', 'resource'],

    // Extra client metadata
    extraClientMetadata: {
      properties: ['client_name'],
    },

    // Token endpoint customization to accept resource parameter
    extraTokenEndpointResponseProperties: ['resource'],
  } as any;

  // Create provider instance
  const provider = new Provider(OIDC_ISSUER, configuration);

  // CRITICAL FIX: Middleware to attach resourceServer to tokens for JWT format support
  // This intercepts token generation and resolves the resource server configuration
  // allowing tokens to be issued in JWT format instead of opaque reference tokens
  const originalOnIssueAccessToken = provider.AccessToken.prototype.save;
  provider.AccessToken.prototype.save = async function(this: any): Promise<string> {
    const { oidc } = this;

    console.log('🔍🔍🔍 AccessToken.save DEBUG - Checking all possible sources:');
    console.log('  oidc.params:', oidc?.params);
    console.log('  oidc.ctx:', oidc?.ctx ? 'EXISTS' : 'MISSING');
    console.log('  oidc.ctx.request:', oidc?.ctx?.request ? 'EXISTS' : 'MISSING');
    console.log('  oidc.ctx.request.body:', oidc?.ctx?.request?.body);
    console.log('  oidc.ctx.req:', oidc?.ctx?.req ? 'EXISTS' : 'MISSING');
    console.log('  oidc.ctx.req.body:', oidc?.ctx?.req?.body);

    // The resource parameter may be in the params or we need to get it from the context
    let resource = oidc?.params?.resource;

    // If not in params, try to get from the request body via Koa context
    if (!resource && oidc?.ctx?.request?.body?.resource) {
      resource = oidc.ctx.request.body.resource;
      console.log('✅ Found resource in oidc.ctx.request.body:', resource);
    }

    // If still not found, try to access Express req.body from the Node.js req object
    // The Koa context wraps the Node.js request as ctx.req
    if (!resource && oidc?.ctx?.req?.body?.resource) {
      resource = oidc.ctx.req.body.resource;
      console.log('✅ Found resource in oidc.ctx.req.body:', resource);
    }

    console.log('🔍 OIDC AccessToken.save RESULT:', {
      hasResource: !!resource,
      resource: resource,
      clientId: oidc?.client?.clientId,
    });

    logger.debug('OIDC: AccessToken.save called', {
      hasOidc: !!oidc,
      hasParams: !!oidc?.params,
      hasResource: !!resource,
      resource: resource,
      clientId: oidc?.client?.clientId,
      hasCtx: !!oidc?.ctx,
      ctxBodyKeys: Object.keys(oidc?.ctx?.request?.body || {}),
      fullRequestBody: oidc?.ctx?.request?.body ? JSON.stringify(oidc.ctx.request.body) : 'no body',
    });

    if (resource) {
      try {
        // Resolve the resource server configuration
        const resourceIndicators = configuration.features?.resourceIndicators as any;
        if (resourceIndicators?.getResourceServerInfo) {
          const resourceServer = await resourceIndicators.getResourceServerInfo(
            oidc?.ctx || oidc?.provider?.ctx,
            resource,
            oidc?.client
          );

          if (resourceServer) {
            // Attach to token so it uses JWT format
            this.resourceServer = resourceServer;
            logger.info('OIDC: ResourceServer attached to access token', {
              resource,
              format: resourceServer.accessTokenFormat,
              clientId: oidc?.client?.clientId,
              hasResourceServer: !!this.resourceServer,
            });
          } else {
            logger.warn('OIDC: getResourceServerInfo returned falsy value', {
              resource,
              clientId: oidc?.client?.clientId,
            });
          }
        } else {
          logger.warn('OIDC: resourceIndicators.getResourceServerInfo not found', {
            resource,
          });
        }
      } catch (error) {
        logger.error('OIDC: Failed to attach resourceServer to token', {
          resource,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Don't throw - let the token be issued anyway
      }
    } else {
      logger.debug('OIDC: No resource parameter found in token request', {
        hasParams: !!oidc?.params,
        ctxRequestBodyKeys: Object.keys(oidc?.ctx?.request?.body || {}),
      });
    }

    // Call the original save method
    return originalOnIssueAccessToken.call(this) as Promise<string>;
  };

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
    // DIAGNOSTIC: Extract refresh token preview for troubleshooting
    const refreshToken = _ctx.oidc.params?.refresh_token as string | undefined;
    const refreshTokenPreview = refreshToken
      ? (refreshToken.length > 20
          ? `${refreshToken.substring(0, 10)}...${refreshToken.substring(refreshToken.length - 10)}`
          : refreshToken)
      : 'none';

    logger.error('OIDC: grant error', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorDetails: error.error_description || error.error || 'No additional details',
      clientId: _ctx.oidc.client?.clientId,
      grantType: _ctx.oidc.params?.grant_type,
      requestParams: {
        grantType: _ctx.oidc.params?.grant_type,
        scope: _ctx.oidc.params?.scope,
        hasRefreshToken: !!_ctx.oidc.params?.refresh_token,
        refreshTokenPreview,
        refreshTokenLength: refreshToken?.length || 0,
        hasCode: !!_ctx.oidc.params?.code,
      },
      entities: {
        hasGrant: !!_ctx.oidc.entities?.Grant,
        hasRefreshToken: !!_ctx.oidc.entities?.RefreshToken,
        hasAccount: !!_ctx.oidc.entities?.Account,
        grantId: _ctx.oidc.entities?.Grant?.jti,
      },
    });
  });

  provider.on('grant.revoked', (_ctx: any, grantId: string) => {
    logger.info('OIDC: grant revoked', { grantId });
  });

  provider.on('access_token.issued', (_ctx: any) => {
    logger.info('OIDC: access token issued', {
      clientId: _ctx?.oidc?.client?.clientId,
      userId: _ctx?.oidc?.session?.accountId,
    });
  });

  provider.on('refresh_token.saved', (refreshToken: any) => {
    // DIAGNOSTIC: Show token preview for new token
    const jti = refreshToken.jti || '';
    const tokenPreview = jti.length > 20
      ? `${jti.substring(0, 10)}...${jti.substring(jti.length - 10)}`
      : jti;
    logger.info('OIDC: NEW refresh token saved - Desktop App should use this token for next refresh', {
      tokenPreview,
      clientId: refreshToken.clientId,
      accountId: refreshToken.accountId,
      jti: refreshToken.jti,
      expiresAt: refreshToken.exp,
      grantId: refreshToken.grantId,
    });
  });

  provider.on('refresh_token.consumed', (refreshToken: any) => {
    // DIAGNOSTIC: Show token preview when consumed (rotated)
    const jti = refreshToken.jti || '';
    const tokenPreview = jti.length > 20
      ? `${jti.substring(0, 10)}...${jti.substring(jti.length - 10)}`
      : jti;
    logger.warn('OIDC: refresh token CONSUMED (rotated) - old token is now invalid', {
      tokenPreview,
      clientId: refreshToken.clientId,
      accountId: refreshToken.accountId,
      jti: refreshToken.jti,
      grantId: refreshToken.grantId,
      hint: 'The Desktop App MUST use the NEW refresh_token returned in the response',
    });
  });

  provider.on('refresh_token.destroyed', (refreshToken: any) => {
    logger.info('OIDC: refresh token destroyed', {
      clientId: refreshToken.clientId,
      accountId: refreshToken.accountId,
      jti: refreshToken.jti,
      grantId: refreshToken.grantId,
    });
  });

  // Add error listener to catch server errors
  provider.on('server_error', (ctx: any, error: any) => {
    console.error('❌❌❌ OIDC SERVER ERROR EVENT:', {
      errorMessage: error.message,
      errorStack: error.stack,
      path: ctx?.path,
      method: ctx?.method,
    });
    logger.error('OIDC: server_error event fired', {
      error: error.message,
      stack: error.stack,
      path: ctx?.path,
      method: ctx?.method,
    });
  });

  // Extract TTL values for logging (all are numbers in our config)
  const ttlValues = {
    AccessToken: configuration.ttl?.AccessToken as number || 0,
    AuthorizationCode: configuration.ttl?.AuthorizationCode as number || 0,
    IdToken: configuration.ttl?.IdToken as number || 0,
    RefreshToken: configuration.ttl?.RefreshToken as number || 0,
    Grant: configuration.ttl?.Grant as number || 0,
    Interaction: configuration.ttl?.Interaction as number || 0,
    Session: configuration.ttl?.Session as number || 0,
  };

  logger.info('OIDC Provider initialized', {
    issuer: OIDC_ISSUER,
    features: Array.from(Object.keys(configuration.features || {})),
    ttl: {
      AccessToken: `${ttlValues.AccessToken}s (${Math.floor(ttlValues.AccessToken / 3600)}h)`,
      AuthorizationCode: `${ttlValues.AuthorizationCode}s (${Math.floor(ttlValues.AuthorizationCode / 60)}m)`,
      IdToken: `${ttlValues.IdToken}s (${Math.floor(ttlValues.IdToken / 3600)}h)`,
      RefreshToken: `${ttlValues.RefreshToken}s (${Math.floor(ttlValues.RefreshToken / 86400)}d)`,
      Grant: `${ttlValues.Grant}s (${Math.floor(ttlValues.Grant / 86400)}d)`,
      Interaction: `${ttlValues.Interaction}s (${Math.floor(ttlValues.Interaction / 3600)}h)`,
      Session: `${ttlValues.Session}s (${Math.floor(ttlValues.Session / 3600)}h)`,
    },
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

    return clients.map((client) => {
      // Determine application_type based on redirect URIs
      // NOTE: oidc-provider is VERY strict about application types and redirect URIs
      //
      // For 'web' apps:
      // - Only allows http:// and https:// URIs on standard ports (80/443) or localhost
      //
      // For 'native' apps:
      // - Allows localhost with custom ports
      // - Custom URI schemes MUST follow reverse domain notation (e.g., com.rephlo.app://)
      // - oidc-provider validates ALL redirect_uris in the client config
      //
      // Detection Logic:
      // - Has custom scheme (non-http/https) → 'native'
      // - Has localhost with custom port → 'native'
      // - Otherwise → 'web'

      const hasCustomScheme = client.redirectUris.some((uri: string) =>
        !uri.startsWith('http://') && !uri.startsWith('https://')
      );
      const hasCustomPort = client.redirectUris.some((uri: string) => {
        const match = uri.match(/http:\/\/localhost:(\d+)/);
        return match && match[1] !== '80' && match[1] !== '443';
      });
      const applicationType = hasCustomScheme || hasCustomPort ? 'native' : 'web';

      logger.debug('OIDC: Loading client', {
        clientId: client.clientId,
        applicationType,
        hasCustomScheme,
        hasCustomPort,
        redirectUris: client.redirectUris,
      });

      return {
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
        application_type: applicationType,
      };
    });
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
