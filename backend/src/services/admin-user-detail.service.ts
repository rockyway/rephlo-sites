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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          lastLoginAt: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get current active subscription
      const currentSubscription = await this.prisma.subscriptionMonetization.findFirst({
        where: {
          userId,
          status: 'active',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          tier: true,
          status: true,
          billingCycle: true,
          monthlyCreditAllocation: true,
          currentPeriodEnd: true,
          createdAt: true,
        },
      });

      // Get current active license
      const currentLicense = await this.prisma.perpetualLicense.findFirst({
        where: {
          userId,
          status: 'active',
        },
        orderBy: {
          purchasedAt: 'desc',
        },
        select: {
          id: true,
          licenseKey: true,
          status: true,
          activatedAt: true,
          currentActivations: true,
          maxActivations: true,
        },
      });

      // Get credit balance
      const creditBalance = await this.prisma.userCreditBalance.findUnique({
        where: { userId: userId },
        select: {
          amount: true,
          updatedAt: true,
        },
      });

      // Get quick stats
      const [totalSubscriptions, totalLicenses, totalCreditsConsumed, totalCouponsRedeemed] =
        await Promise.all([
          this.prisma.subscriptionMonetization.count({
            where: { userId },
          }),
          this.prisma.perpetualLicense.count({
            where: { userId },
          }),
          this.prisma.tokenUsageLedger.aggregate({
            where: { userId: userId },
            _sum: { creditsDeducted: true },
          }),
          this.prisma.couponRedemption.count({
            where: {
              subscription: {
                userId,
              },
              redemptionStatus: 'success',
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
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.firstName || user.lastName || null,
          createdAt: user.createdAt,
          lastLogin: user.lastLoginAt,
          status: user.isActive ? 'active' : 'suspended',
        },
        currentSubscription: currentSubscription
          ? {
              id: currentSubscription.id,
              tier: currentSubscription.tier,
              status: currentSubscription.status,
              billingCycle: currentSubscription.billingCycle as 'monthly' | 'annual',
              creditAllocation: currentSubscription.monthlyCreditAllocation,
              nextBillingDate: currentSubscription.currentPeriodEnd,
              startedAt: currentSubscription.createdAt,
            }
          : null,
        currentLicense: currentLicense
          ? {
              id: currentLicense.id,
              licenseKey: currentLicense.licenseKey,
              status: currentLicense.status as 'active' | 'pending' | 'revoked',
              activatedAt: currentLicense.activatedAt,
              deviceCount: currentLicense.currentActivations,
              maxDevices: currentLicense.maxActivations,
            }
          : null,
        creditBalance: creditBalance?.amount || 0,
        stats: {
          totalSubscriptions: totalSubscriptions,
          totalLicenses: totalLicenses,
          creditsConsumed: Number(totalCreditsConsumed._sum?.creditsDeducted || 0),
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
      const total = await this.prisma.subscriptionMonetization.count({
        where: { userId },
      });

      // Get subscriptions with pagination
      const subscriptions = await this.prisma.subscriptionMonetization.findMany({
        where: { userId },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tier: true,
          status: true,
          billingCycle: true,
          monthlyCreditAllocation: true,
          createdAt: true,
          cancelledAt: true,
          currentPeriodEnd: true,
          basePriceUsd: true,
        },
      });

      // Get proration events for this user
      const prorations = await this.prisma.prorationEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        select: {
          id: true,
          fromTier: true,
          toTier: true,
          unusedCreditValueUsd: true,
          newTierProratedCostUsd: true,
          netChargeUsd: true,
          createdAt: true,
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
          billingCycle: sub.billingCycle as 'monthly' | 'annual',
          monthlyCreditAllocation: sub.monthlyCreditAllocation,
          startedAt: sub.createdAt,
          endedAt: sub.cancelledAt,
          nextBillingDate: sub.status === 'active' ? sub.currentPeriodEnd : null,
          monthlyPriceUsd: Number(sub.basePriceUsd),
        })),
        prorations: prorations.map((pro) => ({
          id: pro.id,
          fromTier: pro.fromTier || 'unknown',
          toTier: pro.toTier || 'unknown',
          fromPriceUsd: Number(pro.unusedCreditValueUsd),
          toPriceUsd: Number(pro.newTierProratedCostUsd),
          prorationAmountUsd: Number(pro.netChargeUsd),
          createdAt: pro.createdAt,
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
      const total = await this.prisma.perpetualLicense.count({
        where: { userId },
      });

      // Get licenses with device activations (avoid N+1 by using include)
      const licenses = await this.prisma.perpetualLicense.findMany({
        where: { userId },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { purchasedAt: 'desc' },
        include: {
          activations: {
            orderBy: { activatedAt: 'desc' },
            select: {
              id: true,
              deviceName: true,
              machineFingerprint: true,
              activatedAt: true,
              lastSeenAt: true,
              status: true,
            },
          },
        },
      });

      // Get version upgrades
      const upgrades = await this.prisma.versionUpgrade.findMany({
        where: { userId },
        orderBy: { purchasedAt: 'desc' },
        take: safeLimit,
        select: {
          id: true,
          fromVersion: true,
          toVersion: true,
          upgradePriceUsd: true,
          purchasedAt: true,
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
          licenseKey: license.licenseKey,
          status: license.status as 'active' | 'pending' | 'revoked',
          purchasePriceUsd: Number(license.purchasePriceUsd),
          purchaseDate: license.purchasedAt,
          activatedAt: license.activatedAt,
          eligibleUntilVersion: license.eligibleUntilVersion,
          deviceActivations: license.activations.map((activation) => ({
            id: activation.id,
            deviceName: activation.deviceName,
            deviceId: activation.machineFingerprint,
            activatedAt: activation.activatedAt,
            lastSeenAt: activation.lastSeenAt,
            status: activation.status as 'active' | 'deactivated',
          })),
        })),
        upgrades: upgrades.map((upgrade) => ({
          id: upgrade.id,
          fromVersion: upgrade.fromVersion,
          toVersion: upgrade.toVersion,
          upgradePriceUsd: Number(upgrade.upgradePriceUsd),
          upgradeDate: upgrade.purchasedAt,
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
      const balance = await this.prisma.userCreditBalance.findUnique({
        where: { userId: userId },
        select: {
          amount: true,
          updatedAt: true,
        },
      });

      // Get credit allocations
      const allocations = await this.prisma.creditAllocation.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          source: true,
          createdAt: true,
        },
      });

      // Get usage by model (aggregated from TokenUsageLedger)
      const usageByModel = await this.prisma.tokenUsageLedger.groupBy({
        by: ['modelId'],
        where: {
          userId: userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          creditsDeducted: true,
        },
        _count: {
          id: true,
        },
      });

      // Usage by model now groups by modelId (string), use modelId as the identifier
      const modelPricingMap = new Map(usageByModel.map((u) => [u.modelId, u.modelId]));

      // Get deductions
      const deductions = await this.prisma.creditDeductionLedger.findMany({
        where: {
          userId: userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          requestId: true,
        },
      });

      // Get total allocations and deductions
      const [totalAllocations, totalDeductions] = await Promise.all([
        this.prisma.creditAllocation.aggregate({
          where: { userId },
          _sum: { amount: true },
        }),
        this.prisma.creditDeductionLedger.aggregate({
          where: { userId: userId },
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
          lastUpdated: balance?.updatedAt || new Date(),
        },
        allocations: allocations.map((alloc) => ({
          id: alloc.id,
          amount: alloc.amount,
          source: alloc.source as any,
          reason: null, // Not stored in current schema
          allocatedAt: alloc.createdAt,
        })),
        usage: usageByModel.map((usage) => ({
          model: modelPricingMap.get(usage.modelId) || 'Unknown Model',
          totalCredits: usage._sum?.creditsDeducted || 0,
          requestCount: usage._count?.id || 0,
        })),
        deductions: deductions.map((deduction) => ({
          id: deduction.id,
          amount: deduction.amount,
          modelUsed: 'Unknown', // Would need to join with usage ledger
          timestamp: deduction.createdAt,
        })),
        totalAllocations: totalAllocations._sum?.amount || 0,
        totalUsage: usageByModel.reduce(
          (sum, u) => sum + (u._sum?.creditsDeducted || 0),
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
      const total = await this.prisma.couponRedemption.count({
        where: {
          subscription: {
            userId,
          },
        },
      });

      // Get coupon redemptions
      const redemptions = await this.prisma.couponRedemption.findMany({
        where: {
          subscription: {
            userId,
          },
        },
        skip: safeOffset,
        take: safeLimit,
        orderBy: { redemptionDate: 'desc' },
        include: {
          coupon: {
            select: {
              code: true,
              couponType: true,
              discountType: true,
              discountValue: true,
            },
          },
          subscription: {
            select: {
              tier: true,
            },
          },
        },
      });

      // Get fraud flags for this user
      const fraudFlags = await this.prisma.couponFraudDetection.findMany({
        where: { userId },
        orderBy: { detectedAt: 'desc' },
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
      const totalDiscountSum = await this.prisma.couponRedemption.aggregate({
        where: {
          subscription: {
            userId,
          },
          redemptionStatus: 'success',
        },
        _sum: {
          discountAppliedUsd: true,
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
            type: redemption.coupon.couponType,
            discountType: redemption.coupon.discountType,
            discountValue: Number(redemption.coupon.discountValue),
          },
          redeemedAt: redemption.redemptionDate,
          discountValueUsd: Number(redemption.discountAppliedUsd),
          subscriptionTierGranted: redemption.subscription?.tier || null,
          perpetualLicenseGranted: false, // Not tracked in current schema
        })),
        fraudFlags: fraudFlags.map((flag) => ({
          id: flag.id,
          couponCode: flag.coupon.code,
          flagReason: flag.detectionType,
          severity: flag.severity as 'low' | 'medium' | 'high',
          flaggedAt: flag.detectedAt,
        })),
        totalDiscountValue: Number(totalDiscountSum._sum.discountAppliedUsd || 0) * 100, // Convert to cents
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
      const subscription = await this.prisma.subscriptionMonetization.findFirst({
        where: { userId },
        select: { stripeCustomerId: true },
      });

      return {
        invoices: [],
        paymentMethod: null,
        stripeCustomerId: subscription?.stripeCustomerId || null,
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
        const subscriptions = await this.prisma.subscriptionMonetization.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            tier: true,
            status: true,
            createdAt: true,
          },
        });

        activities.push(
          ...subscriptions.map((sub) => ({
            id: sub.id,
            type: 'subscription' as UserActivityType,
            action: 'created',
            description: `Subscription ${sub.status} for ${sub.tier} tier`,
            metadata: { tier: sub.tier, status: sub.status },
            timestamp: sub.createdAt,
          }))
        );
      }

      // License activities
      if (type === 'all' || type === 'license') {
        const licenses = await this.prisma.perpetualLicense.findMany({
          where: { userId },
          orderBy: { purchasedAt: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            licenseKey: true,
            status: true,
            purchasedAt: true,
          },
        });

        activities.push(
          ...licenses.map((license) => ({
            id: license.id,
            type: 'license' as UserActivityType,
            action: 'purchased',
            description: `Perpetual license purchased (${license.licenseKey})`,
            metadata: { licenseKey: license.licenseKey, status: license.status },
            timestamp: license.purchasedAt,
          }))
        );
      }

      // Coupon activities
      if (type === 'all' || type === 'coupon') {
        const coupons = await this.prisma.couponRedemption.findMany({
          where: {
            subscription: {
              userId,
            },
          },
          orderBy: { redemptionDate: 'desc' },
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
            timestamp: coupon.redemptionDate,
          }))
        );
      }

      // Credit activities
      if (type === 'all' || type === 'credit') {
        const credits = await this.prisma.creditAllocation.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            amount: true,
            source: true,
            createdAt: true,
          },
        });

        activities.push(
          ...credits.map((credit) => ({
            id: credit.id,
            type: 'credit' as UserActivityType,
            action: 'allocated',
            description: `${credit.amount} credits allocated from ${credit.source}`,
            metadata: { amount: credit.amount, source: credit.source },
            timestamp: credit.createdAt,
          }))
        );
      }

      // Device activities
      if (type === 'all' || type === 'device') {
        const devices = await this.prisma.licenseActivation.findMany({
          where: { userId },
          orderBy: { activatedAt: 'desc' },
          take: safeLimit,
          select: {
            id: true,
            deviceName: true,
            status: true,
            activatedAt: true,
          },
        });

        activities.push(
          ...devices.map((device) => ({
            id: device.id,
            type: 'device' as UserActivityType,
            action: device.status === 'active' ? 'activated' : 'deactivated',
            description: `Device ${device.deviceName || 'Unknown'} ${device.status}`,
            metadata: { deviceName: device.deviceName, status: device.status },
            timestamp: device.activatedAt,
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
