/**
 * Admin Analytics Types
 *
 * TypeScript type definitions for the Unified Admin Dashboard analytics endpoints.
 * Defines request query parameters and response structures for dashboard KPIs
 * and recent activity feeds.
 *
 * @module types/admin-analytics.types
 */

// =============================================================================
// Dashboard KPIs Types
// =============================================================================

/**
 * Query parameters for dashboard KPIs endpoint
 */
export interface DashboardKPIsQuery {
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
 * Revenue breakdown by source
 */
export interface RevenueBreakdown {
  mrr: number; // Monthly recurring revenue from subscriptions (USD cents)
  perpetual: number; // Revenue from perpetual licenses (USD cents)
  upgrades: number; // Revenue from version upgrades (USD cents)
}

/**
 * Total revenue KPI with breakdown
 */
export interface TotalRevenueKPI {
  value: number; // Total revenue in USD cents
  change: ChangeMetric; // Change vs previous period
  breakdown: RevenueBreakdown;
}

/**
 * Active users KPI
 */
export interface ActiveUsersKPI {
  value: number; // Count of users with active subscription OR license
  change: ChangeMetric; // Change vs previous period
}

/**
 * Credits consumed KPI
 */
export interface CreditsConsumedKPI {
  value: number; // Total credits consumed in period
  change: ChangeMetric; // Change vs previous period
}

/**
 * Coupon redemptions KPI
 */
export interface CouponRedemptionsKPI {
  value: number; // Count of coupon redemptions in period
  change: ChangeMetric; // Change vs previous period
  totalDiscount: number; // Total discount value in USD cents
}

/**
 * Dashboard KPIs response structure
 */
export interface DashboardKPIsResponse {
  totalRevenue: TotalRevenueKPI;
  activeUsers: ActiveUsersKPI;
  creditsConsumed: CreditsConsumedKPI;
  couponRedemptions: CouponRedemptionsKPI;
}

// =============================================================================
// Recent Activity Types
// =============================================================================

/**
 * Query parameters for recent activity endpoint
 */
export interface RecentActivityQuery {
  limit?: number; // Default: 20, Max: 100
  offset?: number; // Default: 0
}

/**
 * Activity event type
 */
export type ActivityEventType = 'subscription' | 'license' | 'coupon' | 'credit' | 'device';

/**
 * Activity event action
 */
export type ActivityEventAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'deactivated'
  | 'redeemed';

/**
 * User information in activity event
 */
export interface ActivityEventUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Single activity event
 */
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  action: ActivityEventAction;
  description: string; // Human-readable description
  user: ActivityEventUser;
  metadata: Record<string, any>; // Event-specific data
  timestamp: Date;
}

/**
 * Recent activity response with pagination
 */
export interface RecentActivityResponse {
  events: ActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Helper Types for Internal Use
// =============================================================================

/**
 * Period configuration for date range calculations
 */
export interface PeriodConfig {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

/**
 * Raw subscription revenue data from database
 */
export interface SubscriptionRevenueData {
  currentMRR: number;
  previousMRR: number;
}

/**
 * Raw perpetual license revenue data from database
 */
export interface PerpetualRevenueData {
  currentRevenue: number;
  previousRevenue: number;
}

/**
 * Raw version upgrade revenue data from database
 */
export interface UpgradeRevenueData {
  currentRevenue: number;
  previousRevenue: number;
}

/**
 * Raw active users count data from database
 */
export interface ActiveUsersData {
  currentCount: number;
  previousCount: number;
}

/**
 * Raw credits consumed data from database
 */
export interface CreditsConsumedData {
  currentCredits: number;
  previousCredits: number;
}

/**
 * Raw coupon redemption data from database
 */
export interface CouponRedemptionData {
  currentCount: number;
  previousCount: number;
  currentDiscount: number;
  previousDiscount: number;
}
