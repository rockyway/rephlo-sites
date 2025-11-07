/**
 * Auth Test Fixtures
 *
 * Provides test data and helper functions for authentication testing
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/utils/hash';
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashToken,
} from '../../src/utils/token-generator';

/**
 * Valid registration data for testing
 */
export const validRegistrationData = {
  email: 'newuser@example.com',
  password: 'Test@1234',
  username: 'newuser',
  firstName: 'New',
  lastName: 'User',
  acceptedTerms: true,
};

/**
 * Valid login data for testing
 */
export const validLoginData = {
  email: 'test@example.com',
  password: 'Test@1234',
};

/**
 * Create a test user with email verification token
 */
export const createUserWithVerificationToken = async (
  prisma: PrismaClient,
  overrides: any = {}
) => {
  const { token, hashedToken, expiry } = generateEmailVerificationToken(24);
  const passwordHash = await hashPassword('Test@1234');

  const user = await prisma.user.create({
    data: {
      email: overrides.email || 'test@example.com',
      emailVerified: false,
      username: overrides.username || 'testuser',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      passwordHash,
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiry: expiry,
      isActive: true,
      authProvider: 'local',
      ...overrides,
    },
  });

  return { user, token, hashedToken, expiry };
};

/**
 * Create a test user with password reset token
 */
export const createUserWithResetToken = async (
  prisma: PrismaClient,
  overrides: any = {}
) => {
  const { token, hashedToken, expiry } = generatePasswordResetToken(1);
  const passwordHash = await hashPassword('Test@1234');

  const user = await prisma.user.create({
    data: {
      email: overrides.email || 'test@example.com',
      emailVerified: true,
      username: overrides.username || 'testuser',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      passwordHash,
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: expiry,
      passwordResetCount: overrides.passwordResetCount || 0,
      isActive: true,
      authProvider: 'local',
      ...overrides,
    },
  });

  return { user, token, hashedToken, expiry };
};

/**
 * Create a verified test user
 */
export const createVerifiedUser = async (
  prisma: PrismaClient,
  overrides: any = {}
) => {
  const passwordHash = await hashPassword('Test@1234');

  return prisma.user.create({
    data: {
      email: overrides.email || 'verified@example.com',
      emailVerified: true,
      username: overrides.username || 'verifieduser',
      firstName: overrides.firstName || 'Verified',
      lastName: overrides.lastName || 'User',
      passwordHash,
      isActive: true,
      authProvider: 'local',
      ...overrides,
    },
  });
};

/**
 * Create a Google OAuth user
 */
export const createGoogleUser = async (
  prisma: PrismaClient,
  overrides: any = {}
) => {
  const passwordHash = await hashPassword('random_google_password');

  return prisma.user.create({
    data: {
      email: overrides.email || 'googleuser@example.com',
      emailVerified: true,
      username: overrides.username || 'googleuser_abc123',
      firstName: overrides.firstName || 'Google',
      lastName: overrides.lastName || 'User',
      passwordHash,
      googleId: overrides.googleId || 'google_user_123',
      googleProfileUrl: overrides.googleProfileUrl || 'https://example.com/avatar.jpg',
      authProvider: 'google',
      isActive: true,
      ...overrides,
    },
  });
};

/**
 * Create a user with expired verification token
 */
export const createUserWithExpiredVerificationToken = async (
  prisma: PrismaClient,
  overrides: any = {}
) => {
  const token = 'expired_token_123';
  const hashedToken = hashToken(token);
  const expiry = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
  const passwordHash = await hashPassword('Test@1234');

  const user = await prisma.user.create({
    data: {
      email: overrides.email || 'expired@example.com',
      emailVerified: false,
      username: overrides.username || 'expireduser',
      firstName: overrides.firstName || 'Expired',
      lastName: overrides.lastName || 'User',
      passwordHash,
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiry: expiry,
      isActive: true,
      authProvider: 'local',
      ...overrides,
    },
  });

  return { user, token, hashedToken, expiry };
};

/**
 * Create a user with expired reset token
 */
export const createUserWithExpiredResetToken = async (
  prisma: PrismaClient,
  overrides: any = {}
) => {
  const token = 'expired_reset_token_123';
  const hashedToken = hashToken(token);
  const expiry = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  const passwordHash = await hashPassword('Test@1234');

  const user = await prisma.user.create({
    data: {
      email: overrides.email || 'resetexpired@example.com',
      emailVerified: true,
      username: overrides.username || 'resetexpireduser',
      firstName: overrides.firstName || 'Reset',
      lastName: overrides.lastName || 'Expired',
      passwordHash,
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: expiry,
      passwordResetCount: overrides.passwordResetCount || 1,
      isActive: true,
      authProvider: 'local',
      ...overrides,
    },
  });

  return { user, token, hashedToken, expiry };
};

/**
 * Invalid registration data scenarios
 */
export const invalidRegistrationScenarios = {
  invalidEmail: {
    email: 'not-an-email',
    password: 'Test@1234',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: true,
  },
  weakPassword: {
    email: 'test@example.com',
    password: 'weak',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: true,
  },
  shortUsername: {
    email: 'test@example.com',
    password: 'Test@1234',
    username: 'ab',
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: true,
  },
  termsNotAccepted: {
    email: 'test@example.com',
    password: 'Test@1234',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: false,
  },
  missingFields: {
    email: 'test@example.com',
    password: 'Test@1234',
    // Missing username, firstName, lastName, acceptedTerms
  },
};

/**
 * Google OAuth profile mock data
 */
export const mockGoogleProfile = {
  id: 'google_user_123',
  email: 'googletest@example.com',
  verified_email: true,
  name: 'Google Test User',
  given_name: 'Google',
  family_name: 'User',
  picture: 'https://example.com/avatar.jpg',
  locale: 'en',
};

/**
 * Mock Google OAuth tokens
 */
export const mockGoogleTokens = {
  access_token: 'ya29.mock_access_token',
  refresh_token: 'mock_refresh_token',
  scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  token_type: 'Bearer',
  id_token: 'mock_id_token',
  expiry_date: Date.now() + 3600 * 1000,
};

/**
 * Clean up all test users
 */
export const cleanupTestUsers = async (prisma: PrismaClient) => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'newuser@example.com',
          'test@example.com',
          'verified@example.com',
          'googleuser@example.com',
          'expired@example.com',
          'resetexpired@example.com',
          'googletest@example.com',
        ],
      },
    },
  });
};
