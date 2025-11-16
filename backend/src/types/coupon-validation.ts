/**
 * Coupon & Discount Code System - Validation Schemas
 *
 * Zod validation schemas for Plan 111 coupon system.
 * Defines DTOs for coupon validation, redemption, campaign management, and fraud detection.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md
 */

import { z } from 'zod';

// Import Prisma enums as values (required for z.nativeEnum)
import {
  coupon_type,
  discount_type,
  campaign_type,
  fraud_detection_type,
  fraud_severity,
  subscription_tier,
} from '@prisma/client';

// Re-export types for use in other modules
export type {
  coupon_type as CouponType,
  discount_type as DiscountType,
  campaign_type as CampaignType,
  redemption_status as RedemptionStatus,
  fraud_detection_type as FraudDetectionType,
  fraud_severity as FraudSeverity,
  validation_rule_type as ValidationRuleType,
  subscription_tier as SubscriptionTier,
} from '@prisma/client';

// ===== Common Field Validators =====

/**
 * Coupon code validation schema
 * Format: Uppercase alphanumeric, 4-50 characters
 * Examples: "JULY4LIBERTY", "BLACKFRIDAY50"
 */
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,50}$/, 'Coupon code must be 4-50 uppercase alphanumeric characters')
  .min(4, 'Coupon code must be at least 4 characters')
  .max(50, 'Coupon code must be at most 50 characters');

/**
 * UUID schema for IDs
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Decimal amount schema (USD)
 * Min: 0, Max: 999999.99
 */
export const amountSchema = z
  .number()
  .min(0, 'Amount must be non-negative')
  .max(999999.99, 'Amount exceeds maximum value');

/**
 * Percentage schema
 * Min: 0, Max: 100
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be non-negative')
  .max(100, 'Percentage cannot exceed 100');

// ===== Coupon Validation Schemas =====

/**
 * Validate Coupon Request Schema
 * POST /api/coupons/validate
 */
export const validateCouponRequestSchema = z.object({
  code: couponCodeSchema,
  user_id: uuidSchema.optional(),
  subscription_tier: z.nativeEnum(subscription_tier).optional(),
  cart_total: amountSchema.optional().default(0),
  device_fingerprint: z.string().optional(),
});

export type ValidateCouponRequest = z.infer<typeof validateCouponRequestSchema>;

/**
 * Validation Context Schema
 * Internal context passed to validation service
 */
export const validationContextSchema = z.object({
  cartTotal: z.number().min(0),
  subscriptionId: uuidSchema.optional(),
  subscriptionTier: z.nativeEnum(subscription_tier).optional().default('free' as subscription_tier),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceFingerprint: z.string().optional(),
});

export type ValidationContext = z.infer<typeof validationContextSchema>;

/**
 * Validation Result Schema
 */
export const validationResultSchema = z.object({
  isValid: z.boolean(),
  coupon: z.any().nullable(), // Full coupon object
  errors: z.array(z.string()),
  discount: z
    .object({
      couponType: z.nativeEnum(coupon_type),
      discountType: z.nativeEnum(discount_type),
      originalAmount: z.number(),
      discountAmount: z.number(),
      finalAmount: z.number(),
      percentage: z.number().optional(),
      fixedAmount: z.number().optional(),
      creditAmount: z.number().optional(),
      bonusMonths: z.number().optional(),
      durationMonths: z.number().optional(),
      couponId: uuidSchema,
      couponCode: couponCodeSchema,
    })
    .nullable(),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// ===== Coupon Redemption Schemas =====

/**
 * Redeem Coupon Request Schema
 * POST /api/coupons/redeem
 */
export const redeemCouponRequestSchema = z.object({
  code: couponCodeSchema,
  subscription_id: uuidSchema.optional(),
  original_amount: amountSchema.optional().default(0),
});

export type RedeemCouponRequest = z.infer<typeof redeemCouponRequestSchema>;

/**
 * Redemption Context Schema
 */
export const redemptionContextSchema = z.object({
  code: couponCodeSchema,
  subscriptionId: uuidSchema.optional(),
  invoiceId: uuidSchema.optional(),
  originalAmount: z.number().min(0),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceInfo: z.any().optional(),
  // Proration fields (GAP FIX #4)
  prorationAmount: z.number().optional(),
  isProrationInvolved: z.boolean().optional(),
  tierBefore: z.string().optional(),
  tierAfter: z.string().optional(),
  billingCycleBefore: z.string().optional(),
  billingCycleAfter: z.string().optional(),
});

export type RedemptionContext = z.infer<typeof redemptionContextSchema>;

/**
 * Redemption Metadata Schema
 */
export const redemptionMetadataSchema = z.object({
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  redemptionSource: z.string().optional(), // 'checkout', 'upgrade', 'admin'
});

export type RedemptionMetadata = z.infer<typeof redemptionMetadataSchema>;

// ===== Campaign Management Schemas =====

/**
 * Create Campaign Request Schema
 * POST /admin/campaigns
 */
export const createCampaignRequestSchema = z.object({
  campaign_name: z.string().min(3).max(255),
  campaign_type: z.nativeEnum(campaign_type),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  budget_limit_usd: amountSchema,
  target_tier: z.nativeEnum(subscription_tier).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;

/**
 * Update Campaign Request Schema
 * PATCH /admin/campaigns/:id
 */
export const updateCampaignRequestSchema = z.object({
  campaign_name: z.string().min(3).max(255).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  budget_limit_usd: amountSchema.optional(),
  target_tier: z.nativeEnum(subscription_tier).optional().nullable(),
  is_active: z.boolean().optional(),
});

export type UpdateCampaignRequest = z.infer<typeof updateCampaignRequestSchema>;

/**
 * Assign Coupon to Campaign Request Schema
 * POST /admin/campaigns/:id/assign-coupon
 */
export const assignCouponRequestSchema = z.object({
  coupon_id: uuidSchema,
});

export type AssignCouponRequest = z.infer<typeof assignCouponRequestSchema>;

// ===== Coupon CRUD Schemas =====

/**
 * Create Coupon Request Schema
 * POST /admin/coupons
 */
export const createCouponRequestSchema = z.object({
  code: couponCodeSchema,
  type: z.nativeEnum(coupon_type),
  discountValue: z.number().min(0),
  discountType: z.nativeEnum(discount_type),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.number().int().positive().optional().default(1),
  minPurchaseAmount: amountSchema.optional().nullable(),
  tierEligibility: z.array(z.nativeEnum(subscription_tier)).optional().default(['free', 'pro', 'enterprise'] as subscription_tier[]),
  billingCycles: z.array(z.string()).optional().default(['monthly', 'annual']),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  isActive: z.boolean().optional().default(true),
  campaignId: uuidSchema.optional().nullable(),
  description: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export type CreateCouponRequest = z.infer<typeof createCouponRequestSchema>;

/**
 * Update Coupon Request Schema
 * PATCH /admin/coupons/:id
 */
export const updateCouponRequestSchema = z.object({
  code: couponCodeSchema.optional(),
  type: z.nativeEnum(coupon_type).optional(),
  discountValue: z.number().min(0).optional(),
  discountType: z.nativeEnum(discount_type).optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.number().int().positive().optional(),
  minPurchaseAmount: amountSchema.optional().nullable(),
  tierEligibility: z.array(z.nativeEnum(subscription_tier)).optional(),
  billingCycles: z.array(z.string()).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export type UpdateCouponRequest = z.infer<typeof updateCouponRequestSchema>;

// ===== Fraud Detection Schemas =====

/**
 * Device Info Schema
 */
export const deviceInfoSchema = z.object({
  fingerprint: z.string(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  platform: z.string().optional(),
  browser: z.string().optional(),
});

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;

/**
 * Fraud Detection Result Schema
 */
export const fraudDetectionResultSchema = z.object({
  detected: z.boolean(),
  detectionType: z.nativeEnum(fraud_detection_type).optional(),
  severity: z.nativeEnum(fraud_severity).optional(),
  details: z.any().optional(),
  shouldBlock: z.boolean().optional().default(false),
});

export type FraudDetectionResult = z.infer<typeof fraudDetectionResultSchema>;

/**
 * Review Fraud Event Request Schema
 * PATCH /admin/fraud-detection/:id/review
 */
export const reviewFraudEventRequestSchema = z.object({
  resolution: z.enum(['false_positive', 'confirmed_fraud', 'needs_investigation']),
  notes: z.string().optional(),
});

export type ReviewFraudEventRequest = z.infer<typeof reviewFraudEventRequestSchema>;

// ===== Discount Calculation Schemas =====

/**
 * Discount Calculation Schema
 */
export const discountCalculationSchema = z.object({
  couponType: z.nativeEnum(coupon_type),
  discountType: z.nativeEnum(discount_type),
  originalAmount: z.number(),
  discountAmount: z.number(),
  finalAmount: z.number(),
  percentage: z.number().optional(),
  fixedAmount: z.number().optional(),
  creditAmount: z.number().optional(),
  bonusMonths: z.number().optional(),
  durationMonths: z.number().optional(),
  couponId: uuidSchema,
  couponCode: couponCodeSchema,
});

export type DiscountCalculation = z.infer<typeof discountCalculationSchema>;

// ===== Error Schemas =====

/**
 * Coupon validation error codes
 */
export const COUPON_ERROR_CODES = {
  COUPON_NOT_FOUND: 'Coupon code not found',
  COUPON_INACTIVE: 'Coupon is no longer active',
  COUPON_EXPIRED: 'Coupon has expired',
  TIER_NOT_ELIGIBLE: 'Your subscription tier is not eligible for this coupon',
  MAX_USES_EXCEEDED: 'Coupon has reached maximum redemptions',
  MAX_USER_USES_EXCEEDED: 'You have already used this coupon',
  CAMPAIGN_BUDGET_EXCEEDED: 'Campaign budget has been exhausted',
  MIN_PURCHASE_NOT_MET: 'Minimum purchase amount not met',
  CUSTOM_RULE_FAILED: 'Custom validation rule failed',
  FRAUD_DETECTED: 'Suspicious activity detected',
  VELOCITY_LIMIT_EXCEEDED: 'Too many redemption attempts',
  DEVICE_FINGERPRINT_MISMATCH: 'Device fingerprint mismatch',
  VALIDATION_ERROR: 'Validation error',
} as const;

export type CouponErrorCode = keyof typeof COUPON_ERROR_CODES;

/**
 * Coupon Validation Error Class
 */
export class CouponValidationError extends Error {
  constructor(
    public code: CouponErrorCode,
    public details?: any
  ) {
    super(COUPON_ERROR_CODES[code]);
    this.name = 'CouponValidationError';
  }
}

/**
 * Fraud Detection Error Class
 */
export class FraudDetectionError extends Error {
  constructor(
    message: string,
    public severity: fraud_severity,
    public details?: any
  ) {
    super(message);
    this.name = 'FraudDetectionError';
  }
}

// ===== Helper Functions =====

/**
 * Safe request validation
 */
export function safeValidateRequest<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Format Zod validation errors
 */
export function formatValidationErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
