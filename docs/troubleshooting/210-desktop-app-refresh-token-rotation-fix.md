# Desktop App Refresh Token Rotation Bug Fix

**Document ID:** 210
**Created:** 2025-11-25
**Priority:** High
**Affects:** TextAssistant Desktop Client (.NET 8)
**File:** `TextAssistant.Data\Services\OAuth\DedicatedAPITokenManager.cs`

---

## Problem Summary

The Desktop App is experiencing `invalid_grant` errors when refreshing OAuth tokens. The Identity Provider uses **refresh token rotation** (OAuth 2.0 security best practice), but the Desktop App is sometimes reusing old (consumed) refresh tokens instead of the newly issued ones.

### Error Observed

```
OIDC: grant error
{
  "errorName": "InvalidGrant",
  "errorMessage": "invalid_grant",
  "errorDetails": "grant request is invalid",
  "clientId": "desktop-app-test",
  "grantType": "refresh_token"
}
```

### Timeline Evidence

```
12:46:58 - RefreshToken FOUND (first refresh succeeds)
12:46:58 - RefreshToken CONSUMED (rotated) - old token invalidated
12:46:58 - NEW RefreshToken SAVED
12:47:28 - RefreshToken NOT FOUND (same OLD token being used again!)
```

---

## Root Cause: Refresh Token Rotation

### How OAuth 2.0 Refresh Token Rotation Works

When the Identity Provider receives a refresh token request:

1. **Validates** the old refresh token
2. **Consumes/invalidates** the old refresh token (one-time use)
3. **Issues NEW tokens**: `access_token` + **NEW `refresh_token`**
4. The old refresh token can **NEVER be used again**

This is a security feature to prevent replay attacks.

### What's Happening in the Desktop App

The current code at line 400:
```csharp
RefreshToken = tokenResponse.RefreshToken ?? currentToken.RefreshToken,
```

This logic is correct! However, the issue is a **race condition**:

1. **Thread A** calls `RefreshTokenIfNeededAsync()` → Gets cached token with OLD refresh token
2. **Thread B** also calls `RefreshTokenIfNeededAsync()` → Gets same cached token with OLD refresh token
3. **Thread A** succeeds, receives NEW refresh token, stores it
4. **Thread B** sends request with OLD refresh token → **FAILS** (token already consumed)

---

## Diagnosis Steps

### Step 1: Verify the Issue

Add this logging to `RefreshTokenInternalAsync` after line 406:

```csharp
// === CRITICAL: Log refresh token change ===
bool refreshTokenChanged = tokenResponse.RefreshToken != null &&
                           tokenResponse.RefreshToken != currentToken.RefreshToken;
_logger.LogWarning("⚠️ REFRESH TOKEN ROTATION CHECK:");
_logger.LogWarning("  - Server returned new refresh_token: {HasNew}", !string.IsNullOrEmpty(tokenResponse.RefreshToken));
_logger.LogWarning("  - Refresh token changed: {Changed}", refreshTokenChanged);
if (refreshTokenChanged)
{
    var oldMasked = currentToken.RefreshToken.Length > 20
        ? $"{currentToken.RefreshToken.Substring(0, 10)}...{currentToken.RefreshToken.Substring(currentToken.RefreshToken.Length - 10)}"
        : "(short)";
    var newMasked = tokenResponse.RefreshToken!.Length > 20
        ? $"{tokenResponse.RefreshToken.Substring(0, 10)}...{tokenResponse.RefreshToken.Substring(tokenResponse.RefreshToken.Length - 10)}"
        : "(short)";
    _logger.LogWarning("  - OLD token: {Old}", oldMasked);
    _logger.LogWarning("  - NEW token: {New}", newMasked);
}
```

### Step 2: Confirm Server Returns New Refresh Token

Check the token response logs. You should see:
```
Parsed token response:
  - refresh_token provided: True   ← Must be TRUE
```

If `refresh_token provided: False`, the Identity Provider is not returning a new refresh token (this would be a server-side configuration issue).

---

## Fix Options

### Option 1: Add Refresh Lock (Recommended)

Add a dedicated refresh lock to prevent concurrent refresh attempts:

```csharp
// Add new field at class level (around line 30)
private readonly SemaphoreSlim _refreshLock = new(1, 1);
private bool _isRefreshing = false;

// Modify RefreshTokenIfNeededAsync method
public async Task<bool> RefreshTokenIfNeededAsync(bool forceRefresh = false)
{
    // Quick check without lock
    var token = await GetTokenAsync();
    if (token == null)
    {
        _logger.LogDebug("No token to refresh");
        return false;
    }

    if (!forceRefresh && !token.IsExpired && !token.IsExpiringSoon)
    {
        _logger.LogDebug("Token is still valid, no refresh needed");
        return true;
    }

    // Acquire refresh lock to prevent concurrent refreshes
    if (!await _refreshLock.WaitAsync(TimeSpan.FromSeconds(30)))
    {
        _logger.LogWarning("Refresh lock timeout - another refresh is in progress");
        // Wait for the other refresh to complete, then return current token state
        await Task.Delay(1000);
        var refreshedToken = await GetTokenAsync();
        return refreshedToken != null && !refreshedToken.IsExpired;
    }

    try
    {
        // Double-check after acquiring lock - another thread may have already refreshed
        token = await GetTokenAsync();
        if (token == null)
        {
            return false;
        }

        // Re-check if refresh is still needed (another thread may have just refreshed)
        if (!forceRefresh && !token.IsExpired && !token.IsExpiringSoon)
        {
            _logger.LogDebug("Token was refreshed by another thread, no refresh needed");
            return true;
        }

        if (forceRefresh)
        {
            _logger.LogInformation("Forcing token refresh (server rejected current token with 401)");
        }
        else
        {
            _logger.LogInformation("Token is expiring soon or expired, attempting refresh");
        }

        return await RefreshTokenInternalAsync(token);
    }
    finally
    {
        _refreshLock.Release();
    }
}
```

### Option 2: Invalidate Cache Before Refresh

Force a fresh token read before refreshing to avoid stale cache:

```csharp
// In RefreshTokenInternalAsync, before sending the request (around line 274)
// Force cache invalidation to get latest token
_cachedToken = null;
_cacheExpiry = DateTime.MinValue;
var freshToken = await GetTokenAsync();
if (freshToken == null || freshToken.RefreshToken != currentToken.RefreshToken)
{
    _logger.LogInformation("Token was already refreshed by another process, aborting this refresh");
    return freshToken != null && !freshToken.IsExpired;
}
```

### Option 3: Reduce Cache Duration for Refresh Operations

Shorten cache duration when a refresh is in progress:

```csharp
// In StoreTokenAsync, after storing (around line 81)
// After successful refresh, use shorter cache to ensure fresh reads
_cacheExpiry = DateTime.UtcNow.AddSeconds(10); // Short cache after refresh
```

---

## Recommended Implementation

**Use Option 1 (Refresh Lock)** as the primary fix. This is the most robust solution that prevents race conditions at the source.

### Complete Code Change

Replace the current `RefreshTokenIfNeededAsync` method (lines 202-230) with:

```csharp
// Add field at class level
private readonly SemaphoreSlim _refreshLock = new(1, 1);

/// <inheritdoc/>
public async Task<bool> RefreshTokenIfNeededAsync(bool forceRefresh = false)
{
    var token = await GetTokenAsync();
    if (token == null)
    {
        _logger.LogDebug("No token to refresh");
        return false;
    }

    // Check if token needs refresh
    if (!forceRefresh && !token.IsExpired && !token.IsExpiringSoon)
    {
        _logger.LogDebug("Token is still valid, no refresh needed");
        return true;
    }

    // Try to acquire refresh lock (non-blocking check first)
    if (!await _refreshLock.WaitAsync(TimeSpan.Zero))
    {
        _logger.LogInformation("Another refresh is already in progress, waiting...");

        // Wait for the other refresh to complete (with timeout)
        if (!await _refreshLock.WaitAsync(TimeSpan.FromSeconds(30)))
        {
            _logger.LogWarning("Timeout waiting for refresh lock");
            return false;
        }

        try
        {
            // Another thread completed refresh, check if our token is now valid
            var refreshedToken = await GetTokenAsync();
            if (refreshedToken != null && !refreshedToken.IsExpired)
            {
                _logger.LogInformation("Token was refreshed by another thread");
                return true;
            }
            // If still invalid, fall through to refresh
            token = refreshedToken ?? token;
        }
        finally
        {
            _refreshLock.Release();
        }

        // Re-acquire lock for our refresh attempt
        await _refreshLock.WaitAsync();
    }

    try
    {
        // Double-check token state after acquiring lock
        token = await GetTokenAsync();
        if (token == null)
        {
            _logger.LogDebug("Token was deleted while waiting for lock");
            return false;
        }

        if (!forceRefresh && !token.IsExpired && !token.IsExpiringSoon)
        {
            _logger.LogDebug("Token was refreshed by another thread while waiting");
            return true;
        }

        if (forceRefresh)
        {
            _logger.LogInformation("Forcing token refresh (server rejected current token with 401)");
        }
        else
        {
            _logger.LogInformation("Token is expiring soon or expired, attempting refresh");
        }

        return await RefreshTokenInternalAsync(token);
    }
    finally
    {
        _refreshLock.Release();
    }
}
```

### Don't Forget to Dispose

Update the `Dispose` method to include the new lock:

```csharp
public void Dispose()
{
    StopBackgroundRefresh();
    _tokenLock.Dispose();
    _refreshLock.Dispose();  // Add this line
}
```

---

## Testing the Fix

### Test Case 1: Concurrent Refresh Attempts

1. Set a breakpoint at the start of `RefreshTokenInternalAsync`
2. Trigger two refresh calls simultaneously (e.g., from UI and background task)
3. Verify only ONE refresh request is sent to the server
4. Verify both callers receive success

### Test Case 2: Token Rotation

1. Perform a successful refresh
2. Check logs for: `refresh_token provided: True`
3. Verify the stored token has the NEW refresh token
4. Trigger another refresh
5. Verify it uses the NEW refresh token (check masked preview in logs)

### Test Case 3: Background Refresh

1. Let the background task run (every 1 minute)
2. Manually trigger a refresh while background task is active
3. Verify no `invalid_grant` errors occur

---

## Server-Side Verification

The Identity Provider logs will show:

```
✅ CORRECT BEHAVIOR:
OIDC: refresh token CONSUMED (rotated) - old token is now invalid
  { tokenPreview: "OldToken123...OldTokenEnd", hint: "Desktop App MUST use NEW refresh_token" }
OIDC: NEW refresh token saved - Desktop App should use this token for next refresh
  { tokenPreview: "NewToken456...NewTokenEnd" }

❌ BUG INDICATOR (should NOT see after fix):
OIDC Adapter: RefreshToken not found in database
  { tokenPreview: "OldToken123...OldTokenEnd" }  ← Same OLD token being reused!
```

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| `invalid_grant` on refresh | Race condition - concurrent refreshes use same old token | Add `_refreshLock` semaphore |
| Old refresh token reused | Cache returns stale token to second thread | Double-check token after acquiring lock |
| Background task conflicts | Background refresh races with manual refresh | Same lock protects both paths |

---

## Contact

For questions about the Identity Provider behavior, contact the backend team.

**Related Documentation:**
- OAuth 2.0 RFC 6749 Section 6 (Refreshing an Access Token)
- OAuth 2.0 Security Best Current Practice (draft-ietf-oauth-security-topics)
