/**
 * Webhooks Controller
 *
 * Handles webhook configuration CRUD operations and testing.
 */

import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import {
  webhookConfigSchema,
  testWebhookSchema,
  WebhookConfigInput,
  TestWebhookInput,
} from '../types/webhook-validation';
import { container } from '../container';
import { IWebhookService } from '../interfaces';

/**
 * GET /v1/webhooks/config
 * Get user's webhook configuration
 */
export async function getWebhookConfigHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const webhookService = container.resolve<IWebhookService>('IWebhookService');

    const webhookConfig = await webhookService.getWebhookConfig(userId);

    if (!webhookConfig) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook configuration not found',
        },
      });
    }

    // Don't expose webhook secret in response
    const { webhookSecret, ...configWithoutSecret } = webhookConfig;

    return res.json({
      id: configWithoutSecret.id,
      user_id: configWithoutSecret.userId,
      webhook_url: configWithoutSecret.webhookUrl,
      is_active: configWithoutSecret.isActive,
      created_at: configWithoutSecret.createdAt.toISOString(),
      updated_at: configWithoutSecret.updatedAt.toISOString(),
    });
  } catch (error: any) {
    logger.error('Error getting webhook config', {
      userId: req.user!.sub,
      error: error.message,
    });

    return res.status(500).json({
      error: {
        code: 'internal_server_error',
        message: 'Failed to get webhook configuration',
      },
    });
  }
}

/**
 * POST /v1/webhooks/config
 * Create or update webhook configuration
 */
export async function setWebhookConfigHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const webhookService = container.resolve<IWebhookService>('IWebhookService');

    // Validate request body
    const validatedData = webhookConfigSchema.parse(req.body) as WebhookConfigInput;

    // Create or update webhook configuration
    const webhookConfig = await webhookService.upsertWebhookConfig(
      userId,
      validatedData.webhook_url,
      validatedData.webhook_secret
    );

    logger.info('Webhook configuration created/updated', {
      userId,
      webhookConfigId: webhookConfig.id,
    });

    // Don't expose webhook secret in response
    return res.status(201).json({
      id: webhookConfig.id,
      user_id: webhookConfig.userId,
      webhook_url: webhookConfig.webhookUrl,
      is_active: webhookConfig.isActive,
      created_at: webhookConfig.createdAt.toISOString(),
      updated_at: webhookConfig.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    logger.error('Error setting webhook config', {
      userId: req.user!.sub,
      error: error.message,
    });

    return res.status(500).json({
      error: {
        code: 'internal_server_error',
        message: 'Failed to set webhook configuration',
      },
    });
  }
}

/**
 * DELETE /v1/webhooks/config
 * Delete webhook configuration
 */
export async function deleteWebhookConfigHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const webhookService = container.resolve<IWebhookService>('IWebhookService');

    // Check if webhook config exists
    const existingConfig = await webhookService.getWebhookConfig(userId);
    if (!existingConfig) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook configuration not found',
        },
      });
    }

    await webhookService.deleteWebhookConfig(userId);

    logger.info('Webhook configuration deleted', { userId });

    return res.json({
      success: true,
      message: 'Webhook configuration deleted',
    });
  } catch (error: any) {
    logger.error('Error deleting webhook config', {
      userId: req.user!.sub,
      error: error.message,
    });

    return res.status(500).json({
      error: {
        code: 'internal_server_error',
        message: 'Failed to delete webhook configuration',
      },
    });
  }
}

/**
 * POST /v1/webhooks/test
 * Send a test webhook
 */
export async function testWebhookHandler(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const webhookService = container.resolve<IWebhookService>('IWebhookService');

    // Validate request body
    const validatedData = testWebhookSchema.parse(req.body) as TestWebhookInput;

    // Check if webhook config exists
    const webhookConfig = await webhookService.getWebhookConfig(userId);
    if (!webhookConfig) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook configuration not found. Please configure a webhook first.',
        },
      });
    }

    // Generate test payload based on event type
    const testData = generateTestPayload(validatedData.event_type, userId);

    // Queue test webhook
    await webhookService.queueWebhook(userId, validatedData.event_type, testData);

    logger.info('Test webhook queued', {
      userId,
      eventType: validatedData.event_type,
    });

    return res.json({
      success: true,
      message: 'Test webhook queued for delivery',
      event_type: validatedData.event_type,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(422).json({
        error: {
          code: 'validation_error',
          message: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    logger.error('Error testing webhook', {
      userId: req.user!.sub,
      error: error.message,
    });

    return res.status(500).json({
      error: {
        code: 'internal_server_error',
        message: 'Failed to send test webhook',
      },
    });
  }
}

/**
 * Generate test payload for webhook event
 */
function generateTestPayload(eventType: string, userId: string): any {
  switch (eventType) {
    case 'subscription.created':
      return {
        subscription_id: 'test_sub_123abc',
        user_id: userId,
        tier: 'pro',
        status: 'active',
        credits_per_month: 100000,
      };

    case 'subscription.cancelled':
      return {
        subscription_id: 'test_sub_123abc',
        user_id: userId,
        cancelled_at: new Date().toISOString(),
        cancel_at_period_end: true,
      };

    case 'subscription.updated':
      return {
        subscription_id: 'test_sub_123abc',
        user_id: userId,
        tier: 'enterprise',
        previous_tier: 'pro',
      };

    case 'credits.depleted':
      return {
        user_id: userId,
        remaining_credits: 0,
        total_credits: 100000,
      };

    case 'credits.low':
      return {
        user_id: userId,
        remaining_credits: 5000,
        total_credits: 100000,
        threshold_percentage: 5,
      };

    default:
      return {
        user_id: userId,
        message: 'Test webhook event',
      };
  }
}
