/**
 * DeviceActivationCard Component
 *
 * Card displaying device activation info with status indicator
 */

import { Monitor, Trash2 } from 'lucide-react';
import { LicenseActivation, ActivationStatus } from '@/types/plan110.types';
import {
  getDeviceStatusIcon,
  getDeviceStatus,
  getDeviceStatusColor,
  formatMachineFingerprint,
  formatDateTime,
} from '@/lib/plan110.utils';
import Button from '@/components/common/Button';

interface DeviceActivationCardProps {
  activation: LicenseActivation;
  onDeactivate?: (activationId: string) => void;
  showActions?: boolean;
}

export default function DeviceActivationCard({
  activation,
  onDeactivate,
  showActions = true,
}: DeviceActivationCardProps) {
  const status = getDeviceStatus(activation.lastSeenAt, activation.isActive);
  const statusIcon = getDeviceStatusIcon(activation.lastSeenAt);
  const statusColor = getDeviceStatusColor(status);

  const getStatusLabel = (status: ActivationStatus): string => {
    switch (status) {
      case ActivationStatus.ACTIVE:
        return 'Active - Last seen < 7 days ago';
      case ActivationStatus.INACTIVE:
        return 'Inactive - Last seen 7-30 days ago';
      case ActivationStatus.STALE:
        return 'Stale - Last seen > 30 days ago';
      case ActivationStatus.DEACTIVATED:
        return 'Deactivated';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white border border-deep-navy-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Monitor className="h-5 w-5 text-deep-navy-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-body font-medium text-deep-navy-800">
                {activation.machineName || 'Unknown Device'}
              </h4>
              <span className="text-xl" title={getStatusLabel(status)}>
                {statusIcon}
              </span>
            </div>
            <div className="space-y-1 text-body-sm text-deep-navy-600">
              {activation.osVersion && (
                <div>
                  <span className="text-deep-navy-500">OS:</span> {activation.osVersion}
                </div>
              )}
              <div>
                <span className="text-deep-navy-500">Fingerprint:</span>{' '}
                <span className="font-mono text-caption">
                  {formatMachineFingerprint(activation.machineFingerprint)}
                </span>
              </div>
              <div>
                <span className="text-deep-navy-500">Activated:</span> {formatDateTime(activation.activatedAt)}
              </div>
              <div>
                <span className="text-deep-navy-500">Last Seen:</span>{' '}
                <span className={statusColor}>{formatDateTime(activation.lastSeenAt)}</span>
              </div>
              {activation.deactivatedAt && (
                <div>
                  <span className="text-deep-navy-500">Deactivated:</span>{' '}
                  {formatDateTime(activation.deactivatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {showActions && activation.isActive && onDeactivate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeactivate(activation.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
