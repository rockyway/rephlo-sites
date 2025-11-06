import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { createTestUser } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';
import { mockOpenAICompletion, cleanMocks } from '../helpers/mocks';

describe('Models API Integration Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();

    // Create test user and token
    const user = await createTestUser(prisma);
    userId = user.id;
    authToken = await generateTestAccessToken(user);
  });

  beforeEach(() => {
    cleanMocks();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('GET /v1/models', () => {
    it('should return list of models with authentication', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.models).toBeDefined();
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
      expect(response.body.total).toBe(response.body.models.length);

      // Verify model structure
      const model = response.body.models[0];
      expect(model).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        provider: expect.any(String),
        capabilities: expect.any(Array),
        contextLength: expect.any(Number),
        creditsPerKTokens: expect.any(Number),
        isAvailable: expect.any(Boolean),
      });
    });

    it('should filter models by provider', async () => {
      const response = await request(app)
        .get('/v1/models?provider=openai')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.models.length).toBeGreaterThan(0);
      response.body.models.forEach((model: any) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should filter models by capability', async () => {
      const response = await request(app)
        .get('/v1/models?capability=vision')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.models.length).toBeGreaterThan(0);
      response.body.models.forEach((model: any) => {
        expect(model.capabilities).toContain('vision');
      });
    });

    it('should require authentication', async () => {
      await request(app).get('/v1/models').expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/v1/models')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /v1/models/:modelId', () => {
    it('should return model details', async () => {
      const response = await request(app)
        .get('/v1/models/gpt-5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'gpt-5',
        name: 'gpt-5',
        displayName: 'GPT-5',
        provider: 'openai',
        capabilities: expect.arrayContaining(['text']),
        contextLength: expect.any(Number),
        maxOutputTokens: expect.any(Number),
        inputCostPerMillionTokens: expect.any(Number),
        outputCostPerMillionTokens: expect.any(Number),
        creditsPerKTokens: expect.any(Number),
        isAvailable: true,
      });
    });

    it('should return 404 for non-existent model', async () => {
      await request(app)
        .get('/v1/models/non-existent-model')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).get('/v1/models/gpt-5').expect(401);
    });
  });

  describe('POST /v1/completions', () => {
    it('should create text completion successfully', async () => {
      mockOpenAICompletion({
        content: 'This is a test response',
        promptTokens: 10,
        completionTokens: 5,
      });

      const response = await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5',
          prompt: 'Hello, how are you?',
          maxTokens: 100,
          temperature: 0.7,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        object: 'text_completion',
        model: 'gpt-5',
        choices: expect.arrayContaining([
          expect.objectContaining({
            text: expect.any(String),
            finishReason: expect.any(String),
          }),
        ]),
        usage: expect.objectContaining({
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number),
          creditsUsed: expect.any(Number),
        }),
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/v1/completions')
        .send({
          model: 'gpt-5',
          prompt: 'Hello',
        })
        .expect(401);
    });

    it('should validate model exists', async () => {
      await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'invalid-model',
          prompt: 'Hello',
        })
        .expect(404);
    });

    it('should validate request body', async () => {
      await request(app)
        .post('/v1/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing model and prompt
          maxTokens: 100,
        })
        .expect(400);
    });
  });

  describe('POST /v1/chat/completions', () => {
    it('should create chat completion successfully', async () => {
      mockOpenAICompletion({
        content: 'This is a chat response',
        promptTokens: 20,
        completionTokens: 10,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'What is the capital of France?' },
          ],
          maxTokens: 100,
          temperature: 0.7,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        object: 'chat.completion',
        model: 'gpt-5',
        choices: expect.arrayContaining([
          expect.objectContaining({
            message: expect.objectContaining({
              role: 'assistant',
              content: expect.any(String),
            }),
            finishReason: expect.any(String),
          }),
        ]),
        usage: expect.objectContaining({
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number),
          creditsUsed: expect.any(Number),
        }),
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(401);
    });

    it('should validate messages format', async () => {
      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5',
          messages: 'invalid-messages-format',
        })
        .expect(400);
    });

    it('should handle streaming parameter', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        });

      // Streaming responses should have different content type
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple rapid requests
      const requests = Array(70)
        .fill(null)
        .map(() =>
          request(app).get('/v1/models').set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});
