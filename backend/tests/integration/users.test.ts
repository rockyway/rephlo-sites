import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import type { Application } from 'express';
import { getTestDatabase, cleanDatabase } from '../setup/database';
import { createTestUser, createTestUserPreferences } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';

describe('Users API Integration Tests', () => {
  let prisma: PrismaClient;
  let app: Application;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();

    // Import app dynamically after prisma is ready
    const { createApp } = await import('../../src/app');
    app = await createApp(prisma);

    // Create test user and token
    const user = await createTestUser(prisma, {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });
    userId = user.id;
    authToken = await generateTestAccessToken(user);
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  // ===========================================================================
  // GET /v1/users/me
  // ===========================================================================

  describe('GET /v1/users/me', () => {
    it('should return authenticated user profile', async () => {
      const response = await request(app)
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
      });
      expect(response.body.createdAt).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/users/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // ===========================================================================
  // PATCH /v1/users/me
  // ===========================================================================

  describe('PATCH /v1/users/me', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.lastName).toBe('Name');
    });

    it('should update username', async () => {
      const response = await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newusername',
        })
        .expect(200);

      expect(response.body.username).toBe('newusername');
    });

    it('should reject duplicate username', async () => {
      // Create another user with a username
      const otherUser = await createTestUser(prisma, {
        username: 'takenusername',
      });

      await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'takenusername',
        })
        .expect(400);
    });

    it('should validate firstName length', async () => {
      await request(app)
        .patch('/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'A'.repeat(256),
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/v1/users/me')
        .send({ firstName: 'Test' })
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /v1/users/me/preferences
  // ===========================================================================

  describe('GET /v1/users/me/preferences', () => {
    it('should return user preferences', async () => {
      await createTestUserPreferences(prisma, userId, {
        enableStreaming: true,
        maxTokens: 2048,
        temperature: 0.8,
      });

      const response = await request(app)
        .get('/v1/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        enableStreaming: true,
        maxTokens: 2048,
        temperature: 0.8,
      });
    });

    it('should create default preferences if none exist', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      const response = await request(app)
        .get('/v1/users/me/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        enableStreaming: true,
        maxTokens: 4096,
        temperature: 0.7,
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/users/me/preferences')
        .expect(401);
    });
  });

  // ===========================================================================
  // PATCH /v1/users/me/preferences
  // ===========================================================================

  describe('PATCH /v1/users/me/preferences', () => {
    it('should update user preferences', async () => {
      const response = await request(app)
        .patch('/v1/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enableStreaming: false,
          maxTokens: 1024,
        })
        .expect(200);

      expect(response.body.enableStreaming).toBe(false);
      expect(response.body.maxTokens).toBe(1024);
    });

    it('should update temperature', async () => {
      const response = await request(app)
        .patch('/v1/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          temperature: 0.5,
        })
        .expect(200);

      expect(response.body.temperature).toBe(0.5);
    });

    it('should validate temperature range', async () => {
      await request(app)
        .patch('/v1/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          temperature: 2.5, // Out of range
        })
        .expect(400);
    });

    it('should validate maxTokens range', async () => {
      await request(app)
        .patch('/v1/users/me/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          maxTokens: 999999, // Too high
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/v1/users/me/preferences')
        .send({ maxTokens: 2048 })
        .expect(401);
    });
  });

  // ===========================================================================
  // POST /v1/users/me/preferences/model
  // ===========================================================================

  describe('POST /v1/users/me/preferences/model', () => {
    beforeAll(async () => {
      // Create test model
      await prisma.model.create({
        data: {
          id: 'test-model',
          displayName: 'Test Model',
          modelProvider: 'openai',
          creditsPerKToken: 2,
          contextWindow: 128000,
          capabilities: ['chat'],
          isAvailable: true,
        },
      });
    });

    it('should set default model', async () => {
      const response = await request(app)
        .post('/v1/users/me/preferences/model')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelId: 'test-model',
        })
        .expect(200);

      expect(response.body.defaultModelId).toBe('test-model');
      expect(response.body.model.id).toBe('test-model');
    });

    it('should reject non-existent model', async () => {
      await request(app)
        .post('/v1/users/me/preferences/model')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelId: 'non-existent',
        })
        .expect(404);
    });

    it('should reject unavailable model', async () => {
      await prisma.model.create({
        data: {
          id: 'unavailable-model',
          displayName: 'Unavailable',
          modelProvider: 'openai',
          creditsPerKToken: 2,
          contextWindow: 128000,
          capabilities: ['chat'],
          isAvailable: false,
        },
      });

      await request(app)
        .post('/v1/users/me/preferences/model')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelId: 'unavailable-model',
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/v1/users/me/preferences/model')
        .send({ modelId: 'test-model' })
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /v1/users/me/preferences/model
  // ===========================================================================

  describe('GET /v1/users/me/preferences/model', () => {
    it('should get default model', async () => {
      // Set default model first
      await prisma.userPreference.upsert({
        where: { userId },
        update: { defaultModelId: 'test-model' },
        create: { userId, defaultModelId: 'test-model' },
      });

      const response = await request(app)
        .get('/v1/users/me/preferences/model')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.defaultModelId).toBe('test-model');
      expect(response.body.model).toBeDefined();
    });

    it('should return null when no default model is set', async () => {
      const newUser = await createTestUser(prisma);
      const token = await generateTestAccessToken(newUser);

      const response = await request(app)
        .get('/v1/users/me/preferences/model')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.defaultModelId).toBeNull();
      expect(response.body.model).toBeNull();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/v1/users/me/preferences/model')
        .expect(401);
    });
  });
});
