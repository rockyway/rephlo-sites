/**
 * Unit Tests for Auth Management Controller
 *
 * Tests all authentication management endpoints:
 * - POST /auth/register
 * - POST /auth/verify-email
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthManagementController } from '../../../src/controllers/auth-management.controller';
import * as tokenGenerator from '../../../src/utils/token-generator';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('bcrypt');

// Mock email service
const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPasswordChangedEmail: jest.fn(),
} as any;

describe('AuthManagementController', () => {
  let controller: AuthManagementController;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockResJson: jest.Mock;
  let mockResStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Prisma Client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    // Mock Response object
    mockResJson = jest.fn().mockReturnThis();
    mockResStatus = jest.fn().mockReturnThis();
    mockRes = {
      status: mockResStatus,
      json: mockResJson,
    };

    // Create controller instance
    controller = new AuthManagementController(mockPrisma, mockEmailService);

    // Mock Request object
    mockReq = {
      body: {},
    };
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Test@1234',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      acceptedTerms: true,
    };

    beforeEach(() => {
      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      // Mock token generation
      jest.spyOn(tokenGenerator, 'generateEmailVerificationToken').mockReturnValue({
        token: 'plain_token_123',
        hashedToken: 'hashed_token_123',
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it('should register new user successfully', async () => {
      mockReq.body = validRegistrationData;

      // Mock: email and username don't exist
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock user creation
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validRegistrationData.email,
        emailVerified: false,
        username: validRegistrationData.username,
      });

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(201);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user123',
          email: validRegistrationData.email,
          emailVerified: false,
        })
      );
    });

    it('should reject registration with invalid email format', async () => {
      mockReq.body = { ...validRegistrationData, email: 'invalid-email' };

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'validation_error',
          }),
        })
      );
    });

    it('should reject registration with weak password', async () => {
      mockReq.body = { ...validRegistrationData, password: 'weak' };

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'validation_error',
          }),
        })
      );
    });

    it('should reject registration with duplicate email', async () => {
      mockReq.body = validRegistrationData;

      // Mock: email already exists
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing_user',
        email: validRegistrationData.email,
      });

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(409);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'email_exists',
          }),
        })
      );
    });

    it('should reject registration with duplicate username', async () => {
      mockReq.body = validRegistrationData;

      // Mock: email doesn't exist but username does
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing_user',
        username: validRegistrationData.username,
      });

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(409);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'username_taken',
          }),
        })
      );
    });

    it('should reject registration without accepting terms', async () => {
      mockReq.body = { ...validRegistrationData, acceptedTerms: false };

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'validation_error',
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockReq.body = validRegistrationData;

      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      await controller.register(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(500);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'internal_error',
          }),
        })
      );
    });

    it('should hash password with bcrypt', async () => {
      mockReq.body = validRegistrationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.register(mockReq as Request, mockRes as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith(validRegistrationData.password, 12);
    });

    it('should generate email verification token', async () => {
      mockReq.body = validRegistrationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({ id: 'user123' });

      const spy = jest.spyOn(tokenGenerator, 'generateEmailVerificationToken');

      await controller.register(mockReq as Request, mockRes as Response);

      expect(spy).toHaveBeenCalledWith(24);
    });
  });

  describe('verifyEmail', () => {
    const validVerificationData = {
      token: 'plain_token_123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      jest.spyOn(tokenGenerator, 'hashToken').mockReturnValue('hashed_token_123');
      jest.spyOn(tokenGenerator, 'isTokenExpired').mockReturnValue(false);
    });

    it('should verify email successfully', async () => {
      mockReq.body = validVerificationData;

      // Mock user with valid token
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validVerificationData.email,
        emailVerified: false,
        emailVerificationToken: 'hashed_token_123',
        emailVerificationTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user123',
        emailVerified: true,
      });

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(200);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('verified'),
        })
      );
    });

    it('should reject verification with invalid token format', async () => {
      mockReq.body = { token: '', email: validVerificationData.email };

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'validation_error',
          }),
        })
      );
    });

    it('should reject verification for non-existent user', async () => {
      mockReq.body = validVerificationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'invalid_token',
          }),
        })
      );
    });

    it('should reject verification if already verified', async () => {
      mockReq.body = validVerificationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validVerificationData.email,
        emailVerified: true,
      });

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'already_verified',
          }),
        })
      );
    });

    it('should reject verification with expired token', async () => {
      mockReq.body = validVerificationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validVerificationData.email,
        emailVerified: false,
        emailVerificationToken: 'hashed_token_123',
        emailVerificationTokenExpiry: new Date(Date.now() - 60 * 60 * 1000),
      });

      jest.spyOn(tokenGenerator, 'isTokenExpired').mockReturnValue(true);

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'token_expired',
          }),
        })
      );
    });

    it('should reject verification with wrong token', async () => {
      mockReq.body = validVerificationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validVerificationData.email,
        emailVerified: false,
        emailVerificationToken: 'different_hashed_token',
        emailVerificationTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'invalid_token',
          }),
        })
      );
    });

    it('should update user and clear token after verification', async () => {
      mockReq.body = validVerificationData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validVerificationData.email,
        emailVerified: false,
        emailVerificationToken: 'hashed_token_123',
        emailVerificationTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        },
      });
    });
  });

  describe('forgotPassword', () => {
    const validForgotPasswordData = {
      email: 'test@example.com',
    };

    beforeEach(() => {
      jest.spyOn(tokenGenerator, 'generatePasswordResetToken').mockReturnValue({
        token: 'reset_token_123',
        hashedToken: 'hashed_reset_token_123',
        expiry: new Date(Date.now() + 60 * 60 * 1000),
      });
    });

    it('should return success for existing user', async () => {
      mockReq.body = validForgotPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validForgotPasswordData.email,
        passwordResetCount: 0,
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.forgotPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(200);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('If an account exists'),
        })
      );
    });

    it('should return success for non-existent user (prevent enumeration)', async () => {
      mockReq.body = validForgotPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.forgotPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(200);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('If an account exists'),
        })
      );
    });

    it('should generate and store reset token for existing user', async () => {
      mockReq.body = validForgotPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validForgotPasswordData.email,
        passwordResetCount: 0,
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.forgotPassword(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: expect.objectContaining({
          passwordResetToken: 'hashed_reset_token_123',
          passwordResetTokenExpiry: expect.any(Date),
          passwordResetCount: { increment: 1 },
        }),
      });
    });

    it('should not call update for non-existent user', async () => {
      mockReq.body = validForgotPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.forgotPassword(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', async () => {
      mockReq.body = { email: 'invalid-email' };

      await controller.forgotPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'validation_error',
          }),
        })
      );
    });
  });

  describe('resetPassword', () => {
    const validResetPasswordData = {
      token: 'reset_token_123',
      email: 'test@example.com',
      newPassword: 'NewTest@1234',
    };

    beforeEach(() => {
      jest.spyOn(tokenGenerator, 'hashToken').mockReturnValue('hashed_reset_token_123');
      jest.spyOn(tokenGenerator, 'isTokenExpired').mockReturnValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
    });

    it('should reset password successfully', async () => {
      mockReq.body = validResetPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validResetPasswordData.email,
        passwordResetToken: 'hashed_reset_token_123',
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(200);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Password reset successfully'),
        })
      );
    });

    it('should reject reset for non-existent user', async () => {
      mockReq.body = validResetPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'invalid_token',
          }),
        })
      );
    });

    it('should reject reset with expired token', async () => {
      mockReq.body = validResetPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validResetPasswordData.email,
        passwordResetToken: 'hashed_reset_token_123',
        passwordResetTokenExpiry: new Date(Date.now() - 60 * 60 * 1000),
      });

      jest.spyOn(tokenGenerator, 'isTokenExpired').mockReturnValue(true);

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'token_expired',
          }),
        })
      );
    });

    it('should reject reset with invalid token', async () => {
      mockReq.body = validResetPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validResetPasswordData.email,
        passwordResetToken: 'different_hashed_token',
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'invalid_token',
          }),
        })
      );
    });

    it('should reject reset with weak password', async () => {
      mockReq.body = { ...validResetPasswordData, newPassword: 'weak' };

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockResStatus).toHaveBeenCalledWith(400);
      expect(mockResJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'validation_error',
          }),
        })
      );
    });

    it('should update password and clear reset token', async () => {
      mockReq.body = validResetPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validResetPasswordData.email,
        passwordResetToken: 'hashed_reset_token_123',
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: expect.objectContaining({
          passwordHash: 'new_hashed_password',
          passwordResetToken: null,
          passwordResetTokenExpiry: null,
          lastPasswordChange: expect.any(Date),
        }),
      });
    });

    it('should hash new password with bcrypt', async () => {
      mockReq.body = validResetPasswordData;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user123',
        email: validResetPasswordData.email,
        passwordResetToken: 'hashed_reset_token_123',
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ id: 'user123' });

      await controller.resetPassword(mockReq as Request, mockRes as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith(validResetPasswordData.newPassword, 12);
    });
  });
});
