/**
 * Admin Models Routes
 *
 * Administrative endpoints for model lifecycle management.
 * All endpoints require admin role authentication.
 *
 * Endpoints:
 * - POST   /admin/models                 - Create new model
 * - POST   /admin/models/:id/mark-legacy - Mark model as legacy
 * - POST   /admin/models/:id/unmark-legacy - Remove legacy status
 * - POST   /admin/models/:id/archive     - Archive model
 * - POST   /admin/models/:id/unarchive   - Restore archived model
 * - PATCH  /admin/models/:id/meta        - Update model metadata
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

export default router;
