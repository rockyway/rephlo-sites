/**
 * GrossMarginOverviewCard Component
 *
 * Displays gross margin KPIs with tier breakdown and trend indicators.
 *
 * Features:
 * - 4 KPI metrics (Total Margin, Margin %, Avg per Request, Trend)
 * - Tier breakdown with mini bar chart
 * - Loading skeleton during fetch
 * - WCAG 2.1 AA color contrast
 *
 * Reference: Plan 180 Section 4.1
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useGrossMarginKPI } from '@/hooks/useAnalytics';
import type { AnalyticsFilters } from '@/types/analytics.types';
import { formatCurrency, formatNumber } from '@/utils/format';

interface GrossMarginOverviewCardProps {
  filters: AnalyticsFilters;
}

export const GrossMarginOverviewCard: React.FC<GrossMarginOverviewCardProps> = ({ filters }) => {
  const { data, isLoading, isError } = useGrossMarginKPI({
    period: filters.period,
    startDate: filters.startDate,
    endDate: filters.endDate,
    tier: filters.tier,
    providers: filters.providers,
    models: filters.models,
  });

  if (isLoading) {
    return <GrossMarginSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6">
        <p className="text-red-600 dark:text-red-400 text-center" role="alert">
          Failed to load gross margin data. Please try again.
        </p>
      </div>
    );
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (direction === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-deep-navy-400" />;
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'up') return 'text-green-600';
    if (direction === 'down') return 'text-red-600';
    return 'text-deep-navy-600';
  };

  const tierColors: Record<string, string> = {
    free: '#94A3B8',
    pro: '#2563EB',
    enterprise: '#10B981',
  };

  return (
    <div
      className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6"
      role="region"
      aria-labelledby="gross-margin-heading"
    >
      <h2 id="gross-margin-heading" className="text-lg font-semibold text-deep-navy-800 dark:text-white mb-6">
        Gross Margin Overview
      </h2>

      {/* KPI Grid - Responsive (4 columns desktop, 2 tablet, 1 mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Gross Margin */}
        <div className="flex flex-col">
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 mb-1">
            Total Gross Margin
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-h3 font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(data.totalGrossMargin)}
            </span>
          </div>
          <div className={`flex items-center gap-1 mt-1 ${getTrendColor(data.trend.direction)}`}>
            {getTrendIcon(data.trend.direction)}
            <span className="text-body-sm font-medium">
              {data.trend.marginChangePercent > 0 ? '+' : ''}
              {data.trend.marginChangePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Margin Percentage */}
        <div className="flex flex-col">
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 mb-1">
            Margin %
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-h3 font-bold text-deep-navy-800 dark:text-white">
              {data.marginPercentage.toFixed(1)}%
            </span>
          </div>
          <span className="text-body-sm text-deep-navy-500 dark:text-deep-navy-400 mt-1">
            of ${formatNumber(data.totalRevenue)}
          </span>
        </div>

        {/* Avg Margin per Request */}
        <div className="flex flex-col">
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 mb-1">
            Avg per Request
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-h3 font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(data.avgMarginPerRequest)}
            </span>
          </div>
          <span className="text-body-sm text-deep-navy-500 dark:text-deep-navy-400 mt-1">
            {formatNumber(data.requestCount)} requests
          </span>
        </div>

        {/* Previous Period */}
        <div className="flex flex-col">
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 mb-1">
            Previous Period
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-h3 font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(data.previousPeriodMargin)}
            </span>
          </div>
          <span className="text-body-sm text-deep-navy-500 dark:text-deep-navy-400 mt-1">
            {data.trend.marginChange > 0 ? '+' : ''}
            {formatCurrency(data.trend.marginChange)} change
          </span>
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="border-t border-deep-navy-200 dark:border-deep-navy-700 pt-4">
        <h3 className="text-body font-semibold text-deep-navy-700 dark:text-deep-navy-200 mb-3">
          By Tier
        </h3>
        <div className="space-y-3">
          {data.tierBreakdown.map((tier) => (
            <div key={tier.tier} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-24">
                <span className="text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 capitalize">
                  {tier.tier}
                </span>
              </div>
              <div className="flex-1 h-8 bg-deep-navy-100 dark:bg-deep-navy-700 rounded-md overflow-hidden">
                <div
                  className="h-full flex items-center px-2 text-white text-body-sm font-medium transition-all duration-300"
                  style={{
                    width: `${tier.percentage}%`,
                    backgroundColor: tierColors[tier.tier],
                  }}
                >
                  {tier.percentage >= 15 && `${tier.percentage.toFixed(0)}%`}
                </div>
              </div>
              <div className="flex-shrink-0 w-24 text-right">
                <span className="text-body-sm font-semibold text-deep-navy-800 dark:text-white">
                  {formatCurrency(tier.grossMargin)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen reader accessible summary */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Total gross margin: {formatCurrency(data.totalGrossMargin)},
        {data.trend.direction} {Math.abs(data.trend.marginChangePercent).toFixed(1)}% from previous period.
        Margin percentage: {data.marginPercentage.toFixed(1)}%.
        Average margin per request: {formatCurrency(data.avgMarginPerRequest)}.
      </div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const GrossMarginSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6 animate-pulse">
      <div className="h-6 w-48 bg-deep-navy-200 dark:bg-deep-navy-700 rounded mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-2">
            <div className="h-4 w-24 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
            <div className="h-8 w-32 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
            <div className="h-4 w-16 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
          </div>
        ))}
      </div>
      <div className="border-t border-deep-navy-200 dark:border-deep-navy-700 pt-4">
        <div className="h-5 w-16 bg-deep-navy-200 dark:bg-deep-navy-700 rounded mb-3"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-24 h-4 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
            <div className="flex-1 h-8 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
            <div className="w-24 h-4 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
