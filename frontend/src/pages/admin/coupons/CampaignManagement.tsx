/**
 * Campaign Management Page
 *
 * Admin interface for creating and managing marketing campaigns with coupon batches.
 *
 * Features:
 * - Campaign list with filters and statistics
 * - Create/edit campaigns with coupon batch generation
 * - Campaign details view with performance metrics
 * - Campaign templates (save & load)
 * - Email notification integration
 * - Export campaign data
 *
 * Priority: P1 - High (Plan 131, Phase 3)
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  Plus,
  Calendar,
  TrendingUp,
  Users,
  X as XIcon,
  ChevronRight,
  ChevronLeft,
  Copy,
  Download,
  Trash2,
  Play,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ConfirmationModal } from '@/components/plan109';
import { CampaignStatus, CampaignType, type CouponCampaign, SubscriptionTier } from '@/types/plan111.types';
import { formatDate, formatCurrency, downloadCSV } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Types
// ============================================================================

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCouponsGenerated: number;
  totalRedeemed: number;
  avgConversionRate: number;
}

// ============================================================================
// Component
// ============================================================================

function CampaignManagement() {
  // State
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'startDate' | 'conversionRate'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedCampaign, setSelectedCampaign] = useState<CouponCampaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'marketing' as CampaignType,
    description: '',
    startsAt: '',
    endsAt: '',
    targetTiers: [] as SubscriptionTier[],
    expectedRevenue: '',
    budgetCap: '',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [filterStatus, filterType, searchQuery, page]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API calls when backend is implemented
      const mockCampaigns: CouponCampaign[] = [
        {
          id: '1',
          name: 'Black Friday 2024',
          type: 'holiday',
          description: 'Annual Black Friday sale',
          starts_at: new Date(2024, 10, 29).toISOString(),
          ends_at: new Date(2024, 11, 2).toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          redemption_count: 156,
          conversion_rate: 23.4,
          actual_revenue: 45670,
          expected_revenue: 50000,
        },
        {
          id: '2',
          name: 'Welcome Bonus Q1',
          type: 'marketing',
          description: 'New user onboarding campaign',
          starts_at: new Date(2024, 0, 1).toISOString(),
          ends_at: new Date(2024, 2, 31).toISOString(),
          status: 'ended',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          redemption_count: 423,
          conversion_rate: 31.2,
          actual_revenue: 67890,
          expected_revenue: 60000,
        },
      ];

      const mockStats: CampaignStats = {
        totalCampaigns: 12,
        activeCampaigns: 3,
        totalCouponsGenerated: 5000,
        totalRedeemed: 1234,
        avgConversionRate: 24.7,
      };

      // Apply filters
      let filtered = mockCampaigns;
      if (filterStatus) {
        filtered = filtered.filter((c) => c.status === filterStatus);
      }
      if (filterType) {
        filtered = filtered.filter((c) => c.type === filterType);
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            (c.description && c.description.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;

        switch (sortBy) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'startDate':
            aVal = new Date(a.starts_at).getTime();
            bVal = new Date(b.starts_at).getTime();
            break;
          case 'conversionRate':
            aVal = a.conversion_rate || 0;
            bVal = b.conversion_rate || 0;
            break;
        }

        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      setCampaigns(filtered);
      setStats(mockStats);
      setTotalPages(Math.ceil(filtered.length / limit));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
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
      setSortOrder('desc');
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.startsAt || !formData.endsAt) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await plan111API.createCampaign({
      //   name: formData.name,
      //   type: formData.type,
      //   description: formData.description,
      //   starts_at: formData.startsAt,
      //   ends_at: formData.endsAt,
      //   target_audience: formData.targetTiers.length > 0 ? { user_tiers: formData.targetTiers } : undefined,
      //   expected_revenue: formData.expectedRevenue ? parseFloat(formData.expectedRevenue) : undefined,
      //   budget_cap: formData.budgetCap ? parseFloat(formData.budgetCap) : undefined,
      // });

      setSuccessMessage(`Campaign "${formData.name}" created successfully`);
      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await plan111API.deleteCampaign(selectedCampaign.id);

      setSuccessMessage(`Campaign "${selectedCampaign.name}" deleted successfully`);
      setShowDeleteModal(false);
      setSelectedCampaign(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateCampaign = (campaign: CouponCampaign) => {
    setFormData({
      name: `${campaign.name} (Copy)`,
      type: campaign.type,
      description: campaign.description || '',
      startsAt: '',
      endsAt: '',
      targetTiers: [],
      expectedRevenue: campaign.expected_revenue?.toString() || '',
      budgetCap: campaign.budget_cap?.toString() || '',
    });
    setShowCreateModal(true);
  };

  const handleExport = () => {
    if (campaigns.length === 0) return;

    const exportData = campaigns.map((campaign) => ({
      Name: campaign.name,
      Type: campaign.type,
      Status: campaign.status,
      'Start Date': formatDate(campaign.starts_at, 'long'),
      'End Date': formatDate(campaign.ends_at, 'long'),
      'Redemptions': campaign.redemption_count || 0,
      'Conversion Rate': campaign.conversion_rate ? `${campaign.conversion_rate.toFixed(1)}%` : '0%',
      'Actual Revenue': formatCurrency(campaign.actual_revenue),
      'Expected Revenue': formatCurrency(campaign.expected_revenue),
    }));

    downloadCSV(exportData, 'campaigns');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'marketing',
      description: '',
      startsAt: '',
      endsAt: '',
      targetTiers: [],
      expectedRevenue: '',
      budgetCap: '',
    });
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterType('');
    setSearchQuery('');
    setPage(1);
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const colors = {
      planning: 'bg-deep-navy-100 dark:bg-deep-navy-800 text-deep-navy-700 dark:text-deep-navy-200 border-deep-navy-300 dark:border-deep-navy-600',
      active: 'bg-green-100 text-green-700 border-green-300',
      paused: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      ended: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return colors[status] || colors.planning;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">Campaign Management</h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Create and manage marketing campaigns with coupon batches
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleExport} disabled={campaigns.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="ghost" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Total Campaigns</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.totalCampaigns}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Active Campaigns</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.activeCampaigns}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-3">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Coupons Generated</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.totalCouponsGenerated.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-3">
                <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Coupons Redeemed</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.totalRedeemed.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-100 dark:bg-cyan-900 p-3">
                <TrendingUp className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Avg Conversion Rate</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.avgConversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-navy-400 dark:text-deep-navy-500" />
              <Input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All</option>
              <option value="holiday">Holiday</option>
              <option value="marketing">Marketing</option>
              <option value="behavioral">Behavioral</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="ghost" onClick={clearFilters} className="w-full">
              <XIcon className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-100 p-1">
              <svg
                className="h-4 w-4 text-green-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-900">Success</p>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-deep-navy-400 dark:text-deep-navy-500" />
            <p className="mt-4 text-deep-navy-500 dark:text-deep-navy-300">No campaigns found</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Campaign
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900">
                  <tr>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:bg-deep-navy-800"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Campaign Name
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Status
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:bg-deep-navy-800"
                      onClick={() => handleSort('startDate')}
                    >
                      <div className="flex items-center gap-1">
                        Start Date
                        {sortBy === 'startDate' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      End Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Redemptions
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:bg-deep-navy-800"
                      onClick={() => handleSort('conversionRate')}
                    >
                      <div className="flex items-center gap-1">
                        Conversion
                        {sortBy === 'conversionRate' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-deep-navy-50 dark:bg-deep-navy-900">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-deep-navy-800 dark:text-white">{campaign.name}</p>
                          <p className="text-sm text-deep-navy-500 dark:text-deep-navy-300 capitalize">{campaign.type}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-1 text-xs font-medium',
                            getStatusBadge(campaign.status)
                          )}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-deep-navy-800 dark:text-white">
                        {formatDate(campaign.starts_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-deep-navy-800 dark:text-white">
                        {formatDate(campaign.ends_at)}
                      </td>
                      <td className="px-4 py-4 text-deep-navy-800 dark:text-white">
                        {campaign.redemption_count?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-deep-navy-800 dark:text-white">
                            {campaign.conversion_rate ? `${campaign.conversion_rate.toFixed(1)}%` : '0%'}
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-deep-navy-200 dark:bg-deep-navy-700">
                            <div
                              className={cn(
                                'h-full transition-all',
                                (campaign.conversion_rate || 0) >= 30 ? 'bg-green-500' :
                                (campaign.conversion_rate || 0) >= 20 ? 'bg-blue-500' :
                                'bg-amber-500'
                              )}
                              style={{ width: `${Math.min(campaign.conversion_rate || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowDetailsModal(true);
                            }}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateCampaign(campaign)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-deep-navy-200 dark:border-deep-navy-700 px-4 py-3">
                <div className="text-sm text-deep-navy-600 dark:text-deep-navy-200">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep-navy-800 dark:text-white">Create New Campaign</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-deep-navy-500 dark:text-deep-navy-300 hover:text-deep-navy-700 dark:text-deep-navy-200"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Black Friday 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                    className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                  >
                    <option value="holiday">Holiday</option>
                    <option value="marketing">Marketing</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                    Expected Revenue
                  </label>
                  <Input
                    type="number"
                    value={formData.expectedRevenue}
                    onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Campaign description..."
                  rows={3}
                  className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateCampaign}
                disabled={isProcessing}
              >
                {isProcessing ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCampaign && showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep-navy-800 dark:text-white">{selectedCampaign.name}</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                className="text-deep-navy-500 dark:text-deep-navy-300 hover:text-deep-navy-700 dark:text-deep-navy-200"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Type</p>
                  <p className="text-deep-navy-800 dark:text-white capitalize">{selectedCampaign.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Status</p>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-1 text-xs font-medium',
                      getStatusBadge(selectedCampaign.status)
                    )}
                  >
                    {selectedCampaign.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Start Date</p>
                  <p className="text-deep-navy-800 dark:text-white">{formatDate(selectedCampaign.starts_at, 'long')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">End Date</p>
                  <p className="text-deep-navy-800 dark:text-white">{formatDate(selectedCampaign.ends_at, 'long')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900 p-4">
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Redemptions</p>
                  <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">
                    {selectedCampaign.redemptions_count?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Conversion Rate</p>
                  <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">
                    {selectedCampaign.conversion_rate ? `${selectedCampaign.conversion_rate.toFixed(1)}%` : '0%'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Revenue</p>
                  <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">
                    {formatCurrency(selectedCampaign.actual_revenue || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCampaign(null);
        }}
        onConfirm={handleDeleteCampaign}
        title="Delete Campaign"
        description={`Are you sure you want to delete "${selectedCampaign?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default CampaignManagement;
