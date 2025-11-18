/**
 * Edit Tier Modal Component (Plan 190)
 *
 * Modal dialog for editing tier configuration with impact preview.
 *
 * Features:
 * - Update tier credits with validation
 * - Update tier pricing
 * - Preview impact before applying (dry-run)
 * - Immediate or scheduled rollout options
 * - Form validation and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  Save as SaveIcon,
  TrendingUp as IncreaseIcon,
  TrendingDown as DecreaseIcon,
} from '@mui/icons-material';
import type { TierConfig, UpdateImpact } from '@rephlo/shared-types';
import { previewTierUpdate, updateTierCredits, updateTierPrice } from '../../api/tierConfig';
import { formatCurrency, formatNumber } from '../../utils/formatters';

// =============================================================================
// Component Props
// =============================================================================

interface EditTierModalProps {
  open: boolean;
  tier: TierConfig;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

// =============================================================================
// Component
// =============================================================================

const EditTierModal: React.FC<EditTierModalProps> = ({
  open,
  tier,
  onClose,
  onSuccess,
  onError,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);

  // Credit update state
  const [newCredits, setNewCredits] = useState<string>(tier.monthlyCreditAllocation.toString());
  const [creditReason, setCreditReason] = useState<string>('');
  const [applyToExisting, setApplyToExisting] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');

  // Price update state
  const [newMonthlyPrice, setNewMonthlyPrice] = useState<string>(tier.monthlyPriceUsd.toString());
  const [newAnnualPrice, setNewAnnualPrice] = useState<string>(tier.annualPriceUsd.toString());
  const [priceReason, setPriceReason] = useState<string>('');

  // Preview state
  const [previewData, setPreviewData] = useState<UpdateImpact | null>(null);
  const [previewing, setPreviewing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // =============================================================================
  // Reset Form on Tier Change
  // =============================================================================

  useEffect(() => {
    setNewCredits(tier.monthlyCreditAllocation.toString());
    setNewMonthlyPrice(tier.monthlyPriceUsd.toString());
    setNewAnnualPrice(tier.annualPriceUsd.toString());
    setCreditReason('');
    setPriceReason('');
    setApplyToExisting(false);
    setScheduledDate('');
    setPreviewData(null);
    setErrors({});
    setActiveTab(0);
  }, [tier]);

  // =============================================================================
  // Validation
  // =============================================================================

  /**
   * Validate credit update form
   */
  const validateCreditForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const credits = parseInt(newCredits, 10);
    if (isNaN(credits)) {
      newErrors.newCredits = 'Credits must be a valid number';
    } else if (credits < 100) {
      newErrors.newCredits = 'Minimum 100 credits required';
    } else if (credits > 1000000) {
      newErrors.newCredits = 'Maximum 1,000,000 credits allowed';
    } else if (credits % 100 !== 0) {
      newErrors.newCredits = 'Credits must be in increments of 100';
    }

    if (!creditReason || creditReason.length < 10) {
      newErrors.creditReason = 'Reason must be at least 10 characters';
    } else if (creditReason.length > 500) {
      newErrors.creditReason = 'Reason must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Validate price update form
   */
  const validatePriceForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const monthly = parseFloat(newMonthlyPrice);
    const annual = parseFloat(newAnnualPrice);

    if (isNaN(monthly) || monthly < 0) {
      newErrors.newMonthlyPrice = 'Invalid monthly price';
    }

    if (isNaN(annual) || annual < 0) {
      newErrors.newAnnualPrice = 'Invalid annual price';
    }

    if (!priceReason || priceReason.length < 10) {
      newErrors.priceReason = 'Reason must be at least 10 characters';
    } else if (priceReason.length > 500) {
      newErrors.priceReason = 'Reason must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================================================
  // Event Handlers
  // =============================================================================

  /**
   * Handle preview button click
   */
  const handlePreview = async (): Promise<void> => {
    if (!validateCreditForm()) {
      return;
    }

    try {
      setPreviewing(true);
      const impact = await previewTierUpdate(tier.tierName, {
        newCredits: parseInt(newCredits, 10),
        applyToExistingUsers: applyToExisting,
      });
      setPreviewData(impact);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to preview update');
    } finally {
      setPreviewing(false);
    }
  };

  /**
   * Handle save credit update
   */
  const handleSaveCredits = async (): Promise<void> => {
    if (!validateCreditForm()) {
      return;
    }

    try {
      setSaving(true);
      await updateTierCredits(tier.tierName, {
        newCredits: parseInt(newCredits, 10),
        reason: creditReason,
        applyToExistingUsers: applyToExisting,
        scheduledRolloutDate: scheduledDate || undefined,
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update tier credits');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle save price update
   */
  const handleSavePrice = async (): Promise<void> => {
    if (!validatePriceForm()) {
      return;
    }

    try {
      setSaving(true);
      await updateTierPrice(tier.tierName, {
        newMonthlyPrice: parseFloat(newMonthlyPrice),
        newAnnualPrice: parseFloat(newAnnualPrice),
        reason: priceReason,
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update tier pricing');
    } finally {
      setSaving(false);
    }
  };

  // =============================================================================
  // Render Helper - Preview Impact
  // =============================================================================

  const renderPreviewImpact = (): JSX.Element | null => {
    if (!previewData) {
      return null;
    }

    const changeIcon =
      previewData.changeType === 'increase' ? (
        <IncreaseIcon color="success" />
      ) : previewData.changeType === 'decrease' ? (
        <DecreaseIcon color="error" />
      ) : null;

    return (
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          Impact Preview
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Box display="flex" gap={2} mb={2}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Current Credits
              </Typography>
              <Typography variant="h6">{formatNumber(previewData.currentCredits)}</Typography>
            </Box>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="caption" color="text.secondary">
                  New Credits
                </Typography>
                {changeIcon}
              </Box>
              <Typography variant="h6">{formatNumber(previewData.newCredits)}</Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" gap={2} mb={2}>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Total Users
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {formatNumber(previewData.affectedUsers.total)}
              </Typography>
            </Box>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Will Upgrade
              </Typography>
              <Typography variant="body1" fontWeight={500} color="success.main">
                {formatNumber(previewData.affectedUsers.willUpgrade)}
              </Typography>
            </Box>
            <Box flex={1}>
              <Typography variant="caption" color="text.secondary">
                Unchanged
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {formatNumber(previewData.affectedUsers.willRemainSame)}
              </Typography>
            </Box>
          </Box>
          <Alert severity="info" icon={false}>
            <Typography variant="caption">
              <strong>Estimated Cost Impact:</strong>{' '}
              {formatCurrency(previewData.estimatedCostImpact)}
            </Typography>
          </Alert>
        </Box>
      </Paper>
    );
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit Tier: <strong>{tier.tierName.toUpperCase()}</strong>
      </DialogTitle>

      <DialogContent>
        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 3 }}>
          <Tab label="Credit Allocation" />
          <Tab label="Pricing" />
        </Tabs>

        {/* Tab Panel: Credit Allocation */}
        {activeTab === 0 && (
          <Box>
            <TextField
              fullWidth
              label="New Monthly Credits"
              type="number"
              value={newCredits}
              onChange={(e) => setNewCredits(e.target.value)}
              error={!!errors.newCredits}
              helperText={errors.newCredits || 'Must be in increments of 100 (min: 100, max: 1,000,000)'}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Reason for Change"
              multiline
              rows={3}
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              error={!!errors.creditReason}
              helperText={errors.creditReason || 'Explain why this change is being made (10-500 characters)'}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={applyToExisting}
                  onChange={(e) => setApplyToExisting(e.target.checked)}
                />
              }
              label="Apply to existing users immediately"
            />

            {applyToExisting && (
              <TextField
                fullWidth
                label="Scheduled Rollout Date (Optional)"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for immediate rollout"
                sx={{ mt: 2 }}
              />
            )}

            {renderPreviewImpact()}

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={previewing || saving}
              >
                {previewing ? 'Previewing...' : 'Preview Impact'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Tab Panel: Pricing */}
        {activeTab === 1 && (
          <Box>
            <TextField
              fullWidth
              label="New Monthly Price (USD)"
              type="number"
              value={newMonthlyPrice}
              onChange={(e) => setNewMonthlyPrice(e.target.value)}
              error={!!errors.newMonthlyPrice}
              helperText={errors.newMonthlyPrice}
              sx={{ mb: 2 }}
              inputProps={{ step: '0.01', min: '0' }}
            />

            <TextField
              fullWidth
              label="New Annual Price (USD)"
              type="number"
              value={newAnnualPrice}
              onChange={(e) => setNewAnnualPrice(e.target.value)}
              error={!!errors.newAnnualPrice}
              helperText={errors.newAnnualPrice}
              sx={{ mb: 2 }}
              inputProps={{ step: '0.01', min: '0' }}
            />

            <TextField
              fullWidth
              label="Reason for Change"
              multiline
              rows={3}
              value={priceReason}
              onChange={(e) => setPriceReason(e.target.value)}
              error={!!errors.priceReason}
              helperText={errors.priceReason || 'Explain why this change is being made (10-500 characters)'}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={activeTab === 0 ? handleSaveCredits : handleSavePrice}
          disabled={saving || previewing}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTierModal;
