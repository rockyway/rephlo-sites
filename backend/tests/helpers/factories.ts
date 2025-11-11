import { faker } from '@faker-js/faker';
import { PrismaClient, User, Subscription, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { hashPassword } from '../../src/utils/hash';

/**
 * Factory function to create test users
 */
export const createTestUser = async (
  prisma: PrismaClient,
  overrides: Partial<User> = {}
): Promise<User> => {
  const email = overrides.email || faker.internet.email();
  const passwordHash = await hashPassword('password123');

  return prisma.user.create({
    data: {
      email,
      emailVerified: true,
      username: overrides.username || faker.internet.username(),
      passwordHash,
      firstName: overrides.firstName || faker.person.firstName(),
      lastName: overrides.lastName || faker.person.lastName(),
      profilePictureUrl: overrides.profilePictureUrl || faker.image.avatar(),
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

  return prisma.credits.create({
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
 * Factory function to create usage history
 */
export const createTestUsageHistory = async (
  prisma: PrismaClient,
  userId: string,
  creditId: string,
  overrides: Partial<any> = {}
) => {
  return prisma.usageHistory.create({
    data: {
      userId,
      creditId,
      modelId: overrides.modelId || 'gpt-5',
      operation: overrides.operation || 'chat',
      creditsUsed: overrides.creditsUsed || 2,
      inputTokens: overrides.inputTokens || 100,
      outputTokens: overrides.outputTokens || 50,
      totalTokens: overrides.totalTokens || 150,
      requestDurationMs: overrides.requestDurationMs || 1000,
      requestMetadata: overrides.requestMetadata || {},
      ...overrides,
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
  return prisma.userPreferences.create({
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
  return prisma.webhookConfiguration.create({
    data: {
      userId,
      url: overrides.url || faker.internet.url(),
      events: overrides.events || ['subscription.created', 'credits.depleted'],
      secret: overrides.secret || faker.string.alphanumeric(32),
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
