# Database Schema Migration: Prompt Caching Support

**Plan:** 207
**Date:** 2025-11-20
**Migration:** `20251120221201_add_prompt_caching_support`
**Status:** ✅ Completed

---

## Overview

This migration implements database schema enhancements to support prompt caching metrics in the Rephlo Dedicated API backend. It enables accurate cost tracking, usage analytics, and revenue optimization for cached requests across all supported providers (Anthropic, OpenAI, Google).

---

## Schema Changes

### 1. Token Usage Ledger (`token_usage_ledger`)

Added **7 new columns** to track cache-specific metrics:

#### Cache Token Counts

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `cache_creation_tokens` | INTEGER | 0 | Anthropic: Tokens written to cache (charged at 1.25x) |
| `cache_read_tokens` | INTEGER | 0 | Anthropic: Tokens read from cache (charged at 0.1x) |
| `cached_prompt_tokens` | INTEGER | 0 | OpenAI/Google: Cached tokens from previous requests |

#### Cache Performance Metrics

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `cache_hit_rate` | DECIMAL(5,2) | Yes | Cache hit percentage (0-100) |
| `cost_savings_percent` | DECIMAL(5,2) | Yes | Cost reduction vs non-cached request (0-100) |

#### Credit Breakdown

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `cache_write_credits` | INTEGER | Yes | Credits charged for cache write operations |
| `cache_read_credits` | INTEGER | Yes | Credits charged for cache read operations |

---

### 2. Model Provider Pricing (`model_provider_pricing`)

**Updated field mappings** for consistency with plan terminology:

| Old Field Name | New Prisma Field | Database Column | Description |
|----------------|------------------|-----------------|-------------|
| `cache_input_price_per_1k` | `cache_write_price_per_1k` | `cache_input_price_per_1k` | Cache write price (Anthropic: 1.25x, OpenAI: 1x) |
| `cache_hit_price_per_1k` | `cache_read_price_per_1k` | `cache_hit_price_per_1k` | Cache read price (Anthropic: 0.1x, OpenAI: 0.5x) |

**Note:** Database column names remain unchanged for backward compatibility. Only Prisma field names were aliased using `@map()`.

---

## Performance Indexes

Added **1 new index** for cache analytics queries:

```sql
CREATE INDEX "idx_token_usage_cache_hit_rate" ON "token_usage_ledger"("cache_hit_rate");
```

**Existing composite index** `idx_token_usage_user_analytics` already covers `(user_id, created_at)` for user-level analytics.

---

## Migration Details

### Migration File

**Location:** `backend/prisma/migrations/20251120221201_add_prompt_caching_support/migration.sql`

**Key Features:**
- ✅ Fully commented with inline documentation
- ✅ Backward compatible (all new columns nullable or have defaults)
- ✅ Includes `COMMENT ON COLUMN` statements for database-level documentation
- ✅ No breaking changes to existing queries
- ✅ Safe to apply on production (no data loss, no downtime)

### Migration Applied

```
✅ Migration applied: 20251120221201_add_prompt_caching_support
```

---

## Backward Compatibility

### Existing Data
- All existing `token_usage_ledger` records remain valid
- New columns default to `0` or `NULL` for existing rows
- No data migration required

### Existing Queries
- All existing SELECT queries work unchanged
- INSERT queries without new columns still work (defaults applied)
- No application code changes required for basic usage

---

## Usage Examples

### Recording Cache Metrics

```typescript
// Example: Record Anthropic cache usage
await prisma.token_usage_ledger.create({
  data: {
    userId: 'user-123',
    modelId: 'claude-3-5-sonnet-20241022',
    providerId: 'anthropic-provider-id',
    inputTokens: 100,
    outputTokens: 50,

    // NEW: Cache metrics
    cacheCreationTokens: 2000,  // First request: write to cache
    cacheReadTokens: 0,
    cachedPromptTokens: 0,

    cacheHitRate: null,         // No cache hit on first request
    costSavingsPercent: null,

    inputCredits: 1,
    outputCredits: 1,
    cacheWriteCredits: 2,       // Cache write cost
    cacheReadCredits: null,

    // ... other fields
  }
});

// Subsequent request with cache hit
await prisma.token_usage_ledger.create({
  data: {
    userId: 'user-123',
    modelId: 'claude-3-5-sonnet-20241022',
    providerId: 'anthropic-provider-id',
    inputTokens: 100,
    outputTokens: 50,

    // NEW: Cache hit!
    cacheCreationTokens: 0,
    cacheReadTokens: 2000,      // Read from cache
    cachedPromptTokens: 0,

    cacheHitRate: 95.2,         // 95.2% cache hit rate
    costSavingsPercent: 84.5,   // 84.5% cost savings!

    inputCredits: 0,
    outputCredits: 1,
    cacheWriteCredits: null,
    cacheReadCredits: 0,        // Cache read cost (0.1x)

    // ... other fields
  }
});
```

### Querying Cache Analytics

```typescript
// Get cache performance for a user
const cacheStats = await prisma.token_usage_ledger.aggregate({
  where: {
    userId: 'user-123',
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    cacheHitRate: {
      not: null,  // Only cached requests
    },
  },
  _avg: {
    cacheHitRate: true,
    costSavingsPercent: true,
  },
  _sum: {
    cacheReadTokens: true,
    cacheReadCredits: true,
  },
  _count: true,
});

console.log(`Average cache hit rate: ${cacheStats._avg.cacheHitRate}%`);
console.log(`Average cost savings: ${cacheStats._avg.costSavingsPercent}%`);
console.log(`Total cached tokens: ${cacheStats._sum.cacheReadTokens}`);
console.log(`Credits saved: ${cacheStats._sum.cacheReadCredits}`);
```

---

## Verification Checklist

- [x] Migration file created with descriptive naming
- [x] Schema updated with new columns and indexes
- [x] All columns documented with comments
- [x] Backward compatibility verified
- [x] Prisma client generation successful
- [x] Migration applied to database successfully
- [x] No breaking changes to existing queries
- [x] Database column comments added

---

## Next Steps

1. **Phase 1 Implementation (Week 1):**
   - Update request validation schemas to accept `cache_control` fields
   - Enhance provider response parsing to extract cache metrics
   - Update credit calculation service to use new pricing fields

2. **Phase 2 Implementation (Week 2):**
   - Implement usage recording with cache metrics
   - Create cache analytics API endpoints
   - Build admin dashboard cache insights

3. **Testing:**
   - Unit tests for cache metric calculations
   - Integration tests for usage recording
   - Load testing with cached requests

---

## Considerations for Data Migration

### No Data Migration Required

- All new columns have safe defaults (`0` or `NULL`)
- Existing records represent non-cached requests (accurate historical data)
- No need to backfill existing data

### Future Considerations

If credit re-calculation is needed due to pricing errors:

```sql
-- Identify affected usage records (cached requests only)
SELECT * FROM token_usage_ledger
WHERE created_at >= '2025-11-20'
  AND (cache_read_tokens > 0 OR cache_creation_tokens > 0);

-- Recalculate and update if needed (with application logic)
-- DO NOT manually update credits without business logic validation
```

---

## Index Strategy Justification

### Added Index: `idx_token_usage_cache_hit_rate`

**Purpose:** Optimize queries filtering by cache hit rate (e.g., "find all high-performing cached requests")

**Use Cases:**
- Admin analytics: "Show requests with >80% cache hit rate"
- Performance monitoring: "Alert on low cache hit rates"
- User dashboards: "Display cache performance trends"

**Query Example:**
```sql
SELECT * FROM token_usage_ledger
WHERE cache_hit_rate > 80.0
ORDER BY created_at DESC;
```

### Existing Index: `idx_token_usage_user_analytics`

**Purpose:** Composite index on `(user_id, created_at)` for user-level analytics

**Use Cases:**
- User cache analytics over time
- Per-user cost savings reports
- Usage trends with cache metrics

**Query Example:**
```sql
SELECT * FROM token_usage_ledger
WHERE user_id = 'user-123'
  AND created_at >= '2025-11-01'
ORDER BY created_at DESC;
```

---

## Related Documentation

- **Implementation Plan:** `docs/plan/207-dedicated-api-prompt-caching-implementation.md`
- **Prisma Schema:** `backend/prisma/schema.prisma`
- **Migration File:** `backend/prisma/migrations/20251120221201_add_prompt_caching_support/migration.sql`

---

## Migration Metadata

**Generated:** 2025-11-20 22:12:01 UTC
**Applied:** 2025-11-20 22:12:01 UTC
**Database:** `rephlo-dev` (PostgreSQL)
**Prisma Version:** 5.x
**Node Version:** 18.x

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Status:** Production-Ready
