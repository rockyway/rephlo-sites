/**
 * Session Validator Middleware
 *
 * Validates OIDC sessions to ensure they reference valid, existing users.
 * This prevents errors when sessions reference deleted or non-existent accounts.
 *
 * CRITICAL: This middleware must run BEFORE oidc-provider middleware
 * to catch and clear invalid sessions before they cause errors.
 *
 * Implementation Strategy:
 * - Query the oidc_models table directly to find Session records
 * - Validate that the accountId in the session references an existing user
 * - Delete invalid sessions from the database
 * - Clear session cookies to force re-authentication
 */

import type { Request, Response, NextFunction } from 'express';
import type Provider from 'oidc-provider';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export function createSessionValidator(provider: Provider, prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only validate on routes that use OIDC sessions
      // Skip validation for non-OIDC routes like health checks, static assets, etc.
      const path = req.path;
      const shouldValidate =
        path.startsWith('/oauth/') ||
        path.startsWith('/interaction/');

      if (!shouldValidate) {
        return next();
      }

      // Look for active sessions in the database
      // Session kind = 'Session' in oidc_models table
      // The payload contains accountId if the session is authenticated
      const activeSessions = await prisma.oIDCModel.findMany({
        where: {
          kind: 'Session',
          // Only check sessions that haven't expired yet
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          payload: true,
        },
      });

      if (activeSessions.length === 0) {
        // No active sessions to validate
        return next();
      }

      logger.debug('SessionValidator: Checking active sessions', {
        count: activeSessions.length,
        path,
      });

      // Check each session and validate its accountId
      const invalidSessionIds: string[] = [];

      for (const session of activeSessions) {
        try {
          // Parse the session payload
          const payload = typeof session.payload === 'string'
            ? JSON.parse(session.payload)
            : session.payload;

          // Check if session has an accountId
          const accountId = payload?.accountId || payload?.account;

          if (!accountId) {
            // Session doesn't have an accountId yet (not logged in) - skip validation
            continue;
          }

          // Validate that the accountId references an existing, active user
          const user = await prisma.user.findUnique({
            where: { id: accountId },
            select: { id: true, isActive: true },
          });

          // If user doesn't exist or is inactive, mark session for deletion
          if (!user || !user.isActive) {
            logger.warn('SessionValidator: Invalid session found - user not found or inactive', {
              sessionId: session.id,
              accountId,
              userExists: !!user,
              userActive: user?.isActive,
            });
            invalidSessionIds.push(session.id);
          }
        } catch (parseError) {
          // If we can't parse the session payload, log and skip
          logger.error('SessionValidator: Failed to parse session payload', {
            sessionId: session.id,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
        }
      }

      // Delete invalid sessions from the database
      if (invalidSessionIds.length > 0) {
        try {
          const deleteResult = await prisma.oIDCModel.deleteMany({
            where: {
              id: {
                in: invalidSessionIds,
              },
              kind: 'Session',
            },
          });

          logger.info('SessionValidator: Deleted invalid sessions', {
            count: deleteResult.count,
            sessionIds: invalidSessionIds,
          });

          // Clear session cookies to force re-authentication
          // These are the default cookie names used by oidc-provider
          res.clearCookie('_session');
          res.clearCookie('_session.sig');
          res.clearCookie('_interaction');
          res.clearCookie('_interaction.sig');
          res.clearCookie('_grant');
          res.clearCookie('_grant.sig');

          // For authorization requests with invalid sessions, return error
          if (path === '/oauth/authorize' && req.method === 'GET') {
            logger.warn('SessionValidator: Blocking authorization request with invalid session', {
              path,
              query: req.query,
            });
            return res.status(401).json({
              error: 'invalid_session',
              error_description: 'Your session is invalid or has expired. Please sign in again.',
            });
          }
        } catch (deleteError) {
          logger.error('SessionValidator: Failed to delete invalid sessions', {
            sessionIds: invalidSessionIds,
            error: deleteError instanceof Error ? deleteError.message : String(deleteError),
          });
        }
      }

      next();
    } catch (error) {
      // Don't block the request if session validation fails
      // Just log the error and continue
      logger.error('SessionValidator: Unexpected error during session validation', {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next();
    }
  };
}
