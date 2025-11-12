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
  dbCoupon: Prisma.CouponGetPayload<{
    include: {
      usageLimits: true;
      campaign: {
        select: {
          campaignName: true;
        };
      };
    };
  }>
): Coupon {
  const discountValue = parseFloat(dbCoupon.discountValue.toString());

  // Split discount fields based on coupon type
  const discountFields: {
    discount_percentage?: number;
    discount_amount?: number;
    bonus_duration_months?: number;
  } = {};

  if (dbCoupon.couponType === 'percentage') {
    discountFields.discount_percentage = discountValue;
  } else if (dbCoupon.couponType === 'fixed_amount') {
    discountFields.discount_amount = discountValue;
  } else if (dbCoupon.couponType === 'duration_bonus') {
    discountFields.bonus_duration_months = Math.round(discountValue);
  }

  return {
    id: dbCoupon.id,
    code: dbCoupon.code,
    type: dbCoupon.couponType as CouponType, // Renamed field
    ...discountFields, // Spread split discount fields
    discount_type: dbCoupon.discountType as any,
    max_discount_applications: dbCoupon.maxUses, // Renamed field
    max_uses_per_user: dbCoupon.maxUsesPerUser,
    redemption_count: dbCoupon.usageLimits?.totalUses || 0, // Computed from usageLimits
    total_discount_value: parseFloat(
      dbCoupon.usageLimits?.totalDiscountAppliedUsd.toString() || '0'
    ), // Computed
    min_purchase_amount: dbCoupon.minPurchaseAmount
      ? parseFloat(dbCoupon.minPurchaseAmount.toString())
      : null,
    tier_eligibility: dbCoupon.tierEligibility as SubscriptionTier[],
    billing_cycles: dbCoupon.billingCycles,
    valid_from: dbCoupon.validFrom.toISOString(),
    valid_until: dbCoupon.validUntil.toISOString(),
    is_active: dbCoupon.isActive,
    campaign_id: dbCoupon.campaignId,
    campaign_name: dbCoupon.campaign?.campaignName || null, // Populated from join
    description: dbCoupon.description,
    internal_notes: dbCoupon.internalNotes,
    created_by: dbCoupon.createdBy,
    created_at: dbCoupon.createdAt.toISOString(),
    updated_at: dbCoupon.updatedAt.toISOString(),
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
  dbCampaign: Prisma.CouponCampaignGetPayload<{
    include: {
      _count: {
        select: {
          coupons: true;
        };
      };
    };
  }>,
  aggregatedStats?: {
    actual_revenue?: number;
    redemptions_count?: number;
    conversion_rate?: number;
  }
): CouponCampaign {
  const status = computeCampaignStatus(
    dbCampaign.isActive,
    dbCampaign.startDate,
    dbCampaign.endDate
  );

  return {
    id: dbCampaign.id,
    name: dbCampaign.campaignName, // Renamed field
    type: dbCampaign.campaignType as CampaignType, // Renamed field
    starts_at: dbCampaign.startDate.toISOString(), // Renamed field
    ends_at: dbCampaign.endDate.toISOString(), // Renamed field
    status, // Computed field
    budget_cap: parseFloat(dbCampaign.budgetLimitUsd.toString()), // Renamed field
    current_spend: parseFloat(dbCampaign.totalSpentUsd.toString()), // Renamed field
    actual_revenue: aggregatedStats?.actual_revenue,
    redemptions_count: aggregatedStats?.redemptions_count,
    conversion_rate: aggregatedStats?.conversion_rate,
    target_audience: dbCampaign.targetTier
      ? { user_tiers: [dbCampaign.targetTier as SubscriptionTier] }
      : undefined,
    is_active: dbCampaign.isActive,
    created_by: dbCampaign.createdBy,
    created_at: dbCampaign.createdAt.toISOString(),
    updated_at: dbCampaign.updatedAt.toISOString(),
  };
}

// =============================================================================
// REDEMPTION MAPPERS
// =============================================================================

/**
 * Map database Redemption to API CouponRedemption type
 */
export function mapRedemptionToApiType(
  dbRedemption: Prisma.CouponRedemptionGetPayload<{
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
    coupon_id: dbRedemption.couponId,
    coupon_code: dbRedemption.coupon.code,
    user_id: dbRedemption.userId,
    user_email: userEmail,
    subscription_id: dbRedemption.subscriptionId,
    redemption_date: dbRedemption.redemptionDate.toISOString(),
    discount_applied: parseFloat(dbRedemption.discountAppliedUsd.toString()),
    original_amount: parseFloat(dbRedemption.originalAmountUsd.toString()),
    final_amount: parseFloat(dbRedemption.finalAmountUsd.toString()),
    status: dbRedemption.redemptionStatus as RedemptionStatus,
    failure_reason: dbRedemption.failureReason,
    ip_address: dbRedemption.ipAddress,
    user_agent: dbRedemption.userAgent,
    is_proration_involved: dbRedemption.isProrationInvolved,
    proration_amount: dbRedemption.prorationAmount
      ? parseFloat(dbRedemption.prorationAmount.toString())
      : null,
    user_tier_before: dbRedemption.userTierBefore,
    user_tier_after: dbRedemption.userTierAfter,
    billing_cycle_before: dbRedemption.billingCycleBefore,
    billing_cycle_after: dbRedemption.billingCycleAfter,
    created_at: dbRedemption.createdAt.toISOString(),
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
  dbFraud: Prisma.CouponFraudDetectionGetPayload<{
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
    redemption_id: null, // TODO: Add this field to schema
    coupon_id: dbFraud.couponId,
    coupon_code: dbFraud.coupon.code,
    user_id: dbFraud.userId,
    user_email: userEmail,
    detection_type: dbFraud.detectionType as FraudDetectionType,
    severity: dbFraud.severity as FraudSeverity,
    detected_at: dbFraud.detectedAt.toISOString(),
    risk_score: details?.risk_score || 0,
    reasons: details?.reasons || [],
    ip_address: details?.ip_address || null,
    device_fingerprint: details?.device_fingerprint || null,
    status: (dbFraud.resolution as FraudResolution) || FraudResolution.PENDING,
    is_flagged: dbFraud.isFlagged,
    reviewed_by: dbFraud.reviewedBy,
    reviewed_at: dbFraud.reviewedAt?.toISOString() || null,
    resolution: dbFraud.resolution,
    created_at: dbFraud.createdAt.toISOString(),
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
