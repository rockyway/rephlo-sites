import { Response } from 'express';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
  ChatCompletionResponse,
  TextCompletionResponse,
} from '../../types/model-validation';

export const ILLMProvider = Symbol('ILLMProvider');

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
   * Returns response and usage data (without credit calculation)
   */
  chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cachedTokens?: number; // Optional: For Anthropic/Google prompt caching
    };
  }>;

  /**
   * Execute streaming chat completion
   * Returns total tokens used
   */
  streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number>;

  /**
   * Execute text completion
   * Returns response and usage data (without credit calculation)
   */
  textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cachedTokens?: number; // Optional: For Anthropic/Google prompt caching
    };
  }>;

  /**
   * Execute streaming text completion
   * Returns total tokens used
   */
  streamTextCompletion(request: TextCompletionRequest, res: Response): Promise<number>;
}
