import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  cn(
    // Base spinner animation
    'animate-spin rounded-full',
    // Border styling with brand colors
    'border-gray-200 border-t-rephlo-blue',
    // Enhanced glow effect
    'shadow-lg',
    // Smooth animation timing
    'transition-all duration-slow ease-in-out'
  ),
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-3',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface LoadingSpinnerProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function LoadingSpinner({ size, className, ...props }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <div className={cn(spinnerVariants({ size }))} />
    </div>
  );
}

export default LoadingSpinner;
