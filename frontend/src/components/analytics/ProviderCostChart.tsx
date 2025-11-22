/**
 * ProviderCostChart Component
 *
 * Bar chart showing top 5 providers by cost with tooltips.
 *
 * Features:
 * - Horizontal bar chart (Recharts)
 * - Tooltips with detailed metrics
 * - Lazy-loaded Recharts library
 * - Screen reader accessible data table
 * - WCAG 2.1 AA compliance
 *
 * Reference: Plan 180 Section 4.2
 */

import React, { Suspense, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useCostByProvider } from '@/hooks/useAnalytics';
import type { AnalyticsFilters } from '@/types/analytics.types';
import { formatCurrency, formatNumber } from '@/utils/format';

interface ProviderCostChartProps {
  filters: AnalyticsFilters;
}

export const ProviderCostChart: React.FC<ProviderCostChartProps> = ({ filters }) => {
  const { data, isLoading, isError } = useCostByProvider({
    period: filters.period,
    startDate: filters.startDate,
    endDate: filters.endDate,
    tier: filters.tier,
    models: filters.models,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.providers.map((provider) => ({
      name: provider.providerName,
      cost: provider.totalCost,
      requests: provider.requestCount,
      avgCost: provider.avgCostPerRequest,
      percentage: provider.percentage,
    }));
  }, [data]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6">
        <p className="text-red-600 dark:text-red-400 text-center" role="alert">
          Failed to load provider cost data.
        </p>
      </div>
    );
  }

  const providerColors = [
    '#2563EB', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
  ];

  return (
    <div
      className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6"
      role="region"
      aria-labelledby="provider-cost-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 id="provider-cost-heading" className="text-lg font-semibold text-deep-navy-800 dark:text-white">
          Provider Cost Breakdown
        </h2>
        <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300">
          Total: {formatCurrency(data.totalCost)}
        </span>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            aria-label="Provider cost breakdown bar chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              tickFormatter={(value) => `$${formatNumber(value)}`}
              stroke="#6B7280"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={75}
              stroke="#6B7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={providerColors[index % providerColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Suspense>

      {/* Screen reader accessible data table */}
      <table className="sr-only">
        <caption>Provider costs in USD</caption>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Total Cost</th>
            <th>Requests</th>
            <th>Avg Cost</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.providers.map((provider, index) => (
            <tr key={provider.providerId || `provider-${index}`}>
              <td>{provider.providerName}</td>
              <td>{formatCurrency(provider.totalCost ?? 0)}</td>
              <td>{formatNumber(provider.requestCount ?? 0)}</td>
              <td>{formatCurrency(provider.avgCostPerRequest ?? 0)}</td>
              <td>{(provider.percentage ?? 0).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Custom Tooltip Component
 */
const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div
      className="bg-white dark:bg-deep-navy-800 border border-deep-navy-200 dark:border-deep-navy-700 rounded-lg shadow-lg p-3"
      style={{ minWidth: '200px' }}
    >
      <p className="text-body-sm font-semibold text-deep-navy-800 dark:text-white mb-2">
        {data.name}
      </p>
      <div className="space-y-1 text-body-sm">
        <div className="flex items-center justify-between">
          <span className="text-deep-navy-600 dark:text-deep-navy-300">Total Cost:</span>
          <span className="font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.cost)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-deep-navy-600 dark:text-deep-navy-300">Requests:</span>
          <span className="font-semibold text-deep-navy-800 dark:text-white">
            {formatNumber(data.requests)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-deep-navy-600 dark:text-deep-navy-300">Avg Cost:</span>
          <span className="font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.avgCost)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-deep-navy-200 dark:border-deep-navy-700 pt-1 mt-1">
          <span className="text-deep-navy-600 dark:text-deep-navy-300">% of Total:</span>
          <span className="font-semibold text-deep-navy-800 dark:text-white">
            {data.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6 animate-pulse">
      <div className="h-6 w-48 bg-deep-navy-200 dark:bg-deep-navy-700 rounded mb-4"></div>
      <div className="h-[300px] bg-deep-navy-100 dark:bg-deep-navy-900 rounded"></div>
    </div>
  );
};
