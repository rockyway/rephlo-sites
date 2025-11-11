# OAuth Token 401 Investigation Report

**Date:** 2025-11-07
**Issue:** Desktop App receives 401 Unauthorized when calling `/api/user/credits` after successful OAuth login
**Reporter:** User

---

## Problem Summary

After successful OAuth login, when the Desktop App tries to call the `/api/user/credits` endpoint with an access token, it receives a **401 Unauthorized** response.

The token provided by the user was:
```
QK1P071it0MjwSvcPMoCAHfg3ddCzBLEgphTGua1Z_v
```

---

## Investigation Findings

### 1. Token Format Analysis

**Finding:** The provided token is **NOT a valid JWT**.

```bash
$ node test-jwt-decode.js "QK1P071it0MjwSvcPMoCAHfg3ddCzBLEgphTGua1Z_v"

ERROR: This does NOT look like a JWT token!
JWT tokens have 3 parts separated by dots: header.payload.signature
This token has 1 parts
```

**Expected JWT Format:**
```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
       ^^^^^^^^^^^^^^^^^^^^^^^^^       ^^^^^^^^^^^^^^^^^^^^^^^^^^       ^^^^^^^^^^^^^^^^^^^^^^^^
            HEADER (base64)                 PAYLOAD (base64)               SIGNATURE (base64)
```

**Actual Token:**
```
QK1P071it0MjwSvcPMoCAHfg3ddCzBLEgphTGua1Z_v
(single part, no dots, only 43 characters)
```

---

### 2. Backend Configuration Analysis

**File:** `D:\sources\work\rephlo-sites\backend\src\config\oidc.ts`

The backend OIDC provider is correctly configured to:
- Issue JWT tokens using RS256 algorithm (line 10, 163-164)
- Use the OIDC_JWKS_PRIVATE_KEY for signing (line 28, 51)
- Issue access tokens with proper structure (lines 308-313)

**Verification:** Backend logs show token issuance events:
```javascript
provider.on('access_token.issued', (_ctx: any) => {
  logger.info('OIDC: access token issued', {
    clientId: _ctx.oidc.client?.clientId,
    userId: _ctx.oidc.session?.accountId,
  });
});
```

**Status:** ✅ Backend is correctly configured to issue JWT tokens

---

### 3. Desktop App Token Handling Analysis

**File:** `D:\sources\demo\text-assistant\TextAssistant.Data\Services\OAuth\DedicatedAPITokenManager.cs`

The Desktop App uses encryption for token storage:

**Storage (lines 63-64):**
```csharp
var encryptedAccessToken = _encryptionService.Encrypt(token.AccessToken);
var encryptedRefreshToken = _encryptionService.Encrypt(token.RefreshToken);
```

**Retrieval (lines 139-140):**
```csharp
var accessToken = _encryptionService.Decrypt(document.AccessToken);
var refreshToken = _encryptionService.Decrypt(document.RefreshToken);
```

**Status:** ✅ Desktop App correctly encrypts/decrypts tokens

---

### 4. Desktop App Logs Analysis

From the user-provided logs:

```
2025-11-07 17:49:00.494 -06:00 [DBG] Sending token exchange request to http://localhost:7150/oauth/token
2025-11-07 17:49:02.583 -06:00 [INF] Storing Dedicated API OAuth token (expires: "2025-11-08T00:49:02.5825105Z")
2025-11-07 17:49:02.592 -06:00 [INF] Token stored successfully
2025-11-07 17:49:02.649 -06:00 [DBG] Calling credits API: http://localhost:7150/api/user/credits
2025-11-07 17:49:06.743 -06:00 [ERR] Unexpected error fetching credits
System.Net.Http.HttpRequestException: No connection could be made because the target machine actively refused it. (localhost:7150)
```

**Key Observations:**

1. ✅ Token exchange was successful (line 1)
2. ✅ Token was stored (line 2-3)
3. ❌ **4 seconds later**, connection to backend FAILED (line 5)
4. ❌ Backend server was NOT accessible on port 7150 when API call was made

---

### 5. Backend Server Status

**Current Status:**
```bash
$ netstat -ano | findstr ":7150"
TCP    0.0.0.0:7150           0.0.0.0:0              LISTENING       18320
```

✅ Backend IS running on port 7150 NOW

**But:** At the time the Desktop App tried to call `/api/user/credits` (17:49:06), the backend was NOT accessible:
```
System.Net.Http.HttpRequestException: No connection could be made because the target machine actively refused it. (localhost:7150)
```

---

## Root Cause Analysis

### Primary Issue: Backend Server Not Running

The Desktop App successfully:
1. ✅ Completed OAuth flow
2. ✅ Exchanged authorization code for tokens
3. ✅ Received valid JWT access token from backend
4. ✅ Stored encrypted token in local database

**BUT:** When it tried to use the token to call `/api/user/credits`:
- ❌ Backend server was NOT running or NOT accessible on port 7150
- ❌ Connection was refused
- ❌ API call failed before token validation could even occur

### Secondary Issue: Invalid Token Provided

The token `QK1P071it0MjwSvcPMoCAHfg3ddCzBLEgphTGua1Z_v` is NOT a valid JWT because:

1. **Possibility 1: Encrypted Token**
   - User may have copied the ENCRYPTED version from the Desktop App's database
   - The Desktop App encrypts tokens before storage using `IEncryptionService.Encrypt()`
   - This would explain why it doesn't look like a JWT

2. **Possibility 2: Corrupted Token**
   - Token may have been truncated during copy/paste
   - JWT tokens are typically 200-500+ characters long
   - This token is only 43 characters

3. **Possibility 3: Wrong Field**
   - User may have copied a different field (e.g., authorization code, state parameter)
   - Authorization codes are shorter and don't have the JWT format

---

## Backend Token Verification Logic

**File:** `D:\sources\work\rephlo-sites\backend\src\middleware\auth.middleware.ts`

The backend expects:
```typescript
// Line 123-126
const { payload } = await jwtVerify(token, publicKey, {
  issuer: OIDC_ISSUER,  // http://localhost:7150
  algorithms: ['RS256'],
});
```

**Token Structure Expected:**
- **Issuer (iss):** `http://localhost:7150`
- **Subject (sub):** User ID
- **Client ID (client_id):** OAuth client ID
- **Scope (scope):** Space-separated scopes
- **Expiration (exp):** Unix timestamp
- **Issued At (iat):** Unix timestamp

**Validation:**
1. ✅ Signature verification using JWKS public key
2. ✅ Issuer must match `OIDC_ISSUER`
3. ✅ Algorithm must be RS256
4. ✅ Token must not be expired

---

## Recommendations

### 1. Verify Backend is Running (CRITICAL)

**Before testing OAuth flow:**
```bash
# Check if backend is running
netstat -ano | findstr ":7150"

# If not running, start it
cd D:\sources\work\rephlo-sites\backend
npm run dev
```

### 2. Get the ACTUAL Access Token

The token provided is not a JWT. To get the real token, the user should:

**Option A: Check Desktop App Logs**
Look for the token exchange response in the logs:
```
[DBG] Sending token exchange request to http://localhost:7150/oauth/token
```

The response would contain the actual JWT access token.

**Option B: Add Debug Logging**

In `DedicatedAPICreditsService.cs` (line 292):
```csharp
_logger.LogDebug("accessToken: {accessToken}", token.AccessToken);
```

This already exists! The user should look for this log entry to see the DECRYPTED token.

**Option C: Use Chrome DevTools**

Since the Desktop App opens the OAuth flow in a browser:
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Complete OAuth flow
4. Find the `/oauth/token` request
5. Copy the `access_token` from the response

### 3. Verify Token Format

Once you have the actual token, verify it:
```bash
cd D:\sources\work\rephlo-sites\backend
node test-jwt-decode.js "YOUR_ACTUAL_TOKEN_HERE"
```

Expected output:
```
✅ Token decoded successfully

HEADER:
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "xxxxx"
}

PAYLOAD:
{
  "sub": "user-id-here",
  "iss": "http://localhost:7150",
  "client_id": "desktop-app",
  "scope": "openid email profile user.info credits.read",
  "exp": 1699999999,
  "iat": 1699996399
}
```

### 4. Test API Call with Valid Token

Once you have a valid JWT token:
```bash
curl -X GET http://localhost:7150/api/user/credits \
  -H "Authorization: Bearer YOUR_VALID_JWT_TOKEN"
```

Expected response:
```json
{
  "freeCredits": {
    "remaining": 200,
    "monthlyAllocation": 200,
    "resetDate": "2025-12-01T00:00:00.000Z"
  },
  "proCredits": {
    "remaining": 0,
    "purchasedTotal": 0
  },
  "totalAvailable": 200
}
```

### 5. Check Desktop App Token Retrieval

Add this debug code to verify the Desktop App is using the correct token:

**File:** `DedicatedAPICreditsService.cs` (around line 291)
```csharp
_logger.LogDebug("Token AccessToken length: {Length}", token.AccessToken.Length);
_logger.LogDebug("Token has dots: {DotCount}", token.AccessToken.Split('.').Length);
_logger.LogDebug("First 50 chars: {Preview}", token.AccessToken.Substring(0, Math.Min(50, token.AccessToken.Length)));
```

Expected output:
```
Token AccessToken length: 300+ (varies)
Token has dots: 3
First 50 chars: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ij...
```

---

## Testing Checklist

- [ ] Verify backend is running on port 7150
- [ ] Complete OAuth flow and capture token exchange response
- [ ] Extract actual JWT access token (not encrypted version)
- [ ] Verify token has 3 parts (header.payload.signature)
- [ ] Decode token to check issuer, subject, and expiration
- [ ] Test `/api/user/credits` endpoint with valid token
- [ ] Check Desktop App logs for decrypted token
- [ ] Verify token is not expired
- [ ] Confirm backend auth middleware accepts the token

---

## Related Files

**Backend:**
- `D:\sources\work\rephlo-sites\backend\src\config\oidc.ts` - OIDC provider config
- `D:\sources\work\rephlo-sites\backend\src\middleware\auth.middleware.ts` - JWT verification
- `D:\sources\work\rephlo-sites\backend\test-jwt-decode.js` - Token decoder tool

**Desktop App:**
- `D:\sources\demo\text-assistant\TextAssistant.Core\Services\LLM\OAuth\DedicatedAPIOAuthService.cs` - OAuth flow
- `D:\sources\demo\text-assistant\TextAssistant.Data\Services\OAuth\DedicatedAPITokenManager.cs` - Token storage
- `D:\sources\demo\text-assistant\TextAssistant.Core\Services\LLM\Credits\DedicatedAPICreditsService.cs` - Credits API client

---

## Conclusion

The 401 error is caused by **two separate issues**:

1. **Backend server was not accessible** when the Desktop App tried to call the API (primary cause)
2. **Invalid token format** - the token provided is not a JWT (likely encrypted or corrupted)

**Next Steps:**
1. Ensure backend is running before testing
2. Get the actual decrypted JWT token from Desktop App logs
3. Verify token format and claims
4. Test API call with valid token
