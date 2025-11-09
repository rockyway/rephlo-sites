/**
 * TierBadge Component
 *
 * Color-coded badge for displaying subscription tiers
 */

import { SubscriptionTier } from '@/types/plan109.types';
import { getTierDisplayName, getTierColor } from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: SubscriptionTier;
  className?: string;
}

export default function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
        getTierColor(tier),
        className
      )}
    >
      {getTierDisplayName(tier)}
    </span>
  );
}
