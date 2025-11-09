import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { TierRestrictionMode } from '@/types/model-tier';

interface RestrictionModeSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: TierRestrictionMode;
  onChange: (mode: TierRestrictionMode) => void;
  label?: string;
  error?: boolean;
  allowEmpty?: boolean;
}

const modeDescriptions = {
  minimum: 'Minimum - User tier must be >= required tier',
  exact: 'Exact - User tier must exactly match required tier',
  whitelist: 'Whitelist - User tier must be in allowed tiers list',
};

/**
 * RestrictionModeSelect Component
 *
 * Dropdown for selecting tier restriction mode.
 * Provides helpful descriptions for each mode.
 */
const RestrictionModeSelect = forwardRef<
  HTMLSelectElement,
  RestrictionModeSelectProps
>(
  (
    { value, onChange, label, error, allowEmpty, className, ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as TierRestrictionMode);
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
          {allowEmpty && <option value="">Select mode...</option>}
          <option value="minimum">{modeDescriptions.minimum}</option>
          <option value="exact">{modeDescriptions.exact}</option>
          <option value="whitelist">{modeDescriptions.whitelist}</option>
        </select>
        {value && !allowEmpty && (
          <p className="mt-1 text-caption text-deep-navy-500">
            {modeDescriptions[value]}
          </p>
        )}
      </div>
    );
  }
);

RestrictionModeSelect.displayName = 'RestrictionModeSelect';

export default RestrictionModeSelect;
