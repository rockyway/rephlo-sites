/**
 * Plan 110: Utility Functions
 *
 * Helper functions for perpetual licenses, version upgrades, and proration.
 */

import { LicenseStatus, ActivationStatus, ProrationChangeType, DiscountType } from '@/types/plan110.types';
import { SubscriptionTier } from '@/types/plan109.types';

// ============================================================================
// License Key Formatting
// ============================================================================

/**
 * Format a license key as REPHLO-XXXX-XXXX-XXXX-XXXX
 */
export function formatLicenseKey(key: string): string {
  // Remove existing hyphens
  const clean = key.replace(/-/g, '');

  // Add hyphens every 4 characters
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }

  return parts.join('-');
}

/**
 * Validate license key format
 */
export function isValidLicenseKey(key: string): boolean {
  const pattern = /^REPHLO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

// ============================================================================
// Version Parsing
// ============================================================================

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  original: string;
}

/**
 * Parse semantic version string
 */
export function parseSemVer(version: string): SemVer | null {
  const clean = version.replace(/^v/, ''); // Remove 'v' prefix
  const parts = clean.split('.');

  if (parts.length !== 3) return null;

  const [major, minor, patch] = parts.map(Number);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null;

  return { major, minor, patch, original: version };
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const parsed1 = parseSemVer(v1);
  const parsed2 = parseSemVer(v2);

  if (!parsed1 || !parsed2) return 0;

  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }

  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }

  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }

  return 0;
}

/**
 * Check if a version is eligible based on purchased version
 */
export function isVersionEligible(purchasedVersion: string, targetVersion: string): boolean {
  const purchased = parseSemVer(purchasedVersion);
  const target = parseSemVer(targetVersion);

  if (!purchased || !target) return false;

  // Eligible if same major version
  return purchased.major === target.major;
}

// ============================================================================
// Machine Fingerprint
// ============================================================================

/**
 * Format machine fingerprint to show last 8 characters
 */
export function formatMachineFingerprint(hash: string, showFull = false): string {
  if (showFull) return hash;
  if (hash.length <= 8) return hash;

  return `...${hash.slice(-8)}`;
}

/**
 * Copy full machine fingerprint to clipboard
 */
export async function copyMachineFingerprint(hash: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(hash);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

// ============================================================================
// License Status
// ============================================================================

/**
 * Get Tailwind color class for license status
 */
export function getLicenseStatusColor(status: LicenseStatus): string {
  switch (status) {
    case LicenseStatus.PENDING:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case LicenseStatus.ACTIVE:
      return 'text-green-600 bg-green-50 border-green-200';
    case LicenseStatus.SUSPENDED:
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case LicenseStatus.REVOKED:
      return 'text-red-600 bg-red-50 border-red-200';
    case LicenseStatus.EXPIRED:
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get human-readable license status label
 */
export function getLicenseStatusLabel(status: LicenseStatus): string {
  switch (status) {
    case LicenseStatus.PENDING:
      return 'Pending';
    case LicenseStatus.ACTIVE:
      return 'Active';
    case LicenseStatus.SUSPENDED:
      return 'Suspended';
    case LicenseStatus.REVOKED:
      return 'Revoked';
    case LicenseStatus.EXPIRED:
      return 'Expired';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// Device Status
// ============================================================================

/**
 * Get device status icon based on last seen date
 */
export function getDeviceStatusIcon(lastSeen: Date | string): string {
  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const daysSinceLastSeen = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastSeen < 7) return '🟢'; // Active
  if (daysSinceLastSeen < 30) return '🟡'; // Inactive
  return '🔴'; // Stale
}

/**
 * Get device status from last seen date
 */
export function getDeviceStatus(lastSeen: Date | string, isActive: boolean): ActivationStatus {
  if (!isActive) return ActivationStatus.DEACTIVATED;

  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const daysSinceLastSeen = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastSeen < 7) return ActivationStatus.ACTIVE;
  if (daysSinceLastSeen < 30) return ActivationStatus.INACTIVE;
  return ActivationStatus.STALE;
}

/**
 * Get device status color
 */
export function getDeviceStatusColor(status: ActivationStatus): string {
  switch (status) {
    case ActivationStatus.ACTIVE:
      return 'text-green-600';
    case ActivationStatus.INACTIVE:
      return 'text-yellow-600';
    case ActivationStatus.STALE:
      return 'text-red-600';
    case ActivationStatus.DEACTIVATED:
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

// ============================================================================
// Proration Calculations
// ============================================================================

interface ProrationResult {
  unusedCredit: number;
  newTierCost: number;
  netCharge: number;
}

/**
 * Calculate proration for tier change (client-side preview)
 */
export function calculateProration(
  currentPrice: number,
  newPrice: number,
  daysRemaining: number,
  totalDays: number
): ProrationResult {
  const unusedCredit = (daysRemaining / totalDays) * currentPrice;
  const newTierCost = (daysRemaining / totalDays) * newPrice;
  const netCharge = newTierCost - unusedCredit;

  return {
    unusedCredit: Math.round(unusedCredit * 100) / 100,
    newTierCost: Math.round(newTierCost * 100) / 100,
    netCharge: Math.round(netCharge * 100) / 100,
  };
}

// ============================================================================
// Proration Change Type
// ============================================================================

/**
 * Get proration change type badge color
 */
export function getProrationChangeTypeColor(type: ProrationChangeType): string {
  switch (type) {
    case ProrationChangeType.UPGRADE:
      return 'text-green-600 bg-green-50 border-green-200';
    case ProrationChangeType.DOWNGRADE:
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case ProrationChangeType.CANCELLATION:
      return 'text-red-600 bg-red-50 border-red-200';
    case ProrationChangeType.MIGRATION:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case ProrationChangeType.CYCLE_CHANGE:
      return 'text-purple-600 bg-purple-50 border-purple-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get proration change type icon
 */
export function getProrationChangeTypeIcon(type: ProrationChangeType): string {
  switch (type) {
    case ProrationChangeType.UPGRADE:
      return '↑';
    case ProrationChangeType.DOWNGRADE:
      return '↓';
    case ProrationChangeType.CANCELLATION:
      return '×';
    case ProrationChangeType.MIGRATION:
      return '↻';
    case ProrationChangeType.CYCLE_CHANGE:
      return '⟲';
    default:
      return '';
  }
}

/**
 * Get proration change type label
 */
export function getProrationChangeTypeLabel(type: ProrationChangeType): string {
  switch (type) {
    case ProrationChangeType.UPGRADE:
      return 'Upgrade';
    case ProrationChangeType.DOWNGRADE:
      return 'Downgrade';
    case ProrationChangeType.CANCELLATION:
      return 'Cancellation';
    case ProrationChangeType.MIGRATION:
      return 'Migration';
    case ProrationChangeType.CYCLE_CHANGE:
      return 'Billing Cycle Change';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// Net Charge Display
// ============================================================================

/**
 * Format net charge with color indicator
 */
export function formatNetCharge(amount: number): {
  formatted: string;
  color: string;
  sign: string;
} {
  const isPositive = amount > 0;
  const isZero = amount === 0;

  return {
    formatted: `$${Math.abs(amount).toFixed(2)}`,
    color: isZero ? 'text-gray-600' : isPositive ? 'text-green-600' : 'text-red-600',
    sign: isZero ? '' : isPositive ? '+' : '-',
  };
}

// ============================================================================
// Discount Type
// ============================================================================

/**
 * Get discount badge color
 */
export function getDiscountBadgeColor(type: DiscountType): string {
  switch (type) {
    case DiscountType.EARLY_BIRD:
      return 'text-green-600 bg-green-50 border-green-200';
    case DiscountType.LOYALTY:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case DiscountType.STANDARD:
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * Get discount label
 */
export function getDiscountLabel(type: DiscountType, percentage: number): string {
  switch (type) {
    case DiscountType.EARLY_BIRD:
      return `Early Bird ${percentage}%`;
    case DiscountType.LOYALTY:
      return `Loyalty ${percentage}%`;
    case DiscountType.STANDARD:
      return 'Standard Price';
    default:
      return `${percentage}% Off`;
  }
}

// ============================================================================
// Tier Name Display
// ============================================================================

/**
 * Get human-readable tier name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
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

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
