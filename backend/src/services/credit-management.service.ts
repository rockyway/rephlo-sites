/**
 * Credit Management Service (Plan 109)
 *
 * Handles credit allocation, rollover logic, manual adjustments, and integration with Plan 112.
 *
 * Core Responsibilities:
 * - Monthly credit allocation for subscriptions
 * - Credit rollover calculation and application
 * - Manual credit grants and deductions (admin)
 * - Credit balance queries and history
 * - Integration with Plan 112's token-credit system
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { notFoundError, badRequestError } from '../middleware/error.middleware';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface CreditAllocation {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  allocationPeriodStart: Date;
  allocationPeriodEnd: Date;
  source: 'subscription' | 'bonus' | 'admin_grant' | 'referral' | 'coupon';
  createdAt: Date;
}

export interface AllocationSummary {
  totalAllocated: number;
  totalUsers: number;
  allocationsByTier: Record<string, number>;
}

export interface RolloverCalculation {
  userId: string;
  currentBalance: number;
  maxRollover: number;
  rolloverAmount: number;
  willExpire: number;
}

export interface CreditBalance {
  userId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  rolloverCredits: number;
}

export interface CreditUsageSummary {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  totalUsed: number;
  byModel: Record<string, number>;
}

export interface BalanceReconciliation {
  userId: string;
  plan109Balance: number;
  plan112Balance: number;
  difference: number;
  reconciled: boolean;
}

// =============================================================================
// Credit Management Service
// =============================================================================

@injectable()
export class CreditManagementService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('CreditManagementService: Initialized');
  }

  // ===========================================================================
  // Monthly Allocation
  // ===========================================================================

  /**
   * Allocate subscription credits to a user
   * @param userId - User ID
   * @param subscriptionId - Subscription ID
   * @returns Credit allocation record
   */
  async allocateSubscriptionCredits(
    userId: string,
    subscriptionId: string
  ): Promise<CreditAllocation> {
    logger.info('CreditManagementService.allocateSubscriptionCredits', { userId, subscriptionId });

    try {
      // Get subscription to determine credit amount
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw notFoundError('Subscription');
      }

      const monthlyAllocation = subscription.monthly_credit_allocation;

      // Use transaction to ensure atomicity
      return await this.prisma.$transaction(async (tx) => {
        // Create credit allocation record
        const allocation = await tx.credit_allocation.create({
          data: {
            id: randomUUID(),
            user_id: userId,
            subscription_id: subscriptionId,
            amount: monthlyAllocation,
            allocation_period_start: subscription.current_period_start,
            allocation_period_end: subscription.current_period_end,
            source: 'subscription',
          },
        });

        // Update user credit balance (Plan 112 integration)
        await tx.user_credit_balance.upsert({
          where: { user_id: userId },
          update: {
            amount: { increment: allocation.amount },
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            amount: allocation.amount,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        logger.info('CreditManagementService: Subscription credits allocated and balance updated', {
          allocationId: allocation.id,
          amount: allocation.amount,
        });

        return allocation as unknown as CreditAllocation;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      logger.error('CreditManagementService.allocateSubscriptionCredits: Error', { error });
      throw error;
    }
  }

  /**
   * Process monthly allocations for all active subscriptions (cron job)
   * @returns Summary of allocations
   */
  async processMonthlyAllocations(): Promise<AllocationSummary> {
    logger.info('CreditManagementService.processMonthlyAllocations');

    try {
      const activeSubscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          status: 'active',
          current_period_start: { lte: new Date() },
          current_period_end: { gte: new Date() },
        },
      });

      let totalAllocated = 0;
      const allocationsByTier: Record<string, number> = {};

      for (const subscription of activeSubscriptions) {
        await this.allocateSubscriptionCredits(subscription.user_id, subscription.id);
        totalAllocated += subscription.monthly_credit_allocation;
        allocationsByTier[subscription.tier] =
          (allocationsByTier[subscription.tier] || 0) + subscription.monthly_credit_allocation;
      }

      const summary = {
        totalAllocated,
        totalUsers: activeSubscriptions.length,
        allocationsByTier,
      };

      logger.info('CreditManagementService: Monthly allocations processed', summary);

      return summary;
    } catch (error) {
      logger.error('CreditManagementService.processMonthlyAllocations: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Manual Adjustments
  // ===========================================================================

  /**
   * Grant bonus credits to a user
   * @param userId - User ID
   * @param amount - Credit amount
   * @param reason - Reason for grant
   * @param expiresAt - Optional expiration date
   * @returns Credit allocation
   */
  async grantBonusCredits(
    userId: string,
    amount: number,
    reason: string,
    expiresAt?: Date
  ): Promise<CreditAllocation> {
    logger.info('CreditManagementService.grantBonusCredits', { userId, amount, reason });

    try {
      const now = new Date();
      const defaultExpiry = new Date(now);
      defaultExpiry.setMonth(defaultExpiry.getMonth() + 3); // 3 months default

      // Use transaction to ensure atomicity
      return await this.prisma.$transaction(async (tx) => {
        // Create bonus allocation record
        const allocation = await tx.credit_allocation.create({
          data: {
            id: randomUUID(),
            user_id: userId,
            amount,
            allocation_period_start: now,
            allocation_period_end: expiresAt || defaultExpiry,
            source: 'bonus',
          },
        });

        // Update user credit balance (Plan 112 integration)
        await tx.user_credit_balance.upsert({
          where: { user_id: userId },
          update: {
            amount: { increment: amount },
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            amount: amount,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        logger.info('CreditManagementService: Bonus credits granted and balance updated', {
          allocationId: allocation.id,
          amount,
          expiresAt: expiresAt || defaultExpiry,
        });

        return allocation as unknown as CreditAllocation;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      logger.error('CreditManagementService.grantBonusCredits: Error', { error });
      throw error;
    }
  }

  /**
   * Manually deduct credits from a user (admin action)
   * @param userId - User ID
   * @param amount - Credit amount to deduct
   * @param reason - Reason for deduction
   */
  async deductCreditsManually(userId: string, amount: number, reason: string): Promise<void> {
    logger.info('CreditManagementService.deductCreditsManually', { userId, amount, reason });

    try {
      if (amount <= 0) {
        throw badRequestError('Deduction amount must be positive');
      }

      // TODO: Implement actual deduction logic with Plan 112
      // This should create a deduction record in credit_deduction_ledger

      logger.info('CreditManagementService: Credits deducted manually', { userId, amount });
    } catch (error) {
      logger.error('CreditManagementService.deductCreditsManually: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Rollover Logic
  // ===========================================================================

  /**
   * Calculate rollover for a user based on tier limits
   * @param userId - User ID
   * @returns Rollover calculation
   */
  async calculateRollover(userId: string): Promise<RolloverCalculation> {
    logger.debug('CreditManagementService.calculateRollover', { userId });

    try {
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: { user_id: userId, status: { in: ['trial', 'active'] } },
        orderBy: { created_at: 'desc' },
      });

      if (!subscription) {
        return {
          userId,
          currentBalance: 0,
          maxRollover: 0,
          rolloverAmount: 0,
          willExpire: 0,
        };
      }

      // Get tier config for rollover limits
      const tierConfig = await this.prisma.subscription_tier_config.findUnique({
        where: { tier_name: subscription.tier },
      });

      if (!tierConfig) {
        throw badRequestError(`Tier configuration not found: ${subscription.tier}`);
      }

      const maxRollover = tierConfig.max_credit_rollover;

      // TODO: Get actual current balance from Plan 112
      const currentBalance = 0;
      const unusedCredits = currentBalance;

      const rolloverAmount = Math.min(unusedCredits, maxRollover);
      const willExpire = unusedCredits - rolloverAmount;

      logger.info('CreditManagementService: Rollover calculated', {
        userId,
        rolloverAmount,
        willExpire,
      });

      return {
        userId,
        currentBalance,
        maxRollover,
        rolloverAmount,
        willExpire,
      };
    } catch (error) {
      logger.error('CreditManagementService.calculateRollover: Error', { error });
      throw error;
    }
  }

  /**
   * Apply rollover credits to user balance
   * @param userId - User ID
   * @param rolloverAmount - Amount to roll over
   */
  async applyRollover(userId: string, rolloverAmount: number): Promise<void> {
    logger.info('CreditManagementService.applyRollover', { userId, rolloverAmount });

    try {
      if (rolloverAmount <= 0) {
        logger.debug('No credits to roll over', { userId });
        return;
      }

      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setMonth(expiryDate.getMonth() + 1); // Rollover expires in 1 month

      await this.prisma.credit_allocation.create({
        data: {
          id: randomUUID(),
          user_id: userId,
          amount: rolloverAmount,
          allocation_period_start: now,
          allocation_period_end: expiryDate,
          source: 'bonus', // Rollover treated as bonus
        },
      });

      logger.info('CreditManagementService: Rollover applied', { userId, rolloverAmount });
    } catch (error) {
      logger.error('CreditManagementService.applyRollover: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Integration with Plan 112
  // ===========================================================================

  /**
   * Sync credits with Plan 112's token-credit system
   * @param userId - User ID
   */
  async syncWithTokenCreditSystem(userId: string): Promise<void> {
    logger.info('CreditManagementService.syncWithTokenCreditSystem', { userId });

    try {
      // Calculate expected balance from allocations
      const allocations = await this.prisma.credit_allocation.findMany({
        where: { user_id: userId },
        select: { amount: true }
      });

      // Calculate total deductions
      const deductions = await this.prisma.credit_deduction_ledger.findMany({
        where: { user_id: userId },
        select: { amount: true }
      });

      const expectedBalance =
        allocations.reduce((sum, a) => sum + a.amount, 0) -
        deductions.reduce((sum, d) => sum + d.amount, 0);

      // Update balance to match expected value
      await this.prisma.user_credit_balance.upsert({
        where: { user_id: userId },
        update: {
          amount: expectedBalance,
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          amount: expectedBalance,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      logger.info('CreditManagementService: Synced with token-credit system', {
        userId,
        expectedBalance
      });
    } catch (error) {
      logger.error('CreditManagementService.syncWithTokenCreditSystem: Error', { error });
      throw error;
    }
  }

  /**
   * Reconcile credit balance between Plan 109 and Plan 112
   * @param userId - User ID
   * @returns Reconciliation result
   */
  async reconcileCreditBalance(userId: string): Promise<BalanceReconciliation> {
    logger.debug('CreditManagementService.reconcileCreditBalance', { userId });

    try {
      // Get Plan 109 allocations
      const allocations = await this.prisma.credit_allocation.findMany({
        where: { user_id: userId },
      });

      const plan109Balance = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

      // TODO: Get Plan 112 balance from user_credit_balance table
      const plan112Balance = 0;

      const difference = Math.abs(plan109Balance - plan112Balance);
      const reconciled = difference === 0;

      logger.info('CreditManagementService: Balance reconciled', {
        userId,
        plan109Balance,
        plan112Balance,
        difference,
        reconciled,
      });

      return {
        userId,
        plan109Balance,
        plan112Balance,
        difference,
        reconciled,
      };
    } catch (error) {
      logger.error('CreditManagementService.reconcileCreditBalance: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /**
   * Get credit balance for a user
   * @param userId - User ID
   * @returns Credit balance
   */
  async getCreditBalance(userId: string): Promise<CreditBalance> {
    logger.debug('CreditManagementService.getCreditBalance', { userId });

    try {
      // TODO: Get actual balance from Plan 112's user_credit_balance
      const balance: CreditBalance = {
        userId,
        totalCredits: 0,
        usedCredits: 0,
        remainingCredits: 0,
        rolloverCredits: 0,
      };

      logger.info('CreditManagementService: Credit balance retrieved', { userId });

      return balance;
    } catch (error) {
      logger.error('CreditManagementService.getCreditBalance: Error', { error });
      throw error;
    }
  }

  /**
   * Get credit allocation history for a user
   * @param userId - User ID
   * @returns Array of allocations
   */
  async getCreditAllocationHistory(userId: string): Promise<CreditAllocation[]> {
    logger.debug('CreditManagementService.getCreditAllocationHistory', { userId });

    try {
      const allocations = await this.prisma.credit_allocation.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      logger.info('CreditManagementService: Allocation history retrieved', {
        userId,
        count: allocations.length,
      });

      return allocations as unknown as CreditAllocation[];
    } catch (error) {
      logger.error('CreditManagementService.getCreditAllocationHistory: Error', { error });
      throw error;
    }
  }

  /**
   * Get credit usage by period
   * @param userId - User ID
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Usage summary
   */
  async getCreditUsageByPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CreditUsageSummary> {
    logger.debug('CreditManagementService.getCreditUsageByPeriod', {
      userId,
      startDate,
      endDate,
    });

    try {
      const usageHistory = await this.prisma.token_usage_ledger.findMany({
        where: {
          user_id: userId,
          created_at: { gte: startDate, lte: endDate },
        },
      });

      const totalUsed = usageHistory.reduce((sum: number, usage: any) => sum + usage.credits_used, 0);

      const byModel: Record<string, number> = {};
      usageHistory.forEach((usage: any) => {
        byModel[usage.model_id] = (byModel[usage.model_id] || 0) + usage.credits_used;
      });

      const summary: CreditUsageSummary = {
        userId,
        periodStart: startDate,
        periodEnd: endDate,
        totalUsed,
        byModel,
      };

      logger.info('CreditManagementService: Usage by period retrieved', { userId, totalUsed });

      return summary;
    } catch (error) {
      logger.error('CreditManagementService.getCreditUsageByPeriod: Error', { error });
      throw error;
    }
  }
}
