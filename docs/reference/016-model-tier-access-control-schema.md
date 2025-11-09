# Model Tier Access Control - Database Schema Reference

**Document ID**: 016
**Created**: 2025-11-08
**Type**: Technical Reference
**Related**: [108-model-tier-access-control-architecture.md](../plan/108-model-tier-access-control-architecture.md)

## Overview

This document provides a technical reference for the database schema changes that enable tier-based access control for LLM models in the Rephlo API backend.

## Migration Details

**Migration Name**: `20251108000000_add_model_tier_access_control`
**Applied**: 2025-11-08
**Status**: Successfully applied to `rephlo-dev` database

## Schema Changes

### Model Table - New Fields

Three new fields have been added to the `models` table to support tier-based access control:

```prisma
model Model {
  // ... existing fields ...

  // Tier Access Control Fields (Added: 2025-11-08)
  requiredTier         SubscriptionTier  @default(free) @map("required_tier")
    // Minimum tier required to access this model
  tierRestrictionMode  String            @default("minimum") @map("tier_restriction_mode") @db.VarChar(20)
    // "minimum" = tier >= requiredTier, "exact" = tier == requiredTier, "whitelist" = use allowedTiers
  allowedTiers         SubscriptionTier[] @default([free, pro, enterprise]) @map("allowed_tiers")
    // Explicit whitelist of allowed tiers (used when mode = "whitelist")

  // ... relations ...
}
```

### Field Specifications

#### 1. `requiredTier` (required_tier)

- **Type**: `SubscriptionTier` enum
- **Default**: `free`
- **Nullable**: No
- **Purpose**: Defines the minimum subscription tier required to access this model
- **Values**:
  - `free` - Available to all users
  - `pro` - Requires Pro tier or higher
  - `enterprise` - Requires Enterprise tier only

#### 2. `tierRestrictionMode` (tier_restriction_mode)

- **Type**: `VARCHAR(20)`
- **Default**: `"minimum"`
- **Nullable**: No
- **Purpose**: Defines how tier restrictions are evaluated
- **Modes**:
  - `"minimum"` - User tier must be >= requiredTier (hierarchical)
  - `"exact"` - User tier must exactly match requiredTier
  - `"whitelist"` - User tier must be in allowedTiers array

#### 3. `allowedTiers` (allowed_tiers)

- **Type**: `SubscriptionTier[]` (PostgreSQL array)
- **Default**: `[free, pro, enterprise]`
- **Nullable**: No
- **Purpose**: Explicit whitelist of allowed tiers (used when mode = "whitelist")
- **Usage**: Enables fine-grained control for special access patterns

### Indexes

Two indexes have been added for query performance:

```sql
CREATE INDEX "models_required_tier_idx" ON "models"("required_tier");
CREATE INDEX "models_is_available_required_tier_idx" ON "models"("is_available", "required_tier");
```

**Purpose**:
- Single-column index supports tier-based filtering
- Composite index optimizes queries that filter by both availability and tier

## Migration SQL

### Forward Migration

```sql
-- Add required_tier column with default 'free' for backward compatibility
ALTER TABLE "models" ADD COLUMN "required_tier" "subscription_tier" NOT NULL DEFAULT 'free';

-- Add tier_restriction_mode column with default 'minimum'
ALTER TABLE "models" ADD COLUMN "tier_restriction_mode" VARCHAR(20) NOT NULL DEFAULT 'minimum';

-- Add allowed_tiers array column with default [free, pro, enterprise]
ALTER TABLE "models" ADD COLUMN "allowed_tiers" "subscription_tier"[] NOT NULL DEFAULT ARRAY['free', 'pro', 'enterprise']::"subscription_tier"[];

-- Create indexes
CREATE INDEX "models_required_tier_idx" ON "models"("required_tier");
CREATE INDEX "models_is_available_required_tier_idx" ON "models"("is_available", "required_tier");
```

### Rollback Migration

```sql
-- Drop indexes first
DROP INDEX IF EXISTS "models_is_available_required_tier_idx";
DROP INDEX IF EXISTS "models_required_tier_idx";

-- Drop columns
ALTER TABLE "models" DROP COLUMN IF EXISTS "allowed_tiers";
ALTER TABLE "models" DROP COLUMN IF EXISTS "tier_restriction_mode";
ALTER TABLE "models" DROP COLUMN IF EXISTS "required_tier";
```

**Note**: Rollback will permanently delete all tier access control configurations.

## Seed Data

The seed script has been updated to assign tiers to existing models:

### Model Tier Assignments

| Model ID | Display Name | Required Tier | Restriction Mode | Allowed Tiers |
|----------|--------------|---------------|------------------|---------------|
| `gpt-5` | GPT-5 | `enterprise` | `minimum` | `[enterprise]` |
| `gemini-2.0-pro` | Gemini 2.0 Pro | `pro` | `minimum` | `[pro, enterprise]` |
| `claude-3.5-sonnet` | Claude 3.5 Sonnet | `pro` | `minimum` | `[pro, enterprise]` |

### Tier Assignment Rationale

**GPT-5** (`enterprise` tier):
- Most expensive model (500/1500 credits per million tokens)
- Latest OpenAI flagship with advanced reasoning
- Highest capability model justifies premium tier

**Gemini 2.0 Pro** (`pro` tier):
- Extended context (2M tokens) suitable for professional use
- Moderate pricing (350/1050 credits)
- Advanced vision and long-context capabilities

**Claude 3.5 Sonnet** (`pro` tier):
- Optimized for coding tasks (professional use case)
- Competitive pricing (300/1500 credits)
- Strong balance of capability and cost

## Backward Compatibility

**Fully Backward Compatible**:
- All existing models default to `requiredTier = free`
- Default `tierRestrictionMode = "minimum"` maintains permissive access
- Default `allowedTiers = [free, pro, enterprise]` grants universal access
- No breaking changes to existing API queries

**Impact on Existing Deployments**:
- Zero downtime migration
- No API contract changes required
- Existing code continues to work without modifications
- Tier enforcement can be enabled progressively

## Data Integrity

### Constraints

1. **NOT NULL constraints**: All three fields are required (with safe defaults)
2. **Type safety**: PostgreSQL enum types enforce valid tier values
3. **Array validation**: `allowedTiers` must contain valid enum values
4. **Default values**: Ensure safe fallback behavior

### Validation Rules

**At Database Level**:
- `requiredTier` must be valid `SubscriptionTier` enum value
- `tierRestrictionMode` must be VARCHAR(20) or less
- `allowedTiers` array elements must be valid `SubscriptionTier` values

**At Application Level** (to be implemented in service layer):
- Validate mode is one of: "minimum", "exact", "whitelist"
- Ensure `allowedTiers` is not empty when mode is "whitelist"
- Verify tier hierarchy consistency (free < pro < enterprise)

## Query Examples

### Get All Models Available to Pro Users

```sql
SELECT id, display_name, required_tier
FROM models
WHERE is_available = true
  AND (
    required_tier = 'free'
    OR required_tier = 'pro'
  );
```

### Get Models with Exact Tier Restriction

```sql
SELECT id, display_name, required_tier, allowed_tiers
FROM models
WHERE tier_restriction_mode = 'exact'
  AND required_tier = 'enterprise';
```

### Check if User Can Access Model (via array check)

```sql
SELECT
  m.id,
  m.display_name,
  CASE
    WHEN 'pro'::subscription_tier = ANY(m.allowed_tiers) THEN true
    ELSE false
  END as can_access
FROM models m
WHERE m.id = 'gpt-5';
```

## Performance Considerations

### Index Usage

**Query Pattern**: Filter models by tier
```sql
WHERE required_tier = 'pro'
```
**Index Used**: `models_required_tier_idx`

**Query Pattern**: Filter available models by tier
```sql
WHERE is_available = true AND required_tier IN ('free', 'pro')
```
**Index Used**: `models_is_available_required_tier_idx`

### Optimization Recommendations

1. **Cache tier configurations**: Tier settings change infrequently, cache for 5-10 minutes
2. **Pre-filter in application**: Check user tier before querying database
3. **Batch tier checks**: Verify access for multiple models in single query
4. **Monitor index usage**: Track query performance with EXPLAIN ANALYZE

## Testing Verification

### Database State Verification

```bash
# Check migration status
cd backend && npx prisma migrate status

# Verify all models have tier assignments
npx ts-node verify-tiers.ts
```

### Expected Output

```
Total models: 3

Model Tier Assignments:

📋 Gemini 2.0 Pro (gemini-2.0-pro)
   Required Tier: pro
   Restriction Mode: minimum
   Allowed Tiers: [pro, enterprise]

📋 Claude 3.5 Sonnet (claude-3.5-sonnet)
   Required Tier: pro
   Restriction Mode: minimum
   Allowed Tiers: [pro, enterprise]

📋 GPT-5 (gpt-5)
   Required Tier: enterprise
   Restriction Mode: minimum
   Allowed Tiers: [enterprise]
```

## Next Steps

1. **Service Layer Implementation**: Implement tier access validation logic in `ModelService`
2. **API Integration**: Add tier checks to inference endpoints (`/v1/chat/completions`, `/v1/completions`)
3. **Response Enhancement**: Include tier metadata in `/v1/models` API responses
4. **Admin UI**: Build admin interface for managing model tier assignments
5. **Testing**: Comprehensive unit and integration tests for tier enforcement

## References

- [Architecture Plan](../plan/108-model-tier-access-control-architecture.md)
- [Prisma Schema](../../backend/prisma/schema.prisma)
- [Migration Files](../../backend/prisma/migrations/20251108000000_add_model_tier_access_control/)
- [Seed Script](../../backend/prisma/seed.ts)

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-08 | 1.0 | Initial schema implementation | Database Schema Architect |

---

**Status**: ✅ Implemented and Verified
**Next Phase**: Service Layer Implementation (Phase 2)
