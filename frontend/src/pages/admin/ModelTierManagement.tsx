import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Edit,
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
import TierAuditLog from '@/components/admin/TierAuditLog';
import { adminAPI } from '@/api/admin';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';
import type {
  ModelTierInfo,
  SubscriptionTier,
  TierAuditLogEntry,
  ModelTierUpdateRequest,
} from '@/types/model-tier';

/**
 * ModelTierManagement Page
 *
 * Admin interface for managing model tier configurations.
 * Features:
 * - Table view with search/filter
 * - Bulk selection and updates
 * - Individual model editing
 * - Audit log viewing
 */
function ModelTierManagement() {
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

  // Selection state
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  // Edit dialog state
  const [editingModel, setEditingModel] = useState<ModelTierInfo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      setModels(response.models);
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

  const handleSaveModel = async (
    modelId: string,
    updates: ModelTierUpdateRequest
  ) => {
    setIsSaving(true);
    try {
      const updatedModel = await adminAPI.updateModelTier(modelId, updates);
      // Update models list
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? updatedModel : m))
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

  const filteredModels = models.filter((model) => {
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
    <div className="min-h-screen bg-deep-navy-50">
      {/* Breadcrumbs */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-deep-navy-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin"
                className="inline-flex items-center text-body text-rephlo-blue hover:text-rephlo-blue-600 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Admin
              </Link>
              <h1 className="text-h1 font-bold text-deep-navy-800">
                Model Tier Management
              </h1>
              <p className="text-body text-deep-navy-500 mt-1">
                Configure subscription tier requirements for AI models
              </p>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-body text-green-800">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-body text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6 mb-6">
          <h2 className="text-h4 font-semibold text-deep-navy-800 mb-4">
            Search & Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-deep-navy-400" />
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
                className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-lg py-md text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue transition-all duration-fast"
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
          <div className="bg-rephlo-blue text-white rounded-lg p-4 mb-6 flex items-center justify-between">
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
        <div className="bg-white rounded-lg border border-deep-navy-200 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-deep-navy-50 border-b border-deep-navy-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        models.length > 0 &&
                        selectedModels.size === models.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-deep-navy-300 text-rephlo-blue focus:ring-rephlo-blue"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Model Name
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Required Tier
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Mode
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Allowed Tiers
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-body-sm font-semibold text-deep-navy-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deep-navy-100">
                {isLoading && filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <LoadingSpinner size="lg" />
                    </td>
                  </tr>
                ) : filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <p className="text-body text-deep-navy-500">
                        No models found
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((model) => (
                    <tr
                      key={model.id}
                      className="hover:bg-deep-navy-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedModels.has(model.id)}
                          onChange={() => toggleModelSelection(model.id)}
                          className="h-4 w-4 rounded border-deep-navy-300 text-rephlo-blue focus:ring-rephlo-blue"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-deep-navy-800">
                            {model.displayName}
                          </p>
                          <p className="text-caption text-deep-navy-500">
                            {model.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-deep-navy-600">
                        {model.provider}
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={model.requiredTier} />
                      </td>
                      <td className="px-4 py-3 text-body-sm text-deep-navy-600">
                        {model.tierRestrictionMode}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {model.allowedTiers.map((tier) => (
                            <TierBadge key={tier} tier={tier} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {model.isAvailable ? (
                          <span className="text-body-sm text-green-600">
                            Available
                          </span>
                        ) : (
                          <span className="text-body-sm text-deep-navy-400">
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditModel(model)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Section */}
        <div className="bg-white rounded-lg border border-deep-navy-200 p-6">
          <h2 className="text-h3 font-semibold text-deep-navy-800 mb-4">
            Recent Changes
          </h2>
          <TierAuditLog
            logs={auditLogs}
            isLoading={isLoadingLogs}
            onRevert={handleRevertChange}
          />
        </div>
      </main>

      {/* Edit Dialog */}
      <ModelTierEditDialog
        model={editingModel}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleSaveModel}
        isSaving={isSaving}
      />
    </div>
  );
}

export default ModelTierManagement;
