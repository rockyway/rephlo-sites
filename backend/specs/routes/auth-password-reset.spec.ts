/**
 * Tspec API Specification - Password Reset Endpoint
 *
 * This file defines the OpenAPI spec for password reset endpoint using Tspec.
 * This endpoint is public (no authentication required) with IP-based rate limiting.
 *
 * Endpoint:
 * - POST /auth/reset-password - Reset password using token from password reset email
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// =============================================================================
// POST /auth/reset-password - Reset Password
// =============================================================================

/**
 * Reset Password Request Body
 */
export interface ResetPasswordRequest {
  /**
   * Reset token from email (64-character hexadecimal string)
   * Sent via password reset email, valid for 1 hour
   */
  token: string;
  /**
   * Email address (max 255 characters)
   * Must match account being reset
   */
  email: string;
  /**
   * New password (minimum 8 characters, maximum 100 characters)
   * Must include:
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character (!@#$%^&*)
   */
  newPassword: string;
}

/**
 * Reset Password Response
 * Password reset successfully
 */
export interface ResetPasswordResponse {
  /** Status of the operation */
  status: 'success';
  /** Reset password response data */
  data: {
    /** Reset success flag */
    success: boolean;
  };
  /** Response metadata */
  meta: {
    /** Success message */
    message: string;
  };
}

/**
 * Reset Password Error Response
 */
export interface ResetPasswordError {
  /** Error object */
  error: {
    /** Error code */
    code: 'validation_error' | 'invalid_token' | 'token_expired' | 'weak_password' | 'user_not_found';
    /** Human-readable error message */
    message: string;
    /** Detailed validation errors (optional) */
    details?: {
      /** Array of validation error messages */
      errors: string[];
    };
  };
}

// =============================================================================
// Tspec API Specification
// =============================================================================

/**
 * Tspec API specification for password reset endpoint
 */
export type AuthPasswordResetApiSpec = Tspec.DefineApiSpec<{
  tags: ['Authentication'];
  paths: {
    '/auth/reset-password': {
      post: {
        summary: 'Reset user password with token';
        description: `Reset user password using token from password reset email.

**Flow:**
1. User receives reset token via email (from /auth/forgot-password)
2. User submits token, email, and new password
3. System validates token format and finds user by email
4. System checks token expiration (1 hour from request)
5. System verifies token matches stored hash
6. Password is hashed (bcrypt with 12 rounds)
7. Password updated and reset token cleared
8. lastPasswordChange timestamp updated
9. All active sessions are invalidated (user must log in again)

**Token Behavior:**
- Valid for 1 hour after password reset request
- Single-use (cleared after successful reset)
- Hashed in database (SHA-256)
- 64-character hexadecimal format
- Cryptographically secure random token

**Password Requirements:**
- Minimum 8 characters, maximum 100 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

**Rate Limit**: 3 requests per hour per IP address

**Security:**
- Passwords hashed with bcrypt (12 rounds)
- All sessions invalidated after password change
- Rate limiting prevents brute force
- Token single-use prevents replay attacks
- 1-hour token expiration limits exposure`;
        security: never; // Public endpoint
        body: ResetPasswordRequest;
        responses: {
          /** Password reset successfully */
          200: ResetPasswordResponse;
          /** Invalid token, token expired, weak password, validation error, or user not found */
          400: ResetPasswordError;
          /** Rate limit exceeded (3 per hour per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
