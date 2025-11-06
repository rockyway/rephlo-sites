import nock from 'nock';

/**
 * Mock OpenAI API responses
 */
export const mockOpenAICompletion = (
  response: Partial<{
    id: string;
    model: string;
    content: string;
    promptTokens: number;
    completionTokens: number;
  }> = {}
) => {
  const defaultResponse = {
    id: response.id || 'chatcmpl-test-123',
    object: 'chat.completion',
    created: Date.now(),
    model: response.model || 'gpt-5',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: response.content || 'This is a test response from GPT-5.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: response.promptTokens || 25,
      completion_tokens: response.completionTokens || 10,
      total_tokens: (response.promptTokens || 25) + (response.completionTokens || 10),
    },
  };

  return nock('https://api.openai.com')
    .post('/v1/chat/completions')
    .reply(200, defaultResponse);
};

/**
 * Mock Anthropic API responses
 */
export const mockAnthropicCompletion = (
  response: Partial<{
    id: string;
    model: string;
    content: string;
    inputTokens: number;
    outputTokens: number;
  }> = {}
) => {
  const defaultResponse = {
    id: response.id || 'msg-test-123',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: response.content || 'This is a test response from Claude.',
      },
    ],
    model: response.model || 'claude-3.5-sonnet',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: response.inputTokens || 20,
      output_tokens: response.outputTokens || 15,
    },
  };

  return nock('https://api.anthropic.com')
    .post('/v1/messages')
    .reply(200, defaultResponse);
};

/**
 * Mock Google Generative AI API responses
 */
export const mockGoogleCompletion = (
  response: Partial<{
    model: string;
    content: string;
    promptTokens: number;
    completionTokens: number;
  }> = {}
) => {
  const defaultResponse = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: response.content || 'This is a test response from Gemini.',
            },
          ],
          role: 'model',
        },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: response.promptTokens || 30,
      candidatesTokenCount: response.completionTokens || 12,
      totalTokenCount: (response.promptTokens || 30) + (response.completionTokens || 12),
    },
  };

  return nock('https://generativelanguage.googleapis.com')
    .post(/\/v1beta\/models\/.*:generateContent/)
    .reply(200, defaultResponse);
};

/**
 * Mock Stripe customer creation
 */
export const mockStripeCustomerCreate = (customerId: string = 'cus_test_123') => {
  return nock('https://api.stripe.com')
    .post('/v1/customers')
    .reply(200, {
      id: customerId,
      object: 'customer',
      email: 'test@example.com',
      created: Date.now(),
    });
};

/**
 * Mock Stripe subscription creation
 */
export const mockStripeSubscriptionCreate = (subscriptionId: string = 'sub_test_123') => {
  return nock('https://api.stripe.com')
    .post('/v1/subscriptions')
    .reply(200, {
      id: subscriptionId,
      object: 'subscription',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      items: {
        data: [
          {
            id: 'si_test_123',
            price: {
              id: 'price_pro_monthly',
              unit_amount: 2999,
            },
          },
        ],
      },
    });
};

/**
 * Mock Stripe subscription cancellation
 */
export const mockStripeSubscriptionCancel = (subscriptionId: string = 'sub_test_123') => {
  return nock('https://api.stripe.com')
    .delete(`/v1/subscriptions/${subscriptionId}`)
    .reply(200, {
      id: subscriptionId,
      object: 'subscription',
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000),
    });
};

/**
 * Mock webhook delivery
 */
export const mockWebhookDelivery = (url: string, success: boolean = true) => {
  const parsedUrl = new URL(url);
  const scope = nock(`${parsedUrl.protocol}//${parsedUrl.host}`).post(parsedUrl.pathname);

  if (success) {
    return scope.reply(200, { received: true });
  } else {
    return scope.reply(500, { error: 'Internal Server Error' });
  }
};

/**
 * Clean all nock mocks
 */
export const cleanMocks = () => {
  nock.cleanAll();
};

/**
 * Enable nock recorder for debugging
 */
export const enableNockRecorder = () => {
  nock.recorder.rec({
    output_objects: true,
  });
};
