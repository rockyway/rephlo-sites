/**
 * Admin Cache Analytics Routes (Plan 207)
 *
 * Admin-only endpoints for platform-wide cache performance analytics.
 * Part of the Admin Analytics Dashboard.
 *
 * Security:
 * - JWT authentication required (authMiddleware)
 * - Admin role required (requireAdmin)
 * - Rate limiting: 100 requests per hour per admin user
 *
 * Endpoints:
 * - GET /admin/analytics/cache/performance - Platform cache performance KPI
 * - GET /admin/analytics/cache/hit-rate-trend - Platform cache hit rate trend
 * - GET /admin/analytics/cache/savings-by-provider - Cache savings by provider
 * - GET /admin/analytics/cache/efficiency-by-model - Cache efficiency by model
 *
 * Reference: docs/plan/207-prompt-caching-support.md
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { container } from '../container';
import { CacheAnalyticsController } from '../controllers/cache-analytics.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
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
    logger.warn('Redis not ready for admin cache analytics rate limiting', { status: redis.status });
    return null;
  } catch (error: any) {
    logger.error('Failed to resolve Redis for admin cache analytics rate limiting', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Admin cache analytics rate limiter
 * Limit: 100 requests per hour per admin user
 *
 * Same as general analytics rate limit to prevent heavy queries
 */
const adminCacheAnalyticsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour sliding window
  max: 100, // 100 requests per hour
  standardHeaders: true, // Use RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: (() => {
    const redisClient = getRedisClient();
    if (redisClient) {
      return new RedisStore({
        // @ts-ignore - Type mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
        prefix: 'rl:admin-cache-analytics:',
      });
    }
    logger.warn(
      'Admin cache analytics rate limiter using in-memory store (not suitable for production clusters)'
    );
    return undefined; // Fall back to memory store
  })(),
  keyGenerator: (req): string => {
    const user = (req as any).user;
    return `admin:${user?.sub || 'unknown'}:cache-analytics`;
  },
  handler: (req, res): void => {
    const user = (req as any).user;
    const fullPath = (req.originalUrl || req.url).split('?')[0];

    logger.warn('Admin cache analytics rate limit exceeded', {
      userId: user?.sub,
      endpoint: `${req.method} ${fullPath}`,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message:
          'Admin cache analytics rate limit exceeded. You are limited to 100 requests per hour. Please try again later.',
        details: {
          limit: 100,
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
 * All admin cache analytics routes require:
 * 1. JWT authentication (authMiddleware)
 * 2. Admin role (requireAdmin)
 * 3. Rate limiting (adminCacheAnalyticsRateLimiter)
 */
router.use(authMiddleware);
router.use(requireAdmin);
router.use(adminCacheAnalyticsRateLimiter);

// ===== Controller Resolution =====

const cacheAnalyticsController = container.resolve(CacheAnalyticsController);

// ===== Route Definitions =====

/**
 * GET /admin/analytics/cache/performance
 *
 * Returns platform-wide cache performance KPI with hit rates and savings.
 *
 * Query Parameters:
 * - period: last_7_days | last_30_days | last_90_days | custom (default: last_30_days)
 * - startDate (ISO 8601): Start date for custom period
 * - endDate (ISO 8601): End date for custom period
 * - tier: Filter by tier (free/pro/enterprise)
 * - providers: Array of provider UUIDs to filter
 * - models: Array of model IDs to filter
 *
 * Response: 200 OK
 * {
 *   "avgCacheHitRate": 45.2,
 *   "totalCachedTokens": 15000000,
 *   "totalCacheSavings": 1245.67,
 *   "avgSavingsPercent": 35.0,
 *   "cacheEnabledRequests": 12000,
 *   "totalRequests": 15000,
 *   "cacheAdoptionRate": 80.0,
 *   "breakdown": {
 *     "cacheWriteTokens": 5000000,
 *     "cacheReadTokens": 8000000,
 *     "cachedPromptTokens": 2000000
 *   },
 *   "trend": {
 *     "previousPeriodHitRate": 40.0,
 *     "hitRateChange": 5.2,
 *     "direction": "up"
 *   },
 *   "period": "last_30_days",
 *   "filters": { "tier": null, "providers": null, "models": null },
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 */
router.get(
  '/performance',
  cacheAnalyticsController.getPlatformCachePerformanceKPI.bind(cacheAnalyticsController)
);

/**
 * GET /admin/analytics/cache/hit-rate-trend
 *
 * Returns platform-wide cache hit rate trend over time.
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
 *       "requestCount": 2500,
 *       "cachedTokens": 1200000,
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
 *   "filters": { "tier": null, "providers": null },
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 */
router.get(
  '/hit-rate-trend',
  cacheAnalyticsController.getPlatformCacheHitRateTrend.bind(cacheAnalyticsController)
);

/**
 * GET /admin/analytics/cache/savings-by-provider
 *
 * Returns cache cost savings breakdown by LLM provider.
 * Identifies which providers deliver the most cache savings.
 *
 * Query Parameters:
 * - period, startDate, endDate, tier, models (same as /performance)
 *
 * Response: 200 OK
 * {
 *   "providers": [
 *     {
 *       "providerId": "uuid-123",
 *       "providerName": "Anthropic",
 *       "totalSavings": 500.00,
 *       "avgHitRate": 55.0,
 *       "requestCount": 5000,
 *       "savingsPercent": 40.0
 *     },
 *     {
 *       "providerId": "uuid-456",
 *       "providerName": "OpenAI",
 *       "totalSavings": 300.00,
 *       "avgHitRate": 30.0,
 *       "requestCount": 3000,
 *       "savingsPercent": 25.0
 *     },
 *     ...
 *   ],
 *   "totalSavings": 1245.67,
 *   "period": "last_30_days",
 *   "filters": { "tier": null, "models": null },
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 */
router.get(
  '/savings-by-provider',
  cacheAnalyticsController.getCacheSavingsByProvider.bind(cacheAnalyticsController)
);

/**
 * GET /admin/analytics/cache/efficiency-by-model
 *
 * Returns cache efficiency ranking by LLM model.
 * Shows which models benefit most from caching.
 *
 * Query Parameters:
 * - period, startDate, endDate, tier, providers (same as /performance)
 *
 * Response: 200 OK
 * {
 *   "models": [
 *     {
 *       "modelId": "claude-3.5-sonnet",
 *       "providerId": "uuid-123",
 *       "avgHitRate": 65.0,
 *       "totalCachedTokens": 8000000,
 *       "costSavings": 800.00,
 *       "requestCount": 4000,
 *       "efficiency": "high"
 *     },
 *     {
 *       "modelId": "gpt-4o",
 *       "providerId": "uuid-456",
 *       "avgHitRate": 35.0,
 *       "totalCachedTokens": 3000000,
 *       "costSavings": 200.00,
 *       "requestCount": 2000,
 *       "efficiency": "medium"
 *     },
 *     ...
 *   ],
 *   "period": "last_30_days",
 *   "filters": { "tier": null, "providers": null },
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 */
router.get(
  '/efficiency-by-model',
  cacheAnalyticsController.getCacheEfficiencyByModel.bind(cacheAnalyticsController)
);

export default router;
