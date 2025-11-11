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
  billing_cycle: 'monthly' | 'annual';
  monthly_credit_allocation: number;
  started_at: Date;
  ended_at: Date | null;
  next_billing_date: Date | null;
  monthly_price_usd: number;
}

export interface ProrationItem {
  id: string;
  from_tier: string;
  to_tier: string;
  from_price_usd: number;
  to_price_usd: number;
  proration_amount_usd: number;
  created_at: Date;
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
  device_name: string | null;
  device_id: string;
  activated_at: Date;
  last_seen_at: Date | null;
  status: 'active' | 'deactivated';
}

export interface LicenseItem {
  id: string;
  license_key: string;
  status: 'active' | 'pending' | 'revoked';
  purchase_price_usd: number;
  purchase_date: Date;
  activated_at: Date | null;
  eligible_until_version: string;
  device_activations: DeviceActivation[];
}

export interface UpgradeItem {
  id: string;
  from_version: string;
  to_version: string;
  upgrade_price_usd: number;
  upgrade_date: Date;
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
  allocated_at: Date;
}

export interface CreditUsageByModel {
  model: string;
  total_credits: number;
  request_count: number;
}

export interface CreditDeductionItem {
  id: string;
  amount: number;
  model_used: string;
  timestamp: Date;
}

export interface UserCreditsResponse {
  balance: {
    amount: number;
    last_updated: Date;
  };
  allocations: CreditAllocationItem[];
  usage: CreditUsageByModel[];
  deductions: CreditDeductionItem[];
  total_allocations: number;
  total_usage: number;
  total_deductions: number;
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
  discount_type: string;
  discount_value: number;
}

export interface CouponRedemptionItem {
  id: string;
  coupon: CouponInfo;
  redeemed_at: Date;
  discount_value_usd: number;
  subscription_tier_granted: string | null;
  perpetual_license_granted: boolean;
}

export interface FraudFlagItem {
  id: string;
  coupon_code: string;
  flag_reason: string;
  severity: 'low' | 'medium' | 'high';
  flagged_at: Date;
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
  stripe_invoice_id: string | null;
  amount_usd: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  created_at: Date;
  paid_at: Date | null;
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
