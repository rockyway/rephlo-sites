/**
 * Plan 111 API Client - Coupon & Discount Code System
 *
 * API client for coupon validation, redemption, campaign management, and fraud detection.
 *
 * Reference:
 * - docs/plan/111-coupon-discount-code-system.md
 * - backend/src/routes/plan111.routes.ts
 */

import { apiClient } from '@/services/api';
import type {
  // Import shared coupon types
  Coupon,
  CouponCampaign,
  CouponRedemption,
  FraudDetectionEvent,
  CouponListResponse,
  CampaignListResponse,
  RedemptionListResponse,
  FraudEventListResponse,
  CouponAnalyticsMetrics,
  TopPerformingCoupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '@rephlo/shared-types';
import type {
  // Keep plan111-specific types that don't exist in shared-types
  CouponValidationRequest,
  CouponValidationResult,
  CouponRedemptionRequest,
  CampaignPerformanceMetrics,
  RedemptionTrend,
  RedemptionByType,
  CouponFilters,
  CampaignFilters,
  FraudEventFilters,
} from '@/types/plan111.types';

// Type aliases for compatibility with existing code
type CouponCreateRequest = CreateCouponRequest;
type CouponUpdateRequest = UpdateCouponRequest;
type CampaignCreateRequest = CreateCampaignRequest;
type CampaignUpdateRequest = UpdateCampaignRequest;

/**
 * Plan 111 API Client
 */
export const plan111API = {
  // ===== Public Coupon Routes =====

  /**
   * Validate a coupon code
   * @param request - Coupon validation request
   */
  validateCoupon: async (
    request: CouponValidationRequest
  ): Promise<CouponValidationResult> => {
    const response = await apiClient.post<CouponValidationResult>(
      '/api/coupons/validate',
      request
    );
    return response.data;
  },

  /**
   * Redeem a coupon
   * @param request - Coupon redemption request
   */
  redeemCoupon: async (
    request: CouponRedemptionRequest
  ): Promise<CouponRedemption> => {
    const response = await apiClient.post<{ status: string; data: CouponRedemption }>(
      '/api/coupons/redeem',
      request
    );
    return response.data.data;
  },

  /**
   * Get user's redeemed coupons
   * @param userId - User ID
   */
  getUserCoupons: async (userId: string): Promise<CouponRedemption[]> => {
    const response = await apiClient.get<CouponRedemption[]>(
      `/api/users/${userId}/coupons`
    );
    return response.data;
  },

  // ===== Admin Coupon Routes =====

  /**
   * Create a new coupon
   * @param data - Coupon creation data
   */
  createCoupon: async (data: CouponCreateRequest): Promise<Coupon> => {
    const response = await apiClient.post<Coupon>('/admin/coupons', data);
    return response.data;
  },

  /**
   * Update a coupon
   * @param id - Coupon ID
   * @param data - Coupon update data
   */
  updateCoupon: async (
    id: string,
    data: CouponUpdateRequest
  ): Promise<Coupon> => {
    const response = await apiClient.patch<Coupon>(
      `/admin/coupons/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a coupon
   * @param id - Coupon ID
   */
  deleteCoupon: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/coupons/${id}`);
  },

  /**
   * List all coupons with filters
   * @param filters - Filter options
   * @param page - Page number (0-indexed)
   * @param limit - Number of items per page
   */
  listCoupons: async (
    filters?: CouponFilters,
    page = 0,
    limit = 50
  ): Promise<CouponListResponse> => {
    const params = {
      ...filters,
      page,
      limit,
    };
    const response = await apiClient.get<CouponListResponse>(
      '/admin/coupons',
      { params }
    );
    return response.data;
  },

  /**
   * Get redemptions for a specific coupon
   * @param id - Coupon ID
   * @param page - Page number
   * @param limit - Items per page
   */
  getCouponRedemptions: async (
    id: string,
    page = 0,
    limit = 50
  ): Promise<RedemptionListResponse> => {
    const params = { page, limit };
    const response = await apiClient.get<RedemptionListResponse>(
      `/admin/coupons/${id}/redemptions`,
      { params }
    );
    return response.data;
  },

  // ===== Admin Campaign Routes =====

  /**
   * Create a new campaign
   * @param data - Campaign creation data
   */
  createCampaign: async (
    data: CampaignCreateRequest
  ): Promise<CouponCampaign> => {
    const response = await apiClient.post<CouponCampaign>(
      '/admin/campaigns',
      data
    );
    return response.data;
  },

  /**
   * Update a campaign
   * @param id - Campaign ID
   * @param data - Campaign update data
   */
  updateCampaign: async (
    id: string,
    data: CampaignUpdateRequest
  ): Promise<CouponCampaign> => {
    const response = await apiClient.patch<CouponCampaign>(
      `/admin/campaigns/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a campaign
   * @param id - Campaign ID
   */
  deleteCampaign: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/campaigns/${id}`);
  },

  /**
   * List all campaigns with filters
   * @param filters - Filter options
   * @param page - Page number (0-indexed)
   * @param limit - Number of items per page
   */
  listCampaigns: async (
    filters?: CampaignFilters,
    page = 0,
    limit = 50
  ): Promise<CampaignListResponse> => {
    const params = {
      ...filters,
      page,
      limit,
    };
    const response = await apiClient.get<CampaignListResponse>(
      '/admin/campaigns',
      { params }
    );
    return response.data;
  },

  /**
   * Get campaign performance metrics
   * @param id - Campaign ID
   */
  getCampaignPerformance: async (
    id: string
  ): Promise<CampaignPerformanceMetrics> => {
    const response = await apiClient.get<CampaignPerformanceMetrics>(
      `/admin/campaigns/${id}/performance`
    );
    return response.data;
  },

  /**
   * Assign a coupon to a campaign
   * @param campaignId - Campaign ID
   * @param couponId - Coupon ID
   */
  assignCouponToCampaign: async (
    campaignId: string,
    couponId: string
  ): Promise<void> => {
    await apiClient.post(`/admin/campaigns/${campaignId}/assign-coupon`, {
      couponId,
    });
  },

  /**
   * Remove a coupon from a campaign
   * @param campaignId - Campaign ID
   * @param couponId - Coupon ID
   */
  removeCouponFromCampaign: async (
    campaignId: string,
    couponId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/admin/campaigns/${campaignId}/remove-coupon/${couponId}`
    );
  },

  // ===== Admin Fraud Detection Routes =====

  /**
   * List fraud detection events with filters
   * @param filters - Filter options
   * @param page - Page number (0-indexed)
   * @param limit - Number of items per page
   */
  listFraudEvents: async (
    filters?: FraudEventFilters,
    page = 0,
    limit = 50
  ): Promise<FraudEventListResponse> => {
    const params = {
      ...filters,
      page,
      limit,
    };
    const response = await apiClient.get<FraudEventListResponse>(
      '/admin/fraud-detection',
      { params }
    );
    return response.data;
  },

  /**
   * Review and resolve a fraud detection event
   * @param id - Fraud event ID
   * @param resolution - Resolution status
   * @param notes - Resolution notes
   */
  reviewFraudEvent: async (
    id: string,
    resolution: string,
    notes?: string
  ): Promise<FraudDetectionEvent> => {
    const response = await apiClient.patch<{ status: string; data: FraudDetectionEvent }>(
      `/admin/fraud-detection/${id}/review`,
      { resolution, notes }
    );
    return response.data.data;
  },

  /**
   * Get pending fraud detection events
   */
  getPendingFraudEvents: async (): Promise<FraudEventListResponse> => {
    const response = await apiClient.get<FraudEventListResponse>(
      '/admin/fraud-detection/pending'
    );
    return response.data;
  },

  // ===== Admin Analytics Routes =====

  /**
   * Get coupon analytics dashboard metrics
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   */
  getCouponAnalytics: async (
    startDate?: string,
    endDate?: string
  ): Promise<CouponAnalyticsMetrics> => {
    const params = {
      startDate,
      endDate,
    };
    const response = await apiClient.get<CouponAnalyticsMetrics>(
      '/admin/analytics/coupons',
      { params }
    );
    return response.data;
  },

  /**
   * Get redemption trend over time
   * @param startDate - Start date
   * @param endDate - End date
   */
  getRedemptionTrend: async (
    startDate: string,
    endDate: string
  ): Promise<RedemptionTrend[]> => {
    const params = { startDate, endDate };
    const response = await apiClient.get<RedemptionTrend[]>(
      '/admin/analytics/coupons/trend',
      { params }
    );
    return response.data;
  },

  /**
   * Get top performing coupons
   * @param limit - Number of top coupons to return
   */
  getTopPerformingCoupons: async (
    limit = 10
  ): Promise<TopPerformingCoupon[]> => {
    const params = { limit };
    const response = await apiClient.get<TopPerformingCoupon[]>(
      '/admin/analytics/coupons/top',
      { params }
    );
    return response.data;
  },

  /**
   * Get redemptions by coupon type
   */
  getRedemptionsByType: async (): Promise<RedemptionByType[]> => {
    const response = await apiClient.get<RedemptionByType[]>(
      '/admin/analytics/coupons/by-type'
    );
    return response.data;
  },
};

/**
 * Export default for convenience
 */
export default plan111API;
