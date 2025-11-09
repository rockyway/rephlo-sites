/**
 * Multi-Factor Authentication Service
 *
 * Provides TOTP (Time-based One-Time Password) functionality for MFA:
 * - TOTP secret generation with QR codes
 * - TOTP token verification with clock skew tolerance
 * - Backup code generation and verification
 * - Secure hashing of backup codes
 *
 * Implements RFC 6238 (TOTP) with 30-second time windows and ±1 window tolerance
 * for clock skew.
 *
 * Reference: Plan 127, Task 4.2
 */

import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import logger from '../utils/logger';

export interface MFASecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export class MFAService {
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;
  private readonly BCRYPT_ROUNDS = 10;
  private readonly TOTP_WINDOW = 1; // ±1 window (30 seconds before/after)

  /**
   * Generate MFA secret and QR code for TOTP enrollment
   *
   * @param userId - User ID for QR code labeling
   * @returns Object containing base32 secret, QR code DataURL, and backup codes
   */
  async generateMFASecret(userId: string): Promise<MFASecret> {
    try {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `Rephlo (${userId})`,
        issuer: 'Rephlo',
        length: 32, // 32 bytes = 256 bits
      });

      if (!secret.otpauth_url) {
        throw new Error('Failed to generate OTP auth URL');
      }

      // Generate QR code as DataURL
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(this.BACKUP_CODE_COUNT);

      logger.info('MFAService: Generated MFA secret', {
        userId,
        backupCodesCount: backupCodes.length,
      });

      return {
        secret: secret.base32,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      logger.error('MFAService: Failed to generate MFA secret', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify TOTP token against secret
   *
   * Supports ±1 window (30 seconds before/after current time) for clock skew tolerance
   *
   * @param secret - Base32 encoded TOTP secret
   * @param token - 6-digit TOTP token from authenticator app
   * @returns true if token is valid, false otherwise
   */
  verifyTOTP(secret: string, token: string): boolean {
    try {
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: this.TOTP_WINDOW, // Allow ±1 step (30s before/after)
      });

      logger.debug('MFAService: TOTP verification', {
        isValid,
        tokenLength: token.length,
      });

      return isValid;
    } catch (error) {
      logger.error('MFAService: TOTP verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Generate array of random backup codes
   *
   * Backup codes are 8-character hexadecimal strings (uppercase)
   * Example: "A3B5C7D9"
   *
   * @param count - Number of backup codes to generate
   * @returns Array of backup codes
   */
  generateBackupCodes(count: number = this.BACKUP_CODE_COUNT): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = randomBytes(this.BACKUP_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase();
      codes.push(code);
    }

    logger.debug('MFAService: Generated backup codes', {
      count: codes.length,
    });

    return codes;
  }

  /**
   * Hash a backup code for secure storage
   *
   * Uses bcrypt with 10 rounds for one-way hashing
   *
   * @param code - Plain text backup code
   * @returns Hashed backup code
   */
  async hashBackupCode(code: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(code, this.BCRYPT_ROUNDS);

      logger.debug('MFAService: Backup code hashed');

      return hash;
    } catch (error) {
      logger.error('MFAService: Failed to hash backup code', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Hash multiple backup codes
   *
   * @param codes - Array of plain text backup codes
   * @returns Array of hashed backup codes
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    try {
      const hashes = await Promise.all(codes.map(code => this.hashBackupCode(code)));

      logger.debug('MFAService: Hashed multiple backup codes', {
        count: hashes.length,
      });

      return hashes;
    } catch (error) {
      logger.error('MFAService: Failed to hash backup codes', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify backup code against array of hashed codes
   *
   * @param code - Plain text backup code
   * @param hashes - Array of hashed backup codes
   * @returns true if code matches any hash, false otherwise
   */
  async verifyBackupCode(code: string, hashes: string[]): Promise<boolean> {
    try {
      // Check each hash
      for (const hash of hashes) {
        const isMatch = await bcrypt.compare(code, hash);
        if (isMatch) {
          logger.debug('MFAService: Backup code verified');
          return true;
        }
      }

      logger.debug('MFAService: Backup code not found');
      return false;
    } catch (error) {
      logger.error('MFAService: Backup code verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Find which hashed backup code matches the provided plain text code
   *
   * @param code - Plain text backup code
   * @param hashes - Array of hashed backup codes
   * @returns Index of matching hash, or -1 if not found
   */
  async findMatchingBackupCodeIndex(
    code: string,
    hashes: string[]
  ): Promise<number> {
    try {
      for (let i = 0; i < hashes.length; i++) {
        const isMatch = await bcrypt.compare(code, hashes[i]);
        if (isMatch) {
          logger.debug('MFAService: Found matching backup code', { index: i });
          return i;
        }
      }

      logger.debug('MFAService: No matching backup code found');
      return -1;
    } catch (error) {
      logger.error('MFAService: Failed to find matching backup code', {
        error: error instanceof Error ? error.message : String(error),
      });
      return -1;
    }
  }
}
