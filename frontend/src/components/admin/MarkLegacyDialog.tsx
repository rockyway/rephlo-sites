import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import { cn } from '@/lib/utils';

interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
}

interface MarkLegacyDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  availableModels: ModelInfo[];
  onConfirm: (data: {
    replacementModelId?: string;
    deprecationNotice?: string;
    sunsetDate?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * MarkLegacyDialog Component
 *
 * Modal for marking a model as legacy with optional replacement model,
 * deprecation notice, and sunset date configuration.
 *
 * Validation Rules:
 * - At least one field must be filled (replacement, notice, or sunset date)
 * - Sunset date must be in the future if provided
 * - User must check confirmation before proceeding
 */
function MarkLegacyDialog({
  isOpen,
  model,
  availableModels,
  onConfirm,
  onCancel,
  isSaving = false,
}: MarkLegacyDialogProps) {
  const [replacementModelId, setReplacementModelId] = useState<string>('');
  const [deprecationNotice, setDeprecationNotice] = useState<string>('');
  const [sunsetDate, setSunsetDate] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    sunsetDate?: string;
    form?: string;
  }>({});

  // Reset form when dialog opens/closes or model changes
  useEffect(() => {
    if (isOpen && model) {
      setReplacementModelId('');
      setDeprecationNotice('');
      setSunsetDate('');
      setIsConfirmed(false);
      setErrors({});
    }
  }, [isOpen, model]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // At least one field must be filled
    const hasData =
      replacementModelId.trim() !== '' ||
      deprecationNotice.trim() !== '' ||
      sunsetDate.trim() !== '';

    if (!hasData) {
      newErrors.form = 'Please provide at least one of: replacement model, deprecation notice, or sunset date';
      setErrors(newErrors);
      return false;
    }

    // Validate sunset date is in the future
    if (sunsetDate.trim() !== '') {
      const selectedDate = new Date(sunsetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only

      if (selectedDate < today) {
        newErrors.sunsetDate = 'Sunset date must be in the future';
        setErrors(newErrors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    if (!isConfirmed) return;

    const data: {
      replacementModelId?: string;
      deprecationNotice?: string;
      sunsetDate?: string;
    } = {};

    if (replacementModelId.trim()) {
      data.replacementModelId = replacementModelId.trim();
    }
    if (deprecationNotice.trim()) {
      data.deprecationNotice = deprecationNotice.trim();
    }
    if (sunsetDate.trim()) {
      data.sunsetDate = sunsetDate.trim();
    }

    await onConfirm(data);
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

  const isFormValid =
    validateForm() && isConfirmed && !isSaving;

  // Filter out the current model from replacement options
  const replacementOptions = availableModels.filter(
    (m) => m.id !== model?.id
  );

  if (!model) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl z-50',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
            'animate-scale-in'
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-deep-navy-200 dark:border-deep-navy-700">
            <div>
              <Dialog.Title className="text-h3 font-semibold text-deep-navy-800 dark:text-white">
                Mark Model as Legacy
              </Dialog.Title>
              <p className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200 mt-1">
                {model.displayName} ({model.provider})
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

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Form Error */}
            {errors.form && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-body-sm text-red-700 dark:text-red-400">
                  {errors.form}
                </p>
              </div>
            )}

            {/* Replacement Model */}
            <div>
              <label
                htmlFor="replacement-model"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                Replacement Model (Optional)
              </label>
              <select
                id="replacement-model"
                value={replacementModelId}
                onChange={(e) => setReplacementModelId(e.target.value)}
                disabled={isSaving}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-white dark:bg-deep-navy-800 px-3 py-2 text-body',
                  'text-deep-navy-900 dark:text-deep-navy-100',
                  'border-deep-navy-300 dark:border-deep-navy-700',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20',
                  'focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan',
                  'transition-all duration-fast ease-out',
                  'disabled:cursor-not-allowed disabled:bg-deep-navy-100 dark:disabled:bg-deep-navy-900',
                  'disabled:text-deep-navy-500'
                )}
              >
                <option value="">Select a replacement model...</option>
                {replacementOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} ({m.provider})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                Suggest an alternative model for users to migrate to
              </p>
            </div>

            {/* Deprecation Notice */}
            <div>
              <label
                htmlFor="deprecation-notice"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                Deprecation Notice (Optional)
              </label>
              <Textarea
                id="deprecation-notice"
                value={deprecationNotice}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 1000) {
                    setDeprecationNotice(value);
                  }
                }}
                placeholder="Enter a message to inform users about this deprecation..."
                rows={4}
                disabled={isSaving}
                maxLength={1000}
              />
              <div className="mt-1 flex justify-between items-center">
                <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300">
                  Provide context about why this model is being deprecated
                </p>
                <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300">
                  {deprecationNotice.length}/1000
                </p>
              </div>
            </div>

            {/* Sunset Date */}
            <div>
              <label
                htmlFor="sunset-date"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                Sunset Date (Optional)
              </label>
              <Input
                id="sunset-date"
                type="date"
                value={sunsetDate}
                onChange={(e) => setSunsetDate(e.target.value)}
                disabled={isSaving}
                error={!!errors.sunsetDate}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.sunsetDate && (
                <p className="mt-1 text-caption text-red-600 dark:text-red-400">
                  {errors.sunsetDate}
                </p>
              )}
              {!errors.sunsetDate && (
                <p className="mt-1 text-caption text-deep-navy-600 dark:text-deep-navy-300">
                  Date when this model will be fully removed
                </p>
              )}
            </div>

            {/* Confirmation Checkbox */}
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 mt-0.5 rounded border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-500 focus:ring-amber-500 dark:focus:ring-amber-400 disabled:cursor-not-allowed"
                />
                <div>
                  <p className="text-body-sm font-medium text-amber-900 dark:text-amber-100">
                    I understand this will warn users
                  </p>
                  <p className="text-caption text-amber-800 dark:text-amber-200 mt-1">
                    Marking this model as legacy will show deprecation warnings to all users
                    who attempt to use it. This action will be logged in the audit trail.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-deep-navy-200 dark:border-deep-navy-700">
            <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isFormValid}
              className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Marking as Legacy...
                </>
              ) : (
                'Mark as Legacy'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MarkLegacyDialog;
