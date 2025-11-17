# Seed Data Naming Convention Analysis Results

**Date**: 2025-11-16
**Script**: `scripts/analyze-seed-naming.js`
**Status**: ✅ Seed file is CORRECT (matches Prisma schema)

---

## Executive Summary

The analysis script found **8 camelCase field names** in the seed file, but these are **intentional and correct** because they match the Prisma schema definitions. The Prisma schema itself uses **mixed naming conventions**:

- **Legacy branding models** (downloads, feedbacks, diagnostics): **camelCase**
- **Modern API models** (users, subscriptions, credits, etc.): **snake_case**

---

## Detailed Findings

### ✅ False Positives (Source Variable References)

These are NOT errors - they reference TypeScript source objects with camelCase properties:

| Line | Field | Context | Status |
|------|-------|---------|--------|
| 249 | `persona.firstName` | Assigned to `first_name:` | ✅ Correct |
| 250 | `persona.lastName` | Assigned to `last_name:` | ✅ Correct |
| 1011 | `persona.subscriptionTier` | Assigned to `tier:` | ✅ Correct |

**Explanation**: These lines use `persona.firstName` (camelCase TypeScript object) as the SOURCE value, but assign it to `first_name:` (snake_case Prisma field) as the TARGET. This is the correct transformation pattern.

---

### ✅ Intentional camelCase (Matches Prisma Schema)

These camelCase fields match the Prisma schema definitions for legacy branding models:

#### **downloads** Model (Schema: `prisma/schema.prisma:375-384`)
```prisma
model downloads {
  id        String   @id
  os        String
  timestamp DateTime @default(now())
  userAgent String?  // ← camelCase in schema
  ipHash    String?  // ← camelCase in schema

  @@index([os])
  @@index([timestamp])
}
```

**Seed File Usage** (Lines 1984, 1992, 2000, 2008, 2016):
```typescript
prisma.downloads.create({
  data: {
    userAgent: 'Mozilla/5.0 ...',  // ✅ Matches schema
    ipHash: 'hash_...',            // ✅ Matches schema
  },
});
```

#### **feedbacks** Model (Schema: `prisma/schema.prisma:409-418`)
```prisma
model feedbacks {
  id        String   @id
  userId    String?  // ← camelCase in schema
  message   String   @db.VarChar(1000)
  email     String?
  timestamp DateTime @default(now())

  @@index([email])
  @@index([timestamp])
}
```

**Seed File Usage** (Lines 2028, 2036, 2050):
```typescript
prisma.feedbacks.create({
  data: {
    userId: 'user_...',  // ✅ Matches schema
    message: '...',
    email: '...',
  },
});
```

#### **diagnostics** Model (Schema: `prisma/schema.prisma:364-373`)
```prisma
model diagnostics {
  id        String   @id
  userId    String?  // ← camelCase in schema
  filePath  String   // ← camelCase in schema
  fileSize  Int      // ← camelCase in schema
  timestamp DateTime @default(now())

  @@index([timestamp])
  @@index([userId])
}
```

**Seed File Usage** (Lines 2070-2087):
```typescript
prisma.diagnostics.create({
  data: {
    userId: 'user_...',    // ✅ Matches schema
    filePath: 's3://...',  // ✅ Matches schema
    fileSize: 15240,       // ✅ Matches schema
  },
});
```

---

## Prisma Schema Naming Inconsistency

### snake_case Models (Modern API - Post Plan 190)
- `users` - `user_id`, `first_name`, `last_name`, `email_verified`, `created_at`, `updated_at`
- `subscriptions` - `user_id`, `billing_period_start`, `billing_period_end`
- `credits` - `user_id`, `total_credits`, `used_credits`, `monthly_allocation`
- `user_role_assignment` - `user_id`, `role_id`, `assigned_by`, `assigned_at`, `updated_at`
- `subscription_monetization` - `user_id`, `base_price_usd`, `current_period_start`
- `pricing_configs` - `scope_type`, `subscription_tier`, `created_by`, `is_active`
- `ip_whitelists` - `user_id`, `ip_address`

### camelCase Models (Legacy Branding - Pre Plan 190)
- `downloads` - `userAgent`, `ipHash`
- `feedbacks` - `userId`
- `diagnostics` - `userId`, `filePath`, `fileSize`

**Root Cause**: These three models existed before the Prisma naming standardization work (Plan 190) and were not updated during the snake_case migration.

---

## Recommendations

### Option 1: Keep As-Is (Recommended for Now)
**Pros**:
- Seed file currently works without errors
- No breaking changes to existing branding website functionality
- Legacy models are isolated (not used by main API)

**Cons**:
- Schema inconsistency (mixed naming conventions)
- Future maintenance confusion

### Option 2: Standardize Legacy Models to snake_case (Future Work)
**Pros**:
- Complete schema consistency
- Aligns with Plan 190 naming standards

**Cons**:
- Requires schema migration
- Breaking change for branding website API consumers
- Need to update branding controllers/services

**Scope**: Would require:
1. Schema migration: `userId` → `user_id`, `userAgent` → `user_agent`, `ipHash` → `ip_hash`, `filePath` → `file_path`, `fileSize` → `file_size`
2. Update `branding.controller.ts` field mappings
3. Update seed file references
4. Test branding website endpoints
5. Coordinate with frontend if downloads/feedbacks APIs are consumed

---

## Conclusion

**Status**: ✅ **Seed file is CORRECT**

The seed file correctly uses camelCase for legacy branding models because that's how the Prisma schema defines them. The analysis script successfully identified these fields, confirming they match the schema.

**Next Steps**:
1. ✅ Accept current seed file as-is
2. 📋 Document legacy model naming exception in `backend/PRISMA_MODEL_MAPPING.md`
3. 🔮 Consider standardizing legacy models in future Prisma naming cleanup (Phase 4)

---

## Analysis Script Usage

**Run analysis**:
```bash
cd backend
node scripts/analyze-seed-naming.js
```

**Expected output**: Exit code 1 (reports camelCase findings for documentation)

**Note**: Exit code 1 is expected because the script reports all camelCase occurrences, even when they correctly match the schema. Use this for auditing rather than CI/CD validation.
