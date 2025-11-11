import React from 'react';

export type SubscriptionTier =
  | 'free'
  | 'pro'
  | 'pro_max'
  | 'enterprise_pro'
  | 'enterprise_max'
  | 'perpetual';

export interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * TierBadge Component
 *
 * Display subscription tier with color coding.
 * Features:
 * - Color mapping for each tier
 * - Uppercase text
 * - Size variants
 * - Deep Navy theme compatible
 *
 * Color Mapping:
 * - free: Gray
 * - pro: Blue
 * - pro_max: Purple
 * - enterprise_pro: Indigo
 * - enterprise_max: Pink
 * - perpetual: Green
 */
const TierBadge: React.FC<TierBadgeProps> = ({ tier, size = 'md' }) => {
  // Tier label mapping
  const tierLabels: Record<SubscriptionTier, string> = {
    free: 'FREE',
    pro: 'PRO',
    pro_max: 'PRO MAX',
    enterprise_pro: 'ENTERPRISE PRO',
    enterprise_max: 'ENTERPRISE MAX',
    perpetual: 'PERPETUAL',
  };

  // Tier color mapping (using custom classes)
  const tierColors: Record<SubscriptionTier, string> = {
    free: 'bg-deep-navy-100 text-deep-navy-600',
    pro: 'bg-blue-100 text-blue-800',
    pro_max: 'bg-purple-100 text-purple-800',
    enterprise_pro: 'bg-indigo-100 text-indigo-800',
    enterprise_max: 'bg-pink-100 text-pink-800',
    perpetual: 'bg-green-100 text-green-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${tierColors[tier]} ${sizeClasses}`}
    >
      {tierLabels[tier]}
    </span>
  );
};

export default TierBadge;
