/**
 * StatusBadge Component
 *
 * Color-coded badge for displaying subscription and user status
 */

import { SubscriptionStatus, UserStatus } from '@/types/plan109.types';
import {
  getSubscriptionStatusDisplay,
  getSubscriptionStatusColor,
  getUserStatusDisplay,
  getUserStatusColor,
} from '@/lib/plan109.utils';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: SubscriptionStatus | UserStatus;
  type: 'subscription' | 'user';
  className?: string;
}

export default function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const displayText = type === 'subscription'
    ? getSubscriptionStatusDisplay(status as SubscriptionStatus)
    : getUserStatusDisplay(status as UserStatus);

  const colorClass = type === 'subscription'
    ? getSubscriptionStatusColor(status as SubscriptionStatus)
    : getUserStatusColor(status as UserStatus);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
        colorClass,
        className
      )}
    >
      {displayText}
    </span>
  );
}
