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

import { PrismaClient, proration_event_type, proration_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { calculateSeparateCreditsPerKTokens } from '../src/types/model-meta';

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

    const oauthClient = await prisma.oauth_clients.upsert({
      where: { client_id: client.clientId },
      update: {
        client_name: client.clientName,
        client_secret_hash: clientSecretHash,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        response_types: client.responseTypes,
        scope: client.scope,
        is_active: true,
        config: client.config,
        updated_at: new Date(),
      },
      create: {
        client_id: client.clientId,
        client_name: client.clientName,
        client_secret_hash: clientSecretHash,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        response_types: client.responseTypes,
        scope: client.scope,
        is_active: true,
        config: client.config,
        updated_at: new Date(),
      },
    });

    createdClients.push({
      clientId: oauthClient.client_id,
      clientName: oauthClient.client_name,
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
    const user = await prisma.users.upsert({
      where: { email: persona.email },
      update: {
        first_name: persona.firstName,
        last_name: persona.lastName,
        username: persona.username,
        password_hash: passwordHash,
        email_verified: persona.emailVerified,
        auth_provider: persona.authProvider,
        google_id: persona.googleId || undefined,
        role: persona.role,
        is_active: true,
      },
      create: {
        id: randomUUID(),
        email: persona.email,
        first_name: persona.firstName,
        last_name: persona.lastName,
        username: persona.username,
        password_hash: passwordHash,
        email_verified: persona.emailVerified,
        auth_provider: persona.authProvider,
        google_id: persona.googleId || undefined,
        role: persona.role,
        is_active: true,
        updated_at: new Date(),
      },
    });

    createdUsers.push({
      user_id: user.id,
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
 * Seed Tier Configurations (Plan 189 + Plan 190)
 * Creates the subscription_tier_config records for all 6 tiers per Plan 189
 */
async function seedTierConfigs() {
  console.log('Creating tier configurations...');

  const tierConfigs = [
    // Free Tier - Loss leader
    {
      id: randomUUID(),
      tier_name: 'free',
      monthly_price_usd: 0,
      annual_price_usd: 0,
      monthly_credit_allocation: 200,  // Plan 189: Updated from 100
      max_credit_rollover: 0,
      features: {
        maxProjects: 1,
        apiAccess: false,
        prioritySupport: false,
        customModels: false,
        rateLimit: 10,  // req/min
        concurrentRequests: 1,
        processingSpeed: 1.0,
        historyRetentionDays: 30,
        supportSLA: 'Community',
      },
      is_active: true,
      config_version: 1,
      last_modified_at: new Date(),
      apply_to_existing_users: false,
      updated_at: new Date(),
    },
    // Pro Tier - Break-even
    {
      id: randomUUID(),
      tier_name: 'pro',
      monthly_price_usd: 15.00,  // Plan 189: Updated from $99.99
      annual_price_usd: 150.00,  // Annual: ~$12.50/month
      monthly_credit_allocation: 1500,  // Plan 189: Updated from 10,000
      max_credit_rollover: 750,  // 1 month rollover
      features: {
        maxProjects: 10,
        apiAccess: false,
        prioritySupport: true,
        customModels: false,
        rateLimit: 30,  // req/min
        concurrentRequests: 3,
        processingSpeed: 1.5,
        historyRetentionDays: 90,
        supportSLA: '24-48h',
      },
      is_active: true,
      config_version: 1,
      last_modified_at: new Date(),
      apply_to_existing_users: false,
      updated_at: new Date(),
    },
    // Pro+ Tier - NEW (11% margin)
    {
      id: randomUUID(),
      tier_name: 'pro_plus',
      monthly_price_usd: 45.00,
      annual_price_usd: 450.00,
      monthly_credit_allocation: 5000,
      max_credit_rollover: 2500,  // 3 months rollover
      features: {
        maxProjects: 50,
        apiAccess: true,  // API access (beta)
        prioritySupport: true,
        customModels: false,
        rateLimit: 60,  // req/min
        concurrentRequests: 5,
        processingSpeed: 2.0,
        historyRetentionDays: 180,
        supportSLA: '12-24h',
        advancedAnalytics: true,
      },
      is_active: true,
      config_version: 1,
      last_modified_at: new Date(),
      apply_to_existing_users: false,
      updated_at: new Date(),
    },
    // Pro Max Tier - Premium (26% margin)
    {
      id: randomUUID(),
      tier_name: 'pro_max',
      monthly_price_usd: 199.00,  // Plan 189: Updated from $49
      annual_price_usd: 1990.00,
      monthly_credit_allocation: 25000,  // Plan 189: Updated
      max_credit_rollover: 12500,  // 6 months rollover
      features: {
        maxProjects: -1,  // unlimited
        apiAccess: true,
        prioritySupport: true,
        customModels: true,
        rateLimit: 120,  // req/min
        concurrentRequests: 10,
        processingSpeed: 3.0,
        historyRetentionDays: 365,
        supportSLA: '4-8h',
        dedicatedAccountManager: true,
        advancedAnalytics: true,
      },
      is_active: true,
      config_version: 1,
      last_modified_at: new Date(),
      apply_to_existing_users: false,
      updated_at: new Date(),
    },
    // Enterprise Pro - Coming Soon (17% margin)
    {
      id: randomUUID(),
      tier_name: 'enterprise_pro',
      monthly_price_usd: 30.00,
      annual_price_usd: 300.00,
      monthly_credit_allocation: 3500,
      max_credit_rollover: 1750,  // 3 months
      features: {
        maxProjects: -1,
        apiAccess: true,
        prioritySupport: true,
        customModels: false,
        rateLimit: 60,
        concurrentRequests: 5,
        processingSpeed: 2.0,
        historyRetentionDays: 180,
        supportSLA: '8h',
        teamManagement: true,
        maxTeamSize: 5,
        sso: true,
        slaUptime: '99.5%',
      },
      is_active: false,  // Coming Soon
      config_version: 1,
      last_modified_at: new Date(),
      apply_to_existing_users: false,
      updated_at: new Date(),
    },
    // Enterprise Pro+ - Coming Soon (22% margin)
    {
      id: randomUUID(),
      tier_name: 'enterprise_pro_plus',
      monthly_price_usd: 90.00,
      annual_price_usd: 900.00,
      monthly_credit_allocation: 11000,
      max_credit_rollover: 5500,  // 6 months
      features: {
        maxProjects: -1,
        apiAccess: true,
        prioritySupport: true,
        customModels: true,
        rateLimit: 120,
        concurrentRequests: 10,
        processingSpeed: 3.0,
        historyRetentionDays: 365,
        supportSLA: '4h',
        teamManagement: true,
        maxTeamSize: 15,
        sso: true,
        slaUptime: '99.9%',
        advancedSecurity: true,
        customRateLimits: true,
        dedicatedInfrastructure: true,
      },
      is_active: false,  // Coming Soon
      config_version: 1,
      last_modified_at: new Date(),
      apply_to_existing_users: false,
      updated_at: new Date(),
    },
  ];

  for (const config of tierConfigs) {
    await prisma.subscription_tier_config.upsert({
      where: { tier_name: config.tier_name },
      create: config,
      update: {
        monthly_price_usd: config.monthly_price_usd,
        annual_price_usd: config.annual_price_usd,
        monthly_credit_allocation: config.monthly_credit_allocation,
        max_credit_rollover: config.max_credit_rollover,
        features: config.features,
        is_active: config.is_active,
        updated_at: new Date(),
      },
    });
  }

  console.log(`✓ Created/Updated ${tierConfigs.length} tier configurations\n`);
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
    enterprise_pro: {              // COMING SOON (Q2 2026)
      creditsPerMonth: 3500,       // $35 worth of API usage
      priceCents: 3000,            // $30/month
      billingInterval: 'monthly',
    },
    enterprise_pro_plus: {         // COMING SOON (Q2 2026)
      creditsPerMonth: 11000,      // $110 worth of API usage
      priceCents: 9000,            // $90/month
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
    await prisma.subscriptions.deleteMany({
      where: { user_id: user.user_id },
    });

    const subscription = await prisma.subscriptions.create({
      data: {
        id: randomUUID(),
        user_id: user.user_id,
        tier,
        status: 'active',
        credits_per_month: config.creditsPerMonth,
        price_cents: config.priceCents,
        billing_interval: config.billingInterval,
        current_period_start: now,
        current_period_end: endOfMonth,
        credits_rollover: false,
        updated_at: new Date(),
      },
    });

    createdSubscriptions.push({
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      tier: subscription.tier,
      creditsPerMonth: subscription.credits_per_month,
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
 * Links credits to their subscriptions for proper categorization (Plan 189)
 */
async function seedCredits(users: any[], subscriptions: any[]) {
  console.log('Creating credit allocations...');
  const createdCredits = [];

  // Tier configuration - MUST match seedSubscriptions tierConfig
  // Updated 2025-11-15: New pricing structure with x100 credit conversion (1 credit = $0.01)
  const tierConfig = {
    free: { creditsPerMonth: 200 },        // $2 worth of API usage
    pro: { creditsPerMonth: 1500 },        // $15 worth of API usage
    pro_plus: { creditsPerMonth: 5000 },   // $50 worth of API usage
    pro_max: { creditsPerMonth: 25000 },   // $250 worth of API usage
    enterprise_pro: { creditsPerMonth: 3500 },       // $35 worth of API usage
    enterprise_pro_plus: { creditsPerMonth: 11000 }, // $110 worth of API usage
  };

  for (const user of users) {
    // Find persona to determine tier
    const persona = USER_PERSONAS.find((p) => p.email.startsWith(user.email));
    if (!persona) continue;

    const tier = persona.subscriptionTier;
    const config = tierConfig[tier];

    if (!config) {
      console.warn(`⚠️  Unknown tier '${tier}' for user ${user.email}, skipping credit allocation`);
      continue;
    }

    // Find subscription for this user to link credits
    const userSubscription = subscriptions.find((s) => s.user_id === user.user_id);

    const creditType = tier === 'free' ? 'free' : 'pro';
    const monthlyAllocation = config.creditsPerMonth;

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Delete existing credit for this user to start fresh
    await prisma.credits.deleteMany({
      where: { user_id: user.user_id },
    });

    // Create new credit allocation linked to subscription (Plan 189 requirement)
    const credit = await prisma.credits.create({
      data: {
        id: randomUUID(),
        user_id: user.user_id,
        subscription_id: userSubscription?.subscription_id || null, // Link to subscription
        total_credits: monthlyAllocation,
        used_credits: 0,
        credit_type: creditType,
        monthly_allocation: monthlyAllocation,
        billing_period_start: now,
        billing_period_end: endOfMonth,
        is_current: true,
        reset_day_of_month: 1,
        updated_at: new Date(),
      },
    });

    // Create user credit balance (Bug #1 fix)
    await prisma.user_credit_balance.upsert({
      where: { user_id: user.user_id },
      create: {
        id: randomUUID(),
        user_id: user.user_id,
        amount: monthlyAllocation,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        amount: monthlyAllocation,
        updated_at: new Date(),
      },
    });

    createdCredits.push({
      creditId: credit.id,
      user_id: credit.user_id,
      creditType: credit.credit_type,
      monthlyAllocation: credit.monthly_allocation,
    });
  }

  console.log(`✓ Created/Updated ${createdCredits.length} credit records`);
  console.log('');

  return createdCredits;
}

/**
 * Helper function to calculate separate input/output credits for models
 * Uses the centralized calculation function with tier-specific margins
 *
 * @param inputCostPerMillion - Input cost in cents per million tokens
 * @param outputCostPerMillion - Output cost in cents per million tokens
 * @param tier - Subscription tier (determines margin multiplier)
 * @returns Object with inputCreditsPerK, outputCreditsPerK, and creditsPer1kTokens (deprecated)
 */
function calculateModelCredits(
  inputCostPerMillion: number,
  outputCostPerMillion: number,
  tier: 'free' | 'pro' | 'pro_plus' | 'pro_max' | 'enterprise_pro' | 'enterprise_pro_plus'
): {
  inputCreditsPerK: number;
  outputCreditsPerK: number;
  creditsPer1kTokens: number;
} {
  // Margin multipliers by tier (from Plan 189)
  const marginMap = {
    free: 2.0,                 // 50% margin (abuse prevention)
    pro: 1.0,                  // Break-even (volume play)
    pro_plus: 1.1,             // 10% margin
    pro_max: 1.25,             // 25% margin (premium)
    enterprise_pro: 1.15,      // 15% margin
    enterprise_pro_plus: 1.20, // 20% margin
  };

  const margin = marginMap[tier];

  // Calculate separate credits using the utility function
  const result = calculateSeparateCreditsPerKTokens(
    inputCostPerMillion,
    outputCostPerMillion,
    margin
  );

  return {
    inputCreditsPerK: result.inputCreditsPerK,
    outputCreditsPerK: result.outputCreditsPerK,
    creditsPer1kTokens: result.estimatedTotalPerK,
  };
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
        inputCostPerMillionTokens: 125,
        outputCostPerMillionTokens: 1000,
        ...calculateModelCredits(125, 1000, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'enterprise_pro', 'enterprise_pro_plus'],
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
        inputCostPerMillionTokens: 25,
        outputCostPerMillionTokens: 200,
        ...calculateModelCredits(25, 200, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
        providerMetadata: {
          openai: {
            modelFamily: 'gpt-5',
            trainingCutoff: '2025-06',
          },
        },
        internalNotes: 'Cost-efficient variant for pro tier',
        complianceTags: ['SOC2', 'GDPR'],
        // Plan 203: Parameter Constraints
        parameterConstraints: {
          temperature: {
            supported: true,
            allowedValues: [1.0],
            default: 1.0,
            reason: 'GPT-5-mini only supports temperature=1.0',
          },
          max_tokens: {
            supported: true,
            min: 1,
            max: 4096,
            default: 1000,
            alternativeName: 'max_completion_tokens',
            reason: 'Use max_completion_tokens parameter for GPT-5 models',
          },
          top_p: {
            supported: true,
            min: 0,
            max: 1,
            default: 1,
            mutuallyExclusiveWith: ['temperature'],
            reason: 'Cannot use both temperature and top_p',
          },
          presence_penalty: {
            supported: true,
            min: -2.0,
            max: 2.0,
            default: 0,
          },
          frequency_penalty: {
            supported: true,
            min: -2.0,
            max: 2.0,
            default: 0,
          },
          stop: {
            supported: true,
            maxSequences: 4,
            maxLength: 64,
          },
          n: {
            supported: true,
            max: 5,
            reason: 'Maximum 5 completions per request',
          },
        },
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
        inputCostPerMillionTokens: 5,
        outputCostPerMillionTokens: 40,
        ...calculateModelCredits(5, 40, 'free'),
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        inputCostPerMillionTokens: 1500,
        outputCostPerMillionTokens: 7500,
        ...calculateModelCredits(1500, 7500, 'pro_max'),
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        inputCostPerMillionTokens: 300,
        outputCostPerMillionTokens: 1500,
        ...calculateModelCredits(300, 1500, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
        providerMetadata: {
          anthropic: {
            modelSeries: 'claude-4',
            knowledgeCutoff: '2025-09',
          },
        },
        internalNotes: 'Best for agentic coding',
        complianceTags: ['SOC2', 'GDPR', 'HIPAA'],
        // Plan 203: Parameter Constraints (Anthropic specific)
        parameterConstraints: {
          temperature: {
            supported: true,
            min: 0,
            max: 1,
            default: 1,
            reason: 'Anthropic models support temperature 0-1',
          },
          max_tokens: {
            supported: true,
            min: 1,
            max: 8192,
            default: 1024,
            reason: 'Maximum 8192 tokens for Claude Sonnet 4.5',
          },
          top_p: {
            supported: true,
            min: 0,
            max: 1,
            default: 1,
            reason: 'Nucleus sampling parameter',
          },
          top_k: {
            supported: true,
            min: 1,
            max: 500,
            default: 40,
            reason: 'Anthropic-specific top-k sampling',
          },
          stop: {
            supported: true,
            maxSequences: 16,
            maxLength: 256,
            reason: 'Anthropic supports up to 16 stop sequences',
          },
        },
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
        inputCostPerMillionTokens: 100,
        outputCostPerMillionTokens: 500,
        ...calculateModelCredits(100, 500, 'free'),
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        inputCostPerMillionTokens: 300,
        outputCostPerMillionTokens: 1500,
        ...calculateModelCredits(300, 1500, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(1250, 5000, 'pro_max'),
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(100, 400, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(38, 150, 'free'),
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        inputCostPerMillionTokens: 40,
        outputCostPerMillionTokens: 200,
        ...calculateModelCredits(40, 200, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(200, 600, 'free'),
        requiredTier: 'free',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(200, 800, 'pro_max'),
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(100, 400, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(300, 1200, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(3000, 15000, 'pro_max'),
        requiredTier: 'pro_max',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(200, 500, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(200, 1500, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
        ...calculateModelCredits(2000, 2000, 'pro'),
        requiredTier: 'pro',
        tierRestrictionMode: 'minimum',
        allowedTiers: ['pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus'],
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
    const created = await prisma.models.upsert({
      where: { id: model.id },
      update: {
        name: model.name,
        provider: model.provider,
        is_legacy: model.isLegacy,
        is_archived: model.isArchived,
        is_available: !model.isArchived, // Archived models are not available
        meta: model.meta,
        updated_at: new Date(),
      },
      create: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        is_legacy: model.isLegacy,
        is_archived: model.isArchived,
        is_available: !model.isArchived, // Archived models are not available
        meta: model.meta,
        updated_at: new Date(),
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

  // Helper function to get tier pricing - Plan 189
  const getTierPricing = (tier: string): { basePrice: string; credits: number } => {
    switch (tier) {
      case 'free':
        return { basePrice: '0.00', credits: 200 };
      case 'pro':
        return { basePrice: '15.00', credits: 1500 };
      case 'pro_plus':
        return { basePrice: '45.00', credits: 5000 };
      case 'pro_max':
        return { basePrice: '199.00', credits: 25000 };
      case 'enterprise_pro':
        return { basePrice: '30.00', credits: 3500 };
      case 'enterprise_pro_plus':
        return { basePrice: '90.00', credits: 11000 };
      default:
        return { basePrice: '15.00', credits: 1500 }; // Default to Pro
    }
  };

  for (let i = 0; i < Math.min(users.length, 3); i++) {
    const user = users[i];
    const persona = USER_PERSONAS[i];
    if (!persona) continue;

    const tierPricing = getTierPricing(persona.subscriptionTier);

    // Delete existing monetization subscription
    await prisma.subscription_monetization.deleteMany({
      where: { user_id: user.user_id },
    });

    const monetizationSub = await prisma.subscription_monetization.create({
      data: {
        id: randomUUID(),
        user_id: user.user_id,
        tier: persona.subscriptionTier, // Plain string - schema defines tier as String, not enum
        billing_cycle: 'monthly',
        status: 'active',
        base_price_usd: tierPricing.basePrice,
        monthly_credit_allocation: tierPricing.credits,
        current_period_start: now,
        current_period_end: endOfMonth,
        updated_at: new Date(),
      },
    });

    // Create user credit balance (Bug #1 fix) - Updated to Plan 189 pricing
    const monthlyAllocation = tierPricing.credits;
    await prisma.user_credit_balance.upsert({
      where: { user_id: user.user_id },
      create: {
        id: randomUUID(),
        user_id: user.user_id,
        amount: monthlyAllocation,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        amount: monthlyAllocation,
        updated_at: new Date(),
      },
    });

    monetizationSubscriptions.push({
      subscriptionId: monetizationSub.id,
      userId: monetizationSub.user_id,
      tier: monetizationSub.tier,
    });
  }

  console.log(`✓ Created ${monetizationSubscriptions.length} SubscriptionMonetization records for prorations`);

  const prorationsData = [
    // Upgrade from free to pro
    {
      user_id: users[0]?.userId,
      subscription_id: monetizationSubscriptions[0]?.subscriptionId,
      from_tier: 'free',
      to_tier: 'pro',
      change_type: proration_event_type.upgrade,
      days_remaining: 20,
      days_in_cycle: 30,
      unused_credit_value_usd: '0.00', // Free tier has no value
      new_tier_prorated_cost_usd: '13.33', // (20/30) × $20
      net_charge_usd: '13.33',
      effective_date: new Date('2025-11-05'),
      status: proration_status.applied,
      stripe_invoice_id: 'in_test_upgrade_free_pro_001',
    },
    // Upgrade from pro to pro_max
    {
      user_id: users[1]?.userId,
      subscription_id: monetizationSubscriptions[1]?.subscriptionId,
      from_tier: 'pro',
      to_tier: 'pro_max',
      change_type: proration_event_type.upgrade,
      days_remaining: 15,
      days_in_cycle: 30,
      unused_credit_value_usd: '10.00', // (15/30) × $20
      new_tier_prorated_cost_usd: '25.00', // (15/30) × $50
      net_charge_usd: '15.00',
      effective_date: new Date('2025-11-08'),
      status: proration_status.applied,
      stripe_invoice_id: 'in_test_upgrade_pro_promax_001',
    },
    // Downgrade from pro to free
    {
      user_id: users[2]?.userId,
      subscription_id: monetizationSubscriptions[2]?.subscriptionId,
      from_tier: 'pro',
      to_tier: 'free',
      change_type: proration_event_type.downgrade,
      days_remaining: 10,
      days_in_cycle: 30,
      unused_credit_value_usd: '6.67', // (10/30) × $20
      new_tier_prorated_cost_usd: '0.00', // Free tier
      net_charge_usd: '-6.67', // Credit back to user
      effective_date: new Date('2025-11-10'),
      status: proration_status.applied,
      stripe_invoice_id: 'in_test_downgrade_pro_free_001',
    },
    // Interval change - monthly to annual
    {
      user_id: users[0]?.userId,
      subscription_id: monetizationSubscriptions[0]?.subscriptionId,
      from_tier: 'pro',
      to_tier: 'pro',
      change_type: proration_event_type.interval_change,
      days_remaining: 25,
      days_in_cycle: 30,
      unused_credit_value_usd: '16.67', // (25/30) × $20
      new_tier_prorated_cost_usd: '183.33', // (25/30) × $220 (annual)
      net_charge_usd: '166.66',
      effective_date: new Date('2025-11-03'),
      status: proration_status.applied,
      stripe_invoice_id: 'in_test_interval_monthly_annual_001',
    },
    // Pending upgrade
    {
      user_id: users[1]?.userId,
      subscription_id: monetizationSubscriptions[1]?.subscriptionId,
      from_tier: 'free',
      to_tier: 'pro',
      change_type: proration_event_type.upgrade,
      days_remaining: 18,
      days_in_cycle: 30,
      unused_credit_value_usd: '0.00',
      new_tier_prorated_cost_usd: '12.00',
      net_charge_usd: '12.00',
      effective_date: new Date('2025-11-12'),
      status: proration_status.pending,
    },
    // Failed proration
    {
      user_id: users[2]?.userId,
      subscription_id: monetizationSubscriptions[2]?.subscriptionId,
      from_tier: 'pro',
      to_tier: 'pro_max',
      change_type: proration_event_type.upgrade,
      days_remaining: 12,
      days_in_cycle: 30,
      unused_credit_value_usd: '8.00',
      new_tier_prorated_cost_usd: '20.00',
      net_charge_usd: '12.00',
      effective_date: new Date('2025-11-09'),
      status: proration_status.failed,
    },
    // Reversed proration (refund)
    {
      user_id: users[0]?.userId,
      subscription_id: monetizationSubscriptions[0]?.subscriptionId,
      from_tier: 'pro_max',
      to_tier: 'pro',
      change_type: proration_event_type.downgrade,
      days_remaining: 22,
      days_in_cycle: 30,
      unused_credit_value_usd: '36.67', // (22/30) × $50
      new_tier_prorated_cost_usd: '14.67', // (22/30) × $20
      net_charge_usd: '-22.00', // Credit back
      effective_date: new Date('2025-11-01'),
      status: proration_status.reversed,
      stripe_invoice_id: 'in_test_reversed_promax_pro_001',
    },
    // Enterprise upgrade
    {
      user_id: users[1]?.userId,
      subscription_id: monetizationSubscriptions[1]?.subscriptionId,
      from_tier: 'pro_max',
      to_tier: 'enterprise_pro',
      change_type: proration_event_type.upgrade,
      days_remaining: 28,
      days_in_cycle: 30,
      unused_credit_value_usd: '46.67', // (28/30) × $50
      new_tier_prorated_cost_usd: '93.33', // (28/30) × $100
      net_charge_usd: '46.66',
      effective_date: new Date('2025-11-02'),
      status: proration_status.applied,
      stripe_invoice_id: 'in_test_upgrade_promax_ent_001',
    },
  ];

  const createdProrations = [];

  for (const proration of prorationsData) {
    if (!proration.user_id || !proration.subscription_id) continue;

    try {
      const created = await prisma.proration_event.create({
        data: {
          id: randomUUID(),
          ...proration,
          updated_at: new Date(),
        },
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
    prisma.providers.upsert({
      where: { name: 'openai' },
      update: {
        api_type: 'openai-compatible',
        is_enabled: true,
        updated_at: new Date(),
      },
      create: {
        name: 'openai',
        api_type: 'openai-compatible',
        is_enabled: true,
        updated_at: new Date(),
      },
    }),

    // Anthropic
    prisma.providers.upsert({
      where: { name: 'anthropic' },
      update: {
        api_type: 'anthropic-sdk',
        is_enabled: true,
        updated_at: new Date(),
      },
      create: {
        name: 'anthropic',
        api_type: 'anthropic-sdk',
        is_enabled: true,
        updated_at: new Date(),
      },
    }),

    // Google AI
    prisma.providers.upsert({
      where: { name: 'google' },
      update: {
        api_type: 'google-generative-ai',
        is_enabled: true,
        updated_at: new Date(),
      },
      create: {
        name: 'google',
        api_type: 'google-generative-ai',
        is_enabled: true,
        updated_at: new Date(),
      },
    }),

    // Mistral AI
    prisma.providers.upsert({
      where: { name: 'mistral' },
      update: {
        api_type: 'openai-compatible',
        is_enabled: true,
        updated_at: new Date(),
      },
      create: {
        name: 'mistral',
        api_type: 'openai-compatible',
        is_enabled: true,
        updated_at: new Date(),
      },
    }),

    // Azure OpenAI (uses same API as OpenAI)
    prisma.providers.upsert({
      where: { name: 'azure-openai' },
      update: {
        api_type: 'openai-compatible',
        is_enabled: true,
        updated_at: new Date(),
      },
      create: {
        name: 'azure-openai',
        api_type: 'openai-compatible',
        is_enabled: true,
        updated_at: new Date(),
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
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'gpt-4o',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'gpt-4o',
        input_price_per_1k: 0.005, // $5.00 per 1M / 1000
        output_price_per_1k: 0.015, // $15.00 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // GPT-4o-mini ($0.15/$0.60 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'gpt-4o-mini',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'gpt-4o-mini',
        input_price_per_1k: 0.00015, // $0.15 per 1M / 1000
        output_price_per_1k: 0.0006, // $0.60 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // GPT-5 (use GPT-4o pricing as placeholder until official release)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'gpt-5',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'gpt-5',
        input_price_per_1k: 0.00125, 
        output_price_per_1k: 0.0010,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // GPT-5 Mini 
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'gpt-5-mini',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'gpt-5-mini',
        input_price_per_1k: 0.00025, 
        output_price_per_1k: 0.002,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // GPT-5 Nano
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'gpt-5-nano',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'gpt-5-nano',
        input_price_per_1k: 0.00005, // $0.05 per 1M / 1000
        output_price_per_1k: 0.0004, // $0.40 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // o1 ($15.00/$60.00 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'o1',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'o1',
        input_price_per_1k: 0.015, // $15.00 per 1M / 1000
        output_price_per_1k: 0.06, // $60.00 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // o1-mini ($1.10/$4.40 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'o1-mini',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'o1-mini',
        input_price_per_1k: 0.0011, // $1.10 per 1M / 1000
        output_price_per_1k: 0.0044, // $4.40 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // o3-mini ($1.10/$4.40 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['openai'],
          model_name: 'o3-mini',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['openai'],
        model_name: 'o3-mini',
        input_price_per_1k: 0.0011, // $1.10 per 1M / 1000
        output_price_per_1k: 0.0044, // $4.40 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // ========================================================================
    // Anthropic Models (with prompt caching)
    // ========================================================================

    // Claude Opus 4.1 ($15/$75 per 1M tokens)
    // Cache Write (5m): $18.75, Cache Hit: $1.50 per 1M tokens
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['anthropic'],
          model_name: 'claude-opus-4.1',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['anthropic'],
        model_name: 'claude-opus-4.1',
        input_price_per_1k: 0.015, // $15 per 1M / 1000
        output_price_per_1k: 0.075, // $75 per 1M / 1000
        cache_write_price_per_1k: 0.01875, // $18.75 per 1M / 1000 (5-min cache write)
        cache_read_price_per_1k: 0.0015, // $1.50 per 1M / 1000 (cache hit)
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Claude Sonnet 4.5 ($3/$15 per 1M tokens)
    // Cache Write (5m): $3.75, Cache Hit: $0.30 per 1M tokens
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['anthropic'],
          model_name: 'claude-sonnet-4.5',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['anthropic'],
        model_name: 'claude-sonnet-4.5',
        input_price_per_1k: 0.003, // $3 per 1M / 1000
        output_price_per_1k: 0.015, // $15 per 1M / 1000
        cache_write_price_per_1k: 0.00375, // $3.75 per 1M / 1000 (5-min cache write)
        cache_read_price_per_1k: 0.0003, // $0.30 per 1M / 1000 (cache hit)
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Claude 3.5 Sonnet (use Sonnet 4.5 pricing)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['anthropic'],
          model_name: 'claude-3-5-sonnet',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['anthropic'],
        model_name: 'claude-3-5-sonnet',
        input_price_per_1k: 0.003,
        output_price_per_1k: 0.015,
        cache_write_price_per_1k: 0.00375,
        cache_read_price_per_1k: 0.0003,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Claude Haiku 4.5 ($1/$5 per 1M tokens)
    // Cache Write (5m): $1.25, Cache Hit: $0.10 per 1M tokens
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['anthropic'],
          model_name: 'claude-haiku-4.5',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['anthropic'],
        model_name: 'claude-haiku-4.5',
        input_price_per_1k: 0.001, // $1 per 1M / 1000
        output_price_per_1k: 0.005, // $5 per 1M / 1000
        cache_write_price_per_1k: 0.00125, // $1.25 per 1M / 1000 (5-min cache write)
        cache_read_price_per_1k: 0.0001, // $0.10 per 1M / 1000 (cache hit)
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // ========================================================================
    // Google Gemini Models (text/image/video pricing only, audio excluded)
    // ========================================================================

    // Gemini 2.5 Pro (≤200K context: $1.25/$10 per 1M tokens)
    // Cache Write: $0.125, Cache storage not tracked in this table
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['google'],
          model_name: 'gemini-2-5-pro',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['google'],
        model_name: 'gemini-2-5-pro',
        input_price_per_1k: 0.00125, // $1.25 per 1M / 1000
        output_price_per_1k: 0.01, // $10 per 1M / 1000
        cache_write_price_per_1k: 0.000125, // $0.125 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Gemini 2.5 Flash (text/image/video: $0.30/$2.50 per 1M tokens)
    // Cache Write: $0.03 per 1M tokens
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['google'],
          model_name: 'gemini-2-5-flash',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['google'],
        model_name: 'gemini-2-5-flash',
        input_price_per_1k: 0.0003, // $0.30 per 1M / 1000
        output_price_per_1k: 0.0025, // $2.50 per 1M / 1000
        cache_write_price_per_1k: 0.00003, // $0.03 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Gemini 2.0 Flash (use 2.5 Flash pricing)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['google'],
          model_name: 'gemini-2-0-flash',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['google'],
        model_name: 'gemini-2-0-flash',
        input_price_per_1k: 0.0003, // Same as 2.5 Flash
        output_price_per_1k: 0.0025,
        cache_write_price_per_1k: 0.00003,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Gemini 2.5 Flash-Lite (text/image/video: $0.10/$0.40 per 1M tokens)
    // Cache Write: $0.01 per 1M tokens
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['google'],
          model_name: 'gemini-2-5-flash-lite',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['google'],
        model_name: 'gemini-2-5-flash-lite',
        input_price_per_1k: 0.0001, // $0.10 per 1M / 1000
        output_price_per_1k: 0.0004, // $0.40 per 1M / 1000
        cache_write_price_per_1k: 0.00001, // $0.01 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Gemini 2.0 Flash-Lite (use 2.5 Flash-Lite pricing)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['google'],
          model_name: 'gemini-2-0-flash-lite',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['google'],
        model_name: 'gemini-2-0-flash-lite',
        input_price_per_1k: 0.0001, // Same as 2.5 Flash-Lite
        output_price_per_1k: 0.0004,
        cache_write_price_per_1k: 0.00001,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // ========================================================================
    // Mistral AI Models
    // ========================================================================

    // Mistral Large 2 ($2.00/$6.00 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['mistral'],
          model_name: 'mistral-large-2',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['mistral'],
        model_name: 'mistral-large-2',
        input_price_per_1k: 0.002, // $2.00 per 1M / 1000
        output_price_per_1k: 0.006, // $6.00 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // Mistral Medium 3 ($0.40/$2.00 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['mistral'],
          model_name: 'mistral-medium-3',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['mistral'],
        model_name: 'mistral-medium-3',
        input_price_per_1k: 0.0004, // $0.40 per 1M / 1000
        output_price_per_1k: 0.002, // $2.00 per 1M / 1000
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // ========================================================================
    // Azure OpenAI (same pricing as OpenAI direct)
    // ========================================================================

    // GPT-4o via Azure ($5.00/$15.00 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['azure-openai'],
          model_name: 'gpt-4o',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['azure-openai'],
        model_name: 'gpt-4o',
        input_price_per_1k: 0.005, // Same as OpenAI direct
        output_price_per_1k: 0.015,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
      },
    }),

    // GPT-4o-mini via Azure ($0.15/$0.60 per 1M tokens)
    prisma.model_provider_pricing.upsert({
      where: {
        provider_id_model_name_effective_from: {
          provider_id: providerMap['azure-openai'],
          model_name: 'gpt-4o-mini',
          effective_from: effectiveFrom,
        },
      },
      update: {},
      create: {
        provider_id: providerMap['azure-openai'],
        model_name: 'gpt-4o-mini',
        input_price_per_1k: 0.00015, // Same as OpenAI direct
        output_price_per_1k: 0.0006,
        effective_from: effectiveFrom,
        is_active: true,
        updated_at: new Date(),
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
  const adminUser = await prisma.users.findFirst({
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
    const existing = await prisma.pricing_configs.findFirst({
      where: {
        scope_type: data.scope_type,
        subscription_tier: data.subscription_tier,
        provider_id: data.provider_id || null,
        is_active: true,
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.pricing_configs.create({ data });
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
      subscriptionTier: 'enterprise_pro_plus',
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
  await seedTierConfigs(); // Plan 190: Seed tier configurations before subscriptions

  let subscriptions: any[] = [];
  let credits: any[] = [];
  let models: any[] = [];
  let providers: any[] = [];
  let modelPricing: any[] = [];
  let pricingConfigs: any[] = [];

  try {
    subscriptions = await seedSubscriptions(users);
    credits = await seedCredits(users, subscriptions); // Pass subscriptions to link credits
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
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip_hash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'macos',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ip_hash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'linux',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ip_hash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ip_hash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'macos',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        ip_hash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${downloads.length} download records\n`);

  console.log('Creating feedback entries...');
  const feedbacks = await Promise.all([
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        user_id: 'user_' + Math.random().toString(36).substring(7),
        message: 'Love the app! The AI rewriting feature is incredibly helpful for my daily writing tasks.',
        email: 'user1@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        user_id: 'user_' + Math.random().toString(36).substring(7),
        message: 'Great tool, but would love to see more customization options for the rewriting styles.',
        email: 'user2@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        message: 'Anonymous feedback: The interface is clean and intuitive. Keep up the good work!',
      },
    }),
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        user_id: 'user_' + Math.random().toString(36).substring(7),
        message: 'Found a bug with the clipboard integration on Linux. Submitted diagnostic logs.',
        email: 'user3@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        message: 'This has transformed my workflow! Thank you for creating such an amazing tool.',
        email: 'user4@example.com',
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${feedbacks.length} feedback entries\n`);

  console.log('Creating diagnostic records...');
  const diagnostics = await Promise.all([
    prisma.diagnostics.create({
      data: {
        id: randomUUID(),
        user_id: 'user_' + Math.random().toString(36).substring(7),
        file_path: 's3://rephlo-diagnostics/2025-11/diagnostic-001.log',
        file_size: 15240, // ~15KB
      },
    }),
    prisma.diagnostics.create({
      data: {
        id: randomUUID(),
        user_id: 'user_' + Math.random().toString(36).substring(7),
        file_path: 's3://rephlo-diagnostics/2025-11/diagnostic-002.log',
        file_size: 28900, // ~29KB
      },
    }),
    prisma.diagnostics.create({
      data: {
        id: randomUUID(),
        file_path: 's3://rephlo-diagnostics/2025-11/diagnostic-003.log',
        file_size: 45120, // ~45KB
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${diagnostics.length} diagnostic records\n`);

  console.log('Creating app version records...');
  const versions = await Promise.all([
    prisma.app_versions.upsert({
      where: { version: '1.0.0' },
      update: {},
      create: {
        id: randomUUID(),
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
    prisma.app_versions.upsert({
      where: { version: '1.1.0' },
      update: {},
      create: {
        id: randomUUID(),
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
    prisma.app_versions.upsert({
      where: { version: '1.2.0' },
      update: {},
      create: {
        id: randomUUID(),
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
        display_name: 'Super Administrator',
        description: 'Full system access with all permissions',
        hierarchy: 1,
        is_system_role: true, // NEW: Mark as system role
        default_permissions: [
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct', 'credits.adjust_expiration',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.delete', 'users.impersonate',
          'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ], // Changed: Removed JSON.stringify() - now using Json type
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full administrative access except system configuration',
        hierarchy: 2,
        is_system_role: true, // NEW: Mark as system role
        default_permissions: [
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.impersonate',
          'roles.view', 'roles.assign', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ], // Changed: Removed JSON.stringify() - now using Json type
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'ops' },
      update: {},
      create: {
        name: 'ops',
        display_name: 'Operations Manager',
        description: 'Operational access for managing subscriptions and licenses',
        hierarchy: 3,
        is_system_role: true, // NEW: Mark as system role
        default_permissions: [
          'subscriptions.view', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate',
          'licenses.view', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.approve_redemption',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage'
        ], // Changed: Removed JSON.stringify() - now using Json type
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'support' },
      update: {},
      create: {
        name: 'support',
        display_name: 'Support Specialist',
        description: 'Customer support access for resolving issues',
        hierarchy: 4,
        is_system_role: true, // NEW: Mark as system role
        default_permissions: [
          'subscriptions.view',
          'licenses.view',
          'coupons.view',
          'credits.view_balance', 'credits.view_history',
          'users.view', 'users.edit_profile',
          'analytics.view_dashboard'
        ], // Changed: Removed JSON.stringify() - now using Json type
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'analyst' },
      update: {},
      create: {
        name: 'analyst',
        display_name: 'Data Analyst',
        description: 'Analytics and reporting access',
        hierarchy: 5,
        is_system_role: true, // NEW: Mark as system role
        default_permissions: [
          'subscriptions.view',
          'licenses.view',
          'credits.view_history',
          'users.view',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ], // Changed: Removed JSON.stringify() - now using Json type
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'auditor' },
      update: {},
      create: {
        name: 'auditor',
        display_name: 'Auditor',
        description: 'Read-only access for compliance and audit',
        hierarchy: 6,
        is_system_role: true, // NEW: Mark as system role
        default_permissions: [
          'subscriptions.view',
          'licenses.view',
          'credits.view_history',
          'users.view',
          'roles.view_audit_log',
          'analytics.view_dashboard'
        ], // Changed: Removed JSON.stringify() - now using Json type
        is_active: true,
        updated_at: new Date(),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${roles.length} RBAC roles\n`);

  // Create RBAC team users
  console.log('Creating RBAC team users...');
  const rbacTeamUsers = await Promise.all([
    prisma.users.upsert({
      where: { email: 'ops.user@rephlo.ai' },
      update: {},
      create: {
        id: randomUUID(),
        email: 'ops.user@rephlo.ai',
        first_name: 'Operations',
        last_name: 'Manager',
        email_verified: true,
        updated_at: new Date(),
      },
    }),
    prisma.users.upsert({
      where: { email: 'support.user@rephlo.ai' },
      update: {},
      create: {
        id: randomUUID(),
        email: 'support.user@rephlo.ai',
        first_name: 'Support',
        last_name: 'Specialist',
        email_verified: true,
        updated_at: new Date(),
      },
    }),
    prisma.users.upsert({
      where: { email: 'analyst.user@rephlo.ai' },
      update: {},
      create: {
        id: randomUUID(),
        email: 'analyst.user@rephlo.ai',
        first_name: 'Data',
        last_name: 'Analyst',
        email_verified: true,
        updated_at: new Date(),
      },
    }),
    prisma.users.upsert({
      where: { email: 'auditor.user@rephlo.ai' },
      update: {},
      create: {
        id: randomUUID(),
        email: 'auditor.user@rephlo.ai',
        first_name: 'Security',
        last_name: 'Auditor',
        email_verified: true,
        updated_at: new Date(),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${rbacTeamUsers.length} RBAC team users\n`);

  // Assign roles to users
  console.log('Creating role assignments...');
  const roleAssignments = await Promise.all([
    // Super admin assignment to existing admin user
    prisma.user_role_assignment.upsert({
      where: {
        user_id_role_id: {
          user_id: users[2].user_id, // admin.test@rephlo.ai
          role_id: roles[0].id, // super_admin
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        user_id: users[2].user_id,
        role_id: roles[0].id,
        assigned_by: users[2].user_id,
        assigned_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // Ops user - Ops role
    prisma.user_role_assignment.upsert({
      where: {
        user_id_role_id: {
          user_id: rbacTeamUsers[0].id,
          role_id: roles[2].id, // ops
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        user_id: rbacTeamUsers[0].id,
        role_id: roles[2].id,
        assigned_by: users[2].user_id,
        assigned_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // Support user - Support role
    prisma.user_role_assignment.upsert({
      where: {
        user_id_role_id: {
          user_id: rbacTeamUsers[1].id,
          role_id: roles[3].id, // support
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        user_id: rbacTeamUsers[1].id,
        role_id: roles[3].id,
        assigned_by: users[2].user_id,
        assigned_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // Analyst user - Analyst role
    prisma.user_role_assignment.upsert({
      where: {
        user_id_role_id: {
          user_id: rbacTeamUsers[2].id,
          role_id: roles[4].id, // analyst
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        user_id: rbacTeamUsers[2].id,
        role_id: roles[4].id,
        assigned_by: users[2].user_id,
        assigned_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // Auditor user - Auditor role
    prisma.user_role_assignment.upsert({
      where: {
        user_id_role_id: {
          user_id: rbacTeamUsers[3].id,
          role_id: roles[5].id, // auditor
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        user_id: rbacTeamUsers[3].id,
        role_id: roles[5].id,
        assigned_by: users[2].user_id,
        assigned_at: new Date(),
        updated_at: new Date(),
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
  console.log('   Credits:  200 monthly\n');

  console.log('Pro Tier User (Local Auth):');
  console.log('   Email:    pro.user@example.com');
  console.log('   Password: TestPassword123!');
  console.log('   Credits:  1,500 monthly\n');

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
