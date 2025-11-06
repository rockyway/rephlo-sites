/**
 * Prisma Database Seed Script
 * Pre-populates essential reference data for the Dedicated API Backend
 *
 * Usage: npx prisma db seed
 */

import { PrismaClient, ModelCapability, SubscriptionTier, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

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
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code'],
      scope: 'openid email profile llm.inference models.read user.info credits.read',
      isActive: true,
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
  console.log('\n[3/5] Seeding Test Users...');

  // Test User 1: Free Tier User
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
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
    },
  });
  console.log(`  ✓ Created/Updated user: ${freeUser.email} (${freeUser.id})`);

  // Test User 2: Pro Tier User
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
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
    },
  });
  console.log(`  ✓ Created/Updated user: ${proUser.email} (${proUser.id})`);

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
  console.log('\n[5/5] Seeding Credits...');

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
  // Seed User Preferences
  // =============================================================================
  console.log('\n[6/6] Seeding User Preferences...');

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

  console.log('\n✓ Database seeding completed successfully!');
  console.log('\nSeeded data:');
  console.log(`  - ${oauthClients.length} OAuth client(s)`);
  console.log(`  - ${models.length} LLM model(s)`);
  console.log(`  - 2 test users (free@example.com, pro@example.com)`);
  console.log(`  - 2 subscriptions (1 free tier, 1 pro tier)`);
  console.log(`  - 3 credit records (1 free, 2 pro)`);
  console.log(`  - 2 user preferences`);
  console.log('\nTest User Login Credentials:');
  console.log('  Free Tier: free@example.com');
  console.log('  Pro Tier:  pro@example.com');
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
