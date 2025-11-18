/**
 * Usage Controller
 *
 * Handles HTTP requests for user usage data.
 * Provides endpoints for Desktop App integration to retrieve usage analytics.
 *
 * Core Responsibilities:
 * - Handle monthly usage summary requests
 * - Extract user context from JWT
 * - Return flat response format (NOT { status, data, meta })
 *
 * Integration Points:
 * - Used by /api/user/usage/* endpoints
 * - Calls UsageService for business logic
 *
 * Reference: docs/plan/182-desktop-app-api-backend-requirements.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { UsageService } from '../services/usage.service';
import logger from '../utils/logger';

@injectable()
export class UsageController {
  constructor(
    @inject(UsageService) private readonly usageService: UsageService
  ) {}

  /**
   * GET /api/user/usage/summary
   *
   * Get monthly usage summary for authenticated user.
   *
   * Query Parameters:
   * - period (optional): "current_month" (default) or "YYYY-MM" format
   *
   * Response Format: Flat response (NOT { status, data, meta })
   * Desktop App endpoints use flat format like V1 API endpoints.
   * See "Response Format Strategy" in Plan 182.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async getMonthlySummary(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from JWT (set by authMiddleware)
      const userId = req.user!.sub;

      // Extract period from query parameter (default: current_month)
      const period = (req.query.period as string) || 'current_month';

      logger.debug('UsageController: Getting monthly summary', {
        userId,
        period,
      });

      // Get summary from service
      const summary = await this.usageService.getMonthlySummary(userId, period);

      // Return flat response directly (DO NOT wrap in { status, data, meta })
      res.json(summary);

      logger.info('UsageController: Monthly summary returned successfully', {
        userId,
        period,
        creditsUsed: summary.summary.creditsUsed,
        apiRequests: summary.summary.apiRequests,
      });
    } catch (error) {
      logger.error('UsageController: Error getting monthly summary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Let error middleware handle the error response
      throw error;
    }
  }
}
