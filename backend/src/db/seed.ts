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
        firstName: persona.firstName,
        lastName: persona.lastName,
        emailVerified: persona.emailVerified,
        authProvider: persona.authProvider,
        role: persona.role,
        mfaEnabled: persona.mfaEnabled,
        mfaSecret,
        mfaVerifiedAt: persona.mfaEnabled ? new Date() : null,
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
        googleId: persona.googleId,
        role: persona.role,
        mfaEnabled: persona.mfaEnabled,
        mfaSecret,
        mfaVerifiedAt: persona.mfaEnabled ? new Date() : null,
        isActive: true,
      },
    });

    createdUsers.push({
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
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
      where: { userId: user.userId },
    });

    const subscription = await prisma.subscriptions.create({
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
    await prisma.credits.deleteMany({
      where: { userId: user.userId },
    });

    // Create new credit allocation
    const credit = await prisma.credits.create({
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
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        os: 'linux',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
      data: {
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.downloads.create({
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
    prisma.feedbacks.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Love the app! The AI rewriting feature is incredibly helpful for my daily writing tasks.',
        email: 'user1@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Great tool, but would love to see more customization options for the rewriting styles.',
        email: 'user2@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
        message: 'Anonymous feedback: The interface is clean and intuitive. Keep up the good work!',
      },
    }),
    prisma.feedbacks.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Found a bug with the clipboard integration on Linux. Submitted diagnostic logs.',
        email: 'user3@example.com',
      },
    }),
    prisma.feedbacks.create({
      data: {
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
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-001.log',
        fileSize: 15240, // ~15KB
      },
    }),
    prisma.diagnostics.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-002.log',
        fileSize: 28900, // ~29KB
      },
    }),
    prisma.diagnostics.create({
      data: {
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
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        hierarchy: 1,
        defaultPermissions: JSON.stringify([
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct', 'credits.adjust_expiration',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.delete', 'users.impersonate',
          'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ]),
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access with most permissions except role management',
        hierarchy: 2,
        defaultPermissions: JSON.stringify([
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel', 'subscriptions.reactivate', 'subscriptions.refund',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate', 'licenses.suspend', 'licenses.revoke',
          'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.approve_redemption',
          'campaigns.create', 'campaigns.set_budget',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct', 'credits.adjust_expiration',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend', 'users.ban', 'users.delete', 'users.impersonate',
          'roles.view', 'roles.view_audit_log',
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data'
        ]),
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'ops' },
      update: {},
      create: {
        name: 'ops',
        displayName: 'Operations',
        description: 'Operational tasks for subscriptions, licenses, and coupons',
        hierarchy: 3,
        defaultPermissions: JSON.stringify([
          'subscriptions.view', 'subscriptions.create', 'subscriptions.edit', 'subscriptions.cancel',
          'licenses.view', 'licenses.create', 'licenses.activate', 'licenses.deactivate',
          'coupons.view', 'coupons.create', 'coupons.edit',
          'credits.view_balance', 'credits.view_history', 'credits.grant', 'credits.deduct',
          'users.view', 'users.edit_profile', 'users.suspend', 'users.unsuspend',
          'analytics.view_dashboard'
        ]),
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'support' },
      update: {},
      create: {
        name: 'support',
        displayName: 'Support',
        description: 'Customer support agent with limited access to user and coupon data',
        hierarchy: 4,
        defaultPermissions: JSON.stringify([
          'users.view', 'users.edit_profile',
          'subscriptions.view',
          'coupons.view', 'coupons.approve_redemption',
          'credits.view_balance', 'credits.view_history', 'credits.grant',
          'licenses.view'
        ]),
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'analyst' },
      update: {},
      create: {
        name: 'analyst',
        displayName: 'Analyst',
        description: 'Analytics access for reporting and insights',
        hierarchy: 5,
        defaultPermissions: JSON.stringify([
          'analytics.view_dashboard', 'analytics.view_revenue', 'analytics.view_usage', 'analytics.export_data',
          'subscriptions.view', 'coupons.view', 'users.view', 'credits.view_history'
        ]),
        isActive: true,
      },
    }),
    prisma.role.upsert({
      where: { name: 'auditor' },
      update: {},
      create: {
        name: 'auditor',
        displayName: 'Auditor',
        description: 'Read-only access for audit and compliance purposes',
        hierarchy: 6,
        defaultPermissions: JSON.stringify([
          'roles.view_audit_log', 'users.view', 'subscriptions.view', 'coupons.view', 'analytics.view_dashboard'
        ]),
        isActive: true,
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
        firstName: rbacUser.firstName,
        lastName: rbacUser.lastName,
        emailVerified: true,
        isActive: true,
      },
      create: {
        email: rbacUser.email,
        firstName: rbacUser.firstName,
        lastName: rbacUser.lastName,
        username: rbacUser.username,
        passwordHash,
        emailVerified: true,
        authProvider: 'local',
        role: 'user',
        isActive: true,
      },
    });

    // Find the corresponding role
    const role = roles.find((r) => r.name === rbacUser.roleName);
    if (role) {
      const assignment = await prisma.user_role_assignment.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {
          assignedAt: new Date(),
          isActive: true,
        },
        create: {
          userId: user.id,
          roleId: role.id,
          assignedBy: users[2].userId, // Assign by admin user
          assignedAt: new Date(),
          expiresAt: null, // Permanent assignment
          isActive: true,
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
        userId_roleId: {
          userId: users[2].userId,
          roleId: superAdminRole.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: users[2].userId,
        roleId: superAdminRole.id,
        assignedBy: users[2].userId,
        assignedAt: new Date(),
        expiresAt: null,
        isActive: true,
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
          userId: users[2].userId, // Using admin user for example
          permission: 'licenses.revoke',
          action: 'grant',
          grantedBy: users[2].userId,
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          reason: 'Emergency fraud investigation - temporary access grant',
          isActive: true,
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
