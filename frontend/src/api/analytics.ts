/**
 * Analytics API Client
 *
 * Provides methods for fetching analytics data from the backend.
 * All endpoints are prefixed with /admin/analytics and require admin JWT.
 *
 * Reference: Plan 180, Reference Doc 181
 */

import { apiClient } from '@/services/api';
import type {
  GrossMarginQueryParams,
  GrossMarginKPIData,
  CostQueryParams,
  ProviderCostData,
  TrendQueryParams,
  MarginTrendData,
  DistributionQueryParams,
  CostDistributionData,
  ExportParams,
} from '@/types/analytics.types';

export const analyticsApi = {
  /**
   * GET /admin/analytics/gross-margin
   * Fetch gross margin KPI summary with tier breakdown and trend
   */
  async getGrossMargin(params: GrossMarginQueryParams): Promise<GrossMarginKPIData> {
    const { data } = await apiClient.get<GrossMarginKPIData>(
      '/admin/analytics/gross-margin',
      { params }
    );
    return data;
  },

  /**
   * GET /admin/analytics/cost-by-provider
   * Fetch top 5 providers by cost with statistics
   */
  async getCostByProvider(params: CostQueryParams): Promise<ProviderCostData> {
    const { data } = await apiClient.get<ProviderCostData>(
      '/admin/analytics/cost-by-provider',
      { params }
    );
    return data;
  },

  /**
   * GET /admin/analytics/margin-trend
   * Fetch margin trend time series with moving averages
   */
  async getMarginTrend(params: TrendQueryParams): Promise<MarginTrendData> {
    const { data } = await apiClient.get<MarginTrendData>(
      '/admin/analytics/margin-trend',
      { params }
    );
    return data;
  },

  /**
   * GET /admin/analytics/cost-distribution
   * Fetch cost histogram with anomaly detection
   */
  async getCostDistribution(params: DistributionQueryParams): Promise<CostDistributionData> {
    const { data } = await apiClient.get<CostDistributionData>(
      '/admin/analytics/cost-distribution',
      { params }
    );
    return data;
  },

  /**
   * POST /admin/analytics/export-csv
   * Export analytics data to CSV file (returns Blob for download)
   */
  async exportCSV(params: ExportParams): Promise<Blob> {
    const { data } = await apiClient.post<Blob>(
      '/admin/analytics/export-csv',
      params,
      {
        responseType: 'blob',
      }
    );
    return data;
  },
};
