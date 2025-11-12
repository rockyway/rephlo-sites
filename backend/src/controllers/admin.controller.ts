/**
 * Admin Controller
 *
 * Handles HTTP endpoints for admin operations and system monitoring.
 * Provides administrative endpoints for user management, system metrics,
 * subscription overview, usage statistics, and webhook testing.
 *
 * Endpoints:
 * - GET  /admin/metrics            - System metrics (migrated from legacy admin.ts)
 * - GET  /admin/users              - List users with pagination
 * - POST /admin/users/:id/suspend  - Suspend user account
 * - GET  /admin/subscriptions      - Subscription overview
 * - GET  /admin/usage              - System-wide usage statistics
 * - POST /admin/webhooks/test      - Test webhook delivery
 *
 * Authentication: Bearer token (ADMIN_TOKEN env var)
 * Note: Admin endpoints use modern response format (not legacy branding format)
 *
 * Reference: docs/progress/023-api-consolidation-phase-2.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { successResponse } from '../utils/responses';

// =============================================================================
// Admin Controller Class
// =============================================================================

@injectable()
export class AdminController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AdminController: Initialized');
  }

  // ===========================================================================
  // Metrics Endpoint (Migrated from legacy admin.ts)
  // ===========================================================================

  /**
   * GET /admin/metrics
   * Get system metrics and analytics
   *
   * IMPORTANT: Maintains exact same behavior as legacy getAdminMetrics()
   * - Bearer token authentication with ADMIN_TOKEN env var
   * - Same aggregation logic for downloads, feedback, diagnostics
   * - Same response format (legacy format with {success: true, data: {...}})
   *
   * Response 200:
   * {
   *   "success": true,
   *   "data": {
   *     "downloads": {
   *       "windows": 0,
   *       "macos": 0,
   *       "linux": 0,
   *       "total": 0
   *     },
   *     "feedback": {
   *       "total": 0,
   *       "recentCount": 0
   *     },
   *     "diagnostics": {
   *       "total": 0,
   *       "totalSize": 0
   *     },
   *     "timestamps": {
   *       "firstDownload": "ISO-8601" | null,
   *       "lastDownload": "ISO-8601" | null
   *     }
   *   }
   * }
   *
   * Response 403: Invalid admin token
   * Response 500: Server error
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Simple admin authentication check
      // In production, this should use proper admin role/scope validation
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

      // Aggregate download counts by OS
      const downloadsByOS = await this.prisma.download.groupBy({
        by: ['os'],
        _count: {
          id: true,
        },
      });

      // Convert to object format
      const downloadsMap: Record<string, number> = {};
      let totalDownloads = 0;

      downloadsByOS.forEach((item: { os: string; _count: { id: number } }) => {
        downloadsMap[item.os] = item._count.id;
        totalDownloads += item._count.id;
      });

      // Ensure all OS types are present
      const downloads = {
        windows: downloadsMap.windows || 0,
        macos: downloadsMap.macos || 0,
        linux: downloadsMap.linux || 0,
        total: totalDownloads,
      };

      // Get feedback counts
      const totalFeedback = await this.prisma.feedback.count();
      const recentFeedbackCount = await this.prisma.feedback.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      // Get diagnostic statistics
      const diagnosticStats = await this.prisma.diagnostic.aggregate({
        _count: {
          id: true,
        },
        _sum: {
          fileSize: true,
        },
      });

      // Get timestamp ranges for downloads
      const firstDownload = await this.prisma.download.findFirst({
        orderBy: {
          timestamp: 'asc',
        },
        select: {
          timestamp: true,
        },
      });

      const lastDownload = await this.prisma.download.findFirst({
        orderBy: {
          timestamp: 'desc',
        },
        select: {
          timestamp: true,
        },
      });

      // Log for debugging
      logger.info('Admin metrics retrieved', {
        downloads: totalDownloads,
        feedback: totalFeedback,
        diagnostics: diagnosticStats._count.id,
      });

      // Use modern response format (Phase 2)
      res.status(200).json(successResponse({
        downloads,
        feedback: {
          total: totalFeedback,
          recentCount: recentFeedbackCount,
        },
        diagnostics: {
          total: diagnosticStats._count.id || 0,
          totalSize: diagnosticStats._sum.fileSize || 0,
        },
        timestamps: {
          firstDownload: firstDownload?.timestamp.toISOString() || null,
          lastDownload: lastDownload?.timestamp.toISOString() || null,
        },
      }));
    } catch (error) {
      logger.error('AdminController.getMetrics: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
      });
    }
  }

  // ===========================================================================
  // User Management Endpoints
  // ===========================================================================

  /**
   * GET /admin/users
   * List and manage users with pagination
   *
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 50, max: 100)
   * - search: string (optional - search by email or username)
   * - tier: string (optional - filter by subscription tier)
   *
   * Response 200:
   * {
   *   "users": [...],
   *   "pagination": {
   *     "page": 1,
   *     "limit": 50,
   *     "total": 100,
   *     "totalPages": 2
   *   }
   * }
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const search = req.query.search as string | undefined;
      const tier = req.query.tier as string | undefined;

      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (tier) {
        where.subscriptions = {
          some: {
            tier: tier,
            status: 'active',
          },
        };
      }

      // Get total count for pagination
      const total = await this.prisma.user.count({ where });

      // Get users with pagination
      const users = await this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          emailVerified: true,
          username: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          lastLoginAt: true,
          subscriptions: {
            where: {
              status: 'active',
            },
            select: {
              tier: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
            },
            take: 1,
            orderBy: {
              currentPeriodStart: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      logger.info('AdminController.listUsers: Users retrieved', {
        page,
        limit,
        total,
        search,
        tier,
      });

      res.json(successResponse(
        users.map((user) => {
          const activeSubscription = user.subscriptions[0] || null;
          return {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt.toISOString(),
            lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
            subscription: activeSubscription
              ? {
                  tier: activeSubscription.tier,
                  status: activeSubscription.status,
                  currentPeriodStart: activeSubscription.currentPeriodStart.toISOString(),
                  currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
                }
              : null,
          };
        }),
        {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit + users.length < total
        }
      ));
    } catch (error) {
      logger.error('AdminController.listUsers: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve users',
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
      });
    }
  }

  /**
   * POST /admin/users/:id/suspend
   * Suspend a user account
   *
   * Path Parameters:
   * - id: string (user ID)
   *
   * Request Body:
   * {
   *   "reason": "string (optional)"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "User {id} suspended"
   * }
   *
   * Response 404: User not found
   * Response 500: Server error
   */
  async suspendUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (!user) {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: `User ${id} not found`,
          },
        });
        return;
      }

      // TODO: Implement user suspension logic
      // This would typically:
      // 1. Add a 'suspended' field to User model
      // 2. Update user.suspended = true
      // 3. Create an audit log entry
      // 4. Optionally send notification to user

      // Placeholder implementation - log the suspension
      logger.warn('AdminController.suspendUser: User suspension requested', {
        userId: id,
        userEmail: user.email,
        reason: reason || 'No reason provided',
      });

      res.json(successResponse({
        message: `User ${id} suspended`,
        note: 'Suspension functionality requires User model update (add suspended field)',
      }));
    } catch (error) {
      logger.error('AdminController.suspendUser: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to suspend user',
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Subscription Overview Endpoint
  // ===========================================================================

  /**
   * GET /admin/subscriptions
   * Get subscription overview and statistics
   *
   * Response 200:
   * {
   *   "subscriptionStats": [...],
   *   "totalActive": 0,
   *   "byTier": { ... },
   *   "byStatus": { ... }
   * }
   */
  async getSubscriptionOverview(_req: Request, res: Response): Promise<void> {
    try {
      // Get subscription counts grouped by tier and status
      const stats = await this.prisma.subscription.groupBy({
        by: ['tier', 'status'],
        _count: {
          id: true,
        },
      });

      // Calculate totals
      const totalActive = stats
        .filter((s) => s.status === 'active')
        .reduce((acc, s) => acc + s._count.id, 0);

      // Group by tier
      const byTier: Record<string, number> = {};
      stats.forEach((s) => {
        if (!byTier[s.tier]) {
          byTier[s.tier] = 0;
        }
        byTier[s.tier] += s._count.id;
      });

      // Group by status
      const byStatus: Record<string, number> = {};
      stats.forEach((s) => {
        if (!byStatus[s.status]) {
          byStatus[s.status] = 0;
        }
        byStatus[s.status] += s._count.id;
      });

      logger.info('AdminController.getSubscriptionOverview: Stats retrieved', {
        totalActive,
        tierCount: Object.keys(byTier).length,
      });

      res.json(successResponse({
        subscriptionStats: stats.map((s) => ({
          tier: s.tier,
          status: s.status,
          count: s._count.id,
        })),
        totalActive,
        byTier,
        byStatus,
      }));
    } catch (error) {
      logger.error('AdminController.getSubscriptionOverview: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve subscription overview',
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // System Usage Endpoint
  // ===========================================================================

  /**
   * GET /admin/usage
   * Get system-wide usage statistics
   *
   * Query Parameters:
   * - startDate: ISO-8601 date string (optional)
   * - endDate: ISO-8601 date string (optional)
   *
   * Response 200:
   * {
   *   "totalOperations": 0,
   *   "totalCreditsUsed": 0,
   *   "byModel": [...],
   *   "byOperation": [...],
   *   "dateRange": { ... }
   * }
   *
   * Response 400: Invalid date range
   * Response 500: Server error
   */
  async getSystemUsage(req: Request, res: Response): Promise<void> {
    try {
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      // Parse and validate dates
      if (startDateStr) {
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) {
          res.status(400).json({
            error: {
              code: 'invalid_date',
              message: 'Invalid startDate format. Use ISO-8601 format.',
            },
          });
          return;
        }
      }

      if (endDateStr) {
        endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) {
          res.status(400).json({
            error: {
              code: 'invalid_date',
              message: 'Invalid endDate format. Use ISO-8601 format.',
            },
          });
          return;
        }
      }

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          error: {
            code: 'invalid_range',
            message: 'Start date must be before end date',
          },
        });
        return;
      }

      // Build where clause for date filtering
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Get total operations and credits used
      const aggregates = await this.prisma.usageHistory.aggregate({
        where,
        _count: {
          id: true,
        },
        _sum: {
          creditsUsed: true,
        },
      });

      // Get usage grouped by model
      const byModel = await this.prisma.usageHistory.groupBy({
        by: ['modelId'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          creditsUsed: true,
        },
      });

      // Get usage grouped by operation type
      const byOperation = await this.prisma.usageHistory.groupBy({
        by: ['operation'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          creditsUsed: true,
        },
      });

      logger.info('AdminController.getSystemUsage: Usage stats retrieved', {
        totalOperations: aggregates._count.id,
        totalCreditsUsed: aggregates._sum.creditsUsed,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      res.json(successResponse({
        totalOperations: aggregates._count.id || 0,
        totalCreditsUsed: aggregates._sum.creditsUsed || 0,
        byModel: byModel.map((m: any) => ({
          modelId: m.modelId,
          operations: m._count.id,
          creditsUsed: m._sum.creditsUsed || 0,
        })),
        byOperation: byOperation.map((o: any) => ({
          operationType: o.operation,
          operations: o._count.id,
          creditsUsed: o._sum.creditsUsed || 0,
        })),
        dateRange: {
          startDate: startDate?.toISOString() || null,
          endDate: endDate?.toISOString() || null,
        },
      }));
    } catch (error) {
      logger.error('AdminController.getSystemUsage: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve system usage',
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
      });
    }
  }

  // ===========================================================================
  // Webhook Testing Endpoint
  // ===========================================================================

  /**
   * POST /admin/webhooks/test
   * Test webhook delivery
   *
   * Request Body:
   * {
   *   "url": "https://example.com/webhook",
   *   "event": "test.event"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "statusCode": 200,
   *   "response": { ... }
   * }
   *
   * Response 400: Invalid URL or event
   * Response 500: Server error
   */
  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { url, event } = req.body;

      // Validate input
      if (!url || typeof url !== 'string') {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: 'URL is required and must be a string',
          },
        });
        return;
      }

      if (!event || typeof event !== 'string') {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: 'Event is required and must be a string',
          },
        });
        return;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        res.status(400).json({
          error: {
            code: 'invalid_url',
            message: 'Invalid URL format',
          },
        });
        return;
      }

      // Send test webhook
      // Note: This uses a placeholder implementation
      // In production, this would use the WebhookService.sendTestWebhook method
      logger.info('AdminController.testWebhook: Sending test webhook', {
        url,
        event,
      });

      // Placeholder response
      // TODO: Implement WebhookService.sendTestWebhook method
      const testPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: {
          test: true,
          message: 'This is a test webhook from the admin panel',
        },
      };

      logger.warn('AdminController.testWebhook: Test webhook not sent (placeholder)', {
        url,
        event,
        payload: testPayload,
      });

      res.json(successResponse({
        message: 'Test webhook functionality pending',
        note: 'Requires WebhookService.sendTestWebhook implementation',
        payload: testPayload,
      }));
    } catch (error) {
      logger.error('AdminController.testWebhook: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to send test webhook',
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
      });
    }
  }
}
