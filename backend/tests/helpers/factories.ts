import { PrismaClient, User, Subscription, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Factory function to create test users
 */
export const createTestUser = async (
  prisma: PrismaClient,
  overrides: Partial<User> = {}
): Promise<User> => {
  const randomId = crypto.randomBytes(4).toString('hex');
  const email = overrides.email || `test-${randomId}@example.com`;
  const passwordHash = await bcrypt.hash('password123', 10);

  return prisma.user.create({
    data: {
      email,
      emailVerified: true,
      username: overrides.username || `testuser${randomId}`,
      passwordHash,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      profilePictureUrl: overrides.profilePictureUrl || 'https://example.com/avatar.jpg',
      isActive: overrides.isActive ?? true,
      ...overrides,
    },
  });
};

/**
 * Factory function to create test subscriptions
 */
export const createTestSubscription = async (
  prisma: PrismaClient,
  userId: string,
  overrides: Partial<Subscription> = {}
): Promise<Subscription> => {
  const tier = overrides.tier || SubscriptionTier.free;
  const creditsPerMonth = tier === SubscriptionTier.free ? 5000 : tier === SubscriptionTier.pro ? 100000 : 1000000;
  const priceCents = tier === SubscriptionTier.free ? 0 : tier === SubscriptionTier.pro ? 2999 : 19900;

  const currentPeriodStart = overrides.currentPeriodStart || new Date();
  const currentPeriodEnd = overrides.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return prisma.subscription.create({
    data: {
      userId,
      tier,
      status: overrides.status || SubscriptionStatus.active,
      creditsPerMonth,
      creditsRollover: overrides.creditsRollover ?? false,
      priceCents,
      billingInterval: overrides.billingInterval || 'monthly',
      currentPeriodStart,
      currentPeriodEnd,
      stripeSubscriptionId: overrides.stripeSubscriptionId || null,
      stripeCustomerId: overrides.stripeCustomerId || null,
      trialEnd: overrides.trialEnd || null,
      ...overrides,
    },
  });
};

/**
 * Factory function to create test credits
 */
export const createTestCredits = async (
  prisma: PrismaClient,
  userId: string,
  subscriptionId: string,
  overrides: Partial<any> = {}
) => {
  const totalCredits = overrides.totalCredits || 100000;
  const usedCredits = overrides.usedCredits || 0;
  const billingPeriodStart = overrides.billingPeriodStart || new Date();
  const billingPeriodEnd = overrides.billingPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return prisma.credit.create({
    data: {
      userId,
      subscriptionId,
      totalCredits,
      usedCredits,
      billingPeriodStart,
      billingPeriodEnd,
      isCurrent: overrides.isCurrent ?? true,
      ...overrides,
    },
  });
};

/**
 * Factory function to create token usage ledger record
 * Maps to the actual token_usage_ledger table
 */
export const createTestUsageHistory = async (
  prisma: PrismaClient,
  userId: string,
  providerId: string, // Changed from creditId to providerId
  overrides: Partial<any> = {}
) => {
  const requestStartedAt = overrides.createdAt || new Date();
  const requestCompletedAt = new Date(requestStartedAt.getTime() + (overrides.requestDurationMs || 1000));

  // Generate a pseudo-random UUID v4 for requestId if not provided
  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  return prisma.tokenUsageLedger.create({
    data: {
      userId,
      providerId,
      modelId: overrides.modelId || 'gpt-5',
      inputTokens: overrides.inputTokens || overrides.promptTokens || 100,
      outputTokens: overrides.outputTokens || overrides.completionTokens || 50,
      cachedInputTokens: overrides.cachedInputTokens || 0,
      creditsDeducted: overrides.creditsUsed || overrides.creditsDeducted || 2,
      vendorCost: overrides.vendorCost || 0.001,
      marginMultiplier: overrides.marginMultiplier || 2.5,
      creditValueUsd: overrides.creditValueUsd || 0.001,
      grossMarginUsd: overrides.grossMarginUsd || 0.0015,
      requestType: overrides.requestType || 'completion',
      requestStartedAt,
      requestCompletedAt,
      processingTimeMs: overrides.requestDurationMs || 1000,
      requestId: overrides.requestId || generateUuid(),
      status: overrides.status || 'success',
      userTierAtRequest: overrides.userTierAtRequest || 'pro',
      subscriptionId: overrides.subscriptionId || null,
      streamingSegments: overrides.streamingSegments || null,
      errorMessage: overrides.errorMessage || null,
      isStreamingComplete: overrides.isStreamingComplete !== undefined ? overrides.isStreamingComplete : true,
      region: overrides.region || null,
      deductionRecordId: overrides.deductionRecordId || null,
      createdAt: overrides.createdAt || requestStartedAt,
    },
  });
};

/**
 * Factory function to create user preferences
 */
export const createTestUserPreferences = async (
  prisma: PrismaClient,
  userId: string,
  overrides: Partial<any> = {}
) => {
  return prisma.userPreference.create({
    data: {
      userId,
      defaultModelId: overrides.defaultModelId || 'gpt-5',
      enableStreaming: overrides.enableStreaming ?? true,
      maxTokens: overrides.maxTokens || 4096,
      temperature: overrides.temperature || 0.7,
      preferencesMetadata: overrides.preferencesMetadata || {},
      ...overrides,
    },
  });
};

/**
 * Factory function to create webhook configuration
 */
export const createTestWebhookConfig = async (
  prisma: PrismaClient,
  userId: string,
  overrides: Partial<any> = {}
) => {
  const randomId = crypto.randomBytes(4).toString('hex');
  return prisma.webhookConfig.create({
    data: {
      userId,
      webhookUrl: overrides.webhookUrl || `https://example.com/webhook/${randomId}`,
      webhookSecret: overrides.webhookSecret || crypto.randomBytes(16).toString('hex'),
      isActive: overrides.isActive ?? true,
      ...overrides,
    },
  });
};

/**
 * Create a complete test user with subscription and credits
 */
export const createTestUserWithSubscription = async (
  prisma: PrismaClient,
  tier: SubscriptionTier = SubscriptionTier.pro
) => {
  const user = await createTestUser(prisma);
  const subscription = await createTestSubscription(prisma, user.id, { tier });
  const credits = await createTestCredits(prisma, user.id, subscription.id, {
    totalCredits: subscription.creditsPerMonth,
  });

  return { user, subscription, credits };
};
