import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FeatureBadgeProps {
  icon?: LucideIcon;
  label: string;
  variant?: 'default' | 'accent';
  className?: string;
}

function FeatureBadge({ icon: Icon, label, variant = 'default', className }: FeatureBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs px-md py-xs rounded-full text-caption font-medium',
        'transition-all duration-base ease-out',
        variant === 'default' && 'bg-blue-100 dark:bg-cyan-900/30 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800/50',
        variant === 'accent' && 'bg-cyan-100 dark:bg-blue-900/30 text-cyan-700 dark:text-blue-300 border border-cyan-200 dark:border-blue-800/50',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
    </span>
  );
}

export default FeatureBadge;
