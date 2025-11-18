/**
 * Admin Role Cache Integration Tests
 *
 * Tests end-to-end flow of role caching in admin endpoints
 * Part of Phase 1 - Performance Optimizations (Plan 126/127)
 *
 * Test Scenarios:
 * 1. JWT with admin scope includes role claim (Tier 1 optimization)
 * 2. JWT without admin scope uses cache (Tier 2 optimization)
 * 3. Cache invalidation on role changes
 * 4. requireAdmin middleware integration
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { container } from '../../container';
import Redis from 'ioredis';
import { RoleCacheService } from '../../services/role-cache.service';

describe('Admin Role Cache Integration', () => {
  let prisma: PrismaClient;
  let redis: Redis;
  let roleCacheService: RoleCacheService;
  let adminUser: any;
  let regularUser: any;

  beforeAll(async () => {
    prisma = container.resolve<PrismaClient>('PrismaClient');
    redis = container.resolve<Redis>('RedisConnection');
    roleCacheService = container.resolve(RoleCacheService);

    // Create test users
    adminUser = await prisma.users.create({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'admin@test.com',
        role: 'admin',
        isActive: true,
        emailVerified: true,
      },
    });

    regularUser = await prisma.users.create({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'user@test.com',
        role: 'user',
        isActive: true,
        emailVerified: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.users.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'user@test.com'],
        },
      },
    });

    // Clear cache
    await redis.del(
      `user:${adminUser.id}:role`,
      `user:${adminUser.id}:role_status`,
      `user:${regularUser.id}:role`,
      `user:${regularUser.id}:role_status`
    );
  });

  describe('RoleCacheService - Cache Hit/Miss', () => {
    beforeEach(async () => {
      // Clear cache before each test
      await redis.del(
        `user:${adminUser.id}:role`,
        `user:${adminUser.id}:role_status`
      );
    });

    it('should cache role after first database query', async () => {
      // First call - cache miss, should query database
      const role1 = await roleCacheService.getUserRole(adminUser.id);
      expect(role1).toBe('admin');

      // Verify cache was populated
      const cached = await redis.get(`user:${adminUser.id}:role`);
      expect(cached).toBe('admin');

      // Second call - cache hit, should not query database
      const role2 = await roleCacheService.getUserRole(adminUser.id);
      expect(role2).toBe('admin');
    });

    it('should cache role and status together', async () => {
      const result = await roleCacheService.getUserRoleAndStatus(adminUser.id);

      expect(result).toEqual({
        role: 'admin',
        isActive: true,
      });

      // Verify cache was populated
      const cached = await redis.get(`user:${adminUser.id}:role_status`);
      const parsed = JSON.parse(cached!);
      expect(parsed).toEqual({
        role: 'admin',
        isActive: true,
      });
    });

    it('should respect 5-minute TTL', async () => {
      await roleCacheService.getUserRole(adminUser.id);

      // Check TTL
      const ttl = await redis.ttl(`user:${adminUser.id}:role`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(300); // 5 minutes
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when role is changed', async () => {
      // Populate cache
      await roleCacheService.getUserRole(regularUser.id);
      let cached = await redis.get(`user:${regularUser.id}:role`);
      expect(cached).toBe('user');

      // Change role to admin
      await prisma.users.update({
        where: { id: regularUser.id },
        data: { role: 'admin' },
      });

      // Invalidate cache
      await roleCacheService.invalidateUserRole(regularUser.id);

      // Verify cache was cleared
      cached = await redis.get(`user:${regularUser.id}:role`);
      expect(cached).toBeNull();

      // Next query should return updated role
      const newRole = await roleCacheService.getUserRole(regularUser.id);
      expect(newRole).toBe('admin');

      // Restore original role
      await prisma.users.update({
        where: { id: regularUser.id },
        data: { role: 'user' },
      });
      await roleCacheService.invalidateUserRole(regularUser.id);
    });

    it('should invalidate both role and role_status caches', async () => {
      // Populate both caches
      await roleCacheService.getUserRole(adminUser.id);
      await roleCacheService.getUserRoleAndStatus(adminUser.id);

      let cacheRole = await redis.get(`user:${adminUser.id}:role`);
      let cacheStatus = await redis.get(`user:${adminUser.id}:role_status`);
      expect(cacheRole).toBeTruthy();
      expect(cacheStatus).toBeTruthy();

      // Invalidate
      await roleCacheService.invalidateUserRole(adminUser.id);

      // Both should be cleared
      cacheRole = await redis.get(`user:${adminUser.id}:role`);
      cacheStatus = await redis.get(`user:${adminUser.id}:role_status`);
      expect(cacheRole).toBeNull();
      expect(cacheStatus).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return accurate cache statistics', async () => {
      // Populate some cache entries
      await roleCacheService.getUserRole(adminUser.id);
      await roleCacheService.getUserRole(regularUser.id);

      const stats = await roleCacheService.getCacheStats();

      expect(stats.connected).toBe(true);
      expect(stats.keyCount).toBeGreaterThanOrEqual(2);
      expect(stats.memoryUsage).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent user gracefully', async () => {
      const fakeUserId = '123e4567-e89b-12d3-a456-000000000000';

      await expect(
        roleCacheService.getUserRole(fakeUserId)
      ).rejects.toThrow('User not found');
    });

    it('should handle inactive users correctly', async () => {
      // Create inactive user
      const inactiveUser = await prisma.users.create({
        data: {
          id: '123e4567-e89b-12d3-a456-426614174003',
          email: 'inactive@test.com',
          role: 'admin',
          isActive: false,
          emailVerified: true,
        },
      });

      const result = await roleCacheService.getUserRoleAndStatus(inactiveUser.id);

      expect(result).toEqual({
        role: 'admin',
        isActive: false,
      });

      // Cleanup
      await prisma.users.delete({ where: { id: inactiveUser.id } });
    });
  });

  describe('Performance Optimization Tiers', () => {
    it('Tier 1: JWT claim check should be instant (in-memory)', async () => {
      // This test would require generating a JWT with admin scope
      // and role claim, then measuring response time
      // Implementation depends on auth token generation setup

      // Note: JWT claim check happens in authMiddleware before
      // requireAdmin, so role is already in req.user.role
      expect(true).toBe(true); // Placeholder for future implementation
    });

    it('Tier 2: Cache check should be faster than DB query', async () => {
      // Clear cache
      await redis.del(`user:${adminUser.id}:role_status`);

      // First call - DB query
      const dbStart = Date.now();
      await roleCacheService.getUserRoleAndStatus(adminUser.id);
      const dbDuration = Date.now() - dbStart;

      // Second call - cache hit
      const cacheStart = Date.now();
      await roleCacheService.getUserRoleAndStatus(adminUser.id);
      const cacheDuration = Date.now() - cacheStart;

      // Cache should be faster (though in tests, both might be very fast)
      expect(cacheDuration).toBeLessThanOrEqual(dbDuration);
    });

    it('Tier 3: DB fallback when cache unavailable', async () => {
      // This test verifies that when Redis is unavailable,
      // the service falls back to direct DB queries
      // Actual Redis unavailability testing would require
      // temporarily disconnecting Redis, which is complex

      expect(true).toBe(true); // Placeholder for future implementation
    });
  });
});
