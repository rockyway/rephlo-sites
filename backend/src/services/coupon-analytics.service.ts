/**
 * Coupon Analytics Service (Plan 111)
 *
 * Provides analytics and metrics for coupon performance, redemptions, and ROI.
 * Used by admin dashboard to track coupon effectiveness.
 *
 * Reference: docs/plan/111-coupon-management-strategy.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface CouponAnalyticsMetrics {
  totalRedemptions: number;
  totalDiscountValue: number;
  averageDiscountPerRedemption: number;
  conversionRate: number;
  fraudDetectionRate: number;
  monthOverMonthChange: {
    redemptions: number;
    discountValue: number;
  };
}

export interface RedemptionTrend {
  date: string;
  redemptions: number;
  discountValue: number;
}

export interface TopPerformingCoupon {
  code: string;
  redemptions: number;
  discountValue: number;
  conversionRate: number;
  averageDiscount: number;
}

export interface RedemptionByType {
  type: string;
  count: number;
  percentage: number;
  discountValue: number;
}

// =============================================================================
// Coupon Analytics Service Class
// =============================================================================

@injectable()
export class CouponAnalyticsService {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {
    logger.debug('CouponAnalyticsService: Initialized');
  }

  /**
   * Get coupon analytics metrics
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @returns Coupon analytics metrics
   */
  async getAnalyticsMetrics(startDate?: Date, endDate?: Date): Promise<CouponAnalyticsMetrics> {
    logger.info('CouponAnalyticsService.getAnalyticsMetrics', { startDate, endDate });

    try {
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.redemption_date = {};
        if (startDate) dateFilter.redemption_date.gte = startDate;
        if (endDate) dateFilter.redemption_date.lte = endDate;
      }

      // Get current period metrics
      const currentPeriodRedemptions = await this.prisma.coupon_redemption.aggregate({
        where: {
          redemption_status: 'success',
          ...dateFilter,
        },
        _count: true,
        _sum: {
          discount_applied_usd: true,
        },
      });

      // Get previous period for comparison (same duration before startDate)
      let previousPeriodRedemptions: any = { _count: 0, _sum: { discount_applied_usd: 0 } };
      if (startDate && endDate) {
        const duration = endDate.getTime() - startDate.getTime();
        const previousStart = new Date(startDate.getTime() - duration);
        const previousEnd = startDate;

        previousPeriodRedemptions = await this.prisma.coupon_redemption.aggregate({
          where: {
            redemption_status: 'success',
            redemption_date: {
              gte: previousStart,
              lte: previousEnd,
            },
          },
          _count: true,
          _sum: {
            discount_applied_usd: true,
          },
        });
      }

      // Get fraud detection count
      const fraudDetectedCount = await this.prisma.coupon_redemption.count({
        where: {
          redemption_status: 'failed',
          ...dateFilter,
        },
      });

      // Get total attempts for conversion rate
      const totalAttempts = await this.prisma.coupon_redemption.count({
        where: dateFilter,
      });

      const totalRedemptions = currentPeriodRedemptions._count || 0;
      const totalDiscountValue = Number(currentPeriodRedemptions._sum?.discount_applied_usd || 0);
      const averageDiscount = totalRedemptions > 0 ? totalDiscountValue / totalRedemptions : 0;
      const conversionRate = totalAttempts > 0 ? (totalRedemptions / totalAttempts) * 100 : 0;
      const fraudRate = totalAttempts > 0 ? (fraudDetectedCount / totalAttempts) * 100 : 0;

      // Calculate month-over-month changes
      const previousRedemptions = previousPeriodRedemptions._count || 0;
      const previousDiscount = Number(previousPeriodRedemptions._sum?.discount_applied_usd || 0);

      const redemptionChange = previousRedemptions > 0
        ? ((totalRedemptions - previousRedemptions) / previousRedemptions) * 100
        : 0;
      const discountChange = previousDiscount > 0
        ? ((totalDiscountValue - previousDiscount) / previousDiscount) * 100
        : 0;

      return {
        totalRedemptions,
        totalDiscountValue,
        averageDiscountPerRedemption: averageDiscount,
        conversionRate,
        fraudDetectionRate: fraudRate,
        monthOverMonthChange: {
          redemptions: redemptionChange,
          discountValue: discountChange,
        },
      };
    } catch (error) {
      logger.error('CouponAnalyticsService.getAnalyticsMetrics: Error', { error });
      throw error;
    }
  }

  /**
   * Get redemption trend over time
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Redemption trend data
   */
  async getRedemptionTrend(startDate: Date, endDate: Date): Promise<RedemptionTrend[]> {
    logger.info('CouponAnalyticsService.getRedemptionTrend', { startDate, endDate });

    try {
      const query = `
        SELECT
          DATE(redemption_date) as date,
          COUNT(*) as redemptions,
          COALESCE(SUM(discount_applied_usd), 0) as discount_value
        FROM coupon_redemption
        WHERE redemption_status = 'success'
          AND redemption_date >= $1
          AND redemption_date <= $2
        GROUP BY DATE(redemption_date)
        ORDER BY DATE(redemption_date) ASC
      `;

      const results: any[] = await this.prisma.$queryRawUnsafe(
        query,
        startDate.toISOString(),
        endDate.toISOString()
      );

      return results.map((row) => ({
        date: new Date(row.date).toISOString().split('T')[0],
        redemptions: Number(row.redemptions),
        discountValue: Number(row.discount_value),
      }));
    } catch (error) {
      logger.error('CouponAnalyticsService.getRedemptionTrend: Error', { error });
      throw error;
    }
  }

  /**
   * Get top performing coupons
   * @param limit - Number of top coupons to return
   * @returns Top performing coupons
   */
  async getTopPerformingCoupons(limit: number = 10): Promise<TopPerformingCoupon[]> {
    logger.info('CouponAnalyticsService.getTopPerformingCoupons', { limit });

    try {
      const query = `
        SELECT
          c.code,
          COUNT(*) as redemptions,
          COALESCE(SUM(cr.discount_applied_usd), 0) as discount_value,
          COALESCE(AVG(cr.discount_applied_usd), 0) as average_discount,
          (COUNT(CASE WHEN cr.redemption_status = 'success' THEN 1 END)::float / COUNT(*)::float * 100) as conversion_rate
        FROM coupon_redemption cr
        JOIN coupon c ON cr.coupon_id = c.id
        WHERE cr.redemption_status = 'success'
        GROUP BY c.code
        ORDER BY redemptions DESC
        LIMIT $1
      `;

      const results: any[] = await this.prisma.$queryRawUnsafe(query, limit);

      return results.map((row) => ({
        code: row.code,
        redemptions: Number(row.redemptions),
        discountValue: Number(row.discount_value),
        conversionRate: Number(row.conversion_rate),
        averageDiscount: Number(row.average_discount),
      }));
    } catch (error) {
      logger.error('CouponAnalyticsService.getTopPerformingCoupons: Error', { error });
      throw error;
    }
  }

  /**
   * Get redemptions by coupon type
   * @returns Redemptions grouped by type
   */
  async getRedemptionsByType(): Promise<RedemptionByType[]> {
    logger.info('CouponAnalyticsService.getRedemptionsByType');

    try {
      const query = `
        SELECT
          c.coupon_type as type,
          COUNT(*) as count,
          COALESCE(SUM(cr.discount_applied_usd), 0) as discount_value
        FROM coupon_redemption cr
        JOIN coupon c ON cr.coupon_id = c.id
        WHERE cr.redemption_status = 'success'
        GROUP BY c.coupon_type
        ORDER BY count DESC
      `;

      const results: any[] = await this.prisma.$queryRawUnsafe(query);

      const total = results.reduce((sum, row) => sum + Number(row.count), 0);

      return results.map((row) => ({
        type: row.type,
        count: Number(row.count),
        percentage: total > 0 ? (Number(row.count) / total) * 100 : 0,
        discountValue: Number(row.discount_value),
      }));
    } catch (error) {
      logger.error('CouponAnalyticsService.getRedemptionsByType: Error', { error });
      throw error;
    }
  }
}
