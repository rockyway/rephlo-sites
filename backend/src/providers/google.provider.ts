/**
 * Google AI Provider Implementation
 *
 * Handles all Google Generative AI API interactions.
 * Converts Google SDK responses to common LLM response format.
 */

import { injectable, inject } from 'tsyringe';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
export class GoogleProvider implements ILLMProvider {
  public readonly providerName = 'google';

  constructor(@inject('GoogleClient') private client: GoogleGenerativeAI) {
    logger.debug('GoogleProvider: Initialized');
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  async chatCompletion(request: ChatCompletionRequest): Promise<{
    response: Omit<ChatCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Google AI client not initialized. Set GOOGLE_API_KEY environment variable.');
    }

    logger.debug('GoogleProvider: Chat completion request', {
      model: request.model,
      messagesCount: request.messages.length,
    });

    const model = this.client.getGenerativeModel({ model: request.model });

    // Convert messages to Google format
    const history = request.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }] as any,
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({ history: history as any });
    const result = await chat.sendMessage(
      typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content)
    );
    const response = result.response;
    const text = response.text();

    // Extract usage metadata from Google response (if available)
    const usage: LLMUsageData = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    // Check if Google provides usage metadata (Gemini API may include this)
    if (response.usageMetadata) {
      usage.promptTokens = response.usageMetadata.promptTokenCount || 0;
      usage.completionTokens = response.usageMetadata.candidatesTokenCount || 0;
      usage.totalTokens = response.usageMetadata.totalTokenCount || 0;

      // Google caching metrics (if present)
      if (response.usageMetadata.cachedContentTokenCount) {
        usage.cachedContentTokenCount = response.usageMetadata.cachedContentTokenCount;
        logger.debug('GoogleProvider: Cached content tokens detected', {
          cachedContentTokenCount: usage.cachedContentTokenCount,
        });
      }
    } else {
      // Fallback: Estimate tokens (Google might not provide counts for all models)
      const promptText = request.messages.map((m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(' ');
      usage.promptTokens = Math.ceil(promptText.length / 4);
      usage.completionTokens = Math.ceil(text.length / 4);
      usage.totalTokens = usage.promptTokens + usage.completionTokens;
    }

    return {
      response: {
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
      },
      usage,
    };
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<LLMUsageData> {
    if (!this.client) {
      throw new Error('Google AI client not initialized');
    }

    const model = this.client.getGenerativeModel({ model: request.model });

    const history = request.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }] as any, // TODO: Transform vision content for Google (Plan 204 Phase 2)
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({ history: history as any }); // TODO: Proper typing for vision content (Plan 204 Phase 2)
    const result = await chat.sendMessageStream(
      typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content)
    );

    let completionText = '';
    let isFirstChunk = true;
    let usageMetadata: any = null;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      completionText += chunkText;

      // Capture usage metadata from the final chunk
      if (chunk.usageMetadata) {
        usageMetadata = chunk.usageMetadata;
      }

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

    // Use actual token counts from usageMetadata if available, otherwise estimate
    let promptTokens: number;
    let candidatesTokens: number;
    let totalTokens: number;

    if (usageMetadata) {
      // Use actual usage metadata from the final chunk
      promptTokens = usageMetadata.promptTokenCount || 0;
      candidatesTokens = usageMetadata.candidatesTokenCount || 0;
      totalTokens = usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);

      logger.debug('GoogleProvider: Actual token usage from API', {
        promptTokens,
        candidatesTokens,
        totalTokens,
        cachedTokens: usageMetadata.cachedContentTokenCount || 0,
      });
    } else {
      // Fallback estimation (should rarely happen)
      const promptText = request.messages.map((m) => m.content).join(' ');
      promptTokens = Math.ceil(promptText.length / 4);
      candidatesTokens = Math.ceil(completionText.length / 4);
      totalTokens = promptTokens + candidatesTokens;

      logger.warn('GoogleProvider: Using estimated token counts (no usageMetadata in stream)', {
        promptTokens,
        candidatesTokens,
        totalTokens,
      });
    }

    return {
      promptTokens,
      completionTokens: candidatesTokens,
      totalTokens,
      cachedTokens: usageMetadata?.cachedContentTokenCount,
    };
  }

  // ============================================================================
  // Text Completion
  // ============================================================================

  async textCompletion(request: TextCompletionRequest): Promise<{
    response: Omit<TextCompletionResponse, 'usage'>;
    usage: LLMUsageData;
  }> {
    if (!this.client) {
      throw new Error('Google AI client not initialized');
    }

    const model = this.client.getGenerativeModel({ model: request.model });
    const result = await model.generateContent(request.prompt);
    const response = result.response;
    const text = response.text();

    // Extract usage metadata from Google response (if available)
    const usage: LLMUsageData = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    if (response.usageMetadata) {
      usage.promptTokens = response.usageMetadata.promptTokenCount || 0;
      usage.completionTokens = response.usageMetadata.candidatesTokenCount || 0;
      usage.totalTokens = response.usageMetadata.totalTokenCount || 0;

      // Google caching metrics (if present)
      if (response.usageMetadata.cachedContentTokenCount) {
        usage.cachedContentTokenCount = response.usageMetadata.cachedContentTokenCount;
      }
    } else {
      // Fallback: Estimate tokens
      usage.promptTokens = Math.ceil(request.prompt.length / 4);
      usage.completionTokens = Math.ceil(text.length / 4);
      usage.totalTokens = usage.promptTokens + usage.completionTokens;
    }

    return {
      response: {
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
      },
      usage,
    };
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<LLMUsageData> {
    if (!this.client) {
      throw new Error('Google AI client not initialized');
    }

    const model = this.client.getGenerativeModel({ model: request.model });
    const result = await model.generateContentStream(request.prompt);

    let completionText = '';
    let usageMetadata: any = null;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      completionText += chunkText;

      // Capture usage metadata from the final chunk
      if (chunk.usageMetadata) {
        usageMetadata = chunk.usageMetadata;
      }

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

    // Use actual token counts from usageMetadata if available, otherwise estimate
    let promptTokens: number;
    let candidatesTokens: number;
    let totalTokens: number;

    if (usageMetadata) {
      // Use actual usage metadata from the final chunk
      promptTokens = usageMetadata.promptTokenCount || 0;
      candidatesTokens = usageMetadata.candidatesTokenCount || 0;
      totalTokens = usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);

      logger.debug('GoogleProvider: Actual token usage from API (text completion)', {
        promptTokens,
        candidatesTokens,
        totalTokens,
        cachedTokens: usageMetadata.cachedContentTokenCount || 0,
      });
    } else {
      // Fallback estimation (should rarely happen)
      promptTokens = Math.ceil(request.prompt.length / 4);
      candidatesTokens = Math.ceil(completionText.length / 4);
      totalTokens = promptTokens + candidatesTokens;

      logger.warn('GoogleProvider: Using estimated token counts (no usageMetadata in stream)', {
        promptTokens,
        candidatesTokens,
        totalTokens,
      });
    }

    return {
      promptTokens,
      completionTokens: candidatesTokens,
      totalTokens,
      cachedTokens: usageMetadata?.cachedContentTokenCount,
    };
  }
}
