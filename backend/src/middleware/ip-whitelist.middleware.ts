/**
 * IP Whitelist Middleware
 *
 * Enforces IP whitelist restrictions for Super Admin users.
 * Super Admins can only access admin endpoints from whitelisted IP addresses.
 *
 * Features:
 * - CIDR notation support (e.g., 192.168.1.0/24)
 * - IP address validation
 * - Automatic enforcement for users with 'super_admin' role
 * - Detailed logging for security audits
 *
 * Reference: Plan 119 (RBAC System), Plan 130 (Gap Closure)
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { IPWhitelistService } from '../services/ip-whitelist.service';
import logger from '../utils/logger';

/**
 * IP Whitelist Middleware
 *
 * Checks if the requesting user is a Super Admin and validates their IP
 * against the whitelist. Non-super-admin users are allowed through without checks.
 *
 * Usage:
 * ```typescript
 * router.post('/admin/sensitive-action',
 *   authMiddleware,
 *   requireAdmin,
 *   ipWhitelistMiddleware,
 *   controller.action
 * );
 * ```
 */
@injectable()
export class IPWhitelistMiddleware {
  constructor(
    @inject(IPWhitelistService) private ipWhitelistService: IPWhitelistService
  ) {
    logger.debug('IPWhitelistMiddleware: Initialized');
  }

  /**
   * Middleware handler function
   */
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract user from authenticated request
      const user = (req as any).user;

      // If no user or user is not authenticated, skip (auth middleware should catch this)
      if (!user || !user.id) {
        logger.warn('IPWhitelistMiddleware: No authenticated user found', {
          path: req.path,
          method: req.method,
        });
        return next();
      }

      // Only enforce IP whitelist for Super Admins
      // Other roles are not restricted
      if (user.role !== 'super_admin') {
        return next();
      }

      // Get client IP address
      const clientIp = this.getClientIp(req);

      if (!clientIp) {
        logger.error('IPWhitelistMiddleware: Unable to determine client IP', {
          userId: user.id,
          email: user.email,
          path: req.path,
          method: req.method,
        });

        res.status(403).json({
          error: {
            code: 'ip_determination_failed',
            message: 'Unable to determine your IP address for security verification',
          },
        });
        return;
      }

      // Check if IP is whitelisted
      const isWhitelisted = await this.ipWhitelistService.isIPWhitelisted(user.id, clientIp);

      if (!isWhitelisted) {
        logger.warn('IPWhitelistMiddleware: Access denied - IP not whitelisted', {
          userId: user.id,
          email: user.email,
          role: user.role,
          clientIp,
          path: req.path,
          method: req.method,
        });

        res.status(403).json({
          error: {
            code: 'ip_not_whitelisted',
            message:
              'Access denied. Your IP address is not whitelisted for Super Admin access. Please contact your administrator.',
            details: {
              clientIp,
              userId: user.id,
            },
          },
        });
        return;
      }

      // IP is whitelisted - allow through
      logger.debug('IPWhitelistMiddleware: IP whitelisted - access granted', {
        userId: user.id,
        email: user.email,
        clientIp,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error: any) {
      logger.error('IPWhitelistMiddleware: Error checking IP whitelist', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id,
        path: req.path,
        method: req.method,
      });

      // On error, deny access for security (fail closed)
      res.status(500).json({
        error: {
          code: 'ip_whitelist_check_failed',
          message: 'Security verification failed. Please try again or contact support.',
          details:
            process.env.NODE_ENV === 'development'
              ? { error: error.message }
              : undefined,
        },
      });
    }
  }

  /**
   * Extract client IP address from request
   * Handles proxied requests (X-Forwarded-For, X-Real-IP)
   */
  private getClientIp(req: Request): string | null {
    // Check X-Forwarded-For header (for proxied requests)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can be a comma-separated list: "client, proxy1, proxy2"
      // The leftmost IP is the original client
      const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',');
      const clientIp = ips[0].trim();
      if (clientIp) {
        return clientIp;
      }
    }

    // Check X-Real-IP header (some reverse proxies)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to req.ip (Express built-in)
    // Note: Express's req.ip is already trust-proxy aware
    if (req.ip) {
      return req.ip;
    }

    // Fallback to socket address
    if (req.socket && req.socket.remoteAddress) {
      return req.socket.remoteAddress;
    }

    // Unable to determine IP
    return null;
  }
}

/**
 * Factory function to create middleware instance
 * For use with DI container
 */
export function createIPWhitelistMiddleware(
  ipWhitelistService: IPWhitelistService
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const middleware = new IPWhitelistMiddleware(ipWhitelistService);
  return middleware.handle.bind(middleware);
}

/**
 * Express-compatible middleware function
 * Resolves IPWhitelistService from DI container
 */
export const ipWhitelistMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Dynamically import container to avoid circular dependencies
    const { container } = await import('../container');
    const service = container.resolve(IPWhitelistService);
    const middleware = new IPWhitelistMiddleware(service);
    await middleware.handle(req, res, next);
  } catch (error: any) {
    logger.error('ipWhitelistMiddleware: Failed to resolve service from container', {
      error: error.message,
    });

    res.status(500).json({
      error: {
        code: 'middleware_initialization_failed',
        message: 'Security middleware initialization failed',
      },
    });
  }
};

export default ipWhitelistMiddleware;
