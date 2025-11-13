/**
 * Admin User Detail Types
 *
 * TypeScript type definitions for Unified User Detail API endpoints.
 * Defines request/response structures for 7 tabs showing comprehensive user information.
 *
 * @module types/admin-user-detail.types
 */

// =============================================================================
// User Overview Types (Endpoint 1)
// =============================================================================

export interface UserOverviewQuery {
  // No query parameters needed
}

export interface UserOverviewUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  lastLogin: Date | null;
  status: 'active' | 'suspended' | 'banned';
}

export interface CurrentSubscription {
  id: string;
  tier: string;
  status: string;
  billingCycle: 'monthly' | 'annual';
  creditAllocation: number;
  nextBillingDate: Date | null;
  startedAt: Date;
}

export interface CurrentLicense {
  id: string;
  licenseKey: string;
  status: 'active' | 'pending' | 'revoked';
  activatedAt: Date | null;
  deviceCount: number;
  maxDevices: number;
}

export interface UserOverviewResponse {
  user: UserOverviewUser;
  currentSubscription: CurrentSubscription | null;
  currentLicense: CurrentLicense | null;
  creditBalance: number;
  stats: {
    totalSubscriptions: number;
    totalLicenses: number;
    creditsConsumed: number;
    couponsRedeemed: number;
  };
}

// =============================================================================
// User Subscriptions Types (Endpoint 2)
// =============================================================================

export interface UserSubscriptionsQuery {
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}

export interface SubscriptionItem {
  id: string;
  tier: string;
  status: string;
  billingCycle: 'monthly' | 'annual';
  monthlyCreditAllocation: number;
  startedAt: Date;
  endedAt: Date | null;
  nextBillingDate: Date | null;
  monthlyPriceUsd: number;
}

export interface ProrationItem {
  id: string;
  fromTier: string;
  toTier: string;
  fromPriceUsd: number;
  toPriceUsd: number;
  prorationAmountUsd: number;
  createdAt: Date;
}

export interface UserSubscriptionsResponse {
  subscriptions: SubscriptionItem[];
  prorations: ProrationItem[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// User Licenses Types (Endpoint 3)
// =============================================================================

export interface UserLicensesQuery {
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}

export interface DeviceActivation {
  id: string;
  deviceName: string | null;
  deviceId: string;
  activatedAt: Date;
  lastSeenAt: Date | null;
  status: 'active' | 'deactivated';
}

export interface LicenseItem {
  id: string;
  licenseKey: string;
  status: 'active' | 'pending' | 'revoked';
  purchasePriceUsd: number;
  purchaseDate: Date;
  activatedAt: Date | null;
  eligibleUntilVersion: string;
  deviceActivations: DeviceActivation[];
}

export interface UpgradeItem {
  id: string;
  fromVersion: string;
  toVersion: string;
  upgradePriceUsd: number;
  upgradeDate: Date;
}

export interface UserLicensesResponse {
  licenses: LicenseItem[];
  upgrades: UpgradeItem[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// User Credits Types (Endpoint 4)
// =============================================================================

export interface UserCreditsQuery {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: '30d'
  limit?: number; // Default: 100
  offset?: number; // Default: 0
}

export interface CreditAllocationItem {
  id: string;
  amount: number;
  source: 'subscription' | 'bonus' | 'admin_grant' | 'referral' | 'coupon';
  reason: string | null;
  allocatedAt: Date;
}

export interface CreditUsageByModel {
  model: string;
  totalCredits: number;
  requestCount: number;
}

export interface CreditDeductionItem {
  id: string;
  amount: number;
  modelUsed: string;
  timestamp: Date;
}

export interface UserCreditsResponse {
  balance: {
    amount: number;
    lastUpdated: Date;
  };
  allocations: CreditAllocationItem[];
  usage: CreditUsageByModel[];
  deductions: CreditDeductionItem[];
  totalAllocations: number;
  totalUsage: number;
  totalDeductions: number;
}

// =============================================================================
// User Coupons Types (Endpoint 5)
// =============================================================================

export interface UserCouponsQuery {
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}

export interface CouponInfo {
  code: string;
  type: string;
  discountType: string;
  discountValue: number;
}

export interface CouponRedemptionItem {
  id: string;
  coupon: CouponInfo;
  redeemedAt: Date;
  discountValueUsd: number;
  subscriptionTierGranted: string | null;
  perpetualLicenseGranted: boolean;
}

export interface FraudFlagItem {
  id: string;
  couponCode: string;
  flagReason: string;
  severity: 'low' | 'medium' | 'high';
  flaggedAt: Date;
}

export interface UserCouponsResponse {
  redemptions: CouponRedemptionItem[];
  fraudFlags: FraudFlagItem[];
  totalDiscountValue: number;
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// User Payments Types (Endpoint 6)
// =============================================================================

export interface UserPaymentsQuery {
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}

export interface InvoiceItem {
  id: string;
  stripeInvoiceId: string | null;
  amountUsd: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PaymentMethod {
  type: 'card' | 'bank_account' | null;
  last4: string | null;
  brand: string | null;
}

export interface UserPaymentsResponse {
  invoices: InvoiceItem[];
  paymentMethod: PaymentMethod | null;
  stripeCustomerId: string | null;
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// User Activity Types (Endpoint 7)
// =============================================================================

export interface UserActivityQuery {
  type?: 'subscription' | 'license' | 'coupon' | 'credit' | 'device' | 'all'; // Default: 'all'
  limit?: number; // Default: 50
  offset?: number; // Default: 0
}

export type UserActivityType = 'subscription' | 'license' | 'coupon' | 'credit' | 'device';

export interface UserActivityItem {
  id: string;
  type: UserActivityType;
  action: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface UserActivityResponse {
  activities: UserActivityItem[];
  total: number;
  limit: number;
  offset: number;
}
