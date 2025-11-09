/**
 * Revenue Analytics Controller
 *
 * HTTP handlers for revenue analytics endpoints.
 * Provides detailed revenue metrics and analytics for the admin dashboard.
 *
 * Endpoints:
 * - GET /api/v1/admin/analytics/revenue/kpis
 * - GET /api/v1/admin/analytics/revenue/mix
 * - GET /api/v1/admin/analytics/revenue/trend
 * - GET /api/v1/admin/analytics/revenue/funnel
 * - GET /api/v1/admin/analytics/revenue/credit-usage
 * - GET /api/v1/admin/analytics/revenue/coupon-roi
 *
 * Authentication: Requires authMiddleware + requireAdmin
 * Audit Logging: Applied via auditLog middleware
 *
 * @module controllers/revenue-analytics.controller
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { RevenueAnalyticsService } from '../services/revenue-analytics.service';
import logger from '../utils/logger';
import {
  RevenueKPIsQuery,
  RevenueMixQuery,
  RevenueTrendQuery,
  RevenueFunnelQuery,
  CreditUsageQuery,
  CouponROIQuery,
} from '../types/revenue-analytics.types';

@injectable()
export class RevenueAnalyticsController {
  constructor(
    @inject(RevenueAnalyticsService) private analyticsService: RevenueAnalyticsService
  ) {
    logger.debug('RevenueAnalyticsController: Initialized');
  }

  /**
   * Validate period parameter
   */
  private validatePeriod(period?: string): string {
    const validPeriods = ['7d', '30d', '90d', '1y'];
    if (period && !validPeriods.includes(period)) {
      throw new Error(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }
    return period || '30d';
  }

  /**
   * Validate limit parameter
   */
  private validateLimit(limit?: string | number, defaultLimit: number = 10, maxLimit: number = 100): number {
    const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (isNaN(parsed) || parsed < 1) return defaultLimit;
    return Math.min(parsed, maxLimit);
  }

  // ===========================================================================
  // Revenue KPIs Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/revenue/kpis
   * Get revenue KPIs: total revenue, MRR, perpetual, ARPU, coupon discount
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   *
   * Response 200:
   * {
   *   "totalRevenue": { "value": 150000, "change": { "value": 12.5, "trend": "up" } },
   *   "mrr": { "value": 100000, "change": { "value": 8.0, "trend": "up" } },
   *   "perpetualRevenue": { "value": 40000, "change": { "value": 20.0, "trend": "up" } },
   *   "arpu": { "value": 500, "change": { "value": 5.0, "trend": "up" } },
   *   "couponDiscount": { "value": 5000, "period": "30d" }
   * }
   *
   * Response 400: Invalid period parameter
   * Response 500: Server error
   */
  async getRevenueKPIs(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as RevenueKPIsQuery;

      // Validate period parameter
      const period = this.validatePeriod(query.period);

      // Get KPIs from service
      const kpis = await this.analyticsService.getRevenueKPIs(period);

      logger.info('RevenueAnalyticsController.getRevenueKPIs: KPIs retrieved', {
        period,
        totalRevenue: kpis.totalRevenue.value,
        mrr: kpis.mrr.value,
      });

      res.status(200).json(kpis);
    } catch (error) {
      logger.error('RevenueAnalyticsController.getRevenueKPIs: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      if (error instanceof Error && error.message.includes('Invalid period')) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Failed to retrieve revenue KPIs',
            details:
              process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
        });
      }
    }
  }

  // ===========================================================================
  // Revenue Mix Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/revenue/mix
   * Get revenue breakdown by type (subscription, perpetual, upgrade)
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   *
   * Response 200:
   * {
   *   "subscriptionRevenue": 100000,
   *   "perpetualRevenue": 40000,
   *   "upgradeRevenue": 10000
   * }
   *
   * Response 400: Invalid period parameter
   * Response 500: Server error
   */
  async getRevenueMix(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as RevenueMixQuery;

      // Validate period parameter
      const period = this.validatePeriod(query.period);

      // Get revenue mix from service
      const mix = await this.analyticsService.getRevenueMix(period);

      logger.info('RevenueAnalyticsController.getRevenueMix: Revenue mix retrieved', {
        period,
        subscriptionRevenue: mix.subscriptionRevenue,
        perpetualRevenue: mix.perpetualRevenue,
        upgradeRevenue: mix.upgradeRevenue,
      });

      res.status(200).json(mix);
    } catch (error) {
      logger.error('RevenueAnalyticsController.getRevenueMix: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      if (error instanceof Error && error.message.includes('Invalid period')) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Failed to retrieve revenue mix',
            details:
              process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
        });
      }
    }
  }

  // ===========================================================================
  // Revenue Trend Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/revenue/trend
   * Get revenue trend data with automatic aggregation
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   *
   * Aggregation:
   * - '7d': Daily
   * - '30d': Daily
   * - '90d': Weekly
   * - '1y': Monthly
   *
   * Response 200:
   * {
   *   "data": [
   *     { "date": "2025-11-01", "totalRevenue": 50000, "subscriptionRevenue": 30000, "perpetualRevenue": 20000 },
   *     { "date": "2025-11-02", "totalRevenue": 45000, "subscriptionRevenue": 25000, "perpetualRevenue": 20000 }
   *   ]
   * }
   *
   * Response 400: Invalid period parameter
   * Response 500: Server error
   */
  async getRevenueTrend(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as RevenueTrendQuery;

      // Validate period parameter
      const period = this.validatePeriod(query.period);

      // Get revenue trend from service
      const trend = await this.analyticsService.getRevenueTrend(period);

      logger.info('RevenueAnalyticsController.getRevenueTrend: Revenue trend retrieved', {
        period,
        dataPoints: trend.data.length,
      });

      res.status(200).json(trend);
    } catch (error) {
      logger.error('RevenueAnalyticsController.getRevenueTrend: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      if (error instanceof Error && error.message.includes('Invalid period')) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Failed to retrieve revenue trend',
            details:
              process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
        });
      }
    }
  }

  // ===========================================================================
  // Revenue Funnel Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/revenue/funnel
   * Get user conversion funnel: free -> paid -> perpetual
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   *
   * Response 200:
   * {
   *   "freeTier": { "count": 1000, "percentage": 70 },
   *   "paidSubscription": { "count": 250, "percentage": 17, "conversionRate": 25 },
   *   "perpetualLicense": { "count": 50, "percentage": 3, "conversionRate": 20 }
   * }
   *
   * Response 400: Invalid period parameter
   * Response 500: Server error
   */
  async getRevenueFunnel(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as RevenueFunnelQuery;

      // Validate period parameter
      const period = this.validatePeriod(query.period);

      // Get revenue funnel from service
      const funnel = await this.analyticsService.getRevenueFunnel(period);

      logger.info('RevenueAnalyticsController.getRevenueFunnel: Revenue funnel retrieved', {
        period,
        freeTier: funnel.freeTier.count,
        paidSubscription: funnel.paidSubscription.count,
        perpetualLicense: funnel.perpetualLicense.count,
      });

      res.status(200).json(funnel);
    } catch (error) {
      logger.error('RevenueAnalyticsController.getRevenueFunnel: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      if (error instanceof Error && error.message.includes('Invalid period')) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Failed to retrieve revenue funnel',
            details:
              process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
        });
      }
    }
  }

  // ===========================================================================
  // Credit Usage Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/revenue/credit-usage
   * Get credit usage by model with revenue contribution estimates
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   * - limit: number (default: 10, max: 100)
   *
   * Response 200:
   * {
   *   "data": [
   *     { "model": "claude-3-opus", "credits": 5000000, "requests": 1500, "revenue_contribution": 75000 },
   *     { "model": "gpt-4", "credits": 3000000, "requests": 1000, "revenue_contribution": 45000 }
   *   ]
   * }
   *
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getCreditUsage(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as CreditUsageQuery;

      // Validate period parameter
      const period = this.validatePeriod(query.period);

      // Validate limit parameter
      const limit = this.validateLimit(query.limit, 10, 100);

      // Get credit usage from service
      const usage = await this.analyticsService.getCreditUsage(period, limit);

      logger.info('RevenueAnalyticsController.getCreditUsage: Credit usage retrieved', {
        period,
        limit,
        models: usage.data.length,
      });

      res.status(200).json(usage);
    } catch (error) {
      logger.error('RevenueAnalyticsController.getCreditUsage: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      if (error instanceof Error && error.message.includes('Invalid period')) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Failed to retrieve credit usage',
            details:
              process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
        });
      }
    }
  }

  // ===========================================================================
  // Coupon ROI Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/revenue/coupon-roi
   * Get coupon ROI analysis by campaign
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   * - limit: number (default: 10, max: 100)
   *
   * Response 200:
   * {
   *   "data": [
   *     {
   *       "campaign_name": "Black Friday 2025",
   *       "coupons_issued": 1000,
   *       "coupons_redeemed": 250,
   *       "discount_value": 50000,
   *       "revenue_generated": 500000,
   *       "roi_percentage": 900
   *     }
   *   ]
   * }
   *
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getCouponROI(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as CouponROIQuery;

      // Validate period parameter
      const period = this.validatePeriod(query.period);

      // Validate limit parameter
      const limit = this.validateLimit(query.limit, 10, 100);

      // Get coupon ROI from service
      const roi = await this.analyticsService.getCouponROI(period, limit);

      logger.info('RevenueAnalyticsController.getCouponROI: Coupon ROI retrieved', {
        period,
        limit,
        campaigns: roi.data.length,
      });

      res.status(200).json(roi);
    } catch (error) {
      logger.error('RevenueAnalyticsController.getCouponROI: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      if (error instanceof Error && error.message.includes('Invalid period')) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Failed to retrieve coupon ROI',
            details:
              process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          },
        });
      }
    }
  }
}
