/**
 * CouponTypeBadge Component
 *
 * Color-coded badge for displaying coupon types
 */

import { cn } from '@/lib/utils';
import { getCouponTypeColor, getCouponTypeLabel } from '@/lib/plan111.utils';
import type { CouponType } from '@/types/plan111.types';

interface CouponTypeBadgeProps {
  type: CouponType;
  className?: string;
}

export default function CouponTypeBadge({
  type,
  className,
}: CouponTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getCouponTypeColor(type),
        className
      )}
    >
      {getCouponTypeLabel(type)}
    </span>
  );
}
