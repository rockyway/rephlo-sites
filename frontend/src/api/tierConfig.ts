/**
 * Tier Configuration API Client (Plan 190)
 *
 * API client for tier management endpoints.
 * Handles all HTTP requests for tier configuration CRUD operations.
 *
 * Endpoints:
 * - GET    /api/admin/tier-config                      - List all tiers
 * - GET    /api/admin/tier-config/:tierName            - Get specific tier
 * - GET    /api/admin/tier-config/:tierName/history    - Get tier history
 * - POST   /api/admin/tier-config/:tierName/preview    - Preview update impact
 * - PATCH  /api/admin/tier-config/:tierName/credits    - Update tier credits
 * - PATCH  /api/admin/tier-config/:tierName/price      - Update tier pricing
 */

import { apiClient } from '@/services/api';
import type {
  TierConfig,
  TierConfigHistory,
  UpdateImpact,
  UpdateTierCreditsRequest,
  UpdateTierPriceRequest,
  PreviewUpdateRequest,
} from '@rephlo/shared-types';

// =============================================================================
// API Response Types
// =============================================================================

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

type TierConfigHistorySuccessResponse = ApiSuccessResponse<TierConfigHistory[]> & {
  meta: {
    count: number;
    limit: number;
  };
};

type TierConfigHistoryResponse = TierConfigHistorySuccessResponse | ApiErrorResponse;

// =============================================================================
// API Client Functions
// =============================================================================

/**
 * List all tier configurations
 * GET /api/admin/tier-config
 */
export async function getAllTierConfigs(): Promise<TierConfig[]> {
  const response = await apiClient.get<ApiResponse<TierConfig[]>>('/api/admin/tier-config');

  if (!response.data.success) {
    throw new Error(response.data.error.message || 'Failed to fetch tier configurations');
  }

  return response.data.data;
}

/**
 * Get specific tier configuration by name
 * GET /api/admin/tier-config/:tierName
 */
export async function getTierConfigByName(tierName: string): Promise<TierConfig> {
  const response = await apiClient.get<ApiResponse<TierConfig>>(
    `/api/admin/tier-config/${tierName}`
  );

  if (!response.data.success) {
    throw new Error(response.data.error.message || `Failed to fetch tier: ${tierName}`);
  }

  return response.data.data;
}

/**
 * Get tier configuration history
 * GET /api/admin/tier-config/:tierName/history
 */
export async function getTierConfigHistory(
  tierName: string,
  limit: number = 50
): Promise<TierConfigHistory[]> {
  const response = await apiClient.get<TierConfigHistoryResponse>(
    `/api/admin/tier-config/${tierName}/history`,
    {
      params: { limit },
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.error.message || `Failed to fetch history for tier: ${tierName}`);
  }

  return response.data.data;
}

/**
 * Preview tier update impact (dry-run)
 * POST /api/admin/tier-config/:tierName/preview
 */
export async function previewTierUpdate(
  tierName: string,
  request: PreviewUpdateRequest
): Promise<UpdateImpact> {
  const response = await apiClient.post<ApiResponse<UpdateImpact>>(
    `/api/admin/tier-config/${tierName}/preview`,
    request
  );

  if (!response.data.success) {
    throw new Error(response.data.error.message || 'Failed to preview tier update');
  }

  return response.data.data;
}

/**
 * Update tier credit allocation
 * PATCH /api/admin/tier-config/:tierName/credits
 */
export async function updateTierCredits(
  tierName: string,
  request: UpdateTierCreditsRequest
): Promise<TierConfig> {
  const response = await apiClient.patch<ApiResponse<TierConfig>>(
    `/api/admin/tier-config/${tierName}/credits`,
    request
  );

  if (!response.data.success) {
    throw new Error(response.data.error.message || 'Failed to update tier credits');
  }

  return response.data.data;
}

/**
 * Update tier pricing
 * PATCH /api/admin/tier-config/:tierName/price
 */
export async function updateTierPrice(
  tierName: string,
  request: UpdateTierPriceRequest
): Promise<TierConfig> {
  const response = await apiClient.patch<ApiResponse<TierConfig>>(
    `/api/admin/tier-config/${tierName}/price`,
    request
  );

  if (!response.data.success) {
    throw new Error(response.data.error.message || 'Failed to update tier pricing');
  }

  return response.data.data;
}

// =============================================================================
// Export All Functions
// =============================================================================

export default {
  getAllTierConfigs,
  getTierConfigByName,
  getTierConfigHistory,
  previewTierUpdate,
  updateTierCredits,
  updateTierPrice,
};
