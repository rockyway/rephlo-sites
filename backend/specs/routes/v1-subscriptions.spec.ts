/**
 * Tspec API Specification - V1 Subscription Management Endpoints
 *
 * This file defines the OpenAPI spec for /v1/subscriptions endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Subscription Response
 * Current user's subscription details
 */
export interface V1SubscriptionResponse {
  /** Subscription ID */
  id: string;
  /** User ID */
  user_id: string;
  /** Subscription tier (free, pro, pro_max, enterprise_pro, enterprise_max, perpetual) */
  tier: string;
  /** Subscription status (active, inactive, canceled, past_due, trialing) */
  status: string;
  /** Credits per month allocation */
  credits_per_month: number;
  /** Whether credits rollover to next month */
  credits_rollover: boolean;
  /** Billing interval (monthly, yearly, lifetime) */
  billing_interval: string;
  /** Price in cents */
  price_cents: number;
  /** Current billing period start (ISO 8601) */
  current_period_start: string;
  /** Current billing period end (ISO 8601) */
  current_period_end: string;
  /** Trial end date (ISO 8601, nullable) */
  trial_end: string | null;
  /** Subscription creation timestamp (ISO 8601) */
  created_at: string;
}

/**
 * Tspec API specification for V1 subscription endpoints
 */
export type V1SubscriptionsApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Subscriptions'];
  paths: {
    '/v1/subscriptions/me': {
      get: {
        summary: 'Get current user subscription';
        description: `Retrieve authenticated user's current subscription information.

**Authentication**: Requires JWT bearer token

Returns detailed subscription information including:
- Subscription tier and status
- Credits allocation per month
- Billing interval and price
- Current billing period dates
- Trial end date (if in trial)

**Response Cases**:
- 200: Active subscription found
- 404: User does not have an active subscription (e.g., free tier with no payment)

**Subscription Statuses**:
- \`active\`: Subscription is active and paid
- \`trialing\`: In trial period
- \`past_due\`: Payment failed, subscription still active but needs payment
- \`canceled\`: Subscription canceled (may still have access until period end)
- \`inactive\`: Subscription expired or not started

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with subscription details */
          200: V1SubscriptionResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Not Found - No active subscription */
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
