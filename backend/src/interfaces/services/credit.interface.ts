import type { credits } from '@prisma/client';
import { AllocateCreditsInput, DeductCreditsInput } from '../../types/credit-validation';

export const ICreditService = Symbol('ICreditService');

// =============================================================================
// Enhanced Credits Data Structures (Phase 2)
// =============================================================================

/**
 * Free credits breakdown information
 * Provides monthly allocation, usage, and reset details
 */
export interface FreeCreditsInfo {
  remaining: number;
  monthlyAllocation: number;
  used: number;
  resetDate: Date;
  daysUntilReset: number;
}

/**
 * Pro/purchased credits breakdown information
 * Tracks lifetime purchased credits and usage
 */
export interface ProCreditsInfo {
  remaining: number;
  purchasedTotal: number;
  lifetimeUsed: number;
}

/**
 * Detailed credits information combining free and pro
 * Complete view of user's credit status
 */
export interface DetailedCreditsInfo {
  freeCredits: FreeCreditsInfo;
  proCredits: ProCreditsInfo;
  totalAvailable: number;
  lastUpdated: Date;
}

// =============================================================================
// Credit Service Interface
// =============================================================================

export interface ICreditService {
  /**
   * Get current credit balance for a user
   */
  getCurrentCredits(userId: string): Promise<credits | null>;

  /**
   * Allocate credits to a user for a billing period
   */
  allocateCredits(input: AllocateCreditsInput): Promise<credits>;

  /**
   * Check if user has sufficient credits
   */
  hasAvailableCredits(userId: string, requiredCredits: number): Promise<boolean>;

  /**
   * Deduct credits from user's balance (atomic transaction)
   */
  deductCredits(input: DeductCreditsInput): Promise<credits>;

  /**
   * Get credit balance for a specific billing period
   */
  getCreditsByBillingPeriod(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<credits | null>;

  /**
   * Get all credit records for a user (historical)
   */
  getCreditHistory(userId: string, limit?: number): Promise<credits[]>;

  /**
   * Calculate remaining credits
   */
  calculateRemainingCredits(credit: credits): number;

  /**
   * Calculate usage percentage (0-100)
   */
  calculateUsagePercentage(credit: credits): number;

  /**
   * Check if credits are low (below threshold)
   */
  isCreditsLow(credit: credits, thresholdPercentage?: number): boolean;

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
  getFreeCreditsBreakdown(userId: string): Promise<FreeCreditsInfo>;

  /**
   * Get pro/purchased credits breakdown for user
   * Aggregates all pro credit records for lifetime statistics
   *
   * @param userId - User ID
   * @returns Pro credits breakdown
   */
  getProCreditsBreakdown(userId: string): Promise<ProCreditsInfo>;

  /**
   * Get detailed credits combining free and pro
   * Complete view of user's credit status for API response
   *
   * @param userId - User ID
   * @returns Detailed credits information
   */
  getDetailedCredits(userId: string): Promise<DetailedCreditsInfo>;

  /**
   * Calculate reset date based on billing period end and reset day
   * For monthly resets, the reset date is the billingPeriodEnd
   *
   * @param billingPeriodEnd - End of current billing period
   * @param resetDayOfMonth - Day of month for reset (1-31)
   * @returns Next reset date
   */
  calculateResetDate(billingPeriodEnd: Date, resetDayOfMonth: number): Date;

  /**
   * Calculate days until reset date
   * Returns 0 if already past reset date
   *
   * @param resetDate - Reset date
   * @returns Days until reset (minimum 0)
   */
  calculateDaysUntilReset(resetDate: Date): number;

  /**
   * Calculate prorated credits for a tier change (upgrade or downgrade)
   * Takes into account remaining time in billing cycle and current usage
   *
   * @param userId - User ID
   * @param currentTierCredits - Monthly credit allocation for current tier
   * @param newTierCredits - Monthly credit allocation for new tier
   * @param billingPeriodStart - Start of current billing period
   * @param billingPeriodEnd - End of current billing period
   * @returns Proration calculation result with prorated credits and usage details
   */
  calculateProratedCreditsForTierChange(
    userId: string,
    currentTierCredits: number,
    newTierCredits: number,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<{
    proratedCredits: number;
    daysRemaining: number;
    daysInCycle: number;
    currentUsedCredits: number;
    remainingCreditsAfterChange: number;
    isDowngradeWithOveruse: boolean;
  }>;
}
