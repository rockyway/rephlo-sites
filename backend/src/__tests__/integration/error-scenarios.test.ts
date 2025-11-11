/**
 * Error Scenarios and Edge Cases Integration Tests
 * Identity Provider Enhancement - Failure Modes
 *
 * Tests error handling and edge cases across all phases:
 * - Redis unavailability and fallback behavior
 * - Invalid inputs and malformed data
 * - Concurrent operation safety
 * - Database failure scenarios
 * - Edge cases (clock skew, expired tokens, race conditions)
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { app } from '../../app';
import { container } from '../../container';
import { RoleCacheService } from '../../services/role-cache.service';
import { PermissionCacheService } from '../../services/permission-cache.service';
import { MFAService } from '../../services/mfa.service';
import { SessionManagementService } from '../../services/session-management.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

describe('Error Scenarios and Edge Cases', () => {
  const roleCacheService = container.resolve(RoleCacheService);
  const permissionCacheService = container.resolve(PermissionCacheService);
  const mfaService = container.resolve(MFAService);
  const sessionManagementService = container.resolve(SessionManagementService);

  let testUser: any;

  beforeAll(async () => {
    await redis.flushdb();
    await prisma.user.deleteMany({
      where: { email: { contains: 'error-test' } },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'error-test@example.com',
        passwordHash: '$2b$12$test',
        role: 'admin',
        isActive: true,
        mfaEnabled: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'error-test' } },
    });
    await redis.flushdb();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('Redis Failure Handling', () => {
    /**
     * Test graceful degradation when Redis is unavailable
     * System should fall back to database without errors
     */

    it('Should fall back to database when Redis unavailable (Role Cache)', async () => {
      // Create a failing Redis mock
      const originalGet = redis.get.bind(redis);
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      try {
        // Should still work by falling back to database
        const role = await roleCacheService.getUserRole(testUser.id);
        expect(role).toBe('admin');
      } finally {
        // Restore Redis
        redis.get = originalGet;
      }
    });

    it('Should fall back to database when Redis unavailable (Permission Cache)', async () => {
      const originalGet = redis.get.bind(redis);
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      try {
        const permissions = await permissionCacheService.getPermissions(testUser.id);
        expect(permissions).toContain('*');
      } finally {
        redis.get = originalGet;
      }
    });

    it('Should handle Redis write failures gracefully', async () => {
      const originalSet = redis.set.bind(redis);
      redis.set = jest.fn().mockRejectedValue(new Error('Redis write failed'));

      try {
        // Should not throw error, just log warning
        await expect(roleCacheService.getUserRole(testUser.id)).resolves.toBe('admin');
      } finally {
        redis.set = originalSet;
      }
    });

    it('Should handle Redis connection timeout', async () => {
      const originalGet = redis.get.bind(redis);
      redis.get = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      try {
        // Should timeout gracefully and fall back to database
        const role = await roleCacheService.getUserRole(testUser.id);
        expect(role).toBe('admin');
      } finally {
        redis.get = originalGet;
      }
    });
  });

  describe('Invalid Input Handling', () => {
    /**
     * Test handling of invalid, malformed, or missing inputs
     */

    it('Should reject invalid user ID', async () => {
      await expect(roleCacheService.getUserRole('invalid-uuid')).rejects.toThrow();
    });

    it('Should reject empty user ID', async () => {
      await expect(roleCacheService.getUserRole('')).rejects.toThrow();
    });

    it('Should handle non-existent user gracefully', async () => {
      await expect(
        roleCacheService.getUserRole('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });

    it('Should reject invalid TOTP token format', async () => {
      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUser.id,
          token: 'invalid', // Not 6 digits
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_MFA_TOKEN');
    });

    it('Should reject expired JWT token', async () => {
      const expiredToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toHaveProperty('code');
    });

    it('Should reject JWT with missing required claims', async () => {
      const incompleteToken = jwt.sign(
        {
          // Missing sub, email, etc.
          scope: ['openid'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .expect(401);

      expect(response.body.error).toBeTruthy();
    });

    it('Should reject malformed JWT', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.error).toBeTruthy();
    });

    it('Should handle null/undefined session ID gracefully', async () => {
      const session = await sessionManagementService.getActiveSession('');
      expect(session).toBeNull();
    });
  });

  describe('Concurrent Operation Safety', () => {
    /**
     * Test thread safety and race condition handling
     */

    it('Should handle concurrent cache reads safely', async () => {
      await roleCacheService.invalidateUserRole(testUser.id);

      // Trigger 10 concurrent reads
      const promises = Array.from({ length: 10 }, () =>
        roleCacheService.getUserRole(testUser.id)
      );

      const results = await Promise.all(promises);

      // All should return the same role
      results.forEach((role) => {
        expect(role).toBe('admin');
      });
    });

    it('Should handle concurrent cache writes safely', async () => {
      // Trigger 10 concurrent cache invalidations
      const promises = Array.from({ length: 10 }, () =>
        roleCacheService.invalidateUserRole(testUser.id)
      );

      await expect(Promise.all(promises)).resolves.toBeTruthy();

      // Cache should be invalidated (no partial state)
      const cached = await redis.get(`user:${testUser.id}:role`);
      expect(cached).toBeNull();
    });

    it('Should handle concurrent session creation safely', async () => {
      // Create 5 sessions concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        sessionManagementService.createSession({
          sessionId: `concurrent-${Date.now()}-${i}`,
          userId: testUser.id,
          userRole: 'admin',
          ipAddress: '127.0.0.1',
          userAgent: `agent-${i}`,
          loginMethod: 'password',
        })
      );

      await expect(Promise.all(promises)).resolves.toBeTruthy();

      // Verify session limit enforced (max 3)
      const sessions = await sessionManagementService.getActiveSessions(testUser.id);
      expect(sessions.length).toBeLessThanOrEqual(3);
    });

    it('Should handle concurrent API requests safely', async () => {
      const adminToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Make 20 concurrent API calls
      const promises = Array.from({ length: 20 }, () =>
        request(app).get('/admin/users').set('Authorization', `Bearer ${adminToken}`)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('users');
      });
    });
  });

  describe('Database Failure Scenarios', () => {
    /**
     * Test handling of database unavailability
     */

    it('Should handle database connection errors gracefully', async () => {
      // Mock Prisma to simulate database failure
      const originalFindUnique = prisma.user.findUnique;
      (prisma.user.findUnique as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error('Database connection lost'));

      try {
        await expect(roleCacheService.getUserRole(testUser.id)).rejects.toThrow();
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });

    it('Should handle database query timeout', async () => {
      const originalFindUnique = prisma.user.findUnique;
      (prisma.user.findUnique as jest.Mock) = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 100);
        });
      });

      try {
        await expect(roleCacheService.getUserRole(testUser.id)).rejects.toThrow();
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });
  });

  describe('MFA Edge Cases', () => {
    /**
     * Test TOTP clock skew, backup code edge cases
     */

    let mfaSecret: string;
    let backupCodes: string[];

    beforeAll(async () => {
      const adminToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const setup = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`);

      mfaSecret = setup.body.secret;
      backupCodes = setup.body.backupCodes;

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      await request(app)
        .post('/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token, backupCodes });
    });

    it('Should handle TOTP clock skew (±30 seconds)', async () => {
      // Generate token for previous time window
      const previousToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) - 30,
      });

      // Should still be accepted (window = 1)
      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUser.id,
          token: previousToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('Should reject TOTP token from 2 time windows ago', async () => {
      // Generate token for 2 windows ago (60 seconds)
      const oldToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000) - 60,
      });

      // Should be rejected (outside ±1 window)
      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUser.id,
          token: oldToken,
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_MFA_TOKEN');
    });

    it('Should handle all backup codes depleted', async () => {
      // Use all backup codes
      for (const code of backupCodes) {
        await request(app)
          .post('/auth/mfa/backup-code-login')
          .send({
            userId: testUser.id,
            backupCode: code,
          });
      }

      // Verify all depleted
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { mfaBackupCodes: true },
      });

      expect(user?.mfaBackupCodes).toHaveLength(0);

      // Trying to use any code should fail
      const response = await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testUser.id,
          backupCode: backupCodes[0],
        })
        .expect(401);

      expect(response.body.error.code).toBe('NO_BACKUP_CODES');
    });

    it('Should reject MFA verification for disabled MFA', async () => {
      // Disable MFA
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: false },
      });

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUser.id,
          token,
        })
        .expect(401);

      expect(response.body.error.code).toBe('MFA_NOT_ENABLED');

      // Re-enable for other tests
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: true },
      });
    });

    it('Should reject MFA verification for inactive user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false },
      });

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testUser.id,
          token,
        })
        .expect(403);

      expect(response.body.error.code).toBe('ACCOUNT_INACTIVE');

      // Reactivate
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: true },
      });
    });
  });

  describe('Session Management Edge Cases', () => {
    /**
     * Test session timeout, expiration, and limit edge cases
     */

    it('Should handle expired session gracefully', async () => {
      const sessionId = `expired-session-${Date.now()}`;

      // Create session
      await sessionManagementService.createSession({
        sessionId,
        userId: testUser.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        loginMethod: 'password',
      });

      // Manually expire session
      await redis.del(`session:${sessionId}`);

      // Should return null for expired session
      const session = await sessionManagementService.getActiveSession(sessionId);
      expect(session).toBeNull();
    });

    it('Should handle session not found', async () => {
      const session = await sessionManagementService.getActiveSession('non-existent-session');
      expect(session).toBeNull();
    });

    it('Should handle invalid session ID format', async () => {
      const session = await sessionManagementService.getActiveSession('');
      expect(session).toBeNull();
    });

    it('Should handle concurrent session limit edge case', async () => {
      // Create exactly 3 sessions (the limit)
      for (let i = 1; i <= 3; i++) {
        await sessionManagementService.createSession({
          sessionId: `limit-session-${Date.now()}-${i}`,
          userId: testUser.id,
          userRole: 'admin',
          ipAddress: '127.0.0.1',
          userAgent: `agent-${i}`,
          loginMethod: 'password',
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify exactly 3 sessions
      let sessions = await sessionManagementService.getActiveSessions(testUser.id);
      expect(sessions.length).toBe(3);

      // Add 4th session - oldest should be removed
      await sessionManagementService.createSession({
        sessionId: `limit-session-${Date.now()}-4`,
        userId: testUser.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'agent-4',
        loginMethod: 'password',
      });

      // Still only 3 sessions
      sessions = await sessionManagementService.getActiveSessions(testUser.id);
      expect(sessions.length).toBe(3);
    });

    it('Should handle session activity update for non-existent session', async () => {
      const result = await sessionManagementService.updateSessionActivity('non-existent');
      expect(result).toBe(false);
    });

    it('Should handle bulk session invalidation with no active sessions', async () => {
      // Clear all sessions
      await sessionManagementService.invalidateAllSessions(testUser.id);

      // Try to invalidate again
      const count = await sessionManagementService.invalidateAllSessions(testUser.id);
      expect(count).toBe(0);
    });
  });

  describe('Permission and Authorization Edge Cases', () => {
    /**
     * Test edge cases in permission checking
     */

    it('Should handle permission check for user with no role', async () => {
      const noRoleUser = await prisma.user.create({
        data: {
          email: 'no-role@example.com',
          passwordHash: '$2b$12$test',
          role: 'user', // Default
          isActive: true,
        },
      });

      const permissions = await permissionCacheService.getPermissions(noRoleUser.id);
      expect(permissions).toContain('api.read');

      await prisma.user.delete({ where: { id: noRoleUser.id } });
    });

    it('Should handle permission check for inactive user', async () => {
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive@example.com',
          passwordHash: '$2b$12$test',
          role: 'admin',
          isActive: false,
        },
      });

      const result = await permissionCacheService.getPermissionAndStatus(inactiveUser.id);
      expect(result.isActive).toBe(false);

      await prisma.user.delete({ where: { id: inactiveUser.id } });
    });

    it('Should handle empty permission array gracefully', async () => {
      // Mock user with no permissions (edge case)
      const originalFindUnique = prisma.user.findUnique;
      (prisma.user.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
        id: testUser.id,
        role: null, // No role
        isActive: true,
      });

      try {
        const permissions = await permissionCacheService.getPermissions(testUser.id);
        expect(Array.isArray(permissions)).toBe(true);
      } finally {
        prisma.user.findUnique = originalFindUnique;
      }
    });
  });

  describe('Rate Limiting and Throttling (Potential)', () => {
    /**
     * Test rate limiting behavior (if implemented)
     */

    it('Should handle rapid repeated MFA verification attempts', async () => {
      const adminToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Make 10 rapid MFA verification attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/auth/mfa/verify-login')
          .send({
            userId: testUser.id,
            token: '000000', // Invalid
          })
      );

      const results = await Promise.all(promises);

      // All should return error (not rate limited in current implementation)
      results.forEach((response) => {
        expect(response.status).toBe(401);
      });
    });
  });
});

describe('Performance and Scalability Edge Cases', () => {
  it('Should handle large number of concurrent cache operations', async () => {
    // Create 100 test users
    const users = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `perf-test-${i}@example.com`,
            passwordHash: '$2b$12$test',
            role: i % 2 === 0 ? 'admin' : 'user',
            isActive: true,
          },
        })
      )
    );

    const roleCacheService = container.resolve(RoleCacheService);

    // Query all roles concurrently
    const startTime = Date.now();
    const promises = users.map((user) => roleCacheService.getUserRole(user.id));
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    console.log(`Processed 100 concurrent role lookups in ${duration}ms`);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

    // Clean up
    await prisma.user.deleteMany({
      where: { email: { contains: 'perf-test' } },
    });
  });

  it('Should handle cache with large number of entries', async () => {
    const permissionCacheService = container.resolve(PermissionCacheService);

    // Create 50 users and cache their permissions
    const users = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `cache-test-${i}@example.com`,
            passwordHash: '$2b$12$test',
            role: 'admin',
            isActive: true,
          },
        })
      )
    );

    // Cache all permissions
    await Promise.all(users.map((user) => permissionCacheService.getPermissions(user.id)));

    // Verify cache stats
    const stats = await permissionCacheService.getCacheStats();
    expect(stats.permissionKeyCount).toBeGreaterThanOrEqual(50);

    // Clean up
    await prisma.user.deleteMany({
      where: { email: { contains: 'cache-test' } },
    });
  });
});
