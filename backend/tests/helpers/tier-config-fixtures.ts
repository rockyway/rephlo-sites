/**
 * Test Fixtures and Helpers for Plan 190 - Tier Credit Management
 *
 * Provides factory functions and test data for:
 * - Tier configurations
 * - Tier configuration history
 * - Subscription monetization records
 * - Credit allocations
 * - User credit balances
 */

import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'crypto';

// =============================================================================
// Tier Configuration Fixtures
// =============================================================================

/**
 * Create test tier configuration
 */
export const createTestTierConfig = async (
  prisma: PrismaClient,
  tierName: string = 'pro',
  overrides: Partial<any> = {}
) => {
  const defaults = {
    id: crypto.randomUUID(),
    tier_name: tierName,
    monthly_price_usd: new Prisma.Decimal(tierName === 'free' ? 0 : tierName === 'pro' ? 15 : 50),
    annual_price_usd: new Prisma.Decimal(tierName === 'free' ? 0 : tierName === 'pro' ? 150 : 500),
    monthly_credit_allocation: tierName === 'free' ? 1000 : tierName === 'pro' ? 1500 : 5000,
    max_credit_rollover: tierName === 'free' ? 0 : tierName === 'pro' ? 1500 : 5000,
    features: {},
    is_active: true,
    config_version: 1,
    last_modified_by: null,
    last_modified_at: new Date(),
    apply_to_existing_users: false,
    rollout_start_date: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return prisma.subscription_tier_config.create({
    data: {
      ...defaults,
      ...overrides,
    },
  });
};

/**
 * Create test tier configuration history record
 */
export const createTestTierConfigHistory = async (
  prisma: PrismaClient,
  tierConfigId: string,
  tierName: string,
  overrides: Partial<any> = {}
) => {
  const defaults = {
    id: crypto.randomUUID(),
    tier_config_id: tierConfigId,
    tier_name: tierName,
    previous_credits: 1000,
    new_credits: 1500,
    previous_price_usd: new Prisma.Decimal(10),
    new_price_usd: new Prisma.Decimal(15),
    change_reason: 'Test configuration change',
    change_type: 'credit_increase',
    affected_users_count: 0,
    changed_by: 'admin-test-123',
    changed_at: new Date(),
    applied_at: new Date(),
  };

  return prisma.tier_config_history.create({
    data: {
      ...defaults,
      ...overrides,
    },
  });
};

// =============================================================================
// Subscription Monetization Fixtures
// =============================================================================

/**
 * Create test subscription monetization record
 */
export const createTestSubscriptionMonetization = async (
  prisma: PrismaClient,
  userId: string,
  tierName: string = 'pro',
  overrides: Partial<any> = {}
) => {
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const defaults = {
    id: crypto.randomUUID(),
    user_id: userId,
    tier: tierName,
    status: 'active',
    monthly_credit_allocation: tierName === 'free' ? 1000 : tierName === 'pro' ? 1500 : 5000,
    stripe_subscription_id: `sub_test_${crypto.randomBytes(8).toString('hex')}`,
    stripe_customer_id: `cus_test_${crypto.randomBytes(8).toString('hex')}`,
    stripe_price_id: `price_${tierName}_monthly`,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return prisma.subscription_monetization.create({
    data: {
      ...defaults,
      ...overrides,
    },
  });
};

// =============================================================================
// Credit Allocation Fixtures
// =============================================================================

/**
 * Create test credit allocation record
 */
export const createTestCreditAllocation = async (
  prisma: PrismaClient,
  userId: string,
  subscriptionId: string,
  overrides: Partial<any> = {}
) => {
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const defaults = {
    id: crypto.randomUUID(),
    user_id: userId,
    subscription_id: subscriptionId,
    amount: 1500,
    allocation_period_start: periodStart,
    allocation_period_end: periodEnd,
    source: 'subscription_renewal',
    created_at: new Date(),
  };

  return prisma.credit_allocation.create({
    data: {
      ...defaults,
      ...overrides,
    },
  });
};

// =============================================================================
// User Credit Balance Fixtures
// =============================================================================

/**
 * Create test user credit balance
 */
export const createTestUserCreditBalance = async (
  prisma: PrismaClient,
  userId: string,
  overrides: Partial<any> = {}
) => {
  const defaults = {
    user_id: userId,
    amount: 1500,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return prisma.user_credit_balance.create({
    data: {
      ...defaults,
      ...overrides,
    },
  });
};

// =============================================================================
// Complete Test Scenarios
// =============================================================================

/**
 * Create a complete test user with subscription, credit allocation, and balance
 */
export const createTestUserWithSubscription = async (
  prisma: PrismaClient,
  tierName: string = 'pro',
  credits: number = 1500
) => {
  // Import createTestUser from factories
  const randomId = crypto.randomBytes(4).toString('hex');
  const email = `test-${randomId}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      emailVerified: true,
      username: `testuser${randomId}`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Dummy hash
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    },
  });

  const subscription = await createTestSubscriptionMonetization(prisma, user.id, tierName, {
    monthly_credit_allocation: credits,
  });

  const allocation = await createTestCreditAllocation(prisma, user.id, subscription.id, {
    amount: credits,
  });

  const balance = await createTestUserCreditBalance(prisma, user.id, {
    amount: credits,
  });

  return { user, subscription, allocation, balance };
};

/**
 * Create multiple test users on same tier
 */
export const createTestUsersOnTier = async (
  prisma: PrismaClient,
  tierName: string,
  count: number,
  credits: number
) => {
  const users = [];

  for (let i = 0; i < count; i++) {
    const userData = await createTestUserWithSubscription(prisma, tierName, credits);
    users.push(userData);
  }

  return users;
};

/**
 * Create tier with history
 */
export const createTierWithHistory = async (
  prisma: PrismaClient,
  tierName: string,
  historyCount: number = 3
) => {
  const tierConfig = await createTestTierConfig(prisma, tierName);
  const history = [];

  for (let i = 0; i < historyCount; i++) {
    const historyRecord = await createTestTierConfigHistory(
      prisma,
      tierConfig.id,
      tierName,
      {
        previous_credits: 1000 + i * 500,
        new_credits: 1500 + i * 500,
        changed_at: new Date(Date.now() - (historyCount - i) * 24 * 60 * 60 * 1000),
      }
    );
    history.push(historyRecord);
  }

  return { tierConfig, history };
};

/**
 * Create scheduled rollout scenario
 */
export const createScheduledRolloutScenario = async (
  prisma: PrismaClient,
  tierName: string,
  rolloutDate: Date
) => {
  const tierConfig = await createTestTierConfig(prisma, tierName, {
    monthly_credit_allocation: 2000,
    apply_to_existing_users: true,
    rollout_start_date: rolloutDate,
    config_version: 2,
  });

  const history = await createTestTierConfigHistory(prisma, tierConfig.id, tierName, {
    previous_credits: 1500,
    new_credits: 2000,
    change_type: 'credit_increase',
    applied_at: null, // Not yet applied
  });

  // Create some users on this tier with old allocation
  const users = await createTestUsersOnTier(prisma, tierName, 3, 1500);

  return { tierConfig, history, users };
};

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Clean up tier configuration test data
 */
export const cleanupTierConfigTestData = async (prisma: PrismaClient) => {
  // Delete in order to respect foreign key constraints
  await prisma.tier_config_history.deleteMany();
  await prisma.subscription_tier_config.deleteMany();
  await prisma.credit_allocation.deleteMany();
  await prisma.user_credit_balance.deleteMany();
  await prisma.subscription_monetization.deleteMany();
};

/**
 * Clean up specific tier test data
 */
export const cleanupTierTestData = async (prisma: PrismaClient, tierName: string) => {
  await prisma.tier_config_history.deleteMany({
    where: { tier_name: tierName },
  });

  await prisma.subscription_tier_config.deleteMany({
    where: { tier_name: tierName },
  });

  await prisma.subscription_monetization.deleteMany({
    where: { tier: tierName as any },
  });
};

// =============================================================================
// Mock Admin User
// =============================================================================

/**
 * Create mock admin user for testing
 */
export const createMockAdminUser = async (prisma: PrismaClient) => {
  const randomId = crypto.randomBytes(4).toString('hex');

  return prisma.user.create({
    data: {
      email: `admin-${randomId}@example.com`,
      emailVerified: true,
      username: `admin${randomId}`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      role: 'admin',
    },
  });
};

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Verify credit upgrade was applied correctly
 */
export const verifyCreditUpgrade = async (
  prisma: PrismaClient,
  userId: string,
  expectedCredits: number
): Promise<boolean> => {
  // Check subscription allocation
  const subscription = await prisma.subscription_monetization.findFirst({
    where: { user_id: userId, status: 'active' },
  });

  if (!subscription || subscription.monthly_credit_allocation !== expectedCredits) {
    return false;
  }

  // Check user credit balance
  const balance = await prisma.user_credit_balance.findUnique({
    where: { user_id: userId },
  });

  if (!balance) {
    return false;
  }

  // Check credit allocation exists
  const allocation = await prisma.credit_allocation.findFirst({
    where: {
      user_id: userId,
      subscription_id: subscription.id,
      source: 'admin_grant',
    },
  });

  return allocation !== null;
};

/**
 * Get tier config version
 */
export const getTierConfigVersion = async (
  prisma: PrismaClient,
  tierName: string
): Promise<number | null> => {
  const config = await prisma.subscription_tier_config.findUnique({
    where: { tier_name: tierName },
    select: { config_version: true },
  });

  return config?.config_version ?? null;
};

/**
 * Count users on tier with specific allocation
 */
export const countUsersWithAllocation = async (
  prisma: PrismaClient,
  tierName: string,
  allocation: number
): Promise<number> => {
  return prisma.subscription_monetization.count({
    where: {
      tier: tierName as any,
      status: 'active',
      monthly_credit_allocation: allocation,
    },
  });
};
