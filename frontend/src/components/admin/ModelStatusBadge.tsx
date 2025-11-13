import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { ModelLifecycleStatus } from '@/types/model';

interface ModelStatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  isLegacy: boolean;
  isArchived: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  active: {
    label: 'Active',
    bgColor: 'bg-green-100 dark:bg-green-900',
    textColor: 'text-green-800 dark:text-green-100',
    borderColor: 'border-green-300 dark:border-green-600',
    dotColor: 'bg-green-500 dark:bg-green-400',
  },
  legacy: {
    label: 'Legacy',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    textColor: 'text-amber-800 dark:text-amber-100',
    borderColor: 'border-amber-300 dark:border-amber-600',
    dotColor: 'bg-amber-500 dark:bg-amber-400',
  },
  archived: {
    label: 'Archived',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-800 dark:text-gray-100',
    borderColor: 'border-gray-300 dark:border-gray-600',
    dotColor: 'bg-gray-500 dark:bg-gray-400',
  },
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 text-caption',
    dot: 'h-1.5 w-1.5',
    gap: 'gap-1',
  },
  md: {
    container: 'px-2.5 py-1 text-body-sm',
    dot: 'h-2 w-2',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-body',
    dot: 'h-2.5 w-2.5',
    gap: 'gap-2',
  },
};

/**
 * ModelStatusBadge Component
 *
 * Displays the lifecycle status of a model as a colored badge:
 * - Active (green): isLegacy=false, isArchived=false
 * - Legacy (amber): isLegacy=true, isArchived=false
 * - Archived (gray): isArchived=true
 *
 * Includes a colored dot indicator for visual emphasis.
 */
function ModelStatusBadge({
  isLegacy,
  isArchived,
  size = 'md',
  className,
  ...props
}: ModelStatusBadgeProps) {
  // Determine status (archived takes precedence)
  const status: ModelLifecycleStatus = isArchived ? 'archived' : isLegacy ? 'legacy' : 'active';
  const config = statusConfig[status];
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        'transition-all duration-fast ease-out',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClass.container,
        sizeClass.gap,
        className
      )}
      {...props}
    >
      {/* Status dot indicator */}
      <span
        className={cn(
          'rounded-full',
          config.dotColor,
          sizeClass.dot
        )}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  );
}

export default ModelStatusBadge;
