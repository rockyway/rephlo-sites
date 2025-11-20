/**
 * Analytics Service
 *
 * Aggregates token usage ledger data for Admin Analytics Dashboard.
 * Provides gross margin KPIs, vendor cost analytics, and trend analysis.
 *
 * Features:
 * - Gross margin KPI calculation with tier breakdown
 * - Provider cost aggregation (top 5 by cost)
 * - Margin trend analysis with time bucketing
 * - Cost distribution histogram with anomaly detection
 * - CSV export with streaming for large datasets
 *
 * @module services/analytics.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { Readable } from 'stream';
import logger from '../utils/logger';

// =============================================================================
// Type Definitions
// =============================================================================

export interface AnalyticsQueryParams {
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
  startDate?: string;
  endDate?: string;
  tier?: 'free' | 'pro' | 'enterprise';
  providers?: string[];
  models?: string[];
}

export interface GrossMarginKPIData {
  totalGrossMargin: number;
  totalRevenue: number;
  marginPercentage: number;
  requestCount: number;
  avgMarginPerRequest: number;
  previousPeriodMargin: number;
  trend: {
    marginChange: number;
    marginChangePercent: number;
    direction: 'up' | 'down' | 'neutral';
  };
  tierBreakdown: Array<{
    tier: string;
    grossMargin: number;
    revenue: number;
    percentage: number;
  }>;
}

export interface ProviderCostData {
  providers: Array<{
    provider_id: string;
    providerName: string;
    totalCost: number;
    requestCount: number;
    avgCostPerRequest: number;
    percentage: number;
  }>;
  totalCost: number;
  totalRequests: number;
}

export interface MarginTrendData {
  dataPoints: Array<{
    timestamp: string;
    grossMargin: number;
    revenue: number;
    requestCount: number;
    runningAvg7Day?: number;
    runningAvg30Day?: number;
  }>;
  summary: {
    peakMargin: number;
    peakDate: string;
    avgMargin: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface CostDistributionData {
  buckets: Array<{
    rangeMin: number;
    rangeMax: number;
    requestCount: number;
    totalCost: number;
    percentage: number;
  }>;
  anomalies: Array<{
    request_id: string;
    cost: number;
    timestamp: string;
    model: string;
    stdDeviation: number;
  }>;
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    p95: number;
    p99: number;
  };
}

export interface TrendQueryParams extends AnalyticsQueryParams {
  granularity: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Cache Performance Analytics Types (Plan 207)
 */
export interface CachePerformanceKPIData {
  avgCacheHitRate: number;
  totalCachedTokens: number;
  totalCacheSavings: number;
  avgSavingsPercent: number;
  cacheEnabledRequests: number;
  totalRequests: number;
  cacheAdoptionRate: number;
  breakdown: {
    cacheWriteTokens: number;
    cacheReadTokens: number;
    cachedPromptTokens: number;
  };
  trend: {
    previousPeriodHitRate: number;
    hitRateChange: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export interface CacheHitRateTrendData {
  dataPoints: Array<{
    timestamp: string;
    avgHitRate: number;
    requestCount: number;
    cachedTokens: number;
    savingsPercent: number;
  }>;
  summary: {
    peakHitRate: number;
    peakDate: string;
    avgHitRate: number;
    trend: 'improving' | 'declining' | 'stable';
  };
}

export interface CacheSavingsByProviderData {
  providers: Array<{
    providerId: string;
    providerName: string;
    totalSavings: number;
    avgHitRate: number;
    requestCount: number;
    savingsPercent: number;
  }>;
  totalSavings: number;
}

export interface CacheEfficiencyByModelData {
  models: Array<{
    modelId: string;
    providerId: string;
    avgHitRate: number;
    totalCachedTokens: number;
    costSavings: number;
    requestCount: number;
    efficiency: 'high' | 'medium' | 'low';
  }>;
}

// =============================================================================
// Service Implementation
// =============================================================================

@injectable()
export class AnalyticsService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AnalyticsService: Initialized');
  }

  /**
   * Get gross margin KPI summary with tier breakdown
   * Aggregates gross_margin_usd, credits_deducted from token_usage_ledger
   * Groups by subscription tier for breakdown
   * Compares with previous period for trend calculation
   */
  async getGrossMarginKPI(params: AnalyticsQueryParams): Promise<GrossMarginKPIData> {
    try {
      const { startDate, endDate, tier, providers, models } = this.parseParams(params);

      logger.info('AnalyticsService.getGrossMarginKPI: Fetching KPIs', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        tier,
        providers,
        models,
      });

      // Build where clause
      const whereClause: Prisma.token_usage_ledgerWhereInput = {
        created_at: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user_tier_at_request: tier }),
        ...(providers && providers.length > 0 && { provider_id: { in: providers } }),
        ...(models && models.length > 0 && { model_id: { in: models } }),
      };

      // Current period aggregation
      const currentPeriod = await this.prisma.token_usage_ledger.aggregate({
        where: whereClause,
        _sum: {
          gross_margin_usd: true,
          credits_deducted: true,
        },
        _count: true,
      });

      // Tier breakdown (group by user_tier_at_request)
      const tierBreakdown = await this.prisma.token_usage_ledger.groupBy({
        by: ['user_tier_at_request'],
        where: whereClause,
        _sum: {
          gross_margin_usd: true,
          credits_deducted: true,
        },
      });

      // Previous period for trend calculation
      const periodDays = this.getPeriodDays(params.period);
      const previousStart = new Date(startDate);
      previousStart.setDate(previousStart.getDate() - periodDays);
      const previousEnd = new Date(startDate);

      const previousPeriod = await this.prisma.token_usage_ledger.aggregate({
        where: {
          created_at: { gte: previousStart, lte: previousEnd },
          status: 'success',
        },
        _sum: { gross_margin_usd: true },
      });

      // Calculate metrics
      const totalGrossMargin = Number(currentPeriod._sum.gross_margin_usd || 0);
      const totalRevenue = Number(currentPeriod._sum.credits_deducted || 0) * 0.01; // Credits to USD
      const requestCount = currentPeriod._count;
      const previousMargin = Number(previousPeriod._sum.gross_margin_usd || 0);

      // Build tier breakdown response
      const tierMap = tierBreakdown.map((item) => ({
        tier: item.user_tier_at_request || 'unknown',
        grossMargin: Number(item._sum.gross_margin_usd || 0),
        revenue: Number(item._sum.credits_deducted || 0) * 0.01,
        percentage: totalGrossMargin > 0 ? (Number(item._sum.gross_margin_usd || 0) / totalGrossMargin) * 100 : 0,
      }));

      const result: GrossMarginKPIData = {
        totalGrossMargin,
        totalRevenue,
        marginPercentage: totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0,
        requestCount,
        avgMarginPerRequest: requestCount > 0 ? totalGrossMargin / requestCount : 0,
        previousPeriodMargin: previousMargin,
        trend: this.calculateTrend(totalGrossMargin, previousMargin),
        tierBreakdown: tierMap,
      };

      logger.info('AnalyticsService.getGrossMarginKPI: KPIs calculated', {
        totalGrossMargin: result.totalGrossMargin,
        totalRevenue: result.totalRevenue,
        requestCount: result.requestCount,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getGrossMarginKPI: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cost breakdown by provider (top 5 by cost)
   * Aggregates vendor_cost from token_usage_ledger
   * Groups by provider_id, joins with provider table for names
   */
  async getCostByProvider(params: AnalyticsQueryParams): Promise<ProviderCostData> {
    try {
      const { startDate, endDate, tier, models } = this.parseParams(params);

      logger.info('AnalyticsService.getCostByProvider: Fetching provider costs', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const whereClause: Prisma.token_usage_ledgerWhereInput = {
        created_at: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user_tier_at_request: tier }),
        ...(models && models.length > 0 && { model_id: { in: models } }),
      };

      // Group by provider
      const providerCosts = await this.prisma.token_usage_ledger.groupBy({
        by: ['provider_id'],
        where: whereClause,
        _sum: { vendor_cost: true },
        _count: true,
        orderBy: { _sum: { vendor_cost: 'desc' } },
        take: 5,
      });

      // Get provider names
      const provider_ids = providerCosts.map((p) => p.provider_id);
      const providers = await this.prisma.providers.findMany({
        where: { id: { in: provider_ids } },
        select: { id: true, name: true },
      });

      const providerMap = new Map(providers.map((p) => [p.id, p.name]));

      const totalCost = providerCosts.reduce((sum, p) => sum + Number(p._sum.vendor_cost || 0), 0);
      const totalRequests = providerCosts.reduce((sum, p) => sum + p._count, 0);

      const result: ProviderCostData = {
        providers: providerCosts.map((p) => ({
          provider_id: p.provider_id,
          providerName: providerMap.get(p.provider_id) || 'Unknown',
          totalCost: Number(p._sum.vendor_cost || 0),
          requestCount: p._count,
          avgCostPerRequest: p._count > 0 ? Number(p._sum.vendor_cost || 0) / p._count : 0,
          percentage: totalCost > 0 ? (Number(p._sum.vendor_cost || 0) / totalCost) * 100 : 0,
        })),
        totalCost,
        totalRequests,
      };

      logger.info('AnalyticsService.getCostByProvider: Provider costs calculated', {
        providerCount: result.providers.length,
        totalCost: result.totalCost,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getCostByProvider: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get margin trend over time with time bucketing
   * Aggregates gross_margin_usd by day/week/month
   * Calculates running average (7-day/30-day window)
   */
  async getMarginTrend(params: TrendQueryParams): Promise<MarginTrendData> {
    try {
      const { startDate, endDate, granularity, tier, providers } = this.parseParams(params);

      logger.info('AnalyticsService.getMarginTrend: Fetching margin trend', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity,
      });

      // Use raw SQL for efficient time bucketing
      const truncFunc = granularity === 'hour' ? 'hour' :
                        granularity === 'day' ? 'day' :
                        granularity === 'week' ? 'week' : 'month';

      const dataPoints = await this.prisma.$queryRaw<Array<{
        bucket: Date;
        gross_margin: number;
        revenue: number;
        request_count: number;
      }>>`
        SELECT
          DATE_TRUNC(${truncFunc}, created_at) as bucket,
          COALESCE(SUM(gross_margin_usd), 0) as gross_margin,
          COALESCE(SUM(credits_deducted * 0.01), 0) as revenue,
          COUNT(*) as request_count
        FROM token_usage_ledger
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND status = 'success'
          ${tier ? Prisma.sql`AND user_tier_at_request = ${tier}` : Prisma.empty}
          ${providers && providers.length > 0 ? Prisma.sql`AND provider_id = ANY(${providers}::uuid[])` : Prisma.empty}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      // Calculate moving averages
      const withMovingAvg = this.calculateMovingAverages(dataPoints.map(d => ({
        ...d,
        gross_margin: Number(d.gross_margin),
        revenue: Number(d.revenue),
        request_count: Number(d.request_count),
      })), granularity || 'day');

      // Determine trend
      const dataValues = withMovingAvg.map(p => p.gross_margin);
      const firstHalf = dataValues.slice(0, Math.floor(dataValues.length / 2));
      const secondHalf = dataValues.slice(Math.floor(dataValues.length / 2));
      const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length : 0;
      const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length : 0;
      const trend = avgSecond > avgFirst * 1.05 ? 'increasing' :
                    avgSecond < avgFirst * 0.95 ? 'decreasing' : 'stable';

      const peakPoint = withMovingAvg.reduce((max, p) => p.gross_margin > max.gross_margin ? p : max, withMovingAvg[0] || { gross_margin: 0, bucket: new Date() });

      const result: MarginTrendData = {
        dataPoints: withMovingAvg.map((p) => ({
          timestamp: p.bucket.toISOString(),
          grossMargin: p.gross_margin,
          revenue: p.revenue,
          requestCount: p.request_count,
          runningAvg7Day: p.avg7Day,
          runningAvg30Day: p.avg30Day,
        })),
        summary: {
          peakMargin: peakPoint.gross_margin,
          peakDate: peakPoint.bucket.toISOString(),
          avgMargin: dataValues.length > 0 ? dataValues.reduce((sum, v) => sum + v, 0) / dataValues.length : 0,
          trend,
        },
      };

      logger.info('AnalyticsService.getMarginTrend: Trend calculated', {
        dataPointCount: result.dataPoints.length,
        trend: result.summary.trend,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getMarginTrend: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cost distribution histogram
   * Groups requests into cost buckets
   * Identifies anomalies (>3 std dev from mean)
   */
  async getCostDistribution(params: AnalyticsQueryParams): Promise<CostDistributionData> {
    try {
      const { startDate, endDate, tier, providers } = this.parseParams(params);

      logger.info('AnalyticsService.getCostDistribution: Fetching cost distribution', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const whereClause: Prisma.token_usage_ledgerWhereInput = {
        created_at: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user_tier_at_request: tier }),
        ...(providers && providers.length > 0 && { provider_id: { in: providers } }),
      };

      // Get all costs for statistics
      const costs = await this.prisma.token_usage_ledger.findMany({
        where: whereClause,
        select: { vendor_cost: true, request_id: true, created_at: true, model_id: true },
      });

      const costValues = costs.map((c) => Number(c.vendor_cost));
      const mean = costValues.length > 0 ? costValues.reduce((sum, c) => sum + c, 0) / costValues.length : 0;
      const variance = costValues.length > 0 ? costValues.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costValues.length : 0;
      const stdDev = Math.sqrt(variance);

      // Define buckets
      const buckets = [
        { rangeMin: 0, rangeMax: 0.01, requestCount: 0, totalCost: 0, percentage: 0 },
        { rangeMin: 0.01, rangeMax: 0.10, requestCount: 0, totalCost: 0, percentage: 0 },
        { rangeMin: 0.10, rangeMax: 1.00, requestCount: 0, totalCost: 0, percentage: 0 },
        { rangeMin: 1.00, rangeMax: 10.00, requestCount: 0, totalCost: 0, percentage: 0 },
        { rangeMin: 10.00, rangeMax: Infinity, requestCount: 0, totalCost: 0, percentage: 0 },
      ];

      // Populate buckets
      costs.forEach((cost) => {
        const value = Number(cost.vendor_cost);
        const bucket = buckets.find((b) => value >= b.rangeMin && value < b.rangeMax);
        if (bucket) {
          bucket.requestCount++;
          bucket.totalCost += value;
        }
      });

      // Calculate percentages
      buckets.forEach((bucket) => {
        bucket.percentage = costs.length > 0 ? (bucket.requestCount / costs.length) * 100 : 0;
      });

      // Identify anomalies (>3 std dev)
      const anomalies = costs
        .filter((c) => Math.abs(Number(c.vendor_cost) - mean) > 3 * stdDev)
        .map((c) => ({
          request_id: c.request_id,
          cost: Number(c.vendor_cost),
          timestamp: c.created_at.toISOString(),
          model: c.model_id,
          stdDeviation: Math.abs(Number(c.vendor_cost) - mean) / stdDev,
        }));

      // Calculate percentiles
      const sorted = [...costValues].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      const median = sorted[Math.floor(sorted.length * 0.5)] || 0;

      const result: CostDistributionData = {
        buckets,
        anomalies,
        statistics: {
          mean,
          median,
          stdDev,
          p95,
          p99,
        },
      };

      logger.info('AnalyticsService.getCostDistribution: Distribution calculated', {
        totalRequests: costs.length,
        anomalyCount: anomalies.length,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getCostDistribution: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Export analytics to CSV with streaming
   * Streams token_usage_ledger rows to CSV
   * Handles large datasets (>100k rows) with batching
   */
  async exportToCSV(params: AnalyticsQueryParams): Promise<Readable> {
    try {
      const { startDate, endDate, tier, providers, models } = this.parseParams(params);

      logger.info('AnalyticsService.exportToCSV: Starting CSV export', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const whereClause: Prisma.token_usage_ledgerWhereInput = {
        created_at: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user_tier_at_request: tier }),
        ...(providers && providers.length > 0 && { provider_id: { in: providers } }),
        ...(models && models.length > 0 && { model_id: { in: models } }),
      };

      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      // Capture prisma instance in closure
      const prisma = this.prisma;

      const stream = new Readable({
        async read() {
          try {
            if (offset === 0) {
              // Write CSV header
              this.push('date,tier,provider,model,request_count,total_cost,gross_margin,avg_cost_per_request\n');
            }

            if (!hasMore) {
              this.push(null); // End stream
              return;
            }

            const batch = await prisma.token_usage_ledger.findMany({
              where: whereClause,
              include: { providers: { select: { name: true } } },
              skip: offset,
              take: batchSize,
              orderBy: { created_at: 'asc' },
            });

            if (batch.length === 0) {
              hasMore = false;
              this.push(null); // End stream
              return;
            }

            // Group by date + tier + provider + model
            const grouped = new Map<string, {
              date: string;
              tier: string;
              provider: string;
              model: string;
              requestCount: number;
              totalCost: number;
              grossMargin: number;
            }>();

            batch.forEach((row) => {
              const date = row.created_at.toISOString().split('T')[0];
              const key = `${date}-${row.user_tier_at_request}-${row.providers.name}-${row.model_id}`;
              const existing = grouped.get(key) || {
                date,
                tier: row.user_tier_at_request || 'unknown',
                provider: row.providers.name,
                model: row.model_id,
                requestCount: 0,
                totalCost: 0,
                grossMargin: 0,
              };
              existing.requestCount++;
              existing.totalCost += Number(row.vendor_cost);
              existing.grossMargin += Number(row.gross_margin_usd);
              grouped.set(key, existing);
            });

            // Write CSV rows
            grouped.forEach((row) => {
              const avgCost = row.requestCount > 0 ? row.totalCost / row.requestCount : 0;
              const csvRow = `${row.date},${row.tier},${row.provider},${row.model},${row.requestCount},${row.totalCost.toFixed(4)},${row.grossMargin.toFixed(4)},${avgCost.toFixed(6)}\n`;
              this.push(csvRow);
            });

            offset += batchSize;
          } catch (error) {
            logger.error('AnalyticsService.exportToCSV: Stream error', {
              error: error instanceof Error ? error.message : String(error),
            });
            this.destroy(error as Error);
          }
        },
      });

      return stream;
    } catch (error) {
      logger.error('AnalyticsService.exportToCSV: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ===========================================================================
  // Cache Performance Analytics (Plan 207)
  // ===========================================================================

  /**
   * Get cache performance KPI summary
   * Aggregates cache metrics from token_usage_ledger
   * Calculates hit rates, savings, and adoption metrics
   */
  async getCachePerformanceKPI(params: AnalyticsQueryParams): Promise<CachePerformanceKPIData> {
    try {
      const { startDate, endDate, tier, providers, models } = this.parseParams(params);

      logger.info('AnalyticsService.getCachePerformanceKPI: Fetching cache KPIs', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const whereClause: Prisma.token_usage_ledgerWhereInput = {
        created_at: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user_tier_at_request: tier }),
        ...(providers && providers.length > 0 && { provider_id: { in: providers } }),
        ...(models && models.length > 0 && { model_id: { in: models } }),
      };

      // Current period aggregation
      const currentPeriod = await this.prisma.token_usage_ledger.aggregate({
        where: whereClause,
        _avg: {
          cache_hit_rate: true,
          cost_savings_percent: true,
        },
        _sum: {
          cache_creation_tokens: true,
          cache_read_tokens: true,
          cached_prompt_tokens: true,
        },
        _count: true,
      });

      // Count cache-enabled requests (where cache_hit_rate > 0)
      const cacheEnabledCount = await this.prisma.token_usage_ledger.count({
        where: {
          ...whereClause,
          cache_hit_rate: { gt: 0 },
        },
      });

      // Calculate total savings from cost_savings_percent
      const savingsData = await this.prisma.$queryRaw<Array<{ total_savings: number }>>`
        SELECT COALESCE(SUM(vendor_cost * cost_savings_percent / 100), 0) as total_savings
        FROM token_usage_ledger
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND status = 'success'
          AND cost_savings_percent IS NOT NULL
          ${tier ? Prisma.sql`AND user_tier_at_request = ${tier}` : Prisma.empty}
          ${providers && providers.length > 0 ? Prisma.sql`AND provider_id = ANY(${providers}::uuid[])` : Prisma.empty}
          ${models && models.length > 0 ? Prisma.sql`AND model_id = ANY(${models}::text[])` : Prisma.empty}
      `;

      // Previous period for trend
      const periodDays = this.getPeriodDays(params.period);
      const previousStart = new Date(startDate);
      previousStart.setDate(previousStart.getDate() - periodDays);
      const previousEnd = new Date(startDate);

      const previousPeriod = await this.prisma.token_usage_ledger.aggregate({
        where: {
          created_at: { gte: previousStart, lte: previousEnd },
          status: 'success',
        },
        _avg: { cache_hit_rate: true },
      });

      // Calculate metrics
      const avgCacheHitRate = Number(currentPeriod._avg.cache_hit_rate || 0);
      const avgSavingsPercent = Number(currentPeriod._avg.cost_savings_percent || 0);
      const totalCachedTokens = Number(currentPeriod._sum.cache_creation_tokens || 0) +
                                Number(currentPeriod._sum.cache_read_tokens || 0) +
                                Number(currentPeriod._sum.cached_prompt_tokens || 0);
      const totalRequests = currentPeriod._count;
      const cacheAdoptionRate = totalRequests > 0 ? (cacheEnabledCount / totalRequests) * 100 : 0;
      const totalSavings = Number(savingsData[0]?.total_savings || 0);
      const previousHitRate = Number(previousPeriod._avg.cache_hit_rate || 0);

      const result: CachePerformanceKPIData = {
        avgCacheHitRate,
        totalCachedTokens,
        totalCacheSavings: totalSavings,
        avgSavingsPercent,
        cacheEnabledRequests: cacheEnabledCount,
        totalRequests,
        cacheAdoptionRate,
        breakdown: {
          cacheWriteTokens: Number(currentPeriod._sum.cache_creation_tokens || 0),
          cacheReadTokens: Number(currentPeriod._sum.cache_read_tokens || 0),
          cachedPromptTokens: Number(currentPeriod._sum.cached_prompt_tokens || 0),
        },
        trend: {
          previousPeriodHitRate: previousHitRate,
          hitRateChange: avgCacheHitRate - previousHitRate,
          direction: avgCacheHitRate > previousHitRate ? 'up' :
                     avgCacheHitRate < previousHitRate ? 'down' : 'neutral',
        },
      };

      logger.info('AnalyticsService.getCachePerformanceKPI: Cache KPIs calculated', {
        avgCacheHitRate: result.avgCacheHitRate,
        totalSavings: result.totalCacheSavings,
        adoptionRate: result.cacheAdoptionRate,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getCachePerformanceKPI: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cache hit rate trend over time
   * Time-bucketed aggregation of cache performance
   */
  async getCacheHitRateTrend(params: TrendQueryParams): Promise<CacheHitRateTrendData> {
    try {
      const { startDate, endDate, granularity, tier, providers } = this.parseParams(params);

      logger.info('AnalyticsService.getCacheHitRateTrend: Fetching cache trend', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity,
      });

      const truncFunc = granularity === 'hour' ? 'hour' :
                        granularity === 'day' ? 'day' :
                        granularity === 'week' ? 'week' : 'month';

      const dataPoints = await this.prisma.$queryRaw<Array<{
        bucket: Date;
        avg_hit_rate: number;
        request_count: number;
        cached_tokens: number;
        savings_percent: number;
      }>>`
        SELECT
          DATE_TRUNC(${truncFunc}, created_at) as bucket,
          COALESCE(AVG(cache_hit_rate), 0) as avg_hit_rate,
          COUNT(*) as request_count,
          COALESCE(SUM(cache_creation_tokens + cache_read_tokens + cached_prompt_tokens), 0) as cached_tokens,
          COALESCE(AVG(cost_savings_percent), 0) as savings_percent
        FROM token_usage_ledger
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND status = 'success'
          AND cache_hit_rate IS NOT NULL
          ${tier ? Prisma.sql`AND user_tier_at_request = ${tier}` : Prisma.empty}
          ${providers && providers.length > 0 ? Prisma.sql`AND provider_id = ANY(${providers}::uuid[])` : Prisma.empty}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      const mappedPoints = dataPoints.map(d => ({
        bucket: d.bucket,
        avg_hit_rate: Number(d.avg_hit_rate),
        request_count: Number(d.request_count),
        cached_tokens: Number(d.cached_tokens),
        savings_percent: Number(d.savings_percent),
      }));

      // Determine trend
      const hitRates = mappedPoints.map(p => p.avg_hit_rate);
      const firstHalf = hitRates.slice(0, Math.floor(hitRates.length / 2));
      const secondHalf = hitRates.slice(Math.floor(hitRates.length / 2));
      const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length : 0;
      const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length : 0;
      const trend = avgSecond > avgFirst * 1.05 ? 'improving' :
                    avgSecond < avgFirst * 0.95 ? 'declining' : 'stable';

      const peakPoint = mappedPoints.reduce((max, p) =>
        p.avg_hit_rate > max.avg_hit_rate ? p : max,
        mappedPoints[0] || { avg_hit_rate: 0, bucket: new Date() }
      );

      const result: CacheHitRateTrendData = {
        dataPoints: mappedPoints.map(p => ({
          timestamp: p.bucket.toISOString(),
          avgHitRate: p.avg_hit_rate,
          requestCount: p.request_count,
          cachedTokens: p.cached_tokens,
          savingsPercent: p.savings_percent,
        })),
        summary: {
          peakHitRate: peakPoint.avg_hit_rate,
          peakDate: peakPoint.bucket.toISOString(),
          avgHitRate: hitRates.length > 0 ? hitRates.reduce((sum, v) => sum + v, 0) / hitRates.length : 0,
          trend,
        },
      };

      logger.info('AnalyticsService.getCacheHitRateTrend: Trend calculated', {
        dataPointCount: result.dataPoints.length,
        trend: result.summary.trend,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getCacheHitRateTrend: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cache savings breakdown by provider
   * Shows which providers benefit most from caching
   */
  async getCacheSavingsByProvider(params: AnalyticsQueryParams): Promise<CacheSavingsByProviderData> {
    try {
      const { startDate, endDate, tier, models } = this.parseParams(params);

      logger.info('AnalyticsService.getCacheSavingsByProvider: Fetching provider savings', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const whereClause: Prisma.token_usage_ledgerWhereInput = {
        created_at: { gte: startDate, lte: endDate },
        status: 'success',
        cost_savings_percent: { not: null },
        ...(tier && { user_tier_at_request: tier }),
        ...(models && models.length > 0 && { model_id: { in: models } }),
      };

      // Group by provider
      const providerData = await this.prisma.$queryRaw<Array<{
        provider_id: string;
        total_savings: number;
        avg_hit_rate: number;
        request_count: number;
        savings_percent: number;
      }>>`
        SELECT
          provider_id,
          COALESCE(SUM(vendor_cost * cost_savings_percent / 100), 0) as total_savings,
          COALESCE(AVG(cache_hit_rate), 0) as avg_hit_rate,
          COUNT(*) as request_count,
          COALESCE(AVG(cost_savings_percent), 0) as savings_percent
        FROM token_usage_ledger
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND status = 'success'
          AND cost_savings_percent IS NOT NULL
          ${tier ? Prisma.sql`AND user_tier_at_request = ${tier}` : Prisma.empty}
          ${models && models.length > 0 ? Prisma.sql`AND model_id = ANY(${models}::text[])` : Prisma.empty}
        GROUP BY provider_id
        ORDER BY total_savings DESC
      `;

      // Get provider names
      const providerIds = providerData.map(p => p.provider_id);
      const providers = await this.prisma.providers.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, name: true },
      });

      const providerMap = new Map(providers.map(p => [p.id, p.name]));
      const totalSavings = providerData.reduce((sum, p) => sum + Number(p.total_savings), 0);

      const result: CacheSavingsByProviderData = {
        providers: providerData.map(p => ({
          providerId: p.provider_id,
          providerName: providerMap.get(p.provider_id) || 'Unknown',
          totalSavings: Number(p.total_savings),
          avgHitRate: Number(p.avg_hit_rate),
          requestCount: Number(p.request_count),
          savingsPercent: Number(p.savings_percent),
        })),
        totalSavings,
      };

      logger.info('AnalyticsService.getCacheSavingsByProvider: Savings calculated', {
        providerCount: result.providers.length,
        totalSavings: result.totalSavings,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getCacheSavingsByProvider: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cache efficiency by model
   * Identifies which models have best cache performance
   */
  async getCacheEfficiencyByModel(params: AnalyticsQueryParams): Promise<CacheEfficiencyByModelData> {
    try {
      const { startDate, endDate, tier, providers } = this.parseParams(params);

      logger.info('AnalyticsService.getCacheEfficiencyByModel: Fetching model efficiency', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const modelData = await this.prisma.$queryRaw<Array<{
        model_id: string;
        provider_id: string;
        avg_hit_rate: number;
        total_cached_tokens: number;
        cost_savings: number;
        request_count: number;
      }>>`
        SELECT
          model_id,
          provider_id,
          COALESCE(AVG(cache_hit_rate), 0) as avg_hit_rate,
          COALESCE(SUM(cache_creation_tokens + cache_read_tokens + cached_prompt_tokens), 0) as total_cached_tokens,
          COALESCE(SUM(vendor_cost * cost_savings_percent / 100), 0) as cost_savings,
          COUNT(*) as request_count
        FROM token_usage_ledger
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND status = 'success'
          AND cache_hit_rate IS NOT NULL
          ${tier ? Prisma.sql`AND user_tier_at_request = ${tier}` : Prisma.empty}
          ${providers && providers.length > 0 ? Prisma.sql`AND provider_id = ANY(${providers}::uuid[])` : Prisma.empty}
        GROUP BY model_id, provider_id
        ORDER BY avg_hit_rate DESC
      `;

      const result: CacheEfficiencyByModelData = {
        models: modelData.map(m => {
          const hitRate = Number(m.avg_hit_rate);
          const efficiency = hitRate > 50 ? 'high' : hitRate > 20 ? 'medium' : 'low';
          return {
            modelId: m.model_id,
            providerId: m.provider_id,
            avgHitRate: hitRate,
            totalCachedTokens: Number(m.total_cached_tokens),
            costSavings: Number(m.cost_savings),
            requestCount: Number(m.request_count),
            efficiency,
          };
        }),
      };

      logger.info('AnalyticsService.getCacheEfficiencyByModel: Efficiency calculated', {
        modelCount: result.models.length,
      });

      return result;
    } catch (error) {
      logger.error('AnalyticsService.getCacheEfficiencyByModel: Error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private parseParams(params: any): {
    startDate: Date;
    endDate: Date;
    tier?: string;
    providers?: string[];
    models?: string[];
    granularity?: 'hour' | 'day' | 'week' | 'month';
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (params.period) {
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'custom':
        if (!params.startDate || !params.endDate) {
          throw new Error('Custom period requires both startDate and endDate');
        }
        startDate = new Date(params.startDate);
        endDate = new Date(params.endDate);

        // Validate that dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD');
        }

        // Validate date range
        if (startDate > endDate) {
          throw new Error('Start date must be before end date');
        }
        break;
      default:
        throw new Error('Invalid period');
    }

    return {
      startDate,
      endDate,
      tier: params.tier,
      providers: params.providers,
      models: params.models,
      granularity: params.granularity,
    };
  }

  private calculateTrend(current: number, previous: number): {
    marginChange: number;
    marginChangePercent: number;
    direction: 'up' | 'down' | 'neutral';
  } {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    return { marginChange: change, marginChangePercent: changePercent, direction };
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case 'last_7_days': return 7;
      case 'last_30_days': return 30;
      case 'last_90_days': return 90;
      default: return 30;
    }
  }

  private calculateMovingAverages(
    data: Array<{ bucket: Date; gross_margin: number; revenue: number; request_count: number }>,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Array<{
    bucket: Date;
    gross_margin: number;
    revenue: number;
    request_count: number;
    avg7Day?: number;
    avg30Day?: number;
  }> {
    const window7 = granularity === 'day' ? 7 : granularity === 'hour' ? 168 : 1;
    const window30 = granularity === 'day' ? 30 : granularity === 'hour' ? 720 : 4;

    return data.map((point, index) => {
      const slice7 = data.slice(Math.max(0, index - window7 + 1), index + 1);
      const slice30 = data.slice(Math.max(0, index - window30 + 1), index + 1);

      return {
        ...point,
        avg7Day: slice7.length > 0 ? slice7.reduce((sum, p) => sum + p.gross_margin, 0) / slice7.length : undefined,
        avg30Day: slice30.length > 0 ? slice30.reduce((sum, p) => sum + p.gross_margin, 0) / slice30.length : undefined,
      };
    });
  }
}
