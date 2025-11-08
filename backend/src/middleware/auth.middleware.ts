/**
 * JWT Authentication Middleware
 *
 * Validates JWT bearer tokens from the Authorization header.
 * Verifies token signature using OIDC provider's JWKS.
 * Injects user context into request for downstream handlers.
 *
 * Usage:
 *   app.get('/protected', authMiddleware, handler);
 *   app.get('/admin', authMiddleware, requireScope('admin'), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { importJWK, jwtVerify, type JWTPayload } from 'jose';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { unauthorizedError, forbiddenError } from './error.middleware';

// Environment variables
const OIDC_ISSUER = process.env.OIDC_ISSUER || 'http://localhost:3001';
const OIDC_JWKS_PRIVATE_KEY = process.env.OIDC_JWKS_PRIVATE_KEY;

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string; // User ID
        email?: string;
        scope: string[];
        clientId: string;
        exp: number;
        iat: number;
      };
    }
  }
}

/**
 * JWT authentication middleware
 * Validates bearer token and sets req.user
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Auth middleware: missing authorization header', {
      path: req.path,
    });
    return next(unauthorizedError('Missing authorization header'));
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('Auth middleware: invalid authorization header format', {
      path: req.path,
    });
    return next(unauthorizedError('Invalid authorization header format'));
  }

  const token = parts[1];

  // Verify token
  verifyJWT(token)
    .then((payload) => {
      // Extract user context from token
      req.user = {
        sub: payload.sub!,
        email: payload.email as string | undefined,
        scope: (payload.scope as string)?.split(' ') || [],
        clientId: payload.client_id as string,
        exp: payload.exp!,
        iat: payload.iat!,
      };

      logger.debug('Auth middleware: token verified', {
        userId: req.user.sub,
        scope: req.user.scope,
      });

      next();
    })
    .catch((error) => {
      logger.warn('Auth middleware: token verification failed', {
        path: req.path,
        error: error.message,
      });
      // Pass error to Express error handling middleware instead of throwing
      return next(unauthorizedError('Invalid or expired token'));
    });
}

/**
 * Verify JWT token using OIDC provider's public key or introspect opaque token
 */
async function verifyJWT(token: string): Promise<JWTPayload> {
  // First, check if it's a JWT token (has 3 parts)
  const parts = token.split('.');

  if (parts.length === 3) {
    // It's a JWT, verify it
    if (!OIDC_JWKS_PRIVATE_KEY) {
      throw new Error('OIDC_JWKS_PRIVATE_KEY not configured');
    }

    // Parse JWKS private key to get public key for verification
    const privateJwk = JSON.parse(OIDC_JWKS_PRIVATE_KEY);

    // Extract public key components from private key
    const publicJwk = {
      kty: privateJwk.kty,
      n: privateJwk.n,
      e: privateJwk.e,
      alg: privateJwk.alg,
      kid: privateJwk.kid,
      use: privateJwk.use,
    };

    const publicKey = await importJWK(publicJwk, 'RS256');

    // Verify JWT
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: OIDC_ISSUER,
      algorithms: ['RS256'],
    });

    return payload;
  } else {
    // It's an opaque token, introspect it with the OIDC provider
    // Opaque access tokens must be validated via the introspection endpoint
    logger.debug('Introspecting opaque access token');

    try {
      const response = await fetch(`${OIDC_ISSUER}/oauth/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: token,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Introspection failed: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      // Check if token is active
      if (!data.active) {
        throw new Error('Token is not active or has expired');
      }

      // Convert introspection response to JWTPayload format
      const payload: JWTPayload = {
        sub: data.sub,
        aud: data.aud,
        client_id: data.client_id,
        exp: data.exp,
        iat: data.iat,
        scope: data.scope,
        email: data.email,
      };

      return payload;
    } catch (error) {
      logger.error('Token introspection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to introspect token');
    }
  }
}

/**
 * Middleware to require specific scope(s)
 * Use after authMiddleware
 *
 * Example:
 *   app.get('/models', authMiddleware, requireScope('models.read'), handler);
 */
export function requireScope(...requiredScopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.error('requireScope called before authMiddleware');
      throw unauthorizedError('Authentication required');
    }

    const userScopes = req.user.scope || [];

    // Check if user has all required scopes
    const hasAllScopes = requiredScopes.every((scope) =>
      userScopes.includes(scope)
    );

    if (!hasAllScopes) {
      logger.warn('Auth middleware: insufficient scope', {
        userId: req.user.sub,
        required: requiredScopes,
        actual: userScopes,
      });
      throw forbiddenError(
        `Required scope(s): ${requiredScopes.join(', ')}`
      );
    }

    next();
  };
}

/**
 * Middleware to require any of the specified scopes
 * Use after authMiddleware
 *
 * Example:
 *   app.get('/inference', authMiddleware, requireAnyScope(['llm.inference', 'admin']), handler);
 */
export function requireAnyScope(...requiredScopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.error('requireAnyScope called before authMiddleware');
      throw unauthorizedError('Authentication required');
    }

    const userScopes = req.user.scope || [];

    // Check if user has at least one required scope
    const hasAnyScope = requiredScopes.some((scope) =>
      userScopes.includes(scope)
    );

    if (!hasAnyScope) {
      logger.warn('Auth middleware: insufficient scope', {
        userId: req.user.sub,
        required: requiredScopes,
        actual: userScopes,
      });
      throw forbiddenError(
        `Required any of scope(s): ${requiredScopes.join(', ')}`
      );
    }

    next();
  };
}

/**
 * Optional auth middleware
 * Sets req.user if valid token is present, but doesn't fail if missing
 *
 * Example:
 *   app.get('/public-with-user-info', optionalAuth, handler);
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token provided, continue without user context
    next();
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Invalid format, continue without user context
    next();
    return;
  }

  const token = parts[1];

  // Try to verify token
  verifyJWT(token)
    .then((payload) => {
      req.user = {
        sub: payload.sub!,
        email: payload.email as string | undefined,
        scope: (payload.scope as string)?.split(' ') || [],
        clientId: payload.client_id as string,
        exp: payload.exp!,
        iat: payload.iat!,
      };
      next();
    })
    .catch(() => {
      // Token verification failed, continue without user context
      next();
    });
}

/**
 * Middleware to check if user is active in database
 * Use after authMiddleware
 *
 * Example:
 *   app.delete('/account', authMiddleware, requireActiveUser(), handler);
 */
export function requireActiveUser() {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      logger.error('requireActiveUser called before authMiddleware');
      throw unauthorizedError('Authentication required');
    }

    try {
      // Resolve PrismaClient from DI container inside middleware
      const { container } = await import('../container');
      const prisma = container.resolve<PrismaClient>('PrismaClient');

      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { isActive: true, deletedAt: true },
      });

      if (!user) {
        logger.warn('Auth middleware: user not found', {
          userId: req.user.sub,
        });
        throw unauthorizedError('User not found');
      }

      if (!user.isActive || user.deletedAt) {
        logger.warn('Auth middleware: user inactive or deleted', {
          userId: req.user.sub,
          isActive: user.isActive,
          deletedAt: user.deletedAt,
        });
        throw forbiddenError('Account is inactive or deleted');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Get user ID from request
 * Convenience function to extract user ID from authenticated request
 */
export function getUserId(req: Request): string | null {
  return req.user?.sub || null;
}

/**
 * Check if user has scope
 * Convenience function to check scope in route handlers
 */
export function hasScope(req: Request, scope: string): boolean {
  return req.user?.scope.includes(scope) || false;
}
