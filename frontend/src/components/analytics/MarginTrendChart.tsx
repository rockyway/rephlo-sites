/**
 * MarginTrendChart Component
 *
 * Line chart showing gross margin trends over time with moving averages.
 *
 * Features:
 * - 3 lines (Gross Margin, 7-day MA, 30-day MA)
 * - Granularity selector (hour/day/week/month)
 * - Responsive layout
 * - Screen reader accessible
 * - Lazy-loaded Recharts
 *
 * Reference: Plan 180 Section 4.3
 */

import React, { Suspense, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMarginTrend } from '@/hooks/useAnalytics';
import type { AnalyticsFilters, Granularity } from '@/types/analytics.types';
import { formatCurrency, formatNumber } from '@/utils/format';

interface MarginTrendChartProps {
  filters: AnalyticsFilters;
}

export const MarginTrendChart: React.FC<MarginTrendChartProps> = ({ filters }) => {
  const [granularity, setGranularity] = useState<Granularity>('day');

  const { data, isLoading, isError } = useMarginTrend({
    period: filters.period,
    startDate: filters.startDate,
    endDate: filters.endDate,
    granularity,
    tier: filters.tier,
    providers: filters.providers,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.dataPoints.map((point) => ({
      ...point,
      timestamp: formatTimestamp(point.timestamp, granularity),
    }));
  }, [data, granularity]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6">
        <p className="text-red-600 dark:text-red-400 text-center" role="alert">
          Failed to load margin trend data.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6"
      role="region"
      aria-labelledby="margin-trend-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 id="margin-trend-heading" className="text-lg font-semibold text-deep-navy-800 dark:text-white">
          Margin Trend
        </h2>

        {/* Granularity Selector */}
        <div className="flex items-center gap-2 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-lg p-1">
          {(['hour', 'day', 'week', 'month'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1 rounded-md text-body-sm font-medium transition-colors capitalize ${
                granularity === g
                  ? 'bg-rephlo-blue text-white'
                  : 'text-deep-navy-600 dark:text-deep-navy-300 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800'
              }`}
              aria-pressed={granularity === g}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block mb-1">
            Peak Margin
          </span>
          <span className="text-h4 font-bold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.summary.peakMargin)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block mb-1">
            Avg Margin
          </span>
          <span className="text-h4 font-bold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.summary.avgMargin)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block mb-1">
            Trend
          </span>
          <span className={`text-h4 font-bold capitalize ${getTrendColor(data.summary.trend)}`}>
            {data.summary.trend}
          </span>
        </div>
      </div>

      <Suspense fallback={<div className="h-[400px] bg-deep-navy-100 dark:bg-deep-navy-900 rounded animate-pulse"></div>}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="timestamp"
              stroke="#6B7280"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#6B7280"
              tickFormatter={(value) => `$${formatNumber(value)}`}
              label={{ value: 'Gross Margin (USD)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              formatter={(value) => (
                <span className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="grossMargin"
              stroke="#2563EB"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Gross Margin"
            />
            <Line
              type="monotone"
              dataKey="runningAvg7Day"
              stroke="#06B6D4"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="7-day MA"
            />
            <Line
              type="monotone"
              dataKey="runningAvg30Day"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="30-day MA"
            />
          </LineChart>
        </ResponsiveContainer>
      </Suspense>

      {/* Screen reader accessible data table */}
      <table className="sr-only">
        <caption>Margin trend over time</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Gross Margin</th>
            <th>7-day MA</th>
            <th>30-day MA</th>
          </tr>
        </thead>
        <tbody>
          {data.dataPoints.map((point, index) => (
            <tr key={index}>
              <td>{point.timestamp}</td>
              <td>{formatCurrency(point.grossMargin)}</td>
              <td>{point.runningAvg7Day ? formatCurrency(point.runningAvg7Day) : 'N/A'}</td>
              <td>{point.runningAvg30Day ? formatCurrency(point.runningAvg30Day) : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Format timestamp based on granularity
 */
const formatTimestamp = (timestamp: string, granularity: Granularity): string => {
  const date = new Date(timestamp);

  if (granularity === 'hour') {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
  } else if (granularity === 'day') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (granularity === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
};

/**
 * Get trend color
 */
const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable'): string => {
  if (trend === 'increasing') return 'text-green-600';
  if (trend === 'decreasing') return 'text-red-600';
  return 'text-deep-navy-600';
};

/**
 * Custom Tooltip Component
 */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-deep-navy-800 border border-deep-navy-200 dark:border-deep-navy-700 rounded-lg shadow-lg p-3">
      <p className="text-body-sm font-semibold text-deep-navy-800 dark:text-white mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300">{entry.name}:</span>
            <span className="text-body-sm font-semibold text-deep-navy-800 dark:text-white">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
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
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
        <div className="h-8 w-48 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
            <div className="h-6 w-24 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
          </div>
        ))}
      </div>
      <div className="h-[400px] bg-deep-navy-100 dark:bg-deep-navy-900 rounded"></div>
    </div>
  );
};
