import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Button from '@/components/common/Button';
import TierSelect from './TierSelect';
import RestrictionModeSelect from './RestrictionModeSelect';
import TierBadge from './TierBadge';
import Textarea from '@/components/common/Textarea';
import { cn } from '@/lib/utils';
import type {
  ModelTierInfo,
  TierRestrictionMode,
} from '@/types/model-tier';
import { SubscriptionTier } from '@rephlo/shared-types';

interface ModelTierEditDialogProps {
  model: ModelTierInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    modelId: string,
    updates: {
      requiredTier?: SubscriptionTier;
      tierRestrictionMode?: TierRestrictionMode;
      allowedTiers?: SubscriptionTier[];
      reason?: string;
    }
  ) => Promise<void>;
  isSaving?: boolean;
}

/**
 * ModelTierEditDialog Component
 *
 * Modal dialog for editing a model's tier configuration.
 * Shows previous values for reference and requires a reason for the change.
 */
function ModelTierEditDialog({
  model,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}: ModelTierEditDialogProps) {
  const [requiredTier, setRequiredTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [restrictionMode, setRestrictionMode] =
    useState<TierRestrictionMode>('minimum');
  const [allowedTiers, setAllowedTiers] = useState<Set<SubscriptionTier>>(
    new Set([SubscriptionTier.FREE, SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS, SubscriptionTier.PRO_MAX, SubscriptionTier.ENTERPRISE_PRO, SubscriptionTier.ENTERPRISE_PRO_PLUS])
  );
  const [reason, setReason] = useState('');

  // Reset form when model changes
  useEffect(() => {
    if (model) {
      setRequiredTier(model.requiredTier);
      setRestrictionMode(model.tierRestrictionMode);
      setAllowedTiers(new Set(model.allowedTiers));
      setReason('');
    }
  }, [model]);

  const handleSave = async () => {
    if (!model) return;

    const updates: {
      requiredTier?: SubscriptionTier;
      tierRestrictionMode?: TierRestrictionMode;
      allowedTiers?: SubscriptionTier[];
      reason?: string;
    } = {};

    // Only include changed fields
    if (requiredTier !== model.requiredTier) {
      updates.requiredTier = requiredTier;
    }
    if (restrictionMode !== model.tierRestrictionMode) {
      updates.tierRestrictionMode = restrictionMode;
    }
    const currentAllowedTiers = Array.from(allowedTiers).sort();
    const originalAllowedTiers = [...model.allowedTiers].sort();
    if (JSON.stringify(currentAllowedTiers) !== JSON.stringify(originalAllowedTiers)) {
      updates.allowedTiers = currentAllowedTiers;
    }
    if (reason.trim()) {
      updates.reason = reason.trim();
    }

    await onSave(model.id, updates);
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

  const hasChanges =
    model &&
    (requiredTier !== model.requiredTier ||
      restrictionMode !== model.tierRestrictionMode ||
      JSON.stringify(Array.from(allowedTiers).sort()) !==
        JSON.stringify([...model.allowedTiers].sort()));

  if (!model) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl z-50',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
            'animate-scale-in'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-deep-navy-200 dark:border-deep-navy-700">
            <div>
              <Dialog.Title className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                Edit Model Tier
              </Dialog.Title>
              <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                {model.displayName} ({model.provider})
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
            {/* Previous Values Reference */}
            <div className="bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md p-4 space-y-2">
              <p className="text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                Current Configuration:
              </p>
              <div className="grid grid-cols-3 gap-4 text-body-sm">
                <div>
                  <span className="text-deep-navy-700 dark:text-deep-navy-300">Required Tier:</span>
                  <div className="mt-1">
                    <TierBadge tier={model.requiredTier} size="sm" />
                  </div>
                </div>
                <div>
                  <span className="text-deep-navy-700 dark:text-deep-navy-300">Mode:</span>
                  <p className="mt-1 font-medium text-deep-navy-800 dark:text-white">
                    {model.tierRestrictionMode}
                  </p>
                </div>
                <div>
                  <span className="text-deep-navy-700 dark:text-deep-navy-300">Allowed Tiers:</span>
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {model.allowedTiers.map((tier, idx) => (
                      <TierBadge key={`${model.id}-current-${tier}-${idx}`} tier={tier} size="sm" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Required Tier */}
            <div>
              <TierSelect
                label="Required Tier"
                value={requiredTier}
                onChange={setRequiredTier}
              />
            </div>

            {/* Restriction Mode */}
            <div>
              <RestrictionModeSelect
                label="Restriction Mode"
                value={restrictionMode}
                onChange={setRestrictionMode}
              />
            </div>

            {/* Allowed Tiers (for whitelist mode) */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                Allowed Tiers (for whitelist mode)
              </label>
              <div className="flex gap-3 flex-wrap">
                {(['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'] as SubscriptionTier[]).map(
                  (tier) => (
                    <label
                      key={tier}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={allowedTiers.has(tier)}
                        onChange={() => toggleAllowedTier(tier)}
                        className="h-4 w-4 rounded border-deep-navy-300 dark:border-deep-navy-600 text-rephlo-blue focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                      />
                      <TierBadge tier={tier} size="sm" />
                    </label>
                  )
                )}
              </div>
              {restrictionMode === 'whitelist' && allowedTiers.size === 0 && (
                <p className="mt-1 text-caption text-red-600 dark:text-red-400">
                  At least one tier must be selected for whitelist mode
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Reason for Change (optional)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're making this change..."
                rows={3}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-deep-navy-200 dark:border-deep-navy-700">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !hasChanges ||
                isSaving ||
                (restrictionMode === 'whitelist' && allowedTiers.size === 0)
              }
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ModelTierEditDialog;
