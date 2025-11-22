/**
 * Anthropic Provider Implementation
 *
 * Handles all Anthropic-specific API interactions.
 * Converts Anthropic Messages API responses to common LLM response format.
 */

import { injectable, inject } from 'tsyringe';
import Anthropic from '@anthropic-ai/sdk';
import { Response } from 'express';
import { ILLMProvider, LLMUsageData } from '../interfaces';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
  ChatCompletionResponse,
  TextCompletionResponse,
  ChatCompletionChunk,
  TextCompletionChunk,
} from '../types/model-validation';
import logger from '../utils/logger';

@injectable()
export class AnthropicProvider implements ILLMProvider {
  public readonly providerName = 'anthropic';

  constructor(@inject('AnthropicClient') private client: Anthropic) {
    logger.debug('AnthropicProvider: Initialized');
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY environment variable.');
    }

    logger.debug('AnthropicProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    // Convert messages to Anthropic format (preserve cache_control if present)
    const anthropicMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as any, // Preserves cache_control in content parts
      }));

    const systemMessage = request.messages.find((m) => m.role === 'system');

    const message = await this.client.messages.create({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: anthropicMessages as any,
      system: (typeof systemMessage?.content === 'string' ? systemMessage?.content : undefined) as any,
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: Array.isArray(request.stop)
        ? request.stop
        : request.stop
        ? [request.stop]
        : undefined,
    });

    const completionText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract cache metrics from Anthropic response
    const usage: LLMUsageData = {
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    };

    // Add cache metrics if present (Anthropic Prompt Caching)
    if ('cache_creation_input_tokens' in message.usage && message.usage.cache_creation_input_tokens) {
      usage.cacheCreationInputTokens = message.usage.cache_creation_input_tokens;
      logger.debug('AnthropicProvider: Cache write tokens detected', {
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
      });
    }

    if ('cache_read_input_tokens' in message.usage && message.usage.cache_read_input_tokens) {
      usage.cacheReadInputTokens = message.usage.cache_read_input_tokens;
      logger.debug('AnthropicProvider: Cache read tokens detected', {
        cacheReadInputTokens: usage.cacheReadInputTokens,
      });
    }

    return {
      response: {
        id: message.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: message.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: completionText,
            },
            finish_reason: message.stop_reason,
          },
        ],
      },
      usage,
    };
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const anthropicMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as any, // TODO: Transform vision content for Anthropic (Plan 204 Phase 2)
      }));

    const systemMessage = request.messages.find((m) => m.role === 'system');

    const stream = await this.client.messages.stream({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: anthropicMessages as any, // TODO: Proper typing for vision content (Plan 204 Phase 2)
      system: (typeof systemMessage?.content === 'string' ? systemMessage?.content : undefined) as any,
      temperature: request.temperature,
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let isFirstChunk = true;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunkData: ChatCompletionChunk = {
          id: 'anthropic-stream',
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [
            {
              index: 0,
              delta: {
                role: isFirstChunk ? 'assistant' : undefined,
                content: event.delta.text,
              },
              finish_reason: null,
            },
          ],
        };
        res.write(`data: ${JSON.stringify(chunkData)}\n\n`);
        isFirstChunk = false;
      } else if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
    }

    return inputTokens + outputTokens;
  }

  // ============================================================================
  // Text Completion
  // ============================================================================

  async textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    // Anthropic uses Messages API, convert text completion to chat format
    const message = await this.client.messages.create({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: Array.isArray(request.stop)
        ? request.stop
        : request.stop
        ? [request.stop]
        : undefined,
    });

    const completionText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract cache metrics from Anthropic response
    const usage: LLMUsageData = {
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    };

    // Add cache metrics if present
    if ('cache_creation_input_tokens' in message.usage && message.usage.cache_creation_input_tokens) {
      usage.cacheCreationInputTokens = message.usage.cache_creation_input_tokens;
    }

    if ('cache_read_input_tokens' in message.usage && message.usage.cache_read_input_tokens) {
      usage.cacheReadInputTokens = message.usage.cache_read_input_tokens;
    }

    return {
      response: {
        id: message.id,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        model: message.model,
        choices: [
          {
            text: completionText,
            index: 0,
            finish_reason: message.stop_reason,
          },
        ],
      },
      usage,
    };
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const stream = await this.client.messages.stream({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunkData: TextCompletionChunk = {
          id: 'anthropic-stream',
          object: 'text_completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [
            {
              index: 0,
              text: event.delta.text,
              finish_reason: null,
            },
          ],
        };
        res.write(`data: ${JSON.stringify(chunkData)}\n\n`);
      } else if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
    }

    return inputTokens + outputTokens;
  }
}
