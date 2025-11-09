/**
 * Session Management Service
 *
 * Implements Redis-based session tracking for admin users
 * Part of Phase 5 - Admin Session Management (Plan 126/127)
 *
 * Features:
 * - Session creation with metadata (IP, user agent, login time)
 * - Session activity tracking (last activity timestamp)
 * - Session retrieval and validation
 * - Single session invalidation (logout)
 * - Bulk session invalidation (logout all sessions for user)
 * - Concurrent session limit enforcement (max 3 for admins)
 * - Session TTL validation
 * - Comprehensive audit logging
 *
 * Performance Impact:
 * - Enhances security for admin users
 * - Prevents session sharing and unauthorized access
 * - Reduces attack window with shorter session TTL
 */

import { injectable, inject } from 'tsyringe';
import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * Session metadata stored in Redis
 */
export interface SessionMetadata {
  sessionId: string;
  userId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number; // Unix timestamp
  lastActivityAt: number; // Unix timestamp
  loginMethod: 'password' | 'oauth' | 'mfa';
  expiresAt: number; // Unix timestamp
}

/**
 * Session creation data
 */
export interface CreateSessionData {
  userId: string;
  sessionId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  loginMethod: 'password' | 'oauth' | 'mfa';
  ttlSeconds: number; // Session TTL in seconds
}

@injectable()
export class SessionManagementService {
  private readonly SESSION_KEY_PREFIX = 'session:';
  private readonly USER_SESSIONS_KEY_PREFIX = 'user:';
  private readonly USER_SESSIONS_KEY_SUFFIX = ':sessions';
  private readonly MAX_ADMIN_SESSIONS = 3;
  private readonly MAX_USER_SESSIONS = 10; // Regular users can have more concurrent sessions

  constructor(
    @inject('RedisConnection') private redis: Redis,
  ) {
    logger.debug('SessionManagementService: Initialized');
  }

  /**
   * Create new session with metadata
   * Enforces concurrent session limits for admin users
   *
   * @param data - Session creation data
   * @returns Created session metadata
   */
  async createSession(data: CreateSessionData): Promise<SessionMetadata> {
    const now = Date.now();
    const expiresAt = now + data.ttlSeconds * 1000;

    const sessionMetadata: SessionMetadata = {
      sessionId: data.sessionId,
      userId: data.userId,
      userRole: data.userRole,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: now,
      lastActivityAt: now,
      loginMethod: data.loginMethod,
      expiresAt,
    };

    try {
      // 1. Store session metadata in Redis
      const sessionKey = `${this.SESSION_KEY_PREFIX}${data.sessionId}`;
      await this.redis.setex(
        sessionKey,
        data.ttlSeconds,
        JSON.stringify(sessionMetadata)
      );

      // 2. Add session to user's session list (sorted set by creation time)
      const userSessionsKey = `${this.USER_SESSIONS_KEY_PREFIX}${data.userId}${this.USER_SESSIONS_KEY_SUFFIX}`;
      await this.redis.zadd(userSessionsKey, now, data.sessionId);

      // 3. Enforce concurrent session limits
      await this.enforceSessionLimits(data.userId, data.userRole);

      logger.info('SessionManagementService: Session created', {
        sessionId: data.sessionId,
        userId: data.userId,
        userRole: data.userRole,
        ipAddress: data.ipAddress,
        loginMethod: data.loginMethod,
        ttlSeconds: data.ttlSeconds,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return sessionMetadata;
    } catch (error) {
      logger.error('SessionManagementService: Failed to create session', {
        sessionId: data.sessionId,
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get active session by session ID
   *
   * @param sessionId - Session identifier
   * @returns Session metadata or null if not found/expired
   */
  async getActiveSession(sessionId: string): Promise<SessionMetadata | null> {
    try {
      const sessionKey = `${this.SESSION_KEY_PREFIX}${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);

      if (!sessionData) {
        logger.debug('SessionManagementService: Session not found', {
          sessionId,
        });
        return null;
      }

      const session: SessionMetadata = JSON.parse(sessionData);

      // Verify session hasn't expired
      if (Date.now() > session.expiresAt) {
        logger.warn('SessionManagementService: Session expired', {
          sessionId,
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
        await this.invalidateSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('SessionManagementService: Failed to get session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Update session activity timestamp
   * Called on each API request to track user activity
   *
   * @param sessionId - Session identifier
   * @returns true if updated successfully
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getActiveSession(sessionId);
      if (!session) {
        return false;
      }

      // Update last activity timestamp
      session.lastActivityAt = Date.now();

      const sessionKey = `${this.SESSION_KEY_PREFIX}${sessionId}`;
      const ttl = await this.redis.ttl(sessionKey);

      if (ttl > 0) {
        await this.redis.setex(
          sessionKey,
          ttl,
          JSON.stringify(session)
        );

        logger.debug('SessionManagementService: Session activity updated', {
          sessionId,
          lastActivityAt: new Date(session.lastActivityAt).toISOString(),
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('SessionManagementService: Failed to update session activity', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Invalidate single session (logout)
   *
   * @param sessionId - Session identifier
   * @returns true if invalidated successfully
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      // Get session to find userId for user sessions list
      const session = await this.getActiveSession(sessionId);

      const sessionKey = `${this.SESSION_KEY_PREFIX}${sessionId}`;
      const deleted = await this.redis.del(sessionKey);

      if (session) {
        // Remove from user's session list
        const userSessionsKey = `${this.USER_SESSIONS_KEY_PREFIX}${session.userId}${this.USER_SESSIONS_KEY_SUFFIX}`;
        await this.redis.zrem(userSessionsKey, sessionId);
      }

      logger.info('SessionManagementService: Session invalidated', {
        sessionId,
        userId: session?.userId,
        deleted: deleted > 0,
      });

      return deleted > 0;
    } catch (error) {
      logger.error('SessionManagementService: Failed to invalidate session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Invalidate all sessions for a user (force logout all devices)
   *
   * @param userId - User identifier
   * @returns Count of sessions invalidated
   */
  async invalidateAllSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.getActiveSessions(userId);
      let invalidatedCount = 0;

      for (const session of sessions) {
        const success = await this.invalidateSession(session.sessionId);
        if (success) {
          invalidatedCount++;
        }
      }

      logger.info('SessionManagementService: All sessions invalidated for user', {
        userId,
        sessionsInvalidated: invalidatedCount,
      });

      return invalidatedCount;
    } catch (error) {
      logger.error('SessionManagementService: Failed to invalidate all sessions', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Get all active sessions for a user
   *
   * @param userId - User identifier
   * @returns Array of active session metadata
   */
  async getActiveSessions(userId: string): Promise<SessionMetadata[]> {
    try {
      const userSessionsKey = `${this.USER_SESSIONS_KEY_PREFIX}${userId}${this.USER_SESSIONS_KEY_SUFFIX}`;

      // Get all session IDs for user (sorted by creation time)
      const sessionIds = await this.redis.zrange(userSessionsKey, 0, -1);

      const sessions: SessionMetadata[] = [];

      for (const sessionId of sessionIds) {
        const session = await this.getActiveSession(sessionId);
        if (session) {
          sessions.push(session);
        } else {
          // Clean up invalid session from user's list
          await this.redis.zrem(userSessionsKey, sessionId);
        }
      }

      logger.debug('SessionManagementService: Retrieved active sessions', {
        userId,
        sessionCount: sessions.length,
      });

      return sessions;
    } catch (error) {
      logger.error('SessionManagementService: Failed to get active sessions', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Validate session TTL (check if session has expired)
   *
   * @param sessionId - Session identifier
   * @returns true if session is valid and not expired
   */
  async validateSessionTTL(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getActiveSession(sessionId);

      if (!session) {
        return false;
      }

      const now = Date.now();
      const isValid = now <= session.expiresAt;

      if (!isValid) {
        logger.warn('SessionManagementService: Session TTL expired', {
          sessionId,
          expiresAt: new Date(session.expiresAt).toISOString(),
          now: new Date(now).toISOString(),
        });
        await this.invalidateSession(sessionId);
      }

      return isValid;
    } catch (error) {
      logger.error('SessionManagementService: Failed to validate session TTL', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Enforce concurrent session limits
   * Admin users: max 3 sessions
   * Regular users: max 10 sessions
   * Removes oldest sessions if limit exceeded
   *
   * @param userId - User identifier
   * @param userRole - User role ('admin' or 'user')
   */
  async enforceSessionLimits(userId: string, userRole: string): Promise<void> {
    try {
      const maxSessions = userRole === 'admin'
        ? this.MAX_ADMIN_SESSIONS
        : this.MAX_USER_SESSIONS;

      const sessions = await this.getActiveSessions(userId);

      if (sessions.length > maxSessions) {
        // Sort by creation time (oldest first)
        const sortedSessions = sessions.sort((a, b) => a.createdAt - b.createdAt);

        // Remove oldest sessions until within limit
        const sessionsToRemove = sortedSessions.slice(0, sessions.length - maxSessions);

        for (const session of sessionsToRemove) {
          await this.invalidateSession(session.sessionId);

          logger.info('SessionManagementService: Session limit enforced - removed oldest session', {
            userId,
            userRole,
            sessionId: session.sessionId,
            createdAt: new Date(session.createdAt).toISOString(),
            maxSessions,
            currentSessions: sessions.length,
          });
        }
      }
    } catch (error) {
      logger.error('SessionManagementService: Failed to enforce session limits', {
        userId,
        userRole,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get session statistics for monitoring
   *
   * @returns Object containing session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    adminSessions: number;
    userSessions: number;
  }> {
    try {
      const sessionKeys = await this.redis.keys(`${this.SESSION_KEY_PREFIX}*`);

      let adminCount = 0;
      let userCount = 0;

      for (const key of sessionKeys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: SessionMetadata = JSON.parse(sessionData);
          if (session.userRole === 'admin') {
            adminCount++;
          } else {
            userCount++;
          }
        }
      }

      return {
        totalSessions: sessionKeys.length,
        adminSessions: adminCount,
        userSessions: userCount,
      };
    } catch (error) {
      logger.error('SessionManagementService: Failed to get session stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        totalSessions: 0,
        adminSessions: 0,
        userSessions: 0,
      };
    }
  }
}
