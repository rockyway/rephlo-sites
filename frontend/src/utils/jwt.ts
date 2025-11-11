/**
 * JWT Utilities
 *
 * Helper functions for decoding and validating JWT tokens
 */

/**
 * Decode JWT payload without verification
 * This is safe for id_tokens from trusted identity providers
 * @param token - JWT token string
 * @returns Decoded payload object
 */
export function decodeJWT<T = Record<string, any>>(token: string): T {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Decode base64url payload (second part)
    const payload = parts[1];

    // Base64url decode: replace - with +, _ with /, and add padding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    // Decode and parse JSON
    const decoded = atob(paddedBase64);
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    throw new Error('Invalid JWT token');
  }
}

/**
 * Check if JWT is expired
 * @param token - JWT token string
 * @returns true if token is expired
 */
export function isJWTExpired(token: string): boolean {
  try {
    const payload = decodeJWT<{ exp?: number }>(token);
    if (!payload.exp) return true;

    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= payload.exp * 1000;
  } catch (error) {
    return true;
  }
}

/**
 * Get JWT expiration time
 * @param token - JWT token string
 * @returns Expiration timestamp in milliseconds, or null if not available
 */
export function getJWTExpiration(token: string): number | null {
  try {
    const payload = decodeJWT<{ exp?: number }>(token);
    return payload.exp ? payload.exp * 1000 : null;
  } catch (error) {
    return null;
  }
}
