/**
 * Plan 111: Coupon & Discount Code System - TypeScript Type Definitions
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

// ===== Enums =====

export type CouponType =
  | 'percentage'
  | 'fixed_amount'
  | 'tier_specific'
  | 'duration_bonus'
  | 'perpetual_migration';

export type CampaignType = 'holiday' | 'marketing' | 'behavioral' | 'referral';

export type CampaignStatus = 'planning' | 'active' | 'paused' | 'ended';

export type RedemptionType =
  | 'trial_start'
  | 'new_subscription'
  | 'upgrade'
  | 'downgrade'
  | 'renewal';

export type FraudDetectionType =
  | 'velocity_abuse'
  | 'ip_switching'
  | 'bot_pattern'
  | 'device_fingerprint'
  | 'stacking_abuse';

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FraudResolution =
  | 'pending'
  | 'legitimate'
  | 'block_user'
  | 'block_coupon'
  | 'block_ip'
  | 'false_positive';

export type SubscriptionTier =
  | 'free'
  | 'pro'
  | 'pro_max'
  | 'enterprise_pro'
  | 'enterprise_max'
  | 'perpetual';

export type BillingCycle = 'monthly' | 'annual';

// ===== Core Models =====

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;

  // Discount configuration
  discount_percentage?: number;
  discount_amount?: number;
  bonus_duration_months?: number;

  // Tier restrictions
  applicable_tiers?: SubscriptionTier[];
  applicable_from_tiers?: SubscriptionTier[];
  applicable_to_tiers?: SubscriptionTier[];

  // Billing cycle restrictions
  applicable_billing_cycles?: BillingCycle[];

  // Duration & limits
  max_discount_months?: number;
  minimum_commitment?: string;
  max_discount_applications?: number;
  max_per_customer?: number;
  max_per_month?: number;

  // Validity
  valid_from: string;
  valid_until: string;
  is_active: boolean;

  // Perpetual plan specific
  perpetual_discount_type?: 'percentage' | 'fixed_amount';
  perpetual_discount_value?: number;
  credit_subscription_months?: number;

  // Metadata
  campaign_id?: string;
  description?: string;
  internal_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Statistics (populated by API)
  redemption_count?: number;
  total_discount_value?: number;
  conversion_rate?: number;
}

export interface CouponCampaign {
  id: string;
  name: string;
  type: CampaignType;
  description?: string;
  marketing_copy?: string;
  terms_conditions?: string;

  // Timing
  starts_at: string;
  ends_at: string;

  // Goals & targeting
  target_audience?: {
    user_tiers?: SubscriptionTier[];
    min_days_active?: number;
    min_usage_credits?: number;
    excluded_user_ids?: string[];
  };
  primary_goal?: string;
  expected_revenue?: number;

  // Budget
  budget_cap?: number;
  current_spend?: number;

  // Status
  status: CampaignStatus;
  is_recurring?: boolean;
  next_occurrence_date?: string;

  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Statistics (populated by API)
  redemption_count?: number;
  conversion_rate?: number;
  actual_revenue?: number;
  roi?: number;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  subscription_id?: string;

  // Redemption details
  redemption_type: RedemptionType;
  discount_applied_amount: number;
  order_value_before_discount: number;
  order_value_after_discount: number;

  // Proration
  is_proration_involved?: boolean;
  proration_amount?: number;

  // Usage context
  user_tier_before?: SubscriptionTier;
  user_tier_after?: SubscriptionTier;
  billing_cycle_before?: BillingCycle;
  billing_cycle_after?: BillingCycle;

  // Fraud prevention
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  is_flagged?: boolean;
  flag_reason?: string;

  // Timestamps
  created_at: string;
  processed_at?: string;

  // Metadata
  notes?: string;

  // Populated fields
  coupon?: Coupon;
  user_email?: string;
}

export interface FraudDetectionEvent {
  id: string;
  redemption_id: string;
  coupon_id: string;
  user_id: string;

  // Detection info
  detection_type: FraudDetectionType;
  severity: FraudSeverity;
  risk_score: number; // 0-100
  reasons: string[];

  // Context
  ip_address?: string;
  device_fingerprint?: string;
  user_agent?: string;

  // Resolution
  status: FraudResolution;
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;

  // Timestamps
  detected_at: string;

  // Populated fields
  coupon_code?: string;
  user_email?: string;
}

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

export interface CouponCreateRequest {
  code: string;
  type: CouponType;
  discount_percentage?: number;
  discount_amount?: number;
  bonus_duration_months?: number;
  applicable_tiers?: SubscriptionTier[];
  applicable_from_tiers?: SubscriptionTier[];
  applicable_to_tiers?: SubscriptionTier[];
  applicable_billing_cycles?: BillingCycle[];
  max_discount_months?: number;
  minimum_commitment?: string;
  max_discount_applications?: number;
  max_per_customer?: number;
  max_per_month?: number;
  valid_from: string;
  valid_until: string;
  is_active?: boolean;
  perpetual_discount_type?: 'percentage' | 'fixed_amount';
  perpetual_discount_value?: number;
  credit_subscription_months?: number;
  campaign_id?: string;
  description?: string;
  internal_notes?: string;
}

export interface CouponUpdateRequest extends Partial<CouponCreateRequest> {}

export interface CampaignCreateRequest {
  name: string;
  type: CampaignType;
  description?: string;
  marketing_copy?: string;
  terms_conditions?: string;
  starts_at: string;
  ends_at: string;
  target_audience?: {
    user_tiers?: SubscriptionTier[];
    min_days_active?: number;
    min_usage_credits?: number;
    excluded_user_ids?: string[];
  };
  primary_goal?: string;
  expected_revenue?: number;
  budget_cap?: number;
  is_recurring?: boolean;
  next_occurrence_date?: string;
}

export interface CampaignUpdateRequest extends Partial<CampaignCreateRequest> {
  status?: CampaignStatus;
}

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

export interface CouponAnalyticsMetrics {
  total_redemptions: number;
  total_discount_value: number;
  average_discount_per_redemption: number;
  conversion_rate: number;
  fraud_detection_rate: number;
  month_over_month_change: {
    redemptions: number;
    discount_value: number;
  };
}

export interface RedemptionTrend {
  date: string;
  redemptions: number;
  discount_value: number;
}

export interface TopPerformingCoupon {
  code: string;
  redemptions: number;
  discount_value: number;
  conversion_rate: number;
  average_discount: number;
}

export interface RedemptionByType {
  type: CouponType;
  count: number;
  percentage: number;
  discount_value: number;
}

// ===== List Response Types =====

export interface CouponListResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  page_size: number;
}

export interface CampaignListResponse {
  campaigns: CouponCampaign[];
  total: number;
  page: number;
  page_size: number;
}

export interface RedemptionListResponse {
  redemptions: CouponRedemption[];
  total: number;
  page: number;
  page_size: number;
}

export interface FraudEventListResponse {
  events: FraudDetectionEvent[];
  total: number;
  page: number;
  page_size: number;
}

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

export interface CouponFormState extends CouponCreateRequest {
  // Additional UI state fields
  errors?: {
    [key: string]: string;
  };
}

export interface CampaignFormState extends CampaignCreateRequest {
  // Additional UI state fields
  errors?: {
    [key: string]: string;
  };
}
