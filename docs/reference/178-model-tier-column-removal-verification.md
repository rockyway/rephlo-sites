# Model Tier Column Removal Verification

## Migration Details

**Migration File**: `20251113120000_remove_model_tier_columns_add_jsonb_indexes`

**Purpose**: Phase 4 cleanup - Remove legacy tier columns from Model table after successful JSONB migration

**Architecture Reference**: `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md` (lines 674-693, 596-606)

---

## Changes Applied

### 1. Dropped Legacy Columns

The following three columns have been removed from the `models` table:

```sql
ALTER TABLE models DROP COLUMN IF EXISTS required_tier;
ALTER TABLE models DROP COLUMN IF EXISTS tier_restriction_mode;
ALTER TABLE models DROP COLUMN IF EXISTS allowed_tiers;
```

**Rationale**: These columns are now fully replaced by the `meta` JSONB column, which stores:
- `meta->>'requiredTier'` (string, e.g., "pro", "enterprise_pro")
- `meta->>'tierRestrictionMode'` (string, e.g., "minimum", "exact", "whitelist")
- `meta->'allowedTiers'` (JSON array, e.g., `["free", "pro", "pro_max"]`)

---

### 2. Created JSONB Indexes

Three indexes were created for optimal query performance:

#### a. General GIN Index
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_models_meta_gin
  ON models USING gin(meta);
```
- **Purpose**: Supports general JSONB queries with operators: `@>`, `?`, `?&`, `?|`
- **Use Cases**:
  - Find models with specific capabilities: `WHERE meta @> '{"capabilities": ["vision"]}'`
  - Check if field exists: `WHERE meta ? 'legacyReplacementModelId'`

#### b. BTree Index on requiredTier
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_models_meta_required_tier
  ON models USING btree((meta->>'requiredTier'));
```
- **Purpose**: Fast equality checks for tier filtering (most common query)
- **Use Cases**:
  - Filter by tier: `WHERE meta->>'requiredTier' = 'pro'`
  - Tier comparison: `WHERE meta->>'requiredTier' IN ('pro', 'pro_max')`

#### c. GIN Index on capabilities
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_models_meta_capabilities
  ON models USING gin((meta->'capabilities'));
```
- **Purpose**: Fast array containment queries for capabilities
- **Use Cases**:
  - Find models with specific capability: `WHERE meta->'capabilities' @> '"vision"'`
  - Multiple capabilities: `WHERE meta->'capabilities' ?& array['vision', 'function_calling']`

---

## Updated Prisma Schema

### Model Definition (Before)
```prisma
model Model {
  // ... other fields ...

  // OLD FIELDS - Removed in migration 20251113120000
  requiredTier               SubscriptionTier? @default(free) @map("required_tier")
  tierRestrictionMode        String?           @default("minimum") @map("tier_restriction_mode") @db.VarChar(20)
  allowedTiers               SubscriptionTier[] @default([free, pro, pro_max, enterprise_pro, enterprise_max]) @map("allowed_tiers")
}
```

### Model Definition (After)
```prisma
model Model {
  // Core Identity Fields (Remain in columns for query performance)
  id       String @id @db.VarChar(100)
  name     String @db.VarChar(255)
  provider String @db.VarChar(100)

  // Lifecycle State Fields (Indexed for fast filtering)
  isAvailable Boolean @default(true) @map("is_available")
  isLegacy    Boolean @default(false) @map("is_legacy")
  isArchived  Boolean @default(false) @map("is_archived")

  // JSONB Metadata - All variable/descriptive properties consolidated
  // Contains: displayName, description, version, capabilities, contextLength,
  // maxOutputTokens, inputCostPerMillionTokens, outputCostPerMillionTokens,
  // creditsPer1kTokens, requiredTier, tierRestrictionMode, allowedTiers,
  // legacyReplacementModelId, deprecationNotice, sunsetDate, providerMetadata, etc.
  meta Json @db.JsonB

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // OLD FIELDS (Deprecated - Keep during transition, will be removed after migration)
  // TODO: Remove these fields after verifying meta JSONB migration is successful
  displayName                String?           @map("display_name") @db.VarChar(255)
  description                String?           @db.Text
  capabilities               ModelCapability[]
  contextLength              Int?              @map("context_length")
  maxOutputTokens            Int?              @map("max_output_tokens")
  inputCostPerMillionTokens  Int?              @map("input_cost_per_million_tokens")
  outputCostPerMillionTokens Int?              @map("output_cost_per_million_tokens")
  creditsPer1kTokens         Int?              @map("credits_per_1k_tokens")
  isDeprecated               Boolean?          @default(false) @map("is_deprecated")
  version                    String?           @db.VarChar(50)
  // Tier-related fields removed - now stored in meta JSONB (migration 20251113120000)

  // Relations
  usageHistory    UsageHistory[]
  userPreferences UserPreference[]
  auditLogs       ModelTierAuditLog[]

  // Indexes for lifecycle states and provider filtering
  @@index([isAvailable])
  @@index([isLegacy])
  @@index([isArchived])
  @@index([provider])
  @@index([isAvailable, isArchived]) // Common query: active non-archived models
  // Note: GIN and BTree indexes on meta JSONB added via raw SQL (migration 20251113120000)
  // - idx_models_meta_gin: GIN index for general JSONB queries
  // - idx_models_meta_required_tier: BTree index for requiredTier equality checks
  // - idx_models_meta_capabilities: GIN index for capabilities array queries
  @@map("models")
}
```

---

## Verification Checklist

After running the migration, verify the following:

### 1. Columns Removed
```sql
-- Should return NO results for tier-related columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'models'
  AND column_name IN ('required_tier', 'tier_restriction_mode', 'allowed_tiers');
```

### 2. Indexes Created
```sql
-- Should return 3 rows
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'models'
  AND indexname IN (
    'idx_models_meta_gin',
    'idx_models_meta_required_tier',
    'idx_models_meta_capabilities'
  );
```

### 3. Data Accessible in JSONB
```sql
-- Should return models with tier data from meta JSONB
SELECT
  id,
  name,
  meta->>'requiredTier' AS required_tier,
  meta->>'tierRestrictionMode' AS tier_restriction_mode,
  meta->'allowedTiers' AS allowed_tiers
FROM models
WHERE meta->>'requiredTier' IS NOT NULL
LIMIT 5;
```

### 4. Index Performance Test
```sql
-- Should use idx_models_meta_required_tier index
EXPLAIN ANALYZE
SELECT id, name, meta->>'requiredTier' AS tier
FROM models
WHERE meta->>'requiredTier' = 'pro';
```

Expected output should include:
```
-> Index Scan using idx_models_meta_required_tier on models
```

---

## Migration Execution

### Development Environment
```bash
cd backend
npm run prisma:migrate
# Review migration preview
# Confirm execution
```

### Production Environment
```bash
# Dry run first
npx prisma migrate deploy --preview-feature

# Execute migration (uses CONCURRENTLY to avoid table locks)
npx prisma migrate deploy
```

**Note**: `CREATE INDEX CONCURRENTLY` allows the migration to run without locking the `models` table, ensuring zero downtime.

---

## Rollback Plan

If issues are discovered, rollback is **NOT POSSIBLE** because:
1. Data has been fully migrated to `meta` JSONB in previous migration (20251112120000)
2. Dropping columns is irreversible without data loss

**Prevention Strategy**:
- Run migration in staging environment first
- Verify all tier-related queries work with `meta` JSONB
- Test model tier permission checks in ModelPermissionService
- Ensure ModelTierAdminService uses `meta` JSONB exclusively

---

## Code Impact

### Services Using Tier Data

All services now MUST use `meta` JSONB for tier access:

**ModelService**:
```typescript
// ✅ CORRECT - Use meta JSONB
const tier = model.meta.requiredTier;
const mode = model.meta.tierRestrictionMode;
const allowedTiers = model.meta.allowedTiers;

// ❌ WRONG - These columns no longer exist
const tier = model.requiredTier;
const mode = model.tierRestrictionMode;
const allowedTiers = model.allowedTiers;
```

**ModelPermissionService**:
```typescript
// All permission checks now use model.meta.requiredTier
canUserAccessModel(user: User, model: Model): boolean {
  const requiredTier = model.meta.requiredTier as SubscriptionTier;
  const userTier = user.subscription.tier;
  return this.compareTiers(userTier, requiredTier) >= 0;
}
```

**ModelTierAdminService**:
```typescript
// All admin updates now modify meta JSONB
async updateModelTier(modelId: string, tierData: ModelTierUpdateDto): Promise<Model> {
  return this.prisma.model.update({
    where: { id: modelId },
    data: {
      meta: {
        ...model.meta,
        requiredTier: tierData.requiredTier,
        tierRestrictionMode: tierData.tierRestrictionMode,
        allowedTiers: tierData.allowedTiers
      }
    }
  });
}
```

---

## Testing Requirements

Before deploying to production:

1. **Unit Tests**: All ModelService tier methods pass
2. **Integration Tests**: API endpoints using tier filtering work correctly
3. **Performance Tests**: Index performance meets SLA (<50ms for tier queries)
4. **UI Tests**: Admin model management UI displays tier data correctly
5. **Permissions Tests**: Model permission hooks enforce tier restrictions

---

## Success Criteria

Migration is successful when:

- [ ] All three tier columns are dropped from `models` table
- [ ] All three JSONB indexes are created successfully
- [ ] No errors in application logs related to tier access
- [ ] Model tier filtering performance is equal or better than before
- [ ] Admin UI shows tier data correctly from `meta` JSONB
- [ ] Permission checks work correctly with JSONB tier data
- [ ] Prisma client regenerated without errors
- [ ] All tests pass in CI/CD pipeline

---

## Related Documentation

- **Architecture**: `docs/plan/156-model-lifecycle-jsonb-refactor-architecture.md`
- **Migration History**: `backend/prisma/migrations/20251112120000_add_model_lifecycle_jsonb_meta/`
- **Service Updates**: Review `backend/src/services/model.service.ts` and `backend/src/services/admin/model-tier-admin.service.ts`
- **Type Definitions**: `backend/src/types/model-meta.types.ts`

---

## Notes

- This migration uses `CREATE INDEX CONCURRENTLY` to avoid locking the `models` table during index creation
- The `IF NOT EXISTS` clause ensures idempotency (migration can be run multiple times safely)
- All tier data was migrated to `meta` JSONB in migration `20251112120000`, so dropping columns is safe
- Remaining legacy columns (displayName, description, etc.) will be removed in a future migration after full verification
