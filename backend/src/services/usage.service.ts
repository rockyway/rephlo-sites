/**
 * Usage Service
 *
 * Manages usage tracking and analytics for LLM API requests.
 * Provides detailed usage history, statistics, and reporting.
 *
 * Core Responsibilities:
 * - Record usage after each inference request
 * - Retrieve usage history with filtering and pagination
 * - Generate usage statistics with aggregation
 * - Calculate usage summaries and trends
 *
 * Integration Points:
 * - Called by Model Service to record usage
 * - Used by Credits Controller for usage endpoints
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, token_usage_ledger as UsageHistory } from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger';
import {
  RecordUsageInput,
  UsageQueryParams,
  UsageStatsQueryParams,
} from '../types/credit-validation';

/**
 * Usage history response with pagination
 */
export interface UsageHistoryResult {
  usage: UsageHistory[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  summary: {
    totalCreditsUsed: number;
    totalRequests: number;
    totalTokens: number;
  };
}

/**
 * Usage statistics item
 */
export interface UsageStatsItem {
  date?: string;
  hour?: number;
  modelId?: string;
  creditsUsed: number;
  requestsCount: number;
  tokensTotal: number;
  averageDurationMs: number;
}

/**
 * Usage statistics response
 */
export interface UsageStatsResult {
  stats: UsageStatsItem[];
  total: {
    creditsUsed: number;
    requestsCount: number;
    tokensTotal: number;
    averageDurationMs: number;
  };
}

@injectable()
export class UsageService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  /**
   * Record usage for an inference request
   * Called by model service after successful inference
   *
   * @param input - Usage record parameters
   * @returns Created usage history record
   */
  async recordUsage(input: RecordUsageInput): Promise<UsageHistory> {
    logger.debug('UsageService: Recording usage', {
      userId: input.userId,
      modelId: input.modelId,
      operation: input.operation,
      creditsUsed: input.creditsUsed,
    });

    const usageRecord = await this.prisma.token_usage_ledger.create({
      data: {
        user_id: input.userId,
        subscription_id: input.creditId,
        model_id: input.modelId,
        provider_id: input.operation as any, // TODO: This needs proper provider_id
        request_id: crypto.randomUUID(),
        input_tokens: input.inputTokens || 0,
        output_tokens: input.outputTokens || 0,
        vendor_cost: 0, // TODO: Needs actual vendor cost
        margin_multiplier: 1,
        credit_value_usd: 0.01,
        credits_deducted: input.creditsUsed,
        request_type: 'chat' as any,
        request_started_at: new Date(),
        request_completed_at: new Date(),
        processing_time_ms: input.requestDurationMs,
      },
    });

    logger.info('UsageService: Usage recorded successfully', {
      userId: input.userId,
      usageId: usageRecord.id,
      creditsUsed: input.creditsUsed,
    });

    return usageRecord;
  }

  /**
   * Get usage history with filtering and pagination
   * Supports filtering by date range, model, and operation type
   *
   * @param userId - User ID
   * @param params - Query parameters for filtering and pagination
   * @returns Usage history with pagination and summary
   */
  async getUsageHistory(
    userId: string,
    params: UsageQueryParams
  ): Promise<UsageHistoryResult> {
    logger.debug('UsageService: Getting usage history', {
      userId,
      params,
    });

    // Build where clause for filtering
    const where: any = {
      user_id: userId,
    };

    // Date range filter
    if (params.start_date || params.end_date) {
      where.created_at = {};
      if (params.start_date) {
        where.created_at.gte = new Date(params.start_date);
      }
      if (params.end_date) {
        where.created_at.lte = new Date(params.end_date);
      }
    }

    // Model filter
    if (params.model_id) {
      where.model_id = params.model_id;
    }

    // Operation filter
    if (params.operation) {
      where.request_type = params.operation;
    }

    // Get total count for pagination
    const total = await this.prisma.token_usage_ledger.count({ where });

    // Get usage records with pagination
    const usage = await this.prisma.token_usage_ledger.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: params.limit,
      skip: params.offset,
    });

    // Calculate summary statistics
    const summaryData = await this.prisma.token_usage_ledger.aggregate({
      where,
      _sum: {
        credits_deducted: true,
        input_tokens: true,
        output_tokens: true,
      },
    });

    const summary = {
      totalCreditsUsed: parseFloat(summaryData._sum?.credits_deducted?.toString() || '0'),
      totalRequests: total,
      totalTokens: (summaryData._sum?.input_tokens || 0) + (summaryData._sum?.output_tokens || 0),
    };

    const result: UsageHistoryResult = {
      usage,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total,
        hasMore: params.offset + params.limit < total,
      },
      summary,
    };

    logger.debug('UsageService: Usage history retrieved', {
      userId,
      recordsReturned: usage.length,
      total,
    });

    return result;
  }

  /**
   * Get usage statistics with aggregation
   * Supports grouping by day, hour, or model
   *
   * @param userId - User ID
   * @param params - Query parameters for filtering and grouping
   * @returns Aggregated usage statistics
   */
  async getUsageStats(
    userId: string,
    params: UsageStatsQueryParams
  ): Promise<UsageStatsResult> {
    logger.debug('UsageService: Getting usage statistics', {
      userId,
      params,
    });

    // Build where clause for filtering
    const where: any = {
      user_id: userId,
    };

    // Date range filter
    if (params.start_date || params.end_date) {
      where.created_at = {};
      if (params.start_date) {
        where.created_at.gte = new Date(params.start_date);
      }
      if (params.end_date) {
        where.created_at.lte = new Date(params.end_date);
      }
    }

    let stats: UsageStatsItem[] = [];

    // Group by day
    if (params.group_by === 'day') {
      stats = await this.getStatsByDay(where);
    }
    // Group by hour
    else if (params.group_by === 'hour') {
      stats = await this.getStatsByHour(where);
    }
    // Group by model
    else if (params.group_by === 'model') {
      stats = await this.getStatsByModel(where);
    }

    // Calculate total statistics
    const total = stats.reduce(
      (acc, stat) => ({
        creditsUsed: acc.creditsUsed + stat.creditsUsed,
        requestsCount: acc.requestsCount + stat.requestsCount,
        tokensTotal: acc.tokensTotal + stat.tokensTotal,
        averageDurationMs:
          acc.averageDurationMs + stat.averageDurationMs,
      }),
      {
        creditsUsed: 0,
        requestsCount: 0,
        tokensTotal: 0,
        averageDurationMs: 0,
      }
    );

    // Calculate average duration
    if (stats.length > 0) {
      total.averageDurationMs = Math.round(
        total.averageDurationMs / stats.length
      );
    }

    const result: UsageStatsResult = {
      stats,
      total,
    };

    logger.debug('UsageService: Usage statistics retrieved', {
      userId,
      groupBy: params.group_by,
      statsCount: stats.length,
    });

    return result;
  }

  /**
   * Get usage statistics grouped by day
   * Uses SQL DATE function for efficient grouping
   *
   * @param where - Where clause for filtering
   * @returns Array of daily statistics
   */
  private async getStatsByDay(where: any): Promise<UsageStatsItem[]> {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(created_at) as date,
        SUM(credits_used)::int as credits_used,
        COUNT(*)::int as requests_count,
        COALESCE(SUM(total_tokens), 0)::int as tokens_total,
        COALESCE(AVG(request_duration_ms), 0)::int as average_duration_ms
      FROM token_usage_ledger
      WHERE user_id = ${where.userId}::uuid
        ${where.created_at?.gte ? this.prisma.$queryRaw`AND created_at >= ${where.created_at.gte}` : this.prisma.$queryRaw``}
        ${where.created_at?.lte ? this.prisma.$queryRaw`AND created_at <= ${where.created_at.lte}` : this.prisma.$queryRaw``}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 90
    `;

    return results.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      creditsUsed: row.credits_used,
      requestsCount: row.requests_count,
      tokensTotal: row.tokens_total,
      averageDurationMs: row.average_duration_ms,
    }));
  }

  /**
   * Get usage statistics grouped by hour
   * Uses SQL EXTRACT function for hour grouping
   *
   * @param where - Where clause for filtering
   * @returns Array of hourly statistics
   */
  private async getStatsByHour(where: any): Promise<UsageStatsItem[]> {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(HOUR FROM created_at)::int as hour,
        SUM(credits_used)::int as credits_used,
        COUNT(*)::int as requests_count,
        COALESCE(SUM(total_tokens), 0)::int as tokens_total,
        COALESCE(AVG(request_duration_ms), 0)::int as average_duration_ms
      FROM token_usage_ledger
      WHERE user_id = ${where.userId}::uuid
        ${where.created_at?.gte ? this.prisma.$queryRaw`AND created_at >= ${where.created_at.gte}` : this.prisma.$queryRaw``}
        ${where.created_at?.lte ? this.prisma.$queryRaw`AND created_at <= ${where.created_at.lte}` : this.prisma.$queryRaw``}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `;

    return results.map((row) => ({
      hour: row.hour,
      creditsUsed: row.credits_used,
      requestsCount: row.requests_count,
      tokensTotal: row.tokens_total,
      averageDurationMs: row.average_duration_ms,
    }));
  }

  /**
   * Get usage statistics grouped by model
   * Uses Prisma groupBy for model aggregation
   *
   * @param where - Where clause for filtering
   * @returns Array of model-grouped statistics
   */
  private async getStatsByModel(where: any): Promise<UsageStatsItem[]> {
    const results = await this.prisma.token_usage_ledger.groupBy({
      by: ['model_id'],
      where,
      _sum: {
        credits_deducted: true,
        input_tokens: true,
        output_tokens: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        processing_time_ms: true,
      },
      orderBy: {
        _sum: {
          credits_deducted: 'desc',
        },
      },
    });

    return results.map((row) => ({
      modelId: row.model_id,
      creditsUsed: parseFloat(row._sum?.credits_deducted?.toString() || '0'),
      requestsCount: row._count?.id || 0,
      tokensTotal: (row._sum?.input_tokens || 0) + (row._sum?.output_tokens || 0),
      averageDurationMs: Math.round(row._avg?.processing_time_ms || 0),
    }));
  }

  /**
   * Get total credits used in a date range
   * Quick summary method for credit calculations
   *
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Total credits used
   */
  async getTotalCreditsUsed(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const where: any = { user_id: userId };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const result = await this.prisma.token_usage_ledger.aggregate({
      where,
      _sum: {
        credits_deducted: true,
      },
    });

    return parseFloat(result._sum?.credits_deducted?.toString() || '0');
  }

  /**
   * Get usage count for a specific model
   * Used for model popularity analytics
   *
   * @param userId - User ID
   * @param modelId - Model ID
   * @returns Number of requests for the model
   */
  async getModelUsageCount(userId: string, modelId: string): Promise<number> {
    const count = await this.prisma.token_usage_ledger.count({
      where: {
        user_id: userId,
        model_id: modelId,
      },
    });

    return count;
  }

  /**
   * Get most used model by user
   * Useful for default model suggestions
   *
   * @param userId - User ID
   * @returns Most used model ID or null
   */
  async getMostUsedModel(userId: string): Promise<string | null> {
    const result = await this.prisma.token_usage_ledger.groupBy({
      by: ['model_id'],
      where: { user_id: userId },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 1,
    });

    return result[0]?.model_id || null;
  }

  /**
   * Get average tokens per request
   * Analytics metric for usage patterns
   *
   * @param userId - User ID
   * @returns Average tokens per request
   */
  async getAverageTokensPerRequest(userId: string): Promise<number> {
    const result = await this.prisma.token_usage_ledger.aggregate({
      where: { user_id: userId },
      _sum: {
        input_tokens: true,
        output_tokens: true,
      },
      _count: {
        id: true,
      },
    });

    const totalTokens = (result._sum?.input_tokens || 0) + (result._sum?.output_tokens || 0);
    const count = result._count?.id || 1;
    return Math.round(totalTokens / count);
  }

  /**
   * Get usage trend (percentage change)
   * Compares current period to previous period
   *
   * @param userId - User ID
   * @param currentStart - Current period start
   * @param currentEnd - Current period end
   * @param previousStart - Previous period start
   * @param previousEnd - Previous period end
   * @returns Percentage change
   */
  async getUsageTrend(
    userId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<number> {
    const currentUsage = await this.getTotalCreditsUsed(
      userId,
      currentStart,
      currentEnd
    );
    const previousUsage = await this.getTotalCreditsUsed(
      userId,
      previousStart,
      previousEnd
    );

    if (previousUsage === 0) return currentUsage > 0 ? 100 : 0;

    const percentageChange =
      ((currentUsage - previousUsage) / previousUsage) * 100;
    return Math.round(percentageChange * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get monthly usage summary for Desktop App
   * Aggregates usage data from token_usage_ledger table
   *
   * Implementation Reference: docs/plan/182-desktop-app-api-backend-requirements.md
   *
   * @param userId - User ID
   * @param period - "current_month" or "YYYY-MM" format
   * @returns Monthly usage summary with camelCase fields
   */
  async getMonthlySummary(userId: string, period: string = 'current_month'): Promise<UsageSummaryResponse> {
    logger.debug('UsageService: Getting monthly summary', {
      userId,
      period,
    });

    // Parse period
    const { startDate, endDate } = this.parsePeriod(period);

    // Aggregate from token_usage_ledger table (Prisma client uses camelCase)
    const usageRecords = await this.prisma.token_usage_ledger.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        providers: true, // Include provider details
      },
      orderBy: { created_at: 'desc' },
    });

    // Handle empty usage case
    if (usageRecords.length === 0) {
      return {
        period: period === 'current_month' ? this.formatPeriod(startDate) : period,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        summary: {
          creditsUsed: 0,
          apiRequests: 0,
          totalTokens: 0,
          averageTokensPerRequest: 0,
          mostUsedModel: 'N/A',
          mostUsedModelPercentage: 0,
        },
        creditBreakdown: await this.getCreditBreakdown(userId, startDate, endDate),
        modelBreakdown: [],
      };
    }

    // Aggregate totals
    const summary = {
      creditsUsed: usageRecords.reduce((sum, r) => sum + parseFloat(r.credits_deducted.toString()), 0),
      apiRequests: usageRecords.length,
      totalTokens: usageRecords.reduce((sum, r) => sum + (r.input_tokens + r.output_tokens), 0),
      averageTokensPerRequest: 0,
      mostUsedModel: '',
      mostUsedModelPercentage: 0,
    };

    summary.averageTokensPerRequest = summary.totalTokens > 0
      ? Math.round(summary.totalTokens / summary.apiRequests)
      : 0;

    // Model breakdown
    const modelCounts = usageRecords.reduce((acc, r) => {
      const key = r.model_id;
      if (!acc[key]) {
        acc[key] = {
          requests: 0,
          tokens: 0,
          credits: 0,
          provider: r.providers.name, // Get provider name from joined table
        };
      }
      acc[key].requests++;
      acc[key].tokens += r.input_tokens + r.output_tokens;
      acc[key].credits += parseFloat(r.credits_deducted.toString());
      return acc;
    }, {} as Record<string, { requests: number; tokens: number; credits: number; provider: string }>);

    const modelBreakdown = Object.entries(modelCounts)
      .map(([model, stats]) => ({
        model,
        provider: stats.provider,
        requests: stats.requests,
        tokens: stats.tokens,
        credits: stats.credits,
        percentage: Math.round((stats.requests / summary.apiRequests) * 100),
      }))
      .sort((a, b) => b.requests - a.requests);

    // Most used model
    const mostUsedModel = modelBreakdown[0]?.model || 'N/A';
    const mostUsedModelPercentage = modelBreakdown[0]?.percentage || 0;

    summary.mostUsedModel = mostUsedModel;
    summary.mostUsedModelPercentage = mostUsedModelPercentage;

    logger.info('UsageService: Monthly summary retrieved', {
      userId,
      period,
      creditsUsed: summary.creditsUsed,
      apiRequests: summary.apiRequests,
    });

    return {
      period: period === 'current_month' ? this.formatPeriod(startDate) : period,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      summary,
      creditBreakdown: await this.getCreditBreakdown(userId, startDate, endDate),
      modelBreakdown,
    };
  }

  /**
   * Parse period string to start and end dates
   * @param period - "current_month" or "YYYY-MM" format
   * @returns Start and end dates
   */
  private parsePeriod(period: string): { startDate: Date; endDate: Date } {
    if (period === 'current_month') {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }

    // Parse YYYY-MM format
    const [year, month] = period.split('-').map(Number);
    return {
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  /**
   * Format date to YYYY-MM
   * @param date - Date to format
   * @returns Formatted string
   */
  private formatPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get credit breakdown for a period
   * Note: This is a simplified version - actual implementation would query credit ledger
   * @param userId - User ID
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Credit breakdown
   */
  private async getCreditBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CreditBreakdown> {
    // Get subscription to check tier
    const subscription = await this.prisma.subscription_monetization.findFirst({
      where: {
        user_id: userId,
        status: 'active',
      },
    });

    const freeCreditsLimit = subscription?.tier === 'free' ? 10000 : 0;

    // Calculate total credits used in period
    const totalCreditsUsed = await this.getTotalCreditsUsed(userId, startDate, endDate);

    // For now, we'll return a simplified breakdown
    // In production, this would query the credit ledger to see which credit buckets were used
    return {
      freeCreditsUsed: 0,
      freeCreditsLimit,
      proCreditsUsed: totalCreditsUsed,
      purchasedCreditsUsed: 0,
    };
  }
}

/**
 * Type definitions for monthly usage summary
 */
export interface UsageSummaryResponse {
  period: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    creditsUsed: number;
    apiRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
    mostUsedModel: string;
    mostUsedModelPercentage: number;
  };
  creditBreakdown: CreditBreakdown;
  modelBreakdown: ModelBreakdownItem[];
}

export interface CreditBreakdown {
  freeCreditsUsed: number;
  freeCreditsLimit: number;
  proCreditsUsed: number;
  purchasedCreditsUsed: number;
}

export interface ModelBreakdownItem {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  credits: number;
  percentage: number;
}
