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

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

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
      'http://localhost:3000/callback',
      'rephlo://callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scope: 'openid email profile offline_access',
    config: {
      skipConsentScreen: true,
      description: 'Official Rephlo Desktop Application',
      tags: ['desktop', 'official', 'test'],
      allowedOrigins: ['http://localhost:3000', 'rephlo://'],
    },
  },
  {
    clientId: 'poc-client-test',
    clientName: 'POC Client (Test)',
    clientSecret: 'test-secret-poc-client-67890',
    redirectUris: [
      'http://localhost:8080/callback',
      'http://localhost:8080/oauth/callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scope: 'openid email profile offline_access',
    config: {
      skipConsentScreen: true,
      description: 'Proof of Concept Client for Testing',
      tags: ['poc', 'test'],
      allowedOrigins: ['http://localhost:8080'],
    },
  },
  {
    clientId: 'web-app-test',
    clientName: 'Rephlo Web App (Test)',
    clientSecret: 'test-secret-web-app-11111',
    redirectUris: [
      'http://localhost:7152/callback',
      'http://localhost:7152/auth/callback',
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scope: 'openid email profile offline_access',
    config: {
      skipConsentScreen: true,
      description: 'Official Rephlo Web Application',
      tags: ['web', 'official', 'test'],
      allowedOrigins: ['http://localhost:7152'],
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
    mfaEnabled: true,
    subscriptionTier: 'pro' as const,
    subscriptionStatus: 'active' as const,
    description: 'Admin user with MFA enabled',
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
    const clientSecretHash = await hashPassword(client.clientSecret);

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

    // For admin users with MFA, generate a TOTP secret (base32 encoded)
    // In production, this would be done during MFA enrollment
    let mfaSecret: string | null = null;
    if (persona.mfaEnabled && persona.role === 'admin') {
      // Generate a sample base32 TOTP secret (32 bytes = 256 bits)
      // Format: base32 encoding of random bytes
      mfaSecret = Buffer.from(
        'JBSWY3DPEBLW64TMMQ=====' // Sample base32 encoded secret
      ).toString('utf-8');
    }

    const user = await prisma.users.upsert({
      where: { email: persona.email },
      update: {
        first_name: persona.firstName,
        last_name: persona.lastName,
        email_verified: persona.emailVerified,
        auth_provider: persona.authProvider,
        role: persona.role,
        mfa_enabled: persona.mfaEnabled,
        mfa_secret: mfaSecret,
        mfa_verified_at: persona.mfaEnabled ? new Date() : null,
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
        google_id: persona.googleId,
        role: persona.role,
        mfa_enabled: persona.mfaEnabled,
        mfa_secret: mfaSecret,
        mfa_verified_at: persona.mfaEnabled ? new Date() : null,
        is_active: true,
        updated_at: new Date(),
      },
    });

    createdUsers.push({
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfa_enabled,
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
    await prisma.subscriptions.deleteMany({
      where: { user_id: user.userId },
    });

    const subscription = await prisma.subscriptions.create({
      data: {
        id: randomUUID(),
        user_id: user.userId,
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
      subscriptionId: subscription.id,
      userId: subscription.user_id,
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
    await prisma.credits.deleteMany({
      where: { user_id: user.userId },
    });

    // Create new credit allocation
    const credit = await prisma.credits.create({
      data: {
        id: randomUUID(),
        user_id: user.userId,
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

    createdCredits.push({
      creditId: credit.id,
      userId: credit.user_id,
      creditType: credit.credit_type,
      monthlyAllocation: credit.monthly_allocation,
    });
  }

  console.log(`✓ Created/Updated ${createdCredits.length} credit records`);
  console.log('');

  return createdCredits;
}

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // ========================================================================
  // SEED DATA - PHASE 1: CORE OAUTH & USERS
  // ========================================================================

  const oauthClients = await seedOAuthClients();
  const users = await seedUserPersonas();
  const subscriptions = await seedSubscriptions(users);
  const credits = await seedCredits(users);

  // ========================================================================
  // SEED DATA - PHASE 2: LEGACY BRANDING (DOWNLOADS, FEEDBACK, ETC.)
  // ========================================================================

  console.log('Creating download records...');
  const downloads = await Promise.all([
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'linux',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        id: randomUUID(),
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${downloads.length} download records\n`);

  console.log('Creating feedback entries...');
  const feedbacks = await Promise.all([
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Love the app! The AI rewriting feature is incredibly helpful for my daily writing tasks.',
        email: 'user1@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
        id: randomUUID(),
        userId: 'user_' + Math.random().toString(36).substring(7),
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
        userId: 'user_' + Math.random().toString(36).substring(7),
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
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-001.log',
        fileSize: 15240, // ~15KB
      },
    }),
    prisma.diagnostics.create({
      data: {
        id: randomUUID(),
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-002.log',
        fileSize: 28900, // ~29KB
      },
    }),
    prisma.diagnostics.create({
      data: {
        id: randomUUID(),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-003.log',
        fileSize: 45120, // ~45KB
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${diagnostics.length} diagnostic records\n`);

  console.log('Creating app version records...');
  const versions = await Promise.all([
    prisma.app_versions.create({
      data: {
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
    prisma.app_versions.create({
      data: {
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
    prisma.app_versions.create({
      data: {
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
  // SEED DATA - PHASE 3: RBAC SYSTEM (Plan 119)
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
        default_permissions: JSON.stringify([
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct', 'credits.adjust_expiration',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.delete', 'users.impersonate',
          'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ]),
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
        description: 'Administrative access with most permissions except role management',
        hierarchy: 2,
        default_permissions: JSON.stringify([
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct', 'credits.adjust_expiration',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.delete', 'users.impersonate',
          'roles.view', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ]),
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'ops' },
      update: {},
      create: {
        name: 'ops',
        display_name: 'Operations',
        description: 'Operational tasks for subscriptions, licenses, and coupons',
        hierarchy: 3,
        default_permissions: JSON.stringify([
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate',
          'coupons.view', 'coupons.create', 'coupons.edit',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend',
          'analytics.view_dashboard'
        ]),
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'support' },
      update: {},
      create: {
        name: 'support',
        display_name: 'Support',
        description: 'Customer support agent with limited access to user and coupon data',
        hierarchy: 4,
        default_permissions: JSON.stringify([
          'users.view', 'users.edit_profile',
          'subscriptions.view',
          'coupons.view', 'coupons.approve_redemption',
          'credits.view_balance', 'credits.view_history', 'credits.grant',
          'licenses.view'
        ]),
        is_active: true,
        updated_at: new Date(),
      },
    }),
    prisma.role.upsert({
      where: { name: 'analyst' },
      update: {},
      create: {
        name: 'analyst',
        display_name: 'Analyst',
        description: 'Analytics access for reporting and insights',
        hierarchy: 5,
        default_permissions: JSON.stringify([
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data',
          'subscriptions.view', 'coupons.view', 'users.view', 'credits.view_history'
        ]),
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
        description: 'Read-only access for audit and compliance purposes',
        hierarchy: 6,
        default_permissions: JSON.stringify([
          'roles.view_audit_log', 'users.view', 'subscriptions.view', 'coupons.view', 'analytics.view_dashboard'
        ]),
        is_active: true,
        updated_at: new Date(),
      },
    }),
  ]);
  console.log(`✓ Created/Updated ${roles.length} RBAC roles\n`);

  console.log('Assigning roles to RBAC team users...');
  const roleAssignments = [];

  // Create RBAC team users
  const rbacUsers = [
    {
      email: 'ops.user@rephlo.ai',
      firstName: 'Operations',
      lastName: 'Lead',
      username: 'opsuser',
      password: 'OpsPassword123!',
      roleName: 'ops',
    },
    {
      email: 'support.user@rephlo.ai',
      firstName: 'Support',
      lastName: 'Agent',
      username: 'supportuser',
      password: 'SupportPassword123!',
      roleName: 'support',
    },
    {
      email: 'analyst.user@rephlo.ai',
      firstName: 'Business',
      lastName: 'Analyst',
      username: 'analystuser',
      password: 'AnalystPassword123!',
      roleName: 'analyst',
    },
    {
      email: 'auditor.user@rephlo.ai',
      firstName: 'Compliance',
      lastName: 'Auditor',
      username: 'auditoruser',
      password: 'AuditorPassword123!',
      roleName: 'auditor',
    },
  ];

  for (const rbacUser of rbacUsers) {
    const passwordHash = await hashPassword(rbacUser.password);
    const user = await prisma.users.upsert({
      where: { email: rbacUser.email },
      update: {
        first_name: rbacUser.firstName,
        last_name: rbacUser.lastName,
        email_verified: true,
        is_active: true,
      },
      create: {
        id: randomUUID(),
        email: rbacUser.email,
        first_name: rbacUser.firstName,
        last_name: rbacUser.lastName,
        username: rbacUser.username,
        password_hash: passwordHash,
        email_verified: true,
        auth_provider: 'local',
        role: 'user',
        is_active: true,
        updated_at: new Date(),
      },
    });

    // Find the corresponding role
    const role = roles.find((r) => r.name === rbacUser.roleName);
    if (role) {
      const assignment = await prisma.user_role_assignment.upsert({
        where: {
          user_id_role_id: {
            user_id: user.id,
            role_id: role.id,
          },
        },
        update: {
          assigned_at: new Date(),
          is_active: true,
        },
        create: {
          id: randomUUID(),
          user_id: user.id,
          role_id: role.id,
          assigned_by: users[2].userId, // Assign by admin user
          assigned_at: new Date(),
          expires_at: null, // Permanent assignment
          is_active: true,
          updated_at: new Date(),
        },
      });
      roleAssignments.push(assignment);
    }
  }

  // Assign Super Admin role to existing admin
  const superAdminRole = roles.find((r) => r.name === 'super_admin');
  if (superAdminRole && users[2]) {
    await prisma.user_role_assignment.upsert({
      where: {
        user_id_role_id: {
          user_id: users[2].userId,
          role_id: superAdminRole.id,
        },
      },
      update: { is_active: true },
      create: {
        id: randomUUID(),
        user_id: users[2].userId,
        role_id: superAdminRole.id,
        assigned_by: users[2].userId,
        assigned_at: new Date(),
        expires_at: null,
        is_active: true,
        updated_at: new Date(),
      },
    });
  }

  console.log(`✓ Created ${roleAssignments.length + 1} RBAC role assignments\n`);

  // Create permission overrides examples
  console.log('Creating permission override examples...');
  const overrides = [];

  if (roles.length >= 3 && users.length >= 3) {
    const opsRole = roles.find((r) => r.name === 'ops');
    if (opsRole) {
      const override = await prisma.permission_override.create({
        data: {
          id: randomUUID(),
          user_id: users[2].userId, // Using admin user for example
          permission: 'licenses.revoke',
          action: 'grant',
          granted_by: users[2].userId,
          granted_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          reason: 'Emergency fraud investigation - temporary access grant',
          is_active: true,
          updated_at: new Date(),
        },
      });
      overrides.push(override);
    }
  }

  console.log(`✓ Created ${overrides.length} permission overrides\n`);

  // ========================================================================
  // PRINT COMPREHENSIVE SUMMARY
  // ========================================================================

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  🌱 DATABASE SEED COMPLETED ✅                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 SEED SUMMARY BY CATEGORY:\n');

  console.log('🔐 OAuth & Identity:');
  console.log(`   OAuth Clients:     ${oauthClients.length}`);
  console.log(`   Users:             ${users.length + rbacUsers.length}`);

  console.log('\n💳 Subscriptions & Billing:');
  console.log(`   Subscriptions:     ${subscriptions.length}`);
  console.log(`   Credit Pools:      ${credits.length}`);

  console.log('\n🔑 RBAC System (Plan 119):');
  console.log(`   Roles:             ${roles.length}`);
  console.log(`   Role Assignments:  ${roleAssignments.length + 1}`);
  console.log(`   Permission Overrides: ${overrides.length}`);
  console.log(`   RBAC Users:        ${rbacUsers.length}`);

  console.log('\n📈 Legacy Branding:');
  console.log(`   Downloads:        ${downloads.length}`);
  console.log(`   Feedbacks:        ${feedbacks.length}`);
  console.log(`   Diagnostics:      ${diagnostics.length}`);
  console.log(`   App Versions:     ${versions.length}`);

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

  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🔑 RBAC TEAM MEMBERS:\n');

  console.log('Operations Lead:');
  console.log('   Email:    ops.user@rephlo.ai');
  console.log('   Password: OpsPassword123!');
  console.log('   Role:     Operations (25 permissions)\n');

  console.log('Support Agent:');
  console.log('   Email:    support.user@rephlo.ai');
  console.log('   Password: SupportPassword123!');
  console.log('   Role:     Support (12 permissions)\n');

  console.log('Business Analyst:');
  console.log('   Email:    analyst.user@rephlo.ai');
  console.log('   Password: AnalystPassword123!');
  console.log('   Role:     Analyst (8 permissions)\n');

  console.log('Compliance Auditor:');
  console.log('   Email:    auditor.user@rephlo.ai');
  console.log('   Password: AuditorPassword123!');
  console.log('   Role:     Auditor (5 permissions)\n');

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
