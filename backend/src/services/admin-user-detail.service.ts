/**
 * Admin User Detail Service
 *
 * Business logic for Unified User Detail API endpoints.
 * Provides 7 methods to retrieve comprehensive user information across all monetization plans.
 *
 * Methods:
 * 1. getUserOverview() - User profile and current status
 * 2. getUserSubscriptions() - Subscription history and prorations
 * 3. getUserLicenses() - Perpetual licenses and device activations
 * 4. getUserCredits() - Credit balance, allocations, and usage
 * 5. getUserCoupons() - Coupon redemptions and fraud flags
 * 6. getUserPayments() - Stripe invoices and payment methods (PLACEHOLDER)
 * 7. getUserActivity() - Combined timeline of all user actions
 *
 * @module services/admin-user-detail.service
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  UserOverviewResponse,
  UserSubscriptionsResponse,
  UserLicensesResponse,
  UserCreditsResponse,
  UserCouponsResponse,
  UserPaymentsResponse,
  UserActivityResponse,
  UserActivityType,
} from '../types/admin-user-detail.types';

@injectable()
export class AdminUserDetailService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AdminUserDetailService: Initialized');
  }

  // ===========================================================================
  // Endpoint 1: User Overview
  // ===========================================================================

  /**
   * Get user overview with profile, current subscription, license, and quick stats
   *
   * @param userId - User ID
   * @returns User overview data
   * @throws Error if user not found
   */
  async getUserOverview(userId: string): Promise<UserOverviewResponse> {
    try {
      // Get user basic info
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          created_at: true,
          last_login_at: true,
          is_active: true,
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get current active subscription
      const currentSubscription = await this.prisma.subscription_monetization.findFirst({
        where: {
          user_id: userId,
          status: 'active',
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          tier: true,
          status: true,
          billing_cycle: true,
          monthly_credit_allocation: true,
          current_period_end: true,
          created_at: true,
        },
      });

      // Get current active license
      const currentLicense = await this.prisma.perpetual_license.findFirst({
        where: {
          user_id: userId,
          status: 'active',
        },
        orderBy: {
          purchased_at: 'desc',
        },
        select: {
          id: true,
          license_key: true,
          status: true,
          activated_at: true,
          current_activations: true,
          max_activations: true,
        },
      });

      // Get credit balance
      const creditBalance = await this.prisma.user_credit_balance.findUnique({
        where: { user_id: userId },
        select: {
          amount: true,
          updated_at: true,
        },
      });

      // Get quick stats
      const [totalSubscriptions, totalLicenses, totalCreditsConsumed, totalCouponsRedeemed] =
        await Promise.all([
          this.prisma.subscription_monetization.count({
            where: { user_id: userId },
          }),
          this.prisma.perpetual_license.count({
            where: { user_id: userId },
          }),
          this.prisma.token_usage_ledger.aggregate({
            where: { user_id: userId },
            _sum: { credits_deducted: true },
          }),
          this.prisma.coupon_redemption.count({
            where: {
              subscription_monetization: {
                user_id: userId,
              },
              redemption_status: 'success',
            },
          }),
        ]);

      logger.info('AdminUserDetailService.getUserOverview: Retrieved', {
        userId,
        hasSubscription: !!currentSubscription,
        hasLicense: !!currentLicense,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name:
            user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.first_name || user.last_name || null,
          createdAt: user.created_at,
          lastLogin: user.last_login_at,
          status: user.is_active ? 'active' : 'suspended',
        },
        currentSubscription: currentSubscription
          ? {
              id: currentSubscription.id,
              tier: currentSubscription.tier,
              status: currentSubscription.status,
              billingCycle: currentSubscription.billing_cycle as 'monthly' | 'annual',
              creditAllocation: currentSubscription.monthly_credit_allocation,
              nextBillingDate: currentSubscription.current_period_end,
              startedAt: currentSubscription.created_at,
            }
          : null,
        currentLicense: currentLicense
          ? {
              id: currentLicense.id,
              licenseKey: currentLicense.license_key,
              status: currentLicense.status as 'active' | 'pending' | 'revoked',
              activatedAt: currentLicense.activated_at,
              deviceCount: currentLicense.current_activations,
              maxDevices: currentLicense.max_activations,
            }
          : null,
        creditBalance: creditBalance?.amount || 0,
        stats: {
          totalSubscriptions: totalSubscriptions,
          totalLicenses: totalLicenses,
          creditsConsumed: Number(totalCreditsConsumed._sum?.credits_deducted || 0),
          couponsRedeemed: totalCouponsRedeemed,
        },
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserOverview: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Endpoint 2: User Subscriptions
  // ===========================================================================

  /**
   * Get user subscription history and proration events
   *
   * @param userId - User ID
   * @param limit - Maximum results to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns User subscriptions and prorations
   */
  async getUserSubscriptions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserSubscriptionsResponse> {
    try {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);

      // Get total count
      const total = await this.prisma.subscription_monetization.count({
        where: { user_id: userId },
      });

      // Get subscriptions with pagination
      const subscriptions = await this.prisma.subscription_monetization.findMany({
        where: { user_id: userId },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          tier: true,
          status: true,
          billing_cycle: true,
          monthly_credit_allocation: true,
          created_at: true,
          cancelled_at: true,
          current_period_end: true,
          base_price_usd: true,
        },
      });

      // Get proration events for this user
      const prorations = await this.prisma.proration_event.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: safeLimit,
        select: {
          id: true,
          from_tier: true,
          to_tier: true,
          unused_credit_value_usd: true,
          new_tier_prorated_cost_usd: true,
          net_charge_usd: true,
          created_at: true,
        },
      });

      logger.info('AdminUserDetailService.getUserSubscriptions: Retrieved', {
        userId,
        subscriptionsCount: subscriptions.length,
        prorationsCount: prorations.length,
      });

      return {
        subscriptions: subscriptions.map((sub) => ({
          id: sub.id,
          tier: sub.tier,
          status: sub.status,
          billingCycle: sub.billing_cycle as 'monthly' | 'annual',
          monthlyCreditAllocation: sub.monthly_credit_allocation,
          startedAt: sub.created_at,
          endedAt: sub.cancelled_at,
          nextBillingDate: sub.status === 'active' ? sub.current_period_end : null,
          monthlyPriceUsd: Number(sub.base_price_usd),
        })),
        prorations: prorations.map((pro) => ({
          id: pro.id,
          fromTier: pro.from_tier || 'unknown',
          toTier: pro.to_tier || 'unknown',
          fromPriceUsd: Number(pro.unused_credit_value_usd),
          toPriceUsd: Number(pro.new_tier_prorated_cost_usd),
          prorationAmountUsd: Number(pro.net_charge_usd),
          createdAt: pro.created_at,
        })),
        total,
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserSubscriptions: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Endpoint 3: User Licenses
  // ===========================================================================

  /**
   * Get user perpetual licenses with device activations and upgrades
   *
   * @param userId - User ID
   * @param limit - Maximum results to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns User licenses, activations, and upgrades
   */
  async getUserLicenses(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserLicensesResponse> {
    try {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);

      // Get total count
      const total = await this.prisma.perpetual_license.count({
        where: { user_id: userId },
      });

      // Get licenses with device activations (avoid N+1 by using include)
      const licenses = await this.prisma.perpetual_license.findMany({
        where: { user_id: userId },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { purchased_at: 'desc' },
        include: {
          license_activation: {
            orderBy: { activated_at: 'desc' },
            select: {
              id: true,
              device_name: true,
              machine_fingerprint: true,
              activated_at: true,
              last_seen_at: true,
              status: true,
            },
          },
        },
      });

      // Get version upgrades
      const upgrades = await this.prisma.version_upgrade.findMany({
        where: { user_id: userId },
        orderBy: { purchased_at: 'desc' },
        take: safeLimit,
        select: {
          id: true,
          from_version: true,
          to_version: true,
          upgrade_price_usd: true,
          purchased_at: true,
        },
      });

      logger.info('AdminUserDetailService.getUserLicenses: Retrieved', {
        userId,
        licensesCount: licenses.length,
        upgradesCount: upgrades.length,
      });

      return {
        licenses: licenses.map((license) => ({
          id: license.id,
          licenseKey: license.license_key,
          status: license.status as 'active' | 'pending' | 'revoked',
          purchasePriceUsd: Number(license.purchase_price_usd),
          purchaseDate: license.purchased_at,
          activatedAt: license.activated_at,
          eligibleUntilVersion: license.eligible_until_version,
          deviceActivations: license.license_activation.map((activation: any) => ({
            id: activation.id,
            deviceName: activation.device_name,
            deviceId: activation.machine_fingerprint,
            activatedAt: activation.activated_at,
            lastSeenAt: activation.last_seen_at,
            status: activation.status as 'active' | 'deactivated',
          })),
        })),
        upgrades: upgrades.map((upgrade) => ({
          id: upgrade.id,
          fromVersion: upgrade.from_version,
          toVersion: upgrade.to_version,
          upgradePriceUsd: Number(upgrade.upgrade_price_usd),
          upgradeDate: upgrade.purchased_at,
        })),
        total,
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserLicenses: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Endpoint 4: User Credits
  // ===========================================================================

  /**
   * Get user credit balance, allocations, usage, and deductions
   *
   * @param userId - User ID
   * @param period - Time period for filtering ('7d', '30d', '90d', '1y')
   * @param limit - Maximum results to return (default: 100)
   * @param offset - Pagination offset (default: 0)
   * @returns User credits data
   */
  async getUserCredits(
    userId: string,
    period: string = '30d',
    limit: number = 100,
    offset: number = 0
  ): Promise<UserCreditsResponse> {
    try {
      const safeLimit = Math.min(200, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);

      // Calculate period dates
      const { startDate, endDate } = this.calculatePeriodDates(period);

      // Get current balance
      const balance = await this.prisma.user_credit_balance.findUnique({
        where: { user_id: userId },
        select: {
          amount: true,
          updated_at: true,
        },
      });

      // Get credit allocations
      const allocations = await this.prisma.credit_allocation.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          amount: true,
          source: true,
          created_at: true,
        },
      });

      // Get usage by model (aggregated from TokenUsageLedger)
      const usageByModel = await this.prisma.token_usage_ledger.groupBy({
        by: ['model_id'],
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          credits_deducted: true,
        },
        _count: {
          id: true,
        },
      });

      // Usage by model now groups by model_id (string), use model_id as the identifier
      const modelPricingMap = new Map(usageByModel.map((u) => [u.model_id, u.model_id]));

      // Get deductions
      const deductions = await this.prisma.credit_deduction_ledger.findMany({
        where: {
          user_id: userId,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          amount: true,
          created_at: true,
          request_id: true,
        },
      });

      // Get total allocations and deductions
      const [totalAllocations, totalDeductions] = await Promise.all([
        this.prisma.credit_allocation.aggregate({
          where: { user_id: userId },
          _sum: { amount: true },
        }),
        this.prisma.credit_deduction_ledger.aggregate({
          where: { user_id: userId },
          _sum: { amount: true },
        }),
      ]);

      logger.info('AdminUserDetailService.getUserCredits: Retrieved', {
        userId,
        period,
        allocationsCount: allocations.length,
        usageModelsCount: usageByModel.length,
        deductionsCount: deductions.length,
      });

      return {
        balance: {
          amount: balance?.amount || 0,
          lastUpdated: balance?.updated_at || new Date(),
        },
        allocations: allocations.map((alloc) => ({
          id: alloc.id,
          amount: alloc.amount,
          source: alloc.source as any,
          reason: null, // Not stored in current schema
          allocatedAt: alloc.created_at,
        })),
        usage: usageByModel.map((usage) => ({
          model: modelPricingMap.get(usage.model_id) || 'Unknown Model',
          totalCredits: usage._sum?.credits_deducted || 0,
          requestCount: usage._count?.id || 0,
        })),
        deductions: deductions.map((deduction) => ({
          id: deduction.id,
          amount: deduction.amount,
          modelUsed: 'Unknown', // Would need to join with usage ledger
          timestamp: deduction.created_at,
        })),
        totalAllocations: totalAllocations._sum?.amount || 0,
        totalUsage: usageByModel.reduce(
          (sum, u) => sum + (u._sum?.credits_deducted || 0),
          0
        ),
        totalDeductions: totalDeductions._sum?.amount || 0,
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserCredits: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Endpoint 5: User Coupons
  // ===========================================================================

  /**
   * Get user coupon redemptions and fraud flags
   *
   * @param userId - User ID
   * @param limit - Maximum results to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns User coupon redemptions and fraud flags
   */
  async getUserCoupons(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserCouponsResponse> {
    try {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);

      // Get total count
      const total = await this.prisma.coupon_redemption.count({
        where: {
          subscription_monetization: {
            user_id: userId,
          },
        },
      });

      // Get coupon redemptions
      const redemptions = await this.prisma.coupon_redemption.findMany({
        where: {
          subscription_monetization: {
            user_id: userId,
          },
        },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { redemption_date: 'desc' },
        include: {
          coupon: {
            select: {
              code: true,
              coupon_type: true,
              discount_type: true,
              discount_value: true,
            },
          },
          subscription_monetization: {
            select: {
              tier: true,
            },
          },
        },
      });

      // Get fraud flags for this user
      const fraudFlags = await this.prisma.coupon_fraud_detection.findMany({
        where: { user_id: userId },
        orderBy: { detected_at: 'desc' },
        take: safeLimit,
        include: {
          coupon: {
            select: {
              code: true,
            },
          },
        },
      });

      // Calculate total discount value
      const totalDiscountSum = await this.prisma.coupon_redemption.aggregate({
        where: {
          subscription_monetization: {
            user_id: userId,
          },
          redemption_status: 'success',
        },
        _sum: {
          discount_applied_usd: true,
        },
      });

      logger.info('AdminUserDetailService.getUserCoupons: Retrieved', {
        userId,
        redemptionsCount: redemptions.length,
        fraudFlagsCount: fraudFlags.length,
      });

      return {
        redemptions: redemptions.map((redemption) => ({
          id: redemption.id,
          coupon: {
            code: redemption.coupon.code,
            type: redemption.coupon.coupon_type,
            discountType: redemption.coupon.discount_type,
            discountValue: Number(redemption.coupon.discount_value),
          },
          redeemedAt: redemption.redemption_date,
          discountValueUsd: Number(redemption.discount_applied_usd),
          subscriptionTierGranted: redemption.subscription_monetization?.tier || null,
          perpetualLicenseGranted: false, // Not tracked in current schema
        })),
        fraudFlags: fraudFlags.map((flag) => ({
          id: flag.id,
          couponCode: flag.coupon.code,
          flagReason: flag.detection_type,
          severity: flag.severity as 'low' | 'medium' | 'high',
          flaggedAt: flag.detected_at,
        })),
        totalDiscountValue: Number(totalDiscountSum._sum.discount_applied_usd || 0) * 100, // Convert to cents
        total,
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserCoupons: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Endpoint 6: User Payments (PLACEHOLDER)
  // ===========================================================================

  /**
   * Get user payment history (PLACEHOLDER - Not implemented)
   *
   * @param userId - User ID
   * @param limit - Maximum results to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns User payment history (empty placeholder)
   */
  async getUserPayments(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserPaymentsResponse> {
    try {
      logger.warn('AdminUserDetailService.getUserPayments: PLACEHOLDER - Not implemented', {
        userId,
      });

      // Get Stripe customer ID from subscription if exists
      const subscription = await this.prisma.subscription_monetization.findFirst({
        where: { user_id: userId },
        select: { stripe_customer_id: true },
      });

      return {
        invoices: [],
        paymentMethod: null,
        stripeCustomerId: subscription?.stripe_customer_id || null,
        total: 0,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserPayments: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Endpoint 7: User Activity
  // ===========================================================================

  /**
   * Get combined timeline of all user activities
   *
   * @param userId - User ID
   * @param type - Filter by activity type ('subscription', 'license', 'coupon', 'credit', 'device', 'all')
   * @param limit - Maximum results to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns Combined user activity timeline
   */
  async getUserActivity(
    userId: string,
    type: string = 'all',
    limit: number = 50,
    offset: number = 0
  ): Promise<UserActivityResponse> {
    try {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);

      // Collect activities from different sources based on type filter
      const activities: Array<{
        id: string;
        type: UserActivityType;
        action: string;
        description: string;
        metadata: Record<string, any>;
        timestamp: Date;
      }> = [];

      // Subscription activities
      if (type === 'all' || type === 'subscription') {
        const subscriptions = await this.prisma.subscription_monetization.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            tier: true,
            status: true,
            created_at: true,
          },
        });

        activities.push(
          ...subscriptions.map((sub) => ({
            id: sub.id,
            type: 'subscription' as UserActivityType,
            action: 'created',
            description: `Subscription ${sub.status} for ${sub.tier} tier`,
            metadata: { tier: sub.tier, status: sub.status },
            timestamp: sub.created_at,
          }))
        );
      }

      // License activities
      if (type === 'all' || type === 'license') {
        const licenses = await this.prisma.perpetual_license.findMany({
          where: { user_id: userId },
          orderBy: { purchased_at: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            license_key: true,
            status: true,
            purchased_at: true,
          },
        });

        activities.push(
          ...licenses.map((license) => ({
            id: license.id,
            type: 'license' as UserActivityType,
            action: 'purchased',
            description: `Perpetual license purchased (${license.license_key})`,
            metadata: { licenseKey: license.license_key, status: license.status },
            timestamp: license.purchased_at,
          }))
        );
      }

      // Coupon activities
      if (type === 'all' || type === 'coupon') {
        const coupons = await this.prisma.coupon_redemption.findMany({
          where: {
            subscription_monetization: {
              user_id: userId,
            },
          },
          orderBy: { redemption_date: 'desc' },
          take: safeLimit,
          include: {
            coupon: { select: { code: true } },
          },
        });

        activities.push(
          ...coupons.map((coupon) => ({
            id: coupon.id,
            type: 'coupon' as UserActivityType,
            action: 'redeemed',
            description: `Coupon ${coupon.coupon.code} redeemed`,
            metadata: { code: coupon.coupon.code },
            timestamp: coupon.redemption_date,
          }))
        );
      }

      // Credit activities
      if (type === 'all' || type === 'credit') {
        const credits = await this.prisma.credit_allocation.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            amount: true,
            source: true,
            created_at: true,
          },
        });

        activities.push(
          ...credits.map((credit) => ({
            id: credit.id,
            type: 'credit' as UserActivityType,
            action: 'allocated',
            description: `${credit.amount} credits allocated from ${credit.source}`,
            metadata: { amount: credit.amount, source: credit.source },
            timestamp: credit.created_at,
          }))
        );
      }

      // Device activities
      if (type === 'all' || type === 'device') {
        const devices = await this.prisma.license_activation.findMany({
          where: { user_id: userId },
          orderBy: { activated_at: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            device_name: true,
            status: true,
            activated_at: true,
          },
        });

        activities.push(
          ...devices.map((device) => ({
            id: device.id,
            type: 'device' as UserActivityType,
            action: device.status === 'active' ? 'activated' : 'deactivated',
            description: `Device ${device.device_name || 'Unknown'} ${device.status}`,
            metadata: { deviceName: device.device_name, status: device.status },
            timestamp: device.activated_at,
          }))
        );
      }

      // Sort all activities by timestamp (newest first)
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const paginatedActivities = activities.slice(safeOffset, safeOffset + safeLimit);

      logger.info('AdminUserDetailService.getUserActivity: Retrieved', {
        userId,
        type,
        totalActivities: activities.length,
        returned: paginatedActivities.length,
      });

      return {
        activities: paginatedActivities,
        total: activities.length,
        limit: safeLimit,
        offset: safeOffset,
      };
    } catch (error) {
      logger.error('AdminUserDetailService.getUserActivity: Error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Calculate period start and end dates based on period string
   */
  private calculatePeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let durationMs: number;

    switch (period) {
      case '7d':
        durationMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        durationMs = 90 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        durationMs = 365 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
      default:
        durationMs = 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const startDate = new Date(now.getTime() - durationMs);
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }
}
