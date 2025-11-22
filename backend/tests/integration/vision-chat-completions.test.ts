/**
 * Integration Tests for Vision-Enabled Chat Completions
 *
 * Tests POST /v1/chat/completions with vision/image support:
 * - Text-only requests (backward compatibility)
 * - Single image requests (base64 and HTTP URL)
 * - Multiple images requests (up to 10 images)
 * - Image count limit enforcement
 * - Vision token recording in database
 * - SSRF protection (reject private IPs)
 * - Oversized image rejection (>20MB)
 * - Non-vision model rejection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app';
import { getTestDatabase, cleanDatabase, seedTestData } from '../setup/database';
import { createTestUser, createTestSubscription, createTestCredits } from '../helpers/factories';
import { generateTestAccessToken } from '../helpers/tokens';
import { mockOpenAIVisionCompletion, cleanMocks } from '../helpers/mocks';

describe('Vision Chat Completions Integration Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    await seedTestData();

    // Create test user with sufficient credits
    const user = await createTestUser(prisma);
    userId = user.id;
    const subscription = await createTestSubscription(prisma, userId, {
      tier: 'pro', // Pro tier for vision access
    });
    await createTestCredits(prisma, userId, subscription.id, {
      totalCredits: 1000000, // 1M credits
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

  describe('Text-Only Requests (Backward Compatibility)', () => {
    it('should handle text-only request without vision', async () => {
      mockOpenAIVisionCompletion({
        content: 'Hello! How can I help you?',
        promptTokens: 10,
        completionTokens: 8,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            { role: 'user', content: 'Hello' },
          ],
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
      expect(response.body.usage.promptTokens).toBe(10);
      expect(response.body.usage.completionTokens).toBe(8);
    });
  });

  describe('Single Image Requests', () => {
    it('should accept vision request with base64 image', async () => {
      mockOpenAIVisionCompletion({
        content: 'I see a cat in the image.',
        promptTokens: 100, // Text + image tokens
        completionTokens: 15,
      });

      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: "What's in this image?" },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                    detail: 'low', // 85 tokens
                  },
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
      expect(response.body.usage.imageTokens).toBe(85); // Low detail = 85 tokens
    });

    it('should accept vision request with HTTP URL', async () => {
      mockOpenAIVisionCompletion({
        content: 'This is a landscape photo.',
        promptTokens: 100,
        completionTokens: 10,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Describe this' },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'https://example.com/test-image.jpg',
                    detail: 'high',
                  },
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
      expect(response.body.usage.imageTokens).toBeGreaterThan(85); // High detail > 85
    });
  });

  describe('Multiple Images Requests', () => {
    it('should accept request with 3 images', async () => {
      mockOpenAIVisionCompletion({
        content: 'I see three different images.',
        promptTokens: 300,
        completionTokens: 12,
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Compare these images' },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
                    detail: 'low',
                  },
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
                    detail: 'low',
                  },
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
                    detail: 'low',
                  },
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
      expect(response.body.usage.imageCount).toBe(3);
      expect(response.body.usage.imageTokens).toBe(255); // 3 × 85 = 255
    });

    it('should accept request with maximum images (10)', async () => {
      mockOpenAIVisionCompletion({
        content: 'I see ten images.',
        promptTokens: 900,
        completionTokens: 8,
      });

      const images = Array(10).fill({
        type: 'image_url',
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          detail: 'low',
        },
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze all images' },
                ...images,
              ],
            },
          ],
        })
        .expect(200);

      expect(response.body.choices[0].message.content).toBeDefined();
      expect(response.body.usage.imageCount).toBe(10);
      expect(response.body.usage.imageTokens).toBe(850); // 10 × 85
    });

    it('should reject request with 11+ images (exceeds limit)', async () => {
      const images = Array(11).fill({
        type: 'image_url',
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          detail: 'low',
        },
      });

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze' },
                ...images,
              ],
            },
          ],
        })
        .expect(422);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Maximum 10 images');
    });
  });

  describe('SSRF Protection', () => {
    it('should reject private IP (127.0.0.1)', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze' },
                {
                  type: 'image_url',
                  image_url: { url: 'http://127.0.0.1/image.jpg' },
                },
              ],
            },
          ],
        })
        .expect(422);

      expect(response.body.error.message).toContain('Private IP');
    });

    it('should reject private IP (192.168.1.1)', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze' },
                {
                  type: 'image_url',
                  image_url: { url: 'http://192.168.1.1/image.jpg' },
                },
              ],
            },
          ],
        })
        .expect(422);

      expect(response.body.error.message).toContain('Private IP');
    });
  });

  describe('Image Size Validation', () => {
    it('should reject oversized base64 image (>20MB)', async () => {
      // Create base64 string that decodes to > 20MB
      const largeBase64 = 'A'.repeat(30000000); // ~30MB
      const dataUri = `data:image/png;base64,${largeBase64}`;

      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze' },
                {
                  type: 'image_url',
                  image_url: { url: dataUri },
                },
              ],
            },
          ],
        })
        .expect(422);

      expect(response.body.error.message).toContain('exceeds maximum');
    });
  });

  describe('Non-Vision Model Rejection', () => {
    it('should reject vision request for non-vision model', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-3.5-turbo', // No vision support
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze' },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
                  },
                },
              ],
            },
          ],
        })
        .expect(400);

      expect(response.body.error.message).toContain('does not support vision');
    });
  });

  describe('Vision Token Recording', () => {
    it('should record image tokens in usage_history', async () => {
      mockOpenAIVisionCompletion({
        content: 'I see an image.',
        promptTokens: 100,
        completionTokens: 8,
      });

      await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Describe' },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
                    detail: 'low',
                  },
                },
              ],
            },
          ],
        })
        .expect(200);

      // Check usage_history record
      const usageRecord = await prisma.usage_history.findFirst({
        where: { user_id: userId },
        orderBy: { request_timestamp: 'desc' },
      });

      expect(usageRecord).toBeDefined();
      expect(usageRecord?.image_count).toBe(1);
      expect(usageRecord?.image_tokens).toBe(85);
    });
  });
});
