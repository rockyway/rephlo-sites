/**
 * Add Postman callback URL to textassistant-desktop OAuth client
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find textassistant-desktop client
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId: 'textassistant-desktop' },
    });

    if (!client) {
      console.log('❌ Client not found');
      return;
    }

    console.log('Current redirectUris:', client.redirectUris);

    // Add Postman callback URL if not already present
    const postmanUrl = 'https://oauth.pstmn.io/v1/callback';
    const currentUris = Array.isArray(client.redirectUris) ? client.redirectUris : [];
    
    if (currentUris.includes(postmanUrl)) {
      console.log('✅ Postman URL already configured');
    } else {
      const updatedUris = [...currentUris, postmanUrl];
      
      const updated = await prisma.oAuthClient.update({
        where: { clientId: 'textassistant-desktop' },
        data: { redirectUris: updatedUris }
      });

      console.log('✅ Updated redirectUris:');
      console.log(updated.redirectUris);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
