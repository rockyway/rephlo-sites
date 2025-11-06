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
  await db.usageHistory.deleteMany();
  await db.credits.deleteMany();
  await db.subscriptions.deleteMany();
  await db.userPreferences.deleteMany();
  await db.webhookConfiguration.deleteMany();
  await db.users.deleteMany();
  // Don't delete models and oauth_clients as they are seeded
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
 * Seed test data (models and oauth clients)
 */
export const seedTestData = async (): Promise<void> => {
  const db = getTestDatabase();

  // Check if oauth_clients exist
  const clientCount = await db.oAuthClient.count();
  if (clientCount === 0) {
    // Seed oauth client
    await db.oAuthClient.create({
      data: {
        clientId: 'textassistant-desktop',
        clientName: 'Text Assistant Desktop',
        clientSecretHash: null,
        redirectUris: ['http://localhost:8080/callback'],
        grantTypes: ['authorization_code', 'refresh_token'],
        responseTypes: ['code'],
        scope: 'openid email profile llm.inference models.read user.info credits.read',
        isActive: true,
      },
    });
  }

  // Check if models exist
  const modelCount = await db.model.count();
  if (modelCount === 0) {
    // Seed models
    await db.model.createMany({
      data: [
        {
          id: 'gpt-5',
          name: 'gpt-5',
          displayName: 'GPT-5',
          provider: 'openai',
          description: 'Latest GPT model with enhanced reasoning',
          capabilities: ['text', 'vision', 'function_calling'],
          contextLength: 128000,
          maxOutputTokens: 4096,
          inputCostPerMillionTokens: 500,
          outputCostPerMillionTokens: 1500,
          creditsPerKTokens: 2,
          isAvailable: true,
          isDeprecated: false,
          version: '1.0',
        },
        {
          id: 'gemini-2.0-pro',
          name: 'gemini-2.0-pro',
          displayName: 'Gemini 2.0 Pro',
          provider: 'google',
          description: "Google's most capable model",
          capabilities: ['text', 'vision', 'long_context'],
          contextLength: 2000000,
          maxOutputTokens: 8192,
          inputCostPerMillionTokens: 350,
          outputCostPerMillionTokens: 1050,
          creditsPerKTokens: 1,
          isAvailable: true,
          isDeprecated: false,
          version: '2.0',
        },
        {
          id: 'claude-3.5-sonnet',
          name: 'claude-3.5-sonnet',
          displayName: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          description: "Anthropic's balanced model",
          capabilities: ['text', 'vision', 'code'],
          contextLength: 200000,
          maxOutputTokens: 4096,
          inputCostPerMillionTokens: 300,
          outputCostPerMillionTokens: 1500,
          creditsPerKTokens: 2,
          isAvailable: true,
          isDeprecated: false,
          version: '3.5',
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
