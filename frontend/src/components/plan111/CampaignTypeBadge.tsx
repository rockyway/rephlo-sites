/**
 * CampaignTypeBadge Component
 *
 * Color-coded badge for displaying campaign types
 */

import { cn } from '@/lib/utils';
import {
  getCampaignTypeColor,
  getCampaignTypeLabel,
} from '@/lib/plan111.utils';
import type { CampaignType } from '@/types/plan111.types';

interface CampaignTypeBadgeProps {
  type: CampaignType;
  className?: string;
}

export default function CampaignTypeBadge({
  type,
  className,
}: CampaignTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getCampaignTypeColor(type),
        className
      )}
    >
      {getCampaignTypeLabel(type)}
    </span>
  );
}
