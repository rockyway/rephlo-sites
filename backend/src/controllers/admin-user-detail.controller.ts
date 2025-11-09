/**
 * Admin User Detail Controller
 *
 * HTTP handlers for Unified User Detail API endpoints.
 * Provides 7 endpoints to retrieve comprehensive user information.
 *
 * Endpoints:
 * 1. GET /admin/users/:id/overview - User profile and current status
 * 2. GET /admin/users/:id/subscriptions - Subscription history and prorations
 * 3. GET /admin/users/:id/licenses - Perpetual licenses and device activations
 * 4. GET /admin/users/:id/credits - Credit balance, allocations, and usage
 * 5. GET /admin/users/:id/coupons - Coupon redemptions and fraud flags
 * 6. GET /admin/users/:id/payments - Stripe invoices and payment methods (PLACEHOLDER)
 * 7. GET /admin/users/:id/activity - Combined timeline of all user actions
 *
 * Authentication: Requires authMiddleware + requireAdmin
 * Audit Logging: Applied via auditLog middleware
 *
 * @module controllers/admin-user-detail.controller
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { AdminUserDetailService } from '../services/admin-user-detail.service';
import logger from '../utils/logger';
import {
  UserSubscriptionsQuery,
  UserLicensesQuery,
  UserCreditsQuery,
  UserCouponsQuery,
  UserPaymentsQuery,
  UserActivityQuery,
} from '../types/admin-user-detail.types';

@injectable()
export class AdminUserDetailController {
  constructor(
    @inject(AdminUserDetailService) private userDetailService: AdminUserDetailService
  ) {
    logger.debug('AdminUserDetailController: Initialized');
  }

  // ===========================================================================
  // Endpoint 1: User Overview
  // ===========================================================================

  /**
   * GET /admin/users/:id/overview
   * Get user profile and current status
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Response 200: UserOverviewResponse
   * Response 404: User not found
   * Response 500: Server error
   */
  async getUserOverview(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: 'User ID is required',
          },
        });
        return;
      }

      const overview = await this.userDetailService.getUserOverview(userId);

      logger.info('AdminUserDetailController.getUserOverview: Retrieved', {
        userId,
      });

      res.status(200).json(overview);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: error.message,
          },
        });
        return;
      }

      logger.error('AdminUserDetailController.getUserOverview: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user overview',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Endpoint 2: User Subscriptions
  // ===========================================================================

  /**
   * GET /admin/users/:id/subscriptions
   * Get user subscription history and proration events
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Query Parameters:
   * - limit: number (default: 50, max: 100)
   * - offset: number (default: 0)
   *
   * Response 200: UserSubscriptionsResponse
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getUserSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const query = req.query as UserSubscriptionsQuery;

      const limit = query.limit ? Number(query.limit) : 50;
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

      const subscriptions = await this.userDetailService.getUserSubscriptions(
        userId,
        limit,
        offset
      );

      logger.info('AdminUserDetailController.getUserSubscriptions: Retrieved', {
        userId,
        limit,
        offset,
        returned: subscriptions.subscriptions.length,
      });

      res.status(200).json(subscriptions);
    } catch (error) {
      logger.error('AdminUserDetailController.getUserSubscriptions: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user subscriptions',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Endpoint 3: User Licenses
  // ===========================================================================

  /**
   * GET /admin/users/:id/licenses
   * Get user perpetual licenses with device activations
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Query Parameters:
   * - limit: number (default: 50, max: 100)
   * - offset: number (default: 0)
   *
   * Response 200: UserLicensesResponse
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getUserLicenses(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const query = req.query as UserLicensesQuery;

      const limit = query.limit ? Number(query.limit) : 50;
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

      const licenses = await this.userDetailService.getUserLicenses(userId, limit, offset);

      logger.info('AdminUserDetailController.getUserLicenses: Retrieved', {
        userId,
        limit,
        offset,
        returned: licenses.licenses.length,
      });

      res.status(200).json(licenses);
    } catch (error) {
      logger.error('AdminUserDetailController.getUserLicenses: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user licenses',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Endpoint 4: User Credits
  // ===========================================================================

  /**
   * GET /admin/users/:id/credits
   * Get user credit balance, allocations, and usage
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Query Parameters:
   * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
   * - limit: number (default: 100, max: 200)
   * - offset: number (default: 0)
   *
   * Response 200: UserCreditsResponse
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getUserCredits(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const query = req.query as UserCreditsQuery;

      const period = query.period || '30d';
      const limit = query.limit ? Number(query.limit) : 100;
      const offset = query.offset ? Number(query.offset) : 0;

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

      // Validate pagination parameters
      if (isNaN(limit) || limit < 1 || limit > 200) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: 'Invalid limit parameter. Must be between 1 and 200',
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

      const credits = await this.userDetailService.getUserCredits(
        userId,
        period,
        limit,
        offset
      );

      logger.info('AdminUserDetailController.getUserCredits: Retrieved', {
        userId,
        period,
        limit,
        offset,
        balance: credits.balance.amount,
      });

      res.status(200).json(credits);
    } catch (error) {
      logger.error('AdminUserDetailController.getUserCredits: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user credits',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Endpoint 5: User Coupons
  // ===========================================================================

  /**
   * GET /admin/users/:id/coupons
   * Get user coupon redemptions and fraud flags
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Query Parameters:
   * - limit: number (default: 50, max: 100)
   * - offset: number (default: 0)
   *
   * Response 200: UserCouponsResponse
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getUserCoupons(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const query = req.query as UserCouponsQuery;

      const limit = query.limit ? Number(query.limit) : 50;
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

      const coupons = await this.userDetailService.getUserCoupons(userId, limit, offset);

      logger.info('AdminUserDetailController.getUserCoupons: Retrieved', {
        userId,
        limit,
        offset,
        returned: coupons.redemptions.length,
        fraudFlags: coupons.fraudFlags.length,
      });

      res.status(200).json(coupons);
    } catch (error) {
      logger.error('AdminUserDetailController.getUserCoupons: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user coupons',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Endpoint 6: User Payments (PLACEHOLDER)
  // ===========================================================================

  /**
   * GET /admin/users/:id/payments
   * Get user payment history (PLACEHOLDER - Not implemented)
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Query Parameters:
   * - limit: number (default: 50, max: 100)
   * - offset: number (default: 0)
   *
   * Response 200: UserPaymentsResponse (empty placeholder)
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getUserPayments(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const query = req.query as UserPaymentsQuery;

      const limit = query.limit ? Number(query.limit) : 50;
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

      const payments = await this.userDetailService.getUserPayments(userId, limit, offset);

      logger.info('AdminUserDetailController.getUserPayments: Retrieved (PLACEHOLDER)', {
        userId,
        limit,
        offset,
      });

      res.status(200).json(payments);
    } catch (error) {
      logger.error('AdminUserDetailController.getUserPayments: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user payments',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Endpoint 7: User Activity
  // ===========================================================================

  /**
   * GET /admin/users/:id/activity
   * Get combined timeline of all user activities
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Query Parameters:
   * - type: 'subscription' | 'license' | 'coupon' | 'credit' | 'device' | 'all' (default: 'all')
   * - limit: number (default: 50, max: 100)
   * - offset: number (default: 0)
   *
   * Response 200: UserActivityResponse
   * Response 400: Invalid parameters
   * Response 500: Server error
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const query = req.query as UserActivityQuery;

      const type = query.type || 'all';
      const limit = query.limit ? Number(query.limit) : 50;
      const offset = query.offset ? Number(query.offset) : 0;

      // Validate type parameter
      const validTypes = ['subscription', 'license', 'coupon', 'credit', 'device', 'all'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          error: {
            code: 'invalid_parameter',
            message: `Invalid type parameter. Must be one of: ${validTypes.join(', ')}`,
          },
        });
        return;
      }

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

      const activity = await this.userDetailService.getUserActivity(
        userId,
        type,
        limit,
        offset
      );

      logger.info('AdminUserDetailController.getUserActivity: Retrieved', {
        userId,
        type,
        limit,
        offset,
        returned: activity.activities.length,
      });

      res.status(200).json(activity);
    } catch (error) {
      logger.error('AdminUserDetailController.getUserActivity: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.id,
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve user activity',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : undefined,
        },
      });
    }
  }
}
