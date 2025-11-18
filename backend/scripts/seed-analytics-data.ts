/**
 * Seed Analytics Data Script
 * Creates sample token_usage_ledger records for testing the analytics dashboard
 */

import { PrismaClient, RequestType, RequestStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedAnalyticsData() {
  console.log('🌱 Seeding analytics data for token_usage_ledger...\n');

  // Get provider IDs
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true },
  });

  console.log('Available providers:');
  providers.forEach(p => console.log(`  - ${p.name} (${p.id})`));
  console.log();

  const providerMap = new Map(providers.map(p => [p.name, p.id]));
  const openaiId = providerMap.get('openai');
  const anthropicId = providerMap.get('anthropic');
  const googleId = providerMap.get('google');
  const azureId = providerMap.get('azure-openai');
  const mistralId = providerMap.get('mistral');

  if (!openaiId || !anthropicId || !googleId || !azureId || !mistralId) {
    console.error('ERROR: Missing required providers!');
    console.error('  OpenAI:', openaiId || 'NOT FOUND');
    console.error('  Anthropic:', anthropicId || 'NOT FOUND');
    console.error('  Google:', googleId || 'NOT FOUND');
    console.error('  Azure:', azureId || 'NOT FOUND');
    console.error('  Mistral:', mistralId || 'NOT FOUND');
    process.exit(1);
  }

  // Get user IDs
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
    where: {
      email: {
        in: ['free.user@example.com', 'pro.user@example.com', 'admin.test@rephlo.ai'],
      },
    },
  });

  const userMap = new Map(users.map(u => [u.email, u.id]));
  const freeUserId = userMap.get('free.user@example.com')!;
  const proUserId = userMap.get('pro.user@example.com')!;
  const adminUserId = userMap.get('admin.test@rephlo.ai')!;

  // Delete existing analytics data
  await prisma.tokenUsageLedger.deleteMany({});
  console.log('✓ Cleared existing token_usage_ledger records\n');

  // Generate 100 sample records over the last 30 days
  const records = [];
  const now = new Date();

  for (let i = 0; i < 100; i++) {
    // Random date within last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(createdAt.getHours() - hoursAgo);

    // Random provider
    const providerChoice = Math.random();
    let providerId: string;
    let modelId: string;
    let inputTokens: number;
    let outputTokens: number;
    let vendorCost: number;
    let tier: string;

    if (providerChoice < 0.3) {
      // 30% OpenAI
      providerId = openaiId;
      modelId = 'gpt-4o-2024-08-06';
      inputTokens = 1000 + Math.floor(Math.random() * 9000);
      outputTokens = 500 + Math.floor(Math.random() * 4500);
      vendorCost = (inputTokens * 0.0000025) + (outputTokens * 0.00001); // GPT-4o pricing
      tier = Math.random() < 0.5 ? 'pro' : 'enterprise_pro';
    } else if (providerChoice < 0.55) {
      // 25% Anthropic
      providerId = anthropicId;
      modelId = 'claude-3-5-sonnet-20241022';
      inputTokens = 1000 + Math.floor(Math.random() * 9000);
      outputTokens = 500 + Math.floor(Math.random() * 4500);
      vendorCost = (inputTokens * 0.000003) + (outputTokens * 0.000015); // Claude Sonnet pricing
      tier = Math.random() < 0.6 ? 'pro' : 'enterprise_pro';
    } else if (providerChoice < 0.75) {
      // 20% Google
      providerId = googleId;
      modelId = 'gemini-1.5-pro';
      inputTokens = 1000 + Math.floor(Math.random() * 9000);
      outputTokens = 500 + Math.floor(Math.random() * 4500);
      vendorCost = (inputTokens * 0.00000125) + (outputTokens * 0.000005); // Gemini Pro pricing
      tier = Math.random() < 0.4 ? 'free' : 'pro';
    } else if (providerChoice < 0.9) {
      // 15% Azure
      providerId = azureId;
      modelId = 'gpt-4o-2024-08-06';
      inputTokens = 1000 + Math.floor(Math.random() * 9000);
      outputTokens = 500 + Math.floor(Math.random() * 4500);
      vendorCost = (inputTokens * 0.0000025) + (outputTokens * 0.00001);
      tier = 'enterprise_pro';
    } else {
      // 10% Mistral
      providerId = mistralId;
      modelId = 'mistral-large-latest';
      inputTokens = 1000 + Math.floor(Math.random() * 9000);
      outputTokens = 500 + Math.floor(Math.random() * 4500);
      vendorCost = (inputTokens * 0.000002) + (outputTokens * 0.000006);
      tier = Math.random() < 0.7 ? 'free' : 'pro';
    }

    // Random user based on tier
    let userId: string;
    if (tier === 'free') {
      userId = freeUserId;
    } else if (tier === 'pro') {
      userId = proUserId;
    } else {
      userId = adminUserId; // enterprise_pro
    }

    // Calculate margin multiplier based on tier
    const marginMultiplier = tier === 'free' ? 2.5 : tier === 'pro' ? 1.8 : 1.5;

    // Calculate credits deducted
    const creditsDeducted = Math.ceil(vendorCost * marginMultiplier * 100);

    // Calculate gross margin
    const creditValueUsd = creditsDeducted * 0.01;
    const grossMarginUsd = creditValueUsd - vendorCost;

    records.push({
      requestId: randomUUID(),
      userId,
      modelId,
      providerId,
      userTierAtRequest: tier,
      requestType: RequestType.completion,
      status: RequestStatus.success,
      inputTokens,
      outputTokens,
      cachedInputTokens: 0,
      vendorCost,
      marginMultiplier,
      creditValueUsd,
      creditsDeducted,
      grossMarginUsd,
      requestStartedAt: createdAt,
      requestCompletedAt: new Date(createdAt.getTime() + 1000 + Math.random() * 4000),
      processingTimeMs: 1000 + Math.floor(Math.random() * 4000),
      createdAt,
    });
  }

  // Insert all records
  await prisma.tokenUsageLedger.createMany({
    data: records,
  });

  console.log(`✓ Created ${records.length} token_usage_ledger records\n`);

  // Summary statistics
  const stats = {
    totalRecords: records.length,
    byProvider: {
      openai: records.filter(r => r.providerId === openaiId).length,
      anthropic: records.filter(r => r.providerId === anthropicId).length,
      google: records.filter(r => r.providerId === googleId).length,
      azureOpenai: records.filter(r => r.providerId === azureId).length,
      mistral: records.filter(r => r.providerId === mistralId).length,
    },
    byTier: {
      free: records.filter(r => r.userTierAtRequest === 'free').length,
      pro: records.filter(r => r.userTierAtRequest === 'pro').length,
      enterprise_pro: records.filter(r => r.userTierAtRequest === 'enterprise_pro').length,
    },
    totalVendorCost: records.reduce((sum, r) => sum + r.vendorCost, 0).toFixed(2),
    totalGrossMargin: records.reduce((sum, r) => sum + r.grossMarginUsd, 0).toFixed(2),
    totalCreditsDeducted: records.reduce((sum, r) => sum + r.creditsDeducted, 0),
  };

  console.log('📊 ANALYTICS DATA SUMMARY:\n');
  console.log(`   Total Records:     ${stats.totalRecords}`);
  console.log(`\n   By Provider:`);
  console.log(`     OpenAI:          ${stats.byProvider.openai}`);
  console.log(`     Anthropic:       ${stats.byProvider.anthropic}`);
  console.log(`     Google:          ${stats.byProvider.google}`);
  console.log(`     Azure:           ${stats.byProvider.azureOpenai}`);
  console.log(`     Mistral:         ${stats.byProvider.mistral}`);
  console.log(`\n   By Tier:`);
  console.log(`     Free:            ${stats.byTier.free}`);
  console.log(`     Pro:             ${stats.byTier.pro}`);
  console.log(`     Enterprise Pro:  ${stats.byTier.enterprise_pro}`);
  console.log(`\n   Financial Summary:`);
  console.log(`     Total Vendor Cost:     $${stats.totalVendorCost}`);
  console.log(`     Total Gross Margin:    $${stats.totalGrossMargin}`);
  console.log(`     Total Credits Deducted: ${stats.totalCreditsDeducted}`);
  console.log(`\n✅ Analytics data seeded successfully!\n`);
}

seedAnalyticsData()
  .catch((error) => {
    console.error('❌ Error seeding analytics data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
