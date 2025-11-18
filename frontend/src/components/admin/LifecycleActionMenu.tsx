import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Archive,
  Edit,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelInfo } from '@/types/model';

interface LifecycleActionMenuProps {
  model: ModelInfo;
  onMarkLegacy: () => void;
  onUnmarkLegacy: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onEditMeta: () => void;
  permissions: {
    canManageLifecycle: boolean;
    canEditMeta: boolean;
  };
}

/**
 * LifecycleActionMenu Component
 *
 * Dropdown menu for lifecycle actions on a model.
 * Shows different menu items based on current model status:
 * - Active → Mark Legacy, Archive, Edit Meta
 * - Legacy → Unmark Legacy, Archive, Edit Meta
 * - Archived → Unarchive only
 *
 * Respects RBAC permissions for showing/hiding actions.
 */
function LifecycleActionMenu({
  model,
  onMarkLegacy,
  onUnmarkLegacy,
  onArchive,
  onUnarchive,
  onEditMeta,
  permissions,
}: LifecycleActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  // Determine which actions are available based on model status
  const isArchived = model.isArchived;
  const isLegacy = model.isLegacy && !isArchived;
  const isActive = !model.isLegacy && !isArchived;

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-center',
          'h-8 w-8 rounded-md',
          'text-deep-navy-700 dark:text-deep-navy-200',
          'hover:bg-deep-navy-100 dark:hover:bg-deep-navy-800',
          'active:bg-deep-navy-200 dark:active:bg-deep-navy-700',
          'transition-all duration-fast ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rephlo-blue dark:focus-visible:ring-electric-cyan focus-visible:ring-offset-2'
        )}
        aria-label="Lifecycle actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-56 z-50',
            'bg-white dark:bg-deep-navy-800',
            'border border-deep-navy-200 dark:border-deep-navy-700',
            'rounded-lg shadow-lg',
            'py-1',
            'animate-scale-in'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Archived Model - Only show unarchive */}
          {isArchived && permissions.canManageLifecycle && (
            <button
              onClick={() => handleAction(onUnarchive)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2',
                'text-body-sm text-left',
                'text-deep-navy-700 dark:text-deep-navy-200',
                'hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700',
                'transition-colors duration-fast'
              )}
              role="menuitem"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Unarchive Model</span>
            </button>
          )}

          {/* Legacy Model Actions */}
          {isLegacy && permissions.canManageLifecycle && (
            <>
              <button
                onClick={() => handleAction(onUnmarkLegacy)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'text-body-sm text-left',
                  'text-deep-navy-700 dark:text-deep-navy-200',
                  'hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700',
                  'transition-colors duration-fast'
                )}
                role="menuitem"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Unmark Legacy</span>
              </button>
              <button
                onClick={() => handleAction(onArchive)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'text-body-sm text-left',
                  'text-deep-navy-700 dark:text-deep-navy-200',
                  'hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700',
                  'transition-colors duration-fast'
                )}
                role="menuitem"
              >
                <Archive className="h-4 w-4" />
                <span>Archive Model</span>
              </button>
            </>
          )}

          {/* Active Model Actions */}
          {isActive && permissions.canManageLifecycle && (
            <>
              <button
                onClick={() => handleAction(onMarkLegacy)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'text-body-sm text-left',
                  'text-amber-700 dark:text-amber-400',
                  'hover:bg-amber-50 dark:hover:bg-amber-900/20',
                  'transition-colors duration-fast'
                )}
                role="menuitem"
              >
                <AlertCircle className="h-4 w-4" />
                <span>Mark as Legacy</span>
              </button>
              <button
                onClick={() => handleAction(onArchive)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'text-body-sm text-left',
                  'text-deep-navy-700 dark:text-deep-navy-200',
                  'hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700',
                  'transition-colors duration-fast'
                )}
                role="menuitem"
              >
                <Archive className="h-4 w-4" />
                <span>Archive Model</span>
              </button>
            </>
          )}

          {/* Edit Meta - Available for all non-archived models */}
          {!isArchived && permissions.canEditMeta && (
            <>
              {/* Separator if there are other actions */}
              {permissions.canManageLifecycle && (
                <div className="my-1 h-px bg-deep-navy-200 dark:bg-deep-navy-700" />
              )}
              <button
                onClick={() => handleAction(onEditMeta)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2',
                  'text-body-sm text-left',
                  'text-deep-navy-700 dark:text-deep-navy-200',
                  'hover:bg-deep-navy-50 dark:hover:bg-deep-navy-700',
                  'transition-colors duration-fast'
                )}
                role="menuitem"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Metadata</span>
              </button>
            </>
          )}

          {/* No permissions state */}
          {!permissions.canManageLifecycle && !permissions.canEditMeta && (
            <div className="px-4 py-3 text-body-sm text-deep-navy-500 dark:text-deep-navy-400 text-center">
              No actions available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LifecycleActionMenu;
