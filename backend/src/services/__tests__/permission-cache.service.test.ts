/**
 * Permission Cache Service Unit Tests
 *
 * Tests Redis-based permission caching functionality
 * Part of Phase 3 - Permission Caching Layer (Plan 126/127)
 */

import 'reflect-metadata';
import { PermissionCacheService } from '../permission-cache.service';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@prisma/client');

describe('PermissionCacheService', () => {
  let permissionCacheService: PermissionCacheService;
  let mockRedis: jest.Mocked<Redis>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Create mocked instances
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      info: jest.fn(),
      status: 'ready',
    } as any;

    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
    } as any;

    permissionCacheService = new PermissionCacheService(
      mockRedis,
      mockPrisma
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermissions', () => {
    it('should return permissions from cache when available (cache hit)', async () => {
      const userId = 'user-123';
      const cachedPermissions = ['*'];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPermissions));

      const permissions = await permissionCacheService.getPermissions(userId);

      expect(permissions).toEqual(cachedPermissions);
      expect(mockRedis.get).toHaveBeenCalledWith('user:user-123:permissions');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should query database and cache permissions on cache miss', async () => {
      const userId = 'user-456';
      const userRole = 'admin';
      const expectedPermissions = ['*'];

      mockRedis.get.mockResolvedValue(null); // Cache miss
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: userRole,
      } as any);

      const permissions = await permissionCacheService.getPermissions(userId);

      expect(permissions).toEqual(expectedPermissions);
      expect(mockRedis.get).toHaveBeenCalledWith('user:user-456:permissions');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { role: true },
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:user-456:permissions',
        600, // 10-minute TTL
        JSON.stringify(expectedPermissions)
      );
    });

    it('should return basic permissions for regular user', async () => {
      const userId = 'user-789';
      const userRole = 'user';
      const expectedPermissions = ['api.read'];

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: userRole,
      } as any);

      const permissions = await permissionCacheService.getPermissions(userId);

      expect(permissions).toEqual(expectedPermissions);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:user-789:permissions',
        600,
        JSON.stringify(expectedPermissions)
      );
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent-user';

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        permissionCacheService.getPermissions(userId)
      ).rejects.toThrow('User not found');

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should fall back to database query when Redis fails', async () => {
      const userId = 'user-999';
      const userRole = 'admin';
      const expectedPermissions = ['*'];

      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: userRole,
      } as any);

      const permissions = await permissionCacheService.getPermissions(userId);

      expect(permissions).toEqual(expectedPermissions);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPermissionAndStatus', () => {
    it('should return permissions and status from cache when available', async () => {
      const userId = 'user-123';
      const cached = {
        permissions: ['*'],
        isActive: true,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result =
        await permissionCacheService.getPermissionAndStatus(userId);

      expect(result).toEqual(cached);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'user:user-123:permission_status'
      );
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should query database and cache on cache miss', async () => {
      const userId = 'user-456';
      const userData = {
        role: 'admin',
        isActive: true,
      };

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(userData as any);

      const result =
        await permissionCacheService.getPermissionAndStatus(userId);

      expect(result.permissions).toEqual(['*']);
      expect(result.isActive).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:user-456:permission_status',
        600,
        JSON.stringify({ permissions: ['*'], isActive: true })
      );
    });

    it('should handle inactive user correctly', async () => {
      const userId = 'user-789';
      const userData = {
        role: 'user',
        isActive: false,
      };

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(userData as any);

      const result =
        await permissionCacheService.getPermissionAndStatus(userId);

      expect(result.permissions).toEqual(['api.read']);
      expect(result.isActive).toBe(false);
    });
  });

  describe('invalidateUserPermissions', () => {
    it('should delete both permission cache keys for user', async () => {
      const userId = 'user-123';

      mockRedis.del.mockResolvedValue(2);

      await permissionCacheService.invalidateUserPermissions(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        'user:user-123:permissions',
        'user:user-123:permission_status'
      );
    });

    it('should not throw error when Redis fails', async () => {
      const userId = 'user-456';

      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(
        permissionCacheService.invalidateUserPermissions(userId)
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateAllPermissions', () => {
    it('should delete all permission cache keys', async () => {
      const permissionKeys = [
        'user:user-1:permissions',
        'user:user-2:permissions',
      ];
      const statusKeys = [
        'user:user-1:permission_status',
        'user:user-2:permission_status',
      ];

      mockRedis.keys
        .mockResolvedValueOnce(permissionKeys)
        .mockResolvedValueOnce(statusKeys);
      mockRedis.del.mockResolvedValue(4);

      await permissionCacheService.invalidateAllPermissions();

      expect(mockRedis.keys).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith(...permissionKeys, ...statusKeys);
    });

    it('should handle no keys to invalidate', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await permissionCacheService.invalidateAllPermissions();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should not throw error when Redis fails', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(
        permissionCacheService.invalidateAllPermissions()
      ).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const memoryInfo = 'used_memory_human:2.5M\r\n';
      const keys = [
        'user:user-1:permissions',
        'user:user-2:permissions',
        'user:user-1:permission_status',
      ];

      mockRedis.info.mockResolvedValue(memoryInfo);
      mockRedis.keys
        .mockResolvedValueOnce(keys.slice(0, 2))
        .mockResolvedValueOnce(keys.slice(2));

      const stats = await permissionCacheService.getCacheStats();

      expect(stats.connected).toBe(true);
      expect(stats.permissionKeyCount).toBe(3);
      expect(stats.memoryUsage).toBe('2.5M');
    });

    it('should return disconnected status when Redis fails', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis connection failed'));

      const stats = await permissionCacheService.getCacheStats();

      expect(stats.connected).toBe(false);
      expect(stats.permissionKeyCount).toBe(0);
      expect(stats.memoryUsage).toBe('unknown');
    });
  });

  describe('TTL Configuration', () => {
    it('should use 10-minute TTL for all permissions', async () => {
      const userId = 'user-123';

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
      } as any);

      await permissionCacheService.getPermissions(userId);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        600, // 10 minutes
        expect.any(String)
      );
    });
  });
});
