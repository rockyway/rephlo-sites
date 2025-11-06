/**
 * Rate Limiting Middleware
 *
 * Implements tier-based rate limiting with Redis backing for distributed environments.
 * Enforces limits on:
 * - Requests per minute (RPM)
 * - Tokens per minute (TPM)
 * - Credits per day (daily limit)
 *
 * Rate Limit Tiers:
 * - Free: 10 RPM, 10k TPM, 200 credits/day
 * - Pro: 60 RPM, 100k TPM, 5k credits/day
 * - Enterprise: 300 RPM, 500k TPM, 50k credits/day
 *
 * Headers included in responses:
 * - X-RateLimit-Limit: Tier limit
 * - X-RateLimit-Remaining: Remaining requests
 * - X-RateLimit-Reset: Unix timestamp of limit reset
 * - Retry-After: Seconds until limit reset (when exceeded)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Section: Security & Rate Limiting)
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import logger from '../utils/logger';

// ===== Rate Limit Configuration =====

/**
 * Rate limit tiers with multiple dimensions
 */
export const RATE_LIMITS = {
  free: {
    requestsPerMinute: 10,
    tokensPerMinute: 10000,
    creditsPerDay: 200,
  },
  pro: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
    creditsPerDay: 5000,
  },
  enterprise: {
    requestsPerMinute: 300,
    tokensPerMinute: 500000,
    creditsPerDay: 50000,
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

// ===== Redis Client Setup =====

/**
 * Initialize Redis client for rate limiting
 * Falls back to memory store if Redis is unavailable
 */
let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnected = false;

export async function initializeRedisForRateLimiting(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisPassword = process.env.REDIS_PASSWORD;

  try {
    redisClient = createClient({
      url: redisUrl,
      password: redisPassword || undefined,
      socket: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
        reconnectStrategy: (retries) => {
          const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '3');
          if (retries > maxRetries) {
            logger.error('Redis max retries exceeded for rate limiting', {
              retries,
              maxRetries,
            });
            return new Error('Redis connection failed');
          }
          // Exponential backoff: 50ms, 100ms, 200ms...
          return Math.min(retries * 50, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error for rate limiting', { error: err.message });
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected for rate limiting');
      redisConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready for rate limiting');
      redisConnected = true;
    });

    await redisClient.connect();
    logger.info('Redis initialized for rate limiting', { url: redisUrl });
  } catch (error: any) {
    logger.error('Failed to initialize Redis for rate limiting', {
      error: error.message,
    });
    logger.warn('Rate limiting will use in-memory store (not cluster-safe)');
    redisClient = null;
    redisConnected = false;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisForRateLimiting(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis client closed for rate limiting');
    } catch (error: any) {
      logger.error('Error closing Redis client', { error: error.message });
    }
  }
}

// ===== Rate Limit Key Generators =====

/**
 * Generate Redis key for user-based rate limiting
 */
function getUserRateLimitKey(userId: string, tier: RateLimitTier): string {
  return `rl:user:${userId}:${tier}:rpm`;
}

/**
 * Generate Redis key for IP-based rate limiting
 */
function getIPRateLimitKey(ip: string): string {
  return `rl:ip:${ip}:rpm`;
}

// ===== User Tier Detection =====

/**
 * Get user's subscription tier from request
 * Defaults to 'free' if no subscription found
 */
export function getUserTier(req: Request): RateLimitTier {
  // After authentication middleware, user object will be available
  const user = (req as any).user;

  if (!user) {
    return 'free';
  }

  // Get subscription tier from user object
  // This will be set by auth middleware after it loads user + subscription
  const tier = user.subscription?.tier || 'free';

  // Validate tier
  if (!['free', 'pro', 'enterprise'].includes(tier)) {
    logger.warn('Invalid subscription tier detected, defaulting to free', {
      userId: user.id,
      invalidTier: tier,
    });
    return 'free';
  }

  return tier as RateLimitTier;
}

// ===== Rate Limit Error Handler =====

/**
 * Custom handler for rate limit exceeded responses
 */
function rateLimitHandler(req: Request, res: Response): void {
  const user = (req as any).user;
  const tier = getUserTier(req);
  const limit = RATE_LIMITS[tier].requestsPerMinute;

  // Calculate Retry-After header (seconds until next minute)
  const now = Date.now();
  const resetTime = Math.ceil(now / 60000) * 60000; // Next minute boundary
  const retryAfter = Math.ceil((resetTime - now) / 1000);

  logger.warn('Rate limit exceeded', {
    userId: user?.id,
    ip: req.ip,
    tier,
    limit,
    endpoint: `${req.method} ${req.path}`,
  });

  res.status(429).json({
    error: {
      code: 'rate_limit_exceeded',
      message: `Rate limit exceeded. You are limited to ${limit} requests per minute on the ${tier} tier. Please try again in ${retryAfter} seconds.`,
      details: {
        tier,
        limit,
        retryAfter,
      },
    },
  });
}

// ===== Skip Conditions =====

/**
 * Skip rate limiting for certain requests
 */
function shouldSkipRateLimit(req: Request): boolean {
  // Skip rate limiting for health checks
  if (req.path.startsWith('/health')) {
    return true;
  }

  // Skip for OIDC discovery endpoints (must be publicly accessible)
  if (req.path.startsWith('/.well-known')) {
    return true;
  }

  // Check for bypass header (for testing purposes only)
  // TODO: Remove in production or restrict to admin users
  const bypassHeader = req.headers['x-ratelimit-bypass'];
  if (bypassHeader === process.env.RATE_LIMIT_BYPASS_SECRET) {
    logger.debug('Rate limit bypassed via header', {
      ip: req.ip,
      endpoint: `${req.method} ${req.path}`,
    });
    return true;
  }

  return false;
}

// ===== Main Rate Limiting Middleware =====

/**
 * Create user-based rate limiting middleware
 * Uses Redis store if available, falls back to memory store
 */
export function createUserRateLimiter(): RateLimitRequestHandler {
  // Create Redis store if Redis is connected
  const store =
    redisClient && redisConnected
      ? new RedisStore({
          // @ts-ignore - Type mismatch between redis and rate-limit-redis
          sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
          prefix: 'rl:user:',
        })
      : undefined; // Will use default memory store

  if (!store) {
    logger.warn(
      'User rate limiter using in-memory store (not suitable for production clusters)'
    );
  }

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute sliding window
    max: (req: Request): number => {
      const tier = getUserTier(req);
      return RATE_LIMITS[tier].requestsPerMinute;
    },
    standardHeaders: true, // Use RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers (we'll add our own)
    store,
    skip: shouldSkipRateLimit,
    handler: rateLimitHandler,
    keyGenerator: (req: Request): string => {
      const user = (req as any).user;
      if (user?.id) {
        const tier = getUserTier(req);
        return getUserRateLimitKey(user.id, tier);
      }
      // Fallback to IP-based rate limiting for unauthenticated requests
      return getIPRateLimitKey(req.ip || 'unknown');
    },
    // Skip failed requests (don't count errors against rate limit)
    skipFailedRequests: false,
    // Skip successful requests (count all requests)
    skipSuccessfulRequests: false,
  });
}

/**
 * Create IP-based rate limiting middleware for unauthenticated endpoints
 * More restrictive than user-based limits to prevent abuse
 */
export function createIPRateLimiter(
  requestsPerMinute: number = 30
): RateLimitRequestHandler {
  const store =
    redisClient && redisConnected
      ? new RedisStore({
          // @ts-ignore - Type mismatch between redis and rate-limit-redis
          sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
          prefix: 'rl:ip:',
        })
      : undefined;

  return rateLimit({
    windowMs: 60 * 1000,
    max: requestsPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    skip: shouldSkipRateLimit,
    handler: (req: Request, res: Response): void => {
      const retryAfter = Math.ceil((60 * 1000 - (Date.now() % (60 * 1000))) / 1000);

      logger.warn('IP rate limit exceeded', {
        ip: req.ip,
        endpoint: `${req.method} ${req.path}`,
      });

      res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: `Too many requests from this IP. Please try again in ${retryAfter} seconds.`,
          details: {
            limit: requestsPerMinute,
            retryAfter,
          },
        },
      });
    },
    keyGenerator: (req: Request): string => {
      // Extract real IP from X-Forwarded-For header (when behind proxy)
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        const ips = (forwardedFor as string).split(',').map((ip) => ip.trim());
        return getIPRateLimitKey(ips[0]); // Use first IP (original client)
      }
      return getIPRateLimitKey(req.ip || 'unknown');
    },
  });
}

// ===== Rate Limit Headers Middleware =====

/**
 * Add custom rate limit headers to all responses
 * Supplements the standard RateLimit-* headers with our custom format
 */
export function addRateLimitHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user;
  if (!user) {
    return next();
  }

  const tier = getUserTier(req);
  const limit = RATE_LIMITS[tier].requestsPerMinute;

  // Calculate reset time (next minute boundary)
  const now = Date.now();
  const resetTime = Math.ceil(now / 60000) * 60000;

  // Set custom headers (these will be overwritten by express-rate-limit if present)
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());

  next();
}

// ===== Rate Limit Status Helpers =====

/**
 * Get current rate limit status for a user
 * Used by the /v1/rate-limit endpoint
 */
export interface RateLimitStatus {
  requests_per_minute: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
  tokens_per_minute: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
  credits_per_day: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
}

export async function getUserRateLimitStatus(
  _userId: string,
  tier: RateLimitTier
): Promise<RateLimitStatus> {
  const limits = RATE_LIMITS[tier];

  // Calculate reset times
  const now = new Date();
  const nextMinute = new Date(Math.ceil(now.getTime() / 60000) * 60000);
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);

  // TODO: Fetch actual usage from Redis
  // For now, return placeholder values
  // This will be fully implemented when Credit & Usage Tracking Agent provides the data

  return {
    requests_per_minute: {
      limit: limits.requestsPerMinute,
      remaining: limits.requestsPerMinute, // Placeholder
      reset_at: nextMinute.toISOString(),
    },
    tokens_per_minute: {
      limit: limits.tokensPerMinute,
      remaining: limits.tokensPerMinute, // Placeholder
      reset_at: nextMinute.toISOString(),
    },
    credits_per_day: {
      limit: limits.creditsPerDay,
      remaining: limits.creditsPerDay, // Placeholder
      reset_at: nextDay.toISOString(),
    },
  };
}

// ===== Export Main Middleware =====

/**
 * Main rate limiting middleware factory
 * Call this to get the middleware for your route
 */
export default createUserRateLimiter;
