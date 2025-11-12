/**
 * Plan 109: Subscription Monetization System - TypeScript Types
 *
 * Type definitions for subscriptions, users, billing, credits, and analytics
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

// Import shared types from @rephlo/shared-types
import type {
  User,
  Subscription,
  SubscriptionStats,
  BillingInvoice as Invoice,
  PaymentTransaction as Transaction,
  CreditAllocation,
  UsageStats,
  PaginationData,
} from '@rephlo/shared-types';

// Import enums as runtime values (not type-only)
import {
  UserStatus,
  SubscriptionTier,
  SubscriptionStatus,
  BillingCycle,
  InvoiceStatus,
  PaymentStatus,
  CreditSource,
} from '@rephlo/shared-types';

// Re-export commonly used types for convenience
export type {
  User,
  Subscription,
  SubscriptionStats,
  UsageStats,
  PaginationData,
};

// Re-export enums as values (not types)
export {
  UserStatus,
  SubscriptionTier,
  SubscriptionStatus,
  BillingCycle,
  InvoiceStatus,
  PaymentStatus,
  CreditSource,
};

// Re-export with alias for backward compatibility
export type { Invoice, Transaction };

// Frontend-specific enum for transaction status (if needed beyond PaymentStatus)
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Frontend-specific credit adjustment type (extends CreditSource)
export enum CreditAdjustmentType {
  SUBSCRIPTION = 'subscription',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  COUPON = 'coupon',
  REFUND = 'refund',
  ADMIN_ADD = 'admin_add',
  ADMIN_REMOVE = 'admin_remove',
}

// ============================================================================
// Subscription Types (using shared-types)
// ============================================================================
// Subscription interface imported from shared-types

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  billingInterval: BillingCycle;
  priceCents: number;
  creditsPerMonth: number;
  creditsRollover: boolean;
  maxRollover?: number;
  rolloverMonths?: number;
  maxApiCalls?: number;
  maxConcurrent?: number;
  rateLimit?: number;
  features: string[];
  stripePriceId: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// SubscriptionStats imported from shared-types

// ============================================================================
// User Types (using shared-types)
// ============================================================================
// User interface imported from shared-types

// Frontend-specific UserDetails extension
// Renamed to AdminUserDetails to avoid conflict with shared-types UserDetails
export interface AdminUserDetails extends User {
  subscriptionHistory: Subscription[];
  creditTransactions: CreditAllocation[];
  usageStats: UsageStats;
}

export interface UserFilters {
  status?: UserStatus;
  tier?: SubscriptionTier;
  search?: string;
  page?: number;
  limit?: number;
}

// UsageStats imported from shared-types (with extended topModels field in frontend)

// ============================================================================
// Billing Types (using shared-types)
// ============================================================================
// Invoice and Transaction (BillingInvoice, PaymentTransaction) imported from shared-types
// Note: Invoice = BillingInvoice, Transaction = PaymentTransaction (aliased for backward compatibility)

export interface DunningAttempt {
  id: string;
  subscriptionId: string;
  invoiceId: string;

  attemptNumber: number;
  retryAt: string;
  status: 'scheduled' | 'attempted' | 'succeeded' | 'failed' | 'exhausted';

  errorMessage?: string;

  createdAt: string;
  attemptedAt?: string;

  // Relations
  subscription?: Subscription;
  invoice?: Invoice;
}

export interface RevenueMetrics {
  totalMRR: number;
  totalARR: number;
  avgRevenuePerUser: number;
  totalRevenueThisMonth: number;
  mrrGrowth: number; // Month-over-month percentage
}

export interface RevenueByTier {
  tier: SubscriptionTier;
  revenue: number;
  percentage: number;
  subscriberCount: number;
}

// ============================================================================
// Credit Types (using shared-types)
// ============================================================================
// CreditAllocation imported from shared-types

export interface CreditAdjustmentRequest {
  userId: string;
  amount: number;
  reason: string;
  expiresAt?: string;
}

export interface CreditBalance {
  userId: string;
  totalCredits: number;
  subscriptionCredits: number;
  bonusCredits: number;
  rolloverCredits: number;
  expiringCredits: number;
  expiringAt?: string;
}

export interface CreditUtilization {
  tier: SubscriptionTier;
  allocated: number;
  used: number;
  utilizationPercent: number;
  userCount: number;
}

export interface TopCreditConsumer {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
  creditsUsed: number;
  percentOfAllocation: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface DashboardMetrics {
  // Revenue
  mrr: number;
  arr: number;
  mrrGrowth: number;

  // Users
  totalActiveUsers: number;
  userGrowth: number;

  // Churn
  monthlyChurnRate: number;
  trialConversionRate: number;

  // Credits
  avgCreditUtilization: number;
}

export interface UserDistribution {
  tier: SubscriptionTier;
  count: number;
  percentage: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface RevenueTimeSeries {
  month: string;
  mrr: number;
  arr: number;
  growth: number;
}

export interface CreditsByModel {
  modelName: string;
  creditsUsed: number;
  percentage: number;
}

export interface TierTransition {
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier;
  count: number;
  type: 'upgrade' | 'downgrade';
}

// ============================================================================
// API Response Types (using shared-types)
// ============================================================================
// ApiResponse and PaginationData imported from shared-types

// Frontend-specific paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface TierChangeRequest {
  subscriptionId: string;
  newTier: SubscriptionTier;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  reason?: string;
}

export interface SuspendUserRequest {
  userId: string;
  reason: string;
  duration?: number; // days, null = indefinite
}

export interface BanUserRequest {
  userId: string;
  reason: string;
  permanent: boolean;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number; // partial refund
  reason: string;
}

export interface BulkUpdateUsersRequest {
  userIds: string[];
  updates: {
    tier?: SubscriptionTier;
    status?: UserStatus;
    creditsToAdd?: number;
  };
}

// ============================================================================
// Filter Types
// ============================================================================

export interface SubscriptionFilters {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AnalyticsFilters {
  period?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_12_months';
  startDate?: string;
  endDate?: string;
}
