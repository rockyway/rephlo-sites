/**
 * AdvancedFiltersPanel Component
 *
 * Filter controls for analytics dashboard.
 * Reference: Plan 180 Section 4.5
 */

import React from 'react';
import type { AnalyticsFilters, PeriodType, SubscriptionTier } from '@/types/analytics.types';

interface AdvancedFiltersPanelProps {
  filters: AnalyticsFilters;
  onChange: (filters: Partial<AnalyticsFilters>) => void;
}

export const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({ filters, onChange }) => {
  const providers = ['openai', 'anthropic', 'google', 'azure', 'mistral'];

  const handlePeriodChange = (period: PeriodType) => {
    onChange({ period });
  };

  const handleTierChange = (tier: SubscriptionTier | 'all') => {
    onChange({ tier: tier === 'all' ? undefined : tier });
  };

  const handleProviderToggle = (provider: string) => {
    const current = filters.providers || [];
    const updated = current.includes(provider)
      ? current.filter(p => p !== provider)
      : [...current, provider];
    onChange({ providers: updated.length > 0 ? updated : undefined });
  };

  return (
    <div className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6">
      <h2 className="text-lg font-semibold text-deep-navy-800 dark:text-white mb-4">Filters</h2>

      {/* Period Selector */}
      <div className="mb-6">
        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
          Period
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['last_7_days', 'last_30_days', 'last_90_days', 'custom'] as PeriodType[]).map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                filters.period === period
                  ? 'bg-rephlo-blue text-white'
                  : 'bg-deep-navy-50 dark:bg-deep-navy-900 text-deep-navy-700 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800'
              }`}
              aria-pressed={filters.period === period}
            >
              {period === 'custom' ? 'Custom' : period.replace('last_', 'Last ').replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Selector */}
      <div className="mb-6">
        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
          Subscription Tier
        </label>
        <div className="flex gap-2">
          {(['all', 'free', 'pro', 'enterprise'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => handleTierChange(tier)}
              className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors capitalize ${
                (tier === 'all' && !filters.tier) || filters.tier === tier
                  ? 'bg-rephlo-blue text-white'
                  : 'bg-deep-navy-50 dark:bg-deep-navy-900 text-deep-navy-700 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800'
              }`}
              aria-pressed={(tier === 'all' && !filters.tier) || filters.tier === tier}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Multi-Select */}
      <div>
        <label className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2">
          Providers
        </label>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <button
              key={provider}
              onClick={() => handleProviderToggle(provider)}
              className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors capitalize ${
                filters.providers?.includes(provider)
                  ? 'bg-rephlo-blue text-white'
                  : 'bg-deep-navy-50 dark:bg-deep-navy-900 text-deep-navy-700 dark:text-deep-navy-200 hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800'
              }`}
              aria-pressed={filters.providers?.includes(provider)}
            >
              {provider}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
