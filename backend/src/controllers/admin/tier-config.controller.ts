/**
 * Tier Configuration Controller (Plan 190)
 *
 * Handles HTTP requests for admin tier configuration management.
 * All endpoints require admin authentication.
 *
 * Endpoints:
 * - GET    /api/admin/tier-config                      - List all tier configurations
 * - GET    /api/admin/tier-config/:tierName            - Get specific tier configuration
 * - GET    /api/admin/tier-config/:tierName/history    - Get tier modification history
 * - POST   /api/admin/tier-config/:tierName/preview    - Preview update impact (dry-run)
 * - PATCH  /api/admin/tier-config/:tierName/credits    - Update tier credit allocation
 * - PATCH  /api/admin/tier-config/:tierName/price      - Update tier pricing
 */

import { Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { TierConfigService } from '../../services/tier-config.service';
import {
  UpdateTierCreditsRequestSchema,
  UpdateTierPriceRequestSchema,
  PreviewUpdateRequestSchema,
} from '@rephlo/shared-types';
import { ZodError } from 'zod';
import logger from '../../utils/logger';

/**
 * TierConfigController
 *
 * Handles admin tier configuration operations with proper validation,
 * error handling, and audit trail integration.
 */
@injectable()
export class TierConfigController {
  constructor(private tierConfigService: TierConfigService) {}

  /**
   * GET /api/admin/tier-config
   * List all tier configurations
   */
  async listAll(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('TierConfigController.listAll: Fetching all tier configs');

      const tiers = await this.tierConfigService.getAllTierConfigs();

      res.json({
        success: true,
        data: tiers,
      });
    } catch (error: any) {
      logger.error('TierConfigController.listAll: Error', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TIER_CONFIG_FETCH_ERROR',
          message: error.message || 'Failed to fetch tier configurations',
        },
      });
    }
  }

  /**
   * GET /api/admin/tier-config/:tierName
   * Get specific tier configuration with details
   */
  async getByName(req: Request, res: Response): Promise<void> {
    try {
      const { tierName } = req.params;

      logger.info('TierConfigController.getByName: Fetching tier config', { tierName });

      const tier = await this.tierConfigService.getTierConfigByName(tierName);

      if (!tier) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TIER_NOT_FOUND',
            message: `Tier configuration not found: ${tierName}`,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: tier,
      });
    } catch (error: any) {
      logger.error('TierConfigController.getByName: Error', {
        tierName: req.params.tierName,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TIER_CONFIG_FETCH_ERROR',
          message: error.message || 'Failed to fetch tier configuration',
        },
      });
    }
  }

  /**
   * GET /api/admin/tier-config/:tierName/history
   * Get tier modification history with audit trail
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { tierName } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      logger.info('TierConfigController.getHistory: Fetching tier history', {
        tierName,
        limit,
      });

      const history = await this.tierConfigService.getTierConfigHistory(tierName, limit);

      res.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          limit,
        },
      });
    } catch (error: any) {
      logger.error('TierConfigController.getHistory: Error', {
        tierName: req.params.tierName,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TIER_HISTORY_FETCH_ERROR',
          message: error.message || 'Failed to fetch tier configuration history',
        },
      });
    }
  }

  /**
   * POST /api/admin/tier-config/:tierName/preview
   * Preview update impact without applying changes (dry-run)
   */
  async previewUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { tierName } = req.params;

      logger.info('TierConfigController.previewUpdate: Previewing impact', {
        tierName,
        request: req.body,
      });

      // Validate request body
      const validatedRequest = PreviewUpdateRequestSchema.parse(req.body);

      // Calculate impact
      const impact = await this.tierConfigService.previewCreditUpdate(
        tierName,
        validatedRequest
      );

      res.json({
        success: true,
        data: impact,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        logger.warn('TierConfigController.previewUpdate: Validation error', {
          errors: error.errors,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }

      logger.error('TierConfigController.previewUpdate: Error', {
        tierName: req.params.tierName,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PREVIEW_ERROR',
          message: error.message || 'Failed to preview update impact',
        },
      });
    }
  }

  /**
   * PATCH /api/admin/tier-config/:tierName/credits
   * Update tier credit allocation with audit trail
   */
  async updateCredits(req: Request, res: Response): Promise<void> {
    try {
      const { tierName } = req.params;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!adminUserId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin user ID not found in request',
          },
        });
        return;
      }

      logger.info('TierConfigController.updateCredits: Updating tier credits', {
        tierName,
        request: req.body,
        adminUserId,
      });

      // Validate request body
      const validatedRequest = UpdateTierCreditsRequestSchema.parse(req.body);

      // Update tier credits
      const updatedTier = await this.tierConfigService.updateTierCredits(
        tierName,
        validatedRequest,
        adminUserId
      );

      logger.info('TierConfigController.updateCredits: Successfully updated', {
        tierName,
        newCredits: validatedRequest.newCredits,
        version: updatedTier.configVersion,
      });

      res.json({
        success: true,
        data: updatedTier,
        message: `Tier credits updated successfully for ${tierName}`,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        logger.warn('TierConfigController.updateCredits: Validation error', {
          errors: error.errors,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }

      logger.error('TierConfigController.updateCredits: Error', {
        tierName: req.params.tierName,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TIER_UPDATE_ERROR',
          message: error.message || 'Failed to update tier credits',
        },
      });
    }
  }

  /**
   * PATCH /api/admin/tier-config/:tierName/price
   * Update tier pricing with audit trail
   */
  async updatePrice(req: Request, res: Response): Promise<void> {
    try {
      const { tierName } = req.params;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!adminUserId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin user ID not found in request',
          },
        });
        return;
      }

      logger.info('TierConfigController.updatePrice: Updating tier pricing', {
        tierName,
        request: req.body,
        adminUserId,
      });

      // Validate request body
      const validatedRequest = UpdateTierPriceRequestSchema.parse(req.body);

      // Update tier pricing
      const updatedTier = await this.tierConfigService.updateTierPrice(
        tierName,
        validatedRequest,
        adminUserId
      );

      logger.info('TierConfigController.updatePrice: Successfully updated', {
        tierName,
        newMonthlyPrice: validatedRequest.newMonthlyPrice,
        newAnnualPrice: validatedRequest.newAnnualPrice,
        version: updatedTier.configVersion,
      });

      res.json({
        success: true,
        data: updatedTier,
        message: `Tier pricing updated successfully for ${tierName}`,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        logger.warn('TierConfigController.updatePrice: Validation error', {
          errors: error.errors,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }

      logger.error('TierConfigController.updatePrice: Error', {
        tierName: req.params.tierName,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TIER_PRICE_UPDATE_ERROR',
          message: error.message || 'Failed to update tier pricing',
        },
      });
    }
  }
}
