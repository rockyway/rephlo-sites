import { PrismaClient } from '@prisma/client';
import { calculateSeparateCreditsPerKTokens } from './src/types/model-meta';

const prisma = new PrismaClient();

interface ModelPricing {
  modelId: string;
  inputCost: number;
  outputCost: number;
  marginMultiplier: number;
}

async function verifyModelCredits() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('PLAN 208: Model Credit Calculation Verification');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Get all model pricing records
  const pricingRecords = await prisma.model_provider_pricing.findMany({
    select: {
      model_id: true,
      provider: true,
      input_cost_per_million: true,
      output_cost_per_million: true,
      margin_multiplier: true,
    },
    orderBy: [{ provider: 'asc' }, { model_id: 'asc' }],
  });

  console.log(`📊 Found ${pricingRecords.length} pricing records\n`);

  if (pricingRecords.length === 0) {
    console.log('❌ No pricing records found. Database may need seeding.\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        CREDIT CALCULATION VERIFICATION                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  let totalRecords = 0;
  let correctRecords = 0;

  for (const pricing of pricingRecords) {
    totalRecords++;

    // Calculate expected credits using Plan 208 formula
    const expected = calculateSeparateCreditsPerKTokens(
      Number(pricing.input_cost_per_million),
      Number(pricing.output_cost_per_million),
      Number(pricing.margin_multiplier)
    );

    console.log(`─────────────────────────────────────────────────────────────────────────`);
    console.log(`🔹 Model: ${pricing.model_id} (${pricing.provider})`);
    console.log(`   Input Cost:  $${(Number(pricing.input_cost_per_million) / 100).toFixed(2)} per 1M tokens`);
    console.log(`   Output Cost: $${(Number(pricing.output_cost_per_million) / 100).toFixed(2)} per 1M tokens`);
    console.log(`   Margin:      ${Number(pricing.margin_multiplier)}x\n`);

    console.log(`   📐 Plan 208 Calculation (1.5x default margin):`);
    console.log(`      Input Credits/1K:  ${expected.inputCreditsPerK.toFixed(2)}`);
    console.log(`      Output Credits/1K: ${expected.outputCreditsPerK.toFixed(2)}`);
    console.log(`      Estimated Total:   ${expected.estimatedTotalPerK.toFixed(2)}\n`);

    correctRecords++;
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`✅ Verification Complete: ${correctRecords}/${totalRecords} records checked`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(0);
}

verifyModelCredits().catch(async (err) => {
  console.error('❌ Error:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
