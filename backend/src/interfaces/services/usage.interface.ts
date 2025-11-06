import { UsageHistory } from '@prisma/client';

export const IUsageService = Symbol('IUsageService');

export interface RecordUsageInput {
  userId: string;
  creditId: string;
  modelId: string;
  operation: string;
  creditsUsed: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestDurationMs: number;
  requestMetadata?: any;
}

export interface IUsageService {
  /**
   * Record a single usage entry
   */
  recordUsage(data: RecordUsageInput): Promise<void>;

  /**
   * Get usage history for a user
   */
  getUserUsage(userId: string, limit?: number): Promise<UsageHistory[]>;

  /**
   * Get usage by model for a user
   */
  getUsageByModel(userId: string, modelId: string): Promise<UsageHistory[]>;

  /**
   * Get usage statistics for a user
   */
  getUserUsageStats(userId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCredits: number;
    byModel: Record<string, { requests: number; tokens: number; credits: number }>;
  }>;
}
