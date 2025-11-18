/**
 * Tspec API Specification - V1 Model Management Endpoints
 *
 * This file defines the OpenAPI spec for /v1/models endpoints using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Query parameters for listing models
 */
export type ListModelsQueryParams = {
  /** Filter by availability (true/false) */
  available?: boolean;
  /** Comma-separated list of capabilities (text, vision, function_calling, code, long_context) */
  capability?: string;
  /** Filter by provider (openai, anthropic, google) */
  provider?: string;
}

/**
 * Legacy model information
 */
export interface LegacyInfo {
  /** Whether model is legacy/deprecated */
  isLegacy: boolean;
  /** Recommended replacement model ID */
  replacementModelId?: string;
  /** Deprecation notice message */
  deprecationNotice?: string;
  /** Sunset date (ISO 8601) */
  sunsetDate?: string;
}

/**
 * Model List Item
 * Individual model in the list response
 */
export interface ModelListItem {
  /** Model ID */
  id: string;
  /** Model name */
  name: string;
  /** Provider (openai, anthropic, google) */
  provider: string;
  /** Model description */
  description: string | null;
  /** Model capabilities (text, vision, function_calling, code, long_context) */
  capabilities: string[];
  /** Context window length */
  context_length: number;
  /** Maximum output tokens */
  max_output_tokens: number | null;
  /** Credits per 1k tokens */
  credits_per_1k_tokens: number;
  /** Whether model is available */
  is_available: boolean;
  /** Whether model is legacy */
  is_legacy?: boolean;
  /** Whether model is archived */
  is_archived?: boolean;
  /** Model version */
  version: string | null;
  /** Required tier to access (free, pro, pro_max, enterprise_pro, enterprise_max, perpetual) */
  required_tier: string;
  /** Tier restriction mode (minimum, exact, whitelist) */
  tier_restriction_mode: string;
  /** Allowed tiers for access */
  allowed_tiers: string[];
  /** Access status for current user (allowed, restricted, upgrade_required) */
  access_status: string;
  /** Legacy deprecation information */
  legacy_info?: LegacyInfo;
}

/**
 * Model List Response
 */
export interface ModelListResponse {
  /** List of models */
  models: ModelListItem[];
  /** Total number of models */
  total: number;
  /** Current user's tier (if authenticated) */
  user_tier?: string;
}

/**
 * Path parameters for model detail endpoint
 */
export interface ModelDetailPathParams {
  /** Model ID (UUID or string identifier) */
  modelId: string;
}

/**
 * Model Detail Response
 * Detailed information about a specific model (same as ModelListItem)
 */
export interface ModelDetailResponse extends ModelListItem {
  /** Model ID */
  id: string;
  /** Model name */
  name: string;
  /** Provider (openai, anthropic, google) */
  provider: string;
  /** Model description */
  description: string | null;
  /** Model capabilities (text, vision, function_calling, code, long_context) */
  capabilities: string[];
  /** Context window length */
  context_length: number;
  /** Maximum output tokens */
  max_output_tokens: number | null;
  /** Credits per 1k tokens */
  credits_per_1k_tokens: number;
  /** Whether model is available */
  is_available: boolean;
  /** Whether model is legacy */
  is_legacy?: boolean;
  /** Whether model is archived */
  is_archived?: boolean;
  /** Model version */
  version: string | null;
  /** Required tier to access (free, pro, pro_max, enterprise_pro, enterprise_max, perpetual) */
  required_tier: string;
  /** Tier restriction mode (minimum, exact, whitelist) */
  tier_restriction_mode: string;
  /** Allowed tiers for access */
  allowed_tiers: string[];
  /** Access status for current user (allowed, restricted, upgrade_required) */
  access_status: string;
  /** Legacy deprecation information */
  legacy_info?: LegacyInfo;
}

/**
 * Tspec API specification for V1 model management endpoints
 */
export type V1ModelsApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Models'];
  paths: {
    '/v1/models': {
      get: {
        summary: 'List available models';
        description: `Retrieve list of available LLM models with optional filters.

**Authentication**: Requires JWT bearer token
**Scope Required**: models.read

Returns models with tier access control information. Access status indicates whether the current user can use each model based on their subscription tier.

**Query Parameters**:
- \`available\`: Filter by availability (true/false)
- \`capability\`: Comma-separated capabilities (text, vision, function_calling, code, long_context)
- \`provider\`: Filter by provider (openai, anthropic, google)

**Tier Access Control**:
- Each model has a \`required_tier\` and \`access_status\`
- \`access_status\` values: allowed, restricted, upgrade_required
- Includes upgrade information if user needs to upgrade tier

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        query: ListModelsQueryParams;
        responses: {
          /** Successful response with model list */
          200: ModelListResponse;
          /** Bad request - Invalid query parameters */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires models.read) */
          403: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
    '/v1/models/{modelId}': {
      get: {
        summary: 'Get model details';
        description: `Retrieve detailed information about a specific model.

**Authentication**: Requires JWT bearer token
**Scope Required**: models.read

Returns comprehensive model information including:
- Model specifications (context length, max tokens)
- Pricing (credits per 1k tokens)
- Tier access control and availability
- Legacy/deprecation status if applicable

**Path Parameter**:
- \`modelId\`: Model identifier (UUID or string)

**Tier Access Control**:
- \`access_status\` indicates if current user can use this model
- Values: allowed, restricted, upgrade_required
- Includes tier upgrade information if needed

**Rate Limit**: Standard tier-based limits apply`;
        security: 'bearerAuth';
        path: ModelDetailPathParams;
        responses: {
          /** Successful response with model details */
          200: ModelDetailResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires models.read) */
          403: ApiError;
          /** Not Found - Model not found */
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
