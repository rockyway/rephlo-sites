# MFA Schema Architecture Technical Debt

**Document ID**: 002
**Category**: Technical Debt
**Created**: 2025-11-09
**Priority**: Medium
**Estimated Effort**: 7-10 hours

## Overview

MFA (Multi-Factor Authentication) fields were added to the backend Prisma schema as a quick fix to resolve TypeScript compilation errors. This creates technical debt as MFA functionality logically belongs in the identity-provider service, not the resource API backend.

## Current State

### Backend Schema (`backend/prisma/schema.prisma`)

```prisma
// Multi-Factor Authentication (MFA) Fields
mfaSecret      String?   @map("mfa_secret") @db.VarChar(255)
// TOTP secret (base32 encoded)
mfaEnabled     Boolean   @default(false) @map("mfa_enabled")
// Whether MFA is enabled for this user
mfaBackupCodes String?   @map("mfa_backup_codes") @db.Text
// JSON string of hashed backup codes for account recovery
mfaVerifiedAt  DateTime? @map("mfa_verified_at")
// Timestamp when MFA was last verified
mfaMethod      String?   @map("mfa_method") @db.VarChar(20)
// MFA method: "totp" (Time-based One-Time Password)

@@index([mfaEnabled])
```

### Identity Provider Schema (`identity-provider/prisma/schema.prisma`)

```prisma
// Multi-Factor Authentication (MFA) Fields
mfaSecret      String?  @map("mfa_secret") @db.VarChar(255)
// TOTP secret (base32 encoded)
mfaEnabled     Boolean  @default(false) @map("mfa_enabled")
// Whether MFA is enabled for this user
mfaBackupCodes String[] @map("mfa_backup_codes")
// Hashed backup codes for account recovery

@@index([mfaEnabled])
```

**Note**: There's a type mismatch - backend uses `String?` (JSON string) while identity-provider uses `String[]` (array).

## Problem

1. **Schema Duplication**: MFA fields exist in both services' Prisma schemas
2. **Type Inconsistency**: `mfaBackupCodes` is `String?` in backend, `String[]` in identity-provider
3. **Architectural Misalignment**: MFA routes (`backend/src/routes/mfa.routes.ts`) exist in resource API instead of auth service
4. **Maintenance Burden**: Changes to MFA functionality require updates in multiple places

## Root Cause

The backend contains MFA routes that directly manipulate User model MFA fields, but those fields were only defined in the identity-provider schema. When the backend tried to compile, TypeScript errors occurred because the Prisma-generated types didn't include MFA fields.

### Affected Files

**Backend**:
- `backend/src/routes/mfa.routes.ts` - MFA endpoint handlers
- `backend/src/middleware/require-mfa.middleware.ts` - MFA verification middleware
- `backend/src/db/seed.ts` - Uses `mfaVerifiedAt` and `mfaMethod` fields
- `backend/src/__tests__/mocks/auth.service.mock.ts` - Mock includes MFA fields

## Recommendations

### Option 1: Move MFA to Identity Provider (Preferred)

**Effort**: 7-10 hours
**Impact**: High - Correct architectural alignment

1. **Move MFA Routes** (3-4 hours)
   - Relocate `backend/src/routes/mfa.routes.ts` to `identity-provider/src/routes/`
   - Update imports and dependencies
   - Adjust endpoint paths (e.g., `/auth/mfa/*` instead of `/mfa/*`)

2. **Remove Backend MFA Fields** (1-2 hours)
   - Remove MFA fields from `backend/prisma/schema.prisma`
   - Create migration to preserve data
   - Regenerate Prisma client

3. **Update Identity Provider** (2-3 hours)
   - Align `mfaBackupCodes` type (use JSON string for consistency)
   - Add missing fields: `mfaVerifiedAt`, `mfaMethod`
   - Update MFA service to handle new fields
   - Create migration

4. **Update Tests** (1-2 hours)
   - Move/update MFA tests to identity-provider
   - Update mocks to remove backend MFA references
   - Verify integration tests pass

5. **Documentation** (30 min)
   - Update API documentation
   - Update README with new MFA endpoints

### Option 2: Keep Current State (Quick Fix - Already Implemented)

**Effort**: 1-1.5 hours (Complete)
**Impact**: Low - Technical debt remains

- ✅ Added MFA fields to backend schema
- ✅ Aligned field types (all String? or DateTime?)
- ✅ TypeScript compilation succeeds
- ❌ Architectural debt remains

## Migration Path

When implementing Option 1 (recommended):

1. **Phase 1**: Dual Write Period
   - Keep fields in both schemas
   - Update MFA operations to write to both locations
   - Validate data consistency

2. **Phase 2**: Cutover
   - Update clients to use identity-provider MFA endpoints
   - Remove backend MFA routes
   - Monitor for errors

3. **Phase 3**: Cleanup
   - Remove MFA fields from backend schema
   - Clean up obsolete code
   - Update documentation

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-09 | Implemented Option 2 (Quick Fix) | Needed to unblock backend startup for frontend testing. MFA fields added to backend schema to resolve TypeScript compilation errors. |

## Next Steps

1. Schedule time to implement Option 1 (Move MFA to Identity Provider)
2. Create detailed implementation plan with rollback strategy
3. Set up monitoring for MFA-related errors during migration
4. Update this document after migration completes

## Related Documents

- [docs/analysis/001-mfa-schema-architecture-analysis.md](./001-mfa-schema-architecture-analysis.md) - Initial architectural analysis
- [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma) - Backend User model
- [identity-provider/prisma/schema.prisma](../../identity-provider/prisma/schema.prisma) - Identity Provider User model
- [backend/src/routes/mfa.routes.ts](../../backend/src/routes/mfa.routes.ts) - MFA routes (should be moved)
