# Auto-Consent Interception Fix

**Date**: November 7, 2025
**Issue**: Consent screen was still showing for Desktop App despite `skipConsentScreen: true` configuration
**Root Cause**: Auto-consent logic was being called at the wrong point in OAuth flow
**Status**: ✅ Fixed and deployed

---

## Problem Description

After implementing per-client OAuth consent configuration, the Desktop App was still showing the consent screen despite:
- Config being correctly set to `skipConsentScreen: true` in database
- Client being registered as first-party trusted app
- User login completing successfully

**What was happening:**
1. User logs in via browser → login succeeds ✓
2. Browser shows consent screen (SHOULD skip) ✗
3. User clicks OK on consent → browser shows "An error occurred"
4. BUT Desktop App still receives authorization code and logs in successfully ✓ (confusing!)

This indicated the OIDC provider WAS generating the correct authorization code, but something was failing in the consent flow.

---

## Root Cause Analysis

The original implementation had a critical architectural flaw:

```typescript
// ❌ WRONG: Called AFTER login finishes
login = async (...) => {
  // ... login logic ...
  await finishInteraction(this.provider, req, res, result);
  // At this point, browser has been redirected by OIDC provider

  // ❌ Too late! Trying to auto-approve here doesn't work
  await this.tryAutoApproveConsent(req, res, user.id);
};
```

**Why this failed:**
1. `finishInteraction()` tells OIDC provider "login is complete"
2. OIDC provider processes the result and moves to NEXT prompt (consent)
3. OIDC provider redirects browser to NEW interaction URL: `GET /interaction/{NEW_UID}` for consent
4. At this point, the original login handler has already finished and returned
5. The `tryAutoApproveConsent()` call on line 202 never executes, or executes on stale context

**The actual flow:**
```
Browser GET /interaction/{uid} → prompt=login
  ↓
User submits login credentials
  ↓
Browser POST /interaction/{uid}/login
  ↓
Server calls finishInteraction() → redirects to next prompt
  ↓
Browser GET /interaction/{NEW_UID} → prompt=consent (but too late to intercept!)
  ↓
Server renders consent page (should have been intercepted!)
```

---

## Solution: Intercept at Correct Point

The fix moves the auto-consent check to the CORRECT interception point: **the interaction router method BEFORE rendering the page**.

### New Flow:

```
Browser GET /interaction/{uid} → prompt=login
  ↓
Server renders login page
  ↓
User submits credentials
  ↓
Browser POST /interaction/{uid}/login
  ↓
Server finishes login interaction
  ↓
OIDC Provider redirects to NEXT prompt
  ↓
Browser GET /interaction/{NEW_UID} → prompt=consent
  ↓
Server's interaction() method receives request
  ↓
✅ Check: Should auto-approve? YES!
  ↓
✅ Create grant & finish consent interaction
  ↓
✅ Redirect to callback with authorization code
  ↓
No consent page ever rendered!
```

### Implementation:

```typescript
// ✅ CORRECT: Intercept in interaction() before rendering page
interaction = async (req, res, next) => {
  const details = await getInteractionDetails(...);

  if (details.prompt.name === 'consent') {
    // Check BEFORE rendering the page
    const shouldAutoApprove = await this.checkShouldAutoApproveConsent(
      details.params,
      details.session
    );

    if (shouldAutoApprove) {
      // Auto-approve and redirect - page never renders
      await this.autoApproveConsent(req, res, details);
      return; // IMPORTANT: return early!
    }

    // Otherwise, render consent page normally
    res.sendFile(path.join(__dirname, '../views/consent.html'));
  }
};
```

---

## Code Changes

### 1. Modified `interaction()` Method (lines 31-112)

**What changed:**
- Added check for consent prompts before rendering
- Calls `checkShouldAutoApproveConsent()` to evaluate client config
- If auto-approve enabled, calls `autoApproveConsent()` and returns early
- Prevents consent page from ever being rendered

**Key addition:**
```typescript
else if (prompt.name === 'consent') {
  // Check if client should auto-approve consent before rendering page
  const shouldAutoApprove = await this.checkShouldAutoApproveConsent(
    params,
    session
  );

  if (shouldAutoApprove) {
    logger.info('OIDC: Auto-approving consent (skipping consent page)', {...});
    await this.autoApproveConsent(req, res, details);
    return; // Early return prevents page render
  }

  // Render consent page normally if not auto-approving
  res.sendFile(path.join(__dirname, '../views/consent.html'));
}
```

### 2. Removed Old Call from `login()` Method (lines 218-219)

**What changed:**
- Removed the ineffective `await this.tryAutoApproveConsent(...)` call
- Added comment explaining auto-consent is now handled in interaction() method
- Simplified login logic - login only handles login, not consent

### 3. Added `checkShouldAutoApproveConsent()` Helper (lines 423-480)

**Purpose:** Evaluate if a client should auto-approve based on config

**Logic:**
1. Verify session exists (user must be logged in)
2. Load client from OIDC provider
3. Fetch client config from database
4. Check if `skipConsentScreen === true`
5. Return boolean result

**Key code:**
```typescript
const config = (dbClient.config as any) || {};
const shouldSkipConsent = config.skipConsentScreen === true;
return shouldSkipConsent ? true : false;
```

### 4. Added `autoApproveConsent()` Helper (lines 487-547)

**Purpose:** Perform actual consent approval and redirect

**Logic:**
1. Verify this is a consent prompt (defensive check)
2. Extract requested scopes from params
3. Create grant with all requested scopes
4. Add OIDC scopes to grant
5. Save grant to database
6. Call `finishInteraction()` to redirect to callback with code
7. Log successful auto-approval

**Key code:**
```typescript
const grant = new this.provider.Grant({
  accountId: session?.accountId,
  clientId: params.client_id,
});
grant.addOIDCScope(requestedScopes.join(' '));
const grantId = await grant.save();

await finishInteraction(this.provider, req, res, {
  consent: { grantId }
});
```

---

## Why This Works

1. **Correct Interception Point**: The `interaction()` method is called EVERY TIME a new interaction begins, including the consent prompt
2. **Before Rendering**: Check happens BEFORE the page is sent to browser, so we can redirect instead
3. **Complete Chain**: Creates a proper OIDC consent grant before redirecting, so the authorization code is valid
4. **No Race Condition**: Happens synchronously in the request handler, not asynchronously after redirect

---

## Deployment Notes

### Files Modified:
- `/backend/src/controllers/auth.controller.ts` - Updated interaction interception

### Breaking Changes:
- None. This only affects the internal flow, not the API contract

### Database Changes:
- None. Uses existing `config` JSONB field

### Required for Desktop App to Work:
- Database must have: `config.skipConsentScreen = true` for client ID `textassistant-desktop`
- Already configured in seed data, so new deployments have it automatically

---

## Testing

### Manual Test Steps:

1. **Start backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Open Desktop App and click Login**
   - System browser opens to auth endpoint

3. **Fill credentials** (e.g., test@example.com / password)
   - Login should succeed

4. **Verify consent is skipped**
   - ✅ NO consent page appears
   - ✅ Browser redirects directly to callback with authorization code
   - ✅ Desktop App shows "Welcome back! You're now logged in"
   - ✅ No error messages in browser

5. **Check server logs**
   ```
   OIDC Interaction started
     prompt: consent
     clientId: textassistant-desktop

   OIDC: Auto-approving consent (skipping consent page)
     clientId: textassistant-desktop

   OIDC: Auto-consent approved successfully
     clientId: textassistant-desktop
     scopes: openid email profile ...
   ```

### Key Logs to Watch For:

- ✅ `OIDC: Auto-approving consent (skipping consent page)`
- ✅ `OIDC: Auto-consent approved successfully`
- ❌ `OIDC: skipConsentScreen not enabled` (indicates config not set)
- ❌ `OIDC: Auto-consent approval failed` (indicates error during approval)

---

## Verification Checklist

- [x] TypeScript build succeeds with no errors
- [x] Server starts and responds to health check
- [x] Database has correct config: `skipConsentScreen: true`
- [x] Code follows architectural principles (interception before rendering)
- [x] Logging is comprehensive for debugging
- [x] Error handling is graceful (shows consent page if auto-approve fails)

---

## Future Enhancements

The new architecture makes it easy to add:

1. **Scope-based auto-approval**
   ```typescript
   if (config.scopeRules?.['openid,profile']?.skipConsent) { ... }
   ```

2. **Conditional auto-approval**
   ```typescript
   if (config.skipConsentScreen && !config.requireMFA) { ... }
   ```

3. **Admin dashboard** to enable/disable auto-consent per client without code changes

---

## References

- **OIDC Interaction Prompt**: [OpenID Connect Core 1.0 - Interaction](https://openid.net/specs/openid-connect-core-1_0.html#Interaction)
- **node-oidc-provider Documentation**: https://github.com/panva/node-oidc-provider
- **Related Docs**:
  - `/docs/guides/015-per-client-oauth-consent-configuration.md`
  - `/docs/reference/015-oauth-client-config-reference.md`

