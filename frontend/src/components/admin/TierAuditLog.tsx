import { useState } from 'react';
import { Clock, User, RotateCcw, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import TierBadge from './TierBadge';
import { cn } from '@/lib/utils';
import type { TierAuditLogEntry } from '@/types/model-tier';

interface TierAuditLogProps {
  logs: TierAuditLogEntry[];
  isLoading?: boolean;
  onRevert?: (auditLogId: string) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * TierAuditLog Component
 *
 * Displays a timeline of tier changes with details.
 * Supports reverting changes and pagination.
 */
function TierAuditLog({
  logs,
  isLoading = false,
  onRevert,
  onLoadMore,
  hasMore = false,
}: TierAuditLogProps) {
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const handleRevert = async (auditLogId: string, modelName: string) => {
    if (!onRevert) return;

    const confirmed = window.confirm(
      `Are you sure you want to revert this change for "${modelName}"?\n\nThis will restore the previous tier configuration.`
    );

    if (!confirmed) return;

    setRevertingId(auditLogId);
    try {
      await onRevert(auditLogId);
    } finally {
      setRevertingId(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getChangeDescription = (log: TierAuditLogEntry): string => {
    switch (log.changeType) {
      case 'tier_change':
        return `Changed required tier from ${log.oldValues.requiredTier} to ${log.newValues.requiredTier}`;
      case 'restriction_mode_change':
        return `Changed restriction mode from ${log.oldValues.tierRestrictionMode} to ${log.newValues.tierRestrictionMode}`;
      case 'allowed_tiers_change':
        return 'Updated allowed tiers whitelist';
      default:
        return 'Updated tier configuration';
    }
  };

  if (!logs || (logs.length === 0 && !isLoading)) {
    return (
      <div className="text-center py-12 bg-deep-navy-50 dark:bg-deep-navy-900 rounded-lg">
        <AlertCircle className="h-12 w-12 text-deep-navy-300 dark:text-deep-navy-600 mx-auto mb-3" />
        <p className="text-body text-deep-navy-700 dark:text-deep-navy-300">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className={cn(
              'bg-white rounded-lg border border-deep-navy-200 p-4',
              'transition-all duration-fast hover:shadow-md'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Main Content */}
              <div className="flex-1 space-y-2">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-deep-navy-800">
                    {log.modelName}
                  </h4>
                  <span className="text-caption text-deep-navy-400">
                    {getChangeDescription(log)}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-sm">
                  {/* Old Values */}
                  {log.oldValues.requiredTier && (
                    <div>
                      <span className="text-deep-navy-700">From: </span>
                      <TierBadge tier={log.oldValues.requiredTier} size="sm" />
                      {log.oldValues.tierRestrictionMode && (
                        <span className="ml-2 text-deep-navy-700">
                          ({log.oldValues.tierRestrictionMode})
                        </span>
                      )}
                    </div>
                  )}

                  {/* New Values */}
                  {log.newValues.requiredTier && (
                    <div>
                      <span className="text-deep-navy-700">To: </span>
                      <TierBadge tier={log.newValues.requiredTier} size="sm" />
                      {log.newValues.tierRestrictionMode && (
                        <span className="ml-2 text-deep-navy-700">
                          ({log.newValues.tierRestrictionMode})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Allowed Tiers Changes */}
                  {log.oldValues.allowedTiers &&
                    log.newValues.allowedTiers && (
                      <>
                        <div>
                          <span className="text-deep-navy-700">
                            Old allowed:{' '}
                          </span>
                          <div className="inline-flex gap-1">
                            {log.oldValues.allowedTiers.map((tier) => (
                              <TierBadge key={tier} tier={tier} size="sm" />
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-deep-navy-700">
                            New allowed:{' '}
                          </span>
                          <div className="inline-flex gap-1">
                            {log.newValues.allowedTiers.map((tier) => (
                              <TierBadge key={tier} tier={tier} size="sm" />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                </div>

                {/* Reason */}
                {log.reason && (
                  <div className="bg-deep-navy-50 rounded px-3 py-2 text-body-sm text-deep-navy-700">
                    <span className="font-medium">Reason:</span> {log.reason}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 text-caption text-deep-navy-400">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{log.adminUserEmail || log.adminUserId}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(log.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Revert Button */}
              {onRevert && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevert(log.id, log.modelName)}
                  disabled={revertingId === log.id}
                >
                  <RotateCcw
                    className={cn(
                      'h-4 w-4',
                      revertingId === log.id && 'animate-spin'
                    )}
                  />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <Button
            variant="ghost"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && logs.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-rephlo-blue border-r-transparent"></div>
          <p className="mt-3 text-body-sm text-deep-navy-700">
            Loading audit logs...
          </p>
        </div>
      )}
    </div>
  );
}

export default TierAuditLog;
