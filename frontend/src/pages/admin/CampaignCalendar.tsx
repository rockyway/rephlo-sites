/**
 * Campaign Calendar Page
 *
 * Admin interface for planning and scheduling marketing campaigns
 *
 * Features:
 * - Quick stats bar (active campaigns, total budget, budget utilized, top campaign)
 * - Campaign list view with filters
 * - Create/Edit campaign functionality
 * - Campaign performance tracking
 * - Budget monitoring
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye,
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CampaignTypeBadge from '@/components/plan111/CampaignTypeBadge';
import { plan111API } from '@/api/plan111';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import {
  formatDate,
  formatCurrency,
  formatPercentage,
  calculateBudgetUtilization,
  getBudgetUtilizationColor,
} from '@/lib/plan111.utils';
import type {
  CouponCampaign,
  CampaignType,
  CampaignStatus,
  CampaignFilters,
} from '@/types/plan111.types';

function CampaignCalendar() {
  // Data state
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [_totalCampaigns, setTotalCampaigns] = useState(0); // TODO: Add pagination UI
  const [stats, setStats] = useState({
    totalActive: 0,
    totalBudget: 0,
    budgetUtilized: 0,
    topCampaign: '-',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<CampaignType | ''>('');
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | ''>('');

  // Pagination (1-indexed)
  const [currentPage] = useState(1);
  const [pageSize] = useState(50);

  // Load data
  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, [filterType, filterStatus, currentPage]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: CampaignFilters = {
        type: filterType || undefined,
        status: filterStatus || undefined,
      };

      const response = await plan111API.listCampaigns(
        filters,
        currentPage,
        pageSize
      );

      setCampaigns(response.campaigns);
      setTotalCampaigns(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const activeCampaigns = campaigns.filter((c) => c.status === 'active');
      const totalBudget = campaigns.reduce(
        (sum, c) => sum + (c.budget_cap || 0),
        0
      );
      const budgetUtilized = campaigns.reduce(
        (sum, c) => sum + (c.current_spend || 0),
        0
      );

      // Find top performing campaign
      const topCampaign = campaigns.reduce((top, c) => {
        const topRevenue = top?.actual_revenue || 0;
        const currentRevenue = c.actual_revenue || 0;
        return currentRevenue > topRevenue ? c : top;
      }, null as CouponCampaign | null);

      setStats({
        totalActive: activeCampaigns.length,
        totalBudget,
        budgetUtilized,
        topCampaign: topCampaign?.name || '-',
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleRefresh = () => {
    loadCampaigns();
    loadStats();
  };

  const handleToggleCampaignStatus = async (campaign: CouponCampaign) => {
    try {
      const newStatus: CampaignStatus =
        campaign.status === 'active' ? 'paused' : 'active';

      await plan111API.updateCampaign(campaign.id, { status: newStatus });
      setSuccessMessage(
        `Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      loadCampaigns();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to update campaign status'
      );
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this campaign? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await plan111API.deleteCampaign(campaignId);
      setSuccessMessage('Campaign deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadCampaigns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-deep-navy-50 dark:bg-deep-navy-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Header */}
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-deep-navy-600 dark:text-deep-navy-200 hover:text-deep-navy-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-deep-navy-900">
                Campaign Calendar
              </h1>
              <p className="mt-1 text-sm text-deep-navy-600 dark:text-deep-navy-200">
                Plan and schedule marketing campaigns
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Total Active Campaigns
            </div>
            <div className="mt-2 text-3xl font-bold text-deep-navy-800 dark:text-white">
              {stats.totalActive}
            </div>
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Total Campaign Budget
            </div>
            <div className="mt-2 text-3xl font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(stats.totalBudget)}
            </div>
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Budget Utilized This Month
            </div>
            <div className="mt-2 text-3xl font-bold text-deep-navy-800 dark:text-white">
              {formatCurrency(stats.budgetUtilized)}
              <span className="text-sm font-normal text-deep-navy-600 dark:text-deep-navy-200 ml-2">
                (
                {formatPercentage(
                  calculateBudgetUtilization(
                    stats.budgetUtilized,
                    stats.totalBudget
                  )
                )}
                )
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-deep-navy-800 p-6 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700">
            <div className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">
              Top Performing Campaign
            </div>
            <div className="mt-2 text-lg font-bold text-deep-navy-800 dark:text-white truncate">
              {stats.topCampaign}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-deep-navy-800 p-4 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Campaign Type
              </label>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as CampaignType | '')
                }
                className="w-full h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
              >
                <option value="">All Types</option>
                <option value="holiday">Holiday</option>
                <option value="marketing">Marketing</option>
                <option value="behavioral">Behavioral</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as CampaignStatus | '')
                }
                className="w-full h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
              >
                <option value="">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-deep-navy-700 dark:text-deep-navy-200">No campaigns found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                <thead className="bg-deep-navy-50 dark:bg-deep-navy-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Campaign Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-deep-navy-800 divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                  {campaigns.map((campaign) => {
                    const budgetUtilization = calculateBudgetUtilization(
                      campaign.current_spend || 0,
                      campaign.budget_cap
                    );

                    return (
                      <tr key={campaign.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-deep-navy-900">
                            {campaign.name}
                          </div>
                          {campaign.description && (
                            <div className="text-sm text-deep-navy-700 dark:text-deep-navy-200">
                              {campaign.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CampaignTypeBadge type={campaign.type} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-700 dark:text-deep-navy-200">
                          {formatDate(campaign.starts_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-700 dark:text-deep-navy-200">
                          {formatDate(campaign.ends_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-navy-900">
                          {campaign.budget_cap
                            ? formatCurrency(campaign.budget_cap)
                            : 'Unlimited'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-deep-navy-900">
                            {formatCurrency(campaign.current_spend || 0)}
                          </div>
                          {campaign.budget_cap && (
                            <div
                              className={cn(
                                'text-xs',
                                getBudgetUtilizationColor(budgetUtilization)
                              )}
                            >
                              {formatPercentage(budgetUtilization)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                              campaign.status === 'active' &&
                                'bg-green-100 text-green-800',
                              campaign.status === 'planning' &&
                                'bg-blue-100 text-blue-800',
                              campaign.status === 'paused' &&
                                'bg-yellow-100 text-yellow-800',
                              campaign.status === 'ended' &&
                                'bg-deep-navy-100 text-deep-navy-800'
                            )}
                          >
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              title="View Performance"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-deep-navy-600 dark:text-deep-navy-200 hover:text-deep-navy-900"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleToggleCampaignStatus(campaign)
                              }
                              className={cn(
                                'hover:opacity-70',
                                campaign.status === 'active'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              )}
                              title={
                                campaign.status === 'active'
                                  ? 'Pause'
                                  : 'Activate'
                              }
                            >
                              {campaign.status === 'active' ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignCalendar;
