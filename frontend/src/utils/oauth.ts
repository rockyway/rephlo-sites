/**
 * OAuth 2.0 / OIDC Utilities
 *
 * Handles OAuth authorization code flow with PKCE
 * for authentication with the identity provider
 */

import { generatePKCE, storePKCEVerifier, retrievePKCEVerifier, generateAndStoreState, verifyState } from './pkce';
import { OAuthConfig, TokenResponse, UserinfoResponse } from '@/types/auth';

/**
 * OAuth Configuration for Identity Provider
 */
export const OAUTH_CONFIG: OAuthConfig = {
  clientId: 'web-app-test',
  redirectUri: 'http://localhost:7152/oauth/callback',
  authorizationEndpoint: 'http://localhost:7151/oauth/authorize',
  tokenEndpoint: 'http://localhost:7151/oauth/token',
  userinfoEndpoint: 'http://localhost:7151/oauth/userinfo',
  scope: 'openid email profile offline_access admin',
  responseType: 'code',
  codeChallengeMethod: 'S256',
};

/**
 * Initiate OAuth login flow
 * Generates PKCE pair, stores verifier, and redirects to authorization endpoint
 */
export async function initiateOAuthLogin(): Promise<void> {
  try {
    // Generate PKCE pair
    const { verifier, challenge } = await generatePKCE();

    // Store code verifier in session storage
    storePKCEVerifier(verifier);

    // Generate and store state for CSRF protection
    const state = generateAndStoreState();

    // Build authorization URL
    const authUrl = new URL(OAUTH_CONFIG.authorizationEndpoint);
    authUrl.searchParams.append('client_id', OAUTH_CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', OAUTH_CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', OAUTH_CONFIG.responseType);
    authUrl.searchParams.append('scope', OAUTH_CONFIG.scope);
    authUrl.searchParams.append('code_challenge', challenge);
    authUrl.searchParams.append('code_challenge_method', OAUTH_CONFIG.codeChallengeMethod);
    authUrl.searchParams.append('state', state);
    // RFC 8707: Include resource parameter to request JWT access tokens
    authUrl.searchParams.append('resource', 'https://api.textassistant.local');

    // Redirect to authorization endpoint
    window.location.href = authUrl.toString();
  } catch (error) {
    console.error('Failed to initiate OAuth login:', error);
    throw new Error('Failed to start login process. Please try again.');
  }
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from callback
 * @param state - State parameter for CSRF validation
 * @returns Token response with access_token, refresh_token, etc
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string | null
): Promise<TokenResponse> {
  // Verify state parameter for CSRF protection
  if (!verifyState(state)) {
    throw new Error('Invalid state parameter. Possible CSRF attack detected.');
  }

  // Retrieve code verifier from session storage
  const codeVerifier = retrievePKCEVerifier();
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the login process.');
  }

  try {
    // Prepare token request
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: OAUTH_CONFIG.redirectUri,
      client_id: OAUTH_CONFIG.clientId,
      code_verifier: codeVerifier,
      resource: 'https://api.textassistant.local', // RFC 8707: Request JWT access tokens
    });

    // Exchange code for tokens
    const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Token exchange failed:', errorData);
      throw new Error(errorData.error_description || 'Failed to exchange authorization code for tokens');
    }

    const tokenResponse: TokenResponse = await response.json();
    return tokenResponse;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error instanceof Error
      ? error
      : new Error('An unexpected error occurred during token exchange');
  }
}

/**
 * Fetch user information from userinfo endpoint
 * @param accessToken - Valid access token
 * @returns User information from identity provider
 */
export async function fetchUserInfo(accessToken: string): Promise<UserinfoResponse> {
  try {
    const response = await fetch(OAUTH_CONFIG.userinfoEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch user info:', errorData);
      throw new Error('Failed to fetch user information');
    }

    const userInfo: UserinfoResponse = await response.json();
    return userInfo;
  } catch (error) {
    console.error('User info fetch error:', error);
    throw error instanceof Error
      ? error
      : new Error('An unexpected error occurred while fetching user information');
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Valid refresh token
 * @returns New token response with fresh access_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  try {
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CONFIG.clientId,
      resource: 'https://api.textassistant.local', // RFC 8707: Request JWT access tokens
    });

    const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Token refresh failed:', errorData);
      throw new Error(errorData.error_description || 'Failed to refresh access token');
    }

    const tokenResponse: TokenResponse = await response.json();
    return tokenResponse;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error instanceof Error
      ? error
      : new Error('An unexpected error occurred during token refresh');
  }
}

/**
 * Revoke tokens (logout)
 * @param token - Access or refresh token to revoke
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    const revokeUrl = OAUTH_CONFIG.tokenEndpoint.replace('/token', '/revoke');

    const response = await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token,
        client_id: OAUTH_CONFIG.clientId,
      }).toString(),
    });

    // Token revocation endpoint returns 200 even if token is invalid
    if (!response.ok) {
      console.warn('Token revocation returned non-200 status:', response.status);
    }
  } catch (error) {
    // Log but don't throw - revocation failure shouldn't block logout
    console.error('Token revocation error:', error);
  }
}
