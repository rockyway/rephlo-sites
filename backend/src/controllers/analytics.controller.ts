/**
 * Platform Analytics Controller (Plan 109)
 *
 * Handles HTTP endpoints for platform-wide analytics and business intelligence.
 * All endpoints require admin authentication.
 *
 * Endpoints:
 * - GET /admin/analytics/revenue/mrr          - Get Monthly Recurring Revenue
 * - GET /admin/analytics/revenue/arr          - Get Annual Recurring Revenue
 * - GET /admin/analytics/revenue/by-tier      - Get revenue by tier
 * - GET /admin/analytics/users/total          - Get total active users
 * - GET /admin/analytics/users/by-tier        - Get user distribution by tier
 * - GET /admin/analytics/churn-rate           - Get churn rate
 * - GET /admin/analytics/credit-utilization   - Get credit utilization rate
 * - GET /admin/analytics/conversion-rate      - Get free-to-pro conversion rate
 * - GET /admin/analytics/dashboard            - Get dashboard summary
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { PlatformAnalyticsService } from '../services/platform-analytics.service';
import { validationError } from '../middleware/error.middleware';
import { successResponse } from '../utils/responses';

// =============================================================================
// Validation Schemas
// =============================================================================

const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const churnRateSchema = z.object({
  period: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
});

// =============================================================================
// Platform Analytics Controller Class
// =============================================================================

@injectable()
export class AnalyticsController {
  constructor(
    @inject('PlatformAnalyticsService')
    private analyticsService: PlatformAnalyticsService
  ) {
    logger.debug('AnalyticsController: Initialized');
  }

  // ===========================================================================
  // Revenue Metrics Endpoints
  // ===========================================================================

  /**
   * GET /admin/analytics/revenue/mrr
   * Get Monthly Recurring Revenue
   *
   * Requires: Admin authentication
   */
  async getMRR(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getMRR');

    try {
      const mrr = await this.analyticsService.calculateMRR();

      res.status(200).json(successResponse({
        mrr,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('AnalyticsController.getMRR: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/revenue/arr
   * Get Annual Recurring Revenue
   *
   * Requires: Admin authentication
   */
  async getARR(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getARR');

    try {
      const arr = await this.analyticsService.calculateARR();

      res.status(200).json(successResponse({
        arr,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('AnalyticsController.getARR: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/revenue/by-tier
   * Get revenue breakdown by tier
   *
   * Requires: Admin authentication
   *
   * Query: { startDate?: Date, endDate?: Date }
   */
  async getRevenueByTier(req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getRevenueByTier', {
      query: req.query,
    });

    // Validate query parameters
    const parseResult = dateRangeSchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Date range validation failed', errors);
    }

    try {
      const revenueByTier = await this.analyticsService.getRevenueByTier();

      res.status(200).json(successResponse(revenueByTier));
    } catch (error) {
      logger.error('AnalyticsController.getRevenueByTier: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // User Metrics Endpoints
  // ===========================================================================

  /**
   * GET /admin/analytics/users/total
   * Get total active users
   *
   * Requires: Admin authentication
   */
  async getTotalActiveUsers(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getTotalActiveUsers');

    try {
      const totalUsers = await this.analyticsService.getTotalActiveUsers();

      res.status(200).json(successResponse({
        totalActiveUsers: totalUsers,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('AnalyticsController.getTotalActiveUsers: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/users/by-tier
   * Get user distribution by tier
   *
   * Requires: Admin authentication
   */
  async getUsersByTier(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getUsersByTier');

    try {
      const usersByTier = await this.analyticsService.getUsersByTier();

      res.status(200).json(successResponse(usersByTier));
    } catch (error) {
      logger.error('AnalyticsController.getUsersByTier: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Conversion and Churn Metrics Endpoints
  // ===========================================================================

  /**
   * GET /admin/analytics/churn-rate
   * Get churn rate for a specific period
   *
   * Requires: Admin authentication
   *
   * Query: { period?: 'monthly' | 'quarterly' | 'annual' }
   */
  async getChurnRate(req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getChurnRate', {
      query: req.query,
    });

    // Validate query parameters
    const parseResult = churnRateSchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Period validation failed', errors);
    }

    const { period } = parseResult.data;

    try {
      const churnRate = await this.analyticsService.getChurnRate(period);

      res.status(200).json(successResponse({
        churnRate,
        period,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('AnalyticsController.getChurnRate: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/credit-utilization
   * Get credit utilization rate
   *
   * Requires: Admin authentication
   */
  async getCreditUtilizationRate(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getCreditUtilizationRate');

    try {
      const utilizationRate = await this.analyticsService.getCreditUtilizationRate();

      res.status(200).json(successResponse({
        creditUtilizationRate: utilizationRate,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('AnalyticsController.getCreditUtilizationRate: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/analytics/conversion-rate
   * Get free-to-pro conversion rate
   *
   * Requires: Admin authentication
   */
  async getFreeToProConversionRate(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getFreeToProConversionRate');

    try {
      const conversionRate = await this.analyticsService.getFreeToProConversionRate();

      res.status(200).json(successResponse({
        freeToProConversionRate: conversionRate,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error('AnalyticsController.getFreeToProConversionRate: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Combined Revenue Metrics Endpoint
  // ===========================================================================

  /**
   * GET /admin/analytics/revenue
   * Get combined revenue metrics
   *
   * Requires: Admin authentication
   *
   * Returns: { totalMRR, totalARR, avgRevenuePerUser, totalRevenueThisMonth, mrrGrowth }
   */
  async getRevenueMetrics(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getRevenueMetrics');

    try {
      const [mrr, arr, arpu] = await Promise.all([
        this.analyticsService.calculateMRR(),
        this.analyticsService.calculateARR(),
        this.analyticsService.getAverageRevenuePerUser(),
      ]);

      // Calculate total revenue this month (same as MRR for now)
      const totalRevenueThisMonth = mrr;

      // Calculate MRR growth as percentage (placeholder - can be enhanced later)
      const mrrGrowth = 0; // TODO: Calculate month-over-month growth

      res.status(200).json({
        totalMRR: mrr,
        totalARR: arr,
        avgRevenuePerUser: arpu,
        totalRevenueThisMonth: totalRevenueThisMonth,
        mrrGrowth: mrrGrowth,
      });
    } catch (error) {
      logger.error('AnalyticsController.getRevenueMetrics: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Dashboard Summary Endpoint
  // ===========================================================================

  /**
   * GET /admin/analytics/dashboard
   * Get comprehensive dashboard metrics summary
   *
   * Requires: Admin authentication
   *
   * Returns all key platform metrics in a single response
   */
  async getDashboardSummary(_req: Request, res: Response): Promise<void> {
    logger.info('AnalyticsController.getDashboardSummary');

    try {
      const dashboard = await this.analyticsService.getDashboardSummary();

      res.status(200).json(successResponse(dashboard));
    } catch (error) {
      logger.error('AnalyticsController.getDashboardSummary: Error', { error });
      throw error;
    }
  }
}
