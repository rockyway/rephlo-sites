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
  creditsUsedInCurrentPeriod?: number; // Credits used in current billing period
}

export default function ManualCancelRefundModal({
  isOpen,
  onClose,
  onConfirm,
  subscription,
  defaultRefundAmount = 0,
  creditsUsedInCurrentPeriod = 0,
}: ManualCancelRefundModalProps) {
  // Calculate refund amount based on credit usage
  const calculateRefundAmount = (): number => {
    // Rule 1: If no credits used in current billing period → refund full amount
    if (creditsUsedInCurrentPeriod === 0) {
      return defaultRefundAmount;
    }

    // Rule 2: If credits were used → calculate prorated refund based on remaining days
    if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
      return defaultRefundAmount;
    }

    const now = new Date();
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);

    // Calculate days
    const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate prorated amount
    const proratedAmount = (daysRemaining / totalDays) * defaultRefundAmount;

    return Math.round(proratedAmount * 100) / 100; // Round to 2 decimal places
  };

  const calculatedRefundAmount = calculateRefundAmount();

  // Form state
  const [refundReason, setRefundReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState(calculatedRefundAmount);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation - Rule 3: Allow admin to input any amount > 0 and <= billing due (defaultRefundAmount)
  const isValid = refundReason.trim().length > 0 && refundAmount > 0 && refundAmount <= defaultRefundAmount;

  // Reset form
  const resetForm = () => {
    setRefundReason('');
    setAdminNotes('');
    setRefundAmount(calculatedRefundAmount);
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
    if (refundReason.trim().length === 0) {
      setError('Please provide a refund reason');
      return;
    }
    if (refundAmount <= 0) {
      setError('Refund amount must be greater than $0');
      return;
    }
    if (refundAmount > defaultRefundAmount) {
      setError(`Refund amount cannot exceed ${formatCurrency(defaultRefundAmount)} (last charge)`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
      <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-deep-navy-200 dark:border-deep-navy-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-deep-navy-200 dark:border-deep-navy-700">
          <h2 className="text-xl font-semibold text-deep-navy-900 dark:text-white">
            {showConfirmation
              ? 'Confirm Cancel & Refund'
              : 'Cancel Subscription with Refund'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-deep-navy-400 dark:text-deep-navy-500 hover:text-deep-navy-600 dark:hover:text-deep-navy-300 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 flex items-start gap-3">
              <AlertCircle className="text-red-400 dark:text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {!showConfirmation ? (
            // Form
            <>
              {/* Subscription Info */}
              <div className="bg-deep-navy-50 dark:bg-deep-navy-900/50 rounded-lg p-4 space-y-2 border border-deep-navy-200 dark:border-deep-navy-700">
                <h3 className="font-medium text-deep-navy-900 dark:text-white">Subscription Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-deep-navy-600 dark:text-deep-navy-300">Tier:</span>
                    <span className="ml-2 font-medium text-deep-navy-900 dark:text-deep-navy-100">
                      {subscription.tier}
                    </span>
                  </div>
                  <div>
                    <span className="text-deep-navy-600 dark:text-deep-navy-300">Status:</span>
                    <span className="ml-2 font-medium text-deep-navy-900 dark:text-deep-navy-100">
                      {subscription.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-deep-navy-600 dark:text-deep-navy-300">Monthly Price:</span>
                    <span className="ml-2 font-medium text-deep-navy-900 dark:text-deep-navy-100">
                      {formatCurrency(Number(subscription.basePriceUsd))}
                    </span>
                  </div>
                  <div>
                    <span className="text-deep-navy-600 dark:text-deep-navy-300">
                      {creditsUsedInCurrentPeriod === 0 ? 'Suggested Refund (Full):' : 'Suggested Refund (Prorated):'}
                    </span>
                    <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                      {formatCurrency(calculatedRefundAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Refund Reason (Required) */}
              <div>
                <label
                  htmlFor="refundReason"
                  className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1"
                >
                  Refund Reason <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <textarea
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Explain why this refund is being issued..."
                  className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-900 text-deep-navy-900 dark:text-deep-navy-100 placeholder:text-deep-navy-400 dark:placeholder:text-deep-navy-500 px-3 py-2 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                  rows={3}
                  maxLength={500}
                  required
                />
                <p className="mt-1 text-xs text-deep-navy-500 dark:text-deep-navy-400">
                  {refundReason.length}/500 characters
                </p>
              </div>

              {/* Admin Notes (Optional) */}
              <div>
                <label
                  htmlFor="adminNotes"
                  className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1"
                >
                  Admin Notes (Optional)
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes for tracking purposes..."
                  className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-900 text-deep-navy-900 dark:text-deep-navy-100 placeholder:text-deep-navy-400 dark:placeholder:text-deep-navy-500 px-3 py-2 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                  rows={2}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-deep-navy-500 dark:text-deep-navy-400">
                  {adminNotes.length}/500 characters
                </p>
              </div>

              {/* Refund Amount */}
              <div>
                <label
                  htmlFor="refundAmount"
                  className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1"
                >
                  Refund Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-deep-navy-500 dark:text-deep-navy-400">
                    $
                  </span>
                  <input
                    id="refundAmount"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="pl-8 w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-900 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 shadow-sm focus:border-rephlo-blue dark:focus:border-electric-cyan focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan"
                    min="0.01"
                    max={defaultRefundAmount}
                    step="0.01"
                  />
                </div>
                <p className="mt-1 text-xs text-deep-navy-500 dark:text-deep-navy-400">
                  Suggested: {formatCurrency(calculatedRefundAmount)} {creditsUsedInCurrentPeriod === 0 ? '(no credits used - full refund)' : '(prorated based on usage)'}.
                  You can enter any amount between $0.01 and {formatCurrency(defaultRefundAmount)} (last charge).
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-700 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-400 dark:text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
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
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-400 dark:text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
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

              <div className="bg-deep-navy-50 dark:bg-deep-navy-900/50 rounded-lg p-4 space-y-3 text-sm border border-deep-navy-200 dark:border-deep-navy-700">
                <div>
                  <span className="font-medium text-deep-navy-700 dark:text-deep-navy-200">Refund Reason:</span>
                  <p className="mt-1 text-deep-navy-900 dark:text-deep-navy-100">{refundReason}</p>
                </div>
                {adminNotes && (
                  <div>
                    <span className="font-medium text-deep-navy-700 dark:text-deep-navy-200">Admin Notes:</span>
                    <p className="mt-1 text-deep-navy-900 dark:text-deep-navy-100">{adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  This action cannot be undone. Are you sure you want to proceed?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-deep-navy-200 dark:border-deep-navy-700">
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
