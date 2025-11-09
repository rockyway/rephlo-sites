import { apiClient } from '@/services/api';
import type {
  ModelTierInfo,
  ModelTierUpdateRequest,
  ModelTierFilters,
  ModelTierListResponse,
  AuditLogResponse,
} from '@/types/model-tier';

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
    const response = await apiClient.get<ModelTierListResponse>(
      '/admin/models/tiers',
      { params }
    );
    return response.data;
  },

  /**
   * Get single model tier information
   * @param modelId - Model ID
   */
  getModelTier: async (modelId: string): Promise<ModelTierInfo> => {
    const response = await apiClient.get<ModelTierInfo>(
      `/admin/models/${modelId}/tier`
    );
    return response.data;
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
    const response = await apiClient.patch<ModelTierInfo>(
      `/admin/models/${modelId}/tier`,
      data
    );
    return response.data;
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
      updated: number;
      models: ModelTierInfo[];
    }>('/admin/models/tiers/bulk', {
      modelIds,
      updates,
      reason,
    });
    return response.data;
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
    const response = await apiClient.get<AuditLogResponse>(
      '/admin/models/tiers/audit-logs',
      { params }
    );
    return response.data;
  },

  /**
   * Revert a tier change from audit log
   * @param auditLogId - Audit log entry ID
   */
  revertTierChange: async (
    auditLogId: string
  ): Promise<{ success: boolean; model: ModelTierInfo }> => {
    const response = await apiClient.post<{
      success: boolean;
      model: ModelTierInfo;
    }>(`/admin/models/tiers/revert/${auditLogId}`);
    return response.data;
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
};
