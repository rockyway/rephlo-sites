# 005: Admin Authentication Investigation

**Date:** 2025-11-10
**Branch:** feature/dedicated-api
**Status:** Investigation Complete
**Severity:** High
**Components:** Frontend (OAuth), Identity Provider (OIDC), Backend (Auth Middleware)

## Problem Description

User cannot access the backend admin site at `/admin` after logging in with admin credentials.

### Symptoms

1. User logs in with admin credentials (admin.test@rephlo.ai / AdminPassword123!)
2. OAuth callback completes successfully
3. Tokens are stored in sessionStorage
4. User is redirected to `/admin` dashboard
5. API calls to `/admin/*` endpoints fail with 401 or 403 errors

## Investigation Findings

### ✅ Correctly Configured Components

#### 1. Frontend OAuth Configuration
**File:** `frontend/src/utils/oauth.ts:20`

```typescript
scope: 'openid email profile offline_access admin',
```

- ✅ Frontend correctly requests `admin` scope
- ✅ Uses PKCE for security
- ✅ Includes resource parameter for JWT tokens

#### 2. OAuth Client Configuration
**File:** `backend/prisma/seed.ts:68-85`

```typescript
{
  clientId: 'web-app-test',
  ...
  scope: 'openid email profile offline_access llm.inference models.read user.info credits.read admin',
}
```

- ✅ OAuth client has `admin` scope in allowed scopes
- ✅ Configured for public client with PKCE
- ✅ Refresh tokens enabled

#### 3. OIDC Provider Configuration
**File:** `identity-provider/src/config/oidc.ts`

- Line 248: `admin` scope registered in supported scopes
- Line 264: `admin` scope mapped to `['role', 'permissions']` claims
- Line 206: Admin scope included in resource server configuration

#### 4. Auth Service Claims Generation
**File:** `identity-provider/src/services/auth.service.ts:175-185`

```typescript
// Admin scope - include role claim for authorization
if (scopes.includes('admin')) {
  claims.role = user.role || 'user';
  logger.debug('AuthService: Including role claim in token', {
    userId: user.id,
    role: claims.role,
  });
}
```

- ✅ Returns `role` claim when `admin` scope is present
- ✅ Properly logs role claim inclusion

#### 5. Backend Authentication Middleware
**File:** `backend/src/middleware/auth.middleware.ts`

- Line 93: Extracts `role` from JWT claims
- Line 126: Extracts `role` from introspection response
- Line 453: JWT claim check (fastest path)
- Line 477-511: Falls back to cache/DB if role not in JWT

- ✅ Three-tier optimization for role checking
- ✅ Proper fallback mechanism

### ⚠️ Potential Root Causes

#### 1. MFA Enabled for Admin User (MOST LIKELY)
**File:** `backend/prisma/seed.ts:142`

```typescript
{
  email: 'admin.test@rephlo.ai',
  ...
  mfaEnabled: true,  // ⚠️ MFA is enabled!
}
```

**Problem:** The admin user has MFA enabled, which may require additional verification steps during the OAuth flow that aren't currently implemented in the OAuth callback handler.

**Solution Options:**
- Option A: Disable MFA for the test admin user
- Option B: Implement MFA verification in the OAuth flow
- Option C: Create a separate admin user without MFA for testing

#### 2. Token Format Issues

The backend expects JWT access tokens with the `role` claim, but if the identity provider issues opaque tokens, the role won't be available until introspection.

**Verification Needed:**
- Check if access tokens are JWT format
- Verify role claim is present in token
- Check introspection response includes role

#### 3. Token Introspection Not Including Role

When JWT verification fails and the backend falls back to token introspection, the introspection endpoint might not be returning the `role` claim.

**File to check:** Identity Provider's introspection endpoint implementation

#### 4. Services Not Restarted

The code changes may not be active if services haven't been restarted.

**Required:**
- Restart identity-provider service
- Restart backend API service
- Restart frontend dev server
- Clear browser cache and sessionStorage

#### 5. Database Not Seeded

The OAuth client and admin user might not be properly configured in the database.

**Required:**
- Run `npm run seed` in backend directory
- Verify OAuth clients exist in database
- Verify admin user exists with correct role

## Recommended Fix Steps

### Step 1: Verify Database is Seeded

```bash
cd backend
npm run seed
```

Check output for:
- ✓ Created/Updated OAuth clients
- ✓ Created admin user (admin.test@rephlo.ai)

### Step 2: Disable MFA for Test Admin User (Temporary Fix)

Update the seed file to disable MFA for testing:

**File:** `backend/prisma/seed.ts:142`

```typescript
{
  email: 'admin.test@rephlo.ai',
  ...
  mfaEnabled: false,  // Changed from true
}
```

Then re-seed:
```bash
npm run seed
```

### Step 3: Restart All Services

```bash
# Terminal 1: Identity Provider
cd identity-provider
npm run dev

# Terminal 2: Backend API
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Step 4: Clear Browser State

1. Open DevTools (F12)
2. Application tab → Storage → Clear site data
3. Or manually clear sessionStorage:
```javascript
sessionStorage.clear()
```

### Step 5: Test OAuth Login Flow

1. Navigate to `http://localhost:7152/login`
2. Click "Login with OAuth"
3. Enter credentials:
   - Email: `admin.test@rephlo.ai`
   - Password: `AdminPassword123!`
4. Monitor browser console for:
   - `[OAuthCallback] Storing tokens in sessionStorage`
   - `[OAuthCallback] Storage verification`
   - `[API Interceptor] Request` with `hasToken: true`
   - NO `[Auth] Clearing all authentication data` warnings

### Step 6: Verify Token Contains Role Claim

Open browser console and run:

```javascript
// Get access token
const token = sessionStorage.getItem('access_token');

// Decode JWT (split by dots, parse middle part)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);

// Check for role claim
console.log('Role:', payload.role);
console.log('Scope:', payload.scope);
```

Expected output:
```javascript
{
  sub: "user-id-here",
  email: "admin.test@rephlo.ai",
  role: "admin",  // ⚠️ THIS SHOULD BE PRESENT
  scope: "openid email profile offline_access admin",
  ...
}
```

### Step 7: Test Admin API Call

```javascript
// In browser console
fetch('http://localhost:7150/admin/metrics', {
  headers: {
    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
  }
})
.then(r => r.json())
.then(data => console.log('Admin API response:', data))
.catch(err => console.error('Admin API error:', err));
```

Expected: 200 OK with metrics data
If 401: Token missing or invalid
If 403: Token valid but role claim missing or not "admin"

## Alternative: Create New Admin User Without MFA

If MFA is required for the main admin user, create a test admin user without MFA:

```typescript
// Add to backend/prisma/seed.ts USER_PERSONAS array
{
  email: 'admin.nomfa@rephlo.ai',
  firstName: 'Admin',
  lastName: 'NoMFA',
  username: 'adminnomfa',
  password: 'AdminPassword123!',
  role: 'admin',
  emailVerified: true,
  authProvider: 'local',
  mfaEnabled: false,  // ✅ No MFA
  subscriptionTier: 'pro' as const,
  subscriptionStatus: 'active' as const,
  description: 'Admin user without MFA for testing',
}
```

## Verification Checklist

After implementing fixes, verify:

- [ ] Database seeded successfully
- [ ] All services restarted
- [ ] Browser cache cleared
- [ ] OAuth login completes without errors
- [ ] Tokens stored in sessionStorage
- [ ] Access token is JWT format (has 3 parts separated by dots)
- [ ] Token payload contains `role: "admin"`
- [ ] Token payload contains `admin` in scope string
- [ ] API calls to `/admin/*` endpoints return 200 OK
- [ ] No `[Auth] Clearing all authentication data` warnings in console

## Related Files

### Frontend
- `frontend/src/utils/oauth.ts` - OAuth configuration and flow
- `frontend/src/services/api.ts` - Axios interceptors and token handling
- `frontend/src/components/auth/ProtectedRoute.tsx` - Route protection
- `frontend/src/pages/auth/OAuthCallback.tsx` - OAuth callback handler

### Backend
- `backend/src/middleware/auth.middleware.ts` - JWT validation and admin check
- `backend/src/routes/admin.routes.ts` - Admin route protection
- `backend/prisma/seed.ts` - Database seeding (OAuth clients and users)

### Identity Provider
- `identity-provider/src/config/oidc.ts` - OIDC configuration
- `identity-provider/src/services/auth.service.ts` - Claims generation
- `identity-provider/src/controllers/auth.controller.ts` - Login handler

## Next Steps

1. Implement the fixes above
2. Test the complete OAuth flow
3. Document any remaining issues
4. Consider implementing proper MFA support in OAuth flow if required
5. Update this document with resolution status

---

**Status:** Ready for implementation and testing
**Priority:** High - Blocking admin access
**Estimated Time:** 30 minutes for fixes + testing
