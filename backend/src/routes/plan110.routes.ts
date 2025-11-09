/**
 * Plan 110: Perpetual Licensing & Proration Routes
 *
 * Public and administrative endpoints for perpetual license management,
 * version upgrades, subscription proration, and migration.
 *
 * Route Structure:
 * - /api/licenses/*                      - License management (public)
 * - /api/subscriptions/*                 - Proration operations (public)
 * - /api/migrations/*                    - Migration operations (public)
 * - /admin/licenses/*                    - License admin (admin only)
 * - /admin/prorations/*                  - Proration admin (admin only)
 * - /admin/analytics/upgrade-conversion  - Upgrade analytics (admin only)
 *
 * Reference: docs/plan/115-master-orchestration-plan-109-110-111.md
 * Reference: docs/plan/110-perpetual-plan-and-proration-strategy.md
 */

import { Router } from 'express';
import { container } from '../container';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { LicenseManagementController } from '../controllers/license-management.controller';
import { VersionUpgradeController } from '../controllers/version-upgrade.controller';
import { ProrationController } from '../controllers/proration.controller';
import { MigrationController } from '../controllers/migration.controller';

/**
 * Create Plan 110 router
 * @returns Express router
 */
export function createPlan110Router(): Router {
  const router = Router();

  // Resolve controllers from DI container
  const licenseController = container.resolve(LicenseManagementController);
  const upgradeController = container.resolve(VersionUpgradeController);
  const prorationController = container.resolve(ProrationController);
  const migrationController = container.resolve(MigrationController);

  // =============================================================================
  // Public License Management Routes
  // =============================================================================

  /**
   * POST /api/licenses/purchase
   * Purchase a perpetual license
   * Requires authentication
   */
  router.post(
    '/licenses/purchase',
    authMiddleware,
    asyncHandler(licenseController.purchaseLicense.bind(licenseController))
  );

  /**
   * POST /api/licenses/activate
   * Activate a device for a license
   * No authentication required (uses license key)
   */
  router.post(
    '/licenses/activate',
    asyncHandler(licenseController.activateDevice.bind(licenseController))
  );

  /**
   * DELETE /api/licenses/activations/:id
   * Deactivate a device
   * Requires authentication
   */
  router.delete(
    '/licenses/activations/:id',
    authMiddleware,
    asyncHandler(licenseController.deactivateDevice.bind(licenseController))
  );

  /**
   * PATCH /api/licenses/activations/:id/replace
   * Replace a device
   * Requires authentication
   */
  router.patch(
    '/licenses/activations/:id/replace',
    authMiddleware,
    asyncHandler(licenseController.replaceDevice.bind(licenseController))
  );

  /**
   * GET /api/licenses/:licenseKey
   * Get license details
   * No authentication required (license key is proof of ownership)
   */
  router.get(
    '/licenses/:licenseKey',
    asyncHandler(licenseController.getLicenseDetails.bind(licenseController))
  );

  /**
   * GET /api/licenses/:licenseKey/devices
   * List active devices for a license
   * No authentication required (license key is proof of ownership)
   */
  router.get(
    '/licenses/:licenseKey/devices',
    asyncHandler(licenseController.getActiveDevices.bind(licenseController))
  );

  // =============================================================================
  // Public Version Upgrade Routes
  // =============================================================================

  /**
   * GET /api/licenses/:licenseKey/version-eligibility/:version
   * Check if a version is eligible for free update
   * No authentication required
   */
  router.get(
    '/licenses/:licenseKey/version-eligibility/:version',
    asyncHandler(upgradeController.checkVersionEligibility.bind(upgradeController))
  );

  /**
   * POST /api/licenses/:licenseKey/upgrade
   * Purchase a major version upgrade
   * Requires authentication
   */
  router.post(
    '/licenses/:licenseKey/upgrade',
    authMiddleware,
    asyncHandler(upgradeController.purchaseUpgrade.bind(upgradeController))
  );

  /**
   * GET /api/licenses/:licenseKey/available-upgrades
   * List available upgrades for a license
   * No authentication required
   */
  router.get(
    '/licenses/:licenseKey/available-upgrades',
    asyncHandler(upgradeController.getAvailableUpgrades.bind(upgradeController))
  );

  /**
   * GET /api/licenses/:licenseKey/upgrade-history
   * Get upgrade history for a license
   * No authentication required (license key is proof of ownership)
   */
  router.get(
    '/licenses/:licenseKey/upgrade-history',
    asyncHandler(upgradeController.getUpgradeHistory.bind(upgradeController))
  );

  // =============================================================================
  // Public Proration Routes
  // =============================================================================

  /**
   * POST /api/subscriptions/:id/proration-preview
   * Preview tier change proration calculation
   * Requires authentication
   */
  router.post(
    '/subscriptions/:id/proration-preview',
    authMiddleware,
    asyncHandler(prorationController.previewProration.bind(prorationController))
  );

  /**
   * POST /api/subscriptions/:id/upgrade-with-proration
   * Apply tier upgrade with proration
   * Requires authentication
   */
  router.post(
    '/subscriptions/:id/upgrade-with-proration',
    authMiddleware,
    asyncHandler(prorationController.upgradeWithProration.bind(prorationController))
  );

  /**
   * POST /api/subscriptions/:id/downgrade-with-proration
   * Apply tier downgrade with proration
   * Requires authentication
   */
  router.post(
    '/subscriptions/:id/downgrade-with-proration',
    authMiddleware,
    asyncHandler(prorationController.downgradeWithProration.bind(prorationController))
  );

  /**
   * GET /api/subscriptions/:id/proration-history
   * Get proration history for a subscription
   * Requires authentication
   */
  router.get(
    '/subscriptions/:id/proration-history',
    authMiddleware,
    asyncHandler(prorationController.getProrationHistory.bind(prorationController))
  );

  // =============================================================================
  // Public Migration Routes
  // =============================================================================

  /**
   * POST /api/migrations/perpetual-to-subscription
   * Migrate from perpetual license to subscription
   * Requires authentication
   */
  router.post(
    '/migrations/perpetual-to-subscription',
    authMiddleware,
    asyncHandler(migrationController.migratePerpetualToSubscription.bind(migrationController))
  );

  /**
   * POST /api/migrations/subscription-to-perpetual
   * Migrate from subscription to perpetual license
   * Requires authentication
   */
  router.post(
    '/migrations/subscription-to-perpetual',
    authMiddleware,
    asyncHandler(migrationController.migrateSubscriptionToPerpetual.bind(migrationController))
  );

  /**
   * GET /api/migrations/trade-in-value/:licenseId
   * Calculate trade-in value for a perpetual license
   * Requires authentication
   */
  router.get(
    '/migrations/trade-in-value/:licenseId',
    authMiddleware,
    asyncHandler(migrationController.getTradeInValue.bind(migrationController))
  );

  /**
   * GET /api/migrations/eligibility
   * Check if user is eligible for migration
   * Requires authentication
   */
  router.get(
    '/migrations/eligibility',
    authMiddleware,
    asyncHandler(migrationController.checkMigrationEligibility.bind(migrationController))
  );

  /**
   * GET /api/migrations/history
   * Get migration history for the current user
   * Requires authentication
   */
  router.get(
    '/migrations/history',
    authMiddleware,
    asyncHandler(migrationController.getMigrationHistory.bind(migrationController))
  );

  // =============================================================================
  // Admin License Management Routes
  // =============================================================================

  /**
   * POST /admin/licenses/:id/suspend
   * Suspend a license (admin only)
   * Requires admin authentication
   */
  router.post(
    '/admin/licenses/:id/suspend',
    authMiddleware,
    requireAdmin,
    asyncHandler(licenseController.suspendLicense.bind(licenseController))
  );

  /**
   * POST /admin/licenses/:id/revoke
   * Revoke a license permanently (admin only)
   * Requires admin authentication
   */
  router.post(
    '/admin/licenses/:id/revoke',
    authMiddleware,
    requireAdmin,
    asyncHandler(licenseController.revokeLicense.bind(licenseController))
  );

  /**
   * GET /admin/licenses
   * List all licenses (admin only)
   * Requires admin authentication
   */
  router.get(
    '/admin/licenses',
    authMiddleware,
    requireAdmin,
    asyncHandler(licenseController.listAllLicenses.bind(licenseController))
  );

  // =============================================================================
  // Admin Proration Routes
  // =============================================================================

  /**
   * GET /admin/prorations
   * List all proration events (admin only)
   * Requires admin authentication
   */
  router.get(
    '/admin/prorations',
    authMiddleware,
    requireAdmin,
    asyncHandler(prorationController.listAllProrations.bind(prorationController))
  );

  /**
   * POST /admin/prorations/:id/reverse
   * Reverse a proration (admin only)
   * Requires admin authentication
   */
  router.post(
    '/admin/prorations/:id/reverse',
    authMiddleware,
    requireAdmin,
    asyncHandler(prorationController.reverseProration.bind(prorationController))
  );

  // =============================================================================
  // Admin Analytics Routes
  // =============================================================================

  /**
   * GET /admin/analytics/upgrade-conversion
   * Get upgrade conversion metrics (admin only)
   * Requires admin authentication
   */
  router.get(
    '/admin/analytics/upgrade-conversion',
    authMiddleware,
    requireAdmin,
    asyncHandler(upgradeController.getUpgradeConversion.bind(upgradeController))
  );

  return router;
}
