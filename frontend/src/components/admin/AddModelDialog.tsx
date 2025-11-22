import { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Info, Sparkles } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import { cn } from '@/lib/utils';
import {
  MODEL_TEMPLATES,
  CAPABILITY_OPTIONS,
  TIER_OPTIONS,
  TIER_RESTRICTION_MODE_OPTIONS,
  calculateSeparateCreditsPerKTokens,
} from '@/data/modelTemplates';
import ParameterConstraintsEditor, {
  type ParameterConstraints,
} from './ParameterConstraintsEditor';

interface AddModelDialogProps {
  isOpen: boolean;
  onConfirm: (modelData: any) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * AddModelDialog Component
 *
 * Full-featured dialog for adding new models with predefined provider templates.
 * Implements the Model Creation workflow from docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md
 *
 * Features:
 * - Provider template selection (OpenAI, Anthropic, Google, Custom)
 * - Pre-filled defaults per provider
 * - Auto-calculation of creditsPer1kTokens from vendor pricing
 * - Multi-select capabilities
 * - Tier access configuration
 * - Provider-specific metadata
 * - Inline hints and validation
 */
function AddModelDialog({
  isOpen,
  onConfirm,
  onCancel,
  isSaving = false,
}: AddModelDialogProps) {
  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>('openai');

  // Core fields
  const [modelId, setModelId] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [provider, setProvider] = useState<string>('');

  // Meta fields
  const [displayName, setDisplayName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [contextLength, setContextLength] = useState<string>('');
  const [maxOutputTokens, setMaxOutputTokens] = useState<string>('');
  const [inputCost, setInputCost] = useState<string>('');
  const [outputCost, setOutputCost] = useState<string>('');
  const [inputCreditsPerK, setInputCreditsPerK] = useState<string>('');
  const [outputCreditsPerK, setOutputCreditsPerK] = useState<string>('');
  const [estimatedTotalPerK, setEstimatedTotalPerK] = useState<string>('');
  const [requiredTier, setRequiredTier] = useState<string>('');
  const [tierRestrictionMode, setTierRestrictionMode] = useState<'minimum' | 'exact' | 'whitelist'>('minimum');
  const [allowedTiers, setAllowedTiers] = useState<string[]>([]);

  // Provider metadata
  const [providerMeta, setProviderMeta] = useState<any>({});

  // Parameter constraints (Plans 203 & 205)
  const [parameterConstraints, setParameterConstraints] = useState<ParameterConstraints>({});

  // Internal fields
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [complianceTags, setComplianceTags] = useState<string>('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAutoCalculation, setShowAutoCalculation] = useState<boolean>(false);

  // Load template defaults when template changes
  useEffect(() => {
    if (!isOpen || !selectedTemplate) return;

    const template = MODEL_TEMPLATES[selectedTemplate];
    if (!template) return;

    // Set defaults from template
    setProvider(template.provider);
    setCapabilities(template.defaults.capabilities);
    setTierRestrictionMode(template.defaults.tierRestrictionMode as any);
    setRequiredTier(template.defaults.requiredTier);
    setAllowedTiers(template.defaults.allowedTiers);
    setProviderMeta(template.defaults.providerMetadata || {});
  }, [selectedTemplate, isOpen]);

  // Auto-calculate credits when pricing changes
  useEffect(() => {
    // Convert dollar amounts to cents
    const inputDollars = parseFloat(inputCost);
    const outputDollars = parseFloat(outputCost);

    // Convert to cents (multiply by 100)
    const inputCents = Math.round(inputDollars * 100);
    const outputCents = Math.round(outputDollars * 100);

    // Auto-calc requires valid costs (input can be free for some models)
    if (!isNaN(inputCents) && !isNaN(outputCents) && inputCents >= 0 && outputCents >= 0) {
      const result = calculateSeparateCreditsPerKTokens(inputCents, outputCents);
      setShowAutoCalculation(true);

      // Auto-fill calculated values
      setInputCreditsPerK(result.inputCreditsPerK.toString());
      setOutputCreditsPerK(result.outputCreditsPerK.toString());
      setEstimatedTotalPerK(result.estimatedTotalPerK.toString());
    } else {
      setShowAutoCalculation(false);
      setInputCreditsPerK('0');
      setOutputCreditsPerK('0');
      setEstimatedTotalPerK('0');
    }
  }, [inputCost, outputCost]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset to initial state
      setSelectedTemplate('openai');
      setModelId('');
      setModelName('');
      setDisplayName('');
      setDescription('');
      setVersion('');
      setContextLength('');
      setMaxOutputTokens('');
      setInputCost('');
      setOutputCost('');
      setInputCreditsPerK('');
      setOutputCreditsPerK('');
      setEstimatedTotalPerK('');
      setParameterConstraints({});
      setInternalNotes('');
      setComplianceTags('');
      setErrors({});
      setShowAutoCalculation(false);
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!modelId.trim()) newErrors.modelId = 'Model ID is required';
    if (!modelName.trim()) newErrors.modelName = 'Model name is required';
    if (!provider.trim()) newErrors.provider = 'Provider is required';
    if (!displayName.trim()) newErrors.displayName = 'Display name is required';
    if (capabilities.length === 0) newErrors.capabilities = 'Select at least one capability';
    if (!contextLength || parseInt(contextLength) <= 0) newErrors.contextLength = 'Context length must be positive';
    if (!inputCost || parseFloat(inputCost) < 0) newErrors.inputCost = 'Input cost must be non-negative';
    if (!outputCost || parseFloat(outputCost) < 0) newErrors.outputCost = 'Output cost must be non-negative';
    if (!inputCreditsPerK || parseInt(inputCreditsPerK) < 0) newErrors.inputCreditsPerK = 'Input credits must be non-negative';
    if (!outputCreditsPerK || parseInt(outputCreditsPerK) <= 0) newErrors.outputCreditsPerK = 'Output credits must be positive';
    if (!requiredTier) newErrors.requiredTier = 'Required tier is required';
    if (allowedTiers.length === 0) newErrors.allowedTiers = 'Select at least one allowed tier';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (!validateForm()) return;

    // Convert dollar amounts to cents for storage
    const inputDollars = parseFloat(inputCost);
    const outputDollars = parseFloat(outputCost);
    const inputCostInCents = Math.round(inputDollars * 100);
    const outputCostInCents = Math.round(outputDollars * 100);

    const modelData = {
      id: modelId.trim(),
      name: modelName.trim(),
      provider: provider.trim(),
      meta: {
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        version: version.trim() || undefined,
        capabilities,
        contextLength: parseInt(contextLength),
        maxOutputTokens: maxOutputTokens ? parseInt(maxOutputTokens) : undefined,
        inputCostPerMillionTokens: inputCostInCents,
        outputCostPerMillionTokens: outputCostInCents,
        inputCreditsPerK: parseInt(inputCreditsPerK),
        outputCreditsPerK: parseInt(outputCreditsPerK),
        creditsPer1kTokens: parseInt(estimatedTotalPerK), // DEPRECATED: For backward compatibility
        requiredTier,
        tierRestrictionMode,
        allowedTiers,
        providerMetadata: Object.keys(providerMeta).length > 0 ? providerMeta : undefined,
        parameterConstraints: Object.keys(parameterConstraints).length > 0 ? parameterConstraints : undefined,
        internalNotes: internalNotes.trim() || undefined,
        complianceTags: complianceTags.trim()
          ? complianceTags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : undefined,
      },
    };

    await onConfirm(modelData);
  };

  const handleCancel = () => {
    if (!isSaving) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSaving) {
      onCancel();
    }
  };

  // Toggle capability
  const toggleCapability = (cap: string) => {
    if (capabilities.includes(cap)) {
      setCapabilities(capabilities.filter((c) => c !== cap));
    } else {
      setCapabilities([...capabilities, cap]);
    }
  };

  // Toggle allowed tier
  const toggleAllowedTier = (tier: string) => {
    if (allowedTiers.includes(tier)) {
      setAllowedTiers(allowedTiers.filter((t) => t !== tier));
    } else {
      setAllowedTiers([...allowedTiers, tier]);
    }
  };

  const currentTemplate = useMemo(() => MODEL_TEMPLATES[selectedTemplate], [selectedTemplate]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl z-50',
            'w-full max-w-4xl max-h-[90vh] overflow-y-auto',
            'animate-scale-in'
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-deep-navy-800 border-b border-deep-navy-200 dark:border-deep-navy-700 p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                  Add New Model
                </Dialog.Title>
                <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                  Add a new LLM model to the system with zero downtime
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  className="text-deep-navy-400 dark:text-deep-navy-500 hover:text-deep-navy-600 dark:hover:text-deep-navy-300 transition-colors"
                  aria-label="Close"
                  disabled={isSaving}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Step 1: Template Selection */}
            <div className="bg-rephlo-blue/5 dark:bg-electric-cyan/5 border border-rephlo-blue/20 dark:border-electric-cyan/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-rephlo-blue dark:text-electric-cyan" />
                <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white">
                  Step 1: Select Provider Template
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(MODEL_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    disabled={isSaving}
                    className={cn(
                      'p-4 rounded-md border-2 transition-all',
                      selectedTemplate === key
                        ? 'border-rephlo-blue dark:border-electric-cyan bg-rephlo-blue/10 dark:bg-electric-cyan/10'
                        : 'border-deep-navy-200 dark:border-deep-navy-700 hover:border-deep-navy-300 dark:hover:border-deep-navy-600',
                      isSaving && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <p className="font-semibold text-deep-navy-900 dark:text-white">
                      {template.providerDisplayName}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Core Identity Fields */}
            <div>
              <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                Step 2: Core Identity
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Model ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="e.g., gpt-5, claude-opus-4-5"
                    disabled={isSaving}
                    error={!!errors.modelId}
                  />
                  {errors.modelId && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.modelId}</p>
                  )}
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Unique identifier (use provider naming convention)
                  </p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Internal Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., gpt-5"
                    disabled={isSaving}
                    error={!!errors.modelName}
                  />
                  {errors.modelName && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.modelName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder={`e.g., ${currentTemplate.provider}`}
                    disabled={isSaving}
                    error={!!errors.provider}
                  />
                  {errors.provider && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.provider}</p>
                  )}
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Provider slug (lowercase, e.g., "openai", "anthropic")
                  </p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={currentTemplate.hints.displayName}
                    disabled={isSaving}
                    error={!!errors.displayName}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.displayName}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={currentTemplate.hints.description}
                  rows={2}
                  disabled={isSaving}
                  maxLength={5000}
                />
              </div>

              <div className="mt-4">
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Version
                </label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 1.0, 2.5"
                  disabled={isSaving}
                  className="max-w-xs"
                />
              </div>
            </div>

            {/* Step 3: Capabilities */}
            <div>
              <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                Step 3: Capabilities <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {CAPABILITY_OPTIONS.map((cap) => (
                  <label
                    key={cap.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all',
                      capabilities.includes(cap.value)
                        ? 'border-rephlo-blue dark:border-electric-cyan bg-rephlo-blue/5 dark:bg-electric-cyan/5'
                        : 'border-deep-navy-200 dark:border-deep-navy-700 hover:border-deep-navy-300',
                      isSaving && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={capabilities.includes(cap.value)}
                      onChange={() => toggleCapability(cap.value)}
                      disabled={isSaving}
                      className="h-4 w-4 mt-0.5 rounded border-deep-navy-400 text-rephlo-blue focus:ring-rephlo-blue"
                    />
                    <div>
                      <p className="font-semibold text-deep-navy-900 dark:text-white">{cap.label}</p>
                      <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300">{cap.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.capabilities && (
                <p className="mt-2 text-caption text-red-600 dark:text-red-400">{errors.capabilities}</p>
              )}
            </div>

            {/* Step 4: Context & Pricing */}
            <div>
              <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                Step 4: Context & Pricing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Context Length <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(e.target.value)}
                    placeholder={currentTemplate.hints.contextLength}
                    disabled={isSaving}
                    error={!!errors.contextLength}
                  />
                  {errors.contextLength && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.contextLength}</p>
                  )}
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Max Output Tokens
                  </label>
                  <Input
                    type="number"
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(e.target.value)}
                    placeholder="Optional"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Input Cost (per 1M tokens in USD) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputCost}
                    onChange={(e) => setInputCost(e.target.value)}
                    placeholder="e.g., 1.25 for $1.25 per 1M tokens"
                    disabled={isSaving}
                    error={!!errors.inputCost}
                  />
                  {errors.inputCost && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.inputCost}</p>
                  )}
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Enter cost in dollars (e.g., 1.25 = $1.25, 0.25 = $0.25)
                  </p>
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Output Cost (per 1M tokens in USD) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={outputCost}
                    onChange={(e) => setOutputCost(e.target.value)}
                    placeholder="e.g., 10.00 for $10.00 per 1M tokens"
                    disabled={isSaving}
                    error={!!errors.outputCost}
                  />
                  {errors.outputCost && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.outputCost}</p>
                  )}
                  <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Enter cost in dollars (e.g., 10.00 = $10.00, 2.50 = $2.50)
                  </p>
                </div>

                <div className="col-span-2">
                  <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white mb-3">
                    Calculated Credits (Auto-filled) <span className="text-red-500">*</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                        Input Credits per 1K
                      </label>
                      <Input
                        type="number"
                        value={inputCreditsPerK}
                        onChange={(e) => setInputCreditsPerK(e.target.value)}
                        placeholder="Auto-calculated"
                        disabled={true}
                        error={!!errors.inputCreditsPerK}
                        className="bg-deep-navy-50 dark:bg-deep-navy-900"
                      />
                      {errors.inputCreditsPerK && (
                        <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.inputCreditsPerK}</p>
                      )}
                      <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                        Credits charged per 1K input tokens
                      </p>
                    </div>

                    <div>
                      <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                        Output Credits per 1K
                      </label>
                      <Input
                        type="number"
                        value={outputCreditsPerK}
                        onChange={(e) => setOutputCreditsPerK(e.target.value)}
                        placeholder="Auto-calculated"
                        disabled={true}
                        error={!!errors.outputCreditsPerK}
                        className="bg-deep-navy-50 dark:bg-deep-navy-900"
                      />
                      {errors.outputCreditsPerK && (
                        <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.outputCreditsPerK}</p>
                      )}
                      <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                        Credits charged per 1K output tokens
                      </p>
                    </div>

                    <div>
                      <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                        Estimated Total per 1K
                      </label>
                      <Input
                        type="number"
                        value={estimatedTotalPerK}
                        onChange={(e) => setEstimatedTotalPerK(e.target.value)}
                        placeholder="Auto-calculated"
                        disabled={true}
                        className="bg-deep-navy-50 dark:bg-deep-navy-900"
                      />
                      <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                        Typical usage (1:10 input:output ratio)
                      </p>
                    </div>
                  </div>
                  {showAutoCalculation && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-caption text-blue-800 dark:text-blue-200">
                        <p className="font-semibold mb-1">Credits auto-calculated with 2.5x margin:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Input: {inputCreditsPerK} credits per 1K tokens</li>
                          <li>Output: {outputCreditsPerK} credits per 1K tokens</li>
                          <li>Estimated total: {estimatedTotalPerK} credits per 1K tokens (based on typical 1:10 ratio)</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 5: Tier Access */}
            <div>
              <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                Step 5: Tier Access Control
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Required Tier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={requiredTier}
                    onChange={(e) => setRequiredTier(e.target.value)}
                    disabled={isSaving}
                    className={cn(
                      'flex h-10 w-full rounded-md border bg-white dark:bg-deep-navy-800 px-3 py-2 text-body',
                      'text-deep-navy-900 dark:text-deep-navy-100',
                      errors.requiredTier
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-deep-navy-300 dark:border-deep-navy-700',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20',
                      'transition-all duration-fast ease-out'
                    )}
                  >
                    <option value="">Select tier...</option>
                    {TIER_OPTIONS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                  {errors.requiredTier && (
                    <p className="mt-1 text-caption text-red-600 dark:text-red-400">{errors.requiredTier}</p>
                  )}
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Tier Restriction Mode
                  </label>
                  <select
                    value={tierRestrictionMode}
                    onChange={(e) => setTierRestrictionMode(e.target.value as any)}
                    disabled={isSaving}
                    className={cn(
                      'flex h-10 w-full rounded-md border bg-white dark:bg-deep-navy-800 px-3 py-2 text-body',
                      'text-deep-navy-900 dark:text-deep-navy-100',
                      'border-deep-navy-300 dark:border-deep-navy-700',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20',
                      'transition-all duration-fast ease-out'
                    )}
                  >
                    {TIER_RESTRICTION_MODE_OPTIONS.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                  Allowed Tiers <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIER_OPTIONS.map((tier) => (
                    <label
                      key={tier.value}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all',
                        allowedTiers.includes(tier.value)
                          ? 'border-rephlo-blue dark:border-electric-cyan bg-rephlo-blue/10 dark:bg-electric-cyan/10'
                          : 'border-deep-navy-200 dark:border-deep-navy-700 hover:border-deep-navy-300',
                        isSaving && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={allowedTiers.includes(tier.value)}
                        onChange={() => toggleAllowedTier(tier.value)}
                        disabled={isSaving}
                        className="h-4 w-4 rounded border-deep-navy-400 text-rephlo-blue focus:ring-rephlo-blue"
                      />
                      <span className="text-body-sm font-medium text-deep-navy-900 dark:text-white">
                        {tier.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.allowedTiers && (
                  <p className="mt-2 text-caption text-red-600 dark:text-red-400">{errors.allowedTiers}</p>
                )}
              </div>
            </div>

            {/* Step 6: Admin Metadata */}
            <div>
              <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                Step 6: Admin Metadata (Optional)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Internal Notes
                  </label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="e.g., Released 2025-11-12, high demand expected"
                    rows={3}
                    disabled={isSaving}
                    maxLength={5000}
                  />
                </div>

                <div>
                  <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                    Compliance Tags
                  </label>
                  <Input
                    value={complianceTags}
                    onChange={(e) => setComplianceTags(e.target.value)}
                    placeholder="e.g., SOC2, GDPR, HIPAA (comma-separated)"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Step 7: Parameter Constraints (Plans 203 & 205) */}
            <div>
              <h3 className="text-h4 font-semibold text-deep-navy-800 dark:text-white mb-4">
                Step 7: Parameter Constraints (Optional)
              </h3>
              <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mb-4">
                Configure allowed parameter ranges and restrictions for this model (e.g., temperature limits, mutually exclusive parameters).
                These constraints will be validated when users make API requests.
              </p>
              <ParameterConstraintsEditor
                provider={provider}
                constraints={parameterConstraints}
                onChange={setParameterConstraints}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-deep-navy-800 border-t border-deep-navy-200 dark:border-deep-navy-700 p-6">
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSaving}
                className="bg-rephlo-blue hover:bg-rephlo-blue/90 dark:bg-electric-cyan dark:hover:bg-electric-cyan/90"
              >
                {isSaving ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Creating Model...
                  </>
                ) : (
                  'Create Model'
                )}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default AddModelDialog;
