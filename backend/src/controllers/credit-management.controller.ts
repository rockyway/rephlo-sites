/**
 * Credit Management Controller (Plan 109)
 *
 * Handles HTTP endpoints for credit allocation, rollover, and balance queries.
 * Integrates with Plan 112's token-credit system.
 *
 * Endpoints:
 * - POST   /admin/credits/allocate                 - Allocate subscription credits
 * - POST   /admin/credits/process-monthly          - Process monthly allocations (cron)
 * - POST   /admin/credits/grant-bonus              - Grant bonus credits
 * - POST   /admin/credits/deduct                   - Deduct credits manually
 * - GET    /admin/credits/rollover/:userId         - Calculate rollover
 * - POST   /admin/credits/rollover/:userId/apply   - Apply rollover
 * - POST   /admin/credits/sync/:userId             - Sync with token-credit system
 * - GET    /admin/credits/reconcile/:userId        - Reconcile balance
 * - GET    /admin/credits/balance/:userId          - Get credit balance
 * - GET    /admin/credits/history/:userId          - Get allocation history
 * - GET    /admin/credits/usage/:userId            - Get usage by period
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { CreditManagementService } from '../services/credit-management.service';
import {
  badRequestError,
  validationError,
} from '../middleware/error.middleware';

// =============================================================================
// Validation Schemas
// =============================================================================

const allocateCreditsSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  subscriptionId: z.string().uuid('Subscription ID must be a valid UUID'),
});

const grantBonusCreditsSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  amount: z.number().int().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  expiresAt: z.coerce.date().optional(),
});

const deductCreditsSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  amount: z.number().int().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
});

const usageByPeriodSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// =============================================================================
// Credit Management Controller Class
// =============================================================================

@injectable()
export class CreditManagementController {
  constructor(
    @inject('CreditManagementService')
    private creditService: CreditManagementService
  ) {
    logger.debug('CreditManagementController: Initialized');
  }

  // ===========================================================================
  // Credit Allocation Endpoints
  // ===========================================================================

  /**
   * POST /admin/credits/allocate
   * Allocate subscription credits to a user
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   userId: string,
   *   subscriptionId: string
   * }
   */
  async allocateSubscriptionCredits(req: Request, res: Response): Promise<void> {
    logger.info('CreditManagementController.allocateSubscriptionCredits', {
      body: req.body,
    });

    // Validate request body
    const parseResult = allocateCreditsSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Credit allocation validation failed', errors);
    }

    const { userId, subscriptionId } = parseResult.data;

    try {
      const allocation = await this.creditService.allocateSubscriptionCredits(
        userId,
        subscriptionId
      );

      // Standard response format
      res.status(201).json({
        status: 'success',
        data: allocation,
        meta: {
          message: 'Credits allocated successfully',
        },
      });
    } catch (error) {
      logger.error('CreditManagementController.allocateSubscriptionCredits: Error', {
        error,
      });
      throw error;
    }
  }

  /**
   * POST /admin/credits/process-monthly
   * Process monthly credit allocations for all active subscriptions
   *
   * Requires: Admin authentication
   *
   * This endpoint is typically called by a cron job
   */
  async processMonthlyAllocations(_req: Request, res: Response): Promise<void> {
    logger.info('CreditManagementController.processMonthlyAllocations');

    try {
      const summary = await this.creditService.processMonthlyAllocations();

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: summary,
        meta: {
          message: `Monthly allocations processed: ${summary.totalUsers} users, ${summary.totalAllocated} credits`,
        },
      });
    } catch (error) {
      logger.error('CreditManagementController.processMonthlyAllocations: Error', {
        error,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Manual Adjustment Endpoints
  // ===========================================================================

  /**
   * POST /admin/credits/grant-bonus
   * Grant bonus credits to a user
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   userId: string,
   *   amount: number,
   *   reason: string,
   *   expiresAt?: Date
   * }
   */
  async grantBonusCredits(req: Request, res: Response): Promise<void> {
    logger.info('CreditManagementController.grantBonusCredits', {
      body: req.body,
    });

    // Validate request body
    const parseResult = grantBonusCreditsSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Bonus credit validation failed', errors);
    }

    const { userId, amount, reason, expiresAt } = parseResult.data;

    try {
      const allocation = await this.creditService.grantBonusCredits(
        userId,
        amount,
        reason,
        expiresAt
      );

      // Standard response format
      res.status(201).json({
        status: 'success',
        data: allocation,
        meta: {
          message: `${amount} bonus credits granted`,
        },
      });
    } catch (error) {
      logger.error('CreditManagementController.grantBonusCredits: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/credits/deduct
   * Manually deduct credits from a user
   *
   * Requires: Admin authentication
   *
   * Body: {
   *   userId: string,
   *   amount: number,
   *   reason: string
   * }
   */
  async deductCreditsManually(req: Request, res: Response): Promise<void> {
    logger.info('CreditManagementController.deductCreditsManually', {
      body: req.body,
    });

    // Validate request body
    const parseResult = deductCreditsSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Credit deduction validation failed', errors);
    }

    const { userId, amount, reason } = parseResult.data;

    try {
      await this.creditService.deductCreditsManually(userId, amount, reason);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: { message: `${amount} credits deducted` },
      });
    } catch (error) {
      logger.error('CreditManagementController.deductCreditsManually: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Rollover Endpoints
  // ===========================================================================

  /**
   * GET /admin/credits/rollover/:userId
   * Calculate credit rollover for a user
   *
   * Requires: Admin authentication
   */
  async calculateRollover(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('CreditManagementController.calculateRollover', {
      userId,
    });

    try {
      const rolloverCalculation = await this.creditService.calculateRollover(userId);

      res.status(200).json({
        success: true,
        data: rolloverCalculation,
      });
    } catch (error) {
      logger.error('CreditManagementController.calculateRollover: Error', { error });
      throw error;
    }
  }

  /**
   * POST /admin/credits/rollover/:userId/apply
   * Apply credit rollover to user balance
   *
   * Requires: Admin authentication
   *
   * Body: { rolloverAmount: number }
   */
  async applyRollover(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { rolloverAmount } = req.body;

    logger.info('CreditManagementController.applyRollover', {
      userId,
      rolloverAmount,
    });

    if (typeof rolloverAmount !== 'number' || rolloverAmount < 0) {
      throw badRequestError('Invalid rollover amount');
    }

    try {
      await this.creditService.applyRollover(userId, rolloverAmount);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: { message: `Rollover of ${rolloverAmount} credits applied` },
      });
    } catch (error) {
      logger.error('CreditManagementController.applyRollover: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Integration with Plan 112 Endpoints
  // ===========================================================================

  /**
   * POST /admin/credits/sync/:userId
   * Sync credits with Plan 112's token-credit system
   *
   * Requires: Admin authentication
   */
  async syncWithTokenCreditSystem(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('CreditManagementController.syncWithTokenCreditSystem', {
      userId,
    });

    try {
      await this.creditService.syncWithTokenCreditSystem(userId);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: { message: 'Credits synced with token-credit system' },
      });
    } catch (error) {
      logger.error('CreditManagementController.syncWithTokenCreditSystem: Error', {
        error,
      });
      throw error;
    }
  }

  /**
   * GET /admin/credits/reconcile/:userId
   * Reconcile credit balance between Plan 109 and Plan 112
   *
   * Requires: Admin authentication
   */
  async reconcileCreditBalance(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('CreditManagementController.reconcileCreditBalance', {
      userId,
    });

    try {
      const reconciliation = await this.creditService.reconcileCreditBalance(userId);

      res.status(200).json({
        success: true,
        data: reconciliation,
        message: reconciliation.reconciled
          ? 'Balances are reconciled'
          : `Difference found: ${reconciliation.difference} credits`,
      });
    } catch (error) {
      logger.error('CreditManagementController.reconcileCreditBalance: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Query Endpoints
  // ===========================================================================

  /**
   * GET /admin/credits/balance/:userId
   * Get credit balance for a user
   *
   * Requires: Admin authentication
   */
  async getCreditBalance(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('CreditManagementController.getCreditBalance', {
      userId,
    });

    try {
      const balance = await this.creditService.getCreditBalance(userId);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      logger.error('CreditManagementController.getCreditBalance: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/credits/history/:userId
   * Get credit allocation history for a user
   *
   * Requires: Admin authentication
   */
  async getCreditAllocationHistory(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('CreditManagementController.getCreditAllocationHistory', {
      userId,
    });

    try {
      const history = await this.creditService.getCreditAllocationHistory(userId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('CreditManagementController.getCreditAllocationHistory: Error', {
        error,
      });
      throw error;
    }
  }

  /**
   * GET /admin/credits/usage/:userId
   * Get credit usage by period
   *
   * Requires: Admin authentication
   *
   * Query: { startDate: Date, endDate: Date }
   */
  async getCreditUsageByPeriod(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    logger.info('CreditManagementController.getCreditUsageByPeriod', {
      userId,
      query: req.query,
    });

    // Validate query parameters
    const parseResult = usageByPeriodSchema.safeParse(req.query);

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

    const { startDate, endDate } = parseResult.data;

    try {
      const usage = await this.creditService.getCreditUsageByPeriod(
        userId,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: usage,
      });
    } catch (error) {
      logger.error('CreditManagementController.getCreditUsageByPeriod: Error', { error });
      throw error;
    }
  }
}
