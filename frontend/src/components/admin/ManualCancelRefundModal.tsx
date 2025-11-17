/**
 * Manual Cancel with Refund Modal
 *
 * Modal for manually cancelling a subscription and issuing a refund
 * - Input refund reason (required)
 * - Input admin notes (optional)
 * - Specify refund amount (defaults to last charge)
 * - Confirmation step
 *
 * Reference: docs/plan/192-subscription-billing-refund-system.md
 */

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import type { Subscription } from '@rephlo/shared-types';
import type { ManualCancelRefundRequest } from '@/types/plan109.types';
import { formatCurrency } from '@/lib/plan109.utils';

interface ManualCancelRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ManualCancelRefundRequest) => Promise<void>;
  subscription: Subscription;
  defaultRefundAmount?: number; // Last charge amount
}

export default function ManualCancelRefundModal({
  isOpen,
  onClose,
  onConfirm,
  subscription,
  defaultRefundAmount = 0,
}: ManualCancelRefundModalProps) {
  // Form state
  const [refundReason, setRefundReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState(defaultRefundAmount);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isValid = refundReason.trim().length > 0 && refundAmount >= 0;

  // Reset form
  const resetForm = () => {
    setRefundReason('');
    setAdminNotes('');
    setRefundAmount(defaultRefundAmount);
    setShowConfirmation(false);
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  // Handle submit (show confirmation)
  const handleSubmit = () => {
    if (!isValid) {
      setError('Please provide a refund reason');
      return;
    }
    setShowConfirmation(true);
  };

  // Handle confirm (actual submission)
  const handleConfirm = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data: ManualCancelRefundRequest = {
        subscriptionId: subscription.id,
        refundReason: refundReason.trim(),
        adminNotes: adminNotes.trim() || undefined,
        refundAmount: refundAmount > 0 ? refundAmount : undefined,
      };

      await onConfirm(data);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {showConfirmation
              ? 'Confirm Cancel & Refund'
              : 'Cancel Subscription with Refund'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {!showConfirmation ? (
            // Form
            <>
              {/* Subscription Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-gray-900">Subscription Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tier:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {subscription.tier}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {subscription.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Price:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatCurrency(Number(subscription.basePriceUsd))}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Charge:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatCurrency(defaultRefundAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Refund Reason (Required) */}
              <div>
                <label
                  htmlFor="refundReason"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Refund Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Explain why this refund is being issued..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  maxLength={500}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {refundReason.length}/500 characters
                </p>
              </div>

              {/* Admin Notes (Optional) */}
              <div>
                <label
                  htmlFor="adminNotes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Admin Notes (Optional)
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes for tracking purposes..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={2}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {adminNotes.length}/500 characters
                </p>
              </div>

              {/* Refund Amount */}
              <div>
                <label
                  htmlFor="refundAmount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Refund Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    id="refundAmount"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="pl-8 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Default: {formatCurrency(defaultRefundAmount)} (last charge). Leave at 0
                  to refund the full last charge amount.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">Warning</p>
                    <p className="mt-1">
                      This action will immediately cancel the subscription and issue a
                      refund through Stripe. This cannot be undone. The user will receive
                      an email notification.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Confirmation
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Please confirm the following action:</p>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>
                        Cancel subscription: {subscription.tier} (
                        {formatCurrency(Number(subscription.basePriceUsd))}/month)
                      </li>
                      <li>
                        Issue refund: {formatCurrency(refundAmount || defaultRefundAmount)}
                      </li>
                      <li>Process through Stripe (estimated time: 5-10 business days)</li>
                      <li>Send notification email to user</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Refund Reason:</span>
                  <p className="mt-1 text-gray-900">{refundReason}</p>
                </div>
                {adminNotes && (
                  <div>
                    <span className="font-medium text-gray-700">Admin Notes:</span>
                    <p className="mt-1 text-gray-900">{adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700 font-medium">
                  This action cannot be undone. Are you sure you want to proceed?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          {!showConfirmation ? (
            <>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
              >
                Continue to Confirmation
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
              >
                Go Back
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Cancel & Refund'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
