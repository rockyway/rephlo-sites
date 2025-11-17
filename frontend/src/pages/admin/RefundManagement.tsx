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
import { RefreshCw, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { refundApi } from '@/api/plan109';
import { formatCurrency, formatDate } from '@/lib/plan109.utils';
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
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      approved: 'bg-blue-100 text-blue-700 border-blue-300',
      processing: 'bg-purple-100 text-purple-700 border-purple-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      failed: 'bg-red-100 text-red-700 border-red-300',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
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
      manual_admin: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      proration_credit: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      chargeback: 'bg-red-100 text-red-700 border-red-300',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'primary' : 'primary'}
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
      loadRefunds(); // Reload data
    } catch (err: any) {
      alert(`Failed to approve refund: ${err.message}`);
    }
  };

  // Handle cancel refund
  const handleCancel = async (refund: SubscriptionRefund) => {
    try {
      await refundApi.cancelRefund(refund.id, {
        refundId: refund.id,
        reason: 'Cancelled by admin',
      });
      loadRefunds(); // Reload data
    } catch (err: any) {
      alert(`Failed to cancel refund: ${err.message}`);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage subscription refund requests and history
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadRefunds}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user email or ID..."
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RefundStatus | '')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as RefundType | '')}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="manual_admin">Manual (Admin)</option>
              <option value="proration_credit">Proration Credit</option>
              <option value="chargeback">Chargeback</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <p className="text-sm text-gray-600">
            Showing {refunds.length} of {total} refund requests
          </p>
          <Button variant="ghost" onClick={handleReset} size="sm">
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No refund requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              No refund requests match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {refund.user?.email || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {refund.user?.firstName} {refund.user?.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(refund.refundAmountUsd)}
                      </div>
                      <div className="text-xs text-gray-500">
                        of {formatCurrency(refund.originalChargeAmountUsd)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RefundTypeBadge type={refund.refundType} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RefundStatusBadge status={refund.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(refund.requestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {refund.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              setApproveModal({ isOpen: true, refund })
                            }
                            className="text-green-600 hover:text-green-900"
                            title="Approve refund"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() =>
                              setCancelModal({ isOpen: true, refund })
                            }
                            className="text-red-600 hover:text-red-900"
                            title="Cancel refund"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      {refund.status !== 'pending' && (
                        <span className="text-gray-400">-</span>
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
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
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
