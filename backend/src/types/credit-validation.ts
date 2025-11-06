/**
 * Credit & Usage Validation Schemas
 *
 * Zod schemas for validating credit and usage API requests.
 * Used by credit controller to ensure data integrity.
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { z } from 'zod';

// =============================================================================
// Usage Query Schemas
// =============================================================================

/**
 * Schema for GET /v1/usage query parameters
 * Supports filtering by date range, model, operation, and pagination
 */
export const usageQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  model_id: z.string().optional(),
  operation: z
    .enum(['completion', 'chat', 'embedding', 'function_call'])
    .optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().min(0)),
});

export type UsageQueryParams = z.infer<typeof usageQuerySchema>;

/**
 * Schema for GET /v1/usage/stats query parameters
 * Supports date range and grouping options
 */
export const usageStatsQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['day', 'hour', 'model']).optional().default('day'),
});

export type UsageStatsQueryParams = z.infer<typeof usageStatsQuerySchema>;

// =============================================================================
// Credit Allocation Schema
// =============================================================================

/**
 * Schema for credit allocation request
 * Used by subscription service when creating/renewing subscriptions
 */
export const allocateCreditsSchema = z.object({
  userId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  totalCredits: z.number().int().positive(),
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
});

export type AllocateCreditsInput = z.infer<typeof allocateCreditsSchema>;

// =============================================================================
// Credit Deduction Schema
// =============================================================================

/**
 * Schema for credit deduction request
 * Used by model service after successful inference
 */
export const deductCreditsSchema = z.object({
  userId: z.string().uuid(),
  creditsToDeduct: z.number().int().positive(),
  modelId: z.string(),
  operation: z.enum(['completion', 'chat', 'embedding', 'function_call']),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  requestDurationMs: z.number().int().nonnegative().optional(),
  requestMetadata: z.record(z.any()).optional(),
});

export type DeductCreditsInput = z.infer<typeof deductCreditsSchema>;

// =============================================================================
// Usage Record Schema
// =============================================================================

/**
 * Schema for recording usage
 * Used by model service to log inference requests
 */
export const recordUsageSchema = z.object({
  userId: z.string().uuid(),
  creditId: z.string().uuid().optional(),
  modelId: z.string(),
  operation: z.enum(['completion', 'chat', 'embedding', 'function_call']),
  creditsUsed: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  requestDurationMs: z.number().int().nonnegative().optional(),
  requestMetadata: z.record(z.any()).optional(),
});

export type RecordUsageInput = z.infer<typeof recordUsageSchema>;

// =============================================================================
// Response Types (for type safety, not validation)
// =============================================================================

/**
 * Current credits response type
 */
export interface CurrentCreditsResponse {
  id: string;
  user_id: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  billing_period_start: string;
  billing_period_end: string;
  usage_percentage: number;
}

/**
 * Usage history item response type
 */
export interface UsageHistoryItem {
  id: string;
  model_id: string;
  operation: string;
  credits_used: number;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  request_duration_ms: number | null;
  created_at: string;
}

/**
 * Usage history response type
 */
export interface UsageHistoryResponse {
  usage: UsageHistoryItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  summary: {
    total_credits_used: number;
    total_requests: number;
    total_tokens: number;
  };
}

/**
 * Usage statistics item type
 */
export interface UsageStatsItem {
  date?: string;
  hour?: number;
  model_id?: string;
  credits_used: number;
  requests_count: number;
  tokens_total: number;
  average_duration_ms: number;
}

/**
 * Usage statistics response type
 */
export interface UsageStatsResponse {
  stats: UsageStatsItem[];
  total: {
    credits_used: number;
    requests_count: number;
    tokens_total: number;
    average_duration_ms: number;
  };
}

/**
 * Rate limit status response type
 */
export interface RateLimitStatusResponse {
  requests_per_minute: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
  tokens_per_minute: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
  credits_per_day: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
}
