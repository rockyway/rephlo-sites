/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * Implements PKCE for OAuth Authorization Code Flow
 * as specified in RFC 7636
 */

import { PKCEPair } from '@/types/auth';

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the string (default: 128)
 * @returns Random string using unreserved characters
 */
function generateRandomString(length: number = 128): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((value) => charset[value % charset.length])
    .join('');
}

/**
 * Generate SHA-256 hash of a string
 * @param plain - Plain text to hash
 * @returns Base64URL encoded hash
 */
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url
  return base64UrlEncode(hash);
}

/**
 * Base64URL encode a buffer
 * @param buffer - Buffer to encode
 * @returns Base64URL encoded string
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate PKCE code verifier and challenge pair
 * @returns PKCEPair with verifier and challenge
 */
export async function generatePKCE(): Promise<PKCEPair> {
  const verifier = generateRandomString(128);
  const challenge = await sha256(verifier);

  return {
    verifier,
    challenge,
  };
}

/**
 * Store PKCE verifier in session storage
 * @param verifier - Code verifier to store
 */
export function storePKCEVerifier(verifier: string): void {
  sessionStorage.setItem('pkce_verifier', verifier);
}

/**
 * Retrieve and remove PKCE verifier from session storage
 * @returns Code verifier or null if not found
 */
export function retrievePKCEVerifier(): string | null {
  const verifier = sessionStorage.getItem('pkce_verifier');
  if (verifier) {
    sessionStorage.removeItem('pkce_verifier');
  }
  return verifier;
}

/**
 * Generate and store OAuth state parameter for CSRF protection
 * @returns Random state string
 */
export function generateAndStoreState(): string {
  const state = generateRandomString(32);
  sessionStorage.setItem('oauth_state', state);
  return state;
}

/**
 * Verify OAuth state parameter
 * @param receivedState - State received from OAuth callback
 * @returns True if state is valid
 */
export function verifyState(receivedState: string | null): boolean {
  const storedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');

  if (!receivedState || !storedState) {
    return false;
  }

  return receivedState === storedState;
}
