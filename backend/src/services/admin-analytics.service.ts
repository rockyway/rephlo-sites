/**
 * Admin Analytics Service
 *
 * Business logic for Unified Admin Dashboard analytics endpoints.
 * Aggregates data from multiple monetization plans (109, 110, 111, 112)
 * to provide cross-plan KPIs and recent activity feeds.
 *
 * Features:
 * - Dashboard KPI aggregation (revenue, users, credits, coupons)
 * - Recent activity feed with multi-source event tracking
 * - Period-based metrics with change calculations
 *
 * @module services/admin-analytics.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  DashboardKPIsResponse,
  RecentActivityResponse,
  PeriodConfig,
  ChangeMetric,
  ActivityEvent,
  ActivityEventUser,
} from '../types/admin-analytics.types';

@injectable()
export class AdminAnalyticsService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AdminAnalyticsService: Initialized');
  }

  // ===========================================================================
  // Dashboard KPIs
  // ===========================================================================

  /**
   * Get dashboard KPIs with cross-plan aggregation
   *
   * @param period - Time period for metrics ('7d', '30d', '90d', '1y')
   * @returns Dashboard KPIs with revenue, users, credits, and coupons
   */
  async getDashboardKPIs(period: string = '30d'): Promise<DashboardKPIsResponse> {
    try {
      const periodConfig = this.calculatePeriodDates(period);

      // Run all queries in parallel for performance
      const [
        totalRevenue,
        activeUsers,
        creditsConsumed,
        couponRedemptions,
      ] = await Promise.all([
        this.getTotalRevenue(periodConfig),
        this.getActiveUsers(periodConfig),
        this.getCreditsConsumed(periodConfig),
        this.getCouponRedemptions(periodConfig),
      ]);

      logger.info('AdminAnalyticsService.getDashboardKPIs: KPIs retrieved', {
        period,
        totalRevenue: totalRevenue.value,
        activeUsers: activeUsers.value,
        creditsConsumed: creditsConsumed.value,
        couponRedemptions: couponRedemptions.value,
      });

      return {
        totalRevenue,
        activeUsers,
        creditsConsumed,
        couponRedemptions,
      };
    } catch (error) {
      logger.error('AdminAnalyticsService.getDashboardKPIs: Error', {
        error: error instanceof Error ? error.message : String(error),
        period,
      });
      throw error;
    }
  }

  /**
   * Calculate total revenue (MRR + Perpetual + Upgrades)
   */
  private async getTotalRevenue(periodConfig: PeriodConfig) {
    // Get MRR from active subscriptions
    const currentSubscriptions = await this.prisma.subscriptionMonetization.findMany({
      where: {
        status: 'active',
        currentPeriodStart: { lte: periodConfig.endDate },
        currentPeriodEnd: { gte: periodConfig.startDate },
      },
      select: {
        monthlyCreditAllocation: true,
        basePriceUsd: true,
        billingCycle: true,
      },
    });

    const previousSubscriptions = await this.prisma.subscriptionMonetization.findMany({
      where: {
        status: 'active',
        currentPeriodStart: { lte: periodConfig.previousEndDate },
        currentPeriodEnd: { gte: periodConfig.previousStartDate },
      },
      select: {
        monthlyCreditAllocation: true,
        basePriceUsd: true,
        billingCycle: true,
      },
    });

    // Calculate MRR (convert annual to monthly)
    const currentMRR = currentSubscriptions.reduce((sum, sub) => {
      const monthlyPrice = sub.billingCycle === 'annual'
        ? Number(sub.basePriceUsd) / 12
        : Number(sub.basePriceUsd);
      return sum + monthlyPrice * 100; // Convert to cents
    }, 0);

    const previousMRR = previousSubscriptions.reduce((sum, sub) => {
      const monthlyPrice = sub.billingCycle === 'annual'
        ? Number(sub.basePriceUsd) / 12
        : Number(sub.basePriceUsd);
      return sum + monthlyPrice * 100; // Convert to cents
    }, 0);

    // Get perpetual license revenue
    const currentPerpetual = await this.prisma.perpetualLicense.aggregate({
      where: {
        purchasedAt: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
      },
      _sum: { purchasePriceUsd: true },
    });

    const previousPerpetual = await this.prisma.perpetualLicense.aggregate({
      where: {
        purchasedAt: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
      },
      _sum: { purchasePriceUsd: true },
    });

    const currentPerpetualRevenue = Number(currentPerpetual._sum.purchasePriceUsd || 0) * 100; // Convert to cents
    const previousPerpetualRevenue = Number(previousPerpetual._sum.purchasePriceUsd || 0) * 100;

    // Get version upgrade revenue
    const currentUpgrades = await this.prisma.versionUpgrade.aggregate({
      where: {
        purchasedAt: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
        status: 'completed',
      },
      _sum: { upgradePriceUsd: true },
    });

    const previousUpgrades = await this.prisma.versionUpgrade.aggregate({
      where: {
        purchasedAt: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
        status: 'completed',
      },
      _sum: { upgradePriceUsd: true },
    });

    const currentUpgradeRevenue = Number(currentUpgrades._sum.upgradePriceUsd || 0) * 100; // Convert to cents
    const previousUpgradeRevenue = Number(previousUpgrades._sum.upgradePriceUsd || 0) * 100;

    // Calculate totals
    const currentTotal = currentMRR + currentPerpetualRevenue + currentUpgradeRevenue;
    const previousTotal = previousMRR + previousPerpetualRevenue + previousUpgradeRevenue;

    return {
      value: Math.round(currentTotal),
      change: this.calculateChange(currentTotal, previousTotal),
      breakdown: {
        mrr: Math.round(currentMRR),
        perpetual: Math.round(currentPerpetualRevenue),
        upgrades: Math.round(currentUpgradeRevenue),
      },
    };
  }

  /**
   * Calculate active users count (users with active subscription OR license)
   */
  private async getActiveUsers(periodConfig: PeriodConfig) {
    // Get users with active subscriptions
    const currentSubUsers = await this.prisma.user.count({
      where: {
        subscriptionMonetization: {
          some: {
            status: 'active',
            currentPeriodEnd: { gte: periodConfig.endDate },
          },
        },
      },
    });

    // Get users with active licenses
    const currentLicenseUsers = await this.prisma.user.count({
      where: {
        perpetualLicenses: {
          some: {
            status: 'active',
          },
        },
      },
    });

    // Get users with both (to avoid double counting)
    const currentBothUsers = await this.prisma.user.count({
      where: {
        AND: [
          {
            subscriptionMonetization: {
              some: {
                status: 'active',
                currentPeriodEnd: { gte: periodConfig.endDate },
              },
            },
          },
          {
            perpetualLicenses: {
              some: {
                status: 'active',
              },
            },
          },
        ],
      },
    });

    const currentCount = currentSubUsers + currentLicenseUsers - currentBothUsers;

    // Same for previous period
    const previousSubUsers = await this.prisma.user.count({
      where: {
        subscriptionMonetization: {
          some: {
            status: 'active',
            currentPeriodEnd: { gte: periodConfig.previousEndDate },
          },
        },
      },
    });

    const previousLicenseUsers = await this.prisma.user.count({
      where: {
        perpetualLicenses: {
          some: {
            status: 'active',
          },
        },
      },
    });

    const previousBothUsers = await this.prisma.user.count({
      where: {
        AND: [
          {
            subscriptionMonetization: {
              some: {
                status: 'active',
                currentPeriodEnd: { gte: periodConfig.previousEndDate },
              },
            },
          },
          {
            perpetualLicenses: {
              some: {
                status: 'active',
              },
            },
          },
        ],
      },
    });

    const previousCount = previousSubUsers + previousLicenseUsers - previousBothUsers;

    return {
      value: currentCount,
      change: this.calculateChange(currentCount, previousCount),
    };
  }

  /**
   * Calculate total credits consumed from TokenUsageLedger
   */
  private async getCreditsConsumed(periodConfig: PeriodConfig) {
    const currentCredits = await this.prisma.tokenUsageLedger.aggregate({
      where: {
        createdAt: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
      },
      _sum: { creditsDeducted: true },
    });

    const previousCredits = await this.prisma.tokenUsageLedger.aggregate({
      where: {
        createdAt: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
      },
      _sum: { creditsDeducted: true },
    });

    const currentValue = currentCredits._sum.creditsDeducted || 0;
    const previousValue = previousCredits._sum.creditsDeducted || 0;

    return {
      value: currentValue,
      change: this.calculateChange(currentValue, previousValue),
    };
  }

  /**
   * Calculate coupon redemptions and total discount value
   */
  private async getCouponRedemptions(periodConfig: PeriodConfig) {
    const currentRedemptions = await this.prisma.couponRedemption.aggregate({
      where: {
        redemptionDate: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
        redemptionStatus: 'success',
      },
      _count: { id: true },
      _sum: { discountAppliedUsd: true },
    });

    const previousRedemptions = await this.prisma.couponRedemption.aggregate({
      where: {
        redemptionDate: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
        redemptionStatus: 'success',
      },
      _count: { id: true },
      _sum: { discountAppliedUsd: true },
    });

    const currentCount = currentRedemptions._count.id || 0;
    const previousCount = previousRedemptions._count.id || 0;
    const currentDiscount = Number(currentRedemptions._sum.discountAppliedUsd || 0) * 100; // Convert to cents

    return {
      value: currentCount,
      change: this.calculateChange(currentCount, previousCount),
      totalDiscount: Math.round(currentDiscount),
    };
  }

  // ===========================================================================
  // Recent Activity Feed
  // ===========================================================================

  /**
   * Get recent activity feed from multiple sources
   *
   * @param limit - Maximum number of events to return (default: 20, max: 100)
   * @param offset - Pagination offset (default: 0)
   * @returns Recent activity events with pagination
   */
  async getRecentActivity(limit: number = 20, offset: number = 0): Promise<RecentActivityResponse> {
    try {
      // Validate and clamp parameters
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);

      // Fetch events from multiple sources in parallel
      const [
        subscriptionEvents,
        licenseEvents,
        couponEvents,
        creditEvents,
        deviceEvents,
      ] = await Promise.all([
        this.getSubscriptionEvents(safeLimit, safeOffset),
        this.getLicenseEvents(safeLimit, safeOffset),
        this.getCouponEvents(safeLimit, safeOffset),
        this.getCreditEvents(safeLimit, safeOffset),
        this.getDeviceEvents(safeLimit, safeOffset),
      ]);

      // Combine and sort all events by timestamp
      const allEvents = [
        ...subscriptionEvents,
        ...licenseEvents,
        ...couponEvents,
        ...creditEvents,
        ...deviceEvents,
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination after sorting
      const paginatedEvents = allEvents.slice(safeOffset, safeOffset + safeLimit);

      logger.info('AdminAnalyticsService.getRecentActivity: Activity retrieved', {
        total: allEvents.length,
        limit: safeLimit,
        offset: safeOffset,
        returned: paginatedEvents.length,
      });

      return {
        events: paginatedEvents,
        total: allEvents.length,
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      logger.error('AdminAnalyticsService.getRecentActivity: Error', {
        error: error instanceof Error ? error.message : String(error),
        limit,
        offset,
      });
      throw error;
    }
  }

  /**
   * Get subscription events (created, updated)
   */
  private async getSubscriptionEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const subscriptions = await this.prisma.subscriptionMonetization.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      type: 'subscription' as const,
      action: 'created' as const,
      description: `User ${sub.status === 'active' ? 'activated' : 'created'} ${sub.tier} subscription`,
      user: this.formatUser(sub.user),
      metadata: {
        tier: sub.tier,
        status: sub.status,
        billingCycle: sub.billingCycle,
      },
      timestamp: sub.createdAt,
    }));
  }

  /**
   * Get perpetual license events (created, activated)
   */
  private async getLicenseEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const licenses = await this.prisma.perpetualLicense.findMany({
      take: limit,
      orderBy: { purchasedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return licenses.map((license) => ({
      id: license.id,
      type: 'license' as const,
      action: license.activatedAt ? ('activated' as const) : ('created' as const),
      description: `User purchased Perpetual License (v${license.purchasedVersion})`,
      user: this.formatUser(license.user),
      metadata: {
        licenseKey: license.licenseKey,
        version: license.purchasedVersion,
        price: Number(license.purchasePriceUsd),
      },
      timestamp: license.purchasedAt,
    }));
  }

  /**
   * Get coupon redemption events
   */
  private async getCouponEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const redemptions = await this.prisma.couponRedemption.findMany({
      take: limit,
      orderBy: { redemptionDate: 'desc' },
      where: { redemptionStatus: 'success' },
      include: {
        coupon: { select: { code: true } },
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return redemptions
      .filter((redemption) => redemption.subscription?.user)
      .map((redemption) => ({
        id: redemption.id,
        type: 'coupon' as const,
        action: 'redeemed' as const,
        description: `User redeemed ${redemption.coupon.code} coupon`,
        user: this.formatUser(redemption.subscription!.user),
        metadata: {
          code: redemption.coupon.code,
          discount: Number(redemption.discountAppliedUsd),
        },
        timestamp: redemption.redemptionDate,
      }));
  }

  /**
   * Get credit allocation events
   */
  private async getCreditEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const allocations = await this.prisma.creditAllocation.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: { source: { in: ['bonus', 'admin_grant', 'referral', 'coupon'] } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return allocations.map((allocation) => ({
      id: allocation.id,
      type: 'credit' as const,
      action: 'created' as const,
      description: `User received ${allocation.amount.toLocaleString()} ${allocation.source} credits`,
      user: this.formatUser(allocation.user),
      metadata: {
        amount: allocation.amount,
        source: allocation.source,
      },
      timestamp: allocation.createdAt,
    }));
  }

  /**
   * Get device activation events
   */
  private async getDeviceEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const activations = await this.prisma.licenseActivation.findMany({
      take: limit,
      orderBy: { activatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return activations.map((activation) => ({
      id: activation.id,
      type: 'device' as const,
      action: activation.status === 'active' ? ('activated' as const) : ('deactivated' as const),
      description: `User ${activation.status === 'active' ? 'activated' : 'deactivated'} device (${activation.deviceName || 'Unknown'})`,
      user: this.formatUser(activation.user),
      metadata: {
        deviceName: activation.deviceName,
        osType: activation.osType,
        status: activation.status,
      },
      timestamp: activation.activatedAt,
    }));
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Calculate period dates based on period string
   */
  private calculatePeriodDates(period: string): PeriodConfig {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let startDate: Date;
    let durationMs: number;

    switch (period) {
      case '7d':
        durationMs = 7 * 24 * 60 * 60 * 1000;
        startDate = new Date(now.getTime() - durationMs);
        break;
      case '90d':
        durationMs = 90 * 24 * 60 * 60 * 1000;
        startDate = new Date(now.getTime() - durationMs);
        break;
      case '1y':
        durationMs = 365 * 24 * 60 * 60 * 1000;
        startDate = new Date(now.getTime() - durationMs);
        break;
      case '30d':
      default:
        durationMs = 30 * 24 * 60 * 60 * 1000;
        startDate = new Date(now.getTime() - durationMs);
        break;
    }

    startDate.setHours(0, 0, 0, 0);

    // Calculate previous period (same duration before start date)
    const previousEndDate = new Date(startDate.getTime() - 1);
    previousEndDate.setHours(23, 59, 59, 999);
    const previousStartDate = new Date(previousEndDate.getTime() - durationMs);
    previousStartDate.setHours(0, 0, 0, 0);

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    };
  }

  /**
   * Calculate change percentage and trend
   */
  private calculateChange(current: number, previous: number): ChangeMetric {
    if (previous === 0) {
      return {
        value: current > 0 ? 100 : 0,
        trend: current > 0 ? 'up' : 'neutral',
      };
    }

    const percentageChange = ((current - previous) / previous) * 100;

    return {
      value: Math.abs(Math.round(percentageChange * 10) / 10), // Round to 1 decimal
      trend: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'neutral',
    };
  }

  /**
   * Format user object for activity events
   */
  private formatUser(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }): ActivityEventUser {
    const name =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.lastName || null;

    return {
      id: user.id,
      email: user.email,
      name,
    };
  }
}
