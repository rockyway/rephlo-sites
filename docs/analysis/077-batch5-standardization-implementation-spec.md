# Batch 5: Auth & MFA API Response Standardization - Implementation Specification

**Date:** 2025-11-12
**Status:** Implementation Spec
**Scope:** Auth & MFA endpoints (8 endpoints)
**Priority:** Low (but CRITICAL to test carefully - security-critical endpoints)

---

## Executive Summary

This document specifies the standardization of all authentication and MFA endpoint responses to ensure consistency with the established API standards. These are **security-critical endpoints** - changes must preserve authentication flows and token issuance mechanisms.

**Standard Response Format:**
```typescript
{
  status: 'success',
  data: <PrimaryData>,  // Flat object, NOT nested
  meta?: {
    // Optional metadata
  }
}
```

---

## Endpoints to Standardize (8 total)

### Auth Endpoints (4)
1. **POST /auth/register** - User registration
2. **POST /auth/forgot-password** - Request password reset
3. **POST /auth/reset-password** - Complete password reset
4. **POST /auth/verify-email** - Email verification

### MFA Endpoints (4)
5. **POST /auth/mfa/setup** - Setup two-factor authentication
6. **POST /auth/mfa/verify-setup** - Verify MFA setup
7. **POST /auth/mfa/verify-login** - Verify MFA login code
8. **POST /auth/mfa/disable** - Disable two-factor authentication
9. **POST /auth/mfa/backup-code-login** - MFA backup code authentication

---

## Current Implementation Analysis

### Auth Controller (`backend/src/controllers/auth-management.controller.ts`)

**Current Response Pattern:**
The controller uses helper functions `successResponse()` and `errorResponse()` that return:
```typescript
{ statusCode: number, body: any }
```

Then responses are sent as:
```typescript
res.status(response.statusCode).json(response.body);
```

**Problem:** The `body` field is already the flat data/error object, so responses are **already mostly compliant**, but they lack the explicit `status: 'success'` field and `data` wrapper.

### MFA Routes (`backend/src/routes/mfa.routes.ts`)

**Current Response Pattern:**
MFA routes directly return responses in handlers without using a consistent wrapper:
```typescript
// Current (inconsistent patterns)
return res.status(200).json({
  message: 'MFA setup initiated...',
  qrCode,
  backupCodes,
  secret
});

return res.status(200).json({
  message: 'MFA enabled successfully',
  success: true
});

return res.status(200).json({
  message: 'MFA verification successful',
  success: true,
  userId: user.id
});
```

**Problem:** Multiple response formats - some have `success` field, some have `message`, some have both, some have direct data fields.

---

## Before/After Examples

### 1. POST /auth/register

**File:** `backend/src/controllers/auth-management.controller.ts` (Lines 208-219)

**BEFORE:**
```typescript
const response = successResponse(
  {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    message: 'Registration successful. Please check your email to verify your account.',
  },
  201
);
res.status(response.statusCode).json(response.body);
```

**AFTER:**
```typescript
res.status(201).json({
  status: 'success',
  data: {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
  },
  meta: {
    message: 'Registration successful. Please check your email to verify your account.',
  },
});
```

---

### 2. POST /auth/forgot-password

**File:** `backend/src/controllers/auth-management.controller.ts` (Lines 461-467)

**BEFORE:**
```typescript
const response = successResponse({
  success: true,
  message: 'If an account exists with this email, a password reset link has been sent.',
});
res.status(response.statusCode).json(response.body);
```

**AFTER:**
```typescript
res.status(200).json({
  status: 'success',
  data: {
    success: true,
  },
  meta: {
    message: 'If an account exists with this email, a password reset link has been sent.',
  },
});
```

---

### 3. POST /auth/reset-password

**File:** `backend/src/controllers/auth-management.controller.ts` (Lines 619-624)

**BEFORE:**
```typescript
const response = successResponse({
  success: true,
  message: 'Password reset successfully. Please log in with your new password.',
});
res.status(response.statusCode).json(response.body);
```

**AFTER:**
```typescript
res.status(200).json({
  status: 'success',
  data: {
    success: true,
  },
  meta: {
    message: 'Password reset successfully. Please log in with your new password.',
  },
});
```

---

### 4. POST /auth/verify-email

**File:** `backend/src/controllers/auth-management.controller.ts` (Lines 356-361)

**BEFORE:**
```typescript
const response = successResponse({
  success: true,
  message: 'Email verified successfully. You can now log in.',
});
res.status(response.statusCode).json(response.body);
```

**AFTER:**
```typescript
res.status(200).json({
  status: 'success',
  data: {
    success: true,
  },
  meta: {
    message: 'Email verified successfully. You can now log in.',
  },
});
```

---

### 5. POST /auth/mfa/setup

**File:** `backend/src/routes/mfa.routes.ts` (Lines 89-94)

**BEFORE:**
```typescript
return res.status(200).json({
  message: 'MFA setup initiated. Scan QR code with authenticator app and verify.',
  qrCode,
  backupCodes,
  secret,
});
```

**AFTER:**
```typescript
return res.status(200).json({
  status: 'success',
  data: {
    qrCode,
    backupCodes,
    secret,
  },
  meta: {
    message: 'MFA setup initiated. Scan QR code with authenticator app and verify.',
  },
});
```

---

### 6. POST /auth/mfa/verify-setup

**File:** `backend/src/routes/mfa.routes.ts` (Lines 184-187)

**BEFORE:**
```typescript
return res.status(200).json({
  message: 'MFA enabled successfully',
  success: true,
});
```

**AFTER:**
```typescript
return res.status(200).json({
  status: 'success',
  data: {
    success: true,
  },
  meta: {
    message: 'MFA enabled successfully',
  },
});
```

---

### 7. POST /auth/mfa/verify-login

**File:** `backend/src/routes/mfa.routes.ts` (Lines 268-272)

**BEFORE:**
```typescript
return res.status(200).json({
  message: 'MFA verification successful',
  success: true,
  userId: user.id,
});
```

**AFTER:**
```typescript
return res.status(200).json({
  status: 'success',
  data: {
    success: true,
    userId: user.id,
  },
  meta: {
    message: 'MFA verification successful',
  },
});
```

---

### 8. POST /auth/mfa/disable

**File:** `backend/src/routes/mfa.routes.ts` (Lines 386-389)

**BEFORE:**
```typescript
return res.status(200).json({
  message: 'MFA disabled successfully',
  success: true,
});
```

**AFTER:**
```typescript
return res.status(200).json({
  status: 'success',
  data: {
    success: true,
  },
  meta: {
    message: 'MFA disabled successfully',
  },
});
```

---

### 9. POST /auth/mfa/backup-code-login

**File:** `backend/src/routes/mfa.routes.ts` (Lines 511-516)

**BEFORE:**
```typescript
return res.status(200).json({
  message: 'Backup code verified successfully',
  success: true,
  userId: user.id,
  remainingBackupCodes: updatedBackupCodes.length,
});
```

**AFTER:**
```typescript
return res.status(200).json({
  status: 'success',
  data: {
    success: true,
    userId: user.id,
    remainingBackupCodes: updatedBackupCodes.length,
  },
  meta: {
    message: 'Backup code verified successfully',
  },
});
```

---

## Implementation Strategy

### Phase 1: Auth Controller Standardization

**File:** `backend/src/controllers/auth-management.controller.ts`

**Approach:**
1. Remove helper functions `successResponse()` and `errorResponse()` (lines 51-69)
2. Update all success responses to use standard format directly
3. Move `message` fields to `meta.message`
4. Ensure `data` field contains primary response data

**Methods to Update:**
- `register()` - Lines 208-219
- `verifyEmail()` - Lines 356-361
- `forgotPassword()` - Lines 461-467
- `resetPassword()` - Lines 619-624

**Error Responses:**
- Already use correct format: `{ error: { code, message, details } }`
- No changes needed for error responses

---

### Phase 2: MFA Routes Standardization

**File:** `backend/src/routes/mfa.routes.ts`

**Approach:**
1. Update all inline route handlers to use standard response format
2. Move `message` fields to `meta.message`
3. Move `success` field to `data.success`
4. Group related data fields under `data`

**Handlers to Update:**
- `/setup` - Lines 89-94
- `/verify-setup` - Lines 184-187
- `/verify-login` - Lines 268-272
- `/disable` - Lines 386-389
- `/backup-code-login` - Lines 511-516

---

### Phase 3: Frontend Updates (if needed)

**Assessment Required:**
- Check if frontend consumes these endpoints
- Most auth endpoints are called server-side or by identity-provider
- MFA endpoints may be used by frontend (admin panel)

**Files to Check:**
- `frontend/src/api/auth.ts` (if exists)
- `frontend/src/api/admin.ts` (for MFA management)

---

## Security Considerations

### ⚠️ CRITICAL - Do NOT Change:

1. **Token Generation Logic** - All token generation must remain unchanged
2. **Password Hashing** - bcrypt logic must remain unchanged
3. **MFA Secret Generation** - speakeasy logic must remain unchanged
4. **Authentication Flow** - Login/registration logic must remain unchanged
5. **Error Messages** - Security error messages (email enumeration prevention) must remain unchanged

### What IS Changing:

✅ **Only the response wrapper format** - from raw data to `{ status, data, meta }`
✅ **Message field location** - from top-level to `meta.message`
✅ **Response structure** - ensure consistent format across all endpoints

---

## Error Response Format (Already Compliant)

Both auth controller and MFA routes already use correct error format:

```typescript
// Current error format (ALREADY CORRECT - no changes needed)
{
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details?: { ... }
  }
}
```

**No changes needed for error responses.**

---

## Frontend Impact Assessment

**Expected Impact:** Minimal to None

**Reasoning:**
1. Most auth endpoints are called by identity-provider or server-to-server
2. Frontend likely uses OAuth flow, not direct auth endpoints
3. MFA setup may be exposed in admin panel - needs verification

**Action Items:**
1. Search frontend for auth API calls: `grep -r "/auth/" frontend/src/`
2. Search for MFA API calls: `grep -r "/mfa/" frontend/src/`
3. Update response unwrapping if found

---

## Testing Requirements

### ⚠️ CRITICAL - Manual Testing Required

These are **security-critical endpoints** - automated build validation is NOT sufficient.

### Test Checklist:

**Auth Endpoints:**
- [ ] Test user registration flow (POST /auth/register)
  - [ ] Verify email verification token sent
  - [ ] Verify user created in database
  - [ ] Check response format matches spec
- [ ] Test email verification (POST /auth/verify-email)
  - [ ] Verify with valid token
  - [ ] Verify error for invalid/expired token
- [ ] Test forgot password flow (POST /auth/forgot-password)
  - [ ] Verify reset email sent for valid user
  - [ ] Verify generic response for non-existent user (security)
- [ ] Test reset password (POST /auth/reset-password)
  - [ ] Verify password changed successfully
  - [ ] Verify old password no longer works
  - [ ] Verify new password works

**MFA Endpoints:**
- [ ] Test MFA setup (POST /auth/mfa/setup)
  - [ ] Verify QR code generated
  - [ ] Verify backup codes generated
  - [ ] Check response format matches spec
- [ ] Test MFA verification (POST /auth/mfa/verify-setup)
  - [ ] Verify valid TOTP token enables MFA
  - [ ] Verify invalid token rejected
- [ ] Test MFA login verification (POST /auth/mfa/verify-login)
  - [ ] Verify valid TOTP allows login
  - [ ] Verify invalid TOTP rejected
- [ ] Test MFA disable (POST /auth/mfa/disable)
  - [ ] Verify password + TOTP required
  - [ ] Verify MFA disabled successfully
- [ ] Test backup code login (POST /auth/mfa/backup-code-login)
  - [ ] Verify valid backup code works
  - [ ] Verify backup code consumed (single-use)
  - [ ] Verify remaining count decremented

---

## Build Validation

### Backend Build
```bash
cd backend && npm run build
```
**Expected:** 0 TypeScript errors

### Frontend Build
```bash
cd frontend && npm run build
```
**Expected:** 0 TypeScript errors (or same errors as before if not consuming these endpoints)

---

## Implementation Checklist

### Backend Updates
- [ ] Update `backend/src/controllers/auth-management.controller.ts`
  - [ ] Remove helper functions (lines 51-69)
  - [ ] Update `register()` response (lines 208-219)
  - [ ] Update `verifyEmail()` response (lines 356-361)
  - [ ] Update `forgotPassword()` response (lines 461-467)
  - [ ] Update `resetPassword()` response (lines 619-624)

- [ ] Update `backend/src/routes/mfa.routes.ts`
  - [ ] Update `/setup` handler (lines 89-94)
  - [ ] Update `/verify-setup` handler (lines 184-187)
  - [ ] Update `/verify-login` handler (lines 268-272)
  - [ ] Update `/disable` handler (lines 386-389)
  - [ ] Update `/backup-code-login` handler (lines 511-516)

### Frontend Updates
- [ ] Search for auth API calls in frontend
- [ ] Search for MFA API calls in frontend
- [ ] Update response unwrapping if needed

### Build Validation
- [ ] Backend build passes (0 errors)
- [ ] Frontend build passes (0 errors)

### Manual Testing
- [ ] All auth flow tests pass
- [ ] All MFA flow tests pass
- [ ] Security properties maintained (no email enumeration, etc.)

---

## Success Criteria

- ✅ All 8 endpoints return standardized `{ status, data, meta }` format
- ✅ Backend builds with 0 TypeScript errors
- ✅ Frontend builds with 0 TypeScript errors
- ✅ Authentication flows remain functional (login, registration, password reset)
- ✅ MFA flows remain functional (setup, verify, disable, backup codes)
- ✅ Security properties maintained (no breaking changes to auth logic)
- ✅ Manual testing confirms all endpoints work correctly

---

## References

- **Master Plan:** `docs/plan/158-api-response-standardization-plan.md`
- **Batch 1 Completion:** `docs/progress/165-batch1-api-standardization-complete.md`
- **API Standards:** `docs/reference/156-api-standards.md`
- **Auth Implementation:** `docs/plan/103-auth-endpoints-implementation.md`

---

**Document Status:** Ready for Implementation
**Next Step:** Implement backend changes, then validate with builds and manual testing
