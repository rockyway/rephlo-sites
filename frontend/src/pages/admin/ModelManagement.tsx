import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TierBadge from '@/components/admin/TierBadge';
import TierSelect from '@/components/admin/TierSelect';
import ModelTierEditDialog from '@/components/admin/ModelTierEditDialog';
import EditModelDialog from '@/components/admin/EditModelDialog';
import TierAuditLog from '@/components/admin/TierAuditLog';
import ModelStatusBadge from '@/components/admin/ModelStatusBadge';
import LifecycleActionMenu from '@/components/admin/LifecycleActionMenu';
import MarkLegacyDialog from '@/components/admin/MarkLegacyDialog';
import ArchiveDialog from '@/components/admin/ArchiveDialog';
import UnarchiveDialog from '@/components/admin/UnarchiveDialog';
import AddModelDialog from '@/components/admin/AddModelDialog';
import ModelVersionHistory from '@/components/admin/ModelVersionHistory';
import { adminAPI } from '@/api/admin';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import { safeArray } from '@/lib/safeUtils';
import type {
  SubscriptionTier,
} from '@rephlo/shared-types';
import type {
  ModelTierInfo,
  TierAuditLogEntry,
  ModelTierUpdateRequest,
} from '@/types/model-tier';
import type { ModelInfo, MarkLegacyRequest } from '@/types/model';
import { useModelPermissions } from '@/hooks/useModelPermissions';

/**
 * ModelManagement Page
 *
 * Unified admin interface for managing model tier configurations and lifecycle.
 * Features:
 * - Table view with search/filter
 * - Bulk selection and updates
 * - Individual model editing
 * - Lifecycle management (mark legacy, archive, unarchive)
 * - Audit log viewing
 * - RBAC enforcement for admin-only actions
 */
function ModelManagement() {
  // RBAC permissions
  const permissions = useModelPermissions();
  // Data state
  const [models, setModels] = useState<ModelTierInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<TierAuditLogEntry[]>([]);
  const [providers, setProviders] = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [filterTier, setFilterTier] = useState<SubscriptionTier | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'legacy' | 'archived'>('all');

  // Selection state
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editingModel, setEditingModel] = useState<ModelTierInfo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Full edit dialog state
  const [editingFullModel, setEditingFullModel] = useState<ModelInfo | null>(null);
  const [isFullEditDialogOpen, setIsFullEditDialogOpen] = useState(false);

  // Lifecycle dialog state
  const [markLegacyDialogOpen, setMarkLegacyDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [lifecycleTargetModel, setLifecycleTargetModel] = useState<ModelInfo | null>(null);

  // Add Model dialog state
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false);

  // Version history dialog state
  const [versionHistoryModelId, setVersionHistoryModelId] = useState<string | null>(null);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = useState(false);

  // Load data
  useEffect(() => {
    loadModels();
    loadAuditLogs();
    loadProviders();
  }, []);

  const loadModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.listModelsWithTiers(
        {
          provider: filterProvider || undefined,
          tier: filterTier || undefined,
          search: searchTerm || undefined,
        },
        0,
        100
      );
      // Handle both response formats: { data: { models: [...] } } or { models: [...] } or direct array
      const models = (response as any).models ||
                    (response as any).data?.models ||
                    (response as any).data;
      setModels(safeArray<ModelTierInfo>(models));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await adminAPI.getAuditLogs({ page: 0, pageSize: 20 });
      setAuditLogs(response.logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadProviders = async () => {
    try {
      const providerList = await adminAPI.getProviders();
      setProviders(providerList);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const handleRefresh = () => {
    loadModels();
    loadAuditLogs();
  };

  const handleSearch = () => {
    loadModels();
  };

  const handleEditModel = (model: ModelTierInfo) => {
    setEditingModel(model);
    setIsEditDialogOpen(true);
  };

  const handleFullEditModel = (model: ModelInfo) => {
    setEditingFullModel(model);
    setIsFullEditDialogOpen(true);
  };

  const handleViewVersionHistory = (modelId: string) => {
    setVersionHistoryModelId(modelId);
    setIsVersionHistoryDialogOpen(true);
  };

  const handleSaveFullModel = async (updates: {
    name?: string;
    meta?: any;
    reason?: string;
  }) => {
    if (!editingFullModel) return;

    setIsSaving(true);
    try {
      const updatedModel = await adminAPI.updateModel(editingFullModel.id, updates);
      setSuccessMessage(`Successfully updated ${updatedModel.meta?.displayName || editingFullModel.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsFullEditDialogOpen(false);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update model');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModel = async (
    modelId: string,
    updates: ModelTierUpdateRequest
  ) => {
    setIsSaving(true);
    try {
      const updatedModel = await adminAPI.updateModelTier(modelId, updates);
      // Ensure allowedTiers is always an array
      const modelWithDefaults = {
        ...updatedModel,
        allowedTiers: safeArray<SubscriptionTier>(updatedModel.allowedTiers),
      };
      // Update models list
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? modelWithDefaults : m))
      );
      setSuccessMessage(`Successfully updated ${updatedModel.displayName}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditDialogOpen(false);
      loadAuditLogs(); // Refresh audit logs
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update model');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedModels.size === 0) return;

    const reason = window.prompt(
      `Update ${selectedModels.size} models.\n\nPlease provide a reason for this bulk change:`
    );

    if (!reason) return;

    // For demo, let's prompt for tier
    const tierInput = window.prompt(
      'Enter new required tier (free/pro/enterprise):'
    );
    if (!tierInput || !['free', 'pro', 'enterprise'].includes(tierInput))
      return;

    setIsLoading(true);
    try {
      await adminAPI.bulkUpdateTiers(
        Array.from(selectedModels),
        { requiredTier: tierInput as SubscriptionTier },
        reason
      );
      setSuccessMessage(
        `Successfully updated ${selectedModels.size} models`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      setSelectedModels(new Set());
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to bulk update models');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertChange = async (auditLogId: string) => {
    try {
      await adminAPI.revertTierChange(auditLogId);
      setSuccessMessage('Successfully reverted change');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revert change');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUnmarkLegacy = async (modelId: string) => {
    try {
      await adminAPI.unmarkModelLegacy(modelId);
      setSuccessMessage('Successfully removed legacy status');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unmark legacy');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAddModelConfirm = async (modelData: any) => {
    try {
      setIsSaving(true);
      await adminAPI.createModel(modelData);
      setSuccessMessage(`Successfully created model '${modelData.meta.displayName || modelData.name}'`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setAddModelDialogOpen(false);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create model');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkLegacyConfirm = async (data: MarkLegacyRequest) => {
    if (!lifecycleTargetModel) return;
    try {
      await adminAPI.markModelAsLegacy(lifecycleTargetModel.id, data);
      setSuccessMessage(`Successfully marked ${lifecycleTargetModel.meta?.displayName || lifecycleTargetModel.name} as legacy`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setMarkLegacyDialogOpen(false);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark as legacy');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleArchiveConfirm = async (reason: string) => {
    if (!lifecycleTargetModel) return;
    try {
      await adminAPI.archiveModel(lifecycleTargetModel.id, reason);
      setSuccessMessage(`Successfully archived ${lifecycleTargetModel.meta?.displayName || lifecycleTargetModel.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setArchiveDialogOpen(false);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive model');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUnarchiveConfirm = async () => {
    if (!lifecycleTargetModel) return;
    try {
      await adminAPI.unarchiveModel(lifecycleTargetModel.id);
      setSuccessMessage(`Successfully unarchived ${lifecycleTargetModel.meta?.displayName || lifecycleTargetModel.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setUnarchiveDialogOpen(false);
      loadModels();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unarchive model');
      setTimeout(() => setError(null), 5000);
    }
  };

  const toggleModelSelection = (modelId: string) => {
    const newSet = new Set(selectedModels);
    if (newSet.has(modelId)) {
      newSet.delete(modelId);
    } else {
      newSet.add(modelId);
    }
    setSelectedModels(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedModels.size === models.length) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(models.map((m) => m.id)));
    }
  };

  const filteredModels = safeArray<ModelTierInfo>(models).filter((model) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        model.name.toLowerCase().includes(search) ||
        model.displayName.toLowerCase().includes(search) ||
        model.provider.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">
            Model Management
          </h1>
          <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
            Configure models, tier access, and lifecycle management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canCreateModels && (
            <Button
              onClick={() => setAddModelDialogOpen(true)}
              className="bg-rephlo-blue hover:bg-rephlo-blue/90 dark:bg-electric-cyan dark:hover:bg-electric-cyan/90"
            >
              Add New Model
            </Button>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
          >
            <RefreshCw
              className={cn(
                'h-4 w-4 mr-2',
                isLoading && 'animate-spin'
              )}
            />
            Refresh
          </Button>
        </div>
      </div>
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-body text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-body text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
        <h2 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
          Search & Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deep-navy-400 dark:text-deep-navy-500" />
              <Input
                placeholder="Search by model name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          {/* Provider Filter */}
          <div>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="flex h-11 w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2.5 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20 focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan transition-all duration-fast"
            >
              <option value="">All Providers</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          {/* Tier Filter */}
          <div>
            <TierSelect
              value={filterTier as SubscriptionTier}
              onChange={(tier) => setFilterTier(tier)}
              allowEmpty
            />
          </div>

          {/* Status Filter (NEW) */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="flex h-11 w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2.5 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20 focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan transition-all duration-fast"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="legacy">Legacy</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedModels.size > 0 && (
        <div className="bg-rephlo-blue dark:bg-electric-cyan/90 text-white dark:text-deep-navy-900 rounded-lg p-4 flex items-center justify-between">
          <span className="font-medium">
            {selectedModels.size} model(s) selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedModels(new Set())}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkUpdate}
            >
              Bulk Update
            </Button>
          </div>
        </div>
      )}

      {/* Models Table */}
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200 dark:border-deep-navy-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      !!(models && models.length > 0 &&
                      selectedModels.size === models.length)
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
                  />
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Model Name
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Required Tier
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Allowed Tiers
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Availability
                </th>
                <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
              {isLoading && filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <LoadingSpinner size="lg" />
                  </td>
                </tr>
              ) : filteredModels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                      No models found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredModels.map((model) => (
                  <tr
                    key={model.id}
                    className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedModels.has(model.id)}
                        onChange={() => toggleModelSelection(model.id)}
                        className="h-4 w-4 rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-deep-navy-800 dark:text-white">
                          {model.displayName}
                        </p>
                        <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200">
                          {model.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                      {model.provider}
                    </td>
                    <td className="px-4 py-3">
                      <ModelStatusBadge
                        isLegacy={(model as any).isLegacy || false}
                        isArchived={(model as any).isArchived || false}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={model.requiredTier} />
                    </td>
                    <td className="px-4 py-3 text-body-sm text-deep-navy-600 dark:text-deep-navy-200">
                      {model.tierRestrictionMode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {safeArray<SubscriptionTier>(model.allowedTiers).map((tier, idx) => (
                          <TierBadge key={`${model.id}-${tier}-${idx}`} tier={tier} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {model.isAvailable ? (
                        <span className="text-body-sm text-green-600">
                          Available
                        </span>
                      ) : (
                        <span className="text-body-sm text-deep-navy-400 dark:text-deep-navy-500">
                          Unavailable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <LifecycleActionMenu
                        model={model as any as ModelInfo}
                        onMarkLegacy={() => {
                          setLifecycleTargetModel(model as any as ModelInfo);
                          setMarkLegacyDialogOpen(true);
                        }}
                        onUnmarkLegacy={() => handleUnmarkLegacy(model.id)}
                        onArchive={() => {
                          setLifecycleTargetModel(model as any as ModelInfo);
                          setArchiveDialogOpen(true);
                        }}
                        onUnarchive={() => {
                          setLifecycleTargetModel(model as any as ModelInfo);
                          setUnarchiveDialogOpen(true);
                        }}
                        onEditMeta={() => handleEditModel(model)}
                        onEditFull={() => handleFullEditModel(model as any as ModelInfo)}
                        onViewHistory={() => handleViewVersionHistory(model.id)}
                        permissions={{
                          canManageLifecycle: permissions.canManageLifecycle,
                          canEditMeta: permissions.canEditMeta,
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Section */}
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 p-6">
        <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white mb-4">
          Recent Changes
        </h2>
        <TierAuditLog
          logs={auditLogs}
          isLoading={isLoadingLogs}
          onRevert={handleRevertChange}
        />
      </div>

      {/* Edit Dialog */}
      <ModelTierEditDialog
        model={editingModel}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleSaveModel}
        isSaving={isSaving}
      />

      {/* Lifecycle Dialogs */}
      <MarkLegacyDialog
        isOpen={markLegacyDialogOpen}
        model={lifecycleTargetModel as any}
        availableModels={models as any[]}
        onConfirm={handleMarkLegacyConfirm}
        onCancel={() => setMarkLegacyDialogOpen(false)}
        isSaving={isSaving}
      />

      <ArchiveDialog
        isOpen={archiveDialogOpen}
        model={lifecycleTargetModel as any}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveDialogOpen(false)}
        isSaving={isSaving}
      />

      <UnarchiveDialog
        isOpen={unarchiveDialogOpen}
        model={lifecycleTargetModel as any}
        onConfirm={handleUnarchiveConfirm}
        onCancel={() => setUnarchiveDialogOpen(false)}
        isSaving={isSaving}
      />

      {/* Add Model Dialog */}
      <AddModelDialog
        isOpen={addModelDialogOpen}
        onConfirm={handleAddModelConfirm}
        onCancel={() => setAddModelDialogOpen(false)}
        isSaving={isSaving}
      />

      {/* Full Edit Dialog */}
      <EditModelDialog
        model={editingFullModel}
        isOpen={isFullEditDialogOpen}
        onConfirm={handleSaveFullModel}
        onCancel={() => setIsFullEditDialogOpen(false)}
        isSaving={isSaving}
      />

      {/* Version History Dialog */}
      {isVersionHistoryDialogOpen && versionHistoryModelId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIsVersionHistoryDialogOpen(false)}
        >
          <div
            className="bg-white dark:bg-deep-navy-900 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-deep-navy-900 border-b border-deep-navy-200 dark:border-deep-navy-700 p-4 flex items-center justify-between">
              <h2 className="text-h2 font-semibold text-deep-navy-800 dark:text-white">
                Model Version History
              </h2>
              <button
                onClick={() => setIsVersionHistoryDialogOpen(false)}
                className="text-deep-navy-600 hover:text-deep-navy-800 dark:text-deep-navy-400 dark:hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <ModelVersionHistory modelId={versionHistoryModelId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelManagement;
