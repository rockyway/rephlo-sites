import React from 'react';

export type Status =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'cancelled'
  | 'expired'
  | 'trial'
  | 'pending'
  | 'grace_period';

export interface StatusBadgeProps {
  status: Status;
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
  // Status label mapping
  const statusLabels: Record<Status, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    cancelled: 'Cancelled',
    expired: 'Expired',
    trial: 'Trial',
    pending: 'Pending',
    grace_period: 'Grace Period',
  };

  // Status color mapping (using custom classes)
  const statusColors: Record<Status, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-deep-navy-100 text-deep-navy-600',
    suspended: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-red-100 text-red-800',
    trial: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    grace_period: 'bg-orange-100 text-orange-800',
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
