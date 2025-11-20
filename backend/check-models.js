const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkModels() {
  try {
    console.log('Checking models in database...\n');

    const models = await prisma.models.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        provider: true,
        is_available: true,
        is_archived: true,
        is_legacy: true,
      }
    });

    console.log(`Found ${models.length} models:\n`);
    models.forEach(model => {
      console.log(`- ${model.id} (${model.name})`);
      console.log(`  Provider: ${model.provider}`);
      console.log(`  Available: ${model.is_available}, Archived: ${model.is_archived}, Legacy: ${model.is_legacy}\n`);
    });

    const totalCount = await prisma.models.count();
    console.log(`Total models in database: ${totalCount}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();
