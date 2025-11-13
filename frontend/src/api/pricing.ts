import { apiClient } from '@/services/api';
import type {
  // Import shared pricing/credit types
  PricingConfig,
} from '@rephlo/shared-types';

// Re-export for backward compatibility
export type { PricingConfig } from '@rephlo/shared-types';

/**
 * Pricing Configuration Types
 * PricingConfig is now imported from @rephlo/shared-types
 */

export interface PricingConfigFilters {
  scopeType?: string;
  subscriptionTier?: string;
  providerId?: string;
  isActive?: boolean;
  approvalStatus?: string;
}

export interface PricingConfigRequest {
  scopeType: 'tier' | 'provider' | 'model' | 'combination';
  subscriptionTier?: string;
  providerId?: string;
  modelId?: string;
  marginMultiplier: number;
  targetGrossMarginPercent?: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  reason: string;
  reasonDetails?: string;
}

/**
 * Simulation Types
 */
export interface SimulationScenario {
  tier?: string;
  providerId?: string;
  modelId?: string;
  currentMultiplier: number;
  proposedMultiplier: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  revenueImpact: {
    additionalMargin: number;
    currentMargin: number;
    newProjectedMargin: number;
    marginPercentChange: number;
  };
  userImpact: {
    affectedUsers: number;
    avgCreditCostIncrease: number;
    estimatedUsageReduction: { min: number; max: number };
    estimatedChurnImpact: { min: number; max: number };
  };
  modelMixImpact: Array<{
    modelName: string;
    requestChangePercent: number;
  }>;
  netFinancialImpact: {
    additionalRevenue: number;
    churnCost: number;
    netBenefit: number;
    netBenefitPercent: number;
  };
}

/**
 * Vendor Pricing Types
 */
export interface VendorPricing {
  id: string;
  providerId: string;
  providerName: string;
  modelName: string;
  inputPricePer1k: number;
  outputPricePer1k: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  previousPriceInput?: number;
  previousPriceOutput?: number;
  priceChangePercentInput?: number;
  priceChangePercentOutput?: number;
  detectedAt?: string;
  isActive: boolean;
  lastVerified: string;
}

export interface VendorPriceAlert {
  id: string;
  providerId: string;
  providerName: string;
  modelName: string;
  changeType: 'increase' | 'decrease';
  changePercent: number;
  oldPrice: number;
  newPrice: number;
  impactOnMargin: number;
  detectedAt: string;
  status: 'new' | 'acknowledged' | 'applied' | 'ignored';
  recommendedAction?: string;
  recommendedMultiplier?: number;
}

/**
 * Margin Tracking Types
 */
export interface MarginMetrics {
  actualGrossMargin: number;
  targetMargin: number;
  variance: number;
  thisMonthVendorCost: number;
  creditValue: number;
  grossMarginDollars: number;
  status: 'on_target' | 'below_target' | 'above_target';
}

export interface MarginByTier {
  tier: string;
  marginPercent: number;
  targetMargin: number;
  variance: number;
  requests: number;
  vendorCost: number;
  creditValue: number;
  status: 'on_target' | 'warning' | 'critical';
}

export interface MarginByProvider {
  providerId: string;
  providerName: string;
  vendorCost: number;
  marginPercent: number;
  requests: number;
}

export interface TopModel {
  modelId: string;
  modelName: string;
  requests: number;
  tokensMillions: number;
  vendorCost: number;
  marginPercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Pricing API Client
 *
 * Provides methods for managing pricing configuration, simulating changes,
 * monitoring vendor prices, and tracking profitability margins.
 */
export const pricingApi = {
  /**
   * Pricing Configuration Endpoints
   */

  // List all pricing configurations with filters
  listPricingConfigs: async (filters?: PricingConfigFilters) => {
    const response = await apiClient.get<{ configs: PricingConfig[]; total: number }>(
      '/admin/pricing/configs',
      { params: filters }
    );
    return response.data;
  },

  // Get single pricing config
  getPricingConfig: async (id: string) => {
    const response = await apiClient.get<PricingConfig>(
      `/admin/pricing/configs/${id}`
    );
    return response.data;
  },

  // Create new pricing config
  createPricingConfig: async (data: PricingConfigRequest) => {
    const response = await apiClient.post<PricingConfig>(
      '/admin/pricing/configs',
      data
    );
    return response.data;
  },

  // Update existing pricing config
  updatePricingConfig: async (id: string, data: Partial<PricingConfigRequest>) => {
    const response = await apiClient.patch<PricingConfig>(
      `/admin/pricing/configs/${id}`,
      data
    );
    return response.data;
  },

  // Approve pending pricing config
  approvePricingConfig: async (id: string, notes?: string) => {
    const response = await apiClient.post<PricingConfig>(
      `/admin/pricing/configs/${id}/approve`,
      { notes }
    );
    return response.data;
  },

  // Reject pending pricing config
  rejectPricingConfig: async (id: string, reason: string) => {
    const response = await apiClient.post<PricingConfig>(
      `/admin/pricing/configs/${id}/reject`,
      { reason }
    );
    return response.data;
  },

  /**
   * Simulation Endpoints
   */

  // Simulate multiplier change impact
  simulateMultiplierChange: async (scenario: SimulationScenario) => {
    const response = await apiClient.post<SimulationResult>(
      '/admin/pricing/simulate',
      scenario
    );
    return response.data;
  },

  // Save simulation scenario
  saveSimulationScenario: async (name: string, scenario: SimulationScenario, result: SimulationResult) => {
    const response = await apiClient.post<{ id: string; name: string }>(
      '/admin/pricing/scenarios',
      { name, scenario, result }
    );
    return response.data;
  },

  // List saved scenarios
  listScenarios: async () => {
    const response = await apiClient.get<Array<{ id: string; name: string; createdAt: string }>>(
      '/admin/pricing/scenarios'
    );
    return response.data;
  },

  /**
   * Vendor Pricing Endpoints
   */

  // List all vendor pricing
  listVendorPricing: async (params?: { providerId?: string; isActive?: boolean }) => {
    const response = await apiClient.get<{ pricing: VendorPricing[]; total: number }>(
      '/admin/pricing/vendor-prices',
      { params }
    );
    return response.data;
  },

  // Get vendor price alerts
  getVendorPriceAlerts: async (params?: { status?: string; minImpact?: number }) => {
    const response = await apiClient.get<{ alerts: VendorPriceAlert[]; total: number }>(
      '/admin/pricing/alerts',
      { params }
    );
    return response.data;
  },

  // Acknowledge price alert
  acknowledgeAlert: async (alertId: string) => {
    const response = await apiClient.post<VendorPriceAlert>(
      `/admin/pricing/alerts/${alertId}/acknowledge`
    );
    return response.data;
  },

  // Apply recommended multiplier from alert
  applyAlertRecommendation: async (alertId: string) => {
    const response = await apiClient.post<{ config: PricingConfig; alert: VendorPriceAlert }>(
      `/admin/pricing/alerts/${alertId}/apply`
    );
    return response.data;
  },

  // Ignore price alert
  ignoreAlert: async (alertId: string, reason: string) => {
    const response = await apiClient.post<VendorPriceAlert>(
      `/admin/pricing/alerts/${alertId}/ignore`,
      { reason }
    );
    return response.data;
  },

  /**
   * Margin Tracking Endpoints
   */

  // Get overall margin metrics
  getMarginMetrics: async (dateRange?: { start: string; end: string }) => {
    const response = await apiClient.get<MarginMetrics>(
      '/admin/pricing/margin-metrics',
      { params: dateRange }
    );
    return response.data;
  },

  // Get margin breakdown by tier
  getMarginByTier: async (dateRange?: { start: string; end: string }) => {
    const response = await apiClient.get<{ tiers: MarginByTier[] }>(
      '/admin/pricing/margin-by-tier',
      { params: dateRange }
    );
    return response.data;
  },

  // Get margin breakdown by provider
  getMarginByProvider: async (dateRange?: { start: string; end: string }) => {
    const response = await apiClient.get<{ providers: MarginByProvider[] }>(
      '/admin/pricing/margin-by-provider',
      { params: dateRange }
    );
    return response.data;
  },

  // Get top models by usage
  getTopModelsByUsage: async (limit = 10, dateRange?: { start: string; end: string }) => {
    const response = await apiClient.get<{ models: TopModel[] }>(
      '/admin/pricing/top-models',
      { params: { limit, ...dateRange } }
    );
    return response.data;
  },

  // Get margin history (time series)
  getMarginHistory: async (dateRange: { start: string; end: string }, granularity: 'hour' | 'day' | 'week' = 'day') => {
    const response = await apiClient.get<{
      history: Array<{
        timestamp: string;
        actualMargin: number;
        targetMargin: number;
        vendorCost: number;
        creditValue: number;
      }>;
    }>('/admin/pricing/margin-history', {
      params: { ...dateRange, granularity }
    });
    return response.data;
  },
};
