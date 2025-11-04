import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableContentProps {
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  expandedLabel?: string;
  collapsedLabel?: string;
}

function ExpandableContent({
  children,
  className,
  buttonClassName,
  expandedLabel = 'Show Less',
  collapsedLabel = 'Read More',
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('relative', className)}>
      {/* Expandable Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!isExpanded}
      >
        <div className="pt-md">{children}</div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'mt-sm flex items-center gap-xs text-caption font-medium',
          'text-rephlo-blue dark:text-electric-cyan',
          'hover:text-rephlo-blue-600 dark:hover:text-electric-cyan-500',
          'transition-colors duration-base ease-out',
          'focus:outline-none focus:ring-2 focus:ring-rephlo-blue/50 dark:focus:ring-electric-cyan/50 rounded-sm px-xs',
          buttonClassName
        )}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? expandedLabel : collapsedLabel}
      >
        <span>{isExpanded ? expandedLabel : collapsedLabel}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export default ExpandableContent;
