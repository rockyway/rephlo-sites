import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { UsageService } from '../../../src/services/usage.service';
import { getTestDatabase, cleanDatabase } from '../../setup/database';
import {
  createTestUser,
  createTestSubscription,
  createTestCredits,
  createTestUsageHistory,
} from '../../helpers/factories';

describe('UsageService', () => {
  let prisma: PrismaClient;
  let usageService: UsageService;

  beforeEach(async () => {
    prisma = getTestDatabase();
    usageService = new UsageService(prisma);
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  // ===========================================================================
  // Record Usage
  // ===========================================================================

  describe('recordUsage', () => {
    it('should record usage successfully', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      const usage = await usageService.recordUsage({
        userId: user.id,
        creditId: credits.id,
        modelId: 'gpt-5',
        operation: 'chat',
        creditsUsed: 10,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        requestDurationMs: 1500,
        requestMetadata: { test: 'data' },
      });

      expect(usage).toBeDefined();
      expect(usage.userId).toBe(user.id);
      expect(usage.creditId).toBe(credits.id);
      expect(usage.modelId).toBe('gpt-5');
      expect(usage.operation).toBe('chat');
      expect(usage.creditsUsed).toBe(10);
      expect(usage.inputTokens).toBe(100);
      expect(usage.outputTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
    });

    it('should record completion operation', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      const usage = await usageService.recordUsage({
        userId: user.id,
        creditId: credits.id,
        modelId: 'claude-3.5-sonnet',
        operation: 'completion',
        creditsUsed: 5,
        inputTokens: 50,
        outputTokens: 30,
        totalTokens: 80,
        requestDurationMs: 800,
      });

      expect(usage.operation).toBe('completion');
      expect(usage.modelId).toBe('claude-3.5-sonnet');
    });
  });

  // ===========================================================================
  // Get Usage History
  // ===========================================================================

  describe('getUsageHistory', () => {
    it('should get usage history with pagination', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      // Create multiple usage records
      for (let i = 0; i < 5; i++) {
        await createTestUsageHistory(prisma, user.id, credits.id, {
          creditsUsed: 2 * (i + 1),
        });
      }

      const result = await usageService.getUsageHistory(user.id, {
        limit: 3,
        offset: 0,
      });

      expect(result.usage).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.has_more).toBe(true);
      expect(result.summary.total_requests).toBe(5);
      expect(result.summary.total_credits_used).toBe(2 + 4 + 6 + 8 + 10);
    });

    it('should filter by date range', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-01-15'),
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-02-15'), // Outside range
      });

      const result = await usageService.getUsageHistory(user.id, {
        limit: 10,
        offset: 0,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      expect(result.usage).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by model ID', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'gpt-5',
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'claude-3.5-sonnet',
      });

      const result = await usageService.getUsageHistory(user.id, {
        limit: 10,
        offset: 0,
        model_id: 'gpt-5',
      });

      expect(result.usage).toHaveLength(1);
      expect(result.usage[0].modelId).toBe('gpt-5');
    });

    it('should filter by operation type', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        operation: 'chat',
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        operation: 'completion',
      });

      const result = await usageService.getUsageHistory(user.id, {
        limit: 10,
        offset: 0,
        operation: 'chat',
      });

      expect(result.usage).toHaveLength(1);
      expect(result.usage[0].operation).toBe('chat');
    });

    it('should return empty result for user with no usage', async () => {
      const user = await createTestUser(prisma);

      const result = await usageService.getUsageHistory(user.id, {
        limit: 10,
        offset: 0,
      });

      expect(result.usage).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.summary.total_requests).toBe(0);
      expect(result.summary.total_credits_used).toBe(0);
    });

    it('should handle pagination offset correctly', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      for (let i = 0; i < 10; i++) {
        await createTestUsageHistory(prisma, user.id, credits.id);
      }

      const result = await usageService.getUsageHistory(user.id, {
        limit: 5,
        offset: 5,
      });

      expect(result.usage).toHaveLength(5);
      expect(result.pagination.offset).toBe(5);
      expect(result.pagination.has_more).toBe(false);
    });
  });

  // ===========================================================================
  // Get Usage Statistics
  // ===========================================================================

  describe('getUsageStats', () => {
    it('should get stats grouped by day', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-01-15'),
        creditsUsed: 5,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-01-16'),
        creditsUsed: 10,
      });

      const result = await usageService.getUsageStats(user.id, {
        group_by: 'day',
      });

      expect(result.stats.length).toBeGreaterThanOrEqual(2);
      expect(result.total.credits_used).toBeGreaterThanOrEqual(15);
    });

    it('should get stats grouped by model', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'gpt-5',
        creditsUsed: 5,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'claude-3.5-sonnet',
        creditsUsed: 10,
      });

      const result = await usageService.getUsageStats(user.id, {
        group_by: 'model',
      });

      expect(result.stats).toHaveLength(2);
      const gptStats = result.stats.find(s => s.model_id === 'gpt-5');
      const claudeStats = result.stats.find(s => s.model_id === 'claude-3.5-sonnet');

      expect(gptStats?.credits_used).toBe(5);
      expect(claudeStats?.credits_used).toBe(10);
    });

    it('should filter stats by date range', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-01-15'),
        creditsUsed: 5,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-02-15'),
        creditsUsed: 10,
      });

      const result = await usageService.getUsageStats(user.id, {
        group_by: 'model',
        start_date: new Date('2024-01-01').toISOString(),
        end_date: new Date('2024-01-31').toISOString(),
      });

      expect(result.total.credits_used).toBe(5);
    });
  });

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  describe('getTotalCreditsUsed', () => {
    it('should get total credits used', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        creditsUsed: 10,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        creditsUsed: 15,
      });

      const total = await usageService.getTotalCreditsUsed(user.id);

      expect(total).toBe(25);
    });

    it('should filter by date range', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-01-15'),
        creditsUsed: 10,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-02-15'),
        creditsUsed: 15,
      });

      const total = await usageService.getTotalCreditsUsed(
        user.id,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(total).toBe(10);
    });

    it('should return 0 for user with no usage', async () => {
      const user = await createTestUser(prisma);

      const total = await usageService.getTotalCreditsUsed(user.id);

      expect(total).toBe(0);
    });
  });

  describe('getModelUsageCount', () => {
    it('should get usage count for specific model', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'gpt-5',
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'gpt-5',
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'claude-3.5-sonnet',
      });

      const count = await usageService.getModelUsageCount(user.id, 'gpt-5');

      expect(count).toBe(2);
    });

    it('should return 0 for unused model', async () => {
      const user = await createTestUser(prisma);

      const count = await usageService.getModelUsageCount(user.id, 'gpt-5');

      expect(count).toBe(0);
    });
  });

  describe('getMostUsedModel', () => {
    it('should get most used model', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'gpt-5',
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'gpt-5',
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        modelId: 'claude-3.5-sonnet',
      });

      const mostUsed = await usageService.getMostUsedModel(user.id);

      expect(mostUsed).toBe('gpt-5');
    });

    it('should return null for user with no usage', async () => {
      const user = await createTestUser(prisma);

      const mostUsed = await usageService.getMostUsedModel(user.id);

      expect(mostUsed).toBeNull();
    });
  });

  describe('getAverageTokensPerRequest', () => {
    it('should calculate average tokens per request', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        totalTokens: 100,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        totalTokens: 200,
      });
      await createTestUsageHistory(prisma, user.id, credits.id, {
        totalTokens: 300,
      });

      const average = await usageService.getAverageTokensPerRequest(user.id);

      expect(average).toBe(200);
    });

    it('should return 0 for user with no usage', async () => {
      const user = await createTestUser(prisma);

      const average = await usageService.getAverageTokensPerRequest(user.id);

      expect(average).toBe(0);
    });
  });

  describe('getUsageTrend', () => {
    it('should calculate usage trend percentage', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      // Previous period: 100 credits
      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-01-15'),
        creditsUsed: 100,
      });

      // Current period: 150 credits
      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-02-15'),
        creditsUsed: 150,
      });

      const trend = await usageService.getUsageTrend(
        user.id,
        new Date('2024-02-01'),
        new Date('2024-02-28'),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // 50% increase
      expect(trend).toBe(50);
    });

    it('should return 100 when previous usage was 0', async () => {
      const user = await createTestUser(prisma);
      const subscription = await createTestSubscription(prisma, user.id);
      const credits = await createTestCredits(prisma, user.id, subscription.id);

      await createTestUsageHistory(prisma, user.id, credits.id, {
        createdAt: new Date('2024-02-15'),
        creditsUsed: 50,
      });

      const trend = await usageService.getUsageTrend(
        user.id,
        new Date('2024-02-01'),
        new Date('2024-02-28'),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(trend).toBe(100);
    });

    it('should return 0 when both periods have no usage', async () => {
      const user = await createTestUser(prisma);

      const trend = await usageService.getUsageTrend(
        user.id,
        new Date('2024-02-01'),
        new Date('2024-02-28'),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(trend).toBe(0);
    });
  });
});
