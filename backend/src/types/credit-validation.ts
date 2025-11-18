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
  userId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  usagePercentage: number;
}

/**
 * Usage history item response type
 */
export interface UsageHistoryItem {
  id: string;
  modelId: string;
  operation: string;
  creditsUsed: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  requestDurationMs: number | null;
  createdAt: string;
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
    hasMore: boolean;
  };
  summary: {
    totalCreditsUsed: number;
    totalRequests: number;
    totalTokens: number;
  };
}

/**
 * Usage statistics item type
 */
export interface UsageStatsItem {
  date?: string;
  hour?: number;
  modelId?: string;
  creditsUsed: number;
  requestsCount: number;
  tokensTotal: number;
  averageDurationMs: number;
}

/**
 * Usage statistics response type
 */
export interface UsageStatsResponse {
  stats: UsageStatsItem[];
  total: {
    creditsUsed: number;
    requestsCount: number;
    tokensTotal: number;
    averageDurationMs: number;
  };
}

/**
 * Rate limit status response type
 */
export interface RateLimitStatusResponse {
  requestsPerMinute: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
  tokensPerMinute: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
  creditsPerDay: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}
