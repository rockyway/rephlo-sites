import { IUserService } from '../../interfaces';

export class MockUserService implements IUserService {
  private profiles: Map<string, any> = new Map();
  private preferences: Map<string, any> = new Map();
  private defaultModels: Map<string, string> = new Map();

  async getUserProfile(userId: string): Promise<any> {
    return this.profiles.get(userId) || null;
  }

  async updateUserProfile(userId: string, data: any): Promise<any> {
    const existing = this.profiles.get(userId) || { userId };
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.profiles.set(userId, updated);
    return updated;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.lastLoginAt = new Date();
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.emailVerified = true;
    }
  }

  async getUserPreferences(userId: string): Promise<any> {
    return this.preferences.get(userId) || {};
  }

  async updateUserPreferences(userId: string, data: any): Promise<any> {
    const existing = this.preferences.get(userId) || {};
    const updated = { ...existing, ...data };
    this.preferences.set(userId, updated);
    return updated;
  }

  async setDefaultModel(userId: string, modelId: string): Promise<any> {
    this.defaultModels.set(userId, modelId);
    return { userId, defaultModel: modelId };
  }

  async getDefaultModel(userId: string): Promise<any> {
    const modelId = this.defaultModels.get(userId);
    return modelId ? { userId, defaultModel: modelId } : null;
  }

  async isUserActive(userId: string): Promise<boolean> {
    const profile = this.profiles.get(userId);
    return profile ? profile.isActive !== false : false;
  }

  async softDeleteUser(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.isActive = false;
      profile.deletedAt = new Date();
    }
  }

  // Test helpers
  clear() {
    this.profiles.clear();
    this.preferences.clear();
    this.defaultModels.clear();
  }

  seed(profiles: any[]) {
    profiles.forEach((profile) => this.profiles.set(profile.userId, profile));
  }
}
