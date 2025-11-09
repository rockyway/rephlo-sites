import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge Component
 *
 * Generic badge component (used by TierBadge and StatusBadge internally).
 * Features:
 * - Variant colors (primary, success, warning, danger, info, gray)
 * - Size variants (sm, md, lg)
 * - Rounded pill badge
 * - Deep Navy theme compatible
 * - Supports className override
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  // Variant color classes
  const variantClasses = {
    primary: 'bg-rephlo-blue/10 text-rephlo-blue',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-electric-cyan/10 text-electric-cyan',
    gray: 'bg-deep-navy-100 text-deep-navy-600',
  }[variant];

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClasses} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
