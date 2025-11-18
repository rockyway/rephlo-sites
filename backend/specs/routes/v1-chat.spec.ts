/**
 * Tspec API Specification - V1 Chat Completion Endpoint
 *
 * This file defines the OpenAPI spec for /v1/chat/completions using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Chat Message
 */
export interface ChatMessage {
  /** Message role (system, user, assistant, function) */
  role: 'system' | 'user' | 'assistant' | 'function';
  /** Message content */
  content: string;
  /** Name (for function messages) */
  name?: string;
  /** Function call details (for assistant messages) */
  function_call?: {
    /** Function name */
    name: string;
    /** Function arguments (JSON string) */
    arguments: string;
  };
}

/**
 * Chat Completion Request Body
 */
export interface ChatCompletionRequest {
  /** Model ID to use for completion */
  model: string;
  /** Array of messages in the conversation */
  messages: ChatMessage[];
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
}

/**
 * Completion Usage Statistics
 */
export interface CompletionUsage {
  /** Prompt tokens consumed */
  promptTokens: number;
  /** Completion tokens generated */
  completionTokens: number;
  /** Total tokens (prompt + completion) */
  totalTokens: number;
  /** Credits deducted for this request */
  creditsUsed: number;
  /** Cached tokens (for Anthropic/Google prompt caching) */
  cachedTokens?: number;
}

/**
 * Chat Completion Message (response)
 */
export interface ChatCompletionMessage {
  /** Message role */
  role: string;
  /** Message content */
  content: string;
}

/**
 * Chat Completion Choice
 */
export interface ChatCompletionChoice {
  /** Choice index */
  index: number;
  /** Generated message */
  message: ChatCompletionMessage;
  /** Reason completion finished (stop, length, function_call, content_filter, null) */
  finish_reason: string | null;
}

/**
 * Chat Completion Response
 */
export interface ChatCompletionResponse {
  /** Unique completion ID */
  id: string;
  /** Object type (chat.completion) */
  object: 'chat.completion';
  /** Unix timestamp of creation */
  created: number;
  /** Model used for completion */
  model: string;
  /** Array of completion choices */
  choices: ChatCompletionChoice[];
  /** Token usage statistics and credits deducted */
  usage: CompletionUsage;
}

/**
 * Tspec API specification for V1 chat completion endpoint
 */
export type V1ChatApiSpec = Tspec.DefineApiSpec<{
  tags: ['V1 - Inference'];
  paths: {
    '/v1/chat/completions': {
      post: {
        summary: 'Execute chat completion request';
        description: `Execute a chat completion request using the specified model.

**Authentication**: Requires JWT bearer token
**Scope Required**: llm.inference
**Credit Check**: Ensures user has sufficient credits before execution

**Request Requirements**:
- \`model\`: Valid model ID (must be accessible for user's tier)
- \`messages\`: At least one message required
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

**Rate Limit**: Tier-based limits apply (Free: 10/min, Pro: 60/min, Enterprise: 300/min)`;
        security: 'bearerAuth';
        body: ChatCompletionRequest;
        responses: {
          /** Successful completion response */
          200: ChatCompletionResponse;
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
