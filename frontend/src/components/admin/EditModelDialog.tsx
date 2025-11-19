import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import TierSelect from './TierSelect';
import RestrictionModeSelect from './RestrictionModeSelect';
import TierBadge from './TierBadge';
import { cn } from '@/lib/utils';
import {
  MODEL_TEMPLATES,
  CAPABILITY_OPTIONS,
  TIER_OPTIONS,
  calculateSuggestedCredits,
  type ModelTemplate,
} from '@/data/modelTemplates';
import type { ModelInfo } from '@/types/model-lifecycle';
import { SubscriptionTier } from '@rephlo/shared-types';
import type { TierRestrictionMode } from '@/types/model-tier';

interface EditModelDialogProps {
  model: ModelInfo | null;
  isOpen: boolean;
  onConfirm: (updates: {
    name?: string;
    meta?: any;
    reason?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * EditModelDialog Component
 *
 * Modal dialog for editing an existing model's configuration.
 * Pre-fills all fields from existing model data.
 * Supports full metadata editing including pricing (updates model_provider_pricing table).
 *
 * Features:
 * - Read-only model ID and provider
 * - Pre-filled values from existing model
 * - USD pricing input with auto-conversion to cents
 * - Auto-calculation of credits per 1K tokens
 * - Tier access configuration
 * - Provider-specific metadata
 * - Reason field for audit trail
 */
function EditModelDialog({
  model,
  isOpen,
  onConfirm,
  onCancel,
  isSaving = false,
}: EditModelDialogProps) {
  // Form state
  const [modelName, setModelName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [contextLength, setContextLength] = useState('');
  const [maxOutputTokens, setMaxOutputTokens] = useState('');
  const [version, setVersion] = useState('');
  const [inputCost, setInputCost] = useState(''); // USD
  const [outputCost, setOutputCost] = useState(''); // USD
  const [creditsPerK, setCreditsPerK] = useState('');
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set());
  const [requiredTier, setRequiredTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [restrictionMode, setRestrictionMode] = useState<TierRestrictionMode>('minimum');
  const [allowedTiers, setAllowedTiers] = useState<Set<SubscriptionTier>>(new Set());
  const [reason, setReason] = useState('');

  // Provider metadata state
  const [providerMetadata, setProviderMetadata] = useState<any>({});

  // Auto-calculation state
  const [showAutoCalculation, setShowAutoCalculation] = useState(false);

  // Error state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when model changes
  useEffect(() => {
    if (model && isOpen) {
      const meta = model.meta;

      setModelName(model.name);
      setDisplayName(meta?.displayName || '');
      setDescription(meta?.description || '');
      setContextLength(String(meta?.contextLength || ''));
      setMaxOutputTokens(String(meta?.maxOutputTokens || ''));
      setVersion(meta?.version || '');

      // Convert cents to USD for display
      const inputUSD = (meta?.inputCostPerMillionTokens || 0) / 100;
      const outputUSD = (meta?.outputCostPerMillionTokens || 0) / 100;
      setInputCost(String(inputUSD));
      setOutputCost(String(outputUSD));
      setCreditsPerK(String(meta?.creditsPer1kTokens || ''));

      setCapabilities(new Set(meta?.capabilities || []));
      setRequiredTier((meta?.requiredTier as SubscriptionTier) || SubscriptionTier.FREE);
      setRestrictionMode(meta?.tierRestrictionMode || 'minimum');
      setAllowedTiers(new Set(meta?.allowedTiers || []));

      setProviderMetadata(meta?.providerMetadata || {});
      setReason('');
      setValidationError(null);
    }
  }, [model, isOpen]);

  // Auto-calculate credits when pricing changes
  useEffect(() => {
    const inputDollars = parseFloat(inputCost);
    const outputDollars = parseFloat(outputCost);
    const inputCents = Math.round(inputDollars * 100);
    const outputCents = Math.round(outputDollars * 100);

    if (!isNaN(inputCents) && !isNaN(outputCents) && outputCents > 0) {
      const suggested = calculateSuggestedCredits(inputCents, outputCents);
      setShowAutoCalculation(true);
      if (!creditsPerK || creditsPerK === '0') {
        setCreditsPerK(suggested.toString());
      }
    } else {
      setShowAutoCalculation(false);
    }
  }, [inputCost, outputCost]);

  const toggleCapability = (capability: string) => {
    const newSet = new Set(capabilities);
    if (newSet.has(capability)) {
      newSet.delete(capability);
    } else {
      newSet.add(capability);
    }
    setCapabilities(newSet);
  };

  const toggleAllowedTier = (tier: SubscriptionTier) => {
    const newSet = new Set(allowedTiers);
    if (newSet.has(tier)) {
      newSet.delete(tier);
    } else {
      newSet.add(tier);
    }
    setAllowedTiers(newSet);
  };

  const validateForm = (): boolean => {
    if (!displayName.trim()) {
      setValidationError('Display name is required');
      return false;
    }
    if (capabilities.size === 0) {
      setValidationError('At least one capability is required');
      return false;
    }
    if (!contextLength || parseInt(contextLength) <= 0) {
      setValidationError('Valid context length is required');
      return false;
    }
    if (!inputCost || !outputCost) {
      setValidationError('Input and output costs are required');
      return false;
    }
    if (!creditsPerK || parseInt(creditsPerK) <= 0) {
      setValidationError('Valid credits per 1K tokens is required');
      return false;
    }
    if (restrictionMode === 'whitelist' && allowedTiers.size === 0) {
      setValidationError('At least one tier must be selected for whitelist mode');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSave = async () => {
    if (!model || !validateForm()) return;

    // Convert dollar amounts to cents for storage
    const inputDollars = parseFloat(inputCost);
    const outputDollars = parseFloat(outputCost);
    const inputCostInCents = Math.round(inputDollars * 100);
    const outputCostInCents = Math.round(outputDollars * 100);

    // Build updates object (only send changed fields)
    const updates: {
      name?: string;
      meta?: any;
      reason?: string;
    } = {};

    // Check if name changed
    if (modelName !== model.name) {
      updates.name = modelName;
    }

    // Build meta updates (partial)
    const metaUpdates: any = {};
    const currentMeta = model.meta;

    if (displayName !== currentMeta?.displayName) metaUpdates.displayName = displayName;
    if (description !== currentMeta?.description) metaUpdates.description = description;
    if (parseInt(contextLength) !== currentMeta?.contextLength) metaUpdates.contextLength = parseInt(contextLength);
    if (maxOutputTokens && parseInt(maxOutputTokens) !== currentMeta?.maxOutputTokens) {
      metaUpdates.maxOutputTokens = parseInt(maxOutputTokens);
    }
    if (version !== currentMeta?.version) metaUpdates.version = version;
    if (inputCostInCents !== currentMeta?.inputCostPerMillionTokens) {
      metaUpdates.inputCostPerMillionTokens = inputCostInCents;
    }
    if (outputCostInCents !== currentMeta?.outputCostPerMillionTokens) {
      metaUpdates.outputCostPerMillionTokens = outputCostInCents;
    }
    if (parseInt(creditsPerK) !== currentMeta?.creditsPer1kTokens) {
      metaUpdates.creditsPer1kTokens = parseInt(creditsPerK);
    }

    const currentCaps = new Set(currentMeta?.capabilities || []);
    if (capabilities.size !== currentCaps.size || ![...capabilities].every(c => currentCaps.has(c))) {
      metaUpdates.capabilities = Array.from(capabilities);
    }

    if (requiredTier !== currentMeta?.requiredTier) metaUpdates.requiredTier = requiredTier;
    if (restrictionMode !== currentMeta?.tierRestrictionMode) metaUpdates.tierRestrictionMode = restrictionMode;

    const currentTiers = new Set(currentMeta?.allowedTiers || []);
    if (allowedTiers.size !== currentTiers.size || ![...allowedTiers].every(t => currentTiers.has(t))) {
      metaUpdates.allowedTiers = Array.from(allowedTiers);
    }

    if (JSON.stringify(providerMetadata) !== JSON.stringify(currentMeta?.providerMetadata || {})) {
      metaUpdates.providerMetadata = providerMetadata;
    }

    if (Object.keys(metaUpdates).length > 0) {
      updates.meta = metaUpdates;
    }

    if (reason.trim()) {
      updates.reason = reason.trim();
    }

    // Only call onConfirm if there are changes
    if (Object.keys(updates).length === 0 || (Object.keys(updates).length === 1 && updates.reason)) {
      setValidationError('No changes detected');
      return;
    }

    await onConfirm(updates);
  };

  const updateProviderMetadata = (provider: string, field: string, value: any) => {
    setProviderMetadata((prev: any) => ({
      ...prev,
      [provider]: {
        ...(prev[provider] || {}),
        [field]: value,
      },
    }));
  };

  if (!model) return null;

  const currentProvider = model.provider;
  const template = MODEL_TEMPLATES[currentProvider] || MODEL_TEMPLATES.custom;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl z-50',
            'w-full max-w-4xl max-h-[90vh] overflow-y-auto',
            'animate-scale-in'
          )}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-deep-navy-800 border-b border-deep-navy-200 dark:border-deep-navy-700 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <Dialog.Title className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                Edit Model: {model.meta?.displayName || model.name}
              </Dialog.Title>
              <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                Update model configuration and pricing
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                className="text-deep-navy-400 dark:text-deep-navy-500 hover:text-deep-navy-600 dark:hover:text-deep-navy-300 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-body-sm text-red-800 dark:text-red-200">{validationError}</p>
              </div>
            )}

            {/* Model Identification (Read-Only) */}
            <div className="bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md p-4 space-y-2">
              <p className="text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                Model Identification (Read-Only)
              </p>
              <div className="grid grid-cols-2 gap-4 text-body-sm">
                <div>
                  <span className="text-deep-navy-700 dark:text-deep-navy-300">Model ID:</span>
                  <p className="mt-1 font-mono font-medium text-deep-navy-800 dark:text-white">
                    {model.id}
                  </p>
                </div>
                <div>
                  <span className="text-deep-navy-700 dark:text-deep-navy-300">Provider:</span>
                  <p className="mt-1 font-medium text-deep-navy-800 dark:text-white capitalize">
                    {currentProvider} (Cannot change)
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-h5 font-semibold text-deep-navy-800 dark:text-white mb-3">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Model Name *
                  </label>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., gpt-5-chat"
                  />
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Internal model identifier (same as Model ID)
                  </p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Display Name *
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={template.hints.displayName}
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={template.hints.description}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div>
              <h3 className="text-h5 font-semibold text-deep-navy-800 dark:text-white mb-3">
                Technical Specifications
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Context Length *
                  </label>
                  <Input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(e.target.value)}
                    placeholder={template.hints.contextLength}
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Max Output Tokens
                  </label>
                  <Input
                    type="number"
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(e.target.value)}
                    placeholder="e.g., 4096"
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Version
                  </label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., 1.0, 2.5"
                  />
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                Capabilities *
              </label>
              <div className="space-y-2">
                {CAPABILITY_OPTIONS.map((cap) => (
                  <label
                    key={cap.value}
                    className="flex items-start space-x-3 cursor-pointer hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={capabilities.has(cap.value)}
                      onChange={() => toggleCapability(cap.value)}
                      className="mt-0.5 h-4 w-4 rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                    />
                    <div className="flex-1">
                      <p className="text-body-sm font-medium text-deep-navy-800 dark:text-white">
                        {cap.label}
                      </p>
                      <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300">
                        {cap.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Pricing (⚠️ Updates model_provider_pricing table) */}
            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="text-h5 font-semibold text-deep-navy-800 dark:text-white mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Pricing Configuration
              </h3>
              <p className="text-caption text-amber-700 dark:text-amber-300 mb-3">
                ⚠️ Changing pricing updates the model_provider_pricing table atomically
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Input Cost (per 1M tokens in USD) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputCost}
                    onChange={(e) => setInputCost(e.target.value)}
                    placeholder="e.g., 1.25 for $1.25 per 1M tokens"
                  />
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Enter cost in dollars (e.g., 1.25 = $1.25, 0.25 = $0.25)
                  </p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                    Output Cost (per 1M tokens in USD) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={outputCost}
                    onChange={(e) => setOutputCost(e.target.value)}
                    placeholder="e.g., 10.00 for $10.00 per 1M tokens"
                  />
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Enter cost in dollars (e.g., 10.00 = $10.00, 2.00 = $2.00)
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                  Credits per 1K Tokens *
                </label>
                {showAutoCalculation && (
                  <p className="text-caption text-green-600 dark:text-green-400 mb-1">
                    ✓ Auto-calculated based on pricing
                  </p>
                )}
                <Input
                  type="number"
                  value={creditsPerK}
                  onChange={(e) => setCreditsPerK(e.target.value)}
                  placeholder="Auto-calculated or enter manually"
                />
              </div>
            </div>

            {/* Provider Metadata */}
            {currentProvider !== 'custom' && template.defaults.providerMetadata && (
              <div>
                <h3 className="text-h5 font-semibold text-deep-navy-800 dark:text-white mb-3">
                  Provider Metadata ({template.providerDisplayName})
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {currentProvider === 'openai' && (
                    <>
                      <div>
                        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                          Model Family
                        </label>
                        <Input
                          value={providerMetadata.openai?.modelFamily || ''}
                          onChange={(e) => updateProviderMetadata('openai', 'modelFamily', e.target.value)}
                          placeholder="e.g., gpt-4, gpt-3.5, gpt-5"
                        />
                      </div>
                      <div>
                        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                          Training Cutoff
                        </label>
                        <Input
                          value={providerMetadata.openai?.trainingCutoff || ''}
                          onChange={(e) => updateProviderMetadata('openai', 'trainingCutoff', e.target.value)}
                          placeholder="e.g., 2023-09, 2024-04"
                        />
                      </div>
                    </>
                  )}
                  {currentProvider === 'anthropic' && (
                    <>
                      <div>
                        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                          Model Series
                        </label>
                        <Input
                          value={providerMetadata.anthropic?.modelSeries || ''}
                          onChange={(e) => updateProviderMetadata('anthropic', 'modelSeries', e.target.value)}
                          placeholder="e.g., claude-3, claude-2, claude-4"
                        />
                      </div>
                      <div>
                        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                          Knowledge Cutoff
                        </label>
                        <Input
                          value={providerMetadata.anthropic?.knowledgeCutoff || ''}
                          onChange={(e) => updateProviderMetadata('anthropic', 'knowledgeCutoff', e.target.value)}
                          placeholder="e.g., 2024-04, 2025-01"
                        />
                      </div>
                    </>
                  )}
                  {currentProvider === 'google' && (
                    <>
                      <div>
                        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                          Model Type
                        </label>
                        <Input
                          value={providerMetadata.google?.modelType || ''}
                          onChange={(e) => updateProviderMetadata('google', 'modelType', e.target.value)}
                          placeholder="e.g., gemini-pro, gemini-ultra, palm"
                        />
                      </div>
                      <div>
                        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                          Tuning Support
                        </label>
                        <select
                          value={providerMetadata.google?.tuningSupport ? 'true' : 'false'}
                          onChange={(e) =>
                            updateProviderMetadata('google', 'tuningSupport', e.target.value === 'true')
                          }
                          className="flex h-11 w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2.5 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20 focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan transition-all duration-fast"
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tier Access Configuration */}
            <div>
              <h3 className="text-h5 font-semibold text-deep-navy-800 dark:text-white mb-3">
                Tier Access Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <TierSelect
                  label="Required Tier *"
                  value={requiredTier}
                  onChange={setRequiredTier}
                />
                <RestrictionModeSelect
                  label="Restriction Mode *"
                  value={restrictionMode}
                  onChange={setRestrictionMode}
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Allowed Tiers (for whitelist mode)
                </label>
                <div className="flex gap-3 flex-wrap">
                  {TIER_OPTIONS.map((tier) => (
                    <label
                      key={tier.value}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={allowedTiers.has(tier.value as SubscriptionTier)}
                        onChange={() => toggleAllowedTier(tier.value as SubscriptionTier)}
                        className="h-4 w-4 rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                      />
                      <TierBadge tier={tier.value as SubscriptionTier} size="sm" />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Reason for Changes */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Reason for Changes (Optional)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're making these changes..."
                rows={3}
              />
              <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                This will be logged for audit trail
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-deep-navy-800 border-t border-deep-navy-200 dark:border-deep-navy-700 px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default EditModelDialog;
