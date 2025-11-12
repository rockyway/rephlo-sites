/**
 * Coupon Controller
 *
 * REST API endpoints for coupon validation, redemption, and management.
 *
 * Endpoints:
 * - POST   /api/coupons/validate               - Validate coupon code (public)
 * - POST   /api/coupons/redeem                 - Redeem coupon (public)
 * - GET    /api/users/:userId/coupons          - Get user's redeemed coupons
 * - POST   /admin/coupons                      - Create coupon (admin only)
 * - PATCH  /admin/coupons/:id                  - Update coupon (admin only)
 * - DELETE /admin/coupons/:id                  - Delete coupon (admin only)
 * - GET    /admin/coupons                      - List all coupons (admin only)
 * - GET    /admin/coupons/:id/redemptions      - Get redemption history (admin only)
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { CouponValidationService } from '../services/coupon-validation.service';
import { CouponRedemptionService } from '../services/coupon-redemption.service';
import {
  validateCouponRequestSchema,
  redeemCouponRequestSchema,
  createCouponRequestSchema,
  updateCouponRequestSchema,
  safeValidateRequest,
} from '../types/coupon-validation';
import logger from '../utils/logger';
import { sendPaginatedResponse, successResponse } from '../utils/responses';
import { mapCouponToApiType, mapRedemptionToApiType } from '../utils/typeMappers';

@injectable()
export class CouponController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CouponValidationService) private validationService: CouponValidationService,
    @inject(CouponRedemptionService) private redemptionService: CouponRedemptionService
  ) {
    logger.debug('CouponController: Initialized');
  }

  /**
   * POST /api/coupons/validate
   * Validate a coupon code
   */
  async validateCoupon(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    try {
      const data = safeValidateRequest(validateCouponRequestSchema, req.body);

      const validation = await this.validationService.validateCoupon(data.code, userId || data.user_id || '', {
        cartTotal: data.cart_total || 0,
        subscriptionTier: data.subscription_tier || 'free',
        deviceFingerprint: data.device_fingerprint,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (!validation.isValid) {
        res.status(400).json({
          valid: false,
          errors: validation.errors,
        });
        return;
      }

      res.json({
        valid: true,
        coupon: {
          code: validation.coupon.code,
          discount_type: validation.discount?.discountType,
          discount_amount: validation.discount?.discountAmount,
        },
        discount: validation.discount,
      });
    } catch (error: any) {
      logger.error('Failed to validate coupon', { error });
      res.status(500).json({
        error: {
          code: 'validation_error',
          message: error.message || 'Failed to validate coupon',
        },
      });
    }
  }

  /**
   * POST /api/coupons/redeem
   * Redeem a coupon
   */
  async redeemCoupon(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
        },
      });
      return;
    }

    try {
      const data = safeValidateRequest(redeemCouponRequestSchema, req.body);

      // Find coupon
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: data.code.toUpperCase() },
      });

      if (!coupon) {
        res.status(404).json({
          error: {
            code: 'coupon_not_found',
            message: 'Coupon code not found',
          },
        });
        return;
      }

      const redemption = await this.redemptionService.redeemCoupon(coupon.id, userId, {
        code: data.code,
        subscriptionId: data.subscription_id,
        originalAmount: data.original_amount || 0,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        redemption_id: redemption.id,
        discount_applied: parseFloat(redemption.discountAppliedUsd.toString()),
        final_amount: parseFloat(redemption.finalAmountUsd.toString()),
        status: redemption.redemptionStatus,
      });
    } catch (error: any) {
      logger.error('Failed to redeem coupon', { userId, error });
      res.status(400).json({
        error: {
          code: 'redemption_failed',
          message: error.message || 'Failed to redeem coupon',
        },
      });
    }
  }

  /**
   * GET /api/users/:userId/coupons
   * Get user's redeemed coupons
   */
  async getUserCoupons(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only see their own coupons unless admin
    if (userId !== requestingUserId && (req as any).role !== 'admin') {
      res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'Access denied',
        },
      });
      return;
    }

    try {
      const redemptions = await this.redemptionService.getUserRedemptions(userId);

      res.json({
        redemptions: redemptions.map((r) => ({
          id: r.id,
          coupon_code: (r as any).coupon.code,
          discount_applied: parseFloat(r.discountAppliedUsd.toString()),
          status: r.redemptionStatus,
          redeemed_at: r.redemptionDate.toISOString(),
        })),
      });
    } catch (error: any) {
      logger.error('Failed to get user coupons', { userId, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve coupons',
        },
      });
    }
  }

  /**
   * POST /admin/coupons
   * Create a coupon (admin only)
   */
  async createCoupon(req: Request, res: Response): Promise<void> {
    const adminUserId = (req as any).userId;

    try {
      const data = safeValidateRequest(createCouponRequestSchema, req.body);

      const coupon = await this.prisma.coupon.create({
        data: {
          code: data.code.toUpperCase(),
          couponType: data.coupon_type,
          discountValue: new Prisma.Decimal(data.discount_value),
          discountType: data.discount_type,
          currency: data.currency || 'usd',
          maxUses: data.max_uses,
          maxUsesPerUser: data.max_uses_per_user || 1,
          minPurchaseAmount: data.min_purchase_amount ? new Prisma.Decimal(data.min_purchase_amount) : null,
          tierEligibility: data.tier_eligibility || ['free', 'pro', 'enterprise'],
          billingCycles: data.billing_cycles || ['monthly', 'annual'],
          validFrom: new Date(data.valid_from),
          validUntil: new Date(data.valid_until),
          isActive: data.is_active ?? true,
          campaignId: data.campaign_id || null,
          description: data.description || null,
          internalNotes: data.internal_notes || null,
          createdBy: adminUserId,
        },
        include: {
          usageLimits: true,
          campaign: true,
        },
      });

      // Create usage limits record
      const usageLimits = await this.prisma.couponUsageLimit.create({
        data: {
          couponId: coupon.id,
          totalUses: 0,
          uniqueUsers: 0,
          totalDiscountAppliedUsd: 0,
        },
      });

      // Return full object like getSingleCoupon
      res.status(201).json({
        id: coupon.id,
        code: coupon.code,
        type: coupon.couponType,
        discount_percentage: coupon.couponType === 'percentage' ? parseFloat(coupon.discountValue.toString()) : undefined,
        discount_amount: coupon.couponType === 'fixed_amount' ? parseFloat(coupon.discountValue.toString()) : undefined,
        bonus_duration_months: coupon.couponType === 'duration_bonus' ? parseInt(coupon.discountValue.toString()) : undefined,
        max_discount_applications: coupon.maxUses || null,
        redemption_count: usageLimits.totalUses,
        total_discount_value: parseFloat(usageLimits.totalDiscountAppliedUsd.toString()),
        valid_from: coupon.validFrom.toISOString(),
        valid_until: coupon.validUntil.toISOString(),
        is_active: coupon.isActive,
        description: coupon.description,
        campaign_id: coupon.campaignId,
        campaign_name: (coupon as any).campaign?.campaignName || null,
        created_at: coupon.createdAt.toISOString(),
        updated_at: coupon.updatedAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to create coupon', { error });
      res.status(400).json({
        error: {
          code: 'creation_failed',
          message: error.message || 'Failed to create coupon',
        },
      });
    }
  }

  /**
   * PATCH /admin/coupons/:id
   * Update a coupon (admin only)
   */
  async updateCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const data = safeValidateRequest(updateCouponRequestSchema, req.body);

      const updateData: any = {};
      if (data.discount_value !== undefined) updateData.discountValue = new Prisma.Decimal(data.discount_value);
      if (data.max_uses !== undefined) updateData.maxUses = data.max_uses;
      if (data.max_uses_per_user !== undefined) updateData.maxUsesPerUser = data.max_uses_per_user;
      if (data.min_purchase_amount !== undefined)
        updateData.minPurchaseAmount = data.min_purchase_amount ? new Prisma.Decimal(data.min_purchase_amount) : null;
      if (data.valid_from) updateData.validFrom = new Date(data.valid_from);
      if (data.valid_until) updateData.validUntil = new Date(data.valid_until);
      if (data.is_active !== undefined) updateData.isActive = data.is_active;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.internal_notes !== undefined) updateData.internalNotes = data.internal_notes;

      const coupon = await this.prisma.coupon.update({
        where: { id },
        data: updateData,
        include: {
          usageLimits: true,
          campaign: true,
        },
      });

      // Return full object like getSingleCoupon
      res.json({
        id: coupon.id,
        code: coupon.code,
        type: coupon.couponType,
        discount_percentage: coupon.couponType === 'percentage' ? parseFloat(coupon.discountValue.toString()) : undefined,
        discount_amount: coupon.couponType === 'fixed_amount' ? parseFloat(coupon.discountValue.toString()) : undefined,
        bonus_duration_months: coupon.couponType === 'duration_bonus' ? parseInt(coupon.discountValue.toString()) : undefined,
        max_discount_applications: coupon.maxUses || null,
        redemption_count: coupon.usageLimits?.totalUses || 0,
        total_discount_value: parseFloat(coupon.usageLimits?.totalDiscountAppliedUsd.toString() || '0'),
        valid_from: coupon.validFrom.toISOString(),
        valid_until: coupon.validUntil.toISOString(),
        is_active: coupon.isActive,
        description: coupon.description,
        campaign_id: coupon.campaignId,
        campaign_name: (coupon as any).campaign?.campaignName || null,
        created_at: coupon.createdAt.toISOString(),
        updated_at: coupon.updatedAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to update coupon', { id, error });
      res.status(400).json({
        error: {
          code: 'update_failed',
          message: error.message || 'Failed to update coupon',
        },
      });
    }
  }

  /**
   * DELETE /admin/coupons/:id
   * Delete a coupon (admin only)
   */
  async deleteCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      await this.prisma.coupon.delete({ where: { id } });

      res.status(204).send();
    } catch (error: any) {
      logger.error('Failed to delete coupon', { id, error });
      res.status(400).json({
        error: {
          code: 'deletion_failed',
          message: error.message || 'Failed to delete coupon',
        },
      });
    }
  }

  /**
   * GET /admin/coupons/:id
   * Get a single coupon by ID (admin only)
   */
  async getSingleCoupon(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const coupon = await this.prisma.coupon.findUnique({
        where: { id },
        include: {
          usageLimits: true,
          campaign: true,
        },
      });

      if (!coupon) {
        res.status(404).json({
          error: {
            code: 'coupon_not_found',
            message: 'Coupon not found',
          },
        });
        return;
      }

      // Map to shared Coupon type using mapper
      const mappedCoupon = mapCouponToApiType(coupon);
      res.json(mappedCoupon);
    } catch (error: any) {
      logger.error('Failed to get coupon', { id, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve coupon',
        },
      });
    }
  }

  /**
   * GET /admin/coupons
   * List all coupons (admin only)
   *
   * Query params:
   * - page: number (default: 0)
   * - limit: number (default: 50)
   * - status: string (optional filter)
   * - type: string (optional filter)
   */
  async listCoupons(req: Request, res: Response): Promise<void> {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Cap at 100

      // Build filter conditions
      const where: any = {};
      if (req.query.status) {
        where.isActive = req.query.status === 'active';
      }
      if (req.query.type) {
        where.couponType = req.query.type;
      }

      // Fetch coupons with pagination
      const [coupons, total] = await Promise.all([
        this.prisma.coupon.findMany({
          where,
          skip: page * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            usageLimits: true,
            campaign: true,
          },
        }),
        this.prisma.coupon.count({ where }),
      ]);

      // Map to shared Coupon type using mapper
      const mappedCoupons = coupons.map((c) => mapCouponToApiType(c));

      // Send modern paginated response
      sendPaginatedResponse(res, mappedCoupons, total, page, limit);
    } catch (error: any) {
      logger.error('Failed to list coupons', { error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve coupons',
        },
      });
    }
  }

  /**
   * GET /admin/coupons/:id/redemptions
   * Get redemption history (admin only)
   *
   * Query params:
   * - page: number (default: 0)
   * - limit: number (default: 50)
   */
  async getCouponRedemptions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Fetch redemptions with pagination
      const [redemptions, total, stats] = await Promise.all([
        this.prisma.couponRedemption.findMany({
          where: { couponId: id },
          skip: page * limit,
          take: limit,
          orderBy: { redemptionDate: 'desc' },
        }),
        this.prisma.couponRedemption.count({ where: { couponId: id } }),
        this.redemptionService.getRedemptionStats(id),
      ]);

      // Map redemptions to response format
      const mappedRedemptions = redemptions.map((r) => ({
        id: r.id,
        user_id: r.userId,
        discount_applied: parseFloat(r.discountAppliedUsd.toString()),
        status: r.redemptionStatus,
        redeemed_at: r.redemptionDate.toISOString(),
        ip_address: r.ipAddress,
      }));

      // Send modern response with stats in data object
      res.json(successResponse({
        redemptions: mappedRedemptions,
        stats
      }, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit + redemptions.length < total
      }));
    } catch (error: any) {
      logger.error('Failed to get coupon redemptions', { id, error });
      res.status(500).json({
        error: {
          code: 'internal_server_error',
          message: 'Failed to retrieve redemptions',
        },
      });
    }
  }
}
