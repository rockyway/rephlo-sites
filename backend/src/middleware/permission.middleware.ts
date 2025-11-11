/**
 * Permission Middleware Framework
 *
 * Provides flexible permission-checking middleware for future RBAC implementation
 * Part of Phase 3 - Permission Caching Layer (Plan 126/127)
 *
 * Features:
 * - requirePermission(permission) - Single permission check
 * - requireAnyPermission(permissions[]) - OR logic for multiple permissions
 * - requireAllPermissions(permissions[]) - AND logic for multiple permissions
 * - Three-tier caching architecture: JWT claims → Redis cache → Database
 * - Support for wildcard permissions ('*' grants all permissions)
 * - Comprehensive error handling and logging
 *
 * Current Implementation:
 * - Admin role has wildcard permission '*'
 * - Regular users have basic 'api.read' permission
 * - Future: Will integrate with Plan 119 granular permission tables
 *
 * Usage Examples:
 *   // Single permission
 *   router.get('/admin/users', authMiddleware, requirePermission('users.view'), handler);
 *
 *   // Any permission (OR logic)
 *   router.get('/admin/analytics', authMiddleware, requireAnyPermission(['analytics.view', 'admin.all']), handler);
 *
 *   // All permissions (AND logic)
 *   router.delete('/admin/users/:id', authMiddleware, requireAllPermissions(['users.delete', 'users.view']), handler);
 *
 * Performance:
 * - JWT claim check: ~0ms (in-memory)
 * - Redis cache: ~2-5ms
 * - Database fallback: ~15-20ms
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { unauthorizedError, forbiddenError } from './error.middleware';

/**
 * Middleware factory: Require specific permission
 *
 * Checks if the authenticated user has the specified permission.
 * Supports wildcard permission '*' which grants access to all permissions.
 *
 * Three-tier architecture:
 * 1. Check JWT claims for permissions (fastest - 0ms)
 * 2. Use PermissionCacheService (Redis cache - 2-5ms)
 * 3. Fall back to database query (15-20ms)
 *
 * @param permission - Permission string (e.g., 'users.view', 'models.manage')
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/users', authMiddleware, requirePermission('users.view'), handler);
 */
export function requirePermission(permission: string) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      logger.error('requirePermission called before authMiddleware');
      return next(unauthorizedError('Authentication required'));
    }

    logger.debug(`requirePermission: Checking permission '${permission}'`, {
      userId: req.user.sub,
      permission,
    });

    try {
      // TIER 1: Check JWT claims for permissions (if available)
      // Future: When admin scope includes permissions in JWT
      if (req.user.permissions && Array.isArray(req.user.permissions)) {
        logger.debug('requirePermission: Using permissions from JWT claim', {
          userId: req.user.sub,
          permissions: req.user.permissions,
          optimizationTier: 1,
        });

        if (hasPermission(req.user.permissions, permission)) {
          return next();
        } else {
          logger.warn('requirePermission: Permission denied (from JWT)', {
            userId: req.user.sub,
            required: permission,
            userPermissions: req.user.permissions,
          });
          return next(forbiddenError(`Permission required: ${permission}`));
        }
      }

      // TIER 2 & 3: Fall back to PermissionCacheService (Redis) or DB
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { container } = require('../container');
      const { PermissionCacheService } = await import(
        '../services/permission-cache.service'
      );

      const permissionCacheService = container.resolve(
        PermissionCacheService
      );
      const result =
        await permissionCacheService.getPermissionAndStatus(req.user.sub);

      logger.debug(
        'requirePermission: Permissions retrieved from cache/DB',
        {
          userId: req.user.sub,
          permissions: result.permissions,
          isActive: result.isActive,
          optimizationTier: 2,
        }
      );

      // Check if account is active
      if (!result.isActive) {
        logger.warn('requirePermission: Account inactive', {
          userId: req.user.sub,
        });
        return next(forbiddenError('Account is inactive'));
      }

      // Check permission
      if (hasPermission(result.permissions, permission)) {
        return next();
      } else {
        logger.warn('requirePermission: Permission denied', {
          userId: req.user.sub,
          required: permission,
          userPermissions: result.permissions,
        });
        return next(forbiddenError(`Permission required: ${permission}`));
      }
    } catch (error) {
      logger.error('requirePermission: Error checking permission', {
        userId: req.user.sub,
        permission,
        error: error instanceof Error ? error.message : String(error),
      });
      return next(error);
    }
  };
}

/**
 * Middleware factory: Require ANY of the specified permissions (OR logic)
 *
 * User needs at least ONE of the specified permissions to proceed.
 * Useful for endpoints accessible by multiple roles.
 *
 * @param permissions - Array of permission strings
 * @returns Express middleware function
 *
 * @example
 * // User needs either 'analytics.view' OR 'admin.all'
 * router.get('/admin/analytics',
 *   authMiddleware,
 *   requireAnyPermission(['analytics.view', 'admin.all']),
 *   handler
 * );
 */
export function requireAnyPermission(permissions: string[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      logger.error('requireAnyPermission called before authMiddleware');
      return next(unauthorizedError('Authentication required'));
    }

    logger.debug(
      `requireAnyPermission: Checking for any of ${permissions.length} permissions`,
      {
        userId: req.user.sub,
        requiredPermissions: permissions,
      }
    );

    try {
      // TIER 1: Check JWT claims
      if (req.user.permissions && Array.isArray(req.user.permissions)) {
        logger.debug('requireAnyPermission: Using permissions from JWT claim', {
          userId: req.user.sub,
          permissions: req.user.permissions,
          optimizationTier: 1,
        });

        if (hasAnyPermission(req.user.permissions, permissions)) {
          return next();
        } else {
          logger.warn('requireAnyPermission: No matching permissions (from JWT)', {
            userId: req.user.sub,
            required: permissions,
            userPermissions: req.user.permissions,
          });
          return next(
            forbiddenError(
              `One of these permissions required: ${permissions.join(', ')}`
            )
          );
        }
      }

      // TIER 2 & 3: Fall back to cache/DB
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { container } = require('../container');
      const { PermissionCacheService } = await import(
        '../services/permission-cache.service'
      );

      const permissionCacheService = container.resolve(
        PermissionCacheService
      );
      const result =
        await permissionCacheService.getPermissionAndStatus(req.user.sub);

      logger.debug(
        'requireAnyPermission: Permissions retrieved from cache/DB',
        {
          userId: req.user.sub,
          permissions: result.permissions,
          isActive: result.isActive,
          optimizationTier: 2,
        }
      );

      if (!result.isActive) {
        logger.warn('requireAnyPermission: Account inactive', {
          userId: req.user.sub,
        });
        return next(forbiddenError('Account is inactive'));
      }

      if (hasAnyPermission(result.permissions, permissions)) {
        return next();
      } else {
        logger.warn('requireAnyPermission: No matching permissions', {
          userId: req.user.sub,
          required: permissions,
          userPermissions: result.permissions,
        });
        return next(
          forbiddenError(
            `One of these permissions required: ${permissions.join(', ')}`
          )
        );
      }
    } catch (error) {
      logger.error('requireAnyPermission: Error checking permissions', {
        userId: req.user.sub,
        permissions,
        error: error instanceof Error ? error.message : String(error),
      });
      return next(error);
    }
  };
}

/**
 * Middleware factory: Require ALL of the specified permissions (AND logic)
 *
 * User needs ALL of the specified permissions to proceed.
 * Useful for high-privilege operations requiring multiple permissions.
 *
 * @param permissions - Array of permission strings
 * @returns Express middleware function
 *
 * @example
 * // User needs both 'users.delete' AND 'users.view'
 * router.delete('/admin/users/:id',
 *   authMiddleware,
 *   requireAllPermissions(['users.delete', 'users.view']),
 *   handler
 * );
 */
export function requireAllPermissions(permissions: string[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      logger.error('requireAllPermissions called before authMiddleware');
      return next(unauthorizedError('Authentication required'));
    }

    logger.debug(
      `requireAllPermissions: Checking for all ${permissions.length} permissions`,
      {
        userId: req.user.sub,
        requiredPermissions: permissions,
      }
    );

    try {
      // TIER 1: Check JWT claims
      if (req.user.permissions && Array.isArray(req.user.permissions)) {
        logger.debug(
          'requireAllPermissions: Using permissions from JWT claim',
          {
            userId: req.user.sub,
            permissions: req.user.permissions,
            optimizationTier: 1,
          }
        );

        if (hasAllPermissions(req.user.permissions, permissions)) {
          return next();
        } else {
          const missing = getMissingPermissions(
            req.user.permissions,
            permissions
          );
          logger.warn(
            'requireAllPermissions: Missing permissions (from JWT)',
            {
              userId: req.user.sub,
              required: permissions,
              missing,
              userPermissions: req.user.permissions,
            }
          );
          return next(
            forbiddenError(
              `All of these permissions required: ${permissions.join(', ')}`
            )
          );
        }
      }

      // TIER 2 & 3: Fall back to cache/DB
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { container } = require('../container');
      const { PermissionCacheService } = await import(
        '../services/permission-cache.service'
      );

      const permissionCacheService = container.resolve(
        PermissionCacheService
      );
      const result =
        await permissionCacheService.getPermissionAndStatus(req.user.sub);

      logger.debug(
        'requireAllPermissions: Permissions retrieved from cache/DB',
        {
          userId: req.user.sub,
          permissions: result.permissions,
          isActive: result.isActive,
          optimizationTier: 2,
        }
      );

      if (!result.isActive) {
        logger.warn('requireAllPermissions: Account inactive', {
          userId: req.user.sub,
        });
        return next(forbiddenError('Account is inactive'));
      }

      if (hasAllPermissions(result.permissions, permissions)) {
        return next();
      } else {
        const missing = getMissingPermissions(
          result.permissions,
          permissions
        );
        logger.warn('requireAllPermissions: Missing permissions', {
          userId: req.user.sub,
          required: permissions,
          missing,
          userPermissions: result.permissions,
        });
        return next(
          forbiddenError(
            `All of these permissions required: ${permissions.join(', ')}`
          )
        );
      }
    } catch (error) {
      logger.error('requireAllPermissions: Error checking permissions', {
        userId: req.user.sub,
        permissions,
        error: error instanceof Error ? error.message : String(error),
      });
      return next(error);
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has a specific permission
 * Supports wildcard permission '*' which grants all permissions
 *
 * @param userPermissions - Array of user's permissions
 * @param requiredPermission - Required permission string
 * @returns true if user has permission
 */
function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    logger.debug('hasPermission: Wildcard permission grants access', {
      required: requiredPermission,
    });
    return true;
  }

  // Check for exact match
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has ANY of the specified permissions (OR logic)
 *
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of required permissions
 * @returns true if user has at least one permission
 */
function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    logger.debug('hasAnyPermission: Wildcard permission grants access');
    return true;
  }

  // Check if user has at least one required permission
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Check if user has ALL of the specified permissions (AND logic)
 *
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of required permissions
 * @returns true if user has all permissions
 */
function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    logger.debug('hasAllPermissions: Wildcard permission grants access');
    return true;
  }

  // Check if user has all required permissions
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Get list of missing permissions
 * Used for detailed error messages
 *
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of required permissions
 * @returns Array of missing permissions
 */
function getMissingPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): string[] {
  // Wildcard grants all permissions
  if (userPermissions.includes('*')) {
    return [];
  }

  return requiredPermissions.filter(
    (permission) => !userPermissions.includes(permission)
  );
}
