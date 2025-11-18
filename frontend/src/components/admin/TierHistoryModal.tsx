/**
 * Tier History Modal Component (Plan 190)
 *
 * Modal dialog displaying tier configuration history in timeline format.
 *
 * Features:
 * - Timeline view of all tier changes
 * - Shows credit changes, price changes, and other modifications
 * - Displays who made changes and when
 * - Shows applied vs pending changes
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  TrendingUp as IncreaseIcon,
  TrendingDown as DecreaseIcon,
  AttachMoney as PriceIcon,
  Build as FeatureIcon,
  Schedule as ScheduledIcon,
  CheckCircle as AppliedIcon,
} from '@mui/icons-material';
import type { TierConfigHistory } from '@rephlo/shared-types';
import { getTierConfigHistory } from '../../api/tierConfig';
import { formatDate, formatRelativeTime, formatNumber, formatCurrency } from '../../utils/formatters';

// =============================================================================
// Component Props
// =============================================================================

interface TierHistoryModalProps {
  open: boolean;
  tierName: string;
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

const TierHistoryModal: React.FC<TierHistoryModalProps> = ({ open, tierName, onClose }) => {
  const [history, setHistory] = useState<TierConfigHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // Data Fetching
  // =============================================================================

  /**
   * Fetch tier configuration history
   */
  const fetchHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const fetchedHistory = await getTierConfigHistory(tierName, 50);
      setHistory(fetchedHistory);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tier history';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch history when modal opens or tier changes
   */
  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, tierName]);

  // =============================================================================
  // Render Helpers
  // =============================================================================

  /**
   * Get icon for change type
   */
  const getChangeIcon = (changeType: string): JSX.Element => {
    switch (changeType) {
      case 'credit_increase':
        return <IncreaseIcon />;
      case 'credit_decrease':
        return <DecreaseIcon />;
      case 'price_change':
        return <PriceIcon />;
      case 'feature_update':
        return <FeatureIcon />;
      default:
        return <FeatureIcon />;
    }
  };

  /**
   * Get color for change type
   */
  const getChangeColor = (changeType: string): 'success' | 'error' | 'primary' | 'grey' => {
    switch (changeType) {
      case 'credit_increase':
        return 'success';
      case 'credit_decrease':
        return 'error';
      case 'price_change':
        return 'primary';
      default:
        return 'grey';
    }
  };

  /**
   * Format change description
   */
  const getChangeDescription = (change: TierConfigHistory): string => {
    switch (change.changeType) {
      case 'credit_increase':
      case 'credit_decrease':
        return `Credits changed from ${formatNumber(change.previousCredits)} to ${formatNumber(change.newCredits)}`;
      case 'price_change':
        return `Price changed from ${formatCurrency(change.previousPriceUsd)} to ${formatCurrency(change.newPriceUsd)}`;
      default:
        return 'Configuration updated';
    }
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Tier History: <strong>{tierName.toUpperCase()}</strong>
      </DialogTitle>

      <DialogContent>
        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* History Timeline */}
        {!loading && !error && history.length > 0 && (
          <Timeline position="right">
            {history.map((change, index) => (
              <TimelineItem key={change.id}>
                {/* Timeline Left: Date */}
                <TimelineOppositeContent color="text.secondary" sx={{ maxWidth: '140px' }}>
                  <Typography variant="caption" display="block">
                    {formatRelativeTime(change.changedAt)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {formatDate(change.changedAt)}
                  </Typography>
                </TimelineOppositeContent>

                {/* Timeline Separator */}
                <TimelineSeparator>
                  <TimelineDot color={getChangeColor(change.changeType)}>
                    {getChangeIcon(change.changeType)}
                  </TimelineDot>
                  {index < history.length - 1 && <TimelineConnector />}
                </TimelineSeparator>

                {/* Timeline Right: Content */}
                <TimelineContent>
                  <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                    {/* Change Description */}
                    <Typography variant="body1" fontWeight={500} gutterBottom>
                      {getChangeDescription(change)}
                    </Typography>

                    {/* Change Reason */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {change.changeReason}
                    </Typography>

                    {/* Metadata */}
                    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                      {/* Applied Status */}
                      {change.appliedAt ? (
                        <Chip
                          icon={<AppliedIcon />}
                          label={`Applied ${formatRelativeTime(change.appliedAt)}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<ScheduledIcon />}
                          label="Pending"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}

                      {/* Affected Users */}
                      <Chip
                        label={`${formatNumber(change.affectedUsersCount)} users`}
                        size="small"
                        variant="outlined"
                      />

                      {/* Changed By */}
                      <Typography variant="caption" color="text.disabled">
                        by Admin
                      </Typography>
                    </Box>
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}

        {/* Empty State */}
        {!loading && !error && history.length === 0 && (
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No history found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This tier has no recorded configuration changes
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TierHistoryModal;
