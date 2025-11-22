/**
 * Integration Tests: Model API with Separate Input/Output Pricing
 *
 * Tests the model endpoints to ensure separate input/output pricing is correctly
 * exposed and calculated for all model operations.
 *
 * Test Coverage:
 * - GET /v1/models returns models with separate pricing fields
 * - POST /admin/models auto-calculates inputCreditsPerK and outputCreditsPerK
 * - PATCH /admin/models/:id/meta recalculates separate credits when pricing changes
 * - Backward compatibility (creditsPer1kTokens still present)
 * - Validation ensures credits are positive integers
 *
 * Reference: Phase 7 - Testing for Separate Input/Output Pricing
 */

import 'reflect-metadata';
import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../app';
import { container } from '../../container';
import { PrismaClient } from '@prisma/client';
import { ModelMeta } from '../../types/model-meta';
import { randomUUID } from 'crypto';

describe('Model API - Separate Input/Output Pricing Integration Tests', () => {
  let app: Application;
  let prisma: PrismaClient;
  let adminToken: string;
  let userToken: string;
  let testProviderId: string;
  let testModelId: string;
  let adminUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = container.resolve<PrismaClient>('PrismaClient');

    // Create test provider
    const provider = await prisma.providers.create({
      data: {
        name: 'test-provider',
        api_type: 'rest',
        updated_at: new Date(),
      },
    });
    testProviderId = provider.id;

    // Generate UUIDs for test users
    adminUserId = randomUUID();
    regularUserId = randomUUID();

    // Create test user (admin)
    const adminUser = await prisma.users.create({
      data: {
        id: adminUserId,
        email: 'admin-model-api@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
      },
    });

    // Create test user (regular)
    const regularUser = await prisma.users.create({
      data: {
        id: regularUserId,
        email: 'user-model-api@example.com',
        password_hash: 'hashed_password',
        role: 'user',
      },
    });

    // Mock auth tokens
    adminToken = 'Bearer mock-admin-token';
    userToken = 'Bearer mock-user-token';

    // Mock authentication middleware
    jest.mock('../../middleware/auth.middleware', () => ({
      authMiddleware: (req: any, _res: any, next: any) => {
        const token = req.headers.authorization;
        if (token === adminToken) {
          req.user = { sub: adminUser.id, role: 'admin' };
        } else if (token === userToken) {
          req.user = { sub: regularUser.id, role: 'user' };
        }
        next();
      },
      requireScope: () => (_req: any, _res: any, next: any) => next(),
      getUserId: (req: any) => req.user?.sub,
      getUserTier: async (_userId: string) => 'pro',
    }));
  });

  afterAll(async () => {
    // Cleanup test data
    if (testModelId) {
      await prisma.models.deleteMany({ where: { id: testModelId } });
    }
    if (adminUserId && regularUserId) {
      await prisma.users.deleteMany({
        where: {
          id: { in: [adminUserId, regularUserId] },
        },
      });
    }
    if (testProviderId) {
      await prisma.providers.delete({ where: { id: testProviderId } });
    }
    await prisma.$disconnect();
  });

  // ===========================================================================
  // Test Suite 1: GET /v1/models - List Models with Separate Pricing
  // ===========================================================================

  describe('GET /v1/models - List Models', () => {
    beforeAll(async () => {
      // Create test model with separate pricing
      const modelMeta: ModelMeta = {
        displayName: 'Test GPT-4',
        description: 'Test model with separate pricing',
        capabilities: ['text', 'function_calling'],
        contextLength: 8000,
        maxOutputTokens: 4000,
        inputCostPerMillionTokens: 3000, // $0.003 per 1k tokens = $3 per million
        outputCostPerMillionTokens: 6000, // $0.006 per 1k tokens = $6 per million
        inputCreditsPerK: 15, // Calculated from inputCostPerMillionTokens
        outputCreditsPerK: 30, // Calculated from outputCostPerMillionTokens
        creditsPer1kTokens: 20, // DEPRECATED: Average for backward compat
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
      };

      const model = await prisma.models.create({
        data: {
          id: 'test-gpt-4-separate-pricing',
          name: 'test-gpt-4',
          provider: 'test-provider',
          is_available: true,
          is_archived: false,
          updated_at: new Date(),
          meta: modelMeta as any,
        },
      });
      testModelId = model.id;
    });

    it('should return models with separate pricing fields', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', userToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);

      // Find our test model
      const testModel = response.body.models.find(
        (m: any) => m.id === testModelId
      );
      expect(testModel).toBeDefined();
    });

    it('should include inputCreditsPerK and outputCreditsPerK in model response', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', userToken);

      const testModel = response.body.models.find(
        (m: any) => m.id === testModelId
      );

      expect(testModel).toHaveProperty('meta');
      expect(testModel.meta).toHaveProperty('inputCreditsPerK');
      expect(testModel.meta).toHaveProperty('outputCreditsPerK');
      expect(testModel.meta.inputCreditsPerK).toBe(15);
      expect(testModel.meta.outputCreditsPerK).toBe(30);
    });

    it('should maintain backward compatibility with creditsPer1kTokens', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', userToken);

      const testModel = response.body.models.find(
        (m: any) => m.id === testModelId
      );

      expect(testModel.meta).toHaveProperty('creditsPer1kTokens');
      expect(testModel.meta.creditsPer1kTokens).toBe(20);
    });

    it('should validate separate credits are positive integers', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', userToken);

      const testModel = response.body.models.find(
        (m: any) => m.id === testModelId
      );

      expect(testModel.meta.inputCreditsPerK).toBeGreaterThan(0);
      expect(testModel.meta.outputCreditsPerK).toBeGreaterThan(0);
      expect(Number.isInteger(testModel.meta.inputCreditsPerK)).toBe(true);
      expect(Number.isInteger(testModel.meta.outputCreditsPerK)).toBe(true);
    });
  });

  // ===========================================================================
  // Test Suite 2: GET /v1/models/:modelId - Model Details
  // ===========================================================================

  describe('GET /v1/models/:modelId - Model Details', () => {
    it('should return model details with separate pricing', async () => {
      const response = await request(app)
        .get(`/v1/models/${testModelId}`)
        .set('Authorization', userToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testModelId);
      expect(response.body).toHaveProperty('meta');
    });

    it('should include all pricing fields in model details', async () => {
      const response = await request(app)
        .get(`/v1/models/${testModelId}`)
        .set('Authorization', userToken);

      const { meta } = response.body;
      expect(meta).toHaveProperty('inputCostPerMillionTokens');
      expect(meta).toHaveProperty('outputCostPerMillionTokens');
      expect(meta).toHaveProperty('inputCreditsPerK');
      expect(meta).toHaveProperty('outputCreditsPerK');
      expect(meta).toHaveProperty('creditsPer1kTokens'); // Backward compat
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get('/v1/models/non-existent-model')
        .set('Authorization', userToken);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================================================
  // Test Suite 3: POST /admin/models - Create Model with Auto-Calculation
  // ===========================================================================

  describe('POST /admin/models - Create Model', () => {
    let createdModelId: string;

    afterEach(async () => {
      // Clean up created models
      if (createdModelId) {
        await prisma.models.deleteMany({ where: { id: createdModelId } });
        createdModelId = '';
      }
    });

    it('should auto-calculate inputCreditsPerK and outputCreditsPerK from cost fields', async () => {
      const newModel = {
        id: 'auto-calc-model-test',
        name: 'auto-calc-gpt-3.5',
        providerId: testProviderId,
        meta: {
          displayName: 'Auto Calc GPT-3.5',
          description: 'Test auto-calculation',
          capabilities: ['text'],
          contextLength: 4000,
          inputCostPerMillionTokens: 1500, // $1.50 per million
          outputCostPerMillionTokens: 2000, // $2.00 per million
          requiredTier: 'free',
          tierRestrictionMode: 'minimum',
          allowedTiers: ['free', 'pro', 'pro_max'],
        },
      };

      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', adminToken)
        .send(newModel);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      createdModelId = response.body.id;

      // Verify auto-calculated fields
      const model = await prisma.models.findUnique({
        where: { id: createdModelId },
      });

      expect(model).toBeDefined();
      const meta = model!.meta as any;
      expect(meta.inputCreditsPerK).toBeDefined();
      expect(meta.outputCreditsPerK).toBeDefined();
      expect(meta.inputCreditsPerK).toBeGreaterThan(0);
      expect(meta.outputCreditsPerK).toBeGreaterThan(0);
    });

    it('should validate pricing fields are positive', async () => {
      const invalidModel = {
        id: 'invalid-pricing-model',
        name: 'invalid-pricing',
        providerId: testProviderId,
        meta: {
          displayName: 'Invalid Pricing Model',
          capabilities: ['text'],
          contextLength: 4000,
          inputCostPerMillionTokens: -100, // INVALID: negative
          outputCostPerMillionTokens: 2000,
          requiredTier: 'free',
          tierRestrictionMode: 'minimum',
          allowedTiers: ['free'],
        },
      };

      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', adminToken)
        .send(invalidModel);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require admin role for model creation', async () => {
      const newModel = {
        id: 'no-permission-model',
        name: 'no-permission',
        providerId: testProviderId,
        meta: {
          displayName: 'No Permission Model',
          capabilities: ['text'],
          contextLength: 4000,
          inputCostPerMillionTokens: 1000,
          outputCostPerMillionTokens: 1500,
          requiredTier: 'free',
          tierRestrictionMode: 'minimum',
          allowedTiers: ['free'],
        },
      };

      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', userToken) // Regular user, not admin
        .send(newModel);

      expect(response.status).toBe(403);
    });
  });

  // ===========================================================================
  // Test Suite 4: PATCH /admin/models/:id/meta - Update Model Metadata
  // ===========================================================================

  describe('PATCH /admin/models/:id/meta - Update Model Metadata', () => {
    it('should recalculate separate credits when pricing changes', async () => {
      const updatePayload = {
        inputCostPerMillionTokens: 5000, // Changed from 3000
        outputCostPerMillionTokens: 10000, // Changed from 6000
      };

      const response = await request(app)
        .patch(`/admin/models/${testModelId}/meta`)
        .set('Authorization', adminToken)
        .send(updatePayload);

      expect(response.status).toBe(200);

      // Verify recalculated credits
      const model = await prisma.models.findUnique({
        where: { id: testModelId },
      });

      const meta = model!.meta as any;
      expect(meta.inputCreditsPerK).not.toBe(15); // Should be recalculated
      expect(meta.outputCreditsPerK).not.toBe(30); // Should be recalculated
      expect(meta.inputCostPerMillionTokens).toBe(5000);
      expect(meta.outputCostPerMillionTokens).toBe(10000);
    });

    it('should maintain creditsPer1kTokens for backward compatibility', async () => {
      const response = await request(app)
        .get(`/v1/models/${testModelId}`)
        .set('Authorization', userToken);

      expect(response.body.meta).toHaveProperty('creditsPer1kTokens');
      expect(typeof response.body.meta.creditsPer1kTokens).toBe('number');
    });

    it('should require admin role for metadata updates', async () => {
      const updatePayload = {
        inputCostPerMillionTokens: 4000,
      };

      const response = await request(app)
        .patch(`/admin/models/${testModelId}/meta`)
        .set('Authorization', userToken) // Regular user
        .send(updatePayload);

      expect(response.status).toBe(403);
    });
  });

  // ===========================================================================
  // Test Suite 5: Validation and Edge Cases
  // ===========================================================================

  describe('Validation and Edge Cases', () => {
    it('should handle models without separate pricing (legacy)', async () => {
      // Create legacy model without separate pricing
      const legacyMeta: ModelMeta = {
        displayName: 'Legacy Model',
        capabilities: ['text'],
        contextLength: 2000,
        inputCostPerMillionTokens: 1000,
        outputCostPerMillionTokens: 1000,
        creditsPer1kTokens: 10, // Only has old field
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free'],
      };

      const legacyModel = await prisma.models.create({
        data: {
          id: 'legacy-model-test',
          name: 'legacy-model',
          provider: 'test-provider',
          is_available: true,
          is_archived: false,
          updated_at: new Date(),
          meta: legacyMeta as any,
        },
      });

      const response = await request(app)
        .get(`/v1/models/${legacyModel.id}`)
        .set('Authorization', userToken);

      expect(response.status).toBe(200);
      expect(response.body.meta).toHaveProperty('creditsPer1kTokens');

      // Cleanup
      await prisma.models.delete({ where: { id: legacyModel.id } });
    });

    it('should validate separate credits are non-zero', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', userToken);

      const models = response.body.models.filter((m: any) =>
        m.meta.hasOwnProperty('inputCreditsPerK')
      );

      models.forEach((model: any) => {
        if (model.meta.inputCreditsPerK !== undefined) {
          expect(model.meta.inputCreditsPerK).toBeGreaterThan(0);
        }
        if (model.meta.outputCreditsPerK !== undefined) {
          expect(model.meta.outputCreditsPerK).toBeGreaterThan(0);
        }
      });
    });

    it('should return consistent pricing across different endpoints', async () => {
      // Get from list endpoint
      const listResponse = await request(app)
        .get('/v1/models')
        .set('Authorization', userToken);

      const modelFromList = listResponse.body.models.find(
        (m: any) => m.id === testModelId
      );

      // Get from detail endpoint
      const detailResponse = await request(app)
        .get(`/v1/models/${testModelId}`)
        .set('Authorization', userToken);

      // Pricing should match
      expect(modelFromList.meta.inputCreditsPerK).toBe(
        detailResponse.body.meta.inputCreditsPerK
      );
      expect(modelFromList.meta.outputCreditsPerK).toBe(
        detailResponse.body.meta.outputCreditsPerK
      );
      expect(modelFromList.meta.creditsPer1kTokens).toBe(
        detailResponse.body.meta.creditsPer1kTokens
      );
    });
  });
});
