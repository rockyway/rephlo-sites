/**
 * CSVExportButton Component
 *
 * Triggers CSV export with loading state.
 * Reference: Plan 180 Section 4.6
 */

import React from 'react';
import { Download } from 'lucide-react';
import { useExportCSV } from '@/hooks/useAnalytics';
import type { AnalyticsFilters } from '@/types/analytics.types';

interface CSVExportButtonProps {
  filters: AnalyticsFilters;
}

export const CSVExportButton: React.FC<CSVExportButtonProps> = ({ filters }) => {
  const { mutate: exportCSV, isPending, isError } = useExportCSV();

  const handleExport = () => {
    exportCSV({
      period: filters.period,
      startDate: filters.startDate,
      endDate: filters.endDate,
      tier: filters.tier,
      providers: filters.providers,
      models: filters.models,
    });
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-rephlo-blue hover:bg-rephlo-blue-600 disabled:bg-deep-navy-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:ring-offset-2"
        aria-label="Export analytics data to CSV"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleExport();
          }
        }}
      >
        {isPending ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export CSV
          </>
        )}
      </button>

      {isError && (
        <p className="text-body-sm text-red-600 dark:text-red-400 mt-2" role="alert">
          Export failed. Please try again.
        </p>
      )}
    </div>
  );
};
