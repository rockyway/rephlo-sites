/**
 * License Management Controller (Plan 110)
 *
 * Handles HTTP requests for perpetual license management endpoints.
 * Integrates with LicenseManagementService for license activation and management.
 *
 * Endpoints:
 * - POST /api/licenses/purchase         - Purchase perpetual license
 * - POST /api/licenses/activate         - Activate device
 * - DELETE /api/licenses/activations/:id - Deactivate device
 * - PATCH /api/licenses/activations/:id/replace - Replace device
 * - GET /api/licenses/:licenseKey       - Get license details
 * - GET /api/licenses/:licenseKey/devices - List active devices
 * - POST /api/admin/licenses/:id/suspend - Suspend license (admin)
 * - POST /api/admin/licenses/:id/revoke - Revoke license (admin)
 * - GET /api/admin/licenses             - List all licenses (admin)
 *
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { LicenseManagementService } from '../services/license-management.service';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

@injectable()
export class LicenseManagementController {
  constructor(
    @inject(LicenseManagementService)
    private licenseService: LicenseManagementService
  ) {
    logger.debug('LicenseManagementController: Initialized');
  }

  /**
   * POST /api/licenses/purchase
   * Purchase a perpetual license
   */
  async purchaseLicense(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;
    const { purchasePrice, purchasedVersion } = req.body;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      const license = await this.licenseService.createPerpetualLicense(
        userId,
        purchasePrice || 199.0,
        purchasedVersion || '1.0.0'
      );

      // Standard response format
      res.status(201).json({
        status: 'success',
        data: {
          id: license.id,
          license_key: license.licenseKey,
          purchased_version: license.purchasedVersion,
          eligible_until_version: license.eligibleUntilVersion,
          max_activations: license.maxActivations,
          status: license.status,
          purchased_at: license.purchasedAt.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to purchase license', { userId, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to create perpetual license',
        },
      });
    }
  }

  /**
   * POST /api/licenses/activate
   * Activate a device for a license
   */
  async activateDevice(req: Request, res: Response): Promise<void> {
    const { licenseKey, deviceInfo } = req.body;

    if (!licenseKey || !deviceInfo || !deviceInfo.fingerprint) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'License key and device fingerprint are required',
        },
      });
      return;
    }

    try {
      const result = await this.licenseService.activateDevice(licenseKey, deviceInfo);

      // Standard response format
      res.status(result.isNewActivation ? 201 : 200).json({
        status: 'success',
        data: {
          activation_id: result.activation.id,
          license_id: result.activation.licenseId,
          machine_fingerprint: result.activation.machineFingerprint,
          device_name: result.activation.deviceName,
          status: result.activation.status,
          activated_at: result.activation.activatedAt.toISOString(),
          is_new_activation: result.isNewActivation,
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
        res.status(403).json({
          error: {
            code: 'activation_limit_reached',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to activate device', { licenseKey, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to activate device',
          },
        });
      }
    }
  }

  /**
   * DELETE /api/licenses/activations/:id
   * Deactivate a device
   */
  async deactivateDevice(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      await this.licenseService.deactivateDevice(id);

      res.status(200).json({
        message: 'Device deactivated successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'activation_not_found',
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
        logger.error('Failed to deactivate device', { activationId: id, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to deactivate device',
          },
        });
      }
    }
  }

  /**
   * PATCH /api/licenses/activations/:id/replace
   * Replace a device
   */
  async replaceDevice(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newDeviceInfo } = req.body;

    if (!newDeviceInfo || !newDeviceInfo.fingerprint) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'New device fingerprint is required',
        },
      });
      return;
    }

    try {
      const activation = await this.licenseService.replaceDevice(id, newDeviceInfo);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          activation_id: activation.id,
          license_id: activation.licenseId,
          machine_fingerprint: activation.machineFingerprint,
          device_name: activation.deviceName,
          status: activation.status,
          activated_at: activation.activatedAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'activation_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to replace device', { oldActivationId: id, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to replace device',
          },
        });
      }
    }
  }

  /**
   * GET /api/licenses/:licenseKey
   * Get license details
   */
  async getLicenseDetails(req: Request, res: Response): Promise<void> {
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

      res.status(200).json({
        id: license.id,
        license_key: license.licenseKey,
        purchased_version: license.purchasedVersion,
        eligible_until_version: license.eligibleUntilVersion,
        max_activations: license.maxActivations,
        current_activations: license.currentActivations,
        status: license.status,
        purchased_at: license.purchasedAt.toISOString(),
        activated_at: license.activatedAt?.toISOString() || null,
        activations: license.activations?.map((a) => ({
          id: a.id,
          device_name: a.deviceName,
          os_type: a.osType,
          status: a.status,
          activated_at: a.activatedAt.toISOString(),
        })),
        version_upgrades: license.versionUpgrades?.map((u) => ({
          id: u.id,
          from_version: u.fromVersion,
          to_version: u.toVersion,
          upgrade_price_usd: u.upgradePriceUsd,
          status: u.status,
          purchased_at: u.purchasedAt.toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Failed to get license details', { licenseKey, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve license details',
        },
      });
    }
  }

  /**
   * GET /api/licenses/:licenseKey/devices
   * List active devices for a license
   */
  async getActiveDevices(req: Request, res: Response): Promise<void> {
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

      const devices = await this.licenseService.getActiveDevices(license.id);

      res.status(200).json({
        license_key: licenseKey,
        max_activations: license.maxActivations,
        current_activations: devices.length,
        devices: devices.map((d) => ({
          id: d.id,
          device_name: d.deviceName,
          os_type: d.osType,
          os_version: d.osVersion,
          cpu_info: d.cpuInfo,
          activated_at: d.activatedAt.toISOString(),
          last_seen_at: d.lastSeenAt.toISOString(),
        })),
      });
    } catch (error) {
      logger.error('Failed to get active devices', { licenseKey, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve active devices',
        },
      });
    }
  }

  /**
   * POST /api/admin/licenses/:id/suspend
   * Suspend a license (admin only)
   */
  async suspendLicense(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const license = await this.licenseService.suspendLicense(id, reason || 'Admin action');

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          id: license.id,
          license_key: license.licenseKey,
          status: license.status,
        },
        meta: {
          message: 'License suspended successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to suspend license', { licenseId: id, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to suspend license',
        },
      });
    }
  }

  /**
   * POST /api/admin/licenses/:id/revoke
   * Revoke a license permanently (admin only)
   */
  async revokeLicense(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const license = await this.licenseService.revokeLicense(id, reason || 'Admin action');

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          id: license.id,
          license_key: license.licenseKey,
          status: license.status,
        },
        meta: {
          message: 'License revoked successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to revoke license', { licenseId: id, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to revoke license',
        },
      });
    }
  }

  /**
   * GET /admin/licenses
   * List all licenses (admin only)
   */
  async listAllLicenses(req: Request, res: Response): Promise<void> {
    const { page, limit, status, tier } = req.query;

    logger.info('LicenseManagementController.listAllLicenses', {
      query: req.query,
    });

    try {
      const filters = {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        status: status as string | undefined,
        tier: tier as string | undefined,
      };

      const result = await this.licenseService.listAllLicenses(filters);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      logger.error('LicenseManagementController.listAllLicenses: Error', { error });
      throw error;
    }
  }

  /**
   * GET /admin/licenses/stats
   * Get license statistics (admin only)
   */
  async getLicenseStats(_req: Request, res: Response): Promise<void> {
    logger.info('LicenseManagementController.getLicenseStats');

    try {
      const stats = await this.licenseService.getLicenseStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('LicenseManagementController.getLicenseStats: Error', { error });
      throw error;
    }
  }
}
