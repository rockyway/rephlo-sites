/**
 * Device Activation Management Page
 *
 * Admin interface for managing device activations for perpetual licenses.
 *
 * Features:
 * - Device activation table with user and license details
 * - Search and filter by user, license, OS, status
 * - Deactivate/revoke individual devices
 * - Bulk operations (deactivate, revoke)
 * - Suspicious activity detection
 * - Statistics dashboard
 *
 * Priority: P1 - High (Plan 131, Phase 3)
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  Shield,
  AlertTriangle,
  Clock,
  Ban,
  X as XIcon,
  ChevronRight,
  ChevronLeft,
  Info,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ConfirmationModal } from '@/components/plan109';
import { activationApi } from '@/api/plan110';
import { ActivationStatus } from '@/types/plan110.types';
import { formatDate, downloadCSV } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Types
// ============================================================================

interface DeviceActivationData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  licenseId: string;
  licenseKey: string;
  deviceName: string;
  deviceId: string;
  os: string;
  ipAddress: string;
  activatedAt: string;
  lastSeenAt: string;
  status: ActivationStatus;
  isSuspicious: boolean;
  suspiciousFlags: string[];
}

interface DeviceStats {
  totalActive: number;
  licensesAtMaxCapacity: number;
  recentlyActivated24h: number;
  suspiciousActivations: number;
}

// ============================================================================
// Component
// ============================================================================

function DeviceActivationManagement() {
  // State
  const [devices, setDevices] = useState<DeviceActivationData[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterOS, setFilterOS] = useState<string>('');
  const [filterSuspicious, setFilterSuspicious] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'activated' | 'lastSeen' | 'user' | 'license'>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedDevice, setSelectedDevice] = useState<DeviceActivationData | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk operations
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'deactivate' | 'revoke'>('deactivate');
  const [bulkReason, setBulkReason] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, [filterStatus, filterOS, filterSuspicious, searchQuery, page]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API calls when backend is implemented
      // For now, using mock data
      const mockDevices: DeviceActivationData[] = [
        {
          id: '1',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          licenseId: 'lic-1',
          licenseKey: 'REPH-XXXX-YYYY-ZZZZ',
          deviceName: 'Johns-MacBook-Pro',
          deviceId: 'mac-fingerprint-abc123',
          os: 'macOS 14.0',
          ipAddress: '192.168.1.100',
          activatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          lastSeenAt: new Date().toISOString(),
          status: ActivationStatus.ACTIVE,
          isSuspicious: false,
          suspiciousFlags: [],
        },
        {
          id: '2',
          userId: 'user-2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          licenseId: 'lic-2',
          licenseKey: 'REPH-AAAA-BBBB-CCCC',
          deviceName: 'Work-Desktop',
          deviceId: 'win-fingerprint-def456',
          os: 'Windows 11',
          ipAddress: '10.0.0.50',
          activatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
          status: ActivationStatus.ACTIVE,
          isSuspicious: true,
          suspiciousFlags: ['Rapid activations', 'Multiple IPs'],
        },
      ];

      const mockStats: DeviceStats = {
        totalActive: 1234,
        licensesAtMaxCapacity: 45,
        recentlyActivated24h: 78,
        suspiciousActivations: 12,
      };

      // Apply filters
      let filtered = mockDevices;
      if (filterStatus) {
        filtered = filtered.filter((d) => d.status === filterStatus);
      }
      if (filterOS) {
        filtered = filtered.filter((d) => d.os.toLowerCase().includes(filterOS.toLowerCase()));
      }
      if (filterSuspicious === 'true') {
        filtered = filtered.filter((d) => d.isSuspicious);
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.userName.toLowerCase().includes(query) ||
            d.userEmail.toLowerCase().includes(query) ||
            d.licenseKey.toLowerCase().includes(query) ||
            d.deviceName.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;

        switch (sortBy) {
          case 'activated':
            aVal = new Date(a.activatedAt).getTime();
            bVal = new Date(b.activatedAt).getTime();
            break;
          case 'lastSeen':
            aVal = new Date(a.lastSeenAt).getTime();
            bVal = new Date(b.lastSeenAt).getTime();
            break;
          case 'user':
            aVal = a.userName;
            bVal = b.userName;
            break;
          case 'license':
            aVal = a.licenseKey;
            bVal = b.licenseKey;
            break;
        }

        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      setDevices(filtered);
      setStats(mockStats);
      setTotalPages(Math.ceil(filtered.length / limit));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load device activations');
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

  const handleDeactivate = async () => {
    if (!selectedDevice) return;

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await activationApi.deactivateDevice(selectedDevice.id);

      setSuccessMessage(`Device "${selectedDevice.deviceName}" deactivated successfully`);
      setShowDeactivateModal(false);
      setSelectedDevice(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate device');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedDevice || !revokeReason.trim()) {
      setError('Please provide a reason for revocation');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await activationApi.revokeDevice(selectedDevice.id, { reason: revokeReason });

      setSuccessMessage(`Device "${selectedDevice.deviceName}" revoked successfully`);
      setShowRevokeModal(false);
      setSelectedDevice(null);
      setRevokeReason('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke device');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedDeviceIds.size === 0) {
      setError('Please select at least one device');
      return;
    }

    if (bulkAction === 'revoke' && !bulkReason.trim()) {
      setError('Please provide a reason for revocation');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual bulk API
      const actionText = bulkAction === 'deactivate' ? 'deactivated' : 'revoked';
      setSuccessMessage(`Successfully ${actionText} ${selectedDeviceIds.size} devices`);
      setShowBulkModal(false);
      setSelectedDeviceIds(new Set());
      setBulkReason('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to perform bulk action');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    const newSelection = new Set(selectedDeviceIds);
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId);
    } else {
      newSelection.add(deviceId);
    }
    setSelectedDeviceIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDeviceIds.size === devices.length) {
      setSelectedDeviceIds(new Set());
    } else {
      setSelectedDeviceIds(new Set(devices.map((d) => d.id)));
    }
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterOS('');
    setFilterSuspicious('');
    setSearchQuery('');
    setPage(1);
  };

  const handleExport = () => {
    if (devices.length === 0) return;

    const exportData = devices.map((device) => ({
      User: device.userName,
      Email: device.userEmail,
      'License Key': device.licenseKey,
      'Device Name': device.deviceName,
      OS: device.os,
      'IP Address': device.ipAddress,
      'Activated At': formatDate(device.activatedAt, 'long'),
      'Last Seen': formatDate(device.lastSeenAt, 'long'),
      Status: device.status,
      Suspicious: device.isSuspicious ? 'Yes' : 'No',
      Flags: device.suspiciousFlags.join('; '),
    }));

    downloadCSV(exportData, 'device-activations');
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
          <h1 className="text-3xl font-bold text-gray-900">Device Activation Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage device activations for perpetual licenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={devices.length === 0}>
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
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active Devices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActive.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Licenses at Max Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{stats.licensesAtMaxCapacity}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Recently Activated (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentlyActivated24h}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-3">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Suspicious Activations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.suspiciousActivations}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-deep-navy-800 p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="User, license, device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value={ActivationStatus.ACTIVE}>Active</option>
              <option value={ActivationStatus.INACTIVE}>Inactive</option>
              <option value={ActivationStatus.STALE}>Stale</option>
              <option value={ActivationStatus.DEACTIVATED}>Deactivated</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">OS</label>
            <select
              value={filterOS}
              onChange={(e) => setFilterOS(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="windows">Windows</option>
              <option value="macos">macOS</option>
              <option value="linux">Linux</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Suspicious</label>
            <select
              value={filterSuspicious}
              onChange={(e) => setFilterSuspicious(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Suspicious Only</option>
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
      {selectedDeviceIds.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedDeviceIds.size} device{selectedDeviceIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDeviceIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkAction('deactivate');
                  setShowBulkModal(true);
                }}
              >
                Deactivate Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setBulkAction('revoke');
                  setShowBulkModal(true);
                }}
              >
                Revoke Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
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
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-deep-navy-800 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No device activations found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDeviceIds.size === devices.length && devices.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 hover:bg-gray-100"
                      onClick={() => handleSort('user')}
                    >
                      <div className="flex items-center gap-1">
                        User
                        {sortBy === 'user' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 hover:bg-gray-100"
                      onClick={() => handleSort('license')}
                    >
                      <div className="flex items-center gap-1">
                        License Key
                        {sortBy === 'license' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                      Device Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                      OS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                      IP Address
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 hover:bg-gray-100"
                      onClick={() => handleSort('activated')}
                    >
                      <div className="flex items-center gap-1">
                        Activated At
                        {sortBy === 'activated' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 hover:bg-gray-100"
                      onClick={() => handleSort('lastSeen')}
                    >
                      <div className="flex items-center gap-1">
                        Last Seen
                        {sortBy === 'lastSeen' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {devices.map((device) => (
                    <tr
                      key={device.id}
                      className={cn(
                        'hover:bg-gray-50',
                        device.isSuspicious && 'bg-yellow-50'
                      )}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDeviceIds.has(device.id)}
                          onChange={() => toggleDeviceSelection(device.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{device.userName}</p>
                          <p className="text-sm text-gray-500">{device.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-800">
                          {device.licenseKey}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900">{device.deviceName}</p>
                          {device.isSuspicious && (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" title="Suspicious activity detected" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-900">{device.os}</td>
                      <td className="px-4 py-4">
                        <code className="text-sm font-mono text-gray-600">{device.ipAddress}</code>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(device.activatedAt)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(device.lastSeenAt)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                            device.status === ActivationStatus.ACTIVE &&
                              'bg-green-100 text-green-700',
                            device.status === ActivationStatus.INACTIVE &&
                              'bg-gray-100 text-gray-700',
                            device.status === ActivationStatus.STALE &&
                              'bg-yellow-100 text-yellow-700',
                            device.status === ActivationStatus.DEACTIVATED &&
                              'bg-red-100 text-red-700'
                          )}
                        >
                          {device.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDevice(device);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          {device.status === ActivationStatus.ACTIVE && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDevice(device);
                                  setShowDeactivateModal(true);
                                }}
                              >
                                Deactivate
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedDevice(device);
                                  setShowRevokeModal(true);
                                }}
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <div className="text-sm text-gray-600">
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
      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setSelectedDevice(null);
        }}
        onConfirm={handleDeactivate}
        title="Deactivate Device"
        message={`Are you sure you want to deactivate "${selectedDevice?.deviceName}"? The user will be able to activate another device.`}
        confirmText="Deactivate"
        isProcessing={isProcessing}
      />

      {selectedDevice && showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Revoke Device</h2>
            <p className="mb-4 text-sm text-gray-600">
              Revoking this device is permanent. The user will not be able to reactivate this device.
            </p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Enter reason for revocation..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRevokeModal(false);
                  setSelectedDevice(null);
                  setRevokeReason('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={isProcessing || !revokeReason.trim()}
              >
                {isProcessing ? 'Processing...' : 'Revoke'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedDevice && showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Device Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedDevice(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">User</p>
                  <p className="text-gray-900">{selectedDevice.userName}</p>
                  <p className="text-sm text-gray-500">{selectedDevice.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">License Key</p>
                  <code className="text-sm text-gray-900">{selectedDevice.licenseKey}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Device Name</p>
                  <p className="text-gray-900">{selectedDevice.deviceName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Device ID</p>
                  <code className="text-sm text-gray-600">{selectedDevice.deviceId}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Operating System</p>
                  <p className="text-gray-900">{selectedDevice.os}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">IP Address</p>
                  <code className="text-sm text-gray-900">{selectedDevice.ipAddress}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Activated At</p>
                  <p className="text-gray-900">{formatDate(selectedDevice.activatedAt, 'long')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Seen</p>
                  <p className="text-gray-900">{formatDate(selectedDevice.lastSeenAt, 'long')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                      selectedDevice.status === ActivationStatus.ACTIVE &&
                        'bg-green-100 text-green-700',
                      selectedDevice.status === ActivationStatus.INACTIVE &&
                        'bg-gray-100 text-gray-700',
                      selectedDevice.status === ActivationStatus.STALE &&
                        'bg-yellow-100 text-yellow-700',
                      selectedDevice.status === ActivationStatus.DEACTIVATED &&
                        'bg-red-100 text-red-700'
                    )}
                  >
                    {selectedDevice.status}
                  </span>
                </div>
              </div>

              {selectedDevice.isSuspicious && selectedDevice.suspiciousFlags.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900">Suspicious Activity Detected</p>
                      <ul className="mt-2 list-inside list-disc text-sm text-yellow-800">
                        {selectedDevice.suspiciousFlags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Bulk {bulkAction === 'deactivate' ? 'Deactivate' : 'Revoke'}
            </h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {selectedDeviceIds.size} device{selectedDeviceIds.size > 1 ? 's' : ''} selected
              </p>

              {bulkAction === 'revoke' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  This action will {bulkAction} {selectedDeviceIds.size} device
                  {selectedDeviceIds.size > 1 ? 's' : ''}.
                  {bulkAction === 'revoke' && ' This action is permanent and cannot be undone.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkReason('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant={bulkAction === 'revoke' ? 'destructive' : 'primary'}
                onClick={handleBulkAction}
                disabled={isProcessing || (bulkAction === 'revoke' && !bulkReason.trim())}
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

export default DeviceActivationManagement;
