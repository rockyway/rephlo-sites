/**
 * Webhook Service (Refactored to Class-based DI)
 *
 * Handles webhook delivery, queueing, and logging for outgoing event notifications.
 * Sends HTTP POST requests to user-configured endpoints with HMAC signatures.
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, WebhookConfig, WebhookLog } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { generateWebhookSignature, getCurrentTimestamp } from '../utils/signature';
import { IWebhookService, WebhookEventType } from '../interfaces';

// Webhook job data structure
export interface WebhookJobData {
  webhookConfigId: string;
  eventType: WebhookEventType;
  payload: any;
  userId: string;
}

@injectable()
export class WebhookService implements IWebhookService {
  private webhookQueue: Queue<WebhookJobData>;

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('RedisConnection') redisConnection: Redis
  ) {
    // Initialize BullMQ queue with injected Redis connection
    this.webhookQueue = new Queue<WebhookJobData>('webhook-delivery', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start at 1s, then 4s, then 16s
        },
        removeOnComplete: {
          age: 86400 * 7, // Keep completed jobs for 7 days
        },
        removeOnFail: {
          age: 86400 * 30, // Keep failed jobs for 30 days
        },
      },
    });

    logger.debug('WebhookService: Initialized');
  }

  /**
   * Queue a webhook for delivery
   *
   * @param userId - User ID to send webhook to
   * @param eventType - Type of event
   * @param eventData - Event-specific data
   */
  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    eventData: any
  ): Promise<void> {
    try {
      // Check if user has webhook configured
      const webhookConfig = await this.prisma.webhookConfig.findUnique({
        where: { userId },
      });

      if (!webhookConfig) {
        logger.debug('WebhookService: No webhook configured', { userId, eventType });
        return;
      }

      if (!webhookConfig.isActive) {
        logger.debug('WebhookService: Webhook disabled', { userId, eventType });
        return;
      }

      // Construct webhook payload
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
      };

      // Create webhook log entry
      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          webhookConfigId: webhookConfig.id,
          eventType,
          payload,
          status: 'pending',
          attempts: 0,
        },
      });

      // Queue webhook job
      await this.webhookQueue.add(
        'deliver-webhook',
        {
          webhookConfigId: webhookConfig.id,
          eventType,
          payload,
          userId,
        },
        {
          jobId: webhookLog.id, // Use log ID as job ID for tracking
        }
      );

      logger.info('WebhookService: Webhook queued', {
        userId,
        eventType,
        webhookConfigId: webhookConfig.id,
        webhookLogId: webhookLog.id,
      });
    } catch (error) {
      logger.error('WebhookService: Failed to queue webhook', {
        userId,
        eventType,
        error,
      });
      throw error;
    }
  }

  /**
   * Send webhook HTTP POST request
   *
   * @param webhookConfigId - Webhook configuration ID
   * @param eventType - Event type
   * @param payload - Webhook payload
   * @param attempt - Current attempt number
   * @returns Response data
   */
  async sendWebhook(
    webhookConfigId: string,
    eventType: WebhookEventType,
    payload: any,
    attempt: number
  ): Promise<{ statusCode: number; responseBody: string }> {
    try {
      // Get webhook configuration
      const webhookConfig = await this.prisma.webhookConfig.findUnique({
        where: { id: webhookConfigId },
      });

      if (!webhookConfig) {
        throw new Error('Webhook configuration not found');
      }

      // Generate HMAC signature
      const signature = generateWebhookSignature(payload, webhookConfig.webhookSecret);
      const timestamp = getCurrentTimestamp();

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Event': eventType,
        'User-Agent': 'Rephlo-Webhook/1.0',
      };

      // Send HTTP POST request
      const timeout = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      logger.info('WebhookService: Sending webhook', {
        webhookConfigId,
        eventType,
        attempt,
        url: webhookConfig.webhookUrl,
      });

      const response = await fetch(webhookConfig.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();

      logger.info('WebhookService: Webhook delivered', {
        webhookConfigId,
        eventType,
        statusCode: response.status,
        attempt,
      });

      return {
        statusCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit to 1000 chars
      };
    } catch (error: any) {
      logger.error('WebhookService: Webhook delivery failed', {
        webhookConfigId,
        eventType,
        attempt,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Update webhook log with delivery result
   *
   * @param webhookLogId - Webhook log ID
   * @param status - Delivery status
   * @param statusCode - HTTP status code
   * @param responseBody - Response body
   * @param errorMessage - Error message (if failed)
   * @param attempts - Number of attempts
   */
  async updateWebhookLog(
    webhookLogId: string,
    status: 'success' | 'failed' | 'pending',
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string,
    attempts?: number
  ): Promise<void> {
    try {
      await this.prisma.webhookLog.update({
        where: { id: webhookLogId },
        data: {
          status,
          statusCode,
          responseBody,
          errorMessage,
          attempts,
          completedAt: status !== 'pending' ? new Date() : undefined,
        },
      });

      logger.debug('WebhookService: Webhook log updated', {
        webhookLogId,
        status,
        attempts,
      });
    } catch (error) {
      logger.error('WebhookService: Failed to update webhook log', {
        webhookLogId,
        error,
      });
    }
  }

  /**
   * Get webhook configuration for a user
   *
   * @param userId - User ID
   * @returns Webhook configuration or null
   */
  async getWebhookConfig(userId: string): Promise<WebhookConfig | null> {
    return this.prisma.webhookConfig.findUnique({
      where: { userId },
    });
  }

  /**
   * Create or update webhook configuration
   *
   * @param userId - User ID
   * @param webhookUrl - Webhook URL
   * @param webhookSecret - Webhook secret
   * @returns Created/updated webhook configuration
   */
  async upsertWebhookConfig(
    userId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<WebhookConfig> {
    return this.prisma.webhookConfig.upsert({
      where: { userId },
      create: {
        userId,
        webhookUrl,
        webhookSecret,
        isActive: true,
      },
      update: {
        webhookUrl,
        webhookSecret,
        isActive: true,
      },
    });
  }

  /**
   * Delete webhook configuration
   *
   * @param userId - User ID
   */
  async deleteWebhookConfig(userId: string): Promise<void> {
    await this.prisma.webhookConfig.delete({
      where: { userId },
    });
  }

  /**
   * Get webhook logs for a webhook configuration
   *
   * @param webhookConfigId - Webhook configuration ID
   * @param limit - Maximum number of logs to return
   * @returns Array of webhook logs
   */
  async getWebhookLogs(
    webhookConfigId: string,
    limit: number = 50
  ): Promise<WebhookLog[]> {
    return this.prisma.webhookLog.findMany({
      where: { webhookConfigId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get the webhook queue (for worker registration)
   */
  getQueue(): Queue<WebhookJobData> {
    return this.webhookQueue;
  }
}
