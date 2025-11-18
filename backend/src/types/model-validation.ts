/**
 * Model Management Validation Schemas
 *
 * Zod schemas for validating model-related requests including
 * model listing filters, completion requests, and chat completion requests.
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Model APIs)
 */

import { z } from 'zod';

// =============================================================================
// List Models Query Parameters
// =============================================================================

/**
 * Schema for GET /v1/models query parameters
 * Filters: available, capability, provider
 */
export const listModelsQuerySchema = z.object({
  available: z
    .string()
    .optional()
    .transform((val) => val === undefined ? undefined : val === 'true')
    .pipe(z.boolean().optional()),
  capability: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.split(',').map((c) => c.trim()) : undefined
    )
    .pipe(
      z
        .array(
          z.enum([
            'text',
            'vision',
            'function_calling',
            'code',
            'long_context',
          ])
        )
        .optional()
    ),
  provider: z.string().optional(),
});

export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;

// =============================================================================
// Text Completion Request
// =============================================================================

/**
 * Schema for POST /v1/completions
 * Text completion request validation
 */
export const textCompletionSchema = z.object({
  model: z.string().min(1, 'Model ID is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  max_tokens: z
    .number()
    .int()
    .positive()
    .max(8192, 'max_tokens must not exceed 8192')
    .optional()
    .default(1000),
  temperature: z
    .number()
    .min(0, 'Temperature must be between 0 and 2')
    .max(2, 'Temperature must be between 0 and 2')
    .optional()
    .default(0.7),
  top_p: z
    .number()
    .min(0, 'top_p must be between 0 and 1')
    .max(1, 'top_p must be between 0 and 1')
    .optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  presence_penalty: z
    .number()
    .min(-2, 'presence_penalty must be between -2 and 2')
    .max(2, 'presence_penalty must be between -2 and 2')
    .optional(),
  frequency_penalty: z
    .number()
    .min(-2, 'frequency_penalty must be between -2 and 2')
    .max(2, 'frequency_penalty must be between -2 and 2')
    .optional(),
  n: z.number().int().positive().max(10).optional().default(1),
});

export type TextCompletionRequest = z.infer<typeof textCompletionSchema>;

// =============================================================================
// Chat Completion Request
// =============================================================================

/**
 * Message role enum for chat completions
 */
export const chatMessageRoleSchema = z.enum([
  'system',
  'user',
  'assistant',
  'function',
]);

/**
 * Chat message schema
 */
export const chatMessageSchema = z.object({
  role: chatMessageRoleSchema,
  content: z.string().min(1, 'Message content cannot be empty'),
  name: z.string().optional(), // For function messages
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(), // For assistant messages with function calls
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Schema for POST /v1/chat/completions
 * Chat completion request validation
 */
export const chatCompletionSchema = z.object({
  model: z.string().min(1, 'Model ID is required'),
  messages: z
    .array(chatMessageSchema)
    .min(1, 'At least one message is required'),
  max_tokens: z
    .number()
    .int()
    .positive()
    .max(8192, 'max_tokens must not exceed 8192')
    .optional()
    .default(1000),
  temperature: z
    .number()
    .min(0, 'Temperature must be between 0 and 2')
    .max(2, 'Temperature must be between 0 and 2')
    .optional()
    .default(0.7),
  top_p: z
    .number()
    .min(0, 'top_p must be between 0 and 1')
    .max(1, 'top_p must be between 0 and 1')
    .optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  presence_penalty: z
    .number()
    .min(-2, 'presence_penalty must be between -2 and 2')
    .max(2, 'presence_penalty must be between -2 and 2')
    .optional(),
  frequency_penalty: z
    .number()
    .min(-2, 'frequency_penalty must be between -2 and 2')
    .max(2, 'frequency_penalty must be between -2 and 2')
    .optional(),
  n: z.number().int().positive().max(10).optional().default(1),
  functions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.any()).optional(),
      })
    )
    .optional(),
  function_call: z
    .union([z.literal('auto'), z.literal('none'), z.object({ name: z.string() })])
    .optional(),
});

export type ChatCompletionRequest = z.infer<typeof chatCompletionSchema>;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Legacy model information
 */
export interface LegacyInfo {
  isLegacy: boolean;
  replacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string; // ISO 8601
}

/**
 * Model listing response
 */
export interface ModelListItem {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  capabilities: string[];
  context_length: number;
  max_output_tokens: number | null;
  credits_per_1k_tokens: number;
  is_available: boolean;
  is_legacy?: boolean; // NEW: Legacy status
  is_archived?: boolean; // NEW: Archived status
  version: string | null;
  // Tier access control fields
  required_tier: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual';
  tier_restriction_mode: 'minimum' | 'exact' | 'whitelist';
  allowed_tiers: Array<'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'>;
  access_status: 'allowed' | 'restricted' | 'upgrade_required';
  legacy_info?: LegacyInfo; // NEW: Legacy deprecation info
}

export interface ModelListResponse {
  models: ModelListItem[];
  total: number;
  user_tier?: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'; // Current user's tier (if provided)
}

/**
 * Model details response
 */
export interface ModelDetailsResponse {
  id: string;
  name: string;
  display_name: string;
  provider: string;
  description: string | null;
  capabilities: string[];
  context_length: number;
  max_output_tokens: number | null;
  input_cost_per_million_tokens: number;
  output_cost_per_million_tokens: number;
  credits_per_1k_tokens: number;
  is_available: boolean;
  is_deprecated: boolean;
  is_legacy?: boolean; // NEW: Legacy status
  is_archived?: boolean; // NEW: Archived status
  version: string | null;
  created_at: string;
  updated_at: string;
  // Tier access control fields
  required_tier: 'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual';
  tier_restriction_mode: 'minimum' | 'exact' | 'whitelist';
  allowed_tiers: Array<'free' | 'pro' | 'pro_max' | 'enterprise_pro' | 'enterprise_max' | 'perpetual'>;
  access_status: 'allowed' | 'restricted' | 'upgrade_required';
  upgrade_info?: {
    required_tier: string;
    upgrade_url: string;
  };
  legacy_info?: LegacyInfo; // NEW: Legacy deprecation info
}

/**
 * Text completion response
 */
export interface TextCompletionChoice {
  text: string;
  index: number;
  finish_reason: string | null;
}

export interface CompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsUsed: number;
  cachedTokens?: number; // Optional: For Anthropic/Google prompt caching
}

export interface TextCompletionResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: TextCompletionChoice[];
  usage: CompletionUsage;
}

/**
 * Chat completion response
 */
export interface ChatCompletionMessage {
  role: string;
  content: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: CompletionUsage;
}

/**
 * Streaming chunk types
 */
export interface TextCompletionChunk {
  id: string;
  object: 'text_completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    text: string;
    finish_reason: string | null;
  }>;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: CompletionUsage; // Only in final chunk
}
