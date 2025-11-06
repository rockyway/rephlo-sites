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

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreditService, createCreditService } from '../services/credit.service';
import { UsageService, createUsageService } from '../services/usage.service';
import {
  usageQuerySchema,
  usageStatsQuerySchema,
  CurrentCreditsResponse,
  UsageHistoryResponse,
  UsageStatsResponse,
  RateLimitStatusResponse,
} from '../types/credit-validation';
import logger from '../utils/logger';
import { badRequestError, notFoundError } from '../middleware/error.middleware';

export class CreditsController {
  private readonly creditService: CreditService;
  private readonly usageService: UsageService;

  constructor(prisma: PrismaClient) {
    this.creditService = createCreditService(prisma);
    this.usageService = createUsageService(prisma);
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
      user_id: credit.userId,
      total_credits: credit.totalCredits,
      used_credits: credit.usedCredits,
      remaining_credits: this.creditService.calculateRemainingCredits(credit),
      billing_period_start: credit.billingPeriodStart.toISOString(),
      billing_period_end: credit.billingPeriodEnd.toISOString(),
      usage_percentage: this.creditService.calculateUsagePercentage(credit),
    };

    logger.info('CreditsController: Current credits retrieved', {
      userId,
      creditId: credit.id,
      remainingCredits: response.remaining_credits,
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
        model_id: item.modelId,
        operation: item.operation,
        credits_used: item.creditsUsed,
        input_tokens: item.inputTokens,
        output_tokens: item.outputTokens,
        total_tokens: item.totalTokens,
        request_duration_ms: item.requestDurationMs,
        created_at: item.createdAt.toISOString(),
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
  async getRateLimitStatus(_req: Request, res: Response): Promise<void> {
    logger.info('CreditsController: Getting rate limit status (placeholder)');

    // TODO: Implement actual rate limiting logic
    // This will be implemented by the Rate Limiting & Security Agent
    // For now, return placeholder data

    const now = new Date();
    const resetTime = new Date(now.getTime() + 60 * 1000); // 1 minute from now
    const dayResetTime = new Date(now);
    dayResetTime.setHours(24, 0, 0, 0); // Next midnight

    const response: RateLimitStatusResponse = {
      requests_per_minute: {
        limit: 60,
        remaining: 45,
        reset_at: resetTime.toISOString(),
      },
      tokens_per_minute: {
        limit: 100000,
        remaining: 87500,
        reset_at: resetTime.toISOString(),
      },
      credits_per_day: {
        limit: 10000,
        remaining: 7500,
        reset_at: dayResetTime.toISOString(),
      },
    };

    logger.debug(
      'CreditsController: Rate limit status returned (placeholder data)'
    );

    res.status(200).json(response);
  }
}

/**
 * Create credits controller instance
 * Factory function for dependency injection
 *
 * @param prisma - Prisma client instance
 * @returns CreditsController instance
 */
export function createCreditsController(
  prisma: PrismaClient
): CreditsController {
  return new CreditsController(prisma);
}
