/**
 * Permission Cache Service
 *
 * Implements Redis-based caching for user permissions using cache-aside pattern
 * Part of Phase 3 - Permission Caching Layer (Plan 126/127)
 *
 * Features:
 * - Cache-aside pattern (check cache → query DB → update cache)
 * - 10-minute TTL for permission caching (longer than role cache since permissions change less frequently)
 * - Automatic cache invalidation on permission changes
 * - Error handling with fallback to database queries
 * - Metrics logging for cache hits/misses
 * - Support for future Plan 119 granular RBAC implementation
 *
 * Current Implementation:
 * - Simple role-based permissions (admin = all permissions, user = basic permissions)
 * - Future: Will integrate with Plan 119 permission tables
 *
 * Performance Impact:
 * - Reduces database load for permission lookups
 * - Prepares for granular RBAC with minimal performance overhead
 * - Improves scalability for permission-based authorization
 */

import { injectable, inject } from 'tsyringe';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

@injectable()
export class PermissionCacheService {
  private readonly DEFAULT_TTL = 600; // 10 minutes (600 seconds) - longer than role cache
  private readonly CACHE_KEY_PREFIX = 'user:';
  private readonly CACHE_KEY_SUFFIX_PERMISSIONS = ':permissions';
  private readonly CACHE_KEY_SUFFIX_PERMISSION_STATUS = ':permission_status';

  constructor(
    @inject('RedisConnection') private redis: Redis,
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    logger.debug('PermissionCacheService: Initialized');
  }

  /**
   * Get user permissions with caching
   * Cache-aside pattern: Check cache → Query DB → Update cache
   *
   * Current implementation: Simple role-based permissions
   * - admin role: ['*'] (wildcard for all permissions)
   * - user role: ['api.read'] (basic read permissions)
   *
   * Future (Plan 119): Will query RolePermission tables for granular permissions
   *
   * @param userId - User UUID
   * @returns Array of permission strings
   * @throws Error if user not found or Redis unavailable (falls back to DB)
   */
  async getPermissions(userId: string): Promise<string[]> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}${this.CACHE_KEY_SUFFIX_PERMISSIONS}`;

    try {
      // 1. Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const permissions = JSON.parse(cached);
        logger.debug(`PermissionCacheService: Cache HIT for user ${userId}`, {
          userId,
          permissionCount: permissions.length,
        });
        return permissions;
      }

      logger.debug(`PermissionCacheService: Cache MISS for user ${userId}`, {
        userId,
      });

      // 2. Query database
      // Current: Simple role-based permissions
      // Future: Query RolePermission tables (Plan 119)
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        logger.warn(`PermissionCacheService: User not found`, { userId });
        throw new Error('User not found');
      }

      // Convert role to permissions
      const permissions = this.roleToPermissions(user.role);

      // 3. Update cache
      await this.redis.setex(
        cacheKey,
        this.DEFAULT_TTL,
        JSON.stringify(permissions)
      );

      logger.debug(
        `PermissionCacheService: Cached permissions for user ${userId}`,
        {
          userId,
          role: user.role,
          permissionCount: permissions.length,
          ttl: this.DEFAULT_TTL,
        }
      );

      return permissions;
    } catch (error) {
      // If Redis is down, fall back to database query
      if (error instanceof Error && error.message !== 'User not found') {
        logger.error(
          `PermissionCacheService: Redis error, falling back to DB`,
          {
            userId,
            error: error.message,
          }
        );

        const user = await this.prisma.users.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        return this.roleToPermissions(user.role);
      }

      throw error;
    }
  }

  /**
   * Get user permissions and active status with caching
   * Optimized version that returns both permissions and isActive in one query
   *
   * This is useful for permission checks that also need to verify account status
   *
   * @param userId - User UUID
   * @returns Object containing permissions array and isActive status
   * @throws Error if user not found
   */
  async getPermissionAndStatus(
    userId: string
  ): Promise<{ permissions: string[]; isActive: boolean }> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}${this.CACHE_KEY_SUFFIX_PERMISSION_STATUS}`;

    try {
      // 1. Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        logger.debug(
          `PermissionCacheService: Cache HIT for user permission status ${userId}`,
          {
            userId,
            permissionCount: result.permissions.length,
            isActive: result.isActive,
          }
        );
        return result;
      }

      logger.debug(
        `PermissionCacheService: Cache MISS for user permission status ${userId}`,
        {
          userId,
        }
      );

      // 2. Query database
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { role: true, is_active: true },
      });

      if (!user) {
        logger.warn(`PermissionCacheService: User not found`, { userId });
        throw new Error('User not found');
      }

      const result = {
        permissions: this.roleToPermissions(user.role),
        isActive: user.is_active,
      };

      // 3. Update cache
      await this.redis.setex(
        cacheKey,
        this.DEFAULT_TTL,
        JSON.stringify(result)
      );

      logger.debug(
        `PermissionCacheService: Cached permissions and status for user ${userId}`,
        {
          userId,
          role: user.role,
          permissionCount: result.permissions.length,
          isActive: result.isActive,
          ttl: this.DEFAULT_TTL,
        }
      );

      return result;
    } catch (error) {
      // If Redis is down, fall back to database query
      if (error instanceof Error && error.message !== 'User not found') {
        logger.error(
          `PermissionCacheService: Redis error, falling back to DB`,
          {
            userId,
            error: error.message,
          }
        );

        const user = await this.prisma.users.findUnique({
          where: { id: userId },
          select: { role: true, is_active: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        return {
          permissions: this.roleToPermissions(user.role),
          isActive: user.is_active,
        };
      }

      throw error;
    }
  }

  /**
   * Convert role to permissions array
   *
   * Current implementation: Simple role-based mapping
   * - admin: ['*'] - wildcard for all permissions
   * - user: ['api.read'] - basic read-only permissions
   *
   * Future (Plan 119): Will query RolePermission table for granular permissions
   * Example future permissions:
   * - 'users.view', 'users.create', 'users.update', 'users.delete'
   * - 'models.view', 'models.manage'
   * - 'billing.view', 'billing.manage'
   * - 'analytics.view'
   * - 'audit.view'
   *
   * @param role - User role ('admin' or 'user')
   * @returns Array of permission strings
   */
  private roleToPermissions(role: string): string[] {
    // Current simple implementation
    if (role === 'admin') {
      return ['*']; // Wildcard: all permissions
    }

    // Default user permissions
    return ['api.read']; // Basic read-only access
  }

  /**
   * Invalidate user permissions cache
   * Call this when user permissions change (role change, permission grant/revoke)
   *
   * @param userId - User UUID
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKeyPermissions = `${this.CACHE_KEY_PREFIX}${userId}${this.CACHE_KEY_SUFFIX_PERMISSIONS}`;
    const cacheKeyStatus = `${this.CACHE_KEY_PREFIX}${userId}${this.CACHE_KEY_SUFFIX_PERMISSION_STATUS}`;

    try {
      const deleted = await this.redis.del(
        cacheKeyPermissions,
        cacheKeyStatus
      );

      logger.info(
        `PermissionCacheService: Invalidated permissions cache for user ${userId}`,
        {
          userId,
          keysDeleted: deleted,
        }
      );
    } catch (error) {
      // Log error but don't throw - cache invalidation failure shouldn't block operations
      logger.error(
        `PermissionCacheService: Failed to invalidate permissions cache`,
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Bulk invalidate all permissions caches
   * Useful when global permission configuration changes (e.g., role permissions updated)
   *
   * Future (Plan 119): Call this when RolePermission table is updated
   */
  async invalidateAllPermissions(): Promise<void> {
    try {
      const keys = await this.redis.keys(
        `${this.CACHE_KEY_PREFIX}*${this.CACHE_KEY_SUFFIX_PERMISSIONS}`
      );
      const statusKeys = await this.redis.keys(
        `${this.CACHE_KEY_PREFIX}*${this.CACHE_KEY_SUFFIX_PERMISSION_STATUS}`
      );

      const allKeys = [...keys, ...statusKeys];

      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        logger.info(
          `PermissionCacheService: Invalidated all permission caches`,
          {
            keysDeleted: allKeys.length,
          }
        );
      } else {
        logger.debug(
          `PermissionCacheService: No permission caches to invalidate`
        );
      }
    } catch (error) {
      logger.error(
        `PermissionCacheService: Failed to invalidate all permissions`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get cache statistics for monitoring
   * Useful for tracking cache performance and hit rates
   *
   * @returns Object containing cache statistics
   */
  async getCacheStats(): Promise<{
    connected: boolean;
    permissionKeyCount: number;
    memoryUsage: string;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.keys(
        `${this.CACHE_KEY_PREFIX}*${this.CACHE_KEY_SUFFIX_PERMISSIONS}`
      );
      const statusKeys = await this.redis.keys(
        `${this.CACHE_KEY_PREFIX}*${this.CACHE_KEY_SUFFIX_PERMISSION_STATUS}`
      );

      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        connected: this.redis.status === 'ready',
        permissionKeyCount: keys.length + statusKeys.length,
        memoryUsage,
      };
    } catch (error) {
      logger.error(
        `PermissionCacheService: Failed to get cache stats`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      return {
        connected: false,
        permissionKeyCount: 0,
        memoryUsage: 'unknown',
      };
    }
  }
}
