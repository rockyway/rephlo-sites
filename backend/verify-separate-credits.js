const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyModels() {
  console.log('🔍 Verifying seeded models have separate input/output credits...\n');

  const models = await prisma.models.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      provider: true,
      meta: true,
    },
  });

  models.forEach((model) => {
    console.log(`\n📦 Model: ${model.name} (${model.provider})`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Input Credits/1K: ${model.meta.inputCreditsPerK || 'MISSING ❌'}`);
    console.log(`   Output Credits/1K: ${model.meta.outputCreditsPerK || 'MISSING ❌'}`);
    console.log(`   Credits/1K (deprecated): ${model.meta.creditsPer1kTokens || 'MISSING ❌'}`);

    if (model.meta.inputCreditsPerK && model.meta.outputCreditsPerK) {
      console.log(`   ✅ Separate pricing configured correctly`);
    } else {
      console.log(`   ❌ Separate pricing MISSING`);
    }
  });

  await prisma.$disconnect();
}

verifyModels().catch(console.error);
