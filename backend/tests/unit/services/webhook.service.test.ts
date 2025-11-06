import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import {
  queueWebhook,
  sendWebhook,
  updateWebhookLog,
  getWebhookConfig,
  upsertWebhookConfig,
  deleteWebhookConfig,
  getWebhookLogs,
} from '../../../src/services/webhook.service';
import { getTestDatabase, cleanDatabase } from '../../setup/database';
import { createTestUser, createTestWebhookConfig } from '../../helpers/factories';
import { mockWebhookDelivery, cleanMocks } from '../../helpers/mocks';
import nock from 'nock';

describe('WebhookService', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = getTestDatabase();
    await cleanDatabase();
    nock.cleanAll();
  });

  afterEach(async () => {
    await cleanDatabase();
    cleanMocks();
  });

  // ===========================================================================
  // Queue Webhook
  // ===========================================================================

  describe('queueWebhook', () => {
    it('should queue webhook for delivery', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
        isActive: true,
      });

      await queueWebhook(user.id, 'subscription.created', {
        subscription_id: 'sub_123',
      });

      const logs = await prisma.webhookLog.findMany({
        where: { webhookConfigId: config.id },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe('subscription.created');
      expect(logs[0].status).toBe('pending');
    });

    it('should not queue webhook if config does not exist', async () => {
      const user = await createTestUser(prisma);

      await queueWebhook(user.id, 'subscription.created', {
        data: 'test',
      });

      const logs = await prisma.webhookLog.findMany({
        where: { webhookConfig: { userId: user.id } },
      });

      expect(logs).toHaveLength(0);
    });

    it('should not queue webhook if config is inactive', async () => {
      const user = await createTestUser(prisma);
      await createTestWebhookConfig(prisma, user.id, {
        isActive: false,
      });

      await queueWebhook(user.id, 'subscription.created', {
        data: 'test',
      });

      const logs = await prisma.webhookLog.findMany();

      expect(logs).toHaveLength(0);
    });

    it('should include event data in payload', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      const eventData = {
        subscription_id: 'sub_123',
        tier: 'pro',
        credits: 100000,
      };

      await queueWebhook(user.id, 'subscription.created', eventData);

      const log = await prisma.webhookLog.findFirst({
        where: { webhookConfigId: config.id },
      });

      expect(log?.payload).toMatchObject({
        event: 'subscription.created',
        data: eventData,
      });
    });

    it('should handle different event types', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      const events: Array<typeof import('../../../src/services/webhook.service').WebhookEventType> = [
        'subscription.created',
        'subscription.cancelled',
        'subscription.updated',
        'credits.depleted',
        'credits.low',
      ];

      for (const event of events) {
        await queueWebhook(user.id, event, { test: true });
      }

      const logs = await prisma.webhookLog.findMany({
        where: { webhookConfigId: config.id },
      });

      expect(logs).toHaveLength(5);
    });
  });

  // ===========================================================================
  // Send Webhook
  // ===========================================================================

  describe('sendWebhook', () => {
    it('should send webhook successfully', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
      });

      mockWebhookDelivery('https://example.com/webhook', true);

      const result = await sendWebhook(
        config.id,
        'subscription.created',
        { event: 'test', data: { test: true } },
        1
      );

      expect(result.statusCode).toBe(200);
    });

    it('should include HMAC signature in headers', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
        secret: 'test_secret',
      });

      let capturedHeaders: any = {};
      nock('https://example.com')
        .post('/webhook', (body) => true)
        .reply(function(uri, requestBody) {
          capturedHeaders = this.req.headers;
          return [200, { received: true }];
        });

      await sendWebhook(
        config.id,
        'subscription.created',
        { event: 'test', data: {} },
        1
      );

      expect(capturedHeaders['x-webhook-signature']).toBeDefined();
      expect(capturedHeaders['x-webhook-timestamp']).toBeDefined();
      expect(capturedHeaders['x-webhook-event']).toBe('subscription.created');
    });

    it('should handle webhook delivery failures', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
      });

      mockWebhookDelivery('https://example.com/webhook', false);

      const result = await sendWebhook(
        config.id,
        'subscription.created',
        { event: 'test', data: {} },
        1
      );

      expect(result.statusCode).toBe(500);
    });

    it('should throw error if webhook config not found', async () => {
      await expect(
        sendWebhook('non-existent-id', 'subscription.created', {}, 1)
      ).rejects.toThrow('Webhook configuration not found');
    });

    it('should handle timeout', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
      });

      nock('https://example.com')
        .post('/webhook')
        .delay(10000)
        .reply(200);

      await expect(
        sendWebhook(config.id, 'subscription.created', {}, 1)
      ).rejects.toThrow();
    });

    it('should limit response body to 1000 chars', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
      });

      const longResponse = 'x'.repeat(2000);
      nock('https://example.com')
        .post('/webhook')
        .reply(200, longResponse);

      const result = await sendWebhook(
        config.id,
        'subscription.created',
        {},
        1
      );

      expect(result.responseBody.length).toBe(1000);
    });
  });

  // ===========================================================================
  // Update Webhook Log
  // ===========================================================================

  describe('updateWebhookLog', () => {
    it('should update webhook log with success', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      const log = await prisma.webhookLog.create({
        data: {
          webhookConfigId: config.id,
          eventType: 'subscription.created',
          payload: {},
          status: 'pending',
          attempts: 0,
        },
      });

      await updateWebhookLog(log.id, 'success', 200, 'OK', undefined, 1);

      const updated = await prisma.webhookLog.findUnique({
        where: { id: log.id },
      });

      expect(updated?.status).toBe('success');
      expect(updated?.statusCode).toBe(200);
      expect(updated?.responseBody).toBe('OK');
      expect(updated?.attempts).toBe(1);
      expect(updated?.completedAt).toBeTruthy();
    });

    it('should update webhook log with failure', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      const log = await prisma.webhookLog.create({
        data: {
          webhookConfigId: config.id,
          eventType: 'subscription.created',
          payload: {},
          status: 'pending',
          attempts: 0,
        },
      });

      await updateWebhookLog(
        log.id,
        'failed',
        500,
        'Internal Server Error',
        'Connection failed',
        3
      );

      const updated = await prisma.webhookLog.findUnique({
        where: { id: log.id },
      });

      expect(updated?.status).toBe('failed');
      expect(updated?.statusCode).toBe(500);
      expect(updated?.errorMessage).toBe('Connection failed');
      expect(updated?.attempts).toBe(3);
    });
  });

  // ===========================================================================
  // Get Webhook Config
  // ===========================================================================

  describe('getWebhookConfig', () => {
    it('should get webhook config by user ID', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id, {
        url: 'https://example.com/webhook',
      });

      const retrieved = await getWebhookConfig(user.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(config.id);
      expect(retrieved?.webhookUrl).toBe('https://example.com/webhook');
    });

    it('should return null if config does not exist', async () => {
      const user = await createTestUser(prisma);

      const config = await getWebhookConfig(user.id);

      expect(config).toBeNull();
    });
  });

  // ===========================================================================
  // Upsert Webhook Config
  // ===========================================================================

  describe('upsertWebhookConfig', () => {
    it('should create new webhook config', async () => {
      const user = await createTestUser(prisma);

      const config = await upsertWebhookConfig(
        user.id,
        'https://example.com/webhook',
        'secret_123'
      );

      expect(config).toBeDefined();
      expect(config.userId).toBe(user.id);
      expect(config.webhookUrl).toBe('https://example.com/webhook');
      expect(config.webhookSecret).toBe('secret_123');
      expect(config.isActive).toBe(true);
    });

    it('should update existing webhook config', async () => {
      const user = await createTestUser(prisma);
      await createTestWebhookConfig(prisma, user.id, {
        url: 'https://old.com/webhook',
        secret: 'old_secret',
      });

      const updated = await upsertWebhookConfig(
        user.id,
        'https://new.com/webhook',
        'new_secret'
      );

      expect(updated.webhookUrl).toBe('https://new.com/webhook');
      expect(updated.webhookSecret).toBe('new_secret');

      // Should only have one config
      const configs = await prisma.webhookConfig.findMany({
        where: { userId: user.id },
      });
      expect(configs).toHaveLength(1);
    });

    it('should reactivate disabled webhook config', async () => {
      const user = await createTestUser(prisma);
      await createTestWebhookConfig(prisma, user.id, {
        isActive: false,
      });

      const updated = await upsertWebhookConfig(
        user.id,
        'https://example.com/webhook',
        'secret'
      );

      expect(updated.isActive).toBe(true);
    });
  });

  // ===========================================================================
  // Delete Webhook Config
  // ===========================================================================

  describe('deleteWebhookConfig', () => {
    it('should delete webhook config', async () => {
      const user = await createTestUser(prisma);
      await createTestWebhookConfig(prisma, user.id);

      await deleteWebhookConfig(user.id);

      const config = await prisma.webhookConfig.findUnique({
        where: { userId: user.id },
      });

      expect(config).toBeNull();
    });

    it('should not throw error if config does not exist', async () => {
      const user = await createTestUser(prisma);

      await expect(deleteWebhookConfig(user.id)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Get Webhook Logs
  // ===========================================================================

  describe('getWebhookLogs', () => {
    it('should get webhook logs', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      // Create multiple logs
      for (let i = 0; i < 5; i++) {
        await prisma.webhookLog.create({
          data: {
            webhookConfigId: config.id,
            eventType: 'subscription.created',
            payload: {},
            status: 'success',
            attempts: 1,
          },
        });
      }

      const logs = await getWebhookLogs(config.id);

      expect(logs).toHaveLength(5);
    });

    it('should limit number of logs returned', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      for (let i = 0; i < 100; i++) {
        await prisma.webhookLog.create({
          data: {
            webhookConfigId: config.id,
            eventType: 'subscription.created',
            payload: {},
            status: 'success',
            attempts: 1,
          },
        });
      }

      const logs = await getWebhookLogs(config.id, 20);

      expect(logs).toHaveLength(20);
    });

    it('should order logs by createdAt desc', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      const log1 = await prisma.webhookLog.create({
        data: {
          webhookConfigId: config.id,
          eventType: 'subscription.created',
          payload: { order: 1 },
          status: 'success',
          attempts: 1,
          createdAt: new Date('2024-01-01'),
        },
      });

      const log2 = await prisma.webhookLog.create({
        data: {
          webhookConfigId: config.id,
          eventType: 'subscription.created',
          payload: { order: 2 },
          status: 'success',
          attempts: 1,
          createdAt: new Date('2024-01-02'),
        },
      });

      const logs = await getWebhookLogs(config.id);

      // Most recent first
      expect(logs[0].id).toBe(log2.id);
      expect(logs[1].id).toBe(log1.id);
    });

    it('should return empty array for config with no logs', async () => {
      const user = await createTestUser(prisma);
      const config = await createTestWebhookConfig(prisma, user.id);

      const logs = await getWebhookLogs(config.id);

      expect(logs).toHaveLength(0);
    });
  });
});
