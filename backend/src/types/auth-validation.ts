/**
 * Authentication Validation Schemas
 *
 * Zod validation schemas for authentication-related endpoints.
 * These schemas validate user input for registration, email verification,
 * password reset, and other authentication operations.
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 1)
 */

import { z } from 'zod';

// =============================================================================
// Password Strength Schema
// =============================================================================

/**
 * Strong password schema
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*)
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)');

// =============================================================================
// Registration Schema
// =============================================================================

/**
 * User registration request schema
 * POST /auth/register
 */
export const registrationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters'),

  password: strongPasswordSchema,

  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),

  acceptedTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// =============================================================================
// Email Verification Schema
// =============================================================================

/**
 * Email verification request schema
 * POST /auth/verify-email
 */
export const emailVerificationSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification token is required')
    .max(255, 'Invalid token format'),

  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters'),
});

export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;

// =============================================================================
// Forgot Password Schema
// =============================================================================

/**
 * Forgot password request schema
 * POST /auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// =============================================================================
// Reset Password Schema
// =============================================================================

/**
 * Reset password request schema
 * POST /auth/reset-password
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required')
    .max(255, 'Invalid token format'),

  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters'),

  newPassword: strongPasswordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// =============================================================================
// Logout Schema
// =============================================================================

/**
 * Logout request schema
 * POST /auth/logout
 */
export const logoutSchema = z.object({
  token: z
    .string()
    .min(1, 'Access token is required'),

  refreshToken: z
    .string()
    .optional(),
});

export type LogoutInput = z.infer<typeof logoutSchema>;
