/**
 * Version Upgrade Service (Plan 110)
 *
 * Handles SemVer version parsing, upgrade eligibility checks, and major version upgrade purchases.
 * Implements early bird and loyalty discount logic for version upgrades.
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, version_upgrade as VersionUpgrade, perpetual_license as PerpetualLicense } from '@prisma/client';
import semver from 'semver';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface SemVerObject {
  major: number;
  minor: number;
  patch: number;
}

export interface UpgradePricing {
  basePrice: number;
  earlyBirdDiscount: number;
  loyaltyDiscount: number;
  finalPrice: number;
  discountReason?: string;
}

export interface AvailableUpgrade {
  fromVersion: string;
  toVersion: string;
  upgradeType: 'major' | 'minor' | 'patch';
  isFree: boolean;
  price?: number;
  isEarlyBird?: boolean;
}

// =============================================================================
// Version Upgrade Service Class
// =============================================================================

@injectable()
export class VersionUpgradeService {
  // Standard pricing constants
  private readonly MAJOR_UPGRADE_BASE_PRICE = 99.0; // $99 for major version upgrade
  private readonly EARLY_BIRD_DISCOUNT = 0.2; // 20% off if within 90 days
  private readonly LOYALTY_DISCOUNT = 0.3; // 30% off if upgraded previous version
  private readonly EARLY_BIRD_WINDOW_DAYS = 90;

  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {
    logger.debug('VersionUpgradeService: Initialized');
  }

  // ===========================================================================
  // SemVer Parsing
  // ===========================================================================

  /**
   * Parse SemVer string into object
   * @param version - Version string (e.g., "1.2.3")
   * @returns Parsed SemVer object
   */
  parseSemVer(version: string): SemVerObject {
    const parsed = semver.parse(version);
    if (!parsed) {
      throw new ValidationError(`Invalid SemVer format: ${version}`);
    }

    return {
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
    };
  }

  /**
   * Compare two SemVer versions
   * @param v1 - First version
   * @param v2 - Second version
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareSemVer(v1: string, v2: string): number {
    return semver.compare(v1, v2);
  }

  // ===========================================================================
  // Eligibility Checks
  // ===========================================================================

  /**
   * Check if a license is eligible for a free update to a version
   * @param licenseId - License ID
   * @param requestedVersion - Version to check
   * @returns True if eligible for free update
   */
  async isEligibleForFreeUpdate(licenseId: string, requestedVersion: string): Promise<boolean> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    // Free updates: same major version (minor/patch)
    // Example: v1.0.0 → v1.9.5 is free
    // Example: v1.0.0 → v2.0.0 requires payment

    const purchasedMajor = this.parseSemVer(license.purchased_version).major;
    const requestedMajor = this.parseSemVer(requestedVersion).major;

    if (requestedMajor !== purchasedMajor) {
      return false; // Different major version = paid upgrade
    }

    // Check if within eligible range
    return semver.lte(requestedVersion, license.eligible_until_version);
  }

  /**
   * Check if a license requires a paid upgrade for a version
   * @param licenseId - License ID
   * @param requestedVersion - Version to check
   * @returns True if paid upgrade required
   */
  async requiresPaidUpgrade(licenseId: string, requestedVersion: string): Promise<boolean> {
    const isFree = await this.isEligibleForFreeUpdate(licenseId, requestedVersion);
    return !isFree;
  }

  /**
   * Calculate upgrade price with discounts
   * @param licenseId - License ID
   * @param targetVersion - Target version to upgrade to
   * @returns Pricing breakdown
   */
  async calculateUpgradePrice(licenseId: string, targetVersion: string): Promise<UpgradePricing> {
    logger.debug('VersionUpgradeService: Calculating upgrade price', { licenseId, targetVersion });

    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
      include: { version_upgrade: true },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    let basePrice = this.MAJOR_UPGRADE_BASE_PRICE;
    let earlyBirdDiscount = 0;
    let loyaltyDiscount = 0;
    let discountReason = '';

    // Check if target version is early bird (released < 90 days ago)
    const isEarlyBird = await this.isEarlyBirdVersion(targetVersion);
    if (isEarlyBird) {
      earlyBirdDiscount = basePrice * this.EARLY_BIRD_DISCOUNT;
      discountReason = 'Early bird discount (20% off)';
    }

    // Check if user has upgraded before (loyalty discount)
    const hasUpgradedBefore = license.version_upgrade.some(
      (upgrade) => upgrade.status === 'completed'
    );
    if (hasUpgradedBefore) {
      loyaltyDiscount = basePrice * this.LOYALTY_DISCOUNT;
      discountReason = hasUpgradedBefore
        ? 'Loyalty discount (30% off for previous upgrade)'
        : discountReason;
    }

    // Apply the best discount (not cumulative)
    const totalDiscount = Math.max(earlyBirdDiscount, loyaltyDiscount);
    const finalPrice = basePrice - totalDiscount;

    logger.info('VersionUpgradeService: Upgrade price calculated', {
      licenseId,
      basePrice,
      totalDiscount,
      finalPrice,
      discountReason,
    });

    return {
      basePrice,
      earlyBirdDiscount,
      loyaltyDiscount,
      finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
      discountReason: discountReason || undefined,
    };
  }

  // ===========================================================================
  // Upgrade Purchase
  // ===========================================================================

  /**
   * Purchase a major version upgrade
   * @param licenseId - License ID
   * @param targetVersion - Target version to upgrade to
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Created version upgrade record
   */
  async purchaseUpgrade(
    licenseId: string,
    targetVersion: string,
    paymentIntentId: string
  ): Promise<VersionUpgrade> {
    logger.debug('VersionUpgradeService: Purchasing upgrade', {
      licenseId,
      targetVersion,
      paymentIntentId,
    });

    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    // Validate upgrade is needed
    const requiresUpgrade = await this.requiresPaidUpgrade(licenseId, targetVersion);
    if (!requiresUpgrade) {
      throw new ValidationError(
        'This version is already included in your license. No upgrade needed.'
      );
    }

    // Calculate pricing
    const pricing = await this.calculateUpgradePrice(licenseId, targetVersion);

    // Create upgrade record
    const upgrade = await this.prisma.version_upgrade.create({
      data: {
        license_id: licenseId,
        user_id: license.user_id,
        from_version: license.eligible_until_version,
        to_version: targetVersion,
        upgrade_price_usd: pricing.finalPrice,
        stripe_payment_intent_id: paymentIntentId,
        status: 'pending', // Will be updated to 'completed' by webhook
      },
    });

    logger.info('VersionUpgradeService: Upgrade purchase created', {
      upgradeId: upgrade.id,
      licenseId,
      targetVersion,
    });

    return upgrade;
  }

  /**
   * Apply early bird discount (20% off if within 90 days of release)
   * @param _licenseId - License ID (unused but required for interface consistency)
   * @param targetVersion - Target version
   * @returns Discount amount in USD
   */
  async applyEarlyBirdDiscount(_licenseId: string, targetVersion: string): Promise<number> {
    const isEarlyBird = await this.isEarlyBirdVersion(targetVersion);
    if (!isEarlyBird) {
      return 0;
    }

    const basePrice = this.MAJOR_UPGRADE_BASE_PRICE;
    return basePrice * this.EARLY_BIRD_DISCOUNT;
  }

  /**
   * Apply loyalty discount (30% off if upgraded before)
   * @param licenseId - License ID
   * @param _targetVersion - Target version (unused but required for interface consistency)
   * @returns Discount amount in USD
   */
  async applyLoyaltyDiscount(licenseId: string, _targetVersion: string): Promise<number> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
      include: { version_upgrade: true },
    });

    if (!license) {
      return 0;
    }

    const hasUpgradedBefore = license.version_upgrade.some(
      (upgrade) => upgrade.status === 'completed'
    );

    if (!hasUpgradedBefore) {
      return 0;
    }

    const basePrice = this.MAJOR_UPGRADE_BASE_PRICE;
    return basePrice * this.LOYALTY_DISCOUNT;
  }

  // ===========================================================================
  // Version Management
  // ===========================================================================

  /**
   * Update eligible version for a license (after upgrade payment completes)
   * @param licenseId - License ID
   * @param newVersion - New eligible version
   * @returns Updated license
   */
  async updateEligibleVersion(licenseId: string, newVersion: string): Promise<PerpetualLicense> {
    logger.info('VersionUpgradeService: Updating eligible version', { licenseId, newVersion });

    // Calculate new eligible range (all minor/patch in new major version)
    const majorVersion = this.parseSemVer(newVersion).major;
    const eligibleUntilVersion = `${majorVersion}.99.99`;

    const license = await this.prisma.perpetual_license.update({
      where: { id: licenseId },
      data: { eligible_until_version: eligibleUntilVersion },
    });

    return license;
  }

  /**
   * Get upgrade history for a license
   * @param licenseId - License ID
   * @returns List of version upgrades
   */
  async getUpgradeHistory(licenseId: string): Promise<VersionUpgrade[]> {
    return this.prisma.version_upgrade.findMany({
      where: { license_id: licenseId },
      orderBy: { purchased_at: 'desc' },
    });
  }

  /**
   * Get available upgrades for a license
   * @param licenseId - License ID
   * @returns List of available upgrades
   */
  async getAvailableUpgrades(licenseId: string): Promise<AvailableUpgrade[]> {
    const license = await this.prisma.perpetual_license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundError('License not found');
    }

    // In a real implementation, this would fetch available versions from a version registry
    // For now, we'll return a mock example
    const currentMajor = this.parseSemVer(license.eligible_until_version).major;
    const nextMajor = currentMajor + 1;

    const upgrades: AvailableUpgrade[] = [
      {
        fromVersion: license.eligible_until_version,
        toVersion: `${nextMajor}.0.0`,
        upgradeType: 'major',
        isFree: false,
        price: this.MAJOR_UPGRADE_BASE_PRICE,
        isEarlyBird: false, // Would check actual release date
      },
    ];

    return upgrades;
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  /**
   * Get upgrade conversion rate for a major version
   * @param majorVersion - Major version (e.g., "2")
   * @returns Conversion rate (0-1)
   */
  async getUpgradeConversionRate(majorVersion: string): Promise<number> {
    // Count eligible licenses (purchased version < major version)
    const eligibleLicenses = await this.prisma.perpetual_license.count({
      where: {
        eligible_until_version: {
          lt: `${majorVersion}.0.0`,
        },
      },
    });

    // Count completed upgrades to this major version
    const upgradedLicenses = await this.prisma.version_upgrade.count({
      where: {
        to_version: {
          startsWith: `${majorVersion}.`,
        },
        status: 'completed',
      },
    });

    if (eligibleLicenses === 0) {
      return 0;
    }

    return upgradedLicenses / eligibleLicenses;
  }

  /**
   * Get average time to upgrade (in days)
   * @param fromVersion - From version
   * @param toVersion - To version
   * @returns Average days to upgrade
   */
  async getAverageTimeToUpgrade(fromVersion: string, toVersion: string): Promise<number> {
    const upgrades = await this.prisma.version_upgrade.findMany({
      where: {
        from_version: fromVersion,
        to_version: toVersion,
        status: 'completed',
      },
      select: {
        purchased_at: true,
      },
    });

    if (upgrades.length === 0) {
      return 0;
    }

    // In a real implementation, would calculate time from version release date to purchase date
    // For now, return a placeholder
    return 0;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Check if a version was released within early bird window (90 days)
   * @param version - Version to check
   * @returns True if early bird eligible
   */
  private async isEarlyBirdVersion(version: string): Promise<boolean> {
    // In a real implementation, this would query a version release registry
    // For now, we'll check if there's a recent version upgrade to this version
    const recentUpgrades = await this.prisma.version_upgrade.findFirst({
      where: {
        to_version: version,
        purchased_at: {
          gte: new Date(Date.now() - this.EARLY_BIRD_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        },
      },
    });

    // If no upgrades exist yet, assume it's a new release (early bird)
    return !recentUpgrades;
  }
}
