/**
 * Campaign Management Service
 *
 * Manages coupon campaigns, budget tracking, and performance analytics.
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
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

    return await this.prisma.coupon_campaign.create({
      data: {
        campaign_name: data.campaignName,
        campaign_type: data.campaignType,
        start_date: data.startDate,
        end_date: data.endDate,
        budget_limit_usd: new Prisma.Decimal(data.budgetLimitUsd),
        target_tier: data.targetTier as any,
        is_active: data.isActive ?? true,
        created_by: data.createdBy,
      },
    });
  }

  async updateCampaign(campaignId: string, data: Partial<CouponCampaign>): Promise<CouponCampaign> {
    logger.info('Updating campaign', { campaignId });

    return await this.prisma.coupon_campaign.update({
      where: { id: campaignId },
      data,
    });
  }

  async activateCampaign(campaignId: string): Promise<CouponCampaign> {
    return await this.updateCampaign(campaignId, { is_active: true } as any);
  }

  async deactivateCampaign(campaignId: string): Promise<CouponCampaign> {
    return await this.updateCampaign(campaignId, { is_active: false } as any);
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    logger.info('Deleting campaign', { campaignId });
    await this.prisma.coupon_campaign.delete({ where: { id: campaignId } });
  }

  async assignCouponToCampaign(campaignId: string, couponId: string): Promise<void> {
    logger.info('Assigning coupon to campaign', { campaignId, couponId });

    await this.prisma.campaign_coupon.create({
      data: { campaign_id: campaignId, coupon_id: couponId },
    });
  }

  async removeCouponFromCampaign(campaignId: string, couponId: string): Promise<void> {
    logger.info('Removing coupon from campaign', { campaignId, couponId });

    await this.prisma.campaign_coupon.deleteMany({
      where: { campaign_id: campaignId, coupon_id: couponId },
    });
  }

  async getCampaignCoupons(campaignId: string): Promise<Coupon[]> {
    const campaign = await this.prisma.coupon_campaign.findUnique({
      where: { id: campaignId },
      include: { coupon: true },
    });

    return campaign?.coupon || [];
  }

  async checkBudgetAvailability(campaignId: string, requiredAmount: number): Promise<boolean> {
    const campaign = await this.prisma.coupon_campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return false;

    const remaining = parseFloat(campaign.budget_limit_usd.toString()) - parseFloat(campaign.total_spent_usd.toString());
    return remaining >= requiredAmount;
  }

  async updateBudgetSpent(campaignId: string, spentAmount: number): Promise<void> {
    await this.prisma.coupon_campaign.update({
      where: { id: campaignId },
      data: { total_spent_usd: { increment: new Prisma.Decimal(spentAmount) } },
    });
  }

  async getRemainingBudget(campaignId: string): Promise<number> {
    const campaign = await this.prisma.coupon_campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return 0;

    return parseFloat(campaign.budget_limit_usd.toString()) - parseFloat(campaign.total_spent_usd.toString());
  }

  async getCampaignPerformance(campaignId: string): Promise<{
    campaignName: string;
    totalRedemptions: number;
    totalDiscountUsd: number;
    budgetUtilization: number;
    conversionRate: number;
    topCouponCode: string | null;
  }> {
    const campaign = await this.prisma.coupon_campaign.findUnique({
      where: { id: campaignId },
      include: {
        coupon: {
          include: {
            coupon_redemption: { where: { redemption_status: 'success' } },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const allRedemptions = campaign.coupon.flatMap((c) => c.coupon_redemption);
    const totalRedemptions = allRedemptions.length;
    const totalDiscountUsd = allRedemptions.reduce(
      (sum, r) => sum + parseFloat(r.discount_applied_usd.toString()),
      0
    );
    const budgetUtilization =
      (parseFloat(campaign.total_spent_usd.toString()) / parseFloat(campaign.budget_limit_usd.toString())) * 100;

    // Find top coupon
    const couponRedemptionCounts = campaign.coupon.map((c) => ({
      code: c.code,
      count: c.coupon_redemption.length,
    }));
    const topCoupon = couponRedemptionCounts.sort((a, b) => b.count - a.count)[0];

    return {
      campaignName: campaign.campaign_name,
      totalRedemptions,
      totalDiscountUsd,
      budgetUtilization,
      conversionRate: 0, // TODO: Calculate based on campaign views vs redemptions
      topCouponCode: topCoupon?.code || null,
    };
  }

  async getTopPerformingCampaigns(limit: number = 10): Promise<any[]> {
    const campaigns = await this.prisma.coupon_campaign.findMany({
      where: { is_active: true },
      orderBy: { total_spent_usd: 'desc' },
      take: limit,
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.campaign_name,
      totalSpent: parseFloat(c.total_spent_usd.toString()),
      budgetLimit: parseFloat(c.budget_limit_usd.toString()),
      utilization:
        (parseFloat(c.total_spent_usd.toString()) / parseFloat(c.budget_limit_usd.toString())) * 100,
    }));
  }

  async getCampaignConversionRate(_campaignId: string): Promise<number> {
    // TODO: Implement based on campaign impressions vs redemptions
    return 0;
  }

  async getAllCampaigns(): Promise<CouponCampaign[]> {
    return await this.prisma.coupon_campaign.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getActiveCampaigns(): Promise<CouponCampaign[]> {
    return await this.prisma.coupon_campaign.findMany({
      where: { is_active: true },
      orderBy: { start_date: 'desc' },
    });
  }

  async getCampaignsByType(type: CampaignType): Promise<CouponCampaign[]> {
    return await this.prisma.coupon_campaign.findMany({
      where: { campaign_type: type },
      orderBy: { created_at: 'desc' },
    });
  }

  async getCampaignById(campaignId: string): Promise<CouponCampaign | null> {
    return await this.prisma.coupon_campaign.findUnique({
      where: { id: campaignId },
      include: { coupon: true },
    });
  }
}
