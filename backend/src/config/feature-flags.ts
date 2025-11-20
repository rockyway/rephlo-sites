/**
 * Feature Flags Configuration (Plan 207 Phase 4)
 *
 * Environment-based feature flag system for gradual rollout and A/B testing.
 * Flags can be controlled via environment variables or environment-specific configs.
 *
 * Usage:
 * ```typescript
 * import { featureFlags } from '../config/feature-flags';
 *
 * if (featureFlags.promptCachingEnabled) {
 *   // Use prompt caching features
 * }
 * ```
 *
 * Environment Variables:
 * - FEATURE_PROMPT_CACHING_ENABLED: Enable/disable prompt caching support (default: true)
 * - FEATURE_CACHE_ANALYTICS_ENABLED: Enable/disable cache analytics endpoints (default: true)
 *
 * Reference: docs/plan/207-prompt-caching-support.md
 */

export interface FeatureFlags {
  /**
   * Plan 207: Prompt Caching Support
   * Enables cache_control parameter support and differential pricing for cached tokens
   */
  promptCachingEnabled: boolean;

  /**
   * Plan 207: Cache Analytics
   * Enables cache performance analytics endpoints for users and admins
   */
  cacheAnalyticsEnabled: boolean;
}

/**
 * Parse boolean environment variable with default value
 * @param envVar Environment variable name
 * @param defaultValue Default value if not set or invalid
 * @returns Boolean value
 */
function parseBooleanEnv(envVar: string, defaultValue: boolean): boolean {
  const value = process.env[envVar];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Feature Flags Configuration
 * Loaded from environment variables with sensible defaults
 */
export const featureFlags: FeatureFlags = {
  promptCachingEnabled: parseBooleanEnv('FEATURE_PROMPT_CACHING_ENABLED', true),
  cacheAnalyticsEnabled: parseBooleanEnv('FEATURE_CACHE_ANALYTICS_ENABLED', true),
};

/**
 * Feature Flag Middleware Factory
 * Returns Express middleware that checks feature flag and returns 404 if disabled
 *
 * @param featureKey Key of feature flag to check
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { requireFeature } from '../config/feature-flags';
 *
 * router.get('/cache-analytics/performance',
 *   authMiddleware,
 *   requireFeature('cacheAnalyticsEnabled'),
 *   controller.getCachePerformance
 * );
 * ```
 */
export function requireFeature(featureKey: keyof FeatureFlags) {
  return (_req: any, res: any, next: any) => {
    if (!featureFlags[featureKey]) {
      return res.status(404).json({
        error: {
          code: 'FEATURE_DISABLED',
          message: 'This feature is currently disabled',
        },
      });
    }
    next();
  };
}

/**
 * Log feature flag status on startup
 */
export function logFeatureFlags(): void {
  console.log('Feature Flags:');
  console.log(`  - Prompt Caching: ${featureFlags.promptCachingEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  - Cache Analytics: ${featureFlags.cacheAnalyticsEnabled ? 'ENABLED' : 'DISABLED'}`);
}
