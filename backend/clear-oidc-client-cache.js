const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check what's in oidc_models for Client
    const clientModels = await prisma.$queryRaw`
      SELECT id, kind, created_at 
      FROM oidc_models 
      WHERE kind = 'Client'
    `;

    console.log('Current Client entries in oidc_models:');
    clientModels.forEach(c => {
      console.log(`  - ID: ${c.id}, Created: ${c.created_at}`);
    });

    // Delete all cached Client entries so they reload from config
    const deleted = await prisma.$executeRaw`
      DELETE FROM oidc_models 
      WHERE kind = 'Client'
    `;

    console.log(`\n✅ Deleted ${deleted} cached client entries from oidc_models`);

    // Verify deletion
    const remaining = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM oidc_models 
      WHERE kind = 'Client'
    `;

    console.log(`✅ Remaining Client entries: ${remaining[0].count}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
