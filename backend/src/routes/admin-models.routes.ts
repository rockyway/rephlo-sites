/**
 * Admin Models Routes
 *
 * Administrative endpoints for model lifecycle management.
 * All endpoints require admin role authentication.
 *
 * Endpoints:
 * - POST   /admin/models                 - Create new model
 * - PUT    /admin/models/:id             - Full model update (name, meta, pricing)
 * - POST   /admin/models/:id/mark-legacy - Mark model as legacy
 * - POST   /admin/models/:id/unmark-legacy - Remove legacy status
 * - POST   /admin/models/:id/archive     - Archive model
 * - POST   /admin/models/:id/unarchive   - Restore archived model
 * - PATCH  /admin/models/:id/meta        - Update model metadata
 * - GET    /admin/models/:id/history     - Get version history for model
 * - GET    /admin/models/legacy          - List legacy models
 * - GET    /admin/models/archived        - List archived models
 *
 * Reference: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md
 */

import { Router } from 'express';
import { AdminModelsController } from '../controllers/admin-models.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { container } from '../container';

const router = Router();

// All admin model routes require authentication and admin role
router.use(authMiddleware, requireAdmin);

// Resolve controller from DI container
const adminModelsController = container.resolve(AdminModelsController);

// =============================================================================
// Model Creation
// =============================================================================

/**
 * POST /admin/models
 * Create a new model
 *
 * Request body:
 * - id: string (required) - Model ID
 * - name: string (required) - Internal name
 * - provider: string (required) - Provider slug
 * - meta: ModelMeta (required) - JSONB metadata
 */
router.post(
  '/',
  asyncHandler(adminModelsController.createModel.bind(adminModelsController))
);

/**
 * PUT /admin/models/:id
 * Full model update (name, meta, pricing)
 *
 * Request body:
 * - name: string (optional) - Update model name
 * - meta: Partial<ModelMeta> (optional) - Partial metadata updates
 * - reason: string (optional) - Admin reason for audit trail
 *
 * Note: Updates model + pricing record in atomic transaction.
 * Auto-calculates credits when pricing changes.
 */
router.put(
  '/:id',
  asyncHandler(adminModelsController.updateModel.bind(adminModelsController))
);

// =============================================================================
// Lifecycle Operations
// =============================================================================

/**
 * POST /admin/models/:id/mark-legacy
 * Mark model as legacy (deprecated)
 *
 * Request body:
 * - replacementModelId: string (optional)
 * - deprecationNotice: string (optional)
 * - sunsetDate: string (optional) - ISO 8601 date
 */
router.post(
  '/:id/mark-legacy',
  asyncHandler(
    adminModelsController.markModelAsLegacy.bind(adminModelsController)
  )
);

/**
 * POST /admin/models/:id/unmark-legacy
 * Remove legacy status from model
 */
router.post(
  '/:id/unmark-legacy',
  asyncHandler(
    adminModelsController.unmarkModelLegacy.bind(adminModelsController)
  )
);

/**
 * POST /admin/models/:id/archive
 * Archive a model
 *
 * Request body:
 * - reason: string (required)
 */
router.post(
  '/:id/archive',
  asyncHandler(adminModelsController.archiveModel.bind(adminModelsController))
);

/**
 * POST /admin/models/:id/unarchive
 * Restore archived model
 */
router.post(
  '/:id/unarchive',
  asyncHandler(adminModelsController.unarchiveModel.bind(adminModelsController))
);

// =============================================================================
// Model Management
// =============================================================================

/**
 * PATCH /admin/models/:id/meta
 * Update model metadata (partial update)
 *
 * Request body: Partial<ModelMeta>
 */
router.patch(
  '/:id/meta',
  asyncHandler(
    adminModelsController.updateModelMetadata.bind(adminModelsController)
  )
);

// =============================================================================
// Reporting
// =============================================================================

/**
 * GET /admin/models/legacy
 * List all legacy models
 */
router.get(
  '/legacy',
  asyncHandler(
    adminModelsController.listLegacyModels.bind(adminModelsController)
  )
);

/**
 * GET /admin/models/archived
 * List all archived models
 */
router.get(
  '/archived',
  asyncHandler(
    adminModelsController.listArchivedModels.bind(adminModelsController)
  )
);

// =============================================================================
// Version History
// =============================================================================

/**
 * GET /admin/models/:id/history
 * Get version history for a model
 *
 * Query parameters:
 * - limit: number (optional, default 50, max 100)
 * - offset: number (optional, default 0)
 * - change_type: string (optional) - Filter by change type
 *
 * Returns:
 * - history: Array of version entries with admin user details
 * - total: Total number of entries
 * - limit: Applied limit
 * - offset: Applied offset
 */
router.get(
  '/:id/history',
  asyncHandler(
    adminModelsController.getModelHistory.bind(adminModelsController)
  )
);

// =============================================================================
// Parameter Constraint Management (Plan 203)
// =============================================================================

/**
 * GET /admin/models/:id/parameters
 * Get parameter constraints for a model
 *
 * Returns:
 * - modelId: string
 * - modelName: string
 * - provider: string
 * - parameterConstraints: object (empty if no constraints defined)
 */
router.get(
  '/:id/parameters',
  asyncHandler(
    adminModelsController.getParameterConstraints.bind(adminModelsController)
  )
);

/**
 * PUT /admin/models/:id/parameters
 * Update parameter constraints for a model
 *
 * Request body:
 * {
 *   parameterConstraints: {
 *     temperature: { supported: true, min: 0, max: 2, default: 1 },
 *     max_tokens: { supported: true, min: 1, max: 4096, default: 1024 },
 *     ...
 *   }
 * }
 *
 * Returns:
 * - status: 'success'
 * - message: string
 * - modelId: string
 * - parameterConstraints: object
 */
router.put(
  '/:id/parameters',
  asyncHandler(
    adminModelsController.updateParameterConstraints.bind(adminModelsController)
  )
);

/**
 * DELETE /admin/models/:id/parameters/:paramName
 * Remove a specific parameter constraint
 *
 * Path parameters:
 * - id: Model ID
 * - paramName: Parameter name to remove (e.g., 'temperature', 'max_tokens')
 *
 * Returns:
 * - status: 'success'
 * - message: string
 * - modelId: string
 * - paramName: string
 */
router.delete(
  '/:id/parameters/:paramName',
  asyncHandler(
    adminModelsController.deleteParameterConstraint.bind(adminModelsController)
  )
);

export default router;
