import type { token_usage_ledger } from '@prisma/client';
import {
  UsageQueryParams,
  UsageStatsQueryParams,
} from '../../types/credit-validation';

export const IUsageService = Symbol('IUsageService');

export interface RecordUsageInput {
  userId: string;
  subscriptionId?: string;
  modelId: string;
  providerId: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  vendorCost: number;
  marginMultiplier: number;
  creditValueUsd: number;
  creditsDeducted: number;
  processingTimeMs?: number;
  requestStartedAt: Date;
  requestCompletedAt: Date;
  status?: string;
  errorMessage?: string;
  isStreamingComplete?: boolean;
  streamingSegments?: number;
  userTierAtRequest?: string;
  region?: string;
  deductionRecordId?: string;
}

export interface UsageHistoryResult {
  usage: token_usage_ledger[];
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
  recordUsage(data: RecordUsageInput): Promise<token_usage_ledger>;

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
  getUserUsage(userId: string, limit?: number): Promise<token_usage_ledger[]>;

  /**
   * Get usage by model for a user
   */
  getUsageByModel(userId: string, modelId: string): Promise<token_usage_ledger[]>;

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
