/**
 * Tier Configuration Table Component (Plan 190)
 *
 * Displays all tier configurations in a table format with actions.
 *
 * Features:
 * - Displays tier name, credits, pricing, version, last modified
 * - Action buttons for edit and view history
 * - Responsive design with mobile support
 * - Highlighted rows for active tiers
 */

import React from 'react';
import { Edit, History, CheckCircle, XCircle } from 'lucide-react';
import type { TierConfig } from '@rephlo/shared-types';
import Button from '../common/Button';
import { cn } from '../../lib/utils';

// =============================================================================
// Component Props
// =============================================================================

interface TierConfigTableProps {
  tiers: TierConfig[];
  onEditClick: (tier: TierConfig) => void;
  onHistoryClick: (tier: TierConfig) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format currency in USD
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Format date in short format
 */
const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

/**
 * Get tier display name with proper capitalization
 */
const getTierDisplayName = (tierName: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'pro_plus': 'Pro+',
    'pro_max': 'Pro Max',
    'enterprise_pro': 'Enterprise Pro',
    'enterprise_pro_plus': 'Enterprise Pro+',
  };

  if (specialCases[tierName]) {
    return specialCases[tierName];
  }

  // Default: capitalize first letter
  return tierName.charAt(0).toUpperCase() + tierName.slice(1);
};

/**
 * Get tier color class based on tier name
 */
const getTierColorClass = (tierName: string): string => {
  const colors: Record<string, string> = {
    free: 'bg-gray-400',
    pro: 'bg-rephlo-blue',
    pro_plus: 'bg-blue-500',
    pro_max: 'bg-indigo-600',
    enterprise_pro: 'bg-purple-600',
    enterprise_pro_plus: 'bg-purple-700',
  };
  return colors[tierName.toLowerCase()] || 'bg-gray-400';
};

// =============================================================================
// Component
// =============================================================================

const TierConfigTable: React.FC<TierConfigTableProps> = ({
  tiers,
  onEditClick,
  onHistoryClick,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead className="bg-deep-navy-50 dark:bg-deep-navy-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Tier
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Monthly Credits
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Monthly Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Annual Price
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Version
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Last Modified
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-deep-navy-700 dark:text-deep-navy-200 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-deep-navy-100 dark:divide-deep-navy-700">
          {tiers.map((tier) => (
            <tr
              key={tier.id}
              className="hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700 dark:bg-deep-navy-900 transition-colors"
            >
              {/* Tier Name */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      getTierColorClass(tier.tierName)
                    )}
                  />
                  <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                    {getTierDisplayName(tier.tierName)}
                  </span>
                </div>
              </td>

              {/* Monthly Credits */}
              <td className="px-6 py-4 text-right">
                <span className="text-body font-medium text-deep-navy-800 dark:text-white">
                  {tier.monthlyCreditAllocation.toLocaleString()}
                </span>
              </td>

              {/* Monthly Price */}
              <td className="px-6 py-4 text-right">
                <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                  {formatCurrency(tier.monthlyPriceUsd)}
                </span>
              </td>

              {/* Annual Price */}
              <td className="px-6 py-4 text-right">
                <span className="text-body text-deep-navy-700 dark:text-deep-navy-200">
                  {formatCurrency(tier.annualPriceUsd)}
                </span>
              </td>

              {/* Config Version */}
              <td className="px-6 py-4 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-deep-navy-100 dark:bg-deep-navy-700 text-deep-navy-700 dark:text-deep-navy-200 border border-deep-navy-300 dark:border-deep-navy-600">
                  v{tier.configVersion}
                </span>
              </td>

              {/* Last Modified */}
              <td className="px-6 py-4">
                <span className="text-body-sm text-deep-navy-600 dark:text-deep-navy-300">
                  {formatDate(tier.lastModifiedAt)}
                </span>
              </td>

              {/* Status */}
              <td className="px-6 py-4 text-center">
                {tier.isActive ? (
                  <div className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Inactive</span>
                  </div>
                )}
              </td>

              {/* Actions */}
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditClick(tier)}
                    title="Edit Configuration"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onHistoryClick(tier)}
                    title="View History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TierConfigTable;
