/**
 * Tspec API Specification - V1 Webhook Configuration Endpoints
 *
 * This file defines the OpenAPI spec for /v1/webhooks endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Webhook Configuration Response
 */
export interface V1WebhookConfigResponse {
  /** Webhook configuration ID */
  id: string;
  /** User ID */
  user_id: string;
  /** Webhook URL endpoint */
  webhook_url: string;
  /** Whether webhook is active */
  is_active: boolean;
  /** Configuration creation timestamp (ISO 8601) */
  created_at: string;
  /** Configuration last update timestamp (ISO 8601) */
  updated_at: string;
}

/**
 * Tspec API specification for V1 webhook configuration endpoints
 */
export type V1WebhooksApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Webhooks'];
  paths: {
    '/v1/webhooks/config': {
      get: {
        summary: 'Get user webhook configuration';
        description: `Retrieve authenticated user's webhook configuration.

**Authentication**: Requires JWT bearer token

Returns webhook configuration details including:
- Webhook URL endpoint
- Active status
- Configuration metadata

**Security Note**:
- Webhook secret is NOT included in response for security
- Secret is only returned when configuration is created/updated

**Response Cases**:
- 200: Webhook configuration found
- 404: User has no webhook configuration

**Use Case**: Desktop app displays webhook settings for receiving API event notifications

**Webhook Events**:
Webhooks receive notifications for:
- API request completions
- Credit balance updates
- Subscription changes
- Usage threshold alerts

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        responses: {
          /** Successful response with webhook configuration */
          200: V1WebhookConfigResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Not Found - No webhook configuration */
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
