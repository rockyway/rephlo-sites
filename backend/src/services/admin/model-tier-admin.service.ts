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
import { randomUUID } from 'crypto';
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
    const currentModel = await this.prisma.models.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        name: true,
        meta: true,
      },
    });

    if (!currentModel) {
      throw new Error(`Model '${modelId}' not found`);
    }

    const currentMeta = currentModel.meta as any;

    // Prepare update data for meta JSONB
    const changes: Record<string, any> = {};
    const previousValues: Record<string, any> = {};

    if (tierData.requiredTier !== undefined) {
      changes.requiredTier = tierData.requiredTier;
      previousValues.requiredTier = currentMeta?.requiredTier;
    }

    if (tierData.tierRestrictionMode !== undefined) {
      changes.tierRestrictionMode = tierData.tierRestrictionMode;
      previousValues.tierRestrictionMode = currentMeta?.tierRestrictionMode;
    }

    if (tierData.allowedTiers !== undefined) {
      changes.allowedTiers = tierData.allowedTiers;
      previousValues.allowedTiers = currentMeta?.allowedTiers;
    }

    // Validate that there are changes
    if (Object.keys(changes).length === 0) {
      throw new Error('No tier configuration changes provided');
    }

    // Merge changes into meta JSONB
    const updatedMeta = {
      ...currentMeta,
      ...changes,
    };

    // Update model in transaction with audit log
    const result = await this.prisma.$transaction(async (tx) => {
      // Update model - only update meta JSONB field
      const updatedModel = await tx.models.update({
        where: { id: modelId },
        data: {
          meta: updatedMeta as any,
        },
        select: {
          id: true,
          name: true,
          provider: true,
          is_available: true,
          meta: true,
          updated_at: true,
        },
      });

      // Create audit log entry
      const auditLog = await tx.model_tier_audit_logs.create({
        data: {
          id: randomUUID(),
          model_id: modelId,
          admin_user_id: adminUserId,
          change_type: this.determineChangeType(changes),
          previous_value: previousValues,
          new_value: changes,
          reason: tierData.reason || null,
          ip_address: ipAddress || null,
        },
        include: {
          users: {
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

    const resultMeta = result.updatedModel.meta as any;

    return {
      model: {
        id: result.updatedModel.id,
        name: result.updatedModel.name,
        displayName: resultMeta?.displayName ?? result.updatedModel.name,
        provider: result.updatedModel.provider,
        requiredTier: resultMeta?.requiredTier ?? 'free',
        tierRestrictionMode: (resultMeta?.tierRestrictionMode ?? 'minimum') as 'minimum' | 'exact' | 'whitelist',
        allowedTiers: resultMeta?.allowedTiers ?? ['free'],
        isAvailable: result.updatedModel.is_available,
        lastModified: result.updatedModel.updated_at.toISOString(),
      },
      auditLog: {
        id: result.auditLog.id,
        modelId: result.auditLog.model_id,
        adminUserId: result.auditLog.admin_user_id,
        adminEmail: result.auditLog.users.email,
        changeType: result.auditLog.change_type,
        previousValue: result.auditLog.previous_value as Record<string, any> | null,
        newValue: result.auditLog.new_value as Record<string, any>,
        reason: result.auditLog.reason || undefined,
        ipAddress: result.auditLog.ip_address || undefined,
        createdAt: result.auditLog.created_at.toISOString(),
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
      where.model_id = params.modelId;
    }

    if (params.adminUserId) {
      where.admin_user_id = params.adminUserId;
    }

    if (params.startDate || params.endDate) {
      where.created_at = {};
      if (params.startDate) {
        where.created_at.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.created_at.lte = new Date(params.endDate);
      }
    }

    // Query audit logs
    const [logs, total] = await Promise.all([
      this.prisma.model_tier_audit_logs.findMany({
        where,
        include: {
          users: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: params.limit,
        skip: params.offset,
      }),
      this.prisma.model_tier_audit_logs.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        modelId: log.model_id,
        adminUserId: log.admin_user_id,
        adminEmail: log.users.email,
        changeType: log.change_type,
        previousValue: log.previous_value as Record<string, any> | null,
        newValue: log.new_value as Record<string, any>,
        reason: log.reason || undefined,
        ipAddress: log.ip_address || undefined,
        createdAt: log.created_at.toISOString(),
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
    const auditLog = await this.prisma.model_tier_audit_logs.findUnique({
      where: { id: auditLogId },
    });

    if (!auditLog) {
      throw new Error(`Audit log entry '${auditLogId}' not found`);
    }

    if (!auditLog.previous_value) {
      throw new Error('Cannot revert: no previous value recorded');
    }

    // Revert to previous values
    const previousValue = auditLog.previous_value as Record<string, any>;
    const revertData: UpdateModelTierRequest = {
      requiredTier: previousValue.requiredTier,
      tierRestrictionMode: previousValue.tierRestrictionMode,
      allowedTiers: previousValue.allowedTiers,
      reason: `Reverted change from audit log ${auditLogId}`,
    };

    return this.updateModelTier(
      auditLog.model_id,
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

    // Build where clause using JSONB queries for tier fields
    const where: any = {};

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    if (filters?.tier) {
      // Use JSONB path query for requiredTier filtering
      where.meta = {
        path: ['requiredTier'],
        equals: filters.tier,
      };
    }

    if (filters?.restrictionMode) {
      // Use JSONB path query for tierRestrictionMode filtering
      where.meta = {
        ...where.meta,
        path: ['tierRestrictionMode'],
        equals: filters.restrictionMode,
      };
    }

    // Query models - only select meta JSONB, not deprecated root columns
    const models = await this.prisma.models.findMany({
      where,
      select: {
        id: true,
        name: true,
        provider: true,
        is_available: true,
        is_legacy: true,
        is_archived: true,
        meta: true,
        updated_at: true,
      },
      orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    });

    return {
      models: models.map((model) => {
        const meta = model.meta as any;
        return {
          id: model.id,
          name: model.name,
          displayName: meta?.displayName ?? model.name,
          provider: model.provider,
          requiredTier: meta?.requiredTier ?? 'free',
          tierRestrictionMode: meta?.tierRestrictionMode ?? 'minimum',
          allowedTiers: meta?.allowedTiers ?? ['free'],
          isAvailable: model.is_available,
          isLegacy: model.is_legacy,
          isArchived: model.is_archived,
          meta: model.meta,
          lastModified: model.updated_at.toISOString(),
        };
      }),
      total: models.length,
    };
  }

  /**
   * Get list of unique providers from models
   *
   * @returns Array of provider names
   */
  async getUniqueProviders(): Promise<string[]> {
    logger.info('ModelTierAdminService.getUniqueProviders');

    try {
      const providers = await this.prisma.models.findMany({
        distinct: ['provider'],
        select: {
          provider: true,
        },
      });

      return providers.map((p: { provider: string | null }) => p.provider).filter((p: string | null): p is string => !!p);
    } catch (error) {
      logger.error('Failed to get unique providers', { error });
      throw error;
    }
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
