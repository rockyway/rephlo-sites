/**
 * Plan 190 Routes - Tier Credit Management System
 *
 * API routes for admin tier configuration management, credit allocation updates,
 * and pricing adjustments with audit trail.
 *
 * All routes require admin authentication.
 *
 * Admin Routes:
 * - GET    /api/admin/tier-config                      - List all tier configurations
 * - GET    /api/admin/tier-config/:tierName            - Get specific tier configuration
 * - GET    /api/admin/tier-config/:tierName/history    - Get tier modification history
 * - POST   /api/admin/tier-config/:tierName/preview    - Preview update impact (dry-run)
 * - PATCH  /api/admin/tier-config/:tierName/credits    - Update tier credit allocation
 * - PATCH  /api/admin/tier-config/:tierName/price      - Update tier pricing
 *
 * Reference: docs/plan/190-tier-credit-management-feature.md
 */

import { Router } from 'express';
import { container } from '../container';
import { TierConfigController } from '../controllers/admin/tier-config.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

export function createPlan190Router(): Router {
  const router = Router();

  // Resolve controller from DI container
  const tierConfigController = container.resolve(TierConfigController);

  // ===== Admin Tier Config Routes (/api/admin/tier-config) =====
  // All routes require admin authentication

  /**
   * GET /api/admin/tier-config
   * List all tier configurations with current allocations
   *
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "tierName": "pro",
   *       "monthlyCreditAllocation": 1500,
   *       "monthlyPriceUsd": 15.00,
   *       "annualPriceUsd": 150.00,
   *       "configVersion": 2,
   *       ...
   *     }
   *   ]
   * }
   */
  router.get(
    '/api/admin/tier-config',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => tierConfigController.listAll(req, res))
  );

  /**
   * GET /api/admin/tier-config/:tierName
   * Get specific tier configuration with details
   *
   * Path Parameters:
   * - tierName: string (e.g., "free", "pro", "enterprise")
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "tierName": "pro",
   *     "monthlyCreditAllocation": 1500,
   *     "monthlyPriceUsd": 15.00,
   *     "annualPriceUsd": 150.00,
   *     "configVersion": 2,
   *     "lastModifiedBy": "admin-uuid",
   *     "lastModifiedAt": "2025-01-15T10:30:00.000Z",
   *     ...
   *   }
   * }
   */
  router.get(
    '/api/admin/tier-config/:tierName',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => tierConfigController.getByName(req, res))
  );

  /**
   * GET /api/admin/tier-config/:tierName/history
   * Get tier configuration history with audit trail
   *
   * Path Parameters:
   * - tierName: string (e.g., "pro")
   *
   * Query Parameters:
   * - limit: number (optional, default: 50, max: 100)
   *
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "tierName": "pro",
   *       "previousCredits": 1000,
   *       "newCredits": 1500,
   *       "changeReason": "Q1 2025 pricing update",
   *       "changeType": "credit_increase",
   *       "changedBy": "admin-uuid",
   *       "changedAt": "2025-01-15T10:30:00.000Z",
   *       ...
   *     }
   *   ],
   *   "meta": {
   *     "count": 5,
   *     "limit": 50
   *   }
   * }
   */
  router.get(
    '/api/admin/tier-config/:tierName/history',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => tierConfigController.getHistory(req, res))
  );

  /**
   * POST /api/admin/tier-config/:tierName/preview
   * Preview update impact without applying changes (dry-run)
   *
   * Path Parameters:
   * - tierName: string (e.g., "pro")
   *
   * Request Body:
   * {
   *   "newCredits": 2000,
   *   "applyToExistingUsers": true
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "tierName": "pro",
   *     "currentCredits": 1500,
   *     "newCredits": 2000,
   *     "changeType": "increase",
   *     "affectedUsers": {
   *       "total": 450,
   *       "willUpgrade": 450,
   *       "willRemainSame": 0
   *     },
   *     "estimatedCostImpact": 225.00,
   *     "breakdown": {
   *       "costPerUser": 5.00,
   *       "totalCreditsAdded": 225000,
   *       "dollarValueAdded": 2250.00
   *     }
   *   }
   * }
   */
  router.post(
    '/api/admin/tier-config/:tierName/preview',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req, res) => tierConfigController.previewUpdate(req, res))
  );

  /**
   * PATCH /api/admin/tier-config/:tierName/credits
   * Update tier credit allocation with audit trail
   *
   * Path Parameters:
   * - tierName: string (e.g., "pro")
   *
   * Request Body:
   * {
   *   "newCredits": 2000,
   *   "reason": "Q1 2025 Promotion - Extra 500 credits",
   *   "applyToExistingUsers": true,
   *   "scheduledRolloutDate": "2025-01-01T00:00:00Z" (optional)
   * }
   *
   * Validation:
   * - newCredits: min 100, max 1,000,000, must be multiple of 100
   * - reason: min 10 chars, max 500 chars
   * - applyToExistingUsers: boolean, default false
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "tierName": "pro",
   *     "monthlyCreditAllocation": 2000,
   *     "configVersion": 3,
   *     ...
   *   },
   *   "message": "Tier credits updated successfully for pro"
   * }
   */
  router.patch(
    '/api/admin/tier-config/:tierName/credits',
    authMiddleware,
    requireAdmin,
    auditLog({
      action: 'update',
      resourceType: 'tier_config',
      captureRequestBody: true,
      capturePreviousValue: true,
    }),
    asyncHandler(async (req, res) => tierConfigController.updateCredits(req, res))
  );

  /**
   * PATCH /api/admin/tier-config/:tierName/price
   * Update tier pricing with audit trail
   *
   * Path Parameters:
   * - tierName: string (e.g., "pro")
   *
   * Request Body:
   * {
   *   "newMonthlyPrice": 19.99,
   *   "newAnnualPrice": 199.99,
   *   "reason": "Competitive pricing adjustment"
   * }
   *
   * Validation:
   * - newMonthlyPrice: optional, must be >= 0
   * - newAnnualPrice: optional, must be >= 0
   * - reason: min 10 chars, max 500 chars
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "tierName": "pro",
   *     "monthlyPriceUsd": 19.99,
   *     "annualPriceUsd": 199.99,
   *     "configVersion": 3,
   *     ...
   *   },
   *   "message": "Tier pricing updated successfully for pro"
   * }
   */
  router.patch(
    '/api/admin/tier-config/:tierName/price',
    authMiddleware,
    requireAdmin,
    auditLog({
      action: 'update',
      resourceType: 'tier_config_pricing',
      captureRequestBody: true,
      capturePreviousValue: true,
    }),
    asyncHandler(async (req, res) => tierConfigController.updatePrice(req, res))
  );

  return router;
}
