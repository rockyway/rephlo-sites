/**
 * Tspec API Specification - V1 Usage & Webhooks Endpoints
 *
 * This file defines the OpenAPI spec for usage statistics and webhook endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Query parameters for usage stats
 */
export type UsageStatsQueryParams = {
  /** Aggregation period (day, week, month, year) */
  period?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Usage by Date Item
 * Daily/weekly/monthly usage data point
 */
export interface UsageByDateItem {
  /** Date (ISO 8601 format) */
  date: string;
  /** Credits used on this date */
  creditsUsed: number;
  /** Number of requests on this date */
  requests: number;
}

/**
 * Usage by Model Statistics
 * Aggregated usage per model
 */
export interface UsageByModel {
  /** Model ID as key, with usage stats as value */
  [modelId: string]: {
    /** Total requests for this model */
    requests: number;
    /** Total credits used for this model */
    creditsUsed: number;
  };
}

/**
 * Usage Statistics Response
 * Aggregated usage statistics for specified period
 */
export interface UsageStatsResponse {
  /** Aggregation period used */
  period: string;
  /** Total credits used in period */
  totalCreditsUsed: number;
  /** Total number of requests in period */
  totalRequests: number;
  /** Usage statistics grouped by model */
  byModel: UsageByModel;
  /** Usage statistics over time (array of date points) */
  byDate: UsageByDateItem[];
}

/**
 * Rate Limit Status Response
 * Current rate limit status for authenticated user
 */
export interface RateLimitStatusResponse {
  /** Rate limit (requests per minute) */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Reset time (ISO 8601 timestamp) */
  reset: string;
}

/**
 * Test Webhook Response
 * Result of webhook test request
 */
export interface TestWebhookResponse {
  /** Whether test webhook was sent successfully */
  success: boolean;
  /** Descriptive message about test result */
  message: string;
}

/**
 * Tspec API specification for V1 usage and webhook endpoints
 */
export type V1UsageWebhooksApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Usage', 'V1 - Webhooks'];
  paths: {
    '/v1/usage/stats': {
      get: {
        summary: 'Get usage statistics';
        description: `Get aggregated usage statistics for authenticated user.

**Authentication**: Requires JWT bearer token
**Scope Required**: credits.read

Returns usage statistics aggregated by specified period (default: month).

**Query Parameters**:
- \`period\`: Aggregation period (day, week, month, year) - default: month

**Response Includes**:
- Total credits used in period
- Total number of API requests
- Usage breakdown by model
- Time-series usage data (byDate array)

**Use Cases**:
- Display usage dashboard
- Track credit consumption
- Analyze usage patterns by model
- Historical usage trends

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        query: UsageStatsQueryParams;
        responses: {
          /** Successful response with usage statistics */
          200: UsageStatsResponse;
          /** Bad request - Invalid period parameter */
          400: ApiError;
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
    '/v1/rate-limit': {
      get: {
        summary: 'Get rate limit status';
        description: `Get current rate limit status for authenticated user.

**Authentication**: Requires JWT bearer token

Returns current rate limit information based on user's subscription tier.

**Rate Limits by Tier**:
- Free: 10 requests/minute
- Pro: 60 requests/minute
- Enterprise: 300 requests/minute

**Response Includes**:
- \`limit\`: Max requests per minute for user's tier
- \`remaining\`: Remaining requests in current window
- \`reset\`: ISO 8601 timestamp when limit resets

**Use Cases**:
- Display rate limit info in UI
- Implement client-side rate limiting
- Monitor API usage in real-time

**Headers**: Rate limit info also available in response headers (X-RateLimit-*)

**Rate Limit**: This endpoint does NOT count against rate limit`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with rate limit status */
          200: RateLimitStatusResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/v1/webhooks/test': {
      post: {
        summary: 'Send test webhook';
        description: `Send a test webhook to configured endpoint.

**Authentication**: Requires JWT bearer token

Sends a test webhook event to the user's configured webhook URL.

**Requirements**:
- User must have webhook configured (via /v1/webhooks/config)
- Webhook URL must be reachable

**Test Webhook Payload**:
- Event type: "test"
- Sample data structure
- Timestamp and user ID

**Response**:
- \`success\`: true if webhook sent successfully
- \`message\`: Description of result or error

**Error Cases**:
- 400: No webhook configured for user
- 500: Webhook delivery failed (timeout, unreachable, etc.)

**Use Cases**:
- Verify webhook configuration
- Test webhook endpoint before going live
- Debug webhook integration

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Test webhook sent successfully */
          200: TestWebhookResponse;
          /** Bad request - No webhook configured */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error - Webhook delivery failed */
          500: ApiError;
        };
      };
    };
  };
}>;
