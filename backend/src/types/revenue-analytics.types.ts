/**
 * Revenue Analytics Types
 *
 * TypeScript type definitions for revenue analytics endpoints.
 * Defines request query parameters and response structures for:
 * - KPIs (total revenue, MRR, perpetual, ARPU, coupon discount)
 * - Revenue mix (subscription, perpetual, upgrade breakdown)
 * - Revenue trend (daily/weekly/monthly aggregation)
 * - Revenue funnel (free -> paid -> perpetual conversion)
 * - Credit usage (by model with revenue contribution)
 * - Coupon ROI (by campaign)
 *
 * @module types/revenue-analytics.types
 */

// =============================================================================
// Revenue KPIs Types
// =============================================================================

/**
 * Query parameters for revenue KPIs endpoint
 */
export interface RevenueKPIsQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
}

/**
 * Change metric with value and trend indicator
 */
export interface ChangeMetric {
  value: number; // Percentage change (e.g., 12.5 for +12.5%)
  trend: 'up' | 'down' | 'neutral';
}

/**
 * Single KPI value with change metric
 */
export interface KPIMetric {
  value: number; // USD cents for monetary, count for others
  change: ChangeMetric;
}

/**
 * Total revenue KPI with value and change
 */
export interface TotalRevenueKPI extends KPIMetric {}

/**
 * Monthly recurring revenue KPI
 */
export interface MRRKPI extends KPIMetric {}

/**
 * Perpetual revenue KPI
 */
export interface PerpetualRevenueKPI extends KPIMetric {}

/**
 * Average revenue per user KPI
 */
export interface ARPUKPI extends KPIMetric {}

/**
 * Coupon discount KPI (no change metric)
 */
export interface CouponDiscountKPI {
  value: number; // USD cents
  period: string; // e.g., '30d'
}

/**
 * Revenue KPIs response structure
 */
export interface RevenueKPIsResponse {
  totalRevenue: TotalRevenueKPI;
  mrr: MRRKPI;
  perpetualRevenue: PerpetualRevenueKPI;
  arpu: ARPUKPI;
  couponDiscount: CouponDiscountKPI;
}

// =============================================================================
// Revenue Mix Types
// =============================================================================

/**
 * Query parameters for revenue mix endpoint
 */
export interface RevenueMixQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
}

/**
 * Revenue mix response - breakdown by source
 */
export interface RevenueMixResponse {
  subscriptionRevenue: number; // USD cents
  perpetualRevenue: number; // USD cents
  upgradeRevenue: number; // USD cents
}

// =============================================================================
// Revenue Trend Types
// =============================================================================

/**
 * Query parameters for revenue trend endpoint
 */
export interface RevenueTrendQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
}

/**
 * Single data point in trend
 */
export interface RevenueTrendDataPoint {
  date: string; // ISO date or YYYY-MM-DD or YYYY-MM depending on granularity
  totalRevenue: number; // USD cents
  subscriptionRevenue: number; // USD cents
  perpetualRevenue: number; // USD cents
}

/**
 * Revenue trend response with data array
 */
export interface RevenueTrendResponse {
  data: RevenueTrendDataPoint[];
}

// =============================================================================
// Revenue Funnel Types
// =============================================================================

/**
 * Query parameters for revenue funnel endpoint
 */
export interface RevenueFunnelQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
}

/**
 * Single funnel stage with count and percentage
 */
export interface FunnelStage {
  count: number;
  percentage: number; // 0-100
}

/**
 * Paid subscription stage with conversion rate
 */
export interface PaidSubscriptionStage extends FunnelStage {
  conversionRate: number; // Percentage from free tier
}

/**
 * Perpetual license stage with conversion rate
 */
export interface PerpetualLicenseStage extends FunnelStage {
  conversionRate: number; // Percentage from paid subscription
}

/**
 * Revenue funnel response
 */
export interface RevenueFunnelResponse {
  freeTier: FunnelStage;
  paidSubscription: PaidSubscriptionStage;
  perpetualLicense: PerpetualLicenseStage;
}

// =============================================================================
// Credit Usage Types
// =============================================================================

/**
 * Query parameters for credit usage endpoint
 */
export interface CreditUsageQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
  limit?: number; // Default: 10, max: 100
}

/**
 * Single model credit usage entry
 */
export interface CreditUsageEntry {
  model: string; // Model ID
  credits: number; // Total credits used
  requests: number; // Number of requests
  revenue_contribution: number; // USD cents, estimated
}

/**
 * Credit usage response with data array
 */
export interface CreditUsageResponse {
  data: CreditUsageEntry[];
}

// =============================================================================
// Coupon ROI Types
// =============================================================================

/**
 * Query parameters for coupon ROI endpoint
 */
export interface CouponROIQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
  limit?: number; // Default: 10, max: 100
}

/**
 * Single campaign ROI entry
 */
export interface CouponROIEntry {
  campaign_name: string;
  coupons_issued: number;
  coupons_redeemed: number;
  discount_value: number; // USD cents
  revenue_generated: number; // USD cents
  roi_percentage: number; // ROI % (can be negative)
}

/**
 * Coupon ROI response with data array
 */
export interface CouponROIResponse {
  data: CouponROIEntry[];
}

// =============================================================================
// Helper Types for Internal Use
// =============================================================================

/**
 * Period configuration for date range calculations
 */
export interface PeriodConfig {
  startDate: Date; // Start of current period
  endDate: Date; // End of current period
  previousStartDate: Date; // Start of previous period
  previousEndDate: Date; // End of previous period
}
