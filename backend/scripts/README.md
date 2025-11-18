# Backend Scripts

This directory contains utility scripts for backend development and maintenance.

## Table Reference Analyzer

**Script:** `analyze-table-references.ts`

**Purpose:** Detects potential table name mismatches between Prisma schema and raw SQL queries.

### Why This Matters

When using raw SQL queries (`$queryRaw`, `$executeRaw`), Prisma cannot validate table names at compile time. This can lead to runtime errors like:

```
Error: relation "pricing_config" does not exist
```

This script prevents such errors by analyzing all raw SQL queries and comparing them against your Prisma schema.

### Usage

```bash
npm run analyze:tables
```

### What It Checks

1. **Table Name Validation**: Ensures all tables referenced in raw SQL exist in your Prisma schema
2. **Singular/Plural Detection**: Warns about potential singular/plural mismatches (e.g., `pricing_config` vs `pricing_configs`)
3. **False Positive Filtering**: Automatically ignores SQL keywords and common column patterns

### Output Example

**Clean codebase:**
```
✅ All table references are valid!

📊 ANALYSIS RESULTS
✅ Valid references: 20
⚠️  Suspicious references: 0
❌ Invalid references: 0
```

**Issues detected:**
```
⚠️  SUSPICIOUS REFERENCES (Singular/Plural Mismatch):

📍 src/services/pricing-config.service.ts:85
   Table referenced: "pricing_config"
   Possible correct name: "pricing_configs"
   Query type: FROM
   Context:
      SELECT margin_multiplier
      FROM pricing_config
      WHERE scope_type = 'combination'
```

### How It Works

1. **Extract Schema Tables**: Parses `prisma/schema.prisma` to find all model names
2. **Find TypeScript Files**: Recursively searches `src/` for `.ts` files
3. **Detect Raw SQL**: Identifies `$queryRaw`, `$executeRaw`, and unsafe variants
4. **Extract Table Names**: Uses regex to find table references in SQL queries
5. **Validate**: Compares found tables against schema, categorizing as valid, suspicious, or invalid

### Filtered Patterns

The script automatically filters out:

**SQL Keywords:**
- `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `DESC`, `ASC`, etc.
- Aggregate functions: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- Date functions: `EXTRACT`, `NOW`, etc.

**Column Patterns:**
- `*_at` (timestamps): `created_at`, `updated_at`, etc.
- `*_id` (foreign keys): `user_id`, `provider_id`, etc.
- `*_name`: `model_name`, `provider_name`, etc.
- `*_count`: `total_count`, etc.

### Best Practices

1. **Run Before Commits**: Add to your pre-commit hooks
2. **CI/CD Integration**: Run in your build pipeline
3. **After Schema Changes**: Always run after modifying Prisma schema
4. **Prefer Prisma Client**: Use Prisma Client methods when possible instead of raw SQL

### Limitations

- Only analyzes TypeScript files in `src/` directory
- May miss dynamically constructed SQL strings
- Requires table names to be literal strings (not variables)

### When to Use Raw SQL vs Prisma Client

**Prefer Prisma Client:**
- ✅ Simple CRUD operations
- ✅ Type-safe queries
- ✅ Automatic migrations tracking

**Use Raw SQL When:**
- Complex aggregations not supported by Prisma
- Performance-critical queries requiring specific indexes
- Database-specific features (window functions, CTEs, etc.)

**If you must use raw SQL:**
1. Use template literals for better IDE support
2. Add comments explaining why raw SQL is needed
3. Run this analyzer script to catch errors early

## Other Scripts

### validate-openapi-coverage.ts

Validates OpenAPI specification coverage for API endpoints.

```bash
npm run validate:openapi
```

### generate-openapi.ts

Generates OpenAPI documentation from Tspec annotations.

```bash
npm run generate:openapi
```

## Adding New Scripts

When adding new scripts:

1. Place TypeScript files in `scripts/`
2. Add npm script to `package.json`:
   ```json
   "script:name": "ts-node scripts/your-script.ts"
   ```
3. Document usage in this README
4. Include clear error messages and help text
