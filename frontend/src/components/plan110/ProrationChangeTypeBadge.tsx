/**
 * ProrationChangeTypeBadge Component
 *
 * Badge for displaying proration change type with icon and color
 */

import { ProrationEventType } from '@/types/plan110.types';
import {
  getProrationChangeTypeColor,
  getProrationChangeTypeIcon,
  getProrationChangeTypeLabel,
} from '@/lib/plan110.utils';
import { cn } from '@/lib/utils';

interface ProrationChangeTypeBadgeProps {
  type: ProrationEventType;
  className?: string;
}

export default function ProrationChangeTypeBadge({ type, className }: ProrationChangeTypeBadgeProps) {
  const icon = getProrationChangeTypeIcon(type);
  const label = getProrationChangeTypeLabel(type);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-medium border',
        getProrationChangeTypeColor(type),
        className
      )}
    >
      {icon && <span className="text-sm">{icon}</span>}
      {label}
    </span>
  );
}
