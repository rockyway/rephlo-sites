/**
 * Idle Timeout Middleware
 *
 * Tracks user activity and invalidates sessions after period of inactivity
 * Part of Phase 5 - Admin Session Management (Plan 126/127)
 *
 * Features:
 * - Activity tracking on each request
 * - Idle timeout enforcement (15 minutes for admins, 24 hours for regular users)
 * - Automatic session invalidation on timeout
 * - HTTP 401 response with timeout reason
 * - Comprehensive logging for audit trail
 *
 * Security Benefits:
 * - Reduces attack window for abandoned sessions
 * - Prevents unauthorized access from unattended devices
 * - Enhances security for admin users
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../container';
import { SessionManagementService } from '../services/session-management.service';
import logger from '../utils/logger';

/**
 * Idle timeout durations (in milliseconds)
 */
const IDLE_TIMEOUT_ADMIN_MS = 15 * 60 * 1000; // 15 minutes for admin users
const IDLE_TIMEOUT_USER_MS = 24 * 60 * 60 * 1000; // 24 hours for regular users

/**
 * Middleware to track user activity on each request
 * Updates last activity timestamp in session metadata
 *
 * Usage: Apply to all protected routes
 * Example: router.use(authMiddleware, trackActivity)
 */
export async function trackActivity(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    // Skip if no authenticated user
    if (!req.user) {
      return next();
    }

    // Get session ID from request (could be from JWT, cookie, or header)
    const sessionId = getSessionId(req);

    if (!sessionId) {
      logger.debug('trackActivity: No session ID found, skipping activity tracking', {
        userId: req.user.sub,
        path: req.path,
      });
      return next();
    }

    // Update session activity timestamp
    const sessionManagementService = container.resolve(SessionManagementService);
    const updated = await sessionManagementService.updateSessionActivity(sessionId);

    if (updated) {
      logger.debug('trackActivity: Session activity updated', {
        sessionId,
        userId: req.user.sub,
        path: req.path,
      });
    }

    next();
  } catch (error) {
    // Log error but don't block request - activity tracking failures shouldn't impact user experience
    logger.error('trackActivity: Failed to track activity', {
      userId: req.user?.sub,
      path: req.path,
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}

/**
 * Middleware to enforce idle timeout
 * Checks if user has been inactive for too long and invalidates session if needed
 *
 * Usage: Apply to all protected routes after trackActivity
 * Example: router.use(authMiddleware, trackActivity, enforceIdleTimeout)
 */
export async function enforceIdleTimeout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    // Skip if no authenticated user
    if (!req.user) {
      return next();
    }

    // Get session ID from request
    const sessionId = getSessionId(req);

    if (!sessionId) {
      logger.debug('enforceIdleTimeout: No session ID found, skipping idle timeout check', {
        userId: req.user.sub,
        path: req.path,
      });
      return next();
    }

    // Get session metadata
    const sessionManagementService = container.resolve(SessionManagementService);
    const session = await sessionManagementService.getActiveSession(sessionId);

    if (!session) {
      logger.warn('enforceIdleTimeout: Session not found or expired', {
        sessionId,
        userId: req.user.sub,
      });

      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        },
      });
    }

    // Determine idle timeout based on user role
    const idleTimeoutMs =
      session.userRole === 'admin' ? IDLE_TIMEOUT_ADMIN_MS : IDLE_TIMEOUT_USER_MS;

    // Calculate idle duration
    const now = Date.now();
    const idleDurationMs = now - session.lastActivityAt;

    // Check if session has been idle too long
    if (idleDurationMs > idleTimeoutMs) {
      logger.warn('enforceIdleTimeout: Session idle timeout exceeded', {
        sessionId,
        userId: req.user.sub,
        userRole: session.userRole,
        idleDurationMs,
        idleTimeoutMs,
        idleDurationMinutes: Math.round(idleDurationMs / 60000),
        idleTimeoutMinutes: Math.round(idleTimeoutMs / 60000),
        lastActivityAt: new Date(session.lastActivityAt).toISOString(),
      });

      // Invalidate session
      await sessionManagementService.invalidateSession(sessionId);

      return res.status(401).json({
        error: {
          code: 'SESSION_IDLE_TIMEOUT',
          message: `Your session has expired due to inactivity. Admin sessions expire after ${Math.round(IDLE_TIMEOUT_ADMIN_MS / 60000)} minutes of inactivity.`,
          idleTimeoutMinutes: Math.round(idleTimeoutMs / 60000),
        },
      });
    }

    // Session is still active, continue
    logger.debug('enforceIdleTimeout: Session is active', {
      sessionId,
      userId: req.user.sub,
      userRole: session.userRole,
      idleDurationMinutes: Math.round(idleDurationMs / 60000),
      idleTimeoutMinutes: Math.round(idleTimeoutMs / 60000),
    });

    next();
  } catch (error) {
    logger.error('enforceIdleTimeout: Failed to enforce idle timeout', {
      userId: req.user?.sub,
      path: req.path,
      error: error instanceof Error ? error.message : String(error),
    });

    // On error, allow request to proceed (fail open) but log the issue
    // This prevents denial of service if Redis is temporarily unavailable
    next();
  }
}

/**
 * Combined middleware: Track activity and enforce idle timeout
 * Convenience function to apply both middlewares at once
 *
 * Usage: Apply to all protected routes
 * Example: router.use(authMiddleware, idleTimeoutMiddleware)
 */
export async function idleTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  await trackActivity(req, res, async (error?: any) => {
    if (error) {
      return next(error);
    }

    await enforceIdleTimeout(req, res, next);
  });
}

/**
 * Extract session ID from request
 * Checks multiple sources: JWT claims, cookies, headers
 *
 * @param req - Express request object
 * @returns Session ID or null if not found
 */
function getSessionId(req: Request): string | null {
  // Option 1: From JWT claims (if OIDC provider includes session ID)
  if (req.user && (req.user as any).session_id) {
    return (req.user as any).session_id;
  }

  // Option 2: From custom header
  const headerSessionId = req.headers['x-session-id'] as string;
  if (headerSessionId) {
    return headerSessionId;
  }

  // Option 3: From cookie
  const cookieSessionId = req.cookies?.['session_id'];
  if (cookieSessionId) {
    return cookieSessionId;
  }

  // Option 4: Generate session ID from user ID and token issued time (fallback)
  // This allows idle timeout to work even if session ID is not explicitly tracked
  if (req.user?.sub && req.user?.iat) {
    return `${req.user.sub}:${req.user.iat}`;
  }

  return null;
}

/**
 * Helper function to get idle timeout duration for a role
 *
 * @param role - User role ('admin' or 'user')
 * @returns Idle timeout in milliseconds
 */
export function getIdleTimeoutMs(role: string): number {
  return role === 'admin' ? IDLE_TIMEOUT_ADMIN_MS : IDLE_TIMEOUT_USER_MS;
}

/**
 * Helper function to get idle timeout duration in minutes
 *
 * @param role - User role ('admin' or 'user')
 * @returns Idle timeout in minutes
 */
export function getIdleTimeoutMinutes(role: string): number {
  return Math.round(getIdleTimeoutMs(role) / 60000);
}
