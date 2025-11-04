import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-sm border border-deep-navy-300 bg-white px-3 py-2 text-body ring-offset-white placeholder:text-deep-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rephlo-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-deep-navy-100 disabled:text-deep-navy-400',
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
