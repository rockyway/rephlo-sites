/**
 * View Redemptions Modal Component
 *
 * Modal for viewing redemption history and stats for a specific coupon.
 *
 * Features:
 * - Redemption statistics (total uses, unique users, total discount)
 * - Paginated redemption list with user info
 * - Status badges and formatted dates
 * - Export capability (future enhancement)
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { useState, useEffect } from 'react';
import { X, Download, TrendingUp, Users, DollarSign } from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { plan111API } from '@/api/plan111';
import { formatCurrency, formatDate } from '@/lib/plan111.utils';
import { cn } from '@/lib/utils';
import type { CouponRedemption } from '@/types/plan111.types';

interface ViewRedemptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponCode: string;
  couponId: string;
}

interface RedemptionStats {
  total_redemptions: number;
  unique_users: number;
  total_discount_value: number;
  success_rate: number;
}

const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  flagged: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

// Helper function to derive status from redemption fields
const getRedemptionStatus = (redemption: CouponRedemption): 'success' | 'flagged' | 'pending' => {
  // Map RedemptionStatus to display status
  if (redemption.status === 'success') return 'success';
  if (redemption.status === 'pending') return 'pending';
  return 'flagged'; // failed or reversed
};

export default function ViewRedemptionsModal({
  isOpen,
  onClose,
  couponCode,
  couponId,
}: ViewRedemptionsModalProps) {
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [stats, setStats] = useState<RedemptionStats>({
    total_redemptions: 0,
    unique_users: 0,
    total_discount_value: 0,
    success_rate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (isOpen && couponId) {
      loadRedemptions();
    }
  }, [isOpen, couponId, currentPage]);

  const loadRedemptions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await plan111API.getCouponRedemptions(
        couponId,
        currentPage,
        pageSize
      );

      setRedemptions(response.redemptions || []);
      setTotalPages(Math.ceil((response.total || 0) / pageSize));

      // Calculate stats from redemptions (status = success if status is 'success')
      const allRedemptions = response.redemptions || [];
      const totalRedemptions = allRedemptions.length;
      const successfulRedemptions = allRedemptions.filter((r) => r.status === 'success').length;
      const uniqueUsers = new Set(allRedemptions.map((r) => r.userId)).size;
      const totalDiscount = allRedemptions
        .filter((r) => r.status === 'success')
        .reduce((sum, r) => sum + (r.discountApplied || 0), 0) || 0;

      setStats({
        total_redemptions: totalRedemptions,
        unique_users: uniqueUsers,
        total_discount_value: totalDiscount,
        success_rate:
          totalRedemptions > 0
            ? (successfulRedemptions / totalRedemptions) * 100
            : 0,
      });
    } catch (err: any) {
      console.error('Failed to load redemptions:', err);
      setError('Failed to load redemption history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    alert('Export functionality coming soon');
  };

  const handleClose = () => {
    setCurrentPage(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-deep-navy-800 border-b border-deep-navy-200 dark:border-deep-navy-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-h2 font-bold text-deep-navy-800 dark:text-white">
                Redemption History
              </h2>
              <p className="text-sm text-deep-navy-600 dark:text-deep-navy-300 mt-1">
                Code: <span className="font-mono font-semibold">{couponCode}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleExport}
                size="sm"
                title="Export to CSV"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <button
                onClick={handleClose}
                className="text-deep-navy-600 dark:text-deep-navy-300 hover:text-deep-navy-800 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="px-6 py-4 bg-deep-navy-50 dark:bg-deep-navy-900">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-deep-navy-800 p-4 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200">
                      Total Redemptions
                    </p>
                    <p className="text-2xl font-bold text-deep-navy-800 dark:text-white mt-1">
                      {stats.total_redemptions}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-rephlo-blue" />
                </div>
              </div>

              <div className="bg-white dark:bg-deep-navy-800 p-4 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200">
                      Unique Users
                    </p>
                    <p className="text-2xl font-bold text-deep-navy-800 dark:text-white mt-1">
                      {stats.unique_users}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-electric-cyan" />
                </div>
              </div>

              <div className="bg-white dark:bg-deep-navy-800 p-4 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200">
                      Total Discount
                    </p>
                    <p className="text-2xl font-bold text-deep-navy-800 dark:text-white mt-1">
                      {formatCurrency(stats.total_discount_value)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-deep-navy-800 p-4 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200">
                      Success Rate
                    </p>
                    <p className="text-2xl font-bold text-deep-navy-800 dark:text-white mt-1">
                      {stats.success_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        stats.success_rate >= 90
                          ? 'bg-green-500'
                          : stats.success_rate >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Redemptions Table */}
          <div className="px-6 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
                <Button onClick={loadRedemptions} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-deep-navy-700 dark:text-deep-navy-200">
                  No redemptions found for this coupon
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                    <thead className="bg-deep-navy-50 dark:bg-deep-navy-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200 uppercase tracking-wider">
                          User ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200 uppercase tracking-wider">
                          Discount Applied
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200 uppercase tracking-wider">
                          Redeemed At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-deep-navy-600 dark:text-deep-navy-200 uppercase tracking-wider">
                          IP Address
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-deep-navy-800 divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                      {redemptions.map((redemption) => (
                        <tr
                          key={redemption.id}
                          className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-mono text-deep-navy-800 dark:text-white">
                              {redemption.userId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(redemption.discountApplied || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                                STATUS_COLORS[getRedemptionStatus(redemption)] ||
                                  'bg-gray-100 text-gray-800'
                              )}
                            >
                              {getRedemptionStatus(redemption)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-deep-navy-600 dark:text-deep-navy-300">
                            {formatDate(redemption.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-mono text-deep-navy-600 dark:text-deep-navy-300">
                              {redemption.ipAddress || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-deep-navy-200 dark:border-deep-navy-700 pt-4">
                    <div>
                      <p className="text-sm text-deep-navy-700 dark:text-deep-navy-200">
                        Page{' '}
                        <span className="font-medium">{currentPage + 1}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        size="sm"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                        }
                        disabled={currentPage >= totalPages - 1}
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-deep-navy-800 border-t border-deep-navy-200 dark:border-deep-navy-700 px-6 py-4 flex items-center justify-end">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
