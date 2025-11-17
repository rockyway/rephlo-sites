/**
 * Tspec API Specification - OAuth Google & Token Enhancement
 *
 * This file defines the OpenAPI spec for OAuth Google endpoints and token enhancement using Tspec.
 * All endpoints are public (no authentication required) with IP-based rate limiting.
 *
 * Endpoints:
 * - GET /oauth/google/authorize - Initiate Google OAuth flow (redirects to Google)
 * - GET /oauth/google/callback - Google OAuth callback handler
 * - POST /oauth/token/enhance - Exchange basic token for enhanced token with additional scopes
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// =============================================================================
// GET /oauth/google/authorize - Initiate Google OAuth
// =============================================================================

/**
 * Google OAuth Authorize Query Parameters
 */
export type GoogleOAuthAuthorizeQuery = {
  /** Redirect URI after authorization (optional, defaults to configured URI) */
  redirect_uri?: string;
  /** OAuth state parameter for CSRF protection (auto-generated if not provided) */
  state?: string;
};

/**
 * Redirect Response (HTTP 302)
 * Empty body - response is an HTTP redirect
 */
export interface RedirectResponse {
  // Empty interface for redirect responses
}

// =============================================================================
// GET /oauth/google/callback - Google OAuth Callback
// =============================================================================

/**
 * Google OAuth Callback Query Parameters
 */
export type GoogleOAuthCallbackQuery = {
  /** Authorization code from Google */
  code: string;
  /** CSRF protection token (must match state from authorize request) */
  state: string;
  /** Error code from Google (if authorization failed) */
  error?: string;
};

// =============================================================================
// POST /oauth/token/enhance - Enhance Token Response
// =============================================================================

/**
 * Enhanced Token Request Body
 */
export interface EnhanceTokenRequest {
  /**
   * JWT access token from /oauth/token
   * RS256 signed token from OIDC provider
   */
  access_token: string;
  /**
   * Include full user profile and credits
   * String enum: "true" or "false"
   * @default "false"
   */
  include_user_data?: 'true' | 'false';
  /**
   * Include only credits (without full profile)
   * String enum: "true" or "false"
   * @default "false"
   */
  include_credits?: 'true' | 'false';
}

/**
 * Enhanced Token Response
 * Contains user data and/or credits based on request parameters
 */
export interface EnhanceTokenResponse {
  /** User profile data (only if include_user_data=true) */
  user?: {
    /** User ID */
    userId: string;
    /** Email address */
    email: string;
    /** Display name (first + last name) */
    displayName: string;
    /** Subscription information */
    subscription: {
      /** Subscription tier */
      tier: 'free' | 'pro' | 'enterprise';
      /** Subscription status */
      status: 'active' | 'cancelled' | 'expired' | 'trialing';
    };
    /** Credits data */
    credits: {
      /** Free credits allocation */
      freeCredits: {
        /** Remaining free credits */
        remaining: number;
        /** Monthly allocation */
        monthlyAllocation: number;
        /** Reset date (ISO 8601) */
        resetDate: string;
      };
      /** Pro credits (purchased) */
      proCredits: {
        /** Remaining pro credits */
        remaining: number;
        /** Total purchased credits */
        purchasedTotal: number;
      };
      /** Total available credits (free + pro) */
      totalAvailable: number;
    };
  };
  /** Credits data (if include_credits=true or include_user_data=true) */
  credits?: {
    /** Free credits allocation */
    freeCredits: {
      /** Remaining free credits */
      remaining: number;
      /** Monthly allocation */
      monthlyAllocation: number;
      /** Reset date (ISO 8601) */
      resetDate: string;
    };
    /** Pro credits (purchased) */
    proCredits: {
      /** Remaining pro credits */
      remaining: number;
      /** Total purchased credits */
      purchasedTotal: number;
    };
    /** Total available credits (free + pro) */
    totalAvailable: number;
  };
}

/**
 * Enhance Token Error Response
 */
export interface EnhanceTokenError {
  /** Error object */
  error: {
    /** Error code */
    code: 'validation_error' | 'invalid_token' | 'token_expired' | 'user_not_found';
    /** Human-readable error message */
    message: string;
    /** Detailed validation errors (optional) */
    details?: {
      /** Array of validation error messages */
      errors: string[];
    };
  };
}

// =============================================================================
// Tspec API Specification
// =============================================================================

/**
 * Tspec API specification for OAuth Google and token enhancement endpoints
 */
export type OAuthGoogleApiSpec = Tspec.DefineApiSpec<{
  tags: ['Authentication'];
  paths: {
    '/oauth/google/authorize': {
      get: {
        summary: 'Initiate Google OAuth flow';
        description: `Redirects user to Google OAuth consent screen.

**Flow:**
1. User clicks "Sign in with Google" button
2. System generates random state parameter for CSRF protection
3. System builds Google OAuth authorization URL with:
   - Client ID (from environment)
   - Redirect URI (callback URL)
   - Requested scopes (userinfo.profile, userinfo.email)
   - State parameter (CSRF protection)
   - Access type: offline (for refresh tokens)
   - Prompt: consent (force consent screen to ensure refresh token)
4. System redirects user to Google's consent screen
5. User authorizes application
6. Google redirects to /oauth/google/callback with authorization code

**Scopes Requested:**
- userinfo.profile - User's profile information (name, picture)
- userinfo.email - User's email address

**Query Parameters:**
- redirect_uri: Optional custom redirect URI (defaults to configured callback URL)
- state: Optional CSRF token (auto-generated if not provided)

**Response**: HTTP 302 redirect to Google OAuth URL

**Error Handling**:
- If Google OAuth not configured (missing credentials), redirects to /login?error=google_oauth_not_configured

**Rate Limit**: 10 requests per minute per IP address

**Security:**
- CSRF protection via state parameter (verified in callback)
- Offline access for refresh tokens
- Force consent screen to ensure refresh token generation
- State parameter stored in session for verification`;
        security: never; // Public endpoint
        query: GoogleOAuthAuthorizeQuery;
        responses: {
          /** Redirect to Google OAuth consent screen */
          302: RedirectResponse;
          /** Google OAuth not configured (redirects to login with error) */
          500: RedirectResponse;
        };
      };
    };
    '/oauth/google/callback': {
      get: {
        summary: 'Handle Google OAuth callback';
        description: `Handle Google OAuth callback after user authorizes.

**Flow:**
1. User redirected from Google with authorization code
2. System verifies state parameter matches stored value (CSRF protection)
3. System exchanges authorization code for access token via Google Token API
4. System fetches user profile from Google UserInfo API using access token
5. System verifies email is confirmed by Google (email_verified=true)
6. System finds or creates user:
   - **By Google ID**: If user already authenticated with Google (googleId matches)
   - **By Email**: If user exists with same email (link accounts, add googleId)
   - **Create New**: If no matching user found (new Google user)
7. User record updated/created:
   - Email marked as verified (trust Google verification)
   - Username generated from email if needed
   - authProvider set to 'google'
   - googleId stored for future logins
8. OIDC session created (OAuth token issued)
9. User redirected to app with success status

**User Creation Details:**
- Email marked as verified (trust Google)
- Username generated from email (before @ symbol, deduplicated if needed)
- Random password hash (not used, user logs in via Google)
- authProvider: 'google'
- googleId: Stored for future authentication

**Account Linking:**
- If user exists with same email, Google account is linked
- googleId added to existing user record
- Existing password-based login still works

**Query Parameters:**
- code: Authorization code from Google (required)
- state: CSRF protection token (required, must match authorize request)
- error: Error code from Google (if authorization failed)

**Response**: HTTP 302 redirect to login page with status
- Success: /login?google_auth=success
- State mismatch: /login?error=state_mismatch
- Email not verified: /login?error=email_not_verified
- User creation failed: /login?error=user_creation_failed

**Rate Limit**: 10 requests per minute per IP address

**Security:**
- CSRF protection via state parameter verification
- Email verification required by Google
- Account linking only for verified emails
- Secure token exchange with Google`;
        security: never; // Public endpoint
        query: GoogleOAuthCallbackQuery;
        responses: {
          /** Redirect to login page with success or error status */
          302: RedirectResponse;
          /** State mismatch, email not verified, or user creation failed (redirects to login with error) */
          400: RedirectResponse;
        };
      };
    };
    '/oauth/token/enhance': {
      post: {
        summary: 'Enhance OAuth token with user data and credits';
        description: `Enhance an OAuth token response with user profile and/or credit information.

This endpoint is called immediately after obtaining an access token from /oauth/token
to retrieve initial user data in a single request, reducing round trips.

**Use Cases:**
1. **Initial Login**: Call with \`include_user_data=true\` to get full profile + credits
   - Returns user ID, email, display name, subscription tier/status, and credits
   - Useful for populating UI after login

2. **Token Refresh**: Call with \`include_credits=true\` to get updated credits only
   - Returns current credit balance without full profile
   - Useful for refreshing credit display without full profile fetch

3. **Both**: Call with both flags to get everything
   - Returns full user data and separate credits object
   - Useful for comprehensive state updates

**Token Validation:**
- Validates JWT signature using JWKS from identity provider
- Checks token expiration (exp claim)
- Falls back to token introspection if JWT validation fails
- Extracts user ID from 'sub' claim

**Response Structure:**
- If \`include_user_data=true\`: Returns \`user\` object with profile and nested credits
- If \`include_credits=true\`: Returns \`credits\` object with credit balances
- If both: Returns both \`user\` and \`credits\` objects

**Credits Data:**
- freeCredits: Monthly allocation (resets on resetDate)
  - remaining: Current balance
  - monthlyAllocation: Total monthly credits
  - resetDate: Next reset date (ISO 8601)
- proCredits: Purchased credits (no expiration)
  - remaining: Current balance
  - purchasedTotal: Total purchased (lifetime)
- totalAvailable: Sum of free + pro credits

**Rate Limit**: 30 requests per minute

**Security:**
- Validates JWT signature (RS256)
- Checks token expiration
- Falls back to introspection for non-JWT tokens
- User ID extracted from token claims (no user input)`;
        security: never; // Public endpoint (token validated in request body)
        body: EnhanceTokenRequest;
        responses: {
          /** Enhanced token response with requested data */
          200: EnhanceTokenResponse;
          /** Validation error or invalid request parameters */
          400: EnhanceTokenError;
          /** Invalid or expired access token */
          401: EnhanceTokenError;
          /** Rate limit exceeded (30 per minute) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
