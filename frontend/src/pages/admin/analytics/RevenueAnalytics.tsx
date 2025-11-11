/**
 * RevenueAnalytics Page - Phase 4 Frontend
 *
 * Comprehensive revenue analytics dashboard with KPIs, charts, and ROI analysis.
 *
 * Features:
 * - KPI Grid (Total Revenue, MRR, Perpetual Revenue, ARPU)
 * - Period Selector (7d, 30d, 90d, 1y)
 * - Revenue Mix Chart (Pie chart: Subscription vs Perpetual vs Upgrades)
 * - Revenue Trend Chart (Line chart: 3 series over time)
 * - Conversion Funnel Chart (Free -> Paid -> Perpetual)
 * - Credit Usage by Model (Bar chart: Top 10 models)
 * - Coupon ROI Table (Campaign analysis with pagination)
 * - Auto-refresh every 5 minutes
 * - Deep Navy theme
 * - Responsive design
 * - Loading and error states
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Zap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
} from 'recharts';

import AdminStatsGrid, { StatCard } from '@/components/admin/data/AdminStatsGrid';
import AdminDataTable from '@/components/admin/data/AdminDataTable';
import AdminPagination from '@/components/admin/data/AdminPagination';
import { LoadingState, EmptyState } from '@/components/admin/utility';
import {
  revenueAnalyticsAPI,
  type CouponROIRow,
} from '@/api/admin';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Constants
// ============================================================================

const PERIOD_OPTIONS: Array<{ value: '7d' | '30d' | '90d' | '1y'; label: string }> = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

const REVENUE_MIX_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4'];
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  tertiary: '#06b6d4',
};

// ============================================================================
// Main Component
// ============================================================================

const RevenueAnalytics: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [couponPage, setCouponPage] = useState(1);
  const PAGE_SIZE = 10;

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Revenue KPIs
  const {
    data: kpisData,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKPIs,
  } = useQuery({
    queryKey: ['revenue-kpis', period],
    queryFn: () => revenueAnalyticsAPI.getRevenueKPIs(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Revenue Mix Chart
  const {
    data: revenueMixData,
    isLoading: revenueMixLoading,
    error: revenueMixError,
  } = useQuery({
    queryKey: ['revenue-mix', period],
    queryFn: () => revenueAnalyticsAPI.getRevenueMix(period),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Revenue Trend Chart
  const {
    data: revenueTrendData,
    isLoading: revenueTrendLoading,
    error: revenueTrendError,
  } = useQuery({
    queryKey: ['revenue-trend', period],
    queryFn: () => revenueAnalyticsAPI.getRevenueTrend(period),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Conversion Funnel
  const {
    data: funnelData,
    isLoading: funnelLoading,
    error: funnelError,
  } = useQuery({
    queryKey: ['conversion-funnel', period],
    queryFn: () => revenueAnalyticsAPI.getConversionFunnel(period),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Credit Usage by Model
  const {
    data: creditUsageData,
    isLoading: creditUsageLoading,
    error: creditUsageError,
  } = useQuery({
    queryKey: ['credit-usage', period],
    queryFn: () => revenueAnalyticsAPI.getCreditUsageByModel(period, 10),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Coupon ROI
  const {
    data: couponROIData,
    isLoading: couponROILoading,
    error: couponROIError,
  } = useQuery({
    queryKey: ['coupon-roi', period, couponPage],
    queryFn: () =>
      revenueAnalyticsAPI.getCouponROI(period, {
        limit: PAGE_SIZE,
        offset: (couponPage - 1) * PAGE_SIZE,
      }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // ============================================================================
  // Data Transformation
  // ============================================================================

  // Prepare KPI stats
  const kpiStats: StatCard[] = useMemo(
    () => [
      {
        label: 'Total Revenue',
        value: kpisData ? formatCurrency(kpisData.totalRevenue.value) : '-',
        change: kpisData?.totalRevenue.change,
        icon: <DollarSign className="w-5 h-5" />,
      },
      {
        label: 'MRR',
        value: kpisData ? formatCurrency(kpisData.mrr.value) : '-',
        change: kpisData?.mrr.change,
        icon: <TrendingUp className="w-5 h-5" />,
      },
      {
        label: 'Perpetual Revenue',
        value: kpisData ? formatCurrency(kpisData.perpetualRevenue.value) : '-',
        change: kpisData?.perpetualRevenue.change,
        icon: <BarChart3 className="w-5 h-5" />,
      },
      {
        label: 'ARPU',
        value: kpisData ? formatCurrency(kpisData.arpu.value) : '-',
        change: kpisData?.arpu.change,
        icon: <Zap className="w-5 h-5" />,
      },
    ],
    [kpisData]
  );

  // ============================================================================
  // Render
  // ============================================================================

  // Global error state
  if (kpisError || revenueMixError || revenueTrendError) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-red-500" />}
        title="Failed to load analytics"
        description="There was an error loading the revenue analytics data. Please try again."
        action={{ label: 'Retry', onClick: () => refetchKPIs() }}
      />
    );
  }

  // Loading state
  if (kpisLoading) {
    return <LoadingState fullPage message="Loading revenue analytics..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-navy-900">Revenue Analytics</h1>
          <p className="text-deep-navy-600 mt-1">Track revenue trends and performance metrics</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setPeriod(opt.value);
                  setCouponPage(1); // Reset pagination on period change
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-rephlo-blue text-white'
                    : 'bg-deep-navy-100 text-deep-navy-700 hover:bg-deep-navy-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetchKPIs()}
            className="p-2 hover:bg-deep-navy-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5 text-deep-navy-600" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <AdminStatsGrid stats={kpiStats} columns={4} />

      {/* Charts Grid - 2x2 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Mix Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
          <h2 className="text-lg font-semibold text-deep-navy-900 mb-4">Revenue Mix</h2>
          {revenueMixLoading ? (
            <LoadingState message="Loading chart..." />
          ) : revenueMixError || !revenueMixData?.data.length ? (
            <EmptyState title="No data available" description="No revenue data for this period." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueMixData.data as any}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percentage }) => `${name} ${formatPercentage((percentage as number) / 100)}`}
                >
                  {revenueMixData.data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={REVENUE_MIX_COLORS[index % 3]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
          <h2 className="text-lg font-semibold text-deep-navy-900 mb-4">Revenue Trend</h2>
          {revenueTrendLoading ? (
            <LoadingState message="Loading chart..." />
          ) : revenueTrendError || !revenueTrendData?.data.length ? (
            <EmptyState title="No data available" description="No trend data for this period." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrendData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_COLORS.primary}
                  name="Total Revenue"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="subscription"
                  stroke={CHART_COLORS.secondary}
                  name="Subscription"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="perpetual"
                  stroke={CHART_COLORS.tertiary}
                  name="Perpetual"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Conversion Funnel Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
          <h2 className="text-lg font-semibold text-deep-navy-900 mb-4">Conversion Funnel</h2>
          {funnelLoading ? (
            <LoadingState message="Loading chart..." />
          ) : funnelError || !funnelData?.stages.length ? (
            <EmptyState title="No data available" description="No funnel data for this period." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart
                data={funnelData.stages as any}
              >
                <Tooltip
                  formatter={(value) => formatNumber(value as number)}
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
                />
                <Funnel dataKey="count" fill={CHART_COLORS.primary}>
                  {funnelData.stages.map((_stage, index) => (
                    <Cell key={`cell-${index}`} fill={REVENUE_MIX_COLORS[index % 3]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          )}
          {/* Funnel Stats */}
          {funnelData?.stages && (
            <div className="mt-4 space-y-2 text-sm">
              {funnelData.stages.map((stage, index) => {
                const conversionRate =
                  index > 0 ? ((stage.count / funnelData.stages[index - 1].count) * 100).toFixed(1) : null;
                return (
                  <div key={stage.name} className="flex justify-between text-deep-navy-700">
                    {/* Breadcrumbs */}
                    <Breadcrumbs />

                    <span>{stage.name}</span>
                    <span className="font-medium">
                      {formatNumber(stage.count)} ({formatPercentage(stage.percentage / 100)})
                      {conversionRate && <span className="text-deep-navy-500"> → {conversionRate}%</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Credit Usage by Model */}
        <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
          <h2 className="text-lg font-semibold text-deep-navy-900 mb-4">Credit Usage by Model</h2>
          {creditUsageLoading ? (
            <LoadingState message="Loading chart..." />
          ) : creditUsageError || !creditUsageData?.data.length ? (
            <EmptyState title="No data available" description="No credit usage data for this period." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={creditUsageData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis dataKey="modelName" stroke="#6b7280" angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    formatter={(value) => formatNumber(value as number)}
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
                  />
                  <Bar dataKey="creditsConsumed" fill={CHART_COLORS.primary} name="Credits Consumed" />
                </BarChart>
              </ResponsiveContainer>

              {/* Summary Stats */}
              <div className="mt-4 pt-4 border-t border-deep-navy-200">
                <div className="flex justify-between text-sm">
                  <span className="text-deep-navy-600">Total Credits Consumed:</span>
                  <span className="font-semibold text-deep-navy-900">
                    {formatNumber(creditUsageData.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Coupon ROI Table */}
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-deep-navy-900">Coupon ROI Analysis</h2>
          {couponROIData && (
            <span className="text-sm text-deep-navy-600">
              Showing {(couponPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(couponPage * PAGE_SIZE, couponROIData.total)} of {couponROIData.total} campaigns
            </span>
          )}
        </div>

        {couponROILoading ? (
          <LoadingState message="Loading table..." />
        ) : couponROIError ? (
          <EmptyState title="Error loading data" description="Failed to load coupon ROI data." />
        ) : !couponROIData?.data.length ? (
          <EmptyState title="No coupon data" description="No coupon campaigns for this period." />
        ) : (
          <>
            <AdminDataTable<CouponROIRow>
              columns={[
                {
                  key: 'campaignName',
                  label: 'Campaign',
                  sortable: true,
                },
                {
                  key: 'issued',
                  label: 'Issued',
                  sortable: true,
                  render: (value) => formatNumber(value),
                },
                {
                  key: 'redeemed',
                  label: 'Redeemed',
                  sortable: true,
                  render: (value) => formatNumber(value),
                },
                {
                  key: 'redemptionRate',
                  label: 'Redemption Rate',
                  sortable: true,
                  render: (value) => formatPercentage(value / 100),
                },
                {
                  key: 'discountValue',
                  label: 'Discount',
                  sortable: true,
                  render: (value) => formatCurrency(value),
                },
                {
                  key: 'revenueGenerated',
                  label: 'Revenue',
                  sortable: true,
                  render: (value) => formatCurrency(value),
                },
                {
                  key: 'roi',
                  label: 'ROI %',
                  sortable: true,
                  render: (value) => {
                    const roiValue = Number(value).toFixed(1);
                    const isPositive = Number(roiValue) >= 0;
                    return (
                      <span className={isPositive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {roiValue}%
                      </span>
                    );
                  },
                },
              ]}
              data={couponROIData.data}
              loading={couponROILoading}
            />

            {/* Pagination */}
            {couponROIData.total > PAGE_SIZE && (
              <div className="mt-6">
                <AdminPagination
                  currentPage={couponPage}
                  totalPages={Math.ceil(couponROIData.total / PAGE_SIZE)}
                  totalItems={couponROIData.total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCouponPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RevenueAnalytics;
