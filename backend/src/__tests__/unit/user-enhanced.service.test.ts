/**
 * Unit Tests for Enhanced UserService (Phase 2)
 *
 * Tests for new method:
 * - getDetailedUserProfile
 */

import 'reflect-metadata';
import { createTestContainer, resetTestContainer, getMockServices } from '../test-container';
import { MockUserService } from '../mocks/user.service.mock';
import { DependencyContainer } from 'tsyringe';

describe('UserService - Enhanced Methods (Phase 2)', () => {
  let testContainer: DependencyContainer;
  let userService: MockUserService;

  beforeEach(() => {
    testContainer = createTestContainer();
    const mocks = getMockServices(testContainer);
    userService = mocks.userService;
  });

  afterEach(() => {
    userService.clear();
    resetTestContainer(testContainer);
  });

  describe('getDetailedUserProfile', () => {
    it('should return complete user profile', async () => {
      const mockProfile = {
        userId: 'user-1',
        email: 'test@example.com',
        displayName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2025-11-06'),
        isActive: true,
      };

      userService.seed([mockProfile]);

      const result = await userService.getDetailedUserProfile('user-1');

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-1');
      expect(result!.email).toBe('test@example.com');
      expect(result!.subscription.tier).toBe('free');
      expect(result!.subscription.status).toBe('active');
      expect(result!.preferences.emailNotifications).toBe(true);
      expect(result!.preferences.usageAlerts).toBe(true);
    });

    it('should return null for non-existent user', async () => {
      const result = await userService.getDetailedUserProfile('non-existent');

      expect(result).toBeNull();
    });

    it('should handle default subscription and preferences', async () => {
      const mockProfile = {
        userId: 'user-1',
        email: 'test@example.com',
        createdAt: new Date(),
        lastLoginAt: null,
        isActive: true,
      };

      userService.seed([mockProfile]);

      const result = await userService.getDetailedUserProfile('user-1');

      expect(result!.subscription.tier).toBe('free');
      expect(result!.subscription.status).toBe('active');
      expect(result!.preferences.defaultModel).toBeNull();
      expect(result!.preferences.emailNotifications).toBe(true);
    });
  });
});
