/**
 * Campaign Controller
 *
 * REST API endpoints for coupon campaign management (admin only).
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CampaignManagementService } from '../services/campaign-management.service';
import {
  createCampaignRequestSchema,
  updateCampaignRequestSchema,
  assignCouponRequestSchema,
  safeValidateRequest,
} from '../types/coupon-validation';
import logger from '../utils/logger';
import { sendPaginatedResponse } from '../utils/responses';

@injectable()
export class CampaignController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CampaignManagementService) private campaignService: CampaignManagementService
  ) {
    logger.debug('CampaignController: Initialized');
  }

  async createCampaign(req: Request, res: Response): Promise<void> {
    const adminUserId = (req as any).userId;

    try {
      const data = safeValidateRequest(createCampaignRequestSchema, req.body);

      const campaign = await this.campaignService.createCampaign({
        campaign_name: data.campaign_name as string,
        campaign_type: data.campaign_type as any,
        start_date: new Date(data.start_date as string | Date),
        end_date: new Date(data.end_date as string | Date),
        budget_limit_usd: data.budget_limit_usd as number,
        target_tier: (data.target_tier as string) || undefined,
        is_active: (data.is_active as boolean) ?? true,
        created_by: adminUserId,
      });

      // Calculate status from dates (same as getSingleCampaign)
      const now = new Date();
      let status: 'planning' | 'active' | 'paused' | 'ended';
      if (!campaign.is_active) {
        status = 'paused';
      } else if (now < campaign.start_date) {
        status = 'planning';
      } else if (now > campaign.end_date) {
        status = 'ended';
      } else {
        status = 'active';
      }

      // Return full object like getSingleCampaign
      res.status(201).json({
        id: campaign.id,
        name: campaign.campaign_name,
        type: campaign.campaign_type,
        starts_at: campaign.start_date.toISOString(),
        ends_at: campaign.end_date.toISOString(),
        status,
        budget_cap: parseFloat(campaign.budget_limit_usd.toString()),
        current_spend: parseFloat(campaign.total_spent_usd.toString()),
        target_audience: campaign.target_tier ? { user_tiers: [campaign.target_tier] } : undefined,
        is_active: campaign.is_active,
        coupon_count: 0, // New campaign has no coupons yet
        created_at: campaign.created_at.toISOString(),
        updated_at: campaign.updated_at.toISOString(),
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
      if (data.campaign_name) updateData.campaignName = data.campaign_name as string;
      if (data.start_date) updateData.startDate = new Date(data.start_date as string | Date);
      if (data.end_date) updateData.endDate = new Date(data.end_date as string | Date);
      if (data.budget_limit_usd) updateData.budgetLimitUsd = data.budget_limit_usd as number;
      if (data.target_tier !== undefined) updateData.targetTier = data.target_tier as string | null;
      if (data.is_active !== undefined) updateData.isActive = data.is_active as boolean;

      await this.campaignService.updateCampaign(id, updateData);

      // Fetch full campaign with coupon count
      const fullCampaign = await this.prisma.coupon_campaign.findUnique({
        where: { id },
        include: {
          coupon: true,
        },
      });

      if (!fullCampaign) {
        res.status(404).json({
          error: {
            code: 'campaign_not_found',
            message: 'Campaign not found after update',
          },
        });
        return;
      }

      // Calculate status from dates (same as getSingleCampaign)
      const now = new Date();
      let status: 'planning' | 'active' | 'paused' | 'ended';
      if (!fullCampaign.is_active) {
        status = 'paused';
      } else if (now < fullCampaign.start_date) {
        status = 'planning';
      } else if (now > fullCampaign.end_date) {
        status = 'ended';
      } else {
        status = 'active';
      }

      // Return full object like getSingleCampaign
      res.json({
        id: fullCampaign.id,
        name: fullCampaign.campaign_name,
        type: fullCampaign.campaign_type,
        starts_at: fullCampaign.start_date.toISOString(),
        ends_at: fullCampaign.end_date.toISOString(),
        status,
        budget_cap: parseFloat(fullCampaign.budget_limit_usd.toString()),
        current_spend: parseFloat(fullCampaign.total_spent_usd.toString()),
        target_audience: fullCampaign.target_tier ? { user_tiers: [fullCampaign.target_tier] } : undefined,
        is_active: fullCampaign.is_active,
        coupon_count: (fullCampaign as any).coupon?.length || 0,
        created_at: fullCampaign.created_at.toISOString(),
        updated_at: fullCampaign.updated_at.toISOString(),
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

  /**
   * GET /admin/campaigns/:id
   * Get a single campaign by ID (admin only)
   */
  async getSingleCampaign(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const campaign = await this.prisma.coupon_campaign.findUnique({
        where: { id },
        include: {
          coupon: true,
        },
      });

      if (!campaign) {
        res.status(404).json({
          error: {
            code: 'campaign_not_found',
            message: 'Campaign not found',
          },
        });
        return;
      }

      // Calculate status from dates
      const now = new Date();
      let status: 'planning' | 'active' | 'paused' | 'ended';
      if (!campaign.is_active) {
        status = 'paused';
      } else if (now < campaign.start_date) {
        status = 'planning';
      } else if (now > campaign.end_date) {
        status = 'ended';
      } else {
        status = 'active';
      }

      // Map to frontend format with all fields
      res.json({
        id: campaign.id,
        name: campaign.campaign_name,
        type: campaign.campaign_type,
        starts_at: campaign.start_date.toISOString(),
        ends_at: campaign.end_date.toISOString(),
        status,
        budget_cap: parseFloat(campaign.budget_limit_usd.toString()),
        current_spend: parseFloat(campaign.total_spent_usd.toString()),
        target_audience: campaign.target_tier ? { user_tiers: [campaign.target_tier] } : undefined,
        is_active: campaign.is_active,
        coupon_count: (campaign as any).coupon?.length || 0,
        created_at: campaign.created_at.toISOString(),
        updated_at: campaign.updated_at.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get campaign', { id, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve campaign',
        },
      });
    }
  }

  /**
   * GET /admin/campaigns
   * List all campaigns (admin only)
   *
   * Query params:
   * - page: number (default: 0)
   * - limit: number (default: 50)
   * - status: string (optional filter: active/inactive)
   * - type: string (optional filter by campaign type)
   */
  async listCampaigns(req: Request, res: Response): Promise<void> {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Build filter conditions
      const where: any = {};
      if (req.query.status) {
        where.isActive = req.query.status === 'active';
      }
      if (req.query.type) {
        where.campaignType = req.query.type;
      }

      // Fetch campaigns with pagination
      const [campaigns, total] = await Promise.all([
        this.prisma.coupon_campaign.findMany({
          where,
          skip: page * limit,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.coupon_campaign.count({ where }),
      ]);

      // Map to response format
      const mappedCampaigns = campaigns.map((c) => ({
        id: c.id,
        campaign_name: c.campaign_name,
        campaign_type: c.campaign_type,
        start_date: c.start_date.toISOString(),
        end_date: c.end_date.toISOString(),
        budget_limit_usd: parseFloat(c.budget_limit_usd.toString()),
        total_spent_usd: parseFloat(c.total_spent_usd.toString()),
        is_active: c.is_active,
      }));

      // Send modern paginated response
      sendPaginatedResponse(res, mappedCampaigns, total, page, limit);
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
