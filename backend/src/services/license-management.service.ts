/**
 * License Management Service (Plan 110)
 *
 * Handles perpetual license creation, activation, and management.
 * Implements machine fingerprinting, activation limits, and version eligibility.
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 * Reference: docs/reference/019-machine-fingerprinting-implementation.md
 */

import { injectable, inject } from 'tsyringe';
import {
  PrismaClient,
  perpetual_license,
  license_activation,
  version_upgrade,
} from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface DeviceInfo {
  fingerprint: string;
  deviceName?: string;
  osType?: string;
  osVersion?: string;
  cpuInfo?: string;
}

export interface LicenseActivationResult {
  activation: LicenseActivation;
  isNewActivation: boolean;
}

export interface VersionRange {
  minVersion: string;
  maxVersion: string;
}

// =============================================================================
// License Management Service Class
// =============================================================================

@injectable()
export class LicenseManagementService {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('LicenseManagementService: Initialized');
  }

  // ===========================================================================
  // License Purchase and Creation
  // ===========================================================================

  /**
   * Create a new perpetual license
   * @param userId - User purchasing the license
   * @param purchasePrice - Purchase price in USD
   * @param purchasedVersion - Version purchased (e.g., "1.0.0")
   * @returns Created perpetual license
   */
  async createPerpetualLicense(
    userId: string,
    purchasePrice: number,
    purchasedVersion: string = '1.0.0'
  ): Promise<PerpetualLicense> {
    logger.debug('LicenseManagementService: Creating perpetual license', {
      userId,
      purchasePrice,
      purchasedVersion,
    });

    // Generate unique license key
    const licenseKey = await this.generateLicenseKey();

    // Calculate eligible version range (all minor/patch within same major version)
    const majorVersion = this.extractMajorVersion(purchasedVersion);
    const eligibleUntilVersion = `${majorVersion}.99.99`;

    const license = await this.prisma.perpetual_license.create({
      data: {
        user_id: userId,
        license_key: licenseKey,
        purchase_price_usd: purchasePrice,
        purchased_version: purchasedVersion,
        eligible_until_version: eligibleUntilVersion,
        status: 'pending', // Will become 'active' after first activation
        max_activations: 3, // Default 3 devices
        current_activations: 0,
      },
    });

    logger.info('LicenseManagementService: Perpetual license created', {
      licenseId: license.id,
      licenseKey,
      userId,
    });

    return license;
  }

  /**
   * Generate a unique license key
   * Format: REPHLO-XXXX-XXXX-XXXX-XXXX (16 chars excluding dashes)
   * Uses alphanumeric chars excluding ambiguous ones (0, O, 1, I)
   * @returns Unique license key
   */
  async generateLicenseKey(): Promise<string> {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const segments = 4;
    const segmentLength = 4;

    let licenseKey: string;
    let isUnique = false;

    // Retry until unique key is generated
    while (!isUnique) {
      const keySegments: string[] = [];

      for (let i = 0; i < segments; i++) {
        let segment = '';
        for (let j = 0; j < segmentLength; j++) {
          const randomIndex = crypto.randomInt(0, chars.length);
          segment += chars[randomIndex];
        }
        keySegments.push(segment);
      }

      licenseKey = `REPHLO-${keySegments.join('-')}`;

      // Check uniqueness in database
      const existing = await this.prisma.perpetual_license.findUnique({
        where: { license_key: licenseKey },
      });

      isUnique = !existing;
    }

    return licenseKey!;
  }

  // ===========================================================================
  // Device Activation
  // ===========================================================================

  /**
   * Activate a device for a license
   * @param licenseKey - License key to activate
   * @param deviceInfo - Device information with fingerprint
   * @returns Activation result
   * @throws ValidationError if activation limit reached
   * @throws NotFoundError if license not found
   */
  async activateDevice(
    licenseKey: string,
    deviceInfo: DeviceInfo
  ): Promise<LicenseActivationResult> {
    logger.debug('LicenseManagementService: Activating device', {
      licenseKey,
      deviceFingerprint: deviceInfo.fingerprint,
    });

    // Find license with active activations
    const license = await this.prisma.perpetual_license.findUnique({
      where: { license_key: licenseKey },
      include: {
        license_activation: {
          where: { status: 'active' },
        },
      },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    if (license.status === 'revoked') {
      throw new ValidationError('License has been revoked');
    }

    if (license.status === 'suspended') {
      throw new ValidationError('License is currently suspended');
    }

    // Check if this device is already activated
    const existingActivation = license.activations.find(
      (a) => a.machine_fingerprint === deviceInfo.fingerprint
    );

    if (existingActivation) {
      // Update last seen time
      const updated = await this.prisma.license_activation.update({
        where: { id: existingActivation.id },
        data: { last_seen_at: new Date() },
      });

      logger.info('LicenseManagementService: Device already activated, updated last seen', {
        activationId: existingActivation.id,
        licenseKey,
      });

      return {
        activation: updated,
        isNewActivation: false,
      };
    }

    // Check activation limit
    if (license.activations.length >= license.max_activations) {
      throw new ValidationError(
        `Activation limit reached (${license.max_activations} devices max). Please deactivate a device first.`
      );
    }

    // Create new activation
    const activation = await this.prisma.license_activation.create({
      data: {
        license_id: license.id,
        user_id: license.user_id,
        machine_fingerprint: deviceInfo.fingerprint,
        device_name: deviceInfo.deviceName,
        os_type: deviceInfo.osType,
        os_version: deviceInfo.osVersion,
        cpu_info: deviceInfo.cpuInfo,
        status: 'active',
      },
    });

    // Update license activation count and status
    await this.prisma.perpetual_license.update({
      where: { id: license.id },
      data: {
        current_license_activation: { increment: 1 },
        status: 'active',
        activated_at: license.activated_at || new Date(),
      },
    });

    logger.info('LicenseManagementService: Device activated successfully', {
      activationId: activation.id,
      licenseKey,
      deviceFingerprint: deviceInfo.fingerprint,
    });

    return {
      activation,
      isNewActivation: true,
    };
  }

  /**
   * Deactivate a device
   * @param activationId - Activation ID to deactivate
   */
  async deactivateDevice(activationId: string): Promise<void> {
    logger.debug('LicenseManagementService: Deactivating device', { activationId });

    const activation = await this.prisma.license_activation.findUnique({
      where: { id: activationId },
      include: { perpetual_license: true },
    });

    if (!activation) {
      throw new NotFoundError('Activation not found');
    }

    if (activation.status !== 'active') {
      throw new ValidationError('Activation is not active');
    }

    // Update activation status
    await this.prisma.license_activation.update({
      where: { id: activationId },
      data: {
        status: 'deactivated',
        deactivated_at: new Date(),
      },
    });

    // Decrement license activation count
    await this.prisma.perpetual_license.update({
      where: { id: activation.license_id },
      data: {
        current_license_activation: { decrement: 1 },
      },
    });

    logger.info('LicenseManagementService: Device deactivated successfully', {
      activationId,
      licenseId: activation.license_id,
    });
  }

  /**
   * Replace a device (deactivate old, activate new)
   * @param oldActivationId - Old activation to replace
   * @param newDeviceInfo - New device information
   * @returns New activation
   */
  async replaceDevice(
    oldActivationId: string,
    newDeviceInfo: DeviceInfo
  ): Promise<LicenseActivation> {
    logger.debug('LicenseManagementService: Replacing device', {
      oldActivationId,
      newFingerprint: newDeviceInfo.fingerprint,
    });

    const oldActivation = await this.prisma.license_activation.findUnique({
      where: { id: oldActivationId },
      include: { perpetual_license: true },
    });

    if (!oldActivation) {
      throw new NotFoundError('Old activation not found');
    }

    // Mark old activation as replaced
    await this.prisma.license_activation.update({
      where: { id: oldActivationId },
      data: {
        status: 'replaced',
        deactivated_at: new Date(),
      },
    });

    // Create new activation (this will decrement and increment, net zero)
    await this.prisma.perpetual_license.update({
      where: { id: oldActivation.license_id },
      data: {
        current_license_activation: { decrement: 1 },
      },
    });

    const result = await this.activateDevice(oldActivation.license.license_key, newDeviceInfo);

    logger.info('LicenseManagementService: Device replaced successfully', {
      oldActivationId,
      newActivationId: result.activation.id,
    });

    return result.activation;
  }

  // ===========================================================================
  // Machine Fingerprinting
  // ===========================================================================

  /**
   * Generate machine fingerprint (SHA-256 hash)
   * @param deviceInfo - Device hardware information
   * @returns SHA-256 fingerprint
   */
  generateMachineFingerprint(deviceInfo: {
    cpuId: string;
    macAddress: string;
    diskSerial: string;
    osVersion: string;
  }): string {
    const components = [
      deviceInfo.cpuId,
      deviceInfo.macAddress,
      deviceInfo.diskSerial,
      deviceInfo.osVersion,
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /**
   * Detect if a fingerprint is already activated on another license (fraud detection)
   * @param licenseId - Current license ID
   * @param fingerprint - Machine fingerprint to check
   * @returns True if duplicate found
   */
  async detectDuplicateActivation(licenseId: string, fingerprint: string): Promise<boolean> {
    const duplicates = await this.prisma.license_activation.findMany({
      where: {
        machine_fingerprint: fingerprint,
        status: 'active',
        license_id: { not: licenseId },
      },
    });

    if (duplicates.length > 0) {
      logger.warn('LicenseManagementService: Duplicate activation detected', {
        fingerprint,
        licenseId,
        duplicateCount: duplicates.length,
      });
    }

    return duplicates.length > 0;
  }

  // ===========================================================================
  // License Management
  // ===========================================================================

  /**
   * Check if license has reached activation limit
   * @param licenseId - License ID to check
   * @returns True if limit reached
   */
  async checkActivationLimit(licenseId: string): Promise<boolean> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
      include: {
        license_activation: {
          where: { status: 'active' },
        },
      },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    return license.activations.length >= license.max_activations;
  }

  /**
   * Get all active devices for a license
   * @param licenseId - License ID
   * @returns List of active activations
   */
  async getActiveDevices(licenseId: string): Promise<LicenseActivation[]> {
    const activations = await this.prisma.license_activation.findMany({
      where: {
        license_id: licenseId,
        status: 'active',
      },
      orderBy: { activated_at: 'desc' },
    });

    return activations;
  }

  /**
   * Suspend a license (admin action)
   * @param licenseId - License ID to suspend
   * @param reason - Reason for suspension
   * @returns Updated license
   */
  async suspendLicense(licenseId: string, reason: string): Promise<PerpetualLicense> {
    logger.warn('LicenseManagementService: Suspending license', { licenseId, reason });

    const license = await this.prisma.perpetual_license.update({
      where: { id: licenseId },
      data: { status: 'suspended' },
    });

    logger.info('LicenseManagementService: License suspended', { licenseId });

    return license;
  }

  /**
   * Revoke a license permanently (admin action for fraud/abuse)
   * @param licenseId - License ID to revoke
   * @param reason - Reason for revocation
   * @returns Updated license
   */
  async revokeLicense(licenseId: string, reason: string): Promise<PerpetualLicense> {
    logger.warn('LicenseManagementService: Revoking license', { licenseId, reason });

    // Deactivate all active devices
    await this.prisma.license_activation.updateMany({
      where: {
        license_id: licenseId,
        status: 'active',
      },
      data: {
        status: 'deactivated',
        deactivated_at: new Date(),
      },
    });

    const license = await this.prisma.perpetual_license.update({
      where: { id: licenseId },
      data: {
        status: 'revoked',
        current_activations: 0,
      },
    });

    logger.info('LicenseManagementService: License revoked', { licenseId });

    return license;
  }

  /**
   * Reactivate a suspended license
   * @param licenseId - License ID to reactivate
   * @returns Updated license
   */
  async reactivateLicense(licenseId: string): Promise<PerpetualLicense> {
    logger.info('LicenseManagementService: Reactivating license', { licenseId });

    const license = await this.prisma.perpetual_license.update({
      where: { id: licenseId },
      data: { status: 'active' },
    });

    return license;
  }

  // ===========================================================================
  // Version Eligibility
  // ===========================================================================

  /**
   * Check if a version is eligible for a license (used by VersionUpgradeService)
   * @param licenseKey - License key
   * @param requestedVersion - Version to check (SemVer format)
   * @returns True if version is eligible
   */
  async checkVersionEligibility(licenseKey: string, requestedVersion: string): Promise<boolean> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { license_key: licenseKey },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    // Compare versions (simple string comparison works for SemVer)
    return this.isVersionEligible(
      license.purchased_version,
      license.eligible_until_version,
      requestedVersion
    );
  }

  /**
   * Get eligible version range for a license
   * @param licenseId - License ID
   * @returns Version range
   */
  async getEligibleVersionRange(licenseId: string): Promise<VersionRange> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    return {
      minVersion: license.purchased_version,
      maxVersion: license.eligible_until_version,
    };
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /**
   * Get license by key
   * @param licenseKey - License key
   * @returns License or null
   */
  async getLicenseByKey(
    licenseKey: string
  ): Promise<
    | (PerpetualLicense & {
        activations: LicenseActivation[];
        versionUpgrades: VersionUpgrade[];
      })
    | null
  > {
    return this.prisma.perpetual_license.findUnique({
      where: { license_key: licenseKey },
      include: {
        license_activation: true,
        version_upgrades: true,
      },
    });
  }

  /**
   * Get all licenses for a user
   * @param userId - User ID
   * @returns List of licenses
   */
  async getUserLicenses(userId: string): Promise<PerpetualLicense[]> {
    return this.prisma.perpetual_license.findMany({
      where: { user_id: userId },
      include: {
        license_activation: { where: { status: 'active' } },
        version_upgrades: true,
      },
      orderBy: { purchased_at: 'desc' },
    });
  }

  /**
   * Get license activation history
   * @param licenseId - License ID
   * @returns Activation history
   */
  async getLicenseActivationHistory(licenseId: string): Promise<LicenseActivation[]> {
    return this.prisma.license_activation.findMany({
      where: { license_id: licenseId },
      orderBy: { activated_at: 'desc' },
    });
  }

  /**
   * List all licenses with pagination and filters
   * @param filters - Optional filters (page, limit, status, tier)
   * @returns Paginated licenses
   */
  async listAllLicenses(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
  }): Promise<{ data: PerpetualLicense[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    logger.debug('LicenseManagementService.listAllLicenses', { filters });

    try {
      const where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.tier) {
        where.tier = filters.tier;
      }

      const [licenses, total] = await Promise.all([
        this.prisma.perpetual_license.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        }),
        this.prisma.perpetual_license.count({ where }),
      ]);

      return {
        data: licenses,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('LicenseManagementService.listAllLicenses: Error', { error });
      throw error;
    }
  }

  /**
   * Get license statistics for dashboard
   * @returns License stats (total, by status, by tier)
   */
  async getLicenseStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    revoked: number;
    byTier: Record<string, number>;
  }> {
    logger.debug('LicenseManagementService.getLicenseStats');

    try {
      const [total, byStatus] = await Promise.all([
        this.prisma.perpetual_license.count(),
        this.prisma.perpetual_license.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
      ]);

      const statusCounts = byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        total,
        active: statusCounts.active || 0,
        suspended: statusCounts.suspended || 0,
        revoked: statusCounts.revoked || 0,
        byTier: {}, // Perpetual licenses don't have tiers
      };
    } catch (error) {
      logger.error('LicenseManagementService.getLicenseStats: Error', { error });
      throw error;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Extract major version from SemVer string
   * @param version - Version string (e.g., "1.0.0")
   * @returns Major version number
   */
  private extractMajorVersion(version: string): number {
    const parts = version.split('.');
    return parseInt(parts[0], 10);
  }

  /**
   * Check if requested version is within eligible range (simple SemVer comparison)
   * @param _purchasedVersion - Originally purchased version (unused)
   * @param eligibleUntilVersion - Maximum eligible version
   * @param requestedVersion - Version to check
   * @returns True if eligible
   */
  private isVersionEligible(
    _purchasedVersion: string,
    eligibleUntilVersion: string,
    requestedVersion: string
  ): boolean {
    // Simple string comparison works for SemVer if properly formatted
    // "1.5.2" <= "1.99.99" is true
    // "2.0.0" <= "1.99.99" is false
    return requestedVersion <= eligibleUntilVersion;
  }
}
