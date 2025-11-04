import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-sm border border-deep-navy-300 bg-white px-3 py-2 text-body ring-offset-white file:border-0 file:bg-transparent file:text-body file:font-medium placeholder:text-deep-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rephlo-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-deep-navy-100 disabled:text-deep-navy-400',
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
