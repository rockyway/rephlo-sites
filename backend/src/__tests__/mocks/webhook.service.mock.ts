import { webhook_configs, webhook_logs } from '@prisma/client';
import { IWebhookService, WebhookEventType } from '../../interfaces';

export class MockWebhookService implements IWebhookService {
  private configs: Map<string, webhook_configs> = new Map();
  private logs: Map<string, webhook_logs> = new Map();
  private queue: Array<{ userId: string; eventType: WebhookEventType; eventData: any }> = [];

  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    eventData: any
  ): Promise<void> {
    this.queue.push({ userId, eventType, eventData });

    // Also create a log entry
    const config = Array.from(this.configs.values()).find((c) => c.user_id === userId);
    if (config) {
      const log: webhook_logs = {
        id: `mock-log-${Date.now()}-${Math.random()}`,
        webhook_config_id: config.id,
        event_type: eventType,
        payload: eventData,
        status: 'pending',
        attempts: 0,
        status_code: null,
        response_body: null,
        error_message: null,
        created_at: new Date(),
        completed_at: null,
      };
      this.logs.set(log.id, log);
    }
  }

  async sendWebhook(
    _webhookConfigId: string,
    _eventType: WebhookEventType,
    _payload: any,
    _attempt: number
  ): Promise<{ statusCode: number; responseBody: string }> {
    // Mock successful webhook delivery
    return {
      statusCode: 200,
      responseBody: JSON.stringify({ received: true }),
    };
  }

  async updateWebhookLog(
    webhookLogId: string,
    status: 'success' | 'failed' | 'pending',
    statusCode?: number,
    responseBody?: string,
    errorMessage?: string,
    attempts?: number
  ): Promise<void> {
    const log = this.logs.get(webhookLogId);
    if (log) {
      log.status = status;
      log.status_code = statusCode || null;
      log.response_body = responseBody || null;
      log.error_message = errorMessage || null;
      log.attempts = attempts || log.attempts;
      if (status === 'success' || status === 'failed') {
        log.completed_at = new Date();
      }
    }
  }

  async getWebhookConfig(userId: string): Promise<webhook_configs | null> {
    return Array.from(this.configs.values()).find((c) => c.user_id === userId) || null;
  }

  async upsertWebhookConfig(
    userId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<webhook_configs> {
    const existing = Array.from(this.configs.values()).find((c) => c.user_id === userId);

    if (existing) {
      existing.webhook_url = webhookUrl;
      existing.webhook_secret = webhookSecret;
      existing.updated_at = new Date();
      return existing;
    }

    const config: webhook_configs = {
      id: `mock-config-${Date.now()}-${Math.random()}`,
      user_id: userId,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.configs.set(config.id, config);
    return config;
  }

  async deleteWebhookConfig(userId: string): Promise<void> {
    const config = Array.from(this.configs.values()).find((c) => c.user_id === userId);
    if (config) {
      this.configs.delete(config.id);
    }
  }

  async getWebhookLogs(webhookConfigId: string, limit = 50): Promise<webhook_logs[]> {
    return Array.from(this.logs.values())
      .filter((log) => log.webhook_config_id === webhookConfigId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  // Test helpers
  clear() {
    this.configs.clear();
    this.logs.clear();
    this.queue = [];
  }

  seed(configs: webhook_configs[], logs?: webhook_logs[]) {
    configs.forEach((config) => this.configs.set(config.id, config));
    if (logs) {
      logs.forEach((log) => this.logs.set(log.id, log));
    }
  }

  getQueue() {
    return [...this.queue];
  }

  clearQueue() {
    this.queue = [];
  }
}
