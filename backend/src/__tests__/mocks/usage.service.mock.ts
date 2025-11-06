import { UsageHistory } from '@prisma/client';
import {
  IUsageService,
  RecordUsageInput,
  UsageHistoryResult,
  UsageStatsResult,
  UsageStatsItem,
} from '../../interfaces';
import { UsageQueryParams, UsageStatsQueryParams } from '../../types/credit-validation';

export class MockUsageService implements IUsageService {
  private usageHistory: Map<string, UsageHistory> = new Map();

  async recordUsage(data: RecordUsageInput): Promise<UsageHistory> {
    const usage: UsageHistory = {
      id: `mock-usage-${Date.now()}-${Math.random()}`,
      userId: data.userId,
      creditId: data.creditId,
      modelId: data.modelId,
      operation: data.operation as any,
      creditsUsed: data.creditsUsed,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      requestDurationMs: data.requestDurationMs,
      requestMetadata: data.requestMetadata || null,
      createdAt: new Date(),
    };

    this.usageHistory.set(usage.id, usage);
    return usage;
  }

  async getUsageHistory(userId: string, params: UsageQueryParams): Promise<UsageHistoryResult> {
    const allUsage = Array.from(this.usageHistory.values()).filter((u) => u.userId === userId);

    // Apply filters
    let filtered = allUsage;
    if (params.start_date) {
      filtered = filtered.filter((u) => u.createdAt >= new Date(params.start_date!));
    }
    if (params.end_date) {
      filtered = filtered.filter((u) => u.createdAt <= new Date(params.end_date!));
    }
    if (params.model_id) {
      filtered = filtered.filter((u) => u.modelId === params.model_id);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const total = filtered.length;
    const usage = filtered.slice(offset, offset + limit);

    // Calculate summary
    const summary = {
      total_credits_used: filtered.reduce((sum, u) => sum + u.creditsUsed, 0),
      total_requests: filtered.length,
      total_tokens: filtered.reduce((sum, u) => sum + (u.totalTokens || 0), 0),
    };

    return {
      usage,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + limit < total,
      },
      summary,
    };
  }

  async getUsageStats(
    userId: string,
    params: UsageStatsQueryParams
  ): Promise<UsageStatsResult> {
    const allUsage = Array.from(this.usageHistory.values()).filter((u) => u.userId === userId);

    // Apply filters
    let filtered = allUsage;
    if (params.start_date) {
      filtered = filtered.filter((u) => u.createdAt >= new Date(params.start_date!));
    }
    if (params.end_date) {
      filtered = filtered.filter((u) => u.createdAt <= new Date(params.end_date!));
    }

    // Group by specified dimension
    const stats: UsageStatsItem[] = [];
    const total = {
      credits_used: filtered.reduce((sum, u) => sum + u.creditsUsed, 0),
      requests_count: filtered.length,
      tokens_total: filtered.reduce((sum, u) => sum + (u.totalTokens || 0), 0),
      average_duration_ms:
        filtered.length > 0
          ? filtered.reduce((sum, u) => sum + (u.requestDurationMs || 0), 0) / filtered.length
          : 0,
    };

    return { stats, total };
  }

  async getUserUsage(userId: string, limit = 100): Promise<UsageHistory[]> {
    return Array.from(this.usageHistory.values())
      .filter((u) => u.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getUsageByModel(userId: string, modelId: string): Promise<UsageHistory[]> {
    return Array.from(this.usageHistory.values())
      .filter((u) => u.userId === userId && u.modelId === modelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserUsageStats(userId: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCredits: number;
    byModel: Record<string, { requests: number; tokens: number; credits: number }>;
  }> {
    const userUsage = Array.from(this.usageHistory.values()).filter(
      (u) => u.userId === userId
    );

    const byModel: Record<string, { requests: number; tokens: number; credits: number }> = {};

    userUsage.forEach((usage) => {
      if (!byModel[usage.modelId]) {
        byModel[usage.modelId] = { requests: 0, tokens: 0, credits: 0 };
      }
      byModel[usage.modelId].requests++;
      byModel[usage.modelId].tokens += usage.totalTokens || 0;
      byModel[usage.modelId].credits += usage.creditsUsed;
    });

    return {
      totalRequests: userUsage.length,
      totalTokens: userUsage.reduce((sum, u) => sum + (u.totalTokens || 0), 0),
      totalCredits: userUsage.reduce((sum, u) => sum + u.creditsUsed, 0),
      byModel,
    };
  }

  // Test helpers
  clear() {
    this.usageHistory.clear();
  }

  seed(usage: UsageHistory[]) {
    usage.forEach((u) => this.usageHistory.set(u.id, u));
  }

  getAll(): UsageHistory[] {
    return Array.from(this.usageHistory.values());
  }
}
