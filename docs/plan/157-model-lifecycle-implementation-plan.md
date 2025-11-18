# Model Lifecycle & JSONB Meta Refactor - Implementation Plan

**Document**: 157-model-lifecycle-implementation-plan.md
**Created**: 2025-11-12
**Status**: Implementation Plan
**Priority**: P0 (Critical)
**Architecture**: docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md

---

## Overview

This document provides a step-by-step implementation plan for the Model Lifecycle Management and JSONB Meta refactor outlined in the architecture document (156). The implementation is structured into atomic, testable tasks that can be executed sequentially or delegated to specialized agents.

---

## Implementation Phases

### Phase 1: Database Schema & Migration (P0)
**Duration**: 1-2 days
**Dependencies**: None
**Risk**: Medium (schema changes)

### Phase 2: Type System & Validation (P0)
**Duration**: 1 day
**Dependencies**: Phase 1
**Risk**: Low

### Phase 3: Service Layer Extensions (P0)
**Duration**: 2-3 days
**Dependencies**: Phase 1, Phase 2
**Risk**: Medium (business logic complexity)

### Phase 4: API Endpoints (P1)
**Duration**: 2 days
**Dependencies**: Phase 3
**Risk**: Low

### Phase 5: Frontend Dashboard (P1)
**Duration**: 2-3 days
**Dependencies**: Phase 4
**Risk**: Low

### Phase 6: Testing & QA (P0)
**Duration**: 2 days
**Dependencies**: All previous phases
**Risk**: Low

---

## Task Breakdown

### Phase 1: Database Schema & Migration

#### Task 1.1: Create Prisma Schema Changes
**File**: `backend/prisma/schema.prisma`
**Agent**: db-schema-architect

**Actions**:
1. Add `isLegacy Boolean @default(false) @map("is_legacy")` to Model
2. Add `isArchived Boolean @default(false) @map("is_archived")` to Model
3. Add `meta Json @db.JsonB` to Model
4. Add indexes:
   - `@@index([isLegacy])`
   - `@@index([isArchived])`
   - `@@index(fields: [meta], type: Gin)`
5. Keep existing columns for backwards compatibility (will be removed in Phase 7)

**Acceptance Criteria**:
- ✅ Prisma schema validates with `npx prisma validate`
- ✅ No breaking changes to existing relations
- ✅ All new fields have appropriate defaults

**Estimated Time**: 30 minutes

---

#### Task 1.2: Create Migration Script
**File**: `backend/prisma/migrations/20251112000000_add_model_lifecycle_jsonb_meta/migration.sql`
**Agent**: db-schema-architect

**Actions**:
1. Add new columns (`is_legacy`, `is_archived`, `meta`)
2. Backfill `meta` JSONB from existing columns using `jsonb_build_object()`
3. Add NOT NULL constraint to `meta` after backfill
4. Create Gin index on `meta` column
5. Create B-tree indexes on `isLegacy`, `isArchived`
6. Create B-tree index on `(meta->>'requiredTier')`
7. Create Gin index on `(meta->'capabilities')`

**SQL Template**:
```sql
-- Step 1: Add columns
ALTER TABLE models ADD COLUMN is_legacy BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN is_archived BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN meta JSONB;

-- Step 2: Backfill meta JSONB
UPDATE models SET meta = jsonb_build_object(
  'displayName', display_name,
  'description', description,
  'version', version,
  'capabilities', (SELECT jsonb_agg(unnest) FROM unnest(capabilities)),
  'contextLength', context_length,
  'maxOutputTokens', max_output_tokens,
  'inputCostPerMillionTokens', input_cost_per_million_tokens,
  'outputCostPerMillionTokens', output_cost_per_million_tokens,
  'creditsPer1kTokens', credits_per_1k_tokens,
  'requiredTier', required_tier::text,
  'tierRestrictionMode', tier_restriction_mode,
  'allowedTiers', (SELECT jsonb_agg(unnest::text) FROM unnest(allowed_tiers))
);

-- Step 3: Add NOT NULL constraint
ALTER TABLE models ALTER COLUMN meta SET NOT NULL;

-- Step 4: Create indexes
CREATE INDEX idx_models_is_legacy ON models(is_legacy);
CREATE INDEX idx_models_is_archived ON models(is_archived);
CREATE INDEX idx_models_meta_gin ON models USING gin(meta);
CREATE INDEX idx_models_meta_required_tier ON models USING btree((meta->>'requiredTier'));
CREATE INDEX idx_models_meta_capabilities ON models USING gin((meta->'capabilities'));
```

**Acceptance Criteria**:
- ✅ Migration runs successfully on empty database
- ✅ Existing seed data migrates correctly (run `npm run db:reset` in backend)
- ✅ All models have valid `meta` JSONB
- ✅ Indexes created successfully

**Estimated Time**: 1 hour

---

#### Task 1.3: Update Prisma Client Generation
**File**: N/A (command)
**Agent**: Manual

**Actions**:
1. Run `cd backend && npx prisma generate`
2. Verify TypeScript types include `isLegacy`, `isArchived`, `meta`
3. Check `@prisma/client` types in IDE

**Acceptance Criteria**:
- ✅ Prisma client regenerated
- ✅ TypeScript autocomplete shows new fields
- ✅ No type errors in existing code

**Estimated Time**: 5 minutes

---

### Phase 2: Type System & Validation

#### Task 2.1: Create ModelMeta TypeScript Types
**File**: `backend/src/types/model-meta.ts` (NEW)
**Agent**: Manual or api-backend-implementer

**Actions**:
1. Create Zod schemas for validation
2. Define TypeScript interfaces
3. Export validation helper functions
4. Add JSDoc documentation

**Implementation**:
```typescript
import { z } from 'zod';

// Enum Schemas
export const ModelCapabilitySchema = z.enum([
  'text',
  'vision',
  'function_calling',
  'code',
  'long_context',
]);

export const SubscriptionTierSchema = z.enum([
  'free',
  'pro',
  'pro_max',
  'enterprise_pro',
  'enterprise_max',
  'perpetual',
]);

export const TierRestrictionModeSchema = z.enum(['minimum', 'exact', 'whitelist']);

// Model Meta Schema
export const ModelMetaSchema = z.object({
  // Display Information
  displayName: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  version: z.string().max(50).optional(),

  // Capabilities
  capabilities: z.array(ModelCapabilitySchema).min(1),

  // Context & Output Limits
  contextLength: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive().optional(),

  // Pricing
  inputCostPerMillionTokens: z.number().int().nonnegative(),
  outputCostPerMillionTokens: z.number().int().nonnegative(),
  creditsPer1kTokens: z.number().int().positive(),

  // Tier Access Control
  requiredTier: SubscriptionTierSchema,
  tierRestrictionMode: TierRestrictionModeSchema,
  allowedTiers: z.array(SubscriptionTierSchema).min(1),

  // Legacy Management (Optional)
  legacyReplacementModelId: z.string().max(100).optional(),
  deprecationNotice: z.string().max(1000).optional(),
  sunsetDate: z.string().datetime().optional(),

  // Provider-Specific Extensions
  providerMetadata: z.record(z.any()).optional(),

  // Admin Metadata
  internalNotes: z.string().max(5000).optional(),
  complianceTags: z.array(z.string().max(50)).optional(),
});

// TypeScript Types
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;
export type TierRestrictionMode = z.infer<typeof TierRestrictionModeSchema>;
export type ModelMeta = z.infer<typeof ModelMetaSchema>;

// Validation Helpers
export function validateModelMeta(meta: unknown): ModelMeta {
  return ModelMetaSchema.parse(meta);
}

export function isValidModelMeta(meta: unknown): meta is ModelMeta {
  return ModelMetaSchema.safeParse(meta).success;
}

// Type Guards
export function assertModelMeta(meta: unknown): asserts meta is ModelMeta {
  validateModelMeta(meta);
}
```

**Acceptance Criteria**:
- ✅ Zod schemas validate correctly
- ✅ TypeScript types match schema
- ✅ Validation functions work as expected
- ✅ JSDoc comments added

**Estimated Time**: 1 hour

---

#### Task 2.2: Update Model Response Types
**File**: `backend/src/types/model-validation.ts`
**Agent**: Manual

**Actions**:
1. Update `ModelListResponse` to include `isLegacy`, `isArchived`
2. Update `ModelDetailsResponse` to include legacy metadata
3. Add `LegacyInfo` type for deprecation notices

**Implementation**:
```typescript
// Add to existing file
export interface LegacyInfo {
  isLegacy: boolean;
  replacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string; // ISO 8601
}

export interface ModelListResponse {
  models: Array<{
    id: string;
    name: string;
    provider: string;
    description?: string;
    capabilities: string[];
    context_length: number;
    max_output_tokens?: number;
    credits_per_1k_tokens: number;
    is_available: boolean;
    is_legacy: boolean; // NEW
    is_archived: boolean; // NEW
    version?: string;
    required_tier: string;
    tier_restriction_mode: 'minimum' | 'exact' | 'whitelist';
    allowed_tiers: string[];
    access_status: 'allowed' | 'restricted' | 'upgrade_required';
    legacy_info?: LegacyInfo; // NEW
  }>;
  total: number;
  user_tier?: string;
}
```

**Acceptance Criteria**:
- ✅ Response types include lifecycle fields
- ✅ Backwards compatible (optional fields)
- ✅ JSDoc comments updated

**Estimated Time**: 30 minutes

---

### Phase 3: Service Layer Extensions

#### Task 3.1: Extend ModelService with Lifecycle Methods
**File**: `backend/src/services/model.service.ts`
**Agent**: api-backend-implementer

**Actions**:
1. Add `markAsLegacy()` method
2. Add `unmarkLegacy()` method
3. Add `archive()` method
4. Add `unarchive()` method
5. Add `updateModelMeta()` method
6. Add `addModel()` method
7. Add helper methods for audit logging

**Key Implementation Points**:
- Clear cache after every lifecycle operation
- Validate `meta` JSONB with Zod before saving
- Log all changes to `ModelTierAuditLog`
- Emit events for notifications (optional in P0)

**Example Implementation**:
```typescript
async markAsLegacy(
  modelId: string,
  options: {
    replacementModelId?: string;
    deprecationNotice?: string;
    sunsetDate?: Date;
  },
  adminUserId: string
): Promise<void> {
  logger.info('ModelService: Marking model as legacy', { modelId, adminUserId });

  // Validate model exists
  const model = await this.prisma.model.findUnique({ where: { id: modelId } });
  if (!model) {
    throw new NotFoundError(`Model ${modelId} not found`);
  }

  // Validate replacement model (if provided)
  if (options.replacementModelId) {
    const replacement = await this.prisma.model.findUnique({
      where: { id: options.replacementModelId }
    });
    if (!replacement) {
      throw new ValidationError(
        `Replacement model ${options.replacementModelId} not found`
      );
    }
  }

  // Update model meta
  const currentMeta = validateModelMeta(model.meta);
  const updatedMeta: ModelMeta = {
    ...currentMeta,
    legacyReplacementModelId: options.replacementModelId,
    deprecationNotice: options.deprecationNotice,
    sunsetDate: options.sunsetDate?.toISOString(),
  };

  // Persist to database
  await this.prisma.model.update({
    where: { id: modelId },
    data: {
      isLegacy: true,
      meta: updatedMeta as any, // Prisma JsonValue
    },
  });

  // Clear cache
  modelCache.clear();

  // Audit log
  await this.logLifecycleChange({
    adminUserId,
    modelId,
    action: 'mark_as_legacy',
    previousValue: { isLegacy: false },
    newValue: { isLegacy: true, ...options },
  });

  logger.info('ModelService: Model marked as legacy', { modelId });
}
```

**Acceptance Criteria**:
- ✅ All lifecycle methods implemented
- ✅ Validation errors thrown for invalid inputs
- ✅ Cache cleared after operations
- ✅ Audit logs created
- ✅ TypeScript strict mode passes

**Estimated Time**: 4 hours

---

#### Task 3.2: Update Existing ModelService Methods
**File**: `backend/src/services/model.service.ts`
**Agent**: api-backend-implementer

**Actions**:
1. Update `listModels()` to:
   - Exclude archived models by default
   - Include `isLegacy`, `isArchived` in response
   - Add `includeArchived` parameter (admin only)
2. Update `getModelDetails()` to:
   - Include legacy info in response
   - Show deprecation notice if legacy
3. Update `isModelAvailable()` to:
   - Return `false` for archived models
4. Update `getModelForInference()` to:
   - Reject archived models

**Key Changes**:
```typescript
async listModels(
  filters?: {
    available?: boolean;
    capability?: string[];
    provider?: string;
    includeArchived?: boolean; // NEW
  },
  userTier?: SubscriptionTier
): Promise<ModelListResponse> {
  // Build where clause
  const where: any = {};

  if (filters?.available !== undefined) {
    where.isAvailable = filters.available;
  }

  // Exclude archived by default (unless admin explicitly includes)
  if (!filters?.includeArchived) {
    where.isArchived = false;
  }

  // ... rest of implementation
}
```

**Acceptance Criteria**:
- ✅ Archived models excluded from public endpoints
- ✅ Legacy models show deprecation info
- ✅ Backwards compatible (existing tests still pass)

**Estimated Time**: 2 hours

---

#### Task 3.3: Update IModelService Interface
**File**: `backend/src/interfaces/services/model.interface.ts`
**Agent**: Manual

**Actions**:
1. Add method signatures for lifecycle operations
2. Update existing method signatures with new parameters
3. Add JSDoc comments

**Implementation**:
```typescript
export interface IModelService {
  // ... existing methods with updated signatures ...

  // NEW: Lifecycle Management
  markAsLegacy(
    modelId: string,
    options: {
      replacementModelId?: string;
      deprecationNotice?: string;
      sunsetDate?: Date;
    },
    adminUserId: string
  ): Promise<void>;

  unmarkLegacy(modelId: string, adminUserId: string): Promise<void>;

  archive(modelId: string, reason: string, adminUserId: string): Promise<void>;

  unarchive(modelId: string, adminUserId: string): Promise<void>;

  updateModelMeta(
    modelId: string,
    metaUpdates: Partial<ModelMeta>,
    adminUserId: string
  ): Promise<void>;

  addModel(
    modelData: {
      id: string;
      name: string;
      provider: string;
      meta: ModelMeta;
    },
    adminUserId: string
  ): Promise<void>;

  // NEW: Reporting
  getLegacyModels(): Promise<ModelListResponse>;
  getArchivedModels(): Promise<ModelListResponse>;
}
```

**Acceptance Criteria**:
- ✅ Interface matches implementation
- ✅ TypeScript compilation successful

**Estimated Time**: 30 minutes

---

### Phase 4: API Endpoints

#### Task 4.1: Create Admin Models Controller
**File**: `backend/src/controllers/admin-models.controller.ts` (NEW)
**Agent**: api-backend-implementer

**Actions**:
1. Create controller class with DI
2. Implement lifecycle endpoint handlers:
   - `markModelAsLegacy()` - POST `/admin/models/:id/mark-legacy`
   - `unmarkModelLegacy()` - POST `/admin/models/:id/unmark-legacy`
   - `archiveModel()` - POST `/admin/models/:id/archive`
   - `unarchiveModel()` - POST `/admin/models/:id/unarchive`
   - `updateModelMetadata()` - PATCH `/admin/models/:id/meta`
   - `createModel()` - POST `/admin/models`
   - `listLegacyModels()` - GET `/admin/models/legacy`
   - `listArchivedModels()` - GET `/admin/models/archived`

**Implementation Pattern**:
```typescript
@injectable()
export class AdminModelsController {
  constructor(
    @inject('IModelService') private modelService: IModelService,
    @inject('ILogger') private logger: ILogger
  ) {}

  async markModelAsLegacy(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: modelId } = req.params;
      const { replacementModelId, deprecationNotice, sunsetDate } = req.body;
      const adminUserId = req.user?.sub; // From JWT

      await this.modelService.markAsLegacy(
        modelId,
        {
          replacementModelId,
          deprecationNotice,
          sunsetDate: sunsetDate ? new Date(sunsetDate) : undefined,
        },
        adminUserId
      );

      res.status(200).json({
        message: `Model ${modelId} marked as legacy`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ... other handlers ...
}
```

**Acceptance Criteria**:
- ✅ All endpoints implemented
- ✅ Request validation (Zod schemas)
- ✅ Error handling
- ✅ Admin user ID extracted from JWT
- ✅ Returns standardized JSON responses

**Estimated Time**: 3 hours

---

#### Task 4.2: Create Admin Models Routes
**File**: `backend/src/api/admin/models.ts` (NEW)
**Agent**: api-backend-implementer

**Actions**:
1. Create Express router
2. Register lifecycle endpoints
3. Apply authentication middleware
4. Apply admin authorization middleware
5. Apply request validation middleware

**Implementation**:
```typescript
import { Router } from 'express';
import { container } from 'tsyringe';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validate-request';
import { AdminModelsController } from '../../controllers/admin-models.controller';
import { markLegacySchema, archiveSchema, updateMetaSchema, createModelSchema } from './validation';

const router = Router();
const controller = container.resolve(AdminModelsController);

// All routes require admin role
router.use(authenticate());
router.use(requireRole(['admin', 'super_admin']));

// Lifecycle operations
router.post('/:id/mark-legacy', validateRequest(markLegacySchema), controller.markModelAsLegacy.bind(controller));
router.post('/:id/unmark-legacy', controller.unmarkModelLegacy.bind(controller));
router.post('/:id/archive', validateRequest(archiveSchema), controller.archiveModel.bind(controller));
router.post('/:id/unarchive', controller.unarchiveModel.bind(controller));

// Model management
router.post('/', validateRequest(createModelSchema), controller.createModel.bind(controller));
router.patch('/:id/meta', validateRequest(updateMetaSchema), controller.updateModelMetadata.bind(controller));

// Reporting
router.get('/legacy', controller.listLegacyModels.bind(controller));
router.get('/archived', controller.listArchivedModels.bind(controller));

export default router;
```

**Acceptance Criteria**:
- ✅ All routes registered
- ✅ Middleware applied correctly
- ✅ Routes exported for server.ts

**Estimated Time**: 1 hour

---

#### Task 4.3: Register Routes in Server
**File**: `backend/src/server.ts`
**Agent**: Manual

**Actions**:
1. Import admin models router
2. Register under `/admin/models` path

**Implementation**:
```typescript
import adminModelsRouter from './api/admin/models';

// ... existing code ...

// Admin routes (after existing admin routes)
app.use('/admin/models', adminModelsRouter);
```

**Acceptance Criteria**:
- ✅ Routes accessible at `/admin/models/*`
- ✅ Server starts without errors
- ✅ Test with curl/Postman

**Estimated Time**: 5 minutes

---

### Phase 5: Frontend Dashboard (Optional for MVP)

#### Task 5.1: Create Model Management Page
**File**: `frontend/src/pages/AdminDashboard/ModelManagement.tsx` (NEW)
**Agent**: Manual or frontend specialist

**Actions**:
1. Create page component
2. Add filters (Status, Provider, Tier)
3. Add model table with lifecycle actions
4. Add dialogs for mark legacy, archive confirmations

**Defer to Phase 7** (Post-MVP enhancement)

---

### Phase 6: Testing & QA

#### Task 6.1: Unit Tests for ModelService
**File**: `backend/src/__tests__/unit/model.service.lifecycle.test.ts` (NEW)
**Agent**: testing-qa-specialist

**Test Cases**:
- ✅ `markAsLegacy()` - Sets isLegacy, updates meta, clears cache
- ✅ `unmarkLegacy()` - Removes legacy status
- ✅ `archive()` - Sets archived flag, blocks inference
- ✅ `unarchive()` - Restores availability, preserves legacy status
- ✅ `updateModelMeta()` - Validates schema, rejects invalid
- ✅ `addModel()` - Creates with valid meta JSONB
- ✅ Validation errors for missing replacement model
- ✅ Validation errors for past sunset dates

**Estimated Time**: 3 hours

---

#### Task 6.2: Integration Tests for Admin Endpoints
**File**: `backend/src/__tests__/integration/admin-models.lifecycle.test.ts` (NEW)
**Agent**: testing-qa-specialist

**Test Cases**:
- ✅ POST `/admin/models/:id/mark-legacy` - Returns 200, model updated
- ✅ POST `/admin/models/:id/archive` - Blocks inference
- ✅ GET `/v1/models` - Excludes archived, shows legacy flag
- ✅ GET `/admin/models/archived?includeArchived=true` - Shows archived (admin only)
- ✅ Non-admin users get 403 Forbidden
- ✅ Invalid model ID returns 404 Not Found

**Estimated Time**: 3 hours

---

#### Task 6.3: Update Seed Scripts
**File**: `backend/prisma/seed.ts`
**Agent**: Manual

**Actions**:
1. Update model seed data to use `meta` JSONB format
2. Add example legacy model (GPT-3.5)
3. Add example archived model (GPT-2)

**Implementation**:
```typescript
const models = [
  {
    id: 'gpt-4',
    name: 'gpt-4',
    provider: 'openai',
    isAvailable: true,
    isLegacy: false,
    isArchived: false,
    meta: {
      displayName: 'GPT-4',
      description: 'OpenAI GPT-4 with 8K context',
      capabilities: ['text', 'function_calling', 'code'],
      contextLength: 8192,
      maxOutputTokens: 4096,
      inputCostPerMillionTokens: 3000,
      outputCostPerMillionTokens: 6000,
      creditsPer1kTokens: 10,
      requiredTier: 'pro',
      tierRestrictionMode: 'minimum',
      allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'gpt-3.5-turbo',
    provider: 'openai',
    isAvailable: true,
    isLegacy: true, // LEGACY MODEL
    isArchived: false,
    meta: {
      displayName: 'GPT-3.5 Turbo (Legacy)',
      description: 'Legacy GPT-3.5 model',
      capabilities: ['text', 'function_calling'],
      contextLength: 4096,
      maxOutputTokens: 4096,
      inputCostPerMillionTokens: 500,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 3,
      requiredTier: 'free',
      tierRestrictionMode: 'minimum',
      allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
      legacyReplacementModelId: 'gpt-4',
      deprecationNotice: 'GPT-3.5 Turbo is deprecated. Please upgrade to GPT-4.',
      sunsetDate: '2025-12-31T23:59:59Z',
    },
  },
  // ... more models ...
];

await prisma.model.createMany({ data: models, skipDuplicates: true });
```

**Acceptance Criteria**:
- ✅ Seed script runs successfully
- ✅ All models have valid `meta` JSONB
- ✅ Legacy and archived examples included

**Estimated Time**: 1 hour

---

## Execution Strategy

### Option A: Sequential Implementation (Recommended)
Execute tasks in order, marking each as complete before moving to next.

**Advantages**:
- Lower risk
- Easier to debug
- Can test incrementally

**Timeline**: 6-8 days

---

### Option B: Parallel Implementation (Advanced)
Delegate independent tasks to specialized agents simultaneously.

**Parallel Workstreams**:
1. **DB Team**: Tasks 1.1, 1.2, 1.3 (Phase 1)
2. **Type Team**: Tasks 2.1, 2.2 (Phase 2)
3. **Backend Team**: Tasks 3.1, 3.2, 3.3 (Phase 3) - starts after Phase 1 & 2 complete
4. **API Team**: Tasks 4.1, 4.2, 4.3 (Phase 4) - starts after Phase 3
5. **Testing Team**: Tasks 6.1, 6.2 (Phase 6) - starts after Phase 4

**Advantages**:
- Faster delivery (3-4 days total)
- Efficient resource use

**Risks**:
- Coordination overhead
- Integration issues
- Harder to debug

**Timeline**: 3-5 days

---

## Rollback Plan

### If Migration Fails

1. **Rollback Migration**:
   ```bash
   cd backend
   npx prisma migrate resolve --rolled-back 20251112000000_add_model_lifecycle_jsonb_meta
   ```

2. **Restore from Backup**:
   - Use PostgreSQL backup from before migration
   - Restore with `pg_restore`

3. **Revert Code Changes**:
   ```bash
   git revert <commit-hash>
   git push
   ```

---

## Success Metrics

### Functional Metrics
- ✅ All 16 tasks completed successfully
- ✅ 100% test coverage on lifecycle methods
- ✅ Zero production incidents during rollout
- ✅ Archived models excluded from `/v1/models`
- ✅ Legacy models show deprecation notices

### Performance Metrics
- ✅ JSONB queries complete within 50ms (p95)
- ✅ Model list endpoint < 100ms (p95)
- ✅ Cache hit rate > 90%

### Quality Metrics
- ✅ All TypeScript strict mode checks pass
- ✅ All linter warnings resolved
- ✅ API documentation updated
- ✅ Audit logs captured for all lifecycle changes

---

## Next Steps

After completing this implementation plan:

1. **Run Comprehensive QA** (Task 6.1, 6.2, 6.3)
2. **Deploy to Staging** (test with real data)
3. **Performance Testing** (1000+ models)
4. **Production Deployment** (phased rollout)
5. **Monitor & Iterate** (30-day observation period)
6. **Phase 7: Drop Old Columns** (docs/plan/158-model-lifecycle-column-cleanup.md)

---

## Conclusion

This implementation plan provides a clear roadmap for delivering Model Lifecycle Management with JSONB Meta refactor. The phased approach ensures backwards compatibility while enabling future extensibility.

**Recommendation**: Start with **Option A (Sequential Implementation)** for lower risk and easier debugging. Once Phase 1-3 are stable, consider parallelizing Phases 4-6 for faster delivery.

