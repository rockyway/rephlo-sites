import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../../src/services/auth.service';
import { getTestDatabase, cleanDatabase } from '../../setup/database';
import { createTestUser } from '../../helpers/factories';
import { hashPassword, verifyPassword } from '../../../src/utils/hash';

describe('AuthService', () => {
  let prisma: PrismaClient;
  let authService: AuthService;

  beforeEach(async () => {
    prisma = getTestDatabase();
    authService = new AuthService();
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  describe('findAccount', () => {
    it('should find account by user ID', async () => {
      const user = await createTestUser(prisma);

      const account = await authService.findAccount(null, user.id);

      expect(account).toBeDefined();
      expect(account?.accountId).toBe(user.id);
      expect(account?.email).toBe(user.email);
    });

    it('should return undefined for non-existent user', async () => {
      const account = await authService.findAccount(null, 'non-existent-id');

      expect(account).toBeUndefined();
    });

    it('should return undefined for inactive user', async () => {
      const user = await createTestUser(prisma, { isActive: false });

      const account = await authService.findAccount(null, user.id);

      expect(account).toBeUndefined();
    });

    it('should return undefined for deleted user', async () => {
      const user = await createTestUser(prisma, { deletedAt: new Date() });

      const account = await authService.findAccount(null, user.id);

      expect(account).toBeUndefined();
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = await hashPassword(password);

      await createTestUser(prisma, { email, passwordHash });

      const account = await authService.authenticate(email, password);

      expect(account).toBeDefined();
      expect(account?.email).toBe(email);
    });

    it('should return null for incorrect password', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = await hashPassword(password);

      await createTestUser(prisma, { email, passwordHash });

      const account = await authService.authenticate(email, 'wrong-password');

      expect(account).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const account = await authService.authenticate('nonexistent@example.com', 'password123');

      expect(account).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = await hashPassword(password);

      await createTestUser(prisma, { email, passwordHash, isActive: false });

      const account = await authService.authenticate(email, password);

      expect(account).toBeNull();
    });

    it('should update lastLoginAt on successful authentication', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const passwordHash = await hashPassword(password);

      const user = await createTestUser(prisma, { email, passwordHash });

      const beforeLogin = user.lastLoginAt;

      await authService.authenticate(email, password);

      const updatedUser = await prisma.user.findUnique({ where: { email } });

      expect(updatedUser?.lastLoginAt).not.toEqual(beforeLogin);
    });
  });

  describe('claims', () => {
    it('should generate OIDC claims for user', async () => {
      const user = await createTestUser(prisma, {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
      });

      const claims = await authService.claims(user.id, 'openid email profile');

      expect(claims.sub).toBe(user.id);
      expect(claims.email).toBe('test@example.com');
      expect(claims.email_verified).toBe(true);
      expect(claims.name).toBe('John Doe');
      expect(claims.given_name).toBe('John');
      expect(claims.family_name).toBe('Doe');
      expect(claims.picture).toBe('https://example.com/avatar.jpg');
    });

    it('should only include requested scopes in claims', async () => {
      const user = await createTestUser(prisma);

      const claims = await authService.claims(user.id, 'openid');

      expect(claims.sub).toBe(user.id);
      expect(claims.email).toBeUndefined();
      expect(claims.name).toBeUndefined();
    });

    it('should handle missing optional fields', async () => {
      const user = await createTestUser(prisma, {
        firstName: null,
        lastName: null,
        username: null,
        profilePictureUrl: null,
      });

      const claims = await authService.claims(user.id, 'openid email profile');

      expect(claims.sub).toBe(user.id);
      expect(claims.name).toBeUndefined();
      expect(claims.picture).toBeUndefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });
});
