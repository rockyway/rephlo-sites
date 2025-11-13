/**
 * Migration Controller (Plan 110)
 *
 * Handles HTTP requests for perpetual ↔ subscription migration endpoints.
 * Integrates with MigrationService for trade-in value calculations and conversions.
 *
 * Endpoints:
 * - POST /api/migrations/perpetual-to-subscription    - Migrate from perpetual to subscription
 * - POST /api/migrations/subscription-to-perpetual    - Migrate from subscription to perpetual
 * - GET /api/migrations/trade-in-value/:licenseId     - Calculate trade-in value
 * - GET /api/migrations/eligibility                   - Check migration eligibility
 * - GET /api/migrations/history                       - Get migration history
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { MigrationService } from '../services/migration.service';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

@injectable()
export class MigrationController {
  constructor(
    @inject(MigrationService)
    private migrationService: MigrationService
  ) {
    logger.debug('MigrationController: Initialized');
  }

  /**
   * POST /api/migrations/perpetual-to-subscription
   * Migrate from perpetual license to subscription
   */
  async migratePerpetualToSubscription(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;
    const { targetTier, billingCycle } = req.body;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!targetTier) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Target tier is required',
        },
      });
      return;
    }

    try {
      // Validate migration eligibility first
      const validation = await this.migrationService.validateMigrationEligibility(
        userId,
        'perpetual_to_subscription'
      );

      if (!validation.isValid) {
        res.status(400).json({
          error: {
            code: 'migration_not_allowed',
            message: 'Migration is not allowed',
            details: validation.errors,
          },
        });
        return;
      }

      const result = await this.migrationService.migratePerpetualToSubscription(
        userId,
        targetTier,
        billingCycle || 'monthly'
      );

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          license_id: result.perpetualLicense?.id,
          license_key: result.perpetualLicense?.licenseKey,
          trade_in_credit_usd: result.tradeInCredit,
          target_tier: targetTier,
          billing_cycle: billingCycle || 'monthly',
        },
        meta: {
          message: result.message,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: error.message,
          },
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'validation_error',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to migrate perpetual to subscription', { userId, targetTier, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to complete migration',
          },
        });
      }
    }
  }

  /**
   * POST /api/migrations/subscription-to-perpetual
   * Migrate from subscription to perpetual license
   */
  async migrateSubscriptionToPerpetual(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;
    const { subscriptionId } = req.body;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!subscriptionId) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Subscription ID is required',
        },
      });
      return;
    }

    try {
      // Validate migration eligibility first
      const validation = await this.migrationService.validateMigrationEligibility(
        userId,
        'subscription_to_perpetual'
      );

      if (!validation.isValid) {
        res.status(400).json({
          error: {
            code: 'migration_not_allowed',
            message: 'Migration is not allowed',
            details: validation.errors,
          },
        });
        return;
      }

      // Calculate refund amount
      const refundAmount = await this.migrationService.refundUnusedSubscriptionTime(subscriptionId);

      // Migrate subscription to perpetual
      await this.migrationService.migrateSubscriptionToPerpetual(userId, subscriptionId);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          subscription_id: subscriptionId,
          refund_amount_usd: refundAmount,
        },
        meta: {
          message: `Successfully migrated to perpetual license. ${
            refundAmount > 0
              ? `$${refundAmount.toFixed(2)} refund will be processed.`
              : 'No refund available (outside 30-day window).'
          }`,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'subscription_not_found',
            message: error.message,
          },
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'validation_error',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to migrate subscription to perpetual', {
          userId,
          subscriptionId,
          error,
        });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to complete migration',
          },
        });
      }
    }
  }

  /**
   * GET /api/migrations/trade-in-value/:licenseId
   * Calculate trade-in value for a perpetual license
   */
  async getTradeInValue(req: Request, res: Response): Promise<void> {
    const { licenseId } = req.params;

    try {
      const tradeInValue = await this.migrationService.calculatePerpetualTradeInValue(licenseId);

      res.status(200).json({
        license_id: licenseId,
        trade_in_value_usd: tradeInValue,
        message: `Your perpetual license has a trade-in value of $${tradeInValue.toFixed(2)}`,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to calculate trade-in value', { licenseId, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to calculate trade-in value',
          },
        });
      }
    }
  }

  /**
   * GET /api/migrations/eligibility
   * Check if user is eligible for migration
   */
  async checkMigrationEligibility(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;
    const { direction } = req.query;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (
      !direction ||
      (direction !== 'perpetual_to_subscription' && direction !== 'subscription_to_perpetual')
    ) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message:
            'Migration direction is required (perpetual_to_subscription or subscription_to_perpetual)',
        },
      });
      return;
    }

    try {
      const validation = await this.migrationService.validateMigrationEligibility(
        userId,
        direction as 'perpetual_to_subscription' | 'subscription_to_perpetual'
      );

      res.status(200).json({
        user_id: userId,
        migration_direction: direction,
        is_eligible: validation.isValid,
        errors: validation.errors,
      });
    } catch (error) {
      logger.error('Failed to check migration eligibility', { userId, direction, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to check migration eligibility',
        },
      });
    }
  }

  /**
   * GET /api/migrations/history
   * Get migration history for the current user
   */
  async getMigrationHistory(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      const history = await this.migrationService.getMigrationHistory(userId);

      res.status(200).json({
        user_id: userId,
        migration_history: history,
      });
    } catch (error) {
      logger.error('Failed to get migration history', { userId, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve migration history',
        },
      });
    }
  }
}
