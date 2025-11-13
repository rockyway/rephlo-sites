/**
 * Frontend Type Adapters
 *
 * UI-specific extensions and adapters for shared types from @rephlo/shared-types
 *
 * These types extend shared types with frontend-specific UI state and behavior
 */

// Import types
import type {
  User,
  Subscription,
  Coupon,
  CouponCampaign,
  BillingInvoice,
} from '@rephlo/shared-types';

// Import enums (cannot use 'import type' for enums as they're used as values)
import {
  UserStatus,
  SubscriptionStatus,
} from '@rephlo/shared-types';

// ============================================================================
// User UI Extensions
// ============================================================================

/**
 * User with UI-specific state for form editing and validation
 */
export interface UserWithUIState extends User {
  isEditing?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  validationErrors?: Record<string, string>;
  isDirty?: boolean;
}

/**
 * User with selection state for bulk operations
 */
export interface SelectableUser extends User {
  isSelected?: boolean;
}

// ============================================================================
// Subscription UI Extensions
// ============================================================================

/**
 * Subscription with UI-specific display state
 */
export interface SubscriptionWithUIState extends Subscription {
  isExpanded?: boolean;
  showDetails?: boolean;
  isChangingTier?: boolean;
  isCancelling?: boolean;
}

// ============================================================================
// Coupon UI Extensions
// ============================================================================

/**
 * Coupon with UI-specific validation and display state
 */
export interface CouponWithUIState extends Coupon {
  isSelected?: boolean;
  highlightError?: boolean;
  isEditing?: boolean;
  validationErrors?: Record<string, string>;
}

/**
 * Campaign with UI-specific calendar and display state
 */
export interface CampaignWithUIState extends CouponCampaign {
  isExpanded?: boolean;
  showCoupons?: boolean;
  isHighlighted?: boolean;
}

// ============================================================================
// Invoice UI Extensions
// ============================================================================

/**
 * Invoice with UI-specific display state
 */
export interface InvoiceWithUIState extends BillingInvoice {
  isExpanded?: boolean;
  showTransactions?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if user is active
 */
export function isUserActive(user: User): boolean {
  return user.status === UserStatus.ACTIVE && user.isActive === true;
}

/**
 * Type guard to check if user is suspended
 */
export function isUserSuspended(user: User): boolean {
  return user.status === UserStatus.SUSPENDED;
}

/**
 * Type guard to check if user is banned
 */
export function isUserBanned(user: User): boolean {
  return user.status === UserStatus.BANNED;
}

/**
 * Type guard to check if subscription is active
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === SubscriptionStatus.ACTIVE;
}

/**
 * Type guard to check if subscription is in trial
 */
export function isSubscriptionTrial(subscription: Subscription): boolean {
  return subscription.status === SubscriptionStatus.TRIAL;
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Adapter for legacy API responses that might use different field names
 * Maps legacy User response to shared User type
 */
export function adaptLegacyUserResponse(legacy: any): User {
  return {
    id: legacy.id || legacy.user_id,
    email: legacy.email,
    name: legacy.name || legacy.display_name || null,
    firstName: legacy.firstName || legacy.first_name || null,
    lastName: legacy.lastName || legacy.last_name || null,
    username: legacy.username || null,
    profilePictureUrl: legacy.profilePictureUrl || legacy.profile_picture_url || null,
    status: legacy.status || UserStatus.ACTIVE,
    isActive: legacy.isActive ?? legacy.is_active ?? true,
    currentTier: legacy.currentTier || legacy.current_tier || 'free',
    creditsBalance: legacy.creditsBalance ?? legacy.credits_balance ?? 0,
    createdAt: legacy.createdAt || legacy.created_at || new Date().toISOString(),
    lastActiveAt: legacy.lastActiveAt || legacy.last_active_at || null,
    deactivatedAt: legacy.deactivatedAt || legacy.deactivated_at || null,
    deletedAt: legacy.deletedAt || legacy.deleted_at || null,
    suspendedUntil: legacy.suspendedUntil || legacy.suspended_until || null,
    bannedAt: legacy.bannedAt || legacy.banned_at || null,
    subscription: legacy.subscription,
    role: legacy.role || 'user',
    lifetimeValue: legacy.lifetimeValue ?? legacy.lifetime_value ?? 0,
  };
}

/**
 * Adapter for legacy Subscription response
 */
export function adaptLegacySubscriptionResponse(legacy: any): Subscription {
  return {
    id: legacy.id,
    userId: legacy.userId || legacy.user_id,
    tier: legacy.tier,
    status: legacy.status,
    billingCycle: legacy.billingCycle || legacy.billing_cycle,
    finalPriceUsd: legacy.finalPriceUsd ?? legacy.final_price_usd ?? legacy.basePriceUsd ?? 0,
    basePriceUsd: legacy.basePriceUsd ?? legacy.base_price_usd ?? 0,
    monthlyCreditsAllocated: legacy.monthlyCreditsAllocated ?? legacy.monthly_credits_allocated ?? 0,
    currentPeriodStart: legacy.currentPeriodStart || legacy.current_period_start,
    currentPeriodEnd: legacy.currentPeriodEnd || legacy.current_period_end,
    nextBillingDate: legacy.nextBillingDate || legacy.next_billing_date || null,
    stripeCustomerId: legacy.stripeCustomerId || legacy.stripe_customer_id || null,
    stripeSubscriptionId: legacy.stripeSubscriptionId || legacy.stripe_subscription_id || null,
    cancelAtPeriodEnd: legacy.cancelAtPeriodEnd ?? legacy.cancel_at_period_end ?? false,
    cancelledAt: legacy.cancelledAt || legacy.cancelled_at || null,
    trialEndsAt: legacy.trialEndsAt || legacy.trial_ends_at || null,
    createdAt: legacy.createdAt || legacy.created_at,
    updatedAt: legacy.updatedAt || legacy.updated_at,
    user: legacy.user,
  };
}

/**
 * Format display name for user
 */
export function formatUserDisplayName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.name) {
    return user.name;
  }
  if (user.username) {
    return user.username;
  }
  return user.email;
}

/**
 * Format subscription tier for display
 */
export function formatTierDisplay(tier: string): string {
  const tierMap: Record<string, string> = {
    'free': 'Free',
    'pro': 'Pro',
    'pro_max': 'Pro Max',
    'enterprise_pro': 'Enterprise Pro',
    'enterprise_max': 'Enterprise Max',
    'perpetual': 'Perpetual',
  };
  return tierMap[tier] || tier;
}

/**
 * Format currency (USD) for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Calculate days until subscription renewal
 */
export function daysUntilRenewal(subscription: Subscription): number | null {
  if (!subscription.nextBillingDate) {
    return null;
  }
  const now = new Date();
  const renewal = new Date(subscription.nextBillingDate);
  const diffTime = renewal.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
