const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCostMismatch() {
  console.log('🔍 Checking for cost mismatches between models.meta and model_provider_pricing...\n');

  const models = await prisma.models.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      meta: true,
    },
  });

  const providers = await prisma.providers.findMany({
    select: { id: true, name: true },
  });

  const providerMap = Object.fromEntries(
    providers.map((p) => [p.name, p.id])
  );

  const pricing = await prisma.model_provider_pricing.findMany({
    select: {
      provider_id: true,
      model_name: true,
      input_price_per_1k: true,
      output_price_per_1k: true,
    },
  });

  const pricingMap = {};
  pricing.forEach((p) => {
    const key = `${p.provider_id}:${p.model_name}`;
    pricingMap[key] = {
      inputPricePer1k: p.input_price_per_1k.toNumber(),
      outputPricePer1k: p.output_price_per_1k.toNumber(),
    };
  });

  let mismatches = [];

  for (const model of models) {
    const meta = model.meta;
    const providerId = providerMap[model.provider];
    const key = `${providerId}:${model.name}`;
    const pricingData = pricingMap[key];

    if (!pricingData) {
      console.log(`⚠️  ${model.name}: No pricing data found`);
      continue;
    }

    // Calculate expected costs in cents per million from pricing table
    // input_price_per_1k is in USD per 1K tokens
    // To get USD per 1M tokens: multiply by 1000
    // To get cents per 1M tokens: multiply by 100000
    const expectedInputCents = Math.round(pricingData.inputPricePer1k * 100000);
    const expectedOutputCents = Math.round(pricingData.outputPricePer1k * 100000);

    const actualInputCents = meta.inputCostPerMillionTokens || 0;
    const actualOutputCents = meta.outputCostPerMillionTokens || 0;

    const inputDiff = actualInputCents - expectedInputCents;
    const outputDiff = actualOutputCents - expectedOutputCents;

    // Check if there's a 10× error (difference is approximately 9× the expected value)
    const inputRatio = actualInputCents / expectedInputCents;
    const outputRatio = actualOutputCents / expectedOutputCents;

    if (Math.abs(inputRatio - 10) < 0.5 || Math.abs(outputRatio - 10) < 0.5) {
      mismatches.push({
        model: model.name,
        inputExpected: expectedInputCents,
        inputActual: actualInputCents,
        inputRatio: inputRatio.toFixed(1),
        outputExpected: expectedOutputCents,
        outputActual: actualOutputCents,
        outputRatio: outputRatio.toFixed(1),
      });

      console.log(`❌ ${model.name}:`);
      console.log(`   Input:  Expected ${expectedInputCents} cents, Got ${actualInputCents} cents (${inputRatio.toFixed(1)}× error)`);
      console.log(`   Output: Expected ${expectedOutputCents} cents, Got ${actualOutputCents} cents (${outputRatio.toFixed(1)}× error)`);
      console.log('');
    } else if (Math.abs(inputDiff) > 10 || Math.abs(outputDiff) > 10) {
      console.log(`⚠️  ${model.name}: Minor mismatch`);
      console.log(`   Input:  Expected ${expectedInputCents} cents, Got ${actualInputCents} cents (diff: ${inputDiff})`);
      console.log(`   Output: Expected ${expectedOutputCents} cents, Got ${actualOutputCents} cents (diff: ${outputDiff})`);
      console.log('');
    } else {
      console.log(`✅ ${model.name}: Costs match`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total models checked: ${models.length}`);
  console.log(`   Models with 10× error: ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log('\n🔧 Models needing correction:');
    mismatches.forEach((m) => {
      console.log(`   - ${m.model}: Input ${m.inputActual}→${m.inputExpected}, Output ${m.outputActual}→${m.outputExpected}`);
    });
  }

  await prisma.$disconnect();
}

checkCostMismatch().catch(console.error);
