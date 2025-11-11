/**
 * MFA Service Unit Tests
 *
 * Tests for Multi-Factor Authentication service including:
 * - TOTP secret generation
 * - TOTP token verification
 * - Backup code generation and hashing
 * - Backup code verification
 * - Clock skew handling
 *
 * Reference: Plan 127, Task 4.5
 */

import { MFAService } from '../mfa.service';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';

describe('MFAService', () => {
  let mfaService: MFAService;

  beforeEach(() => {
    mfaService = new MFAService();
  });

  // ===========================================================================
  // TOTP Secret Generation Tests
  // ===========================================================================

  describe('generateMFASecret', () => {
    it('should generate valid TOTP secret', async () => {
      const userId = 'test-user-123';
      const result = await mfaService.generateMFASecret(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');

      // Secret should be base32 encoded (32 characters)
      expect(result.secret).toHaveLength(52);
      expect(result.secret).toMatch(/^[A-Z2-7]+$/);

      // QR code should be data URL
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);

      // Should have 10 backup codes
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should generate unique secrets for different users', async () => {
      const result1 = await mfaService.generateMFASecret('user-1');
      const result2 = await mfaService.generateMFASecret('user-2');

      expect(result1.secret).not.toBe(result2.secret);
      expect(result1.qrCode).not.toBe(result2.qrCode);
      expect(result1.backupCodes).not.toEqual(result2.backupCodes);
    });

    it('should generate backup codes with correct format', async () => {
      const result = await mfaService.generateMFASecret('user-test');

      result.backupCodes.forEach((code) => {
        // Should be 8 characters, uppercase hex
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-F0-9]+$/);
      });
    });
  });

  // ===========================================================================
  // TOTP Verification Tests
  // ===========================================================================

  describe('verifyTOTP', () => {
    it('should verify valid TOTP token', () => {
      // Generate a known secret
      const secret = 'JBSWY3DPEHPK3PXP';

      // Generate current TOTP token using speakeasy
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      // Verify token
      const isValid = mfaService.verifyTOTP(secret, token);

      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const invalidToken = '000000';

      const isValid = mfaService.verifyTOTP(secret, invalidToken);

      expect(isValid).toBe(false);
    });

    it('should reject expired TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';

      // Generate token for 2 minutes ago (outside ±1 window)
      const oldTimestamp = Date.now() - 2 * 60 * 1000;
      const oldToken = speakeasy.totp({
        secret,
        encoding: 'base32',
        time: Math.floor(oldTimestamp / 1000),
      });

      const isValid = mfaService.verifyTOTP(secret, oldToken);

      expect(isValid).toBe(false);
    });

    it('should accept TOTP token with clock skew (±1 window)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';

      // Generate token for 30 seconds ago (within ±1 window)
      const pastTimestamp = Date.now() - 30 * 1000;
      const pastToken = speakeasy.totp({
        secret,
        encoding: 'base32',
        time: Math.floor(pastTimestamp / 1000),
      });

      const isValid = mfaService.verifyTOTP(secret, pastToken);

      // Should be valid due to ±1 window tolerance
      expect(isValid).toBe(true);
    });

    it('should reject token with incorrect length', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const invalidToken = '12345'; // Only 5 digits

      const isValid = mfaService.verifyTOTP(secret, invalidToken);

      expect(isValid).toBe(false);
    });

    it('should reject non-numeric token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const invalidToken = 'ABCDEF';

      const isValid = mfaService.verifyTOTP(secret, invalidToken);

      expect(isValid).toBe(false);
    });
  });

  // ===========================================================================
  // Backup Code Generation Tests
  // ===========================================================================

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = mfaService.generateBackupCodes();

      expect(codes).toHaveLength(10);
    });

    it('should generate specified number of backup codes', () => {
      const codes = mfaService.generateBackupCodes(5);

      expect(codes).toHaveLength(5);
    });

    it('should generate codes with correct format', () => {
      const codes = mfaService.generateBackupCodes();

      codes.forEach((code) => {
        // Should be 8 characters, uppercase hex
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-F0-9]+$/);
      });
    });

    it('should generate unique backup codes', () => {
      const codes = mfaService.generateBackupCodes(10);

      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);
    });
  });

  // ===========================================================================
  // Backup Code Hashing Tests
  // ===========================================================================

  describe('hashBackupCode', () => {
    it('should hash backup code using bcrypt', async () => {
      const code = 'A3B5C7D9';
      const hash = await mfaService.hashBackupCode(code);

      // Should be bcrypt hash (starts with $2a$ or $2b$)
      expect(hash).toMatch(/^\$2[ab]\$/);

      // Hash should be different from original code
      expect(hash).not.toBe(code);
    });

    it('should generate different hashes for same code', async () => {
      const code = 'A3B5C7D9';
      const hash1 = await mfaService.hashBackupCode(code);
      const hash2 = await mfaService.hashBackupCode(code);

      // Hashes should be different due to random salt
      expect(hash1).not.toBe(hash2);

      // But both should verify against original code
      const verify1 = await bcrypt.compare(code, hash1);
      const verify2 = await bcrypt.compare(code, hash2);

      expect(verify1).toBe(true);
      expect(verify2).toBe(true);
    });
  });

  describe('hashBackupCodes', () => {
    it('should hash multiple backup codes', async () => {
      const codes = ['A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2'];
      const hashes = await mfaService.hashBackupCodes(codes);

      expect(hashes).toHaveLength(3);

      // All hashes should be bcrypt hashes
      hashes.forEach((hash) => {
        expect(hash).toMatch(/^\$2[ab]\$/);
      });

      // Verify each hash corresponds to original code
      for (let i = 0; i < codes.length; i++) {
        const isValid = await bcrypt.compare(codes[i], hashes[i]);
        expect(isValid).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Backup Code Verification Tests
  // ===========================================================================

  describe('verifyBackupCode', () => {
    it('should verify valid backup code', async () => {
      const code = 'A3B5C7D9';
      const hash = await bcrypt.hash(code, 10);

      const isValid = await mfaService.verifyBackupCode(code, [hash]);

      expect(isValid).toBe(true);
    });

    it('should verify code from array of hashes', async () => {
      const codes = ['CODE1111', 'CODE2222', 'CODE3333'];
      const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

      // Verify second code
      const isValid = await mfaService.verifyBackupCode('CODE2222', hashes);

      expect(isValid).toBe(true);
    });

    it('should reject invalid backup code', async () => {
      const code = 'A3B5C7D9';
      const hash = await bcrypt.hash(code, 10);

      const isValid = await mfaService.verifyBackupCode('WRONGCODE', [hash]);

      expect(isValid).toBe(false);
    });

    it('should return false for empty hash array', async () => {
      const isValid = await mfaService.verifyBackupCode('CODE1111', []);

      expect(isValid).toBe(false);
    });
  });

  describe('findMatchingBackupCodeIndex', () => {
    it('should find matching backup code index', async () => {
      const codes = ['CODE1111', 'CODE2222', 'CODE3333'];
      const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

      const index = await mfaService.findMatchingBackupCodeIndex('CODE2222', hashes);

      expect(index).toBe(1);
    });

    it('should return -1 for non-matching code', async () => {
      const codes = ['CODE1111', 'CODE2222', 'CODE3333'];
      const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));

      const index = await mfaService.findMatchingBackupCodeIndex('WRONGCODE', hashes);

      expect(index).toBe(-1);
    });

    it('should return -1 for empty hash array', async () => {
      const index = await mfaService.findMatchingBackupCodeIndex('CODE1111', []);

      expect(index).toBe(-1);
    });

    it('should find first matching code if duplicates exist', async () => {
      const code = 'CODE1111';
      const hashes = [
        await bcrypt.hash(code, 10),
        await bcrypt.hash('CODE2222', 10),
        await bcrypt.hash(code, 10), // Duplicate
      ];

      const index = await mfaService.findMatchingBackupCodeIndex(code, hashes);

      // Should return first match
      expect(index).toBe(0);
    });
  });
});
