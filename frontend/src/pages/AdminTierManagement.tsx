/**
 * Admin Tier Management Page (Plan 190)
 *
 * Comprehensive tier configuration management interface for admins.
 * Allows viewing, editing, and previewing tier credit allocations and pricing.
 *
 * Features:
 * - List all tier configurations with current allocations
 * - Preview update impact before applying changes
 * - Update tier credits with immediate or scheduled rollout
 * - Update tier pricing
 * - View tier modification history (audit trail)
 *
 * Components:
 * - TierConfigTable: Table view of all tiers
 * - EditTierModal: Modal for editing tier config with preview
 * - TierHistoryModal: Timeline view of tier changes
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { TierConfig } from '@rephlo/shared-types';
import { getAllTierConfigs } from '../api/tierConfig';
import TierConfigTable from '../components/admin/TierConfigTable';
import EditTierModal from '../components/admin/EditTierModal';
import TierHistoryModal from '../components/admin/TierHistoryModal';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Breadcrumbs from '../components/admin/layout/Breadcrumbs';
import { cn } from '../lib/utils';

// =============================================================================
// Component State Types
// =============================================================================

interface MessageState {
  type: 'success' | 'error' | null;
  text: string;
}

// =============================================================================
// Main Component
// =============================================================================

const AdminTierManagement: React.FC = () => {
  // State management
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<MessageState>({ type: null, text: '' });

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);

  // =============================================================================
  // Data Fetching
  // =============================================================================

  /**
   * Fetch all tier configurations
   */
  const fetchTiers = async (): Promise<void> => {
    try {
      setLoading(true);
      setMessage({ type: null, text: '' });

      const fetchedTiers = await getAllTierConfigs();
      setTiers(fetchedTiers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tier configurations';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch tiers on component mount
   */
  useEffect(() => {
    fetchTiers();
  }, []);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  /**
   * Handle edit tier button click
   */
  const handleEditClick = (tier: TierConfig): void => {
    setSelectedTier(tier);
    setEditModalOpen(true);
  };

  /**
   * Handle view history button click
   */
  const handleHistoryClick = (tier: TierConfig): void => {
    setSelectedTier(tier);
    setHistoryModalOpen(true);
  };

  /**
   * Handle edit modal close
   */
  const handleEditModalClose = (): void => {
    setEditModalOpen(false);
    setSelectedTier(null);
  };

  /**
   * Handle history modal close
   */
  const handleHistoryModalClose = (): void => {
    setHistoryModalOpen(false);
    setSelectedTier(null);
  };

  /**
   * Handle successful tier update
   * Refreshes the tier list and shows success message
   */
  const handleTierUpdate = async (): Promise<void> => {
    setMessage({ type: 'success', text: 'Tier configuration updated successfully' });
    handleEditModalClose();
    await fetchTiers(); // Refresh tier list
    setTimeout(() => setMessage({ type: null, text: '' }), 5000);
  };

  /**
   * Handle error from modals
   */
  const handleError = (errorMessage: string): void => {
    setMessage({ type: 'error', text: errorMessage });
    setTimeout(() => setMessage({ type: null, text: '' }), 5000);
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">Tier Management</h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Configure credit allocations, pricing, and rollout schedules for subscription tiers
          </p>
        </div>
        <Button onClick={fetchTiers} disabled={loading} variant="ghost">
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {message.type === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-body text-green-800">{message.text}</p>
        </div>
      )}

      {/* Error Message */}
      {message.type === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-body text-red-800">{message.text}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center min-h-[300px]">
          <LoadingSpinner />
        </div>
      )}

      {/* Tier Configuration Table */}
      {!loading && tiers.length > 0 && (
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
          <TierConfigTable
            tiers={tiers}
            onEditClick={handleEditClick}
            onHistoryClick={handleHistoryClick}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && tiers.length === 0 && !message.text && (
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-12 text-center">
          <h3 className="text-h3 font-semibold text-deep-navy-600 dark:text-deep-navy-300 mb-2">
            No tier configurations found
          </h3>
          <p className="text-body text-deep-navy-500 dark:text-deep-navy-400">
            Contact system administrator to set up tier configurations
          </p>
        </div>
      )}

      {/* Edit Tier Modal */}
      {selectedTier && (
        <EditTierModal
          open={editModalOpen}
          tier={selectedTier}
          onClose={handleEditModalClose}
          onSuccess={handleTierUpdate}
          onError={handleError}
        />
      )}

      {/* Tier History Modal */}
      {selectedTier && (
        <TierHistoryModal
          open={historyModalOpen}
          tierName={selectedTier.tierName}
          onClose={handleHistoryModalClose}
        />
      )}
    </div>
  );
};

export default AdminTierManagement;
