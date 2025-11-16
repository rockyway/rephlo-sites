import type { webhook_config, webhook_log } from '@prisma/client';

export const IWebhookService = Symbol('IWebhookService');

export type WebhookEventType =
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'subscription.updated'
  | 'credits.depleted'
  | 'credits.low';

export interface IWebhookService {
  /**
   * Queue a webhook for delivery
   */
  queueWebhook(userId: string, eventType: WebhookEventType, eventData: any): Promise<void>;

  /**
   * Send webhook HTTP POST request
   */
  sendWebhook(
    webhookConfigId: string,
    eventType: WebhookEventType,
    payload: any,
    attempt: number
  ): Promise<{ statusCode: number; responseBody: string }>;

  /**
   * Update webhook log with delivery result
   */
  updateWebhookLog(
    webhookLogId: string,
    status: 'success' | 'failed' | 'pending',
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string,
    attempts?: number
  ): Promise<void>;

  /**
   * Get webhook configuration for a user
   */
  getWebhookConfig(userId: string): Promise<webhook_config | null>;

  /**
   * Create or update webhook configuration
   */
  upsertWebhookConfig(
    userId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<webhook_config>;

  /**
   * Delete webhook configuration
   */
  deleteWebhookConfig(userId: string): Promise<void>;

  /**
   * Get webhook logs for a webhook configuration
   */
  getWebhookLogs(webhookConfigId: string, limit?: number): Promise<webhook_log[]>;
}
