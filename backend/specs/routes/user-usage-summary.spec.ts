/**
 * Tspec API Specification - User Usage Summary Endpoint
 *
 * This file defines the OpenAPI spec for /api/user/usage/summary using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Query parameters for usage summary
 */
export interface UsageSummaryQueryParams {
  /** Period to query: "current_month" (default) or "YYYY-MM" format */
  period?: string;
}

/**
 * Usage Summary Statistics
 * Aggregated usage statistics for a billing period
 */
export interface UsageSummary {
  /** Total credits used in period */
  creditsUsed: number;
  /** Total API requests made */
  apiRequests: number;
  /** Total tokens consumed (input + output) */
  totalTokens: number;
  /** Average tokens per request */
  averageTokensPerRequest: number;
  /** Most frequently used model */
  mostUsedModel: string;
  /** Percentage of requests using most used model */
  mostUsedModelPercentage: number;
}

/**
 * Credit Breakdown by Type
 * Breakdown of credit usage by allocation source
 */
export interface CreditBreakdown {
  /** Free tier credits used */
  freeCreditsUsed: number;
  /** Free tier credit limit */
  freeCreditsLimit: number;
  /** Pro subscription credits used */
  proCreditsUsed: number;
  /** One-time purchased credits used */
  purchasedCreditsUsed: number;
}

/**
 * Model Usage Breakdown
 * Per-model usage statistics
 */
export interface ModelBreakdown {
  /** Model identifier (e.g., "gpt-4") */
  model: string;
  /** Provider name (e.g., "openai") */
  provider: string;
  /** Number of requests to this model */
  requests: number;
  /** Total tokens consumed by this model */
  tokens: number;
  /** Total credits consumed by this model */
  credits: number;
  /** Percentage of total usage */
  percentage: number;
}

/**
 * Monthly Usage Summary Response
 * Comprehensive usage analytics for a billing period
 */
export interface UsageSummaryResponse {
  /** Period identifier (e.g., "2025-11") */
  period: string;
  /** Period start timestamp */
  periodStart: string;
  /** Period end timestamp */
  periodEnd: string;
  /** Aggregated usage summary */
  summary: UsageSummary;
  /** Credit usage breakdown */
  creditBreakdown: CreditBreakdown;
  /** Per-model usage breakdown */
  modelBreakdown: ModelBreakdown[];
}

/**
 * Tspec API specification for usage summary endpoint
 */
export type UsageSummaryApiSpec = Tspec.DefineApiSpec<{
  tags: ['Credits'];
  paths: {
    '/api/user/usage/summary': {
      get: {
        summary: 'Get monthly usage summary';
        description: `Retrieve comprehensive usage statistics for authenticated user.

Returns detailed breakdown of:
- Credit usage (free, pro, purchased)
- API requests and token consumption
- Model distribution and usage patterns
- Period-specific analytics

**Use Case**: Desktop app displays monthly usage dashboard with charts.

**Caching**: Cache response for 1 hour. Usage data is updated every 5 minutes.

**Rate Limit**: 60 requests per minute`;
        security: 'bearerAuth';
        query: UsageSummaryQueryParams;
        responses: {
          /** Successful response with usage summary */
          200: UsageSummaryResponse;
          /** Bad request - Invalid period format */
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
  };
}>;
