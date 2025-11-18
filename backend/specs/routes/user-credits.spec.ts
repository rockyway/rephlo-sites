/**
 * Tspec API Specification - User Credits Endpoints
 *
 * This file defines the OpenAPI spec for /api/user/credits using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Detailed Credits Response
 * Comprehensive breakdown of user's credit allocation and usage
 */
export interface DetailedCreditsResponse {
  /** Current credit allocation */
  allocation: {
    /** Monthly allocated credits from subscription */
    monthlyTotal: number;
    /** One-time purchased credits */
    purchasedTotal: number;
    /** Total credits used over lifetime */
    lifetimeUsed: number;
  };
  /** Total available credits (monthly remaining + purchased) */
  totalAvailable: number;
  /** Last credit balance update timestamp */
  lastUpdated: string;
}

/**
 * Tspec API specification for user credits endpoints
 */
export type UserCreditsApiSpec = Tspec.DefineApiSpec<{
  tags: ['Credits'];
  paths: {
    '/api/user/credits': {
      get: {
        summary: 'Get detailed credit information';
        description: `Retrieve authenticated user's detailed credit breakdown including:
- Monthly subscription credits
- Purchased credits
- Lifetime usage statistics
- Total available credits

**Caching Recommendation**: Cache this response for 5 minutes on the client side.
Re-fetch after API requests that consume credits.

**Rate Limit**: 60 requests per minute`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with detailed credits */
          200: DetailedCreditsResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires credits.read) */
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
