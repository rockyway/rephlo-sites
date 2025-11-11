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
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
  },
  pro: {
    label: 'Pro',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
  },
  pro_max: {
    label: 'Pro Max',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
  },
  enterprise_pro: {
    label: 'Enterprise Pro',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
  },
  enterprise_max: {
    label: 'Enterprise Max',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
  },
  perpetual: {
    label: 'Perpetual',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
  },
  // Legacy mapping for old 'enterprise' tier
  enterprise: {
    label: 'Enterprise',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
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
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
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
