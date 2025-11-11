/**
 * Campaign Controller
 *
 * REST API endpoints for coupon campaign management (admin only).
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { CampaignManagementService } from '../services/campaign-management.service';
import {
  createCampaignRequestSchema,
  updateCampaignRequestSchema,
  assignCouponRequestSchema,
  safeValidateRequest,
} from '../types/coupon-validation';
import logger from '../utils/logger';

@injectable()
export class CampaignController {
  constructor(
    @inject(CampaignManagementService) private campaignService: CampaignManagementService
  ) {
    logger.debug('CampaignController: Initialized');
  }

  async createCampaign(req: Request, res: Response): Promise<void> {
    const adminUserId = (req as any).userId;

    try {
      const data = safeValidateRequest(createCampaignRequestSchema, req.body);

      const campaign = await this.campaignService.createCampaign({
        campaignName: data.campaign_name,
        campaignType: data.campaign_type,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        budgetLimitUsd: data.budget_limit_usd,
        targetTier: data.target_tier || undefined,
        isActive: data.is_active ?? true,
        createdBy: adminUserId,
      });

      res.status(201).json({
        id: campaign.id,
        campaign_name: campaign.campaignName,
        campaign_type: campaign.campaignType,
        created_at: campaign.createdAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to create campaign', { error });
      res.status(400).json({
        error: { code: 'creation_failed', message: error.message || 'Failed to create campaign' },
      });
    }
  }

  async updateCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const data = safeValidateRequest(updateCampaignRequestSchema, req.body);

      const updateData: any = {};
      if (data.campaign_name) updateData.campaignName = data.campaign_name;
      if (data.start_date) updateData.startDate = new Date(data.start_date);
      if (data.end_date) updateData.endDate = new Date(data.end_date);
      if (data.budget_limit_usd) updateData.budgetLimitUsd = data.budget_limit_usd;
      if (data.target_tier !== undefined) updateData.targetTier = data.target_tier;
      if (data.is_active !== undefined) updateData.isActive = data.is_active;

      const campaign = await this.campaignService.updateCampaign(id, updateData);

      res.json({
        id: campaign.id,
        campaign_name: campaign.campaignName,
        updated_at: campaign.updatedAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to update campaign', { id, error });
      res.status(400).json({
        error: { code: 'update_failed', message: error.message || 'Failed to update campaign' },
      });
    }
  }

  async deleteCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      await this.campaignService.deleteCampaign(id);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to delete campaign', { id, error });
      res.status(400).json({
        error: { code: 'deletion_failed', message: error.message || 'Failed to delete campaign' },
      });
    }
  }

  async listCampaigns(_req: Request, res: Response): Promise<void> {
    try {
      const campaigns = await this.campaignService.getAllCampaigns();

      res.json({
        campaigns: campaigns.map((c) => ({
          id: c.id,
          campaign_name: c.campaignName,
          campaign_type: c.campaignType,
          start_date: c.startDate.toISOString(),
          end_date: c.endDate.toISOString(),
          budget_limit_usd: parseFloat(c.budgetLimitUsd.toString()),
          total_spent_usd: parseFloat(c.totalSpentUsd.toString()),
          is_active: c.isActive,
        })),
      });
    } catch (error: any) {
      logger.error('Failed to list campaigns', { error });
      res.status(500).json({
        error: { code: 'internal_server_error', message: 'Failed to retrieve campaigns' },
      });
    }
  }

  async getCampaignPerformance(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const performance = await this.campaignService.getCampaignPerformance(id);
      res.json(performance);
    } catch (error: any) {
      logger.error('Failed to get campaign performance', { id, error });
      res.status(500).json({
        error: { code: 'internal_server_error', message: 'Failed to retrieve performance data' },
      });
    }
  }

  async assignCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const data = safeValidateRequest(assignCouponRequestSchema, req.body);
      await this.campaignService.assignCouponToCampaign(id, data.coupon_id);

      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to assign coupon to campaign', { id, error });
      res.status(400).json({
        error: { code: 'assignment_failed', message: error.message || 'Failed to assign coupon' },
      });
    }
  }

  async removeCoupon(req: Request, res: Response): Promise<void> {
    const { id, couponId } = req.params;

    try {
      await this.campaignService.removeCouponFromCampaign(id, couponId);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to remove coupon from campaign', { id, couponId, error });
      res.status(400).json({
        error: { code: 'removal_failed', message: error.message || 'Failed to remove coupon' },
      });
    }
  }
}
