import { useState, useEffect } from 'react';
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  Activity,
  PieChart,
  BarChart3,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MetricsCard from '@/components/admin/MetricsCard';
import { MarginBadge } from '@/components/admin/PricingComponents';
import { pricingApi, type MarginMetrics, type MarginByTier, type MarginByProvider, type TopModel } from '@/api/pricing';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import { safeToFixed } from '@/lib/safeUtils';

/**
 * MarginTracking Page
 *
 * Real-time profitability monitoring dashboard.
 * Features:
 * - Overall margin metrics
 * - Margin by tier breakdown
 * - Margin by provider breakdown
 * - Top models by usage
 * - Alerts for off-target margins
 */
function MarginTracking() {
  const [metrics, setMetrics] = useState<MarginMetrics | null>(null);
  const [tierMargins, setTierMargins] = useState<MarginByTier[]>([]);
  const [providerMargins, setProviderMargins] = useState<MarginByProvider[]>([]);
  const [topModels, setTopModels] = useState<TopModel[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    loadAllData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);

    const end = new Date();
    const start = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

    const range = {
      start: start.toISOString(),
      end: end.toISOString(),
    };

    try {
      const [metricsData, tiersData, providersData, modelsData] = await Promise.all([
        pricingApi.getMarginMetrics(range),
        pricingApi.getMarginByTier(range),
        pricingApi.getMarginByProvider(range),
        pricingApi.getTopModelsByUsage(10, range),
      ]);

      // Backend wraps responses in { success: true, data: {...} }
      // Unwrap data if wrapped
      const unwrap = (response: any) => response?.data || response;

      const metricsUnwrapped = unwrap(metricsData);
      const tiersUnwrapped = unwrap(tiersData);
      const providersUnwrapped = unwrap(providersData);
      const modelsUnwrapped = unwrap(modelsData);

      setMetrics(metricsUnwrapped);
      setTierMargins(tiersUnwrapped.tiers || tiersUnwrapped || []);
      setProviderMargins(providersUnwrapped.providers || providersUnwrapped || []);
      setTopModels(modelsUnwrapped.models || modelsUnwrapped || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load margin data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_target':
      case 'healthy':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'below_target':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_target':
      case 'healthy':
        return 'text-green-600';
      case 'below_target':
      case 'warning':
        return 'text-amber-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-deep-navy-600';
    }
  };

  // Empty state detection helper
  const isEmptyData = (
    (metrics?.actualGrossMargin === 0 && metrics?.thisMonthVendorCost === 0 && metrics?.grossMarginDollars === 0) ||
    (!tierMargins || tierMargins.length === 0)
  );

  // Empty state component
  const EmptyMarginState = () => (
    <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-16 w-16 text-deep-navy-300 dark:text-deep-navy-600" />
        <div>
          <h3 className="text-h3 font-semibold text-deep-navy-800 dark:text-white mb-2">
            No Usage Data Yet
          </h3>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-300 max-w-md mx-auto">
            Profitability margins will appear here after users make LLM API requests.
            {dateRange !== '30' && (
              <span className="block mt-2 text-body-sm text-deep-navy-600 dark:text-deep-navy-400">
                Try selecting a different date range if you expect to see data.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">
            Margin Tracking
          </h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Real-time profitability monitoring and analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="flex h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20 focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button onClick={loadAllData} disabled={isLoading} variant="ghost">
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-body text-red-800">{error}</p>
        </div>
      )}

      {isLoading && !metrics ? (
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-12 text-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isEmptyData ? (
        <EmptyMarginState />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricsCard
              title="Actual Gross Margin"
              value={`${safeToFixed(metrics?.actualGrossMargin)}%`}
              subtitle={
                metrics?.variance !== undefined
                  ? `${(metrics.variance ?? 0) > 0 ? '+' : ''}${safeToFixed(metrics.variance ?? 0)}% vs target`
                  : undefined
              }
              icon={Activity}
              color={
                metrics?.status === 'on_target'
                  ? 'green'
                  : metrics?.status === 'below_target'
                  ? 'amber'
                  : 'blue'
              }
            >
              {metrics && (
                <div className="flex items-center justify-between pt-2 border-t border-deep-navy-100">
                  <span className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Target:</span>
                  <span className="text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    {safeToFixed(metrics.targetMargin)}%
                  </span>
                </div>
              )}
            </MetricsCard>

            <MetricsCard
              title="This Month Vendor Cost"
              value={`$${(metrics?.thisMonthVendorCost ?? 0).toLocaleString()}`}
              subtitle="Tokens consumed"
              icon={DollarSign}
              color="amber"
            >
              {metrics && metrics.creditValue !== undefined && (
                <div className="flex items-center justify-between pt-2 border-t border-deep-navy-100">
                  <span className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Credit Value:</span>
                  <span className="text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    ${(metrics.creditValue ?? 0).toLocaleString()}
                  </span>
                </div>
              )}
            </MetricsCard>

            <MetricsCard
              title="Gross Margin"
              value={`$${(metrics?.grossMarginDollars ?? 0).toLocaleString()}`}
              subtitle="Net contribution"
              icon={TrendingUp}
              color="green"
            >
              {metrics && (
                <div className="flex items-center justify-between pt-2 border-t border-deep-navy-100">
                  <span className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Status:</span>
                  <span className={cn('text-body-sm font-semibold', getStatusColor(metrics.status))}>
                    {metrics.status === 'on_target'
                      ? 'On Target'
                      : metrics.status === 'below_target'
                      ? 'Below Target'
                      : 'Above Target'}
                  </span>
                </div>
              )}
            </MetricsCard>
          </div>

          {/* Margin by Tier */}
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
            <div className="p-6 border-b border-deep-navy-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-rephlo-blue" />
                <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                  Margin by Tier
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Margin %
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Target %
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Variance
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Requests
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Vendor Cost
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                  {tierMargins && tierMargins.length > 0 ? (
                    tierMargins.map((tier) => (
                      <tr key={tier.tier} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-deep-navy-800 dark:text-white capitalize">
                            {tier.tier.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <MarginBadge marginPercent={tier.marginPercent ?? 0} targetMargin={tier.targetMargin ?? 0} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            {safeToFixed(tier.targetMargin)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {(tier.variance ?? 0) > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (tier.variance ?? 0) < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                            <span className={cn(
                              'text-body-sm font-medium',
                              (tier.variance ?? 0) > 0 ? 'text-green-600' : (tier.variance ?? 0) < 0 ? 'text-red-600' : 'text-deep-navy-600'
                            )}>
                              {(tier.variance ?? 0) > 0 ? '+' : ''}{safeToFixed(tier.variance ?? 0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            {(tier.requests ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            ${(tier.vendorCost ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(tier.status)}
                            <span className={cn('text-body-sm', getStatusColor(tier.status))}>
                              {tier.status === 'on_target' ? 'On Target' : tier.status === 'warning' ? 'Warning' : 'Critical'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <p className="text-body text-deep-navy-700 dark:text-deep-navy-300">
                          No tier data available for selected period.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Margin by Provider */}
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
            <div className="p-6 border-b border-deep-navy-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-rephlo-blue" />
                <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                  Margin by Provider
                </h2>
              </div>
            </div>
            <div className="p-6">
              {providerMargins && providerMargins.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providerMargins.map((provider) => (
                    <div
                      key={provider.providerId}
                      className="border border-deep-navy-200 dark:border-deep-navy-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-deep-navy-800 dark:text-white">
                          {provider.providerName}
                        </h3>
                        <MarginBadge marginPercent={provider.marginPercent ?? 0} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-body-sm">
                          <span className="text-deep-navy-700 dark:text-deep-navy-200">Requests:</span>
                          <span className="font-medium text-deep-navy-800 dark:text-white">
                            {(provider.requests ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-body-sm">
                          <span className="text-deep-navy-700 dark:text-deep-navy-200">Cost:</span>
                          <span className="font-medium text-deep-navy-800 dark:text-white">
                            ${(provider.vendorCost ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-body text-deep-navy-700 dark:text-deep-navy-300">
                    No provider data available for selected period.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Models by Usage */}
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
            <div className="p-6 border-b border-deep-navy-200">
              <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                Top Models by Usage
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Requests
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Tokens (M)
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Vendor Cost
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Margin %
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                  {topModels && topModels.length > 0 ? (
                    topModels.map((model) => (
                      <tr key={model.modelId} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-deep-navy-800 dark:text-white">
                            {model.modelName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            {(model.requests ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            {safeToFixed(model.tokensMillions ?? 0)}M
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            ${(model.vendorCost ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <MarginBadge marginPercent={model.marginPercent ?? 0} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(model.status)}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-body text-deep-navy-700 dark:text-deep-navy-300">
                          No model data available for selected period.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts Section */}
          {tierMargins.some((t) => t.status !== 'on_target') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-8">
              <h3 className="text-h4 font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Margin Alerts
              </h3>
              <div className="space-y-2">
                {tierMargins
                  .filter((t) => t.status !== 'on_target')
                  .map((tier) => (
                    <div key={tier.tier} className="bg-white dark:bg-deep-navy-800 rounded-md p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-deep-navy-800 dark:text-white capitalize">
                          {tier.tier.replace(/_/g, ' ')} tier margin {(tier.variance ?? 0) < 0 ? 'below' : 'above'} target by{' '}
                          {safeToFixed(Math.abs(tier.variance ?? 0))}%
                        </p>
                        <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">
                          Current: {safeToFixed(tier.marginPercent ?? 0)}% | Target: {safeToFixed(tier.targetMargin ?? 0)}%
                        </p>
                      </div>
                      <Button size="sm" variant="secondary">
                        Review Multiplier
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MarginTracking;
