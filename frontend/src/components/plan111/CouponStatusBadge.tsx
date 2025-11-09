/**
 * CouponStatusBadge Component
 *
 * Display coupon status with color coding
 */

import { cn } from '@/lib/utils';
import {
  getCouponStatusColor,
  getCouponStatusLabel,
} from '@/lib/plan111.utils';

interface CouponStatusBadgeProps {
  coupon: {
    is_active: boolean;
    valid_from: string;
    valid_until: string;
  };
  className?: string;
}

export default function CouponStatusBadge({
  coupon,
  className,
}: CouponStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getCouponStatusColor(coupon),
        className
      )}
    >
      {getCouponStatusLabel(coupon)}
    </span>
  );
}
