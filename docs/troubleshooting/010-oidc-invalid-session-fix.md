# OIDC Invalid Session Fix

**Date:** 2025-11-14
**Status:** ✅ Resolved
**Impact:** Critical - OAuth authorization flow crashes

---

## Problem Summary

The OIDC provider was crashing during OAuth authorization with the error:

```
Cannot read properties of undefined (reading 'getOIDCScopeFiltered')
```

**Root Cause:** Sessions referencing deleted or non-existent users persisted in the database. When the OIDC provider tried to load the account during authorization, it received `undefined` but attempted to call methods on it anyway.

---

## Technical Details

### Error Stack Trace

```
TypeError: Cannot read properties of undefined (reading 'getOIDCScopeFiltered')
    at interactions (oidc-provider/lib/actions/authorization/interactions.js:60:19)
    at sessionHandler (oidc-provider/lib/shared/session.js:28:5)
    at authorizationErrorHandler (oidc-provider/lib/shared/authorization_error_handler.js:47:7)
```

### Issue Chain

1. **Session Persistence:** OIDC sessions stored in `oidc_models` table with `accountId` references
2. **User Deletion:** Users deleted from database, but their sessions remained
3. **Stale References:** Sessions continued to exist with `accountId` pointing to non-existent users
4. **Authorization Failure:** During `/oauth/authorize`, the provider:
   - Loaded the session (valid session record)
   - Called `findAccount(accountId)` → returned `undefined` (user not found)
   - Tried to call `account.getOIDCScopeFiltered()` → crash

---

## Solution Implemented

### 1. Session Validation Middleware

**File:** `identity-provider/src/middleware/session-validator.ts`

**Strategy:**
- Runs **BEFORE** oidc-provider middleware
- Queries `oidc_models` table for active sessions (not expired)
- Validates each session's `accountId` against `users` table
- Deletes invalid sessions from database
- Clears session cookies for invalid sessions

**Key Features:**
- ✅ Validates sessions reference existing, active users
- ✅ Deletes invalid sessions from database
- ✅ Clears cookies to force re-authentication
- ✅ Non-blocking (failures logged but don't prevent requests)
- ✅ Performance-optimized (only validates on OAuth/interaction routes)

**Integration:**
```typescript
// identity-provider/src/app.ts
app.use(createSessionValidator(oidcProvider, prisma));  // BEFORE oidc middleware
app.use('/', oidcProvider.callback());                  // OIDC middleware
```

### 2. Defensive Handling in OIDC Configuration

**File:** `identity-provider/src/config/oidc.ts`

**Enhanced `findAccount`:**
- Added logging when account not found
- Tracks context for debugging (path, method, accountId)

**Enhanced `loadExistingGrant`:**
- ✅ Validates account exists BEFORE creating grants
- ✅ Destroys session if account not found
- ✅ Comprehensive error handling with try-catch
- ✅ Detailed logging for debugging

**Code Pattern:**
```typescript
loadExistingGrant: async (ctx) => {
  // Verify account exists before creating grant
  const account = await authService.findAccount(accountId);
  if (!account) {
    await ctx.oidc.session.destroy();  // Clear invalid session
    return undefined;                   // Force re-authentication
  }
  // ... continue with grant creation
}
```

### 3. Manual Cleanup Script

**File:** `identity-provider/scripts/cleanup-invalid-sessions.ts`

**Purpose:** One-time cleanup of existing invalid sessions

**Features:**
- ✅ Validates all active sessions
- ✅ Identifies sessions with deleted/inactive users
- ✅ Deletes invalid sessions
- ✅ Removes expired sessions
- ✅ Detailed reporting

**Usage:**
```bash
cd identity-provider
npx ts-node scripts/cleanup-invalid-sessions.ts
```

**Example Output:**
```
🔍 Starting invalid session cleanup...
📊 Found 2 active sessions
❌ Invalid session: M4eqyWOjTeK_... - user not found
❌ Invalid session: NgwG1Cvj9D3t... - user not found

📊 Validation Summary:
   ✅ Valid sessions: 0
   🔓 Unauthenticated sessions: 0
   ❌ Invalid sessions: 2

🗑️  Deleting 2 invalid sessions...
✅ Deleted 2 invalid sessions
🎉 Cleanup complete!
```

---

## Verification

### Initial State
- ✅ Identified 2 invalid sessions in database
- ✅ Reproduced error with `/oauth/authorize` request

### After Fix
- ✅ Cleanup script removed 2 invalid sessions
- ✅ Identity provider started successfully with new middleware
- ✅ Session validator middleware integrated before OIDC provider
- ✅ Defensive handling added to `findAccount` and `loadExistingGrant`

### Testing Scenarios Covered

1. **Valid Session Flow:**
   - User logs in → Session created → Authorization succeeds ✅

2. **Invalid Session Cleanup:**
   - User deleted → Session remains → Middleware detects & deletes ✅

3. **Authorization with Invalid Session:**
   - Stale session → Validation catches → Returns 401 error ✅

4. **Expired Session Cleanup:**
   - Sessions past `expiresAt` → Cleanup script removes ✅

---

## Prevention Measures

### Automatic Prevention
1. **Session Validator Middleware:** Runs on every OAuth/interaction request
2. **Defensive Grant Loading:** Validates account before creating grants
3. **Session Destruction:** Automatically clears invalid sessions

### Manual Maintenance
- Run cleanup script periodically: `npx ts-node scripts/cleanup-invalid-sessions.ts`
- Monitor logs for "Invalid session detected" warnings
- Review session count in database: `SELECT COUNT(*) FROM oidc_models WHERE kind='Session'`

### Database Considerations

**Future Enhancement:** Consider adding cascade delete on user deletion:

```sql
-- When user is deleted, delete associated sessions
-- This would require updating the schema to add FK constraint
ALTER TABLE oidc_models
  ADD CONSTRAINT fk_session_user
  FOREIGN KEY (payload->>'accountId')
  REFERENCES users(id)
  ON DELETE CASCADE;
```

**Note:** Currently not implemented due to JSONB field complexity. Middleware-based cleanup is more flexible.

---

## Files Modified

### New Files
1. `identity-provider/src/middleware/session-validator.ts` - Session validation middleware
2. `identity-provider/scripts/cleanup-invalid-sessions.ts` - Manual cleanup script

### Modified Files
1. `identity-provider/src/app.ts` - Added session validator middleware
2. `identity-provider/src/config/oidc.ts` - Enhanced `findAccount` and `loadExistingGrant` with defensive handling

### Lines of Code
- **Total Added:** ~280 lines
- **Session Validator:** ~160 lines
- **Cleanup Script:** ~120 lines
- **OIDC Config Updates:** ~50 lines modified

---

## Key Takeaways

### What Went Wrong
- ❌ No validation of session integrity during authorization
- ❌ `findAccount` returning `undefined` not handled by oidc-provider
- ❌ Sessions persisted after user deletion

### What We Fixed
- ✅ Proactive session validation before OIDC processing
- ✅ Defensive handling in grant creation
- ✅ Automatic cleanup of invalid sessions
- ✅ Manual cleanup script for one-time fixes

### Best Practices Applied
1. **Defense in Depth:** Multiple layers of validation (middleware + config)
2. **Fail Gracefully:** Don't crash - log and recover
3. **Data Integrity:** Validate references before use
4. **Observability:** Comprehensive logging for debugging

---

## Monitoring & Alerts

### Log Patterns to Watch

**Invalid Session Detected:**
```
SessionValidator: Invalid session detected - user not found or inactive
```

**Account Not Found:**
```
OIDC: findAccount returned undefined - user not found
```

**Grant Loading Failure:**
```
OIDC: loadExistingGrant - account not found, clearing session
```

### Recommended Actions
- If warnings increase → Run cleanup script
- If errors persist → Check user deletion process
- Review session table size weekly

---

## Related Documentation

- [OIDC Configuration](../reference/oidc-provider-config.md)
- [Session Management](../guides/session-management.md)
- [Database Schema](../reference/database-schema.md)

---

## Conclusion

The fix addresses the root cause (invalid session references) through three complementary approaches:

1. **Preventive:** Session validator middleware catches issues before they cause errors
2. **Defensive:** Enhanced OIDC config validates data before use
3. **Corrective:** Cleanup script removes existing invalid data

**Status:** ✅ Issue fully resolved. No recurrence expected with automatic validation in place.
