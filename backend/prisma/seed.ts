/**
 * Prisma Database Seed Script
 * Pre-populates essential reference data for the Dedicated API Backend
 * Including comprehensive test data for authentication testing
 *
 * Usage: npx prisma db seed
 */

import { PrismaClient, ModelCapability, SubscriptionTier, SubscriptionStatus, UsageOperation } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Salt rounds for password hashing (12 is recommended for production)
const SALT_ROUNDS = 12;

async function main() {
  console.log('Starting database seeding...');

  // =============================================================================
  // Seed OAuth Clients
  // =============================================================================
  console.log('\n[1/5] Seeding OAuth Clients...');

  const oauthClients = [
    {
      clientId: 'textassistant-desktop',
      clientName: 'Text Assistant Desktop',
      clientSecretHash: null, // Public client, no secret needed
      redirectUris: ['http://localhost:8080/callback'],
      grantTypes: ['authorization_code'], // refresh_token is built-in
      responseTypes: ['code'],
      scope: 'openid email profile llm.inference models.read user.info credits.read',
      isActive: true,
      config: {
        skipConsentScreen: true, // First-party trusted app, auto-approve consent
        description: 'Official desktop application for Text Assistant',
        tags: ['desktop-app', 'official'],
      },
    },
  ];

  for (const client of oauthClients) {
    await prisma.oAuthClient.upsert({
      where: { clientId: client.clientId },
      update: {
        clientName: client.clientName,
        redirectUris: client.redirectUris,
        grantTypes: client.grantTypes,
        responseTypes: client.responseTypes,
        scope: client.scope,
        isActive: client.isActive,
        config: client.config,
      },
      create: client,
    });
    console.log(`  ✓ Created/Updated OAuth client: ${client.clientId}`);
  }

  // =============================================================================
  // Seed Models
  // =============================================================================
  console.log('\n[2/5] Seeding LLM Models...');

  const models = [
    {
      id: 'gpt-5',
      name: 'gpt-5',
      displayName: 'GPT-5',
      provider: 'openai',
      description: 'Latest GPT model with enhanced reasoning capabilities',
      capabilities: [
        ModelCapability.text,
        ModelCapability.vision,
        ModelCapability.function_calling,
      ],
      contextLength: 128000,
      maxOutputTokens: 4096,
      inputCostPerMillionTokens: 500,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 2,
      isAvailable: true,
      isDeprecated: false,
      version: '1.0',
    },
    {
      id: 'gemini-2.0-pro',
      name: 'gemini-2.0-pro',
      displayName: 'Gemini 2.0 Pro',
      provider: 'google',
      description: "Google's most capable model with extended context",
      capabilities: [
        ModelCapability.text,
        ModelCapability.vision,
        ModelCapability.long_context,
      ],
      contextLength: 2000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 350,
      outputCostPerMillionTokens: 1050,
      creditsPer1kTokens: 1,
      isAvailable: true,
      isDeprecated: false,
      version: '2.0',
    },
    {
      id: 'claude-3.5-sonnet',
      name: 'claude-3.5-sonnet',
      displayName: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: "Anthropic's balanced model optimized for coding",
      capabilities: [
        ModelCapability.text,
        ModelCapability.vision,
        ModelCapability.code,
      ],
      contextLength: 200000,
      maxOutputTokens: 4096,
      inputCostPerMillionTokens: 300,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 2,
      isAvailable: true,
      isDeprecated: false,
      version: '3.5',
    },
  ];

  for (const model of models) {
    await prisma.model.upsert({
      where: { id: model.id },
      update: {
        name: model.name,
        displayName: model.displayName,
        provider: model.provider,
        description: model.description,
        capabilities: model.capabilities,
        contextLength: model.contextLength,
        maxOutputTokens: model.maxOutputTokens,
        inputCostPerMillionTokens: model.inputCostPerMillionTokens,
        outputCostPerMillionTokens: model.outputCostPerMillionTokens,
        creditsPer1kTokens: model.creditsPer1kTokens,
        isAvailable: model.isAvailable,
        isDeprecated: model.isDeprecated,
        version: model.version,
      },
      create: model,
    });
    console.log(`  ✓ Created/Updated model: ${model.displayName} (${model.id})`);
  }

  // =============================================================================
  // Seed Test Users with Subscriptions and Credits
  // =============================================================================
  console.log('\n[3/10] Seeding Test Users...');

  // =============================================================================
  // ADMIN USER
  // =============================================================================
  console.log('\n  📋 Admin User:');
  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rephlo.com' },
    update: {},
    create: {
      email: 'admin@rephlo.com',
      emailVerified: true,
      username: 'admin',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
    },
  });
  console.log(`    ✓ Admin: ${adminUser.email} / Admin@123`);

  // =============================================================================
  // REGULAR USERS (5 personas)
  // =============================================================================
  console.log('\n  👥 Regular Users:');

  // User 1: Developer - Active, verified, with API usage
  const devPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const developerUser = await prisma.user.upsert({
    where: { email: 'developer@example.com' },
    update: {},
    create: {
      email: 'developer@example.com',
      emailVerified: true,
      username: 'dev_user',
      passwordHash: devPassword,
      firstName: 'Dev',
      lastName: 'Developer',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T10:30:00Z'),
    },
  });
  console.log(`    ✓ Developer: ${developerUser.email} / User@123`);

  // User 2: Tester - Active but email not verified
  const testerPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const testerUser = await prisma.user.upsert({
    where: { email: 'tester@example.com' },
    update: {},
    create: {
      email: 'tester@example.com',
      emailVerified: false, // Not verified
      username: 'test_user',
      passwordHash: testerPassword,
      firstName: 'Test',
      lastName: 'Tester',
      isActive: true,
      authProvider: 'local',
      emailVerificationToken: 'test_verification_token_12345',
      emailVerificationTokenExpiry: new Date('2025-11-10T00:00:00Z'),
      lastLoginAt: new Date('2025-11-05T14:20:00Z'),
    },
  });
  console.log(`    ✓ Tester: ${testerUser.email} / User@123 (Email NOT verified)`);

  // User 3: Designer - Active, verified, recent signup
  const designerPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const designerUser = await prisma.user.upsert({
    where: { email: 'designer@example.com' },
    update: {},
    create: {
      email: 'designer@example.com',
      emailVerified: true,
      username: 'designer_pro',
      passwordHash: designerPassword,
      firstName: 'Sarah',
      lastName: 'Designer',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T09:15:00Z'),
    },
  });
  console.log(`    ✓ Designer: ${designerUser.email} / User@123`);

  // User 4: Manager - Deactivated account
  const managerPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      emailVerified: true,
      username: 'manager_user',
      passwordHash: managerPassword,
      firstName: 'John',
      lastName: 'Manager',
      isActive: false, // Deactivated
      authProvider: 'local',
      deactivatedAt: new Date('2025-11-03T16:00:00Z'),
      lastLoginAt: new Date('2025-11-03T15:45:00Z'),
    },
  });
  console.log(`    ✓ Manager: ${managerUser.email} / User@123 (DEACTIVATED)`);

  // User 5: Support - Active, with password reset token
  const supportPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const supportUser = await prisma.user.upsert({
    where: { email: 'support@example.com' },
    update: {},
    create: {
      email: 'support@example.com',
      emailVerified: true,
      username: 'support_agent',
      passwordHash: supportPassword,
      firstName: 'Support',
      lastName: 'Agent',
      isActive: true,
      authProvider: 'local',
      passwordResetToken: 'reset_token_abc123xyz',
      passwordResetTokenExpiry: new Date('2025-11-07T12:00:00Z'),
      lastLoginAt: new Date('2025-11-06T08:30:00Z'),
    },
  });
  console.log(`    ✓ Support: ${supportUser.email} / User@123 (Has password reset token)`);

  // =============================================================================
  // OAUTH USERS (Google)
  // =============================================================================
  console.log('\n  🔐 OAuth Users:');

  // OAuth User 1: Google authenticated user
  const googleUser = await prisma.user.upsert({
    where: { email: 'googleuser@gmail.com' },
    update: {},
    create: {
      email: 'googleuser@gmail.com',
      emailVerified: true, // Google verifies emails
      username: 'google_user',
      firstName: 'Google',
      lastName: 'User',
      googleId: 'mock_google_id_123456789',
      googleProfileUrl: 'https://lh3.googleusercontent.com/a/default-user',
      authProvider: 'google',
      isActive: true,
      lastLoginAt: new Date('2025-11-06T11:00:00Z'),
    },
  });
  console.log(`    ✓ Google User: ${googleUser.email} (OAuth)`);

  // OAuth User 2: Mixed auth (started with email, linked Google)
  const mixedAuthPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const mixedAuthUser = await prisma.user.upsert({
    where: { email: 'mixed@example.com' },
    update: {},
    create: {
      email: 'mixed@example.com',
      emailVerified: true,
      username: 'mixed_auth_user',
      passwordHash: mixedAuthPassword, // Has password
      googleId: 'mock_google_id_987654321', // Also linked Google
      googleProfileUrl: 'https://lh3.googleusercontent.com/a/mixed-user',
      authProvider: 'local', // Original provider
      firstName: 'Mixed',
      lastName: 'Auth',
      isActive: true,
      lastLoginAt: new Date('2025-11-06T07:45:00Z'),
    },
  });
  console.log(`    ✓ Mixed Auth: ${mixedAuthUser.email} / User@123 (Local + Google)`);

  // Legacy users from original seed (kept for backward compatibility)
  const freeUser = await prisma.user.upsert({
    where: { email: 'free@example.com' },
    update: {},
    create: {
      email: 'free@example.com',
      emailVerified: true,
      username: 'freetier',
      firstName: 'Free',
      lastName: 'User',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
    },
  });
  console.log(`    ✓ Free Tier: ${freeUser.email} (Legacy)`);

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@example.com' },
    update: {},
    create: {
      email: 'pro@example.com',
      emailVerified: true,
      username: 'protier',
      firstName: 'Pro',
      lastName: 'User',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
    },
  });
  console.log(`    ✓ Pro Tier: ${proUser.email} (Legacy)`);

  // =============================================================================
  // Seed Subscriptions
  // =============================================================================
  console.log('\n[4/5] Seeding Subscriptions...');

  // Free User Subscription
  // Check if subscription already exists first
  let freeSubscription = await prisma.subscription.findFirst({
    where: { userId: freeUser.id },
  });

  if (!freeSubscription) {
    freeSubscription = await prisma.subscription.create({
      data: {
        userId: freeUser.id,
      tier: SubscriptionTier.free,
      status: SubscriptionStatus.active,
      creditsPerMonth: 2000,
      creditsRollover: false,
      priceCents: 0,
      billingInterval: 'monthly',
        currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
        currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
      },
    });
  }
  console.log(`  ✓ Created/Updated subscription: Free tier for ${freeUser.email}`);

  // Pro User Subscription
  let proSubscription = await prisma.subscription.findFirst({
    where: { userId: proUser.id },
  });

  if (!proSubscription) {
    proSubscription = await prisma.subscription.create({
      data: {
        userId: proUser.id,
      tier: SubscriptionTier.pro,
      status: SubscriptionStatus.active,
      creditsPerMonth: 2000,
      creditsRollover: false,
      priceCents: 1999,
      billingInterval: 'monthly',
      currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
      currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
        stripeCustomerId: 'cus_test_pro_user',
        stripeSubscriptionId: 'sub_test_pro_user',
        stripePriceId: 'price_test_pro',
        cancelAtPeriodEnd: false,
      },
    });
  }
  console.log(`  ✓ Created/Updated subscription: Pro tier for ${proUser.email}`);

  // =============================================================================
  // Seed Credits
  // =============================================================================
  console.log('\n[5/8] Seeding Credits...');

  // Free User Credits (2000 monthly, 500 used)
  const existingFreeCredit = await prisma.credit.findFirst({
    where: {
      userId: freeUser.id,
      creditType: 'free',
      isCurrent: true,
    },
  });

  if (!existingFreeCredit) {
    await prisma.credit.create({
      data: {
        userId: freeUser.id,
        subscriptionId: freeSubscription.id,
      creditType: 'free',
      totalCredits: 2000,
      usedCredits: 500,
      monthlyAllocation: 2000,
      resetDayOfMonth: 1,
        billingPeriodStart: new Date('2025-11-01T00:00:00Z'),
        billingPeriodEnd: new Date('2025-12-01T00:00:00Z'),
        isCurrent: true,
      },
    });
  }
  console.log(`  ✓ Created free credits for ${freeUser.email}: 1500 remaining (500 used of 2000)`);

  // Pro User Credits - Free Tier (2000 monthly, 0 used)
  const existingProFreeCredit = await prisma.credit.findFirst({
    where: {
      userId: proUser.id,
      creditType: 'free',
      isCurrent: true,
    },
  });

  if (!existingProFreeCredit) {
    await prisma.credit.create({
      data: {
        userId: proUser.id,
        subscriptionId: proSubscription.id,
      creditType: 'free',
      totalCredits: 2000,
      usedCredits: 0,
      monthlyAllocation: 2000,
      resetDayOfMonth: 1,
        billingPeriodStart: new Date('2025-11-01T00:00:00Z'),
        billingPeriodEnd: new Date('2025-12-01T00:00:00Z'),
        isCurrent: true,
      },
    });
  }
  console.log(`  ✓ Created free credits for ${proUser.email}: 2000 remaining (0 used of 2000)`);

  // Pro User Credits - Pro Credits (10000 purchased, 5000 used)
  const existingProCredit = await prisma.credit.findFirst({
    where: {
      userId: proUser.id,
      creditType: 'pro',
      isCurrent: true,
    },
  });

  if (!existingProCredit) {
    await prisma.credit.create({
      data: {
        userId: proUser.id,
        subscriptionId: proSubscription.id,
      creditType: 'pro',
      totalCredits: 10000,
      usedCredits: 5000,
      monthlyAllocation: 0, // Pro credits don't reset monthly
      resetDayOfMonth: 1,
        billingPeriodStart: new Date('2024-01-01T00:00:00Z'),
        billingPeriodEnd: new Date('2099-12-31T23:59:59Z'), // No expiration
        isCurrent: true,
      },
    });
  }
  console.log(`  ✓ Created pro credits for ${proUser.email}: 5000 remaining (5000 used of 10000)`);

  // =============================================================================
  // Seed Usage History
  // =============================================================================
  console.log('\n[6/8] Seeding Usage History...');

  // Developer User - Active API usage
  const developerUsageRecords = [
    {
      userId: developerUser.id,
      creditId: null,
      modelId: 'gpt-5',
      operation: UsageOperation.chat,
      creditsUsed: 50,
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      requestDurationMs: 2345,
      requestMetadata: {
        temperature: 0.7,
        max_tokens: 500,
        endpoint: '/v1/chat/completions'
      },
      createdAt: new Date('2025-11-06T10:00:00Z'),
    },
    {
      userId: developerUser.id,
      creditId: null,
      modelId: 'claude-3.5-sonnet',
      operation: UsageOperation.completion,
      creditsUsed: 30,
      inputTokens: 800,
      outputTokens: 400,
      totalTokens: 1200,
      requestDurationMs: 1876,
      requestMetadata: {
        temperature: 0.5,
        max_tokens: 400,
        endpoint: '/v1/completions'
      },
      createdAt: new Date('2025-11-06T11:30:00Z'),
    },
    {
      userId: developerUser.id,
      creditId: null,
      modelId: 'gemini-2.0-pro',
      operation: UsageOperation.chat,
      creditsUsed: 20,
      inputTokens: 500,
      outputTokens: 300,
      totalTokens: 800,
      requestDurationMs: 1234,
      requestMetadata: {
        temperature: 0.8,
        max_tokens: 300,
        endpoint: '/v1/chat/completions'
      },
      createdAt: new Date('2025-11-06T13:15:00Z'),
    },
  ];

  for (const record of developerUsageRecords) {
    await prisma.usageHistory.create({ data: record });
  }
  console.log(`  ✓ Created ${developerUsageRecords.length} usage records for ${developerUser.email}`);

  // Pro User - High usage with various models
  const proUserUsageRecords = [
    {
      userId: proUser.id,
      creditId: null,
      modelId: 'gpt-5',
      operation: UsageOperation.chat,
      creditsUsed: 100,
      inputTokens: 2000,
      outputTokens: 1000,
      totalTokens: 3000,
      requestDurationMs: 3456,
      requestMetadata: {
        temperature: 0.7,
        max_tokens: 1000,
        endpoint: '/v1/chat/completions'
      },
      createdAt: new Date('2025-11-05T08:00:00Z'),
    },
    {
      userId: proUser.id,
      creditId: null,
      modelId: 'claude-3.5-sonnet',
      operation: UsageOperation.chat,
      creditsUsed: 75,
      inputTokens: 1500,
      outputTokens: 800,
      totalTokens: 2300,
      requestDurationMs: 2987,
      requestMetadata: {
        temperature: 0.6,
        max_tokens: 800,
        endpoint: '/v1/chat/completions'
      },
      createdAt: new Date('2025-11-05T14:30:00Z'),
    },
    {
      userId: proUser.id,
      creditId: null,
      modelId: 'gemini-2.0-pro',
      operation: UsageOperation.completion,
      creditsUsed: 40,
      inputTokens: 1000,
      outputTokens: 600,
      totalTokens: 1600,
      requestDurationMs: 1654,
      requestMetadata: {
        temperature: 0.9,
        max_tokens: 600,
        endpoint: '/v1/completions'
      },
      createdAt: new Date('2025-11-06T09:45:00Z'),
    },
  ];

  for (const record of proUserUsageRecords) {
    await prisma.usageHistory.create({ data: record });
  }
  console.log(`  ✓ Created ${proUserUsageRecords.length} usage records for ${proUser.email}`);

  // =============================================================================
  // Seed Webhook Configurations
  // =============================================================================
  console.log('\n[7/8] Seeding Webhook Configurations...');

  let devWebhookConfig;
  let proWebhookConfig;

  try {
    // Developer User - Active webhook config
    devWebhookConfig = await prisma.webhookConfig.create({
    data: {
      userId: developerUser.id,
      webhookUrl: 'https://webhook.site/developer-test-endpoint',
      webhookSecret: 'whsec_dev_test_secret_abc123',
      isActive: true,
    },
  });
    console.log(`  ✓ Created webhook config for ${developerUser.email}`);

    // Pro User - Active webhook config with custom endpoint
    proWebhookConfig = await prisma.webhookConfig.create({
      data: {
        userId: proUser.id,
        webhookUrl: 'https://api.example.com/webhooks/rephlo',
        webhookSecret: 'whsec_pro_secure_token_xyz789',
        isActive: true,
      },
    });
    console.log(`  ✓ Created webhook config for ${proUser.email}`);
  } catch (error) {
    console.log(`  ⚠ Skipped webhook configs (table may not exist yet)`);
  }

  // =============================================================================
  // Seed Webhook Logs
  // =============================================================================
  console.log('\n[8/8] Seeding Webhook Logs...');

  if (devWebhookConfig && proWebhookConfig) {
    try {
      // Developer User - Successful webhook deliveries
      const devWebhookLogs = [
    {
      webhookConfigId: devWebhookConfig.id,
      eventType: 'usage.threshold_reached',
      payload: {
        userId: developerUser.id,
        event: 'usage.threshold_reached',
        data: {
          threshold: 0.8,
          creditsUsed: 1600,
          creditsTotal: 2000,
          timestamp: '2025-11-06T10:00:00Z'
        }
      },
      status: 'success',
      statusCode: 200,
      responseBody: '{"received": true}',
      attempts: 1,
      createdAt: new Date('2025-11-06T10:00:05Z'),
      completedAt: new Date('2025-11-06T10:00:06Z'),
    },
    {
      webhookConfigId: devWebhookConfig.id,
      eventType: 'usage.recorded',
      payload: {
        userId: developerUser.id,
        event: 'usage.recorded',
        data: {
          modelId: 'gpt-5',
          creditsUsed: 50,
          timestamp: '2025-11-06T10:00:00Z'
        }
      },
      status: 'success',
      statusCode: 200,
      responseBody: '{"received": true}',
      attempts: 1,
      createdAt: new Date('2025-11-06T10:00:01Z'),
      completedAt: new Date('2025-11-06T10:00:02Z'),
    },
  ];

  for (const log of devWebhookLogs) {
    await prisma.webhookLog.create({ data: log });
  }
  console.log(`  ✓ Created ${devWebhookLogs.length} webhook logs for ${developerUser.email}`);

  // Pro User - Mix of successful and failed deliveries
  const proWebhookLogs = [
    {
      webhookConfigId: proWebhookConfig.id,
      eventType: 'subscription.updated',
      payload: {
        userId: proUser.id,
        event: 'subscription.updated',
        data: {
          tier: 'pro',
          status: 'active',
          timestamp: '2025-11-05T08:00:00Z'
        }
      },
      status: 'success',
      statusCode: 200,
      responseBody: '{"status": "ok"}',
      attempts: 1,
      createdAt: new Date('2025-11-05T08:00:01Z'),
      completedAt: new Date('2025-11-05T08:00:02Z'),
    },
    {
      webhookConfigId: proWebhookConfig.id,
      eventType: 'usage.recorded',
      payload: {
        userId: proUser.id,
        event: 'usage.recorded',
        data: {
          modelId: 'claude-3.5-sonnet',
          creditsUsed: 75,
          timestamp: '2025-11-05T14:30:00Z'
        }
      },
      status: 'failed',
      statusCode: 500,
      responseBody: '{"error": "Internal Server Error"}',
      errorMessage: 'HTTP 500: Webhook endpoint returned server error',
      attempts: 3,
      createdAt: new Date('2025-11-05T14:30:01Z'),
      completedAt: new Date('2025-11-05T14:30:15Z'),
    },
    {
      webhookConfigId: proWebhookConfig.id,
      eventType: 'usage.threshold_reached',
      payload: {
        userId: proUser.id,
        event: 'usage.threshold_reached',
        data: {
          threshold: 0.9,
          creditsUsed: 1800,
          creditsTotal: 2000,
          timestamp: '2025-11-06T09:45:00Z'
        }
      },
      status: 'pending',
      statusCode: null,
      responseBody: null,
      errorMessage: null,
      attempts: 0,
      createdAt: new Date('2025-11-06T09:45:01Z'),
      completedAt: null,
    },
  ];

      for (const log of proWebhookLogs) {
        await prisma.webhookLog.create({ data: log });
      }
      console.log(`  ✓ Created ${proWebhookLogs.length} webhook logs for ${proUser.email}`);
    } catch (error) {
      console.log(`  ⚠ Skipped webhook logs (table may not exist yet)`);
    }
  } else {
    console.log(`  ⚠ Skipped webhook logs (webhook configs not created)`);
  }

  // =============================================================================
  // Seed User Preferences
  // =============================================================================
  console.log('\n[9/9] Seeding User Preferences...');

  // Free User Preferences
  await prisma.userPreference.upsert({
    where: { userId: freeUser.id },
    update: {},
    create: {
      userId: freeUser.id,
      defaultModelId: 'gpt-5',
      enableStreaming: true,
      maxTokens: 4096,
      temperature: 0.7,
      emailNotifications: true,
      usageAlerts: true,
    },
  });
  console.log(`  ✓ Created preferences for ${freeUser.email}`);

  // Pro User Preferences
  await prisma.userPreference.upsert({
    where: { userId: proUser.id },
    update: {},
    create: {
      userId: proUser.id,
      defaultModelId: 'claude-3.5-sonnet',
      enableStreaming: true,
      maxTokens: 4096,
      temperature: 0.7,
      emailNotifications: true,
      usageAlerts: true,
    },
  });
  console.log(`  ✓ Created preferences for ${proUser.email}`);

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\n=============================================================================');
  console.log('SEEDED DATA SUMMARY');
  console.log('=============================================================================');
  console.log(`  📦 OAuth Clients: ${oauthClients.length}`);
  console.log(`  🤖 LLM Models: ${models.length}`);
  console.log(`  👤 Test Users: 10 (1 admin + 5 regular + 2 OAuth + 2 legacy)`);
  console.log(`  💳 Subscriptions: 2 (1 free tier, 1 pro tier)`);
  console.log(`  💰 Credit Records: 3 (1 free, 2 pro)`);
  console.log(`  📊 Usage History: 6 records (3 developer, 3 pro)`);
  if (devWebhookConfig && proWebhookConfig) {
    console.log(`  🔔 Webhook Configs: 2 (developer, pro)`);
    console.log(`  📝 Webhook Logs: 5 (2 developer success, 3 pro mixed)`);
  } else {
    console.log(`  🔔 Webhook Configs: Skipped (table not found)`);
    console.log(`  📝 Webhook Logs: Skipped (table not found)`);
  }
  console.log(`  ⚙️  User Preferences: 2`);

  console.log('\n=============================================================================');
  console.log('TEST USER CREDENTIALS');
  console.log('=============================================================================');
  console.log('\n🔐 Admin Account:');
  console.log('  Email:    admin@rephlo.com');
  console.log('  Password: Admin@123');
  console.log('  Notes:    Full admin access, all permissions');

  console.log('\n👥 Regular Users (Password: User@123):');
  console.log('  1. developer@example.com   - Active, verified, developer persona');
  console.log('  2. tester@example.com      - Active, NOT verified (test email verification)');
  console.log('  3. designer@example.com    - Active, verified, designer persona');
  console.log('  4. manager@example.com     - DEACTIVATED (test deactivation flow)');
  console.log('  5. support@example.com     - Active, has password reset token');

  console.log('\n🔐 OAuth Users:');
  console.log('  1. googleuser@gmail.com    - Google OAuth only (no password)');
  console.log('  2. mixed@example.com       - Local + Google linked (Password: User@123)');

  console.log('\n📊 Legacy Users (Backward Compatibility):');
  console.log('  1. free@example.com        - Free tier user (no password)');
  console.log('  2. pro@example.com         - Pro tier user (no password)');

  console.log('\n=============================================================================');
  console.log('TESTING SCENARIOS');
  console.log('=============================================================================');
  console.log('✅ Normal Login:           Use developer@example.com / User@123');
  console.log('❌ Unverified Email:       Use tester@example.com / User@123');
  console.log('❌ Deactivated Account:    Use manager@example.com / User@123');
  console.log('🔑 Password Reset:         Use support@example.com (has active reset token)');
  console.log('🌐 Google OAuth:           Use googleuser@gmail.com (OAuth only)');
  console.log('🔗 Mixed Auth:             Use mixed@example.com / User@123 (can also use Google)');
  console.log('👑 Admin Access:           Use admin@rephlo.com / Admin@123');

  console.log('\n=============================================================================');
  console.log('NEXT STEPS');
  console.log('=============================================================================');
  console.log('1. Start backend:  cd backend && npm run dev');
  console.log('2. Start frontend: cd frontend && npm run dev');
  console.log('3. Test login with any of the credentials above');
  console.log('4. For Google OAuth: Configure credentials in .env (see docs/guides/010-google-oauth-setup.md)');
  console.log('=============================================================================\n');
}

main()
  .catch((error) => {
    console.error('\n✗ Error during database seeding:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
