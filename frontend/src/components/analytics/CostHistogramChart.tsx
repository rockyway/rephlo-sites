/**
 * CostHistogramChart Component
 *
 * Histogram showing cost distribution with anomaly detection.
 * Reference: Plan 180 Section 4.4
 */

import React, { Suspense, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useCostDistribution } from '@/hooks/useAnalytics';
import type { AnalyticsFilters } from '@/types/analytics.types';
import { formatCurrency, formatNumber } from '@/utils/format';
import { AlertCircle } from 'lucide-react';

interface CostHistogramChartProps {
  filters: AnalyticsFilters;
}

export const CostHistogramChart: React.FC<CostHistogramChartProps> = ({ filters }) => {
  const { data, isLoading, isError } = useCostDistribution({
    period: filters.period,
    startDate: filters.startDate,
    endDate: filters.endDate,
    tier: filters.tier,
    providers: filters.providers,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.buckets.map((bucket) => ({
      range: `$${bucket.rangeMin.toFixed(2)}-$${bucket.rangeMax.toFixed(2)}`,
      count: bucket.requestCount,
      isAnomaly: false, // Buckets themselves aren't anomalies
    }));
  }, [data]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6">
        <p className="text-red-600 dark:text-red-400 text-center" role="alert">
          Failed to load cost distribution data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6">
      <h2 className="text-lg font-semibold text-deep-navy-800 dark:text-white mb-4">
        Cost per Request Distribution
      </h2>

      {/* Statistics Panel */}
      <div className="grid grid-cols-5 gap-4 mb-4 p-4 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-lg">
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block">Mean</span>
          <span className="text-body font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.statistics.mean)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block">Median</span>
          <span className="text-body font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.statistics.median)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block">Std Dev</span>
          <span className="text-body font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.statistics.stdDev)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block">P95</span>
          <span className="text-body font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.statistics.p95)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300 block">P99</span>
          <span className="text-body font-semibold text-deep-navy-800 dark:text-white">
            {formatCurrency(data.statistics.p99)}
          </span>
        </div>
      </div>

      <Suspense fallback={<div className="h-[300px] bg-deep-navy-100 dark:bg-deep-navy-900 rounded animate-pulse"></div>}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="range" stroke="#6B7280" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
            <YAxis stroke="#6B7280" label={{ value: 'Request Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#EF4444' : '#2563EB'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Suspense>

      {/* Anomalies Alert */}
      {data.anomalies.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-semibold text-red-800 dark:text-red-200">
              Anomalies Detected: {data.anomalies.length} requests &gt;3σ from mean
            </p>
            <p className="text-body-sm text-red-700 dark:text-red-300 mt-1">
              Highest cost: {formatCurrency(Math.max(...data.anomalies.map(a => a.cost)))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-deep-navy-800 border border-deep-navy-200 dark:border-deep-navy-700 rounded-lg shadow-lg p-3">
      <p className="text-body-sm font-semibold text-deep-navy-800 dark:text-white mb-1">{label}</p>
      <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300">
        Requests: <span className="font-semibold text-deep-navy-800 dark:text-white">{formatNumber(payload[0].value)}</span>
      </p>
    </div>
  );
};

const ChartSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6 animate-pulse">
    <div className="h-6 w-48 bg-deep-navy-200 dark:bg-deep-navy-700 rounded mb-4"></div>
    <div className="grid grid-cols-5 gap-4 mb-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-deep-navy-200 dark:bg-deep-navy-700 rounded"></div>
      ))}
    </div>
    <div className="h-[300px] bg-deep-navy-100 dark:bg-deep-navy-900 rounded"></div>
  </div>
);
