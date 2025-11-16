import { randomUUID } from 'crypto';
/**
 * Fraud Detection Service
 *
 * Detects and flags fraudulent coupon redemption patterns.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md (Section 6: Fraud Detection)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, fraud_detection_type as FraudDetectionType, fraud_severity as FraudSeverity, coupon_fraud_detection as CouponFraudDetection } from '@prisma/client';
import { FraudDetectionResult } from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class FraudDetectionService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('FraudDetectionService: Initialized');
  }

  async detectVelocityAbuse(userId: string, couponId: string): Promise<FraudDetectionResult> {
    const lastHour = new Date(Date.now() - 3600000);
    const recentRedemptions = await this.prisma.coupon_redemption.count({
      where: { user_id: userId, redemption_date: { gte: lastHour } },
    });

    if (recentRedemptions >= 3) {
      await this.flagFraudEvent({
        couponId,
        userId,
        detectionType: 'velocity_abuse',
        severity: 'high',
        details: { redemptionCount: recentRedemptions, timeWindow: '1 hour' },
        isFlagged: true,
      });

      return {
        detected: true,
        detectionType: 'velocity_abuse',
        severity: 'high',
        details: { redemptionCount: recentRedemptions },
        shouldBlock: true,
      };
    }

    return { detected: false, shouldBlock: false };
  }

  async detectIPSwitching(userId: string, ipAddress: string): Promise<FraudDetectionResult> {
    const last10Min = new Date(Date.now() - 600000);
    const recentIPs = await this.prisma.coupon_redemption.findMany({
      where: { user_id: userId, redemption_date: { gte: last10Min } },
      select: { ip_address: true },
      distinct: ['ip_address'],
    });

    if (recentIPs.length > 1 && !recentIPs.some((r) => r.ip_address === ipAddress)) {
      return {
        detected: true,
        detectionType: 'ip_switching',
        severity: 'medium',
        details: { ipAddresses: recentIPs, timeWindow: '10 minutes' },
        shouldBlock: false, // Log only
      };
    }

    return { detected: false, shouldBlock: false };
  }

  async detectBotPattern(userAgent: string, _requestMetadata: any): Promise<FraudDetectionResult> {
    const botPatterns = ['bot', 'crawler', 'spider', 'curl', 'wget', 'python-requests'];
    const isBot = botPatterns.some((pattern) => userAgent.toLowerCase().includes(pattern));

    if (isBot) {
      return {
        detected: true,
        detectionType: 'bot_pattern',
        severity: 'critical',
        details: { userAgent, matchedPattern: botPatterns.find((p) => userAgent.toLowerCase().includes(p)) },
        shouldBlock: true,
      };
    }

    return { detected: false, shouldBlock: false };
  }

  async detectDeviceFingerprintMismatch(userId: string, _deviceFingerprint: string): Promise<FraudDetectionResult> {
    // Device fingerprint consistency check
    const userRedemptions = await this.prisma.coupon_redemption.findMany({
      where: { user_id: userId, redemption_status: 'success' },
      select: { ip_address: true },
      distinct: ['ip_address'],
    });

    if (userRedemptions.length > 5) {
      return {
        detected: true,
        detectionType: 'device_fingerprint_mismatch',
        severity: 'medium',
        details: { uniqueDevices: userRedemptions.length },
        shouldBlock: false, // Log only
      };
    }

    return { detected: false, shouldBlock: false };
  }

  async detectStackingAbuse(userId: string): Promise<FraudDetectionResult> {
    // Check for multiple active coupons in same session
    const last5Min = new Date(Date.now() - 300000);
    const recentRedemptions = await this.prisma.coupon_redemption.count({
      where: {
        user_id: userId,
        redemption_date: { gte: last5Min },
        redemption_status: 'success',
      },
    });

    if (recentRedemptions > 1) {
      return {
        detected: true,
        detectionType: 'stacking_abuse',
        severity: 'low',
        details: { recentRedemptions },
        shouldBlock: false,
      };
    }

    return { detected: false, shouldBlock: false };
  }

  async flagFraudEvent(data: {
    couponId: string;
    userId: string;
    detectionType: FraudDetectionType;
    severity: FraudSeverity;
    details: any;
    isFlagged: boolean;
  }): Promise<CouponFraudDetection> {
    logger.warn('Flagging fraud event', data);

    return await this.prisma.coupon_fraud_detection.create({
      data: {
        id: randomUUID(),
        coupon_id: data.couponId,
        user_id: data.userId,
        detection_type: data.detectionType,
        severity: data.severity,
        details: data.details,
        is_flagged: data.isFlagged,
        detected_at: new Date(),
      },
    });
  }

  async reviewFraudEvent(
    eventId: string,
    reviewerId: string,
    resolution: string
  ): Promise<CouponFraudDetection> {
    logger.info('Reviewing fraud event', { eventId, reviewerId, resolution });

    return await this.prisma.coupon_fraud_detection.update({
      where: { id: eventId },
      data: {
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        resolution,
        is_flagged: resolution === 'confirmed_fraud',
      },
    });
  }

  async calculateSeverity(detectionType: FraudDetectionType, details: any): Promise<FraudSeverity> {
    // Severity calculation logic
    switch (detectionType) {
      case 'velocity_abuse':
        return details.redemptionCount > 5 ? 'critical' : 'high';
      case 'bot_pattern':
        return 'critical';
      case 'ip_switching':
        return details.uniqueIPs > 10 ? 'high' : 'medium';
      case 'device_fingerprint_mismatch':
        return 'medium';
      case 'stacking_abuse':
        return 'low';
      default:
        return 'low';
    }
  }

  async shouldBlockRedemption(userId: string, couponId: string): Promise<boolean> {
    const criticalFlags = await this.prisma.coupon_fraud_detection.count({
      where: {
        user_id: userId,
        coupon_id: couponId,
        severity: { in: ['critical', 'high'] },
        is_flagged: true,
        reviewed_at: null,
      },
    });

    return criticalFlags > 0;
  }

  async getUserFraudFlags(userId: string): Promise<CouponFraudDetection[]> {
    return await this.prisma.coupon_fraud_detection.findMany({
      where: { user_id: userId },
      orderBy: { detected_at: 'desc' },
    });
  }

  async getCouponFraudFlags(couponId: string): Promise<CouponFraudDetection[]> {
    return await this.prisma.coupon_fraud_detection.findMany({
      where: { coupon_id: couponId },
      orderBy: { detected_at: 'desc' },
    });
  }

  async getPendingFraudReviews(): Promise<CouponFraudDetection[]> {
    return await this.prisma.coupon_fraud_detection.findMany({
      where: {
        is_flagged: true,
        reviewed_at: null,
      },
      orderBy: { detected_at: 'desc' },
    });
  }
}
