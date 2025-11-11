/**
 * CreditAdjustmentModal Component
 *
 * Modal for adding or removing credits with reason tracking
 */

import { useState } from 'react';
import { X, Plus, Minus, AlertCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { formatNumber } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';

interface CreditAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, reason: string, expiresAt?: string) => void | Promise<void>;
  currentBalance: number;
  userName: string;
  isProcessing?: boolean;
}

const REASON_OPTIONS = [
  { value: 'promotional_bonus', label: 'Promotional Bonus' },
  { value: 'refund', label: 'Refund' },
  { value: 'admin_correction', label: 'Admin Correction' },
  { value: 'compensation', label: 'Compensation' },
  { value: 'other', label: 'Other' },
];

export default function CreditAdjustmentModal({
  isOpen,
  onClose,
  onConfirm,
  currentBalance,
  userName,
  isProcessing = false,
}: CreditAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('promotional_bonus');
  const [customReason, setCustomReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Validation
    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be a positive number');
      return;
    }

    if (adjustmentType === 'remove' && amountNum > currentBalance) {
      setError('Cannot remove more credits than current balance');
      return;
    }

    const finalReason = reason === 'other' ? customReason : reason;
    if (!finalReason.trim()) {
      setError('Reason is required');
      return;
    }

    const finalAmount = adjustmentType === 'add' ? amountNum : -amountNum;

    try {
      await onConfirm(
        finalAmount,
        finalReason,
        expiresAt || undefined
      );
      // Reset form
      setAmount('');
      setReason('promotional_bonus');
      setCustomReason('');
      setExpiresAt('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust credits');
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setAmount('');
      setReason('promotional_bonus');
      setCustomReason('');
      setExpiresAt('');
      setError('');
      onClose();
    }
  };

  const newBalance = currentBalance + (adjustmentType === 'add' ? parseInt(amount || '0', 10) : -parseInt(amount || '0', 10));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-deep-navy-200">
            <h2 className="text-h3 font-semibold text-deep-navy-800">
              Adjust Credits
            </h2>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-deep-navy-400 hover:text-deep-navy-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* User Info */}
            <div className="bg-deep-navy-50 rounded-md p-4">
              <p className="text-body-sm text-deep-navy-600">User</p>
              <p className="text-body font-medium text-deep-navy-800">{userName}</p>
              <p className="text-body-sm text-deep-navy-600 mt-2">Current Balance</p>
              <p className="text-h3 font-semibold text-rephlo-blue">{formatNumber(currentBalance)} credits</p>
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAdjustmentType('add')}
                  disabled={isProcessing}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-all',
                    adjustmentType === 'add'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-deep-navy-200 hover:border-deep-navy-300',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Plus className="h-5 w-5" />
                  Add Credits
                </button>
                <button
                  onClick={() => setAdjustmentType('remove')}
                  disabled={isProcessing}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-all',
                    adjustmentType === 'remove'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-deep-navy-200 hover:border-deep-navy-300',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Minus className="h-5 w-5" />
                  Remove Credits
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="Enter credit amount"
                disabled={isProcessing}
                min="1"
                step="1"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                disabled={isProcessing}
                className={cn(
                  'w-full px-3 py-2 border rounded-md shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue',
                  'disabled:bg-gray-50 disabled:text-gray-500',
                  'border-deep-navy-300'
                )}
              >
                {REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Reason */}
            {reason === 'other' && (
              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                  Custom Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter custom reason..."
                  disabled={isProcessing}
                  className={cn(
                    'w-full px-3 py-2 border rounded-md shadow-sm',
                    'focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:border-rephlo-blue',
                    'disabled:bg-gray-50 disabled:text-gray-500',
                    'border-deep-navy-300'
                  )}
                  rows={2}
                />
              </div>
            )}

            {/* Expiration Date (optional, only for add) */}
            {adjustmentType === 'add' && (
              <div>
                <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
                  Expiration Date (Optional)
                </label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={isProcessing}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-caption text-deep-navy-700 mt-1">
                  Leave blank for no expiration
                </p>
              </div>
            )}

            {/* New Balance Preview */}
            <div className={cn(
              'p-4 rounded-md border-2',
              newBalance >= 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            )}>
              <p className="text-body-sm text-deep-navy-600 mb-1">New Balance</p>
              <p className={cn(
                'text-h3 font-semibold',
                newBalance >= 0 ? 'text-green-700' : 'text-red-700'
              )}>
                {formatNumber(newBalance)} credits
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-body-sm text-red-800">{error}</p>
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
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant={adjustmentType === 'add' ? 'primary' : 'destructive'}
              disabled={
                isProcessing ||
                !amount ||
                (reason === 'other' && !customReason.trim())
              }
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `${adjustmentType === 'add' ? 'Grant' : 'Deduct'} Credits`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
