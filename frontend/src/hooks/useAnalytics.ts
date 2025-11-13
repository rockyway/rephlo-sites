/**
 * Analytics Dashboard Custom Hooks
 *
 * React Query hooks for fetching analytics data with caching and automatic refetching.
 * All hooks use 5-minute staleTime and 10-minute cacheTime for optimal performance.
 *
 * Reference: Plan 180, Reference Doc 182
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics';
import type {
  GrossMarginQueryParams,
  CostQueryParams,
  TrendQueryParams,
  DistributionQueryParams,
  ExportParams,
} from '@/types/analytics.types';

/**
 * useGrossMarginKPI
 * Fetches gross margin summary with tier breakdown
 */
export function useGrossMarginKPI(params: GrossMarginQueryParams) {
  return useQuery({
    queryKey: ['analytics', 'gross-margin', params],
    queryFn: () => analyticsApi.getGrossMargin(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    enabled: !!params.period, // Only fetch if period is set
  });
}

/**
 * useCostByProvider
 * Fetches provider cost breakdown (top 5)
 */
export function useCostByProvider(params: CostQueryParams) {
  return useQuery({
    queryKey: ['analytics', 'cost-by-provider', params],
    queryFn: () => analyticsApi.getCostByProvider(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    enabled: !!params.period,
  });
}

/**
 * useMarginTrend
 * Fetches margin trend time series with moving averages
 */
export function useMarginTrend(params: TrendQueryParams) {
  return useQuery({
    queryKey: ['analytics', 'margin-trend', params],
    queryFn: () => analyticsApi.getMarginTrend(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    enabled: !!params.period && !!params.granularity,
  });
}

/**
 * useCostDistribution
 * Fetches cost histogram with anomaly detection
 */
export function useCostDistribution(params: DistributionQueryParams) {
  return useQuery({
    queryKey: ['analytics', 'cost-distribution', params],
    queryFn: () => analyticsApi.getCostDistribution(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    enabled: !!params.period,
  });
}

/**
 * useExportCSV
 * Mutation hook for exporting analytics data to CSV
 * Triggers browser download on success
 */
export function useExportCSV() {
  return useMutation({
    mutationFn: (params: ExportParams) => analyticsApi.exportCSV(params),
    onSuccess: (blob, params) => {
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${params.period}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error: any) => {
      console.error('CSV export failed:', error);
      // Toast notification handled by component
    },
  });
}
