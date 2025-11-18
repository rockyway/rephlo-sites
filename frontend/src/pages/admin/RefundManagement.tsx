/**
 * Refund Management Page
 *
 * Admin interface for managing subscription refund requests
 * - View pending refund requests
 * - Approve or reject refunds
 * - Track refund status and history
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Search, CheckCircle, XCircle, AlertCircle, X as XIcon } from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { refundApi } from '@/api/plan109';
import { formatCurrency, formatDate } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import type {
  SubscriptionRefund,
  RefundFilters,
  RefundStatus,
  RefundType,
  PaginatedResponse,
} from '@/types/plan109.types';

// Refund Status Badge Component
function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const getStatusDisplay = (status: RefundStatus): string => {
    const displays: Record<RefundStatus, string> = {
      pending: 'Pending',
      approved: 'Approved',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return displays[status];
  };

  const getStatusColor = (status: RefundStatus): string => {
    const colors: Record<RefundStatus, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
      approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      processing: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
      cancelled: 'bg-gray-100 dark:bg-gray-800/30 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-700',
    };
    return colors[status];
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border ${getStatusColor(
        status
      )}`}
    >
      {getStatusDisplay(status)}
    </span>
  );
}

// Refund Type Badge Component
function RefundTypeBadge({ type }: { type: RefundType }) {
  const getTypeDisplay = (type: RefundType): string => {
    const displays: Record<RefundType, string> = {
      manual_admin: 'Manual (Admin)',
      proration_credit: 'Proration Credit',
      chargeback: 'Chargeback',
    };
    return displays[type];
  };

  const getTypeColor = (type: RefundType): string => {
    const colors: Record<RefundType, string> = {
      manual_admin: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
      proration_credit: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700',
      chargeback: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
    };
    return colors[type];
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border ${getTypeColor(
        type
      )}`}
    >
      {getTypeDisplay(type)}
    </span>
  );
}

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-deep-navy-200 dark:border-deep-navy-700">
        <h3 className="text-lg font-semibold text-deep-navy-900 dark:text-white mb-2">{title}</h3>
        <p className="text-deep-navy-600 dark:text-deep-navy-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RefundManagement() {
  // State
  const [refunds, setRefunds] = useState<SubscriptionRefund[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<RefundStatus | ''>('');
  const [filterType, setFilterType] = useState<RefundType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Confirmation modals
  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    refund: SubscriptionRefund | null;
  }>({ isOpen: false, refund: null });

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    refund: SubscriptionRefund | null;
  }>({ isOpen: false, refund: null });

  // Load refunds
  const loadRefunds = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: RefundFilters = {
        page,
        limit,
      };

      if (filterStatus) filters.status = filterStatus as RefundStatus;
      if (filterType) filters.refundType = filterType as RefundType;
      if (searchQuery.trim()) {
        // Backend supports filtering by userId or subscriptionId
        // In a real implementation, you might want to search by email
        // For now, we'll just send the search query and let backend handle it
      }

      const response: PaginatedResponse<SubscriptionRefund> = await refundApi.getAllRefunds(
        filters
      );

      setRefunds(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load refund requests');
      console.error('Error loading refunds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when filters change
  useEffect(() => {
    loadRefunds();
  }, [filterStatus, filterType, searchQuery, page]);

  // Handle approve refund
  const handleApprove = async (refund: SubscriptionRefund) => {
    try {
      await refundApi.approveRefund(refund.id);
      setSuccessMessage('Refund approved successfully. Processing through Stripe.');
      setTimeout(() => setSuccessMessage(null), 5000);
      loadRefunds(); // Reload data
    } catch (err: any) {
      setError(err.message || 'Failed to approve refund');
    }
  };

  // Handle cancel refund
  const handleCancel = async (refund: SubscriptionRefund) => {
    try {
      await refundApi.cancelRefund(refund.id, {
        refundId: refund.id,
        reason: 'Cancelled by admin',
      });
      setSuccessMessage('Refund request cancelled successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
      loadRefunds(); // Reload data
    } catch (err: any) {
      setError(err.message || 'Failed to cancel refund');
    }
  };

  // Reset filters
  const handleReset = () => {
    setFilterStatus('');
    setFilterType('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Refund Management' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">Refund Management</h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Manage subscription refund requests and history
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={loadRefunds}
          disabled={isLoading}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-navy-400 dark:text-deep-navy-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user email or ID..."
                className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 pl-10 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RefundStatus | '')}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RefundType | '')}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All Types</option>
              <option value="manual_admin">Manual (Admin)</option>
              <option value="proration_credit">Proration Credit</option>
              <option value="chargeback">Chargeback</option>
            </select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <Button variant="ghost" onClick={handleReset} className="w-full">
              <XIcon className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex justify-between items-center pt-3 border-t border-deep-navy-200 dark:border-deep-navy-700">
          <p className="text-sm text-deep-navy-600 dark:text-deep-navy-300">
            Showing {refunds.length} of {total} refund requests
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-800 p-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-900 dark:text-green-200">Success</p>
              <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Refunds Table */}
      <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-deep-navy-400 dark:text-deep-navy-500" />
            <h3 className="mt-2 text-sm font-medium text-deep-navy-900 dark:text-deep-navy-100">No refund requests</h3>
            <p className="mt-1 text-sm text-deep-navy-500 dark:text-deep-navy-400">
              No refund requests match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-900/50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-deep-navy-900 dark:text-deep-navy-100">
                          {refund.user?.email || 'Unknown'}
                        </div>
                        <div className="text-sm text-deep-navy-500 dark:text-deep-navy-400">
                          {refund.user?.firstName} {refund.user?.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-deep-navy-900 dark:text-deep-navy-100">
                        {formatCurrency(refund.refundAmountUsd)}
                      </div>
                      <div className="text-xs text-deep-navy-500 dark:text-deep-navy-400">
                        of {formatCurrency(refund.originalChargeAmountUsd)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <RefundTypeBadge type={refund.refundType} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <RefundStatusBadge status={refund.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-deep-navy-500 dark:text-deep-navy-400">
                      {formatDate(refund.requestedAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {refund.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              setApproveModal({ isOpen: true, refund })
                            }
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200"
                            title="Approve refund"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() =>
                              setCancelModal({ isOpen: true, refund })
                            }
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200"
                            title="Cancel refund"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      {refund.status !== 'pending' && (
                        <span className="text-deep-navy-400 dark:text-deep-navy-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-deep-navy-200 dark:border-deep-navy-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-deep-navy-700 dark:text-deep-navy-300">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <ConfirmationModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, refund: null })}
        onConfirm={() =>
          approveModal.refund && handleApprove(approveModal.refund)
        }
        title="Approve Refund"
        message={`Are you sure you want to approve this refund of ${formatCurrency(
          approveModal.refund?.refundAmountUsd || 0
        )}? This action will process the refund through Stripe.`}
        confirmLabel="Approve Refund"
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, refund: null })}
        onConfirm={() => cancelModal.refund && handleCancel(cancelModal.refund)}
        title="Cancel Refund Request"
        message="Are you sure you want to cancel this refund request? This action cannot be undone."
        confirmLabel="Cancel Refund"
        isDestructive
      />
    </div>
  );
}
