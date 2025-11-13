/**
 * OpenAI Provider Implementation
 *
 * Handles all OpenAI-specific API interactions.
 * Converts OpenAI SDK responses to common LLM response format.
 */

import { injectable, inject } from 'tsyringe';
import OpenAI from 'openai';
import { Response } from 'express';
import { ILLMProvider } from '../interfaces';
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
export class OpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';

  constructor(@inject('OpenAIClient') private client: OpenAI) {
    logger.debug('OpenAIProvider: Initialized');
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    logger.debug('OpenAIProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    const completion = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as any,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      presence_penalty: request.presence_penalty,
      frequency_penalty: request.frequency_penalty,
      n: request.n,
      functions: request.functions as any,
      function_call: request.function_call as any,
    });

    return {
      response: {
        id: completion.id,
        object: 'chat.completion',
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map((choice) => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content || '',
          },
          finish_reason: choice.finish_reason,
        })),
      },
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    logger.debug('OpenAIProvider: Streaming chat completion request', {
      model: request.model,
    });

    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as any,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      stream: true,
    });

    let completionText = '';

    for await (const chunk of stream) {
      const chunkData: ChatCompletionChunk = {
        id: chunk.id,
        object: 'chat.completion.chunk',
        created: chunk.created,
        model: chunk.model,
        choices: chunk.choices.map((choice) => ({
          index: choice.index,
          delta: {
            role: choice.delta.role,
            content: choice.delta.content || undefined,
          },
          finish_reason: choice.finish_reason,
        })),
      };

      res.write(`data: ${JSON.stringify(chunkData)}\n\n`);

      if (chunk.choices[0]?.delta?.content) {
        completionText += chunk.choices[0].delta.content;
      }
    }

    // Estimate total tokens
    const promptText = request.messages.map((m) => m.content).join(' ');
    const totalTokens = Math.ceil((promptText.length + completionText.length) / 4);

    return totalTokens;
  }

  // ============================================================================
  // Text Completion
  // ============================================================================

  async textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    logger.debug('OpenAIProvider: Text completion request', {
      model: request.model,
      promptLength: request.prompt.length,
    });

    const completion = await this.client.completions.create({
      model: request.model,
      prompt: request.prompt,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      presence_penalty: request.presence_penalty,
      frequency_penalty: request.frequency_penalty,
      n: request.n,
    });

    return {
      response: {
        id: completion.id,
        object: 'text_completion',
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map((choice) => ({
          text: choice.text,
          index: choice.index,
          finish_reason: choice.finish_reason,
        })),
      },
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await this.client.completions.create({
      model: request.model,
      prompt: request.prompt,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      stream: true,
    });

    let completionText = '';

    for await (const chunk of stream) {
      const chunkData: TextCompletionChunk = {
        id: chunk.id,
        object: 'text_completion.chunk',
        created: chunk.created,
        model: chunk.model,
        choices: chunk.choices.map((choice) => ({
          index: choice.index,
          text: choice.text,
          finish_reason: choice.finish_reason,
        })),
      };

      res.write(`data: ${JSON.stringify(chunkData)}\n\n`);

      if (chunk.choices[0]?.text) {
        completionText += chunk.choices[0].text;
      }
    }

    const totalTokens = Math.ceil((request.prompt.length + completionText.length) / 4);
    return totalTokens;
  }
}
