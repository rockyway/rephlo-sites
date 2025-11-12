/**
 * Fraud Detection Page
 *
 * Admin interface for detecting and preventing coupon abuse.
 *
 * Features:
 * - Real-time suspicious activity feed
 * - Fraud detection rules configuration
 * - User flagging and blacklist management
 * - Statistics dashboard
 * - Resolution workflow
 * - IP/email blacklist management
 *
 * Priority: P2 - Medium (Plan 131, Phase 3)
 */

import { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Shield,
  Ban,
  X as XIcon,
  ChevronRight,
  ChevronLeft,
  Flag,
  Download,
  Settings,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { FraudSeverity, FraudResolution, type FraudDetectionEvent } from '@/types/plan111.types';
import { formatDate, downloadCSV } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

// ============================================================================
// Types
// ============================================================================

interface FraudStats {
  totalSuspicious: number;
  blockedAttempts: number;
  falsePositiveRate: number;
  highSeverityCount: number;
}

interface BlacklistEntry {
  id: string;
  type: 'user' | 'email' | 'ip';
  value: string;
  reason: string;
  addedAt: string;
  addedBy: string;
}

// ============================================================================
// Component
// ============================================================================

function FraudDetection() {
  // State
  const [events, setEvents] = useState<FraudDetectionEvent[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Sorting
  const [sortBy, setSortBy] = useState<'detected' | 'severity' | 'riskScore'>('detected');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedEvent, setSelectedEvent] = useState<FraudDetectionEvent | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Review state
  const [reviewResolution, setReviewResolution] = useState<FraudResolution>('block_user');
  const [reviewNotes, setReviewNotes] = useState('');

  // Blacklist state
  const [blacklistType, setBlacklistType] = useState<'user' | 'email' | 'ip'>('email');
  const [blacklistValue, setBlacklistValue] = useState('');
  const [blacklistReason, setBlacklistReason] = useState('');

  // Auto-refresh interval
  const intervalRef = useRef<number>();

  // Load data
  useEffect(() => {
    loadData();

    // Set up auto-refresh
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 30000); // 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [filterSeverity, filterStatus, searchQuery, page, autoRefresh]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API calls when backend is implemented
      const mockEvents: FraudDetectionEvent[] = [
        {
          id: '1',
          redemption_id: 'red-1',
          coupon_id: 'coup-1',
          user_id: 'user-1',
          detection_type: 'velocity_abuse',
          severity: 'high',
          risk_score: 85,
          reasons: ['5+ redemptions in 10 minutes', 'Multiple IP addresses'],
          status: 'pending',
          detected_at: new Date().toISOString(),
          coupon_code: 'SAVE20',
          user_email: 'suspicious@example.com',
          ip_address: '192.168.1.1',
        },
        {
          id: '2',
          redemption_id: 'red-2',
          coupon_id: 'coup-2',
          user_id: 'user-2',
          detection_type: 'ip_switching',
          severity: 'medium',
          risk_score: 65,
          reasons: ['IP changed 3 times in session'],
          status: 'pending',
          detected_at: new Date(Date.now() - 3600000).toISOString(),
          coupon_code: 'WELCOME10',
          user_email: 'user2@example.com',
          ip_address: '10.0.0.1',
        },
      ];

      const mockStats: FraudStats = {
        totalSuspicious: 45,
        blockedAttempts: 12,
        falsePositiveRate: 8.5,
        highSeverityCount: 8,
      };

      const mockBlacklist: BlacklistEntry[] = [
        {
          id: '1',
          type: 'email',
          value: 'fraud@example.com',
          reason: 'Multiple velocity abuse attempts',
          addedAt: new Date().toISOString(),
          addedBy: 'admin@rephlo.com',
        },
        {
          id: '2',
          type: 'ip',
          value: '123.45.67.89',
          reason: 'Bot pattern detected',
          addedAt: new Date(Date.now() - 86400000).toISOString(),
          addedBy: 'admin@rephlo.com',
        },
      ];

      // Apply filters
      let filtered = mockEvents;
      if (filterSeverity) {
        filtered = filtered.filter((e) => e.severity === filterSeverity);
      }
      if (filterStatus) {
        filtered = filtered.filter((e) => e.status === filterStatus);
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.user_email?.toLowerCase().includes(query) ||
            e.coupon_code?.toLowerCase().includes(query) ||
            e.ip_address?.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;

        switch (sortBy) {
          case 'detected':
            aVal = new Date(a.detected_at).getTime();
            bVal = new Date(b.detected_at).getTime();
            break;
          case 'severity':
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            aVal = severityOrder[a.severity];
            bVal = severityOrder[b.severity];
            break;
          case 'riskScore':
            aVal = a.risk_score;
            bVal = b.risk_score;
            break;
        }

        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      setEvents(filtered);
      setStats(mockStats);
      setBlacklist(mockBlacklist);
      setTotalPages(Math.ceil(filtered.length / limit));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load fraud detection data');
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

  const handleReviewEvent = async () => {
    if (!selectedEvent || !reviewNotes.trim()) {
      setError('Please provide review notes');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await plan111API.reviewFraudEvent(selectedEvent.id, reviewResolution, reviewNotes);

      setSuccessMessage(`Event reviewed successfully`);
      setShowReviewModal(false);
      setSelectedEvent(null);
      setReviewNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to review event');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToBlacklist = async () => {
    if (!blacklistValue.trim() || !blacklistReason.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await fraudApi.addToBlacklist({ type: blacklistType, value: blacklistValue, reason: blacklistReason });

      setSuccessMessage(`Added ${blacklistValue} to blacklist`);
      setShowBlacklistModal(false);
      setBlacklistValue('');
      setBlacklistReason('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add to blacklist');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFromBlacklist = async (_id: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Call actual API
      // await fraudApi.removeFromBlacklist(id);

      setSuccessMessage('Removed from blacklist');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove from blacklist');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (events.length === 0) return;

    const exportData = events.map((event) => ({
      'Detected At': formatDate(event.detected_at, 'long'),
      'User Email': event.user_email,
      'Coupon Code': event.coupon_code,
      'Detection Type': event.detection_type,
      Severity: event.severity,
      'Risk Score': event.risk_score,
      Reasons: event.reasons.join('; '),
      'IP Address': event.ip_address,
      Status: event.status,
    }));

    downloadCSV(exportData, 'fraud-detection-events');
  };

  const clearFilters = () => {
    setFilterSeverity('');
    setFilterStatus('pending');
    setSearchQuery('');
    setPage(1);
  };

  const getSeverityBadge = (severity: FraudSeverity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return colors[severity];
  };

  const getStatusBadge = (status: FraudResolution) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      legitimate: 'bg-green-100 text-green-700 border-green-300',
      block_user: 'bg-red-100 text-red-700 border-red-300',
      block_coupon: 'bg-orange-100 text-orange-700 border-orange-300',
      block_ip: 'bg-purple-100 text-purple-700 border-purple-300',
      false_positive: 'bg-deep-navy-100 dark:bg-deep-navy-800 text-deep-navy-700 dark:text-deep-navy-200 border-deep-navy-300 dark:border-deep-navy-600',
    };
    return colors[status] || colors.pending;
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
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">Fraud Detection</h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Monitor and prevent coupon abuse
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowRulesModal(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Rules
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowBlacklistModal(true)}
          >
            <Ban className="mr-2 h-4 w-4" />
            Blacklist
          </Button>
          <Button variant="ghost" onClick={handleExport} disabled={events.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant={autoRefresh ? 'primary' : 'ghost'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900 p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Suspicious (Today)</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.totalSuspicious}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-3">
                <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Blocked Attempts</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.blockedAttempts}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">False Positive Rate</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.falsePositiveRate}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-3">
                <Flag className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">High Severity</p>
                <p className="text-2xl font-bold text-deep-navy-800 dark:text-white">{stats.highSeverityCount}</p>
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
                placeholder="Email, coupon code, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="legitimate">Legitimate</option>
              <option value="block_user">Blocked User</option>
              <option value="block_coupon">Blocked Coupon</option>
              <option value="block_ip">Blocked IP</option>
              <option value="false_positive">False Positive</option>
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
      <div className="rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-deep-navy-400 dark:text-deep-navy-500" />
            <p className="mt-4 text-deep-navy-500 dark:text-deep-navy-300">No suspicious activity detected</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900">
                  <tr>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:bg-deep-navy-800"
                      onClick={() => handleSort('detected')}
                    >
                      <div className="flex items-center gap-1">
                        Detected At
                        {sortBy === 'detected' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      User / Coupon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Detection Type
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:bg-deep-navy-800"
                      onClick={() => handleSort('severity')}
                    >
                      <div className="flex items-center gap-1">
                        Severity
                        {sortBy === 'severity' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:bg-deep-navy-800"
                      onClick={() => handleSort('riskScore')}
                    >
                      <div className="flex items-center gap-1">
                        Risk Score
                        {sortBy === 'riskScore' && (
                          sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-deep-navy-600 dark:text-deep-navy-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className={cn(
                        'hover:bg-deep-navy-50 dark:bg-deep-navy-900',
                        event.severity === 'critical' && 'bg-red-50',
                        event.severity === 'high' && 'bg-orange-50'
                      )}
                    >
                      <td className="px-4 py-4 text-sm text-deep-navy-500 dark:text-deep-navy-300">
                        {formatDate(event.detected_at, 'long')}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-deep-navy-800 dark:text-white">{event.user_email}</p>
                          <p className="text-xs text-deep-navy-500 dark:text-deep-navy-300">
                            Coupon: <code className="rounded bg-deep-navy-100 dark:bg-deep-navy-800 px-1">{event.coupon_code}</code>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-deep-navy-800 dark:text-white capitalize">
                        {event.detection_type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize',
                            getSeverityBadge(event.severity)
                          )}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-deep-navy-800 dark:text-white">{event.risk_score}</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-deep-navy-200 dark:bg-deep-navy-700">
                            <div
                              className={cn(
                                'h-full transition-all',
                                event.risk_score >= 80 ? 'bg-red-500' :
                                event.risk_score >= 60 ? 'bg-orange-500' :
                                event.risk_score >= 40 ? 'bg-yellow-500' :
                                'bg-green-500'
                              )}
                              style={{ width: `${event.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-sm font-mono text-deep-navy-600 dark:text-deep-navy-200">{event.ip_address}</code>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-1 text-xs font-medium',
                            getStatusBadge(event.status)
                          )}
                        >
                          {event.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDetailsModal(true);
                            }}
                          >
                            Details
                          </Button>
                          {event.status === 'pending' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowReviewModal(true);
                              }}
                            >
                              Review
                            </Button>
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

      {/* Details Modal */}
      {selectedEvent && showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep-navy-800 dark:text-white">Fraud Detection Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedEvent(null);
                }}
                className="text-deep-navy-500 dark:text-deep-navy-300 hover:text-deep-navy-700 dark:text-deep-navy-200"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">User Email</p>
                  <p className="text-deep-navy-800 dark:text-white">{selectedEvent.user_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Coupon Code</p>
                  <code className="rounded bg-deep-navy-100 dark:bg-deep-navy-800 px-2 py-1 text-sm text-deep-navy-800 dark:text-white">
                    {selectedEvent.coupon_code}
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Detection Type</p>
                  <p className="text-deep-navy-800 dark:text-white capitalize">
                    {selectedEvent.detection_type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Severity</p>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize',
                      getSeverityBadge(selectedEvent.severity)
                    )}
                  >
                    {selectedEvent.severity}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Risk Score</p>
                  <p className="text-deep-navy-800 dark:text-white">{selectedEvent.risk_score}/100</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">IP Address</p>
                  <code className="text-sm text-deep-navy-800 dark:text-white">{selectedEvent.ip_address}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Detected At</p>
                  <p className="text-deep-navy-800 dark:text-white">{formatDate(selectedEvent.detected_at, 'long')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Status</p>
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-1 text-xs font-medium',
                      getStatusBadge(selectedEvent.status)
                    )}
                  >
                    {selectedEvent.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">Detection Reasons</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-deep-navy-800 dark:text-white">
                  {selectedEvent.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedEvent && showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-deep-navy-800 dark:text-white">Review Fraud Event</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-deep-navy-600 dark:text-deep-navy-200">
                  User: <strong>{selectedEvent.user_email}</strong>
                </p>
                <p className="text-sm text-deep-navy-600 dark:text-deep-navy-200">
                  Coupon: <code className="rounded bg-deep-navy-100 dark:bg-deep-navy-800 px-1">{selectedEvent.coupon_code}</code>
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                  Resolution <span className="text-red-500">*</span>
                </label>
                <select
                  value={reviewResolution}
                  onChange={(e) => setReviewResolution(e.target.value as FraudResolution)}
                  className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                >
                  <option value="legitimate">Legitimate - Allow</option>
                  <option value="block_user">Block User</option>
                  <option value="block_coupon">Block Coupon</option>
                  <option value="block_ip">Block IP Address</option>
                  <option value="false_positive">Mark as False Positive</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                  Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Explain your decision..."
                  rows={4}
                  className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedEvent(null);
                  setReviewNotes('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReviewEvent}
                disabled={isProcessing || !reviewNotes.trim()}
              >
                {isProcessing ? 'Processing...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep-navy-800 dark:text-white">Blacklist Management</h2>
              <button
                onClick={() => setShowBlacklistModal(false)}
                className="text-deep-navy-500 dark:text-deep-navy-300 hover:text-deep-navy-700 dark:text-deep-navy-200"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Add to Blacklist Form */}
            <div className="mb-6 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900 p-4">
              <h3 className="mb-3 font-medium text-deep-navy-800 dark:text-white">Add to Blacklist</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 dark:text-deep-navy-200">Type</label>
                  <select
                    value={blacklistType}
                    onChange={(e) => setBlacklistType(e.target.value as 'user' | 'email' | 'ip')}
                    className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                  >
                    <option value="email">Email</option>
                    <option value="user">User ID</option>
                    <option value="ip">IP Address</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">Value</label>
                  <Input
                    value={blacklistValue}
                    onChange={(e) => setBlacklistValue(e.target.value)}
                    placeholder={
                      blacklistType === 'email' ? 'email@example.com' :
                      blacklistType === 'ip' ? '192.168.1.1' :
                      'user-id'
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">Reason</label>
                  <Input
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    placeholder="Reason for blacklist"
                  />
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={handleAddToBlacklist}
                disabled={isProcessing}
              >
                Add to Blacklist
              </Button>
            </div>

            {/* Blacklist Table */}
            <div>
              <h3 className="mb-3 font-medium text-deep-navy-800 dark:text-white">Current Blacklist</h3>
              {blacklist.length === 0 ? (
                <p className="py-8 text-center text-deep-navy-500 dark:text-deep-navy-300">No entries in blacklist</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-deep-navy-200 dark:border-deep-navy-700">
                  <table className="w-full">
                    <thead className="border-b border-deep-navy-200 dark:border-deep-navy-700 bg-deep-navy-50 dark:bg-deep-navy-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                          Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                          Added
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-deep-navy-600 dark:text-deep-navy-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-deep-navy-200 dark:divide-deep-navy-700">
                      {blacklist.map((entry) => (
                        <tr key={entry.id} className="hover:bg-deep-navy-50 dark:bg-deep-navy-900">
                          <td className="px-4 py-3 text-sm capitalize text-deep-navy-800 dark:text-white">{entry.type}</td>
                          <td className="px-4 py-3">
                            <code className="text-sm text-deep-navy-800 dark:text-white">{entry.value}</code>
                          </td>
                          <td className="px-4 py-3 text-sm text-deep-navy-600 dark:text-deep-navy-200">{entry.reason}</td>
                          <td className="px-4 py-3 text-sm text-deep-navy-500 dark:text-deep-navy-300">
                            {formatDate(entry.addedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveFromBlacklist(entry.id)}
                              disabled={isProcessing}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal (Placeholder) */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-deep-navy-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-deep-navy-800 dark:text-white">Fraud Detection Rules</h2>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-deep-navy-500 dark:text-deep-navy-300 hover:text-deep-navy-700 dark:text-deep-navy-200"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-deep-navy-600 dark:text-deep-navy-200">
                Configure fraud detection rules and thresholds here.
              </p>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> This feature is under development. Rules will be configurable in the next release.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FraudDetection;
