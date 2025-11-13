/**
 * Device Activation Management Controller
 *
 * Handles HTTP requests for device activation management endpoints.
 * Admin-only endpoints for viewing and managing device activations.
 *
 * Endpoints:
 * - GET /admin/licenses/devices - List all device activations
 * - GET /admin/licenses/devices/stats - Get device statistics
 * - POST /admin/licenses/devices/:id/deactivate - Deactivate a device
 * - POST /admin/licenses/devices/:id/revoke - Revoke a device (permanent)
 * - POST /admin/licenses/devices/bulk-action - Bulk device operations
 *
 * Reference: docs/analysis/033-license-management-api-schema-analysis.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { DeviceActivationManagementService } from '../services/device-activation-management.service';
import { ActivationStatus } from '@prisma/client';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

@injectable()
export class DeviceActivationManagementController {
  constructor(
    @inject(DeviceActivationManagementService)
    private deviceActivationService: DeviceActivationManagementService
  ) {
    logger.debug('DeviceActivationManagementController: Initialized');
  }

  /**
   * GET /admin/licenses/devices
   * List all device activations with filters and pagination
   */
  async getAllDeviceActivations(req: Request, res: Response): Promise<void> {
    try {
      const { status, os, suspicious, search, page, limit } = req.query;

      const filters = {
        status: status as ActivationStatus | undefined,
        os: os as string | undefined,
        suspicious: suspicious === 'true' ? true : suspicious === 'false' ? false : undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const result = await this.deviceActivationService.getAllDeviceActivations(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get device activations', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve device activations',
        },
      });
    }
  }

  /**
   * GET /admin/licenses/devices/stats
   * Get device activation statistics
   */
  async getDeviceStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.deviceActivationService.getDeviceStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get device stats', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve device statistics',
        },
      });
    }
  }

  /**
   * POST /admin/licenses/devices/:id/deactivate
   * Deactivate a device
   */
  async deactivateDevice(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      await this.deviceActivationService.deactivateDevice(id);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Device deactivated successfully',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'device_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to deactivate device', { deviceId: id, error });
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
   * POST /admin/licenses/devices/:id/revoke
   * Revoke a device (admin-initiated, permanent)
   */
  async revokeDevice(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Reason is required for device revocation',
        },
      });
      return;
    }

    try {
      await this.deviceActivationService.revokeDevice(id, reason);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Device revoked successfully',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'device_not_found',
            message: error.message,
          },
        });
      } else {
        logger.error('Failed to revoke device', { deviceId: id, error });
        res.status(500).json({
          error: {
            code: 'internal_server_error',
            message: 'Failed to revoke device',
          },
        });
      }
    }
  }

  /**
   * POST /admin/licenses/devices/bulk-action
   * Perform bulk actions on devices (deactivate or revoke)
   */
  async bulkAction(req: Request, res: Response): Promise<void> {
    const { deviceIds, action, reason } = req.body;

    // Validation
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'deviceIds must be a non-empty array',
        },
      });
      return;
    }

    if (!action || !['deactivate', 'revoke'].includes(action)) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'action must be either "deactivate" or "revoke"',
        },
      });
      return;
    }

    if (action === 'revoke' && !reason) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'reason is required for bulk revoke action',
        },
      });
      return;
    }

    try {
      const result = await this.deviceActivationService.bulkAction(deviceIds, action, reason);

      // Standard response format
      res.status(200).json({
        status: 'success',
        data: {
          affectedCount: result.affectedCount,
        },
        meta: {
          message: `Bulk ${action} completed successfully`,
        },
      });
    } catch (error) {
      logger.error('Failed to perform bulk action', { deviceIds, action, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to perform bulk action',
        },
      });
    }
  }
}
