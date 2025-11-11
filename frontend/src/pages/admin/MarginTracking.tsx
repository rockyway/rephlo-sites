import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
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

      setMetrics(metricsData);
      setTierMargins(tiersData.tiers);
      setProviderMargins(providersData.providers);
      setTopModels(modelsData.models);
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

  return (
    <div className="min-h-screen bg-deep-navy-50">
      {/* Breadcrumbs */}
      <Breadcrumbs />

{/* Header */}
      <header className="bg-white border-b border-deep-navy-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin"
                className="inline-flex items-center text-body text-rephlo-blue hover:text-rephlo-blue-600 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Admin
              </Link>
              <h1 className="text-h1 font-bold text-deep-navy-800">
                Margin Tracking
              </h1>
              <p className="text-body text-deep-navy-500 mt-1">
                Real-time profitability monitoring and analysis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex h-10 rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {isLoading && !metrics ? (
          <div className="bg-white rounded-lg border border-deep-navy-200 p-12 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <MetricsCard
                title="Actual Gross Margin"
                value={`${(metrics?.actualGrossMargin ?? 0).toFixed(1)}%`}
                subtitle={
                  metrics?.variance !== undefined
                    ? `${metrics.variance > 0 ? '+' : ''}${(metrics.variance ?? 0).toFixed(1)}% vs target`
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
                    <span className="text-caption text-deep-navy-500">Target:</span>
                    <span className="text-body-sm font-semibold text-deep-navy-700">
                      {(metrics.targetMargin ?? 0).toFixed(1)}%
                    </span>
                  </div>
                )}
              </MetricsCard>

              <MetricsCard
                title="This Month Vendor Cost"
                value={`$${metrics?.thisMonthVendorCost.toLocaleString() || 0}`}
                subtitle="Tokens consumed"
                icon={DollarSign}
                color="amber"
              >
                {metrics && (
                  <div className="flex items-center justify-between pt-2 border-t border-deep-navy-100">
                    <span className="text-caption text-deep-navy-500">Credit Value:</span>
                    <span className="text-body-sm font-semibold text-deep-navy-700">
                      ${metrics.creditValue.toLocaleString()}
                    </span>
                  </div>
                )}
              </MetricsCard>

              <MetricsCard
                title="Gross Margin"
                value={`$${metrics?.grossMarginDollars.toLocaleString() || 0}`}
                subtitle="Net contribution"
                icon={TrendingUp}
                color="green"
              >
                {metrics && (
                  <div className="flex items-center justify-between pt-2 border-t border-deep-navy-100">
                    <span className="text-caption text-deep-navy-500">Status:</span>
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
            <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden mb-8">
              <div className="p-6 border-b border-deep-navy-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-rephlo-blue" />
                  <h2 className="text-h3 font-semibold text-deep-navy-800">
                    Margin by Tier
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Margin %
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Target %
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Requests
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Vendor Cost
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-deep-navy-100">
                    {tierMargins.map((tier) => (
                      <tr key={tier.tier} className="hover:bg-deep-navy-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-deep-navy-800 capitalize">
                            {tier.tier.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <MarginBadge marginPercent={tier.marginPercent} targetMargin={tier.targetMargin} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            {(tier.targetMargin ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {tier.variance > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : tier.variance < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                            <span className={cn(
                              'text-body-sm font-medium',
                              tier.variance > 0 ? 'text-green-600' : tier.variance < 0 ? 'text-red-600' : 'text-deep-navy-600'
                            )}>
                              {tier.variance > 0 ? '+' : ''}{(tier.variance ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            {tier.requests.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            ${tier.vendorCost.toLocaleString()}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Margin by Provider */}
            <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden mb-8">
              <div className="p-6 border-b border-deep-navy-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-rephlo-blue" />
                  <h2 className="text-h3 font-semibold text-deep-navy-800">
                    Margin by Provider
                  </h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providerMargins.map((provider) => (
                    <div
                      key={provider.providerId}
                      className="border border-deep-navy-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-deep-navy-800">
                          {provider.providerName}
                        </h3>
                        <MarginBadge marginPercent={provider.marginPercent} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-body-sm">
                          <span className="text-deep-navy-500">Requests:</span>
                          <span className="font-medium text-deep-navy-800">
                            {provider.requests.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-body-sm">
                          <span className="text-deep-navy-500">Cost:</span>
                          <span className="font-medium text-deep-navy-800">
                            ${provider.vendorCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Models by Usage */}
            <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden">
              <div className="p-6 border-b border-deep-navy-200">
                <h2 className="text-h3 font-semibold text-deep-navy-800">
                  Top Models by Usage
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Requests
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Tokens (M)
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Vendor Cost
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Margin %
                      </th>
                      <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-deep-navy-100">
                    {topModels.map((model) => (
                      <tr key={model.modelId} className="hover:bg-deep-navy-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-deep-navy-800">
                            {model.modelName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            {model.requests.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            {(model.tokensMillions ?? 0).toFixed(1)}M
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            ${model.vendorCost.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <MarginBadge marginPercent={model.marginPercent} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(model.status)}
                          </div>
                        </td>
                      </tr>
                    ))}
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
                      <div key={tier.tier} className="bg-white rounded-md p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-deep-navy-800 capitalize">
                            {tier.tier.replace(/_/g, ' ')} tier margin {tier.variance < 0 ? 'below' : 'above'} target by{' '}
                            {Math.abs(tier.variance ?? 0).toFixed(1)}%
                          </p>
                          <p className="text-caption text-deep-navy-500">
                            Current: {(tier.marginPercent ?? 0).toFixed(1)}% | Target: {(tier.targetMargin ?? 0).toFixed(1)}%
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
      </main>
    </div>
  );
}

export default MarginTracking;
