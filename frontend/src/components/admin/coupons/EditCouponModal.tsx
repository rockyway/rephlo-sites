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
  CouponUpdateRequest,
  CouponType,
  SubscriptionTier,
  BillingCycle,
  CouponCampaign,
} from '@/types/plan111.types';

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

export default function EditCouponModal({
  isOpen,
  onClose,
  onSuccess,
  coupon,
}: EditCouponModalProps) {
  // Form state - Initialize with coupon data (includes local discount_value field)
  const [formData, setFormData] = useState<Partial<CouponUpdateRequest> & { discount_value?: number }>({});
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
        coupon.discount_percentage ||
        coupon.discount_amount ||
        coupon.bonus_duration_months ||
        0;

      setFormData({
        type: coupon.type,
        discount_value: discountValue, // Local field for form
        max_discount_applications: coupon.max_discount_applications,
        max_per_customer: coupon.max_per_customer || 1,
        applicable_tiers: coupon.applicable_tiers,
        applicable_billing_cycles: coupon.applicable_billing_cycles,
        valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '',
        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '',
        is_active: coupon.is_active,
        campaign_id: coupon.campaign_id || undefined,
        description: coupon.description || '',
        internal_notes: coupon.internal_notes || '',
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

  const handleChange = (field: keyof CouponUpdateRequest | 'discount_value', value: any) => {
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

    // Discount value validation (if changed)
    if (formData.discount_value !== undefined) {
      if (formData.discount_value <= 0) {
        newErrors.discount_value = 'Discount value must be greater than 0';
      }

      // Percentage discount validation (max 100%)
      if (
        coupon.type === 'percentage' &&
        formData.discount_value > 100
      ) {
        newErrors.discount_value = 'Percentage discount cannot exceed 100%';
      }
    }

    // Date validation (if changed)
    if (formData.valid_from && formData.valid_until) {
      const fromDate = new Date(formData.valid_from);
      const untilDate = new Date(formData.valid_until);

      if (untilDate <= fromDate) {
        newErrors.valid_until = 'Valid until date must be after valid from date';
      }
    }

    // Max uses validation (if changed)
    if (formData.max_discount_applications !== null && formData.max_discount_applications !== undefined) {
      if (formData.max_discount_applications <= 0) {
        newErrors.max_discount_applications = 'Max uses must be greater than 0 or left empty for unlimited';
      }
    }

    // Max uses per customer validation (if changed)
    if (formData.max_per_customer !== undefined) {
      if (formData.max_per_customer < 1) {
        newErrors.max_per_customer = 'Max uses per customer must be at least 1';
      }
    }

    // Tier eligibility validation (if changed)
    if (formData.applicable_tiers !== undefined) {
      if (formData.applicable_tiers.length === 0) {
        newErrors.applicable_tiers = 'At least one tier must be selected';
      }
    }

    // Billing cycles validation (if changed)
    if (formData.applicable_billing_cycles !== undefined) {
      if (formData.applicable_billing_cycles.length === 0) {
        newErrors.applicable_billing_cycles = 'At least one billing cycle must be selected';
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
      const updateData: CouponUpdateRequest = {};

      // Map discount_value to the appropriate API field based on coupon type
      if (formData.discount_value !== undefined) {
        if (coupon.type === 'percentage') {
          updateData.discount_percentage = formData.discount_value;
        } else if (coupon.type === 'fixed_amount') {
          updateData.discount_amount = formData.discount_value;
        } else if (coupon.type === 'duration_bonus') {
          updateData.bonus_duration_months = formData.discount_value;
        }
      }
      if (formData.max_discount_applications !== undefined) {
        updateData.max_discount_applications = formData.max_discount_applications;
      }
      if (formData.max_per_customer !== undefined) {
        updateData.max_per_customer = formData.max_per_customer;
      }
      if (formData.applicable_tiers !== undefined) {
        updateData.applicable_tiers = formData.applicable_tiers;
      }
      if (formData.applicable_billing_cycles !== undefined) {
        updateData.applicable_billing_cycles = formData.applicable_billing_cycles;
      }
      if (formData.valid_from !== undefined) {
        updateData.valid_from = formData.valid_from;
      }
      if (formData.valid_until !== undefined) {
        updateData.valid_until = formData.valid_until;
      }
      if (formData.is_active !== undefined) {
        updateData.is_active = formData.is_active;
      }
      if (formData.campaign_id !== undefined) {
        updateData.campaign_id = formData.campaign_id;
      }
      if (formData.description !== undefined) {
        updateData.description = formData.description;
      }
      if (formData.internal_notes !== undefined) {
        updateData.internal_notes = formData.internal_notes;
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
                value={formData.discount_value || ''}
                onChange={(e) => handleChange('discount_value', parseFloat(e.target.value))}
                disabled={isSubmitting}
                placeholder={
                  coupon.type === 'percentage'
                    ? 'e.g., 25'
                    : 'e.g., 20.00'
                }
                step={coupon.type === 'percentage' ? '1' : '0.01'}
                min="0"
                className={cn(errors.discount_value && 'border-red-300')}
              />
              {errors.discount_value && (
                <p className="mt-1 text-sm text-red-600">{errors.discount_value}</p>
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
                  Current uses: {coupon.redemption_count || 0}
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
