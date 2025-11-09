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
      redirectUris: [
        'http://localhost:8080/callback',
        'http://localhost:8327/callback',
        'http://localhost:8329/callback',
      ],
      grantTypes: ['authorization_code'], // refresh_token is built-in
      responseTypes: ['code'],
      scope: 'openid email profile llm.inference models.read user.info credits.read admin',
      isActive: true,
      config: {
        skipConsentScreen: true, // First-party trusted app, auto-approve consent
        description: 'Official desktop application for Text Assistant',
        tags: ['desktop-app', 'official'],
      },
    },
    {
      // API Server client for introspection authentication
      // The Resource API (port 7150) uses this to authenticate against
      // the Identity Provider's introspection endpoint
      clientId: 'textassistant-api',
      clientName: 'Text Assistant API Server',
      clientSecretHash: await bcrypt.hash('api-client-secret-dev', SALT_ROUNDS), // Hashed for security
      redirectUris: [], // Server-to-server, no redirect needed
      grantTypes: ['client_credentials'], // Server-to-server authentication
      responseTypes: [],
      scope: 'introspect', // Only needs introspection scope
      isActive: true,
      config: {
        description: 'Confidential client for Resource API server-to-server communication',
        tags: ['api-server', 'introspection', 'internal'],
        isConfidential: true,
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
  // Seed Subscription Tier Configurations (Plan 109)
  // =============================================================================
  console.log('\n[2/10] Seeding Subscription Tier Configurations...');

  const subscriptionTiers = [
    {
      tierName: 'free',
      monthlyPriceUsd: 0,
      annualPriceUsd: 0,
      monthlyCreditAllocation: 2000,
      maxCreditRollover: 0,
      features: {
        apiAccess: true,
        prioritySupport: false,
        maxProjects: 1,
        customModels: false,
        analyticsAccess: 'basic',
        rateLimit: '100 requests/day'
      },
      isActive: true,
    },
    {
      tierName: 'pro',
      monthlyPriceUsd: 19.00,
      annualPriceUsd: 190.00, // ~17% discount
      monthlyCreditAllocation: 20000,
      maxCreditRollover: 5000,
      features: {
        apiAccess: true,
        prioritySupport: false,
        maxProjects: 10,
        customModels: false,
        analyticsAccess: 'standard',
        rateLimit: '1000 requests/day'
      },
      isActive: true,
    },
    {
      tierName: 'pro_max',
      monthlyPriceUsd: 49.00,
      annualPriceUsd: 490.00, // ~17% discount
      monthlyCreditAllocation: 60000,
      maxCreditRollover: 15000,
      features: {
        apiAccess: true,
        prioritySupport: true,
        maxProjects: 50,
        customModels: true,
        analyticsAccess: 'advanced',
        rateLimit: '5000 requests/day'
      },
      isActive: true,
    },
    {
      tierName: 'enterprise_pro',
      monthlyPriceUsd: 149.00,
      annualPriceUsd: 1490.00, // ~17% discount
      monthlyCreditAllocation: 250000,
      maxCreditRollover: 50000,
      features: {
        apiAccess: true,
        prioritySupport: true,
        maxProjects: 200,
        customModels: true,
        analyticsAccess: 'enterprise',
        rateLimit: '25000 requests/day',
        dedicatedSupport: true,
        sla: '99.9% uptime'
      },
      isActive: true,
    },
    {
      tierName: 'enterprise_max',
      monthlyPriceUsd: 499.00, // Custom pricing, this is starting price
      annualPriceUsd: 4990.00,
      monthlyCreditAllocation: 1000000,
      maxCreditRollover: 999999, // Effectively unlimited rollover
      features: {
        apiAccess: true,
        prioritySupport: true,
        maxProjects: 999,
        customModels: true,
        analyticsAccess: 'enterprise',
        rateLimit: 'unlimited',
        dedicatedSupport: true,
        sla: '99.99% uptime',
        customContract: true,
        onPremiseOption: true
      },
      isActive: true,
    },
    {
      tierName: 'perpetual',
      monthlyPriceUsd: 199.00, // One-time payment (not recurring)
      annualPriceUsd: 199.00,  // Same as monthly (lifetime license)
      monthlyCreditAllocation: 0, // No cloud credits (BYOK only)
      maxCreditRollover: 0,
      features: {
        apiAccess: false, // No cloud API access
        prioritySupport: false,
        maxProjects: 999,
        customModels: false,
        analyticsAccess: 'local', // Local analytics only
        rateLimit: 'none', // No cloud rate limits
        byokMode: true, // Bring Your Own Key enabled
        offlineMode: true, // Ollama support
        perpetualLicense: true,
        majorVersionUpgrades: false, // Requires $99 upgrade fee
        minorVersionUpgrades: true,  // Free within same major version
        supportDuration: '12 months' // 1 year from purchase
      },
      isActive: true,
    },
  ];

  for (const tier of subscriptionTiers) {
    await prisma.subscriptionTierConfig.upsert({
      where: { tierName: tier.tierName },
      update: {
        monthlyPriceUsd: tier.monthlyPriceUsd,
        annualPriceUsd: tier.annualPriceUsd,
        monthlyCreditAllocation: tier.monthlyCreditAllocation,
        maxCreditRollover: tier.maxCreditRollover,
        features: tier.features,
        isActive: tier.isActive,
      },
      create: tier,
    });
    console.log(`  ✓ Created/Updated tier: ${tier.tierName} ($${tier.monthlyPriceUsd}/month, ${tier.monthlyCreditAllocation} credits)`);
  }

  // =============================================================================
  // Seed Models
  // =============================================================================
  console.log('\n[3/10] Seeding LLM Models...');

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
      // Tier Access Control: Premium model - requires enterprise tier
      requiredTier: SubscriptionTier.enterprise,
      tierRestrictionMode: 'minimum',
      allowedTiers: [SubscriptionTier.enterprise],
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
      // Tier Access Control: Pro model - requires pro tier or higher
      requiredTier: SubscriptionTier.pro,
      tierRestrictionMode: 'minimum',
      allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise],
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
      // Tier Access Control: Pro model - requires pro tier or higher
      requiredTier: SubscriptionTier.pro,
      tierRestrictionMode: 'minimum',
      allowedTiers: [SubscriptionTier.pro, SubscriptionTier.enterprise],
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
        requiredTier: model.requiredTier,
        tierRestrictionMode: model.tierRestrictionMode,
        allowedTiers: model.allowedTiers,
      },
      create: model,
    });
    console.log(`  ✓ Created/Updated model: ${model.displayName} (${model.id}) - Required tier: ${model.requiredTier}`);
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
    update: {
      role: 'admin', // Ensure admin role is set on update
    },
    create: {
      email: 'admin@rephlo.com',
      emailVerified: true,
      username: 'admin',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin', // Set admin role
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
      // MFA Fields (Phase 4 Task 4.1 - Initially disabled, will be enrolled later)
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaVerifiedAt: null,
      mfaMethod: 'totp', // Default method for future enrollment
    },
  });
  console.log(`    ✓ Admin: ${adminUser.email} / Admin@123 (role: ${adminUser.role}, MFA: disabled)`);

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
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
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
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
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
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
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
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
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
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
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
      // MFA Fields (OAuth users - MFA disabled by default)
      mfaEnabled: false,
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
      // MFA Fields (OAuth users - MFA disabled by default)
      mfaEnabled: false,
    },
  });
  console.log(`    ✓ Mixed Auth: ${mixedAuthUser.email} / User@123 (Local + Google)`);

  // Legacy users from original seed (kept for backward compatibility)
  const freePassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const freeUser = await prisma.user.upsert({
    where: { email: 'free@example.com' },
    update: { passwordHash: freePassword },
    create: {
      email: 'free@example.com',
      emailVerified: true,
      username: 'freetier',
      passwordHash: freePassword,
      firstName: 'Free',
      lastName: 'User',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
    },
  });
  console.log(`    ✓ Free Tier: ${freeUser.email} / User@123 (Legacy)`);

  const proPassword = await bcrypt.hash('User@123', SALT_ROUNDS);
  const proUser = await prisma.user.upsert({
    where: { email: 'pro@example.com' },
    update: { passwordHash: proPassword },
    create: {
      email: 'pro@example.com',
      emailVerified: true,
      username: 'protier',
      passwordHash: proPassword,
      firstName: 'Pro',
      lastName: 'User',
      isActive: true,
      authProvider: 'local',
      lastLoginAt: new Date('2025-11-06T08:00:00Z'),
      // MFA Fields (Regular users - MFA disabled by default)
      mfaEnabled: false,
    },
  });
  console.log(`    ✓ Pro Tier: ${proUser.email} / User@123 (Legacy)`);

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

  // =============================================================================
  // Seed Perpetual Licenses (Plan 110)
  // =============================================================================
  console.log('\n[10/11] Seeding Perpetual Licenses...');

  // Sample Perpetual License for Developer User
  const developerPerpetualLicense = await prisma.perpetualLicense.create({
    data: {
      userId: developerUser.id,
      licenseKey: 'REPHLO-1A2B-3C4D-5E6F-7G8H',
      purchasePriceUsd: 199.00,
      purchasedVersion: '1.0.0',
      eligibleUntilVersion: '1.99.99', // Free updates to all v1.x versions
      maxActivations: 3,
      currentActivations: 2, // 2 devices activated
      status: 'active',
      purchasedAt: new Date('2025-10-15T10:00:00Z'),
      activatedAt: new Date('2025-10-15T11:30:00Z'),
      expiresAt: null, // Perpetual (NULL)
    },
  });
  console.log(`  ✓ Created perpetual license for ${developerUser.email}: ${developerPerpetualLicense.licenseKey}`);

  // Sample License Activations for Developer
  const activation1 = await prisma.licenseActivation.create({
    data: {
      licenseId: developerPerpetualLicense.id,
      userId: developerUser.id,
      machineFingerprint: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', // SHA-256 hash
      deviceName: 'Developer-Laptop',
      osType: 'Windows',
      osVersion: '11 Pro',
      cpuInfo: 'Intel Core i7-12700K',
      status: 'active',
      activatedAt: new Date('2025-10-15T11:30:00Z'),
      lastSeenAt: new Date('2025-11-09T08:00:00Z'),
    },
  });

  const activation2 = await prisma.licenseActivation.create({
    data: {
      licenseId: developerPerpetualLicense.id,
      userId: developerUser.id,
      machineFingerprint: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', // Different machine
      deviceName: 'Developer-Desktop',
      osType: 'Windows',
      osVersion: '11 Home',
      cpuInfo: 'AMD Ryzen 9 5900X',
      status: 'active',
      activatedAt: new Date('2025-10-20T14:00:00Z'),
      lastSeenAt: new Date('2025-11-08T18:30:00Z'),
    },
  });
  console.log(`  ✓ Created ${2} license activations for ${developerUser.email}`);

  // Sample Version Upgrade (Developer upgrading from v1.x to v2.0)
  const versionUpgrade = await prisma.versionUpgrade.create({
    data: {
      licenseId: developerPerpetualLicense.id,
      userId: developerUser.id,
      fromVersion: '1.5.2',
      toVersion: '2.0.0',
      upgradePriceUsd: 79.00, // Early bird discount
      stripePaymentIntentId: 'pi_test_upgrade_v2_early_bird',
      status: 'completed',
      purchasedAt: new Date('2025-11-01T09:00:00Z'),
    },
  });
  console.log(`  ✓ Created version upgrade: v${versionUpgrade.fromVersion} → v${versionUpgrade.toVersion} ($${versionUpgrade.upgradePriceUsd})`);

  // Create SubscriptionMonetization for Pro User (for proration testing)
  const proSubscriptionMonetization = await prisma.subscriptionMonetization.create({
    data: {
      userId: proUser.id,
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'active',
      basePriceUsd: 19.00,
      monthlyCreditAllocation: 20000,
      stripeCustomerId: 'cus_test_pro_user_plan110',
      stripeSubscriptionId: 'sub_test_pro_user_plan110',
      currentPeriodStart: new Date('2025-11-01T00:00:00Z'),
      currentPeriodEnd: new Date('2025-12-01T00:00:00Z'),
    },
  });
  console.log(`  ✓ Created subscription monetization for ${proUser.email}`);

  // Sample Proration Event (Pro User upgrading from Pro to Pro Max mid-cycle)
  const prorationEvent = await prisma.prorationEvent.create({
    data: {
      userId: proUser.id,
      subscriptionId: proSubscriptionMonetization.id,
      fromTier: 'pro',
      toTier: 'pro_max',
      changeType: 'upgrade',
      daysRemaining: 15,
      daysInCycle: 30,
      unusedCreditValueUsd: 9.50, // (15/30) × $19
      newTierProratedCostUsd: 24.50, // (15/30) × $49
      netChargeUsd: 15.00, // $24.50 - $9.50
      effectiveDate: new Date('2025-11-15T10:00:00Z'),
      stripeInvoiceId: 'in_test_proration_upgrade',
      status: 'applied',
      createdAt: new Date('2025-11-15T10:00:00Z'),
    },
  });
  console.log(`  ✓ Created proration event: ${prorationEvent.fromTier} → ${prorationEvent.toTier} (Net charge: $${prorationEvent.netChargeUsd})`);

  // =============================================================================
  // Seed Coupon Campaigns (Plan 111)
  // =============================================================================
  console.log('\n[11/12] Seeding Coupon Campaigns...');

  // Campaign 1: Black Friday 2025
  const blackFridayCampaign = await prisma.couponCampaign.create({
    data: {
      campaignName: 'Black Friday 2025',
      campaignType: 'seasonal',
      startDate: new Date('2025-11-29T00:00:00Z'),
      endDate: new Date('2025-12-02T23:59:59Z'),
      budgetLimitUsd: 50000.00,
      totalSpentUsd: 0,
      targetTier: null, // All tiers
      isActive: true,
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created campaign: ${blackFridayCampaign.campaignName} (Budget: $${blackFridayCampaign.budgetLimitUsd})`);

  // Campaign 2: Summer Sale 2025
  const summerSaleCampaign = await prisma.couponCampaign.create({
    data: {
      campaignName: 'Summer Sale 2025',
      campaignType: 'seasonal',
      startDate: new Date('2025-07-01T00:00:00Z'),
      endDate: new Date('2025-07-31T23:59:59Z'),
      budgetLimitUsd: 30000.00,
      totalSpentUsd: 0,
      targetTier: 'pro', // Pro tier only
      isActive: true,
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created campaign: ${summerSaleCampaign.campaignName} (Budget: $${summerSaleCampaign.budgetLimitUsd})`);

  // Campaign 3: Win-Back Campaign
  const winBackCampaign = await prisma.couponCampaign.create({
    data: {
      campaignName: 'Win Back Churned Users',
      campaignType: 'win_back',
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-12-31T23:59:59Z'),
      budgetLimitUsd: 999999.00, // Unlimited budget
      totalSpentUsd: 0,
      targetTier: null, // All tiers
      isActive: true,
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created campaign: ${winBackCampaign.campaignName} (Budget: Unlimited)`);

  // Campaign 4: Referral Program
  const referralCampaign = await prisma.couponCampaign.create({
    data: {
      campaignName: 'Referral Bonus Program',
      campaignType: 'referral',
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-12-31T23:59:59Z'),
      budgetLimitUsd: 100000.00,
      totalSpentUsd: 0,
      targetTier: null, // All tiers
      isActive: true,
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created campaign: ${referralCampaign.campaignName} (Budget: $${referralCampaign.budgetLimitUsd})`);

  // Campaign 5: BYOK Migration
  const byokCampaign = await prisma.couponCampaign.create({
    data: {
      campaignName: 'Perpetual License Migration',
      campaignType: 'early_bird',
      startDate: new Date('2025-01-01T00:00:00Z'),
      endDate: new Date('2025-12-31T23:59:59Z'),
      budgetLimitUsd: 999999.00, // Unlimited
      totalSpentUsd: 0,
      targetTier: 'enterprise', // Enterprise only
      isActive: true,
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created campaign: ${byokCampaign.campaignName} (Budget: Unlimited)`);

  // =============================================================================
  // Seed Coupons (Plan 111)
  // =============================================================================
  console.log('\n[12/13] Seeding Coupons...');

  // Coupon 1: Black Friday - 25% off first 3 months
  const blackFridayCoupon = await prisma.coupon.create({
    data: {
      code: 'BLACKFRIDAY25',
      couponType: 'percentage_discount',
      discountValue: 25.00,
      discountType: 'percentage',
      currency: 'usd',
      maxUses: 1000,
      maxUsesPerUser: 1,
      minPurchaseAmount: 0,
      tierEligibility: ['free', 'pro', 'enterprise'],
      billingCycles: ['monthly', 'annual'],
      validFrom: new Date('2025-11-29T00:00:00Z'),
      validUntil: new Date('2025-12-02T23:59:59Z'),
      isActive: true,
      campaignId: blackFridayCampaign.id,
      description: 'Black Friday Special: 25% off your first 3 months!',
      internalNotes: 'Limited to 1000 redemptions. Target: New subscribers during BF weekend.',
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created coupon: ${blackFridayCoupon.code} (${blackFridayCoupon.discountValue}% off)`);

  // Coupon 2: Summer Sale - 20% off annual plans
  const summerSaleCoupon = await prisma.coupon.create({
    data: {
      code: 'SUMMER2025',
      couponType: 'percentage_discount',
      discountValue: 20.00,
      discountType: 'percentage',
      currency: 'usd',
      maxUses: 500,
      maxUsesPerUser: 1,
      minPurchaseAmount: 100.00, // Minimum $100 purchase (annual plans)
      tierEligibility: ['pro', 'enterprise'],
      billingCycles: ['annual'],
      validFrom: new Date('2025-07-01T00:00:00Z'),
      validUntil: new Date('2025-07-31T23:59:59Z'),
      isActive: true,
      campaignId: summerSaleCampaign.id,
      description: 'Summer Sale: 20% off all annual Pro plans!',
      internalNotes: 'Annual plans only. Min $100 purchase. Pro/Enterprise tiers.',
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created coupon: ${summerSaleCoupon.code} (${summerSaleCoupon.discountValue}% off annual)`);

  // Coupon 3: Win-Back - 50% off first month
  const winBackCoupon = await prisma.coupon.create({
    data: {
      code: 'COMEBACK50',
      couponType: 'percentage_discount',
      discountValue: 50.00,
      discountType: 'percentage',
      currency: 'usd',
      maxUses: null, // Unlimited uses
      maxUsesPerUser: 1,
      minPurchaseAmount: 0,
      tierEligibility: ['free', 'pro', 'enterprise'],
      billingCycles: ['monthly'],
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validUntil: new Date('2025-12-31T23:59:59Z'),
      isActive: true,
      campaignId: winBackCampaign.id,
      description: 'We want you back! 50% off your first month when you resubscribe.',
      internalNotes: 'Targeted at users who cancelled in last 90 days. Custom validation rule required.',
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created coupon: ${winBackCoupon.code} (${winBackCoupon.discountValue}% off first month)`);

  // Coupon 4: Referral - $20 credit for both parties
  const referralCoupon = await prisma.coupon.create({
    data: {
      code: 'REFER20',
      couponType: 'fixed_amount_discount',
      discountValue: 20.00,
      discountType: 'credits',
      currency: 'usd',
      maxUses: null, // Unlimited uses
      maxUsesPerUser: 5, // Max 5 referrals per user
      minPurchaseAmount: 0,
      tierEligibility: ['free', 'pro', 'enterprise'],
      billingCycles: ['monthly', 'annual'],
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validUntil: new Date('2025-12-31T23:59:59Z'),
      isActive: true,
      campaignId: referralCampaign.id,
      description: 'Refer a friend and you both get $20 in credits!',
      internalNotes: 'Max 5 referrals per user. $20 credit to both referrer and referee.',
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created coupon: ${referralCoupon.code} ($${referralCoupon.discountValue} credit)`);

  // Coupon 5: BYOK Migration - 100% off first month + perpetual license
  const byokCoupon = await prisma.coupon.create({
    data: {
      code: 'BYOK2025',
      couponType: 'byok_migration',
      discountValue: 100.00,
      discountType: 'percentage',
      currency: 'usd',
      maxUses: null, // Unlimited
      maxUsesPerUser: 1,
      minPurchaseAmount: 199.00, // Perpetual license cost
      tierEligibility: ['enterprise'],
      billingCycles: ['monthly'],
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validUntil: new Date('2025-12-31T23:59:59Z'),
      isActive: true,
      campaignId: byokCampaign.id,
      description: 'Migrate to Perpetual Plan: First month free + lifetime license!',
      internalNotes: 'Grants perpetual license. Enterprise tier only. Requires payment method for future upgrades.',
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created coupon: ${byokCoupon.code} (${byokCoupon.discountValue}% off + perpetual license)`);

  // Coupon 6: Early Bird - $79 upgrade to v2.0
  const earlyBirdCoupon = await prisma.coupon.create({
    data: {
      code: 'EARLYBIRD79',
      couponType: 'tier_specific_discount',
      discountValue: 20.00, // $20 off the standard $99 upgrade
      discountType: 'fixed_amount',
      currency: 'usd',
      maxUses: 500,
      maxUsesPerUser: 1,
      minPurchaseAmount: 79.00,
      tierEligibility: ['enterprise'], // Perpetual license holders
      billingCycles: ['monthly'],
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validUntil: new Date('2025-03-31T23:59:59Z'),
      isActive: true,
      campaignId: byokCampaign.id,
      description: 'Early Bird Special: Upgrade to v2.0 for just $79 (save $20)!',
      internalNotes: 'Standard upgrade is $99. Early bird discount: $79. Limited to 500 users.',
      createdBy: adminUser.id,
    },
  });
  console.log(`  ✓ Created coupon: ${earlyBirdCoupon.code} ($${earlyBirdCoupon.discountValue} off v2.0 upgrade)`);

  // =============================================================================
  // Seed Coupon Usage Limits (Plan 111)
  // =============================================================================
  console.log('\n[13/14] Seeding Coupon Usage Limits...');

  const coupons = [blackFridayCoupon, summerSaleCoupon, winBackCoupon, referralCoupon, byokCoupon, earlyBirdCoupon];
  for (const coupon of coupons) {
    await prisma.couponUsageLimit.create({
      data: {
        couponId: coupon.id,
        totalUses: 0,
        uniqueUsers: 0,
        totalDiscountAppliedUsd: 0,
        lastUsedAt: null,
      },
    });
  }
  console.log(`  ✓ Created usage limit trackers for ${coupons.length} coupons`);

  // =============================================================================
  // Seed Coupon Validation Rules (Plan 111)
  // =============================================================================
  console.log('\n[14/15] Seeding Coupon Validation Rules...');

  // Rule 1: Win-Back coupon - Only for users who cancelled in last 90 days
  const winBackRule = await prisma.couponValidationRule.create({
    data: {
      couponId: winBackCoupon.id,
      ruleType: 'exclude_refunded_users',
      ruleValue: {
        days: 90,
        description: 'Only users who cancelled in last 90 days'
      },
      isActive: true,
    },
  });
  console.log(`  ✓ Created validation rule: Win-back (exclude recent cancellations)`);

  // Rule 2: Referral - Require first-time users only
  const referralRule = await prisma.couponValidationRule.create({
    data: {
      couponId: referralCoupon.id,
      ruleType: 'first_time_user_only',
      ruleValue: {
        description: 'Only new users who have never subscribed'
      },
      isActive: true,
    },
  });
  console.log(`  ✓ Created validation rule: Referral (first-time users only)`);

  // Rule 3: BYOK - Require payment method on file
  const byokPaymentRule = await prisma.couponValidationRule.create({
    data: {
      couponId: byokCoupon.id,
      ruleType: 'require_payment_method',
      ruleValue: {
        description: 'Requires valid payment method for future upgrades'
      },
      isActive: true,
    },
  });
  console.log(`  ✓ Created validation rule: BYOK (payment method required)`);

  // Rule 4: Enterprise-only email domains
  const enterpriseDomainRule = await prisma.couponValidationRule.create({
    data: {
      couponId: byokCoupon.id,
      ruleType: 'specific_email_domain',
      ruleValue: {
        domains: ['acme.com', 'techcorp.io', 'enterprise.org'],
        description: 'Only specific enterprise email domains'
      },
      isActive: false, // Disabled by default, enable for specific campaigns
    },
  });
  console.log(`  ✓ Created validation rule: Enterprise domains (disabled)`);

  // =============================================================================
  // Seed Sample Coupon Redemptions (Plan 111)
  // =============================================================================
  console.log('\n[15/16] Seeding Sample Coupon Redemptions...');

  // Sample redemption 1: Developer successfully redeemed Black Friday coupon
  const redemption1 = await prisma.couponRedemption.create({
    data: {
      couponId: blackFridayCoupon.id,
      userId: developerUser.id,
      subscriptionId: proSubscriptionMonetization.id,
      redemptionDate: new Date('2025-11-29T10:00:00Z'),
      discountAppliedUsd: 4.75, // 25% off $19 = $4.75
      originalAmountUsd: 19.00,
      finalAmountUsd: 14.25,
      redemptionStatus: 'success',
      failureReason: null,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  console.log(`  ✓ Created redemption: ${blackFridayCoupon.code} by ${developerUser.email} (SUCCESS)`);

  // Sample redemption 2: Pro user redeemed referral coupon
  const redemption2 = await prisma.couponRedemption.create({
    data: {
      couponId: referralCoupon.id,
      userId: proUser.id,
      subscriptionId: proSubscriptionMonetization.id,
      redemptionDate: new Date('2025-11-15T14:30:00Z'),
      discountAppliedUsd: 20.00, // $20 credit
      originalAmountUsd: 19.00,
      finalAmountUsd: 0.00, // Free first month due to credit
      redemptionStatus: 'success',
      failureReason: null,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  });
  console.log(`  ✓ Created redemption: ${referralCoupon.code} by ${proUser.email} (SUCCESS)`);

  // Sample redemption 3: Failed redemption (coupon expired)
  const redemption3 = await prisma.couponRedemption.create({
    data: {
      couponId: summerSaleCoupon.id,
      userId: designerUser.id,
      subscriptionId: null, // No subscription created due to failure
      redemptionDate: new Date('2025-08-01T10:00:00Z'),
      discountAppliedUsd: 0,
      originalAmountUsd: 190.00,
      finalAmountUsd: 190.00,
      redemptionStatus: 'failed',
      failureReason: 'Coupon expired. Valid until 2025-07-31 23:59:59 UTC.',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    },
  });
  console.log(`  ✓ Created redemption: ${summerSaleCoupon.code} by ${designerUser.email} (FAILED - expired)`);

  // Update coupon usage limits to reflect redemptions
  await prisma.couponUsageLimit.update({
    where: { couponId: blackFridayCoupon.id },
    data: {
      totalUses: 1,
      uniqueUsers: 1,
      totalDiscountAppliedUsd: 4.75,
      lastUsedAt: new Date('2025-11-29T10:00:00Z'),
    },
  });

  await prisma.couponUsageLimit.update({
    where: { couponId: referralCoupon.id },
    data: {
      totalUses: 1,
      uniqueUsers: 1,
      totalDiscountAppliedUsd: 20.00,
      lastUsedAt: new Date('2025-11-15T14:30:00Z'),
    },
  });

  // =============================================================================
  // Seed Coupon Fraud Detection Events (Plan 111)
  // =============================================================================
  console.log('\n[16/17] Seeding Coupon Fraud Detection Events...');

  // Sample fraud event: Velocity abuse (same user, multiple attempts)
  const fraudEvent = await prisma.couponFraudDetection.create({
    data: {
      couponId: blackFridayCoupon.id,
      userId: designerUser.id,
      detectionType: 'velocity_abuse',
      severity: 'medium',
      detectedAt: new Date('2025-11-29T12:00:00Z'),
      details: {
        attempts: 5,
        timeWindow: '10 minutes',
        ipAddresses: ['192.168.1.105', '192.168.1.106'],
        description: 'User attempted to redeem coupon 5 times in 10 minutes from 2 different IPs'
      },
      isFlagged: true,
      reviewedBy: null,
      reviewedAt: null,
      resolution: null,
    },
  });
  console.log(`  ✓ Created fraud detection event: Velocity abuse (medium severity)`);

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\n=============================================================================');
  console.log('SEEDED DATA SUMMARY');
  console.log('=============================================================================');
  console.log(`  📦 OAuth Clients: ${oauthClients.length}`);
  console.log(`  💎 Subscription Tiers: ${subscriptionTiers.length} (Plan 109 + Plan 110 Perpetual)`);
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
  console.log(`  🔑 Perpetual Licenses: 1 (developer user)`);
  console.log(`  💻 License Activations: 2 (2 devices for developer)`);
  console.log(`  📦 Version Upgrades: 1 (v1.5.2 → v2.0.0, early bird $79)`);
  console.log(`  💸 Proration Events: 1 (pro → pro_max upgrade, $15 net charge)`);
  console.log('\n  Plan 111 - Coupon & Discount System:');
  console.log(`  🎟️  Coupon Campaigns: 5 (Black Friday, Summer Sale, Win-Back, Referral, BYOK)`);
  console.log(`  🎫 Coupons: 6 (BLACKFRIDAY25, SUMMER2025, COMEBACK50, REFER20, BYOK2025, EARLYBIRD79)`);
  console.log(`  📊 Coupon Usage Limits: 6 (tracking for all coupons)`);
  console.log(`  ✅ Validation Rules: 4 (win-back, referral, BYOK, enterprise domains)`);
  console.log(`  💰 Redemptions: 3 (2 successful, 1 failed)`);
  console.log(`  🚨 Fraud Detection Events: 1 (velocity abuse - medium severity)`);

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
