/**
 * Cache Analytics Controller (Plan 207)
 *
 * Provides HTTP endpoints for cache performance analytics.
 * User endpoints (require authentication): personal cache metrics
 * Admin endpoints (require admin role): platform-wide cache metrics
 *
 * User Endpoints:
 * - GET /api/cache-analytics/performance      - User cache performance KPI
 * - GET /api/cache-analytics/hit-rate-trend   - User cache hit rate trend
 *
 * Admin Endpoints:
 * - GET /admin/analytics/cache/performance         - Platform cache KPI
 * - GET /admin/analytics/cache/hit-rate-trend      - Platform cache trend
 * - GET /admin/analytics/cache/savings-by-provider - Provider savings breakdown
 * - GET /admin/analytics/cache/efficiency-by-model - Model efficiency ranking
 *
 * Reference: docs/plan/207-prompt-caching-support.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { AnalyticsService, AnalyticsQueryParams, TrendQueryParams } from '../services/analytics.service';
import { validationError } from '../middleware/error.middleware';
import { successResponse } from '../utils/responses';

// =============================================================================
// Validation Schemas
// =============================================================================

const cacheAnalyticsQuerySchema = z.object({
  period: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'custom']).default('last_30_days'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  providers: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
});

const cacheTrendQuerySchema = cacheAnalyticsQuerySchema.extend({
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// =============================================================================
// Cache Analytics Controller Class
// =============================================================================

@injectable()
export class CacheAnalyticsController {
  constructor(
    @inject('AnalyticsService')
    private analyticsService: AnalyticsService
  ) {
    logger.debug('CacheAnalyticsController: Initialized');
  }

  // ===========================================================================
  // User Endpoints (Authenticated Users - Personal Metrics)
  // ===========================================================================

  /**
   * GET /api/cache-analytics/performance
   * Get user's personal cache performance KPI
   *
   * Requires: User authentication (req.user)
   */
  async getUserCachePerformanceKPI(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.sub;

    logger.info('CacheAnalyticsController.getUserCachePerformanceKPI', {
      userId,
      query: req.query,
    });

    try {
      const validation = cacheAnalyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        throw validationError('Invalid query parameters', validation.error);
      }

      const params: AnalyticsQueryParams = {
        ...validation.data,
        startDate: validation.data.startDate?.toISOString(),
        endDate: validation.data.endDate?.toISOString(),
      };

      // Get cache performance KPI for this user only
      const kpi = await this.analyticsService.getCachePerformanceKPI(params);

      res.status(200).json(successResponse({
        ...kpi,
        period: params.period,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('CacheAnalyticsController.getUserCachePerformanceKPI: Error', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/cache-analytics/hit-rate-trend
   * Get user's personal cache hit rate trend over time
   *
   * Requires: User authentication (req.user)
   */
  async getUserCacheHitRateTrend(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.sub;

    logger.info('CacheAnalyticsController.getUserCacheHitRateTrend', {
      userId,
      query: req.query,
    });

    try {
      const validation = cacheTrendQuerySchema.safeParse(req.query);
      if (!validation.success) {
        throw validationError('Invalid query parameters', validation.error);
      }

      const params: TrendQueryParams = {
        ...validation.data,
        startDate: validation.data.startDate?.toISOString(),
        endDate: validation.data.endDate?.toISOString(),
      };

      // Get cache hit rate trend for this user only
      const trend = await this.analyticsService.getCacheHitRateTrend(params);

      res.status(200).json(successResponse({
        ...trend,
        period: params.period,
        granularity: params.granularity,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('CacheAnalyticsController.getUserCacheHitRateTrend: Error', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ===========================================================================
  // Admin Endpoints (Admin Role - Platform-Wide Metrics)
  // ===========================================================================

  /**
   * GET /admin/analytics/cache/performance
   * Get platform-wide cache performance KPI
   *
   * Requires: Admin authentication
   */
  async getPlatformCachePerformanceKPI(req: Request, res: Response): Promise<void> {
    logger.info('CacheAnalyticsController.getPlatformCachePerformanceKPI', {
      query: req.query,
    });

    try {
      const validation = cacheAnalyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        throw validationError('Invalid query parameters', validation.error);
      }

      const params: AnalyticsQueryParams = {
        ...validation.data,
        startDate: validation.data.startDate?.toISOString(),
        endDate: validation.data.endDate?.toISOString(),
      };

      // Get cache performance KPI for entire platform
      const kpi = await this.analyticsService.getCachePerformanceKPI(params);

      res.status(200).json(successResponse({
        ...kpi,
        period: params.period,
        filters: {
          tier: params.tier,
          providers: params.providers,
          models: params.models,
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('CacheAnalyticsController.getPlatformCachePerformanceKPI: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/cache/hit-rate-trend
   * Get platform-wide cache hit rate trend over time
   *
   * Requires: Admin authentication
   */
  async getPlatformCacheHitRateTrend(req: Request, res: Response): Promise<void> {
    logger.info('CacheAnalyticsController.getPlatformCacheHitRateTrend', {
      query: req.query,
    });

    try {
      const validation = cacheTrendQuerySchema.safeParse(req.query);
      if (!validation.success) {
        throw validationError('Invalid query parameters', validation.error);
      }

      const params: TrendQueryParams = {
        ...validation.data,
        startDate: validation.data.startDate?.toISOString(),
        endDate: validation.data.endDate?.toISOString(),
      };

      // Get cache hit rate trend for entire platform
      const trend = await this.analyticsService.getCacheHitRateTrend(params);

      res.status(200).json(successResponse({
        ...trend,
        period: params.period,
        granularity: params.granularity,
        filters: {
          tier: params.tier,
          providers: params.providers,
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('CacheAnalyticsController.getPlatformCacheHitRateTrend: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/cache/savings-by-provider
   * Get cache cost savings breakdown by provider
   *
   * Requires: Admin authentication
   */
  async getCacheSavingsByProvider(req: Request, res: Response): Promise<void> {
    logger.info('CacheAnalyticsController.getCacheSavingsByProvider', {
      query: req.query,
    });

    try {
      const validation = cacheAnalyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        throw validationError('Invalid query parameters', validation.error);
      }

      const params: AnalyticsQueryParams = {
        ...validation.data,
        startDate: validation.data.startDate?.toISOString(),
        endDate: validation.data.endDate?.toISOString(),
      };

      // Get cache savings by provider
      const savings = await this.analyticsService.getCacheSavingsByProvider(params);

      res.status(200).json(successResponse({
        ...savings,
        period: params.period,
        filters: {
          tier: params.tier,
          models: params.models,
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('CacheAnalyticsController.getCacheSavingsByProvider: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/cache/efficiency-by-model
   * Get cache efficiency ranking by model
   *
   * Requires: Admin authentication
   */
  async getCacheEfficiencyByModel(req: Request, res: Response): Promise<void> {
    logger.info('CacheAnalyticsController.getCacheEfficiencyByModel', {
      query: req.query,
    });

    try {
      const validation = cacheAnalyticsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        throw validationError('Invalid query parameters', validation.error);
      }

      const params: AnalyticsQueryParams = {
        ...validation.data,
        startDate: validation.data.startDate?.toISOString(),
        endDate: validation.data.endDate?.toISOString(),
      };

      // Get cache efficiency by model
      const efficiency = await this.analyticsService.getCacheEfficiencyByModel(params);

      res.status(200).json(successResponse({
        ...efficiency,
        period: params.period,
        filters: {
          tier: params.tier,
          providers: params.providers,
        },
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('CacheAnalyticsController.getCacheEfficiencyByModel: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
