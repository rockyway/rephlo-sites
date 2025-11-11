import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCard {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
}

export interface AdminStatsGridProps {
  stats: StatCard[];
  columns?: 2 | 3 | 4;
}

/**
 * AdminStatsGrid Component
 *
 * Displays KPI statistics in a responsive grid.
 * Features:
 * - Grid layout responsive (4-col desktop, 2-col tablet, 1-col mobile)
 * - Stat cards with Deep Navy theme
 * - Optional change indicator (green arrow up, red arrow down)
 * - Optional icon display
 * - Configurable column count (2, 3, or 4)
 */
const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, columns = 4 }) => {
  const gridColsClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid ${gridColsClass} gap-6`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-deep-navy-800 rounded-lg shadow-sm border border-deep-navy-200 dark:border-deep-navy-700 p-6 hover:shadow-md transition-shadow duration-200"
        >
          {/* Header: Icon + Label */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-deep-navy-600 dark:text-deep-navy-200">{stat.label}</p>
            {stat.icon && (
              <div className="p-2 bg-blue-100 dark:bg-cyan-900/30 rounded-lg border border-blue-200 dark:border-cyan-800/50">
                <div className="text-blue-700 dark:text-cyan-300 w-5 h-5">{stat.icon}</div>
              </div>
            )}
          </div>

          {/* Value */}
          <div className="mb-2">
            <p className="text-3xl font-bold text-deep-navy-800 dark:text-white">{stat.value}</p>
          </div>

          {/* Change Indicator */}
          {stat.change && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                stat.change.trend === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : stat.change.trend === 'down'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-deep-navy-600 dark:text-deep-navy-200'
              }`}
            >
              {stat.change.trend === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : stat.change.trend === 'down' ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>
                {stat.change.trend === 'up'
                  ? '+'
                  : stat.change.trend === 'down'
                  ? '-'
                  : ''}
                {Math.abs(stat.change.value)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminStatsGrid;
