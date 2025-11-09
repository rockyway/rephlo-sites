/**
 * Plan 111 Utility Functions
 *
 * Helper functions for coupon code formatting, validation, discount calculation,
 * and color coding for UI components.
 */

import type {
  CouponType,
  CampaignType,
  FraudSeverity,
  SubscriptionTier,
} from '@/types/plan111.types';

// ===== Coupon Code Formatting & Validation =====

/**
 * Format coupon code to uppercase alphanumeric
 * @param code - Raw coupon code
 * @returns Formatted code
 */
export function formatCouponCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 50); // Max 50 chars
}

/**
 * Validate coupon code format
 * @param code - Coupon code to validate
 * @returns Validation result
 */
export function validateCouponCode(code: string): {
  isValid: boolean;
  error?: string;
} {
  if (!code || code.trim().length === 0) {
    return { isValid: false, error: 'Coupon code is required' };
  }

  if (code.length < 4) {
    return {
      isValid: false,
      error: 'Coupon code must be at least 4 characters',
    };
  }

  if (code.length > 50) {
    return {
      isValid: false,
      error: 'Coupon code must be at most 50 characters',
    };
  }

  if (!/^[A-Z0-9]+$/.test(code)) {
    return {
      isValid: false,
      error: 'Coupon code must contain only letters and numbers',
    };
  }

  return { isValid: true };
}

// ===== Discount Calculation =====

/**
 * Calculate discount preview based on coupon type
 * @param type - Coupon type
 * @param value - Discount value (percentage or fixed amount)
 * @param originalAmount - Original subscription amount
 * @returns Discount amount
 */
export function calculateDiscount(
  type: CouponType,
  value: number,
  originalAmount: number
): number {
  switch (type) {
    case 'percentage':
      return Math.round((originalAmount * value) / 100);
    case 'fixed_amount':
      return Math.min(value, originalAmount);
    case 'tier_specific':
      return Math.round((originalAmount * value) / 100);
    case 'duration_bonus':
      return originalAmount * value; // value = bonus months
    case 'perpetual_migration':
      return value; // Pre-calculated discount
    default:
      return 0;
  }
}

/**
 * Format discount value for display
 * @param type - Coupon type
 * @param value - Discount value
 * @returns Formatted string
 */
export function formatDiscountValue(
  type: CouponType,
  value: number
): string {
  switch (type) {
    case 'percentage':
    case 'tier_specific':
      return `${value}%`;
    case 'fixed_amount':
    case 'perpetual_migration':
      return `$${value.toFixed(2)}`;
    case 'duration_bonus':
      return `${value} month${value === 1 ? '' : 's'} free`;
    default:
      return `${value}`;
  }
}

// ===== Color Utilities =====

/**
 * Get Tailwind color class for coupon type badge
 * @param type - Coupon type
 * @returns Tailwind color class
 */
export function getCouponTypeColor(type: CouponType): string {
  switch (type) {
    case 'percentage':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'fixed_amount':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'tier_specific':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'duration_bonus':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'perpetual_migration':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get Tailwind color class for campaign type badge
 * @param type - Campaign type
 * @returns Tailwind color class
 */
export function getCampaignTypeColor(type: CampaignType): string {
  switch (type) {
    case 'holiday':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'marketing':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'behavioral':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'referral':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get Tailwind color class for fraud severity badge
 * @param severity - Fraud severity
 * @returns Tailwind color class
 */
export function getFraudSeverityColor(severity: FraudSeverity): string {
  switch (severity) {
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get display label for coupon type
 * @param type - Coupon type
 * @returns Human-readable label
 */
export function getCouponTypeLabel(type: CouponType): string {
  switch (type) {
    case 'percentage':
      return 'Percentage Discount';
    case 'fixed_amount':
      return 'Fixed Amount';
    case 'tier_specific':
      return 'Tier Specific';
    case 'duration_bonus':
      return 'Duration Bonus';
    case 'perpetual_migration':
      return 'BYOK Migration';
    default:
      return type;
  }
}

/**
 * Get display label for campaign type
 * @param type - Campaign type
 * @returns Human-readable label
 */
export function getCampaignTypeLabel(type: CampaignType): string {
  switch (type) {
    case 'holiday':
      return 'Holiday Campaign';
    case 'marketing':
      return 'Marketing Campaign';
    case 'behavioral':
      return 'Behavioral Campaign';
    case 'referral':
      return 'Referral Program';
    default:
      return type;
  }
}

/**
 * Get display label for tier
 * @param tier - Subscription tier
 * @returns Human-readable label
 */
export function getTierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'pro_max':
      return 'Pro Max';
    case 'enterprise_pro':
      return 'Enterprise Pro';
    case 'enterprise_max':
      return 'Enterprise Max';
    case 'perpetual':
      return 'Perpetual';
    default:
      return tier;
  }
}

// ===== Date & Time Utilities =====

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time for display
 * @param dateString - ISO date string
 * @returns Formatted date with time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Check if date is in the past
 * @param dateString - ISO date string
 * @returns True if date is in the past
 */
export function isDateInPast(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

/**
 * Check if date is in the future
 * @param dateString - ISO date string
 * @returns True if date is in the future
 */
export function isDateInFuture(dateString: string): boolean {
  return new Date(dateString) > new Date();
}

/**
 * Get days until date
 * @param dateString - ISO date string
 * @returns Number of days until date (negative if past)
 */
export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ===== Number Formatting =====

/**
 * Format currency value
 * @param value - Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage value
 * @param value - Numeric value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M)
 * @param value - Numeric value
 * @returns Formatted string
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

// ===== Status Utilities =====

/**
 * Get status color for coupon
 * @param coupon - Coupon object
 * @returns Tailwind color class
 */
export function getCouponStatusColor(coupon: {
  is_active: boolean;
  valid_from: string;
  valid_until: string;
}): string {
  if (!coupon.is_active) {
    return 'bg-gray-100 text-gray-800';
  }

  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  const validUntil = new Date(coupon.valid_until);

  if (now < validFrom) {
    return 'bg-blue-100 text-blue-800'; // Upcoming
  }

  if (now > validUntil) {
    return 'bg-red-100 text-red-800'; // Expired
  }

  return 'bg-green-100 text-green-800'; // Active
}

/**
 * Get status label for coupon
 * @param coupon - Coupon object
 * @returns Status label
 */
export function getCouponStatusLabel(coupon: {
  is_active: boolean;
  valid_from: string;
  valid_until: string;
}): string {
  if (!coupon.is_active) {
    return 'Inactive';
  }

  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  const validUntil = new Date(coupon.valid_until);

  if (now < validFrom) {
    return 'Upcoming';
  }

  if (now > validUntil) {
    return 'Expired';
  }

  return 'Active';
}

/**
 * Calculate budget utilization percentage
 * @param currentSpend - Current spend
 * @param budgetCap - Budget cap
 * @returns Percentage (0-100)
 */
export function calculateBudgetUtilization(
  currentSpend: number,
  budgetCap?: number
): number {
  if (!budgetCap || budgetCap === 0) return 0;
  return Math.min((currentSpend / budgetCap) * 100, 100);
}

/**
 * Get budget utilization color
 * @param percentage - Utilization percentage (0-100)
 * @returns Tailwind color class
 */
export function getBudgetUtilizationColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600';
  if (percentage >= 70) return 'text-yellow-600';
  return 'text-green-600';
}
