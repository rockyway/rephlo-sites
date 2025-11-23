/**
 * Revenue Analytics Service
 *
 * Service for calculating revenue metrics and analytics across subscription,
 * perpetual licensing, and coupon systems.
 *
 * Endpoints serviced:
 * - GET /api/v1/admin/analytics/revenue/kpis
 * - GET /api/v1/admin/analytics/revenue/mix
 * - GET /api/v1/admin/analytics/revenue/trend
 * - GET /api/v1/admin/analytics/revenue/funnel
 * - GET /api/v1/admin/analytics/revenue/credit-usage
 * - GET /api/v1/admin/analytics/revenue/coupon-roi
 *
 * @module services/revenue-analytics.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  RevenueKPIsResponse,
  RevenueMixResponse,
  RevenueTrendResponse,
  RevenueFunnelResponse,
  CreditUsageResponse,
  CouponROIResponse,
  PeriodConfig,
} from '../types/revenue-analytics.types';

@injectable()
export class RevenueAnalyticsService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('RevenueAnalyticsService: Initialized');
  }

  /**
   * Parse period string and calculate date ranges
   * @param period '7d' | '30d' | '90d' | '1y'
   * @returns PeriodConfig with current and previous period dates
   */
  private getPeriodConfig(period: string): PeriodConfig {
    const now = new Date();
    const end_date = new Date(now);
    end_date.setHours(23, 59, 59, 999);

    let days: number;
    switch (period) {
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      case '1y':
        days = 365;
        break;
      default:
        days = 30;
    }

    const start_date = new Date(end_date);
    start_date.setDate(start_date.getDate() - days);
    start_date.setHours(0, 0, 0, 0);

    const previousEndDate = new Date(start_date);
    previousEndDate.setHours(23, 59, 59, 999);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);
    previousStartDate.setHours(0, 0, 0, 0);

    return { startDate: start_date, endDate: end_date, previousStartDate, previousEndDate };
  }

  /**
   * Calculate percentage change between two periods
   */
  private calculateChange(
    current: number,
    previous: number
  ): { value: number; trend: 'up' | 'down' | 'neutral' } {
    if (previous === 0) {
      return {
        value: current > 0 ? 100 : 0,
        trend: current > 0 ? 'up' : 'neutral',
      };
    }

    const percentageChange = ((current - previous) / previous) * 100;
    const trend = percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'neutral';

    return {
      value: Math.round(percentageChange * 10) / 10, // 1 decimal place
      trend,
    };
  }

  /**
   * GET /api/v1/admin/analytics/revenue/kpis
   * Get revenue KPIs: total revenue, MRR, perpetual, ARPU, coupon discount
   */
  async getRevenueKPIs(period: string = '30d'): Promise<RevenueKPIsResponse> {
    try {
      const config = this.getPeriodConfig(period);

      // Calculate MRR from subscriptions
      const currentSubscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          status: 'active',
          current_period_end: {
            gte: config.startDate,
          },
        },
        select: {
          base_price_usd: true,
          billing_cycle: true,
        },
      });

      const currentMRR = currentSubscriptions.reduce((sum: number, sub) => {
        // Convert to monthly if annual
        const monthlyRate =
          sub.billing_cycle === 'annual'
            ? parseFloat(sub.base_price_usd.toString()) / 12
            : parseFloat(sub.base_price_usd.toString());
        return sum + Math.round(monthlyRate * 100); // cents
      }, 0);

      const previousSubscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          status: 'active',
          current_period_end: {
            gte: config.previousStartDate,
            lte: config.previousEndDate,
          },
        },
        select: {
          base_price_usd: true,
          billing_cycle: true,
        },
      });

      const previousMRR = previousSubscriptions.reduce((sum: number, sub) => {
        const monthlyRate =
          sub.billing_cycle === 'annual'
            ? parseFloat(sub.base_price_usd.toString()) / 12
            : parseFloat(sub.base_price_usd.toString());
        return sum + Math.round(monthlyRate * 100);
      }, 0);

      // Calculate perpetual revenue from licenses purchased in period
      const perpetualRevenue = await this.prisma.perpetual_license.aggregate({
        where: {
          purchased_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        _sum: {
          purchase_price_usd: true,
        },
      });

      const currentPerpetualRevenue = Math.round(
        parseFloat((perpetualRevenue._sum.purchase_price_usd || 0).toString()) * 100
      );

      const previousPerpetualRevenue = await this.prisma.perpetual_license.aggregate({
        where: {
          purchased_at: {
            gte: config.previousStartDate,
            lte: config.previousEndDate,
          },
        },
        _sum: {
          purchase_price_usd: true,
        },
      });

      const prevPerpetualRevenue = Math.round(
        parseFloat((previousPerpetualRevenue._sum.purchase_price_usd || 0).toString()) * 100
      );

      // Calculate upgrade revenue
      const upgradeRevenue = await this.prisma.version_upgrade.aggregate({
        where: {
          purchased_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
          status: { in: ['completed'] },
        },
        _sum: {
          upgrade_price_usd: true,
        },
      });

      const currentUpgradeRevenue = Math.round(
        parseFloat((upgradeRevenue._sum.upgrade_price_usd || 0).toString()) * 100
      );

      const previousUpgradeRevenue = await this.prisma.version_upgrade.aggregate({
        where: {
          purchased_at: {
            gte: config.previousStartDate,
            lte: config.previousEndDate,
          },
          status: { in: ['completed'] },
        },
        _sum: {
          upgrade_price_usd: true,
        },
      });

      const prevUpgradeRevenue = Math.round(
        parseFloat((previousUpgradeRevenue._sum.upgrade_price_usd || 0).toString()) * 100
      );

      // Total revenue = MRR + Perpetual + Upgrades
      const currentTotalRevenue = currentMRR + currentPerpetualRevenue + currentUpgradeRevenue;
      const previousTotalRevenue = previousMRR + prevPerpetualRevenue + prevUpgradeRevenue;

      // Calculate ARPU (Average Revenue Per User)
      const activeUsers = await this.prisma.users.count({
        where: {
          OR: [
            {
              subscriptions: {
                some: {
                  status: 'active',
                  current_period_end: {
                    gte: config.startDate,
                  },
                },
              },
            },
            {
              perpetual_license: {
                some: {
                  purchased_at: {
                    gte: config.startDate,
                    lte: config.endDate,
                  },
                },
              },
            },
          ],
        },
      });

      const arpu = activeUsers > 0 ? Math.round(currentTotalRevenue / activeUsers) : 0;

      const previousActiveUsers = await this.prisma.users.count({
        where: {
          OR: [
            {
              subscriptions: {
                some: {
                  status: 'active',
                  current_period_end: {
                    gte: config.previousStartDate,
                  },
                },
              },
            },
            {
              perpetual_license: {
                some: {
                  purchased_at: {
                    gte: config.previousStartDate,
                    lte: config.previousEndDate,
                  },
                },
              },
            },
          ],
        },
      });

      const previousARPU =
        previousActiveUsers > 0
          ? Math.round(previousTotalRevenue / previousActiveUsers)
          : 0;

      // Calculate coupon discount
      const couponDiscount = await this.prisma.coupon_redemption.aggregate({
        where: {
          redemption_date: {
            gte: config.startDate,
            lte: config.endDate,
          },
          redemption_status: 'success',
        },
        _sum: {
          discount_applied_usd: true,
        },
      });

      const couponDiscountValue = Math.round(
        parseFloat((couponDiscount._sum.discount_applied_usd || 0).toString()) * 100
      );

      return {
        totalRevenue: {
          value: currentTotalRevenue,
          change: this.calculateChange(currentTotalRevenue, previousTotalRevenue),
        },
        mrr: {
          value: currentMRR,
          change: this.calculateChange(currentMRR, previousMRR),
        },
        perpetualRevenue: {
          value: currentPerpetualRevenue,
          change: this.calculateChange(currentPerpetualRevenue, prevPerpetualRevenue),
        },
        arpu: {
          value: arpu,
          change: this.calculateChange(arpu, previousARPU),
        },
        couponDiscount: {
          value: couponDiscountValue,
          period,
        },
      };
    } catch (error) {
      logger.error('RevenueAnalyticsService.getRevenueKPIs: Error', {
        period,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/revenue/mix
   * Get revenue breakdown by type
   */
  async getRevenueMix(period: string = '30d'): Promise<RevenueMixResponse> {
    try {
      const config = this.getPeriodConfig(period);

      // Subscription revenue (MRR)
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          status: 'active',
          current_period_end: {
            gte: config.startDate,
          },
        },
        select: {
          base_price_usd: true,
          billing_cycle: true,
        },
      });

      const subscriptionRevenue = subscriptions.reduce((sum: number, sub) => {
        const monthlyRate =
          sub.billing_cycle === 'annual'
            ? parseFloat(sub.base_price_usd.toString()) / 12
            : parseFloat(sub.base_price_usd.toString());
        return sum + Math.round(monthlyRate * 100);
      }, 0);

      // Perpetual revenue
      const perpetual = await this.prisma.perpetual_license.aggregate({
        where: {
          purchased_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        _sum: {
          purchase_price_usd: true,
        },
      });

      const perpetualRevenue = Math.round(
        parseFloat((perpetual._sum.purchase_price_usd || 0).toString()) * 100
      );

      // Upgrade revenue
      const upgrades = await this.prisma.version_upgrade.aggregate({
        where: {
          purchased_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
          status: { in: ['completed'] },
        },
        _sum: {
          upgrade_price_usd: true,
        },
      });

      const upgradeRevenue = Math.round(
        parseFloat((upgrades._sum.upgrade_price_usd || 0).toString()) * 100
      );

      // Calculate total and percentages
      const total = subscriptionRevenue + perpetualRevenue + upgradeRevenue;

      // Format as array of data points with percentages
      const data = [
        {
          name: 'Subscription',
          value: subscriptionRevenue,
          percentage: total > 0 ? Math.round((subscriptionRevenue / total) * 100) : 0,
        },
        {
          name: 'Perpetual',
          value: perpetualRevenue,
          percentage: total > 0 ? Math.round((perpetualRevenue / total) * 100) : 0,
        },
        {
          name: 'Upgrade',
          value: upgradeRevenue,
          percentage: total > 0 ? Math.round((upgradeRevenue / total) * 100) : 0,
        },
      ];

      return {
        data,
        total,
        period,
      };
    } catch (error) {
      logger.error('RevenueAnalyticsService.getRevenueMix: Error', {
        period,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/revenue/trend
   * Get revenue trend data with daily/weekly/monthly aggregation
   */
  async getRevenueTrend(period: string = '30d'): Promise<RevenueTrendResponse> {
    try {
      const config = this.getPeriodConfig(period);

      // Determine aggregation level
      const isDaily = period === '7d' || period === '30d';
      const isWeekly = period === '90d';
      const isMonthly = period === '1y';

      // Get subscription data
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: {
          created_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        select: {
          created_at: true,
          base_price_usd: true,
          billing_cycle: true,
        },
      });

      // Get perpetual license data
      const perpetuals = await this.prisma.perpetual_license.findMany({
        where: {
          purchased_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        select: {
          purchased_at: true,
          purchase_price_usd: true,
        },
      });

      // Get upgrade data
      const upgrades = await this.prisma.version_upgrade.findMany({
        where: {
          purchased_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
          status: { in: ['completed'] },
        },
        select: {
          purchased_at: true,
          upgrade_price_usd: true,
        },
      });

      // Aggregate by period
      const aggregated = new Map<string, {
        totalRevenue: number;
        subscriptionRevenue: number;
        perpetualRevenue: number;
      }>();

      const getKey = (date: Date) => {
        const d = new Date(date);
        if (isDaily) {
          return d.toISOString().split('T')[0];
        } else if (isWeekly) {
          const weekStart = new Date(d);
          const day = weekStart.getDay();
          weekStart.setDate(weekStart.getDate() - day);
          return weekStart.toISOString().split('T')[0];
        } else if (isMonthly) {
          return d.toISOString().substring(0, 7);
        }
        return d.toISOString().split('T')[0];
      };

      subscriptions.forEach((sub: any) => {
        const key = getKey(sub.created_at);
        const monthlyRate =
          sub.billing_cycle === 'annual'
            ? parseFloat(sub.base_price_usd.toString()) / 12
            : parseFloat(sub.base_price_usd.toString());
        const amount = Math.round(monthlyRate * 100);

        const current = aggregated.get(key) || {
          totalRevenue: 0,
          subscriptionRevenue: 0,
          perpetualRevenue: 0,
        };
        current.subscriptionRevenue = (current.subscriptionRevenue || 0) + amount;
        current.totalRevenue = (current.totalRevenue || 0) + amount;
        aggregated.set(key, current);
      });

      perpetuals.forEach((perp: any) => {
        const key = getKey(perp.purchased_at);
        const amount = Math.round(parseFloat(perp.purchase_price_usd.toString()) * 100);

        const current = aggregated.get(key) || {
          totalRevenue: 0,
          subscriptionRevenue: 0,
          perpetualRevenue: 0,
        };
        current.perpetualRevenue = (current.perpetualRevenue || 0) + amount;
        current.totalRevenue = (current.totalRevenue || 0) + amount;
        aggregated.set(key, current);
      });

      upgrades.forEach((upg: any) => {
        const key = getKey(upg.purchased_at);
        const amount = Math.round(parseFloat(upg.upgrade_price_usd.toString()) * 100);

        const current = aggregated.get(key) || {
          totalRevenue: 0,
          subscriptionRevenue: 0,
          perpetualRevenue: 0,
        };
        current.totalRevenue = (current.totalRevenue || 0) + amount;
        aggregated.set(key, current);
      });

      // Sort by date
      const sorted = Array.from(aggregated.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          totalRevenue: data.totalRevenue,
          subscriptionRevenue: data.subscriptionRevenue,
          perpetualRevenue: data.perpetualRevenue,
        }));

      // Determine granularity string
      const granularity = isMonthly ? 'monthly' : isWeekly ? 'weekly' : 'daily';

      return {
        data: sorted,
        period,
        granularity,
      };
    } catch (error) {
      logger.error('RevenueAnalyticsService.getRevenueTrend: Error', {
        period,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/revenue/funnel
   * Get user funnel: free tier -> paid subscription -> perpetual license
   */
  async getRevenueFunnel(period: string = '30d'): Promise<RevenueFunnelResponse> {
    try {
      const config = this.getPeriodConfig(period);

      // Total free tier users
      const freeTierUsers = await this.prisma.users.count({
        where: {
          created_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
          subscriptions: {
            none: {
              status: 'active',
            },
          },
          perpetual_license: {
            none: {},
          },
        },
      });

      // Paid subscription users
      const paidSubscriptionUsers = await this.prisma.users.count({
        where: {
          subscriptions: {
            some: {
              status: 'active',
              created_at: {
                gte: config.startDate,
                lte: config.endDate,
              },
            },
          },
        },
      });

      // Perpetual license users
      const perpetualLicenseUsers = await this.prisma.users.count({
        where: {
          perpetual_license: {
            some: {
              purchased_at: {
                gte: config.startDate,
                lte: config.endDate,
              },
            },
          },
        },
      });

      const totalUsers = freeTierUsers + paidSubscriptionUsers + perpetualLicenseUsers;

      // Calculate conversion rates
      const paidConversionRate =
        freeTierUsers > 0
          ? Math.round((paidSubscriptionUsers / freeTierUsers) * 100 * 10) / 10
          : 0;

      const perpetualConversionRate =
        paidSubscriptionUsers > 0
          ? Math.round((perpetualLicenseUsers / paidSubscriptionUsers) * 100 * 10) / 10
          : 0;

      // Format as array of stages matching frontend expectations
      const stages = [
        {
          name: 'Free Tier',
          count: freeTierUsers,
          percentage: totalUsers > 0 ? Math.round((freeTierUsers / totalUsers) * 100) : 0,
        },
        {
          name: 'Paid Subscription',
          count: paidSubscriptionUsers,
          percentage:
            totalUsers > 0 ? Math.round((paidSubscriptionUsers / totalUsers) * 100) : 0,
          conversionRate: paidConversionRate,
        },
        {
          name: 'Perpetual License',
          count: perpetualLicenseUsers,
          percentage:
            totalUsers > 0 ? Math.round((perpetualLicenseUsers / totalUsers) * 100) : 0,
          conversionRate: perpetualConversionRate,
        },
      ];

      return {
        stages,
        period,
      };
    } catch (error) {
      logger.error('RevenueAnalyticsService.getRevenueFunnel: Error', {
        period,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/revenue/credit-usage
   * Get credit usage by model with revenue contribution
   */
  async getCreditUsage(
    period: string = '30d',
    limit: number = 10
  ): Promise<CreditUsageResponse> {
    try {
      const config = this.getPeriodConfig(period);

      // Get credit usage by model
      const usageByModel = await this.prisma.token_usage_ledger.groupBy({
        by: ['model_id'],
        where: {
          created_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        _sum: {
          credits_deducted: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            credits_deducted: 'desc',
          },
        },
        take: limit,
      });

      // Get total credits for percentage
      const totalCredits = await this.prisma.token_usage_ledger.aggregate({
        where: {
          created_at: {
            gte: config.startDate,
            lte: config.endDate,
          },
        },
        _sum: {
          credits_deducted: true,
        },
      });

      const totalCreditsUsed = parseFloat(totalCredits._sum.credits_deducted?.toString() || '0');

      // Get total revenue (using new format)
      const revenueData = await this.getRevenueMix(period);
      const totalRevenue = revenueData.total;

      const data = usageByModel.map((item) => {
        const credits = parseFloat(item._sum.credits_deducted?.toString() || '0');
        const creditPercentage = totalCreditsUsed > 0 ? (credits / totalCreditsUsed) * 100 : 0;
        const revenueContribution = Math.round(
          totalRevenue > 0
            ? (creditPercentage / 100) * totalRevenue
            : 0
        );

        return {
          model: item.model_id,
          credits,
          requests: item._count.id,
          revenueContribution,
        };
      });

      return {
        data,
        total: totalCreditsUsed,
        period,
      };
    } catch (error) {
      logger.error('RevenueAnalyticsService.getCreditUsage: Error', {
        period,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * GET /api/v1/admin/analytics/revenue/coupon-roi
   * Get coupon ROI analysis by campaign
   */
  async getCouponROI(
    period: string = '30d',
    limit: number = 10,
    offset: number = 0
  ): Promise<CouponROIResponse> {
    try {
      const config = this.getPeriodConfig(period);

      // Get total count of campaigns
      const totalCount = await this.prisma.coupon_campaign.count({
        where: {
          start_date: {
            lte: config.endDate,
          },
          end_date: {
            gte: config.startDate,
          },
        },
      });

      // Get campaigns with coupon data
      const campaigns = await this.prisma.coupon_campaign.findMany({
        where: {
          start_date: {
            lte: config.endDate,
          },
          end_date: {
            gte: config.startDate,
          },
        },
        include: {
          coupon: {
            include: {
              coupon_redemption: {
                where: {
                  redemption_date: {
                    gte: config.startDate,
                    lte: config.endDate,
                  },
                  redemption_status: 'success',
                },
              },
            },
          },
        },
        skip: offset,
        take: limit,
      });

      const data = campaigns.map((campaign: any) => {
        let totalCouponsIssued = 0;
        let totalCouponsRedeemed = 0;
        let totalDiscount = 0;
        let totalRevenueGenerated = 0;

        campaign.coupon.forEach((coupon: any) => {
          totalCouponsRedeemed += coupon.coupon_redemption.length;
          coupon.coupon_redemption.forEach((redemption: any) => {
            // Use discount_applied_usd from the actual field
            totalDiscount += Math.round(
              parseFloat(redemption.discount_applied_usd.toString()) * 100
            );
            // Revenue generated is the final amount paid (after discount)
            totalRevenueGenerated += Math.round(
              parseFloat(redemption.final_amount_usd.toString()) * 100
            );
          });
        });

        // Count total coupons issued (sum of max_uses or estimate from created count)
        campaign.coupon.forEach((coupon: any) => {
          if (coupon.max_uses) {
            totalCouponsIssued += coupon.max_uses;
          } else {
            // If unlimited, use redemption count as proxy
            totalCouponsIssued += coupon.coupon_redemption.length;
          }
        });

        const roi = totalDiscount > 0
          ? Math.round(((totalRevenueGenerated - totalDiscount) / totalDiscount) * 100 * 10) / 10
          : 0;

        return {
          campaignName: campaign.campaign_name,
          couponsIssued: totalCouponsIssued,
          couponsRedeemed: totalCouponsRedeemed,
          discountValue: totalDiscount,
          revenueGenerated: totalRevenueGenerated,
          roiPercentage: roi,
        };
      });

      return {
        data,
        total: totalCount,
        period,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
        },
      };
    } catch (error) {
      logger.error('RevenueAnalyticsService.getCouponROI: Error', {
        period,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
