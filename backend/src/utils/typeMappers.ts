/**
 * Type Mappers
 * Utility functions to map database records to API response types
 * Handles field renaming, computed fields, and type conversions
 */

import {
  User,
  UserDetails,
  Subscription,
  Coupon,
  CouponCampaign,
  CouponRedemption,
  FraudDetectionEvent,
  SubscriptionTier,
  UserStatus,
  SubscriptionStatus,
  BillingCycle,
  CouponType,
  CampaignStatus,
  CampaignType,
  RedemptionStatus,
  FraudDetectionType,
  FraudSeverity,
  FraudResolution,
} from '@rephlo/shared-types';
import { Prisma } from '@prisma/client';

// =============================================================================
// USER MAPPERS
// =============================================================================

/**
 * Map database User to API User type
 * Handles field renaming and computed fields
 */
export function mapUserToApiType(
  dbUser: Prisma.UserGetPayload<{
    include: {
      subscriptionMonetization: {
        where: { status: { in: ['trial', 'active'] } };
        take: 1;
      };
      credit_balance: true;
    };
  }>
): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name:
      dbUser.firstName && dbUser.lastName
        ? `${dbUser.firstName} ${dbUser.lastName}`
        : dbUser.firstName || dbUser.lastName || null,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    username: dbUser.username,
    profilePictureUrl: dbUser.profilePictureUrl,
    status: dbUser.status as UserStatus,
    isActive: dbUser.isActive,
    currentTier:
      (dbUser.subscriptionMonetization[0]?.tier as SubscriptionTier) || SubscriptionTier.FREE,
    creditsBalance: dbUser.credit_balance?.amount || 0,
    createdAt: dbUser.createdAt.toISOString(),
    lastActiveAt: dbUser.lastLoginAt?.toISOString() || null,
    deactivatedAt: dbUser.deactivatedAt?.toISOString() || null,
    deletedAt: dbUser.deletedAt?.toISOString() || null,
    suspendedUntil: dbUser.suspendedUntil?.toISOString() || null,
    bannedAt: dbUser.bannedAt?.toISOString() || null,
    role: dbUser.role,
    lifetimeValue: dbUser.lifetimeValue,
  };
}

/**
 * Map database User to API UserDetails type
 * Includes usage statistics
 */
export function mapUserDetailsToApiType(
  dbUser: Prisma.UserGetPayload<{
    include: {
      subscriptionMonetization: {
        where: { status: { in: ['trial', 'active'] } };
        take: 1;
      };
      credit_balance: true;
      token_usage: true;
      credit_deductions: true;
    };
  }>,
  usageStats: {
    totalApiCalls: number;
    creditsUsed: number;
    averageCallsPerDay: number;
  }
): UserDetails {
  return {
    ...mapUserToApiType(dbUser as any),
    usageStats,
    emailVerified: dbUser.emailVerified,
    hasActivePerpetualLicense: dbUser.hasActivePerpetualLicense,
    mfaEnabled: dbUser.mfaEnabled,
  };
}

// =============================================================================
// SUBSCRIPTION MAPPERS
// =============================================================================

/**
 * Map database Subscription to API Subscription type
 * Handles field renaming and computed nextBillingDate
 */
export function mapSubscriptionToApiType(
  dbSub: Prisma.SubscriptionMonetizationGetPayload<{
    include: {
      user: {
        select: {
          id: true;
          email: true;
          firstName: true;
          lastName: true;
        };
      };
    };
  }>
): Subscription {
  // Compute nextBillingDate
  const nextBillingDate =
    dbSub.status === 'active' && !dbSub.cancelledAt
      ? dbSub.currentPeriodEnd.toISOString()
      : null;

  return {
    id: dbSub.id,
    userId: dbSub.userId,
    tier: dbSub.tier as SubscriptionTier,
    status: dbSub.status as SubscriptionStatus,
    billingCycle: dbSub.billingCycle as BillingCycle,
    finalPriceUsd: parseFloat(dbSub.basePriceUsd.toString()), // Use basePriceUsd for finalPriceUsd
    basePriceUsd: parseFloat(dbSub.basePriceUsd.toString()),
    monthlyCreditsAllocated: dbSub.monthlyCreditAllocation, // Field name mapping
    currentPeriodStart: dbSub.currentPeriodStart.toISOString(),
    currentPeriodEnd: dbSub.currentPeriodEnd.toISOString(),
    nextBillingDate, // Computed field
    stripeCustomerId: dbSub.stripeCustomerId,
    stripeSubscriptionId: dbSub.stripeSubscriptionId,
    cancelAtPeriodEnd: false, // TODO: Add this field to schema if needed
    cancelledAt: dbSub.cancelledAt?.toISOString() || null,
    trialEndsAt: dbSub.trialEndsAt?.toISOString() || null,
    createdAt: dbSub.createdAt.toISOString(),
    updatedAt: dbSub.updatedAt.toISOString(),
    user: dbSub.user
      ? {
          id: dbSub.user.id,
          email: dbSub.user.email,
          firstName: dbSub.user.firstName,
          lastName: dbSub.user.lastName,
        }
      : undefined,
  };
}

// =============================================================================
// COUPON MAPPERS
// =============================================================================

/**
 * Map database Coupon to API Coupon type
 * Handles discount field splitting by type and computed fields
 */
export function mapCouponToApiType(
  dbCoupon: Prisma.couponGetPayload<{
    include: {
      coupon_usage_limit: true;
      coupon_campaign: {
        select: {
          campaign_name: true;
        };
      };
    };
  }>
): Coupon {
  const discountValue = parseFloat(dbCoupon.discount_value.toString());

  // Split discount fields based on coupon type
  const discountFields: {
    discountPercentage?: number;
    discountAmount?: number;
    bonusDurationMonths?: number;
  } = {};

  if (dbCoupon.coupon_type === 'percentage') {
    discountFields.discountPercentage = discountValue;
  } else if (dbCoupon.coupon_type === 'fixed_amount') {
    discountFields.discountAmount = discountValue;
  } else if (dbCoupon.coupon_type === 'duration_bonus') {
    discountFields.bonusDurationMonths = Math.round(discountValue);
  }

  return {
    id: dbCoupon.id,
    code: dbCoupon.code,
    type: dbCoupon.coupon_type as CouponType,
    ...discountFields, // Spread split discount fields
    discountType: dbCoupon.discount_type as any,
    maxDiscountApplications: dbCoupon.max_uses,
    maxUsesPerUser: dbCoupon.max_uses_per_user,
    redemptionCount: dbCoupon.coupon_usage_limit?.total_uses || 0, // Computed from coupon_usage_limit
    totalDiscountValue: parseFloat(
      dbCoupon.coupon_usage_limit?.total_discount_applied_usd.toString() || '0'
    ), // Computed
    minPurchaseAmount: dbCoupon.min_purchase_amount
      ? parseFloat(dbCoupon.min_purchase_amount.toString())
      : null,
    tierEligibility: dbCoupon.tier_eligibility as SubscriptionTier[],
    billingCycles: dbCoupon.billing_cycles,
    validFrom: dbCoupon.valid_from.toISOString(),
    validUntil: dbCoupon.valid_until.toISOString(),
    isActive: dbCoupon.is_active,
    campaignId: dbCoupon.campaign_id,
    campaignName: dbCoupon.coupon_campaign?.campaign_name || null, // Populated from join
    description: dbCoupon.description,
    internalNotes: dbCoupon.internal_notes,
    createdBy: dbCoupon.created_by,
    createdAt: dbCoupon.created_at.toISOString(),
    updatedAt: dbCoupon.updated_at.toISOString(),
  };
}

// =============================================================================
// CAMPAIGN MAPPERS
// =============================================================================

/**
 * Compute campaign status from dates and active flag
 */
export function computeCampaignStatus(
  isActive: boolean,
  startDate: Date,
  endDate: Date
): CampaignStatus {
  const now = new Date();

  if (!isActive) {
    return CampaignStatus.PAUSED;
  } else if (now < startDate) {
    return CampaignStatus.PLANNING;
  } else if (now > endDate) {
    return CampaignStatus.ENDED;
  } else {
    return CampaignStatus.ACTIVE;
  }
}

/**
 * Map database Campaign to API CouponCampaign type
 * Handles field renaming and computed status
 */
export function mapCampaignToApiType(
  dbCampaign: Prisma.coupon_campaignGetPayload<{
    include: {
      _count: {
        select: {
          coupon: true;
        };
      };
    };
  }>,
  aggregatedStats?: {
    actualRevenue?: number;
    redemptionsCount?: number;
    conversionRate?: number;
  }
): CouponCampaign {
  const status = computeCampaignStatus(
    dbCampaign.is_active,
    dbCampaign.start_date,
    dbCampaign.end_date
  );

  return {
    id: dbCampaign.id,
    name: dbCampaign.campaign_name,
    type: dbCampaign.campaign_type as CampaignType,
    startsAt: dbCampaign.start_date.toISOString(),
    endsAt: dbCampaign.end_date.toISOString(),
    status, // Computed field
    budgetCap: parseFloat(dbCampaign.budget_limit_usd.toString()),
    currentSpend: parseFloat(dbCampaign.total_spent_usd.toString()),
    actualRevenue: aggregatedStats?.actualRevenue,
    redemptionsCount: aggregatedStats?.redemptionsCount,
    conversionRate: aggregatedStats?.conversionRate,
    targetAudience: dbCampaign.target_tier
      ? { userTiers: [dbCampaign.target_tier as SubscriptionTier] }
      : undefined,
    isActive: dbCampaign.is_active,
    createdBy: dbCampaign.created_by,
    createdAt: dbCampaign.created_at.toISOString(),
    updatedAt: dbCampaign.updated_at.toISOString(),
  };
}

// =============================================================================
// REDEMPTION MAPPERS
// =============================================================================

/**
 * Map database Redemption to API CouponRedemption type
 */
export function mapRedemptionToApiType(
  dbRedemption: Prisma.coupon_redemptionGetPayload<{
    include: {
      coupon: {
        select: {
          code: true;
        };
      };
    };
  }>,
  userEmail?: string
): CouponRedemption {
  return {
    id: dbRedemption.id,
    couponId: dbRedemption.coupon_id,
    couponCode: dbRedemption.coupon.code,
    userId: dbRedemption.user_id,
    userEmail: userEmail,
    subscriptionId: dbRedemption.subscription_id,
    redemptionDate: dbRedemption.redemption_date.toISOString(),
    discountApplied: parseFloat(dbRedemption.discount_applied_usd.toString()),
    originalAmount: parseFloat(dbRedemption.original_amount_usd.toString()),
    finalAmount: parseFloat(dbRedemption.final_amount_usd.toString()),
    status: dbRedemption.redemption_status as RedemptionStatus,
    failureReason: dbRedemption.failure_reason,
    ipAddress: dbRedemption.ip_address,
    userAgent: dbRedemption.user_agent,
    isProrationInvolved: dbRedemption.is_proration_involved,
    prorationAmount: dbRedemption.proration_amount
      ? parseFloat(dbRedemption.proration_amount.toString())
      : null,
    userTierBefore: dbRedemption.user_tier_before,
    userTierAfter: dbRedemption.user_tier_after,
    billingCycleBefore: dbRedemption.billing_cycle_before,
    billingCycleAfter: dbRedemption.billing_cycle_after,
    createdAt: dbRedemption.created_at.toISOString(),
  };
}

// =============================================================================
// FRAUD DETECTION MAPPERS
// =============================================================================

/**
 * Map database FraudDetection to API FraudDetectionEvent type
 * Extracts fields from JSON details column
 */
export function mapFraudEventToApiType(
  dbFraud: Prisma.coupon_fraud_detectionGetPayload<{
    include: {
      coupon: {
        select: {
          code: true;
        };
      };
    };
  }>,
  userEmail?: string
): FraudDetectionEvent {
  // Extract fields from details JSON
  const details = dbFraud.details as any;

  return {
    id: dbFraud.id,
    redemptionId: null, // TODO: Add this field to schema
    couponId: dbFraud.coupon_id,
    couponCode: dbFraud.coupon.code,
    userId: dbFraud.user_id,
    userEmail: userEmail,
    detectionType: dbFraud.detection_type as FraudDetectionType,
    severity: dbFraud.severity as FraudSeverity,
    detectedAt: dbFraud.detected_at.toISOString(),
    riskScore: details?.risk_score || 0,
    reasons: details?.reasons || [],
    ipAddress: details?.ip_address || null,
    deviceFingerprint: details?.device_fingerprint || null,
    status: (dbFraud.resolution as FraudResolution) || FraudResolution.PENDING,
    isFlagged: dbFraud.is_flagged,
    reviewedBy: dbFraud.reviewed_by,
    reviewedAt: dbFraud.reviewed_at?.toISOString() || null,
    resolution: dbFraud.resolution,
    createdAt: dbFraud.created_at.toISOString(),
  };
}

// =============================================================================
// PRORATION EVENT MAPPERS
// =============================================================================

/**
 * Map database ProrationEvent to API ProrationEvent type
 * Handles field renaming from DB snake_case to API camelCase
 * Ensures response matches shared-types ProrationEvent interface
 */
export function mapProrationEventToApiType(
  dbEvent: Prisma.proration_eventGetPayload<{
    include: {
      users: {
        select: {
          email: true;
        };
      };
    };
  }>
): import('@rephlo/shared-types').ProrationEvent {
  return {
    id: dbEvent.id,
    userId: dbEvent.user_id,
    subscriptionId: dbEvent.subscription_id,
    fromTier: dbEvent.from_tier,
    toTier: dbEvent.to_tier,
    changeType: dbEvent.change_type as any, // ProrationEventType enum
    daysRemaining: dbEvent.days_remaining,
    daysInCycle: dbEvent.days_in_cycle,

    // Field name mapping: DB uses snake_case, API uses camelCase
    unusedCreditValueUsd: parseFloat(dbEvent.unused_credit_value_usd.toString()),
    newTierProratedCostUsd: parseFloat(dbEvent.new_tier_prorated_cost_usd.toString()),
    netChargeUsd: parseFloat(dbEvent.net_charge_usd.toString()),

    effectiveDate: dbEvent.effective_date.toISOString(),
    stripeInvoiceId: dbEvent.stripe_invoice_id,
    status: dbEvent.status as any, // ProrationStatus enum
    createdAt: dbEvent.created_at.toISOString(),
    updatedAt: dbEvent.updated_at.toISOString(),

    // Optional user field from join
    user: dbEvent.users
      ? {
          email: dbEvent.users.email,
        }
      : undefined,
  };
}

// =============================================================================
// DECIMAL TO NUMBER CONVERSION
// =============================================================================

/**
 * Convert Prisma Decimal to number
 * Handles precision loss for currency values
 */
export function decimalToNumber(decimal: Prisma.Decimal | null | undefined): number {
  if (!decimal) return 0;
  return parseFloat(decimal.toString());
}

/**
 * Convert number to Prisma Decimal
 * For database writes
 */
export function numberToDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

// =============================================================================
// DATE CONVERSION
// =============================================================================

/**
 * Convert Date to ISO 8601 string (or null)
 */
export function dateToIsoString(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Convert ISO 8601 string to Date (or null)
 */
export function isoStringToDate(isoString: string | null | undefined): Date | null {
  return isoString ? new Date(isoString) : null;
}
