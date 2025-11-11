import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../../../src/services/user.service';
import { getTestDatabase, cleanDatabase } from '../../setup/database';
import { createTestUser, createTestUserPreferences } from '../../helpers/factories';

describe('UserService', () => {
  let prisma: PrismaClient;
  let userService: UserService;

  beforeEach(async () => {
    prisma = getTestDatabase();
    userService = new UserService(prisma);
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ===========================================================================
  // User Profile Operations
  // ===========================================================================

  describe('getUserProfile', () => {
    it('should get user profile by ID', async () => {
      const user = await createTestUser(prisma, {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      });

      const profile = await userService.getUserProfile(user.id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(user.id);
      expect(profile.email).toBe('test@example.com');
      expect(profile.username).toBe('testuser');
      expect(profile.firstName).toBe('Test');
      expect(profile.lastName).toBe('User');
      expect(profile.emailVerified).toBe(true);
      expect(profile.createdAt).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.getUserProfile('non-existent-id')).rejects.toThrow(
        'User not found'
      );
    });

    it('should include lastLoginAt if set', async () => {
      const user = await createTestUser(prisma, {
        lastLoginAt: new Date('2024-01-15T10:00:00Z'),
      });

      const profile = await userService.getUserProfile(user.id);

      expect(profile.lastLoginAt).toBeTruthy();
    });

    it('should handle user with null lastLoginAt', async () => {
      const user = await createTestUser(prisma, {
        lastLoginAt: null,
      });

      const profile = await userService.getUserProfile(user.id);

      expect(profile.lastLoginAt).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user firstName and lastName', async () => {
      const user = await createTestUser(prisma, {
        firstName: 'Old',
        lastName: 'Name',
      });

      const updated = await userService.updateUserProfile(user.id, {
        firstName: 'New',
        lastName: 'Name',
      });

      expect(updated.firstName).toBe('New');
      expect(updated.lastName).toBe('Name');
    });

    it('should update username', async () => {
      const user = await createTestUser(prisma, {
        username: 'oldusername',
      });

      const updated = await userService.updateUserProfile(user.id, {
        username: 'newusername',
      });

      expect(updated.username).toBe('newusername');
    });

    it('should update partial fields', async () => {
      const user = await createTestUser(prisma, {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      const updated = await userService.updateUserProfile(user.id, {
        firstName: 'Jane',
      });

      expect(updated.firstName).toBe('Jane');
      expect(updated.lastName).toBe('Doe'); // Unchanged
      expect(updated.username).toBe('johndoe'); // Unchanged
    });

    it('should throw error for duplicate username', async () => {
      await createTestUser(prisma, { username: 'existinguser' });
      const user2 = await createTestUser(prisma, { username: 'user2' });

      await expect(
        userService.updateUserProfile(user2.id, { username: 'existinguser' })
      ).rejects.toThrow('Username already taken');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.updateUserProfile('non-existent-id', {
          firstName: 'Test',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const user = await createTestUser(prisma, {
        lastLoginAt: null,
      });

      await userService.updateLastLogin(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updated?.lastLoginAt).toBeTruthy();
    });

    it('should not throw error for non-existent user', async () => {
      // Should silently fail since it's non-critical
      await expect(
        userService.updateLastLogin('non-existent-id')
      ).resolves.not.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email', async () => {
      const user = await createTestUser(prisma, {
        emailVerified: false,
      });

      await userService.verifyEmail(user.id);

      const updated = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updated?.emailVerified).toBe(true);
    });
  });

  // ===========================================================================
  // User Preferences Operations
  // ===========================================================================

  describe('getUserPreferences', () => {
    it('should get existing user preferences', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id, {
        defaultModelId: 'gpt-5',
        enableStreaming: true,
        maxTokens: 2048,
        temperature: 0.8,
      });

      const prefs = await userService.getUserPreferences(user.id);

      expect(prefs.defaultModelId).toBe('gpt-5');
      expect(prefs.enableStreaming).toBe(true);
      expect(prefs.maxTokens).toBe(2048);
      expect(prefs.temperature).toBe(0.8);
    });

    it('should create default preferences if none exist', async () => {
      const user = await createTestUser(prisma);

      const prefs = await userService.getUserPreferences(user.id);

      expect(prefs).toBeDefined();
      expect(prefs.defaultModelId).toBeNull();
      expect(prefs.enableStreaming).toBe(true); // Default value
      expect(prefs.maxTokens).toBe(4096); // Default value
      expect(prefs.temperature).toBe(0.7); // Default value
    });

    it('should handle preferencesMetadata', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id, {
        preferencesMetadata: { theme: 'dark', language: 'en' },
      });

      const prefs = await userService.getUserPreferences(user.id);

      expect(prefs.preferencesMetadata).toEqual({ theme: 'dark', language: 'en' });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update enableStreaming', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id, {
        enableStreaming: true,
      });

      const updated = await userService.updateUserPreferences(user.id, {
        enableStreaming: false,
      });

      expect(updated.enableStreaming).toBe(false);
    });

    it('should update maxTokens', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id);

      const updated = await userService.updateUserPreferences(user.id, {
        maxTokens: 8192,
      });

      expect(updated.maxTokens).toBe(8192);
    });

    it('should update temperature', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id);

      const updated = await userService.updateUserPreferences(user.id, {
        temperature: 0.9,
      });

      expect(updated.temperature).toBe(0.9);
    });

    it('should update preferencesMetadata', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id);

      const updated = await userService.updateUserPreferences(user.id, {
        preferencesMetadata: { customSetting: 'value' },
      });

      expect(updated.preferencesMetadata).toEqual({ customSetting: 'value' });
    });

    it('should update multiple fields at once', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id);

      const updated = await userService.updateUserPreferences(user.id, {
        enableStreaming: false,
        maxTokens: 1024,
        temperature: 0.5,
      });

      expect(updated.enableStreaming).toBe(false);
      expect(updated.maxTokens).toBe(1024);
      expect(updated.temperature).toBe(0.5);
    });

    it('should create preferences if they do not exist', async () => {
      const user = await createTestUser(prisma);

      const updated = await userService.updateUserPreferences(user.id, {
        maxTokens: 2048,
      });

      expect(updated.maxTokens).toBe(2048);
    });
  });

  describe('setDefaultModel', () => {
    it('should set default model', async () => {
      const user = await createTestUser(prisma);

      // Create a model first
      const model = await prisma.model.create({
        data: {
          id: 'gpt-5',
          displayName: 'GPT-5',
          modelProvider: 'openai',
          creditsPerKToken: 2,
          contextWindow: 128000,
          capabilities: ['chat', 'completion'],
          isAvailable: true,
        },
      });

      const result = await userService.setDefaultModel(user.id, model.id);

      expect(result.defaultModelId).toBe('gpt-5');
      expect(result.model).toBeDefined();
      expect(result.model?.id).toBe('gpt-5');
      expect(result.model?.name).toBe('GPT-5');
    });

    it('should throw error for non-existent model', async () => {
      const user = await createTestUser(prisma);

      await expect(
        userService.setDefaultModel(user.id, 'non-existent-model')
      ).rejects.toThrow("Model 'non-existent-model' does not exist");
    });

    it('should throw error for unavailable model', async () => {
      const user = await createTestUser(prisma);

      const model = await prisma.model.create({
        data: {
          id: 'unavailable-model',
          displayName: 'Unavailable Model',
          modelProvider: 'openai',
          creditsPerKToken: 2,
          contextWindow: 128000,
          capabilities: ['chat'],
          isAvailable: false,
        },
      });

      await expect(
        userService.setDefaultModel(user.id, model.id)
      ).rejects.toThrow("Model 'unavailable-model' is not available");
    });

    it('should create preferences if they do not exist', async () => {
      const user = await createTestUser(prisma);

      const model = await prisma.model.create({
        data: {
          id: 'claude-3.5-sonnet',
          displayName: 'Claude 3.5 Sonnet',
          modelProvider: 'anthropic',
          creditsPerKToken: 3,
          contextWindow: 200000,
          capabilities: ['chat', 'completion'],
          isAvailable: true,
        },
      });

      const result = await userService.setDefaultModel(user.id, model.id);

      expect(result.defaultModelId).toBe('claude-3.5-sonnet');
    });
  });

  describe('getDefaultModel', () => {
    it('should get default model', async () => {
      const user = await createTestUser(prisma);

      const model = await prisma.model.create({
        data: {
          id: 'gpt-5',
          displayName: 'GPT-5',
          modelProvider: 'openai',
          creditsPerKToken: 2,
          contextWindow: 128000,
          capabilities: ['chat', 'completion'],
          isAvailable: true,
        },
      });

      await createTestUserPreferences(prisma, user.id, {
        defaultModelId: model.id,
      });

      const result = await userService.getDefaultModel(user.id);

      expect(result.defaultModelId).toBe('gpt-5');
      expect(result.model).toBeDefined();
      expect(result.model?.id).toBe('gpt-5');
      expect(result.model?.name).toBe('GPT-5');
    });

    it('should return null when no default model is set', async () => {
      const user = await createTestUser(prisma);
      await createTestUserPreferences(prisma, user.id, {
        defaultModelId: null,
      });

      const result = await userService.getDefaultModel(user.id);

      expect(result.defaultModelId).toBeNull();
      expect(result.model).toBeNull();
    });

    it('should return null when preferences do not exist', async () => {
      const user = await createTestUser(prisma);

      const result = await userService.getDefaultModel(user.id);

      expect(result.defaultModelId).toBeNull();
      expect(result.model).toBeNull();
    });
  });

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  describe('isUserActive', () => {
    it('should return true for active user', async () => {
      const user = await createTestUser(prisma, {
        isActive: true,
        deletedAt: null,
      });

      const isActive = await userService.isUserActive(user.id);

      expect(isActive).toBe(true);
    });

    it('should return false for inactive user', async () => {
      const user = await createTestUser(prisma, {
        isActive: false,
      });

      const isActive = await userService.isUserActive(user.id);

      expect(isActive).toBe(false);
    });

    it('should return false for deleted user', async () => {
      const user = await createTestUser(prisma, {
        isActive: true,
        deletedAt: new Date(),
      });

      const isActive = await userService.isUserActive(user.id);

      expect(isActive).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const isActive = await userService.isUserActive('non-existent-id');

      expect(isActive).toBe(false);
    });
  });

  describe('softDeleteUser', () => {
    it('should soft delete user', async () => {
      const user = await createTestUser(prisma, {
        isActive: true,
        deletedAt: null,
      });

      await userService.softDeleteUser(user.id);

      const deleted = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deleted?.isActive).toBe(false);
      expect(deleted?.deletedAt).toBeTruthy();
    });

    it('should set deletedAt timestamp', async () => {
      const user = await createTestUser(prisma);

      const beforeDelete = new Date();
      await userService.softDeleteUser(user.id);
      const afterDelete = new Date();

      const deleted = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.deletedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeDelete.getTime()
      );
      expect(deleted?.deletedAt!.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
    });
  });
});
