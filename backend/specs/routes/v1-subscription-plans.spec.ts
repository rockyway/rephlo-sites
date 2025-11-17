/**
 * Tspec API Specification - V1 Subscription Plans Endpoints
 *
 * This file defines the OpenAPI spec for subscription plan-related endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Subscription Plan Item
 * Individual plan in the list response
 */
export interface SubscriptionPlanItem {
  /** Plan ID */
  id: string;
  /** Plan name */
  name: string;
  /** Subscription tier (free, pro, enterprise) */
  tier: string;
  /** Price in currency units (e.g., 9.99 for $9.99) */
  price: number;
  /** Currency code (USD, EUR, etc.) */
  currency: string;
  /** Billing interval (month, year) */
  interval: string;
  /** List of features included in plan */
  features: string[];
}

/**
 * Subscription Plans List Response
 */
export interface SubscriptionPlansResponse {
  /** Array of available subscription plans */
  plans: SubscriptionPlanItem[];
}

/**
 * Create Subscription Request Body
 */
export interface CreateSubscriptionRequest {
  /** Plan ID to subscribe to */
  planId: string;
  /** Payment method ID from Stripe (optional for free tier) */
  paymentMethodId?: string;
}

/**
 * Subscription Info Response
 * Complete subscription information
 */
export interface SubscriptionInfoResponse {
  /** Subscription tier (free, pro, enterprise) */
  tier: string;
  /** Subscription status (active, cancelled, expired, trialing) */
  status: string;
  /** Current billing period start (ISO 8601, nullable) */
  currentPeriodStart: string | null;
  /** Current billing period end (ISO 8601, nullable) */
  currentPeriodEnd: string | null;
  /** Whether subscription cancels at period end */
  cancelAtPeriodEnd: boolean;
}

/**
 * Tspec API specification for V1 subscription plan endpoints
 */
export type V1SubscriptionPlansApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Subscriptions'];
  paths: {
    '/v1/subscription-plans': {
      get: {
        summary: 'List subscription plans';
        description: `Get available subscription plans (public endpoint).

**Authentication**: NOT REQUIRED - Public endpoint

Returns all available subscription plans with pricing and features.

**Response Includes**:
- Plan ID and name
- Pricing information (price, currency, interval)
- Feature list for each tier
- Available for free, pro, and enterprise tiers

**Use Case**: Display pricing page, compare plans

**Rate Limit**: Standard rate limits apply (more lenient for public endpoint)`;
        responses: {
          /** Successful response with subscription plans */
          200: SubscriptionPlansResponse;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/v1/subscriptions': {
      post: {
        summary: 'Create subscription';
        description: `Create new subscription for authenticated user.

**Authentication**: Requires JWT bearer token

Creates a new subscription or upgrades existing subscription to selected plan.

**Request Requirements**:
- \`planId\`: Valid plan ID from /v1/subscription-plans
- \`paymentMethodId\`: Stripe payment method ID (required for paid plans)

**Subscription Creation**:
- Free tier: No payment method required
- Paid tiers: Valid Stripe payment method required
- Automatically starts trial if configured for plan
- Creates billing subscription in Stripe

**Response**: Returns created subscription details

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        body: CreateSubscriptionRequest;
        responses: {
          /** Subscription created successfully */
          201: SubscriptionInfoResponse;
          /** Bad request - Invalid plan ID or payment method */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/v1/subscriptions/me/cancel': {
      post: {
        summary: 'Cancel subscription';
        description: `Cancel current subscription (effective at period end).

**Authentication**: Requires JWT bearer token

Cancels the user's active subscription. Subscription remains active until the end of the current billing period.

**Cancellation Behavior**:
- Subscription marked for cancellation at period end
- User retains access until \`currentPeriodEnd\`
- No refund for remaining period
- User can still use allocated credits until period end
- Status changes to 'cancelled'
- \`cancelAtPeriodEnd\` flag set to true

**Reactivation**: User can resubscribe before period end to prevent cancellation

**Response**: Returns updated subscription details with cancellation flag

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Subscription cancelled successfully */
          200: SubscriptionInfoResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Not Found - No active subscription to cancel */
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
