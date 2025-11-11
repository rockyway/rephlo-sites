import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

/**
 * LoadingState Component
 *
 * Loading spinner with optional message.
 * Features:
 * - Animated spinner (lucide-react Loader2 icon)
 * - fullPage centers in viewport
 * - Inline mode for component-level loading
 * - Deep Navy theme
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  fullPage = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-rephlo-blue animate-spin" />
      <p className="text-sm text-deep-navy-600">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-deep-navy-50 z-50">
        {content}
      </div>
    );
  }

  return <div className="py-12">{content}</div>;
};

export default LoadingState;
