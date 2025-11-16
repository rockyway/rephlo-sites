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
    const currentSubscriptions = await this.prisma.subscription_monetization.findMany({
      where: {
        status: 'active',
        current_period_start: { lte: periodConfig.endDate },
        current_period_end: { gte: periodConfig.startDate },
      },
      select: {
        monthly_credit_allocation: true,
        base_price_usd: true,
        billing_cycle: true,
      },
    });

    const previousSubscriptions = await this.prisma.subscription_monetization.findMany({
      where: {
        status: 'active',
        current_period_start: { lte: periodConfig.previousEndDate },
        current_period_end: { gte: periodConfig.previousStartDate },
      },
      select: {
        monthly_credit_allocation: true,
        base_price_usd: true,
        billing_cycle: true,
      },
    });

    // Calculate MRR (convert annual to monthly)
    const currentMRR = currentSubscriptions.reduce((sum, sub) => {
      const monthlyPrice = sub.billing_cycle === 'annual'
        ? Number(sub.base_price_usd) / 12
        : Number(sub.base_price_usd);
      return sum + monthlyPrice * 100; // Convert to cents
    }, 0);

    const previousMRR = previousSubscriptions.reduce((sum, sub) => {
      const monthlyPrice = sub.billing_cycle === 'annual'
        ? Number(sub.base_price_usd) / 12
        : Number(sub.base_price_usd);
      return sum + monthlyPrice * 100; // Convert to cents
    }, 0);

    // Get perpetual license revenue
    const currentPerpetual = await this.prisma.perpetual_license.aggregate({
      where: {
        purchased_at: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
      },
      _sum: { purchase_price_usd: true },
    });

    const previousPerpetual = await this.prisma.perpetual_license.aggregate({
      where: {
        purchased_at: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
      },
      _sum: { purchase_price_usd: true },
    });

    const currentPerpetualRevenue = Number(currentPerpetual._sum.purchase_price_usd || 0) * 100; // Convert to cents
    const previousPerpetualRevenue = Number(previousPerpetual._sum.purchase_price_usd || 0) * 100;

    // Get version upgrade revenue
    const currentUpgrades = await this.prisma.version_upgrade.aggregate({
      where: {
        purchased_at: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
        status: 'completed',
      },
      _sum: { upgrade_price_usd: true },
    });

    const previousUpgrades = await this.prisma.version_upgrade.aggregate({
      where: {
        purchased_at: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
        status: 'completed',
      },
      _sum: { upgrade_price_usd: true },
    });

    const currentUpgradeRevenue = Number(currentUpgrades._sum.upgrade_price_usd || 0) * 100; // Convert to cents
    const previousUpgradeRevenue = Number(previousUpgrades._sum.upgrade_price_usd || 0) * 100;

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
    const currentSubUsers = await this.prisma.users.count({
      where: {
        subscription_monetization: {
          some: {
            status: 'active',
            current_period_end: { gte: periodConfig.endDate },
          },
        },
      },
    });

    // Get users with active licenses
    const currentLicenseUsers = await this.prisma.users.count({
      where: {
        perpetual_license: {
          some: {
            status: 'active',
          },
        },
      },
    });

    // Get users with both (to avoid double counting)
    const currentBothUsers = await this.prisma.users.count({
      where: {
        AND: [
          {
            subscription_monetization: {
              some: {
                status: 'active',
                current_period_end: { gte: periodConfig.endDate },
              },
            },
          },
          {
            perpetual_license: {
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
    const previousSubUsers = await this.prisma.users.count({
      where: {
        subscription_monetization: {
          some: {
            status: 'active',
            current_period_end: { gte: periodConfig.previousEndDate },
          },
        },
      },
    });

    const previousLicenseUsers = await this.prisma.users.count({
      where: {
        perpetual_license: {
          some: {
            status: 'active',
          },
        },
      },
    });

    const previousBothUsers = await this.prisma.users.count({
      where: {
        AND: [
          {
            subscription_monetization: {
              some: {
                status: 'active',
                current_period_end: { gte: periodConfig.previousEndDate },
              },
            },
          },
          {
            perpetual_license: {
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
    const currentCredits = await this.prisma.token_usage_ledger.aggregate({
      where: {
        created_at: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
      },
      _sum: { credits_deducted: true },
    });

    const previousCredits = await this.prisma.token_usage_ledger.aggregate({
      where: {
        created_at: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
      },
      _sum: { credits_deducted: true },
    });

    const currentValue = currentCredits._sum.credits_deducted || 0;
    const previousValue = previousCredits._sum.credits_deducted || 0;

    return {
      value: currentValue,
      change: this.calculateChange(currentValue, previousValue),
    };
  }

  /**
   * Calculate coupon redemptions and total discount value
   */
  private async getCouponRedemptions(periodConfig: PeriodConfig) {
    const currentRedemptions = await this.prisma.coupon_redemption.aggregate({
      where: {
        redemption_date: {
          gte: periodConfig.startDate,
          lte: periodConfig.endDate,
        },
        redemption_status: 'success',
      },
      _count: { id: true },
      _sum: { discount_applied_usd: true },
    });

    const previousRedemptions = await this.prisma.coupon_redemption.aggregate({
      where: {
        redemption_date: {
          gte: periodConfig.previousStartDate,
          lte: periodConfig.previousEndDate,
        },
        redemption_status: 'success',
      },
      _count: { id: true },
      _sum: { discount_applied_usd: true },
    });

    const currentCount = currentRedemptions._count.id || 0;
    const previousCount = previousRedemptions._count.id || 0;
    const currentDiscount = Number(currentRedemptions._sum.discount_applied_usd || 0) * 100; // Convert to cents

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
    const subscriptions = await this.prisma.subscription_monetization.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      type: 'subscription' as const,
      action: 'created' as const,
      description: `User ${sub.status === 'active' ? 'activated' : 'created'} ${sub.tier} subscription`,
      user: this.formatUser(sub.users),
      metadata: {
        tier: sub.tier,
        status: sub.status,
        billingCycle: sub.billing_cycle,
      },
      timestamp: sub.created_at,
    }));
  }

  /**
   * Get perpetual license events (created, activated)
   */
  private async getLicenseEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const licenses = await this.prisma.perpetual_license.findMany({
      take: limit,
      orderBy: { purchased_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return licenses.map((license) => ({
      id: license.id,
      type: 'license' as const,
      action: license.activated_at ? ('activated' as const) : ('created' as const),
      description: `User purchased Perpetual License (v${license.purchased_version})`,
      user: this.formatUser(license.users),
      metadata: {
        licenseKey: license.license_key,
        version: license.purchased_version,
        price: Number(license.purchase_price_usd),
      },
      timestamp: license.purchased_at,
    }));
  }

  /**
   * Get coupon redemption events
   */
  private async getCouponEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const redemptions = await this.prisma.coupon_redemption.findMany({
      take: limit,
      orderBy: { redemption_date: 'desc' },
      where: { redemption_status: 'success' },
      include: {
        coupon: { select: { code: true } },
        subscription_monetization: {
          include: {
            users: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    return redemptions
      .filter((redemption) => redemption.subscription_monetization?.users)
      .map((redemption) => ({
        id: redemption.id,
        type: 'coupon' as const,
        action: 'redeemed' as const,
        description: `User redeemed ${redemption.coupon.code} coupon`,
        user: this.formatUser(redemption.subscription_monetization!.users),
        metadata: {
          code: redemption.coupon.code,
          discount: Number(redemption.discount_applied_usd),
        },
        timestamp: redemption.redemption_date,
      }));
  }

  /**
   * Get credit allocation events
   */
  private async getCreditEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const allocations = await this.prisma.credit_allocation.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      where: { source: { in: ['bonus', 'admin_grant', 'referral', 'coupon'] } },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return allocations.map((allocation) => ({
      id: allocation.id,
      type: 'credit' as const,
      action: 'created' as const,
      description: `User received ${allocation.amount.toLocaleString()} ${allocation.source} credits`,
      user: this.formatUser(allocation.users),
      metadata: {
        amount: allocation.amount,
        source: allocation.source,
      },
      timestamp: allocation.created_at,
    }));
  }

  /**
   * Get device activation events
   */
  private async getDeviceEvents(limit: number, _offset: number): Promise<ActivityEvent[]> {
    const activations = await this.prisma.license_activation.findMany({
      take: limit,
      orderBy: { activated_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return activations.map((activation) => ({
      id: activation.id,
      type: 'device' as const,
      action: activation.status === 'active' ? ('activated' as const) : ('deactivated' as const),
      description: `User ${activation.status === 'active' ? 'activated' : 'deactivated'} device (${activation.device_name || 'Unknown'})`,
      user: this.formatUser(activation.users),
      metadata: {
        deviceName: activation.device_name,
        osType: activation.os_type,
        status: activation.status,
      },
      timestamp: activation.activated_at,
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
    first_name: string | null;
    last_name: string | null;
  }): ActivityEventUser {
    const name =
      user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || null;

    return {
      id: user.id,
      email: user.email,
      name,
    };
  }
}
