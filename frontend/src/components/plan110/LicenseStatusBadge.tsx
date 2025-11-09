/**
 * LicenseStatusBadge Component
 *
 * Color-coded badge for displaying perpetual license status
 */

import { LicenseStatus } from '@/types/plan110.types';
import { getLicenseStatusColor, getLicenseStatusLabel } from '@/lib/plan110.utils';
import { cn } from '@/lib/utils';

interface LicenseStatusBadgeProps {
  status: LicenseStatus;
  className?: string;
}

export default function LicenseStatusBadge({ status, className }: LicenseStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border',
        getLicenseStatusColor(status),
        className
      )}
    >
      {getLicenseStatusLabel(status)}
    </span>
  );
}
