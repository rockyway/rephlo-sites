/**
 * Authentication Service (Refactored with DI)
 *
 * Handles user authentication logic including:
 * - User registration and login
 * - Password hashing and verification
 * - Email verification
 * - Session management
 * - Account lookup for OIDC provider
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, users } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { IAuthService } from '../interfaces';

const BCRYPT_SALT_ROUNDS = 12;

@injectable()
export class AuthService implements IAuthService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('AuthService: Initialized');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<users | null> {
    try {
      return await this.prisma.users.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error('AuthService: findByEmail failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<users | null> {
    try {
      return await this.prisma.users.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      logger.error('AuthService: findById failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Create a new user account
   */
  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<users> {
    try {
      const password_hash = data.password
        ? await this.hashPassword(data.password)
        : null;

      const user = await this.prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: data.email.toLowerCase(),
          password_hash,
          first_name: data.firstName,
          last_name: data.lastName,
          username: data.username,
          email_verified: false,
          is_active: true,
          updated_at: new Date(),
        },
      });

      logger.info('AuthService: user created', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('AuthService: createUser failed', {
        email: data.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   * @returns User object if authentication succeeds, null otherwise
   */
  async authenticate(
    email: string,
    password: string
  ): Promise<users | null> {
    try {
      const user = await this.findByEmail(email);

      if (!user) {
        logger.warn('Login failed: User not found', { email });
        return null;
      }

      if (!user.is_active) {
        logger.warn('Login failed: Account inactive', { userId: user.id });
        return null;
      }

      if (!user.password_hash) {
        logger.warn('Login failed: Password not set (OAuth-only account)', { userId: user.id });
        return null;
      }

      const isPasswordValid = await this.verifyPassword(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        logger.warn('Login failed: Invalid password', { userId: user.id });
        return null;
      }

      // Update last login timestamp
      await this.updateLastLogin(user.id);

      logger.info('Login success', { userId: user.id });

      return user;
    } catch (error) {
      logger.error('AuthService: authenticate failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Find or create user by account ID (for OIDC provider)
   * The accountId is the user's UUID
   */
  async findAccount(accountId: string): Promise<{
    accountId: string;
    claims: (use: string, scope: string) => Promise<any>;
  } | undefined> {
    try {
      const user = await this.findById(accountId);

      if (!user) {
        return undefined;
      }

      return {
        accountId: user.id,
        claims: async (_use: string, scope: string) => {
          return this.getClaimsForUser(user, scope);
        },
      };
    } catch (error) {
      logger.error('AuthService: findAccount failed', {
        accountId,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Get OIDC claims for a user based on requested scope
   */
  private getClaimsForUser(user: users, scope: string): Record<string, any> {
    const scopes = scope.split(' ');
    const claims: Record<string, any> = {
      sub: user.id,
    };

    // openid scope (always included)
    // sub is always present

    // email scope
    if (scopes.includes('email')) {
      claims.email = user.email;
      claims.email_verified = user.email_verified;
    }

    // profile scope
    if (scopes.includes('profile')) {
      if (user.first_name || user.last_name) {
        claims.name = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(' ');
      }
      if (user.first_name) claims.given_name = user.first_name;
      if (user.last_name) claims.family_name = user.last_name;
      if (user.username) claims.preferred_username = user.username;
      if (user.profile_picture_url) claims.picture = user.profile_picture_url;
      claims.updated_at = Math.floor(user.updated_at.getTime() / 1000);
    }

    // Custom scopes (user.info)
    if (scopes.includes('user.info')) {
      claims.created_at = Math.floor(user.created_at.getTime() / 1000);
      claims.last_login_at = user.last_login_at
        ? Math.floor(user.last_login_at.getTime() / 1000)
        : null;
      claims.is_active = user.is_active;
    }

    return claims;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('AuthService: password verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { last_login_at: new Date() },
      });
    } catch (error) {
      logger.error('AuthService: updateLastLogin failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Mark email as verified
   */
  async verifyEmail(userId: string): Promise<void> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { email_verified: true },
      });

      logger.info('AuthService: email verified', { userId });
    } catch (error) {
      logger.error('AuthService: verifyEmail failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    try {
      const password_hash = await this.hashPassword(newPassword);

      await this.prisma.users.update({
        where: { id: userId },
        data: { password_hash },
      });

      logger.info('AuthService: password updated', { userId });
    } catch (error) {
      logger.error('AuthService: updatePassword failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { is_active: false },
      });

      logger.info('AuthService: account deactivated', { userId });
    } catch (error) {
      logger.error('AuthService: deactivateAccount failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Soft delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: {
          is_active: false,
          deleted_at: new Date(),
        },
      });

      logger.info('AuthService: account deleted (soft)', { userId });
    } catch (error) {
      logger.error('AuthService: deleteAccount failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if email is available (not taken)
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user === null;
  }

  /**
   * Get user statistics (for admin)
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    verified: number;
    inactive: number;
  }> {
    try {
      const [total, active, verified, inactive] = await Promise.all([
        this.prisma.users.count(),
        this.prisma.users.count({ where: { is_active: true } }),
        this.prisma.users.count({ where: { email_verified: true } }),
        this.prisma.users.count({ where: { is_active: false } }),
      ]);

      return { total, active, verified, inactive };
    } catch (error) {
      logger.error('AuthService: getUserStats failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
