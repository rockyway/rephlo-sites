# Model Lifecycle Management & JSONB Meta Refactor - Architecture Design

**Document**: 156-model-lifecycle-jsonb-refactor-architecture.md
**Created**: 2025-11-12
**Status**: Architecture Design
**Priority**: P0 (Critical)

---

## Executive Summary

This document defines the architecture for enhancing the Model management system with complete lifecycle operations and simplifying the schema through JSONB consolidation. The refactor addresses three critical needs:

1. **Model Creation & Management**: Enable admins to add new models as providers release them (GPT-5, Claude 4, Gemini 2.0, etc.) without requiring code deployments
2. **Lifecycle Management**: Enable admin operations for marking models as legacy, archiving, and managing deprecation workflows
3. **Schema Simplification**: Consolidate 15+ individual columns into a single `meta` JSONB field for improved flexibility and maintainability

**Key Capability**: Admins can add new models through the UI/API within minutes of provider announcement, without developer intervention

---

## Current State Analysis

### Existing Model Schema (Lines 495-531 in schema.prisma)

```prisma
model Model {
  id                         String            @id @db.VarChar(100)
  name                       String            @db.VarChar(255)
  displayName                String            @map("display_name") @db.VarChar(255)
  provider                   String            @db.VarChar(100)
  description                String?           @db.Text
  capabilities               ModelCapability[]
  contextLength              Int               @map("context_length")
  maxOutputTokens            Int?              @map("max_output_tokens")
  inputCostPerMillionTokens  Int               @map("input_cost_per_million_tokens")
  outputCostPerMillionTokens Int               @map("output_cost_per_million_tokens")
  creditsPer1kTokens         Int               @map("credits_per_1k_tokens")
  isAvailable                Boolean           @default(true) @map("is_available")
  isDeprecated               Boolean           @default(false) @map("is_deprecated")
  version                    String?           @db.VarChar(50)
  createdAt                  DateTime          @default(now()) @map("created_at")
  updatedAt                  DateTime          @updatedAt @map("updated_at")
  requiredTier               SubscriptionTier  @default(free) @map("required_tier")
  tierRestrictionMode        String            @default("minimum") @map("tier_restriction_mode") @db.VarChar(20)
  allowedTiers               SubscriptionTier[] @default([free, pro, pro_max, enterprise_pro, enterprise_max]) @map("allowed_tiers")
}
```

**Issues**:
- 15+ individual columns make schema changes require migrations
- No legacy/archive lifecycle support
- Mixing core identity fields with metadata
- Difficult to add provider-specific metadata
- Hard to version metadata schema changes

### Current ModelService (model.service.ts)

**Existing Methods**:
- `listModels()` - List with filters
- `getModelDetails()` - Get single model
- `canUserAccessModel()` - Tier access check
- `isModelAvailable()` - Availability validation
- `getModelForInference()` - Internal use for LLM service
- `refreshCache()` - Cache management
- `getModelUsageStats()` - Usage analytics

**Missing Lifecycle Operations**:
- No `markAsLegacy()` / `unmarkLegacy()`
- No `archive()` / `unarchive()`
- No legacy replacement tracking
- No admin audit logging for lifecycle changes

---

## Target Architecture

### Refactored Model Schema

```prisma
model Model {
  // Core Identity Fields (Required, Immutable)
  id          String   @id @db.VarChar(100)
  name        String   @db.VarChar(255)
  provider    String   @db.VarChar(100)

  // Lifecycle State Fields
  isAvailable Boolean  @default(true) @map("is_available")
  isLegacy    Boolean  @default(false) @map("is_legacy")
  isArchived  Boolean  @default(false) @map("is_archived")

  // JSONB Metadata (All variable/descriptive properties)
  meta        Json     @db.JsonB

  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  usageHistory    UsageHistory[]
  userPreferences UserPreference[]
  auditLogs       ModelTierAuditLog[]

  // Indexes
  @@index([isAvailable])
  @@index([isLegacy])
  @@index([isArchived])
  @@index([provider])
  @@index(fields: [meta], type: Gin) // JSONB index for query performance
  @@map("models")
}
```

### JSONB Meta Schema

The `meta` field will store all variable properties in a validated JSON structure:

```typescript
interface ModelMeta {
  // Display Information
  displayName: string;
  description?: string;
  version?: string;

  // Capabilities
  capabilities: ('text' | 'vision' | 'function_calling' | 'code' | 'long_context')[];

  // Context & Output Limits
  contextLength: number;
  maxOutputTokens?: number;

  // Pricing (in smallest currency unit - cents for USD)
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  creditsPer1kTokens: number;

  // Tier Access Control
  requiredTier: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual';
  tierRestrictionMode: 'minimum' | 'exact' | 'whitelist';
  allowedTiers: ('free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual')[];

  // Legacy Management (Optional)
  legacyReplacementModelId?: string; // ID of recommended replacement model
  deprecationNotice?: string;        // User-facing deprecation message
  sunsetDate?: string;               // ISO 8601 date when model will be removed

  // Provider-Specific Extensions (Flexible)
  providerMetadata?: {
    // OpenAI-specific
    openai?: {
      modelFamily?: string;         // 'gpt-4', 'gpt-3.5'
      trainingCutoff?: string;      // '2023-09'
    };

    // Anthropic-specific
    anthropic?: {
      modelSeries?: string;         // 'claude-3', 'claude-2'
      knowledgeCutoff?: string;
    };

    // Google-specific
    google?: {
      modelType?: string;           // 'gemini-pro', 'palm'
      tuningSupport?: boolean;
    };

    // Future providers can add fields without schema migration
  };

  // Admin Metadata
  internalNotes?: string;            // Admin-only notes
  complianceTags?: string[];         // GDPR, HIPAA, SOC2, etc.
}
```

**★ Insight ─────────────────────────────────────**
Using JSONB for metadata provides three key benefits:
1. **Schema Flexibility**: Add new provider-specific fields without migrations
2. **Query Performance**: Gin indexes enable fast JSON property searches
3. **Versioning**: Can evolve metadata schema with validation layers

The core fields (id, name, provider, state flags) remain in columns for optimal query performance on common filters.
─────────────────────────────────────────────────

---

## Lifecycle State Machine

### State Transitions

```
┌──────────────┐
│   ACTIVE     │ (isAvailable=true, isLegacy=false, isArchived=false)
│  (Default)   │
└──────┬───────┘
       │
       │ markAsLegacy()
       ▼
┌──────────────┐
│    LEGACY    │ (isAvailable=true, isLegacy=true, isArchived=false)
│ (Deprecated) │ ◄─┐
└──────┬───────┘   │ unmarkLegacy()
       │           │
       │ archive() │
       ▼           │
┌──────────────┐   │
│   ARCHIVED   │   │
│  (Inactive)  │ ──┘ unarchive() → returns to LEGACY if was marked
└──────────────┘
```

### Lifecycle Operations

#### 1. Mark as Legacy
**Purpose**: Flag model for deprecation without removing availability
**Business Logic**:
- Set `isLegacy = true`
- Optionally set `meta.legacyReplacementModelId`
- Optionally set `meta.deprecationNotice`
- Optionally set `meta.sunsetDate`
- Emit `model.marked_legacy` event for notifications
- Log audit trail

**API Response Changes**:
```json
{
  "id": "gpt-4",
  "isLegacy": true,
  "meta": {
    "legacyReplacementModelId": "gpt-5",
    "deprecationNotice": "GPT-4 will be deprecated on 2025-12-31. Please migrate to GPT-5.",
    "sunsetDate": "2025-12-31T23:59:59Z"
  }
}
```

#### 2. Unmark Legacy
**Purpose**: Restore model to active status
**Business Logic**:
- Set `isLegacy = false`
- Clear `meta.legacyReplacementModelId`, `deprecationNotice`, `sunsetDate`
- Emit `model.unmarked_legacy` event
- Log audit trail

#### 3. Archive Model
**Purpose**: Remove from active lists but preserve historical data
**Business Logic**:
- Set `isArchived = true`
- Set `isAvailable = false` (block inference)
- Preserve `isLegacy` state (can be both archived and legacy)
- Emit `model.archived` event
- Log audit trail

**Query Behavior**:
- `/v1/models` excludes archived by default
- `/v1/models?includeArchived=true` (admin only) shows all
- Inference endpoints reject with `MODEL_ARCHIVED` error

#### 4. Unarchive Model
**Purpose**: Restore archived model to availability
**Business Logic**:
- Set `isArchived = false`
- Set `isAvailable = true`
- Preserve `isLegacy` status (model may still be deprecated)
- Emit `model.unarchived` event
- Log audit trail

---

## Model Creation & Management (P0 - Critical)

### Overview: Zero-Downtime Model Addition

When providers release new models (e.g., GPT-5, Claude 4, Gemini 2.0 Pro), admins need the ability to add them to the system immediately without:
- Waiting for developer deployment
- Modifying code or configuration files
- Running database migrations
- Restarting backend services

**Goal**: Model available to users within 5 minutes of provider announcement.

### Model Creation Workflow

#### Step 1: Admin Accesses Model Creation UI/API

**Admin Dashboard Route**: `/admin/models/new`

**API Endpoint**: `POST /admin/models`

#### Step 2: Admin Fills Model Information Form

**Required Fields**:
```typescript
{
  id: "gpt-5",                    // Unique identifier (provider naming convention)
  name: "gpt-5",                  // Internal name
  provider: "openai",             // Provider slug
  meta: {
    // Display Information
    displayName: "GPT-5",
    description: "OpenAI's latest flagship model with 272K context",
    version: "1.0",

    // Capabilities (Multi-select checkboxes)
    capabilities: ["text", "vision", "function_calling", "long_context", "code"],

    // Context & Limits
    contextLength: 272000,
    maxOutputTokens: 128000,

    // Pricing (Copied from provider docs)
    inputCostPerMillionTokens: 1250,     // $1.25 per 1M input tokens
    outputCostPerMillionTokens: 10000,   // $10 per 1M output tokens

    // Internal Pricing (Auto-calculated or manual)
    creditsPer1kTokens: 28,              // Credits deducted per 1K tokens

    // Tier Access (Dropdown selections)
    requiredTier: "pro_max",
    tierRestrictionMode: "minimum",
    allowedTiers: ["pro_max", "enterprise_pro", "enterprise_max"],

    // Provider-Specific (Optional, JSON editor)
    providerMetadata: {
      openai: {
        modelFamily: "gpt-5",
        trainingCutoff: "2025-06"
      }
    },

    // Admin Notes (Optional)
    internalNotes: "Released 2025-11-12, high demand expected",
    complianceTags: ["SOC2", "GDPR"]
  }
}
```

#### Step 3: System Validation

**Validation Checks**:
1. ✅ Model ID uniqueness (check database)
2. ✅ Provider exists in system
3. ✅ JSONB meta schema validation (Zod)
4. ✅ Required fields present
5. ✅ Pricing values are positive integers
6. ✅ Context length > 0
7. ✅ Tier access arrays not empty
8. ✅ `creditsPer1kTokens` calculation reasonable (warn if too low/high)

**Auto-Calculations**:
- **creditsPer1kTokens**: Can be auto-calculated from vendor pricing:
  ```typescript
  // Example: If inputCost = $1.25/1M, outputCost = $10/1M
  // Average token cost = ($1.25 + $10) / 2 / 1000 = $0.005625 per 1K tokens
  // Apply margin multiplier (e.g., 2.5x): $0.005625 * 2.5 = $0.014 per 1K
  // Convert to credits (1 credit = $0.0005): $0.014 / $0.0005 = 28 credits

  const avgCostPerMillion = (inputCostPerMillion + outputCostPerMillion) / 2;
  const costPer1K = avgCostPerMillion / 1000;
  const marginMultiplier = 2.5; // From pricing config
  const costWithMargin = costPer1K * marginMultiplier;
  const creditsPerK = Math.ceil(costWithMargin / CREDIT_USD_VALUE);
  ```

**Warnings** (Non-blocking):
- ⚠️ Model ID doesn't match provider convention (e.g., "gpt5" instead of "gpt-5")
- ⚠️ Credits per 1K tokens seems unusually high/low compared to similar models
- ⚠️ Context length exceeds 500K (confirm intentional)

#### Step 4: Create Model Record

**Database Operation**:
```sql
INSERT INTO models (id, name, provider, is_available, is_legacy, is_archived, meta, created_at, updated_at)
VALUES (
  'gpt-5',
  'gpt-5',
  'openai',
  true,  -- Available immediately
  false, -- Not legacy
  false, -- Not archived
  '{...}',  -- JSONB meta
  NOW(),
  NOW()
);
```

**Post-Creation Actions**:
1. Clear model cache (force refresh)
2. Log audit trail:
   ```json
   {
     "adminUserId": "uuid",
     "action": "create_model",
     "modelId": "gpt-5",
     "timestamp": "2025-11-12T10:30:00Z",
     "ipAddress": "192.168.1.1"
   }
   ```
3. Emit `model.created` event (optional: notify users)
4. Return success response with model details

#### Step 5: Model Immediately Available

**Availability**:
- ✅ Shows in `GET /v1/models` response (after cache refresh)
- ✅ Available for inference via `/v1/chat/completions`
- ✅ Tier access enforced automatically
- ✅ Credit deduction works immediately
- ✅ Usage tracking enabled

**Cache Behavior**:
- Model cache auto-refreshes every 5 minutes
- Manual refresh triggered on creation
- Users see new model within seconds

### Model Updating (Post-Creation)

**Scenarios Requiring Updates**:
1. **Provider changes pricing**: Update `inputCostPerMillionTokens`, `outputCostPerMillionTokens`, `creditsPer1kTokens`
2. **Add new capabilities**: Update `capabilities` array (e.g., add "vision" to text-only model)
3. **Adjust tier access**: Change `requiredTier`, `allowedTiers` to expand/restrict access
4. **Update context limits**: Increase `contextLength` or `maxOutputTokens` for model upgrades

**Update Endpoint**: `PATCH /admin/models/:id/meta`

**Partial Update Support**:
```json
{
  "creditsPer1kTokens": 25,  // Reduced from 28 (price drop)
  "description": "Updated with improved reasoning capabilities"
}
```

**Validation**:
- Merge with existing meta JSONB
- Validate combined result against schema
- Preserve fields not included in patch

**Audit Trail**:
- Log `previous_value` and `new_value` for changed fields
- Track who made the change and when
- Enable rollback if needed

### Real-World Example: Adding GPT-5

**Timeline**:
```
T+0min  - OpenAI announces GPT-5 with pricing
T+2min  - Admin opens Model Creation form
T+3min  - Admin fills in metadata from OpenAI docs
T+4min  - Admin submits, validation passes
T+5min  - Model created, cache cleared
T+5min  - GPT-5 now available in /v1/models endpoint
T+6min  - First user makes inference request successfully
```

**No Code Changes Required** ✅

**No Deployment Required** ✅

**No Database Migration Required** ✅

### Provider-Specific Templates

To speed up model creation, provide pre-filled templates per provider:

**OpenAI Template**:
```json
{
  "provider": "openai",
  "meta": {
    "capabilities": ["text", "function_calling"],
    "tierRestrictionMode": "minimum",
    "providerMetadata": {
      "openai": {
        "modelFamily": ""  // Admin fills: "gpt-4", "gpt-3.5"
      }
    }
  }
}
```

**Anthropic Template**:
```json
{
  "provider": "anthropic",
  "meta": {
    "capabilities": ["text", "vision", "long_context"],
    "tierRestrictionMode": "minimum",
    "providerMetadata": {
      "anthropic": {
        "modelSeries": ""  // Admin fills: "claude-3", "claude-2"
      }
    }
  }
}
```

**Google Template**:
```json
{
  "provider": "google",
  "meta": {
    "capabilities": ["text", "vision"],
    "tierRestrictionMode": "minimum",
    "providerMetadata": {
      "google": {
        "modelType": ""  // Admin fills: "gemini-pro", "palm"
      }
    }
  }
}
```

### Bulk Import (Advanced)

For adding multiple models at once (e.g., provider releases entire model family):

**Endpoint**: `POST /admin/models/bulk`

**Request**:
```json
{
  "models": [
    { "id": "gpt-5-turbo", "name": "gpt-5-turbo", ... },
    { "id": "gpt-5-turbo-16k", "name": "gpt-5-turbo-16k", ... },
    { "id": "gpt-5-vision", "name": "gpt-5-vision", ... }
  ]
}
```

**Response**:
```json
{
  "success": 2,
  "failed": 1,
  "results": [
    { "id": "gpt-5-turbo", "status": "created" },
    { "id": "gpt-5-turbo-16k", "status": "created" },
    { "id": "gpt-5-vision", "status": "failed", "error": "Duplicate model ID" }
  ]
}
```

### Model Deletion (Discouraged)

**Policy**: Models should be **archived**, not deleted, to preserve historical data.

**If deletion is absolutely necessary**:
1. Check for active usage in last 30 days (reject if > 0 requests)
2. Check for references in `UsageHistory` (warn if exists)
3. Require explicit confirmation with model ID typed
4. Soft delete (set `deletedAt` timestamp) instead of hard delete
5. Log to audit trail with detailed reason

**Endpoint**: `DELETE /admin/models/:id` (admin-only, requires super_admin role)

---

## Migration Strategy

### Phase 1: Schema Migration (Backwards-Compatible)

**Migration File**: `20251112000000_add_model_lifecycle_jsonb_meta.sql`

```sql
-- Step 1: Add new columns (nullable initially)
ALTER TABLE models ADD COLUMN is_legacy BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN is_archived BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN meta JSONB;

-- Step 2: Populate meta JSONB from existing columns
UPDATE models SET meta = jsonb_build_object(
  'displayName', display_name,
  'description', description,
  'version', version,
  'capabilities', (
    SELECT jsonb_agg(unnest) FROM unnest(capabilities)
  ),
  'contextLength', context_length,
  'maxOutputTokens', max_output_tokens,
  'inputCostPerMillionTokens', input_cost_per_million_tokens,
  'outputCostPerMillionTokens', output_cost_per_million_tokens,
  'creditsPer1kTokens', credits_per_1k_tokens,
  'requiredTier', required_tier::text,
  'tierRestrictionMode', tier_restriction_mode,
  'allowedTiers', (
    SELECT jsonb_agg(unnest::text) FROM unnest(allowed_tiers)
  )
);

-- Step 3: Add NOT NULL constraint after population
ALTER TABLE models ALTER COLUMN meta SET NOT NULL;

-- Step 4: Create indexes
CREATE INDEX idx_models_is_legacy ON models(is_legacy);
CREATE INDEX idx_models_is_archived ON models(is_archived);
CREATE INDEX idx_models_meta_gin ON models USING gin(meta);

-- Step 5: Create specific JSONB indexes for common queries
CREATE INDEX idx_models_meta_required_tier ON models
  USING btree((meta->>'requiredTier'));
CREATE INDEX idx_models_meta_capabilities ON models
  USING gin((meta->'capabilities'));
```

### Phase 2: Application Layer Updates

**TypeScript Type Guards**:

```typescript
// backend/src/types/model-meta.ts
import { z } from 'zod';

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

export const ModelMetaSchema = z.object({
  displayName: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  capabilities: z.array(ModelCapabilitySchema),
  contextLength: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive().optional(),
  inputCostPerMillionTokens: z.number().int().nonnegative(),
  outputCostPerMillionTokens: z.number().int().nonnegative(),
  creditsPer1kTokens: z.number().int().positive(),
  requiredTier: SubscriptionTierSchema,
  tierRestrictionMode: z.enum(['minimum', 'exact', 'whitelist']),
  allowedTiers: z.array(SubscriptionTierSchema),
  legacyReplacementModelId: z.string().optional(),
  deprecationNotice: z.string().optional(),
  sunsetDate: z.string().datetime().optional(),
  providerMetadata: z.record(z.any()).optional(),
  internalNotes: z.string().optional(),
  complianceTags: z.array(z.string()).optional(),
});

export type ModelMeta = z.infer<typeof ModelMetaSchema>;

export function validateModelMeta(meta: unknown): ModelMeta {
  return ModelMetaSchema.parse(meta);
}
```

### Phase 3: Backwards Compatibility Layer (Temporary)

During migration, maintain dual-access:

```typescript
// Helper to read from either old columns (if exist) or meta JSONB
function getModelDisplayName(model: any): string {
  return model.meta?.displayName || model.displayName || model.name;
}

// This allows gradual rollout without breaking existing code
```

### Phase 4: Drop Old Columns (After Full Migration)

**Migration File**: `20251113000000_remove_model_legacy_columns.sql`

```sql
-- Only run after confirming all code uses meta JSONB
ALTER TABLE models DROP COLUMN display_name;
ALTER TABLE models DROP COLUMN description;
ALTER TABLE models DROP COLUMN capabilities;
ALTER TABLE models DROP COLUMN context_length;
ALTER TABLE models DROP COLUMN max_output_tokens;
ALTER TABLE models DROP COLUMN input_cost_per_million_tokens;
ALTER TABLE models DROP COLUMN output_cost_per_million_tokens;
ALTER TABLE models DROP COLUMN credits_per_1k_tokens;
ALTER TABLE models DROP COLUMN is_deprecated; -- Replaced by isLegacy
ALTER TABLE models DROP COLUMN version;
ALTER TABLE models DROP COLUMN required_tier;
ALTER TABLE models DROP COLUMN tier_restriction_mode;
ALTER TABLE models DROP COLUMN allowed_tiers;
```

---

## Service Layer Architecture

### Extended ModelService Interface

```typescript
// backend/src/interfaces/services/model.interface.ts

export interface IModelService {
  // Existing methods (updated to use JSONB meta)
  listModels(filters?, userTier?): Promise<ModelListResponse>;
  getModelDetails(modelId, userTier?): Promise<ModelDetailsResponse>;
  canUserAccessModel(modelId, userTier): Promise<TierAccessResult>;
  isModelAvailable(modelId): Promise<boolean>;
  getModelForInference(modelId): Promise<any>;
  refreshCache(): Promise<void>;
  getModelUsageStats(startDate?, endDate?): Promise<any>;

  // NEW: Lifecycle Management Methods
  markAsLegacy(
    modelId: string,
    replacementModelId?: string,
    deprecationNotice?: string,
    sunsetDate?: Date,
    adminUserId?: string
  ): Promise<void>;

  unmarkLegacy(
    modelId: string,
    adminUserId?: string
  ): Promise<void>;

  archive(
    modelId: string,
    reason: string,
    adminUserId?: string
  ): Promise<void>;

  unarchive(
    modelId: string,
    adminUserId?: string
  ): Promise<void>;

  // NEW: Admin Operations
  updateModelMeta(
    modelId: string,
    metaUpdates: Partial<ModelMeta>,
    adminUserId?: string
  ): Promise<void>;

  addModel(
    modelData: {
      id: string;
      name: string;
      provider: string;
      meta: ModelMeta;
    },
    adminUserId?: string
  ): Promise<void>;

  // NEW: Reporting
  getLegacyModels(): Promise<ModelListResponse>;
  getArchivedModels(): Promise<ModelListResponse>;
  getModelLifecycleHistory(modelId: string): Promise<any[]>;
}
```

### Implementation Pattern

```typescript
// backend/src/services/model.service.ts

@injectable()
export class ModelService implements IModelService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('ILogger') private logger: ILogger
  ) {}

  async markAsLegacy(
    modelId: string,
    replacementModelId?: string,
    deprecationNotice?: string,
    sunsetDate?: Date,
    adminUserId?: string
  ): Promise<void> {
    this.logger.info('ModelService: Marking model as legacy', { modelId });

    // Validate model exists
    const model = await this.prisma.model.findUnique({ where: { id: modelId } });
    if (!model) {
      throw new NotFoundError(`Model ${modelId} not found`);
    }

    // Validate replacement model exists (if provided)
    if (replacementModelId) {
      const replacement = await this.prisma.model.findUnique({
        where: { id: replacementModelId }
      });
      if (!replacement) {
        throw new ValidationError(`Replacement model ${replacementModelId} not found`);
      }
    }

    // Update model with legacy flags
    const currentMeta = model.meta as ModelMeta;
    const updatedMeta: ModelMeta = {
      ...currentMeta,
      legacyReplacementModelId: replacementModelId,
      deprecationNotice,
      sunsetDate: sunsetDate?.toISOString(),
    };

    await this.prisma.model.update({
      where: { id: modelId },
      data: {
        isLegacy: true,
        meta: updatedMeta as any, // Prisma JsonValue
        updatedAt: new Date(),
      },
    });

    // Clear cache
    modelCache.clear();

    // Audit log
    if (adminUserId) {
      await this.logAuditEvent({
        adminUserId,
        action: 'mark_as_legacy',
        modelId,
        changes: { isLegacy: true, replacementModelId },
      });
    }

    this.logger.info('ModelService: Model marked as legacy', { modelId });
  }

  // Similar implementations for unmarkLegacy(), archive(), unarchive()...
}
```

---

## API Endpoint Design

### Admin Endpoints (Secured with RBAC)

#### POST /admin/models
**Create new model**

Request:
```json
{
  "id": "gpt-5",
  "name": "gpt-5",
  "provider": "openai",
  "meta": {
    "displayName": "GPT-5",
    "description": "272K input, 128K output",
    "capabilities": ["text", "vision", "function_calling"],
    "contextLength": 272000,
    "maxOutputTokens": 128000,
    "inputCostPerMillionTokens": 1250,
    "outputCostPerMillionTokens": 10000,
    "creditsPer1kTokens": 28,
    "requiredTier": "pro_max",
    "tierRestrictionMode": "minimum",
    "allowedTiers": ["pro_max", "enterprise_pro", "enterprise_max"]
  }
}
```

#### POST /admin/models/:id/mark-legacy
**Mark model as legacy**

Request:
```json
{
  "replacementModelId": "gpt-5.5",
  "deprecationNotice": "GPT-5 will be sunset on 2025-12-31. Migrate to GPT-5.5.",
  "sunsetDate": "2025-12-31T23:59:59Z"
}
```

#### POST /admin/models/:id/unmark-legacy
**Remove legacy status**

#### POST /admin/models/:id/archive
**Archive model**

Request:
```json
{
  "reason": "Model superseded by GPT-5.5, usage dropped below threshold"
}
```

#### POST /admin/models/:id/unarchive
**Restore archived model**

#### PATCH /admin/models/:id/meta
**Update model metadata**

Request:
```json
{
  "displayName": "GPT-5 Turbo",
  "creditsPer1kTokens": 25,
  "providerMetadata": {
    "openai": {
      "modelFamily": "gpt-5",
      "trainingCutoff": "2025-06"
    }
  }
}
```

#### GET /admin/models/legacy
**List all legacy models**

#### GET /admin/models/archived?includeArchived=true
**List archived models (admin only)**

#### GET /admin/models/:id/lifecycle-history
**Get audit trail of lifecycle changes**

---

## Frontend UI Integration

### Admin Dashboard - Model Management Page

**Features**:
1. **Model Table** with status badges (Active, Legacy, Archived)
2. **Filters**: Status, Provider, Tier Requirement
3. **Bulk Operations**: Mark multiple as legacy, bulk archive
4. **Lifecycle Actions**: Buttons for mark/unmark legacy, archive/unarchive
5. **Confirmation Dialogs**: Prevent accidental status changes
6. **Legacy Replacement Selector**: Dropdown to choose replacement model

**UI Mockup** (Component Structure):

```tsx
// frontend/src/pages/AdminDashboard/ModelManagement.tsx

function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [filters, setFilters] = useState({
    status: 'all', // 'active', 'legacy', 'archived', 'all'
    provider: 'all',
    tier: 'all',
  });

  return (
    <div>
      <h1>Model Management</h1>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Actions */}
      <ActionBar>
        <Button onClick={handleAddModel}>Add New Model</Button>
        <Button onClick={handleBulkArchive} variant="secondary">
          Bulk Archive
        </Button>
      </ActionBar>

      {/* Table */}
      <ModelTable
        models={models}
        onMarkLegacy={handleMarkLegacy}
        onUnmarkLegacy={handleUnmarkLegacy}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onEditMeta={handleEditMeta}
      />

      {/* Dialogs */}
      <MarkLegacyDialog
        open={legacyDialogOpen}
        modelId={selectedModelId}
        onConfirm={handleLegacyConfirm}
        onCancel={() => setLegacyDialogOpen(false)}
      />
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**ModelService Tests** (`model.service.lifecycle.test.ts`):
- ✅ `markAsLegacy()` - Sets isLegacy flag, updates meta, clears cache
- ✅ `unmarkLegacy()` - Removes legacy status, clears replacement
- ✅ `archive()` - Sets archived flag, blocks inference
- ✅ `unarchive()` - Restores availability, preserves legacy status
- ✅ `updateModelMeta()` - Validates schema, logs changes
- ✅ `addModel()` - Creates with valid meta JSONB
- ✅ JSONB meta validation - Rejects invalid schemas

### Integration Tests

**API Endpoint Tests** (`admin/models.lifecycle.integration.test.ts`):
- ✅ POST `/admin/models/:id/mark-legacy` - Returns 200, model in DB
- ✅ POST `/admin/models/:id/archive` - Blocks inference, excludes from lists
- ✅ GET `/v1/models` - Excludes archived, shows legacy with flag
- ✅ GET `/admin/models/archived?includeArchived=true` - Shows archived (admin only)
- ✅ RBAC protection - Non-admins get 403 Forbidden

### E2E Tests

**Admin Workflow** (`admin-model-lifecycle.e2e.test.ts`):
1. Admin logs in
2. Navigates to Model Management
3. Marks GPT-4 as legacy, selects GPT-5 as replacement
4. Verifies deprecation notice appears in `/v1/models` response
5. Archives GPT-4
6. Confirms model excluded from public endpoint
7. Unarchives GPT-4
8. Verifies model returns to active list with legacy flag

---

## Rollout Plan

### Stage 1: Database Migration (Week 1)
- ✅ Create migration to add `isLegacy`, `isArchived`, `meta` columns
- ✅ Backfill `meta` JSONB from existing columns
- ✅ Add indexes (Gin, BTree)
- ✅ Run migration on dev/staging databases
- ✅ Verify data integrity

### Stage 2: Backend Implementation (Week 1-2)
- ✅ Implement ModelService lifecycle methods
- ✅ Create admin API endpoints
- ✅ Add JSONB validation schemas (Zod)
- ✅ Update existing queries to use `meta` JSONB
- ✅ Write unit + integration tests
- ✅ Update seed scripts

### Stage 3: Frontend Implementation (Week 2)
- ✅ Build Admin Dashboard Model Management page
- ✅ Implement lifecycle action buttons
- ✅ Add confirmation dialogs
- ✅ Update API client for new endpoints

### Stage 4: QA & Testing (Week 2-3)
- ✅ End-to-end testing of workflows
- ✅ Performance testing (JSONB query speed)
- ✅ Load testing (1000+ models)
- ✅ Security audit (RBAC enforcement)

### Stage 5: Production Deployment (Week 3)
- ✅ Deploy database migration
- ✅ Deploy backend services
- ✅ Deploy frontend updates
- ✅ Monitor error logs + performance

### Stage 6: Column Cleanup (Week 4+)
- ✅ Verify all code uses `meta` JSONB (no legacy column access)
- ✅ Create migration to drop old columns
- ✅ Deploy cleanup migration
- ✅ Celebrate! 🎉

---

## Performance Considerations

### JSONB Query Optimization

**Indexed Queries** (Fast):
```sql
-- Provider filter (B-tree index on column)
SELECT * FROM models WHERE provider = 'openai';

-- Required tier filter (JSONB B-tree index)
SELECT * FROM models WHERE (meta->>'requiredTier') = 'pro';

-- Capabilities filter (JSONB Gin index)
SELECT * FROM models WHERE meta->'capabilities' @> '["vision"]'::jsonb;
```

**Unindexed Queries** (Slower, avoid in hot paths):
```sql
-- Full text search in description (requires pg_trgm extension)
SELECT * FROM models WHERE meta->>'description' ILIKE '%advanced%';
```

**Caching Strategy**:
- Cache model list responses for 5 minutes (existing pattern)
- Invalidate cache on any admin lifecycle operation
- Pre-warm cache on server startup

---

## Security & Compliance

### RBAC Requirements

**Permissions**:
- `models.read` - View models (all users)
- `models.create` - Add new models (admin only)
- `models.update` - Update metadata (admin only)
- `models.lifecycle.manage` - Mark legacy, archive (admin only)

**Audit Logging**:
- Every lifecycle operation logged to `ModelTierAuditLog`
- Capture: adminUserId, modelId, action, previousValue, newValue, timestamp, ipAddress

### Data Validation

**Input Validation** (Zod schemas):
- ✅ `meta` JSONB must match `ModelMetaSchema`
- ✅ `replacementModelId` must reference existing model
- ✅ `sunsetDate` must be future date
- ✅ `tierRestrictionMode` must be valid enum

**Business Rules**:
- ❌ Cannot archive model with active inference requests (check last 24h)
- ❌ Cannot delete model (use archive instead for data integrity)
- ⚠️ Warn if marking model as legacy without replacement
- ⚠️ Warn if archiving model with >100 users in last 30 days

---

## Success Criteria

### Functional Requirements
- ✅ Admins can mark models as legacy with replacement tracking
- ✅ Admins can archive/unarchive models
- ✅ Archived models excluded from `/v1/models` endpoint
- ✅ Legacy models show deprecation notice in API responses
- ✅ All metadata stored in `meta` JSONB with validation
- ✅ Admin UI provides intuitive lifecycle management

### Non-Functional Requirements
- ✅ JSONB queries perform within 50ms for 1000+ models
- ✅ Zero downtime during migration
- ✅ Backwards compatibility maintained during transition
- ✅ 100% test coverage on lifecycle operations
- ✅ Audit trail for all lifecycle changes

---

## Open Questions & Risks

### Questions
1. **Auto-archive timing**: Should legacy models auto-archive after sunset date?
   - **Recommendation**: Yes, with cron job checking daily

2. **Notification system**: Should users get notified when their preferred model is deprecated?
   - **Recommendation**: Yes, via email + in-app notification

3. **API version handling**: How to handle breaking changes in `meta` schema?
   - **Recommendation**: Version the meta schema with `schemaVersion` field

### Risks
1. **Migration duration**: Large model tables may take >30s to backfill
   - **Mitigation**: Test on staging, use batched updates

2. **JSONB performance**: Unindexed queries on `meta` could be slow
   - **Mitigation**: Index all commonly queried fields, monitor query performance

3. **Frontend compatibility**: Old frontend versions may break if columns dropped too soon
   - **Mitigation**: Maintain backwards compatibility layer until all clients updated

---

## Conclusion

This architecture provides a robust foundation for model lifecycle management while dramatically simplifying the schema through JSONB consolidation. The phased rollout ensures backwards compatibility and minimizes risk during migration.

**Next Steps**: Proceed to implementation plan document (157-model-lifecycle-implementation-plan.md) for detailed task breakdown and agent orchestration.

