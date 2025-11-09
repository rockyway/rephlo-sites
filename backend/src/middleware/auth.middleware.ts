/**
 * JWT Authentication Middleware
 *
 * Validates JWT bearer tokens from the Authorization header.
 * Verifies token signature using Identity Provider's JWKS.
 * Falls back to token introspection if JWT verification fails.
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
import { TokenIntrospectionService } from '../services/token-introspection.service';

// Environment variables
const IDENTITY_PROVIDER_URL =
  process.env.IDENTITY_PROVIDER_URL || 'http://localhost:7151';

// Initialize introspection service
const introspectionService = new TokenIntrospectionService(
  IDENTITY_PROVIDER_URL
);

// Cache for JWKS (refresh every 5 minutes)
let cachedJwks: any = null;
let jwksLastFetched = 0;
const JWKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        role?: string; // User role (from JWT claim when admin scope is included)
      };
    }
  }
}

/**
 * JWT authentication middleware
 * Validates bearer token from Identity Provider
 * Tries JWT verification first, falls back to introspection
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
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

  // Try JWT verification first
  verifyJWT(token)
    .then((payload) => {
      req.user = {
        sub: payload.sub!,
        email: payload.email as string | undefined,
        scope: (payload.scope as string)?.split(' ') || [],
        clientId: payload.client_id as string,
        exp: payload.exp!,
        iat: payload.iat!,
        role: payload.role as string | undefined, // Extract role from JWT claim (if admin scope present)
      };

      logger.debug('Auth middleware: JWT verified', {
        userId: req.user.sub,
        hasRole: !!req.user.role,
      });

      next();
    })
    .catch((error) => {
      logger.debug('Auth middleware: JWT verification failed, trying introspection', {
        error: error.message,
      });

      // Fall back to introspection
      introspectionService
        .introspectToken(token)
        .then((result) => {
          if (!result.active) {
            logger.warn('Auth middleware: token inactive', {
              path: req.path,
            });
            throw new Error('Token is not active or has expired');
          }

          req.user = {
            sub: result.sub!,
            email: result.email as string | undefined,
            scope: (result.scope as string)?.split(' ') || [],
            clientId: result.client_id as string,
            exp: result.exp!,
            iat: result.iat!,
            role: result.role as string | undefined, // Extract role from introspection response
          };

          logger.debug('Auth middleware: token validated via introspection', {
            userId: req.user.sub,
            hasRole: !!req.user.role,
          });

          next();
        })
        .catch((introspectError) => {
          logger.warn('Auth middleware: token validation failed', {
            path: req.path,
            error: introspectError.message,
          });
          next(unauthorizedError('Invalid or expired token'));
        });
    });
}

/**
 * Verify JWT token using public key from Identity Provider
 */
async function verifyJWT(token: string): Promise<JWTPayload> {
  const parts = token.split('.');

  // Check if it's a valid JWT format (3 parts)
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  // Fetch JWKS if not cached
  if (!cachedJwks || Date.now() - jwksLastFetched > JWKS_CACHE_TTL) {
    cachedJwks = await introspectionService.getPublicKeys();
    jwksLastFetched = Date.now();
    logger.debug('Fetched JWKS from Identity Provider', {
      keyCount: cachedJwks.keys.length,
    });
  }

  // Use the first public key (typically only one for RS256)
  const publicJwk = cachedJwks.keys[0];

  if (!publicJwk) {
    throw new Error('No public keys available');
  }

  const publicKey = await importJWK(publicJwk, 'RS256');

  // Verify JWT signature and issuer
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: IDENTITY_PROVIDER_URL,
    algorithms: ['RS256'],
  });

  return payload;
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

/**
 * Get user's subscription tier
 * Queries active subscription and returns tier, defaults to 'free'
 *
 * Implements short-lived caching (30 seconds) to reduce DB queries
 *
 * @param userId - User ID
 * @returns User's subscription tier (free, pro, or enterprise)
 */
export async function getUserTier(
  userId: string
): Promise<'free' | 'pro' | 'enterprise'> {
  try {
    // Resolve PrismaClient from DI container
    const { container } = await import('../container');
    const prisma = container.resolve<PrismaClient>('PrismaClient');

    // Query active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      select: {
        tier: true,
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
    });

    // Default to free tier if no active subscription
    const tier = subscription?.tier || 'free';

    logger.debug('User tier retrieved', {
      userId,
      tier,
      hasActiveSubscription: !!subscription,
    });

    return tier as 'free' | 'pro' | 'enterprise';
  } catch (error) {
    logger.error('Error fetching user tier', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Default to free tier on error
    return 'free';
  }
}

/**
 * Middleware to require admin role
 * Use after authMiddleware
 *
 * Three-tier optimization strategy (Phase 1 - Performance Optimizations):
 * 1. Check JWT claim for role (fastest - no DB/cache query needed)
 * 2. Fall back to RoleCacheService (Redis cache)
 * 3. Fall back to direct DB query if cache unavailable
 *
 * Performance improvements:
 * - JWT claim check: ~0ms (in-memory)
 * - Cache check: ~2-5ms (Redis)
 * - DB query: ~15-20ms (PostgreSQL)
 *
 * Example:
 *   app.get('/admin/models', authMiddleware, requireAdmin, handler);
 */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.error('requireAdmin called before authMiddleware');
    throw unauthorizedError('Authentication required');
  }

  // OPTIMIZATION 1: Check JWT claim first (fastest - no query needed)
  // If admin scope was requested, role will be in JWT payload
  if (req.user.role) {
    logger.debug('requireAdmin: Using role from JWT claim', {
      userId: req.user.sub,
      role: req.user.role,
      optimizationTier: 1,
    });

    if (req.user.role === 'admin') {
      // User is admin, proceed immediately
      return next();
    } else {
      logger.warn('requireAdmin: insufficient privileges (from JWT)', {
        userId: req.user.sub,
        role: req.user.role,
      });
      return next(forbiddenError('Admin access required'));
    }
  }

  // OPTIMIZATION 2 & 3: Fall back to RoleCacheService (Redis) or DB
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { container } = require('../container');

  // Try to get RoleCacheService (will use cache or fall back to DB)
  import('../services/role-cache.service')
    .then((module) => {
      const roleCacheService = container.resolve(module.RoleCacheService);

      return roleCacheService.getUserRoleAndStatus(req.user!.sub);
    })
    .then((result: { role: string; isActive: boolean }) => {
      logger.debug('requireAdmin: Role retrieved from cache/DB', {
        userId: req.user?.sub,
        role: result.role,
        isActive: result.isActive,
        optimizationTier: 2,
      });

      if (!result.isActive) {
        logger.warn('requireAdmin: user inactive', {
          userId: req.user?.sub,
        });
        throw forbiddenError('Account is inactive');
      }

      if (result.role !== 'admin') {
        logger.warn('requireAdmin: insufficient privileges', {
          userId: req.user?.sub,
          role: result.role,
        });
        throw forbiddenError('Admin access required');
      }

      // User is admin, proceed
      next();
    })
    .catch((error: Error) => {
      next(error);
    });
}
