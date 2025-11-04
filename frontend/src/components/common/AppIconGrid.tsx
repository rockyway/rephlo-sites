import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppIcon {
  icon: LucideIcon;
  label: string;
  color?: string;
}

interface AppIconGridProps {
  apps: AppIcon[];
  className?: string;
}

function AppIconGrid({ apps, className }: AppIconGridProps) {
  return (
    <div className={cn('flex items-center gap-sm flex-wrap', className)}>
      {apps.map((app, idx) => {
        const Icon = app.icon;
        return (
          <div
            key={idx}
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-md',
              'bg-white dark:bg-deep-navy-700 shadow-sm',
              'border border-deep-navy-200 dark:border-deep-navy-600',
              'transition-all duration-base ease-out',
              'hover:scale-110 hover:shadow-md'
            )}
            title={app.label}
            aria-label={app.label}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                app.color || 'text-deep-navy-600 dark:text-deep-navy-300'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

export default AppIconGrid;
