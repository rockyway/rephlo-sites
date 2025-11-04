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
        variant === 'default' && 'bg-rephlo-blue/10 dark:bg-electric-cyan/10 text-rephlo-blue dark:text-electric-cyan',
        variant === 'accent' && 'bg-electric-cyan/10 dark:bg-rephlo-blue/10 text-electric-cyan-600 dark:text-rephlo-blue-400',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
    </span>
  );
}

export default FeatureBadge;
