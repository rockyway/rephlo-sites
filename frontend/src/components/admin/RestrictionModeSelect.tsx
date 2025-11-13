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
          <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            // Base styles
            'flex h-11 w-full rounded-md border px-3 py-2.5 text-body',
            'bg-white dark:bg-deep-navy-800',
            'text-deep-navy-900 dark:text-deep-navy-100',
            'placeholder:text-deep-navy-400 dark:placeholder:text-deep-navy-500',
            // Enhanced focus state with glow effect
            'focus-visible:outline-none',
            'focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20',
            'focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan',
            'focus-visible:shadow-md',
            // Smooth transitions
            'transition-all duration-fast ease-out',
            // Disabled state
            'disabled:cursor-not-allowed disabled:bg-deep-navy-100 dark:disabled:bg-deep-navy-900 disabled:text-deep-navy-400 dark:disabled:text-deep-navy-500',
            // Conditional error state
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus-visible:ring-red-500/20 focus-visible:border-red-500'
              : 'border-deep-navy-300 dark:border-deep-navy-600',
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
          <p className="mt-1 text-caption text-deep-navy-700 dark:text-deep-navy-300">
            {modeDescriptions[value]}
          </p>
        )}
      </div>
    );
  }
);

RestrictionModeSelect.displayName = 'RestrictionModeSelect';

export default RestrictionModeSelect;
