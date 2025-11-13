/**
 * Fraud Detection Controller
 *
 * REST API endpoints for fraud detection management (admin only).
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FraudDetectionService } from '../services/fraud-detection.service';
import { reviewFraudEventRequestSchema, safeValidateRequest } from '../types/coupon-validation';
import logger from '../utils/logger';
import { sendPaginatedResponse, successResponse } from '../utils/responses';

@injectable()
export class FraudDetectionController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(FraudDetectionService) private fraudService: FraudDetectionService
  ) {
    logger.debug('FraudDetectionController: Initialized');
  }

  /**
   * GET /admin/fraud-detection
   * List all fraud detection events (admin only)
   *
   * Query params:
   * - page: number (default: 0)
   * - limit: number (default: 50)
   * - severity: string (optional filter: low/medium/high/critical)
   * - status: string (optional filter: pending/reviewed/resolved)
   */
  async listFraudEvents(req: Request, res: Response): Promise<void> {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Build filter conditions
      const where: any = {};
      if (req.query.severity) {
        where.severity = req.query.severity;
      }
      if (req.query.status === 'pending') {
        where.reviewedAt = null;
      } else if (req.query.status === 'reviewed') {
        where.reviewedAt = { not: null };
      }

      // Fetch fraud events with pagination
      const [events, total] = await Promise.all([
        this.prisma.couponFraudDetection.findMany({
          where,
          skip: page * limit,
          take: limit,
          orderBy: { detectedAt: 'desc' },
        }),
        this.prisma.couponFraudDetection.count({ where }),
      ]);

      // Map to response format
      const mappedEvents = events.map((e) => ({
        id: e.id,
        coupon_id: e.couponId,
        user_id: e.userId,
        detection_type: e.detectionType,
        severity: e.severity,
        is_flagged: e.isFlagged,
        detected_at: e.detectedAt.toISOString(),
        reviewed_at: e.reviewedAt?.toISOString() || null,
        details: e.details,
      }));

      // Send modern paginated response
      sendPaginatedResponse(res, mappedEvents, total, page, limit);
    } catch (error: any) {
      logger.error('Failed to list fraud events', { error });
      res.status(500).json({
        error: { code: 'internal_server_error', message: 'Failed to retrieve fraud events' },
      });
    }
  }

  async reviewFraudEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const reviewerId = (req as any).userId;

    try {
      const data = safeValidateRequest(reviewFraudEventRequestSchema, req.body);

      const event = await this.fraudService.reviewFraudEvent(id, reviewerId, data.resolution);

      // Standard response format: flat data with camelCase
      res.json({
        status: 'success',
        data: {
          id: event.id,
          resolution: data.resolution,
          reviewedAt: event.reviewedAt?.toISOString(),
          isFlagged: event.isFlagged,
        }
      });
    } catch (error: any) {
      logger.error('Failed to review fraud event', { id, error });
      res.status(400).json({
        error: { code: 'review_failed', message: error.message || 'Failed to review fraud event' },
      });
    }
  }

  /**
   * GET /admin/fraud-detection/pending
   * List pending fraud detection reviews (admin only)
   */
  async getPendingReviews(_req: Request, res: Response): Promise<void> {
    try {
      const events = await this.fraudService.getPendingFraudReviews();

      // Map to response format
      const mappedEvents = events.map((e) => ({
        id: e.id,
        coupon_id: e.couponId,
        user_id: e.userId,
        detection_type: e.detectionType,
        severity: e.severity,
        detected_at: e.detectedAt.toISOString(),
        details: e.details,
      }));

      // Send modern success response
      res.json(successResponse(mappedEvents));
    } catch (error: any) {
      logger.error('Failed to get pending reviews', { error });
      res.status(500).json({
        error: { code: 'internal_server_error', message: 'Failed to retrieve pending reviews' },
      });
    }
  }
}
