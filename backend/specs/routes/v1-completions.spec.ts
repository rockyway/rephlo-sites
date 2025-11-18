/**
 * Tspec API Specification - V1 Text Completion Endpoint
 *
 * This file defines the OpenAPI spec for /v1/completions (text completion) using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';
import { CompletionUsage } from './v1-chat.spec';

/**
 * Text Completion Request Body
 */
export interface TextCompletionRequest {
  /** Model ID to use for completion */
  model: string;
  /** Input prompt text */
  prompt: string;
  /** Maximum tokens to generate (max: 8192, default: 1000) */
  max_tokens?: number;
  /** Sampling temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Nucleus sampling parameter (0-1) */
  top_p?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Stop sequences (string or array) */
  stop?: string | string[];
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  /** Number of completions to generate (1-10, default: 1) */
  n?: number;
  /** User identifier for tracking */
  user?: string;
  /** Echo the prompt in the response */
  echo?: boolean;
  /** Generate best_of completions and return the best */
  best_of?: number;
  /** Log probabilities for top N tokens */
  logprobs?: number;
}

/**
 * Text Completion Choice
 */
export interface TextCompletionChoice {
  /** Choice index */
  index: number;
  /** Generated text */
  text: string;
  /** Reason completion finished (stop, length, content_filter, null) */
  finish_reason: string | null;
  /** Log probabilities (if requested) */
  logprobs?: {
    /** Token log probabilities */
    token_logprobs: number[];
    /** Top log probabilities per position */
    top_logprobs: Record<string, number>[];
    /** Text offsets */
    text_offset: number[];
  } | null;
}

/**
 * Text Completion Response
 */
export interface TextCompletionResponse {
  /** Unique completion ID */
  id: string;
  /** Object type (text_completion) */
  object: 'text_completion';
  /** Unix timestamp of creation */
  created: number;
  /** Model used for completion */
  model: string;
  /** Array of completion choices */
  choices: TextCompletionChoice[];
  /** Token usage statistics and credits deducted */
  usage: CompletionUsage;
}

/**
 * Tspec API specification for V1 text completion endpoint
 */
export type V1CompletionsApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Inference'];
  paths: {
    '/v1/completions': {
      post: {
        summary: 'Execute text completion request';
        description: `Execute a text completion request using the specified model.

**Authentication**: Requires JWT bearer token
**Scope Required**: llm.inference
**Credit Check**: Ensures user has sufficient credits before execution

**Request Requirements**:
- \`model\`: Valid model ID (must be accessible for user's tier)
- \`prompt\`: Text prompt (required)
- \`max_tokens\`: Maximum 8192 tokens (default: 1000)
- \`temperature\`: 0-2 range (default: 0.7)
- \`n\`: 1-10 completions (default: 1)

**Credit Deduction**:
- Credits are deducted based on token usage and model pricing
- Usage statistics returned in \`usage\` field
- Credits are calculated as: (total_tokens / 1000) * credits_per_1k_tokens

**Tier Access Control**:
- Model access depends on user's subscription tier
- Restricted models return 403 Forbidden
- Upgrade required if model needs higher tier

**Streaming** (if stream=true):
- Response returns Server-Sent Events (SSE)
- Each chunk contains partial completion data
- Final chunk includes usage statistics

**Advanced Parameters**:
- \`echo\`: Include prompt in response text
- \`best_of\`: Generate N completions, return best (costs N times credits)
- \`logprobs\`: Return log probabilities for debugging/analysis

**Rate Limit**: Tier-based limits apply (Free: 10/min, Pro: 60/min, Enterprise: 300/min)`;
        security: 'bearerAuth';
        body: TextCompletionRequest;
        responses: {
          /** Successful completion response */
          200: TextCompletionResponse;
          /** Bad request - Validation error or invalid parameters */
          400: ApiError;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope or model access restricted */
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
