/**
 * Campaign Management Service
 *
 * Manages coupon campaigns, budget tracking, and performance analytics.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, CouponCampaign, Coupon, Prisma, CampaignType } from '@prisma/client';
import logger from '../utils/logger';

@injectable()
export class CampaignManagementService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('CampaignManagementService: Initialized');
  }

  async createCampaign(data: {
    campaignName: string;
    campaignType: CampaignType;
    startDate: Date;
    endDate: Date;
    budgetLimitUsd: number;
    targetTier?: string;
    isActive?: boolean;
    createdBy: string;
  }): Promise<CouponCampaign> {
    logger.info('Creating campaign', { campaignName: data.campaignName });

    return await this.prisma.couponCampaign.create({
      data: {
        ...data,
        budgetLimitUsd: new Prisma.Decimal(data.budgetLimitUsd),
        targetTier: data.targetTier as any,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateCampaign(campaignId: string, data: Partial<CouponCampaign>): Promise<CouponCampaign> {
    logger.info('Updating campaign', { campaignId });

    return await this.prisma.couponCampaign.update({
      where: { id: campaignId },
      data,
    });
  }

  async activateCampaign(campaignId: string): Promise<CouponCampaign> {
    return await this.updateCampaign(campaignId, { isActive: true });
  }

  async deactivateCampaign(campaignId: string): Promise<CouponCampaign> {
    return await this.updateCampaign(campaignId, { isActive: false });
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    logger.info('Deleting campaign', { campaignId });
    await this.prisma.couponCampaign.delete({ where: { id: campaignId } });
  }

  async assignCouponToCampaign(campaignId: string, couponId: string): Promise<void> {
    logger.info('Assigning coupon to campaign', { campaignId, couponId });

    await this.prisma.campaignCoupon.create({
      data: { campaignId, couponId },
    });
  }

  async removeCouponFromCampaign(campaignId: string, couponId: string): Promise<void> {
    logger.info('Removing coupon from campaign', { campaignId, couponId });

    await this.prisma.campaignCoupon.deleteMany({
      where: { campaignId, couponId },
    });
  }

  async getCampaignCoupons(campaignId: string): Promise<Coupon[]> {
    const campaign = await this.prisma.couponCampaign.findUnique({
      where: { id: campaignId },
      include: { coupons: true },
    });

    return campaign?.coupons || [];
  }

  async checkBudgetAvailability(campaignId: string, requiredAmount: number): Promise<boolean> {
    const campaign = await this.prisma.couponCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return false;

    const remaining = parseFloat(campaign.budgetLimitUsd.toString()) - parseFloat(campaign.totalSpentUsd.toString());
    return remaining >= requiredAmount;
  }

  async updateBudgetSpent(campaignId: string, spentAmount: number): Promise<void> {
    await this.prisma.couponCampaign.update({
      where: { id: campaignId },
      data: { totalSpentUsd: { increment: new Prisma.Decimal(spentAmount) } },
    });
  }

  async getRemainingBudget(campaignId: string): Promise<number> {
    const campaign = await this.prisma.couponCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return 0;

    return parseFloat(campaign.budgetLimitUsd.toString()) - parseFloat(campaign.totalSpentUsd.toString());
  }

  async getCampaignPerformance(campaignId: string): Promise<{
    campaignName: string;
    totalRedemptions: number;
    totalDiscountUsd: number;
    budgetUtilization: number;
    conversionRate: number;
    topCouponCode: string | null;
  }> {
    const campaign = await this.prisma.couponCampaign.findUnique({
      where: { id: campaignId },
      include: {
        coupons: {
          include: {
            redemptions: { where: { redemptionStatus: 'success' } },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const allRedemptions = campaign.coupons.flatMap((c) => c.redemptions);
    const totalRedemptions = allRedemptions.length;
    const totalDiscountUsd = allRedemptions.reduce(
      (sum, r) => sum + parseFloat(r.discountAppliedUsd.toString()),
      0
    );
    const budgetUtilization =
      (parseFloat(campaign.totalSpentUsd.toString()) / parseFloat(campaign.budgetLimitUsd.toString())) * 100;

    // Find top coupon
    const couponRedemptionCounts = campaign.coupons.map((c) => ({
      code: c.code,
      count: c.redemptions.length,
    }));
    const topCoupon = couponRedemptionCounts.sort((a, b) => b.count - a.count)[0];

    return {
      campaignName: campaign.campaignName,
      totalRedemptions,
      totalDiscountUsd,
      budgetUtilization,
      conversionRate: 0, // TODO: Calculate based on campaign views vs redemptions
      topCouponCode: topCoupon?.code || null,
    };
  }

  async getTopPerformingCampaigns(limit: number = 10): Promise<any[]> {
    const campaigns = await this.prisma.couponCampaign.findMany({
      where: { isActive: true },
      orderBy: { totalSpentUsd: 'desc' },
      take: limit,
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.campaignName,
      totalSpent: parseFloat(c.totalSpentUsd.toString()),
      budgetLimit: parseFloat(c.budgetLimitUsd.toString()),
      utilization:
        (parseFloat(c.totalSpentUsd.toString()) / parseFloat(c.budgetLimitUsd.toString())) * 100,
    }));
  }

  async getCampaignConversionRate(_campaignId: string): Promise<number> {
    // TODO: Implement based on campaign impressions vs redemptions
    return 0;
  }

  async getAllCampaigns(): Promise<CouponCampaign[]> {
    return await this.prisma.couponCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveCampaigns(): Promise<CouponCampaign[]> {
    return await this.prisma.couponCampaign.findMany({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async getCampaignsByType(type: CampaignType): Promise<CouponCampaign[]> {
    return await this.prisma.couponCampaign.findMany({
      where: { campaignType: type },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(campaignId: string): Promise<CouponCampaign | null> {
    return await this.prisma.couponCampaign.findUnique({
      where: { id: campaignId },
      include: { coupons: true },
    });
  }
}
