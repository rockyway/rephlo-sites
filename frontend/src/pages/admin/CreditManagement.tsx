/**
 * Credit Management Page
 *
 * Admin interface for viewing and manually adjusting user credit balances.
 *
 * Features:
 * - Credit balance table with user info and usage statistics
 * - Search and filter by tier, balance status
 * - Manual credit adjustments (add/deduct)
 * - Bulk credit operations
 * - Credit usage history per user
 * - Statistics dashboard
 *
 * Priority: P0 - Critical (Plan 131, Phase 3)
 */

import { useState, useEffect } from 'react';
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
  Plus,
  Minus,
  RotateCcw,
  Download,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { TierBadge, ConfirmationModal, CreditAdjustmentModal } from '@/components/plan109';
import { creditApi } from '@/api/plan109';
import {
  SubscriptionTier,
  type CreditAdjustmentRequest,
} from '@/types/plan109.types';
import { formatNumber, formatDate, calculateCreditUtilization, downloadCSV } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Types
// ============================================================================

interface UserCreditData {
  userId: string;
  userName: string;
  userEmail: string;
  tier: SubscriptionTier;
  currentBalance: number;
  monthlyAllocation: number;
  usageThisMonth: number;
  utilizationPercent: number;
  lastUpdated: string;
}

interface CreditStats {
  totalAllocated: number;
  totalUsed: number;
  avgUsagePerUser: number;
  usersNearZero: number;
}

interface CreditUsageHistoryItem {
  id: string;
  date: string;
  model: string;
  tokensUsed: number;
  creditsDeducted: number;
  requestId: string;
}

interface BulkAdjustmentData {
  selectedUsers: string[];
  action: 'add' | 'deduct' | 'reset';
  amount?: number;
  reason?: string;
}

// ============================================================================
// Component
// ============================================================================

function CreditManagement() {
  // State
  const [users, setUsers] = useState<UserCreditData[]>([]);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterBalanceStatus, setFilterBalanceStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'balance' | 'allocation' | 'usage' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedUser, setSelectedUser] = useState<UserCreditData | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [usageHistory, setUsageHistory] = useState<CreditUsageHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk operations
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'add' | 'deduct' | 'reset'>('add');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkReason, setBulkReason] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, [filterTier, filterBalanceStatus, searchQuery, page]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API calls when backend is implemented
      // For now, using mock data
      const mockUsers: UserCreditData[] = [
        {
          userId: '1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          tier: SubscriptionTier.PRO,
          currentBalance: 5000,
          monthlyAllocation: 10000,
          usageThisMonth: 5000,
          utilizationPercent: 50,
          lastUpdated: new Date().toISOString(),
        },
        {
          userId: '2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          tier: SubscriptionTier.ENTERPRISE_PRO,
          currentBalance: 50,
          monthlyAllocation: 50000,
          usageThisMonth: 49950,
          utilizationPercent: 99.9,
          lastUpdated: new Date().toISOString(),
        },
      ];

      const mockStats: CreditStats = {
        totalAllocated: 500000,
        totalUsed: 350000,
        avgUsagePerUser: 5000,
        usersNearZero: 12,
      };

      // Apply filters
      let filtered = mockUsers;
      if (filterTier) {
        filtered = filtered.filter((u) => u.tier === filterTier);
      }
      if (filterBalanceStatus === 'low') {
        filtered = filtered.filter((u) => u.currentBalance < 100);
      } else if (filterBalanceStatus === 'high') {
        filtered = filtered.filter((u) => u.utilizationPercent < 50);
      }
      if (searchQuery) {
        filtered = filtered.filter(
          (u) =>
            u.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;

        switch (sortBy) {
          case 'balance':
            aVal = a.currentBalance;
            bVal = b.currentBalance;
            break;
          case 'allocation':
            aVal = a.monthlyAllocation;
            bVal = b.monthlyAllocation;
            break;
          case 'usage':
            aVal = a.usageThisMonth;
            bVal = b.usageThisMonth;
            break;
          case 'updated':
            aVal = new Date(a.lastUpdated).getTime();
            bVal = new Date(b.lastUpdated).getTime();
            break;
        }

        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      setUsers(filtered);
      setStats(mockStats);
      setTotalPages(Math.ceil(filtered.length / limit));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load credit data');
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

  const handleAdjustCredits = async (amount: number, reason: string, expiresAt?: string) => {
    if (!selectedUser) return;

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await creditApi.adjustCredits(selectedUser.userId, { amount, reason, expiresAt });

      setSuccessMessage(`Successfully adjusted credits for ${selectedUser.userName}`);
      setShowAdjustmentModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust credits');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAdjustment = async () => {
    if (selectedUserIds.size === 0) {
      setError('Please select at least one user');
      return;
    }

    if (bulkAction !== 'reset' && !bulkAmount) {
      setError('Please enter an amount');
      return;
    }

    if (!bulkReason) {
      setError('Please enter a reason');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual bulk API
      const amount = bulkAction === 'reset' ? 0 : parseInt(bulkAmount);
      const finalAmount = bulkAction === 'deduct' ? -amount : amount;

      setSuccessMessage(`Successfully adjusted credits for ${selectedUserIds.size} users`);
      setShowBulkModal(false);
      setSelectedUserIds(new Set());
      setBulkAmount('');
      setBulkReason('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to perform bulk adjustment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewHistory = async (userId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      const mockHistory: CreditUsageHistoryItem[] = [
        {
          id: '1',
          date: new Date().toISOString(),
          model: 'gpt-4',
          tokensUsed: 1500,
          creditsDeducted: 150,
          requestId: 'req_123abc',
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000).toISOString(),
          model: 'claude-3',
          tokensUsed: 2000,
          creditsDeducted: 200,
          requestId: 'req_456def',
        },
      ];

      setUsageHistory(mockHistory);
      setShowHistoryModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load usage history');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportHistory = () => {
    if (usageHistory.length === 0) return;

    const exportData = usageHistory.map((item) => ({
      Date: formatDate(item.date, 'long'),
      Model: item.model,
      'Tokens Used': item.tokensUsed,
      'Credits Deducted': item.creditsDeducted,
      'Request ID': item.requestId,
    }));

    downloadCSV(exportData, `credit-usage-history-${selectedUser?.userEmail}`);
  };

  const handleExportAllData = () => {
    if (users.length === 0) return;

    const exportData = users.map((user) => ({
      Name: user.userName,
      Email: user.userEmail,
      Tier: user.tier,
      'Current Balance': user.currentBalance,
      'Monthly Allocation': user.monthlyAllocation,
      'Usage This Month': user.usageThisMonth,
      'Utilization %': user.utilizationPercent.toFixed(1),
      'Last Updated': formatDate(user.lastUpdated, 'long'),
    }));

    downloadCSV(exportData, 'credit-balances');
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.userId)));
    }
  };

  const clearFilters = () => {
    setFilterTier('');
    setFilterBalanceStatus('');
    setSearchQuery('');
    setPage(1);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deep-navy-800 dark:text-white">Credit Management</h1>
          <p className="mt-1 text-sm text-deep-navy-600 dark:text-deep-navy-200">
            View and manage user credit balances and allocations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportAllData}
            disabled={users.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Total Credits Allocated</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">
                  {formatNumber(stats.totalAllocated)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Total Credits Used</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">
                  {formatNumber(stats.totalUsed)}
                </p>
                <p className="text-xs text-deep-navy-500 dark:text-deep-navy-300">
                  {((stats.totalUsed / stats.totalAllocated) * 100).toFixed(1)}% utilization
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-3">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Avg Usage per User</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">
                  {formatNumber(stats.avgUsagePerUser)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-3">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Users Near Zero</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.usersNearZero}</p>
                <p className="text-xs text-deep-navy-500 dark:text-deep-navy-300">&lt; 100 credits remaining</p>
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
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Tier</label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
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

          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Balance Status</label>
            <select
              value={filterBalanceStatus}
              onChange={(e) => setFilterBalanceStatus(e.target.value)}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All</option>
              <option value="low">Low (&lt; 100)</option>
              <option value="high">High (&gt; 50% remaining)</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              <XIcon className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUserIds.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction('add');
                  setShowBulkModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Credits
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction('deduct');
                  setShowBulkModal(true);
                }}
              >
                <Minus className="mr-2 h-4 w-4" />
                Deduct Credits
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction('reset');
                  setShowBulkModal(true);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Allocation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
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
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-deep-navy-500 dark:text-deep-navy-300">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Tier
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center gap-1">
                        Current Balance
                        {sortBy === 'balance' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800"
                      onClick={() => handleSort('allocation')}
                    >
                      <div className="flex items-center gap-1">
                        Monthly Allocation
                        {sortBy === 'allocation' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800"
                      onClick={() => handleSort('usage')}
                    >
                      <div className="flex items-center gap-1">
                        Usage This Month
                        {sortBy === 'usage' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800"
                      onClick={() => handleSort('updated')}
                    >
                      <div className="flex items-center gap-1">
                        Last Updated
                        {sortBy === 'updated' && (
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
                  {users.map((user) => (
                    <tr
                      key={user.userId}
                      className={cn(
                        'hover:bg-deep-navy-50 dark:hover:bg-deep-navy-900',
                        user.currentBalance < 100 && 'bg-red-50 dark:bg-red-950'
                      )}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.userId)}
                          onChange={() => toggleUserSelection(user.userId)}
                          className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-deep-navy-800 dark:text-white">{user.userName}</p>
                          <p className="text-sm text-deep-navy-500 dark:text-deep-navy-300">{user.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <TierBadge tier={user.tier} />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-deep-navy-800 dark:text-white">
                            {formatNumber(user.currentBalance)}
                          </p>
                          {user.currentBalance < 100 && (
                            <p className="text-xs text-red-600 dark:text-red-400">Low balance!</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-deep-navy-800 dark:text-white">
                        {formatNumber(user.monthlyAllocation)}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-deep-navy-800 dark:text-white">{formatNumber(user.usageThisMonth)}</p>
                          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-deep-navy-200 dark:bg-deep-navy-700">
                            <div
                              className={cn(
                                'h-full transition-all',
                                user.utilizationPercent >= 90 ? 'bg-red-500' :
                                user.utilizationPercent >= 70 ? 'bg-amber-500' :
                                'bg-green-500'
                              )}
                              style={{ width: `${Math.min(user.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-deep-navy-500 dark:text-deep-navy-300">
                            {user.utilizationPercent.toFixed(1)}%
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-deep-navy-500 dark:text-deep-navy-300">
                        {formatDate(user.lastUpdated)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              handleViewHistory(user.userId);
                            }}
                          >
                            View History
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAdjustmentModal(true);
                            }}
                          >
                            Adjust Credits
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
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
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

      {/* Modals */}
      {selectedUser && showAdjustmentModal && (
        <CreditAdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedUser(null);
          }}
          onConfirm={handleAdjustCredits}
          currentBalance={selectedUser.currentBalance}
          userName={selectedUser.userName}
          isProcessing={isProcessing}
        />
      )}

      {selectedUser && showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-deep-navy-800 dark:text-white">Credit Usage History</h2>
                <p className="text-sm text-deep-navy-600 dark:text-deep-navy-200">{selectedUser.userEmail}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportHistory}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedUser(null);
                    setUsageHistory([]);
                  }}
                  className="text-deep-navy-500 dark:text-deep-navy-400 hover:text-deep-navy-700 dark:hover:text-deep-navy-200"
                >
                  <XIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {usageHistory.length === 0 ? (
                <p className="py-8 text-center text-deep-navy-500 dark:text-deep-navy-300">No usage history found</p>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                        Tokens Used
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                        Credits Deducted
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                        Request ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                    {usageHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-900">
                        <td className="px-4 py-3 text-sm text-deep-navy-800 dark:text-white">
                          {formatDate(item.date, 'long')}
                        </td>
                        <td className="px-4 py-3 text-sm text-deep-navy-800 dark:text-white">{item.model}</td>
                        <td className="px-4 py-3 text-sm text-deep-navy-800 dark:text-white">
                          {formatNumber(item.tokensUsed)}
                        </td>
                        <td className="px-4 py-3 text-sm text-deep-navy-800 dark:text-white">
                          {formatNumber(item.creditsDeducted)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-deep-navy-600 dark:text-deep-navy-300">
                          {item.requestId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-deep-navy-800 dark:text-white">
              Bulk Credit Adjustment
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-deep-navy-600 dark:text-deep-navy-200">
                  {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
                </p>
              </div>

              {bulkAction !== 'reset' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                    Amount
                  </label>
                  <Input
                    type="number"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    placeholder="Enter credit amount"
                    min="1"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Enter reason for adjustment"
                  rows={3}
                  className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  This action will{' '}
                  <strong>
                    {bulkAction === 'add' && 'add credits to'}
                    {bulkAction === 'deduct' && 'deduct credits from'}
                    {bulkAction === 'reset' && 'reset credits to monthly allocation for'}
                  </strong>{' '}
                  {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''}.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAmount('');
                  setBulkReason('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkAdjustment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreditManagement;
