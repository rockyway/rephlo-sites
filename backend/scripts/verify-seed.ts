import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeedData() {
  console.log('='.repeat(80));
  console.log('VERIFYING SEED DATA - JSONB META FORMAT');
  console.log('='.repeat(80));

  // Check active models
  const activeModel = await prisma.model.findFirst({
    where: { id: 'gpt-5' },
  });

  console.log('\n✅ Active Model (GPT-5):');
  console.log('   isLegacy:', activeModel?.isLegacy);
  console.log('   isArchived:', activeModel?.isArchived);
  console.log('   isAvailable:', activeModel?.isAvailable);
  console.log('   meta.displayName:', (activeModel?.meta as any)?.displayName);
  console.log('   meta.capabilities:', (activeModel?.meta as any)?.capabilities);
  console.log('   meta.requiredTier:', (activeModel?.meta as any)?.requiredTier);
  console.log('   meta.creditsPer1kTokens:', (activeModel?.meta as any)?.creditsPer1kTokens);

  // Check legacy model
  const legacyModel = await prisma.model.findFirst({
    where: { id: 'claude-3-5-sonnet' },
  });

  console.log('\n✅ Legacy Model (Claude 3.5 Sonnet):');
  console.log('   isLegacy:', legacyModel?.isLegacy);
  console.log('   isArchived:', legacyModel?.isArchived);
  console.log('   isAvailable:', legacyModel?.isAvailable);
  console.log('   meta.displayName:', (legacyModel?.meta as any)?.displayName);
  console.log('   meta.legacyReplacementModelId:', (legacyModel?.meta as any)?.legacyReplacementModelId);
  console.log('   meta.deprecationNotice:', (legacyModel?.meta as any)?.deprecationNotice);
  console.log('   meta.sunsetDate:', (legacyModel?.meta as any)?.sunsetDate);

  // Check archived model
  const archivedModel = await prisma.model.findFirst({
    where: { id: 'text-davinci-003' },
  });

  console.log('\n✅ Archived Model (Text-Davinci-003):');
  console.log('   isLegacy:', archivedModel?.isLegacy);
  console.log('   isArchived:', archivedModel?.isArchived);
  console.log('   isAvailable:', archivedModel?.isAvailable);
  console.log('   meta.displayName:', (archivedModel?.meta as any)?.displayName);
  console.log('   meta.description:', (archivedModel?.meta as any)?.description);

  // Count all models
  const totalModels = await prisma.model.count();
  const legacyCount = await prisma.model.count({ where: { isLegacy: true } });
  const archivedCount = await prisma.model.count({ where: { isArchived: true } });
  const activeCount = await prisma.model.count({ where: { isAvailable: true } });

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log('   Total Models:', totalModels);
  console.log('   Active Models:', activeCount);
  console.log('   Legacy Models:', legacyCount);
  console.log('   Archived Models:', archivedCount);
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

verifySeedData().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
