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
          license_key: license.license_key,
          purchased_version: license.purchased_version,
          eligible_until_version: license.eligible_until_version,
          max_activations: license.max_activations,
          status: license.status,
          purchased_at: license.purchased_at.toISOString(),
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
          license_id: result.activation.license_id,
          machine_fingerprint: result.activation.machine_fingerprint,
          device_name: result.activation.device_name,
          status: result.activation.status,
          activated_at: result.activation.activated_at.toISOString(),
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
          license_id: activation.license_id,
          machine_fingerprint: activation.machine_fingerprint,
          device_name: activation.device_name,
          status: activation.status,
          activated_at: activation.activated_at.toISOString(),
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
        license_key: license.license_key,
        purchased_version: license.purchased_version,
        eligible_until_version: license.eligible_until_version,
        max_activations: license.max_activations,
        current_activations: license.current_activations,
        status: license.status,
        purchased_at: license.purchased_at.toISOString(),
        activated_at: license.activated_at?.toISOString() || null,
        activations: license.license_activation?.map((a: any) => ({
          id: a.id,
          device_name: a.device_name,
          os_type: a.os_type,
          status: a.status,
          activated_at: a.activated_at.toISOString(),
        })),
        version_upgrades: license.version_upgrade?.map((u: any) => ({
          id: u.id,
          from_version: u.fromVersion,
          to_version: u.toVersion,
          upgrade_price_usd: u.upgradePriceUsd,
          status: u.status,
          purchased_at: u.purchased_at.toISOString(),
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
        max_activations: license.max_activations,
        current_activations: devices.length,
        devices: devices.map((d) => ({
          id: d.id,
          device_name: d.device_name,
          os_type: d.os_type,
          os_version: d.os_version,
          cpu_info: d.cpu_info,
          activated_at: d.activated_at.toISOString(),
          last_seen_at: d.last_seen_at.toISOString(),
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
          license_key: license.license_key,
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
          license_key: license.license_key,
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
