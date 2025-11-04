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
          'flex h-10 w-full rounded-md border bg-white px-lg py-md text-body',
          'placeholder:text-deep-navy-400',
          // File input styles
          'file:border-0 file:bg-transparent file:text-body file:font-medium',
          // Enhanced focus state with glow effect
          'focus-visible:outline-none',
          'focus-visible:ring-4 focus-visible:ring-rephlo-blue/20',
          'focus-visible:border-rephlo-blue',
          'focus-visible:shadow-md',
          // Smooth transitions
          'transition-all duration-fast ease-out',
          // Disabled state
          'disabled:cursor-not-allowed disabled:bg-deep-navy-100 disabled:text-deep-navy-400',
          // Conditional error state
          error
            ? 'border-red-500 bg-red-50 focus-visible:ring-red-500/20 focus-visible:border-red-500'
            : 'border-deep-navy-300',
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
