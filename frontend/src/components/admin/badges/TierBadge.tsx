import React from 'react';
import { SubscriptionTier } from '@rephlo/shared-types';

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
  // Tier label mapping (using SubscriptionTier enum)
  const tierLabels: Record<SubscriptionTier, string> = {
    [SubscriptionTier.FREE]: 'FREE',
    [SubscriptionTier.PRO]: 'PRO',
    [SubscriptionTier.PRO_MAX]: 'PRO MAX',
    [SubscriptionTier.ENTERPRISE_PRO]: 'ENTERPRISE PRO',
    [SubscriptionTier.ENTERPRISE_MAX]: 'ENTERPRISE MAX',
    [SubscriptionTier.PERPETUAL]: 'PERPETUAL',
  };

  // Tier color mapping (using SubscriptionTier enum)
  const tierColors: Record<SubscriptionTier, string> = {
    [SubscriptionTier.FREE]: 'bg-deep-navy-100 dark:bg-deep-navy-700 text-deep-navy-600 dark:text-deep-navy-200',
    [SubscriptionTier.PRO]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    [SubscriptionTier.PRO_MAX]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    [SubscriptionTier.ENTERPRISE_PRO]: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    [SubscriptionTier.ENTERPRISE_MAX]: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    [SubscriptionTier.PERPETUAL]: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
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
