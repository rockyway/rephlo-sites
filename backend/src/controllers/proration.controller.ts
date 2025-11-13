/**
 * Proration Controller (Plan 110)
 *
 * Handles HTTP requests for subscription proration endpoints.
 * Integrates with ProrationService for tier change calculations.
 *
 * Endpoints:
 * - POST /api/subscriptions/:id/proration-preview         - Preview tier change proration
 * - POST /api/subscriptions/:id/upgrade-with-proration    - Apply tier upgrade with proration
 * - POST /api/subscriptions/:id/downgrade-with-proration  - Apply tier downgrade with proration
 * - GET /api/subscriptions/:id/proration-history          - Get proration history
 * - GET /api/admin/prorations                             - List all proration events (admin)
 * - POST /api/admin/prorations/:id/reverse                - Reverse proration (admin)
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { ProrationService } from '../services/proration.service';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { mapProrationEventToApiType } from '../utils/typeMappers';

@injectable()
export class ProrationController {
  constructor(
    @inject(ProrationService)
    private prorationService: ProrationService
  ) {
    logger.debug('ProrationController: Initialized');
  }

  /**
   * POST /api/subscriptions/:id/proration-preview
   * Preview tier change proration calculation
   */
  async previewProration(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newTier } = req.body;

    if (!newTier) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'New tier is required',
        },
      });
      return;
    }

    try {
      const preview = await this.prorationService.previewTierChange(id, newTier);

      res.status(200).json({
        subscription_id: id,
        from_tier: preview.calculation.fromTier,
        to_tier: preview.calculation.toTier,
        days_remaining: preview.calculation.daysRemaining,
        days_in_cycle: preview.calculation.daysInCycle,
        unused_credit_value_usd: preview.calculation.unusedCreditValueUsd,
        new_tier_prorated_cost_usd: preview.calculation.newTierProratedCostUsd,
        net_charge_usd: preview.calculation.netChargeUsd,
        charge_today: preview.chargeToday,
        next_billing_amount: preview.nextBillingAmount,
        next_billing_date: preview.nextBillingDate.toISOString(),
        message: preview.message,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'subscription_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to preview proration', { subscriptionId: id, newTier, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to calculate proration preview',
          },
        });
      }
    }
  }

  /**
   * POST /api/subscriptions/:id/upgrade-with-proration
   * Apply tier upgrade with proration
   */
  async upgradeWithProration(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newTier } = req.body;

    if (!newTier) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'New tier is required',
        },
      });
      return;
    }

    try {
      const prorationEvent = await this.prorationService.applyTierUpgrade(id, newTier);

      res.status(200).json({
        proration_event_id: prorationEvent.id,
        subscription_id: id,
        from_tier: prorationEvent.fromTier,
        to_tier: prorationEvent.toTier,
        net_charge_usd: prorationEvent.netChargeUsd,
        status: prorationEvent.status,
        effective_date: prorationEvent.effectiveDate.toISOString(),
        message: 'Tier upgrade applied successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'subscription_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to apply tier upgrade', { subscriptionId: id, newTier, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to apply tier upgrade',
          },
        });
      }
    }
  }

  /**
   * POST /api/subscriptions/:id/downgrade-with-proration
   * Apply tier downgrade with proration
   */
  async downgradeWithProration(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newTier } = req.body;

    if (!newTier) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'New tier is required',
        },
      });
      return;
    }

    try {
      const prorationEvent = await this.prorationService.applyTierDowngrade(id, newTier);

      res.status(200).json({
        proration_event_id: prorationEvent.id,
        subscription_id: id,
        from_tier: prorationEvent.fromTier,
        to_tier: prorationEvent.toTier,
        net_charge_usd: prorationEvent.netChargeUsd,
        credit_amount: Math.abs(Math.min(0, Number(prorationEvent.netChargeUsd))),
        status: prorationEvent.status,
        effective_date: prorationEvent.effectiveDate.toISOString(),
        message: 'Tier downgrade applied successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'subscription_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to apply tier downgrade', { subscriptionId: id, newTier, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to apply tier downgrade',
          },
        });
      }
    }
  }

  /**
   * GET /api/subscriptions/:id/proration-history
   * Get proration history for a subscription
   */
  async getProrationHistory(req: Request, res: Response): Promise<void> {
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
      const history = await this.prorationService.getProrationHistory(userId);

      res.status(200).json({
        user_id: userId,
        proration_events: history.map((event) => ({
          id: event.id,
          subscription_id: event.subscriptionId,
          from_tier: event.fromTier,
          to_tier: event.toTier,
          change_type: event.changeType,
          net_charge_usd: event.netChargeUsd,
          status: event.status,
          effective_date: event.effectiveDate.toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Failed to get proration history', { userId, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve proration history',
        },
      });
    }
  }

  /**
   * GET /admin/prorations
   * List all proration events with filters (admin only)
   */
  async listAllProrations(req: Request, res: Response): Promise<void> {
    try {
      const { changeType, status, search, page, limit } = req.query;

      const result = await this.prorationService.getAllProrations({
        changeType: changeType as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        status: 'success',
        data: {
          data: result.data.map((event) => mapProrationEventToApiType(event as any)),
          total: result.total,
          totalPages: result.totalPages,
          page: parseInt((page as string) || '1', 10),
          limit: parseInt((limit as string) || '50', 10),
        },
      });
    } catch (error) {
      logger.error('Failed to list proration events', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve proration events',
        },
      });
    }
  }

  /**
   * GET /admin/prorations/stats
   * Get proration statistics (admin only)
   */
  async getProrationStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.prorationService.getProrationStats();

      res.status(200).json({
        status: 'success',
        data: {
          totalProrations: stats.totalProrations,
          netRevenue: stats.netRevenue,
          avgNetCharge: stats.avgNetCharge,
          pendingProrations: stats.pendingProrations,
        },
      });
    } catch (error) {
      logger.error('Failed to get proration stats', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve proration statistics',
        },
      });
    }
  }

  /**
   * POST /admin/prorations/:id/reverse
   * Reverse a proration (admin only)
   */
  async reverseProration(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Reason is required for proration reversal',
        },
      });
      return;
    }

    try {
      const adminUserId = (req as any).userId;
      const reversedEvent = await this.prorationService.reverseProration(id, reason, adminUserId);

      // Standard response format: move message to meta
      res.status(200).json({
        status: 'success',
        data: {
          id: reversedEvent.id,
          originalProrationId: id,
          userId: reversedEvent.userId,
          subscriptionId: reversedEvent.subscriptionId,
          fromTier: reversedEvent.fromTier,
          toTier: reversedEvent.toTier,
          netCharge: Number(reversedEvent.netChargeUsd),
          status: reversedEvent.status,
          effectiveDate: reversedEvent.effectiveDate.toISOString(),
          reason,
        },
        meta: {
          message: 'Proration reversed successfully',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'proration_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to reverse proration', { prorationId: id, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to reverse proration',
          },
        });
      }
    }
  }

  /**
   * GET /admin/prorations/:id/calculation
   * Get detailed calculation breakdown for a proration event (admin only)
   */
  async getCalculationBreakdown(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const breakdown = await this.prorationService.getCalculationBreakdown(id);

      res.status(200).json({
        status: 'success',
        data: breakdown,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'proration_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to get calculation breakdown', { prorationId: id, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to retrieve calculation breakdown',
          },
        });
      }
    }
  }
}
