/**
 * FraudSeverityBadge Component
 *
 * Color-coded badge for displaying fraud severity levels
 */

import { cn } from '@/lib/utils';
import { getFraudSeverityColor } from '@/lib/plan111.utils';
import type { FraudSeverity } from '@/types/plan111.types';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface FraudSeverityBadgeProps {
  severity: FraudSeverity;
  showIcon?: boolean;
  className?: string;
}

export default function FraudSeverityBadge({
  severity,
  showIcon = true,
  className,
}: FraudSeverityBadgeProps) {
  const getIcon = () => {
    switch (severity) {
      case 'low':
        return <Info className="w-3 h-3" />;
      case 'medium':
        return <AlertCircle className="w-3 h-3" />;
      case 'high':
        return <AlertTriangle className="w-3 h-3" />;
      case 'critical':
        return <XCircle className="w-3 h-3" />;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getFraudSeverityColor(severity),
        className
      )}
    >
      {showIcon && getIcon()}
      <span className="capitalize">{severity}</span>
    </span>
  );
}
