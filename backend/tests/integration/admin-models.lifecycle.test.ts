/**
 * Admin Models API - Integration Tests
 *
 * Tests for administrative model lifecycle endpoints:
 * - POST /admin/models - Create model
 * - POST /admin/models/:id/mark-legacy - Mark as legacy
 * - POST /admin/models/:id/unmark-legacy - Remove legacy status
 * - POST /admin/models/:id/archive - Archive model
 * - POST /admin/models/:id/unarchive - Restore model
 * - PATCH /admin/models/:id/meta - Update metadata
 * - GET /admin/models/legacy - List legacy models
 * - GET /admin/models/archived - List archived models
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
import { PrismaClient, SubscriptionTier } from '@prisma/client';
import { app } from '../../src/app';
import {
  getTestDatabase,
  cleanDatabase,
  seedTestData,
} from '../setup/database';
import { createTestUser } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Admin Models API - Lifecycle Management', () => {
  let prisma: PrismaClient;
  let adminToken: string;
  let adminUserId: string;
  let userToken: string;
  let userId: string;

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
    ]);

    // Create regular user
    const regularUser = await createTestUser(prisma, {
      email: 'user@test.com',
      role: 'user',
    });
    userId = regularUser.id;
    userToken = await generateTestAccessToken(regularUser);
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
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // ==========================================================================
  // POST /admin/models - Create Model
  // ==========================================================================

  describe('POST /admin/models', () => {
    it('should create model with 201 status', async () => {
      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'gpt-6-turbo',
          name: 'gpt-6-turbo',
          provider: 'openai',
          meta: {
            displayName: 'GPT-6 Turbo',
            description: 'Latest turbo model',
            version: '1.0',
            capabilities: ['text', 'vision'],
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
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('gpt-6-turbo');
      expect(response.body.data.display_name).toBe('GPT-6 Turbo');

      // Verify in database
      const dbModel = await prisma.model.findUnique({
        where: { id: 'gpt-6-turbo' },
      });
      expect(dbModel).toBeDefined();
      expect(dbModel?.isAvailable).toBe(true);
      expect(dbModel?.isLegacy).toBe(false);
      expect(dbModel?.isArchived).toBe(false);
    });

    it('should return created model with JSONB meta', async () => {
      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'test-jsonb-model',
          name: 'test-jsonb-model',
          provider: 'openai',
          meta: {
            displayName: 'Test JSONB',
            capabilities: ['text'],
            contextLength: 8000,
            inputCostPerMillionTokens: 500,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 2,
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free', 'pro'],
            providerMetadata: {
              openai: {
                modelFamily: 'test',
                trainingCutoff: '2025-01',
              },
            },
          },
        })
        .expect(201);

      expect(response.body.data.provider).toBe('openai');
      expect(response.body.data.context_length).toBe(8000);
    });

    it('should reject unauthenticated requests (401)', async () => {
      await request(app)
        .post('/admin/models')
        .send({
          id: 'test-model',
          name: 'test-model',
          provider: 'openai',
          meta: {},
        })
        .expect(401);
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'test-model',
          name: 'test-model',
          provider: 'openai',
          meta: {},
        })
        .expect(403);
    });

    it('should reject invalid meta (400)', async () => {
      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'invalid-model',
          name: 'invalid-model',
          provider: 'openai',
          meta: {
            displayName: 'Invalid',
            // Missing required fields
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject duplicate ID (409 or 400)', async () => {
      const response = await request(app)
        .post('/admin/models')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: 'gpt-5', // Already exists
          name: 'gpt-5',
          provider: 'openai',
          meta: {
            displayName: 'GPT-5 Duplicate',
            capabilities: ['text'],
            contextLength: 8000,
            inputCostPerMillionTokens: 500,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 2,
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free'],
          },
        })
        .expect((res) => {
          expect([400, 409]).toContain(res.status);
        });

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /admin/models/:id/mark-legacy
  // ==========================================================================

  describe('POST /admin/models/:id/mark-legacy', () => {
    it('should mark model as legacy with 200 status', async () => {
      const response = await request(app)
        .post('/admin/models/gpt-5/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          replacementModelId: 'gemini-2.0-pro',
          deprecationNotice: 'GPT-5 is deprecated. Use Gemini 2.0 Pro.',
          sunsetDate: '2025-12-31T23:59:59Z',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('marked as legacy');

      // Verify in database
      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });
      expect(model?.isLegacy).toBe(true);
    });

    it('should update meta with replacement info', async () => {
      await request(app)
        .post('/admin/models/gpt-5/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          replacementModelId: 'gemini-2.0-pro',
          deprecationNotice: 'Use Gemini instead',
        })
        .expect(200);

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
        select: { meta: true },
      });

      const meta = model?.meta as any;
      expect(meta.legacyReplacementModelId).toBe('gemini-2.0-pro');
      expect(meta.deprecationNotice).toBe('Use Gemini instead');
    });

    it('should reject non-existent model (404)', async () => {
      await request(app)
        .post('/admin/models/non-existent-model/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deprecationNotice: 'Test',
        })
        .expect(404);
    });

    it('should reject invalid replacement model (400 or 404)', async () => {
      const response = await request(app)
        .post('/admin/models/gpt-5/mark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          replacementModelId: 'invalid-replacement',
        })
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });

      expect(response.body.error).toBeDefined();
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .post('/admin/models/gpt-5/mark-legacy')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          deprecationNotice: 'Test',
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // POST /admin/models/:id/unmark-legacy
  // ==========================================================================

  describe('POST /admin/models/:id/unmark-legacy', () => {
    beforeEach(async () => {
      // Mark gpt-5 as legacy first
      await prisma.model.update({
        where: { id: 'gpt-5' },
        data: {
          isLegacy: true,
          meta: {
            ...(await prisma.model.findUnique({ where: { id: 'gpt-5' } }))
              ?.meta,
            legacyReplacementModelId: 'gemini-2.0-pro',
          },
        },
      });
    });

    it('should remove legacy status with 200 status', async () => {
      const response = await request(app)
        .post('/admin/models/gpt-5/unmark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('unmarked as legacy');

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });
      expect(model?.isLegacy).toBe(false);
    });

    it('should reject non-existent model (404)', async () => {
      await request(app)
        .post('/admin/models/non-existent-model/unmark-legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .post('/admin/models/gpt-5/unmark-legacy')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // POST /admin/models/:id/archive
  // ==========================================================================

  describe('POST /admin/models/:id/archive', () => {
    it('should archive model with 200 status', async () => {
      const response = await request(app)
        .post('/admin/models/gpt-5/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Model superseded by newer version',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('archived');
    });

    it('should set isArchived=true, isAvailable=false', async () => {
      await request(app)
        .post('/admin/models/gpt-5/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test archive',
        })
        .expect(200);

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });
      expect(model?.isArchived).toBe(true);
      expect(model?.isAvailable).toBe(false);
    });

    it('should reject non-existent model (404)', async () => {
      await request(app)
        .post('/admin/models/non-existent-model/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test',
        })
        .expect(404);
    });

    it('should reject missing reason (400)', async () => {
      await request(app)
        .post('/admin/models/gpt-5/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .post('/admin/models/gpt-5/archive')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Test',
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // POST /admin/models/:id/unarchive
  // ==========================================================================

  describe('POST /admin/models/:id/unarchive', () => {
    beforeEach(async () => {
      // Archive gpt-5 first
      await prisma.model.update({
        where: { id: 'gpt-5' },
        data: {
          isArchived: true,
          isAvailable: false,
        },
      });
    });

    it('should restore archived model with 200 status', async () => {
      const response = await request(app)
        .post('/admin/models/gpt-5/unarchive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('unarchived');

      const model = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
      });
      expect(model?.isArchived).toBe(false);
      expect(model?.isAvailable).toBe(true);
    });

    it('should reject non-existent model (404)', async () => {
      await request(app)
        .post('/admin/models/non-existent-model/unarchive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .post('/admin/models/gpt-5/unarchive')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // PATCH /admin/models/:id/meta
  // ==========================================================================

  describe('PATCH /admin/models/:id/meta', () => {
    it('should update meta fields with 200 status', async () => {
      const response = await request(app)
        .patch('/admin/models/gpt-5/meta')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'GPT-5 Updated',
          description: 'Updated description',
          creditsPer1kTokens: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('metadata updated');
    });

    it('should merge with existing meta', async () => {
      const originalModel = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
        select: { meta: true },
      });

      await request(app)
        .patch('/admin/models/gpt-5/meta')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          creditsPer1kTokens: 15,
        })
        .expect(200);

      const updatedModel = await prisma.model.findUnique({
        where: { id: 'gpt-5' },
        select: { meta: true },
      });

      const originalMeta = originalModel?.meta as any;
      const updatedMeta = updatedModel?.meta as any;

      expect(updatedMeta.creditsPer1kTokens).toBe(15);
      expect(updatedMeta.displayName).toBe(originalMeta.displayName);
      expect(updatedMeta.capabilities).toEqual(originalMeta.capabilities);
    });

    it('should reject invalid meta (400)', async () => {
      await request(app)
        .patch('/admin/models/gpt-5/meta')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contextLength: -1000, // Invalid negative
        })
        .expect(400);
    });

    it('should reject non-existent model (404)', async () => {
      await request(app)
        .patch('/admin/models/non-existent-model/meta')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayName: 'Test',
        })
        .expect(404);
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .patch('/admin/models/gpt-5/meta')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          displayName: 'Test',
        })
        .expect(403);
    });
  });

  // ==========================================================================
  // GET /admin/models/legacy
  // ==========================================================================

  describe('GET /admin/models/legacy', () => {
    beforeEach(async () => {
      // Mark some models as legacy
      await prisma.model.updateMany({
        where: { id: { in: ['gpt-5', 'claude-3.5-sonnet'] } },
        data: { isLegacy: true },
      });
    });

    it('should return only legacy models', async () => {
      const response = await request(app)
        .get('/admin/models/legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.models).toHaveLength(2);

      const modelIds = response.body.data.models.map((m: any) => m.id);
      expect(modelIds).toContain('gpt-5');
      expect(modelIds).toContain('claude-3.5-sonnet');
    });

    it('should include replacement info', async () => {
      // Add replacement info
      await prisma.model.update({
        where: { id: 'gpt-5' },
        data: {
          meta: {
            ...(await prisma.model.findUnique({ where: { id: 'gpt-5' } }))
              ?.meta,
            legacyReplacementModelId: 'gemini-2.0-pro',
          },
        },
      });

      const response = await request(app)
        .get('/admin/models/legacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const gpt5 = response.body.data.models.find((m: any) => m.id === 'gpt-5');
      expect(gpt5.is_legacy).toBe(true);
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .get('/admin/models/legacy')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // GET /admin/models/archived
  // ==========================================================================

  describe('GET /admin/models/archived', () => {
    beforeEach(async () => {
      // Archive some models
      await prisma.model.updateMany({
        where: { id: { in: ['gpt-5', 'gemini-2.0-pro'] } },
        data: {
          isArchived: true,
          isAvailable: false,
        },
      });
    });

    it('should return only archived models', async () => {
      const response = await request(app)
        .get('/admin/models/archived')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.models).toHaveLength(2);

      const modelIds = response.body.data.models.map((m: any) => m.id);
      expect(modelIds).toContain('gpt-5');
      expect(modelIds).toContain('gemini-2.0-pro');
    });

    it('should reject non-admin users (403)', async () => {
      await request(app)
        .get('/admin/models/archived')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
