import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SubscriptionTier } from '@/types/model-tier';

interface TierSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: SubscriptionTier;
  onChange: (tier: SubscriptionTier) => void;
  label?: string;
  error?: boolean;
  allowEmpty?: boolean;
}

/**
 * TierSelect Component
 *
 * Dropdown for selecting subscription tiers.
 * Displays tiers with appropriate styling.
 */
const TierSelect = forwardRef<HTMLSelectElement, TierSelectProps>(
  (
    { value, onChange, label, error, allowEmpty, className, ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as SubscriptionTier);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-body-sm font-medium text-deep-navy-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            // Base styles
            'flex h-10 w-full rounded-md border bg-white px-lg py-md text-body',
            'placeholder:text-deep-navy-400',
            // Enhanced focus state with glow effect
            'focus-visible:outline-none',
            'focus-visible:ring-4 focus-visible:ring-rephlo-blue/20',
            'focus-visible:border-rephlo-blue',
            'focus-visible:shadow-md',
            // Smooth transitions
            'transition-all duration-fast ease-out',
            // Disabled state
            'disabled:cursor-not-allowed disabled:bg-deep-navy-100 disabled:text-deep-navy-400',
            // Conditional error state
            error
              ? 'border-red-500 bg-red-50 focus-visible:ring-red-500/20 focus-visible:border-red-500'
              : 'border-deep-navy-300',
            className
          )}
          {...props}
        >
          {allowEmpty && <option value="">Select tier...</option>}
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
    );
  }
);

TierSelect.displayName = 'TierSelect';

export default TierSelect;
