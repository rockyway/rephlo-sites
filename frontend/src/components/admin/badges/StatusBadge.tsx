import React from 'react';
import { SubscriptionStatus } from '@rephlo/shared-types';

export interface StatusBadgeProps {
  status: SubscriptionStatus;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StatusBadge Component
 *
 * Display subscription/license status with color coding.
 * Features:
 * - Color mapping for each status
 * - Capitalized text
 * - Size variants
 * - Deep Navy theme compatible
 *
 * Color Mapping:
 * - active: Green
 * - inactive: Gray
 * - suspended: Orange
 * - cancelled: Red
 * - expired: Red
 * - trial: Blue
 * - pending: Yellow
 * - grace_period: Orange
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  // Status label mapping (using SubscriptionStatus enum)
  const statusLabels: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.ACTIVE]: 'Active',
    [SubscriptionStatus.PAST_DUE]: 'Past Due',
    [SubscriptionStatus.SUSPENDED]: 'Suspended',
    [SubscriptionStatus.CANCELLED]: 'Cancelled',
    [SubscriptionStatus.EXPIRED]: 'Expired',
    [SubscriptionStatus.TRIAL]: 'Trial',
    [SubscriptionStatus.GRACE_PERIOD]: 'Grace Period',
    [SubscriptionStatus.INACTIVE]: 'Inactive',
    [SubscriptionStatus.PENDING]: 'Pending',
  };

  // Status color mapping (using SubscriptionStatus enum)
  const statusColors: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.ACTIVE]: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    [SubscriptionStatus.PAST_DUE]: 'bg-deep-navy-100 dark:bg-deep-navy-700 text-deep-navy-600 dark:text-deep-navy-200',
    [SubscriptionStatus.SUSPENDED]: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    [SubscriptionStatus.CANCELLED]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    [SubscriptionStatus.EXPIRED]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    [SubscriptionStatus.TRIAL]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    [SubscriptionStatus.GRACE_PERIOD]: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    [SubscriptionStatus.INACTIVE]: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300',
    [SubscriptionStatus.PENDING]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${statusColors[status]} ${sizeClasses}`}
    >
      {statusLabels[status]}
    </span>
  );
};

export default StatusBadge;
