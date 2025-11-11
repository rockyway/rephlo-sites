/**
 * Token Generator Utility
 *
 * Provides cryptographically secure token generation and hashing functions
 * for email verification, password reset, and other authentication tokens.
 *
 * Security Features:
 * - Uses crypto.randomBytes for cryptographic randomness
 * - Tokens are hashed with SHA-256 before storage
 * - Tokens are URL-safe (hex encoding)
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 1)
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param byteLength - Number of random bytes to generate (default: 32)
 * @returns Hex-encoded token string (64 characters for 32 bytes)
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Hash a token using SHA-256
 * This is used to store tokens securely in the database
 * @param token - The plain text token to hash
 * @returns SHA-256 hash of the token (hex encoded)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate email verification token with expiry
 * @param expiryHours - Number of hours until token expires (default: 24)
 * @returns Object containing plain token, hashed token, and expiry date
 */
export function generateEmailVerificationToken(expiryHours: number = 24): {
  token: string;
  hashedToken: string;
  expiry: Date;
} {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + expiryHours);

  return {
    token, // Send this to user via email
    hashedToken, // Store this in database
    expiry,
  };
}

/**
 * Generate password reset token with expiry
 * @param expiryHours - Number of hours until token expires (default: 1)
 * @returns Object containing plain token, hashed token, and expiry date
 */
export function generatePasswordResetToken(expiryHours: number = 1): {
  token: string;
  hashedToken: string;
  expiry: Date;
} {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + expiryHours);

  return {
    token, // Send this to user via email
    hashedToken, // Store this in database
    expiry,
  };
}

/**
 * Verify a token against its hash
 * @param plainToken - The plain text token from user
 * @param hashedToken - The hashed token from database
 * @returns True if token matches hash
 */
export function verifyToken(plainToken: string, hashedToken: string): boolean {
  const computedHash = hashToken(plainToken);
  return computedHash === hashedToken;
}

/**
 * Check if a token has expired
 * @param expiry - The expiry date from database
 * @returns True if token has expired
 */
export function isTokenExpired(expiry: Date): boolean {
  return new Date() > expiry;
}

/**
 * Generate a random numeric code (for 2FA, SMS verification, etc.)
 * @param length - Length of the code (default: 6)
 * @returns Numeric code as string
 */
export function generateNumericCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';

  // Use crypto.randomBytes for secure random number generation
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % digits.length;
    code += digits[randomIndex];
  }

  return code;
}

/**
 * Generate a random alphanumeric code (for invite codes, promo codes, etc.)
 * @param length - Length of the code (default: 8)
 * @returns Alphanumeric code as string (uppercase)
 */
export function generateAlphanumericCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Generate a URL-safe token (for API keys, session tokens, etc.)
 * @param byteLength - Number of random bytes to generate (default: 32)
 * @returns Base64 URL-safe encoded token
 */
export function generateUrlSafeToken(byteLength: number = 32): string {
  return crypto
    .randomBytes(byteLength)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a unique identifier (UUID v4)
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
