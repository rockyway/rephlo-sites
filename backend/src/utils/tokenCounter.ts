/**
 * Token Counting Utility using tiktoken
 *
 * Provides accurate token counting for OpenAI models, including GPT-5 variants.
 * Uses tiktoken library with o200k_base encoding for GPT-5/GPT-4o models.
 */

import { encoding_for_model, Tiktoken } from 'tiktoken';
import logger from './logger';

/**
 * Model encoding map for tiktoken
 * GPT-5 and GPT-4o use o200k_base encoding
 */
const MODEL_ENCODING_MAP: Record<string, string> = {
  // GPT-5 variants
  'gpt-5': 'o200k_base',
  'gpt-5-chat': 'o200k_base',
  'gpt-5-mini': 'o200k_base',
  'gpt-5-nano': 'o200k_base',
  'gpt-5-2025-08-07': 'o200k_base',
  'gpt-5-mini-2025-08-07': 'o200k_base',
  'gpt-5-chat-latest': 'o200k_base',

  // GPT-4o variants
  'gpt-4o': 'o200k_base',
  'gpt-4o-mini': 'o200k_base',

  // GPT-4 variants
  'gpt-4': 'cl100k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
};

/**
 * Detects the appropriate encoding for a model
 */
function getModelEncoding(model: string): string {
  // Try exact match first
  if (MODEL_ENCODING_MAP[model]) {
    return MODEL_ENCODING_MAP[model];
  }

  // Check for model name prefixes
  if (model.startsWith('gpt-5')) {
    return 'o200k_base';
  }

  if (model.startsWith('gpt-4o')) {
    return 'o200k_base';
  }

  if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) {
    return 'cl100k_base';
  }

  // Default to o200k_base for unknown models (safest for newer models)
  logger.warn(`TokenCounter: Unknown model "${model}", defaulting to o200k_base encoding`);
  return 'o200k_base';
}

/**
 * Counts tokens in a text string using tiktoken
 *
 * @param text - The text to count tokens for
 * @param model - The model name (e.g., 'gpt-5-mini', 'gpt-4o')
 * @returns Number of tokens
 */
export function countTokens(text: string, model: string = 'gpt-5'): number {
  let encoder: Tiktoken | null = null;

  try {
    // Try to get encoding for the specific model
    try {
      encoder = encoding_for_model(model as any);
    } catch (error) {
      // If model not recognized, use encoding based on model name
      const encodingName = getModelEncoding(model);
      logger.debug(`TokenCounter: Using ${encodingName} encoding for model ${model}`);
      encoder = encoding_for_model('gpt-4o' as any); // Use gpt-4o as proxy for o200k_base
    }

    const tokens = encoder.encode(text);
    const tokenCount = tokens.length;

    return tokenCount;
  } catch (error) {
    logger.error('TokenCounter: Error counting tokens', {
      model,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fallback to character-based estimation (less accurate)
    const fallbackCount = Math.ceil(text.length / 4);
    logger.warn(`TokenCounter: Using fallback estimation (${fallbackCount} tokens)`);
    return fallbackCount;
  } finally {
    // Clean up encoder to free memory
    if (encoder) {
      encoder.free();
    }
  }
}

/**
 * Counts tokens for chat messages (includes role and formatting overhead)
 * Supports both text-only (string) and multimodal (ContentPart[]) content
 *
 * @param messages - Array of chat messages
 * @param model - The model name
 * @returns Object with prompt tokens, completion tokens estimate, and total
 */
export function countChatTokens(
  messages: Array<{ role: string; content: string | any[] }>,
  model: string = 'gpt-5'
): { promptTokens: number; perMessage: number; perName: number } {
  let encoder: Tiktoken | null = null;

  try {
    // Get encoder for the model
    try {
      encoder = encoding_for_model(model as any);
    } catch (error) {
      encoder = encoding_for_model('gpt-4o' as any); // Default to gpt-4o encoding
    }

    let totalTokens = 0;

    // Token overhead per message varies by model
    const tokensPerMessage = 3; // GPT-4o and GPT-5 use 3 tokens per message
    const tokensPerName = 1; // If name field is present

    for (const message of messages) {
      totalTokens += tokensPerMessage;

      // Count tokens in role
      totalTokens += encoder.encode(message.role).length;

      // Count tokens in content
      if (typeof message.content === 'string') {
        totalTokens += encoder.encode(message.content || '').length;
      } else if (Array.isArray(message.content)) {
        // For content arrays, only count text parts (images handled separately)
        for (const part of message.content) {
          if (part.type === 'text' && part.text) {
            totalTokens += encoder.encode(part.text).length;
          }
          // Note: image_url parts are NOT counted here
          // Vision tokens should be calculated separately using VisionTokenCalculatorService
        }
      }

      // Add overhead for name field if present
      if ((message as any).name) {
        totalTokens += tokensPerName;
        totalTokens += encoder.encode((message as any).name).length;
      }
    }

    // Add 3 tokens for reply priming (assistant: )
    totalTokens += 3;

    return {
      promptTokens: totalTokens,
      perMessage: tokensPerMessage,
      perName: tokensPerName,
    };
  } catch (error) {
    logger.error('TokenCounter: Error counting chat tokens', {
      model,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fallback estimation
    const textContent = messages.map((m) => m.role + ': ' + m.content).join('\n');
    const fallbackCount = Math.ceil(textContent.length / 4);

    return {
      promptTokens: fallbackCount,
      perMessage: 3,
      perName: 1,
    };
  } finally {
    if (encoder) {
      encoder.free();
    }
  }
}

/**
 * Estimates total tokens for a chat completion (prompt + expected completion)
 *
 * @param messages - Array of chat messages
 * @param expectedCompletionLength - Expected length of completion in characters
 * @param model - The model name
 * @returns Estimated total tokens
 */
export function estimateTotalTokens(
  messages: Array<{ role: string; content: string }>,
  expectedCompletionLength: number = 500,
  model: string = 'gpt-5'
): number {
  const { promptTokens } = countChatTokens(messages, model);
  const completionTokens = Math.ceil(expectedCompletionLength / 4); // Rough estimate

  return promptTokens + completionTokens;
}
