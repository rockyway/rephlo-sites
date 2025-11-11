/**
 * UserDetailUnified Page - Phase 4 Frontend
 *
 * Comprehensive user detail page displaying all user data across monetization plans
 * in a tab-based interface with 7 tabs.
 *
 * Features:
 * - User header with quick actions
 * - 7 tabs: Overview, Subscriptions, Licenses, Credits, Coupons, Payments, Activity
 * - Lazy loading for tab data
 * - Deep Navy theme
 * - Responsive design
 * - Loading and error states
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tab } from '@headlessui/react';
import {
  User,
  CreditCard,
  Key,
  Zap,
  Ticket,
  Receipt,
  Activity,
  AlertCircle,
  ArrowLeft,
  Ban,
  UserX,
  DollarSign,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { adminAPI } from '@/api/admin';
import type {
  UserOverviewResponse,
  UserSubscriptionsResponse,
  UserCreditsResponse,
  UserCouponsResponse,
  UserPaymentsResponse,
} from '@/api/admin';

import AdminStatsGrid, { StatCard } from '@/components/admin/data/AdminStatsGrid';
import AdminDataTable, { Column } from '@/components/admin/data/AdminDataTable';
import AdminPagination from '@/components/admin/data/AdminPagination';
import { TierBadge, StatusBadge } from '@/components/admin/badges';
import { LoadingState, EmptyState } from '@/components/admin/utility';
import ConfirmationModal from '@/components/admin/forms/ConfirmationModal';
import FormModal from '@/components/admin/forms/FormModal';
import { formatCurrency, formatDate, formatRelativeTime, formatNumber } from '@/utils/format';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Main Component
// ============================================================================

const UserDetailUnified: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);

  if (!userId) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-red-500" />}
        title="User ID missing"
        description="No user ID provided in the URL."
        action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
      />
    );
  }

  // Fetch overview data
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ['user-overview', userId],
    queryFn: () => adminAPI.getUserOverview(userId),
  });

  // Loading state
  if (overviewLoading) {
    return <LoadingState fullPage message="Loading user details..." />;
  }

  // Error state
  if (overviewError || !overview) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-red-500" />}
        title="Failed to load user details"
        description="There was an error loading the user details. Please try again."
        action={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-deep-navy-600 hover:text-deep-navy-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Users</span>
      </button>

      {/* User Header */}
      <UserHeader user={overview.user} />

      {/* Tab Navigation */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-2 border-b border-deep-navy-200 bg-white rounded-t-lg px-6">
          {[
            { label: 'Overview', icon: User },
            { label: 'Subscriptions', icon: CreditCard },
            { label: 'Licenses', icon: Key },
            { label: 'Credits', icon: Zap },
            { label: 'Coupons', icon: Ticket },
            { label: 'Payments', icon: Receipt },
            { label: 'Activity', icon: Activity },
          ].map((tab, index) => (
            <Tab
              key={index}
              className={({ selected }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                  selected
                    ? 'border-b-2 border-rephlo-blue text-rephlo-blue'
                    : 'text-deep-navy-600 hover:text-deep-navy-800'
                }`
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="bg-white rounded-b-lg shadow-sm border border-deep-navy-200">
          <Tab.Panel className="p-6">
            <OverviewTab overview={overview} />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <SubscriptionsTab userId={userId} />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <LicensesTab userId={userId} />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <CreditsTab userId={userId} />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <CouponsTab userId={userId} />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <PaymentsTab userId={userId} />
          </Tab.Panel>
          <Tab.Panel className="p-6">
            <ActivityTab userId={userId} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

// ============================================================================
// User Header Component
// ============================================================================

interface UserHeaderProps {
  user: UserOverviewResponse['user'];
}

const UserHeader: React.FC<UserHeaderProps> = ({ user }) => {
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showAdjustCreditsModal, setShowAdjustCreditsModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* User Avatar */}
            <div className="h-16 w-16 rounded-full bg-rephlo-blue/10 flex items-center justify-center">
              <User className="h-8 w-8 text-rephlo-blue" />
            </div>

            {/* User Info */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-deep-navy-800">
                  {user.name || 'Unnamed User'}
                </h1>
                <StatusBadge status={user.status as any} />
              </div>
              <p className="text-deep-navy-600 mb-1">{user.email}</p>
              <div className="flex items-center gap-4 text-sm text-deep-navy-700">
                <span>Joined {formatDate(user.createdAt)}</span>
                {user.lastLogin && (
                  <>
                    <span>•</span>
                    <span>Last login {formatRelativeTime(user.lastLogin)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSuspendModal(true)}
              className="px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <UserX className="h-4 w-4" />
              Suspend
            </button>
            <button
              onClick={() => setShowBanModal(true)}
              className="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Ban className="h-4 w-4" />
              Ban
            </button>
            <button
              onClick={() => setShowAdjustCreditsModal(true)}
              className="px-4 py-2 bg-rephlo-blue text-white rounded-lg hover:bg-rephlo-blue/90 transition-colors flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Adjust Credits
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        onCancel={() => setShowSuspendModal(false)}
        title="Suspend User"
        message="Are you sure you want to suspend this user? They will be unable to access the platform."
        confirmText="Suspend"
        confirmVariant="warning"
        onConfirm={() => {
          // TODO: Implement suspend logic
          setShowSuspendModal(false);
        }}
      />
      <ConfirmationModal
        isOpen={showBanModal}
        onCancel={() => setShowBanModal(false)}
        title="Ban User"
        message="Are you sure you want to ban this user? This action should be reserved for severe violations."
        confirmText="Ban"
        confirmVariant="danger"
        onConfirm={() => {
          // TODO: Implement ban logic
          setShowBanModal(false);
        }}
      />
      <FormModal
        isOpen={showAdjustCreditsModal}
        onClose={() => setShowAdjustCreditsModal(false)}
        title="Adjust Credits"
        onSubmit={(data) => {
          // TODO: Implement adjust credits logic
          console.log('Adjust credits:', data);
          setShowAdjustCreditsModal(false);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-navy-700 mb-2">
              Credit Amount
            </label>
            <input
              type="number"
              name="amount"
              className="w-full px-3 py-2 border border-deep-navy-200 rounded-lg focus:ring-2 focus:ring-rephlo-blue focus:border-transparent"
              placeholder="Enter amount (positive to add, negative to deduct)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-navy-700 mb-2">
              Reason
            </label>
            <textarea
              name="reason"
              rows={3}
              className="w-full px-3 py-2 border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 rounded-lg focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:border-rephlo-blue dark:focus:border-electric-cyan"
              placeholder="Enter reason for adjustment"
            />
          </div>
        </div>
      </FormModal>
    </>
  );
};

// ============================================================================
// Tab 1: Overview
// ============================================================================

interface OverviewTabProps {
  overview: UserOverviewResponse;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ overview }) => {
  const stats: StatCard[] = [
    {
      label: 'Total Subscriptions',
      value: overview.stats.totalSubscriptions,
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      label: 'Total Licenses',
      value: overview.stats.totalLicenses,
      icon: <Key className="h-5 w-5" />,
    },
    {
      label: 'Credits Consumed',
      value: formatNumber(overview.stats.creditsConsumed),
      icon: <Zap className="h-5 w-5" />,
    },
    {
      label: 'Coupons Redeemed',
      value: overview.stats.couponsRedeemed,
      icon: <Ticket className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <AdminStatsGrid stats={stats} columns={4} />

      {/* Current Subscription */}
      {overview.currentSubscription && (
        <div className="bg-deep-navy-50 rounded-lg p-6 border border-deep-navy-200">
          <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
            Current Subscription
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Tier</p>
              <TierBadge tier={overview.currentSubscription.tier as any} />
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Status</p>
              <StatusBadge status={overview.currentSubscription.status as any} />
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Billing Cycle</p>
              <p className="text-deep-navy-800 font-medium capitalize">
                {overview.currentSubscription.billingCycle}
              </p>
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Credit Allocation</p>
              <p className="text-deep-navy-800 font-medium">
                {formatNumber(overview.currentSubscription.creditAllocation)} credits
              </p>
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Started</p>
              <p className="text-deep-navy-800 font-medium">
                {formatDate(overview.currentSubscription.startedAt)}
              </p>
            </div>
            {overview.currentSubscription.nextBillingDate && (
              <div>
                <p className="text-sm text-deep-navy-600 mb-1">Next Billing</p>
                <p className="text-deep-navy-800 font-medium">
                  {formatDate(overview.currentSubscription.nextBillingDate)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current License */}
      {overview.currentLicense && (
        <div className="bg-deep-navy-50 rounded-lg p-6 border border-deep-navy-200">
          <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
            Current License
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">License Key</p>
              <p className="text-deep-navy-800 font-mono text-sm">
                {maskLicenseKey(overview.currentLicense.licenseKey)}
              </p>
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Status</p>
              <StatusBadge status={overview.currentLicense.status as any} />
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Activated</p>
              <p className="text-deep-navy-800 font-medium">
                {formatDate(overview.currentLicense.activatedAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-deep-navy-600 mb-1">Device Usage</p>
              <p className="text-deep-navy-800 font-medium">
                {overview.currentLicense.deviceCount} / {overview.currentLicense.maxDevices}{' '}
                devices
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Credit Balance */}
      <div className="bg-gradient-to-br from-rephlo-blue to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Credit Balance</h3>
        </div>
        <p className="text-4xl font-bold">{formatNumber(overview.creditBalance)}</p>
        <p className="text-sm opacity-90 mt-1">Available credits</p>
      </div>
    </div>
  );
};

// ============================================================================
// Tab 2: Subscriptions
// ============================================================================

interface SubscriptionsTabProps {
  userId: string;
}

const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ userId }) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-subscriptions', userId, page],
    queryFn: () =>
      adminAPI.getUserSubscriptions(userId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading subscriptions..." />;
  if (error) return <EmptyState icon={<AlertCircle />} title="Failed to load subscriptions" />;
  if (!data) return null;

  const subscriptionColumns: Column<UserSubscriptionsResponse['subscriptions'][0]>[] = [
    {
      key: 'tier',
      label: 'Tier',
      render: (value) => <TierBadge tier={value as any} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as any} />,
    },
    {
      key: 'billingCycle',
      label: 'Billing Cycle',
      render: (value) => <span className="capitalize">{value}</span>,
    },
    {
      key: 'startedAt',
      label: 'Started',
      render: (value) => formatDate(value),
    },
    {
      key: 'endedAt',
      label: 'Ended',
      render: (value) => (value ? formatDate(value) : '-'),
    },
    {
      key: 'price',
      label: 'Price',
      render: (value) => formatCurrency(value),
    },
  ];

  const prorationColumns: Column<UserSubscriptionsResponse['prorations'][0]>[] = [
    {
      key: 'fromTier',
      label: 'From',
      render: (value) => <TierBadge tier={value as any} size="sm" />,
    },
    {
      key: 'toTier',
      label: 'To',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <TierBadge tier={value as any} size="sm" />
          {row.toTier > row.fromTier ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </div>
      ),
    },
    {
      key: 'prorationAmount',
      label: 'Proration',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Subscription History */}
      <div>
        <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
          Subscription History
        </h3>
        <AdminDataTable
          columns={subscriptionColumns}
          data={data.subscriptions}
          loading={isLoading}
        />
        <div className="mt-4">
          <AdminPagination
            currentPage={page}
            totalPages={Math.ceil(data.total / pageSize)}
            pageSize={pageSize}
            totalItems={data.total}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Proration Events */}
      {data.prorations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">
            Proration Events
          </h3>
          <AdminDataTable
            columns={prorationColumns}
            data={data.prorations}
            loading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Tab 3: Licenses
// ============================================================================

interface LicensesTabProps {
  userId: string;
}

const LicensesTab: React.FC<LicensesTabProps> = ({ userId }) => {
  const [page] = useState(1);
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-licenses', userId, page],
    queryFn: () =>
      adminAPI.getUserLicenses(userId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading licenses..." />;
  if (error) return <EmptyState icon={<AlertCircle />} title="Failed to load licenses" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      <h3 className="text-lg font-semibold text-deep-navy-800">Licenses</h3>

      {data.licenses.map((license) => (
        <div key={license.id} className="border border-deep-navy-200 rounded-lg overflow-hidden">
          {/* License Header */}
          <div
            className="bg-deep-navy-50 p-4 cursor-pointer hover:bg-deep-navy-100 transition-colors"
            onClick={() =>
              setExpandedLicense(expandedLicense === license.id ? null : license.id)
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Key className="h-5 w-5 text-deep-navy-600" />
                <div>
                  <p className="font-mono text-sm text-deep-navy-800">
                    {maskLicenseKey(license.licenseKey)}
                  </p>
                  <p className="text-xs text-deep-navy-600 mt-1">
                    Purchased {formatDate(license.purchasedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={license.status as any} />
                <span className="text-sm text-deep-navy-600">
                  {formatCurrency(license.price)}
                </span>
                {expandedLicense === license.id ? (
                  <ChevronUp className="h-5 w-5 text-deep-navy-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-deep-navy-600" />
                )}
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedLicense === license.id && (
            <div className="p-4 space-y-4 bg-white">
              {/* Device Activations */}
              {license.deviceActivations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-deep-navy-800 mb-2 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Device Activations ({license.deviceActivations.length})
                  </h4>
                  <div className="space-y-2">
                    {license.deviceActivations.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-3 bg-deep-navy-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-deep-navy-800">
                            {device.deviceName || 'Unknown Device'}
                          </p>
                          <p className="text-xs text-deep-navy-600">
                            ID: {device.deviceId} • Activated {formatDate(device.activatedAt)}
                            {device.lastSeen && ` • Last seen ${formatRelativeTime(device.lastSeen)}`}
                          </p>
                        </div>
                        <StatusBadge status={device.status as any} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version Upgrades */}
              {license.versionUpgrades.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-deep-navy-800 mb-2">
                    Version Upgrades ({license.versionUpgrades.length})
                  </h4>
                  <div className="space-y-2">
                    {license.versionUpgrades.map((upgrade) => (
                      <div
                        key={upgrade.id}
                        className="flex items-center justify-between p-3 bg-deep-navy-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-deep-navy-600">{upgrade.fromVersion}</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-deep-navy-800">
                            {upgrade.toVersion}
                          </span>
                          <span className="text-xs text-deep-navy-600">
                            • {formatDate(upgrade.upgradedAt)}
                          </span>
                        </div>
                        <span className="text-sm text-deep-navy-600">
                          {formatCurrency(upgrade.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {data.licenses.length === 0 && (
        <EmptyState
          icon={<Key className="h-8 w-8 text-deep-navy-400" />}
          title="No licenses"
          description="This user has no licenses yet."
        />
      )}

      {data.total > pageSize && (
        <div className="mt-4">
          <AdminPagination
            currentPage={page}
            totalPages={Math.ceil(data.total / pageSize)}
            pageSize={pageSize}
            totalItems={data.total}
            onPageChange={() => {}}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Tab 4: Credits
// ============================================================================

interface CreditsTabProps {
  userId: string;
}

const CreditsTab: React.FC<CreditsTabProps> = ({ userId }) => {
  const [period, setPeriod] = useState('30d');
  const [page] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-credits', userId, period, page],
    queryFn: () =>
      adminAPI.getUserCredits(userId, {
        period,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading credits..." />;
  if (error) return <EmptyState icon={<AlertCircle />} title="Failed to load credits" />;
  if (!data) return null;

  const allocationColumns: Column<UserCreditsResponse['allocations'][0]>[] = [
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => (
        <span className="font-semibold text-green-600">+{formatNumber(value)}</span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (value) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value) => value || '-',
    },
    {
      key: 'allocatedAt',
      label: 'Date',
      render: (value) => formatDate(value),
    },
  ];

  const deductionColumns: Column<UserCreditsResponse['deductions'][0]>[] = [
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => (
        <span className="font-semibold text-red-600">-{formatNumber(value)}</span>
      ),
    },
    {
      key: 'model',
      label: 'Model',
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (value) => formatRelativeTime(value),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-deep-navy-800">Credit Activity</h3>
        <div className="flex items-center gap-2 bg-deep-navy-50 rounded-lg p-1">
          {['7d', '30d', '90d', '1y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-rephlo-blue text-white'
                  : 'text-deep-navy-600 hover:bg-deep-navy-100'
              }`}
            >
              {p === '1y' ? '1 Year' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Credit Balance Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8" />
            <div>
              <p className="text-sm opacity-90">Current Balance</p>
              <p className="text-4xl font-bold">{formatNumber(data.balance)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Last Updated</p>
            <p className="text-sm font-medium">{formatRelativeTime(data.lastUpdated)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-sm opacity-90">Total Allocated</p>
            <p className="text-xl font-semibold">{formatNumber(data.totals.totalAllocated)}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Total Used</p>
            <p className="text-xl font-semibold">{formatNumber(data.totals.totalUsed)}</p>
          </div>
        </div>
      </div>

      {/* Usage by Model */}
      {data.usageByModel.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-deep-navy-800 mb-3">Usage by Model</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.usageByModel.map((model, index) => (
              <div key={index} className="bg-deep-navy-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-deep-navy-800">{model.model}</p>
                  <span className="text-sm font-semibold text-rephlo-blue">
                    {formatNumber(model.totalCredits)}
                  </span>
                </div>
                <p className="text-xs text-deep-navy-600">
                  {formatNumber(model.requestCount)} requests
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocations */}
      <div>
        <h4 className="text-sm font-semibold text-deep-navy-800 mb-3">Credit Allocations</h4>
        <AdminDataTable columns={allocationColumns} data={data.allocations} />
      </div>

      {/* Deductions */}
      <div>
        <h4 className="text-sm font-semibold text-deep-navy-800 mb-3">
          Recent Deductions ({data.deductions.length})
        </h4>
        <AdminDataTable columns={deductionColumns} data={data.deductions} />
      </div>
    </div>
  );
};

// ============================================================================
// Tab 5: Coupons
// ============================================================================

interface CouponsTabProps {
  userId: string;
}

const CouponsTab: React.FC<CouponsTabProps> = ({ userId }) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-coupons', userId, page],
    queryFn: () =>
      adminAPI.getUserCoupons(userId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading coupons..." />;
  if (error) return <EmptyState icon={<AlertCircle />} title="Failed to load coupons" />;
  if (!data) return null;

  const redemptionColumns: Column<UserCouponsResponse['redemptions'][0]>[] = [
    {
      key: 'couponCode',
      label: 'Coupon Code',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (value) => (value ? formatCurrency(value) : '-'),
    },
    {
      key: 'grantedBenefits',
      label: 'Benefits',
      render: (value) => value || '-',
    },
    {
      key: 'redeemedAt',
      label: 'Redeemed',
      render: (value) => formatDate(value),
    },
  ];

  const fraudColumns: Column<UserCouponsResponse['fraudFlags'][0]>[] = [
    {
      key: 'couponCode',
      label: 'Coupon Code',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (value: 'low' | 'medium' | 'high') => {
        const colors: Record<'low' | 'medium' | 'high', string> = {
          low: 'bg-yellow-100 text-yellow-800',
          medium: 'bg-orange-100 text-orange-800',
          high: 'bg-red-100 text-red-800',
        };
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${colors[value]}`}
          >
            {value}
          </span>
        );
      },
    },
    {
      key: 'reason',
      label: 'Reason',
    },
    {
      key: 'flaggedAt',
      label: 'Flagged',
      render: (value) => formatDate(value),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Total Discount Card */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Total Discount Value</h3>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(data.totalDiscount)}</p>
        <p className="text-sm opacity-90 mt-1">Saved from {data.redemptions.length} coupons</p>
      </div>

      {/* Fraud Flags (if any) */}
      {data.fraudFlags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-red-600" />
            <h4 className="text-sm font-semibold text-red-800">
              Fraud Flags ({data.fraudFlags.length})
            </h4>
          </div>
          <AdminDataTable columns={fraudColumns} data={data.fraudFlags} />
        </div>
      )}

      {/* Redemption History */}
      <div>
        <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">Redemption History</h3>
        <AdminDataTable columns={redemptionColumns} data={data.redemptions} />
        {data.total > pageSize && (
          <div className="mt-4">
            <AdminPagination
              currentPage={page}
              totalPages={Math.ceil(data.total / pageSize)}
              pageSize={pageSize}
              totalItems={data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {data.redemptions.length === 0 && (
        <EmptyState
          icon={<Ticket className="h-8 w-8 text-deep-navy-400" />}
          title="No coupons redeemed"
          description="This user has not redeemed any coupons yet."
        />
      )}
    </div>
  );
};

// ============================================================================
// Tab 6: Payments
// ============================================================================

interface PaymentsTabProps {
  userId: string;
}

const PaymentsTab: React.FC<PaymentsTabProps> = ({ userId }) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-payments', userId, page],
    queryFn: () =>
      adminAPI.getUserPayments(userId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading payments..." />;
  if (error) return <EmptyState icon={<AlertCircle />} title="Failed to load payments" />;
  if (!data) return null;

  const invoiceColumns: Column<UserPaymentsResponse['invoices'][0]>[] = [
    {
      key: 'invoiceId',
      label: 'Invoice ID',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as any} size="sm" />,
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => value || '-',
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value) => formatDate(value),
    },
    {
      key: 'stripeInvoiceUrl',
      label: 'Actions',
      render: (value) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-rephlo-blue hover:underline"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Payment Method Card */}
      {data.paymentMethod && (
        <div className="bg-deep-navy-50 rounded-lg p-6 border border-deep-navy-200">
          <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">Payment Method</h3>
          <div className="flex items-center gap-4">
            <CreditCard className="h-8 w-8 text-deep-navy-600" />
            <div>
              <p className="text-deep-navy-800 font-medium">
                {data.paymentMethod.brand || data.paymentMethod.type} ending in{' '}
                {data.paymentMethod.last4}
              </p>
              {data.stripeCustomerId && (
                <p className="text-sm text-deep-navy-600 mt-1">
                  Stripe Customer: {data.stripeCustomerId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Message */}
      {data.invoices.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Receipt className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Payment Integration Coming Soon
          </h3>
          <p className="text-sm text-blue-700">
            Full payment history and invoice management will be available once Stripe integration
            is complete.
          </p>
          {data.stripeCustomerId && (
            <p className="text-xs text-blue-600 mt-2">
              Stripe Customer ID: {data.stripeCustomerId}
            </p>
          )}
        </div>
      )}

      {/* Invoice History */}
      {data.invoices.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-deep-navy-800 mb-4">Invoice History</h3>
          <AdminDataTable columns={invoiceColumns} data={data.invoices} />
          {data.total > pageSize && (
            <div className="mt-4">
              <AdminPagination
                currentPage={page}
                totalPages={Math.ceil(data.total / pageSize)}
                pageSize={pageSize}
                totalItems={data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Tab 7: Activity
// ============================================================================

interface ActivityTabProps {
  userId: string;
}

const ActivityTab: React.FC<ActivityTabProps> = ({ userId }) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-activity', userId, typeFilter, page],
    queryFn: () =>
      adminAPI.getUserActivity(userId, {
        type: typeFilter === 'all' ? undefined : typeFilter,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading activity..." />;
  if (error) return <EmptyState icon={<AlertCircle />} title="Failed to load activity" />;
  if (!data) return null;

  const activityTypes = [
    { value: 'all', label: 'All Activity', icon: Activity },
    { value: 'subscription', label: 'Subscriptions', icon: CreditCard },
    { value: 'license', label: 'Licenses', icon: Key },
    { value: 'coupon', label: 'Coupons', icon: Ticket },
    { value: 'credit', label: 'Credits', icon: Zap },
    { value: 'device', label: 'Devices', icon: Smartphone },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="flex items-center gap-2 flex-wrap">
        {activityTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setTypeFilter(type.value);
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === type.value
                ? 'bg-rephlo-blue text-white'
                : 'bg-deep-navy-50 text-deep-navy-600 hover:bg-deep-navy-100'
            }`}
          >
            <type.icon className="h-4 w-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {data.activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 bg-white border border-deep-navy-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <ActivityIcon type={activity.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-deep-navy-800 font-medium">{activity.description}</p>
              <p className="text-xs text-deep-navy-600 mt-1">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {data.activities.length === 0 && (
        <EmptyState
          icon={<Activity className="h-8 w-8 text-deep-navy-400" />}
          title="No activity"
          description={
            typeFilter === 'all'
              ? 'This user has no recorded activity.'
              : `No ${typeFilter} activity found.`
          }
        />
      )}

      {data.total > pageSize && (
        <div className="mt-4">
          <AdminPagination
            currentPage={page}
            totalPages={Math.ceil(data.total / pageSize)}
            pageSize={pageSize}
            totalItems={data.total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function maskLicenseKey(key: string): string {
  // Mask license key: REPHLO-****-****-XXXX-XXXX
  const parts = key.split('-');
  if (parts.length === 5) {
    return `${parts[0]}-****-****-${parts[3]}-${parts[4]}`;
  }
  return key;
}

// Activity type icon mapping (reused from dashboard)
const ActivityIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconClass = 'h-5 w-5';
  const icons: Record<string, JSX.Element> = {
    subscription: <CreditCard className={`${iconClass} text-blue-500`} />,
    license: <Key className={`${iconClass} text-green-500`} />,
    coupon: <Ticket className={`${iconClass} text-purple-500`} />,
    credit: <Zap className={`${iconClass} text-yellow-500`} />,
    device: <Smartphone className={`${iconClass} text-indigo-500`} />,
  };
  return (
    <div className="p-2 bg-deep-navy-50 rounded-lg shrink-0">
      {icons[type] || <Activity className={`${iconClass} text-gray-500`} />}
    </div>
  );
};

export default UserDetailUnified;
