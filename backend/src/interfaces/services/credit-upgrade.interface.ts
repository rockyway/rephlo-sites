import type { UpgradeResult } from '@rephlo/shared-types';

export const ICreditUpgradeService = Symbol('ICreditUpgradeService');

// =============================================================================
// Credit Upgrade Service Interface (Plan 190)
// =============================================================================

/**
 * Credit Upgrade Service Interface
 * Processes credit upgrades for existing users when tier allocations increase
 *
 * Features:
 * - Upgrade-only policy: users never lose credits
 * - Batch processing for scheduled rollouts
 * - Eligibility checks before applying upgrades
 * - Integration with credit allocation system
 */
export interface ICreditUpgradeService {
  /**
   * Process tier credit upgrade for all eligible users
   * Applies credit increases to users on a specific tier
   *
   * @param tierName - Tier name (e.g., "pro")
   * @param oldCredits - Previous monthly credit allocation
   * @param newCredits - New monthly credit allocation
   * @param reason - Reason for upgrade (for audit trail)
   * @returns Promise<UpgradeResult> - Summary of processed upgrades
   */
  processTierCreditUpgrade(
    tierName: string,
    oldCredits: number,
    newCredits: number,
    reason: string
  ): Promise<UpgradeResult>;

  /**
   * Check if user is eligible for credit upgrade
   * User is eligible if their current allocation is less than new allocation
   *
   * @param userId - User ID
   * @param tierName - Tier name
   * @param newCredits - New monthly credit allocation
   * @returns Promise<boolean> - True if eligible for upgrade
   */
  isEligibleForUpgrade(userId: string, tierName: string, newCredits: number): Promise<boolean>;

  /**
   * Apply credit upgrade to specific user
   * Grants additional credits and updates subscription config
   *
   * @param userId - User ID
   * @param additionalCredits - Number of additional credits to grant
   * @param reason - Reason for upgrade
   * @param tierName - Tier name (for logging)
   * @returns Promise<void>
   */
  applyUpgradeToUser(
    userId: string,
    additionalCredits: number,
    reason: string,
    tierName: string
  ): Promise<void>;

  /**
   * Process pending scheduled upgrades
   * Batch processes all tiers with scheduled rollouts that are due
   *
   * @returns Promise<{ processedTiers: number; totalUpgrades: number; errors: string[] }>
   */
  processPendingUpgrades(): Promise<{
    processedTiers: number;
    totalUpgrades: number;
    errors: string[];
  }>;

  /**
   * Get upgrade eligibility summary for a tier
   * Shows how many users would be affected by an upgrade
   *
   * @param tierName - Tier name
   * @param newCredits - Proposed new credit allocation
   * @returns Promise<{ eligible: number; alreadyUpgraded: number; total: number }>
   */
  getUpgradeEligibilitySummary(
    tierName: string,
    newCredits: number
  ): Promise<{
    eligible: number;
    alreadyUpgraded: number;
    total: number;
  }>;
}
