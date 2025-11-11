/**
 * ConfirmationModal Component
 *
 * Generic modal for destructive actions (ban, cancel, void, etc.)
 */

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from '@/components/common/Button';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  variant?: 'danger' | 'warning' | 'info';
  isProcessing?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Enter reason...',
  variant = 'danger',
  isProcessing = false,
}: ConfirmationModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('Reason is required');
      return;
    }

    try {
      await onConfirm(requireReason ? reason : undefined);
      setReason('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setReason('');
      setError('');
      onClose();
    }
  };

  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      bg: 'bg-red-50',
      button: 'destructive' as const,
    },
    warning: {
      icon: 'text-amber-600',
      bg: 'bg-amber-50',
      button: 'primary' as const,
    },
    info: {
      icon: 'text-blue-600',
      bg: 'bg-blue-50',
      button: 'primary' as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-deep-navy-200">
            <div className="flex items-start gap-4">
              <div className={cn('p-2 rounded-full', styles.bg)}>
                <AlertTriangle className={cn('h-6 w-6', styles.icon)} />
              </div>
              <div>
                <h2 className="text-h3 font-semibold text-deep-navy-800">
                  {title}
                </h2>
                <p className="text-body text-deep-navy-600 mt-1">
                  {description}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-deep-navy-400 hover:text-deep-navy-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {requireReason && (
              <div className="mb-4">
                <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                  {reasonLabel} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError('');
                  }}
                  placeholder={reasonPlaceholder}
                  disabled={isProcessing}
                  className={cn(
                    'w-full px-3 py-2 border rounded-md shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue',
                    'disabled:bg-gray-50 disabled:text-gray-500',
                    error ? 'border-red-300' : 'border-deep-navy-300'
                  )}
                  rows={3}
                />
                {error && (
                  <p className="mt-1 text-caption text-red-600">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 py-4 bg-deep-navy-50 border-t border-deep-navy-200">
            <Button
              onClick={handleClose}
              variant="ghost"
              disabled={isProcessing}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              variant={styles.button}
              disabled={isProcessing || (requireReason && !reason.trim())}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
