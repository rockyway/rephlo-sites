import type {
  TierConfig,
  TierConfigHistory,
  UpdateImpact,
  ValidationResult,
  UpdateTierCreditsRequest,
  UpdateTierPriceRequest,
  PreviewUpdateRequest,
} from '@rephlo/shared-types';

export const ITierConfigService = Symbol('ITierConfigService');

// =============================================================================
// Tier Configuration Service Interface (Plan 190)
// =============================================================================

/**
 * Tier Configuration Service Interface
 * Manages tier credit allocations, pricing, and audit trail
 *
 * Features:
 * - View and update tier configurations
 * - Preview impact before applying changes
 * - Validate business rules (upgrade-only policy)
 * - Track configuration history for audit
 * - Support for scheduled rollouts
 */
export interface ITierConfigService {
  /**
   * Get all tier configurations
   * Returns all active tier configs with current credit allocations
   *
   * @returns Promise<TierConfig[]> - All tier configurations in camelCase
   */
  getAllTierConfigs(): Promise<TierConfig[]>;

  /**
   * Get tier configuration by name
   * Returns specific tier config with all details
   *
   * @param tierName - Tier name (free, pro, pro_plus, etc.)
   * @returns Promise<TierConfig | null> - Tier configuration or null if not found
   */
  getTierConfigByName(tierName: string): Promise<TierConfig | null>;

  /**
   * Get tier configuration history
   * Returns audit trail of all changes to a tier
   *
   * @param tierName - Tier name
   * @param limit - Maximum number of history records (default: 50)
   * @returns Promise<TierConfigHistory[]> - Historical changes
   */
  getTierConfigHistory(tierName: string, limit?: number): Promise<TierConfigHistory[]>;

  /**
   * Update tier credit allocation
   * Updates monthly credit allocation with audit trail
   * Applies upgrade-only policy for existing users
   *
   * @param tierName - Tier name
   * @param request - Update request with newCredits, reason, etc.
   * @param adminUserId - Admin user ID performing the update
   * @returns Promise<TierConfig> - Updated tier configuration
   */
  updateTierCredits(
    tierName: string,
    request: UpdateTierCreditsRequest,
    adminUserId: string
  ): Promise<TierConfig>;

  /**
   * Update tier pricing
   * Updates monthly/annual pricing with audit trail
   *
   * @param tierName - Tier name
   * @param request - Update request with price changes and reason
   * @param adminUserId - Admin user ID performing the update
   * @returns Promise<TierConfig> - Updated tier configuration
   */
  updateTierPrice(
    tierName: string,
    request: UpdateTierPriceRequest,
    adminUserId: string
  ): Promise<TierConfig>;

  /**
   * Preview credit update impact
   * Calculates impact before applying (dry-run)
   * Shows affected users, cost implications
   *
   * @param tierName - Tier name
   * @param request - Preview request with proposed changes
   * @returns Promise<UpdateImpact> - Impact analysis
   */
  previewCreditUpdate(tierName: string, request: PreviewUpdateRequest): Promise<UpdateImpact>;

  /**
   * Validate tier update request
   * Checks business rules, constraints, and data integrity
   *
   * @param tierName - Tier name
   * @param request - Update request to validate
   * @returns Promise<ValidationResult> - Validation result with errors/warnings
   */
  validateTierUpdate(
    tierName: string,
    request: UpdateTierCreditsRequest | UpdateTierPriceRequest
  ): Promise<ValidationResult>;

  /**
   * Get count of active users on a tier
   * Used for impact calculations
   *
   * @param tierName - Tier name
   * @returns Promise<number> - Count of active subscriptions
   */
  countActiveUsersOnTier(tierName: string): Promise<number>;
}
