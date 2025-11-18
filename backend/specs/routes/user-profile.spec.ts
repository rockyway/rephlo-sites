/**
 * Tspec API Specification - User Profile, Invoices, and Usage Endpoints
 *
 * This file defines the OpenAPI spec for user-related endpoints using Tspec.
 * The spec is auto-generated from TypeScript types.
 */

import { Tspec } from 'tspec';
import { User, ApiError } from '@rephlo/shared-types';

// =============================================================================
// GET /api/user/profile - User Profile
// =============================================================================

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

// =============================================================================
// GET /api/user/invoices - User Invoices
// =============================================================================

/**
 * Query parameters for invoice list
 */
export type InvoiceListQueryParams = {
  /** Number of invoices to return (default 10, max 50) */
  limit?: number;
};

/**
 * Invoice item in the list
 */
export interface Invoice {
  /** Stripe invoice ID */
  id: string;
  /** Invoice date (ISO 8601) */
  date: string;
  /** Invoice amount in cents */
  amount: number;
  /** Currency code (USD, EUR, etc.) */
  currency: string;
  /** Invoice status (paid, unpaid, void, etc.) */
  status: string;
  /** PDF download URL */
  pdfUrl: string;
  /** Description of invoice */
  description: string;
}

/**
 * User Invoices Response
 */
export interface UserInvoicesResponse {
  /** List of invoices */
  invoices: Invoice[];
}

// =============================================================================
// GET /api/user/usage/summary - Monthly Usage Summary
// =============================================================================

/**
 * Query parameters for usage summary
 */
export type UsageSummaryQueryParams = {
  /**
   * Period filter:
   * - "current_month" (default) - Current calendar month
   * - "YYYY-MM" format - Specific month (e.g., "2025-11")
   */
  period?: string;
};

/**
 * Model usage statistics
 */
export interface ModelUsageStats {
  /** Model ID */
  modelId: string;
  /** Model name */
  modelName: string;
  /** Number of requests */
  requests: number;
  /** Total tokens consumed */
  tokensUsed: number;
  /** Credits consumed for this model */
  creditsUsed: number;
}

/**
 * Monthly Usage Summary Response
 */
export interface UsageSummaryResponse {
  /** Period identifier (YYYY-MM format) */
  period: string;
  /** Period start date (ISO 8601) */
  periodStart: string;
  /** Period end date (ISO 8601) */
  periodEnd: string;
  /** Credit usage summary */
  creditUsage: {
    /** Free credits used */
    freeCreditsUsed: number;
    /** Pro credits used */
    proCreditsUsed: number;
    /** Total credits used */
    totalCreditsUsed: number;
    /** Remaining free credits */
    freeCreditsRemaining: number;
    /** Remaining pro credits */
    proCreditsRemaining: number;
  };
  /** Total API requests */
  totalRequests: number;
  /** Total tokens consumed */
  totalTokens: number;
  /** Usage by model */
  modelUsage: ModelUsageStats[];
}

/**
 * Tspec API specification for user profile, invoices, and usage endpoints
 */
export type UserProfileApiSpec = Tspec.DefineApiSpec<{
  tags: ['Users', 'Credits'];
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
    '/api/user/invoices': {
      get: {
        summary: 'Get user invoices';
        description: `Retrieve invoice history for the authenticated user.

Returns paginated list of invoices from Stripe with download URLs.
Includes information about subscription renewals, credit purchases, and other billing events.

**Use Case**: Desktop app billing history tab

**Caching Recommendation**: Cache this response for 1 hour on the client side.
Re-fetch when user navigates to billing history or after a new payment.

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        query: InvoiceListQueryParams;
        responses: {
          /** Successful response with invoice list */
          200: UserInvoicesResponse;
          /** Bad request - Invalid limit parameter */
          400: ApiError;
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
    '/api/user/usage/summary': {
      get: {
        summary: 'Get monthly usage summary';
        description: `Retrieve comprehensive usage statistics for the authenticated user.

Returns detailed breakdown of:
- Credit usage (free vs pro)
- API request count
- Token consumption
- Model usage distribution

**Use Case**: Desktop app usage analytics dashboard

**Caching Recommendation**: Cache this response for 15 minutes on the client side.
Re-fetch when user navigates to usage analytics or after making API calls.

**Rate Limit**: 60 requests per minute`;
        security: 'bearerAuth';
        query: UsageSummaryQueryParams;
        responses: {
          /** Successful response with usage summary */
          200: UsageSummaryResponse;
          /** Bad request - Invalid period parameter */
          400: ApiError;
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
