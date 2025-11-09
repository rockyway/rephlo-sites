/**
 * ProrationCalculationModal Component
 *
 * Modal showing full proration math breakdown with step-by-step calculation
 */

import { X as XIcon, ExternalLink } from 'lucide-react';
import { ProrationCalculationBreakdown } from '@/types/plan110.types';
import { getTierDisplayName, formatDate } from '@/lib/plan110.utils';
import { formatCurrency } from '@/lib/plan109.utils';
import Button from '@/components/common/Button';

interface ProrationCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: ProrationCalculationBreakdown;
}

export default function ProrationCalculationModal({
  isOpen,
  onClose,
  calculation,
}: ProrationCalculationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-deep-navy-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-h3 font-bold text-deep-navy-800">Proration Calculation Details</h2>
            <button
              onClick={onClose}
              className="text-deep-navy-400 hover:text-deep-navy-600 transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Summary */}
            <div className="bg-deep-navy-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-body text-deep-navy-600">Original Tier:</span>
                <span className="text-body font-medium text-deep-navy-800">
                  {getTierDisplayName(calculation.originalTier)} ({formatCurrency(calculation.originalPrice)}/
                  {calculation.billingCycle === 30 ? 'mo' : 'yr'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-deep-navy-600">New Tier:</span>
                <span className="text-body font-medium text-deep-navy-800">
                  {getTierDisplayName(calculation.newTier)} ({formatCurrency(calculation.newPrice)}/
                  {calculation.billingCycle === 30 ? 'mo' : 'yr'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-deep-navy-600">Billing Cycle:</span>
                <span className="text-body font-medium text-deep-navy-800">
                  {calculation.billingCycle} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-deep-navy-600">Change Date:</span>
                <span className="text-body font-medium text-deep-navy-800">
                  {formatDate(calculation.changeDate)} ({calculation.daysRemaining} days remaining)
                </span>
              </div>
            </div>

            {/* Calculation Steps */}
            <div className="space-y-4">
              <h3 className="text-h4 font-semibold text-deep-navy-800">Calculation:</h3>

              {/* Step 1: Unused Credit */}
              <div className="border border-deep-navy-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body font-medium text-deep-navy-700">1. Unused credit from old tier</h4>
                  <span className="text-h4 font-bold text-green-600">
                    {formatCurrency(calculation.steps.unusedCredit.amount)}
                  </span>
                </div>
                <div className="text-body-sm text-deep-navy-600 font-mono bg-deep-navy-50 p-3 rounded">
                  {calculation.steps.unusedCredit.calculation}
                </div>
              </div>

              {/* Step 2: New Tier Cost */}
              <div className="border border-deep-navy-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body font-medium text-deep-navy-700">2. New tier prorated cost</h4>
                  <span className="text-h4 font-bold text-rephlo-blue">
                    {formatCurrency(calculation.steps.newTierCost.amount)}
                  </span>
                </div>
                <div className="text-body-sm text-deep-navy-600 font-mono bg-deep-navy-50 p-3 rounded">
                  {calculation.steps.newTierCost.calculation}
                </div>
              </div>

              {/* Step 3: Net Charge */}
              <div className="border-2 border-rephlo-blue rounded-lg p-4 bg-rephlo-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-body font-semibold text-deep-navy-800">3. Net charge to user</h4>
                  <span className="text-h3 font-bold text-rephlo-blue">
                    {formatCurrency(Math.abs(calculation.steps.netCharge.amount))}
                  </span>
                </div>
                <div className="text-body-sm text-deep-navy-700 font-mono bg-white p-3 rounded">
                  {calculation.steps.netCharge.calculation}
                </div>
                <div className="mt-3 text-body-sm text-deep-navy-600">
                  {calculation.steps.netCharge.amount > 0 ? (
                    <span className="text-green-600 font-medium">User will be charged today</span>
                  ) : calculation.steps.netCharge.amount < 0 ? (
                    <span className="text-red-600 font-medium">User will receive credit</span>
                  ) : (
                    <span className="text-gray-600 font-medium">No charge or credit</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stripe Invoice */}
            {calculation.stripeInvoiceUrl && (
              <div className="border-t border-deep-navy-200 pt-4">
                <a
                  href={calculation.stripeInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-body text-rephlo-blue hover:text-rephlo-blue-600"
                >
                  View Stripe Invoice
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Status */}
            <div className="border-t border-deep-navy-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-body text-deep-navy-600">Status:</span>
                <span
                  className={`text-body font-medium ${
                    calculation.status === 'applied' ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {calculation.status === 'applied' ? 'Applied successfully' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-deep-navy-200 px-6 py-4 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
