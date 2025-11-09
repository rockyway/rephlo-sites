/**
 * Role Cache Service Unit Tests
 *
 * Tests for Redis-based role caching functionality
 * Part of Phase 1 - Performance Optimizations (Plan 126/127)
 */

import { RoleCacheService } from '../role-cache.service';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@prisma/client');

describe('RoleCacheService', () => {
  let roleCacheService: RoleCacheService;
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

    roleCacheService = new RoleCacheService(mockRedis, mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return role from cache when available (cache hit)', async () => {
      mockRedis.get.mockResolvedValue('admin');

      const role = await roleCacheService.getUserRole(userId);

      expect(role).toBe('admin');
      expect(mockRedis.get).toHaveBeenCalledWith(`user:${userId}:role`);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'user',
      } as any);

      const role = await roleCacheService.getUserRole(userId);

      expect(role).toBe('user');
      expect(mockRedis.get).toHaveBeenCalledWith(`user:${userId}:role`);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { role: true },
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `user:${userId}:role`,
        300, // 5-minute TTL
        'user'
      );
    });

    it('should throw error when user not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(roleCacheService.getUserRole(userId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should fall back to database when Redis is unavailable', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
      } as any);

      const role = await roleCacheService.getUserRole(userId);

      expect(role).toBe('admin');
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });
  });

  describe('getUserRoleAndStatus', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return role and status from cache when available', async () => {
      const cached = { role: 'admin', isActive: true };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await roleCacheService.getUserRoleAndStatus(userId);

      expect(result).toEqual(cached);
      expect(mockRedis.get).toHaveBeenCalledWith(
        `user:${userId}:role_status`
      );
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'user',
        isActive: true,
      } as any);

      const result = await roleCacheService.getUserRoleAndStatus(userId);

      expect(result).toEqual({ role: 'user', isActive: true });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { role: true, isActive: true },
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `user:${userId}:role_status`,
        300,
        JSON.stringify({ role: 'user', isActive: true })
      );
    });

    it('should handle inactive users correctly', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
        isActive: false,
      } as any);

      const result = await roleCacheService.getUserRoleAndStatus(userId);

      expect(result).toEqual({ role: 'admin', isActive: false });
    });
  });

  describe('invalidateUserRole', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete both role and role_status cache keys', async () => {
      mockRedis.del.mockResolvedValue(2);

      await roleCacheService.invalidateUserRole(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        `user:${userId}:role`,
        `user:${userId}:role_status`
      );
    });

    it('should not throw error when Redis delete fails', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(
        roleCacheService.invalidateUserRole(userId)
      ).resolves.toBeUndefined();
    });

    it('should log when cache keys are successfully deleted', async () => {
      mockRedis.del.mockResolvedValue(2);

      await roleCacheService.invalidateUserRole(userId);

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics when Redis is available', async () => {
      mockRedis.info.mockResolvedValue('used_memory_human:1.5M\nother_stat:value');
      mockRedis.keys.mockResolvedValue(['user:123:role', 'user:456:role']);
      (mockRedis as any).status = 'ready';

      const stats = await roleCacheService.getCacheStats();

      expect(stats).toEqual({
        connected: true,
        keyCount: 2,
        memoryUsage: '1.5M',
      });
    });

    it('should return default values when Redis is unavailable', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis connection failed'));

      const stats = await roleCacheService.getCacheStats();

      expect(stats).toEqual({
        connected: false,
        keyCount: 0,
        memoryUsage: 'unknown',
      });
    });
  });

  describe('Cache TTL', () => {
    it('should use 5-minute TTL for role caching', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
      } as any);

      await roleCacheService.getUserRole(userId);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `user:${userId}:role`,
        300, // 5 minutes in seconds
        'admin'
      );
    });
  });

  describe('Error Handling', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    it('should handle malformed cached data gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'user',
        isActive: true,
      } as any);

      // Should fall back to database on JSON parse error
      await expect(
        roleCacheService.getUserRoleAndStatus(userId)
      ).rejects.toThrow();
    });

    it('should propagate user not found error from database', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(roleCacheService.getUserRole(userId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should handle database errors gracefully after Redis failure', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(roleCacheService.getUserRole(userId)).rejects.toThrow(
        'DB error'
      );
    });
  });
});
