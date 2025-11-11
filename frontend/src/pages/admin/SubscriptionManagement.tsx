/**
 * Subscription Management Page
 *
 * Central hub for viewing and managing all user subscriptions.
 *
 * Features:
 * - Subscription list with filters (tier, status, search)
 * - Quick stats (Active Subs, MRR, Past Due, Trial Conversions)
 * - Actions: View Details, Upgrade/Downgrade Tier, Cancel, Reactivate
 * - Pagination and sorting
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  X as XIcon,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TierBadge, StatusBadge, ConfirmationModal } from '@/components/plan109';
import { subscriptionApi } from '@/api/plan109';
import {
  SubscriptionTier,
  SubscriptionStatus,
  type Subscription,
  type SubscriptionStats,
} from '@/types/plan109.types';
import { formatCurrency, formatDate, formatNumber, calculateDaysBetween } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

function SubscriptionManagement() {
  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'tier' | 'status' | 'price' | 'billingDate'>('billingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelAtPeriodEnd] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [filterTier, filterStatus, searchQuery, page]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load subscriptions and stats in parallel
      const [subsResponse, statsData] = await Promise.all([
        subscriptionApi.getAllSubscriptions({
          tier: filterTier as SubscriptionTier || undefined,
          status: filterStatus as SubscriptionStatus || undefined,
          search: searchQuery || undefined,
          page,
          limit,
        }),
        subscriptionApi.getStats(),
      ]);

      setSubscriptions(subsResponse.data || []);
      setTotalPages(subsResponse.totalPages);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleCancelSubscription = async (reason: string | undefined) => {
    if (!selectedSubscription) return;

    setIsProcessing(true);
    try {
      await subscriptionApi.cancelSubscription(selectedSubscription.id, {
        subscriptionId: selectedSubscription.id,
        cancelAtPeriodEnd,
        reason,
      });

      setSuccessMessage(
        `Subscription ${cancelAtPeriodEnd ? 'will be cancelled at period end' : 'cancelled immediately'}`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
      setShowCancelModal(false);
      setSelectedSubscription(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (subscription: Subscription) => {
    try {
      await subscriptionApi.reactivateSubscription(subscription.id);
      setSuccessMessage('Subscription reactivated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reactivate subscription');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Sort subscriptions
  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'tier':
        compareValue = a.tier.localeCompare(b.tier);
        break;
      case 'status':
        compareValue = a.status.localeCompare(b.status);
        break;
      case 'price':
        compareValue = a.finalPriceUsd - b.finalPriceUsd;
        break;
      case 'billingDate':
        compareValue = new Date(a.nextBillingDate || a.currentPeriodEnd).getTime() -
                      new Date(b.nextBillingDate || b.currentPeriodEnd).getTime();
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800">
            Subscription Management
          </h1>
          <p className="text-body text-deep-navy-500 mt-1">
            View and manage all user subscriptions, tier changes, and cancellations
          </p>
        </div>
        <Button onClick={loadData} disabled={isLoading} variant="ghost">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total Active Subscriptions</h3>
                <Users className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatNumber(stats.totalActive)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">MRR</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(stats.mrr, 0)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Past Due Subscriptions</h3>
                <AlertCircle className={cn('h-5 w-5', stats.pastDueCount > 0 ? 'text-red-600' : 'text-deep-navy-400')} />
              </div>
              <p className={cn(
                'text-h2 font-bold',
                stats.pastDueCount > 0 ? 'text-red-600' : 'text-deep-navy-800'
              )}>
                {stats.pastDueCount}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Trial Conversions This Month</h3>
                <TrendingUp className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{stats.trialConversionsThisMonth}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mb-6">
          <h3 className="text-h4 font-semibold text-deep-navy-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tier Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Tier
              </label>
              <select
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Tiers</option>
                <option value={SubscriptionTier.FREE}>Free</option>
                <option value={SubscriptionTier.PRO}>Pro</option>
                <option value={SubscriptionTier.PRO_MAX}>Pro Max</option>
                <option value={SubscriptionTier.ENTERPRISE_PRO}>Enterprise Pro</option>
                <option value={SubscriptionTier.ENTERPRISE_MAX}>Enterprise Max</option>
                <option value={SubscriptionTier.PERPETUAL}>Perpetual</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Status</option>
                <option value={SubscriptionStatus.TRIAL}>Trial</option>
                <option value={SubscriptionStatus.ACTIVE}>Active</option>
                <option value={SubscriptionStatus.PAST_DUE}>Past Due</option>
                <option value={SubscriptionStatus.CANCELLED}>Cancelled</option>
                <option value={SubscriptionStatus.EXPIRED}>Expired</option>
                <option value={SubscriptionStatus.SUSPENDED}>Suspended</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by email or subscription ID..."
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deep-navy-400" />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterTier || filterStatus || searchQuery) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-body-sm text-deep-navy-600">Active filters:</span>
              {filterTier && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-navy-100 text-deep-navy-700 rounded text-caption">
                  Tier: {filterTier}
                  <button onClick={() => setFilterTier('')}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-navy-100 text-deep-navy-700 rounded text-caption">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus('')}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-navy-100 text-deep-navy-700 rounded text-caption">
                  Search: {searchQuery}
                  <button onClick={() => setSearchQuery('')}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setFilterTier('');
                  setFilterStatus('');
                  setSearchQuery('');
                }}
                className="text-caption text-rephlo-blue hover:text-rephlo-blue-600"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !sortedSubscriptions || sortedSubscriptions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-body text-deep-navy-500">No subscriptions found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      User Email
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('tier')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Tier
                        {sortBy === 'tier' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Status
                        {sortBy === 'status' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('price')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Price
                        {sortBy === 'price' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Credits
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Current Period
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('billingDate')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Next Billing
                        {sortBy === 'billingDate' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-100">
                  {sortedSubscriptions.map((subscription) => {
                    const daysUntilBilling = subscription.nextBillingDate
                      ? calculateDaysBetween(new Date(), subscription.nextBillingDate)
                      : null;

                    return (
                      <tr key={subscription.id} className="hover:bg-deep-navy-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-800">
                            {subscription.user?.email || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <TierBadge tier={subscription.tier} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={subscription.status} type="subscription" />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-body font-medium text-deep-navy-800">
                              {formatCurrency(subscription.finalPriceUsd)}
                            </span>
                            <span className="text-caption text-deep-navy-500 ml-1">
                              /{subscription.billingCycle === 'monthly' ? 'mo' : 'yr'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">
                            {formatNumber(subscription.monthlyCreditsAllocated)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-body-sm text-deep-navy-600">
                            <div>{formatDate(subscription.currentPeriodStart)}</div>
                            <div className="text-caption text-deep-navy-500">
                              to {formatDate(subscription.currentPeriodEnd)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {subscription.nextBillingDate ? (
                            <div className="text-body-sm">
                              <div className="text-deep-navy-700">{formatDate(subscription.nextBillingDate)}</div>
                              <div className={cn(
                                'text-caption',
                                daysUntilBilling && daysUntilBilling <= 7 ? 'text-amber-600' : 'text-deep-navy-500'
                              )}>
                                {daysUntilBilling && daysUntilBilling >= 0 ? `in ${daysUntilBilling} days` : 'Past due'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-body-sm text-deep-navy-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {subscription.status === SubscriptionStatus.CANCELLED ? (
                              <Button
                                size="sm"
                                onClick={() => handleReactivate(subscription)}
                              >
                                Reactivate
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedSubscription(subscription);
                                    setShowCancelModal(true);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Link to={`/admin/subscriptions/${subscription.id}`}>
                                  <Button size="sm">View</Button>
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-deep-navy-200 flex items-center justify-between">
              <p className="text-body-sm text-deep-navy-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

      {/* Cancel Subscription Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedSubscription(null);
        }}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription"
        description={`Are you sure you want to cancel this subscription for ${selectedSubscription?.user?.email}?`}
        confirmText="Cancel Subscription"
        requireReason
        reasonLabel="Cancellation Reason"
        reasonPlaceholder="Enter reason for cancellation..."
        variant="danger"
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default SubscriptionManagement;
