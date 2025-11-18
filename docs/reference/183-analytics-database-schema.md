# Admin Analytics Dashboard - Database Schema & Optimization

**Document Type:** Technical Reference
**Related Plan:** [180-admin-analytics-dashboard-ui-design.md](../plan/180-admin-analytics-dashboard-ui-design.md)
**Status:** Design Phase
**Created:** 2025-01-13
**Last Updated:** 2025-01-13

---

## Table of Contents

1. [Overview](#overview)
2. [Data Source Table](#data-source-table)
3. [Database Indexes](#database-indexes)
4. [Query Optimization](#query-optimization)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Data Integrity](#data-integrity)
7. [Migration Scripts](#migration-scripts)

---

## Overview

The Admin Analytics Dashboard aggregates data from the `token_usage_ledger` table, which tracks every API request's financial metrics including vendor costs, credits charged, and gross margins.

### Key Tables Involved

1. **token_usage_ledger** (Primary analytics source)
2. **users** (For subscription tier filtering)
3. **providers** (For provider name lookups)
4. **models** (For model metadata)

---

## Data Source Table

### token_usage_ledger Schema

```prisma
model TokenUsageLedger {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId            String   @map("request_id") @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  modelId              String   @map("model_id")
  providerId           String   @map("provider_id") @db.Uuid

  // Token usage
  inputTokens          Int      @map("input_tokens")
  outputTokens         Int      @map("output_tokens")
  cachedInputTokens    Int      @default(0) @map("cached_input_tokens")
  totalTokens          Int      @map("total_tokens")

  // Financial tracking (NEW from Plan 161)
  vendorCost           Decimal  @map("vendor_cost") @db.Decimal(10, 8)
  creditDeducted       Int      @map("credit_deducted")
  marginMultiplier     Decimal  @map("margin_multiplier") @db.Decimal(5, 2)
  grossMarginUsd       Decimal  @map("gross_margin_usd") @db.Decimal(10, 8)

  // Request metadata
  requestType          String   @map("request_type")  // 'completion', 'chat', 'embedding'
  requestStartedAt     DateTime @map("request_started_at")
  requestCompletedAt   DateTime @map("request_completed_at")
  processingTime       Int      @map("processing_time")  // milliseconds
  status               String   @default("success")      // 'success', 'failed', 'partial'

  createdAt            DateTime @default(now()) @map("created_at")

  // Relations
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider             Provider @relation(fields: [providerId], references: [id], onDelete: Restrict)

  @@map("token_usage_ledger")
  @@index([userId])
  @@index([providerId])
  @@index([createdAt])
  @@index([status])
}
```

### Key Fields for Analytics

| Field              | Type          | Description                                    | Used In                  |
|--------------------|---------------|------------------------------------------------|--------------------------|
| `gross_margin_usd` | Decimal(10,8) | Profit per request (revenue - vendor cost)     | KPI totals, trends       |
| `vendor_cost`      | Decimal(10,8) | Cost paid to LLM provider (OpenAI, Anthropic)  | Provider breakdown       |
| `credit_deducted`  | Int           | Credits charged to user (1 credit = $0.01)     | Revenue calculation      |
| `created_at`       | DateTime      | Request timestamp (for time-based aggregation) | Date range filtering     |
| `status`           | String        | 'success', 'failed', 'partial'                 | Filter successful only   |
| `user_id`          | UUID          | Foreign key to users table                     | Tier breakdown (via join)|
| `provider_id`      | UUID          | Foreign key to providers table                 | Provider name lookup     |

---

## Database Indexes

### Required Indexes for Analytics Queries

#### 1. Composite Index: `idx_token_usage_analytics`

**Purpose:** Cover all common filter combinations for analytics queries

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_analytics
ON token_usage_ledger (created_at DESC, status, provider_id, user_id)
INCLUDE (gross_margin_usd, vendor_cost, credits_deducted, input_tokens, output_tokens);
```

**Why this index?**

- **created_at DESC:** Most queries filter by date range (90% of queries), descending order for recent data
- **status:** Filter successful requests only (`WHERE status = 'success'`)
- **provider_id:** Group by provider, filter by specific providers
- **user_id:** Join with users table for tier info
- **INCLUDE clause:** PostgreSQL covering index - stores frequently accessed columns directly in index (avoid table lookups)

**Query Coverage:**

```sql
-- ✅ Uses idx_token_usage_analytics (Index-Only Scan)
SELECT SUM(gross_margin_usd), COUNT(*)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01'
  AND created_at <= '2025-01-31'
  AND status = 'success'
  AND provider_id = 'uuid-openai';
```

**Expected Performance:**
- Without index: 2-5 seconds for 100k rows (Sequential Scan)
- With index: 50-200ms for same query (Index-Only Scan)
- Index size: ~15MB for 1M rows

---

#### 2. Partial Index: `idx_token_usage_success`

**Purpose:** Optimize queries that filter only successful requests (smaller, faster index)

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_success
ON token_usage_ledger (created_at DESC)
WHERE status = 'success';
```

**Why this index?**

- **Smaller size:** Only indexes successful requests (~95% of total)
- **Faster writes:** Partial index doesn't update on failed requests
- **Query optimization:** PostgreSQL can use this for simple date range queries

**Query Coverage:**

```sql
-- ✅ Uses idx_token_usage_success (Index Scan)
SELECT SUM(gross_margin_usd)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01'
  AND status = 'success';
```

**Expected Performance:**
- 10-20% faster than full index for simple date queries
- 30-40% smaller than full index on `created_at`

---

#### 3. Existing Indexes (from schema)

```sql
-- User lookup (already exists)
CREATE INDEX idx_token_usage_user_id ON token_usage_ledger (user_id);

-- Provider lookup (already exists)
CREATE INDEX idx_token_usage_provider_id ON token_usage_ledger (provider_id);
```

---

## Query Optimization

### Best Practices

#### ✅ DO: Use Index-Friendly Queries

```sql
-- GOOD: Range filter with indexed column
SELECT SUM(gross_margin_usd), COUNT(*)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01'
  AND created_at <= '2025-01-31'
  AND status = 'success';

-- GOOD: IN clause for providers (uses index)
SELECT provider_id, SUM(vendor_cost)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01'
  AND provider_id IN ('uuid-openai', 'uuid-anthropic')
GROUP BY provider_id;

-- GOOD: ANY clause for array parameters
SELECT SUM(gross_margin_usd)
FROM token_usage_ledger
WHERE created_at >= $1
  AND provider_id = ANY($2::uuid[]);
```

---

#### ❌ DON'T: Use Functions on Indexed Columns

```sql
-- BAD: DATE_TRUNC prevents index usage (forces Sequential Scan)
SELECT SUM(gross_margin_usd)
FROM token_usage_ledger
WHERE DATE_TRUNC('day', created_at) = '2025-01-01';

-- BETTER: Use range comparison instead
SELECT SUM(gross_margin_usd)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01 00:00:00'
  AND created_at < '2025-01-02 00:00:00';
```

```sql
-- BAD: LOWER() on indexed column prevents index usage
SELECT * FROM users WHERE LOWER(email) = 'admin@example.com';

-- BETTER: Use citext column type or case-insensitive index
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
```

---

### Efficient Aggregation Queries

#### Gross Margin KPI (Current + Previous Period)

```sql
-- Optimized query using CTE for clarity
WITH current_period AS (
  SELECT
    SUM(gross_margin_usd) as total_margin,
    SUM(credits_deducted * 0.01) as total_revenue,
    COUNT(*) as request_count
  FROM token_usage_ledger
  WHERE created_at >= $1  -- startDate
    AND created_at <= $2  -- endDate
    AND status = 'success'
),
previous_period AS (
  SELECT SUM(gross_margin_usd) as total_margin
  FROM token_usage_ledger
  WHERE created_at >= $3  -- previousStartDate
    AND created_at <= $4  -- previousEndDate
    AND status = 'success'
)
SELECT
  cp.total_margin,
  cp.total_revenue,
  cp.request_count,
  cp.total_margin / NULLIF(cp.request_count, 0) as avg_per_request,
  pp.total_margin as previous_margin,
  (cp.total_margin - pp.total_margin) as margin_change
FROM current_period cp, previous_period pp;
```

---

#### Provider Cost Breakdown (Top 5)

```sql
SELECT
  p.name as provider_name,
  SUM(t.vendor_cost) as total_cost,
  COUNT(*) as request_count,
  AVG(t.vendor_cost) as avg_cost,
  (SUM(t.vendor_cost) / (SELECT SUM(vendor_cost) FROM token_usage_ledger WHERE created_at >= $1 AND created_at <= $2 AND status = 'success')) * 100 as percentage
FROM token_usage_ledger t
JOIN providers p ON t.provider_id = p.id
WHERE t.created_at >= $1
  AND t.created_at <= $2
  AND t.status = 'success'
GROUP BY p.id, p.name
ORDER BY total_cost DESC
LIMIT 5;
```

---

#### Time Series Aggregation (Daily Margin Trend)

```sql
-- Daily margin trend with efficient bucketing
SELECT
  DATE_TRUNC('day', created_at) as day,
  SUM(gross_margin_usd) as gross_margin,
  SUM(credits_deducted * 0.01) as revenue,
  COUNT(*) as request_count
FROM token_usage_ledger
WHERE created_at >= $1
  AND created_at <= $2
  AND status = 'success'
GROUP BY day
ORDER BY day ASC;
```

**PostgreSQL Query Planner Optimization:**

```sql
-- Analyze table statistics (run after bulk inserts)
ANALYZE token_usage_ledger;

-- Explain plan to verify index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT SUM(gross_margin_usd)
FROM token_usage_ledger
WHERE created_at >= '2025-01-01' AND status = 'success';

-- Expected output:
-- Index Only Scan using idx_token_usage_analytics
-- (cost=0.42..1234.56 rows=10000) (actual time=0.123..45.678 rows=10000 loops=1)
```

---

## Performance Benchmarks

### Query Performance Targets

| Query Type                | Dataset Size | Target (ms) | Acceptable (ms) | Unacceptable (ms) |
|---------------------------|--------------|-------------|-----------------|-------------------|
| Gross Margin KPI          | 100k rows    | 50-200      | <500            | >500              |
| Provider Cost Breakdown   | 100k rows    | 100-300     | <700            | >700              |
| Margin Trend (30 days)    | 100k rows    | 200-500     | <1000           | >1000             |
| Cost Distribution         | 100k rows    | 300-600     | <1200           | >1200             |
| CSV Export (10k rows)     | 10k rows     | 2000-5000   | <10000          | >10000            |

### Index Performance Comparison

| Rows    | Query Type          | No Index (ms) | With idx_token_usage_analytics (ms) | Speedup |
|---------|---------------------|---------------|-------------------------------------|---------|
| 10k     | Date range filter   | 150-300       | 10-20                               | 15x     |
| 100k    | Date range filter   | 2000-5000     | 50-200                              | 25x     |
| 1M      | Date range filter   | 20000-50000   | 200-800                             | 50x     |
| 100k    | Provider breakdown  | 3000-7000     | 100-300                             | 25x     |
| 100k    | Time series         | 5000-10000    | 200-500                             | 25x     |

### CSV Export Streaming Performance

| Rows    | Memory (Naive) | Memory (Stream) | Time (Naive) | Time (Stream) |
|---------|----------------|-----------------|--------------|---------------|
| 10k     | 50MB           | 10MB            | 2s           | 3s            |
| 100k    | 500MB          | 15MB            | 20s          | 25s           |
| 500k    | 2.5GB (💥 OOM) | 20MB            | N/A          | 2 min         |

---

## Data Integrity

### Decimal Precision for Financial Data

**Why Decimal Instead of Float?**

```sql
-- ❌ WRONG: FLOAT loses precision for financial data
CREATE TABLE bad_example (
  gross_margin FLOAT  -- Can't represent $0.01 exactly!
);

-- Example: $0.01 stored as 0.009999999776482582...
-- After 1000 operations: $10.00 becomes $9.87 (13 cents error!)

-- ✅ CORRECT: DECIMAL provides exact precision
CREATE TABLE token_usage_ledger (
  gross_margin_usd DECIMAL(10, 8)  -- Exact representation
);

-- $0.01 stored as exactly 0.01000000
-- After 1000 operations: $10.00 remains $10.00
```

**Precision Breakdown:**

- `DECIMAL(10, 8)`: 10 total digits, 8 after decimal point
- Maximum value: $99.99999999 (sufficient for per-request costs)
- Minimum value: $0.00000001 (1/100th of a cent precision)

---

### Safe Division (Avoid NaN/Infinity)

```typescript
// ✅ SAFE: Check for zero denominator
const marginPercentage = totalRevenue > 0
  ? (totalGrossMargin / totalRevenue) * 100
  : 0;

const avgPerRequest = requestCount > 0
  ? totalCost / requestCount
  : 0;

// ❌ UNSAFE: Division by zero
const marginPercentage = (totalGrossMargin / totalRevenue) * 100;  // NaN if totalRevenue = 0
```

**SQL Equivalent:**

```sql
-- ✅ SAFE: NULLIF prevents division by zero
SELECT
  SUM(gross_margin_usd) / NULLIF(COUNT(*), 0) as avg_margin,
  (SUM(gross_margin_usd) / NULLIF(SUM(credits_deducted * 0.01), 0)) * 100 as margin_percentage
FROM token_usage_ledger;
```

---

### Atomic Transactions for Consistency

```typescript
// Ensure all analytics queries use same snapshot (prevent race conditions)
const result = await prisma.$transaction(async (tx) => {
  const totalMargin = await tx.tokenUsageLedger.aggregate({ ... });
  const tierBreakdown = await tx.tokenUsageLedger.groupBy({ ... });
  return { totalMargin, tierBreakdown };
}, {
  isolationLevel: 'ReadCommitted',  // Prevent dirty reads
  timeout: 10000,                    // 10s timeout
});
```

**Isolation Levels:**

| Level             | Dirty Reads | Non-Repeatable Reads | Phantom Reads |
|-------------------|-------------|----------------------|---------------|
| Read Uncommitted  | ✅ Allowed  | ✅ Allowed           | ✅ Allowed    |
| Read Committed    | ❌ Prevented | ✅ Allowed           | ✅ Allowed    |
| Repeatable Read   | ❌ Prevented | ❌ Prevented         | ✅ Allowed    |
| Serializable      | ❌ Prevented | ❌ Prevented         | ❌ Prevented  |

**Recommendation:** Use `ReadCommitted` for analytics (balance between consistency and performance)

---

## Migration Scripts

### Create Composite Index (Production Safe)

```sql
-- Create index concurrently (doesn't block writes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_analytics
ON token_usage_ledger (created_at DESC, status, provider_id, user_id)
INCLUDE (gross_margin_usd, vendor_cost, credits_deducted, input_tokens, output_tokens);

-- Analyze table after index creation
ANALYZE token_usage_ledger;
```

**Why CONCURRENTLY?**

- Allows concurrent inserts/updates during index creation
- No table-level locks (safe for production)
- Takes longer to create (2-3x) but doesn't block traffic

---

### Create Partial Index for Successful Requests

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_success
ON token_usage_ledger (created_at DESC)
WHERE status = 'success';

ANALYZE token_usage_ledger;
```

---

### Verify Index Usage

```sql
-- Check if index exists
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'token_usage_ledger';

-- Check index size
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'token_usage_ledger';

-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,          -- Number of index scans
  idx_tup_read,      -- Number of index entries returned
  idx_tup_fetch      -- Number of table rows fetched
FROM pg_stat_user_indexes
WHERE tablename = 'token_usage_ledger';
```

---

### Drop Old Indexes (If Needed)

```sql
-- Drop indexes that are no longer needed (if migrating from old schema)
DROP INDEX CONCURRENTLY IF EXISTS old_index_name;

-- Reclaim disk space
VACUUM ANALYZE token_usage_ledger;
```

---

## References

- **Plan:** [180-admin-analytics-dashboard-ui-design.md](../plan/180-admin-analytics-dashboard-ui-design.md)
- **Backend Architecture:** [181-analytics-backend-architecture.md](./181-analytics-backend-architecture.md)
- **Frontend Architecture:** [182-analytics-frontend-architecture.md](./182-analytics-frontend-architecture.md)
- **Security & Compliance:** [184-analytics-security-compliance.md](./184-analytics-security-compliance.md)
- **Prisma Schema:** `backend/prisma/schema.prisma`
- **PostgreSQL Indexes:** [https://www.postgresql.org/docs/current/indexes.html](https://www.postgresql.org/docs/current/indexes.html)
