/**
 * Pricing Configuration Service
 *
 * Manages margin multipliers and pricing configurations with cascade lookup.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 *
 * Responsibilities:
 * - Cascade lookup: combination → model → provider → tier → default
 * - CRUD operations for pricing config
 * - Impact simulation for multiplier changes
 * - Approval workflow management
 *
 * Reference: docs/plan/112-token-to-credit-conversion-mechanism.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  IPricingConfigService,
  PricingConfig,
  PricingConfigInput,
  PricingConfigFilters,
  ImpactAnalysis,
} from '../interfaces';

@injectable()
export class PricingConfigService implements IPricingConfigService {
  // Default multiplier if no config found (33% margin)
  private readonly DEFAULT_MULTIPLIER = 1.5;

  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('PricingConfigService: Initialized');
  }

  /**
   * Get applicable multiplier for a user/provider/model combination
   * Uses priority cascade: combination → model → provider → tier → default
   *
   * @param userId - User ID
   * @param providerId - Provider ID
   * @param modelId - Model ID
   * @returns Applicable margin multiplier
   */
  async getApplicableMultiplier(
    userId: string,
    providerId: string,
    modelId: string
  ): Promise<number> {
    logger.debug('PricingConfigService: Getting applicable multiplier', {
      userId,
      providerId,
      modelId,
    });

    try {
      // Get user's subscription tier
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: {
              status: 'active',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!user || user.subscriptions.length === 0) {
        logger.warn('PricingConfigService: User has no active subscription, using default', {
          userId,
        });
        return this.DEFAULT_MULTIPLIER;
      }

      const tier = user.subscriptions[0].tier;

      // Priority 1: Check for Combination multiplier (tier + provider + model)
      let config = await this.prisma.$queryRaw<any[]>`
        SELECT margin_multiplier
        FROM pricing_config
        WHERE scope_type = 'combination'
          AND subscription_tier = ${tier}
          AND provider_id = ${providerId}::uuid
          AND model_id = ${modelId}
          AND is_active = true
          AND approval_status = 'approved'
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until >= NOW())
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (config.length > 0) {
        const multiplier = parseFloat(config[0].margin_multiplier);
        logger.debug('PricingConfigService: Using combination multiplier', {
          userId,
          tier,
          providerId,
          modelId,
          multiplier,
        });
        return multiplier;
      }

      // Priority 2: Check for Model multiplier (provider + model, any tier)
      config = await this.prisma.$queryRaw<any[]>`
        SELECT margin_multiplier
        FROM pricing_config
        WHERE scope_type = 'model'
          AND provider_id = ${providerId}::uuid
          AND model_id = ${modelId}
          AND is_active = true
          AND approval_status = 'approved'
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until >= NOW())
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (config.length > 0) {
        const multiplier = parseFloat(config[0].margin_multiplier);
        logger.debug('PricingConfigService: Using model multiplier', {
          userId,
          providerId,
          modelId,
          multiplier,
        });
        return multiplier;
      }

      // Priority 3: Check for Provider multiplier (provider, any model/tier)
      config = await this.prisma.$queryRaw<any[]>`
        SELECT margin_multiplier
        FROM pricing_config
        WHERE scope_type = 'provider'
          AND provider_id = ${providerId}::uuid
          AND subscription_tier IS NULL
          AND is_active = true
          AND approval_status = 'approved'
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until >= NOW())
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (config.length > 0) {
        const multiplier = parseFloat(config[0].margin_multiplier);
        logger.debug('PricingConfigService: Using provider multiplier', {
          userId,
          providerId,
          multiplier,
        });
        return multiplier;
      }

      // Priority 4: Check for Tier multiplier (tier, any provider/model)
      config = await this.prisma.$queryRaw<any[]>`
        SELECT margin_multiplier
        FROM pricing_config
        WHERE scope_type = 'tier'
          AND subscription_tier = ${tier}
          AND provider_id IS NULL
          AND is_active = true
          AND approval_status = 'approved'
          AND effective_from <= NOW()
          AND (effective_until IS NULL OR effective_until >= NOW())
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (config.length > 0) {
        const multiplier = parseFloat(config[0].margin_multiplier);
        logger.debug('PricingConfigService: Using tier multiplier', {
          userId,
          tier,
          multiplier,
        });
        return multiplier;
      }

      // Priority 5: Default fallback
      logger.info('PricingConfigService: No specific config found, using default', {
        userId,
        tier,
        providerId,
        modelId,
        defaultMultiplier: this.DEFAULT_MULTIPLIER,
      });

      return this.DEFAULT_MULTIPLIER;
    } catch (error) {
      logger.error('PricingConfigService: Error getting applicable multiplier', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        providerId,
        modelId,
      });
      // Return default on error to not block requests
      return this.DEFAULT_MULTIPLIER;
    }
  }

  /**
   * Create new pricing configuration
   *
   * @param config - Pricing configuration data
   * @returns Created configuration
   */
  async createPricingConfig(config: PricingConfigInput): Promise<PricingConfig> {
    logger.info('PricingConfigService: Creating pricing config', {
      scopeType: config.scopeType,
      tier: config.subscriptionTier,
      multiplier: config.marginMultiplier,
    });

    try {
      const created = await this.prisma.$queryRaw<any[]>`
        INSERT INTO pricing_config (
          scope_type,
          subscription_tier,
          provider_id,
          model_id,
          margin_multiplier,
          target_gross_margin_percent,
          effective_from,
          effective_until,
          reason,
          reason_details,
          previous_multiplier,
          change_percent,
          expected_margin_change_dollars,
          expected_revenue_impact,
          created_by,
          requires_approval,
          approval_status
        ) VALUES (
          ${config.scopeType},
          ${config.subscriptionTier},
          ${config.providerId ? `${config.providerId}::uuid` : null},
          ${config.modelId},
          ${config.marginMultiplier},
          ${config.targetGrossMarginPercent},
          ${config.effectiveFrom},
          ${config.effectiveUntil},
          ${config.reason},
          ${config.reasonDetails},
          ${config.previousMultiplier},
          ${config.changePercent},
          ${config.expectedMarginChangeDollars},
          ${config.expectedRevenueImpact},
          ${config.createdBy}::uuid,
          ${config.requiresApproval ?? true},
          ${config.requiresApproval === false ? 'approved' : 'pending'}
        )
        RETURNING *
      `;

      if (!created || created.length === 0) {
        throw new Error('Failed to create pricing config');
      }

      logger.info('PricingConfigService: Pricing config created', {
        id: created[0].id,
        scopeType: config.scopeType,
      });

      return this.mapToPricingConfig(created[0]);
    } catch (error) {
      logger.error('PricingConfigService: Error creating pricing config', {
        error: error instanceof Error ? error.message : String(error),
        config,
      });
      throw new Error('Failed to create pricing configuration');
    }
  }

  /**
   * Update existing pricing configuration
   *
   * @param id - Configuration ID
   * @param updates - Partial updates
   * @returns Updated configuration
   */
  async updatePricingConfig(
    id: string,
    updates: Partial<PricingConfigInput>
  ): Promise<PricingConfig> {
    logger.info('PricingConfigService: Updating pricing config', { id, updates });

    try {
      // Build dynamic update query
      const setClauses: string[] = [];
      const values: any[] = [id];
      let paramIndex = 2;

      if (updates.marginMultiplier !== undefined) {
        setClauses.push(`margin_multiplier = $${paramIndex++}`);
        values.push(updates.marginMultiplier);
      }

      if (updates.targetGrossMarginPercent !== undefined) {
        setClauses.push(`target_gross_margin_percent = $${paramIndex++}`);
        values.push(updates.targetGrossMarginPercent);
      }

      if (updates.effectiveUntil !== undefined) {
        setClauses.push(`effective_until = $${paramIndex++}`);
        values.push(updates.effectiveUntil);
      }

      if (updates.reasonDetails !== undefined) {
        setClauses.push(`reason_details = $${paramIndex++}`);
        values.push(updates.reasonDetails);
      }

      if (setClauses.length === 0) {
        throw new Error('No updates provided');
      }

      setClauses.push(`updated_at = NOW()`);

      const updated = await this.prisma.$queryRawUnsafe<any[]>(
        `UPDATE pricing_config
         SET ${setClauses.join(', ')}
         WHERE id = $1::uuid
         RETURNING *`,
        ...values
      );

      if (!updated || updated.length === 0) {
        throw new Error('Pricing config not found');
      }

      logger.info('PricingConfigService: Pricing config updated', { id });

      return this.mapToPricingConfig(updated[0]);
    } catch (error) {
      logger.error('PricingConfigService: Error updating pricing config', {
        error: error instanceof Error ? error.message : String(error),
        id,
        updates,
      });
      throw new Error('Failed to update pricing configuration');
    }
  }

  /**
   * List active pricing configurations
   *
   * @param filters - Optional filters
   * @returns List of configurations
   */
  async listActivePricingConfigs(
    filters?: PricingConfigFilters
  ): Promise<PricingConfig[]> {
    logger.debug('PricingConfigService: Listing active pricing configs', { filters });

    try {
      const whereClauses: string[] = ['is_active = true'];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.scopeType) {
        whereClauses.push(`scope_type = $${paramIndex++}`);
        values.push(filters.scopeType);
      }

      if (filters?.subscriptionTier) {
        whereClauses.push(`subscription_tier = $${paramIndex++}`);
        values.push(filters.subscriptionTier);
      }

      if (filters?.providerId) {
        whereClauses.push(`provider_id = $${paramIndex++}::uuid`);
        values.push(filters.providerId);
      }

      if (filters?.modelId) {
        whereClauses.push(`model_id = $${paramIndex++}`);
        values.push(filters.modelId);
      }

      if (filters?.approvalStatus) {
        whereClauses.push(`approval_status = $${paramIndex++}`);
        values.push(filters.approvalStatus);
      }

      const configs = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM pricing_config
         WHERE ${whereClauses.join(' AND ')}
         ORDER BY created_at DESC`,
        ...values
      );

      return configs.map((config) => this.mapToPricingConfig(config));
    } catch (error) {
      logger.error('PricingConfigService: Error listing pricing configs', {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      throw new Error('Failed to list pricing configurations');
    }
  }

  /**
   * Simulate impact of multiplier change
   * Analyzes historical data to predict impact
   *
   * @param scenarioId - Scenario identifier (tier, provider, or model)
   * @param newMultiplier - Proposed new multiplier
   * @returns Impact analysis
   */
  async simulateMultiplierChange(
    scenarioId: string,
    newMultiplier: number
  ): Promise<ImpactAnalysis> {
    logger.info('PricingConfigService: Simulating multiplier change', {
      scenarioId,
      newMultiplier,
    });

    try {
      // Parse scenario ID (format: "tier:pro" or "model:gpt-4o" etc.)
      const [scopeType, scopeValue] = scenarioId.split(':');

      // Get current multiplier for this scope
      const currentConfigs = await this.listActivePricingConfigs({
        scopeType: scopeType as any,
        subscriptionTier: scopeType === 'tier' ? scopeValue : undefined,
        modelId: scopeType === 'model' ? scopeValue : undefined,
      });

      const currentMultiplier =
        currentConfigs.length > 0 ? currentConfigs[0].marginMultiplier : this.DEFAULT_MULTIPLIER;

      // Calculate metrics based on last 30 days of usage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usageData = await this.prisma.$queryRaw<any[]>`
        SELECT
          COUNT(DISTINCT user_id) as affected_users,
          SUM(vendor_cost) as total_vendor_cost,
          SUM(credits_deducted) as total_credits,
          AVG(credits_deducted) as avg_credits_per_request
        FROM token_usage_ledger
        WHERE created_at >= ${thirtyDaysAgo}
          AND status = 'success'
      `;

      if (!usageData || usageData.length === 0) {
        throw new Error('No usage data found for simulation');
      }

      const data = usageData[0];
      const affectedUsers = parseInt(data.affected_users) || 0;
      const totalVendorCost = parseFloat(data.total_vendor_cost) || 0;

      // Calculate current and proposed margin
      const currentCreditValue = totalVendorCost * currentMultiplier;
      const proposedCreditValue = totalVendorCost * newMultiplier;

      const marginChange = proposedCreditValue - currentCreditValue;
      const revenueImpact = marginChange; // Simplified model

      // Estimate churn impact (simplified linear model)
      const multiplierIncreasePercent = ((newMultiplier - currentMultiplier) / currentMultiplier) * 100;
      const estimatedChurnPercent = Math.max(0, Math.min(multiplierIncreasePercent * 0.5, 10)); // Max 10% churn
      const estimatedChurnImpact = Math.round((affectedUsers * estimatedChurnPercent) / 100);

      const avgCreditCostIncrease = ((newMultiplier - currentMultiplier) / currentMultiplier) * 100;

      const result: ImpactAnalysis = {
        scenarioId,
        currentMultiplier,
        proposedMultiplier: newMultiplier,
        affectedUsers,
        estimatedMarginChange: marginChange,
        estimatedRevenueImpact: revenueImpact,
        averageCreditCostIncrease: avgCreditCostIncrease,
        estimatedChurnImpact,
      };

      logger.info('PricingConfigService: Simulation complete', result);

      return result;
    } catch (error) {
      logger.error('PricingConfigService: Error simulating multiplier change', {
        error: error instanceof Error ? error.message : String(error),
        scenarioId,
        newMultiplier,
      });
      throw new Error('Failed to simulate multiplier change');
    }
  }

  /**
   * Get configuration by ID
   *
   * @param id - Configuration ID
   * @returns Configuration or null
   */
  async getPricingConfigById(id: string): Promise<PricingConfig | null> {
    logger.debug('PricingConfigService: Getting pricing config by ID', { id });

    try {
      const configs = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM pricing_config WHERE id = ${id}::uuid LIMIT 1
      `;

      if (!configs || configs.length === 0) {
        return null;
      }

      return this.mapToPricingConfig(configs[0]);
    } catch (error) {
      logger.error('PricingConfigService: Error getting pricing config', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      return null;
    }
  }

  /**
   * Delete pricing configuration (soft delete by marking inactive)
   *
   * @param id - Configuration ID
   */
  async deletePricingConfig(id: string): Promise<void> {
    logger.info('PricingConfigService: Deleting pricing config', { id });

    try {
      await this.prisma.$queryRaw`
        UPDATE pricing_config
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id}::uuid
      `;

      logger.info('PricingConfigService: Pricing config deleted', { id });
    } catch (error) {
      logger.error('PricingConfigService: Error deleting pricing config', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw new Error('Failed to delete pricing configuration');
    }
  }

  /**
   * Map database record to PricingConfig interface
   * @private
   */
  private mapToPricingConfig(record: any): PricingConfig {
    return {
      id: record.id,
      scopeType: record.scope_type,
      subscriptionTier: record.subscription_tier,
      providerId: record.provider_id,
      modelId: record.model_id,
      marginMultiplier: parseFloat(record.margin_multiplier),
      targetGrossMarginPercent: record.target_gross_margin_percent
        ? parseFloat(record.target_gross_margin_percent)
        : undefined,
      effectiveFrom: new Date(record.effective_from),
      effectiveUntil: record.effective_until ? new Date(record.effective_until) : undefined,
      reason: record.reason,
      reasonDetails: record.reason_details,
      previousMultiplier: record.previous_multiplier
        ? parseFloat(record.previous_multiplier)
        : undefined,
      changePercent: record.change_percent ? parseFloat(record.change_percent) : undefined,
      expectedMarginChangeDollars: record.expected_margin_change_dollars
        ? parseFloat(record.expected_margin_change_dollars)
        : undefined,
      expectedRevenueImpact: record.expected_revenue_impact
        ? parseFloat(record.expected_revenue_impact)
        : undefined,
      createdBy: record.created_by,
      approvedBy: record.approved_by,
      requiresApproval: record.requires_approval,
      approvalStatus: record.approval_status,
      isActive: record.is_active,
      monitored: record.monitored,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}
