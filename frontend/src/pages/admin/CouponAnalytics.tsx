/**
 * Coupon Analytics Page
 *
 * Data-driven insights for coupon performance and fraud detection
 *
 * Features:
 * - Key metrics cards (redemptions, discount value, conversion rate, fraud rate)
 * - Top performing coupons table
 * - Fraud detection dashboard
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  Check,
  X,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FraudSeverityBadge from '@/components/plan111/FraudSeverityBadge';
import { plan111API } from '@/api/plan111';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDateTime,
} from '@/lib/plan111.utils';
import type {
  CouponAnalyticsMetrics,
  TopPerformingCoupon,
  FraudDetectionEvent,
  FraudSeverity,
  FraudResolution,
} from '@rephlo/shared-types';

function CouponAnalytics() {
  // Data state
  const [metrics, setMetrics] = useState<CouponAnalyticsMetrics | null>(null);
  const [topCoupons, setTopCoupons] = useState<TopPerformingCoupon[]>([]);
  const [fraudEvents, setFraudEvents] = useState<FraudDetectionEvent[]>([]);

  // UI state
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [isLoadingFraud, setIsLoadingFraud] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state for fraud events
  const [filterSeverity, setFilterSeverity] = useState<FraudSeverity | ''>('');
  const [filterStatus, setFilterStatus] = useState<FraudResolution | ''>('');

  // Load data
  useEffect(() => {
    loadMetrics();
    loadTopCoupons();
    loadFraudEvents();
  }, []);

  useEffect(() => {
    loadFraudEvents();
  }, [filterSeverity, filterStatus]);

  const loadMetrics = async () => {
    setIsLoadingMetrics(true);
    setError(null);
    try {
      const data = await plan111API.getCouponAnalytics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load metrics');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadTopCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const data = await plan111API.getTopPerformingCoupons(10);
      setTopCoupons(data);
    } catch (err: any) {
      console.error('Failed to load top coupons:', err);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const loadFraudEvents = async () => {
    setIsLoadingFraud(true);
    try {
      const filters = {
        severity: filterSeverity || undefined,
        status: filterStatus || undefined,
      };

      const response = await plan111API.listFraudEvents(filters, 0, 50);
      setFraudEvents(response.events);
    } catch (err: any) {
      console.error('Failed to load fraud events:', err);
    } finally {
      setIsLoadingFraud(false);
    }
  };

  const handleRefresh = () => {
    loadMetrics();
    loadTopCoupons();
    loadFraudEvents();
  };

  const handleReviewFraudEvent = async (
    eventId: string,
    resolution: string
  ) => {
    try {
      await plan111API.reviewFraudEvent(eventId, resolution);
      setSuccessMessage('Fraud event reviewed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadFraudEvents();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to review fraud event'
      );
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">
            Coupon Analytics
          </h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Performance metrics and fraud detection dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Key Metrics Cards */}
      {isLoadingMetrics ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Total Redemptions
            </div>
            <div className="mt-2 text-3xl font-bold text-deep-navy-800 dark:text-white">
              {formatNumber(metrics.total_redemptions)}
            </div>
            {metrics.month_over_month_change?.redemptions !== undefined && (
              <div
                className={cn(
                  'mt-1 flex items-center text-sm',
                  metrics.month_over_month_change.redemptions >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {metrics.month_over_month_change.redemptions >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {formatPercentage(
                  Math.abs(metrics.month_over_month_change.redemptions)
                )}{' '}
                MoM
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Total Discount Value
            </div>
            <div className="mt-2 text-3xl font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(metrics.total_discount_value)}
            </div>
            {metrics.month_over_month_change?.discount_value !==
              undefined && (
              <div
                className={cn(
                  'mt-1 flex items-center text-sm',
                  metrics.month_over_month_change.discount_value >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {metrics.month_over_month_change.discount_value >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {formatPercentage(
                  Math.abs(metrics.month_over_month_change.discount_value)
                )}{' '}
                MoM
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Avg Discount/Redemption
            </div>
            <div className="mt-2 text-3xl font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(metrics.average_discount_per_redemption)}
            </div>
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Conversion Rate
            </div>
            <div
              className={cn(
                'mt-2 text-3xl font-bold',
                metrics.conversion_rate > 10
                  ? 'text-green-600'
                  : 'text-deep-navy-800 dark:text-white'
              )}
            >
              {formatPercentage(metrics.conversion_rate)}
            </div>
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Fraud Detection Rate
            </div>
            <div
              className={cn(
                'mt-2 text-3xl font-bold',
                metrics.fraud_detection_rate > 5
                  ? 'text-red-600'
                  : 'text-deep-navy-800 dark:text-white'
              )}
            >
              {formatPercentage(metrics.fraud_detection_rate)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Top Performing Coupons */}
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
        <div className="px-6 py-4 border-b border-deep-navy-200 dark:border-deep-navy-700">
          <h2 className="text-lg font-semibold text-deep-navy-800 dark:text-white">
            Top Performing Coupons
          </h2>
        </div>
        {isLoadingCoupons ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : topCoupons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-deep-navy-500 dark:text-deep-navy-300">No coupon data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
              <thead className="bg-deep-navy-50 dark:bg-deep-navy-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Redemptions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Discount Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Avg Discount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-deep-navy-800 divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                {topCoupons.map((coupon, index) => (
                  <tr key={index} className="hover:bg-deep-navy-50 dark:bg-deep-navy-900">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-deep-navy-800 dark:text-white">
                      {coupon.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800 dark:text-white">
                      {formatNumber(coupon.redemptions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800 dark:text-white">
                      {formatCurrency(coupon.discount_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800 dark:text-white">
                      {formatPercentage(coupon.conversion_rate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800 dark:text-white">
                      {formatCurrency(coupon.average_discount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fraud Detection Dashboard */}
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
        <div className="px-6 py-4 border-b border-deep-navy-200 dark:border-deep-navy-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-deep-navy-800 dark:text-white">
              Fraud Detection Events
            </h2>
            <div className="flex gap-4">
              <select
                value={filterSeverity}
                onChange={(e) =>
                  setFilterSeverity(e.target.value as FraudSeverity | '')
                }
                className="w-full h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
              >
                <option value="">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FraudResolution | '')
                }
                className="w-full h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="legitimate">Legitimate</option>
                <option value="block_user">Block User</option>
                <option value="block_coupon">Block Coupon</option>
                <option value="block_ip">Block IP</option>
                <option value="false_positive">False Positive</option>
              </select>
            </div>
          </div>
        </div>
        {isLoadingFraud ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : fraudEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-deep-navy-500 dark:text-deep-navy-300">No fraud events detected</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
              <thead className="bg-deep-navy-50 dark:bg-deep-navy-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Coupon Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    User Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Detection Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Detected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-deep-navy-500 dark:text-deep-navy-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-deep-navy-800 divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                {fraudEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-deep-navy-50 dark:bg-deep-navy-900">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-deep-navy-800 dark:text-white">
                      {event.coupon_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-500 dark:text-deep-navy-300">
                      {event.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800 dark:text-white">
                      {event.detection_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <FraudSeverityBadge severity={event.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-500 dark:text-deep-navy-300">
                      {formatDateTime(event.detected_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          event.status === 'pending' &&
                            'bg-yellow-100 text-yellow-800',
                          event.status === 'legitimate' &&
                            'bg-green-100 text-green-800',
                          event.status === 'false_positive' &&
                            'bg-blue-100 text-blue-800',
                          (event.status === 'block_user' ||
                            event.status === 'block_coupon' ||
                            event.status === 'block_ip') &&
                            'bg-red-100 text-red-800'
                        )}
                      >
                        {event.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {event.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleReviewFraudEvent(
                                event.id,
                                'legitimate'
                              )
                            }
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Legitimate"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleReviewFraudEvent(
                                event.id,
                                'false_positive'
                              )
                            }
                            className="text-blue-600 hover:text-blue-900"
                            title="Mark as False Positive"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            className="text-deep-navy-600 dark:text-deep-navy-200 hover:text-deep-navy-800 dark:text-white"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CouponAnalytics;
