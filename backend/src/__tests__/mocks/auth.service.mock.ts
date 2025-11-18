import { users } from '@prisma/client';
import { IAuthService } from '../../interfaces';

export class MockAuthService implements IAuthService {
  private users: Map<string, users> = new Map();
  private emailIndex: Map<string, users> = new Map();

  async findByEmail(email: string): Promise<users | null> {
    return this.emailIndex.get(email.toLowerCase()) || null;
  }

  async findById(userId: string): Promise<users | null> {
    return this.users.get(userId) || null;
  }

  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<users> {
    const user: users = {
      id: `mock-user-${Date.now()}-${Math.random()}`,
      email: data.email.toLowerCase(),
      password_hash: data.password ? `hashed-${data.password}` : null,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      username: data.username || null,
      email_verified: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
      deleted_at: null,
      profile_picture_url: null,
      // Email verification fields
      email_verification_token: null,
      email_verification_token_expiry: null,
      // Password reset fields
      password_reset_token: null,
      password_reset_token_expiry: null,
      // Account management fields
      deactivated_at: null,
      // Social auth fields
      google_id: null,
      google_profile_url: null,
      auth_provider: 'local',
      // Security/audit fields
      last_password_change: null,
      password_reset_count: 0,
      // Role-based access control
      role: 'user',
      // Multi-Factor Authentication Fields (Phase 4)
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: '',
      mfa_verified_at: null,
      mfa_method: 'totp',
      // User Status and Suspension Fields (Gap Closure)
      status: 'active',
      suspended_until: null,
      banned_at: null,
      lifetime_value: 0,
      has_active_perpetual_license: false,
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user);

    return user;
  }

  async authenticate(email: string, password: string): Promise<users | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.password_hash) return null;

    // Simulate password verification
    if (user.password_hash === `hashed-${password}`) {
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
        email_verified: user.email_verified,
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
      user.last_login_at = new Date();
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.email_verified = true;
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password_hash = await this.hashPassword(newPassword);
    }
  }

  async deactivateAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.is_active = false;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.is_active = false;
      user.deleted_at = new Date();
    }
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    return !this.emailIndex.has(email.toLowerCase());
  }

  async getUserStats(): Promise<any> {
    return {
      total: this.users.size,
      active: Array.from(this.users.values()).filter((u) => u.is_active).length,
      verified: Array.from(this.users.values()).filter((u) => u.email_verified).length,
      inactive: Array.from(this.users.values()).filter((u) => !u.is_active).length,
    };
  }

  // Test helpers
  clear() {
    this.users.clear();
    this.emailIndex.clear();
  }

  seed(users: users[]) {
    users.forEach((user) => {
      this.users.set(user.id, user);
      this.emailIndex.set(user.email.toLowerCase(), user);
    });
  }

  getAll(): users[] {
    return Array.from(this.users.values());
  }
}
