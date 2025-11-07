/**
 * Integration Tests for Authentication Routes
 *
 * Tests complete authentication flows with real database:
 * - POST /auth/register
 * - POST /auth/verify-email
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 */

import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import {
  validRegistrationData,
  invalidRegistrationScenarios,
  createUserWithVerificationToken,
  createUserWithResetToken,
  createVerifiedUser,
  createUserWithExpiredVerificationToken,
  createUserWithExpiredResetToken,
  cleanupTestUsers,
} from '../helpers/auth-fixtures';

// Mock app setup
let app: Express;
let prisma: PrismaClient;

// Setup would import your actual Express app
// For now, this is a placeholder
beforeAll(async () => {
  prisma = getTestDatabase();
  // app = createApp(); // Your Express app factory
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanupTestUsers(prisma);
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('should register new user successfully', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: validRegistrationData.email,
      emailVerified: false,
      message: expect.stringContaining('Registration successful'),
    });

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { email: validRegistrationData.email },
    });

    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBe(false);
    expect(user?.emailVerificationToken).not.toBeNull();
  });

  it('should reject duplicate email', async () => {
    // Create existing user
    await createVerifiedUser(prisma, {
      email: validRegistrationData.email,
    });

    const response = await request(app)
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'email_exists',
      message: expect.stringContaining('email already exists'),
    });
  });

  it('should reject duplicate username', async () => {
    // Create existing user with different email
    await createVerifiedUser(prisma, {
      email: 'different@example.com',
      username: validRegistrationData.username,
    });

    const response = await request(app)
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'username_taken',
      message: expect.stringContaining('username is already taken'),
    });
  });

  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(invalidRegistrationScenarios.invalidEmail)
      .expect(400);

    expect(response.body.error.code).toBe('validation_error');
  });

  it('should reject weak password', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(invalidRegistrationScenarios.weakPassword)
      .expect(400);

    expect(response.body.error.code).toBe('validation_error');
  });

  it('should reject if terms not accepted', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(invalidRegistrationScenarios.termsNotAccepted)
      .expect(400);

    expect(response.body.error.code).toBe('validation_error');
  });

  it('should hash password securely', async () => {
    await request(app)
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: validRegistrationData.email },
    });

    expect(user?.passwordHash).not.toBe(validRegistrationData.password);
    expect(user?.passwordHash).toHaveLength(60); // bcrypt hash length
  });

  it('should generate email verification token', async () => {
    await request(app)
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: validRegistrationData.email },
    });

    expect(user?.emailVerificationToken).not.toBeNull();
    expect(user?.emailVerificationTokenExpiry).not.toBeNull();
    expect(user?.emailVerificationTokenExpiry).toBeInstanceOf(Date);
  });
});

describe('POST /auth/verify-email', () => {
  it('should verify email successfully', async () => {
    const { user, token } = await createUserWithVerificationToken(prisma);

    const response = await request(app)
      .post('/auth/verify-email')
      .send({
        token,
        email: user.email,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: expect.stringContaining('verified successfully'),
    });

    // Verify in database
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.emailVerificationToken).toBeNull();
    expect(updatedUser?.emailVerificationTokenExpiry).toBeNull();
  });

  it('should reject invalid token', async () => {
    const { user } = await createUserWithVerificationToken(prisma);

    const response = await request(app)
      .post('/auth/verify-email')
      .send({
        token: 'invalid_token_123',
        email: user.email,
      })
      .expect(400);

    expect(response.body.error.code).toBe('invalid_token');
  });

  it('should reject expired token', async () => {
    const { user, token } = await createUserWithExpiredVerificationToken(prisma);

    const response = await request(app)
      .post('/auth/verify-email')
      .send({
        token,
        email: user.email,
      })
      .expect(400);

    expect(response.body.error.code).toBe('token_expired');
  });

  it('should reject if email already verified', async () => {
    const user = await createVerifiedUser(prisma);

    const response = await request(app)
      .post('/auth/verify-email')
      .send({
        token: 'any_token',
        email: user.email,
      })
      .expect(400);

    expect(response.body.error.code).toBe('already_verified');
  });

  it('should reject for non-existent user', async () => {
    const response = await request(app)
      .post('/auth/verify-email')
      .send({
        token: 'any_token',
        email: 'nonexistent@example.com',
      })
      .expect(400);

    expect(response.body.error.code).toBe('invalid_token');
  });
});

describe('POST /auth/forgot-password', () => {
  it('should return success for existing user', async () => {
    const user = await createVerifiedUser(prisma);

    const response = await request(app)
      .post('/auth/forgot-password')
      .send({
        email: user.email,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: expect.stringContaining('If an account exists'),
    });

    // Verify token was created
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.passwordResetToken).not.toBeNull();
    expect(updatedUser?.passwordResetTokenExpiry).not.toBeNull();
    expect(updatedUser?.passwordResetCount).toBeGreaterThan(0);
  });

  it('should return success for non-existent user (prevent enumeration)', async () => {
    const response = await request(app)
      .post('/auth/forgot-password')
      .send({
        email: 'nonexistent@example.com',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: expect.stringContaining('If an account exists'),
    });
  });

  it('should generate password reset token', async () => {
    const user = await createVerifiedUser(prisma);

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.passwordResetToken).not.toBeNull();
    expect(updatedUser?.passwordResetTokenExpiry).toBeInstanceOf(Date);
  });

  it('should increment password reset count', async () => {
    const user = await createVerifiedUser(prisma);
    const initialCount = user.passwordResetCount;

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.passwordResetCount).toBe(initialCount + 1);
  });

  it('should invalidate old reset token when requesting new one', async () => {
    const { user } = await createUserWithResetToken(prisma);
    const oldToken = user.passwordResetToken;

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.passwordResetToken).not.toBe(oldToken);
  });
});

describe('POST /auth/reset-password', () => {
  const newPassword = 'NewSecure@1234';

  it('should reset password successfully', async () => {
    const { user, token } = await createUserWithResetToken(prisma);

    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token,
        email: user.email,
        newPassword,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: expect.stringContaining('Password reset successfully'),
    });

    // Verify in database
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.passwordResetToken).toBeNull();
    expect(updatedUser?.passwordResetTokenExpiry).toBeNull();
    expect(updatedUser?.lastPasswordChange).toBeInstanceOf(Date);
    expect(updatedUser?.passwordHash).not.toBe(user.passwordHash);
  });

  it('should reject invalid token', async () => {
    const { user } = await createUserWithResetToken(prisma);

    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token: 'invalid_token_123',
        email: user.email,
        newPassword,
      })
      .expect(400);

    expect(response.body.error.code).toBe('invalid_token');
  });

  it('should reject expired token', async () => {
    const { user, token } = await createUserWithExpiredResetToken(prisma);

    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token,
        email: user.email,
        newPassword,
      })
      .expect(400);

    expect(response.body.error.code).toBe('token_expired');
  });

  it('should reject weak new password', async () => {
    const { user, token } = await createUserWithResetToken(prisma);

    const response = await request(app)
      .post('/auth/reset-password')
      .send({
        token,
        email: user.email,
        newPassword: 'weak',
      })
      .expect(400);

    expect(response.body.error.code).toBe('validation_error');
  });

  it('should hash new password', async () => {
    const { user, token } = await createUserWithResetToken(prisma);
    const oldHash = user.passwordHash;

    await request(app)
      .post('/auth/reset-password')
      .send({
        token,
        email: user.email,
        newPassword,
      })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.passwordHash).not.toBe(oldHash);
    expect(updatedUser?.passwordHash).not.toBe(newPassword);
    expect(updatedUser?.passwordHash).toHaveLength(60);
  });

  it('should update lastPasswordChange timestamp', async () => {
    const { user, token } = await createUserWithResetToken(prisma);

    await request(app)
      .post('/auth/reset-password')
      .send({
        token,
        email: user.email,
        newPassword,
      })
      .expect(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.lastPasswordChange).not.toBeNull();
    expect(updatedUser?.lastPasswordChange).toBeInstanceOf(Date);
  });
});

describe('Complete Authentication Flows', () => {
  it('should complete registration -> verification flow', async () => {
    // Step 1: Register
    const registerResponse = await request(app)
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(201);

    const userId = registerResponse.body.id;

    // Verify user is not verified yet
    let user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.emailVerified).toBe(false);

    // Step 2: Get verification token from database (simulating email)
    const verificationToken = user?.emailVerificationToken;
    expect(verificationToken).not.toBeNull();

    // Step 3: Verify email
    await request(app)
      .post('/auth/verify-email')
      .send({
        token: verificationToken,
        email: validRegistrationData.email,
      })
      .expect(200);

    // Verify user is now verified
    user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.emailVerified).toBe(true);
  });

  it('should complete forgot password -> reset password flow', async () => {
    // Setup: Create verified user
    const user = await createVerifiedUser(prisma);
    const oldPasswordHash = user.passwordHash;

    // Step 1: Request password reset
    await request(app)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    // Get reset token from database (simulating email)
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    const resetToken = updatedUser?.passwordResetToken;
    expect(resetToken).not.toBeNull();

    // Step 2: Reset password
    const newPassword = 'NewSecure@1234';
    await request(app)
      .post('/auth/reset-password')
      .send({
        token: resetToken,
        email: user.email,
        newPassword,
      })
      .expect(200);

    // Verify password was changed
    const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(finalUser?.passwordHash).not.toBe(oldPasswordHash);
    expect(finalUser?.passwordResetToken).toBeNull();
  });
});
