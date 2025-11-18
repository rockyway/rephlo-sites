/**
 * Tspec API Specification - V1 User Preferences Endpoints
 *
 * This file defines the OpenAPI spec for /v1/users/me/preferences endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * User Preferences Response
 * User's preference settings and configuration
 */
export interface UserPreferencesResponse {
  /** User's preferred default model (nullable) */
  defaultModel: string | null;
  /** Email notification preference */
  emailNotifications: boolean;
  /** Usage alert preference */
  usageAlerts: boolean;
}

/**
 * Update User Preferences Request Body
 * Partial update of user preferences
 */
export interface UpdateUserPreferencesRequest {
  /** User's preferred default model (optional) */
  defaultModel?: string | null;
  /** Email notification preference (optional) */
  emailNotifications?: boolean;
  /** Usage alert preference (optional) */
  usageAlerts?: boolean;
}

/**
 * Default Model Response
 * User's default model preference
 */
export interface DefaultModelResponse {
  /** Default model ID (nullable) */
  defaultModel: string | null;
}

/**
 * Set Default Model Request Body
 */
export interface SetDefaultModelRequest {
  /** Model ID to set as default */
  modelId: string;
}

/**
 * Tspec API specification for V1 user preferences endpoints
 */
export type V1UserPreferencesApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Users'];
  paths: {
    '/v1/users/me/preferences': {
      get: {
        summary: 'Get user preferences';
        description: `Retrieve authenticated user's preferences and settings.

**Authentication**: Requires JWT bearer token
**Scope Required**: user.info

Returns user preferences including:
- Default model selection
- Email notification settings
- Usage alert preferences

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with user preferences */
          200: UserPreferencesResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires user.info) */
          403: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
      patch: {
        summary: 'Update user preferences';
        description: `Update authenticated user's preferences and settings.

**Authentication**: Requires JWT bearer token
**Scope Required**: user.info

Allows partial updates to preferences. Only provided fields will be updated.

**Validation**:
- At least one field must be provided
- defaultModel must be a valid model ID if provided

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        body: UpdateUserPreferencesRequest;
        responses: {
          /** Successful response with updated preferences */
          200: UserPreferencesResponse;
          /** Bad request - Validation error or no fields provided */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires user.info) */
          403: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/v1/users/me/preferences/model': {
      patch: {
        summary: 'Update default model preference';
        description: `Set user's default AI model preference.

**Authentication**: Requires JWT bearer token
**Scope Required**: user.info

Sets the default model used for inference requests when no model is specified.

**Validation**:
- modelId must be a valid model ID
- Model must be accessible for user's tier

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        body: SetDefaultModelRequest;
        responses: {
          /** Successful response with updated default model */
          200: DefaultModelResponse;
          /** Bad request - Invalid model ID */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope or model access restricted */
          403: ApiError;
          /** Not Found - Model not found */
          404: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
