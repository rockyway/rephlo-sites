/**
 * Google AI Provider Implementation
 *
 * Handles all Google Generative AI API interactions.
 * Converts Google SDK responses to common LLM response format.
 */

import { injectable, inject } from 'tsyringe';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
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
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }] as any, // TODO: Transform vision content for Google (Plan 204 Phase 2)
    }));

    const lastMessage = request.messages[request.messages.length - 1];

    const chat = model.startChat({ history: history as any }); // TODO: Proper typing for vision content (Plan 204 Phase 2)
    const result = await chat.sendMessage(
      typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content)
    );
    const response = result.response;
    const text = response.text();

    // Estimate tokens (Google doesn't provide token counts in response)
    const promptText = request.messages.map((m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(' ');
    const promptTokens = Math.ceil(promptText.length / 4);
    const completionTokens = Math.ceil(text.length / 4);

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
      usage: {
        promptTokens: promptTokens,
        completionTokens: completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    res: Response
  ): Promise<number> {
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
      throw new Error('Google AI client not initialized');
    }

    const model = this.client.getGenerativeModel({ model: request.model });
    const result = await model.generateContent(request.prompt);
    const response = result.response;
    const text = response.text();

    const promptTokens = Math.ceil(request.prompt.length / 4);
    const completionTokens = Math.ceil(text.length / 4);

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
      usage: {
        promptTokens: promptTokens,
        completionTokens: completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  async streamTextCompletion(
    request: TextCompletionRequest,
    res: Response
  ): Promise<number> {
    if (!this.client) {
      throw new Error('Google AI client not initialized');
    }

    const model = this.client.getGenerativeModel({ model: request.model });
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

    const totalTokens = Math.ceil((request.prompt.length + completionText.length) / 4);
    return totalTokens;
  }
}
