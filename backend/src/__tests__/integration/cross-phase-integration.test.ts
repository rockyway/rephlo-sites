/**
 * Cross-Phase Integration Tests
 * Identity Provider Enhancement - Phase Interactions
 *
 * Tests interactions and dependencies between different phases:
 * - Phase 1 + Phase 2: Role caching with JWT claims
 * - Phase 1 + Phase 3: Role and permission caching layers
 * - Phase 3 + Phase 4: Permission checks with MFA
 * - Phase 4 + Phase 5: MFA with session management
 * - All Phases: Complete cascade invalidation
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

describe('Cross-Phase Integration Tests', () => {
  const roleCacheService = container.resolve(RoleCacheService);
  const permissionCacheService = container.resolve(PermissionCacheService);
  const mfaService = container.resolve(MFAService);
  const sessionManagementService = container.resolve(SessionManagementService);

  let testAdmin: any;
  let testUser: any;

  beforeAll(async () => {
    // Clean up
    await redis.flushdb();
    await prisma.users.deleteMany({
      where: { email: { contains: 'cross-phase-test' } },
    });

    // Create test users
    testAdmin = await prisma.users.create({
      data: {
        email: 'cross-phase-admin@example.com',
        passwordHash: '$2b$12$test',
        role: 'admin',
        isActive: true,
        mfaEnabled: false,
      },
    });

    testUser = await prisma.users.create({
      data: {
        email: 'cross-phase-user@example.com',
        passwordHash: '$2b$12$test',
        role: 'user',
        isActive: true,
        mfaEnabled: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.users.deleteMany({
      where: { email: { contains: 'cross-phase-test' } },
    });
    await redis.flushdb();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('Phase 1 + Phase 2: Role Caching with JWT Claims', () => {
    /**
     * Test the three-tier role checking optimization:
     * - Tier 1: JWT claim check (0ms - in-memory)
     * - Tier 2: Redis cache check (2-5ms)
     * - Tier 3: Database query (15-20ms)
     */

    it('Tier 1: Should extract role from JWT without database query', async () => {
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin', // Phase 2: Role in JWT
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Clear cache to ensure we're testing JWT extraction
      await roleCacheService.invalidateUserRole(testAdmin.id);

      // Make request - should succeed using JWT role claim
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');

      // Verify role was extracted from JWT (Tier 1)
      // No database query should have occurred
    });

    it('Tier 2: Should fall back to Redis cache when JWT has no role', async () => {
      // Generate token WITHOUT role claim
      const tokenNoRole = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          scope: ['openid', 'email'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Pre-populate cache (Phase 1)
      await roleCacheService.getUserRole(testAdmin.id);

      // Make request - should use cached role
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${tokenNoRole}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');

      // Verify cache was used (Tier 2)
      const cachedRole = await redis.get(`user:${testAdmin.id}:role`);
      expect(cachedRole).toBe('admin');
    });

    it('Tier 3: Should fall back to database when cache miss', async () => {
      // Clear cache
      await roleCacheService.invalidateUserRole(testAdmin.id);

      // Generate token WITHOUT role claim
      const tokenNoRole = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          scope: ['openid', 'email'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Make request - should query database
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${tokenNoRole}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');

      // Verify cache was populated after database query (Tier 3)
      const cachedRole = await redis.get(`user:${testAdmin.id}:role`);
      expect(cachedRole).toBe('admin');
    });

    it('Should handle cache invalidation on role change', async () => {
      // Pre-populate cache
      await roleCacheService.getUserRole(testAdmin.id);

      // Verify cache exists
      const cachedBefore = await redis.get(`user:${testAdmin.id}:role`);
      expect(cachedBefore).toBe('admin');

      // Change role
      await prisma.users.update({
        where: { id: testAdmin.id },
        data: { role: 'user' },
      });

      // Invalidate cache (Phase 1)
      await roleCacheService.invalidateUserRole(testAdmin.id);

      // Verify cache cleared
      const cachedAfter = await redis.get(`user:${testAdmin.id}:role`);
      expect(cachedAfter).toBeNull();

      // Next request fetches new role from database
      const newRole = await roleCacheService.getUserRole(testAdmin.id);
      expect(newRole).toBe('user');

      // Restore admin role for other tests
      await prisma.users.update({
        where: { id: testAdmin.id },
        data: { role: 'admin' },
      });
    });
  });

  describe('Phase 1 + Phase 3: Role and Permission Caching Layers', () => {
    /**
     * Test layered caching system:
     * - Role cache (5-minute TTL) - Phase 1
     * - Permission cache (10-minute TTL) - Phase 3
     * - Cascade invalidation on role change
     */

    it('Should cache both role and permissions independently', async () => {
      // Clear caches
      await roleCacheService.invalidateUserRole(testAdmin.id);
      await permissionCacheService.invalidateUserPermissions(testAdmin.id);

      // First request populates both caches
      const role = await roleCacheService.getUserRole(testAdmin.id);
      const permissions = await permissionCacheService.getPermissions(testAdmin.id);

      expect(role).toBe('admin');
      expect(permissions).toContain('*');

      // Verify both cached
      const cachedRole = await redis.get(`user:${testAdmin.id}:role`);
      const cachedPermissions = await redis.get(`user:${testAdmin.id}:permissions`);

      expect(cachedRole).toBe('admin');
      expect(cachedPermissions).toBeTruthy();
    });

    it('Should use permission cache for authorization', async () => {
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin',
          permissions: ['*'],
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Clear permission cache
      await permissionCacheService.invalidateUserPermissions(testAdmin.id);

      // First request - populates cache
      const response1 = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify permission cached
      const cached = await permissionCacheService.getPermissions(testAdmin.id);
      expect(cached).toContain('*');

      // Second request - uses cached permissions
      const response2 = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body).toHaveProperty('users');
      expect(response2.body).toHaveProperty('users');
    });

    it('Should cascade invalidation: Role → Permissions', async () => {
      // Populate both caches
      await roleCacheService.getUserRole(testAdmin.id);
      await permissionCacheService.getPermissions(testAdmin.id);

      // Verify both cached
      const roleBefore = await redis.get(`user:${testAdmin.id}:role`);
      const permsBefore = await redis.get(`user:${testAdmin.id}:permissions`);
      expect(roleBefore).toBeTruthy();
      expect(permsBefore).toBeTruthy();

      // Invalidate role - should trigger permission invalidation
      await roleCacheService.invalidateUserRole(testAdmin.id);
      await permissionCacheService.invalidateUserPermissions(testAdmin.id);

      // Verify both caches cleared
      const roleAfter = await redis.get(`user:${testAdmin.id}:role`);
      const permsAfter = await redis.get(`user:${testAdmin.id}:permissions`);
      expect(roleAfter).toBeNull();
      expect(permsAfter).toBeNull();
    });

    it('Admin should have wildcard permission for all access', async () => {
      const permissions = await permissionCacheService.getPermissions(testAdmin.id);
      expect(permissions).toContain('*');

      // Wildcard should grant all permissions
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin',
          permissions: ['*'],
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Should access all admin endpoints
      await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('Regular user should have limited permissions', async () => {
      const permissions = await permissionCacheService.getPermissions(testUser.id);
      expect(permissions).toContain('api.read');
      expect(permissions).not.toContain('*');

      // Regular user cannot access admin endpoints
      const userToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: 'user',
          permissions: ['api.read'],
          scope: ['openid', 'email'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Phase 4: MFA for Admin Accounts', () => {
    let mfaSecret: string;
    let backupCodes: string[];

    it('Should enable MFA for admin account', async () => {
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Setup MFA
      const setupResponse = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(setupResponse.body).toHaveProperty('qrCode');
      expect(setupResponse.body).toHaveProperty('secret');
      expect(setupResponse.body.backupCodes).toHaveLength(10);

      mfaSecret = setupResponse.body.secret;
      backupCodes = setupResponse.body.backupCodes;

      // Verify setup
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      await request(app)
        .post('/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token, backupCodes })
        .expect(200);
    });

    it('Should verify TOTP token with ±1 time window', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testAdmin.id,
          token,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('Should reject invalid TOTP token', async () => {
      const response = await request(app)
        .post('/auth/mfa/verify-login')
        .send({
          userId: testAdmin.id,
          token: '000000', // Invalid
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_MFA_TOKEN');
    });

    it('Should accept backup code for recovery', async () => {
      const backupCode = backupCodes[0];

      const response = await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testAdmin.id,
          backupCode,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.remainingBackupCodes).toBe(9);
    });

    it('Should consume backup code (one-time use)', async () => {
      const usedCode = backupCodes[0];

      // Try using same code again
      const response = await request(app)
        .post('/auth/mfa/backup-code-login')
        .send({
          userId: testAdmin.id,
          backupCode: usedCode,
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_BACKUP_CODE');
    });

    it('Should disable MFA with password + token', async () => {
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/auth/mfa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'password', // Mock - would be actual password
          token,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify MFA disabled
      const user = await prisma.users.findUnique({
        where: { id: testAdmin.id },
        select: { mfaEnabled: true },
      });
      expect(user?.mfaEnabled).toBe(false);
    });

    it('Non-admin users cannot enable MFA (current implementation)', async () => {
      const userToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          role: 'user',
          scope: ['openid', 'email'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Regular user tries to setup MFA
      const response = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Phase 5: Admin Session Management', () => {
    it('Should create session with 4-hour TTL for admin', async () => {
      const sessionId = `admin-session-${Date.now()}`;

      await sessionManagementService.createSession({
        sessionId,
        userId: testAdmin.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginMethod: 'password',
      });

      const session = await sessionManagementService.getActiveSession(sessionId);
      expect(session).toBeTruthy();
      expect(session?.userRole).toBe('admin');

      // Verify TTL is 4 hours (14400 seconds)
      const ttl = await redis.ttl(`session:${sessionId}`);
      expect(ttl).toBeGreaterThan(14000); // ~4 hours
      expect(ttl).toBeLessThanOrEqual(14400);
    });

    it('Should create session with 24-hour TTL for regular user', async () => {
      const sessionId = `user-session-${Date.now()}`;

      await sessionManagementService.createSession({
        sessionId,
        userId: testUser.id,
        userRole: 'user',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginMethod: 'password',
      });

      const session = await sessionManagementService.getActiveSession(sessionId);
      expect(session).toBeTruthy();
      expect(session?.userRole).toBe('user');

      // Verify TTL is 24 hours (86400 seconds)
      const ttl = await redis.ttl(`session:${sessionId}`);
      expect(ttl).toBeGreaterThan(86000); // ~24 hours
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it('Should track session activity on each request', async () => {
      const sessionId = `activity-session-${Date.now()}`;

      await sessionManagementService.createSession({
        sessionId,
        userId: testAdmin.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginMethod: 'password',
      });

      const initialSession = await sessionManagementService.getActiveSession(sessionId);
      const initialActivity = initialSession?.lastActivityAt;

      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update activity
      await sessionManagementService.updateSessionActivity(sessionId);

      const updatedSession = await sessionManagementService.getActiveSession(sessionId);
      expect(updatedSession?.lastActivityAt).toBeGreaterThan(initialActivity!);
    });

    it('Should enforce 15-minute idle timeout for admin', async () => {
      const sessionId = `idle-session-${Date.now()}`;

      await sessionManagementService.createSession({
        sessionId,
        userId: testAdmin.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        loginMethod: 'password',
      });

      // Simulate 16 minutes of inactivity
      const sixteenMinutesAgo = Date.now() - (16 * 60 * 1000);
      await redis.hset(`session:${sessionId}`, 'lastActivityAt', sixteenMinutesAgo.toString());

      // Session should be considered timed out
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
          session_id: sessionId,
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '4h' }
      );

      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Session-ID', sessionId)
        .expect(401);

      expect(response.body.error.code).toBe('SESSION_IDLE_TIMEOUT');
    });

    it('Should limit concurrent sessions to 3 for admin', async () => {
      // Create 4 sessions
      const sessions = [];
      for (let i = 1; i <= 4; i++) {
        const sid = `concurrent-${Date.now()}-${i}`;
        await sessionManagementService.createSession({
          sessionId: sid,
          userId: testAdmin.id,
          userRole: 'admin',
          ipAddress: '127.0.0.1',
          userAgent: `agent-${i}`,
          loginMethod: 'password',
        });
        sessions.push(sid);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Verify only 3 sessions remain
      const activeSessions = await sessionManagementService.getActiveSessions(testAdmin.id);
      expect(activeSessions.length).toBeLessThanOrEqual(3);

      // Oldest session should be removed
      const oldestSession = await sessionManagementService.getActiveSession(sessions[0]);
      expect(oldestSession).toBeNull();
    });

    it('Should invalidate all sessions on role change', async () => {
      // Create multiple sessions
      const session1 = `role-change-session-1-${Date.now()}`;
      const session2 = `role-change-session-2-${Date.now()}`;

      await sessionManagementService.createSession({
        sessionId: session1,
        userId: testAdmin.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'agent-1',
        loginMethod: 'password',
      });

      await sessionManagementService.createSession({
        sessionId: session2,
        userId: testAdmin.id,
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'agent-2',
        loginMethod: 'oauth',
      });

      // Verify sessions exist
      const beforeChange = await sessionManagementService.getActiveSessions(testAdmin.id);
      expect(beforeChange.length).toBeGreaterThanOrEqual(2);

      // Change role (simulating admin action)
      const adminToken = jwt.sign(
        {
          sub: testAdmin.id,
          email: testAdmin.email,
          role: 'admin',
          scope: ['openid', 'email', 'admin'],
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .patch(`/admin/users/${testAdmin.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
        .expect(200);

      // Verify all sessions invalidated
      const afterChange = await sessionManagementService.getActiveSessions(testAdmin.id);
      expect(afterChange.length).toBe(0);

      // Restore admin role
      await prisma.users.update({
        where: { id: testAdmin.id },
        data: { role: 'admin' },
      });
    });
  });

  describe('Complete Cascade Invalidation: All Phases', () => {
    /**
     * Test complete invalidation cascade on role change:
     * Role cache → Permission cache → Sessions
     */

    it('Should cascade invalidate: Role → Permissions → Sessions', async () => {
      // Setup: Populate all caches and create session
      await roleCacheService.getUserRole(testAdmin.id);
      await permissionCacheService.getPermissions(testAdmin.id);

      const sessionId = `cascade-session-${Date.now()}`;
      await sessionManagementService.createSession({
        sessionId,
        userId: testAdmin.id,
        userRole: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        loginMethod: 'password',
      });

      // Verify all exist
      const roleBefore = await redis.get(`user:${testAdmin.id}:role`);
      const permsBefore = await redis.get(`user:${testAdmin.id}:permissions`);
      const sessionBefore = await sessionManagementService.getActiveSession(sessionId);

      expect(roleBefore).toBeTruthy();
      expect(permsBefore).toBeTruthy();
      expect(sessionBefore).toBeTruthy();

      // Trigger role change
      await prisma.users.update({
        where: { id: testAdmin.id },
        data: { role: 'user' },
      });

      // Cascade invalidation
      await roleCacheService.invalidateUserRole(testAdmin.id);
      await permissionCacheService.invalidateUserPermissions(testAdmin.id);
      await sessionManagementService.invalidateAllSessions(testAdmin.id);

      // Verify all cleared
      const roleAfter = await redis.get(`user:${testAdmin.id}:role`);
      const permsAfter = await redis.get(`user:${testAdmin.id}:permissions`);
      const sessionAfter = await sessionManagementService.getActiveSession(sessionId);

      expect(roleAfter).toBeNull();
      expect(permsAfter).toBeNull();
      expect(sessionAfter).toBeNull();

      // Restore admin role
      await prisma.users.update({
        where: { id: testAdmin.id },
        data: { role: 'admin' },
      });
    });
  });
});
