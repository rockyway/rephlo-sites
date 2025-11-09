/**
 * Formatting utility functions for the admin dashboard
 */

/**
 * Format currency amount in USD cents to formatted string
 * @param cents - Amount in USD cents
 * @returns Formatted currency string (e.g., "$1,500")
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Format large numbers with K/M suffix
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1.2K", "5.3M")
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date to format (Date object or ISO string)
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}

/**
 * Format date to locale string
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Nov 9, 2025")
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format percentage with sign
 * @param value - Percentage value
 * @returns Formatted percentage string (e.g., "+12.5%", "-5.0%")
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
