/**
 * Webhook Signature Utilities
 *
 * Provides HMAC-SHA256 signature generation and verification for webhook security.
 * Ensures webhook authenticity and prevents spoofing/tampering.
 */

import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * @param payload - The webhook payload object
 * @param secret - The webhook secret key
 * @returns Signature in format "sha256=<hex-digest>"
 */
export function generateWebhookSignature(payload: any, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const digest = hmac.digest('hex');

  return `sha256=${digest}`;
}

/**
 * Verify HMAC-SHA256 signature for webhook payload
 *
 * @param payload - The webhook payload object
 * @param signature - The signature to verify (format: "sha256=<hex-digest>")
 * @param secret - The webhook secret key
 * @returns True if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    // Signatures have different lengths or invalid format
    return false;
  }
}

/**
 * Generate a secure random webhook secret
 *
 * @param length - Length of the secret (default: 32 bytes = 64 hex characters)
 * @returns Random hex string
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Get current Unix timestamp in seconds
 *
 * @returns Current timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Validate webhook timestamp to prevent replay attacks
 *
 * @param timestamp - Unix timestamp from webhook
 * @param maxAgeSeconds - Maximum allowed age in seconds (default: 5 minutes)
 * @returns True if timestamp is recent, false if too old
 */
export function isTimestampValid(
  timestamp: number,
  maxAgeSeconds: number = 300
): boolean {
  const currentTimestamp = getCurrentTimestamp();
  const age = currentTimestamp - timestamp;

  // Check if timestamp is not in the future and not too old
  return age >= 0 && age <= maxAgeSeconds;
}
