/**
 * Create Coupon Modal Component
 *
 * Comprehensive modal for creating new discount coupons with full validation.
 *
 * Features:
 * - Auto-generate coupon code option
 * - Dynamic field visibility based on coupon type
 * - Multi-select for tier eligibility and billing cycles
 * - Date validation (valid_until must be after valid_from)
 * - Campaign linking support
 * - Client-side validation with clear error messages
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { useState, useEffect } from 'react';
import {
  X,
  Wand2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CouponCodeInput from '@/components/plan111/CouponCodeInput';
import { plan111API } from '@/api/plan111';
import { cn } from '@/lib/utils';
import type {
  CouponCreateRequest,
  CouponType,
  SubscriptionTier,
  BillingCycle,
  CouponCampaign,
} from '@/types/plan111.types';

interface CreateCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  [key: string]: string;
}

const COUPON_TYPES: { value: CouponType; label: string; description: string }[] = [
  {
    value: 'percentage',
    label: 'Percentage Discount',
    description: '% off subscription price',
  },
  {
    value: 'fixed_amount',
    label: 'Fixed Amount Discount',
    description: '$ off subscription price',
  },
  {
    value: 'tier_specific',
    label: 'Tier Specific',
    description: 'Discount for specific tier upgrades',
  },
  {
    value: 'duration_bonus',
    label: 'Duration Bonus',
    description: 'Free additional months',
  },
  {
    value: 'perpetual_migration',
    label: 'BYOK Migration',
    description: 'Perpetual license migration discount',
  },
];

const TIERS: { value: SubscriptionTier; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'pro_max', label: 'Pro Max' },
  { value: 'enterprise_pro', label: 'Enterprise Pro' },
  { value: 'enterprise_max', label: 'Enterprise Max' },
  { value: 'perpetual', label: 'Perpetual' },
];

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export default function CreateCouponModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCouponModalProps) {
  // Form state (with local discount_value that maps to API fields)
  const [formData, setFormData] = useState<Partial<CouponCreateRequest> & { discount_value?: number }>({
    code: '',
    type: 'percentage',
    discount_value: undefined, // Local field - maps to discount_percentage/discount_amount/bonus_duration_months
    max_discount_applications: undefined,
    max_per_customer: 1,
    applicable_tiers: ['free', 'pro', 'pro_max'],
    applicable_billing_cycles: ['monthly', 'annual'],
    valid_from: '',
    valid_until: '',
    is_active: true,
    campaign_id: undefined,
    description: '',
    internal_notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  // Load campaigns when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const response = await plan111API.listCampaigns({}, 0, 100);
      setCampaigns(response.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const generateCouponCode = () => {
    // Generate random 8-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleChange = (field: keyof CouponCreateRequest | 'discount_value', value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user makes changes
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleTierToggle = (tier: SubscriptionTier) => {
    const currentTiers = formData.applicable_tiers || [];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];
    handleChange('applicable_tiers', newTiers);
  };

  const handleBillingCycleToggle = (cycle: BillingCycle) => {
    const currentCycles = formData.applicable_billing_cycles || [];
    const newCycles = currentCycles.includes(cycle)
      ? currentCycles.filter((c) => c !== cycle)
      : [...currentCycles, cycle];
    handleChange('applicable_billing_cycles', newCycles);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Code validation
    if (!formData.code || formData.code.trim().length === 0) {
      newErrors.code = 'Coupon code is required';
    } else if (!isCodeValid) {
      newErrors.code = 'Coupon code must be 4-50 uppercase alphanumeric characters';
    }

    // Discount value validation
    if (!formData.discount_value || formData.discount_value <= 0) {
      newErrors.discount_value = 'Discount value must be greater than 0';
    }

    // Percentage discount validation (max 100%)
    if (
      formData.type === 'percentage' &&
      formData.discount_value &&
      formData.discount_value > 100
    ) {
      newErrors.discount_value = 'Percentage discount cannot exceed 100%';
    }

    // Date validation
    if (!formData.valid_from) {
      newErrors.valid_from = 'Valid from date is required';
    }

    if (!formData.valid_until) {
      newErrors.valid_until = 'Valid until date is required';
    }

    if (formData.valid_from && formData.valid_until) {
      const fromDate = new Date(formData.valid_from);
      const untilDate = new Date(formData.valid_until);

      if (untilDate <= fromDate) {
        newErrors.valid_until = 'Valid until date must be after valid from date';
      }

      // Warn if start date is in the past
      const now = new Date();
      if (fromDate < now) {
        // This is a warning, not an error, so we won't block submission
        // but we'll show a message in the UI
      }
    }

    // Max uses validation
    if (formData.max_discount_applications !== null && formData.max_discount_applications !== undefined) {
      if (formData.max_discount_applications <= 0) {
        newErrors.max_discount_applications = 'Max uses must be greater than 0 or left empty for unlimited';
      }
    }

    // Max uses per user validation
    if (!formData.max_per_customer || formData.max_per_customer < 1) {
      newErrors.max_per_customer = 'Max uses per customer must be at least 1';
    }

    // Tier eligibility validation
    if (!formData.applicable_tiers || formData.applicable_tiers.length === 0) {
      newErrors.applicable_tiers = 'At least one tier must be selected';
    }

    // Billing cycles validation
    if (!formData.applicable_billing_cycles || formData.applicable_billing_cycles.length === 0) {
      newErrors.applicable_billing_cycles = 'At least one billing cycle must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare request data - map discount_value to appropriate API field based on type
      const requestData: CouponCreateRequest = {
        code: formData.code!.toUpperCase(),
        type: formData.type!,
        // Map discount_value to the correct field based on coupon type
        ...(formData.type === 'percentage' && { discount_percentage: formData.discount_value }),
        ...(formData.type === 'fixed_amount' && { discount_amount: formData.discount_value }),
        ...(formData.type === 'duration_bonus' && { bonus_duration_months: formData.discount_value }),
        max_discount_applications: formData.max_discount_applications,
        max_per_customer: formData.max_per_customer || 1,
        applicable_tiers: formData.applicable_tiers!,
        applicable_billing_cycles: formData.applicable_billing_cycles!,
        valid_from: formData.valid_from!,
        valid_until: formData.valid_until!,
        is_active: formData.is_active ?? true,
        campaign_id: formData.campaign_id || undefined,
        description: formData.description || undefined,
        internal_notes: formData.internal_notes || undefined,
      };

      await plan111API.createCoupon(requestData);

      setSubmitSuccess(true);

      // Close modal after brief success message display
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to create coupon:', error);
      setSubmitError(
        error.response?.data?.error?.message || 'Failed to create coupon. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      discount_value: undefined,
      max_discount_applications: undefined,
      max_per_customer: 1,
      applicable_tiers: ['free', 'pro', 'pro_max'],
      applicable_billing_cycles: ['monthly', 'annual'],
      valid_from: '',
      valid_until: '',
      is_active: true,
      campaign_id: undefined,
      description: '',
      internal_notes: '',
    });
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-deep-navy-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-deep-navy-800 border-b border-deep-navy-200 dark:border-deep-navy-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-h2 font-bold text-deep-navy-800 dark:text-white">
              Create New Coupon
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-deep-navy-600 dark:text-deep-navy-300 hover:text-deep-navy-800 dark:hover:text-white disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {/* Success Message */}
            {submitSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Coupon created successfully!
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {submitError}
              </div>
            )}

            {/* Coupon Code */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CouponCodeInput
                    value={formData.code || ''}
                    onChange={(value) => handleChange('code', value)}
                    onValidationChange={setIsCodeValid}
                    disabled={isSubmitting}
                    placeholder="e.g., SUMMER25, BLACKFRIDAY50"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={generateCouponCode}
                  disabled={isSubmitting}
                  title="Generate random code"
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              </div>
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            {/* Coupon Type */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Coupon Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value as CouponType)}
                disabled={isSubmitting}
                className="w-full h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 shadow-sm focus:border-rephlo-blue focus:ring-rephlo-blue dark:focus:border-electric-cyan dark:focus:ring-electric-cyan"
              >
                {COUPON_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.discount_value || ''}
                onChange={(e) => handleChange('discount_value', parseFloat(e.target.value))}
                disabled={isSubmitting}
                placeholder={
                  formData.type === 'percentage'
                    ? 'e.g., 25 (%)'
                    : formData.type === 'duration_bonus'
                    ? 'e.g., 3 (months)'
                    : 'e.g., 20.00 ($)'
                }
                step={formData.type === 'percentage' ? '1' : '0.01'}
                min="0"
                className={cn(errors.discount_value && 'border-red-300')}
              />
              {errors.discount_value && (
                <p className="mt-1 text-sm text-red-600">{errors.discount_value}</p>
              )}
              <p className="mt-1 text-xs text-deep-navy-600 dark:text-deep-navy-300">
                {formData.type === 'percentage' && 'Enter percentage (0-100)'}
                {formData.type === 'fixed_amount' && 'Enter dollar amount'}
                {formData.type === 'duration_bonus' && 'Enter number of free months'}
              </p>
            </div>

            {/* Tier Eligibility */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                Tier Eligibility <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIERS.map((tier) => (
                  <label
                    key={tier.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.applicable_tiers?.includes(tier.value) || false}
                      onChange={() => handleTierToggle(tier.value)}
                      disabled={isSubmitting}
                      className="rounded border-deep-navy-300 text-rephlo-blue focus:ring-rephlo-blue"
                    />
                    <span className="text-sm text-deep-navy-700 dark:text-deep-navy-200">
                      {tier.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.applicable_tiers && (
                <p className="mt-1 text-sm text-red-600">{errors.applicable_tiers}</p>
              )}
            </div>

            {/* Billing Cycles */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
                Billing Cycles <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BILLING_CYCLES.map((cycle) => (
                  <label
                    key={cycle.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.applicable_billing_cycles?.includes(cycle.value) || false}
                      onChange={() => handleBillingCycleToggle(cycle.value)}
                      disabled={isSubmitting}
                      className="rounded border-deep-navy-300 text-rephlo-blue focus:ring-rephlo-blue"
                    />
                    <span className="text-sm text-deep-navy-700 dark:text-deep-navy-200">
                      {cycle.label}
                    </span>
                  </label>
                ))}
              </div>
              {errors.applicable_billing_cycles && (
                <p className="mt-1 text-sm text-red-600">{errors.applicable_billing_cycles}</p>
              )}
            </div>

            {/* Validity Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                  Valid From <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => handleChange('valid_from', e.target.value)}
                  disabled={isSubmitting}
                  className={cn(errors.valid_from && 'border-red-300')}
                />
                {errors.valid_from && (
                  <p className="mt-1 text-sm text-red-600">{errors.valid_from}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => handleChange('valid_until', e.target.value)}
                  disabled={isSubmitting}
                  className={cn(errors.valid_until && 'border-red-300')}
                />
                {errors.valid_until && (
                  <p className="mt-1 text-sm text-red-600">{errors.valid_until}</p>
                )}
              </div>
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                  Max Uses (Global)
                </label>
                <Input
                  type="number"
                  value={formData.max_discount_applications || ''}
                  onChange={(e) =>
                    handleChange('max_discount_applications', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isSubmitting}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className={cn(errors.max_discount_applications && 'border-red-300')}
                />
                {errors.max_discount_applications && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_discount_applications}</p>
                )}
                <p className="mt-1 text-xs text-deep-navy-600 dark:text-deep-navy-300">
                  Empty = unlimited uses
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                  Max Uses Per Customer <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.max_per_customer || ''}
                  onChange={(e) =>
                    handleChange('max_per_customer', parseInt(e.target.value))
                  }
                  disabled={isSubmitting}
                  placeholder="1"
                  min="1"
                  className={cn(errors.max_per_customer && 'border-red-300')}
                />
                {errors.max_per_customer && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_per_customer}</p>
                )}
              </div>
            </div>

            {/* Campaign Assignment */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Campaign (Optional)
              </label>
              {isLoadingCampaigns ? (
                <div className="flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <select
                  value={formData.campaign_id || ''}
                  onChange={(e) =>
                    handleChange('campaign_id', e.target.value || undefined)
                  }
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 shadow-sm focus:border-rephlo-blue focus:ring-rephlo-blue dark:focus:border-electric-cyan dark:focus:ring-electric-cyan"
                >
                  <option value="">-- No Campaign --</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Description (Public)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isSubmitting}
                placeholder="Optional - shown to users"
                rows={2}
                className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 shadow-sm focus:border-rephlo-blue focus:ring-rephlo-blue dark:focus:border-electric-cyan dark:focus:ring-electric-cyan"
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Internal Notes (Admin Only)
              </label>
              <textarea
                value={formData.internal_notes || ''}
                onChange={(e) => handleChange('internal_notes', e.target.value)}
                disabled={isSubmitting}
                placeholder="Optional - for admin reference only"
                rows={2}
                className="w-full rounded-md border border-deep-navy-300 dark:border-deep-navy-600 bg-white dark:bg-deep-navy-800 text-deep-navy-900 dark:text-deep-navy-100 px-3 py-2 shadow-sm focus:border-rephlo-blue focus:ring-rephlo-blue dark:focus:border-electric-cyan dark:focus:ring-electric-cyan"
              />
            </div>

            {/* Is Active */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active || false}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  disabled={isSubmitting}
                  className="rounded border-deep-navy-300 text-rephlo-blue focus:ring-rephlo-blue"
                />
                <span className="text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200">
                  Activate coupon immediately after creation
                </span>
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-deep-navy-800 border-t border-deep-navy-200 dark:border-deep-navy-700 px-6 py-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || submitSuccess}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Coupon'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
