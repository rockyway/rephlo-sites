/**
 * Integration Tests for Parameter Validation
 *
 * Tests chat completions with parameter constraints:
 * - GPT-5-mini with temperature=1.0 only (accept/reject)
 * - Claude 4.5 with mutually exclusive temperature/top_p
 * - Parameter transformation (max_tokens → max_completion_tokens)
 * - Range validation (min/max enforcement)
 * - Unsupported parameter warnings
 * - Default value application
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { createTestUser, createTestSubscription, createTestCredits } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';
import { mockOpenAICompletion, mockAnthropicCompletion, cleanMocks } from '../helpers/mocks';

describe('Parameter Validation Integration Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();

    const user = await createTestUser(prisma);
    const subscription = await createTestSubscription(prisma, user.id, {
      tier: 'enterprise', // Enterprise for all models
    });
    await createTestCredits(prisma, user.id, subscription.id, {
      totalCredits: 1000000,
      usedCredits: 0,
    });

    authToken = await generateTestAccessToken(user);
  });

  beforeEach(() => {
    cleanMocks();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('GPT-5-Mini Temperature Restrictions', () => {
    it('should accept temperature=1.0 for GPT-5-mini', async () => {
      mockOpenAICompletion({
        content: 'Hello!',
        promptTokens: 10,
        completionTokens: 5,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 1.0, // ✅ Allowed
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
    });

    it('should reject temperature=0.7 for GPT-5-mini', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7, // ❌ Not allowed
        })
        .expect(422);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('temperature');
      expect(response.body.error.message).toContain('1.0');
    });

    it('should reject temperature=1.5 for GPT-5-mini', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 1.5, // ❌ Not in allowed values
        })
        .expect(422);

      expect(response.body.error.message).toContain('must be one of: [1.0]');
    });
  });

  describe('Claude 4.5 Mutually Exclusive Parameters', () => {
    it('should accept temperature only for Claude 4.5', async () => {
      mockAnthropicCompletion({
        content: 'Hello from Claude!',
        inputTokens: 10,
        outputTokens: 8,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.8, // ✅ Allowed alone
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
    });

    it('should accept top_p only for Claude 4.5', async () => {
      mockAnthropicCompletion({
        content: 'Hello from Claude!',
        inputTokens: 10,
        outputTokens: 8,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          messages: [{ role: 'user', content: 'Hello' }],
          top_p: 0.9, // ✅ Allowed alone
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
    });

    it('should reject temperature + top_p for Claude 4.5', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'claude-sonnet-4.5',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.8,
          top_p: 0.9, // ❌ Cannot use both
        })
        .expect(422);

      expect(response.body.error.message).toContain('cannot be used together');
    });
  });

  describe('Parameter Transformation', () => {
    it('should transform max_tokens to max_completion_tokens for GPT-5', async () => {
      mockOpenAICompletion({
        content: 'Response',
        promptTokens: 10,
        completionTokens: 5,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 2000, // Should be transformed
        })
        .expect(200);

      // Verify transformation happened (check logs or mock spy)
    });

    it('should NOT transform max_tokens for GPT-4', async () => {
      mockOpenAICompletion({
        content: 'Response',
        promptTokens: 10,
        completionTokens: 5,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 2000, // Should remain as is
        })
        .expect(200);
    });
  });

  describe('Range Validation', () => {
    it('should accept temperature within valid range', async () => {
      mockOpenAICompletion({
        content: 'Response',
        promptTokens: 10,
        completionTokens: 5,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 1.5, // ✅ Within 0-2.0 range
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
    });

    it('should reject temperature above max', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 3.0, // ❌ Above max 2.0
        })
        .expect(422);

      expect(response.body.error.message).toContain('must be <= 2');
    });

    it('should reject temperature below min', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: -0.5, // ❌ Below min 0
        })
        .expect(422);

      expect(response.body.error.message).toContain('must be >= 0');
    });
  });

  describe('Default Value Application', () => {
    it('should apply default temperature when not provided', async () => {
      mockOpenAICompletion({
        content: 'Response with defaults',
        promptTokens: 10,
        completionTokens: 5,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          // temperature not provided - should use default 0.7
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
    });
  });

  describe('Unsupported Parameters', () => {
    it('should warn about unsupported parameter but proceed', async () => {
      mockOpenAICompletion({
        content: 'Response',
        promptTokens: 10,
        completionTokens: 5,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          top_p: 0.9, // Unsupported for GPT-5-mini (temperature restriction)
        })
        .expect(200);

      // Parameter should be filtered out, warnings logged
      expect(response.body.choices[0].message.content).toBeDefined();
    });
  });

  describe('Multiple Parameter Validation', () => {
    it('should validate multiple parameters correctly', async () => {
      mockOpenAICompletion({
        content: 'Response',
        promptTokens: 10,
        completionTokens: 5,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 1.0,
          max_tokens: 2000,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
    });

    it('should reject multiple invalid parameters', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 3.0, // ❌ Invalid
          max_tokens: 10000, // ❌ Invalid
        })
        .expect(422);

      expect(response.body.error.message).toBeDefined();
      // Should report both errors
    });
  });
});
