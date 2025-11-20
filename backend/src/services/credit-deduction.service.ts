/**
 * Credit Deduction Service
 *
 * Manages atomic credit deductions with transaction safety.
 * Part of Plan 112: Token-to-Credit Conversion Mechanism
 *
 * CRITICAL: All deductions MUST be atomic to prevent race conditions and double-charging.
 * Uses Serializable isolation level for maximum safety.
 *
 * Reference: docs/plan/112-token-to-credit-conversion-mechanism.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';
import {
  ICreditDeductionService,
  ValidationResult,
  DeductionResult,
  CreditDeductionRecord,
  TokenUsageRecord,
} from '../interfaces';

// Custom error classes
export class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

@injectable()
export class CreditDeductionService implements ICreditDeductionService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('CreditDeductionService: Initialized');
  }

  /**
   * Estimate credit cost for a request (pre-flight check)
   * Uses conservative estimation to prevent undercharging
   * Formula: credits = ceil(estimatedTokens × maxPricePerToken × marginMultiplier × 100)
   */
  async estimateCreditsForRequest(
    userId: string,
    modelId: string,
    providerName: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): Promise<number> {
    try {
      // Get provider ID
      const provider = await this.prisma.providers.findUnique({
        where: { name: providerName },
        select: { id: true },
      });

      if (!provider) {
        // Conservative fallback: assume high cost
        logger.warn('CreditDeductionService: Provider not found for estimation, using fallback', {
          providerName,
          modelId,
        });
        return Math.ceil(((estimatedInputTokens + estimatedOutputTokens) / 1000) * 20);
      }

      // Get pricing from model_provider_pricing table
      const pricingRecords = await this.prisma.$queryRaw<any[]>`
        SELECT
          input_price_per_1k as "inputPricePer1k",
          output_price_per_1k as "outputPricePer1k"
        FROM model_provider_pricing
        WHERE provider_id = ${provider.id}::uuid
          AND model_name = ${modelId}
          AND is_active = true
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (!pricingRecords || pricingRecords.length === 0) {
        // Conservative fallback
        logger.warn('CreditDeductionService: Pricing not found, using fallback', {
          providerId: provider.id,
          modelId,
        });
        return Math.ceil(((estimatedInputTokens + estimatedOutputTokens) / 1000) * 20);
      }

      const pricing = pricingRecords[0];

      // Calculate with token pricing (prices are per 1k tokens)
      const inputCost = (estimatedInputTokens / 1000) * parseFloat(pricing.inputPricePer1k);
      const outputCost = (estimatedOutputTokens / 1000) * parseFloat(pricing.outputPricePer1k);
      const vendorCost = inputCost + outputCost;

      // Get margin multiplier from pricing config service
      // Note: This requires IPricingConfigService to be injected
      // For now, use a conservative default multiplier of 1.5
      // TODO: Inject IPricingConfigService and call getApplicableMultiplier
      const marginMultiplier = 1.5; // Conservative default

      // Apply formula with 10% safety margin
      const estimatedCredits = Math.ceil(vendorCost * marginMultiplier * 100 * 1.1);

      logger.debug('CreditDeductionService: Estimated credits', {
        userId,
        modelId,
        providerName,
        estimatedInputTokens,
        estimatedOutputTokens,
        vendorCost,
        marginMultiplier,
        estimatedCredits,
      });

      return estimatedCredits;
    } catch (error) {
      logger.error('CreditDeductionService: Error estimating credits', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        modelId,
        providerName,
      });
      // Conservative fallback on error
      return Math.ceil(((estimatedInputTokens + estimatedOutputTokens) / 1000) * 20);
    }
  }

  /**
   * Pre-check: Does user have sufficient credits?
   */
  async validateSufficientCredits(
    userId: string,
    creditsNeeded: number
  ): Promise<ValidationResult> {
    logger.debug('CreditDeductionService: Validating sufficient credits', {
      userId,
      creditsNeeded,
    });

    try {
      const balance = await this.getCurrentBalance(userId);

      if (balance >= creditsNeeded) {
        return {
          sufficient: true,
          currentBalance: balance,
          required: creditsNeeded,
        };
      }

      const shortfall = creditsNeeded - balance;

      // Generate suggestions for user
      const suggestions: string[] = [
        `Your balance (${balance} credits) is insufficient. Need ${creditsNeeded} credits.`,
        `Shortfall: ${shortfall} credits`,
      ];

      // Add tier-specific suggestions
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          subscription_monetization: {
            where: { status: 'active' },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      if (user?.subscription_monetization[0]?.tier === 'free') {
        suggestions.push('Upgrade to Pro tier for 20,000 credits/month ($19/month)');
      } else if (user?.subscription_monetization[0]?.tier === 'pro') {
        suggestions.push('Upgrade to Pro Max for 60,000 credits/month ($49/month)');
      }

      return {
        sufficient: false,
        currentBalance: balance,
        required: creditsNeeded,
        shortfall,
        suggestions,
      };
    } catch (error) {
      logger.error('CreditDeductionService: Error validating credits', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw new Error('Failed to validate credit balance');
    }
  }

  /**
   * Atomic deduction with transaction
   * CRITICAL: Must be atomic to prevent race conditions
   */
  async deductCreditsAtomically(
    userId: string,
    creditsToDeduct: number,
    requestId: string,
    tokenUsageRecord: TokenUsageRecord
  ): Promise<DeductionResult> {
    logger.info('CreditDeductionService: Deducting credits atomically', {
      userId,
      creditsToDeduct,
      requestId,
    });

    try {
      // Use Serializable isolation level for maximum safety
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Step 1: Lock user credit balance (SELECT FOR UPDATE)
          const balanceRecords = await tx.$queryRaw<any[]>`
            SELECT amount
            FROM user_credit_balance
            WHERE user_id = ${userId}::uuid
            FOR UPDATE
          `;

          let currentBalance = 0;
          let balanceExists = balanceRecords && balanceRecords.length > 0;

          if (balanceExists) {
            currentBalance = parseInt(balanceRecords[0].amount) || 0;
          }

          // Step 2: Pre-check: Sufficient credits?
          if (currentBalance < creditsToDeduct) {
            throw new InsufficientCreditsError(
              `Insufficient credits. Balance: ${currentBalance}, Required: ${creditsToDeduct}`
            );
          }

          // Step 3: Calculate new balance
          const newBalance = currentBalance - creditsToDeduct;

          // Step 4: Update credit balance
          if (balanceExists) {
            await tx.$executeRaw`
              UPDATE user_credit_balance
              SET amount = ${newBalance},
                  last_deduction_at = NOW(),
                  last_deduction_amount = ${creditsToDeduct},
                  updated_at = NOW()
              WHERE user_id = ${userId}::uuid
            `;
          } else {
            // Create balance record if it doesn't exist
            await tx.$executeRaw`
              INSERT INTO user_credit_balance (user_id, amount, last_deduction_at, last_deduction_amount)
              VALUES (${userId}::uuid, ${newBalance}, NOW(), ${creditsToDeduct})
            `;
          }

          // Step 4.5: Update credits.used_credits table (synchronize with user_credit_balance)
          // This ensures the API endpoints that read from credits table show correct usage
          await tx.$executeRaw`
            UPDATE credits
            SET used_credits = used_credits + ${creditsToDeduct},
                updated_at = NOW()
            WHERE user_id = ${userId}::uuid
              AND is_current = true
          `;

          // Step 5: Create token usage ledger record FIRST (FK requirement for credit_deduction_ledger)
          // Phase 3: Track separate input/output credits
          const inputCredits = tokenUsageRecord.inputCredits || 0;
          const outputCredits = tokenUsageRecord.outputCredits || 0;
          const totalCredits = inputCredits + outputCredits;

          await tx.$executeRaw`
            INSERT INTO token_usage_ledger (
              request_id, user_id, subscription_id, model_id, provider_id,
              input_tokens, output_tokens, cached_input_tokens,
              vendor_cost, margin_multiplier, credit_value_usd, credits_deducted,
              input_credits, output_credits, total_credits,
              request_type, request_started_at, request_completed_at,
              processing_time_ms, status, gross_margin_usd, created_at
            ) VALUES (
              ${requestId}::uuid,
              ${userId}::uuid,
              NULL,
              ${tokenUsageRecord.modelId},
              ${tokenUsageRecord.providerId}::uuid,
              ${tokenUsageRecord.inputTokens},
              ${tokenUsageRecord.outputTokens},
              ${tokenUsageRecord.cachedInputTokens || 0},
              ${tokenUsageRecord.vendorCost},
              ${tokenUsageRecord.marginMultiplier},
              ${tokenUsageRecord.vendorCost * tokenUsageRecord.marginMultiplier},
              ${creditsToDeduct},
              ${inputCredits},
              ${outputCredits},
              ${totalCredits},
              ${tokenUsageRecord.requestType}::request_type,
              ${tokenUsageRecord.requestStartedAt},
              ${tokenUsageRecord.requestCompletedAt},
              ${tokenUsageRecord.processingTime},
              ${tokenUsageRecord.status}::request_status,
              ${tokenUsageRecord.grossMargin},
              NOW()
            )
          `;

          // Step 6: Record deduction in ledger (immutable audit trail)
          const deductionRecords = await tx.$queryRaw<any[]>`
            INSERT INTO credit_deduction_ledger (
              user_id, amount, balance_before, balance_after,
              request_id, token_vendor_cost, margin_multiplier, gross_margin,
              reason, status, processed_at
            ) VALUES (
              ${userId}::uuid, ${creditsToDeduct}, ${currentBalance}, ${newBalance},
              ${requestId}::uuid, ${tokenUsageRecord.vendorCost}, ${tokenUsageRecord.marginMultiplier}, ${tokenUsageRecord.grossMargin},
              'api_completion', 'completed', NOW()
            )
            RETURNING id
          `;

          const deductionRecordId = deductionRecords[0].id;

          // Step 7: Link token usage to deduction record
          await tx.$executeRaw`
            UPDATE token_usage_ledger
            SET deduction_record_id = ${deductionRecordId}::uuid
            WHERE request_id = ${requestId}::uuid
          `;

          // Step 8: Update daily summary for analytics (matches schema: user_id, date, model_name)
          const today = new Date().toISOString().split('T')[0];
          await tx.$executeRaw`
            INSERT INTO token_usage_daily_summary (
              id, user_id, date, model_name,
              total_input_tokens, total_output_tokens,
              total_cost_usd, total_credits, created_at
            ) VALUES (
              gen_random_uuid(),
              ${userId}::uuid,
              ${today}::date,
              ${tokenUsageRecord.modelId},
              ${tokenUsageRecord.inputTokens},
              ${tokenUsageRecord.outputTokens},
              ${tokenUsageRecord.vendorCost},
              ${creditsToDeduct},
              NOW()
            )
            ON CONFLICT (user_id, date, model_name)
            DO UPDATE SET
              total_input_tokens = token_usage_daily_summary.total_input_tokens + ${tokenUsageRecord.inputTokens},
              total_output_tokens = token_usage_daily_summary.total_output_tokens + ${tokenUsageRecord.outputTokens},
              total_cost_usd = token_usage_daily_summary.total_cost_usd + ${tokenUsageRecord.vendorCost},
              total_credits = token_usage_daily_summary.total_credits + ${creditsToDeduct}
          `;

          return {
            success: true,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            creditsDeducted: creditsToDeduct,
            deductionRecordId,
            timestamp: new Date(),
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000, // 5 seconds max wait
          timeout: 10000, // 10 seconds timeout
        }
      );

      logger.info('CreditDeductionService: Credits deducted successfully', {
        userId,
        creditsDeducted: creditsToDeduct,
        balanceAfter: result.balanceAfter,
      });

      return result;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        logger.warn('CreditDeductionService: Insufficient credits', {
          userId,
          creditsToDeduct,
        });
        throw error;
      }

      logger.error('CreditDeductionService: Error deducting credits', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        creditsToDeduct,
        requestId,
      });
      throw new Error('Failed to deduct credits atomically');
    }
  }

  /**
   * Deduct from multiple credit sources (prioritize expiring first)
   * TODO: Implement when rollover/bonus credits are added
   */
  async deductCreditsInOrder(userId: string, amountNeeded: number): Promise<void> {
    // Placeholder for future implementation
    logger.debug('CreditDeductionService: deductCreditsInOrder not yet implemented', {
      userId,
      amountNeeded,
    });
    throw new Error('Not implemented: deductCreditsInOrder');
  }

  /**
   * Reverse deduction (for refunds/errors)
   */
  async reverseDeduction(
    deductionId: string,
    reason: string,
    adminUserId: string
  ): Promise<void> {
    logger.info('CreditDeductionService: Reversing deduction', {
      deductionId,
      reason,
      adminUserId,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Get deduction record
        const records = await tx.$queryRaw<any[]>`
          SELECT user_id, amount, status
          FROM credit_deduction_ledger
          WHERE id = ${deductionId}::uuid
          FOR UPDATE
        `;

        if (!records || records.length === 0) {
          throw new Error('Deduction record not found');
        }

        const record = records[0];

        if (record.status === 'reversed') {
          throw new Error('Deduction already reversed');
        }

        // Reverse the deduction in user balance
        await tx.$executeRaw`
          UPDATE user_credit_balance
          SET amount = amount + ${record.amount},
              updated_at = NOW()
          WHERE user_id = ${record.user_id}::uuid
        `;

        // Mark deduction as reversed
        await tx.$executeRaw`
          UPDATE credit_deduction_ledger
          SET status = 'reversed',
              reversed_at = NOW(),
              reversed_by = ${adminUserId}::uuid,
              reversal_reason = ${reason}
          WHERE id = ${deductionId}::uuid
        `;
      });

      logger.info('CreditDeductionService: Deduction reversed successfully', { deductionId });
    } catch (error) {
      logger.error('CreditDeductionService: Error reversing deduction', {
        error: error instanceof Error ? error.message : String(error),
        deductionId,
      });
      throw new Error('Failed to reverse deduction');
    }
  }

  /**
   * Get user's current credit balance
   */
  async getCurrentBalance(userId: string): Promise<number> {
    try {
      const balances = await this.prisma.$queryRaw<any[]>`
        SELECT amount FROM user_credit_balance WHERE user_id = ${userId}::uuid
      `;

      if (!balances || balances.length === 0) {
        return 0;
      }

      return parseInt(balances[0].amount) || 0;
    } catch (error) {
      logger.error('CreditDeductionService: Error getting current balance', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return 0;
    }
  }

  /**
   * Get deduction history for a user
   */
  async getDeductionHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<CreditDeductionRecord[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const records = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM credit_deduction_ledger
      WHERE user_id = ${userId}::uuid
        AND created_at BETWEEN ${start} AND ${end}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return records.map(this.mapToDeductionRecord);
  }

  private mapToDeductionRecord(record: any): CreditDeductionRecord {
    return {
      id: record.id,
      userId: record.user_id,
      amount: parseInt(record.amount),
      balanceBefore: parseInt(record.balance_before),
      balanceAfter: parseInt(record.balance_after),
      requestId: record.request_id,
      tokenVendorCost: record.token_vendor_cost ? parseFloat(record.token_vendor_cost) : undefined,
      marginMultiplier: record.margin_multiplier ? parseFloat(record.margin_multiplier) : undefined,
      grossMargin: record.gross_margin ? parseFloat(record.gross_margin) : undefined,
      reason: record.reason,
      status: record.status,
      reversedAt: record.reversed_at ? new Date(record.reversed_at) : undefined,
      reversedBy: record.reversed_by,
      reversalReason: record.reversal_reason,
      processedAt: new Date(record.processed_at),
      createdAt: new Date(record.created_at),
    };
  }
}
