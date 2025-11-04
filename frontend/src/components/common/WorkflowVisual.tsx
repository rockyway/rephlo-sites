import { LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  icon?: LucideIcon;
  label: string;
}

interface WorkflowVisualProps {
  steps: WorkflowStep[];
  variant?: 'default' | 'compact';
  className?: string;
}

function WorkflowVisual({ steps, variant = 'default', className }: WorkflowVisualProps) {
  return (
    <div className={cn('flex items-center gap-sm', className)}>
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isMiddle = idx === 1 && steps.length === 3;

        return (
          <div key={idx} className="flex items-center gap-sm">
            {/* Step */}
            <div
              className={cn(
                'flex items-center gap-xs px-md py-xs rounded-md',
                'transition-all duration-base ease-out',
                variant === 'default' && 'bg-deep-navy-100 dark:bg-deep-navy-800',
                variant === 'compact' && 'bg-transparent',
                isMiddle && 'bg-gradient-rephlo text-white'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'h-4 w-4',
                    isMiddle ? 'text-white' : 'text-deep-navy-600 dark:text-deep-navy-300'
                  )}
                />
              )}
              <span
                className={cn(
                  'text-caption font-medium whitespace-nowrap',
                  isMiddle
                    ? 'text-white'
                    : 'text-deep-navy-700 dark:text-deep-navy-200'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Arrow separator (except for last step) */}
            {idx < steps.length - 1 && (
              <ArrowRight
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  'text-deep-navy-400 dark:text-deep-navy-500'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WorkflowVisual;
