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
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
  },
  pro: {
    label: 'Pro',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
  },
  enterprise: {
    label: 'Enterprise',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
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
 * Displays a subscription tier as a colored badge.
 * - free: green
 * - pro: blue
 * - enterprise: purple
 */
function TierBadge({ tier, size = 'md', className, ...props }: TierBadgeProps) {
  const config = tierConfig[tier];

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
