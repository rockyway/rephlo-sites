import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ArchiveRestore } from 'lucide-react';
import Button from '@/components/common/Button';
import { cn } from '@/lib/utils';

interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
}

interface UnarchiveDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * UnarchiveDialog Component
 *
 * Simple confirmation modal for restoring an archived model.
 * Informs the user that legacy status will be preserved if the model
 * was previously marked as legacy.
 */
function UnarchiveDialog({
  isOpen,
  model,
  onConfirm,
  onCancel,
  isSaving = false,
}: UnarchiveDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  // Reset confirmation when dialog opens/closes or model changes
  useEffect(() => {
    if (isOpen && model) {
      setIsConfirmed(false);
    }
  }, [isOpen, model]);

  const handleConfirm = async () => {
    if (!isConfirmed || isSaving) return;
    await onConfirm();
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

  if (!model) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl z-50',
            'w-full max-w-lg max-h-[90vh] overflow-y-auto',
            'animate-scale-in'
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-deep-navy-200 dark:border-deep-navy-700">
            <div>
              <Dialog.Title className="text-h3 font-semibold text-deep-navy-800 dark:text-white flex items-center gap-2">
                <ArchiveRestore className="h-5 w-5 text-green-600 dark:text-green-400" />
                Unarchive Model
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
            {/* Info Message */}
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex gap-3">
                <ArchiveRestore className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-body-sm font-semibold text-green-900 dark:text-green-100">
                    This will restore the model to active availability
                  </p>
                  <p className="text-body-sm text-green-800 dark:text-green-200 mt-1">
                    The model will become available again in all public endpoints and users
                    will be able to make requests using this model.
                  </p>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-deep-navy-50 dark:bg-deep-navy-900 rounded-md p-4">
              <p className="text-body-sm font-medium text-deep-navy-800 dark:text-deep-navy-100 mb-2">
                Important Notes:
              </p>
              <ul className="space-y-2 text-body-sm text-deep-navy-700 dark:text-deep-navy-300">
                <li className="flex items-start gap-2">
                  <span className="text-rephlo-blue dark:text-electric-cyan mt-1">•</span>
                  <span>
                    Legacy status will be <strong>preserved</strong> if the model was
                    previously marked as legacy
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rephlo-blue dark:text-electric-cyan mt-1">•</span>
                  <span>
                    All tier access configurations will remain unchanged
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rephlo-blue dark:text-electric-cyan mt-1">•</span>
                  <span>
                    This action will be logged in the audit trail
                  </span>
                </li>
              </ul>
            </div>

            {/* Confirmation Checkbox */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 mt-0.5 rounded border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:cursor-not-allowed"
                />
                <div>
                  <p className="text-body-sm font-medium text-blue-900 dark:text-blue-100">
                    I understand this will make the model available to all users
                  </p>
                  <p className="text-caption text-blue-800 dark:text-blue-200 mt-1">
                    Users will be able to access this model through the API immediately
                    after unarchiving.
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
              disabled={!isConfirmed || isSaving}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Unarchiving...
                </>
              ) : (
                'Unarchive Model'
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default UnarchiveDialog;
