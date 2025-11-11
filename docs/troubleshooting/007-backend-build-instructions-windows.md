# Backend Build Instructions (Windows)

**Status:** ACTIVE
**Date:** 2025-11-10
**Issue:** Backend compilation errors after Prisma schema updates
**Environment:** Windows development machine

---

## Problem Summary

After updating the Prisma schema to fix token-credit migration sync issues, the backend needs:
1. Prisma Client regeneration
2. TypeScript compilation
3. Verification of successful build

The container environment cannot download Prisma engine binaries (403 Forbidden), so these steps must be run on your Windows machine.

---

## Step-by-Step Build Instructions

### 1. Navigate to Backend Directory

```powershell
cd D:\sources\work\rephlo-sites\backend
```

### 2. Regenerate Prisma Client

This creates TypeScript types from the updated schema:

```powershell
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.x.x | library) to .\node_modules\@prisma\client in XXXms
```

**If this fails:**
- Check internet connection (downloads Prisma engine binaries)
- Verify `prisma/schema.prisma` has no syntax errors
- Check for validation errors in output

### 3. Build TypeScript

Compile all TypeScript to JavaScript:

```powershell
npm run build
```

**Expected Output:**
```
> rephlo-backend@1.0.0 build
> tsc

(no output means success)
```

**If compilation fails:**
- Review error messages for type mismatches
- Most common issues:
  - Missing Prisma types (re-run `npx prisma generate`)
  - Implicit `any` types (may need `@ts-ignore` or proper typing)
  - Import errors (check file paths)

### 4. Run Backend in Development Mode

Start the backend server:

```powershell
npm run dev
```

**Expected Output:**
```
[backend] Server running on port 7150
[backend] Environment: development
[backend] Database connected successfully
```

**If server fails to start:**
- Check `.env` file exists with correct values
- Verify database is running (`postgresql://...`)
- Check port 7150 is not already in use
- Review error logs for specific issues

---

## Known Issues & Solutions

### Issue 1: Prisma Client Not Generated

**Error:**
```
Module '"@prisma/client"' has no exported member 'User'
```

**Solution:**
```powershell
npx prisma generate
```

### Issue 2: TypeScript Compilation Errors (100+ errors)

**Errors:**
- `Parameter 'x' implicitly has an 'any' type`
- `Type 'unknown' is not assignable to type 'string'`
- `Property 'Decimal' does not exist on type 'typeof Prisma'`

**Solution:**
Most errors are from:
1. Missing Prisma Client types → Run `npx prisma generate`
2. Strict TypeScript mode catching loose types → Can be suppressed with `// @ts-ignore` if needed

### Issue 3: Database Connection Errors

**Error:**
```
Can't reach database server at localhost:5432
```

**Solution:**
1. Start PostgreSQL service
2. Verify `DATABASE_URL` in `.env`
3. Test connection: `npx prisma db pull --force`

---

## Verification Checklist

After completing the steps above, verify:

- [ ] `npx prisma generate` completes successfully
- [ ] `npm run build` completes without errors
- [ ] `npm run dev` starts server on port 7150
- [ ] Server logs show "Database connected successfully"
- [ ] Admin dashboard loads: `http://localhost:7052/admin`
- [ ] API health check: `http://localhost:7150/health`

---

## Current Status of Schema Fixes

**Commits Applied:**
- ✅ `45b7ca6` - Synced Prisma schema with token-credit migration (394 lines changed)
- ✅ `d390c0f` - Fixed 5 Prisma relation errors
- ✅ `d68f68d` - Updated credit-management service to use camelCase fields

**Schema Changes:**
- Added 8 new enums (RequestType, CreditDeductionReason, etc.)
- Rewrote TokenUsageLedger model (10→25+ fields)
- Rewrote CreditDeductionLedger model with balance tracking
- Updated Provider, UserCreditBalance, ModelProviderPricing models
- Fixed all relation mappings

**What This Fixes:**
- ✅ Database column "timestamp does not exist" errors
- ✅ Admin analytics query failures
- ✅ Token usage ledger type mismatches
- ✅ Credit deduction tracking

---

## If Build Still Fails

If you encounter errors not listed above:

1. **Capture the exact error message**
2. **Check which file is failing** (e.g., `src/services/xyz.service.ts:123`)
3. **Report back with:**
   - Full error message
   - File and line number
   - What step you're on (generate, build, or run)

The most likely remaining issues are:
- Type mismatches in service files (can be fixed with proper typing)
- Missing imports after schema changes
- Implicit `any` types from strict TypeScript mode

---

## Next Steps After Successful Build

Once the backend builds and runs successfully:

1. **Test Admin Dashboard**
   - Navigate to `http://localhost:7052/admin`
   - Verify OAuth login works
   - Check analytics dashboard loads without errors

2. **Test API Endpoints**
   - `/admin/analytics/dashboard-kpis` should return 200 OK
   - No "column does not exist" database errors

3. **Verify Database Schema**
   - Run `npx prisma studio` to open Prisma Studio
   - Verify all tables exist (including `oidc_models`, `token_usage_ledger`)
   - Check data integrity

---

**Related Documents:**
- `006-prisma-schema-token-credit-migration-sync.md` - Schema sync details
- `005-admin-authentication-investigation.md` - Auth issue investigation

**Last Updated:** 2025-11-10
**Author:** Claude Code Agent
