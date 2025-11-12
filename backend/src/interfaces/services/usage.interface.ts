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
    hasMore: boolean;
  };
  summary: {
    totalCreditsUsed: number;
    totalRequests: number;
    totalTokens: number;
  };
}

export interface UsageStatsItem {
  date?: string;
  hour?: number;
  modelId?: string;
  creditsUsed: number;
  requestsCount: number;
  tokensTotal: number;
  averageDurationMs: number;
}

export interface UsageStatsResult {
  stats: UsageStatsItem[];
  total: {
    creditsUsed: number;
    requestsCount: number;
    tokensTotal: number;
    averageDurationMs: number;
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
