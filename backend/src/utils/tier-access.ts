/**
 * Tier Access Control Utility
 *
 * Provides tier-based access validation for LLM models.
 * Supports three restriction modes:
 * - "minimum": User tier must be >= required tier (hierarchical)
 * - "exact": User tier must exactly match required tier
 * - "whitelist": User tier must be in allowed tiers array
 *
 * Reference: docs/plan/108-model-tier-access-control-architecture.md
 */

import { SubscriptionTier } from '@prisma/client';
import logger from './logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of tier access check
 */
export interface TierAccessResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: SubscriptionTier;
}

/**
 * Model tier access configuration
 */
export interface ModelTierConfig {
  requiredTier: SubscriptionTier;
  tierRestrictionMode: string;
  allowedTiers: SubscriptionTier[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Tier hierarchy for minimum mode
 * Higher values represent higher tiers
 */
export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

/**
 * Human-readable tier names
 */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Check if user's tier can access a model
 *
 * @param userTier - User's subscription tier
 * @param modelConfig - Model's tier configuration
 * @returns Access check result with allowed status and reason
 */
export function checkTierAccess(
  userTier: SubscriptionTier,
  modelConfig: ModelTierConfig
): TierAccessResult {
  const { requiredTier, tierRestrictionMode, allowedTiers } = modelConfig;

  logger.debug('Tier access check', {
    userTier,
    requiredTier,
    tierRestrictionMode,
    allowedTiers,
  });

  switch (tierRestrictionMode) {
    case 'minimum': {
      // User tier must be >= required tier
      const userTierLevel = TIER_HIERARCHY[userTier];
      const requiredTierLevel = TIER_HIERARCHY[requiredTier];
      const allowed = userTierLevel >= requiredTierLevel;

      return {
        allowed,
        reason: allowed
          ? undefined
          : `Requires ${TIER_DISPLAY_NAMES[requiredTier]} tier or higher`,
        requiredTier: allowed ? undefined : requiredTier,
      };
    }

    case 'exact': {
      // User tier must exactly match required tier
      const allowed = userTier === requiredTier;

      return {
        allowed,
        reason: allowed
          ? undefined
          : `Only available for ${TIER_DISPLAY_NAMES[requiredTier]} tier`,
        requiredTier: allowed ? undefined : requiredTier,
      };
    }

    case 'whitelist': {
      // User tier must be in allowed tiers list
      const allowed = allowedTiers.includes(userTier);

      return {
        allowed,
        reason: allowed
          ? undefined
          : `Available for: ${allowedTiers.map((t) => TIER_DISPLAY_NAMES[t]).join(', ')}`,
        requiredTier: allowed ? undefined : requiredTier,
      };
    }

    default: {
      logger.error('Invalid tier restriction mode', {
        tierRestrictionMode,
        modelConfig,
      });
      return {
        allowed: false,
        reason: 'Invalid tier restriction mode',
      };
    }
  }
}

/**
 * Get tier access status string for API responses
 *
 * @param allowed - Whether access is allowed
 * @returns Access status string
 */
export function getTierAccessStatus(allowed: boolean): string {
  return allowed ? 'allowed' : 'upgrade_required';
}

/**
 * Format tier names for display
 *
 * @param tiers - Array of subscription tiers
 * @returns Comma-separated formatted tier names
 */
export function formatTierNames(tiers: SubscriptionTier[]): string {
  return tiers.map((tier) => TIER_DISPLAY_NAMES[tier]).join(', ');
}

/**
 * Validate tier restriction mode
 *
 * @param mode - Tier restriction mode to validate
 * @returns True if valid mode
 */
export function isValidTierRestrictionMode(mode: string): boolean {
  return ['minimum', 'exact', 'whitelist'].includes(mode);
}
