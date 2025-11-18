import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
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

interface UsageStats {
  activeUsers: number;
  requestsLast30Days: number;
}

interface ArchiveDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  usageStats?: UsageStats;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * ArchiveDialog Component
 *
 * Modal for archiving a model with required reason and confirmation.
 * Shows usage statistics as a warning if available.
 *
 * Validation Rules:
 * - Reason is required (max 500 characters)
 * - User must type model ID exactly to confirm
 */
function ArchiveDialog({
  isOpen,
  model,
  usageStats,
  onConfirm,
  onCancel,
  isSaving = false,
}: ArchiveDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [errors, setErrors] = useState<{
    reason?: string;
    confirmation?: string;
  }>({});

  // Reset form when dialog opens/closes or model changes
  useEffect(() => {
    if (isOpen && model) {
      setReason('');
      setConfirmationInput('');
      setErrors({});
    }
  }, [isOpen, model]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate reason
    if (reason.trim() === '') {
      newErrors.reason = 'Reason is required';
    } else if (reason.trim().length > 500) {
      newErrors.reason = 'Reason must be 500 characters or less';
    }

    // Validate confirmation
    if (confirmationInput.trim() !== model?.id) {
      newErrors.confirmation = `Please type "${model?.id}" to confirm`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
    if (!model) return;

    await onConfirm(reason.trim());
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
    reason.trim() !== '' &&
    reason.trim().length <= 500 &&
    confirmationInput.trim() === model?.id &&
    !isSaving;

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
              <Dialog.Title className="text-h3 font-semibold text-deep-navy-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
                Archive Model
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
            {/* Warning Message */}
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-body-sm font-semibold text-red-900 dark:text-red-100">
                    Warning: This action will remove the model from all public endpoints
                  </p>
                  <p className="text-body-sm text-red-800 dark:text-red-200 mt-1">
                    Archiving this model will make it unavailable to all users. Existing API
                    requests using this model will fail. This action can be reversed by
                    unarchiving the model.
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Statistics (if available) */}
            {usageStats && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                <p className="text-body-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Current Usage Statistics
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-caption text-amber-800 dark:text-amber-200">
                      Active Users
                    </p>
                    <p className="text-h3 font-semibold text-amber-900 dark:text-amber-100">
                      {usageStats.activeUsers.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-amber-800 dark:text-amber-200">
                      Requests (Last 30 Days)
                    </p>
                    <p className="text-h3 font-semibold text-amber-900 dark:text-amber-100">
                      {usageStats.requestsLast30Days.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-caption text-amber-800 dark:text-amber-200 mt-3">
                  This model has significant active usage. Please ensure users are notified
                  before archiving.
                </p>
              </div>
            )}

            {/* Reason Field */}
            <div>
              <label
                htmlFor="archive-reason"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                Reason for Archiving <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="archive-reason"
                value={reason}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 500) {
                    setReason(value);
                    // Clear error when user starts typing
                    if (errors.reason) {
                      setErrors((prev) => ({ ...prev, reason: undefined }));
                    }
                  }
                }}
                placeholder="Explain why this model is being archived..."
                rows={4}
                disabled={isSaving}
                maxLength={500}
                className={errors.reason ? 'border-red-500' : ''}
              />
              <div className="mt-1 flex justify-between items-center">
                {errors.reason ? (
                  <p className="text-caption text-red-600 dark:text-red-400">
                    {errors.reason}
                  </p>
                ) : (
                  <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300">
                    Required for audit trail
                  </p>
                )}
                <p className="text-caption text-deep-navy-600 dark:text-deep-navy-300">
                  {reason.length}/500
                </p>
              </div>
            </div>

            {/* Confirmation Input */}
            <div>
              <label
                htmlFor="confirmation-input"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                Type <code className="px-1.5 py-0.5 bg-deep-navy-100 dark:bg-deep-navy-700 rounded text-rephlo-blue dark:text-electric-cyan">{model.id}</code> to confirm{' '}
                <span className="text-red-500">*</span>
              </label>
              <Input
                id="confirmation-input"
                type="text"
                value={confirmationInput}
                onChange={(e) => {
                  setConfirmationInput(e.target.value);
                  // Clear error when user starts typing
                  if (errors.confirmation) {
                    setErrors((prev) => ({ ...prev, confirmation: undefined }));
                  }
                }}
                placeholder={`Type "${model.id}" to confirm`}
                disabled={isSaving}
                error={!!errors.confirmation}
              />
              {errors.confirmation && (
                <p className="mt-1 text-caption text-red-600 dark:text-red-400">
                  {errors.confirmation}
                </p>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md p-3">
              <p className="text-caption text-deep-navy-700 dark:text-deep-navy-300">
                <strong>Note:</strong> You can unarchive this model later if needed. Legacy
                status will be preserved if the model was previously marked as legacy.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-deep-navy-200 dark:border-deep-navy-700">
            <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isFormValid}
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Archiving...
                </>
              ) : (
                'Archive Model'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ArchiveDialog;
