/**
 * Authentication Management Controller
 *
 * Handles HTTP endpoints for user authentication management including:
 * - User registration with email verification
 * - Email verification
 * - Password reset flow (forgot password, reset password)
 *
 * Security Features:
 * - Password strength validation
 * - Secure token generation and hashing
 * - Email enumeration prevention
 * - Rate limiting ready (to be implemented at route level)
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 1)
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import {
  registrationSchema,
  emailVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  RegistrationInput,
  EmailVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../types/auth-validation';
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashToken,
  isTokenExpired,
} from '../utils/token-generator';
import { validatePasswordStrength } from '../utils/password-strength';
import { IEmailService } from '../services/email/email.service.interface';
import bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 12;

// =============================================================================
// Response Helper Functions
// =============================================================================

/**
 * Standard success response format
 */
function successResponse(data: any, statusCode: number = 200) {
  return { statusCode, body: data };
}

/**
 * Standard error response format
 */
function errorResponse(code: string, message: string, statusCode: number = 400, details?: any) {
  return {
    statusCode,
    body: {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
  };
}

// =============================================================================
// Auth Management Controller Class
// =============================================================================

@injectable()
export class AuthManagementController {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('IEmailService') private emailService: IEmailService
  ) {
    logger.debug('AuthManagementController: Initialized with email service');
  }

  // ===========================================================================
  // User Registration Endpoint
  // ===========================================================================

  /**
   * POST /auth/register
   * Register a new user account with email verification
   *
   * Request Body:
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123!",
   *   "username": "john_doe",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "acceptedTerms": true
   * }
   *
   * Response 201:
   * {
   *   "id": "uuid",
   *   "email": "user@example.com",
   *   "emailVerified": false,
   *   "message": "Registration successful. Please check your email to verify your account."
   * }
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body
      const validationResult = registrationSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        const response = errorResponse(
          'validation_error',
          'Registration validation failed',
          400,
          { errors }
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      const { email, password, username, firstName, lastName } =
        validationResult.data as RegistrationInput;

      // 2. Check if email already exists
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        const response = errorResponse(
          'email_exists',
          'An account with this email already exists',
          409
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 3. Check if username already taken
      const existingUsername = await this.prisma.user.findFirst({
        where: { username },
      });

      if (existingUsername) {
        const response = errorResponse(
          'username_taken',
          'This username is already taken',
          409
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 4. Validate password strength (double-check even though Zod validates)
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        const response = errorResponse(
          'weak_password',
          'Password does not meet strength requirements',
          400,
          { errors: passwordValidation.errors }
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 5. Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      // 6. Generate email verification token
      const { token, hashedToken, expiry } = generateEmailVerificationToken(24); // 24 hours

      // 7. Create user record
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          username,
          firstName,
          lastName,
          emailVerified: false,
          emailVerificationToken: hashedToken,
          emailVerificationTokenExpiry: expiry,
          isActive: true,
          authProvider: 'local',
        },
      });

      // 8. Log registration event
      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // 9. Send verification email (async - don't block registration on email failure)
      await this.emailService.sendVerificationEmail(email, token, username);

      // 10. Return success response (201 Created)
      const response = successResponse(
        {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          message:
            'Registration successful. Please check your email to verify your account.',
        },
        201
      );

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('AuthManagementController.register: Error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const response = errorResponse(
        'internal_error',
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An error occurred during registration',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  // ===========================================================================
  // Email Verification Endpoint
  // ===========================================================================

  /**
   * POST /auth/verify-email
   * Verify user email with token
   *
   * Request Body:
   * {
   *   "token": "abc123...",
   *   "email": "user@example.com"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "Email verified successfully. You can now log in."
   * }
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body
      const validationResult = emailVerificationSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        const response = errorResponse(
          'validation_error',
          'Email verification validation failed',
          400,
          { errors }
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      const { token, email } = validationResult.data as EmailVerificationInput;

      // 2. Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const response = errorResponse(
          'invalid_token',
          'Invalid verification token or email',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 3. Check if already verified
      if (user.emailVerified) {
        const response = errorResponse(
          'already_verified',
          'Email is already verified',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 4. Check if token exists
      if (!user.emailVerificationToken || !user.emailVerificationTokenExpiry) {
        const response = errorResponse(
          'no_token',
          'No verification token found. Please request a new one.',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 5. Check token expiration
      if (isTokenExpired(user.emailVerificationTokenExpiry)) {
        const response = errorResponse(
          'token_expired',
          'Verification token has expired. Please request a new one.',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 6. Verify token matches
      const hashedInputToken = hashToken(token);
      if (hashedInputToken !== user.emailVerificationToken) {
        const response = errorResponse(
          'invalid_token',
          'Invalid verification token',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 7. Update user: mark email as verified and clear token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
        },
      });

      // 8. Log verification event
      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      // 9. Return success response
      const response = successResponse({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('AuthManagementController.verifyEmail: Error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const response = errorResponse(
        'internal_error',
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An error occurred during email verification',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  // ===========================================================================
  // Forgot Password Endpoint
  // ===========================================================================

  /**
   * POST /auth/forgot-password
   * Request password reset token
   *
   * Request Body:
   * {
   *   "email": "user@example.com"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "If an account exists with this email, a password reset link has been sent."
   * }
   *
   * Security Note: Always returns success to prevent email enumeration
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body
      const validationResult = forgotPasswordSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        const response = errorResponse(
          'validation_error',
          'Forgot password validation failed',
          400,
          { errors }
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      const { email } = validationResult.data as ForgotPasswordInput;

      // 2. Find user by email (but don't reveal if user exists)
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // 3. If user exists, generate reset token
      if (user) {
        // Generate password reset token (1 hour expiry)
        const { token, hashedToken, expiry } = generatePasswordResetToken(1);

        // Update user with reset token
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: hashedToken,
            passwordResetTokenExpiry: expiry,
            passwordResetCount: {
              increment: 1,
            },
          },
        });

        // Log reset request
        logger.info('Password reset requested', {
          userId: user.id,
          email: user.email,
          resetCount: user.passwordResetCount + 1,
        });

        // Send password reset email (async - don't block on email failure)
        await this.emailService.sendPasswordResetEmail(email, token, user.username || user.email);
      } else {
        // Log attempt for non-existent email (security monitoring)
        logger.warn('Password reset requested for non-existent email', {
          email,
        });
      }

      // 4. Always return generic success message (prevent email enumeration)
      const response = successResponse({
        success: true,
        message:
          'If an account exists with this email, a password reset link has been sent.',
      });

      res.status(response.statusCode).json(response.body);

      // Note: Rate limiting should be implemented at route level
      // to prevent abuse (e.g., 3 requests per hour per email)
    } catch (error) {
      logger.error('AuthManagementController.forgotPassword: Error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const response = errorResponse(
        'internal_error',
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An error occurred while processing your request',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }

  // ===========================================================================
  // Reset Password Endpoint
  // ===========================================================================

  /**
   * POST /auth/reset-password
   * Complete password reset with token
   *
   * Request Body:
   * {
   *   "token": "abc123...",
   *   "email": "user@example.com",
   *   "newPassword": "NewSecurePass123!"
   * }
   *
   * Response 200:
   * {
   *   "success": true,
   *   "message": "Password reset successfully. Please log in with your new password."
   * }
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body
      const validationResult = resetPasswordSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        const response = errorResponse(
          'validation_error',
          'Password reset validation failed',
          400,
          { errors }
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      const { token, email, newPassword } = validationResult.data as ResetPasswordInput;

      // 2. Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        const response = errorResponse(
          'invalid_token',
          'Invalid reset token or email',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 3. Check if reset token exists
      if (!user.passwordResetToken || !user.passwordResetTokenExpiry) {
        const response = errorResponse(
          'no_token',
          'No password reset token found. Please request a new one.',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 4. Check token expiration
      if (isTokenExpired(user.passwordResetTokenExpiry)) {
        const response = errorResponse(
          'token_expired',
          'Password reset token has expired. Please request a new one.',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 5. Verify token matches
      const hashedInputToken = hashToken(token);
      if (hashedInputToken !== user.passwordResetToken) {
        const response = errorResponse(
          'invalid_token',
          'Invalid reset token',
          400
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 6. Validate new password strength (double-check)
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        const response = errorResponse(
          'weak_password',
          'New password does not meet strength requirements',
          400,
          { errors: passwordValidation.errors }
        );
        res.status(response.statusCode).json(response.body);
        return;
      }

      // 7. Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      // 8. Update user: set new password, clear reset token, update timestamp
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordResetToken: null,
          passwordResetTokenExpiry: null,
          lastPasswordChange: new Date(),
        },
      });

      // 9. Log password reset event
      logger.info('Password reset successfully', {
        userId: user.id,
        email: user.email,
      });

      // 10. Send password changed confirmation email (async - don't block on email failure)
      await this.emailService.sendPasswordChangedEmail(email, user.username || user.email);

      // TODO: Optionally invalidate all existing sessions/tokens for this user

      // 11. Return success response
      const response = successResponse({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.',
      });

      res.status(response.statusCode).json(response.body);
    } catch (error) {
      logger.error('AuthManagementController.resetPassword: Error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      const response = errorResponse(
        'internal_error',
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An error occurred during password reset',
        500
      );

      res.status(response.statusCode).json(response.body);
    }
  }
}
