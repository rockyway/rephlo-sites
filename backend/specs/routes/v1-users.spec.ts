/**
 * Tspec API Specification - V1 User Management Endpoints
 *
 * This file defines the OpenAPI spec for /v1/users endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { User, ApiError } from '@rephlo/shared-types';

/**
 * User Profile Response
 * Complete user profile information
 */
export interface V1UserProfileResponse {
  /** User ID */
  userId: string;
  /** Email address */
  email: string;
  /** First name */
  firstName: string | null;
  /** Last name */
  lastName: string | null;
  /** Username */
  username: string | null;
  /** Profile picture URL */
  profilePictureUrl: string | null;
  /** User role (user, admin) */
  role: string;
  /** Account creation timestamp */
  createdAt: string;
  /** Last login timestamp */
  lastLoginAt: string | null;
}

/**
 * Update User Profile Request Body
 */
export interface UpdateUserProfileRequest {
  /** First name (optional) */
  firstName?: string;
  /** Last name (optional) */
  lastName?: string;
  /** Username (optional) */
  username?: string;
}

/**
 * Tspec API specification for V1 user management endpoints
 */
export type V1UsersApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Users'];
  paths: {
    '/v1/users/me': {
      get: {
        summary: 'Get current user profile';
        description: `Retrieve authenticated user's profile information.

**Authentication**: Requires JWT bearer token
**Scope Required**: user.info

Returns user profile with basic information including email, names, username, role, and timestamps.

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with user profile */
          200: V1UserProfileResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires user.info) */
          403: ApiError;
          /** Not Found - User not found */
          404: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
      patch: {
        summary: 'Update user profile';
        description: `Update authenticated user's profile information.

**Authentication**: Requires JWT bearer token
**Scope Required**: user.info

Allows updating firstName, lastName, and username. At least one field must be provided.

**Validation**:
- Username must be unique if provided
- At least one field required for update

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        body: UpdateUserProfileRequest;
        responses: {
          /** Successful response with updated profile */
          200: V1UserProfileResponse;
          /** Bad request - Validation error or no fields provided */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires user.info) */
          403: ApiError;
          /** Not Found - User not found */
          404: ApiError;
          /** Conflict - Username already taken */
          409: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
