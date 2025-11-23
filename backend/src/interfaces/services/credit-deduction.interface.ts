/**
 * Credit Deduction Service Interface
 *
 * Manages atomic credit deductions with transaction safety.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 */

import { TokenUsageRecord } from './token-tracking.interface';

export interface ValidationResult {
  sufficient: boolean;
  currentBalance: number;
  required: number;
  shortfall?: number;
  suggestions?: string[];
}

export interface DeductionResult {
  success: boolean;
  balanceBefore: number;
  balanceAfter: number;
  creditsDeducted: number;
  deductionRecordId: string;
  timestamp: Date;
  // Plan 208: Rounded values for UI display
  balanceBeforeRounded?: number;
  balanceAfterRounded?: number;
  creditsDeductedRounded?: number;
}

export interface CreditDeductionRecord {
  id: string;
  userId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  requestId?: string;
  tokenVendorCost?: number;
  marginMultiplier?: number;
  grossMargin?: number;
  reason: 'api_completion' | 'subscription_allocation' | 'manual_adjustment' | 'refund' | 'overage';
  status: 'pending' | 'completed' | 'reversed';
  reversedAt?: Date;
  reversedBy?: string;
  reversalReason?: string;
  processedAt: Date;
  createdAt: Date;
}

export interface ICreditDeductionService {
  /**
   * Estimate credit cost for a request (pre-flight check)
   * @param userId - User ID
   * @param modelId - Model identifier
   * @param providerName - Provider name
   * @param estimatedInputTokens - Estimated input tokens
   * @param estimatedOutputTokens - Estimated output tokens
   * @returns Estimated credits
   */
  estimateCreditsForRequest(
    userId: string,
    modelId: string,
    providerName: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): Promise<number>;

  /**
   * Pre-check: Does user have sufficient credits?
   * @param userId - User ID
   * @param creditsNeeded - Credits required
   * @returns Validation result
   */
  validateSufficientCredits(
    userId: string,
    creditsNeeded: number
  ): Promise<ValidationResult>;

  /**
   * Atomic deduction with transaction
   * CRITICAL: Must be atomic to prevent race conditions
   * @param userId - User ID
   * @param creditsToDeduct - Credits to deduct
   * @param requestId - Request ID for tracking
   * @param tokenUsageRecord - Token usage details
   * @returns Deduction result
   */
  deductCreditsAtomically(
    userId: string,
    creditsToDeduct: number,
    requestId: string,
    tokenUsageRecord: TokenUsageRecord
  ): Promise<DeductionResult>;

  /**
   * Deduct from multiple credit sources (prioritize expiring first)
   * @param userId - User ID
   * @param amountNeeded - Total credits needed
   */
  deductCreditsInOrder(
    userId: string,
    amountNeeded: number
  ): Promise<void>;

  /**
   * Reverse deduction (for refunds/errors)
   * @param deductionId - Deduction record ID
   * @param reason - Reversal reason
   * @param adminUserId - Admin user performing reversal
   */
  reverseDeduction(
    deductionId: string,
    reason: string,
    adminUserId: string
  ): Promise<void>;

  /**
   * Get user's current credit balance
   * @param userId - User ID
   * @returns Current balance
   */
  getCurrentBalance(userId: string): Promise<number>;

  /**
   * Get deduction history for a user
   * @param userId - User ID
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @param limit - Max records to return
   * @returns List of deduction records
   */
  getDeductionHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<CreditDeductionRecord[]>;

  /**
   * Calculate credits to deduct from vendor cost
   * Plan 208: Uses configurable credit increment
   * @param vendorCost - Vendor cost in USD
   * @param marginMultiplier - Margin multiplier (e.g., 1.5)
   * @returns Credits to deduct (rounded to configurable increment)
   */
  calculateCreditsFromCost(vendorCost: number, marginMultiplier: number): number;
}
