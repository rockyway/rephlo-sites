# 015: Decimal Credit Values Rejected by Integer Index

**Date:** 2025-11-22
**Issue:** `invalid input syntax for type integer: "1.38"` when creating models with fractional `creditsPer1kTokens`
**Severity:** **CRITICAL** - Blocks Plan 208 fractional credit system
**Status:** ✅ **RESOLVED**

---

## Summary

When attempting to create a model with decimal `creditsPer1kTokens` values (e.g., 1.38 credits), the operation failed with PostgreSQL error `22P02: invalid input syntax for type integer: "1.38"`.

---

## Root Cause

An expression index on the `models` table's JSONB `meta` column was created with an `::int` cast instead of `::numeric`:

```sql
-- PROBLEMATIC INDEX (created in migration 20251112120000)
CREATE INDEX idx_models_meta_credits_per_1k
  ON models USING btree(((meta->>'creditsPer1kTokens')::int));
```

**Why This Fails:**
- Plan 208 introduced fractional credits stored as decimals (e.g., 0.19, 1.5, 1.38)
- PostgreSQL cannot cast decimal strings like `"1.38"` to `INTEGER`
- The index update triggers during `INSERT`, causing the error

---

## Error Details

**PostgreSQL Error Code:** `22P02`
**Message:** `invalid input syntax for type integer: "1.38"`
**Location:** `backend/src/services/model.service.ts:651` (prisma.models.create())

**Example Failing Data:**
```json
{
  "creditsPer1kTokens": 1.38,
  "inputCreditsPerK": 0.19,
  "outputCreditsPerK": 1.5
}
```

---

## Solution

### Migration Created

Migration file created at:
`backend/prisma/migrations/20251122000000_fix_credits_index_for_decimals/migration.sql`

```sql
-- Drop the integer-based index
DROP INDEX IF EXISTS idx_models_meta_credits_per_1k;

-- Recreate with NUMERIC type for Plan 208 fractional credits
CREATE INDEX idx_models_meta_credits_per_1k
  ON models USING btree(((meta->>'creditsPer1kTokens')::numeric));
```

### Manual Application (If Migration Fails)

If `prisma migrate deploy` times out due to advisory locks, apply manually:

1. **Stop all backend processes:**
   ```bash
   cd backend
   npx kill-port 7150 5555 5556 5557
   ```

2. **Apply SQL directly:**
   ```bash
   psql "$DATABASE_URL" <<'EOF'
   DROP INDEX IF EXISTS idx_models_meta_credits_per_1k;
   CREATE INDEX idx_models_meta_credits_per_1k
     ON models USING btree(((meta->>'creditsPer1kTokens')::numeric));
   EOF
   ```

3. **Verify index:**
   ```sql
   \d models  -- Check indexes list
   ```

4. **Restart backend:**
   ```bash
   npm run dev
   ```

---

## Verification

After applying the fix, test model creation:

```typescript
// Should now succeed with decimal credits
const modelData = {
  id: "gpt-5-chat",
  meta: {
    creditsPer1kTokens: 1.38,  // Decimal value
    inputCreditsPerK: 0.19,
    outputCreditsPerK: 1.5
  }
};
```

---

## Prevention

**For Future Migrations:**
- Always use `::numeric` or `::decimal` for JSON fields containing currency/credit values
- Test migrations with fractional data before applying to production
- Document expected data types in migration comments

**Schema Guidelines:**
```sql
-- ✅ CORRECT: Use numeric for decimal values
CREATE INDEX idx_name ON table USING btree(((jsonb_column->>'field')::numeric));

-- ❌ WRONG: Integer cast rejects decimals
CREATE INDEX idx_name ON table USING btree(((jsonb_column->>'field')::int));
```

---

## Related Issues

- **Plan 208:** Fractional Credit System (`docs/plan/208-fractional-credits.md`)
- **Migration 20251121000000:** Converted credit columns from `INT` to `DECIMAL(12,2)`
- **Migration 20251112120000:** Created the problematic integer index

---

## Timeline

| Time | Event |
|------|-------|
| 2025-11-21 16:35 | Plan 208 fractional credits migration applied |
| 2025-11-21 18:55 | First error reported when creating `gpt-5-chat` model |
| 2025-11-22 01:00 | Root cause identified: `idx_models_meta_credits_per_1k` integer cast |
| 2025-11-22 01:05 | Migration created to fix index with `::numeric` cast |
| 2025-11-22 01:10 | Manual fix applied due to advisory lock timeout |

---

## Status

✅ **RESOLVED**

- Migration file created: `20251122000000_fix_credits_index_for_decimals`
- Index recreated with `::numeric` cast
- Model creation with decimal credits now supported
- Backend server restarted and operational

---

## References

- **Error Code:** [PostgreSQL Error 22P02 - Invalid Text Representation](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- **Index Type:** Expression indexes on JSONB fields
- **Plan 208:** Fractional Credit System with 0.01 precision
