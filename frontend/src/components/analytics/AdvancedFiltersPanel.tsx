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
    // When switching to custom, set default date range (last 30 days)
    if (period === 'custom' && !filters.startDate && !filters.endDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      onChange({
        period,
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        endDate: endDate.toISOString().split('T')[0],
      });
    } else if (period !== 'custom') {
      // Clear custom dates when switching to preset periods
      onChange({ period, startDate: undefined, endDate: undefined });
    } else {
      onChange({ period });
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onChange({ [field]: value });
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

        {/* Custom Date Range Pickers */}
        {filters.period === 'custom' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="start-date"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-900 text-deep-navy-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rephlo-blue"
                max={filters.endDate || undefined}
              />
            </div>
            <div>
              <label
                htmlFor="end-date"
                className="block text-body-sm font-medium text-deep-navy-700 dark:text-deep-navy-200 mb-2"
              >
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-deep-navy-200 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-900 text-deep-navy-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rephlo-blue"
                min={filters.startDate || undefined}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}
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
