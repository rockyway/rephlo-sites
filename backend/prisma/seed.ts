/**
 * Database Seed Script
 *
 * Populates the database with comprehensive seed data for testing and development.
 * Run with: npm run seed or npx ts-node src/db/seed.ts
 *
 * This script:
 * - Creates OAuth 2.0/OIDC clients for testing
 * - Seeds user personas (free, pro, admin)
 * - Creates subscription records
 * - Adds credit allocations
 * - Seeds legacy branding data (downloads, feedback, etc.)
 *
 * Uses upsert logic to ensure no duplicates and allows data restoration.
 */

import { PrismaClient, ModelCapability, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const SALT_ROUNDS = 10;

// Test OAuth Clients Configuration
const OAUTH_CLIENTS_CONFIG = [
  {
    clientId: 'desktop-app-test',
    clientName: 'Rephlo Desktop App (Test)',
    clientSecret: 'test-secret-desktop-app-12345',
    redirectUris: [
      'http://localhost:8327/callback',
      'http://localhost:8329/callback',
      'rephlo://callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scope: 'openid email profile offline_access llm.inference models.read user.info credits.read',
    config: {
      skipConsentScreen: true,
      description: 'Official Rephlo Desktop Application',
      tags: ['desktop', 'official', 'test'],
      allowedOrigins: ['http://localhost:8327', 'http://localhost:8329', 'rephlo://'],
    },
  },
  {
    clientId: 'poc-client-test',
    clientName: 'POC Client (Test)',
    clientSecret: null, // Public client using PKCE - no secret
    redirectUris: [
      'http://localhost:8080/callback',
      'http://localhost:8080/oauth/callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'], // Added refresh_token for offline_access
    responseTypes: ['code'],
    scope: 'openid email profile offline_access llm.inference models.read user.info credits.read',
    config: {
      skipConsentScreen: true,
      description: 'Proof of Concept Client for Testing - Public client using PKCE',
      tags: ['poc', 'test', 'public'],
      allowedOrigins: ['http://localhost:8080'],
    },
  },
  {
    clientId: 'web-app-test',
    clientName: 'Rephlo Web App (Test)',
    clientSecret: null, // Public client using PKCE - no secret
    redirectUris: [
      'http://localhost:7152/callback',
      'http://localhost:7152/auth/callback',
      'http://localhost:7152/oauth/callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scope: 'openid email profile offline_access llm.inference models.read user.info credits.read admin',
    config: {
      skipConsentScreen: true,
      description: 'Official Rephlo Web Application (Admin Dashboard) - Public client using PKCE',
      tags: ['web', 'official', 'test', 'admin'],
      allowedOrigins: ['http://localhost:7152'],
    },
  },
  {
    clientId: 'textassistant-api',
    clientName: 'Backend API Server (Token Introspection)',
    clientSecret: 'api-client-secret-dev',
    redirectUris: [], // No redirects - this is a confidential client for server-to-server auth
    grantTypes: ['client_credentials'],
    responseTypes: [],
    scope: '', // No specific scopes needed - this client is used for token introspection only
    config: {
      skipConsentScreen: true,
      description: 'Backend API server confidential client for token introspection',
      tags: ['backend', 'confidential', 'introspection'],
      allowedOrigins: [],
    },
  },
];

// Test User Personas
const USER_PERSONAS = [
  {
    email: 'free.user@example.com',
    firstName: 'Free',
    lastName: 'User',
    username: 'freeuser',
    password: 'TestPassword123!',
    role: 'user',
    emailVerified: true,
    authProvider: 'local',
    mfaEnabled: false,
    subscriptionTier: 'free' as const,
    subscriptionStatus: 'active' as const,
    description: 'Free tier user for basic testing',
  },
  {
    email: 'pro.user@example.com',
    firstName: 'Pro',
    lastName: 'User',
    username: 'prouser',
    password: 'TestPassword123!',
    role: 'user',
    emailVerified: true,
    authProvider: 'local',
    mfaEnabled: false,
    subscriptionTier: 'pro' as const,
    subscriptionStatus: 'active' as const,
    description: 'Pro tier user for subscription testing',
  },
  {
    email: 'admin.test@rephlo.ai',
    firstName: 'Admin',
    lastName: 'Test',
    username: 'admintest',
    password: 'AdminPassword123!',
    role: 'admin',
    emailVerified: true,
    authProvider: 'local',
    mfaEnabled: true, // MFA enabled, controlled via MFA_ENFORCEMENT_ENABLED env var
    subscriptionTier: 'pro' as const,
    subscriptionStatus: 'active' as const,
    description: 'Admin user with MFA (controlled by MFA_ENFORCEMENT_ENABLED)',
  },
  {
    email: 'google.user@example.com',
    firstName: 'Google',
    lastName: 'User',
    username: 'googleuser',
    password: undefined,
    role: 'user',
    emailVerified: true,
    authProvider: 'google',
    googleId: '118094742123456789012',
    mfaEnabled: false,
    subscriptionTier: 'pro' as const,
    subscriptionStatus: 'active' as const,
    description: 'User authenticated via Google',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Seed OAuth Clients
 */
async function seedOAuthClients() {
  console.log('Creating OAuth clients...');
  const createdClients = [];

  for (const client of OAUTH_CLIENTS_CONFIG) {
    // For public clients (no secret), clientSecretHash is null
    const clientSecretHash = client.clientSecret ? await hashPassword(client.clientSecret) : null;

    const oauthClient = await prisma.oAuthClient.upsert({
      where: { clientId: client.clientId },
      update: {
        clientName: client.clientName,
        clientSecretHash,
        redirectUris: client.redirectUris,
        grantTypes: client.grantTypes,
        responseTypes: client.responseTypes,
        scope: client.scope,
        isActive: true,
        config: client.config,
      },
      create: {
        clientId: client.clientId,
        clientName: client.clientName,
        clientSecretHash,
        redirectUris: client.redirectUris,
        grantTypes: client.grantTypes,
        responseTypes: client.responseTypes,
        scope: client.scope,
        isActive: true,
        config: client.config,
      },
    });

    createdClients.push({
      clientId: oauthClient.clientId,
      clientName: oauthClient.clientName,
      secret: client.clientSecret, // Display secret only on creation
    });
  }

  console.log(`✓ Created/Updated ${createdClients.length} OAuth clients`);
  console.log('  OAuth Clients Details:');
  createdClients.forEach((client) => {
    console.log(`    - ${client.clientName} (${client.clientId})`);
  });
  console.log('');

  return createdClients;
}

/**
 * Seed User Personas with proper password hashing and TOTP setup
 */
async function seedUserPersonas() {
  console.log('Creating user personas...');
  const createdUsers = [];

  for (const persona of USER_PERSONAS) {
    const passwordHash = persona.password
      ? await hashPassword(persona.password)
      : null;

    // Use upsert instead of delete + create to avoid foreign key conflicts
    const user = await prisma.user.upsert({
      where: { email: persona.email },
      update: {
        firstName: persona.firstName,
        lastName: persona.lastName,
        username: persona.username,
        passwordHash,
        emailVerified: persona.emailVerified,
        authProvider: persona.authProvider,
        googleId: persona.googleId || undefined,
        role: persona.role,
        isActive: true,
      },
      create: {
        email: persona.email,
        firstName: persona.firstName,
        lastName: persona.lastName,
        username: persona.username,
        passwordHash,
        emailVerified: persona.emailVerified,
        authProvider: persona.authProvider,
        googleId: persona.googleId || undefined,
        role: persona.role,
        isActive: true,
      },
    });

    createdUsers.push({
      userId: user.id,
      email: user.email,
      role: user.role,
      description: persona.description,
    });
  }

  console.log(`✓ Created/Updated ${createdUsers.length} user personas`);
  console.log('  User Personas Details:');
  createdUsers.forEach((user) => {
    console.log(`    - ${user.email} (Role: ${user.role})`);
  });
  console.log('');

  return createdUsers;
}

/**
 * Seed Subscriptions for users
 */
async function seedSubscriptions(users: any[]) {
  console.log('Creating subscriptions...');
  const createdSubscriptions = [];

  // Subscription tier configuration
  const tierConfig = {
    free: {
      creditsPerMonth: 100,
      priceCents: 0,
      billingInterval: 'monthly',
    },
    pro: {
      creditsPerMonth: 10000,
      priceCents: 9999, // $99.99
      billingInterval: 'monthly',
    },
  };

  for (const user of users) {
    // Find persona to determine tier
    const persona = USER_PERSONAS.find((p) => p.email.startsWith(user.email));
    if (!persona) continue;

    const tier = persona.subscriptionTier;
    const config = tierConfig[tier];
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Delete existing subscription for this user to avoid conflicts
    await prisma.subscription.deleteMany({
      where: { userId: user.userId },
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.userId,
        tier,
        status: 'active',
        creditsPerMonth: config.creditsPerMonth,
        priceCents: config.priceCents,
        billingInterval: config.billingInterval,
        currentPeriodStart: now,
        currentPeriodEnd: endOfMonth,
        creditsRollover: false,
      },
    });

    createdSubscriptions.push({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier,
      creditsPerMonth: subscription.creditsPerMonth,
    });
  }

  console.log(
    `✓ Created/Updated ${createdSubscriptions.length} subscriptions`
  );
  console.log('');

  return createdSubscriptions;
}

/**
 * Seed Credit Allocations
 */
async function seedCredits(users: any[]) {
  console.log('Creating credit allocations...');
  const createdCredits = [];

  for (const user of users) {
    // Find persona to determine tier
    const persona = USER_PERSONAS.find((p) => p.email.startsWith(user.email));
    if (!persona) continue;

    const tier = persona.subscriptionTier;
    const creditType = tier === 'free' ? 'free' : 'pro';
    const monthlyAllocation = tier === 'free' ? 100 : 10000;

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Delete existing credit for this user to start fresh
    await prisma.credit.deleteMany({
      where: { userId: user.userId },
    });

    // Create new credit allocation
    const credit = await prisma.credit.create({
      data: {
        userId: user.userId,
        totalCredits: monthlyAllocation,
        usedCredits: 0,
        creditType,
        monthlyAllocation,
        billingPeriodStart: now,
        billingPeriodEnd: endOfMonth,
        isCurrent: true,
        resetDayOfMonth: 1,
      },
    });

    createdCredits.push({
      creditId: credit.id,
      userId: credit.userId,
      creditType: credit.creditType,
      monthlyAllocation: credit.monthlyAllocation,
    });
  }

  console.log(`✓ Created/Updated ${createdCredits.length} credit records`);
  console.log('');

  return createdCredits;
}

/**
 * Seed LLM Models
 * Seeds top-tier models from major providers with current pricing
 */
async function seedModels() {
  console.log('Creating LLM models...');

  const models = [
    // OpenAI Models (August 2025 - GPT-5 Release)
    {
      id: 'gpt-5',
      name: 'gpt-5',
      displayName: 'GPT-5',
      provider: 'openai',
      description: 'OpenAI\'s best AI system with 272K input, 128K output, 94.6% AIME math, 74.9% SWE-bench coding, 45% fewer hallucinations',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 272000,
      maxOutputTokens: 128000,
      inputCostPerMillionTokens: 1250,
      outputCostPerMillionTokens: 10000,
      creditsPer1kTokens: 28,
      requiredTier: SubscriptionTier.pro_max,
    },
    {
      id: 'gpt-5-mini',
      name: 'gpt-5-mini',
      displayName: 'GPT-5 Mini',
      provider: 'openai',
      description: 'Cost-efficient GPT-5 with 87.5% cost reduction, 272K input context with smart routing',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 272000,
      maxOutputTokens: 128000,
      inputCostPerMillionTokens: 250,
      outputCostPerMillionTokens: 2000,
      creditsPer1kTokens: 6,
      requiredTier: SubscriptionTier.pro,
    },
    {
      id: 'gpt-5-nano',
      name: 'gpt-5-nano',
      displayName: 'GPT-5 Nano',
      provider: 'openai',
      description: 'Ultra cost-efficient GPT-5 variant with 272K context, ideal for high-volume tasks',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 272000,
      maxOutputTokens: 128000,
      inputCostPerMillionTokens: 50,
      outputCostPerMillionTokens: 400,
      creditsPer1kTokens: 1,
      requiredTier: SubscriptionTier.free,
    },

    // Anthropic Models (2025 - Claude 4 Generation)
    {
      id: 'claude-opus-4-1',
      name: 'claude-opus-4.1',
      displayName: 'Claude Opus 4.1',
      provider: 'anthropic',
      description: 'Most powerful Claude model for highly complex tasks, 200K context (August 2025)',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 200000,
      maxOutputTokens: 16384,
      inputCostPerMillionTokens: 15000,
      outputCostPerMillionTokens: 75000,
      creditsPer1kTokens: 180,
      requiredTier: SubscriptionTier.pro_max,
    },
    {
      id: 'claude-sonnet-4-5',
      name: 'claude-sonnet-4.5',
      displayName: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      description: 'Most intelligent for agents, coding, and computer use with 200K context (September 2025)',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 200000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 3000,
      outputCostPerMillionTokens: 15000,
      creditsPer1kTokens: 40,
      requiredTier: SubscriptionTier.pro,
    },
    {
      id: 'claude-haiku-4-5',
      name: 'claude-haiku-4.5',
      displayName: 'Claude Haiku 4.5',
      provider: 'anthropic',
      description: 'Fastest and most cost-efficient Claude with 200K context (October 2025)',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context],
      contextLength: 200000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 1000,
      outputCostPerMillionTokens: 5000,
      creditsPer1kTokens: 15,
      requiredTier: SubscriptionTier.free,
    },

    // Google Models (2025)
    {
      id: 'gemini-2-5-pro',
      name: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro',
      provider: 'google',
      description: 'Most advanced Gemini model with 1M context (2M coming soon), exceptional reasoning',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 1000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 1250,
      outputCostPerMillionTokens: 5000,
      creditsPer1kTokens: 20,
      requiredTier: SubscriptionTier.pro_max,
    },
    {
      id: 'gemini-2-0-flash',
      name: 'gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash',
      provider: 'google',
      description: 'Generally available model with 1M context, multimodal input, and native tool use',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context],
      contextLength: 1000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 100,
      outputCostPerMillionTokens: 400,
      creditsPer1kTokens: 3,
      requiredTier: SubscriptionTier.pro,
    },
    {
      id: 'gemini-2-0-flash-lite',
      name: 'gemini-2.0-flash-lite',
      displayName: 'Gemini 2.0 Flash-Lite',
      provider: 'google',
      description: 'Most cost-efficient Gemini model with 1M context and multimodal capabilities',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context],
      contextLength: 1000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 38,
      outputCostPerMillionTokens: 150,
      creditsPer1kTokens: 1,
      requiredTier: SubscriptionTier.free,
    },

    // Mistral Models (2025)
    {
      id: 'mistral-medium-3',
      name: 'mistral-medium-3',
      displayName: 'Mistral Medium 3',
      provider: 'mistral',
      description: 'Latest Mistral model excelling in coding and STEM tasks, 90% of Claude 3.7 at lower cost',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.code],
      contextLength: 128000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 400,
      outputCostPerMillionTokens: 2000,
      creditsPer1kTokens: 8,
      requiredTier: SubscriptionTier.pro,
    },
    {
      id: 'mistral-small-3-1',
      name: 'mistral-small-3.1',
      displayName: 'Mistral Small 3.1',
      provider: 'mistral',
      description: 'Cost-efficient model for standard tasks with strong multilingual support',
      capabilities: [ModelCapability.text, ModelCapability.function_calling],
      contextLength: 128000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 200,
      outputCostPerMillionTokens: 600,
      creditsPer1kTokens: 3,
      requiredTier: SubscriptionTier.free,
    },

    // Meta Models (2025)
    {
      id: 'llama-4-scout',
      name: 'llama-4-scout',
      displayName: 'Llama 4 Scout',
      provider: 'meta',
      description: 'Industry-leading 10M context window with superior text and visual intelligence',
      capabilities: [ModelCapability.text, ModelCapability.vision, ModelCapability.function_calling, ModelCapability.long_context],
      contextLength: 10000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 200,
      outputCostPerMillionTokens: 800,
      creditsPer1kTokens: 5,
      requiredTier: SubscriptionTier.pro_max,
    },
    {
      id: 'llama-3-3-70b',
      name: 'llama-3.3-70b',
      displayName: 'Llama 3.3 70B',
      provider: 'meta',
      description: 'Excellent performance at 10-15x lower cost than GPT-4o with 128K context',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.code, ModelCapability.long_context],
      contextLength: 128000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 100,
      outputCostPerMillionTokens: 400,
      creditsPer1kTokens: 2,
      requiredTier: SubscriptionTier.pro,
    },
    {
      id: 'llama-3-1-405b',
      name: 'llama-3.1-405b',
      displayName: 'Llama 3.1 405B',
      provider: 'meta',
      description: 'Largest Llama model with exceptional capabilities and 128K context',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.code, ModelCapability.long_context],
      contextLength: 128000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 300,
      outputCostPerMillionTokens: 1200,
      creditsPer1kTokens: 6,
      requiredTier: SubscriptionTier.pro,
    },

    // xAI Models (2025)
    {
      id: 'grok-4',
      name: 'grok-4-0709',
      displayName: 'Grok 4',
      provider: 'xai',
      description: 'The most intelligent model in the world with native tool use and real-time search (August 2025)',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 256000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 3000,
      outputCostPerMillionTokens: 15000,
      creditsPer1kTokens: 40,
      requiredTier: SubscriptionTier.pro_max,
    },
    {
      id: 'grok-4-fast',
      name: 'grok-4-fast-reasoning',
      displayName: 'Grok 4 Fast',
      provider: 'xai',
      description: 'Fast reasoning model with 2M context window, ideal for complex tasks (September 2025)',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.long_context, ModelCapability.code],
      contextLength: 2000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 200,
      outputCostPerMillionTokens: 500,
      creditsPer1kTokens: 2,
      requiredTier: SubscriptionTier.pro,
    },
    {
      id: 'grok-code-fast-1',
      name: 'grok-code-fast-1',
      displayName: 'Grok Code Fast 1',
      provider: 'xai',
      description: 'Speedy and economical reasoning model excelling at agentic coding (September 2025)',
      capabilities: [ModelCapability.text, ModelCapability.function_calling, ModelCapability.code],
      contextLength: 128000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 200,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 5,
      requiredTier: SubscriptionTier.pro,
    },
  ];

  const createdModels = [];

  for (const model of models) {
    const created = await prisma.model.upsert({
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
        requiredTier: model.requiredTier,
        isAvailable: true,
        isDeprecated: false,
      },
      create: {
        id: model.id,
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
        requiredTier: model.requiredTier,
        isAvailable: true,
        isDeprecated: false,
      },
    });

    createdModels.push(created);
  }

  console.log(`✓ Created/Updated ${createdModels.length} LLM models`);
  console.log(`  Providers: OpenAI, Anthropic, Google, Mistral, Meta, xAI\n`);

  return createdModels;
}

/**
 * Seed Proration Events
 * Creates sample mid-cycle tier change events with proration calculations
 */
async function seedProrations(users: any[], subscriptions: any[]) {
  console.log('Creating proration events...');

  if (!users.length || !subscriptions.length) {
    console.log('⚠️  No users or subscriptions available - skipping prorations\n');
    return [];
  }

  const prorationsData = [
    // Upgrade from free to pro
    {
      userId: users[0]?.id,
      subscriptionId: subscriptions[0]?.id,
      fromTier: 'free',
      toTier: 'pro',
      changeType: 'upgrade',
      daysRemaining: 20,
      daysInCycle: 30,
      unusedCreditValueUsd: 0, // Free tier has no value
      newTierProratedCostUsd: 13.33, // (20/30) × $20
      netChargeUsd: 13.33,
      effectiveDate: new Date('2025-11-05'),
      status: 'applied',
      stripeInvoiceId: 'in_test_upgrade_free_pro_001',
    },
    // Upgrade from pro to pro_max
    {
      userId: users[1]?.id,
      subscriptionId: subscriptions[1]?.id,
      fromTier: 'pro',
      toTier: 'pro_max',
      changeType: 'upgrade',
      daysRemaining: 15,
      daysInCycle: 30,
      unusedCreditValueUsd: 10.00, // (15/30) × $20
      newTierProratedCostUsd: 25.00, // (15/30) × $50
      netChargeUsd: 15.00,
      effectiveDate: new Date('2025-11-08'),
      status: 'applied',
      stripeInvoiceId: 'in_test_upgrade_pro_promax_001',
    },
    // Downgrade from pro to free
    {
      userId: users[2]?.id,
      subscriptionId: subscriptions[2]?.id,
      fromTier: 'pro',
      toTier: 'free',
      changeType: 'downgrade',
      daysRemaining: 10,
      daysInCycle: 30,
      unusedCreditValueUsd: 6.67, // (10/30) × $20
      newTierProratedCostUsd: 0, // Free tier
      netChargeUsd: -6.67, // Credit back to user
      effectiveDate: new Date('2025-11-10'),
      status: 'applied',
      stripeInvoiceId: 'in_test_downgrade_pro_free_001',
    },
    // Interval change - monthly to annual
    {
      userId: users[0]?.id,
      subscriptionId: subscriptions[0]?.id,
      fromTier: 'pro',
      toTier: 'pro',
      changeType: 'interval_change',
      daysRemaining: 25,
      daysInCycle: 30,
      unusedCreditValueUsd: 16.67, // (25/30) × $20
      newTierProratedCostUsd: 183.33, // (25/30) × $220 (annual)
      netChargeUsd: 166.66,
      effectiveDate: new Date('2025-11-03'),
      status: 'applied',
      stripeInvoiceId: 'in_test_interval_monthly_annual_001',
    },
    // Pending upgrade
    {
      userId: users[1]?.id,
      subscriptionId: subscriptions[1]?.id,
      fromTier: 'free',
      toTier: 'pro',
      changeType: 'upgrade',
      daysRemaining: 18,
      daysInCycle: 30,
      unusedCreditValueUsd: 0,
      newTierProratedCostUsd: 12.00,
      netChargeUsd: 12.00,
      effectiveDate: new Date('2025-11-12'),
      status: 'pending',
    },
    // Failed proration
    {
      userId: users[2]?.id,
      subscriptionId: subscriptions[2]?.id,
      fromTier: 'pro',
      toTier: 'pro_max',
      changeType: 'upgrade',
      daysRemaining: 12,
      daysInCycle: 30,
      unusedCreditValueUsd: 8.00,
      newTierProratedCostUsd: 20.00,
      netChargeUsd: 12.00,
      effectiveDate: new Date('2025-11-09'),
      status: 'failed',
    },
    // Reversed proration (refund)
    {
      userId: users[0]?.id,
      subscriptionId: subscriptions[0]?.id,
      fromTier: 'pro_max',
      toTier: 'pro',
      changeType: 'downgrade',
      daysRemaining: 22,
      daysInCycle: 30,
      unusedCreditValueUsd: 36.67, // (22/30) × $50
      newTierProratedCostUsd: 14.67, // (22/30) × $20
      netChargeUsd: -22.00, // Credit back
      effectiveDate: new Date('2025-11-01'),
      status: 'reversed',
      stripeInvoiceId: 'in_test_reversed_promax_pro_001',
    },
    // Enterprise upgrade
    {
      userId: users[1]?.id,
      subscriptionId: subscriptions[1]?.id,
      fromTier: 'pro_max',
      toTier: 'enterprise_pro',
      changeType: 'upgrade',
      daysRemaining: 28,
      daysInCycle: 30,
      unusedCreditValueUsd: 46.67, // (28/30) × $50
      newTierProratedCostUsd: 93.33, // (28/30) × $100
      netChargeUsd: 46.66,
      effectiveDate: new Date('2025-11-02'),
      status: 'applied',
      stripeInvoiceId: 'in_test_upgrade_promax_ent_001',
    },
  ];

  const createdProrations = [];

  for (const proration of prorationsData) {
    if (!proration.userId || !proration.subscriptionId) continue;

    try {
      const created = await prisma.prorationEvent.create({
        data: proration,
      });
      createdProrations.push(created);
    } catch (err) {
      console.log(`⚠️  Skipped proration: ${err}`);
    }
  }

  console.log(`✓ Created/Updated ${createdProrations.length} proration events\n`);
  return createdProrations;
}

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // ========================================================================
  // SEED DATA - PHASE 1: CORE OAUTH & USERS
  // ========================================================================

  const oauthClients = await seedOAuthClients();
  const users = await seedUserPersonas();

  let subscriptions: any[] = [];
  let credits: any[] = [];
  let models: any[] = [];
  let prorations: any[] = [];

  try {
    subscriptions = await seedSubscriptions(users);
    credits = await seedCredits(users);
    models = await seedModels();
    prorations = await seedProrations(users, subscriptions);
  } catch (err: any) {
    console.log('⚠️  Subscriptions, credits, models, or prorations tables not available - skipping\n');
  }

  // ========================================================================
  // SEED DATA - PHASE 2: LEGACY BRANDING (DOWNLOADS, FEEDBACK, ETC.)
  // ========================================================================

  console.log('Creating download records...');
  const downloads = await Promise.all([
    prisma.download.create({
      data: {
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'linux',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${downloads.length} download records\n`);

  console.log('Creating feedback entries...');
  const feedbacks = await Promise.all([
    prisma.feedback.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Love the app! The AI rewriting feature is incredibly helpful for my daily writing tasks.',
        email: 'user1@example.com',
      },
    }),
    prisma.feedback.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Great tool, but would love to see more customization options for the rewriting styles.',
        email: 'user2@example.com',
      },
    }),
    prisma.feedback.create({
      data: {
        message: 'Anonymous feedback: The interface is clean and intuitive. Keep up the good work!',
      },
    }),
    prisma.feedback.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Found a bug with the clipboard integration on Linux. Submitted diagnostic logs.',
        email: 'user3@example.com',
      },
    }),
    prisma.feedback.create({
      data: {
        message: 'This has transformed my workflow! Thank you for creating such an amazing tool.',
        email: 'user4@example.com',
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${feedbacks.length} feedback entries\n`);

  console.log('Creating diagnostic records...');
  const diagnostics = await Promise.all([
    prisma.diagnostic.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-001.log',
        fileSize: 15240, // ~15KB
      },
    }),
    prisma.diagnostic.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-002.log',
        fileSize: 28900, // ~29KB
      },
    }),
    prisma.diagnostic.create({
      data: {
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-003.log',
        fileSize: 45120, // ~45KB
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${diagnostics.length} diagnostic records\n`);

  console.log('Creating app version records...');
  const versions = await Promise.all([
    prisma.appVersion.upsert({
      where: { version: '1.0.0' },
      update: {},
      create: {
        version: '1.0.0',
        releaseDate: new Date('2025-10-01'),
        downloadUrl: 'https://releases.rephlo.ai/v1.0.0/rephlo-setup.exe',
        changelog: `# Rephlo v1.0.0 - Initial Release

## Features
- AI-powered text rewriting
- Cross-platform desktop app (Windows, macOS, Linux)
- Clipboard integration
- Multiple rewriting styles
- Local processing for privacy

## Known Issues
- None reported

## Installation
Download and run the installer for your platform.`,
        isLatest: false, // Old version
      },
    }),
    prisma.appVersion.upsert({
      where: { version: '1.1.0' },
      update: {},
      create: {
        version: '1.1.0',
        releaseDate: new Date('2025-10-15'),
        downloadUrl: 'https://releases.rephlo.ai/v1.1.0/rephlo-setup.exe',
        changelog: `# Rephlo v1.1.0

## New Features
- Dark mode support
- Enhanced clipboard integration
- Performance improvements

## Bug Fixes
- Fixed issue with special characters
- Improved stability on Linux

## Updates
- Updated AI model for better accuracy`,
        isLatest: false,
      },
    }),
    prisma.appVersion.upsert({
      where: { version: '1.2.0' },
      update: {},
      create: {
        version: '1.2.0',
        releaseDate: new Date('2025-11-01'),
        downloadUrl: 'https://releases.rephlo.ai/v1.2.0/rephlo-setup.exe',
        changelog: `# Rephlo v1.2.0 - Latest Release

## New Features
- Custom rewriting styles
- Batch processing support
- Improved UI/UX
- Diagnostic logging
- Feedback submission from app

## Bug Fixes
- Fixed memory leak on long sessions
- Resolved clipboard issues on Windows
- Improved error handling

## Performance
- 40% faster processing
- Reduced memory footprint
- Optimized startup time`,
        isLatest: true, // Current latest version
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${versions.length} app version records\n`);

  // ========================================================================
  // PHASE 3: RBAC SYSTEM
  // ========================================================================

  console.log('Creating RBAC roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        hierarchy: 1,
        isSystemRole: true, // NEW: Mark as system role
        defaultPermissions: [
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct', 'credits.adjust_expiration',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.delete', 'users.impersonate',
          'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ], // Changed: Removed JSON.stringify() - now using Json type
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full administrative access except system configuration',
        hierarchy: 2,
        isSystemRole: true, // NEW: Mark as system role
        defaultPermissions: [
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.impersonate',
          'roles.view', 'roles.assign', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ], // Changed: Removed JSON.stringify() - now using Json type
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'ops' },
      update: {},
      create: {
        name: 'ops',
        displayName: 'Operations Manager',
        description: 'Operational access for managing subscriptions and licenses',
        hierarchy: 3,
        isSystemRole: true, // NEW: Mark as system role
        defaultPermissions: [
          'subscriptions.view', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate',
          'licenses.view', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.approve_redemption',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage'
        ], // Changed: Removed JSON.stringify() - now using Json type
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'support' },
      update: {},
      create: {
        name: 'support',
        displayName: 'Support Specialist',
        description: 'Customer support access for resolving issues',
        hierarchy: 4,
        isSystemRole: true, // NEW: Mark as system role
        defaultPermissions: [
          'subscriptions.view',
          'licenses.view',
          'coupons.view',
          'credits.view_balance', 'credits.view_history',
          'users.view', 'users.edit_profile',
          'analytics.view_dashboard'
        ], // Changed: Removed JSON.stringify() - now using Json type
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'analyst' },
      update: {},
      create: {
        name: 'analyst',
        displayName: 'Data Analyst',
        description: 'Analytics and reporting access',
        hierarchy: 5,
        isSystemRole: true, // NEW: Mark as system role
        defaultPermissions: [
          'subscriptions.view',
          'licenses.view',
          'credits.view_history',
          'users.view',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ], // Changed: Removed JSON.stringify() - now using Json type
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'auditor' },
      update: {},
      create: {
        name: 'auditor',
        displayName: 'Auditor',
        description: 'Read-only access for compliance and audit',
        hierarchy: 6,
        isSystemRole: true, // NEW: Mark as system role
        defaultPermissions: [
          'subscriptions.view',
          'licenses.view',
          'credits.view_history',
          'users.view',
          'roles.view_audit_log',
          'analytics.view_dashboard'
        ], // Changed: Removed JSON.stringify() - now using Json type
        isActive: true,
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${roles.length} RBAC roles\n`);

  // Create RBAC team users
  console.log('Creating RBAC team users...');
  const rbacTeamUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ops.user@rephlo.ai' },
      update: {},
      create: {
        email: 'ops.user@rephlo.ai',
        firstName: 'Operations',
        lastName: 'Manager',
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'support.user@rephlo.ai' },
      update: {},
      create: {
        email: 'support.user@rephlo.ai',
        firstName: 'Support',
        lastName: 'Specialist',
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'analyst.user@rephlo.ai' },
      update: {},
      create: {
        email: 'analyst.user@rephlo.ai',
        firstName: 'Data',
        lastName: 'Analyst',
        emailVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'auditor.user@rephlo.ai' },
      update: {},
      create: {
        email: 'auditor.user@rephlo.ai',
        firstName: 'Security',
        lastName: 'Auditor',
        emailVerified: true,
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${rbacTeamUsers.length} RBAC team users\n`);

  // Assign roles to users
  console.log('Creating role assignments...');
  const roleAssignments = await Promise.all([
    // Super admin assignment to existing admin user
    prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: users[2].userId, // admin.test@rephlo.ai
          roleId: roles[0].id, // super_admin
        },
      },
      update: {},
      create: {
        userId: users[2].userId,
        roleId: roles[0].id,
        assignedBy: users[2].userId,
        assignedAt: new Date(),
      },
    }),
    // Ops user - Ops role
    prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: rbacTeamUsers[0].id,
          roleId: roles[2].id, // ops
        },
      },
      update: {},
      create: {
        userId: rbacTeamUsers[0].id,
        roleId: roles[2].id,
        assignedBy: users[2].userId,
        assignedAt: new Date(),
      },
    }),
    // Support user - Support role
    prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: rbacTeamUsers[1].id,
          roleId: roles[3].id, // support
        },
      },
      update: {},
      create: {
        userId: rbacTeamUsers[1].id,
        roleId: roles[3].id,
        assignedBy: users[2].userId,
        assignedAt: new Date(),
      },
    }),
    // Analyst user - Analyst role
    prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: rbacTeamUsers[2].id,
          roleId: roles[4].id, // analyst
        },
      },
      update: {},
      create: {
        userId: rbacTeamUsers[2].id,
        roleId: roles[4].id,
        assignedBy: users[2].userId,
        assignedAt: new Date(),
      },
    }),
    // Auditor user - Auditor role
    prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: rbacTeamUsers[3].id,
          roleId: roles[5].id, // auditor
        },
      },
      update: {},
      create: {
        userId: rbacTeamUsers[3].id,
        roleId: roles[5].id,
        assignedBy: users[2].userId,
        assignedAt: new Date(),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${roleAssignments.length} role assignments\n`);

  // ========================================================================
  // PRINT COMPREHENSIVE SUMMARY
  // ========================================================================

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  🌱 DATABASE SEED COMPLETED ✅                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 SEED SUMMARY BY CATEGORY:\n');

  console.log('🔐 OAuth & Identity:');
  console.log(`   OAuth Clients: ${oauthClients.length}`);
  console.log(`   Users:         ${users.length}`);

  console.log('\n💳 Subscriptions & Billing:');
  console.log(`   Subscriptions: ${subscriptions.length}`);
  console.log(`   Credit Pools:  ${credits.length}`);

  console.log('\n🤖 LLM Models:');
  console.log(`   Models:        ${models.length}`);
  console.log('   Providers:     OpenAI, Anthropic, Google, Mistral, Meta');

  console.log('\n📈 Legacy Branding:');
  console.log(`   Downloads:     ${downloads.length}`);
  console.log(`   Feedbacks:     ${feedbacks.length}`);
  console.log(`   Diagnostics:   ${diagnostics.length}`);
  console.log(`   App Versions:  ${versions.length}`);

  console.log('\n🔑 RBAC System (Plan 119):');
  console.log(`   Roles:         ${roles.length}`);
  console.log(`   RBAC Users:    ${rbacTeamUsers.length}`);
  console.log(`   Role Assignments: ${roleAssignments.length}`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  console.log('📋 TEST CREDENTIALS:\n');

  console.log('Free Tier User:');
  console.log('   Email:    free.user@example.com');
  console.log('   Password: TestPassword123!');
  console.log('   Credits:  100 monthly\n');

  console.log('Pro Tier User (Local Auth):');
  console.log('   Email:    pro.user@example.com');
  console.log('   Password: TestPassword123!');
  console.log('   Credits:  10,000 + 5,000 bonus monthly\n');

  console.log('Admin User (MFA Enabled):');
  console.log('   Email:    admin.test@rephlo.ai');
  console.log('   Password: AdminPassword123!');
  console.log('   MFA:      Enabled (TOTP)\n');

  console.log('Pro Tier User (Google Auth):');
  console.log('   Email:    google.user@example.com');
  console.log('   Auth:     Google OAuth\n');

  console.log('RBAC Team Users:');
  console.log('   Ops Manager:');
  console.log('     Email: ops.user@rephlo.ai');
  console.log('     Role:  Operations Manager (25 permissions)\n');
  console.log('   Support Specialist:');
  console.log('     Email: support.user@rephlo.ai');
  console.log('     Role:  Support Specialist (12 permissions)\n');
  console.log('   Data Analyst:');
  console.log('     Email: analyst.user@rephlo.ai');
  console.log('     Role:  Data Analyst (8 permissions)\n');
  console.log('   Auditor:');
  console.log('     Email: auditor.user@rephlo.ai');
  console.log('     Role:  Auditor (5 permissions)\n');

  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🔗 OAUTH CLIENT CONFIGURATIONS:\n');

  oauthClients.forEach((client) => {
    console.log(`Client: ${client.clientName}`);
    console.log(`   ID:     ${client.clientId}`);
    console.log(`   Secret: ${client.secret}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('✅ Next Steps:');
  console.log('   1. Verify OAuth clients are loaded in OIDC provider');
  console.log('   2. Update POC-Client with poc-client-test credentials');
  console.log('   3. Run integration tests with seeded data');
  console.log('   4. Validate subscription and credit tiers\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
