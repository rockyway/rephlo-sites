/**
 * SessionManagementService Unit Tests
 *
 * Tests Redis-based session tracking functionality for Phase 5
 * Part of Plan 126/127 - Identity Provider Enhancement
 */

import { SessionManagementService, CreateSessionData, SessionMetadata } from '../session-management.service';
import Redis from 'ioredis';

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Mock Redis client
    mockRedis = {
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
      zadd: jest.fn(),
      zrange: jest.fn(),
      zrem: jest.fn(),
      keys: jest.fn(),
    } as any;

    service = new SessionManagementService(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session with metadata and enforce limits', async () => {
      const data: CreateSessionData = {
        userId: 'user-123',
        sessionId: 'session-abc',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        loginMethod: 'password',
        ttlSeconds: 14400, // 4 hours
      };

      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zrange.mockResolvedValue([]);

      const session = await service.createSession(data);

      expect(session.sessionId).toBe(data.sessionId);
      expect(session.userId).toBe(data.userId);
      expect(session.userRole).toBe('admin');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:session-abc',
        14400,
        expect.any(String)
      );
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'user:user-123:sessions',
        expect.any(Number),
        'session-abc'
      );
    });

    it('should store correct session metadata', async () => {
      const data: CreateSessionData = {
        userId: 'user-123',
        sessionId: 'session-abc',
        userRole: 'user',
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120.0',
        loginMethod: 'oauth',
        ttlSeconds: 86400,
      };

      mockRedis.setex.mockImplementation((key, ttl, value) => {
        const stored: SessionMetadata = JSON.parse(value);
        expect(stored.ipAddress).toBe('10.0.0.1');
        expect(stored.userAgent).toBe('Chrome/120.0');
        expect(stored.loginMethod).toBe('oauth');
        expect(stored.expiresAt).toBeGreaterThan(Date.now());
        return Promise.resolve('OK');
      });
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zrange.mockResolvedValue([]);

      await service.createSession(data);

      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('getActiveSession', () => {
    it('should return session metadata for valid session', async () => {
      const now = Date.now();
      const sessionData: SessionMetadata = {
        sessionId: 'session-123',
        userId: 'user-456',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Firefox',
        createdAt: now - 60000,
        lastActivityAt: now - 10000,
        loginMethod: 'mfa',
        expiresAt: now + 3600000,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await service.getActiveSession('session-123');

      expect(result).toEqual(sessionData);
      expect(mockRedis.get).toHaveBeenCalledWith('session:session-123');
    });

    it('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getActiveSession('invalid-session');

      expect(result).toBeNull();
    });

    it('should invalidate expired session and return null', async () => {
      const expiredSession: SessionMetadata = {
        sessionId: 'expired-session',
        userId: 'user-789',
        userRole: 'user',
        ipAddress: '10.0.0.1',
        userAgent: 'Safari',
        createdAt: Date.now() - 7200000,
        lastActivityAt: Date.now() - 3600000,
        loginMethod: 'password',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(expiredSession));
      mockRedis.get.mockResolvedValueOnce(null); // After invalidation
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      const result = await service.getActiveSession('expired-session');

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('session:expired-session');
    });
  });

  describe('updateSessionActivity', () => {
    it('should update last activity timestamp', async () => {
      const now = Date.now();
      const sessionData: SessionMetadata = {
        sessionId: 'session-123',
        userId: 'user-456',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: now - 60000,
        lastActivityAt: now - 30000,
        loginMethod: 'password',
        expiresAt: now + 3600000,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.ttl.mockResolvedValue(3000);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.updateSessionActivity('session-123');

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return false for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.updateSessionActivity('invalid-session');

      expect(result).toBe(false);
    });
  });

  describe('invalidateSession', () => {
    it('should delete session and remove from user sessions list', async () => {
      const sessionData: SessionMetadata = {
        sessionId: 'session-123',
        userId: 'user-456',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        loginMethod: 'password',
        expiresAt: Date.now() + 3600000,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      const result = await service.invalidateSession('session-123');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('session:session-123');
      expect(mockRedis.zrem).toHaveBeenCalledWith('user:user-456:sessions', 'session-123');
    });
  });

  describe('invalidateAllSessions', () => {
    it('should invalidate all sessions for a user', async () => {
      const sessions: SessionMetadata[] = [
        {
          sessionId: 'session-1',
          userId: 'user-123',
          userRole: 'admin',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          loginMethod: 'password',
          expiresAt: Date.now() + 3600000,
        },
        {
          sessionId: 'session-2',
          userId: 'user-123',
          userRole: 'admin',
          ipAddress: '192.168.1.2',
          userAgent: 'Firefox',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          loginMethod: 'password',
          expiresAt: Date.now() + 3600000,
        },
      ];

      mockRedis.zrange.mockResolvedValue(['session-1', 'session-2']);
      mockRedis.get.mockImplementation((key) => {
        if (key === 'session:session-1') return Promise.resolve(JSON.stringify(sessions[0]));
        if (key === 'session:session-2') return Promise.resolve(JSON.stringify(sessions[1]));
        return Promise.resolve(null);
      });
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      const count = await service.invalidateAllSessions('user-123');

      expect(count).toBe(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('enforceSessionLimits', () => {
    it('should remove oldest sessions when admin limit exceeded', async () => {
      const now = Date.now();
      const sessions: SessionMetadata[] = [
        {
          sessionId: 'session-1',
          userId: 'admin-123',
          userRole: 'admin',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
          createdAt: now - 120000, // Oldest
          lastActivityAt: now - 10000,
          loginMethod: 'password',
          expiresAt: now + 3600000,
        },
        {
          sessionId: 'session-2',
          userId: 'admin-123',
          userRole: 'admin',
          ipAddress: '192.168.1.2',
          userAgent: 'Firefox',
          createdAt: now - 60000,
          lastActivityAt: now - 5000,
          loginMethod: 'password',
          expiresAt: now + 3600000,
        },
        {
          sessionId: 'session-3',
          userId: 'admin-123',
          userRole: 'admin',
          ipAddress: '192.168.1.3',
          userAgent: 'Safari',
          createdAt: now - 30000,
          lastActivityAt: now - 2000,
          loginMethod: 'mfa',
          expiresAt: now + 3600000,
        },
        {
          sessionId: 'session-4',
          userId: 'admin-123',
          userRole: 'admin',
          ipAddress: '192.168.1.4',
          userAgent: 'Edge',
          createdAt: now, // Newest
          lastActivityAt: now,
          loginMethod: 'oauth',
          expiresAt: now + 3600000,
        },
      ];

      mockRedis.zrange.mockResolvedValue(['session-1', 'session-2', 'session-3', 'session-4']);
      mockRedis.get.mockImplementation((key) => {
        const sessionIndex = parseInt(key.split('-')[1]) - 1;
        return Promise.resolve(JSON.stringify(sessions[sessionIndex]));
      });
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      await service.enforceSessionLimits('admin-123', 'admin');

      // Should delete the oldest session (session-1) to stay within limit of 3
      expect(mockRedis.del).toHaveBeenCalledWith('session:session-1');
    });

    it('should not remove sessions when under limit', async () => {
      const sessions: SessionMetadata[] = [
        {
          sessionId: 'session-1',
          userId: 'user-123',
          userRole: 'user',
          ipAddress: '192.168.1.1',
          userAgent: 'Chrome',
          createdAt: Date.now() - 60000,
          lastActivityAt: Date.now(),
          loginMethod: 'password',
          expiresAt: Date.now() + 3600000,
        },
      ];

      mockRedis.zrange.mockResolvedValue(['session-1']);
      mockRedis.get.mockResolvedValue(JSON.stringify(sessions[0]));
      mockRedis.del.mockResolvedValue(0);

      await service.enforceSessionLimits('user-123', 'user');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('validateSessionTTL', () => {
    it('should return true for valid session', async () => {
      const sessionData: SessionMetadata = {
        sessionId: 'session-123',
        userId: 'user-456',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: Date.now() - 60000,
        lastActivityAt: Date.now() - 10000,
        loginMethod: 'password',
        expiresAt: Date.now() + 3600000, // Valid for 1 hour
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await service.validateSessionTTL('session-123');

      expect(result).toBe(true);
    });

    it('should return false and invalidate expired session', async () => {
      const expiredSession: SessionMetadata = {
        sessionId: 'expired-session',
        userId: 'user-789',
        userRole: 'user',
        ipAddress: '10.0.0.1',
        userAgent: 'Safari',
        createdAt: Date.now() - 7200000,
        lastActivityAt: Date.now() - 3600000,
        loginMethod: 'password',
        expiresAt: Date.now() - 1000, // Expired
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(expiredSession));
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.zrem.mockResolvedValue(1);

      const result = await service.validateSessionTTL('expired-session');

      expect(result).toBe(false);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const adminSession: SessionMetadata = {
        sessionId: 'admin-session',
        userId: 'admin-user',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        loginMethod: 'mfa',
        expiresAt: Date.now() + 3600000,
      };

      const userSession: SessionMetadata = {
        sessionId: 'user-session',
        userId: 'regular-user',
        userRole: 'user',
        ipAddress: '10.0.0.1',
        userAgent: 'Firefox',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        loginMethod: 'password',
        expiresAt: Date.now() + 86400000,
      };

      mockRedis.keys.mockResolvedValue(['session:admin-session', 'session:user-session']);
      mockRedis.get.mockImplementation((key) => {
        if (key === 'session:admin-session') return Promise.resolve(JSON.stringify(adminSession));
        if (key === 'session:user-session') return Promise.resolve(JSON.stringify(userSession));
        return Promise.resolve(null);
      });

      const stats = await service.getSessionStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.adminSessions).toBe(1);
      expect(stats.userSessions).toBe(1);
    });
  });
});
