/**
 * Cache Analytics Routes (Plan 207)
 *
 * User-facing endpoints for personal cache performance analytics.
 * Admin endpoints are defined separately in admin-cache-analytics.routes.ts.
 *
 * Security:
 * - JWT authentication required (authMiddleware)
 * - User can only access their own cache metrics
 * - Rate limiting: 60 requests per hour per user
 *
 * Endpoints:
 * - GET /api/cache-analytics/performance - User's cache performance KPI
 * - GET /api/cache-analytics/hit-rate-trend - User's cache hit rate trend
 *
 * Reference: docs/plan/207-prompt-caching-support.md
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { container } from '../container';
import { CacheAnalyticsController } from '../controllers/cache-analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireFeature } from '../config/feature-flags';
import logger from '../utils/logger';
import Redis from 'ioredis';

const router = Router();

// ===== Rate Limiter Configuration =====

/**
 * Get Redis client from DI container for rate limiting
 */
function getRedisClient(): Redis | null {
  try {
    const redis = container.resolve<Redis>('RedisConnection');
    if (redis.status === 'ready' || redis.status === 'connect') {
      return redis;
    }
    logger.warn('Redis not ready for cache analytics rate limiting', { status: redis.status });
    return null;
  } catch (error: any) {
    logger.error('Failed to resolve Redis for cache analytics rate limiting', {
      error: error.message,
    });
    return null;
  }
}

/**
 * User cache analytics rate limiter
 * Limit: 60 requests per hour per user
 *
 * Allows users to check their cache performance without overloading the database
 */
const cacheAnalyticsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour sliding window
  max: 60, // 60 requests per hour
  standardHeaders: true, // Use RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: (() => {
    const redisClient = getRedisClient();
    if (redisClient) {
      return new RedisStore({
        // @ts-ignore - Type mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
        prefix: 'rl:cache-analytics:',
      });
    }
    logger.warn(
      'Cache analytics rate limiter using in-memory store (not suitable for production clusters)'
    );
    return undefined; // Fall back to memory store
  })(),
  keyGenerator: (req): string => {
    const user = (req as any).user;
    return `user:${user?.sub || 'unknown'}:cache-analytics`;
  },
  handler: (req, res): void => {
    const user = (req as any).user;
    const fullPath = (req.originalUrl || req.url).split('?')[0];

    logger.warn('Cache analytics rate limit exceeded', {
      userId: user?.sub,
      endpoint: `${req.method} ${fullPath}`,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message:
          'Cache analytics rate limit exceeded. You are limited to 60 requests per hour. Please try again later.',
        details: {
          limit: 60,
          windowMs: 3600000, // 1 hour in ms
        },
      },
    });
  },
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

// ===== Middleware Stack =====

/**
 * All cache analytics routes require:
 * 1. Feature flag enabled (requireFeature)
 * 2. JWT authentication (authMiddleware)
 * 3. Rate limiting (cacheAnalyticsRateLimiter)
 */
router.use(requireFeature('cacheAnalyticsEnabled'));
router.use(authMiddleware);
router.use(cacheAnalyticsRateLimiter);

// ===== Controller Resolution =====

const cacheAnalyticsController = container.resolve(CacheAnalyticsController);

// ===== Route Definitions =====

/**
 * GET /api/cache-analytics/performance
 *
 * Returns user's personal cache performance KPI with hit rates and savings.
 *
 * Query Parameters:
 * - period: last_7_days | last_30_days | last_90_days | custom (default: last_30_days)
 * - startDate (ISO 8601): Start date for custom period
 * - endDate (ISO 8601): End date for custom period
 * - tier: Filter by tier (optional, admin only)
 * - providers: Array of provider IDs to filter (optional)
 * - models: Array of model IDs to filter (optional)
 *
 * Response: 200 OK
 * {
 *   "avgCacheHitRate": 45.2,
 *   "totalCachedTokens": 150000,
 *   "totalCacheSavings": 12.45,
 *   "avgSavingsPercent": 35.0,
 *   "cacheEnabledRequests": 120,
 *   "totalRequests": 150,
 *   "cacheAdoptionRate": 80.0,
 *   "breakdown": {
 *     "cacheWriteTokens": 50000,
 *     "cacheReadTokens": 80000,
 *     "cachedPromptTokens": 20000
 *   },
 *   "trend": {
 *     "previousPeriodHitRate": 40.0,
 *     "hitRateChange": 5.2,
 *     "direction": "up"
 *   },
 *   "period": "last_30_days",
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 */
router.get(
  '/performance',
  cacheAnalyticsController.getUserCachePerformanceKPI.bind(cacheAnalyticsController)
);

/**
 * GET /api/cache-analytics/hit-rate-trend
 *
 * Returns user's cache hit rate trend over time with time-bucketed data points.
 *
 * Query Parameters:
 * - period, startDate, endDate, tier, providers, models (same as /performance)
 * - granularity: hour | day | week | month (default: day)
 *
 * Response: 200 OK
 * {
 *   "dataPoints": [
 *     {
 *       "timestamp": "2025-01-15T00:00:00.000Z",
 *       "avgHitRate": 42.5,
 *       "requestCount": 25,
 *       "cachedTokens": 12000,
 *       "savingsPercent": 30.0
 *     },
 *     ...
 *   ],
 *   "summary": {
 *     "peakHitRate": 55.0,
 *     "peakDate": "2025-01-18T00:00:00.000Z",
 *     "avgHitRate": 45.2,
 *     "trend": "improving"
 *   },
 *   "period": "last_30_days",
 *   "granularity": "day",
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 */
router.get(
  '/hit-rate-trend',
  cacheAnalyticsController.getUserCacheHitRateTrend.bind(cacheAnalyticsController)
);

export default router;
