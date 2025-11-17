/**
 * Tspec API Specification - User Profile Endpoint
 *
 * This file defines the OpenAPI spec for /api/user/profile using Tspec.
 * The spec is auto-generated from TypeScript types.
 */

import { Tspec } from 'tspec';
import { User, ApiError } from '@rephlo/shared-types';

/**
 * User Profile Response
 * Complete user profile with subscription and preferences
 */
export interface UserProfileResponse {
  /** User ID */
  userId: string;
  /** Email address */
  email: string;
  /** Display name */
  displayName: string;
  /** Subscription information */
  subscription: {
    /** Subscription tier (free, pro, enterprise) */
    tier: string;
    /** Subscription status (active, inactive, canceled, past_due) */
    status: string;
    /** Start of current billing period */
    currentPeriodStart: string;
    /** End of current billing period */
    currentPeriodEnd: string;
    /** Whether subscription will cancel at period end */
    cancelAtPeriodEnd: boolean;
  };
  /** User preferences */
  preferences: {
    /** Default AI model preference */
    defaultModel: string;
    /** Email notification preference */
    emailNotifications: boolean;
    /** Usage alert preference */
    usageAlerts: boolean;
  };
  /** Account creation timestamp */
  accountCreatedAt: string;
  /** Last login timestamp */
  lastLoginAt: string;
}

/**
 * Tspec API specification for user profile endpoints
 */
export type UserProfileApiSpec = Tspec.DefineApiSpec<{
  tags: ['Users'];
  paths: {
    '/api/user/profile': {
      get: {
        summary: 'Get detailed user profile';
        description: `Retrieve authenticated user's complete profile including:
- Email and display name
- Subscription tier and status
- User preferences (default model, notification settings)
- Account timestamps

**Caching Recommendation**: Cache this response for 1 hour on the client side.
Re-fetch only when profile data is explicitly needed (e.g., settings page).

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with user profile */
          200: UserProfileResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope */
          403: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
