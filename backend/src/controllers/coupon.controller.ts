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
import { randomUUID } from 'crypto';
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
import { mapCouponToApiType } from '../utils/typeMappers';

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
    const userId = (req as any).user_id;

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
    const userId = (req as any).user_id;

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

      // Standard response format: flat data
      res.json({
        status: 'success',
        data: {
          redemptionId: redemption.id,
          discountApplied: parseFloat(redemption.discount_applied_usd.toString()),
          finalAmount: parseFloat(redemption.finalAmountUsd.toString()),
          redemptionStatus: redemption.redemption_status,
        }
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
    const requestingUserId = (req as any).user_id;

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
          discount_applied: parseFloat(r.discount_applied_usd.toString()),
          status: r.redemption_status,
          redeemed_at: r.redemption_date.toISOString(),
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
    const adminUserId = (req as any).user_id;

    try {
      const data = safeValidateRequest(createCouponRequestSchema, req.body);

      const coupon = await this.prisma.coupon.create({
        data: {
          id: randomUUID(),
          code: data.code.toUpperCase(),
          coupon_type: data.type,
          discount_value: new Prisma.Decimal(data.discountValue),
          discount_type: data.discountType,
          currency: 'usd',
          max_uses: data.maxUses,
          max_uses_per_user: data.maxUsesPerUser || 1,
          min_purchase_amount: data.minPurchaseAmount ? new Prisma.Decimal(data.minPurchaseAmount) : null,
          tier_eligibility: data.tierEligibility || ['free', 'pro', 'enterprise'],
          billing_cycles: data.billingCycles || ['monthly', 'annual'],
          valid_from: new Date(data.validFrom),
          valid_until: new Date(data.validUntil),
          is_active: data.isActive ?? true,
          campaign_id: data.campaignId || null,
          description: data.description || null,
          internal_notes: data.internalNotes || null,
          created_by: adminUserId,
          updated_at: new Date(),
        },
        include: {
          coupon_usage_limit: true,
          coupon_campaign: {
            select: {
              campaign_name: true,
            },
          },
        },
      });

      // Create usage limits record
      await this.prisma.coupon_usage_limit.create({
        data: {
          id: randomUUID(),
          coupon_id: coupon.id,
          total_uses: 0,
          unique_users: 0,
          total_discount_applied_usd: 0,
          updated_at: new Date(),
        },
      });

      // Refetch coupon with usageLimits to use mapper
      const createdCoupon = await this.prisma.coupon.findUnique({
        where: { id: coupon.id },
        include: {
          coupon_usage_limit: true,
          coupon_campaign: {
            select: {
              campaign_name: true,
            },
          },
        },
      });

      // Use mapper for consistent camelCase response
      res.status(201).json(mapCouponToApiType(createdCoupon!));
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
      if (data.code !== undefined) updateData.code = data.code.toUpperCase();
      if (data.type !== undefined) updateData.couponType = data.type;
      if (data.discountValue !== undefined) updateData.discountValue = new Prisma.Decimal(data.discountValue);
      if (data.discountType !== undefined) updateData.discountType = data.discountType;
      if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
      if (data.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = data.maxUsesPerUser;
      if (data.minPurchaseAmount !== undefined)
        updateData.minPurchaseAmount = data.minPurchaseAmount ? new Prisma.Decimal(data.minPurchaseAmount) : null;
      if (data.tierEligibility !== undefined) updateData.tierEligibility = data.tierEligibility;
      if (data.billingCycles !== undefined) updateData.billingCycles = data.billingCycles;
      if (data.validFrom) updateData.validFrom = new Date(data.validFrom);
      if (data.validUntil) updateData.validUntil = new Date(data.validUntil);
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;

      const coupon = await this.prisma.coupon.update({
        where: { id },
        data: updateData,
        include: {
          coupon_usage_limit: true,
          coupon_campaign: {
            select: {
              campaign_name: true,
            },
          },
        },
      });

      // Use mapper for consistent camelCase response
      res.json(mapCouponToApiType(coupon));
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
          coupon_usage_limit: true,
          coupon_campaign: true,
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
          orderBy: { created_at: 'desc' },
          include: {
            coupon_usage_limit: true,
            coupon_campaign: true,
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
        this.prisma.coupon_redemption.findMany({
          where: { coupon_id: id },
          skip: page * limit,
          take: limit,
          orderBy: { redemption_date: 'desc' },
        }),
        this.prisma.coupon_redemption.count({ where: { coupon_id: id } }),
        this.redemptionService.getRedemptionStats(id),
      ]);

      // Map redemptions to response format
      const mappedRedemptions = redemptions.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        discount_applied: parseFloat(r.discount_applied_usd.toString()),
        status: r.redemption_status,
        redeemed_at: r.redemption_date.toISOString(),
        ip_address: r.ip_address,
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
