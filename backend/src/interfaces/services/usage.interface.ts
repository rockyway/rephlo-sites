import { UsageHistory } from '@prisma/client';
import {
  UsageQueryParams,
  UsageStatsQueryParams,
} from '../../types/credit-validation';

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

export interface UsageHistoryResult {
  usage: UsageHistory[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  summary: {
    total_credits_used: number;
    total_requests: number;
    total_tokens: number;
  };
}

export interface UsageStatsItem {
  date?: string;
  hour?: number;
  model_id?: string;
  credits_used: number;
  requests_count: number;
  tokens_total: number;
  average_duration_ms: number;
}

export interface UsageStatsResult {
  stats: UsageStatsItem[];
  total: {
    credits_used: number;
    requests_count: number;
    tokens_total: number;
    average_duration_ms: number;
  };
}

export interface IUsageService {
  /**
   * Record a single usage entry
   */
  recordUsage(data: RecordUsageInput): Promise<UsageHistory>;

  /**
   * Get usage history with filtering and pagination
   */
  getUsageHistory(
    userId: string,
    params: UsageQueryParams
  ): Promise<UsageHistoryResult>;

  /**
   * Get usage statistics with aggregation
   */
  getUsageStats(
    userId: string,
    params: UsageStatsQueryParams
  ): Promise<UsageStatsResult>;

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
