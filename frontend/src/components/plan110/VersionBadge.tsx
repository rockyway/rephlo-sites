/**
 * VersionBadge Component
 *
 * SemVer version display with eligibility indicator
 */

import { Check, X as XIcon } from 'lucide-react';
import { isVersionEligible } from '@/lib/plan110.utils';
import { cn } from '@/lib/utils';

interface VersionBadgeProps {
  version: string;
  purchasedVersion?: string;
  showEligibility?: boolean;
  className?: string;
}

export default function VersionBadge({
  version,
  purchasedVersion,
  showEligibility = false,
  className,
}: VersionBadgeProps) {
  const eligible = purchasedVersion ? isVersionEligible(purchasedVersion, version) : true;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border font-mono',
        eligible
          ? 'text-green-600 bg-green-50 border-green-200'
          : 'text-red-600 bg-red-50 border-red-200',
        className
      )}
    >
      {version}
      {showEligibility && (
        <>
          {eligible ? (
            <Check className="h-3 w-3" />
          ) : (
            <XIcon className="h-3 w-3" />
          )}
        </>
      )}
    </span>
  );
}
