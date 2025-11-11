/**
 * Coupon Analytics Controller (Plan 111)
 *
 * Handles HTTP requests for coupon analytics endpoints.
 * Provides metrics, trends, and performance data for admin dashboard.
 *
 * Endpoints:
 * - GET /admin/analytics/coupons                - Overall metrics
 * - GET /admin/analytics/coupons/trend          - Redemption trend over time
 * - GET /admin/analytics/coupons/top            - Top performing coupons
 * - GET /admin/analytics/coupons/by-type        - Redemptions by coupon type
 *
 * Reference: docs/plan/111-coupon-management-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { CouponAnalyticsService } from '../services/coupon-analytics.service';
import logger from '../utils/logger';

@injectable()
export class CouponAnalyticsController {
  constructor(
    @inject(CouponAnalyticsService)
    private couponAnalyticsService: CouponAnalyticsService
  ) {
    logger.debug('CouponAnalyticsController: Initialized');
  }

  /**
   * GET /admin/analytics/coupons
   * Get overall coupon analytics metrics
   */
  async getAnalyticsMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const metrics = await this.couponAnalyticsService.getAnalyticsMetrics(start, end);

      res.status(200).json(metrics);
    } catch (error) {
      logger.error('Failed to get coupon analytics metrics', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve coupon analytics',
        },
      });
    }
  }

  /**
   * GET /admin/analytics/coupons/trend
   * Get redemption trend over time
   */
  async getRedemptionTrend(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: {
            code: 'validation_error',
            message: 'Start date and end date are required',
          },
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const trend = await this.couponAnalyticsService.getRedemptionTrend(start, end);

      res.status(200).json(trend);
    } catch (error) {
      logger.error('Failed to get redemption trend', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve redemption trend',
        },
      });
    }
  }

  /**
   * GET /admin/analytics/coupons/top
   * Get top performing coupons
   */
  async getTopPerformingCoupons(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const topCoupons = await this.couponAnalyticsService.getTopPerformingCoupons(limit);

      res.status(200).json(topCoupons);
    } catch (error) {
      logger.error('Failed to get top performing coupons', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve top performing coupons',
        },
      });
    }
  }

  /**
   * GET /admin/analytics/coupons/by-type
   * Get redemptions by coupon type
   */
  async getRedemptionsByType(_req: Request, res: Response): Promise<void> {
    try {
      const redemptionsByType = await this.couponAnalyticsService.getRedemptionsByType();

      res.status(200).json(redemptionsByType);
    } catch (error) {
      logger.error('Failed to get redemptions by type', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve redemptions by type',
        },
      });
    }
  }
}
