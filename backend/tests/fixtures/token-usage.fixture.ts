/**
 * Token Usage Test Fixtures
 *
 * Provides sample API responses from different providers (OpenAI, Anthropic, Google)
 * for testing token tracking and parsing.
 */

/**
 * OpenAI API Response Formats
 */
export const OPENAI_RESPONSES = {
  standardCompletion: {
    id: 'chatcmpl-8MpxMXV9uFvFDrSngxnR6OfH',
    object: 'chat.completion',
    created: 1698091928,
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a test response from GPT-4o.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 500,
      completion_tokens: 1500,
      total_tokens: 2000,
    },
  },

  streamingChunks: [
    {
      id: 'chatcmpl-stream-1',
      object: 'chat.completion.chunk',
      created: 1698091928,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: 'This ' },
          finish_reason: null,
        },
      ],
    },
    {
      id: 'chatcmpl-stream-2',
      object: 'chat.completion.chunk',
      created: 1698091929,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          delta: { content: 'is a ' },
          finish_reason: null,
        },
      ],
    },
    {
      id: 'chatcmpl-stream-3',
      object: 'chat.completion.chunk',
      created: 1698091930,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          delta: { content: 'streaming response.' },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 500,
        completion_tokens: 250,
        total_tokens: 750,
      },
    },
  ],

  errorResponse: {
    id: 'chatcmpl-error-001',
    object: 'chat.completion',
    created: 1698091928,
    model: 'gpt-4o',
    choices: [],
    usage: {
      prompt_tokens: 500,
      completion_tokens: 0,  // Error occurred, no output
      total_tokens: 500,
    },
    error: {
      message: 'Content filtering triggered',
      type: 'content_filter',
    },
  },

  largeCompletion: {
    id: 'chatcmpl-large-001',
    object: 'chat.completion',
    created: 1698091928,
    model: 'gpt-4-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'A very long response...',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100000,
      completion_tokens: 50000,
      total_tokens: 150000,
    },
  },
};

/**
 * Anthropic API Response Formats
 */
export const ANTHROPIC_RESPONSES = {
  standardMessage: {
    id: 'msg_013Yj9csKL6sWtyAbuUtrXSV',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'This is a response from Claude 3.5 Sonnet.',
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 500,
      output_tokens: 1500,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  },

  messageWithCache: {
    id: 'msg_cached_001',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Response with prompt caching enabled.',
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 300,  // Non-cached input
      output_tokens: 1500,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 200,  // 200 tokens read from cache (10% cost)
    },
  },

  messageWithCacheCreation: {
    id: 'msg_cache_create_001',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'Response creating cache for first time.',
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 300,
      output_tokens: 1500,
      cache_creation_input_tokens: 200,  // Creating cache (125% cost)
      cache_read_input_tokens: 0,
    },
  },

  streamingEvents: [
    {
      type: 'message_start',
      message: {
        id: 'msg_stream_001',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: null,
        usage: {
          input_tokens: 500,
          output_tokens: 0,
        },
      },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'text_delta',
        text: 'Streaming ',
      },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'text_delta',
        text: 'response.',
      },
    },
    {
      type: 'message_delta',
      delta: {
        stop_reason: 'end_turn',
      },
      usage: {
        output_tokens: 250,
      },
    },
  ],

  errorMessage: {
    id: 'msg_error_001',
    type: 'error',
    error: {
      type: 'rate_limit_error',
      message: 'Rate limit exceeded',
    },
  },
};

/**
 * Google Gemini API Response Formats
 */
export const GOOGLE_RESPONSES = {
  standardGeneration: {
    candidates: [
      {
        content: {
          parts: [
            {
              text: 'This is a response from Gemini 2.0 Flash.',
            },
          ],
          role: 'model',
        },
        finishReason: 'STOP',
        safetyRatings: [],
      },
    ],
    usage: {
      prompt_token_count: 500,
      candidates_token_count: 1500,
      total_token_count: 2000,
      cached_content_input_token_count: 0,
    },
  },

  generationWithCache: {
    candidates: [
      {
        content: {
          parts: [
            {
              text: 'Response with cached content.',
            },
          ],
          role: 'model',
        },
        finishReason: 'STOP',
        safetyRatings: [],
      },
    ],
    usage: {
      prompt_token_count: 300,  // Non-cached prompt
      candidates_token_count: 1500,
      total_token_count: 2000,
      cached_content_input_token_count: 200,  // Cached (5% cost)
    },
  },

  streamingChunks: [
    {
      candidates: [
        {
          content: {
            parts: [{ text: 'Streaming ' }],
            role: 'model',
          },
          finishReason: null,
        },
      ],
    },
    {
      candidates: [
        {
          content: {
            parts: [{ text: 'from ' }],
            role: 'model',
          },
          finishReason: null,
        },
      ],
    },
    {
      candidates: [
        {
          content: {
            parts: [{ text: 'Gemini.' }],
            role: 'model',
          },
          finishReason: 'STOP',
        },
      ],
      usage: {
        prompt_token_count: 500,
        candidates_token_count: 250,
        total_token_count: 750,
      },
    },
  ],

  safetyBlockResponse: {
    candidates: [
      {
        content: {
          parts: [],
          role: 'model',
        },
        finishReason: 'SAFETY',
        safetyRatings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            probability: 'HIGH',
          },
        ],
      },
    ],
    usage: {
      prompt_token_count: 500,
      candidates_token_count: 0,  // No output due to safety block
      total_token_count: 500,
    },
  },

  largeGeneration: {
    candidates: [
      {
        content: {
          parts: [{ text: 'Large response...' }],
          role: 'model',
        },
        finishReason: 'STOP',
      },
    ],
    usage: {
      prompt_token_count: 100000,
      candidates_token_count: 50000,
      total_token_count: 150000,
    },
  },
};

/**
 * Test Cases for Token Parsing
 */
export const TOKEN_PARSING_TEST_CASES = [
  {
    name: 'OpenAI standard completion',
    provider: 'openai',
    response: OPENAI_RESPONSES.standardCompletion,
    expectedTokens: {
      input: 500,
      output: 1500,
      total: 2000,
      cached: 0,
    },
  },
  {
    name: 'OpenAI streaming (final chunk)',
    provider: 'openai',
    response: OPENAI_RESPONSES.streamingChunks[2],
    expectedTokens: {
      input: 500,
      output: 250,
      total: 750,
      cached: 0,
    },
  },
  {
    name: 'OpenAI error response',
    provider: 'openai',
    response: OPENAI_RESPONSES.errorResponse,
    expectedTokens: {
      input: 500,
      output: 0,
      total: 500,
      cached: 0,
    },
  },
  {
    name: 'Anthropic standard message',
    provider: 'anthropic',
    response: ANTHROPIC_RESPONSES.standardMessage,
    expectedTokens: {
      input: 500,
      output: 1500,
      total: 2000,
      cached: 0,
      cacheRead: 0,
      cacheCreation: 0,
    },
  },
  {
    name: 'Anthropic with cache read',
    provider: 'anthropic',
    response: ANTHROPIC_RESPONSES.messageWithCache,
    expectedTokens: {
      input: 300,
      output: 1500,
      total: 1800,
      cached: 0,
      cacheRead: 200,  // 10% pricing
      cacheCreation: 0,
    },
  },
  {
    name: 'Anthropic with cache creation',
    provider: 'anthropic',
    response: ANTHROPIC_RESPONSES.messageWithCacheCreation,
    expectedTokens: {
      input: 300,
      output: 1500,
      total: 1800,
      cached: 0,
      cacheRead: 0,
      cacheCreation: 200,  // 125% pricing
    },
  },
  {
    name: 'Google standard generation',
    provider: 'google',
    response: GOOGLE_RESPONSES.standardGeneration,
    expectedTokens: {
      input: 500,
      output: 1500,
      total: 2000,
      cached: 0,
    },
  },
  {
    name: 'Google with cache',
    provider: 'google',
    response: GOOGLE_RESPONSES.generationWithCache,
    expectedTokens: {
      input: 300,
      output: 1500,
      total: 2000,
      cached: 200,  // 5% pricing
    },
  },
  {
    name: 'Google safety block',
    provider: 'google',
    response: GOOGLE_RESPONSES.safetyBlockResponse,
    expectedTokens: {
      input: 500,
      output: 0,
      total: 500,
      cached: 0,
    },
  },
];

/**
 * Mock User Credit Data
 */
export const USER_CREDIT_FIXTURES = {
  freeUser: {
    id: 'user-free-001',
    tier: 'free',
    creditBalance: 2000,
    creditsUsedThisMonth: 1950,
    creditsRemaining: 50,
  },
  proUser: {
    id: 'user-pro-001',
    tier: 'pro',
    creditBalance: 20000,
    creditsUsedThisMonth: 5000,
    creditsRemaining: 15000,
  },
  enterpriseUser: {
    id: 'user-enterprise-001',
    tier: 'enterprise_pro',
    creditBalance: 250000,
    creditsUsedThisMonth: 50000,
    creditsRemaining: 200000,
  },
  insufficientCreditsUser: {
    id: 'user-insufficient-001',
    tier: 'free',
    creditBalance: 5,
    creditsUsedThisMonth: 1995,
    creditsRemaining: 5,
  },
  zeroCreditsUser: {
    id: 'user-zero-001',
    tier: 'free',
    creditBalance: 0,
    creditsUsedThisMonth: 2000,
    creditsRemaining: 0,
  },
};

/**
 * Complete Request Scenarios (Input → Output)
 */
export const COMPLETE_REQUEST_SCENARIOS = [
  {
    name: 'Pro user, GPT-4o, standard completion',
    user: USER_CREDIT_FIXTURES.proUser,
    request: {
      modelId: 'gpt-4o',
      providerId: 'openai-provider-uuid-001',
      inputTokens: 500,
      outputTokens: 1500,
    },
    response: OPENAI_RESPONSES.standardCompletion,
    expectedCost: {
      vendorCost: 0.025,  // (500 * 0.005 + 1500 * 0.015) / 1000
      multiplier: 1.5,
      creditValue: 0.0375,
      creditsDeducted: 4,  // Rounded up from 3.75
      grossMargin: 0.0125,
    },
    expectedBalanceAfter: 19996,
  },
  {
    name: 'Free user, Claude with cache',
    user: USER_CREDIT_FIXTURES.freeUser,
    request: {
      modelId: 'claude-3-5-sonnet-20241022',
      providerId: 'anthropic-provider-uuid-002',
      inputTokens: 300,
      outputTokens: 1500,
      cacheReadTokens: 200,
    },
    response: ANTHROPIC_RESPONSES.messageWithCache,
    expectedCost: {
      vendorCost: 0.0234,  // (300 * 0.003 + 200 * 0.0003 + 1500 * 0.015) / 1000
      multiplier: 2.0,
      creditValue: 0.0468,
      creditsDeducted: 5,  // Rounded up from 4.68
      grossMargin: 0.0234,
    },
    expectedBalanceAfter: 1995,
  },
  {
    name: 'Enterprise user, Gemini Flash',
    user: USER_CREDIT_FIXTURES.enterpriseUser,
    request: {
      modelId: 'gemini-2.0-flash',
      providerId: 'google-provider-uuid-003',
      inputTokens: 500,
      outputTokens: 1500,
    },
    response: GOOGLE_RESPONSES.standardGeneration,
    expectedCost: {
      vendorCost: 0.0024375,  // (500 * 0.000375 + 1500 * 0.0015) / 1000
      multiplier: 1.1,
      creditValue: 0.00268125,
      creditsDeducted: 1,  // Rounded up from 0.268
      grossMargin: 0.00024375,
    },
    expectedBalanceAfter: 249999,
  },
];

export default {
  OPENAI_RESPONSES,
  ANTHROPIC_RESPONSES,
  GOOGLE_RESPONSES,
  TOKEN_PARSING_TEST_CASES,
  USER_CREDIT_FIXTURES,
  COMPLETE_REQUEST_SCENARIOS,
};
