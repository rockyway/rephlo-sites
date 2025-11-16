/**
 * Device Activation Management Service
 *
 * Handles device activation queries and management for admin dashboard.
 * Provides comprehensive device activation data with fraud detection support.
 *
 * Reference: docs/analysis/033-license-management-api-schema-analysis.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, ActivationStatus } from '@prisma/client';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface DeviceActivationData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  licenseId: string;
  licenseKey: string;
  deviceName: string | null;
  deviceId: string; // machine fingerprint
  os: string | null;
  ipAddress: string | null;
  activatedAt: string;
  lastSeenAt: string;
  status: ActivationStatus;
  isSuspicious: boolean;
  suspiciousFlags: string[];
}

export interface DeviceStats {
  totalActive: number;
  licensesAtMaxCapacity: number;
  recentlyActivated24h: number;
  suspiciousActivations: number;
}

export interface DeviceActivationFilters {
  status?: ActivationStatus;
  os?: string;
  suspicious?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDeviceActivationResponse {
  devices: DeviceActivationData[];
  stats: DeviceStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Device Activation Management Service Class
// =============================================================================

@injectable()
export class DeviceActivationManagementService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('DeviceActivationManagementService: Initialized');
  }

  /**
   * Get all device activations with filters and pagination
   */
  async getAllDeviceActivations(
    filters: DeviceActivationFilters
  ): Promise<PaginatedDeviceActivationResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.os) {
      where.osType = {
        contains: filters.os,
        mode: 'insensitive',
      };
    }

    if (filters.suspicious !== undefined) {
      where.isSuspicious = filters.suspicious;
    }

    if (filters.search) {
      where.OR = [
        {
          deviceName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            email: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          license: {
            licenseKey: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Get total count and data
    const [total, activations, stats] = await Promise.all([
      this.prisma.license_activation.count({ where }),
      this.prisma.license_activation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          license: {
            select: {
              id: true,
              license_key: true,
              max_activations: true,
              current_activations: true,
            },
          },
        },
        orderBy: { activated_at: 'desc' },
        skip,
        take: limit,
      }),
      this.getDeviceStats(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Map to DeviceActivationData format
    const devices: DeviceActivationData[] = activations.map((activation) => {
      const user = (activation as any).user;
      const license = (activation as any).license;
      const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';

      return {
        id: activation.id,
        userId: activation.user_id,
        userName,
        userEmail: user?.email || 'Unknown',
        licenseId: activation.license_id,
        licenseKey: license?.license_key || 'Unknown',
        deviceName: activation.device_name,
        deviceId: activation.machine_fingerprint,
        os: activation.os_type,
        ipAddress: activation.ip_address || null,
        activatedAt: activation.activated_at.toISOString(),
        lastSeenAt: activation.last_seen_at.toISOString(),
        status: activation.status,
        isSuspicious: activation.is_suspicious,
        suspiciousFlags: Array.isArray(activation.suspicious_flags)
          ? (activation.suspicious_flags as string[])
          : [],
      };
    });

    return {
      devices,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get device statistics for dashboard cards
   */
  async getDeviceStats(): Promise<DeviceStats> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalActive, suspiciousActivations, recentlyActivated24h, licenses] = await Promise.all([
      this.prisma.license_activation.count({
        where: { status: 'active' },
      }),
      this.prisma.license_activation.count({
        where: { is_suspicious: true },
      }),
      this.prisma.license_activation.count({
        where: {
          activated_at: {
            gte: yesterday,
          },
        },
      }),
      this.prisma.perpetual_license.findMany({
        select: {
          max_activations: true,
          current_activations: true,
        },
      }),
    ]);

    // Count licenses at max capacity
    const licensesAtMaxCapacity = licenses.filter(
      (license) => license.current_activations >= license.max_activations
    ).length;

    return {
      totalActive,
      licensesAtMaxCapacity,
      recentlyActivated24h,
      suspiciousActivations,
    };
  }

  /**
   * Deactivate a device (user-initiated)
   */
  async deactivateDevice(activationId: string): Promise<void> {
    const activation = await this.prisma.license_activation.findUnique({
      where: { id: activationId },
      include: { license: true },
    });

    if (!activation) {
      throw new NotFoundError('Device activation not found');
    }

    // Update activation status
    await this.prisma.license_activation.update({
      where: { id: activationId },
      data: {
        status: 'deactivated',
        deactivated_at: new Date(),
      },
    });

    // Decrement current activations count on license
    await this.prisma.perpetual_license.update({
      where: { id: activation.license_id },
      data: {
        current_activations: {
          decrement: 1,
        },
      },
    });

    logger.info('DeviceActivationManagementService: Device deactivated', {
      activationId,
      licenseId: activation.license_id,
    });
  }

  /**
   * Revoke a device (admin-initiated, permanent)
   */
  async revokeDevice(activationId: string, reason: string): Promise<void> {
    const activation = await this.prisma.license_activation.findUnique({
      where: { id: activationId },
      include: { license: true },
    });

    if (!activation) {
      throw new NotFoundError('Device activation not found');
    }

    // Mark as deactivated with revocation reason
    await this.prisma.license_activation.update({
      where: { id: activationId },
      data: {
        status: 'deactivated',
        deactivated_at: new Date(),
        is_suspicious: true,
        suspicious_flags: [
          ...(Array.isArray(activation.suspicious_flags) ? activation.suspicious_flags : []),
          `admin_revoked: ${reason}`,
        ],
      },
    });

    // Decrement current activations count on license if still active
    if (activation.status === 'active') {
      await this.prisma.perpetual_license.update({
        where: { id: activation.license_id },
        data: {
          current_activations: {
            decrement: 1,
          },
        },
      });
    }

    logger.warn('DeviceActivationManagementService: Device revoked', {
      activationId,
      licenseId: activation.license_id,
      reason,
    });
  }

  /**
   * Bulk device operations (deactivate or revoke multiple devices)
   */
  async bulkAction(
    deviceIds: string[],
    action: 'deactivate' | 'revoke',
    reason?: string
  ): Promise<{ affectedCount: number }> {
    let affectedCount = 0;

    // Process each device sequentially to ensure proper license count updates
    for (const deviceId of deviceIds) {
      try {
        if (action === 'deactivate') {
          await this.deactivateDevice(deviceId);
        } else if (action === 'revoke') {
          await this.revokeDevice(deviceId, reason || 'Bulk revocation');
        }
        affectedCount++;
      } catch (error) {
        logger.error('DeviceActivationManagementService: Bulk action failed for device', {
          deviceId,
          action,
          error,
        });
        // Continue with other devices even if one fails
      }
    }

    logger.info('DeviceActivationManagementService: Bulk action completed', {
      action,
      requestedCount: deviceIds.length,
      affectedCount,
    });

    return { affectedCount };
  }

  /**
   * Flag device as suspicious
   */
  async flagAsSuspicious(activationId: string, flags: string[]): Promise<void> {
    await this.prisma.license_activation.update({
      where: { id: activationId },
      data: {
        is_suspicious: true,
        suspicious_flags: flags,
      },
    });

    logger.warn('DeviceActivationManagementService: Device flagged as suspicious', {
      activationId,
      flags,
    });
  }
}
