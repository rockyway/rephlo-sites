import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * ConfirmationModal Component
 *
 * Confirmation dialog using Headless UI Dialog.
 * Features:
 * - Headless UI Dialog for accessibility
 * - Confirm/Cancel buttons with variant styles
 * - Focus trap when open
 * - Escape key closes (only if not loading)
 * - Backdrop click closes (only if not loading)
 * - Loading state disables buttons and prevents close
 * - Deep Navy theme
 * - Icons for different variants
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Prevent closing during processing
    if (isProcessing || loading) return;
    onCancel();
  };

  // Icon based on variant
  const Icon =
    confirmVariant === 'danger'
      ? AlertCircle
      : confirmVariant === 'warning'
        ? AlertTriangle
        : Info;

  // Button styles based on variant
  const confirmButtonClass = {
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
    warning:
      'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 disabled:bg-orange-400',
    primary:
      'bg-rephlo-blue text-white hover:bg-rephlo-blue/90 focus:ring-rephlo-blue disabled:bg-rephlo-blue/50',
  }[confirmVariant];

  // Icon color based on variant
  const iconColorClass = {
    danger: 'text-red-600 bg-red-100',
    warning: 'text-orange-600 bg-orange-100',
    primary: 'text-rephlo-blue bg-rephlo-blue/10',
  }[confirmVariant];

  const isLoading = isProcessing || loading;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={handleClose}
        static={isLoading}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-deep-navy-900/75 transition-opacity" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    {/* Icon */}
                    <div
                      className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${iconColorClass}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>

                    {/* Content */}
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-6 text-deep-navy-900"
                      >
                        {title}
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-deep-navy-600">{message}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-deep-navy-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={`inline-flex w-full justify-center items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:cursor-not-allowed ${confirmButtonClass}`}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {confirmText}
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-deep-navy-900 shadow-sm ring-1 ring-inset ring-deep-navy-300 hover:bg-deep-navy-50 sm:mt-0 sm:w-auto focus:outline-none focus:ring-2 focus:ring-deep-navy-500 focus:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConfirmationModal;
