/**
 * Platform Analytics Service (Plan 109)
 *
 * Provides business intelligence and metrics for subscription platform.
 * Calculates MRR, ARR, churn rate, conversion metrics, and usage analytics.
 *
 * Core Responsibilities:
 * - Revenue metrics (MRR, ARR, growth rate)
 * - User metrics (active users, tier distribution, churn)
 * - Conversion funnel analysis
 * - Credit utilization tracking
 * - Dashboard summaries
 *
 * Reference: docs/plan/109-rephlo-desktop-monetization-moderation-plan.md
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface RevenueSummary {
  tier: string;
  revenue: number;
  subscriptionCount: number;
}

export interface RevenueTimeSeries {
  date: Date;
  revenue: number;
}

export interface TierDistribution {
  tier: string;
  userCount: number;
  percentage: number;
}

export interface ConversionMetrics {
  upgradeRate: number;
  downgradeRate: number;
  ratio: number;
}

export interface DashboardMetrics {
  mrr: number;
  arr: number;
  totalActiveUsers: number;
  churnRate: number;
  averageRevenuePerUser: number;
  creditUtilization: number;
  tierDistribution: TierDistribution[];
}

export interface GrowthAnalysis {
  period: string;
  mrrGrowth: number;
  userGrowth: number;
  revenueGrowth: number;
}

export interface AllocationUsageComparison {
  totalAllocated: number;
  totalUsed: number;
  utilizationRate: number;
}

// =============================================================================
// Platform Analytics Service
// =============================================================================

@injectable()
export class PlatformAnalyticsService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('PlatformAnalyticsService: Initialized');
  }

  // ===========================================================================
  // Revenue Metrics
  // ===========================================================================

  /**
   * Calculate Monthly Recurring Revenue (MRR)
   * Formula: SUM(monthly subscriptions) + SUM(annual subscriptions / 12)
   * @returns MRR in USD
   */
  async calculateMRR(): Promise<number> {
    logger.debug('PlatformAnalyticsService.calculateMRR');

    try {
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: { status: { in: ['trial', 'active'] } },
      });

      let mrr = 0;

      subscriptions.forEach((sub) => {
        const price = Number(sub.base_price_usd);
        if (sub.billing_cycle === 'monthly') {
          mrr += price;
        } else if (sub.billing_cycle === 'annual') {
          mrr += price / 12;
        }
      });

      logger.info('PlatformAnalyticsService: MRR calculated', { mrr });

      return Math.round(mrr * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.calculateMRR: Error', { error });
      return 0;
    }
  }

  /**
   * Calculate Annual Recurring Revenue (ARR)
   * Formula: MRR × 12
   * @returns ARR in USD
   */
  async calculateARR(): Promise<number> {
    logger.debug('PlatformAnalyticsService.calculateARR');

    try {
      const mrr = await this.calculateMRR();
      const arr = mrr * 12;

      logger.info('PlatformAnalyticsService: ARR calculated', { arr });

      return Math.round(arr * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.calculateARR: Error', { error });
      return 0;
    }
  }

  /**
   * Get revenue breakdown by tier
   * @returns Array of revenue by tier
   */
  async getRevenueByTier(): Promise<RevenueSummary[]> {
    logger.debug('PlatformAnalyticsService.getRevenueByTier');

    try {
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: { status: { in: ['trial', 'active'] } },
      });

      const revenueByTier = new Map<string, { revenue: number; count: number }>();

      subscriptions.forEach((sub) => {
        const price = Number(sub.base_price_usd);
        const monthlyRevenue = sub.billing_cycle === 'annual' ? price / 12 : price;

        const current = revenueByTier.get(sub.tier) || { revenue: 0, count: 0 };
        revenueByTier.set(sub.tier, {
          revenue: current.revenue + monthlyRevenue,
          count: current.count + 1,
        });
      });

      const result: RevenueSummary[] = Array.from(revenueByTier.entries()).map(
        ([tier, data]) => ({
          tier,
          revenue: Math.round(data.revenue * 100) / 100,
          subscriptionCount: data.count,
        })
      );

      logger.info('PlatformAnalyticsService: Revenue by tier retrieved', {
        tiers: result.length,
      });

      return result;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getRevenueByTier: Error', { error });
      return [];
    }
  }

  /**
   * Get revenue time series
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Daily revenue data
   */
  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<RevenueTimeSeries[]> {
    logger.debug('PlatformAnalyticsService.getRevenueByPeriod', { startDate, endDate });

    try {
      // Get all transactions in period
      const transactions = await this.prisma.payment_transaction.findMany({
        where: {
          status: 'succeeded',
          created_at: { gte: startDate, lte: endDate },
        },
        orderBy: { created_at: 'asc' },
      });

      // Group by date
      const revenueByDate = new Map<string, number>();

      transactions.forEach((txn) => {
        const dateKey = txn.created_at.toISOString().split('T')[0];
        const amount = Number(txn.amount);
        revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + amount);
      });

      const result: RevenueTimeSeries[] = Array.from(revenueByDate.entries()).map(
        ([dateStr, revenue]) => ({
          date: new Date(dateStr),
          revenue: Math.round(revenue * 100) / 100,
        })
      );

      logger.info('PlatformAnalyticsService: Revenue by period retrieved', {
        dataPoints: result.length,
      });

      return result;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getRevenueByPeriod: Error', { error });
      return [];
    }
  }

  // ===========================================================================
  // User Metrics
  // ===========================================================================

  /**
   * Get total number of active users
   * @returns User count
   */
  async getTotalActiveUsers(): Promise<number> {
    logger.debug('PlatformAnalyticsService.getTotalActiveUsers');

    try {
      const count = await this.prisma.users.count({
        where: {
          is_active: true,
          deleted_at: null,
        },
      });

      logger.info('PlatformAnalyticsService: Total active users retrieved', { count });

      return count;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getTotalActiveUsers: Error', { error });
      return 0;
    }
  }

  /**
   * Get user distribution by tier
   * @returns Tier distribution with percentages
   */
  async getUsersByTier(): Promise<TierDistribution[]> {
    logger.debug('PlatformAnalyticsService.getUsersByTier');

    try {
      const subscriptions = await this.prisma.subscription_monetization.groupBy({
        by: ['tier'],
        where: { status: { in: ['trial', 'active'] } },
        _count: true,
      });

      const totalUsers = subscriptions.reduce((sum, group) => sum + group._count, 0);

      const result: TierDistribution[] = subscriptions.map((group) => ({
        tier: group.tier,
        userCount: group._count,
        percentage: totalUsers > 0 ? (group._count / totalUsers) * 100 : 0,
      }));

      logger.info('PlatformAnalyticsService: Users by tier retrieved', {
        tiers: result.length,
      });

      return result;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getUsersByTier: Error', { error });
      return [];
    }
  }

  /**
   * Calculate churn rate for a period
   * Formula: (Cancelled subs in period) / (Active subs at start of period)
   * @param period - 'monthly', 'quarterly', or 'annual'
   * @returns Churn rate as percentage
   */
  async getChurnRate(period: 'monthly' | 'quarterly' | 'annual'): Promise<number> {
    logger.debug('PlatformAnalyticsService.getChurnRate', { period });

    try {
      const now = new Date();
      const periodStart = new Date(now);

      switch (period) {
        case 'monthly':
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case 'quarterly':
          periodStart.setMonth(periodStart.getMonth() - 3);
          break;
        case 'annual':
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
      }

      // Count active subscriptions at start of period
      const activeAtStart = await this.prisma.subscription_monetization.count({
        where: {
          created_at: { lt: periodStart },
          status: { in: ['trial', 'active'] },
        },
      });

      // Count cancellations during period
      const cancelledInPeriod = await this.prisma.subscription_monetization.count({
        where: {
          status: 'cancelled',
          cancelled_at: { gte: periodStart, lte: now },
        },
      });

      const churnRate = activeAtStart > 0 ? (cancelledInPeriod / activeAtStart) * 100 : 0;

      logger.info('PlatformAnalyticsService: Churn rate calculated', {
        period,
        churnRate,
        activeAtStart,
        cancelledInPeriod,
      });

      return Math.round(churnRate * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getChurnRate: Error', { error });
      return 0;
    }
  }

  /**
   * Calculate average revenue per user (ARPU)
   * Formula: Total Revenue / Total Active Users
   * @returns ARPU in USD
   */
  async getAverageRevenuePerUser(): Promise<number> {
    logger.debug('PlatformAnalyticsService.getAverageRevenuePerUser');

    try {
      const mrr = await this.calculateMRR();
      const activeUsers = await this.getTotalActiveUsers();

      const arpu = activeUsers > 0 ? mrr / activeUsers : 0;

      logger.info('PlatformAnalyticsService: ARPU calculated', { arpu, mrr, activeUsers });

      return Math.round(arpu * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getAverageRevenuePerUser: Error', { error });
      return 0;
    }
  }

  // ===========================================================================
  // Credit Metrics
  // ===========================================================================

  /**
   * Calculate credit utilization rate
   * Formula: (Total used credits) / (Total allocated credits) × 100
   * @returns Utilization rate as percentage
   */
  async getCreditUtilizationRate(): Promise<number> {
    logger.debug('PlatformAnalyticsService.getCreditUtilizationRate');

    try {
      // Get total allocated credits
      const allocations = await this.prisma.credit_allocation.aggregate({
        _sum: { amount: true },
      });

      const totalAllocated = allocations._sum.amount || 0;

      // Get total used credits
      const usage = await this.prisma.token_usage_ledger.aggregate({
        _sum: { credits_deducted: true },
      });

      const totalUsed = usage._sum.credits_deducted || 0;

      const utilizationRate = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

      logger.info('PlatformAnalyticsService: Credit utilization calculated', {
        utilizationRate,
        totalAllocated,
        totalUsed,
      });

      return Math.round(utilizationRate * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getCreditUtilizationRate: Error', { error });
      return 0;
    }
  }

  /**
   * Compare credit allocation vs usage
   * @returns Allocation and usage comparison
   */
  async getCreditAllocationVsUsage(): Promise<AllocationUsageComparison> {
    logger.debug('PlatformAnalyticsService.getCreditAllocationVsUsage');

    try {
      const [allocations, usage] = await Promise.all([
        this.prisma.credit_allocation.aggregate({ _sum: { amount: true } }),
        this.prisma.token_usage_ledger.aggregate({ _sum: { credits_deducted: true } }),
      ]);

      const totalAllocated = allocations._sum.amount || 0;
      const totalUsed = usage._sum.credits_deducted || 0;
      const utilizationRate = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

      const result = {
        totalAllocated,
        totalUsed,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      };

      logger.info('PlatformAnalyticsService: Allocation vs usage retrieved', result);

      return result;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getCreditAllocationVsUsage: Error', { error });
      return { totalAllocated: 0, totalUsed: 0, utilizationRate: 0 };
    }
  }

  /**
   * Get top credit consumers
   * @param limit - Number of users to return
   * @returns Array of user IDs with credit usage
   */
  async getTopCreditConsumers(limit: number): Promise<Array<{ userId: string; credits_deducted: number }>> {
    logger.debug('PlatformAnalyticsService.getTopCreditConsumers', { limit });

    try {
      const topUsers = await this.prisma.token_usage_ledger.groupBy({
        by: ['user_id'],
        _sum: { credits_deducted: true },
        orderBy: { _sum: { credits_deducted: 'desc' } },
        take: limit,
      });

      const result = topUsers.map((user) => ({
        userId: user.user_id,
        credits_deducted: user._sum.credits_deducted || 0,
      }));

      logger.info('PlatformAnalyticsService: Top credit consumers retrieved', {
        count: result.length,
      });

      return result;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getTopCreditConsumers: Error', { error });
      return [];
    }
  }

  // ===========================================================================
  // Conversion Metrics
  // ===========================================================================

  /**
   * Calculate free to Pro conversion rate
   * @returns Conversion rate as percentage
   */
  async getFreeToProConversionRate(): Promise<number> {
    logger.debug('PlatformAnalyticsService.getFreeToProConversionRate');

    try {
      // Count users who started with free tier
      const totalFreeUsers = await this.prisma.users.count();

      // Count users who converted to pro (or higher)
      const convertedUsers = await this.prisma.subscription_monetization.count({
        where: {
          tier: { not: 'free' },
          status: { in: ['trial', 'active'] },
        },
      });

      const conversionRate = totalFreeUsers > 0 ? (convertedUsers / totalFreeUsers) * 100 : 0;

      logger.info('PlatformAnalyticsService: Free-to-Pro conversion calculated', {
        conversionRate,
        totalFreeUsers,
        convertedUsers,
      });

      return Math.round(conversionRate * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getFreeToProConversionRate: Error', { error });
      return 0;
    }
  }

  /**
   * Calculate trial conversion rate
   * @returns Conversion rate as percentage
   */
  async getTrialConversionRate(): Promise<number> {
    logger.debug('PlatformAnalyticsService.getTrialConversionRate');

    try {
      // Count subscriptions that started as trial
      const totalTrials = await this.prisma.subscription_monetization.count({
        where: { trial_ends_at: { not: null } },
      });

      // Count trials that converted to active
      const convertedTrials = await this.prisma.subscription_monetization.count({
        where: {
          trial_ends_at: { not: null, lte: new Date() },
          status: 'active',
        },
      });

      const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

      logger.info('PlatformAnalyticsService: Trial conversion calculated', {
        conversionRate,
        totalTrials,
        convertedTrials,
      });

      return Math.round(conversionRate * 100) / 100;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getTrialConversionRate: Error', { error });
      return 0;
    }
  }

  /**
   * Get upgrade/downgrade ratio
   * @returns Conversion metrics
   */
  async getUpgradeDowngradeRatio(): Promise<ConversionMetrics> {
    logger.debug('PlatformAnalyticsService.getUpgradeDowngradeRatio');

    try {
      // TODO: Implement tier change tracking
      // This requires a subscription_history table to track tier changes

      const metrics: ConversionMetrics = {
        upgradeRate: 0,
        downgradeRate: 0,
        ratio: 0,
      };

      logger.info('PlatformAnalyticsService: Upgrade/downgrade ratio calculated', metrics);

      return metrics;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getUpgradeDowngradeRatio: Error', { error });
      return { upgradeRate: 0, downgradeRate: 0, ratio: 0 };
    }
  }

  // ===========================================================================
  // Dashboards
  // ===========================================================================

  /**
   * Get comprehensive dashboard metrics
   * @returns Dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardMetrics> {
    logger.info('PlatformAnalyticsService.getDashboardSummary');

    try {
      const [
        mrr,
        arr,
        totalActiveUsers,
        churnRate,
        arpu,
        creditUtilization,
        tierDistribution,
      ] = await Promise.all([
        this.calculateMRR(),
        this.calculateARR(),
        this.getTotalActiveUsers(),
        this.getChurnRate('monthly'),
        this.getAverageRevenuePerUser(),
        this.getCreditUtilizationRate(),
        this.getUsersByTier(),
      ]);

      const dashboard: DashboardMetrics = {
        mrr,
        arr,
        totalActiveUsers,
        churnRate,
        averageRevenuePerUser: arpu,
        creditUtilization,
        tierDistribution,
      };

      logger.info('PlatformAnalyticsService: Dashboard summary retrieved', dashboard);

      return dashboard;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getDashboardSummary: Error', { error });
      throw error;
    }
  }

  /**
   * Get growth metrics for a period
   * @param period - Period identifier (e.g., "2025-01", "Q1-2025")
   * @returns Growth analysis
   */
  async getGrowthMetrics(period: string): Promise<GrowthAnalysis> {
    logger.debug('PlatformAnalyticsService.getGrowthMetrics', { period });

    try {
      // TODO: Implement historical data comparison
      // This requires storing daily/monthly snapshots of metrics

      const growth: GrowthAnalysis = {
        period,
        mrrGrowth: 0,
        userGrowth: 0,
        revenueGrowth: 0,
      };

      logger.info('PlatformAnalyticsService: Growth metrics retrieved', growth);

      return growth;
    } catch (error) {
      logger.error('PlatformAnalyticsService.getGrowthMetrics: Error', { error });
      return { period, mrrGrowth: 0, userGrowth: 0, revenueGrowth: 0 };
    }
  }
}
