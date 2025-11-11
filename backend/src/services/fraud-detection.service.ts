/**
 * Fraud Detection Service
 *
 * Detects and flags fraudulent coupon redemption patterns.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 * Reference: docs/reference/021-plan-111-coupon-system-integration.md (Section 6: Fraud Detection)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, CouponFraudDetection, FraudDetectionType, FraudSeverity } from '@prisma/client';
import { FraudDetectionResult } from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class FraudDetectionService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('FraudDetectionService: Initialized');
  }

  async detectVelocityAbuse(userId: string, couponId: string): Promise<FraudDetectionResult> {
    const lastHour = new Date(Date.now() - 3600000);
    const recentRedemptions = await this.prisma.couponRedemption.count({
      where: { userId, redemptionDate: { gte: lastHour } },
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
    const recentIPs = await this.prisma.couponRedemption.findMany({
      where: { userId, redemptionDate: { gte: last10Min } },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    });

    if (recentIPs.length > 1 && !recentIPs.some((r) => r.ipAddress === ipAddress)) {
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
    const userRedemptions = await this.prisma.couponRedemption.findMany({
      where: { userId, redemptionStatus: 'success' },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
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
    const recentRedemptions = await this.prisma.couponRedemption.count({
      where: {
        userId,
        redemptionDate: { gte: last5Min },
        redemptionStatus: 'success',
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

    return await this.prisma.couponFraudDetection.create({
      data: {
        ...data,
        detectedAt: new Date(),
      },
    });
  }

  async reviewFraudEvent(
    eventId: string,
    reviewerId: string,
    resolution: string
  ): Promise<CouponFraudDetection> {
    logger.info('Reviewing fraud event', { eventId, reviewerId, resolution });

    return await this.prisma.couponFraudDetection.update({
      where: { id: eventId },
      data: {
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        resolution,
        isFlagged: resolution === 'confirmed_fraud',
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
    const criticalFlags = await this.prisma.couponFraudDetection.count({
      where: {
        userId,
        couponId,
        severity: { in: ['critical', 'high'] },
        isFlagged: true,
        reviewedAt: null,
      },
    });

    return criticalFlags > 0;
  }

  async getUserFraudFlags(userId: string): Promise<CouponFraudDetection[]> {
    return await this.prisma.couponFraudDetection.findMany({
      where: { userId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async getCouponFraudFlags(couponId: string): Promise<CouponFraudDetection[]> {
    return await this.prisma.couponFraudDetection.findMany({
      where: { couponId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async getPendingFraudReviews(): Promise<CouponFraudDetection[]> {
    return await this.prisma.couponFraudDetection.findMany({
      where: {
        isFlagged: true,
        reviewedAt: null,
      },
      orderBy: { detectedAt: 'desc' },
    });
  }
}
