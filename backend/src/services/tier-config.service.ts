/**
 * Tier Configuration Service (Plan 190)
 *
 * Manages tier credit allocations, pricing, and configuration versioning.
 * Implements upgrade-only policy for existing users when credits increase.
 *
 * Features:
 * - View and update tier configurations
 * - Preview impact before applying changes (dry-run)
 * - Validate business rules and constraints
 * - Track configuration history for audit trail
 * - Support scheduled rollouts (optional)
 *
 * @module services/tier-config.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import type {
  TierConfig,
  TierConfigHistory,
  UpdateImpact,
  ValidationResult,
  UpdateTierCreditsRequest,
  UpdateTierPriceRequest,
  PreviewUpdateRequest,
} from '@rephlo/shared-types';
import { TierChangeType } from '@rephlo/shared-types';
import { mapTierConfigToApiType, mapTierConfigHistoryToApiType } from '../utils/typeMappers';
import { ICreditUpgradeService } from '../interfaces/services/credit-upgrade.interface';
import logger from '../utils/logger';

// =============================================================================
// Service Implementation
// =============================================================================

@injectable()
export class TierConfigService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('ICreditUpgradeService') private creditUpgradeService: ICreditUpgradeService
  ) {
    logger.debug('TierConfigService: Initialized');
  }

  /**
   * Get all tier configurations
   * Returns all active tier configs with current credit allocations
   */
  async getAllTierConfigs(): Promise<TierConfig[]> {
    try {
      logger.info('TierConfigService.getAllTierConfigs: Fetching all tier configs');

      const dbConfigs = await this.prisma.subscription_tier_config.findMany({
        where: { is_active: true },
        orderBy: { tier_name: 'asc' },
      });

      logger.debug(`TierConfigService.getAllTierConfigs: Found ${dbConfigs.length} tier configs`);

      // Transform snake_case database fields to camelCase API fields
      return dbConfigs.map(mapTierConfigToApiType);
    } catch (error) {
      logger.error('TierConfigService.getAllTierConfigs: Failed to fetch tier configs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to fetch tier configurations');
    }
  }

  /**
   * Get tier configuration by name
   * Returns specific tier config with all details
   */
  async getTierConfigByName(tierName: string): Promise<TierConfig | null> {
    try {
      logger.info('TierConfigService.getTierConfigByName: Fetching tier config', { tierName });

      const dbConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: tierName },
      });

      if (!dbConfig) {
        logger.warn(`TierConfigService.getTierConfigByName: Tier not found: ${tierName}`);
        return null;
      }

      logger.debug('TierConfigService.getTierConfigByName: Tier config found', {
        tierName,
        credits: dbConfig.monthly_credit_allocation,
        version: dbConfig.config_version,
      });

      // Transform snake_case to camelCase
      return mapTierConfigToApiType(dbConfig);
    } catch (error) {
      logger.error('TierConfigService.getTierConfigByName: Failed to fetch tier config', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch tier configuration: ${tierName}`);
    }
  }

  /**
   * Get tier configuration history
   * Returns audit trail of all changes to a tier
   */
  async getTierConfigHistory(tierName: string, limit: number = 50): Promise<TierConfigHistory[]> {
    try {
      logger.info('TierConfigService.getTierConfigHistory: Fetching history', {
        tierName,
        limit,
      });

      const dbHistory = await this.prisma.tier_config_history.findMany({
        where: { tier_name: tierName },
        orderBy: { changed_at: 'desc' },
        take: limit,
      });

      logger.debug(`TierConfigService.getTierConfigHistory: Found ${dbHistory.length} records`);

      // Transform snake_case to camelCase
      return dbHistory.map(mapTierConfigHistoryToApiType);
    } catch (error) {
      logger.error('TierConfigService.getTierConfigHistory: Failed to fetch history', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch tier configuration history: ${tierName}`);
    }
  }

  /**
   * Update tier credit allocation
   * Implements upgrade-only policy for existing users
   */
  async updateTierCredits(
    tierName: string,
    request: UpdateTierCreditsRequest,
    adminUserId: string
  ): Promise<TierConfig> {
    try {
      logger.info('TierConfigService.updateTierCredits: Updating tier credits', {
        tierName,
        newCredits: request.newCredits,
        applyToExisting: request.applyToExistingUsers,
        adminUserId,
      });

      // 1. Validate request
      const validation = await this.validateTierUpdate(tierName, request);
      if (!validation.valid) {
        const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
        logger.error('TierConfigService.updateTierCredits: Validation failed', {
          tierName,
          errors: validation.errors,
        });
        throw new Error(errorMsg);
      }

      // 2. Get current tier config
      const currentConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: tierName },
      });

      if (!currentConfig) {
        throw new Error(`Tier configuration not found: ${tierName}`);
      }

      const previousCredits = currentConfig.monthly_credit_allocation;
      const changeType: TierChangeType =
        request.newCredits > previousCredits
          ? TierChangeType.CREDIT_INCREASE
          : TierChangeType.CREDIT_DECREASE;

      // 3. Count affected users
      const affectedUsersCount = request.applyToExistingUsers
        ? await this.countActiveUsersOnTier(tierName)
        : 0;

      // 4. Update tier config in transaction
      const updatedConfig = await this.prisma.$transaction(async (tx) => {
        // Update subscription_tier_config
        const updated = await tx.subscription_tier_config.update({
          where: { tier_name: tierName },
          data: {
            monthly_credit_allocation: request.newCredits,
            config_version: { increment: 1 },
            last_modified_by: adminUserId,
            last_modified_at: new Date(),
            apply_to_existing_users: request.applyToExistingUsers ?? false,
            rollout_start_date: request.scheduledRolloutDate
              ? new Date(request.scheduledRolloutDate)
              : null,
            updated_at: new Date(),
          },
        });

        // Create history record
        await tx.tier_config_history.create({
          data: {
            tier_config_id: currentConfig.id,
            tier_name: tierName,
            previous_credits: previousCredits,
            new_credits: request.newCredits,
            previous_price_usd: currentConfig.monthly_price_usd,
            new_price_usd: currentConfig.monthly_price_usd, // No price change
            change_reason: request.reason,
            change_type: changeType,
            affected_users_count: affectedUsersCount,
            changed_by: adminUserId,
            changed_at: new Date(),
            applied_at: request.scheduledRolloutDate ? null : new Date(),
          },
        });

        return updated;
      });

      logger.info('TierConfigService.updateTierCredits: Successfully updated tier credits', {
        tierName,
        previousCredits,
        newCredits: request.newCredits,
        changeType,
        affectedUsers: affectedUsersCount,
        version: updatedConfig.config_version,
      });

      // 5. Apply credit upgrade to existing users (if immediate rollout)
      if (
        request.applyToExistingUsers &&
        !request.scheduledRolloutDate &&
        changeType === TierChangeType.CREDIT_INCREASE
      ) {
        logger.info(
          'TierConfigService.updateTierCredits: Processing immediate credit upgrade for existing users',
          { tierName, previousCredits, newCredits: request.newCredits }
        );

        try {
          const upgradeResult = await this.creditUpgradeService.processTierCreditUpgrade(
            tierName,
            previousCredits,
            request.newCredits,
            request.reason
          );

          logger.info('TierConfigService.updateTierCredits: Credit upgrade completed', {
            tierName,
            successful: upgradeResult.successful,
            failed: upgradeResult.failed,
            totalProcessed: upgradeResult.totalProcessed,
          });

          // Mark history as applied if any users were successfully upgraded
          if (upgradeResult.successful > 0) {
            await this.prisma.tier_config_history.updateMany({
              where: {
                tier_name: tierName,
                change_type: TierChangeType.CREDIT_INCREASE,
                applied_at: null,
              },
              data: { applied_at: new Date() },
            });
          }
        } catch (error) {
          logger.error('TierConfigService.updateTierCredits: Credit upgrade failed', {
            tierName,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Don't throw - tier config update succeeded, upgrade can be retried later
        }
      } else if (request.applyToExistingUsers && request.scheduledRolloutDate) {
        logger.info(
          'TierConfigService.updateTierCredits: Scheduled rollout configured - will be processed by background job',
          { tierName, scheduledDate: request.scheduledRolloutDate }
        );
      }

      // Transform and return
      return mapTierConfigToApiType(updatedConfig);
    } catch (error) {
      logger.error('TierConfigService.updateTierCredits: Failed to update tier credits', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update tier pricing
   * Updates monthly/annual pricing with audit trail
   */
  async updateTierPrice(
    tierName: string,
    request: UpdateTierPriceRequest,
    adminUserId: string
  ): Promise<TierConfig> {
    try {
      logger.info('TierConfigService.updateTierPrice: Updating tier pricing', {
        tierName,
        newMonthlyPrice: request.newMonthlyPrice,
        newAnnualPrice: request.newAnnualPrice,
        adminUserId,
      });

      // 1. Get current tier config
      const currentConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: tierName },
      });

      if (!currentConfig) {
        throw new Error(`Tier configuration not found: ${tierName}`);
      }

      // 2. Calculate new prices (use existing if not provided)
      const newMonthlyPrice =
        request.newMonthlyPrice ?? Number(currentConfig.monthly_price_usd);
      const newAnnualPrice = request.newAnnualPrice ?? Number(currentConfig.annual_price_usd);

      // 3. Update in transaction
      const updatedConfig = await this.prisma.$transaction(async (tx) => {
        // Update subscription_tier_config
        const updated = await tx.subscription_tier_config.update({
          where: { tier_name: tierName },
          data: {
            monthly_price_usd: new Prisma.Decimal(newMonthlyPrice),
            annual_price_usd: new Prisma.Decimal(newAnnualPrice),
            config_version: { increment: 1 },
            last_modified_by: adminUserId,
            last_modified_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Create history record
        await tx.tier_config_history.create({
          data: {
            tier_config_id: currentConfig.id,
            tier_name: tierName,
            previous_credits: currentConfig.monthly_credit_allocation,
            new_credits: currentConfig.monthly_credit_allocation, // No credit change
            previous_price_usd: currentConfig.monthly_price_usd,
            new_price_usd: new Prisma.Decimal(newMonthlyPrice),
            change_reason: request.reason,
            change_type: TierChangeType.PRICE_CHANGE,
            affected_users_count: await this.countActiveUsersOnTier(tierName),
            changed_by: adminUserId,
            changed_at: new Date(),
            applied_at: new Date(),
          },
        });

        return updated;
      });

      logger.info('TierConfigService.updateTierPrice: Successfully updated tier pricing', {
        tierName,
        previousMonthlyPrice: Number(currentConfig.monthly_price_usd),
        newMonthlyPrice,
        version: updatedConfig.config_version,
      });

      return mapTierConfigToApiType(updatedConfig);
    } catch (error) {
      logger.error('TierConfigService.updateTierPrice: Failed to update tier pricing', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Preview credit update impact (dry-run)
   * Calculates what will happen without applying changes
   */
  async previewCreditUpdate(
    tierName: string,
    request: PreviewUpdateRequest
  ): Promise<UpdateImpact> {
    try {
      logger.info('TierConfigService.previewCreditUpdate: Previewing impact', {
        tierName,
        newCredits: request.newCredits,
      });

      // 1. Get current tier config
      const currentConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: tierName },
      });

      if (!currentConfig) {
        throw new Error(`Tier configuration not found: ${tierName}`);
      }

      const currentCredits = currentConfig.monthly_credit_allocation;
      const newCredits = request.newCredits ?? currentCredits;

      // 2. Determine change type
      let changeType: 'increase' | 'decrease' | 'no_change';
      if (newCredits > currentCredits) {
        changeType = 'increase';
      } else if (newCredits < currentCredits) {
        changeType = 'decrease';
      } else {
        changeType = 'no_change';
      }

      // 3. Count affected users
      const totalActiveUsers = await this.countActiveUsersOnTier(tierName);

      // For credit increases, all active users are eligible for upgrade
      // For credit decreases, existing users keep their current allocation (0 upgrades)
      const willUpgrade =
        request.applyToExistingUsers && changeType === 'increase' ? totalActiveUsers : 0;
      const willRemainSame = totalActiveUsers - willUpgrade;

      // 4. Calculate cost impact
      const creditDifference = newCredits - currentCredits;
      const costPerCredit = 0.01; // $0.01 per credit (Plan 189)
      const costPerUser = creditDifference * costPerCredit;
      const totalCostImpact = costPerUser * willUpgrade;

      const impact: UpdateImpact = {
        tierName,
        currentCredits,
        newCredits,
        changeType,
        affectedUsers: {
          total: totalActiveUsers,
          willUpgrade,
          willRemainSame,
        },
        estimatedCostImpact: totalCostImpact,
        breakdown: {
          costPerUser: Math.abs(costPerUser),
          totalCreditsAdded: creditDifference * willUpgrade,
          dollarValueAdded: Math.abs(totalCostImpact),
        },
      };

      logger.debug('TierConfigService.previewCreditUpdate: Impact calculated', { impact });

      return impact;
    } catch (error) {
      logger.error('TierConfigService.previewCreditUpdate: Failed to preview impact', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate tier update request
   * Checks business rules, constraints, and data integrity
   */
  async validateTierUpdate(
    tierName: string,
    request: UpdateTierCreditsRequest | UpdateTierPriceRequest
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      logger.debug('TierConfigService.validateTierUpdate: Validating request', {
        tierName,
        request,
      });

      // 1. Check tier exists
      const tierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: tierName },
      });

      if (!tierConfig) {
        errors.push(`Tier configuration not found: ${tierName}`);
        return { valid: false, errors, warnings };
      }

      // 2. Validate credit update
      if ('newCredits' in request) {
        const currentCredits = tierConfig.monthly_credit_allocation;

        // Check minimum credits
        if (request.newCredits < 100) {
          errors.push('Credits must be at least 100');
        }

        // Check maximum credits
        if (request.newCredits > 1000000) {
          errors.push('Credits cannot exceed 1,000,000');
        }

        // Check increment (must be multiple of 100)
        if (request.newCredits % 100 !== 0) {
          errors.push('Credits must be in increments of 100');
        }

        // Warn about credit decreases
        if (request.newCredits < currentCredits) {
          warnings.push(
            'Credit decrease detected. Existing users will retain their current allocation.'
          );
        }

        // Warn about large increases
        const increasePercent = ((request.newCredits - currentCredits) / currentCredits) * 100;
        if (increasePercent > 50) {
          warnings.push(
            `Large credit increase detected (${increasePercent.toFixed(1)}%). Consider gradual rollout.`
          );
        }
      }

      // 3. Validate price update
      if ('newMonthlyPrice' in request || 'newAnnualPrice' in request) {
        if (request.newMonthlyPrice !== undefined && request.newMonthlyPrice < 0) {
          errors.push('Monthly price cannot be negative');
        }

        if (request.newAnnualPrice !== undefined && request.newAnnualPrice < 0) {
          errors.push('Annual price cannot be negative');
        }

        // Warn if annual price is less than 10x monthly (standard is 12x with 2-month discount)
        if (
          request.newMonthlyPrice !== undefined &&
          request.newAnnualPrice !== undefined &&
          request.newAnnualPrice < request.newMonthlyPrice * 10
        ) {
          warnings.push(
            'Annual price is less than 10x monthly price. Consider pricing strategy.'
          );
        }
      }

      // 4. Validate reason
      if (request.reason.length < 10) {
        errors.push('Reason must be at least 10 characters');
      }

      if (request.reason.length > 500) {
        errors.push('Reason must be less than 500 characters');
      }

      const valid = errors.length === 0;

      logger.debug('TierConfigService.validateTierUpdate: Validation complete', {
        valid,
        errorCount: errors.length,
        warningCount: warnings.length,
      });

      return { valid, errors, warnings };
    } catch (error) {
      logger.error('TierConfigService.validateTierUpdate: Validation error', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      errors.push('Validation failed due to internal error');
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Count active users on a tier
   * Used for impact calculations
   */
  async countActiveUsersOnTier(tierName: string): Promise<number> {
    try {
      const count = await this.prisma.subscription_monetization.count({
        where: {
          tier: tierName as any, // TypeScript cast for enum compatibility
          status: 'active',
        },
      });

      logger.debug(`TierConfigService.countActiveUsersOnTier: ${count} active users on ${tierName}`);

      return count;
    } catch (error) {
      logger.error('TierConfigService.countActiveUsersOnTier: Failed to count users', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}
