import React, { Fragment, useState, FormEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export interface FormModalProps<T = any> {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (data: T) => void | Promise<void>;
  children: React.ReactNode;
  submitText?: string;
  loading?: boolean;
  error?: string;
}

/**
 * FormModal Component
 *
 * Generic form modal with validation support.
 * Features:
 * - Headless UI Dialog for accessibility
 * - Form submission handler
 * - Error message display
 * - Loading spinner on submit button
 * - Focus trap when open
 * - Escape key closes (not during loading)
 * - Deep Navy theme
 * - Children render form fields
 */
function FormModal<T = any>({
  isOpen,
  title,
  onClose,
  onSubmit,
  children,
  submitText = 'Submit',
  loading = false,
  error,
}: FormModalProps<T>) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Extract form data
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as T;

    setIsProcessing(true);
    try {
      await onSubmit(data);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Prevent closing during processing
    if (isProcessing || loading) return;
    onClose();
  };

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
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-deep-navy-200">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-deep-navy-900"
                  >
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="rounded-lg p-1 hover:bg-deep-navy-100 transition-colors focus:outline-none focus:ring-2 focus:ring-rephlo-blue disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-deep-navy-600" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  {/* Body */}
                  <div className="px-6 py-4">
                    {/* Error message */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700">{error}</div>
                      </div>
                    )}

                    {/* Form fields (children) */}
                    <div className="space-y-4">{children}</div>
                  </div>

                  {/* Footer */}
                  <div className="bg-deep-navy-50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-deep-navy-700 bg-white border border-deep-navy-300 rounded-lg hover:bg-deep-navy-50 focus:outline-none focus:ring-2 focus:ring-deep-navy-500 focus:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rephlo-blue rounded-lg hover:bg-rephlo-blue/90 focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:bg-rephlo-blue/50"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {submitText}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export default FormModal;
