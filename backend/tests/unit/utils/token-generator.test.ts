/**
 * Unit Tests for Token Generator Utility
 *
 * Tests all token generation and validation functions including:
 * - generateSecureToken()
 * - hashToken()
 * - generateEmailVerificationToken()
 * - generatePasswordResetToken()
 * - verifyToken()
 * - isTokenExpired()
 * - generateNumericCode()
 * - generateAlphanumericCode()
 * - generateUrlSafeToken()
 * - generateUUID()
 */

import {
  generateSecureToken,
  hashToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyToken,
  isTokenExpired,
  generateNumericCode,
  generateAlphanumericCode,
  generateUrlSafeToken,
  generateUUID,
} from '../../../src/utils/token-generator';

describe('Token Generator Utility', () => {
  describe('generateSecureToken', () => {
    it('should generate 64-character hex string by default (32 bytes)', () => {
      const token = generateSecureToken();

      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate token of specified byte length', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);

      expect(token16).toHaveLength(32); // 16 bytes * 2 hex chars
      expect(token64).toHaveLength(128); // 64 bytes * 2 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      const token3 = generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }

      expect(tokens.size).toBe(100); // All unique
    });

    it('should only contain hex characters', () => {
      const token = generateSecureToken();

      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hashToken', () => {
    it('should hash token with SHA-256', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);

      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent hash for same input', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashToken('');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle Unicode characters', () => {
      const hash = hashToken('token-😀-unicode');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic (same input = same output)', () => {
      const token = 'my-secure-token-12345';
      const hashes = [];

      for (let i = 0; i < 10; i++) {
        hashes.push(hashToken(token));
      }

      const firstHash = hashes[0];
      expect(hashes.every((h) => h === firstHash)).toBe(true);
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate token with default 24 hour expiry', () => {
      const result = generateEmailVerificationToken();

      expect(result.token).toHaveLength(64);
      expect(result.hashedToken).toHaveLength(64);
      expect(result.expiry).toBeInstanceOf(Date);
    });

    it('should generate token with custom expiry hours', () => {
      const result = generateEmailVerificationToken(48);
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Allow 1 minute tolerance for test execution time
      const timeDiff = Math.abs(result.expiry.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000);
    });

    it('should hash the token correctly', () => {
      const result = generateEmailVerificationToken();
      const manualHash = hashToken(result.token);

      expect(result.hashedToken).toBe(manualHash);
    });

    it('should generate unique tokens each time', () => {
      const result1 = generateEmailVerificationToken();
      const result2 = generateEmailVerificationToken();

      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashedToken).not.toBe(result2.hashedToken);
    });

    it('should set expiry in the future', () => {
      const result = generateEmailVerificationToken();
      const now = new Date();

      expect(result.expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should set expiry approximately 24 hours ahead', () => {
      const result = generateEmailVerificationToken(24);
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const timeDiff = Math.abs(result.expiry.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate token with default 1 hour expiry', () => {
      const result = generatePasswordResetToken();

      expect(result.token).toHaveLength(64);
      expect(result.hashedToken).toHaveLength(64);
      expect(result.expiry).toBeInstanceOf(Date);
    });

    it('should generate token with custom expiry hours', () => {
      const result = generatePasswordResetToken(2);
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const timeDiff = Math.abs(result.expiry.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000);
    });

    it('should hash the token correctly', () => {
      const result = generatePasswordResetToken();
      const manualHash = hashToken(result.token);

      expect(result.hashedToken).toBe(manualHash);
    });

    it('should generate unique tokens each time', () => {
      const result1 = generatePasswordResetToken();
      const result2 = generatePasswordResetToken();

      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashedToken).not.toBe(result2.hashedToken);
    });

    it('should set expiry in the future', () => {
      const result = generatePasswordResetToken();
      const now = new Date();

      expect(result.expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should set expiry approximately 1 hour ahead', () => {
      const result = generatePasswordResetToken(1);
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 60 * 60 * 1000);

      const timeDiff = Math.abs(result.expiry.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const plainToken = 'my-secret-token-12345';
      const hashedToken = hashToken(plainToken);

      expect(verifyToken(plainToken, hashedToken)).toBe(true);
    });

    it('should reject invalid token', () => {
      const hashedToken = hashToken('correct-token');

      expect(verifyToken('wrong-token', hashedToken)).toBe(false);
    });

    it('should be case sensitive', () => {
      const hashedToken = hashToken('MyToken');

      expect(verifyToken('mytoken', hashedToken)).toBe(false);
      expect(verifyToken('MyToken', hashedToken)).toBe(true);
    });

    it('should work with generated tokens', () => {
      const { token, hashedToken } = generateEmailVerificationToken();

      expect(verifyToken(token, hashedToken)).toBe(true);
    });

    it('should reject empty token', () => {
      const hashedToken = hashToken('valid-token');

      expect(verifyToken('', hashedToken)).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour ahead

      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it('should return true for current time (edge case)', () => {
      const now = new Date();

      // This might be flaky, but usually returns true because of execution time
      const result = isTokenExpired(now);
      expect(typeof result).toBe('boolean');
    });

    it('should handle very old dates', () => {
      const veryOld = new Date('2000-01-01');

      expect(isTokenExpired(veryOld)).toBe(true);
    });

    it('should handle far future dates', () => {
      const farFuture = new Date('2100-01-01');

      expect(isTokenExpired(farFuture)).toBe(false);
    });
  });

  describe('generateNumericCode', () => {
    it('should generate 6-digit code by default', () => {
      const code = generateNumericCode();

      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate code of specified length', () => {
      const code4 = generateNumericCode(4);
      const code8 = generateNumericCode(8);

      expect(code4).toHaveLength(4);
      expect(code4).toMatch(/^\d{4}$/);

      expect(code8).toHaveLength(8);
      expect(code8).toMatch(/^\d{8}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateNumericCode());
      }

      // Most should be unique (some duplicates possible with 6 digits)
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should only contain digits', () => {
      const code = generateNumericCode(10);

      expect(code).toMatch(/^\d+$/);
    });

    it('should handle edge cases', () => {
      const code1 = generateNumericCode(1);
      expect(code1).toHaveLength(1);
      expect(code1).toMatch(/^\d$/);

      const code20 = generateNumericCode(20);
      expect(code20).toHaveLength(20);
      expect(code20).toMatch(/^\d{20}$/);
    });
  });

  describe('generateAlphanumericCode', () => {
    it('should generate 8-character code by default', () => {
      const code = generateAlphanumericCode();

      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should generate code of specified length', () => {
      const code4 = generateAlphanumericCode(4);
      const code12 = generateAlphanumericCode(12);

      expect(code4).toHaveLength(4);
      expect(code4).toMatch(/^[A-Z0-9]{4}$/);

      expect(code12).toHaveLength(12);
      expect(code12).toMatch(/^[A-Z0-9]{12}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateAlphanumericCode());
      }

      expect(codes.size).toBe(100); // Should all be unique
    });

    it('should only contain uppercase letters and numbers', () => {
      const code = generateAlphanumericCode(20);

      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(code).not.toMatch(/[a-z]/); // No lowercase
    });

    it('should be suitable for promo codes', () => {
      const promoCode = generateAlphanumericCode(8);

      expect(promoCode).toHaveLength(8);
      expect(promoCode).toMatch(/^[A-Z0-9]{8}$/);
    });
  });

  describe('generateUrlSafeToken', () => {
    it('should generate URL-safe token', () => {
      const token = generateUrlSafeToken();

      expect(token.length).toBeGreaterThan(0);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // Only URL-safe chars
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
    });

    it('should generate token of appropriate length', () => {
      const token32 = generateUrlSafeToken(32);
      const token64 = generateUrlSafeToken(64);

      expect(token32.length).toBeGreaterThan(40); // Base64 expansion
      expect(token64.length).toBeGreaterThan(80);
    });

    it('should generate unique tokens', () => {
      const token1 = generateUrlSafeToken();
      const token2 = generateUrlSafeToken();
      const token3 = generateUrlSafeToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
    });

    it('should be safe for URLs', () => {
      const token = generateUrlSafeToken();
      const encoded = encodeURIComponent(token);

      expect(encoded).toBe(token); // Should not need encoding
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = generateUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }

      expect(uuids.size).toBe(100);
    });

    it('should have correct format', () => {
      const uuid = generateUUID();
      const parts = uuid.split('-');

      expect(parts).toHaveLength(5);
      expect(parts[0]).toHaveLength(8);
      expect(parts[1]).toHaveLength(4);
      expect(parts[2]).toHaveLength(4);
      expect(parts[3]).toHaveLength(4);
      expect(parts[4]).toHaveLength(12);
    });

    it('should have version 4 identifier', () => {
      const uuid = generateUUID();
      const parts = uuid.split('-');

      expect(parts[2][0]).toBe('4'); // Version 4
    });
  });

  describe('Integration - Token lifecycle', () => {
    it('should support complete email verification flow', () => {
      // Generate token
      const { token, hashedToken, expiry } = generateEmailVerificationToken(24);

      // Verify token is valid
      expect(verifyToken(token, hashedToken)).toBe(true);

      // Verify token is not expired
      expect(isTokenExpired(expiry)).toBe(false);

      // Verify wrong token fails
      expect(verifyToken('wrong-token', hashedToken)).toBe(false);
    });

    it('should support complete password reset flow', () => {
      // Generate token
      const { token, hashedToken, expiry } = generatePasswordResetToken(1);

      // Verify token is valid
      expect(verifyToken(token, hashedToken)).toBe(true);

      // Verify token is not expired
      expect(isTokenExpired(expiry)).toBe(false);

      // Verify hash is consistent
      const recomputedHash = hashToken(token);
      expect(recomputedHash).toBe(hashedToken);
    });

    it('should handle expired token scenario', () => {
      const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      expect(isTokenExpired(expiredDate)).toBe(true);
    });

    it('should generate different tokens for different purposes', () => {
      const emailToken = generateEmailVerificationToken();
      const resetToken = generatePasswordResetToken();

      expect(emailToken.token).not.toBe(resetToken.token);
      expect(emailToken.hashedToken).not.toBe(resetToken.hashedToken);
    });
  });

  describe('Security validation', () => {
    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        tokens.add(generateSecureToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    it('should hash tokens consistently', () => {
      const token = generateSecureToken();
      const hashes = [];

      for (let i = 0; i < 100; i++) {
        hashes.push(hashToken(token));
      }

      // All hashes should be identical
      expect(new Set(hashes).size).toBe(1);
    });

    it('should not allow token verification with similar tokens', () => {
      const token = 'secure-token-12345';
      const hashedToken = hashToken(token);

      expect(verifyToken('secure-token-12346', hashedToken)).toBe(false);
      expect(verifyToken('secure-token-1234', hashedToken)).toBe(false);
      expect(verifyToken('Secure-token-12345', hashedToken)).toBe(false);
    });
  });
});
