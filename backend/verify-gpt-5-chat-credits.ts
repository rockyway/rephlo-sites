/**
 * GPT-5 Chat Model Credit Verification Script
 *
 * Verifies that the gpt-5-chat model credit calculations match Plan 208 specifications.
 *
 * Expected Plan 208 calculations:
 * - Input:  $1.25/1M tokens → 125 cents → (125/1000) * 1.5 / 1 = 0.1875 → rounded to 0.19 credits/1K
 * - Output: $10/1M tokens   → 1000 cents → (1000/1000) * 1.5 / 1 = 1.5 credits/1K
 * - Estimated Total (1:10 ratio): (1*0.19 + 10*1.5) / 11 = 1.38 credits/1K
 */

import { PrismaClient } from '@prisma/client';
import { calculateSeparateCreditsPerKTokens } from './src/types/model-meta';

const prisma = new PrismaClient();

async function verifyGpt5ChatCredits() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('GPT-5 CHAT MODEL - CREDIT VERIFICATION (Plan 208)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Get gpt-5-chat model from database
  const model = await prisma.models.findUnique({
    where: { id: 'gpt-5-chat' },
    select: {
      id: true,
      name: true,
      provider: true,
      meta: true,
    },
  });

  if (!model) {
    console.log('❌ ERROR: gpt-5-chat model not found in database\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('✅ Model Found');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log(`Model ID:   ${model.id}`);
  console.log(`Name:       ${model.name}`);
  console.log(`Provider:   ${model.provider}\n`);

  // Extract credit values from meta
  const meta = model.meta as any;
  const actualInputCredits = meta.inputCreditsPerK;
  const actualOutputCredits = meta.outputCreditsPerK;
  const actualEstimatedTotal = meta.creditsPer1kTokens;
  const inputCost = meta.inputCostPerMillionTokens || 125; // $1.25 = 125 cents
  const outputCost = meta.outputCostPerMillionTokens || 1000; // $10 = 1000 cents

  console.log('📊 DATABASE VALUES');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log(`Input Cost Per Million:    $${(inputCost / 100).toFixed(2)} (${inputCost} cents)`);
  console.log(`Output Cost Per Million:   $${(outputCost / 100).toFixed(2)} (${outputCost} cents)`);
  console.log(`Input Credits/1K:          ${actualInputCredits}`);
  console.log(`Output Credits/1K:         ${actualOutputCredits}`);
  console.log(`Estimated Total/1K:        ${actualEstimatedTotal}\n`);

  // Calculate expected values using Plan 208 formula
  const expected = calculateSeparateCreditsPerKTokens(inputCost, outputCost);

  console.log('🧮 PLAN 208 EXPECTED VALUES (1.5x margin, $0.01/credit)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log(`Input Credits/1K:          ${expected.inputCreditsPerK.toFixed(2)}`);
  console.log(`  Formula: (${inputCost}/1000) * 1.5 / 1 = ${((inputCost / 1000) * 1.5).toFixed(4)} → ${expected.inputCreditsPerK.toFixed(2)}`);
  console.log(`\nOutput Credits/1K:         ${expected.outputCreditsPerK.toFixed(2)}`);
  console.log(`  Formula: (${outputCost}/1000) * 1.5 / 1 = ${((outputCost / 1000) * 1.5).toFixed(4)} → ${expected.outputCreditsPerK.toFixed(2)}`);
  console.log(`\nEstimated Total/1K:        ${expected.estimatedTotalPerK.toFixed(2)}`);
  console.log(`  Formula: (1*${expected.inputCreditsPerK.toFixed(2)} + 10*${expected.outputCreditsPerK.toFixed(2)}) / 11 = ${expected.estimatedTotalPerK.toFixed(2)}\n`);

  // Verification
  console.log('✓ VERIFICATION');
  console.log('─────────────────────────────────────────────────────────────────────────');

  const inputMatch = actualInputCredits === expected.inputCreditsPerK;
  const outputMatch = actualOutputCredits === expected.outputCreditsPerK;
  const totalMatch = actualEstimatedTotal === expected.estimatedTotalPerK;

  console.log(`Input Credits/1K:    ${actualInputCredits} === ${expected.inputCreditsPerK.toFixed(2)} ${inputMatch ? '✅' : '❌'}`);
  console.log(`Output Credits/1K:   ${actualOutputCredits} === ${expected.outputCreditsPerK.toFixed(2)} ${outputMatch ? '✅' : '❌'}`);
  console.log(`Estimated Total/1K:  ${actualEstimatedTotal} === ${expected.estimatedTotalPerK.toFixed(2)} ${totalMatch ? '✅' : '❌'}\n`);

  if (inputMatch && outputMatch && totalMatch) {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS: All credit values match Plan 208 specifications!');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    console.log('📝 EXAMPLE USAGE SCENARIOS:\n');
    console.log('Scenario 1: 100 input tokens, 200 output tokens');
    console.log(`  - Input cost:  (100/1000) * ${actualInputCredits} = ${((100 / 1000) * actualInputCredits).toFixed(3)} credits`);
    console.log(`  - Output cost: (200/1000) * ${actualOutputCredits} = ${((200 / 1000) * actualOutputCredits).toFixed(3)} credits`);
    console.log(`  - Total:       ${(((100 / 1000) * actualInputCredits) + ((200 / 1000) * actualOutputCredits)).toFixed(3)} credits\n`);

    console.log('Scenario 2: 1,000 input tokens, 2,000 output tokens');
    console.log(`  - Input cost:  (1000/1000) * ${actualInputCredits} = ${((1000 / 1000) * actualInputCredits).toFixed(2)} credits`);
    console.log(`  - Output cost: (2000/1000) * ${actualOutputCredits} = ${((2000 / 1000) * actualOutputCredits).toFixed(2)} credits`);
    console.log(`  - Total:       ${(((1000 / 1000) * actualInputCredits) + ((2000 / 1000) * actualOutputCredits)).toFixed(2)} credits\n`);

    await prisma.$disconnect();
    process.exit(0);
  } else {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('❌ FAILURE: Credit values DO NOT match Plan 208 specifications');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    console.log('Expected values:');
    console.log(`  inputCreditsPerK: ${expected.inputCreditsPerK.toFixed(2)}`);
    console.log(`  outputCreditsPerK: ${expected.outputCreditsPerK.toFixed(2)}`);
    console.log(`  estimatedTotalPerK: ${expected.estimatedTotalPerK.toFixed(2)}\n`);
    console.log('Actual values:');
    console.log(`  inputCreditsPerK: ${actualInputCredits}`);
    console.log(`  outputCreditsPerK: ${actualOutputCredits}`);
    console.log(`  estimatedTotalPerK: ${actualEstimatedTotal}\n`);

    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyGpt5ChatCredits().catch(async (err) => {
  console.error('❌ Error:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
