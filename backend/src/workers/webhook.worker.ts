/**
 * Webhook Queue Worker
 *
 * BullMQ worker that processes webhook delivery jobs with retry logic.
 * Runs as a separate process for scalability and reliability.
 */

import 'reflect-metadata';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { WebhookJobData } from '../services/webhook.service';
import { container } from '../container';
import { IWebhookService } from '../interfaces';

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, {
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
});

/**
 * Process webhook delivery job
 *
 * @param job - BullMQ job containing webhook data
 */
async function processWebhook(job: Job<WebhookJobData>): Promise<void> {
  const { webhookConfigId, eventType, payload, userId } = job.data;
  const attempt = job.attemptsMade + 1;

  logger.info('Processing webhook job', {
    jobId: job.id,
    webhookConfigId,
    eventType,
    userId,
    attempt,
  });

  try {
    // Get webhook service from DI container
    const webhookService = container.resolve<IWebhookService>('IWebhookService');

    // Send webhook HTTP POST request
    const result = await webhookService.sendWebhook(webhookConfigId, eventType, payload, attempt);

    // Check if response is successful (2xx status code)
    const isSuccess = result.statusCode >= 200 && result.statusCode < 300;

    if (isSuccess) {
      // Update log as success
      await webhookService.updateWebhookLog(
        job.id!,
        'success',
        result.statusCode,
        result.responseBody,
        undefined,
        attempt
      );

      logger.info('Webhook delivered successfully', {
        jobId: job.id,
        webhookConfigId,
        eventType,
        statusCode: result.statusCode,
        attempt,
      });
    } else {
      // Non-2xx response, consider it a failure
      const errorMessage = `HTTP ${result.statusCode}: ${result.responseBody}`;

      // Update log as failed (will retry if attempts remaining)
      await webhookService.updateWebhookLog(
        job.id!,
        'failed',
        result.statusCode,
        result.responseBody,
        errorMessage,
        attempt
      );

      // Determine if we should retry based on status code
      const shouldRetry = shouldRetryStatusCode(result.statusCode);

      if (shouldRetry && attempt < 3) {
        logger.warn('Webhook delivery failed, will retry', {
          jobId: job.id,
          webhookConfigId,
          eventType,
          statusCode: result.statusCode,
          attempt,
        });
        throw new Error(errorMessage); // Throw to trigger retry
      } else {
        logger.error('Webhook delivery failed permanently', {
          jobId: job.id,
          webhookConfigId,
          eventType,
          statusCode: result.statusCode,
          attempt,
        });
        // Don't throw if we shouldn't retry or max attempts reached
      }
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';

    // Get webhook service from DI container
    const webhookService = container.resolve<IWebhookService>('IWebhookService');

    // Update log with error
    await webhookService.updateWebhookLog(
      job.id!,
      'failed',
      undefined,
      undefined,
      errorMessage,
      attempt
    );

    if (attempt >= 3) {
      logger.error('Webhook delivery failed after max attempts', {
        jobId: job.id,
        webhookConfigId,
        eventType,
        error: errorMessage,
        attempt,
      });
      // Don't re-throw to prevent job from being retried
    } else {
      logger.warn('Webhook delivery error, will retry', {
        jobId: job.id,
        webhookConfigId,
        eventType,
        error: errorMessage,
        attempt,
      });
      throw error; // Re-throw to trigger retry
    }
  }
}

/**
 * Determine if we should retry based on HTTP status code
 *
 * @param statusCode - HTTP status code
 * @returns True if should retry, false otherwise
 */
function shouldRetryStatusCode(statusCode: number): boolean {
  // Don't retry client errors (except 429 rate limit)
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return false;
  }

  // Retry server errors (5xx) and rate limits (429)
  if (statusCode >= 500 || statusCode === 429) {
    return true;
  }

  // For other status codes, don't retry
  return false;
}

// Create webhook worker
const webhookWorker = new Worker<WebhookJobData>(
  'webhook-delivery',
  processWebhook,
  {
    connection,
    concurrency: 10, // Process up to 10 webhooks concurrently
    limiter: {
      max: 100, // Max 100 webhooks per duration
      duration: 60000, // Per minute
    },
  }
);

// Worker event handlers
webhookWorker.on('completed', (job) => {
  logger.info('Webhook job completed', {
    jobId: job.id,
    returnvalue: job.returnvalue,
  });
});

webhookWorker.on('failed', (job, error) => {
  if (job) {
    logger.error('Webhook job failed', {
      jobId: job.id,
      error: error.message,
      attemptsMade: job.attemptsMade,
    });
  }
});

webhookWorker.on('error', (error) => {
  logger.error('Webhook worker error', { error: error.message });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Webhook worker shutting down gracefully...');
  await webhookWorker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Webhook worker shutting down gracefully...');
  await webhookWorker.close();
  await connection.quit();
  process.exit(0);
});

logger.info('Webhook worker started', {
  queue: 'webhook-delivery',
  concurrency: 10,
  redisUrl,
});

export default webhookWorker;
