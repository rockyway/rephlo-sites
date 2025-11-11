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

@injectable()
export class FraudDetectionController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(FraudDetectionService) private fraudService: FraudDetectionService
  ) {
    logger.debug('FraudDetectionController: Initialized');
  }

  async listFraudEvents(_req: Request, res: Response): Promise<void> {
    try {
      const events = await this.prisma.couponFraudDetection.findMany({
        orderBy: { detectedAt: 'desc' },
        take: 100, // Limit to last 100 events
      });

      res.json({
        events: events.map((e) => ({
          id: e.id,
          coupon_id: e.couponId,
          user_id: e.userId,
          detection_type: e.detectionType,
          severity: e.severity,
          is_flagged: e.isFlagged,
          detected_at: e.detectedAt.toISOString(),
          reviewed_at: e.reviewedAt?.toISOString() || null,
          details: e.details,
        })),
      });
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

      res.json({
        id: event.id,
        resolution: data.resolution,
        reviewed_at: event.reviewedAt?.toISOString(),
        is_flagged: event.isFlagged,
      });
    } catch (error: any) {
      logger.error('Failed to review fraud event', { id, error });
      res.status(400).json({
        error: { code: 'review_failed', message: error.message || 'Failed to review fraud event' },
      });
    }
  }

  async getPendingReviews(_req: Request, res: Response): Promise<void> {
    try {
      const events = await this.fraudService.getPendingFraudReviews();

      res.json({
        events: events.map((e) => ({
          id: e.id,
          coupon_id: e.couponId,
          user_id: e.userId,
          detection_type: e.detectionType,
          severity: e.severity,
          detected_at: e.detectedAt.toISOString(),
          details: e.details,
        })),
      });
    } catch (error: any) {
      logger.error('Failed to get pending reviews', { error });
      res.status(500).json({
        error: { code: 'internal_server_error', message: 'Failed to retrieve pending reviews' },
      });
    }
  }
}
