# Google OAuth 2.0 Setup Guide

This guide walks you through setting up Google OAuth 2.0 authentication for the Rephlo Backend API. Users will be able to log in using their Google accounts.

## Overview

The implementation uses the **OAuth 2.0 Authorization Code Flow** with the following features:

- User can log in with their Google account
- Email verification is automatically trusted from Google
- Existing email/password accounts can be linked to Google accounts
- Secure CSRF protection using state parameter
- User profile information (name, email, picture) imported from Google

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console
- Node.js application with googleapis package installed

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Enter project details:
   - **Project name**: `Rephlo Backend` (or your preferred name)
   - **Organization**: (select if applicable)
4. Click **Create**

## Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Go to **APIs & Services** > **Library**
3. Search for **"Google+ API"** (or **"Google Identity"**)
4. Click on it and click **Enable**

Note: Modern Google OAuth uses the `userinfo` endpoint which doesn't strictly require Google+ API, but it's recommended for consistency.

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **User Type**:
   - **Internal**: Only users in your organization (requires Google Workspace)
   - **External**: Any Google account user (recommended for public apps)
3. Click **Create**

### Fill in OAuth Consent Screen Information

**App Information:**
- **App name**: `Rephlo` (or your application name)
- **User support email**: Your support email
- **App logo**: (optional) Upload your app logo

**App Domain:**
- **Application home page**: `https://yourdomain.com`
- **Application privacy policy link**: `https://yourdomain.com/privacy`
- **Application terms of service link**: `https://yourdomain.com/terms`

**Authorized Domains:**
- Add your domain: `yourdomain.com`
- For local development, you don't need to add `localhost`

**Developer Contact Information:**
- Enter your email address

Click **Save and Continue**

### Configure Scopes

1. Click **Add or Remove Scopes**
2. Select the following scopes:
   - `userinfo.email` - View your email address
   - `userinfo.profile` - View your basic profile info
3. Click **Update**
4. Click **Save and Continue**

### Test Users (for External apps in testing mode)

If your app is in **Testing** mode:
1. Add test users who can access your app
2. Enter their Gmail addresses
3. Click **Save and Continue**

Note: To make your app public, you'll need to submit for **Verification** in the OAuth consent screen settings.

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter details:
   - **Name**: `Rephlo Backend OAuth Client`

5. Add **Authorized redirect URIs**:
   - For local development: `http://localhost:7150/oauth/google/callback`
   - For staging: `https://staging-api.yourdomain.com/oauth/google/callback`
   - For production: `https://api.yourdomain.com/oauth/google/callback`

6. Click **Create**

## Step 5: Save Your Credentials

After creating the OAuth client, you'll see a dialog with:

- **Client ID**: `xxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`

**IMPORTANT**: Copy these values immediately. You'll need them for your environment variables.

## Step 6: Configure Environment Variables

Add the following to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:7150/oauth/google/callback
```

For production, update `GOOGLE_REDIRECT_URI` to your production domain:

```env
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/oauth/google/callback
```

## Step 7: Test OAuth Flow

### Local Testing

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. Navigate to the Google OAuth authorization endpoint:
   ```
   http://localhost:7150/oauth/google/authorize
   ```

3. You should be redirected to Google's consent screen
4. Sign in with your Google account
5. Grant permissions
6. You'll be redirected back to `/oauth/google/callback`
7. Check logs to verify user creation/login

### Testing Flow

**Success Flow:**
```
GET /oauth/google/authorize
  → Redirect to Google
  → User signs in and grants consent
  → Redirect to /oauth/google/callback?code=xxx&state=xxx
  → Exchange code for tokens
  → Fetch user profile
  → Create or link user account
  → Redirect to /login?google_success=true&user_id=xxx
```

**Error Flow:**
```
GET /oauth/google/authorize
  → Redirect to Google
  → User denies consent
  → Redirect to /oauth/google/callback?error=access_denied
  → Redirect to /login?error=google_oauth_failed
```

## Step 8: Update Frontend/Client

Update your client application to initiate Google OAuth:

```typescript
// Redirect user to backend's Google OAuth endpoint
function loginWithGoogle() {
  window.location.href = 'http://localhost:7150/oauth/google/authorize';
}
```

## Security Best Practices

### 1. State Parameter (CSRF Protection)

The implementation generates a random `state` parameter to prevent CSRF attacks. For production:

- Store state in Redis or session store
- Verify state matches on callback
- Expire state after use or timeout (5 minutes recommended)

Example production implementation:
```typescript
// On authorize:
const state = crypto.randomBytes(32).toString('hex');
await redis.setex(`google_oauth_state:${state}`, 300, userId);

// On callback:
const storedUserId = await redis.get(`google_oauth_state:${state}`);
if (!storedUserId) {
  throw new Error('Invalid or expired state');
}
await redis.del(`google_oauth_state:${state}`);
```

### 2. Secure Credentials

- Never commit `.env` file to version control
- Use different credentials for dev/staging/production
- Rotate credentials periodically
- Restrict OAuth client to specific redirect URIs

### 3. Scope Limitation

Only request scopes you need:
- `userinfo.email` - User's email address
- `userinfo.profile` - User's name and picture

Don't request additional scopes unless required.

### 4. Email Verification

The implementation trusts Google's email verification (`verified_email: true`). Users created via Google OAuth have `emailVerified: true` automatically.

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your request doesn't match the authorized redirect URIs in Google Console.

**Solution**:
1. Check your `GOOGLE_REDIRECT_URI` environment variable
2. Verify it matches exactly in Google Console (including protocol, port, path)
3. Make sure there are no trailing slashes

### Error: "invalid_client"

**Cause**: Invalid client ID or client secret.

**Solution**:
1. Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
2. Ensure no extra spaces or quotes
3. Verify credentials in Google Console

### Error: "access_denied"

**Cause**: User denied consent.

**Solution**: This is normal user behavior. Handle gracefully by redirecting to login page with error message.

### Error: "google_oauth_not_configured"

**Cause**: Environment variables not set.

**Solution**: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`.

### User sees "This app isn't verified"

**Cause**: Your app is in testing mode or not verified.

**Solutions**:
1. **For development**: Add users as test users in OAuth consent screen
2. **For production**: Submit your app for verification in Google Console
3. **Temporary**: Users can click "Advanced" > "Go to [app name] (unsafe)" to proceed

## Database Schema

Users authenticated via Google OAuth have the following fields populated:

```typescript
{
  id: "uuid",
  email: "user@gmail.com",
  emailVerified: true,              // Trusted from Google
  username: "user_abc123",          // Auto-generated
  firstName: "John",                // From Google profile
  lastName: "Doe",                  // From Google profile
  profilePictureUrl: "https://...", // Google profile picture
  googleId: "1234567890",           // Google account ID
  googleProfileUrl: "https://...",  // Same as profilePictureUrl
  authProvider: "google",           // Indicates OAuth user
  passwordHash: "<random>",         // Random placeholder (not used)
  isActive: true,
  createdAt: "2025-11-06T...",
  lastLoginAt: "2025-11-06T..."
}
```

## Account Linking

If a user with the same email already exists (created via email/password), the Google account will be **linked** to the existing account:

1. User registers with `user@gmail.com` and password
2. Later, user clicks "Login with Google" using `user@gmail.com`
3. System finds existing user by email
4. Google account is linked (updates `googleId`, `googleProfileUrl`, `authProvider`)
5. User can now log in with either Google OAuth or email/password

## Integration with OIDC Provider

**Current Implementation**: After successful Google authentication, the callback redirects to `/login?google_success=true&user_id=xxx`.

**TODO**: Full OIDC integration requires:

1. Create OIDC interaction session for authenticated user
2. Auto-grant consent for requested scopes
3. Generate authorization code
4. Redirect to client with authorization code (standard OAuth flow)

This will be implemented in a future phase to complete the OAuth flow.

## Production Checklist

Before deploying to production:

- [ ] Create separate Google Cloud project for production
- [ ] Configure production OAuth credentials
- [ ] Add production redirect URI to Google Console
- [ ] Set production environment variables
- [ ] Implement state verification with Redis/session store
- [ ] Submit app for Google verification (if making public)
- [ ] Test complete OAuth flow in production environment
- [ ] Set up monitoring for OAuth failures
- [ ] Configure rate limiting on OAuth endpoints
- [ ] Review and update OAuth consent screen information
- [ ] Implement OIDC session creation (see TODO in controller)

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

## Support

For issues with Google OAuth setup, contact:
- Google Cloud Support: [https://cloud.google.com/support](https://cloud.google.com/support)
- Internal support: [your support channel]
