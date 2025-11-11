/**
 * Proration Tracking Page
 *
 * Monitor all mid-cycle tier changes with proration calculations and financial impact.
 *
 * Features:
 * - Proration events list with filters
 * - Quick stats (Total Prorations, Net Revenue, Avg Net Charge, Pending)
 * - Proration preview tool
 * - Actions (View Calculation, Reverse Proration, View Stripe Invoice)
 * - Analytics charts (Revenue Trend, Upgrade vs Downgrade, Top Tier Paths)
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  DollarSign,
  TrendingUp,
  Clock,
  ExternalLink,
  AlertCircle,
  X as XIcon,
  Calculator,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ConfirmationModal, TierBadge } from '@/components/plan109';
import { ProrationChangeTypeBadge, ProrationCalculationModal } from '@/components/plan110';
import { prorationApi } from '@/api/plan110';
import {
  ProrationChangeType,
  ProrationStatus,
  type ProrationEvent,
  type ProrationStats,
  type ProrationCalculationBreakdown,
} from '@/types/plan110.types';
import { formatCurrency, formatNumber } from '@/lib/plan109.utils';
import { formatDate, formatNetCharge } from '@/lib/plan110.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

function ProrationTracking() {
  // State
  const [prorations, setProrations] = useState<ProrationEvent[]>([]);
  const [stats, setStats] = useState<ProrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterChangeType, setFilterChangeType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'changeDate' | 'netCharge' | 'changeType'>('changeDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedProration, setSelectedProration] = useState<ProrationEvent | null>(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [calculationBreakdown, setCalculationBreakdown] = useState<ProrationCalculationBreakdown | null>(
    null
  );
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [filterChangeType, filterStatus, searchQuery, page]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load prorations and stats in parallel
      const [prorationsResponse, statsData] = await Promise.all([
        prorationApi.getAllProrations({
          changeType: filterChangeType as ProrationChangeType || undefined,
          status: filterStatus as ProrationStatus || undefined,
          search: searchQuery || undefined,
          page,
          limit,
        }),
        prorationApi.getStats(),
      ]);

      setProrations(prorationsResponse.data);
      setTotalPages(prorationsResponse.totalPages);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load proration events');
    } finally {
      setIsLoading(false);
    }
  };

  // Load calculation breakdown
  const loadCalculationBreakdown = async (prorationId: string) => {
    try {
      const breakdown = await prorationApi.getCalculationBreakdown(prorationId);
      setCalculationBreakdown(breakdown);
      setShowCalculationModal(true);
    } catch (err: any) {
      setError('Failed to load calculation details');
      setTimeout(() => setError(null), 5000);
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

  const handleReverseProration = async (reason: string | undefined) => {
    if (!selectedProration || !reason) return;

    setIsProcessing(true);
    try {
      await prorationApi.reverseProration(selectedProration.id, {
        prorationId: selectedProration.id,
        reason,
      });

      setSuccessMessage('Proration reversed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
      setShowReverseModal(false);
      setSelectedProration(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reverse proration');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sort prorations
  const sortedProrations = [...prorations].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'changeDate':
        compareValue = new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime();
        break;
      case 'netCharge':
        compareValue = a.netCharge - b.netCharge;
        break;
      case 'changeType':
        compareValue = a.eventType.localeCompare(b.eventType);
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
          <h1 className="text-h1 font-bold text-deep-navy-800">Proration Tracking</h1>
          <p className="text-body text-deep-navy-500 mt-1">
            Monitor mid-cycle tier changes, proration calculations, and financial impact
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
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total Prorations This Month</h3>
                <Calculator className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatNumber(stats.totalProrations)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Net Proration Revenue</h3>
                <DollarSign
                  className={cn('h-5 w-5', stats.netRevenue >= 0 ? 'text-green-600' : 'text-red-600')}
                />
              </div>
              <p
                className={cn(
                  'text-h2 font-bold',
                  stats.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {stats.netRevenue >= 0 ? '+' : ''}
                {formatCurrency(stats.netRevenue, 0)}
              </p>
              <p className="text-caption text-deep-navy-500 mt-1">
                {stats.netRevenue >= 0 ? 'Collected' : 'Refunded'}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Average Net Charge</h3>
                <TrendingUp className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(stats.avgNetCharge)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Pending Prorations</h3>
                <Clock
                  className={cn('h-5 w-5', stats.pendingProrations > 0 ? 'text-amber-600' : 'text-deep-navy-400')}
                />
              </div>
              <p
                className={cn(
                  'text-h2 font-bold',
                  stats.pendingProrations > 0 ? 'text-amber-600' : 'text-deep-navy-800'
                )}
              >
                {stats.pendingProrations}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mb-6">
          <h3 className="text-h4 font-semibold text-deep-navy-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Change Type Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">Change Type</label>
              <select
                value={filterChangeType}
                onChange={(e) => {
                  setFilterChangeType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Types</option>
                <option value={ProrationChangeType.UPGRADE}>Upgrade</option>
                <option value={ProrationChangeType.DOWNGRADE}>Downgrade</option>
                <option value={ProrationChangeType.CYCLE_CHANGE}>Billing Cycle Change</option>
                <option value={ProrationChangeType.MIGRATION}>Migration</option>
                <option value={ProrationChangeType.CANCELLATION}>Cancellation</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Status</option>
                <option value={ProrationStatus.PENDING}>Pending</option>
                <option value={ProrationStatus.APPLIED}>Applied</option>
                <option value={ProrationStatus.FAILED}>Failed</option>
                <option value={ProrationStatus.REVERSED}>Reversed</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">Search</label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by user email or subscription ID..."
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deep-navy-400" />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterChangeType || filterStatus || searchQuery) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-body-sm text-deep-navy-600">Active filters:</span>
              {filterChangeType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-navy-100 text-deep-navy-700 rounded text-caption">
                  Type: {filterChangeType}
                  <button onClick={() => setFilterChangeType('')}>
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
                  setFilterChangeType('');
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

        {/* Prorations Table */}
        <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : sortedProrations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-body text-deep-navy-500">No proration events found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      User Email
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      From Tier
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      To Tier
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('changeType')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Change Type
                        {sortBy === 'changeType' &&
                          (sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Days Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Unused Credit
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      New Tier Cost
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('netCharge')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Net Charge
                        {sortBy === 'netCharge' &&
                          (sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('changeDate')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Change Date
                        {sortBy === 'changeDate' &&
                          (sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-100">
                  {sortedProrations.map((proration) => {
                    const netChargeData = formatNetCharge(proration.netCharge);

                    return (
                      <tr key={proration.id} className="hover:bg-deep-navy-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-800">
                            {proration.user?.email || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {proration.fromTier ? (
                            <TierBadge tier={proration.fromTier} />
                          ) : (
                            <span className="text-body-sm text-deep-navy-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {proration.toTier ? (
                            <TierBadge tier={proration.toTier} />
                          ) : (
                            <span className="text-body-sm text-deep-navy-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <ProrationChangeTypeBadge type={proration.eventType} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700">{proration.daysRemaining} days</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-green-600 font-medium">
                            {formatCurrency(proration.unusedCredit)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-rephlo-blue font-medium">
                            {formatCurrency(proration.newTierCost)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('text-body font-semibold', netChargeData.color)}>
                            {netChargeData.sign}
                            {netChargeData.formatted}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body-sm text-deep-navy-600">
                            {formatDate(proration.changeDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
                              proration.status === ProrationStatus.APPLIED
                                ? 'text-green-600 bg-green-50 border-green-200'
                                : proration.status === ProrationStatus.FAILED
                                ? 'text-red-600 bg-red-50 border-red-200'
                                : proration.status === ProrationStatus.REVERSED
                                ? 'text-gray-600 bg-gray-50 border-gray-200'
                                : 'text-yellow-600 bg-yellow-50 border-yellow-200'
                            )}
                          >
                            {proration.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => loadCalculationBreakdown(proration.id)}
                            >
                              View Calculation
                            </Button>
                            {proration.stripeInvoiceId && (
                              <a
                                href={`https://dashboard.stripe.com/invoices/${proration.stripeInvoiceId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="ghost">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                            {proration.status === ProrationStatus.APPLIED && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedProration(proration);
                                  setShowReverseModal(true);
                                }}
                              >
                                Reverse
                              </Button>
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

      {/* Proration Calculation Modal */}
      {calculationBreakdown && (
        <ProrationCalculationModal
          isOpen={showCalculationModal}
          onClose={() => {
            setShowCalculationModal(false);
            setCalculationBreakdown(null);
          }}
          calculation={calculationBreakdown}
        />
      )}

      {/* Reverse Proration Modal */}
      <ConfirmationModal
        isOpen={showReverseModal}
        onClose={() => {
          setShowReverseModal(false);
          setSelectedProration(null);
        }}
        onConfirm={handleReverseProration}
        title="Reverse Proration"
        description={`Are you sure you want to reverse this proration for ${
          selectedProration?.user?.email || 'this user'
        }? This will undo the tier change and refund/charge as necessary.`}
        confirmText="Reverse Proration"
        requireReason
        reasonLabel="Reversal Reason"
        reasonPlaceholder="Enter reason for reversal..."
        variant="warning"
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default ProrationTracking;
