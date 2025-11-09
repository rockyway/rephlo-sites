/**
 * Admin Analytics Controller
 *
 * HTTP handlers for Unified Admin Dashboard analytics endpoints.
 * Provides dashboard KPIs and recent activity feed for cross-plan monitoring.
 *
 * Endpoints:
 * - GET /api/v1/admin/analytics/dashboard-kpis - Cross-plan KPI aggregation
 * - GET /api/v1/admin/analytics/recent-activity - Recent activity feed
 *
 * Authentication: Requires authMiddleware + requireAdmin
 * Audit Logging: Applied via auditLog middleware
 *
 * @module controllers/admin-analytics.controller
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import logger from '../utils/logger';
import { DashboardKPIsQuery, RecentActivityQuery } from '../types/admin-analytics.types';

@injectable()
export class AdminAnalyticsController {
  constructor(
    @inject(AdminAnalyticsService) private analyticsService: AdminAnalyticsService
  ) {
    logger.debug('AdminAnalyticsController: Initialized');
  }

  // ===========================================================================
  // Dashboard KPIs Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/dashboard-kpis
   * Get cross-plan dashboard KPIs
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   *
   * Response 200:
   * {
   *   "totalRevenue": {
   *     "value": 150000, // USD cents
   *     "change": { "value": 12.5, "trend": "up" },
   *     "breakdown": { "mrr": 100000, "perpetual": 40000, "upgrades": 10000 }
   *   },
   *   "activeUsers": {
   *     "value": 1234,
   *     "change": { "value": 8.2, "trend": "up" }
   *   },
   *   "creditsConsumed": {
   *     "value": 5000000,
   *     "change": { "value": 15.3, "trend": "up" }
   *   },
   *   "couponRedemptions": {
   *     "value": 45,
   *     "change": { "value": 5.0, "trend": "down" },
   *     "totalDiscount": 12500
   *   }
   * }
   *
   * Response 400: Invalid period parameter
   * Response 500: Server error
   */
  async getDashboardKPIs(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as DashboardKPIsQuery;
      const period = query.period || '30d';

      // Validate period parameter
      const validPeriods = ['7d', '30d', '90d', '1y'];
      if (!validPeriods.includes(period)) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: `Invalid period parameter. Must be one of: ${validPeriods.join(', ')}`,
          },
        });
        return;
      }

      // Get KPIs from service
      const kpis = await this.analyticsService.getDashboardKPIs(period);

      logger.info('AdminAnalyticsController.getDashboardKPIs: KPIs retrieved', {
        period,
        totalRevenue: kpis.totalRevenue.value,
        activeUsers: kpis.activeUsers.value,
      });

      res.status(200).json(kpis);
    } catch (error) {
      logger.error('AdminAnalyticsController.getDashboardKPIs: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve dashboard KPIs',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Recent Activity Feed Endpoint
  // ===========================================================================

  /**
   * GET /api/v1/admin/analytics/recent-activity
   * Get recent activity feed from multiple sources
   *
   * Query Parameters:
   * - limit: number (default: 20, max: 100)
   * - offset: number (default: 0)
   *
   * Response 200:
   * {
   *   "events": [
   *     {
   *       "id": "uuid",
   *       "type": "subscription",
   *       "action": "created",
   *       "description": "User activated pro subscription",
   *       "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe" },
   *       "metadata": { "tier": "pro", "status": "active" },
   *       "timestamp": "2025-11-09T12:34:56.000Z"
   *     }
   *   ],
   *   "total": 150,
   *   "limit": 20,
   *   "offset": 0
   * }
   *
   * Response 400: Invalid pagination parameters
   * Response 500: Server error
   */
  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as RecentActivityQuery;
      const limit = query.limit ? Number(query.limit) : 20;
      const offset = query.offset ? Number(query.offset) : 0;

      // Validate pagination parameters
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: 'Invalid limit parameter. Must be between 1 and 100',
          },
        });
        return;
      }

      if (isNaN(offset) || offset < 0) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: 'Invalid offset parameter. Must be >= 0',
          },
        });
        return;
      }

      // Get activity feed from service
      const activity = await this.analyticsService.getRecentActivity(limit, offset);

      logger.info('AdminAnalyticsController.getRecentActivity: Activity retrieved', {
        limit,
        offset,
        returned: activity.events.length,
        total: activity.total,
      });

      res.status(200).json(activity);
    } catch (error) {
      logger.error('AdminAnalyticsController.getRecentActivity: Error', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve recent activity',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }
}
