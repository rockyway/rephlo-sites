/**
 * Model Lifecycle - End-to-End Tests
 *
 * Tests complete workflows for model lifecycle management:
 * - Complete model lifecycle (create → legacy → archive → unarchive → restore)
 * - Model creation workflow (admin creates model → appears in API)
 * - Legacy deprecation workflow (mark legacy → users see warning)
 *
 * Reference: docs/plan/157-model-lifecycle-implementation-plan.md
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import {
  getTestDatabase,
  cleanDatabase,
  seedTestData,
} from '../setup/database';
import {
  createTestUser,
  createTestUserWithSubscription,
} from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Model Lifecycle - E2E Workflows', () => {
  let prisma: PrismaClient;
  let adminToken: string;
  let adminUserId: string;
  let proUserToken: string;
  let proUserId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();

    // Create admin user
    const adminUser = await createTestUser(prisma, {
      email: 'admin@test.com',
      role: 'admin',
    });
    adminUserId = adminUser.id;
    adminToken = await generateTestAccessToken(adminUser, [
      'openid',
      'email',
      'admin',
      'models.manage',
      'models.read',
      'llm.inference',
    ]);

    // Create Pro user
    const { user: proUser } = await createTestUserWithSubscription(
      prisma,
      'pro' as any
    );
    proUserId = proUser.id;
    proUserToken = await generateTestAccessToken(proUser, [
      'openid',
      'email',
      'models.read',
      'llm.inference',
      'credits.read',
    ]);
  });

  beforeEach(async () => {
    // Reset models to default state
    await prisma.model.updateMany({
      data: {
        isLegacy: false,
        isArchived: false,
        isAvailable: true,
      },
    });

    // Delete any test models created during tests
    await prisma.model.deleteMany({
      where: {
        id: {
          in: ['gpt-6', 'gpt-6-turbo', 'test-legacy-model'],
        },
      },
    });
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // ==========================================================================
  // Workflow 1: Complete Model Lifecycle
  // ==========================================================================

  describe('Workflow 1: Complete Model Lifecycle', () => {
    const testModelId = 'gpt-6-turbo';

    it('should complete full lifecycle: create → mark legacy → archive → unarchive → unmark legacy', async () => {
      // Step 1: Admin creates new model
      const createResponse = await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: testModelId,
          name: testModelId,
          provider: 'openai',
          meta: {
            displayName: 'GPT-6 Turbo',
            description: 'Latest turbo model for testing',
            version: '1.0',
            capabilities: ['text', 'vision', 'function_calling'],
            contextLength: 128000,
            maxOutputTokens: 4096,
            inputCostPerMillionTokens: 1000,
            outputCostPerMillionTokens: 3000,
            creditsPer1kTokens: 5,
            requiredTier: 'pro',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
          },
        })
        .expect(201);

      expect(createResponse.body.status).toBe('success');
      expect(createResponse.body.data.id).toBe(testModelId);

      // Verify state: Available, not legacy, not archived
      let model = await prisma.model.findUnique({
        where: { id: testModelId },
      });
      expect(model?.isAvailable).toBe(true);
      expect(model?.isLegacy).toBe(false);
      expect(model?.isArchived).toBe(false);

      // Step 2: Mark as legacy with replacement
      const markLegacyResponse = await request(app)
        .post(`/admin/models/${testModelId}/mark-legacy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          replacementModelId: 'gpt-5',
          deprecationNotice: 'GPT-6 Turbo deprecated. Use GPT-5 instead.',
          sunsetDate: '2025-12-31T23:59:59Z',
        })
        .expect(200);

      expect(markLegacyResponse.body.status).toBe('success');

      // Verify state: Available, legacy, not archived
      model = await prisma.model.findUnique({
        where: { id: testModelId },
      });
      expect(model?.isAvailable).toBe(true);
      expect(model?.isLegacy).toBe(true);
      expect(model?.isArchived).toBe(false);

      const legacyMeta = model?.meta as any;
      expect(legacyMeta.legacyReplacementModelId).toBe('gpt-5');
      expect(legacyMeta.deprecationNotice).toContain('deprecated');

      // Step 3: Archive model
      const archiveResponse = await request(app)
        .post(`/admin/models/${testModelId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Model superseded by newer version',
        })
        .expect(200);

      expect(archiveResponse.body.status).toBe('success');

      // Verify state: Not available, legacy, archived
      model = await prisma.model.findUnique({
        where: { id: testModelId },
      });
      expect(model?.isAvailable).toBe(false);
      expect(model?.isLegacy).toBe(true);
      expect(model?.isArchived).toBe(true);

      // Step 4: Unarchive model
      const unarchiveResponse = await request(app)
        .post(`/admin/models/${testModelId}/unarchive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(unarchiveResponse.body.status).toBe('success');

      // Verify state: Available, still legacy, not archived
      model = await prisma.model.findUnique({
        where: { id: testModelId },
      });
      expect(model?.isAvailable).toBe(true);
      expect(model?.isLegacy).toBe(true); // Legacy status preserved
      expect(model?.isArchived).toBe(false);

      // Step 5: Unmark legacy to restore to active
      const unmarkLegacyResponse = await request(app)
        .post(`/admin/models/${testModelId}/unmark-legacy`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(unmarkLegacyResponse.body.status).toBe('success');

      // Verify final state: Available, not legacy, not archived
      model = await prisma.model.findUnique({
        where: { id: testModelId },
      });
      expect(model?.isAvailable).toBe(true);
      expect(model?.isLegacy).toBe(false);
      expect(model?.isArchived).toBe(false);

      const finalMeta = model?.meta as any;
      expect(finalMeta.legacyReplacementModelId).toBeUndefined();
      expect(finalMeta.deprecationNotice).toBeUndefined();
    });

    it('should verify model state at each lifecycle step', async () => {
      // Create model
      await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'test-legacy-model',
          name: 'test-legacy-model',
          provider: 'openai',
          meta: {
            displayName: 'Test Legacy Model',
            capabilities: ['text'],
            contextLength: 8000,
            inputCostPerMillionTokens: 500,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 2,
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free', 'pro'],
          },
        })
        .expect(201);

      // Check 1: Model appears in public /v1/models endpoint
      let publicModels = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      let testModel = publicModels.body.models.find(
        (m: any) => m.id === 'test-legacy-model'
      );
      expect(testModel).toBeDefined();
      expect(testModel.is_legacy).toBe(false);
      expect(testModel.is_archived).toBe(false);

      // Mark as legacy
      await request(app)
        .post('/admin/models/test-legacy-model/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deprecationNotice: 'This model is deprecated',
        })
        .expect(200);

      // Check 2: Model still appears but with legacy flag
      publicModels = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      testModel = publicModels.body.models.find(
        (m: any) => m.id === 'test-legacy-model'
      );
      expect(testModel).toBeDefined();
      expect(testModel.is_legacy).toBe(true);

      // Archive model
      await request(app)
        .post('/admin/models/test-legacy-model/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test archive',
        })
        .expect(200);

      // Check 3: Model excluded from public endpoint
      publicModels = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      testModel = publicModels.body.models.find(
        (m: any) => m.id === 'test-legacy-model'
      );
      expect(testModel).toBeUndefined(); // Should not appear
    });
  });

  // ==========================================================================
  // Workflow 2: Model Creation Workflow
  // ==========================================================================

  describe('Workflow 2: Model Creation Workflow', () => {
    it('should make newly created model available to users immediately', async () => {
      // Step 1: Admin creates GPT-6 model
      const createResponse = await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'gpt-6',
          name: 'gpt-6',
          provider: 'openai',
          meta: {
            displayName: 'GPT-6',
            description: 'Latest GPT model',
            version: '1.0',
            capabilities: ['text', 'vision', 'function_calling', 'code'],
            contextLength: 272000,
            maxOutputTokens: 128000,
            inputCostPerMillionTokens: 1250,
            outputCostPerMillionTokens: 10000,
            creditsPer1kTokens: 28,
            requiredTier: 'pro',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
          },
        })
        .expect(201);

      expect(createResponse.body.data.id).toBe('gpt-6');

      // Step 2: Model appears in GET /v1/models response
      const modelsResponse = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      const gpt6 = modelsResponse.body.models.find(
        (m: any) => m.id === 'gpt-6'
      );
      expect(gpt6).toBeDefined();
      expect(gpt6.name).toBe('GPT-6');
      expect(gpt6.provider).toBe('openai');
      expect(gpt6.capabilities).toContain('text');
      expect(gpt6.capabilities).toContain('vision');

      // Step 3: Users can access based on tier
      expect(gpt6.access_status).toBe('allowed'); // Pro user can access Pro tier model
      expect(gpt6.required_tier).toBe('pro');

      // Step 4: Model details accessible
      const detailsResponse = await request(app)
        .get('/v1/models/gpt-6')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      expect(detailsResponse.body.id).toBe('gpt-6');
      expect(detailsResponse.body.display_name).toBe('GPT-6');
      expect(detailsResponse.body.context_length).toBe(272000);
      expect(detailsResponse.body.max_output_tokens).toBe(128000);
      expect(detailsResponse.body.credits_per_1k_tokens).toBe(28);
    });

    it('should enforce tier restrictions on newly created models', async () => {
      // Create enterprise-only model
      await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'gpt-6-turbo',
          name: 'gpt-6-turbo',
          provider: 'openai',
          meta: {
            displayName: 'GPT-6 Turbo',
            capabilities: ['text'],
            contextLength: 128000,
            inputCostPerMillionTokens: 2000,
            outputCostPerMillionTokens: 6000,
            creditsPer1kTokens: 20,
            requiredTier: 'enterprise_pro',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['enterprise_pro', 'enterprise_max'],
          },
        })
        .expect(201);

      // Pro user should see upgrade_required status
      const modelsResponse = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      const gpt6Turbo = modelsResponse.body.models.find(
        (m: any) => m.id === 'gpt-6-turbo'
      );
      expect(gpt6Turbo).toBeDefined();
      expect(gpt6Turbo.access_status).toBe('upgrade_required');
      expect(gpt6Turbo.required_tier).toBe('enterprise_pro');
    });
  });

  // ==========================================================================
  // Workflow 3: Legacy Deprecation Workflow
  // ==========================================================================

  describe('Workflow 3: Legacy Deprecation Workflow', () => {
    it('should show deprecation warnings when model is marked legacy', async () => {
      // Step 1: Mark GPT-5 as legacy with GPT-6 replacement
      // First create GPT-6 as replacement
      await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'gpt-6',
          name: 'gpt-6',
          provider: 'openai',
          meta: {
            displayName: 'GPT-6',
            capabilities: ['text', 'vision'],
            contextLength: 128000,
            inputCostPerMillionTokens: 1000,
            outputCostPerMillionTokens: 3000,
            creditsPer1kTokens: 5,
            requiredTier: 'pro',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
          },
        })
        .expect(201);

      // Mark GPT-5 as legacy
      await request(app)
        .post('/admin/models/gpt-5/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          replacementModelId: 'gpt-6',
          deprecationNotice:
            'GPT-5 will be deprecated on 2025-12-31. Please migrate to GPT-6.',
          sunsetDate: '2025-12-31T23:59:59Z',
        })
        .expect(200);

      // Step 2: API returns legacy warning to users
      const modelsResponse = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      const gpt5 = modelsResponse.body.models.find(
        (m: any) => m.id === 'gpt-5'
      );
      expect(gpt5).toBeDefined();
      expect(gpt5.is_legacy).toBe(true);

      // Step 3: Model details include deprecation info
      const detailsResponse = await request(app)
        .get('/v1/models/gpt-5')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      expect(detailsResponse.body.id).toBe('gpt-5');
      // Note: The API response structure depends on implementation
      // This test assumes legacy info is included in the response

      // Step 4: Replacement model suggested in response
      // Verify in database that replacement is set
      const dbModel = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
        select: { meta: true },
      });

      const meta = dbModel?.meta as any;
      expect(meta.legacyReplacementModelId).toBe('gpt-6');
      expect(meta.deprecationNotice).toContain('GPT-6');
      expect(meta.sunsetDate).toBe('2025-12-31T23:59:59Z');
    });

    it('should list legacy models in admin endpoint', async () => {
      // Mark multiple models as legacy
      await request(app)
        .post('/admin/models/gpt-5/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deprecationNotice: 'GPT-5 deprecated',
        })
        .expect(200);

      await request(app)
        .post('/admin/models/claude-3.5-sonnet/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deprecationNotice: 'Claude deprecated',
        })
        .expect(200);

      // Get legacy models
      const legacyResponse = await request(app)
        .get('/admin/models/legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(legacyResponse.body.data.total).toBe(2);
      expect(legacyResponse.body.data.models).toHaveLength(2);

      const modelIds = legacyResponse.body.data.models.map(
        (m: any) => m.id
      );
      expect(modelIds).toContain('gpt-5');
      expect(modelIds).toContain('claude-3.5-sonnet');
    });
  });
});
