/**
 * Platform Analytics Page
 *
 * Data-driven insights for business growth and optimization
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Award,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TierBadge } from '@/components/plan109';
import { analyticsApi } from '@/api/plan109';
import {
  DashboardMetrics,
  UserDistribution,
  RevenueTimeSeries,
  ConversionFunnel,
  TierTransition,
  SubscriptionTier,
  CreditsByModel,
} from '@/types/plan109.types';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  getTierDisplayName,
} from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';

export default function PlatformAnalytics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [userDistribution, setUserDistribution] = useState<UserDistribution[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTimeSeries[]>([]);
  const [creditsByModel, setCreditsByModel] = useState<CreditsByModel[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);
  const [tierTransitions, setTierTransitions] = useState<TierTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [
        metricsData,
        distributionData,
        trendData,
        creditsData,
        funnelData,
        transitionsData,
      ] = await Promise.all([
        analyticsApi.getDashboardMetrics(),
        analyticsApi.getUsersByTier(),
        analyticsApi.getRevenueTimeSeries('last_12_months'),
        analyticsApi.getCreditsByModel(),
        analyticsApi.getConversionFunnel(),
        analyticsApi.getTierTransitions(),
      ]);

      setMetrics(metricsData);
      setUserDistribution(distributionData.distribution);
      setRevenueTrend(trendData.timeSeries);
      setCreditsByModel(creditsData.models);
      setConversionFunnel(funnelData.funnel);
      setTierTransitions(transitionsData.transitions);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <div className="text-red-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-h4 font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
            <p className="text-body text-red-700">{error}</p>
            <Button onClick={loadData} variant="ghost" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate max revenue for chart scaling
  const maxRevenue = Math.max(...revenueTrend.map((t) => t.mrr));

  // Calculate total users for distribution percentages
  const totalUsers = userDistribution.reduce((sum, d) => sum + d.count, 0);

  // Prepare upgrade/downgrade data
  const upgrades = tierTransitions.filter((t) => t.type === 'upgrade');
  const downgrades = tierTransitions.filter((t) => t.type === 'downgrade');
  const totalUpgrades = upgrades.reduce((sum, t) => sum + t.count, 0);
  const totalDowngrades = downgrades.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800">Platform Analytics</h1>
          <p className="text-body text-deep-navy-600 mt-2">
            Data-driven insights for business growth and optimization
          </p>
        </div>
        <Button onClick={loadData} variant="secondary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Section 1: Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Active Users */}
          <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rephlo-blue/10 rounded-lg">
                <Users className="h-6 w-6 text-rephlo-blue" />
              </div>
              <h3 className="text-body font-medium text-deep-navy-600">Total Active Users</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-h2 font-bold text-deep-navy-800">{formatNumber(metrics.totalActiveUsers)}</p>
              <div className={cn(
                'flex items-center gap-1 text-caption',
                metrics.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {metrics.userGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {formatPercentage(Math.abs(metrics.userGrowth))} MoM
              </div>
            </div>
          </div>

          {/* MRR */}
          <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-body font-medium text-deep-navy-600">Monthly Recurring Revenue</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(metrics.mrr, 0)}</p>
              <div className={cn(
                'flex items-center gap-1 text-caption',
                metrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {metrics.mrrGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {formatPercentage(Math.abs(metrics.mrrGrowth))} MoM
              </div>
            </div>
          </div>

          {/* ARR */}
          <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-body font-medium text-deep-navy-600">Annual Recurring Revenue</h3>
            </div>
            <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(metrics.arr, 0)}</p>
          </div>

          {/* Monthly Churn Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'p-3 rounded-lg',
                metrics.monthlyChurnRate > 5 ? 'bg-red-100' : 'bg-green-100'
              )}>
                <Target className={cn(
                  'h-6 w-6',
                  metrics.monthlyChurnRate > 5 ? 'text-red-600' : 'text-green-600'
                )} />
              </div>
              <h3 className="text-body font-medium text-deep-navy-600">Monthly Churn Rate</h3>
            </div>
            <p className={cn(
              'text-h2 font-bold',
              metrics.monthlyChurnRate > 5 ? 'text-red-600' : 'text-green-600'
            )}>
              {formatPercentage(metrics.monthlyChurnRate)}
            </p>
          </div>

          {/* Trial Conversion Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'p-3 rounded-lg',
                metrics.trialConversionRate > 20 ? 'bg-green-100' : 'bg-amber-100'
              )}>
                <Award className={cn(
                  'h-6 w-6',
                  metrics.trialConversionRate > 20 ? 'text-green-600' : 'text-amber-600'
                )} />
              </div>
              <h3 className="text-body font-medium text-deep-navy-600">Trial Conversion Rate</h3>
            </div>
            <p className={cn(
              'text-h2 font-bold',
              metrics.trialConversionRate > 20 ? 'text-green-600' : 'text-amber-600'
            )}>
              {formatPercentage(metrics.trialConversionRate)}
            </p>
          </div>

          {/* Average Credit Utilization */}
          <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-body font-medium text-deep-navy-600">Avg Credit Utilization</h3>
            </div>
            <p className="text-h2 font-bold text-purple-600">
              {formatPercentage(metrics.avgCreditUtilization)}
            </p>
          </div>
        </div>
      )}

      {/* Section 2: User Distribution by Tier */}
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6 mb-8">
        <h2 className="text-h3 font-semibold text-deep-navy-800 mb-6">User Distribution by Tier</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart Visual Representation */}
          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Simple pie chart using conic-gradient */}
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `conic-gradient(${userDistribution
                    .map((d, index, arr) => {
                      const startPercent = arr.slice(0, index).reduce((sum, item) => sum + item.percentage, 0);
                      const endPercent = startPercent + d.percentage;
                      const colors: Record<SubscriptionTier, string> = {
                        [SubscriptionTier.FREE]: '#94a3b8',
                        [SubscriptionTier.PRO]: '#3b82f6',
                        [SubscriptionTier.PRO_MAX]: '#8b5cf6',
                        [SubscriptionTier.ENTERPRISE_PRO]: '#f59e0b',
                        [SubscriptionTier.ENTERPRISE_MAX]: '#ef4444',
                        [SubscriptionTier.PERPETUAL]: '#10b981',
                      };
                      return `${colors[d.tier]} ${startPercent}% ${endPercent}%`;
                    })
                    .join(', ')})`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-lg">
                  <p className="text-h3 font-bold text-deep-navy-800">{formatNumber(totalUsers)}</p>
                  <p className="text-caption text-deep-navy-600">Total Users</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col justify-center space-y-3">
            {userDistribution.map((d) => (
              <div key={d.tier} className="flex items-center justify-between p-3 bg-deep-navy-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TierBadge tier={d.tier} />
                  <span className="text-body text-deep-navy-700">{getTierDisplayName(d.tier)}</span>
                </div>
                <div className="text-right">
                  <p className="text-body font-semibold text-deep-navy-800">{formatNumber(d.count)}</p>
                  <p className="text-caption text-deep-navy-600">{formatPercentage(d.percentage)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Revenue Trend (Last 12 Months) */}
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6 mb-8">
        <h2 className="text-h3 font-semibold text-deep-navy-800 mb-6">Revenue Trend (Last 12 Months)</h2>
        <div className="relative h-80">
          {/* Simple bar chart */}
          <div className="flex items-end justify-between h-full gap-2">
            {revenueTrend.map((trend, index) => {
              const heightPercent = maxRevenue > 0 ? (trend.mrr / maxRevenue) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex items-end justify-center h-full">
                    <div
                      className="w-full bg-rephlo-blue rounded-t-md transition-all hover:bg-rephlo-blue/80 cursor-pointer group relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-deep-navy-800 text-white px-3 py-2 rounded-md shadow-lg whitespace-nowrap">
                          <p className="text-caption font-semibold">MRR: {formatCurrency(trend.mrr, 0)}</p>
                          <p className="text-caption opacity-75">ARR: {formatCurrency(trend.arr, 0)}</p>
                          <p className="text-caption opacity-75">Growth: {formatPercentage(trend.growth)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-caption text-deep-navy-600 transform -rotate-45 origin-top-left mt-2">
                    {trend.month}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 4: Credits by Model */}
      {creditsByModel.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6 mb-8">
          <h2 className="text-h3 font-semibold text-deep-navy-800 mb-6">Credit Usage by Model</h2>
          <div className="space-y-3">
            {creditsByModel.map((model) => {
              const totalCredits = creditsByModel.reduce((sum, m) => sum + m.creditsUsed, 0);
              const percentage = totalCredits > 0 ? (model.creditsUsed / totalCredits) * 100 : 0;
              return (
                <div key={model.modelName} className="flex items-center gap-4">
                  <div className="w-48">
                    <p className="text-body font-medium text-deep-navy-800">{model.modelName}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body-sm text-deep-navy-700">
                        {formatNumber(model.creditsUsed)} credits
                      </span>
                      <span className="text-body-sm font-semibold text-deep-navy-800">
                        {formatPercentage(percentage)}
                      </span>
                    </div>
                    <div className="w-full bg-deep-navy-100 rounded-full h-2">
                      <div
                        className="bg-rephlo-blue h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 5: Conversion Funnel */}
      {conversionFunnel.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6 mb-8">
          <h2 className="text-h3 font-semibold text-deep-navy-800 mb-6">Conversion Funnel</h2>
          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => {
              const isFirst = index === 0;
              const colorClass = index < 2 ? 'bg-blue-500' : 'bg-green-500';
              return (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-medium text-deep-navy-700">{stage.stage}</span>
                    <span className="text-body font-semibold text-deep-navy-800">{formatNumber(stage.count)}</span>
                  </div>
                  <div className="w-full bg-deep-navy-100 rounded-full h-8">
                    <div
                      className={cn(colorClass, 'h-8 rounded-full flex items-center justify-end pr-4')}
                      style={{ width: isFirst ? '100%' : `${stage.conversionRate}%` }}
                    >
                      <span className="text-caption font-medium text-white">
                        {formatPercentage(isFirst ? 100 : stage.conversionRate)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 6: Upgrade/Downgrade Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
        <h2 className="text-h3 font-semibold text-deep-navy-800 mb-6">Tier Transitions (Last 30 Days)</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Total Upgrades */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <ArrowUpCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-body font-semibold text-deep-navy-700">Total Upgrades</h3>
            </div>
            <p className="text-h2 font-bold text-green-600">{formatNumber(totalUpgrades)}</p>
          </div>

          {/* Total Downgrades */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-3 mb-3">
              <ArrowDownCircle className="h-6 w-6 text-red-600" />
              <h3 className="text-body font-semibold text-deep-navy-700">Total Downgrades</h3>
            </div>
            <p className="text-h2 font-bold text-red-600">{formatNumber(totalDowngrades)}</p>
          </div>
        </div>

        {/* Transition Details */}
        <div className="space-y-6">
          {/* Upgrades */}
          {upgrades.length > 0 && (
            <div>
              <h3 className="text-body font-semibold text-green-700 mb-3 flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5" />
                Upgrades
              </h3>
              <div className="space-y-2">
                {upgrades.map((transition, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-3">
                      <TierBadge tier={transition.fromTier} />
                      <span className="text-deep-navy-400">→</span>
                      <TierBadge tier={transition.toTier} />
                    </div>
                    <span className="text-body font-semibold text-green-700">{formatNumber(transition.count)} users</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Downgrades */}
          {downgrades.length > 0 && (
            <div>
              <h3 className="text-body font-semibold text-red-700 mb-3 flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5" />
                Downgrades
              </h3>
              <div className="space-y-2">
                {downgrades.map((transition, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                      <TierBadge tier={transition.fromTier} />
                      <span className="text-deep-navy-400">→</span>
                      <TierBadge tier={transition.toTier} />
                    </div>
                    <span className="text-body font-semibold text-red-700">{formatNumber(transition.count)} users</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No transitions */}
          {upgrades.length === 0 && downgrades.length === 0 && (
            <div className="text-center py-8 text-deep-navy-500">
              <p className="text-body">No tier transitions in the last 30 days</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
