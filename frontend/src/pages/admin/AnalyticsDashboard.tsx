/**
 * AnalyticsDashboard Container Page
 *
 * Main analytics dashboard displaying vendor cost and gross margin analytics.
 *
 * Features:
 * - Filter state management (URL params + LocalStorage)
 * - 6 analytics components
 * - Responsive grid layout
 * - Loading states with skeletons
 * - Error boundaries
 *
 * Reference: Plan 180
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import { GrossMarginOverviewCard } from '@/components/analytics/GrossMarginOverviewCard';
import { ProviderCostChart } from '@/components/analytics/ProviderCostChart';
import { MarginTrendChart } from '@/components/analytics/MarginTrendChart';
import { CostHistogramChart } from '@/components/analytics/CostHistogramChart';
import { AdvancedFiltersPanel } from '@/components/analytics/AdvancedFiltersPanel';
import { CSVExportButton } from '@/components/analytics/CSVExportButton';
import type { AnalyticsFilters, PeriodType, SubscriptionTier } from '@/types/analytics.types';

const AnalyticsDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL or LocalStorage
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    // Try URL params first
    const urlPeriod = searchParams.get('period') as PeriodType;
    if (urlPeriod) {
      return {
        period: urlPeriod,
        tier: (searchParams.get('tier') as SubscriptionTier) || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        providers: searchParams.getAll('provider'),
        models: searchParams.getAll('model'),
      };
    }

    // Try LocalStorage
    const savedFilters = localStorage.getItem('analytics-filters');
    if (savedFilters) {
      try {
        return JSON.parse(savedFilters);
      } catch (e) {
        console.error('Failed to parse saved filters:', e);
      }
    }

    // Default
    return { period: 'last_30_days' };
  });

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('period', filters.period);
    if (filters.tier) params.set('tier', filters.tier);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    filters.providers?.forEach(p => params.append('provider', p));
    filters.models?.forEach(m => params.append('model', m));

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Sync filters to LocalStorage
  useEffect(() => {
    localStorage.setItem('analytics-filters', JSON.stringify(filters));
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-navy-800 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-deep-navy-600 dark:text-deep-navy-200 mt-1">
            Vendor cost and gross margin analytics
          </p>
        </div>
        <CSVExportButton filters={filters} />
      </div>

      {/* Filters Panel */}
      <AdvancedFiltersPanel filters={filters} onChange={handleFilterChange} />

      {/* Gross Margin Overview Card - Full Width */}
      <GrossMarginOverviewCard filters={filters} />

      {/* Charts Grid - 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProviderCostChart filters={filters} />
        <MarginTrendChart filters={filters} />
      </div>

      {/* Cost Histogram - Full Width */}
      <CostHistogramChart filters={filters} />
    </div>
  );
};

export default AnalyticsDashboard;
