/**
 * Tier Coverage Verification Script
 *
 * Purpose: Verify that seed data covers all subscription tiers with correct credit allocations
 * Reference: Plan 193 Part 2, Plan 189 pricing structure
 *
 * Checks:
 * 1. tierConfig includes all active tiers (free, pro, pro_plus, pro_max, enterprise_pro, enterprise_pro_plus)
 * 2. Credit allocations match Plan 189 specifications
 * 3. Model allowedTiers arrays reference only valid tiers
 * 4. No orphaned tier references in model metadata
 */

const fs = require('fs');
const path = require('path');

// Expected tier configuration from Plan 189
const EXPECTED_TIERS = {
  free: {
    creditsPerMonth: 200,
    priceCents: 0,
    status: 'Active',
  },
  pro: {
    creditsPerMonth: 1500,
    priceCents: 1500, // $15
    status: 'Active',
  },
  pro_plus: {
    creditsPerMonth: 5000,
    priceCents: 4500, // $45
    status: 'Active (NEW)',
  },
  pro_max: {
    creditsPerMonth: 25000,
    priceCents: 19900, // $199
    status: 'Active',
  },
  enterprise_pro: {
    creditsPerMonth: 3500,
    priceCents: 3000, // $30
    status: 'Coming Soon',
  },
  enterprise_pro_plus: {
    creditsPerMonth: 11000,
    priceCents: 9000, // $90
    status: 'Coming Soon',
  },
};

const DEPRECATED_TIERS = ['enterprise_max', 'perpetual'];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Tier Coverage Verification Script');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Read seed.ts file
const seedFilePath = path.join(__dirname, '..', 'prisma', 'seed.ts');
const seedContent = fs.readFileSync(seedFilePath, 'utf-8');

// Extract tierConfig object (lines 302-323 approximately)
const tierConfigMatch = seedContent.match(/const tierConfig = \{([^}]+(?:\{[^}]+\}[^}]+)*)\};/s);
if (!tierConfigMatch) {
  console.error('❌ ERROR: Could not find tierConfig in seed.ts');
  process.exit(1);
}

const tierConfigText = tierConfigMatch[1];

// Parse tierConfig (simple regex-based extraction)
const tierConfigEntries = {};
const tierPattern = /(\w+):\s*\{[^}]*creditsPerMonth:\s*(\d+)[^}]*priceCents:\s*(\d+)[^}]*\}/g;
let match;
while ((match = tierPattern.exec(tierConfigText)) !== null) {
  const [, tierName, credits, price] = match;
  tierConfigEntries[tierName] = {
    creditsPerMonth: parseInt(credits, 10),
    priceCents: parseInt(price, 10),
  };
}

console.log('📊 Current tierConfig in seed.ts:');
console.log('─────────────────────────────────────────────────────────────────');
Object.keys(tierConfigEntries).forEach(tier => {
  const config = tierConfigEntries[tier];
  console.log(`  ${tier.padEnd(20)} ${config.creditsPerMonth.toString().padStart(6)} credits/month   $${(config.priceCents / 100).toFixed(2).padStart(6)}`);
});
console.log('');

// Check for missing tiers
console.log('🔍 Tier Coverage Check:');
console.log('─────────────────────────────────────────────────────────────────');
const missingTiers = [];
const mismatchTiers = [];

Object.keys(EXPECTED_TIERS).forEach(tierName => {
  const expected = EXPECTED_TIERS[tierName];
  const actual = tierConfigEntries[tierName];

  if (!actual) {
    missingTiers.push({
      tier: tierName,
      expected: expected,
    });
    console.log(`  ❌ MISSING: ${tierName.padEnd(20)} (expected ${expected.creditsPerMonth} credits, $${(expected.priceCents / 100).toFixed(2)})`);
  } else if (actual.creditsPerMonth !== expected.creditsPerMonth || actual.priceCents !== expected.priceCents) {
    mismatchTiers.push({
      tier: tierName,
      expected: expected,
      actual: actual,
    });
    console.log(`  ⚠️  MISMATCH: ${tierName.padEnd(20)}`);
    console.log(`      Expected: ${expected.creditsPerMonth} credits, $${(expected.priceCents / 100).toFixed(2)}`);
    console.log(`      Actual:   ${actual.creditsPerMonth} credits, $${(actual.priceCents / 100).toFixed(2)}`);
  } else {
    console.log(`  ✅ OK: ${tierName.padEnd(20)} ${actual.creditsPerMonth} credits, $${(actual.priceCents / 100).toFixed(2)} - ${expected.status}`);
  }
});

console.log('');

// Extract model definitions to check allowedTiers references
console.log('🔍 Model Tier Reference Check:');
console.log('─────────────────────────────────────────────────────────────────');

const allowedTiersPattern = /allowedTiers:\s*\[([\s\S]*?)\]/g;
const tierReferences = new Set();
let modelMatch;

while ((modelMatch = allowedTiersPattern.exec(seedContent)) !== null) {
  const tiersText = modelMatch[1];
  const tiers = tiersText.match(/'([^']+)'/g);
  if (tiers) {
    tiers.forEach(tier => {
      const cleanTier = tier.replace(/'/g, '');
      tierReferences.add(cleanTier);
    });
  }
}

console.log('  Model allowedTiers references:');
tierReferences.forEach(tier => {
  const isValidTier = EXPECTED_TIERS[tier] || DEPRECATED_TIERS.includes(tier);
  const status = DEPRECATED_TIERS.includes(tier) ? '(DEPRECATED)' :
                 tierConfigEntries[tier] ? '✅' : '❌ NOT IN tierConfig';
  console.log(`    - ${tier.padEnd(25)} ${status}`);
});

console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Tiers in tierConfig:     ${Object.keys(tierConfigEntries).length}`);
console.log(`  Expected active tiers:   ${Object.keys(EXPECTED_TIERS).length}`);
console.log(`  Missing tiers:           ${missingTiers.length}`);
console.log(`  Mismatched tiers:        ${mismatchTiers.length}`);
console.log(`  Model tier references:   ${tierReferences.size}`);
console.log('');

if (missingTiers.length > 0) {
  console.log('⚠️  ACTION REQUIRED: Add missing tiers to tierConfig in seed.ts');
  console.log('');
  console.log('   Add the following to tierConfig (around line 302):');
  console.log('');
  missingTiers.forEach(({ tier, expected }) => {
    console.log(`   ${tier}: {`);
    console.log(`     creditsPerMonth: ${expected.creditsPerMonth},`);
    console.log(`     priceCents: ${expected.priceCents},      // $${(expected.priceCents / 100).toFixed(2)}/month`);
    console.log(`     billingInterval: 'monthly',`);
    console.log(`   },`);
  });
  console.log('');
}

if (mismatchTiers.length > 0) {
  console.log('⚠️  ACTION REQUIRED: Fix mismatched tier configurations');
  console.log('');
}

// Exit code
if (missingTiers.length > 0 || mismatchTiers.length > 0) {
  console.log('❌ VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED - All tiers correctly configured');
  process.exit(0);
}
