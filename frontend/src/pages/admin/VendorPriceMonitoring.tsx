import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Bell,
  Eye,
  LineChart,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { pricingApi, type VendorPriceAlert, type VendorPricing } from '@/api/pricing';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

/**
 * VendorPriceMonitoring Page
 *
 * Dashboard for monitoring vendor price changes and managing alerts.
 * Features:
 * - Active price alerts with recommended actions
 * - Price history tracking
 * - Auto-apply settings
 * - Alert acknowledgment and management
 */
function VendorPriceMonitoring() {
  const [alerts, setAlerts] = useState<VendorPriceAlert[]>([]);
  const [_pricing, setPricing] = useState<VendorPricing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('new');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(5);
  const [approvalThreshold, setApprovalThreshold] = useState(10);

  useEffect(() => {
    loadAlerts();
    loadPricing();
  }, [filterStatus]);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await pricingApi.getVendorPriceAlerts({
        status: filterStatus || undefined,
      });
      // Backend wraps responses in { success, data }
      const unwrapped = (response as any).data || response;
      setAlerts(unwrapped.alerts || unwrapped || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load price alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPricing = async () => {
    try {
      const response = await pricingApi.listVendorPricing({ isActive: true });
      // Backend wraps responses in { success, data }
      const unwrapped = (response as any).data || response;
      setPricing(unwrapped.pricing || unwrapped || []);
    } catch (err: any) {
      console.error('Failed to load vendor pricing:', err);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await pricingApi.acknowledgeAlert(alertId);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a)));
      setSuccessMessage('Alert acknowledged');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to acknowledge alert');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleApplyRecommendation = async (alertId: string) => {
    try {
      await pricingApi.applyAlertRecommendation(alertId);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'applied' } : a)));
      setSuccessMessage('Multiplier adjustment applied');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply recommendation');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleIgnore = async (alertId: string) => {
    const reason = window.prompt('Enter reason for ignoring this alert:');
    if (!reason) return;

    try {
      await pricingApi.ignoreAlert(alertId, reason);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, status: 'ignored' } : a)));
      setSuccessMessage('Alert ignored');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to ignore alert');
      setTimeout(() => setError(null), 5000);
    }
  };

  const getAlertSeverity = (alert: VendorPriceAlert): 'critical' | 'warning' | 'info' => {
    const absChange = Math.abs(alert.changePercent);
    if (absChange >= 20) return 'critical';
    if (absChange >= 10) return 'warning';
    return 'info';
  };

  const severityColors = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-700',
    },
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
                Vendor Price Monitoring
              </h1>
              <p className="text-body text-deep-navy-700 mt-1">
                Track vendor price changes and manage pricing alerts
              </p>
            </div>
            <Button onClick={loadAlerts} disabled={isLoading} variant="ghost">
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {/* Auto-Apply Settings */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mb-8">
          <h2 className="text-h3 font-semibold text-deep-navy-800 mb-4">
            Alert Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border border-deep-navy-200 rounded-lg">
              <div>
                <p className="text-body-sm font-medium text-deep-navy-700">Auto-Apply</p>
                <p className="text-caption text-deep-navy-700">
                  Auto-apply for changes &lt; {autoApplyThreshold}%
                </p>
              </div>
              <button
                onClick={() => setAutoApplyEnabled(!autoApplyEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  autoApplyEnabled ? 'bg-rephlo-blue' : 'bg-deep-navy-300'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    autoApplyEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Auto-Apply Threshold
              </label>
              <select
                value={autoApplyThreshold}
                onChange={(e) => setAutoApplyThreshold(Number(e.target.value))}
                disabled={!autoApplyEnabled}
                className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 disabled:opacity-50"
              >
                <option value={3}>3%</option>
                <option value={5}>5%</option>
                <option value={7}>7%</option>
                <option value={10}>10%</option>
              </select>
            </div>

            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Require Approval &gt;
              </label>
              <select
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20"
              >
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
                <option value={25}>25%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['new', 'acknowledged', 'applied', 'ignored'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-4 py-2 rounded-md text-body-sm font-medium transition-colors',
                filterStatus === status
                  ? 'bg-rephlo-blue text-white'
                  : 'bg-white text-deep-navy-700 border border-deep-navy-200 hover:bg-deep-navy-50'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'new' && alerts && alerts.filter((a) => a.status === 'new').length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-rephlo-blue rounded-full">
                  {alerts.filter((a) => a.status === 'new').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active Alerts */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-lg border border-deep-navy-200 p-12 text-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="bg-white rounded-lg border border-deep-navy-200 p-12 text-center">
              <Bell className="h-12 w-12 text-deep-navy-300 mx-auto mb-4" />
              <p className="text-body text-deep-navy-700">No alerts found</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const severity = getAlertSeverity(alert);
              const colors = severityColors[severity];

              return (
                <div
                  key={alert.id}
                  className={cn('rounded-lg border p-6', colors.bg, colors.border)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={cn('text-h4 font-semibold', colors.text)}>
                          {alert.providerName} - {alert.modelName}
                        </h3>
                        <span className={cn('px-2 py-1 rounded-full text-caption font-medium', colors.badge)}>
                          {severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-body-sm">
                        <div className="flex items-center gap-1">
                          {alert.changeType === 'increase' ? (
                            <TrendingUp className="h-4 w-4 text-red-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-600" />
                          )}
                          <span className={cn(
                            'font-semibold',
                            alert.changeType === 'increase' ? 'text-red-700' : 'text-green-700'
                          )}>
                            {alert.changeType === 'increase' ? '+' : ''}{alert.changePercent}%
                          </span>
                        </div>
                        <span className={colors.text}>
                          ${alert.oldPrice.toFixed(6)} → ${alert.newPrice.toFixed(6)}
                        </span>
                        <span className={colors.text}>
                          Margin Impact: {alert.impactOnMargin > 0 ? '+' : ''}{alert.impactOnMargin.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-caption text-deep-navy-700 mt-2">
                        Detected {new Date(alert.detectedAt).toLocaleDateString()} at{' '}
                        {new Date(alert.detectedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {alert.recommendedAction && (
                    <div className="bg-white/50 rounded-md p-4 mb-4">
                      <p className="text-body-sm font-medium text-deep-navy-700 mb-2">
                        Recommended Action
                      </p>
                      <p className="text-body-sm text-deep-navy-600">{alert.recommendedAction}</p>
                      {alert.recommendedMultiplier && (
                        <p className="text-body-sm text-deep-navy-600 mt-1">
                          Suggested multiplier: <span className="font-semibold text-rephlo-blue">
                            {alert.recommendedMultiplier.toFixed(2)}×
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {alert.status === 'new' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApplyRecommendation(alert.id)}
                        disabled={!alert.recommendedMultiplier}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Auto-Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleIgnore(alert.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Ignore
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Price History Chart (Placeholder) */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mt-8">
          <h2 className="text-h3 font-semibold text-deep-navy-800 mb-4 flex items-center">
            <LineChart className="h-5 w-5 mr-2 text-rephlo-blue" />
            Price History
          </h2>
          <div className="text-center py-12 text-deep-navy-700">
            <LineChart className="h-12 w-12 mx-auto mb-4 text-deep-navy-300" />
            <p className="text-body">Price history chart will be displayed here</p>
            <p className="text-caption mt-1">Showing vendor price changes over time with margin overlay</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default VendorPriceMonitoring;
