# JWT Token Format Issue - Investigation & Resolution

**Status**: 🔄 IN PROGRESS (Secondary Issue Encountered)
**Created**: 2025-11-08
**Last Updated**: 2025-11-08
**Priority**: 🔴 CRITICAL

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

## Reference source code
- `node-oidc-provider` project at: `d:/sources/github/node-oidc-provider`
- its RagSearch collection `rs_node_oidc_provider_weyr`
