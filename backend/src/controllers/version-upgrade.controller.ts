/**
 * Version Upgrade Controller (Plan 110)
 *
 * Handles HTTP requests for version upgrade management endpoints.
 * Integrates with VersionUpgradeService for upgrade eligibility and purchases.
 *
 * Endpoints:
 * - GET /api/licenses/:licenseKey/version-eligibility/:version - Check version eligibility
 * - POST /api/licenses/:licenseKey/upgrade                     - Purchase major version upgrade
 * - GET /api/licenses/:licenseKey/available-upgrades            - List available upgrades
 * - GET /api/licenses/:licenseKey/upgrade-history               - Get upgrade history
 * - GET /api/admin/analytics/upgrade-conversion                 - Upgrade conversion metrics (admin)
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { VersionUpgradeService } from '../services/version-upgrade.service';
import { LicenseManagementService } from '../services/license-management.service';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

@injectable()
export class VersionUpgradeController {
  constructor(
    @inject(VersionUpgradeService)
    private upgradeService: VersionUpgradeService,
    @inject(LicenseManagementService)
    private licenseService: LicenseManagementService
  ) {
    logger.debug('VersionUpgradeController: Initialized');
  }

  /**
   * GET /api/licenses/:licenseKey/version-eligibility/:version
   * Check if a version is eligible for free update
   */
  async checkVersionEligibility(req: Request, res: Response): Promise<void> {
    const { licenseKey, version } = req.params;

    try {
      const license = await this.licenseService.getLicenseByKey(licenseKey);

      if (!license) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: 'License not found',
          },
        });
        return;
      }

      const isFree = await this.upgradeService.isEligibleForFreeUpdate(license.id, version);

      res.status(200).json({
        license_key: licenseKey,
        requested_version: version,
        is_eligible: isFree,
        is_free: isFree,
        requires_payment: !isFree,
        current_eligible_range: {
          min: license.purchased_version,
          max: license.eligible_until_version,
        },
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'invalid_version',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to check version eligibility', { licenseKey, version, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to check version eligibility',
          },
        });
      }
    }
  }

  /**
   * POST /api/licenses/:licenseKey/upgrade
   * Purchase a major version upgrade
   */
  async purchaseUpgrade(req: Request, res: Response): Promise<void> {
    const { licenseKey } = req.params;
    const { targetVersion, paymentIntentId } = req.body;

    if (!targetVersion || !paymentIntentId) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Target version and payment intent ID are required',
        },
      });
      return;
    }

    try {
      const license = await this.licenseService.getLicenseByKey(licenseKey);

      if (!license) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: 'License not found',
          },
        });
        return;
      }

      // Calculate pricing first
      const pricing = await this.upgradeService.calculateUpgradePrice(license.id, targetVersion);

      // Purchase upgrade
      const upgrade = await this.upgradeService.purchaseUpgrade(
        license.id,
        targetVersion,
        paymentIntentId
      );

      // Standard response format
      res.status(201).json({
        status: 'success',
        data: {
          upgrade_id: upgrade.id,
          license_id: license.id,
          from_version: upgrade.from_version,
          to_version: upgrade.to_version,
          upgrade_price_usd: upgrade.upgrade_price_usd,
          pricing_breakdown: pricing,
          status: upgrade.status,
          purchased_at: upgrade.purchased_at.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: error.message,
          },
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'validation_error',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to purchase upgrade', { licenseKey, targetVersion, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to purchase version upgrade',
          },
        });
      }
    }
  }

  /**
   * GET /api/licenses/:licenseKey/available-upgrades
   * List available upgrades for a license
   */
  async getAvailableUpgrades(req: Request, res: Response): Promise<void> {
    const { licenseKey } = req.params;

    try {
      const license = await this.licenseService.getLicenseByKey(licenseKey);

      if (!license) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: 'License not found',
          },
        });
        return;
      }

      const upgrades = await this.upgradeService.getAvailableUpgrades(license.id);

      res.status(200).json({
        license_key: licenseKey,
        current_version: license.eligible_until_version,
        available_upgrades: upgrades,
      });
    } catch (error) {
      logger.error('Failed to get available upgrades', { licenseKey, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve available upgrades',
        },
      });
    }
  }

  /**
   * GET /api/licenses/:licenseKey/upgrade-history
   * Get upgrade history for a license
   */
  async getUpgradeHistory(req: Request, res: Response): Promise<void> {
    const { licenseKey } = req.params;

    try {
      const license = await this.licenseService.getLicenseByKey(licenseKey);

      if (!license) {
        res.status(404).json({
          error: {
            code: 'license_not_found',
            message: 'License not found',
          },
        });
        return;
      }

      const history = await this.upgradeService.getUpgradeHistory(license.id);

      res.status(200).json({
        license_key: licenseKey,
        upgrade_history: history.map((u) => ({
          id: u.id,
          from_version: u.from_version,
          to_version: u.to_version,
          upgrade_price_usd: u.upgrade_price_usd,
          status: u.status,
          purchased_at: u.purchased_at.toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Failed to get upgrade history', { licenseKey, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve upgrade history',
        },
      });
    }
  }

  /**
   * GET /api/admin/analytics/upgrade-conversion
   * Get upgrade conversion metrics (admin only)
   */
  async getUpgradeConversion(req: Request, res: Response): Promise<void> {
    const { majorVersion } = req.query;

    if (!majorVersion || typeof majorVersion !== 'string') {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Major version query parameter is required',
        },
      });
      return;
    }

    try {
      const conversionRate = await this.upgradeService.getUpgradeConversionRate(majorVersion);

      res.status(200).json({
        major_version: majorVersion,
        conversion_rate: conversionRate,
        conversion_percentage: `${(conversionRate * 100).toFixed(2)}%`,
      });
    } catch (error) {
      logger.error('Failed to get upgrade conversion', { majorVersion, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve upgrade conversion metrics',
        },
      });
    }
  }
}
