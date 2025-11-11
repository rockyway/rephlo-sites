/**
 * Unit Tests for Tier Access Control Utility
 *
 * Tests the tier access validation logic for LLM models.
 * Covers all three restriction modes: minimum, exact, and whitelist.
 *
 * Reference: docs/plan/108-model-tier-access-control-architecture.md
 */

import { SubscriptionTier } from '@prisma/client';
import {
  checkTierAccess,
  getTierAccessStatus,
  formatTierNames,
  isValidTierRestrictionMode,
  TIER_HIERARCHY,
  TIER_DISPLAY_NAMES,
  ModelTierConfig,
} from '../../utils/tier-access';

describe('Tier Access Control Utility', () => {
  // ==========================================================================
  // checkTierAccess - minimum mode
  // ==========================================================================

  describe('checkTierAccess - minimum mode', () => {
    const minimumModeConfig: Omit<ModelTierConfig, 'requiredTier'> = {
      tierRestrictionMode: 'minimum',
      allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
    };

    describe('when user tier equals required tier', () => {
      it('should allow free user to access free model', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          requiredTier: SubscriptionTier.free,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow pro user to access pro model', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          requiredTier: SubscriptionTier.pro,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow enterprise user to access enterprise model', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          requiredTier: SubscriptionTier.enterprise,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });
    });

    describe('when user tier is higher than required tier', () => {
      it('should allow pro user to access free model', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          requiredTier: SubscriptionTier.free,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow enterprise user to access free model', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          requiredTier: SubscriptionTier.free,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow enterprise user to access pro model', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          requiredTier: SubscriptionTier.pro,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });
    });

    describe('when user tier is lower than required tier', () => {
      it('should deny free user access to pro model', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          requiredTier: SubscriptionTier.pro,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Requires Pro tier or higher');
        expect(result.requiredTier).toBe(SubscriptionTier.pro);
      });

      it('should deny free user access to enterprise model', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          requiredTier: SubscriptionTier.enterprise,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Requires Enterprise tier or higher');
        expect(result.requiredTier).toBe(SubscriptionTier.enterprise);
      });

      it('should deny pro user access to enterprise model', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          requiredTier: SubscriptionTier.enterprise,
          ...minimumModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Requires Enterprise tier or higher');
        expect(result.requiredTier).toBe(SubscriptionTier.enterprise);
      });
    });
  });

  // ==========================================================================
  // checkTierAccess - exact mode
  // ==========================================================================

  describe('checkTierAccess - exact mode', () => {
    const exactModeConfig: Omit<ModelTierConfig, 'requiredTier'> = {
      tierRestrictionMode: 'exact',
      allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
    };

    describe('when user tier exactly matches required tier', () => {
      it('should allow free user to access free-only model', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          requiredTier: SubscriptionTier.free,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow pro user to access pro-only model', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          requiredTier: SubscriptionTier.pro,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow enterprise user to access enterprise-only model', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          requiredTier: SubscriptionTier.enterprise,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });
    });

    describe('when user tier does not match required tier', () => {
      it('should deny higher tier access (pro user to free-only model)', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          requiredTier: SubscriptionTier.free,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Only available for Free tier');
        expect(result.requiredTier).toBe(SubscriptionTier.free);
      });

      it('should deny higher tier access (enterprise user to pro-only model)', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          requiredTier: SubscriptionTier.pro,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Only available for Pro tier');
        expect(result.requiredTier).toBe(SubscriptionTier.pro);
      });

      it('should deny lower tier access (free user to pro-only model)', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          requiredTier: SubscriptionTier.pro,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Only available for Pro tier');
        expect(result.requiredTier).toBe(SubscriptionTier.pro);
      });

      it('should deny lower tier access (pro user to enterprise-only model)', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          requiredTier: SubscriptionTier.enterprise,
          ...exactModeConfig,
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Only available for Enterprise tier');
        expect(result.requiredTier).toBe(SubscriptionTier.enterprise);
      });
    });
  });

  // ==========================================================================
  // checkTierAccess - whitelist mode
  // ==========================================================================

  describe('checkTierAccess - whitelist mode', () => {
    const whitelistModeConfig: Omit<ModelTierConfig, 'allowedTiers'> = {
      tierRestrictionMode: 'whitelist',
      requiredTier: SubscriptionTier.pro, // Not used in whitelist mode
    };

    describe('when user tier is in whitelist', () => {
      it('should allow free user when free is in whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro],
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow pro user when pro is in whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro],
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow enterprise user when enterprise is in whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.enterprise],
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.requiredTier).toBeUndefined();
      });

      it('should allow all tiers when all are whitelisted', () => {
        const config = {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise],
        };

        expect(checkTierAccess(SubscriptionTier.free, config).allowed).toBe(true);
        expect(checkTierAccess(SubscriptionTier.pro, config).allowed).toBe(true);
        expect(checkTierAccess(SubscriptionTier.enterprise, config).allowed).toBe(true);
      });
    });

    describe('when user tier is not in whitelist', () => {
      it('should deny free user when not in whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.free, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise],
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Available for: Pro, Enterprise');
        expect(result.requiredTier).toBe(SubscriptionTier.pro);
      });

      it('should deny pro user when not in whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.free, SubscriptionTier.enterprise],
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Available for: Free, Enterprise');
        expect(result.requiredTier).toBe(SubscriptionTier.pro);
      });

      it('should deny enterprise user when not in whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.enterprise, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro],
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Available for: Free, Pro');
        expect(result.requiredTier).toBe(SubscriptionTier.pro);
      });
    });

    describe('edge cases for whitelist mode', () => {
      it('should handle empty whitelist (deny all access)', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          ...whitelistModeConfig,
          allowedTiers: [],
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Available for: ');
      });

      it('should handle single-tier whitelist', () => {
        const result = checkTierAccess(SubscriptionTier.pro, {
          ...whitelistModeConfig,
          allowedTiers: [SubscriptionTier.pro],
        });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // checkTierAccess - invalid mode
  // ==========================================================================

  describe('checkTierAccess - invalid restriction mode', () => {
    it('should deny access for unknown restriction mode', () => {
      const result = checkTierAccess(SubscriptionTier.pro, {
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: 'unknown-mode',
        allowedTiers: [SubscriptionTier.pro],
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid tier restriction mode');
      expect(result.requiredTier).toBeUndefined();
    });

    it('should deny access for empty restriction mode', () => {
      const result = checkTierAccess(SubscriptionTier.pro, {
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: '',
        allowedTiers: [SubscriptionTier.pro],
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid tier restriction mode');
    });

    it('should deny access for null restriction mode', () => {
      const result = checkTierAccess(SubscriptionTier.pro, {
        requiredTier: SubscriptionTier.free,
        tierRestrictionMode: null as any,
        allowedTiers: [SubscriptionTier.pro],
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid tier restriction mode');
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('getTierAccessStatus', () => {
    it('should return "allowed" when access is allowed', () => {
      expect(getTierAccessStatus(true)).toBe('allowed');
    });

    it('should return "upgrade_required" when access is denied', () => {
      expect(getTierAccessStatus(false)).toBe('upgrade_required');
    });
  });

  describe('formatTierNames', () => {
    it('should format single tier name', () => {
      expect(formatTierNames([SubscriptionTier.pro])).toBe('Pro');
    });

    it('should format multiple tier names with commas', () => {
      const result = formatTierNames([
        SubscriptionTier.free,
        SubscriptionTier.pro,
        SubscriptionTier.enterprise,
      ]);
      expect(result).toBe('Free, Pro, Enterprise');
    });

    it('should format two tier names', () => {
      const result = formatTierNames([SubscriptionTier.pro, SubscriptionTier.enterprise]);
      expect(result).toBe('Pro, Enterprise');
    });

    it('should handle empty array', () => {
      expect(formatTierNames([])).toBe('');
    });
  });

  describe('isValidTierRestrictionMode', () => {
    it('should validate "minimum" mode', () => {
      expect(isValidTierRestrictionMode('minimum')).toBe(true);
    });

    it('should validate "exact" mode', () => {
      expect(isValidTierRestrictionMode('exact')).toBe(true);
    });

    it('should validate "whitelist" mode', () => {
      expect(isValidTierRestrictionMode('whitelist')).toBe(true);
    });

    it('should reject invalid mode', () => {
      expect(isValidTierRestrictionMode('invalid')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidTierRestrictionMode('')).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidTierRestrictionMode(null as any)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidTierRestrictionMode(undefined as any)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidTierRestrictionMode('MINIMUM')).toBe(false);
      expect(isValidTierRestrictionMode('Exact')).toBe(false);
    });
  });

  // ==========================================================================
  // Constants
  // ==========================================================================

  describe('TIER_HIERARCHY', () => {
    it('should define correct tier hierarchy', () => {
      expect(TIER_HIERARCHY[SubscriptionTier.free]).toBe(0);
      expect(TIER_HIERARCHY[SubscriptionTier.pro]).toBe(1);
      expect(TIER_HIERARCHY[SubscriptionTier.enterprise]).toBe(2);
    });

    it('should maintain ascending order', () => {
      expect(TIER_HIERARCHY[SubscriptionTier.free])
        .toBeLessThan(TIER_HIERARCHY[SubscriptionTier.pro]);
      expect(TIER_HIERARCHY[SubscriptionTier.pro])
        .toBeLessThan(TIER_HIERARCHY[SubscriptionTier.enterprise]);
    });
  });

  describe('TIER_DISPLAY_NAMES', () => {
    it('should define display names for all tiers', () => {
      expect(TIER_DISPLAY_NAMES[SubscriptionTier.free]).toBe('Free');
      expect(TIER_DISPLAY_NAMES[SubscriptionTier.pro]).toBe('Pro');
      expect(TIER_DISPLAY_NAMES[SubscriptionTier.enterprise]).toBe('Enterprise');
    });

    it('should use proper capitalization', () => {
      Object.values(TIER_DISPLAY_NAMES).forEach((name) => {
        expect(name).toMatch(/^[A-Z]/); // Starts with capital letter
      });
    });
  });
});
