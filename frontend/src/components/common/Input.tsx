import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-10 w-full rounded-md border bg-white dark:bg-deep-navy-800 px-lg py-md text-body',
          'text-deep-navy-900 dark:text-deep-navy-100',
          'placeholder:text-deep-navy-400 dark:placeholder:text-deep-navy-500',
          // File input styles
          'file:border-0 file:bg-transparent file:text-body file:font-medium',
          // Enhanced focus state with glow effect
          'focus-visible:outline-none',
          'focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 dark:focus-visible:ring-electric-cyan/20',
          'focus-visible:border-rephlo-blue dark:focus-visible:border-electric-cyan',
          'focus-visible:shadow-md',
          // Smooth transitions
          'transition-all duration-fast ease-out',
          // Disabled state with better contrast
          'disabled:cursor-not-allowed disabled:bg-deep-navy-100 dark:disabled:bg-deep-navy-900',
          'disabled:text-deep-navy-500 dark:disabled:text-deep-navy-500',
          'disabled:border-deep-navy-200 dark:disabled:border-deep-navy-800',
          // Conditional error state
          error
            ? 'border-red-500 bg-red-50 dark:bg-red-950 focus-visible:ring-red-500/20 focus-visible:border-red-500'
            : 'border-deep-navy-300 dark:border-deep-navy-700',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export default Input;
