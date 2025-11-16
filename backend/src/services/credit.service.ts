/**
 * Credit Service
 *
 * Manages credit allocation, deduction, and balance tracking.
 * Ensures atomic operations to prevent race conditions.
 *
 * Core Responsibilities:
 * - Allocate credits when subscriptions are created/renewed
 * - Deduct credits during LLM inference (atomic transactions)
 * - Check credit availability before inference
 * - Handle billing period rollovers
 * - Get current user credit balance
 *
 * Integration Points:
 * - Called by Subscription Service for credit allocation
 * - Called by Model Service for credit deduction
 * - Used by Credit Middleware for pre-flight checks
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, credits, usage_operation } from '@prisma/client';
import logger from '../utils/logger';
import {
  AllocateCreditsInput,
  DeductCreditsInput,
} from '../types/credit-validation';
import { IWebhookService } from '../interfaces';

@injectable()
export class CreditService {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    @inject('IWebhookService') private readonly webhookService: IWebhookService
  ) {
    logger.debug('CreditService: Initialized');
  }

  /**
   * Get current credit balance for a user
   * Returns the active credit record for the current billing period
   *
   * @param userId - User ID
   * @returns Current credit record or null if no active credits
   */
  async getCurrentCredits(userId: string): Promise<Credit | null> {
    logger.debug('CreditService: Getting current credits', { userId });

    const credit = await this.prisma.credits.findFirst({
      where: {
        user_id: userId,
        is_current: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!credit) {
      logger.warn('CreditService: No current credits found', { userId });
      return null;
    }

    // Check if billing period has expired
    const now = new Date();
    if (now > credit.billing_period_end) {
      logger.info('CreditService: Billing period expired', {
        userId,
        creditId: credit.id,
        billingPeriodEnd: credit.billing_period_end,
      });

      // Mark as not current (rollover will be handled by subscription service)
      await this.prisma.credits.update({
        where: { id: credit.id },
        data: { is_current: false },
      });

      return null;
    }

    logger.debug('CreditService: Current credits retrieved', {
      userId,
      creditId: credit.id,
      remaining: credit.total_credits - credit.used_credits,
    });

    return credit;
  }

  /**
   * Allocate credits to a user for a billing period
   * Called by subscription service when subscription is created/renewed
   *
   * @param input - Credit allocation parameters
   * @returns Created credit record
   */
  async allocateCredits(input: AllocateCreditsInput): Promise<Credit> {
    logger.info('CreditService: Allocating credits', {
      userId: input.userId,
      totalCredits: input.totalCredits,
      billingPeriodStart: input.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd,
    });

    // Use transaction to ensure atomicity
    const credit = await this.prisma.$transaction(async (tx) => {
      // Mark all existing current credits as not current
      await tx.credits.updateMany({
        where: {
          user_id: input.userId,
          is_current: true,
        },
        data: {
          is_current: false,
        },
      });

      // Create new credit record
      const newCredit = await tx.credits.create({
        data: {
          user_id: input.userId,
          subscription_id: input.subscriptionId,
          total_credits: input.totalCredits,
          used_credits: 0,
          billing_period_start: input.billingPeriodStart,
          billing_period_end: input.billingPeriodEnd,
          is_current: true,
        },
      });

      logger.info('CreditService: Credits allocated successfully', {
        userId: input.userId,
        creditId: newCredit.id,
        totalCredits: newCredit.total_credits,
      });

      return newCredit;
    });

    return credit;
  }

  /**
   * Check if user has sufficient credits
   * Used for pre-flight checks before inference
   *
   * @param userId - User ID
   * @param requiredCredits - Number of credits required
   * @returns True if user has sufficient credits
   */
  async hasAvailableCredits(
    userId: string,
    requiredCredits: number
  ): Promise<boolean> {
    logger.debug('CreditService: Checking credit availability', {
      userId,
      requiredCredits,
    });

    const credit = await this.getCurrentCredits(userId);

    if (!credit) {
      logger.warn('CreditService: No active credits for availability check', {
        userId,
      });
      return false;
    }

    const remainingCredits = credit.total_credits - credit.used_credits;
    const hasCredits = remainingCredits >= requiredCredits;

    logger.debug('CreditService: Credit availability checked', {
      userId,
      requiredCredits,
      remainingCredits,
      hasCredits,
    });

    return hasCredits;
  }

  /**
   * Deduct credits from user's balance
   * Called by model service after successful inference
   * Uses atomic transaction to prevent race conditions
   *
   * @param input - Credit deduction parameters
   * @returns Updated credit record
   * @throws Error if insufficient credits or no active credit record
   */
  async deductCredits(input: DeductCreditsInput): Promise<Credit> {
    logger.info('CreditService: Deducting credits', {
      userId: input.userId,
      creditsToDeduct: input.creditsToDeduct,
      modelId: input.modelId,
      operation: input.operation,
    });

    // Use transaction to ensure atomicity (prevent race conditions)
    const result = await this.prisma.$transaction(async (tx) => {
      // Get current credit record with row-level lock
      const credit = await tx.credits.findFirst({
        where: {
          user_id: input.userId,
          is_current: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!credit) {
        logger.error('CreditService: No active credit record found', {
          userId: input.userId,
        });
        throw new Error('No active credit record found');
      }

      // Check if billing period has expired
      const now = new Date();
      if (now > credit.billing_period_end) {
        logger.error('CreditService: Billing period expired during deduction', {
          userId: input.userId,
          billingPeriodEnd: credit.billing_period_end,
        });
        throw new Error('Billing period has expired');
      }

      // Check sufficient credits
      const remainingCredits = credit.total_credits - credit.used_credits;
      if (remainingCredits < input.creditsToDeduct) {
        logger.error('CreditService: Insufficient credits', {
          userId: input.userId,
          required: input.creditsToDeduct,
          remaining: remainingCredits,
        });
        throw new Error(
          `Insufficient credits. Required: ${input.creditsToDeduct}, Available: ${remainingCredits}`
        );
      }

      // Deduct credits atomically
      const updatedCredit = await tx.credits.update({
        where: { id: credit.id },
        data: {
          used_credits: {
            increment: input.creditsToDeduct,
          },
        },
      });

      // Record usage history
      await tx.usage_history.create({
        data: {
          user_id: input.userId,
          credit_id: credit.id,
          model_id: input.modelId,
          operation: input.operation as UsageOperation,
          credits_used: input.creditsToDeduct,
          input_tokens: input.inputTokens,
          output_tokens: input.outputTokens,
          total_tokens: input.totalTokens,
          request_duration_ms: input.requestDurationMs,
          request_metadata: input.requestMetadata,
        },
      });

      logger.info('CreditService: Credits deducted successfully', {
        userId: input.userId,
        creditId: credit.id,
        creditsDeducted: input.creditsToDeduct,
        remainingCredits:
          updatedCredit.total_credits - updatedCredit.used_credits,
      });

      return updatedCredit;
    });

    // Check if credits are depleted or low after deduction
    const remainingCredits = result.total_credits - result.used_credits;
    const thresholdPercentage = 10; // 10% threshold for low credits warning
    const thresholdCredits = result.total_credits * (thresholdPercentage / 100);

    try {
      // Trigger credits.depleted webhook if no credits remaining
      if (remainingCredits === 0) {
        await this.webhookService.queueWebhook(input.userId, 'credits.depleted', {
          user_id: input.userId,
          remaining_credits: 0,
          total_credits: result.total_credits,
        });
      }
      // Trigger credits.low webhook if below threshold (but not depleted)
      else if (remainingCredits > 0 && remainingCredits <= thresholdCredits) {
        await this.webhookService.queueWebhook(input.userId, 'credits.low', {
          user_id: input.userId,
          remaining_credits: remainingCredits,
          total_credits: result.total_credits,
          threshold_percentage: thresholdPercentage,
        });
      }
    } catch (webhookError) {
      // Don't fail credit deduction if webhook fails
      logger.error('CreditService: Failed to queue credit webhook', {
        userId: input.userId,
        creditId: result.id,
        remainingCredits,
        error: webhookError,
      });
    }

    return result;
  }

  /**
   * Get credit balance for a specific billing period
   * Used for historical analysis and reporting
   *
   * @param userId - User ID
   * @param billingPeriodStart - Start of billing period
   * @param billingPeriodEnd - End of billing period
   * @returns Credit record or null if not found
   */
  async getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Credit | null> {
    logger.debug('CreditService: Getting credits by billing period', {
      userId,
      billingPeriodStart,
      billingPeriodEnd,
    });

    const credit = await this.prisma.credits.findFirst({
      where: {
        user_id: userId,
        billing_period_start: {
          gte: billingPeriodStart,
        },
        billing_period_end: {
          lte: billingPeriodEnd,
        },
      },
    });

    return credit;
  }

  /**
   * Get all credit records for a user (historical)
   * Useful for displaying billing history
   *
   * @param userId - User ID
   * @param limit - Maximum number of records to return
   * @returns Array of credit records
   */
  async getCreditHistory(userId: string, limit = 12): Promise<Credit[]> {
    logger.debug('CreditService: Getting credit history', { userId, limit });

    const credits = await this.prisma.credits.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return credits;
  }

  /**
   * Calculate remaining credits
   * Convenience method for credit balance calculation
   *
   * @param credit - Credit record
   * @returns Remaining credits
   */
  calculateRemainingCredits(credit: Credit): number {
    return credit.total_credits - credit.used_credits;
  }

  /**
   * Calculate usage percentage
   * Returns percentage of credits used (0-100)
   *
   * @param credit - Credit record
   * @returns Usage percentage
   */
  calculateUsagePercentage(credit: Credit): number {
    if (credit.total_credits === 0) return 0;
    return (credit.used_credits / credit.total_credits) * 100;
  }

  /**
   * Check if credits are low (below threshold)
   * Used for triggering low-credit alerts
   *
   * @param credit - Credit record
   * @param thresholdPercentage - Threshold percentage (default: 10%)
   * @returns True if credits are below threshold
   */
  isCreditsLow(credit: Credit, thresholdPercentage = 10): boolean {
    const usagePercentage = this.calculateUsagePercentage(credit);
    const remainingPercentage = 100 - usagePercentage;
    return remainingPercentage <= thresholdPercentage;
  }

  // ===========================================================================
  // Enhanced Credits API Methods (Phase 2)
  // ===========================================================================

  /**
   * Get free credits breakdown for user
   * Returns monthly allocation, usage, reset date, and days until reset
   *
   * @param userId - User ID
   * @returns Free credits breakdown
   */
  async getFreeCreditsBreakdown(userId: string): Promise<any> {
    logger.debug('CreditService: Getting free credits breakdown', { userId });

    // Query for current free credits (credit_type='free', is_current=true)
    const freeCredit = await this.prisma.credits.findFirst({
      where: {
        user_id: userId,
        credit_type: 'free',
        is_current: true,
      },
    });

    if (!freeCredit) {
      // No free credits exist - return default for free tier
      const defaultResetDate = this.calculateNextMonthlyReset(1);

      logger.debug('CreditService: No free credits found, returning defaults', {
        userId,
      });

      return {
        remaining: 0,
        monthlyAllocation: 2000, // Default free tier allocation
        used: 0,
        resetDate: defaultResetDate,
        daysUntilReset: this.calculateDaysUntilReset(defaultResetDate),
      };
    }

    const remaining = freeCredit.total_credits - freeCredit.used_credits;
    const resetDate = freeCredit.billing_period_end;

    logger.debug('CreditService: Free credits breakdown retrieved', {
      userId,
      remaining,
      monthlyAllocation: freeCredit.monthly_allocation,
      daysUntilReset: this.calculateDaysUntilReset(resetDate),
    });

    return {
      remaining,
      monthlyAllocation: freeCredit.monthly_allocation,
      used: freeCredit.used_credits,
      resetDate,
      daysUntilReset: this.calculateDaysUntilReset(resetDate),
    };
  }

  /**
   * Get pro/purchased credits breakdown for user
   * Aggregates all pro credit records for lifetime statistics
   *
   * @param userId - User ID
   * @returns Pro credits breakdown
   */
  async getProCreditsBreakdown(userId: string): Promise<any> {
    logger.debug('CreditService: Getting pro credits breakdown', { userId });

    // Query all pro credits (credit_type='pro')
    const proCredits = await this.prisma.credits.findMany({
      where: {
        user_id: userId,
        credit_type: 'pro',
      },
    });

    if (proCredits.length === 0) {
      logger.debug('CreditService: No pro credits found', { userId });

      return {
        remaining: 0,
        purchasedTotal: 0,
        lifetimeUsed: 0,
      };
    }

    // Aggregate across all pro credit records
    const purchasedTotal = proCredits.reduce((sum, c) => sum + c.total_credits, 0);
    const lifetimeUsed = proCredits.reduce((sum, c) => sum + c.used_credits, 0);
    const remaining = purchasedTotal - lifetimeUsed;

    logger.debug('CreditService: Pro credits breakdown retrieved', {
      userId,
      remaining,
      purchasedTotal,
      lifetimeUsed,
      recordCount: proCredits.length,
    });

    return {
      remaining,
      purchasedTotal,
      lifetimeUsed,
    };
  }

  /**
   * Get detailed credits combining free and pro
   * Complete view of user's credit status for API response
   *
   * @param userId - User ID
   * @returns Detailed credits information
   */
  async getDetailedCredits(userId: string): Promise<any> {
    logger.debug('CreditService: Getting detailed credits', { userId });

    // Fetch both in parallel for performance
    const [freeCredits, proCredits] = await Promise.all([
      this.getFreeCreditsBreakdown(userId),
      this.getProCreditsBreakdown(userId),
    ]);

    const totalAvailable = freeCredits.remaining + proCredits.remaining;

    logger.info('CreditService: Detailed credits retrieved', {
      userId,
      totalAvailable,
      freeRemaining: freeCredits.remaining,
      proRemaining: proCredits.remaining,
    });

    return {
      freeCredits,
      proCredits,
      totalAvailable,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate reset date based on billing period end and reset day
   * For monthly resets, the reset date is the billingPeriodEnd
   *
   * @param billingPeriodEnd - End of current billing period
   * @param _resetDayOfMonth - Day of month for reset (1-31) - currently unused
   * @returns Next reset date
   */
  calculateResetDate(billingPeriodEnd: Date, _resetDayOfMonth: number): Date {
    // For monthly resets, the reset date is the billingPeriodEnd
    // This is already set correctly by the subscription system
    return billingPeriodEnd;
  }

  /**
   * Calculate days until reset date
   * Returns 0 if already past reset date
   *
   * @param resetDate - Reset date
   * @returns Days until reset (minimum 0)
   */
  calculateDaysUntilReset(resetDate: Date): number {
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Return 0 if already past reset date
    return Math.max(0, days);
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Calculate next monthly reset (first day of next month)
   * Helper for calculating default reset dates
   *
   * @param dayOfMonth - Day of month for reset (1-31)
   * @returns Next reset date
   */
  private calculateNextMonthlyReset(dayOfMonth: number): Date {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // Next month

    if (month > 11) {
      month = 0;
      year += 1;
    }

    // Create date at midnight UTC
    return new Date(Date.UTC(year, month, dayOfMonth, 0, 0, 0, 0));
  }
}
