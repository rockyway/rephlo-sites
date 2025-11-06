import { WebhookConfig, WebhookLog } from '@prisma/client';
import { IWebhookService, WebhookEventType } from '../../interfaces';

export class MockWebhookService implements IWebhookService {
  private configs: Map<string, WebhookConfig> = new Map();
  private logs: Map<string, WebhookLog> = new Map();
  private queue: Array<{ userId: string; eventType: WebhookEventType; eventData: any }> = [];

  async queueWebhook(
    userId: string,
    eventType: WebhookEventType,
    eventData: any
  ): Promise<void> {
    this.queue.push({ userId, eventType, eventData });

    // Also create a log entry
    const config = Array.from(this.configs.values()).find((c) => c.userId === userId);
    if (config) {
      const log: WebhookLog = {
        id: `mock-log-${Date.now()}-${Math.random()}`,
        webhookConfigId: config.id,
        eventType,
        payload: eventData,
        status: 'pending',
        attempts: 0,
        statusCode: null,
        responseBody: null,
        errorMessage: null,
        createdAt: new Date(),
        completedAt: null,
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
      log.statusCode = statusCode || null;
      log.responseBody = responseBody || null;
      log.errorMessage = errorMessage || null;
      log.attempts = attempts || log.attempts;
      if (status === 'success' || status === 'failed') {
        log.completedAt = new Date();
      }
    }
  }

  async getWebhookConfig(userId: string): Promise<WebhookConfig | null> {
    return Array.from(this.configs.values()).find((c) => c.userId === userId) || null;
  }

  async upsertWebhookConfig(
    userId: string,
    webhookUrl: string,
    webhookSecret: string
  ): Promise<WebhookConfig> {
    const existing = Array.from(this.configs.values()).find((c) => c.userId === userId);

    if (existing) {
      existing.webhookUrl = webhookUrl;
      existing.webhookSecret = webhookSecret;
      existing.updatedAt = new Date();
      return existing;
    }

    const config: WebhookConfig = {
      id: `mock-config-${Date.now()}-${Math.random()}`,
      userId,
      webhookUrl,
      webhookSecret,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(config.id, config);
    return config;
  }

  async deleteWebhookConfig(userId: string): Promise<void> {
    const config = Array.from(this.configs.values()).find((c) => c.userId === userId);
    if (config) {
      this.configs.delete(config.id);
    }
  }

  async getWebhookLogs(webhookConfigId: string, limit = 50): Promise<WebhookLog[]> {
    return Array.from(this.logs.values())
      .filter((log) => log.webhookConfigId === webhookConfigId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Test helpers
  clear() {
    this.configs.clear();
    this.logs.clear();
    this.queue = [];
  }

  seed(configs: WebhookConfig[], logs?: WebhookLog[]) {
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
