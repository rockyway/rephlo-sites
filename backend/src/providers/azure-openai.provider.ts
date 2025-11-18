/**
 * Azure OpenAI Provider Implementation
 *
 * @deprecated This provider is being phased out in favor of the standard OpenAIProvider.
 * The standard OpenAIProvider (openai.provider.ts) can handle both OpenAI and Azure OpenAI
 * endpoints by configuring the baseURL. This separate Azure provider will be removed in a
 * future release.
 *
 * Migration Guide:
 * - Use OpenAIProvider with OPENAI_BASE_URL pointing to Azure deployment URL
 * - Both providers now support GPT-5 models and stream_options for accurate token counting
 *
 * Handles all Azure OpenAI-specific API interactions.
 * Uses OpenAI SDK with Azure-specific configuration (endpoint, deployment, api-version).
 *
 * Required Environment Variables:
 * - AZURE_OPENAI_ENDPOINT: Azure OpenAI endpoint URL (e.g., https://your-resource.openai.azure.com)
 * - AZURE_OPENAI_API_KEY: Azure OpenAI API key
 * - AZURE_OPENAI_DEPLOYMENT_NAME: Deployment name (e.g., gpt-4)
 * - AZURE_OPENAI_API_VERSION: API version (e.g., 2024-12-01-preview)
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
import { countChatTokens, countTokens } from '../utils/tokenCounter';

@injectable()
export class AzureOpenAIProvider implements ILLMProvider {
  public readonly providerName = 'azure-openai';

  constructor(@inject('AzureOpenAIClient') private client: OpenAI) {
    logger.debug('AzureOpenAIProvider: Initialized');
  }

  /**
   * Checks if the model is a GPT-5 variant
   */
  private isGPT5Model(model: string): boolean {
    return model.includes('gpt-5');
  }

  /**
   * Checks if the model is GPT-5-mini (which has restricted temperature support)
   */
  private isGPT5Mini(model: string): boolean {
    return model.includes('gpt-5-mini');
  }

  /**
   * Builds API parameters with GPT-5 compatibility
   * GPT-5 models use max_completion_tokens instead of max_tokens
   * GPT-5-mini only supports default temperature (1.0)
   */
  private buildChatParams(request: ChatCompletionRequest, streaming: boolean = false): any {
    const isGPT5 = this.isGPT5Model(request.model);
    const isGPT5Mini = this.isGPT5Mini(request.model);

    const params: any = {
      model: request.model,
      messages: request.messages,
      stop: request.stop,
      presence_penalty: request.presence_penalty,
      frequency_penalty: request.frequency_penalty,
      n: request.n,
    };

    // GPT-5 models use max_completion_tokens instead of max_tokens
    if (isGPT5) {
      params.max_completion_tokens = request.max_tokens;
    } else {
      params.max_tokens = request.max_tokens;
    }

    // GPT-5-mini only supports default temperature (1.0)
    // Other GPT-5 variants and GPT-4 support custom temperature
    if (!isGPT5Mini) {
      params.temperature = request.temperature;
      params.top_p = request.top_p;
    }

    // Add function calling params for non-streaming requests
    if (!streaming) {
      params.functions = request.functions;
      params.function_call = request.function_call;
    }

    if (streaming) {
      params.stream = true;
    }

    return params;
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
      throw new Error('Azure OpenAI client not initialized. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables.');
    }

    logger.debug('AzureOpenAIProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
      isGPT5: this.isGPT5Model(request.model),
      isGPT5Mini: this.isGPT5Mini(request.model),
    });

    // Build API parameters with GPT-5 compatibility
    const params = this.buildChatParams(request, false);
    const completion = await this.client.chat.completions.create(params);

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
      throw new Error('Azure OpenAI client not initialized');
    }

    logger.debug('AzureOpenAIProvider: Streaming chat completion request', {
      model: request.model,
      isGPT5: this.isGPT5Model(request.model),
      isGPT5Mini: this.isGPT5Mini(request.model),
    });

    // Build API parameters with GPT-5 compatibility
    const params = this.buildChatParams(request, true);

    // Add stream_options to get accurate token usage in streaming mode
    // Azure OpenAI API v2024-12-01-preview supports this feature
    params.stream_options = { include_usage: true };

    const stream = await this.client.chat.completions.create(params) as any;

    let completionText = '';
    let chunkCount = 0;
    let usageData: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;

    for await (const chunk of stream) {
      chunkCount++;

      // Check if this chunk contains usage information (from stream_options)
      if (chunk.usage) {
        usageData = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
        logger.debug('AzureOpenAIProvider: Received usage data in streaming chunk', usageData);
      }

      const chunkData: ChatCompletionChunk = {
        id: chunk.id,
        object: 'chat.completion.chunk',
        created: chunk.created,
        model: chunk.model,
        choices: chunk.choices.map((choice: any) => ({
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

    // Use accurate token counts from Azure (stream_options), fallback to tiktoken if not available
    let totalTokens: number;

    if (usageData) {
      // Use accurate counts from Azure OpenAI streaming
      totalTokens = usageData.totalTokens;
      logger.debug('AzureOpenAIProvider: Streaming completed (using Azure usage data)', {
        model: request.model,
        chunkCount,
        completionLength: completionText.length,
        ...usageData,
      });
    } else {
      // Fallback to tiktoken estimation (should not happen with API v2024-12-01-preview)
      const { promptTokens } = countChatTokens(request.messages, request.model);
      const completionTokens = countTokens(completionText, request.model);
      totalTokens = promptTokens + completionTokens;

      logger.warn('AzureOpenAIProvider: No usage data in streaming response, using tiktoken estimation', {
        model: request.model,
        chunkCount,
        completionLength: completionText.length,
        promptTokens,
        completionTokens,
        totalTokens,
      });
    }

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
