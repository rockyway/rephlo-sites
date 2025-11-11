const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: 'textassistant-desktop' },
    });

    if (!client) {
      console.log('❌ Client not found');
      return;
    }

    console.log('Client ID:', client.clientId);
    console.log('Redirect URIs:', JSON.stringify(client.redirectUris, null, 2));
    console.log('\nURL Encoding Check:');
    console.log('Postman URL (encoded):', encodeURIComponent('https://oauth.pstmn.io/v1/callback'));
    console.log('\nRedirect URIs in database:');
    client.redirectUris.forEach((uri, i) => {
      console.log(`  [${i}]: ${uri}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
