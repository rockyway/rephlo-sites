# Google OAuth Setup Guide

**Version**: 1.0
**Last Updated**: November 2025
**Audience**: Developers, DevOps Engineers

This guide provides step-by-step instructions for setting up Google OAuth authentication for the Rephlo backend API.

---

## Table of Contents

1. [Overview](#overview)
2. [Development Setup](#development-setup)
3. [Production Setup](#production-setup)
4. [Testing the OAuth Flow](#testing-the-oauth-flow)
5. [Troubleshooting](#troubleshooting)
6. [Security Considerations](#security-considerations)

---

## Overview

Rephlo uses Google OAuth 2.0 for social authentication, allowing users to sign in with their Google accounts. The implementation follows the OAuth 2.0 authorization code flow with state parameter for CSRF protection.

**What You'll Need**:
- Google Cloud Console account
- Access to create/manage OAuth 2.0 credentials
- Backend and frontend running locally or deployed

**OAuth Scopes Requested**:
- `email` - Access user's email address
- `profile` - Access user's basic profile information (name, picture)

---

## Development Setup

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Select an existing project or create a new one:
   - Click project dropdown at the top
   - Click "NEW PROJECT"
   - Enter project name: `Rephlo Dev` (or your preference)
   - Click "CREATE"

### Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on "Google+ API" from results
4. Click **ENABLE** button
5. Wait for API to be enabled (takes a few seconds)

> **Note**: The Google+ API is required for accessing user profile information during OAuth.

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **CREATE**

4. Fill in the required information:
   - **App name**: `Rephlo`
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload Rephlo logo
   - **Application home page**: `http://localhost:5173` (development)
   - **Application privacy policy link**: `http://localhost:5173/privacy`
   - **Application terms of service link**: `http://localhost:5173/terms`
   - **Authorized domains**: Leave empty for development
   - **Developer contact information**: Your email address

5. Click **SAVE AND CONTINUE**

6. **Scopes** page:
   - Click **ADD OR REMOVE SCOPES**
   - Select these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click **UPDATE**
   - Click **SAVE AND CONTINUE**

7. **Test users** page (for development):
   - Click **ADD USERS**
   - Add your test email addresses (e.g., developer@example.com)
   - Click **SAVE AND CONTINUE**

8. Review the summary and click **BACK TO DASHBOARD**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Application type**: `Web application`
4. Configure the client:
   - **Name**: `Rephlo Backend (Development)`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:7150
     http://localhost:5173
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:7150/oauth/google/callback
     ```

5. Click **CREATE**
6. A dialog appears with your credentials:
   - **Client ID**: `123456789-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`

7. **IMPORTANT**: Copy both values immediately - you'll need them next

### Step 5: Configure Backend Environment Variables

1. Open your backend `.env` file (create from `.env.example` if needed)
2. Add the Google OAuth credentials:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:7150/oauth/google/callback

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:5173
```

3. Save the file
4. Restart your backend server to load new environment variables

### Step 6: Verify Configuration

Run this command to verify your credentials are loaded:

```bash
cd backend
node -e "console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set'); console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set');"
```

Expected output:
```
Client ID: Set
Client Secret: Set
```

---

## Production Setup

### Step 1: Update OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **EDIT APP**
3. Update the URLs to production:
   - **Application home page**: `https://yourdomain.com`
   - **Application privacy policy link**: `https://yourdomain.com/privacy`
   - **Application terms of service link**: `https://yourdomain.com/terms`
   - **Authorized domains**: Add `yourdomain.com`

4. Click **SAVE AND CONTINUE** through all pages

### Step 2: Create Production OAuth Client

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Application type**: `Web application`
4. Configure the client:
   - **Name**: `Rephlo Backend (Production)`
   - **Authorized JavaScript origins**:
     ```
     https://yourdomain.com
     ```
   - **Authorized redirect URIs**:
     ```
     https://yourdomain.com/oauth/google/callback
     ```

5. Click **CREATE**
6. Copy the **Client ID** and **Client Secret**

### Step 3: Configure Production Environment

Set these environment variables in your production deployment:

```env
GOOGLE_CLIENT_ID=<production_client_id>
GOOGLE_CLIENT_SECRET=<production_client_secret>
GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth/google/callback
FRONTEND_URL=https://yourdomain.com
```

**Deployment Platforms**:

- **Heroku**: `heroku config:set GOOGLE_CLIENT_ID=xxx ...`
- **AWS**: Set in Parameter Store or Secrets Manager
- **Docker**: Pass as environment variables or use secrets
- **Vercel**: Set in project environment variables

### Step 4: Verify OAuth App (Optional but Recommended)

For production apps with many users:

1. Go to **OAuth consent screen**
2. Click **PUBLISH APP**
3. Click **Prepare for verification**
4. Follow Google's verification process (may take 1-2 weeks)

**Verification Benefits**:
- Removes "unverified app" warning
- No user limit (unverified apps limited to 100 users)
- Builds user trust

---

## Testing the OAuth Flow

### Local Testing

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   # Backend should be running on http://localhost:7150
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   # Frontend should be running on http://localhost:5173
   ```

3. **Test OAuth Flow**:
   - Open browser to `http://localhost:5173`
   - Click "Sign in with Google" button
   - You should be redirected to Google's consent screen
   - Grant permissions
   - You should be redirected back to the app as logged in

4. **Check Logs**:
   ```bash
   # Backend logs should show:
   Google OAuth: Received callback
   Google OAuth: Successfully authenticated user
   User logged in: <user_id>
   ```

### Manual API Testing

Test the OAuth endpoints directly:

```bash
# 1. Initiate OAuth (will redirect to Google)
curl -v http://localhost:7150/oauth/google/authorize

# 2. After callback (replace with actual code and state from redirect)
curl -v "http://localhost:7150/oauth/google/callback?code=<auth_code>&state=<state>"
```

### Testing Error Scenarios

1. **Invalid Credentials**:
   - Set wrong `GOOGLE_CLIENT_SECRET`
   - Try to login → Should show error page

2. **Unverified Email**:
   - Use Google account with unverified email (rare)
   - Should reject with "email_not_verified" error

3. **User Denies Access**:
   - Click "Cancel" on Google consent screen
   - Should redirect with "google_oauth_failed" error

---

## Troubleshooting

### "Redirect URI Mismatch" Error

**Problem**: Google shows error: "redirect_uri_mismatch"

**Solutions**:
1. Verify `GOOGLE_REDIRECT_URI` in `.env` exactly matches the URI in Google Console
2. Check for typos (http vs https, trailing slashes, port numbers)
3. Wait 5-10 minutes after updating Google Console (changes take time to propagate)

**Example of correct URIs**:
```
# .env file
GOOGLE_REDIRECT_URI=http://localhost:7150/oauth/google/callback

# Google Console (must match exactly)
http://localhost:7150/oauth/google/callback
```

### "Access Blocked: App not Verified" Warning

**Problem**: Google shows a warning that the app is not verified

**Solutions**:
1. For development: Click "Advanced" → "Go to Rephlo (unsafe)"
2. Add your test users in OAuth consent screen → Test users
3. For production: Submit app for verification

### Backend Returns "Google OAuth not configured"

**Problem**: API returns 503 error with message "google_oauth_not_configured"

**Solutions**:
1. Verify `.env` file has both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Restart backend server after updating `.env`
3. Check file is named exactly `.env` (not `.env.local` or `.env.example`)

### "Invalid State Parameter" Error

**Problem**: Callback fails with "invalid_state" error

**Causes**:
- Session cookie was cleared between authorize and callback
- Browser blocked cookies (third-party cookie blocking)
- Multiple browser tabs causing state mismatch

**Solutions**:
1. Clear browser cookies and try again
2. Allow cookies for localhost in browser settings
3. Use single browser tab for OAuth flow

### User Profile Not Loaded

**Problem**: User authenticated but profile data (name, picture) not showing

**Solutions**:
1. Verify `profile` scope is requested (check Google OAuth authorize URL)
2. Check Google+ API is enabled in Google Cloud Console
3. Inspect API logs for errors during profile fetch

---

## Security Considerations

### State Parameter (CSRF Protection)

The OAuth flow uses a `state` parameter to prevent CSRF attacks:

1. Backend generates random state before redirect
2. State is stored in user's session
3. Google includes state in callback URL
4. Backend verifies state matches before proceeding

**Never skip state validation** - it's critical for security.

### Credential Security

**DO**:
- Store credentials in environment variables
- Use secrets manager in production (AWS Secrets Manager, Azure Key Vault)
- Rotate credentials if compromised
- Use different credentials for dev/staging/prod

**DON'T**:
- Commit credentials to Git
- Share credentials in Slack/email
- Use production credentials in development
- Hardcode credentials in code

### Redirect URI Validation

Google validates that callback URIs match exactly what's configured:

- **Prevents**: Attackers redirecting OAuth codes to malicious sites
- **Requirement**: URIs must match exactly (including protocol, port, path)

### Token Handling

OAuth tokens are exchanged server-side only:

1. User authenticates with Google
2. Google sends authorization code to backend
3. Backend exchanges code for access token (server-to-server)
4. Backend creates user session (OIDC/JWT)
5. Frontend receives session token (not Google tokens)

**Never expose Google access tokens to frontend** - keep them server-side.

---

## API Endpoints

### GET /oauth/google/authorize

Initiates Google OAuth flow by redirecting user to Google's consent screen.

**Query Parameters**:
- `redirect_uri` (optional): Override default redirect after successful auth

**Rate Limit**: 10 requests/minute per IP

**Response**: 302 Redirect to Google

**Example**:
```
GET http://localhost:7150/oauth/google/authorize
→ Redirects to: https://accounts.google.com/o/oauth2/v2/auth?...
```

### GET /oauth/google/callback

Handles Google's callback after user authorizes.

**Query Parameters**:
- `code` (required): Authorization code from Google
- `state` (required): CSRF protection token
- `error` (optional): Error code if user denied access

**Rate Limit**: 10 requests/minute per IP

**Response**: 302 Redirect to frontend

**Success Redirect**:
```
http://localhost:5173/login?google_success=true&user_id=<uuid>
```

**Error Redirect**:
```
http://localhost:5173/login?error=<error_code>
```

**Error Codes**:
- `google_oauth_not_configured` - Backend missing credentials
- `google_oauth_failed` - User denied access
- `missing_code` - Authorization code not provided
- `invalid_state` - State parameter missing/invalid
- `email_not_verified` - Google account email not verified
- `user_creation_failed` - Database error creating user
- `google_oauth_callback_failed` - Unexpected error

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/rfc6749#section-10)
- [Rephlo Authentication Implementation](../plan/103-auth-endpoints-implementation.md)
- [Backend API Documentation](../../backend/README.md)

---

## Support

If you encounter issues not covered in this guide:

1. Check backend logs for detailed error messages
2. Review Google Cloud Console audit logs
3. Search existing GitHub issues
4. Create new GitHub issue with:
   - Error message
   - Backend logs
   - Steps to reproduce
   - Environment (dev/prod)

---

**Last Updated**: November 2025
**Document Version**: 1.0
