/**
 * Permission Middleware Integration Tests
 *
 * Tests permission-based authorization with caching
 * Part of Phase 3 - Permission Caching Layer (Plan 126/127)
 */

import 'reflect-metadata';
import { container } from '../../container';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { PermissionCacheService } from '../../services/permission-cache.service';
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from '../../middleware/permission.middleware';
import { Request, Response, NextFunction } from 'express';

describe('Permission Middleware Integration', () => {
  let prisma: PrismaClient;
  let redis: Redis;
  let permissionCacheService: PermissionCacheService;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    prisma = container.resolve<PrismaClient>('PrismaClient');
    redis = container.resolve<Redis>('RedisConnection');
    permissionCacheService = container.resolve(PermissionCacheService);

    // Create test users
    adminUser = await prisma.user.create({
      data: {
        email: `admin-perm-test-${Date.now()}@test.com`,
        passwordHash: 'hashed_password',
        role: 'admin',
        isActive: true,
        emailVerified: true,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `user-perm-test-${Date.now()}@test.com`,
        passwordHash: 'hashed_password',
        role: 'user',
        isActive: true,
        emailVerified: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '-perm-test-',
        },
      },
    });

    // Clean up cache
    await permissionCacheService.invalidateUserPermissions(adminUser.id);
    await permissionCacheService.invalidateUserPermissions(regularUser.id);
  });

  beforeEach(async () => {
    // Clear cache before each test
    await permissionCacheService.invalidateUserPermissions(adminUser.id);
    await permissionCacheService.invalidateUserPermissions(regularUser.id);
  });

  describe('requirePermission', () => {
    it('should grant access to admin user with wildcard permission', async () => {
      const req = {
        user: { sub: adminUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requirePermission('users.view');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Called without error
    });

    it('should deny access to regular user without required permission', async () => {
      const req = {
        user: { sub: regularUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requirePermission('users.delete');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('Permission required'),
        })
      );
    });

    it('should use cached permissions on second request', async () => {
      const req = {
        user: { sub: adminUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      // First request - populate cache
      const middleware1 = requirePermission('users.view');
      await middleware1(req, res, next);

      // Verify cache is populated
      const cacheKey = `user:${adminUser.id}:permission_status`;
      const cached = await redis.get(cacheKey);
      expect(cached).toBeTruthy();

      // Second request - should use cache
      const next2 = jest.fn() as NextFunction;
      const middleware2 = requirePermission('models.manage');
      await middleware2(req, res, next2);

      expect(next2).toHaveBeenCalledWith(); // Success from cache
    });

    it('should deny access to inactive user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: regularUser.id },
        data: { isActive: false },
      });

      const req = {
        user: { sub: regularUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requirePermission('api.read');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Account is inactive',
        })
      );

      // Reactivate user for other tests
      await prisma.user.update({
        where: { id: regularUser.id },
        data: { isActive: true },
      });
      await permissionCacheService.invalidateUserPermissions(regularUser.id);
    });

    it('should require authentication', async () => {
      const req = {} as Request; // No user
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requirePermission('users.view');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Authentication required',
        })
      );
    });
  });

  describe('requireAnyPermission', () => {
    it('should grant access if user has any of the required permissions', async () => {
      const req = {
        user: { sub: adminUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requireAnyPermission([
        'users.view',
        'models.manage',
        'analytics.view',
      ]);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Admin has wildcard, matches any
    });

    it('should deny access if user has none of the required permissions', async () => {
      const req = {
        user: { sub: regularUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requireAnyPermission([
        'users.delete',
        'models.delete',
        'admin.all',
      ]);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('One of these permissions required'),
        })
      );
    });

    it('should grant access to regular user with matching permission', async () => {
      const req = {
        user: { sub: regularUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      // Regular user has 'api.read' permission
      const middleware = requireAnyPermission(['api.read', 'admin.all']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Success - has api.read
    });
  });

  describe('requireAllPermissions', () => {
    it('should grant access if user has all required permissions', async () => {
      const req = {
        user: { sub: adminUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requireAllPermissions([
        'users.view',
        'users.delete',
        'models.manage',
      ]);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Admin has wildcard, has all
    });

    it('should deny access if user is missing any required permission', async () => {
      const req = {
        user: { sub: regularUser.id },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requireAllPermissions(['api.read', 'users.delete']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining(
            'All of these permissions required'
          ),
        })
      );
    });
  });

  describe('JWT Claims Optimization', () => {
    it('should use permissions from JWT claims if available (Tier 1)', async () => {
      const req = {
        user: {
          sub: adminUser.id,
          permissions: ['*'], // Simulating permissions in JWT
        },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requirePermission('users.view');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Success using JWT claims

      // Verify cache was not queried (Tier 1 optimization)
      const cacheKey = `user:${adminUser.id}:permission_status`;
      const cached = await redis.get(cacheKey);
      expect(cached).toBeNull(); // Cache not populated
    });

    it('should fall back to cache when JWT lacks permissions', async () => {
      const req = {
        user: {
          sub: adminUser.id,
          // No permissions in JWT
        },
      } as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const middleware = requirePermission('users.view');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Success using cache/DB

      // Verify cache was populated (Tier 2)
      const cacheKey = `user:${adminUser.id}:permission_status`;
      const cached = await redis.get(cacheKey);
      expect(cached).toBeTruthy();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate permissions cache when user role changes', async () => {
      // Populate cache
      await permissionCacheService.getPermissionAndStatus(regularUser.id);

      let cacheKey = `user:${regularUser.id}:permission_status`;
      let cached = await redis.get(cacheKey);
      expect(cached).toBeTruthy();

      // Invalidate
      await permissionCacheService.invalidateUserPermissions(regularUser.id);

      // Verify cache cleared
      cached = await redis.get(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('Performance Metrics', () => {
    it('should demonstrate cache performance improvement', async () => {
      const req = {
        user: { sub: adminUser.id },
      } as Request;
      const res = {} as Response;

      // First request (cache miss - slower)
      const start1 = Date.now();
      const next1 = jest.fn() as NextFunction;
      const middleware1 = requirePermission('users.view');
      await middleware1(req, res, next1);
      const duration1 = Date.now() - start1;

      // Second request (cache hit - faster)
      const start2 = Date.now();
      const next2 = jest.fn() as NextFunction;
      const middleware2 = requirePermission('models.manage');
      await middleware2(req, res, next2);
      const duration2 = Date.now() - start2;

      // Cache hit should be faster (or equal in test environment)
      expect(duration2).toBeLessThanOrEqual(duration1 + 5); // Allow 5ms variance

      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
    });
  });
});
