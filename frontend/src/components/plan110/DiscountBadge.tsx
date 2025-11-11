/**
 * DiscountBadge Component
 *
 * Badge for displaying upgrade discount type and percentage
 */

import { DiscountType } from '@/types/plan110.types';
import { getDiscountBadgeColor, getDiscountLabel } from '@/lib/plan110.utils';
import { cn } from '@/lib/utils';

interface DiscountBadgeProps {
  type: DiscountType;
  percentage: number;
  className?: string;
}

export default function DiscountBadge({ type, percentage, className }: DiscountBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
        getDiscountBadgeColor(type),
        className
      )}
    >
      {getDiscountLabel(type, percentage)}
    </span>
  );
}
