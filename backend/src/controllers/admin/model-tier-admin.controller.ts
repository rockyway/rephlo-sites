/**
 * Model Tier Admin Controller
 *
 * Handles HTTP requests for administrative model tier management.
 * All endpoints require admin role authentication.
 *
 * Endpoints:
 * - GET /admin/models/tiers - List all models with tier configurations
 * - PATCH /admin/models/:modelId/tier - Update single model tier
 * - POST /admin/models/tiers/bulk - Bulk update multiple models
 * - GET /admin/models/tiers/audit-logs - Get audit logs
 * - POST /admin/models/tiers/revert/:auditLogId - Revert a tier change
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { ModelTierAdminService } from '../../services/admin/model-tier-admin.service';
import logger from '../../utils/logger';
import { getUserId } from '../../middleware/auth.middleware';
import {
  validationError,
  notFoundError,
  badRequestError,
} from '../../middleware/error.middleware';
import {
  updateModelTierSchema,
  bulkUpdateTiersSchema,
  auditLogQuerySchema,
  modelTierFiltersSchema,
} from '../../types/admin-validation';

@injectable()
export class ModelTierAdminController {
  constructor(
    @inject(ModelTierAdminService)
    private modelTierAdminService: ModelTierAdminService
  ) {
    logger.debug('ModelTierAdminController: Initialized');
  }

  /**
   * GET /admin/models/tiers
   * List all models with tier configurations
   *
   * Query parameters:
   * - provider: string (optional) - Filter by provider
   * - tier: string (optional) - Filter by required tier
   * - restrictionMode: string (optional) - Filter by restriction mode
   */
  listModelsWithTiers = async (req: Request, res: Response): Promise<void> => {
    logger.info('Admin: Listing models with tiers', {
      query: req.query,
      adminUserId: getUserId(req),
    });

    try {
      // Validate query parameters
      const filters = modelTierFiltersSchema.parse(req.query);

      // Get models with tier info
      const result = await this.modelTierAdminService.listModelsWithTiers(filters);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid query parameters', (error as any).flatten());
      }
      throw error;
    }
  };

  /**
   * PATCH /admin/models/:modelId/tier
   * Update a single model's tier configuration
   *
   * Request body:
   * - requiredTier: "free" | "pro" | "enterprise" (optional)
   * - tierRestrictionMode: "minimum" | "exact" | "whitelist" (optional)
   * - allowedTiers: array of tiers (optional)
   * - reason: string (optional)
   */
  updateModelTier = async (req: Request, res: Response): Promise<void> => {
    const { modelId } = req.params;
    const adminUserId = getUserId(req);
    const ipAddress = req.ip || req.socket.remoteAddress;

    logger.info('Admin: Updating model tier', {
      modelId,
      adminUserId,
      body: req.body,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body
      const tierData = updateModelTierSchema.parse(req.body);

      // Update model tier
      const result = await this.modelTierAdminService.updateModelTier(
        modelId,
        tierData,
        adminUserId,
        ipAddress
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid request body', (error as any).flatten());
      }
      if (error instanceof Error && error.message.includes('not found')) {
        throw notFoundError(`Model '${modelId}'`);
      }
      throw error;
    }
  };

  /**
   * POST /admin/models/tiers/bulk
   * Bulk update multiple models' tier configurations
   *
   * Request body:
   * - updates: array of { modelId, requiredTier?, tierRestrictionMode?, allowedTiers? }
   * - reason: string (optional)
   */
  bulkUpdateModelTiers = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = getUserId(req);
    const ipAddress = req.ip || req.socket.remoteAddress;

    logger.info('Admin: Bulk updating model tiers', {
      adminUserId,
      updateCount: req.body.updates?.length,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body
      const bulkRequest = bulkUpdateTiersSchema.parse(req.body);

      // Perform bulk update
      const result = await this.modelTierAdminService.bulkUpdateModelTiers(
        bulkRequest,
        adminUserId,
        ipAddress
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid request body', (error as any).flatten());
      }
      throw error;
    }
  };

  /**
   * GET /admin/models/tiers/audit-logs
   * Get audit logs with filtering and pagination
   *
   * Query parameters:
   * - modelId: string (optional)
   * - adminUserId: string (optional)
   * - startDate: ISO date string (optional)
   * - endDate: ISO date string (optional)
   * - limit: number (optional, default 50, max 100)
   * - offset: number (optional, default 0)
   */
  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    logger.info('Admin: Getting audit logs', {
      query: req.query,
      adminUserId: getUserId(req),
    });

    try {
      // Validate query parameters
      const params = auditLogQuerySchema.parse(req.query);

      // Get audit logs
      const result = await this.modelTierAdminService.getAuditLogs(params);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid query parameters', (error as any).flatten());
      }
      throw error;
    }
  };

  /**
   * POST /admin/models/tiers/revert/:auditLogId
   * Revert a tier change to its previous values
   *
   * Path parameters:
   * - auditLogId: string (audit log entry ID)
   */
  revertTierChange = async (req: Request, res: Response): Promise<void> => {
    const { auditLogId } = req.params;
    const adminUserId = getUserId(req);
    const ipAddress = req.ip || req.socket.remoteAddress;

    logger.info('Admin: Reverting tier change', {
      auditLogId,
      adminUserId,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Revert the change
      const result = await this.modelTierAdminService.revertTierChange(
        auditLogId,
        adminUserId,
        ipAddress
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw notFoundError(`Audit log entry '${auditLogId}'`);
      }
      if (
        error instanceof Error &&
        error.message.includes('Cannot revert')
      ) {
        throw badRequestError(error.message);
      }
      throw error;
    }
  };

  /**
   * GET /admin/models/providers
   * Get list of unique providers for filtering
   */
  getProviders = async (_req: Request, res: Response): Promise<void> => {
    try {
      const providers = await this.modelTierAdminService.getUniqueProviders();

      res.status(200).json({
        providers,
      });
    } catch (error) {
      logger.error('Failed to get providers', { error });
      throw error;
    }
  };
}
