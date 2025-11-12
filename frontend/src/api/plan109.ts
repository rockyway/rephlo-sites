/**
 * Plan 109: Subscription Monetization API Client
 *
 * Centralized API client for all Plan 109 endpoints:
 * - Subscription management
 * - User management
 * - Billing and payments
 * - Credit management
 * - Platform analytics
 *
 * Reference: backend/src/routes/plan109.routes.ts
 */

import { apiClient } from '@/services/api';
import type {
  // Import shared types from shared-types package
  User,
  UserDetails,
  Subscription,
  SubscriptionStats,
  BillingInvoice,
  PaymentTransaction,
  CreditAllocation,
  UserCreditBalance,
} from '@rephlo/shared-types';
import type {
  // Keep plan109-specific types that don't exist in shared-types
  AdminUserDetails,
  SubscriptionFilters,
  UserFilters,
  InvoiceFilters,
  TransactionFilters,
  DunningAttempt,
  RevenueMetrics,
  RevenueByTier,
  CreditAdjustmentRequest,
  CreditUtilization,
  TopCreditConsumer,
  DashboardMetrics,
  UserDistribution,
  ConversionFunnel,
  RevenueTimeSeries,
  CreditsByModel,
  PaginatedResponse,
  TierChangeRequest,
  CancelSubscriptionRequest,
  SuspendUserRequest,
  BanUserRequest,
  RefundRequest,
  BulkUpdateUsersRequest,
  AnalyticsFilters,
} from '@/types/plan109.types';

// Type aliases for compatibility with existing code
type Invoice = BillingInvoice;
type Transaction = PaymentTransaction;
type CreditBalance = UserCreditBalance;

// ============================================================================
// Subscription Management API
// ============================================================================

export const subscriptionApi = {
  /**
   * Get all subscriptions with filters and pagination
   */
  getAllSubscriptions: async (filters?: SubscriptionFilters) => {
    const response = await apiClient.get<PaginatedResponse<Subscription>>(
      '/admin/subscriptions/all',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get subscription statistics for dashboard
   */
  getStats: async () => {
    const response = await apiClient.get<SubscriptionStats>(
      '/admin/subscriptions/stats'
    );
    return response.data;
  },

  /**
   * Get user's active subscription
   */
  getUserSubscription: async (userId: string) => {
    const response = await apiClient.get<Subscription>(
      `/admin/subscriptions/user/${userId}`
    );
    return response.data;
  },

  /**
   * Upgrade subscription tier
   */
  upgradeTier: async (subscriptionId: string, data: TierChangeRequest) => {
    const response = await apiClient.post<Subscription>(
      `/admin/subscriptions/${subscriptionId}/upgrade`,
      data
    );
    return response.data;
  },

  /**
   * Downgrade subscription tier
   */
  downgradeTier: async (subscriptionId: string, data: TierChangeRequest) => {
    const response = await apiClient.post<Subscription>(
      `/admin/subscriptions/${subscriptionId}/downgrade`,
      data
    );
    return response.data;
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (subscriptionId: string, data: CancelSubscriptionRequest) => {
    const response = await apiClient.post<Subscription>(
      `/admin/subscriptions/${subscriptionId}/cancel`,
      data
    );
    return response.data;
  },

  /**
   * Reactivate cancelled subscription
   */
  reactivateSubscription: async (subscriptionId: string) => {
    const response = await apiClient.post<Subscription>(
      `/admin/subscriptions/${subscriptionId}/reactivate`
    );
    return response.data;
  },

  /**
   * Allocate monthly credits for a subscription
   */
  allocateMonthlyCredits: async (subscriptionId: string) => {
    const response = await apiClient.post<CreditAllocation>(
      `/admin/subscriptions/${subscriptionId}/allocate-credits`
    );
    return response.data;
  },
};

// ============================================================================
// User Management API
// ============================================================================

export const userManagementApi = {
  /**
   * List users with filters and pagination
   */
  listUsers: async (filters?: UserFilters) => {
    const response = await apiClient.get<PaginatedResponse<User>>(
      '/admin/users',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Search users by email, name, or ID
   */
  searchUsers: async (query: string) => {
    const response = await apiClient.get<{ users: User[] }>(
      '/admin/users/search',
      { params: { q: query } }
    );
    return response.data;
  },

  /**
   * Get detailed user information
   */
  getUserDetails: async (userId: string) => {
    const response = await apiClient.get<AdminUserDetails>(
      `/admin/users/${userId}`
    );
    return response.data;
  },

  /**
   * Update user profile
   */
  updateUser: async (userId: string, updates: Partial<User>) => {
    const response = await apiClient.patch<User>(
      `/admin/users/${userId}`,
      updates
    );
    return response.data;
  },

  /**
   * Suspend user account
   */
  suspendUser: async (data: SuspendUserRequest) => {
    const response = await apiClient.post<User>(
      `/admin/users/${data.userId}/suspend`,
      { reason: data.reason, duration: data.duration }
    );
    return response.data;
  },

  /**
   * Unsuspend user account
   */
  unsuspendUser: async (userId: string) => {
    const response = await apiClient.post<User>(
      `/admin/users/${userId}/unsuspend`
    );
    return response.data;
  },

  /**
   * Ban user account
   */
  banUser: async (data: BanUserRequest) => {
    const response = await apiClient.post<User>(
      `/admin/users/${data.userId}/ban`,
      { reason: data.reason, permanent: data.permanent }
    );
    return response.data;
  },

  /**
   * Unban user account
   */
  unbanUser: async (userId: string) => {
    const response = await apiClient.post<User>(
      `/admin/users/${userId}/unban`
    );
    return response.data;
  },

  /**
   * Bulk update users
   */
  bulkUpdateUsers: async (data: BulkUpdateUsersRequest) => {
    const response = await apiClient.post<{ updated: number; errors: string[] }>(
      '/admin/users/bulk-update',
      data
    );
    return response.data;
  },

  /**
   * Manually adjust user credits
   */
  adjustCredits: async (userId: string, data: CreditAdjustmentRequest) => {
    const response = await apiClient.post<CreditAllocation>(
      `/admin/users/${userId}/adjust-credits`,
      data
    );
    return response.data;
  },
};

// ============================================================================
// Billing & Payments API
// ============================================================================

export const billingApi = {
  /**
   * Get upcoming invoice for user
   */
  getUpcomingInvoice: async (userId: string) => {
    const response = await apiClient.get<Invoice>(
      `/admin/billing/invoices/upcoming/${userId}`
    );
    return response.data;
  },

  /**
   * List invoices with filters
   */
  listInvoices: async (userId?: string, filters?: InvoiceFilters) => {
    const endpoint = userId
      ? `/admin/billing/invoices/${userId}`
      : '/admin/billing/invoices';
    const response = await apiClient.get<PaginatedResponse<Invoice>>(
      endpoint,
      { params: filters }
    );
    return response.data;
  },

  /**
   * List transactions with filters
   */
  listTransactions: async (userId?: string, filters?: TransactionFilters) => {
    const endpoint = userId
      ? `/admin/billing/transactions/${userId}`
      : '/admin/billing/transactions';
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      endpoint,
      { params: filters }
    );
    return response.data;
  },

  /**
   * Refund transaction
   */
  refundTransaction: async (transactionId: string, data: RefundRequest) => {
    const response = await apiClient.post<Transaction>(
      `/admin/billing/transactions/${transactionId}/refund`,
      data
    );
    return response.data;
  },

  /**
   * Get dunning attempts (failed payments)
   */
  getDunningAttempts: async () => {
    const response = await apiClient.get<{ attempts: DunningAttempt[] }>(
      '/admin/billing/dunning'
    );
    return response.data;
  },

  /**
   * Retry failed payment
   */
  retryPayment: async (attemptId: string) => {
    const response = await apiClient.post<DunningAttempt>(
      `/admin/billing/dunning/${attemptId}/retry`
    );
    return response.data;
  },

  /**
   * Get revenue metrics
   */
  getRevenueMetrics: async (filters?: AnalyticsFilters) => {
    const response = await apiClient.get<RevenueMetrics>(
      '/admin/analytics/revenue',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get revenue breakdown by tier
   */
  getRevenueByTier: async (filters?: AnalyticsFilters) => {
    const response = await apiClient.get<{ tiers: RevenueByTier[] }>(
      '/admin/analytics/revenue/by-tier',
      { params: filters }
    );
    return response.data;
  },
};

// ============================================================================
// Credit Management API
// ============================================================================

export const creditApi = {
  /**
   * Get credit balance for user
   */
  getCreditBalance: async (userId: string) => {
    const response = await apiClient.get<CreditBalance>(
      `/admin/credits/balance/${userId}`
    );
    return response.data;
  },

  /**
   * Get credit allocation history
   */
  getCreditHistory: async (userId: string, page = 1, limit = 50) => {
    const response = await apiClient.get<PaginatedResponse<CreditAllocation>>(
      `/admin/credits/history/${userId}`,
      { params: { page, limit } }
    );
    return response.data;
  },

  /**
   * Get credit usage by period
   */
  getCreditUsage: async (userId: string, startDate: string, endDate: string) => {
    const response = await apiClient.get<{ usage: number; breakdown: CreditsByModel[] }>(
      `/admin/credits/usage/${userId}`,
      { params: { startDate, endDate } }
    );
    return response.data;
  },

  /**
   * Grant bonus credits
   */
  grantBonusCredits: async (data: CreditAdjustmentRequest) => {
    const response = await apiClient.post<CreditAllocation>(
      '/admin/credits/grant-bonus',
      data
    );
    return response.data;
  },

  /**
   * Process monthly credit allocations (cron job)
   */
  processMonthlyAllocations: async () => {
    const response = await apiClient.post<{ processed: number }>(
      '/admin/credits/process-monthly'
    );
    return response.data;
  },

  /**
   * Get credit utilization by tier
   */
  getCreditUtilizationByTier: async (filters?: AnalyticsFilters) => {
    const response = await apiClient.get<{ tiers: CreditUtilization[] }>(
      '/admin/analytics/credit-utilization',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get top credit consumers
   */
  getTopCreditConsumers: async (limit = 10, filters?: AnalyticsFilters) => {
    const response = await apiClient.get<{ consumers: TopCreditConsumer[] }>(
      '/admin/analytics/top-credit-consumers',
      { params: { limit, ...filters } }
    );
    return response.data;
  },
};

// ============================================================================
// Platform Analytics API
// ============================================================================

export const analyticsApi = {
  /**
   * Get dashboard summary metrics
   */
  getDashboardMetrics: async () => {
    const response = await apiClient.get<DashboardMetrics>(
      '/admin/analytics/dashboard'
    );
    return response.data;
  },

  /**
   * Get Monthly Recurring Revenue (MRR)
   */
  getMRR: async () => {
    const response = await apiClient.get<{ mrr: number; growth: number }>(
      '/admin/analytics/revenue/mrr'
    );
    return response.data;
  },

  /**
   * Get Annual Recurring Revenue (ARR)
   */
  getARR: async () => {
    const response = await apiClient.get<{ arr: number }>(
      '/admin/analytics/revenue/arr'
    );
    return response.data;
  },

  /**
   * Get total active users
   */
  getTotalActiveUsers: async () => {
    const response = await apiClient.get<{ total: number; growth: number }>(
      '/admin/analytics/users/total'
    );
    return response.data;
  },

  /**
   * Get user distribution by tier
   */
  getUsersByTier: async () => {
    const response = await apiClient.get<{ distribution: UserDistribution[] }>(
      '/admin/analytics/users/by-tier'
    );
    return response.data;
  },

  /**
   * Get churn rate
   */
  getChurnRate: async (period = 'monthly') => {
    const response = await apiClient.get<{ churnRate: number; period: string }>(
      '/admin/analytics/churn-rate',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get conversion rate (free to pro)
   */
  getConversionRate: async () => {
    const response = await apiClient.get<{ conversionRate: number }>(
      '/admin/analytics/conversion-rate'
    );
    return response.data;
  },

  /**
   * Get conversion funnel data
   * @param period - '7d' | '30d' | '90d' | '1y' (default: '30d')
   */
  getConversionFunnel: async (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
    try {
      const response = await apiClient.get<{
        stages: { name: string; count: number; percentage: number; conversionRate?: number }[];
        period: string;
      }>('/admin/analytics/revenue/funnel', { params: { period } });

      // Validate response structure
      if (!response.data || !response.data.stages || !Array.isArray(response.data.stages)) {
        throw new Error('Invalid response format from conversion funnel endpoint');
      }

      // Transform backend response to frontend format
      const funnel: ConversionFunnel[] = response.data.stages.map(stage => ({
        stage: stage.name,
        count: stage.count,
        conversionRate: stage.conversionRate ?? 100, // Default to 100 for first stage
      }));

      return { funnel };
    } catch (error: any) {
      // Handle Axios errors gracefully
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        const message = typeof backendError === 'string'
          ? backendError
          : backendError.message || 'Failed to fetch conversion funnel';
        throw new Error(message);
      } else if (error.message) {
        throw new Error(`Conversion funnel error: ${error.message}`);
      } else {
        throw new Error('Failed to fetch conversion funnel data');
      }
    }
  },

  /**
   * Get revenue time series (trend data)
   * @param period - '7d' | '30d' | '90d' | '1y' (default: '1y')
   */
  getRevenueTimeSeries: async (period: '7d' | '30d' | '90d' | '1y' = '1y') => {
    try {
      const response = await apiClient.get<{
        data: Array<{
          date: string;
          totalRevenue: number;
          subscriptionRevenue: number;
          perpetualRevenue: number;
        }>;
      }>('/admin/analytics/revenue/trend', { params: { period } });

      // Validate response structure
      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from revenue trend endpoint');
      }

      // Transform backend response to frontend format
      const timeSeries: RevenueTimeSeries[] = response.data.data.map((item) => ({
        month: item.date,
        mrr: item.subscriptionRevenue / 100, // Convert cents to dollars
        arr: (item.subscriptionRevenue * 12) / 100, // Annualized
        growth: 0, // TODO: Calculate growth from previous period
      }));

      return { timeSeries };
    } catch (error: any) {
      // Handle Axios errors gracefully
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        const message = typeof backendError === 'string'
          ? backendError
          : backendError.message || 'Failed to fetch revenue trend';
        throw new Error(message);
      } else if (error.message) {
        throw new Error(`Revenue trend error: ${error.message}`);
      } else {
        throw new Error('Failed to fetch revenue trend data');
      }
    }
  },

  /**
   * Get tier transitions (upgrades/downgrades)
   * NOTE: This endpoint is not yet implemented on the backend
   * Returns empty array for now
   */
  getTierTransitions: async (_filters?: AnalyticsFilters) => {
    // Backend endpoint doesn't exist yet - return empty array
    return { transitions: [] };
  },

  /**
   * Get credits used by model
   * @param period - '7d' | '30d' | '90d' | '1y' (default: '30d')
   * @param limit - Maximum number of models to return (default: 10)
   */
  getCreditsByModel: async (period: '7d' | '30d' | '90d' | '1y' = '30d', limit = 10) => {
    try {
      const response = await apiClient.get<{
        data: Array<{
          model: string;
          credits: number;
          requests: number;
          revenue_contribution: number;
        }>;
      }>('/admin/analytics/revenue/credit-usage', { params: { period, limit } });

      // Validate response structure
      if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from credit usage endpoint');
      }

      // Calculate total credits for percentage
      const totalCredits = response.data.data.reduce((sum, item) => sum + item.credits, 0);

      // Transform backend response to frontend format
      const models: CreditsByModel[] = response.data.data.map((item) => ({
        modelName: item.model,
        creditsUsed: item.credits,
        percentage: totalCredits > 0 ? (item.credits / totalCredits) * 100 : 0,
      }));

      return { models };
    } catch (error: any) {
      // Handle Axios errors gracefully
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        const message = typeof backendError === 'string'
          ? backendError
          : backendError.message || 'Failed to fetch credit usage';
        throw new Error(message);
      } else if (error.message) {
        throw new Error(`Credit usage error: ${error.message}`);
      } else {
        throw new Error('Failed to fetch credit usage data');
      }
    }
  },
};

// ============================================================================
// Combined Export
// ============================================================================

export const plan109Api = {
  subscriptions: subscriptionApi,
  users: userManagementApi,
  billing: billingApi,
  credits: creditApi,
  analytics: analyticsApi,
};

export default plan109Api;
