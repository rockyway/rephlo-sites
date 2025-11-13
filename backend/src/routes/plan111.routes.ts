/**
 * Plan 111 Routes - Coupon & Discount Code System
 *
 * API routes for coupon validation, redemption, campaign management, and fraud detection.
 *
 * Public Routes:
 * - POST /api/coupons/validate
 * - POST /api/coupons/redeem
 * - GET  /api/users/:userId/coupons
 *
 * Admin Routes:
 * - POST   /admin/coupons
 * - PATCH  /admin/coupons/:id
 * - DELETE /admin/coupons/:id
 * - GET    /admin/coupons
 * - GET    /admin/coupons/:id/redemptions
 * - POST   /admin/campaigns
 * - PATCH  /admin/campaigns/:id
 * - DELETE /admin/campaigns/:id
 * - GET    /admin/campaigns
 * - GET    /admin/campaigns/:id/performance
 * - POST   /admin/campaigns/:id/assign-coupon
 * - DELETE /admin/campaigns/:id/remove-coupon/:couponId
 * - GET    /admin/fraud-detection
 * - PATCH  /admin/fraud-detection/:id/review
 * - GET    /admin/fraud-detection/pending
 *
 * Reference: docs/plan/111-coupon-discount-code-system.md
 */

import { Router } from 'express';
import { container } from '../container';
import { CouponController } from '../controllers/coupon.controller';
import { CampaignController } from '../controllers/campaign.controller';
import { FraudDetectionController } from '../controllers/fraud-detection.controller';
import { CouponAnalyticsController } from '../controllers/coupon-analytics.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

export function createPlan111Router(): Router {
  const router = Router();

  // Resolve controllers from DI container
  const couponController = container.resolve(CouponController);
  const campaignController = container.resolve(CampaignController);
  const fraudController = container.resolve(FraudDetectionController);
  const analyticsController = container.resolve(CouponAnalyticsController);

  // ===== Public Coupon Routes (/api/coupons) =====

  /**
   * POST /api/coupons/validate
   * Validate a coupon code (public - no auth required)
   */
  router.post(
    '/api/coupons/validate',
    asyncHandler(async (req, res) => couponController.validateCoupon(req, res))
  );

  /**
   * POST /api/coupons/redeem
   * Redeem a coupon (requires authentication)
   */
  router.post(
    '/api/coupons/redeem',
    authMiddleware,
    asyncHandler(async (req, res) => couponController.redeemCoupon(req, res))
  );

  /**
   * GET /api/users/:userId/coupons
   * Get user's redeemed coupons (requires authentication)
   */
  router.get(
    '/api/users/:userId/coupons',
    authMiddleware,
    asyncHandler(async (req, res) => couponController.getUserCoupons(req, res))
  );

  // ===== Admin Coupon Routes (/admin/coupons) =====

  /**
   * POST /admin/coupons
   * Create a new coupon (admin only)
   */
  router.post(
    '/admin/coupons',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'create', resourceType: 'coupon', captureRequestBody: true }),
    asyncHandler(async (req, res) => couponController.createCoupon(req, res))
  );

  /**
   * PATCH /admin/coupons/:id
   * Update a coupon (admin only)
   */
  router.patch(
    '/admin/coupons/:id',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'update', resourceType: 'coupon', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(async (req, res) => couponController.updateCoupon(req, res))
  );

  /**
   * DELETE /admin/coupons/:id
   * Delete a coupon (admin only)
   */
  router.delete(
    '/admin/coupons/:id',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'delete', resourceType: 'coupon', capturePreviousValue: true }),
    asyncHandler(async (req, res) => couponController.deleteCoupon(req, res))
  );

  /**
   * GET /admin/coupons
   * List all coupons (admin only)
   */
  router.get(
    '/admin/coupons',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => couponController.listCoupons(req, res))
  );

  /**
   * GET /admin/coupons/:id
   * Get a single coupon by ID (admin only)
   */
  router.get(
    '/admin/coupons/:id',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => couponController.getSingleCoupon(req, res))
  );

  /**
   * GET /admin/coupons/:id/redemptions
   * Get redemption history for a coupon (admin only)
   */
  router.get(
    '/admin/coupons/:id/redemptions',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => couponController.getCouponRedemptions(req, res))
  );

  // ===== Admin Campaign Routes (/admin/campaigns) =====

  /**
   * POST /admin/campaigns
   * Create a new campaign (admin only)
   */
  router.post(
    '/admin/campaigns',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'create', resourceType: 'campaign', captureRequestBody: true }),
    asyncHandler(async (req, res) => campaignController.createCampaign(req, res))
  );

  /**
   * PATCH /admin/campaigns/:id
   * Update a campaign (admin only)
   */
  router.patch(
    '/admin/campaigns/:id',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'update', resourceType: 'campaign', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(async (req, res) => campaignController.updateCampaign(req, res))
  );

  /**
   * DELETE /admin/campaigns/:id
   * Delete a campaign (admin only)
   */
  router.delete(
    '/admin/campaigns/:id',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'delete', resourceType: 'campaign', capturePreviousValue: true }),
    asyncHandler(async (req, res) => campaignController.deleteCampaign(req, res))
  );

  /**
   * GET /admin/campaigns
   * List all campaigns (admin only)
   */
  router.get(
    '/admin/campaigns',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => campaignController.listCampaigns(req, res))
  );

  /**
   * GET /admin/campaigns/:id
   * Get a single campaign by ID (admin only)
   */
  router.get(
    '/admin/campaigns/:id',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => campaignController.getSingleCampaign(req, res))
  );

  /**
   * GET /admin/campaigns/:id/performance
   * Get campaign performance metrics (admin only)
   */
  router.get(
    '/admin/campaigns/:id/performance',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => campaignController.getCampaignPerformance(req, res))
  );

  /**
   * POST /admin/campaigns/:id/assign-coupon
   * Assign a coupon to a campaign (admin only)
   */
  router.post(
    '/admin/campaigns/:id/assign-coupon',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'update', resourceType: 'campaign', captureRequestBody: true }),
    asyncHandler(async (req, res) => campaignController.assignCoupon(req, res))
  );

  /**
   * DELETE /admin/campaigns/:id/remove-coupon/:couponId
   * Remove a coupon from a campaign (admin only)
   */
  router.delete(
    '/admin/campaigns/:id/remove-coupon/:couponId',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'update', resourceType: 'campaign', capturePreviousValue: true }),
    asyncHandler(async (req, res) => campaignController.removeCoupon(req, res))
  );

  // ===== Admin Fraud Detection Routes (/admin/fraud-detection) =====

  /**
   * GET /admin/fraud-detection
   * List all fraud detection events (admin only)
   */
  router.get(
    '/admin/fraud-detection',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => fraudController.listFraudEvents(req, res))
  );

  /**
   * PATCH /admin/fraud-detection/:id/review
   * Review and resolve a fraud detection event (admin only)
   */
  router.patch(
    '/admin/fraud-detection/:id/review',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'update', resourceType: 'fraud_detection', captureRequestBody: true, capturePreviousValue: true }),
    asyncHandler(async (req, res) => fraudController.reviewFraudEvent(req, res))
  );

  /**
   * GET /admin/fraud-detection/pending
   * Get pending fraud detection events (admin only)
   */
  router.get(
    '/admin/fraud-detection/pending',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => fraudController.getPendingReviews(req, res))
  );

  // ===== Admin Analytics Routes (/admin/analytics/coupons) =====

  /**
   * GET /admin/analytics/coupons
   * Get overall coupon analytics metrics (admin only)
   *
   * Query parameters:
   * - startDate: ISO date string (optional)
   * - endDate: ISO date string (optional)
   */
  router.get(
    '/admin/analytics/coupons',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'read', resourceType: 'analytics' }),
    asyncHandler(async (req, res) => analyticsController.getAnalyticsMetrics(req, res))
  );

  /**
   * GET /admin/analytics/coupons/trend
   * Get redemption trend over time (admin only)
   *
   * Query parameters:
   * - startDate: ISO date string (required)
   * - endDate: ISO date string (required)
   */
  router.get(
    '/admin/analytics/coupons/trend',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'read', resourceType: 'analytics' }),
    asyncHandler(async (req, res) => analyticsController.getRedemptionTrend(req, res))
  );

  /**
   * GET /admin/analytics/coupons/top
   * Get top performing coupons (admin only)
   *
   * Query parameters:
   * - limit: number (optional, default 10)
   */
  router.get(
    '/admin/analytics/coupons/top',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'read', resourceType: 'analytics' }),
    asyncHandler(async (req, res) => analyticsController.getTopPerformingCoupons(req, res))
  );

  /**
   * GET /admin/analytics/coupons/by-type
   * Get redemptions grouped by coupon type (admin only)
   */
  router.get(
    '/admin/analytics/coupons/by-type',
    authMiddleware,
    requireAdmin,
    auditLog({ action: 'read', resourceType: 'analytics' }),
    asyncHandler(async (req, res) => analyticsController.getRedemptionsByType(req, res))
  );

  return router;
}
