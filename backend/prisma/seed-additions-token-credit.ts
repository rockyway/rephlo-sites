/**
 * Token-to-Credit Conversion System Seed Data
 * Add this to the main seed.ts file after the existing seed logic
 *
 * Plan: docs/plan/112-token-to-credit-conversion-mechanism.md
 * Design: docs/reference/token-credit-schema-design.md
 */

import { PrismaClient, SubscriptionTier } from '@prisma/client';

// This function should be called from main() in seed.ts
export async function seedTokenCreditSystem(prisma: PrismaClient, adminUser: any) {
  console.log('\n=============================================================================');
  console.log('TOKEN-TO-CREDIT CONVERSION SYSTEM SEED DATA');
  console.log('=============================================================================');

  // =============================================================================
  // [10/13] Seed Providers
  // =============================================================================
  console.log('\n[10/13] Seeding AI Model Providers...');

  const providers = [
    {
      name: 'OpenAI',
      apiType: 'openai',
      isEnabled: true,
    },
    {
      name: 'Anthropic',
      apiType: 'anthropic',
      isEnabled: true,
    },
    {
      name: 'Google',
      apiType: 'google',
      isEnabled: true,
    },
    {
      name: 'Azure OpenAI',
      apiType: 'azure',
      isEnabled: true,
    },
  ];

  const createdProviders: Record<string, any> = {};

  for (const providerData of providers) {
    const provider = await prisma.provider.upsert({
      where: { name: providerData.name },
      update: {
        apiType: providerData.apiType,
        isEnabled: providerData.isEnabled,
      },
      create: providerData,
    });
    createdProviders[providerData.name] = provider;
    console.log(`  ✓ Created/Updated provider: ${provider.name}`);
  }

  // =============================================================================
  // [11/13] Seed Model Provider Pricing
  // =============================================================================
  console.log('\n[11/13] Seeding Model Provider Pricing...');

  // Current pricing as of November 2025 (from Plan 112)
  const pricingData = [
    // OpenAI Models
    {
      providerId: createdProviders['OpenAI'].id,
      modelName: 'gpt-4-turbo',
      vendorModelId: 'gpt-4-turbo-2024-04-09',
      inputPricePer1k: 0.01,
      outputPricePer1k: 0.03,
      effectiveFrom: new Date('2025-10-15T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'OpenAI GPT-4 Turbo standard pricing',
    },
    {
      providerId: createdProviders['OpenAI'].id,
      modelName: 'gpt-4o',
      vendorModelId: 'gpt-4o-2024-05-13',
      inputPricePer1k: 0.005,
      outputPricePer1k: 0.015,
      effectiveFrom: new Date('2025-10-15T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'OpenAI GPT-4o standard pricing',
    },
    {
      providerId: createdProviders['OpenAI'].id,
      modelName: 'gpt-3.5-turbo',
      vendorModelId: 'gpt-3.5-turbo-0125',
      inputPricePer1k: 0.0005,
      outputPricePer1k: 0.0015,
      effectiveFrom: new Date('2025-10-15T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'OpenAI GPT-3.5 Turbo standard pricing',
    },

    // Anthropic Models
    {
      providerId: createdProviders['Anthropic'].id,
      modelName: 'claude-3-5-sonnet',
      vendorModelId: 'claude-3-5-sonnet-20241022',
      inputPricePer1k: 0.003,
      outputPricePer1k: 0.015,
      effectiveFrom: new Date('2025-09-20T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'Anthropic Claude 3.5 Sonnet standard pricing',
    },
    {
      providerId: createdProviders['Anthropic'].id,
      modelName: 'claude-3-opus',
      vendorModelId: 'claude-3-opus-20240229',
      inputPricePer1k: 0.015,
      outputPricePer1k: 0.075,
      effectiveFrom: new Date('2025-09-20T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'Anthropic Claude 3 Opus standard pricing',
    },
    {
      providerId: createdProviders['Anthropic'].id,
      modelName: 'claude-3-haiku',
      vendorModelId: 'claude-3-haiku-20240307',
      inputPricePer1k: 0.00025,
      outputPricePer1k: 0.00125,
      effectiveFrom: new Date('2025-09-20T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'Anthropic Claude 3 Haiku standard pricing',
    },

    // Google Models
    {
      providerId: createdProviders['Google'].id,
      modelName: 'gemini-2-0-flash',
      vendorModelId: 'gemini-2.0-flash',
      inputPricePer1k: 0.0000375, // $0.0375 per million = $0.0000375 per 1k
      outputPricePer1k: 0.00015,  // $0.15 per million = $0.00015 per 1k
      effectiveFrom: new Date('2025-11-01T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'Google Gemini 2.0 Flash standard pricing',
    },
    {
      providerId: createdProviders['Google'].id,
      modelName: 'gemini-1-5-pro',
      vendorModelId: 'gemini-1.5-pro',
      inputPricePer1k: 0.00125,
      outputPricePer1k: 0.005,
      effectiveFrom: new Date('2025-11-01T00:00:00Z'),
      effectiveUntil: null,
      isActive: true,
      description: 'Google Gemini 1.5 Pro standard pricing',
    },
  ];

  for (const pricing of pricingData) {
    await prisma.modelProviderPricing.upsert({
      where: {
        providerId_modelName_effectiveFrom: {
          providerId: pricing.providerId,
          modelName: pricing.modelName,
          effectiveFrom: pricing.effectiveFrom,
        },
      },
      update: {
        inputPricePer1k: pricing.inputPricePer1k,
        outputPricePer1k: pricing.outputPricePer1k,
        isActive: pricing.isActive,
        description: pricing.description,
      },
      create: pricing,
    });
    console.log(`  ✓ Created/Updated pricing: ${pricing.modelName} ($${pricing.inputPricePer1k}/$${pricing.outputPricePer1k} per 1k)`);
  }

  // =============================================================================
  // [12/13] Seed Pricing Configurations (Margin Multipliers)
  // =============================================================================
  console.log('\n[12/13] Seeding Pricing Configurations (Margin Multipliers)...');

  // Tier-based multipliers from Plan 112
  const pricingConfigs = [
    {
      scopeType: 'tier',
      subscriptionTier: SubscriptionTier.free,
      providerId: null,
      modelId: null,
      marginMultiplier: 2.0,
      targetGrossMarginPercent: 50.0,
      effectiveFrom: new Date('2025-11-01T00:00:00Z'),
      effectiveUntil: null,
      reason: 'initial_setup',
      reasonDetails: 'Initial pricing for Free tier - 2.0x multiplier = 50% margin (aggressive protection against abuse)',
      previousMultiplier: null,
      changePercent: null,
      expectedMarginChangeDollars: null,
      expectedRevenueImpact: null,
      createdBy: adminUser.id,
      approvedBy: adminUser.id,
      requiresApproval: false, // Initial setup doesn't need approval
      approvalStatus: 'approved',
      isActive: true,
      monitored: true,
    },
    {
      scopeType: 'tier',
      subscriptionTier: SubscriptionTier.pro,
      providerId: null,
      modelId: null,
      marginMultiplier: 1.5,
      targetGrossMarginPercent: 33.33,
      effectiveFrom: new Date('2025-11-01T00:00:00Z'),
      effectiveUntil: null,
      reason: 'initial_setup',
      reasonDetails: 'Initial pricing for Pro tier - 1.5x multiplier = 33% margin (balanced)',
      previousMultiplier: null,
      changePercent: null,
      expectedMarginChangeDollars: null,
      expectedRevenueImpact: null,
      createdBy: adminUser.id,
      approvedBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
      monitored: true,
    },
    {
      scopeType: 'tier',
      subscriptionTier: SubscriptionTier.enterprise,
      providerId: null,
      modelId: null,
      marginMultiplier: 1.2,
      targetGrossMarginPercent: 16.67,
      effectiveFrom: new Date('2025-11-01T00:00:00Z'),
      effectiveUntil: null,
      reason: 'initial_setup',
      reasonDetails: 'Initial pricing for Enterprise tier - 1.2x multiplier = 17% margin (attract heavy usage)',
      previousMultiplier: null,
      changePercent: null,
      expectedMarginChangeDollars: null,
      expectedRevenueImpact: null,
      createdBy: adminUser.id,
      approvedBy: adminUser.id,
      requiresApproval: false,
      approvalStatus: 'approved',
      isActive: true,
      monitored: true,
    },
  ];

  for (const config of pricingConfigs) {
    const created = await prisma.pricingConfig.create({
      data: config,
    });
    console.log(`  ✓ Created pricing config: ${config.subscriptionTier || 'default'} tier - ${config.marginMultiplier}x multiplier (${config.targetGrossMarginPercent}% margin)`);
  }

  // =============================================================================
  // [13/13] Initialize User Credit Balances
  // =============================================================================
  console.log('\n[13/13] Initializing User Credit Balances...');

  // Get all users to initialize their credit balances
  const users = await prisma.user.findMany({
    include: {
      subscriptions: {
        where: { status: 'active' },
        take: 1,
      },
    },
  });

  for (const user of users) {
    // Check if balance already exists
    const existingBalance = await prisma.userCreditBalance.findUnique({
      where: { userId: user.id },
    });

    if (!existingBalance) {
      // Determine initial credits based on tier
      let initialCredits = 2000; // Default free tier
      const activeSubscription = user.subscriptions[0];

      if (activeSubscription) {
        initialCredits = activeSubscription.creditsPerMonth;
      }

      // Create balance
      await prisma.userCreditBalance.create({
        data: {
          userId: user.id,
          amount: initialCredits,
          lastDeductionAt: null,
          lastDeductionAmount: null,
        },
      });

      // Create credit source record
      await prisma.userCreditSource.create({
        data: {
          userId: user.id,
          source: 'monthly_allocation',
          amount: initialCredits,
          expiresAt: activeSubscription?.currentPeriodEnd || null,
        },
      });

      console.log(`  ✓ Initialized credit balance for ${user.email}: ${initialCredits} credits`);
    } else {
      console.log(`  ⚠ Credit balance already exists for ${user.email}: ${existingBalance.amount} credits`);
    }
  }

  console.log('\n✅ Token-to-Credit Conversion System seed completed!');
  console.log('\n=============================================================================');
  console.log('SEEDED DATA SUMMARY (TOKEN-TO-CREDIT SYSTEM)');
  console.log('=============================================================================');
  console.log(`  🏢 Providers: ${providers.length}`);
  console.log(`  💰 Model Pricing Records: ${pricingData.length}`);
  console.log(`  ⚙️  Pricing Configurations: ${pricingConfigs.length}`);
  console.log(`  💳 User Credit Balances Initialized: ${users.length}`);

  console.log('\n=============================================================================');
  console.log('PRICING CONFIGURATION SUMMARY');
  console.log('=============================================================================');
  console.log('  Free Tier:       2.0x multiplier = 50% margin');
  console.log('  Pro Tier:        1.5x multiplier = 33% margin');
  console.log('  Enterprise Tier: 1.2x multiplier = 17% margin');

  console.log('\n=============================================================================');
  console.log('VENDOR PRICING (per 1,000 tokens)');
  console.log('=============================================================================');
  console.log('\n  OpenAI:');
  console.log('    • GPT-4 Turbo:    $0.01000 / $0.03000');
  console.log('    • GPT-4o:         $0.00500 / $0.01500');
  console.log('    • GPT-3.5 Turbo:  $0.00050 / $0.00150');
  console.log('\n  Anthropic:');
  console.log('    • Claude 3.5 Sonnet: $0.00300 / $0.01500');
  console.log('    • Claude 3 Opus:     $0.01500 / $0.07500');
  console.log('    • Claude 3 Haiku:    $0.00025 / $0.00125');
  console.log('\n  Google:');
  console.log('    • Gemini 2.0 Flash:  $0.0000375 / $0.000150');
  console.log('    • Gemini 1.5 Pro:    $0.00125 / $0.00500');

  console.log('\n=============================================================================');
  console.log('EXAMPLE CALCULATIONS');
  console.log('=============================================================================');
  console.log('\n  Scenario 1: Free user uses Claude 3.5 Sonnet');
  console.log('    Input: 500 tokens × $0.003/1k = $0.0015');
  console.log('    Output: 1500 tokens × $0.015/1k = $0.0225');
  console.log('    Vendor Cost: $0.024');
  console.log('    Multiplier: 2.0x (Free tier)');
  console.log('    Credit Value: $0.048');
  console.log('    Credits Deducted: 5 (rounded up from 4.8)');
  console.log('    Gross Margin: $0.024 (50%)');
  console.log('\n  Scenario 2: Pro user uses GPT-4o');
  console.log('    Input: 1000 tokens × $0.005/1k = $0.005');
  console.log('    Output: 2000 tokens × $0.015/1k = $0.03');
  console.log('    Vendor Cost: $0.035');
  console.log('    Multiplier: 1.5x (Pro tier)');
  console.log('    Credit Value: $0.0525');
  console.log('    Credits Deducted: 6 (rounded up from 5.25)');
  console.log('    Gross Margin: $0.0175 (33%)');
  console.log('\n=============================================================================\n');
}

/**
 * INTEGRATION INSTRUCTIONS:
 *
 * Add this to the main seed.ts file:
 *
 * 1. Import this function at the top:
 *    import { seedTokenCreditSystem } from './seed-additions-token-credit';
 *
 * 2. Call it at the end of main() before the success message:
 *    // After all existing seed logic...
 *    await seedTokenCreditSystem(prisma, adminUser);
 *
 *    console.log('\n✅ Database seeding completed successfully!');
 *
 * 3. Ensure adminUser is available in scope (it's already created in current seed.ts)
 */
