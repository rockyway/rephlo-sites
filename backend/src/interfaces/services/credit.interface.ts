import { Credit } from '@prisma/client';
import { AllocateCreditsInput, DeductCreditsInput } from '../../types/credit-validation';

export const ICreditService = Symbol('ICreditService');

export interface ICreditService {
  /**
   * Get current credit balance for a user
   */
  getCurrentCredits(userId: string): Promise<Credit | null>;

  /**
   * Allocate credits to a user for a billing period
   */
  allocateCredits(input: AllocateCreditsInput): Promise<Credit>;

  /**
   * Check if user has sufficient credits
   */
  hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean>;

  /**
   * Deduct credits from user's balance (atomic transaction)
   */
  deductCredits(input: DeductCreditsInput): Promise<Credit>;

  /**
   * Get credit balance for a specific billing period
   */
  getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Credit | null>;

  /**
   * Get all credit records for a user (historical)
   */
  getCreditHistory(userId: string, limit?: number): Promise<Credit[]>;

  /**
   * Calculate remaining credits
   */
  calculateRemainingCredits(credit: Credit): number;

  /**
   * Calculate usage percentage (0-100)
   */
  calculateUsagePercentage(credit: Credit): number;

  /**
   * Check if credits are low (below threshold)
   */
  isCreditsLow(credit: Credit, thresholdPercentage?: number): boolean;
}
