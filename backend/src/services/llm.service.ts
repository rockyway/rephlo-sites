/**
 * LLM Proxy Service
 *
 * Handles inference requests to multiple LLM providers (OpenAI, Anthropic, Google).
 * Routes requests to appropriate provider, handles streaming and non-streaming responses,
 * calculates token usage and credit costs.
 *
 * Supported Providers:
 * - OpenAI (GPT-5)
 * - Anthropic (Claude 3.5 Sonnet)
 * - Google (Gemini 2.0 Pro)
 *
 * Features:
 * - Text completion (legacy format)
 * - Chat completion (modern format)
 * - Streaming support (Server-Sent Events)
 * - Token usage calculation
 * - Credit cost calculation
 * - Provider-specific error handling
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Model APIs - endpoints 5-7)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { UsageService } from './usage.service';
import { CreditService } from './credit.service';
import {
  TextCompletionRequest,
  ChatCompletionRequest,
  TextCompletionResponse,
  ChatCompletionResponse,
  ChatCompletionChunk,
  TextCompletionChunk,
} from '../types/model-validation';

// =============================================================================
// Provider Client Initialization
// =============================================================================

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let googleClient: GoogleGenerativeAI | null = null;

/**
 * Initialize provider clients with API keys from environment
 */
function initializeClients(): void {
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    logger.info('LLM Service: OpenAI client initialized');
  }

  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    logger.info('LLM Service: Anthropic client initialized');
  }

  if (process.env.GOOGLE_API_KEY) {
    googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    logger.info('LLM Service: Google AI client initialized');
  }
}

// Initialize on module load
initializeClients();

// =============================================================================
// LLM Service Class
// =============================================================================

export class LLMService {
  private usageService: UsageService;
  private creditService: CreditService;

  constructor(prisma?: PrismaClient) {
    if (prisma) {
      this.usageService = new UsageService(prisma);
      this.creditService = new CreditService(prisma);
    } else {
      // For backward compatibility, create dummy services
      this.usageService = null as any;
      this.creditService = null as any;
    }
  }

  // ===========================================================================
  // Text Completion Operations
  // ===========================================================================

  /**
   * Execute text completion request
   * Routes to appropriate provider based on model ID
   *
   * @param request - Text completion request
   * @param modelProvider - Provider name (openai, anthropic, google)
   * @param creditsPer1kTokens - Credit cost per 1k tokens
   * @param userId - User ID for usage tracking
   * @returns Completion response
   */
  async textCompletion(
    request: TextCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string
  ): Promise<TextCompletionResponse> {
    logger.debug('LLMService: Text completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
    });

    const startTime = Date.now();

    try {
      let response: TextCompletionResponse;

      switch (modelProvider) {
        case 'openai':
          response = await this.openaiTextCompletion(request, creditsPer1kTokens);
          break;
        case 'anthropic':
          response = await this.anthropicTextCompletion(request, creditsPer1kTokens);
          break;
        case 'google':
          response = await this.googleTextCompletion(request, creditsPer1kTokens);
          break;
        default:
          throw new Error(`Unsupported provider: ${modelProvider}`);
      }

      const duration = Date.now() - startTime;
      logger.info('LLMService: Text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: response.usage.total_tokens,
        credits: response.usage.credits_used,
      });

      // Record usage in database
      if (this.usageService && this.creditService) {
        try {
          const credit = await this.creditService.getCurrentCredits(userId);
          if (credit) {
            await this.usageService.recordUsage({
              userId,
              creditId: credit.id,
              modelId: request.model,
              operation: 'completion',
              creditsUsed: response.usage.credits_used,
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
              requestDurationMs: duration,
              requestMetadata: {
                provider: modelProvider,
                temperature: request.temperature,
                max_tokens: request.max_tokens,
              },
            });
          }
        } catch (error) {
          logger.error('LLMService: Failed to record usage', {
            userId,
            model: request.model,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return response;
    } catch (error) {
      logger.error('LLMService: Text completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleProviderError(error, modelProvider);
    }
  }

  /**
   * Execute streaming text completion
   * Streams response chunks as Server-Sent Events
   *
   * @param request - Text completion request
   * @param modelProvider - Provider name
   * @param creditsPer1kTokens - Credit cost per 1k tokens
   * @param userId - User ID
   * @param res - Express response object for streaming
   */
  async streamTextCompletion(
    request: TextCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string,
    res: Response
  ): Promise<void> {
    logger.debug('LLMService: Streaming text completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const startTime = Date.now();
    let totalTokens = 0;

    try {
      switch (modelProvider) {
        case 'openai':
          totalTokens = await this.openaiStreamTextCompletion(request, res);
          break;
        case 'anthropic':
          totalTokens = await this.anthropicStreamTextCompletion(request, res);
          break;
        case 'google':
          totalTokens = await this.googleStreamTextCompletion(request, res);
          break;
        default:
          throw new Error(`Unsupported provider: ${modelProvider}`);
      }

      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

      logger.info('LLMService: Streaming text completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        credits: creditsUsed,
      });

      // Record usage in database
      if (this.usageService && this.creditService) {
        try {
          const credit = await this.creditService.getCurrentCredits(userId);
          if (credit) {
            await this.usageService.recordUsage({
              userId,
              creditId: credit.id,
              modelId: request.model,
              operation: 'completion',
              creditsUsed,
              inputTokens: Math.ceil(totalTokens * 0.3),
              outputTokens: Math.ceil(totalTokens * 0.7),
              totalTokens,
              requestDurationMs: duration,
              requestMetadata: {
                provider: modelProvider,
                temperature: request.temperature,
                max_tokens: request.max_tokens,
                streaming: true,
              },
            });
          }
        } catch (error) {
          logger.error('LLMService: Failed to record usage', {
            userId,
            model: request.model,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      logger.error('LLMService: Streaming text completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send error event
      const errorMessage = this.getErrorMessage(error, modelProvider);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  // ===========================================================================
  // Chat Completion Operations
  // ===========================================================================

  /**
   * Execute chat completion request
   *
   * @param request - Chat completion request
   * @param modelProvider - Provider name
   * @param creditsPer1kTokens - Credit cost per 1k tokens
   * @param userId - User ID
   * @returns Chat completion response
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string
  ): Promise<ChatCompletionResponse> {
    logger.debug('LLMService: Chat completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
      messagesCount: request.messages.length,
    });

    const startTime = Date.now();

    try {
      let response: ChatCompletionResponse;

      switch (modelProvider) {
        case 'openai':
          response = await this.openaiChatCompletion(request, creditsPer1kTokens);
          break;
        case 'anthropic':
          response = await this.anthropicChatCompletion(request, creditsPer1kTokens);
          break;
        case 'google':
          response = await this.googleChatCompletion(request, creditsPer1kTokens);
          break;
        default:
          throw new Error(`Unsupported provider: ${modelProvider}`);
      }

      const duration = Date.now() - startTime;
      logger.info('LLMService: Chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: response.usage.total_tokens,
        credits: response.usage.credits_used,
      });

      // Record usage in database
      if (this.usageService && this.creditService) {
        try {
          const credit = await this.creditService.getCurrentCredits(userId);
          if (credit) {
            await this.usageService.recordUsage({
              userId,
              creditId: credit.id,
              modelId: request.model,
              operation: 'chat',
              creditsUsed: response.usage.credits_used,
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
              requestDurationMs: duration,
              requestMetadata: {
                provider: modelProvider,
                temperature: request.temperature,
                max_tokens: request.max_tokens,
                messages_count: request.messages.length,
              },
            });
          }
        } catch (error) {
          logger.error('LLMService: Failed to record usage', {
            userId,
            model: request.model,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return response;
    } catch (error) {
      logger.error('LLMService: Chat completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw this.handleProviderError(error, modelProvider);
    }
  }

  /**
   * Execute streaming chat completion
   *
   * @param request - Chat completion request
   * @param modelProvider - Provider name
   * @param creditsPer1kTokens - Credit cost per 1k tokens
   * @param userId - User ID
   * @param res - Express response object for streaming
   */
  async streamChatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    creditsPer1kTokens: number,
    userId: string,
    res: Response
  ): Promise<void> {
    logger.debug('LLMService: Streaming chat completion request', {
      model: request.model,
      provider: modelProvider,
      userId,
      messagesCount: request.messages.length,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const startTime = Date.now();
    let totalTokens = 0;

    try {
      switch (modelProvider) {
        case 'openai':
          totalTokens = await this.openaiStreamChatCompletion(request, res);
          break;
        case 'anthropic':
          totalTokens = await this.anthropicStreamChatCompletion(request, res);
          break;
        case 'google':
          totalTokens = await this.googleStreamChatCompletion(request, res);
          break;
        default:
          throw new Error(`Unsupported provider: ${modelProvider}`);
      }

      const duration = Date.now() - startTime;
      const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

      logger.info('LLMService: Streaming chat completion successful', {
        model: request.model,
        provider: modelProvider,
        userId,
        duration,
        tokens: totalTokens,
        credits: creditsUsed,
      });

      // Record usage in database
      if (this.usageService && this.creditService) {
        try {
          const credit = await this.creditService.getCurrentCredits(userId);
          if (credit) {
            await this.usageService.recordUsage({
              userId,
              creditId: credit.id,
              modelId: request.model,
              operation: 'chat',
              creditsUsed,
              inputTokens: Math.ceil(totalTokens * 0.3),
              outputTokens: Math.ceil(totalTokens * 0.7),
              totalTokens,
              requestDurationMs: duration,
              requestMetadata: {
                provider: modelProvider,
                temperature: request.temperature,
                max_tokens: request.max_tokens,
                messages_count: request.messages.length,
                streaming: true,
              },
            });
          }
        } catch (error) {
          logger.error('LLMService: Failed to record usage', {
            userId,
            model: request.model,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      logger.error('LLMService: Streaming chat completion failed', {
        model: request.model,
        provider: modelProvider,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send error event
      const errorMessage = this.getErrorMessage(error, modelProvider);
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  // ===========================================================================
  // OpenAI Provider Implementation
  // ===========================================================================

  private async openaiTextCompletion(
    request: TextCompletionRequest,
    creditsPer1kTokens: number
  ): Promise<TextCompletionResponse> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const completion = await openaiClient.completions.create({
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

    const totalTokens = completion.usage?.total_tokens || 0;
    const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

    return {
      id: completion.id,
      object: 'text_completion',
      created: completion.created,
      model: completion.model,
      choices: completion.choices.map((choice) => ({
        text: choice.text,
        index: choice.index,
        finish_reason: choice.finish_reason,
      })),
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: totalTokens,
        credits_used: creditsUsed,
      },
    };
  }

  private async openaiStreamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await openaiClient.completions.create({
      model: request.model,
      prompt: request.prompt,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      stream: true,
    });

    let totalTokens = 0;
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

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    totalTokens = Math.ceil((request.prompt.length + completionText.length) / 4);

    return totalTokens;
  }

  private async openaiChatCompletion(
    request: ChatCompletionRequest,
    creditsPer1kTokens: number
  ): Promise<ChatCompletionResponse> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await openaiClient.chat.completions.create({
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

    const totalTokens = completion.usage?.total_tokens || 0;
    const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

    return {
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
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: totalTokens,
        credits_used: creditsUsed,
      },
    };
  }

  private async openaiStreamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await openaiClient.chat.completions.create({
      model: request.model,
      messages: request.messages as any,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      stop: request.stop,
      stream: true,
    });

    let totalTokens = 0;
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

    // Estimate tokens
    const promptText = request.messages.map((m) => m.content).join(' ');
    totalTokens = Math.ceil((promptText.length + completionText.length) / 4);

    return totalTokens;
  }

  // ===========================================================================
  // Anthropic Provider Implementation
  // ===========================================================================

  private async anthropicTextCompletion(
    request: TextCompletionRequest,
    creditsPer1kTokens: number
  ): Promise<TextCompletionResponse> {
    if (!anthropicClient) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY environment variable.');
    }

    // Anthropic uses Messages API, convert text completion to chat format
    const message = await anthropicClient.messages.create({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
    });

    const completionText = message.content[0].type === 'text' ? message.content[0].text : '';
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;
    const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

    return {
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
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
        credits_used: creditsUsed,
      },
    };
  }

  private async anthropicStreamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const stream = await anthropicClient.messages.stream({
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

  private async anthropicChatCompletion(
    request: ChatCompletionRequest,
    creditsPer1kTokens: number
  ): Promise<ChatCompletionResponse> {
    if (!anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Convert messages to Anthropic format
    const anthropicMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = request.messages.find((m) => m.role === 'system');

    const message = await anthropicClient.messages.create({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: anthropicMessages,
      system: systemMessage?.content,
      temperature: request.temperature,
      top_p: request.top_p,
      stop_sequences: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
    });

    const completionText = message.content[0].type === 'text' ? message.content[0].text : '';
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;
    const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

    return {
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
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
        credits_used: creditsUsed,
      },
    };
  }

  private async anthropicStreamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const anthropicMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = request.messages.find((m) => m.role === 'system');

    const stream = await anthropicClient.messages.stream({
      model: request.model,
      max_tokens: request.max_tokens || 1000,
      messages: anthropicMessages,
      system: systemMessage?.content,
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

  // ===========================================================================
  // Google Provider Implementation
  // ===========================================================================

  private async googleTextCompletion(
    request: TextCompletionRequest,
    creditsPer1kTokens: number
  ): Promise<TextCompletionResponse> {
    if (!googleClient) {
      throw new Error('Google AI client not initialized. Set GOOGLE_API_KEY environment variable.');
    }

    const model = googleClient.getGenerativeModel({ model: request.model });
    const result = await model.generateContent(request.prompt);
    const response = result.response;
    const text = response.text();

    // Estimate tokens (Google doesn't provide token counts in response)
    const promptTokens = Math.ceil(request.prompt.length / 4);
    const completionTokens = Math.ceil(text.length / 4);
    const totalTokens = promptTokens + completionTokens;
    const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

    return {
      id: `google-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          text,
          index: 0,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        credits_used: creditsUsed,
      },
    };
  }

  private async googleStreamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!googleClient) {
      throw new Error('Google AI client not initialized');
    }

    const model = googleClient.getGenerativeModel({ model: request.model });
    const result = await model.generateContentStream(request.prompt);

    let completionText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      completionText += chunkText;

      const chunkData: TextCompletionChunk = {
        id: `google-${Date.now()}`,
        object: 'text_completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            text: chunkText,
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunkData)}\n\n`);
    }

    // Estimate tokens
    const totalTokens = Math.ceil((request.prompt.length + completionText.length) / 4);
    return totalTokens;
  }

  private async googleChatCompletion(
    request: ChatCompletionRequest,
    creditsPer1kTokens: number
  ): Promise<ChatCompletionResponse> {
    if (!googleClient) {
      throw new Error('Google AI client not initialized');
    }

    const model = googleClient.getGenerativeModel({ model: request.model });

    // Convert messages to Google format
    const history = request.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const text = response.text();

    // Estimate tokens
    const promptText = request.messages.map((m) => m.content).join(' ');
    const promptTokens = Math.ceil(promptText.length / 4);
    const completionTokens = Math.ceil(text.length / 4);
    const totalTokens = promptTokens + completionTokens;
    const creditsUsed = Math.ceil((totalTokens / 1000) * creditsPer1kTokens);

    return {
      id: `google-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        credits_used: creditsUsed,
      },
    };
  }

  private async googleStreamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!googleClient) {
      throw new Error('Google AI client not initialized');
    }

    const model = googleClient.getGenerativeModel({ model: request.model });

    const history = request.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.content);

    let completionText = '';
    let isFirstChunk = true;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      completionText += chunkText;

      const chunkData: ChatCompletionChunk = {
        id: `google-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {
              role: isFirstChunk ? 'assistant' : undefined,
              content: chunkText,
            },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunkData)}\n\n`);
      isFirstChunk = false;
    }

    // Estimate tokens
    const promptText = request.messages.map((m) => m.content).join(' ');
    const totalTokens = Math.ceil((promptText.length + completionText.length) / 4);
    return totalTokens;
  }

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  /**
   * Handle provider-specific errors and convert to standard format
   */
  private handleProviderError(error: any, provider: string): Error {
    let message = 'LLM inference request failed';

    if (error instanceof Error) {
      message = error.message;
    }

    // Provider-specific error handling
    if (provider === 'openai' && error.status) {
      message = `OpenAI API error (${error.status}): ${message}`;
    } else if (provider === 'anthropic' && error.status) {
      message = `Anthropic API error (${error.status}): ${message}`;
    } else if (provider === 'google') {
      message = `Google AI API error: ${message}`;
    }

    return new Error(message);
  }

  /**
   * Get user-friendly error message from provider error
   */
  private getErrorMessage(error: any, provider: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    return `${provider} API error`;
  }
}

// =============================================================================
// Export Factory Function
// =============================================================================

/**
 * Create LLM service instance
 * @param prisma - Optional Prisma client for usage recording
 */
export function createLLMService(prisma?: PrismaClient): LLMService {
  return new LLMService(prisma);
}
