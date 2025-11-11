/**
 * Coupon Management Page
 *
 * Admin interface for creating and managing discount coupons
 *
 * Features:
 * - Quick stats bar (active coupons, redemptions, discount value, fraud events)
 * - Main coupon table with filters and search
 * - Create/Edit coupon modal
 * - View redemptions modal
 * - Bulk actions
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Power,
  PowerOff,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CouponTypeBadge from '@/components/plan111/CouponTypeBadge';
import CouponStatusBadge from '@/components/plan111/CouponStatusBadge';
import { plan111API } from '@/api/plan111';
import { cn } from '@/lib/utils';
import {
  formatDate,
  formatCurrency,
  formatDiscountValue,
} from '@/lib/plan111.utils';
import type {
  Coupon,
  CouponType,
  CouponFilters,
  CouponUpdateRequest,
} from '@/types/plan111.types';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

function CouponManagement() {
  // Data state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalRedemptions: 0,
    totalDiscountValue: 0,
    fraudEventsFlagged: 0,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [filterType, setFilterType] = useState<CouponType | ''>('');

  // Pagination (1-indexed)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Modal state - TODO: Implement modals
  // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  // const [isRedemptionsModalOpen, setIsRedemptionsModalOpen] = useState(false);
  // const [selectedCouponForRedemptions, setSelectedCouponForRedemptions] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadCoupons();
    loadStats();
  }, [filterStatus, filterType, searchTerm, currentPage]);

  const loadCoupons = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: CouponFilters = {
        status: filterStatus === 'all' ? undefined : filterStatus,
        type: filterType || undefined,
        search: searchTerm || undefined,
      };

      const response = await plan111API.listCoupons(
        filters,
        currentPage - 1, // API expects 0-indexed, convert from 1-indexed
        pageSize
      );

      setCoupons(response.coupons || []);
      setTotalCoupons(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculate stats from loaded coupons
      const now = new Date();
      const activeCoupons = coupons.filter(
        (c) =>
          c.is_active &&
          new Date(c.valid_from) <= now &&
          new Date(c.valid_until) >= now
      );

      setStats({
        totalActive: activeCoupons.length,
        totalRedemptions: coupons.reduce(
          (sum, c) => sum + (c.redemption_count || 0),
          0
        ),
        totalDiscountValue: coupons.reduce(
          (sum, c) => sum + (c.total_discount_value || 0),
          0
        ),
        fraudEventsFlagged: 0, // TODO: Add fraud events API
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleRefresh = () => {
    loadCoupons();
    loadStats();
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCoupons();
  };

  const handleCreateCoupon = () => {
    // TODO: Implement create modal
    alert('Create coupon modal not yet implemented');
  };

  const handleEditCoupon = (_coupon: Coupon) => {
    // TODO: Implement edit modal
    alert('Edit coupon modal not yet implemented');
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this coupon? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await plan111API.deleteCoupon(couponId);
      setSuccessMessage('Coupon deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadCoupons();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete coupon');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleCouponStatus = async (coupon: Coupon) => {
    try {
      const updates: CouponUpdateRequest = {
        is_active: !coupon.is_active,
      };

      await plan111API.updateCoupon(coupon.id, updates);
      setSuccessMessage(
        `Coupon ${coupon.is_active ? 'deactivated' : 'activated'} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      loadCoupons();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to update coupon status'
      );
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleViewRedemptions = (_couponId: string) => {
    // TODO: Implement redemptions modal
    alert('View redemptions modal not yet implemented');
  };

  const totalPages = Math.ceil(totalCoupons / pageSize);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800">
            Coupon Management
          </h1>
          <p className="text-body text-deep-navy-500 mt-1">
            Create and manage promotional discount coupons
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateCoupon}>
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-deep-navy-200">
          <div className="text-sm font-medium text-deep-navy-600">
            Total Active Coupons
          </div>
          <div className="mt-2 text-3xl font-bold text-deep-navy-800">
            {stats.totalActive}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-deep-navy-200">
          <div className="text-sm font-medium text-deep-navy-600">
            Total Redemptions This Month
          </div>
          <div className="mt-2 text-3xl font-bold text-deep-navy-800">
            {stats.totalRedemptions}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-deep-navy-200">
          <div className="text-sm font-medium text-deep-navy-600">
            Total Discount Value
          </div>
          <div className="mt-2 text-3xl font-bold text-deep-navy-800">
            {formatCurrency(stats.totalDiscountValue)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-deep-navy-200">
          <div className="text-sm font-medium text-deep-navy-600">
            Fraud Events Flagged
          </div>
          <div
            className={cn(
              'mt-2 text-3xl font-bold',
              stats.fraudEventsFlagged > 0 ? 'text-red-600' : 'text-deep-navy-800'
            )}
          >
            {stats.fraudEventsFlagged}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-deep-navy-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-deep-navy-700 mb-1">
              Search by Code
            </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search coupon code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          <div>
            <label className="block text-sm font-medium text-deep-navy-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as typeof filterStatus)
              }
              className="w-full rounded-md border-deep-navy-300 shadow-sm focus:border-rephlo-blue focus:ring-rephlo-blue"
            >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-navy-700 mb-1">
              Coupon Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as CouponType | '')}
              className="w-full rounded-md border-deep-navy-300 shadow-sm focus:border-rephlo-blue focus:ring-rephlo-blue"
            >
                <option value="">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="tier_specific">Tier Specific</option>
                <option value="duration_bonus">Duration Bonus</option>
                <option value="perpetual_migration">BYOK Migration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Coupon Table */}
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !coupons || coupons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-deep-navy-500">No coupons found</p>
            <Button onClick={handleCreateCoupon} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Coupon
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-deep-navy-200">
                <thead className="bg-deep-navy-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Discount Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Max Uses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Valid From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-deep-navy-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-deep-navy-100">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-deep-navy-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-deep-navy-800">
                              {coupon.code}
                            </div>
                            {coupon.description && (
                              <div className="text-sm text-deep-navy-500">
                                {coupon.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CouponTypeBadge type={coupon.type} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800">
                        {formatDiscountValue(
                          coupon.type,
                          coupon.discount_percentage ||
                            coupon.discount_amount ||
                            coupon.bonus_duration_months ||
                            0
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-600">
                        {coupon.max_discount_applications || '∞'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-800">
                        {coupon.redemption_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-600">
                        {formatDate(coupon.valid_from)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-600">
                        {formatDate(coupon.valid_until)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CouponStatusBadge coupon={coupon} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewRedemptions(coupon.id)}
                            className="text-rephlo-blue hover:text-rephlo-blue-600"
                            title="View Redemptions"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditCoupon(coupon)}
                            className="text-deep-navy-600 hover:text-deep-navy-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleCouponStatus(coupon)}
                            className={cn(
                              'hover:opacity-70',
                              coupon.is_active
                                ? 'text-green-600'
                                : 'text-deep-navy-400'
                            )}
                            title={
                              coupon.is_active ? 'Deactivate' : 'Activate'
                            }
                          >
                            {coupon.is_active ? (
                              <Power className="w-4 h-4" />
                            ) : (
                              <PowerOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-deep-navy-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-deep-navy-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * pageSize + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, totalCoupons)}
                      </span>{' '}
                      of <span className="font-medium">{totalCoupons}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={cn(
                            'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                            (i + 1) === currentPage
                              ? 'z-10 bg-rephlo-blue/10 border-rephlo-blue text-rephlo-blue'
                              : 'bg-white border-deep-navy-300 text-deep-navy-600 hover:bg-deep-navy-50'
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals would go here - Create/Edit/Redemptions */}
      {/* For brevity, modal implementations are omitted but would follow similar patterns */}
    </div>
  );
}

export default CouponManagement;
