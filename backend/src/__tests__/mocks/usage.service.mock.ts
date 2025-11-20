import { token_usage_ledger } from '@prisma/client';
import {
  IUsageService,
  RecordUsageInput,
  UsageHistoryResult,
  UsageStatsResult,
  UsageStatsItem,
} from '../../interfaces';
import { UsageQueryParams, UsageStatsQueryParams } from '../../types/credit-validation';

export class MockUsageService implements IUsageService {
  private usageHistory: Map<string, token_usage_ledger> = new Map();

  async recordUsage(data: RecordUsageInput): Promise<token_usage_ledger> {
    const now = new Date();
    const usage: token_usage_ledger = {
      id: `mock-usage-${Date.now()}-${Math.random()}`,
      request_id: `mock-req-${Date.now()}-${Math.random()}`,
      user_id: data.userId,
      subscription_id: data.subscriptionId || null,
      model_id: data.modelId,
      provider_id: data.providerId,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      cached_input_tokens: data.cachedInputTokens || 0,
      vendor_cost: data.vendorCost as any,
      margin_multiplier: data.marginMultiplier as any,
      credit_value_usd: data.creditValueUsd as any,
      credits_deducted: data.creditsDeducted,
      request_type: data.requestType as any,
      streaming_segments: data.streamingSegments || null,
      request_started_at: data.requestStartedAt,
      request_completed_at: data.requestCompletedAt,
      processing_time_ms: data.processingTimeMs || null,
      status: (data.status as any) || 'success',
      error_message: data.errorMessage || null,
      is_streaming_complete: data.isStreamingComplete !== undefined ? data.isStreamingComplete : true,
      user_tier_at_request: data.userTierAtRequest || null,
      region: data.region || null,
      deduction_record_id: data.deductionRecordId || null,
      created_at: now,
      gross_margin_usd: 0 as any,
      total_credits: null,
      input_credits: null,
      output_credits: null,
      image_count: 0,
      image_tokens: 0,
      cache_creation_tokens: 0,
      cache_read_tokens: 0,
      cached_prompt_tokens: 0,
      cache_hit_rate: null,
      cost_savings_percent: null,
      cache_write_credits: null,
      cache_read_credits: null,
    };

    this.usageHistory.set(usage.id, usage);
    return usage;
  }

  async getUsageHistory(userId: string, params: UsageQueryParams): Promise<UsageHistoryResult> {
    const allUsage = Array.from(this.usageHistory.values()).filter((u) => u.user_id === userId);

    // Apply filters
    let filtered = allUsage;
    if (params.start_date) {
      filtered = filtered.filter((u) => u.created_at >= new Date(params.start_date!));
    }
    if (params.end_date) {
      filtered = filtered.filter((u) => u.created_at <= new Date(params.end_date!));
    }
    if (params.model_id) {
      filtered = filtered.filter((u) => u.model_id === params.model_id);
    }

    // Sort by created_at descending
    filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    // Paginate
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const total = filtered.length;
    const usage = filtered.slice(offset, offset + limit);

    // Calculate summary
    const summary = {
      totalCreditsUsed: filtered.reduce((sum, u) => sum + u.credits_deducted, 0),
      totalRequests: filtered.length,
      totalTokens: filtered.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0),
    };

    return {
      usage,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      summary,
    };
  }

  async getUsageStats(
    userId: string,
    params: UsageStatsQueryParams
  ): Promise<UsageStatsResult> {
    const allUsage = Array.from(this.usageHistory.values()).filter((u) => u.user_id === userId);

    // Apply filters
    let filtered = allUsage;
    if (params.start_date) {
      filtered = filtered.filter((u) => u.created_at >= new Date(params.start_date!));
    }
    if (params.end_date) {
      filtered = filtered.filter((u) => u.created_at <= new Date(params.end_date!));
    }

    // Group by specified dimension
    const stats: UsageStatsItem[] = [];
    const total = {
      creditsUsed: filtered.reduce((sum, u) => sum + u.credits_deducted, 0),
      requestsCount: filtered.length,
      tokensTotal: filtered.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0),
      averageDurationMs:
        filtered.length > 0
          ? filtered.reduce((sum, u) => sum + (u.processing_time_ms || 0), 0) / filtered.length
          : 0,
    };

    return { stats, total };
  }

  async getUserUsage(userId: string, limit = 100): Promise<token_usage_ledger[]> {
    return Array.from(this.usageHistory.values())
      .filter((u) => u.user_id === userId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  async getUsageByModel(userId: string, modelId: string): Promise<token_usage_ledger[]> {
    return Array.from(this.usageHistory.values())
      .filter((u) => u.user_id === userId && u.model_id === modelId)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async getUserUsageStats(userId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCredits: number;
    byModel: Record<string, { requests: number; tokens: number; credits: number }>;
  }> {
    const userUsage = Array.from(this.usageHistory.values()).filter(
      (u) => u.user_id === userId
    );

    const byModel: Record<string, { requests: number; tokens: number; credits: number }> = {};

    userUsage.forEach((usage) => {
      if (!byModel[usage.model_id]) {
        byModel[usage.model_id] = { requests: 0, tokens: 0, credits: 0 };
      }
      byModel[usage.model_id].requests++;
      byModel[usage.model_id].tokens += usage.input_tokens + usage.output_tokens;
      byModel[usage.model_id].credits += usage.credits_deducted;
    });

    return {
      totalRequests: userUsage.length,
      totalTokens: userUsage.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0),
      totalCredits: userUsage.reduce((sum, u) => sum + u.credits_deducted, 0),
      byModel,
    };
  }

  // Test helpers
  clear() {
    this.usageHistory.clear();
  }

  seed(usage: token_usage_ledger[]) {
    usage.forEach((u) => this.usageHistory.set(u.id, u));
  }

  getAll(): token_usage_ledger[] {
    return Array.from(this.usageHistory.values());
  }
}
