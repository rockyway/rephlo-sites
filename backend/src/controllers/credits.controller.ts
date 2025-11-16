/**
 * Credits Controller
 *
 * HTTP request handlers for credit and usage management endpoints.
 * Provides access to credit balance, usage history, and usage statistics.
 *
 * Endpoints:
 * - GET /v1/credits/me         - Get current user credits
 * - GET /v1/usage              - Get usage history
 * - GET /v1/usage/stats        - Get usage statistics
 * - GET /v1/rate-limit         - Get rate limit status (placeholder)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { ICreditService, IUsageService } from '../interfaces';
import {
  usageQuerySchema,
  usageStatsQuerySchema,
  CurrentCreditsResponse,
  UsageHistoryResponse,
  UsageStatsResponse,
} from '../types/credit-validation';
import logger from '../utils/logger';
import { badRequestError, notFoundError } from '../middleware/error.middleware';

@injectable()
export class CreditsController {
  constructor(
    @inject('ICreditService') private readonly creditService: ICreditService,
    @inject('IUsageService') private readonly usageService: IUsageService
  ) {
    logger.debug('CreditsController: Initialized');
  }

  /**
   * GET /v1/credits/me
   * Get current user credits
   *
   * Response 200:
   * {
   *   "id": "crd_789ghi",
   *   "user_id": "550e8400-e29b-41d4-a716-446655440000",
   *   "total_credits": 100000,
   *   "used_credits": 25430,
   *   "remaining_credits": 74570,
   *   "billing_period_start": "2025-11-01T00:00:00Z",
   *   "billing_period_end": "2025-12-01T00:00:00Z",
   *   "usage_percentage": 25.43
   * }
   */
  async getCurrentCredits(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    logger.info('CreditsController: Getting current credits', { userId });

    const credit = await this.creditService.getCurrentCredits(userId);

    if (!credit) {
      logger.warn('CreditsController: No active credits found', { userId });
      throw notFoundError(
        'No active credit record found. Please check your subscription.'
      );
    }

    const response: CurrentCreditsResponse = {
      id: credit.id,
      userId: credit.user_id,
      totalCredits: credit.total_credits,
      usedCredits: credit.used_credits,
      remainingCredits: this.creditService.calculateRemainingCredits(credit),
      billingPeriodStart: credit.billing_period_start.toISOString(),
      billingPeriodEnd: credit.billing_period_end.toISOString(),
      usagePercentage: this.creditService.calculateUsagePercentage(credit),
    };

    logger.info('CreditsController: Current credits retrieved', {
      userId,
      creditId: credit.id,
      remainingCredits: response.remainingCredits,
    });

    res.status(200).json(response);
  }

  /**
   * GET /v1/usage
   * Get usage history with filtering and pagination
   *
   * Query Parameters:
   * - start_date: ISO date (optional)
   * - end_date: ISO date (optional)
   * - model_id: Model ID (optional)
   * - operation: Operation type (optional)
   * - limit: Number of records (default: 20, max: 100)
   * - offset: Pagination offset (default: 0)
   *
   * Response 200:
   * {
   *   "usage": [...],
   *   "pagination": {
   *     "limit": 50,
   *     "offset": 0,
   *     "total": 156,
   *     "has_more": true
   *   },
   *   "summary": {
   *     "total_credits_used": 312,
   *     "total_requests": 156,
   *     "total_tokens": 45780
   *   }
   * }
   */
  async getUsageHistory(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    logger.info('CreditsController: Getting usage history', {
      userId,
      query: req.query,
    });

    // Validate query parameters
    const validationResult = usageQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      logger.warn('CreditsController: Invalid query parameters', {
        userId,
        errors: validationResult.error.errors,
      });
      throw badRequestError(
        'Invalid query parameters',
        validationResult.error.errors
      );
    }

    const params = validationResult.data;

    // Get usage history
    const result = await this.usageService.getUsageHistory(userId, params);

    // Format response
    const response: UsageHistoryResponse = {
      usage: result.usage.map((item) => ({
        id: item.id,
        modelId: item.model_id,
        operation: item.request_type,
        creditsUsed: item.credits_deducted,
        inputTokens: item.input_tokens,
        outputTokens: item.output_tokens,
        totalTokens: item.input_tokens + item.output_tokens,
        requestDurationMs: item.processing_time_ms,
        createdAt: item.created_at.toISOString(),
      })),
      pagination: result.pagination,
      summary: result.summary,
    };

    logger.info('CreditsController: Usage history retrieved', {
      userId,
      recordsReturned: response.usage.length,
      total: response.pagination.total,
    });

    res.status(200).json(response);
  }

  /**
   * GET /v1/usage/stats
   * Get usage statistics with aggregation
   *
   * Query Parameters:
   * - start_date: ISO date (optional)
   * - end_date: ISO date (optional)
   * - group_by: Grouping option - day, hour, model (default: day)
   *
   * Response 200:
   * {
   *   "stats": [
   *     {
   *       "date": "2025-11-01",
   *       "credits_used": 5430,
   *       "requests_count": 234,
   *       "tokens_total": 125600,
   *       "average_duration_ms": 980
   *     }
   *   ],
   *   "total": {
   *     "credits_used": 25430,
   *     "requests_count": 1156,
   *     "tokens_total": 634500,
   *     "average_duration_ms": 1020
   *   }
   * }
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    logger.info('CreditsController: Getting usage statistics', {
      userId,
      query: req.query,
    });

    // Validate query parameters
    const validationResult = usageStatsQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      logger.warn('CreditsController: Invalid query parameters', {
        userId,
        errors: validationResult.error.errors,
      });
      throw badRequestError(
        'Invalid query parameters',
        validationResult.error.errors
      );
    }

    const params = validationResult.data;

    // Get usage statistics
    const result = await this.usageService.getUsageStats(userId, params);

    const response: UsageStatsResponse = {
      stats: result.stats,
      total: result.total,
    };

    logger.info('CreditsController: Usage statistics retrieved', {
      userId,
      groupBy: params.group_by,
      statsCount: response.stats.length,
    });

    res.status(200).json(response);
  }

  /**
   * GET /v1/rate-limit
   * Get rate limit status
   *
   * Note: This is a placeholder implementation.
   * Full rate limiting will be implemented by the Rate Limiting & Security Agent.
   *
   * Response 200:
   * {
   *   "requests_per_minute": {
   *     "limit": 60,
   *     "remaining": 45,
   *     "reset_at": "2025-11-05T10:31:00Z"
   *   },
   *   "tokens_per_minute": {
   *     "limit": 100000,
   *     "remaining": 87500,
   *     "reset_at": "2025-11-05T10:31:00Z"
   *   },
   *   "credits_per_day": {
   *     "limit": 10000,
   *     "remaining": 7500,
   *     "reset_at": "2025-11-06T00:00:00Z"
   *   }
   * }
   */
  async getRateLimitStatus(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;

    logger.info('CreditsController: Getting rate limit status', {
      userId: user?.id,
    });

    // Get user tier from subscription
    const { getUserTier, getUserRateLimitStatus } = await import(
      '../middleware/ratelimit.middleware'
    );
    const tier = getUserTier(req);

    // Get actual rate limit status
    const status = await getUserRateLimitStatus(user.id, tier);

    logger.debug('CreditsController: Rate limit status returned', {
      userId: user.id,
      tier,
    });

    res.status(200).json(status);
  }

  /**
   * GET /api/user/credits
   * Get detailed credit usage information
   *
   * Returns separate breakdown of free credits (monthly allocation with reset date)
   * and pro credits (purchased credits with lifetime usage)
   *
   * Response 200:
   * {
   *   "freeCredits": {
   *     "remaining": 1500,
   *     "monthlyAllocation": 2000,
   *     "used": 500,
   *     "resetDate": "2025-12-01T00:00:00Z",
   *     "daysUntilReset": 25
   *   },
   *   "proCredits": {
   *     "remaining": 5000,
   *     "purchasedTotal": 10000,
   *     "lifetimeUsed": 5000
   *   },
   *   "totalAvailable": 6500,
   *   "lastUpdated": "2025-11-06T14:30:00Z"
   * }
   */
  async getDetailedCredits(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;

    logger.info('CreditsController: Getting detailed credits breakdown', { userId });

    try {
      // Fetch detailed credits from service
      const detailedCredits = await this.creditService.getDetailedCredits(userId);

      // Format response according to API specification
      const response = {
        freeCredits: {
          remaining: detailedCredits.freeCredits.remaining,
          monthlyAllocation: detailedCredits.freeCredits.monthlyAllocation,
          used: detailedCredits.freeCredits.used,
          resetDate: detailedCredits.freeCredits.resetDate.toISOString(),
          daysUntilReset: detailedCredits.freeCredits.daysUntilReset
        },
        proCredits: {
          remaining: detailedCredits.proCredits.remaining,
          purchasedTotal: detailedCredits.proCredits.purchasedTotal,
          lifetimeUsed: detailedCredits.proCredits.lifetimeUsed
        },
        totalAvailable: detailedCredits.totalAvailable,
        lastUpdated: detailedCredits.lastUpdated.toISOString()
      };

      logger.info('CreditsController: Detailed credits retrieved successfully', {
        userId,
        totalAvailable: response.totalAvailable,
        freeRemaining: response.freeCredits.remaining,
        proRemaining: response.proCredits.remaining
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('CreditsController: Failed to get detailed credits', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
