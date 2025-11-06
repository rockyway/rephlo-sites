/**
 * Prisma Database Seed Script
 * Pre-populates essential reference data for the Dedicated API Backend
 *
 * Usage: npx prisma db seed
 */

import { PrismaClient, ModelCapability } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // =============================================================================
  // Seed OAuth Clients
  // =============================================================================
  console.log('\n[1/2] Seeding OAuth Clients...');

  const oauthClients = [
    {
      clientId: 'textassistant-desktop',
      clientName: 'Text Assistant Desktop',
      clientSecretHash: null, // Public client, no secret needed
      redirectUris: ['http://localhost:8080/callback'],
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code'],
      scope: 'openid email profile llm.inference models.read user.info credits.read',
      isActive: true,
    },
  ];

  for (const client of oauthClients) {
    await prisma.oAuthClient.upsert({
      where: { clientId: client.clientId },
      update: {
        clientName: client.clientName,
        redirectUris: client.redirectUris,
        grantTypes: client.grantTypes,
        responseTypes: client.responseTypes,
        scope: client.scope,
        isActive: client.isActive,
      },
      create: client,
    });
    console.log(`  ✓ Created/Updated OAuth client: ${client.clientId}`);
  }

  // =============================================================================
  // Seed Models
  // =============================================================================
  console.log('\n[2/2] Seeding LLM Models...');

  const models = [
    {
      id: 'gpt-5',
      name: 'gpt-5',
      displayName: 'GPT-5',
      provider: 'openai',
      description: 'Latest GPT model with enhanced reasoning capabilities',
      capabilities: [
        ModelCapability.text,
        ModelCapability.vision,
        ModelCapability.function_calling,
      ],
      contextLength: 128000,
      maxOutputTokens: 4096,
      inputCostPerMillionTokens: 500,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 2,
      isAvailable: true,
      isDeprecated: false,
      version: '1.0',
    },
    {
      id: 'gemini-2.0-pro',
      name: 'gemini-2.0-pro',
      displayName: 'Gemini 2.0 Pro',
      provider: 'google',
      description: "Google's most capable model with extended context",
      capabilities: [
        ModelCapability.text,
        ModelCapability.vision,
        ModelCapability.long_context,
      ],
      contextLength: 2000000,
      maxOutputTokens: 8192,
      inputCostPerMillionTokens: 350,
      outputCostPerMillionTokens: 1050,
      creditsPer1kTokens: 1,
      isAvailable: true,
      isDeprecated: false,
      version: '2.0',
    },
    {
      id: 'claude-3.5-sonnet',
      name: 'claude-3.5-sonnet',
      displayName: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: "Anthropic's balanced model optimized for coding",
      capabilities: [
        ModelCapability.text,
        ModelCapability.vision,
        ModelCapability.code,
      ],
      contextLength: 200000,
      maxOutputTokens: 4096,
      inputCostPerMillionTokens: 300,
      outputCostPerMillionTokens: 1500,
      creditsPer1kTokens: 2,
      isAvailable: true,
      isDeprecated: false,
      version: '3.5',
    },
  ];

  for (const model of models) {
    await prisma.model.upsert({
      where: { id: model.id },
      update: {
        name: model.name,
        displayName: model.displayName,
        provider: model.provider,
        description: model.description,
        capabilities: model.capabilities,
        contextLength: model.contextLength,
        maxOutputTokens: model.maxOutputTokens,
        inputCostPerMillionTokens: model.inputCostPerMillionTokens,
        outputCostPerMillionTokens: model.outputCostPerMillionTokens,
        creditsPer1kTokens: model.creditsPer1kTokens,
        isAvailable: model.isAvailable,
        isDeprecated: model.isDeprecated,
        version: model.version,
      },
      create: model,
    });
    console.log(`  ✓ Created/Updated model: ${model.displayName} (${model.id})`);
  }

  console.log('\n✓ Database seeding completed successfully!');
  console.log('\nSeeded data:');
  console.log(`  - ${oauthClients.length} OAuth client(s)`);
  console.log(`  - ${models.length} LLM model(s)`);
}

main()
  .catch((error) => {
    console.error('\n✗ Error during database seeding:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
