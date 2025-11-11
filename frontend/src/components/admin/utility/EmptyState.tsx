import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * EmptyState Component
 *
 * Display when no data available.
 * Features:
 * - Centered layout
 * - Optional icon (lucide-react)
 * - Optional action button
 * - Deep Navy theme
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="mb-4 p-4 bg-deep-navy-100 dark:bg-deep-navy-800 rounded-full">
        <div className="w-12 h-12 text-deep-navy-400 dark:text-deep-navy-500">
          {icon || <Inbox className="w-12 h-12" />}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-deep-navy-800 dark:text-white mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-deep-navy-600 dark:text-deep-navy-200 max-w-md mb-6">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-rephlo-blue dark:bg-electric-cyan text-white dark:text-deep-navy-900 rounded-lg font-medium text-sm hover:bg-rephlo-blue/90 dark:hover:bg-electric-cyan/90 focus:outline-none focus:ring-2 focus:ring-rephlo-blue dark:focus:ring-electric-cyan focus:ring-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
