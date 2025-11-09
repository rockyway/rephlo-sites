/**
 * Model Tier Admin Service
 *
 * Handles administrative operations for managing model tier configurations.
 * Includes comprehensive audit logging for all tier changes.
 *
 * Features:
 * - Update individual model tier configurations
 * - Bulk update multiple models
 * - Query audit logs with filtering
 * - Revert tier changes
 * - Cache invalidation on updates
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger';
import { ModelService } from '../model.service';
import {
  UpdateModelTierRequest,
  BulkUpdateTiersRequest,
  UpdateModelTierResponse,
  BulkUpdateTiersResponse,
  BulkUpdateResult,
  AuditLogsResponse,
  AuditLogQueryParams,
  ModelTierFilters,
  ModelTierListResponse,
} from '../../types/admin-validation';

@injectable()
export class ModelTierAdminService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(ModelService) private modelService: ModelService
  ) {
    logger.debug('ModelTierAdminService: Initialized');
  }

  /**
   * Update a single model's tier configuration
   * Creates audit log entry for the change
   *
   * @param modelId - Model ID to update
   * @param tierData - New tier configuration
   * @param adminUserId - Admin user making the change
   * @param ipAddress - IP address of admin user
   * @returns Updated model and audit log entry
   */
  async updateModelTier(
    modelId: string,
    tierData: UpdateModelTierRequest,
    adminUserId: string,
    ipAddress?: string
  ): Promise<UpdateModelTierResponse> {
    logger.info('ModelTierAdminService: Updating model tier', {
      modelId,
      adminUserId,
      tierData,
    });

    // Fetch current model data
    const currentModel = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        displayName: true,
        requiredTier: true,
        tierRestrictionMode: true,
        allowedTiers: true,
      },
    });

    if (!currentModel) {
      throw new Error(`Model '${modelId}' not found`);
    }

    // Prepare update data
    const updateData: any = {};
    const changes: Record<string, any> = {};
    const previousValues: Record<string, any> = {};

    if (tierData.requiredTier !== undefined) {
      updateData.requiredTier = tierData.requiredTier;
      changes.requiredTier = tierData.requiredTier;
      previousValues.requiredTier = currentModel.requiredTier;
    }

    if (tierData.tierRestrictionMode !== undefined) {
      updateData.tierRestrictionMode = tierData.tierRestrictionMode;
      changes.tierRestrictionMode = tierData.tierRestrictionMode;
      previousValues.tierRestrictionMode = currentModel.tierRestrictionMode;
    }

    if (tierData.allowedTiers !== undefined) {
      updateData.allowedTiers = tierData.allowedTiers;
      changes.allowedTiers = tierData.allowedTiers;
      previousValues.allowedTiers = currentModel.allowedTiers;
    }

    // Validate that there are changes
    if (Object.keys(updateData).length === 0) {
      throw new Error('No tier configuration changes provided');
    }

    // Update model in transaction with audit log
    const result = await this.prisma.$transaction(async (tx) => {
      // Update model
      const updatedModel = await tx.model.update({
        where: { id: modelId },
        data: updateData,
        select: {
          id: true,
          name: true,
          displayName: true,
          provider: true,
          requiredTier: true,
          tierRestrictionMode: true,
          allowedTiers: true,
          isAvailable: true,
          updatedAt: true,
        },
      });

      // Create audit log entry
      const auditLog = await tx.modelTierAuditLog.create({
        data: {
          modelId,
          adminUserId,
          changeType: this.determineChangeType(changes),
          previousValue: previousValues,
          newValue: changes,
          reason: tierData.reason || null,
          ipAddress: ipAddress || null,
        },
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
      });

      return { updatedModel, auditLog };
    });

    // Clear model cache after update
    this.modelService.clearCache();

    logger.info('ModelTierAdminService: Model tier updated successfully', {
      modelId,
      adminUserId,
    });

    return {
      model: {
        id: result.updatedModel.id,
        name: result.updatedModel.name,
        displayName: result.updatedModel.displayName,
        provider: result.updatedModel.provider,
        requiredTier: result.updatedModel.requiredTier,
        tierRestrictionMode: result.updatedModel
          .tierRestrictionMode as 'minimum' | 'exact' | 'whitelist',
        allowedTiers: result.updatedModel.allowedTiers,
        isAvailable: result.updatedModel.isAvailable,
        lastModified: result.updatedModel.updatedAt.toISOString(),
      },
      auditLog: {
        id: result.auditLog.id,
        modelId: result.auditLog.modelId,
        adminUserId: result.auditLog.adminUserId,
        adminEmail: result.auditLog.admin.email,
        changeType: result.auditLog.changeType,
        previousValue: result.auditLog.previousValue as Record<string, any> | null,
        newValue: result.auditLog.newValue as Record<string, any>,
        reason: result.auditLog.reason || undefined,
        ipAddress: result.auditLog.ipAddress || undefined,
        createdAt: result.auditLog.createdAt.toISOString(),
      },
    };
  }

  /**
   * Bulk update multiple models' tier configurations
   *
   * @param request - Bulk update request with array of updates
   * @param adminUserId - Admin user making the changes
   * @param ipAddress - IP address of admin user
   * @returns Summary of successful and failed updates
   */
  async bulkUpdateModelTiers(
    request: BulkUpdateTiersRequest,
    adminUserId: string,
    ipAddress?: string
  ): Promise<BulkUpdateTiersResponse> {
    logger.info('ModelTierAdminService: Bulk updating model tiers', {
      count: request.updates.length,
      adminUserId,
    });

    const results: BulkUpdateResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process each update
    for (const update of request.updates) {
      try {
        const response = await this.updateModelTier(
          update.modelId,
          {
            requiredTier: update.requiredTier,
            tierRestrictionMode: update.tierRestrictionMode,
            allowedTiers: update.allowedTiers,
            reason: request.reason,
          },
          adminUserId,
          ipAddress
        );

        results.push({
          modelId: update.modelId,
          success: true,
          auditLog: response.auditLog,
        });
        successCount++;
      } catch (error) {
        logger.error('ModelTierAdminService: Failed to update model in bulk', {
          modelId: update.modelId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          modelId: update.modelId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    logger.info('ModelTierAdminService: Bulk update completed', {
      success: successCount,
      failed: failedCount,
    });

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Get audit logs with filtering and pagination
   *
   * @param params - Query parameters for filtering
   * @returns Paginated audit logs
   */
  async getAuditLogs(params: AuditLogQueryParams): Promise<AuditLogsResponse> {
    logger.debug('ModelTierAdminService: Getting audit logs', params);

    // Build where clause
    const where: any = {};

    if (params.modelId) {
      where.modelId = params.modelId;
    }

    if (params.adminUserId) {
      where.adminUserId = params.adminUserId;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    // Query audit logs
    const [logs, total] = await Promise.all([
      this.prisma.modelTierAuditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: params.limit,
        skip: params.offset,
      }),
      this.prisma.modelTierAuditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        modelId: log.modelId,
        adminUserId: log.adminUserId,
        adminEmail: log.admin.email,
        changeType: log.changeType,
        previousValue: log.previousValue as Record<string, any> | null,
        newValue: log.newValue as Record<string, any>,
        reason: log.reason || undefined,
        ipAddress: log.ipAddress || undefined,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };
  }

  /**
   * Revert a tier change by applying previous values
   *
   * @param auditLogId - Audit log entry ID to revert
   * @param adminUserId - Admin user performing the revert
   * @param ipAddress - IP address of admin user
   * @returns Updated model and new audit log entry
   */
  async revertTierChange(
    auditLogId: string,
    adminUserId: string,
    ipAddress?: string
  ): Promise<UpdateModelTierResponse> {
    logger.info('ModelTierAdminService: Reverting tier change', {
      auditLogId,
      adminUserId,
    });

    // Fetch audit log entry
    const auditLog = await this.prisma.modelTierAuditLog.findUnique({
      where: { id: auditLogId },
    });

    if (!auditLog) {
      throw new Error(`Audit log entry '${auditLogId}' not found`);
    }

    if (!auditLog.previousValue) {
      throw new Error('Cannot revert: no previous value recorded');
    }

    // Revert to previous values
    const previousValue = auditLog.previousValue as Record<string, any>;
    const revertData: UpdateModelTierRequest = {
      requiredTier: previousValue.requiredTier,
      tierRestrictionMode: previousValue.tierRestrictionMode,
      allowedTiers: previousValue.allowedTiers,
      reason: `Reverted change from audit log ${auditLogId}`,
    };

    return this.updateModelTier(
      auditLog.modelId,
      revertData,
      adminUserId,
      ipAddress
    );
  }

  /**
   * List all models with their tier configurations
   *
   * @param filters - Optional filters for models
   * @returns List of models with tier info
   */
  async listModelsWithTiers(
    filters?: ModelTierFilters
  ): Promise<ModelTierListResponse> {
    logger.debug('ModelTierAdminService: Listing models with tiers', filters);

    // Build where clause
    const where: any = {};

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    if (filters?.tier) {
      where.requiredTier = filters.tier;
    }

    if (filters?.restrictionMode) {
      where.tierRestrictionMode = filters.restrictionMode;
    }

    // Query models
    const models = await this.prisma.model.findMany({
      where,
      select: {
        id: true,
        name: true,
        displayName: true,
        provider: true,
        requiredTier: true,
        tierRestrictionMode: true,
        allowedTiers: true,
        isAvailable: true,
        updatedAt: true,
      },
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
    });

    return {
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        displayName: model.displayName,
        provider: model.provider,
        requiredTier: model.requiredTier,
        tierRestrictionMode: model.tierRestrictionMode as 'minimum' | 'exact' | 'whitelist',
        allowedTiers: model.allowedTiers,
        isAvailable: model.isAvailable,
        lastModified: model.updatedAt.toISOString(),
      })),
      total: models.length,
    };
  }

  /**
   * Determine change type based on which fields were changed
   *
   * @param changes - Object containing changed fields
   * @returns Change type string
   */
  private determineChangeType(changes: Record<string, any>): string {
    const changedFields = Object.keys(changes);

    if (changedFields.length === 1) {
      if (changedFields[0] === 'requiredTier') return 'tier_update';
      if (changedFields[0] === 'tierRestrictionMode')
        return 'restriction_mode_update';
      if (changedFields[0] === 'allowedTiers') return 'allowed_tiers_update';
    }

    return 'tier_configuration_update';
  }
}
