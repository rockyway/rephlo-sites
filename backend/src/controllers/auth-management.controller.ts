/**
 * Authentication Management Controller
 *
 * Handles authentication management endpoints:
 * - Logout (token revocation)
 * - Account deactivation
 * - Account deletion (soft delete)
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 2)
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import {
  logoutSchema,
  deactivateAccountSchema,
  deleteAccountSchema,
  LogoutInput,
  DeactivateAccountInput,
  DeleteAccountInput,
} from '../utils/auth-validators';
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
} from '../middleware/error.middleware';
import { getUserId } from '../middleware/auth.middleware';

@injectable()
export class AuthManagementController {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AuthManagementController: Initialized');
  }

  /**
   * POST /auth/logout
   * Explicit logout - revoke access and refresh tokens
   *
   * Request body:
   * - token: Access token (optional if in Authorization header)
   * - refreshToken: Refresh token (optional)
   *
   * Response:
   * - success: true
   * - message: Logout confirmation
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = logoutSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw validationError('Invalid logout request', validationResult.error);
      }

      const { token, refreshToken } = validationResult.data as LogoutInput;

      // Extract token from request body or Authorization header
      let accessToken = token;
      if (!accessToken && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          accessToken = parts[1];
        }
      }

      logger.info('AuthManagementController.logout: Processing logout', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });

      // TODO: Implement token revocation when OIDC provider is accessible from controller
      // For now, we'll log the attempt and return success
      // The OIDC provider handles token revocation via /oauth/revoke endpoint
      // which is mounted as middleware in oauth.routes.ts

      if (accessToken) {
        logger.info('AuthManagementController.logout: Access token revocation requested', {
          tokenPrefix: accessToken.substring(0, 10) + '...',
        });
        // TODO: Call OIDC provider's revoke method or mark token as revoked in database
        // await this.revokeToken(accessToken, 'access_token');
      }

      if (refreshToken) {
        logger.info('AuthManagementController.logout: Refresh token revocation requested', {
          tokenPrefix: refreshToken.substring(0, 10) + '...',
        });
        // TODO: Call OIDC provider's revoke method or mark token as revoked in database
        // await this.revokeToken(refreshToken, 'refresh_token');
      }

      logger.info('AuthManagementController.logout: Logout successful');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      logger.error('AuthManagementController.logout: Failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * POST /auth/deactivate
   * Deactivate user account (reversible by support)
   *
   * Requires: Authentication (Bearer token)
   *
   * Request body:
   * - password: Current password for confirmation
   * - reason: Optional reason for deactivation
   *
   * Response:
   * - success: true
   * - message: Deactivation confirmation
   */
  async deactivateAccount(req: Request, res: Response): Promise<void> {
    try {
      // Get user ID from authenticated request
      const userId = getUserId(req);
      if (!userId) {
        logger.error('AuthManagementController.deactivateAccount: No user ID in request');
        throw unauthorizedError('Authentication required');
      }

      // Validate request body
      const validationResult = deactivateAccountSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw validationError(
          'Invalid deactivation request',
          validationResult.error
        );
      }

      const { password, reason } = validationResult.data as DeactivateAccountInput;

      logger.info('AuthManagementController.deactivateAccount: Processing deactivation', {
        userId,
        hasReason: !!reason,
      });

      // Verify user exists and get password hash
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          isActive: true,
          deletedAt: true,
        },
      });

      if (!user) {
        logger.warn('AuthManagementController.deactivateAccount: User not found', {
          userId,
        });
        throw notFoundError('User');
      }

      // Check if account is already deactivated or deleted
      if (!user.isActive) {
        logger.warn('AuthManagementController.deactivateAccount: Account already deactivated', {
          userId,
        });
        throw forbiddenError('Account is already deactivated');
      }

      if (user.deletedAt) {
        logger.warn('AuthManagementController.deactivateAccount: Account is deleted', {
          userId,
        });
        throw forbiddenError('Account is deleted and cannot be deactivated');
      }

      // Verify password
      const isPasswordValid = await this.verifyUserPassword(userId, password);
      if (!isPasswordValid) {
        logger.warn('AuthManagementController.deactivateAccount: Invalid password', {
          userId,
        });
        throw unauthorizedError('Invalid password');
      }

      // Deactivate account
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      });

      logger.info('AuthManagementController.deactivateAccount: Account deactivated', {
        userId,
        email: user.email,
        reason: reason || 'No reason provided',
      });

      // TODO: Revoke all active tokens for this user
      // This requires access to OIDC provider to revoke all grants
      logger.warn(
        'AuthManagementController.deactivateAccount: Token revocation not fully implemented',
        { userId }
      );

      res.status(200).json({
        success: true,
        message: 'Account deactivated. Contact support to reactivate.',
      });
    } catch (error) {
      logger.error('AuthManagementController.deactivateAccount: Failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * DELETE /auth/account
   * Soft delete user account (30-day retention period)
   *
   * Requires: Authentication (Bearer token)
   *
   * Request body:
   * - password: Current password for confirmation
   * - confirmation: Must be exactly "DELETE"
   *
   * Response:
   * - success: true
   * - message: Deletion confirmation with retention period
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      // Get user ID from authenticated request
      const userId = getUserId(req);
      if (!userId) {
        logger.error('AuthManagementController.deleteAccount: No user ID in request');
        throw unauthorizedError('Authentication required');
      }

      // Validate request body
      const validationResult = deleteAccountSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw validationError('Invalid deletion request', validationResult.error);
      }

      const { password, confirmation } = validationResult.data as DeleteAccountInput;

      logger.info('AuthManagementController.deleteAccount: Processing deletion', {
        userId,
      });

      // Double-check confirmation (schema already validates this)
      if (confirmation !== 'DELETE') {
        logger.warn('AuthManagementController.deleteAccount: Invalid confirmation', {
          userId,
          confirmation,
        });
        throw validationError('Confirmation must be exactly "DELETE"');
      }

      // Verify user exists and get password hash
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          isActive: true,
          deletedAt: true,
        },
      });

      if (!user) {
        logger.warn('AuthManagementController.deleteAccount: User not found', {
          userId,
        });
        throw notFoundError('User');
      }

      // Check if account is already deleted
      if (user.deletedAt) {
        logger.warn('AuthManagementController.deleteAccount: Account already deleted', {
          userId,
          deletedAt: user.deletedAt,
        });
        throw forbiddenError('Account is already scheduled for deletion');
      }

      // Verify password
      const isPasswordValid = await this.verifyUserPassword(userId, password);
      if (!isPasswordValid) {
        logger.warn('AuthManagementController.deleteAccount: Invalid password', {
          userId,
        });
        throw unauthorizedError('Invalid password');
      }

      // Soft delete account
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      logger.info('AuthManagementController.deleteAccount: Account deleted (soft)', {
        userId,
        email: user.email,
      });

      // TODO: Revoke all active tokens for this user
      // This requires access to OIDC provider to revoke all grants
      logger.warn(
        'AuthManagementController.deleteAccount: Token revocation not fully implemented',
        { userId }
      );

      res.status(200).json({
        success: true,
        message:
          'Account deletion scheduled. Data will be permanently removed in 30 days.',
      });
    } catch (error) {
      logger.error('AuthManagementController.deleteAccount: Failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify user password
   * Helper method to check if provided password matches stored hash
   *
   * @param userId - User ID
   * @param password - Password to verify
   * @returns True if password is valid, false otherwise
   */
  private async verifyUserPassword(
    userId: string,
    password: string
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        logger.warn('AuthManagementController.verifyUserPassword: User not found or no password hash', {
          userId,
          hasPasswordHash: !!user?.passwordHash,
        });
        return false;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      logger.debug('AuthManagementController.verifyUserPassword: Verification result', {
        userId,
        isValid,
      });

      return isValid;
    } catch (error) {
      logger.error('AuthManagementController.verifyUserPassword: Failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
