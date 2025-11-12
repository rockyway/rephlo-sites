/**
 * Shared Coupon & Campaign Types
 * Single source of truth for coupon-related types across frontend and backend
 */

import { z } from 'zod';
import { SubscriptionTier } from './user.types';

// Enums
export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  TIER_SPECIFIC = 'tier_specific',
  DURATION_BONUS = 'duration_bonus',
  PERPETUAL_MIGRATION = 'perpetual_migration',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  CREDITS = 'credits',
  MONTHS_FREE = 'months_free',
}

export enum CampaignType {
  SEASONAL = 'seasonal',
  WIN_BACK = 'win_back',
  REFERRAL = 'referral',
  PROMOTIONAL = 'promotional',
  EARLY_BIRD = 'early_bird',
}

export enum CampaignStatus {
  PLANNING = 'planning', // Before startDate
  ACTIVE = 'active', // Between startDate and endDate, isActive=true
  PAUSED = 'paused', // isActive=false
  ENDED = 'ended', // After endDate
}

export enum RedemptionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  REVERSED = 'reversed',
  PENDING = 'pending',
}

export enum FraudDetectionType {
  VELOCITY_ABUSE = 'velocity_abuse',
  IP_SWITCHING = 'ip_switching',
  BOT_PATTERN = 'bot_pattern',
  DEVICE_FINGERPRINT_MISMATCH = 'device_fingerprint_mismatch',
  STACKING_ABUSE = 'stacking_abuse',
}

export enum FraudSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FraudResolution {
  LEGITIMATE = 'legitimate',
  FALSE_POSITIVE = 'false_positive',
  CONFIRMED_FRAUD = 'confirmed_fraud',
  PENDING = 'pending',
}

// Zod Schemas
export const CouponTypeSchema = z.nativeEnum(CouponType);
export const DiscountTypeSchema = z.nativeEnum(DiscountType);
export const CampaignTypeSchema = z.nativeEnum(CampaignType);
export const CampaignStatusSchema = z.nativeEnum(CampaignStatus);
export const RedemptionStatusSchema = z.nativeEnum(RedemptionStatus);
export const FraudDetectionTypeSchema = z.nativeEnum(FraudDetectionType);
export const FraudSeveritySchema = z.nativeEnum(FraudSeverity);
export const FraudResolutionSchema = z.nativeEnum(FraudResolution);

// Coupon Interface (aligned with frontend expectations AND backend schema)
export interface Coupon {
  id: string;
  code: string; // Uppercase: "JULY4LIBERTY"

  // Type and discount (IMPORTANT: Split discount fields by type)
  type: CouponType; // Renamed from couponType
  discount_percentage?: number; // Only populated if type === PERCENTAGE
  discount_amount?: number; // Only populated if type === FIXED_AMOUNT
  bonus_duration_months?: number; // Only populated if type === DURATION_BONUS
  discount_type: DiscountType;

  // Usage limits
  max_discount_applications?: number | null; // Maps to maxUses
  max_uses_per_user: number;

  // Computed fields (from CouponUsageLimit)
  redemption_count: number; // totalUses
  total_discount_value: number; // totalDiscountAppliedUsd (in USD)

  // Eligibility
  min_purchase_amount?: number | null;
  tier_eligibility: SubscriptionTier[];
  billing_cycles: string[]; // ['monthly', 'annual']

  // Validity
  valid_from: string; // ISO 8601
  valid_until: string; // ISO 8601
  is_active: boolean;

  // Campaign
  campaign_id?: string | null;
  campaign_name?: string | null; // Populated from join

  // Description
  description?: string | null;
  internal_notes?: string | null;

  // Audit
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Coupon List Response
export interface CouponListResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  page_size: number;
}

// Coupon Campaign Interface
export interface CouponCampaign {
  id: string;
  name: string; // Renamed from campaignName
  type: CampaignType; // Renamed from campaignType

  // Timing
  starts_at: string; // Renamed from startDate
  ends_at: string; // Renamed from endDate

  // Computed status field (not in DB)
  status: CampaignStatus; // planning | active | paused | ended

  // Budget
  budget_cap: number; // Renamed from budgetLimitUsd
  current_spend: number; // Renamed from totalSpentUsd

  // Computed analytics fields (not in DB)
  actual_revenue?: number; // Aggregate from redemptions
  redemptions_count?: number; // Count from coupons
  conversion_rate?: number; // Percentage

  // Targeting
  target_audience?: {
    user_tiers?: SubscriptionTier[];
  };

  // Status
  is_active: boolean;

  // Audit
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Campaign List Response
export interface CampaignListResponse {
  campaigns: CouponCampaign[];
  total: number;
  page: number;
  page_size: number;
}

// Campaign Performance Metrics
export interface CampaignPerformanceMetrics {
  total_redemptions: number;
  total_discount_value: number;
  total_revenue: number;
  conversion_rate: number; // Percentage
  roi: number; // Return on investment
  redemption_trend: Array<{
    date: string;
    redemptions: number;
    revenue: number;
  }>;
}

// Coupon Redemption Interface
export interface CouponRedemption {
  id: string;
  coupon_id: string;
  coupon_code?: string; // Populated from join
  user_id: string;
  user_email?: string; // Populated from join
  subscription_id?: string | null;

  // Redemption details
  redemption_date: string;
  discount_applied: number; // discountAppliedUsd
  original_amount: number;
  final_amount: number;
  status: RedemptionStatus;
  failure_reason?: string | null;

  // Fraud metadata
  ip_address?: string | null;
  user_agent?: string | null;

  // Proration (Plan 110 integration)
  is_proration_involved: boolean;
  proration_amount?: number | null;
  user_tier_before?: string | null;
  user_tier_after?: string | null;
  billing_cycle_before?: string | null;
  billing_cycle_after?: string | null;

  created_at: string;
}

// Redemption List Response
export interface RedemptionListResponse {
  redemptions: CouponRedemption[];
  total: number;
  page: number;
  page_size: number;
}

// Fraud Detection Event Interface
export interface FraudDetectionEvent {
  id: string;
  redemption_id?: string | null; // Missing in current schema (needs migration)
  coupon_id: string;
  coupon_code?: string; // Populated from join
  user_id: string;
  user_email?: string; // Populated from join

  // Detection details
  detection_type: FraudDetectionType;
  severity: FraudSeverity;
  detected_at: string;

  // Risk analysis (extracted from details JSON)
  risk_score?: number; // 0-100
  reasons?: string[];
  ip_address?: string | null;
  device_fingerprint?: string | null;

  // Status
  status: FraudResolution; // Maps to resolution field
  is_flagged: boolean;

  // Review
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  resolution?: string | null; // Free-text notes

  created_at: string;
}

// Fraud Event List Response
export interface FraudEventListResponse {
  events: FraudDetectionEvent[];
  total: number;
  page: number;
  page_size: number;
}

// Analytics Interfaces
export interface CouponAnalyticsMetrics {
  total_redemptions: number;
  total_discount_value: number;
  average_discount_per_redemption: number;
  conversion_rate: number; // Percentage
  fraud_detection_rate: number; // Percentage
  month_over_month_change: {
    redemptions: number; // Percentage change
    discount_value: number; // Percentage change
  };
}

export interface TopPerformingCoupon {
  code: string;
  redemptions: number;
  discount_value: number;
  conversion_rate: number;
  average_discount: number;
}

// Request DTOs
export interface CreateCouponRequest {
  code: string;
  type: CouponType;
  discount_value: number;
  discount_type: DiscountType;
  max_uses?: number | null;
  max_uses_per_user?: number;
  min_purchase_amount?: number | null;
  tier_eligibility?: SubscriptionTier[];
  billing_cycles?: string[];
  valid_from: string;
  valid_until: string;
  is_active?: boolean;
  campaign_id?: string | null;
  description?: string | null;
  internal_notes?: string | null;
}

export interface UpdateCouponRequest {
  code?: string;
  is_active?: boolean;
  valid_until?: string;
  max_uses?: number | null;
  description?: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  type: CampaignType;
  starts_at: string;
  ends_at: string;
  budget_cap: number;
  target_tier?: SubscriptionTier | null;
  is_active?: boolean;
}

export interface UpdateCampaignRequest {
  name?: string;
  ends_at?: string;
  budget_cap?: number;
  is_active?: boolean;
}

export interface ReviewFraudEventRequest {
  resolution: FraudResolution;
  notes?: string;
}

// Zod Schemas for validation
export const CreateCouponRequestSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4,50}$/, 'Code must be 4-50 uppercase alphanumeric characters'),
  type: CouponTypeSchema,
  discount_value: z.number().positive(),
  discount_type: DiscountTypeSchema,
  max_uses: z.number().int().positive().nullable().optional(),
  max_uses_per_user: z.number().int().positive().default(1),
  min_purchase_amount: z.number().positive().nullable().optional(),
  tier_eligibility: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  billing_cycles: z.array(z.string()).optional(),
  valid_from: z.string(),
  valid_until: z.string(),
  is_active: z.boolean().default(true),
  campaign_id: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  internal_notes: z.string().max(1000).nullable().optional(),
});

export const UpdateCouponRequestSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4,50}$/).optional(),
  is_active: z.boolean().optional(),
  valid_until: z.string().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const CreateCampaignRequestSchema = z.object({
  name: z.string().min(1).max(255),
  type: CampaignTypeSchema,
  starts_at: z.string(),
  ends_at: z.string(),
  budget_cap: z.number().positive(),
  target_tier: z.nativeEnum(SubscriptionTier).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const UpdateCampaignRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  ends_at: z.string().optional(),
  budget_cap: z.number().positive().optional(),
  is_active: z.boolean().optional(),
});

export const ReviewFraudEventRequestSchema = z.object({
  resolution: z.nativeEnum(FraudResolution),
  notes: z.string().max(1000).optional(),
});
