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
  discountPercentage?: number; // Only populated if type === PERCENTAGE
  discountAmount?: number; // Only populated if type === FIXED_AMOUNT
  bonusDurationMonths?: number; // Only populated if type === DURATION_BONUS
  discountType: DiscountType;

  // Usage limits
  maxDiscountApplications?: number | null; // Maps to maxUses
  maxUsesPerUser: number;

  // Computed fields (from CouponUsageLimit)
  redemptionCount: number; // totalUses
  totalDiscountValue: number; // totalDiscountAppliedUsd (in USD)

  // Eligibility
  minPurchaseAmount?: number | null;
  tierEligibility: SubscriptionTier[];
  billingCycles: string[]; // ['monthly', 'annual']

  // Validity
  validFrom: string; // ISO 8601
  validUntil: string; // ISO 8601
  isActive: boolean;

  // Campaign
  campaignId?: string | null;
  campaignName?: string | null; // Populated from join

  // Description
  description?: string | null;
  internalNotes?: string | null;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Coupon List Response
export interface CouponListResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  pageSize: number;
}

// Coupon Campaign Interface
export interface CouponCampaign {
  id: string;
  name: string; // Renamed from campaignName
  type: CampaignType; // Renamed from campaignType

  // Timing
  startsAt: string; // Renamed from startDate
  endsAt: string; // Renamed from endDate

  // Computed status field (not in DB)
  status: CampaignStatus; // planning | active | paused | ended

  // Budget
  budgetCap: number; // Renamed from budgetLimitUsd
  currentSpend: number; // Renamed from totalSpentUsd

  // Computed analytics fields (not in DB)
  actualRevenue?: number; // Aggregate from redemptions
  redemptionsCount?: number; // Count from coupons
  conversionRate?: number; // Percentage

  // Targeting
  targetAudience?: {
    userTiers?: SubscriptionTier[];
  };

  // Status
  isActive: boolean;

  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Campaign List Response
export interface CampaignListResponse {
  campaigns: CouponCampaign[];
  total: number;
  page: number;
  pageSize: number;
}

// Campaign Performance Metrics
export interface CampaignPerformanceMetrics {
  totalRedemptions: number;
  totalDiscountValue: number;
  totalRevenue: number;
  conversionRate: number; // Percentage
  roi: number; // Return on investment
  redemptionTrend: Array<{
    date: string;
    redemptions: number;
    revenue: number;
  }>;
}

// Coupon Redemption Interface
export interface CouponRedemption {
  id: string;
  couponId: string;
  couponCode?: string; // Populated from join
  userId: string;
  userEmail?: string; // Populated from join
  subscriptionId?: string | null;

  // Redemption details
  redemptionDate: string;
  discountApplied: number; // discountAppliedUsd
  originalAmount: number;
  finalAmount: number;
  status: RedemptionStatus;
  failureReason?: string | null;

  // Fraud metadata
  ipAddress?: string | null;
  userAgent?: string | null;

  // Proration (Plan 110 integration)
  isProrationInvolved: boolean;
  prorationAmount?: number | null;
  userTierBefore?: string | null;
  userTierAfter?: string | null;
  billingCycleBefore?: string | null;
  billingCycleAfter?: string | null;

  createdAt: string;
}

// Redemption List Response
export interface RedemptionListResponse {
  redemptions: CouponRedemption[];
  total: number;
  page: number;
  pageSize: number;
}

// Fraud Detection Event Interface
export interface FraudDetectionEvent {
  id: string;
  redemptionId?: string | null; // Missing in current schema (needs migration)
  couponId: string;
  couponCode?: string; // Populated from join
  userId: string;
  userEmail?: string; // Populated from join

  // Detection details
  detectionType: FraudDetectionType;
  severity: FraudSeverity;
  detectedAt: string;

  // Risk analysis (extracted from details JSON)
  riskScore?: number; // 0-100
  reasons?: string[];
  ipAddress?: string | null;
  deviceFingerprint?: string | null;

  // Status
  status: FraudResolution; // Maps to resolution field
  isFlagged: boolean;

  // Review
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  resolution?: string | null; // Free-text notes

  createdAt: string;
}

// Fraud Event List Response
export interface FraudEventListResponse {
  events: FraudDetectionEvent[];
  total: number;
  page: number;
  pageSize: number;
}

// Analytics Interfaces
export interface CouponAnalyticsMetrics {
  totalRedemptions: number;
  totalDiscountValue: number;
  averageDiscountPerRedemption: number;
  conversionRate: number; // Percentage
  fraudDetectionRate: number; // Percentage
  monthOverMonthChange: {
    redemptions: number; // Percentage change
    discountValue: number; // Percentage change
  };
}

export interface TopPerformingCoupon {
  code: string;
  redemptions: number;
  discountValue: number;
  conversionRate: number;
  averageDiscount: number;
}

// Request DTOs
export interface CreateCouponRequest {
  code: string;
  type: CouponType;
  discountValue: number;
  discountType: DiscountType;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  minPurchaseAmount?: number | null;
  tierEligibility?: SubscriptionTier[];
  billingCycles?: string[];
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
  campaignId?: string | null;
  description?: string | null;
  internalNotes?: string | null;
}

export interface UpdateCouponRequest {
  code?: string;
  type?: CouponType;
  discountValue?: number;
  discountType?: DiscountType;
  discountPercentage?: number; // Type-specific discount fields
  discountAmount?: number;
  bonusDurationMonths?: number;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  maxDiscountApplications?: number | null; // Alias for maxUses
  minPurchaseAmount?: number | null;
  tierEligibility?: SubscriptionTier[];
  billingCycles?: string[];
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  campaignId?: string | null; // Campaign association
  description?: string | null;
  internalNotes?: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  type: CampaignType;
  startsAt: string;
  endsAt: string;
  budgetCap: number;
  targetTier?: SubscriptionTier | null;
  isActive?: boolean;
}

export interface UpdateCampaignRequest {
  name?: string;
  endsAt?: string;
  budgetCap?: number;
  isActive?: boolean;
}

export interface ReviewFraudEventRequest {
  resolution: FraudResolution;
  notes?: string;
}

// Zod Schemas for validation
export const CreateCouponRequestSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4,50}$/, 'Code must be 4-50 uppercase alphanumeric characters'),
  type: CouponTypeSchema,
  discountValue: z.number().positive(),
  discountType: DiscountTypeSchema,
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  minPurchaseAmount: z.number().positive().nullable().optional(),
  tierEligibility: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  billingCycles: z.array(z.string()).optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  isActive: z.boolean().default(true),
  campaignId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  internalNotes: z.string().max(1000).nullable().optional(),
});

export const UpdateCouponRequestSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4,50}$/).optional(),
  type: CouponTypeSchema.optional(),
  discountValue: z.number().positive().optional(),
  discountType: DiscountTypeSchema.optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  minPurchaseAmount: z.number().positive().nullable().optional(),
  tierEligibility: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  billingCycles: z.array(z.string()).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(1000).nullable().optional(),
  internalNotes: z.string().max(1000).nullable().optional(),
});

export const CreateCampaignRequestSchema = z.object({
  name: z.string().min(1).max(255),
  type: CampaignTypeSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  budgetCap: z.number().positive(),
  targetTier: z.nativeEnum(SubscriptionTier).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateCampaignRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  endsAt: z.string().optional(),
  budgetCap: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const ReviewFraudEventRequestSchema = z.object({
  resolution: z.nativeEnum(FraudResolution),
  notes: z.string().max(1000).optional(),
});
