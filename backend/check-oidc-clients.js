const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check if there's an oidc_clients table
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename LIKE '%client%'
    `;
    
    console.log('Tables with "client" in name:');
    tables.forEach(t => console.log(`  - ${t.tablename}`));

    // Check oauth_clients table
    const oauthClients = await prisma.oAuthClient.findMany({
      where: { isActive: true }
    });

    console.log('\nOAuth clients in database:');
    oauthClients.forEach(c => {
      console.log(`\nClient ID: ${c.clientId}`);
      console.log(`  Name: ${c.clientName}`);
      console.log(`  Redirect URIs:`, c.redirectUris);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
