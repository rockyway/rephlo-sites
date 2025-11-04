/**
 * IP Address Hashing Utility
 *
 * Provides functions to hash IP addresses for anonymity.
 * Used for download tracking to preserve user privacy.
 */

import crypto from 'crypto';

/**
 * Hash an IP address for anonymity
 * Uses SHA-256 hashing with optional salt
 *
 * @param ip - IP address to hash
 * @param salt - Optional salt (defaults to env variable or hardcoded salt)
 * @returns Hashed IP address as hex string
 */
export function hashIpAddress(ip: string, salt?: string): string {
  const hashSalt = salt || process.env.IP_HASH_SALT || 'rephlo-default-salt-2025';

  return crypto
    .createHash('sha256')
    .update(ip + hashSalt)
    .digest('hex');
}

/**
 * Extract IP address from Express request
 * Handles proxies and forwarded headers
 *
 * @param req - Express request object
 * @returns IP address or undefined
 */
export function getClientIp(req: any): string | undefined {
  // Try x-forwarded-for header (for proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  // Try x-real-ip header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Fall back to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress;
}

/**
 * Get hashed IP from Express request
 * Combines getClientIp and hashIpAddress
 *
 * @param req - Express request object
 * @returns Hashed IP or undefined if IP not available
 */
export function getHashedClientIp(req: any): string | undefined {
  const ip = getClientIp(req);
  return ip ? hashIpAddress(ip) : undefined;
}
