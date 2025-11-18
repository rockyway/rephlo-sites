/**
 * Vendor Analytics Routes
 *
 * Admin-only endpoints for vendor cost and gross margin analytics.
 * Part of the Admin Analytics Dashboard (Plan 180).
 *
 * Security:
 * - JWT authentication required (authMiddleware)
 * - Admin scope required (requireAdmin)
 * - Rate limiting: 100 requests per hour per admin user
 *
 * Endpoints:
 * - GET /admin/analytics/gross-margin - Gross margin KPI with tier breakdown
 * - GET /admin/analytics/cost-by-provider - Top 5 providers by cost
 * - GET /admin/analytics/margin-trend - Time series gross margin data
 * - GET /admin/analytics/cost-distribution - Cost histogram with statistics
 * - POST /admin/analytics/export-csv - Export analytics data as CSV
 *
 * References:
 * - docs/plan/180-admin-analytics-dashboard-ui-design.md
 * - docs/reference/181-analytics-backend-architecture.md
 * - docs/reference/184-analytics-security-compliance.md
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { container } from '../container';
import { VendorAnalyticsController } from '../controllers/vendor-analytics.controller';
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
    logger.warn('Redis not ready for analytics rate limiting', { status: redis.status });
    return null;
  } catch (error: any) {
    logger.error('Failed to resolve Redis for analytics rate limiting', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Custom rate limiter for analytics endpoints
 * Limit: 100 requests per hour per admin user
 *
 * Note: This is more restrictive than the default admin rate limiting
 * to prevent heavy queries from impacting database performance.
 */
const analyticsRateLimiter = rateLimit({
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
        prefix: 'rl:analytics:',
      });
    }
    logger.warn(
      'Analytics rate limiter using in-memory store (not suitable for production clusters)'
    );
    return undefined; // Fall back to memory store
  })(),
  keyGenerator: (req): string => {
    const user = (req as any).user;
    return `admin:${user?.sub || 'unknown'}:analytics`;
  },
  handler: (req, res): void => {
    const user = (req as any).user;
    const fullPath = (req.originalUrl || req.url).split('?')[0];

    logger.warn('Analytics rate limit exceeded', {
      userId: user?.sub,
      endpoint: `${req.method} ${fullPath}`,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message:
          'Analytics rate limit exceeded. You are limited to 100 requests per hour. Please try again later.',
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
 * All analytics routes require:
 * 1. JWT authentication (authMiddleware)
 * 2. Admin role (requireAdmin)
 * 3. Rate limiting (analyticsRateLimiter)
 */
router.use(authMiddleware);
router.use(requireAdmin);
router.use(analyticsRateLimiter);

// ===== Controller Resolution =====

const vendorAnalyticsController = container.resolve(VendorAnalyticsController);

// ===== Route Definitions =====

/**
 * GET /admin/analytics/gross-margin
 *
 * Returns gross margin KPI with tier breakdown and period comparison.
 *
 * Query Parameters:
 * - startDate (ISO 8601): Start of date range (default: 30 days ago)
 * - endDate (ISO 8601): End of date range (default: now)
 * - tier: Filter by user tier (free/pro/enterprise)
 * - providerId: Filter by provider UUID
 * - modelId: Filter by model UUID
 *
 * Response: 200 OK
 * {
 *   "grossMarginUsd": 1234.56,
 *   "totalCost": 890.12,
 *   "totalRevenue": 2124.68,
 *   "marginPercent": 58.12,
 *   "tierBreakdown": [...],
 *   "trend": { "change": 15.5, "direction": "up" }
 * }
 */
router.get('/gross-margin', vendorAnalyticsController.getGrossMargin);

/**
 * GET /admin/analytics/cost-by-provider
 *
 * Returns top 5 providers by cost with breakdown.
 *
 * Query Parameters: Same as /gross-margin
 *
 * Response: 200 OK
 * {
 *   "providers": [
 *     {
 *       "providerId": "uuid",
 *       "providerName": "OpenAI",
 *       "totalCost": 500.00,
 *       "requestCount": 10000,
 *       "avgCostPerRequest": 0.05
 *     }
 *   ],
 *   "totalCost": 890.12
 * }
 */
router.get('/cost-by-provider', vendorAnalyticsController.getCostByProvider);

/**
 * GET /admin/analytics/margin-trend
 *
 * Returns time series data for gross margin with moving averages.
 *
 * Query Parameters:
 * - startDate, endDate, tier, providerId, modelId (same as /gross-margin)
 * - granularity: hour | day | week | month (default: day)
 *
 * Response: 200 OK
 * {
 *   "dataPoints": [...],
 *   "granularity": "day",
 *   "summary": {
 *     "avgMargin": 43.20,
 *     "minMargin": 35.00,
 *     "maxMargin": 52.00
 *   }
 * }
 */
router.get('/margin-trend', vendorAnalyticsController.getMarginTrend);

/**
 * GET /admin/analytics/cost-distribution
 *
 * Returns cost distribution histogram with statistical analysis.
 *
 * Query Parameters: Same as /gross-margin
 *
 * Response: 200 OK
 * {
 *   "buckets": [...],
 *   "statistics": {
 *     "mean": 0.045,
 *     "median": 0.030,
 *     "stdDev": 0.025,
 *     "p95": 0.10,
 *     "p99": 0.25
 *   },
 *   "anomalies": [...]
 * }
 */
router.get('/cost-distribution', vendorAnalyticsController.getCostDistribution);

/**
 * POST /admin/analytics/export-csv
 *
 * Exports analytics data as streaming CSV.
 *
 * Body: Same parameters as query endpoints (JSON)
 * {
 *   "startDate": "2025-01-01T00:00:00Z",
 *   "endDate": "2025-01-15T23:59:59Z",
 *   "tier": "pro",
 *   "format": "csv"
 * }
 *
 * Response: 200 OK (text/csv)
 * Headers:
 * - Content-Type: text/csv
 * - Content-Disposition: attachment; filename="analytics-YYYY-MM-DD.csv"
 *
 * CSV Format:
 * date,tier,provider,model,totalCost,grossMargin,requestCount,avgCostPerRequest
 */
router.post('/export-csv', vendorAnalyticsController.exportCSV);

// Note: No catch-all 404 handler here to allow unmatched routes to fall through
// to other analytics routers (e.g., plan109Router for revenue analytics).
// Global 404 handling is done in routes/index.ts

export default router;
