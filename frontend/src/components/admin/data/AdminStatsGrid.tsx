import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCard {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
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
          className="bg-white rounded-lg shadow-sm border border-deep-navy-200 p-6 hover:shadow-md transition-shadow duration-200"
        >
          {/* Header: Icon + Label */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-deep-navy-600">{stat.label}</p>
            {stat.icon && (
              <div className="p-2 bg-rephlo-blue/10 rounded-lg">
                <div className="text-rephlo-blue w-5 h-5">{stat.icon}</div>
              </div>
            )}
          </div>

          {/* Value */}
          <div className="mb-2">
            <p className="text-3xl font-bold text-deep-navy-800">{stat.value}</p>
          </div>

          {/* Change Indicator */}
          {stat.change && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                stat.change.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stat.change.trend === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {stat.change.trend === 'up' ? '+' : '-'}
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
