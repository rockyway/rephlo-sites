import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let prisma: PrismaClient;

/**
 * Get or create test database client
 */
export const getTestDatabase = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
};

/**
 * Clean all tables in the database
 */
export const cleanDatabase = async (): Promise<void> => {
  const db = getTestDatabase();

  // Delete in order to respect foreign key constraints
  await db.credits.deleteMany(); // Updated to plural form
  await db.subscription_monetization.deleteMany(); // Updated to new table name
  await db.subscriptions.deleteMany(); // Legacy table (still exists for backward compatibility)
  await db.user_preferences.deleteMany(); // Updated to snake_case plural
  await db.webhook_configs.deleteMany(); // Updated to snake_case plural

  // Delete audit logs and ledger tables
  await db.$executeRawUnsafe('DELETE FROM model_tier_audit_logs');
  await db.$executeRawUnsafe('DELETE FROM token_usage_ledger');
  await db.$executeRawUnsafe('DELETE FROM credit_deduction_ledger');
  await db.$executeRawUnsafe('DELETE FROM token_usage_daily_summary');
  await db.$executeRawUnsafe('DELETE FROM user_credit_balance');
  await db.$executeRawUnsafe('DELETE FROM pricing_configs');

  await db.users.deleteMany(); // Updated to plural form
  // Don't delete models, oauth_clients, providers, or model_provider_pricing as they are seeded
};

/**
 * Reset database to clean state
 */
export const resetDatabase = async (): Promise<void> => {
  await cleanDatabase();
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
  }
};

/**
 * Run migrations (useful for integration tests)
 */
export const runMigrations = async (): Promise<void> => {
  try {
    await execAsync('npx prisma migrate deploy');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
};

/**
 * Seed test data (providers, models, and oauth clients)
 */
export const seedTestData = async (): Promise<void> => {
  const db = getTestDatabase();

  // Seed providers first (required for token_usage_ledger foreign key)
  const providerCount = await db.providers.count();
  if (providerCount === 0) {
    await db.providers.createMany({
      data: [
        {
          name: 'openai',
          api_type: 'openai',
          is_enabled: true,
          updated_at: new Date(),
        },
        {
          name: 'anthropic',
          api_type: 'anthropic',
          is_enabled: true,
          updated_at: new Date(),
        },
        {
          name: 'google',
          api_type: 'gemini',
          is_enabled: true,
          updated_at: new Date(),
        },
      ],
    });
  }

  // Check if oauth_clients exist
  const clientCount = await db.oauth_clients.count();
  if (clientCount === 0) {
    // Seed oauth client
    await db.oauth_clients.create({
      data: {
        client_id: 'textassistant-desktop',
        client_name: 'Text Assistant Desktop',
        client_secret_hash: null,
        redirect_uris: ['http://localhost:8080/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'openid email profile llm.inference models.read user.info credits.read',
        is_active: true,
      },
    });
  }

  // Check if models exist
  const modelCount = await db.models.count();
  if (modelCount === 0) {
    // Seed models with new JSONB meta structure
    await db.models.createMany({
      data: [
        {
          id: 'gpt-5',
          name: 'gpt-5',
          provider: 'openai',
          is_available: true,
          is_legacy: false,
          is_archived: false,
          meta: {
            displayName: 'GPT-5',
            description: 'Latest GPT model with enhanced reasoning',
            version: '1.0',
            capabilities: ['text', 'vision', 'function_calling'],
            contextLength: 128000,
            maxOutputTokens: 4096,
            inputCostPerMillionTokens: 500,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 2,
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
          },
        },
        {
          id: 'gemini-2.0-pro',
          name: 'gemini-2.0-pro',
          provider: 'google',
          is_available: true,
          is_legacy: false,
          is_archived: false,
          meta: {
            displayName: 'Gemini 2.0 Pro',
            description: "Google's most capable model",
            version: '2.0',
            capabilities: ['text', 'vision', 'long_context'],
            contextLength: 2000000,
            maxOutputTokens: 8192,
            inputCostPerMillionTokens: 350,
            outputCostPerMillionTokens: 1050,
            creditsPer1kTokens: 1,
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
          },
        },
        {
          id: 'claude-3.5-sonnet',
          name: 'claude-3.5-sonnet',
          provider: 'anthropic',
          is_available: true,
          is_legacy: false,
          is_archived: false,
          meta: {
            displayName: 'Claude 3.5 Sonnet',
            description: "Anthropic's balanced model",
            version: '3.5',
            capabilities: ['text', 'vision', 'code'],
            contextLength: 200000,
            maxOutputTokens: 4096,
            inputCostPerMillionTokens: 300,
            outputCostPerMillionTokens: 1500,
            creditsPer1kTokens: 2,
            requiredTier: 'free',
            tierRestrictionMode: 'minimum',
            allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
          },
        },
      ],
    });
  }
};

/**
 * Setup database for tests
 */
export const setupTestDatabase = async (): Promise<void> => {
  await resetDatabase();
  await seedTestData();
};

/**
 * Transaction wrapper for test isolation
 */
export const withTransaction = async <T>(
  callback: (db: PrismaClient) => Promise<T>
): Promise<T> => {
  const db = getTestDatabase();

  try {
    const result = await callback(db);
    return result;
  } finally {
    // Cleanup happens in afterEach hooks
  }
};
