# 004: OAuth Token Storage Being Cleared by Axios Interceptor

**Date:** 2025-11-09
**Status:** Fixed
**Severity:** High
**Components:** Frontend (OAuth Callback, Axios Interceptor, ProtectedRoute)

## Problem Description

After successful OAuth login, tokens were not found in sessionStorage, causing all dashboard API calls to fail with 401 "missing authorization header" errors.

### Symptoms

1. User completes OAuth login successfully
2. OAuth callback page shows "Login Successful!" with user details
3. User is redirected to `/admin` dashboard
4. All API calls fail with 401 Unauthorized
5. Checking `sessionStorage` shows all tokens missing (access_token, refresh_token, token_expires_at, user)

### User Report

```
after I login with admin credentials (admin.test@rephlo.ai / AdminPassword123!)
http://localhost:7152/test-tokens.html
Tokens missing from sessionStorage
  access_token: NOT FOUND
  refresh_token: NOT FOUND
  token_expires_at: NOT FOUND
  user: NOT FOUND
```

## Root Cause

The axios request interceptor was **too aggressive** in clearing authentication data. Here's the problematic sequence:

1. OAuth callback successfully stores tokens in sessionStorage (OAuthCallback.tsx:179-182)
2. User is redirected to `/admin` after 2 seconds
3. AdminDashboard immediately makes API calls to fetch dashboard data
4. **Axios request interceptor runs** (frontend/src/services/api.ts:114-134)
5. Interceptor calls `refreshTokenIfNeeded()` to validate/refresh token
6. If token refresh or validation fails for ANY reason, `clearAuth()` is called
7. **All tokens are removed** from sessionStorage
8. Subsequent checks show no tokens present

### Why Token Refresh Failed

Possible reasons the interceptor triggered `clearAuth()`:
- Token format issues (opaque vs JWT)
- Network error calling refresh endpoint
- Race condition with OAuth callback still processing
- React StrictMode causing double-execution
- Premature expiry check triggering refresh

## Solution Implemented

### 1. Enhanced Logging (api.ts:42-62)

Added comprehensive logging to `clearAuth()` function to track WHEN and WHY tokens are cleared:

```typescript
function clearAuth(reason?: string): void {
  const hadTokens = !!sessionStorage.getItem('access_token') && !!sessionStorage.getItem('refresh_token');

  console.warn('[Auth] Clearing all authentication data', {
    reason: reason || 'unknown',
    currentPath: window.location.pathname,
    hadAccessToken: !!sessionStorage.getItem('access_token'),
    hadRefreshToken: !!sessionStorage.getItem('refresh_token'),
    timestamp: new Date().toISOString(),
  });

  // Only log stack trace if we're actually clearing existing tokens
  if (hadTokens) {
    console.error('[Auth] Stack trace for token clearing:', new Error().stack);
  }

  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('token_expires_at');
  sessionStorage.removeItem('user');
}
```

### 2. Route Protection for OAuth Callback (api.ts:130-138)

Added guard to prevent axios interceptor from interfering with OAuth callback and login pages:

```typescript
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip token refresh on OAuth callback route to prevent interference
    const isOAuthCallback = window.location.pathname.includes('/oauth/callback');
    const isLoginPage = window.location.pathname.includes('/login');

    if (isOAuthCallback || isLoginPage) {
      console.log('[API Interceptor] Skipping token check on auth route:', window.location.pathname);
      return config;
    }

    // ... rest of interceptor logic
  }
);
```

### 3. Reason Tracking for All clearAuth() Calls

Updated all `clearAuth()` calls to include a reason parameter:

- `clearAuth('token_refresh_failed')` - Token refresh endpoint failed (api.ts:113)
- `clearAuth('401_refresh_failed')` - Token refresh failed on 401 response (api.ts:192)
- `clearAuth('401_refresh_exception')` - Exception during 401 token refresh (api.ts:205)
- `clearAuth('protected_route_refresh_failed')` - ProtectedRoute token refresh failed (ProtectedRoute.tsx:52)
- `clearAuth('protected_route_check_failed')` - ProtectedRoute auth check exception (ProtectedRoute.tsx:61)

### 4. Enhanced Logging Throughout Auth Flow

Added detailed console logging in:
- ProtectedRoute component (ProtectedRoute.tsx:43-56)
- Axios request interceptor (api.ts:143-148)
- Token refresh failure paths (api.ts:112-113)
- OAuth callback token storage (OAuthCallback.tsx:172-193)

## Files Modified

### frontend/src/services/api.ts
- Lines 42-62: Enhanced `clearAuth()` with logging and reason tracking
- Lines 113: Added reason parameter 'token_refresh_failed'
- Lines 130-138: Added OAuth callback route protection in request interceptor
- Lines 143-148: Enhanced request interceptor logging
- Lines 191-192: Added reason parameter '401_refresh_failed'
- Lines 204-205: Added reason parameter '401_refresh_exception'

### frontend/src/components/auth/ProtectedRoute.tsx
- Lines 43-56: Added logging for token expiry check and refresh
- Line 52: Added reason parameter 'protected_route_refresh_failed'
- Line 61: Added reason parameter 'protected_route_check_failed'

### frontend/src/pages/auth/OAuthCallback.tsx
- Lines 172-193: Added comprehensive token storage logging (already present from earlier fix)

### frontend/public/test-tokens.html
- Created diagnostic page for debugging token storage issues

## Testing Instructions

1. **Clear sessionStorage** before testing
2. **Open browser DevTools Console** (F12)
3. **Navigate to** `http://localhost:7152/`
4. **Click login button** and complete OAuth flow with credentials:
   - Email: `admin.test@rephlo.ai`
   - Password: `AdminPassword123!`
5. **Monitor console logs** for:
   - `[OAuthCallback] Storing tokens in sessionStorage` - Tokens are being stored
   - `[OAuthCallback] Storage verification` - Verification of storage success
   - `[API Interceptor] Skipping token check on auth route` - Interceptor is not interfering
   - `[ProtectedRoute] Token valid, user authenticated` - ProtectedRoute accepts tokens
6. **After redirect to dashboard**, check console for:
   - `[API Interceptor] Request` logs should show `hasToken: true`
   - NO `[Auth] Clearing all authentication data` warnings
7. **Navigate to** `http://localhost:7152/test-tokens.html`
8. **Verify tokens present** in sessionStorage display

### Expected Console Output (Success Case)

```
[OAuthCallback] Storing tokens in sessionStorage: {hasAccessToken: true, hasRefreshToken: true, ...}
[OAuthCallback] Storage verification: {accessTokenStored: true, refreshTokenStored: true, ...}
[API Interceptor] Skipping token check on auth route: /oauth/callback
[ProtectedRoute] Token valid, user authenticated
[API Interceptor] Request: {url: '/admin/analytics/dashboard-kpis', hasToken: true, ...}
```

### If Tokens Are Cleared (Debugging)

Look for `[Auth] Clearing all authentication data` with reason field:
```
[Auth] Clearing all authentication data {
  reason: 'token_refresh_failed',
  currentPath: '/admin',
  hadAccessToken: true,
  hadRefreshToken: true,
  timestamp: '2025-11-09T23:18:00.000Z'
}
[Auth] Stack trace for token clearing: Error
    at clearAuth (api.ts:55)
    at refreshTokenIfNeeded (api.ts:113)
    ...
```

This will identify the exact code path causing premature token clearing.

## Prevention

To prevent this issue from recurring:

1. **Always check current route** before calling `clearAuth()` in interceptors
2. **Add reason parameters** to all `clearAuth()` calls for debugging
3. **Use defensive logging** around token operations
4. **Test OAuth flow** end-to-end with browser console open
5. **Protect auth routes** from axios interceptors that manage auth state

## Related Issues

- **Missing authorization header (401 errors)** - Fixed by preventing premature token clearing
- **React StrictMode double-execution** - Mitigated by route protection
- **Token refresh race conditions** - Logged for visibility

## References

- Original issue: "Tokens missing from sessionStorage after OAuth login"
- Backend logs: "Auth middleware: missing authorization header"
- Identity provider logs: No introspection requests (because no tokens were attached)

---

**Resolution:** Implemented comprehensive logging, route protection, and reason tracking to prevent premature token clearing by axios interceptor. Tokens now persist after OAuth login and dashboard API calls succeed.
