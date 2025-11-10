import { User } from '@prisma/client';
import { IAuthService } from '../../interfaces';

export class MockAuthService implements IAuthService {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, User> = new Map();

  async findByEmail(email: string): Promise<User | null> {
    return this.emailIndex.get(email.toLowerCase()) || null;
  }

  async findById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<User> {
    const user: User = {
      id: `mock-user-${Date.now()}-${Math.random()}`,
      email: data.email.toLowerCase(),
      passwordHash: data.password ? `hashed-${data.password}` : null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      username: data.username || null,
      emailVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      deletedAt: null,
      profilePictureUrl: null,
      // Email verification fields
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      // Password reset fields
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
      // Account management fields
      deactivatedAt: null,
      // Social auth fields
      googleId: null,
      googleProfileUrl: null,
      authProvider: 'local',
      // Security/audit fields
      lastPasswordChange: null,
      passwordResetCount: 0,
      // Role-based access control
      role: 'user',
      // Multi-Factor Authentication Fields (Phase 4)
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: '',
      mfaVerifiedAt: null,
      mfaMethod: 'totp',
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user);

    return user;
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    // Simulate password verification
    if (user.passwordHash === `hashed-${password}`) {
      return user;
    }

    return null;
  }

  async findAccount(accountId: string): Promise<any> {
    const user = await this.findById(accountId);
    if (!user) return undefined;

    return {
      accountId: user.id,
      claims: async (_use: string, _scope: string) => ({
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified,
      }),
    };
  }

  async hashPassword(password: string): Promise<string> {
    return `hashed-${password}`;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return hash === `hashed-${password}`;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = new Date();
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.emailVerified = true;
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = await this.hashPassword(newPassword);
    }
  }

  async deactivateAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
      user.deletedAt = new Date();
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    return !this.emailIndex.has(email.toLowerCase());
  }

  async getUserStats(): Promise<any> {
    return {
      total: this.users.size,
      active: Array.from(this.users.values()).filter((u) => u.isActive).length,
      verified: Array.from(this.users.values()).filter((u) => u.emailVerified).length,
      inactive: Array.from(this.users.values()).filter((u) => !u.isActive).length,
    };
  }

  // Test helpers
  clear() {
    this.users.clear();
    this.emailIndex.clear();
  }

  seed(users: User[]) {
    users.forEach((user) => {
      this.users.set(user.id, user);
      this.emailIndex.set(user.email.toLowerCase(), user);
    });
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }
}
