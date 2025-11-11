/**
 * Integration Tests for Model Tier Access Control API
 *
 * Tests the tier-based access control for model inference endpoints:
 * - GET /v1/models - Lists models with tier metadata
 * - GET /v1/models/:modelId - Gets model details with access status
 * - POST /v1/chat/completions - Chat inference with tier validation
 * - POST /v1/completions - Text completion with tier validation
 *
 * Tests scenarios across all subscription tiers: free, pro, enterprise
 *
 * Reference: docs/plan/108-model-tier-access-control-architecture.md
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import app from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { createTestUser, createTestSubscription, createTestCredits } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Model Tier Access Control API - Integration Tests', () => {
  let prisma: PrismaClient;

  // Test users with different subscription tiers
  let freeUser: any;
  let proUser: any;
  let enterpriseUser: any;
  let noSubscriptionUser: any;

  // Auth tokens
  let freeUserToken: string;
  let proUserToken: string;
  let enterpriseUserToken: string;
  let noSubscriptionToken: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();

    // Create test users with different tiers
    freeUser = await createTestUser(prisma, { email: 'free@test.com' });
    proUser = await createTestUser(prisma, { email: 'pro@test.com' });
    enterpriseUser = await createTestUser(prisma, { email: 'enterprise@test.com' });
    noSubscriptionUser = await createTestUser(prisma, { email: 'nosub@test.com' });

    // Create subscriptions
    const freeSubscription = await createTestSubscription(prisma, freeUser.id, {
      tier: SubscriptionTier.free,
      status: SubscriptionStatus.active,
    });
    const proSubscription = await createTestSubscription(prisma, proUser.id, {
      tier: SubscriptionTier.pro,
      status: SubscriptionStatus.active,
    });
    const enterpriseSubscription = await createTestSubscription(prisma, enterpriseUser.id, {
      tier: SubscriptionTier.enterprise,
      status: SubscriptionStatus.active,
    });

    // Create credits for users
    await createTestCredits(prisma, freeUser.id, freeSubscription.id, {
      totalCredits: 5000,
      usedCredits: 0,
    });
    await createTestCredits(prisma, proUser.id, proSubscription.id, {
      totalCredits: 100000,
      usedCredits: 0,
    });
    await createTestCredits(prisma, enterpriseUser.id, enterpriseSubscription.id, {
      totalCredits: 1000000,
      usedCredits: 0,
    });

    // Generate auth tokens
    freeUserToken = await generateTestAccessToken(freeUser);
    proUserToken = await generateTestAccessToken(proUser);
    enterpriseUserToken = await generateTestAccessToken(enterpriseUser);
    noSubscriptionToken = await generateTestAccessToken(noSubscriptionUser);
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ==========================================================================
  // GET /v1/models - List models with tier metadata
  // ==========================================================================

  describe('GET /v1/models', () => {
    it('should return all models with tier metadata for free user', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.models).toBeDefined();
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
      expect(response.body.user_tier).toBe(SubscriptionTier.free);

      // Verify tier metadata is included
      const model = response.body.models[0];
      expect(model).toHaveProperty('required_tier');
      expect(model).toHaveProperty('tier_restriction_mode');
      expect(model).toHaveProperty('allowed_tiers');
      expect(model).toHaveProperty('access_status');

      // Verify access status is calculated correctly
      const freeModel = response.body.models.find((m: any) => m.required_tier === SubscriptionTier.free);
      const proModel = response.body.models.find((m: any) => m.required_tier === SubscriptionTier.pro);
      const enterpriseModel = response.body.models.find((m: any) => m.required_tier === SubscriptionTier.enterprise);

      if (freeModel) {
        expect(freeModel.access_status).toBe('allowed');
      }
      if (proModel) {
        expect(proModel.access_status).toBe('upgrade_required');
      }
      if (enterpriseModel) {
        expect(enterpriseModel.access_status).toBe('upgrade_required');
      }
    });

    it('should return correct access status for pro user', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      expect(response.body.user_tier).toBe(SubscriptionTier.pro);

      const freeModel = response.body.models.find((m: any) => m.required_tier === SubscriptionTier.free);
      const proModel = response.body.models.find((m: any) => m.required_tier === SubscriptionTier.pro);
      const enterpriseModel = response.body.models.find((m: any) => m.required_tier === SubscriptionTier.enterprise);

      if (freeModel) {
        expect(freeModel.access_status).toBe('allowed');
      }
      if (proModel) {
        expect(proModel.access_status).toBe('allowed');
      }
      if (enterpriseModel) {
        expect(enterpriseModel.access_status).toBe('upgrade_required');
      }
    });

    it('should return all models as accessible for enterprise user', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${enterpriseUserToken}`)
        .expect(200);

      expect(response.body.user_tier).toBe(SubscriptionTier.enterprise);

      // All models should be accessible to enterprise users
      response.body.models.forEach((model: any) => {
        if (model.tier_restriction_mode === 'minimum') {
          expect(model.access_status).toBe('allowed');
        }
      });
    });

    it('should default to free tier for user without subscription', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${noSubscriptionToken}`)
        .expect(200);

      expect(response.body.user_tier).toBe(SubscriptionTier.free);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/models')
        .expect(401);
    });
  });

  // ==========================================================================
  // GET /v1/models/:modelId - Get model details with tier context
  // ==========================================================================

  describe('GET /v1/models/:modelId', () => {
    it('should return model details with access status for free user', async () => {
      const response = await request(app)
        .get('/v1/models/gemini-2.0-pro')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.id).toBe('gemini-2.0-pro');
      expect(response.body.required_tier).toBe(SubscriptionTier.pro);
      expect(response.body.tier_restriction_mode).toBeDefined();
      expect(response.body.allowed_tiers).toBeDefined();
      expect(response.body.access_status).toBe('upgrade_required');
      expect(response.body.upgrade_info).toEqual({
        required_tier: SubscriptionTier.pro,
        upgrade_url: '/subscriptions/upgrade',
      });
    });

    it('should return accessible status when user has sufficient tier', async () => {
      const response = await request(app)
        .get('/v1/models/gemini-2.0-pro')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      expect(response.body.id).toBe('gemini-2.0-pro');
      expect(response.body.access_status).toBe('allowed');
      expect(response.body.upgrade_info).toBeUndefined();
    });

    it('should return 404 for non-existent model', async () => {
      await request(app)
        .get('/v1/models/non-existent-model')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/models/gemini-2.0-pro')
        .expect(401);
    });
  });

  // ==========================================================================
  // POST /v1/chat/completions - Tier validation on inference
  // ==========================================================================

  describe('POST /v1/chat/completions - Tier Access Validation', () => {
    const validChatRequest = {
      messages: [
        { role: 'user', content: 'Hello, how are you?' },
      ],
      max_tokens: 100,
      temperature: 0.7,
    };

    describe('Free user tier access', () => {
      it('should deny free user access to pro model with 403', async () => {
        const response = await request(app)
          .post('/v1/chat/completions')
          .set('Authorization', `Bearer ${freeUserToken}`)
          .send({
            model: 'claude-3.5-sonnet', // Pro tier model
            ...validChatRequest,
          })
          .expect(403);

        expect(response.body.status).toBe('error');
        expect(response.body.code).toBe('model_access_restricted');
        expect(response.body.message).toContain('Pro tier');
        expect(response.body.details).toMatchObject({
          model_id: 'claude-3.5-sonnet',
          user_tier: SubscriptionTier.free,
          required_tier: SubscriptionTier.pro,
          upgrade_url: expect.stringContaining('upgrade'),
        });
      });

      it('should deny free user access to enterprise model with 403', async () => {
        const response = await request(app)
          .post('/v1/chat/completions')
          .set('Authorization', `Bearer ${freeUserToken}`)
          .send({
            model: 'gpt-5', // Enterprise tier model
            ...validChatRequest,
          })
          .expect(403);

        expect(response.body.status).toBe('error');
        expect(response.body.code).toBe('model_access_restricted');
        expect(response.body.details.required_tier).toBe(SubscriptionTier.enterprise);
      });
    });

    describe('Pro user tier access', () => {
      it('should allow pro user to use pro model', async () => {
        const response = await request(app)
          .post('/v1/chat/completions')
          .set('Authorization', `Bearer ${proUserToken}`)
          .send({
            model: 'claude-3.5-sonnet', // Pro tier model
            ...validChatRequest,
          })
          .expect(200);

        expect(response.body.model).toBe('claude-3.5-sonnet');
        expect(response.body.choices).toBeDefined();
      });

      it('should deny pro user access to enterprise model', async () => {
        const response = await request(app)
          .post('/v1/chat/completions')
          .set('Authorization', `Bearer ${proUserToken}`)
          .send({
            model: 'gpt-5', // Enterprise tier model
            ...validChatRequest,
          })
          .expect(403);

        expect(response.body.code).toBe('model_access_restricted');
        expect(response.body.details.required_tier).toBe(SubscriptionTier.enterprise);
      });
    });

    describe('Enterprise user tier access', () => {
      it('should allow enterprise user to use all models', async () => {
        const models = ['claude-3.5-sonnet', 'gemini-2.0-pro', 'gpt-5'];

        for (const model of models) {
          const response = await request(app)
            .post('/v1/chat/completions')
            .set('Authorization', `Bearer ${enterpriseUserToken}`)
            .send({
              model,
              ...validChatRequest,
            })
            .expect(200);

          expect(response.body.model).toBe(model);
        }
      });
    });

    describe('User without subscription', () => {
      it('should default to free tier and deny pro model access', async () => {
        const response = await request(app)
          .post('/v1/chat/completions')
          .set('Authorization', `Bearer ${noSubscriptionToken}`)
          .send({
            model: 'claude-3.5-sonnet', // Pro tier model
            ...validChatRequest,
          })
          .expect(403);

        expect(response.body.details.user_tier).toBe(SubscriptionTier.free);
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'claude-3.5-sonnet',
          ...validChatRequest,
        })
        .expect(401);
    });

    it('should validate model exists before tier check', async () => {
      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: 'non-existent-model',
          ...validChatRequest,
        })
        .expect(404);
    });
  });

  // ==========================================================================
  // POST /v1/completions - Tier validation on text completion
  // ==========================================================================

  describe('POST /v1/completions - Tier Access Validation', () => {
    const validCompletionRequest = {
      prompt: 'Once upon a time',
      max_tokens: 100,
      temperature: 0.7,
    };

    it('should deny free user access to pro model', async () => {
      const response = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: 'gemini-2.0-pro', // Pro tier model
          ...validCompletionRequest,
        })
        .expect(403);

      expect(response.body.code).toBe('model_access_restricted');
      expect(response.body.details).toMatchObject({
        model_id: 'gemini-2.0-pro',
        user_tier: SubscriptionTier.free,
        required_tier: SubscriptionTier.pro,
      });
    });

    it('should allow pro user to use pro model', async () => {
      const response = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          model: 'gemini-2.0-pro',
          ...validCompletionRequest,
        })
        .expect(200);

      expect(response.body.model).toBe('gemini-2.0-pro');
    });

    it('should deny pro user access to enterprise model', async () => {
      const response = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          model: 'gpt-5', // Enterprise tier model
          ...validCompletionRequest,
        })
        .expect(403);

      expect(response.body.details.required_tier).toBe(SubscriptionTier.enterprise);
    });

    it('should allow enterprise user to use all models', async () => {
      const response = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${enterpriseUserToken}`)
        .send({
          model: 'gpt-5',
          ...validCompletionRequest,
        })
        .expect(200);

      expect(response.body.model).toBe('gpt-5');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/v1/completions')
        .send({
          model: 'gpt-5',
          ...validCompletionRequest,
        })
        .expect(401);
    });
  });

  // ==========================================================================
  // Error Response Format Validation
  // ==========================================================================

  describe('403 Error Response Format', () => {
    it('should return standardized 403 error format', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Test' }],
        })
        .expect(403);

      // Verify error structure
      expect(response.body).toMatchObject({
        status: 'error',
        code: 'model_access_restricted',
        message: expect.stringContaining('tier'),
        details: {
          model_id: 'gpt-5',
          user_tier: SubscriptionTier.free,
          required_tier: SubscriptionTier.enterprise,
          upgrade_url: expect.any(String),
        },
        timestamp: expect.any(String),
      });

      // Verify message is user-friendly
      expect(response.body.message).toMatch(/upgrade|tier|required/i);

      // Verify upgrade URL is valid
      expect(response.body.details.upgrade_url).toMatch(/upgrade|subscription/i);
    });

    it('should include correct timestamp in ISO format', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          model: 'claude-3.5-sonnet',
          messages: [{ role: 'user', content: 'Test' }],
        })
        .expect(403);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ==========================================================================
  // Backward Compatibility
  // ==========================================================================

  describe('Backward Compatibility', () => {
    it('should not break existing model queries without tier context', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      // Should still return all models (not filtered by tier)
      expect(response.body.models.length).toBeGreaterThan(0);

      // Should include both accessible and restricted models
      const hasRestrictedModels = response.body.models.some(
        (m: any) => m.access_status === 'upgrade_required'
      );
      expect(hasRestrictedModels).toBe(true);
    });

    it('should handle models with default tier configuration', async () => {
      // Assuming some models have default tier = free, mode = minimum
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      const freeModels = response.body.models.filter(
        (m: any) => m.required_tier === SubscriptionTier.free
      );

      expect(freeModels.length).toBeGreaterThan(0);
      freeModels.forEach((model: any) => {
        expect(model.access_status).toBe('allowed');
      });
    });
  });
});
