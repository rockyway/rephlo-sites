import { Response } from 'express';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
  ChatCompletionResponse,
  TextCompletionResponse,
} from '../../types/model-validation';

export const ILLMProvider = Symbol('ILLMProvider');

/**
 * Enhanced usage data with prompt caching metrics
 * Supports provider-specific cache implementations:
 * - Anthropic: cache_creation_input_tokens, cache_read_input_tokens
 * - OpenAI: cached_prompt_tokens
 * - Google: cached_content_token_count
 */
export interface LLMUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  // DEPRECATED: Generic cached tokens (for backward compatibility)
  cachedTokens?: number;

  // Anthropic Prompt Caching Metrics
  cacheCreationInputTokens?: number; // Tokens written to cache (billed at 1.25x)
  cacheReadInputTokens?: number;     // Tokens read from cache (billed at 0.1x)

  // OpenAI Prompt Caching Metrics
  cachedPromptTokens?: number;       // Tokens served from cache (billed at 0.5x)

  // Google Prompt Caching Metrics (alias for consistency)
  cachedContentTokenCount?: number;  // Google's cache metric name
}

/**
 * Common interface for all LLM providers
 * Implements the Strategy Pattern for provider-agnostic inference
 */
export interface ILLMProvider {
  /**
   * Unique provider identifier (e.g., "openai", "anthropic", "google")
   */
  readonly providerName: string;

  /**
   * Execute chat completion
   * Returns response and enhanced usage data with cache metrics
   */
  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }>;

  /**
   * Execute streaming chat completion
   * Returns enhanced usage data with accurate token breakdown
   */
  streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<LLMUsageData>;

  /**
   * Execute text completion
   * Returns response and enhanced usage data with cache metrics
   */
  textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }>;

  /**
   * Execute streaming text completion
   * Returns enhanced usage data with accurate token breakdown
   */
  streamTextCompletion(request: TextCompletionRequest, res: Response): Promise<LLMUsageData>;
}
