/**
 * Require MFA Middleware
 *
 * Middleware for protecting routes that require Multi-Factor Authentication.
 * Verifies that:
 * 1. User has MFA enabled
 * 2. MFA token (TOTP or backup code) is present and valid
 *
 * Usage:
 *   router.post('/admin/sensitive-operation',
 *     authMiddleware,
 *     requireAdmin,
 *     requireMFA,
 *     handler
 *   );
 *
 * MFA Token can be provided via:
 * - Request body: { mfaToken: "123456" }
 * - Request header: X-MFA-Token: 123456
 *
 * Reference: Plan 127, Task 4.4
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { MFAService } from '../services/mfa.service';
import { unauthorizedError, forbiddenError } from './error.middleware';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const mfaService = new MFAService();

/**
 * Middleware to require MFA verification for protected routes
 *
 * Checks if user has MFA enabled and validates the MFA token.
 * Supports both TOTP tokens and backup codes.
 *
 * @returns Express middleware function
 */
export function requireMFA(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // User must be authenticated
  if (!req.user) {
    logger.warn('requireMFA: User not authenticated');
    return next(unauthorizedError('Authentication required'));
  }

  const userId = req.user.sub;

  // Get MFA token from request body or header
  const mfaToken =
    (req.body?.mfaToken as string) ||
    (req.headers['x-mfa-token'] as string);

  if (!mfaToken) {
    logger.warn('requireMFA: MFA token missing', { userId });
    return next(
      forbiddenError(
        'MFA token required. Provide via mfaToken in request body or X-MFA-Token header.'
      )
    );
  }

  // Check user's MFA status
  prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
        mfaBackupCodes: true,
      },
    })
    .then(async (user) => {
      if (!user) {
        logger.error('requireMFA: User not found', { userId });
        return next(unauthorizedError('User not found'));
      }

      if (!user.mfaEnabled) {
        logger.warn('requireMFA: MFA not enabled for user', { userId });
        return next(
          forbiddenError(
            'MFA is not enabled for this account. Please enable MFA first.'
          )
        );
      }

      if (!user.mfaSecret) {
        logger.error('requireMFA: MFA enabled but secret missing', { userId });
        return next(forbiddenError('MFA configuration error'));
      }

      // Try TOTP verification first
      const totpValid = mfaService.verifyTOTP(user.mfaSecret, mfaToken);

      if (totpValid) {
        logger.info('requireMFA: TOTP verified successfully', { userId });
        return next();
      }

      // Try backup code verification
      if (user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
        const backupCodeIndex = await mfaService.findMatchingBackupCodeIndex(
          mfaToken,
          user.mfaBackupCodes
        );

        if (backupCodeIndex !== -1) {
          // Remove used backup code
          const updatedBackupCodes = user.mfaBackupCodes.filter(
            (_: string, index: number) => index !== backupCodeIndex
          );

          await prisma.user.update({
            where: { id: userId },
            data: { mfaBackupCodes: updatedBackupCodes },
          });

          logger.info('requireMFA: Backup code verified successfully', {
            userId,
            remainingBackupCodes: updatedBackupCodes.length,
          });

          return next();
        }
      }

      // Neither TOTP nor backup code valid
      logger.warn('requireMFA: Invalid MFA token', { userId });
      return next(forbiddenError('Invalid MFA token'));
    })
    .catch((error) => {
      logger.error('requireMFA: Database error', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return next(forbiddenError('MFA verification failed'));
    });
}

/**
 * Middleware factory: Require MFA only for admin users
 *
 * Non-admin users can proceed without MFA.
 * Admin users must provide valid MFA token.
 *
 * @returns Express middleware function
 */
export function requireMFAForAdmins(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // User must be authenticated
  if (!req.user) {
    logger.warn('requireMFAForAdmins: User not authenticated');
    return next(unauthorizedError('Authentication required'));
  }

  const userId = req.user.sub;

  // Check if user is admin
  prisma.user
    .findUnique({
      where: { id: userId },
      select: { role: true, mfaEnabled: true },
    })
    .then((user) => {
      if (!user) {
        logger.error('requireMFAForAdmins: User not found', { userId });
        return next(unauthorizedError('User not found'));
      }

      // If not admin, allow without MFA
      if (user.role !== 'admin') {
        logger.debug('requireMFAForAdmins: User is not admin, skipping MFA check', { userId });
        return next();
      }

      // Admin user - check if MFA is enabled
      if (!user.mfaEnabled) {
        logger.warn('requireMFAForAdmins: Admin MFA not enabled', { userId });
        return next(
          forbiddenError(
            'Admin users must enable MFA. Please set up MFA at /auth/mfa/setup'
          )
        );
      }

      // Admin user with MFA enabled - require MFA token
      return requireMFA(req, res, next);
    })
    .catch((error) => {
      logger.error('requireMFAForAdmins: Database error', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return next(forbiddenError('MFA verification failed'));
    });
}
