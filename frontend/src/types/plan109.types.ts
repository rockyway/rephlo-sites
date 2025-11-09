/**
 * Plan 109: Subscription Monetization System - TypeScript Types
 *
 * Type definitions for subscriptions, users, billing, credits, and analytics
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

// ============================================================================
// Enums
// ============================================================================

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PRO_MAX = 'pro_max',
  ENTERPRISE_PRO = 'enterprise_pro',
  ENTERPRISE_MAX = 'enterprise_max',
  PERPETUAL = 'perpetual',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DELETED = 'deleted',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

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
// Subscription Types
// ============================================================================

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;

  // Pricing
  basePriceUsd: number;
  discountPercentage?: number;
  finalPriceUsd: number;

  // Credit allocation
  monthlyCreditsAllocated: number;

  // Billing periods
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  trialEnd?: string;

  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentMethodId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelAtPeriodEnd: boolean;

  // Relations (populated)
  user?: User;
}

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

export interface SubscriptionStats {
  totalActive: number;
  mrr: number;
  pastDueCount: number;
  trialConversionsThisMonth: number;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  status: UserStatus;

  // Subscription info
  currentTier: SubscriptionTier;
  creditsBalance: number;

  // Timestamps
  createdAt: string;
  lastActiveAt?: string;
  suspendedUntil?: string;
  bannedAt?: string;
  banReason?: string;

  // Relations
  subscription?: Subscription;
}

export interface UserDetails extends User {
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

export interface UsageStats {
  totalApiCalls: number;
  creditsUsed: number;
  averageCallsPerDay: number;
  topModels: Array<{ modelName: string; calls: number }>;
}

// ============================================================================
// Billing Types
// ============================================================================

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;

  stripeInvoiceId: string;

  amountDue: number;
  amountPaid: number;
  amountRemaining: number;

  status: InvoiceStatus;

  invoicePdfUrl?: string;
  hostedInvoiceUrl?: string;

  periodStart: string;
  periodEnd: string;

  dueDate?: string;
  paidAt?: string;

  createdAt: string;

  // Relations
  user?: User;
}

export interface Transaction {
  id: string;
  userId: string;
  invoiceId?: string;

  stripePaymentIntentId: string;
  stripeChargeId?: string;

  amount: number;
  currency: string;

  status: TransactionStatus;

  paymentMethodType?: string;
  last4?: string;

  failureCode?: string;
  failureMessage?: string;

  createdAt: string;
  updatedAt: string;

  // Relations
  user?: User;
}

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
// Credit Types
// ============================================================================

export interface CreditAllocation {
  id: string;
  userId: string;
  subscriptionId?: string;

  amount: number;
  source: CreditAdjustmentType;

  allocatedAt: string;
  expiresAt?: string;

  createdAt: string;

  // Relations
  user?: User;
}

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
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
