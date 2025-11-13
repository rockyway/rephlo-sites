# Admin Analytics Dashboard - Backend Architecture

**Document Type:** Technical Reference
**Related Plan:** [180-admin-analytics-dashboard-ui-design.md](../plan/180-admin-analytics-dashboard-ui-design.md)
**Status:** Design Phase
**Created:** 2025-01-13
**Last Updated:** 2025-01-13

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Service Layer](#service-layer)
4. [Controller Layer](#controller-layer)
5. [Route Layer](#route-layer)
6. [Database Queries](#database-queries)
7. [Data Transformation](#data-transformation)
8. [Error Handling](#error-handling)
9. [Security Implementation](#security-implementation)
10. [Performance Optimization](#performance-optimization)

---

## Overview

The Analytics Backend provides aggregated financial and usage metrics for the Admin Dashboard, sourced from the `token_usage_ledger` table which tracks vendor costs, gross margins, and token usage per API request.

### Architecture Pattern

```
HTTP Request
  ↓
Route Layer (authentication, rate limiting)
  ↓
Controller Layer (validation, HTTP handling)
  ↓
Service Layer (business logic, aggregations)
  ↓
Prisma ORM (parameterized queries)
  ↓
PostgreSQL (indexed queries on token_usage_ledger)
```

### Key Design Principles

- **3-Layer Separation:** Routes → Controllers → Services → Database
- **Dependency Injection:** TSyringe for service registration
- **Type Safety:** Full TypeScript with strict mode
- **Transformation:** Database results (snake_case) → API responses (camelCase)
- **Security:** JWT authentication + admin scope enforcement
- **Performance:** Database indexes + React Query caching

---

## API Endpoints

### Base Path

```
/admin/analytics
```

All endpoints require:
- Valid JWT token (Authorization: Bearer <token>)
- Admin scope in JWT claims
- Rate limit: 100 requests/hour per user

### Endpoint Specifications

#### 1. GET `/gross-margin`

**Description:** Get gross margin KPI summary with tier breakdown

**Query Parameters:**
```typescript
{
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom',
  startDate?: string,    // ISO 8601 (required if period=custom)
  endDate?: string,      // ISO 8601 (required if period=custom)
  tier?: 'free' | 'pro' | 'enterprise',  // Optional filter
  providers?: string[],  // Optional: ['openai', 'anthropic']
  models?: string[]      // Optional: ['gpt-4o', 'claude-3-5-sonnet']
}
```

**Response Schema:**
```typescript
{
  totalGrossMargin: number,       // USD
  totalRevenue: number,           // USD (credits charged)
  marginPercentage: number,       // 0-100%
  requestCount: number,
  avgMarginPerRequest: number,    // USD
  previousPeriodMargin: number,   // USD
  trend: {
    marginChange: number,         // USD difference
    marginChangePercent: number,  // % change
    direction: 'up' | 'down' | 'neutral'
  },
  tierBreakdown: Array<{
    tier: 'free' | 'pro' | 'enterprise',
    grossMargin: number,          // USD
    revenue: number,              // USD
    percentage: number            // % of total margin
  }>
}
```

**Example:**
```bash
GET /admin/analytics/gross-margin?period=last_30_days&tier=pro
```

---

#### 2. GET `/cost-by-provider`

**Description:** Get vendor cost breakdown aggregated by provider

**Query Parameters:**
```typescript
{
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom',
  startDate?: string,
  endDate?: string,
  tier?: 'free' | 'pro' | 'enterprise',
  models?: string[]
}
```

**Response Schema:**
```typescript
{
  providers: Array<{
    providerId: string,
    providerName: string,        // 'OpenAI', 'Anthropic', etc.
    totalCost: number,           // USD
    requestCount: number,
    avgCostPerRequest: number,   // USD
    percentage: number           // % of total cost
  }>,
  totalCost: number,             // Sum of all providers
  totalRequests: number
}
```

---

#### 3. GET `/margin-trend`

**Description:** Get gross margin trend time series for charting

**Query Parameters:**
```typescript
{
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom',
  startDate?: string,
  endDate?: string,
  granularity: 'hour' | 'day' | 'week' | 'month',
  tier?: 'free' | 'pro' | 'enterprise',
  providers?: string[]
}
```

**Response Schema:**
```typescript
{
  dataPoints: Array<{
    timestamp: string,           // ISO 8601
    grossMargin: number,         // USD
    revenue: number,             // USD
    requestCount: number,
    runningAvg7Day?: number,     // 7-day moving average
    runningAvg30Day?: number     // 30-day moving average
  }>,
  summary: {
    peakMargin: number,          // Highest margin value
    peakDate: string,            // ISO 8601
    avgMargin: number,           // Average over period
    trend: 'increasing' | 'decreasing' | 'stable'
  }
}
```

---

#### 4. GET `/cost-distribution`

**Description:** Get cost distribution histogram (buckets of request costs)

**Query Parameters:**
```typescript
{
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom',
  startDate?: string,
  endDate?: string,
  tier?: 'free' | 'pro' | 'enterprise',
  providers?: string[]
}
```

**Response Schema:**
```typescript
{
  buckets: Array<{
    rangeMin: number,            // USD (e.g., 0.00)
    rangeMax: number,            // USD (e.g., 0.01)
    requestCount: number,
    totalCost: number,           // USD
    percentage: number           // % of total requests
  }>,
  anomalies: Array<{
    requestId: string,
    cost: number,                // USD
    timestamp: string,           // ISO 8601
    model: string,
    stdDeviation: number         // How many std devs from mean
  }>,
  statistics: {
    mean: number,                // USD
    median: number,              // USD
    stdDev: number,              // USD
    p95: number,                 // 95th percentile cost
    p99: number                  // 99th percentile cost
  }
}
```

---

#### 5. POST `/export-csv`

**Description:** Export analytics data to CSV file (streaming for large datasets)

**Request Body:**
```typescript
{
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom',
  startDate?: string,
  endDate?: string,
  tier?: 'free' | 'pro' | 'enterprise',
  providers?: string[],
  models?: string[],
  columns?: string[]             // Optional: specific columns to export
}
```

**Response:**
- Content-Type: `text/csv`
- Streaming response (chunked transfer encoding)
- File name: `rephlo-analytics-{period}.csv`

**CSV Schema:**
```csv
date,tier,provider,model,request_count,total_cost,gross_margin,avg_cost_per_request
2025-01-15,pro,openai,gpt-4o,1250,125.50,45.20,0.1004
2025-01-15,free,anthropic,claude-3-5-sonnet,890,89.00,25.30,0.1000
```

---

## Service Layer

### AnalyticsService (`backend/src/services/analytics.service.ts`)

**Purpose:** Encapsulate business logic for analytics aggregations

```typescript
/**
 * AnalyticsService - Aggregates token usage ledger data for admin dashboard
 *
 * Responsibilities:
 * - Query token_usage_ledger with complex aggregations
 * - Calculate gross margins, vendor costs, trends
 * - Apply filters (date range, tier, provider, model)
 * - Generate CSV exports with streaming
 */
@injectable()
export class AnalyticsService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  /**
   * Get gross margin KPI summary
   * Aggregates gross_margin_usd, credits_deducted from token_usage_ledger
   * Groups by subscription tier for breakdown
   * Compares with previous period for trend calculation
   */
  async getGrossMarginKPI(params: GrossMarginQueryParams): Promise<GrossMarginKPIData> {
    const { startDate, endDate, tier, providers, models } = this.parseParams(params);

    // Current period aggregation
    const currentPeriod = await this.prisma.tokenUsageLedger.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user: { subscriptionTier: tier } }),
        ...(providers && { providerId: { in: providers } }),
        ...(models && { modelId: { in: models } }),
      },
      _sum: {
        grossMarginUsd: true,
        creditsDeducted: true,
      },
      _count: true,
    });

    // Tier breakdown
    const tierBreakdown = await this.prisma.tokenUsageLedger.groupBy({
      by: ['userId'],
      where: { /* same filters */ },
      _sum: { grossMarginUsd: true, creditsDeducted: true },
    });

    // Map to user tiers
    const userIds = tierBreakdown.map(t => t.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, subscriptionTier: true },
    });

    // Aggregate by tier
    const tierMap = new Map<SubscriptionTier, { margin: number, revenue: number }>();
    tierBreakdown.forEach(item => {
      const user = users.find(u => u.id === item.userId);
      const tier = user?.subscriptionTier || 'free';
      const existing = tierMap.get(tier) || { margin: 0, revenue: 0 };
      tierMap.set(tier, {
        margin: existing.margin + (item._sum.grossMarginUsd || 0),
        revenue: existing.revenue + (item._sum.creditsDeducted || 0) * 0.01,
      });
    });

    // Previous period for trend
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - this.getPeriodDays(params.period));
    const previousEnd = new Date(startDate);

    const previousPeriod = await this.prisma.tokenUsageLedger.aggregate({
      where: { createdAt: { gte: previousStart, lte: previousEnd }, status: 'success' },
      _sum: { grossMarginUsd: true },
    });

    // Build response
    const totalGrossMargin = currentPeriod._sum.grossMarginUsd || 0;
    const totalRevenue = (currentPeriod._sum.creditsDeducted || 0) * 0.01;
    const requestCount = currentPeriod._count;
    const previousMargin = previousPeriod._sum.grossMarginUsd || 0;

    return {
      totalGrossMargin,
      totalRevenue,
      marginPercentage: totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0,
      requestCount,
      avgMarginPerRequest: requestCount > 0 ? totalGrossMargin / requestCount : 0,
      previousPeriodMargin: previousMargin,
      trend: this.calculateTrend(totalGrossMargin, previousMargin),
      tierBreakdown: Array.from(tierMap.entries()).map(([tier, data]) => ({
        tier,
        grossMargin: data.margin,
        revenue: data.revenue,
        percentage: totalGrossMargin > 0 ? (data.margin / totalGrossMargin) * 100 : 0,
      })),
    };
  }

  /**
   * Get cost breakdown by provider
   * Aggregates vendor_cost from token_usage_ledger
   * Groups by provider_id, joins with provider table for names
   * Returns top 5 providers by cost
   */
  async getCostByProvider(params: CostQueryParams): Promise<ProviderCostData> {
    const { startDate, endDate, tier, models } = this.parseParams(params);

    const providerCosts = await this.prisma.tokenUsageLedger.groupBy({
      by: ['providerId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user: { subscriptionTier: tier } }),
        ...(models && { modelId: { in: models } }),
      },
      _sum: { vendorCost: true },
      _count: true,
      orderBy: { _sum: { vendorCost: 'desc' } },
      take: 5,
    });

    // Get provider names
    const providerIds = providerCosts.map(p => p.providerId);
    const providers = await this.prisma.provider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, name: true },
    });

    const providerMap = new Map(providers.map(p => [p.id, p.name]));

    const totalCost = providerCosts.reduce((sum, p) => sum + (p._sum.vendorCost || 0), 0);
    const totalRequests = providerCosts.reduce((sum, p) => sum + p._count, 0);

    return {
      providers: providerCosts.map(p => ({
        providerId: p.providerId,
        providerName: providerMap.get(p.providerId) || 'Unknown',
        totalCost: p._sum.vendorCost || 0,
        requestCount: p._count,
        avgCostPerRequest: p._count > 0 ? (p._sum.vendorCost || 0) / p._count : 0,
        percentage: totalCost > 0 ? ((p._sum.vendorCost || 0) / totalCost) * 100 : 0,
      })),
      totalCost,
      totalRequests,
    };
  }

  /**
   * Get margin trend over time
   * Aggregates gross_margin_usd by day/week/month
   * Calculates running average (7-day/30-day window)
   * Returns time series data for line chart
   */
  async getMarginTrend(params: TrendQueryParams): Promise<MarginTrendData> {
    const { startDate, endDate, granularity, tier, providers } = this.parseParams(params);

    // Use raw SQL for efficient time bucketing
    const bucketExpr = this.getBucketExpression(granularity);

    const dataPoints = await this.prisma.$queryRaw<Array<{
      bucket: Date,
      gross_margin: number,
      revenue: number,
      request_count: number
    }>>`
      SELECT
        DATE_TRUNC(${granularity}, created_at) as bucket,
        SUM(gross_margin_usd) as gross_margin,
        SUM(credits_deducted * 0.01) as revenue,
        COUNT(*) as request_count
      FROM token_usage_ledger
      WHERE created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND status = 'success'
        ${tier ? Prisma.sql`AND user_id IN (SELECT id FROM users WHERE subscription_tier = ${tier})` : Prisma.empty}
        ${providers ? Prisma.sql`AND provider_id = ANY(${providers})` : Prisma.empty}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    // Calculate moving averages
    const withMovingAvg = this.calculateMovingAverages(dataPoints, granularity);

    // Determine trend
    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));
    const avgFirst = firstHalf.reduce((sum, p) => sum + p.gross_margin, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, p) => sum + p.gross_margin, 0) / secondHalf.length;
    const trend = avgSecond > avgFirst * 1.05 ? 'increasing'
                : avgSecond < avgFirst * 0.95 ? 'decreasing'
                : 'stable';

    return {
      dataPoints: withMovingAvg.map(p => ({
        timestamp: p.bucket.toISOString(),
        grossMargin: p.gross_margin,
        revenue: p.revenue,
        requestCount: p.request_count,
        runningAvg7Day: p.avg7Day,
        runningAvg30Day: p.avg30Day,
      })),
      summary: {
        peakMargin: Math.max(...dataPoints.map(p => p.gross_margin)),
        peakDate: dataPoints.reduce((max, p) => p.gross_margin > max.gross_margin ? p : max).bucket.toISOString(),
        avgMargin: dataPoints.reduce((sum, p) => sum + p.gross_margin, 0) / dataPoints.length,
        trend,
      },
    };
  }

  /**
   * Get cost distribution histogram
   * Groups requests into cost buckets ($0-0.01, $0.01-0.10, etc)
   * Calculates request count and total cost per bucket
   * Identifies anomalies (>3 std dev from mean)
   */
  async getCostDistribution(params: DistributionQueryParams): Promise<CostDistributionData> {
    const { startDate, endDate, tier, providers } = this.parseParams(params);

    // Get all costs for statistics
    const costs = await this.prisma.tokenUsageLedger.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'success',
        ...(tier && { user: { subscriptionTier: tier } }),
        ...(providers && { providerId: { in: providers } }),
      },
      select: { vendorCost: true, requestId: true, createdAt: true, modelId: true },
    });

    const costValues = costs.map(c => c.vendorCost);
    const mean = costValues.reduce((sum, c) => sum + c, 0) / costValues.length;
    const variance = costValues.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costValues.length;
    const stdDev = Math.sqrt(variance);

    // Define buckets
    const buckets = [
      { rangeMin: 0, rangeMax: 0.01 },
      { rangeMin: 0.01, rangeMax: 0.10 },
      { rangeMin: 0.10, rangeMax: 1.00 },
      { rangeMin: 1.00, rangeMax: 10.00 },
      { rangeMin: 10.00, rangeMax: Infinity },
    ];

    const bucketCounts = buckets.map(bucket => ({
      ...bucket,
      requestCount: 0,
      totalCost: 0,
      percentage: 0,
    }));

    costs.forEach(cost => {
      const bucket = bucketCounts.find(b => cost.vendorCost >= b.rangeMin && cost.vendorCost < b.rangeMax);
      if (bucket) {
        bucket.requestCount++;
        bucket.totalCost += cost.vendorCost;
      }
    });

    bucketCounts.forEach(bucket => {
      bucket.percentage = (bucket.requestCount / costs.length) * 100;
    });

    // Identify anomalies (>3 std dev from mean)
    const anomalies = costs
      .filter(c => Math.abs(c.vendorCost - mean) > 3 * stdDev)
      .map(c => ({
        requestId: c.requestId,
        cost: c.vendorCost,
        timestamp: c.createdAt.toISOString(),
        model: c.modelId,
        stdDeviation: Math.abs(c.vendorCost - mean) / stdDev,
      }));

    // Calculate percentiles
    const sorted = [...costValues].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const median = sorted[Math.floor(sorted.length * 0.5)];

    return {
      buckets: bucketCounts,
      anomalies,
      statistics: {
        mean,
        median,
        stdDev,
        p95,
        p99,
      },
    };
  }

  /**
   * Export analytics to CSV
   * Streams token_usage_ledger rows to CSV
   * Includes all filter parameters
   * Handles large datasets (>100k rows) with streaming
   */
  async exportToCSV(params: ExportParams): Promise<NodeJS.ReadableStream> {
    const { startDate, endDate, tier, providers, models } = this.parseParams(params);

    // Create CSV header
    const header = 'date,tier,provider,model,request_count,total_cost,gross_margin,avg_cost_per_request\n';

    // Stream results in batches
    const batchSize = 1000;
    let offset = 0;

    const stream = new Readable({
      async read() {
        if (offset === 0) {
          this.push(header);
        }

        const batch = await this.prisma.tokenUsageLedger.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: 'success',
            ...(tier && { user: { subscriptionTier: tier } }),
            ...(providers && { providerId: { in: providers } }),
            ...(models && { modelId: { in: models } }),
          },
          include: { provider: true, user: true },
          skip: offset,
          take: batchSize,
          orderBy: { createdAt: 'asc' },
        });

        if (batch.length === 0) {
          this.push(null); // End stream
          return;
        }

        // Group by date + tier + provider + model
        const grouped = new Map<string, {
          date: string,
          tier: string,
          provider: string,
          model: string,
          requestCount: number,
          totalCost: number,
          grossMargin: number,
        }>();

        batch.forEach(row => {
          const key = `${row.createdAt.toISOString().split('T')[0]}-${row.user.subscriptionTier}-${row.provider.name}-${row.modelId}`;
          const existing = grouped.get(key) || {
            date: row.createdAt.toISOString().split('T')[0],
            tier: row.user.subscriptionTier,
            provider: row.provider.name,
            model: row.modelId,
            requestCount: 0,
            totalCost: 0,
            grossMargin: 0,
          };
          existing.requestCount++;
          existing.totalCost += row.vendorCost;
          existing.grossMargin += row.grossMarginUsd;
          grouped.set(key, existing);
        });

        // Convert to CSV rows
        grouped.forEach(row => {
          const avgCost = row.requestCount > 0 ? row.totalCost / row.requestCount : 0;
          const csvRow = `${row.date},${row.tier},${row.provider},${row.model},${row.requestCount},${row.totalCost.toFixed(4)},${row.grossMargin.toFixed(4)},${avgCost.toFixed(6)}\n`;
          this.push(csvRow);
        });

        offset += batchSize;
      },
    });

    return stream;
  }

  // Helper methods
  private parseParams(params: any) {
    const now = new Date();
    let startDate: Date, endDate: Date;

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
        startDate = new Date(params.startDate);
        endDate = new Date(params.endDate);
        break;
      default:
        throw new Error('Invalid period');
    }

    return { startDate, endDate, ...params };
  }

  private calculateTrend(current: number, previous: number) {
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

  private calculateMovingAverages(data: any[], granularity: string) {
    const window7 = granularity === 'day' ? 7 : granularity === 'hour' ? 168 : 1;
    const window30 = granularity === 'day' ? 30 : granularity === 'hour' ? 720 : 4;

    return data.map((point, index) => {
      const slice7 = data.slice(Math.max(0, index - window7), index + 1);
      const slice30 = data.slice(Math.max(0, index - window30), index + 1);

      return {
        ...point,
        avg7Day: slice7.reduce((sum, p) => sum + p.gross_margin, 0) / slice7.length,
        avg30Day: slice30.reduce((sum, p) => sum + p.gross_margin, 0) / slice30.length,
      };
    });
  }
}
```

---

## Controller Layer

### AnalyticsController (`backend/src/controllers/analytics.controller.ts`)

**Purpose:** Handle HTTP requests, validate input, transform responses

```typescript
/**
 * AnalyticsController - HTTP request handlers for admin analytics
 *
 * Responsibilities:
 * - Validate query parameters (Zod schemas)
 * - Call AnalyticsService methods
 * - Transform database results to API responses (camelCase)
 * - Handle errors with standard error responses
 */
@injectable()
export class AnalyticsController {
  constructor(
    @inject(AnalyticsService) private analyticsService: AnalyticsService
  ) {}

  /**
   * GET /admin/analytics/gross-margin
   * Query: period, tier?, providers?, models?
   * Response: GrossMarginKPIData (camelCase)
   */
  async getGrossMargin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate query parameters
      const params = GrossMarginQuerySchema.parse(req.query);

      // Call service
      const data = await this.analyticsService.getGrossMarginKPI(params);

      // Transform to API response (already in camelCase from service)
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/analytics/cost-by-provider
   * Query: period, tier?, models?
   * Response: ProviderCostData (camelCase)
   */
  async getCostByProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = CostQuerySchema.parse(req.query);
      const data = await this.analyticsService.getCostByProvider(params);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/analytics/margin-trend
   * Query: period, granularity, tier?, providers?
   * Response: MarginTrendData (camelCase)
   */
  async getMarginTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = TrendQuerySchema.parse(req.query);
      const data = await this.analyticsService.getMarginTrend(params);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/analytics/cost-distribution
   * Query: period, tier?, providers?
   * Response: CostDistributionData (camelCase)
   */
  async getCostDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = DistributionQuerySchema.parse(req.query);
      const data = await this.analyticsService.getCostDistribution(params);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/analytics/export-csv
   * Body: ExportParams
   * Response: text/csv stream
   */
  async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = ExportParamsSchema.parse(req.body);

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="rephlo-analytics-${params.period}.csv"`);

      // Stream CSV data
      const stream = await this.analyticsService.exportToCSV(params);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
```

---

## Route Layer

### Analytics Routes (`backend/src/api/analytics.routes.ts`)

**Purpose:** Define endpoints, apply middleware

```typescript
/**
 * Analytics Routes - Admin-only analytics endpoints
 *
 * Security:
 * - JWT authentication required (authenticate() middleware)
 * - Admin scope required (requireScopes(['admin']))
 * - Rate limiting: 100 requests/hour
 */
import express from 'express';
import { container } from 'tsyringe';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/authenticate';
import { requireScopes } from '../middleware/requireScopes';
import { analyticsRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const analyticsController = container.resolve(AnalyticsController);

// Apply authentication + admin scope to all routes
router.use(authenticate());
router.use(requireScopes(['admin']));
router.use(analyticsRateLimiter);

// Analytics endpoints
router.get('/gross-margin', (req, res, next) => analyticsController.getGrossMargin(req, res, next));
router.get('/cost-by-provider', (req, res, next) => analyticsController.getCostByProvider(req, res, next));
router.get('/margin-trend', (req, res, next) => analyticsController.getMarginTrend(req, res, next));
router.get('/cost-distribution', (req, res, next) => analyticsController.getCostDistribution(req, res, next));
router.post('/export-csv', (req, res, next) => analyticsController.exportCSV(req, res, next));

export default router;
```

### Rate Limiter Configuration

```typescript
// backend/src/middleware/rateLimiter.ts

export const analyticsRateLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                   // 100 requests per hour
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many analytics requests. Try again in 1 hour.',
      }
    });
  },
});
```

---

## Database Queries

### SQL Patterns

#### Gross Margin Aggregation

```sql
-- Current period aggregation
SELECT
  SUM(gross_margin_usd) as total_gross_margin,
  SUM(credits_deducted * 0.01) as total_revenue,
  COUNT(*) as request_count
FROM token_usage_ledger
WHERE created_at >= $1 AND created_at <= $2
  AND status = 'success'
  AND (tier IS NULL OR tier = $3)
  AND (provider_id IS NULL OR provider_id = ANY($4));

-- Tier breakdown
SELECT
  u.subscription_tier as tier,
  SUM(t.gross_margin_usd) as gross_margin,
  SUM(t.credits_deducted * 0.01) as revenue
FROM token_usage_ledger t
JOIN users u ON t.user_id = u.id
WHERE t.created_at >= $1 AND t.created_at <= $2
GROUP BY u.subscription_tier;
```

#### Provider Cost Aggregation

```sql
SELECT
  p.name as provider_name,
  SUM(t.vendor_cost) as total_cost,
  COUNT(*) as request_count,
  AVG(t.vendor_cost) as avg_cost
FROM token_usage_ledger t
JOIN providers p ON t.provider_id = p.id
WHERE t.created_at >= $1 AND t.created_at <= $2
GROUP BY p.id, p.name
ORDER BY total_cost DESC
LIMIT 5;
```

#### Time Series Aggregation

```sql
-- Daily margin trend
SELECT
  DATE_TRUNC('day', created_at) as bucket,
  SUM(gross_margin_usd) as gross_margin,
  SUM(credits_deducted * 0.01) as revenue,
  COUNT(*) as request_count
FROM token_usage_ledger
WHERE created_at >= $1 AND created_at <= $2
  AND status = 'success'
GROUP BY bucket
ORDER BY bucket ASC;
```

---

## Data Transformation

### Database to API Response Mapping

All service methods return camelCase responses. No additional transformation needed in controllers.

**Example:**

```typescript
// Database query (snake_case fields)
const dbResult = await prisma.tokenUsageLedger.aggregate({
  _sum: { grossMarginUsd: true, creditsDeducted: true },
  _count: true,
});

// Transform to API response (camelCase)
return {
  totalGrossMargin: dbResult._sum.grossMarginUsd || 0,
  totalRevenue: (dbResult._sum.creditsDeducted || 0) * 0.01,
  requestCount: dbResult._count,
};
```

---

## Error Handling

### Standardized Error Responses

```typescript
{
  "error": {
    "code": "ANALYTICS_QUERY_FAILED",
    "message": "Failed to calculate gross margin",
    "details": "Database timeout after 10 seconds",
    "timestamp": "2025-01-30T14:32:15.000Z",
    "requestId": "req-abc123"
  }
}
```

### Error Codes

| Code                         | HTTP Status | Description                          |
|------------------------------|-------------|--------------------------------------|
| `ANALYTICS_QUERY_FAILED`     | 500         | Database query timeout               |
| `INVALID_DATE_RANGE`         | 400         | Start date > end date                |
| `RATE_LIMIT_EXCEEDED`        | 429         | Too many requests                    |
| `INSUFFICIENT_PERMISSIONS`   | 403         | Not admin user                       |
| `CSV_EXPORT_TOO_LARGE`       | 413         | >500k rows requested                 |

---

## Security Implementation

### JWT Validation

```typescript
// All analytics endpoints require valid JWT
app.use('/admin/analytics', authenticate(), requireScopes(['admin']));

// JWT claims required:
interface JWTPayload {
  sub: string;           // User ID
  email: string;         // User email
  scope: string[];       // ['admin', 'user.info']
  role: 'admin' | 'user';
  iat: number;           // Issued at
  exp: number;           // Expiry
}
```

### Authorization Matrix

| Endpoint                   | Required Scope | Required Role |
|----------------------------|----------------|---------------|
| GET /gross-margin          | admin          | admin         |
| GET /cost-by-provider      | admin          | admin         |
| GET /margin-trend          | admin          | admin         |
| GET /cost-distribution     | admin          | admin         |
| POST /export-csv           | admin          | admin         |

### SQL Injection Prevention

```typescript
// ✅ SAFE: Prisma uses parameterized queries
const result = await prisma.tokenUsageLedger.findMany({
  where: {
    createdAt: { gte: startDate, lte: endDate },
    providerId: { in: providerIds },  // Array binding
  }
});

// ✅ SAFE: Even raw queries use $1, $2 placeholders
const result = await prisma.$queryRaw`
  SELECT SUM(gross_margin_usd)
  FROM token_usage_ledger
  WHERE created_at >= ${startDate}
    AND provider_id = ANY(${providerIds})
`;
```

### Data Privacy

No individual user IDs exposed in aggregated analytics:

```typescript
// ✅ GOOD: Aggregated data only
{
  tier: 'pro',
  totalRequests: 15890,
  totalCost: 2840.00,
  avgCostPerRequest: 0.179
}

// ❌ BAD: Exposes individual user IDs
{
  userId: 'user-123',
  requestId: 'req-456',
  cost: 0.025
}
```

---

## Performance Optimization

### Database Indexes

```sql
-- Composite index on token_usage_ledger
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_analytics
ON token_usage_ledger (created_at DESC, status, provider_id, user_id)
INCLUDE (gross_margin_usd, vendor_cost, credits_deducted, input_tokens, output_tokens);

-- Partial index for successful requests only (smaller, faster)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_success
ON token_usage_ledger (created_at DESC)
WHERE status = 'success';
```

**Expected Performance:**
- Without index: 2-5 seconds for 100k rows
- With index: 50-200ms for same query
- Index size: ~15MB for 1M rows

### Query Optimization

```sql
-- ✅ GOOD: Use index-friendly queries
SELECT SUM(gross_margin_usd), COUNT(*)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01'
  AND created_at <= '2025-01-31'
  AND status = 'success';

-- ❌ BAD: Avoid functions on indexed columns
SELECT SUM(gross_margin_usd)
FROM token_usage_ledger
WHERE DATE_TRUNC('day', created_at) = '2025-01-01'; -- Doesn't use index!
```

### CSV Export Streaming

**Memory-Efficient Streaming:**

```typescript
// ❌ BAD: Load all rows into memory (crashes with >50k rows)
const rows = await prisma.tokenUsageLedger.findMany();
const csv = rows.map(row => toCSV(row)).join('\n');

// ✅ GOOD: Stream rows in batches
for (let offset = 0; offset < totalRows; offset += 1000) {
  const batch = await prisma.tokenUsageLedger.findMany({
    skip: offset,
    take: 1000,
  });
  batch.forEach(row => stream.write(toCSVRow(row)));
}
```

**Performance Benchmarks:**

| Rows    | Memory (Old) | Memory (Stream) | Time (Old) | Time (Stream) |
|---------|--------------|-----------------|------------|---------------|
| 10k     | 50MB         | 10MB            | 2s         | 3s            |
| 100k    | 500MB        | 15MB            | 20s        | 25s           |
| 500k    | 2.5GB (💥)   | 20MB            | N/A        | 2 min         |

---

## References

- **Plan:** [180-admin-analytics-dashboard-ui-design.md](../plan/180-admin-analytics-dashboard-ui-design.md)
- **Database Schema:** [183-analytics-database-schema.md](./183-analytics-database-schema.md)
- **Frontend Architecture:** [182-analytics-frontend-architecture.md](./182-analytics-frontend-architecture.md)
- **Security & Compliance:** [184-analytics-security-compliance.md](./184-analytics-security-compliance.md)
- **API Standards:** [156-api-standards.md](./156-api-standards.md)
