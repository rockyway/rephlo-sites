import { apiClient } from '@/services/api';
import type {
  ModelTierInfo,
  ModelTierUpdateRequest,
  ModelTierFilters,
  ModelTierListResponse,
  AuditLogResponse,
} from '@/types/model-tier';
import type {
  ModelInfo,
  ModelMeta,
  LifecycleEvent,
  CreateModelRequest,
  MarkLegacyRequest,
  LifecycleHistoryResponse,
  LegacyModelsResponse,
  ArchivedModelsResponse,
} from '@/types/model-lifecycle';
import type {
  User,
  Subscription,
} from '@rephlo/shared-types';

// ============================================================================
// Dashboard Analytics Types
// ============================================================================

export interface KPIChange {
  value: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface KPIMetric {
  value: number;
  change?: KPIChange;
}

export interface TotalRevenueMetric extends KPIMetric {
  breakdown: {
    mrr: number;
    perpetual: number;
    upgrades: number;
  };
}

export interface CouponRedemptionsMetric extends KPIMetric {
  totalDiscount: number;
}

export interface DashboardKPIsResponse {
  totalRevenue: TotalRevenueMetric;
  activeUsers: KPIMetric;
  creditsConsumed: KPIMetric;
  couponRedemptions: CouponRedemptionsMetric;
}

export interface ActivityEvent {
  id: string;
  type: 'subscription' | 'license' | 'coupon' | 'credit' | 'device';
  action: string;
  description: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface RecentActivityResponse {
  events: ActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Admin API Client for Model Tier Management
 *
 * Provides methods for:
 * - Listing models with tier information
 * - Updating individual model tiers
 * - Bulk tier updates
 * - Fetching audit logs
 * - Reverting tier changes
 */
export const adminAPI = {
  /**
   * List all models with tier information
   * @param filters - Optional filters for provider, tier, restriction mode
   * @param page - Page number (0-indexed)
   * @param pageSize - Number of items per page
   */
  listModelsWithTiers: async (
    filters?: ModelTierFilters,
    page = 0,
    pageSize = 50
  ): Promise<ModelTierListResponse> => {
    const params = {
      ...filters,
      page,
      pageSize,
    };
    const response = await apiClient.get<{ status: string; data: ModelTierListResponse }>(
      '/admin/models/tiers',
      { params }
    );
    return response.data.data; // Unwrap nested data
  },

  /**
   * Get single model tier information
   * @param modelId - Model ID
   */
  getModelTier: async (modelId: string): Promise<ModelTierInfo> => {
    const response = await apiClient.get<{ status: string; data: ModelTierInfo }>(
      `/admin/models/${modelId}/tier`
    );
    return response.data.data; // Unwrap nested data
  },

  /**
   * Update a single model's tier configuration
   * @param modelId - Model ID
   * @param data - Tier update data
   */
  updateModelTier: async (
    modelId: string,
    data: ModelTierUpdateRequest
  ): Promise<ModelTierInfo> => {
    const response = await apiClient.patch<{
      status: string;
      data: ModelTierInfo;
      meta?: { auditLog: any };
    }>(
      `/admin/models/${modelId}/tier`,
      data
    );
    // Backend returns flat data
    return response.data.data;
  },

  /**
   * Bulk update multiple models' tier configurations
   * @param updates - Array of model IDs and their updates
   * @param reason - Optional reason for bulk change
   */
  bulkUpdateTiers: async (
    modelIds: string[],
    updates: ModelTierUpdateRequest,
    reason?: string
  ): Promise<{ updated: number; models: ModelTierInfo[] }> => {
    const response = await apiClient.post<{
      status: string;
      data: { updated: number; models: ModelTierInfo[] };
    }>('/admin/models/tiers/bulk', {
      modelIds,
      updates,
      reason,
    });
    return response.data.data; // Unwrap nested data
  },

  /**
   * Get audit logs for tier changes
   * @param params - Filter parameters
   */
  getAuditLogs: async (params?: {
    modelId?: string;
    adminUserId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AuditLogResponse> => {
    const response = await apiClient.get<{
      status: string;
      data: {
        logs: Array<{
          id: string;
          modelId: string;
          adminUserId: string;
          adminEmail?: string;
          changeType: string;
          previousValue: any;
          newValue: any;
          reason?: string;
          createdAt: string;
        }>;
        total: number;
        limit: number;
        offset: number;
      }
    }>(
      '/admin/models/tiers/audit-logs',
      { params }
    );

    // Transform backend response to frontend format (previousValue/newValue -> oldValues/newValues)
    const backendData = response.data.data;
    return {
      logs: backendData.logs.map(log => ({
        id: log.id,
        modelId: log.modelId,
        modelName: '', // Backend doesn't return modelName, will be empty
        adminUserId: log.adminUserId,
        adminUserEmail: log.adminEmail,
        changeType: log.changeType as 'tier_change' | 'restriction_mode_change' | 'allowed_tiers_change',
        oldValues: log.previousValue || {},
        newValues: log.newValue || {},
        reason: log.reason,
        timestamp: log.createdAt,
      })),
      total: backendData.total,
      page: Math.floor(backendData.offset / backendData.limit),
      pageSize: backendData.limit,
    };
  },

  /**
   * Revert a tier change from audit log
   * @param auditLogId - Audit log entry ID
   */
  revertTierChange: async (
    auditLogId: string
  ): Promise<{ success: boolean; model: ModelTierInfo }> => {
    const response = await apiClient.post<{
      status: string;
      data: { success: boolean; model: ModelTierInfo };
    }>(`/admin/models/tiers/revert/${auditLogId}`);
    return response.data.data; // Unwrap nested data
  },

  /**
   * Get list of unique providers for filtering
   */
  getProviders: async (): Promise<string[]> => {
    const response = await apiClient.get<{ providers: string[] }>(
      '/admin/models/providers'
    );
    return response.data.providers;
  },

  // ============================================================================
  // Model Lifecycle Management APIs
  // ============================================================================

  /**
   * Mark a model as legacy with optional replacement and deprecation info
   * @param modelId - Model ID to mark as legacy
   * @param data - Legacy configuration (replacement model, notice, sunset date)
   * @returns Promise resolving when operation completes
   *
   * @example
   * await adminAPI.markModelAsLegacy('gpt-3.5-turbo', {
   *   replacementModelId: 'gpt-4',
   *   deprecationNotice: 'GPT-3.5 will be sunset on 2025-12-31. Please migrate to GPT-4.',
   *   sunsetDate: '2025-12-31T00:00:00Z'
   * });
   */
  markModelAsLegacy: async (
    modelId: string,
    data: MarkLegacyRequest
  ): Promise<void> => {
    await apiClient.post(`/admin/models/${modelId}/mark-legacy`, data);
  },

  /**
   * Remove legacy status from a model
   * @param modelId - Model ID to unmark as legacy
   * @returns Promise resolving when operation completes
   *
   * @example
   * await adminAPI.unmarkModelLegacy('gpt-3.5-turbo');
   */
  unmarkModelLegacy: async (modelId: string): Promise<void> => {
    await apiClient.post(`/admin/models/${modelId}/unmark-legacy`);
  },

  /**
   * Archive a model (removes from public endpoints)
   * @param modelId - Model ID to archive
   * @param reason - Required reason for archiving
   * @returns Promise resolving when operation completes
   *
   * @example
   * await adminAPI.archiveModel('text-davinci-002',
   *   'Model deprecated by provider, no longer supported'
   * );
   */
  archiveModel: async (modelId: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/models/${modelId}/archive`, { reason });
  },

  /**
   * Restore an archived model
   * @param modelId - Model ID to unarchive
   * @returns Promise resolving when operation completes
   *
   * @example
   * await adminAPI.unarchiveModel('text-davinci-002');
   */
  unarchiveModel: async (modelId: string): Promise<void> => {
    await apiClient.post(`/admin/models/${modelId}/unarchive`);
  },

  /**
   * Update model metadata (partial update)
   * @param modelId - Model ID to update
   * @param metaUpdates - Partial meta object with fields to update
   * @returns Updated model information
   *
   * @example
   * const updatedModel = await adminAPI.updateModelMeta('gpt-4', {
   *   displayName: 'GPT-4 Turbo',
   *   contextLength: 128000,
   *   inputCostPerMillionTokens: 10000
   * });
   */
  updateModelMeta: async (
    modelId: string,
    metaUpdates: Partial<ModelMeta>
  ): Promise<ModelInfo> => {
    const response = await apiClient.patch<ModelInfo>(
      `/admin/models/${modelId}/meta`,
      metaUpdates
    );
    return response.data;
  },

  /**
   * Create a new model
   * @param modelData - Complete model configuration
   * @returns Created model information
   *
   * @example
   * const newModel = await adminAPI.createModel({
   *   id: 'custom-model-1',
   *   name: 'custom-model-1',
   *   provider: 'custom',
   *   meta: {
   *     displayName: 'Custom Model v1',
   *     description: 'Custom fine-tuned model',
   *     capabilities: ['text'],
   *     contextLength: 4096,
   *     inputCostPerMillionTokens: 5000,
   *     outputCostPerMillionTokens: 15000,
   *     creditsPer1kTokens: 10,
   *     requiredTier: 'pro',
   *     tierRestrictionMode: 'minimum',
   *     allowedTiers: ['pro', 'enterprise']
   *   }
   * });
   */
  createModel: async (modelData: CreateModelRequest): Promise<ModelInfo> => {
    const response = await apiClient.post<ModelInfo>('/admin/models', modelData);
    return response.data;
  },

  /**
   * Get lifecycle history for a model
   * @param modelId - Model ID to fetch history for
   * @returns Array of lifecycle events
   *
   * @example
   * const history = await adminAPI.getLifecycleHistory('gpt-4');
   * // Returns events like: created, marked legacy, archived, meta updates
   */
  getLifecycleHistory: async (modelId: string): Promise<LifecycleEvent[]> => {
    const response = await apiClient.get<LifecycleHistoryResponse>(
      `/admin/models/${modelId}/lifecycle-history`
    );
    return response.data.history;
  },

  /**
   * Get all models marked as legacy
   * @returns Array of legacy models
   *
   * @example
   * const legacyModels = await adminAPI.getLegacyModels();
   * // Filter models by isLegacy=true with replacement info
   */
  getLegacyModels: async (): Promise<ModelInfo[]> => {
    const response = await apiClient.get<LegacyModelsResponse>('/admin/models/legacy');
    return response.data.models;
  },

  /**
   * Get all archived models
   * @returns Array of archived models
   *
   * @example
   * const archivedModels = await adminAPI.getArchivedModels();
   * // Filter models by isArchived=true
   */
  getArchivedModels: async (): Promise<ModelInfo[]> => {
    const response = await apiClient.get<ArchivedModelsResponse>(
      '/admin/models/archived?includeArchived=true'
    );
    return response.data.models;
  },

  // ============================================================================
  // Dashboard Analytics APIs
  // ============================================================================

  /**
   * Get cross-plan dashboard KPIs
   * @param period - Time period for KPI calculation (7d, 30d, 90d, 1y)
   */
  getDashboardKPIs: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<DashboardKPIsResponse> => {
    const response = await apiClient.get<DashboardKPIsResponse>(
      '/admin/analytics/dashboard-kpis',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get recent activity feed from multiple sources
   * @param params - Pagination parameters
   */
  getRecentActivity: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<RecentActivityResponse> => {
    const response = await apiClient.get<RecentActivityResponse>(
      '/admin/analytics/recent-activity',
      { params }
    );
    return response.data;
  },

  // ============================================================================
  // User Detail APIs (Phase 4 - Unified User View)
  // ============================================================================

  /**
   * Get user overview with current subscription, license, and credit status
   * @param userId - User ID
   */
  getUserOverview: async (userId: string): Promise<UserOverviewResponse> => {
    const response = await apiClient.get<UserOverviewResponse>(
      `/admin/users/${userId}/overview`
    );
    return response.data;
  },

  /**
   * Get user subscription history with proration events
   * @param userId - User ID
   * @param params - Pagination parameters
   */
  getUserSubscriptions: async (
    userId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<UserSubscriptionsResponse> => {
    const response = await apiClient.get<UserSubscriptionsResponse>(
      `/admin/users/${userId}/subscriptions`,
      { params }
    );
    return response.data;
  },

  /**
   * Get user licenses with device activations and upgrade history
   * @param userId - User ID
   * @param params - Pagination parameters
   */
  getUserLicenses: async (
    userId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<UserLicensesResponse> => {
    const response = await apiClient.get<UserLicensesResponse>(
      `/admin/users/${userId}/licenses`,
      { params }
    );
    return response.data;
  },

  /**
   * Get user credit balance, allocations, and usage
   * @param userId - User ID
   * @param params - Period and pagination parameters
   */
  getUserCredits: async (
    userId: string,
    params?: { period?: string; limit?: number; offset?: number }
  ): Promise<UserCreditsResponse> => {
    const response = await apiClient.get<UserCreditsResponse>(
      `/admin/users/${userId}/credits`,
      { params }
    );
    return response.data;
  },

  /**
   * Get user coupon redemptions and fraud flags
   * @param userId - User ID
   * @param params - Pagination parameters
   */
  getUserCoupons: async (
    userId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<UserCouponsResponse> => {
    const response = await apiClient.get<UserCouponsResponse>(
      `/admin/users/${userId}/coupons`,
      { params }
    );
    return response.data;
  },

  /**
   * Get user payment methods and invoice history
   * @param userId - User ID
   * @param params - Pagination parameters
   */
  getUserPayments: async (
    userId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<UserPaymentsResponse> => {
    const response = await apiClient.get<UserPaymentsResponse>(
      `/admin/users/${userId}/payments`,
      { params }
    );
    return response.data;
  },

  /**
   * Get user activity timeline
   * @param userId - User ID
   * @param params - Filter and pagination parameters
   */
  getUserActivity: async (
    userId: string,
    params?: { type?: string; limit?: number; offset?: number }
  ): Promise<UserActivityResponse> => {
    const response = await apiClient.get<UserActivityResponse>(
      `/admin/users/${userId}/activity`,
      { params }
    );
    return response.data;
  },
};

// ============================================================================
// User Detail Response Types
// ============================================================================

export interface UserOverviewResponse {
  user: Pick<User, 'id' | 'email' | 'name' | 'createdAt' | 'status'> & {
    lastLogin?: string;
  };
  currentSubscription?: Pick<Subscription, 'id' | 'tier' | 'status' | 'billingCycle'> & {
    creditAllocation: number;
    nextBillingDate?: string;
    startedAt: string;
  };
  currentLicense?: {
    id: string;
    licenseKey: string;
    status: string;
    activatedAt: string;
    deviceCount: number;
    maxDevices: number;
  };
  creditBalance: number;
  stats: {
    totalSubscriptions: number;
    totalLicenses: number;
    creditsConsumed: number;
    couponsRedeemed: number;
  };
}

export interface UserSubscriptionsResponse {
  subscriptions: Array<Pick<Subscription, 'id' | 'tier' | 'status' | 'billingCycle'> & {
    startedAt: string;
    endedAt?: string;
    price: number;
  }>;
  prorations: Array<{
    id: string;
    fromTier: string;
    toTier: string;
    prorationAmount: number;
    createdAt: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface UserLicensesResponse {
  licenses: Array<{
    id: string;
    licenseKey: string;
    status: string;
    purchasedAt: string;
    price: number;
    deviceActivations: Array<{
      id: string;
      deviceName?: string;
      deviceId: string;
      activatedAt: string;
      lastSeen?: string;
      status: string;
    }>;
    versionUpgrades: Array<{
      id: string;
      fromVersion: string;
      toVersion: string;
      price: number;
      upgradedAt: string;
    }>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface UserCreditsResponse {
  balance: number;
  lastUpdated: string;
  allocations: Array<{
    id: string;
    amount: number;
    source: 'subscription' | 'bonus' | 'admin' | 'coupon';
    reason?: string;
    allocatedAt: string;
  }>;
  usageByModel: Array<{
    model: string;
    totalCredits: number;
    requestCount: number;
  }>;
  deductions: Array<{
    id: string;
    amount: number;
    model: string;
    timestamp: string;
  }>;
  totals: {
    totalAllocated: number;
    totalUsed: number;
  };
  limit: number;
  offset: number;
}

export interface UserCouponsResponse {
  redemptions: Array<{
    id: string;
    couponCode: string;
    type: 'percentage' | 'fixed' | 'subscription' | 'license';
    discount?: number;
    redeemedAt: string;
    grantedBenefits?: string;
  }>;
  fraudFlags: Array<{
    id: string;
    couponCode: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
    flaggedAt: string;
  }>;
  totalDiscount: number;
  total: number;
  limit: number;
  offset: number;
}

export interface UserPaymentsResponse {
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  stripeCustomerId?: string;
  invoices: Array<{
    id: string;
    invoiceId: string;
    amount: number;
    status: string;
    description?: string;
    createdAt: string;
    stripeInvoiceUrl?: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface UserActivityResponse {
  activities: ActivityEvent[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Revenue Analytics Types & APIs (Phase 4 - RevenueAnalytics Page)
// ============================================================================

export interface RevenueKPIsResponse {
  totalRevenue: {
    value: number;
    change?: KPIChange;
  };
  mrr: {
    value: number;
    change?: KPIChange;
  };
  perpetualRevenue: {
    value: number;
    change?: KPIChange;
  };
  arpu: {
    value: number;
    change?: KPIChange;
  };
}

export interface RevenueMixDataPoint {
  name: string;
  value: number;
  percentage: number;
}

export interface RevenueMixResponse {
  data: RevenueMixDataPoint[];
  total: number;
  period: string;
}

export interface RevenueTrendDataPoint {
  date: string;
  total: number;
  subscription: number;
  perpetual: number;
  upgrade?: number;
}

export interface RevenueTrendResponse {
  data: RevenueTrendDataPoint[];
  period: string;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export interface ConversionFunnelStage {
  name: string;
  count: number;
  percentage: number;
  conversionRate?: number;
}

export interface ConversionFunnelResponse {
  stages: ConversionFunnelStage[];
  period: string;
}

export interface CreditUsageByModel {
  modelId: string;
  modelName: string;
  creditsConsumed: number;
  requestCount: number;
  percentage: number;
}

export interface CreditUsageResponse {
  data: CreditUsageByModel[];
  total: number;
  period: string;
  topModels: number;
}

export interface CouponROIRow {
  id: string;
  campaignName: string;
  issued: number;
  redeemed: number;
  redemptionRate: number;
  discountValue: number;
  revenueGenerated: number;
  roi: number;
}

export interface CouponROIResponse {
  data: CouponROIRow[];
  total: number;
  period: string;
  limit: number;
  offset: number;
}

/**
 * Revenue Analytics API functions
 */
export const revenueAnalyticsAPI = {
  /**
   * Get revenue KPIs for a given period
   * @param period - Time period (7d, 30d, 90d, 1y)
   */
  getRevenueKPIs: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<RevenueKPIsResponse> => {
    const response = await apiClient.get<RevenueKPIsResponse>(
      '/admin/analytics/revenue/kpis',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get revenue mix breakdown (subscription vs perpetual vs upgrades)
   * @param period - Time period (7d, 30d, 90d, 1y)
   */
  getRevenueMix: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<RevenueMixResponse> => {
    const response = await apiClient.get<RevenueMixResponse>(
      '/admin/analytics/revenue/mix',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get revenue trend over time
   * @param period - Time period (7d, 30d, 90d, 1y)
   */
  getRevenueTrend: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<RevenueTrendResponse> => {
    const response = await apiClient.get<RevenueTrendResponse>(
      '/admin/analytics/revenue/trend',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get conversion funnel (free -> paid subscription -> perpetual license)
   * @param period - Time period (7d, 30d, 90d, 1y)
   */
  getConversionFunnel: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<ConversionFunnelResponse> => {
    const response = await apiClient.get<ConversionFunnelResponse>(
      '/admin/analytics/revenue/conversion-funnel',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get credit usage by AI model
   * @param period - Time period (7d, 30d, 90d, 1y)
   * @param limit - Number of top models (default: 10)
   */
  getCreditUsageByModel: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    limit = 10
  ): Promise<CreditUsageResponse> => {
    const response = await apiClient.get<CreditUsageResponse>(
      '/admin/analytics/revenue/credit-usage',
      { params: { period, limit } }
    );
    return response.data;
  },

  /**
   * Get coupon ROI analysis
   * @param period - Time period (7d, 30d, 90d, 1y)
   * @param params - Pagination parameters
   */
  getCouponROI: async (
    period: '7d' | '30d' | '90d' | '1y' = '30d',
    params?: { limit?: number; offset?: number }
  ): Promise<CouponROIResponse> => {
    const response = await apiClient.get<CouponROIResponse>(
      '/admin/analytics/revenue/coupon-roi',
      { params: { period, ...params } }
    );
    return response.data;
  },
};
