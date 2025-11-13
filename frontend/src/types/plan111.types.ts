/**
 * Plan 111: Coupon & Discount Code System - TypeScript Type Definitions
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

// Import shared types from @rephlo/shared-types
import type {
  Coupon,
  CouponCampaign,
  CouponRedemption,
  FraudDetectionEvent,
  CouponListResponse,
  CampaignListResponse,
  RedemptionListResponse,
  FraudEventListResponse,
  CouponAnalyticsMetrics,
  TopPerformingCoupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ReviewFraudEventRequest,
  SubscriptionTier,
  BillingCycle,
} from '@rephlo/shared-types';

// Import enums as runtime values (not type-only)
import {
  CouponType,
  DiscountType,
  CampaignType,
  CampaignStatus,
  RedemptionStatus,
  FraudDetectionType,
  FraudSeverity,
  FraudResolution,
} from '@rephlo/shared-types';

// Re-export types for convenience
export type {
  Coupon,
  CouponCampaign,
  CouponRedemption,
  FraudDetectionEvent,
  CouponListResponse,
  CampaignListResponse,
  RedemptionListResponse,
  FraudEventListResponse,
  CouponAnalyticsMetrics,
  TopPerformingCoupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ReviewFraudEventRequest,
  SubscriptionTier,
  BillingCycle,
};

// Re-export enums as values (not types)
export {
  CouponType,
  DiscountType,
  CampaignType,
  CampaignStatus,
  RedemptionStatus,
  FraudDetectionType,
  FraudSeverity,
  FraudResolution,
};

// Frontend-specific redemption type (not in shared-types)
export type RedemptionType =
  | 'trial_start'
  | 'new_subscription'
  | 'upgrade'
  | 'downgrade'
  | 'renewal';

// ===== Core Models (using shared-types) =====
// Coupon, CouponCampaign, CouponRedemption, FraudDetectionEvent imported from shared-types

// ===== API Request/Response Types =====

export interface CouponValidationRequest {
  coupon_code: string;
  user_id?: string;
  target_tier: SubscriptionTier;
  current_tier?: SubscriptionTier;
  billing_cycle: BillingCycle;
  monthly_price: number;
}

export interface CouponValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  discount_amount: number;
  applicable_duration_months: number;
  coupon?: Coupon;
}

export interface CouponRedemptionRequest {
  coupon_code: string;
  user_id: string;
  subscription_id?: string;
  redemption_type: RedemptionType;
  order_value_before_discount: number;
  ip_address?: string;
  device_fingerprint?: string;
  user_agent?: string;
}

// CreateCouponRequest, UpdateCouponRequest, CreateCampaignRequest, UpdateCampaignRequest imported from shared-types

export interface CampaignPerformanceMetrics {
  campaign_id: string;
  total_redemptions: number;
  total_discount_value: number;
  conversion_rate: number;
  actual_revenue: number;
  roi: number;
  top_performing_coupons: {
    code: string;
    redemptions: number;
    discount_value: number;
  }[];
  redemption_timeline: {
    date: string;
    redemptions: number;
    discount_value: number;
  }[];
}

// CouponAnalyticsMetrics, TopPerformingCoupon imported from shared-types

// Frontend-specific analytics types (not in shared-types yet)
export interface RedemptionTrend {
  date: string;
  redemptions: number;
  discount_value: number;
}

export interface RedemptionByType {
  type: CouponType;
  count: number;
  percentage: number;
  discount_value: number;
}

// ===== List Response Types (using shared-types) =====
// CouponListResponse, CampaignListResponse, RedemptionListResponse, FraudEventListResponse imported from shared-types

// ===== Filter Types =====

export interface CouponFilters {
  status?: 'active' | 'inactive' | 'expired' | 'all';
  type?: CouponType;
  search?: string;
  campaign_id?: string;
}

export interface CampaignFilters {
  type?: CampaignType;
  status?: CampaignStatus;
  start_date?: string;
  end_date?: string;
}

export interface FraudEventFilters {
  severity?: FraudSeverity;
  status?: FraudResolution;
  detection_type?: FraudDetectionType;
}

// ===== Admin UI State Types =====

export interface CouponFormState extends CreateCouponRequest {
  // Additional UI state fields
  errors?: {
    [key: string]: string;
  };
}

export interface CampaignFormState extends CreateCampaignRequest {
  // Additional UI state fields
  errors?: {
    [key: string]: string;
  };
}
