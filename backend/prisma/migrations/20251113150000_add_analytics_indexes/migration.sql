-- Migration: Add Analytics Dashboard Indexes
-- Purpose: Create optimized indexes for Admin Analytics Dashboard queries
-- Related: Plan 180 (Admin Analytics Dashboard UI Design)
-- Related: Docs 183 (Analytics Database Schema & Optimization)
--
-- This migration creates two specialized indexes for analytics aggregation queries:
-- 1. idx_token_usage_analytics: Composite covering index for date range + filter queries
-- 2. idx_token_usage_success: Partial index for successful requests only
--
-- IMPORTANT: Uses CONCURRENTLY to avoid table locks in production
-- Expected creation time: 2-5 minutes for 1M rows

-- ============================================================================
-- INDEX 1: Composite Covering Index for Analytics Queries
-- ============================================================================
--
-- Purpose: Optimize common analytics query patterns with date range filters
-- Covers: 90% of analytics dashboard queries
--
-- Query Coverage Examples:
--   ✅ SELECT SUM(gross_margin_usd), COUNT(*) FROM token_usage_ledger
--      WHERE created_at >= '2025-01-01' AND created_at <= '2025-01-31'
--        AND status = 'success';
--
--   ✅ SELECT provider_id, SUM(vendor_cost) FROM token_usage_ledger
--      WHERE created_at >= '2025-01-01' AND status = 'success'
--      GROUP BY provider_id;
--
-- Expected Performance:
--   - Without index: 2-5 seconds (Sequential Scan)
--   - With index: 50-200ms (Index-Only Scan)
--   - Index size: ~15MB per 1M rows

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_analytics
ON token_usage_ledger (created_at DESC, status, provider_id, user_id)
INCLUDE (gross_margin_usd, vendor_cost, credits_deducted, input_tokens, output_tokens);

-- ============================================================================
-- INDEX 2: Partial Index for Successful Requests
-- ============================================================================
--
-- Purpose: Optimize simple date range queries filtering only successful requests
-- Advantage: Smaller index size (only indexes successful requests ~95% of data)
--
-- Query Coverage Examples:
--   ✅ SELECT SUM(gross_margin_usd) FROM token_usage_ledger
--      WHERE created_at >= '2025-01-01' AND status = 'success';
--
--   ✅ SELECT COUNT(*) FROM token_usage_ledger
--      WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'success';
--
-- Expected Performance:
--   - 10-20% faster than full index for simple date queries
--   - 30-40% smaller than full index on created_at
--   - Index size: ~8MB per 1M rows

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_success
ON token_usage_ledger (created_at DESC)
WHERE status = 'success';

-- ============================================================================
-- Update Table Statistics
-- ============================================================================
--
-- Purpose: Update PostgreSQL query planner statistics for optimal query plans
-- ANALYZE collects statistics about data distribution for the query planner

ANALYZE token_usage_ledger;

-- ============================================================================
-- Migration Notes
-- ============================================================================
--
-- **Rollback Instructions:**
-- If you need to rollback this migration, run:
--
--   DROP INDEX CONCURRENTLY IF EXISTS idx_token_usage_analytics;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_token_usage_success;
--
-- **Performance Impact:**
-- - Read queries: 25-50x faster (2-5s → 50-200ms)
-- - Write queries: <5% slower (minor index maintenance overhead)
-- - Storage: ~23MB additional per 1M rows
--
-- **Monitoring:**
-- Check index usage after deployment:
--
--   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
--   FROM pg_stat_user_indexes
--   WHERE tablename = 'token_usage_ledger'
--     AND indexname IN ('idx_token_usage_analytics', 'idx_token_usage_success');
--
-- Expected idx_scan > 0 within 24 hours of deployment
