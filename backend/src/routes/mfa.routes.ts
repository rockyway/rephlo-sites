/**
 * Multi-Factor Authentication Routes
 *
 * Routes for MFA setup, verification, and management including:
 * - MFA setup (generate secret and QR code)
 * - MFA verification (enable after TOTP verification)
 * - MFA login verification (during authentication flow)
 * - MFA disable (with password confirmation)
 * - Backup code login (account recovery)
 * - MFA status check
 *
 * All endpoints require authentication except MFA login verification endpoints.
 * Rate limiting is applied to prevent brute force attacks.
 *
 * Reference: Plan 127, Task 4.3
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { createIPRateLimiter } from '../middleware/ratelimit.middleware';
import logger from '../utils/logger';
import { MFAService } from '../services/mfa.service';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const mfaService = new MFAService();

// Rate limiters
const setupLimiter = createIPRateLimiter(5); // 5 per hour
const verifyLimiter = createIPRateLimiter(10); // 10 per hour
const loginLimiter = createIPRateLimiter(20); // 20 per hour

/**
 * Create MFA router
 */
export function createMFARouter(): Router {
  const router = Router();

  logger.debug('MFA Router: Initializing MFA endpoints');

  // ===========================================================================
  // POST /auth/mfa/setup
  // Generate MFA secret and QR code for enrollment
  // Admin only - requires authentication
  // ===========================================================================

  router.post(
    '/setup',
    authMiddleware,
    requireAdmin,
    setupLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.sub;

      logger.info('MFA Setup: Generating MFA secret', { userId });

      // Check if MFA is already enabled
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true },
      });

      if (user?.mfaEnabled) {
        logger.warn('MFA Setup: MFA already enabled', { userId });
        return res.status(400).json({
          error: {
            code: 'MFA_ALREADY_ENABLED',
            message: 'MFA is already enabled for this account',
          },
        });
      }

      // Generate MFA secret, QR code, and backup codes
      const { secret, qrCode, backupCodes } = await mfaService.generateMFASecret(userId);

      // Store secret temporarily (MFA not yet enabled)
      await prisma.users.update({
        where: { id: userId },
        data: { mfaSecret: secret },
      });

      logger.info('MFA Setup: Secret generated successfully', { userId });

      // Return QR code and backup codes to user
      // User should save backup codes securely
      // Standard response format: flat data with optional metadata
      return res.status(200).json({
        status: 'success',
        data: {
          qrCode,
          backupCodes,
          secret, // For manual entry if QR code fails
        },
        meta: {
          message: 'MFA setup initiated. Scan QR code with authenticator app and verify.',
        },
      });
    })
  );

  // ===========================================================================
  // POST /auth/mfa/verify-setup
  // Verify TOTP token and enable MFA
  // Admin only - requires authentication
  // ===========================================================================

  router.post(
    '/verify-setup',
    authMiddleware,
    requireAdmin,
    verifyLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.sub;
      const { token, backupCodes } = req.body;

      if (!token || !Array.isArray(backupCodes) || backupCodes.length === 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'TOTP token and backup codes are required',
          },
        });
      }

      logger.info('MFA Verify Setup: Verifying TOTP token', { userId });

      // Get user's MFA secret
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { mfaSecret: true, mfaEnabled: true },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (!user.mfaSecret) {
        return res.status(400).json({
          error: {
            code: 'MFA_NOT_SETUP',
            message: 'MFA setup not initiated. Call /auth/mfa/setup first.',
          },
        });
      }

      if (user.mfaEnabled) {
        return res.status(400).json({
          error: {
            code: 'MFA_ALREADY_ENABLED',
            message: 'MFA is already enabled',
          },
        });
      }

      // Verify TOTP token
      const isValid = mfaService.verifyTOTP(user.mfaSecret, token);

      if (!isValid) {
        logger.warn('MFA Verify Setup: Invalid TOTP token', { userId });
        return res.status(400).json({
          error: {
            code: 'INVALID_MFA_TOKEN',
            message: 'Invalid MFA token. Please try again.',
          },
        });
      }

      // Hash backup codes for secure storage
      const hashedBackupCodes = await mfaService.hashBackupCodes(backupCodes);

      // Enable MFA and save backup codes (stored as JSON string)
      await prisma.users.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaBackupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      logger.info('MFA Verify Setup: MFA enabled successfully', { userId });

      // Standard response format: flat data with optional metadata
      return res.status(200).json({
        status: 'success',
        data: {
          success: true,
        },
        meta: {
          message: 'MFA enabled successfully',
        },
      });
    })
  );

  // ===========================================================================
  // POST /auth/mfa/verify-login
  // Verify MFA token during login (after password authentication)
  // Public endpoint - uses temporary session/JWT
  // ===========================================================================

  router.post(
    '/verify-login',
    loginLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'User ID and MFA token are required',
          },
        });
      }

      logger.info('MFA Login: Verifying MFA token for login', { userId });

      // Get user's MFA configuration
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          mfaEnabled: true,
          mfaSecret: true,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is inactive',
          },
        });
      }

      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({
          error: {
            code: 'MFA_NOT_ENABLED',
            message: 'MFA is not enabled for this account',
          },
        });
      }

      // Verify TOTP token
      const isValid = mfaService.verifyTOTP(user.mfaSecret, token);

      if (!isValid) {
        logger.warn('MFA Login: Invalid MFA token', { userId });
        return res.status(401).json({
          error: {
            code: 'INVALID_MFA_TOKEN',
            message: 'Invalid MFA token',
          },
        });
      }

      logger.info('MFA Login: MFA verification successful', { userId });

      // MFA verified - caller should issue final authentication tokens
      // Standard response format: flat data with optional metadata
      return res.status(200).json({
        status: 'success',
        data: {
          success: true,
          userId: user.id,
        },
        meta: {
          message: 'MFA verification successful',
        },
      });
    })
  );

  // ===========================================================================
  // POST /auth/mfa/disable
  // Disable MFA for account (requires password + MFA token)
  // Admin only - requires authentication
  // ===========================================================================

  router.post(
    '/disable',
    authMiddleware,
    requireAdmin,
    verifyLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.sub;
      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Password and MFA token are required',
          },
        });
      }

      logger.info('MFA Disable: Disabling MFA', { userId });

      // Get user data
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
          mfaEnabled: true,
          mfaSecret: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (!user.mfaEnabled) {
        return res.status(400).json({
          error: {
            code: 'MFA_NOT_ENABLED',
            message: 'MFA is not enabled',
          },
        });
      }

      // Verify password
      if (!user.passwordHash) {
        return res.status(400).json({
          error: {
            code: 'NO_PASSWORD',
            message: 'Account has no password (OAuth-only account)',
          },
        });
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);

      if (!passwordValid) {
        logger.warn('MFA Disable: Invalid password', { userId });
        return res.status(401).json({
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Invalid password',
          },
        });
      }

      // Verify MFA token
      if (!user.mfaSecret) {
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'MFA secret not found',
          },
        });
      }

      const isValid = mfaService.verifyTOTP(user.mfaSecret, token);

      if (!isValid) {
        logger.warn('MFA Disable: Invalid MFA token', { userId });
        return res.status(401).json({
          error: {
            code: 'INVALID_MFA_TOKEN',
            message: 'Invalid MFA token',
          },
        });
      }

      // Disable MFA and clear secrets
      await prisma.users.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: '',
        },
      });

      logger.info('MFA Disable: MFA disabled successfully', { userId });

      // Standard response format: flat data with optional metadata
      return res.status(200).json({
        status: 'success',
        data: {
          success: true,
        },
        meta: {
          message: 'MFA disabled successfully',
        },
      });
    })
  );

  // ===========================================================================
  // POST /auth/mfa/backup-code-login
  // Use backup code instead of TOTP for account recovery
  // Public endpoint
  // ===========================================================================

  router.post(
    '/backup-code-login',
    loginLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, backupCode } = req.body;

      if (!userId || !backupCode) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'User ID and backup code are required',
          },
        });
      }

      logger.info('MFA Backup Code Login: Attempting backup code login', { userId });

      // Get user's MFA configuration
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          mfaEnabled: true,
          mfaBackupCodes: true,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is inactive',
          },
        });
      }

      if (!user.mfaEnabled) {
        return res.status(400).json({
          error: {
            code: 'MFA_NOT_ENABLED',
            message: 'MFA is not enabled for this account',
          },
        });
      }

      // Parse backup codes from JSON string
      let backupCodeList: string[] = [];
      if (user.mfaBackupCodes) {
        try {
          backupCodeList = JSON.parse(user.mfaBackupCodes);
        } catch (e) {
          logger.error('MFA Backup Code Login: Failed to parse backup codes', { userId });
          return res.status(500).json({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to parse backup codes',
            },
          });
        }
      }

      if (!backupCodeList || backupCodeList.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_BACKUP_CODES',
            message: 'No backup codes available',
          },
        });
      }

      // Verify backup code
      const matchIndex = await mfaService.findMatchingBackupCodeIndex(
        backupCode,
        backupCodeList
      );

      if (matchIndex === -1) {
        logger.warn('MFA Backup Code Login: Invalid backup code', { userId });
        return res.status(401).json({
          error: {
            code: 'INVALID_BACKUP_CODE',
            message: 'Invalid backup code',
          },
        });
      }

      // Remove used backup code
      const updatedBackupCodes = backupCodeList.filter((_: string, index: number) => index !== matchIndex);

      await prisma.users.update({
        where: { id: userId },
        data: {
          mfaBackupCodes: JSON.stringify(updatedBackupCodes),
        },
      });

      logger.info('MFA Backup Code Login: Backup code verified', {
        userId,
        remainingCodes: updatedBackupCodes.length,
      });

      // Backup code verified - caller should issue final authentication tokens
      // Standard response format: flat data with optional metadata
      return res.status(200).json({
        status: 'success',
        data: {
          success: true,
          userId: user.id,
          remainingBackupCodes: updatedBackupCodes.length,
        },
        meta: {
          message: 'Backup code verified successfully',
        },
      });
    })
  );

  // ===========================================================================
  // GET /auth/mfa/status
  // Get MFA status for current user
  // Admin only - requires authentication
  // ===========================================================================

  router.get(
    '/status',
    authMiddleware,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.sub;

      logger.debug('MFA Status: Getting MFA status', { userId });

      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          mfaEnabled: true,
          mfaBackupCodes: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      // Parse backup codes from JSON string
      let backupCodesRemaining = 0;
      if (user.mfaBackupCodes) {
        try {
          const backupCodeList = JSON.parse(user.mfaBackupCodes);
          backupCodesRemaining = Array.isArray(backupCodeList) ? backupCodeList.length : 0;
        } catch (e) {
          logger.warn('MFA Status: Failed to parse backup codes', { userId });
        }
      }

      return res.status(200).json({
        mfaEnabled: user.mfaEnabled,
        backupCodesRemaining,
      });
    })
  );

  logger.debug('MFA Router: All endpoints initialized');

  return router;
}
