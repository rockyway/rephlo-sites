/**
 * Tspec API Specification - V1 Credits & Usage Endpoints
 *
 * This file defines the OpenAPI spec for /v1/credits and /v1/usage endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Current Credits Response
 */
export interface V1CurrentCreditsResponse {
  /** Credit record ID */
  id: string;
  /** User ID */
  userId: string;
  /** Total credits allocated for current billing period */
  totalCredits: number;
  /** Credits used in current billing period */
  usedCredits: number;
  /** Remaining credits (total - used) */
  remainingCredits: number;
  /** Billing period start timestamp (ISO 8601) */
  billingPeriodStart: string;
  /** Billing period end timestamp (ISO 8601) */
  billingPeriodEnd: string;
  /** Usage percentage (used/total * 100) */
  usagePercentage: number;
}

/**
 * Query parameters for usage history
 */
export type UsageHistoryQueryParams = {
  /** Start date filter (ISO 8601) */
  start_date?: string;
  /** End date filter (ISO 8601) */
  end_date?: string;
  /** Filter by model ID */
  model_id?: string;
  /** Filter by operation type (completion, chat, embedding, function_call) */
  operation?: 'completion' | 'chat' | 'embedding' | 'function_call';
  /** Number of records to return (1-100, default: 20) */
  limit?: number;
  /** Pagination offset (default: 0) */
  offset?: number;
}

/**
 * Usage History Item
 */
export interface V1UsageHistoryItem {
  /** Usage record ID */
  id: string;
  /** Model ID used */
  modelId: string;
  /** Operation type (completion, chat, embedding, function_call) */
  operation: string;
  /** Credits deducted */
  creditsUsed: number;
  /** Input tokens consumed */
  inputTokens: number | null;
  /** Output tokens generated */
  outputTokens: number | null;
  /** Total tokens (input + output) */
  totalTokens: number | null;
  /** Request duration in milliseconds */
  requestDurationMs: number | null;
  /** Timestamp of request (ISO 8601) */
  createdAt: string;
}

/**
 * Usage History Pagination
 */
export interface V1UsageHistoryPagination {
  /** Limit per page */
  limit: number;
  /** Current offset */
  offset: number;
  /** Total records */
  total: number;
  /** Whether more records exist */
  hasMore: boolean;
}

/**
 * Usage History Summary
 */
export interface V1UsageHistorySummary {
  /** Total credits used in filtered period */
  totalCreditsUsed: number;
  /** Total API requests in filtered period */
  totalRequests: number;
  /** Total tokens consumed in filtered period */
  totalTokens: number;
}

/**
 * Usage History Response
 */
export interface V1UsageHistoryResponse {
  /** Array of usage records */
  usage: V1UsageHistoryItem[];
  /** Pagination metadata */
  pagination: V1UsageHistoryPagination;
  /** Summary statistics */
  summary: V1UsageHistorySummary;
}

/**
 * Tspec API specification for V1 credits and usage endpoints
 */
export type V1CreditsUsageApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Credits & Usage'];
  paths: {
    '/v1/credits/me': {
      get: {
        summary: 'Get current user credits';
        description: `Retrieve authenticated user's current credit balance and allocation.

**Authentication**: Requires JWT bearer token
**Scope Required**: credits.read

Returns detailed credit information including:
- Total credits allocated for current billing period
- Credits used so far
- Remaining credits
- Billing period dates
- Usage percentage

**Response**:
- 200: Credit record found
- 404: No active credit record (should not happen for users with subscriptions)

**Use Case**: Display credit balance in desktop app dashboard

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with credit details */
          200: V1CurrentCreditsResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires credits.read) */
          403: ApiError;
          /** Not Found - No active credit record */
          404: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/v1/usage': {
      get: {
        summary: 'Get usage history with filtering and pagination';
        description: `Retrieve authenticated user's usage history with optional filters.

**Authentication**: Requires JWT bearer token
**Scope Required**: credits.read

Returns paginated usage records with detailed information about each API request including:
- Model used
- Operation type (completion, chat, embedding, function_call)
- Credits deducted
- Token consumption (input, output, total)
- Request duration
- Timestamp

**Query Parameters**:
- \`start_date\`: Filter by start date (ISO 8601 datetime)
- \`end_date\`: Filter by end date (ISO 8601 datetime)
- \`model_id\`: Filter by specific model
- \`operation\`: Filter by operation type
- \`limit\`: Records per page (1-100, default: 20)
- \`offset\`: Pagination offset (default: 0)

**Pagination**:
- Use \`offset\` for pagination
- \`hasMore\` indicates if more records exist
- \`total\` shows total matching records

**Summary Statistics**:
- Response includes summary with total credits used, requests count, and tokens consumed
- Summary respects filters (date range, model, operation)

**Use Case**: Desktop app displays usage analytics and history

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        query: UsageHistoryQueryParams;
        responses: {
          /** Successful response with usage history */
          200: V1UsageHistoryResponse;
          /** Bad request - Invalid query parameters */
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
  };
}>;
