/**
 * Analytics Dashboard TypeScript Type Definitions
 *
 * Defines interfaces for all API requests/responses related to the Admin Analytics Dashboard.
 * These types match the backend API's camelCase response format.
 *
 * Reference: Plan 180, Reference Doc 182
 */

export type PeriodType = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type Granularity = 'hour' | 'day' | 'week' | 'month';

/**
 * Filter state for analytics dashboard
 */
export interface AnalyticsFilters {
  period: PeriodType;
  startDate?: string;  // ISO 8601
  endDate?: string;    // ISO 8601
  tier?: SubscriptionTier;
  providers?: string[];
  models?: string[];
}

// ============================================================================
// Gross Margin KPI Types
// ============================================================================

export interface GrossMarginQueryParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  tier?: SubscriptionTier;
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
    tier: SubscriptionTier;
    grossMargin: number;
    revenue: number;
    percentage: number;
  }>;
}

// ============================================================================
// Provider Cost Types
// ============================================================================

export interface CostQueryParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  tier?: SubscriptionTier;
  models?: string[];
}

export interface ProviderCostData {
  providers: Array<{
    providerId: string;
    providerName: string;
    totalCost: number;
    requestCount: number;
    avgCostPerRequest: number;
    percentage: number;
  }>;
  totalCost: number;
  totalRequests: number;
}

// ============================================================================
// Margin Trend Types
// ============================================================================

export interface TrendQueryParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  granularity: Granularity;
  tier?: SubscriptionTier;
  providers?: string[];
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

// ============================================================================
// Cost Distribution Types
// ============================================================================

export interface DistributionQueryParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  tier?: SubscriptionTier;
  providers?: string[];
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
    requestId: string;
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

// ============================================================================
// CSV Export Types
// ============================================================================

export interface ExportParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  tier?: SubscriptionTier;
  providers?: string[];
  models?: string[];
  columns?: string[];
}
