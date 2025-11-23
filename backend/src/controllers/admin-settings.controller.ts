/**
 * Admin Settings Controller
 *
 * Handles HTTP endpoints for admin system settings configuration.
 * Part of Plan 208: Fractional Credit System Migration
 *
 * Endpoints:
 * - PUT /admin/settings/credit-increment  - Update minimum credit increment
 * - GET /admin/settings/credit-increment  - Get current credit increment setting
 *
 * Authentication: Bearer token (ADMIN_TOKEN env var)
 */

import { injectable } from 'tsyringe';
import { Request, Response } from 'express';
import logger from '../utils/logger';
import { successResponse } from '../utils/responses';
import { CreditDeductionService } from '../services/credit-deduction.service';

@injectable()
export class AdminSettingsController {
  constructor(
    private creditDeductionService: CreditDeductionService
  ) {
    logger.debug('AdminSettingsController: Initialized');
  }

  /**
   * PUT /admin/settings/credit-increment
   * Update minimum credit increment for credit deduction rounding
   *
   * Plan 208: Allows administrators to adjust credit increment without code changes
   *
   * Request Body:
   * {
   *   "increment": 0.1 | 0.01 | 1.0
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "data": {
   *     "creditMinimumIncrement": 0.1,
   *     "message": "Credit increment updated successfully"
   *   }
   * }
   *
   * Response 400: Invalid increment value
   * Response 403: Invalid admin token
   * Response 500: Server error
   */
  async updateCreditIncrement(req: Request, res: Response): Promise<void> {
    try {
      // Admin authentication check
      const authHeader = req.headers.authorization;
      const adminToken = process.env.ADMIN_TOKEN;

      if (adminToken && authHeader !== `Bearer ${adminToken}`) {
        res.status(403).json({
          error: {
            code: 'forbidden',
            message: 'Admin authentication required',
          },
        });
        return;
      }

      const { increment } = req.body;

      // Validate increment value
      const validIncrements = [0.01, 0.1, 1.0];
      if (!increment || !validIncrements.includes(increment)) {
        res.status(400).json({
          error: {
            code: 'invalid_increment',
            message: 'Invalid credit increment. Allowed values: 0.01, 0.1, 1.0',
            details: {
              received: increment,
              allowed: validIncrements,
            },
          },
        });
        return;
      }

      // Update credit increment setting
      await this.creditDeductionService.updateCreditIncrement(increment);

      logger.info('AdminSettingsController: Credit increment updated', {
        increment,
        admin: req.user?.sub || 'unknown',
      });

      res.json(successResponse({
        creditMinimumIncrement: increment,
        message: 'Credit increment updated successfully',
      }));
    } catch (error) {
      logger.error('AdminSettingsController: Error updating credit increment', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'server_error',
          message: 'Failed to update credit increment setting',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * GET /admin/settings/credit-increment
   * Get current minimum credit increment setting
   *
   * Plan 208: View current credit increment configuration
   *
   * Response 200:
   * {
   *   "success": true,
   *   "data": {
   *     "creditMinimumIncrement": 0.1,
   *     "allowedValues": [0.01, 0.1, 1.0],
   *     "description": "Minimum credit increment for rounding (e.g., 0.1 = $0.001 per increment)"
   *   }
   * }
   *
   * Response 403: Invalid admin token
   * Response 500: Server error
   */
  async getCreditIncrement(req: Request, res: Response): Promise<void> {
    try {
      // Admin authentication check
      const authHeader = req.headers.authorization;
      const adminToken = process.env.ADMIN_TOKEN;

      if (adminToken && authHeader !== `Bearer ${adminToken}`) {
        res.status(403).json({
          error: {
            code: 'forbidden',
            message: 'Admin authentication required',
          },
        });
        return;
      }

      // Access static property via service instance method
      // The service should expose this via a getter
      const currentIncrement = (this.creditDeductionService as any)['getCreditIncrement']();

      res.json(successResponse({
        creditMinimumIncrement: currentIncrement,
        allowedValues: [0.01, 0.1, 1.0],
        description: 'Minimum credit increment for rounding (e.g., 0.1 = $0.001 per increment)',
      }));
    } catch (error) {
      logger.error('AdminSettingsController: Error getting credit increment', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'server_error',
          message: 'Failed to retrieve credit increment setting',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
