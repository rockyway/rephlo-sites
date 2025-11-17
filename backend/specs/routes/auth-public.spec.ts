/**
 * Tspec API Specification - Public Authentication Endpoints
 *
 * This file defines the OpenAPI spec for public authentication endpoints using Tspec.
 * All endpoints are public (no authentication required) with IP-based rate limiting.
 *
 * Endpoints:
 * - POST /auth/register - User registration with email verification
 * - POST /auth/verify-email - Email verification with token
 * - POST /auth/forgot-password - Request password reset token
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// =============================================================================
// POST /auth/register - User Registration
// =============================================================================

/**
 * Registration Request Body
 */
export interface RegisterRequest {
  /** Email address (must be unique, max 255 characters) */
  email: string;
  /**
   * Password (minimum 8 characters, maximum 100 characters)
   * Must include:
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character (!@#$%^&*)
   */
  password: string;
  /**
   * Username (3-30 characters)
   * Can only contain letters, numbers, and underscores
   * Must be unique
   */
  username: string;
  /**
   * First name (1-100 characters)
   * Can only contain letters, spaces, hyphens, and apostrophes
   */
  firstName: string;
  /**
   * Last name (1-100 characters)
   * Can only contain letters, spaces, hyphens, and apostrophes
   */
  lastName: string;
  /** Must be true to accept terms and conditions */
  acceptedTerms: boolean;
}

/**
 * Registration Response
 * User account created successfully, email verification required
 */
export interface RegisterResponse {
  /** Status of the operation */
  status: 'success';
  /** Registration response data */
  data: {
    /** User ID (UUID format) */
    id: string;
    /** User's email address */
    email: string;
    /** Email verification status (always false after registration) */
    emailVerified: boolean;
  };
  /** Response metadata */
  meta: {
    /** Success message with next steps */
    message: string;
  };
}

/**
 * Registration Validation Error Response
 */
export interface RegisterValidationError {
  /** Error object */
  error: {
    /** Error code */
    code: 'validation_error' | 'email_exists' | 'username_taken' | 'weak_password';
    /** Human-readable error message */
    message: string;
    /** Detailed validation errors (array of field-specific errors) */
    details?: {
      /** Array of validation error messages */
      errors: string[];
    };
  };
}

// =============================================================================
// POST /auth/verify-email - Email Verification
// =============================================================================

/**
 * Email Verification Request Body
 */
export interface VerifyEmailRequest {
  /** Email verification token (sent via email, max 255 characters) */
  token: string;
  /** Email address (max 255 characters) */
  email: string;
}

/**
 * Email Verification Response
 * Email verified successfully
 */
export interface VerifyEmailResponse {
  /** Status of the operation */
  status: 'success';
  /** Verification response data */
  data: {
    /** Verification success flag */
    success: boolean;
  };
  /** Response metadata */
  meta: {
    /** Success message */
    message: string;
  };
}

/**
 * Email Verification Error Response
 */
export interface VerifyEmailError {
  /** Error object */
  error: {
    /** Error code */
    code: 'validation_error' | 'invalid_token' | 'already_verified' | 'no_token' | 'token_expired';
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
// POST /auth/forgot-password - Request Password Reset
// =============================================================================

/**
 * Forgot Password Request Body
 */
export interface ForgotPasswordRequest {
  /** Email address (max 255 characters) */
  email: string;
}

/**
 * Forgot Password Response
 * Generic success message (prevents email enumeration)
 */
export interface ForgotPasswordResponse {
  /** Status of the operation */
  status: 'success';
  /** Forgot password response data */
  data: {
    /** Request success flag */
    success: boolean;
  };
  /** Response metadata */
  meta: {
    /**
     * Generic success message
     * Always returns same message regardless of email existence (security best practice)
     */
    message: string;
  };
}

/**
 * Forgot Password Validation Error Response
 */
export interface ForgotPasswordError {
  /** Error object */
  error: {
    /** Error code */
    code: 'validation_error';
    /** Human-readable error message */
    message: string;
    /** Detailed validation errors */
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
 * Tspec API specification for public authentication endpoints
 */
export type AuthPublicApiSpec = Tspec.DefineApiSpec<{
  tags: ['Authentication'];
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new user account';
        description: `Create a new user account with email verification.

**Flow:**
1. User submits registration form with email, password, username, and name
2. System validates input and checks for duplicates
3. Password is hashed (bcrypt with 12 rounds)
4. User record created with unverified email
5. Verification email sent with 24-hour token
6. User must verify email before login

**Password Requirements:**
- Minimum 8 characters, maximum 100 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

**Username Requirements:**
- 3-30 characters
- Letters, numbers, and underscores only
- Must be unique

**Rate Limit**: 5 requests per hour per IP address

**Security:**
- Passwords hashed with bcrypt (12 rounds)
- Email verification required before login
- Rate limiting prevents abuse`;
        body: RegisterRequest;
        responses: {
          /** Registration successful, verification email sent */
          201: RegisterResponse;
          /** Validation error, email/username exists, or weak password */
          400: RegisterValidationError;
          /** Email or username already exists */
          409: RegisterValidationError;
          /** Rate limit exceeded (5 per hour per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/auth/verify-email': {
      post: {
        summary: 'Verify user email with token';
        description: `Verify user email address using token from registration email.

**Flow:**
1. User clicks verification link in email (contains token and email)
2. System validates token format and finds user
3. System checks if email already verified
4. System verifies token matches and not expired
5. Email marked as verified, tokens cleared
6. User can now log in

**Token Behavior:**
- Valid for 24 hours after registration
- Single-use (cleared after verification)
- Hashed in database (SHA-256)
- Cryptographically secure random token

**Rate Limit**: 10 requests per hour per IP address

**Security:**
- Tokens hashed in database
- 24-hour expiration
- Already-verified accounts rejected
- Rate limiting prevents brute force`;
        body: VerifyEmailRequest;
        responses: {
          /** Email verified successfully */
          200: VerifyEmailResponse;
          /** Invalid token, already verified, token expired, or no token found */
          400: VerifyEmailError;
          /** Rate limit exceeded (10 per hour per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/auth/forgot-password': {
      post: {
        summary: 'Request password reset token';
        description: `Request a password reset token sent via email.

**Flow:**
1. User submits email address
2. System looks up user by email
3. If user exists, generates reset token and sends email
4. If user doesn't exist, returns same success message (prevents email enumeration)
5. Reset token valid for 1 hour

**Token Behavior:**
- Valid for 1 hour
- Single-use (cleared after password reset)
- Hashed in database (SHA-256)
- Cryptographically secure random token

**Rate Limit**: 3 requests per hour per IP address

**Security Best Practice:**
Always returns same success message regardless of whether email exists.
This prevents attackers from enumerating valid email addresses.

**Security:**
- Email enumeration prevention (same response for all emails)
- 1-hour token expiration
- Tokens hashed in database
- Reset count tracking for security monitoring
- Rate limiting prevents abuse`;
        body: ForgotPasswordRequest;
        responses: {
          /** Generic success response (email sent if account exists) */
          200: ForgotPasswordResponse;
          /** Validation error (invalid email format) */
          400: ForgotPasswordError;
          /** Rate limit exceeded (3 per hour per IP) */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
