/**
 * Azure OpenAI Provider Implementation
 *
 * Handles all Azure OpenAI-specific API interactions.
 * Uses OpenAI SDK with Azure-specific configuration (endpoint, deployment, api-version).
 *
 * Required Environment Variables:
 * - AZURE_OPENAI_ENDPOINT: Azure OpenAI endpoint URL (e.g., https://your-resource.openai.azure.com)
 * - AZURE_OPENAI_API_KEY: Azure OpenAI API key
 * - AZURE_OPENAI_DEPLOYMENT_NAME: Deployment name (e.g., gpt-4)
 * - AZURE_OPENAI_API_VERSION: API version (e.g., 2024-02-15-preview)
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
export class AzureOpenAIProvider implements ILLMProvider {
  public readonly providerName = 'azure-openai';

  constructor(@inject('AzureOpenAIClient') private client: OpenAI) {
    logger.debug('AzureOpenAIProvider: Initialized');
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables.');
    }

    logger.debug('AzureOpenAIProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    // Note: Azure OpenAI uses deployment name, not model name in API calls
    // But we keep request.model for logging/tracking purposes
    const completion = await this.client.chat.completions.create({
      model: request.model, // This will be overridden by deployment name in baseURL
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
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    logger.debug('AzureOpenAIProvider: Streaming chat completion request', {
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
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    logger.debug('AzureOpenAIProvider: Text completion request', {
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
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    };
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
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
