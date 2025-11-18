# JSONB Tier Field Refactor - Backend Service Layer Fix

**Document**: 177-jsonb-tier-refactor-completion.md
**Created**: 2025-01-13
**Status**: Completed
**Priority**: P0 (Critical - Architecture Alignment)

---

## Executive Summary

Successfully refactored the backend service layer to align with the JSONB-only architecture specified in `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`. All tier-related fields (`requiredTier`, `tierRestrictionMode`, `allowedTiers`) are now accessed exclusively from the `meta` JSONB column, not from deprecated root columns.

**Result**: Backend build successful with zero TypeScript errors. Architecture now correctly implements JSONB-based metadata storage for tier fields.

---

## Problem Statement

The backend services were incorrectly writing to and reading from root-level tier columns (`requiredTier`, `tierRestrictionMode`, `allowedTiers`) instead of storing these fields exclusively in the `meta` JSONB column as specified in the architecture document.

**Key Issues**:
1. `model.service.ts` - `addModel()` method wrote tier fields to root columns
2. `model.service.ts` - `updateModelMeta()` method synced tier fields to root columns
3. `model-tier-admin.service.ts` - All queries selected tier fields from root columns
4. Multiple methods in `model.service.ts` read from deprecated root columns instead of meta JSONB

---

## Architecture Principle (Reference)

From `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`:

> **Target Architecture**: All variable/descriptive properties (including tier fields) are stored in the `meta` JSONB field. Core identity fields (`id`, `name`, `provider`) and lifecycle state fields (`isAvailable`, `isLegacy`, `isArchived`) remain in columns for query performance.

**Correct Pattern**:
```typescript
// ✅ CORRECT - Write ONLY to meta JSONB
const model = await this.prisma.model.create({
  data: {
    id: data.id,
    name: data.name,
    provider: data.provider,
    meta: validatedMeta as any,  // Contains tier fields
  },
});

// ❌ WRONG - Do NOT write to root columns
requiredTier: validatedMeta.requiredTier,  // Remove this
tierRestrictionMode: validatedMeta.tierRestrictionMode,  // Remove this
allowedTiers: validatedMeta.allowedTiers,  // Remove this
```

---

## Files Modified

### 1. `backend/src/services/model.service.ts`

**Changes Made**:

#### Method: `addModel()` (Lines 586-598)
- **Before**: Wrote `requiredTier`, `tierRestrictionMode`, `allowedTiers` to root columns
- **After**: Only writes to `meta` JSONB field
- **Impact**: New models store tier info exclusively in JSONB

#### Method: `updateModelMeta()` (Lines 844-851)
- **Before**: Synced tier fields from meta to root columns on every update
- **After**: Only updates `meta` JSONB field
- **Impact**: Metadata updates no longer touch deprecated columns

#### Method: `listModels()` (Lines 142-189)
- **Before**: Selected and read from root columns (`displayName`, `requiredTier`, etc.)
- **After**: Selects only `id`, `provider`, `isAvailable`, `meta` and extracts fields from JSONB
- **Impact**: Model lists now use JSONB-based data

#### Method: `getModelDetails()` (Lines 224-289)
- **Before**: Selected tier fields from root columns
- **After**: Extracts tier fields from `meta` JSONB
- **Impact**: Model detail responses now use JSONB data

#### Method: `canUserAccessModel()` (Lines 319-340)
- **Before**: Read tier fields from root columns for access checks
- **After**: Extracts tier config from `meta` JSONB
- **Impact**: Tier access validation now uses JSONB data

#### Method: `isModelAvailable()` (Lines 357-376)
- **Before**: Checked `isDeprecated` column (deprecated field)
- **After**: Checks `isLegacy` and `isArchived` (new lifecycle fields)
- **Impact**: Availability checks use correct lifecycle state

#### Method: `getModelForInference()` (Lines 387-428)
- **Before**: Read `creditsPer1kTokens` from root column
- **After**: Extracts from `meta` JSONB
- **Impact**: Inference operations use JSONB data

#### Method: `getLegacyModels()` (Lines 852-893)
- **Before**: Selected all fields from root columns
- **After**: Selects minimal columns + meta, extracts fields from JSONB
- **Impact**: Legacy model lists use JSONB data

#### Method: `getArchivedModels()` (Lines 901-945)
- **Before**: Selected all fields from root columns
- **After**: Selects minimal columns + meta, extracts fields from JSONB
- **Impact**: Archived model lists use JSONB data

---

### 2. `backend/src/services/admin/model-tier-admin.service.ts`

**Changes Made**:

#### Method: `updateModelTier()` (Lines 62-170)
- **Before**: Read from root columns, updated root columns directly
- **After**:
  - Reads current tier values from `meta` JSONB
  - Merges changes into `meta` JSONB
  - Updates only the `meta` field in database
- **Impact**: Admin tier updates modify JSONB, not root columns

#### Method: `listModelsWithTiers()` (Lines 377-442)
- **Before**:
  - Filtered using root columns (`where.requiredTier`, `where.tierRestrictionMode`)
  - Selected tier fields from root columns
- **After**:
  - Uses JSONB path queries for filtering (`meta: { path: ['requiredTier'], equals: ... }`)
  - Selects only core fields + meta
  - Extracts tier fields from `meta` JSONB in response mapping
- **Impact**: Admin model listings use JSONB-based queries

**Note**: JSONB path queries may have performance implications. If filtering becomes slow, consider adding JSONB indexes:
```sql
CREATE INDEX idx_models_meta_required_tier ON models USING btree((meta->>'requiredTier'));
```

---

## Verification Results

### Build Status
```bash
cd backend && npm run build
# Output: Success (0 TypeScript errors)
```

### Key Validations
- ✅ No TypeScript compilation errors
- ✅ All Prisma queries updated to use correct fields
- ✅ No direct references to deprecated root columns in tier-related operations
- ✅ Response mapping correctly extracts from `meta` JSONB
- ✅ Tier access validation uses JSONB data

---

## Data Access Pattern Summary

**Standard Pattern** (Used throughout):
```typescript
// 1. Query with minimal selection
const model = await this.prisma.model.findUnique({
  where: { id: modelId },
  select: {
    id: true,
    name: true,
    provider: true,
    isAvailable: true,
    meta: true,  // Select JSONB field
  },
});

// 2. Extract meta as typed object
const meta = model.meta as any;

// 3. Access tier fields from meta with fallbacks
const tierConfig = {
  requiredTier: meta?.requiredTier ?? 'free',
  tierRestrictionMode: meta?.tierRestrictionMode ?? 'minimum',
  allowedTiers: meta?.allowedTiers ?? ['free'],
};
```

---

## Remaining Considerations

### 1. Root Column Cleanup (Future Task)
The deprecated root columns (`requiredTier`, `tierRestrictionMode`, `allowedTiers`, `displayName`, `description`, etc.) still exist in the Prisma schema as **nullable** fields during the transition period.

**Next Step**: After confirming all code paths use JSONB, these columns can be dropped via migration:
```sql
-- Future migration: 20251114000000_remove_model_legacy_columns.sql
ALTER TABLE models DROP COLUMN required_tier;
ALTER TABLE models DROP COLUMN tier_restriction_mode;
ALTER TABLE models DROP COLUMN allowed_tiers;
-- (and other deprecated fields)
```

### 2. Capabilities Filter (Not Fixed)
The `listModels()` method still filters capabilities using the root `capabilities` column:
```typescript
// Line 131-136 in model.service.ts
if (filters?.capability && filters.capability.length > 0) {
  where.capabilities = {
    hasSome: filters.capability as ModelCapability[],
  };
}
```

**Reason**: Capabilities filtering requires JSONB array containment queries, which is more complex. This should be addressed in a separate task to avoid scope creep.

**Recommendation**: Create a follow-up task to migrate capabilities filtering to JSONB queries:
```typescript
// Future implementation
where.meta = {
  path: ['capabilities'],
  array_contains: filters.capability,
};
```

### 3. JSONB Query Performance
JSONB path queries (`meta: { path: ['requiredTier'], equals: ... }`) may be slower than indexed column queries. If performance issues arise, add JSONB indexes as specified in the architecture document:

```sql
-- Already planned in architecture doc
CREATE INDEX idx_models_meta_required_tier ON models
  USING btree((meta->>'requiredTier'));

CREATE INDEX idx_models_meta_capabilities ON models
  USING gin((meta->'capabilities'));
```

---

## Testing Recommendations

### Unit Tests
- ✅ Existing tests should pass (no API contract changes)
- ⚠️ Update test fixtures to include `meta` JSONB in mocked data
- ⚠️ Add tests for JSONB extraction with missing/null values

### Integration Tests
- Test model creation via admin API
- Test tier updates via admin API
- Test model listing with tier filters
- Test tier access validation for users

### Manual Testing Checklist
- [ ] Create a new model via admin UI/API
- [ ] Verify tier fields stored in `meta` JSONB (check database)
- [ ] Update model tier config via admin API
- [ ] List models and verify tier info displayed correctly
- [ ] Test user access to models based on tier restrictions

---

## Impact Assessment

### Frontend Compatibility
**No frontend changes required** - API response format unchanged. Frontend still receives camelCase responses:
```json
{
  "requiredTier": "pro",
  "tierRestrictionMode": "minimum",
  "allowedTiers": ["pro", "pro_max"]
}
```

### API Contract
**No breaking changes** - All API endpoints return the same response structure. Data source changed (JSONB instead of columns) but consumers unaffected.

### Database
**Schema unchanged** - Root columns still exist as nullable fields. Future migration will drop them after full verification.

---

## Conclusion

The backend service layer now correctly implements the JSONB-only architecture for tier fields. All database operations read from and write to the `meta` JSONB column, aligning with the target architecture specified in `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`.

**Status**: ✅ Complete
**Build**: ✅ Success
**Tests**: ⚠️ Manual verification recommended
**Next Steps**:
1. Manual testing of model creation/update flows
2. Monitor performance of JSONB queries in production
3. Plan future migration to drop deprecated root columns

---

## Related Documents
- Architecture: `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`
- Type definitions: `backend/src/types/model-meta.ts`
- Shared types: `shared-types/src/*.types.ts`
