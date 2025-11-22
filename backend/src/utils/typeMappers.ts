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
  dbUser: Prisma.usersGetPayload<{
    include: {
      subscription_monetization: {
        where: { status: { in: ['trial', 'active'] } };
        take: 1;
      };
      user_credit_balance: true;
    };
  }>
): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name:
      dbUser.first_name && dbUser.last_name
        ? `${dbUser.first_name} ${dbUser.last_name}`
        : dbUser.first_name || dbUser.last_name || null,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    username: dbUser.username,
    profilePictureUrl: dbUser.profile_picture_url,
    status: dbUser.status as UserStatus,
    isActive: dbUser.is_active,
    currentTier:
      (dbUser.subscription_monetization[0]?.tier as SubscriptionTier) || SubscriptionTier.FREE,
    creditsBalance: dbUser.user_credit_balance?.amount || 0,
    createdAt: dbUser.created_at.toISOString(),
    lastActiveAt: dbUser.last_login_at?.toISOString() || null,
    deactivatedAt: dbUser.deactivated_at?.toISOString() || null,
    deletedAt: dbUser.deleted_at?.toISOString() || null,
    suspendedUntil: dbUser.suspended_until?.toISOString() || null,
    bannedAt: dbUser.banned_at?.toISOString() || null,
    role: dbUser.role,
    lifetimeValue: dbUser.lifetime_value,
  };
}

/**
 * Map database User to API UserDetails type
 * Includes usage statistics
 */
export function mapUserDetailsToApiType(
  dbUser: Prisma.usersGetPayload<{
    include: {
      subscription_monetization: {
        where: { status: { in: ['trial', 'active'] } };
        take: 1;
      };
      user_credit_balance: true;
      token_usage_ledger: true;
      credit_deduction_ledger: true;
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
    emailVerified: dbUser.email_verified,
    hasActivePerpetualLicense: dbUser.has_active_perpetual_license,
    mfaEnabled: dbUser.mfa_enabled,
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
  dbSub: Prisma.subscription_monetizationGetPayload<{
    include: {
      users: {
        select: {
          id: true;
          email: true;
          first_name: true;
          last_name: true;
        };
      };
    };
  }>
): Subscription {
  // Compute nextBillingDate
  const nextBillingDate =
    dbSub.status === 'active' && !dbSub.cancelled_at
      ? dbSub.current_period_end.toISOString()
      : null;

  return {
    id: dbSub.id,
    userId: dbSub.user_id,
    tier: dbSub.tier as SubscriptionTier,
    status: dbSub.status as SubscriptionStatus,
    billingCycle: dbSub.billing_cycle as BillingCycle,
    finalPriceUsd: parseFloat(dbSub.base_price_usd.toString()), // Use base_price_usd for finalPriceUsd
    basePriceUsd: parseFloat(dbSub.base_price_usd.toString()),
    monthlyCreditsAllocated: dbSub.monthly_credit_allocation, // Field name mapping
    currentPeriodStart: dbSub.current_period_start.toISOString(),
    currentPeriodEnd: dbSub.current_period_end.toISOString(),
    nextBillingDate, // Computed field
    stripeCustomerId: dbSub.stripe_customer_id,
    stripeSubscriptionId: dbSub.stripe_subscription_id,
    cancelAtPeriodEnd: false, // TODO: Add this field to schema if needed
    cancelledAt: dbSub.cancelled_at?.toISOString() || null,
    trialEndsAt: dbSub.trial_ends_at?.toISOString() || null,
    createdAt: dbSub.created_at.toISOString(),
    updatedAt: dbSub.updated_at.toISOString(),
    user: dbSub.users
      ? {
          id: dbSub.users.id,
          email: dbSub.users.email,
          firstName: dbSub.users.first_name,
          lastName: dbSub.users.last_name,
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

// =============================================================================
// MODEL MAPPERS (Phase 3: Separate input/output pricing)
// =============================================================================

/**
 * Map database Model to API ModelApiType
 * Transforms snake_case database fields to camelCase API fields
 *
 * Phase 3: Includes separate input/output pricing fields
 */
export function mapModelToApiType(
  dbModel: Prisma.modelsGetPayload<{
    select: {
      id: true;
      name: true;
      provider: true;
      is_available: true;
      is_legacy: true;
      is_archived: true;
      meta: true;
      created_at: true;
      updated_at: true;
    };
  }>
): import('@rephlo/shared-types').ModelApiType {
  const meta = dbModel.meta as any;

  return {
    id: dbModel.id,
    name: dbModel.name,
    provider: dbModel.provider,
    isAvailable: dbModel.is_available,
    isLegacy: dbModel.is_legacy,
    isArchived: dbModel.is_archived,
    createdAt: dbModel.created_at.toISOString(),
    updatedAt: dbModel.updated_at.toISOString(),
    meta: {
      // Display Information
      displayName: meta?.displayName ?? dbModel.name,
      description: meta?.description,
      version: meta?.version,

      // Capabilities
      capabilities: meta?.capabilities ?? [],

      // Context & Output Limits
      contextLength: meta?.contextLength ?? 0,
      maxOutputTokens: meta?.maxOutputTokens,

      // Pricing (in smallest currency unit - cents for USD)
      inputCostPerMillionTokens: meta?.inputCostPerMillionTokens ?? 0,
      outputCostPerMillionTokens: meta?.outputCostPerMillionTokens ?? 0,

      // Phase 3: Separate input/output pricing
      inputCreditsPerK: meta?.inputCreditsPerK,
      outputCreditsPerK: meta?.outputCreditsPerK,

      // DEPRECATED: Kept for backward compatibility
      creditsPer1kTokens: meta?.creditsPer1kTokens,

      // Tier Access Control
      requiredTier: meta?.requiredTier ?? 'free',
      tierRestrictionMode: meta?.tierRestrictionMode ?? 'minimum',
      allowedTiers: meta?.allowedTiers ?? ['free'],

      // Legacy Management (Optional)
      legacyReplacementModelId: meta?.legacyReplacementModelId,
      deprecationNotice: meta?.deprecationNotice,
      sunsetDate: meta?.sunsetDate,

      // Provider-Specific Extensions
      providerMetadata: meta?.providerMetadata,

      // Admin Metadata
      internalNotes: meta?.internalNotes,
      complianceTags: meta?.complianceTags,
    },
  };
}

/**
 * Map database token_usage_ledger to API TokenUsageApiType
 * Transforms snake_case database fields to camelCase API fields
 *
 * Phase 3: Includes separate input/output credits
 */
export function mapTokenUsageToApiType(
  dbUsage: Prisma.token_usage_ledgerGetPayload<{}>
): {
  id: string;
  requestId: string;
  userId: string;
  subscriptionId: string | null;
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  vendorCost: number;
  marginMultiplier: number;
  creditValueUsd: number;

  // Phase 3: Separate input/output pricing
  inputCredits: number | null;
  outputCredits: number | null;
  totalCredits: number | null;

  // DEPRECATED: Kept for backward compatibility
  creditsDeducted: number;

  requestType: string;
  streamingSegments: number | null;
  requestStartedAt: string;
  requestCompletedAt: string;
  processingTimeMs: number | null;
  status: string;
  errorMessage: string | null;
  isStreamingComplete: boolean;
  userTierAtRequest: string | null;
} {
  return {
    id: dbUsage.id,
    requestId: dbUsage.request_id,
    userId: dbUsage.user_id,
    subscriptionId: dbUsage.subscription_id,
    modelId: dbUsage.model_id,
    providerId: dbUsage.provider_id,
    inputTokens: dbUsage.input_tokens,
    outputTokens: dbUsage.output_tokens,
    cachedInputTokens: dbUsage.cached_input_tokens,
    vendorCost: decimalToNumber(dbUsage.vendor_cost),
    marginMultiplier: decimalToNumber(dbUsage.margin_multiplier),
    creditValueUsd: decimalToNumber(dbUsage.credit_value_usd),

    // Phase 3: Separate input/output pricing
    inputCredits: dbUsage.input_credits,
    outputCredits: dbUsage.output_credits,
    totalCredits: dbUsage.total_credits,

    // DEPRECATED: Kept for backward compatibility
    creditsDeducted: dbUsage.credits_deducted,

    requestType: dbUsage.request_type,
    streamingSegments: dbUsage.streaming_segments,
    requestStartedAt: dbUsage.request_started_at.toISOString(),
    requestCompletedAt: dbUsage.request_completed_at.toISOString(),
    processingTimeMs: dbUsage.processing_time_ms,
    status: dbUsage.status,
    errorMessage: dbUsage.error_message,
    isStreamingComplete: dbUsage.is_streaming_complete,
    userTierAtRequest: dbUsage.user_tier_at_request,
  };
}

// =============================================================================
// TIER CONFIG MAPPERS (Plan 190)
// =============================================================================

/**
 * Map database subscription_tier_config to API TierConfig type
 * Transforms snake_case database fields to camelCase API fields
 */
export function mapTierConfigToApiType(
  dbConfig: Prisma.subscription_tier_configGetPayload<{}>
): import('@rephlo/shared-types').TierConfig {
  return {
    id: dbConfig.id,
    tierName: dbConfig.tier_name as any, // SubscriptionTier enum
    monthlyPriceUsd: decimalToNumber(dbConfig.monthly_price_usd),
    annualPriceUsd: decimalToNumber(dbConfig.annual_price_usd),
    monthlyCreditAllocation: dbConfig.monthly_credit_allocation,
    maxCreditRollover: dbConfig.max_credit_rollover,
    features: dbConfig.features as Record<string, any>,
    isActive: dbConfig.is_active,

    // Version tracking fields
    configVersion: dbConfig.config_version,
    lastModifiedBy: dbConfig.last_modified_by,
    lastModifiedAt: dbConfig.last_modified_at.toISOString(),
    applyToExistingUsers: dbConfig.apply_to_existing_users,
    rolloutStartDate: dateToIsoString(dbConfig.rollout_start_date),

    createdAt: dbConfig.created_at.toISOString(),
    updatedAt: dbConfig.updated_at.toISOString(),
  };
}

/**
 * Map database tier_config_history to API TierConfigHistory type
 * Transforms snake_case database fields to camelCase API fields
 */
export function mapTierConfigHistoryToApiType(
  dbHistory: Prisma.tier_config_historyGetPayload<{}>
): import('@rephlo/shared-types').TierConfigHistory {
  return {
    id: dbHistory.id,
    tierConfigId: dbHistory.tier_config_id,
    tierName: dbHistory.tier_name,

    // Historical values
    previousCredits: dbHistory.previous_credits,
    newCredits: dbHistory.new_credits,
    previousPriceUsd: decimalToNumber(dbHistory.previous_price_usd),
    newPriceUsd: decimalToNumber(dbHistory.new_price_usd),

    // Change metadata
    changeReason: dbHistory.change_reason,
    changeType: dbHistory.change_type as any, // TierChangeType enum
    affectedUsersCount: dbHistory.affected_users_count,

    // Audit fields
    changedBy: dbHistory.changed_by,
    changedAt: dbHistory.changed_at.toISOString(),
    appliedAt: dateToIsoString(dbHistory.applied_at),
  };
}
