/**
 * Tspec API Specification - Admin Core Endpoints
 *
 * This file defines the OpenAPI spec for core admin endpoints using Tspec.
 * All endpoints require admin authentication (bearerAuth).
 *
 * Endpoints:
 * - GET /admin/metrics - System metrics and analytics
 * - GET /admin/users - List users with pagination/filtering
 * - POST /admin/users/{id}/suspend - Suspend user account
 * - GET /admin/subscriptions - Subscription overview statistics
 * - GET /admin/usage - System usage statistics
 * - POST /admin/webhooks/test - Test webhook delivery
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

// =============================================================================
// GET /admin/metrics - System Metrics
// =============================================================================

/**
 * Admin Metrics Response
 * Legacy format with success flag
 */
export interface AdminMetricsResponse {
  /** Legacy success flag */
  success: boolean;
  /** Aggregated system metrics */
  data: {
    /** Download statistics by platform */
    downloads: {
      /** Windows download count */
      windows: number;
      /** macOS download count */
      macos: number;
      /** Linux download count */
      linux: number;
      /** Total download count */
      total: number;
    };
    /** Feedback submission statistics */
    feedback: {
      /** Total feedback submissions */
      total: number;
      /** Feedback submissions in last 7 days */
      recentCount: number;
    };
    /** Diagnostic upload statistics */
    diagnostics: {
      /** Total diagnostic uploads */
      total: number;
      /** Total size of diagnostics in bytes */
      totalSize: number;
    };
    /** Timestamp information */
    timestamps: {
      /** Timestamp of first download (nullable) */
      firstDownload: string | null;
      /** Timestamp of last download (nullable) */
      lastDownload: string | null;
    };
  };
}

// =============================================================================
// GET /admin/users - List Users
// =============================================================================

/**
 * Query parameters for listing users
 */
export type AdminUsersQueryParams = {
  /** Page number for pagination */
  page?: number;
  /** Number of users per page (max 100) */
  limit?: number;
  /** Search by email or username (case-insensitive) */
  search?: string;
  /** Filter by subscription tier */
  tier?: 'free' | 'pro' | 'enterprise';
}

/**
 * User subscription information
 */
export interface AdminUserSubscription {
  /** Subscription tier */
  tier: 'free' | 'pro' | 'enterprise';
  /** Subscription status */
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  /** Start of current billing period */
  currentPeriodStart: string;
  /** End of current billing period */
  currentPeriodEnd: string;
}

/**
 * Admin user list item
 */
export interface AdminUserListItem {
  /** User ID */
  id: string;
  /** User email address */
  email: string;
  /** Email verification status */
  emailVerified: boolean;
  /** Username (nullable) */
  username?: string | null;
  /** First name (nullable) */
  firstName?: string | null;
  /** Last name (nullable) */
  lastName?: string | null;
  /** Account creation date */
  createdAt: string;
  /** Last login timestamp (nullable) */
  lastLoginAt?: string | null;
  /** Active subscription (nullable) */
  subscription?: AdminUserSubscription | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Users per page */
  limit: number;
  /** Total number of users */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Admin Users List Response
 */
export interface AdminUsersListResponse {
  /** List of users */
  users: AdminUserListItem[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// =============================================================================
// POST /admin/users/{id}/suspend - Suspend User
// =============================================================================

/**
 * Request body for suspending a user
 */
export interface SuspendUserRequest {
  /** Optional reason for suspension */
  reason?: string;
}

/**
 * Suspend User Response
 */
export interface SuspendUserResponse {
  /** Success flag */
  success: boolean;
  /** Status message */
  message: string;
  /** User ID that was suspended */
  userId: string;
  /** Implementation note */
  note: string;
}

/**
 * User not found error response
 */
export interface UserNotFoundError {
  /** Error details */
  error: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
  };
}

// =============================================================================
// GET /admin/subscriptions - Subscription Overview
// =============================================================================

/**
 * Subscription statistics item
 */
export interface SubscriptionStatItem {
  /** Subscription tier */
  tier: 'free' | 'pro' | 'enterprise';
  /** Subscription status */
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  /** Number of subscriptions with this tier/status */
  count: number;
}

/**
 * Admin Subscription Overview Response
 */
export interface AdminSubscriptionOverviewResponse {
  /** Detailed breakdown of subscriptions */
  subscriptionStats: SubscriptionStatItem[];
  /** Total active subscriptions across all tiers */
  totalActive: number;
  /** Subscription counts grouped by tier */
  byTier: Record<string, number>;
  /** Subscription counts grouped by status */
  byStatus: Record<string, number>;
}

// =============================================================================
// GET /admin/usage - System Usage Statistics
// =============================================================================

/**
 * Query parameters for usage statistics
 */
export type AdminUsageQueryParams = {
  /** Start date for usage data (ISO-8601 format) */
  startDate?: string;
  /** End date for usage data (ISO-8601 format) */
  endDate?: string;
}

/**
 * Usage by model item
 */
export interface UsageByModelItem {
  /** Model identifier */
  modelId: string;
  /** Number of operations with this model */
  operations: number;
  /** Credits used by this model */
  creditsUsed: number;
}

/**
 * Usage by operation type item
 */
export interface UsageByOperationItem {
  /** Operation type */
  operationType: string;
  /** Number of operations of this type */
  operations: number;
  /** Credits used by this operation type */
  creditsUsed: number;
}

/**
 * Date range information
 */
export interface UsageDateRange {
  /** Start date of the query range (nullable) */
  startDate: string | null;
  /** End date of the query range (nullable) */
  endDate: string | null;
}

/**
 * Admin Usage Response
 */
export interface AdminUsageResponse {
  /** Total number of operations */
  totalOperations: number;
  /** Total credits consumed */
  totalCreditsUsed: number;
  /** Usage breakdown by AI model */
  byModel: UsageByModelItem[];
  /** Usage breakdown by operation type */
  byOperation: UsageByOperationItem[];
  /** Date range for the query */
  dateRange: UsageDateRange;
}

/**
 * Invalid date error response
 */
export interface InvalidDateError {
  /** Error details */
  error: {
    /** Error code (invalid_date or invalid_range) */
    code: string;
    /** Error message */
    message: string;
  };
}

// =============================================================================
// POST /admin/webhooks/test - Test Webhook Delivery
// =============================================================================

/**
 * Test webhook request body
 */
export interface TestWebhookRequest {
  /** Webhook endpoint URL to test */
  url: string;
  /** Event type to simulate */
  event: string;
}

/**
 * Test webhook payload
 */
export interface TestWebhookPayload {
  /** Event type */
  event: string;
  /** Timestamp of the test */
  timestamp: string;
  /** Test data */
  data: Record<string, unknown>;
}

/**
 * Test webhook response
 */
export interface TestWebhookResponse {
  /** Success flag */
  success: boolean;
  /** Status message */
  message: string;
  /** Implementation note */
  note: string;
  /** Test webhook payload that would be sent */
  payload: TestWebhookPayload;
}

/**
 * Invalid URL error response
 */
export interface InvalidUrlError {
  /** Error details */
  error: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
  };
}

// =============================================================================
// Tspec API Specification
// =============================================================================

/**
 * Tspec API specification for admin core endpoints
 */
export type AdminCoreApiSpec = Tspec.DefineApiSpec<{
  tags: ['Admin'];
  paths: {
    '/admin/metrics': {
      get: {
        summary: 'Get system metrics';
        description: `Get aggregated system metrics and analytics including downloads, feedback, diagnostics, and timestamps.

**Authentication**: Requires Bearer token with admin role

**Response Format**: Legacy format with \`{success: true, data: {...}}\`

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        responses: {
          /** System metrics retrieved successfully */
          200: AdminMetricsResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Invalid admin token */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/users': {
      get: {
        summary: 'List users';
        description: `List and manage users with pagination and filtering.

**Authentication**: Requires Bearer token with admin role

**Query Parameters**:
- \`page\`: Page number (default: 1, min: 1)
- \`limit\`: Items per page (default: 50, min: 1, max: 100)
- \`search\`: Search by email or username (case-insensitive)
- \`tier\`: Filter by subscription tier (free, pro, enterprise)

**Response Format**: Modern format

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        query: AdminUsersQueryParams;
        responses: {
          /** Users retrieved successfully */
          200: AdminUsersListResponse;
          /** Invalid query parameters */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Invalid admin token */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/users/{id}/suspend': {
      post: {
        summary: 'Suspend user account';
        description: `Suspend a user account with optional reason.

**Authentication**: Requires Bearer token with admin role

**Response Format**: Modern format

**Note**: This is a placeholder implementation. Full suspension functionality requires User model updates.`;
        security: 'bearerAuth';
        path: { id: string };
        body: SuspendUserRequest;
        responses: {
          /** User suspended successfully */
          200: SuspendUserResponse;
          /** Invalid request body */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Invalid admin token */
          403: ApiError;
          /** User not found */
          404: UserNotFoundError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/subscriptions': {
      get: {
        summary: 'Get subscription overview';
        description: `Get subscription overview and statistics grouped by tier and status.

**Authentication**: Requires Bearer token with admin role

**Response Format**: Modern format

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        responses: {
          /** Subscription statistics retrieved successfully */
          200: AdminSubscriptionOverviewResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Invalid admin token */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/usage': {
      get: {
        summary: 'Get system usage statistics';
        description: `Get system-wide usage statistics with optional date range filtering.

**Authentication**: Requires Bearer token with admin role

**Query Parameters**:
- \`startDate\`: Start date for usage data (ISO-8601 format, e.g., "2025-10-01T00:00:00Z")
- \`endDate\`: End date for usage data (ISO-8601 format, e.g., "2025-11-01T00:00:00Z")

**Validation**:
- Both dates must be in ISO-8601 format
- Start date must be before end date

**Error Codes**:
- \`invalid_date\`: Invalid date format
- \`invalid_range\`: Start date must be before end date

**Response Format**: Modern format

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        query: AdminUsageQueryParams;
        responses: {
          /** Usage statistics retrieved successfully */
          200: AdminUsageResponse;
          /** Invalid date format or range */
          400: InvalidDateError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Invalid admin token */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/admin/webhooks/test': {
      post: {
        summary: 'Test webhook delivery';
        description: `Test webhook delivery by sending a test payload to a specified URL.

**Authentication**: Requires Bearer token with admin role

**Request Body**:
- \`url\`: Webhook endpoint URL to test (required, must be valid URI)
- \`event\`: Event type to simulate (required, string)

**Validation**:
- URL must be a valid URI format
- Both fields are required

**Error Codes**:
- \`invalid_url\`: Invalid URL format
- \`invalid_input\`: Missing required field

**Response Format**: Modern format

**Note**: This is a placeholder implementation. Full functionality requires WebhookService.sendTestWebhook implementation.`;
        security: 'bearerAuth';
        body: TestWebhookRequest;
        responses: {
          /** Test webhook processed */
          200: TestWebhookResponse;
          /** Invalid URL or event */
          400: InvalidUrlError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Invalid admin token */
          403: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
