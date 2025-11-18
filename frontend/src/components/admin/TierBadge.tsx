import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { SubscriptionTier } from '@/types/model-tier';

interface TierBadgeProps extends HTMLAttributes<HTMLDivElement> {
  tier: SubscriptionTier;
  size?: 'sm' | 'md' | 'lg';
}

const tierConfig = {
  free: {
    label: 'Free',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-800 dark:text-gray-100',
    borderColor: 'border-gray-300 dark:border-gray-600',
  },
  pro: {
    label: 'Pro',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    textColor: 'text-blue-800 dark:text-blue-100',
    borderColor: 'border-blue-300 dark:border-blue-600',
  },
  pro_plus: {
    label: 'Pro Plus',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    textColor: 'text-indigo-800 dark:text-indigo-100',
    borderColor: 'border-indigo-300 dark:border-indigo-600',
  },
  pro_max: {
    label: 'Pro Max',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    textColor: 'text-purple-800 dark:text-purple-100',
    borderColor: 'border-purple-300 dark:border-purple-600',
  },
  enterprise_pro: {
    label: 'Enterprise Pro',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    textColor: 'text-amber-800 dark:text-amber-100',
    borderColor: 'border-amber-300 dark:border-amber-600',
  },
  enterprise_pro_plus: {
    label: 'Enterprise Pro Plus',
    bgColor: 'bg-rose-100 dark:bg-rose-900',
    textColor: 'text-rose-800 dark:text-rose-100',
    borderColor: 'border-rose-300 dark:border-rose-600',
  },
  enterprise_max: {
    label: 'Enterprise Max',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    textColor: 'text-orange-800 dark:text-orange-100',
    borderColor: 'border-orange-300 dark:border-orange-600',
  },
  perpetual: {
    label: 'Perpetual',
    bgColor: 'bg-green-100 dark:bg-green-900',
    textColor: 'text-green-800 dark:text-green-100',
    borderColor: 'border-green-300 dark:border-green-600',
  },
  // Legacy mapping for old 'enterprise' tier
  enterprise: {
    label: 'Enterprise',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    textColor: 'text-amber-800 dark:text-amber-100',
    borderColor: 'border-amber-300 dark:border-amber-600',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-caption',
  md: 'px-2.5 py-1 text-body-sm',
  lg: 'px-3 py-1.5 text-body',
};

/**
 * TierBadge Component
 *
 * Displays a subscription tier as a colored badge with Plan 129 6-tier model:
 * - free: gray
 * - pro: blue
 * - pro_max: purple
 * - enterprise_pro: amber
 * - enterprise_max: orange
 * - perpetual: green
 */
function TierBadge({ tier, size = 'md', className, ...props }: TierBadgeProps) {
  const config = tierConfig[tier] || {
    label: tier?.toUpperCase() || 'UNKNOWN',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-800 dark:text-gray-100',
    borderColor: 'border-gray-300 dark:border-gray-600',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        'transition-all duration-fast ease-out',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {config.label}
    </div>
  );
}

export default TierBadge;
