/**
 * Create Coupon Modal Component
 *
 * Comprehensive modal for creating new discount coupons with full validation.
 *
 * Features:
 * - Auto-generate coupon code option
 * - Dynamic field visibility based on coupon type
 * - Multi-select for tier eligibility and billing cycles
 * - Date validation (validUntil must be after validFrom)
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
  CreateCouponRequest,
  CouponCampaign,
} from '@rephlo/shared-types';
import {
  CouponType,
  DiscountType,
  SubscriptionTier,
  BillingCycle,
} from '@rephlo/shared-types';

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
    value: CouponType.PERCENTAGE,
    label: 'Percentage Discount',
    description: '% off subscription price',
  },
  {
    value: CouponType.FIXED_AMOUNT,
    label: 'Fixed Amount Discount',
    description: '$ off subscription price',
  },
  {
    value: CouponType.TIER_SPECIFIC,
    label: 'Tier Specific',
    description: 'Discount for specific tier upgrades',
  },
  {
    value: CouponType.DURATION_BONUS,
    label: 'Duration Bonus',
    description: 'Free additional months',
  },
  {
    value: CouponType.PERPETUAL_MIGRATION,
    label: 'BYOK Migration',
    description: 'Perpetual license migration discount',
  },
];

const TIERS: { value: SubscriptionTier; label: string }[] = [
  { value: SubscriptionTier.FREE, label: 'Free' },
  { value: SubscriptionTier.PRO, label: 'Pro' },
  { value: SubscriptionTier.PRO_PLUS, label: 'Pro Plus' },
  { value: SubscriptionTier.PRO_MAX, label: 'Pro Max' },
  { value: SubscriptionTier.ENTERPRISE_PRO, label: 'Enterprise Pro' },
  { value: SubscriptionTier.ENTERPRISE_PRO_PLUS, label: 'Enterprise Pro Plus' },
  { value: SubscriptionTier.PERPETUAL, label: 'Perpetual' },
];

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: BillingCycle.MONTHLY, label: 'Monthly' },
  { value: BillingCycle.ANNUAL, label: 'Annual' },
];

export default function CreateCouponModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCouponModalProps) {
  // Form state (with local discountValue that maps to API fields)
  const [formData, setFormData] = useState<Partial<CreateCouponRequest> & { discountValue?: number }>({
    code: '',
    type: CouponType.PERCENTAGE,
    discountValue: undefined, // Local field - maps to discountPercentage/discountAmount/bonusDurationMonths
    maxUses: undefined,
    maxUsesPerUser: 1,
    tierEligibility: [SubscriptionTier.FREE, SubscriptionTier.PRO, SubscriptionTier.PRO_MAX],
    billingCycles: [BillingCycle.MONTHLY, BillingCycle.ANNUAL],
    validFrom: '',
    validUntil: '',
    isActive: true,
    campaignId: undefined,
    description: '',
    internalNotes: '',
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

  const handleChange = (field: keyof CreateCouponRequest | 'discountValue', value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user makes changes
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleTierToggle = (tier: SubscriptionTier) => {
    const currentTiers = formData.tierEligibility || [];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];
    handleChange('tierEligibility', newTiers);
  };

  const handleBillingCycleToggle = (cycle: BillingCycle) => {
    const currentCycles = formData.billingCycles || [];
    const newCycles = currentCycles.includes(cycle)
      ? currentCycles.filter((c) => c !== cycle)
      : [...currentCycles, cycle];
    handleChange('billingCycles', newCycles);
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
    if (!formData.discountValue || formData.discountValue <= 0) {
      newErrors.discountValue = 'Discount value must be greater than 0';
    }

    // Percentage discount validation (max 100%)
    if (
      formData.type === CouponType.PERCENTAGE &&
      formData.discountValue &&
      formData.discountValue > 100
    ) {
      newErrors.discountValue = 'Percentage discount cannot exceed 100%';
    }

    // Date validation
    if (!formData.validFrom) {
      newErrors.validFrom = 'Valid from date is required';
    }

    if (!formData.validUntil) {
      newErrors.validUntil = 'Valid until date is required';
    }

    if (formData.validFrom && formData.validUntil) {
      const fromDate = new Date(formData.validFrom);
      const untilDate = new Date(formData.validUntil);

      if (untilDate <= fromDate) {
        newErrors.validUntil = 'Valid until date must be after valid from date';
      }

      // Warn if start date is in the past
      const now = new Date();
      if (fromDate < now) {
        // This is a warning, not an error, so we won't block submission
        // but we'll show a message in the UI
      }
    }

    // Max uses validation
    if (formData.maxUses !== null && formData.maxUses !== undefined) {
      if (formData.maxUses <= 0) {
        newErrors.maxUses = 'Max uses must be greater than 0 or left empty for unlimited';
      }
    }

    // Max uses per user validation
    if (!formData.maxUsesPerUser || formData.maxUsesPerUser < 1) {
      newErrors.maxUsesPerUser = 'Max uses per customer must be at least 1';
    }

    // Tier eligibility validation
    if (!formData.tierEligibility || formData.tierEligibility.length === 0) {
      newErrors.tierEligibility = 'At least one tier must be selected';
    }

    // Billing cycles validation
    if (!formData.billingCycles || formData.billingCycles.length === 0) {
      newErrors.billingCycles = 'At least one billing cycle must be selected';
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
      // Prepare request data
      const requestData: CreateCouponRequest = {
        code: formData.code!.toUpperCase(),
        type: formData.type!,
        discountValue: formData.discountValue!,
        discountType: DiscountType.PERCENTAGE,
        maxUses: formData.maxUses,
        maxUsesPerUser: formData.maxUsesPerUser || 1,
        tierEligibility: formData.tierEligibility!,
        billingCycles: formData.billingCycles!,
        validFrom: formData.validFrom!,
        validUntil: formData.validUntil!,
        isActive: formData.isActive ?? true,
        campaignId: formData.campaignId || undefined,
        description: formData.description || undefined,
        internalNotes: formData.internalNotes || undefined,
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
      type: CouponType.PERCENTAGE,
      discountValue: undefined,
      maxUses: undefined,
      maxUsesPerUser: 1,
      tierEligibility: [SubscriptionTier.FREE, SubscriptionTier.PRO, SubscriptionTier.PRO_MAX],
      billingCycles: [BillingCycle.MONTHLY, BillingCycle.ANNUAL],
      validFrom: '',
      validUntil: '',
      isActive: true,
      campaignId: undefined,
      description: '',
      internalNotes: '',
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
                value={formData.discountValue || ''}
                onChange={(e) => handleChange('discountValue', parseFloat(e.target.value))}
                disabled={isSubmitting}
                placeholder={
                  formData.type === CouponType.PERCENTAGE
                    ? 'e.g., 25 (%)'
                    : formData.type === CouponType.DURATION_BONUS
                    ? 'e.g., 3 (months)'
                    : 'e.g., 20.00 ($)'
                }
                step={formData.type === CouponType.PERCENTAGE ? '1' : '0.01'}
                min="0"
                className={cn(errors.discountValue && 'border-red-300')}
              />
              {errors.discountValue && (
                <p className="mt-1 text-sm text-red-600">{errors.discountValue}</p>
              )}
              <p className="mt-1 text-xs text-deep-navy-600 dark:text-deep-navy-300">
                {formData.type === CouponType.PERCENTAGE && 'Enter percentage (0-100)'}
                {formData.type === CouponType.FIXED_AMOUNT && 'Enter dollar amount'}
                {formData.type === CouponType.DURATION_BONUS && 'Enter number of free months'}
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
                      checked={formData.tierEligibility?.includes(tier.value) || false}
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
              {errors.tierEligibility && (
                <p className="mt-1 text-sm text-red-600">{errors.tierEligibility}</p>
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
                      checked={formData.billingCycles?.includes(cycle.value) || false}
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
              {errors.billingCycles && (
                <p className="mt-1 text-sm text-red-600">{errors.billingCycles}</p>
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
                  value={formData.validFrom}
                  onChange={(e) => handleChange('validFrom', e.target.value)}
                  disabled={isSubmitting}
                  className={cn(errors.validFrom && 'border-red-300')}
                />
                {errors.validFrom && (
                  <p className="mt-1 text-sm text-red-600">{errors.validFrom}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => handleChange('validUntil', e.target.value)}
                  disabled={isSubmitting}
                  className={cn(errors.validUntil && 'border-red-300')}
                />
                {errors.validUntil && (
                  <p className="mt-1 text-sm text-red-600">{errors.validUntil}</p>
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
                  value={formData.maxUses || ''}
                  onChange={(e) =>
                    handleChange('maxUses', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isSubmitting}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className={cn(errors.maxUses && 'border-red-300')}
                />
                {errors.maxUses && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxUses}</p>
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
                  value={formData.maxUsesPerUser || ''}
                  onChange={(e) =>
                    handleChange('maxUsesPerUser', parseInt(e.target.value))
                  }
                  disabled={isSubmitting}
                  placeholder="1"
                  min="1"
                  className={cn(errors.maxUsesPerUser && 'border-red-300')}
                />
                {errors.maxUsesPerUser && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxUsesPerUser}</p>
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
                  value={formData.campaignId || ''}
                  onChange={(e) =>
                    handleChange('campaignId', e.target.value || undefined)
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
                value={formData.internalNotes || ''}
                onChange={(e) => handleChange('internalNotes', e.target.value)}
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
                  checked={formData.isActive || false}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
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
