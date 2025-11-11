import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-sm border border-deep-navy-300 dark:border-deep-navy-700 bg-white dark:bg-deep-navy-800 px-3 py-2 text-body text-deep-navy-900 dark:text-deep-navy-100 ring-offset-white dark:ring-offset-deep-navy-900 placeholder:text-deep-navy-600 dark:placeholder:text-deep-navy-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rephlo-blue dark:focus-visible:ring-electric-cyan focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-deep-navy-100 dark:disabled:bg-deep-navy-900 disabled:text-deep-navy-500 dark:disabled:text-deep-navy-500 disabled:border-deep-navy-200 dark:disabled:border-deep-navy-800',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export default Textarea;
