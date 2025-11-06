import { User } from '@prisma/client';

export const IAuthService = Symbol('IAuthService');

export interface IAuthService {
  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by ID
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Create a new user account
   */
  createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<User>;

  /**
   * Authenticate user with email and password
   */
  authenticate(email: string, password: string): Promise<User | null>;

  /**
   * Find or create user by account ID (for OIDC provider)
   */
  findAccount(accountId: string): Promise<{
    accountId: string;
    claims: (use: string, scope: string) => Promise<any>;
  } | undefined>;

  /**
   * Hash password using bcrypt
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify password against hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Update user's last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Mark email as verified
   */
  verifyEmail(userId: string): Promise<void>;

  /**
   * Update user password
   */
  updatePassword(userId: string, newPassword: string): Promise<void>;

  /**
   * Deactivate user account
   */
  deactivateAccount(userId: string): Promise<void>;

  /**
   * Soft delete user account
   */
  deleteAccount(userId: string): Promise<void>;

  /**
   * Check if email is available (not taken)
   */
  isEmailAvailable(email: string): Promise<boolean>;

  /**
   * Get user statistics (for admin)
   */
  getUserStats(): Promise<{
    total: number;
    active: number;
    verified: number;
    inactive: number;
  }>;
}
