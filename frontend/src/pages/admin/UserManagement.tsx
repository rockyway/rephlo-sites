/**
 * User Management Page
 *
 * Admin tools for viewing, moderating, and bulk-managing users.
 *
 * Features:
 * - User list with filters (status, tier, search)
 * - User details modal (subscription history, credit transactions, API usage stats)
 * - User actions: Edit Profile, Adjust Credits, Suspend, Ban, Unsuspend/Unban
 * - Bulk operations: Bulk Suspend, Bulk Update Tier, Bulk Grant Credits, Export CSV
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Users,
  Ban,
  ShieldAlert,
  Download,
  Plus,
  Eye,
  AlertCircle,
  CheckCircle,
  X as XIcon,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  TierBadge,
  StatusBadge,
  ConfirmationModal,
  CreditAdjustmentModal,
} from '@/components/plan109';
import { userManagementApi } from '@/api/plan109';
import {
  UserStatus,
  SubscriptionTier,
  type User,
  type UserDetails,
} from '@/types/plan109.types';
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  downloadCSV,
} from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

function UserManagement() {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [suspendDuration] = useState<number | undefined>(7);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load data
  useEffect(() => {
    loadUsers();
  }, [filterStatus, filterTier, searchQuery, page]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userManagementApi.listUsers({
        status: filterStatus as UserStatus || undefined,
        tier: filterTier as SubscriptionTier || undefined,
        search: searchQuery || undefined,
        page,
        limit,
      });

      // Map API response to frontend User type
      const mappedUsers = (response.users || []).map((apiUser: any) => ({
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.firstName && apiUser.lastName
          ? `${apiUser.firstName} ${apiUser.lastName}`
          : apiUser.firstName || apiUser.lastName || null,
        status: UserStatus.ACTIVE, // Default to ACTIVE since API doesn't return this in list
        currentTier: apiUser.subscription?.tier || SubscriptionTier.FREE,
        creditsBalance: 0, // TODO: API doesn't return this in list, needs separate query
        createdAt: apiUser.createdAt,
        lastActiveAt: apiUser.lastLoginAt,
        subscription: apiUser.subscription,
      }));

      setUsers(mappedUsers);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // User details
  const loadUserDetails = async (userId: string) => {
    try {
      const details = await userManagementApi.getUserDetails(userId);
      setUserDetails(details);
      setShowDetailsModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user details');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Handlers
  const handleSuspendUser = async (reason: string | undefined) => {
    if (!selectedUser || !reason) return;

    setIsProcessing(true);
    try {
      await userManagementApi.suspendUser({
        userId: selectedUser.id,
        reason,
        duration: suspendDuration,
      });

      setSuccessMessage(
        `User suspended ${suspendDuration ? `for ${suspendDuration} days` : 'indefinitely'}`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      loadUsers();
      setShowSuspendModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to suspend user');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBanUser = async (reason: string | undefined) => {
    if (!selectedUser || !reason) return;

    setIsProcessing(true);
    try {
      await userManagementApi.banUser({
        userId: selectedUser.id,
        reason,
        permanent: true,
      });

      setSuccessMessage('User banned successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadUsers();
      setShowBanModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to ban user');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsuspendUser = async (user: User) => {
    try {
      await userManagementApi.unsuspendUser(user.id);
      setSuccessMessage('User unsuspended successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unsuspend user');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUnbanUser = async (user: User) => {
    try {
      await userManagementApi.unbanUser(user.id);
      setSuccessMessage('User unbanned successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unban user');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAdjustCredits = async (amount: number, reason: string, expiresAt?: string) => {
    if (!selectedUser) return;

    try {
      await userManagementApi.adjustCredits(selectedUser.id, {
        userId: selectedUser.id,
        amount,
        reason,
        expiresAt,
      });

      setSuccessMessage(
        `${amount > 0 ? 'Granted' : 'Deducted'} ${Math.abs(amount)} credits successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      loadUsers();
      setShowCreditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust credits');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  // Bulk operations
  const handleBulkExport = () => {
    const selectedUserData = users.filter(u => selectedUsers.has(u.id));
    const exportData = selectedUserData.map(user => ({
      Email: user.email,
      Name: user.name || '',
      Status: user.status,
      Tier: user.currentTier,
      Credits: user.creditsBalance,
      'Joined Date': formatDate(user.createdAt),
      'Last Active': user.lastActiveAt ? formatDate(user.lastActiveAt) : 'Never',
    }));

    downloadCSV(exportData, 'users');
    setSuccessMessage(`Exported ${selectedUserData.length} users`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">User Management</h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            View, moderate, and manage platform users
          </p>
        </div>
        <Button onClick={loadUsers} disabled={isLoading} variant="ghost">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedUsers.size > 0 && (
          <div className="bg-rephlo-blue text-white rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">{selectedUsers.size} users selected</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBulkExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedUsers(new Set())}
                className="text-white hover:bg-white dark:bg-deep-navy-800/10"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6 mb-6">
          <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Status</option>
                <option value={UserStatus.ACTIVE}>Active</option>
                <option value={UserStatus.SUSPENDED}>Suspended</option>
                <option value={UserStatus.BANNED}>Banned</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                Tier
              </label>
              <select
                value={filterTier}
                onChange={(e) => {
                  setFilterTier(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Tiers</option>
                <option value={SubscriptionTier.FREE}>Free</option>
                <option value={SubscriptionTier.PRO}>Pro</option>
                <option value={SubscriptionTier.PRO_MAX}>Pro Max</option>
                <option value={SubscriptionTier.ENTERPRISE_PRO}>Enterprise Pro</option>
                <option value={SubscriptionTier.ENTERPRISE_MAX}>Enterprise Max</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
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
                  placeholder="Search by email, name, or user ID..."
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deep-navy-400 dark:text-deep-navy-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-body text-deep-navy-700 dark:text-deep-navy-200">No users found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users?.length}
                        onChange={toggleSelectAll}
                        className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Credits
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                          {user.email}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">{user.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <TierBadge tier={user.currentTier} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={user.status} type="user" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                          {formatNumber(user.creditsBalance)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                          {formatDate(user.createdAt, 'long')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                          {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : 'Never'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => loadUserDetails(user.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowCreditModal(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>

                          {user.status === UserStatus.ACTIVE && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowSuspendModal(true);
                                }}
                              >
                                <ShieldAlert className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                }}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {user.status === UserStatus.SUSPENDED && (
                            <Button
                              size="sm"
                              onClick={() => handleUnsuspendUser(user)}
                            >
                              Unsuspend
                            </Button>
                          )}

                          {user.status === UserStatus.BANNED && (
                            <Button
                              size="sm"
                              onClick={() => handleUnbanUser(user)}
                            >
                              Unban
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-deep-navy-200 flex items-center justify-between">
              <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
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

      {/* User Details Modal */}
      {showDetailsModal && userDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-deep-navy-200 flex items-center justify-between">
              <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">User Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-deep-navy-400 dark:text-deep-navy-500 hover:text-deep-navy-600 dark:text-deep-navy-200"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Email</p>
                  <p className="text-body font-medium">{userDetails.email}</p>
                </div>
                <div>
                  <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Name</p>
                  <p className="text-body font-medium">{userDetails.name || '-'}</p>
                </div>
                <div>
                  <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Tier</p>
                  <TierBadge tier={userDetails.currentTier} />
                </div>
                <div>
                  <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Status</p>
                  <StatusBadge status={userDetails.status} type="user" />
                </div>
                <div>
                  <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Credits Balance</p>
                  <p className="text-body font-medium">{formatNumber(userDetails.creditsBalance)}</p>
                </div>
                <div>
                  <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Joined</p>
                  <p className="text-body">{formatDate(userDetails.createdAt, 'long')}</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <h3 className="text-h4 font-semibold mb-2">Usage Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-deep-navy-50 dark:bg-deep-navy-900 p-4 rounded-md">
                    <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Total API Calls</p>
                    <p className="text-h3 font-semibold">{formatNumber(userDetails.usageStats?.totalApiCalls ?? 0)}</p>
                  </div>
                  <div className="bg-deep-navy-50 dark:bg-deep-navy-900 p-4 rounded-md">
                    <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Credits Used</p>
                    <p className="text-h3 font-semibold">{formatNumber(userDetails.usageStats?.creditsUsed ?? 0)}</p>
                  </div>
                  <div className="bg-deep-navy-50 dark:bg-deep-navy-900 p-4 rounded-md">
                    <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">Avg Calls/Day</p>
                    <p className="text-h3 font-semibold">{(userDetails.usageStats?.averageCallsPerDay ?? 0).toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-deep-navy-50 dark:bg-deep-navy-900 border-t border-deep-navy-200 flex justify-end">
              <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleSuspendUser}
        title="Suspend User"
        description={`Suspend ${selectedUser?.email}? They won't be able to access the platform during suspension.`}
        confirmText="Suspend User"
        requireReason
        reasonLabel="Suspension Reason"
        variant="warning"
        isProcessing={isProcessing}
      />

      {/* Ban User Modal */}
      <ConfirmationModal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setSelectedUser(null);
        }}
        onConfirm={handleBanUser}
        title="Ban User"
        description={`Permanently ban ${selectedUser?.email}? This is a serious action.`}
        confirmText="Ban User"
        requireReason
        reasonLabel="Ban Reason"
        variant="danger"
        isProcessing={isProcessing}
      />

      {/* Credit Adjustment Modal */}
      {selectedUser && (
        <CreditAdjustmentModal
          isOpen={showCreditModal}
          onClose={() => {
            setShowCreditModal(false);
            setSelectedUser(null);
          }}
          onConfirm={handleAdjustCredits}
          currentBalance={selectedUser.creditsBalance}
          userName={selectedUser.email}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

export default UserManagement;
