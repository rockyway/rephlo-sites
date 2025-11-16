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
import { countChatTokens, countTokens } from '../utils/tokenCounter';

@injectable()
export class OpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';
  private isAzure: boolean = false;
  private azureEndpoint?: string;
  private azureApiVersion?: string;
  private azureApiKey?: string;

  constructor(@inject('OpenAIClient') private client: OpenAI) {
    logger.debug('OpenAIProvider: Initialized - ' + this.client.baseURL);

    // Detect if we're using Azure OpenAI
    this.isAzure = this.client.baseURL?.includes('azure.com') || false;

    if (this.isAzure) {
      // Store Azure configuration for dynamic deployment URL construction
      this.azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      this.azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;
      this.azureApiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;

      logger.debug('OpenAIProvider: Azure OpenAI mode detected', {
        endpoint: this.azureEndpoint,
        apiVersion: this.azureApiVersion,
      });
    }
  }

  /**
   * Creates a client with Azure deployment-specific URL
   * For Azure: constructs URL as {endpoint}/openai/deployments/{model}
   * For standard OpenAI: returns the default client
   */
  private getClientForModel(model: string): OpenAI {
    if (!this.isAzure) {
      return this.client;
    }

    // For Azure, construct deployment-specific base URL
    const deploymentUrl = `${this.azureEndpoint}/openai/deployments/${model}`;

    logger.debug('OpenAIProvider: Creating Azure client for model', {
      model,
      deploymentUrl,
    });

    return new OpenAI({
      apiKey: this.azureApiKey!,
      baseURL: deploymentUrl,
      defaultQuery: { 'api-version': this.azureApiVersion },
      defaultHeaders: { 'api-key': this.azureApiKey! },
    });
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
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    logger.debug('OpenAIProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
      isGPT5: this.isGPT5Model(request.model),
      isGPT5Mini: this.isGPT5Mini(request.model),
      isAzure: this.isAzure,
    });

    // Get client with correct base URL for the model (Azure: dynamic deployment URL)
    const clientForModel = this.getClientForModel(request.model);

    // Build API parameters with GPT-5 compatibility
    const params = this.buildChatParams(request, false);
    const completion = await clientForModel.chat.completions.create(params);

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

    // Get client with correct base URL for the model (Azure: dynamic deployment URL)
    const clientForModel = this.getClientForModel(request.model);

    logger.debug('OpenAIProvider: Streaming chat completion request', {
      model: request.model,
      baseURL: clientForModel.baseURL,
      isGPT5: this.isGPT5Model(request.model),
      isGPT5Mini: this.isGPT5Mini(request.model),
      isAzure: this.isAzure,
    });

    try {
      // Build API parameters with GPT-5 compatibility
      const params = this.buildChatParams(request, true);

      // Add stream_options to get accurate token usage in streaming mode
      // Supported by OpenAI API and Azure OpenAI API v2024-12-01-preview
      params.stream_options = { include_usage: true };

      const stream = await clientForModel.chat.completions.create(params) as any;

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
          logger.debug('OpenAIProvider: Received usage data in streaming chunk', usageData);
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

      // Use accurate token counts from OpenAI/Azure (stream_options), fallback to tiktoken if not available
      let totalTokens: number;

      if (usageData) {
        // Use accurate counts from OpenAI/Azure OpenAI streaming
        totalTokens = usageData.totalTokens;
        logger.debug('OpenAIProvider: Streaming completed (using API usage data)', {
          model: request.model,
          baseURL: clientForModel.baseURL,
          chunkCount,
          completionLength: completionText.length,
          ...usageData,
        });
      } else {
        // Fallback to tiktoken estimation (should rarely happen with modern API versions)
        const { promptTokens } = countChatTokens(request.messages, request.model);
        const completionTokens = countTokens(completionText, request.model);
        totalTokens = promptTokens + completionTokens;

        logger.warn('OpenAIProvider: No usage data in streaming response, using tiktoken estimation', {
          model: request.model,
          baseURL: clientForModel.baseURL,
          chunkCount,
          completionLength: completionText.length,
          promptTokens,
          completionTokens,
          totalTokens,
        });
      }

      return totalTokens;
    } catch (error) {
      logger.error('OpenAIProvider: Streaming chat completion error', {
        model: request.model,
        baseURL: clientForModel.baseURL,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
