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

import { PrismaClient, ProrationEventType, ProrationStatus } from '@prisma/client';
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
    clientSecret: null, // Public client using PKCE - desktop apps cannot securely store secrets
    redirectUris: [
      'http://localhost:8327/callback',
      'http://localhost:8329/callback',
      'ai.rephlo.desktop:/callback', // Reverse domain name based custom URI scheme
      'http://127.0.0.1:8327/callback', // Loopback IP for native apps
      'http://127.0.0.1:8329/callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scope: 'openid email profile offline_access llm.inference models.read user.info credits.read',
    config: {
      skipConsentScreen: true,
      description: 'Official Rephlo Desktop Application - Public client with PKCE and refresh tokens',
      tags: ['desktop', 'official', 'test', 'public'],
      allowedOrigins: ['http://localhost:8327', 'http://localhost:8329', 'http://127.0.0.1:8327', 'http://127.0.0.1:8329'],
    },
  },
  {
    clientId: 'poc-client-test',
    clientName: 'POC Client (Test)',
    clientSecret: null, // Public client using PKCE - no secret needed
    redirectUris: [
      'http://localhost:8080/callback',
      'http://localhost:8080/oauth/callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'], // Added refresh_token for offline_access
    responseTypes: ['code'],
    scope: 'openid email profile offline_access llm.inference models.read user.info credits.read',
    config: {
      skipConsentScreen: true,
      description: 'Proof of Concept Client for Testing - Public client with PKCE and refresh tokens',
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
  // Updated 2025-11-15: New pricing structure with x100 credit conversion (1 credit = $0.01)
  const tierConfig = {
    free: {
      creditsPerMonth: 200,        // $2 worth of API usage
      priceCents: 0,
      billingInterval: 'monthly',
    },
    pro: {
      creditsPerMonth: 1500,       // $15 worth of API usage
      priceCents: 1500,            // $15/month
      billingInterval: 'monthly',
    },
    pro_plus: {                    // NEW TIER
      creditsPerMonth: 5000,       // $50 worth of API usage
      priceCents: 4500,            // $45/month
      billingInterval: 'monthly',
    },
    pro_max: {
      creditsPerMonth: 25000,      // $250 worth of API usage
      priceCents: 19900,           // $199/month
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
 * Uses new JSONB meta format for all model metadata
 */
async function seedModels() {
  console.log('Creating LLM models...');

  const models = [
    // OpenAI Models (August 2025 - GPT-5 Release)
    {
      id: 'gpt-5',
      name: 'gpt-5',
      provider: 'openai',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'GPT-5',
        description: 'OpenAI\'s best AI system with 272K input, 128K output, 94.6% AIME math, 74.9% SWE-bench coding, 45% fewer hallucinations',
        capabilities: ['text', 'vision', 'function_calling', 'long_context', 'code'],
        contextLength: 272000,
        maxOutputTokens: 128000,
        inputCostPerMillionTokens: 1250,
        outputCostPerMillionTokens: 10000,
        creditsPer1kTokens: 28,
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          openai: {
            modelFamily: 'gpt-5',
            trainingCutoff: '2025-06',
          },
        },
        internalNotes: 'Flagship model - highest tier access',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },
    {
      id: 'gpt-5-mini',
      name: 'gpt-5-mini',
      provider: 'openai',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'GPT-5 Mini',
        description: 'Cost-efficient GPT-5 with 87.5% cost reduction, 272K input context with smart routing',
        capabilities: ['text', 'vision', 'function_calling', 'long_context', 'code'],
        contextLength: 272000,
        maxOutputTokens: 128000,
        inputCostPerMillionTokens: 250,
        outputCostPerMillionTokens: 2000,
        creditsPer1kTokens: 6,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          openai: {
            modelFamily: 'gpt-5',
            trainingCutoff: '2025-06',
          },
        },
        internalNotes: 'Cost-efficient variant for pro tier',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },
    {
      id: 'gpt-5-nano',
      name: 'gpt-5-nano',
      provider: 'openai',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'GPT-5 Nano',
        description: 'Ultra cost-efficient GPT-5 variant with 272K context, ideal for high-volume tasks',
        capabilities: ['text', 'function_calling', 'long_context', 'code'],
        contextLength: 272000,
        maxOutputTokens: 128000,
        inputCostPerMillionTokens: 50,
        outputCostPerMillionTokens: 400,
        creditsPer1kTokens: 1,
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          openai: {
            modelFamily: 'gpt-5',
            trainingCutoff: '2025-06',
          },
        },
        internalNotes: 'Free tier access - entry level model',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },

    // Anthropic Models (2025 - Claude 4 Generation)
    {
      id: 'claude-opus-4-1',
      name: 'claude-opus-4.1',
      provider: 'anthropic',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Claude Opus 4.1',
        description: 'Most powerful Claude model for highly complex tasks, 200K context (August 2025)',
        capabilities: ['text', 'vision', 'function_calling', 'long_context', 'code'],
        contextLength: 200000,
        maxOutputTokens: 16384,
        inputCostPerMillionTokens: 15000,
        outputCostPerMillionTokens: 75000,
        creditsPer1kTokens: 180,
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          anthropic: {
            modelSeries: 'claude-4',
            knowledgeCutoff: '2025-08',
          },
        },
        internalNotes: 'Most powerful Anthropic model',
        complianceTags: ['SOC2', 'GDPR', 'HIPAA'],
      },
    },
    {
      id: 'claude-sonnet-4-5',
      name: 'claude-sonnet-4.5',
      provider: 'anthropic',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Claude Sonnet 4.5',
        description: 'Most intelligent for agents, coding, and computer use with 200K context (September 2025)',
        capabilities: ['text', 'vision', 'function_calling', 'long_context', 'code'],
        contextLength: 200000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 3000,
        outputCostPerMillionTokens: 15000,
        creditsPer1kTokens: 40,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          anthropic: {
            modelSeries: 'claude-4',
            knowledgeCutoff: '2025-09',
          },
        },
        internalNotes: 'Best for agentic coding',
        complianceTags: ['SOC2', 'GDPR', 'HIPAA'],
      },
    },
    {
      id: 'claude-haiku-4-5',
      name: 'claude-haiku-4.5',
      provider: 'anthropic',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Claude Haiku 4.5',
        description: 'Fastest and most cost-efficient Claude with 200K context (October 2025)',
        capabilities: ['text', 'vision', 'function_calling', 'long_context'],
        contextLength: 200000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 1000,
        outputCostPerMillionTokens: 5000,
        creditsPer1kTokens: 15,
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          anthropic: {
            modelSeries: 'claude-4',
            knowledgeCutoff: '2025-10',
          },
        },
        internalNotes: 'Free tier access - fast and efficient',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },
    // LEGACY MODEL EXAMPLE: Claude 3.5 Sonnet (superseded by Claude 4.5)
    {
      id: 'claude-3-5-sonnet',
      name: 'claude-3.5-sonnet',
      provider: 'anthropic',
      isLegacy: true,
      isArchived: false,
      meta: {
        displayName: 'Claude 3.5 Sonnet (Legacy)',
        description: 'Previous generation Claude model - superseded by Claude 4.5 Sonnet',
        capabilities: ['text', 'vision', 'function_calling', 'long_context', 'code'],
        contextLength: 200000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 3000,
        outputCostPerMillionTokens: 15000,
        creditsPer1kTokens: 40,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        legacyReplacementModelId: 'claude-sonnet-4-5',
        deprecationNotice: 'Claude 3.5 Sonnet will be deprecated on 2025-12-31. Please migrate to Claude Sonnet 4.5 for improved performance.',
        sunsetDate: '2025-12-31T23:59:59Z',
        providerMetadata: {
          anthropic: {
            modelSeries: 'claude-3',
            knowledgeCutoff: '2024-08',
          },
        },
        internalNotes: 'Legacy model - encourage migration to 4.5',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },

    // Google Models (2025)
    {
      id: 'gemini-2-5-pro',
      name: 'gemini-2.5-pro',
      provider: 'google',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Gemini 2.5 Pro',
        description: 'Most advanced Gemini model with 1M context (2M coming soon), exceptional reasoning',
        capabilities: ['text', 'vision', 'function_calling', 'long_context', 'code'],
        contextLength: 1000000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 1250,
        outputCostPerMillionTokens: 5000,
        creditsPer1kTokens: 20,
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          google: {
            modelType: 'gemini-pro',
            tuningSupport: true,
          },
        },
        internalNotes: 'Largest context window - 1M tokens',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },
    {
      id: 'gemini-2-0-flash',
      name: 'gemini-2.0-flash',
      provider: 'google',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Gemini 2.0 Flash',
        description: 'Generally available model with 1M context, multimodal input, and native tool use',
        capabilities: ['text', 'vision', 'function_calling', 'long_context'],
        contextLength: 1000000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 100,
        outputCostPerMillionTokens: 400,
        creditsPer1kTokens: 3,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          google: {
            modelType: 'gemini-flash',
          },
        },
        internalNotes: 'Fast multimodal model',
        complianceTags: ['SOC2', 'GDPR'],
      },
    },
    {
      id: 'gemini-2-0-flash-lite',
      name: 'gemini-2.0-flash-lite',
      provider: 'google',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Gemini 2.0 Flash-Lite',
        description: 'Most cost-efficient Gemini model with 1M context and multimodal capabilities',
        capabilities: ['text', 'vision', 'function_calling', 'long_context'],
        contextLength: 1000000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 38,
        outputCostPerMillionTokens: 150,
        creditsPer1kTokens: 1,
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          google: {
            modelType: 'gemini-flash',
          },
        },
        internalNotes: 'Free tier - ultra efficient',
        complianceTags: ['SOC2'],
      },
    },

    // Mistral Models (2025)
    {
      id: 'mistral-medium-3',
      name: 'mistral-medium-3',
      provider: 'mistral',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Mistral Medium 3',
        description: 'Latest Mistral model excelling in coding and STEM tasks, 90% of Claude 3.7 at lower cost',
        capabilities: ['text', 'function_calling', 'code'],
        contextLength: 128000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 400,
        outputCostPerMillionTokens: 2000,
        creditsPer1kTokens: 8,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Strong coding capabilities',
        complianceTags: ['SOC2'],
      },
    },
    {
      id: 'mistral-small-3-1',
      name: 'mistral-small-3.1',
      provider: 'mistral',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Mistral Small 3.1',
        description: 'Cost-efficient model for standard tasks with strong multilingual support',
        capabilities: ['text', 'function_calling'],
        contextLength: 128000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 200,
        outputCostPerMillionTokens: 600,
        creditsPer1kTokens: 3,
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Multilingual support',
        complianceTags: [],
      },
    },

    // Meta Models (2025)
    {
      id: 'llama-4-scout',
      name: 'llama-4-scout',
      provider: 'meta',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Llama 4 Scout',
        description: 'Industry-leading 10M context window with superior text and visual intelligence',
        capabilities: ['text', 'vision', 'function_calling', 'long_context'],
        contextLength: 10000000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 200,
        outputCostPerMillionTokens: 800,
        creditsPer1kTokens: 5,
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Massive 10M context window',
        complianceTags: [],
      },
    },
    {
      id: 'llama-3-3-70b',
      name: 'llama-3.3-70b',
      provider: 'meta',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Llama 3.3 70B',
        description: 'Excellent performance at 10-15x lower cost than GPT-4o with 128K context',
        capabilities: ['text', 'function_calling', 'code', 'long_context'],
        contextLength: 128000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 100,
        outputCostPerMillionTokens: 400,
        creditsPer1kTokens: 2,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Cost-effective large model',
        complianceTags: [],
      },
    },
    {
      id: 'llama-3-1-405b',
      name: 'llama-3.1-405b',
      provider: 'meta',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Llama 3.1 405B',
        description: 'Largest Llama model with exceptional capabilities and 128K context',
        capabilities: ['text', 'function_calling', 'code', 'long_context'],
        contextLength: 128000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 300,
        outputCostPerMillionTokens: 1200,
        creditsPer1kTokens: 6,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Largest parameter count',
        complianceTags: [],
      },
    },

    // xAI Models (2025)
    {
      id: 'grok-4',
      name: 'grok-4-0709',
      provider: 'xai',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Grok 4',
        description: 'The most intelligent model in the world with native tool use and real-time search (August 2025)',
        capabilities: ['text', 'function_calling', 'long_context', 'code'],
        contextLength: 256000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 3000,
        outputCostPerMillionTokens: 15000,
        creditsPer1kTokens: 40,
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Real-time search capabilities',
        complianceTags: [],
      },
    },
    {
      id: 'grok-4-fast',
      name: 'grok-4-fast-reasoning',
      provider: 'xai',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Grok 4 Fast',
        description: 'Fast reasoning model with 2M context window, ideal for complex tasks (September 2025)',
        capabilities: ['text', 'function_calling', 'long_context', 'code'],
        contextLength: 2000000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 200,
        outputCostPerMillionTokens: 500,
        creditsPer1kTokens: 2,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: '2M context - very large',
        complianceTags: [],
      },
    },
    {
      id: 'grok-code-fast-1',
      name: 'grok-code-fast-1',
      provider: 'xai',
      isLegacy: false,
      isArchived: false,
      meta: {
        displayName: 'Grok Code Fast 1',
        description: 'Speedy and economical reasoning model excelling at agentic coding (September 2025)',
        capabilities: ['text', 'function_calling', 'code'],
        contextLength: 128000,
        maxOutputTokens: 8192,
        inputCostPerMillionTokens: 200,
        outputCostPerMillionTokens: 1500,
        creditsPer1kTokens: 5,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {},
        internalNotes: 'Agentic coding specialist',
        complianceTags: [],
      },
    },

    // ARCHIVED MODEL EXAMPLE: Text-Davinci-003 (GPT-3.5 - retired)
    {
      id: 'text-davinci-003',
      name: 'text-davinci-003',
      provider: 'openai',
      isLegacy: false,
      isArchived: true,
      meta: {
        displayName: 'Text-Davinci-003 (Archived)',
        description: 'Archived GPT-3.5 model - no longer available for inference',
        capabilities: ['text'],
        contextLength: 4096,
        maxOutputTokens: 4096,
        inputCostPerMillionTokens: 2000,
        outputCostPerMillionTokens: 2000,
        creditsPer1kTokens: 5,
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
        providerMetadata: {
          openai: {
            modelFamily: 'gpt-3.5',
            trainingCutoff: '2021-09',
          },
        },
        internalNotes: 'Archived 2024-01-04 - superseded by GPT-4',
        complianceTags: [],
      },
    },
  ];

  const createdModels = [];

  for (const model of models) {
    const created = await prisma.model.upsert({
      where: { id: model.id },
      update: {
        name: model.name,
        provider: model.provider,
        isLegacy: model.isLegacy,
        isArchived: model.isArchived,
        isAvailable: !model.isArchived, // Archived models are not available
        meta: model.meta,
      },
      create: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        isLegacy: model.isLegacy,
        isArchived: model.isArchived,
        isAvailable: !model.isArchived, // Archived models are not available
        meta: model.meta,
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

  // First, create SubscriptionMonetization records for prorations to reference
  // ProrationEvent foreign key points to SubscriptionMonetization, not Subscription
  const monetizationSubscriptions = [];
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  for (let i = 0; i < Math.min(users.length, 3); i++) {
    const user = users[i];
    const persona = USER_PERSONAS[i];

    // Delete existing monetization subscription
    await prisma.subscriptionMonetization.deleteMany({
      where: { userId: user.userId },
    });

    const monetizationSub = await prisma.subscriptionMonetization.create({
      data: {
        userId: user.userId,
        tier: persona.subscriptionTier, // Plain string - schema defines tier as String, not enum
        billingCycle: 'monthly',
        status: 'active',
        basePriceUsd: persona.subscriptionTier === 'free' ? '0.00' : '20.00',
        monthlyCreditAllocation: persona.subscriptionTier === 'free' ? 100 : 10000,
        currentPeriodStart: now,
        currentPeriodEnd: endOfMonth,
      },
    });

    monetizationSubscriptions.push({
      subscriptionId: monetizationSub.id,
      userId: monetizationSub.userId,
      tier: monetizationSub.tier,
    });
  }

  console.log(`✓ Created ${monetizationSubscriptions.length} SubscriptionMonetization records for prorations`);

  const prorationsData = [
    // Upgrade from free to pro
    {
      userId: users[0]?.userId,
      subscriptionId: monetizationSubscriptions[0]?.subscriptionId,
      fromTier: 'free',
      toTier: 'pro',
      changeType: ProrationEventType.upgrade,
      daysRemaining: 20,
      daysInCycle: 30,
      unusedCreditValueUsd: '0.00', // Free tier has no value
      newTierProratedCostUsd: '13.33', // (20/30) × $20
      netChargeUsd: '13.33',
      effectiveDate: new Date('2025-11-05'),
      status: ProrationStatus.applied,
      stripeInvoiceId: 'in_test_upgrade_free_pro_001',
    },
    // Upgrade from pro to pro_max
    {
      userId: users[1]?.userId,
      subscriptionId: monetizationSubscriptions[1]?.subscriptionId,
      fromTier: 'pro',
      toTier: 'pro_max',
      changeType: ProrationEventType.upgrade,
      daysRemaining: 15,
      daysInCycle: 30,
      unusedCreditValueUsd: '10.00', // (15/30) × $20
      newTierProratedCostUsd: '25.00', // (15/30) × $50
      netChargeUsd: '15.00',
      effectiveDate: new Date('2025-11-08'),
      status: ProrationStatus.applied,
      stripeInvoiceId: 'in_test_upgrade_pro_promax_001',
    },
    // Downgrade from pro to free
    {
      userId: users[2]?.userId,
      subscriptionId: monetizationSubscriptions[2]?.subscriptionId,
      fromTier: 'pro',
      toTier: 'free',
      changeType: ProrationEventType.downgrade,
      daysRemaining: 10,
      daysInCycle: 30,
      unusedCreditValueUsd: '6.67', // (10/30) × $20
      newTierProratedCostUsd: '0.00', // Free tier
      netChargeUsd: '-6.67', // Credit back to user
      effectiveDate: new Date('2025-11-10'),
      status: ProrationStatus.applied,
      stripeInvoiceId: 'in_test_downgrade_pro_free_001',
    },
    // Interval change - monthly to annual
    {
      userId: users[0]?.userId,
      subscriptionId: monetizationSubscriptions[0]?.subscriptionId,
      fromTier: 'pro',
      toTier: 'pro',
      changeType: ProrationEventType.interval_change,
      daysRemaining: 25,
      daysInCycle: 30,
      unusedCreditValueUsd: '16.67', // (25/30) × $20
      newTierProratedCostUsd: '183.33', // (25/30) × $220 (annual)
      netChargeUsd: '166.66',
      effectiveDate: new Date('2025-11-03'),
      status: ProrationStatus.applied,
      stripeInvoiceId: 'in_test_interval_monthly_annual_001',
    },
    // Pending upgrade
    {
      userId: users[1]?.userId,
      subscriptionId: monetizationSubscriptions[1]?.subscriptionId,
      fromTier: 'free',
      toTier: 'pro',
      changeType: ProrationEventType.upgrade,
      daysRemaining: 18,
      daysInCycle: 30,
      unusedCreditValueUsd: '0.00',
      newTierProratedCostUsd: '12.00',
      netChargeUsd: '12.00',
      effectiveDate: new Date('2025-11-12'),
      status: ProrationStatus.pending,
    },
    // Failed proration
    {
      userId: users[2]?.userId,
      subscriptionId: monetizationSubscriptions[2]?.subscriptionId,
      fromTier: 'pro',
      toTier: 'pro_max',
      changeType: ProrationEventType.upgrade,
      daysRemaining: 12,
      daysInCycle: 30,
      unusedCreditValueUsd: '8.00',
      newTierProratedCostUsd: '20.00',
      netChargeUsd: '12.00',
      effectiveDate: new Date('2025-11-09'),
      status: ProrationStatus.failed,
    },
    // Reversed proration (refund)
    {
      userId: users[0]?.userId,
      subscriptionId: monetizationSubscriptions[0]?.subscriptionId,
      fromTier: 'pro_max',
      toTier: 'pro',
      changeType: ProrationEventType.downgrade,
      daysRemaining: 22,
      daysInCycle: 30,
      unusedCreditValueUsd: '36.67', // (22/30) × $50
      newTierProratedCostUsd: '14.67', // (22/30) × $20
      netChargeUsd: '-22.00', // Credit back
      effectiveDate: new Date('2025-11-01'),
      status: ProrationStatus.reversed,
      stripeInvoiceId: 'in_test_reversed_promax_pro_001',
    },
    // Enterprise upgrade
    {
      userId: users[1]?.userId,
      subscriptionId: monetizationSubscriptions[1]?.subscriptionId,
      fromTier: 'pro_max',
      toTier: 'enterprise_pro',
      changeType: ProrationEventType.upgrade,
      daysRemaining: 28,
      daysInCycle: 30,
      unusedCreditValueUsd: '46.67', // (28/30) × $50
      newTierProratedCostUsd: '93.33', // (28/30) × $100
      netChargeUsd: '46.66',
      effectiveDate: new Date('2025-11-02'),
      status: ProrationStatus.applied,
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

// ============================================================================
// PROVIDER PRICING SYSTEM (Plan 161)
// ============================================================================

/**
 * Seed AI providers (OpenAI, Anthropic, Google, Mistral, Azure OpenAI)
 * Part of Plan 161: Provider Pricing System Activation
 * Reference: docs/research/005-vendor-pricing-november-2025.md
 */
async function seedProviders() {
  console.log('Creating AI provider records...');

  const providers = await Promise.all([
    // OpenAI
    prisma.provider.upsert({
      where: { name: 'openai' },
      update: {
        apiType: 'openai-compatible',
        isEnabled: true,
      },
      create: {
        name: 'openai',
        apiType: 'openai-compatible',
        isEnabled: true,
      },
    }),

    // Anthropic
    prisma.provider.upsert({
      where: { name: 'anthropic' },
      update: {
        apiType: 'anthropic-sdk',
        isEnabled: true,
      },
      create: {
        name: 'anthropic',
        apiType: 'anthropic-sdk',
        isEnabled: true,
      },
    }),

    // Google AI
    prisma.provider.upsert({
      where: { name: 'google' },
      update: {
        apiType: 'google-generative-ai',
        isEnabled: true,
      },
      create: {
        name: 'google',
        apiType: 'google-generative-ai',
        isEnabled: true,
      },
    }),

    // Mistral AI
    prisma.provider.upsert({
      where: { name: 'mistral' },
      update: {
        apiType: 'openai-compatible',
        isEnabled: true,
      },
      create: {
        name: 'mistral',
        apiType: 'openai-compatible',
        isEnabled: true,
      },
    }),

    // Azure OpenAI (uses same API as OpenAI)
    prisma.provider.upsert({
      where: { name: 'azure-openai' },
      update: {
        apiType: 'openai-compatible',
        isEnabled: true,
      },
      create: {
        name: 'azure-openai',
        apiType: 'openai-compatible',
        isEnabled: true,
      },
    }),
  ]);

  console.log(`✓ Created/Updated ${providers.length} provider records\n`);
  return providers;
}

/**
 * Seed model pricing from vendor research (November 2025)
 * Prices are per 1,000 tokens (database format)
 * Part of Plan 161: Provider Pricing System Activation
 * Reference: docs/research/005-vendor-pricing-november-2025.md
 */
async function seedModelPricing(providers: any[]) {
  console.log('Creating model pricing records...');

  const effectiveFrom = new Date('2025-11-13');
  const providerMap = Object.fromEntries(providers.map((p) => [p.name, p.id]));

  const pricing = await Promise.all([
    // ========================================================================
    // OpenAI Models
    // ========================================================================

    // GPT-4o ($5.00/$15.00 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'gpt-4o',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'gpt-4o',
        inputPricePer1k: 0.005, // $5.00 per 1M / 1000
        outputPricePer1k: 0.015, // $15.00 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // GPT-4o-mini ($0.15/$0.60 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'gpt-4o-mini',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'gpt-4o-mini',
        inputPricePer1k: 0.00015, // $0.15 per 1M / 1000
        outputPricePer1k: 0.0006, // $0.60 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // GPT-5 (use GPT-4o pricing as placeholder until official release)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'gpt-5',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'gpt-5',
        inputPricePer1k: 0.005, // Same as GPT-4o
        outputPricePer1k: 0.015,
        effectiveFrom,
        isActive: true,
      },
    }),

    // GPT-5 Mini (use GPT-4o-mini pricing as placeholder)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'gpt-5-mini',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'gpt-5-mini',
        inputPricePer1k: 0.00015, // Same as gpt-4o-mini
        outputPricePer1k: 0.0006,
        effectiveFrom,
        isActive: true,
      },
    }),

    // GPT-5 Nano (estimated $0.05/$0.20 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'gpt-5-nano',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'gpt-5-nano',
        inputPricePer1k: 0.00005, // $0.05 per 1M / 1000
        outputPricePer1k: 0.0002, // $0.20 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // o1 ($15.00/$60.00 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'o1',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'o1',
        inputPricePer1k: 0.015, // $15.00 per 1M / 1000
        outputPricePer1k: 0.06, // $60.00 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // o1-mini ($1.10/$4.40 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'o1-mini',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'o1-mini',
        inputPricePer1k: 0.0011, // $1.10 per 1M / 1000
        outputPricePer1k: 0.0044, // $4.40 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // o3-mini ($1.10/$4.40 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['openai'],
          modelName: 'o3-mini',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['openai'],
        modelName: 'o3-mini',
        inputPricePer1k: 0.0011, // $1.10 per 1M / 1000
        outputPricePer1k: 0.0044, // $4.40 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // ========================================================================
    // Anthropic Models (with prompt caching)
    // ========================================================================

    // Claude Opus 4.1 ($15/$75 per 1M tokens)
    // Cache Write (5m): $18.75, Cache Hit: $1.50 per 1M tokens
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['anthropic'],
          modelName: 'claude-opus-4.1',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['anthropic'],
        modelName: 'claude-opus-4.1',
        inputPricePer1k: 0.015, // $15 per 1M / 1000
        outputPricePer1k: 0.075, // $75 per 1M / 1000
        cacheInputPricePer1k: 0.01875, // $18.75 per 1M / 1000 (5-min cache write)
        cacheHitPricePer1k: 0.0015, // $1.50 per 1M / 1000 (cache hit)
        effectiveFrom,
        isActive: true,
      },
    }),

    // Claude Sonnet 4.5 ($3/$15 per 1M tokens)
    // Cache Write (5m): $3.75, Cache Hit: $0.30 per 1M tokens
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['anthropic'],
          modelName: 'claude-sonnet-4.5',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['anthropic'],
        modelName: 'claude-sonnet-4.5',
        inputPricePer1k: 0.003, // $3 per 1M / 1000
        outputPricePer1k: 0.015, // $15 per 1M / 1000
        cacheInputPricePer1k: 0.00375, // $3.75 per 1M / 1000 (5-min cache write)
        cacheHitPricePer1k: 0.0003, // $0.30 per 1M / 1000 (cache hit)
        effectiveFrom,
        isActive: true,
      },
    }),

    // Claude 3.5 Sonnet (use Sonnet 4.5 pricing)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['anthropic'],
          modelName: 'claude-3-5-sonnet',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['anthropic'],
        modelName: 'claude-3-5-sonnet',
        inputPricePer1k: 0.003,
        outputPricePer1k: 0.015,
        cacheInputPricePer1k: 0.00375,
        cacheHitPricePer1k: 0.0003,
        effectiveFrom,
        isActive: true,
      },
    }),

    // Claude Haiku 4.5 ($1/$5 per 1M tokens)
    // Cache Write (5m): $1.25, Cache Hit: $0.10 per 1M tokens
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['anthropic'],
          modelName: 'claude-haiku-4.5',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['anthropic'],
        modelName: 'claude-haiku-4.5',
        inputPricePer1k: 0.001, // $1 per 1M / 1000
        outputPricePer1k: 0.005, // $5 per 1M / 1000
        cacheInputPricePer1k: 0.00125, // $1.25 per 1M / 1000 (5-min cache write)
        cacheHitPricePer1k: 0.0001, // $0.10 per 1M / 1000 (cache hit)
        effectiveFrom,
        isActive: true,
      },
    }),

    // ========================================================================
    // Google Gemini Models (text/image/video pricing only, audio excluded)
    // ========================================================================

    // Gemini 2.5 Pro (≤200K context: $1.25/$10 per 1M tokens)
    // Cache Write: $0.125, Cache storage not tracked in this table
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['google'],
          modelName: 'gemini-2-5-pro',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['google'],
        modelName: 'gemini-2-5-pro',
        inputPricePer1k: 0.00125, // $1.25 per 1M / 1000
        outputPricePer1k: 0.01, // $10 per 1M / 1000
        cacheInputPricePer1k: 0.000125, // $0.125 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // Gemini 2.5 Flash (text/image/video: $0.30/$2.50 per 1M tokens)
    // Cache Write: $0.03 per 1M tokens
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['google'],
          modelName: 'gemini-2-5-flash',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['google'],
        modelName: 'gemini-2-5-flash',
        inputPricePer1k: 0.0003, // $0.30 per 1M / 1000
        outputPricePer1k: 0.0025, // $2.50 per 1M / 1000
        cacheInputPricePer1k: 0.00003, // $0.03 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // Gemini 2.0 Flash (use 2.5 Flash pricing)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['google'],
          modelName: 'gemini-2-0-flash',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['google'],
        modelName: 'gemini-2-0-flash',
        inputPricePer1k: 0.0003, // Same as 2.5 Flash
        outputPricePer1k: 0.0025,
        cacheInputPricePer1k: 0.00003,
        effectiveFrom,
        isActive: true,
      },
    }),

    // Gemini 2.5 Flash-Lite (text/image/video: $0.10/$0.40 per 1M tokens)
    // Cache Write: $0.01 per 1M tokens
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['google'],
          modelName: 'gemini-2-5-flash-lite',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['google'],
        modelName: 'gemini-2-5-flash-lite',
        inputPricePer1k: 0.0001, // $0.10 per 1M / 1000
        outputPricePer1k: 0.0004, // $0.40 per 1M / 1000
        cacheInputPricePer1k: 0.00001, // $0.01 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // Gemini 2.0 Flash-Lite (use 2.5 Flash-Lite pricing)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['google'],
          modelName: 'gemini-2-0-flash-lite',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['google'],
        modelName: 'gemini-2-0-flash-lite',
        inputPricePer1k: 0.0001, // Same as 2.5 Flash-Lite
        outputPricePer1k: 0.0004,
        cacheInputPricePer1k: 0.00001,
        effectiveFrom,
        isActive: true,
      },
    }),

    // ========================================================================
    // Mistral AI Models
    // ========================================================================

    // Mistral Large 2 ($2.00/$6.00 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['mistral'],
          modelName: 'mistral-large-2',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['mistral'],
        modelName: 'mistral-large-2',
        inputPricePer1k: 0.002, // $2.00 per 1M / 1000
        outputPricePer1k: 0.006, // $6.00 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // Mistral Medium 3 ($0.40/$2.00 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['mistral'],
          modelName: 'mistral-medium-3',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['mistral'],
        modelName: 'mistral-medium-3',
        inputPricePer1k: 0.0004, // $0.40 per 1M / 1000
        outputPricePer1k: 0.002, // $2.00 per 1M / 1000
        effectiveFrom,
        isActive: true,
      },
    }),

    // ========================================================================
    // Azure OpenAI (same pricing as OpenAI direct)
    // ========================================================================

    // GPT-4o via Azure ($5.00/$15.00 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['azure-openai'],
          modelName: 'gpt-4o',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['azure-openai'],
        modelName: 'gpt-4o',
        inputPricePer1k: 0.005, // Same as OpenAI direct
        outputPricePer1k: 0.015,
        effectiveFrom,
        isActive: true,
      },
    }),

    // GPT-4o-mini via Azure ($0.15/$0.60 per 1M tokens)
    prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: providerMap['azure-openai'],
          modelName: 'gpt-4o-mini',
          effectiveFrom,
        },
      },
      update: {},
      create: {
        providerId: providerMap['azure-openai'],
        modelName: 'gpt-4o-mini',
        inputPricePer1k: 0.00015, // Same as OpenAI direct
        outputPricePer1k: 0.0006,
        effectiveFrom,
        isActive: true,
      },
    }),
  ]);

  console.log(`✓ Created/Updated ${pricing.length} model pricing records\n`);
  return pricing;
}

/**
 * Seed pricing configuration with tier-based margin multipliers
 * Part of Plan 161: Provider Pricing System Activation
 * Reference: docs/plan/161-provider-pricing-system-activation.md
 *
 * Note: Uses find-or-create pattern since there's no unique constraint
 */
async function seedPricingConfigs(providers: any[]) {
  console.log('Creating pricing configuration records...');

  const providerMap = Object.fromEntries(providers.map((p) => [p.name, p.id]));

  // Get admin user to use as creator (admin.test@rephlo.ai from seed data)
  const adminUser = await prisma.user.findFirst({
    where: {
      email: 'admin.test@rephlo.ai'
    }
  });

  if (!adminUser) {
    console.log('⚠️  No admin user found - skipping pricing configs');
    return [];
  }

  const effectiveFrom = new Date('2025-11-13');

  // Helper function to find-or-create pricing config
  const findOrCreateConfig = async (data: any) => {
    const existing = await prisma.pricingConfig.findFirst({
      where: {
        scopeType: data.scopeType,
        subscriptionTier: data.subscriptionTier,
        providerId: data.providerId || null,
        isActive: true,
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.pricingConfig.create({ data });
  };

  // Global tier configs (apply to all providers unless overridden)
  const globalConfigs = await Promise.all([
    // Free tier: 50% margin (1.50× multiplier)
    findOrCreateConfig({
      scopeType: 'tier',
      subscriptionTier: 'free',
      marginMultiplier: 1.5,
      targetGrossMarginPercent: 50.0,
      effectiveFrom,
      reason: 'initial_setup',
      reasonDetails: 'Initial tier-based pricing configuration',
      createdBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
    }),

    // Pro tier: 30% margin (1.30× multiplier)
    findOrCreateConfig({
      scopeType: 'tier',
      subscriptionTier: 'pro',
      marginMultiplier: 1.3,
      targetGrossMarginPercent: 30.0,
      effectiveFrom,
      reason: 'initial_setup',
      reasonDetails: 'Initial tier-based pricing configuration',
      createdBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
    }),

    // Pro Max tier: 25% margin (1.25× multiplier)
    findOrCreateConfig({
      scopeType: 'tier',
      subscriptionTier: 'pro_max',
      marginMultiplier: 1.25,
      targetGrossMarginPercent: 25.0,
      effectiveFrom,
      reason: 'initial_setup',
      reasonDetails: 'Initial tier-based pricing configuration',
      createdBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
    }),

    // Enterprise Pro tier: 15% margin (1.15× multiplier)
    findOrCreateConfig({
      scopeType: 'tier',
      subscriptionTier: 'enterprise_pro',
      marginMultiplier: 1.15,
      targetGrossMarginPercent: 15.0,
      effectiveFrom,
      reason: 'initial_setup',
      reasonDetails: 'Initial tier-based pricing configuration',
      createdBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
    }),

    // Enterprise Max tier: 10% margin (1.10× multiplier)
    findOrCreateConfig({
      scopeType: 'tier',
      subscriptionTier: 'enterprise_max',
      marginMultiplier: 1.1,
      targetGrossMarginPercent: 10.0,
      effectiveFrom,
      reason: 'initial_setup',
      reasonDetails: 'Initial tier-based pricing configuration',
      createdBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
    }),
  ]);

  console.log(`✓ Created/Found ${globalConfigs.length} global tier pricing configs\n`);

  // Provider-specific configs (optional - can override global for specific providers)
  // Example: Higher margin for OpenAI on Free tier
  const providerConfigs = await Promise.all([
    // OpenAI Free tier: 60% margin (higher than global 50%)
    findOrCreateConfig({
      scopeType: 'provider',
      subscriptionTier: 'free',
      providerId: providerMap['openai'],
      marginMultiplier: 1.6,
      targetGrossMarginPercent: 60.0,
      effectiveFrom,
      reason: 'tier_optimization',
      reasonDetails: 'Higher margin for OpenAI models on Free tier due to premium positioning',
      createdBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
    }),
  ]);

  console.log(`✓ Created/Found ${providerConfigs.length} provider-specific pricing configs\n`);

  const totalConfigs = globalConfigs.length + providerConfigs.length;
  console.log(`✓ Total pricing configurations: ${totalConfigs}\n`);

  return [...globalConfigs, ...providerConfigs];
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
  let providers: any[] = [];
  let modelPricing: any[] = [];
  let pricingConfigs: any[] = [];

  try {
    subscriptions = await seedSubscriptions(users);
    credits = await seedCredits(users);
    models = await seedModels();
    await seedProrations(users, subscriptions);
  } catch (err: any) {
    console.log('⚠️  Subscriptions, credits, models, or prorations tables not available - skipping');
    console.log('Error details:', err.message);
    console.log('');
  }

  // ========================================================================
  // SEED DATA - PROVIDER PRICING SYSTEM (Plan 161)
  // ========================================================================

  try {
    console.log('\n📊 PROVIDER PRICING SYSTEM (Plan 161):\n');
    providers = await seedProviders();
    modelPricing = await seedModelPricing(providers);
    pricingConfigs = await seedPricingConfigs(providers);
  } catch (err: any) {
    console.log('⚠️  Provider pricing tables not available - skipping');
    console.log('Error details:', err.message);
    console.log('');
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

  console.log('\n💰 Provider Pricing System (Plan 161):');
  console.log(`   Providers:     ${providers.length} (OpenAI, Anthropic, Google, Mistral, Azure)`);
  console.log(`   Model Pricing: ${modelPricing.length} pricing records`);
  console.log(`   Pricing Configs: ${pricingConfigs.length} margin configurations`);

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
