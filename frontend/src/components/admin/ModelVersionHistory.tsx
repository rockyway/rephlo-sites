/**
 * Model Version History Component
 *
 * Displays version history for a model with:
 * - Chronological timeline of changes
 * - Admin user attribution
 * - Change type badges
 * - Expandable diff view
 * - Pagination support
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import Badge from '../common/Badge';
import LoadingSpinner from '../common/LoadingSpinner';
import Button from '../common/Button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface VersionHistoryEntry {
  id: string;
  model_id: string;
  version_number: number;
  changed_by: string;
  change_type: 'update' | 'legacy_mark' | 'legacy_unmark' | 'archive' | 'unarchive' | 'tier_change';
  change_reason?: string;
  previous_state: any;
  new_state: any;
  changes_summary: Record<string, { old: any; new: any }>;
  created_at: string;
  admin: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface VersionHistoryResponse {
  history: VersionHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface ModelVersionHistoryProps {
  modelId: string;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get badge variant for change type
 */
function getChangeTypeBadge(changeType: string): {
  variant: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  label: string;
} {
  switch (changeType) {
    case 'update':
      return { variant: 'primary', label: 'Update' };
    case 'legacy_mark':
      return { variant: 'warning', label: 'Marked Legacy' };
    case 'legacy_unmark':
      return { variant: 'success', label: 'Unmarked Legacy' };
    case 'archive':
      return { variant: 'error', label: 'Archived' };
    case 'unarchive':
      return { variant: 'success', label: 'Unarchived' };
    case 'tier_change':
      return { variant: 'primary', label: 'Tier Change' };
    default:
      return { variant: 'neutral', label: changeType };
  }
}

/**
 * Format timestamp to human-readable format
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Version Entry Component
 */
function VersionEntry({ entry }: { entry: VersionHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getChangeTypeBadge(entry.change_type);
  const adminName =
    entry.admin.first_name && entry.admin.last_name
      ? `${entry.admin.first_name} ${entry.admin.last_name}`
      : entry.admin.email;

  const changeCount = Object.keys(entry.changes_summary).length;

  return (
    <div className="relative pl-6 pb-8 border-l-2 border-deep-navy-200 dark:border-deep-navy-700 last:border-transparent">
      {/* Timeline dot */}
      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-rephlo-blue border-4 border-white dark:border-deep-navy-900" />

      {/* Content */}
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-caption text-deep-navy-700 dark:text-deep-navy-300">
                Version {entry.version_number}
              </span>
            </div>
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-400">
              by <span className="font-medium">{adminName}</span>
              {' · '}
              <span className="text-deep-navy-500 dark:text-deep-navy-500">
                {formatTimestamp(entry.created_at)}
              </span>
            </p>
          </div>
        </div>

        {/* Change reason */}
        {entry.change_reason && (
          <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-300 italic">
            "{entry.change_reason}"
          </p>
        )}

        {/* Changes summary */}
        {changeCount > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-body-sm text-rephlo-blue hover:text-rephlo-blue/80 font-medium flex items-center gap-1"
            >
              {expanded ? '▼' : '▶'}
              {changeCount} change{changeCount > 1 ? 's' : ''}
            </button>

            {/* Expandable diff */}
            {expanded && (
              <div className="mt-3 space-y-2 bg-deep-navy-50 dark:bg-deep-navy-800 rounded-md p-3">
                {Object.entries(entry.changes_summary).map(([field, change]) => (
                  <div key={field} className="border-b border-deep-navy-200 dark:border-deep-navy-700 last:border-0 pb-2 last:pb-0">
                    <p className="text-caption font-medium text-deep-navy-800 dark:text-white mb-1">
                      {formatFieldName(field)}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-caption">
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <p className="text-red-700 dark:text-red-300 font-medium mb-1">Old</p>
                        <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                          {formatValue(change.old)}
                        </pre>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <p className="text-green-700 dark:text-green-300 font-medium mb-1">New</p>
                        <pre className="text-green-600 dark:text-green-400 whitespace-pre-wrap break-words">
                          {formatValue(change.new)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ModelVersionHistory({ modelId, className }: ModelVersionHistoryProps) {
  const [history, setHistory] = useState<VersionHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  /**
   * Fetch version history from API
   */
  async function fetchHistory() {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/models/${modelId}/history?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch version history: ${response.statusText}`);
      }

      const data: { status: string; data: VersionHistoryResponse } = await response.json();
      setHistory(data.data.history);
      setTotal(data.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Fetch on mount and when offset changes
  useEffect(() => {
    fetchHistory();
  }, [modelId, offset]);

  // =============================================================================
  // Render
  // =============================================================================

  if (loading && offset === 0) {
    return (
      <Card className={cn('flex items-center justify-center p-12', className)}>
        <LoadingSpinner />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <p className="text-body text-red-600 dark:text-red-400">Error: {error}</p>
        <Button onClick={fetchHistory} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <p className="text-body text-deep-navy-600 dark:text-deep-navy-400">
          No version history available for this model.
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Version History</CardTitle>
        <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-400">
          {total} total version{total > 1 ? 's' : ''}
        </p>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Timeline */}
        <div className="space-y-0">
          {history.map((entry) => (
            <VersionEntry key={entry.id} entry={entry} />
          ))}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-deep-navy-200 dark:border-deep-navy-700">
            <p className="text-body-sm text-deep-navy-600 dark:text-deep-navy-400">
              Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total || loading}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
