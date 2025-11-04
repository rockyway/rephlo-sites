import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <div
        className={cn(
          'animate-spin rounded-full border-rephlo-blue border-t-transparent',
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export default LoadingSpinner;
