import { PrismaClient } from '@prisma/client';

/**
 * Assert that a user exists in the database
 */
export const assertUserExists = async (
  prisma: PrismaClient,
  email: string
): Promise<boolean> => {
  const user = await prisma.user.findUnique({ where: { email } });
  return user !== null;
};

/**
 * Assert that a subscription exists and is active
 */
export const assertActiveSubscription = async (
  prisma: PrismaClient,
  userId: string
): Promise<boolean> => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'active' },
  });
  return subscription !== null;
};

/**
 * Assert that credits match expected values
 */
export const assertCreditsMatch = async (
  prisma: PrismaClient,
  userId: string,
  expectedRemaining: number
): Promise<boolean> => {
  const credits = await prisma.credits.findFirst({
    where: { userId, isCurrent: true },
  });

  if (!credits) return false;

  const remaining = credits.totalCredits - credits.usedCredits;
  return remaining === expectedRemaining;
};

/**
 * Assert that usage history was recorded
 */
export const assertUsageRecorded = async (
  prisma: PrismaClient,
  userId: string,
  modelId: string
): Promise<boolean> => {
  const usage = await prisma.usageHistory.findFirst({
    where: { userId, modelId },
  });
  return usage !== null;
};

/**
 * Assert that webhook configuration exists
 */
export const assertWebhookConfigExists = async (
  prisma: PrismaClient,
  userId: string,
  url: string
): Promise<boolean> => {
  const config = await prisma.webhookConfiguration.findFirst({
    where: { userId, url },
  });
  return config !== null;
};

/**
 * Custom Jest matchers
 */
export const customMatchers = {
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = jwtRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
    };
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidJWT(): R;
    }
  }
}
