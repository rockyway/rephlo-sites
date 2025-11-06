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

import { PrismaClient, Credit, UsageOperation } from '@prisma/client';
import logger from '../utils/logger';
import {
  AllocateCreditsInput,
  DeductCreditsInput,
} from '../types/credit-validation';

export class CreditService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get current credit balance for a user
   * Returns the active credit record for the current billing period
   *
   * @param userId - User ID
   * @returns Current credit record or null if no active credits
   */
  async getCurrentCredits(userId: string): Promise<Credit | null> {
    logger.debug('CreditService: Getting current credits', { userId });

    const credit = await this.prisma.credit.findFirst({
      where: {
        userId,
        isCurrent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!credit) {
      logger.warn('CreditService: No current credits found', { userId });
      return null;
    }

    // Check if billing period has expired
    const now = new Date();
    if (now > credit.billingPeriodEnd) {
      logger.info('CreditService: Billing period expired', {
        userId,
        creditId: credit.id,
        billingPeriodEnd: credit.billingPeriodEnd,
      });

      // Mark as not current (rollover will be handled by subscription service)
      await this.prisma.credit.update({
        where: { id: credit.id },
        data: { isCurrent: false },
      });

      return null;
    }

    logger.debug('CreditService: Current credits retrieved', {
      userId,
      creditId: credit.id,
      remaining: credit.totalCredits - credit.usedCredits,
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
      await tx.credit.updateMany({
        where: {
          userId: input.userId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });

      // Create new credit record
      const newCredit = await tx.credit.create({
        data: {
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          totalCredits: input.totalCredits,
          usedCredits: 0,
          billingPeriodStart: input.billingPeriodStart,
          billingPeriodEnd: input.billingPeriodEnd,
          isCurrent: true,
        },
      });

      logger.info('CreditService: Credits allocated successfully', {
        userId: input.userId,
        creditId: newCredit.id,
        totalCredits: newCredit.totalCredits,
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

    const remainingCredits = credit.totalCredits - credit.usedCredits;
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
      const credit = await tx.credit.findFirst({
        where: {
          userId: input.userId,
          isCurrent: true,
        },
        orderBy: {
          createdAt: 'desc',
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
      if (now > credit.billingPeriodEnd) {
        logger.error('CreditService: Billing period expired during deduction', {
          userId: input.userId,
          billingPeriodEnd: credit.billingPeriodEnd,
        });
        throw new Error('Billing period has expired');
      }

      // Check sufficient credits
      const remainingCredits = credit.totalCredits - credit.usedCredits;
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
      const updatedCredit = await tx.credit.update({
        where: { id: credit.id },
        data: {
          usedCredits: {
            increment: input.creditsToDeduct,
          },
        },
      });

      // Record usage history
      await tx.usageHistory.create({
        data: {
          userId: input.userId,
          creditId: credit.id,
          modelId: input.modelId,
          operation: input.operation as UsageOperation,
          creditsUsed: input.creditsToDeduct,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          totalTokens: input.totalTokens,
          requestDurationMs: input.requestDurationMs,
          requestMetadata: input.requestMetadata,
        },
      });

      logger.info('CreditService: Credits deducted successfully', {
        userId: input.userId,
        creditId: credit.id,
        creditsDeducted: input.creditsToDeduct,
        remainingCredits:
          updatedCredit.totalCredits - updatedCredit.usedCredits,
      });

      return updatedCredit;
    });

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

    const credit = await this.prisma.credit.findFirst({
      where: {
        userId,
        billingPeriodStart: {
          gte: billingPeriodStart,
        },
        billingPeriodEnd: {
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

    const credits = await this.prisma.credit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
    return credit.totalCredits - credit.usedCredits;
  }

  /**
   * Calculate usage percentage
   * Returns percentage of credits used (0-100)
   *
   * @param credit - Credit record
   * @returns Usage percentage
   */
  calculateUsagePercentage(credit: Credit): number {
    if (credit.totalCredits === 0) return 0;
    return (credit.usedCredits / credit.totalCredits) * 100;
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
}

/**
 * Create credit service instance
 * Factory function for dependency injection
 *
 * @param prisma - Prisma client instance
 * @returns CreditService instance
 */
export function createCreditService(prisma: PrismaClient): CreditService {
  return new CreditService(prisma);
}
