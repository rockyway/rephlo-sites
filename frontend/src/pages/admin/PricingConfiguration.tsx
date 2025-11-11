import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Edit,
  Plus,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import { MarginBadge, PricingConfigForm } from '@/components/admin/PricingComponents';
import { pricingApi, type PricingConfig } from '@/api/pricing';
import { cn } from '@/lib/utils';
import Breadcrumbs from '@/components/admin/layout/Breadcrumbs';

/**
 * PricingConfiguration Page
 *
 * Admin dashboard for managing pricing multipliers and margin configuration.
 * Features:
 * - Current multipliers table by tier
 * - Model-specific overrides
 * - Create/edit multiplier configurations
 * - Impact prediction
 * - Approval workflow
 */
function PricingConfiguration() {
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [filterScope] = useState<string>('');
  const [filterTier] = useState<string>('');
  const [filterStatus] = useState<string>('active');

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, [filterScope, filterTier, filterStatus]);

  const loadConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await pricingApi.listPricingConfigs({
        scopeType: filterScope || undefined,
        subscriptionTier: filterTier || undefined,
        isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
      });
      // Backend wraps responses in { success, data }
      const unwrapped = (response as any).data || response;
      setConfigs(unwrapped.configs || unwrapped || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load pricing configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConfig = async (formData: any) => {
    setIsSaving(true);
    try {
      if (editingConfig) {
        // Update existing config
        const updated = await pricingApi.updatePricingConfig(editingConfig.id, {
          ...formData,
        });
        setConfigs(configs.map((c) => (c.id === editingConfig.id ? updated : c)));
        setSuccessMessage('Pricing configuration updated successfully');
        setEditingConfig(null);
      } else {
        // Create new config
        const newConfig = await pricingApi.createPricingConfig({
          ...formData,
          effectiveFrom: new Date().toISOString(),
        });
        setConfigs([newConfig, ...configs]);
        setSuccessMessage('Pricing configuration created successfully');
        setIsCreateDialogOpen(false);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingConfig ? 'update' : 'create'} configuration`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (configId: string) => {
    try {
      const updated = await pricingApi.approvePricingConfig(configId);
      setConfigs(configs.map((c) => (c.id === configId ? updated : c)));
      setSuccessMessage('Configuration approved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve configuration');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleReject = async (configId: string) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      const updated = await pricingApi.rejectPricingConfig(configId, reason);
      setConfigs(configs.map((c) => (c.id === configId ? updated : c)));
      setSuccessMessage('Configuration rejected');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject configuration');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Group configs by tier for summary
  const tierSummary = (configs || [])
    .filter((c) => c.scopeType === 'tier' && c.isActive)
    .reduce((acc, config) => {
      if (config.subscriptionTier) {
        acc[config.subscriptionTier] = config;
      }
      return acc;
    }, {} as Record<string, PricingConfig>);

  const tiers = ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'];

  // Model-specific overrides
  const modelOverrides = (configs || []).filter(
    (c) => (c.scopeType === 'model' || c.scopeType === 'combination') && c.isActive
  );

  return (
    <div className="min-h-screen bg-deep-navy-50 dark:bg-deep-navy-900">
      {/* Breadcrumbs */}
      <Breadcrumbs />

{/* Header */}
      <header className="bg-white dark:bg-deep-navy-800 border-b border-deep-navy-200">
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
              <h1 className="text-h1 font-bold text-deep-navy-800 dark:text-white">
                Pricing Configuration
              </h1>
              <p className="text-body text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                Manage margin multipliers and pricing strategy
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadConfigs} disabled={isLoading} variant="ghost">
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            </div>
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

        {/* Current Multipliers Summary */}
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-deep-navy-200">
            <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
              Current Tier Multipliers
            </h2>
            <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
              Active pricing configurations by subscription tier
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                <tr>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Multiplier
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Target Margin %
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Actual Margin %
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                {tiers.map((tier) => {
                  const config = tierSummary[tier];
                  const multiplier = config?.marginMultiplier || 1.5;
                  const targetMargin = config?.targetGrossMarginPercent || ((multiplier - 1) / multiplier) * 100;
                  // In real app, fetch actual margin from analytics API
                  const actualMargin = targetMargin - (Math.random() * 4 - 2); // Mock data

                  return (
                    <tr key={tier} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-deep-navy-800 dark:text-white capitalize">
                          {tier.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-h4 font-semibold text-rephlo-blue">
                          {multiplier.toFixed(2)}×
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                          {targetMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <MarginBadge marginPercent={actualMargin} targetMargin={targetMargin} />
                      </td>
                      <td className="px-6 py-4">
                        {config ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-caption font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-caption font-medium bg-deep-navy-100 dark:bg-deep-navy-800 text-deep-navy-600 dark:text-deep-navy-200">
                            Not Set
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Button size="sm" variant="ghost" onClick={() => config && setEditingConfig(config)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model-Specific Overrides */}
        <div className="bg-white dark:bg-deep-navy-800 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-deep-navy-200">
            <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
              Model-Specific Overrides
            </h2>
            <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
              Custom multipliers for specific providers and models
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-deep-navy-50 dark:bg-deep-navy-900 border-b border-deep-navy-200">
                <tr>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Base Multiplier
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Override
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Margin %
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-body-sm font-semibold text-deep-navy-700 dark:text-deep-navy-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
                {modelOverrides.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <p className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                        No model-specific overrides configured
                      </p>
                      <Button size="sm" className="mt-2" onClick={() => setIsCreateDialogOpen(true)}>
                        Create Override
                      </Button>
                    </td>
                  </tr>
                ) : (
                  modelOverrides.map((config) => {
                    const baseMultiplier = 1.5; // Would lookup from tier config
                    const marginPercent = ((config.marginMultiplier - 1) / config.marginMultiplier) * 100;

                    return (
                      <tr key={config.id} className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-deep-navy-800 dark:text-white">
                            {config.providerId || 'All Providers'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                            {config.modelId || 'All Models'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-body text-deep-navy-600 dark:text-deep-navy-200">
                            {baseMultiplier.toFixed(2)}×
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-h4 font-semibold text-rephlo-blue">
                            {config.marginMultiplier.toFixed(2)}×
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <MarginBadge marginPercent={marginPercent} />
                        </td>
                        <td className="px-6 py-4">
                          {config.isActive ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-deep-navy-300" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Button size="sm" variant="ghost" onClick={() => setEditingConfig(config)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals */}
        {configs && configs.filter((c) => c.approvalStatus === 'pending').length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h3 className="text-h4 font-semibold text-amber-900 mb-4">
              Pending Approvals ({configs.filter((c) => c.approvalStatus === 'pending').length})
            </h3>
            <div className="space-y-3">
              {configs
                .filter((c) => c.approvalStatus === 'pending')
                .map((config) => (
                  <div key={config.id} className="bg-white dark:bg-deep-navy-800 rounded-md p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-deep-navy-800 dark:text-white">
                        {config.scopeType === 'tier' && `${config.subscriptionTier} tier`}
                        {config.scopeType === 'provider' && `Provider: ${config.providerId}`}
                        {config.scopeType === 'model' && `Model: ${config.modelId}`}
                        {' - '}
                        <span className="text-rephlo-blue">{config.marginMultiplier.toFixed(2)}×</span>
                      </p>
                      <p className="text-caption text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                        {config.reason.replace(/_/g, ' ')} - {config.reasonDetails}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleReject(config.id)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(config.id)}>
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      {(isCreateDialogOpen || editingConfig) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-deep-navy-200">
              <h2 className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                {editingConfig ? 'Edit Configuration' : 'Create Pricing Configuration'}
              </h2>
            </div>
            <div className="p-6">
              <PricingConfigForm
                key={editingConfig?.id || 'new'}
                initialValues={editingConfig || undefined}
                onSubmit={handleCreateConfig}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  setEditingConfig(null);
                }}
                isSubmitting={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingConfiguration;
