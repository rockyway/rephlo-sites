/**
 * Perpetual License Management Page
 *
 * Central hub for viewing and managing all perpetual licenses and device activations.
 *
 * Features:
 * - License list with filters (status, search, date range)
 * - Quick stats (Active Licenses, Total Revenue, Avg Devices, Max Capacity)
 * - Device activation monitoring
 * - License actions (View Details, Suspend, Revoke, Reactivate)
 * - Version upgrade history
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Users,
  HardDrive,
  AlertCircle,
  X as XIcon,
  ChevronRight,
  Monitor,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ConfirmationModal } from '@/components/plan109';
import {
  LicenseStatusBadge,
  DeviceActivationCard,
  VersionBadge,
  DiscountBadge,
} from '@/components/plan110';
import { licenseApi, activationApi, upgradeApi } from '@/api/plan110';
import {
  LicenseStatus,
  type PerpetualLicense,
  type LicenseActivation,
  type VersionUpgrade,
  type LicenseStats,
} from '@/types/plan110.types';
import { formatCurrency, formatNumber } from '@/lib/plan109.utils';
import { formatDate, formatLicenseKey } from '@/lib/plan110.utils';
import { cn } from '@/lib/utils';

function PerpetualLicenseManagement() {
  // State
  const [licenses, setLicenses] = useState<PerpetualLicense[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'status' | 'purchaseDate' | 'price'>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals & Expanded Rows
  const [selectedLicense, setSelectedLicense] = useState<PerpetualLicense | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedLicenseId, setExpandedLicenseId] = useState<string | null>(null);
  const [deviceActivations, setDeviceActivations] = useState<Record<string, LicenseActivation[]>>({});
  const [upgradeHistory, setUpgradeHistory] = useState<Record<string, VersionUpgrade[]>>({});

  // Load data
  useEffect(() => {
    loadData();
  }, [filterStatus, searchQuery, page]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load licenses and stats in parallel
      const [licensesResponse, statsData] = await Promise.all([
        licenseApi.getAllLicenses({
          status: filterStatus as LicenseStatus || undefined,
          search: searchQuery || undefined,
          page,
          limit,
        }),
        licenseApi.getStats(),
      ]);

      setLicenses(licensesResponse.data || []);
      setTotalPages(licensesResponse.totalPages);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load licenses');
    } finally {
      setIsLoading(false);
    }
  };

  // Load device activations for expanded license
  const loadDeviceActivations = async (licenseKey: string) => {
    try {
      const response = await activationApi.getActiveDevices(licenseKey);
      setDeviceActivations((prev) => ({
        ...prev,
        [licenseKey]: response.activations,
      }));
    } catch (err: any) {
      console.error('Failed to load device activations:', err);
    }
  };

  // Load upgrade history for expanded license
  const loadUpgradeHistory = async (licenseKey: string) => {
    try {
      const response = await upgradeApi.getUpgradeHistory(licenseKey);
      setUpgradeHistory((prev) => ({
        ...prev,
        [licenseKey]: response.history,
      }));
    } catch (err: any) {
      console.error('Failed to load upgrade history:', err);
    }
  };

  // Toggle license expansion
  const toggleLicenseExpansion = (license: PerpetualLicense) => {
    if (expandedLicenseId === license.id) {
      setExpandedLicenseId(null);
    } else {
      setExpandedLicenseId(license.id);
      if (!deviceActivations[license.licenseKey]) {
        loadDeviceActivations(license.licenseKey);
      }
      if (!upgradeHistory[license.licenseKey]) {
        loadUpgradeHistory(license.licenseKey);
      }
    }
  };

  // Handlers
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSuspendLicense = async (reason: string | undefined) => {
    if (!selectedLicense || !reason) return;

    setIsProcessing(true);
    try {
      await licenseApi.suspendLicense(selectedLicense.id, {
        licenseId: selectedLicense.id,
        reason,
      });

      setSuccessMessage('License suspended successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
      setShowSuspendModal(false);
      setSelectedLicense(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to suspend license');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeLicense = async (reason: string | undefined) => {
    if (!selectedLicense || !reason) return;

    setIsProcessing(true);
    try {
      await licenseApi.revokeLicense(selectedLicense.id, {
        licenseId: selectedLicense.id,
        reason,
      });

      setSuccessMessage('License revoked successfully (permanent)');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
      setShowRevokeModal(false);
      setSelectedLicense(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke license');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async (license: PerpetualLicense) => {
    try {
      await licenseApi.reactivateLicense(license.id);
      setSuccessMessage('License reactivated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reactivate license');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeactivateDevice = async (activationId: string) => {
    if (!confirm('Are you sure you want to deactivate this device?')) return;

    try {
      await activationApi.deactivateDevice(activationId);
      setSuccessMessage('Device deactivated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Reload activations for the expanded license
      if (expandedLicenseId) {
        const license = licenses.find((l) => l.id === expandedLicenseId);
        if (license) {
          loadDeviceActivations(license.licenseKey);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate device');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Sort licenses
  const sortedLicenses = [...licenses].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'status':
        compareValue = a.status.localeCompare(b.status);
        break;
      case 'purchaseDate':
        compareValue = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        break;
      case 'price':
        compareValue = a.purchasePrice - b.purchasePrice;
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800">Perpetual License Management</h1>
          <p className="text-body text-deep-navy-500 mt-1">
            View and manage perpetual licenses, device activations, and version upgrades
          </p>
        </div>
        <Button onClick={loadData} disabled={isLoading} variant="ghost">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-green-600" />
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total Active Licenses</h3>
                <Users className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatNumber(stats.totalActive)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Total Perpetual Revenue</h3>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{formatCurrency(stats.totalRevenue, 0)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Average Devices per License</h3>
                <HardDrive className="h-5 w-5 text-rephlo-blue" />
              </div>
              <p className="text-h2 font-bold text-deep-navy-800">{stats.avgDevicesPerLicense.toFixed(1)}</p>
            </div>

            <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body-sm text-deep-navy-600 font-medium">Licenses at Max Capacity</h3>
                <AlertCircle
                  className={cn(
                    'h-5 w-5',
                    stats.licensesAtMaxCapacity > 0 ? 'text-amber-600' : 'text-deep-navy-400'
                  )}
                />
              </div>
              <p
                className={cn(
                  'text-h2 font-bold',
                  stats.licensesAtMaxCapacity > 0 ? 'text-amber-600' : 'text-deep-navy-800'
                )}
              >
                {stats.licensesAtMaxCapacity} ({stats.licensesAtMaxCapacityPercentage.toFixed(0)}%)
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mb-6">
          <h3 className="text-h4 font-semibold text-deep-navy-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-deep-navy-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue"
              >
                <option value="">All Status</option>
                <option value={LicenseStatus.PENDING}>Pending</option>
                <option value={LicenseStatus.ACTIVE}>Active</option>
                <option value={LicenseStatus.SUSPENDED}>Suspended</option>
                <option value={LicenseStatus.REVOKED}>Revoked</option>
                <option value={LicenseStatus.EXPIRED}>Expired</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">Search</label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by license key, user email, or user ID..."
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deep-navy-400" />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filterStatus || searchQuery) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-body-sm text-deep-navy-600">Active filters:</span>
              {filterStatus && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-navy-100 text-deep-navy-700 rounded text-caption">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus('')}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-deep-navy-100 text-deep-navy-700 rounded text-caption">
                  Search: {searchQuery}
                  <button onClick={() => setSearchQuery('')}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setFilterStatus('');
                  setSearchQuery('');
                }}
                className="text-caption text-rephlo-blue hover:text-rephlo-blue-600"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Licenses Table */}
        <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : sortedLicenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-body text-deep-navy-500">No licenses found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 w-8"></th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      License Key
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      User Email
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Status
                        {sortBy === 'status' &&
                          (sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('price')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Purchase Price
                        {sortBy === 'price' &&
                          (sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      Devices
                    </th>
                    <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                      <button
                        onClick={() => handleSort('purchaseDate')}
                        className="flex items-center gap-1 hover:text-rephlo-blue"
                      >
                        Purchase Date
                        {sortBy === 'purchaseDate' &&
                          (sortOrder === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-body-sm font-semibold text-deep-navy-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-100">
                  {sortedLicenses.map((license) => {
                    const isExpanded = expandedLicenseId === license.id;
                    const activations = deviceActivations[license.licenseKey] || [];
                    const upgrades = upgradeHistory[license.licenseKey] || [];

                    return (
                      <>
                        {/* Main Row */}
                        <tr
                          key={license.id}
                          className="hover:bg-deep-navy-50 transition-colors cursor-pointer"
                          onClick={() => toggleLicenseExpansion(license)}
                        >
                          <td className="px-6 py-4">
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 text-deep-navy-400 transition-transform',
                                isExpanded && 'transform rotate-90'
                              )}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-body font-mono text-deep-navy-800">
                              {formatLicenseKey(license.licenseKey)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-body text-deep-navy-800">{license.user?.email || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <LicenseStatusBadge status={license.status} />
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-body font-medium text-deep-navy-800">
                              {formatCurrency(license.purchasePrice)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <VersionBadge version={license.purchasedVersion} />
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'text-body',
                                license.currentActivations >= license.maxActivations
                                  ? 'text-amber-600 font-medium'
                                  : 'text-deep-navy-700'
                              )}
                            >
                              {license.currentActivations}/{license.maxActivations}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-body-sm text-deep-navy-600">
                              {formatDate(license.purchaseDate)}
                            </span>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {license.status === LicenseStatus.SUSPENDED ? (
                                <Button size="sm" onClick={() => handleReactivate(license)}>
                                  Reactivate
                                </Button>
                              ) : license.status === LicenseStatus.ACTIVE ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedLicense(license);
                                      setShowSuspendModal(true);
                                    }}
                                  >
                                    Suspend
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedLicense(license);
                                      setShowRevokeModal(true);
                                    }}
                                  >
                                    Revoke
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="px-6 py-6 bg-deep-navy-25">
                              <div className="space-y-6">
                                {/* Device Activations */}
                                <div>
                                  <h4 className="text-h4 font-semibold text-deep-navy-800 mb-3">
                                    Device Activations ({activations.length}/{license.maxActivations})
                                  </h4>
                                  {activations.length === 0 ? (
                                    <p className="text-body-sm text-deep-navy-500">No active devices</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {activations.map((activation) => (
                                        <DeviceActivationCard
                                          key={activation.id}
                                          activation={activation}
                                          onDeactivate={handleDeactivateDevice}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Version Upgrade History */}
                                <div>
                                  <h4 className="text-h4 font-semibold text-deep-navy-800 mb-3">
                                    Version Upgrade History
                                  </h4>
                                  {upgrades.length === 0 ? (
                                    <p className="text-body-sm text-deep-navy-500">No upgrades purchased</p>
                                  ) : (
                                    <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden">
                                      <table className="w-full">
                                        <thead className="bg-deep-navy-50">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-caption font-semibold text-deep-navy-700">
                                              From Version
                                            </th>
                                            <th className="px-4 py-2 text-left text-caption font-semibold text-deep-navy-700">
                                              To Version
                                            </th>
                                            <th className="px-4 py-2 text-left text-caption font-semibold text-deep-navy-700">
                                              Upgrade Price
                                            </th>
                                            <th className="px-4 py-2 text-left text-caption font-semibold text-deep-navy-700">
                                              Discount
                                            </th>
                                            <th className="px-4 py-2 text-left text-caption font-semibold text-deep-navy-700">
                                              Purchase Date
                                            </th>
                                            <th className="px-4 py-2 text-left text-caption font-semibold text-deep-navy-700">
                                              Status
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-deep-navy-100">
                                          {upgrades.map((upgrade) => (
                                            <tr key={upgrade.id}>
                                              <td className="px-4 py-2">
                                                <VersionBadge version={upgrade.fromVersion} />
                                              </td>
                                              <td className="px-4 py-2">
                                                <VersionBadge version={upgrade.toVersion} />
                                              </td>
                                              <td className="px-4 py-2">
                                                <div>
                                                  <span className="text-body-sm font-medium text-deep-navy-800">
                                                    {formatCurrency(upgrade.finalPrice)}
                                                  </span>
                                                  {upgrade.discountApplied && upgrade.discountApplied > 0 && (
                                                    <div className="text-caption text-deep-navy-500 line-through">
                                                      {formatCurrency(upgrade.upgradePrice)}
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-4 py-2">
                                                {upgrade.discountType && upgrade.discountApplied ? (
                                                  <DiscountBadge
                                                    type={upgrade.discountType}
                                                    percentage={upgrade.discountApplied}
                                                  />
                                                ) : (
                                                  <span className="text-caption text-deep-navy-500">None</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-2">
                                                <span className="text-body-sm text-deep-navy-600">
                                                  {formatDate(upgrade.purchaseDate)}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2">
                                                <span
                                                  className={cn(
                                                    'text-caption font-medium',
                                                    upgrade.status === 'completed'
                                                      ? 'text-green-600'
                                                      : upgrade.status === 'failed'
                                                      ? 'text-red-600'
                                                      : 'text-gray-600'
                                                  )}
                                                >
                                                  {upgrade.status}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-deep-navy-200 flex items-center justify-between">
              <p className="text-body-sm text-deep-navy-600">
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

      {/* Suspend License Modal */}
      <ConfirmationModal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedLicense(null);
        }}
        onConfirm={handleSuspendLicense}
        title="Suspend License"
        description={`Are you sure you want to suspend license ${
          selectedLicense ? formatLicenseKey(selectedLicense.licenseKey) : ''
        }?`}
        confirmText="Suspend License"
        requireReason
        reasonLabel="Suspension Reason"
        reasonPlaceholder="Enter reason for suspension..."
        variant="warning"
        isProcessing={isProcessing}
      />

      {/* Revoke License Modal */}
      <ConfirmationModal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedLicense(null);
        }}
        onConfirm={handleRevokeLicense}
        title="Revoke License (Permanent)"
        description={`⚠️ WARNING: This action is permanent and cannot be undone. Are you sure you want to revoke license ${
          selectedLicense ? formatLicenseKey(selectedLicense.licenseKey) : ''
        }?`}
        confirmText="Revoke License (Permanent)"
        requireReason
        reasonLabel="Revocation Reason"
        reasonPlaceholder="Enter reason for permanent revocation..."
        variant="danger"
        isProcessing={isProcessing}
      />
    </div>
  );
}

export default PerpetualLicenseManagement;
