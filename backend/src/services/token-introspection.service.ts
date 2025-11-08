/**
 * Token Introspection Service
 *
 * Provides token validation by calling the Identity Provider service.
 * Implements two validation strategies:
 * 1. JWT verification using public keys (fast, cached)
 * 2. Token introspection endpoint (slower but authoritative)
 *
 * Reference: docs/plan/106-implementation-roadmap.md (Phase 2)
 */

import logger from '../utils/logger';

export interface IntrospectionResponse {
  active: boolean;
  sub?: string;
  client_id?: string;
  scope?: string;
  exp?: number;
  iat?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export interface JWKSResponse {
  keys: Array<{
    kty: string;
    n?: string;
    e?: string;
    crv?: string;
    x?: string;
    y?: string;
    alg?: string;
    kid?: string;
    use?: string;
  }>;
}

/**
 * Token Introspection Service
 * Validates tokens by calling the Identity Provider
 */
export class TokenIntrospectionService {
  private identityProviderUrl: string;

  constructor(identityProviderUrl: string) {
    if (!identityProviderUrl) {
      throw new Error('IDENTITY_PROVIDER_URL environment variable is required');
    }
    this.identityProviderUrl = identityProviderUrl;
    logger.info('TokenIntrospectionService initialized', {
      identityProviderUrl: this.identityProviderUrl,
    });
  }

  /**
   * Introspect token via Identity Provider
   * This is the authoritative validation method
   */
  async introspectToken(token: string): Promise<IntrospectionResponse> {
    try {
      const response = await fetch(
        `${this.identityProviderUrl}/oauth/introspect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: token,
          }).toString(),
        }
      );

      if (!response.ok) {
        logger.warn('Token introspection request failed', {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`Introspection failed: ${response.statusText}`);
      }

      const data = (await response.json()) as IntrospectionResponse;

      logger.debug('Token introspection successful', {
        active: data.active,
        sub: data.sub,
      });

      return data;
    } catch (error) {
      logger.error('Token introspection error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get public keys from Identity Provider
   * Used for local JWT verification (faster than introspection)
   * Should be cached for 5-10 minutes
   */
  async getPublicKeys(): Promise<JWKSResponse> {
    try {
      const response = await fetch(`${this.identityProviderUrl}/oauth/jwks`);

      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
      }

      const data = (await response.json()) as JWKSResponse;

      logger.debug('Fetched JWKS from Identity Provider', {
        keyCount: data.keys.length,
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch JWKS', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
