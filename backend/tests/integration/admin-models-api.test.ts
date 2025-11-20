/**
 * Integration Tests for Admin Models API - Parameter Constraints
 *
 * Tests admin endpoints for managing model parameter constraints:
 * - GET /admin/models/:id/parameters - Get parameter constraints
 * - PUT /admin/models/:id/parameters - Update parameter constraints
 * - DELETE /admin/models/:id/parameters/:paramName - Remove constraint
 *
 * Reference: docs/plan/203-model-parameter-constraints-admin-configuration.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { createTestUser } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Admin Models API - Parameter Constraints', () => {
  let prisma: PrismaClient;
  let adminToken: string;
  let adminUserId: string;
  let userToken: string;
  let testModelId: string;

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

    // Create regular user (non-admin)
    const regularUser = await createTestUser(prisma, {
      email: 'user@test.com',
      role: 'user',
    });
    userToken = await generateTestAccessToken(regularUser);
  });

  beforeEach(async () => {
    // Create a test model with initial parameter constraints
    const testModel = await prisma.models.create({
      data: {
        id: `test-model-${Date.now()}`,
        name: 'Test Model',
        provider: 'openai',
        meta: {
          parameterConstraints: {
            temperature: {
              supported: true,
              min: 0,
              max: 2,
              default: 1.0,
            },
            max_tokens: {
              supported: true,
              min: 1,
              max: 4096,
              default: 1024,
            },
          },
        },
      },
    });
    testModelId = testModel.id;
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('GET /admin/models/:id/parameters', () => {
    it('should get parameter constraints for a model (200 OK)', async () => {
      const response = await request(app)
        .get(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        modelId: testModelId,
        modelName: 'Test Model',
        provider: 'openai',
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 2,
            default: 1.0,
          },
          max_tokens: {
            supported: true,
            min: 1,
            max: 4096,
            default: 1024,
          },
        },
      });
    });

    it('should return empty constraints for model without constraints', async () => {
      // Create model without parameter constraints
      const emptyModel = await prisma.models.create({
        data: {
          id: `empty-model-${Date.now()}`,
          name: 'Empty Model',
          provider: 'anthropic',
          meta: {},
        },
      });

      const response = await request(app)
        .get(`/admin/models/${emptyModel.id}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        modelId: emptyModel.id,
        modelName: 'Empty Model',
        provider: 'anthropic',
        parameterConstraints: {},
      });
    });

    it('should reject non-admin access (403 Forbidden)', async () => {
      const response = await request(app)
        .get(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Forbidden');
    });

    it('should reject invalid model ID (404 Not Found)', async () => {
      const response = await request(app)
        .get('/admin/models/non-existent-model/parameters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('not found');
    });

    it('should reject unauthenticated requests (401 Unauthorized)', async () => {
      await request(app)
        .get(`/admin/models/${testModelId}/parameters`)
        .expect(401);
    });
  });

  describe('PUT /admin/models/:id/parameters', () => {
    it('should update parameter constraints (200 OK)', async () => {
      const newConstraints = {
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 1.5,
            default: 0.7,
          },
          top_p: {
            supported: true,
            min: 0,
            max: 1,
            default: 0.9,
          },
          frequency_penalty: {
            supported: true,
            min: -2,
            max: 2,
            default: 0,
          },
        },
      };

      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newConstraints)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: 'Parameter constraints updated successfully',
        modelId: testModelId,
        parameterConstraints: newConstraints.parameterConstraints,
      });

      // Verify constraints were actually updated in database
      const updatedModel = await prisma.models.findUnique({
        where: { id: testModelId },
      });

      expect((updatedModel?.meta as any).parameterConstraints).toMatchObject(
        newConstraints.parameterConstraints
      );
    });

    it('should add allowed values constraint (GPT-5-mini pattern)', async () => {
      const constraintsWithAllowedValues = {
        parameterConstraints: {
          temperature: {
            supported: true,
            allowedValues: [1.0],
            default: 1.0,
          },
        },
      };

      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(constraintsWithAllowedValues)
        .expect(200);

      expect(response.body.parameterConstraints.temperature).toMatchObject({
        supported: true,
        allowedValues: [1.0],
        default: 1.0,
      });
    });

    it('should add mutually exclusive parameters (Claude pattern)', async () => {
      const mutuallyExclusiveConstraints = {
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 1,
            default: 1.0,
            mutuallyExclusiveWith: ['top_p'],
          },
          top_p: {
            supported: true,
            min: 0,
            max: 1,
            default: 1.0,
            mutuallyExclusiveWith: ['temperature'],
          },
        },
      };

      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mutuallyExclusiveConstraints)
        .expect(200);

      expect(
        response.body.parameterConstraints.temperature.mutuallyExclusiveWith
      ).toEqual(['top_p']);
      expect(response.body.parameterConstraints.top_p.mutuallyExclusiveWith).toEqual([
        'temperature',
      ]);
    });

    it('should add parameter transformation rules', async () => {
      const transformationConstraints = {
        parameterConstraints: {
          max_tokens: {
            supported: true,
            min: 1,
            max: 16384,
            default: 4096,
            transformTo: 'max_completion_tokens',
          },
        },
      };

      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(transformationConstraints)
        .expect(200);

      expect(response.body.parameterConstraints.max_tokens.transformTo).toBe(
        'max_completion_tokens'
      );
    });

    it('should preserve other meta fields when updating constraints', async () => {
      // Add some other meta fields first
      await prisma.models.update({
        where: { id: testModelId },
        data: {
          meta: {
            parameterConstraints: {
              temperature: { supported: true, min: 0, max: 2, default: 1 },
            },
            capabilities: {
              vision: true,
              streaming: true,
            },
            contextWindow: 128000,
          },
        },
      });

      const newConstraints = {
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 1,
            default: 0.7,
          },
        },
      };

      await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newConstraints)
        .expect(200);

      // Verify other meta fields are preserved
      const updatedModel = await prisma.models.findUnique({
        where: { id: testModelId },
      });

      expect((updatedModel?.meta as any).capabilities).toEqual({
        vision: true,
        streaming: true,
      });
      expect((updatedModel?.meta as any).contextWindow).toBe(128000);
    });

    it('should reject non-admin access (403 Forbidden)', async () => {
      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2 },
          },
        })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid model ID (404 Not Found)', async () => {
      const response = await request(app)
        .put('/admin/models/non-existent-model/parameters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          parameterConstraints: {
            temperature: { supported: true, min: 0, max: 2 },
          },
        })
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should reject invalid constraint format (422 Validation Error)', async () => {
      const invalidConstraints = {
        parameterConstraints: 'not-an-object', // Should be object
      };

      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConstraints)
        .expect(422);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should reject missing parameterConstraints field', async () => {
      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // Missing parameterConstraints
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('should create version history entry for constraint update', async () => {
      const newConstraints = {
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 1,
            default: 0.8,
          },
        },
      };

      await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newConstraints)
        .expect(200);

      // Check version history
      const historyEntry = await prisma.model_version_history.findFirst({
        where: {
          model_id: testModelId,
          change_type: 'update',
        },
        orderBy: {
          changed_at: 'desc',
        },
      });

      expect(historyEntry).toBeDefined();
      expect(historyEntry?.changed_by).toBe(adminUserId);
      expect((historyEntry?.new_state as any).parameterConstraints).toMatchObject(
        newConstraints.parameterConstraints
      );
    });
  });

  describe('DELETE /admin/models/:id/parameters/:paramName', () => {
    it('should delete a specific parameter constraint (200 OK)', async () => {
      const response = await request(app)
        .delete(`/admin/models/${testModelId}/parameters/max_tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: expect.stringContaining('removed'),
        modelId: testModelId,
        paramName: 'max_tokens',
      });

      // Verify constraint was removed
      const updatedModel = await prisma.models.findUnique({
        where: { id: testModelId },
      });

      expect((updatedModel?.meta as any).parameterConstraints.max_tokens).toBeUndefined();
      expect((updatedModel?.meta as any).parameterConstraints.temperature).toBeDefined(); // Other constraints remain
    });

    it('should reject deletion of non-existent parameter (404 Not Found)', async () => {
      const response = await request(app)
        .delete(`/admin/models/${testModelId}/parameters/non_existent_param`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should reject non-admin access (403 Forbidden)', async () => {
      const response = await request(app)
        .delete(`/admin/models/${testModelId}/parameters/temperature`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid model ID (404 Not Found)', async () => {
      const response = await request(app)
        .delete('/admin/models/non-existent-model/parameters/temperature')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should create version history entry for constraint deletion', async () => {
      await request(app)
        .delete(`/admin/models/${testModelId}/parameters/temperature`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check version history
      const historyEntry = await prisma.model_version_history.findFirst({
        where: {
          model_id: testModelId,
          change_type: 'delete',
        },
        orderBy: {
          changed_at: 'desc',
        },
      });

      expect(historyEntry).toBeDefined();
      expect(historyEntry?.changed_by).toBe(adminUserId);
      expect((historyEntry?.previous_state as any).temperature).toBeDefined();
    });
  });

  describe('Complex Constraint Scenarios', () => {
    it('should handle model with no constraints → add constraints', async () => {
      // Create model without constraints
      const emptyModel = await prisma.models.create({
        data: {
          id: `empty-model-${Date.now()}`,
          name: 'Empty Model',
          provider: 'google',
          meta: {},
        },
      });

      const constraints = {
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 2,
            default: 1.0,
          },
        },
      };

      const response = await request(app)
        .put(`/admin/models/${emptyModel.id}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(constraints)
        .expect(200);

      expect(response.body.parameterConstraints).toMatchObject(
        constraints.parameterConstraints
      );
    });

    it('should handle updating single constraint while preserving others', async () => {
      // Update only temperature, keep max_tokens unchanged
      const partialUpdate = {
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 1.5,
            default: 0.5,
          },
          max_tokens: {
            supported: true,
            min: 1,
            max: 4096,
            default: 1024,
          },
        },
      };

      await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200);

      const updatedModel = await prisma.models.findUnique({
        where: { id: testModelId },
      });

      expect((updatedModel?.meta as any).parameterConstraints.temperature.max).toBe(
        1.5
      );
      expect((updatedModel?.meta as any).parameterConstraints.max_tokens).toBeDefined();
    });

    it('should handle removing all constraints via empty object', async () => {
      const emptyConstraints = {
        parameterConstraints: {},
      };

      const response = await request(app)
        .put(`/admin/models/${testModelId}/parameters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emptyConstraints)
        .expect(200);

      expect(response.body.parameterConstraints).toEqual({});
    });
  });
});
