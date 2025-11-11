import 'reflect-metadata';
import { User } from '@prisma/client';
import { createTestContainer, resetTestContainer, getMockServices } from '../test-container';
import { MockAuthService } from '../mocks/auth.service.mock';
import { DependencyContainer } from 'tsyringe';

describe('AuthService', () => {
  let testContainer: DependencyContainer;
  let authService: MockAuthService;

  beforeEach(() => {
    testContainer = createTestContainer();
    const mocks = getMockServices(testContainer);
    authService = mocks.authService;
  });

  afterEach(() => {
    authService.clear();
    resetTestContainer(testContainer);
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        emailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      const result = await authService.findByEmail('test@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should be case-insensitive', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      const result = await authService.findByEmail('TEST@EXAMPLE.COM');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      // Act
      const result = await authService.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        firstName: 'Test',
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      const result = await authService.findById('user-1');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
    });

    it('should return null if user not found', async () => {
      // Act
      const result = await authService.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user with all fields', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        password: 'SecurePassword123',
        firstName: 'New',
        lastName: 'User',
        username: 'newuser',
      };

      // Act
      const result = await authService.createUser(userData);

      // Assert
      expect(result.email).toBe('new@example.com');
      expect(result.passwordHash).toBe('hashed-SecurePassword123');
      expect(result.firstName).toBe('New');
      expect(result.lastName).toBe('User');
      expect(result.username).toBe('newuser');
      expect(result.emailVerified).toBe(false);
      expect(result.isActive).toBe(true);
    });

    it('should create user with minimal fields', async () => {
      // Arrange
      const userData = {
        email: 'minimal@example.com',
      };

      // Act
      const result = await authService.createUser(userData);

      // Assert
      expect(result.email).toBe('minimal@example.com');
      expect(result.passwordHash).toBeNull();
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.username).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const userData = {
        email: 'UPPER@EXAMPLE.COM',
        password: 'password',
      };

      // Act
      const result = await authService.createUser(userData);

      // Assert
      expect(result.email).toBe('upper@example.com');
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with correct credentials', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-SecurePassword123',
        firstName: 'Test',
        lastName: 'User',
        username: null,
        emailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      const result = await authService.authenticate('test@example.com', 'SecurePassword123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
    });

    it('should reject incorrect password', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-SecurePassword123',
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      const result = await authService.authenticate('test@example.com', 'WrongPassword');

      // Assert
      expect(result).toBeNull();
    });

    it('should reject non-existent user', async () => {
      // Act
      const result = await authService.authenticate('nonexistent@example.com', 'password');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      // Act
      const hash = await authService.hashPassword('MyPassword123');

      // Assert
      expect(hash).toBe('hashed-MyPassword123');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      // Act
      const isValid = await authService.verifyPassword('password', 'hashed-password');

      // Assert
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      // Act
      const isValid = await authService.verifyPassword('wrong', 'hashed-password');

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      await authService.updateLastLogin('user-1');

      // Assert
      const updated = await authService.findById('user-1');
      expect(updated?.lastLoginAt).not.toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      await authService.verifyEmail('user-1');

      // Assert
      const updated = await authService.findById('user-1');
      expect(updated?.emailVerified).toBe(true);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-OldPassword',
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      await authService.updatePassword('user-1', 'NewPassword123');

      // Assert
      const updated = await authService.findById('user-1');
      expect(updated?.passwordHash).toBe('hashed-NewPassword123');
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate user account', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      await authService.deactivateAccount('user-1');

      // Assert
      const updated = await authService.findById('user-1');
      expect(updated?.isActive).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user account', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      await authService.deleteAccount('user-1');

      // Assert
      const updated = await authService.findById('user-1');
      expect(updated?.isActive).toBe(false);
      expect(updated?.deletedAt).not.toBeNull();
    });
  });

  describe('isEmailAvailable', () => {
    it('should return true if email is available', async () => {
      // Act
      const result = await authService.isEmailAvailable('available@example.com');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if email is taken', async () => {
      // Arrange
      const user: Partial<User> = {
        id: 'user-1',
        email: 'taken@example.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        username: null,
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null,
        profilePictureUrl: null,
      };
      authService.seed([user as User]);

      // Act
      const result = await authService.isEmailAvailable('taken@example.com');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      // Arrange
      const users: Partial<User>[] = [
        {
          id: 'user-1',
          email: 'active@example.com',
          passwordHash: null,
          firstName: null,
          lastName: null,
          username: null,
          emailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          deletedAt: null,
          profilePictureUrl: null,
        },
        {
          id: 'user-2',
          email: 'inactive@example.com',
          passwordHash: null,
          firstName: null,
          lastName: null,
          username: null,
          emailVerified: false,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          deletedAt: null,
          profilePictureUrl: null,
        },
        {
          id: 'user-3',
          email: 'verified@example.com',
          passwordHash: null,
          firstName: null,
          lastName: null,
          username: null,
          emailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          deletedAt: null,
          profilePictureUrl: null,
        },
      ];
      authService.seed(users as User[]);

      // Act
      const stats = await authService.getUserStats();

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.verified).toBe(2);
      expect(stats.inactive).toBe(1);
    });
  });
});
