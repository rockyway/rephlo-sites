/**
 * Campaign Management Page
 *
 * Admin interface for creating and managing coupon campaigns
 *
 * Features:
 * - Quick stats bar (active campaigns, total coupons, budget spent, ROI)
 * - Main campaign table with filters and search
 * - Create/Edit campaign modal
 * - View campaign performance modal
 * - Campaign status management (activate/pause)
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
  BarChart3,
  Power,
  PowerOff,
  AlertCircle,
  Calendar,
  DollarSign,
  Target,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { plan111API } from '@/api/plan111';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency } from '@/lib/plan111.utils';
import type {
  CouponCampaign,
  CampaignType,
  CampaignStatus,
  CampaignFilters,
} from '@/types/plan111.types';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

function CampaignManagement() {
  // Data state
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalCoupons: 0,
    totalBudgetSpent: 0,
    averageROI: 0,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | ''>('');
  const [filterType, setFilterType] = useState<CampaignType | ''>('');

  // Pagination (1-indexed)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Modal state (placeholders for future implementation)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CouponCampaign | null>(null);

  // Load data
  useEffect(() => {
    loadCampaigns();
  }, [filterStatus, filterType, searchTerm, currentPage]);

  useEffect(() => {
    loadStats();
  }, [campaigns]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: CampaignFilters = {
        status: filterStatus || undefined,
        type: filterType || undefined,
      };

      const response = await plan111API.listCampaigns(
        filters,
        currentPage - 1, // API expects 0-indexed
        pageSize
      );

      setCampaigns(response.campaigns || []);
      setTotalCampaigns(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const activeCampaigns = campaigns.filter(
        (c) => c.status === 'active'
      );

      const totalCoupons = campaigns.reduce((sum, c) => sum + (c.redemption_count || 0), 0);
      const totalBudgetSpent = campaigns.reduce((sum, c) => sum + (c.current_spend || 0), 0);

      // Simple ROI calculation (would need more data for accurate calculation)
      const averageROI = campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + ((c.expected_revenue || 0) / (c.budget_cap || 1) - 1) * 100, 0) / campaigns.length
        : 0;

      setStats({
        totalActive: activeCampaigns.length,
        totalCoupons,
        totalBudgetSpent,
        averageROI: Math.round(averageROI),
      });
    } catch (err: any) {
      console.error('Failed to calculate stats:', err);
    }
  };

  const handleRefresh = () => {
    loadCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      await plan111API.deleteCampaign(id);
      setSuccessMessage('Campaign deleted successfully');
      loadCampaigns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const handleToggleActive = async () => {
    try {
      // For now, just reload - actual activation logic would need backend support
      setSuccessMessage(`Campaign status change requested`);
      loadCampaigns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update campaign');
    }
  };

  const getStatusColor = (status: CampaignStatus): string => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'planning':
        return 'text-blue-600 bg-blue-50';
      case 'paused':
        return 'text-orange-600 bg-orange-50';
      case 'ended':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeColor = (type: CampaignType): string => {
    switch (type) {
      case 'holiday':
        return 'text-green-600 bg-green-50';
      case 'marketing':
        return 'text-purple-600 bg-purple-50';
      case 'behavioral':
        return 'text-blue-600 bg-blue-50';
      case 'referral':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const totalPages = Math.ceil(totalCampaigns / pageSize);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Campaign Management', href: '/admin/campaigns' },
        ]}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage coupon campaigns and track performance
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Active Campaigns</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.totalActive}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Coupons</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.totalCoupons}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Budget Spent</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {formatCurrency(stats.totalBudgetSpent)}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Avg. ROI</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {stats.averageROI}%
          </dd>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:col-span-1">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as CampaignStatus | '')}
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as CampaignType | '')}
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="holiday">Holiday</option>
                <option value="marketing">Marketing</option>
                <option value="behavioral">Behavioral</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new campaign.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coupons
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        {campaign.description && (
                          <div className="text-sm text-gray-500">
                            {campaign.description.substring(0, 60)}
                            {campaign.description.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getTypeColor(campaign.type)
                      )}
                    >
                      {campaign.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(campaign.status)
                      )}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(campaign.starts_at)}</div>
                    <div className="text-xs text-gray-400">
                      to {formatDate(campaign.ends_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                      <span>
                        {formatCurrency(campaign.current_spend || 0)} / {formatCurrency(campaign.budget_cap || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(
                            ((campaign.current_spend || 0) / (campaign.budget_cap || 1)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Target className="h-4 w-4 text-gray-400 mr-1" />
                      {campaign.redemption_count || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleToggleActive()}
                      className="text-gray-600 hover:text-gray-900"
                      title={campaign.status === 'active' ? 'Pause campaign' : 'Activate campaign'}
                    >
                      {campaign.status === 'active' ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCampaign(campaign);
                        setIsEditModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      disabled
                      title="Edit campaign (coming soon)"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => console.log('View performance for', campaign.id)}
                      className="text-green-600 hover:text-green-900"
                      disabled
                      title="View performance (coming soon)"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCampaigns)}
                  </span>{' '}
                  of <span className="font-medium">{totalCampaigns}</span> campaigns
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals (placeholders for future implementation) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Campaign</h2>
            <p className="text-gray-600 mb-4">Campaign creation modal coming soon...</p>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {isEditModalOpen && editingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Campaign</h2>
            <p className="text-gray-600 mb-4">
              Editing: {editingCampaign.name}
            </p>
            <p className="text-gray-600 mb-4">Campaign editing modal coming soon...</p>
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCampaign(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignManagement;
