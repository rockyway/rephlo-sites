import { Response } from 'express';
import { ILLMProvider } from '../../interfaces';
import {
  ChatCompletionRequest,
  TextCompletionRequest,
} from '../../types/model-validation';

/**
 * Mock OpenAI Provider
 */
export class MockOpenAIProvider implements ILLMProvider {
  public readonly providerName = 'openai';

  async chatCompletion(request: ChatCompletionRequest) {
    return {
      response: {
        id: `chatcmpl-mock-${Date.now()}`,
        object: 'chat.completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Mock OpenAI response to: ' + request.messages[request.messages.length - 1].content,
            },
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  async streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number> {
    // Mock streaming
    res.write('data: {"id":"chatcmpl-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":"Mock"},"finish_reason":null}]}\n\n');
    res.write('data: {"id":"chatcmpl-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":" streaming"},"finish_reason":null}]}\n\n');
    res.write('data: {"id":"chatcmpl-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30; // Mock total tokens
  }

  async textCompletion(request: TextCompletionRequest) {
    return {
      response: {
        id: `cmpl-mock-${Date.now()}`,
        object: 'text_completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            text: 'Mock completion text for prompt: ' + request.prompt,
            index: 0,
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  }

  async streamTextCompletion(_request: TextCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"id":"cmpl-mock","object":"text_completion","created":1234567890,"choices":[{"text":"Mock","index":0,"finish_reason":null}]}\n\n');
    res.write('data: {"id":"cmpl-mock","object":"text_completion","created":1234567890,"choices":[{"text":" text","index":0,"finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30; // Mock total tokens
  }
}

/**
 * Mock Azure OpenAI Provider
 */
export class MockAzureOpenAIProvider implements ILLMProvider {
  public readonly providerName = 'azure';

  async chatCompletion(request: ChatCompletionRequest) {
    return {
      response: {
        id: `chatcmpl-azure-mock-${Date.now()}`,
        object: 'chat.completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Mock Azure OpenAI response to: ' + request.messages[request.messages.length - 1].content,
            },
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 12,
        completion_tokens: 18,
        total_tokens: 30,
      },
    };
  }

  async streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"id":"chatcmpl-azure-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":"Azure"},"finish_reason":null}]}\n\n');
    res.write('data: {"id":"chatcmpl-azure-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":" streaming"},"finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30;
  }

  async textCompletion(request: TextCompletionRequest) {
    return {
      response: {
        id: `cmpl-azure-mock-${Date.now()}`,
        object: 'text_completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            text: 'Mock Azure completion text',
            index: 0,
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 12,
        completion_tokens: 18,
        total_tokens: 30,
      },
    };
  }

  async streamTextCompletion(_request: TextCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"id":"cmpl-azure-mock","object":"text_completion","created":1234567890,"choices":[{"text":"Azure text","index":0,"finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30;
  }
}

/**
 * Mock Anthropic Provider
 */
export class MockAnthropicProvider implements ILLMProvider {
  public readonly providerName = 'anthropic';

  async chatCompletion(request: ChatCompletionRequest) {
    return {
      response: {
        id: `msg-mock-${Date.now()}`,
        object: 'chat.completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Mock Anthropic Claude response to: ' + request.messages[request.messages.length - 1].content,
            },
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40,
      },
    };
  }

  async streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"id":"msg-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":"Claude"},"finish_reason":null}]}\n\n');
    res.write('data: {"id":"msg-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":" here"},"finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 40;
  }

  async textCompletion(request: TextCompletionRequest) {
    return {
      response: {
        id: `cmpl-anthropic-mock-${Date.now()}`,
        object: 'text_completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            text: 'Mock Anthropic completion',
            index: 0,
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40,
      },
    };
  }

  async streamTextCompletion(_request: TextCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"choices":[{"text":"Anthropic","finish_reason":null}]}\n\n');
    res.write('data: {"choices":[{"text":" completion","finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 40;
  }
}

/**
 * Mock Google Provider
 */
export class MockGoogleProvider implements ILLMProvider {
  public readonly providerName = 'google';

  async chatCompletion(request: ChatCompletionRequest) {
    return {
      response: {
        id: `gen-mock-${Date.now()}`,
        object: 'chat.completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Mock Google Gemini response to: ' + request.messages[request.messages.length - 1].content,
            },
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 8,
        completion_tokens: 22,
        total_tokens: 30,
      },
    };
  }

  async streamChatCompletion(request: ChatCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"id":"gen-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":"Gemini"},"finish_reason":null}]}\n\n');
    res.write('data: {"id":"gen-mock","object":"chat.completion.chunk","created":1234567890,"model":"' + request.model + '","choices":[{"index":0,"delta":{"content":" streaming"},"finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30;
  }

  async textCompletion(request: TextCompletionRequest) {
    return {
      response: {
        id: `gen-text-mock-${Date.now()}`,
        object: 'text_completion' as const,
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            text: 'Mock Google completion',
            index: 0,
            finish_reason: 'stop' as const,
          },
        ],
      },
      usage: {
        prompt_tokens: 8,
        completion_tokens: 22,
        total_tokens: 30,
      },
    };
  }

  async streamTextCompletion(_request: TextCompletionRequest, res: Response): Promise<number> {
    res.write('data: {"choices":[{"text":"Google","finish_reason":null}]}\n\n');
    res.write('data: {"choices":[{"text":" text","finish_reason":"stop"}]}\n\n');
    res.write('data: [DONE]\n\n');
    return 30;
  }
}
