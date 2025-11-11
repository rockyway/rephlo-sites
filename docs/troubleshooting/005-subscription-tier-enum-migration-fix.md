# Subscription Tier Enum Migration Fix

**Issue ID**: 005
**Date**: 2025-11-10
**Severity**: High
**Status**: Resolved
**Category**: Schema Migration

---

## Problem Description

### Error Encountered

When running `npm run prisma:migrate dev`, Prisma detected schema drift and attempted to create a new migration that failed with:

```
Error: ERROR: current transaction is aborted, commands ignored until end of transaction block
```

### Warnings

```
⚠️  Warnings for the current datasource:

  • The values [enterprise] on the enum `subscription_tier` will be removed.
    If these variants are still used in the database, this will fail.
  • A unique constraint covering the columns `[id]` on the table `oidc_models`
    will be added. If there are existing duplicate values, this will fail.
  • A unique constraint covering the columns `[user_id,role_id]` on the table
    `user_role_assignment` will be added. If there are existing duplicate values,
    this will fail.
```

### Root Cause

The `subscription_tier` enum was created in early migrations with only 3 values:
- `free`
- `pro`
- `enterprise`

However, the current `schema.prisma` file defines 6 values per Plan 129:
- `free`
- `pro`
- `pro_max`
- `enterprise_pro`
- `enterprise_max`
- `perpetual`

**The enum was never properly updated in the migrations**, causing schema drift.

---

## Solution

Created migration `20251110192000_update_subscription_tier_enum` that:

### 1. Adds Missing Enum Values

```sql
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'pro_max';
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'enterprise_pro';
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'enterprise_max';
ALTER TYPE "subscription_tier" ADD VALUE IF NOT EXISTS 'perpetual';
```

### 2. Migrates Existing Data

Maps old `enterprise` tier to new `enterprise_pro` tier in:
- `subscription_monetization` table
- `coupon.tier_eligibility` arrays
- `models.allowed_tiers` arrays

### 3. Removes Old Enum Value

- Creates new enum type `subscription_tier_new` with correct values
- Migrates all columns to use new enum
- Drops old enum and renames new one to `subscription_tier`

### 4. Fixes Unique Constraints

- Adds `UNIQUE(id)` constraint to `oidc_models` table
- Adds `UNIQUE(user_id, role_id)` constraint to `user_role_assignment` table
- Removes duplicate rows before adding constraints

---

## Files Modified

### Created

- `backend/prisma/migrations/20251110192000_update_subscription_tier_enum/migration.sql`
- `docs/troubleshooting/005-subscription-tier-enum-migration-fix.md` (this file)

### Removed

- `backend/prisma/migrations/20251110191324_fullfil_gap_plan_130/` (failed migration)

---

## How to Apply

```bash
cd backend

# The migration will be applied automatically on next migrate command
npm run prisma:migrate dev

# Or for production deployment
npm run prisma:migrate deploy
```

---

## Verification Steps

After applying the migration, verify success:

```sql
-- 1. Verify all 6 tier values exist
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'subscription_tier'::regtype
ORDER BY enumsortorder;

-- Expected output:
-- free
-- pro
-- pro_max
-- enterprise_pro
-- enterprise_max
-- perpetual

-- 2. Verify no 'enterprise' values remain in data
SELECT COUNT(*) FROM subscription_monetization WHERE tier = 'enterprise';
-- Expected: 0

-- 3. Verify unique constraints exist
SELECT conname FROM pg_constraint
WHERE conname IN ('oidc_models_id_key', 'user_role_assignment_user_id_role_id_key');
-- Expected: 2 rows
```

---

## Post-Migration Notes

### Manual Data Review Required

If you had existing users on the old `enterprise` tier, they have been migrated to `enterprise_pro`.

**You may need to manually update some users to `enterprise_max`** if they should have:
- Custom pricing
- Unlimited credits
- White-glove support

```sql
-- Update specific users to enterprise_max
UPDATE subscription_monetization
SET tier = 'enterprise_max'
WHERE user_id IN ('uuid1', 'uuid2', ...);
```

### Update Seed Data

Ensure `backend/prisma/seed.ts` includes all 6 tiers in the `SubscriptionTierConfig` data.

---

## Plan 129 Alignment

This migration aligns the database with Plan 129's 6-tier monetization model:

| Tier | Price | Credits/Month | Description |
|------|-------|---------------|-------------|
| Free | $0 | 2,000 | Free tier |
| Pro | $19 | 20,000 | Professional tier |
| Pro Max | $49 | 60,000 | Professional max tier |
| Enterprise Pro | $149 | 250,000 | Enterprise professional |
| Enterprise Max | Custom | Unlimited | Enterprise maximum |
| Perpetual | One-time | BYOK | Perpetual license |

---

## Related Documents

- Plan 129: `docs/plan/129-consolidated-108-109-110-111-112-115-119-120-121-plan.md`
- Plan 130: `docs/plan/130-gap-closure-implementation-plan.md`
- Test Data: `docs/guides/011-test-data.md`

---

## Prevention

To prevent similar issues in the future:

1. **Always update enums via migrations** - Don't just change `schema.prisma`
2. **Run `npm run prisma:migrate dev`** after schema changes to generate migrations
3. **Verify schema drift** - Run `npx prisma migrate status` regularly
4. **Test migrations** on a staging database before production deployment

---

**Resolution Date**: 2025-11-10
**Resolved By**: Claude (AI Assistant)
**Status**: ✅ Resolved - Migration created and ready for deployment
