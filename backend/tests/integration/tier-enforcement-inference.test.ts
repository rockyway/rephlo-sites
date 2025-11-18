/**
 * Tier Enforcement Integration Tests for Inference Endpoints
 *
 * Tests that tier restrictions are properly enforced on:
 * - POST /v1/chat/completions
 * - POST /v1/completions
 *
 * Test Coverage:
 * - Free tier cannot access Pro models
 * - Pro tier cannot access Enterprise models
 * - Enterprise tier can access all models
 * - 403 error returned with upgrade_url
 * - Error response includes required tier info
 * - Tier check happens before LLM API call
 * - Model access allowed when tier is sufficient
 */

import request from 'supertest';
import { PrismaClient, SubscriptionTier } from '@prisma/client';
import app from '../../src/app';
import { createTestUser, createTestSubscription } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';
import nock from 'nock';

describe('Tier Enforcement in Inference Endpoints', () => {
  let prisma: PrismaClient;
  let freeUserToken: string;
  let proUserToken: string;
  let enterpriseUserToken: string;

  // Test model IDs
  const freeModelId = 'gpt-3.5-turbo';
  const proModelId = 'gpt-4';
  const enterpriseModelId = 'claude-opus-3';

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });

    // Create test users with different tiers
    const freeUser = await createTestUser(prisma, { email: 'free@test.com' });
    await createTestSubscription(prisma, freeUser.id, { tier: SubscriptionTier.free });
    freeUserToken = await generateTestAccessToken(freeUser);

    const proUser = await createTestUser(prisma, { email: 'pro@test.com' });
    await createTestSubscription(prisma, proUser.id, { tier: SubscriptionTier.pro });
    proUserToken = await generateTestAccessToken(proUser);

    const enterpriseUser = await createTestUser(prisma, { email: 'enterprise@test.com' });
    await createTestSubscription(prisma, enterpriseUser.id, { tier: SubscriptionTier.enterprise_pro });
    enterpriseUserToken = await generateTestAccessToken(enterpriseUser);

    // Create test models with tier restrictions
    await prisma.model.createMany({
      data: [
        {
          id: freeModelId,
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          isAvailable: true,
          meta: {
            displayName: 'GPT-3.5 Turbo',
            contextLength: 4096,
            maxOutputTokens: 4096,
            capabilities: [],
            requiredTier: SubscriptionTier.free,
            allowedTiers: [SubscriptionTier.free, SubscriptionTier.pro, SubscriptionTier.enterprise_pro, SubscriptionTier.enterprise_max],
          },
        },
        {
          id: proModelId,
          name: 'GPT-4',
          provider: 'openai',
          isAvailable: true,
          meta: {
            displayName: 'GPT-4',
            contextLength: 8192,
            maxOutputTokens: 8192,
            capabilities: [],
            requiredTier: SubscriptionTier.pro,
            allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise_pro, SubscriptionTier.enterprise_max],
          },
        },
        {
          id: enterpriseModelId,
          name: 'Claude Opus 3',
          provider: 'anthropic',
          isAvailable: true,
          meta: {
            displayName: 'Claude Opus 3',
            contextLength: 200000,
            maxOutputTokens: 4096,
            capabilities: [],
            requiredTier: SubscriptionTier.enterprise_pro,
            allowedTiers: [SubscriptionTier.enterprise_pro, SubscriptionTier.enterprise_max],
          },
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.model.deleteMany({
      where: {
        id: {
          in: [freeModelId, proModelId, enterpriseModelId],
        },
      },
    });
    await prisma.$disconnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('POST /v1/chat/completions - Tier Enforcement', () => {
    it('should allow free user to access free tier model', async () => {
      // Mock OpenAI API
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: freeModelId,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: freeModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(res.body.choices).toBeDefined();
      expect(res.body.model).toBe(freeModelId);
    });

    it('should deny free user access to pro tier model with 403', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: proModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('model_access_restricted');
      expect(res.body.error.message).toContain('Pro');
      expect(res.body.error.details).toHaveProperty('required_tier');
      expect(res.body.error.details.required_tier).toBe(SubscriptionTier.pro);
      expect(res.body.error.details).toHaveProperty('current_tier');
      expect(res.body.error.details.current_tier).toBe(SubscriptionTier.free);
      expect(res.body.error.details).toHaveProperty('upgrade_url');
    });

    it('should deny free user access to enterprise tier model with 403', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: enterpriseModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('model_access_restricted');
      expect(res.body.error.message).toContain('Enterprise');
      expect(res.body.error.details.required_tier).toBe(SubscriptionTier.enterprise_pro);
    });

    it('should allow pro user to access free tier model', async () => {
      // Mock OpenAI API
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: freeModelId,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          model: freeModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(res.body.choices).toBeDefined();
    });

    it('should allow pro user to access pro tier model', async () => {
      // Mock OpenAI API
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: proModelId,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          model: proModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(res.body.choices).toBeDefined();
    });

    it('should deny pro user access to enterprise tier model with 403', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          model: enterpriseModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('model_access_restricted');
      expect(res.body.error.message).toContain('Enterprise');
      expect(res.body.error.details.required_tier).toBe(SubscriptionTier.enterprise_pro);
      expect(res.body.error.details.current_tier).toBe(SubscriptionTier.pro);
    });

    it('should allow enterprise user to access all tier models', async () => {
      // Mock OpenAI API for free model
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: freeModelId,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const res1 = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${enterpriseUserToken}`)
        .send({
          model: freeModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(res1.body.choices).toBeDefined();

      // Mock OpenAI API for pro model
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: proModelId,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Test response' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });

      const res2 = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${enterpriseUserToken}`)
        .send({
          model: proModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(res2.body.choices).toBeDefined();

      // Mock Anthropic API for enterprise model
      nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, {
          id: 'msg-test',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Test response' }],
          model: enterpriseModelId,
          usage: { input_tokens: 10, output_tokens: 5 },
        });

      const res3 = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${enterpriseUserToken}`)
        .send({
          model: enterpriseModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(res3.body.choices).toBeDefined();
    });

    it('should NOT call LLM API when tier check fails', async () => {
      // Do not mock LLM API - if it's called, test will fail

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: proModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(403);

      expect(res.body.error.code).toBe('model_access_restricted');

      // Verify no pending nock mocks (no LLM API was called)
      expect(nock.pendingMocks()).toHaveLength(0);
    });
  });

  describe('POST /v1/completions - Tier Enforcement', () => {
    it('should allow free user to access free tier model', async () => {
      // Mock OpenAI API
      nock('https://api.openai.com')
        .post('/v1/completions')
        .reply(200, {
          id: 'cmpl-test',
          object: 'text_completion',
          created: Date.now(),
          model: freeModelId,
          choices: [{
            index: 0,
            text: 'Test completion',
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        });

      const res = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: freeModelId,
          prompt: 'Hello',
        })
        .expect(200);

      expect(res.body.choices).toBeDefined();
      expect(res.body.model).toBe(freeModelId);
    });

    it('should deny free user access to pro tier model with 403', async () => {
      const res = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: proModelId,
          prompt: 'Hello',
        })
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('model_access_restricted');
      expect(res.body.error.details.required_tier).toBe(SubscriptionTier.pro);
      expect(res.body.error.details).toHaveProperty('upgrade_url');
    });

    it('should deny pro user access to enterprise tier model with 403', async () => {
      const res = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          model: enterpriseModelId,
          prompt: 'Hello',
        })
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('model_access_restricted');
      expect(res.body.error.details.required_tier).toBe(SubscriptionTier.enterprise_pro);
    });

    it('should allow enterprise user to access all tier models', async () => {
      // Mock Anthropic API
      nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, {
          id: 'msg-test',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Test response' }],
          model: enterpriseModelId,
          usage: { input_tokens: 5, output_tokens: 3 },
        });

      const res = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${enterpriseUserToken}`)
        .send({
          model: enterpriseModelId,
          prompt: 'Hello',
        })
        .expect(200);

      expect(res.body.choices).toBeDefined();
    });
  });

  describe('Error Response Format', () => {
    it('should include all required fields in 403 error response', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: proModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(403);

      // Verify error structure
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('details');

      // Verify details structure
      expect(res.body.error.details).toHaveProperty('model_id');
      expect(res.body.error.details).toHaveProperty('required_tier');
      expect(res.body.error.details).toHaveProperty('current_tier');
      expect(res.body.error.details).toHaveProperty('upgrade_url');

      // Verify values
      expect(res.body.error.details.model_id).toBe(proModelId);
      expect(res.body.error.details.required_tier).toBe(SubscriptionTier.pro);
      expect(res.body.error.details.current_tier).toBe(SubscriptionTier.free);
      expect(res.body.error.details.upgrade_url).toContain('/pricing');
    });

    it('should include helpful message explaining tier requirement', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: enterpriseModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(403);

      expect(res.body.error.message).toMatch(/requires.*(enterprise|Enterprise)/i);
      expect(res.body.error.message).toMatch(/upgrade/i);
    });
  });

  describe('Unauthenticated Requests', () => {
    it('should return 401 for unauthenticated chat completion', async () => {
      await request(app)
        .post('/v1/chat/completions')
        .send({
          model: freeModelId,
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(401);
    });

    it('should return 401 for unauthenticated completion', async () => {
      await request(app)
        .post('/v1/completions')
        .send({
          model: freeModelId,
          prompt: 'Hello',
        })
        .expect(401);
    });
  });
});
