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
import { IRefundService } from '../interfaces/services/refund.interface';
import { SubscriptionManagementService } from '../services/subscription-management.service';

// =============================================================================
// Admin Controller Class
// =============================================================================

@injectable()
export class AdminController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('IRefundService') private refundService: IRefundService,
    private subscriptionManagementService: SubscriptionManagementService
  ) {
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
      const downloadsByOS = await this.prisma.downloads.groupBy({
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
      const totalFeedback = await this.prisma.feedbacks.count();
      const recentFeedbackCount = await this.prisma.feedbacks.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      // Get diagnostic statistics
      const diagnosticStats = await this.prisma.diagnostics.aggregate({
        _count: {
          id: true,
        },
        _sum: {
          file_size: true,
        },
      });

      // Get timestamp ranges for downloads
      const firstDownload = await this.prisma.downloads.findFirst({
        orderBy: {
          timestamp: 'asc',
        },
        select: {
          timestamp: true,
        },
      });

      const lastDownload = await this.prisma.downloads.findFirst({
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
          totalSize: diagnosticStats._sum.file_size || 0,
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
      const total = await this.prisma.users.count({ where });

      // Get users with pagination
      const users = await this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          email_verified: true,
          username: true,
          first_name: true,
          last_name: true,
          created_at: true,
          last_login_at: true,
          user_credit_balance: true,
          subscriptions: {
            where: {
              status: 'active',
            },
            select: {
              tier: true,
              status: true,
              current_period_start: true,
              current_period_end: true,
            },
            take: 1,
            orderBy: {
              current_period_start: 'desc',
            },
          },
        },
        orderBy: {
          created_at: 'desc',
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
            emailVerified: user.email_verified,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            createdAt: user.created_at.toISOString(),
            lastLoginAt: user.last_login_at ? user.last_login_at.toISOString() : null,
            creditsBalance: user.user_credit_balance?.amount || 0,
            subscription: activeSubscription
              ? {
                  tier: activeSubscription.tier,
                  status: activeSubscription.status,
                  currentPeriodStart: activeSubscription.current_period_start.toISOString(),
                  currentPeriodEnd: activeSubscription.current_period_end.toISOString(),
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
      const user = await this.prisma.users.findUnique({
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
      const stats = await this.prisma.subscriptions.groupBy({
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
        where.created_at = {};
        if (startDate) where.created_at.gte = startDate;
        if (endDate) where.created_at.lte = endDate;
      }

      // Get total operations and credits used
      const aggregates = await this.prisma.token_usage_ledger.aggregate({
        where,
        _count: {
          id: true,
        },
        _sum: {
          credits_deducted: true,
        },
      });

      // Get usage grouped by model
      const byModel = await this.prisma.token_usage_ledger.groupBy({
        by: ['model_id'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          credits_deducted: true,
        },
      });

      // Get usage grouped by operation type (request_type)
      const byOperation = await this.prisma.token_usage_ledger.groupBy({
        by: ['request_type'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          credits_deducted: true,
        },
      });

      logger.info('AdminController.getSystemUsage: Usage stats retrieved', {
        totalOperations: aggregates._count.id,
        totalCreditsUsed: aggregates._sum.credits_deducted,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      res.json(successResponse({
        totalOperations: aggregates._count.id || 0,
        totalCreditsUsed: aggregates._sum.credits_deducted || 0,
        byModel: byModel.map((m: any) => ({
          modelId: m.model_id,
          operations: m._count.id,
          creditsUsed: m._sum.credits_deducted || 0,
        })),
        byOperation: byOperation.map((o: any) => ({
          operationType: o.request_type,
          operations: o._count.id,
          creditsUsed: o._sum.credits_deducted || 0,
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

  // ===========================================================================
  // Refund Management Endpoints (Plan 192 Section 7)
  // ===========================================================================

  /**
   * GET /admin/refunds
   * List all pending refund requests (admin review queue)
   *
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'
   * - refundType: 'manual_admin' | 'proration_credit' | 'chargeback'
   *
   * Response 200:
   * {
   *   "status": "success",
   *   "data": {
   *     "refunds": [...],
   *     "pagination": {
   *       "page": 1,
   *       "limit": 20,
   *       "total": 5,
   *       "totalPages": 1
   *     }
   *   }
   * }
   */
  async listRefunds(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const status = req.query.status as string | undefined;
      const refundType = req.query.refundType as string | undefined;

      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (refundType) {
        where.refund_type = refundType;
      }

      // Get total count for pagination
      const total = await this.prisma.subscription_refund.count({ where });

      // Get refunds with user and subscription details
      const refunds = await this.prisma.subscription_refund.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          subscription_monetization: {
            select: {
              id: true,
              tier: true,
              status: true,
              base_price_usd: true,
            },
          },
          admin_user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { requested_at: 'desc' },
      });

      logger.info('AdminController.listRefunds: Refunds retrieved', {
        page,
        limit,
        total,
        status,
        refundType,
      });

      // Transform to camelCase
      res.json(
        successResponse(
          refunds.map((refund) => ({
            id: refund.id,
            userId: refund.user_id,
            subscriptionId: refund.subscription_id,
            refundType: refund.refund_type,
            refundReason: refund.refund_reason,
            requestedBy: refund.requested_by,
            requestedAt: refund.requested_at.toISOString(),
            originalChargeAmountUsd: Number(refund.original_charge_amount_usd),
            refundAmountUsd: Number(refund.refund_amount_usd),
            stripeChargeId: refund.stripe_charge_id,
            stripeRefundId: refund.stripe_refund_id,
            status: refund.status,
            processedAt: refund.processed_at?.toISOString() || null,
            stripeProcessedAt: refund.stripe_processed_at?.toISOString() || null,
            failureReason: refund.failure_reason,
            adminNotes: refund.admin_notes,
            ipAddress: refund.ip_address,
            createdAt: refund.created_at.toISOString(),
            updatedAt: refund.updated_at.toISOString(),
            user: {
              id: refund.users.id,
              email: refund.users.email,
              firstName: refund.users.first_name,
              lastName: refund.users.last_name,
            },
            subscription: {
              id: refund.subscription_monetization.id,
              tier: refund.subscription_monetization.tier,
              status: refund.subscription_monetization.status,
              basePriceUsd: Number(refund.subscription_monetization.base_price_usd),
            },
            adminUser: {
              id: refund.admin_user.id,
              email: refund.admin_user.email,
              firstName: refund.admin_user.first_name,
              lastName: refund.admin_user.last_name,
            },
          })),
          {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          }
        )
      );
    } catch (error) {
      logger.error('AdminController.listRefunds: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve refunds',
          details:
            process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        },
      });
    }
  }

  /**
   * POST /admin/refunds/:id/approve
   * Approve a pending refund request and process with Stripe
   *
   * Path Parameters:
   * - id: string (refund ID)
   *
   * Response 200:
   * {
   *   "status": "success",
   *   "data": {
   *     "refund": { ... }
   *   }
   * }
   *
   * Response 404: Refund not found
   * Response 400: Invalid refund status
   * Response 500: Server error
   */
  async approveRefund(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!adminUserId) {
        res.status(401).json({
          error: {
            code: 'unauthorized',
            message: 'Admin user ID not found in request',
          },
        });
        return;
      }

      // Call RefundService to approve and process
      const refund = await this.refundService.approveAndProcessRefund(id, adminUserId);

      logger.info('AdminController.approveRefund: Refund approved', {
        refundId: id,
        adminUserId,
        stripeRefundId: refund.stripe_refund_id,
      });

      // Transform to camelCase
      res.json(
        successResponse({
          id: refund.id,
          userId: refund.user_id,
          subscriptionId: refund.subscription_id,
          refundType: refund.refund_type,
          refundReason: refund.refund_reason,
          requestedBy: refund.requested_by,
          requestedAt: refund.requested_at.toISOString(),
          originalChargeAmountUsd: Number(refund.original_charge_amount_usd),
          refundAmountUsd: Number(refund.refund_amount_usd),
          stripeChargeId: refund.stripe_charge_id,
          stripeRefundId: refund.stripe_refund_id,
          status: refund.status,
          processedAt: refund.processed_at?.toISOString() || null,
          stripeProcessedAt: refund.stripe_processed_at?.toISOString() || null,
          failureReason: refund.failure_reason,
          adminNotes: refund.admin_notes,
          createdAt: refund.created_at.toISOString(),
          updatedAt: refund.updated_at.toISOString(),
        })
      );
    } catch (error) {
      logger.error('AdminController.approveRefund: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Determine error status code
      const statusCode =
        error instanceof Error && error.message.includes('not found')
          ? 404
          : error instanceof Error && error.message.includes('Cannot approve')
          ? 400
          : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'not_found' : statusCode === 400 ? 'invalid_status' : 'internal_error',
          message: error instanceof Error ? error.message : 'Failed to approve refund',
          details:
            process.env.NODE_ENV === 'development' && error instanceof Error
              ? error.stack
              : undefined,
        },
      });
    }
  }

  /**
   * POST /admin/refunds/:id/cancel
   * Cancel a pending refund request
   *
   * Path Parameters:
   * - id: string (refund ID)
   *
   * Request Body:
   * {
   *   "reason": "string"
   * }
   *
   * Response 200:
   * {
   *   "status": "success",
   *   "data": {
   *     "refund": { ... }
   *   }
   * }
   *
   * Response 404: Refund not found
   * Response 400: Invalid refund status
   * Response 500: Server error
   */
  async cancelRefund(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!adminUserId) {
        res.status(401).json({
          error: {
            code: 'unauthorized',
            message: 'Admin user ID not found in request',
          },
        });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: 'Cancellation reason is required',
          },
        });
        return;
      }

      // Call RefundService to cancel refund
      const refund = await this.refundService.cancelRefund(id, adminUserId, reason);

      logger.info('AdminController.cancelRefund: Refund cancelled', {
        refundId: id,
        adminUserId,
        reason,
      });

      // Transform to camelCase
      res.json(
        successResponse({
          id: refund.id,
          userId: refund.user_id,
          subscriptionId: refund.subscription_id,
          refundType: refund.refund_type,
          refundReason: refund.refund_reason,
          requestedBy: refund.requested_by,
          requestedAt: refund.requested_at.toISOString(),
          originalChargeAmountUsd: Number(refund.original_charge_amount_usd),
          refundAmountUsd: Number(refund.refund_amount_usd),
          stripeChargeId: refund.stripe_charge_id,
          stripeRefundId: refund.stripe_refund_id,
          status: refund.status,
          processedAt: refund.processed_at?.toISOString() || null,
          stripeProcessedAt: refund.stripe_processed_at?.toISOString() || null,
          failureReason: refund.failure_reason,
          adminNotes: refund.admin_notes,
          createdAt: refund.created_at.toISOString(),
          updatedAt: refund.updated_at.toISOString(),
        })
      );
    } catch (error) {
      logger.error('AdminController.cancelRefund: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Determine error status code
      const statusCode =
        error instanceof Error && error.message.includes('not found')
          ? 404
          : error instanceof Error && error.message.includes('Cannot cancel')
          ? 400
          : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'not_found' : statusCode === 400 ? 'invalid_status' : 'internal_error',
          message: error instanceof Error ? error.message : 'Failed to cancel refund',
          details:
            process.env.NODE_ENV === 'development' && error instanceof Error
              ? error.stack
              : undefined,
        },
      });
    }
  }

  /**
   * POST /admin/subscriptions/:id/cancel-with-refund
   * Manual cancel subscription with full refund
   * (For users who forgot to cancel before billing)
   *
   * Path Parameters:
   * - id: string (subscription ID)
   *
   * Request Body:
   * {
   *   "refundReason": "string",
   *   "adminNotes": "string (optional)"
   * }
   *
   * Response 200:
   * {
   *   "status": "success",
   *   "data": {
   *     "subscription": { ... },
   *     "refund": { ... }
   *   }
   * }
   *
   * Response 404: Subscription not found
   * Response 400: Invalid subscription status
   * Response 500: Server error
   */
  async cancelSubscriptionWithRefund(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { refundReason, adminNotes, refundAmount } = req.body;
      const adminUserId = (req as any).user?.sub || (req as any).user?.id;

      if (!adminUserId) {
        res.status(401).json({
          error: {
            code: 'unauthorized',
            message: 'Admin user ID not found in request',
          },
        });
        return;
      }

      // Validation: Refund reason is required
      if (!refundReason || typeof refundReason !== 'string' || refundReason.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: 'Refund reason is required and cannot be empty',
          },
        });
        return;
      }

      // Validation: Refund amount must be provided and valid
      if (refundAmount === undefined || refundAmount === null) {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: 'Refund amount is required',
          },
        });
        return;
      }

      const refundAmountNum = Number(refundAmount);
      if (isNaN(refundAmountNum) || refundAmountNum <= 0) {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: 'Refund amount must be greater than 0',
          },
        });
        return;
      }

      // Get subscription to validate refund amount against base price
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id },
        select: { base_price_usd: true },
      });

      if (!subscription) {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Subscription not found',
          },
        });
        return;
      }

      const basePriceUsd = Number(subscription.base_price_usd);

      // Validation: Refund amount cannot exceed base price (last charge)
      if (refundAmountNum > basePriceUsd) {
        res.status(400).json({
          error: {
            code: 'invalid_input',
            message: `Refund amount ($${refundAmountNum.toFixed(2)}) cannot exceed the subscription price ($${basePriceUsd.toFixed(2)})`,
          },
        });
        return;
      }

      // Call SubscriptionManagementService to cancel with refund
      const result = await this.subscriptionManagementService.cancelWithRefund(
        id,
        adminUserId,
        refundReason,
        refundAmountNum,
        adminNotes
      );

      logger.info('AdminController.cancelSubscriptionWithRefund: Subscription cancelled with refund', {
        subscriptionId: id,
        adminUserId,
        refundId: result.refund.id,
      });

      // Transform to camelCase (subscription is already mapped by service)
      res.json(
        successResponse({
          subscription: result.subscription,
          refund: {
            id: result.refund.id,
            userId: result.refund.user_id,
            subscriptionId: result.refund.subscription_id,
            refundType: result.refund.refund_type,
            refundReason: result.refund.refund_reason,
            requestedBy: result.refund.requested_by,
            requestedAt: result.refund.requested_at.toISOString(),
            originalChargeAmountUsd: Number(result.refund.original_charge_amount_usd),
            refundAmountUsd: Number(result.refund.refund_amount_usd),
            stripeChargeId: result.refund.stripe_charge_id,
            stripeRefundId: result.refund.stripe_refund_id,
            status: result.refund.status,
            processedAt: result.refund.processed_at?.toISOString() || null,
            stripeProcessedAt: result.refund.stripe_processed_at?.toISOString() || null,
            failureReason: result.refund.failure_reason,
            adminNotes: result.refund.admin_notes,
            createdAt: result.refund.created_at.toISOString(),
            updatedAt: result.refund.updated_at.toISOString(),
          },
        })
      );
    } catch (error) {
      logger.error('AdminController.cancelSubscriptionWithRefund: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Determine error status code
      const statusCode =
        error instanceof Error && error.message.includes('not found')
          ? 404
          : error instanceof Error &&
            (error.message.includes('already cancelled') || error.message.includes('Invalid'))
          ? 400
          : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'not_found' : statusCode === 400 ? 'invalid_status' : 'internal_error',
          message: error instanceof Error ? error.message : 'Failed to cancel subscription with refund',
          details:
            process.env.NODE_ENV === 'development' && error instanceof Error
              ? error.stack
              : undefined,
        },
      });
    }
  }

  /**
   * GET /admin/subscriptions/:id/credit-usage
   * Get credit usage for current billing period
   *
   * Path Parameters:
   * - id: string (subscription ID)
   *
   * Response 200:
   * {
   *   "status": "success",
   *   "data": {
   *     "subscriptionId": "string",
   *     "currentPeriodStart": "ISO date",
   *     "currentPeriodEnd": "ISO date",
   *     "creditsUsed": number
   *   }
   * }
   *
   * Response 404: Subscription not found
   * Response 500: Server error
   */
  async getSubscriptionCreditUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Get subscription with period dates
      const subscription = await this.prisma.subscription_monetization.findUnique({
        where: { id },
        select: {
          id: true,
          user_id: true,
          current_period_start: true,
          current_period_end: true,
        },
      });

      if (!subscription) {
        res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Subscription not found',
          },
        });
        return;
      }

      // Get credit usage for current billing period
      const currentPeriodStart = subscription.current_period_start;
      const currentPeriodEnd = subscription.current_period_end;

      if (!currentPeriodStart || !currentPeriodEnd) {
        // No billing period data, return 0 usage
        res.json(
          successResponse({
            subscriptionId: subscription.id,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            creditsUsed: 0,
          })
        );
        return;
      }

      // Sum up credits used from token_usage_ledger table for this user in current period
      const usageSum = await this.prisma.token_usage_ledger.aggregate({
        _sum: {
          credits_deducted: true,
        },
        where: {
          user_id: subscription.user_id,
          request_started_at: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd,
          },
        },
      });

      const creditsUsed = usageSum._sum.credits_deducted || 0;

      logger.info('AdminController.getSubscriptionCreditUsage: Retrieved credit usage', {
        subscriptionId: id,
        userId: subscription.user_id,
        creditsUsed,
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
      });

      res.json(
        successResponse({
          subscriptionId: subscription.id,
          currentPeriodStart: currentPeriodStart.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          creditsUsed: Number(creditsUsed),
        })
      );
    } catch (error) {
      logger.error('AdminController.getSubscriptionCreditUsage: Error', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve credit usage',
          details:
            process.env.NODE_ENV === 'development' && error instanceof Error
              ? error.stack
              : undefined,
        },
      });
    }
  }
}
