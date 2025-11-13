/**
 * Edit Coupon Modal Component
 *
 * Modal for editing existing coupons with pre-populated fields.
 *
 * Features:
 * - Pre-populated form fields from existing coupon
 * - Code field is read-only (immutable after creation)
 * - Dynamic field visibility based on coupon type
 * - Full validation matching Create modal
 * - Campaign linking support
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { plan111API } from '@/api/plan111';
import { cn } from '@/lib/utils';
import type {
  Coupon,
  UpdateCouponRequest,
  CouponCampaign,
} from '@rephlo/shared-types';
import {
  CouponType,
  SubscriptionTier,
  BillingCycle,
} from '@rephlo/shared-types';

interface EditCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coupon: Coupon;
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
  { value: SubscriptionTier.PRO_MAX, label: 'Pro Max' },
  { value: SubscriptionTier.ENTERPRISE_PRO, label: 'Enterprise Pro' },
  { value: SubscriptionTier.ENTERPRISE_MAX, label: 'Enterprise Max' },
  { value: SubscriptionTier.PERPETUAL, label: 'Perpetual' },
];

const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: BillingCycle.MONTHLY, label: 'Monthly' },
  { value: BillingCycle.ANNUAL, label: 'Annual' },
];

export default function EditCouponModal({
  isOpen,
  onClose,
  onSuccess,
  coupon,
}: EditCouponModalProps) {
  // Form state - Initialize with coupon data (includes local discountValue field)
  const [formData, setFormData] = useState<Partial<UpdateCouponRequest> & { discountValue?: number }>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  // Populate form data when coupon changes or modal opens
  useEffect(() => {
    if (isOpen && coupon) {
      // Convert coupon to form format - extract the appropriate discount value
      const discountValue =
        coupon.discountPercentage ||
        coupon.discountAmount ||
        coupon.bonusDurationMonths ||
        0;

      setFormData({
        type: coupon.type,
        discountValue: discountValue, // Local field for form
        maxDiscountApplications: coupon.maxDiscountApplications,
        maxUsesPerUser: coupon.maxUsesPerUser || 1,
        tierEligibility: coupon.tierEligibility,
        billingCycles: coupon.billingCycles,
        validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().slice(0, 16) : '',
        validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().slice(0, 16) : '',
        isActive: coupon.isActive,
        campaignId: coupon.campaignId || undefined,
        description: coupon.description || '',
        internalNotes: coupon.internalNotes || '',
      });

      loadCampaigns();
    }
  }, [isOpen, coupon]);

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

  const handleChange = (field: keyof UpdateCouponRequest | 'discountValue', value: any) => {
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

    // Discount value validation (if changed)
    if (formData.discountValue !== undefined) {
      if (formData.discountValue <= 0) {
        newErrors.discountValue = 'Discount value must be greater than 0';
      }

      // Percentage discount validation (max 100%)
      if (
        coupon.type === CouponType.PERCENTAGE &&
        formData.discountValue > 100
      ) {
        newErrors.discountValue = 'Percentage discount cannot exceed 100%';
      }
    }

    // Date validation (if changed)
    if (formData.validFrom && formData.validUntil) {
      const fromDate = new Date(formData.validFrom);
      const untilDate = new Date(formData.validUntil);

      if (untilDate <= fromDate) {
        newErrors.validUntil = 'Valid until date must be after valid from date';
      }
    }

    // Max uses validation (if changed)
    if (formData.maxDiscountApplications !== null && formData.maxDiscountApplications !== undefined) {
      if (formData.maxDiscountApplications <= 0) {
        newErrors.maxDiscountApplications = 'Max uses must be greater than 0 or left empty for unlimited';
      }
    }

    // Max uses per customer validation (if changed)
    if (formData.maxUsesPerUser !== undefined) {
      if (formData.maxUsesPerUser < 1) {
        newErrors.maxUsesPerUser = 'Max uses per customer must be at least 1';
      }
    }

    // Tier eligibility validation (if changed)
    if (formData.tierEligibility !== undefined) {
      if (formData.tierEligibility.length === 0) {
        newErrors.tierEligibility = 'At least one tier must be selected';
      }
    }

    // Billing cycles validation (if changed)
    if (formData.billingCycles !== undefined) {
      if (formData.billingCycles.length === 0) {
        newErrors.billingCycles = 'At least one billing cycle must be selected';
      }
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
      // Only include changed fields in update request
      const updateData: UpdateCouponRequest = {};

      // Map discountValue to the appropriate API field based on coupon type
      if (formData.discountValue !== undefined) {
        if (coupon.type === CouponType.PERCENTAGE) {
          updateData.discountPercentage = formData.discountValue;
        } else if (coupon.type === CouponType.FIXED_AMOUNT) {
          updateData.discountAmount = formData.discountValue;
        } else if (coupon.type === CouponType.DURATION_BONUS) {
          updateData.bonusDurationMonths = formData.discountValue;
        }
      }
      if (formData.maxDiscountApplications !== undefined) {
        updateData.maxDiscountApplications = formData.maxDiscountApplications;
      }
      if (formData.maxUsesPerUser !== undefined) {
        updateData.maxUsesPerUser = formData.maxUsesPerUser;
      }
      if (formData.tierEligibility !== undefined) {
        updateData.tierEligibility = formData.tierEligibility;
      }
      if (formData.billingCycles !== undefined) {
        updateData.billingCycles = formData.billingCycles;
      }
      if (formData.validFrom !== undefined) {
        updateData.validFrom = formData.validFrom;
      }
      if (formData.validUntil !== undefined) {
        updateData.validUntil = formData.validUntil;
      }
      if (formData.isActive !== undefined) {
        updateData.isActive = formData.isActive;
      }
      if (formData.campaignId !== undefined) {
        updateData.campaignId = formData.campaignId;
      }
      if (formData.description !== undefined) {
        updateData.description = formData.description;
      }
      if (formData.internalNotes !== undefined) {
        updateData.internalNotes = formData.internalNotes;
      }

      await plan111API.updateCoupon(coupon.id, updateData);

      setSubmitSuccess(true);

      // Close modal after brief success message display
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to update coupon:', error);
      setSubmitError(
        error.response?.data?.error?.message || 'Failed to update coupon. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      setSubmitError(null);
      setSubmitSuccess(false);
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
            <div>
              <h2 className="text-h2 font-bold text-deep-navy-800 dark:text-white">
                Edit Coupon
              </h2>
              <p className="text-sm text-deep-navy-600 dark:text-deep-navy-300 mt-1">
                Code: <span className="font-mono font-semibold">{coupon.code}</span>
              </p>
            </div>
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
                Coupon updated successfully!
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {submitError}
              </div>
            )}

            {/* Coupon Code (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Coupon Code
              </label>
              <Input
                type="text"
                value={coupon.code}
                disabled={true}
                className="bg-deep-navy-50 dark:bg-deep-navy-900 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-deep-navy-600 dark:text-deep-navy-300">
                Coupon codes cannot be changed after creation
              </p>
            </div>

            {/* Coupon Type (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
                Coupon Type
              </label>
              <Input
                type="text"
                value={COUPON_TYPES.find(t => t.value === coupon.type)?.label || coupon.type}
                disabled={true}
                className="bg-deep-navy-50 dark:bg-deep-navy-900 cursor-not-allowed"
              />
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
                  coupon.type === CouponType.PERCENTAGE
                    ? 'e.g., 25'
                    : 'e.g., 20.00'
                }
                step={coupon.type === CouponType.PERCENTAGE ? '1' : '0.01'}
                min="0"
                className={cn(errors.discountValue && 'border-red-300')}
              />
              {errors.discountValue && (
                <p className="mt-1 text-sm text-red-600">{errors.discountValue}</p>
              )}
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
                  value={formData.maxDiscountApplications || ''}
                  onChange={(e) =>
                    handleChange('maxDiscountApplications', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isSubmitting}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className={cn(errors.maxDiscountApplications && 'border-red-300')}
                />
                {errors.maxDiscountApplications && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxDiscountApplications}</p>
                )}
                <p className="mt-1 text-xs text-deep-navy-600 dark:text-deep-navy-300">
                  Current uses: {coupon.redemptionCount || 0}
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
                  Coupon is active
                </span>
              </label>
              <p className="mt-1 text-xs text-deep-navy-600 dark:text-deep-navy-300 ml-6">
                Deactivating will prevent new redemptions but won't affect existing ones
              </p>
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
