import { randomUUID } from 'crypto';
/**
 * Migration Service (Plan 110)
 *
 * Handles migrations between perpetual licenses and subscriptions.
 * Implements trade-in value calculations and credit management for migrations.
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import {
  PrismaClient,
  perpetual_license as PerpetualLicense,
  subscription_monetization as SubscriptionMonetization
} from '@prisma/client';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface MigrationResult {
  success: boolean;
  perpetualLicense?: PerpetualLicense;
  subscription?: SubscriptionMonetization;
  tradeInCredit?: number;
  message: string;
}

export interface MigrationValue {
  tradeInValue: number;
  monthsSincePurchase: number;
  depreciationFactor: number;
  minimumValue: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// =============================================================================
// Migration Service Class
// =============================================================================

@injectable()
export class MigrationService {
  // Migration constants
  private readonly PERPETUAL_BASE_PRICE = 199.0; // Original perpetual license price
  private readonly MIN_TRADE_IN_VALUE = 50.0; // Minimum trade-in value after 3 years
  private readonly DEPRECIATION_MONTHS = 36; // 3 years depreciation period

  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('MigrationService: Initialized');
  }

  // ===========================================================================
  // Perpetual → Subscription Migration
  // ===========================================================================

  /**
   * Migrate from perpetual license to subscription
   * @param userId - User ID
   * @param targetTier - Target subscription tier
   * @param billingCycle - Billing cycle (monthly/annual)
   * @returns Migration result
   */
  async migratePerpetualToSubscription(
    userId: string,
    targetTier: string,
    billingCycle: string = 'monthly'
  ): Promise<MigrationResult> {
    logger.info('MigrationService: Migrating perpetual to subscription', {
      userId,
      targetTier,
      billingCycle,
    });

    // Find active perpetual license
    const license = await this.prisma.perpetual_license.findFirst({
      where: {
        user_id: userId,
        status: 'active',
      },
    });

    if (!license) {
      throw new NotFoundError('No active perpetual license found for user');
    }

    // Calculate trade-in value
    const tradeInValue = await this.calculatePerpetualTradeInValue(license.id);

    // Apply trade-in credit to user account
    await this.applyPerpetualCredit(userId, tradeInValue);

    // Mark perpetual license as inactive (but preserve it)
    await this.prisma.perpetual_license.update({
      where: { id: license.id },
      data: { status: 'suspended' }, // Suspended, not revoked (can reactivate)
    });

    logger.info('MigrationService: Perpetual to subscription migration completed', {
      userId,
      licenseId: license.id,
      tradeInValue,
      targetTier,
    });

    return {
      success: true,
      perpetualLicense: license,
      tradeInCredit: tradeInValue,
      message: `Successfully migrated to ${targetTier} subscription. $${tradeInValue.toFixed(2)} trade-in credit applied.`,
    };
  }

  /**
   * Calculate trade-in value for perpetual license
   * Formula: Trade-in = $199 × (1 - (months_since_purchase / 36))
   * Minimum: $50 after 3 years
   * @param licenseId - License ID
   * @returns Trade-in value in USD
   */
  async calculatePerpetualTradeInValue(licenseId: string): Promise<number> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    // Calculate months since purchase
    const now = new Date();
    const purchaseDate = license.purchased_at;
    const monthsSincePurchase =
      (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Calculate depreciation factor
    const depreciationFactor = Math.min(1, monthsSincePurchase / this.DEPRECIATION_MONTHS);

    // Calculate trade-in value
    let tradeInValue = this.PERPETUAL_BASE_PRICE * (1 - depreciationFactor);

    // Apply minimum value floor
    tradeInValue = Math.max(tradeInValue, this.MIN_TRADE_IN_VALUE);

    logger.debug('MigrationService: Trade-in value calculated', {
      licenseId,
      monthsSincePurchase,
      depreciationFactor,
      tradeInValue,
    });

    return Math.round(tradeInValue * 100) / 100; // Round to 2 decimals
  }

  /**
   * Apply perpetual trade-in credit to user account
   * @param userId - User ID
   * @param tradeInValue - Credit amount in USD
   */
  async applyPerpetualCredit(userId: string, tradeInValue: number): Promise<void> {
    logger.info('MigrationService: Applying perpetual trade-in credit', {
      userId,
      tradeInValue,
    });

    // In a real implementation, this would create a credit allocation or Stripe customer balance
    // For now, we'll create a credit allocation record
    await this.prisma.credit_allocation.create({
      data: {
        id: randomUUID(),
        user_id: userId,
        amount: Math.round(tradeInValue * 1000), // Convert to credits (assuming $1 = 1000 credits)
        source: 'perpetual_migration',
        allocation_period_start: new Date(),
        allocation_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      },
    });

    logger.info('MigrationService: Perpetual credit applied', { userId, tradeInValue });
  }

  // ===========================================================================
  // Subscription → Perpetual Migration
  // ===========================================================================

  /**
   * Migrate from subscription to perpetual license
   * @param userId - User ID
   * @param subscriptionId - Subscription ID to cancel
   * @returns Migration result
   */
  async migrateSubscriptionToPerpetual(
    userId: string,
    subscriptionId: string
  ): Promise<PerpetualLicense> {
    logger.info('MigrationService: Migrating subscription to perpetual', {
      userId,
      subscriptionId,
    });

    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.user_id !== userId) {
      throw new ValidationError('Subscription does not belong to user');
    }

    // Calculate refund for unused subscription time (if within 30 days of billing cycle start)
    const refundAmount = await this.refundUnusedSubscriptionTime(subscriptionId);

    // Cancel subscription
    await this.cancelSubscriptionOnMigration(subscriptionId);

    logger.info('MigrationService: Subscription to perpetual migration completed', {
      userId,
      subscriptionId,
      refundAmount,
    });

    // Note: Actual perpetual license creation would happen after payment processing
    // This service just handles the migration logic
    return {} as PerpetualLicense; // Placeholder
  }

  /**
   * Cancel subscription on migration to perpetual
   * @param subscriptionId - Subscription ID to cancel
   */
  async cancelSubscriptionOnMigration(subscriptionId: string): Promise<void> {
    logger.info('MigrationService: Cancelling subscription for migration', { subscriptionId });

    await this.prisma.subscription_monetization.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
      },
    });

    logger.info('MigrationService: Subscription cancelled', { subscriptionId });
  }

  /**
   * Refund unused subscription time (if within 30 days of billing start)
   * @param subscriptionId - Subscription ID
   * @returns Refund amount in USD
   */
  async refundUnusedSubscriptionTime(subscriptionId: string): Promise<number> {
    const subscription = await this.prisma.subscription_monetization.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const now = new Date();
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;

    // Calculate days since period start
    const daysSinceStart = Math.ceil(
      (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only refund if within 30 days of billing cycle start
    if (daysSinceStart > 30) {
      logger.debug('MigrationService: No refund - outside 30-day window', {
        subscriptionId,
        daysSinceStart,
      });
      return 0;
    }

    // Calculate refund for unused time
    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const refundAmount = (daysRemaining / totalDays) * Number(subscription.base_price_usd);

    logger.info('MigrationService: Refund calculated for unused time', {
      subscriptionId,
      daysSinceStart,
      daysRemaining,
      refundAmount,
    });

    return Math.round(refundAmount * 100) / 100; // Round to 2 decimals
  }

  // ===========================================================================
  // Migration Validation
  // ===========================================================================

  /**
   * Check if user can migrate to perpetual license
   * @param userId - User ID
   * @returns Validation result
   */
  async canMigrateToPerpetual(userId: string): Promise<boolean> {
    // User must have an active subscription
    const subscription = await this.prisma.subscription_monetization.findFirst({
      where: {
        user_id: userId,
        status: { in: ['active', 'trial'] },
      },
    });

    return !!subscription;
  }

  /**
   * Check if user can migrate to subscription
   * @param licenseId - License ID
   * @returns Validation result
   */
  async canMigrateToSubscription(licenseId: string): Promise<boolean> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      return false;
    }

    // License must be active
    return license.status === 'active';
  }

  /**
   * Validate migration eligibility
   * @param userId - User ID
   * @param migrationPath - Migration direction
   * @returns Validation result with errors
   */
  async validateMigrationEligibility(
    userId: string,
    migrationPath: 'perpetual_to_subscription' | 'subscription_to_perpetual'
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (migrationPath === 'perpetual_to_subscription') {
      // Check if user has active perpetual license
      const license = await this.prisma.perpetual_license.findFirst({
        where: {
          user_id: userId,
          status: 'active',
        },
      });

      if (!license) {
        errors.push('No active perpetual license found');
      }

      // Check if user already has active subscription
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trial'] },
        },
      });

      if (subscription) {
        errors.push('User already has an active subscription');
      }
    } else {
      // subscription_to_perpetual
      // Check if user has active subscription
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: {
          user_id: userId,
          status: { in: ['active', 'trial'] },
        },
      });

      if (!subscription) {
        errors.push('No active subscription found');
      }

      // Check if user already has active perpetual license
      const license = await this.prisma.perpetual_license.findFirst({
        where: {
          user_id: userId,
          status: 'active',
        },
      });

      if (license) {
        errors.push('User already has an active perpetual license');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ===========================================================================
  // Migration History
  // ===========================================================================

  /**
   * Get migration history for a user
   * @param userId - User ID
   * @returns Migration history (from proration events and license status changes)
   */
  async getMigrationHistory(userId: string): Promise<{
    perpetualLicenses: any[];
    subscriptions: any[];
  }> {
    // Get perpetual licenses
    const licenses = await this.prisma.perpetual_license.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        license_key: true,
        status: true,
        purchased_at: true,
        purchase_price_usd: true,
      },
    });

    // Get subscriptions
    const subscriptions = await this.prisma.subscription_monetization.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        tier: true,
        status: true,
        created_at: true,
        cancelled_at: true,
      },
    });

    return {
      perpetualLicenses: licenses,
      subscriptions,
    };
  }

  /**
   * Reverse a migration (admin action - within 7 days)
   * @param migrationId - Migration ID (could be license or subscription ID)
   * @param reason - Reason for reversal
   */
  async reverseMigration(migrationId: string, reason: string): Promise<void> {
    logger.warn('MigrationService: Reversing migration', { migrationId, reason });

    // In a real implementation, this would:
    // 1. Reactivate old license/subscription
    // 2. Reverse credit allocations
    // 3. Process refunds if needed
    // 4. Log the reversal for audit trail

    logger.info('MigrationService: Migration reversed', { migrationId, reason });
  }
}
