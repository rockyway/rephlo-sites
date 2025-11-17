/**
 * Credit Upgrade Service (Plan 190)
 *
 * Processes credit upgrades for existing users when tier allocations increase.
 * Implements upgrade-only policy: users never lose credits, only gain them.
 *
 * Features:
 * - Batch processing for tier-wide upgrades
 * - Eligibility checking before applying upgrades
 * - Integration with credit allocation system
 * - Scheduled rollout support
 * - Comprehensive audit logging
 *
 * @module services/credit-upgrade.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import type { UpgradeResult } from '@rephlo/shared-types';
import { ICreditUpgradeService } from '../interfaces/services/credit-upgrade.interface';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

// =============================================================================
// Service Implementation
// =============================================================================

@injectable()
export class CreditUpgradeService implements ICreditUpgradeService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('CreditUpgradeService: Initialized');
  }

  /**
   * Process tier credit upgrade for all eligible users
   * Applies credit increases to users on a specific tier
   */
  async processTierCreditUpgrade(
    tierName: string,
    oldCredits: number,
    newCredits: number,
    reason: string
  ): Promise<UpgradeResult> {
    try {
      logger.info('CreditUpgradeService.processTierCreditUpgrade: Starting upgrade', {
        tierName,
        oldCredits,
        newCredits,
        creditIncrease: newCredits - oldCredits,
      });

      // Validate upgrade is an increase
      if (newCredits <= oldCredits) {
        logger.warn('CreditUpgradeService.processTierCreditUpgrade: Not an upgrade', {
          tierName,
          oldCredits,
          newCredits,
        });
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          errors: [],
        };
      }

      const additionalCredits = newCredits - oldCredits;

      // Find all active users on this tier
      const activeSubscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          tier: tierName as any,
          status: 'active',
        },
        select: {
          user_id: true,
          monthly_credit_allocation: true,
        },
      });

      logger.info(
        `CreditUpgradeService.processTierCreditUpgrade: Found ${activeSubscriptions.length} active users on ${tierName}`
      );

      let successfulCount = 0;
      let failedCount = 0;
      const errors: Array<{ userId: string; error: string }> = [];

      // Process each user
      for (const subscription of activeSubscriptions) {
        try {
          const isEligible = await this.isEligibleForUpgrade(
            subscription.user_id,
            tierName,
            newCredits
          );

          if (isEligible) {
            await this.applyUpgradeToUser(
              subscription.user_id,
              additionalCredits,
              reason,
              tierName
            );
            successfulCount++;
          } else {
            logger.debug(
              `CreditUpgradeService.processTierCreditUpgrade: User not eligible for upgrade`,
              { userId: subscription.user_id, tierName }
            );
            // Not eligible users are not counted as failures - they simply don't need upgrade
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error('CreditUpgradeService.processTierCreditUpgrade: User upgrade failed', {
            userId: subscription.user_id,
            error: errorMsg,
          });
          errors.push({
            userId: subscription.user_id,
            error: errorMsg,
          });
          failedCount++;
        }
      }

      const result: UpgradeResult = {
        totalProcessed: activeSubscriptions.length,
        successful: successfulCount,
        failed: failedCount,
        errors,
      };

      logger.info('CreditUpgradeService.processTierCreditUpgrade: Completed', {
        tierName,
        result,
        message: `Upgraded ${successfulCount} users on ${tierName} tier with ${additionalCredits} additional credits`,
      });

      return result;
    } catch (error) {
      logger.error('CreditUpgradeService.processTierCreditUpgrade: Failed', {
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if user is eligible for credit upgrade
   * User is eligible if their current allocation is less than new allocation
   */
  async isEligibleForUpgrade(
    userId: string,
    tierName: string,
    newCredits: number
  ): Promise<boolean> {
    try {
      logger.debug('CreditUpgradeService.isEligibleForUpgrade: Checking eligibility', {
        userId,
        tierName,
        newCredits,
      });

      // Get user's current subscription
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: {
          user_id: userId,
          tier: tierName as any,
          status: 'active',
        },
        select: {
          monthly_credit_allocation: true,
        },
      });

      if (!subscription) {
        logger.debug(
          `CreditUpgradeService.isEligibleForUpgrade: User has no active subscription on ${tierName}`,
          { userId, tierName }
        );
        return false;
      }

      // User is eligible if current allocation is less than new allocation
      const isEligible = subscription.monthly_credit_allocation < newCredits;

      logger.debug('CreditUpgradeService.isEligibleForUpgrade: Result', {
        userId,
        currentAllocation: subscription.monthly_credit_allocation,
        newCredits,
        isEligible,
      });

      return isEligible;
    } catch (error) {
      logger.error('CreditUpgradeService.isEligibleForUpgrade: Failed', {
        userId,
        tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Apply credit upgrade to specific user
   * Grants additional credits and updates subscription config
   */
  async applyUpgradeToUser(
    userId: string,
    additionalCredits: number,
    reason: string,
    tierName: string
  ): Promise<void> {
    try {
      logger.info('CreditUpgradeService.applyUpgradeToUser: Applying upgrade', {
        userId,
        additionalCredits,
        tierName,
        reason,
      });

      await this.prisma.$transaction(
        async (tx) => {
          // 1. Get user's subscription for subscription_id
          const subscription = await tx.subscription_monetization.findFirst({
            where: {
              user_id: userId,
              tier: tierName as any,
              status: 'active',
            },
          });

          if (!subscription) {
            throw new Error(`No active subscription found for user ${userId} on tier ${tierName}`);
          }

          // 2. Create credit allocation record (source: 'admin_grant' for tier upgrades)
          const allocation = await tx.credit_allocation.create({
            data: {
              id: randomUUID(),
              user_id: userId,
              subscription_id: subscription.id,
              amount: additionalCredits,
              allocation_period_start: new Date(),
              allocation_period_end: new Date(subscription.current_period_end),
              source: 'admin_grant',
            },
          });

          logger.debug('CreditUpgradeService.applyUpgradeToUser: Credit allocation created', {
            allocationId: allocation.id,
            userId,
            amount: additionalCredits,
          });

          // 3. Update user credit balance (Plan 112 integration)
          await tx.user_credit_balance.upsert({
            where: { user_id: userId },
            update: {
              amount: { increment: additionalCredits },
              updated_at: new Date(),
            },
            create: {
              user_id: userId,
              amount: additionalCredits,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          logger.debug('CreditUpgradeService.applyUpgradeToUser: Balance updated', {
            userId,
            creditIncrease: additionalCredits,
          });

          // 4. Update subscription monthly_credit_allocation to reflect new tier config
          await tx.subscription_monetization.update({
            where: { id: subscription.id },
            data: {
              monthly_credit_allocation: {
                increment: additionalCredits,
              },
              updated_at: new Date(),
            },
          });

          logger.debug(
            'CreditUpgradeService.applyUpgradeToUser: Subscription allocation updated',
            {
              subscriptionId: subscription.id,
              userId,
              newAllocation: subscription.monthly_credit_allocation + additionalCredits,
            }
          );
        },
        { isolationLevel: 'Serializable' }
      );

      logger.info('CreditUpgradeService.applyUpgradeToUser: Successfully upgraded user', {
        userId,
        additionalCredits,
        tierName,
      });
    } catch (error) {
      logger.error('CreditUpgradeService.applyUpgradeToUser: Failed to upgrade user', {
        userId,
        additionalCredits,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process pending scheduled upgrades
   * Batch processes all tiers with scheduled rollouts that are due
   */
  async processPendingUpgrades(): Promise<{
    processedTiers: number;
    totalUpgrades: number;
    errors: string[];
  }> {
    try {
      logger.info('CreditUpgradeService.processPendingUpgrades: Starting scheduled upgrades');

      const now = new Date();

      // Find all tier configs with pending rollouts that are due
      const pendingConfigs = await this.prisma.subscription_tier_config.findMany({
        where: {
          is_active: true,
          apply_to_existing_users: true,
          rollout_start_date: {
            lte: now,
          },
        },
        select: {
          tier_name: true,
          monthly_credit_allocation: true,
          rollout_start_date: true,
        },
      });

      logger.info(
        `CreditUpgradeService.processPendingUpgrades: Found ${pendingConfigs.length} pending rollouts`
      );

      let processedTiers = 0;
      let totalUpgrades = 0;
      const errors: string[] = [];

      for (const config of pendingConfigs) {
        try {
          // Get previous credit allocation from history
          const history = await this.prisma.tier_config_history.findFirst({
            where: {
              tier_name: config.tier_name,
              change_type: 'credit_increase',
              applied_at: null, // Not yet applied
            },
            orderBy: { changed_at: 'desc' },
          });

          if (!history) {
            logger.warn(
              `CreditUpgradeService.processPendingUpgrades: No history found for ${config.tier_name}`,
              { tierName: config.tier_name }
            );
            continue;
          }

          // Process the upgrade
          const result = await this.processTierCreditUpgrade(
            config.tier_name,
            history.previous_credits,
            history.new_credits,
            history.change_reason
          );

          // Mark history as applied if any users were processed
          if (result.totalProcessed > 0) {
            await this.prisma.tier_config_history.update({
              where: { id: history.id },
              data: { applied_at: new Date() },
            });

            // Clear rollout flag
            await this.prisma.subscription_tier_config.update({
              where: { tier_name: config.tier_name },
              data: {
                apply_to_existing_users: false,
                rollout_start_date: null,
              },
            });

            processedTiers++;
            totalUpgrades += result.successful;

            logger.info(
              `CreditUpgradeService.processPendingUpgrades: Processed tier ${config.tier_name}`,
              {
                successful: result.successful,
                failed: result.failed,
                totalProcessed: result.totalProcessed,
              }
            );
          }

          // Collect errors from failed upgrades
          if (result.errors.length > 0) {
            errors.push(
              ...result.errors.map((e) => `${config.tier_name}: User ${e.userId} - ${e.error}`)
            );
          }
        } catch (error) {
          const errorMsg = `Failed to process tier ${config.tier_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error('CreditUpgradeService.processPendingUpgrades: Tier processing failed', {
            tierName: config.tier_name,
            error: errorMsg,
          });
          errors.push(errorMsg);
        }
      }

      const summary = {
        processedTiers,
        totalUpgrades,
        errors,
      };

      logger.info('CreditUpgradeService.processPendingUpgrades: Completed', summary);

      return summary;
    } catch (error) {
      logger.error('CreditUpgradeService.processPendingUpgrades: Failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get upgrade eligibility summary for a tier
   * Shows how many users would be affected by an upgrade
   */
  async getUpgradeEligibilitySummary(
    tierName: string,
    newCredits: number
  ): Promise<{
    eligible: number;
    alreadyUpgraded: number;
    total: number;
  }> {
    try {
      logger.info('CreditUpgradeService.getUpgradeEligibilitySummary: Calculating summary', {
        tierName,
        newCredits,
      });

      // Get all active users on this tier
      const activeSubscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          tier: tierName as any,
          status: 'active',
        },
        select: {
          user_id: true,
          monthly_credit_allocation: true,
        },
      });

      const total = activeSubscriptions.length;
      let eligible = 0;
      let alreadyUpgraded = 0;

      for (const subscription of activeSubscriptions) {
        if (subscription.monthly_credit_allocation < newCredits) {
          eligible++;
        } else if (subscription.monthly_credit_allocation >= newCredits) {
          alreadyUpgraded++;
        }
      }

      const summary = {
        eligible,
        alreadyUpgraded,
        total,
      };

      logger.info('CreditUpgradeService.getUpgradeEligibilitySummary: Summary calculated', {
        tierName,
        newCredits,
        summary,
      });

      return summary;
    } catch (error) {
      logger.error('CreditUpgradeService.getUpgradeEligibilitySummary: Failed', {
        tierName,
        newCredits,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
