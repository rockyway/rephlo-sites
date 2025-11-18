/**
 * Plan 109: Utility Functions
 *
 * Helper functions for formatting, calculations, and data transformations
 * used across Plan 109 admin pages
 */

import { SubscriptionTier, SubscriptionStatus, UserStatus } from '@/types/plan109.types';

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format USD currency amounts
 * Safely handles undefined, null, or invalid numeric values
 */
export function formatCurrency(amount: number | undefined | null, decimals = 2): string {
  // Handle undefined, null, or NaN values
  const validAmount = (amount === undefined || amount === null || Number.isNaN(amount)) ? 0 : Number(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(validAmount);
}

/**
 * Format large numbers with K/M abbreviations
 * Safely handles undefined, null, or invalid numeric values
 */
export function formatNumber(num: number | undefined | null): string {
  // Handle undefined, null, or NaN values
  if (num === undefined || num === null || Number.isNaN(num)) {
    return '0';
  }

  // Ensure we have a valid number
  const validNum = Number(num);
  if (!Number.isFinite(validNum)) {
    return '0';
  }

  if (validNum >= 1_000_000) {
    return `${(validNum / 1_000_000).toFixed(1)}M`;
  }
  if (validNum >= 1_000) {
    return `${(validNum / 1_000).toFixed(1)}K`;
  }
  return validNum.toLocaleString('en-US');
}

/**
 * Format ISO date to readable format
 */
export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' = 'short'): string {
  // Handle null/undefined dates
  if (!date) {
    return 'N/A';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  // Handle null/undefined dates
  if (!date) {
    return 'Never';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} month${Math.floor(diffDay / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDay / 365)} year${Math.floor(diffDay / 365) > 1 ? 's' : ''} ago`;
}

/**
 * Format percentage
 * Safely handles undefined, null, or invalid numeric values
 */
export function formatPercentage(value: number | undefined | null, decimals = 1): string {
  // Handle undefined, null, or NaN values
  const validValue = (value === undefined || value === null || Number.isNaN(value)) ? 0 : Number(value);
  return `${validValue.toFixed(decimals)}%`;
}

// ============================================================================
// Tier-related Functions
// ============================================================================

/**
 * Get display name for tier
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    [SubscriptionTier.FREE]: 'Free',
    [SubscriptionTier.PRO]: 'Pro',
    [SubscriptionTier.PRO_PLUS]: 'Pro Plus',
    [SubscriptionTier.PRO_MAX]: 'Pro Max',
    [SubscriptionTier.ENTERPRISE_PRO]: 'Enterprise Pro',
    [SubscriptionTier.ENTERPRISE_PRO_PLUS]: 'Enterprise Pro Plus',
    [SubscriptionTier.PERPETUAL]: 'Perpetual',
  };
  return names[tier] || tier;
}

/**
 * Get Tailwind color classes for tier badges
 */
export function getTierColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    [SubscriptionTier.FREE]: 'bg-gray-100 text-gray-700 border-gray-300',
    [SubscriptionTier.PRO]: 'bg-blue-100 text-blue-700 border-blue-300',
    [SubscriptionTier.PRO_PLUS]: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    [SubscriptionTier.PRO_MAX]: 'bg-purple-100 text-purple-700 border-purple-300',
    [SubscriptionTier.ENTERPRISE_PRO]: 'bg-amber-100 text-amber-700 border-amber-300',
    [SubscriptionTier.ENTERPRISE_PRO_PLUS]: 'bg-orange-100 text-orange-700 border-orange-300',
    [SubscriptionTier.PERPETUAL]: 'bg-green-100 text-green-700 border-green-300',
  };
  return colors[tier] || 'bg-gray-100 text-gray-700';
}

/**
 * Get sort order for tiers (for display)
 */
export function getTierSortOrder(tier: SubscriptionTier): number {
  const order: Record<SubscriptionTier, number> = {
    [SubscriptionTier.FREE]: 0,
    [SubscriptionTier.PRO]: 1,
    [SubscriptionTier.PRO_PLUS]: 2,
    [SubscriptionTier.PRO_MAX]: 3,
    [SubscriptionTier.ENTERPRISE_PRO]: 4,
    [SubscriptionTier.ENTERPRISE_PRO_PLUS]: 5,
    [SubscriptionTier.PERPETUAL]: 6,
  };
  return order[tier] || 999;
}

// ============================================================================
// Status-related Functions
// ============================================================================

/**
 * Get display name for subscription status
 */
export function getSubscriptionStatusDisplay(status: SubscriptionStatus): string {
  const names: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.TRIAL]: 'Trial',
    [SubscriptionStatus.ACTIVE]: 'Active',
    [SubscriptionStatus.PAST_DUE]: 'Past Due',
    [SubscriptionStatus.CANCELLED]: 'Cancelled',
    [SubscriptionStatus.EXPIRED]: 'Expired',
    [SubscriptionStatus.SUSPENDED]: 'Suspended',
    [SubscriptionStatus.GRACE_PERIOD]: 'Grace Period',
    [SubscriptionStatus.INACTIVE]: 'Inactive',
    [SubscriptionStatus.PENDING]: 'Pending',
  };
  return names[status] || status;
}

/**
 * Get color classes for subscription status badges
 */
export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-700 border-blue-300',
    [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-700 border-green-300',
    [SubscriptionStatus.PAST_DUE]: 'bg-red-100 text-red-700 border-red-300',
    [SubscriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-700 border-gray-300',
    [SubscriptionStatus.EXPIRED]: 'bg-gray-100 text-gray-700 border-gray-300',
    [SubscriptionStatus.SUSPENDED]: 'bg-amber-100 text-amber-700 border-amber-300',
    [SubscriptionStatus.GRACE_PERIOD]: 'bg-orange-100 text-orange-700 border-orange-300',
    [SubscriptionStatus.INACTIVE]: 'bg-gray-100 text-gray-700 border-gray-300',
    [SubscriptionStatus.PENDING]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Get display name for user status
 */
export function getUserStatusDisplay(status: UserStatus): string {
  const names: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'Active',
    [UserStatus.SUSPENDED]: 'Suspended',
    [UserStatus.BANNED]: 'Banned',
    [UserStatus.DELETED]: 'Deleted',
  };
  return names[status] || status;
}

/**
 * Get color classes for user status badges
 */
export function getUserStatusColor(status: UserStatus): string {
  const colors: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: 'bg-green-100 text-green-700 border-green-300',
    [UserStatus.SUSPENDED]: 'bg-amber-100 text-amber-700 border-amber-300',
    [UserStatus.BANNED]: 'bg-red-100 text-red-700 border-red-300',
    [UserStatus.DELETED]: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate proration amount for mid-cycle tier changes
 */
export function calculateProration(
  oldPriceMonthly: number,
  newPriceMonthly: number,
  daysRemaining: number,
  daysInCycle: number
): number {
  const unusedCreditFromOld = (daysRemaining / daysInCycle) * oldPriceMonthly;
  const proratedChargeForNew = (daysRemaining / daysInCycle) * newPriceMonthly;
  return Math.max(0, proratedChargeForNew - unusedCreditFromOld);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate credit utilization percentage
 */
export function calculateCreditUtilization(used: number, allocated: number): number {
  if (allocated === 0) return 0;
  return (used / allocated) * 100;
}

/**
 * Calculate MRR (Monthly Recurring Revenue) from subscriptions
 */
export function calculateMRR(subscriptions: Array<{ finalPriceUsd: number; billingCycle: string }>): number {
  return subscriptions.reduce((total, sub) => {
    const monthlyRevenue = sub.billingCycle === 'annual' ? sub.finalPriceUsd / 12 : sub.finalPriceUsd;
    return total + monthlyRevenue;
  }, 0);
}

/**
 * Calculate ARR (Annual Recurring Revenue) from MRR
 */
export function calculateARR(mrr: number): number {
  return mrr * 12;
}

/**
 * Calculate churn rate
 */
export function calculateChurnRate(startCount: number, _endCount: number, churned: number): number {
  if (startCount === 0) return 0;
  return (churned / startCount) * 100;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate credit amount (positive integer)
 */
export function isValidCreditAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/**
 * Validate date is in the future
 */
export function isFutureDate(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > Date.now();
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Group data by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by multiple keys
 */
export function sortBy<T>(array: T[], keys: Array<keyof T>, orders: Array<'asc' | 'desc'> = []): T[] {
  return [...array].sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const order = orders[i] || 'asc';
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate color from string (consistent hashing)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-red-100 text-red-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Download data as CSV
 */
export function downloadCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
