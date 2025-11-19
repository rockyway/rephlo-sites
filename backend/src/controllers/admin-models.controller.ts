/**
 * Admin Models Controller
 *
 * Handles HTTP requests for administrative model lifecycle management.
 * All endpoints require admin role authentication.
 *
 * Endpoints:
 * - POST /admin/models - Create new model
 * - PUT /admin/models/:id - Full model update (name, meta, pricing)
 * - POST /admin/models/:id/mark-legacy - Mark model as legacy
 * - POST /admin/models/:id/unmark-legacy - Remove legacy status
 * - POST /admin/models/:id/archive - Archive model
 * - POST /admin/models/:id/unarchive - Restore archived model
 * - PATCH /admin/models/:id/meta - Update model metadata
 * - GET /admin/models/:id/history - Get version history for model
 * - GET /admin/models/legacy - List legacy models
 * - GET /admin/models/archived - List archived models
 *
 * Reference: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import logger from '../utils/logger';
import { getUserId } from '../middleware/auth.middleware';
import {
  validationError,
  notFoundError,
  badRequestError,
} from '../middleware/error.middleware';
import {
  createModelRequestSchema,
  markLegacyRequestSchema,
  archiveModelRequestSchema,
  updateModelMetaRequestSchema,
  updateModelRequestSchema,
} from '../types/model-meta';
import { IModelService } from '../interfaces';
import { ModelVersionHistoryService } from '../services/model-version-history.service';

@injectable()
export class AdminModelsController {
  constructor(
    @inject('IModelService') private modelService: IModelService,
    @inject(ModelVersionHistoryService) private versionHistory: ModelVersionHistoryService
  ) {
    logger.debug('AdminModelsController: Initialized');
  }

  /**
   * POST /admin/models
   * Create a new model
   *
   * Request body:
   * - id: string (required) - Model ID
   * - name: string (required) - Internal name
   * - provider: string (required) - Provider slug
   * - meta: ModelMeta (required) - JSONB metadata
   */
  createModel = async (req: Request, res: Response): Promise<void> => {
    const adminUserId = getUserId(req);

    logger.info('Admin: Creating new model', {
      adminUserId,
      modelId: req.body.id,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body
      const modelData = createModelRequestSchema.parse(req.body);

      // Create model
      const model = await this.modelService.addModel(modelData, adminUserId);

      res.status(201).json({
        status: 'success',
        message: `Model '${model.id}' created successfully`,
        data: model,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid request body', (error as any).flatten());
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        throw badRequestError(error.message);
      }
      throw error;
    }
  };

  /**
   * PUT /admin/models/:id
   * Full model update (name, meta, pricing)
   *
   * Request body:
   * - name: string (optional) - Update model name
   * - meta: Partial<ModelMeta> (optional) - Partial metadata updates
   * - reason: string (optional) - Admin reason for audit trail
   */
  updateModel = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const adminUserId = getUserId(req);

    logger.info('Admin: Updating model', {
      modelId,
      adminUserId,
      hasNameUpdate: !!req.body.name,
      hasMetaUpdate: !!req.body.meta,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body
      const updates = updateModelRequestSchema.parse(req.body);

      // Update model (service handles atomic transaction for model + pricing)
      const updatedModel = await this.modelService.updateModel(
        modelId,
        updates,
        adminUserId
      );

      res.status(200).json({
        status: 'success',
        message: `Model '${modelId}' updated successfully`,
        data: updatedModel,
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
   * POST /admin/models/:id/mark-legacy
   * Mark model as legacy (deprecated)
   *
   * Request body:
   * - replacementModelId: string (optional) - ID of replacement model
   * - deprecationNotice: string (optional) - User-facing deprecation message
   * - sunsetDate: string (optional) - ISO 8601 date when model will be removed
   */
  markModelAsLegacy = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const adminUserId = getUserId(req);

    logger.info('Admin: Marking model as legacy', {
      modelId,
      adminUserId,
      body: req.body,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body
      const options = markLegacyRequestSchema.parse(req.body);

      // Mark as legacy
      await this.modelService.markAsLegacy(modelId, options, adminUserId);

      res.status(200).json({
        status: 'success',
        message: `Model '${modelId}' marked as legacy`,
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
   * POST /admin/models/:id/unmark-legacy
   * Remove legacy status from model
   */
  unmarkModelLegacy = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const adminUserId = getUserId(req);

    logger.info('Admin: Unmarking model as legacy', {
      modelId,
      adminUserId,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Unmark legacy
      await this.modelService.unmarkLegacy(modelId, adminUserId);

      res.status(200).json({
        status: 'success',
        message: `Model '${modelId}' unmarked as legacy`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw notFoundError(`Model '${modelId}'`);
      }
      throw error;
    }
  };

  /**
   * POST /admin/models/:id/archive
   * Archive a model
   *
   * Request body:
   * - reason: string (required) - Reason for archiving
   */
  archiveModel = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const adminUserId = getUserId(req);

    logger.info('Admin: Archiving model', {
      modelId,
      adminUserId,
      reason: req.body.reason,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body (reason required)
      archiveModelRequestSchema.parse(req.body);

      // Archive model
      await this.modelService.archive(modelId, adminUserId);

      res.status(200).json({
        status: 'success',
        message: `Model '${modelId}' archived`,
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
   * POST /admin/models/:id/unarchive
   * Restore archived model
   */
  unarchiveModel = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const adminUserId = getUserId(req);

    logger.info('Admin: Unarchiving model', {
      modelId,
      adminUserId,
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Unarchive model
      await this.modelService.unarchive(modelId, adminUserId);

      res.status(200).json({
        status: 'success',
        message: `Model '${modelId}' unarchived`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw notFoundError(`Model '${modelId}'`);
      }
      throw error;
    }
  };

  /**
   * PATCH /admin/models/:id/meta
   * Update model metadata (partial update)
   *
   * Request body: Partial<ModelMeta>
   */
  updateModelMetadata = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const adminUserId = getUserId(req);

    logger.info('Admin: Updating model metadata', {
      modelId,
      adminUserId,
      updates: Object.keys(req.body),
    });

    if (!adminUserId) {
      throw badRequestError('Admin user ID not found');
    }

    try {
      // Validate request body
      const metaUpdates = updateModelMetaRequestSchema.parse(req.body);

      // Update metadata
      await this.modelService.updateModelMeta(
        modelId,
        metaUpdates,
        adminUserId
      );

      res.status(200).json({
        status: 'success',
        message: `Model '${modelId}' metadata updated`,
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
   * GET /admin/models/legacy
   * List all legacy models
   */
  listLegacyModels = async (_req: Request, res: Response): Promise<void> => {
    logger.info('Admin: Listing legacy models');

    try {
      const result = await this.modelService.getLegacyModels();

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to list legacy models', { error });
      throw error;
    }
  };

  /**
   * GET /admin/models/archived
   * List all archived models
   */
  listArchivedModels = async (_req: Request, res: Response): Promise<void> => {
    logger.info('Admin: Listing archived models');

    try {
      const result = await this.modelService.getArchivedModels();

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to list archived models', { error });
      throw error;
    }
  };

  /**
   * GET /admin/models/:id/history
   * Get version history for a model
   *
   * Query parameters:
   * - limit: number (optional, default 50, max 100) - Number of entries to return
   * - offset: number (optional, default 0) - Offset for pagination
   * - change_type: string (optional) - Filter by change type
   */
  getModelHistory = async (req: Request, res: Response): Promise<void> => {
    const { id: modelId } = req.params;
    const { limit, offset, change_type } = req.query;

    logger.info('Admin: Getting model history', {
      modelId,
      limit,
      offset,
      change_type,
    });

    try {
      // Parse and validate query parameters
      const parsedLimit = limit
        ? Math.min(parseInt(limit as string, 10), 100)
        : 50;
      const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

      if (isNaN(parsedLimit) || parsedLimit < 1) {
        throw badRequestError('Invalid limit parameter');
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw badRequestError('Invalid offset parameter');
      }

      // Get version history
      const result = await this.versionHistory.getModelHistory(modelId, {
        limit: parsedLimit,
        offset: parsedOffset,
        change_type: change_type as string,
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw notFoundError(`Model '${modelId}'`);
      }
      throw error;
    }
  };
}
