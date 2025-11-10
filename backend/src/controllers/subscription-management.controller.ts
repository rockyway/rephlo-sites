/**
 * Subscription Management Controller (Plan 109)
 *
 * Handles HTTP endpoints for subscription lifecycle management.
 * Admin endpoints require authentication with admin role.
 *
 * Endpoints:
 * - POST   /admin/subscriptions                        - Create subscription
 * - POST   /admin/subscriptions/:id/upgrade            - Upgrade tier
 * - POST   /admin/subscriptions/:id/downgrade          - Downgrade tier
 * - POST   /admin/subscriptions/:id/cancel             - Cancel subscription
 * - POST   /admin/subscriptions/:id/reactivate         - Reactivate subscription
 * - POST   /admin/subscriptions/:id/allocate-credits   - Allocate monthly credits
 * - POST   /admin/subscriptions/:id/rollover           - Handle credit rollover
 * - GET    /admin/subscriptions/:id/features           - Check feature access
 * - GET    /admin/subscriptions/:id/limits             - Get tier limits
 * - GET    /admin/subscriptions/user/:userId           - Get user's active subscription
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { SubscriptionManagementService } from '../services/subscription-management.service';
import {
  notFoundError,
  badRequestError,
  validationError,
} from '../middleware/error.middleware';

// =============================================================================
// Validation Schemas
// =============================================================================

const createSubscriptionSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  tier: z.enum(['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max', 'perpetual']),
  billingCycle: z.enum(['monthly', 'annual']),
  startTrial: z.boolean().optional(),
  trialDays: z.number().int().min(1).max(90).optional(),
});

const upgradeTierSchema = z.object({
  newTier: z.enum(['pro', 'pro_max', 'enterprise_pro', 'enterprise_max']),
});

const downgradeTierSchema = z.object({
  newTier: z.enum(['free', 'pro', 'pro_max', 'enterprise_pro']),
});

const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});

const featureAccessSchema = z.object({
  feature: z.string().min(1, 'Feature name is required'),
});

// =============================================================================
// Subscription Management Controller Class
// =============================================================================

@injectable()
export class SubscriptionManagementController {
  constructor(
    @inject('SubscriptionManagementService')
    private subscriptionService: SubscriptionManagementService
  ) {
    logger.debug('SubscriptionManagementController: Initialized');
  }

  // ===========================================================================
  // Subscription CRUD Endpoints
  // ===========================================================================

  /**
   * POST /admin/subscriptions
   * Create a new subscription for a user
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   userId: string,
   *   tier: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual',
   *   billingCycle: 'monthly' | 'annual',
   *   startTrial?: boolean,
   *   trialDays?: number
   * }
   */
  async createSubscription(req: Request, res: Response): Promise<void> {
    logger.info('SubscriptionManagementController.createSubscription', {
      body: req.body,
    });

    // Validate request body
    const parseResult = createSubscriptionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Subscription validation failed', errors);
    }

    const data = parseResult.data;

    try {
      const subscription = await this.subscriptionService.createSubscription(data);

      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.createSubscription: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/subscriptions/:id/upgrade
   * Upgrade subscription to higher tier
   *
   * Requires: Admin authentication
   *
   * Body: { newTier: string }
   */
  async upgradeTier(req: Request, res: Response): Promise<void> {
    const { id: subscriptionId } = req.params;

    logger.info('SubscriptionManagementController.upgradeTier', {
      subscriptionId,
      body: req.body,
    });

    // Validate request body
    const parseResult = upgradeTierSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Upgrade validation failed', errors);
    }

    const { newTier } = parseResult.data;

    try {
      const subscription = await this.subscriptionService.upgradeTier(subscriptionId, newTier);

      res.status(200).json({
        success: true,
        data: subscription,
        message: `Subscription upgraded to ${newTier}`,
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.upgradeTier: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/subscriptions/:id/downgrade
   * Downgrade subscription to lower tier
   *
   * Requires: Admin authentication
   *
   * Body: { newTier: string }
   */
  async downgradeTier(req: Request, res: Response): Promise<void> {
    const { id: subscriptionId } = req.params;

    logger.info('SubscriptionManagementController.downgradeTier', {
      subscriptionId,
      body: req.body,
    });

    // Validate request body
    const parseResult = downgradeTierSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Downgrade validation failed', errors);
    }

    const { newTier } = parseResult.data;

    try {
      const subscription = await this.subscriptionService.downgradeTier(
        subscriptionId,
        newTier
      );

      res.status(200).json({
        success: true,
        data: subscription,
        message: `Subscription downgraded to ${newTier}`,
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.downgradeTier: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/subscriptions/:id/cancel
   * Cancel subscription
   *
   * Requires: Admin authentication
   *
   * Body: { cancelAtPeriodEnd?: boolean }
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const { id: subscriptionId } = req.params;

    logger.info('SubscriptionManagementController.cancelSubscription', {
      subscriptionId,
      body: req.body,
    });

    // Validate request body
    const parseResult = cancelSubscriptionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Cancellation validation failed', errors);
    }

    const { cancelAtPeriodEnd } = parseResult.data;

    try {
      const subscription = await this.subscriptionService.cancelSubscription(
        subscriptionId,
        cancelAtPeriodEnd
      );

      res.status(200).json({
        success: true,
        data: subscription,
        message: cancelAtPeriodEnd
          ? 'Subscription will be cancelled at period end'
          : 'Subscription cancelled immediately',
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.cancelSubscription: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/subscriptions/:id/reactivate
   * Reactivate a cancelled subscription
   *
   * Requires: Admin authentication
   */
  async reactivateSubscription(req: Request, res: Response): Promise<void> {
    const { id: subscriptionId } = req.params;

    logger.info('SubscriptionManagementController.reactivateSubscription', {
      subscriptionId,
    });

    try {
      const subscription = await this.subscriptionService.reactivateSubscription(
        subscriptionId
      );

      res.status(200).json({
        success: true,
        data: subscription,
        message: 'Subscription reactivated successfully',
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.reactivateSubscription: Error', {
        error,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Credit Management Endpoints
  // ===========================================================================

  /**
   * POST /admin/subscriptions/:id/allocate-credits
   * Allocate monthly credits for a subscription
   *
   * Requires: Admin authentication
   */
  async allocateMonthlyCredits(req: Request, res: Response): Promise<void> {
    const { id: subscriptionId } = req.params;
    const { userId } = req.body;

    logger.info('SubscriptionManagementController.allocateMonthlyCredits', {
      subscriptionId,
      userId,
    });

    if (!userId) {
      throw badRequestError('User ID is required in request body');
    }

    try {
      const allocation = await this.subscriptionService.allocateMonthlyCredits(
        userId,
        subscriptionId
      );

      res.status(200).json({
        success: true,
        data: allocation,
        message: 'Monthly credits allocated successfully',
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.allocateMonthlyCredits: Error', {
        error,
      });
      throw error;
    }
  }

  /**
   * POST /admin/subscriptions/:id/rollover
   * Handle credit rollover for a user
   *
   * Requires: Admin authentication
   */
  async handleRollover(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;

    logger.info('SubscriptionManagementController.handleRollover', {
      userId,
    });

    if (!userId) {
      throw badRequestError('User ID is required in request body');
    }

    try {
      await this.subscriptionService.handleRollover(userId);

      res.status(200).json({
        success: true,
        message: 'Credit rollover processed successfully',
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.handleRollover: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Feature Access Endpoints
  // ===========================================================================

  /**
   * GET /admin/subscriptions/:id/features
   * Check if user can access a specific feature
   *
   * Requires: Admin authentication
   *
   * Query: { feature: string }
   */
  async checkFeatureAccess(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { feature } = req.query;

    logger.info('SubscriptionManagementController.checkFeatureAccess', {
      userId,
      feature,
    });

    // Validate query parameter
    const parseResult = featureAccessSchema.safeParse({ feature });

    if (!parseResult.success) {
      throw validationError('Feature name is required');
    }

    try {
      const canAccess = await this.subscriptionService.canAccessFeature(
        userId,
        parseResult.data.feature
      );

      res.status(200).json({
        success: true,
        data: {
          userId,
          feature: parseResult.data.feature,
          canAccess,
        },
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.checkFeatureAccess: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/subscriptions/:id/limits
   * Get tier limits for a user
   *
   * Requires: Admin authentication
   */
  async getTierLimits(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('SubscriptionManagementController.getTierLimits', {
      userId,
    });

    try {
      const limits = await this.subscriptionService.getTierLimits(userId);

      res.status(200).json({
        success: true,
        data: limits,
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.getTierLimits: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Query Endpoints
  // ===========================================================================

  /**
   * GET /admin/subscriptions/user/:userId
   * Get active subscription for a user
   *
   * Requires: Admin authentication
   */
  async getActiveSubscription(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('SubscriptionManagementController.getActiveSubscription', {
      userId,
    });

    try {
      const subscription = await this.subscriptionService.getActiveSubscription(userId);

      if (!subscription) {
        throw notFoundError('Active subscription');
      }

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.getActiveSubscription: Error', {
        error,
      });
      throw error;
    }
  }

  /**
   * GET /admin/subscriptions/all
   * List all subscriptions with pagination and filters
   *
   * Requires: Admin authentication
   *
   * Query: { page?: number, limit?: number, status?: string, tier?: string }
   */
  async listAllSubscriptions(req: Request, res: Response): Promise<void> {
    const { page, limit, status, tier } = req.query;

    logger.info('SubscriptionManagementController.listAllSubscriptions', {
      query: req.query,
    });

    try {
      const filters = {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        status: status as string | undefined,
        tier: tier as string | undefined,
      };

      const result = await this.subscriptionService.listAllSubscriptions(filters);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.listAllSubscriptions: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/subscriptions/stats
   * Get subscription statistics
   *
   * Requires: Admin authentication
   */
  async getSubscriptionStats(_req: Request, res: Response): Promise<void> {
    logger.info('SubscriptionManagementController.getSubscriptionStats');

    try {
      const stats = await this.subscriptionService.getSubscriptionStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('SubscriptionManagementController.getSubscriptionStats: Error', { error });
      throw error;
    }
  }
}
