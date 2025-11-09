/**
 * Plan 110: Perpetual Licensing & Proration Types
 *
 * TypeScript interfaces for perpetual licenses, version upgrades,
 * proration events, and migration operations.
 *
 * Reference: backend/src/routes/plan110.routes.ts
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { SubscriptionTier } from './plan109.types';

// ============================================================================
// Enums
// ============================================================================

export enum LicenseStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum ActivationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  STALE = 'stale',
  DEACTIVATED = 'deactivated',
}

export enum UpgradeStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum ProrationChangeType {
  UPGRADE = 'upgrade',
  DOWNGRADE = 'downgrade',
  CYCLE_CHANGE = 'interval_change',
  MIGRATION = 'migration',
  CANCELLATION = 'cancellation',
}

export enum ProrationStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

export enum DiscountType {
  EARLY_BIRD = 'early_bird',
  LOYALTY = 'loyalty',
  STANDARD = 'standard',
}

// ============================================================================
// Perpetual License Types
// ============================================================================

export interface PerpetualLicense {
  id: string;
  userId: string;
  licenseKey: string;
  status: LicenseStatus;

  // Purchase details
  purchaseDate: string;
  purchasePrice: number; // in dollars

  // Version eligibility
  eligibleMajorVersion: number;
  eligibleUntilVersion: string;
  purchasedVersion: string;

  // Activation limits
  maxActivations: number;
  currentActivations: number;

  // User details (populated)
  user?: {
    id: string;
    email: string;
    name?: string;
  };

  // Metadata
  createdAt: string;
  revokedAt?: string;
  revokeReason?: string;
  supportExpiresAt?: string;
}

export interface LicenseActivation {
  id: string;
  licenseId: string;

  machineFingerprint: string;
  machineName?: string;
  osVersion?: string;

  activatedAt: string;
  lastSeenAt: string;
  deactivatedAt?: string;

  ipAddress?: string;

  isActive: boolean;
  status: ActivationStatus;
}

export interface VersionUpgrade {
  id: string;
  licenseId: string;
  userId: string;

  fromVersion: string;
  toVersion: string;
  upgradeType: 'major' | 'minor' | 'patch';

  upgradePrice: number; // in dollars
  discountApplied?: number; // discount percentage
  discountType?: DiscountType;
  finalPrice: number;

  purchaseDate: string;
  status: UpgradeStatus;

  stripePaymentId?: string;
  receiptUrl?: string;
}

export interface LicenseStats {
  totalActive: number;
  totalRevenue: number;
  avgDevicesPerLicense: number;
  licensesAtMaxCapacity: number;
  licensesAtMaxCapacityPercentage: number;
}

// ============================================================================
// Proration Types
// ============================================================================

export interface ProrationEvent {
  id: string;
  userId: string;
  subscriptionId: string;

  eventType: ProrationChangeType;

  // Tier changes
  fromTier?: SubscriptionTier;
  toTier?: SubscriptionTier;

  // Billing cycle changes
  fromInterval?: 'monthly' | 'annual';
  toInterval?: 'monthly' | 'annual';

  // Proration calculation
  daysInPeriod: number;
  daysUsed: number;
  daysRemaining: number;
  unusedCredit: number; // in dollars
  newTierCost: number; // in dollars
  netCharge: number; // positive = charge, negative = refund

  // Dates
  periodStart: string;
  periodEnd: string;
  changeDate: string;
  effectiveDate: string;
  nextBillingDate: string;

  status: ProrationStatus;

  // Stripe integration
  stripeInvoiceId?: string;

  // User details (populated)
  user?: {
    email: string;
  };

  createdAt: string;
}

export interface ProrationStats {
  totalProrations: number;
  netRevenue: number;
  avgNetCharge: number;
  pendingProrations: number;
}

export interface ProrationPreview {
  currentTier: SubscriptionTier;
  newTier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';

  daysRemaining: number;
  unusedCredit: number;
  newTierCost: number;
  netCharge: number;

  effectiveDate: string;
  nextBillingDate: string;
}

export interface ProrationCalculationBreakdown {
  originalTier: SubscriptionTier;
  originalPrice: number;
  newTier: SubscriptionTier;
  newPrice: number;

  billingCycle: number; // total days
  changeDate: string;
  daysRemaining: number;

  steps: {
    unusedCredit: {
      calculation: string;
      amount: number;
    };
    newTierCost: {
      calculation: string;
      amount: number;
    };
    netCharge: {
      calculation: string;
      amount: number;
    };
  };

  stripeInvoiceUrl?: string;
  status: ProrationStatus;
}

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationEligibility {
  canMigrateToPerpetual: boolean;
  canMigrateToSubscription: boolean;

  tradeInValue?: number;
  migrationCredit?: number;

  reasons: string[];
}

export interface MigrationHistory {
  id: string;
  userId: string;

  fromType: 'perpetual' | 'subscription';
  toType: 'perpetual' | 'subscription';

  fromTier?: SubscriptionTier;
  toTier?: SubscriptionTier;

  tradeInValue?: number;
  migrationCredit?: number;

  migratedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface LicenseFilters {
  status?: LicenseStatus;
  search?: string; // license key, user email, user ID
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ProrationFilters {
  changeType?: ProrationChangeType;
  status?: ProrationStatus;
  startDate?: string;
  endDate?: string;
  search?: string; // user email, subscription ID
  page?: number;
  limit?: number;
}

export interface SuspendLicenseRequest {
  licenseId: string;
  reason: string;
}

export interface RevokeLicenseRequest {
  licenseId: string;
  reason: string;
}

export interface ReverseProrationRequest {
  prorationId: string;
  reason: string;
}

export interface ProrationPreviewRequest {
  subscriptionId: string;
  newTier: SubscriptionTier;
}

export interface UpgradeWithProrationRequest {
  subscriptionId: string;
  newTier: SubscriptionTier;
}

export interface DowngradeWithProrationRequest {
  subscriptionId: string;
  newTier: SubscriptionTier;
}

export interface PurchaseLicenseRequest {
  price: number;
  version: string;
}

export interface ActivateDeviceRequest {
  licenseKey: string;
  machineFingerprint: string;
  machineName?: string;
  osVersion?: string;
}

export interface ReplaceDeviceRequest {
  activationId: string;
  newMachineFingerprint: string;
  newMachineName?: string;
}

// ============================================================================
// Paginated Response
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface UpgradeConversionMetrics {
  totalUpgrades: number;
  conversionRate: number; // percentage
  avgUpgradePrice: number;
  earlyBirdCount: number;
  loyaltyCount: number;

  byVersion: {
    fromVersion: string;
    toVersion: string;
    count: number;
    revenue: number;
  }[];
}

export interface ProrationRevenueBreakdown {
  upgrades: {
    count: number;
    revenue: number;
  };
  downgrades: {
    count: number;
    cost: number; // negative
  };
  net: number;
}

export interface TierChangePath {
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier;
  count: number;
  percentage: number;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ProrationRevenueTimeSeries {
  month: string;
  upgradesRevenue: number;
  downgradesCost: number;
  net: number;
}

export interface UpgradeDistribution {
  type: 'Upgrades' | 'Downgrades';
  count: number;
  percentage: number;
  revenue: number;
}
