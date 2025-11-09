/**
 * Plan 110: Perpetual Licensing & Proration API Client
 *
 * Centralized API client for all Plan 110 endpoints:
 * - Perpetual license management
 * - Version upgrades
 * - Proration operations
 * - Migration operations
 *
 * Reference: backend/src/routes/plan110.routes.ts
 */

import { apiClient } from '@/services/api';
import type {
  PerpetualLicense,
  LicenseActivation,
  VersionUpgrade,
  ProrationEvent,
  LicenseStats,
  ProrationStats,
  ProrationPreview,
  ProrationCalculationBreakdown,
  MigrationEligibility,
  MigrationHistory,
  LicenseFilters,
  ProrationFilters,
  SuspendLicenseRequest,
  RevokeLicenseRequest,
  ReverseProrationRequest,
  ProrationPreviewRequest,
  UpgradeWithProrationRequest,
  DowngradeWithProrationRequest,
  PurchaseLicenseRequest,
  ActivateDeviceRequest,
  ReplaceDeviceRequest,
  UpgradeConversionMetrics,
  ProrationRevenueBreakdown,
  TierChangePath,
  ProrationRevenueTimeSeries,
  UpgradeDistribution,
  PaginatedResponse,
} from '@/types/plan110.types';

// ============================================================================
// License Management API
// ============================================================================

export const licenseApi = {
  /**
   * Get all perpetual licenses (admin only)
   */
  getAllLicenses: async (filters?: LicenseFilters) => {
    const response = await apiClient.get<PaginatedResponse<PerpetualLicense>>(
      '/admin/licenses',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get license statistics (admin only)
   */
  getStats: async () => {
    const response = await apiClient.get<LicenseStats>(
      '/admin/licenses/stats'
    );
    return response.data;
  },

  /**
   * Get license details
   */
  getLicenseDetails: async (licenseKey: string) => {
    const response = await apiClient.get<PerpetualLicense>(
      `/api/licenses/${licenseKey}`
    );
    return response.data;
  },

  /**
   * Purchase a new perpetual license
   */
  purchaseLicense: async (data: PurchaseLicenseRequest) => {
    const response = await apiClient.post<PerpetualLicense>(
      '/api/licenses/purchase',
      data
    );
    return response.data;
  },

  /**
   * Suspend a license (admin only)
   */
  suspendLicense: async (licenseId: string, data: SuspendLicenseRequest) => {
    const response = await apiClient.post<PerpetualLicense>(
      `/admin/licenses/${licenseId}/suspend`,
      data
    );
    return response.data;
  },

  /**
   * Revoke a license (admin only)
   */
  revokeLicense: async (licenseId: string, data: RevokeLicenseRequest) => {
    const response = await apiClient.post<PerpetualLicense>(
      `/admin/licenses/${licenseId}/revoke`,
      data
    );
    return response.data;
  },

  /**
   * Reactivate a suspended license (admin only)
   */
  reactivateLicense: async (licenseId: string) => {
    const response = await apiClient.post<PerpetualLicense>(
      `/admin/licenses/${licenseId}/reactivate`
    );
    return response.data;
  },
};

// ============================================================================
// Device Activation API
// ============================================================================

export const activationApi = {
  /**
   * Get active devices for a license
   */
  getActiveDevices: async (licenseKey: string) => {
    const response = await apiClient.get<{ activations: LicenseActivation[] }>(
      `/api/licenses/${licenseKey}/devices`
    );
    return response.data;
  },

  /**
   * Activate a device
   */
  activateDevice: async (data: ActivateDeviceRequest) => {
    const response = await apiClient.post<LicenseActivation>(
      '/api/licenses/activate',
      data
    );
    return response.data;
  },

  /**
   * Deactivate a device
   */
  deactivateDevice: async (activationId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/licenses/activations/${activationId}`
    );
    return response.data;
  },

  /**
   * Replace a device
   */
  replaceDevice: async (activationId: string, data: ReplaceDeviceRequest) => {
    const response = await apiClient.patch<LicenseActivation>(
      `/api/licenses/activations/${activationId}/replace`,
      data
    );
    return response.data;
  },
};

// ============================================================================
// Version Upgrade API
// ============================================================================

export const upgradeApi = {
  /**
   * Get available upgrades for a license
   */
  getAvailableUpgrades: async (licenseKey: string) => {
    const response = await apiClient.get<{ upgrades: VersionUpgrade[] }>(
      `/api/licenses/${licenseKey}/available-upgrades`
    );
    return response.data;
  },

  /**
   * Get upgrade history for a license
   */
  getUpgradeHistory: async (licenseKey: string) => {
    const response = await apiClient.get<{ history: VersionUpgrade[] }>(
      `/api/licenses/${licenseKey}/upgrade-history`
    );
    return response.data;
  },

  /**
   * Check version eligibility
   */
  checkVersionEligibility: async (licenseKey: string, version: string) => {
    const response = await apiClient.get<{ eligible: boolean; reason?: string }>(
      `/api/licenses/${licenseKey}/version-eligibility/${version}`
    );
    return response.data;
  },

  /**
   * Purchase a version upgrade
   */
  purchaseUpgrade: async (licenseKey: string, targetVersion: string) => {
    const response = await apiClient.post<VersionUpgrade>(
      `/api/licenses/${licenseKey}/upgrade`,
      { targetVersion }
    );
    return response.data;
  },

  /**
   * Get upgrade conversion metrics (admin only)
   */
  getUpgradeConversion: async () => {
    const response = await apiClient.get<UpgradeConversionMetrics>(
      '/admin/analytics/upgrade-conversion'
    );
    return response.data;
  },
};

// ============================================================================
// Proration API
// ============================================================================

export const prorationApi = {
  /**
   * Get all proration events (admin only)
   */
  getAllProrations: async (filters?: ProrationFilters) => {
    const response = await apiClient.get<PaginatedResponse<ProrationEvent>>(
      '/admin/prorations',
      { params: filters }
    );
    return response.data;
  },

  /**
   * Get proration statistics (admin only)
   */
  getStats: async () => {
    const response = await apiClient.get<ProrationStats>(
      '/admin/prorations/stats'
    );
    return response.data;
  },

  /**
   * Get proration history for a subscription
   */
  getProrationHistory: async (subscriptionId: string) => {
    const response = await apiClient.get<{ history: ProrationEvent[] }>(
      `/api/subscriptions/${subscriptionId}/proration-history`
    );
    return response.data;
  },

  /**
   * Preview proration calculation
   */
  previewProration: async (subscriptionId: string, data: ProrationPreviewRequest) => {
    const response = await apiClient.post<ProrationPreview>(
      `/api/subscriptions/${subscriptionId}/proration-preview`,
      data
    );
    return response.data;
  },

  /**
   * Apply tier upgrade with proration
   */
  upgradeWithProration: async (subscriptionId: string, data: UpgradeWithProrationRequest) => {
    const response = await apiClient.post<ProrationEvent>(
      `/api/subscriptions/${subscriptionId}/upgrade-with-proration`,
      data
    );
    return response.data;
  },

  /**
   * Apply tier downgrade with proration
   */
  downgradeWithProration: async (subscriptionId: string, data: DowngradeWithProrationRequest) => {
    const response = await apiClient.post<ProrationEvent>(
      `/api/subscriptions/${subscriptionId}/downgrade-with-proration`,
      data
    );
    return response.data;
  },

  /**
   * Reverse a proration (admin only)
   */
  reverseProration: async (prorationId: string, data: ReverseProrationRequest) => {
    const response = await apiClient.post<ProrationEvent>(
      `/admin/prorations/${prorationId}/reverse`,
      data
    );
    return response.data;
  },

  /**
   * Get proration calculation breakdown
   */
  getCalculationBreakdown: async (prorationId: string) => {
    const response = await apiClient.get<ProrationCalculationBreakdown>(
      `/admin/prorations/${prorationId}/calculation`
    );
    return response.data;
  },
};

// ============================================================================
// Migration API
// ============================================================================

export const migrationApi = {
  /**
   * Check migration eligibility
   */
  checkEligibility: async () => {
    const response = await apiClient.get<MigrationEligibility>(
      '/api/migrations/eligibility'
    );
    return response.data;
  },

  /**
   * Get migration history
   */
  getHistory: async () => {
    const response = await apiClient.get<{ history: MigrationHistory[] }>(
      '/api/migrations/history'
    );
    return response.data;
  },

  /**
   * Get trade-in value for a license
   */
  getTradeInValue: async (licenseId: string) => {
    const response = await apiClient.get<{ tradeInValue: number }>(
      `/api/migrations/trade-in-value/${licenseId}`
    );
    return response.data;
  },

  /**
   * Migrate from perpetual to subscription
   */
  migratePerpetualToSubscription: async (licenseId: string, targetTier: string) => {
    const response = await apiClient.post<MigrationHistory>(
      '/api/migrations/perpetual-to-subscription',
      { licenseId, targetTier }
    );
    return response.data;
  },

  /**
   * Migrate from subscription to perpetual
   */
  migrateSubscriptionToPerpetual: async (subscriptionId: string) => {
    const response = await apiClient.post<MigrationHistory>(
      '/api/migrations/subscription-to-perpetual',
      { subscriptionId }
    );
    return response.data;
  },
};

// ============================================================================
// Analytics API
// ============================================================================

export const plan110AnalyticsApi = {
  /**
   * Get proration revenue breakdown
   */
  getProrationRevenue: async (startDate?: string, endDate?: string) => {
    const response = await apiClient.get<ProrationRevenueBreakdown>(
      '/admin/analytics/proration-revenue',
      { params: { startDate, endDate } }
    );
    return response.data;
  },

  /**
   * Get proration revenue time series
   */
  getProrationTimeSeries: async (period = 'last_12_months') => {
    const response = await apiClient.get<{ timeSeries: ProrationRevenueTimeSeries[] }>(
      '/admin/analytics/proration-time-series',
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Get upgrade vs downgrade distribution
   */
  getUpgradeDistribution: async () => {
    const response = await apiClient.get<{ distribution: UpgradeDistribution[] }>(
      '/admin/analytics/upgrade-distribution'
    );
    return response.data;
  },

  /**
   * Get top tier change paths
   */
  getTierChangePaths: async (limit = 5) => {
    const response = await apiClient.get<{ paths: TierChangePath[] }>(
      '/admin/analytics/tier-change-paths',
      { params: { limit } }
    );
    return response.data;
  },
};

// ============================================================================
// Combined Export
// ============================================================================

export const plan110Api = {
  licenses: licenseApi,
  activations: activationApi,
  upgrades: upgradeApi,
  prorations: prorationApi,
  migrations: migrationApi,
  analytics: plan110AnalyticsApi,
};

export default plan110Api;
