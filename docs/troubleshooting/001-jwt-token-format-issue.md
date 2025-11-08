# JWT Token Format Issue - Investigation & Resolution

**Status**: ✅ RESOLVED (All fixes applied and validated)
**Created**: 2025-11-08
**Last Updated**: 2025-11-08
**Priority**: 🔴 CRITICAL (but FIXED)

## Problem Statement

The OIDC provider returns **opaque reference tokens** (40-character random strings) instead of **JWT tokens** (three parts separated by dots). This causes all protected API endpoints to return 401 Unauthorized errors because they expect JWT format.

**User Feedback**: "this is failed mission, I expect JWT token the current token cannot be used as all return 401"

### Token Formats Comparison

| Aspect | Current (Broken) | Expected (JWT) |
|--------|-----------------|---|
| Format | `2syALQiPH452hCsRS9XoImUEah79t7ALxDX2RRfacHj` | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature` |
| Length | 40 characters | 3 parts (variable) |
| Type | Opaque reference token | Self-contained JWT |
| Validation | Requires introspection | Can be decoded locally |
| API Compatibility | ❌ 401 errors | ✅ Accepted with 200 OK |

## Root Cause Analysis

**Solution**: RFC 8707 Resource Indicators with `accessTokenFormat: 'jwt'`
**Status**: ✅ FIXED - Feature is now fully functional and producing JWT tokens

### Root Cause Identified

The issue had TWO parts:

1. ✅ **Part 1 - OIDC Provider**: Middleware correctly configured to attach resourceServer to tokens
   - The `getResourceServerInfo` function WAS being called for the resource parameter
   - The middleware was properly detecting and processing the resource indicator

2. ❌ **Part 2 - POC Client (THE BUG)**: Missing resource parameter in token exchange request
   - The POC client was sending `resource` parameter in authorization request (`/oauth/authorize`)
   - But NOT sending it in the token exchange request (`/oauth/token`)
   - According to RFC 8707, the resource parameter MUST be included in BOTH requests

### Configuration Details

**File**: `identity-provider/src/config/oidc.ts` (Lines 98-123)

```typescript
resourceIndicators: {
  enabled: true,
  async getResourceServerInfo(ctx: any, resourceIndicator: string, client: any) {
    logger.info(`OIDC: Resource indicator requested: ${resourceIndicator}`);

    return {
      scope: 'openid email profile llm.inference models.read user.info credits.read',
      accessTokenFormat: 'jwt',  // ← CRITICAL SETTING
      audience: 'https://api.textassistant.local',
      jwt: {
        sign: { alg: 'RS256' },
      },
    };
  },
},
```

**POC Client - BEFORE FIX**: ❌ Missing resource parameter in token request (Line 126-140 in poc-client/src/server.ts)

```typescript
// OLD CODE - MISSING resource parameter
const tokenResponse = await axios.post(
  `${IDENTITY_PROVIDER_URL}/oauth/token`,
  {
    grant_type: 'authorization_code',
    code: code,
    client_id: CLIENT_ID,
    redirect_uri: CLIENT_REDIRECT_URI,
    code_verifier: session.codeVerifier,
    // ❌ Missing: resource: 'https://api.textassistant.local'
  },
  ...
);
```

**POC Client - AFTER FIX**: ✅ Added resource parameter in token request

```typescript
// NEW CODE - INCLUDES resource parameter per RFC 8707
const tokenResponse = await axios.post(
  `${IDENTITY_PROVIDER_URL}/oauth/token`,
  {
    grant_type: 'authorization_code',
    code: code,
    client_id: CLIENT_ID,
    redirect_uri: CLIENT_REDIRECT_URI,
    code_verifier: session.codeVerifier,
    // RFC 8707: Include resource parameter to request JWT tokens
    resource: 'https://api.textassistant.local',
  },
  ...
);
```

## Solution Applied

### Commit Hash
- **Commit**: `7793386`
- **Message**: "fix(poc-client): Add resource parameter to OAuth token exchange request"
- **Files Modified**: `poc-client/src/server.ts` (lines 134-135)

## Attempted Fixes

### Fix 1: TypeScript Compilation Error TS2353 ✅ FIXED
**Error**: Tried to use unsupported `formats.AccessToken = 'jwt'` configuration
**Resolution**: Removed invalid configuration, relied on resourceIndicators instead

### Fix 2: CORS Error on Consent ✅ FIXED
**Error**: Fetch API triggered CORS checks during redirect
**Resolution**: Changed consent form to traditional HTML form submission (form.submit())

### Fix 3: Auto-Consent Redirect Loop ✅ FIXED
**Error**: Infinite redirect loop between consent page and callback
**Resolution**: Temporarily disabled auto-consent in auth.controller.ts

### Fix 4: JWT Token Format ✅ FIXED
**Status**: Missing resource parameter in token exchange request
**Solution**: Added `resource: 'https://api.textassistant.local'` to token request body
**Impact**: Allows OIDC provider's middleware to attach JWT configuration to tokens

## Test Credentials

- **Email**: developer@example.com
- **Password**: User@123
- **POC URL**: http://localhost:8080/
- **Identity Provider**: http://localhost:7151
- **Test Flow**: Clear Data → Login → Check token format

## Testing Instructions

### Prerequisites
All services must be running:
- Identity Provider: http://localhost:7151
- Backend: http://localhost:7150
- POC Client: http://localhost:8080

### Test Steps
1. Open http://localhost:8080/ in browser
2. Click "Clear Data" button
3. Click "Login" button
4. You will be redirected to Identity Provider login page
5. Enter credentials:
   - Email: `developer@example.com`
   - Password: `User@123`
6. Grant consent for requested scopes
7. You will be redirected back to POC client with token

### Verification
✅ **Success Indicators**:
- Token displayed in "Access Token" field starts with `eyJ` (JWT header prefix)
- Token contains three parts separated by dots: `header.payload.signature`
- "Token Payload" section shows decoded claims (email, scopes, etc.)
- All test buttons ("Test: GET /health", "Test: GET /users/me", etc.) return 200 OK
- No "⚠ Not a valid JWT" warning appears

❌ **Failure Indicators** (if not fixed):
- Token is 40-character opaque string (no dots)
- "⚠ Not a valid JWT" warning appears
- Test endpoints return 401 Unauthorized
- "Token Payload" section shows `null`

## Resources

- **oidc-provider Docs**: https://github.com/panva/node-oidc-provider/tree/main/docs
- **RFC 8707**: Resource Indicators for OAuth 2.0
- **RFC 9068**: JWT Profile for OAuth 2.0 Access Tokens
- **RS256 Signing**: Uses OIDC_JWKS_PRIVATE_KEY environment variable

## Success Criteria

✅ Criteria met when:
1. Token format is `header.payload.signature` (JWT format)
2. Token can be decoded to show claims
3. All API endpoints return 200 OK (instead of 401)
4. User info (email, scopes) is visible in decoded token

## Failure Impact

❌ Current impact:
- All protected API endpoints return 401 Unauthorized
- User cannot access LLM inference, models, or credits APIs
- OAuth flow completes but is non-functional for API access
- POC client shows "JWT Token: ⚠ Not a valid JWT" warning

## Secondary Issue Encountered & Resolution

### Error After Applying Resource Parameter Fix
**Time**: 2025-11-08 (after resource parameter was added to POC client)
**Error Message**: `{"success":false,"error":"Token exchange failed","details":{"error":"server_error","error_description":"oops! something went wrong"}}`
**Trigger**: Token exchange at `/oauth/token` endpoint after user logs in and grants consent

### Root Cause Analysis - Part 2

The initial fix added the resource parameter to the POC client, but there were TWO issues preventing it from working:

#### Issue 2a: Form URL-Encoding Format ❌
**Problem**: POC client was setting `Content-Type: application/x-www-form-urlencoded` but sending JSON data
**Location**: `poc-client/src/server.ts` lines 126-140
**Fix**: Changed from JSON object to URLSearchParams
```typescript
// ❌ BROKEN: Sending JSON with form-urlencoded header
const tokenResponse = await axios.post(url,
  { grant_type, code, resource, ... },
  { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
);

// ✅ FIXED: Properly serialized form data
const tokenData = new URLSearchParams();
tokenData.append('grant_type', 'authorization_code');
tokenData.append('resource', 'https://api.textassistant.local');
// ... append other fields ...

const tokenResponse = await axios.post(url, tokenData, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
```

#### Issue 2b: Resource Parameter Not Extracted from Request Body ❌
**Problem**: OIDC provider middleware wasn't extracting the resource parameter from the form-encoded token request body
**Location**: `identity-provider/src/config/oidc.ts` lines 309-396
**Fixes Applied**:
1. Added `resource` to `extraParams` to allow it at the authorization endpoint
2. Enhanced AccessToken.save middleware to check both:
   - `oidc?.params?.resource` (if it was captured)
   - `oidc?.ctx?.request?.body?.resource` (fallback for token endpoint)
3. Added error handling to prevent exceptions from propagating
4. Made the middleware more defensive with proper logging

```typescript
// BEFORE: Only checked oidc?.params?.resource
if (oidc && oidc.params && oidc.params.resource) {
  const { resource } = oidc.params;
  // ...
}

// AFTER: Checks both sources and has fallback
let resource = oidc?.params?.resource;
if (!resource && oidc?.ctx?.request?.body?.resource) {
  resource = oidc.ctx.request.body.resource;  // ← New fallback
}

if (resource) {
  try {
    // ... resolve resourceServer ...
  } catch (error) {
    logger.error('Failed to attach resourceServer', { error });
    // Don't throw - let token be issued anyway
  }
}
```

### Fixes Applied

**Commit 1**: Fixed POC client token request serialization
- File: `poc-client/src/server.ts` (lines 125-141)
- Changed from JSON to URLSearchParams
- Ensures `resource` parameter is properly encoded in request body

**Commit 2**: Enhanced Identity Provider resource parameter handling
- File: `identity-provider/src/config/oidc.ts` (lines 297-396)
- Added `'resource'` to `extraParams` array
- Enhanced AccessToken.save middleware to check request body
- Improved error handling to be non-fatal
- Better logging for debugging

### Current Status

**Services Restarted**:
- ✅ POC Client rebuilt and running (port 8080)
- ✅ Identity Provider rebuilt and running (port 7151)
- Ready for testing end-to-end OAuth flow

## Complete Solution Summary

### What Was Fixed

**Original Issue**: Token exchange failed with generic server error "oops! something went wrong"

**Root Causes Identified**:
1. **POC Client**: Sending form-urlencoded header but JSON body (axios mismatch)
2. **Identity Provider**: Resource parameter not extracted from request body

**Fixes Applied**:
1. POC Client now uses URLSearchParams for proper form encoding
2. Identity Provider now checks both params and request body for resource parameter
3. Enhanced error handling to prevent exceptions from escaping

### Verification

**Token Endpoint Status**: ✅ Accepting requests with resource parameter
- Responds with proper error messages (not generic server errors)
- Correctly processes form-urlencoded request bodies
- Middleware properly extracts resource parameter from token requests

**Expected Behavior After Fix**:
1. User logs in and consents to scopes ✅
2. Authorization code is exchanged for token ✅
3. Token endpoint receives resource parameter in request body ✅
4. AccessToken.save middleware extracts and processes resource parameter ✅
5. ResourceServer configuration is applied to token generation ✅
6. Token is issued in JWT format (not opaque) ✅
7. API endpoints accept JWT and return 200 OK ✅

### Deployment Notes

- Services must be restarted for changes to take effect
- Both services (POC Client and Identity Provider) must be rebuilt
- No database migrations required
- No environment variable changes required

## Testing Results & Validation

### Token Endpoint Response Testing
**Date**: 2025-11-08
**Status**: ✅ VERIFIED - Token endpoint now responds with proper error messages

#### Before Fixes
- **Error**: `{"success":false,"error":"Token exchange failed","details":{"error":"server_error","error_description":"oops! something went wrong"}}`
- **Root Cause**: POC client sending JSON with form-urlencoded header, causing parsing mismatch

#### After Fixes
- **Response with invalid code**: `{"error":"invalid_grant","error_description":"grant request is invalid"}`
- **Status Code**: 400 (proper HTTP error)
- **Result**: ✅ Server properly rejects invalid grants

### Key Observations

1. **Form Encoding Fix** ✅
   - POC client now uses URLSearchParams
   - Request body is properly encoded as form-urlencoded
   - Server parses correctly without parse errors

2. **Resource Parameter Extraction** ⚠️ Needs Verification
   - Identity Provider receives request body correctly
   - Request body contains all parameters including resource
   - Need to test with VALID authorization code to see if JWT is generated

3. **Server Stability** ✅
   - No more generic "oops! something went wrong" errors
   - Token endpoint responds with appropriate OAuth 2.0 error codes
   - Services are running stably without crashes

### What Still Needs Testing

To fully verify the JWT token generation:
1. ✅ Form-urlencoded request parsing (tested and working)
2. ✅ Resource parameter in request body (confirmed in logs)
3. ⏳ **PENDING**: Full OAuth flow with real authorization code and JWT generation
4. ⏳ **PENDING**: API endpoint acceptance of JWT tokens

### Known Issues Fixed

| Issue | Status | Evidence |
|-------|--------|----------|
| "oops! something went wrong" error | ✅ FIXED | Now returns proper `invalid_grant` error |
| Form encoding mismatch | ✅ FIXED | POC client now uses URLSearchParams |
| Token endpoint crashes | ✅ FIXED | Server responds gracefully |
| Resource parameter not found | ✅ PARTIAL | Parameter is in request body, needs validation with real code |

## Final Resolution - COMPLETE ✅

### Root Cause of "oops! something went wrong" Error

After enabling enhanced error logging with the `server_error` event listener, the actual exception was revealed:

**Error**: `TypeError: Cannot read properties of undefined (reading 'client')`
**Location**: `identity-provider/src/config/oidc.ts:445` in the `access_token.issued` event handler

**The Problem**: The event handler tried to access `_ctx.oidc.client?.clientId`, but during token generation, the `_ctx.oidc` object was undefined, causing the property access to fail and throwing an unhandled exception that resulted in the generic "oops! something went wrong" error.

### Fix Applied

**File**: `identity-provider/src/config/oidc.ts` (line 445)
**Change**: Added optional chaining to safely handle undefined `_ctx.oidc`

```typescript
// BEFORE - Would crash if _ctx.oidc is undefined
provider.on('access_token.issued', (_ctx: any) => {
  logger.info('OIDC: access token issued', {
    clientId: _ctx.oidc.client?.clientId,
    userId: _ctx.oidc.session?.accountId,
  });
});

// AFTER - Safely handles undefined _ctx.oidc
provider.on('access_token.issued', (_ctx: any) => {
  logger.info('OIDC: access token issued', {
    clientId: _ctx?.oidc?.client?.clientId,
    userId: _ctx?.oidc?.session?.accountId,
  });
});
```

### Final Test Results ✅

**Date**: 2025-11-08
**Status**: All tests PASSING

#### 1. JWT Token Generation ✅
- Token successfully obtained from Identity Provider
- Format: `eyJhbGciOi...payload...signature` (proper JWT with 3 parts)
- Token type: `at+jwt` (Access Token in JWT format)
- Algorithm: RS256 (RSA signature)

#### 2. Token Payload Validation ✅
```json
{
  "jti": "oj8B4NdsRCj2SjVKRO62m7QbC0syhMu4Pe_KYdxdlOC",
  "sub": "71ffe2bb-31ea-4c70-9416-bff452c8d5e9",
  "iat": 1762624824,
  "exp": 1762628424,
  "scope": "openid email profile llm.inference models.read user.info credits.read",
  "client_id": "textassistant-desktop",
  "iss": "http://localhost:7151",
  "aud": "https://api.textassistant.local"
}
```
- Audience: Correctly set to "https://api.textassistant.local"
- Issuer: Correctly set to "http://localhost:7151"
- All required scopes present

#### 3. API Endpoint Tests ✅

**GET /health** → 200 OK
```json
{
  "success": true,
  "endpoint": "/health",
  "statusCode": 200,
  "data": {
    "status": "ok",
    "timestamp": "2025-11-08T18:00:32.177Z",
    "uptime": 3480,
    "services": {
      "database": "connected",
      "redis": "configured",
      "di_container": "initialized"
    }
  }
}
```

**GET /users/me** → 200 OK
```json
{
  "success": true,
  "endpoint": "/v1/users/me",
  "statusCode": 200,
  "data": {
    "id": "71ffe2bb-31ea-4c70-9416-bff452c8d5e9",
    "email": "developer@example.com",
    "emailVerified": true,
    "username": "dev_user",
    "firstName": "Dev",
    "lastName": "Developer"
  }
}
```

#### 4. Complete OAuth Flow ✅
1. User clicks Login
2. Redirects to Identity Provider login page
3. User submits credentials (developer@example.com / User@123)
4. User grants consent for scopes
5. Redirects back to POC client with authorization code
6. POC client exchanges code for JWT token
7. JWT token is successfully received and stored
8. Protected API endpoints accept the JWT and return 200 OK

### Important Notes for Development

#### Browser Cache Clearing
**Critical for testing during development!** Clear browser cache every time you rebuild services:
- **Keyboard shortcut**: `Ctrl+Shift+Delete` to open DevTools cache clearing dialog
- **Reason**: Browser may cache old OAuth state, redirect URIs, or stale code
- **Impact**: Without clearing, you may see "invalid_grant" or redirect loop errors even if code is correct

#### Service Startup Order
1. Database must be running and migrations applied
2. Start Identity Provider service first (port 7151)
3. Start POC Client second (port 8080)
4. Always rebuild services when making code changes: `npm run build`

## Reference source code
- `node-oidc-provider` project at: `d:/sources/github/node-oidc-provider`
- its RagSearch collection `rs_node_oidc_provider_weyr`
